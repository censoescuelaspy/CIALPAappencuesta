/**
 * CIALPA — Backend Apps Script de la ficha grafica del local.
 *
 * Convivencia: este archivo no toca los modulos GAS existentes. Se despliega
 * como Web App separada o se monta en el doPost principal ruteando por
 * body.action con prefijo 'ficha_grafica:'.
 *
 * Tablas (todas en la spreadsheet activa):
 *   - fichas_graficas: una fila por local con jornada CIALPA + predio.
 *   - bloques: cuerpos constructivos del predio.
 *   - espacios: aulas, dependencias, laboratorios, talleres, sanitarios.
 *   - areas_recreacion: patios, canchas, plazas, areas verdes.
 *   - elementos: mastil, escenario, camineros, rampas exteriores, acometidas.
 *   - cercado: una fila por ficha con presencia + tipo + polilinea.
 */

const FG_SHEETS = {
  fichas: 'fichas_graficas',
  bloques: 'bloques',
  espacios: 'espacios',
  areas: 'areas_recreacion',
  elementos: 'elementos',
  cercado: 'cercado'
};

const FG_SCHEMAS = {
  fichas_graficas: [
    'id_ficha', 'cialpa_session_id', 'codigo_local', 'fid_local',
    'departamento', 'distrito', 'localidad', 'nombre_local',
    'lat', 'lon', 'predio_geojson',
    'estado', 'creado_por', 'creado_en', 'actualizado_en',
    'observaciones'
  ],
  bloques: [
    'id_bloque', 'id_ficha', 'numero', 'nombre',
    'plantas', 'largo_m', 'ancho_m',
    'galeria_largo_m', 'galeria_ancho_m',
    'rampas_intn', 'instalacion_electrica', 'tipo_alimentacion',
    'tablero_seccional', 'estado_tablero', 'capacidad_a',
    'cortes_electricos',
    'geometria_geojson', 'observaciones', 'creado_en'
  ],
  espacios: [
    'id_espacio', 'id_ficha', 'id_bloque', 'planta',
    'tipo', 'sub_tipo', 'numero', 'nombre',
    'largo', 'ancho', 'unidad',
    'situacion', 'motivo_sin_uso',
    'techo_material', 'techo_estado',
    'pared_material', 'pared_estado',
    'piso_material', 'piso_estado',
    'm2_techo_afectado', 'm2_pared_afectado', 'm2_piso_afectado',
    'iluminacion', 'ventilacion',
    'artefactos_sanitarios',
    'geometria_geojson', 'observaciones', 'creado_en'
  ],
  areas_recreacion: [
    'id_area', 'id_ficha', 'nombre', 'tipo',
    'largo_m', 'ancho_m',
    'tiene_techo', 'material_techo', 'estado_techo',
    'iluminacion',
    'material_piso', 'estado_piso', 'm2_piso_afectado',
    'rampas_intn',
    'geometria_geojson', 'observaciones', 'creado_en'
  ],
  elementos: [
    'id_elemento', 'id_ficha', 'tipo', 'nombre',
    'parent_espacio_id', 'lat', 'lon', 'atributos_json',
    'observaciones', 'creado_en'
  ],
  cercado: [
    'id_ficha', 'presencia', 'tipo',
    'porcentaje_cubierto',
    'geometria_geojson', 'observaciones', 'actualizado_en'
  ]
};

const FG_LOCK_TIMEOUT_MS = 10000;
const FG_ACTIONS = new Set([
  'ficha_init_schema',
  'ficha_upsert',
  'ficha_get',
  'ficha_list',
  'ficha_delete'
]);

/**
 * Entry point para integrarse al router principal de Code.gs.
 * Devuelve un objeto plano para que Code.gs lo envuelva con _respond().
 *
 * Ejemplo de integracion en Code.gs:
 *   if (FG_ACTIONS.has(action)) return _respond(fgRoute(action, params));
 */
function fgRoute(action, params) {
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(FG_LOCK_TIMEOUT_MS);
    if (action === 'ficha_init_schema') return fgInitSchema_();
    if (action === 'ficha_upsert') return fgUpsert_(params);
    if (action === 'ficha_get') return fgGet_(params);
    if (action === 'ficha_list') return fgList_(params);
    if (action === 'ficha_delete') return fgDelete_(params);
    return { ok: false, error: 'unknown_action', received: action };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Crea las hojas y cabeceras si no existen. Idempotente. */
function fgInitSchema_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const created = [];
  const updated = [];
  Object.keys(FG_SCHEMAS).forEach((name) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(FG_SCHEMAS[name]);
      sheet.setFrozenRows(1);
      created.push(name);
    } else if (fgEnsureSchema_(sheet, FG_SCHEMAS[name])) {
      updated.push(name);
    }
  });
  return fgJson_({ ok: true, created, updated });
}

/** Reemplaza atomicamente la ficha y todas sus subentidades para un id_ficha. */
function fgUpsert_(body) {
  const ficha = body.ficha || {};
  const id = String(ficha.id_ficha || '').trim();
  if (!id) return fgJson_({ ok: false, error: 'id_ficha_required' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  fgInitSchema_();

  const now = new Date();
  const fichaRow = fgFichaToRow_(ficha, now);
  fgUpsertRowByKey_(ss, FG_SHEETS.fichas, 'id_ficha', id, fichaRow);

  fgReplaceChildren_(ss, FG_SHEETS.bloques, 'id_ficha', id,
    (body.bloques || []).map((b) => fgBloqueToRow_(b, id, now)));
  fgReplaceChildren_(ss, FG_SHEETS.espacios, 'id_ficha', id,
    fgEspacioRowsForFicha_(body.bloques || [], id, now));
  fgReplaceChildren_(ss, FG_SHEETS.areas, 'id_ficha', id,
    (body.areas_recreacion || []).map((a) => fgAreaToRow_(a, id, now)));
  fgReplaceChildren_(ss, FG_SHEETS.elementos, 'id_ficha', id,
    (body.elementos || []).map((el) => fgElementoToRow_(el, id, now)));

  if (body.cercado) {
    fgUpsertRowByKey_(ss, FG_SHEETS.cercado, 'id_ficha', id,
      fgCercadoToRow_(body.cercado, id, now));
  }

  return fgJson_({ ok: true, id_ficha: id, updated_at: now.toISOString() });
}

/** Devuelve la ficha completa con todas sus subentidades. */
function fgGet_(body) {
  const id = String(body.id_ficha || '').trim();
  if (!id) return fgJson_({ ok: false, error: 'id_ficha_required' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ficha = fgRowsAsObjects_(ss, FG_SHEETS.fichas)
    .find((row) => row.id_ficha === id);
  if (!ficha) return fgJson_({ ok: false, error: 'ficha_not_found' });

  const bloques = fgRowsAsObjects_(ss, FG_SHEETS.bloques)
    .filter((row) => row.id_ficha === id);
  const idsBloques = new Set(bloques.map((b) => b.id_bloque));
  const espacios = fgRowsAsObjects_(ss, FG_SHEETS.espacios)
    .filter((row) => idsBloques.has(row.id_bloque));
  const areas = fgRowsAsObjects_(ss, FG_SHEETS.areas)
    .filter((row) => row.id_ficha === id);
  const elementos = fgRowsAsObjects_(ss, FG_SHEETS.elementos)
    .filter((row) => row.id_ficha === id);
  const cercado = fgRowsAsObjects_(ss, FG_SHEETS.cercado)
    .find((row) => row.id_ficha === id) || null;

  return fgJson_({
    ok: true,
    ficha,
    bloques,
    espacios,
    areas_recreacion: areas,
    elementos,
    cercado
  });
}

/** Lista resumida de fichas para la pantalla de seleccion. */
function fgList_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const filtroDpto = String((body && body.departamento) || '').trim();
  const filtroEstado = String((body && body.estado) || '').trim();

  const fichas = fgRowsAsObjects_(ss, FG_SHEETS.fichas)
    .filter((row) => !filtroDpto || row.departamento === filtroDpto)
    .filter((row) => !filtroEstado || row.estado === filtroEstado)
    .map((row) => ({
      id_ficha: row.id_ficha,
      codigo_local: row.codigo_local,
      nombre_local: row.nombre_local,
      departamento: row.departamento,
      distrito: row.distrito,
      estado: row.estado,
      actualizado_en: row.actualizado_en
    }));

  return fgJson_({ ok: true, fichas });
}

/** Borra ficha y todas sus subentidades. Reversible solo desde el historial de Sheets. */
function fgDelete_(body) {
  const id = String(body.id_ficha || '').trim();
  if (!id) return fgJson_({ ok: false, error: 'id_ficha_required' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const idsBloques = fgRowsAsObjects_(ss, FG_SHEETS.bloques)
    .filter((row) => row.id_ficha === id)
    .map((row) => row.id_bloque);
  fgDeleteRowsByKey_(ss, FG_SHEETS.fichas, 'id_ficha', id);
  fgDeleteRowsByKey_(ss, FG_SHEETS.espacios, 'id_ficha', id);
  fgDeleteRowsByKeyValues_(ss, FG_SHEETS.espacios, 'id_bloque', idsBloques);
  fgDeleteRowsByKey_(ss, FG_SHEETS.bloques, 'id_ficha', id);
  fgDeleteRowsByKey_(ss, FG_SHEETS.areas, 'id_ficha', id);
  fgDeleteRowsByKey_(ss, FG_SHEETS.elementos, 'id_ficha', id);
  fgDeleteRowsByKey_(ss, FG_SHEETS.cercado, 'id_ficha', id);

  return fgJson_({ ok: true, id_ficha: id });
}

/* =================== Mapeadores objeto -> fila =================== */

function fgFichaToRow_(f, now) {
  return {
    id_ficha: f.id_ficha,
    cialpa_session_id: f.cialpa_session_id || '',
    codigo_local: f.codigo_local || '',
    fid_local: f.fid_local || '',
    departamento: f.departamento || '',
    distrito: f.distrito || '',
    localidad: f.localidad || '',
    nombre_local: f.nombre_local || '',
    lat: f.lat || '',
    lon: f.lon || '',
    predio_geojson: fgStringify_(f.predio_geojson),
    estado: f.estado || 'borrador',
    creado_por: f.creado_por || '',
    creado_en: f.creado_en || now.toISOString(),
    actualizado_en: now.toISOString(),
    observaciones: f.observaciones || ''
  };
}

function fgBloqueToRow_(b, idFicha, now) {
  return {
    id_bloque: b.id_bloque,
    id_ficha: idFicha,
    numero: b.numero || '',
    nombre: b.nombre || '',
    plantas: Array.isArray(b.plantas) ? b.plantas.join(',') : (b.plantas || ''),
    largo_m: b.largo_m || '',
    ancho_m: b.ancho_m || '',
    galeria_largo_m: b.galeria_largo_m || '',
    galeria_ancho_m: b.galeria_ancho_m || '',
    rampas_intn: b.rampas_intn || '',
    instalacion_electrica: b.instalacion_electrica || '',
    tipo_alimentacion: b.tipo_alimentacion || '',
    tablero_seccional: b.tablero_seccional || '',
    estado_tablero: b.estado_tablero || '',
    capacidad_a: b.capacidad_a || '',
    cortes_electricos: b.cortes_electricos || '',
    geometria_geojson: fgStringify_(b.geometria_geojson),
    observaciones: b.observaciones || '',
    creado_en: b.creado_en || now.toISOString()
  };
}

function fgEspacioRowsForFicha_(bloques, idFicha, now) {
  const rows = [];
  bloques.forEach((b) => {
    (b.espacios || []).forEach((e) => {
      rows.push({
        id_espacio: e.id_espacio,
        id_ficha: idFicha,
        id_bloque: b.id_bloque,
        planta: e.planta || '',
        tipo: e.tipo || '',
        sub_tipo: e.sub_tipo || '',
        numero: e.numero || '',
        nombre: e.nombre || '',
        largo: e.largo || '',
        ancho: e.ancho || '',
        unidad: e.unidad || (e.tipo === 'Sanitario' ? 'cm' : 'm'),
        situacion: e.situacion || '',
        motivo_sin_uso: e.motivo_sin_uso || '',
        techo_material: e.techo_material || '',
        techo_estado: e.techo_estado || '',
        pared_material: e.pared_material || '',
        pared_estado: e.pared_estado || '',
        piso_material: e.piso_material || '',
        piso_estado: e.piso_estado || '',
        m2_techo_afectado: e.m2_techo_afectado || '',
        m2_pared_afectado: e.m2_pared_afectado || '',
        m2_piso_afectado: e.m2_piso_afectado || '',
        iluminacion: e.iluminacion || '',
        ventilacion: e.ventilacion || '',
        artefactos_sanitarios: fgStringify_(e.artefactos_sanitarios),
        geometria_geojson: fgStringify_(e.geometria_geojson),
        observaciones: e.observaciones || '',
        creado_en: e.creado_en || now.toISOString()
      });
    });
  });
  return rows;
}

function fgAreaToRow_(a, idFicha, now) {
  return {
    id_area: a.id_area,
    id_ficha: idFicha,
    nombre: a.nombre || '',
    tipo: a.tipo || '',
    largo_m: a.largo_m || '',
    ancho_m: a.ancho_m || '',
    tiene_techo: a.tiene_techo || '',
    material_techo: a.material_techo || '',
    estado_techo: a.estado_techo || '',
    iluminacion: a.iluminacion || '',
    material_piso: a.material_piso || '',
    estado_piso: a.estado_piso || '',
    m2_piso_afectado: a.m2_piso_afectado || '',
    rampas_intn: a.rampas_intn || '',
    geometria_geojson: fgStringify_(a.geometria_geojson),
    observaciones: a.observaciones || '',
    creado_en: a.creado_en || now.toISOString()
  };
}

function fgElementoToRow_(el, idFicha, now) {
  return {
    id_elemento: el.id_elemento,
    id_ficha: idFicha,
    tipo: el.tipo || '',
    nombre: el.nombre || '',
    parent_espacio_id: el.parent_espacio_id || '',
    lat: el.lat || '',
    lon: el.lon || '',
    atributos_json: fgStringify_(el.atributos),
    observaciones: el.observaciones || '',
    creado_en: el.creado_en || now.toISOString()
  };
}

function fgCercadoToRow_(c, idFicha, now) {
  return {
    id_ficha: idFicha,
    presencia: c.presencia || '',
    tipo: c.tipo || '',
    porcentaje_cubierto: c.porcentaje_cubierto || '',
    geometria_geojson: fgStringify_(c.geometria_geojson),
    observaciones: c.observaciones || '',
    actualizado_en: now.toISOString()
  };
}

/* =================== Persistencia generica =================== */

function fgUpsertRowByKey_(ss, sheetName, keyColumn, keyValue, dataObject) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = FG_SCHEMAS[sheetName];
  const values = sheet.getDataRange().getValues();
  const headerRow = values[0] || headers;
  const keyIdx = headerRow.indexOf(keyColumn);

  let targetRow = -1;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(keyValue)) {
      targetRow = r + 1;
      break;
    }
  }

  const row = headers.map((h) => dataObject[h] !== undefined ? dataObject[h] : '');
  if (targetRow === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  }
}

function fgReplaceChildren_(ss, sheetName, parentKey, parentValue, dataRows) {
  const headers = FG_SCHEMAS[sheetName];
  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headerRow = values[0] || headers;

  const parentIdx = headerRow.indexOf(parentKey);

  if (parentIdx >= 0) {
    for (let r = values.length - 1; r >= 1; r--) {
      if (String(values[r][parentIdx]) === String(parentValue)) {
        sheet.deleteRow(r + 1);
      }
    }
  }

  if (!dataRows.length) return;
  const newRows = dataRows.map((obj) => headers.map((h) => obj[h] !== undefined ? obj[h] : ''));
  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
}

function fgDeleteRowsByKey_(ss, sheetName, keyColumn, keyValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headerRow = values[0] || FG_SCHEMAS[sheetName];
  const keyIdx = headerRow.indexOf(keyColumn);
  if (keyIdx === -1) return;
  for (let r = values.length - 1; r >= 1; r--) {
    if (String(values[r][keyIdx]) === String(keyValue)) {
      sheet.deleteRow(r + 1);
    }
  }
}

function fgDeleteRowsByKeyValues_(ss, sheetName, keyColumn, keyValues) {
  if (!keyValues || !keyValues.length) return;
  const set = new Set(keyValues.map(String));
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headerRow = values[0] || FG_SCHEMAS[sheetName];
  const keyIdx = headerRow.indexOf(keyColumn);
  if (keyIdx === -1) return;
  for (let r = values.length - 1; r >= 1; r--) {
    if (set.has(String(values[r][keyIdx]))) {
      sheet.deleteRow(r + 1);
    }
  }
}

function fgRowsAsObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function fgStringify_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function fgEnsureSchema_(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((h) => String(h || '').trim())
    .filter(Boolean);
  let changed = false;
  expectedHeaders.forEach((header) => {
    if (!currentHeaders.includes(header)) {
      sheet.getRange(1, currentHeaders.length + 1).setValue(header);
      currentHeaders.push(header);
      changed = true;
    }
  });
  if (changed) sheet.setFrozenRows(1);
  return changed;
}

/** Passthrough: fgRoute() devuelve objetos planos para que Code.gs los envuelva con _respond(). */
function fgJson_(payload) {
  return payload;
}
