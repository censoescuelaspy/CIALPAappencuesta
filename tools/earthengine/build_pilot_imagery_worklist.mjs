#!/usr/bin/env node
/**
 * Build a private worklist of pilot schools for imagery exports.
 *
 * The default output goes to tools/earthengine/output/, which is intentionally
 * ignored by git because it can contain protected operational coordinates.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultOut = path.join(__dirname, 'output', 'pilot-schools-worklist.json');

function usage() {
  return `
Uso:
  node tools/earthengine/build_pilot_imagery_worklist.mjs [opciones]

Opciones:
  --input=RUTA       CSV/JSON privado ya exportado con escuelas y coordenadas.
  --out=RUTA         Salida JSON. Default: tools/earthengine/output/pilot-schools-worklist.json
  --gas-url=URL      Deployment Apps Script. Default: APP_CONFIG.GAS_URL.
  --token=TOKEN      Token de sesion CIALPA. Tambien CIALPA_API_TOKEN/CIALPA_TOKEN.
  --user=USUARIO     Usuario para login. Tambien CIALPA_USER.
  --password=CLAVE   Clave para login. Tambien CIALPA_PASSWORD.
  --limit=N          Limita cantidad para ensayos.
  --help             Muestra esta ayuda.

Ejemplos:
  $env:CIALPA_USER='usuario'
  $env:CIALPA_PASSWORD='clave'
  node tools/earthengine/build_pilot_imagery_worklist.mjs

  $env:CIALPA_API_TOKEN='token-de-sesion'
  node tools/earthengine/build_pilot_imagery_worklist.mjs

  node tools/earthengine/build_pilot_imagery_worklist.mjs --input="C:\\privado\\muestra_piloto.csv"
`.trim();
}

function parseArgs(argv) {
  const args = {};
  argv.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      args[key] = rest.length ? rest.join('=') : true;
    }
  });
  return args;
}

function readAppGasUrl() {
  const configPath = path.join(repoRoot, 'assets', 'js', 'config.js');
  const text = fs.readFileSync(configPath, 'utf8');
  const match = text.match(/GAS_URL:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : '';
}

function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find(item => item.trim()) || '';
  const candidates = ['\t', ';', ','];
  let best = ',';
  let bestCount = -1;
  candidates.forEach(candidate => {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  });
  return best;
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(value);
      value = '';
    } else if (ch === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (ch !== '\r') {
      value += ch;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = (rows.shift() || []).map(item => item.trim());
  return rows
    .filter(values => values.some(item => String(item || '').trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function pick(row, keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return '';
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function parseCoordinate(value, positiveLetters = ['N', 'E'], negativeLetters = ['S', 'W', 'O']) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const normalized = raw
    .toUpperCase()
    .replace(/\u2212/g, '-')
    .replace(/,/g, '.')
    .trim();
  const compact = normalized.replace(/\s+/g, '');
  const decimal = Number(normalized.replace(/[^0-9.+-]/g, ''));

  if (Number.isFinite(decimal) && /^-?\d+(\.\d+)?[NSEOW]?$/.test(compact)) {
    return decimal;
  }

  const parts = normalized.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!parts.length) return null;

  const signFromLetter = negativeLetters.some(letter => normalized.includes(letter))
    ? -1
    : positiveLetters.some(letter => normalized.includes(letter))
      ? 1
      : (parts[0] < 0 ? -1 : 1);
  const deg = Math.abs(parts[0]);
  const min = Math.abs(parts[1] || 0);
  const sec = Math.abs(parts[2] || 0);
  return signFromLetter * (deg + min / 60 + sec / 3600);
}

function normalizeSchool(row, index = 0) {
  const obj = Array.isArray(row)
    ? {
      codigo_local: row[0],
      nombre: row[1],
      departamento: row[2],
      distrito: row[3],
      localidad: row[4],
      id_escuela: row[5],
    }
    : row;
  const rawCode = pick(obj, [
    'codigo_local',
    'CODIGO',
    'codigo',
    'CODIGO_LOCAL',
    'Codigo Local Escolar',
    'Codigo de Local Escolar',
    'local_escolar_codigo',
    'id_escuela',
  ]);
  const numericCode = normalizeText(rawCode).replace(/\D+/g, '');
  const lat = parseCoordinate(pick(obj, [
    'latitud',
    'lat',
    'LAT_DEC',
    'lat_dec',
    'Latitud',
    'Y',
    'y',
    'latitude',
  ]), ['N'], ['S']);
  const lon = parseCoordinate(pick(obj, [
    'longitud',
    'lng',
    'lon',
    'LNG_DEC',
    'lng_dec',
    'Longitud',
    'X',
    'x',
    'longitude',
  ]), ['E'], ['W', 'O']);

  return {
    order: Number(pick(obj, ['orden_muestra_piloto', 'orden_visita', 'ENUMERA', 'orden']) || index + 1),
    code: numericCode || normalizeText(rawCode),
    name: normalizeText(pick(obj, ['nombre', 'nombre_escuela', 'institucion', 'NOMBRE_INSTITUCION', 'Nombre'])),
    department: normalizeText(pick(obj, ['departamento', 'DEPARTAMENTO', 'Departamento'])),
    district: normalizeText(pick(obj, ['distrito', 'DISTRITO', 'Distrito'])),
    locality: normalizeText(pick(obj, ['localidad', 'LOCALIDAD', 'Localidad'])),
    lat,
    lon,
  };
}

function loadInput(filePath) {
  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '');
  if (/\.json$/i.test(resolved)) {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
    return json.schools || json.escuelas || json.data || [];
  }
  return parseCsv(text);
}

function parseJsonPayload(text, context) {
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(`${context} no devolvio JSON valido. Respuesta: ${preview}`);
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return parseJsonPayload(text, 'Apps Script POST');
}

async function fetchJson(url) {
  const response = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return parseJsonPayload(text, 'Apps Script GET');
}

async function getToken(gasUrl, args) {
  const token = normalizeText(args.token || process.env.CIALPA_API_TOKEN || process.env.CIALPA_TOKEN);
  if (token) return token;

  const usuario = normalizeText(args.user || args.usuario || process.env.CIALPA_USER);
  const password = normalizeText(args.password || process.env.CIALPA_PASSWORD);
  if (!usuario || !password) return '';

  const result = await postJson(gasUrl, { action: 'login', usuario, password });
  const resultToken = result && result.data && result.data.token;
  if (result.status !== 'ok' || !resultToken) {
    throw new Error(result.message || 'No se pudo iniciar sesion en CIALPA.');
  }
  return resultToken;
}

async function loadFromGas(args) {
  const gasUrl = normalizeText(args['gas-url'] || process.env.CIALPA_GAS_URL || readAppGasUrl());
  if (!gasUrl) throw new Error('No se encontro GAS_URL. Use --gas-url=URL.');

  const token = await getToken(gasUrl, args);
  if (!token) {
    throw new Error('Falta token o credenciales. Use CIALPA_API_TOKEN o CIALPA_USER/CIALPA_PASSWORD.');
  }

  const params = new URLSearchParams({
    action: 'getEscuelas',
    muestra_piloto: 'true',
    orden: 'piloto',
    token,
  });
  const result = await fetchJson(`${gasUrl}?${params.toString()}`);
  if (result.status !== 'ok') throw new Error(result.message || 'No se pudo leer getEscuelas.');
  return result.data || [];
}

function buildPayload(rows, args) {
  const limit = Number(args.limit || 0);
  const normalized = rows.map(normalizeSchool)
    .filter(item => item.code || item.name)
    .sort((a, b) => (Number(a.order) || 999999) - (Number(b.order) || 999999));
  const withCoords = normalized.filter(item =>
    Number.isFinite(item.lat)
    && Number.isFinite(item.lon)
    && Math.abs(item.lat) <= 90
    && Math.abs(item.lon) <= 180
  );
  const schools = limit > 0 ? withCoords.slice(0, limit) : withCoords;
  return {
    schema: 'cialpa_pilot_imagery_worklist_v1',
    generatedAt: new Date().toISOString(),
    source: args.input ? 'local_input' : 'cialpa_gas_getEscuelas',
    totalRows: normalized.length,
    totalWithCoords: withCoords.length,
    count: schools.length,
    schools,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const rows = args.input ? loadInput(args.input) : await loadFromGas(args);
  const payload = buildPayload(rows, args);
  if (!payload.count) {
    throw new Error('No se encontraron escuelas con coordenadas validas.');
  }

  const outPath = path.resolve(args.out || defaultOut);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Escuelas con coordenadas: ${payload.count}/${payload.totalRows}`);
  console.log(`Worklist privado: ${path.relative(repoRoot, outPath)}`);
}

main().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
