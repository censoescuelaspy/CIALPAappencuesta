/**
 * CIALPA - Registro guiado secuencial
 * Capa de experiencia para construir el relevamiento sobre un plano unico.
 * Version: 2.6.0
 */

const GuidedRegisterModule = (() => {
  'use strict';

  const STATE_KEY = 'cialpa_guided_register_state_v1';
  const DRAFT_KEY = 'cialpa_mec_form_draft_v1';
  let _activeIndex = 0;
  let _bound = false;
  let _touchStartX = 0;
  let _touchStartY = 0;

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
      summary: 'Crear cada bloque una sola vez, cargar sus pisos y ubicarlo en el predio.',
      checks: ['Bloque creado', 'Cantidad de pisos', 'Dimensiones y estado'],
      actions: [
        { label: 'Nuevo bloque', icon: '+BL', action: 'newBlock', primary: true },
        { label: 'Guardar bloque', icon: 'SAVE', action: 'saveBlock' },
        { label: 'Bloquear', icon: 'LOCK', action: 'lockBlock' },
        { label: 'Ficha bloque', icon: 'FORM', action: 'stage', value: 'bloques' },
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
        <header class="guided-register__header">
          <div>
            <p class="guided-register__eyebrow">Nuevo flujo secuencial v${_escape(typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.VERSION : '2.6.0')}</p>
            <h2>Registro guiado sobre plano unico</h2>
            <p>Una secuencia horizontal de carga: cada accion alimenta el mismo plano vivo de la escuela.</p>
          </div>
          <div class="guided-register__toolbar" aria-label="Controles de plano">
            <button class="btn btn-outline btn-sm" type="button" data-guided-action="zoomOut">-</button>
            <button class="btn btn-outline btn-sm" type="button" data-guided-action="zoomIn">+</button>
            <button class="btn btn-outline btn-sm" type="button" data-guided-action="fullscreen">Pantalla completa</button>
            <button class="btn btn-primary btn-sm" type="button" data-guided-action="next">Siguiente</button>
          </div>
        </header>

        <section class="guided-summary" aria-label="Resumen del registro">
          <article><span>Bloques</span><strong data-guided-count="blocks">0</strong></article>
          <article><span>Aulas</span><strong data-guided-count="classrooms">0</strong></article>
          <article><span>Otros</span><strong data-guided-count="otherSpaces">0</strong></article>
          <article><span>Sanitarios</span><strong data-guided-count="sanitaries">0</strong></article>
          <article><span>Exteriores</span><strong data-guided-count="siteElements">0</strong></article>
          <article><span>Fotos</span><strong data-guided-count="evidence">0</strong></article>
        </section>

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
    return `
      <article class="guided-slide" data-guided-slide="${step.id}">
        <div class="guided-slide__body">
          <p class="guided-slide__kicker">${_escape(step.kicker)}</p>
          <h3>${_escape(step.title)}</h3>
          <p>${_escape(step.summary)}</p>
          <div class="guided-slide__checks">
            ${step.checks.map(check => `<span>${_escape(check)}</span>`).join('')}
          </div>
          <div class="guided-slide__actions">
            ${step.actions.map(action => `
              <button class="guided-action ${action.primary ? 'guided-action--primary' : ''}" type="button"
                data-guided-action="${_escape(action.action)}"
                data-guided-value="${_escape(action.value || '')}">
                <span>${_escape(action.icon)}</span>
                <strong>${_escape(action.label)}</strong>
              </button>`).join('')}
          </div>
        </div>
        <footer class="guided-slide__footer">
          <button class="btn btn-outline btn-sm" type="button" data-guided-action="prev">Anterior</button>
          <span>${_escape(step.number)} / ${String(STEPS.length).padStart(2, '0')}</span>
          <button class="btn btn-primary btn-sm" type="button" data-guided-action="next">Siguiente</button>
        </footer>
      </article>`;
  }

  function _bind(root) {
    if (_bound) return;
    _bound = true;
    root.addEventListener('click', event => {
      const stepButton = event.target.closest('[data-guided-step]');
      if (stepButton) {
        goTo(Number(stepButton.dataset.guidedStep || 0));
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
    if (action === 'module') return _openModule(value);
    if (action === 'stage') return _openMecStage(value);
    if (action === 'demo') return _openDemo();

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
        case 'newBlock':
          mec.newBlock();
          break;
        case 'saveBlock':
          mec.saveCurrentBlock();
          break;
        case 'lockBlock':
          mec.setActiveBlockLocked(true);
          break;
        case 'classroom':
          mec.newPlanClassroom();
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
    goTo(Math.min(STEPS.length - 1, _activeIndex + 1));
  }

  function previous() {
    goTo(Math.max(0, _activeIndex - 1));
  }

  function goTo(index) {
    _activeIndex = Math.max(0, Math.min(STEPS.length - 1, Number(index) || 0));
    _saveState();
    _updateSlide();
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
    const activeBlock = blocks.find(block => block.id === values.__activeBlockId);
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
    };
  }

  function _stepDone(id, snap) {
    if (id === 'escuela') return Boolean(snap.savedAtText);
    if (id === 'predio') return snap.baseMapSaved;
    if (id === 'bloques') return snap.blocks > 0;
    if (id === 'ambientes') return snap.classrooms + snap.otherSpaces > 0;
    if (id === 'sanitarios') return snap.sanitaries > 0;
    if (id === 'exteriores') return snap.siteElements > 0;
    if (id === 'cierre') return snap.blocks + snap.classrooms + snap.sanitaries + snap.siteElements > 0;
    return false;
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
    } catch {
      _activeIndex = 0;
    }
  }

  function _saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({ activeIndex: _activeIndex, updatedAt: new Date().toISOString() }));
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
