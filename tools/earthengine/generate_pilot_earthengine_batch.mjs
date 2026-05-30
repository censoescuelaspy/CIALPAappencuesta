#!/usr/bin/env node
/**
 * Generate a Google Earth Engine Code Editor script for the pilot school batch.
 *
 * The generated script contains operational coordinates, so the default output
 * stays under tools/earthengine/output/, which is ignored by git.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultWorklist = path.join(__dirname, 'output', 'pilot-schools-worklist.json');
const defaultOut = path.join(__dirname, 'output', 'cialpa_pilot_batch_earthengine.js');

function usage() {
  return `
Uso:
  node tools/earthengine/generate_pilot_earthengine_batch.mjs [opciones]

Opciones:
  --worklist=RUTA       JSON privado creado por build_pilot_imagery_worklist.mjs.
  --out=RUTA            Script Earth Engine generado. Default: tools/earthengine/output/cialpa_pilot_batch_earthengine.js
  --start=N             Indice inicial dentro de la lista privada. Default: 0.
  --limit=N             Cantidad de escuelas a exportar. Default: todas.
  --buffer=N            Radio en metros por escuela. Default: 500.
  --drive-folder=NOMBRE Carpeta Drive para exportaciones. Default: CIALPA_EE_PILOTO_ESCUELAS
  --prefix=TEXTO        Prefijo de archivos Drive. Default: CIALPA_PILOTO
  --start-date=AAAA-MM-DD  Fecha inicial NICFI. Default: 2024-01-01.
  --end-date=AAAA-MM-DD    Fecha final NICFI. Default: 2026-01-01.
  --help                Muestra esta ayuda.
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

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function slugify(value, fallback = 'ESCUELA') {
  const slug = normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

function js(value) {
  return JSON.stringify(value);
}

function normalizeSchool(row, index) {
  const code = normalizeText(row.code || row.codigo || row.codigo_local || row.id_escuela);
  const name = normalizeText(row.name || row.nombre || row.institucion);
  const lat = Number(row.lat ?? row.latitud);
  const lon = Number(row.lon ?? row.lng ?? row.longitud);
  if (!code || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Escuela invalida en posicion ${index + 1}: falta codigo o coordenadas.`);
  }
  return {
    order: Number(row.order || row.orden || index + 1),
    code,
    name,
    department: normalizeText(row.department || row.departamento),
    district: normalizeText(row.district || row.distrito),
    locality: normalizeText(row.locality || row.localidad),
    lat,
    lon,
    slug: slugify(`${code}_${name || 'ESCUELA'}`, code),
  };
}

function loadWorklist(filePath) {
  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '');
  const json = JSON.parse(text);
  const rows = Array.isArray(json) ? json : json.schools || json.escuelas || json.data || [];
  if (!rows.length) throw new Error(`La worklist no tiene escuelas: ${resolved}`);
  return rows.map(normalizeSchool);
}

function dateLabel(startDate, endDate) {
  const startYear = String(startDate).slice(0, 4) || 'START';
  const endYear = String(endDate).slice(0, 4) || 'END';
  return `${startYear}_${endYear}`;
}

function buildSchoolsJs(schools) {
  return schools.map(school => (
    '  {' +
    ` order: ${Number.isFinite(school.order) ? school.order : 0},` +
    ` code: ${js(school.code)},` +
    ` name: ${js(school.name)},` +
    ` department: ${js(school.department)},` +
    ` district: ${js(school.district)},` +
    ` locality: ${js(school.locality)},` +
    ` lat: ${school.lat},` +
    ` lon: ${school.lon},` +
    ` slug: ${js(school.slug)}` +
    ' }'
  )).join(',\n');
}

function buildEarthEngineScript(schools, options) {
  const startDate = normalizeText(options['start-date'] || '2024-01-01');
  const endDate = normalizeText(options['end-date'] || '2026-01-01');
  const label = dateLabel(startDate, endDate);
  const start = Math.max(0, normalizeNumber(options.start, 0));
  const limit = Math.max(0, normalizeNumber(options.limit, 0));
  const bufferMeters = Math.max(1, normalizeNumber(options.buffer, 500));
  const driveFolder = normalizeText(options['drive-folder'] || 'CIALPA_EE_PILOTO_ESCUELAS');
  const exportPrefix = normalizeText(options.prefix || 'CIALPA_PILOTO');

  return `// CIALPA - Exportacion por lote de imagenes para escuelas piloto.
// Generado por tools/earthengine/generate_pilot_earthengine_batch.mjs.
// Ejecutar en Google Earth Engine Code Editor.
// IMPORTANTE: este archivo contiene coordenadas operativas; no subir a git.
//
// El fondo SATELLITE de Google que se ve en Earth Engine NO es exportable.
// Este script exporta solo datasets Earth Engine, aqui NICFI/Planet.

var SCHOOLS = [
${buildSchoolsJs(schools)}
];

var BUFFER_METERS = ${bufferMeters};
var DRIVE_FOLDER = ${js(driveFolder)};
var EXPORT_PREFIX = ${js(exportPrefix)};
var EXPORT_START_INDEX = ${start};
var EXPORT_LIMIT = ${limit}; // 0 = todas las escuelas restantes.
var PREVIEW_COUNT = 3;
var NICFI_START_DATE = ${js(startDate)};
var NICFI_END_DATE = ${js(endDate)};
var EXPORT_SCALE_METERS = 4.77;
var NICFI_VIS = { bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4 };

var endIndex = EXPORT_LIMIT > 0
  ? Math.min(SCHOOLS.length, EXPORT_START_INDEX + EXPORT_LIMIT)
  : SCHOOLS.length;
var selectedSchools = SCHOOLS.slice(EXPORT_START_INDEX, endIndex);

print('CIALPA escuelas totales en archivo', SCHOOLS.length);
print('CIALPA escuelas seleccionadas para export', selectedSchools.length);
print('Rango de indices', EXPORT_START_INDEX, endIndex - 1);
print('Carpeta Drive destino', DRIVE_FOLDER);
print('Aviso', 'Iniciar las tareas desde la pestana Tasks. Para lotes grandes conviene usar EXPORT_START_INDEX/EXPORT_LIMIT.');

Map.setOptions('SATELLITE');

var nicfiBase = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
  .filterDate(NICFI_START_DATE, NICFI_END_DATE)
  .sort('system:time_start', false);

var selectedFeatures = ee.FeatureCollection(selectedSchools.map(function(school) {
  return ee.Feature(ee.Geometry.Point([school.lon, school.lat]), {
    code: school.code,
    name: school.name,
    order: school.order
  });
}));

Map.addLayer(selectedFeatures, { color: 'red' }, 'Escuelas seleccionadas');

if (selectedSchools.length > 0) {
  Map.centerObject(ee.Geometry.Point([selectedSchools[0].lon, selectedSchools[0].lat]), 17);
}

selectedSchools.forEach(function(school, localIndex) {
  var point = ee.Geometry.Point([school.lon, school.lat]);
  var roi = point.buffer(BUFFER_METERS).bounds();
  var nicfi = nicfiBase.filterBounds(roi);
  var latest = ee.Image(nicfi.first()).clip(roi);
  var rgb = latest.select(['R', 'G', 'B']);
  var exportName = EXPORT_PREFIX + '_' + school.order + '_' + school.code + '_' + school.slug + '_NICFI_RGB_${label}';

  if (localIndex < PREVIEW_COUNT) {
    var roiOutline = ee.Image().byte().paint({
      featureCollection: ee.FeatureCollection([ee.Feature(roi)]),
      color: 1,
      width: 2
    });
    Map.addLayer(roiOutline, { palette: ['yellow'] }, 'ROI ' + school.code, false);
    Map.addLayer(latest, NICFI_VIS, 'NICFI preview ' + school.code, localIndex === 0);
    print('NICFI cantidad imagenes ' + school.code, nicfi.size());
  }

  Export.image.toDrive({
    image: rgb,
    description: exportName,
    folder: DRIVE_FOLDER,
    fileNamePrefix: exportName,
    region: roi,
    scale: EXPORT_SCALE_METERS,
    maxPixels: 1e9,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });
});
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const worklistPath = path.resolve(args.worklist || defaultWorklist);
  const schools = loadWorklist(worklistPath);
  const script = buildEarthEngineScript(schools, args);
  const outPath = path.resolve(args.out || defaultOut);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, script, 'utf8');
  console.log(`Escuelas incluidas: ${schools.length}`);
  console.log(`Script Earth Engine privado: ${path.relative(repoRoot, outPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
