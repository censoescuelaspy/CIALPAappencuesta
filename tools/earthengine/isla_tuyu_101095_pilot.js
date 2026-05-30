// CIALPA - Piloto Earth Engine para Escuela Basica N 2076, Isla Tuyu.
// Ejecutar en Google Earth Engine Code Editor.
// Centro segun padron local: 23º4'57.928"S, 56º56'52.476"W.

var SCHOOL = {
  code: '101095',
  name: 'ESCUELA BASICA N 2076',
  department: 'CONCEPCION',
  district: 'PASO BARRETO',
  locality: 'ISLA TUYU',
  lat: -23.08275777777778,
  lon: -56.94790999999999
};

var BUFFER_METERS = 500;
var DRIVE_FOLDER = 'CIALPA_EE_PILOTO_ISLA_TUYU';
var EXPORT_PREFIX = 'CIALPA_101095_ISLA_TUYU';

// NICFI/Planet es el ensayo principal exportable desde Earth Engine.
// Si falla con "caller does not have access", falta habilitar acceso Planet/NICFI
// en la cuenta Earth Engine. Sentinel-2 queda apagado para no volver a generar
// imagenes borrosas de 10 m como si fueran alta resolucion.
var ENABLE_NICFI = true;
var EXPORT_SENTINEL2_FALLBACK = false;
var NICFI_START_DATE = '2024-01-01';
var NICFI_END_DATE = '2026-01-01';

// Si se cuenta con bucket autorizado, activar para generar tiles directamente.
var ENABLE_TILE_EXPORT = false;
var GCS_BUCKET = 'cialpa-school-tiles';
var GCS_PATH_PREFIX = 'schools/101095/tiles-nicfi';

var point = ee.Geometry.Point([SCHOOL.lon, SCHOOL.lat]);
var roi = point.buffer(BUFFER_METERS).bounds();

Map.setOptions('SATELLITE');
Map.centerObject(point, 17);

// Importante: el fondo SATELLITE que se ve muy nitido es el basemap de Google
// usado por el visor. Ese fondo sirve para inspeccion visual, pero no es un
// ee.Image exportable. Solo se exportan capas cargadas abajo como NICFI o S2.
print('IMPORTANTE', 'El fondo SATELLITE del visor no es exportable desde Earth Engine; para la app se exporta NICFI si la cuenta tiene acceso.');

var roiOutline = ee.Image().byte().paint({
  featureCollection: ee.FeatureCollection([ee.Feature(roi)]),
  color: 1,
  width: 2
});
Map.addLayer(roiOutline, { palette: ['yellow'] }, 'ROI borde 500 m - Isla Tuyu 101095');
Map.addLayer(point, { color: 'red' }, 'Escuela 101095');

print('Escuela piloto', SCHOOL);
print('ROI', roi);

if (ENABLE_NICFI) {
  // Planet NICFI Americas monthly basemaps. Requiere acceso habilitado en la
  // cuenta de Earth Engine; si no lo tiene, Earth Engine muestra:
  // "ImageCollection asset ... not found (does not exist or caller does not have access)".
  var nicfi = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    .filterBounds(roi)
    .filterDate(NICFI_START_DATE, NICFI_END_DATE)
    .sort('system:time_start', false);

  var nicfiLatest = ee.Image(nicfi.first()).clip(roi);
  var nicfiRgb = nicfiLatest.select(['R', 'G', 'B']);
  var nicfiVis = { bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4 };

  Map.addLayer(nicfiLatest, nicfiVis, 'NICFI RGB mas reciente');
  print('NICFI rango solicitado', NICFI_START_DATE, NICFI_END_DATE);
  print('NICFI imagen seleccionada', nicfiLatest);
  print('NICFI cantidad de imagenes', nicfi.size());

  Export.image.toDrive({
    image: nicfiRgb,
    description: EXPORT_PREFIX + '_NICFI_RGB_2024_2026_GEOTIFF',
    folder: DRIVE_FOLDER,
    fileNamePrefix: EXPORT_PREFIX + '_NICFI_RGB_2024_2026',
    region: roi,
    scale: 4.77,
    maxPixels: 1e9,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });

  if (ENABLE_TILE_EXPORT) {
    Export.map.toCloudStorage({
      image: nicfiRgb.visualize(nicfiVis),
      description: EXPORT_PREFIX + '_NICFI_TILES_Z17_Z21',
      bucket: GCS_BUCKET,
      path: GCS_PATH_PREFIX,
      region: roi,
      minZoom: 17,
      maxZoom: 21,
      writePublicTiles: false
    });
  }
}

if (EXPORT_SENTINEL2_FALLBACK) {
  // Fallback gratuito de menor resolucion: Sentinel-2 SR harmonized, 10 m.
  // No sirve para bloques finos; usar solo para comprobar el pipeline.
  function maskS2Clouds(image) {
    var scl = image.select('SCL');
    var keep = scl.neq(3)  // cloud shadow
      .and(scl.neq(8))     // medium probability cloud
      .and(scl.neq(9))     // high probability cloud
      .and(scl.neq(10))    // thin cirrus
      .and(scl.neq(11));   // snow/ice
    return image.updateMask(keep);
  }

  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(roi)
    .filterDate('2024-01-01', '2026-05-30')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
    .map(maskS2Clouds)
    .median()
    .clip(roi);

  var s2Rgb = s2.select(['B4', 'B3', 'B2']);
  Map.addLayer(s2Rgb, { min: 0, max: 3000, gamma: 1.25 }, 'Sentinel-2 fallback 10 m', false);

  Export.image.toDrive({
    image: s2Rgb,
    description: EXPORT_PREFIX + '_S2_RGB_2024_2026_GEOTIFF',
    folder: DRIVE_FOLDER,
    fileNamePrefix: EXPORT_PREFIX + '_S2_RGB_2024_2026',
    region: roi,
    scale: 10,
    maxPixels: 1e9,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    }
  });
}
