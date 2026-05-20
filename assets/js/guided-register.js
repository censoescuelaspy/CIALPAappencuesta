/**
 * CIALPA - Registro guiado secuencial
 * Capa de experiencia para construir el relevamiento sobre un plano unico.
 * Version: 2.6.62
 */

const GuidedRegisterModule = (() => {
  'use strict';

  const STATE_KEY = 'cialpa_guided_register_state_v1';
  const DRAFT_KEY = 'cialpa_mec_form_draft_v1';
  let _activeIndex = 0;
  let _bound = false;
  let _touchStartX = 0;
  let _touchStartY = 0;
  let _guidedState = { targets: {}, flags: {} };
  let _timeRefreshTimer = null;

  function _schoolIdentityValues(school) {
    const values = [
      school?.id_escuela,
      school?.codigo_local,
      school?.codigo,
      school?.id,
    ];
    return values
      .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
      .map(value => String(value).trim());
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
      title: 'Escuela y jornada',
      kicker: 'Inicio ordenado',
      summary: 'Seleccionar la escuela, revisar ubicacion y dejar abierta la carga tecnica.',
      checks: ['Escuela seleccionada', 'Ubicacion revisada', 'Jornada activa'],
      actions: [
        { label: 'Mapa', icon: 'MAP', action: 'module', value: 'mapa' },
        { label: 'Ejemplo', icon: 'DEMO', action: 'demo' },
        { label: 'General', icon: 'GEN', action: 'stage', value: 'general' },
        { label: 'Jornada', icon: 'TIME', action: 'module', value: 'jornada' },
      ],
    },
    {
      id: 'predio',
      number: '02',
      title: 'Predio base',
      kicker: 'Plano de partida',
      summary: 'Preparar el tablero unico donde luego se implantan bloques, patios, tanques y espacios.',
      checks: ['Base mapa opcional', 'Coordenadas revisadas', 'Escala inicial lista'],
      actions: [
        { label: 'Calles', icon: 'MAP', action: 'basemap' },
        { label: 'Usar coords', icon: 'GPS', action: 'coords' },
        { label: 'Guardar base', icon: 'OK', action: 'saveBasemap' },
        { label: 'Mover plano', icon: 'MOVE', action: 'moveMode' },
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
      summary: 'Agregar aulas, cantinas, bibliotecas, laboratorios y espacios especiales sin perder el plano comun.',
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
        { label: 'Daño', icon: 'OBS', action: 'roomElement', value: 'damage' },
      ],
    },
    {
      id: 'sanitarios',
      number: '05',
      title: 'Sanitarios',
      kicker: 'Artefactos por botones',
      summary: 'Configurar banos con o sin cabina y cargar artefactos con ficha de estado.',
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
      checks: ['Elementos exteriores', 'Dimensiones editables', 'Ficha y estado'],
      actions: [
        { label: 'Tanque', icon: 'TQ', action: 'site', value: 'water_tank', primary: true },
        { label: 'Recreacion', icon: 'REC', action: 'site', value: 'recreation' },
        { label: 'Galeria', icon: 'GAL', action: 'site', value: 'gallery' },
        { label: 'Caminero', icon: 'CAM', action: 'site', value: 'walkway' },
        { label: 'Espacio libre', icon: 'ESP', action: 'site', value: 'open_space' },
        { label: 'Pilar', icon: 'PIL', action: 'site', value: 'pillar' },
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
        { label: 'Validar', icon: 'CHK', action: 'validate', primary: true },
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
              ${STEPS.map(step => _renderSlide(step)).join('')}
            </div>
          </div>

          <aside class="guided-plan-panel" aria-label="Plano vivo del registro">
            <div class="guided-plan-panel__header">
              <div class="guided-plan-panel__identity">
                <span>Plano vivo</span>
                <strong data-guided-school-name>Sin escuela seleccionada</strong>
                <small data-guided-school-meta>Seleccione una escuela desde el mapa antes de iniciar la carga.</small>
              </div>
              <div class="guided-plan-panel__actions">
                <small data-guided-save-state>Sin borrador</small>
                <button class="btn btn-sm guided-plan-panel__school-action" type="button" data-guided-action="module" data-guided-value="mapa">Cambiar escuela</button>
              </div>
            </div>
            <div class="guided-time-strip" data-guided-time-strip></div>
            <div id="guided-school-plan-root" class="guided-plan-surface" data-school-plan-root></div>
          </aside>
        </section>
      </section>`;
  }

  function _renderSlide(step) {
    const sequenced = _isSequencedStep(step.id);
    return `
      <article class="guided-slide ${sequenced ? 'guided-slide--sequenced' : ''}" data-guided-slide="${step.id}">
        <div class="guided-slide__body">
          <p class="guided-slide__kicker">${_escape(step.kicker)}</p>
          <h3>${_escape(step.title)}</h3>
          <p class="guided-slide__summary">${_escape(step.summary)}</p>
          <div class="guided-slide__next" data-guided-next="${_escape(step.id)}"></div>
          <div class="guided-slide__checks">
            ${step.checks.map(check => `<span>${_escape(check)}</span>`).join('')}
          </div>
          ${sequenced ? '' : `<div class="guided-slide__actions">
            ${step.actions.map(action => `
              <button class="guided-action ${action.primary ? 'guided-action--primary' : ''}" type="button"
                data-guided-action="${_escape(action.action)}"
                data-guided-value="${_escape(action.value || '')}">
                <span>${_escape(action.icon)}</span>
                <strong>${_escape(action.label)}</strong>
              </button>`).join('')}
          </div>`}
        </div>
        <footer class="guided-slide__footer">
          <button class="btn btn-outline btn-sm" type="button" data-guided-action="prev">Anterior</button>
          <span>${_escape(step.number)} / ${String(STEPS.length).padStart(2, '0')}</span>
          <button class="btn btn-primary btn-sm" type="button" data-guided-action="next">Siguiente</button>
        </footer>
      </article>`;
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
        if (!_canMoveToStep(targetIndex)) return;
        goTo(targetIndex);
        return;
      }
      const actionButton = event.target.closest('[data-guided-action]');
      if (!actionButton) return;
      _runAction(actionButton.dataset.guidedAction, actionButton.dataset.guidedValue || '');
    });
    root.addEventListener('pointerdown', event => {
      if (!event.target.closest('[data-guided-deck]')) return;
      _touchStartX = event.clientX;
      _touchStartY = event.clientY;
    });
    root.addEventListener('pointerup', event => {
      if (!_touchStartX) return;
      const dx = event.clientX - _touchStartX;
      const dy = event.clientY - _touchStartY;
      _touchStartX = 0;
      _touchStartY = 0;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      if (dx < 0) next();
      else previous();
    });
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
    if (action === 'next') return next();
    if (action === 'prev') return previous();
    if (action === 'saveClassroomTarget') return _saveClassroomTarget();
    if (action === 'resetClassroomTarget') return _resetClassroomTarget();
    if (action === 'markNoFloor') return _setScopedFlag('noFloor', true, 'Bloque registrado sin piso para esta ronda.');
    if (action === 'resetNoFloor') return _setScopedFlag('noFloor', false, 'Se volvera a pedir el piso del bloque.');
    if (action === 'markNoSanitary') return _setScopedFlag('noSanitary', true, 'Respuesta registrada: sin sanitario para este bloque/piso.');
    if (action === 'resetNoSanitary') return _setScopedFlag('noSanitary', false, 'Se volvera a pedir sanitario para este bloque/piso.');
    if (action === 'markNoSiteElements') return _setScopedFlag('noSiteElements', true, 'Respuesta registrada: sin exteriores por ahora.');
    if (action === 'resetNoSiteElements') return _setScopedFlag('noSiteElements', false, 'Se volvera a pedir exteriores.');
    if (action === 'confirmClassroomConfigured') return _confirmClassroomConfigured(value);
    if (action === 'confirmSanitaryConfigured') return _confirmSanitaryConfigured(value);
    if (action === 'confirmSiteConfigured') return _confirmSiteConfigured(value);
    if (action === 'syncSheets') return _syncDraftToSheets();
    if (action === 'finalizeComplete') return _finalizeCompleteRegistration();
    if (action === 'workbook') return (typeof AppController !== 'undefined' && AppController.openWorkbook) ? AppController.openWorkbook() : null;
    if (action === 'selectPlanItem') return _selectPlanItem(value);
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
        case 'coords':
          mec.useSchoolCoordinatesForBaseMap();
          break;
        case 'saveBasemap':
          mec.savePlanBaseMap();
          break;
        case 'moveMode':
          mec.togglePlanMoveMode();
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
          mec.newPlanClassroom();
          setTimeout(() => {
            try { mec.openClassroomFicha(); } catch { /* non-fatal */ }
          }, 140);
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
          mec.addPlanClassroomElement(value);
          break;
        case 'sanitary':
          mec.addPlanSanitary();
          break;
        case 'stall':
          mec.addPlanSanitaryStall();
          break;
        case 'fixture':
          mec.addPlanSanitaryFixture(value);
          break;
        case 'sanitaryOpening':
          mec.addPlanSanitaryOpening(value);
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

  function _refreshSoon() {
    setTimeout(() => {
      _refreshPlan();
      _updateSnapshot();
    }, 220);
  }

  function _refreshPlan() {
    try {
      if (typeof MecFormModule !== 'undefined') MecFormModule.renderSchoolPlan();
    } catch (err) {
      console.warn('No se pudo refrescar el plano guiado:', err);
    }
  }

  function next() {
    const target = Math.min(STEPS.length - 1, _activeIndex + 1);
    if (!_canMoveToStep(target)) return;
    goTo(target);
  }

  function previous() {
    goTo(Math.max(0, _activeIndex - 1));
  }

  function goTo(index) {
    _activeIndex = Math.max(0, Math.min(STEPS.length - 1, Number(index) || 0));
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
      if (index !== _activeIndex) goTo(index);
      UI.showToast(`Complete primero: ${question.title}`, 'warning', 5200);
      return false;
    }
    return true;
  }

  function _updateSlide() {
    const root = document.getElementById('guided-register-root');
    if (!root) return;
    const track = root.querySelector('[data-guided-track]');
    if (track) track.style.transform = `translate3d(-${_activeIndex * 100}%, 0, 0)`;
    root.querySelectorAll('[data-guided-step]').forEach((button, index) => {
      const active = index === _activeIndex;
      button.classList.toggle('guided-step--active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
    });
    const progress = root.querySelector('[data-guided-progress]');
    if (progress) progress.style.width = `${((_activeIndex + 1) / STEPS.length) * 100}%`;
    requestAnimationFrame(() => _syncDeckHeight(root));
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
    _refreshTimeTracking(root, snap);
    root.querySelectorAll('[data-guided-step-state]').forEach(label => {
      const step = STEPS.find(item => item.id === label.dataset.guidedStepState);
      const done = _stepDone(step?.id, snap);
      label.textContent = done ? 'Listo' : 'Pendiente';
      label.closest('.guided-step')?.classList.toggle('guided-step--done', done);
    });
    root.querySelectorAll('[data-guided-next]').forEach(panel => {
      panel.innerHTML = _guidedNextHtml(panel.dataset.guidedNext || '', snap);
    });
    requestAnimationFrame(() => _syncDeckHeight(root));
  }

  function _refreshTimeTracking(root = document.getElementById('guided-register-root'), snap = null) {
    if (!root) return;
    const panel = root.querySelector('[data-guided-time-strip]');
    if (!panel) return;
    const current = snap || _snapshot();
    panel.innerHTML = _timeStripHtml(current.timeTracking);
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
    deck.style.height = `${Math.max(84, desiredHeight)}px`;
  }

  function _setCount(root, key, value) {
    const el = root.querySelector(`[data-guided-count="${key}"]`);
    if (el) el.textContent = String(value || 0);
  }

  function _schoolContext(values = {}) {
    const school = values.__selectedSchool || {};
    const general = values.general || {};
    const code = _firstPresent(school, ['codigo_establecimiento', 'codigo_local', 'codigo', 'id_escuela', 'id']) ||
      general.codigo_establecimiento || general.codigo_local || '';
    const name = _firstPresent(school, ['nombre', 'nombre_escuela', 'nombre_establecimiento', 'institucion']) ||
      general.nombre_institucion || general.nombre_establecimiento || '';
    const location = [
      general.departamento || school.departamento,
      general.distrito || school.distrito,
      general.localidad || school.localidad,
    ].filter(Boolean).join(' / ');
    const meta = [code ? `Codigo ${code}` : '', location].filter(Boolean).join(' - ');
    return { code, name, location, meta };
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
    const school = _schoolContext(values);
    const rooms = Array.isArray(values.__classrooms) ? values.__classrooms : [];
    const siteElements = Array.isArray(values.__siteElements) ? values.__siteElements : [];
    const blocks = Array.isArray(values.__blocks) ? values.__blocks : [];
    const sanitaries = Array.isArray(values.__sanitaries) ? values.__sanitaries : [];
    const classrooms = rooms.filter(room => !room.spaceKind || room.spaceKind === 'classroom').length;
    const otherSpaces = Math.max(0, rooms.length - classrooms);
    const activeBlock = blocks.find(block => block.id === values.__activeBlockId) || blocks[0] || null;
    const activeFloors = Array.isArray(activeBlock?.floors) ? activeBlock.floors : [];
    const firstFloor = activeFloors[0] || null;
    const activeFloorLabel = _floorLabel(firstFloor) || _normalizeFloorLabel(values.__activeFloor || 'Piso 1');
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
    const incompleteSiteElement = siteElements.find(item => !_siteElementConfigured(item));
    const blockHasMeasures = _hasMeasures(activeBlock, 'largo_m', 'ancho_m');
    const blockPositioned = _hasPosition(activeBlock?.planPosition || activeBlock?.plano_general);
    const noFloor = _flagValue(_flagKeyParts(blockId, activeFloorLabel, 'noFloor'));
    const incompleteFloor = activeFloors.find(floor => !_floorReady(floor));
    const activeBlockSiteElements = siteElements.filter(item => (
      item?.autoSource?.module === 'bloques' &&
      (!blockId || item.autoSource.blockId === blockId)
    ));
    const incompleteBlockSiteElement = activeBlockSiteElements.find(item => !_siteElementConfigured(item));
    const activeFloorsReady = activeFloors.length
      ? activeFloors.every(floor => _hasMeasures(floor, 'largo_m', 'ancho_m') && _hasPosition(floor))
      : true;
    const blockReadyForRooms = Boolean(activeBlock && blockHasMeasures && blockPositioned && activeFloors.length && activeFloorsReady);
    const classroomTargetKey = _targetKeyParts(blockId, activeFloorLabel, 'classrooms');
    const savedAtText = _formatDate(saved.savedAt);
    const timeTracking = _timeTrackingSummary(values);
    const completion = _completionStatus(values, savedAtText, school);
    return {
      values,
      timeTracking,
      blocks: blocks.length,
      classrooms,
      otherSpaces,
      sanitaries: sanitaries.length,
      siteElements: siteElements.length,
      evidence: _countEvidence(values),
      baseMapSaved: Boolean(values.__planBaseMap?.confirmed || values.__planBaseMap?.savedAt),
      savedAtText,
      school,
      completion,
      planTitle: activeBlock?.bloque_codigo || school.name || values.general?.nombre_institucion || 'Escuela en construccion',
      activeBlock,
      activeFloors,
      firstFloor,
      activeFloorLabel,
      activeClassrooms,
      activeOtherSpaces,
      activeSanitaries,
      activeSiteElements: siteElements,
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
    const pending = [];
    const add = (scope, title, detail = '', action = '', value = '') => {
      pending.push({ scope, title, detail, action, value });
    };
    const labelBlock = block => block?.bloque_codigo || block?.nombre || block?.id || 'Bloque';
    const labelFloor = floor => _floorLabel(floor) || 'Piso';
    const flag = (blockId, floorLabel, name) => _flagValue(_flagKeyParts(blockId, floorLabel, name));

    if (!school.name && !school.code) add('Escuela', 'Identificar escuela', 'Falta codigo o nombre de la escuela.', 'module', 'mapa');
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
      const noFloor = flag(block?.id, 'Piso 1', 'noFloor');
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
        .forEach(item => add(scope, item.title, item.help || '', item.plan ? 'selectPlanItem' : 'openClassroomFicha', item.plan ? `room::${room.id}` : room.id));
      if (_roomReady(room) && !_roomConfigured(room)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el ambiente.', 'confirmClassroomConfigured', room.id);
    });

    sanitaries.forEach(item => {
      const scope = item.codigo || 'Sanitario';
      _sanitaryRequirementItems(item)
        .filter(req => !req.done && !req.optional)
        .forEach(req => add(scope, req.title, req.help || '', req.plan ? 'selectPlanItem' : 'openSanitaryFicha', req.plan ? `sanitary::${item.id}` : item.id));
      if (_sanitaryReady(item) && !_sanitaryConfigured(item)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el sanitario.', 'confirmSanitaryConfigured', item.id);
    });

    siteElements.forEach(item => {
      const scope = item?.ficha?.codigo || _siteElementTypeLabel(item?.type) || 'Exterior';
      _siteElementRequirementItems(item)
        .filter(req => !req.done && !req.optional)
        .forEach(req => add(scope, req.title, req.help || '', req.plan ? 'selectPlanItem' : 'openSiteFicha', req.plan ? `site::${item.id}` : item.id));
      if (_siteElementReady(item) && !_siteElementConfigured(item)) add(scope, 'Confirmar configuracion', 'Pulse Confirmar configuracion para cerrar el elemento exterior.', 'confirmSiteConfigured', item.id);
    });

    const anyNoSiteFlag = Object.entries(_guidedState.flags || {})
      .some(([key, value]) => value && key.endsWith('::noSiteElements'));
    if (!siteElements.length && !anyNoSiteFlag) {
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
        siteElements: siteElements.length,
        evidence: _countEvidence(values),
      },
    };
  }

  function _blockTechnicalPending(block = {}) {
    const pending = [];
    if (!_hasAnswer(block.tipo_circulacion)) {
      pending.push({ title: 'Responder escalera/rampa', detail: 'Falta circulacion vertical del bloque.', action: 'answerBlockField', value: 'tipo_circulacion::No aplica' });
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
      pending.push({ title: 'Responder tablero electrico', detail: 'Falta estado del tablero del bloque.', action: 'answerBlockField', value: 'tablero_estado::No existe / no visible' });
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
    if (id === 'escuela') return Boolean(snap.savedAtText);
    if (id === 'predio') return snap.baseMapSaved;
    if (id === 'bloques') return snap.blocks > 0 && snap.blockHasMeasures && snap.blockPositioned && (snap.noFloor || (snap.activeFloors.length && snap.activeFloorsReady));
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
      return _guidedNextCard('Paso 1', 'Crear bloque y cargar medidas', 'Pulse iniciar bloque: se abrira la ficha para largo, ancho, estado y observaciones.', [
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
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'} btn-sm" type="button"
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
        'Declaracion inicial',
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
    if (!snap.savedAtText) {
      return _question(
        'Declaracion inicial',
        'Declare jornada y responsable de carga',
        'Complete o revise datos generales y jornada antes de medir. La escuela ya esta identificada, pero falta dejar guardado el contexto operativo.',
        [
          { label: 'Datos generales', action: 'stage', value: 'general', primary: true },
          { label: 'Mi jornada', action: 'module', value: 'jornada' },
          { label: 'Siguiente', action: 'next' },
        ],
        false,
        '',
        'Registre fecha de visita, turno o jornada, responsable/encuestador y cualquier observacion inicial de acceso. Estos datos ayudan a reconstruir tiempos, saber quien cargo el relevamiento y vincular evidencia fotografica con la escuela correcta.',
        false
      );
    }
    return _question(
      'Listo',
      'Escuela y jornada identificadas',
      'El contexto de la carga ya quedo disponible. Ahora prepare el predio base o avance a bloques si no necesita base de calles/coordenadas.',
      [
        { label: 'Siguiente', action: 'next', primary: true },
        { label: 'Mapa', action: 'module', value: 'mapa' },
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
        'Plano de partida',
        'Declare la referencia del predio',
        'Defina si usara calles/coordenadas como ayuda visual. No es obligatorio, pero mejora la ubicacion de bloques, accesos, patios, tanques y exteriores.',
        [
          { label: 'Calles/lineas', action: 'basemap', primary: true },
          { label: 'Usar coordenadas', action: 'coords' },
          { label: 'Guardar base', action: 'saveBasemap' },
          { label: 'Siguiente', action: 'next' },
        ],
        false,
        '',
        'Use la base solo como referencia: el plano tecnico final lo construye con medidas reales. Si la escuela tiene coordenadas, pulse Usar coordenadas, ajuste la base si hace falta y luego Guardar base. Si no hay internet o la imagen no ayuda, continue sin base y dibuje bloques a escala con las medidas relevadas.',
        false
      );
    }
    return _question(
      'Listo',
      'Predio base confirmado',
      'La referencia del predio quedo guardada. Ya puede implantar bloques y exteriores con mas seguridad.',
      [
        { label: 'Siguiente', action: 'next', primary: true },
        { label: 'Revisar base', action: 'basemap' },
      ],
      true,
      '',
      'La base guardada permite volver a la misma referencia despues de cerrar o actualizar la app. Revise que el norte visual, calles y ubicacion general sean coherentes antes de cargar muchos objetos.',
      false
    );
  }

  function _blockQuestion(snap) {
    if (!snap.blocks) {
      return _question('Paso 1', 'Crear bloque y cargar medidas', 'Primero cree el bloque. La ficha se abrira para registrar largo, ancho, estado y observaciones.', [
        { label: 'Iniciar bloque', action: 'guidedBlock', primary: true },
      ]);
    }
    const blockPending = _blockRequirementItems(snap.activeBlock);
    const blockNext = _firstPendingRequirement(blockPending);
    if (blockNext) {
      return _question('Paso 1', `Bloque: ${blockNext.title}`, blockNext.help || 'Complete la ficha del bloque antes de continuar.', [
        { label: 'Completar ficha bloque', action: 'blockFicha', primary: true },
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
      return _question('Paso 3', next ? `Piso: ${next.title}` : 'Graficar y medir el piso', next?.help || 'El piso debe quedar dibujado sobre el bloque, con posicion, largo, ancho y rotacion antes de cargar ambientes.', [
        { label: next?.plan ? 'Seleccionar piso' : 'Completar piso', action: next?.plan ? 'selectPlanItem' : 'floorGuide', value: `floor::${snap.activeBlock?.id || ''}::${floor?.id || floor?.label || 'Piso 1'}`, primary: true },
        { label: 'Abrir ficha', action: 'floorGuide' },
      ], false, _guidedRequirementList(pending));
    }
    if (snap.incompleteBlockSiteElement) return _siteElementQuestion(snap.incompleteBlockSiteElement, 'bloque');
    const electric = _nextBlockTechnicalQuestion(snap);
    if (electric) return electric;
    return _question('Listo', 'Bloque listo para continuar', 'La estructura principal ya tiene las respuestas minimas para pasar a aulas, sanitarios o exteriores.', [
      { label: 'Siguiente', action: 'next', primary: true },
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
      return _question('Pregunta obligatoria', 'Tiene tablero electrico del bloque?', 'Si existe tablero, se incorpora al plano y se exige completar su ficha.', [
        { label: 'Bueno', action: 'answerBlockField', value: 'tablero_estado::Bueno', primary: true },
        { label: 'Regular', action: 'answerBlockField', value: 'tablero_estado::Regular', primary: true },
        { label: 'Malo', action: 'answerBlockField', value: 'tablero_estado::Malo' },
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
      return _question('Aula pendiente', `Insertar aula ${nextNumber} de ${snap.classroomTarget}`, 'Cree el aula, ubique su rectangulo en el plano, ajuste sus esquinas y complete la ficha emergente.', [
        { label: `Insertar aula ${nextNumber}`, action: 'guidedClassroom', primary: true },
        { label: 'Cambiar cantidad', action: 'resetClassroomTarget' },
      ]);
    }
    if (snap.incompleteClassroom) {
      const label = snap.incompleteClassroom.name || 'Aula pendiente';
      const pending = _roomRequirementItems(snap.incompleteClassroom);
      const next = _firstPendingRequirement(pending);
      return _question('Aula pendiente', `${label}: ${next?.title || 'confirmar guardado'}`, next?.help || 'Revise la ficha y confirme el guardado para habilitar la siguiente pregunta.', [
        { label: next?.plan ? 'Seleccionar en plano' : 'Abrir ficha', action: next?.plan ? 'selectPlanItem' : 'openClassroomFicha', value: next?.plan ? `room::${snap.incompleteClassroom.id}` : snap.incompleteClassroom.id, primary: true },
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
      return _question('Pregunta obligatoria', 'Este bloque/piso tiene sanitario?', 'Si responde Si, se inserta el sanitario y debe configurar sus medidas, posicion, artefactos y ficha.', [
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
      const label = snap.incompleteSanitary.codigo || 'Sanitario pendiente';
      const pending = _sanitaryRequirementItems(snap.incompleteSanitary);
      const next = _firstPendingRequirement(pending);
      return _question('Sanitario pendiente', `${label}: ${next?.title || 'confirmar guardado'}`, next?.help || 'Revise la ficha y confirme el guardado para habilitar la siguiente pregunta.', [
        { label: next?.plan ? 'Seleccionar en plano' : 'Abrir ficha', action: next?.plan ? 'selectPlanItem' : 'openSanitaryFicha', value: next?.plan ? `sanitary::${snap.incompleteSanitary.id}` : snap.incompleteSanitary.id, primary: true },
        { label: 'Abrir ficha', action: 'openSanitaryFicha', value: snap.incompleteSanitary.id },
        { label: 'Confirmar configuracion', action: 'confirmSanitaryConfigured', value: snap.incompleteSanitary.id },
      ], false, _guidedRequirementList(pending));
    }
    return _question('Listo', 'Sanitarios configurados', 'Los sanitarios cargados tienen posicion, dimensiones y confirmacion de ficha.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Agregar otro', action: 'sanitary' },
    ], true);
  }

  function _siteQuestion(snap) {
    const noSiteElements = _flagValue(_flagKeyParts(snap.activeBlock?.id || 'predio', 'exteriores', 'noSiteElements'));
    if (!snap.siteElements && !noSiteElements) {
      return _question('Pregunta obligatoria', 'Hay elementos exteriores o tecnicos por ubicar?', 'Agregue tanque, pozo, galeria, caminero, pilar u otros. Cada elemento debe quedar en el plano y con ficha confirmada.', [
        { label: 'Tanque', action: 'site', value: 'water_tank', primary: true },
        { label: 'Pozo/captacion', action: 'site', value: 'well' },
        { label: 'Galeria', action: 'site', value: 'gallery' },
        { label: 'Pilar', action: 'site', value: 'pillar' },
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
          { label: 'Validar', action: 'validate' },
          { label: 'Guardar en Sheets ahora', action: 'syncSheets' },
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
      'El relevamiento esta listo para cierre. Al guardar, se registra el paquete final, se prepara el envio por correo y se abre de inmediato la vista PDF.',
      [
        { label: 'Guardar completos y abrir PDF', action: 'finalizeComplete', primary: true },
        { label: 'Guardar en Sheets ahora', action: 'syncSheets' },
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
      </div>`;
  }

  function _storageInfoText() {
    return 'El boton Datos en Sheets abre el libro de Google Sheets. Durante la carga, revise mec_borradores: ahi queda una fila por escuela con resumen y JSON del borrador. escuelas_seleccionadas muestra estado general; evidencias lista fotos subidas a Drive; entregas_cierre registra cada cierre completo con enlaces al PDF y metadatos.';
  }

  function _siteElementQuestion(item, origin = 'exteriores') {
    const label = item?.ficha?.codigo || item?.ficha?.subtipo || _siteElementTypeLabel(item?.type) || 'Elemento pendiente';
    const pending = _siteElementRequirementItems(item);
    const next = _firstPendingRequirement(pending);
    return _question(
      origin === 'bloque' ? 'Elemento automatico pendiente' : 'Elemento pendiente',
      `${label}: ${next?.title || 'confirmar guardado'}`,
      next?.help || 'Revise la ficha y confirme el guardado para habilitar la siguiente pregunta.',
      [
        { label: next?.plan ? 'Seleccionar en plano' : 'Abrir ficha', action: next?.plan ? 'selectPlanItem' : 'openSiteFicha', value: next?.plan ? `site::${item.id}` : item.id, primary: true },
        { label: 'Abrir ficha', action: 'openSiteFicha', value: item.id },
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
    return `
      <ul class="guided-requirements" aria-label="Pendientes del elemento">
        ${items.map(item => `
          <li class="${item.done ? 'guided-requirements__item--done' : ''} ${item.optional ? 'guided-requirements__item--optional' : ''}">
            <span aria-hidden="true">${item.done ? '&#10003;' : (item.optional ? 'i' : '!')}</span>
            <strong>${_escape(item.title)}</strong>
            <small>${_escape(item.done ? (item.doneText || 'Completado') : `${item.optional ? 'Recomendado: ' : ''}${item.help || 'Pendiente'}`)}</small>
          </li>`).join('')}
      </ul>`;
  }

  function _blockRequirementItems(block) {
    return [
      {
        title: 'Cargar dimensiones',
        help: 'Complete largo y ancho del bloque. Estas medidas fijan la escala de pisos, aulas y sanitarios.',
        doneText: `${block?.largo_m || '?'} x ${block?.ancho_m || '?'} m`,
        done: _hasMeasures(block, 'largo_m', 'ancho_m'),
      },
      {
        title: 'Condicion de calidad',
        help: 'Registre el estado general del bloque antes de ubicarlo en el plano.',
        doneText: block?.estado_bloque || 'Estado cargado',
        done: _hasAnswer(block?.estado_bloque),
        optional: true,
      },
      {
        title: 'Caracteristicas / observacion',
        help: 'Agregue una observacion breve: uso, obra, clausura, danos visibles o contexto relevante.',
        doneText: 'Observacion registrada',
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
        help: 'Complete largo y ancho del piso desde la ficha o estirando sus vertices en el plano.',
        doneText: `${floor?.largo_m || '?'} x ${floor?.ancho_m || '?'} m`,
        done: _hasMeasures(floor, 'largo_m', 'ancho_m'),
      },
      {
        title: 'Condicion de calidad',
        help: 'Registre el estado general del piso.',
        doneText: floor?.estado || floor?.estado_piso || 'Estado cargado',
        done: _hasAnswer(floor?.estado || floor?.estado_piso),
        optional: true,
      },
      {
        title: 'Caracteristicas / observacion',
        help: 'Agregue una observacion breve del piso si hay particularidades, deterioro o restricciones.',
        doneText: 'Observacion registrada',
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
        help: 'Complete largo y ancho desde la ficha o estirando el ambiente sobre el plano.',
        doneText: `${room?.length || '?'} x ${room?.width || '?'} m`,
        done: _hasMeasures(room, 'length', 'width'),
      },
      {
        title: 'Condicion de calidad',
        help: 'Registre el estado general del ambiente antes de confirmarlo.',
        doneText: room?.estado || 'Estado cargado',
        done: _hasAnswer(room?.estado),
        optional: true,
      },
      {
        title: 'Caracteristicas del ambiente',
        help: 'Registre uso, particularidades, aberturas u observaciones tecnicas en la ficha.',
        doneText: 'Caracteristicas registradas',
        done: _hasAnswer(room?.caracteristicas) || _hasAnswer(room?.openings),
        optional: true,
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
        help: 'Complete largo y ancho desde la ficha o estirando el sanitario sobre el plano.',
        doneText: `${item?.largo_m || '?'} x ${item?.ancho_m || '?'} m`,
        done: _hasMeasures(item, 'largo_m', 'ancho_m'),
      },
      {
        title: 'Condicion de calidad',
        help: 'Registre el estado general del sanitario.',
        doneText: item?.estado || 'Estado cargado',
        done: _hasAnswer(item?.estado),
        optional: true,
      },
      {
        title: 'Caracteristicas sanitarias',
        help: 'Complete uso principal, genero/destino y datos basicos de funcionamiento.',
        doneText: [item?.uso, item?.genero, item?.agua].filter(Boolean).join(' / ') || 'Caracteristicas cargadas',
        done: _hasAnswer(item?.uso) && _hasAnswer(item?.genero) && _hasAnswer(item?.agua),
        optional: true,
      },
    ];
  }

  function _siteElementRequirementItems(item) {
    const ficha = item?.ficha || {};
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
        doneText: _siteElementDimensionText(item),
        done: _siteElementHasMeasures(item),
      },
      {
        title: 'Condicion de calidad',
        help: 'Registre el estado general observado.',
        doneText: ficha.estado || 'Estado cargado',
        done: _hasAnswer(ficha.estado),
        optional: true,
      },
      {
        title: 'Caracteristicas tecnicas',
        help: 'Complete el campo tecnico principal que corresponde a este tipo de elemento.',
        doneText: _siteElementCharacteristicText(item),
        done: _siteElementHasCharacteristic(item),
        optional: true,
      },
    ];
  }

  function _guidedQuestionCard(question) {
    const info = _guidedQuestionInfo(question);
    return `
      <section class="guided-next-card guided-next-card--question ${question.done ? 'guided-next-card--done' : ''}">
        <span>${_escape(question.kicker)}</span>
        <strong>${_escape(question.title)}</strong>
        <p>${_escape(question.body)}</p>
        <details class="guided-info-note">
          <summary><span aria-hidden="true">i</span><strong>Ayuda de campo</strong></summary>
          <p>${_escape(info)}</p>
        </details>
        ${question.control || ''}
        <div>
          ${question.actions.map(action => `
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'} btn-sm" type="button"
              data-guided-action="${_escape(action.action)}"
              data-guided-value="${_escape(action.value || '')}">
              ${_escape(action.label)}
            </button>`).join('')}
        </div>
      </section>`;
  }

  function _guidedQuestionInfo(question = {}) {
    if (question.info) return question.info;
    if (question.done) {
      return 'Este punto ya esta completo para avanzar. Puede volver a abrir la ficha o el plano si necesita corregir datos antes de exportar o sincronizar.';
    }
    return 'Complete la accion principal antes de avanzar. La informacion de calidad, estado y caracteristicas mejora la auditoria y el PDF, pero la ficha queda disponible para revisar o ampliar datos despues de ubicar el elemento en el plano.';
  }

  function _numberControl(name, label, min = '0', value = '') {
    return `
      <label class="guided-question-control">
        <span>${_escape(label)}</span>
        <input class="form-control" type="number" min="${_escape(min)}" step="1" value="${_escape(value)}" data-${_escape(name)}>
      </label>`;
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
    if (mec.setGuidedBlockField(fieldId, value)) _refreshSoon();
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

  function _setScopedFlag(name, value, message = '') {
    const snap = _snapshot();
    const blockId = name === 'noSiteElements' ? (snap.activeBlock?.id || 'predio') : snap.activeBlock?.id;
    const floor = name === 'noSiteElements' ? 'exteriores' : snap.activeFloorLabel;
    const key = _flagKeyParts(blockId, floor, name);
    _setFlag(key, value);
    _saveState();
    _updateSnapshot();
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

  async function _finalizeCompleteRegistration() {
    const snap = _snapshot();
    if (!snap.completion?.complete) {
      UI.showToast(`Todavia hay ${snap.completion?.pending?.length || 0} pendiente(s) antes de cerrar.`, 'warning', 7000);
      goTo(STEPS.findIndex(step => step.id === 'cierre'));
      return;
    }
    const mec = typeof MecFormModule !== 'undefined' ? MecFormModule : null;
    if (!mec?.buildFinalDeliveryPackage || !mec?.printPlanPdf) {
      UI.showToast('No se pudo preparar el paquete final desde el motor del plano.', 'error');
      return;
    }
    const packageData = mec.buildFinalDeliveryPackage(snap.completion);
    if (mec.syncDraftToSheets) {
      await mec.syncDraftToSheets('cierre', { silent: true }).catch(err => {
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
      mec.printPlanPdf();
      _refreshSoon();
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
    if (!_siteElementReady(item)) return false;
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
      pillar: 'material',
      stair: 'material',
      ramp: 'material',
      service_connection: 'tipo_acometida',
      meter: 'propiedad',
      main_switchboard: 'proteccion',
      grounding: 'conductor_visible',
    }[type] || '';
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
    const match = text.match(/\d+/);
    if (match) return `Piso ${Number(match[0]) || 1}`;
    return text || 'Piso 1';
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
    return ['target', blockId, _normalizeFloorLabel(floorLabel || 'Piso 1'), name].join('::');
  }

  function _targetValue(key) {
    const value = _guidedState.targets?.[key];
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function _flagKeyParts(blockId, floorLabel, name) {
    return ['flag', blockId || 'sin-bloque', _normalizeFloorLabel(floorLabel || 'Piso 1'), name].join('::');
  }

  function _flagValue(key) {
    return Boolean(_guidedState.flags?.[key]);
  }

  function _setFlag(key, value) {
    _guidedState.flags = _guidedState.flags || {};
    if (value) _guidedState.flags[key] = true;
    else delete _guidedState.flags[key];
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
    } catch {
      _activeIndex = 0;
      _guidedState = { targets: {}, flags: {} };
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
  };
})();
