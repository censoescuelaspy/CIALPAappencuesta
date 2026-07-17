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
  --limit=N             Cantidad de escuelas del lote. Default: 25.
  --buffer=N            Radio en metros por escuela. Default: 100.
  --source=FUENTE       nicfi (4.77 m) o s2 (10 m). Default: nicfi.
  --create-tasks=BOOL   true crea tareas tras el preflight. Default: true.
  --drive-folder=NOMBRE Carpeta Drive para exportaciones. Default: CIALPA_EE_PILOTO_ESCUELAS
  --prefix=TEXTO        Prefijo de archivos Drive. Default: CIALPA_PILOTO
  --start-date=AAAA-MM-DD  Fecha inicial NICFI. Default: 2024-01-01.
  --end-date=AAAA-MM-DD    Fecha final exclusiva. Default: manana.
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
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, char =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
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

function tomorrowIsoDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
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
  const endDate = normalizeText(options['end-date'] || tomorrowIsoDate());
  const label = dateLabel(startDate, endDate);
  const start = Math.max(0, normalizeNumber(options.start, 0));
  const limit = Math.max(0, normalizeNumber(options.limit, 25));
  const bufferMeters = Math.max(1, normalizeNumber(options.buffer, 100));
  const driveFolder = normalizeText(options['drive-folder'] || 'CIALPA_EE_PILOTO_ESCUELAS');
  const exportPrefix = normalizeText(options.prefix || 'CIALPA_PILOTO');
  const source = normalizeText(options.source || 'nicfi').toLowerCase();
  const createTasks = normalizeBoolean(options['create-tasks'], true);
  if (!['nicfi', 's2'].includes(source)) throw new Error(`Fuente no soportada: ${source}. Use nicfi o s2.`);

  const sourceConfig = source === 'nicfi'
    ? {
      label: 'NICFI',
      collection: "ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')\n  .filterDate(SOURCE_START_DATE, SOURCE_END_DATE)",
      image: "ee.Image(sourceCollection.filterBounds(roi).sort('system:time_start', false).first())\n    .select(['R', 'G', 'B'])\n    .clip(roi)",
      scale: 4.77,
      vis: "{ bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4 }",
      notice: 'NICFI requiere alta previa de Planet y permiso de lectura en Earth Engine.',
    }
    : {
      label: 'S2',
      collection: "ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')\n  .filterDate(SOURCE_START_DATE, SOURCE_END_DATE)\n  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))\n  .map(maskSentinel2Clouds)",
      image: "sourceCollection.filterBounds(roi).median()\n    .select(['B4', 'B3', 'B2'])\n    .clip(roi)",
      scale: 10,
      vis: "{ bands: ['B4', 'B3', 'B2'], min: 0, max: 3200, gamma: 1.2 }",
      notice: 'Sentinel-2 sirve para probar el flujo, pero 10 m/pixel no es alta resolucion arquitectonica.',
    };

  return `// CIALPA - Exportacion por lote de imagenes para escuelas piloto.
// Generado por tools/earthengine/generate_pilot_earthengine_batch.mjs.
// Ejecutar en Google Earth Engine Code Editor.
// IMPORTANTE: este archivo contiene coordenadas operativas; no subir a git.
//
// El fondo SATELLITE de Google que se ve en Earth Engine NO es exportable.
// Este script exporta una coleccion Earth Engine real: ${sourceConfig.label}.
// ${sourceConfig.notice}

var SCHOOLS = [
${buildSchoolsJs(schools)}
];

var BUFFER_METERS = ${bufferMeters};
var DRIVE_FOLDER = ${js(driveFolder)};
var EXPORT_PREFIX = ${js(exportPrefix)};
var EXPORT_START_INDEX = ${start};
var EXPORT_LIMIT = ${limit}; // Recomendado: 25 por lote; 0 = todas las restantes.
var CREATE_EXPORT_TASKS = ${createTasks};
var SOURCE_START_DATE = ${js(startDate)};
var SOURCE_END_DATE = ${js(endDate)};
var SOURCE_LABEL = ${js(sourceConfig.label)};
var EXPORT_SCALE_METERS = ${sourceConfig.scale};
var SOURCE_VIS = ${sourceConfig.vis};

var endIndex = EXPORT_LIMIT > 0
  ? Math.min(SCHOOLS.length, EXPORT_START_INDEX + EXPORT_LIMIT)
  : SCHOOLS.length;
var selectedSchools = SCHOOLS.slice(EXPORT_START_INDEX, endIndex);

print('CIALPA escuelas totales en archivo', SCHOOLS.length);
print('CIALPA escuelas seleccionadas para export', selectedSchools.length);
print('Rango de indices', EXPORT_START_INDEX, endIndex - 1);
print('Carpeta Drive destino', DRIVE_FOLDER);
print('Radio por escuela', BUFFER_METERS + ' m');
print('Fuente', SOURCE_LABEL + ' a ' + EXPORT_SCALE_METERS + ' m/pixel');
print('Aviso', 'Las tareas creadas se inician desde la pestana Tasks. Cambie EXPORT_START_INDEX para el siguiente lote.');

Map.setOptions('SATELLITE');

function maskSentinel2Clouds(image) {
  var scl = image.select('SCL');
  var keep = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));
  return image.updateMask(keep);
}

var sourceCollection = ${sourceConfig.collection};

var selectedFeatures = ee.FeatureCollection(selectedSchools.map(function(school) {
  return ee.Feature(ee.Geometry.Point([school.lon, school.lat]), {
    code: school.code,
    name: school.name,
    order: school.order
  });
}));

Map.addLayer(selectedFeatures, { color: 'red' }, 'Escuelas seleccionadas');

if (selectedSchools.length > 0) {
  Map.centerObject(ee.Geometry.Point([selectedSchools[0].lon, selectedSchools[0].lat]), 18);
}

function imageForSchool(school, roi) {
  return ${sourceConfig.image};
}

function createExportForSchool(school) {
  var point = ee.Geometry.Point([school.lon, school.lat]);
  var roi = point.buffer(BUFFER_METERS);
  var rgb = imageForSchool(school, roi);
  var exportName = EXPORT_PREFIX + '_' + school.order + '_' + school.code + '_' + school.slug + '_' + SOURCE_LABEL + '_RGB_${label}';

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
}

function showPreview(school) {
  var point = ee.Geometry.Point([school.lon, school.lat]);
  var roi = point.buffer(BUFFER_METERS);
  var outline = ee.Image().byte().paint({
    featureCollection: ee.FeatureCollection([ee.Feature(roi)]),
    color: 1,
    width: 2
  });
  Map.addLayer(imageForSchool(school, roi), SOURCE_VIS, SOURCE_LABEL + ' preview ' + school.code, true);
  Map.addLayer(outline, { palette: ['yellow'] }, 'Radio ' + BUFFER_METERS + ' m', true);
}

sourceCollection.size().evaluate(function(count, error) {
  if (error || !count) {
    print('ERROR DE ACCESO O COLECCION VACIA', error || 'No hay imagenes en el periodo.');
    print('No se creo ninguna tarea. Revise permisos, fechas y cuota del proyecto Earth Engine.');
    return;
  }
  print('Preflight correcto. Imagenes disponibles en la coleccion', count);
  if (selectedSchools.length) showPreview(selectedSchools[0]);
  if (!CREATE_EXPORT_TASKS) {
    print('Vista previa lista. Cambie CREATE_EXPORT_TASKS a true para crear el lote.');
    return;
  }
  selectedSchools.forEach(createExportForSchool);
  print('Tareas creadas', selectedSchools.length);
  print('Siguiente paso', 'Abra Tasks y pulse Run en cada tarea.');
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
