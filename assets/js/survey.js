/**
 * CIALPA — Relevamiento Escolar
 * survey.js — Survey session module
 * Version: 2.0.0
 *
 * State machine: idle → in_progress → completed | incident
 */

const SurveyModule = (() => {
  'use strict';

  // Local state
  let _currentEscuela = null;
  let _currentSession = null;
  let _formWindow = null;
  let _timerInterval = null;
  let _elapsedSeconds = 0;

  const STATE = {
    IDLE: 'idle',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    INCIDENT: 'incident',
  };

  let _state = STATE.IDLE;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _setState(newState) {
    _state = newState;
    _renderSurveyPanel();
  }

  function _startTimer() {
    _elapsedSeconds = 0;
    _timerInterval = setInterval(() => {
      _elapsedSeconds++;
      const display = document.getElementById('survey-timer');
      if (display) display.textContent = _formatDuration(_elapsedSeconds);
    }, 1000);
  }

  function _stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function _formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function _formatMinutes(seconds) {
    return Math.ceil(seconds / 60);
  }

  // ── Select a school ───────────────────────────────────────────────────────

  function selectEscuela(id) {
    if (!Auth.requireAuth()) return;

    if (_state === STATE.IN_PROGRESS) {
      UI.showAlert(
        'Sesión activa',
        `Ya tenés una sesión activa en "${_currentEscuela?.nombre}". Cerrala antes de iniciar otra.`,
        'warning'
      );
      AppController.showModule('encuesta');
      return;
    }

    // Find escuela from map data or request
    const escuelas = MapModule.getEscuelas();
    const escuela = escuelas.find(e => e.id_escuela === id);

    if (escuela) {
      _currentEscuela = escuela;
      AppController.showModule('encuesta');
      _renderSurveyPanel();
    } else {
      // Fetch from API
      API.getEscuela(id).then(result => {
        if (result.status === 'ok') {
          _currentEscuela = result.data;
          AppController.showModule('encuesta');
          _renderSurveyPanel();
        }
      });
    }
  }

  // ── Start survey ──────────────────────────────────────────────────────────

  async function startSurvey() {
    if (!Auth.requireAuth()) return;
    if (!_currentEscuela) {
      UI.showToast('Seleccioná una escuela primero.', 'warning');
      return;
    }
    if (_state === STATE.IN_PROGRESS) {
      UI.showToast('Ya hay una sesión activa.', 'warning');
      return;
    }

    // Check existing open sessions for this school
    try {
      const openResult = await API.getSesionesAbiertas();
      if (openResult.status === 'ok') {
        const open = openResult.data.find(s => s.id_escuela === _currentEscuela.id_escuela);
        if (open) {
          const confirmed = await UI.showConfirm(
            'Sesión preexistente',
            `Existe una sesión abierta para esta escuela iniciada por ${open.usuario}. ¿Querés recuperarla?`
          );
          if (confirmed) {
            _currentSession = open;
            _elapsedSeconds = _calculateElapsed(open.fecha_inicio, open.hora_inicio);
            _setState(STATE.IN_PROGRESS);
            _startTimer();
            _openForm();
            return;
          }
          return;
        }
      }
    } catch {
      // Non-fatal — proceed anyway
    }

    // Start new session
    try {
      const result = await API.iniciarSesion(_currentEscuela.id_escuela);
      if (result.status !== 'ok') {
        UI.showToast(result.message || 'No se pudo iniciar la sesión.', 'error');
        return;
      }

      _currentSession = result.data;
      _setState(STATE.IN_PROGRESS);
      _startTimer();
      _openForm();
      UI.showToast(`Sesión iniciada para "${_currentEscuela.nombre}"`, 'success');
    } catch (err) {
      UI.showToast(`Error al iniciar sesión: ${err.message}`, 'error');
    }
  }

  // ── Open MEC form ─────────────────────────────────────────────────────────

  function _openForm() {
    const url = APP_CONFIG.FORM_URL;
    _formWindow = window.open(url, 'cialpa_form', 'width=1200,height=800,resizable=yes,scrollbars=yes');

    // Poll for window close
    const pollClose = setInterval(() => {
      if (_formWindow && _formWindow.closed) {
        clearInterval(pollClose);
        if (_state === STATE.IN_PROGRESS) {
          UI.showToast('El formulario fue cerrado. Recordá cerrar la sesión correctamente.', 'warning', 6000);
        }
      }
    }, 2000);
  }

  // ── End survey ────────────────────────────────────────────────────────────

  async function endSurvey(withIncident = false) {
    if (_state !== STATE.IN_PROGRESS) {
      UI.showToast('No hay sesión activa para cerrar.', 'warning');
      return;
    }

    const confirmed = await UI.showConfirm(
      withIncident ? 'Registrar incidencia' : 'Cerrar sesión',
      withIncident
        ? '¿Confirmas que querés cerrar la sesión y registrar una incidencia?'
        : '¿La encuesta fue completada correctamente?'
    );
    if (!confirmed) return;

    let observacion = '';
    if (withIncident) {
      observacion = await UI.showPrompt('Descripción de la incidencia:');
      if (observacion === null) return; // cancelled
    } else {
      observacion = await UI.showPrompt('Observaciones de cierre (opcional):') || '';
    }

    const duracion = _formatMinutes(_elapsedSeconds);

    try {
      const result = await API.cerrarSesion(_currentSession.id_sesion, {
        estado: withIncident ? 'incidencia' : 'finalizada',
        observacion_cierre: observacion,
        duracion_minutos: duracion,
      });

      if (result.status !== 'ok') {
        UI.showToast(result.message || 'Error al cerrar sesión.', 'error');
        return;
      }

      _stopTimer();

      if (withIncident) {
        _setState(STATE.INCIDENT);
        // Redirect to incidencia form
        IncidenciasModule.openNew(_currentEscuela.id_escuela, observacion);
      } else {
        _setState(STATE.COMPLETED);
      }

      UI.showToast(
        withIncident ? 'Sesión cerrada con incidencia registrada.' : `Encuesta finalizada. Duración: ${duracion} min.`,
        withIncident ? 'warning' : 'success',
        5000
      );

      // Refresh map marker
      const updatedEstado = withIncident ? 'incidencia' : 'finalizada';
      _currentEscuela.estado_relevamiento = updatedEstado;

      _currentSession = null;

    } catch (err) {
      UI.showToast(`Error al cerrar sesión: ${err.message}`, 'error');
    }
  }

  // ── Calculate elapsed seconds from stored timestamps ──────────────────────

  function _calculateElapsed(fecha, hora) {
    try {
      const start = new Date(`${fecha}T${hora}`);
      return Math.floor((Date.now() - start.getTime()) / 1000);
    } catch {
      return 0;
    }
  }

  // ── Render survey panel UI ────────────────────────────────────────────────

  function _renderSurveyPanel() {
    const container = document.getElementById('survey-panel');
    if (!container) return;

    if (!_currentEscuela) {
      container.innerHTML = `
        <div class="survey-empty">
          <div class="survey-empty__icon">🏫</div>
          <h3>Seleccioná una escuela</h3>
          <p>Usá el mapa o la lista para seleccionar la escuela que vas a relevar.</p>
          <button class="btn btn-primary" onclick="AppController.showModule('mapa')">Ir al Mapa</button>
        </div>`;
      return;
    }

    const e = _currentEscuela;
    const estadoColor = APP_CONFIG.STATE_COLORS[e.estado_relevamiento] || '#6c757d';
    const estadoLabel = APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento;

    const timerSection = _state === STATE.IN_PROGRESS ? `
      <div class="survey-timer-section">
        <div class="survey-timer">
          <span class="survey-timer__label">Tiempo transcurrido</span>
          <span class="survey-timer__display" id="survey-timer">00:00:00</span>
        </div>
      </div>` : '';

    const actions = (() => {
      switch (_state) {
        case STATE.IDLE:
          return `
            <div class="survey-actions">
              <button class="btn btn-primary btn-lg" onclick="SurveyModule.startSurvey()">
                Iniciar Encuesta
              </button>
              <button class="btn btn-outline" onclick="SurveyModule.clearSelection()">
                Cambiar Escuela
              </button>
            </div>`;
        case STATE.IN_PROGRESS:
          return `
            <div class="survey-actions">
              <button class="btn btn-success btn-lg" onclick="SurveyModule.endSurvey(false)">
                Finalizar Encuesta
              </button>
              <button class="btn btn-danger" onclick="SurveyModule.endSurvey(true)">
                Registrar Incidencia
              </button>
              <button class="btn btn-outline" onclick="SurveyModule._openForm()">
                Abrir Formulario MEC
              </button>
            </div>`;
        case STATE.COMPLETED:
          return `
            <div class="survey-result survey-result--success">
              <p>Encuesta completada exitosamente.</p>
              <button class="btn btn-primary" onclick="SurveyModule.clearSelection()">Relevar otra escuela</button>
            </div>`;
        case STATE.INCIDENT:
          return `
            <div class="survey-result survey-result--warning">
              <p>Sesión cerrada con incidencia.</p>
              <button class="btn btn-primary" onclick="SurveyModule.clearSelection()">Relevar otra escuela</button>
            </div>`;
        default:
          return '';
      }
    })();

    const sessionInfo = _currentSession ? `
      <div class="survey-session-info">
        <small>ID sesión: ${_currentSession.id_sesion} · Iniciada: ${_currentSession.hora_inicio}</small>
      </div>` : '';

    container.innerHTML = `
      <div class="survey-card">
        <div class="survey-card__header">
          <h3>${e.nombre}</h3>
          <span class="badge" style="background:${estadoColor}">${estadoLabel}</span>
        </div>
        <div class="survey-card__meta">
          <div class="meta-grid">
            <div><label>Código</label><span>${e.codigo_local || '—'}</span></div>
            <div><label>Departamento</label><span>${e.departamento || '—'}</span></div>
            <div><label>Distrito</label><span>${e.distrito || '—'}</span></div>
            <div><label>Localidad</label><span>${e.localidad || '—'}</span></div>
            <div><label>Zona</label><span>${e.zona || '—'}</span></div>
            <div><label>Encuestador</label><span>${e.encuestador_asignado || 'No asignado'}</span></div>
          </div>
        </div>
        ${timerSection}
        ${sessionInfo}
        ${actions}
      </div>`;
  }

  function clearSelection() {
    _stopTimer();
    _currentEscuela = null;
    _currentSession = null;
    _state = STATE.IDLE;
    _elapsedSeconds = 0;
    _renderSurveyPanel();
  }

  function getState() {
    return _state;
  }

  function getCurrentEscuela() {
    return _currentEscuela;
  }

  return {
    selectEscuela,
    startSurvey,
    endSurvey,
    clearSelection,
    getState,
    getCurrentEscuela,
    _openForm, // exposed for "reopen form" button
  };
})();
