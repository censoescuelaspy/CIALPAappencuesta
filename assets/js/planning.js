/**
 * CIALPA — Relevamiento Escolar
 * planning.js — Estimacion de tiempos y distribucion operativa
 * Version: 2.6.89
 */

const PlanningModule = (() => {
  'use strict';

  const SETTINGS_KEY = 'cialpa_planning_settings';
  const DEFAULT_SETTINGS = {
    baseMinutes: Number(APP_CONFIG.DEFAULT_SCHOOL_ESTIMATE_MINUTES || 45),
    hoursPerDay: Number(APP_CONFIG.DEFAULT_WORKDAY_HOURS || 6),
    targetDays: 10,
  };
  const ASSIGNMENT_BATCH_SIZE = 90;

  let _schools = [];
  let _surveyors = [];
  let _draftAssignments = {};
  let _originalAssignments = {};
  let _activeTab = 'tiempos';
  let _filters = { estado: '', encuestador: '', muestra: '', search: '' };
  let _settings = _loadSettings();
  let _savingAssignments = false;
  let _assignmentLimit = ASSIGNMENT_BATCH_SIZE;

  async function init() {
    const root = document.getElementById('planning-root');
    if (!root) return;
    if (!Auth.canAccess('supervisor')) {
      root.innerHTML = '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
      return;
    }
    await load();
  }

  async function load(options = {}) {
    const root = document.getElementById('planning-root');
    if (root) root.innerHTML = '<div class="card"><p class="text-muted text-center">Cargando planificacion operativa...</p></div>';
    try {
      const mapSchools = !options.forceNetwork && typeof MapModule !== 'undefined' && typeof MapModule.getEscuelas === 'function'
        ? (MapModule.getEscuelas() || [])
        : [];
      const schoolsPromise = mapSchools.length
        ? Promise.resolve({ status: 'ok', data: mapSchools, cached: true, meta: { source: 'map_module' } })
        : API.getEscuelas({}, { preferCache: !options.forceNetwork, forceNetwork: Boolean(options.forceNetwork), cacheMaxAgeMs: 24 * 60 * 60 * 1000 });
      const [schoolsResult, surveyorResult] = await Promise.all([
        schoolsPromise,
        API.getEncuestadores().catch(() => ({ status: 'error', data: [] })),
      ]);
      if (schoolsResult.status !== 'ok') throw new Error(schoolsResult.message || 'No se pudieron cargar escuelas.');
      _schools = (schoolsResult.data || []).map(item => ({ ...item }));
      _surveyors = _normalizeSurveyors(surveyorResult.data || [], _schools);
      _originalAssignments = Object.fromEntries(_schools.map(school => [_schoolId(school), _assignedName(school)]));
      _draftAssignments = { ..._originalAssignments };
      _assignmentLimit = ASSIGNMENT_BATCH_SIZE;
      _render();
    } catch (err) {
      if (root) root.innerHTML = `<div class="card"><p class="access-denied">Error al cargar planificacion: ${_escape(err.message)}</p></div>`;
    }
  }

  function switchTab(tab) {
    _activeTab = tab === 'asignaciones' ? 'asignaciones' : 'tiempos';
    _render();
  }

  function setSetting(key, value) {
    const next = Math.max(key === 'targetDays' ? 1 : .5, Number(value || 0));
    _settings[key] = next;
    _saveSettings();
    _render();
  }

  function setFilter(key, value) {
    _filters[key] = value || '';
    _assignmentLimit = ASSIGNMENT_BATCH_SIZE;
    _render();
  }

  function showMoreAssignments() {
    _assignmentLimit += ASSIGNMENT_BATCH_SIZE;
    _render();
  }

  function assignSchool(id, value) {
    _draftAssignments[id] = value || '';
    _render();
  }

  function autoBalance(scope = 'pending') {
    const activeSurveyors = _activeSurveyors();
    if (!activeSurveyors.length) {
      UI.showToast('No hay encuestadores activos para balancear.', 'warning');
      return;
    }
    const targetSchools = _filteredSchools()
      .filter(school => scope === 'all' || _normalState(school) !== 'finalizada');
    if (!targetSchools.length) {
      UI.showToast('No hay escuelas en los filtros actuales para balancear.', 'info');
      return;
    }

    const buckets = activeSurveyors.map(surveyor => ({
      label: _surveyorLabel(surveyor),
      minutes: 0,
    }));

    targetSchools
      .sort((a, b) => _schoolMinutes(b) - _schoolMinutes(a))
      .forEach(school => {
        const bucket = buckets.sort((a, b) => a.minutes - b.minutes)[0];
        _draftAssignments[_schoolId(school)] = bucket.label;
        bucket.minutes += _schoolMinutes(school);
      });

    UI.showToast(`Distribucion balanceada en ${targetSchools.length} escuela(s) filtrada(s). Pulse Guardar cambios para publicar.`, 'success');
    _activeTab = 'asignaciones';
    _render();
  }

  function resetDraft() {
    _draftAssignments = { ..._originalAssignments };
    _render();
  }

  async function saveAssignments() {
    if (!Auth.canAccess('supervisor')) {
      UI.showToast('Solo supervisores o administradores pueden guardar asignaciones.', 'warning');
      return;
    }
    if (_savingAssignments) {
      UI.showToast('Ya se estan guardando las asignaciones.', 'info');
      return;
    }
    const changes = _schools.filter(school => _draftAssignments[_schoolId(school)] !== _originalAssignments[_schoolId(school)]);
    if (!changes.length) {
      UI.showToast('No hay cambios de asignacion para guardar.', 'info');
      return;
    }

    const ok = await UI.showConfirm('Guardar asignaciones', `Se guardaran ${changes.length} cambios de distribucion. ¿Continuar?`);
    if (!ok) return;

    try {
      _savingAssignments = true;
      _render();
      for (const school of changes) {
        const id = _schoolId(school);
        const assigned = _draftAssignments[id] || '';
        const surveyor = _surveyors.find(item => _surveyorLabel(item) === assigned) || {};
        const result = await API.asignarEscuela({
          id_escuela: id,
          codigo_local: school.codigo_local || '',
          encuestador_asignado: assigned,
          usuario_encuestador: surveyor.usuario || '',
          id_encuestador: surveyor.id_encuestador || '',
        });
        if (!result || result.status !== 'ok' || result.queued) {
          throw new Error(result?.message || `No se pudo guardar la asignacion de ${school.codigo_local || id}.`);
        }
        school.encuestador_asignado = assigned;
        _originalAssignments[id] = assigned;
      }
      _refreshMapAssignments();
      _rememberAssignmentsCache();
      UI.showToast(`Asignaciones guardadas en Sheets (${changes.length}) y publicadas para todos los usuarios.`, 'success', 6500);
    } catch (err) {
      UI.showToast('Error al guardar asignaciones: ' + err.message, 'error');
    } finally {
      _savingAssignments = false;
      _render();
    }
  }

  function exportCSV() {
    const rows = [
      ['codigo_local', 'escuela', 'departamento', 'distrito', 'estado', 'encuestador', 'minutos_estimados', 'minutos_reales'],
      ..._schools.map(school => [
        school.codigo_local || '',
        school.nombre || school.nombre_escuela || '',
        school.departamento || '',
        school.distrito || '',
        _normalState(school),
        _draftAssignments[_schoolId(school)] || '',
        _schoolMinutes(school),
        _actualMinutes(school) || '',
      ]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    _downloadBlob(`cialpa_planificacion_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;', csv);
  }

  function _render() {
    const root = document.getElementById('planning-root');
    if (!root) return;
    const summary = _summary();
    root.innerHTML = `
      <div class="planning-tabs" role="tablist">
        <button class="${_activeTab === 'tiempos' ? 'active' : ''}" type="button" onclick="PlanningModule.switchTab('tiempos')">Estimacion de tiempos</button>
        <button class="${_activeTab === 'asignaciones' ? 'active' : ''}" type="button" onclick="PlanningModule.switchTab('asignaciones')">Distribucion de escuelas</button>
      </div>
      <section class="planning-panel ${_activeTab === 'tiempos' ? 'planning-panel--active' : ''}">
        ${_renderTimePanel(summary)}
      </section>
      <section class="planning-panel ${_activeTab === 'asignaciones' ? 'planning-panel--active' : ''}">
        ${_renderAssignmentPanel(summary)}
      </section>`;
    Auth.applyRoleVisibility?.();
  }

  function _renderTimePanel(summary) {
    const averageText = summary.measuredCount
      ? `${summary.measuredAverage} min medidos`
      : `${_settings.baseMinutes} min base`;
    return `
      <div class="planning-settings card">
        <div class="planning-setting">
          <label>Minutos base por escuela</label>
          <input class="form-control form-control-sm" type="number" min="10" step="5" value="${_escape(_settings.baseMinutes)}"
            onchange="PlanningModule.setSetting('baseMinutes', this.value)">
        </div>
        <div class="planning-setting">
          <label>Jornada util por encuestador</label>
          <input class="form-control form-control-sm" type="number" min="1" step=".5" value="${_escape(_settings.hoursPerDay)}"
            onchange="PlanningModule.setSetting('hoursPerDay', this.value)">
        </div>
        <div class="planning-setting">
          <label>Meta de cierre</label>
          <input class="form-control form-control-sm" type="number" min="1" step="1" value="${_escape(_settings.targetDays)}"
            onchange="PlanningModule.setSetting('targetDays', this.value)">
        </div>
        <button class="btn btn-sm btn-outline" type="button" onclick="PlanningModule.exportCSV()">Exportar CSV</button>
      </div>

      <div class="planning-kpis">
        ${_kpi('Escuelas totales', summary.total, 'Incluye ejemplo y escuelas cacheadas')}
        ${_kpi('Pendientes efectivas', summary.remainingSchools, 'Pendientes, en curso e incidencias')}
        ${_kpi('Tiempo restante minimo', _formatDuration(summary.remainingMinutes), averageText)}
        ${_kpi('Jornadas-persona', summary.personDays, `${_settings.hoursPerDay} h utiles`)}
        ${_kpi('Encuestadores activos', summary.activeSurveyors, 'Disponibles para asignacion')}
        ${_kpi('Dias calendario minimos', summary.calendarDays, 'Con dotacion activa actual')}
      </div>

      <div class="planning-two-col">
        <article class="card">
          <div class="card__header">
            <h4 class="card__title">Carga por estado</h4>
            <span class="badge badge--info">${summary.progressPct}% avance</span>
          </div>
          <div class="planning-progress"><i style="width:${summary.progressPct}%"></i></div>
          <div class="planning-state-bars">
            ${_stateBar('Finalizadas', summary.finalized, summary.total, '#28a745')}
            ${_stateBar('En curso', summary.inProgress, summary.total, '#fd7e14')}
            ${_stateBar('Pendientes', summary.pending, summary.total, '#6c757d')}
            ${_stateBar('Incidencias', summary.incidents, summary.total, '#dc3545')}
          </div>
        </article>
        <article class="card">
          <div class="card__header">
            <h4 class="card__title">Dimensionamiento minimo</h4>
          </div>
          <div class="planning-readout">
            <b>${summary.requiredSurveyorsForTarget}</b>
            <span>encuestadores necesarios para terminar en ${_settings.targetDays} dia(s) utiles</span>
          </div>
          <p class="text-muted">El calculo usa tiempos reales por escuela cuando existen. Para escuelas sin medicion usa el estimado declarado o el minimo base ajustado por complejidad visible.</p>
        </article>
      </div>

      <div class="card">
        <div class="card__header">
          <h4 class="card__title">Carga estimada por encuestador</h4>
          <button class="btn btn-sm btn-primary" type="button" onclick="PlanningModule.autoBalance('pending')">Balancear pendientes</button>
        </div>
        ${_renderSurveyorWorkloadTable(summary)}
      </div>`;
  }

  function _renderAssignmentPanel(summary) {
    const filtered = _filteredSchools();
    const visibleSchools = filtered.slice(0, _assignmentLimit);
    const remaining = Math.max(0, filtered.length - visibleSchools.length);
    const visibleUnassigned = filtered.filter(school => !_draftAssignments[_schoolId(school)] && _normalState(school) !== 'finalizada');
    const saveLabel = _savingAssignments ? 'Guardando...' : `Guardar cambios${summary.dirty ? ` (${summary.dirty})` : ''}`;
    const saveDisabled = !summary.dirty || _savingAssignments ? 'disabled' : '';
    return `
      <div class="planning-save-banner ${summary.dirty ? 'planning-save-banner--dirty' : ''}" data-min-role="supervisor">
        <div>
          <strong>${summary.dirty ? `${summary.dirty} cambio(s) de asignacion pendiente(s)` : 'Sin cambios de asignacion pendientes'}</strong>
          <span>${summary.dirty ? 'Las escuelas marcadas en amarillo todavia no estan guardadas en Sheets.' : 'Cuando cambie un responsable, el boton de guardado quedara habilitado aqui.'}</span>
        </div>
        <button class="btn btn-success" type="button" ${saveDisabled} onclick="PlanningModule.saveAssignments()">${saveLabel}</button>
      </div>

      <div class="planning-toolbar card">
        <input class="form-control form-control-sm" type="text" value="${_escape(_filters.search)}"
          placeholder="Buscar escuela, codigo o distrito..."
          oninput="PlanningModule.setFilter('search', this.value)">
        <div class="choice-button-strip">
          ${['', 'pendiente', 'en_curso', 'finalizada', 'incidencia'].map(value => `
            <button class="choice-button ${_filters.estado === value ? 'choice-button--active' : ''}" type="button"
              onclick='PlanningModule.setFilter("estado", ${_js(value)})'>${_escape(value ? _stateLabel(value) : 'Todos los estados')}</button>`).join('')}
        </div>
        <div class="choice-button-strip planning-choice-strip--compact">
          ${[
            ['', 'Todas las escuelas'],
            ['piloto', 'Solo muestra piloto'],
          ].map(([value, label]) => `
            <button class="choice-button ${_filters.muestra === value ? 'choice-button--active' : ''}" type="button"
              onclick='PlanningModule.setFilter("muestra", ${_js(value)})'>${_escape(label)}</button>`).join('')}
        </div>
        <div class="planning-toolbar__actions">
          <button class="btn btn-sm btn-outline" type="button" onclick="PlanningModule.autoBalance('pending')">Balancear pendientes</button>
          <button class="btn btn-sm btn-outline" type="button" onclick="PlanningModule.autoBalance('all')">Rebalancear todo</button>
          <button class="btn btn-sm btn-outline" type="button" onclick="PlanningModule.resetDraft()">Deshacer</button>
          <button class="btn btn-sm btn-success" type="button" data-min-role="supervisor" ${saveDisabled} onclick="PlanningModule.saveAssignments()">${saveLabel}</button>
        </div>
      </div>

      <div class="planning-assignment-summary">
        ${_kpi('Escuelas visibles', filtered.length, 'Segun filtros actuales')}
        ${_kpi('Sin asignar visibles', visibleUnassigned.length, 'Requieren responsable')}
        ${_kpi('Cambios pendientes', summary.dirty, 'Aun no guardados')}
        ${_kpi('Minutos sin asignar', _formatDuration(visibleUnassigned.reduce((sum, school) => sum + _schoolMinutes(school), 0)), 'Carga visible por distribuir')}
      </div>

      <div class="card">
        <div class="planning-list-status">
          <span>Mostrando ${visibleSchools.length} de ${filtered.length} escuela(s) filtrada(s).</span>
          ${remaining ? `<button class="btn btn-sm btn-outline" type="button" onclick="PlanningModule.showMoreAssignments()">Mostrar ${Math.min(ASSIGNMENT_BATCH_SIZE, remaining)} mas</button>` : ''}
        </div>
        <div class="table-wrapper planning-table-wrapper">
          <table class="planning-table">
            <thead>
              <tr>
                <th>Escuela</th>
                <th>Estado</th>
                <th>Min.</th>
                <th>Asignacion</th>
              </tr>
            </thead>
            <tbody>
              ${visibleSchools.length ? visibleSchools.map(school => _assignmentRow(school)).join('') : '<tr><td colspan="4" class="text-center text-muted">No hay escuelas para los filtros actuales.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function _renderSurveyorWorkloadTable(summary) {
    if (!summary.workload.length) return '<p class="text-muted text-center">No hay encuestadores activos cargados.</p>';
    return `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Encuestador</th><th>Asignadas</th><th>Pendientes</th><th>Tiempo restante</th><th>Jornadas</th><th>Carga</th></tr>
          </thead>
          <tbody>
            ${summary.workload.map(row => `
              <tr>
                <td>${_escape(row.label)}</td>
                <td>${row.assigned}</td>
                <td>${row.remaining}</td>
                <td>${_formatDuration(row.minutes)}</td>
                <td>${row.days}</td>
                <td><div class="planning-mini-bar"><i style="width:${row.loadPct}%"></i></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function _assignmentRow(school) {
    const id = _schoolId(school);
    const assigned = _draftAssignments[id] || '';
    const dirty = assigned !== _originalAssignments[id];
    return `
      <tr class="${dirty ? 'planning-row--dirty' : ''}">
        <td>
          <strong>${_escape(school.codigo_local || id)}</strong>
          <span>${_escape(school.nombre || school.nombre_escuela || 'Escuela sin nombre')}</span>
          <small>${_escape([school.departamento, school.distrito, school.localidad].filter(Boolean).join(' · '))}</small>
          ${_isPilotSchool(school) ? '<small class="planning-row-tag">Muestra piloto</small>' : ''}
        </td>
        <td><span class="badge ${_stateBadgeClass(_normalState(school))}">${_escape(_stateLabel(_normalState(school)))}</span></td>
        <td>${_schoolMinutes(school)}</td>
        <td>
          <div class="planning-assignee-buttons">
            <button class="planning-assignee ${!assigned ? 'planning-assignee--active' : ''}" type="button"
              onclick='PlanningModule.assignSchool(${_js(id)}, "")'>Sin asignar</button>
            ${_activeSurveyors().map(surveyor => {
              const label = _surveyorLabel(surveyor);
              return `<button class="planning-assignee ${assigned === label ? 'planning-assignee--active' : ''}" type="button"
                onclick='PlanningModule.assignSchool(${_js(id)}, ${_js(label)})'>${_escape(_shortName(label))}</button>`;
            }).join('')}
          </div>
        </td>
      </tr>`;
  }

  function _summary() {
    const total = _schools.length;
    const finalized = _schools.filter(school => _normalState(school) === 'finalizada').length;
    const inProgress = _schools.filter(school => _normalState(school) === 'en_curso').length;
    const incidents = _schools.filter(school => _normalState(school) === 'incidencia').length;
    const pending = Math.max(0, total - finalized - inProgress - incidents);
    const remainingSchools = total - finalized;
    const remaining = _schools.filter(school => _normalState(school) !== 'finalizada');
    const remainingMinutes = remaining.reduce((sum, school) => sum + _schoolMinutes(school), 0);
    const measured = _schools.map(_actualMinutes).filter(Boolean);
    const activeSurveyors = _activeSurveyors().length;
    const dailyCapacity = Math.max(1, activeSurveyors * _settings.hoursPerDay * 60);
    const personDays = _settings.hoursPerDay ? Math.ceil(remainingMinutes / (_settings.hoursPerDay * 60)) : 0;
    const calendarDays = activeSurveyors ? Math.ceil(remainingMinutes / dailyCapacity) : 0;
    const requiredSurveyorsForTarget = Math.max(1, Math.ceil(remainingMinutes / Math.max(1, _settings.targetDays * _settings.hoursPerDay * 60)));
    const workload = _workload();
    return {
      total,
      finalized,
      inProgress,
      incidents,
      pending,
      remainingSchools,
      remainingMinutes,
      measuredCount: measured.length,
      measuredAverage: measured.length ? Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length) : 0,
      activeSurveyors,
      personDays,
      calendarDays,
      requiredSurveyorsForTarget,
      progressPct: total ? Math.round((finalized / total) * 100) : 0,
      unassigned: _schools.filter(school => !_draftAssignments[_schoolId(school)] && _normalState(school) !== 'finalizada').length,
      unassignedMinutes: _schools.filter(school => !_draftAssignments[_schoolId(school)] && _normalState(school) !== 'finalizada').reduce((sum, school) => sum + _schoolMinutes(school), 0),
      dirty: _schools.filter(school => _draftAssignments[_schoolId(school)] !== _originalAssignments[_schoolId(school)]).length,
      workload,
    };
  }

  function _workload() {
    const rows = _activeSurveyors().map(surveyor => {
      const label = _surveyorLabel(surveyor);
      const assignedSchools = _schools.filter(school => _draftAssignments[_schoolId(school)] === label);
      const remaining = assignedSchools.filter(school => _normalState(school) !== 'finalizada');
      const minutes = remaining.reduce((sum, school) => sum + _schoolMinutes(school), 0);
      return {
        label,
        assigned: assignedSchools.length,
        remaining: remaining.length,
        minutes,
        days: _settings.hoursPerDay ? Math.ceil(minutes / (_settings.hoursPerDay * 60)) : 0,
      };
    });
    const max = Math.max(...rows.map(row => row.minutes), 1);
    return rows.map(row => ({ ...row, loadPct: Math.round((row.minutes / max) * 100) }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  function _filteredSchools() {
    const search = _norm(_filters.search);
    return _schools.filter(school => {
      if (_filters.estado && _normalState(school) !== _filters.estado) return false;
      if (_filters.encuestador && _draftAssignments[_schoolId(school)] !== _filters.encuestador) return false;
      if (_filters.muestra === 'piloto' && !_isPilotSchool(school)) return false;
      if (search) {
        const haystack = _norm([school.codigo_local, school.nombre, school.nombre_escuela, school.departamento, school.distrito, school.localidad].join(' '));
        if (!haystack.includes(search)) return false;
      }
      return true;
    }).sort((a, b) => _stateWeight(_normalState(a)) - _stateWeight(_normalState(b)) || _schoolMinutes(b) - _schoolMinutes(a));
  }

  function _activeSurveyors() {
    return _surveyors.filter(item => item.activo === true || item.activo === 'true' || item.activo === undefined);
  }

  function _normalizeSurveyors(rows, schools) {
    const active = (rows || [])
      .filter(row => !row.rol || row.rol === 'encuestador')
      .map(row => ({ ...row, label: _surveyorLabel(row) }))
      .filter(row => row.label);
    const byLabel = new Map(active.map(row => [row.label, row]));
    schools.forEach(school => {
      const label = _assignedName(school);
      if (label && !byLabel.has(label)) byLabel.set(label, { id_encuestador: label, usuario: label, nombres: label, apellidos: '', activo: true, rol: 'encuestador', label });
    });
    return [...byLabel.values()].sort((a, b) => _surveyorLabel(a).localeCompare(_surveyorLabel(b), 'es'));
  }

  function _schoolMinutes(school) {
    const actual = _actualMinutes(school);
    if (actual) return actual;
    const explicit = _firstNumber(school.tiempo_estimado_min, school.tiempo_estimado, school.minutos_estimados);
    if (explicit) return explicit;
    const blocks = _firstNumber(school.cantidad_bloques, school.bloques, school.total_bloques) || 1;
    const rooms = _firstNumber(school.cantidad_aulas, school.aulas, school.total_aulas) || 0;
    const sanitaries = _firstNumber(school.cantidad_sanitarios, school.sanitarios, school.total_sanitarios) || 0;
    const remote = _norm(school.zona).includes('rural remota') ? 10 : 0;
    return Math.max(15, Math.round(Number(_settings.baseMinutes || DEFAULT_SETTINGS.baseMinutes) + (blocks - 1) * 8 + rooms * 3 + sanitaries * 5 + remote));
  }

  function _actualMinutes(school) {
    const actual = _firstNumber(school.duracion_minutos, school.tiempo_real_min, school.tiempo_carga_minutos, school.duracion_total_minutos, school.minutos_reales);
    if (!actual) return 0;
    const status = _norm(school.estado_relevamiento || school.estado_cierre || school.estado || '');
    if (status && !/(final|complet|cerr|entreg)/.test(status)) return 0;
    return actual;
  }

  function _refreshMapAssignments() {
    if (typeof MapModule === 'undefined' || !MapModule.getEscuelas) return;
    const mapSchools = MapModule.getEscuelas() || [];
    mapSchools.forEach(school => {
      const id = _schoolId(school);
      if (id && id in _draftAssignments) school.encuestador_asignado = _draftAssignments[id] || '';
    });
    if (MapModule.loadMarkers) MapModule.loadMarkers(mapSchools);
    if (MapModule.populateFilterButtons) MapModule.populateFilterButtons();
  }

  function _rememberAssignmentsCache() {
    if (typeof CialpaLocalStore === 'undefined' || !CialpaLocalStore.rememberApi) return;
    CialpaLocalStore.rememberApi('getEscuelas', 'GET', {}, {
      status: 'ok',
      data: _schools,
      meta: { source: 'planning_assignments' },
      message: 'Listado actualizado desde distribucion operativa.',
    }).catch(err => console.warn('[Planning] No se pudo actualizar cache local de escuelas:', err));
  }

  function _loadSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function _saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
  }

  function _downloadBlob(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function _firstNumber(...values) {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }

  function _schoolId(school) {
    return String(school?.id_escuela || school?.codigo_local || school?.id || '');
  }

  function _assignedName(school) {
    return String(school?.encuestador_asignado || school?.encuestador || '').trim();
  }

  function _surveyorLabel(item) {
    return String(item?.label || `${item?.nombres || ''} ${item?.apellidos || ''}`.trim() || item?.usuario || item?.id_encuestador || '').trim();
  }

  function _shortName(label) {
    const parts = String(label || '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : (parts[0] || 'Enc.');
  }

  function _normalState(school) {
    const value = _norm(school?.estado_relevamiento || school?.estado || 'pendiente').replace(/-/g, '_').replace(/\s+/g, '_');
    if (value.includes('final')) return 'finalizada';
    if (value.includes('curso')) return 'en_curso';
    if (value.includes('incid')) return 'incidencia';
    return 'pendiente';
  }

  function _stateLabel(state) {
    return { pendiente: 'Pendiente', en_curso: 'En curso', finalizada: 'Finalizada', incidencia: 'Incidencia' }[state] || state;
  }

  function _stateWeight(state) {
    return { incidencia: 0, pendiente: 1, en_curso: 2, finalizada: 3 }[state] ?? 4;
  }

  function _stateBadgeClass(state) {
    return {
      pendiente: 'badge--pendiente',
      en_curso: 'badge--en_curso',
      finalizada: 'badge--finalizada',
      incidencia: 'badge--incidencia',
    }[state] || 'badge--pendiente';
  }

  function _isTrueish(value) {
    if (value === true || value === 1) return true;
    const text = _norm(value);
    return ['true', '1', 'si', 's', 'yes', 'y', 'piloto', 'muestra', 'muestra_piloto'].includes(text);
  }

  function _isPilotSchool(school) {
    if (!school) return false;
    return _isTrueish(school.en_muestra_piloto)
      || _isTrueish(school.muestra_piloto)
      || _norm(school.prioridad_operativa).includes('piloto')
      || String(school.orden_muestra_piloto ?? '').trim() !== '';
  }

  function _formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!h) return `${m} min`;
    if (!m) return `${h} h`;
    return `${h} h ${m} min`;
  }

  function _kpi(label, value, note) {
    return `
      <article class="planning-kpi">
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _stateBar(label, value, total, color) {
    const pct = total ? Math.round((Number(value || 0) / total) * 100) : 0;
    return `
      <div class="planning-state-row">
        <span>${_escape(label)}</span>
        <div><i style="width:${pct}%;background:${color}"></i></div>
        <b>${Number(value || 0)}</b>
      </div>`;
  }

  function _norm(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _js(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  return {
    init,
    load,
    switchTab,
    setSetting,
    setFilter,
    assignSchool,
    showMoreAssignments,
    autoBalance,
    resetDraft,
    saveAssignments,
    exportCSV,
  };
})();
