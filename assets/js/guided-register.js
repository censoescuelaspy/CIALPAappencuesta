/**
 * CIALPA - Registro guiado secuencial
 * Capa de experiencia para construir el relevamiento sobre un plano unico.
 * Version: 2.6.17
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
              <div>
                <span>Plano vivo</span>
                <strong data-guided-plan-title>Escuela en construccion</strong>
              </div>
              <small data-guided-save-state>Sin borrador</small>
            </div>
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

  function _syncDeckHeight(root = document.getElementById('guided-register-root')) {
    if (!root) return;
    const deck = root.querySelector('[data-guided-deck]');
    const activeStep = STEPS[_activeIndex];
    const slide = activeStep ? root.querySelector(`[data-guided-slide="${activeStep.id}"]`) : null;
    if (!deck || !slide) return;
    deck.style.height = `${Math.max(84, slide.scrollHeight)}px`;
  }

  function _setCount(root, key, value) {
    const el = root.querySelector(`[data-guided-count="${key}"]`);
    if (el) el.textContent = String(value || 0);
  }

  function _snapshot() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
    } catch {
      saved = {};
    }
    const values = saved.values || saved || {};
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
    const activeFloorsReady = activeFloors.length
      ? activeFloors.every(floor => _hasMeasures(floor, 'largo_m', 'ancho_m') && _hasPosition(floor))
      : true;
    const blockReadyForRooms = Boolean(activeBlock && blockHasMeasures && blockPositioned && activeFloors.length && activeFloorsReady);
    const classroomTargetKey = _targetKeyParts(blockId, activeFloorLabel, 'classrooms');
    return {
      blocks: blocks.length,
      classrooms,
      otherSpaces,
      sanitaries: sanitaries.length,
      siteElements: siteElements.length,
      evidence: _countEvidence(values),
      baseMapSaved: Boolean(values.__planBaseMap?.confirmed || values.__planBaseMap?.savedAt),
      savedAtText: _formatDate(saved.savedAt),
      planTitle: activeBlock?.bloque_codigo || values.general?.nombre_institucion || 'Escuela en construccion',
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
      blockHasMeasures,
      blockPositioned,
      blockReadyForRooms,
      activeFloorsReady,
      noFloor,
      classroomTarget: _targetValue(classroomTargetKey),
      classroomTargetKey,
    };
  }

  function _stepDone(id, snap) {
    if (id === 'escuela') return Boolean(snap.savedAtText);
    if (id === 'predio') return snap.baseMapSaved;
    if (id === 'bloques') return snap.blocks > 0 && snap.blockHasMeasures && snap.blockPositioned && (snap.noFloor || (snap.activeFloors.length && snap.activeFloorsReady));
    if (id === 'ambientes') return _activeGuidedQuestion('ambientes', snap)?.done || false;
    if (id === 'sanitarios') return _activeGuidedQuestion('sanitarios', snap)?.done || false;
    if (id === 'exteriores') return _activeGuidedQuestion('exteriores', snap)?.done || false;
    if (id === 'cierre') return snap.blocks + snap.classrooms + snap.sanitaries + snap.siteElements > 0;
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
    if (stepId === 'bloques') return _blockQuestion(snap);
    if (stepId === 'ambientes') return _classroomQuestion(snap);
    if (stepId === 'sanitarios') return _sanitaryQuestion(snap);
    if (stepId === 'exteriores') return _siteQuestion(snap);
    return null;
  }

  function _blockQuestion(snap) {
    if (!snap.blocks) {
      return _question('Paso 1', 'Crear bloque y cargar medidas', 'Primero cree el bloque. La ficha se abrira para registrar largo, ancho, estado y observaciones.', [
        { label: 'Iniciar bloque', action: 'guidedBlock', primary: true },
      ]);
    }
    if (!snap.blockHasMeasures) {
      return _question('Paso 1', 'Medidas obligatorias del bloque', 'Complete largo y ancho antes de continuar. Esas medidas fijan la escala para pisos, aulas y sanitarios.', [
        { label: 'Completar ficha bloque', action: 'blockFicha', primary: true },
      ]);
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
      return _question('Paso 3', 'Graficar y medir el piso', 'El piso debe quedar dibujado sobre el bloque, con posicion, largo, ancho y rotacion antes de cargar ambientes.', [
        { label: 'Completar piso', action: 'floorGuide', primary: true },
        { label: 'Ubicar bloque', action: 'positionBlock' },
      ]);
    }
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
      return _question('Aula pendiente', `Configurar ${label}`, 'Ajuste dimensiones y posicion desde el plano o la ficha. Luego confirme para habilitar la siguiente pregunta.', [
        { label: 'Abrir ficha', action: 'openClassroomFicha', value: snap.incompleteClassroom.id, primary: true },
        { label: 'Confirmar configuracion', action: 'confirmClassroomConfigured', value: snap.incompleteClassroom.id },
      ]);
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
      return _question('Sanitario pendiente', `Configurar ${label}`, 'Complete dimensiones, posicion y ficha. Agregue cabinas o artefactos antes de confirmar.', [
        { label: 'Abrir ficha', action: 'openSanitaryFicha', value: snap.incompleteSanitary.id, primary: true },
        { label: 'Confirmar configuracion', action: 'confirmSanitaryConfigured', value: snap.incompleteSanitary.id },
      ]);
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
      const label = snap.incompleteSiteElement.ficha?.codigo || snap.incompleteSiteElement.ficha?.subtipo || 'Elemento exterior';
      return _question('Elemento pendiente', `Configurar ${label}`, 'Ubique el elemento, ajuste sus esquinas si corresponde y complete la ficha emergente antes de continuar.', [
        { label: 'Abrir ficha', action: 'openSiteFicha', value: snap.incompleteSiteElement.id, primary: true },
        { label: 'Confirmar configuracion', action: 'confirmSiteConfigured', value: snap.incompleteSiteElement.id },
      ]);
    }
    return _question('Listo', 'Exteriores configurados', 'Los elementos exteriores/tecnicos cargados estan ubicados y confirmados.', [
      { label: 'Siguiente', action: 'next', primary: true },
      { label: 'Agregar exterior', action: 'site', value: 'water_tank' },
    ], true);
  }

  function _question(kicker, title, body, actions = [], done = false, control = '') {
    return { kicker, title, body, actions, done, control, blocking: !done };
  }

  function _guidedQuestionCard(question) {
    return `
      <section class="guided-next-card guided-next-card--question ${question.done ? 'guided-next-card--done' : ''}">
        <span>${_escape(question.kicker)}</span>
        <strong>${_escape(question.title)}</strong>
        <p>${_escape(question.body)}</p>
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
    if (!_roomReady(room)) {
      UI.showToast('Complete medidas y posicion del aula antes de confirmar.', 'warning', 5200);
      return;
    }
    _setFlag(_flagKeyParts(room.blockId || snap.activeBlock?.id, _normalizeFloorLabel(room.floor || snap.activeFloorLabel), `classroomConfigured:${room.id}`), true);
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
    if (!_sanitaryReady(item)) {
      UI.showToast('Complete dimensiones, posicion y ficha del sanitario antes de confirmar.', 'warning', 5200);
      return;
    }
    _setFlag(_flagKeyParts(item.bloque || snap.activeBlock?.id, _normalizeFloorLabel(item.planta || snap.activeFloorLabel), `sanitaryConfigured:${item.id}`), true);
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
    if (!_siteElementReady(item)) {
      UI.showToast('Ubique el elemento en el plano antes de confirmarlo.', 'warning', 5200);
      return;
    }
    _setFlag(_flagKeyParts('predio', 'exteriores', `siteConfigured:${item.id}`), true);
    _saveState();
    _updateSnapshot();
    UI.showToast(`${item.ficha?.codigo || 'Elemento exterior'} confirmado.`, 'success');
  }

  function _roomConfigured(room) {
    if (!_roomReady(room)) return false;
    return _flagValue(_flagKeyParts(room.blockId, _normalizeFloorLabel(room.floor || 'Piso 1'), `classroomConfigured:${room.id}`));
  }

  function _roomReady(room) {
    if (!_hasMeasures(room, 'length', 'width')) return false;
    return _roomHasGeometry(room);
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
    if (!_hasMeasures(item, 'largo_m', 'ancho_m')) return false;
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
    return Number.isFinite(Number(item?.xRatio)) &&
      Number.isFinite(Number(item?.yRatio)) &&
      Number(item?.wRatio || 0) > 0 &&
      Number(item?.hRatio || 0) > 0;
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
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {};
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
    localStorage.setItem(STATE_KEY, JSON.stringify({
      activeIndex: _activeIndex,
      targets: _guidedState.targets || {},
      flags: _guidedState.flags || {},
      updatedAt: new Date().toISOString(),
    }));
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
