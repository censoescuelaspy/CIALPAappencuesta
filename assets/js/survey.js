/**
 * CIALPA, Relevamiento Escolar
 * survey.js, control operativo de aplicación externa y medición de tiempos
 * Version: 2.6.68
 */

const SurveyModule = (() => {
  'use strict';

  let _currentEscuela = null;
  let _currentSession = null;
  let _formWindow = null;
  let _timerInterval = null;
  let _elapsedSeconds = 0;
  let _moduleLogs = [];
  let _launchConfig = null;
  let _startingSurvey = false;

  const STATE = {
    IDLE: 'idle',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    INCIDENT: 'incident',
  };

  const MODULES = [
    { codigo: 'establecimiento', nombre: 'Datos generales del establecimiento', orden: 1 },
    { codigo: 'direccion_contacto', nombre: 'Dirección, contacto y llegada', orden: 2 },
    { codigo: 'espacios_fisicos', nombre: 'Inventario de espacios físicos', orden: 3 },
    { codigo: 'aulas', nombre: 'Aulas y ambientes pedagógicos', orden: 4 },
    { codigo: 'sanitarios', nombre: 'Sanitarios y saneamiento', orden: 5 },
    { codigo: 'agua_energia', nombre: 'Agua, energía y conectividad', orden: 6 },
    { codigo: 'seguridad_accesibilidad', nombre: 'Seguridad, accesibilidad y riesgos', orden: 7 },
    { codigo: 'evidencias', nombre: 'Fotografías y evidencias', orden: 8 },
    { codigo: 'revision_cierre', nombre: 'Revisión final y cierre', orden: 9 },
  ];

  let _state = STATE.IDLE;

  function _setState(newState) {
    _state = newState;
    _renderSurveyPanel();
  }

  function _startTimer(initialSeconds = 0) {
    _stopTimer();
    _elapsedSeconds = Math.max(0, parseInt(initialSeconds, 10) || 0);
    _updateTimerDisplay();
    _timerInterval = setInterval(() => {
      _elapsedSeconds++;
      _updateTimerDisplay();
    }, 1000);
  }

  function _stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function _updateTimerDisplay() {
    const display = document.getElementById('survey-timer');
    if (display) display.textContent = _formatDuration(_elapsedSeconds);
  }

  function _formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function _formatMinutes(seconds) {
    return Math.max(1, Math.ceil((parseInt(seconds, 10) || 0) / 60));
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _digits(value) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  function _sameSchoolSession(session, school) {
    if (!session || !school) return false;
    const sessionKeys = [session.id_escuela, session.codigo_local, _digits(session.id_escuela), _digits(session.codigo_local)]
      .map(v => String(v || '').trim())
      .filter(Boolean);
    const schoolKeys = [school.id_escuela, school.codigo_local, _digits(school.id_escuela), _digits(school.codigo_local)]
      .map(v => String(v || '').trim())
      .filter(Boolean);
    return sessionKeys.some(key => schoolKeys.includes(key));
  }

  async function _getLaunchConfig() {
    if (_launchConfig) return _launchConfig;
    try {
      const result = await API.getConfig();
      const data = _configRowsToObject(result.status === 'ok' ? result.data : {});
      _launchConfig = {
        mode: data.FORM_LAUNCH_MODE || data.form_launch_mode || 'web',
        webUrl: data.FORM_URL || APP_CONFIG.FORM_URL,
        androidIntentUrl: data.FORM_ANDROID_INTENT_URL || '',
        customSchemeUrl: data.FORM_CUSTOM_SCHEME_URL || '',
        fallbackSeconds: Math.max(0, parseInt(data.FORM_FALLBACK_SECONDS || '2', 10) || 2),
      };
    } catch {
      _launchConfig = { mode: 'web', webUrl: APP_CONFIG.FORM_URL, androidIntentUrl: '', customSchemeUrl: '', fallbackSeconds: 2 };
    }
    return _launchConfig;
  }

  function _configRowsToObject(config) {
    if (!Array.isArray(config)) return config || {};
    return config.reduce((acc, row) => {
      const key = row.clave || row.key || row.nombre;
      if (key) acc[key] = row.valor ?? row.value ?? '';
      return acc;
    }, {});
  }

  function _deviceDescription() {
    return `${navigator.platform || ''} | ${navigator.userAgent || ''}`.slice(0, 450);
  }

  function _getGeoPosition() {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 5000 }
      );
    });
  }

  function _calculateElapsedFromSession(session) {
    const iso = session?.inicio_iso;
    if (iso) {
      const t = new Date(iso).getTime();
      if (!Number.isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 1000));
    }
    try {
      const start = new Date(`${session.fecha_inicio}T${session.hora_inicio}`);
      return Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
    } catch {
      return 0;
    }
  }

  function selectEscuela(id) {
    if (!Auth.requireAuth()) return;

    if (_startingSurvey) {
      UI.showToast('Ya se esta iniciando la sesion. Espere la confirmacion.', 'warning');
      return;
    }
    if (_state === STATE.IN_PROGRESS) {
      UI.showAlert('Sesión activa', `Ya existe una sesión activa en "${_currentEscuela?.nombre}". Debe cerrarse antes de iniciar otra.`, 'warning');
      AppController.showModule('encuesta');
      return;
    }

    const escuelas = MapModule.getEscuelas();
    const escuela = escuelas.find(e => e.id_escuela === id || e.codigo_local === id);
    if (escuela) {
      if (!setCurrentEscuela(escuela)) return;
      AppController.showModule('encuesta');
      _renderSurveyPanel();
      return;
    }

    API.getEscuela(id).then(result => {
      if (result.status === 'ok') {
        if (!setCurrentEscuela(result.data)) return;
        AppController.showModule('encuesta');
        _renderSurveyPanel();
      }
    });
  }

  function setCurrentEscuela(escuela, options = {}) {
    if (!Auth.requireAuth()) return false;
    if (!escuela) return false;
    const incomingId = String(escuela.id_escuela || escuela.codigo_local || '');
    const currentId = String(_currentEscuela?.id_escuela || _currentEscuela?.codigo_local || '');
    if (_state === STATE.IN_PROGRESS && currentId && incomingId && currentId !== incomingId) {
      UI.showAlert('Sesion activa', `Ya existe una sesion activa en "${_currentEscuela?.nombre}". Debe cerrarse antes de iniciar otra.`, 'warning');
      AppController.showModule('encuesta');
      return false;
    }
    if (incomingId !== currentId) {
      _stopTimer();
      _currentSession = null;
      _moduleLogs = [];
      _state = STATE.IDLE;
      _elapsedSeconds = 0;
    }
    _currentEscuela = escuela;
    if (typeof MecFormModule !== 'undefined' && typeof MecFormModule.setSelectedSchool === 'function') {
      MecFormModule.setSelectedSchool(escuela, { render: false });
    }
    if (options.render) _renderSurveyPanel();
    return true;
  }

  async function startSurvey() {
    if (!Auth.requireAuth()) return;
    if (!_currentEscuela) {
      UI.showToast('Seleccione una escuela antes de iniciar el relevamiento.', 'warning');
      return;
    }
    if (_startingSurvey) {
      UI.showToast('Ya se esta iniciando la sesion. Espere la confirmacion.', 'warning');
      return;
    }
    if (_state === STATE.IN_PROGRESS) {
      UI.showToast('Ya hay una sesión activa.', 'warning');
      return;
    }

    _startingSurvey = true;
    try {
      const openResult = await API.getSesionesAbiertas();
      if (openResult.status === 'ok') {
        const open = (openResult.data || []).find(s => _sameSchoolSession(s, _currentEscuela));
        if (open) {
          const confirmed = await UI.showConfirm('Sesión preexistente', `Existe una sesión abierta para esta escuela iniciada por ${open.usuario}. ¿Desea recuperarla?`);
          if (!confirmed) {
            _startingSurvey = false;
            return;
          }
          _currentSession = open;
          _moduleLogs = [];
          _setState(STATE.IN_PROGRESS);
          _startTimer(_calculateElapsedFromSession(open));
          await refreshModuleLogs();
          await openExternalSurveyApp();
          _startingSurvey = false;
          return;
        }
      }
    } catch {
      // Se permite continuar, el servidor volverá a validar concurrencia.
    }

    try {
      const launchCfg = await _getLaunchConfig();
      const gps = await _getGeoPosition();
      const result = await API.iniciarSesion(_currentEscuela.id_escuela, {
        dispositivo: _deviceDescription(),
        launch_mode: launchCfg.mode,
        launch_url: _resolveLaunchUrl(launchCfg),
        ...gps,
      });

      if (result.status !== 'ok') {
        UI.showToast(result.message || 'No se pudo iniciar la sesión.', 'error');
        return;
      }

      _currentSession = result.data;
      _moduleLogs = [];
      _currentEscuela.estado_relevamiento = 'en_curso';
      _setState(STATE.IN_PROGRESS);
      _startTimer(_calculateElapsedFromSession(result.data));
      await openExternalSurveyApp();
      UI.showToast(`Sesión iniciada para "${_currentEscuela.nombre}".`, 'success');
    } catch (err) {
      UI.showToast(`Error al iniciar sesión: ${err.message}`, 'error');
    } finally {
      _startingSurvey = false;
    }
  }

  function _resolveLaunchUrl(config) {
    if (config.mode === 'android_intent' && config.androidIntentUrl) return config.androidIntentUrl;
    if (config.mode === 'custom_scheme' && config.customSchemeUrl) return config.customSchemeUrl;
    return config.webUrl || APP_CONFIG.FORM_URL;
  }

  async function openExternalSurveyApp() {
    if (!_currentSession) {
      UI.showToast('Debe iniciar una sesión antes de preparar la migración.', 'warning');
      return;
    }

    const config = await _getLaunchConfig();
    const targetUrl = _currentSession.url_formulario_usada || _resolveLaunchUrl(config);

    try {
      await API.registrarEventoSesion({
        id_sesion: _currentSession.id_sesion,
        id_escuela: _currentEscuela?.id_escuela || '',
        tipo_evento: 'MIGRACION_RUE_MEC_PREPARADA',
        detalle: `Migracion en desarrollo; destino previsto: ${targetUrl}`,
      });
    } catch {
      // No bloqueante para trabajo de campo.
    }

    UI.showToast('Migración al RUE-MEC en desarrollo. Por ahora se prepara el paquete de datos CIALPA y se conserva el registro local.', 'info', 7000);
  }

  function _monitorExternalWindow() {
    if (!_formWindow) return;
    const pollClose = setInterval(() => {
      if (_formWindow && _formWindow.closed) {
        clearInterval(pollClose);
        if (_state === STATE.IN_PROGRESS) UI.showToast('El aplicativo/formulario externo fue cerrado. Registre módulos y cierre la sesión cuando corresponda.', 'warning', 7000);
      }
    }, 2000);
  }

  async function startModule(codigo) {
    if (!_currentSession) return;
    const module = MODULES.find(m => m.codigo === codigo);
    if (!module) return;
    const active = _moduleLogs.find(m => m.estado === 'en_curso');
    if (active) {
      const confirmed = await UI.showConfirm('Módulo en curso', `El módulo "${active.modulo_nombre || active.modulo}" está en curso. ¿Iniciar otro de todas formas?`);
      if (!confirmed) return;
    }
    try {
      const result = await API.iniciarModulo({
        id_sesion: _currentSession.id_sesion,
        id_escuela: _currentEscuela?.id_escuela || '',
        modulo: module.codigo,
        modulo_nombre: module.nombre,
        orden: module.orden,
      });
      if (result.status !== 'ok') {
        UI.showToast(result.message || 'No se pudo iniciar el módulo.', 'error');
        return;
      }
      await refreshModuleLogs();
      UI.showToast(`Módulo iniciado: ${module.nombre}.`, 'success');
    } catch (err) {
      UI.showToast(`Error al iniciar módulo: ${err.message}`, 'error');
    }
  }

  async function closeModule(codigo) {
    if (!_currentSession) return;
    const active = _moduleLogs.find(m => m.modulo === codigo && m.estado === 'en_curso');
    if (!active) {
      UI.showToast('No hay un registro abierto para ese módulo.', 'warning');
      return;
    }
    const observacion = await UI.showPrompt('Observación del módulo (opcional):') || '';
    const registros = await UI.showPrompt('Cantidad aproximada de registros/espacios cargados en este módulo (opcional):') || '';
    try {
      const result = await API.cerrarModulo({
        id_modulo: active.id_modulo,
        id_sesion: _currentSession.id_sesion,
        modulo: codigo,
        estado: 'finalizado',
        observacion,
        registros_completados: registros,
      });
      if (result.status !== 'ok') {
        UI.showToast(result.message || 'No se pudo cerrar el módulo.', 'error');
        return;
      }
      await refreshModuleLogs();
      UI.showToast('Módulo cerrado correctamente.', 'success');
    } catch (err) {
      UI.showToast(`Error al cerrar módulo: ${err.message}`, 'error');
    }
  }

  async function refreshModuleLogs() {
    if (!_currentSession) return;
    try {
      const result = await API.getModulosSesion(_currentSession.id_sesion);
      _moduleLogs = result.status === 'ok' ? (result.data || []) : [];
      _renderSurveyPanel();
    } catch {
      _moduleLogs = _moduleLogs || [];
    }
  }

  async function endSurvey(withIncident = false) {
    if (_state !== STATE.IN_PROGRESS) {
      UI.showToast('No hay sesión activa para cerrar.', 'warning');
      return;
    }

    const confirmed = await UI.showConfirm(
      withIncident ? 'Cerrar con incidencia' : 'Cerrar relevamiento',
      withIncident ? '¿Desea cerrar la sesión y registrar una incidencia operativa?' : '¿Confirma que terminó la carga CIALPA y queda lista para migración?'
    );
    if (!confirmed) return;

    let observacion = '';
    let folio = '';
    let ultimoRegistro = '';
    let estado = withIncident ? 'incidencia' : 'finalizada';

    if (withIncident) {
      observacion = await UI.showPrompt('Descripción de la incidencia:');
      if (observacion === null) return;
    } else {
      folio = await UI.showPrompt('ID de paquete CIALPA o identificador de migración (opcional):') || '';
      ultimoRegistro = await UI.showPrompt('Último módulo o espacio físico cargado en CIALPA (recomendado):') || '';
      observacion = await UI.showPrompt('Observaciones de cierre (opcional):') || '';
      const partial = await UI.showConfirm('Calidad del cierre', '¿El relevamiento quedó completo en todos los módulos esperados?');
      estado = partial ? 'finalizada' : 'parcial';
    }

    const gps = await _getGeoPosition();
    const duracion = _formatMinutes(_elapsedSeconds);

    try {
      const result = await API.cerrarSesion(_currentSession.id_sesion, {
        estado,
        observacion_cierre: observacion,
        duracion_minutos: duracion,
        duracion_segundos: _elapsedSeconds,
        folio_externo: folio,
        ultimo_registro_externo: ultimoRegistro,
        calidad_cierre: withIncident ? 'incidencia' : (estado === 'finalizada' ? 'completo_confirmado' : 'parcial_confirmado'),
        ...gps,
      });

      if (result.status !== 'ok') {
        UI.showToast(result.message || 'Error al cerrar sesión.', 'error');
        return;
      }

      _stopTimer();
      if (withIncident) {
        _setState(STATE.INCIDENT);
        if (typeof IncidenciasModule !== 'undefined') IncidenciasModule.openNew(_currentEscuela.id_escuela, observacion);
      } else {
        _setState(STATE.COMPLETED);
      }

      _currentEscuela.estado_relevamiento = estado;
      UI.showToast(withIncident ? 'Sesión cerrada con incidencia.' : `Relevamiento cerrado. Duración: ${duracion} min.`, withIncident ? 'warning' : 'success', 6000);
      _currentSession = null;
    } catch (err) {
      UI.showToast(`Error al cerrar sesión: ${err.message}`, 'error');
    }
  }

  function _renderModuleTracker() {
    if (_state !== STATE.IN_PROGRESS || !_currentSession) return '';
    const completed = new Set(_moduleLogs.filter(m => m.estado === 'finalizado').map(m => m.modulo));
    const active = new Set(_moduleLogs.filter(m => m.estado === 'en_curso').map(m => m.modulo));

    return `
      <div class="module-tracker">
        <div class="module-tracker__header">
          <div>
            <h4>Control de módulos del relevamiento</h4>
            <p>Use este control para medir tiempos parciales mientras carga el cuestionario CIALPA y prepara la migración al RUE-MEC.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="SurveyModule.refreshModuleLogs()">Actualizar</button>
        </div>
        <div class="module-grid">
          ${MODULES.map(m => {
            const status = completed.has(m.codigo) ? 'finalizado' : (active.has(m.codigo) ? 'en_curso' : 'pendiente');
            const label = status === 'finalizado' ? 'Finalizado' : (status === 'en_curso' ? 'En curso' : 'Pendiente');
            return `
              <div class="module-card module-card--${status}">
                <div class="module-card__top">
                  <span class="module-card__order">${m.orden}</span>
                  <span class="module-card__status">${label}</span>
                </div>
                <div class="module-card__title">${_escape(m.nombre)}</div>
                <div class="module-card__actions">
                  ${status === 'en_curso'
                    ? `<button class="btn btn-success btn-sm" onclick="SurveyModule.closeModule('${m.codigo}')">Cerrar módulo</button>`
                    : `<button class="btn btn-outline btn-sm" onclick="SurveyModule.startModule('${m.codigo}')">Iniciar</button>`}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function _renderSurveyPanel() {
    const container = document.getElementById('survey-panel');
    if (!container) return;

    if (!_currentEscuela) {
      container.innerHTML = `
        <div class="survey-empty">
          <h3>En desarrollo</h3>
        </div>`;
      return;
    }

    const e = _currentEscuela;
    const estado = e.estado_relevamiento || 'pendiente';
    const estadoColor = APP_CONFIG.STATE_COLORS[estado] || '#6c757d';
    const estadoLabel = APP_CONFIG.STATE_LABELS[estado] || estado;

    const timerSection = _state === STATE.IN_PROGRESS ? `
      <div class="survey-timer-section">
        <div class="survey-timer">
          <span class="survey-timer__label">Tiempo operativo transcurrido</span>
          <span class="survey-timer__display" id="survey-timer">${_formatDuration(_elapsedSeconds)}</span>
        </div>
        <p class="survey-note">El tiempo se mide en CIALPA. La migración al RUE-MEC queda preparada como paquete de datos y se habilitará cuando el canal de importación esté definido.</p>
      </div>` : '';

    const actions = (() => {
      switch (_state) {
        case STATE.IDLE:
          return `
            <div class="survey-actions">
              <button class="btn btn-primary btn-lg" onclick="SurveyModule.startSurvey()">Preparar migración RUE-MEC</button>
              <button class="btn btn-outline" onclick="SurveyModule.clearSelection()">Cambiar escuela</button>
            </div>`;
        case STATE.IN_PROGRESS:
          return `
            <div class="survey-actions survey-actions--stacked">
              <button class="btn btn-outline" onclick="SurveyModule.openExternalSurveyApp()">Revisar paquete de migración</button>
              <button class="btn btn-success btn-lg" onclick="SurveyModule.endSurvey(false)">Cerrar relevamiento</button>
              <button class="btn btn-danger" onclick="SurveyModule.endSurvey(true)">Cerrar con incidencia</button>
            </div>`;
        case STATE.COMPLETED:
          return `<div class="survey-result survey-result--success"><p>Relevamiento cerrado correctamente.</p><button class="btn btn-primary" onclick="SurveyModule.clearSelection()">Relevar otra escuela</button></div>`;
        case STATE.INCIDENT:
          return `<div class="survey-result survey-result--warning"><p>Sesión cerrada con incidencia.</p><button class="btn btn-primary" onclick="SurveyModule.clearSelection()">Relevar otra escuela</button></div>`;
        default:
          return '';
      }
    })();

    const sessionInfo = _currentSession ? `
      <div class="survey-session-info">
        <small>ID sesión: ${_escape(_currentSession.id_sesion)} · Inicio: ${_escape(_currentSession.hora_inicio || '')} · Modo de apertura: ${_escape(_currentSession.launch_mode || '')}</small>
      </div>` : '';

    container.innerHTML = `
      <div class="survey-card">
        <div class="survey-card__header">
          <h3>${_escape(e.nombre)}</h3>
          <span class="badge" style="background:${estadoColor}">${_escape(estadoLabel)}</span>
        </div>
        <div class="survey-card__meta">
          <div class="meta-grid">
            <div><label>Código</label><span>${_escape(e.codigo_local || '—')}</span></div>
            <div><label>Departamento</label><span>${_escape(e.departamento || '—')}</span></div>
            <div><label>Distrito</label><span>${_escape(e.distrito || '—')}</span></div>
            <div><label>Localidad</label><span>${_escape(e.localidad || '—')}</span></div>
            <div><label>Zona</label><span>${_escape(e.zona || '—')}</span></div>
            <div><label>Encuestador</label><span>${_escape(e.encuestador_asignado || 'No asignado')}</span></div>
            <div><label>Supervisor</label><span>${_escape(e.supervisor_asignado || 'No asignado')}</span></div>
          </div>
        </div>
        ${timerSection}
        ${sessionInfo}
        ${_renderModuleTracker()}
        ${actions}
      </div>`;

    _updateTimerDisplay();
  }

  function clearSelection() {
    _stopTimer();
    _currentEscuela = null;
    _currentSession = null;
    _moduleLogs = [];
    _state = STATE.IDLE;
    _elapsedSeconds = 0;
    _renderSurveyPanel();
  }

  function getState() { return _state; }
  function getCurrentEscuela() { return _currentEscuela; }

  return {
    selectEscuela,
    setCurrentEscuela,
    startSurvey,
    endSurvey,
    startModule,
    closeModule,
    refreshModuleLogs,
    clearSelection,
    getState,
    getCurrentEscuela,
    openExternalSurveyApp,
    _openForm: openExternalSurveyApp,
  };
})();
