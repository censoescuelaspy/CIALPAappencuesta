#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const defaults = {
  all: path.join(__dirname, 'lista_oficial_escuelas_2025_listado_ini.csv'),
  pilot: path.join(__dirname, 'lista_oficial_escuelas_2025_muestra_piloto_def.csv'),
  output: path.join(repoRoot, 'gas', 'escuelas_embebidas.gs'),
};

function parseArgs(argv) {
  const args = { ...defaults };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') {
      printHelp();
      process.exit(0);
    }
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Argumento no reconocido: ${raw}`);
    const key = match[1];
    if (!Object.prototype.hasOwnProperty.call(args, key)) {
      throw new Error(`Opcion no reconocida: --${key}`);
    }
    args[key] = path.resolve(process.cwd(), match[2]);
  }
  return args;
}

function printHelp() {
  console.log(`Uso:
  node tools/simulation/embed_schools_csv.mjs [opciones]

Opciones:
  --all=RUTA     CSV UTF-8 del padron completo. Default: ${path.relative(repoRoot, defaults.all)}
  --pilot=RUTA   CSV UTF-8 de la muestra piloto. Default: ${path.relative(repoRoot, defaults.pilot)}
  --output=RUTA  Archivo GAS generado. Default: ${path.relative(repoRoot, defaults.output)}
`);
}

function readCsv(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el CSV ${label}: ${filePath}`);
  }
  const csv = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!csv) throw new Error(`El CSV ${label} esta vacio: ${filePath}`);
  assertEmbeddable(csv, label);
  return csv;
}

function assertEmbeddable(csv, label) {
  const forbidden = ['*/', 'CSV_START_ALL', 'CSV_END_ALL', 'CSV_START_PILOT', 'CSV_END_PILOT'];
  for (const token of forbidden) {
    if (csv.includes(token)) {
      throw new Error(`El CSV ${label} contiene el token reservado "${token}".`);
    }
  }
}

function countRows(csv) {
  return csv.split(/\n/).filter(line => line.trim() !== '').length;
}

function gasTemplate({ allCsv, pilotCsv, allRows, pilotRows, updatedAt }) {
  return `/**
 * CIALPA, Relevamiento Escolar
 * escuelas_embebidas.gs, padron de escuelas embebido para lectura rapida.
 *
 * Fuente: lista_oficial_escuelas_2025.gsheet
 * - listado_ini: ${allRows} lineas CSV, incluyendo encabezado.
 * - muestra_piloto_def: ${pilotRows} lineas CSV, incluyendo encabezado.
 *
 * Para regenerar este archivo:
 *   node tools/simulation/embed_schools_csv.mjs
 *
 * Si el CSV completo queda vacio o solo contiene encabezado, el backend vuelve
 * a leer la hoja escuelas_seleccionadas como fallback operativo.
 */

var CIALPA_EMBEDDED_ESCUELAS_CSV_UPDATED_AT = '${updatedAt}';
var CIALPA_EMBEDDED_ESCUELAS_CACHE = null;
var CIALPA_EMBEDDED_ESCUELAS_PILOT_CACHE = null;

function getEmbeddedEscuelasCsv_() {
  return _embeddedEscuelasCsvFromComment_(function() { /*
CSV_START_ALL
${allCsv}
CSV_END_ALL
*/ }, 'CSV_START_ALL', 'CSV_END_ALL');
}

function getEmbeddedEscuelasPilotCsv_() {
  return _embeddedEscuelasCsvFromComment_(function() { /*
CSV_START_PILOT
${pilotCsv}
CSV_END_PILOT
*/ }, 'CSV_START_PILOT', 'CSV_END_PILOT');
}

function _embeddedEscuelasCsvFromComment_(holder, startMarker, endMarker) {
  var source = String(holder || '');
  var start = source.indexOf(startMarker);
  var end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return '';
  return source
    .slice(start + startMarker.length, end)
    .replace(/^\\s*\\r?\\n/, '')
    .replace(/\\r?\\n\\s*$/, '');
}

function getEmbeddedEscuelasUpdatedAt_() {
  return CIALPA_EMBEDDED_ESCUELAS_CSV_UPDATED_AT;
}

function getEmbeddedEscuelasRecords_() {
  if (Array.isArray(CIALPA_EMBEDDED_ESCUELAS_CACHE)) {
    return CIALPA_EMBEDDED_ESCUELAS_CACHE.map(function(row) {
      return Object.assign({}, row);
    });
  }

  var parsed = _embeddedEscuelasParseCsv_(getEmbeddedEscuelasCsv_());
  if (!parsed.rows.length) {
    CIALPA_EMBEDDED_ESCUELAS_CACHE = [];
    return [];
  }

  var pilotMap = getEmbeddedEscuelasPilotMap_();
  var seen = {};
  var rows = parsed.rows.map(function(obj) {
    var code = _embeddedEscuelasCode_(obj);
    var key = _embeddedEscuelasKey_(code);
    if (key) seen[key] = true;
    if (key && pilotMap[key]) {
      _embeddedEscuelasApplyPilot_(obj, pilotMap[key]);
    } else {
      obj.en_muestra_piloto = obj.en_muestra_piloto || 'false';
    }
    return obj;
  });

  Object.keys(pilotMap).forEach(function(key) {
    if (seen[key]) return;
    var pilot = Object.assign({}, pilotMap[key].row);
    _embeddedEscuelasApplyPilot_(pilot, pilotMap[key]);
    pilot.__embedded_csv_row = 'piloto:' + (pilot.__embedded_csv_row || pilot.orden_muestra_piloto || key);
    rows.push(pilot);
  });

  CIALPA_EMBEDDED_ESCUELAS_CACHE = rows;
  return rows.map(function(row) {
    return Object.assign({}, row);
  });
}

function getEmbeddedEscuelasPilotMap_() {
  if (CIALPA_EMBEDDED_ESCUELAS_PILOT_CACHE) {
    return CIALPA_EMBEDDED_ESCUELAS_PILOT_CACHE;
  }

  var parsed = _embeddedEscuelasParseCsv_(getEmbeddedEscuelasPilotCsv_());
  var map = {};
  parsed.rows.forEach(function(row, index) {
    var code = _embeddedEscuelasCode_(row);
    var key = _embeddedEscuelasKey_(code);
    if (!key) return;
    map[key] = {
      row: row,
      orden_muestra_piloto: _embeddedEscuelasFirst_(row, ['orden_muestra_piloto', 'ORDEN_MUESTRA_PILOTO', 'ENUMERA']) || String(index + 1),
      estrato: _embeddedEscuelasFirst_(row, ['ESTRATO', 'estrato']),
      grupo_matricula: _embeddedEscuelasFirst_(row, ['GRUPO_MATRICULA', 'grupo_matricula']),
      matricula: _embeddedEscuelasFirst_(row, ['MATRICULA', 'matricula']),
      aulas_est: _embeddedEscuelasFirst_(row, ['AULAS_EST', 'aulas_est']),
      factor_exp: _embeddedEscuelasFirst_(row, ['FACTOR_EXP', 'factor_exp']),
      verif: _embeddedEscuelasFirst_(row, ['VERIF', 'verif']),
      lat_dec: _embeddedEscuelasFirst_(row, ['LAT_DEC', 'lat_dec']),
      lng_dec: _embeddedEscuelasFirst_(row, ['LNG_DEC', 'lng_dec'])
    };
  });

  CIALPA_EMBEDDED_ESCUELAS_PILOT_CACHE = map;
  return map;
}

function _embeddedEscuelasParseCsv_(rawCsv) {
  var csv = String(rawCsv || '').replace(/^\\uFEFF/, '').trim();
  if (!csv) return { headers: [], rows: [] };

  var firstLine = String(csv.split(/\\r?\\n/)[0] || '');
  var delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  var table = Utilities.parseCsv(csv, delimiter);
  if (!table || table.length < 2) return { headers: [], rows: [] };

  var headers = table[0].map(function(header) {
    return String(header || '').trim();
  });
  var rows = [];

  for (var i = 1; i < table.length; i++) {
    var values = table[i] || [];
    var hasData = values.some(function(value) {
      return String(value || '').trim() !== '';
    });
    if (!hasData) continue;

    var obj = {};
    headers.forEach(function(header, index) {
      if (!header) return;
      obj[header] = values[index] !== undefined ? values[index] : '';
    });
    obj.__embedded_csv_row = i + 1;
    rows.push(obj);
  }

  return { headers: headers, rows: rows };
}

function _embeddedEscuelasApplyPilot_(target, pilot) {
  target.en_muestra_piloto = 'true';
  target.muestra_piloto = 'piloto';
  target.orden_muestra_piloto = target.orden_muestra_piloto || pilot.orden_muestra_piloto || '';
  target.orden_visita = target.orden_visita || pilot.orden_muestra_piloto || '';
  target.prioridad_operativa = target.prioridad_operativa || 'piloto';
  target.ESTRATO = target.ESTRATO || pilot.estrato || '';
  target.GRUPO_MATRICULA = target.GRUPO_MATRICULA || pilot.grupo_matricula || '';
  target.MATRICULA = target.MATRICULA || pilot.matricula || '';
  target.AULAS_EST = target.AULAS_EST || pilot.aulas_est || '';
  target.FACTOR_EXP = target.FACTOR_EXP || pilot.factor_exp || '';
  target.VERIF = target.VERIF || pilot.verif || '';
  target.LAT_DEC = target.LAT_DEC || pilot.lat_dec || '';
  target.LNG_DEC = target.LNG_DEC || pilot.lng_dec || '';
}

function _embeddedEscuelasCode_(row) {
  return _embeddedEscuelasFirst_(row, [
    'codigo_local', 'CODIGO', 'codigo', 'Codigo', 'CODIGO_LOCAL',
    'Código del local escolar', 'Código de Local Escolar', 'Código Local Escolar',
    'CÃ³digo del local escolar', 'CÃ³digo de Local Escolar', 'CÃ³digo Local Escolar',
    'cod_local', 'COD_LOCAL', 'local_escolar_codigo'
  ]);
}

function _embeddedEscuelasFirst_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function _embeddedEscuelasKey_(value) {
  var text = String(value || '').trim();
  var digits = text.replace(/\\D+/g, '');
  return digits || text.toLowerCase();
}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const allCsv = readCsv(args.all, 'padron completo');
  const pilotCsv = readCsv(args.pilot, 'muestra piloto');
  const allRows = countRows(allCsv);
  const pilotRows = countRows(pilotCsv);
  const updatedAt = new Date().toISOString().slice(0, 10);
  const output = gasTemplate({ allCsv, pilotCsv, allRows, pilotRows, updatedAt });

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, output, 'utf8');
  console.log(`GAS generado: ${path.relative(repoRoot, args.output)}`);
  console.log(`Padron completo: ${allRows - 1} escuelas`);
  console.log(`Muestra piloto: ${pilotRows - 1} escuelas`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
