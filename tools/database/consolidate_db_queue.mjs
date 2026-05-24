import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_API_URL = process.env.DATABASE_SYNC_URL || 'http://127.0.0.1:8787/sync/mec-draft';
const DEFAULT_OUTPUT_DIR = 'tools/database/output';
const DEFAULT_TIMEOUT_MS = 30000;

const QUEUE_HEADERS = new Set(['id_mutacion', 'payload_json', 'payload_file_url']);
const MEC_DRAFT_HEADERS = new Set(['id_borrador', 'draft_json', 'resumen_json']);

main().catch(err => {
  console.error(`[db-consolidate] ${err.message || err}`);
  process.exit(1);
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const loaded = await loadEntries(options);
  const filtered = filterEntries(loaded.entries, options);
  const selected = options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
  const mode = options.write ? 'write' : 'dry-run';
  const summary = {
    mode,
    apiUrl: options.apiUrl,
    loaded: loaded.entries.length,
    selected: selected.length,
    loadErrors: loaded.errors.length,
    sent: 0,
    ok: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`[db-consolidate] Fuente: ${loaded.sources.join(', ') || 'sin fuente'}`);
  console.log(`[db-consolidate] Modo: ${mode}${options.write ? '' : ' (no escribe; use --write)'}`);
  console.log(`[db-consolidate] Registros cargados: ${summary.loaded}; seleccionados: ${summary.selected}; errores de carga: ${summary.loadErrors}`);

  const results = loaded.errors.map(error => ({
    source: error.source,
    row: error.row,
    id: error.id || '',
    school: error.school || '',
    ok: false,
    skipped: false,
    error: error.error,
  }));

  if (!selected.length) {
    console.log('[db-consolidate] No hay registros para procesar con los filtros actuales.');
    await maybeWriteReport(options, summary, results);
    if (loaded.errors.length) process.exitCode = 1;
    return;
  }

  if (!options.write) {
    selected.slice(0, 8).forEach(item => {
      console.log(`[db-consolidate] DRY ${item.id} escuela=${item.schoolKey || ''} estado=${item.status || ''} origen=${item.source}`);
    });
    if (selected.length > 8) console.log(`[db-consolidate] ... ${selected.length - 8} registros mas`);
    summary.skipped = selected.length;
    selected.forEach(item => results.push(resultFromItem(item, { skipped: true, error: 'dry-run' })));
    await maybeWriteReport(options, summary, results);
    if (loaded.errors.length) process.exitCode = 1;
    return;
  }

  await checkHealth(options).catch(err => {
    console.warn(`[db-consolidate] Aviso health: ${err.message || err}`);
  });

  await runPool(selected, Math.max(1, options.concurrency), async item => {
    try {
      summary.sent += 1;
      const response = await postPayload(item.payload, options);
      summary.ok += 1;
      results.push(resultFromItem(item, {
        ok: true,
        statusCode: response.statusCode,
        response: response.body,
      }));
      console.log(`[db-consolidate] OK ${item.id} -> ${response.body?.draft_id || response.body?.mutation_id || 'postgresql'}`);
    } catch (err) {
      summary.failed += 1;
      results.push(resultFromItem(item, {
        ok: false,
        statusCode: err.statusCode || '',
        error: err.message || String(err),
        response: err.body || null,
      }));
      console.warn(`[db-consolidate] ERROR ${item.id}: ${err.message || err}`);
    }
  });

  await maybeWriteReport(options, summary, results);
  console.log(`[db-consolidate] Resultado: ok=${summary.ok}, error=${summary.failed}, carga_error=${summary.loadErrors}`);
  if (summary.failed || summary.loadErrors) process.exitCode = 1;
}

function parseArgs(argv) {
  const options = {
    input: '',
    queueCsv: '',
    mecDraftsCsv: '',
    jsonl: '',
    json: '',
    apiUrl: DEFAULT_API_URL,
    token: process.env.DATABASE_SYNC_TOKEN || process.env.DB_SYNC_TOKEN || '',
    write: false,
    help: false,
    limit: 0,
    school: '',
    status: '',
    payloadDir: '',
    fetchPayloadFiles: false,
    concurrency: 1,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    outputDir: DEFAULT_OUTPUT_DIR,
    noReport: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Falta valor para ${arg}`);
      i += 1;
      return argv[i];
    };

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--input' || arg === '-i') options.input = next();
    else if (arg === '--queue-csv') options.queueCsv = next();
    else if (arg === '--mec-drafts-csv') options.mecDraftsCsv = next();
    else if (arg === '--jsonl') options.jsonl = next();
    else if (arg === '--json') options.json = next();
    else if (arg === '--api-url') options.apiUrl = next();
    else if (arg === '--token') options.token = next();
    else if (arg === '--write') options.write = true;
    else if (arg === '--limit') options.limit = Number(next() || 0);
    else if (arg === '--school') options.school = next();
    else if (arg === '--status') options.status = next();
    else if (arg === '--payload-dir') options.payloadDir = next();
    else if (arg === '--fetch-payload-files') options.fetchPayloadFiles = true;
    else if (arg === '--concurrency') options.concurrency = Number(next() || 1);
    else if (arg === '--timeout-ms') options.timeoutMs = Number(next() || DEFAULT_TIMEOUT_MS);
    else if (arg === '--output-dir') options.outputDir = next();
    else if (arg === '--no-report') options.noReport = true;
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }

  if (options.help) return options;
  const sourceCount = [options.input, options.queueCsv, options.mecDraftsCsv, options.jsonl, options.json].filter(Boolean).length;
  if (!sourceCount) throw new Error('Indique --input, --queue-csv, --mec-drafts-csv, --jsonl o --json.');
  if (options.limit < 0 || Number.isNaN(options.limit)) throw new Error('--limit debe ser numerico.');
  if (options.concurrency < 1 || Number.isNaN(options.concurrency)) throw new Error('--concurrency debe ser numerico y mayor a 0.');
  if (options.timeoutMs < 1000 || Number.isNaN(options.timeoutMs)) throw new Error('--timeout-ms debe ser numerico y mayor a 1000.');
  return options;
}

function printHelp() {
  console.log(`CIALPA DB consolidator

Uso:
  npm run db:consolidate -- --input <archivo> [--write]

Fuentes aceptadas:
  --queue-csv <csv>        Export de la hoja db_sync_queue.
  --mec-drafts-csv <csv>   Export de la hoja mec_borradores.
  --jsonl <jsonl>          Payloads JSONL, uno por linea.
  --json <json>            Payload unico o arreglo de payloads.
  --input <archivo>        Deteccion automatica por extension y encabezados.

Opciones:
  --write                  Envia a PostgreSQL. Sin esto solo simula.
  --api-url <url>          Endpoint /sync/mec-draft. Default DATABASE_SYNC_URL o localhost.
  --token <token>          Bearer token. Default DATABASE_SYNC_TOKEN.
  --status <lista>         Filtra estados de cola, por ejemplo pendiente,error.
  --school <codigo>        Filtra codigo_local o id_escuela.
  --limit <n>              Procesa como maximo n registros.
  --payload-dir <dir>      Carpeta con JSON completos exportados de Drive.
  --fetch-payload-files    Intenta descargar payload_file_url de Google Drive.
  --concurrency <n>        Envios paralelos. Default 1.
  --output-dir <dir>       Reportes locales. Default tools/database/output.
  --no-report              No escribe reporte local.

Ejemplos:
  npm run db:consolidate -- --input db_sync_queue.csv
  npm run db:consolidate -- --input db_sync_queue.csv --status pendiente,error --write
  npm run db:consolidate -- --mec-drafts-csv mec_borradores.csv --limit 10 --write
  npm run db:consolidate -- --jsonl tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl --limit 5 --write
`);
}

async function loadEntries(options) {
  const entries = [];
  const errors = [];
  const sources = [];
  const add = async (kind, file) => {
    if (!file) return;
    const absolute = resolve(file);
    if (!existsSync(absolute)) throw new Error(`No existe el archivo: ${file}`);
    sources.push(`${kind}:${file}`);
    const loaded = await loadFile(kind, absolute, options);
    entries.push(...loaded.entries);
    errors.push(...loaded.errors);
  };

  if (options.input) {
    const detected = await detectInputKind(options.input);
    await add(detected, options.input);
  }
  await add('queue-csv', options.queueCsv);
  await add('mec-drafts-csv', options.mecDraftsCsv);
  await add('jsonl', options.jsonl);
  await add('json', options.json);
  return { entries, errors, sources };
}

async function detectInputKind(file) {
  const absolute = resolve(file);
  const extension = extname(absolute).toLowerCase();
  if (extension === '.jsonl' || extension === '.ndjson') return 'jsonl';
  if (extension === '.json') return 'json';
  if (extension !== '.csv') throw new Error(`No se puede detectar el tipo de ${file}. Use una opcion explicita.`);
  const text = await readFile(absolute, 'utf8');
  const rows = parseCsv(text);
  if (!rows.length) throw new Error(`CSV vacio: ${file}`);
  const headers = rows[0].map(normalizeHeader);
  if (headers.some(h => QUEUE_HEADERS.has(h))) return 'queue-csv';
  if (headers.some(h => MEC_DRAFT_HEADERS.has(h))) return 'mec-drafts-csv';
  throw new Error(`CSV sin encabezados reconocidos: ${file}`);
}

async function loadFile(kind, file, options) {
  if (kind === 'queue-csv') return loadQueueCsv(file, options);
  if (kind === 'mec-drafts-csv') return loadMecDraftsCsv(file);
  if (kind === 'jsonl') return loadJsonl(file);
  if (kind === 'json') return loadJson(file);
  throw new Error(`Tipo de fuente no soportado: ${kind}`);
}

async function loadQueueCsv(file, options) {
  const rows = rowsFromCsv(await readFile(file, 'utf8'));
  const entries = [];
  const errors = [];
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    try {
      const payload = await payloadFromQueueRow(row, options);
      entries.push(makeEntry(payload, {
        source: `queue:${basename(file)}`,
        row: rowNumber,
        queueStatus: text(row.estado),
      }));
    } catch (err) {
      errors.push({
        source: `queue:${basename(file)}`,
        row: rowNumber,
        id: row.id_mutacion || '',
        school: row.codigo_local || row.id_escuela || '',
        error: err.message || String(err),
      });
    }
  }
  return { entries, errors };
}

async function payloadFromQueueRow(row, options) {
  let payload = null;
  let inlineError = null;
  try {
    payload = parseJsonMaybe(row.payload_json, 'payload_json');
  } catch (err) {
    inlineError = err;
  }
  if (!payload) payload = await payloadFromLocalFile(row, options);
  if (!payload && options.fetchPayloadFiles) payload = await payloadFromRemoteFile(row);
  if (!payload) {
    if (inlineError) throw inlineError;
    throw new Error('No se pudo leer payload_json ni payload_file. Exporte el JSON completo o use --payload-dir.');
  }
  return normalizePayload(payload, row);
}

async function payloadFromLocalFile(row, options) {
  if (!options.payloadDir) return null;
  const dir = resolve(options.payloadDir);
  if (!existsSync(dir)) throw new Error(`No existe --payload-dir: ${options.payloadDir}`);
  const candidates = [
    row.payload_file_path,
    row.payload_file_id ? join(dir, `${row.payload_file_id}.json`) : '',
    row.id_mutacion ? join(dir, `${safeFilename(row.id_mutacion)}.json`) : '',
    row.id_mutacion ? join(dir, `${row.id_mutacion}.json`) : '',
  ].filter(Boolean);
  for (const candidate of candidates) {
    const path = resolve(candidate);
    if (existsSync(path)) return parseJsonMaybe(await readFile(path, 'utf8'), path);
  }
  if (row.id_mutacion) {
    const files = await readdir(dir).catch(() => []);
    const needle = safeFilename(row.id_mutacion).toLowerCase();
    const match = files.find(name => name.toLowerCase().includes(needle) && name.toLowerCase().endsWith('.json'));
    if (match) return parseJsonMaybe(await readFile(join(dir, match), 'utf8'), match);
  }
  return null;
}

async function payloadFromRemoteFile(row) {
  const url = directDriveUrl(row.payload_file_url, row.payload_file_id);
  if (!url) return null;
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) throw new Error(`No se pudo descargar payload_file_url: HTTP ${response.status}`);
  return parseJsonMaybe(body, row.payload_file_url || row.payload_file_id);
}

async function loadMecDraftsCsv(file) {
  const rows = rowsFromCsv(await readFile(file, 'utf8'));
  const entries = [];
  const errors = [];
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    try {
      entries.push(makeEntry(normalizeMecDraftRow(row), {
        source: `mec_borradores:${basename(file)}`,
        row: rowNumber,
        queueStatus: row.estado_borrador || '',
      }));
    } catch (err) {
      errors.push({
        source: `mec_borradores:${basename(file)}`,
        row: rowNumber,
        id: row.id_borrador || '',
        school: row.codigo_local || row.id_escuela || '',
        error: err.message || String(err),
      });
    }
  }
  return { entries, errors };
}

async function loadJsonl(file) {
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/g).map(line => line.trim()).filter(Boolean);
  const entries = [];
  const errors = [];
  for (const [index, line] of lines.entries()) {
    try {
      entries.push(makeEntry(normalizePayload(parseJsonMaybe(line, `${file}:${index + 1}`)), {
        source: `jsonl:${basename(file)}`,
        row: index + 1,
      }));
    } catch (err) {
      errors.push({
        source: `jsonl:${basename(file)}`,
        row: index + 1,
        error: err.message || String(err),
      });
    }
  }
  return { entries, errors };
}

async function loadJson(file) {
  const value = parseJsonMaybe(await readFile(file, 'utf8'), file);
  const items = Array.isArray(value) ? value : [value];
  const entries = [];
  const errors = [];
  for (const [index, item] of items.entries()) {
    try {
      entries.push(makeEntry(normalizePayload(item), {
        source: `json:${basename(file)}`,
        row: index + 1,
      }));
    } catch (err) {
      errors.push({
        source: `json:${basename(file)}`,
        row: index + 1,
        error: err.message || String(err),
      });
    }
  }
  return { entries, errors };
}

function normalizeMecDraftRow(row) {
  const summary = parseJsonMaybe(row.resumen_json, 'resumen_json') || {};
  const timeTracking = parseJsonMaybe(row.tiempo_registro_json, 'tiempo_registro_json') || summary.timeTracking || {};
  return normalizePayload({
    mutation_id: row.id_borrador,
    entity: 'mec_draft',
    source: 'cialpa_mec_borradores_export',
    app_version: row.app_version,
    schema_version: row.schema_version,
    saved_at: row.fecha_guardado || row.actualizado_en || row.creado_en,
    school: {
      id_escuela: row.id_escuela,
      codigo_local: row.codigo_local,
      nombre_escuela: row.nombre_escuela,
    },
    user: row.usuario,
    status: row.estado_borrador,
    reason: row.motivo,
    counts: {
      blocks: numberOrZero(row.bloques),
      floors: numberOrZero(row.pisos),
      classrooms: numberOrZero(row.aulas),
      otherSpaces: numberOrZero(row.otros_espacios),
      sanitaries: numberOrZero(row.sanitarios),
      siteElements: numberOrZero(row.exteriores),
      evidence: numberOrZero(row.evidencias),
    },
    time_tracking: timeTracking,
    summary,
    draft: parseJsonMaybe(row.draft_json, 'draft_json') || {},
    evidence_index: parseJsonMaybe(row.evidence_index_json, 'evidence_index_json') || [],
  }, row);
}

function normalizePayload(input, row = {}) {
  const payload = unwrapPayload(input);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Payload invalido.');
  const schoolPayload = plainObject(payload.school || {});
  const draft = plainObject(payload.draft || payload.values || parseJsonMaybe(payload.draft_json, 'draft_json') || {});
  const summary = plainObject(payload.summary || payload.resumen || parseJsonMaybe(payload.resumen_json, 'resumen_json') || {});
  const timeTracking = plainObject(payload.time_tracking || payload.timeTracking || parseJsonMaybe(payload.tiempo_registro_json, 'tiempo_registro_json') || summary.timeTracking || {});
  const evidenceIndex = asArray(payload.evidence_index || payload.evidenceIndex || parseJsonMaybe(payload.evidence_index_json, 'evidence_index_json'));
  const mutationId = text(
    payload.mutation_id,
    payload.clientMutationId,
    payload.id_mutacion,
    payload.id_borrador,
    row.id_mutacion,
    row.id_borrador,
  );
  if (!mutationId) throw new Error('mutation_id requerido.');

  const normalized = {
    mutation_id: mutationId,
    entity: text(payload.entity, payload.tipo_entidad, row.tipo_entidad, 'mec_draft'),
    source: text(payload.source, 'cialpa_db_consolidator'),
    app_version: text(payload.app_version, payload.appVersion, row.app_version),
    schema_version: text(payload.schema_version, payload.schemaVersion, row.schema_version),
    saved_at: text(payload.saved_at, payload.savedAt, row.fecha_evento, row.fecha_guardado, row.actualizado_en, row.creado_en),
    school: {
      id_escuela: text(schoolPayload.id_escuela, payload.id_escuela, row.id_escuela),
      codigo_local: text(schoolPayload.codigo_local, payload.codigo_local, row.codigo_local),
      nombre_escuela: text(schoolPayload.nombre_escuela, schoolPayload.nombre, payload.nombre_escuela, row.nombre_escuela),
      departamento: text(schoolPayload.departamento, payload.departamento),
      distrito: text(schoolPayload.distrito, payload.distrito),
      localidad: text(schoolPayload.localidad, payload.localidad),
    },
    user: text(payload.user, payload.usuario, payload.usuario_cliente, row.usuario),
    status: text(payload.status, payload.estado_borrador, row.estado_borrador, 'en_curso'),
    reason: text(payload.reason, payload.motivo, row.motivo),
    counts: plainObject(payload.counts || countsFromLegacyPayload(payload, row)),
    time_tracking: timeTracking,
    summary,
    draft,
    evidence_index: evidenceIndex,
  };

  if (!normalized.school.codigo_local && !normalized.school.id_escuela) {
    const selected = plainObject(draft.__selectedSchool || {});
    const general = plainObject(draft.general || {});
    normalized.school.codigo_local = text(selected.codigo_local, selected.codigo, general.codigo_local, general.codigo);
    normalized.school.id_escuela = text(selected.id_escuela, selected.id, general.id_escuela);
    normalized.school.nombre_escuela = text(normalized.school.nombre_escuela, selected.nombre, selected.nombre_escuela, general.nombre_escuela, general.nombre_institucion);
  }
  return normalized;
}

function unwrapPayload(input) {
  if (typeof input === 'string') return parseJsonMaybe(input, 'payload');
  if (input && typeof input === 'object' && input.payload_json && !input.mutation_id && !input.clientMutationId) {
    return parseJsonMaybe(input.payload_json, 'payload_json');
  }
  return input;
}

function countsFromLegacyPayload(payload, row) {
  return {
    blocks: numberOrZero(payload.bloques || row.bloques),
    floors: numberOrZero(payload.pisos || row.pisos),
    classrooms: numberOrZero(payload.aulas || row.aulas),
    otherSpaces: numberOrZero(payload.otros_espacios || row.otros_espacios),
    sanitaries: numberOrZero(payload.sanitarios || row.sanitarios),
    siteElements: numberOrZero(payload.exteriores || row.exteriores),
    evidence: numberOrZero(payload.evidencias || row.evidencias),
  };
}

function makeEntry(payload, metadata) {
  const id = payload.mutation_id;
  const schoolKey = text(payload.school?.codigo_local, payload.school?.id_escuela);
  return {
    id,
    schoolKey,
    status: text(metadata.queueStatus, payload.status),
    source: metadata.source,
    row: metadata.row,
    payload,
  };
}

function filterEntries(entries, options) {
  const statuses = options.status
    ? new Set(options.status.split(',').map(part => normalizeStatus(part)).filter(Boolean))
    : null;
  const schoolFilter = normalizeId(options.school);
  return entries.filter(item => {
    if (statuses && !statuses.has(normalizeStatus(item.status))) return false;
    if (!schoolFilter) return true;
    const schoolCandidates = [
      item.schoolKey,
      item.payload.school?.codigo_local,
      item.payload.school?.id_escuela,
      item.payload.mutation_id,
    ].map(normalizeId);
    return schoolCandidates.some(candidate => candidate && candidate.includes(schoolFilter));
  });
}

async function checkHealth(options) {
  const url = new URL(options.apiUrl);
  url.pathname = '/health';
  url.search = '';
  const response = await fetch(url, { method: 'GET' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  console.log(`[db-consolidate] Health: database=${body.database || 'n/d'} schema=${body.schema || 'n/d'}`);
}

async function postPayload(payload, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const textBody = await response.text();
    const body = parseJsonMaybe(textBody, 'api response') || { raw: textBody.slice(0, 1000) };
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${body.error || body.message || textBody.slice(0, 200)}`);
      error.statusCode = response.status;
      error.body = body;
      throw error;
    }
    return { statusCode: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(workers);
}

async function maybeWriteReport(options, summary, results) {
  if (options.noReport) return;
  await mkdir(options.outputDir, { recursive: true });
  const stamp = timestampForFile();
  const jsonPath = join(options.outputDir, `db-consolidation-${stamp}.json`);
  const csvPath = join(options.outputDir, `db-consolidation-${stamp}.csv`);
  await writeFile(jsonPath, JSON.stringify({ summary, results }, null, 2), 'utf8');
  await writeFile(csvPath, resultsToCsv(results), 'utf8');
  console.log(`[db-consolidate] Reporte JSON: ${jsonPath}`);
  console.log(`[db-consolidate] Reporte CSV: ${csvPath}`);
}

function resultFromItem(item, extra = {}) {
  return {
    source: item.source,
    row: item.row,
    id: item.id,
    school: item.schoolKey || '',
    payloadStatus: item.payload.status || '',
    ok: Boolean(extra.ok),
    skipped: Boolean(extra.skipped),
    statusCode: extra.statusCode || '',
    error: extra.error || '',
    databaseMutation: extra.response?.mutation_id || '',
    draftId: extra.response?.draft_id || '',
    schoolKey: extra.response?.school_key || '',
  };
}

function rowsFromCsv(textValue) {
  const rows = parseCsv(textValue);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1)
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function parseCsv(textValue) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const textClean = stripBom(String(textValue || ''));
  for (let i = 0; i < textClean.length; i += 1) {
    const char = textClean[i];
    if (inQuotes) {
      if (char === '"') {
        if (textClean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function parseJsonMaybe(value, label = 'json') {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch (err) {
    if (String(value).trim()) throw new Error(`JSON invalido en ${label}: ${err.message}`);
    return null;
  }
}

function directDriveUrl(url, fileId) {
  const id = text(fileId, extractDriveFileId(url));
  if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  return text(url);
}

function extractDriveFileId(url) {
  const raw = String(url || '');
  const byPath = raw.match(/\/d\/([^/]+)/);
  if (byPath) return byPath[1];
  const byQuery = raw.match(/[?&]id=([^&]+)/);
  if (byQuery) return decodeURIComponent(byQuery[1]);
  return '';
}

function resultsToCsv(results) {
  const headers = ['source', 'row', 'id', 'school', 'payloadStatus', 'ok', 'skipped', 'statusCode', 'error', 'databaseMutation', 'draftId', 'schoolKey'];
  return [
    headers.join(','),
    ...results.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function normalizeHeader(value) {
  return String(value || '').trim().replace(/^\uFEFF/, '').toLowerCase();
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function text(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const stringValue = String(value).trim();
    if (stringValue) return stringValue;
  }
  return '';
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberOrZero(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function stripBom(value) {
  return value.replace(/^\uFEFF/, '');
}

function safeFilename(value) {
  return String(value || '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
