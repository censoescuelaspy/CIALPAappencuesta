// CIALPA - Exportacion por lote para imagenes de escuelas piloto.
// Ejecutar en Google Earth Engine Code Editor.
//
// IMPORTANTE:
// - El fondo SATELLITE de Google visible en Earth Engine NO es un ee.Image
//   exportable. Este script exporta NICFI/Planet, que si es exportable desde EE.
// - Para tener la nitidez de Google dentro de la app, usar la capa Google online
//   ya configurada en la app. No usar este script para descargar/cachar Google.
// - Si Earth Engine muestra "caller does not have access", falta habilitar
//   acceso Planet/NICFI en la cuenta.

// ---------------------------------------------------------------------------
// 1) PEGAR AQUI LAS ESCUELAS PILOTO
// ---------------------------------------------------------------------------
// Reemplazar esta lista por las casi 90 escuelas.
// Formato minimo:
// { order: 1, code: '1005052', name: 'NOMBRE', department: '...', district: '...',
//   locality: '...', lat: -25.123456, lon: -55.123456 }
//
// Si preferis subir un CSV como Asset de Earth Engine, dejar SCHOOLS vacio,
// poner USE_TABLE_ASSET = true y completar TABLE_ASSET_ID mas abajo.
var SCHOOLS = [
  {
    order: 1,
    code: '101095',
    name: 'ESCUELA BASICA N 2076',
    department: 'CONCEPCION',
    district: 'PASO BARRETO',
    locality: 'ISLA TUYU',
    lat: -23.08275777777778,
    lon: -56.94790999999999
  }
];

// ---------------------------------------------------------------------------
// 2) OPCION ALTERNATIVA: USAR TABLA ASSET EN EARTH ENGINE
// ---------------------------------------------------------------------------
// La tabla puede tener columnas code/codigo/codigo_local, name/nombre,
// lat/latitud/LAT_DEC y lon/lng/longitud/LNG_DEC, o geometria de punto.
var USE_TABLE_ASSET = false;
var TABLE_ASSET_ID = 'users/TU_USUARIO/cialpa_muestra_piloto_escuelas';

// ---------------------------------------------------------------------------
// 3) PARAMETROS DE EXPORTACION
// ---------------------------------------------------------------------------
var BUFFER_METERS = 650; // contexto amplio: predio, caminos y entorno.
var DRIVE_FOLDER = 'CIALPA_EE_PILOTO_ESCUELAS';
var EXPORT_PREFIX = 'CIALPA_PILOTO';
var EXPORT_START_INDEX = 0;
var EXPORT_LIMIT = 0; // 0 = todas las escuelas restantes.
var PREVIEW_COUNT = 3;

var NICFI_START_DATE = '2024-01-01';
var NICFI_END_DATE = '2026-01-01';
var EXPORT_SCALE_METERS = 4.77;
var EXPORT_RAW_RGB = true; // true recomendado para convertir luego a tiles.
var NICFI_VIS = { bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4 };

// Sentinel-2 queda solo como emergencia tecnica. Es de 10 m y no sirve para
// bloques finos. Mantener false salvo que se quiera probar el pipeline.
var EXPORT_SENTINEL2_FALLBACK = false;
var S2_START_DATE = '2024-01-01';
var S2_END_DATE = '2026-05-30';

// ---------------------------------------------------------------------------
// 4) HELPERS
// ---------------------------------------------------------------------------
function firstValue(obj, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var value = obj[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function numberValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  var parsed = parseFloat(String(value).replace(',', '.'));
  return isFinite(parsed) ? parsed : null;
}

function slug(value) {
  return String(value || 'ESCUELA')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'ESCUELA';
}

function normalizeSchool(item, index) {
  var row = item || {};
  var code = String(firstValue(row, ['code', 'codigo', 'codigo_local', 'CODIGO', 'CODIGO_LOCAL', 'id_escuela'])).replace(/\D+/g, '');
  var name = String(firstValue(row, ['name', 'nombre', 'institucion', 'NOMBRE_INSTITUCION']));
  var lat = numberValue(firstValue(row, ['lat', 'latitud', 'LAT_DEC', 'lat_dec', 'latitude', 'Y', 'y']));
  var lon = numberValue(firstValue(row, ['lon', 'lng', 'longitud', 'LNG_DEC', 'lng_dec', 'longitude', 'X', 'x']));

  return {
    order: numberValue(firstValue(row, ['order', 'orden', 'orden_muestra_piloto', 'orden_visita', 'ENUMERA'])) || (index + 1),
    code: code || String(index + 1),
    name: name || 'ESCUELA',
    department: String(firstValue(row, ['department', 'departamento', 'DEPARTAMENTO'])),
    district: String(firstValue(row, ['district', 'distrito', 'DISTRITO'])),
    locality: String(firstValue(row, ['locality', 'localidad', 'LOCALIDAD'])),
    lat: lat,
    lon: lon
  };
}

function featureToSchool(feature, index) {
  var props = feature.properties || {};
  var geometry = feature.geometry || {};
  var coords = geometry.coordinates || [];
  var row = {};
  for (var key in props) {
    row[key] = props[key];
  }
  if (coords.length >= 2) {
    row.lon = row.lon || row.lng || row.longitud || coords[0];
    row.lat = row.lat || row.latitud || coords[1];
  }
  return normalizeSchool(row, index);
}

function fileNameForSchool(school) {
  return [
    EXPORT_PREFIX,
    school.order,
    school.code,
    slug(school.name),
    'NICFI_RGB',
    NICFI_START_DATE.slice(0, 4) + '_' + NICFI_END_DATE.slice(0, 4)
  ].join('_').slice(0, 120);
}

function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var keep = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));
  return image.updateMask(keep);
}

// ---------------------------------------------------------------------------
// 5) EXPORTADOR PRINCIPAL
// ---------------------------------------------------------------------------
function runExports(rawSchools) {
  var normalized = [];
  for (var i = 0; i < rawSchools.length; i += 1) {
    var school = normalizeSchool(rawSchools[i], i);
    if (school.lat !== null && school.lon !== null) {
      normalized.push(school);
    } else {
      print('Escuela omitida sin coordenadas', rawSchools[i]);
    }
  }

  normalized.sort(function(a, b) {
    return a.order - b.order;
  });

  var endIndex = EXPORT_LIMIT > 0
    ? Math.min(normalized.length, EXPORT_START_INDEX + EXPORT_LIMIT)
    : normalized.length;
  var selectedSchools = normalized.slice(EXPORT_START_INDEX, endIndex);

  print('Escuelas recibidas', rawSchools.length);
  print('Escuelas con coordenadas', normalized.length);
  print('Escuelas seleccionadas para exportar', selectedSchools.length);
  print('Rango indices', EXPORT_START_INDEX, endIndex - 1);
  print('Drive folder destino', DRIVE_FOLDER);
  print('Accion requerida', 'Luego de Run, abrir Tasks y pulsar Run en cada export.');

  Map.setOptions('SATELLITE');

  var nicfiBase = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    .filterDate(NICFI_START_DATE, NICFI_END_DATE)
    .sort('system:time_start', false);

  var s2Base = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(S2_START_DATE, S2_END_DATE)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
    .map(maskS2Clouds);

  var featureList = [];
  selectedSchools.forEach(function(school) {
    featureList.push(ee.Feature(ee.Geometry.Point([school.lon, school.lat]), {
      code: school.code,
      name: school.name,
      order: school.order
    }));
  });
  var selectedFeatures = ee.FeatureCollection(featureList);
  Map.addLayer(selectedFeatures, { color: 'red' }, 'Escuelas seleccionadas');

  if (selectedSchools.length > 0) {
    Map.centerObject(ee.Geometry.Point([selectedSchools[0].lon, selectedSchools[0].lat]), 16);
  }

  selectedSchools.forEach(function(school, localIndex) {
    var point = ee.Geometry.Point([school.lon, school.lat]);
    var roi = point.buffer(BUFFER_METERS).bounds();
    var nicfi = nicfiBase.filterBounds(roi);
    var latest = ee.Image(nicfi.first()).clip(roi);
    var rgb = latest.select(['R', 'G', 'B']);
    var exportImage = EXPORT_RAW_RGB ? rgb : rgb.visualize(NICFI_VIS);
    var exportName = fileNameForSchool(school);

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
      image: exportImage,
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

    if (EXPORT_SENTINEL2_FALLBACK) {
      var s2 = s2Base.filterBounds(roi).median().clip(roi).select(['B4', 'B3', 'B2']);
      Export.image.toDrive({
        image: s2,
        description: exportName.replace('_NICFI_', '_S2_'),
        folder: DRIVE_FOLDER,
        fileNamePrefix: exportName.replace('_NICFI_', '_S2_'),
        region: roi,
        scale: 10,
        maxPixels: 1e9,
        fileFormat: 'GeoTIFF',
        formatOptions: {
          cloudOptimized: true
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// 6) ENTRADA
// ---------------------------------------------------------------------------
if (USE_TABLE_ASSET) {
  ee.FeatureCollection(TABLE_ASSET_ID).toList(500).evaluate(function(features) {
    var schools = [];
    for (var i = 0; i < features.length; i += 1) {
      schools.push(featureToSchool(features[i], i));
    }
    runExports(schools);
  });
} else {
  runExports(SCHOOLS);
}
