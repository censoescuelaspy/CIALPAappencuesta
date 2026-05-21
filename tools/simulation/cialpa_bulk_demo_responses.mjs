#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const DEFAULT_COUNT = 1000;
const DEFAULT_SEED = 'CIALPA-DEMO-2026';
const DEFAULT_INPUT = 'tools/simulation/lista_oficial_escuelas_2025_listado_ini.csv';
const DEFAULT_OUTPUT_DIR = 'tools/simulation/demo-output';
const DEFAULT_DELAY_MS = 900;
const DEFAULT_TIMEOUT_MS = 45000;
const MEC_DRAFT_HEADERS = [
  'id_borrador','id_escuela','codigo_local','nombre_escuela','usuario','fecha_guardado',
  'estado_borrador','motivo','app_version','schema_version','bloques','pisos','aulas',
  'otros_espacios','sanitarios','exteriores','evidencias','base_mapa_confirmada',
  'tiempo_escuela_min','tiempo_aulas_min','tiempo_aulas_promedio_min','tiempo_sanitarios_min',
  'tiempo_sanitarios_promedio_min','tiempo_exteriores_min','tiempo_registro_json',
  'resumen_json','draft_json','evidence_index_json','creado_en','actualizado_en',
];

function parseArgs(argv) {
  const args = {
    count: DEFAULT_COUNT,
    seed: DEFAULT_SEED,
    input: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT_DIR,
    config: 'assets/js/config.js',
    user: process.env.CIALPA_USER || 'sim.demo',
    password: process.env.CIALPA_PASSWORD || '',
    gasUrl: process.env.CIALPA_GAS_URL || '',
    appVersion: '',
    runId: process.env.CIALPA_SIM_RUN_ID || compactTimestamp(),
    write: false,
    confirmWrite: '',
    concurrency: 1,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--write') args.write = true;
    else if (raw.startsWith('--count=')) args.count = positiveInt(raw.split('=').slice(1).join('='), DEFAULT_COUNT);
    else if (raw.startsWith('--seed=')) args.seed = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--input=')) args.input = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--output-dir=')) args.outputDir = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--config=')) args.config = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--user=')) args.user = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--password=')) args.password = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--gas-url=')) args.gasUrl = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--run-id=')) args.runId = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--confirm-write=')) args.confirmWrite = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--concurrency=')) args.concurrency = positiveInt(raw.split('=').slice(1).join('='), 1);
    else if (raw.startsWith('--delay-ms=')) args.delayMs = positiveInt(raw.split('=').slice(1).join('='), DEFAULT_DELAY_MS);
    else if (raw.startsWith('--timeout-ms=')) args.timeoutMs = positiveInt(raw.split('=').slice(1).join('='), DEFAULT_TIMEOUT_MS);
    else throw new Error(`Argumento no reconocido: ${raw}`);
  }
  return args;
}

function printHelp() {
  console.log(`
CIALPA bulk demo response simulator

Uso seguro, solo genera archivos:
  node tools/simulation/cialpa_bulk_demo_responses.mjs --count=1000

Salida:
  tools/simulation/demo-output/demo-responses-<runId>.jsonl
  tools/simulation/demo-output/demo-mec_borradores-<runId>.csv
  tools/simulation/demo-output/demo-allocation-<runId>.csv
  tools/simulation/demo-output/demo-infraestructura_mec-<runId>.json
  tools/simulation/demo-output/demo-summary-<runId>.md

Distribucion:
  - Usa el padron oficial local.
  - Agrupa por departamento + distrito.
  - Asigna al menos 1 respuesta por distrito cuando count alcanza.
  - Reparte el resto proporcionalmente al peso del distrito en el padron.

Escritura real al backend (usar solo con permiso):
  node tools/simulation/cialpa_bulk_demo_responses.mjs --count=1000 --write --confirm-write=SIMULAR_1000 --user=admin --password=...

Notas:
  --write llama guardarBorradorMec una vez por respuesta y puede tardar bastante.
  Para mostrar sin tocar produccion, use los CSV/JSON generados.
`);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

async function readAppConfig(configPath) {
  const text = await readFile(resolve(configPath), 'utf8');
  return {
    gasUrl: /GAS_URL:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '',
    version: /VERSION:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '',
    spreadsheetUrl: /SPREADSHEET_URL:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '',
  };
}

async function loadSchools(inputPath) {
  const text = await readFile(resolve(inputPath), 'utf8');
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const [headers, ...body] = rows;
  const schools = body.map(row => objectFromRow(headers, row))
    .map(normalizeSchool)
    .filter(school => school.codigo_local && school.departamento && school.distrito);
  if (!schools.length) throw new Error('No se encontraron escuelas validas en el CSV.');
  return schools;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (c === '"' && next === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        value += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(value);
      value = '';
    } else if (c === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (c !== '\r') {
      value += c;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter(items => items.some(item => String(item || '').trim() !== ''));
}

function objectFromRow(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[String(header || '').trim()] = row[index] ?? '';
  });
  return obj;
}

function normalizeSchool(row) {
  const matricula = number(row['Matrícula del local escolar'] || row['cantidad matricula']);
  return {
    codigo_departamento: text(row['Código del departamento']),
    departamento: text(row.Departamento) || 'Sin departamento',
    codigo_distrito: text(row['Código del distrito']),
    distrito: text(row.Distrito) || 'Sin distrito',
    localidad: text(row.Localidad),
    zona: text(row.Zona) || 'Sin zona',
    codigo_local: text(row['Código del local escolar']),
    nombre: text(row['Nombre del local escolar (*)']),
    matricula: matricula || 80,
    latitud: coordinate(row.lat_corr || row.Latitud, 'lat'),
    longitud: coordinate(row.long_corr || row.Longitud, 'lng'),
  };
}

function allocateByDistrict(schools, count, rng) {
  const groups = new Map();
  for (const school of schools) {
    const key = `${school.codigo_departamento}|${school.departamento}|${school.codigo_distrito}|${school.distrito}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        codigo_departamento: school.codigo_departamento,
        departamento: school.departamento,
        codigo_distrito: school.codigo_distrito,
        distrito: school.distrito,
        schools: [],
        quota: 0,
      });
    }
    groups.get(key).schools.push(school);
  }
  const list = [...groups.values()];
  const target = Math.min(count, schools.length);
  if (target >= list.length) {
    list.forEach(group => { group.quota = 1; });
  }
  let remaining = target - list.reduce((sum, group) => sum + group.quota, 0);
  while (remaining > 0) {
    const candidates = list.filter(group => group.quota < group.schools.length);
    if (!candidates.length) break;
    const weight = candidates.reduce((sum, group) => sum + group.schools.length, 0);
    const additions = candidates.map(group => {
      const raw = remaining * (group.schools.length / weight);
      return { group, add: Math.floor(raw), remainder: raw - Math.floor(raw) };
    });
    let used = 0;
    additions.forEach(item => {
      const capped = Math.min(item.add, item.group.schools.length - item.group.quota, remaining - used);
      item.group.quota += capped;
      used += capped;
    });
    if (used === 0) {
      additions.sort((a, b) => b.remainder - a.remainder || rng() - 0.5);
      for (const item of additions) {
        if (remaining - used <= 0) break;
        if (item.group.quota >= item.group.schools.length) continue;
        item.group.quota++;
        used++;
      }
    }
    remaining -= used;
    if (used <= 0) break;
  }
  return list.filter(group => group.quota > 0);
}

function selectSchools(groups, rng) {
  const selected = [];
  for (const group of groups) {
    const shuffled = shuffle(group.schools, rng);
    shuffled.slice(0, group.quota).forEach((school, index) => {
      selected.push({ school, group, districtIndex: index + 1 });
    });
  }
  return selected.sort((a, b) =>
    a.group.departamento.localeCompare(b.group.departamento, 'es') ||
    a.group.distrito.localeCompare(b.group.distrito, 'es') ||
    a.school.codigo_local.localeCompare(b.school.codigo_local, 'es')
  );
}

function buildPayload({ school, index, runId, appVersion, usuario, rng }) {
  const seq = String(index + 1).padStart(4, '0');
  const schoolSize = sizeProfile(school.matricula, rng);
  const now = isoDateFromIndex(index);
  const blocks = buildBlocks(schoolSize, rng, seq);
  const classrooms = buildClassrooms(blocks, schoolSize, rng, seq);
  const sanitaries = buildSanitaries(blocks, schoolSize, rng, seq);
  const siteElements = buildSiteElements(blocks, schoolSize, rng, seq);
  const evidence = buildEvidence(school, classrooms, sanitaries, siteElements, rng, runId, seq);
  let evidenceCounter = 0;
  const evidenceIndex = Object.entries(evidence).flatMap(([fieldPath, photos]) =>
    photos.map(photo => ({
      id: `${runId}-${seq}-EV-${String(++evidenceCounter).padStart(3, '0')}`,
      simulated: true,
      field_path: fieldPath,
      label: photo.label,
      file_name: photo.name,
      url: photo.url,
      school_code: school.codigo_local,
      school_name: school.nombre,
    }))
  );
  const timeTracking = buildTimeTracking(schoolSize, rng);
  const values = {
    __simulation: true,
    __simulationRunId: runId,
    __savedAt: now,
    __selectedSchool: {
      id_escuela: school.codigo_local,
      codigo_local: school.codigo_local,
      nombre: school.nombre,
      departamento: school.departamento,
      distrito: school.distrito,
    },
    general: {
      codigo_local: school.codigo_local,
      nombre_institucion: school.nombre,
      departamento: school.departamento,
      distrito: school.distrito,
      localidad: school.localidad,
      zona: school.zona,
      matricula: school.matricula,
      responsable_relevamiento: usuario,
      observacion: `Respuesta sintetica demo ${runId}-${seq}`,
    },
    __blocks: blocks,
    __classrooms: classrooms,
    __sanitaries: sanitaries,
    __siteElements: siteElements,
    __evidence: evidence,
  };

  const counts = {
    blocks: blocks.length,
    floors: blocks.reduce((sum, block) => sum + (block.floors || []).length, 0),
    classrooms: classrooms.length,
    otherSpaces: schoolSize.otherSpaces,
    sanitaries: sanitaries.length,
    siteElements: siteElements.length,
    evidence: evidenceIndex.length,
  };

  return {
    clientMutationId: `SIM-MEC-${runId}-${school.codigo_local}`,
    id_escuela: school.codigo_local,
    codigo_local: school.codigo_local,
    nombre_escuela: school.nombre,
    usuario_cliente: usuario,
    estado_borrador: 'simulado_demo',
    motivo: `simulacion_demo_prorrateada_${runId}`,
    app_version: appVersion || '',
    schema_version: 'simulator-bulk-v1',
    counts,
    timeTracking,
    resumen: {
      simulation: true,
      runId,
      generatedAt: now,
      departamento: school.departamento,
      distrito: school.distrito,
      matricula: school.matricula,
      baseMapConfirmed: Boolean(school.latitud && school.longitud),
      timeTracking,
      counts,
    },
    values,
    evidenceIndex,
  };
}

function sizeProfile(matricula, rng) {
  const students = Math.max(20, Number(matricula || 80));
  const classrooms = clamp(Math.round(students / 32 + randomBetween(rng, -1, 2)), 1, 16);
  const blocks = clamp(Math.ceil((classrooms + 2) / 7), 1, 4);
  const floors = students > 350 && rng() > 0.45 ? 2 : 1;
  const sanitaries = clamp(Math.round(classrooms / 4 + randomBetween(rng, 0, 1.4)), 1, 7);
  const otherSpaces = clamp(Math.round(students / 180 + randomBetween(rng, 0, 1.3)), 0, 5);
  const siteElements = clamp(3 + Math.round(students / 220) + Math.floor(rng() * 3), 3, 9);
  return { students, classrooms, blocks, floors, sanitaries, otherSpaces, siteElements };
}

function buildBlocks(profile, rng, seq) {
  return Array.from({ length: profile.blocks }, (_, index) => {
    const floors = Array.from({ length: index === 0 ? profile.floors : 1 }, (__, floorIndex) => ({
      id: `sim_${seq}_b${index + 1}_p${floorIndex + 1}`,
      name: `Piso ${floorIndex + 1}`,
      largo_m: round(randomBetween(rng, 18, 42), 1),
      ancho_m: round(randomBetween(rng, 7, 13), 1),
      estado: pickCondition(rng),
    }));
    return {
      id: `sim_${seq}_block_${index + 1}`,
      bloque_codigo: `B${index + 1}`,
      estado_bloque: pickCondition(rng),
      cantidad_plantas: floors.length,
      largo_m: floors[0].largo_m,
      ancho_m: floors[0].ancho_m,
      superficie_m2: round(floors[0].largo_m * floors[0].ancho_m, 1),
      tipo_circulacion: profile.floors > 1 ? pick(rng, ['Escalera', 'Escalera y rampa', 'Escalera']) : pick(rng, ['Sin desnivel', 'Rampa', 'Escalera']),
      tablero_estado: pickCondition(rng),
      puesta_tierra: rng() > 0.36 ? 'Si' : 'No',
      proteccion_diferencial: rng() > 0.44 ? 'Si' : 'No',
      circuitos_identificados: rng() > 0.5 ? 'Si' : 'No',
      floors,
    };
  });
}

function buildClassrooms(blocks, profile, rng, seq) {
  return Array.from({ length: profile.classrooms }, (_, index) => {
    const block = blocks[index % blocks.length];
    const floor = block.floors[index % block.floors.length];
    const id = `sim_${seq}_aula_${index + 1}`;
    const length = round(randomBetween(rng, 5.2, 8.5), 1);
    const width = round(randomBetween(rng, 4.5, 7.2), 1);
    const objectCount = {
      windows: clamp(Math.round(width / 2 + randomBetween(rng, -1, 1)), 1, 5),
      outlets: clamp(Math.round(profile.students / profile.classrooms / 8 + randomBetween(rng, 0, 2)), 1, 6),
      lights: clamp(Math.round((length * width) / 18), 1, 6),
    };
    return {
      id,
      blockId: block.id,
      floor: floor.name,
      name: `Aula ${index + 1}`,
      estado: pickCondition(rng),
      length,
      width,
      capacidad_estimada: clamp(Math.round((length * width) / 1.35), 12, 45),
      objects: [
        { id: `${id}_room`, type: 'room', x: 60, y: 90, w: 170, h: 118 },
        { id: `${id}_door`, type: 'door', x: 85, y: 202, w: 40, h: 8, ficha: { codigo: `P-${index + 1}`, estado: pickCondition(rng) } },
        ...Array.from({ length: objectCount.windows }, (_, win) => ({ id: `${id}_win_${win + 1}`, type: 'window', ficha: { codigo: `V-${index + 1}.${win + 1}`, estado: pickCondition(rng) } })),
        ...Array.from({ length: objectCount.outlets }, (_, out) => ({ id: `${id}_out_${out + 1}`, type: 'outlet', ficha: { codigo: `T-${index + 1}.${out + 1}`, estado: pickCondition(rng) } })),
        ...Array.from({ length: objectCount.lights }, (_, light) => ({ id: `${id}_light_${light + 1}`, type: 'light', ficha: { codigo: `L-${index + 1}.${light + 1}`, estado: pickCondition(rng) } })),
        ...(rng() > 0.62 ? [{ id: `${id}_fan_1`, type: 'fan', ficha: { estado: pickCondition(rng) } }] : []),
        ...(rng() > 0.72 ? [{ id: `${id}_air_1`, type: 'air_conditioner', ficha: { estado: pickCondition(rng) } }] : []),
        ...(rng() > 0.78 ? [{ id: `${id}_damage_1`, type: 'damage', ficha: { estado: 'Malo', observacion: pick(rng, ['Fisura en muro', 'Humedad visible', 'Cielorraso deteriorado']) } }] : []),
      ],
    };
  });
}

function buildSanitaries(blocks, profile, rng, seq) {
  return Array.from({ length: profile.sanitaries }, (_, index) => {
    const block = blocks[index % blocks.length];
    const floor = block.floors[index % block.floors.length];
    const status = pickCondition(rng);
    const accessible = rng() > 0.68 ? 'Si' : 'No';
    return {
      id: `sim_${seq}_san_${index + 1}`,
      bloque: block.bloque_codigo,
      planta: floor.name,
      codigo: `Sanitario ${index + 1}`,
      estado: rng() > 0.88 ? 'Malo' : status,
      accesible: accessible,
      largo_m: round(randomBetween(rng, 2.2, 5.5), 1),
      ancho_m: round(randomBetween(rng, 1.8, 4.2), 1),
      inodoros: clamp(Math.round(randomBetween(rng, 1, 4)), 1, 6),
      lavamanos: clamp(Math.round(randomBetween(rng, 1, 4)), 1, 6),
      agua: rng() > 0.08 ? 'Si' : 'Intermitente',
      desague: rng() > 0.18 ? 'Red cloacal / camara septica' : 'Deficiente',
      objects: [
        { id: `sim_${seq}_san_${index + 1}_room`, type: 'sanitary-room', ficha: { estado: status } },
        { id: `sim_${seq}_san_${index + 1}_toilet`, type: 'toilet', ficha: { estado: pickCondition(rng) } },
        { id: `sim_${seq}_san_${index + 1}_sink`, type: 'sink', ficha: { estado: pickCondition(rng) } },
        ...(rng() > 0.82 ? [{ id: `sim_${seq}_san_${index + 1}_damage`, type: 'damage', ficha: { estado: 'Malo', observacion: 'Perdida o deterioro sanitario' } }] : []),
      ],
    };
  });
}

function buildSiteElements(blocks, profile, rng, seq) {
  const base = [
    { type: 'water_tank', label: 'Tanque de agua' },
    { type: 'gallery', label: 'Galeria' },
    { type: 'walkway', label: 'Caminero' },
    { type: 'recreation', label: 'Patio / recreacion' },
  ];
  if (blocks.some(block => /rampa/i.test(block.tipo_circulacion))) base.push({ type: 'ramp', label: 'Rampa' });
  if (blocks.some(block => /escalera/i.test(block.tipo_circulacion))) base.push({ type: 'stairs', label: 'Escalera' });
  while (base.length < profile.siteElements) base.push(pick(rng, [
    { type: 'pillar', label: 'Pilar' },
    { type: 'electric_meter', label: 'Medidor' },
    { type: 'switchboard', label: 'Tablero exterior' },
    { type: 'free_space', label: 'Espacio libre' },
  ]));
  return base.slice(0, profile.siteElements).map((item, index) => ({
    id: `sim_${seq}_site_${index + 1}`,
    type: item.type,
    label: item.label,
    length: round(randomBetween(rng, 2, 18), 1),
    width: round(randomBetween(rng, 1.2, 9), 1),
    ficha: {
      estado: pickCondition(rng),
      observacion: 'Elemento exterior generado para demostracion.',
    },
  }));
}

function buildEvidence(school, classrooms, sanitaries, siteElements, rng, runId, seq) {
  const evidence = {};
  const add = (key, label, probability) => {
    if (rng() > probability) return;
    evidence[key] = [{
      label,
      name: `${school.codigo_local}_${key.replace(/[^a-z0-9]+/gi, '_')}.jpg`,
      url: `sim://drive/${runId}/${school.codigo_local}/${seq}/${key}`,
    }];
  };
  add('general.fachada', 'Fachada principal', 0.94);
  add('general.predio', 'Predio escolar', 0.88);
  classrooms.forEach((room, index) => add(`aulas.${room.id}.panoramica`, `Aula ${index + 1}`, 0.78));
  sanitaries.forEach((item, index) => add(`sanitarios.${item.id}.panoramica`, `Sanitario ${index + 1}`, 0.82));
  siteElements.slice(0, 4).forEach((item, index) => add(`exteriores.${item.id}.foto`, `${item.label || 'Exterior'} ${index + 1}`, 0.7));
  return evidence;
}

function buildTimeTracking(profile, rng) {
  const ambienteAverage = randomBetween(rng, 8, 16) * 60;
  const sanitaryAverage = randomBetween(rng, 7, 13) * 60;
  const exteriorAverage = randomBetween(rng, 4, 9) * 60;
  const ambienteTotal = ambienteAverage * (profile.classrooms + profile.otherSpaces);
  const sanitaryTotal = sanitaryAverage * profile.sanitaries;
  const exteriorTotal = exteriorAverage * profile.siteElements;
  const schoolSeconds = Math.round(12 * 60 + ambienteTotal + sanitaryTotal + exteriorTotal + randomBetween(rng, 8, 24) * 60);
  return {
    schoolSeconds,
    byKind: {
      ambiente: { count: profile.classrooms + profile.otherSpaces, totalSeconds: Math.round(ambienteTotal), averageSeconds: Math.round(ambienteAverage) },
      sanitario: { count: profile.sanitaries, totalSeconds: Math.round(sanitaryTotal), averageSeconds: Math.round(sanitaryAverage) },
      exterior: { count: profile.siteElements, totalSeconds: Math.round(exteriorTotal), averageSeconds: Math.round(exteriorAverage) },
    },
  };
}

function payloadToMecDraftRow(payload, now) {
  const tf = draftTimeFields(payload.timeTracking);
  return {
    id_borrador: payload.clientMutationId,
    id_escuela: payload.id_escuela,
    codigo_local: payload.codigo_local,
    nombre_escuela: payload.nombre_escuela,
    usuario: payload.usuario_cliente,
    fecha_guardado: now,
    estado_borrador: payload.estado_borrador,
    motivo: payload.motivo,
    app_version: payload.app_version,
    schema_version: payload.schema_version,
    bloques: payload.counts.blocks,
    pisos: payload.counts.floors,
    aulas: payload.counts.classrooms,
    otros_espacios: payload.counts.otherSpaces,
    sanitarios: payload.counts.sanitaries,
    exteriores: payload.counts.siteElements,
    evidencias: payload.counts.evidence,
    base_mapa_confirmada: payload.resumen.baseMapConfirmed ? 'true' : 'false',
    tiempo_escuela_min: tf.tiempo_escuela_min,
    tiempo_aulas_min: tf.tiempo_aulas_min,
    tiempo_aulas_promedio_min: tf.tiempo_aulas_promedio_min,
    tiempo_sanitarios_min: tf.tiempo_sanitarios_min,
    tiempo_sanitarios_promedio_min: tf.tiempo_sanitarios_promedio_min,
    tiempo_exteriores_min: tf.tiempo_exteriores_min,
    tiempo_registro_json: jsonForSheet(payload.timeTracking, 16000),
    resumen_json: jsonForSheet(payload.resumen, 22000),
    draft_json: jsonForSheet(payload.values, 45000),
    evidence_index_json: jsonForSheet(payload.evidenceIndex, 30000),
    creado_en: now,
    actualizado_en: now,
  };
}

function draftTimeFields(timeTracking) {
  const byKind = timeTracking.byKind || {};
  const minutes = seconds => round(Math.max(0, Number(seconds || 0)) / 60, 1);
  return {
    tiempo_escuela_min: minutes(timeTracking.schoolSeconds),
    tiempo_aulas_min: minutes(byKind.ambiente?.totalSeconds),
    tiempo_aulas_promedio_min: minutes(byKind.ambiente?.averageSeconds),
    tiempo_sanitarios_min: minutes(byKind.sanitario?.totalSeconds),
    tiempo_sanitarios_promedio_min: minutes(byKind.sanitario?.averageSeconds),
    tiempo_exteriores_min: minutes(byKind.exterior?.totalSeconds),
  };
}

function aggregateInfra(payloads) {
  const stats = {
    source: 'simulacion_local',
    generated_at: new Date().toISOString(),
    escuelas_con_borrador: payloads.length,
    borradores_total: payloads.length,
    bloques: 0,
    pisos: 0,
    aulas: 0,
    otros_espacios: 0,
    sanitarios: 0,
    exteriores: 0,
    evidencias: 0,
    area_aulas_m2: 0,
    area_sanitarios_m2: 0,
    area_exteriores_m2: 0,
    area_total_m2: 0,
    puertas: 0,
    ventanas: 0,
    tomas: 0,
    luces: 0,
    ventiladores: 0,
    aires: 0,
    tableros: 0,
    danos: 0,
    escaleras: 0,
    rampas: 0,
    sanitarios_accesibles: 0,
    sanitarios_fuera_servicio: 0,
    puesta_tierra_si: 0,
    diferencial_si: 0,
    circuitos_identificados: 0,
    calidad: { Bueno: 0, Regular: 0, Malo: 0, 'Sin estado': 0 },
  };
  const time = { school: 0, classAvg: 0, sanAvg: 0, ext: 0 };
  for (const payload of payloads) {
    const values = payload.values;
    stats.bloques += payload.counts.blocks;
    stats.pisos += payload.counts.floors;
    stats.aulas += payload.counts.classrooms;
    stats.otros_espacios += payload.counts.otherSpaces;
    stats.sanitarios += payload.counts.sanitaries;
    stats.exteriores += payload.counts.siteElements;
    stats.evidencias += payload.counts.evidence;
    for (const room of values.__classrooms) {
      stats.area_aulas_m2 += number(room.length) * number(room.width);
      countObjects(stats, room.objects || []);
    }
    for (const sanitary of values.__sanitaries) {
      stats.area_sanitarios_m2 += number(sanitary.largo_m) * number(sanitary.ancho_m);
      countObjects(stats, sanitary.objects || []);
      if (yes(sanitary.accesible)) stats.sanitarios_accesibles++;
      if (/malo|fuera|deficiente/i.test(String(sanitary.estado || sanitary.desague || ''))) stats.sanitarios_fuera_servicio++;
      addQuality(stats.calidad, sanitary.estado);
    }
    for (const site of values.__siteElements) {
      stats.area_exteriores_m2 += number(site.length) * number(site.width);
      if (/ramp/i.test(site.type)) stats.rampas++;
      if (/stair|escalera/i.test(site.type)) stats.escaleras++;
      if (/tablero|switchboard/i.test(site.type)) stats.tableros++;
      addQuality(stats.calidad, site.ficha?.estado);
    }
    for (const block of values.__blocks) {
      if (/rampa/i.test(String(block.tipo_circulacion))) stats.rampas++;
      if (/escalera/i.test(String(block.tipo_circulacion))) stats.escaleras++;
      if (yes(block.puesta_tierra)) stats.puesta_tierra_si++;
      if (yes(block.proteccion_diferencial)) stats.diferencial_si++;
      if (yes(block.circuitos_identificados)) stats.circuitos_identificados++;
      if (block.tablero_estado) stats.tableros++;
      addQuality(stats.calidad, block.estado_bloque);
    }
    const fields = draftTimeFields(payload.timeTracking);
    time.school += fields.tiempo_escuela_min;
    time.classAvg += fields.tiempo_aulas_promedio_min;
    time.sanAvg += fields.tiempo_sanitarios_promedio_min;
    time.ext += fields.tiempo_exteriores_min;
  }
  stats.area_aulas_m2 = round(stats.area_aulas_m2, 1);
  stats.area_sanitarios_m2 = round(stats.area_sanitarios_m2, 1);
  stats.area_exteriores_m2 = round(stats.area_exteriores_m2, 1);
  stats.area_total_m2 = round(stats.area_aulas_m2 + stats.area_sanitarios_m2 + stats.area_exteriores_m2, 1);
  stats.tiempos = {
    escuela_promedio_min: round(time.school / Math.max(1, payloads.length), 1),
    aulas_promedio_min: round(time.classAvg / Math.max(1, payloads.length), 1),
    sanitarios_promedio_min: round(time.sanAvg / Math.max(1, payloads.length), 1),
    exteriores_promedio_min: round(time.ext / Math.max(1, payloads.length), 1),
  };
  stats.alertas = [
    { tone: 'danger', label: 'Danos simulados', note: `${stats.danos} elementos con deterioro para priorizar mantenimiento.` },
    { tone: 'warning', label: 'Brecha electrica simulada', note: `${Math.max(0, stats.bloques - stats.puesta_tierra_si)} bloques sin puesta a tierra confirmada.` },
    { tone: 'info', label: 'Cobertura fotografica demo', note: `${stats.evidencias} evidencias sinteticas indexadas.` },
  ];
  return stats;
}

function countObjects(stats, objects) {
  for (const object of objects) {
    const type = String(object.type || '').toLowerCase();
    if (/door|puerta/.test(type)) stats.puertas++;
    else if (/window|ventana/.test(type)) stats.ventanas++;
    else if (/outlet|toma|enchufe/.test(type)) stats.tomas++;
    else if (/light|foco|luz/.test(type)) stats.luces++;
    else if (/fan|ventilador/.test(type)) stats.ventiladores++;
    else if (/air|aire/.test(type)) stats.aires++;
    else if (/switchboard|tablero/.test(type)) stats.tableros++;
    else if (/damage|dano|daño|fisura|grieta|falla/.test(type)) stats.danos++;
    addQuality(stats.calidad, object.ficha?.estado);
  }
}

function addQuality(quality, state) {
  const key = ['Bueno', 'Regular', 'Malo'].includes(state) ? state : 'Sin estado';
  quality[key] = Number(quality[key] || 0) + 1;
}

function allocationRows(groups) {
  return groups
    .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es') || a.distrito.localeCompare(b.distrito, 'es'))
    .map(group => ({
      codigo_departamento: group.codigo_departamento,
      departamento: group.departamento,
      codigo_distrito: group.codigo_distrito,
      distrito: group.distrito,
      escuelas_padron: group.schools.length,
      respuestas_simuladas: group.quota,
    }));
}

function departmentSummary(groups) {
  const map = new Map();
  for (const group of groups) {
    const key = `${group.codigo_departamento}|${group.departamento}`;
    const current = map.get(key) || { codigo_departamento: group.codigo_departamento, departamento: group.departamento, distritos: 0, escuelas_padron: 0, respuestas_simuladas: 0 };
    current.distritos += 1;
    current.escuelas_padron += group.schools.length;
    current.respuestas_simuladas += group.quota;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => a.departamento.localeCompare(b.departamento, 'es'));
}

async function writeOutputs({ outputDir, runId, payloads, rows, groups, infraStats, appConfig }) {
  await mkdir(resolve(outputDir), { recursive: true });
  const paths = {
    jsonl: resolve(outputDir, `demo-responses-${runId}.jsonl`),
    mecCsv: resolve(outputDir, `demo-mec_borradores-${runId}.csv`),
    allocationCsv: resolve(outputDir, `demo-allocation-${runId}.csv`),
    infraJson: resolve(outputDir, `demo-infraestructura_mec-${runId}.json`),
    summaryMd: resolve(outputDir, `demo-summary-${runId}.md`),
  };
  await writeFile(paths.jsonl, payloads.map(payload => JSON.stringify(payload)).join('\n') + '\n', 'utf8');
  await writeFile(paths.mecCsv, toCsv(MEC_DRAFT_HEADERS, rows), 'utf8');
  await writeFile(paths.allocationCsv, toCsv(['codigo_departamento','departamento','codigo_distrito','distrito','escuelas_padron','respuestas_simuladas'], allocationRows(groups)), 'utf8');
  await writeFile(paths.infraJson, JSON.stringify(infraStats, null, 2), 'utf8');
  await writeFile(paths.summaryMd, buildSummary({ runId, payloads, groups, infraStats, appConfig, paths }), 'utf8');
  return paths;
}

function buildSummary({ runId, payloads, groups, infraStats, appConfig, paths }) {
  const departments = departmentSummary(groups);
  const topDepartments = departments
    .sort((a, b) => b.respuestas_simuladas - a.respuestas_simuladas)
    .slice(0, 12)
    .map(row => `| ${row.departamento} | ${row.distritos} | ${row.escuelas_padron} | ${row.respuestas_simuladas} |`)
    .join('\n');
  return `# Simulacion demo CIALPA ${runId}

- Respuestas sinteticas: ${payloads.length}
- Departamentos cubiertos: ${departments.length}
- Distritos cubiertos: ${groups.length}
- App version: ${appConfig.version || 'sin version'}
- Generado: ${new Date().toISOString()}

## Archivos

- Payloads API JSONL: \`${relativePath(paths.jsonl)}\`
- CSV para hoja mec_borradores: \`${relativePath(paths.mecCsv)}\`
- Prorrateo departamento/distrito: \`${relativePath(paths.allocationCsv)}\`
- Snapshot infraestructura_mec: \`${relativePath(paths.infraJson)}\`

## Indicadores sinteticos

- Escuelas con ficha MEC: ${infraStats.escuelas_con_borrador}
- Aulas simuladas: ${infraStats.aulas}
- Sanitarios simulados: ${infraStats.sanitarios}
- Exteriores simulados: ${infraStats.exteriores}
- Evidencias indexadas: ${infraStats.evidencias}
- Area total estimada: ${infraStats.area_total_m2} m2
- Danos/alertas edilicias: ${infraStats.danos}

## Departamentos con mayor muestra

| Departamento | Distritos | Escuelas padron | Respuestas |
| --- | ---: | ---: | ---: |
${topDepartments}

## Uso recomendado

1. Para mostrar sin tocar produccion, usar \`demo-infraestructura_mec-*.json\` y \`demo-summary-*.md\` como material de demostracion.
2. Para cargar en Sheets sin activar estados operativos, importar el CSV \`demo-mec_borradores-*.csv\` en una hoja de prueba.
3. Para escribir contra Apps Script, ejecutar el script con \`--write --confirm-write=SIMULAR_1000\` usando una cuenta admin.
`;
}

function toCsv(headers, rows) {
  return [headers.map(csvCell).join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n';
}

function csvCell(value) {
  const textValue = String(value ?? '');
  if (!/[",\n\r]/.test(textValue)) return textValue;
  return `"${textValue.replace(/"/g, '""')}"`;
}

function jsonForSheet(value, maxChars) {
  const json = JSON.stringify(value || {});
  if (json.length <= maxChars) return json;
  return json.slice(0, Math.max(0, maxChars - 32)) + '... [truncado]';
}

function relativePath(value) {
  return String(value).replace(resolve('.'), '.').replace(/\\/g, '/');
}

function text(value) {
  return String(value ?? '').trim();
}

function number(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function coordinate(value, axis) {
  const parsed = number(value);
  if (!parsed) return '';
  if (axis === 'lat') return parsed > 0 ? -Math.abs(parsed) : parsed;
  if (axis === 'lng') return parsed > 0 ? -Math.abs(parsed) : parsed;
  return parsed;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function randomBetween(rng, min, max) {
  return min + rng() * (max - min);
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function pickCondition(rng) {
  const value = rng();
  if (value < 0.62) return 'Bueno';
  if (value < 0.88) return 'Regular';
  return 'Malo';
}

function yes(value) {
  return /^(si|sí|true|1|ok|bueno)$/i.test(String(value || '').trim());
}

function shuffle(items, rng) {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function seedRandom(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function isoDateFromIndex(index) {
  const base = new Date('2026-05-01T08:00:00.000Z').getTime();
  const spread = index * 47 * 60 * 1000;
  return new Date(base + spread).toISOString();
}

async function gasCall({ gasUrl, action, token = '', method = 'POST', data = {}, timeoutMs }) {
  const payload = { action, ...data };
  if (token) payload.token = token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    let response;
    if (method === 'GET') {
      const url = `${gasUrl}?${new URLSearchParams(payload).toString()}`;
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    } else {
      response = await fetch(gasUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }
    const elapsedMs = Math.round(performance.now() - started);
    const body = await response.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error(`Respuesta no JSON (${response.status}): ${body.slice(0, 220)}`);
    }
    return { json, elapsedMs };
  } finally {
    clearTimeout(timeout);
  }
}

async function writePayloads({ args, appConfig, payloads }) {
  if (args.confirmWrite !== 'SIMULAR_1000') {
    throw new Error('Para escribir en backend debe agregar --confirm-write=SIMULAR_1000.');
  }
  if (!args.password) throw new Error('Falta password. Use CIALPA_PASSWORD o --password.');
  const gasUrl = args.gasUrl || appConfig.gasUrl;
  if (!gasUrl) throw new Error('No se encontro GAS_URL. Use --gas-url o CIALPA_GAS_URL.');
  const login = await gasCall({
    gasUrl,
    action: 'login',
    data: { usuario: args.user, password: args.password },
    timeoutMs: args.timeoutMs,
  });
  if (login.json.status !== 'ok') throw new Error(`Login fallo: ${login.json.message || JSON.stringify(login.json)}`);
  const token = login.json.data?.token;
  if (!token) throw new Error('Login ok, pero no llego token.');
  console.log(`[demo-sim] Login OK como ${args.user} (${login.json.data?.rol || 'sin rol'})`);

  let ok = 0;
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < payloads.length) {
      const index = next++;
      if (index > 0 && args.delayMs) await sleep(args.delayMs);
      const result = await gasCall({
        gasUrl,
        action: 'guardarBorradorMec',
        token,
        data: payloads[index],
        timeoutMs: args.timeoutMs,
      });
      if (result.json.status === 'ok') {
        ok++;
        if (ok % 25 === 0 || ok === payloads.length) console.log(`[demo-sim] OK ${ok}/${payloads.length}`);
      } else {
        failed++;
        console.log(`[demo-sim] ERROR ${index + 1}: ${result.json.message || JSON.stringify(result.json)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(args.concurrency, payloads.length) }, worker));
  console.log(`[demo-sim] Escritura terminada. OK=${ok}, errores=${failed}`);
  if (failed) process.exitCode = 1;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const rng = seedRandom(`${args.seed}-${args.runId}`);
  const appConfig = await readAppConfig(args.config);
  args.appVersion = appConfig.version;
  const schools = await loadSchools(args.input);
  const groups = allocateByDistrict(schools, args.count, rng);
  const selected = selectSchools(groups, rng).slice(0, args.count);
  const payloads = selected.map((item, index) => buildPayload({
    school: item.school,
    index,
    runId: args.runId,
    appVersion: args.appVersion,
    usuario: args.user,
    rng,
  }));
  const now = new Date().toISOString();
  const rows = payloads.map(payload => payloadToMecDraftRow(payload, now));
  const infraStats = aggregateInfra(payloads);
  const paths = await writeOutputs({ outputDir: args.outputDir, runId: args.runId, payloads, rows, groups, infraStats, appConfig });

  console.log(`[demo-sim] Respuestas generadas: ${payloads.length}`);
  console.log(`[demo-sim] Departamentos cubiertos: ${new Set(groups.map(group => group.departamento)).size}`);
  console.log(`[demo-sim] Distritos cubiertos: ${groups.length}`);
  console.log(`[demo-sim] JSONL: ${paths.jsonl}`);
  console.log(`[demo-sim] CSV mec_borradores: ${paths.mecCsv}`);
  console.log(`[demo-sim] Resumen: ${paths.summaryMd}`);

  if (args.write) await writePayloads({ args, appConfig, payloads });
}

main().catch(error => {
  console.error(`[demo-sim] ${error.message}`);
  process.exitCode = 1;
});
