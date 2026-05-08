/**
 * CIALPA, Relevamiento Escolar
 * sheets.gs, servicio de datos y operación de campo
 * Version 2.1.0
 */

const SheetsService = (() => {

  const TZ = 'America/Asuncion';

  const OP_COLS_ESCUELAS = [
    'id_escuela', 'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona',
    'latitud', 'longitud', 'estado_relevamiento', 'encuestador_asignado', 'supervisor_asignado',
    'fecha_ultimo_evento', 'observaciones', 'orden_visita', 'fecha_programada', 'turno_programado',
    'prioridad_operativa', 'tiempo_estimado_min', 'ultima_sesion_id', 'folio_externo',
    'ultimo_registro_externo'
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

  function getEscuelas(filters) {
    const rawRows = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    let rows = rawRows.map((r, idx) => _normalizarEscuela(r, idx + 2)).filter(r => r.codigo_local || r.id_escuela || r.nombre);

    filters = filters || {};
    const session = filters._session;
    if (session && String(session.rol) === 'encuestador') {
      const aliases = [
        session.usuario,
        `${session.nombres || ''} ${session.apellidos || ''}`.trim(),
        session.id_usuario
      ].filter(Boolean).map(v => String(v).toLowerCase());
      rows = rows.filter(r => {
        const assigned = String(r.encuestador_asignado || '').toLowerCase();
        return aliases.some(alias => assigned === alias || assigned.includes(alias));
      });
    }
    if (filters.departamento) rows = rows.filter(r => _same(r.departamento, filters.departamento));
    if (filters.estado) rows = rows.filter(r => _same(r.estado_relevamiento, filters.estado));
    if (filters.encuestador) rows = rows.filter(r => _same(r.encuestador_asignado, filters.encuestador));
    if (filters.supervisor) rows = rows.filter(r => _same(r.supervisor_asignado, filters.supervisor));
    if (filters.zona) rows = rows.filter(r => _same(r.zona, filters.zona));
    if (filters.distrito) rows = rows.filter(r => _same(r.distrito, filters.distrito));
    if (filters.q) {
      const q = _txt(filters.q).toLowerCase();
      rows = rows.filter(r => (`${r.nombre} ${r.codigo_local} ${r.departamento} ${r.distrito} ${r.localidad}`).toLowerCase().includes(q));
    }

    return { status: 'ok', data: rows, meta: { total: rows.length, schema: 'canonical_v2_1' } };
  }

  function getEscuela(id) {
    const rawRows = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const found = rawRows.map((r, idx) => _normalizarEscuela(r, idx + 2)).find(r => _idMatch(r, id));
    if (!found) return { status: 'error', message: 'Escuela no encontrada.' };
    return { status: 'ok', data: found };
  }

  function updateEscuelaEstado(params) {
    const session = params._session;
    const id = params.id_escuela || params.codigo_local;
    const rowIdx = _findEscuelaRow(id);
    if (rowIdx === -1) return { status: 'error', message: 'Escuela no encontrada.' };

    _ensureColumns(SHEET_NAMES.ESCUELAS, OP_COLS_ESCUELAS);
    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = _headers(sheet);
    const set = (col, val) => _setByHeader(sheet, rowIdx, headers, col, val);

    const raw = _objectFromRow(sheet, rowIdx, headers);
    const normalized = _normalizarEscuela(raw, rowIdx);
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
    const rowIdx = _findEscuelaRow(params.id_escuela || params.codigo_local);
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

    const allowMultiple = _configBool('ALLOW_MULTIPLE_SESSIONS', false);
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const abierta = sesiones.find(s => String(s.id_escuela) === String(escuela.id_escuela) && String(s.estado) === 'en_curso');
    if (abierta && !allowMultiple) {
      return { status: 'error', message: 'Ya existe una sesión activa para esta escuela.', data: abierta, code: 'SESSION_OPEN' };
    }

    _ensureOperationalSheets();
    _ensureColumns(SHEET_NAMES.SESIONES, _sesionesHeaders());
    const launch = _resolveLaunchConfig(params);
    const id_sesion = _genId('SES');
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
    return { status: 'ok', data: row };
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
    const abiertos = _sheetToObjects(SHEET_NAMES.MODULOS).find(r => String(r.id_sesion) === String(params.id_sesion) && String(r.modulo) === String(params.modulo) && String(r.estado) === 'en_curso');
    if (abiertos) return { status: 'ok', data: abiertos, message: 'El módulo ya estaba en curso.' };
    const id_modulo = _genId('MOD');
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
        if (String(data[i][idxSesion]) === String(params.id_sesion) && String(data[i][idxModulo]) === String(params.modulo) && String(data[i][idxEstado]) === 'en_curso') {
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
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES).filter(s => String(s.estado) === 'en_curso');
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
    let rows = _sheetToObjects(SHEET_NAMES.SESIONES).filter(s => String(s.usuario) === String(session.usuario));
    const escuelas = _escuelasMap();
    rows.forEach(s => {
      const e = escuelas[s.id_escuela] || escuelas[s.codigo_local] || {};
      s.nombre_escuela = s.nombre_escuela || e.nombre || s.id_escuela;
      s.codigo_local = s.codigo_local || e.codigo_local || '';
    });
    rows.sort((a, b) => String(b.inicio_iso || `${b.fecha_inicio}${b.hora_inicio}`).localeCompare(String(a.inicio_iso || `${a.fecha_inicio}${a.hora_inicio}`)));
    return { status: 'ok', data: rows };
  }

  function getEncuestadores() {
    const rows = _sheetToObjects(SHEET_NAMES.ENCUESTADORES).filter(r => String(r.activo).toLowerCase() !== 'false');
    return { status: 'ok', data: rows };
  }

  function saveEncuestador(params) {
    const session = params._session;
    if (!_isAuthorizedAdmin(session)) return { status: 'error', message: 'Solo administradores autorizados pueden gestionar usuarios.' };
    const { id_encuestador, usuario, nombres, apellidos, documento, telefono, correo, zona_asignada, rol, activo, password } = params;
    if (!usuario || !nombres) return { status: 'error', message: 'Usuario y nombres son requeridos.' };
    _ensureColumns(SHEET_NAMES.ENCUESTADORES, ['id_encuestador','usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol','foto_url','activo','fecha_alta','fecha_actualizacion']);
    _ensureColumns(SHEET_NAMES.USUARIOS, ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual']);

    if (!id_encuestador) {
      const existing = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
      if (existing.some(e => _same(e.usuario, usuario))) return { status: 'error', message: 'Ya existe un encuestador con ese usuario.' };
      const newId = _genId('ENC');
      _appendObject(SHEET_NAMES.ENCUESTADORES, ['id_encuestador','usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol','foto_url','activo','fecha_alta','fecha_actualizacion'], {
        id_encuestador: newId, usuario, nombres, apellidos: apellidos || '', documento: documento || '', telefono: telefono || '', correo: correo || '', zona_asignada: zona_asignada || '', rol: rol || 'encuestador', foto_url: '', activo: activo === false ? 'false' : 'true', fecha_alta: _today(), fecha_actualizacion: _today()
      });
      _appendObject(SHEET_NAMES.USUARIOS, ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual'], {
        id_usuario: _genId('USR'), usuario, password_hash: password ? AuthService._hashPassword(password) : AuthService._hashPassword('cialpa2025'), nombres, apellidos: apellidos || '', rol: rol || 'encuestador', activo: activo === false ? 'false' : 'true', fecha_alta: _today(), ultimo_acceso: '', token_actual: ''
      });
      AuditService.log('CREATE_ENCUESTADOR', session.usuario, `usuario: ${usuario}`);
      return { status: 'ok', message: 'Encuestador creado.', data: { id_encuestador: newId } };
    }

    const sheet = _getSheet(SHEET_NAMES.ENCUESTADORES);
    const rowIdx = _findRowIndex(SHEET_NAMES.ENCUESTADORES, 'id_encuestador', id_encuestador);
    if (rowIdx === -1) return { status: 'error', message: 'Encuestador no encontrado.' };
    const headers = _headers(sheet);
    ['usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol'].forEach(k => _setByHeader(sheet, rowIdx, headers, k, params[k] || ''));
    _setByHeader(sheet, rowIdx, headers, 'activo', activo === false ? 'false' : 'true');
    _setByHeader(sheet, rowIdx, headers, 'fecha_actualizacion', _today());
    _updateUsuarioMirror(usuario, { nombres, apellidos: apellidos || '', rol: rol || 'encuestador', activo: activo === false ? 'false' : 'true', password });
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
    _ensureColumns(SHEET_NAMES.INCIDENCIAS, ['id_incidencia','id_escuela','usuario','fecha_hora','tipo_incidencia','descripcion','prioridad','estado_resolucion','evidencia_url','id_sesion','codigo_local','latitud','longitud']);
    const id = _genId('INC');
    _appendObject(SHEET_NAMES.INCIDENCIAS, ['id_incidencia','id_escuela','usuario','fecha_hora','tipo_incidencia','descripcion','prioridad','estado_resolucion','evidencia_url','id_sesion','codigo_local','latitud','longitud'], {
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
      latitud: params.gps_lat || '',
      longitud: params.gps_lng || ''
    });
    if (params.id_escuela) _updateEscuelaOperational(params.id_escuela, { estado_relevamiento: 'incidencia', fecha_ultimo_evento: _timestamp() });
    AuditService.log('SAVE_INCIDENCIA', session.usuario, `id: ${id}, escuela: ${params.id_escuela || ''}`);
    return { status: 'ok', message: 'Incidencia registrada.', data: { id_incidencia: id } };
  }

  function getIncidencias(params) {
    const session = params._session;
    let rows = _sheetToObjects(SHEET_NAMES.INCIDENCIAS);
    if (session.rol === 'encuestador') rows = rows.filter(r => String(r.usuario) === String(session.usuario));
    if (params.estado) rows = rows.filter(r => _same(r.estado_resolucion, params.estado));
    if (params.prioridad) rows = rows.filter(r => _same(r.prioridad, params.prioridad));
    const escuelas = _escuelasMap();
    rows.forEach(r => {
      const e = escuelas[r.id_escuela] || escuelas[r.codigo_local] || {};
      r.nombre_escuela = e.nombre || r.id_escuela || r.codigo_local || 'Sin escuela';
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
    const actividad_reciente = sesiones
      .filter(s => s.fecha_inicio || s.inicio_iso)
      .sort((a, b) => String(b.inicio_iso || `${b.fecha_inicio}${b.hora_inicio}`).localeCompare(String(a.inicio_iso || `${a.fecha_inicio}${a.hora_inicio}`)))
      .slice(0, 20)
      .map(s => ({ tipo: s.estado, usuario: s.usuario, escuela: s.nombre_escuela || s.id_escuela, fecha_hora: s.inicio_iso || `${s.fecha_inicio} ${s.hora_inicio}` }));

    return { status: 'ok', data: { total, finalizadas, en_curso, pendientes, con_incidencia, pct_avance, por_departamento, por_zona, por_encuestador, por_dia, por_modulo, actividad_reciente } };
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
        sesiones_abiertas: sesiones.filter(s => String(s.estado) === 'en_curso').length,
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

  function _normalizarEscuela(r, rowNumber) {
    const codigo = _first(r, ['codigo_local', 'CODIGO', 'Código', 'Codigo', 'Código de Local Escolar', 'Código Local Escolar', 'Cod_Local', 'local_escolar_codigo']);
    const id = _first(r, ['id_escuela', 'ID_ESCUELA', 'id', 'ID']) || (codigo ? `ESC_${_digits(codigo) || codigo}` : `ESC_ROW_${rowNumber}`);
    const lat = _first(r, ['latitud', 'LAT_DEC', 'Latitud', 'LATITUD', 'lat', 'LAT']);
    const lng = _first(r, ['longitud', 'LNG_DEC', 'Longitud', 'LONGITUD', 'lng', 'LNG', 'lon', 'LON']);
    const estado = _first(r, ['estado_relevamiento', 'ESTADO_RELEVAMIENTO']) || 'pendiente';
    const matricula = _first(r, ['MATRICULA', 'matricula', 'Matrícula']);
    const aulas = _first(r, ['AULAS_EST', 'aulas_est', 'aulas']);
    const obsBase = _first(r, ['observaciones', 'OBSERVACIONES']) || '';
    const extraObs = [];
    if (matricula !== '') extraObs.push(`Matrícula: ${matricula}`);
    if (aulas !== '') extraObs.push(`Aulas estimadas: ${aulas}`);

    return {
      id_escuela: _txt(id),
      codigo_local: _txt(codigo),
      nombre: _txt(_first(r, ['nombre', 'NOMBRE', 'Nombre', 'Nombre de Local Escolar', 'NOMBRE_LOCAL'])),
      departamento: _txt(_first(r, ['departamento', 'DEPTO', 'Departamento'])),
      distrito: _txt(_first(r, ['distrito', 'DIST', 'Distrito'])),
      localidad: _txt(_first(r, ['localidad', 'LOCALIDAD', 'Localidad'])),
      zona: _zona(_first(r, ['zona', 'ZONA', 'Zona'])),
      latitud: _num(lat),
      longitud: _num(lng),
      estado_relevamiento: _estado(estado),
      encuestador_asignado: _txt(_first(r, ['encuestador_asignado', 'ENCUESTADOR_ASIGNADO', 'encuestador'])),
      supervisor_asignado: _txt(_first(r, ['supervisor_asignado', 'SUPERVISOR_ASIGNADO', 'supervisor'])),
      fecha_ultimo_evento: _txt(_first(r, ['fecha_ultimo_evento', 'FECHA_ULTIMO_EVENTO'])),
      observaciones: [obsBase, ...extraObs].filter(Boolean).join(' | '),
      orden_visita: _txt(_first(r, ['orden_visita', 'ORDEN_VISITA', 'ENUMERA'])),
      fecha_programada: _txt(_first(r, ['fecha_programada', 'FECHA_PROGRAMADA'])),
      turno_programado: _txt(_first(r, ['turno_programado', 'TURNO_PROGRAMADO'])),
      prioridad_operativa: _txt(_first(r, ['prioridad_operativa', 'PRIORIDAD_OPERATIVA'])) || 'media',
      tiempo_estimado_min: _txt(_first(r, ['tiempo_estimado_min', 'TIEMPO_ESTIMADO_MIN'])),
      ultima_sesion_id: _txt(_first(r, ['ultima_sesion_id', 'ULTIMA_SESION_ID'])),
      folio_externo: _txt(_first(r, ['folio_externo', 'FOLIO_EXTERNO'])),
      ultimo_registro_externo: _txt(_first(r, ['ultimo_registro_externo', 'ULTIMO_REGISTRO_EXTERNO'])),
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
    return _same(e.id_escuela, v) || _same(e.codigo_local, v) || _same(_digits(e.codigo_local), _digits(v));
  }

  function _updateEscuelaOperational(id, fields) {
    const rowIdx = _findEscuelaRow(id);
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
  }

  function _sesionesHeaders() {
    return ['id_sesion','id_escuela','codigo_local','nombre_escuela','usuario','supervisor','fecha_inicio','hora_inicio','inicio_iso','fecha_fin','hora_fin','fin_iso','duracion_minutos','duracion_segundos','estado','observacion_cierre','url_formulario_usada','launch_mode','dispositivo','gps_inicio_lat','gps_inicio_lng','gps_fin_lat','gps_fin_lng','folio_externo','ultimo_registro_externo','modulos_completados','total_modulos','calidad_cierre','creado_en','actualizado_en'];
  }

  function _modulosHeaders() {
    return ['id_modulo','id_sesion','id_escuela','usuario','modulo','modulo_nombre','orden','inicio_iso','fin_iso','duracion_minutos','estado','observacion','registros_estimados','registros_completados','creado_en','actualizado_en'];
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
      return r && r.valor !== '' && r.valor !== null && r.valor !== undefined ? r.valor : fallback;
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
      map[e.id_escuela] = e;
      if (e.codigo_local) map[e.codigo_local] = e;
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
    escuelas.forEach(e => {
      const k = e.encuestador_asignado || 'Sin asignar';
      if (!m[k]) m[k] = { encuestador: k, total_asignadas: 0, finalizadas: 0, incidencias: 0, total_min: 0, count_fin: 0 };
      m[k].total_asignadas++;
      if (e.estado_relevamiento === 'finalizada') m[k].finalizadas++;
      if (e.estado_relevamiento === 'incidencia') m[k].incidencias++;
    });
    sesiones.forEach(s => {
      const k = s.usuario || 'Sin usuario';
      if (!m[k]) m[k] = { encuestador: k, total_asignadas: 0, finalizadas: 0, incidencias: 0, total_min: 0, count_fin: 0 };
      if (s.duracion_minutos) {
        m[k].total_min += parseFloat(s.duracion_minutos) || 0;
        m[k].count_fin++;
      }
    });
    return Object.values(m).map(e => ({ ...e, promedio_minutos: e.count_fin ? Math.round(e.total_min / e.count_fin) : null })).sort((a, b) => b.finalizadas - a.finalizadas);
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
    if (fields.nombres !== undefined) _setByHeader(sheet, rowIdx, headers, 'nombres', fields.nombres);
    if (fields.apellidos !== undefined) _setByHeader(sheet, rowIdx, headers, 'apellidos', fields.apellidos);
    if (fields.rol !== undefined) _setByHeader(sheet, rowIdx, headers, 'rol', fields.rol);
    if (fields.activo !== undefined) _setByHeader(sheet, rowIdx, headers, 'activo', fields.activo);
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

  function _same(a, b) {
    return _txt(a).toLowerCase() === _txt(b).toLowerCase();
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
    if (t.includes('final')) return 'finalizada';
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
    getEscuelas, getEscuela, updateEscuelaEstado, asignarEscuela,
    iniciarSesion, cerrarSesion, registrarEventoSesion, iniciarModulo, cerrarModulo, getModulosSesion,
    getSesionesAbiertas, getMisSesiones,
    getEncuestadores, saveEncuestador, deleteEncuestador,
    saveIncidencia, getIncidencias, resolverIncidencia,
    getConfig, setConfig, getStats, getResumenOperativo, getAuditoria, getCatalogos
  };
})();
