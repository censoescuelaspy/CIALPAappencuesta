import { createServer } from 'node:http';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;

const PORT = Number(process.env.PORT || 8787);
const DATABASE_URL = process.env.DATABASE_URL || '';
const SYNC_TOKEN = process.env.DATABASE_SYNC_TOKEN || process.env.DB_SYNC_TOKEN || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 12 * 1024 * 1024);

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: pgSslConfig(),
      max: Number(process.env.PGPOOL_MAX || 5),
      connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 10000),
      idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS || 30000),
    })
  : null;

class HttpError extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const server = createServer(async (req, res) => {
  try {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, await healthStatus());
    }

    if (req.method === 'POST' && ['/sync', '/sync/mec-draft'].includes(url.pathname)) {
      assertAuthorized(req);
      const payload = await readJsonBody(req);
      const result = await persistMecDraft(payload, requestContext(req));
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { status: 'error', error: 'Ruta no encontrada' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const body = {
      status: 'error',
      error: err.message || 'Error interno',
      details: err.details || undefined,
    };
    if (statusCode >= 500) console.error('[cialpa-db-api]', err);
    return sendJson(res, statusCode, body);
  }
});

server.listen(PORT, () => {
  console.log(`CIALPA DB API escuchando en :${PORT}`);
  if (!DATABASE_URL) console.warn('DATABASE_URL no configurado: /sync devolvera 503.');
});

async function healthStatus() {
  if (!pool) {
    return { status: 'ok', service: 'cialpa-db-api', database: 'not_configured' };
  }
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', service: 'cialpa-db-api', database: 'ok' };
  } catch (err) {
    return { status: 'degraded', service: 'cialpa-db-api', database: 'error', error: err.message };
  }
}

function pgSslConfig() {
  const value = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase();
  if (!value || ['disable', 'false', '0', 'off'].includes(value)) return undefined;
  if (['require', 'true', '1', 'on', 'no-verify'].includes(value)) return { rejectUnauthorized: false };
  return undefined;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(statusCode === 204 ? '' : JSON.stringify(body));
}

function assertAuthorized(req) {
  if (!SYNC_TOKEN) return;
  const header = String(req.headers.authorization || '');
  if (header !== `Bearer ${SYNC_TOKEN}`) {
    throw new HttpError(401, 'Token de sincronizacion invalido');
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new HttpError(413, 'Payload demasiado grande'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        const textBody = Buffer.concat(chunks).toString('utf8');
        resolve(textBody ? JSON.parse(textBody) : {});
      } catch (err) {
        reject(new HttpError(400, 'JSON invalido', { parser: err.message }));
      }
    });
  });
}

function requestContext(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

async function persistMecDraft(payload, context = {}) {
  if (!pool) throw new HttpError(503, 'DATABASE_URL no configurado');
  const normalized = normalizePayload(payload);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertSyncMutation(client, normalized, context, 'recibida');
    await upsertSchool(client, normalized);
    await upsertDraft(client, normalized);
    await replaceDraftChildren(client, normalized);
    await client.query(
      `UPDATE sync_mutations
          SET status = 'aplicada',
              error = NULL,
              applied_at = now(),
              updated_at = now()
        WHERE mutation_id = $1`,
      [normalized.mutationId],
    );
    await client.query('COMMIT');
    return {
      status: 'ok',
      database: 'postgresql',
      mutation_id: normalized.mutationId,
      draft_id: normalized.draftId,
      school_key: normalized.schoolKey,
      upserted: normalized.counts,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await markMutationError(normalized, err, context).catch(markErr => {
      console.error('[cialpa-db-api] No se pudo registrar error de mutacion', markErr);
    });
    throw err;
  } finally {
    client.release();
  }
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Payload requerido');
  }
  const mutationId = text(payload.mutation_id, payload.clientMutationId, payload.id_mutacion);
  if (!mutationId) throw new HttpError(400, 'mutation_id requerido');
  const entity = text(payload.entity, payload.tipo_entidad, 'mec_draft');
  if (entity !== 'mec_draft') throw new HttpError(400, 'Entidad no soportada', { entity });

  const draft = plainObject(payload.draft || payload.values || {});
  const selected = plainObject(draft.__selectedSchool || {});
  const general = plainObject(draft.general || {});
  const school = plainObject(payload.school || {});
  const codigoLocal = text(
    school.codigo_local,
    selected.codigo_local,
    selected.codigo,
    general.codigo_local,
    general.codigo,
  );
  const idEscuela = text(school.id_escuela, selected.id_escuela, selected.id, general.id_escuela);
  const schoolKey = text(codigoLocal, idEscuela, mutationId);
  const timeTracking = plainObject(payload.time_tracking || payload.timeTracking || {});
  const timeFields = timeTrackingFields(timeTracking);
  const blocks = asArray(draft.__blocks);
  const rooms = asArray(draft.__classrooms);
  const sanitaries = asArray(draft.__sanitaries);
  const siteElements = asArray(draft.__siteElements);
  const evidenceIndex = asArray(payload.evidence_index || payload.evidenceIndex);
  const floors = floorRecords(blocks, rooms, sanitaries);
  const records = timeRecords(timeTracking);

  return {
    payload,
    mutationId,
    draftId: mutationId,
    entity,
    source: text(payload.source, 'cialpa_gas'),
    appVersion: text(payload.app_version, payload.appVersion),
    schemaVersion: text(payload.schema_version, payload.schemaVersion),
    savedAt: dateOrNull(payload.saved_at || payload.savedAt),
    user: text(payload.user, payload.usuario),
    status: text(payload.status, payload.estado_borrador, 'en_curso'),
    reason: text(payload.reason, payload.motivo),
    countsPayload: plainObject(payload.counts || {}),
    summary: plainObject(payload.summary || {}),
    timeTracking,
    timeFields,
    draft,
    selected,
    school: {
      schoolKey,
      idEscuela,
      codigoLocal,
      nombre: text(school.nombre_escuela, school.nombre, selected.nombre, selected.nombre_escuela, general.nombre_escuela),
      departamento: text(school.departamento, selected.departamento, general.departamento),
      distrito: text(school.distrito, selected.distrito, general.distrito),
      localidad: text(school.localidad, selected.localidad, general.localidad),
      zona: text(school.zona, selected.zona, general.zona),
      latitud: numberOrNull(school.latitud, school.lat, selected.latitud, selected.lat, general.latitud),
      longitud: numberOrNull(school.longitud, school.lng, school.lon, selected.longitud, selected.lng, selected.lon, general.longitud),
      raw: { ...school, selectedSchool: selected, general },
    },
    schoolKey,
    idEscuela,
    codigoLocal,
    blocks,
    floors,
    rooms,
    sanitaries,
    siteElements,
    evidenceIndex,
    timeRecords: records,
    counts: {
      blocks: blocks.length,
      floors: floors.length,
      rooms: rooms.length,
      roomObjects: rooms.reduce((sum, room) => sum + asArray(room.objects).length, 0),
      sanitaries: sanitaries.length,
      sanitaryObjects: sanitaries.reduce((sum, item) => sum + asArray(item.objects).length, 0),
      siteElements: siteElements.length,
      evidence: evidenceIndex.length,
      timeRecords: records.length,
    },
  };
}

async function upsertSyncMutation(client, data, context, status) {
  await client.query(
    `INSERT INTO sync_mutations
      (mutation_id, entity, source, status, attempts, payload, error, received_at, updated_at)
     VALUES ($1, $2, $3, $4, 1, $5::jsonb, NULL, now(), now())
     ON CONFLICT (mutation_id) DO UPDATE
       SET attempts = sync_mutations.attempts + 1,
           entity = EXCLUDED.entity,
           source = EXCLUDED.source,
           status = EXCLUDED.status,
           payload = EXCLUDED.payload,
           error = NULL,
           updated_at = now()`,
    [
      data.mutationId,
      data.entity,
      data.source,
      status,
      JSON.stringify({ ...data.payload, request_context: context }),
    ],
  );
}

async function upsertSchool(client, data) {
  const school = data.school;
  await client.query(
    `INSERT INTO schools
      (school_key, id_escuela, codigo_local, nombre, departamento, distrito, localidad, zona, latitud, longitud, raw, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now())
     ON CONFLICT (school_key) DO UPDATE
       SET id_escuela = COALESCE(NULLIF(EXCLUDED.id_escuela, ''), schools.id_escuela),
           codigo_local = COALESCE(NULLIF(EXCLUDED.codigo_local, ''), schools.codigo_local),
           nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), schools.nombre),
           departamento = COALESCE(NULLIF(EXCLUDED.departamento, ''), schools.departamento),
           distrito = COALESCE(NULLIF(EXCLUDED.distrito, ''), schools.distrito),
           localidad = COALESCE(NULLIF(EXCLUDED.localidad, ''), schools.localidad),
           zona = COALESCE(NULLIF(EXCLUDED.zona, ''), schools.zona),
           latitud = COALESCE(EXCLUDED.latitud, schools.latitud),
           longitud = COALESCE(EXCLUDED.longitud, schools.longitud),
           raw = EXCLUDED.raw,
           updated_at = now()`,
    [
      school.schoolKey,
      school.idEscuela,
      school.codigoLocal,
      school.nombre,
      school.departamento,
      school.distrito,
      school.localidad,
      school.zona,
      school.latitud,
      school.longitud,
      JSON.stringify(school.raw || {}),
    ],
  );
}

async function upsertDraft(client, data) {
  const t = data.timeFields;
  await client.query(
    `INSERT INTO mec_drafts
      (draft_id, mutation_id, school_key, id_escuela, codigo_local, usuario, estado_borrador,
       motivo, app_version, schema_version, saved_at, counts, summary, time_tracking, draft,
       evidence_index, tiempo_escuela_min, tiempo_aulas_min, tiempo_aulas_promedio_min,
       tiempo_sanitarios_min, tiempo_sanitarios_promedio_min, tiempo_exteriores_min, updated_at)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,
       $16::jsonb,$17,$18,$19,$20,$21,$22,now())
     ON CONFLICT (draft_id) DO UPDATE
       SET mutation_id = EXCLUDED.mutation_id,
           school_key = EXCLUDED.school_key,
           id_escuela = EXCLUDED.id_escuela,
           codigo_local = EXCLUDED.codigo_local,
           usuario = EXCLUDED.usuario,
           estado_borrador = EXCLUDED.estado_borrador,
           motivo = EXCLUDED.motivo,
           app_version = EXCLUDED.app_version,
           schema_version = EXCLUDED.schema_version,
           saved_at = EXCLUDED.saved_at,
           counts = EXCLUDED.counts,
           summary = EXCLUDED.summary,
           time_tracking = EXCLUDED.time_tracking,
           draft = EXCLUDED.draft,
           evidence_index = EXCLUDED.evidence_index,
           tiempo_escuela_min = EXCLUDED.tiempo_escuela_min,
           tiempo_aulas_min = EXCLUDED.tiempo_aulas_min,
           tiempo_aulas_promedio_min = EXCLUDED.tiempo_aulas_promedio_min,
           tiempo_sanitarios_min = EXCLUDED.tiempo_sanitarios_min,
           tiempo_sanitarios_promedio_min = EXCLUDED.tiempo_sanitarios_promedio_min,
           tiempo_exteriores_min = EXCLUDED.tiempo_exteriores_min,
           updated_at = now()`,
    [
      data.draftId,
      data.mutationId,
      data.schoolKey,
      data.idEscuela,
      data.codigoLocal,
      data.user,
      data.status,
      data.reason,
      data.appVersion,
      data.schemaVersion,
      data.savedAt,
      JSON.stringify({ ...data.countsPayload, normalized: data.counts }),
      JSON.stringify(data.summary),
      JSON.stringify(data.timeTracking),
      JSON.stringify(data.draft),
      JSON.stringify(data.evidenceIndex),
      t.schoolMinutes,
      t.classroomMinutes,
      t.classroomAverageMinutes,
      t.sanitaryMinutes,
      t.sanitaryAverageMinutes,
      t.siteMinutes,
    ],
  );
}

async function replaceDraftChildren(client, data) {
  await deleteDraftChildren(client, data.draftId);
  await insertBuildings(client, data);
  await insertFloors(client, data);
  await insertRooms(client, data);
  await insertRoomObjects(client, data);
  await insertSanitaries(client, data);
  await insertSanitaryObjects(client, data);
  await insertSiteElements(client, data);
  await insertEvidence(client, data);
  await insertTimeRecords(client, data);
}

async function deleteDraftChildren(client, draftId) {
  const tables = [
    'time_tracking_items',
    'evidence_files',
    'sanitary_objects',
    'room_objects',
    'site_elements',
    'sanitary_groups',
    'rooms',
    'floors',
    'buildings',
  ];
  for (const table of tables) {
    await client.query(`DELETE FROM ${table} WHERE draft_id = $1`, [draftId]);
  }
}

async function insertBuildings(client, data) {
  for (const [index, block] of data.blocks.entries()) {
    const blockId = stableId(block, `bloque_${index + 1}`);
    await client.query(
      `INSERT INTO buildings
        (draft_id, block_id, school_key, codigo, nombre, floor_count, largo_m, ancho_m, estado, geometry, ficha, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb)`,
      [
        data.draftId,
        blockId,
        data.schoolKey,
        text(block.bloque_codigo, block.codigo, block.code),
        text(block.nombre, block.name, block.bloque_nombre, blockId),
        integerOrNull(block.floorCount, block.pisos, asArray(block.floors).length || null),
        numberOrNull(block.largo_m, block.largo, block.lengthM),
        numberOrNull(block.ancho_m, block.ancho, block.widthM),
        text(block.estado, block.state),
        JSON.stringify(geometryOf(block)),
        JSON.stringify(fichaOf(block)),
        JSON.stringify(block),
      ],
    );
  }
}

async function insertFloors(client, data) {
  for (const floor of data.floors) {
    await client.query(
      `INSERT INTO floors
        (draft_id, floor_id, block_id, school_key, label, level_number, largo_m, ancho_m, estado, geometry, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`,
      [
        data.draftId,
        floor.floorId,
        floor.blockId,
        data.schoolKey,
        floor.label,
        floor.levelNumber,
        numberOrNull(floor.raw.largo_m, floor.raw.largo, floor.raw.lengthM),
        numberOrNull(floor.raw.ancho_m, floor.raw.ancho, floor.raw.widthM),
        text(floor.raw.estado, floor.raw.state),
        JSON.stringify(geometryOf(floor.raw)),
        JSON.stringify(floor.raw),
      ],
    );
  }
}

async function insertRooms(client, data) {
  for (const [index, room] of data.rooms.entries()) {
    const roomId = stableId(room, `ambiente_${index + 1}`);
    await client.query(
      `INSERT INTO rooms
        (draft_id, room_id, block_id, floor_label, kind, name, code, estado, largo_m, ancho_m, area_m2, geometry, ficha, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb)`,
      [
        data.draftId,
        roomId,
        text(room.blockId, room.bloque_id, room.bloque),
        text(room.floor, room.planta, room.piso, 'Piso 1'),
        text(room.spaceType, room.tipo_espacio, room.tipo, 'classroom'),
        text(room.name, room.nombre, room.aula_nombre, room.codigo, roomId),
        text(room.codigo, room.code, room.aula_codigo),
        text(room.estado, room.state),
        numberOrNull(room.largo_m, room.largo, room.lengthM, room.room?.w),
        numberOrNull(room.ancho_m, room.ancho, room.widthM, room.room?.h),
        numberOrNull(room.superficie_m2, room.area_m2, room.area),
        JSON.stringify(geometryOf(room)),
        JSON.stringify(fichaOf(room)),
        JSON.stringify(room),
      ],
    );
  }
}

async function insertRoomObjects(client, data) {
  for (const [roomIndex, room] of data.rooms.entries()) {
    const roomId = stableId(room, `ambiente_${roomIndex + 1}`);
    for (const [objectIndex, object] of asArray(room.objects).entries()) {
      const objectId = `${roomId}:${stableId(object, `obj_${objectIndex + 1}`)}`;
      await client.query(
        `INSERT INTO room_objects
          (draft_id, room_id, object_id, type, code, estado, geometry, ficha, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
        [
          data.draftId,
          roomId,
          objectId,
          text(object.type, object.tipo),
          text(object.ficha?.codigo, object.codigo, object.code),
          text(object.ficha?.estado, object.estado, object.state),
          JSON.stringify(geometryOf(object)),
          JSON.stringify(fichaOf(object)),
          JSON.stringify(object),
        ],
      );
    }
  }
}

async function insertSanitaries(client, data) {
  for (const [index, item] of data.sanitaries.entries()) {
    const sanitaryId = stableId(item, `sanitario_${index + 1}`);
    await client.query(
      `INSERT INTO sanitary_groups
        (draft_id, sanitary_id, block_ref, floor_label, code, name, estado, largo_m, ancho_m, area_m2, geometry, ficha, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb)`,
      [
        data.draftId,
        sanitaryId,
        text(item.bloque, item.blockId, item.bloque_id),
        text(item.planta, item.floor, item.piso, 'Piso 1'),
        text(item.codigo, item.code),
        text(item.nombre, item.name, item.codigo, sanitaryId),
        text(item.estado, item.state),
        numberOrNull(item.largo_m, item.largo, item.lengthM, item.room?.w),
        numberOrNull(item.ancho_m, item.ancho, item.widthM, item.room?.h),
        numberOrNull(item.superficie_m2, item.area_m2, item.area),
        JSON.stringify(geometryOf(item)),
        JSON.stringify(fichaOf(item)),
        JSON.stringify(item),
      ],
    );
  }
}

async function insertSanitaryObjects(client, data) {
  for (const [sanitaryIndex, sanitary] of data.sanitaries.entries()) {
    const sanitaryId = stableId(sanitary, `sanitario_${sanitaryIndex + 1}`);
    for (const [objectIndex, object] of asArray(sanitary.objects).entries()) {
      const objectId = `${sanitaryId}:${stableId(object, `obj_${objectIndex + 1}`)}`;
      await client.query(
        `INSERT INTO sanitary_objects
          (draft_id, sanitary_id, object_id, type, code, estado, geometry, ficha, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
        [
          data.draftId,
          sanitaryId,
          objectId,
          text(object.type, object.tipo),
          text(object.ficha?.codigo, object.codigo, object.code),
          text(object.ficha?.estado, object.estado, object.state),
          JSON.stringify(geometryOf(object)),
          JSON.stringify(fichaOf(object)),
          JSON.stringify(object),
        ],
      );
    }
  }
}

async function insertSiteElements(client, data) {
  for (const [index, element] of data.siteElements.entries()) {
    const elementId = stableId(element, `exterior_${index + 1}`);
    await client.query(
      `INSERT INTO site_elements
        (draft_id, element_id, type, code, estado, block_id, geometry, ficha, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
      [
        data.draftId,
        elementId,
        text(element.type, element.tipo),
        text(element.ficha?.codigo, element.codigo, element.code),
        text(element.ficha?.estado, element.estado, element.state),
        text(element.blockId, element.bloque_id, element.bloque),
        JSON.stringify(geometryOf(element)),
        JSON.stringify(fichaOf(element)),
        JSON.stringify(element),
      ],
    );
  }
}

async function insertEvidence(client, data) {
  for (const [index, item] of data.evidenceIndex.entries()) {
    const evidenceId = text(item.evidenceId, item.driveFileId, item.indexedName, `${item.fieldPath || 'evidencia'}:${item.index || index + 1}`);
    await client.query(
      `INSERT INTO evidence_files
        (draft_id, evidence_id, entity_kind, entity_id, field_path, file_name, drive_file_id,
         drive_url, captured_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        data.draftId,
        evidenceId,
        text(item.context?.kind, item.context?.entityKind, evidenceKindFromFieldPath(item.fieldPath)),
        text(item.context?.elementId, item.context?.roomId, item.context?.sanitaryId, item.context?.id),
        text(item.fieldPath),
        text(item.indexedName, item.name),
        text(item.driveFileId),
        text(item.driveUrl),
        dateOrNull(item.capturedAt || item.uploadedAt),
        JSON.stringify(item),
      ],
    );
  }
}

async function insertTimeRecords(client, data) {
  for (const [index, record] of data.timeRecords.entries()) {
    const recordId = `${text(record.kind, 'registro')}:${text(record.id, index + 1)}:${dateOrNull(record.startedAt) || 'sin_inicio'}:${index + 1}`;
    await client.query(
      `INSERT INTO time_tracking_items
        (draft_id, record_id, kind, entity_id, label, started_at, finished_at,
         duration_seconds, active, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        data.draftId,
        recordId,
        text(record.kind, 'registro'),
        text(record.id),
        text(record.label),
        dateOrNull(record.startedAt),
        dateOrNull(record.finishedAt),
        integerOrNull(record.durationSeconds),
        Boolean(record.active),
        JSON.stringify(record),
      ],
    );
  }
}

async function markMutationError(data, err, context) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await upsertSyncMutation(client, data, context, 'error');
    await client.query(
      `UPDATE sync_mutations
          SET status = 'error',
              error = $2,
              updated_at = now()
        WHERE mutation_id = $1`,
      [data.mutationId, String(err.message || err)],
    );
  } finally {
    client.release();
  }
}

function floorRecords(blocks, rooms, sanitaries) {
  const byId = new Map();
  for (const [blockIndex, block] of blocks.entries()) {
    const blockId = stableId(block, `bloque_${blockIndex + 1}`);
    for (const [floorIndex, floor] of asArray(block.floors).entries()) {
      const label = text(floor.label, floor.nombre, floor.name, floor.piso, floor.planta, `Piso ${floorIndex + 1}`);
      const floorId = stableId(floor, `${blockId}:${slug(label)}`);
      byId.set(floorId, {
        floorId,
        blockId,
        label,
        levelNumber: integerOrNull(floor.level, floor.numero, floorIndex + 1),
        raw: floor,
      });
    }
  }
  for (const room of rooms) {
    const blockId = text(room.blockId, room.bloque_id, room.bloque, 'sin_bloque');
    const label = text(room.floor, room.planta, room.piso, 'Piso 1');
    const floorId = `${blockId}:${slug(label)}`;
    if (!byId.has(floorId)) {
      byId.set(floorId, { floorId, blockId, label, levelNumber: integerOrNull(label.match(/\d+/)?.[0]), raw: { derived: true, label } });
    }
  }
  for (const item of sanitaries) {
    const blockId = text(item.blockId, item.bloque_id, item.bloque, 'sin_bloque');
    const label = text(item.floor, item.planta, item.piso, 'Piso 1');
    const floorId = `${blockId}:${slug(label)}`;
    if (!byId.has(floorId)) {
      byId.set(floorId, { floorId, blockId, label, levelNumber: integerOrNull(label.match(/\d+/)?.[0]), raw: { derived: true, label } });
    }
  }
  return Array.from(byId.values());
}

function timeRecords(timeTracking) {
  const records = asArray(timeTracking.records);
  if (records.length) return records;
  const groups = plainObject(timeTracking.byKind || {});
  return Object.values(groups).flatMap(group => asArray(group.items));
}

function timeTrackingFields(timeTracking) {
  const byKind = plainObject(timeTracking.byKind || {});
  const group = kind => plainObject(byKind[kind] || {});
  const minutes = seconds => Math.round((Math.max(0, Number(seconds) || 0) / 60) * 10) / 10;
  const schoolSeconds = Number(timeTracking.schoolSeconds || group('escuela').totalSeconds || timeTracking.workWindowSeconds || 0);
  return {
    schoolMinutes: minutes(schoolSeconds),
    classroomMinutes: minutes(group('ambiente').totalSeconds),
    classroomAverageMinutes: minutes(group('ambiente').averageSeconds),
    sanitaryMinutes: minutes(group('sanitario').totalSeconds),
    sanitaryAverageMinutes: minutes(group('sanitario').averageSeconds),
    siteMinutes: minutes(group('exterior').totalSeconds),
  };
}

function geometryOf(item) {
  const geometry = {};
  for (const key of [
    'x', 'y', 'w', 'h',
    'xRatio', 'yRatio', 'wRatio', 'hRatio',
    'rotationDeg', 'rotacion_grados', 'rotation',
    'largo_m', 'ancho_m', 'superficie_m2', 'perimetro_m',
    'room', 'rect', 'shape', 'planShape', 'shapePoints', 'points',
    'attached', 'plano', 'baseMap',
  ]) {
    if (item && item[key] !== undefined) geometry[key] = item[key];
  }
  return geometry;
}

function fichaOf(item) {
  if (!item || typeof item !== 'object') return {};
  return plainObject(item.ficha || item.fields || item.meta || {});
}

function evidenceKindFromFieldPath(fieldPath = '') {
  const textPath = String(fieldPath || '');
  if (textPath.startsWith('plano.')) return 'room_object';
  if (textPath.startsWith('sanitarios.')) return 'sanitary';
  if (textPath.startsWith('exteriores.')) return 'site_element';
  return 'draft_field';
}

function stableId(item, fallback) {
  return text(item?.id, item?.uuid, item?.codigo, item?.code, fallback);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function numberOrNull(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = Number(String(value).replace(',', '.'));
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function integerOrNull(...values) {
  const number = numberOrNull(...values);
  return number === null ? null : Math.round(number);
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function slug(value) {
  return text(value, 'sin_id')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'sin_id';
}
