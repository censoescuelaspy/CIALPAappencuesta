/**
 * CIALPA, Relevamiento Escolar
 * sheets.gs, servicio de datos y operación de campo
 * Version 2.6.180
 */

const SheetsService = (() => {

  const TZ = 'America/Asuncion';
  const OFFICIAL_SCHOOLS_SPREADSHEET_ID = '1Auz5pIrUzAdc2uN0UkiBNwlV3stjq0bPcnCcsEraWmU';
  const OFFICIAL_SCHOOLS_FULL_SHEET = 'listado_ini';
  const OFFICIAL_SCHOOLS_PILOT_SHEET = 'muestra_piloto_def';

  const OP_COLS_ESCUELAS = [
    'id_escuela', 'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona',
    'latitud', 'longitud', 'estado_relevamiento', 'encuestador_asignado', 'supervisor_asignado',
    'fecha_ultimo_evento', 'observaciones', 'orden_visita', 'fecha_programada', 'turno_programado',
    'prioridad_operativa', 'en_muestra_piloto', 'orden_muestra_piloto',
    'tiempo_estimado_min', 'tiempo_real_min', 'tiempo_aulas_min', 'tiempo_aulas_promedio_min',
    'tiempo_sanitarios_min', 'tiempo_sanitarios_promedio_min', 'tiempo_exteriores_min',
    'ultima_sesion_id', 'folio_externo',
    'ultimo_registro_externo', 'ultimo_cierre_id', 'ultimo_pdf_url', 'ultimo_metadata_url',
    'email_cierre_estado', 'email_cierre_destino', 'ultimo_borrador_mec_id',
    'ultimo_borrador_mec_at', 'ultimo_borrador_mec_usuario'
  ];

  const INCIDENCIA_HEADERS = [
    'id_incidencia','id_escuela','usuario','fecha_hora','tipo_incidencia','descripcion',
    'prioridad','estado_resolucion','evidencia_url','id_sesion','codigo_local','nombre_escuela',
    'departamento','distrito','localidad','latitud','longitud','notificacion_email_estado',
    'notificacion_email_destino','notificacion_email_error','notificacion_email_fecha'
  ];

  const APP_FEEDBACK_HEADERS = [
    'id_comentario','fecha_hora','usuario','nombre_usuario','rol','categoria','modulo',
    'prioridad','titulo','descripcion','pasos_reproduccion','url','app_version',
    'user_agent','viewport','estado','respuesta_admin','usuario_admin','fecha_resolucion'
  ];

  const MODULE_DEFAULTS = [
    ['establecimiento', 'Datos generales del establecimiento', 1],
    ['direccion_contacto', 'Dirección, contacto y llegada', 2],
    ['espacios_fisicos', 'Inventario de espacios físicos', 3],
    ['aulas', 'Aulas y ambientes pedagógicos', 4],
    ['sanitarios', 'Sanitarios y saneamiento', 5],
    ['agua_energia', 'Agua, energía y conectividad', 6],
    ['seguridad_accesibilidad', 'Seguridad, accesibilidad y riesgos', 7],
    ['evidencias', 'Fotografías y evidencias', 8],
    ['revision_cierre', 'Revisión final y cierre', 9]
  ];

  const R01_PUBLIC_URL = 'https://censoescuelaspy.github.io/CIALPAappencuesta/cuestionario_inicial/';

  const R01_CONTACT_HEADERS = [
    'id_contacto','token','codigo_local','id_escuela','nombre_escuela','director_nombre',
    'correo','celular','departamento','distrito','localidad','url_cuestionario',
    'estado_envio','ultimo_envio','ultimo_error','cantidad_envios','fuente',
    'respuesta_id','respuesta_fecha','creado_en','actualizado_en'
  ];

  const R01_RESPONSE_HEADERS = [
    'id_respuesta','fecha_hora','token','id_escuela','codigo_local','nombre_escuela',
    'departamento','distrito','localidad','director_nombre','director_correo','director_celular',
    'agua_tiene','agua_fuentes','bomba_hp','agua_observacion',
    'bano_tiene','desague_tipo','sanitario_observacion',
    'internet_tiene','internet_tipo','internet_calidad','internet_observacion',
    'cctv_tiene','cctv_funcionando','cctv_danadas',
    'incendio_detectores','incendio_pulsadores_sirena','incendio_luces_emergencia',
    'incendio_extintores','incendio_hidraulico','motobomba_hp','reserva_tanque_litros',
    'energia_tiene','energia_proveedor','energia_cortes','energia_observacion',
    'observacion_final','adjunto_url','public_url','app_version','payload_json'
  ];

  const R01_SEND_HEADERS = [
    'id_envio','fecha_hora','usuario','modo','distrito','codigo_local','id_escuela',
    'nombre_escuela','director_nombre','correo','celular','asunto','url_cuestionario',
    'estado','error'
  ];

  function getEscuelas(filters) {
    const source = _escuelasRawRows_();
    let rows = source.rows
      .map((r, idx) => _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || idx + 2))
      .filter(r => r.codigo_local || r.id_escuela || r.nombre);

    filters = filters || {};
    rows = _markSheetFallbackPilotRows_(rows, source.source);
    if (filters.departamento) rows = rows.filter(r => _same(r.departamento, filters.departamento));
    if (filters.estado) rows = rows.filter(r => _same(r.estado_relevamiento, filters.estado));
    if (filters.encuestador) rows = rows.filter(r => _same(r.encuestador_asignado, filters.encuestador));
    if (filters.supervisor) rows = rows.filter(r => _same(r.supervisor_asignado, filters.supervisor));
    if (filters.zona) rows = rows.filter(r => _same(r.zona, filters.zona));
    if (filters.distrito) rows = rows.filter(r => _same(r.distrito, filters.distrito));
    if (_isTrueish(filters.muestra_piloto) || _isTrueish(filters.piloto)) {
      rows = rows.filter(_isPilotSchool_);
    }
    if (filters.q) {
      const q = _txt(filters.q).toLowerCase();
      rows = rows.filter(r => (`${r.nombre} ${r.codigo_local} ${r.departamento} ${r.distrito} ${r.localidad}`).toLowerCase().includes(q));
    }
    if (_same(filters.orden, 'piloto') || _same(filters.sort, 'piloto') || _same(filters.order, 'piloto')) {
      rows = rows.slice().sort((a, b) => {
        const ao = _num(a.orden_muestra_piloto || a.orden_visita) || 999999;
        const bo = _num(b.orden_muestra_piloto || b.orden_visita) || 999999;
        return ao - bo || String(a.codigo_local || '').localeCompare(String(b.codigo_local || ''));
      });
    }

    return {
      status: 'ok',
      data: rows,
      meta: {
        total: rows.length,
        schema: 'canonical_v2_1',
        source: source.source,
        embedded_updated_at: source.embeddedUpdatedAt || '',
      }
    };
  }

  function getEscuela(id, options) {
    const source = _escuelasRawRows_();
    const found = source.rows
      .map((r, idx) => _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || idx + 2))
      .find(r => _idMatch(r, id));
    if (!found) return { status: 'error', message: 'Escuela no encontrada.' };
    return { status: 'ok', data: _attachMecDraftToSchool_(found, options || {}), meta: { source: source.source } };
  }

  function _attachMecDraftToSchool_(school, options) {
    const data = Object.assign({}, school || {});
    if (!options || !_isTrueish(options.includeDraft)) return data;
    const session = options._session || {};
    if (!_canReadMecDraftForSchool_(session, data)) return data;
    const latest = _latestMecDraftForSchool_(data.id_escuela, data.codigo_local);
    if (!latest) return data;
    const draft = _mecParseJson_(latest.draft_json);
    const resumen = _mecParseJson_(latest.resumen_json);
    const evidenceIndex = _mecParseJson_(latest.evidence_index_json);
    Object.assign(data, _mecDraftMetadata_(latest, resumen, evidenceIndex));
    if (draft) data.mec_draft = draft;
    if (resumen) data.mec_draft_resumen = resumen;
    if (Array.isArray(evidenceIndex)) data.mec_evidence_index = evidenceIndex;
    return data;
  }

  function _canReadMecDraftForSchool_(session, school) {
    const role = _txt(session && session.rol).toLowerCase();
    if (role === 'admin' || role === 'supervisor') return true;
    return _canOperateSchool_(session, school);
  }

  function _latestMecDraftForSchool_(idEscuela, codigoLocal) {
    let rows = [];
    try {
      rows = _sheetToObjects(SHEET_NAMES.MEC_DRAFTS);
    } catch (err) {
      return null;
    }
    const ids = [idEscuela, codigoLocal].map(_txt).filter(Boolean);
    if (!ids.length) return null;
    let latest = null;
    rows.forEach(function(row, index) {
      if (!ids.some(function(id) { return _draftRowMatchesSchoolId_(row, id); })) return;
      const candidate = Object.assign({ __row_order: index + 2 }, row);
      if (!latest || _mecRowMs_(candidate) >= _mecRowMs_(latest)) latest = candidate;
    });
    return latest;
  }

  function diagnosticoPadron() {
    const source = _escuelasRawRows_();
    const rows = source.rows
      .map((r, idx) => _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || r.__official_sheet_row || idx + 2))
      .filter(r => r.codigo_local || r.id_escuela || r.nombre);
    const withCoords = rows.filter(r => r.latitud !== '' && r.longitud !== '').length;
    const pilot = rows.filter(_isPilotSchool_).length;
    let operationalRows = 0;
    try {
      operationalRows = _sheetToObjects(SHEET_NAMES.ESCUELAS).length;
    } catch (err) {
      operationalRows = -1;
    }
    return {
      status: 'ok',
      data: {
        source: source.source,
        total: rows.length,
        con_coordenadas: withCoords,
        muestra_piloto: pilot,
        filas_operativas: operationalRows,
        embedded_updated_at: source.embeddedUpdatedAt || '',
      }
    };
  }

  function updateEscuelaEstado(params) {
    const session = params._session;
    const id = params.id_escuela || params.codigo_local;
    let rowIdx = _findEscuelaRow(id);
    if (rowIdx === -1) rowIdx = _appendEmbeddedEscuelaOperationalRow_(id);
    if (rowIdx === -1) return { status: 'error', message: 'Escuela no encontrada.' };

    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = _headers(sheet);
    const set = (col, val) => _setByHeader(sheet, rowIdx, headers, col, val);

    const raw = _objectFromRow(sheet, rowIdx, headers);
    const normalized = _normalizarEscuela(raw, rowIdx);
    if (!_canOperateSchool_(session, normalized)) return _schoolAccessError_(normalized);
    set('id_escuela', normalized.id_escuela);
    set('codigo_local', normalized.codigo_local);
    set('nombre', normalized.nombre);
    set('departamento', normalized.departamento);
    set('distrito', normalized.distrito);
    set('localidad', normalized.localidad);
    set('zona', normalized.zona);
    set('latitud', normalized.latitud);
    set('longitud', normalized.longitud);
    set('estado_relevamiento', params.estado || 'pendiente');
    set('fecha_ultimo_evento', _timestamp());
    if (params.observacion !== undefined && params.observacion !== null) set('observaciones', params.observacion);
    if (params.encuestador_asignado !== undefined) set('encuestador_asignado', params.encuestador_asignado);
    if (params.supervisor_asignado !== undefined) set('supervisor_asignado', params.supervisor_asignado);

    AuditService.log('UPDATE_ESCUELA_ESTADO', session.usuario, `id: ${id}, estado: ${params.estado || 'pendiente'}`);
    return { status: 'ok', message: 'Estado actualizado.' };
  }

  function asignarEscuela(params) {
    const session = params._session;
    if (!['admin', 'supervisor'].includes(String(session.rol))) return { status: 'error', message: 'Acceso restringido.' };
    const candidates = _schoolIdentityCandidates_(params.id_escuela, params.codigo_local);
    let rowIdx = -1;
    for (let i = 0; i < candidates.length && rowIdx === -1; i++) {
      rowIdx = _findEscuelaRow(candidates[i]);
    }
    for (let i = 0; i < candidates.length && rowIdx === -1; i++) {
      rowIdx = _appendEmbeddedEscuelaOperationalRow_(candidates[i]);
    }
    if (rowIdx === -1) return { status: 'error', message: 'Escuela no encontrada.' };
    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = _headers(sheet);
    if (params.encuestador_asignado !== undefined) _setByHeader(sheet, rowIdx, headers, 'encuestador_asignado', params.encuestador_asignado || '');
    if (params.supervisor_asignado !== undefined) _setByHeader(sheet, rowIdx, headers, 'supervisor_asignado', params.supervisor_asignado || '');
    if (params.fecha_programada !== undefined) _setByHeader(sheet, rowIdx, headers, 'fecha_programada', params.fecha_programada || '');
    if (params.turno_programado !== undefined) _setByHeader(sheet, rowIdx, headers, 'turno_programado', params.turno_programado || '');
    if (params.orden_visita !== undefined) _setByHeader(sheet, rowIdx, headers, 'orden_visita', params.orden_visita || '');
    if (params.prioridad_operativa !== undefined) _setByHeader(sheet, rowIdx, headers, 'prioridad_operativa', params.prioridad_operativa || 'media');
    _setByHeader(sheet, rowIdx, headers, 'fecha_ultimo_evento', _timestamp());
    AuditService.log('ASIGNAR_ESCUELA', session.usuario, `id: ${params.id_escuela || params.codigo_local}`);
    return { status: 'ok', message: 'Asignación actualizada.' };
  }

  function iniciarSesion(params) {
    const session = params._session;
    const idEscuela = params.id_escuela || params.codigo_local;
    const escuelaResult = getEscuela(idEscuela);
    if (escuelaResult.status !== 'ok') return escuelaResult;
    const escuela = escuelaResult.data;
    if (!_canOperateSchool_(session, escuela)) return _schoolAccessError_(escuela);

    const requestedSessionId = _clientMutationId(params);
    const allowMultiple = _configBool('ALLOW_MULTIPLE_SESSIONS', false);
    _ensureOperationalSheets();
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const existente = requestedSessionId ? sesiones.find(s => String(s.id_sesion) === String(requestedSessionId)) : null;
    if (existente) return { status: 'ok', data: _normalizeSessionRow_(existente), message: 'La sesion offline ya estaba sincronizada.' };
    const abiertaMismoUsuario = sesiones.find(s => _isOpenSession_(s) && _sameSessionSchool_(s, escuela, idEscuela) && _same(s.usuario, session.usuario));
    if (abiertaMismoUsuario) {
      return { status: 'ok', data: _normalizeSessionRow_(abiertaMismoUsuario), message: 'Ya tenias una sesion abierta para esta escuela; se reutiliza la existente.' };
    }

    const abierta = sesiones.find(s => _isOpenSession_(s) && _sameSessionSchool_(s, escuela, idEscuela));
    if (abierta && !allowMultiple) {
      return { status: 'error', message: 'Ya existe una sesión activa para esta escuela.', data: _normalizeSessionRow_(abierta), code: 'SESSION_OPEN' };
    }

    const launch = _resolveLaunchConfig(params);
    const id_sesion = requestedSessionId || _genId('SES');
    const now = new Date();
    const row = {
      id_sesion,
      id_escuela: escuela.id_escuela,
      codigo_local: escuela.codigo_local,
      nombre_escuela: escuela.nombre,
      usuario: session.usuario,
      supervisor: escuela.supervisor_asignado || '',
      fecha_inicio: _date(now),
      hora_inicio: _time(now),
      inicio_iso: now.toISOString(),
      fecha_fin: '',
      hora_fin: '',
      fin_iso: '',
      duracion_minutos: '',
      duracion_segundos: '',
      estado: 'en_curso',
      observacion_cierre: '',
      url_formulario_usada: launch.url,
      launch_mode: launch.mode,
      dispositivo: params.dispositivo || '',
      gps_inicio_lat: params.gps_lat || '',
      gps_inicio_lng: params.gps_lng || '',
      gps_fin_lat: '',
      gps_fin_lng: '',
      folio_externo: '',
      ultimo_registro_externo: '',
      modulos_completados: 0,
      total_modulos: MODULE_DEFAULTS.length,
      calidad_cierre: '',
      creado_en: _timestamp(),
      actualizado_en: _timestamp()
    };
    _appendObject(SHEET_NAMES.SESIONES, _sesionesHeaders(), row);

    _updateEscuelaOperational(escuela.id_escuela, {
      estado_relevamiento: 'en_curso',
      fecha_ultimo_evento: _timestamp(),
      ultima_sesion_id: id_sesion
    });
    _logEvento(id_sesion, escuela.id_escuela, session.usuario, 'INICIO_SESION', `Inicio ${row.fecha_inicio} ${row.hora_inicio}`);
    AuditService.log('INICIO_SESION', session.usuario, `id_sesion: ${id_sesion}, escuela: ${escuela.codigo_local}`);
    return { status: 'ok', data: _normalizeSessionRow_(row) };
  }

  function cerrarSesion(params) {
    const session = params._session;
    const id_sesion = params.id_sesion;
    const sheet = _getSheet(SHEET_NAMES.SESIONES);
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const headers = _headers(sheet);
    const rowIdx = _findRowIndex(SHEET_NAMES.SESIONES, 'id_sesion', id_sesion);
    if (rowIdx === -1) return { status: 'error', message: 'Sesión no encontrada.' };

    const row = _objectFromRow(sheet, rowIdx, headers);
    const inicioIso = row.inicio_iso || _asIso(row.fecha_inicio, row.hora_inicio);
    const now = new Date();
    const durSeg = inicioIso ? Math.max(0, Math.round((now.getTime() - new Date(inicioIso).getTime()) / 1000)) : (parseInt(params.duracion_segundos, 10) || 0);
    const durMin = params.duracion_minutos || Math.max(1, Math.ceil(durSeg / 60));
    const estado = params.estado || 'finalizada';
    const modStats = _modulosStats(id_sesion);

    _setByHeader(sheet, rowIdx, headers, 'fecha_fin', _date(now));
    _setByHeader(sheet, rowIdx, headers, 'hora_fin', _time(now));
    _setByHeader(sheet, rowIdx, headers, 'fin_iso', now.toISOString());
    _setByHeader(sheet, rowIdx, headers, 'duracion_minutos', durMin);
    _setByHeader(sheet, rowIdx, headers, 'duracion_segundos', durSeg || '');
    _setByHeader(sheet, rowIdx, headers, 'estado', estado);
    _setByHeader(sheet, rowIdx, headers, 'observacion_cierre', params.observacion_cierre || '');
    _setByHeader(sheet, rowIdx, headers, 'gps_fin_lat', params.gps_lat || '');
    _setByHeader(sheet, rowIdx, headers, 'gps_fin_lng', params.gps_lng || '');
    _setByHeader(sheet, rowIdx, headers, 'folio_externo', params.folio_externo || '');
    _setByHeader(sheet, rowIdx, headers, 'ultimo_registro_externo', params.ultimo_registro_externo || '');
    _setByHeader(sheet, rowIdx, headers, 'modulos_completados', modStats.completados);
    _setByHeader(sheet, rowIdx, headers, 'total_modulos', modStats.total);
    _setByHeader(sheet, rowIdx, headers, 'calidad_cierre', params.calidad_cierre || _inferirCalidadCierre(estado, params, modStats));
    _setByHeader(sheet, rowIdx, headers, 'actualizado_en', _timestamp());

    const idEscuela = row.id_escuela || params.id_escuela;
    if (idEscuela) {
      _updateEscuelaOperational(idEscuela, {
        estado_relevamiento: estado,
        fecha_ultimo_evento: _timestamp(),
        folio_externo: params.folio_externo || row.folio_externo || '',
        ultimo_registro_externo: params.ultimo_registro_externo || row.ultimo_registro_externo || ''
      });
    }
    _logEvento(id_sesion, idEscuela, session.usuario, 'CIERRE_SESION', `Estado ${estado}, duración ${durMin} min, módulos ${modStats.completados}/${modStats.total}`);
    AuditService.log('CIERRE_SESION', session.usuario, `id_sesion: ${id_sesion}, estado: ${estado}`);
    return { status: 'ok', message: 'Sesión cerrada correctamente.', data: { duracion_minutos: durMin, modulos: modStats } };
  }

  function registrarEventoSesion(params) {
    const session = params._session;
    if (!params.id_sesion) return { status: 'error', message: 'id_sesion requerido.' };
    _logEvento(params.id_sesion, params.id_escuela || '', session.usuario, params.tipo_evento || 'EVENTO', params.detalle || '');
    return { status: 'ok' };
  }

  function iniciarModulo(params) {
    const session = params._session;
    if (!params.id_sesion || !params.modulo) return { status: 'error', message: 'id_sesion y modulo son requeridos.' };
    _ensureOperationalSheets();
    _ensureColumns(SHEET_NAMES.MODULOS, _modulosHeaders());
    const requestedModuleId = _clientMutationId(params);
    const modulos = _sheetToObjects(SHEET_NAMES.MODULOS);
    const existente = requestedModuleId ? modulos.find(r => String(r.id_modulo) === String(requestedModuleId)) : null;
    if (existente) return { status: 'ok', data: existente, message: 'El modulo offline ya estaba sincronizado.' };
    const abiertos = modulos.find(r => String(r.id_sesion) === String(params.id_sesion) && String(r.modulo) === String(params.modulo) && _estado(r.estado) === 'en_curso');
    if (abiertos) return { status: 'ok', data: abiertos, message: 'El módulo ya estaba en curso.' };
    const id_modulo = requestedModuleId || _genId('MOD');
    const now = new Date();
    const row = {
      id_modulo,
      id_sesion: params.id_sesion,
      id_escuela: params.id_escuela || '',
      usuario: session.usuario,
      modulo: params.modulo,
      modulo_nombre: params.modulo_nombre || _moduleLabel(params.modulo),
      orden: params.orden || _moduleOrder(params.modulo),
      inicio_iso: now.toISOString(),
      fin_iso: '',
      duracion_minutos: '',
      estado: 'en_curso',
      observacion: params.observacion || '',
      registros_estimados: params.registros_estimados || '',
      registros_completados: '',
      creado_en: _timestamp(),
      actualizado_en: _timestamp()
    };
    _appendObject(SHEET_NAMES.MODULOS, _modulosHeaders(), row);
    _logEvento(params.id_sesion, params.id_escuela || '', session.usuario, 'INICIO_MODULO', `${row.modulo_nombre}`);
    return { status: 'ok', data: row };
  }

  function cerrarModulo(params) {
    const session = params._session;
    if (!params.id_modulo && (!params.id_sesion || !params.modulo)) return { status: 'error', message: 'Identificador de módulo requerido.' };
    const sheet = _getSheet(SHEET_NAMES.MODULOS);
    _ensureColumns(SHEET_NAMES.MODULOS, _modulosHeaders());
    const headers = _headers(sheet);
    let rowIdx = params.id_modulo ? _findRowIndex(SHEET_NAMES.MODULOS, 'id_modulo', params.id_modulo) : -1;
    if (rowIdx === -1) {
      const data = sheet.getDataRange().getValues();
      const idxSesion = headers.indexOf('id_sesion');
      const idxModulo = headers.indexOf('modulo');
      const idxEstado = headers.indexOf('estado');
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idxSesion]) === String(params.id_sesion) && String(data[i][idxModulo]) === String(params.modulo) && _estado(data[i][idxEstado]) === 'en_curso') {
          rowIdx = i + 1;
          break;
        }
      }
    }
    if (rowIdx === -1) return { status: 'error', message: 'Módulo no encontrado o no está en curso.' };
    const row = _objectFromRow(sheet, rowIdx, headers);
    const now = new Date();
    const inicio = row.inicio_iso ? new Date(row.inicio_iso) : now;
    const dur = Math.max(1, Math.ceil((now.getTime() - inicio.getTime()) / 60000));
    _setByHeader(sheet, rowIdx, headers, 'fin_iso', now.toISOString());
    _setByHeader(sheet, rowIdx, headers, 'duracion_minutos', dur);
    _setByHeader(sheet, rowIdx, headers, 'estado', params.estado || 'finalizado');
    _setByHeader(sheet, rowIdx, headers, 'observacion', params.observacion || row.observacion || '');
    _setByHeader(sheet, rowIdx, headers, 'registros_completados', params.registros_completados || '');
    _setByHeader(sheet, rowIdx, headers, 'actualizado_en', _timestamp());
    _logEvento(row.id_sesion, row.id_escuela || '', session.usuario, 'CIERRE_MODULO', `${row.modulo_nombre || row.modulo}, ${dur} min`);
    return { status: 'ok', data: { id_modulo: row.id_modulo, duracion_minutos: dur } };
  }

  function getModulosSesion(params) {
    const id = params.id_sesion;
    const rows = _sheetToObjects(SHEET_NAMES.MODULOS).filter(r => String(r.id_sesion) === String(id));
    rows.sort((a, b) => (parseInt(a.orden, 10) || 999) - (parseInt(b.orden, 10) || 999));
    return { status: 'ok', data: rows, meta: _modulosStats(id) };
  }

  function getSesionesAbiertas() {
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES).filter(_isOpenSession_).map(_normalizeSessionRow_);
    const escuelas = _escuelasMap();
    sesiones.forEach(s => {
      const e = escuelas[s.id_escuela] || escuelas[s.codigo_local] || {};
      s.nombre_escuela = s.nombre_escuela || e.nombre || s.id_escuela;
      s.codigo_local = s.codigo_local || e.codigo_local || '';
    });
    return { status: 'ok', data: sesiones };
  }

  function getMisSesiones(params) {
    const session = params._session;
    let rows = _sheetToObjects(SHEET_NAMES.SESIONES).filter(s => _same(s.usuario, session.usuario)).map(_normalizeSessionRow_);
    const escuelas = _escuelasMap();
    rows.forEach(s => {
      const e = escuelas[s.id_escuela] || escuelas[s.codigo_local] || {};
      s.nombre_escuela = s.nombre_escuela || e.nombre || s.id_escuela;
      s.codigo_local = s.codigo_local || e.codigo_local || '';
    });
    rows.sort((a, b) => String(b.inicio_iso || `${b.fecha_inicio}${b.hora_inicio}`).localeCompare(String(a.inicio_iso || `${a.fecha_inicio}${a.hora_inicio}`)));
    return { status: 'ok', data: rows };
  }

  function repararSesionesDuplicadasEnCurso(params) {
    const session = params && params._session;
    if (!['admin', 'supervisor'].includes(String(session && session.rol))) return { status: 'error', message: 'Acceso restringido.' };
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const sheet = _getSheet(SHEET_NAMES.SESIONES);
    const headers = _headers(sheet);
    const rows = _sheetToObjects(SHEET_NAMES.SESIONES).map((row, index) => Object.assign({ __row_index: index + 2 }, row));
    const groups = {};

    rows.filter(_isOpenSession_).forEach(row => {
      const userKey = _txt(row.usuario).toLowerCase();
      const schoolKey = _sessionSchoolKey_(row);
      if (!userKey || !schoolKey) return;
      const key = `${userKey}|${schoolKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const now = new Date();
    let cerradas = 0;
    Object.keys(groups).forEach(key => {
      const group = groups[key];
      if (group.length < 2) return;
      group.sort((a, b) => _sessionStartMs_(b) - _sessionStartMs_(a));
      group.slice(1).forEach(row => {
        const startIso = _formatIsoCell_(row.inicio_iso) || _asIso(_formatDateCell_(row.fecha_inicio), _formatTimeCell_(row.hora_inicio));
        const startMs = startIso ? new Date(startIso).getTime() : NaN;
        const durSeg = isFinite(startMs) ? Math.max(0, Math.round((now.getTime() - startMs) / 1000)) : '';
        _setByHeader(sheet, row.__row_index, headers, 'fecha_fin', _date(now));
        _setByHeader(sheet, row.__row_index, headers, 'hora_fin', _time(now));
        _setByHeader(sheet, row.__row_index, headers, 'fin_iso', now.toISOString());
        _setByHeader(sheet, row.__row_index, headers, 'duracion_minutos', durSeg ? Math.max(1, Math.ceil(durSeg / 60)) : '');
        _setByHeader(sheet, row.__row_index, headers, 'duracion_segundos', durSeg || '');
        _setByHeader(sheet, row.__row_index, headers, 'estado', 'suspendida');
        _setByHeader(sheet, row.__row_index, headers, 'observacion_cierre', 'Cerrada automaticamente por duplicado: misma escuela y mismo usuario con otra sesion en curso.');
        _setByHeader(sheet, row.__row_index, headers, 'actualizado_en', _timestamp());
        cerradas++;
      });
    });

    return { status: 'ok', message: `Sesiones duplicadas cerradas: ${cerradas}.`, data: { cerradas } };
  }

  function getEncuestadores(params) {
    const session = params && params._session;
    const includeInactive = params && (params.incluir_inactivos === true || String(params.incluir_inactivos).toLowerCase() === 'true');
    let rows = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    if (!includeInactive || !_isAuthorizedAdmin(session)) rows = rows.filter(r => String(r.activo).toLowerCase() !== 'false');
    return { status: 'ok', data: rows };
  }

  function saveEncuestador(params) {
    const session = params._session;
    if (!_isAuthorizedAdmin(session)) return { status: 'error', message: 'Solo administradores autorizados pueden gestionar usuarios.' };
    const { id_encuestador, usuario, nombres, apellidos, documento, telefono, correo, zona_asignada, rol, activo, password } = params;
    if (!usuario || !nombres) return { status: 'error', message: 'Usuario y nombres son requeridos.' };
    const activeValue = activo === false || String(activo).toLowerCase() === 'false' ? 'false' : 'true';
    _ensureColumns(SHEET_NAMES.ENCUESTADORES, ['id_encuestador','usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol','foto_url','activo','fecha_alta','fecha_actualizacion']);
    _ensureColumns(SHEET_NAMES.USUARIOS, ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual','token_expiry','documento','telefono','correo']);

    if (!id_encuestador) {
      const existing = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
      if (existing.some(e => _same(e.usuario, usuario))) return { status: 'error', message: 'Ya existe un encuestador con ese usuario.' };
      const newId = _genId('ENC');
      _appendObject(SHEET_NAMES.ENCUESTADORES, ['id_encuestador','usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol','foto_url','activo','fecha_alta','fecha_actualizacion'], {
        id_encuestador: newId, usuario, nombres, apellidos: apellidos || '', documento: documento || '', telefono: telefono || '', correo: correo || '', zona_asignada: zona_asignada || '', rol: rol || 'encuestador', foto_url: '', activo: activeValue, fecha_alta: _today(), fecha_actualizacion: _today()
      });
      _appendObject(SHEET_NAMES.USUARIOS, ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual','token_expiry','documento','telefono','correo'], {
        id_usuario: _genId('USR'), usuario, password_hash: password ? AuthService._hashPassword(password) : '', nombres, apellidos: apellidos || '', rol: rol || 'encuestador', activo: activeValue, fecha_alta: _today(), ultimo_acceso: '', token_actual: '', token_expiry: '', documento: documento || '', telefono: telefono || '', correo: correo || ''
      });
      AuditService.log('CREATE_ENCUESTADOR', session.usuario, `usuario: ${usuario}`);
      return { status: 'ok', message: 'Encuestador creado.', data: { id_encuestador: newId } };
    }

    const sheet = _getSheet(SHEET_NAMES.ENCUESTADORES);
    const rowIdx = _findRowIndex(SHEET_NAMES.ENCUESTADORES, 'id_encuestador', id_encuestador);
    if (rowIdx === -1) return { status: 'error', message: 'Encuestador no encontrado.' };
    const headers = _headers(sheet);
    const previousUsuario = _getByHeader(sheet, rowIdx, headers, 'usuario') || usuario;
    const existing = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    if (!_same(previousUsuario, usuario) && existing.some(e => !_same(e.id_encuestador, id_encuestador) && _same(e.usuario, usuario))) {
      return { status: 'error', message: 'Ya existe un encuestador con ese usuario.' };
    }
    ['usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol'].forEach(k => _setByHeader(sheet, rowIdx, headers, k, params[k] || ''));
    _setByHeader(sheet, rowIdx, headers, 'activo', activeValue);
    _setByHeader(sheet, rowIdx, headers, 'fecha_actualizacion', _today());
    _updateUsuarioMirror(previousUsuario, { usuario, nombres, apellidos: apellidos || '', rol: rol || 'encuestador', activo: activeValue, password, documento, telefono, correo });
    AuditService.log('UPDATE_ENCUESTADOR', session.usuario, `id: ${id_encuestador}, usuario: ${usuario}`);
    return { status: 'ok', message: 'Encuestador actualizado.' };
  }

  function deleteEncuestador(params) {
    const session = params._session;
    if (!_isAuthorizedAdmin(session)) return { status: 'error', message: 'Solo administradores autorizados pueden desactivar usuarios.' };
    const rowIdx = _findRowIndex(SHEET_NAMES.ENCUESTADORES, 'id_encuestador', params.id_encuestador);
    if (rowIdx === -1) return { status: 'error', message: 'Encuestador no encontrado.' };
    const sheet = _getSheet(SHEET_NAMES.ENCUESTADORES);
    const headers = _headers(sheet);
    const usuario = _getByHeader(sheet, rowIdx, headers, 'usuario');
    _setByHeader(sheet, rowIdx, headers, 'activo', 'false');
    _updateUsuarioMirror(usuario, { activo: 'false' });
    AuditService.log('DELETE_ENCUESTADOR', session.usuario, `id: ${params.id_encuestador}`);
    return { status: 'ok', message: 'Encuestador desactivado.' };
  }

  function saveIncidencia(params) {
    const session = params._session;
    _ensureColumns(SHEET_NAMES.INCIDENCIAS, INCIDENCIA_HEADERS);
    const requestedId = _clientMutationId(params);
    if (requestedId) {
      const existingIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', requestedId);
      if (existingIdx !== -1) return { status: 'ok', message: 'Incidencia offline ya sincronizada.', data: { id_incidencia: requestedId } };
    }
    const id = requestedId || _genId('INC');
    _appendObject(SHEET_NAMES.INCIDENCIAS, INCIDENCIA_HEADERS, {
      id_incidencia: id,
      id_escuela: params.id_escuela || '',
      usuario: session.usuario,
      fecha_hora: _timestamp(),
      tipo_incidencia: params.tipo_incidencia || 'Otra',
      descripcion: params.descripcion || '',
      prioridad: params.prioridad || 'media',
      estado_resolucion: 'pendiente',
      evidencia_url: params.evidencia_url || '',
      id_sesion: params.id_sesion || '',
      codigo_local: params.codigo_local || '',
      nombre_escuela: params.nombre_escuela || '',
      departamento: params.departamento || '',
      distrito: params.distrito || '',
      localidad: params.localidad || '',
      latitud: params.gps_lat || '',
      longitud: params.gps_lng || ''
    });
    if (params.id_escuela) _updateEscuelaOperational(params.id_escuela, { estado_relevamiento: 'incidencia', fecha_ultimo_evento: _timestamp() });
    AuditService.log('SAVE_INCIDENCIA', session.usuario, `id: ${id}, escuela: ${params.id_escuela || ''}`);
    return { status: 'ok', message: 'Incidencia registrada.', data: { id_incidencia: id } };
  }

  function solicitarRelevamiento(params) {
    const session = params._session;
    const id = params.id_escuela || params.codigo_local;
    if (!id) return { status: 'error', message: 'Identificador de escuela requerido.' };

    const escuelaResult = getEscuela(id);
    if (escuelaResult.status !== 'ok') return escuelaResult;
    const escuela = escuelaResult.data || {};
    if (_estado(escuela.estado_relevamiento) === 'finalizada') {
      return { status: 'error', message: 'La escuela ya figura finalizada.' };
    }
    if (_txt(_schoolAssignmentText_(escuela))) {
      return { status: 'error', message: 'La escuela ya esta asignada a un responsable.' };
    }

    const headers = INCIDENCIA_HEADERS;
    _ensureColumns(SHEET_NAMES.INCIDENCIAS, headers);
    const requestedId = _clientMutationId(params);
    if (requestedId) {
      const existingIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', requestedId);
      if (existingIdx !== -1) return { status: 'ok', message: 'Solicitud offline ya sincronizada.', data: { id_incidencia: requestedId } };
    }

    const existing = _sheetToObjects(SHEET_NAMES.INCIDENCIAS).find(function(row) {
      const sameSchool = _schoolIdentityCandidates_(escuela.id_escuela, escuela.codigo_local, id)
        .some(candidate => _idMatch(row, candidate));
      return sameSchool
        && _same(row.usuario, session.usuario)
        && _same(row.estado_resolucion, 'pendiente')
        && _same(row.tipo_incidencia, 'Solicitud de relevamiento');
    });
    if (existing) {
      let emailStatus = null;
      if (!_same(existing.notificacion_email_estado, 'enviado')) {
        const solicitanteExistente = `${session.nombres || ''} ${session.apellidos || ''}`.trim() || session.usuario;
        emailStatus = _notifySolicitudRelevamiento_(existing.id_incidencia, solicitanteExistente, session, escuela, params);
        _writeSolicitudEmailStatus_(existing.id_incidencia, emailStatus);
      }
      return {
        status: 'ok',
        message: emailStatus
          ? _solicitudEmailMessage_('Ya existe una solicitud pendiente para esta escuela y se reintento el aviso al administrador.', emailStatus)
          : 'Ya existe una solicitud pendiente para esta escuela.',
        data: { id_incidencia: existing.id_incidencia, email_status: emailStatus || { sent: _same(existing.notificacion_email_estado, 'enviado'), to: existing.notificacion_email_destino || _adminNotificationEmail_() } }
      };
    }

    const solicitante = `${session.nombres || ''} ${session.apellidos || ''}`.trim() || session.usuario;
    const idSolicitud = requestedId || _genId('SOL');
    _appendObject(SHEET_NAMES.INCIDENCIAS, headers, {
      id_incidencia: idSolicitud,
      id_escuela: escuela.id_escuela || id,
      usuario: session.usuario,
      fecha_hora: _timestamp(),
      tipo_incidencia: 'Solicitud de relevamiento',
      descripcion: params.descripcion || `Solicitud de ${solicitante} para relevar escuela sin asignacion: ${escuela.nombre || params.nombre_escuela || escuela.codigo_local || id}.`,
      prioridad: 'media',
      estado_resolucion: 'pendiente',
      evidencia_url: '',
      id_sesion: '',
      codigo_local: escuela.codigo_local || params.codigo_local || '',
      nombre_escuela: escuela.nombre || params.nombre_escuela || '',
      departamento: escuela.departamento || params.departamento || '',
      distrito: escuela.distrito || params.distrito || '',
      localidad: escuela.localidad || params.localidad || '',
      latitud: escuela.latitud || params.latitud || '',
      longitud: escuela.longitud || params.longitud || ''
    });
    AuditService.log('SOLICITAR_RELEVAMIENTO', session.usuario, `id: ${idSolicitud}, escuela: ${escuela.codigo_local || escuela.id_escuela || id}`);
    const emailStatus = _notifySolicitudRelevamiento_(idSolicitud, solicitante, session, escuela, params);
    _writeSolicitudEmailStatus_(idSolicitud, emailStatus);
    return { status: 'ok', message: _solicitudEmailMessage_('Solicitud enviada al administrador.', emailStatus), data: { id_incidencia: idSolicitud, email_status: emailStatus } };
  }

  function _notifySolicitudRelevamiento_(idSolicitud, solicitante, session, escuela, params) {
    params = params || {};
    const id = escuela.codigo_local || escuela.id_escuela || params.id_escuela || params.codigo_local || '';
    return _sendAdminNotificationEmail_(
      `CIALPA - solicitud de relevamiento: ${id}`,
      `
        <p>Un usuario solicito relevar una escuela sin asignacion.</p>
        <ul>
          <li><b>Solicitud:</b> ${_htmlEscape_(idSolicitud)}</li>
          <li><b>Solicitante:</b> ${_htmlEscape_(solicitante)} (${_htmlEscape_(session.usuario)})</li>
          <li><b>Escuela:</b> ${_htmlEscape_(escuela.codigo_local || id)} - ${_htmlEscape_(escuela.nombre || params.nombre_escuela || '')}</li>
          <li><b>Departamento:</b> ${_htmlEscape_(escuela.departamento || params.departamento || '-')}</li>
          <li><b>Distrito:</b> ${_htmlEscape_(escuela.distrito || params.distrito || '-')}</li>
          <li><b>Localidad:</b> ${_htmlEscape_(escuela.localidad || params.localidad || '-')}</li>
          <li><b>Fecha:</b> ${_htmlEscape_(_timestamp())}</li>
        </ul>
        <p>Puede aprobarla desde CIALPA &gt; Encuestadores &gt; Solicitudes de relevamiento pendientes.</p>
      `,
      `Solicitud de relevamiento CIALPA: ${solicitante} solicita ${id} - ${escuela.nombre || params.nombre_escuela || ''}.`
    );
  }

  function _writeSolicitudEmailStatus_(idSolicitud, emailStatus) {
    const rowIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', idSolicitud);
    if (rowIdx === -1) return;
    _ensureColumns(SHEET_NAMES.INCIDENCIAS, INCIDENCIA_HEADERS);
    const sheet = _getSheet(SHEET_NAMES.INCIDENCIAS);
    const headers = _headers(sheet);
    _setByHeader(sheet, rowIdx, headers, 'notificacion_email_estado', emailStatus && emailStatus.sent ? 'enviado' : 'error');
    _setByHeader(sheet, rowIdx, headers, 'notificacion_email_destino', emailStatus && emailStatus.to ? emailStatus.to : _adminNotificationEmail_());
    _setByHeader(sheet, rowIdx, headers, 'notificacion_email_error', emailStatus && emailStatus.sent ? '' : (emailStatus && emailStatus.error ? emailStatus.error : 'No se pudo confirmar el envio.'));
    _setByHeader(sheet, rowIdx, headers, 'notificacion_email_fecha', _timestamp());
  }

  function _solicitudEmailMessage_(successMessage, emailStatus) {
    if (emailStatus && emailStatus.sent) return successMessage;
    const error = emailStatus && emailStatus.error ? String(emailStatus.error) : '';
    if (/MailApp|script\.send_mail|send_mail|permiso|authorization/i.test(error)) {
      return 'Solicitud registrada. El correo al administrador quedo pendiente porque el Web App necesita autorizacion de MailApp. El administrador puede verla y aprobarla desde Encuestadores > Solicitudes.';
    }
    return 'Solicitud registrada, pero no se pudo enviar el correo al administrador. El administrador puede verla y aprobarla desde Encuestadores > Solicitudes.';
  }

  function aprobarSolicitudRelevamiento(params) {
    const session = params._session;
    if (!['admin', 'supervisor'].includes(String(session.rol))) return { status: 'error', message: 'Acceso restringido.' };
    const idSolicitud = params.id_incidencia || params.id_solicitud;
    if (!idSolicitud) return { status: 'error', message: 'Identificador de solicitud requerido.' };

    const rowIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', idSolicitud);
    if (rowIdx === -1) return { status: 'error', message: 'Solicitud no encontrada.' };

    _ensureColumns(SHEET_NAMES.INCIDENCIAS, INCIDENCIA_HEADERS);
    const sheet = _getSheet(SHEET_NAMES.INCIDENCIAS);
    const headers = _headers(sheet);
    const solicitud = _objectFromRow(sheet, rowIdx, headers);
    if (!_same(solicitud.tipo_incidencia, 'Solicitud de relevamiento')) {
      return { status: 'error', message: 'La incidencia seleccionada no es una solicitud de relevamiento.' };
    }
    if (_same(solicitud.estado_resolucion, 'resuelto')) {
      return { status: 'ok', message: 'La solicitud ya estaba resuelta.', data: { id_incidencia: idSolicitud } };
    }

    const usuarioSolicitante = _txt(params.encuestador_asignado || solicitud.usuario);
    const escuelaSolicitud = _resolveEscuelaByCandidates_(solicitud.id_escuela, solicitud.codigo_local);
    const idEscuela = _txt((escuelaSolicitud && (escuelaSolicitud.id_escuela || escuelaSolicitud.codigo_local)) || solicitud.id_escuela || solicitud.codigo_local);
    if (!usuarioSolicitante || !idEscuela) {
      return { status: 'error', message: 'La solicitud no tiene usuario o escuela suficiente para aprobar.' };
    }

    const assignment = asignarEscuela({
      _session: session,
      id_escuela: idEscuela,
      codigo_local: (escuelaSolicitud && escuelaSolicitud.codigo_local) || solicitud.codigo_local || idEscuela,
      encuestador_asignado: usuarioSolicitante,
    });
    if (assignment.status !== 'ok') return assignment;

    const resolution = `Aprobada por ${session.usuario} el ${_timestamp()}. Escuela asignada a ${usuarioSolicitante}.`;
    _setByHeader(sheet, rowIdx, headers, 'estado_resolucion', 'resuelto');
    _setByHeader(sheet, rowIdx, headers, 'evidencia_url', resolution);
    if (escuelaSolicitud) {
      _setByHeader(sheet, rowIdx, headers, 'id_escuela', escuelaSolicitud.id_escuela || idEscuela);
      _setByHeader(sheet, rowIdx, headers, 'codigo_local', escuelaSolicitud.codigo_local || solicitud.codigo_local || '');
      _setByHeader(sheet, rowIdx, headers, 'nombre_escuela', escuelaSolicitud.nombre || solicitud.nombre_escuela || '');
      _setByHeader(sheet, rowIdx, headers, 'departamento', escuelaSolicitud.departamento || solicitud.departamento || '');
      _setByHeader(sheet, rowIdx, headers, 'distrito', escuelaSolicitud.distrito || solicitud.distrito || '');
      _setByHeader(sheet, rowIdx, headers, 'localidad', escuelaSolicitud.localidad || solicitud.localidad || '');
    }
    AuditService.log('APROBAR_SOLICITUD_RELEVAMIENTO', session.usuario, `solicitud: ${idSolicitud}, escuela: ${idEscuela}, encuestador: ${usuarioSolicitante}`);
    return {
      status: 'ok',
      message: `Solicitud aprobada. Escuela asignada a ${usuarioSolicitante}.`,
      data: { id_incidencia: idSolicitud, id_escuela: idEscuela, codigo_local: (escuelaSolicitud && escuelaSolicitud.codigo_local) || solicitud.codigo_local || '', encuestador_asignado: usuarioSolicitante },
    };
  }

  function uploadEvidence(params) {
    const session = params._session;
    const folderId = params.folderId || EVIDENCE_FOLDER_ID;
    if (!folderId) return { status: 'error', message: 'Carpeta de evidencias no configurada.' };
    const dataUrl = String(params.dataUrl || '');
    const comma = dataUrl.indexOf(',');
    const base64 = String(params.base64 || (comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)).trim();
    if (!base64) return { status: 'error', message: 'Archivo de evidencia vacio.' };

    const mimeType = String(params.mimeType || _mimeFromDataUrl(dataUrl) || 'image/jpeg');
    const filename = _safeEvidenceFilename(params.filename || params.name || `evidencia_${Date.now()}.jpg`);
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const context = typeof params.context === 'object' ? params.context : {};
    const rootFolder = DriveApp.getFolderById(folderId);

    // Get or create per-school subfolder: "{schoolCode} - {schoolName}"
    const schoolCode = String(context.schoolCode || context.codigo_local || params.schoolCode || params.codigo_local || params.id_escuela || '').trim();
    const schoolName = String(context.schoolName || context.nombre_escuela || params.schoolName || params.nombre_escuela || params.nombre || '').trim();
    const schoolFolderName = _safeEvidenceFolderName(schoolCode
      ? (schoolName ? `${schoolCode} - ${schoolName}` : schoolCode)
      : (schoolName || 'sin_escuela'));
    let targetFolder = rootFolder;
    let subFolderId = folderId;
    try {
      const existing = rootFolder.getFoldersByName(schoolFolderName);
      targetFolder = existing.hasNext() ? existing.next() : rootFolder.createFolder(schoolFolderName);
      subFolderId = targetFolder.getId();
    } catch (folderErr) {
      Logger.log('uploadEvidence: no se pudo crear subcarpeta escuela: ' + folderErr);
    }

    const file = targetFolder.createFile(blob);
    const now = _timestamp();
    file.setDescription(JSON.stringify({
      app: 'CIALPA',
      label: params.label || '',
      uploadedBy: session.usuario,
      uploadedAt: now,
      context,
    }).slice(0, 5000));

    _ensureColumns(SHEET_NAMES.EVIDENCIAS, [
      'id_evidencia','fecha_hora','usuario','archivo_nombre','mime_type','tamano_bytes',
      'drive_file_id','drive_url','folder_id','subfolder_id','label','school_code','school_name',
      'scope','block_label','floor_label','space_label','element_type','element_label',
      'element_id','field_path'
    ]);
    const evidenceId = _genId('EVI');
    _appendObject(SHEET_NAMES.EVIDENCIAS, [
      'id_evidencia','fecha_hora','usuario','archivo_nombre','mime_type','tamano_bytes',
      'drive_file_id','drive_url','folder_id','subfolder_id','label','school_code','school_name',
      'scope','block_label','floor_label','space_label','element_type','element_label',
      'element_id','field_path'
    ], {
      id_evidencia: evidenceId,
      fecha_hora: now,
      usuario: session.usuario,
      archivo_nombre: filename,
      mime_type: mimeType,
      tamano_bytes: bytes.length,
      drive_file_id: file.getId(),
      drive_url: file.getUrl(),
      folder_id: folderId,
      subfolder_id: subFolderId,
      label: params.label || '',
      school_code: context.schoolCode || '',
      school_name: context.schoolName || '',
      scope: context.scope || '',
      block_label: context.blockLabel || '',
      floor_label: context.floorLabel || '',
      space_label: context.spaceLabel || '',
      element_type: context.elementType || '',
      element_label: context.elementLabel || '',
      element_id: context.elementId || '',
      field_path: context.fieldPath || ''
    });
    AuditService.log('UPLOAD_EVIDENCE', session.usuario, `id: ${evidenceId}, file: ${file.getId()}`);
    return {
      status: 'ok',
      message: 'Evidencia guardada en Drive.',
      data: {
        id: file.getId(),
        url: file.getUrl(),
        name: filename,
        folderId,
        subFolderId,
        uploadedAt: now,
        evidenceId,
      }
    };
  }

  function listarEscuelasCuestionarioInicial(params) {
    params = params || {};
    const source = _escuelasRawRows_();
    const allRows = source.rows
      .map((r, idx) => _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || r.__official_sheet_row || idx + 2))
      .filter(r => r.codigo_local || r.id_escuela || r.nombre);
    let rows = allRows.slice();
    if (params.departamento) rows = rows.filter(r => _same(r.departamento, params.departamento));
    if (params.distrito) rows = rows.filter(r => _same(r.distrito, params.distrito));
    if (params.q) {
      const q = _r01SearchKey_(params.q);
      rows = rows.filter(r => _r01SearchKey_(`${r.codigo_local} ${r.id_escuela} ${r.nombre} ${r.departamento} ${r.distrito} ${r.localidad}`).indexOf(q) !== -1);
    }
    rows = rows.slice().sort((a, b) => {
      const ad = _txt(a.departamento).localeCompare(_txt(b.departamento));
      if (ad) return ad;
      const dd = _txt(a.distrito).localeCompare(_txt(b.distrito));
      if (dd) return dd;
      return _txt(a.codigo_local || a.id_escuela).localeCompare(_txt(b.codigo_local || b.id_escuela));
    });
    const limit = Math.min(Math.max(_num(params.limit) || rows.length, 1), 10000);
    const data = rows.slice(0, limit).map(_r01PublicSchool_);
    return {
      status: 'ok',
      data,
      meta: {
        total: data.length,
        total_padron: allRows.length,
        source: source.source,
        embedded_updated_at: source.embeddedUpdatedAt || '',
        departamentos: _uniqueSorted_(allRows.map(r => r.departamento)),
        distritos: _uniqueSorted_(allRows.map(r => r.distrito)),
        distritos_por_departamento: _districtsByDepartment_(allRows),
      },
    };
  }

  function guardarCuestionarioInicial(params) {
    params = params || {};
    _ensureColumns(SHEET_NAMES.R01_RESPUESTAS, R01_RESPONSE_HEADERS);
    const now = _timestamp();
    const responseId = _clientMutationId(params) || params.id_respuesta || _genId('R01');
    const row = {};
    R01_RESPONSE_HEADERS.forEach(function(header) {
      row[header] = params[header] !== undefined ? params[header] : '';
    });
    row.id_respuesta = responseId;
    row.fecha_hora = now;
    row.codigo_local = _txt(row.codigo_local || params.codigo || params.codigoLocal);
    row.id_escuela = _txt(row.id_escuela || params.id);
    row.nombre_escuela = _txt(row.nombre_escuela || params.escuela || params.nombre);
    row.payload_json = JSON.stringify(params).slice(0, 49000);
    _appendObject(SHEET_NAMES.R01_RESPUESTAS, R01_RESPONSE_HEADERS, row);
    _r01MarkAnswered_(params, responseId, now);
    AuditService.log('R01_RESPUESTA_PUBLICA', row.codigo_local || row.id_escuela || 'sin_codigo', `respuesta: ${responseId}`);
    return {
      status: 'ok',
      message: 'Cuestionario inicial recibido. Muchas gracias por colaborar con el relevamiento.',
      data: { id_respuesta: responseId, sheet: SHEET_NAMES.R01_RESPUESTAS, savedAt: now },
    };
  }

  function guardarCuestionarioInicialAdjunto(params) {
    params = params || {};
    const dataUrl = String(params.dataUrl || '');
    const comma = dataUrl.indexOf(',');
    const base64 = String(params.base64 || (comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)).trim();
    if (!base64) return { status: 'error', message: 'Archivo adjunto vacio.' };
    const mimeType = String(params.mimeType || _mimeFromDataUrl(dataUrl) || 'application/octet-stream');
    const filename = _safeEvidenceFilename(params.filename || params.name || `r01_adjunto_${Date.now()}`);
    const bytes = Utilities.base64Decode(base64);
    const root = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);
    const r01Folder = _getOrCreateFolder_(root, 'Cuestionario inicial R01');
    const schoolCode = _txt(params.codigo_local || params.id_escuela || params.token);
    const schoolName = _txt(params.nombre_escuela || params.escuela);
    const schoolFolder = _getOrCreateFolder_(r01Folder, _safeEvidenceFolderName(schoolCode
      ? (schoolName ? `${schoolCode} - ${schoolName}` : schoolCode)
      : (schoolName || 'sin_escuela')));
    const file = schoolFolder.createFile(Utilities.newBlob(bytes, mimeType, filename));
    const now = _timestamp();
    file.setDescription(JSON.stringify({
      app: 'CIALPA',
      origen: 'cuestionario_inicial_r01',
      id_respuesta: params.id_respuesta || '',
      codigo_local: params.codigo_local || '',
      nombre_escuela: params.nombre_escuela || '',
      uploadedAt: now,
    }).slice(0, 5000));
    _ensureColumns(SHEET_NAMES.EVIDENCIAS, [
      'id_evidencia','fecha_hora','usuario','archivo_nombre','mime_type','tamano_bytes',
      'drive_file_id','drive_url','folder_id','subfolder_id','label','school_code','school_name',
      'scope','block_label','floor_label','space_label','element_type','element_label',
      'element_id','field_path'
    ]);
    const evidenceId = _genId('EVI');
    _appendObject(SHEET_NAMES.EVIDENCIAS, [
      'id_evidencia','fecha_hora','usuario','archivo_nombre','mime_type','tamano_bytes',
      'drive_file_id','drive_url','folder_id','subfolder_id','label','school_code','school_name',
      'scope','block_label','floor_label','space_label','element_type','element_label',
      'element_id','field_path'
    ], {
      id_evidencia: evidenceId,
      fecha_hora: now,
      usuario: 'director_cuestionario',
      archivo_nombre: filename,
      mime_type: mimeType,
      tamano_bytes: bytes.length,
      drive_file_id: file.getId(),
      drive_url: file.getUrl(),
      folder_id: r01Folder.getId(),
      subfolder_id: schoolFolder.getId(),
      label: 'Cuestionario inicial R01',
      school_code: schoolCode,
      school_name: schoolName,
      scope: 'cuestionario_inicial',
      field_path: 'r01.adjunto'
    });
    _r01UpdateResponseAttachment_(params.id_respuesta, file.getUrl());
    return {
      status: 'ok',
      message: 'Adjunto del cuestionario inicial guardado.',
      data: { id_archivo: file.getId(), id_evidencia: evidenceId, url: file.getUrl(), uploadedAt: now },
    };
  }

  function importarContactosCuestionarioInicial(params) {
    const session = params._session || {};
    if (!_r01CanManage_(session)) return { status: 'error', message: 'Acceso restringido a supervisores y administradores.' };
    const contacts = Array.isArray(params.contacts) ? params.contacts : [];
    _ensureColumns(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS);
    const sheet = _getSheet(SHEET_NAMES.R01_CONTACTOS);
    const headers = _headers(sheet);
    const now = _timestamp();
    let processed = 0;
    let skipped = 0;
    contacts.forEach(function(input) {
      const contact = _r01NormalizeContact_(input || {});
      if (!contact.codigo_local && !contact.nombre_escuela && !contact.correo) {
        skipped++;
        return;
      }
      processed++;
      contact.token = contact.token || _genId('R01T');
      contact.url_cuestionario = _r01Url_(contact);
      contact.fuente = params.source || contact.fuente || 'importacion';
      contact.estado_envio = contact.estado_envio || 'pendiente';
      contact.actualizado_en = now;
      let rowIdx = _r01FindContactRow_(contact);
      if (rowIdx === -1) {
        contact.id_contacto = _genId('R01C');
        contact.creado_en = now;
        _appendObject(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS, contact);
      } else {
        R01_CONTACT_HEADERS.forEach(function(col) {
          if (contact[col] !== undefined && contact[col] !== '') _setByHeader(sheet, rowIdx, headers, col, contact[col]);
        });
      }
    });
    AuditService.log('R01_IMPORTAR_CONTACTOS', session.usuario, `procesados: ${processed}, omitidos: ${skipped}`);
    return { status: 'ok', message: 'Contactos del cuestionario inicial importados.', data: { processed, skipped } };
  }

  function listarContactosCuestionarioInicial(params) {
    const session = params._session || {};
    if (!_r01CanManage_(session)) return { status: 'error', message: 'Acceso restringido a supervisores y administradores.' };
    _ensureColumns(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS);
    let rows = _sheetToObjects(SHEET_NAMES.R01_CONTACTOS);
    if (params && params.distrito) rows = rows.filter(function(row) { return _same(row.distrito, params.distrito); });
    if (params && params.estado) rows = rows.filter(function(row) { return _same(row.estado_envio, params.estado); });
    rows = rows.map(function(row) {
      if (!row.url_cuestionario) row.url_cuestionario = _r01Url_(row);
      return row;
    });
    return { status: 'ok', data: rows, meta: { total: rows.length } };
  }

  function enviarCuestionarioInicial(params) {
    const session = params._session || {};
    if (!_r01CanManage_(session)) return { status: 'error', message: 'Acceso restringido a supervisores y administradores.' };
    _ensureColumns(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS);
    _ensureColumns(SHEET_NAMES.R01_ENVIOS, R01_SEND_HEADERS);
    const sheet = _getSheet(SHEET_NAMES.R01_CONTACTOS);
    const headers = _headers(sheet);
    const contacts = _sheetToObjects(SHEET_NAMES.R01_CONTACTOS).map(function(row, index) {
      return Object.assign({ __row_index: index + 2 }, row);
    });
    const distrito = _txt(params.distrito);
    const limit = Math.max(1, Math.min(500, parseInt(params.limit || '50', 10) || 50));
    const dryRun = String(params.dryRun) === 'true' || params.dryRun === true;
    const subject = _txt(params.subject) || 'CIALPA - Cuestionario inicial previo a la visita escolar';
    const now = _timestamp();
    const targets = contacts
      .filter(function(row) { return !distrito || _same(row.distrito, distrito); })
      .filter(function(row) { return _txt(row.correo); })
      .slice(0, limit);
    let sent = 0;
    let errors = 0;
    const items = [];
    targets.forEach(function(contact) {
      const normalized = _r01NormalizeContact_(contact);
      normalized.token = normalized.token || _genId('R01T');
      normalized.url_cuestionario = normalized.url_cuestionario || _r01Url_(normalized);
      let status = dryRun ? 'simulado' : 'enviado';
      let error = '';
      try {
        if (!dryRun) {
          MailApp.sendEmail({
            to: normalized.correo,
            subject: subject,
            htmlBody: _r01EmailHtml_(normalized),
            name: 'CIALPA Relevamiento Escolar',
          });
          sent++;
        }
      } catch (err) {
        status = 'error';
        error = err.message || String(err);
        errors++;
      }
      _setByHeader(sheet, contact.__row_index, headers, 'token', normalized.token);
      _setByHeader(sheet, contact.__row_index, headers, 'url_cuestionario', normalized.url_cuestionario);
      _setByHeader(sheet, contact.__row_index, headers, 'estado_envio', status);
      _setByHeader(sheet, contact.__row_index, headers, 'ultimo_envio', now);
      _setByHeader(sheet, contact.__row_index, headers, 'ultimo_error', error);
      _setByHeader(sheet, contact.__row_index, headers, 'cantidad_envios', (parseInt(contact.cantidad_envios || '0', 10) || 0) + 1);
      _setByHeader(sheet, contact.__row_index, headers, 'actualizado_en', now);
      _appendObject(SHEET_NAMES.R01_ENVIOS, R01_SEND_HEADERS, {
        id_envio: _genId('R01E'),
        fecha_hora: now,
        usuario: session.usuario || '',
        modo: dryRun ? 'simulacion' : 'real',
        distrito: normalized.distrito,
        codigo_local: normalized.codigo_local,
        id_escuela: normalized.id_escuela,
        nombre_escuela: normalized.nombre_escuela,
        director_nombre: normalized.director_nombre,
        correo: normalized.correo,
        celular: normalized.celular,
        asunto: subject,
        url_cuestionario: normalized.url_cuestionario,
        estado: status,
        error: error
      });
      items.push({ correo: normalized.correo, codigo_local: normalized.codigo_local, estado: status, error: error });
    });
    AuditService.log('R01_ENVIAR_CUESTIONARIO', session.usuario, `modo: ${dryRun ? 'simulacion' : 'real'}, distrito: ${distrito || 'todos'}, procesados: ${targets.length}, errores: ${errors}`);
    return {
      status: 'ok',
      message: dryRun ? 'Simulacion de envio completada.' : 'Envio de cuestionario inicial completado.',
      data: { processed: targets.length, sent, errors, dryRun, distrito, items },
    };
  }

  function guardarBorradorMec(params) {
    const session = params._session || {};
    const idEscuela = params.id_escuela || params.codigo_local || '';
    const codigoLocalParam = params.codigo_local || idEscuela || '';
    if (!idEscuela && !codigoLocalParam) {
      return { status: 'error', message: 'Identificador de escuela requerido para guardar el borrador MEC.' };
    }

    _ensureColumns(SHEET_NAMES.MEC_DRAFTS, _mecDraftHeaders());
    const draftId = _clientMutationId(params) || `MEC-DRAFT-${_safeKey(idEscuela || codigoLocalParam)}`;
    const existingIdx = _findRowIndex(SHEET_NAMES.MEC_DRAFTS, 'id_borrador', draftId);
    const sheet = _getSheet(SHEET_NAMES.MEC_DRAFTS);
    const headers = _headers(sheet);
    const now = _timestamp();
    const escuelaResult = idEscuela ? getEscuela(idEscuela) : { status: 'error' };
    const escuela = escuelaResult.status === 'ok' ? escuelaResult.data : {};
    if (!_canOperateSchool_(session, escuelaResult.status === 'ok' ? escuela : { id_escuela: idEscuela, codigo_local: codigoLocalParam })) {
      return _schoolAccessError_(escuelaResult.status === 'ok' ? escuela : { encuestador_asignado: '' });
    }
    const counts = params.counts || {};
    const evidenceIndex = Array.isArray(params.evidenceIndex) ? params.evidenceIndex : [];
    const timeTracking = _timeTrackingFromDraftParams(params);
    const timeFields = _draftTimeFields_(timeTracking);
    const createdAt = existingIdx !== -1 ? (_getByHeader(sheet, existingIdx, headers, 'creado_en') || now) : now;
    const draftStatus = _draftStatusFromParams_(params);
    const operationalStatus = _operationalStateFromDraft_(draftStatus, params.motivo, escuela.estado_relevamiento);
    const row = {
      id_borrador: draftId,
      id_escuela: escuela.id_escuela || params.id_escuela || '',
      codigo_local: params.codigo_local || escuela.codigo_local || codigoLocalParam,
      nombre_escuela: params.nombre_escuela || escuela.nombre || '',
      usuario: session.usuario || params.usuario_cliente || '',
      fecha_guardado: now,
      estado_borrador: draftStatus,
      motivo: params.motivo || '',
      app_version: params.app_version || '',
      schema_version: params.schema_version || '',
      bloques: counts.blocks || 0,
      pisos: counts.floors || 0,
      aulas: counts.classrooms || 0,
      otros_espacios: counts.otherSpaces || 0,
      sanitarios: counts.sanitaries || 0,
      exteriores: counts.siteElements || 0,
      evidencias: counts.evidence || evidenceIndex.length || 0,
      base_mapa_confirmada: params.resumen && params.resumen.baseMapConfirmed ? 'true' : 'false',
      tiempo_escuela_min: timeFields.tiempo_escuela_min,
      tiempo_aulas_min: timeFields.tiempo_aulas_min,
      tiempo_aulas_promedio_min: timeFields.tiempo_aulas_promedio_min,
      tiempo_sanitarios_min: timeFields.tiempo_sanitarios_min,
      tiempo_sanitarios_promedio_min: timeFields.tiempo_sanitarios_promedio_min,
      tiempo_exteriores_min: timeFields.tiempo_exteriores_min,
      tiempo_registro_json: _jsonForSheet(timeTracking || {}, 16000),
      resumen_json: _jsonForSheet(params.resumen || {}, 22000),
      draft_json: _jsonForSheet(params.values || {}, 45000),
      evidence_index_json: _jsonForSheet(evidenceIndex, 30000),
      creado_en: createdAt,
      actualizado_en: now,
    };

    if (existingIdx !== -1) {
      Object.entries(row).forEach(([key, value]) => _setByHeader(sheet, existingIdx, headers, key, value));
    } else {
      _appendObject(SHEET_NAMES.MEC_DRAFTS, _mecDraftHeaders(), row);
    }

    const escuelaIdForUpdate = row.id_escuela || row.codigo_local;
    if (escuelaIdForUpdate) {
      _updateEscuelaOperational(escuelaIdForUpdate, {
        estado_relevamiento: operationalStatus,
        fecha_ultimo_evento: now,
        ultimo_borrador_mec_id: draftId,
        ultimo_borrador_mec_at: now,
        ultimo_borrador_mec_usuario: row.usuario,
        tiempo_real_min: timeFields.tiempo_escuela_min,
        tiempo_aulas_min: timeFields.tiempo_aulas_min,
        tiempo_aulas_promedio_min: timeFields.tiempo_aulas_promedio_min,
        tiempo_sanitarios_min: timeFields.tiempo_sanitarios_min,
        tiempo_sanitarios_promedio_min: timeFields.tiempo_sanitarios_promedio_min,
        tiempo_exteriores_min: timeFields.tiempo_exteriores_min,
      });
    }
    let databaseSync = { status: 'pendiente_config' };
    try {
      databaseSync = _syncDraftToDatabase(params, row);
    } catch (err) {
      databaseSync = { status: 'error', error: err.message || String(err) };
    }
    AuditService.log('GUARDAR_BORRADOR_MEC', row.usuario || 'sistema', `id_borrador: ${draftId}, escuela: ${row.codigo_local || row.id_escuela}`);
    return {
      status: 'ok',
      message: 'Borrador MEC guardado en la hoja mec_borradores.',
      data: {
        id_borrador: draftId,
        sheet: SHEET_NAMES.MEC_DRAFTS,
        updatedAt: now,
        codigo_local: row.codigo_local,
        database_sync: databaseSync,
      },
    };
  }

  function listarFormulariosMec(params) {
    params = params || {};
    const session = params._session || {};
    if (!_isAuthorizedAdmin(session)) {
      return { status: 'error', message: 'Solo administradores autorizados pueden ver todos los formularios MEC.' };
    }

    let rows = [];
    try {
      rows = _sheetToObjects(SHEET_NAMES.MEC_DRAFTS);
    } catch (err) {
      return { status: 'ok', data: [], meta: { total: 0, error: 'Hoja mec_borradores no disponible: ' + err.message } };
    }

    const schoolIndex = _schoolIndexByIdentity_();
    let data = rows.map(function(row, index) {
      return _mecFormListRow_(row, index, schoolIndex);
    });

    if (params.usuario) data = data.filter(function(row) { return _same(row.usuario, params.usuario); });
    if (params.estado) data = data.filter(function(row) { return _same(row.estado_borrador, params.estado); });
    if (params.q) {
      const q = _txt(params.q).toLowerCase();
      data = data.filter(function(row) {
        return [
          row.id_borrador,
          row.id_escuela,
          row.codigo_local,
          row.nombre_escuela,
          row.usuario,
          row.departamento,
          row.distrito,
          row.estado_borrador,
        ].join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }

    data.sort(function(a, b) {
      return _mecRowMs_(b) - _mecRowMs_(a) || _txt(b.actualizado_en).localeCompare(_txt(a.actualizado_en));
    });

    const total = data.length;
    const limit = Math.max(1, Math.min(Number(_num(params.limit) || 250), 1000));
    const page = Math.max(1, Number(_num(params.page) || 1));
    const start = (page - 1) * limit;
    const pageRows = data.slice(start, start + limit);
    const resumen = {};
    data.forEach(function(row) {
      const user = row.usuario || 'sin_usuario';
      if (!resumen[user]) resumen[user] = { usuario: user, formularios: 0, finalizados: 0, en_curso: 0, elementos: 0, evidencias: 0 };
      resumen[user].formularios += 1;
      if (_same(row.estado_operativo, 'finalizada') || _same(row.estado_borrador, 'finalizado') || _same(row.estado_borrador, 'completo')) resumen[user].finalizados += 1;
      else resumen[user].en_curso += 1;
      resumen[user].elementos += Number(row.total_elementos || 0);
      resumen[user].evidencias += Number(row.evidencias || 0);
    });

    return {
      status: 'ok',
      data: pageRows,
      meta: {
        total: total,
        page: page,
        per_page: limit,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        usuarios: Object.keys(resumen).sort(),
        estados: Array.from(new Set(data.map(function(row) { return row.estado_borrador; }).filter(Boolean))).sort(),
        resumen_por_usuario: Object.values(resumen).sort(function(a, b) { return b.formularios - a.formularios || a.usuario.localeCompare(b.usuario); }),
      },
    };
  }

  function listarPerimetrosMec(params) {
    params = params || {};
    let rows = [];
    try {
      rows = _sheetToObjects(SHEET_NAMES.MEC_DRAFTS);
    } catch (err) {
      return { status: 'ok', data: [], meta: { total: 0, error: 'Hoja mec_borradores no disponible: ' + err.message } };
    }

    const schoolIndex = _schoolIndexByIdentity_();
    const latestBySchool = {};
    rows.forEach(function(row, index) {
      const candidate = Object.assign({ __row_order: index + 2 }, row || {});
      const perimeter = _mecPerimeterListRow_(candidate, index, schoolIndex);
      if (!perimeter) return;
      const key = _mecSchoolKey_(candidate) || _mecSchoolKey_(perimeter) || ('draft_' + index);
      const current = latestBySchool[key];
      if (!current || _mecRowMs_(candidate) >= _mecRowMs_(current.__row)) {
        latestBySchool[key] = Object.assign({}, perimeter, { __row: candidate });
      }
    });

    let data = Object.values(latestBySchool).map(function(row) {
      delete row.__row;
      return row;
    });

    if (params.usuario) data = data.filter(function(row) { return _same(row.usuario, params.usuario); });
    if (params.estado) data = data.filter(function(row) { return _same(row.estado_borrador, params.estado); });
    if (params.q) {
      const q = _txt(params.q).toLowerCase();
      data = data.filter(function(row) {
        return [
          row.id_borrador,
          row.id_escuela,
          row.codigo_local,
          row.nombre_escuela,
          row.usuario,
          row.departamento,
          row.distrito,
          row.estado_borrador,
        ].join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }

    data.sort(function(a, b) {
      return _txt(a.departamento).localeCompare(_txt(b.departamento))
        || _txt(a.distrito).localeCompare(_txt(b.distrito))
        || _txt(a.nombre_escuela).localeCompare(_txt(b.nombre_escuela));
    });

    return {
      status: 'ok',
      data: data,
      meta: {
        total: data.length,
        source: SHEET_NAMES.MEC_DRAFTS,
        generated_at: _timestamp(),
      },
    };
  }

  function _mecFormListRow_(row, index, schoolIndex) {
    row = Object.assign({ __row_order: index + 2 }, row || {});
    const draft = _mecParseJson_(row.draft_json) || {};
    const selected = draft.__selectedSchool || {};
    const key = _mecSchoolKey_(row) || _mecSchoolKey_(selected);
    const school = key && schoolIndex ? (schoolIndex[key] || {}) : {};
    const resumen = _mecParseJson_(row.resumen_json);
    const evidenceIndex = _mecParseJson_(row.evidence_index_json);
    const meta = _mecDraftMetadata_(row, resumen, evidenceIndex);
    const counts = meta.mec_draft_counts || {};
    return {
      id_borrador: _txt(row.id_borrador),
      id_escuela: _txt(row.id_escuela || selected.id_escuela || school.id_escuela),
      codigo_local: _txt(row.codigo_local || selected.codigo_local || school.codigo_local),
      nombre_escuela: _txt(row.nombre_escuela || selected.nombre || selected.nombre_escuela || school.nombre),
      departamento: _txt(selected.departamento || school.departamento),
      distrito: _txt(selected.distrito || school.distrito),
      localidad: _txt(selected.localidad || school.localidad),
      usuario: _txt(row.usuario),
      fecha_guardado: _txt(row.fecha_guardado),
      actualizado_en: _txt(row.actualizado_en || row.fecha_guardado || row.creado_en),
      estado_borrador: _txt(row.estado_borrador) || 'borrador',
      estado_operativo: _txt(school.estado_relevamiento),
      app_version: _txt(row.app_version),
      schema_version: _txt(row.schema_version),
      bloques: counts.bloques || 0,
      pisos: counts.pisos || 0,
      aulas: counts.aulas || 0,
      otros_espacios: counts.otros_espacios || 0,
      sanitarios: counts.sanitarios || 0,
      exteriores: counts.exteriores || 0,
      evidencias: meta.mec_draft_evidence_count || 0,
      total_elementos: meta.mec_draft_total_elementos || 0,
      base_mapa_confirmada: meta.mec_draft_base_mapa_confirmada || '',
      tiempo_escuela_min: Number(_num(row.tiempo_escuela_min) || 0),
      tiempo_aulas_min: Number(_num(row.tiempo_aulas_min) || 0),
      tiempo_sanitarios_min: Number(_num(row.tiempo_sanitarios_min) || 0),
      tiempo_exteriores_min: Number(_num(row.tiempo_exteriores_min) || 0),
      __row_order: index + 2,
    };
  }

  function _mecPerimeterListRow_(row, index, schoolIndex) {
    row = Object.assign({ __row_order: index + 2 }, row || {});
    const draft = _mecParseJson_(row.draft_json) || {};
    const values = draft.values || draft || {};
    const selected = values.__selectedSchool || draft.__selectedSchool || {};
    const key = _mecSchoolKey_(row) || _mecSchoolKey_(selected);
    const school = key && schoolIndex ? (schoolIndex[key] || schoolIndex[_digits(key)] || {}) : {};
    const boundary = _mecPropertyBoundaryFromDraft_(values);
    if (!boundary) return null;
    const vertices = _mecBoundaryVerticesFromItem_(boundary);
    if (vertices.length < 3) return null;
    const bounds = _mecBoundaryBounds_(vertices);
    const ficha = boundary.ficha || {};
    const measurements = _mecBoundaryMeasurements_(vertices);
    const perimeterText = measurements ? _mecFormatMeasure_(measurements.perimeter_m, 2) : _txt(ficha.perimetro_m || ficha.perimetro || '');
    const areaText = measurements ? _mecFormatMeasure_(measurements.area_m2, 2) : _txt(ficha.superficie_m2 || ficha.area_m2 || ficha.area || '');
    return {
      id_borrador: _txt(row.id_borrador),
      id_escuela: _txt(row.id_escuela || selected.id_escuela || school.id_escuela),
      codigo_local: _txt(row.codigo_local || selected.codigo_local || school.codigo_local),
      nombre_escuela: _txt(row.nombre_escuela || selected.nombre || selected.nombre_escuela || school.nombre),
      departamento: _txt(selected.departamento || school.departamento),
      distrito: _txt(selected.distrito || school.distrito),
      localidad: _txt(selected.localidad || school.localidad),
      usuario: _txt(row.usuario),
      fecha_guardado: _txt(row.fecha_guardado),
      actualizado_en: _txt(row.actualizado_en || row.fecha_guardado || row.creado_en),
      estado_borrador: _txt(row.estado_borrador) || 'borrador',
      app_version: _txt(row.app_version),
      base_mapa_confirmada: _txt(row.base_mapa_confirmada),
      perimetro_m: perimeterText,
      superficie_m2: areaText,
      area_ha: measurements ? _mecFormatMeasure_(measurements.area_ha, 4) : _txt(ficha.area_ha || ''),
      lados_m: measurements ? measurements.sides : [],
      lados_m_texto: measurements ? _mecSideText_(measurements, ' | ') : _txt(ficha.lados_m || ficha.lados || ''),
      medidas: measurements,
      vertices: vertices,
      vertices_count: vertices.length,
      bounds: bounds,
      plan_base_map: _mecPlanBaseMapFromDraft_(values),
      centro: bounds ? { lat: _roundCoord_((bounds.minLat + bounds.maxLat) / 2), lng: _roundCoord_((bounds.minLng + bounds.maxLng) / 2) } : null,
      identity_keys: [
        row.id_escuela,
        row.codigo_local,
        selected.id_escuela,
        selected.codigo_local,
        school.id_escuela,
        school.codigo_local,
        _digits(row.id_escuela),
        _digits(row.codigo_local),
      ].map(_txt).filter(Boolean),
      __row_order: index + 2,
    };
  }

  function _mecPropertyBoundaryFromDraft_(values) {
    const siteElements = _asArray_(values && values.__siteElements);
    for (let i = 0; i < siteElements.length; i++) {
      const item = siteElements[i] || {};
      if (_txt(item.type) === 'property_boundary') return item;
    }
    return null;
  }

  function _mecBoundaryVerticesFromItem_(item) {
    item = item || {};
    let vertices = _mecNormalizeBoundaryVertices_(item.geoVertices);
    if (vertices.length >= 3) return vertices;
    vertices = _mecNormalizeBoundaryVertices_(item.boundaryGeoVertices);
    if (vertices.length >= 3) return vertices;
    const ficha = item.ficha || {};
    vertices = _mecVerticesFromGeoJson_(ficha.vertices_geojson || ficha.geojson || ficha.predio_geojson);
    if (vertices.length >= 3) return vertices;
    vertices = _mecVerticesFromLatLonText_(ficha.vertices_latlon || ficha.vertices || '');
    if (vertices.length >= 3) return vertices;
    return [];
  }

  function _mecVerticesFromGeoJson_(value) {
    if (!value) return [];
    const geo = typeof value === 'string' ? _mecParseJson_(value) : value;
    const ring = geo && geo.type === 'Feature'
      ? (((geo.geometry || {}).coordinates || [])[0] || [])
      : (((geo || {}).coordinates || [])[0] || []);
    if (!Array.isArray(ring)) return [];
    return _mecNormalizeBoundaryVertices_(ring.map(function(coord) {
      return { lat: coord && coord[1], lng: coord && coord[0] };
    }));
  }

  function _mecVerticesFromLatLonText_(value) {
    const text = _txt(value);
    if (!text) return [];
    return _mecNormalizeBoundaryVertices_(text.split('|').map(function(part) {
      const pieces = _txt(part).split(',').map(function(item) { return _txt(item); });
      return { lat: pieces[0], lng: pieces[1] };
    }));
  }

  function _mecNormalizeBoundaryVertices_(vertices) {
    const rows = _asArray_(vertices).map(function(vertex) {
      const lat = Array.isArray(vertex) ? _num(vertex[0]) : _num(vertex && (vertex.lat || vertex.latitude));
      const lng = Array.isArray(vertex) ? _num(vertex[1]) : _num(vertex && (vertex.lng || vertex.lon || vertex.longitude));
      if (lat === '' || lng === '') return null;
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
      if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) return null;
      return { lat: _roundCoord_(latNum), lng: _roundCoord_(lngNum) };
    }).filter(Boolean);
    if (rows.length > 1) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (first && last && Math.abs(first.lat - last.lat) < 0.0000001 && Math.abs(first.lng - last.lng) < 0.0000001) rows.pop();
    }
    return rows;
  }

  function _mecBoundaryBounds_(vertices) {
    if (!Array.isArray(vertices) || vertices.length < 3) return null;
    const lats = vertices.map(function(v) { return Number(v.lat); }).filter(Number.isFinite);
    const lngs = vertices.map(function(v) { return Number(v.lng); }).filter(Number.isFinite);
    if (lats.length < 3 || lngs.length < 3) return null;
    return {
      minLat: _roundCoord_(Math.min.apply(null, lats)),
      maxLat: _roundCoord_(Math.max.apply(null, lats)),
      minLng: _roundCoord_(Math.min.apply(null, lngs)),
      maxLng: _roundCoord_(Math.max.apply(null, lngs)),
    };
  }

  function _mecRad_(deg) {
    return (Number(deg) || 0) * Math.PI / 180;
  }

  function _mecRoundMeasure_(value, decimals) {
    decimals = decimals === undefined ? 2 : decimals;
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function _mecFormatMeasure_(value, decimals) {
    decimals = decimals === undefined ? 2 : decimals;
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return num.toFixed(decimals);
  }

  function _mecDistanceMeters_(a, b) {
    const radius = 6371008.8;
    const lat1 = _mecRad_(a && a.lat);
    const lat2 = _mecRad_(b && b.lat);
    const dLat = _mecRad_(Number(b && b.lat) - Number(a && a.lat));
    const dLng = _mecRad_(Number(b && b.lng) - Number(a && a.lng));
    const h = Math.pow(Math.sin(dLat / 2), 2)
      + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }

  function _mecProjectionOrigin_(vertices) {
    const count = vertices.length || 1;
    return {
      lat: vertices.reduce(function(sum, vertex) { return sum + Number(vertex.lat || 0); }, 0) / count,
      lng: vertices.reduce(function(sum, vertex) { return sum + Number(vertex.lng || 0); }, 0) / count,
    };
  }

  function _mecProjectedPoint_(vertex, origin) {
    const radius = 6371008.8;
    const originLat = _mecRad_(origin.lat);
    return {
      x: radius * (_mecRad_(vertex.lng) - _mecRad_(origin.lng)) * Math.cos(originLat),
      y: radius * (_mecRad_(vertex.lat) - _mecRad_(origin.lat)),
    };
  }

  function _mecPolygonAreaM2_(vertices) {
    if (!Array.isArray(vertices) || vertices.length < 3) return 0;
    const origin = _mecProjectionOrigin_(vertices);
    const points = vertices.map(function(vertex) { return _mecProjectedPoint_(vertex, origin); });
    let acc = 0;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      acc += points[i].x * next.y - next.x * points[i].y;
    }
    return Math.abs(acc) / 2;
  }

  function _mecExtentMeters_(vertices) {
    const bounds = _mecBoundaryBounds_(vertices);
    if (!bounds) return { width_m: 0, height_m: 0, largo_m: 0, ancho_m: 0 };
    const midLat = (Number(bounds.minLat) + Number(bounds.maxLat)) / 2;
    const midLng = (Number(bounds.minLng) + Number(bounds.maxLng)) / 2;
    const width = _mecDistanceMeters_({ lat: midLat, lng: bounds.minLng }, { lat: midLat, lng: bounds.maxLng });
    const height = _mecDistanceMeters_({ lat: bounds.minLat, lng: midLng }, { lat: bounds.maxLat, lng: midLng });
    return {
      width_m: _mecRoundMeasure_(width, 2),
      height_m: _mecRoundMeasure_(height, 2),
      largo_m: _mecRoundMeasure_(Math.max(width, height), 2),
      ancho_m: _mecRoundMeasure_(Math.min(width, height), 2),
    };
  }

  function _mecBoundaryMeasurements_(vertices) {
    if (!Array.isArray(vertices) || vertices.length < 3) return null;
    const sides = vertices.map(function(vertex, index) {
      const nextIndex = (index + 1) % vertices.length;
      return {
        index: index + 1,
        label: 'L' + (index + 1),
        from: index + 1,
        to: nextIndex + 1,
        length_m: _mecRoundMeasure_(_mecDistanceMeters_(vertex, vertices[nextIndex]), 2),
      };
    });
    const perimeter = sides.reduce(function(sum, side) { return sum + Number(side.length_m || 0); }, 0);
    const area = _mecPolygonAreaM2_(vertices);
    return {
      valid: true,
      vertices_count: vertices.length,
      perimeter_m: _mecRoundMeasure_(perimeter, 2),
      area_m2: _mecRoundMeasure_(area, 2),
      area_ha: _mecRoundMeasure_(area / 10000, 4),
      extent: _mecExtentMeters_(vertices),
      sides: sides,
      side_lengths_m: sides.map(function(side) { return side.length_m; }),
      method: 'haversine_sides_local_projection_area',
    };
  }

  function _mecSideText_(measurement, separator) {
    separator = separator === undefined ? '\n' : separator;
    const sides = Array.isArray(measurement && measurement.sides) ? measurement.sides : [];
    return sides.map(function(side) {
      return (side.label || ('L' + side.index)) + ': ' + _mecFormatMeasure_(side.length_m, 2) + ' m';
    }).join(separator);
  }

  function _mecPlanBaseMapFromDraft_(values) {
    const baseMap = (values && values.__planBaseMap) || {};
    const lat = _num(baseMap.lat);
    const lng = _num(baseMap.lng);
    if (lat === '' || lng === '') return null;
    return {
      lat: Number(lat),
      lng: Number(lng),
      zoom: _num(baseMap.zoom),
      scale: _num(baseMap.scale),
      offsetX: _num(baseMap.offsetX),
      offsetY: _num(baseMap.offsetY),
      rotationDeg: _num(baseMap.rotationDeg || baseMap.rotacion_grados),
      source: _txt(baseMap.source),
      enabled: _isTrueish(baseMap.enabled),
      confirmed: _isTrueish(baseMap.confirmed),
      schoolLat: _num(baseMap.schoolLat),
      schoolLng: _num(baseMap.schoolLng),
      schoolCoordinateCorrected: _isTrueish(baseMap.schoolCoordinateCorrected),
    };
  }

  function _schoolIndexByIdentity_() {
    const index = {};
    try {
      const source = _escuelasRawRows_();
      source.rows
        .map(function(r, idx) { return _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || idx + 2); })
        .forEach(function(school) {
          [_digits(school.codigo_local), _digits(school.id_escuela), _txt(school.codigo_local), _txt(school.id_escuela)]
            .filter(Boolean)
            .forEach(function(key) { index[key] = school; });
        });
    } catch (err) {
      return index;
    }
    return index;
  }

  function reiniciarRelevamientoEscuela(params) {
    const session = params._session || {};
    const idEscuela = params.id_escuela || params.codigo_local || '';
    const codigoLocalParam = params.codigo_local || idEscuela || '';
    if (!idEscuela && !codigoLocalParam) {
      return { status: 'error', message: 'Identificador de escuela requerido para reiniciar el relevamiento.' };
    }
    const now = _timestamp();
    const escuelaResult = idEscuela ? getEscuela(idEscuela) : { status: 'error' };
    const escuela = escuelaResult.status === 'ok'
      ? escuelaResult.data
      : { id_escuela: idEscuela, codigo_local: codigoLocalParam, encuestador_asignado: '' };
    if (!_canOperateSchool_(session, escuela)) return _schoolAccessError_(escuela);

    const removedDrafts = _deleteMecDraftRowsForSchool_(idEscuela, codigoLocalParam);
    const resetId = escuela.id_escuela || idEscuela || codigoLocalParam;
    if (resetId) {
      _updateEscuelaOperational(resetId, {
        estado_relevamiento: 'pendiente',
        fecha_ultimo_evento: now,
        ultimo_borrador_mec_id: '',
        ultimo_borrador_mec_at: '',
        ultimo_borrador_mec_usuario: '',
        ultimo_cierre_id: '',
        ultimo_cierre_at: '',
        ultimo_cierre_pdf_url: '',
        ultimo_cierre_metadata_url: '',
        email_status: '',
        email_error: '',
        tiempo_real_min: '',
        tiempo_aulas_min: '',
        tiempo_aulas_promedio_min: '',
        tiempo_sanitarios_min: '',
        tiempo_sanitarios_promedio_min: '',
        tiempo_exteriores_min: '',
      });
    }
    const closedSessions = _suspendOpenSessionsForSchool_(resetId || idEscuela || codigoLocalParam, session.usuario, now);
    AuditService.log('REINICIAR_RELEVAMIENTO_ESCUELA', session.usuario || 'sistema', `escuela: ${codigoLocalParam || idEscuela}, borradores_eliminados: ${removedDrafts}, sesiones_suspendidas: ${closedSessions}`);
    return {
      status: 'ok',
      message: 'Relevamiento de escuela reiniciado.',
      data: {
        borradores_eliminados: removedDrafts,
        sesiones_suspendidas: closedSessions,
        updatedAt: now,
      },
    };
  }

  function _deleteMecDraftRowsForSchool_(idEscuela, codigoLocal) {
    _ensureColumns(SHEET_NAMES.MEC_DRAFTS, _mecDraftHeaders());
    const sheet = _getSheet(SHEET_NAMES.MEC_DRAFTS);
    const headers = _headers(sheet);
    let removed = 0;
    for (let row = sheet.getLastRow(); row >= 2; row -= 1) {
      const obj = _objectFromRow(sheet, row, headers);
      const matches = _draftRowMatchesSchoolId_(obj, idEscuela)
        || _draftRowMatchesSchoolId_(obj, codigoLocal)
        || _same(obj.id_borrador, `MEC-DRAFT-${_safeKey(idEscuela || codigoLocal)}`)
        || _same(obj.id_borrador, `MEC-DRAFT-${_safeKey(codigoLocal || idEscuela)}`);
      if (!matches) continue;
      sheet.deleteRow(row);
      removed += 1;
    }
    return removed;
  }

  function _draftRowMatchesSchoolId_(obj, id) {
    if (!_txt(id)) return false;
    return _idMatch({ id_escuela: obj.id_escuela, codigo_local: obj.codigo_local }, id);
  }

  function _suspendOpenSessionsForSchool_(idEscuela, usuario, now) {
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const sheet = _getSheet(SHEET_NAMES.SESIONES);
    const headers = _headers(sheet);
    let count = 0;
    for (let row = 2; row <= sheet.getLastRow(); row += 1) {
      const obj = _objectFromRow(sheet, row, headers);
      if (!_idMatch({ id_escuela: obj.id_escuela, codigo_local: obj.codigo_local }, idEscuela)) continue;
      if (!_isOpenSession_(obj)) continue;
      if (usuario && !_same(obj.usuario, usuario)) continue;
      _setByHeader(sheet, row, headers, 'fecha_fin', _date(new Date()));
      _setByHeader(sheet, row, headers, 'hora_fin', _time(new Date()));
      _setByHeader(sheet, row, headers, 'fin_iso', new Date().toISOString());
      _setByHeader(sheet, row, headers, 'estado', 'suspendida');
      _setByHeader(sheet, row, headers, 'observacion_cierre', 'Sesion suspendida por reinicio completo del relevamiento de la escuela.');
      _setByHeader(sheet, row, headers, 'actualizado_en', now);
      count += 1;
    }
    return count;
  }

  function guardarCierreCompleto(params) {
    const session = params._session || {};
    const deliveryId = _clientMutationId(params) || _genId('ENT');
    const now = _timestamp();
    _ensureColumns(SHEET_NAMES.ENTREGAS, _entregasHeaders());
    const existingIdx = _findRowIndex(SHEET_NAMES.ENTREGAS, 'id_entrega', deliveryId);
    if (existingIdx !== -1) {
      const sheet = _getSheet(SHEET_NAMES.ENTREGAS);
      const headers = _headers(sheet);
      const existing = _objectFromRow(sheet, existingIdx, headers);
      _markSchoolFinalizedFromDelivery_(existing, params, existing.fecha_cierre || now);
      _ensureSessionFromFinalDelivery_(existing, params, null, existing.fecha_cierre || now);
      return {
        status: 'ok',
        message: 'El cierre completo ya estaba registrado.',
        data: existing,
      };
    }

    const idEscuela = params.id_escuela || params.codigo_local || '';
    const escuelaResult = idEscuela ? getEscuela(idEscuela) : { status: 'error' };
    const escuela = escuelaResult.status === 'ok' ? escuelaResult.data : {};
    if (!_canOperateSchool_(session, escuelaResult.status === 'ok' ? escuela : { id_escuela: idEscuela, codigo_local: params.codigo_local || '' })) {
      return _schoolAccessError_(escuelaResult.status === 'ok' ? escuela : { encuestador_asignado: '' });
    }
    const codigoLocal = params.codigo_local || escuela.codigo_local || '';
    const nombreEscuela = params.nombre_escuela || escuela.nombre || '';
    const recipient = params.destinatario_email || _config('FINAL_REPORT_EMAIL', 'censoescuelaspy@gmail.com');
    const subject = params.asunto_email || `CIALPA cierre completo - ${codigoLocal || idEscuela || 'sin codigo'}`;
    const metadata = params.metadata || {};
    const closeTimeFields = _draftTimeFields_(metadata.timeTracking || params.timeTracking || (params.resumen && params.resumen.timeTracking) || {});
    const pendingCount = Array.isArray(params.completion?.pending) ? params.completion.pending.length : 0;
    const row = {
      id_entrega: deliveryId,
      id_escuela: escuela.id_escuela || params.id_escuela || '',
      codigo_local: codigoLocal,
      nombre_escuela: nombreEscuela,
      usuario: session.usuario,
      fecha_cierre: now,
      destinatario_email: recipient,
      estado_cierre: pendingCount ? 'con_pendientes' : 'completo',
      pendientes: pendingCount,
      email_status: 'pendiente',
      email_error: '',
      pdf_file_id: '',
      pdf_url: '',
      metadata_file_id: '',
      metadata_url: '',
      resumen_json: _jsonForSheet(params.resumen || {}, 45000),
      metadata_json: _jsonForSheet(metadata, 45000),
      plan_model_json: _jsonForSheet(params.planModel || {}, 45000),
      evidence_count: Array.isArray(params.evidenceIndex) ? params.evidenceIndex.length : '',
      creado_en: now,
      actualizado_en: now,
    };
    _appendObject(SHEET_NAMES.ENTREGAS, _entregasHeaders(), row);
    let rowIdx = _findRowIndex(SHEET_NAMES.ENTREGAS, 'id_entrega', deliveryId);
    _markSchoolFinalizedFromDelivery_(row, params, now, closeTimeFields);
    _ensureSessionFromFinalDelivery_(row, params, closeTimeFields, now);

    try {
      const folder = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);
      const baseName = _safeEvidenceFilename(`cialpa_cierre_${codigoLocal || idEscuela || deliveryId}_${Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmmss')}`).replace(/\.[^.]+$/, '');
      const metadataJson = JSON.stringify({
        id_entrega: deliveryId,
        generado_en: now,
        usuario: session.usuario,
        resumen: params.resumen || {},
        completion: params.completion || {},
        metadata,
        evidenceIndex: params.evidenceIndex || [],
      }, null, 2);
      const metadataBlob = Utilities.newBlob(metadataJson, 'application/json', `${baseName}_metadata.json`);
      const metadataFile = folder.createFile(metadataBlob);
      const pdfResult = _createFinalPdfFile_(folder, params.pdfHtml || '', baseName);
      const attachments = [metadataBlob];
      if (pdfResult.blob) attachments.unshift(pdfResult.blob);

      row.pdf_file_id = pdfResult.id || '';
      row.pdf_url = pdfResult.url || '';
      row.metadata_file_id = metadataFile.getId();
      row.metadata_url = metadataFile.getUrl();
      row.email_error = pdfResult.error || '';
      try {
        MailApp.sendEmail({
          to: recipient,
          subject,
          htmlBody: _finalDeliveryEmailHtml(params, {
            deliveryId,
            codigoLocal,
            nombreEscuela,
            pdfUrl: row.pdf_url,
            metadataUrl: row.metadata_url,
            usuario: session.usuario,
            now,
          }),
          attachments,
        });
        row.email_status = 'enviado';
      } catch (err) {
        row.email_status = 'error';
        row.email_error = [row.email_error, err.message].filter(Boolean).join(' | ');
      }
    } catch (err) {
      row.email_status = 'error';
      row.email_error = [row.email_error, err.message || String(err)].filter(Boolean).join(' | ');
    }

    row.actualizado_en = _timestamp();
    if (rowIdx === -1) rowIdx = _findRowIndex(SHEET_NAMES.ENTREGAS, 'id_entrega', deliveryId);
    if (rowIdx !== -1) {
      const sheet = _getSheet(SHEET_NAMES.ENTREGAS);
      const headers = _headers(sheet);
      Object.entries(row).forEach(([key, value]) => _setByHeader(sheet, rowIdx, headers, key, value));
    }
    _markSchoolFinalizedFromDelivery_(row, params, now, closeTimeFields);
    AuditService.log('CIERRE_COMPLETO', session.usuario, `id_entrega: ${deliveryId}, escuela: ${codigoLocal || idEscuela}, email: ${row.email_status}`);
    return {
      status: 'ok',
      message: row.email_status === 'enviado' ? 'Cierre completo guardado y enviado por correo.' : 'Cierre completo guardado; correo/PDF pendiente de revision.',
      data: row,
    };
  }

  function repararEstadosFinalizadosDesdeCierres() {
    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    _ensureColumns(SHEET_NAMES.ENTREGAS, _entregasHeaders());
    const sheet = _getSheet(SHEET_NAMES.ENTREGAS);
    const headers = _headers(sheet);
    const lastRow = sheet.getLastRow();
    const now = _timestamp();
    let updated = 0;
    let skipped = 0;
    if (lastRow < 2) {
      return { status: 'ok', message: 'No hay cierres registrados para reparar.', data: { updated, skipped } };
    }
    for (let rowIdx = 2; rowIdx <= lastRow; rowIdx++) {
      const row = _objectFromRow(sheet, rowIdx, headers);
      const status = _txt(row.estado_cierre).toLowerCase();
      if (status && status !== 'completo' && status !== 'con_pendientes') {
        skipped += 1;
        continue;
      }
      if (_markSchoolFinalizedFromDelivery_(row, {}, row.fecha_cierre || now)) updated += 1;
      else skipped += 1;
    }
    return {
      status: 'ok',
      message: `Reparacion completada. Escuelas finalizadas actualizadas: ${updated}. Omitidas: ${skipped}.`,
      data: { updated, skipped },
    };
  }

  function _markSchoolFinalizedFromDelivery_(row, params, now, timeFields) {
    row = row || {};
    params = params || {};
    const id = row.id_escuela || row.codigo_local || params.id_escuela || params.codigo_local || '';
    if (!id) return false;
    const metadata = params.metadata || {};
    const timeSource = metadata.timeTracking || params.timeTracking || (params.resumen && params.resumen.timeTracking) || null;
    const finalTimeFields = timeFields || _draftTimeFields_(timeSource || {});
    const update = {
      estado_relevamiento: 'finalizada',
      fecha_ultimo_evento: now || row.fecha_cierre || _timestamp(),
      ultimo_cierre_id: row.id_entrega || _clientMutationId(params) || '',
      ultimo_pdf_url: row.pdf_url || '',
      ultimo_metadata_url: row.metadata_url || '',
      email_cierre_estado: row.email_status || '',
      email_cierre_destino: row.destinatario_email || params.destinatario_email || '',
    };
    if (timeFields || timeSource) {
      Object.assign(update, {
        tiempo_real_min: finalTimeFields.tiempo_escuela_min,
        tiempo_aulas_min: finalTimeFields.tiempo_aulas_min,
        tiempo_aulas_promedio_min: finalTimeFields.tiempo_aulas_promedio_min,
        tiempo_sanitarios_min: finalTimeFields.tiempo_sanitarios_min,
        tiempo_sanitarios_promedio_min: finalTimeFields.tiempo_sanitarios_promedio_min,
        tiempo_exteriores_min: finalTimeFields.tiempo_exteriores_min,
      });
    }
    return _updateEscuelaOperational(id, update);
  }

  function _ensureSessionFromFinalDelivery_(row, params, timeFields, nowText) {
    row = row || {};
    params = params || {};
    const session = params._session || {};
    const usuario = _txt(row.usuario || session.usuario || params.usuario_cliente);
    const idEscuela = _txt(row.id_escuela || params.id_escuela || row.codigo_local || params.codigo_local);
    if (!usuario || !idEscuela) return false;

    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const sheet = _getSheet(SHEET_NAMES.SESIONES);
    const headers = _headers(sheet);
    const escuelaResult = getEscuela(idEscuela);
    const escuela = escuelaResult.status === 'ok'
      ? escuelaResult.data
      : {
        id_escuela: row.id_escuela || params.id_escuela || idEscuela,
        codigo_local: row.codigo_local || params.codigo_local || idEscuela,
        nombre: row.nombre_escuela || params.nombre_escuela || '',
      };
    const sessionId = row.id_entrega ? `SES-${_safeKey(row.id_entrega).slice(0, 80)}` : _genId('SES');
    const rows = _sheetToObjects(SHEET_NAMES.SESIONES)
      .map((item, index) => Object.assign({ __row_index: index + 2 }, item));
    const existing = rows.find(item => _txt(item.id_sesion) === sessionId || (row.id_entrega && _txt(item.folio_externo) === _txt(row.id_entrega)))
      || rows.find(item => _same(item.usuario, usuario) && _sameSessionSchool_(item, escuela, idEscuela) && _isOpenSession_(item));

    const end = new Date();
    const minutes = Math.max(1, Math.round(Number(timeFields && timeFields.tiempo_escuela_min) || Number(row.tiempo_escuela_min) || 1));
    const seconds = minutes * 60;
    const start = new Date(end.getTime() - seconds * 1000);
    const fechaInicio = existing ? (_formatDateCell_(existing.fecha_inicio) || _date(start)) : _date(start);
    const horaInicio = existing ? (_formatTimeCell_(existing.hora_inicio) || _time(start)) : _time(start);
    const inicioIso = existing ? (_formatIsoCell_(existing.inicio_iso) || start.toISOString()) : start.toISOString();
    const update = {
      id_sesion: existing ? (existing.id_sesion || sessionId) : sessionId,
      id_escuela: escuela.id_escuela || row.id_escuela || idEscuela,
      codigo_local: escuela.codigo_local || row.codigo_local || '',
      nombre_escuela: escuela.nombre || row.nombre_escuela || params.nombre_escuela || '',
      usuario,
      supervisor: escuela.supervisor_asignado || existing?.supervisor || '',
      fecha_inicio: fechaInicio,
      hora_inicio: horaInicio,
      inicio_iso: inicioIso,
      fecha_fin: _date(end),
      hora_fin: _time(end),
      fin_iso: end.toISOString(),
      duracion_minutos: existing && existing.duracion_minutos ? existing.duracion_minutos : minutes,
      duracion_segundos: existing && existing.duracion_segundos ? existing.duracion_segundos : seconds,
      estado: 'finalizada',
      observacion_cierre: row.pendientes
        ? `Cierre final CIALPA con ${row.pendientes} pendiente(s).`
        : 'Cierre final CIALPA registrado desde Registro guiado.',
      url_formulario_usada: existing?.url_formulario_usada || '',
      launch_mode: existing?.launch_mode || 'registro_guiado',
      dispositivo: existing?.dispositivo || params.dispositivo || '',
      gps_inicio_lat: existing?.gps_inicio_lat || '',
      gps_inicio_lng: existing?.gps_inicio_lng || '',
      gps_fin_lat: existing?.gps_fin_lat || '',
      gps_fin_lng: existing?.gps_fin_lng || '',
      folio_externo: row.id_entrega || params.clientMutationId || '',
      ultimo_registro_externo: 'Registro guiado CIALPA',
      modulos_completados: existing?.modulos_completados || '',
      total_modulos: existing?.total_modulos || MODULE_DEFAULTS.length,
      calidad_cierre: row.pendientes ? 'cierre_con_pendientes_confirmado' : 'completo_confirmado',
      creado_en: existing?.creado_en || _timestamp(),
      actualizado_en: _timestamp(),
    };

    if (existing && existing.__row_index) {
      Object.entries(update).forEach(([key, value]) => _setByHeader(sheet, existing.__row_index, headers, key, value));
    } else {
      _appendObject(SHEET_NAMES.SESIONES, _sesionesHeaders(), update);
    }
    _logEvento(update.id_sesion, update.id_escuela, usuario, 'CIERRE_SESION', `Cierre final desde entrega ${row.id_entrega || ''}`);
    return true;
  }

  function _createFinalPdfFile_(folder, pdfHtml, baseName) {
    if (!pdfHtml) return { id: '', url: '', error: 'La vista PDF no llego al servidor.' };
    try {
      const htmlBlob = Utilities.newBlob(pdfHtml, 'text/html', `${baseName}.html`);
      const pdfBlob = htmlBlob.getAs(MimeType.PDF).setName(`${baseName}.pdf`);
      const file = folder.createFile(pdfBlob);
      return { id: file.getId(), url: file.getUrl(), blob: pdfBlob };
    } catch (err) {
      const htmlFile = folder.createFile(Utilities.newBlob(pdfHtml, 'text/html', `${baseName}.html`));
      return {
        id: htmlFile.getId(),
        url: htmlFile.getUrl(),
        error: `No se pudo convertir a PDF en Apps Script; se guardo HTML imprimible: ${err.message}`,
      };
    }
  }

  function _finalDeliveryEmailHtml(params, links) {
    const counts = params.completion?.counts || params.metadata?.counts || {};
    return `
      <p>Se registro un cierre completo CIALPA.</p>
      <ul>
        <li><b>Entrega:</b> ${links.deliveryId}</li>
        <li><b>Escuela:</b> ${links.codigoLocal || ''} - ${links.nombreEscuela || ''}</li>
        <li><b>Usuario:</b> ${links.usuario}</li>
        <li><b>Fecha:</b> ${links.now}</li>
        <li><b>Bloques:</b> ${counts.blocks || 0}</li>
        <li><b>Ambientes:</b> ${counts.rooms || counts.classrooms || 0}</li>
        <li><b>Sanitarios:</b> ${counts.sanitaries || 0}</li>
        <li><b>Exteriores:</b> ${counts.siteElements || 0}</li>
      </ul>
      <p>PDF: <a href="${links.pdfUrl || ''}">${links.pdfUrl || 'Adjunto / pendiente'}</a></p>
      <p>Metadatos: <a href="${links.metadataUrl || ''}">${links.metadataUrl || 'Adjunto'}</a></p>`;
  }

  function _jsonForSheet(value, maxChars) {
    const json = JSON.stringify(value || {});
    if (json.length <= maxChars) return json;
    return json.slice(0, Math.max(0, maxChars - 32)) + '... [truncado]';
  }

  function _mimeFromDataUrl(dataUrl) {
    const match = String(dataUrl || '').match(/^data:([^;]+);base64,/);
    return match ? match[1] : '';
  }

  function _safeEvidenceFilename(value) {
    const cleaned = String(value || 'evidencia.jpg')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 180);
    return cleaned || `evidencia_${Date.now()}.jpg`;
  }

  function _safeEvidenceFolderName(value) {
    const cleaned = String(value || 'sin_escuela')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, ' - ')
      .trim()
      .slice(0, 180);
    return cleaned || 'sin_escuela';
  }

  function getIncidencias(params) {
    const session = params._session;
    let rows = _sheetToObjects(SHEET_NAMES.INCIDENCIAS);
    if (session.rol === 'encuestador') rows = rows.filter(r => String(r.usuario) === String(session.usuario));
    if (params.estado) rows = rows.filter(r => _same(r.estado_resolucion, params.estado));
    if (params.prioridad) rows = rows.filter(r => _same(r.prioridad, params.prioridad));
    const escuelas = _escuelasMap();
    rows.forEach(r => {
      const keys = _schoolIdentityCandidates_(r.id_escuela, r.codigo_local);
      const e = keys.map(key => escuelas[key]).find(Boolean) || {};
      r.codigo_local = r.codigo_local || e.codigo_local || '';
      r.nombre_escuela = r.nombre_escuela || e.nombre || r.id_escuela || r.codigo_local || 'Sin escuela';
      r.departamento = r.departamento || e.departamento || '';
      r.distrito = r.distrito || e.distrito || '';
      r.localidad = r.localidad || e.localidad || '';
    });
    rows.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
    return { status: 'ok', data: rows };
  }

  function resolverIncidencia(params) {
    const session = params._session;
    if (session.rol === 'encuestador') return { status: 'error', message: 'No tenés permiso para resolver incidencias.' };
    const rowIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', params.id_incidencia);
    if (rowIdx === -1) return { status: 'error', message: 'Incidencia no encontrada.' };
    const sheet = _getSheet(SHEET_NAMES.INCIDENCIAS);
    const headers = _headers(sheet);
    _setByHeader(sheet, rowIdx, headers, 'estado_resolucion', 'resuelto');
    _setByHeader(sheet, rowIdx, headers, 'evidencia_url', params.resolucion || '');
    AuditService.log('RESOLVER_INCIDENCIA', session.usuario, `id: ${params.id_incidencia}`);
    return { status: 'ok', message: 'Incidencia resuelta.' };
  }

  function saveComentarioApp(params) {
    const session = params._session;
    _ensureColumns(SHEET_NAMES.APP_FEEDBACK, APP_FEEDBACK_HEADERS);
    const requestedId = _clientMutationId(params);
    if (requestedId) {
      const existingIdx = _findRowIndex(SHEET_NAMES.APP_FEEDBACK, 'id_comentario', requestedId);
      if (existingIdx !== -1) {
        return { status: 'ok', message: 'Comentario offline ya sincronizado.', data: { id_comentario: requestedId } };
      }
    }

    const titulo = _txt(params.titulo);
    const descripcion = _txt(params.descripcion);
    if (!titulo || !descripcion) return { status: 'error', message: 'Titulo y comentario son obligatorios.' };

    const id = requestedId || _genId('APPFB');
    const nombre = `${session.nombres || ''} ${session.apellidos || ''}`.trim() || session.usuario || '';
    _appendObject(SHEET_NAMES.APP_FEEDBACK, APP_FEEDBACK_HEADERS, {
      id_comentario: id,
      fecha_hora: _timestamp(),
      usuario: session.usuario,
      nombre_usuario: nombre,
      rol: session.rol || '',
      categoria: _txt(params.categoria) || 'mejora',
      modulo: _txt(params.modulo) || 'Vista no identificada',
      prioridad: _txt(params.prioridad) || 'media',
      titulo,
      descripcion,
      pasos_reproduccion: _txt(params.pasos_reproduccion),
      url: _txt(params.url),
      app_version: _txt(params.app_version),
      user_agent: _txt(params.user_agent),
      viewport: _txt(params.viewport),
      estado: 'pendiente',
      respuesta_admin: '',
      usuario_admin: '',
      fecha_resolucion: ''
    });
    AuditService.log('SAVE_COMENTARIO_APP', session.usuario, `id: ${id}, modulo: ${params.modulo || ''}`);
    return { status: 'ok', message: 'Comentario registrado.', data: { id_comentario: id } };
  }

  function getComentariosApp(params) {
    const session = params._session;
    _ensureColumns(SHEET_NAMES.APP_FEEDBACK, APP_FEEDBACK_HEADERS);
    let rows = _sheetToObjects(SHEET_NAMES.APP_FEEDBACK);
    if (String(session.rol || '').toLowerCase() !== 'admin') {
      rows = rows.filter(row => _same(row.usuario, session.usuario));
    }
    if (params.estado) rows = rows.filter(row => _same(row.estado, params.estado));
    if (params.prioridad) rows = rows.filter(row => _same(row.prioridad, params.prioridad));
    rows.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
    return { status: 'ok', data: rows };
  }

  function resolverComentarioApp(params) {
    const session = params._session;
    if (String(session.rol || '').toLowerCase() !== 'admin') {
      return { status: 'error', message: 'Solo administradores pueden gestionar comentarios de la app.' };
    }
    _ensureColumns(SHEET_NAMES.APP_FEEDBACK, APP_FEEDBACK_HEADERS);
    const id = params.id_comentario || params.id;
    if (!id) return { status: 'error', message: 'Identificador de comentario requerido.' };
    const rowIdx = _findRowIndex(SHEET_NAMES.APP_FEEDBACK, 'id_comentario', id);
    if (rowIdx === -1) return { status: 'error', message: 'Comentario no encontrado.' };

    const allowed = ['pendiente', 'en_revision', 'resuelto', 'descartado'];
    const estado = allowed.includes(String(params.estado || '').toLowerCase())
      ? String(params.estado).toLowerCase()
      : 'resuelto';
    const sheet = _getSheet(SHEET_NAMES.APP_FEEDBACK);
    const headers = _headers(sheet);
    _setByHeader(sheet, rowIdx, headers, 'estado', estado);
    _setByHeader(sheet, rowIdx, headers, 'respuesta_admin', params.respuesta_admin || params.resolucion || '');
    _setByHeader(sheet, rowIdx, headers, 'usuario_admin', session.usuario);
    _setByHeader(sheet, rowIdx, headers, 'fecha_resolucion', _timestamp());
    AuditService.log('RESOLVER_COMENTARIO_APP', session.usuario, `id: ${id}, estado: ${estado}`);
    return { status: 'ok', message: 'Comentario actualizado.' };
  }

  function getConfig() {
    const rows = _sheetToObjects(SHEET_NAMES.CONFIG);
    return { status: 'ok', data: rows };
  }

  function setConfig(params) {
    const session = params._session;
    if (!_isAuthorizedAdmin(session)) return { status: 'error', message: 'Solo administradores autorizados pueden cambiar la configuración.' };
    const rowIdx = _findRowIndex(SHEET_NAMES.CONFIG, 'clave', params.clave);
    if (rowIdx === -1) return { status: 'error', message: `Clave de configuración "${params.clave}" no encontrada.` };
    const sheet = _getSheet(SHEET_NAMES.CONFIG);
    const headers = _headers(sheet);
    const editable = _getByHeader(sheet, rowIdx, headers, 'editable');
    if (String(editable).toLowerCase() !== 'true') return { status: 'error', message: 'Esta configuración no es editable.' };
    _setByHeader(sheet, rowIdx, headers, 'valor', params.valor);
    _setByHeader(sheet, rowIdx, headers, 'fecha_actualizacion', _timestamp());
    AuditService.log('SET_CONFIG', session.usuario, `clave: ${params.clave}`);
    return { status: 'ok', message: 'Configuración guardada.' };
  }

  function _mecInfrastructureStats_() {
    let rows = [];
    try {
      rows = _sheetToObjects(SHEET_NAMES.MEC_DRAFTS);
    } catch (err) {
      return {
        source: 'mec_borradores',
        generated_at: _timestamp(),
        escuelas_con_borrador: 0,
        borradores_total: 0,
        error: 'Hoja mec_borradores no disponible: ' + err.message,
      };
    }

    const latestBySchool = {};
    rows.forEach(function(row, index) {
      const key = _mecSchoolKey_(row) || ('draft_' + index);
      const current = latestBySchool[key];
      const candidate = Object.assign({ __row_order: index }, row);
      if (!current || _mecRowMs_(candidate) >= _mecRowMs_(current)) latestBySchool[key] = candidate;
    });
    const latestRows = Object.values(latestBySchool);
    const stats = {
      source: 'mec_borradores',
      generated_at: _timestamp(),
      escuelas_con_borrador: latestRows.length,
      borradores_total: rows.length,
      bloques: 0,
      pisos: 0,
      aulas: 0,
      otros_espacios: 0,
      sanitarios: 0,
      exteriores: 0,
      evidencias: 0,
      area_aulas_m2: 0,
      area_sanitarios_m2: 0,
      area_exteriores_m2: 0,
      area_total_m2: 0,
      puertas: 0,
      ventanas: 0,
      tomas: 0,
      luces: 0,
      ventiladores: 0,
      aires: 0,
      tableros: 0,
      danos: 0,
      escaleras: 0,
      rampas: 0,
      sanitarios_accesibles: 0,
      sanitarios_fuera_servicio: 0,
      puesta_tierra_si: 0,
      diferencial_si: 0,
      circuitos_identificados: 0,
      campos_evidencia: 0,
      campos_evidencia_con_foto: 0,
      evidencias_pendientes: 0,
      calidad: { Bueno: 0, Regular: 0, Malo: 0, 'Sin estado': 0 },
      tiempos: {
        escuela_promedio_min: 0,
        aulas_promedio_min: 0,
        sanitarios_promedio_min: 0,
        exteriores_promedio_min: 0,
      },
      alertas: [],
    };
    const timeTotals = { escuela: 0, escuelaCount: 0, aulas: 0, aulasCount: 0, sanitarios: 0, sanitariosCount: 0, exteriores: 0, exterioresCount: 0 };

    latestRows.forEach(function(row) {
      stats.bloques += Number(_num(row.bloques) || 0);
      stats.pisos += Number(_num(row.pisos) || 0);
      stats.aulas += Number(_num(row.aulas) || 0);
      stats.otros_espacios += Number(_num(row.otros_espacios) || 0);
      stats.sanitarios += Number(_num(row.sanitarios) || 0);
      stats.exteriores += Number(_num(row.exteriores) || 0);
      stats.evidencias += Number(_num(row.evidencias) || 0);
      _mecTimeAdd_(timeTotals, 'escuela', row.tiempo_escuela_min);
      _mecTimeAdd_(timeTotals, 'aulas', row.tiempo_aulas_promedio_min || row.tiempo_aulas_min);
      _mecTimeAdd_(timeTotals, 'sanitarios', row.tiempo_sanitarios_promedio_min || row.tiempo_sanitarios_min);
      _mecTimeAdd_(timeTotals, 'exteriores', row.tiempo_exteriores_min);

      const draft = _mecParseJson_(row.draft_json);
      if (draft) _mecAccumulateDraft_(stats, draft);
      const evidenceIndex = _mecParseJson_(row.evidence_index_json);
      if (Array.isArray(evidenceIndex)) stats.evidencias += Math.max(0, evidenceIndex.length - Number(_num(row.evidencias) || 0));
    });

    stats.area_aulas_m2 = _round1_(stats.area_aulas_m2);
    stats.area_sanitarios_m2 = _round1_(stats.area_sanitarios_m2);
    stats.area_exteriores_m2 = _round1_(stats.area_exteriores_m2);
    stats.area_total_m2 = _round1_(stats.area_aulas_m2 + stats.area_sanitarios_m2 + stats.area_exteriores_m2);
    stats.tiempos.escuela_promedio_min = _mecAverage_(timeTotals.escuela, timeTotals.escuelaCount);
    stats.tiempos.aulas_promedio_min = _mecAverage_(timeTotals.aulas, timeTotals.aulasCount);
    stats.tiempos.sanitarios_promedio_min = _mecAverage_(timeTotals.sanitarios, timeTotals.sanitariosCount);
    stats.tiempos.exteriores_promedio_min = _mecAverage_(timeTotals.exteriores, timeTotals.exterioresCount);
    stats.evidencias_pendientes = Math.max(0, stats.campos_evidencia - stats.campos_evidencia_con_foto);
    stats.electricidad = {
      tomas: stats.tomas,
      luces: stats.luces,
      tableros: stats.tableros,
      puesta_tierra_si: stats.puesta_tierra_si,
      diferencial_si: stats.diferencial_si,
      circuitos_identificados: stats.circuitos_identificados,
    };
    stats.accesibilidad = {
      rampas: stats.rampas,
      escaleras: stats.escaleras,
      sanitarios_accesibles: stats.sanitarios_accesibles,
    };
    stats.alertas = _mecInfrastructureAlerts_(stats);
    return stats;
  }

  function _mecSchoolKey_(row) {
    return _digits(row.codigo_local) || _digits(row.id_escuela) || _txt(row.id_escuela) || _txt(row.codigo_local);
  }

  function _mecRowMs_(row) {
    const text = _txt(row.actualizado_en || row.fecha_guardado || row.creado_en);
    const parsed = text ? new Date(text).getTime() : NaN;
    return isNaN(parsed) ? Number(row.__row_order || 0) : parsed;
  }

  function _mecDraftMetadata_(row, resumen, evidenceIndex) {
    row = row || {};
    const counts = {
      bloques: Number(_num(row.bloques) || 0),
      pisos: Number(_num(row.pisos) || 0),
      aulas: Number(_num(row.aulas) || 0),
      otros_espacios: Number(_num(row.otros_espacios) || 0),
      sanitarios: Number(_num(row.sanitarios) || 0),
      exteriores: Number(_num(row.exteriores) || 0),
      evidencias: Number(_num(row.evidencias) || 0),
    };
    const evidenceCount = Array.isArray(evidenceIndex) ? evidenceIndex.length : counts.evidencias;
    const totalElements = counts.bloques + counts.aulas + counts.otros_espacios + counts.sanitarios + counts.exteriores;
    return {
      mec_draft_id: _txt(row.id_borrador),
      mec_draft_status: _txt(row.estado_borrador),
      mec_draft_updated_at: _txt(row.actualizado_en || row.fecha_guardado || row.creado_en),
      mec_draft_usuario: _txt(row.usuario),
      mec_draft_app_version: _txt(row.app_version),
      mec_draft_schema_version: _txt(row.schema_version),
      mec_draft_counts: counts,
      mec_draft_total_elementos: totalElements,
      mec_draft_evidence_count: evidenceCount,
      mec_draft_base_mapa_confirmada: _txt(row.base_mapa_confirmada),
      mec_draft_resumen_pendientes: resumen && Array.isArray(resumen.pendingItems) ? resumen.pendingItems.length : '',
    };
  }

  function _mecTimeAdd_(totals, key, value) {
    const numeric = Number(_num(value) || 0);
    if (!numeric) return;
    totals[key] += numeric;
    totals[key + 'Count'] += 1;
  }

  function _mecAverage_(sum, count) {
    return count ? _round1_(sum / count) : 0;
  }

  function _mecParseJson_(value) {
    const text = _txt(value);
    if (!text || text.indexOf('[truncado]') !== -1) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }

  function _mecAccumulateDraft_(stats, draft) {
    const values = draft && (draft.values || draft) || {};
    const blocks = _asArray_(values.__blocks);
    const classrooms = _asArray_(values.__classrooms);
    const sanitaries = _asArray_(values.__sanitaries);
    const siteElements = _asArray_(values.__siteElements);
    const classObjects = [];
    classrooms.forEach(function(room) {
      _asArray_(room.objects).forEach(function(object) { classObjects.push(object); });
    });
    const sanitaryObjects = [];
    sanitaries.forEach(function(sanitary) {
      ['objects', 'fixtures', 'artefactos', 'cabins', 'cabinas'].forEach(function(key) {
        _asArray_(sanitary[key]).forEach(function(object) { sanitaryObjects.push(object); });
      });
    });
    const allObjects = classObjects.concat(sanitaryObjects);
    const evidence = values.__evidence || {};

    stats.area_aulas_m2 += classrooms.reduce(function(sum, room) {
      return sum + _mecArea_(room.length || room.largo_m, room.width || room.ancho_m);
    }, 0);
    stats.area_sanitarios_m2 += sanitaries.reduce(function(sum, item) {
      return sum + _mecArea_(item.largo_m || item.length, item.ancho_m || item.width);
    }, 0);
    stats.area_exteriores_m2 += siteElements.reduce(function(sum, item) {
      return sum + _mecArea_(item.length || item.largo_m, item.width || item.ancho_m);
    }, 0);

    stats.puertas += _mecCountType_(allObjects, /door|puerta/);
    stats.ventanas += _mecCountType_(allObjects, /window|ventana/);
    stats.tomas += _mecCountType_(allObjects, /outlet|toma|enchufe/);
    stats.luces += _mecCountType_(allObjects, /light|foco|luz|ilumin/);
    stats.ventiladores += _mecCountType_(allObjects, /fan|ventilador/);
    stats.aires += _mecCountType_(allObjects, /air|aire|acond/);
    stats.tableros += _mecCountType_(allObjects.concat(siteElements), /switchboard|tablero/);
    stats.danos += _mecCountType_(allObjects, /damage|dano|daño|fisura|grieta|falla/);
    stats.escaleras += _mecCountType_(allObjects.concat(siteElements), /stair|escalera/)
      + blocks.filter(function(block) { return /escalera/.test(_mecNorm_(block.tipo_circulacion)); }).length;
    stats.rampas += _mecCountType_(siteElements, /ramp|rampa/)
      + blocks.filter(function(block) { return /rampa/.test(_mecNorm_(block.tipo_circulacion)); }).length;
    stats.sanitarios_accesibles += sanitaries.filter(function(item) {
      return _mecYes_(item.accesible || item.accesibilidad || item.bano_accesible);
    }).length;
    stats.sanitarios_fuera_servicio += sanitaries.filter(function(item) {
      return _mecBad_([item.estado, item.estado_general, item.funcionamiento].join(' '));
    }).length;
    stats.puesta_tierra_si += blocks.filter(function(item) { return _mecYes_(item.puesta_tierra || item.puesta_a_tierra); }).length;
    stats.diferencial_si += blocks.filter(function(item) { return _mecYes_(item.proteccion_diferencial || item.disyuntor_diferencial); }).length;
    stats.circuitos_identificados += blocks.filter(function(item) { return _mecYes_(item.circuitos_identificados || item.tablero_rotulado); }).length;
    stats.tableros += blocks.filter(function(item) { return _txt(item.tablero_estado || item.tablero); }).length;

    allObjects.forEach(function(object) { _mecQualityAdd_(stats.calidad, object.ficha || object); });
    sanitaries.forEach(function(item) { _mecQualityAdd_(stats.calidad, item); });
    const evidenceKeys = Object.keys(evidence || {});
    stats.campos_evidencia += evidenceKeys.length;
    stats.campos_evidencia_con_foto += evidenceKeys.filter(function(key) {
      return Array.isArray(evidence[key]) && evidence[key].length;
    }).length;
  }

  function _asArray_(value) {
    return Array.isArray(value) ? value : [];
  }

  function _mecArea_(length, width) {
    return Number(_num(length) || 0) * Number(_num(width) || 0);
  }

  function _mecNorm_(value) {
    return _txt(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function _mecTypeText_(item) {
    return _mecNorm_([
      item && item.type,
      item && item.tipo,
      item && item.kind,
      item && item.label,
      item && item.nombre,
      item && item.ficha && item.ficha.tipo,
      item && item.ficha && item.ficha.nombre,
    ].filter(Boolean).join(' '));
  }

  function _mecCountType_(items, pattern) {
    return _asArray_(items).filter(function(item) { return pattern.test(_mecTypeText_(item)); }).length;
  }

  function _mecYes_(value) {
    return /^(si|sí|true|1|bueno|existe|presente|ok)$/i.test(_txt(value));
  }

  function _mecBad_(value) {
    return /(malo|mal|deficiente|fuera|riesgo|roto|danad|dañad|inseguro|no funciona|sin servicio)/i.test(_mecNorm_(value));
  }

  function _mecQualityAdd_(quality, item) {
    const state = _txt(item && (item.estado || item.estado_general || item.condicion)) || 'Sin estado';
    const key = ['Bueno', 'Regular', 'Malo'].indexOf(state) !== -1 ? state : 'Sin estado';
    quality[key] = Number(quality[key] || 0) + 1;
  }

  function _round1_(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
  }

  function _roundCoord_(value) {
    return Math.round((Number(value) || 0) * 100000000) / 100000000;
  }

  function _mecInfrastructureAlerts_(stats) {
    const alerts = [];
    if (stats.danos) alerts.push({ tone: 'danger', label: 'Daños relevados', note: stats.danos + ' elementos con falla, grieta o daño.' });
    if (stats.sanitarios_fuera_servicio) alerts.push({ tone: 'danger', label: 'Sanitarios criticos', note: stats.sanitarios_fuera_servicio + ' sanitarios con estado malo o fuera de servicio.' });
    if (stats.bloques && stats.puesta_tierra_si < stats.bloques) alerts.push({ tone: 'warning', label: 'Puesta a tierra incompleta', note: Math.max(0, stats.bloques - stats.puesta_tierra_si) + ' bloques sin puesta a tierra confirmada.' });
    if (stats.bloques && stats.diferencial_si < stats.bloques) alerts.push({ tone: 'warning', label: 'Proteccion diferencial', note: Math.max(0, stats.bloques - stats.diferencial_si) + ' bloques sin diferencial confirmado.' });
    if (stats.evidencias_pendientes) alerts.push({ tone: 'info', label: 'Evidencias pendientes', note: stats.evidencias_pendientes + ' campos recomendados/obligatorios sin foto.' });
    if (!alerts.length) alerts.push({ tone: 'success', label: 'Sin alertas tecnicas fuertes', note: 'No se detectan daños, brechas electricas ni pendientes fotograficos con los datos disponibles.' });
    return alerts;
  }

  function getStats(params) {
    const session = params._session;
    params = params || {};
    const escuelas = getEscuelas(params).data || [];
    let sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    if (params.fecha_desde) sesiones = sesiones.filter(s => String(s.fecha_inicio) >= String(params.fecha_desde));
    if (params.fecha_hasta) sesiones = sesiones.filter(s => String(s.fecha_inicio) <= String(params.fecha_hasta));
    if (params.encuestador) sesiones = sesiones.filter(s => _same(s.usuario, params.encuestador));
    if (session.rol === 'encuestador') sesiones = sesiones.filter(s => _same(s.usuario, session.usuario));

    const total = escuelas.length;
    const finalizadas = escuelas.filter(e => e.estado_relevamiento === 'finalizada').length;
    const en_curso = escuelas.filter(e => e.estado_relevamiento === 'en_curso').length;
    const pendientes = escuelas.filter(e => e.estado_relevamiento === 'pendiente').length;
    const con_incidencia = escuelas.filter(e => e.estado_relevamiento === 'incidencia').length;
    const pct_avance = total > 0 ? Math.round((finalizadas / total) * 100) : 0;

    const por_departamento = _groupEscuelas(escuelas, 'departamento');
    const por_zona = _groupEscuelas(escuelas, 'zona');
    const por_encuestador = _groupEncuestador(escuelas, sesiones);
    const por_dia = _groupSesionesDia(sesiones);
    const por_modulo = _groupModulos();
    const includeInfra = _isTrueish(params.infraestructura_mec) || _isTrueish(params.include_infraestructura) || _isTrueish(params.infraestructura);
    const actividad_reciente = sesiones
      .filter(s => s.fecha_inicio || s.inicio_iso)
      .sort((a, b) => String(b.inicio_iso || `${b.fecha_inicio}${b.hora_inicio}`).localeCompare(String(a.inicio_iso || `${a.fecha_inicio}${a.hora_inicio}`)))
      .slice(0, 20)
      .map(s => ({ tipo: s.estado, usuario: s.usuario, escuela: s.nombre_escuela || s.id_escuela, fecha_hora: s.inicio_iso || `${s.fecha_inicio} ${s.hora_inicio}` }));

    const data = { total, finalizadas, en_curso, pendientes, con_incidencia, pct_avance, por_departamento, por_zona, por_encuestador, por_dia, por_modulo, actividad_reciente };
    if (includeInfra) data.infraestructura_mec = _mecInfrastructureStats_();
    return { status: 'ok', data };
  }

  function getResumenOperativo(params) {
    const escuelas = getEscuelas(params || {}).data || [];
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const modulos = _sheetToObjects(SHEET_NAMES.MODULOS);
    const totalMin = sesiones.reduce((a, s) => a + (parseFloat(s.duracion_minutos) || 0), 0);
    const cerradas = sesiones.filter(s => ['finalizada','incidencia'].includes(String(s.estado))).length;
    return {
      status: 'ok',
      data: {
        escuelas: escuelas.length,
        sesiones: sesiones.length,
        sesiones_cerradas: cerradas,
        sesiones_abiertas: sesiones.filter(_isOpenSession_).length,
        promedio_minutos: cerradas ? Math.round(totalMin / cerradas) : null,
        modulos_registrados: modulos.length,
        escuelas_sin_coordenadas: escuelas.filter(e => !_isNumeric(e.latitud) || !_isNumeric(e.longitud)).length,
        escuelas_sin_asignar: escuelas.filter(e => !e.encuestador_asignado).length
      }
    };
  }

  function getAuditoria(params) {
    const session = params._session;
    if (!_isAuthorizedAdmin(session)) return { status: 'error', message: 'Acceso restringido a administradores autorizados.' };
    let rows = _sheetToObjects(SHEET_NAMES.AUDITORIA);
    if (params.usuario) rows = rows.filter(r => String(r.usuario).toLowerCase().includes(String(params.usuario).toLowerCase()));
    if (params.accion) rows = rows.filter(r => String(r.accion).toLowerCase().includes(String(params.accion).toLowerCase()));
    if (params.fecha_desde) rows = rows.filter(r => String(r.fecha_hora) >= params.fecha_desde);
    if (params.fecha_hasta) rows = rows.filter(r => String(r.fecha_hora).slice(0, 10) <= params.fecha_hasta);
    rows.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
    const page = parseInt(params.page, 10) || 1;
    const per_page = 50;
    const total = rows.length;
    const total_pages = Math.ceil(total / per_page);
    const start = (page - 1) * per_page;
    return { status: 'ok', data: rows.slice(start, start + per_page), pagination: { page, per_page, total, total_pages } };
  }

  function getCatalogos(tipo) {
    let rows = _sheetToObjects(SHEET_NAMES.CATALOGOS);
    if (tipo) rows = rows.filter(r => r.tipo === tipo);
    rows = rows.filter(r => String(r.activo).toLowerCase() !== 'false');
    rows.sort((a, b) => (parseInt(a.orden, 10) || 0) - (parseInt(b.orden, 10) || 0));
    return { status: 'ok', data: rows };
  }

  function _escuelasRawRows_() {
    let embeddedRows = [];
    if (typeof getEmbeddedEscuelasRecords_ === 'function') {
      try {
        embeddedRows = getEmbeddedEscuelasRecords_() || [];
      } catch (err) {
        Logger.log('No se pudo leer el CSV embebido de escuelas: ' + err);
        embeddedRows = [];
      }
    }

    if (embeddedRows.length) {
      return {
        rows: _mergeOperationalSchoolRows_(embeddedRows),
        source: 'embedded_csv',
        embeddedUpdatedAt: typeof getEmbeddedEscuelasUpdatedAt_ === 'function' ? getEmbeddedEscuelasUpdatedAt_() : '',
      };
    }

    const officialRows = _officialSchoolRows_();
    if (officialRows.length) {
      return {
        rows: _mergeOperationalSchoolRows_(officialRows),
        source: 'official_sheet',
        embeddedUpdatedAt: '',
      };
    }

    return {
      rows: _sheetToObjects(SHEET_NAMES.ESCUELAS),
      source: 'sheet',
      embeddedUpdatedAt: '',
    };
  }

  function _officialSchoolRows_() {
    try {
      const ss = SpreadsheetApp.openById(OFFICIAL_SCHOOLS_SPREADSHEET_ID);
      const fullSheet = ss.getSheetByName(OFFICIAL_SCHOOLS_FULL_SHEET);
      if (!fullSheet) return [];
      const rows = _objectsFromSheet_(fullSheet).map(function(row, idx) {
        return Object.assign({}, row, { __official_sheet_row: idx + 2 });
      });
      const pilotSheet = ss.getSheetByName(OFFICIAL_SCHOOLS_PILOT_SHEET);
      const pilotRows = pilotSheet ? _objectsFromSheet_(pilotSheet) : [];
      _markOfficialPilotRows_(rows, pilotRows);
      return rows;
    } catch (err) {
      Logger.log('No se pudo leer el padron oficial lista_oficial_escuelas_2025: ' + err);
      return [];
    }
  }

  function _objectsFromSheet_(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map(function(h) { return String(h).trim(); });
    return data.slice(1).map(function(row) {
      const obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
  }

  function _markOfficialPilotRows_(rows, pilotRows) {
    if (!Array.isArray(rows) || !Array.isArray(pilotRows) || !pilotRows.length) return;
    const byCode = {};
    rows.forEach(function(row) {
      const normalized = _normalizarEscuela(row, row.__official_sheet_row || 0);
      const key = _txt(normalized.codigo_local || normalized.id_escuela);
      if (key) byCode[key] = row;
    });
    pilotRows.forEach(function(pilot, index) {
      const code = _txt(_first(pilot, ['CODIGO', 'codigo', 'codigo_local', 'Código del local escolar', 'Código Local Escolar']));
      if (!code || !byCode[code]) return;
      const target = byCode[code];
      target.en_muestra_piloto = 'true';
      target.muestra_piloto = 'piloto';
      target.orden_muestra_piloto = _txt(_first(pilot, ['ENUMERA', 'orden_muestra_piloto', 'orden_piloto'])) || String(index + 1);
      target.orden_visita = target.orden_visita || target.orden_muestra_piloto;
      target.prioridad_operativa = target.prioridad_operativa || 'piloto';
      target.__pilot_sheet_row = index + 2;
    });
  }

  function _mergeOperationalSchoolRows_(sourceRows) {
    if (!Array.isArray(sourceRows) || !sourceRows.length) return sourceRows || [];
    let operationalRows = [];
    try {
      operationalRows = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    } catch (err) {
      return sourceRows;
    }
    if (!operationalRows.length) return sourceRows;

    const operationalByKey = {};
    operationalRows.forEach(function(row, idx) {
      const normalized = _normalizarEscuela(row, row.__row_number || idx + 2);
      [normalized.codigo_local, normalized.id_escuela].forEach(function(key) {
        key = _txt(key);
        if (key) operationalByKey[key] = row;
      });
    });

    return sourceRows.map(function(row, idx) {
      const normalized = _normalizarEscuela(row, row.__official_sheet_row || row.__embedded_csv_row || idx + 2);
      const operational = operationalByKey[_txt(normalized.codigo_local)] || operationalByKey[_txt(normalized.id_escuela)];
      if (!operational) return row;
      return _overlayOperationalSchoolRow_(row, operational);
    });
  }

  function _overlayOperationalSchoolRow_(base, operational) {
    const merged = Object.assign({}, base);
    OP_COLS_ESCUELAS.forEach(function(key) {
      const value = operational[key];
      if (value === undefined || value === null || String(value).trim() === '') return;
      if (['id_escuela', 'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona', 'latitud', 'longitud'].indexOf(key) !== -1 && merged[key]) return;
      merged[key] = value;
    });
    return merged;
  }

  function _schoolIdentityCandidates_() {
    const out = [];
    Array.prototype.slice.call(arguments).forEach(value => {
      const raw = _txt(value);
      if (!raw) return;
      out.push(raw);
      const digits = _digits(raw);
      if (digits) {
        out.push(digits);
        out.push(`ESC_${digits}`);
      }
    });
    return out.filter((value, idx, arr) => arr.findIndex(item => _same(item, value)) === idx);
  }

  function _resolveEscuelaByCandidates_() {
    const candidates = _schoolIdentityCandidates_.apply(null, arguments);
    if (!candidates.length) return null;
    const source = _escuelasRawRows_();
    return source.rows
      .map((r, idx) => _normalizarEscuela(r, r.__row_number || r.__embedded_csv_row || r.__official_sheet_row || idx + 2))
      .find(r => candidates.some(candidate => _idMatch(r, candidate))) || null;
  }

  function _appendEmbeddedEscuelaOperationalRow_(id) {
    const found = _resolveEscuelaByCandidates_(id);
    if (!found) return -1;

    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    const existing = _findEscuelaRow(found.id_escuela || found.codigo_local);
    if (existing !== -1) return existing;

    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = _headers(sheet);
    const now = _timestamp();
    const row = {
      id_escuela: found.id_escuela,
      codigo_local: found.codigo_local,
      nombre: found.nombre,
      departamento: found.departamento,
      distrito: found.distrito,
      localidad: found.localidad,
      zona: found.zona,
      latitud: found.latitud,
      longitud: found.longitud,
      estado_relevamiento: found.estado_relevamiento || 'pendiente',
      encuestador_asignado: found.encuestador_asignado || '',
      supervisor_asignado: found.supervisor_asignado || '',
      fecha_ultimo_evento: now,
      observaciones: found.observaciones || 'Fila operativa creada desde CSV embebido.',
      orden_visita: found.orden_visita || '',
      fecha_programada: found.fecha_programada || '',
      turno_programado: found.turno_programado || '',
      prioridad_operativa: found.prioridad_operativa || 'media',
      en_muestra_piloto: found.en_muestra_piloto || '',
      orden_muestra_piloto: found.orden_muestra_piloto || '',
      tiempo_estimado_min: found.tiempo_estimado_min || '',
      ultima_sesion_id: found.ultima_sesion_id || '',
      folio_externo: found.folio_externo || '',
      ultimo_registro_externo: found.ultimo_registro_externo || '',
    };

    sheet.appendRow(headers.map(h => row[h] !== undefined ? row[h] : ''));
    return sheet.getLastRow();
  }

  function _normalizarEscuela(r, rowNumber) {
    const codigo = _first(r, ['codigo_local', 'CODIGO', 'codigo', 'Codigo', 'CODIGO_LOCAL', 'codigo_local_escolar', 'CODIGO_LOCAL_ESCOLAR', 'CODIGO ESTABLECIMIENTO', 'codigo_establecimiento', 'cod_local', 'COD_LOCAL', 'Código', 'Código del local escolar', 'Código de Local Escolar', 'Código Local Escolar', 'Cod_Local', 'local_escolar_codigo']);
    const id = _first(r, ['id_escuela', 'ID_ESCUELA', 'id', 'ID']) || (codigo ? `ESC_${_digits(codigo) || codigo}` : `ESC_ROW_${rowNumber}`);
    const lat = _first(r, ['latitud', 'LAT_DEC', 'lat_dec', 'lat', 'LAT', 'latitude', 'Y', 'y', 'Latitud', 'LATITUD', 'lat_corr', 'LAT_CORR']);
    const lng = _first(r, ['longitud', 'LNG_DEC', 'lng_dec', 'lng', 'LNG', 'lon', 'LON', 'longitude', 'X', 'x', 'Longitud', 'LONGITUD', 'long_corr', 'lng_corr', 'LONG_CORR']);
    const estado = _first(r, ['estado_relevamiento', 'ESTADO_RELEVAMIENTO']) || 'pendiente';
    const matricula = _first(r, ['MATRICULA', 'matricula', 'Matrícula', 'Matrícula del local escolar', 'cantidad matricula']);
    const aulas = _first(r, ['AULAS_EST', 'aulas_est', 'aulas']);
    const obsBase = _first(r, ['observaciones', 'OBSERVACIONES']) || '';
    const muestraPiloto = _first(r, ['en_muestra_piloto', 'muestra_piloto', 'EN_MUESTRA_PILOTO', 'MUESTRA_PILOTO', 'piloto', 'PILOTO']);
    const ordenMuestraPiloto = _first(r, ['orden_muestra_piloto', 'ORDEN_MUESTRA_PILOTO', 'orden_piloto', 'ORDEN_PILOTO']);
    const prioridadOperativa = _first(r, ['prioridad_operativa', 'PRIORIDAD_OPERATIVA']);
    const esPiloto = _isTrueish(muestraPiloto)
      || _txt(ordenMuestraPiloto) !== ''
      || _txt(prioridadOperativa).toLowerCase().indexOf('piloto') !== -1;
    const extraObs = [];
    if (matricula !== '') extraObs.push(`Matrícula: ${matricula}`);
    if (aulas !== '') extraObs.push(`Aulas estimadas: ${aulas}`);
    if (esPiloto) extraObs.push(`Muestra piloto${ordenMuestraPiloto ? ` #${ordenMuestraPiloto}` : ''}`);

    return {
      id_escuela: _txt(id),
      codigo_local: _txt(codigo),
      nombre: _txt(_first(r, ['nombre', 'NOMBRE', 'Nombre', 'Nombre del local escolar (*)', 'Nombre de Local Escolar', 'NOMBRE_LOCAL', 'NOMBRE_INSTITUCION', 'nombre_institucion', 'INSTITUCION', 'institucion', 'LOCAL', 'local'])),
      departamento: _txt(_first(r, ['departamento', 'DEPTO', 'Departamento', 'DEPARTAMENTO', 'departamento_nombre'])),
      distrito: _txt(_first(r, ['distrito', 'DIST', 'Distrito', 'DISTRITO', 'distrito_nombre'])),
      localidad: _txt(_first(r, ['localidad', 'LOCALIDAD', 'Localidad', 'BARRIO_LOCALIDAD', 'barrio_localidad'])),
      zona: _zona(_first(r, ['zona', 'ZONA', 'Zona', 'AREA', 'area', 'AMBITO', 'ambito'])),
      latitud: _coord(lat, 'lat'),
      longitud: _coord(lng, 'lng'),
      estado_relevamiento: _estado(estado),
      encuestador_asignado: _txt(_first(r, ['encuestador_asignado', 'ENCUESTADOR_ASIGNADO', 'encuestador'])),
      supervisor_asignado: _txt(_first(r, ['supervisor_asignado', 'SUPERVISOR_ASIGNADO', 'supervisor'])),
      fecha_ultimo_evento: _txt(_first(r, ['fecha_ultimo_evento', 'FECHA_ULTIMO_EVENTO'])),
      observaciones: [obsBase, ...extraObs].filter(Boolean).join(' | '),
      orden_visita: _txt(_first(r, ['orden_visita', 'ORDEN_VISITA', 'ENUMERA'])),
      fecha_programada: _txt(_first(r, ['fecha_programada', 'FECHA_PROGRAMADA'])),
      turno_programado: _txt(_first(r, ['turno_programado', 'TURNO_PROGRAMADO'])),
      prioridad_operativa: _txt(prioridadOperativa) || (esPiloto ? 'piloto' : 'media'),
      en_muestra_piloto: esPiloto ? 'true' : 'false',
      orden_muestra_piloto: _txt(ordenMuestraPiloto),
      tiempo_estimado_min: _txt(_first(r, ['tiempo_estimado_min', 'TIEMPO_ESTIMADO_MIN'])),
      ultima_sesion_id: _txt(_first(r, ['ultima_sesion_id', 'ULTIMA_SESION_ID'])),
      folio_externo: _txt(_first(r, ['folio_externo', 'FOLIO_EXTERNO'])),
      ultimo_registro_externo: _txt(_first(r, ['ultimo_registro_externo', 'ULTIMO_REGISTRO_EXTERNO'])),
      ultimo_cierre_id: _txt(_first(r, ['ultimo_cierre_id', 'ULTIMO_CIERRE_ID'])),
      ultimo_pdf_url: _txt(_first(r, ['ultimo_pdf_url', 'ULTIMO_PDF_URL'])),
      ultimo_metadata_url: _txt(_first(r, ['ultimo_metadata_url', 'ULTIMO_METADATA_URL'])),
      email_cierre_estado: _txt(_first(r, ['email_cierre_estado', 'EMAIL_CIERRE_ESTADO'])),
      email_cierre_destino: _txt(_first(r, ['email_cierre_destino', 'EMAIL_CIERRE_DESTINO'])),
      ultimo_borrador_mec_id: _txt(_first(r, ['ultimo_borrador_mec_id', 'ULTIMO_BORRADOR_MEC_ID'])),
      ultimo_borrador_mec_at: _txt(_first(r, ['ultimo_borrador_mec_at', 'ULTIMO_BORRADOR_MEC_AT'])),
      ultimo_borrador_mec_usuario: _txt(_first(r, ['ultimo_borrador_mec_usuario', 'ULTIMO_BORRADOR_MEC_USUARIO'])),
      tiempo_real_min: _txt(_first(r, ['tiempo_real_min', 'TIEMPO_REAL_MIN'])),
      tiempo_aulas_min: _txt(_first(r, ['tiempo_aulas_min', 'TIEMPO_AULAS_MIN'])),
      tiempo_aulas_promedio_min: _txt(_first(r, ['tiempo_aulas_promedio_min', 'TIEMPO_AULAS_PROMEDIO_MIN'])),
      tiempo_sanitarios_min: _txt(_first(r, ['tiempo_sanitarios_min', 'TIEMPO_SANITARIOS_MIN'])),
      tiempo_sanitarios_promedio_min: _txt(_first(r, ['tiempo_sanitarios_promedio_min', 'TIEMPO_SANITARIOS_PROMEDIO_MIN'])),
      tiempo_exteriores_min: _txt(_first(r, ['tiempo_exteriores_min', 'TIEMPO_EXTERIORES_MIN'])),
      estrato: _txt(_first(r, ['ESTRATO', 'estrato'])),
      grupo_matricula: _txt(_first(r, ['GRUPO_MATRICULA', 'grupo_matricula'])),
      matricula: _txt(matricula),
      factor_exp: _txt(_first(r, ['FACTOR_EXP', 'factor_exp'])),
      verif: _txt(_first(r, ['VERIF', 'verif'])),
      __row_number: rowNumber
    };
  }

  function _findEscuelaRow(id) {
    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return -1;
    const headers = data[0].map(h => String(h).trim());
    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = data[i][j]);
      const norm = _normalizarEscuela(obj, i + 1);
      if (_idMatch(norm, id)) return i + 1;
    }
    return -1;
  }

  function _idMatch(e, id) {
    const v = _txt(id);
    const digits = _digits(v);
    return _same(e.id_escuela, v)
      || _same(e.codigo_local, v)
      || (digits && _same(_digits(e.id_escuela), digits))
      || (digits && _same(_digits(e.codigo_local), digits));
  }

  function _updateEscuelaOperational(id, fields) {
    let rowIdx = _findEscuelaRow(id);
    if (rowIdx === -1) rowIdx = _appendEmbeddedEscuelaOperationalRow_(id);
    if (rowIdx === -1) return false;
    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = _headers(sheet);
    const raw = _objectFromRow(sheet, rowIdx, headers);
    const norm = _normalizarEscuela(raw, rowIdx);
    const base = { id_escuela: norm.id_escuela, codigo_local: norm.codigo_local, nombre: norm.nombre, departamento: norm.departamento, distrito: norm.distrito, localidad: norm.localidad, zona: norm.zona, latitud: norm.latitud, longitud: norm.longitud };
    Object.entries({ ...base, ...fields }).forEach(([k, v]) => _setByHeader(sheet, rowIdx, headers, k, v));
    return true;
  }

  function _ensureOperationalSheets() {
    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    _ensureColumns(SHEET_NAMES.EVENTOS, ['id_evento','id_sesion','id_escuela','usuario','tipo_evento','fecha_hora','detalle']);
    _ensureColumns(SHEET_NAMES.MODULOS, _modulosHeaders());
    _ensureColumns(SHEET_NAMES.MEC_DRAFTS, _mecDraftHeaders());
    _ensureColumns(SHEET_NAMES.ENTREGAS, _entregasHeaders());
    _ensureColumns(SHEET_NAMES.DB_SYNC_QUEUE, _dbSyncQueueHeaders());
  }

  function _sesionesHeaders() {
    return ['id_sesion','id_escuela','codigo_local','nombre_escuela','usuario','supervisor','fecha_inicio','hora_inicio','inicio_iso','fecha_fin','hora_fin','fin_iso','duracion_minutos','duracion_segundos','estado','observacion_cierre','url_formulario_usada','launch_mode','dispositivo','gps_inicio_lat','gps_inicio_lng','gps_fin_lat','gps_fin_lng','folio_externo','ultimo_registro_externo','modulos_completados','total_modulos','calidad_cierre','creado_en','actualizado_en'];
  }

  function _modulosHeaders() {
    return ['id_modulo','id_sesion','id_escuela','usuario','modulo','modulo_nombre','orden','inicio_iso','fin_iso','duracion_minutos','estado','observacion','registros_estimados','registros_completados','creado_en','actualizado_en'];
  }

  function _entregasHeaders() {
    return ['id_entrega','id_escuela','codigo_local','nombre_escuela','usuario','fecha_cierre','destinatario_email','estado_cierre','pendientes','email_status','email_error','pdf_file_id','pdf_url','metadata_file_id','metadata_url','resumen_json','metadata_json','plan_model_json','evidence_count','creado_en','actualizado_en'];
  }

  function _mecDraftHeaders() {
    return ['id_borrador','id_escuela','codigo_local','nombre_escuela','usuario','fecha_guardado','estado_borrador','motivo','app_version','schema_version','bloques','pisos','aulas','otros_espacios','sanitarios','exteriores','evidencias','base_mapa_confirmada','tiempo_escuela_min','tiempo_aulas_min','tiempo_aulas_promedio_min','tiempo_sanitarios_min','tiempo_sanitarios_promedio_min','tiempo_exteriores_min','tiempo_registro_json','resumen_json','draft_json','evidence_index_json','creado_en','actualizado_en'];
  }

  function _durationSecondsFromTimeRecord_(record, nowMs) {
    const stored = Number(record && (record.durationSeconds || record.duracion_segundos));
    if (isFinite(stored) && stored > 0) return Math.round(stored);
    const startedAt = new Date(record && (record.startedAt || record.inicio_iso || record.inicio || '')).getTime();
    const finishedRaw = record && (record.finishedAt || record.fin_iso || record.fin || record.endedAt || '');
    const finishedAt = finishedRaw ? new Date(finishedRaw).getTime() : nowMs;
    if (!isFinite(startedAt) || !isFinite(finishedAt)) return 0;
    return Math.max(0, Math.round((finishedAt - startedAt) / 1000));
  }

  function _minutesFromSeconds_(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    return Math.round((value / 60) * 10) / 10;
  }

  function _timeTrackingFromLog_(log) {
    log = log || {};
    const nowMs = new Date().getTime();
    const items = Array.isArray(log.items) ? log.items : [];
    const active = log.active && typeof log.active === 'object' ? Object.values(log.active) : [];
    const records = [];
    items.forEach(item => records.push({
      kind: item.kind || 'registro',
      id: item.id || '',
      label: item.label || '',
      startedAt: item.startedAt || '',
      finishedAt: item.finishedAt || '',
      durationSeconds: _durationSecondsFromTimeRecord_(item, nowMs),
      active: false,
    }));
    active.forEach(item => records.push({
      kind: item.kind || 'registro',
      id: item.id || '',
      label: item.label || '',
      startedAt: item.startedAt || '',
      finishedAt: '',
      durationSeconds: _durationSecondsFromTimeRecord_(item, nowMs),
      active: true,
    }));
    const byKind = {};
    let firstMs = Infinity;
    let lastMs = 0;
    records.filter(record => record.kind && record.id).forEach(record => {
      const kind = record.kind || 'registro';
      if (!byKind[kind]) byKind[kind] = { kind, count: 0, finishedCount: 0, activeCount: 0, totalSeconds: 0, totalMinutes: 0, averageSeconds: 0, averageMinutes: 0, items: [], ids: {} };
      const group = byKind[kind];
      group.ids[record.id] = true;
      group.totalSeconds += record.durationSeconds || 0;
      if (record.active) group.activeCount += 1;
      else group.finishedCount += 1;
      group.items.push(record);
      const startedAt = new Date(record.startedAt || '').getTime();
      const finishedAt = record.finishedAt ? new Date(record.finishedAt).getTime() : nowMs;
      if (isFinite(startedAt)) firstMs = Math.min(firstMs, startedAt);
      if (isFinite(finishedAt)) lastMs = Math.max(lastMs, finishedAt);
    });
    Object.keys(byKind).forEach(kind => {
      const group = byKind[kind];
      group.count = Object.keys(group.ids).length || group.items.length;
      group.totalSeconds = Math.round(group.totalSeconds);
      group.totalMinutes = _minutesFromSeconds_(group.totalSeconds);
      group.averageSeconds = group.count ? Math.round(group.totalSeconds / group.count) : 0;
      group.averageMinutes = _minutesFromSeconds_(group.averageSeconds);
      delete group.ids;
    });
    const productiveSeconds = records
      .filter(record => record.kind !== 'escuela')
      .reduce((sum, record) => sum + (Number(record.durationSeconds) || 0), 0);
    const windowSeconds = isFinite(firstMs) && lastMs > firstMs ? Math.round((lastMs - firstMs) / 1000) : 0;
    const schoolSeconds = (byKind.escuela && byKind.escuela.totalSeconds) || windowSeconds;
    return {
      generatedAt: new Date().toISOString(),
      schoolSeconds,
      schoolMinutes: _minutesFromSeconds_(schoolSeconds),
      productiveSeconds: Math.round(productiveSeconds),
      productiveMinutes: _minutesFromSeconds_(productiveSeconds),
      workWindowSeconds: windowSeconds,
      workWindowMinutes: _minutesFromSeconds_(windowSeconds),
      byKind,
      activeItems: records.filter(record => record.active),
      records,
    };
  }

  function _timeTrackingFromDraftParams(params) {
    const direct = params.timeTracking || params.time_tracking || (params.resumen && params.resumen.timeTracking) || null;
    if (direct && (direct.byKind || direct.schoolSeconds || direct.records)) return direct;
    return _timeTrackingFromLog_((params.values || {}).__registroTiempos || {});
  }

  function _draftTimeFields_(summary) {
    summary = summary || {};
    const byKind = summary.byKind || {};
    const kind = name => byKind[name] || {};
    const schoolSeconds = Number(summary.schoolSeconds || (kind('escuela').totalSeconds) || summary.workWindowSeconds || 0);
    return {
      tiempo_escuela_min: _minutesFromSeconds_(schoolSeconds),
      tiempo_aulas_min: _minutesFromSeconds_(kind('ambiente').totalSeconds || 0),
      tiempo_aulas_promedio_min: _minutesFromSeconds_(kind('ambiente').averageSeconds || 0),
      tiempo_sanitarios_min: _minutesFromSeconds_(kind('sanitario').totalSeconds || 0),
      tiempo_sanitarios_promedio_min: _minutesFromSeconds_(kind('sanitario').averageSeconds || 0),
      tiempo_exteriores_min: _minutesFromSeconds_(kind('exterior').totalSeconds || 0),
    };
  }

  function _draftStatusFromParams_(params) {
    const status = _txt(params && params.estado_borrador);
    if (status) return status;
    return _draftMeansFinalState_(params && params.motivo) ? 'finalizada' : 'en_curso';
  }

  function _draftMeansFinalState_(value) {
    const t = _txt(value).toLowerCase();
    return /cierre|cerrad|final|termin|complet|entrega/.test(t);
  }

  function _operationalStateFromDraft_(draftStatus, reason, currentState) {
    if (_draftMeansFinalState_(`${draftStatus || ''} ${reason || ''}`)) return 'finalizada';
    if (_same(currentState, 'finalizada')) return 'finalizada';
    return 'en_curso';
  }

  function _dbSyncQueueHeaders() {
    return ['id_mutacion','tipo_entidad','estado','intentos','ultimo_error','database_url','codigo_local','id_escuela','usuario','fecha_evento','app_version','payload_json','payload_file_id','payload_file_url','payload_file_error','creado_en','actualizado_en'];
  }

  function _databaseSyncPayloadForDraft(params, row) {
    return {
      mutation_id: row.id_borrador,
      entity: 'mec_draft',
      source: 'cialpa_gas',
      app_version: row.app_version || params.app_version || '',
      schema_version: row.schema_version || params.schema_version || '',
      saved_at: row.fecha_guardado,
      school: {
        id_escuela: row.id_escuela || '',
        codigo_local: row.codigo_local || '',
        nombre_escuela: row.nombre_escuela || '',
      },
      user: row.usuario || '',
      status: row.estado_borrador || 'en_curso',
      reason: row.motivo || '',
      counts: params.counts || {},
      time_tracking: params.timeTracking || (params.resumen && params.resumen.timeTracking) || {},
      summary: params.resumen || {},
      draft: params.values || {},
      evidence_index: Array.isArray(params.evidenceIndex) ? params.evidenceIndex : [],
    };
  }

  function _upsertDatabaseSyncQueue(payload, row, status, errorMessage, databaseUrl, attemptsIncrement) {
    _ensureColumns(SHEET_NAMES.DB_SYNC_QUEUE, _dbSyncQueueHeaders());
    const sheet = _getSheet(SHEET_NAMES.DB_SYNC_QUEUE);
    const headers = _headers(sheet);
    const id = payload.mutation_id || row.id_borrador || _genId('DBQ');
    const existingIdx = _findRowIndex(SHEET_NAMES.DB_SYNC_QUEUE, 'id_mutacion', id);
    const now = _timestamp();
    const previousAttempts = existingIdx !== -1 ? Number(_getByHeader(sheet, existingIdx, headers, 'intentos') || 0) : 0;
    const existingPayloadFileId = existingIdx !== -1 ? _getByHeader(sheet, existingIdx, headers, 'payload_file_id') : '';
    const payloadFile = _storeDatabaseSyncPayloadFile(payload, row, existingPayloadFileId);
    const queueRow = {
      id_mutacion: id,
      tipo_entidad: payload.entity || 'mec_draft',
      estado: status,
      intentos: previousAttempts + (attemptsIncrement ? 1 : 0),
      ultimo_error: errorMessage || '',
      database_url: databaseUrl || '',
      codigo_local: row.codigo_local || '',
      id_escuela: row.id_escuela || '',
      usuario: row.usuario || '',
      fecha_evento: row.fecha_guardado || now,
      app_version: row.app_version || '',
      payload_json: _jsonForSheet(payload, 18000),
      payload_file_id: payloadFile.id || '',
      payload_file_url: payloadFile.url || '',
      payload_file_error: payloadFile.error || '',
      creado_en: existingIdx !== -1 ? (_getByHeader(sheet, existingIdx, headers, 'creado_en') || now) : now,
      actualizado_en: now,
    };
    if (existingIdx !== -1) {
      Object.entries(queueRow).forEach(([key, value]) => _setByHeader(sheet, existingIdx, headers, key, value));
    } else {
      _appendObject(SHEET_NAMES.DB_SYNC_QUEUE, _dbSyncQueueHeaders(), queueRow);
    }
    return {
      status,
      queue_sheet: SHEET_NAMES.DB_SYNC_QUEUE,
      id_mutacion: id,
      attempts: queueRow.intentos,
      error: errorMessage || '',
      payload_file_url: payloadFile.url || '',
    };
  }

  function _storeDatabaseSyncPayloadFile(payload, row, existingFileId) {
    try {
      const body = JSON.stringify(payload);
      const filename = `db_sync_${_safeKey(row.codigo_local || row.id_escuela || 'escuela')}_${_safeKey(payload.mutation_id || 'mutacion')}.json`;
      if (existingFileId) {
        const existing = DriveApp.getFileById(existingFileId);
        existing.setContent(body);
        return { id: existing.getId(), url: existing.getUrl() };
      }
      const folder = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);
      const file = folder.createFile(filename, body, 'application/json');
      return { id: file.getId(), url: file.getUrl() };
    } catch (err) {
      return { id: existingFileId || '', url: '', error: err.message || String(err) };
    }
  }

  function _syncDraftToDatabase(params, row) {
    const payload = _databaseSyncPayloadForDraft(params, row);
    const mode = String(_config('DATABASE_SYNC_MODE', 'queue')).toLowerCase();
    const enabled = _configBool('DATABASE_SYNC_ENABLED', false);
    const url = String(_config('DATABASE_SYNC_URL', '') || '').trim();
    if (!enabled || !url || mode === 'queue') {
      const status = enabled && url ? 'pendiente' : 'pendiente_config';
      return _upsertDatabaseSyncQueue(payload, row, status, '', url, false);
    }
    try {
      _upsertDatabaseSyncQueue(payload, row, 'enviando', '', url, true);
      const token = _databaseSyncToken();
      const options = {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify(payload),
        followRedirects: true,
      };
      if (token) options.headers = { Authorization: `Bearer ${token}` };
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      if (code < 200 || code >= 300) {
        const body = String(response.getContentText() || '').slice(0, 400);
        throw new Error(`HTTP ${code}: ${body}`);
      }
      return _upsertDatabaseSyncQueue(payload, row, 'sincronizado', '', url, false);
    } catch (err) {
      return _upsertDatabaseSyncQueue(payload, row, 'error', err.message || String(err), url, false);
    }
  }

  function _databaseSyncToken() {
    try {
      const propsToken = PropertiesService.getScriptProperties().getProperty('DATABASE_SYNC_TOKEN');
      if (propsToken) return String(propsToken).trim();
    } catch (err) {
      // Fallback to configuracion sheet below.
    }
    return String(_config('DATABASE_SYNC_TOKEN', '') || '').trim();
  }

  function _resolveLaunchConfig(params) {
    const mode = params.launch_mode || _config('FORM_LAUNCH_MODE', 'web');
    let url = '';
    if (mode === 'android_intent') url = _config('FORM_ANDROID_INTENT_URL', '');
    if (mode === 'custom_scheme') url = _config('FORM_CUSTOM_SCHEME_URL', '');
    if (!url) url = _config('FORM_URL', APP_CONFIG_FORM_URL_FALLBACK_());
    return { mode, url };
  }

  function APP_CONFIG_FORM_URL_FALLBACK_() {
    return 'https://demo.mec.gov.py/demo_rue/login';
  }

  function _config(clave, fallback) {
    try {
      const rows = _sheetToObjects(SHEET_NAMES.CONFIG);
      const r = rows.find(x => String(x.clave) === String(clave));
      const value = r && r.valor !== '' && r.valor !== null && r.valor !== undefined ? r.valor : fallback;
      return typeof value === 'string' ? value.replace(/@gmial\.com/gi, '@gmail.com') : value;
    } catch (err) {
      return fallback;
    }
  }

  function _configBool(clave, fallback) {
    const v = String(_config(clave, fallback ? 'true' : 'false')).toLowerCase();
    return ['true','1','si','sí','yes'].includes(v);
  }

  function _modulosStats(idSesion) {
    const rows = _sheetToObjects(SHEET_NAMES.MODULOS).filter(r => String(r.id_sesion) === String(idSesion));
    const completados = rows.filter(r => ['finalizado','finalizada','completo','completado'].includes(String(r.estado))).length;
    return { total: MODULE_DEFAULTS.length, registrados: rows.length, completados };
  }

  function _inferirCalidadCierre(estado, params, stats) {
    if (estado === 'incidencia') return 'cierre_con_incidencia';
    if (params.folio_externo || params.ultimo_registro_externo) return 'confirmado_con_folio_externo';
    if (stats.completados >= stats.total) return 'confirmado_por_modulos';
    return 'cerrado_sin_folio_externo';
  }

  function _moduleLabel(code) {
    const found = MODULE_DEFAULTS.find(m => m[0] === code);
    return found ? found[1] : code;
  }

  function _moduleOrder(code) {
    const found = MODULE_DEFAULTS.find(m => m[0] === code);
    return found ? found[2] : 99;
  }

  function _escuelasMap() {
    const map = {};
    getEscuelas({}).data.forEach(e => {
      _schoolIdentityCandidates_(e.id_escuela, e.codigo_local).forEach(key => {
        map[key] = e;
      });
    });
    return map;
  }

  function _groupEscuelas(rows, field) {
    const m = {};
    rows.forEach(e => {
      const k = e[field] || 'Sin dato';
      if (!m[k]) m[k] = { [field]: k, total: 0, finalizadas: 0, en_curso: 0, pendientes: 0, incidencias: 0 };
      m[k].total++;
      if (e.estado_relevamiento === 'finalizada') m[k].finalizadas++;
      else if (e.estado_relevamiento === 'en_curso') m[k].en_curso++;
      else if (e.estado_relevamiento === 'incidencia') m[k].incidencias++;
      else m[k].pendientes++;
    });
    return Object.values(m).sort((a, b) => String(a[field]).localeCompare(String(b[field])));
  }

  function _groupEncuestador(escuelas, sesiones) {
    const m = {};
    function rowFor(k) {
      const key = k || 'Sin usuario';
      if (!m[key]) {
        m[key] = {
          encuestador: key,
          total_asignadas: 0,
          finalizadas: 0,
          incidencias: 0,
          sesiones: 0,
          registros_completados: 0,
          total_min: 0,
          count_fin: 0,
          _finalizadas: {},
          _incidencias: {},
        };
      }
      return m[key];
    }
    escuelas.forEach(e => {
      const k = e.encuestador_asignado || 'Sin asignar';
      const row = rowFor(k);
      const schoolKey = _sessionSchoolKey_(e) || _txt(e.id_escuela) || _txt(e.codigo_local) || ('asignada-' + row.total_asignadas);
      row.total_asignadas++;
      if (e.estado_relevamiento === 'finalizada') {
        row.finalizadas++;
        row._finalizadas[schoolKey] = true;
      }
      if (e.estado_relevamiento === 'incidencia') {
        row.incidencias++;
        row._incidencias[schoolKey] = true;
      }
    });
    sesiones.forEach(s => {
      const k = s.usuario || 'Sin usuario';
      const row = rowFor(k);
      const state = _sessionState_(s);
      const schoolKey = _sessionSchoolKey_(s) || _txt(s.id_sesion) || ('sesion-' + row.sesiones);
      row.sesiones++;
      if (s.duracion_minutos) {
        row.total_min += parseFloat(s.duracion_minutos) || 0;
        row.count_fin++;
      }
      if (['finalizada', 'completada', 'completo', 'cerrada', 'validada'].includes(state)) {
        row.registros_completados++;
        row._finalizadas[schoolKey] = true;
      }
      if (state === 'incidencia') {
        row.incidencias++;
        row._incidencias[schoolKey] = true;
      }
    });
    return Object.values(m).map(e => {
      const finalizadas = Math.max(Object.keys(e._finalizadas || {}).length, Number(e.registros_completados || 0));
      const incidencias = Object.keys(e._incidencias || {}).length;
      return {
        encuestador: e.encuestador,
        total_asignadas: e.total_asignadas,
        finalizadas,
        incidencias,
        sesiones: e.sesiones,
        registros_completados: e.registros_completados,
        promedio_minutos: e.count_fin ? Math.round(e.total_min / e.count_fin) : null,
      };
    }).sort((a, b) => b.finalizadas - a.finalizadas);
  }

  function _groupSesionesDia(sesiones) {
    const m = {};
    sesiones.filter(s => ['finalizada','incidencia'].includes(String(s.estado))).forEach(s => {
      const k = String(s.fecha_fin || s.fecha_inicio || '').slice(0, 10);
      if (!k) return;
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([fecha, count]) => ({ fecha, count })).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  function _groupModulos() {
    const rows = _sheetToObjects(SHEET_NAMES.MODULOS);
    const m = {};
    rows.forEach(r => {
      const k = r.modulo_nombre || r.modulo || 'Sin módulo';
      if (!m[k]) m[k] = { modulo: k, total: 0, finalizados: 0, promedio_minutos: 0, total_min: 0 };
      m[k].total++;
      if (['finalizado','finalizada','completo','completado'].includes(String(r.estado))) m[k].finalizados++;
      m[k].total_min += parseFloat(r.duracion_minutos) || 0;
    });
    return Object.values(m).map(r => ({ ...r, promedio_minutos: r.finalizados ? Math.round(r.total_min / r.finalizados) : null }));
  }

  function _updateUsuarioMirror(usuario, fields) {
    const rowIdx = _findRowIndex(SHEET_NAMES.USUARIOS, 'usuario', usuario);
    if (rowIdx === -1) return;
    const sheet = _getSheet(SHEET_NAMES.USUARIOS);
    const headers = _headers(sheet);
    if (fields.usuario !== undefined) _setByHeader(sheet, rowIdx, headers, 'usuario', fields.usuario);
    if (fields.nombres !== undefined) _setByHeader(sheet, rowIdx, headers, 'nombres', fields.nombres);
    if (fields.apellidos !== undefined) _setByHeader(sheet, rowIdx, headers, 'apellidos', fields.apellidos);
    if (fields.rol !== undefined) _setByHeader(sheet, rowIdx, headers, 'rol', fields.rol);
    if (fields.activo !== undefined) _setByHeader(sheet, rowIdx, headers, 'activo', fields.activo);
    if (fields.documento !== undefined) _setByHeader(sheet, rowIdx, headers, 'documento', fields.documento);
    if (fields.telefono !== undefined) _setByHeader(sheet, rowIdx, headers, 'telefono', fields.telefono);
    if (fields.correo !== undefined) _setByHeader(sheet, rowIdx, headers, 'correo', fields.correo);
    if (fields.password) _setByHeader(sheet, rowIdx, headers, 'password_hash', AuthService._hashPassword(fields.password));
  }

  function _appendObject(sheetName, headers, obj) {
    _ensureColumns(sheetName, headers);
    const sheet = _getSheet(sheetName);
    const currentHeaders = _headers(sheet);
    const row = currentHeaders.map(h => obj[h] !== undefined ? obj[h] : '');
    sheet.appendRow(row);
  }

  function _appendRow(sheetName, values) {
    _getSheet(sheetName).appendRow(values);
  }

  function _logEvento(id_sesion, id_escuela, usuario, tipo, detalle) {
    _ensureColumns(SHEET_NAMES.EVENTOS, ['id_evento','id_sesion','id_escuela','usuario','tipo_evento','fecha_hora','detalle']);
    _appendObject(SHEET_NAMES.EVENTOS, ['id_evento','id_sesion','id_escuela','usuario','tipo_evento','fecha_hora','detalle'], {
      id_evento: _genId('EVT'), id_sesion, id_escuela, usuario, tipo_evento: tipo, fecha_hora: _timestamp(), detalle
    });
  }

  function _ensureColumns(sheetName, expectedHeaders) {
    const ss = _getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
      return;
    }
    const headers = _headers(sheet);
    const missing = expectedHeaders.filter(h => headers.indexOf(h) === -1);
    if (missing.length) {
      const startCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    }
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange.setBackground('#1F3864').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  function _headers(sheet) {
    if (sheet.getLastColumn() === 0) return [];
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  }

  function _objectFromRow(sheet, rowIdx, headers) {
    const values = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  }

  function _setByHeader(sheet, rowIdx, headers, col, val) {
    const idx = headers.indexOf(col);
    if (idx !== -1) sheet.getRange(rowIdx, idx + 1).setValue(val);
  }

  function _getByHeader(sheet, rowIdx, headers, col) {
    const idx = headers.indexOf(col);
    return idx !== -1 ? sheet.getRange(rowIdx, idx + 1).getValue() : '';
  }

  function _first(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  function _txt(v) {
    if (v === undefined || v === null) return '';
    return String(v).trim();
  }

  function _clientMutationId(params) {
    return _txt(params && (params.clientMutationId || params.id_offline_queue));
  }

  function _safeKey(value) {
    return _txt(value).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 70) || 'sin-escuela';
  }

  function _r01CanManage_(session) {
    const role = _txt(session && session.rol).toLowerCase();
    return role === 'admin' || role === 'supervisor';
  }

  function _r01PublicSchool_(row) {
    row = row || {};
    return {
      id_escuela: _txt(row.id_escuela),
      codigo_local: _txt(row.codigo_local),
      nombre: _txt(row.nombre),
      departamento: _txt(row.departamento),
      distrito: _txt(row.distrito),
      localidad: _txt(row.localidad),
    };
  }

  function _r01SearchKey_(value) {
    return _txt(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function _uniqueSorted_(values) {
    const seen = {};
    (values || []).forEach(function(value) {
      const text = _txt(value);
      if (text) seen[text] = true;
    });
    return Object.keys(seen).sort(function(a, b) { return a.localeCompare(b); });
  }

  function _districtsByDepartment_(rows) {
    const grouped = {};
    (rows || []).forEach(function(row) {
      const departamento = _txt(row.departamento);
      const distrito = _txt(row.distrito);
      if (!departamento || !distrito) return;
      const key = _r01TerritoryKey_(departamento);
      if (!grouped[departamento]) grouped[departamento] = [];
      if (!grouped[key]) grouped[key] = [];
      if (grouped[departamento].indexOf(distrito) === -1) grouped[departamento].push(distrito);
      if (grouped[key].indexOf(distrito) === -1) grouped[key].push(distrito);
    });
    Object.keys(grouped).forEach(function(key) {
      grouped[key] = _uniqueSorted_(grouped[key]);
    });
    return grouped;
  }

  function _r01TerritoryKey_(value) {
    return _txt(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function _r01NormalizeContact_(row) {
    row = row || {};
    return {
      id_contacto: _txt(row.id_contacto),
      token: _txt(row.token),
      codigo_local: _txt(row.codigo_local || row.codigo || row.cod_local || row.local),
      id_escuela: _txt(row.id_escuela || row.id),
      nombre_escuela: _txt(row.nombre_escuela || row.escuela || row.nombre || row.institucion),
      director_nombre: _txt(row.director_nombre || row.director || row.directora || row.responsable || row.contacto),
      correo: _txt(row.correo || row.email || row.mail),
      celular: _txt(row.celular || row.telefono || row.whatsapp || row.numero),
      departamento: _txt(row.departamento),
      distrito: _txt(row.distrito),
      localidad: _txt(row.localidad || row.barrio || row.compania),
      url_cuestionario: _txt(row.url_cuestionario),
      estado_envio: _txt(row.estado_envio || row.estado),
      ultimo_envio: _txt(row.ultimo_envio || row.fecha_ultimo_envio),
      ultimo_error: _txt(row.ultimo_error),
      cantidad_envios: _txt(row.cantidad_envios),
      fuente: _txt(row.fuente),
      respuesta_id: _txt(row.respuesta_id),
      respuesta_fecha: _txt(row.respuesta_fecha),
    };
  }

  function _r01Url_(contact) {
    contact = contact || {};
    const qs = [
      ['token', contact.token],
      ['codigo_local', contact.codigo_local],
      ['id_escuela', contact.id_escuela],
      ['escuela', contact.nombre_escuela],
      ['departamento', contact.departamento],
      ['distrito', contact.distrito],
      ['localidad', contact.localidad],
      ['correo', contact.correo],
    ]
      .filter(function(pair) { return _txt(pair[1]); })
      .map(function(pair) { return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]); })
      .join('&');
    return R01_PUBLIC_URL + (qs ? '?' + qs : '');
  }

  function _r01FindContactRow_(contact) {
    _ensureColumns(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS);
    const rows = _sheetToObjects(SHEET_NAMES.R01_CONTACTOS);
    const token = _txt(contact && contact.token);
    const code = _txt(contact && contact.codigo_local);
    const id = _txt(contact && contact.id_escuela);
    const email = _txt(contact && contact.correo).toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (token && _same(row.token, token)) return i + 2;
      if (code && _same(row.codigo_local, code)) return i + 2;
      if (id && _same(row.id_escuela, id)) return i + 2;
      if (email && _txt(row.correo).toLowerCase() === email) return i + 2;
    }
    return -1;
  }

  function _r01MarkAnswered_(params, responseId, now) {
    try {
      _ensureColumns(SHEET_NAMES.R01_CONTACTOS, R01_CONTACT_HEADERS);
      const contact = _r01NormalizeContact_(params);
      contact.token = _txt(params.token || params.t);
      const rowIdx = _r01FindContactRow_(contact);
      if (rowIdx === -1) return;
      const sheet = _getSheet(SHEET_NAMES.R01_CONTACTOS);
      const headers = _headers(sheet);
      _setByHeader(sheet, rowIdx, headers, 'estado_envio', 'respondido');
      _setByHeader(sheet, rowIdx, headers, 'respuesta_id', responseId);
      _setByHeader(sheet, rowIdx, headers, 'respuesta_fecha', now);
      _setByHeader(sheet, rowIdx, headers, 'actualizado_en', now);
    } catch (err) {
      Logger.log('R01 mark answered error: ' + err);
    }
  }

  function _r01UpdateResponseAttachment_(responseId, url) {
    if (!responseId || !url) return;
    try {
      _ensureColumns(SHEET_NAMES.R01_RESPUESTAS, R01_RESPONSE_HEADERS);
      const rowIdx = _findRowIndex(SHEET_NAMES.R01_RESPUESTAS, 'id_respuesta', responseId);
      if (rowIdx === -1) return;
      const sheet = _getSheet(SHEET_NAMES.R01_RESPUESTAS);
      const headers = _headers(sheet);
      _setByHeader(sheet, rowIdx, headers, 'adjunto_url', url);
    } catch (err) {
      Logger.log('R01 attachment link error: ' + err);
    }
  }

  function _r01EmailHtml_(contact) {
    const escuela = _htmlEscape_(contact.nombre_escuela || 'su escuela');
    const director = _htmlEscape_(contact.director_nombre || 'Director/a');
    const url = _htmlEscape_(contact.url_cuestionario || _r01Url_(contact));
    return `
      <div style="font-family:Arial,sans-serif;color:#17352a;line-height:1.5">
        <h2 style="color:#0b5d3b;margin:0 0 12px">CIALPA - Cuestionario inicial R01</h2>
        <p>Estimado/a ${director}:</p>
        <p>Estamos preparando la visita tecnica a <strong>${escuela}</strong>. Para agilizar el trabajo en campo, solicitamos completar este cuestionario breve sobre servicios, conectividad, seguridad, electricidad y documentos disponibles.</p>
        <p>No necesita usuario ni contrasena. El formulario se completa desde el siguiente enlace:</p>
        <p><a href="${url}" style="display:inline-block;background:#0b5d3b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">Completar cuestionario inicial</a></p>
        <p>Si cuenta con plano, croquis o una fotografia de fachada, puede adjuntarlo al final del formulario.</p>
        <p>Por consultas, puede escribir a <a href="mailto:censoescuelaspy@gmail.com">censoescuelaspy@gmail.com</a>.</p>
        <p>Muchas gracias por su colaboracion.</p>
      </div>`;
  }

  function _getOrCreateFolder_(parent, name) {
    const safeName = _safeEvidenceFolderName(name || 'sin_nombre');
    const existing = parent.getFoldersByName(safeName);
    return existing.hasNext() ? existing.next() : parent.createFolder(safeName);
  }

  function _same(a, b) {
    return _txt(a).toLowerCase() === _txt(b).toLowerCase();
  }

  function _identityKey_(value) {
    return _txt(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function _sessionIdentityAliases_(session) {
    session = session || {};
    const fullName = `${session.nombres || ''} ${session.apellidos || ''}`.trim();
    const firstName = _txt(session.nombres).split(/\s+/)[0] || '';
    const firstLast = _txt(session.apellidos).split(/\s+/)[0] || '';
    return [
      session.usuario,
      session.id_usuario,
      fullName,
      firstName && firstLast ? `${firstName}.${firstLast}` : '',
      firstName && firstLast ? `${firstName} ${firstLast}` : '',
    ].filter(Boolean);
  }

  function _schoolAssignmentText_(escuela) {
    return [
      escuela && escuela.encuestador_asignado,
      escuela && escuela.usuario_asignado,
      escuela && escuela.encuestador,
      escuela && escuela.responsable,
      escuela && escuela.id_encuestador,
      escuela && escuela.id_usuario_asignado,
    ].filter(Boolean).join(' ');
  }

  function _canOperateSchool_(session, escuela) {
    if (!session || !escuela) return false;
    if (_same(escuela.id_escuela, 'ESC_DEMO_CIALPA')) return true;
    if (_txt(session.rol).toLowerCase() === 'admin') return true;
    if (_isAuthorizedAdmin(session)) return true;
    const assigned = _identityKey_(_schoolAssignmentText_(escuela));
    if (!assigned) return false;
    return _sessionIdentityAliases_(session)
      .map(_identityKey_)
      .filter(Boolean)
      .some(alias => assigned === alias || assigned.indexOf(alias) !== -1 || (assigned.length >= 6 && alias.indexOf(assigned) !== -1));
  }

  function _schoolAccessError_(escuela) {
    const assigned = _txt(escuela && (escuela.encuestador_asignado || escuela.usuario_asignado || escuela.encuestador)) || 'No asignada';
    return {
      status: 'error',
      code: 'SCHOOL_NOT_ASSIGNED',
      message: `Escuela no asignada a su usuario. Asignada a: ${assigned}.`,
    };
  }

  function _sessionState_(row) {
    return _estado(row && row.estado);
  }

  function _isOpenSession_(row) {
    return _sessionState_(row) === 'en_curso';
  }

  function _sessionSchoolKey_(row) {
    const id = _txt(row && row.id_escuela);
    const code = _txt(row && row.codigo_local);
    return _digits(code) || _digits(id) || id || code;
  }

  function _sameSessionSchool_(row, escuela, requestedId) {
    const keys = [
      _txt(escuela && escuela.id_escuela),
      _txt(escuela && escuela.codigo_local),
      _txt(requestedId),
      _digits(escuela && escuela.id_escuela),
      _digits(escuela && escuela.codigo_local),
      _digits(requestedId),
    ].filter(Boolean);
    const rowKeys = [
      _txt(row && row.id_escuela),
      _txt(row && row.codigo_local),
      _digits(row && row.id_escuela),
      _digits(row && row.codigo_local),
    ].filter(Boolean);
    return rowKeys.some(k => keys.indexOf(k) !== -1);
  }

  function _formatDateCell_(value) {
    if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
    const text = _txt(value);
    if (!text) return '';
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');
    return text;
  }

  function _formatTimeCell_(value) {
    if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, TZ, 'HH:mm:ss');
    const text = _txt(value);
    if (!text) return '';
    const isoMatch = text.match(/T(\d{2}:\d{2}:\d{2})/);
    if (isoMatch) return isoMatch[1];
    const timeMatch = text.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (timeMatch) return timeMatch[1].length === 5 ? `${timeMatch[1]}:00` : timeMatch[1];
    return text;
  }

  function _formatIsoCell_(value) {
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
    const text = _txt(value);
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text;
    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? text : parsed.toISOString();
  }

  function _normalizeSessionRow_(row) {
    const out = Object.assign({}, row || {});
    out.fecha_inicio = _formatDateCell_(out.fecha_inicio);
    out.hora_inicio = _formatTimeCell_(out.hora_inicio);
    out.inicio_iso = _formatIsoCell_(out.inicio_iso) || _asIso(out.fecha_inicio, out.hora_inicio);
    out.fecha_fin = _formatDateCell_(out.fecha_fin);
    out.hora_fin = _formatTimeCell_(out.hora_fin);
    out.fin_iso = _formatIsoCell_(out.fin_iso);
    out.estado = _sessionState_(out);
    return out;
  }

  function _sessionStartMs_(row) {
    const normalized = _normalizeSessionRow_(row);
    const text = normalized.inicio_iso || _asIso(normalized.fecha_inicio, normalized.hora_inicio);
    const ms = text ? new Date(text).getTime() : NaN;
    return isNaN(ms) ? 0 : ms;
  }

  function _digits(v) {
    return _txt(v).replace(/\D+/g, '');
  }

  function _num(v) {
    if (v === undefined || v === null || v === '') return '';
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? '' : n;
  }

  function _coord(v, axis) {
    if (v === undefined || v === null || v === '') return '';
    if (typeof v === 'number') return v;
    const text = _txt(v);
    if (!text) return '';

    let value = '';
    const hasDms = /[º°'"]/i.test(text);
    if (hasDms) {
      const parts = text.match(/(-?\d+(?:[.,]\d+)?)[^\d-]+(\d+(?:[.,]\d+)?)?[^\d-]*(\d+(?:[.,]\d+)?)?/);
      if (parts) {
        const deg = Math.abs(parseFloat(String(parts[1]).replace(',', '.'))) || 0;
        const min = parseFloat(String(parts[2] || 0).replace(',', '.')) || 0;
        const sec = parseFloat(String(parts[3] || 0).replace(',', '.')) || 0;
        value = deg + (min / 60) + (sec / 3600);
        if (/^-/.test(parts[1]) || /[SOW]/i.test(text)) value = -Math.abs(value);
      }
    }

    if (value === '') {
      const n = parseFloat(text.replace(',', '.'));
      if (isNaN(n)) return '';
      value = n;
    }

    if (!/^-/.test(text) && !/[NSEWO]/i.test(text)) {
      if (axis === 'lat' && value >= 19 && value <= 28) value = -Math.abs(value);
      if (axis === 'lng' && value >= 54 && value <= 63) value = -Math.abs(value);
    }

    if (axis === 'lat' && Math.abs(value) > 35) return '';
    if (axis === 'lng' && Math.abs(value) > 80) return '';
    return value;
  }

  function _isTrueish(v) {
    const t = _txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ['true', '1', 'si', 's', 'yes', 'y', 'piloto', 'muestra', 'muestra_piloto'].includes(t);
  }

  function _isPilotSchool_(row) {
    if (!row) return false;
    return _isTrueish(row.en_muestra_piloto)
      || _isTrueish(row.muestra_piloto)
      || _txt(row.orden_muestra_piloto) !== ''
      || _txt(row.prioridad_operativa).toLowerCase().indexOf('piloto') !== -1;
  }

  function _markSheetFallbackPilotRows_(rows, sourceName) {
    if (sourceName !== 'sheet' || !Array.isArray(rows) || rows.length === 0 || rows.length > 150 || rows.some(_isPilotSchool_)) {
      return rows;
    }
    return rows.map(function(row, index) {
      return Object.assign({}, row, {
        en_muestra_piloto: 'true',
        orden_muestra_piloto: row.orden_muestra_piloto || row.orden_visita || String(index + 1),
        prioridad_operativa: _txt(row.prioridad_operativa) && !_same(row.prioridad_operativa, 'media') ? row.prioridad_operativa : 'piloto'
      });
    });
  }

  function _isNumeric(v) {
    return v !== '' && v !== null && v !== undefined && !isNaN(parseFloat(v));
  }

  function _zona(v) {
    const t = _txt(v).toUpperCase();
    if (!t) return '';
    if (t.includes('URB')) return 'Urbana';
    if (t.includes('REM')) return 'Rural Remota';
    if (t.includes('RUR')) return 'Rural';
    return _txt(v);
  }

  function _estado(v) {
    const t = _txt(v).toLowerCase();
    if (['finalizada','en_curso','incidencia','pendiente','parcial','suspendida','revisar'].includes(t)) return t;
    if (t.includes('final') || t.includes('complet') || t.includes('cerr') || t.includes('entreg')) return 'finalizada';
    if (t.includes('curso')) return 'en_curso';
    if (t.includes('inci')) return 'incidencia';
    if (t.includes('parc')) return 'parcial';
    if (t.includes('susp')) return 'suspendida';
    if (t.includes('rev')) return 'revisar';
    return 'pendiente';
  }

  function _date(date) {
    return Utilities.formatDate(date || new Date(), TZ, 'yyyy-MM-dd');
  }

  function _time(date) {
    return Utilities.formatDate(date || new Date(), TZ, 'HH:mm:ss');
  }

  function _asIso(fecha, hora) {
    if (!fecha || !hora) return '';
    try { return new Date(`${fecha}T${hora}`).toISOString(); } catch (err) { return ''; }
  }

  return {
    getEscuelas, getEscuela, diagnosticoPadron, listarEscuelasCuestionarioInicial, updateEscuelaEstado, asignarEscuela,
    iniciarSesion, cerrarSesion, repararSesionesDuplicadasEnCurso, registrarEventoSesion, iniciarModulo, cerrarModulo, getModulosSesion,
    getSesionesAbiertas, getMisSesiones,
    getEncuestadores, saveEncuestador, deleteEncuestador,
    saveIncidencia, solicitarRelevamiento, aprobarSolicitudRelevamiento, uploadEvidence,
    saveComentarioApp, getComentariosApp, resolverComentarioApp,
    guardarCuestionarioInicial, guardarCuestionarioInicialAdjunto, importarContactosCuestionarioInicial, listarContactosCuestionarioInicial, enviarCuestionarioInicial,
    guardarBorradorMec, listarPerimetrosMec, listarFormulariosMec, reiniciarRelevamientoEscuela, guardarCierreCompleto, getIncidencias, resolverIncidencia,
    repararEstadosFinalizadosDesdeCierres,
    getConfig, setConfig, getStats, getResumenOperativo, getAuditoria, getCatalogos
  };
})();
