/**
 * CIALPA - Registro guiado secuencial
 * Capa de experiencia para construir el relevamiento sobre un plano unico.
 * Version: 2.6.186
 */

const GuidedRegisterModule = (() => {
  'use strict';

  const STATE_KEY = 'cialpa_guided_register_state_v1';
  const DRAFT_KEY = 'cialpa_mec_form_draft_v1';
  const LAYOUT_KEY = 'cialpa_guided_register_layout_v1';
  const TECHNICAL_REGISTER_MODE = true;
  const GUIDED_LAYOUT_DEFAULTS = {
    schoolSidebarWidth: 210,
    schoolMapHeight: 0,
    planPanelHeight: 0,
  };
  const GUIDED_LAYOUT_LIMITS = {
    schoolSidebarMin: 160,
    schoolSidebarMaxRatio: .42,
    schoolMapMin: 420,
    schoolMapMax: 1100,
    planPanelMin: 360,
    planPanelMax: 1200,
  };
  let _activeIndex = 0;
  let _bound = false;
  let _touchStartX = 0;
  let _touchStartY = 0;
  let _guidedResizeDrag = null;
  let _guidedLayout = _loadGuidedLayout();
  let _guidedState = { targets: {}, flags: {} };
  let _guidedHistory = [];
  let _guidedQuestionHistory = [];
  let _guidedReviewQuestion = null;
  let _timeRefreshTimer = null;
  let _planSyncTimer = null;
  const GUIDED_QUESTION_HISTORY_LIMIT = 40;
  const ANSWER_FEEDBACK_DELAY_MS = 1050;
  const ANSWER_FEEDBACK_ACTIONS = new Set([
    'answerBlockField',
    'answerFloorField',
    'answerClassroomField',
    'answerClassroomObjectField',
    'answerSanitaryField',
    'answerSanitaryObjectField',
    'answerSiteElementField',
    'markRoomElementAbsent',
    'markSanitaryElementAbsent',
    'markNoFloor',
    'markNoSanitary',
    'markNoSiteElements',
  ]);

  function _schoolIdentityValues(school) {
    const values = [
      school?.id_escuela,
      school?.codigo_local,
      school?.codigo,
      school?.id,
      school?.code,
      _digits(school?.id_escuela),
      _digits(school?.codigo_local),
      _digits(school?.codigo),
      _digits(school?.id),
      _digits(school?.code),
    ];
    return values
      .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
      .map(value => String(value).trim());
  }

  function _sameSchoolIdentity(left, right) {
    const leftValues = _schoolIdentityValues(left);
    const rightValues = _schoolIdentityValues(right);
    return leftValues.length > 0 && rightValues.length > 0 && leftValues.some(value => rightValues.includes(value));
  }

  function _digits(value) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  function _normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function _slug(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'item';
  }

  function _guidedStateKeyForSchool(school) {
    const id = _schoolIdentityValues(school)[0] || '';
    return id ? `${STATE_KEY}::school::${_slug(id)}` : '';
  }

  function _currentSchoolForState() {
    const surveySchool = typeof SurveyModule !== 'undefined' && SurveyModule.getCurrentEscuela?.();
    if (surveySchool) return surveySchool;
    const mapSchool = typeof MapModule !== 'undefined' && MapModule.getSelectedEscuela?.();
    if (mapSchool) return mapSchool;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
      return (saved.values || saved || {}).__selectedSchool || null;
    } catch {
      return null;
    }
  }

  function _readGuidedState(key) {
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || null;
    } catch {
      return null;
    }
  }

  const STEPS = [
    {
      id: 'escuela',
      number: '01',
      title: 'Ubicacion escuela',
      kicker: 'Primer control',
      summary: 'Identificar la escuela, posicionarla sobre la base mapa y guardar las coordenadas corregidas antes de dibujar.',
      checks: ['Escuela identificada', 'Ubicacion posicionada', 'Georreferencia guardada'],
      actions: [],
    },
    {
      id: 'predio',
      number: '02',
      title: 'Perimetro predio',
      kicker: 'Bordes aproximados',
      summary: 'Dibujar solo el contorno del predio con la misma logica de forma que usan aulas y sanitarios.',
      checks: ['Ubicacion base cerrada', 'Perimetro con vertices', 'Predio confirmado'],
      actions: [
        { label: 'Perimetro', icon: 'PRD', action: 'addPropertyBoundary', primary: true },
        { label: 'Seleccionar', icon: 'SEL', action: 'selectPropertyBoundary' },
        { label: 'Ext. abajo', icon: 'ABA', action: 'extendPlanDown' },
        { label: 'Acometida', icon: 'ACM', action: 'site', value: 'service_connection' },
        { label: '+ Vertice', icon: '+', action: 'propertyBoundaryAddVertex' },
        { label: 'Confirmar', icon: 'OK', action: 'confirmPropertyBoundary' },
      ],
    },
    {
      id: 'bloques',
      number: '03',
      title: 'Bloques y pisos',
      kicker: 'Estructura principal',
      summary: 'Guia paso a paso: medir bloque, ubicarlo en el plano, completar ficha y luego decidir si corresponde agregar pisos.',
      checks: ['Medidas del bloque', 'Bloque ubicado', 'Ficha y pisos'],
      actions: [
        { label: 'Iniciar bloque', icon: '+BL', action: 'guidedBlock', primary: true },
        { label: 'Ubicar bloque', icon: 'MOVE', action: 'positionBlock' },
        { label: 'Piso', icon: '+P', action: 'floorGuide' },
        { label: 'Guardar bloque', icon: 'SAVE', action: 'saveBlock' },
        { label: 'Bloquear', icon: 'LOCK', action: 'lockBlock' },
        { label: 'Ficha bloque', icon: 'FORM', action: 'blockFicha' },
      ],
    },
    {
      id: 'ambientes',
      number: '04',
      title: 'Aulas y espacios',
      kicker: 'Construccion por partes',
      summary: 'Agregar aulas y espacios, ubicarlos en el plano y capturar medidas, tipo, aberturas, instalaciones y danos/fallas desde la guia superior.',
      checks: ['Ambientes ubicados', 'Aberturas cargadas', 'Instalaciones visibles'],
      actions: [
        { label: 'Aula', icon: '+AU', action: 'classroom', primary: true },
        { label: 'Otro espacio', icon: '+ES', action: 'otherSpace' },
        { label: 'Puerta', icon: 'PTA', action: 'roomElement', value: 'door' },
        { label: 'Ventana', icon: 'VTN', action: 'roomElement', value: 'window' },
        { label: 'Toma', icon: 'TOM', action: 'roomElement', value: 'outlet' },
        { label: 'Tablero', icon: 'TBL', action: 'roomElement', value: 'switchboard' },
        { label: 'Luz', icon: 'LUZ', action: 'roomElement', value: 'light' },
        { label: 'Ventilador', icon: 'VEN', action: 'roomElement', value: 'fan' },
        { label: 'Aire', icon: 'AA', action: 'roomElement', value: 'ac' },
        { label: 'Daño/falla', icon: 'OBS', action: 'roomElement', value: 'damage' },
      ],
    },
    {
      id: 'sanitarios',
      number: '05',
      title: 'Sanitarios',
      kicker: 'Artefactos por botones',
      summary: 'Configurar banos con o sin cabina y responder uso, agua, desague, aberturas, artefactos y danos/fallas desde la guia superior.',
      checks: ['Sanitario creado', 'Cabinas o artefactos', 'Puertas y ventilacion'],
      actions: [
        { label: 'Sanitario', icon: '+WC', action: 'sanitary', primary: true },
        { label: 'Cabina', icon: 'CBN', action: 'stall' },
        { label: 'Inodoro', icon: 'WC', action: 'fixture', value: 'toilet' },
        { label: 'Lavamanos', icon: 'LV', action: 'fixture', value: 'sink' },
        { label: 'Urinario', icon: 'UR', action: 'fixture', value: 'urinal' },
        { label: 'Ducha', icon: 'DU', action: 'fixture', value: 'shower' },
        { label: 'Puerta', icon: 'PTA', action: 'sanitaryOpening', value: 'door' },
        { label: 'Ventana', icon: 'VTN', action: 'sanitaryOpening', value: 'window' },
      ],
    },
    {
      id: 'exteriores',
      number: '06',
      title: 'Exteriores',
      kicker: 'Predio completo',
      summary: 'Ubicar tanque, galerias, camineros, pilares, espacios libres y recreacion.',
      checks: ['Elementos exteriores', 'Dimensiones editables', 'Ficha tecnica'],
      actions: [
        { label: 'Tanque', icon: 'TQ', action: 'site', value: 'water_tank', primary: true },
        { label: 'Recreacion', icon: 'REC', action: 'site', value: 'recreation' },
        { label: 'Galeria', icon: 'GAL', action: 'site', value: 'gallery' },
        { label: 'Caminero', icon: 'CAM', action: 'site', value: 'walkway' },
        { label: 'Espacio libre', icon: 'ESP', action: 'site', value: 'open_space' },
        { label: 'Pilar', icon: 'PIL', action: 'site', value: 'pillar' },
        { label: 'Rampa', icon: 'RMP', action: 'site', value: 'ramp' },
        { label: 'Acometida', icon: 'ACM', action: 'site', value: 'service_connection' },
        { label: 'Medidor', icon: 'MED', action: 'site', value: 'meter' },
        { label: 'Tablero', icon: 'TBL', action: 'site', value: 'main_switchboard' },
      ],
    },
    {
      id: 'cierre',
      number: '07',
      title: 'Revision y salida',
      kicker: 'Entrega tecnica',
      summary: 'Validar pendientes, generar PDF/DXF/JSON y dejar el registro listo para supervision.',
      checks: ['Pendientes revisados', 'Fotos anexadas', 'Exportaciones listas'],
      actions: [
        { label: 'Finalizar escuela', icon: 'FIN', action: 'goClosure', primary: true },
        { label: 'Validar', icon: 'CHK', action: 'validate' },
        { label: 'PDF', icon: 'PDF', action: 'pdf' },
        { label: 'DXF', icon: 'DXF', action: 'dxf' },
        { label: 'JSON', icon: 'JSN', action: 'json' },
        { label: 'Plano', icon: 'PLAN', action: 'module', value: 'plano' },
      ],
    },
  ];

  function init() {
    _loadState();
    const root = document.getElementById('guided-register-root');
    if (!root) return;
    _render(root);
    _bind(root);
    _ensureMecReady();
    requestAnimationFrame(() => {
      _movePlanSurfaceForActiveStep(root);
      _ensureGuidedLocationBaseMap();
      _refreshPlan();
      _updateSlide();
      _updateSnapshot();
    });
    if (!_timeRefreshTimer) {
      _timeRefreshTimer = setInterval(() => _refreshTimeTracking(), 15000);
    }
  }

  function _render(root) {
    root.innerHTML = `
      <section class="guided-register" aria-label="Registro guiado CIALPA">
        <nav class="guided-steps" aria-label="Etapas del registro guiado">
          ${STEPS.map((step, index) => `
            <button class="guided-step" type="button" data-guided-step="${index}" aria-current="${index === _activeIndex ? 'step' : 'false'}">
              <span>${step.number}</span>
              <strong>${_escape(step.title)}</strong>
              <small data-guided-step-state="${step.id}">Pendiente</small>
            </button>`).join('')}
        </nav>

        <div class="guided-progress" aria-hidden="true"><span data-guided-progress></span></div>

        <section class="guided-workbench">
          <div class="guided-deck" data-guided-deck>
            <div class="guided-track" data-guided-track>
              ${STEPS.map((step, index) => _renderSlide(step, index)).join('')}
            </div>
          </div>

          <div class="guided-layout-resize guided-layout-resize--workbench" data-guided-resize="plan-panel-height" role="separator" aria-orientation="horizontal" aria-label="Ajustar alto del plano vivo"><span></span></div>

          <aside class="guided-plan-panel" aria-label="Plano vivo del registro">
            <div class="guided-plan-panel__header">
              <div class="guided-plan-panel__identity">
                <span>Plano vivo</span>
                <strong data-guided-school-name>Sin escuela seleccionada</strong>
                <small data-guided-school-meta>Seleccione una escuela desde el mapa antes de iniciar la carga.</small>
              </div>
              <div class="guided-plan-panel__actions">
                <small data-guided-save-state>Sin borrador</small>
                <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="goClosure">Finalizar escuela</button>
                <button class="btn btn-sm guided-plan-panel__school-action" type="button" data-guided-action="module" data-guided-value="mapa">Cambiar escuela</button>
              </div>
            </div>
            <div class="guided-time-strip" data-guided-time-strip></div>
            <div class="guided-plan-panel__surface-slot" data-guided-plan-slot="panel">
              <div id="guided-school-plan-root" class="guided-plan-surface" data-school-plan-root></div>
            </div>
          </aside>
        </section>
        <nav class="guided-floating-nav" aria-label="Navegacion del registro guiado">
          <button class="btn btn-outline btn-sm" type="button" data-guided-action="prev">Anterior</button>
          <div class="guided-floating-nav__center">
            <span data-guided-floating-step>01 / 07</span>
            <button class="btn btn-warning btn-sm" type="button" data-guided-action="finalizePartial" data-guided-finish-pending hidden>Finalizar con pendientes</button>
            <button class="btn btn-success btn-sm" type="button" data-guided-action="finalizeComplete" data-guided-finish-complete hidden>Finalizar escuela</button>
          </div>
          <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="next">Siguiente</button>
        </nav>
      </section>`;
    _applyGuidedLayout(root);
    _movePlanSurfaceForActiveStep(root);
  }

  function _renderSlide(step, index = 0) {
    const sequenced = _isSequencedStep(step.id);
    const mapInline = _stepUsesInlineMap(step.id);
    const active = index === _activeIndex;
    return `
      <article class="guided-slide ${active ? 'guided-slide--active' : ''} ${sequenced ? 'guided-slide--sequenced' : ''} ${mapInline ? 'guided-slide--school-location guided-slide--with-map' : ''}" data-guided-slide="${step.id}" ${active ? '' : 'hidden'} aria-hidden="${active ? 'false' : 'true'}">
        <div class="guided-slide__body">
          <p class="guided-slide__kicker">${_escape(step.kicker)}</p>
          <h3>${_escape(step.title)}</h3>
          <p class="guided-slide__summary">${_escape(step.summary)}</p>
          <div class="guided-slide__next" data-guided-next="${_escape(step.id)}"></div>
          <div class="guided-slide__checks">
            ${step.checks.map(check => `<span>${_escape(check)}</span>`).join('')}
          </div>
          ${mapInline ? `<div class="guided-school-resize guided-school-resize--columns" data-guided-resize="school-sidebar" role="separator" aria-orientation="vertical" aria-label="Ajustar ancho del panel de preguntas"><span></span></div>` : ''}
          ${mapInline ? _renderSchoolLocationMapSlot(step.id) : (sequenced ? '' : `<div class="guided-slide__actions">
            ${step.actions.map(action => `
              <button class="guided-action ${action.primary ? 'guided-action--primary' : ''}" type="button"
                data-guided-action="${_escape(action.action)}"
                data-guided-value="${_escape(action.value || '')}">
                <span>${_escape(action.icon)}</span>
                <strong>${_escape(action.label)}</strong>
              </button>`).join('')}
          </div>`)}
        </div>
        <footer class="guided-slide__footer">
          <button class="btn btn-outline btn-sm" type="button" data-guided-action="prev">Anterior</button>
          <span>${_escape(step.number)} / ${String(STEPS.length).padStart(2, '0')}</span>
          <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="next">Siguiente</button>
        </footer>
      </article>`;
  }

  function _stepUsesInlineMap(stepId) {
    return STEPS.some(step => step.id === stepId);
  }

  function _renderSchoolLocationMapSlot(slotName = 'escuela') {
    return `
      <section class="guided-school-map-shell" aria-label="Mapa de ubicacion de la escuela">
        <div class="guided-school-map-shell__top">
          <div class="guided-school-map-shell__identity">
            <span>Escuela cargada</span>
            <strong data-guided-inline-school-name>Sin escuela seleccionada</strong>
            <small data-guided-inline-school-meta>Seleccione una escuela para cargar la base satelital.</small>
            <em data-guided-inline-school-status>Base mapa pendiente</em>
          </div>
          <div class="guided-school-map-shell__toolbar" aria-label="Acciones rapidas de georreferencia">
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="basemapSatellite" aria-pressed="false">Alta res.</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="basemapStreet" aria-pressed="false">Calles encima</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="basemapCatastro" aria-pressed="false">Catastro</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="cadastralBoundary">Predio SNC</button>
            <button class="btn btn-guided-soft btn-sm guided-school-map-shell__move-base" type="button" data-guided-action="moveBase" aria-pressed="false">Mover base</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="autoAlignBase">Alinear</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="coords">Usar coords</button>
            <button class="btn btn-guided-soft btn-sm" type="button" data-guided-action="saveBasemap" aria-pressed="false">Guardar base</button>
            <button class="btn btn-outline btn-sm" type="button" data-guided-action="module" data-guided-value="mapa">Elegir escuela</button>
            <small class="guided-school-map-shell__toolbar-state" data-guided-basemap-state>Base pendiente</small>
          </div>
        </div>
        <div class="guided-school-map-shell__slot" data-guided-plan-slot="${_escape(slotName)}"></div>
      </section>`;
  }

  function _isSequencedStep(stepId) {
    return ['bloques', 'ambientes', 'sanitarios', 'exteriores'].includes(stepId);
  }

  function _bind(root) {
    if (_bound) return;
    _bound = true;
    root.addEventListener('click', event => {
      const stepButton = event.target.closest('[data-guided-step]');
      if (stepButton) {
        const targetIndex = Number(stepButton.dataset.guidedStep || 0);
        if (_guidedReviewQuestion && targetIndex !== _activeIndex) _guidedReviewQuestion = null;
        if (!_canMoveToStep(targetIndex)) return;
        if (targetIndex !== _activeIndex) _rememberCurrentQuestion('step', String(targetIndex));
        goTo(targetIndex);
        return;
      }
      const actionButton = event.target.closest('[data-guided-action]');
      if (!actionButton) return;
      _markGuidedActionFeedback(actionButton);
      _runAction(actionButton.dataset.guidedAction, actionButton.dataset.guidedValue || '');
    });
    root.addEventListener('pointerdown', event => {
      const resizeHandle = event.target.closest('[data-guided-resize]');
      if (resizeHandle && _startGuidedResize(root, event, resizeHandle)) return;
      if (!event.target.closest('[data-guided-deck]')) return;
      if (event.target.closest('.guided-school-map-shell, [data-school-plan-canvas], .school-plan__canvas-wrap')) {
        _touchStartX = 0;
        _touchStartY = 0;
        return;
      }
      _touchStartX = event.clientX;
      _touchStartY = event.clientY;
    });
    root.addEventListener('pointermove', event => {
      if (!_guidedResizeDrag) return;
      _moveGuidedResize(root, event);
    });
    root.addEventListener('pointerup', event => {
      if (_guidedResizeDrag) {
        _endGuidedResize(root, event);
        return;
      }
      if (event.target.closest('.guided-school-map-shell, [data-school-plan-canvas], .school-plan__canvas-wrap')) {
        _touchStartX = 0;
        _touchStartY = 0;
        return;
      }
      if (!_touchStartX) return;
      const dx = event.clientX - _touchStartX;
      const dy = event.clientY - _touchStartY;
      _touchStartX = 0;
      _touchStartY = 0;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      if (dx < 0) next();
      else previous();
    });
    root.addEventListener('pointercancel', event => {
      if (_guidedResizeDrag) _endGuidedResize(root, event);
    });
  }

  function _loadGuidedLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') || {};
      return {
        ...GUIDED_LAYOUT_DEFAULTS,
        schoolSidebarWidth: _boundedNumber(saved.schoolSidebarWidth, GUIDED_LAYOUT_DEFAULTS.schoolSidebarWidth, 150, 520),
        schoolMapHeight: _boundedNumber(saved.schoolMapHeight, GUIDED_LAYOUT_DEFAULTS.schoolMapHeight, 0, GUIDED_LAYOUT_LIMITS.schoolMapMax),
        planPanelHeight: _boundedNumber(saved.planPanelHeight, GUIDED_LAYOUT_DEFAULTS.planPanelHeight, 0, GUIDED_LAYOUT_LIMITS.planPanelMax),
      };
    } catch {
      return { ...GUIDED_LAYOUT_DEFAULTS };
    }
  }

  function _saveGuidedLayout() {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({
        schoolSidebarWidth: Math.round(_guidedLayout.schoolSidebarWidth || GUIDED_LAYOUT_DEFAULTS.schoolSidebarWidth),
        schoolMapHeight: Math.round(_guidedLayout.schoolMapHeight || 0),
        planPanelHeight: Math.round(_guidedLayout.planPanelHeight || 0),
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Layout preferences are helpful, not critical.
    }
  }

  function _applyGuidedLayout(root = document.getElementById('guided-register-root')) {
    const register = root?.querySelector('.guided-register');
    if (!register) return;
    const sidebarWidth = _boundedNumber(_guidedLayout.schoolSidebarWidth, GUIDED_LAYOUT_DEFAULTS.schoolSidebarWidth, 150, 520);
    register.style.setProperty('--guided-school-sidebar-width', `${Math.round(sidebarWidth)}px`);
    const mapHeight = _boundedNumber(_guidedLayout.schoolMapHeight, 0, 0, GUIDED_LAYOUT_LIMITS.schoolMapMax);
    if (mapHeight > 0) register.style.setProperty('--guided-school-map-height', `${Math.round(mapHeight)}px`);
    else register.style.removeProperty('--guided-school-map-height');
    const planPanelHeight = _boundedNumber(_guidedLayout.planPanelHeight, 0, 0, GUIDED_LAYOUT_LIMITS.planPanelMax);
    if (planPanelHeight > 0) register.style.setProperty('--guided-plan-panel-height', `${Math.round(planPanelHeight)}px`);
    else register.style.removeProperty('--guided-plan-panel-height');
  }

  function _startGuidedResize(root, event, handle) {
    const type = handle?.dataset.guidedResize || '';
    if (!type) return false;
    const register = root.querySelector('.guided-register');
    if (!register) return false;
    const body = handle.closest('.guided-slide__body') || root.querySelector('.guided-slide--with-map .guided-slide__body');
    const shell = handle.closest('.guided-school-map-shell') || root.querySelector('.guided-slide--with-map .guided-school-map-shell');
    const planPanel = root.querySelector('.guided-plan-panel');
    if (type === 'school-sidebar') {
      const bodyRect = body?.getBoundingClientRect();
      if (!bodyRect?.width) return false;
      const current = _boundedNumber(_guidedLayout.schoolSidebarWidth, GUIDED_LAYOUT_DEFAULTS.schoolSidebarWidth, 150, 520);
      const maxWidth = Math.max(220, Math.min(520, bodyRect.width * GUIDED_LAYOUT_LIMITS.schoolSidebarMaxRatio));
      _guidedResizeDrag = {
        type,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startValue: current,
        min: GUIDED_LAYOUT_LIMITS.schoolSidebarMin,
        max: Math.max(GUIDED_LAYOUT_LIMITS.schoolSidebarMin + 20, maxWidth),
      };
    } else if (type === 'school-map-height') {
      const shellRect = shell?.getBoundingClientRect();
      const current = _boundedNumber(_guidedLayout.schoolMapHeight, shellRect?.height || 560, GUIDED_LAYOUT_LIMITS.schoolMapMin, GUIDED_LAYOUT_LIMITS.schoolMapMax);
      _guidedResizeDrag = {
        type,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startValue: current,
        min: GUIDED_LAYOUT_LIMITS.schoolMapMin,
        max: GUIDED_LAYOUT_LIMITS.schoolMapMax,
      };
    } else if (type === 'plan-panel-height') {
      const panelRect = planPanel?.getBoundingClientRect();
      if (!panelRect?.height) return false;
      const current = _boundedNumber(_guidedLayout.planPanelHeight, panelRect.height, GUIDED_LAYOUT_LIMITS.planPanelMin, GUIDED_LAYOUT_LIMITS.planPanelMax);
      _guidedResizeDrag = {
        type,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startValue: current,
        min: GUIDED_LAYOUT_LIMITS.planPanelMin,
        max: GUIDED_LAYOUT_LIMITS.planPanelMax,
      };
    } else {
      return false;
    }
    try { handle.setPointerCapture?.(event.pointerId); } catch { /* non-fatal */ }
    register.classList.add('guided-register--resizing');
    _touchStartX = 0;
    _touchStartY = 0;
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  function _moveGuidedResize(root, event) {
    const drag = _guidedResizeDrag;
    if (!drag) return;
    const delta = drag.type === 'school-sidebar'
      ? event.clientX - drag.startX
      : event.clientY - drag.startY;
    const nextValue = _boundedNumber(drag.startValue + delta, drag.startValue, drag.min, drag.max);
    if (drag.type === 'school-sidebar') _guidedLayout.schoolSidebarWidth = nextValue;
    if (drag.type === 'school-map-height') _guidedLayout.schoolMapHeight = nextValue;
    if (drag.type === 'plan-panel-height') _guidedLayout.planPanelHeight = nextValue;
    _applyGuidedLayout(root);
    _syncDeckHeight(root);
    event.preventDefault();
    event.stopPropagation();
  }

  function _endGuidedResize(root, event) {
    _saveGuidedLayout();
    root.querySelector('.guided-register')?.classList.remove('guided-register--resizing');
    _guidedResizeDrag = null;
    _syncDeckHeight(root);
    _refreshSoon(80);
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }

  function _boundedNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : Number(fallback);
    return Math.max(min, Math.min(max, Number.isFinite(safe) ? safe : 0));
  }

  function _ensureMecReady() {
    if (typeof MecFormModule === 'undefined') return;
    try {
      MecFormModule.init();
    } catch (err) {
      console.warn('No se pudo inicializar el motor MEC desde Registro guiado:', err);
    }
  }

  function _runAction(action, value) {
    if (_shouldRememberBeforeAction(action)) _rememberCurrentQuestion(action, value);
    if (_guidedReviewQuestion && _shouldClearReviewForAction(action)) _guidedReviewQuestion = null;
    if (action === 'next') return next();
    if (action === 'prev') return previous();
    if (action === 'saveClassroomTarget') return _saveClassroomTarget();
    if (action === 'resetClassroomTarget') return _resetClassroomTarget();
    if (action === 'saveSchoolIdentity') return _saveSchoolIdentity();
    if (action === 'resetSchoolIdentity') return _resetSchoolIdentity();
    if (action === 'resetSchoolData') return _resetSchoolData();
    if (action === 'addPropertyBoundary') return _addPropertyBoundary();
    if (action === 'selectPropertyBoundary') return _selectPropertyBoundary();
    if (action === 'propertyBoundaryPolygon') return _setPropertyBoundaryShape(value, 'polygon');
    if (action === 'propertyBoundaryRect') return _setPropertyBoundaryShape(value, 'rect');
    if (action === 'propertyBoundaryAddVertex') return _addPropertyBoundaryVertex(value);
    if (action === 'propertyBoundaryRemoveVertex') return _removePropertyBoundaryVertex(value);
    if (action === 'confirmPropertyBoundary') return _confirmPropertyBoundary();
    if (action === 'rectClassroom') return _setClassroomRect(value);
    if (action === 'rectSanitary') return _setSanitaryRect(value);
    if (action === 'markNoFloor') return _setScopedFlag('noFloor', true, 'Bloque registrado sin piso para esta ronda.');
    if (action === 'resetNoFloor') return _setScopedFlag('noFloor', false, 'Se volvera a pedir el piso del bloque.');
    if (action === 'saveBlockMeasures') return _saveBlockMeasures();
    if (action === 'saveFloorMeasures') return _saveFloorMeasures(value);
    if (action === 'resetFloorMeasures') return _resetFloorMeasures(value);
    if (action === 'saveClassroomMeasures') return _saveClassroomMeasures(value);
    if (action === 'saveSanitaryMeasures') return _saveSanitaryMeasures(value);
    if (action === 'answerFloorField') return _answerFloorField(value);
    if (action === 'markNoSanitary') return _setScopedFlag('noSanitary', true, 'Respuesta registrada: sin sanitario para este bloque/piso.');
    if (action === 'resetNoSanitary') return _setScopedFlag('noSanitary', false, 'Se volvera a pedir sanitario para este bloque/piso.');
    if (action === 'markNoSiteElements') return _setScopedFlag('noSiteElements', true, 'Respuesta registrada: sin exteriores por ahora.');
    if (action === 'resetNoSiteElements') return _setScopedFlag('noSiteElements', false, 'Se volvera a pedir exteriores.');
    if (action === 'confirmClassroomConfigured') return _confirmClassroomConfigured(value);
    if (action === 'confirmSanitaryConfigured') return _confirmSanitaryConfigured(value);
    if (action === 'confirmSiteConfigured') return _confirmSiteConfigured(value);
    if (action === 'answerClassroomField') return _answerClassroomField(value);
    if (action === 'answerClassroomObjectField') return _answerClassroomObjectField(value);
    if (action === 'answerSanitaryField') return _answerSanitaryField(value);
    if (action === 'answerSanitaryObjectField') return _answerSanitaryObjectField(value);
    if (action === 'addGuidedRoomElement') return _addGuidedRoomElement(value);
    if (action === 'markRoomElementAbsent') return _markRoomElementDecision(value, false);
    if (action === 'addGuidedSanitaryElement') return _addGuidedSanitaryElement(value);
    if (action === 'markSanitaryElementAbsent') return _markSanitaryElementDecision(value, false);
    if (action === 'saveSiteMeasures') return _saveSiteMeasures(value);
    if (action === 'answerSiteElementField') return _answerSiteElementField(value);
    if (action === 'goClosure') return _goClosure();
    if (action === 'syncSheets') return _syncDraftToSheets();
    if (action === 'syncEvidence') return _syncEvidenceToDrive();
    if (action === 'finalizeComplete') return _finalizeCompleteRegistration();
    if (action === 'finalizePartial') return _finalizeCompleteRegistration({ allowPending: true });
    if (action === 'workbook') return (typeof AppController !== 'undefined' && AppController.openWorkbook) ? AppController.openWorkbook() : null;
    if (action === 'selectPlanItem') return _selectPlanItem(value);
    if (action === 'openClassroomObjectFicha') return _openClassroomObjectFicha(value);
    if (action === 'openSanitaryObjectFicha') return _openSanitaryObjectFicha(value);
    if (action === 'module') return _openModule(value);
    if (action === 'stage') return _openMecStage(value);
    if (action === 'demo') return _openDemo();
    if (_actionNeedsBlock(action) && !_snapshot().blocks) {
      UI.showToast('Primero cree un bloque desde la etapa Bloques y pisos.', 'warning', 5200);
      goTo(2);
      return;
    }

    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec) {
      UI.showToast('El motor de registro aun no esta disponible.', 'warning');
      return;
    }

    try {
      switch (action) {
        case 'basemap':
          mec.togglePlanBaseMap();
          break;
        case 'basemapStreet':
          if (mec.ensureGuidedLocationBaseMap) mec.ensureGuidedLocationBaseMap({ render: false });
          if (mec.setPlanBaseMapSource) mec.setPlanBaseMapSource('street');
          else mec.togglePlanBaseMap();
          break;
        case 'basemapCatastro':
          if (mec.ensureGuidedLocationBaseMap) mec.ensureGuidedLocationBaseMap({ render: false });
          if (mec.togglePlanCadastralOverlay) mec.togglePlanCadastralOverlay();
          else UI.showToast('La capa Catastro SNC aun no esta disponible en este modulo.', 'warning', 5200);
          break;
        case 'cadastralBoundary':
          if (mec.ensureGuidedLocationBaseMap) mec.ensureGuidedLocationBaseMap({ render: false });
          if (mec.useCadastralParcelAsPreliminaryBoundary) mec.useCadastralParcelAsPreliminaryBoundary();
          else UI.showToast('El predio preliminar SNC aun no esta disponible.', 'warning', 5200);
          break;
        case 'basemapSatellite':
          if (mec.ensureGuidedLocationBaseMap) mec.ensureGuidedLocationBaseMap({ render: false });
          if (mec.setPlanHighResolutionBaseMap) mec.setPlanHighResolutionBaseMap();
          else if (mec.setPlanBaseMapSource) mec.setPlanBaseMapSource('google_satellite');
          break;
        case 'autoAlignBase':
          if (mec.autoAlignPlanBaseMap) mec.autoAlignPlanBaseMap();
          else UI.showToast('La alineacion automatica aun no esta disponible.', 'warning', 5200);
          break;
        case 'coords':
          mec.useSchoolCoordinatesForBaseMap();
          break;
        case 'saveBasemap':
          mec.savePlanBaseMap();
          break;
        case 'moveBase':
          if (mec.togglePlanBaseMapDragMode) mec.togglePlanBaseMapDragMode();
          break;
        case 'moveMode':
          mec.togglePlanMoveMode();
          break;
        case 'extendPlanDown':
          if (mec.extendSchoolPlanCanvas) mec.extendSchoolPlanCanvas('height');
          break;
        case 'extendPlanRight':
          if (mec.extendSchoolPlanCanvas) mec.extendSchoolPlanCanvas('width');
          break;
        case 'guidedBlock':
          mec.startGuidedBlockRegistration();
          break;
        case 'newBlock':
          mec.newBlock();
          break;
        case 'positionBlock':
          mec.positionActiveBlockOnPlan();
          break;
        case 'saveBlock':
          mec.saveCurrentBlock();
          break;
        case 'floor':
          mec.addFloorToActiveBlock();
          break;
        case 'floorGuide':
          mec.continueGuidedFloorRegistration();
          break;
        case 'blockFicha':
          mec.openPlanBlockFicha();
          break;
        case 'lockBlock':
          mec.setActiveBlockLocked(true);
          break;
        case 'answerBlockField':
          _answerBlockField(value);
          break;
        case 'classroom':
          mec.newPlanClassroom();
          break;
        case 'guidedClassroom':
          mec.newPlanClassroom({ guided: true });
          break;
        case 'openClassroomFicha':
          if (mec.openPlanClassroomFicha) mec.openPlanClassroomFicha(value);
          else mec.openClassroomFicha();
          break;
        case 'openSanitaryFicha':
          if (value) mec.selectSanitary(value);
          mec.openSelectedSanitaryFicha();
          break;
        case 'openSiteFicha':
          mec.openSiteElementFicha(value);
          break;
        case 'otherSpace':
          mec.openOtherSpacePicker('plan');
          break;
        case 'roomElement':
          mec.addPlanClassroomElement(value, { guided: true });
          break;
        case 'sanitary':
          mec.addPlanSanitary({ guided: true });
          break;
        case 'stall':
          mec.addPlanSanitaryStall();
          break;
        case 'fixture':
          mec.addPlanSanitaryFixture(value, { guided: true });
          break;
        case 'sanitaryOpening':
          mec.addPlanSanitaryOpening(value, { guided: true });
          break;
        case 'site':
          mec.addPlanSiteElement(value, 'plan');
          break;
        case 'validate':
          mec.validate();
          break;
        case 'pdf':
          mec.printPlanPdf();
          break;
        case 'dxf':
          mec.exportPlanDxf();
          break;
        case 'json':
          mec.exportJson();
          break;
        case 'zoomIn':
          mec.setSchoolPlanZoom(0.15);
          break;
        case 'zoomOut':
          mec.setSchoolPlanZoom(-0.15);
          break;
        case 'fullscreen':
          mec.toggleSchoolPlanFullscreen();
          break;
        default:
          break;
      }
      _refreshSoon();
    } catch (err) {
      console.error(err);
      UI.showToast('No se pudo ejecutar la accion solicitada.', 'error');
    }
  }

  function _actionNeedsBlock(action) {
    return [
      'saveBlock',
      'lockBlock',
      'blockFicha',
      'positionBlock',
      'floor',
      'floorGuide',
      'answerBlockField',
      'saveBlockMeasures',
      'saveFloorMeasures',
      'saveClassroomMeasures',
      'saveSanitaryMeasures',
      'answerFloorField',
      'answerClassroomField',
      'answerClassroomObjectField',
      'answerSanitaryField',
      'answerSanitaryObjectField',
      'addGuidedRoomElement',
      'markRoomElementAbsent',
      'addGuidedSanitaryElement',
      'markSanitaryElementAbsent',
      'saveSiteMeasures',
      'answerSiteElementField',
      'classroom',
      'guidedClassroom',
      'openClassroomFicha',
      'otherSpace',
      'roomElement',
      'sanitary',
      'openSanitaryFicha',
      'stall',
      'fixture',
      'sanitaryOpening',
    ].includes(action);
  }

  function _openModule(moduleId) {
    if (!moduleId || typeof AppController === 'undefined') return;
    AppController.showModule(moduleId);
  }

  function _openMecStage(moduleId) {
    if (typeof AppController !== 'undefined') AppController.showModule('mec');
    setTimeout(() => {
      try { MecFormModule.selectModule(moduleId); } catch { /* non-fatal */ }
    }, 120);
  }

  function _openDemo() {
    try {
      if (typeof SurveyModule !== 'undefined') SurveyModule.selectEscuela('ESC_DEMO_CIALPA');
      UI.showToast('Escuela ficticia cargada como punto de partida.', 'success');
      setTimeout(() => {
        if (typeof AppController !== 'undefined') AppController.showModule('registro');
      }, 160);
    } catch (err) {
      UI.showToast('No se pudo abrir la escuela de ejemplo.', 'warning');
    }
  }

  function _refreshSoon(delay = 220) {
    setTimeout(() => {
      _refreshPlan();
      _updateSnapshot();
    }, Math.max(0, Number(delay) || 0));
  }

  function syncFromPlan() {
    clearTimeout(_planSyncTimer);
    _planSyncTimer = setTimeout(() => {
      _updateSnapshot();
    }, 90);
  }

  function invalidateMeasureConfirmation(kind = '', id = '') {
    const key = _measureConfirmKey(kind, id);
    if (!key) return;
    _setFlag(key, false);
    _saveState();
    syncFromPlan();
  }

  function _markGuidedActionFeedback(button) {
    if (!button || !ANSWER_FEEDBACK_ACTIONS.has(button.dataset.guidedAction || '')) return;
    const group = button.closest('.guided-next-card') || button.parentElement;
    group?.querySelectorAll('[data-guided-action]').forEach(item => {
      item.classList.toggle('btn-guided-selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
  }

  function _refreshPlan() {
    try {
      if (typeof MecFormModule !== 'undefined') MecFormModule.renderSchoolPlan();
    } catch (err) {
      console.warn('No se pudo refrescar el plano guiado:', err);
    }
  }

  function next() {
    if (_guidedReviewQuestion) {
      _guidedReviewQuestion = null;
      _updateSnapshot();
      return;
    }
    const target = Math.min(STEPS.length - 1, _activeIndex + 1);
    if (!_canMoveToStep(target)) return;
    if (target !== _activeIndex) _rememberCurrentQuestion('next');
    goTo(target);
  }

  function previous() {
    if (_restorePreviousQuestion()) return;
    const previousIndex = _guidedHistory.length ? _guidedHistory.pop() : Math.max(0, _activeIndex - 1);
    goTo(previousIndex, { skipHistory: true });
  }

  function goTo(index, options = {}) {
    const target = Math.max(0, Math.min(STEPS.length - 1, Number(index) || 0));
    if (target !== _activeIndex && !options.skipHistory) {
      _guidedHistory.push(_activeIndex);
      if (_guidedHistory.length > 20) _guidedHistory = _guidedHistory.slice(-20);
    }
    _activeIndex = target;
    _saveState();
    _updateSlide();
  }

  function _canMoveToStep(targetIndex) {
    targetIndex = Math.max(0, Math.min(STEPS.length - 1, Number(targetIndex) || 0));
    if (targetIndex <= _activeIndex) return true;
    const snap = _snapshot();
    for (let index = _activeIndex; index < targetIndex; index += 1) {
      const step = STEPS[index];
      const question = _activeGuidedQuestion(step?.id, snap);
      if (!question || question.blocking === false || question.done) continue;
      if (index !== _activeIndex) goTo(index, { skipHistory: true });
      UI.showToast(`Complete primero: ${question.title}`, 'warning', 5200);
      return false;
    }
    return true;
  }

  function _shouldRememberBeforeAction(action = '') {
    return ![
      'prev',
      'next',
      'selectPlanItem',
      'selectPropertyBoundary',
      'openClassroomFicha',
      'openClassroomObjectFicha',
      'openSanitaryFicha',
      'openSanitaryObjectFicha',
      'openSiteFicha',
      'module',
      'stage',
      'demo',
      'basemap',
      'basemapSatellite',
      'coords',
      'moveBase',
      'moveMode',
      'zoomIn',
      'zoomOut',
      'fullscreen',
      'workbook',
      'validate',
      'pdf',
      'dxf',
      'json',
    ].includes(String(action || ''));
  }

  function _shouldClearReviewForAction(action = '') {
    return ![
      'prev',
      'next',
      'selectPlanItem',
      'selectPropertyBoundary',
      'openClassroomFicha',
      'openClassroomObjectFicha',
      'openSanitaryFicha',
      'openSanitaryObjectFicha',
      'openSiteFicha',
      'basemap',
      'basemapSatellite',
      'moveBase',
      'zoomIn',
      'zoomOut',
      'fullscreen',
    ].includes(String(action || ''));
  }

  function _rememberCurrentQuestion(reason = '', value = '') {
    const entry = _currentQuestionHistoryEntry(reason, value);
    if (!entry) return;
    const last = _guidedQuestionHistory[_guidedQuestionHistory.length - 1];
    if (last?.key === entry.key) return;
    _guidedQuestionHistory.push(entry);
    if (_guidedQuestionHistory.length > GUIDED_QUESTION_HISTORY_LIMIT) {
      _guidedQuestionHistory = _guidedQuestionHistory.slice(-GUIDED_QUESTION_HISTORY_LIMIT);
    }
  }

  function _restorePreviousQuestion() {
    const current = _currentQuestionHistoryEntry('current');
    while (_guidedQuestionHistory.length) {
      const entry = _guidedQuestionHistory.pop();
      if (current?.key && entry.key === current.key) continue;
      _guidedReviewQuestion = entry.question
        ? { stepId: entry.stepId, question: entry.question }
        : null;
      goTo(entry.stepIndex, { skipHistory: true });
      setTimeout(() => {
        if (entry.focusValue) _selectPlanItem(entry.focusValue);
        else _updateSnapshot();
      }, 80);
      if (entry.title) UI.showToast(`Volviendo a: ${entry.title}`, 'info', 3600);
      return true;
    }
    return false;
  }

  function _currentQuestionHistoryEntry(reason = '', value = '') {
    const step = STEPS[_activeIndex];
    if (!step) return null;
    const question = _activeGuidedQuestion(step.id, _snapshot());
    if (!question) return null;
    const focusValue = _questionFocusValue(question);
    const title = _guidedQuestionTitle(question) || question.title || step.title;
    return {
      stepIndex: _activeIndex,
      stepId: step.id,
      key: _questionHistoryKey(step.id, question, focusValue),
      title,
      focusValue,
      question: _questionHistorySnapshot(question),
      reason: String(reason || ''),
      value: String(value || '').slice(0, 180),
      at: new Date().toISOString(),
    };
  }

  function _questionHistorySnapshot(question = {}) {
    return {
      kicker: question.kicker || '',
      title: question.title || '',
      body: question.body || '',
      actions: (question.actions || []).map(action => ({ ...action })),
      done: false,
      control: question.control || '',
      info: question.info || '',
      blocking: false,
      review: true,
    };
  }

  function _questionHistoryKey(stepId = '', question = {}, focusValue = '') {
    const actions = (question.actions || [])
      .map(action => `${action.action || ''}:${action.value || ''}`)
      .join('|');
    return [
      stepId,
      question.kicker || '',
      question.title || '',
      focusValue || '',
      actions,
    ].map(part => String(part || '').trim()).join('::').slice(0, 1200);
  }

  function _questionFocusValue(question = {}) {
    const actions = question.actions || [];
    for (const action of actions) {
      const value = _planValueFromQuestionAction(action);
      if (value) return value;
    }
    return '';
  }

  function _planValueFromQuestionAction(action = {}) {
    const raw = String(action.value || '').trim();
    const parts = raw.split('::');
    switch (action.action) {
      case 'selectPlanItem':
      case 'openClassroomObjectFicha':
      case 'openSanitaryObjectFicha':
        return raw;
      case 'openClassroomFicha':
      case 'saveClassroomMeasures':
      case 'confirmClassroomConfigured':
        return raw ? `room::${raw}` : '';
      case 'openSanitaryFicha':
      case 'saveSanitaryMeasures':
      case 'confirmSanitaryConfigured':
        return raw ? `sanitary::${raw}` : '';
      case 'openSiteFicha':
      case 'saveSiteMeasures':
      case 'confirmSiteConfigured':
        return raw ? `site::${raw}` : '';
      case 'answerBlockField':
        return '';
      case 'answerFloorField':
        return parts[0] && parts[1] ? `floor::${parts[0]}::${parts[1]}` : '';
      case 'answerClassroomField':
      case 'addGuidedRoomElement':
      case 'markRoomElementAbsent':
        return parts[0] ? `room::${parts[0]}` : '';
      case 'answerClassroomObjectField':
        return parts[0] && parts[1] ? `${parts[0]}::${parts[1]}` : '';
      case 'answerSanitaryField':
      case 'addGuidedSanitaryElement':
      case 'markSanitaryElementAbsent':
        return parts[0] ? `sanitary::${parts[0]}` : '';
      case 'answerSanitaryObjectField':
        return parts[0] && parts[1] ? `sanitary::${parts[0]}::${parts[1]}` : '';
      case 'answerSiteElementField':
        return parts[0] ? `site::${parts[0]}` : '';
      default:
        return '';
    }
  }

  function _updateSlide() {
    const root = document.getElementById('guided-register-root');
    if (!root) return;
    const track = root.querySelector('[data-guided-track]');
    if (track) track.style.transform = 'none';
    root.querySelectorAll('[data-guided-slide]').forEach((slide, index) => {
      const active = index === _activeIndex;
      slide.hidden = !active;
      slide.classList.toggle('guided-slide--active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    root.querySelectorAll('[data-guided-step]').forEach((button, index) => {
      const active = index === _activeIndex;
      button.classList.toggle('guided-step--active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
    });
    const progress = root.querySelector('[data-guided-progress]');
    if (progress) progress.style.width = `${((_activeIndex + 1) / STEPS.length) * 100}%`;
    const floatingStep = root.querySelector('[data-guided-floating-step]');
    if (floatingStep) floatingStep.textContent = `${String(_activeIndex + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')} - ${STEPS[_activeIndex]?.title || ''}`;
    _updateFloatingFinishAction(root, _snapshot());
    const moved = _movePlanSurfaceForActiveStep(root);
    const baseMapChanged = _ensureGuidedLocationBaseMap();
    requestAnimationFrame(() => {
      _resetActiveGuidedViewport(root);
      _syncDeckHeight(root);
      if (moved || baseMapChanged) _refreshPlan();
    });
  }

  function _resetScrollPosition(element) {
    if (!element) return;
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }

  function _resetActiveGuidedViewport(root = document.getElementById('guided-register-root')) {
    if (!root) return;
    const activeSlide = root.querySelector('.guided-slide--active');
    [
      root.querySelector('[data-guided-deck]'),
      root.querySelector('[data-guided-track]'),
      activeSlide,
      activeSlide?.querySelector('.guided-slide__body'),
      activeSlide?.querySelector('.guided-slide__next'),
    ].forEach(_resetScrollPosition);
  }

  function _guidedNextRenderKey(stepId = '', snap = _snapshot()) {
    const question = _activeGuidedQuestion(stepId, snap);
    if (!question) return `done::${stepId}`;
    return _questionHistoryKey(stepId, question, _questionFocusValue(question));
  }

  function _resetGuidedNextPanel(panel) {
    if (!panel) return;
    _resetScrollPosition(panel);
    _resetScrollPosition(panel.querySelector('.guided-next-card'));
    _resetScrollPosition(panel.querySelector('.guided-info-note'));
  }

  function _ensureGuidedLocationBaseMap() {
    if (STEPS[_activeIndex]?.id !== 'escuela') return false;
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.ensureGuidedLocationBaseMap) return false;
    try {
      return Boolean(mec.ensureGuidedLocationBaseMap({ render: false }));
    } catch (err) {
      console.warn('No se pudo activar automaticamente la base mapa del paso 1:', err);
      return false;
    }
  }

  function _movePlanSurfaceForActiveStep(root = document.getElementById('guided-register-root')) {
    if (!root) return false;
    const planRoot = root.querySelector('#guided-school-plan-root');
    if (!planRoot) return false;
    const activeStep = STEPS[_activeIndex]?.id || 'escuela';
    const targetName = _stepUsesInlineMap(activeStep) ? activeStep : 'panel';
    const targetSlot = root.querySelector(`[data-guided-plan-slot="${targetName}"]`) || root.querySelector('[data-guided-plan-slot="panel"]');
    if (!targetSlot) return false;
    const moved = planRoot.parentElement !== targetSlot;
    if (moved) targetSlot.appendChild(planRoot);
    const inline = targetName !== 'panel';
    root.querySelector('.guided-register')?.classList.toggle('guided-register--map-inline', inline);
    root.querySelector('.guided-plan-panel')?.classList.toggle('guided-plan-panel--parked', inline);
    return moved;
  }

  function _updateSnapshot() {
    const root = document.getElementById('guided-register-root');
    if (!root) return;
    const snap = _snapshot();
    _setCount(root, 'blocks', snap.blocks);
    _setCount(root, 'classrooms', snap.classrooms);
    _setCount(root, 'otherSpaces', snap.otherSpaces);
    _setCount(root, 'sanitaries', snap.sanitaries);
    _setCount(root, 'siteElements', snap.siteElements);
    _setCount(root, 'evidence', snap.evidence);
    const save = root.querySelector('[data-guided-save-state]');
    if (save) save.textContent = snap.savedAtText || 'Sin borrador';
    const planTitle = root.querySelector('[data-guided-plan-title]');
    if (planTitle) planTitle.textContent = snap.planTitle;
    const schoolName = root.querySelector('[data-guided-school-name]');
    if (schoolName) schoolName.textContent = snap.school.name || 'Sin escuela seleccionada';
    const schoolMeta = root.querySelector('[data-guided-school-meta]');
    if (schoolMeta) schoolMeta.textContent = snap.school.meta || 'Seleccione una escuela desde el mapa antes de iniciar la carga.';
    const inlineSchoolName = root.querySelector('[data-guided-inline-school-name]');
    if (inlineSchoolName) inlineSchoolName.textContent = snap.school.name || 'Sin escuela seleccionada';
    const inlineMeta = root.querySelector('[data-guided-inline-school-meta]');
    if (inlineMeta) {
      const coords = [snap.school.latitud, snap.school.longitud].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(', ');
      inlineMeta.textContent = [snap.school.meta, coords ? `Coords ${coords}` : ''].filter(Boolean).join(' | ') ||
        'Seleccione una escuela para cargar la base satelital.';
    }
    const inlineStatus = root.querySelector('[data-guided-inline-school-status]');
    if (inlineStatus) {
      inlineStatus.textContent = snap.baseMapSaved
        ? 'Base georreferenciada guardada'
        : ((snap.school.latitud && snap.school.longitud) ? 'Base mapa activa con coordenadas de escuela' : 'Base mapa pendiente');
    }
    _refreshTimeTracking(root, snap);
    root.querySelectorAll('[data-guided-step-state]').forEach(label => {
      const step = STEPS.find(item => item.id === label.dataset.guidedStepState);
      const done = _stepDone(step?.id, snap);
      label.textContent = done ? 'Listo' : 'Pendiente';
      label.closest('.guided-step')?.classList.toggle('guided-step--done', done);
    });
    let anyChangedQuestion = false;
    root.querySelectorAll('[data-guided-next]').forEach(panel => {
      const _measSels = [
        '[data-guided-block-length]', '[data-guided-block-width]',
        '[data-guided-floor-length]', '[data-guided-floor-width]',
        '[data-guided-room-length]', '[data-guided-room-width]',
        '[data-guided-sanitary-length]', '[data-guided-sanitary-width]',
        '[data-guided-site-diameter]', '[data-guided-site-length]', '[data-guided-site-width]',
      ];
      const _preserved = {};
      _measSels.forEach(sel => { const el = panel.querySelector(sel); if (el?.value) _preserved[sel] = el.value; });
      const renderKey = _guidedNextRenderKey(panel.dataset.guidedNext || '', snap);
      const changedQuestion = panel.dataset.guidedRenderKey !== renderKey;
      panel.innerHTML = _guidedNextHtml(panel.dataset.guidedNext || '', snap);
      panel.dataset.guidedRenderKey = renderKey;
      _measSels.forEach(sel => {
        if (!_preserved[sel]) return;
        const el = panel.querySelector(sel);
        if (el && !el.value) el.value = _preserved[sel];
      });
      if (changedQuestion) {
        anyChangedQuestion = true;
        _resetGuidedNextPanel(panel);
      }
    });
    _updateGuidedActionStates(root, snap);
    _updateFloatingFinishAction(root, snap);
    requestAnimationFrame(() => {
      if (anyChangedQuestion) _resetActiveGuidedViewport(root);
      _syncDeckHeight(root);
    });
  }

  function _updateFloatingFinishAction(root = document.getElementById('guided-register-root'), snap = _snapshot()) {
    if (!root) return;
    const hasSchool = Boolean(snap.school?.code || snap.school?.name);
    const completion = snap.completion || { complete: false, pending: [] };
    const pendingCount = Array.isArray(completion.pending) ? completion.pending.length : 0;
    root.querySelectorAll('[data-guided-finish-pending]').forEach(button => {
      button.hidden = !hasSchool || Boolean(completion.complete);
      button.textContent = pendingCount
        ? `Finalizar con ${pendingCount} pendiente(s)`
        : 'Finalizar con pendientes';
    });
    root.querySelectorAll('[data-guided-finish-complete]').forEach(button => {
      button.hidden = !hasSchool || !completion.complete;
    });
  }

  function _refreshTimeTracking(root = document.getElementById('guided-register-root'), snap = null) {
    if (!root) return;
    const panel = root.querySelector('[data-guided-time-strip]');
    if (!panel) return;
    const current = snap || _snapshot();
    panel.innerHTML = _timeStripHtml(current.timeTracking);
  }

  function _guidedBaseMapState(snap = _snapshot()) {
    const fromMec = typeof MecFormModule !== 'undefined' && MecFormModule.getPlanBaseMapState
      ? MecFormModule.getPlanBaseMapState()
      : null;
    const baseMap = fromMec || snap?.values?.__planBaseMap || {};
    const source = String(baseMap.source || 'satellite').toLowerCase();
    const enabled = Boolean(baseMap.enabled);
    const streetOverlay = Boolean(baseMap.streetOverlay);
    const cadastralOverlay = Boolean(baseMap.cadastralOverlay);
    return {
      enabled,
      source: source === 'satellite' || source === 'google_satellite' || source === 'highres' ? source : 'street',
      streetOverlay,
      cadastralOverlay,
      confirmed: Boolean(baseMap.confirmed || baseMap.savedAt),
      dragMode: Boolean(baseMap.dragMode),
      hasCoords: Boolean(baseMap.hasCoords || (baseMap.lat !== undefined && baseMap.lat !== '' && baseMap.lng !== undefined && baseMap.lng !== '')),
    };
  }

  function _updateGuidedActionStates(root = document.getElementById('guided-register-root'), snap = _snapshot()) {
    if (!root) return;
    const base = _guidedBaseMapState(snap);
    const activeFor = action => {
      if (action === 'basemapSatellite') return base.enabled && ['satellite', 'google_satellite', 'highres'].includes(base.source);
      if (action === 'basemapStreet') return base.enabled && base.streetOverlay;
      if (action === 'basemapCatastro') return base.enabled && base.cadastralOverlay;
      if (action === 'basemap') return base.enabled;
      if (action === 'moveBase') return base.dragMode;
      if (action === 'saveBasemap') return base.confirmed;
      return false;
    };
    root.querySelectorAll('[data-guided-action]').forEach(button => {
      const action = button.dataset.guidedAction || '';
      const tracked = ['basemapSatellite', 'basemapStreet', 'basemapCatastro', 'basemap', 'moveBase', 'saveBasemap'].includes(action);
      if (!tracked) return;
      const active = activeFor(action);
      button.classList.toggle('btn-guided-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const sourceName = base.source === 'google_satellite'
      ? 'Alta res.'
      : (base.source === 'highres' ? 'Imagen alta res.' : 'Satelite');
    const overlays = [
      base.streetOverlay ? 'calles' : '',
      base.cadastralOverlay ? 'catastro' : '',
    ].filter(Boolean);
    const sourceLabel = overlays.length ? `${sourceName} + ${overlays.join(' + ')}` : `${sourceName} activo`;
    const stateText = !base.hasCoords
      ? 'Sin coordenadas: use "Usar coords"'
      : (base.enabled ? sourceLabel : 'Base apagada');
    root.querySelectorAll('[data-guided-basemap-state]').forEach(item => {
      item.textContent = `${stateText}${base.dragMode ? ' | Mover base activo' : ''}${base.confirmed ? ' | Guardada' : ''}`;
    });
  }

  function _syncDeckHeight(root = document.getElementById('guided-register-root')) {
    if (!root) return;
    const deck = root.querySelector('[data-guided-deck]');
    const activeStep = STEPS[_activeIndex];
    const slide = activeStep ? root.querySelector(`[data-guided-slide="${activeStep.id}"]`) : null;
    if (!deck || !slide) return;
    const body = slide.querySelector('.guided-slide__body');
    const footer = slide.querySelector('.guided-slide__footer');
    const desiredHeight = (body?.scrollHeight || 0) + (footer?.scrollHeight || 0);
    const viewportFill = _stepUsesInlineMap(activeStep?.id)
      ? Math.max(520, window.innerHeight - deck.getBoundingClientRect().top - 78)
      : 84;
    deck.style.height = `${Math.max(viewportFill, desiredHeight)}px`;
  }

  function _setCount(root, key, value) {
    const el = root.querySelector(`[data-guided-count="${key}"]`);
    if (el) el.textContent = String(value || 0);
  }

  function _schoolContext(values = {}) {
    const school = values.__selectedSchool || {};
    const general = values.general || {};
    const code = _firstPresent(school, ['codigo_establecimiento', 'codigo_local', 'codigo', 'id_escuela', 'id', 'code']) ||
      general.codigo_establecimiento || general.codigo_local || '';
    const name = _firstPresent(school, ['nombre', 'nombre_escuela', 'nombre_establecimiento', 'institucion', 'name']) ||
      general.nombre_institucion || general.nombre_establecimiento || '';
    const location = [
      general.departamento || school.departamento,
      general.distrito || school.distrito,
      general.localidad || school.localidad,
    ].filter(Boolean).join(' / ');
    const meta = [code ? `Codigo ${code}` : '', location].filter(Boolean).join(' - ');
    return {
      code,
      name,
      location,
      meta,
      departamento: general.departamento || school.departamento || '',
      distrito: general.distrito || school.distrito || '',
      localidad: general.localidad || school.localidad || '',
      direccion: general.direccion || _firstPresent(school, ['direccion', 'direccion_referencia', 'referencia']),
      latitud: general.latitud || _firstPresent(school, ['latitud', 'lat', 'latitude']),
      longitud: general.longitud || _firstPresent(school, ['longitud', 'lng', 'lon', 'longitude']),
    };
  }

  function _schoolIdentityFlagKey(school = {}) {
    const id = school.code || school.name || 'sin-escuela';
    return ['flag', 'school', _slug(id), 'identityConfirmed'].join('::');
  }

  function _schoolIdentityConfirmedForSchool(school = {}) {
    return Boolean((school.code || school.name) && _flagValue(_schoolIdentityFlagKey(school)));
  }

  function _firstPresent(source, keys = []) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function _durationSecondsFromLog(item = {}, nowMs = Date.now()) {
    const stored = Number(item.durationSeconds || item.duracion_segundos);
    if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
    const startMs = new Date(item.startedAt || item.inicio_iso || item.inicio || '').getTime();
    const endRaw = item.finishedAt || item.fin_iso || item.fin || item.endedAt || '';
    const endMs = endRaw ? new Date(endRaw).getTime() : nowMs;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    return Math.max(0, Math.round((endMs - startMs) / 1000));
  }

  function _minutesFromSeconds(seconds = 0) {
    const value = Math.max(0, Number(seconds) || 0);
    return Math.round((value / 60) * 10) / 10;
  }

  function _timeTrackingSummary(values = {}) {
    if (typeof MecFormModule !== 'undefined' && typeof MecFormModule.getTimeSummary === 'function') {
      try {
        return MecFormModule.getTimeSummary();
      } catch (err) {
        console.warn('[Registro guiado] No se pudo leer resumen de tiempos activo:', err);
      }
    }
    const log = values.__registroTiempos || {};
    const nowMs = Date.now();
    const finished = Array.isArray(log.items) ? log.items : [];
    const active = log.active && typeof log.active === 'object' ? Object.values(log.active) : [];
    const records = [
      ...finished.map(item => ({
        kind: item.kind || 'registro',
        id: item.id || '',
        label: item.label || '',
        startedAt: item.startedAt || '',
        finishedAt: item.finishedAt || '',
        durationSeconds: _durationSecondsFromLog(item, nowMs),
        active: false,
      })),
      ...active.map(item => ({
        kind: item.kind || 'registro',
        id: item.id || '',
        label: item.label || '',
        startedAt: item.startedAt || '',
        finishedAt: '',
        durationSeconds: _durationSecondsFromLog(item, nowMs),
        active: true,
      })),
    ].filter(item => item.kind && item.id);
    const byKind = {};
    let firstMs = Infinity;
    let lastMs = 0;
    records.forEach(record => {
      const kind = record.kind || 'registro';
      byKind[kind] = byKind[kind] || { kind, count: 0, finishedCount: 0, activeCount: 0, totalSeconds: 0, totalMinutes: 0, averageSeconds: 0, averageMinutes: 0, items: [], _ids: new Set() };
      const group = byKind[kind];
      group._ids.add(record.id);
      group.totalSeconds += record.durationSeconds || 0;
      if (record.active) group.activeCount += 1;
      else group.finishedCount += 1;
      group.items.push(record);
      const startMs = new Date(record.startedAt || '').getTime();
      const endMs = record.finishedAt ? new Date(record.finishedAt).getTime() : nowMs;
      if (Number.isFinite(startMs)) firstMs = Math.min(firstMs, startMs);
      if (Number.isFinite(endMs)) lastMs = Math.max(lastMs, endMs);
    });
    Object.values(byKind).forEach(group => {
      group.count = group._ids.size || group.items.length;
      group.totalSeconds = Math.round(group.totalSeconds);
      group.totalMinutes = _minutesFromSeconds(group.totalSeconds);
      group.averageSeconds = group.count ? Math.round(group.totalSeconds / group.count) : 0;
      group.averageMinutes = _minutesFromSeconds(group.averageSeconds);
      delete group._ids;
    });
    const productiveSeconds = records
      .filter(record => record.kind !== 'escuela')
      .reduce((sum, record) => sum + (record.durationSeconds || 0), 0);
    const workWindowSeconds = Number.isFinite(firstMs) && lastMs > firstMs ? Math.round((lastMs - firstMs) / 1000) : 0;
    const schoolSeconds = byKind.escuela?.totalSeconds || workWindowSeconds;
    return {
      generatedAt: new Date().toISOString(),
      schoolSeconds,
      schoolMinutes: _minutesFromSeconds(schoolSeconds),
      productiveSeconds: Math.round(productiveSeconds),
      productiveMinutes: _minutesFromSeconds(productiveSeconds),
      workWindowSeconds,
      workWindowMinutes: _minutesFromSeconds(workWindowSeconds),
      byKind,
      activeItems: records.filter(record => record.active),
      records,
    };
  }

  function _timeDurationText(seconds = 0) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    if (minutes) return `${minutes}m ${String(sec).padStart(2, '0')}s`;
    return `${sec}s`;
  }

  function _timeKind(summary = {}, kind = '') {
    return summary?.byKind?.[kind] || { count: 0, activeCount: 0, totalSeconds: 0, averageSeconds: 0 };
  }

  function _timeStripHtml(summary = {}) {
    const hasRecords = Array.isArray(summary.records) && summary.records.length;
    const school = Number(summary.schoolSeconds || 0);
    const ambientes = _timeKind(summary, 'ambiente');
    const sanitarios = _timeKind(summary, 'sanitario');
    const active = Array.isArray(summary.activeItems) ? summary.activeItems : [];
    if (!hasRecords) {
      return `
        <div class="guided-time-strip__empty">
          <strong>Tiempo logistico</strong>
          <span>Sin medicion registrada todavia</span>
        </div>`;
    }
    return `
      <div class="guided-time-chip guided-time-chip--main">
        <span>Escuela</span>
        <strong>${_escape(_timeDurationText(school))}</strong>
        <small>${active.length ? `${active.length} contador(es) activo(s)` : 'sin contador activo'}</small>
      </div>
      <div class="guided-time-chip">
        <span>Aulas / ambientes</span>
        <strong>${_escape(_timeDurationText(ambientes.totalSeconds))}</strong>
        <small>${ambientes.count || 0} registro(s) - prom. ${_escape(_timeDurationText(ambientes.averageSeconds))}</small>
      </div>
      <div class="guided-time-chip">
        <span>Sanitarios</span>
        <strong>${_escape(_timeDurationText(sanitarios.totalSeconds))}</strong>
        <small>${sanitarios.count || 0} registro(s) - prom. ${_escape(_timeDurationText(sanitarios.averageSeconds))}</small>
      </div>`;
  }

  function _timePanelHtml(summary = {}) {
    const hasRecords = Array.isArray(summary.records) && summary.records.length;
    if (!hasRecords) {
      return `
        <div class="guided-time-panel" aria-label="Tiempos logisticos">
          <strong>Tiempos logisticos</strong>
          <span>Sin medicion registrada todavia.</span>
        </div>`;
    }
    const rows = [
      ['Escuela completa', summary.schoolSeconds || 0, _timeKind(summary, 'escuela').count || 1, _timeKind(summary, 'escuela').averageSeconds || summary.schoolSeconds || 0],
      ['Aulas / ambientes', _timeKind(summary, 'ambiente').totalSeconds, _timeKind(summary, 'ambiente').count, _timeKind(summary, 'ambiente').averageSeconds],
      ['Sanitarios', _timeKind(summary, 'sanitario').totalSeconds, _timeKind(summary, 'sanitario').count, _timeKind(summary, 'sanitario').averageSeconds],
      ['Exteriores / tecnicos', _timeKind(summary, 'exterior').totalSeconds, _timeKind(summary, 'exterior').count, _timeKind(summary, 'exterior').averageSeconds],
    ];
    return `
      <div class="guided-time-panel" aria-label="Tiempos logisticos">
        <strong>Tiempos logisticos</strong>
        ${rows.map(row => `
          <span>
            <b>${_escape(row[0])}</b>
            <em>${_escape(_timeDurationText(row[1]))}</em>
            <small>${Number(row[2] || 0)} item(s) - prom. ${_escape(_timeDurationText(row[3]))}</small>
          </span>`).join('')}
      </div>`;
  }

  function _snapshot() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
    } catch {
      saved = {};
    }
    const values = saved.values || saved || {};
    const currentSchool = _currentSchoolForState();
    const useCurrentSchool = currentSchool && !_sameSchoolIdentity(values.__selectedSchool, currentSchool);
    const valuesForSchool = useCurrentSchool
      ? { ...values, __selectedSchool: currentSchool }
      : ((values.__selectedSchool || !currentSchool)
        ? values
        : { ...values, __selectedSchool: currentSchool });
    const school = _schoolContext(valuesForSchool);
    const rooms = Array.isArray(values.__classrooms) ? values.__classrooms : [];
    const siteElements = Array.isArray(values.__siteElements) ? values.__siteElements : [];
    const propertyBoundary = _propertyBoundaryElement(siteElements);
    const operationalSiteElements = siteElements.filter(item => !_isPropertyBoundaryElement(item));
    const blocks = Array.isArray(values.__blocks) ? values.__blocks : [];
    const sanitaries = Array.isArray(values.__sanitaries) ? values.__sanitaries : [];
    const classrooms = rooms.filter(room => !room.spaceKind || room.spaceKind === 'classroom').length;
    const otherSpaces = Math.max(0, rooms.length - classrooms);
    const activeBlock = blocks.find(block => block.id === values.__activeBlockId) || blocks[0] || null;
    const activeFloors = Array.isArray(activeBlock?.floors) ? activeBlock.floors : [];
    const firstFloor = activeFloors[0] || null;
    const activeFloorLabel = _floorLabel(firstFloor) || _normalizeFloorLabel(values.__activeFloor || 'Planta baja');
    const blockId = activeBlock?.id || values.__activeBlockId || '';
    const activeBlockRooms = rooms.filter(room => (
      (!blockId || room.blockId === blockId) &&
      (!activeFloorLabel || _normalizeFloorLabel(room.floor || activeFloorLabel) === activeFloorLabel)
    ));
    const activeClassrooms = activeBlockRooms.filter(room => !room.spaceKind || room.spaceKind === 'classroom');
    const activeOtherSpaces = activeBlockRooms.filter(room => room.spaceKind && room.spaceKind !== 'classroom');
    const activeSanitaries = sanitaries.filter(item => (
      (!activeBlock || _matchesBlockReference(item.bloque, activeBlock)) &&
      (!activeFloorLabel || _normalizeFloorLabel(item.planta || activeFloorLabel) === activeFloorLabel)
    ));
    const incompleteClassroom = activeClassrooms.find(room => !_roomConfigured(room));
    const incompleteSanitary = activeSanitaries.find(item => !_sanitaryConfigured(item));
    const incompleteSiteElement = operationalSiteElements.find(item => !_siteElementConfigured(item));
    const blockHasMeasures = _hasMeasures(activeBlock, 'largo_m', 'ancho_m');
    const blockPositioned = _hasPosition(activeBlock?.planPosition || activeBlock?.plano_general);
    const noFloor = _flagValue(_flagKeyParts(blockId, activeFloorLabel, 'noFloor'));
    const incompleteFloor = activeFloors.find(floor => !_floorReady(floor));
    const activeBlockSiteElements = operationalSiteElements.filter(item => (
      item?.autoSource?.module === 'bloques' &&
      (!blockId || item.autoSource.blockId === blockId)
    ));
    const incompleteBlockSiteElement = activeBlockSiteElements.find(item => !_siteElementConfigured(item));
    const activeFloorsReady = activeFloors.length
      ? activeFloors.every(floor => _floorReady(floor))
      : true;
    const blockReadyForRooms = Boolean(activeBlock && blockHasMeasures && blockPositioned && activeFloors.length && activeFloorsReady);
    const classroomTargetKey = _targetKeyParts(blockId, activeFloorLabel, 'classrooms');
    const savedAtText = _formatDate(saved.savedAt);
    const timeTracking = _timeTrackingSummary(values);
    const schoolIdentityConfirmed = _schoolIdentityConfirmedForSchool(school);
    const completion = _completionStatus(values, savedAtText, school);
    return {
      values,
      timeTracking,
      blocks: blocks.length,
      classrooms,
      otherSpaces,
      sanitaries: sanitaries.length,
      siteElements: operationalSiteElements.length,
      evidence: _countEvidence(values),
      baseMapSaved: Boolean(values.__planBaseMap?.confirmed || values.__planBaseMap?.savedAt),
      savedAtText,
      school,
      schoolIdentityConfirmed,
      propertyBoundary,
      propertyBoundaryConfirmed: _propertyBoundaryConfirmed(propertyBoundary),
      completion,
      planTitle: activeBlock?.bloque_codigo || school.name || values.general?.nombre_institucion || 'Escuela en construccion',
      activeBlock,
      activeFloors,
      firstFloor,
      activeFloorLabel,
      activeClassrooms,
      activeOtherSpaces,
      activeSanitaries,
      activeSiteElements: operationalSiteElements,
      incompleteClassroom,
      incompleteSanitary,
      incompleteSiteElement,
      incompleteFloor,
      incompleteBlockSiteElement,
      blockHasMeasures,
      blockPositioned,
      blockReadyForRooms,
      activeFloorsReady,
      noFloor,
      classroomTarget: _targetValue(classroomTargetKey),
      classroomTargetKey,
    };
  }

  function _completionStatus(values = {}, savedAtText = '', school = {}) {
    const blocks = Array.isArray(values.__blocks) ? values.__blocks : [];
    const rooms = Array.isArray(values.__classrooms) ? values.__classrooms : [];
    const sanitaries = Array.isArray(values.__sanitaries) ? values.__sanitaries : [];
    const siteElements = Array.isArray(values.__siteElements) ? values.__siteElements : [];
    const propertyBoundary = _propertyBoundaryElement(siteElements);
    const operationalSiteElements = siteElements.filter(item => !_isPropertyBoundaryElement(item));
    const baseMapSaved = Boolean(values.__planBaseMap?.confirmed || values.__planBaseMap?.savedAt);
    const pending = [];
    const add = (scope, title, detail = '', action = '', value = '') => {
      pending.push({ scope, title, detail, action, value });
    };
    const labelBlock = block => block?.bloque_codigo || block?.nombre || block?.id || 'Bloque';
    const labelFloor = floor => _floorLabel(floor) || 'Piso';
    const flag = (blockId, floorLabel, name) => _flagValue(_flagKeyParts(blockId, floorLabel, name));

    if (!school.name && !school.code) add('Escuela', 'Identificar escuela', 'Falta codigo o nombre de la escuela.', 'module', 'mapa');
    if ((school.name || school.code) && !_schoolIdentityConfirmedForSchool(school)) add('Escuela', 'Confirmar datos basicos', 'Revise codigo, nombre, territorio y coordenadas antes de cargar infraestructura.', 'resetSchoolIdentity');
    if ((school.name || school.code) && !baseMapSaved) add('Escuela', 'Guardar ubicacion base una vez', 'Cierre el Paso 1: posicionar escuela y tocar Guardar base antes de pedir predio.', 'saveBasemap');
    if (baseMapSaved && !propertyBoundary) add('Predio', 'Dibujar perimetro con vertices', 'Cree el contorno editable del predio antes de crear bloques.', 'addPropertyBoundary');
    if (baseMapSaved && propertyBoundary && !_propertyBoundaryConfirmed(propertyBoundary)) add('Predio', 'Ajustar y confirmar perimetro', 'Mueva los puntos numerados del predio y confirme cuando representen los bordes de la escuela.', 'confirmPropertyBoundary', propertyBoundary.id);
    if (!savedAtText) add('Escuela', 'Guardar contexto inicial', 'Guarde datos generales, jornada o responsable de carga.', 'stage', 'general');
    if (!blocks.length) add('Bloques', 'Crear al menos un bloque', 'El relevamiento no tiene estructura arquitectonica.', 'guidedBlock');

    blocks.forEach(block => {
      const blockLabel = labelBlock(block);
      _blockRequirementItems(block)
        .filter(item => !item.done && !item.optional)
        .forEach(item => add(blockLabel, item.title, item.help || '', 'blockFicha'));
      if (!_hasPosition(block?.planPosition || block?.plano_general)) {
        add(blockLabel, 'Ubicar bloque en plano', 'Arrastre el bloque sobre la referencia del predio.', 'positionBlock');
      }

      const floors = Array.isArray(block?.floors) ? block.floors : [];
      const noFloor = flag(block?.id, 'Planta baja', 'noFloor');
      if (!floors.length && !noFloor) {
        add(blockLabel, 'Responder si tiene piso', 'Agregue un piso o marque que no corresponde.', 'floorGuide');
      }
      floors.forEach(floor => {
        const floorLabel = labelFloor(floor);
        _floorRequirementItems(floor)
          .filter(item => !item.done && !item.optional)
          .forEach(item => add(`${blockLabel} / ${floorLabel}`, item.title, item.help || '', item.plan ? 'selectPlanItem' : 'floorGuide', item.plan ? `floor::${block?.id || ''}::${floor?.id || floorLabel}` : ''));

        const targetKey = _targetKeyParts(block?.id, floorLabel, 'classrooms');
        const target = _targetValue(targetKey);
        const floorRooms = rooms.filter(room => room.blockId === block?.id && _normalizeFloorLabel(room.floor || floorLabel) === floorLabel && (!room.spaceKind || room.spaceKind === 'classroom'));
        if (!Number.isFinite(target)) {
          add(`${blockLabel} / ${floorLabel}`, 'Declarar cantidad de aulas', 'Registre cuantas aulas tiene este bloque/piso.', 'stage', 'aula');
        } else if (floorRooms.length < target) {
          add(`${blockLabel} / ${floorLabel}`, 'Completar aulas declaradas', `Faltan ${target - floorRooms.length} aula(s) de ${target}.`, 'guidedClassroom');
        }

        const floorSanitaries = sanitaries.filter(item => _matchesBlockReference(item.bloque, block) && _normalizeFloorLabel(item.planta || floorLabel) === floorLabel);
        if (!floorSanitaries.length && !flag(block?.id, floorLabel, 'noSanitary')) {
          add(`${blockLabel} / ${floorLabel}`, 'Responder si tiene sanitario', 'Inserte el sanitario o marque que no tiene.', 'sanitary');
        }
      });

      _blockTechnicalPending(block).forEach(item => add(blockLabel, item.title, item.detail, item.action, item.value));
    });

    rooms.forEach(room => {
      const scope = room.name || 'Ambiente';
      _roomRequirementItems(room)
        .filter(item => !item.done && !item.optional)
        .forEach(item => add(scope, item.title, item.help || '', item.plan ? 'selectPlanItem' : 'openClassroomFicha', item.value || (item.plan ? `room::${room.id}` : room.id)));
      if (_roomReady(room) && !_roomConfigured(room)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el ambiente.', 'confirmClassroomConfigured', room.id);
    });

    sanitaries.forEach(item => {
      const scope = item.codigo || 'Sanitario';
      _sanitaryRequirementItems(item)
        .filter(req => !req.done && !req.optional)
        .forEach(req => add(scope, req.title, req.help || '', req.plan ? 'selectPlanItem' : 'openSanitaryFicha', req.value || (req.plan ? `sanitary::${item.id}` : item.id)));
      if (_sanitaryReady(item) && !_sanitaryConfigured(item)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el sanitario.', 'confirmSanitaryConfigured', item.id);
    });

    operationalSiteElements.forEach(item => {
      const scope = item?.ficha?.codigo || _siteElementTypeLabel(item?.type) || 'Exterior';
      _siteElementRequirementItems(item)
        .filter(req => !req.done && !req.optional)
        .forEach(req => add(scope, req.title, req.help || '', req.plan ? 'selectPlanItem' : 'openSiteFicha', req.plan ? `site::${item.id}` : item.id));
      if (_siteElementReady(item) && !_siteElementConfigured(item)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el elemento exterior.', 'confirmSiteConfigured', item.id);
    });

    const anyNoSiteFlag = Object.entries(_guidedState.flags || {})
      .some(([key, value]) => value && key.endsWith('::noSiteElements'));
    if (!operationalSiteElements.length && !anyNoSiteFlag) {
      add('Exteriores', 'Responder si hay exteriores', 'Agregue elementos exteriores/tecnicos o marque que no hay.', 'site', 'water_tank');
    }

    return {
      complete: pending.length === 0,
      pending,
      checkedAt: new Date().toISOString(),
      counts: {
        blocks: blocks.length,
        rooms: rooms.length,
        sanitaries: sanitaries.length,
        siteElements: operationalSiteElements.length,
        evidence: _countEvidence(values),
      },
    };
  }

  function _blockTechnicalPending(block = {}) {
    const pending = [];
    if (!_hasAnswer(block.tipo_circulacion)) {
      pending.push({ title: 'Responder escalera/rampa', detail: 'Falta circulacion vertical del bloque.', action: 'answerBlockField', value: 'tipo_circulacion::No aplica' });
    }
    if (!_hasAnswer(block.pilares_bloque)) {
      pending.push({ title: 'Responder pilares del bloque', detail: 'Falta indicar si existen pilares visibles asociados al bloque.', action: 'answerBlockField', value: 'pilares_bloque::No verificable' });
    }
    if (!_hasAnswer(block.acometida_tipo)) {
      pending.push({ title: 'Responder acometida electrica', detail: 'Falta indicar si existe acometida visible.', action: 'answerBlockField', value: 'acometida_tipo::No visible' });
      return pending;
    }
    if (!_acometidaPresent(block.acometida_tipo)) return pending;
    if (!_hasAnswer(block.medidor_estado)) {
      pending.push({ title: 'Responder medidor', detail: 'Falta indicar medidor o punto de medicion.', action: 'answerBlockField', value: 'medidor_estado::No visible' });
    }
    if (!_hasAnswer(block.tablero_estado)) {
      pending.push({ title: 'Responder tablero electrico', detail: 'Falta indicar si hay tablero, caja o llave visible del bloque.', action: 'answerBlockField', value: 'tablero_estado::No existe / no visible' });
    }
    if (_tableroPresent(block.tablero_estado) && !_hasAnswer(block.llave_termomagnetica)) {
      pending.push({ title: 'Responder llave termomagnetica', detail: 'Falta verificacion de proteccion del tablero.', action: 'answerBlockField', value: 'llave_termomagnetica::No verificable' });
    }
    if (!_hasAnswer(block.puesta_tierra)) {
      pending.push({ title: 'Responder puesta a tierra', detail: 'Falta indicar si la puesta a tierra es visible o verificable.', action: 'answerBlockField', value: 'puesta_tierra::No verificable' });
    }
    return pending;
  }

  function _stepDone(id, snap) {
    if (id === 'escuela') return Boolean(snap.schoolIdentityConfirmed && snap.baseMapSaved);
    if (id === 'predio') return Boolean(snap.baseMapSaved && snap.propertyBoundaryConfirmed);
    if (id === 'bloques') return snap.blocks > 0 &&
      _blockRequirementItems(snap.activeBlock).every(item => item.done || item.optional) &&
      snap.blockPositioned &&
      (snap.noFloor || (snap.activeFloors.length && snap.activeFloorsReady));
    if (id === 'ambientes') return _activeGuidedQuestion('ambientes', snap)?.done || false;
    if (id === 'sanitarios') return _activeGuidedQuestion('sanitarios', snap)?.done || false;
    if (id === 'exteriores') return _activeGuidedQuestion('exteriores', snap)?.done || false;
    if (id === 'cierre') return Boolean(snap.completion?.complete);
    return false;
  }

  function _hasMeasures(item, lengthKey, widthKey) {
    return Number(item?.[lengthKey] || 0) > 0 && Number(item?.[widthKey] || 0) > 0;
  }

  function _hasPosition(item) {
    return Number.isFinite(Number(item?.xRatio)) && Number.isFinite(Number(item?.yRatio));
  }

  function _legacyGuidedNextHtml(stepId, snap) {
    if (stepId !== 'bloques') return '';
    if (!snap.blocks) {
      return _guidedNextCard('Paso 1', 'Crear bloque y cargar medidas', 'Pulse iniciar bloque: se abrira la ficha para largo, ancho y datos tecnicos.', [
        { label: 'Iniciar bloque', action: 'guidedBlock', primary: true },
      ]);
    }
    if (!snap.blockHasMeasures) {
      return _guidedNextCard('Paso 1', 'Medidas obligatorias del bloque', 'Complete largo y ancho antes de avanzar. Esas medidas fijan la escala para pisos y ambientes.', [
        { label: 'Completar ficha bloque', action: 'blockFicha', primary: true },
      ]);
    }
    if (!snap.blockPositioned) {
      return _guidedNextCard('Paso 2', 'Ubicar el bloque en el plano', 'Arrastre el bloque sobre la base del predio. Luego podra cargar la ficha tecnica completa y sus pisos.', [
        { label: 'Ubicar bloque', action: 'positionBlock', primary: true },
        { label: 'Ficha bloque', action: 'blockFicha' },
      ]);
    }
    if (!snap.activeFloors.length) {
      return _guidedNextCard('Paso 3', '¿El bloque tiene piso registrable?', 'Si existe un piso, agreguelo y grafiquelo dentro del bloque. Si no corresponde, guarde el bloque sin pisos.', [
        { label: 'Si, agregar piso', action: 'floorGuide', primary: true },
        { label: 'Guardar sin pisos', action: 'saveBlock' },
      ]);
    }
    if (!snap.activeFloorsReady) {
      return _guidedNextCard('Paso 4', 'Graficar y medir el piso', 'El piso debe quedar dibujado sobre el bloque y con largo/ancho antes de incorporar aulas o sanitarios.', [
        { label: 'Completar piso', action: 'floorGuide', primary: true },
        { label: 'Ubicar bloque', action: 'positionBlock' },
      ]);
    }
    return _guidedNextCard('Listo', 'Bloque y piso listos para ambientes', 'Ya puede avanzar a aulas, otros espacios o sanitarios con el plano como referencia principal.', [
      { label: 'Aulas y espacios', action: 'next', primary: true },
      { label: 'Nuevo bloque', action: 'guidedBlock' },
    ], true);
  }

  function _guidedNextCard(kicker, title, body, actions = [], done = false) {
    return `
      <section class="guided-next-card ${done ? 'guided-next-card--done' : ''}">
        <span>${_escape(kicker)}</span>
        <strong>${_escape(title)}</strong>
        <p>${_escape(body)}</p>
        <div>
          ${actions.map(action => `
            <button class="btn ${_guidedActionButtonClass(action)} btn-sm" type="button"
              data-guided-action="${_escape(action.action)}"
              data-guided-value="${_escape(action.value || '')}">
              ${_escape(action.label)}
            </button>`).join('')}
        </div>
      </section>`;
  }

  function _guidedNextHtml(stepId, snap) {
    const question = _activeGuidedQuestion(stepId, snap);
    return question ? _guidedQuestionCard(question) : '';
  }

  function _activeGuidedQuestion(stepId, snap = _snapshot()) {
    if (_guidedReviewQuestion?.stepId === stepId && _guidedReviewQuestion.question) {
      return _guidedReviewQuestion.question;
    }
    if (stepId === 'escuela') return _schoolQuestion(snap);
    if (stepId === 'predio') return _predioQuestion(snap);
    if (stepId === 'bloques') return _blockQuestion(snap);
    if (stepId === 'ambientes') return _classroomQuestion(snap);
    if (stepId === 'sanitarios') return _sanitaryQuestion(snap);
    if (stepId === 'exteriores') return _siteQuestion(snap);
    if (stepId === 'cierre') return _closureQuestion(snap);
    return null;
  }

  function _schoolQuestion(snap) {
    if (!snap.school.name) {
      return _question(
        'Ubicacion inicial',
        'Seleccione o identifique la escuela',
        'Antes de dibujar, confirme cual es la escuela del relevamiento. Ese dato identifica el plano, las fotos, los bloques, las aulas y la salida PDF.',
        [
          { label: 'Elegir en mapa', action: 'module', value: 'mapa', primary: true },
          { label: 'Datos generales', action: 'stage', value: 'general' },
          { label: 'Usar ejemplo', action: 'demo' },
        ],
        false,
        '',
        'Verifique codigo, nombre, departamento, distrito y localidad. Si esta en campo, confirme con la institucion que corresponde al establecimiento visitado antes de cargar mediciones. Si no hay conexion o la escuela no aparece, use Datos generales para dejar identificacion manual y luego continue el plano.',
        true
      );
    }
    if (!snap.schoolIdentityConfirmed) {
      return _question(
        'Ubicacion inicial',
        'Confirme identificacion y ubicacion de la escuela',
        'Revise y corrija codigo, nombre, departamento, distrito, localidad y coordenadas antes de dibujar. Esta confirmacion vincula todo el plano, fotos y cierre con la escuela correcta.',
        [
          { label: 'Confirmar datos', action: 'saveSchoolIdentity', primary: true },
          { label: 'Usar coordenadas MEC', action: 'coords' },
          { label: 'Ver alta res.', action: 'basemapSatellite' },
          { label: 'Calles encima', action: 'basemapStreet' },
          { label: 'Catastro', action: 'basemapCatastro' },
          { label: 'Elegir otra escuela', action: 'module', value: 'mapa' },
          { label: 'Reiniciar escuela', action: 'resetSchoolData' },
        ],
        false,
        _schoolIdentityControl(snap),
        'Esta debe ser siempre la primera validacion en campo. Si detecta que el relevamiento fue iniciado en una escuela equivocada, use Reiniciar escuela antes de seguir cargando bloques, aulas, sanitarios o evidencias.',
        true
      );
    }
    if (!snap.baseMapSaved) {
      return _question(
        'Paso 1: ubicacion base',
        'Guarde una sola ubicacion de partida',
        'Primero pulse Usar coordenadas MEC. Luego elija Ver satelite o Calles encima para verificar la ubicacion. Cuando el punto este correcto, pulse Guardar ubicacion.',
        [
          { label: 'Usar coordenadas MEC', action: 'coords', primary: true },
          { label: 'Ver alta res.', action: 'basemapSatellite' },
          { label: 'Calles encima', action: 'basemapStreet' },
          { label: 'Catastro', action: 'basemapCatastro' },
          { label: 'Guardar ubicacion', action: 'saveBasemap' },
          { label: 'Corregir datos', action: 'resetSchoolIdentity' },
        ],
        false,
        '',
        'Use Calles encima para confirmar nombre y trazado de calles cercanas sin perder la satelital. Use Ver satelite para ubicar techos y accesos. El boton activo queda marcado en verde.',
        true
      );
    }
    return _question(
      'Listo',
      'Escuela ubicada y georreferencia guardada',
      'La escuela ya tiene identidad y posicion de partida. Ahora corresponde delinear los bordes aproximados de la propiedad escolar.',
      [
        { label: 'Siguiente', action: 'next', primary: true },
        { label: 'Calles encima', action: 'basemapStreet' },
        { label: 'Catastro', action: 'basemapCatastro' },
        { label: 'Corregir datos escuela', action: 'resetSchoolIdentity' },
        { label: 'Reiniciar escuela', action: 'resetSchoolData' },
      ],
      true,
      '',
      'Mantenga visible el nombre de escuela en Plano vivo: todo lo que agregue desde ahora se vincula a este establecimiento. Si detecta que no es la escuela correcta, vuelva al mapa antes de crear nuevos objetos.',
      false
    );
  }

  function _predioQuestion(snap) {
    if (!snap.baseMapSaved) {
      return _question(
        'Paso anterior pendiente',
        'Cierre primero la ubicacion base',
        'Este paso ya no vuelve a pedir datos de escuela. Falta terminar el Paso 1: posicionar la escuela sobre la base mapa y tocar Guardar base.',
        [
          { label: 'Volver a Paso 1', action: 'prev', primary: true },
        ],
        false,
        '',
        'La ubicacion base se guarda una sola vez. Cuando vuelva a este paso, la guia pedira solamente el contorno del predio.',
        true
      );
    }
    if (!snap.propertyBoundary) {
      return _question(
        'Bordes del predio',
        'Dibuje el perimetro como un aula editable',
        'Agregue el contorno amarillo del predio. Luego arrastre directamente sus vertices numerados para ajustarlo sobre la imagen o las calles.',
        [
          { label: 'Dibujar perimetro', action: 'addPropertyBoundary', primary: true },
          { label: 'Catastro', action: 'basemapCatastro' },
          { label: 'Extender abajo', action: 'extendPlanDown' },
          { label: 'Acometida', action: 'site', value: 'service_connection' },
          { label: 'Volver a ubicacion base', action: 'prev' },
        ],
        false,
        '',
        'El perimetro queda en el mismo plano visible del paso anterior. Si necesita verificar calles, active Calles en la barra del mapa; si necesita ver techos, active Satelite.',
        true
      );
    }
    if (!snap.propertyBoundaryConfirmed) {
      return _question(
        'Bordes del predio',
        'Mueva los vertices del perimetro',
        'Seleccione el perimetro y arrastre directamente los puntos amarillos numerados. + Vertice agrega un nuevo punto al contorno; Confirmar perimetro bloquea esta etapa.',
        [
          { label: 'Seleccionar perimetro', action: 'selectPlanItem', value: `site::${snap.propertyBoundary.id}`, primary: true },
          { label: '+ Vertice', action: 'propertyBoundaryAddVertex', value: snap.propertyBoundary.id },
          { label: '- Vertice', action: 'propertyBoundaryRemoveVertex', value: snap.propertyBoundary.id },
          { label: 'Extender abajo', action: 'extendPlanDown' },
          { label: 'Acometida', action: 'site', value: 'service_connection' },
          { label: 'Confirmar perimetro', action: 'confirmPropertyBoundary', value: snap.propertyBoundary.id },
        ],
        false,
        _guidedRequirementList(_siteElementRequirementItems(snap.propertyBoundary)),
        'El boton activo queda marcado en verde. Si el contorno toca el limite inferior del plano, primero extienda el lienzo y luego arrastre los puntos amarillos.',
        true
      );
    }
    return _question(
      'Listo',
      'Perimetro del predio confirmado',
      'La ubicacion de la escuela y los bordes aproximados del predio ya estan guardados. Ahora puede pasar a bloques.',
      [
        { label: 'Siguiente', action: 'next', primary: true },
        { label: 'Seleccionar perimetro', action: 'selectPlanItem', value: `site::${snap.propertyBoundary.id}` },
        { label: 'Acometida', action: 'site', value: 'service_connection' },
        { label: 'Calles encima', action: 'basemapStreet' },
        { label: 'Catastro', action: 'basemapCatastro' },
      ],
      true,
      '',
      'El perimetro sirve como referencia de implantacion, no como plano catastral. Los bloques se dibujan dentro de esa envolvente con sus medidas reales y la escala del predio cuando esta cargada.',
      false
    );
  }

  function _isPropertyBoundaryElement(item = {}) {
    return item?.type === 'property_boundary';
  }

  function _propertyBoundaryElement(siteElements = []) {
    return (siteElements || []).find(item => _isPropertyBoundaryElement(item)) || null;
  }

  function _propertyBoundaryFlagKey(item = {}) {
    return _flagKeyParts('predio', 'perimetro', `propertyBoundary:${item?.id || 'predio'}`);
  }

  function _propertyBoundaryConfirmed(item) {
    return Boolean(item?.id && _flagValue(_propertyBoundaryFlagKey(item)));
  }

  function _blockQuestion(snap) {
    if (!snap.blocks) {
      return _question('Paso 1', 'Crear bloque', 'Primero cree el bloque. Luego la tarjeta superior pedira largo, ancho y las respuestas tecnicas sin depender de la ficha.', [
        { label: 'Iniciar bloque', action: 'guidedBlock', primary: true },
      ]);
    }
    const blockPending = _blockRequirementItems(snap.activeBlock);
    const blockNext = _firstPendingRequirement(blockPending);
    if (blockNext) {
      if (blockNext.field === 'medidas_bloque') {
        return _question('Paso 1', 'Bloque: medidas principales', 'Ingrese largo y ancho del bloque desde la guia. La ficha queda disponible solo para revisar o ampliar.', [
          { label: _hasMeasures(snap.activeBlock, 'largo_m', 'ancho_m') ? 'Confirmar medidas' : 'Guardar medidas', action: 'saveBlockMeasures', primary: true },
          { label: 'Editar ficha', action: 'blockFicha' },
        ], false, _measureControl('guided-block', 'Largo del bloque (m)', 'Ancho del bloque (m)', snap.activeBlock?.largo_m || '', snap.activeBlock?.ancho_m || ''), '', true);
      }
      if (!TECHNICAL_REGISTER_MODE && blockNext.field === 'estado_bloque') {
        return _question('Paso 1', 'Bloque: estado general', 'Registre la condicion observada del bloque antes de ubicarlo.', [
          { label: 'Bueno', action: 'answerBlockField', value: 'estado_bloque::Bueno', primary: true },
          { label: 'Regular', action: 'answerBlockField', value: 'estado_bloque::Regular' },
          { label: 'Malo', action: 'answerBlockField', value: 'estado_bloque::Malo' },
          { label: 'No verificable', action: 'answerBlockField', value: 'estado_bloque::No verificable' },
          { label: 'Editar ficha', action: 'blockFicha' },
        ], false, _guidedRequirementList(blockPending));
      }
      return _question('Paso 1', `Bloque: ${blockNext.title}`, blockNext.help || 'Complete la respuesta principal antes de continuar.', [
        { label: 'Editar ficha bloque', action: 'blockFicha', primary: true },
      ], false, _guidedRequirementList(blockPending));
    }
    if (!snap.blockPositioned) {
      return _question('Paso 2', 'Ubicar el bloque en el plano', 'Active el movimiento y arrastre el bloque hasta su posicion real dentro del predio.', [
        { label: 'Ubicar bloque', action: 'positionBlock', primary: true },
        { label: 'Ficha bloque', action: 'blockFicha' },
      ]);
    }
    if (!snap.activeFloors.length && !snap.noFloor) {
      return _question('Pregunta obligatoria', 'El bloque tiene piso registrable?', 'Si existe piso, debe graficarse sobre el bloque y completar sus medidas. Si no corresponde, registre que el bloque queda sin piso.', [
        { label: 'Si, agregar piso', action: 'floorGuide', primary: true },
        { label: 'No corresponde', action: 'markNoFloor' },
      ]);
    }
    if (snap.activeFloors.length && !snap.activeFloorsReady) {
      const floor = snap.incompleteFloor || snap.activeFloors.find(item => !_floorReady(item)) || snap.activeFloors[0];
      const pending = _floorRequirementItems(floor);
      const next = _firstPendingRequirement(pending);
      const floorValue = `${snap.activeBlock?.id || ''}::${floor?.id || floor?.label || 'Planta baja'}`;
      if (next?.title === 'Cargar dimensiones') {
        return _question('Paso 3', 'Piso: medidas principales', 'Ingrese largo y ancho del piso desde la guia. La ficha queda disponible solo para revisar o corregir.', [
          { label: _hasMeasures(floor, 'largo_m', 'ancho_m') ? 'Confirmar medidas' : 'Guardar medidas', action: 'saveFloorMeasures', value: floorValue, primary: true },
          { label: 'Seleccionar piso', action: 'selectPlanItem', value: `floor::${floorValue}` },
          { label: 'Editar ficha', action: 'floorGuide' },
        ], false, _measureControl('guided-floor', 'Largo del piso (m)', 'Ancho del piso (m)', floor?.largo_m || '', floor?.ancho_m || ''), '', true);
      }
      if (!TECHNICAL_REGISTER_MODE && next?.title === 'Condicion de calidad') {
        return _question('Paso 3', 'Piso: estado general', 'Registre el estado/calidad del piso antes de avanzar a aulas o sanitarios.', [
          ..._fieldAnswerActions('answerFloorField', `${floorValue}::estado`, ['Bueno', 'Regular', 'Malo', 'No verificable'], 'Bueno'),
          { label: 'Seleccionar piso', action: 'selectPlanItem', value: `floor::${floorValue}` },
          { label: 'Corregir medidas', action: 'resetFloorMeasures', value: floorValue },
          { label: 'Editar ficha', action: 'floorGuide' },
        ], false, _guidedRequirementList(pending));
      }
      return _question('Paso 3', next ? `Piso: ${next.title}` : 'Graficar y medir el piso', next?.help || 'El piso debe quedar dibujado sobre el bloque, con posicion, largo, ancho y rotacion antes de cargar ambientes.', [
        { label: next?.plan ? 'Seleccionar piso' : 'Completar piso', action: next?.plan ? 'selectPlanItem' : 'floorGuide', value: `floor::${snap.activeBlock?.id || ''}::${floor?.id || floor?.label || 'Planta baja'}`, primary: true },
        { label: 'Corregir medidas', action: 'resetFloorMeasures', value: floorValue },
        { label: 'Abrir ficha', action: 'floorGuide' },
      ], false, _guidedRequirementList(pending));
    }
    if (snap.incompleteBlockSiteElement) return _siteElementQuestion(snap.incompleteBlockSiteElement, 'bloque');
    const electric = _nextBlockTechnicalQuestion(snap);
    if (electric) return electric;
    return _question('Listo', 'Bloque listo para continuar', 'La estructura principal ya tiene las respuestas minimas para pasar a aulas, sanitarios o exteriores.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Agregar planta alta', action: 'floor' },
      { label: 'Nuevo bloque', action: 'guidedBlock' },
      ...(snap.noFloor ? [{ label: 'Agregar piso', action: 'resetNoFloor' }] : []),
    ], true);
  }

  function _nextBlockTechnicalQuestion(snap) {
    const block = snap.activeBlock || {};
    if (!_hasAnswer(block.tipo_circulacion)) {
      return _question('Pregunta obligatoria', 'Hay escalera o rampa asociada al bloque?', 'Si responde escalera, rampa o ambas, el elemento se incorpora al plano para ubicarlo y completar su ficha.', [
        { label: 'Escalera', action: 'answerBlockField', value: 'tipo_circulacion::Escalera', primary: true },
        { label: 'Rampa', action: 'answerBlockField', value: 'tipo_circulacion::Rampa', primary: true },
        { label: 'Ambas', action: 'answerBlockField', value: 'tipo_circulacion::Ambas' },
        { label: 'No aplica', action: 'answerBlockField', value: 'tipo_circulacion::No aplica' },
      ]);
    }
    if (!_hasAnswer(block.pilares_bloque)) {
      return _question('Pregunta obligatoria', 'Cuantos pilares visibles hay en el piso?', 'Indique la cantidad de pilares estructurales visibles. Se agregan al plano para ubicarlos; las dimensiones quedan como dato tecnico opcional.', [
        { label: '0 — no tiene', action: 'answerBlockField', value: 'pilares_bloque::0', primary: true },
        { label: '1', action: 'answerBlockField', value: 'pilares_bloque::1' },
        { label: '2', action: 'answerBlockField', value: 'pilares_bloque::2' },
        { label: '3', action: 'answerBlockField', value: 'pilares_bloque::3' },
        { label: '4', action: 'answerBlockField', value: 'pilares_bloque::4' },
        { label: '5', action: 'answerBlockField', value: 'pilares_bloque::5' },
        { label: '6 o mas', action: 'answerBlockField', value: 'pilares_bloque::6' },
      ]);
    }
    if (!_hasAnswer(block.acometida_tipo)) {
      return _question('Pregunta obligatoria', 'El bloque tiene acometida electrica?', 'La respuesta positiva agrega automaticamente la acometida al plano y abre su ficha tecnica.', [
        { label: 'Aerea', action: 'answerBlockField', value: 'acometida_tipo::Aerea', primary: true },
        { label: 'Subterranea', action: 'answerBlockField', value: 'acometida_tipo::Subterranea', primary: true },
        { label: 'Compartida', action: 'answerBlockField', value: 'acometida_tipo::Compartida con otro bloque' },
        { label: 'No visible', action: 'answerBlockField', value: 'acometida_tipo::No visible' },
        { label: 'No', action: 'answerBlockField', value: 'acometida_tipo::No' },
      ]);
    }
    if (!_acometidaPresent(block.acometida_tipo)) return null;
    if (!_hasAnswer(block.medidor_estado)) {
      return _question('Pregunta obligatoria', 'Tiene medidor o punto de medicion?', 'Si existe, la app lo agrega al plano para ajustar posicion, medidas y ficha.', [
        { label: 'Propio', action: 'answerBlockField', value: 'medidor_estado::Propio del bloque', primary: true },
        { label: 'Compartido', action: 'answerBlockField', value: 'medidor_estado::Compartido' },
        { label: 'No visible', action: 'answerBlockField', value: 'medidor_estado::No visible' },
        { label: 'No existe', action: 'answerBlockField', value: 'medidor_estado::No existe' },
      ]);
    }
    if (!_hasAnswer(block.tablero_estado)) {
      return _question('Pregunta obligatoria', 'Tiene tablero, caja o llave visible del bloque?', 'Si existe, se incorpora al plano para ubicarlo y cargar tipo/medidas.', [
        { label: 'Tablero principal', action: 'answerBlockField', value: 'tablero_estado::Tablero principal visible', primary: true },
        { label: 'Tablero seccional', action: 'answerBlockField', value: 'tablero_estado::Tablero seccional visible', primary: true },
        { label: 'Caja/llave visible', action: 'answerBlockField', value: 'tablero_estado::Caja o llave visible' },
        { label: 'No existe/no visible', action: 'answerBlockField', value: 'tablero_estado::No existe / no visible' },
      ]);
    }
    if (_tableroPresent(block.tablero_estado) && !_hasAnswer(block.llave_termomagnetica)) {
      return _question('Pregunta obligatoria', 'El tablero tiene llave termomagnetica?', 'Registre la respuesta antes de avanzar con la revision electrica del bloque.', [
        { label: 'Si', action: 'answerBlockField', value: 'llave_termomagnetica::Si', primary: true },
        { label: 'No', action: 'answerBlockField', value: 'llave_termomagnetica::No' },
        { label: 'No verificable', action: 'answerBlockField', value: 'llave_termomagnetica::No verificable' },
      ]);
    }
    if (!_hasAnswer(block.puesta_tierra)) {
      return _question('Pregunta obligatoria', 'Puesta a tierra visible o verificable?', 'Si marca Si, se agrega el punto de puesta a tierra al plano para ubicarlo y completar ficha.', [
        { label: 'Si', action: 'answerBlockField', value: 'puesta_tierra::Si', primary: true },
        { label: 'No', action: 'answerBlockField', value: 'puesta_tierra::No' },
        { label: 'No verificable', action: 'answerBlockField', value: 'puesta_tierra::No verificable' },
      ]);
    }
    return null;
  }

  function _classroomQuestion(snap) {
    if (!snap.blocks) {
      return _question('Antes de aulas', 'Cree un bloque primero', 'Las aulas deben quedar asociadas a un bloque y a un piso del plano.', [
        { label: 'Ir a bloques', action: 'prev', primary: true },
      ]);
    }
    if (!snap.blockReadyForRooms) {
      if (snap.noFloor) {
        return _question('Sin piso', 'No se cargan aulas para este bloque', 'El bloque fue marcado sin piso registrable. Puede agregar un piso si necesita cargar aulas.', [
          { label: 'Agregar piso', action: 'resetNoFloor', primary: true },
          { label: 'Siguiente', action: 'next' },
        ], true);
      }
      return _question('Antes de aulas', 'Complete bloque y piso', 'Para cargar aulas, el bloque debe tener medidas, ubicacion y un piso graficado con dimensiones.', [
        { label: 'Volver a bloques', action: 'prev', primary: true },
      ]);
    }
    if (!Number.isFinite(snap.classroomTarget)) {
      return _question('Pregunta obligatoria', 'Cuantas aulas tiene este bloque/piso?', 'Ingrese la cantidad. La app ira creando cada aula y no avanzara hasta que cada una tenga posicion, medidas y confirmacion.', [
        { label: 'Guardar cantidad', action: 'saveClassroomTarget', primary: true },
      ], false, _numberControl('guided-classroom-target', 'Cantidad de aulas', '0', '0'));
    }
    if (snap.activeClassrooms.length < snap.classroomTarget) {
      const nextNumber = snap.activeClassrooms.length + 1;
      return _question('Aula pendiente', `Insertar aula ${nextNumber} de ${snap.classroomTarget}`, 'Cree el aula, ubique su rectangulo en el plano y ajuste sus esquinas. Despues la guia superior preguntara tipos constructivos, aberturas, electricidad y danos/fallas.', [
        { label: `Insertar aula ${nextNumber}`, action: 'guidedClassroom', primary: true },
        { label: 'Cambiar cantidad', action: 'resetClassroomTarget' },
      ]);
    }
    if (snap.incompleteClassroom) {
      const directQuestion = _classroomDirectQuestion(snap.incompleteClassroom);
      if (directQuestion) return directQuestion;
      const label = snap.incompleteClassroom.name || 'Aula pendiente';
      const pending = _roomRequirementItems(snap.incompleteClassroom);
      const next = _firstPendingRequirement(pending);
      if (next?.title === 'Cargar dimensiones') {
        return _question('Aula pendiente', `${label}: medidas principales`, 'Ingrese largo y ancho desde la guia o estire el ambiente en el plano. Ambos caminos quedan sincronizados.', [
          { label: _hasMeasures(snap.incompleteClassroom, 'length', 'width') ? 'Confirmar medidas' : 'Guardar medidas', action: 'saveClassroomMeasures', value: snap.incompleteClassroom.id, primary: true },
          { label: 'Seleccionar en plano', action: 'selectPlanItem', value: `room::${snap.incompleteClassroom.id}` },
          { label: 'Editar ficha', action: 'openClassroomFicha', value: snap.incompleteClassroom.id },
        ], false, _measureControl('guided-room', 'Largo del aula/ambiente (m)', 'Ancho del aula/ambiente (m)', snap.incompleteClassroom.length || '', snap.incompleteClassroom.width || ''), '', true);
      }
      const primaryValue = next?.value || (next?.plan ? `room::${snap.incompleteClassroom.id}` : snap.incompleteClassroom.id);
      return _question('Aula pendiente', `${label}: ${next?.title || 'confirmar guardado'}`, next?.help || 'Complete primero la ubicacion o medida pendiente en el plano. Luego la guia pedira tipos y elementos uno por uno.', [
        { label: next?.plan ? 'Seleccionar en plano' : 'Abrir ficha', action: next?.plan ? 'selectPlanItem' : 'openClassroomFicha', value: primaryValue, primary: true },
        { label: 'Abrir ficha', action: 'openClassroomFicha', value: snap.incompleteClassroom.id },
        { label: 'Confirmar configuracion', action: 'confirmClassroomConfigured', value: snap.incompleteClassroom.id },
      ], false, _guidedRequirementList(pending));
    }
    return _question('Listo', 'Aulas configuradas para este bloque/piso', 'La cantidad declarada coincide con las aulas configuradas y confirmadas.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Cambiar cantidad', action: 'resetClassroomTarget' },
    ], true);
  }

  function _sanitaryQuestion(snap) {
    if (!snap.blockReadyForRooms) {
      if (snap.noFloor) {
        return _question('Sin piso', 'No se cargan sanitarios interiores', 'El bloque fue marcado sin piso registrable. Puede agregar piso si necesita ubicar sanitarios.', [
          { label: 'Agregar piso', action: 'resetNoFloor', primary: true },
          { label: 'Siguiente', action: 'next' },
        ], true);
      }
      return _question('Antes de sanitarios', 'Complete bloque y piso', 'Los sanitarios deben ubicarse sobre un piso graficado dentro del bloque.', [
        { label: 'Volver a bloques', action: 'prev', primary: true },
      ]);
    }
    const noSanitary = _flagValue(_flagKeyParts(snap.activeBlock?.id, snap.activeFloorLabel, 'noSanitary'));
    if (!snap.activeSanitaries.length && !noSanitary) {
      return _question('Pregunta obligatoria', 'Este bloque/piso tiene sanitario?', 'Si responde Si, se inserta el sanitario. Primero se ubica y dimensiona en el plano; luego la guia pedira uso, agua, desague, aberturas, artefactos y danos/fallas.', [
        { label: 'Si, insertar sanitario', action: 'sanitary', primary: true },
        { label: 'No tiene', action: 'markNoSanitary' },
      ]);
    }
    if (noSanitary) {
      return _question('Listo', 'Sanitarios omitidos para este bloque/piso', 'La respuesta quedo registrada. Puede cambiarla si encuentra un sanitario durante el recorrido.', [
        { label: 'Agregar sanitario', action: 'resetNoSanitary', primary: true },
        { label: 'Siguiente', action: 'next' },
      ], true);
    }
    if (snap.incompleteSanitary) {
      const directQuestion = _sanitaryDirectQuestion(snap.incompleteSanitary);
      if (directQuestion) return directQuestion;
      const label = snap.incompleteSanitary.codigo || 'Sanitario pendiente';
      const pending = _sanitaryRequirementItems(snap.incompleteSanitary);
      const next = _firstPendingRequirement(pending);
      if (next?.title === 'Cargar dimensiones') {
        return _question('Sanitario pendiente', `${label}: medidas principales`, 'Ingrese largo y ancho desde la guia o estire el sanitario en el plano. Ambos caminos quedan sincronizados.', [
          { label: _hasMeasures(snap.incompleteSanitary, 'largo_m', 'ancho_m') ? 'Confirmar medidas' : 'Guardar medidas', action: 'saveSanitaryMeasures', value: snap.incompleteSanitary.id, primary: true },
          { label: 'Seleccionar en plano', action: 'selectPlanItem', value: `sanitary::${snap.incompleteSanitary.id}` },
          { label: 'Editar ficha', action: 'openSanitaryFicha', value: snap.incompleteSanitary.id },
        ], false, _measureControl('guided-sanitary', 'Largo del sanitario (m)', 'Ancho del sanitario (m)', snap.incompleteSanitary.largo_m || '', snap.incompleteSanitary.ancho_m || ''), '', true);
      }
      const primaryValue = next?.value || (next?.plan ? `sanitary::${snap.incompleteSanitary.id}` : snap.incompleteSanitary.id);
      return _question('Sanitario pendiente', `${label}: ${next?.title || 'confirmar guardado'}`, next?.help || 'Complete primero la ubicacion o medida pendiente en el plano. Luego la guia pedira uso, agua, desague y artefactos uno por uno.', [
        { label: next?.plan ? 'Seleccionar en plano' : 'Abrir ficha', action: next?.plan ? 'selectPlanItem' : 'openSanitaryFicha', value: primaryValue, primary: true },
        { label: 'Abrir ficha', action: 'openSanitaryFicha', value: snap.incompleteSanitary.id },
        { label: 'Confirmar configuracion', action: 'confirmSanitaryConfigured', value: snap.incompleteSanitary.id },
      ], false, _guidedRequirementList(pending));
    }
    return _question('Listo', 'Sanitarios configurados', 'Los sanitarios cargados tienen posicion, dimensiones y confirmacion de ficha.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Agregar otro', action: 'sanitary' },
    ], true);
  }

  function _classroomDirectQuestion(room) {
    if (!_roomHasGeometry(room) || !_hasMeasures(room, 'length', 'width')) return null;
    const label = room?.name || 'Aula pendiente';
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.estado)) {
      return _question('Pregunta del aula', `${label}: estado general`, 'Responda el estado/calidad observado. La ficha queda solo para revisar o corregir despues.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::estado`, ['Bueno', 'Regular', 'Malo', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.caracteristicas) && !_hasAnswer(room?.openings)) {
      return _question('Pregunta del aula', `${label}: uso o condicion`, 'Registre la caracteristica principal del ambiente antes de seguir con puertas, ventanas e instalaciones.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::caracteristicas`, ['Uso regular', 'Uso compartido', 'Sin uso', 'Clausurada', 'En obra', 'Necesita reparacion'], 'Uso regular'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!_hasAnswer(room?.techo_tipo)) {
      return _question('Pregunta del aula', `${label}: tipo de techo o cubierta`, 'Registre el material o tipo de cubierta observado.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::techo_tipo`, ['Chapa', 'Teja', 'Losa', 'Fibrocemento', 'Mixto', 'No verificable'], 'Chapa'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.techo_estado)) {
      return _question('Pregunta del aula', `${label}: estado del techo`, 'Registre la calidad del techo: filtraciones, roturas, deformaciones o imposibilidad de verificar.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::techo_estado`, ['Bueno', 'Regular', 'Malo', 'Con filtraciones', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)) + _guidedRoomSectionPhotoHtml(room, 'techo'));
    }
    if (!_hasAnswer(room?.pared_material)) {
      return _question('Pregunta del aula', `${label}: material predominante de pared`, 'Pregunta MEC VF 24-03-26: registre el material principal de las paredes antes de evaluar daños visibles.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::pared_material`, ['Ladrillo/mamposteria', 'Madera', 'Chapa', 'Mixto', 'Otro', 'No verificable'], 'Ladrillo/mamposteria'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.pared_estado)) {
      return _question('Pregunta del aula', `${label}: estado de paredes`, 'Registre fisuras, grietas, deformidad, revoque desprendido, humedad o madera rota si corresponde.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::pared_estado`, ['Bueno', 'Regular', 'Fisuras/grietas', 'Humedad', 'Desprendimiento', 'Malo', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!_hasAnswer(room?.piso_tipo)) {
      return _question('Pregunta del aula', `${label}: tipo de piso`, 'Indique el material principal del piso del ambiente.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::piso_tipo`, ['Ceramico', 'Cemento alisado', 'Mosaico', 'Tierra', 'Madera', 'Otro', 'No verificable'], 'Ceramico'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.piso_estado)) {
      return _question('Pregunta del aula', `${label}: estado/calidad del piso`, 'Registre si el piso esta en buen estado, presenta desgaste, roturas, humedad o desniveles.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::piso_estado`, ['Bueno', 'Regular', 'Malo', 'Con roturas', 'Con humedad', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)) + _guidedRoomSectionPhotoHtml(room, 'piso'));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(room?.requiere_intervencion)) {
      return _question('Pregunta del aula', `${label}: requiere intervencion inmediata?`, 'Pregunta MEC VF 24-03-26: marque si el ambiente requiere intervencion y deje la ficha solo para ampliar observaciones.', [
        ..._fieldAnswerActions('answerClassroomField', `${room.id}::requiere_intervencion`, ['No', 'Si, programada', 'Si, inmediata', 'No verificable'], 'No'),
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)));
    }
    const object = _guidedPendingObjects(room?.objects || [])[0];
    if (object) return _roomObjectDirectQuestion(room, object);
    const nextDecision = _nextRoomElementDecision(room);
    if (nextDecision) return _roomElementDecisionQuestion(room, nextDecision);
    return null;
  }

  function _sanitaryDirectQuestion(item) {
    if (!_sanitaryHasGeometry(item) || !_hasMeasures(item, 'largo_m', 'ancho_m')) return null;
    const label = item?.codigo || 'Sanitario pendiente';
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(item?.estado)) {
      return _question('Pregunta del sanitario', `${label}: estado general`, 'Responda el estado/calidad observado del sanitario.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::estado`, ['Bueno', 'Regular', 'Malo', 'No operativo', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.uso)) {
      return _question('Pregunta del sanitario', `${label}: uso principal`, 'Indique para quien se usa principalmente este sanitario.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::uso`, ['Estudiantes', 'Docentes', 'Mixto', 'Administrativo', 'No operativo'], 'Estudiantes'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.genero)) {
      return _question('Pregunta del sanitario', `${label}: destino o genero`, 'Registre la senalizacion o destino principal observado.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::genero`, ['Ninas / mujeres', 'Ninos / varones', 'Mixto', 'Accesible', 'No senalizado'], 'Mixto'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.agua)) {
      return _question('Pregunta del sanitario', `${label}: disponibilidad de agua`, 'Indique si el sanitario cuenta con agua durante la verificacion.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::agua`, ['Si', 'Intermitente', 'No', 'No verificable'], 'Si'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.desague)) {
      return _question('Pregunta del sanitario', `${label}: conexion de desague`, 'Indique el tipo de descarga o conexion sanitaria registrada.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::desague`, ['Red cloacal', 'Camara septica', 'Pozo ciego', 'Letrina', 'Otro', 'No verificable'], 'Camara septica'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.techo_tipo)) {
      return _question('Pregunta del sanitario', `${label}: material predominante del techo`, 'Pregunta MEC VF 24-03-26: registre techo del sanitario antes de piso, paredes y artefactos.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::techo_tipo`, ['Chapa', 'Teja', 'Losa', 'Fibrocemento', 'Mixto', 'No verificable'], 'Chapa'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(item?.techo_estado)) {
      return _question('Pregunta del sanitario', `${label}: estado del techo`, 'Registre goteras, humedad, chapas rotas, corrosiones o defectos estructurales visibles.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::techo_estado`, ['Bueno', 'Regular', 'Malo', 'Con filtraciones', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.pared_material)) {
      return _question('Pregunta del sanitario', `${label}: material predominante de pared`, 'Registre el material principal de las paredes del sanitario.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::pared_material`, ['Ladrillo/mamposteria', 'Madera', 'Chapa', 'Mixto', 'Otro', 'No verificable'], 'Ladrillo/mamposteria'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(item?.pared_estado)) {
      return _question('Pregunta del sanitario', `${label}: estado de paredes`, 'Registre fisuras, grietas, humedad, desprendimiento de revoque o deformidad visible.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::pared_estado`, ['Bueno', 'Regular', 'Fisuras/grietas', 'Humedad', 'Desprendimiento', 'Malo', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!_hasAnswer(item?.piso_tipo)) {
      return _question('Pregunta del sanitario', `${label}: tipo de piso`, 'Indique el material principal del piso sanitario.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::piso_tipo`, ['Ceramico', 'Cemento alisado', 'Mosaico', 'Tierra', 'Antideslizante', 'Otro', 'No verificable'], 'Ceramico'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(item?.piso_estado)) {
      return _question('Pregunta del sanitario', `${label}: estado/calidad del piso`, 'Registre si el piso sanitario esta completo, roto, resbaladizo, con humedad o no verificable.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::piso_estado`, ['Bueno', 'Regular', 'Malo', 'Resbaladizo', 'Con humedad', 'No verificable'], 'Bueno'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    if (!TECHNICAL_REGISTER_MODE && !_hasAnswer(item?.requiere_intervencion)) {
      return _question('Pregunta del sanitario', `${label}: requiere intervencion inmediata?`, 'Pregunta MEC VF 24-03-26: deje registrada la prioridad de intervencion del sanitario.', [
        ..._fieldAnswerActions('answerSanitaryField', `${item.id}::requiere_intervencion`, ['No', 'Si, programada', 'Si, inmediata', 'No verificable'], 'No'),
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
    }
    const object = _guidedPendingObjects(item?.objects || [])[0];
    if (object) return _sanitaryObjectDirectQuestion(item, object);
    const nextDecision = _nextSanitaryElementDecision(item);
    if (nextDecision) return _sanitaryElementDecisionQuestion(item, nextDecision);
    return null;
  }

  function _roomElementDecisionQuestion(room, spec) {
    const label = room?.name || 'Aula pendiente';
    if (_isOpeningElementType(spec?.type) && _hasIrregularPlanShape(room)) {
      return _question('Pregunta del aula', `${label}: ${spec.question}`, 'Puertas y ventanas solo se ubican sobre paredes regulares. El aula tiene forma irregular, por eso primero debe convertirla a Rectangular o registrar que esa abertura no corresponde.', [
        { label: 'Poner aula rectangular', action: 'rectClassroom', value: room.id, primary: true },
        { label: spec.noLabel || `No tiene ${spec.label}`, action: 'markRoomElementAbsent', value: `${room.id}::${spec.type}` },
        { label: 'Seleccionar aula', action: 'selectPlanItem', value: `room::${room.id}` },
        { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
      ], false, _guidedRequirementList(_roomRequirementItems(room)), 'Las aberturas se ajustan a una pared recta del ambiente. Si necesita conservar una forma en L, registre la puerta/ventana en la pared regular disponible despues de volver el aula rectangular o marque la respuesta negativa y deje la aclaracion en ficha.');
    }
    return _question('Pregunta del aula', `${label}: ${spec.question}`, spec.help || 'La guia decide primero si el elemento existe; si existe, se agrega al plano y luego se preguntan sus caracteristicas.', [
      { label: spec.yesLabel || `Si, agregar ${spec.label}`, action: 'addGuidedRoomElement', value: `${room.id}::${spec.type}`, primary: true },
      { label: spec.noLabel || `No tiene ${spec.label}`, action: 'markRoomElementAbsent', value: `${room.id}::${spec.type}` },
      { label: 'Editar ficha', action: 'openClassroomFicha', value: room.id },
    ], false, _guidedRequirementList(_roomRequirementItems(room)));
  }

  function _sanitaryElementDecisionQuestion(item, spec) {
    const label = item?.codigo || 'Sanitario pendiente';
    if (_isOpeningElementType(spec?.type) && _hasIrregularPlanShape(item)) {
      return _question('Pregunta del sanitario', `${label}: ${spec.question}`, 'Puertas y ventanas solo se ubican sobre paredes regulares. El sanitario tiene forma irregular, por eso primero debe convertirlo a Rectangular o registrar que esa abertura no corresponde.', [
        { label: 'Poner sanitario rectangular', action: 'rectSanitary', value: item.id, primary: true },
        { label: spec.noLabel || `No tiene ${spec.label}`, action: 'markSanitaryElementAbsent', value: `${item.id}::${spec.type}` },
        { label: 'Seleccionar sanitario', action: 'selectPlanItem', value: `sanitary::${item.id}` },
        { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
      ], false, _guidedRequirementList(_sanitaryRequirementItems(item)), 'Las aberturas se ajustan a una pared recta del sanitario. En formas irregulares, primero regularice el contorno o registre que la abertura no corresponde.');
    }
    return _question('Pregunta del sanitario', `${label}: ${spec.question}`, spec.help || 'La guia decide primero si el elemento existe; si existe, se agrega al plano y luego se preguntan sus caracteristicas.', [
      { label: spec.yesLabel || `Si, agregar ${spec.label}`, action: 'addGuidedSanitaryElement', value: `${item.id}::${spec.type}`, primary: true },
      { label: spec.noLabel || `No tiene ${spec.label}`, action: 'markSanitaryElementAbsent', value: `${item.id}::${spec.type}` },
      { label: 'Editar ficha', action: 'openSanitaryFicha', value: item.id },
    ], false, _guidedRequirementList(_sanitaryRequirementItems(item)));
  }

  function _guidedObjectPhotoHtml(parentId, object, parentKind) {
    const count = (object?.ficha?.evidencias || []).length;
    const countText = count ? `${count} foto${count === 1 ? '' : 's'}` : 'Sin foto';
    const sParentId = String(parentId || '').replace(/['"\\\s]/g, '');
    const sObjId = String(object?.id || '').replace(/['"\\\s]/g, '');
    const inputId = `gphoto_${sParentId.slice(-8)}_${sObjId.slice(-8)}`;
    const onchange = parentKind === 'sanitary'
      ? `MecFormModule.setSanitaryObjectEvidence('${sParentId}', '${sObjId}', this); setTimeout(() => GuidedRegisterModule.syncFromPlan(), 700)`
      : `MecFormModule.addClassroomObjectEvidence('${sParentId}', '${sObjId}', this); setTimeout(() => GuidedRegisterModule.syncFromPlan(), 700)`;
    return `<div class="guided-photo-row"><input id="${inputId}" type="file" accept="image/*" capture="environment" multiple style="display:none" onchange="${onchange}"><button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('${inputId}')?.click()">Sacar foto</button><small class="guided-photo-count" data-guided-photo-count="${sObjId}">${countText}</small></div>`;
  }

  function _guidedRoomSectionPhotoHtml(room, section) {
    const normalized = section === 'piso' ? 'piso' : 'techo';
    const photos = normalized === 'piso' ? (room?.evidencias_piso || []) : (room?.evidencias_techo || []);
    const count = photos.length;
    const countText = count ? `${count} foto${count === 1 ? '' : 's'}` : 'Sin foto';
    const sRoomId = String(room?.id || '').replace(/['"\\\s]/g, '');
    const inputId = `gphoto_${sRoomId.slice(-8)}_${normalized}`;
    return `<div class="guided-photo-row"><input id="${inputId}" type="file" accept="image/*" capture="environment" multiple style="display:none" onchange="MecFormModule.addClassroomSectionEvidence('${sRoomId}', '${normalized}', this); setTimeout(() => GuidedRegisterModule.syncFromPlan(), 700)"><button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('${inputId}')?.click()">Sacar foto del ${normalized}</button><small class="guided-photo-count" data-guided-photo-count="${sRoomId}-${normalized}">${countText}</small></div>`;
  }

  function _roomObjectDirectQuestion(room, object) {
    const field = _nextGuidedObjectField(object);
    if (!field) return null;
    const valueBase = `${room.id}::${object.id}::${field}`;
    const planValue = _guidedPendingObjectPlanValue(room, object);
    return _question('Pregunta del elemento', `${_guidedObjectLabel(object)}: ${_guidedObjectFieldPrompt(object, field)}`, _guidedObjectFieldHelp(object, field), [
      ..._fieldAnswerActions('answerClassroomObjectField', valueBase, _guidedObjectFieldOptions(object, field), _guidedObjectFieldPrimary(object, field)),
      { label: 'Ubicar en plano', action: 'selectPlanItem', value: planValue },
      { label: 'Editar ficha', action: 'openClassroomObjectFicha', value: planValue },
    ], false, _guidedRequirementList(_guidedObjectRequirementItems(object)) + _guidedObjectPhotoHtml(room.id, object, 'classroom'));
  }

  function _sanitaryObjectDirectQuestion(item, object) {
    const field = _nextGuidedObjectField(object);
    if (!field) return null;
    const valueBase = `${item.id}::${object.id}::${field}`;
    const planValue = _guidedPendingObjectPlanValue(item, object, 'sanitary');
    return _question('Pregunta del elemento sanitario', `${_guidedObjectLabel(object)}: ${_guidedObjectFieldPrompt(object, field)}`, _guidedObjectFieldHelp(object, field), [
      ..._fieldAnswerActions('answerSanitaryObjectField', valueBase, _guidedObjectFieldOptions(object, field), _guidedObjectFieldPrimary(object, field)),
      { label: 'Ubicar en plano', action: 'selectPlanItem', value: planValue },
      { label: 'Editar ficha', action: 'openSanitaryObjectFicha', value: planValue },
    ], false, _guidedRequirementList(_guidedObjectRequirementItems(object)) + _guidedObjectPhotoHtml(item.id, object, 'sanitary'));
  }

  function _siteQuestion(snap) {
    const noSiteElements = _flagValue(_flagKeyParts(snap.activeBlock?.id || 'predio', 'exteriores', 'noSiteElements'));
    if (!snap.siteElements && !noSiteElements) {
      return _question('Pregunta obligatoria', 'Hay elementos exteriores o tecnicos por ubicar?', 'Agregue tanque, pozo, galeria, caminero, pilar u otros. Cada elemento debe quedar en el plano y con ficha confirmada.', [
        { label: 'Tanque', action: 'site', value: 'water_tank', primary: true },
        { label: 'Pozo/captacion', action: 'site', value: 'well' },
        { label: 'Galeria', action: 'site', value: 'gallery' },
        { label: 'Pilar', action: 'site', value: 'pillar' },
        { label: 'Rampa', action: 'site', value: 'ramp' },
        { label: 'Acometida', action: 'site', value: 'service_connection' },
        { label: 'Medidor', action: 'site', value: 'meter' },
        { label: 'Tablero', action: 'site', value: 'main_switchboard' },
        { label: 'No por ahora', action: 'markNoSiteElements' },
      ]);
    }
    if (noSiteElements) {
      return _question('Listo', 'Exteriores omitidos por ahora', 'La respuesta quedo registrada. Puede volver a pedir exteriores si encuentra elementos en el predio.', [
        { label: 'Agregar exterior', action: 'resetNoSiteElements', primary: true },
        { label: 'Siguiente', action: 'next' },
      ], true);
    }
    if (snap.incompleteSiteElement) {
      return _siteElementQuestion(snap.incompleteSiteElement, 'exteriores');
    }
    return _question('Listo', 'Exteriores configurados', 'Los elementos exteriores/tecnicos cargados estan ubicados y confirmados.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Agregar exterior', action: 'site', value: 'water_tank' },
      { label: 'Acometida', action: 'site', value: 'service_connection' },
    ], true);
  }

  function _closureQuestion(snap) {
    const status = snap.completion || { complete: false, pending: [] };
    const control = _closureControlHtml(status, snap.timeTracking);
    if (!status.complete) {
      return _question(
        'Revision final',
        `${status.pending.length} pendiente(s) antes del cierre`,
        'Todavia hay datos o confirmaciones por completar. Use el primer pendiente o valide el formulario antes de guardar el paquete final.',
        [
          _pendingAction(status.pending[0]),
          { label: 'Finalizar con pendientes', action: 'finalizePartial', variant: 'warning' },
          { label: 'Validar', action: 'validate' },
          { label: 'Guardar en Sheets ahora', action: 'syncSheets' },
          { label: 'Subir fotos Drive', action: 'syncEvidence' },
          { label: 'Datos en Sheets', action: 'workbook' },
        ].filter(Boolean),
        false,
        control,
        _storageInfoText(),
        true
      );
    }
    return _question(
      'Todo completo',
      'Sin pendientes detectados',
      'El relevamiento esta listo para cierre. Al guardar, se registra el paquete final, se muestra la confirmacion y la app vuelve al mapa con la siguiente escuela sugerida.',
      [
        { label: 'Finalizar escuela', action: 'finalizeComplete', variant: 'success', primary: true },
        { label: 'Guardar en Sheets ahora', action: 'syncSheets' },
        { label: 'Subir fotos Drive', action: 'syncEvidence' },
        { label: 'Ver PDF', action: 'pdf' },
        { label: 'Datos en Sheets', action: 'workbook' },
      ],
      true,
      control,
      _storageInfoText(),
      false
    );
  }

  function _pendingAction(item) {
    if (!item?.action) return null;
    return {
      label: item.action === 'selectPlanItem' ? 'Ir al pendiente' : 'Resolver primero',
      action: item.action,
      value: item.value || '',
      primary: true,
    };
  }

  function _goClosure() {
    goTo(STEPS.findIndex(step => step.id === 'cierre'));
    _refreshSoon();
  }

  function _closureControlHtml(status, timeTracking = {}) {
    const pending = (status.pending || []).slice(0, 8);
    const pendingHtml = pending.length
      ? `<ul class="guided-requirements guided-closure-list" aria-label="Pendientes finales">
          ${pending.map(item => `
            <li>
              <span aria-hidden="true">!</span>
              <strong>${_escape(item.scope)} - ${_escape(item.title)}</strong>
              <small>${_escape(item.detail || 'Pendiente de cierre')}</small>
            </li>`).join('')}
          ${(status.pending || []).length > pending.length ? `<li class="guided-requirements__item--optional"><span aria-hidden="true">i</span><strong>Mas pendientes</strong><small>${(status.pending || []).length - pending.length} item(s) adicionales.</small></li>` : ''}
        </ul>`
      : `<ul class="guided-requirements guided-closure-list" aria-label="Sin pendientes finales">
          <li class="guided-requirements__item--done">
            <span aria-hidden="true">&#10003;</span>
            <strong>Relevamiento completo</strong>
            <small>No quedan pendientes obligatorios en escuela, bloques, pisos, ambientes, sanitarios ni exteriores.</small>
          </li>
        </ul>`;
    return `
      ${pendingHtml}
      ${_timePanelHtml(timeTracking)}
      <div class="guided-storage-map" aria-label="Mapa de guardado">
        <strong>Donde quedan guardados los datos</strong>
        <span><b>Dispositivo</b> borrador local por escuela para continuar sin perder carga.</span>
        <span><b>Google Sheets</b> mec_borradores guarda lo cargado; escuelas_seleccionadas muestra estado; evidencias fotos; entregas_cierre cierre final.</span>
        <span><b>Drive / correo</b> PDF final y metadatos enviados a ${_escape(typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.FINAL_REPORT_EMAIL || '' : '')}.</span>
        <button class="btn btn-outline btn-sm" type="button" data-guided-action="syncEvidence">Subir fotos pendientes a Drive</button>
      </div>`;
  }

  function _storageInfoText() {
    return 'El boton Datos en Sheets abre el libro de Google Sheets. Durante la carga, revise mec_borradores: ahi queda una fila por escuela con resumen y JSON del borrador. escuelas_seleccionadas muestra estado general; evidencias lista fotos subidas a Drive; entregas_cierre registra cada cierre completo con enlaces al PDF y metadatos.';
  }

  function _siteElementQuestion(item, origin = 'exteriores') {
    const label = item?.ficha?.codigo || item?.ficha?.subtipo || _siteElementTypeLabel(item?.type) || 'Elemento pendiente';
    const pending = _siteElementRequirementItems(item);
    const next = _firstPendingRequirement(pending);
    if (next?.title === 'Cargar dimensiones') {
      return _question(
        origin === 'bloque' ? 'Elemento automatico pendiente' : 'Elemento pendiente',
        `${label}: medidas principales`,
        'Cargue las medidas desde la guia. Tambien puede ajustar el tamano en el plano; la ficha queda como edicion secundaria.',
        [
          { label: _siteElementHasMeasures(item) ? 'Confirmar medidas' : 'Guardar medidas', action: 'saveSiteMeasures', value: item.id, primary: true },
          { label: 'Seleccionar en plano', action: 'selectPlanItem', value: `site::${item.id}` },
          { label: 'Editar ficha', action: 'openSiteFicha', value: item.id },
        ],
        false,
        _siteMeasureControl(item),
        '',
        true
      );
    }
    if (!TECHNICAL_REGISTER_MODE && next?.title === 'Condicion de calidad') {
      return _question(
        origin === 'bloque' ? 'Elemento automatico pendiente' : 'Elemento pendiente',
        `${label}: estado general`,
        'Registre la condicion observada desde la guia superior.',
        [
          ..._fieldAnswerActions('answerSiteElementField', `${item.id}::estado`, ['Bueno', 'Regular', 'Malo', 'No operativo', 'No verificable'], 'Bueno'),
          { label: 'Seleccionar en plano', action: 'selectPlanItem', value: `site::${item.id}` },
          { label: 'Editar ficha', action: 'openSiteFicha', value: item.id },
        ],
        false,
        _guidedRequirementList(pending)
      );
    }
    if (next?.title === 'Caracteristicas tecnicas') {
      const key = _siteElementCharacteristicKey(item?.type);
      return _question(
        origin === 'bloque' ? 'Elemento automatico pendiente' : 'Elemento pendiente',
        `${label}: caracteristica tecnica`,
        'Registre la caracteristica principal del elemento antes de confirmarlo.',
        [
          ..._fieldAnswerActions('answerSiteElementField', `${item.id}::${key}`, _siteElementCharacteristicOptions(item?.type), _siteElementCharacteristicOptions(item?.type)[0]),
          { label: 'Seleccionar en plano', action: 'selectPlanItem', value: `site::${item.id}` },
          { label: 'Editar ficha', action: 'openSiteFicha', value: item.id },
        ],
        false,
        _guidedRequirementList(pending)
      );
    }
    return _question(
      origin === 'bloque' ? 'Elemento automatico pendiente' : 'Elemento pendiente',
      `${label}: ${next?.title || 'confirmar guardado'}`,
      next?.help || 'Revise la guia y confirme el guardado para habilitar la siguiente pregunta.',
      [
        { label: next?.plan ? 'Seleccionar en plano' : 'Editar ficha', action: next?.plan ? 'selectPlanItem' : 'openSiteFicha', value: next?.plan ? `site::${item.id}` : item.id, primary: true },
        { label: 'Editar ficha', action: 'openSiteFicha', value: item.id },
        { label: 'Confirmar configuracion', action: 'confirmSiteConfigured', value: item.id },
      ],
      false,
      _guidedRequirementList(pending)
    );
  }

  function _question(kicker, title, body, actions = [], done = false, control = '', info = '', blocking) {
    return {
      kicker,
      title,
      body,
      actions,
      done,
      control,
      info,
      blocking: blocking === undefined ? !done : Boolean(blocking),
    };
  }

  function _firstPendingRequirement(items = []) {
    return (items || []).find(item => !item.done && !item.optional) || null;
  }

  function _guidedRequirementList(items = []) {
    if (!items.length) return '';
    const done = items.filter(item => item.done);
    const pending = items.filter(item => !item.done);
    const total = items.length;
    const firstPending = pending[0] || null;
    const visiblePending = pending.slice(0, 2);
    const doneLabel = done.length
      ? `<li class="guided-requirements__item--done guided-requirements__item--summary"><span aria-hidden="true">&#10003;</span><strong>${done.length}/${total}</strong><small>${_escape(firstPending ? `Siguiente: ${firstPending.title}` : 'Todo completo')}</small></li>`
      : '';
    const pendingRows = visiblePending.map((item, index) => `
      <li class="${item.optional ? 'guided-requirements__item--optional' : ''}">
        <span aria-hidden="true">${item.optional ? 'i' : '!'}</span>
        <strong>${_escape(item.title)}</strong>
        ${index === 0 ? `<small>${_escape(`${item.optional ? 'Recomendado: ' : ''}${item.help || 'Pendiente'}`)}</small>` : ''}
      </li>`).join('');
    const moreRow = pending.length > visiblePending.length
      ? `<li class="guided-requirements__item--optional guided-requirements__item--summary"><span aria-hidden="true">+</span><strong>${pending.length - visiblePending.length}</strong><small>pendiente(s) adicional(es)</small></li>`
      : '';
    return `
      <ul class="guided-requirements" aria-label="Pendientes del elemento">
        ${doneLabel}${pendingRows}${moreRow}
      </ul>`;
  }

  function _blockRequirementItems(block) {
    return [
      {
        title: 'Cargar dimensiones',
        help: 'Complete largo y ancho del bloque. Si los ajusta estirando vertices en el plano, confirme la medida aqui antes de avanzar.',
        doneText: `${block?.largo_m || '?'} x ${block?.ancho_m || '?'} m confirmados`,
        done: _hasMeasures(block, 'largo_m', 'ancho_m') && _measureConfirmed('block', block?.id || 'active'),
        field: 'medidas_bloque',
      },
      {
        title: 'Caracteristicas / observacion',
        help: 'Agregue una referencia tecnica breve si hace falta: uso, nombre local, relacion con otro bloque o dato de gabinete.',
        doneText: 'Referencia registrada',
        done: _hasAnswer(block?.observacion || block?.observaciones),
        optional: true,
      },
    ];
  }

  function _floorRequirementItems(floor) {
    return [
      {
        title: 'Ubicar en plano',
        help: 'Seleccione el piso y colocalo dentro del bloque antes de continuar.',
        doneText: 'Tiene posicion en el bloque',
        done: _hasPosition(floor),
        plan: true,
      },
      {
        title: 'Cargar dimensiones',
        help: 'Complete largo y ancho del piso desde la guia o estirando sus vertices en el plano. Luego confirme la medida.',
        doneText: `${floor?.largo_m || '?'} x ${floor?.ancho_m || '?'} m confirmados`,
        done: _hasMeasures(floor, 'largo_m', 'ancho_m') && _measureConfirmed('floor', floor?.id || _floorLabel(floor)),
      },
      {
        title: 'Caracteristicas / observacion',
        help: 'Agregue una referencia tecnica breve si hay particularidades de ubicacion, forma o medicion.',
        doneText: 'Referencia registrada',
        done: _hasAnswer(floor?.observacion || floor?.observaciones),
        optional: true,
      },
    ];
  }

  function _roomRequirementItems(room) {
    return [
      {
        title: 'Ubicar en plano',
        help: 'Seleccione el ambiente, arrastrelo al lugar correcto y ajuste sus vertices si corresponde.',
        doneText: 'Tiene geometria en el plano',
        done: _roomHasGeometry(room),
        plan: true,
      },
      {
        title: 'Cargar dimensiones',
        help: 'Complete largo y ancho desde la guia superior o estirando el ambiente sobre el plano. Luego confirme la medida.',
        doneText: `${room?.length || '?'} x ${room?.width || '?'} m confirmados`,
        done: _hasMeasures(room, 'length', 'width') && _measureConfirmed('room', room?.id),
      },
      {
        title: 'Techo del ambiente',
        help: 'Registre el tipo del techo o cubierta desde la pregunta superior.',
        doneText: room?.techo_tipo || 'Techo registrado',
        done: _hasAnswer(room?.techo_tipo),
      },
      {
        title: 'Paredes del ambiente',
        help: 'Registre el material predominante de paredes.',
        doneText: room?.pared_material || 'Paredes registradas',
        done: _hasAnswer(room?.pared_material),
      },
      {
        title: 'Piso del ambiente',
        help: 'Registre el tipo de piso del ambiente.',
        doneText: room?.piso_tipo || 'Piso registrado',
        done: _hasAnswer(room?.piso_tipo),
      },
      {
        title: 'Responder elementos del aula',
        help: _roomElementDecisionHelp(room),
        doneText: 'Puertas, ventanas e instalaciones basicas respondidas',
        done: _roomElementDecisionsComplete(room),
      },
      {
        title: 'Completar elementos declarados',
        help: _guidedPendingObjectsHelp(room?.objects || [], 'aula'),
        doneText: 'Puertas, ventanas y objetos declarados tienen ficha revisada',
        done: _guidedPendingObjects(room?.objects || []).length === 0,
        plan: true,
        value: _guidedPendingObjectPlanValue(room, _guidedPendingObjects(room?.objects || [])[0]),
      },
    ];
  }

  function _sanitaryRequirementItems(item) {
    return [
      {
        title: 'Ubicar en plano',
        help: 'Seleccione el sanitario, ubiquelo dentro del piso y ajuste sus vertices si corresponde.',
        doneText: 'Tiene geometria en el plano',
        done: _sanitaryHasGeometry(item),
        plan: true,
      },
      {
        title: 'Cargar dimensiones',
        help: 'Complete largo y ancho desde la guia superior o estirando el sanitario sobre el plano. Luego confirme la medida.',
        doneText: `${item?.largo_m || '?'} x ${item?.ancho_m || '?'} m confirmados`,
        done: _hasMeasures(item, 'largo_m', 'ancho_m') && _measureConfirmed('sanitary', item?.id),
      },
      {
        title: 'Conexion sanitaria y uso',
        help: 'Complete uso principal, genero/destino, agua y desague desde preguntas superiores sucesivas.',
        doneText: [item?.uso, item?.genero, item?.agua, item?.desague].filter(Boolean).join(' / ') || 'Conexion cargada',
        done: _hasAnswer(item?.uso) && _hasAnswer(item?.genero) && _hasAnswer(item?.agua) && _hasAnswer(item?.desague),
      },
      {
        title: 'Techo sanitario',
        help: 'Registre material del techo del sanitario.',
        doneText: item?.techo_tipo || 'Techo registrado',
        done: _hasAnswer(item?.techo_tipo),
      },
      {
        title: 'Paredes sanitarias',
        help: 'Registre material predominante de paredes del sanitario.',
        doneText: item?.pared_material || 'Paredes registradas',
        done: _hasAnswer(item?.pared_material),
      },
      {
        title: 'Piso sanitario',
        help: 'Registre tipo de piso del sanitario.',
        doneText: item?.piso_tipo || 'Piso registrado',
        done: _hasAnswer(item?.piso_tipo),
      },
      {
        title: 'Responder elementos del sanitario',
        help: _sanitaryElementDecisionHelp(item),
        doneText: 'Aberturas y artefactos basicos respondidos',
        done: _sanitaryElementDecisionsComplete(item),
      },
      {
        title: 'Completar elementos declarados',
        help: _guidedPendingObjectsHelp(item?.objects || [], 'sanitario'),
        doneText: 'Aberturas y artefactos declarados tienen ficha revisada',
        done: _guidedPendingObjects(item?.objects || []).length === 0,
        plan: true,
        value: _guidedPendingObjectPlanValue(item, _guidedPendingObjects(item?.objects || [])[0], 'sanitary'),
      },
    ];
  }

  function _guidedPendingObjects(objects = []) {
    return (objects || [])
      .filter(object => object && !['room', 'sanitary-room', 'wall', 'pencil'].includes(object.type))
      .filter(object => !_guidedObjectConfigured(object));
  }

  function _guidedObjectConfigured(object = {}) {
    if (!object || !object.ficha || object.ficha.__guidedRequired !== 'true') return true;
    if (!object.ficha.__guidedReviewed) return false;
    return _guidedObjectRequiredFields(object).every(key => _hasAnswer(object.ficha?.[key]));
  }

  function _guidedObjectRequiredFields(object = {}) {
    if (object.type === 'door') return ['subtipo', 'abre_hacia', 'bisagra'];
    if (object.type === 'damage') return ['subtipo', 'estado'];
    if (object.type === 'stall') return ['subtipo', 'puerta'];
    return ['subtipo'];
  }

  function _guidedPendingObjectsHelp(objects = [], scope = 'elemento') {
    const pending = _guidedPendingObjects(objects);
    if (!pending.length) return 'Los elementos declarados ya tienen ficha revisada.';
    const object = pending[0];
    return `Responda en la tarjeta superior los datos de ${_guidedObjectLabel(object)}: tipo, ubicacion tecnica y, si corresponde, apertura/bisagra o dano/falla. La ficha queda como edicion rapida si necesita corregir detalles del ${scope}.`;
  }

  function _guidedObjectLabel(object = {}) {
    const ficha = object.ficha || {};
    const label = ficha.codigo || object.type || 'elemento';
    const kind = {
      door: 'puerta',
      window: 'ventana',
      outlet: 'toma',
      switchboard: 'tablero',
      light: 'luz',
      fan: 'ventilador',
      ac: 'aire acondicionado',
      damage: 'falla/grieta',
      toilet: 'inodoro',
      sink: 'lavamanos',
      urinal: 'urinario',
      shower: 'ducha',
      stall: 'cabina',
      text: 'nota',
      stair: 'escalera',
    }[object.type] || object.type || 'elemento';
    return `${kind} ${label}`.trim();
  }

  function _guidedPendingObjectPlanValue(parent, object, kind = 'room') {
    if (!parent || !object?.id) return '';
    if (kind === 'sanitary') return `sanitary::${parent.id}::${object.id}`;
    return `${parent.id}::${object.id}`;
  }

  function _roomElementDecisionSequence() {
    return [
      { type: 'door', label: 'puerta', question: 'Tiene puerta?', yesLabel: 'Si, agregar puerta', noLabel: 'No tiene puerta' },
      { type: 'window', label: 'ventana', question: 'Tiene ventana?', yesLabel: 'Si, agregar ventana', noLabel: 'No tiene ventana' },
      { type: 'outlet', label: 'toma', question: 'Tiene toma electrica?', yesLabel: 'Si, agregar toma', noLabel: 'No tiene toma' },
      { type: 'switchboard', label: 'tablero', question: 'Tiene tablero o llave visible?', yesLabel: 'Si, agregar tablero', noLabel: 'No tiene tablero' },
      { type: 'light', label: 'luz', question: 'Tiene luz o foco?', yesLabel: 'Si, agregar luz', noLabel: 'No tiene luz' },
      { type: 'fan', label: 'ventilador', question: 'Tiene ventilador?', yesLabel: 'Si, agregar ventilador', noLabel: 'No tiene ventilador' },
      { type: 'ac', label: 'aire acondicionado', question: 'Tiene aire acondicionado?', yesLabel: 'Si, agregar aire', noLabel: 'No tiene aire' },
      { type: 'board', label: 'pizarron', question: 'Tiene pizarron?', yesLabel: 'Si, agregar pizarron', noLabel: 'No tiene pizarron' },
      { type: 'stair', label: 'escalera interna', question: 'Tiene escalera interna o desnivel relevante?', yesLabel: 'Si, agregar escalera', noLabel: 'No tiene escalera interna' },
      { type: 'text', label: 'nota', question: 'Necesita una nota o rotulo especial?', yesLabel: 'Si, agregar nota', noLabel: 'Sin nota especial' },
      { type: 'damage', label: 'falla/grieta', question: 'Hay falla, grieta o dano visible?', yesLabel: 'Si, marcar falla', noLabel: 'Sin falla visible' },
    ];
  }

  function _sanitaryElementDecisionSequence() {
    return [
      { type: 'stall', label: 'cabina', question: 'Tiene cabina sanitaria?', yesLabel: 'Si, agregar cabina', noLabel: 'No tiene cabina' },
      { type: 'door', label: 'puerta', question: 'Tiene puerta?', yesLabel: 'Si, agregar puerta', noLabel: 'No tiene puerta' },
      { type: 'window', label: 'ventana', question: 'Tiene ventana o ventilacion?', yesLabel: 'Si, agregar ventana', noLabel: 'No tiene ventana' },
      { type: 'toilet', label: 'inodoro', question: 'Tiene inodoro?', yesLabel: 'Si, agregar inodoro', noLabel: 'No tiene inodoro' },
      { type: 'sink', label: 'lavamanos', question: 'Tiene lavamanos?', yesLabel: 'Si, agregar lavamanos', noLabel: 'No tiene lavamanos' },
      { type: 'urinal', label: 'urinario', question: 'Tiene urinario?', yesLabel: 'Si, agregar urinario', noLabel: 'No tiene urinario' },
      { type: 'shower', label: 'ducha', question: 'Tiene ducha?', yesLabel: 'Si, agregar ducha', noLabel: 'No tiene ducha' },
      { type: 'outlet', label: 'toma', question: 'Tiene toma electrica?', yesLabel: 'Si, agregar toma', noLabel: 'No tiene toma' },
      { type: 'switchboard', label: 'tablero', question: 'Tiene tablero o llave visible?', yesLabel: 'Si, agregar tablero', noLabel: 'No tiene tablero' },
      { type: 'light', label: 'luz', question: 'Tiene luz o foco?', yesLabel: 'Si, agregar luz', noLabel: 'No tiene luz' },
      { type: 'fan', label: 'ventilador', question: 'Tiene ventilador?', yesLabel: 'Si, agregar ventilador', noLabel: 'No tiene ventilador' },
      { type: 'ac', label: 'aire acondicionado', question: 'Tiene aire acondicionado?', yesLabel: 'Si, agregar aire', noLabel: 'No tiene aire' },
      { type: 'damage', label: 'falla/grieta', question: 'Hay falla, grieta o dano visible?', yesLabel: 'Si, marcar falla', noLabel: 'Sin falla visible' },
    ];
  }

  function _nextRoomElementDecision(room) {
    return _roomElementDecisionSequence().find(spec => !_roomElementDecisionDone(room, spec.type)) || null;
  }

  function _nextSanitaryElementDecision(item) {
    return _sanitaryElementDecisionSequence().find(spec => !_sanitaryElementDecisionDone(item, spec.type)) || null;
  }

  function _roomElementDecisionsComplete(room) {
    return !_nextRoomElementDecision(room);
  }

  function _sanitaryElementDecisionsComplete(item) {
    return !_nextSanitaryElementDecision(item);
  }

  function _roomElementDecisionHelp(room) {
    const next = _nextRoomElementDecision(room);
    return next
      ? `Pendiente responder: ${next.question}`
      : 'Ya se respondieron los elementos basicos del aula.';
  }

  function _sanitaryElementDecisionHelp(item) {
    const next = _nextSanitaryElementDecision(item);
    return next
      ? `Pendiente responder: ${next.question}`
      : 'Ya se respondieron las aberturas y artefactos basicos del sanitario.';
  }

  function _roomElementDecisionDone(room, type) {
    return _hasObjectOfType(room?.objects || [], type) || _flagValue(_roomElementDecisionKey(room, type));
  }

  function _sanitaryElementDecisionDone(item, type) {
    return _hasObjectOfType(item?.objects || [], type) || _flagValue(_sanitaryElementDecisionKey(item, type));
  }

  function _hasObjectOfType(objects = [], type = '') {
    return (objects || []).some(object => object?.type === type);
  }

  function _isOpeningElementType(type = '') {
    return ['door', 'window'].includes(type);
  }

  function _hasIrregularPlanShape(record = {}) {
    return Array.isArray(record?.planShape?.points) && record.planShape.points.length >= 3;
  }

  function _roomElementDecisionKey(room, type) {
    return _flagKeyParts(`room:${room?.id || ''}`, _normalizeFloorLabel(room?.floor || 'Piso 1'), `elementAbsent:${type}`);
  }

  function _sanitaryElementDecisionKey(item, type) {
    return _flagKeyParts(`sanitary:${item?.id || ''}`, _normalizeFloorLabel(item?.planta || 'Piso 1'), `elementAbsent:${type}`);
  }

  function _fieldAnswerActions(action, baseValue, options = [], primary = '') {
    return (options || []).map(option => ({
      label: option,
      action,
      value: `${baseValue}::${option}`,
      suggested: primary ? option === primary : false,
    }));
  }

  function _nextGuidedObjectField(object = {}) {
    const fields = _guidedObjectRequiredFields(object);
    return fields.find(field => !_hasAnswer(object.ficha?.[field])) || (!object.ficha?.__guidedReviewed ? fields[0] : '');
  }

  function _guidedObjectRequirementItems(object = {}) {
    return _guidedObjectRequiredFields(object).map(field => ({
      title: _guidedObjectFieldPrompt(object, field),
      help: 'Responder desde la tarjeta superior. La ficha queda disponible para correcciones.',
      doneText: object.ficha?.[field] || 'Respondido',
      done: _hasAnswer(object.ficha?.[field]),
    }));
  }

  function _guidedObjectFieldPrompt(object = {}, field = '') {
    if (field === 'subtipo') return `tipo de ${_guidedObjectKind(object)}`;
    if (field === 'estado') return object.type === 'damage' ? 'grado de dano/falla' : 'detalle tecnico';
    if (field === 'abre_hacia') return 'sentido de apertura';
    if (field === 'bisagra') return 'lado de bisagra';
    if (field === 'puerta') return 'puerta de cabina';
    return field.replace(/_/g, ' ');
  }

  function _guidedObjectFieldHelp(object = {}, field = '') {
    const kind = _guidedObjectKind(object);
    if (field === 'subtipo') return `Indique el tipo observado de ${kind}. Despues podra ubicarlo o ajustar detalles desde la ficha.`;
    if (field === 'estado') return object.type === 'damage' ? `Registre el grado del dano/falla de ${kind}.` : `Registre el detalle tecnico de ${kind}.`;
    if (field === 'abre_hacia') return 'Defina si la puerta abre hacia el interior o exterior. Tambien puede usar el boton Apertura para invertirla visualmente.';
    if (field === 'bisagra') return 'Indique el lado de giro de la hoja para representar la apertura con mas precision.';
    if (field === 'puerta') return 'Registre si la cabina tiene puerta.';
    return 'Responda la opcion observada para continuar con la guia.';
  }

  function _guidedObjectFieldPrimary(object = {}, field = '') {
    if (field === 'estado') return ['damage'].includes(object.type) ? 'Leve' : '';
    if (field === 'abre_hacia') return 'Interior';
    if (field === 'bisagra') return 'Inicio';
    if (field === 'puerta') return 'Con puerta';
    return _guidedObjectFieldOptions(object, field)[0] || '';
  }

  function _guidedObjectFieldOptions(object = {}, field = '') {
    if (field === 'estado') {
      if (object.type === 'damage') return ['Leve', 'Moderado', 'Severo', 'Riesgo inmediato'];
      return ['Bueno', 'Regular', 'Malo', 'No funciona', 'No verificable'];
    }
    if (field === 'abre_hacia') return ['Interior', 'Exterior', 'Corrediza', 'No verificable'];
    if (field === 'bisagra') return ['Inicio', 'Fin', 'No verificable'];
    if (field === 'puerta') return ['Con puerta', 'Sin puerta', 'No verificable'];
    if (field !== 'subtipo') return ['Si', 'No', 'No verificable'];
    return {
      door: ['Con puerta madera', 'Con puerta metalica', 'Con puerta PVC', 'Doble hoja', 'Corrediza', 'Reja', 'Sin hoja', 'Otro', 'No verificable'],
      window: ['Corrediza', 'Batiente', 'Vidrio fijo', 'Persiana', 'Sin vidrio', 'No verificable'],
      outlet: ['Simple', 'Doble', 'Con tierra', 'Sin tapa', 'No verificable'],
      switchboard: ['Tablero seccional', 'Tablero principal', 'Caja abierta', 'Sin rotulo', 'No verificable'],
      light: ['Foco LED', 'Tubo fluorescente', 'Panel', 'Artefacto colgante', 'No verificable'],
      fan: ['Techo', 'Pared', 'Pie', 'Extractor', 'No verificable'],
      ac: ['Split', 'Ventana', 'Cassette', 'Portatil', 'No verificable'],
      damage: ['Fisura', 'Humedad', 'Rotura', 'Desprendimiento', 'Instalacion expuesta', 'Otro'],
      board: ['Tiza', 'Marcador', 'Mixto', 'No tiene', 'No verificable'],
      stair: ['Recta', 'Con descanso', 'Caracol', 'Rampa/escalera', 'No verificable'],
      text: ['Rotulo', 'Nota tecnica', 'Observacion', 'Advertencia', 'Otro'],
      toilet: ['Inodoro pedestal', 'Inodoro turco', 'Con cisterna', 'Sin cisterna', 'No verificable'],
      sink: ['Lavamanos individual', 'Lavatorio multiple', 'Canilla exterior', 'Sin canilla', 'No verificable'],
      urinal: ['Individual', 'Canaleta', 'Seco', 'No verificable'],
      shower: ['Ducha comun', 'Ducha electrica', 'Sin flor', 'No verificable'],
      stall: ['Cabina completa', 'Cabina parcial', 'Sin particion', 'No verificable'],
    }[object.type] || ['General', 'Otro', 'No verificable'];
  }

  function _guidedObjectKind(object = {}) {
    return {
      door: 'puerta',
      window: 'ventana',
      outlet: 'toma',
      switchboard: 'tablero',
      light: 'luz',
      fan: 'ventilador',
      ac: 'aire acondicionado',
      damage: 'falla/grieta',
      board: 'pizarron',
      stair: 'escalera',
      text: 'nota',
      stall: 'cabina',
      toilet: 'inodoro',
      sink: 'lavamanos',
      urinal: 'urinario',
      shower: 'ducha',
    }[object.type] || 'elemento';
  }

  function _guidedElementActionLabel(type = '') {
    return {
      door: 'Puerta',
      window: 'Ventana',
      outlet: 'Toma electrica',
      switchboard: 'Tablero',
      light: 'Luz',
      fan: 'Ventilador',
      ac: 'Aire acondicionado',
      damage: 'Falla/grieta',
      board: 'Pizarron',
      stair: 'Escalera',
      text: 'Nota',
      stall: 'Cabina',
      toilet: 'Inodoro',
      sink: 'Lavamanos',
      urinal: 'Urinario',
      shower: 'Ducha',
    }[type] || 'Elemento';
  }

  function _siteElementRequirementItems(item) {
    const ficha = item?.ficha || {};
    const isPillar = item?.type === 'pillar';
    const isPropertyBoundary = _isPropertyBoundaryElement(item);
    const isNonBlockingReference = isPillar || isPropertyBoundary;
    return [
      {
        title: 'Ubicar en plano',
        help: 'Seleccione el elemento, arrastrelo a su lugar real y ajuste el tamano si corresponde.',
        doneText: 'Tiene posicion y tamano en el plano',
        done: _siteElementHasPlanRect(item),
        plan: true,
      },
      {
        title: 'Cargar dimensiones',
        help: 'Complete las medidas propias del elemento, o estire sus vertices para sincronizarlas con la ficha.',
        doneText: `${_siteElementDimensionText(item)} confirmadas`,
        done: _siteElementHasMeasures(item) && _measureConfirmed('site', item?.id),
        optional: isNonBlockingReference,
      },
      {
        title: 'Caracteristicas tecnicas',
        help: 'Complete el campo tecnico principal que corresponde a este tipo de elemento.',
        doneText: _siteElementCharacteristicText(item),
        done: _siteElementHasCharacteristic(item),
        optional: isNonBlockingReference,
      },
    ];
  }

  function _guidedQuestionCard(question) {
    const info = _guidedQuestionInfo(question);
    return `
      <section class="guided-next-card guided-next-card--question ${question.done ? 'guided-next-card--done' : ''}" aria-label="Pregunta guiada">
        <span>${_escape(question.kicker)}</span>
        <strong>${_escape(_guidedQuestionTitle(question))}</strong>
        <p>${_escape(question.body)}</p>
        ${question.control || ''}
        <div>
          ${question.actions.map(action => `
            <button class="btn ${_guidedActionButtonClass(action)} btn-sm" type="button"
              data-guided-action="${_escape(action.action)}"
              data-guided-value="${_escape(action.value || '')}">
              ${_escape(action.label)}
            </button>`).join('')}
        </div>
        <details class="guided-info-note">
          <summary><span aria-hidden="true">i</span><strong>Ayuda de campo y verificacion</strong></summary>
          <p>${_escape(info)}</p>
        </details>
      </section>`;
  }

  function _guidedQuestionTitle(question = {}) {
    const title = String(question.title || '').trim();
    if (!title || question.done || title.startsWith('¿') || title.endsWith('?')) return title;
    return `¿${title}?`;
  }

  function _guidedActionButtonClass(action = {}) {
    if (action.selected || action.done || action.active) return 'btn-guided-selected';
    return 'btn-guided-soft';
  }

  function _guidedQuestionInfo(question = {}) {
    if (question.info) return question.info;
    if (question.done) {
      return 'Este punto ya esta completo para avanzar. Puede volver a abrir la ficha o el plano si necesita corregir datos antes de exportar o sincronizar.';
    }
    return 'La captura principal se realiza en esta tarjeta superior, paso a paso. Use el plano para ubicar o dimensionar y deje la ficha como herramienta secundaria para revisar o corregir informacion ya declarada.';
  }

  function _numberControl(name, label, min = '0', value = '') {
    return `
      <label class="guided-question-control">
        <span>${_escape(label)}</span>
        <input class="form-control" type="number" min="${_escape(min)}" step="1" value="${_escape(value)}" data-${_escape(name)}>
      </label>`;
  }

  function _schoolIdentityControl(snap = {}) {
    const school = snap.school || {};
    const field = (name, label, value = '', type = 'text', attrs = '') => `
      <label class="guided-school-field">
        <span>${_escape(label)}</span>
        <input class="form-control" type="${_escape(type)}" value="${_escape(value)}" data-guided-school-${_escape(name)} ${attrs}>
      </label>`;
    return `
      <div class="guided-school-identity">
        ${field('code', 'Codigo/local', school.code)}
        ${field('name', 'Nombre de escuela', school.name)}
        ${field('department', 'Departamento', school.departamento)}
        ${field('district', 'Distrito', school.distrito)}
        ${field('locality', 'Localidad', school.localidad)}
        ${field('address', 'Direccion/referencia', school.direccion)}
        ${field('lat', 'Latitud', school.latitud, 'number', 'step="0.000001"')}
        ${field('lng', 'Longitud', school.longitud, 'number', 'step="0.000001"')}
      </div>`;
  }

  function _measureControl(name, lengthLabel, widthLabel, lengthValue = '', widthValue = '') {
    return `
      <div class="guided-question-fields guided-question-fields--pair">
        <label class="guided-question-control">
          <span>${_escape(lengthLabel)}</span>
          <input class="form-control" type="number" min="0" step="0.1" value="${_escape(lengthValue)}" data-${_escape(name)}-length>
        </label>
        <label class="guided-question-control">
          <span>${_escape(widthLabel)}</span>
          <input class="form-control" type="number" min="0" step="0.1" value="${_escape(widthValue)}" data-${_escape(name)}-width>
        </label>
      </div>`;
  }

  function _siteMeasureControl(item = {}) {
    const ficha = item?.ficha || {};
    if (['water_tank', 'well', 'pillar'].includes(item?.type)) {
      const label = item.type === 'pillar' ? 'Diametro/lado (m)' : 'Diametro (m)';
      const value = ficha.diametro_m || ficha.lado_m || ficha.ancho_m || ficha.largo_m || '';
      return _numberControl('guided-site-diameter', label, '0', value);
    }
    return _measureControl(
      'guided-site',
      'Largo/longitud (m)',
      'Ancho (m)',
      ficha.largo_m || ficha.longitud_m || '',
      ficha.ancho_m || ''
    );
  }

  function _readSchoolIdentityFields() {
    const root = document.getElementById('guided-register-root') || document;
    const value = key => root.querySelector(`[data-guided-school-${key}]`)?.value?.trim() || '';
    return {
      codigo_local: value('code'),
      nombre: value('name'),
      departamento: value('department'),
      distrito: value('district'),
      localidad: value('locality'),
      direccion: value('address'),
      latitud: value('lat'),
      longitud: value('lng'),
    };
  }

  function _saveSchoolIdentity() {
    const fields = _readSchoolIdentityFields();
    if (!fields.codigo_local && !fields.nombre) {
      UI.showToast('Confirme al menos codigo o nombre de la escuela antes de continuar.', 'warning', 6200);
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.updateGuidedSchoolIdentity) {
      UI.showToast('No se pudo guardar la identificacion desde la guia.', 'warning');
      return;
    }
    if (!mec.updateGuidedSchoolIdentity(fields, { render: false })) return;
    const snap = _snapshot();
    _setFlag(_schoolIdentityFlagKey({
      code: fields.codigo_local || snap.school.code,
      name: fields.nombre || snap.school.name,
    }), true);
    _saveState();
    _refreshSoon();
    UI.showToast('Datos basicos de escuela confirmados. Ahora posicione la ubicacion y guarde la georreferencia.', 'success', 5200);
  }

  function _resetSchoolIdentity() {
    const snap = _snapshot();
    _setFlag(_schoolIdentityFlagKey(snap.school), false);
    _saveState();
    _updateSnapshot();
    UI.showToast('La identificacion de la escuela se pedira nuevamente.', 'info', 4200);
  }

  async function _resetSchoolData() {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.resetSchoolRegistration) {
      UI.showToast('No se pudo reiniciar la escuela desde esta version.', 'warning');
      return;
    }
    const ok = await mec.resetSchoolRegistration({ remote: true });
    if (!ok) return;
    _guidedState = { targets: {}, flags: {} };
    _guidedHistory = [];
    _guidedQuestionHistory = [];
    _guidedReviewQuestion = null;
    _activeIndex = 0;
    _saveState();
    _updateSlide();
    _updateSnapshot();
  }

  function _addPropertyBoundary() {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.ensurePropertyBoundary) {
      UI.showToast('No se pudo crear el perimetro del predio desde esta version.', 'warning');
      return;
    }
    const element = mec.ensurePropertyBoundary({ guided: true });
    if (!element?.id) {
      UI.showToast('No se pudo ubicar el perimetro del predio.', 'warning');
      return;
    }
    _setFlag(_propertyBoundaryFlagKey(element), false);
    _saveState();
    mec.focusSelectedPlanItem?.('Ajuste el perimetro igual que un aula: Forma L, + Vertice y arrastre de puntos numerados. Luego confirme desde la pregunta superior.');
    _refreshSoon();
    UI.showToast('Perimetro agregado. Use la misma logica de aulas: Forma L, + Vertice y puntos arrastrables.', 'success', 6200);
  }

  function _currentPropertyBoundary(value = '') {
    const id = String(value || '').replace(/^site::/, '').trim();
    const snap = _snapshot();
    const item = id
      ? (snap.values?.__siteElements || []).find(current => current.id === id)
      : (snap.propertyBoundary || _propertyBoundaryElement(snap.values?.__siteElements || []));
    return item?.id ? item : null;
  }

  function _selectPropertyBoundary(value = '') {
    const item = _currentPropertyBoundary(value);
    if (!item) {
      UI.showToast('Primero dibuje el perimetro del predio.', 'warning', 5200);
      return;
    }
    _selectPlanItem(`site::${item.id}`);
  }

  function _setPropertyBoundaryShape(value = '', shape = 'polygon') {
    const item = _currentPropertyBoundary(value);
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!item?.id || !mec?.setPlanSiteElementShape) {
      UI.showToast('Primero seleccione el perimetro del predio.', 'warning', 5200);
      return;
    }
    mec.setPlanSiteElementShape(item.id, shape);
    _setFlag(_propertyBoundaryFlagKey(item), false);
    _saveState();
    _refreshSoon();
  }

  function _addPropertyBoundaryVertex(value = '') {
    const item = _currentPropertyBoundary(value);
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!item?.id || !mec?.addPlanSiteElementVertex) {
      UI.showToast('Primero dibuje o seleccione el perimetro del predio.', 'warning', 5200);
      return;
    }
    mec.addPlanSiteElementVertex(item.id);
    _setFlag(_propertyBoundaryFlagKey(item), false);
    _saveState();
    _refreshSoon();
    UI.showToast('Vertice agregado al perimetro. Arrastre el punto numerado hasta el borde real del predio.', 'success', 4200);
  }

  function _removePropertyBoundaryVertex(value = '') {
    const item = _currentPropertyBoundary(value);
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!item?.id || !mec?.removePlanSiteElementVertex) {
      UI.showToast('Primero dibuje o seleccione el perimetro del predio.', 'warning', 5200);
      return;
    }
    mec.removePlanSiteElementVertex(item.id);
    _setFlag(_propertyBoundaryFlagKey(item), false);
    _saveState();
    _refreshSoon();
    UI.showToast('Vertice retirado del perimetro. Confirme otra vez cuando el contorno quede correcto.', 'info', 4200);
  }

  function _confirmPropertyBoundary() {
    const snap = _snapshot();
    const item = snap.propertyBoundary || _propertyBoundaryElement(snap.values?.__siteElements || []);
    if (!item?.id) {
      UI.showToast('Primero dibuje el perimetro del predio.', 'warning', 5200);
      return;
    }
    if (!_siteElementHasPlanRect(item)) {
      _selectPlanItem(`site::${item.id}`);
      UI.showToast('Ajuste el perimetro en el plano antes de confirmarlo.', 'warning', 5200);
      return;
    }
    _setFlag(_propertyBoundaryFlagKey(item), true);
    _saveState();
    _refreshSoon(400);
    UI.showToast('Perimetro aproximado del predio confirmado. Ahora continue con bloques.', 'success', 5200);
  }

  function _setClassroomRect(roomId) {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!roomId || !mec?.setPlanClassroomShape) {
      UI.showToast('No se pudo regularizar la forma del aula.', 'warning');
      return;
    }
    mec.setPlanClassroomShape(roomId, 'rect');
    _refreshSoon();
    UI.showToast('Aula convertida a forma rectangular. Ahora puede agregar puertas o ventanas sobre paredes regulares.', 'success', 5200);
  }

  function _setSanitaryRect(sanitaryId) {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!sanitaryId || !mec?.setPlanSanitaryShape) {
      UI.showToast('No se pudo regularizar la forma del sanitario.', 'warning');
      return;
    }
    mec.setPlanSanitaryShape(sanitaryId, 'rect');
    _refreshSoon();
    UI.showToast('Sanitario convertido a forma rectangular. Ahora puede agregar puertas o ventanas sobre paredes regulares.', 'success', 5200);
  }

  function _saveBlockMeasures() {
    const lengthInput = document.querySelector('[data-guided-block-length]');
    const widthInput = document.querySelector('[data-guided-block-width]');
    const length = Number(lengthInput?.value);
    const width = Number(widthInput?.value);
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      UI.showToast('Ingrese largo y ancho validos del bloque antes de continuar.', 'warning', 6200);
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.setGuidedBlockField) {
      UI.showToast('No se pudo guardar las medidas del bloque desde la guia.', 'warning');
      return;
    }
    let okLength = false;
    let okWidth = false;
    try { okLength = mec.setGuidedBlockField('largo_m', String(length)); } catch (e) { console.warn('[Guided] Error largo bloque:', e); }
    try { okWidth = mec.setGuidedBlockField('ancho_m', String(width)); } catch (e) { console.warn('[Guided] Error ancho bloque:', e); }
    if (okLength && okWidth) {
      _setMeasureConfirmed('block', _snapshot().activeBlock?.id || 'active', true);
      _saveState();
      UI.showToast('Medidas del bloque registradas. Ahora complete su estado y ubiquelo en el plano.', 'success', 5200);
      _updateSnapshot();
      _refreshSoon(400);
    } else if (!okLength || !okWidth) {
      UI.showToast('No se pudo guardar las medidas. Verifique que el bloque este activo y desbloqueado.', 'warning', 6000);
    }
  }

  function _saveFloorMeasures(payload = '') {
    const [blockId, floorId] = String(payload || '').split('::');
    const lengthInput = document.querySelector('[data-guided-floor-length]');
    const widthInput = document.querySelector('[data-guided-floor-width]');
    const length = Number(lengthInput?.value);
    const width = Number(widthInput?.value);
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      UI.showToast('Ingrese largo y ancho validos del piso antes de continuar.', 'warning', 6200);
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.setGuidedFloorField) {
      UI.showToast('No se pudo guardar las medidas del piso desde la guia.', 'warning');
      return;
    }
    let okLength = false;
    let okWidth = false;
    try { okLength = mec.setGuidedFloorField(blockId, floorId, 'largo_m', String(length)); } catch (e) { console.warn('[Guided] Error largo piso:', e); }
    try { okWidth = mec.setGuidedFloorField(blockId, floorId, 'ancho_m', String(width)); } catch (e) { console.warn('[Guided] Error ancho piso:', e); }
    if (okLength && okWidth) {
      const snappedFloors = _snapshot().activeFloors || [];
      const floor = snappedFloors.find(item =>
        String(item.id || '') === String(floorId || '') ||
        String(item.label || '') === String(floorId || '')
      ) || snappedFloors[0] || {};
      _setMeasureConfirmed('floor', floor.id || _floorLabel(floor) || floorId, true);
      _saveState();
      UI.showToast('Medidas del piso registradas. Ahora complete su estado y ubicacion.', 'success', 5200);
      _updateSnapshot();
      _refreshSoon(400);
    } else if (!okLength || !okWidth) {
      UI.showToast('No se pudo guardar las medidas del piso. Verifique que el bloque/piso este activo.', 'warning', 6000);
    }
  }

  function _resetFloorMeasures(payload = '') {
    const [, floorId] = String(payload || '').split('::');
    const snap = _snapshot();
    const floor = (snap.activeFloors || []).find(f => f.id === floorId || _floorLabel(f) === floorId) || snap.activeFloors?.[0];
    const floorKey = floor?.id || floorId || _floorLabel(floor || {});
    _setMeasureConfirmed('floor', floorKey, false);
    _saveState();
    UI.showToast('Ingrese las medidas correctas del piso.', 'info', 3500);
    _refreshSoon(200);
  }

  function _saveClassroomMeasures(roomId = '') {
    const lengthInput = document.querySelector('[data-guided-room-length]');
    const widthInput = document.querySelector('[data-guided-room-width]');
    const length = Number(lengthInput?.value);
    const width = Number(widthInput?.value);
    if (!roomId || !Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      UI.showToast('Ingrese largo y ancho validos del aula o ambiente antes de continuar.', 'warning', 6200);
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.setGuidedClassroomField) {
      UI.showToast('No se pudo guardar las medidas del aula desde la guia.', 'warning');
      return;
    }
    const okLength = mec.setGuidedClassroomField(roomId, 'length', String(length));
    const okWidth = mec.setGuidedClassroomField(roomId, 'width', String(width));
    if (okLength && okWidth) {
      _setMeasureConfirmed('room', roomId, true);
      _saveState();
      UI.showToast('Medidas del ambiente registradas. Ahora complete estado, uso y elementos.', 'success', 5200);
      _refreshSoon();
    }
  }

  function _saveSanitaryMeasures(sanitaryId = '') {
    const lengthInput = document.querySelector('[data-guided-sanitary-length]');
    const widthInput = document.querySelector('[data-guided-sanitary-width]');
    const length = Number(lengthInput?.value);
    const width = Number(widthInput?.value);
    if (!sanitaryId || !Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      UI.showToast('Ingrese largo y ancho validos del sanitario antes de continuar.', 'warning', 6200);
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.setGuidedSanitaryField) {
      UI.showToast('No se pudo guardar las medidas del sanitario desde la guia.', 'warning');
      return;
    }
    const okLength = mec.setGuidedSanitaryField(sanitaryId, 'largo_m', String(length));
    const okWidth = mec.setGuidedSanitaryField(sanitaryId, 'ancho_m', String(width));
    if (okLength && okWidth) {
      _setMeasureConfirmed('sanitary', sanitaryId, true);
      _saveState();
      UI.showToast('Medidas del sanitario registradas. Ahora complete uso, estado, agua y artefactos.', 'success', 5200);
      _refreshSoon();
    }
  }

  function _saveClassroomTarget() {
    const input = document.querySelector('[data-guided-classroom-target]');
    const target = Math.floor(Number(input?.value));
    if (!Number.isFinite(target) || target < 0) {
      UI.showToast('Ingrese una cantidad valida de aulas.', 'warning');
      return;
    }
    const snap = _snapshot();
    if (!snap.classroomTargetKey) {
      UI.showToast('Primero seleccione un bloque y un piso.', 'warning');
      return;
    }
    _guidedState.targets = _guidedState.targets || {};
    _guidedState.targets[snap.classroomTargetKey] = target;
    _saveState();
    _updateSnapshot();
    UI.showToast(`Cantidad registrada: ${target} aula(s).`, 'success', 3600);
  }

  function _resetClassroomTarget() {
    const snap = _snapshot();
    if (snap.classroomTargetKey && _guidedState.targets) delete _guidedState.targets[snap.classroomTargetKey];
    _saveState();
    _updateSnapshot();
    UI.showToast('La cantidad de aulas se pedira nuevamente.', 'info');
  }

  function _answerBlockField(payload) {
    const [fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    if (!fieldId || !value) return;
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.setGuidedBlockField) {
      UI.showToast('No se pudo registrar la respuesta guiada.', 'warning');
      return;
    }
    if (mec.setGuidedBlockField(fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _answerFloorField(payload) {
    const [blockId, floorId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!blockId || !floorId || !fieldId || !value || !mec?.setGuidedFloorField) {
      UI.showToast('No se pudo registrar la respuesta del piso.', 'warning');
      return;
    }
    if (mec.setGuidedFloorField(blockId, floorId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _saveSiteMeasures(siteId = '') {
    const snap = _snapshot();
    const item = snap.activeSiteElements.find(element => element.id === siteId) || snap.incompleteSiteElement;
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!item || !mec?.setGuidedSiteElementField) {
      UI.showToast('No se pudo guardar las medidas del elemento exterior.', 'warning');
      return;
    }
    if (['water_tank', 'well', 'pillar'].includes(item.type)) {
      const input = document.querySelector('[data-guided-site-diameter]');
      const value = Number(input?.value);
      if (!Number.isFinite(value) || value <= 0) {
        UI.showToast('Ingrese una medida valida antes de continuar.', 'warning', 6200);
        return;
      }
      const key = item.type === 'pillar' && String(item.ficha?.forma_pilar || '').toLowerCase().includes('cuadr')
        ? 'lado_m'
        : 'diametro_m';
      if (mec.setGuidedSiteElementField(item.id, key, String(value))) {
        _setMeasureConfirmed('site', item.id, true);
        _saveState();
        _refreshSoon();
      }
      return;
    }
    const lengthInput = document.querySelector('[data-guided-site-length]');
    const widthInput = document.querySelector('[data-guided-site-width]');
    const length = Number(lengthInput?.value);
    const width = Number(widthInput?.value);
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      UI.showToast('Ingrese largo/longitud y ancho validos antes de continuar.', 'warning', 6200);
      return;
    }
    const okLength = mec.setGuidedSiteElementField(item.id, item.type === 'walkway' ? 'longitud_m' : 'largo_m', String(length));
    const okWidth = mec.setGuidedSiteElementField(item.id, 'ancho_m', String(width));
    if (okLength && okWidth) {
      _setMeasureConfirmed('site', item.id, true);
      _saveState();
      _refreshSoon();
    }
  }

  function _answerSiteElementField(payload) {
    const [siteId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!siteId || !fieldId || !value || !mec?.setGuidedSiteElementField) {
      UI.showToast('No se pudo registrar la respuesta exterior.', 'warning');
      return;
    }
    if (mec.setGuidedSiteElementField(siteId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _answerClassroomField(payload) {
    const [roomId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!roomId || !fieldId || !value || !mec?.setGuidedClassroomField) {
      UI.showToast('No se pudo registrar la respuesta del aula.', 'warning');
      return;
    }
    if (mec.setGuidedClassroomField(roomId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _answerClassroomObjectField(payload) {
    const [roomId, objectId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!roomId || !objectId || !fieldId || !value || !mec?.setGuidedClassroomObjectField) {
      UI.showToast('No se pudo registrar la respuesta del elemento.', 'warning');
      return;
    }
    if (mec.setGuidedClassroomObjectField(roomId, objectId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _answerSanitaryField(payload) {
    const [sanitaryId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!sanitaryId || !fieldId || !value || !mec?.setGuidedSanitaryField) {
      UI.showToast('No se pudo registrar la respuesta del sanitario.', 'warning');
      return;
    }
    if (mec.setGuidedSanitaryField(sanitaryId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _answerSanitaryObjectField(payload) {
    const [sanitaryId, objectId, fieldId, ...rest] = String(payload || '').split('::');
    const value = rest.join('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!sanitaryId || !objectId || !fieldId || !value || !mec?.setGuidedSanitaryObjectField) {
      UI.showToast('No se pudo registrar la respuesta del elemento sanitario.', 'warning');
      return;
    }
    if (mec.setGuidedSanitaryObjectField(sanitaryId, objectId, fieldId, value)) _refreshSoon(ANSWER_FEEDBACK_DELAY_MS);
  }

  function _addGuidedRoomElement(payload) {
    const [roomId, type] = String(payload || '').split('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!roomId || !type || !mec?.selectPlanItem || !mec?.addPlanClassroomElement) {
      UI.showToast('No se pudo agregar el elemento del aula.', 'warning');
      return;
    }
    mec.selectPlanItem(`room::${roomId}`);
    const added = mec.addPlanClassroomElement(type, { guided: true });
    if (added === false || added === null) {
      _refreshSoon();
      return;
    }
    mec.focusSelectedPlanItem?.(`${_guidedElementActionLabel(type)} insertado. Ubíquelo en el plano; al soltarlo, vuelva a la pregunta superior para completar sus datos.`);
    _refreshSoon();
  }

  function _markRoomElementDecision(payload, exists) {
    const [roomId, type] = String(payload || '').split('::');
    const snap = _snapshot();
    const room = (snap.values?.__classrooms || []).find(item => item.id === roomId);
    if (!room || !type) return;
    _setFlag(_roomElementDecisionKey(room, type), !exists);
    _saveState();
    setTimeout(() => _updateSnapshot(), ANSWER_FEEDBACK_DELAY_MS);
    UI.showToast('Respuesta registrada. Continue con la siguiente pregunta.', 'success', 3200);
  }

  function _addGuidedSanitaryElement(payload) {
    const [sanitaryId, type] = String(payload || '').split('::');
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!sanitaryId || !type || !mec?.selectPlanItem) {
      UI.showToast('No se pudo agregar el elemento sanitario.', 'warning');
      return;
    }
    mec.selectPlanItem(`sanitary::${sanitaryId}`);
    let added = null;
    if (type === 'stall' && mec.addPlanSanitaryStall) {
      added = mec.addPlanSanitaryStall({ guided: true });
    } else if (['toilet', 'sink', 'urinal', 'shower'].includes(type) && mec.addPlanSanitaryFixture) {
      added = mec.addPlanSanitaryFixture(type, { guided: true });
    } else if (['door', 'window'].includes(type) && mec.addPlanSanitaryOpening) {
      added = mec.addPlanSanitaryOpening(type, { guided: true });
    } else if (mec.addPlanSanitaryElement) {
      added = mec.addPlanSanitaryElement(type, { guided: true });
    }
    if (added === false) {
      _refreshSoon();
      return;
    }
    mec.focusSelectedPlanItem?.(`${_guidedElementActionLabel(type)} insertado. Ubíquelo en el plano; al soltarlo, vuelva a la pregunta superior para completar sus datos.`);
    _refreshSoon();
  }

  function _markSanitaryElementDecision(payload, exists) {
    const [sanitaryId, type] = String(payload || '').split('::');
    const snap = _snapshot();
    const item = (snap.values?.__sanitaries || []).find(current => current.id === sanitaryId);
    if (!item || !type) return;
    _setFlag(_sanitaryElementDecisionKey(item, type), !exists);
    _saveState();
    setTimeout(() => _updateSnapshot(), ANSWER_FEEDBACK_DELAY_MS);
    UI.showToast('Respuesta registrada. Continue con la siguiente pregunta.', 'success', 3200);
  }

  function _selectPlanItem(value = '') {
    const id = String(value || '').trim();
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!id || !mec?.selectPlanItem) {
      UI.showToast('No se pudo seleccionar el elemento en el plano.', 'warning');
      return;
    }
    mec.selectPlanItem(id);
    _refreshSoon();
  }

  function _openClassroomObjectFicha(value = '') {
    const id = String(value || '').trim();
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!id || !mec?.selectPlanItem || !mec?.openSelectedSketchFicha) {
      UI.showToast('No se pudo abrir la ficha del elemento.', 'warning');
      return;
    }
    mec.selectPlanItem(id);
    setTimeout(() => {
      try { mec.openSelectedSketchFicha(); } catch { /* non-fatal */ }
    }, 80);
  }

  function _openSanitaryObjectFicha(value = '') {
    const id = String(value || '').trim();
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!id || !mec?.selectPlanItem || !mec?.openSelectedSanitaryObjectFicha) {
      UI.showToast('No se pudo abrir la ficha del elemento sanitario.', 'warning');
      return;
    }
    mec.selectPlanItem(id);
    setTimeout(() => {
      try { mec.openSelectedSanitaryObjectFicha(); } catch { /* non-fatal */ }
    }, 80);
  }

  function _setScopedFlag(name, value, message = '') {
    const snap = _snapshot();
    const blockId = name === 'noSiteElements' ? (snap.activeBlock?.id || 'predio') : snap.activeBlock?.id;
    const floor = name === 'noSiteElements' ? 'exteriores' : snap.activeFloorLabel;
    const key = _flagKeyParts(blockId, floor, name);
    _setFlag(key, value);
    _saveState();
    setTimeout(() => _updateSnapshot(), ANSWER_FEEDBACK_DELAY_MS);
    if (message) UI.showToast(message, value ? 'success' : 'info');
  }

  function _confirmClassroomConfigured(roomId = '') {
    const snap = _snapshot();
    const room = snap.activeClassrooms.find(item => item.id === roomId) || snap.incompleteClassroom;
    if (!room) {
      UI.showToast('No hay aula pendiente para confirmar.', 'warning');
      return;
    }
    const missing = _missingRequirementTitles(_roomRequirementItems(room));
    if (missing) {
      UI.showToast(`Falta completar: ${missing}.`, 'warning', 6200);
      return;
    }
    _setFlag(_flagKeyParts(room.blockId || snap.activeBlock?.id, _normalizeFloorLabel(room.floor || snap.activeFloorLabel), `classroomConfigured:${room.id}`), true);
    if (typeof MecFormModule !== 'undefined' && MecFormModule.finishClassroomTimer) {
      MecFormModule.finishClassroomTimer(room.id);
    }
    _saveState();
    _updateSnapshot();
    UI.showToast(`${room.name || 'Aula'} confirmada.`, 'success');
  }

  function _confirmSanitaryConfigured(sanitaryId = '') {
    const snap = _snapshot();
    const item = snap.activeSanitaries.find(sanitary => sanitary.id === sanitaryId) || snap.incompleteSanitary;
    if (!item) {
      UI.showToast('No hay sanitario pendiente para confirmar.', 'warning');
      return;
    }
    const missing = _missingRequirementTitles(_sanitaryRequirementItems(item));
    if (missing) {
      UI.showToast(`Falta completar: ${missing}.`, 'warning', 6200);
      return;
    }
    _setFlag(_flagKeyParts(item.bloque || snap.activeBlock?.id, _normalizeFloorLabel(item.planta || snap.activeFloorLabel), `sanitaryConfigured:${item.id}`), true);
    if (typeof MecFormModule !== 'undefined' && MecFormModule.finishSanitaryTimer) {
      MecFormModule.finishSanitaryTimer(item.id);
    }
    _saveState();
    _updateSnapshot();
    UI.showToast(`${item.codigo || 'Sanitario'} confirmado.`, 'success');
  }

  function _confirmSiteConfigured(siteId = '') {
    const snap = _snapshot();
    const item = snap.activeSiteElements.find(element => element.id === siteId) || snap.incompleteSiteElement;
    if (!item) {
      UI.showToast('No hay elemento exterior pendiente para confirmar.', 'warning');
      return;
    }
    const missing = _missingRequirementTitles(_siteElementRequirementItems(item));
    if (missing) {
      UI.showToast(`Falta completar: ${missing}.`, 'warning', 6200);
      return;
    }
    _setFlag(_flagKeyParts('predio', 'exteriores', `siteConfigured:${item.id}`), true);
    if (typeof MecFormModule !== 'undefined' && MecFormModule.finishSiteElementTimer) {
      MecFormModule.finishSiteElementTimer(item.id);
    }
    _saveState();
    _updateSnapshot();
    UI.showToast(`${item.ficha?.codigo || 'Elemento exterior'} confirmado.`, 'success');
  }

  async function _finalizeCompleteRegistration(options = {}) {
    const snap = _snapshot();
    const pendingCount = snap.completion?.pending?.length || 0;
    if (!snap.completion?.complete && !options.allowPending) {
      UI.showToast(`Todavia hay ${pendingCount} pendiente(s) antes de cerrar.`, 'warning', 7000);
      goTo(STEPS.findIndex(step => step.id === 'cierre'));
      return;
    }
    if (!snap.completion?.complete && options.allowPending) {
      const confirmed = await UI.showConfirm(
        'Finalizar con pendientes',
        `Todavia hay ${pendingCount} pendiente(s). Se guardara el paquete final en entregas_cierre como cierre con pendientes y la escuela quedara finalizada para seguimiento.`
      );
      if (!confirmed) return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.buildFinalDeliveryPackage) {
      UI.showToast('No se pudo preparar el paquete final desde el motor del plano.', 'error');
      return;
    }
    UI.showToast('Finalizando escuela... guardando cierre, jornada y evidencias.', 'info', 9000);
    const packageData = mec.buildFinalDeliveryPackage(snap.completion);
    if (mec.syncDraftToSheets) {
      await mec.syncDraftToSheets('cierre_final', { silent: true, force: true }).catch(err => {
        console.warn('[Registro guiado] No se pudo sincronizar borrador MEC antes del cierre:', err);
      });
    }
    const payload = _finalDeliveryPayload(snap, packageData);
    let result = null;
    try {
      if (typeof API === 'undefined' || !API.guardarCierreCompleto) throw new Error('Endpoint de cierre no disponible.');
      result = await API.guardarCierreCompleto(payload);
      if (result?.status && result.status !== 'ok') throw new Error(result.message || 'El servidor rechazo el cierre completo.');
      const data = result?.data || {};
      _saveFinalDeliveryState(snap, data, result);
      if (result?.queued || data.offline) {
        UI.showToast('Cierre completo guardado localmente. Se enviara PDF/metadatos cuando vuelva la conexion.', 'warning', 8000);
      } else if (data.email_status === 'enviado') {
        UI.showToast('Cierre completo guardado. PDF y metadatos enviados por correo.', 'success', 7200);
      } else {
        UI.showToast('Cierre completo guardado. Revise la hoja entregas_cierre para confirmar el estado del correo.', 'warning', 8200);
      }
    } catch (err) {
      console.error('[Registro guiado] No se pudo enviar el cierre completo:', err);
      _saveFinalDeliveryState(snap, { email_status: 'pendiente_local', error: err.message }, null);
      UI.showToast('No se pudo enviar al servidor ahora. El PDF se abre igual y el cierre queda anotado localmente.', 'warning', 8200);
    } finally {
      await _closeSurveySessionAfterFinalDelivery(snap, pendingCount);
      const nextSchool = _returnToMapAfterFinalDelivery(snap);
      _showFinalDeliveryMessage(snap, nextSchool, pendingCount);
      _refreshSoon();
    }
  }

  function _returnToMapAfterFinalDelivery(snap) {
    const selectedSchool = snap.values?.__selectedSchool || {};
    const currentSchool = {
      ...selectedSchool,
      id_escuela: selectedSchool.id_escuela || selectedSchool.id || snap.school?.code || '',
      codigo_local: selectedSchool.codigo_local || selectedSchool.codigo || snap.school?.code || '',
      nombre: selectedSchool.nombre || selectedSchool.nombre_escuela || snap.school?.name || '',
      code: snap.school?.code || '',
    };
    if (typeof MapModule !== 'undefined' && MapModule.showNextAfterFinalized) {
      return MapModule.showNextAfterFinalized(currentSchool);
    }
    if (typeof AppController !== 'undefined' && AppController.showModule) AppController.showModule('mapa');
    return null;
  }

  function _showFinalDeliveryMessage(snap, nextSchool, pendingCount = 0) {
    const schoolName = snap.school?.name || snap.values?.__selectedSchool?.nombre || 'la escuela';
    const nextName = nextSchool
      ? `${nextSchool.nombre || nextSchool.nombre_escuela || 'Escuela'}${nextSchool.codigo_local ? ` (${nextSchool.codigo_local})` : ''}`
      : '';
    const html = `
      <div class="guided-final-message">
        <p><strong>${_escape(schoolName)} quedo finalizada.</strong></p>
        <p>${pendingCount ? `Se cerro con ${pendingCount} pendiente(s) declarado(s), sin perder trazabilidad.` : 'Excelente trabajo: el paquete final quedo registrado y trazable.'}</p>
        ${nextName
          ? `<p>La app ya te lleva al mapa y enfoca la siguiente escuela sugerida: <strong>${_escape(nextName)}</strong>.</p>`
          : '<p>La app ya vuelve al mapa. No quedan escuelas pendientes asignadas visibles para este usuario.</p>'}
        <p>Respire un segundo, sincronice si hace falta y continue con la siguiente visita.</p>
      </div>`;
    if (typeof UI !== 'undefined' && UI.showHtmlAlert) {
      UI.showHtmlAlert('Escuela finalizada', html, 'success');
    } else {
      UI.showToast('Escuela finalizada. Volviendo al mapa con la siguiente sugerencia.', 'success', 9000);
    }
  }

  async function _closeSurveySessionAfterFinalDelivery(snap, pendingCount = 0) {
    if (typeof SurveyModule === 'undefined' || !SurveyModule.closeActiveSessionFromGuided) return;
    if (SurveyModule.getState?.() !== 'in_progress') return;
    const result = await SurveyModule.closeActiveSessionFromGuided({
      estado: 'finalizada',
      observacion_cierre: pendingCount
        ? `Cierre desde Registro guiado con ${pendingCount} pendiente(s) declarados.`
        : 'Cierre completo desde Registro guiado.',
      ultimo_registro_externo: 'Registro guiado CIALPA',
      calidad_cierre: pendingCount ? 'cierre_con_pendientes_confirmado' : 'completo_confirmado',
    }).catch(err => ({ status: 'error', message: err.message }));
    if (result?.status === 'error') {
      UI.showToast(`El cierre final se guardo, pero la sesion operativa no pudo cerrarse: ${result.message || 'error desconocido'}.`, 'warning', 7600);
    }
  }

  async function _syncDraftToSheets() {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.syncDraftToSheets) {
      UI.showToast('El guardado en Sheets no esta disponible en esta version.', 'warning', 6500);
      return;
    }
    await mec.syncDraftToSheets('manual', { silent: false }).catch(() => null);
  }

  async function _syncEvidenceToDrive() {
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.syncPendingEvidenceUploads) {
      UI.showToast('La sincronizacion de fotos no esta disponible en esta version.', 'warning', 5200);
      return;
    }
    await mec.syncPendingEvidenceUploads({ manual: true, silent: false }).catch(err => {
      UI.showToast(`No se pudieron subir las fotos: ${err.message}`, 'warning', 7200);
    });
    _refreshSoon();
  }

  function _finalDeliveryPayload(snap, packageData) {
    const values = packageData?.values || snap.values || {};
    const selectedSchool = values.__selectedSchool || {};
    const session = typeof Auth !== 'undefined' && Auth.getSession ? Auth.getSession() : {};
    const recipient = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.FINAL_REPORT_EMAIL || '' : '';
    const idEscuela = selectedSchool.id_escuela || selectedSchool.id || snap.school.code || '';
    const codigoLocal = selectedSchool.codigo_local || selectedSchool.codigo || snap.school.code || '';
    const now = new Date().toISOString();
    return {
      clientMutationId: _deliveryMutationId(idEscuela || codigoLocal, now),
      id_escuela: idEscuela,
      codigo_local: codigoLocal,
      nombre_escuela: selectedSchool.nombre || selectedSchool.nombre_escuela || snap.school.name || '',
      destinatario_email: recipient,
      asunto_email: `CIALPA cierre completo - ${snap.school.code || codigoLocal || 'sin codigo'} - ${snap.school.name || 'escuela'}`,
      generated_at: now,
      usuario_cliente: session?.usuario || '',
      completion: snap.completion,
      metadata: packageData?.metadata || {},
      resumen: {
        escuela: snap.school,
        conteos: snap.completion?.counts || {},
        timeTracking: packageData?.metadata?.timeTracking || snap.timeTracking || {},
        guardado_local: snap.savedAtText || '',
        version: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.VERSION : '',
      },
      values,
      planModel: packageData?.planModel || {},
      evidenceIndex: packageData?.evidenceIndex || [],
      pdfHtml: packageData?.pdfHtml || '',
    };
  }

  function _deliveryMutationId(id, iso) {
    const clean = String(id || 'sin-escuela').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60);
    return `ENT-${clean}-${String(iso || Date.now()).replace(/[^0-9TZ]+/g, '').slice(0, 20)}`;
  }

  function _saveFinalDeliveryState(snap, data = {}, result = null) {
    const payload = {
      savedAt: new Date().toISOString(),
      school: snap.school,
      complete: Boolean(snap.completion?.complete),
      pending: snap.completion?.pending || [],
      result: result ? { status: result.status, message: result.message || '', queued: Boolean(result.queued) } : null,
      data,
    };
    localStorage.setItem(_finalDeliveryStateKey(snap.school), JSON.stringify(payload));
  }

  function _finalDeliveryStateKey(school = {}) {
    const id = school.code || school.name || 'sin-escuela';
    return `cialpa_final_delivery_v1::${String(id).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 80)}`;
  }

  function _roomConfigured(room) {
    if (!_roomReady(room)) return false;
    return _flagValue(_flagKeyParts(room.blockId, _normalizeFloorLabel(room.floor || 'Piso 1'), `classroomConfigured:${room.id}`));
  }

  function _floorReady(floor) {
    return _floorRequirementItems(floor).every(item => item.done || item.optional);
  }

  function _roomReady(room) {
    return _roomRequirementItems(room).every(item => item.done || item.optional);
  }

  function _roomHasGeometry(room) {
    return (room?.objects || []).some(object => (
      object.type === 'room' &&
      Number(object.w || 0) > 0 &&
      Number(object.h || 0) > 0 &&
      Number.isFinite(Number(object.x)) &&
      Number.isFinite(Number(object.y))
    ));
  }

  function _sanitaryConfigured(item) {
    if (!_sanitaryReady(item)) return false;
    return _flagValue(_flagKeyParts(item.bloque, _normalizeFloorLabel(item.planta || 'Piso 1'), `sanitaryConfigured:${item.id}`));
  }

  function _sanitaryReady(item) {
    return _sanitaryRequirementItems(item).every(req => req.done || req.optional);
  }

  function _sanitaryHasGeometry(item) {
    return (item?.objects || []).some(object => (
      (object.type === 'sanitary-room' || object.type === 'room') &&
      Number(object.w || 0) > 0 &&
      Number(object.h || 0) > 0
    ));
  }

  function _siteElementConfigured(item) {
    if (_isPropertyBoundaryElement(item)) return _propertyBoundaryConfirmed(item);
    if (!_siteElementReady(item)) return false;
    if (item?.autoSource?.fieldId === 'pilares_bloque') return true;
    return _flagValue(_flagKeyParts('predio', 'exteriores', `siteConfigured:${item.id}`));
  }

  function _siteElementReady(item) {
    return _siteElementRequirementItems(item).every(req => req.done || req.optional);
  }

  function _siteElementHasPlanRect(item) {
    return Number.isFinite(Number(item?.xRatio)) &&
      Number.isFinite(Number(item?.yRatio)) &&
      Number(item?.wRatio || 0) > 0 &&
      Number(item?.hRatio || 0) > 0;
  }

  function _siteElementHasMeasures(item) {
    const ficha = item?.ficha || {};
    if (['water_tank', 'well'].includes(item?.type)) {
      return Number(ficha.diametro_m || ficha.ancho_m || ficha.largo_m || 0) > 0;
    }
    if (item?.type === 'pillar') {
      return Number(ficha.diametro_m || ficha.lado_m || ficha.ancho_m || 0) > 0;
    }
    return Number(ficha.largo_m || ficha.longitud_m || 0) > 0 && Number(ficha.ancho_m || 0) > 0;
  }

  function _siteElementDimensionText(item) {
    const ficha = item?.ficha || {};
    if (['water_tank', 'well'].includes(item?.type)) {
      const diameter = ficha.diametro_m || ficha.ancho_m || ficha.largo_m || '';
      return diameter ? `Diametro ${diameter} m` : 'Medidas cargadas';
    }
    if (item?.type === 'pillar') {
      const measure = ficha.diametro_m || ficha.lado_m || ficha.ancho_m || '';
      return measure ? `${ficha.forma_pilar || 'Pilar'} ${measure} m` : 'Medidas cargadas';
    }
    const length = ficha.largo_m || ficha.longitud_m || '?';
    const width = ficha.ancho_m || '?';
    return `${length} x ${width} m`;
  }

  function _siteElementCharacteristicKey(type) {
    return {
      water_tank: 'material',
      well: 'tipo_pozo',
      recreation: 'uso',
      gallery: 'ubicacion_relativa',
      walkway: 'superficie',
      open_space: 'uso',
      property_boundary: 'fuente',
      pillar: 'material',
      stair: 'material',
      ramp: 'material',
      service_connection: 'tipo_acometida',
      meter: 'propiedad',
      main_switchboard: 'proteccion',
      grounding: 'conductor_visible',
    }[type] || '';
  }

  function _siteElementCharacteristicOptions(type) {
    return {
      water_tank: ['Plastico', 'Fibra', 'Metalico', 'Hormigon', 'Otro'],
      well: ['Pozo brocal', 'Pozo perforado', 'Artesiano', 'No protegido', 'No verificable'],
      recreation: ['Patio', 'Cancha', 'Tinglado', 'Area recreativa', 'Uso mixto'],
      gallery: ['Frente', 'Lateral', 'Posterior', 'Entre bloques', 'Perimetral'],
      walkway: ['Hormigon', 'Tierra', 'Adoquin', 'Pasto', 'Mixto'],
      open_space: ['Patio', 'Circulacion', 'Deposito temporal', 'Area verde', 'Sin uso'],
      property_boundary: ['Verificacion en campo', 'Imagen/base mapa', 'Dato institucional', 'Estimado por encuestador', 'No verificable'],
      pillar: ['Hormigon', 'Metalico', 'Madera', 'Mamposteria', 'Otro'],
      stair: ['Hormigon', 'Metalica', 'Madera', 'Mixta', 'No verificable'],
      ramp: ['Hormigon', 'Metalica', 'Madera', 'Mixta', 'No verificable'],
      service_connection: ['Aerea', 'Subterranea', 'Mixta', 'No visible', 'No verificable'],
      meter: ['ANDE', 'Escuela', 'Compartido', 'No visible', 'No verificable'],
      main_switchboard: ['Termica', 'Fusible', 'Diferencial', 'Sin proteccion', 'No verificable'],
      grounding: ['Si visible', 'No visible', 'Dudoso', 'No corresponde', 'No verificable'],
    }[type] || ['Bueno', 'Regular', 'Malo', 'No verificable'];
  }

  function _siteElementHasCharacteristic(item) {
    const key = _siteElementCharacteristicKey(item?.type);
    if (!key) return true;
    return _hasAnswer(item?.ficha?.[key]);
  }

  function _siteElementCharacteristicText(item) {
    const key = _siteElementCharacteristicKey(item?.type);
    if (!key) return 'Caracteristica cargada';
    return String(item?.ficha?.[key] || 'Caracteristica cargada');
  }

  function _siteElementTypeLabel(type) {
    return {
      water_tank: 'Tanque de agua',
      well: 'Pozo / captacion',
      recreation: 'Recreacion',
      gallery: 'Galeria',
      walkway: 'Caminero',
      open_space: 'Espacio libre',
      property_boundary: 'Perimetro del predio',
      pillar: 'Pilar',
      stair: 'Escalera de bloque',
      ramp: 'Rampa de bloque',
      service_connection: 'Acometida / punto de ingreso',
      meter: 'Medidor / punto de medicion',
      main_switchboard: 'Tablero electrico del bloque',
      grounding: 'Puesta a tierra',
    }[type] || '';
  }

  function _missingRequirementTitles(items = []) {
    return (items || [])
      .filter(item => !item.done && !item.optional)
      .map(item => item.title)
      .join(', ');
  }

  function _hasAnswer(value) {
    return String(value ?? '').trim().length > 0;
  }

  function _acometidaPresent(value) {
    const text = String(value || '').trim().toLowerCase();
    return Boolean(text) && !['no', 'no visible'].includes(text);
  }

  function _tableroPresent(value) {
    const text = String(value || '').trim().toLowerCase();
    return Boolean(text) && !text.includes('no existe') && !text.includes('no visible');
  }

  function _normalizeFloorLabel(value) {
    const text = String(value || '').trim();
    const normalized = _normalizeText(text);
    if (!text || normalized === 'pb' || normalized.includes('planta baja') || normalized === 'piso 0') return 'Planta baja';
    const match = text.match(/\d+/);
    if (match && Number(match[0]) <= 0) return 'Planta baja';
    if (match) return `Piso ${Number(match[0]) || 1}`;
    return text || 'Planta baja';
  }

  function _floorLabel(floor) {
    if (!floor) return '';
    if (typeof floor === 'string') return _normalizeFloorLabel(floor);
    return _normalizeFloorLabel(floor.label || floor.floor || floor.nombre || floor.name || floor.id || '');
  }

  function _matchesBlockReference(reference, block) {
    if (!block) return false;
    const ref = String(reference || '').trim();
    if (!ref) return false;
    return [block.id, block.bloque_codigo, block.codigo, block.nombre, block.name]
      .filter(Boolean)
      .some(value => String(value).trim() === ref);
  }

  function _targetKeyParts(blockId, floorLabel, name) {
    if (!blockId) return '';
    return ['target', blockId, _normalizeFloorLabel(floorLabel || 'Planta baja'), name].join('::');
  }

  function _targetValue(key) {
    const value = _guidedState.targets?.[key];
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function _flagKeyParts(blockId, floorLabel, name) {
    return ['flag', blockId || 'sin-bloque', _normalizeFloorLabel(floorLabel || 'Planta baja'), name].join('::');
  }

  function _flagValue(key) {
    return Boolean(_guidedState.flags?.[key]);
  }

  function _setFlag(key, value) {
    if (!key) return;
    _guidedState.flags = _guidedState.flags || {};
    if (value) _guidedState.flags[key] = true;
    else delete _guidedState.flags[key];
  }

  function _measureConfirmKey(kind = '', id = '') {
    const cleanKind = String(kind || '').trim();
    const cleanId = String(id || '').trim();
    if (!cleanKind || !cleanId) return '';
    return ['measureConfirmed', cleanKind, cleanId].join('::');
  }

  function _measureConfirmed(kind = '', id = '') {
    return _flagValue(_measureConfirmKey(kind, id));
  }

  function _setMeasureConfirmed(kind = '', id = '', value = true) {
    const key = _measureConfirmKey(kind, id);
    if (!key) return;
    _setFlag(key, value);
  }

  function _countEvidence(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return 0;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + _countEvidence(item, seen), 0);
    }
    let total = 0;
    Object.entries(value).forEach(([key, item]) => {
      if (key === 'evidencias' && Array.isArray(item)) {
        total += item.length;
        return;
      }
      if (key === '__evidence' && item && typeof item === 'object') {
        total += Object.values(item).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
        return;
      }
      total += _countEvidence(item, seen);
    });
    return total;
  }

  function _formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '';
    }
  }

  function _loadState() {
    try {
      const school = _currentSchoolForState();
      const scopedKey = _guidedStateKeyForSchool(school);
      const saved = _readGuidedState(scopedKey || STATE_KEY) || {};
      _activeIndex = Math.max(0, Math.min(STEPS.length - 1, Number(saved.activeIndex || 0)));
      _guidedState = {
        targets: saved.targets && typeof saved.targets === 'object' ? saved.targets : {},
        flags: saved.flags && typeof saved.flags === 'object' ? saved.flags : {},
      };
      _guidedHistory = [];
      _guidedQuestionHistory = [];
      _guidedReviewQuestion = null;
    } catch {
      _activeIndex = 0;
      _guidedState = { targets: {}, flags: {} };
      _guidedHistory = [];
      _guidedQuestionHistory = [];
      _guidedReviewQuestion = null;
    }
  }

  function _saveState() {
    const payload = JSON.stringify({
      activeIndex: _activeIndex,
      targets: _guidedState.targets || {},
      flags: _guidedState.flags || {},
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STATE_KEY, payload);
    const scopedKey = _guidedStateKeyForSchool(_currentSchoolForState());
    if (scopedKey) localStorage.setItem(scopedKey, payload);
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, chr => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }[chr]));
  }

  return {
    init,
    goTo,
    next,
    previous,
    syncFromPlan,
    invalidateMeasureConfirmation,
  };
})();
