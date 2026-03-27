/**
 * CIALPA — Relevamiento Escolar
 * sheets.gs — Google Sheets data service
 * Version: 2.0.0
 */

const SheetsService = (() => {

  // ── Escuelas ──────────────────────────────────────────────────────────────

  function getEscuelas(filters) {
    let rows = _sheetToObjects(SHEET_NAMES.ESCUELAS);

    // Apply filters
    if (filters.departamento) rows = rows.filter(r => r.departamento === filters.departamento);
    if (filters.estado)        rows = rows.filter(r => r.estado_relevamiento === filters.estado);
    if (filters.encuestador)   rows = rows.filter(r => r.encuestador_asignado === filters.encuestador);
    if (filters.zona)          rows = rows.filter(r => r.zona === filters.zona);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter(r =>
        (r.nombre || '').toLowerCase().includes(q) ||
        (r.codigo_local || '').toLowerCase().includes(q)
      );
    }

    return { status: 'ok', data: rows };
  }

  function getEscuela(id) {
    const rows = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const escuela = rows.find(r => String(r.id_escuela) === String(id));
    if (!escuela) return { status: 'error', message: 'Escuela no encontrada.' };
    return { status: 'ok', data: escuela };
  }

  function updateEscuelaEstado(params) {
    const { id_escuela, estado, observacion } = params;
    const session = params._session;

    const rowIdx = _findRowIndex(SHEET_NAMES.ESCUELAS, 'id_escuela', id_escuela);
    if (rowIdx === -1) return { status: 'error', message: 'Escuela no encontrada.' };

    const sheet = _getSheet(SHEET_NAMES.ESCUELAS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

    const estadoCol = headers.indexOf('estado_relevamiento') + 1;
    const fechaCol  = headers.indexOf('fecha_ultimo_evento') + 1;
    const obsCol    = headers.indexOf('observaciones') + 1;

    if (estadoCol > 0) sheet.getRange(rowIdx, estadoCol).setValue(estado);
    if (fechaCol > 0)  sheet.getRange(rowIdx, fechaCol).setValue(_today());
    if (obsCol > 0 && observacion) sheet.getRange(rowIdx, obsCol).setValue(observacion);

    AuditService.log('UPDATE_ESCUELA_ESTADO', session.usuario, `id: ${id_escuela}, estado: ${estado}`);

    return { status: 'ok', message: 'Estado actualizado.' };
  }

  // ── Sesiones ──────────────────────────────────────────────────────────────

  function iniciarSesion(params) {
    const { id_escuela } = params;
    const session = params._session;

    // Check for open session for this school
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const open = sesiones.find(s =>
      String(s.id_escuela) === String(id_escuela) && s.estado === 'en_curso'
    );
    if (open) {
      return {
        status: 'error',
        message: 'Ya existe una sesión activa para esta escuela.',
        data: open,
        code: 'SESSION_OPEN',
      };
    }

    // Create session
    const id_sesion = _genId('SES');
    const fecha = _today();
    const hora  = _now();

    const newRow = [
      id_sesion,
      id_escuela,
      session.usuario,
      fecha,
      hora,
      '',    // fecha_fin
      '',    // hora_fin
      '',    // duracion_minutos
      'en_curso',
      '',    // observacion_cierre
      APP_FORM_URL(),
    ];

    _appendRow(SHEET_NAMES.SESIONES, newRow);

    // Update school state
    updateEscuelaEstado({ id_escuela, estado: 'en_curso', _session: session });

    // Log event
    _logEvento(id_sesion, id_escuela, session.usuario, 'INICIO_SESION', `Sesión iniciada: ${fecha} ${hora}`);
    AuditService.log('INICIO_SESION', session.usuario, `id_sesion: ${id_sesion}, escuela: ${id_escuela}`);

    return {
      status: 'ok',
      data: { id_sesion, id_escuela, usuario: session.usuario, fecha_inicio: fecha, hora_inicio: hora, estado: 'en_curso' },
    };
  }

  function cerrarSesion(params) {
    const { id_sesion, estado, observacion_cierre, duracion_minutos } = params;
    const session = params._session;

    const rowIdx = _findRowIndex(SHEET_NAMES.SESIONES, 'id_sesion', id_sesion);
    if (rowIdx === -1) return { status: 'error', message: 'Sesión no encontrada.' };

    const sheet = _getSheet(SHEET_NAMES.SESIONES);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const fecha_fin = _today();
    const hora_fin  = _now();

    const set = (col, val) => {
      const idx = headers.indexOf(col);
      if (idx !== -1) sheet.getRange(rowIdx, idx + 1).setValue(val);
    };

    set('fecha_fin', fecha_fin);
    set('hora_fin', hora_fin);
    set('duracion_minutos', duracion_minutos || '');
    set('estado', estado || 'finalizada');
    set('observacion_cierre', observacion_cierre || '');

    // Get session data to find escuela
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const sesion = sesiones.find(s => s.id_sesion === id_sesion);
    const id_escuela = sesion ? sesion.id_escuela : null;

    if (id_escuela) {
      updateEscuelaEstado({ id_escuela, estado: estado || 'finalizada', _session: session });
    }

    _logEvento(id_sesion, id_escuela, session.usuario, 'CIERRE_SESION',
      `Estado: ${estado}, Duración: ${duracion_minutos} min`);
    AuditService.log('CIERRE_SESION', session.usuario, `id_sesion: ${id_sesion}, estado: ${estado}`);

    return { status: 'ok', message: 'Sesión cerrada correctamente.' };
  }

  function getSesionesAbiertas(params) {
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const abiertas = sesiones.filter(s => s.estado === 'en_curso');

    // Enrich with school names
    const escuelas = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const escuelasMap = {};
    escuelas.forEach(e => { escuelasMap[e.id_escuela] = e.nombre; });
    abiertas.forEach(s => { s.nombre_escuela = escuelasMap[s.id_escuela] || s.id_escuela; });

    return { status: 'ok', data: abiertas };
  }

  function getMisSesiones(params) {
    const session = params._session;
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);
    const mias = sesiones.filter(s => s.usuario === session.usuario);

    // Enrich with school names
    const escuelas = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const escuelasMap = {};
    escuelas.forEach(e => { escuelasMap[e.id_escuela] = e.nombre; });
    mias.forEach(s => { s.nombre_escuela = escuelasMap[s.id_escuela] || s.id_escuela; });

    // Sort by date desc
    mias.sort((a, b) => {
      const da = `${a.fecha_inicio}${a.hora_inicio}`;
      const db = `${b.fecha_inicio}${b.hora_inicio}`;
      return db.localeCompare(da);
    });

    return { status: 'ok', data: mias };
  }

  // ── Encuestadores ─────────────────────────────────────────────────────────

  function getEncuestadores() {
    const rows = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    return { status: 'ok', data: rows };
  }

  function saveEncuestador(params) {
    const session = params._session;
    const { id_encuestador, usuario, nombres, apellidos, documento, telefono, correo, zona_asignada, rol, activo, password } = params;

    const isNew = !id_encuestador;

    if (isNew) {
      // Check duplicate username
      const existing = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
      if (existing.some(e => e.usuario === usuario)) {
        return { status: 'error', message: 'Ya existe un encuestador con ese usuario.' };
      }

      const newId = _genId('ENC');
      const passwordHash = password ? AuthService._hashPassword(password) : '';
      const newRow = [
        newId, usuario, nombres, apellidos, documento, telefono, correo,
        zona_asignada, rol || 'encuestador', '', activo || 'true', _today(), _today(),
      ];
      _appendRow(SHEET_NAMES.ENCUESTADORES, newRow);

      // Also create user account
      const userId = _genId('USR');
      const userRow = [
        userId, usuario, passwordHash, nombres, apellidos, rol || 'encuestador',
        activo || 'true', _today(), '', '',
      ];
      _appendRow(SHEET_NAMES.USUARIOS, userRow);

      AuditService.log('CREATE_ENCUESTADOR', session.usuario, `usuario: ${usuario}`);
      return { status: 'ok', message: 'Encuestador creado.' };

    } else {
      // Update existing
      const sheet = _getSheet(SHEET_NAMES.ENCUESTADORES);
      const rowIdx = _findRowIndex(SHEET_NAMES.ENCUESTADORES, 'id_encuestador', id_encuestador);
      if (rowIdx === -1) return { status: 'error', message: 'Encuestador no encontrado.' };

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
      const setVal = (col, val) => {
        const idx = headers.indexOf(col);
        if (idx !== -1) sheet.getRange(rowIdx, idx + 1).setValue(val);
      };

      setVal('nombres', nombres);
      setVal('apellidos', apellidos);
      setVal('documento', documento || '');
      setVal('telefono', telefono || '');
      setVal('correo', correo || '');
      setVal('zona_asignada', zona_asignada || '');
      setVal('rol', rol || 'encuestador');
      setVal('activo', activo || 'true');
      setVal('fecha_actualizacion', _today());

      // Update password in usuarios sheet if provided
      if (password) {
        const passwordHash = AuthService._hashPassword(password);
        const userSheet = _getSheet(SHEET_NAMES.USUARIOS);
        const userRowIdx = _findRowIndex(SHEET_NAMES.USUARIOS, 'usuario', usuario);
        if (userRowIdx !== -1) {
          const userHeaders = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
          const hashCol = userHeaders.indexOf('password_hash');
          if (hashCol !== -1) userSheet.getRange(userRowIdx, hashCol + 1).setValue(passwordHash);
        }
      }

      AuditService.log('UPDATE_ENCUESTADOR', session.usuario, `id: ${id_encuestador}, usuario: ${usuario}`);
      return { status: 'ok', message: 'Encuestador actualizado.' };
    }
  }

  function deleteEncuestador(params) {
    const { id_encuestador } = params;
    const session = params._session;

    // Soft delete: set activo = false
    const sheet = _getSheet(SHEET_NAMES.ENCUESTADORES);
    const rowIdx = _findRowIndex(SHEET_NAMES.ENCUESTADORES, 'id_encuestador', id_encuestador);
    if (rowIdx === -1) return { status: 'error', message: 'Encuestador no encontrado.' };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const activoCol = headers.indexOf('activo');
    const usuarioCol = headers.indexOf('usuario');
    if (activoCol !== -1) sheet.getRange(rowIdx, activoCol + 1).setValue('false');

    const usuario = activoCol !== -1 ? sheet.getRange(rowIdx, usuarioCol + 1).getValue() : '';

    // Also deactivate in usuarios sheet
    if (usuario) {
      const userRowIdx = _findRowIndex(SHEET_NAMES.USUARIOS, 'usuario', usuario);
      if (userRowIdx !== -1) {
        const userSheet = _getSheet(SHEET_NAMES.USUARIOS);
        const userHeaders = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
        const userActivoCol = userHeaders.indexOf('activo');
        if (userActivoCol !== -1) userSheet.getRange(userRowIdx, userActivoCol + 1).setValue('false');
      }
    }

    AuditService.log('DELETE_ENCUESTADOR', session.usuario, `id: ${id_encuestador}`);
    return { status: 'ok', message: 'Encuestador desactivado.' };
  }

  // ── Incidencias ───────────────────────────────────────────────────────────

  function saveIncidencia(params) {
    const { id_escuela, tipo_incidencia, descripcion, prioridad } = params;
    const session = params._session;

    const id = _genId('INC');
    const newRow = [
      id,
      id_escuela,
      session.usuario,
      _timestamp(),
      tipo_incidencia,
      descripcion,
      prioridad || 'media',
      'pendiente',   // estado_resolucion
      '',            // evidencia_url
    ];

    _appendRow(SHEET_NAMES.INCIDENCIAS, newRow);
    AuditService.log('SAVE_INCIDENCIA', session.usuario, `id: ${id}, escuela: ${id_escuela}, tipo: ${tipo_incidencia}`);

    return { status: 'ok', message: 'Incidencia registrada.', data: { id_incidencia: id } };
  }

  function getIncidencias(params) {
    const session = params._session;
    let rows = _sheetToObjects(SHEET_NAMES.INCIDENCIAS);

    // Non-admins/supervisors see only their own
    if (session.rol === 'encuestador') {
      rows = rows.filter(r => r.usuario === session.usuario);
    }

    // Filters
    if (params.estado) rows = rows.filter(r => r.estado_resolucion === params.estado);
    if (params.prioridad) rows = rows.filter(r => r.prioridad === params.prioridad);

    // Enrich with school names
    const escuelas = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const escuelasMap = {};
    escuelas.forEach(e => { escuelasMap[e.id_escuela] = e.nombre; });
    rows.forEach(r => { r.nombre_escuela = escuelasMap[r.id_escuela] || r.id_escuela; });

    // Sort by date desc
    rows.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));

    return { status: 'ok', data: rows };
  }

  function resolverIncidencia(params) {
    const { id_incidencia, resolucion } = params;
    const session = params._session;

    if (session.rol === 'encuestador') {
      return { status: 'error', message: 'No tenés permiso para resolver incidencias.' };
    }

    const sheet = _getSheet(SHEET_NAMES.INCIDENCIAS);
    const rowIdx = _findRowIndex(SHEET_NAMES.INCIDENCIAS, 'id_incidencia', id_incidencia);
    if (rowIdx === -1) return { status: 'error', message: 'Incidencia no encontrada.' };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const setVal = (col, val) => {
      const idx = headers.indexOf(col);
      if (idx !== -1) sheet.getRange(rowIdx, idx + 1).setValue(val);
    };

    setVal('estado_resolucion', 'resuelto');
    setVal('evidencia_url', resolucion || '');

    AuditService.log('RESOLVER_INCIDENCIA', session.usuario, `id: ${id_incidencia}`);
    return { status: 'ok', message: 'Incidencia resuelta.' };
  }

  // ── Configuración ─────────────────────────────────────────────────────────

  function getConfig() {
    const rows = _sheetToObjects(SHEET_NAMES.CONFIG);
    return { status: 'ok', data: rows };
  }

  function setConfig(params) {
    const { clave, valor } = params;
    const session = params._session;

    if (session.rol !== 'admin') {
      return { status: 'error', message: 'Solo administradores pueden cambiar la configuración.' };
    }

    const sheet = _getSheet(SHEET_NAMES.CONFIG);
    const rowIdx = _findRowIndex(SHEET_NAMES.CONFIG, 'clave', clave);
    if (rowIdx === -1) return { status: 'error', message: `Clave de configuración "${clave}" no encontrada.` };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const editableCol = headers.indexOf('editable');
    const editableVal = editableCol !== -1 ? sheet.getRange(rowIdx, editableCol + 1).getValue() : 'true';

    if (String(editableVal).toLowerCase() !== 'true') {
      return { status: 'error', message: 'Esta configuración no es editable.' };
    }

    const valorCol = headers.indexOf('valor');
    const fechaCol  = headers.indexOf('fecha_actualizacion');

    if (valorCol !== -1) sheet.getRange(rowIdx, valorCol + 1).setValue(valor);
    if (fechaCol  !== -1) sheet.getRange(rowIdx, fechaCol + 1).setValue(_timestamp());

    AuditService.log('SET_CONFIG', session.usuario, `clave: ${clave}, valor: ${valor}`);
    return { status: 'ok', message: 'Configuración guardada.' };
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  function getStats(params) {
    const session = params._session;

    if (session.rol === 'encuestador') {
      return { status: 'error', message: 'Acceso restringido.' };
    }

    const escuelas = _sheetToObjects(SHEET_NAMES.ESCUELAS);
    const sesiones = _sheetToObjects(SHEET_NAMES.SESIONES);

    // Apply date filters to sesiones
    let filteredSesiones = [...sesiones];
    if (params.fecha_desde) filteredSesiones = filteredSesiones.filter(s => s.fecha_inicio >= params.fecha_desde);
    if (params.fecha_hasta) filteredSesiones = filteredSesiones.filter(s => s.fecha_inicio <= params.fecha_hasta);
    if (params.encuestador) filteredSesiones = filteredSesiones.filter(s => s.usuario === params.encuestador);

    // Apply dept filter to escuelas
    let filteredEscuelas = [...escuelas];
    if (params.departamento) filteredEscuelas = filteredEscuelas.filter(e => e.departamento === params.departamento);

    const total = filteredEscuelas.length;
    const finalizadas = filteredEscuelas.filter(e => e.estado_relevamiento === 'finalizada').length;
    const en_curso    = filteredEscuelas.filter(e => e.estado_relevamiento === 'en_curso').length;
    const pendientes  = filteredEscuelas.filter(e => e.estado_relevamiento === 'pendiente').length;
    const con_incidencia = filteredEscuelas.filter(e => e.estado_relevamiento === 'incidencia').length;
    const pct_avance  = total > 0 ? Math.round((finalizadas / total) * 100) : 0;

    // Por departamento
    const depMap = {};
    filteredEscuelas.forEach(e => {
      const dep = e.departamento || 'Sin departamento';
      if (!depMap[dep]) depMap[dep] = { departamento: dep, total: 0, finalizadas: 0, en_curso: 0, pendientes: 0, incidencias: 0 };
      depMap[dep].total++;
      if (e.estado_relevamiento === 'finalizada')  depMap[dep].finalizadas++;
      else if (e.estado_relevamiento === 'en_curso') depMap[dep].en_curso++;
      else if (e.estado_relevamiento === 'pendiente') depMap[dep].pendientes++;
      else if (e.estado_relevamiento === 'incidencia') depMap[dep].incidencias++;
    });
    const por_departamento = Object.values(depMap).sort((a, b) => a.departamento.localeCompare(b.departamento));

    // Por encuestador
    const encMap = {};
    filteredEscuelas.forEach(e => {
      const enc = e.encuestador_asignado || 'Sin asignar';
      if (!encMap[enc]) encMap[enc] = { encuestador: enc, total_asignadas: 0, finalizadas: 0, incidencias: 0, total_min: 0, count_fin: 0 };
      encMap[enc].total_asignadas++;
      if (e.estado_relevamiento === 'finalizada')  encMap[enc].finalizadas++;
      if (e.estado_relevamiento === 'incidencia')  encMap[enc].incidencias++;
    });

    filteredSesiones.forEach(s => {
      const enc = s.usuario || '';
      if (encMap[enc] && s.duracion_minutos) {
        encMap[enc].total_min += parseInt(s.duracion_minutos) || 0;
        encMap[enc].count_fin++;
      }
    });

    const por_encuestador = Object.values(encMap).map(e => ({
      ...e,
      promedio_minutos: e.count_fin > 0 ? Math.round(e.total_min / e.count_fin) : null,
    })).sort((a, b) => b.finalizadas - a.finalizadas);

    // Por día (últimos 30 días)
    const diaMap = {};
    const treintaDias = new Date();
    treintaDias.setDate(treintaDias.getDate() - 30);
    const desde30 = Utilities.formatDate(treintaDias, 'America/Asuncion', 'yyyy-MM-dd');

    filteredSesiones
      .filter(s => s.estado === 'finalizada' && s.fecha_inicio >= desde30)
      .forEach(s => {
        const dia = s.fecha_inicio;
        diaMap[dia] = (diaMap[dia] || 0) + 1;
      });

    const por_dia = Object.entries(diaMap)
      .map(([fecha, count]) => ({ fecha, count }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Actividad reciente (last 20 events)
    const actividad_reciente = filteredSesiones
      .filter(s => s.fecha_inicio)
      .sort((a, b) => `${b.fecha_inicio}${b.hora_inicio}`.localeCompare(`${a.fecha_inicio}${a.hora_inicio}`))
      .slice(0, 20)
      .map(s => ({
        tipo: s.estado,
        usuario: s.usuario,
        escuela: s.id_escuela,
        fecha_hora: `${s.fecha_inicio} ${s.hora_inicio}`,
      }));

    return {
      status: 'ok',
      data: {
        total, finalizadas, en_curso, pendientes, con_incidencia, pct_avance,
        por_departamento, por_encuestador, por_dia, actividad_reciente,
      },
    };
  }

  // ── Auditoría ─────────────────────────────────────────────────────────────

  function getAuditoria(params) {
    const session = params._session;
    if (session.rol !== 'admin') {
      return { status: 'error', message: 'Acceso restringido a administradores.' };
    }

    let rows = _sheetToObjects(SHEET_NAMES.AUDITORIA);

    if (params.usuario)    rows = rows.filter(r => String(r.usuario).toLowerCase().includes(params.usuario.toLowerCase()));
    if (params.accion)     rows = rows.filter(r => String(r.accion).toLowerCase().includes(params.accion.toLowerCase()));
    if (params.fecha_desde) rows = rows.filter(r => String(r.fecha_hora) >= params.fecha_desde);
    if (params.fecha_hasta) rows = rows.filter(r => String(r.fecha_hora).slice(0, 10) <= params.fecha_hasta);

    rows.sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));

    // Pagination
    const page = parseInt(params.page) || 1;
    const per_page = 50;
    const total = rows.length;
    const total_pages = Math.ceil(total / per_page);
    const start = (page - 1) * per_page;
    const paged = rows.slice(start, start + per_page);

    return {
      status: 'ok',
      data: paged,
      pagination: { page, per_page, total, total_pages },
    };
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────

  function getCatalogos(tipo) {
    let rows = _sheetToObjects(SHEET_NAMES.CATALOGOS);
    if (tipo) rows = rows.filter(r => r.tipo === tipo);
    rows = rows.filter(r => String(r.activo).toLowerCase() === 'true');
    rows.sort((a, b) => (parseInt(a.orden) || 0) - (parseInt(b.orden) || 0));
    return { status: 'ok', data: rows };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  function _appendRow(sheetName, values) {
    const sheet = _getSheet(sheetName);
    sheet.appendRow(values);
  }

  function _logEvento(id_sesion, id_escuela, usuario, tipo, detalle) {
    const id = _genId('EVT');
    _appendRow(SHEET_NAMES.EVENTOS, [id, id_sesion, id_escuela, usuario, tipo, _timestamp(), detalle]);
  }

  function APP_FORM_URL() {
    try {
      const config = _sheetToObjects(SHEET_NAMES.CONFIG);
      const row = config.find(c => c.clave === 'FORM_URL');
      return row ? row.valor : 'https://demo.mec.gov.py/demo_rue/login';
    } catch {
      return 'https://demo.mec.gov.py/demo_rue/login';
    }
  }

  return {
    getEscuelas, getEscuela, updateEscuelaEstado,
    iniciarSesion, cerrarSesion, getSesionesAbiertas, getMisSesiones,
    getEncuestadores, saveEncuestador, deleteEncuestador,
    saveIncidencia, getIncidencias, resolverIncidencia,
    getConfig, setConfig,
    getStats,
    getAuditoria,
    getCatalogos,
  };
})();
