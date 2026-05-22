#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_PILOT = 'tools/simulation/lista_oficial_escuelas_2025_muestra_piloto_def.csv';
const DEFAULT_ALL = 'tools/simulation/lista_oficial_escuelas_2025_listado_ini.csv';
const DEFAULT_OUTPUT_DIR = 'tools/location-audit/output';
const DEFAULT_LIMIT = 10;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_DELAY_MS = 1200;

function parseArgs(argv) {
  const args = {
    source: 'pilot',
    pilot: DEFAULT_PILOT,
    input: DEFAULT_ALL,
    outputDir: DEFAULT_OUTPUT_DIR,
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    provider: 'osm',
    sample: 'spread',
    userAgent: process.env.CIALPA_LOCATION_AUDIT_USER_AGENT || 'CIALPA location audit / contact: censoescuelaspy@gmail.com',
    help: false,
  };

  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') {
      args.help = true;
    } else if (raw.startsWith('--source=')) {
      args.source = valueOf(raw);
    } else if (raw.startsWith('--pilot=')) {
      args.pilot = valueOf(raw);
    } else if (raw.startsWith('--input=')) {
      args.input = valueOf(raw);
    } else if (raw.startsWith('--output-dir=')) {
      args.outputDir = valueOf(raw);
    } else if (raw.startsWith('--limit=')) {
      args.limit = positiveInt(valueOf(raw), DEFAULT_LIMIT);
    } else if (raw.startsWith('--delay-ms=')) {
      args.delayMs = positiveInt(valueOf(raw), DEFAULT_DELAY_MS);
    } else if (raw.startsWith('--timeout-ms=')) {
      args.timeoutMs = positiveInt(valueOf(raw), DEFAULT_TIMEOUT_MS);
    } else if (raw.startsWith('--provider=')) {
      args.provider = valueOf(raw);
    } else if (raw.startsWith('--sample=')) {
      args.sample = valueOf(raw);
    } else if (raw.startsWith('--user-agent=')) {
      args.userAgent = valueOf(raw);
    } else {
      throw new Error(`Argumento no reconocido: ${raw}`);
    }
  }

  if (!['pilot', 'all'].includes(args.source)) {
    throw new Error('--source debe ser pilot o all.');
  }
  if (!['osm', 'nominatim', 'overpass', 'none'].includes(args.provider)) {
    throw new Error('--provider debe ser osm, nominatim, overpass o none.');
  }
  if (!['spread', 'first'].includes(args.sample)) {
    throw new Error('--sample debe ser spread o first.');
  }
  return args;
}

function valueOf(raw) {
  return raw.split('=').slice(1).join('=');
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function printHelp() {
  console.log(`
CIALPA location audit

Uso:
  node tools/location-audit/verify_school_locations.mjs --limit=10

Opciones:
  --source=pilot|all       Fuente local. Default: pilot
  --pilot=RUTA             CSV de muestra piloto. Default: ${DEFAULT_PILOT}
  --input=RUTA             CSV del padron completo. Default: ${DEFAULT_ALL}
  --output-dir=RUTA        Carpeta de salida ignorada por Git. Default: ${DEFAULT_OUTPUT_DIR}
  --limit=N                Cantidad de escuelas. Default: 10
  --provider=osm|nominatim|overpass|none Referencia externa. Default: osm
  --sample=spread|first    Distribucion de muestra. Default: spread

Notas:
  - No descarga ni guarda fotos de Street View.
  - Genera enlaces para revisar Google Maps/Street View en vivo.
  - Nominatim/OpenStreetMap se usa con espera entre consultas para no abusar del servicio.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const schools = await loadSchools(args);
  const selected = selectSample(schools, args.limit, args.sample);
  const records = [];
  const startedAt = new Date();

  for (let index = 0; index < selected.length; index++) {
    const school = selected[index];
    const lookup = await lookupExternal(school, args);
    const best = pickBestCandidate(school, lookup.candidates);
    const assessment = assessCandidate(school, best);
    records.push(buildRecord(school, lookup, best, assessment, index + 1));
    if (args.provider === 'nominatim' && index < selected.length - 1) {
      await sleep(args.delayMs);
    }
  }

  await writeOutputs(records, args, startedAt);
}

async function loadSchools(args) {
  const sourcePath = args.source === 'pilot' ? args.pilot : args.input;
  if (!existsSync(sourcePath)) {
    throw new Error(`No existe el CSV de entrada: ${sourcePath}`);
  }
  const text = await readFile(sourcePath, 'utf8');
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const [rawHeaders, ...body] = rows;
  const headers = rawHeaders.map(header => normalizeKey(fixMojibake(header)));
  const schools = body
    .map(row => objectFromRow(headers, row))
    .map(args.source === 'pilot' ? normalizePilotSchool : normalizeOfficialSchool)
    .filter(school => school.codigo_local && school.nombre && isParaguayCoord(school.latitud, school.longitud));

  if (!schools.length) {
    throw new Error(`No se encontraron escuelas con coordenadas validas en ${sourcePath}`);
  }
  return schools;
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
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
    } else if (c === delimiter) {
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

function detectDelimiter(text) {
  const firstLine = String(text.split(/\r?\n/)[0] || '');
  return firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
}

function objectFromRow(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    if (!header) return;
    obj[header] = fixMojibake(row[index] ?? '').trim();
  });
  return obj;
}

function normalizePilotSchool(row) {
  return {
    source: 'muestra_piloto_def',
    codigo_local: text(row.codigo),
    nombre: text(row.nombre),
    departamento: text(row.depto),
    distrito: text(row.dist),
    localidad: text(row.localidad),
    zona: text(row.zona),
    matricula: numeric(row.matricula),
    latitud: coordinate(row.lat_dec, 'lat'),
    longitud: coordinate(row.lng_dec, 'lng'),
  };
}

function normalizeOfficialSchool(row) {
  return {
    source: 'listado_ini',
    codigo_local: text(row.codigo_del_local_escolar),
    nombre: text(row.nombre_del_local_escolar),
    departamento: text(row.departamento),
    distrito: text(row.distrito),
    localidad: text(row.localidad),
    zona: text(row.zona),
    matricula: numeric(row.matricula_del_local_escolar || row.cantidad_matricula),
    latitud: coordinate(row.latitud || row.lat_corr, 'lat'),
    longitud: coordinate(row.longitud || row.long_corr, 'lng'),
  };
}

function normalizeKey(value) {
  return removeDiacritics(String(value || '').trim().toLowerCase())
    .replace(/\(\*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function fixMojibake(value) {
  const textValue = String(value ?? '');
  if (!/[ÃÂ]/.test(textValue)) return textValue;
  try {
    const fixed = Buffer.from(textValue, 'latin1').toString('utf8');
    return fixed.includes('\uFFFD') ? textValue : fixed;
  } catch {
    return textValue;
  }
}

function removeDiacritics(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function selectSample(schools, limit, mode) {
  const sorted = [...schools].sort((a, b) =>
    a.departamento.localeCompare(b.departamento, 'es') ||
    a.distrito.localeCompare(b.distrito, 'es') ||
    a.codigo_local.localeCompare(b.codigo_local, 'es')
  );
  if (mode === 'first') return sorted.slice(0, limit);

  const groups = new Map();
  for (const school of sorted) {
    const key = `${school.departamento}|${school.distrito}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(school);
  }
  const output = [];
  const groupList = [...groups.values()];
  const target = Math.min(limit, sorted.length);
  const usedGroups = new Set();
  for (let i = 0; output.length < target && i < groupList.length; i++) {
    const groupIndex = Math.min(groupList.length - 1, Math.floor((i * groupList.length) / target));
    if (usedGroups.has(groupIndex)) continue;
    usedGroups.add(groupIndex);
    const candidate = groupList[groupIndex].shift();
    if (candidate) output.push(candidate);
  }
  let cursor = 0;
  while (output.length < target && cursor < groupList.length * 2) {
    const group = groupList[cursor % groupList.length];
    const candidate = group.shift();
    if (candidate) output.push(candidate);
    cursor++;
  }
  return output;
}

async function lookupNominatim(school, args) {
  const queries = buildQueries(school);
  const candidates = [];
  let usedQuery = '';
  let lastError = '';

  for (const query of queries) {
    usedQuery = query;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'py');
    url.searchParams.set('q', query);
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': args.userAgent,
          'Accept': 'application/json',
        },
      }, args.timeoutMs);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const json = await res.json();
      if (Array.isArray(json) && json.length) {
        candidates.push(...json.map(item => normalizeNominatimCandidate(item, query)));
        break;
      }
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await sleep(Math.min(args.delayMs, 1000));
  }

  return {
    provider: 'nominatim',
    query: usedQuery,
    queries,
    candidates,
    error: lastError,
  };
}

async function lookupOverpass(school, args) {
  const query = buildOverpassQuery(school, 650);
  const candidates = [];
  let lastError = '';
  try {
    const res = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'User-Agent': args.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `data=${encodeURIComponent(query)}`,
    }, Math.max(args.timeoutMs, 30000));
    if (!res.ok) {
      lastError = `HTTP ${res.status}`;
    } else {
      const json = await res.json();
      const elements = Array.isArray(json?.elements) ? json.elements : [];
      candidates.push(...elements.map(item => normalizeOverpassCandidate(item, query)).filter(Boolean));
    }
  } catch (error) {
    lastError = error?.message || String(error);
  }
  return {
    provider: 'overpass',
    query: `amenity school/college/kindergarten around 650m @ ${school.latitud},${school.longitud}`,
    queries: [query],
    candidates,
    error: lastError,
  };
}

async function lookupExternal(school, args) {
  if (args.provider === 'none') return { provider: 'none', candidates: [], query: '' };
  if (args.provider === 'nominatim') return lookupNominatim(school, args);
  if (args.provider === 'overpass') return lookupOverpass(school, args);

  const nominatim = await lookupNominatim(school, args);
  if (nominatim.candidates.length) {
    return { ...nominatim, provider: 'osm:nominatim' };
  }
  await sleep(Math.min(args.delayMs, 1000));
  const overpass = await lookupOverpass(school, args);
  return {
    provider: 'osm:overpass',
    query: overpass.query,
    queries: [...(nominatim.queries || []), ...(overpass.queries || [])],
    candidates: overpass.candidates,
    error: [nominatim.error, overpass.error].filter(Boolean).join(' | '),
  };
}

function buildQueries(school) {
  const cleanName = school.nombre.replace(/\b(ESC\.?|ESCUELA BASICA|ESCUELA BÁSICA|COLEGIO NACIONAL|CENTRO EDUCATIVO)\b/gi, '').trim();
  return [
    `${school.nombre}, ${school.distrito}, Paraguay`,
    `${school.nombre}, ${school.localidad}, ${school.departamento}, Paraguay`,
    `${cleanName || school.nombre}, ${school.distrito}, Paraguay`,
  ].filter((value, index, list) => value && list.indexOf(value) === index);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeNominatimCandidate(item, query) {
  return {
    provider: 'nominatim',
    query,
    display_name: text(item.display_name),
    osm_type: text(item.osm_type),
    osm_id: text(item.osm_id),
    class: text(item.class),
    type: text(item.type),
    importance: numeric(item.importance),
    latitud: coordinate(item.lat, 'lat'),
    longitud: coordinate(item.lon, 'lng'),
  };
}

function buildOverpassQuery(school, radiusMeters) {
  const lat = Number(school.latitud);
  const lng = Number(school.longitud);
  return `[out:json][timeout:25];
(
  node(around:${radiusMeters},${lat},${lng})["amenity"~"^(school|college|kindergarten)$"];
  way(around:${radiusMeters},${lat},${lng})["amenity"~"^(school|college|kindergarten)$"];
  relation(around:${radiusMeters},${lat},${lng})["amenity"~"^(school|college|kindergarten)$"];
);
out center tags;`;
}

function normalizeOverpassCandidate(item, query) {
  const lat = Number(item.lat ?? item.center?.lat);
  const lng = Number(item.lon ?? item.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const tags = item.tags || {};
  const name = text(tags.name || tags['official_name'] || tags['alt_name'] || `OSM ${item.type}/${item.id}`);
  return {
    provider: 'overpass',
    query,
    display_name: name,
    osm_type: text(item.type),
    osm_id: text(item.id),
    class: 'amenity',
    type: text(tags.amenity || 'school'),
    importance: 0.5,
    latitud: coordinate(lat, 'lat'),
    longitud: coordinate(lng, 'lng'),
  };
}

function pickBestCandidate(school, candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  return candidates
    .map(candidate => {
      const distance = distanceMeters(school.latitud, school.longitud, candidate.latitud, candidate.longitud);
      const nameScore = nameSimilarity(school.nombre, candidate.display_name);
      const typeScore = /school|college|university|education|kindergarten/i.test(`${candidate.class} ${candidate.type} ${candidate.display_name}`) ? 0.2 : 0;
      const score = (Number(candidate.importance || 0) * 0.2) + (nameScore * 0.55) + typeScore - Math.min(distance / 20000, 0.45);
      return { ...candidate, distance_m: Math.round(distance), name_score: round(nameScore, 3), score: round(score, 3) };
    })
    .sort((a, b) => b.score - a.score || a.distance_m - b.distance_m)[0];
}

function assessCandidate(school, candidate) {
  if (!candidate) {
    return {
      confidence: 'sin_candidato',
      recommendation: 'Revisar manualmente en Google Maps/OSM y confirmar en campo.',
    };
  }
  const distance = Number(candidate.distance_m || 0);
  const nameScore = Number(candidate.name_score || 0);
  const isMappedSchool = candidate.provider === 'overpass' && /school|college|kindergarten/i.test(candidate.type || '');
  if (distance <= 150 && (nameScore >= 0.25 || isMappedSchool)) {
    return {
      confidence: nameScore >= 0.25 ? 'alta' : 'media',
      recommendation: nameScore >= 0.25
        ? 'Coordenada compatible con escuela mapeada; usar para ajustar base mapa.'
        : 'Hay escuela mapeada muy cerca; revisar nombre antes de reemplazar coordenada.',
    };
  }
  if (distance <= 250 && nameScore >= 0.35) {
    return {
      confidence: 'alta',
      recommendation: 'La coordenada del padron es compatible; usar para ajustar base mapa.',
    };
  }
  if (distance <= 1000 && nameScore >= 0.25) {
    return {
      confidence: 'media',
      recommendation: 'Revisar visualmente antes de reemplazar coordenada.',
    };
  }
  return {
    confidence: 'baja',
    recommendation: 'No reemplazar automaticamente; validar con Street View, mapa y/o foto de campo.',
  };
}

function buildRecord(school, lookup, best, assessment, index) {
  return {
    index,
    codigo_local: school.codigo_local,
    nombre: school.nombre,
    departamento: school.departamento,
    distrito: school.distrito,
    localidad: school.localidad,
    zona: school.zona,
    source: school.source,
    padron_lat: school.latitud,
    padron_lng: school.longitud,
    provider: lookup.provider,
    query: lookup.query,
    candidate_name: best?.display_name || '',
    candidate_lat: best?.latitud || '',
    candidate_lng: best?.longitud || '',
    candidate_distance_m: best?.distance_m ?? '',
    candidate_name_score: best?.name_score ?? '',
    confidence: assessment.confidence,
    recommendation: assessment.recommendation,
    lookup_error: lookup.error || '',
    maps_url: googleMapsUrl(school.latitud, school.longitud, school.nombre),
    street_view_url: googleStreetViewUrl(school.latitud, school.longitud),
    candidate_maps_url: best ? googleMapsUrl(best.latitud, best.longitud, school.nombre) : '',
  };
}

async function writeOutputs(records, args, startedAt) {
  await mkdir(args.outputDir, { recursive: true });
  const stamp = compactTimestamp(startedAt);
  const base = path.join(args.outputDir, `location-audit-${stamp}`);
  const meta = {
    generated_at: startedAt.toISOString(),
    source: args.source,
    provider: args.provider,
    count: records.length,
    note: 'No se descargan ni guardan imagenes de Google Street View; solo enlaces de revision.',
  };
  await writeFile(`${base}.json`, JSON.stringify({ meta, records }, null, 2), 'utf8');
  await writeFile(`${base}.csv`, toCsv(records), 'utf8');
  await writeFile(`${base}.md`, toMarkdown(records, meta), 'utf8');
  await writeFile(path.join(args.outputDir, 'location-audit-latest.md'), toMarkdown(records, meta), 'utf8');
  console.log(`Auditoria generada:`);
  console.log(`- ${path.relative(process.cwd(), `${base}.json`)}`);
  console.log(`- ${path.relative(process.cwd(), `${base}.csv`)}`);
  console.log(`- ${path.relative(process.cwd(), `${base}.md`)}`);
}

function toCsv(records) {
  const headers = [
    'index', 'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona',
    'padron_lat', 'padron_lng', 'provider', 'query', 'candidate_name', 'candidate_lat',
    'candidate_lng', 'candidate_distance_m', 'candidate_name_score', 'confidence',
    'recommendation', 'maps_url', 'street_view_url', 'candidate_maps_url', 'lookup_error',
  ];
  const lines = [headers.join(',')];
  for (const row of records) {
    lines.push(headers.map(header => csvCell(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function toMarkdown(records, meta) {
  const counts = records.reduce((acc, row) => {
    acc[row.confidence] = (acc[row.confidence] || 0) + 1;
    return acc;
  }, {});
  const rows = records.map(row => {
    const distance = row.candidate_distance_m === '' || row.candidate_distance_m === undefined || row.candidate_distance_m === null
      ? 's/c'
      : row.candidate_distance_m;
    return `| ${row.index} | ${escapeMd(row.codigo_local)} | ${escapeMd(row.nombre)} | ${escapeMd(row.departamento)} | ${escapeMd(row.distrito)} | ${distance} | ${escapeMd(row.confidence)} | ${escapeMd(row.recommendation)} |`;
  }).join('\n');
  return `# Auditoria de ubicacion CIALPA

Generado: ${meta.generated_at}

Fuente: ${meta.source}
Proveedor externo: ${meta.provider}
Escuelas revisadas: ${meta.count}

Nota: no se descargan ni guardan imagenes de Google Street View. El reporte incluye enlaces de revision en vivo.

## Resumen

- Alta: ${counts.alta || 0}
- Media: ${counts.media || 0}
- Baja: ${counts.baja || 0}
- Sin candidato: ${counts.sin_candidato || 0}

## Muestra

| # | Codigo | Escuela | Departamento | Distrito | Distancia m | Confianza | Recomendacion |
|---|---|---|---|---|---:|---|---|
${rows}
`;
}

function csvCell(value) {
  const textValue = String(value ?? '');
  if (!/[",\n\r]/.test(textValue)) return textValue;
  return `"${textValue.replace(/"/g, '""')}"`;
}

function escapeMd(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function text(value) {
  return String(value ?? '').trim();
}

function numeric(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function coordinate(value, axis) {
  const raw = text(value);
  if (!raw) return '';
  const dms = parseDms(raw);
  const parsed = Number.isFinite(dms) ? dms : numeric(raw);
  if (!Number.isFinite(parsed) || parsed === 0) return '';
  const abs = Math.abs(parsed);
  if (axis === 'lat') return parsed > 0 ? -abs : parsed;
  if (axis === 'lng') return parsed > 0 ? -abs : parsed;
  return parsed;
}

function parseDms(value) {
  const raw = String(value || '').replace(/,/g, '.');
  const parts = raw.match(/(\d+(?:\.\d+)?)/g);
  if (!parts || parts.length < 2) return NaN;
  const deg = Number(parts[0]);
  const min = Number(parts[1] || 0);
  const sec = Number(parts[2] || 0);
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return NaN;
  return deg + (min / 60) + (sec / 3600);
}

function isParaguayCoord(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    && Number(lat) <= -19 && Number(lat) >= -28
    && Number(lng) <= -54 && Number(lng) >= -63;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const r = 6371008.8;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lng2 - lng1);
  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value) {
  return Number(value || 0) * Math.PI / 180;
}

function nameSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) {
    if (right.has(token)) hits++;
  }
  return hits / Math.max(left.size, 1);
}

function tokenSet(value) {
  const stop = new Set(['escuela', 'basica', 'basica', 'nacional', 'colegio', 'centro', 'educativo', 'n', 'no', 'de', 'del', 'la', 'el', 'san', 'santa']);
  return new Set(removeDiacritics(String(value || '').toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stop.has(token)));
}

function googleMapsUrl(lat, lng, label) {
  const query = encodeURIComponent(`${lat},${lng} ${label || ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function googleStreetViewUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${lat},${lng}`)}`;
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

main().catch(error => {
  console.error(`[location-audit] ${error.message || error}`);
  process.exit(1);
});
