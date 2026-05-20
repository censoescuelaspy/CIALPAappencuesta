/**
 * CIALPA, Relevamiento Escolar
 * escuelas_embebidas.gs, soporte de padron embebido.
 *
 * Este archivo se publica sin filas del padron para evitar exponer datos
 * nominales/contactos en el repositorio publico. Para un despliegue privado
 * del GAS, regenerar localmente con:
 *   npm run embed:schools
 *
 * Si el CSV queda vacio o solo contiene encabezado, el backend vuelve a leer
 * la hoja escuelas_seleccionadas como fallback operativo.
 */

var CIALPA_EMBEDDED_ESCUELAS_CSV_UPDATED_AT = '';
var CIALPA_EMBEDDED_ESCUELAS_CACHE = null;
var CIALPA_EMBEDDED_ESCUELAS_PILOT_CACHE = null;

function getEmbeddedEscuelasCsv_() {
  return [
    'codigo_local',
    'nombre',
    'departamento',
    'distrito',
    'localidad',
    'zona',
    'latitud',
    'longitud'
  ].join(',');
}

function getEmbeddedEscuelasPilotCsv_() {
  return [
    'codigo_local',
    'orden_muestra_piloto',
    'prioridad_operativa'
  ].join(',');
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
  var csv = String(rawCsv || '').replace(/^\uFEFF/, '').trim();
  if (!csv) return { headers: [], rows: [] };

  var firstLine = String(csv.split(/\r?\n/)[0] || '');
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
    'Codigo del local escolar', 'Codigo de Local Escolar', 'Codigo Local Escolar',
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
  var digits = text.replace(/\D+/g, '');
  return digits || text.toLowerCase();
}
