/**
 * CIALPA, Relevamiento Escolar
 * setup.gs, inicialización y migración del backend
 * Version 2.1.0
 *
 * Ejecutar migrarBackendV21() una sola vez luego de reemplazar el código GAS.
 */

function setupSheets() {
  const ss = _getSpreadsheet();
  const sheetsConfig = _setupSheetsConfigV21_();

  sheetsConfig.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = ss.insertSheet(cfg.name);

    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.appendRow(cfg.headers);
    } else {
      _appendMissingHeaders_(sheet, cfg.headers);
    }

    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange.setBackground('#1F3864');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert('Configuración completada. Hojas creadas o migradas sin eliminar datos existentes.');
}

function migrarBackendV21() {
  setupSheets();
  seedConfig();
  seedCatalogos();
  normalizarEscuelasSeleccionadasV21();
  SpreadsheetApp.getUi().alert('Migración v2.1 completada. La app ya puede leer la hoja escuelas_seleccionadas con el esquema de muestreo original.');
}

function normalizarEscuelasSeleccionadasV21() {
  const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const required = _escuelasHeadersV21_();
  _appendMissingHeaders_(sheet, required);

  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const idx = name => updatedHeaders.indexOf(name) + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const get = (row, aliases) => {
    for (let i = 0; i < aliases.length; i++) {
      const pos = updatedHeaders.indexOf(aliases[i]);
      if (pos >= 0 && row[pos] !== '' && row[pos] !== null && row[pos] !== undefined) return row[pos];
    }
    return '';
  };

  values.forEach((row, i) => {
    const rowNum = i + 2;
    const codigo = String(get(row, ['codigo_local', 'CODIGO', 'Código', 'codigo', 'Código del local escolar']) || '').trim();
    const id = codigo ? 'ESC_' + codigo.replace(/\D/g, '') : String(get(row, ['id_escuela']) || '').trim();
    const nombre = String(get(row, ['nombre', 'NOMBRE', 'Nombre', 'Nombre de Local Escolar']) || '').trim();
    const depto = String(get(row, ['departamento', 'DEPTO', 'Departamento']) || '').trim();
    const distrito = String(get(row, ['distrito', 'DIST', 'Distrito']) || '').trim();
    const localidad = _sanitizeLocalidad_(get(row, ['localidad', 'LOCALIDAD', 'Localidad']));
    const zona = _normalizeZonaSetup_(get(row, ['zona', 'ZONA', 'Zona']));
    const lat = get(row, ['latitud', 'LAT_DEC', 'LATITUD', 'lat', 'Latitud']);
    const lng = get(row, ['longitud', 'LNG_DEC', 'LONGITUD', 'lng', 'Longitud']);

    if (idx('id_escuela')) sheet.getRange(rowNum, idx('id_escuela')).setValue(id || ('ESC_ROW_' + rowNum));
    if (idx('codigo_local')) sheet.getRange(rowNum, idx('codigo_local')).setValue(codigo);
    if (idx('nombre')) sheet.getRange(rowNum, idx('nombre')).setValue(nombre);
    if (idx('departamento')) sheet.getRange(rowNum, idx('departamento')).setValue(depto);
    if (idx('distrito')) sheet.getRange(rowNum, idx('distrito')).setValue(distrito);
    if (idx('localidad')) sheet.getRange(rowNum, idx('localidad')).setValue(localidad);
    if (idx('zona')) sheet.getRange(rowNum, idx('zona')).setValue(zona);
    if (idx('latitud')) sheet.getRange(rowNum, idx('latitud')).setValue(lat);
    if (idx('longitud')) sheet.getRange(rowNum, idx('longitud')).setValue(lng);
    if (idx('estado_relevamiento') && !String(get(row, ['estado_relevamiento']) || '').trim()) sheet.getRange(rowNum, idx('estado_relevamiento')).setValue('pendiente');
    if (idx('fecha_ultimo_evento') && !String(get(row, ['fecha_ultimo_evento']) || '').trim()) sheet.getRange(rowNum, idx('fecha_ultimo_evento')).setValue(_timestamp());
  });
}

function createDefaultAdmin() {
  const password = 'Adm-' + Utilities.getUuid().slice(0, 8);
  const passwordHash = AuthService._hashPassword(password);
  const sheet = _getSheet(SHEET_NAMES.USUARIOS);
  const existing = _sheetToObjects(SHEET_NAMES.USUARIOS);
  if (existing.some(u => String(u.usuario).toLowerCase() === 'admin')) {
    SpreadsheetApp.getUi().alert('El usuario admin ya existe.');
    return;
  }
  sheet.appendRow(['USR_ADMIN_001', 'admin', passwordHash, 'Administrador', 'Sistema', 'admin', 'true', _today(), '', '', '']);
  SpreadsheetApp.getUi().alert('Usuario admin creado. Usuario: admin, contraseña temporal: ' + password + '. Cambiar la contraseña inmediatamente.');
}

function seedConfig() {
  const sheet = _getSheet(SHEET_NAMES.CONFIG);
  const existing = _sheetToObjects(SHEET_NAMES.CONFIG);
  const defaults = [
    ['FORM_URL', 'https://demo.mec.gov.py/demo_rue/login', 'URL web de respaldo para abrir el formulario externo cuando no se use deep link.', 'encuesta_externa', 'true', ''],
    ['FORM_LAUNCH_MODE', 'web', 'Modo de apertura del aplicativo externo: web, android_intent, custom_scheme.', 'encuesta_externa', 'true', ''],
    ['FORM_ANDROID_INTENT_URL', '', 'URI intent:// o android-app:// para abrir el aplicativo de encuesta instalado en Android.', 'encuesta_externa', 'true', ''],
    ['FORM_CUSTOM_SCHEME_URL', '', 'Esquema personalizado del aplicativo externo, por ejemplo rueinfraestructura://start.', 'encuesta_externa', 'true', ''],
    ['FORM_FALLBACK_SECONDS', '2', 'Segundos de espera antes de usar URL web de respaldo si el deep link no responde.', 'encuesta_externa', 'true', ''],
    ['APP_NAME', 'CIALPA, Relevamiento Escolar', 'Nombre de la aplicación.', 'sistema', 'false', ''],
    ['SESSION_TIMEOUT_HOURS', '10', 'Horas máximas sugeridas para una sesión operativa abierta.', 'seguridad', 'true', ''],
    ['MAP_CENTER_LAT', '-23.4', 'Latitud centro del mapa.', 'mapa', 'true', ''],
    ['MAP_CENTER_LNG', '-58.0', 'Longitud centro del mapa.', 'mapa', 'true', ''],
    ['MAP_ZOOM', '7', 'Zoom inicial del mapa.', 'mapa', 'true', ''],
    ['CONTACTO_EMAIL', 'soporte@cialpa.gov.py', 'Correo de soporte operativo.', 'contacto', 'true', ''],
    ['FINAL_REPORT_EMAIL', 'censoescuelaspy@gmial.com', 'Destinatario automatico del PDF y metadatos del cierre completo.', 'cierre', 'true', ''],
    ['CONTACTO_TELEFONO', '(021) 000-000', 'Teléfono de soporte operativo.', 'contacto', 'true', ''],
    ['ALLOW_MULTIPLE_SESSIONS', 'false', 'Permitir más de una sesión abierta sobre la misma escuela.', 'seguridad', 'true', ''],
    ['DEFAULT_ESTIMATED_MINUTES', '180', 'Tiempo inicial esperado de relevamiento por escuela, ajustable luego con evidencia empírica.', 'planificacion', 'true', '']
  ];

  defaults.forEach(row => {
    if (!existing.some(c => String(c.clave) === row[0])) sheet.appendRow(row);
  });
}

function seedCatalogos() {
  const sheet = _getSheet(SHEET_NAMES.CATALOGOS);
  const existing = _sheetToObjects(SHEET_NAMES.CATALOGOS);
  const defaults = [
    ['zona', 'URB', 'Urbana', '1', 'true'],
    ['zona', 'RUR', 'Rural', '2', 'true'],
    ['zona', 'REM', 'Rural Remota', '3', 'true'],
    ['estado_relevamiento', 'PEN', 'Pendiente', '1', 'true'],
    ['estado_relevamiento', 'CUR', 'En curso', '2', 'true'],
    ['estado_relevamiento', 'FIN', 'Finalizada', '3', 'true'],
    ['estado_relevamiento', 'PAR', 'Parcial', '4', 'true'],
    ['estado_relevamiento', 'SUS', 'Suspendida', '5', 'true'],
    ['estado_relevamiento', 'REV', 'Revisar', '6', 'true'],
    ['tipo_incidencia', 'CER', 'Escuela cerrada', '1', 'true'],
    ['tipo_incidencia', 'BLO', 'Acceso bloqueado', '2', 'true'],
    ['tipo_incidencia', 'DIR', 'Director/a ausente', '3', 'true'],
    ['tipo_incidencia', 'INC', 'Formulario incompleto', '4', 'true'],
    ['tipo_incidencia', 'TEC', 'Problema técnico', '5', 'true'],
    ['tipo_incidencia', 'SEG', 'Seguridad o riesgo', '6', 'true'],
    ['tipo_incidencia', 'OTR', 'Otra', '7', 'true'],
    ['prioridad', 'ALT', 'Alta', '1', 'true'],
    ['prioridad', 'MED', 'Media', '2', 'true'],
    ['prioridad', 'BAJ', 'Baja', '3', 'true'],
    ['rol', 'ADM', 'Administrador', '1', 'true'],
    ['rol', 'SUP', 'Supervisor', '2', 'true'],
    ['rol', 'ENC', 'Encuestador', '3', 'true'],
    ['modulo_relevamiento', 'establecimiento', 'Datos generales del establecimiento', '1', 'true'],
    ['modulo_relevamiento', 'direccion_contacto', 'Dirección, contacto y llegada', '2', 'true'],
    ['modulo_relevamiento', 'espacios_fisicos', 'Inventario de espacios físicos', '3', 'true'],
    ['modulo_relevamiento', 'aulas', 'Aulas y ambientes pedagógicos', '4', 'true'],
    ['modulo_relevamiento', 'sanitarios', 'Sanitarios y saneamiento', '5', 'true'],
    ['modulo_relevamiento', 'agua_energia', 'Agua, energía y conectividad', '6', 'true'],
    ['modulo_relevamiento', 'seguridad_accesibilidad', 'Seguridad, accesibilidad y riesgos', '7', 'true'],
    ['modulo_relevamiento', 'evidencias', 'Fotografías y evidencias', '8', 'true'],
    ['modulo_relevamiento', 'revision_cierre', 'Revisión final y cierre', '9', 'true']
  ];

  defaults.forEach(row => {
    if (!existing.some(c => String(c.tipo) === row[0] && String(c.codigo) === row[1])) sheet.appendRow(row);
  });
}

function initAll() {
  setupSheets();
  createDefaultAdmin();
  seedConfig();
  seedCatalogos();
}

function importEscuelas() {
  const ss = _getSpreadsheet();
  const importSheet = ss.getSheetByName('IMPORT_TEMP');
  if (!importSheet) {
    SpreadsheetApp.getUi().alert('No se encontró la hoja IMPORT_TEMP. Pegue allí los datos fuente antes de ejecutar la importación.');
    return;
  }
  const values = importSheet.getDataRange().getValues();
  if (values.length < 2) {
    SpreadsheetApp.getUi().alert('La hoja IMPORT_TEMP no contiene registros para importar.');
    return;
  }
  const headers = values[0].map(h => String(h).trim());
  const dest = _getSheet(SHEET_NAMES.ESCUELAS);
  _appendMissingHeaders_(dest, _escuelasHeadersV21_());
  const existing = _sheetToObjects(SHEET_NAMES.ESCUELAS);
  const existingCodes = new Set(existing.map(e => String(e.codigo_local || e.CODIGO || '').trim()).filter(Boolean));
  let inserted = 0;
  let skipped = 0;
  const h = name => headers.indexOf(name);
  const val = (row, names) => {
    for (let i = 0; i < names.length; i++) {
      const ix = h(names[i]);
      if (ix >= 0 && row[ix] !== '' && row[ix] !== null && row[ix] !== undefined) return row[ix];
    }
    return '';
  };
  const destHeaders = dest.getRange(1, 1, 1, dest.getLastColumn()).getValues()[0].map(x => String(x).trim());
  values.slice(1).forEach(row => {
    const codigo = String(val(row, ['codigo_local', 'CODIGO', 'Código del local escolar', 'Codigo del local escolar']) || '').trim();
    if (!codigo || existingCodes.has(codigo)) { skipped++; return; }
    const obj = {
      id_escuela: 'ESC_' + codigo.replace(/\D/g, ''),
      codigo_local: codigo,
      nombre: val(row, ['nombre', 'NOMBRE', 'Nombre del local escolar', 'Nombre de Local Escolar']),
      departamento: val(row, ['departamento', 'DEPTO', 'Departamento']),
      distrito: val(row, ['distrito', 'DIST', 'Distrito']),
      localidad: _sanitizeLocalidad_(val(row, ['localidad', 'LOCALIDAD', 'Localidad'])),
      zona: _normalizeZonaSetup_(val(row, ['zona', 'ZONA', 'Zona'])),
      latitud: val(row, ['latitud', 'LAT_DEC', 'Latitud']),
      longitud: val(row, ['longitud', 'LNG_DEC', 'Longitud']),
      estado_relevamiento: 'pendiente',
      fecha_ultimo_evento: _timestamp(),
      observaciones: ''
    };
    dest.appendRow(destHeaders.map(col => obj[col] !== undefined ? obj[col] : ''));
    existingCodes.add(codigo);
    inserted++;
  });
  SpreadsheetApp.getUi().alert('Importación completada. Insertadas: ' + inserted + '. Omitidas: ' + skipped + '.');
}

/**
 * Inserta las 5 escuelas del pre-piloto 2026-04-28.
 * Ejecutar una sola vez desde el editor GAS.
 */
function insertEscuelasPiloto() {
  const piloto = [
    { codigo: '0010046', nombre: 'ESCUELA BÁSICA N° 3 REPÚBLICA DEL BRASIL',          equipo: 1, encuestador: 'Dahiana Ramon',    supervisor: 'Ada Guerrero',       lat: -25.2968, lng: -57.6309 },
    { codigo: '0011004', nombre: 'ESCUELA BÁSICA N° 2 CELSA SPERATTI',                equipo: 2, encuestador: 'Yannina Perez',    supervisor: 'Andrea Cespedes',    lat: -25.2830, lng: -57.6350 },
    { codigo: '0011007', nombre: 'COLEGIO NACIONAL DE E.M.D. PRESIDENTE FRANCO',      equipo: 3, encuestador: 'Ivan Garcia',      supervisor: 'Angel Martinez',     lat: -25.2890, lng: -57.6170 },
    { codigo: '0012095', nombre: 'ESCUELA BÁSICA N° 1 REPÚBLICA ARGENTINA',           equipo: 4, encuestador: 'Licet Armoa',      supervisor: 'Alejandro Romero',   lat: -25.3035, lng: -57.6380 },
    { codigo: '0012047', nombre: 'ESCUELA BÁSICA N° 170 GENERAL MÁXIMO SANTOS',       equipo: 5, encuestador: '',                 supervisor: '',                   lat: -25.2850, lng: -57.6290 },
  ];

  const dest = _getSheet(SHEET_NAMES.ESCUELAS);
  _appendMissingHeaders_(dest, _escuelasHeadersV21_());
  const destHeaders = dest.getRange(1, 1, 1, dest.getLastColumn()).getValues()[0].map(x => String(x).trim());
  const existing = _sheetToObjects(SHEET_NAMES.ESCUELAS);
  const existingCodes = new Set(existing.map(e => String(e.codigo_local || '').trim()).filter(Boolean));

  let inserted = 0;
  piloto.forEach((e, i) => {
    if (existingCodes.has(e.codigo)) return;
    const obj = {
      id_escuela: 'ESC_' + e.codigo.replace(/\D/g, ''),
      codigo_local: e.codigo,
      nombre: e.nombre,
      departamento: 'Capital',
      distrito: 'Asunción',
      localidad: 'Asunción',
      zona: 'Urbana',
      latitud: e.lat,
      longitud: e.lng,
      estado_relevamiento: 'pendiente',
      encuestador_asignado: e.encuestador,
      supervisor_asignado: e.supervisor,
      fecha_ultimo_evento: _timestamp(),
      observaciones: 'Pre-piloto 2026-04-28, Equipo ' + e.equipo,
      orden_visita: i + 1,
      prioridad_operativa: 'alta',
      tiempo_estimado_min: 180,
    };
    dest.appendRow(destHeaders.map(col => obj[col] !== undefined ? obj[col] : ''));
    existingCodes.add(e.codigo);
    inserted++;
  });

  SpreadsheetApp.getUi().alert('Escuelas del pre-piloto insertadas: ' + inserted + '. Ya existían: ' + (piloto.length - inserted) + '.');
}

function hashPassword() {
  const password = 'YOUR_PASSWORD_HERE';
  const hash = AuthService._hashPassword(password);
  SpreadsheetApp.getUi().alert('Hash: ' + hash);
}

function _setupSheetsConfigV21_() {
  return [
    { name: SHEET_NAMES.ESCUELAS, headers: _escuelasHeadersV21_() },
    { name: SHEET_NAMES.USUARIOS, headers: ['id_usuario', 'usuario', 'password_hash', 'nombres', 'apellidos', 'rol', 'activo', 'fecha_alta', 'ultimo_acceso', 'token_actual', 'token_expiry'] },
    { name: SHEET_NAMES.ENCUESTADORES, headers: ['id_encuestador', 'usuario', 'nombres', 'apellidos', 'documento', 'telefono', 'correo', 'zona_asignada', 'rol', 'foto_url', 'activo', 'fecha_alta', 'fecha_actualizacion'] },
    { name: SHEET_NAMES.SESIONES, headers: _sesionesHeadersV21_() },
    { name: SHEET_NAMES.MODULOS, headers: _modulosHeadersV21_() },
    { name: SHEET_NAMES.EVENTOS, headers: ['id_evento', 'id_sesion', 'id_escuela', 'usuario', 'tipo_evento', 'fecha_hora', 'detalle'] },
    { name: SHEET_NAMES.INCIDENCIAS, headers: ['id_incidencia', 'id_escuela', 'usuario', 'fecha_hora', 'tipo_incidencia', 'descripcion', 'prioridad', 'estado_resolucion', 'evidencia_url'] },
    { name: SHEET_NAMES.EVIDENCIAS, headers: ['id_evidencia','fecha_hora','usuario','archivo_nombre','mime_type','tamano_bytes','drive_file_id','drive_url','folder_id','label','school_code','school_name','scope','block_label','floor_label','space_label','element_type','element_label','element_id','field_path'] },
    { name: SHEET_NAMES.ENTREGAS, headers: ['id_entrega','id_escuela','codigo_local','nombre_escuela','usuario','fecha_cierre','destinatario_email','estado_cierre','pendientes','email_status','email_error','pdf_file_id','pdf_url','metadata_file_id','metadata_url','resumen_json','metadata_json','plan_model_json','evidence_count','creado_en','actualizado_en'] },
    { name: SHEET_NAMES.CONFIG, headers: ['clave', 'valor', 'descripcion', 'categoria', 'editable', 'fecha_actualizacion'] },
    { name: SHEET_NAMES.AUDITORIA, headers: ['id_registro', 'usuario', 'accion', 'fecha_hora', 'detalle', 'ip_aproximada'] },
    { name: SHEET_NAMES.CATALOGOS, headers: ['tipo', 'codigo', 'descripcion', 'orden', 'activo'] }
  ];
}

function _escuelasHeadersV21_() {
  return ['id_escuela', 'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona', 'latitud', 'longitud', 'estado_relevamiento', 'encuestador_asignado', 'supervisor_asignado', 'fecha_ultimo_evento', 'observaciones', 'orden_visita', 'fecha_programada', 'turno_programado', 'prioridad_operativa', 'tiempo_estimado_min', 'ultima_sesion_id', 'folio_externo', 'ultimo_registro_externo', 'ultimo_cierre_id', 'ultimo_pdf_url', 'ultimo_metadata_url', 'email_cierre_estado', 'email_cierre_destino'];
}

function _sesionesHeadersV21_() {
  return ['id_sesion', 'id_escuela', 'codigo_local', 'nombre_escuela', 'usuario', 'supervisor', 'fecha_inicio', 'hora_inicio', 'inicio_iso', 'fecha_fin', 'hora_fin', 'fin_iso', 'duracion_minutos', 'duracion_segundos', 'estado', 'observacion_cierre', 'url_formulario_usada', 'launch_mode', 'dispositivo', 'gps_inicio_lat', 'gps_inicio_lng', 'gps_fin_lat', 'gps_fin_lng', 'folio_externo', 'ultimo_registro_externo', 'modulos_completados', 'total_modulos', 'calidad_cierre', 'creado_en', 'actualizado_en'];
}

function _modulosHeadersV21_() {
  return ['id_modulo', 'id_sesion', 'id_escuela', 'usuario', 'modulo', 'modulo_nombre', 'orden', 'inicio_iso', 'fin_iso', 'duracion_minutos', 'estado', 'observacion', 'registros_estimados', 'registros_completados', 'creado_en', 'actualizado_en'];
}

function _appendMissingHeaders_(sheet, requiredHeaders) {
  const lastCol = sheet.getLastColumn();
  const current = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim()) : [];
  const missing = requiredHeaders.filter(h => !current.includes(h));
  if (!current.length) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }
  missing.forEach(h => sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h));
}

function _normalizeZonaSetup_(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('urb')) return 'Urbana';
  if (s.includes('rem')) return 'Rural Remota';
  if (s.includes('rur')) return 'Rural';
  return String(value || '').trim();
}

function _sanitizeLocalidad_(value) {
  const s = String(value || '').trim();
  if (/^mon\s|^tue\s|^wed\s|^thu\s|^fri\s|^sat\s|^sun\s/i.test(s) && s.includes('GMT')) return '';
  return s;
}
