/**
 * CIALPA — Motor inicial de replica del cuestionario MEC
 * Renderiza esquema, aplica reglas de salto, valida y guarda borrador local.
 */

const MecFormModule = (() => {
  'use strict';

  const STORAGE_KEY = 'cialpa_mec_form_draft_v1';
  let _data = {};
  let _initialized = false;
  let _activeModuleId = 'general';
  let _sketchTool = 'select';
  let _selectedSketchObjectId = null;
  let _activeClassroomId = null;
  let _sketchZoom = 1;
  let _selectedPlanId = null;
  let _planHitAreas = [];
  const _sketchHistory = [];
  const _sketchRedo = [];
  const _planLayers = {
    aulas: true,
    aberturas: true,
    electricidad: true,
    danos: true,
    etiquetas: true,
  };

  const SKETCH_TOOLS = [
    { id: 'select', label: 'Seleccionar' },
    { id: 'wall', label: 'Pared' },
    { id: 'door', label: 'Puerta' },
    { id: 'window', label: 'Ventana' },
    { id: 'stair', label: 'Escalera' },
    { id: 'board', label: 'Pizarron' },
    { id: 'outlet', label: 'Toma' },
    { id: 'damage', label: 'Dano' },
    { id: 'photo', label: 'Foto' },
  ];

  function init() {
    _loadDraft();
    _render();
    _initialized = true;
  }

  function _loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
      _data = saved.values || saved || {};
    } catch {
      _data = {};
    }
  }

  function _saveDraft(showToast = false) {
    if (_data.__classroomSketch && _data.__classrooms) _syncActiveClassroomFromSketch();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      schemaVersion: MEC_SCHEMA.version,
      values: _data,
    }));
    if (showToast) UI.showToast('Borrador MEC guardado en este dispositivo.', 'success');
    const state = document.getElementById('mec-save-state');
    if (state) state.textContent = _formatSavedAt(new Date().toISOString());
  }

  function _setValue(moduleId, fieldId, value) {
    _data[moduleId] = _data[moduleId] || {};
    _data[moduleId][fieldId] = value;
    if (moduleId === 'bloques') _syncActiveBlock();
    _saveDraft(false);
    _refreshDynamicState();
  }

  async function _setEvidenceFiles(moduleId, fieldId, files) {
    const key = `${moduleId}.${fieldId}`;
    _data.__evidence = _data.__evidence || {};
    _data.__evidence[key] = await Promise.all([...files].map(file => _readEvidenceFile(file)));
    _saveDraft(false);
    _refreshEvidenceState(key);
    UI.showToast('Foto asociada a la respuesta.', 'success');
  }

  function _readEvidenceFile(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        capturedAt: new Date().toISOString(),
        dataUrl: reader.result,
      });
      reader.readAsDataURL(file);
    });
  }

  function _getValue(path) {
    const [moduleId, fieldId] = path.split('.');
    return _data[moduleId]?.[fieldId];
  }

  function _fieldVisible(field) {
    if (!field.visibleWhen) return true;
    const current = _getValue(field.visibleWhen.field);
    if ('equals' in field.visibleWhen) return current === field.visibleWhen.equals;
    if ('not' in field.visibleWhen) return current !== field.visibleWhen.not;
    return true;
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _render() {
    const root = document.getElementById('mec-form-root');
    if (!root) return;

    const saved = _readSavedMeta();
    const implemented = MEC_SCHEMA.modules.filter(module => module.status !== 'planned');
    root.innerHTML = `
      <div class="mec-command">
        <div>
          <p class="mec-eyebrow">Replica CIALPA del cuestionario MEC</p>
          <h3>Carga tecnica guiada</h3>
          <p>Complete por etapas. La app guarda cada cambio y muestra solo lo necesario segun las respuestas.</p>
        </div>
        <div class="mec-command__stats">
          <div>
            <span>Avance</span>
            <strong id="mec-required-progress">0/0</strong>
          </div>
          <div>
            <span>Borrador</span>
            <strong id="mec-save-state">${saved ? _formatSavedAt(saved.savedAt) : 'Sin guardar'}</strong>
          </div>
        </div>
      </div>

      <div class="mec-shell">
        <aside class="mec-rail">
          <nav class="mec-stepper" aria-label="Modulos del cuestionario MEC">
            ${MEC_SCHEMA.modules.map((module, index) => _renderModuleNav(module, index)).join('')}
          </nav>
          <div class="mec-rail__actions">
            <button class="btn btn-primary btn-sm" onclick="MecFormModule.validate()">Validar etapa</button>
            <span class="mec-autosave-pill">Autoguardado siempre activo</span>
          </div>
          <div id="mec-validation-summary" class="mec-validation-summary"></div>
        </aside>

        <section class="mec-questionnaire">
          <div class="mec-stage-toolbar">
            <button class="btn btn-outline btn-sm" onclick="MecFormModule.previousModule()">Anterior</button>
            <span>${implemented.length} etapas activas en este prototipo</span>
            <button class="btn btn-primary btn-sm" onclick="MecFormModule.nextModule()">Siguiente</button>
          </div>
          ${MEC_SCHEMA.modules.map(_renderModule).join('')}
        </section>
      </div>`;

    _bindInputs(root);
    _bindSketch(root);
    _refreshDynamicState();
  }

  function _readSavedMeta() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function _formatSavedAt(iso) {
    if (!iso) return 'Sin guardar';
    return new Date(iso).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
  }

  function _renderModuleNav(module, index) {
    const planned = module.status === 'planned';
    const active = module.id === _activeModuleId;
    return `
      <button class="mec-step ${active ? 'mec-step--active' : ''} ${planned ? 'mec-step--planned' : ''}"
        type="button"
        ${planned ? 'disabled' : `onclick="MecFormModule.selectModule('${_escape(module.id)}')"`}
        data-step-module="${_escape(module.id)}">
        <span class="mec-step__number">${index + 1}</span>
        <span class="mec-step__text">
          <strong>${_escape(module.title)}</strong>
          <small data-module-progress="${_escape(module.id)}">${planned ? 'Proxima etapa' : '0/0'}</small>
        </span>
      </button>`;
  }

  function _renderModule(module) {
    const planned = module.status === 'planned';
    return `
      <article class="mec-module ${module.id === _activeModuleId ? 'mec-module--active' : ''}" data-module="${_escape(module.id)}">
        <header class="mec-module__header">
          <div>
            <p class="mec-eyebrow">${planned ? 'Proxima iteracion' : 'Etapa activa'}</p>
            <h3>${_escape(module.title)}</h3>
            <p>${_escape(module.description || '')}</p>
          </div>
          <span class="mec-module__badge" data-module-progress="${_escape(module.id)}">${planned ? 'Planificado' : '0/0'}</span>
        </header>
        <div class="mec-module__body ${planned ? 'mec-module__body--planned' : ''}">
          ${planned ? _renderPlannedModule(module) : _renderActiveModule(module)}
        </div>
      </article>`;
  }

  function _renderActiveModule(module) {
    if (module.kind === 'classroomSketch') return _renderClassroomSketchModule();
    if (module.kind === 'sanitaryList') return _renderSanitaryModule();
    if (module.id === 'bloques') return _renderBlockModule(module);
    if (!module.sections?.length) return _renderDevelopmentModule(module);
    return module.sections.map(section => _renderSection(module, section)).join('');
  }

  function _renderBlockModule(module) {
    _ensureBlocks();
    return `
      <section class="mec-section">
        <div class="mec-section__header">
          <h4>Bloques registrados</h4>
          <p class="mec-hint">Cada cambio se guarda automaticamente. Puede cambiar de bloque, volver y seguir editando sin usar botones de guardado.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.newBlock()">+ Nuevo bloque</button>
          <span class="mec-autosave-pill">Autoguardado</span>
        </div>
        <div class="mec-repeat-list">
          ${(_data.__blocks || []).map(block => `
            <button class="mec-repeat-item ${block.id === _data.__activeBlockId ? 'mec-repeat-item--active' : ''}" type="button"
              onclick="MecFormModule.selectBlock('${_escape(block.id)}')">
              <strong>${_escape(block.bloque_codigo || 'Bloque sin nombre')}</strong>
              <span>${_escape(_blockSummary(block))}</span>
            </button>`).join('')}
        </div>
      </section>
      ${module.sections.map(section => _renderSection(module, section)).join('')}`;
  }

  function _renderPlannedModule(module) {
    return `
      <div class="mec-planned">
        <p>Este modulo ya esta identificado en el manual y se incorporara en la siguiente iteracion del esquema.</p>
        <p class="text-muted">La primera prueba funcional cubre General y Servicios para validar motor, saltos, guardado y exportacion.</p>
      </div>`;
  }

  function _renderDevelopmentModule(module) {
    return `
      <div class="mec-planned">
        <p><strong>${_escape(module.title)} en desarrollo.</strong></p>
        <p class="text-muted">Esta etapa ya queda accesible en el recorrido para probar la navegacion completa desde celular. En la siguiente iteracion se incorporan sus campos, fotos y registros repetibles.</p>
      </div>`;
  }

  function _renderSection(module, section) {
    return `
      <section class="mec-section">
        <div class="mec-section__header">
          <h4>${_escape(section.title)}</h4>
        </div>
        <div class="mec-field-grid">
          ${section.fields.map(field => _renderField(module.id, field)).join('')}
        </div>
      </section>`;
  }

  function _renderField(moduleId, field) {
    const id = `mec_${moduleId}_${field.id}`;
    const value = _data[moduleId]?.[field.id] ?? '';
    const unit = field.unit ? `<span class="mec-unit">${_escape(field.unit)}</span>` : '';
    const required = field.required ? '<span class="mec-required">*</span>' : '';
    const hint = field.hint ? `<small class="mec-hint">${_escape(field.hint)}</small>` : '';

    if (field.type === 'radio') {
      return _wrapField(moduleId, field, `
        <div class="mec-options">
          ${field.options.map(option => `
            <label class="mec-option ${_choiceToneClass(option)}">
              <input type="radio" name="${id}" value="${_escape(option)}" ${value === option ? 'checked' : ''}>
              <span>${_escape(option)}</span>
            </label>`).join('')}
        </div>${hint}`);
    }

    if (field.type === 'checkbox') {
      const values = Array.isArray(value) ? value : [];
      return _wrapField(moduleId, field, `
        <div class="mec-options mec-options--columns">
          ${field.options.map(option => `
            <label class="mec-option">
              <input type="checkbox" value="${_escape(option)}" ${values.includes(option) ? 'checked' : ''}>
              <span>${_escape(option)}</span>
            </label>`).join('')}
        </div>${hint}`);
    }

    if (field.type === 'select') {
      return _wrapField(moduleId, field, `
        <input id="${id}" class="mec-choice-value" type="hidden" value="${_escape(value)}">
        <div class="mec-choice-buttons">
          ${field.options.map(option => `
            <button class="mec-choice mec-schema-choice ${_choiceToneClass(option)} ${value === option ? 'mec-choice--active' : ''}" type="button" data-choice-value="${_escape(option)}">
              ${_escape(option)}
            </button>`).join('')}
        </div>${hint}`);
    }

    if (field.type === 'textarea') {
      return _wrapField(moduleId, field, `
        <textarea id="${id}" class="form-control" rows="3">${_escape(value)}</textarea>${hint}`);
    }

    return _wrapField(moduleId, field, `
      <div class="mec-input-with-unit">
        <input id="${id}" type="${field.type || 'text'}" class="form-control" value="${_escape(value)}"
          ${field.min !== undefined ? `min="${_escape(field.min)}"` : ''}
          ${field.max !== undefined ? `max="${_escape(field.max)}"` : ''}
          ${field.step !== undefined ? `step="${_escape(field.step)}"` : ''}>
        ${unit}
      </div>${hint}`);
  }

  function _wrapField(moduleId, field, controlHtml) {
    const optional = field.required ? '' : '<span>Opcional</span>';
    const evidence = field.evidence ? _renderEvidenceControl(moduleId, field) : '';
    return `
      <div class="mec-field" data-module="${_escape(moduleId)}" data-field="${_escape(field.id)}">
        <label class="mec-label">
          <span>
            ${_escape(field.label)} ${field.required ? '<span class="mec-required">*</span>' : ''}
            <button class="mec-info-btn" type="button" title="Ver ayuda"
              onclick="MecFormModule.showFieldInfo('${_escape(moduleId)}', '${_escape(field.id)}')">i</button>
          </span>
          ${optional}
        </label>
        ${controlHtml}
        ${evidence}
        <div class="mec-error" data-error-for="${_escape(moduleId)}.${_escape(field.id)}"></div>
      </div>`;
  }

  function showFieldInfo(moduleId, fieldId) {
    const field = _findSchemaField(moduleId, fieldId);
    if (!field) return;
    const html = `
      <div class="mec-help-modal">
        <p>${_escape(_fieldHelpText(field))}</p>
        ${field.options ? `<p><strong>Opciones:</strong> ${field.options.map(_escape).join(', ')}</p>` : ''}
        ${field.hint ? `<p><strong>Nota:</strong> ${_escape(field.hint)}</p>` : ''}
        ${field.evidence ? `<p><strong>Evidencia:</strong> ${_escape(field.evidenceLabel || 'Se recomienda asociar foto.')}</p>` : ''}
        ${field.required ? '<p><strong>Campo obligatorio.</strong></p>' : '<p>Campo opcional, registre el dato si puede verificarlo.</p>'}
      </div>`;
    UI.showAlert(field.label, html, 'info');
  }

  function _findSchemaField(moduleId, fieldId) {
    const module = MEC_SCHEMA.modules.find(item => item.id === moduleId);
    if (!module) return null;
    for (const section of module.sections || []) {
      const found = (section.fields || []).find(field => field.id === fieldId);
      if (found) return found;
    }
    return null;
  }

  function _fieldHelpText(field) {
    if (field.help) return field.help;
    if (field.hint) return field.hint;
    if (field.type === 'radio' || field.type === 'select') return 'Seleccione la opcion que mejor describa la condicion observada en campo. Si no puede verificar, use la opcion mas prudente o registre observacion.';
    if (field.type === 'checkbox') return 'Marque todas las opciones presentes. Si ninguna aplica, deje sin marcar y agregue observacion si corresponde.';
    if (field.type === 'number') return 'Registre solo numeros verificados. Use unidades indicadas por el formulario y evite estimaciones si no puede sustentarlas.';
    if (field.type === 'textarea') return 'Use este espacio para aclaraciones breves, incidencias, referencias visibles o cualquier dato que ayude a revisar la respuesta.';
    return 'Complete el dato tal como fue verificado en el local. Si hay duda, registre una observacion o evidencia.';
  }

  function _renderEvidenceControl(moduleId, field) {
    const key = `${moduleId}.${field.id}`;
    const photos = _data.__evidence?.[key] || [];
    const inputId = `mec_photo_${moduleId}_${field.id}`;
    return `
      <div class="mec-evidence" data-evidence-key="${_escape(key)}">
        <input id="${_escape(inputId)}" class="mec-evidence-input" type="file" accept="image/*" capture="environment" multiple
          data-module="${_escape(moduleId)}" data-field="${_escape(field.id)}">
        <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('${_escape(inputId)}')?.click()">
          Sacar foto
        </button>
        <span class="mec-evidence__label">${_escape(field.evidenceLabel || 'Foto de respaldo')}</span>
        <small class="mec-evidence__state" data-evidence-state="${_escape(key)}">${_evidenceLabel(photos)}</small>
      </div>`;
  }

  function _evidenceLabel(photos) {
    if (!photos.length) return 'Sin foto asociada';
    if (photos.length === 1) return `1 foto: ${photos[0].name || 'evidencia'}`;
    return `${photos.length} fotos asociadas`;
  }

  function _refreshEvidenceState(key) {
    const state = document.querySelector(`[data-evidence-state="${key}"]`);
    if (!state) return;
    state.textContent = _evidenceLabel(_data.__evidence?.[key] || []);
  }

  function _renderClassroomSketchModule() {
    _ensureClassrooms();
    const sketch = _data.__classroomSketch || {};
    const classrooms = _data.__classrooms || [];
    return `
      <section class="mec-section mec-sketch">
        <div class="mec-section__header">
          <h4>Aulas y croquis dimensionales</h4>
          <p class="mec-hint">Cada aula queda guardada automaticamente como registro independiente. Al elegir un bloque puede ver y navegar sus aulas asociadas.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.newClassroom()">+ Nueva aula</button>
          <span class="mec-autosave-pill">Autoguardado</span>
        </div>
        ${_renderClassroomBlockNavigator()}
        <div class="mec-repeat-list">
          ${_orderedClassroomsForNavigator(classrooms).map((room, index) => `
            <button class="mec-repeat-item ${room.id === _activeClassroomId ? 'mec-repeat-item--active' : ''}" type="button"
              onclick="MecFormModule.selectClassroom('${_escape(room.id)}')">
              <strong>${_escape(room.name || `Aula ${index + 1}`)}</strong>
              <span>${_escape(_classroomSummary(room))}</span>
            </button>`).join('')}
        </div>
        <div class="mec-sketch__layout">
          <div class="mec-sketch__tools">
            <label class="mec-label"><span>Nombre / codigo del aula</span></label>
            <input class="form-control" type="text" value="${_escape(sketch.name || '')}" data-sketch-field="name" placeholder="Ej.: Aula 1, 2A, Inicial">
            <label class="mec-label"><span>Bloque</span></label>
            ${_blockOptions(sketch.blockId || _data.__activeBlockId || '')}
            <label class="mec-label"><span>Planta</span></label>
            <input class="form-control" type="text" value="${_escape(sketch.floor || 'PB')}" data-sketch-field="floor" placeholder="PB, 1, 2">
            <label class="mec-label"><span>Largo aproximado</span></label>
            <div class="mec-input-with-unit">
              <input class="form-control" type="number" min="0" step="0.1" value="${_escape(sketch.length || '')}" data-sketch-field="length">
              <span class="mec-unit">m</span>
            </div>
            <label class="mec-label"><span>Ancho aproximado</span></label>
            <div class="mec-input-with-unit">
              <input class="form-control" type="number" min="0" step="0.1" value="${_escape(sketch.width || '')}" data-sketch-field="width">
              <span class="mec-unit">m</span>
            </div>
            <label class="mec-label"><span>Aberturas / observaciones</span></label>
            <textarea class="form-control" rows="4" data-sketch-field="openings">${_escape(sketch.openings || '')}</textarea>
            <div class="mec-sketch__actions">
              <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.generateRoomSketch()">Generar aula base</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.editSelectedSketchObject()">Editar ficha</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.undoSketchObject()">Deshacer cambio</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.redoSketchObject()">Rehacer</button>
              <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteSelectedSketchObject()">Eliminar seleccionado</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.clearSketch()">Limpiar plano completo</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.exportPlanJson()">Exportar modelo JSON</button>
              <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.nextModule()">Continuar</button>
            </div>
          </div>
          <div class="mec-sketch__board">
            <div class="mec-sketch-zoom">
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.setSketchZoom(-0.15)">-</button>
              <span>${Math.round(_sketchZoom * 100)}%</span>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.setSketchZoom(0.15)">+</button>
            </div>
            <div class="mec-sketch-canvas-wrap">
              <canvas id="mec-classroom-canvas" width="760" height="460" style="transform:scale(${_sketchZoom});" aria-label="Croquis manual del aula"></canvas>
            </div>
            <div class="mec-sketch-toolset" aria-label="Elementos para insertar en el croquis">
              ${SKETCH_TOOLS.map(tool => `
                <button class="mec-sketch-tool ${_sketchTool === tool.id ? 'mec-sketch-tool--active' : ''}"
                  type="button" data-sketch-tool="${_escape(tool.id)}"
                  title="${_escape(tool.label)}"
                  onclick="MecFormModule.setSketchTool('${_escape(tool.id)}')">
                  <span class="mec-sketch-tool__icon" aria-hidden="true">${_sketchToolIcon(tool.id)}</span>
                  <span>${_escape(tool.label)}</span>
                </button>`).join('')}
            </div>
            <small id="mec-sketch-status">${_escape(_sketchStatusText(sketch))}</small>
            <div class="mec-block-preview">
              <strong>Ubicacion en bloque</strong>
              <canvas id="mec-block-preview-canvas" width="420" height="180" aria-label="Vista del aula dentro del bloque"></canvas>
            </div>
          </div>
        </div>
      </section>`;
  }

  function _sketchStatusText(sketch) {
    const count = (sketch.objects || []).length;
    const selected = _findSketchObjectById(_selectedSketchObjectId);
    const distances = selected ? _openingDistanceText(selected) : '';
    return `${count} elemento(s). Herramienta activa: ${_sketchToolLabel(_sketchTool)}. Doble clic o doble toque para agregar; clic simple selecciona y mueve.${distances ? ` Distancias: ${distances}.` : ''}`;
  }

  function _sketchToolLabel(toolId) {
    return SKETCH_TOOLS.find(tool => tool.id === toolId)?.label || toolId;
  }

  function _sketchToolIcon(toolId) {
    return {
      select: '&#x261D;',
      wall: '&#x2501;',
      door: '&#x25DC;',
      window: '&#x25AD;',
      stair: '&#x25EB;',
      board: '&#x25AC;',
      outlet: '&#x25C9;',
      damage: '!',
      photo: '&#x25C8;',
    }[toolId] || '+';
  }

  function _ensureClassrooms() {
    _data.__classrooms = _data.__classrooms || [];
    _ensureBlocks();
    if (!_data.__classrooms.length) {
      _data.__classroomSketch = _data.__classroomSketch || { name: 'Aula 1', objects: [] };
      _activeClassroomId = _activeClassroomId || _data.__classroomSketch.id || `aula_${Date.now()}`;
      _data.__classroomSketch.id = _activeClassroomId;
      _data.__classroomSketch.name = _data.__classroomSketch.name || 'Aula 1';
      _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
    }
    if (!_activeClassroomId || !_data.__classrooms.some(room => room.id === _activeClassroomId)) {
      _activeClassroomId = _data.__classrooms[0].id;
      _loadActiveClassroomIntoSketch();
    }
  }

  function _renderClassroomBlockNavigator() {
    _ensureBlocks();
    const blocks = _data.__blocks || [];
    if (!blocks.length) return '';
    return `
      <div class="mec-block-tabs" aria-label="Navegacion de bloques para aulas">
        ${blocks.map(block => {
          const count = (_data.__classrooms || []).filter(room => room.blockId === block.id).length;
          return `
            <button class="mec-block-tab ${block.id === _data.__activeBlockId ? 'mec-block-tab--active' : ''}" type="button"
              onclick="MecFormModule.selectBlockForClassrooms('${_escape(block.id)}')">
              <strong>${_escape(block.bloque_codigo || 'Bloque sin nombre')}</strong>
              <span>${count} aula(s)</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function _orderedClassroomsForNavigator(classrooms) {
    const activeBlockId = _data.__activeBlockId || '';
    return [...(classrooms || [])].sort((a, b) => {
      const aActive = a.blockId === activeBlockId ? 0 : 1;
      const bActive = b.blockId === activeBlockId ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
  }

  function _cloneClassroom(sketch) {
    return JSON.parse(JSON.stringify({
      id: sketch.id || `aula_${Date.now()}`,
      name: sketch.name || '',
      blockId: sketch.blockId || _data.__activeBlockId || '',
      floor: sketch.floor || 'PB',
      length: sketch.length || '',
      width: sketch.width || '',
      openings: sketch.openings || '',
      objects: sketch.objects || [],
    }));
  }

  function _syncActiveClassroomFromSketch() {
    _data.__classroomSketch = _data.__classroomSketch || {};
    _data.__classrooms = _data.__classrooms || [];
    _activeClassroomId = _activeClassroomId || _data.__classroomSketch.id || `aula_${Date.now()}`;
    _data.__classroomSketch.id = _activeClassroomId;
    const index = _data.__classrooms.findIndex(room => room.id === _activeClassroomId);
    const snapshot = _cloneClassroom(_data.__classroomSketch);
    if (index >= 0) _data.__classrooms[index] = snapshot;
    else _data.__classrooms.push(snapshot);
  }

  function _loadActiveClassroomIntoSketch() {
    const room = (_data.__classrooms || []).find(item => item.id === _activeClassroomId);
    if (!room) return;
    _data.__classroomSketch = _cloneClassroom(room);
  }

  function _classroomSummary(room) {
    const objects = room.objects || [];
    const parts = [];
    if (room.length && room.width) parts.push(`${room.length} x ${room.width} m`);
    const block = _blockById(room.blockId);
    if (block?.bloque_codigo) parts.push(block.bloque_codigo);
    if (room.floor) parts.push(room.floor);
    parts.push(`${objects.filter(object => object.type === 'door').length} pta.`);
    parts.push(`${objects.filter(object => object.type === 'window').length} vtna.`);
    parts.push(`${objects.filter(object => object.type === 'outlet').length} TC`);
    return parts.join(' · ');
  }

  function selectClassroom(id) {
    _syncActiveClassroomFromSketch();
    _activeClassroomId = id;
    _loadActiveClassroomIntoSketch();
    if (_data.__classroomSketch?.blockId) {
      _data.__activeBlockId = _data.__classroomSketch.blockId;
      const block = _blockById(_data.__activeBlockId);
      if (block) {
        const { id: _id, ...values } = block;
        _data.bloques = values;
      }
    }
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _render();
  }

  function newClassroom() {
    _syncActiveClassroomFromSketch();
    const nextNumber = (_data.__classrooms || []).length + 1;
    const block = _blockById(_data.__activeBlockId);
    const blockArea = Number(block?.largo_m || 0) * Number(block?.ancho_m || 0);
    const usedArea = block ? _blockAreaUsed(block.id) : 0;
    const remainingArea = Math.max(0, blockArea - usedArea);
    const suggestedWidth = Number(block?.ancho_m || 0);
    const suggestedLength = remainingArea && suggestedWidth ? remainingArea / suggestedWidth : '';
    _activeClassroomId = `aula_${Date.now()}`;
    _data.__classroomSketch = {
      id: _activeClassroomId,
      name: `Aula ${nextNumber}`,
      blockId: _data.__activeBlockId || '',
      floor: 'PB',
      length: suggestedLength ? suggestedLength.toFixed(1) : '',
      width: suggestedWidth ? suggestedWidth.toFixed(1) : '',
      openings: '',
      objects: [],
    };
    _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _render();
    UI.showToast(remainingArea ? 'Nueva aula ubicada sobre el area restante estimada del bloque.' : 'Nueva aula lista para cargar.', 'success');
  }

  function saveCurrentClassroom() {
    _syncActiveClassroomFromSketch();
    _saveDraft(true);
    renderSchoolPlan();
  }

  function _ensureBlocks() {
    _data.__blocks = _data.__blocks || [];
    _data.bloques = _data.bloques || {};
    if (!_data.__activeBlockId) _data.__activeBlockId = _data.__blocks[0]?.id || `bloque_${Date.now()}`;
    if (!_data.__blocks.length) {
      _data.__blocks.push({ id: _data.__activeBlockId, ..._data.bloques });
    }
  }

  function _syncActiveBlock() {
    _ensureBlocks();
    const block = { id: _data.__activeBlockId, ...(_data.bloques || {}) };
    const index = _data.__blocks.findIndex(item => item.id === block.id);
    if (index >= 0) _data.__blocks[index] = block;
    else _data.__blocks.push(block);
  }

  function _blockSummary(block) {
    return [
      block.cantidad_plantas ? `${block.cantidad_plantas} planta(s)` : '',
      block.largo_m && block.ancho_m ? `${block.largo_m} x ${block.ancho_m} m` : '',
      block.tipo_circulacion || '',
    ].filter(Boolean).join(' · ') || 'Pendiente de completar';
  }

  function _blockById(id) {
    return (_data.__blocks || []).find(block => block.id === id) || null;
  }

  function _activeClassroomBlock() {
    return _blockById(_data.__classroomSketch?.blockId || _data.__activeBlockId);
  }

  function _blockAreaUsed(blockId, exceptClassroomId = null) {
    return (_data.__classrooms || [])
      .filter(room => room.blockId === blockId && room.id !== exceptClassroomId)
      .reduce((sum, room) => sum + Number(room.length || 0) * Number(room.width || 0), 0);
  }

  function _blockOptions(selected) {
    _ensureBlocks();
    return `
      <select class="form-control" data-sketch-field="blockId">
        ${(_data.__blocks || []).map(block => `<option value="${_escape(block.id)}" ${block.id === selected ? 'selected' : ''}>${_escape(block.bloque_codigo || 'Bloque sin nombre')}</option>`).join('')}
      </select>`;
  }

  function selectBlock(id) {
    _syncActiveBlock();
    const block = (_data.__blocks || []).find(item => item.id === id);
    if (!block) return;
    _data.__activeBlockId = id;
    const { id: _id, ...values } = block;
    _data.bloques = values;
    _saveDraft(false);
    _render();
  }

  function selectBlockForClassrooms(id) {
    _syncActiveClassroomFromSketch();
    selectBlock(id);
    const room = (_data.__classrooms || []).find(item => item.blockId === id);
    if (!room) {
      _selectedSketchObjectId = null;
      UI.showToast('Bloque seleccionado. Pulse + Nueva aula para cargar su primera aula.', 'info');
      return;
    }
    _activeClassroomId = room.id;
    _loadActiveClassroomIntoSketch();
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _render();
  }

  function newBlock() {
    _syncActiveBlock();
    const next = (_data.__blocks || []).length + 1;
    _data.__activeBlockId = `bloque_${Date.now()}`;
    _data.bloques = { bloque_codigo: `Bloque ${next}`, cantidad_plantas: '1' };
    _data.__blocks.push({ id: _data.__activeBlockId, ..._data.bloques });
    _saveDraft(false);
    _render();
    UI.showToast('Nuevo bloque listo para cargar.', 'success');
  }

  function saveCurrentBlock() {
    _syncActiveBlock();
    _saveDraft(true);
    _render();
  }

  function _ensureSanitaries() {
    _data.__sanitaries = _data.__sanitaries || [];
  }

  function _sanitaryTemplate(index = 1) {
    return {
      id: `san_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      codigo: `Sanitario ${index}`,
      bloque: '',
      planta: 'PB',
      tipo: 'Bateria sanitaria',
      uso: 'Estudiantes',
      genero: 'Mixto',
      inodoros: '',
      lavamanos: '',
      urinarios: '',
      duchas: '',
      largo_m: '',
      ancho_m: '',
      accesible: 'No',
      agua: 'Si',
      desague: '',
      ventilacion: 'Natural',
      iluminacion: 'Natural',
      estado: '',
      limpieza: '',
      privacidad: '',
      observacion: '',
      evidencias: [],
      plano: { cabinas: [] },
    };
  }

  function _renderSanitaryChoice(name, id, options, selected) {
    return `
      <div class="mec-choice-buttons">
        ${options.map(option => `
          <button class="mec-choice ${_choiceToneClass(option)} ${selected === option ? 'mec-choice--active' : ''}" type="button"
            onclick="MecFormModule.setSanitaryValue('${_escape(id)}', '${_escape(name)}', '${_escape(option)}')">
            ${_escape(option)}
          </button>`).join('')}
      </div>`;
  }

  function _renderSanitaryModule() {
    _ensureSanitaries();
    const items = _data.__sanitaries;
    return `
      <section class="mec-section mec-sanitary">
        <div class="mec-section__header">
          <h4>Sanitarios y saneamiento</h4>
          <p class="mec-hint">Registre cada bano, bateria sanitaria o sanitario accesible como elemento independiente, con cantidades, estado y evidencia.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.addSanitary()">+ Agregar sanitario</button>
        </div>
        <div class="mec-sanitary-list">
          ${items.length ? items.map(_renderSanitaryCard).join('') : '<p class="text-muted">Todavia no hay sanitarios cargados.</p>'}
        </div>
      </section>`;
  }

  function _renderSanitaryCard(item, index) {
    const evidenceId = `sanitary-photo-${_escape(item.id)}`;
    return `
      <article class="mec-sanitary-card">
        <div class="mec-sanitary-card__header">
          <div>
            <strong>${_escape(item.codigo || `Sanitario ${index + 1}`)}</strong>
            <span>${_escape([item.bloque, item.planta, item.uso, item.genero].filter(Boolean).join(' · '))}</span>
          </div>
          <button class="btn btn-xs btn-danger" type="button" onclick="MecFormModule.deleteSanitary('${_escape(item.id)}')">Eliminar</button>
        </div>

        <div class="form-grid">
          ${_sanitaryInput(item, 'codigo', 'Codigo / nombre', 'text')}
          ${_sanitaryInput(item, 'bloque', 'Bloque', 'text')}
          ${_sanitaryInput(item, 'planta', 'Planta', 'text')}
          ${_sanitaryInput(item, 'tipo', 'Tipo', 'text')}
          ${_sanitaryInput(item, 'largo_m', 'Largo del sanitario', 'number', '0.1')}
          ${_sanitaryInput(item, 'ancho_m', 'Ancho del sanitario', 'number', '0.1')}
          ${_sanitaryInput(item, 'inodoros', 'Inodoros', 'number')}
          ${_sanitaryInput(item, 'lavamanos', 'Lavamanos', 'number')}
          ${_sanitaryInput(item, 'urinarios', 'Urinarios', 'number')}
          ${_sanitaryInput(item, 'duchas', 'Duchas', 'number')}
        </div>

        <div class="mec-sanitary-plan">
          <div class="mec-sanitary-plan__header">
            <div>
              <strong>Croquis del sanitario</strong>
              <span>Cabinas internas segun inodoros registrados</span>
            </div>
            <div>
              <button class="btn btn-xs btn-outline" type="button" onclick="MecFormModule.regenerateSanitaryPlan('${_escape(item.id)}')">Regenerar</button>
              <button class="btn btn-xs btn-outline" type="button" onclick="MecFormModule.addSanitaryStall('${_escape(item.id)}')">+ Cabina</button>
              <button class="btn btn-xs btn-danger" type="button" onclick="MecFormModule.deleteSanitaryStall('${_escape(item.id)}')">Eliminar cabina</button>
            </div>
          </div>
          ${_renderSanitarySketch(item)}
        </div>

        <div class="mec-sanitary-groups">
          <div>
            <label class="mec-label"><span>Uso principal</span></label>
            ${_renderSanitaryChoice('uso', item.id, ['Estudiantes', 'Docentes', 'Administrativo', 'Publico', 'Otro'], item.uso)}
          </div>
          <div>
            <label class="mec-label"><span>Genero / destino</span></label>
            ${_renderSanitaryChoice('genero', item.id, ['Mujeres', 'Varones', 'Mixto', 'Inclusivo', 'No definido'], item.genero)}
          </div>
          <div>
            <label class="mec-label"><span>Accesible</span></label>
            ${_renderSanitaryChoice('accesible', item.id, ['Si, cumple', 'Si, parcial', 'No', 'No verificable'], item.accesible)}
          </div>
          <div>
            <label class="mec-label"><span>Cuenta con agua</span></label>
            ${_renderSanitaryChoice('agua', item.id, ['Si', 'Intermitente', 'No'], item.agua)}
          </div>
          <div>
            <label class="mec-label"><span>Estado general</span></label>
            ${_renderSanitaryChoice('estado', item.id, ['Bueno', 'Regular', 'Malo', 'Fuera de servicio'], item.estado)}
          </div>
          <div>
            <label class="mec-label"><span>Limpieza</span></label>
            ${_renderSanitaryChoice('limpieza', item.id, ['Buena', 'Regular', 'Mala', 'No verificable'], item.limpieza)}
          </div>
          <div>
            <label class="mec-label"><span>Privacidad</span></label>
            ${_renderSanitaryChoice('privacidad', item.id, ['Adecuada', 'Parcial', 'Deficiente', 'Sin puertas'], item.privacidad)}
          </div>
          <div>
            <label class="mec-label"><span>Desague</span></label>
            ${_renderSanitaryChoice('desague', item.id, ['Red cloacal', 'Camara septica', 'Pozo ciego', 'Letrina', 'Otro', 'No verificable'], item.desague)}
          </div>
        </div>

        <label class="mec-label"><span>Observacion</span></label>
        <textarea class="form-control" rows="2"
          oninput="MecFormModule.setSanitaryValue('${_escape(item.id)}', 'observacion', this.value, false)"
          onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', 'observacion', this.value)">${_escape(item.observacion || '')}</textarea>

        <div class="mec-object-evidence">
          <input id="${evidenceId}" type="file" accept="image/*" capture="environment" multiple style="display:none;"
            onchange="MecFormModule.setSanitaryEvidence('${_escape(item.id)}', this)">
          <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('${evidenceId}')?.click()">Sacar foto</button>
          <span>${(item.evidencias || []).length ? `${item.evidencias.length} foto(s) asociada(s)` : 'Sin foto asociada'}</span>
        </div>
      </article>`;
  }

  function _sanitaryInput(item, key, label, type, step = '1') {
    return `
      <div class="form-group">
        <label>${_escape(label)}</label>
        <input class="form-control" type="${_escape(type)}" min="0" step="${_escape(step)}" value="${_escape(item[key] || '')}"
          oninput="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value, false)"
          onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value)">
      </div>`;
  }

  function _ensureSanitaryPlan(item, force = false) {
    item.plano = item.plano || {};
    item.plano.cabinas = Array.isArray(item.plano.cabinas) ? item.plano.cabinas : [];
    const target = Math.max(0, Number(item.inodoros || 0));
    if (force || item.plano.cabinas.length !== target) {
      item.plano.cabinas = Array.from({ length: target }, (_, index) => ({
        id: `cab_${index + 1}`,
        label: `Cabina ${index + 1}`,
        artefacto: 'Inodoro',
        estado: item.estado || '',
      }));
    }
    return item.plano;
  }

  function _renderSanitarySketch(item) {
    const plan = _ensureSanitaryPlan(item);
    const stalls = plan.cabinas || [];
    const length = Number(item.largo_m || 0);
    const width = Number(item.ancho_m || 0);
    const count = stalls.length;
    const innerX = 18;
    const innerY = 34;
    const innerW = 384;
    const innerH = 142;
    const stallW = count ? innerW / count : innerW;
    const lavCount = Math.max(0, Number(item.lavamanos || 0));
    const urinalCount = Math.max(0, Number(item.urinarios || 0));
    return `
      <svg class="mec-sanitary-svg" viewBox="0 0 420 220" role="img" aria-label="Croquis sanitario ${_escape(item.codigo || '')}">
        <rect x="8" y="8" width="404" height="204" rx="4" fill="#fbfcfe" stroke="#172033" stroke-width="3"/>
        <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="rgba(43,108,176,.05)" stroke="#8db8e8" stroke-width="1.5"/>
        <text x="18" y="24" font-size="12" font-weight="800" fill="#172033">${_escape(item.codigo || 'Sanitario')}</text>
        <text x="402" y="24" text-anchor="end" font-size="10" font-weight="800" fill="#667085">${length && width ? `${length} x ${width} m` : 'Sin medidas'}</text>
        ${count ? stalls.map((stall, index) => {
          const x = innerX + index * stallW;
          const w = Math.max(18, stallW);
          return `
            <rect x="${x}" y="${innerY}" width="${w}" height="${innerH}" fill="rgba(232,76,34,.07)" stroke="#d98b73" stroke-width="1.5"/>
            <line x1="${x + w - 14}" y1="${innerY + innerH}" x2="${x + w - 14}" y2="${innerY + innerH - 32}" stroke="#2f855a" stroke-width="2"/>
            <path d="M ${x + w - 14} ${innerY + innerH} A 28 28 0 0 0 ${x + w - 42} ${innerY + innerH - 28}" fill="none" stroke="#2f855a" stroke-dasharray="3 3" stroke-width="1.5"/>
            <ellipse cx="${x + w / 2}" cy="${innerY + 46}" rx="${Math.min(18, w / 4)}" ry="13" fill="#fff" stroke="#475467" stroke-width="1.5"/>
            <text x="${x + w / 2}" y="${innerY + 92}" text-anchor="middle" font-size="9" font-weight="800" fill="#475467">${_escape(stall.label || `Cabina ${index + 1}`)}</text>`;
        }).join('') : `
          <text x="210" y="104" text-anchor="middle" font-size="13" font-weight="800" fill="#667085">Indique cantidad de inodoros para generar cabinas</text>`}
        ${Array.from({ length: lavCount }).map((_, index) => {
          const x = 36 + index * 30;
          return `<rect x="${x}" y="184" width="20" height="14" rx="3" fill="#fff" stroke="#2b6cb0" stroke-width="1.5"/>`;
        }).join('')}
        ${Array.from({ length: urinalCount }).map((_, index) => {
          const x = 286 + index * 24;
          return `<path d="M ${x} 184 h16 v18 q-8 8 -16 0 z" fill="#fff" stroke="#805ad5" stroke-width="1.5"/>`;
        }).join('')}
        <text x="18" y="204" font-size="9" font-weight="800" fill="#667085">Lavamanos: ${lavCount} · Urinarios: ${urinalCount} · Accesible: ${_escape(item.accesible || 'No')}</text>
      </svg>`;
  }

  function addSanitary() {
    _ensureSanitaries();
    const item = _sanitaryTemplate(_data.__sanitaries.length + 1);
    _ensureSanitaryPlan(item, true);
    _data.__sanitaries.push(item);
    _saveDraft(false);
    _render();
    UI.showToast('Sanitario agregado.', 'success');
  }

  function setSanitaryValue(id, key, value, rerender = true) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    item[key] = value;
    if (rerender && ['inodoros', 'estado'].includes(key)) _ensureSanitaryPlan(item, true);
    _saveDraft(false);
    if (rerender) _render();
  }

  function regenerateSanitaryPlan(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    _ensureSanitaryPlan(item, true);
    _saveDraft(false);
    _render();
    UI.showToast('Croquis sanitario regenerado segun inodoros.', 'success');
  }

  function addSanitaryStall(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    _ensureSanitaryPlan(item);
    const next = item.plano.cabinas.length + 1;
    item.plano.cabinas.push({ id: `cab_${Date.now()}`, label: `Cabina ${next}`, artefacto: 'Inodoro', estado: item.estado || '' });
    item.inodoros = String(Math.max(Number(item.inodoros || 0), item.plano.cabinas.length));
    _saveDraft(false);
    _render();
  }

  async function deleteSanitaryStall(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    _ensureSanitaryPlan(item);
    if (!item.plano.cabinas.length) {
      UI.showToast('No hay cabinas para eliminar.', 'info');
      return;
    }
    const confirmed = await UI.showConfirm('Eliminar cabina', '¿Confirma eliminar la ultima cabina del croquis sanitario?');
    if (!confirmed) return;
    item.plano.cabinas.pop();
    item.inodoros = String(item.plano.cabinas.length);
    _saveDraft(false);
    _render();
  }

  async function setSanitaryEvidence(id, input) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    item.evidencias = await Promise.all([...input.files].map(file => _readEvidenceFile(file)));
    _saveDraft(false);
    _render();
    UI.showToast('Foto asociada al sanitario.', 'success');
  }

  async function deleteSanitary(id) {
    const confirmed = await UI.showConfirm('Eliminar sanitario', '¿Desea quitar este sanitario del relevamiento?');
    if (!confirmed) return;
    _data.__sanitaries = (_data.__sanitaries || []).filter(sanitary => sanitary.id !== id);
    _saveDraft(false);
    _render();
  }

  function _bindInputs(root) {
    root.querySelectorAll('.mec-evidence-input').forEach(input => {
      input.addEventListener('change', () => _setEvidenceFiles(input.dataset.module, input.dataset.field, input.files || []));
    });

    root.querySelectorAll('.mec-field').forEach(fieldEl => {
      const moduleId = fieldEl.dataset.module;
      const fieldId = fieldEl.dataset.field;
      const input = fieldEl.querySelector('input, select, textarea');
      if (!input) return;

      const schemaChoices = fieldEl.querySelectorAll('.mec-schema-choice');
      if (schemaChoices.length) {
        schemaChoices.forEach(button => {
          button.addEventListener('click', () => {
            const value = button.dataset.choiceValue || '';
            input.value = value;
            schemaChoices.forEach(item => item.classList.toggle('mec-choice--active', item === button));
            _setValue(moduleId, fieldId, value);
          });
        });
        return;
      }

      if (input.type === 'radio') {
        fieldEl.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', () => _setValue(moduleId, fieldId, radio.value));
        });
        return;
      }

      if (input.type === 'checkbox') {
        fieldEl.querySelectorAll('input[type="checkbox"]').forEach(box => {
          box.addEventListener('change', () => {
            const values = [...fieldEl.querySelectorAll('input[type="checkbox"]:checked')].map(el => el.value);
            _setValue(moduleId, fieldId, values);
          });
        });
        return;
      }

      input.addEventListener('input', () => _setValue(moduleId, fieldId, input.value));
    });
  }

  function _bindSketch(root) {
    const canvas = root.querySelector('#mec-classroom-canvas');
    if (!canvas) return;

    root.querySelectorAll('[data-sketch-field]').forEach(input => {
      const persist = () => {
        _data.__classroomSketch = _data.__classroomSketch || {};
        _data.__classroomSketch[input.dataset.sketchField] = input.value;
        _syncActiveClassroomFromSketch();
        _saveDraft(false);
        if (input.dataset.sketchField === 'blockId') {
          _data.__activeBlockId = input.value;
          const block = _blockById(input.value);
          if (block) {
            const { id: _id, ...values } = block;
            _data.bloques = values;
          }
        }
        _updateSketchStatus();
        renderSchoolPlan();
      };
      input.addEventListener('input', persist);
      input.addEventListener('change', persist);
    });

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let draftObject = null;
    let movingObject = null;
    let resizingObject = null;
    let rotatingObject = null;
    let moveOffset = null;
    let mutationRecorded = false;
    let lastTap = { time: 0, point: null };
    const pointFromEvent = event => {
      const rect = canvas.getBoundingClientRect();
      const source = event.touches?.[0] || event.changedTouches?.[0] || event;
      return {
        x: Math.round((source.clientX - rect.left) * (canvas.width / rect.width)),
        y: Math.round((source.clientY - rect.top) * (canvas.height / rect.height)),
      };
    };
    const begin = event => {
      event.preventDefault();
      _ensureSketchObjects();
      const point = pointFromEvent(event);

      const rotateHit = _findOpeningRotateHandleAt(point);
      const handleHit = _findResizeHandleAt(point);
      const selected = rotateHit || handleHit?.object || _findSketchObjectAt(point);
      _selectedSketchObjectId = selected?.id || null;
      if (rotateHit) {
        rotatingObject = rotateHit;
        _pushSketchHistory();
        _rotateOpeningToNextWall(rotatingObject);
        _saveDraft(false);
        _announceOpeningDistances(rotatingObject);
        rotatingObject = null;
      } else if (handleHit) {
        resizingObject = handleHit;
        mutationRecorded = false;
      } else if (selected) {
        movingObject = selected;
        moveOffset = _moveOffsetForObject(selected, point);
        mutationRecorded = false;
      }
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
    };
    const move = event => {
      event.preventDefault();
      const point = pointFromEvent(event);
      if (resizingObject) {
        if (!mutationRecorded) {
          _pushSketchHistory();
          mutationRecorded = true;
        }
        _resizeSketchObject(resizingObject.object, point, resizingObject.handle);
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        return;
      }
      if (movingObject) {
        if (!mutationRecorded) {
          _pushSketchHistory();
          mutationRecorded = true;
        }
        _moveSketchObject(movingObject, point, moveOffset);
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        return;
      }
      if (!drawing || !draftObject) return;
      draftObject = _newSketchObject(_sketchTool, draftObject.start, point, draftObject.id);
      _drawSketch(ctx, canvas, draftObject);
    };
    const end = event => {
      event.preventDefault();
      if (resizingObject) {
        const changed = resizingObject.object;
        resizingObject = null;
        _saveDraft(false);
        _updateSketchStatus();
        _announceOpeningDistances(changed);
        return;
      }
      if (rotatingObject) {
        rotatingObject = null;
        return;
      }
      if (movingObject) {
        const changed = movingObject;
        movingObject = null;
        moveOffset = null;
        _saveDraft(false);
        _updateSketchStatus();
        _announceOpeningDistances(changed);
        return;
      }
      if (!drawing || !draftObject) return;
      drawing = false;
      _ensureSketchObjects();
      _pushSketchHistory();
      _data.__classroomSketch.objects.push(_normalizeSketchObject(draftObject));
      _selectedSketchObjectId = draftObject.id;
      const createdId = draftObject.id;
      draftObject = null;
      _saveDraft(false);
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
      const created = _findSketchObjectById(createdId);
      _announceOpeningDistances(created);
      if (created && _hasSketchFicha(created)) setTimeout(() => openSketchObjectFicha(created.id), 420);
    };
    const createAt = event => {
      event.preventDefault();
      const point = pointFromEvent(event);
      const selected = _findSketchObjectAt(point);
      if (selected) {
        _selectedSketchObjectId = selected.id;
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        if (_hasSketchFicha(selected)) openSketchObjectFicha(selected.id);
        return;
      }
      if (_sketchTool === 'select') return;
      _pushSketchHistory();
      _createSketchObjectAt(point);
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
    };
    const touchEnd = event => {
      const now = Date.now();
      const point = pointFromEvent(event);
      const isDoubleTap = lastTap.point &&
        now - lastTap.time < 340 &&
        Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < 28;
      end(event);
      if (isDoubleTap) {
        const selected = _findSketchObjectAt(point);
        if (selected) {
          _selectedSketchObjectId = selected.id;
          _drawSketch(ctx, canvas);
          _updateSketchStatus();
          if (_hasSketchFicha(selected)) openSketchObjectFicha(selected.id);
          lastTap = { time: 0, point: null };
          return;
        }
        if (_sketchTool === 'select') {
          lastTap = { time: 0, point: null };
          return;
        }
        _pushSketchHistory();
        _createSketchObjectAt(point);
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        lastTap = { time: 0, point: null };
        return;
      }
      lastTap = { time: now, point };
    };

    canvas.addEventListener('mousedown', begin);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('dblclick', createAt);
    canvas.addEventListener('touchstart', begin, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    _drawSketch(ctx, canvas);
    _drawBlockPreview();
  }

  function _drawSketch(ctx, canvas, draftObject = null) {
    _ensureSketchObjects();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fbfcfe';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 20; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 20; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    _data.__classroomSketch.objects.forEach(object => _drawSketchObject(ctx, object));
    if (draftObject) _drawSketchObject(ctx, draftObject, true);
  }

  function _ensureSketchObjects() {
    _data.__classroomSketch = _data.__classroomSketch || {};
    _data.__classroomSketch.objects = _data.__classroomSketch.objects || [];
  }

  function _cloneSketchState() {
    return JSON.parse(JSON.stringify(_data.__classroomSketch || { objects: [] }));
  }

  function _pushSketchHistory() {
    _ensureSketchObjects();
    _sketchHistory.push(_cloneSketchState());
    if (_sketchHistory.length > 40) _sketchHistory.shift();
    _sketchRedo.length = 0;
  }

  function _restoreSketchState(snapshot) {
    if (!snapshot) return;
    _data.__classroomSketch = JSON.parse(JSON.stringify(snapshot));
    _selectedSketchObjectId = null;
    _syncActiveClassroomFromSketch();
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
  }

  function _newSketchObject(type, start, end, existingId = null) {
    const id = existingId || `sk_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    if (type === 'wall') {
      return { id, type, start, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    }
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(24, Math.abs(end.x - start.x));
    const h = Math.max(18, Math.abs(end.y - start.y));
    if (type === 'outlet' || type === 'photo') {
      return { id, type, start, x: end.x, y: end.y, r: _sketchPointRadius(type), ficha: {} };
    }
    return _clampOpeningToRoom({ id, type, start, x, y, w, h: type === 'door' ? 8 : h, ficha: {} });
  }

  function _createSketchObjectAt(point) {
    if (_sketchTool === 'select') return;
    _ensureSketchObjects();
    const id = `sk_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    let object;
    if (_sketchTool === 'wall') {
      object = { id, type: 'wall', x1: point.x - 42, y1: point.y, x2: point.x + 42, y2: point.y };
    } else if (_sketchTool === 'outlet' || _sketchTool === 'photo') {
      object = { id, type: _sketchTool, x: point.x, y: point.y, r: _sketchPointRadius(_sketchTool), ficha: {} };
    } else {
      const size = _defaultSketchSize(_sketchTool);
      object = {
        id,
        type: _sketchTool,
        x: Math.round(point.x - size.w / 2),
        y: Math.round(point.y - size.h / 2),
        w: size.w,
        h: size.h,
        ficha: {},
      };
    }
    object = _clampOpeningToRoom(object);
    _data.__classroomSketch.objects.push(object);
    _selectedSketchObjectId = object.id;
    _saveDraft(false);
    _announceOpeningDistances(object);
    if (_hasSketchFicha(object)) setTimeout(() => openSketchObjectFicha(object.id), 420);
  }

  function _defaultSketchSize(type) {
    return {
      door: { w: 56, h: 8 },
      window: { w: 86, h: 18 },
      stair: { w: 90, h: 54 },
      board: { w: 112, h: 34 },
      damage: { w: 58, h: 38 },
      room: { w: 240, h: 160 },
    }[type] || { w: 54, h: 28 };
  }

  function _normalizeSketchObject(object) {
    const normalized = { ...object };
    delete normalized.start;
    return normalized;
  }

  function _drawSketchObject(ctx, object, isDraft = false) {
    const selected = object.id === _selectedSketchObjectId;
    const style = _sketchStyle(object.type);
    ctx.save();
    ctx.globalAlpha = isDraft ? .62 : 1;
    ctx.lineWidth = selected ? 4 : style.lineWidth;
    ctx.strokeStyle = selected ? '#111827' : style.stroke;
    ctx.fillStyle = style.fill;
    ctx.lineCap = 'round';

    if (object.type === 'wall') {
      ctx.beginPath();
      ctx.moveTo(object.x1, object.y1);
      ctx.lineTo(object.x2, object.y2);
      ctx.stroke();
      _labelSketchObject(ctx, object, _sketchObjectLabel(object), (object.x1 + object.x2) / 2, ((object.y1 + object.y2) / 2) - 18);
      ctx.restore();
      return;
    }

    if (object.type === 'room') {
      _drawRoomObject(ctx, object, selected);
      ctx.restore();
      return;
    }

    if (object.type === 'door') {
      _drawDoorObject(ctx, object, selected);
      if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
      if (selected) _drawOpeningRotateHandle(ctx, object);
      ctx.restore();
      return;
    }

    if (object.type === 'stair') {
      _drawStairObject(ctx, object, selected);
      if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
      ctx.restore();
      return;
    }

    if (object.type === 'outlet' || object.type === 'photo') {
      const radius = _sketchPointRadius(object.type);
      ctx.beginPath();
      ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      _labelSketchObject(ctx, object, object.type === 'photo' ? 'Foto' : 'TC', object.x, object.y + (object.type === 'outlet' ? 22 : 28));
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.rect(object.x, object.y, object.w, object.h);
    ctx.fill();
    ctx.stroke();
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
    if (object.type === 'window') _labelSketchObject(ctx, object, _openingDistanceText(object), object.x + object.w / 2, object.y + object.h + 16, true);
    if (object.type === 'window' && selected) _drawOpeningCornerGuides(ctx, object);
    if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
    if (object.type === 'window' && selected) _drawOpeningRotateHandle(ctx, object);
    ctx.restore();
  }

  function _drawRoomObject(ctx, object, selected) {
    const style = _sketchStyle('room');
    ctx.fillStyle = style.fill;
    ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.strokeStyle = selected ? '#111827' : style.stroke;
    ctx.lineWidth = selected ? 4 : style.lineWidth;
    ctx.strokeRect(object.x, object.y, object.w, object.h);
    ctx.strokeStyle = 'rgba(23,32,51,.72)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(object.x + 7, object.y + 7, Math.max(0, object.w - 14), Math.max(0, object.h - 14));
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
    if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
  }

  function _drawDoorObject(ctx, object, selected) {
    const swing = object.ficha?.abre_hacia === 'Exterior' ? -1 : 1;
    const vertical = _openingSide(object) === 'left' || _openingSide(object) === 'right';
    const thickness = 8;
    if (vertical) object.w = thickness;
    else object.h = thickness;
    const length = vertical ? object.h : object.w;
    const hingeX = object.x + (_openingSide(object) === 'right' ? thickness : 0);
    const hingeY = object.y + (_openingSide(object) === 'bottom' ? thickness : 0);
    const radius = Math.max(18, length);
    ctx.fillStyle = selected ? 'rgba(47,133,90,.28)' : 'rgba(47,133,90,.16)';
    ctx.strokeStyle = selected ? '#111827' : '#2f855a';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.strokeRect(object.x, object.y, object.w, object.h);
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    const angles = _doorSwingAngles(object, swing);
    ctx.arc(hingeX, hingeY, radius, angles.start, angles.end, angles.ccw);
    ctx.closePath();
    ctx.fillStyle = selected ? 'rgba(47,133,90,.16)' : 'rgba(47,133,90,.09)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(hingeX + Math.cos(angles.leaf) * radius, hingeY + Math.sin(angles.leaf) * radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, radius, angles.start, angles.end, angles.ccw);
    ctx.strokeStyle = selected ? '#111827' : 'rgba(47,133,90,.75)';
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
    _labelSketchObject(ctx, object, _openingDistanceText(object), object.x + object.w / 2, object.y + object.h + 18, true);
    if (selected) _drawOpeningCornerGuides(ctx, object);
  }

  function _doorSwingAngles(object, swing) {
    const side = _openingSide(object);
    const inward = swing > 0;
    if (side === 'left') return { start: 0, end: inward ? Math.PI / 2 : -Math.PI / 2, leaf: inward ? Math.PI / 2 : -Math.PI / 2, ccw: !inward };
    if (side === 'right') return { start: Math.PI, end: inward ? Math.PI / 2 : Math.PI * 1.5, leaf: inward ? Math.PI / 2 : Math.PI * 1.5, ccw: inward };
    if (side === 'bottom') return { start: -Math.PI / 2, end: inward ? Math.PI : 0, leaf: inward ? Math.PI : 0, ccw: !inward };
    return { start: Math.PI / 2, end: inward ? 0 : Math.PI, leaf: inward ? 0 : Math.PI, ccw: inward };
  }

  function _drawStairObject(ctx, object, selected) {
    const steps = Math.max(4, Math.round(object.w / 14));
    const stepW = object.w / steps;
    ctx.fillStyle = selected ? 'rgba(74,85,104,.22)' : 'rgba(74,85,104,.14)';
    ctx.strokeStyle = selected ? '#111827' : '#4a5568';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.strokeRect(object.x, object.y, object.w, object.h);
    ctx.lineWidth = 1.5;
    for (let i = 1; i < steps; i += 1) {
      const x = object.x + i * stepW;
      ctx.beginPath();
      ctx.moveTo(x, object.y);
      ctx.lineTo(x, object.y + object.h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(object.x + 8, object.y + object.h - 10);
    ctx.lineTo(object.x + object.w - 10, object.y + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(object.x + object.w - 18, object.y + 10);
    ctx.lineTo(object.x + object.w - 10, object.y + 10);
    ctx.lineTo(object.x + object.w - 10, object.y + 18);
    ctx.stroke();
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
  }

  function _sketchStyle(type) {
    return {
      room: { stroke: '#172033', fill: 'rgba(226,232,240,.28)', lineWidth: 4 },
      wall: { stroke: '#172033', fill: 'transparent', lineWidth: 5 },
      door: { stroke: '#2f855a', fill: 'rgba(47,133,90,.16)', lineWidth: 3 },
      window: { stroke: '#2b6cb0', fill: 'rgba(43,108,176,.14)', lineWidth: 3 },
      stair: { stroke: '#4a5568', fill: 'rgba(74,85,104,.14)', lineWidth: 3 },
      board: { stroke: '#4a5568', fill: 'rgba(74,85,104,.16)', lineWidth: 3 },
      outlet: { stroke: '#b7791f', fill: 'rgba(183,121,31,.18)', lineWidth: 3 },
      damage: { stroke: '#c53030', fill: 'rgba(197,48,48,.18)', lineWidth: 3 },
      photo: { stroke: '#805ad5', fill: 'rgba(128,90,213,.18)', lineWidth: 3 },
    }[type] || { stroke: '#1f5d99', fill: 'rgba(31,93,153,.14)', lineWidth: 3 };
  }

  function _sketchPointRadius(type) {
    return type === 'outlet' ? 7 : 10;
  }

  function _sketchLabel(type) {
    return {
      room: 'Aula',
      door: 'Pta',
      window: 'Vtna',
      stair: 'Esc',
      board: 'Piz',
      damage: 'Dano',
    }[type] || type;
  }

  function _sketchObjectLabel(object) {
    const base = object.ficha?.codigo || object.label || _sketchLabel(object.type);
    const dimensions = _sketchDimensionsText(object);
    return dimensions ? `${base} ${dimensions}` : base;
  }

  function _sketchDimensionsText(object) {
    if (object.type === 'outlet' || object.type === 'photo') return '';
    const scale = _sketchScale();
    if (!scale) return '';
    if (object.type === 'wall') {
      const px = Math.hypot(object.x2 - object.x1, object.y2 - object.y1);
      return `${(px * scale.avg).toFixed(2)}m`;
    }
    if (object.type === 'window') {
      const length = (_openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2);
      const height = object.ficha?.alto_m ? Number(object.ficha.alto_m).toFixed(2) : 's/d';
      return `L${length} A${height}m`;
    }
    if (object.type === 'door') {
      return `L${(_openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2)}m`;
    }
    return `${(object.w * scale.x).toFixed(2)} x ${(object.h * scale.y).toFixed(2)}m`;
  }

  function _openingSide(object) {
    return object?.attached?.side || 'top';
  }

  function _openingLengthPixels(object) {
    return ['left', 'right'].includes(_openingSide(object)) ? object.h : object.w;
  }

  function _openingDistanceText(object) {
    const wall = _openingWallDistances(object);
    if (wall) return wall;
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    const scale = _sketchScale();
    if (!room || !scale) return '';
    const cx = object.x + (object.w || 0) / 2;
    const cy = object.y + (object.h || 0) / 2;
    const corners = [
      { key: 'C1', x: room.x, y: room.y },
      { key: 'C2', x: room.x + room.w, y: room.y },
      { key: 'C3', x: room.x + room.w, y: room.y + room.h },
      { key: 'C4', x: room.x, y: room.y + room.h },
    ];
    return corners
      .map(corner => {
        const meters = Math.hypot((cx - corner.x) * scale.x, (cy - corner.y) * scale.y);
        return `${corner.key} ${meters.toFixed(1)}m`;
      })
      .join(' · ');
  }

  function _openingWallDistances(object) {
    if (!['door', 'window'].includes(object?.type)) return '';
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    const scale = _sketchScale();
    if (!room || !scale) return '';
    const cx = object.x + object.w / 2;
    const cy = object.y + object.h / 2;
    const near = {
      top: Math.abs(object.y - room.y),
      bottom: Math.abs((object.y + object.h) - (room.y + room.h)),
      left: Math.abs(object.x - room.x),
      right: Math.abs((object.x + object.w) - (room.x + room.w)),
    };
    const side = Object.entries(near).sort((a, b) => a[1] - b[1])[0]?.[0];
    if (!side || near[side] > 16) return '';
    if (side === 'top' || side === 'bottom') {
      const left = Math.max(0, (object.x - room.x) * scale.x);
      const right = Math.max(0, (room.x + room.w - (object.x + object.w)) * scale.x);
      return `${side === 'top' ? 'Pared superior' : 'Pared inferior'} · C izq ${left.toFixed(2)}m · C der ${right.toFixed(2)}m`;
    }
    const top = Math.max(0, (object.y - room.y) * scale.y);
    const bottom = Math.max(0, (room.y + room.h - (object.y + object.h)) * scale.y);
    return `${side === 'left' ? 'Pared izquierda' : 'Pared derecha'} · C sup ${top.toFixed(2)}m · C inf ${bottom.toFixed(2)}m`;
  }

  function _announceOpeningDistances(object) {
    if (!['door', 'window'].includes(object?.type)) return;
    const text = _openingDistanceText(object);
    if (text) UI.showToast(`Ubicacion de ${_sketchLabel(object.type)}: ${text}`, 'info', 7000);
  }

  function _openingCornerDistances(object) {
    if (!['door', 'window'].includes(object.type)) return [];
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    const scale = _sketchScale();
    if (!room || !scale) return [];
    const cx = object.x + (object.w || 0) / 2;
    const cy = object.y + (object.h || 0) / 2;
    return [
      { key: 'C1', x: room.x, y: room.y },
      { key: 'C2', x: room.x + room.w, y: room.y },
      { key: 'C3', x: room.x + room.w, y: room.y + room.h },
      { key: 'C4', x: room.x, y: room.y + room.h },
    ].map(corner => ({
      ...corner,
      from: { x: cx, y: cy },
      meters: Math.hypot((cx - corner.x) * scale.x, (cy - corner.y) * scale.y),
    }));
  }

  function _drawOpeningCornerGuides(ctx, object) {
    const distances = _openingCornerDistances(object);
    if (!distances.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,76,34,.5)';
    ctx.fillStyle = '#9a3412';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    distances.forEach(item => {
      ctx.beginPath();
      ctx.moveTo(item.from.x, item.from.y);
      ctx.lineTo(item.x, item.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    distances.forEach(item => {
      const tx = item.from.x + (item.x - item.from.x) * .22;
      const ty = item.from.y + (item.y - item.from.y) * .22;
      const text = `${item.key} ${item.meters.toFixed(1)}m`;
      const width = ctx.measureText(text).width + 8;
      ctx.fillStyle = 'rgba(255,247,237,.92)';
      ctx.fillRect(tx - width / 2, ty - 8, width, 16);
      ctx.fillStyle = '#9a3412';
      ctx.fillText(text, tx, ty);
    });
    ctx.restore();
  }

  function _sketchScale() {
    const sketch = _data.__classroomSketch || {};
    const room = (sketch.objects || []).find(object => object.type === 'room');
    const length = Number(sketch.length || 0);
    const width = Number(sketch.width || 0);
    if (!room || !length || !width || !room.w || !room.h) return null;
    const x = length / room.w;
    const y = width / room.h;
    return { x, y, avg: (x + y) / 2 };
  }

  function _isResizableSketchObject(object) {
    return object && !['wall', 'outlet', 'photo'].includes(object.type);
  }

  function _resizeHandles(object) {
    if (['door', 'window'].includes(object.type)) {
      const side = _openingSide(object);
      const size = 16;
      if (side === 'left' || side === 'right') {
        return [
          { name: 'n', x: object.x + object.w / 2, y: object.y, size },
          { name: 's', x: object.x + object.w / 2, y: object.y + object.h, size },
        ];
      }
      return [
        { name: 'w', x: object.x, y: object.y + object.h / 2, size },
        { name: 'e', x: object.x + object.w, y: object.y + object.h / 2, size },
      ];
    }
    const size = 14;
    return [
      { name: 'nw', x: object.x, y: object.y, size },
      { name: 'ne', x: object.x + object.w, y: object.y, size },
      { name: 'sw', x: object.x, y: object.y + object.h, size },
      { name: 'se', x: object.x + object.w, y: object.y + object.h, size },
    ];
  }

  function _drawResizeHandles(ctx, object, selected) {
    ctx.save();
    _resizeHandles(object).forEach(handle => {
      ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,255,255,.86)';
      ctx.strokeStyle = selected ? '#111827' : 'rgba(17,24,39,.55)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handle.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function _openingRotateHandle(object) {
    if (!['door', 'window'].includes(object?.type)) return null;
    const side = _openingSide(object);
    const center = { x: object.x + object.w / 2, y: object.y + object.h / 2 };
    const offset = 28;
    if (side === 'left') return { x: center.x - offset, y: center.y, size: 24 };
    if (side === 'right') return { x: center.x + offset, y: center.y, size: 24 };
    if (side === 'bottom') return { x: center.x, y: center.y + offset, size: 24 };
    return { x: center.x, y: center.y - offset, size: 24 };
  }

  function _drawOpeningRotateHandle(ctx, object) {
    const handle = _openingRotateHandle(object);
    if (!handle) return;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = object.type === 'door' ? '#2f855a' : '#2b6cb0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, handle.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 5, Math.PI * .2, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(handle.x + 7, handle.y - 4);
    ctx.lineTo(handle.x + 11, handle.y - 4);
    ctx.lineTo(handle.x + 9, handle.y - 8);
    ctx.stroke();
    ctx.font = '800 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#172033';
    ctx.fillText('Rotar', handle.x, handle.y + 24);
    ctx.restore();
  }

  function _labelSketchObject(ctx, object, label, x, y) {
    if (!label) return;
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = object.label || label;
    const width = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.fillRect(x - width / 2, y - 10, width, 20);
    ctx.fillStyle = '#172033';
    ctx.fillText(text, x, y);
  }

  function _findSketchObjectAt(point) {
    _ensureSketchObjects();
    return [..._data.__classroomSketch.objects]
      .reverse()
      .find(object => _sketchObjectContains(object, point));
  }

  function _findSketchObjectById(id) {
    _ensureSketchObjects();
    return _data.__classroomSketch.objects.find(object => object.id === id) || null;
  }

  function _hasSketchFicha(object) {
    return object && !['room', 'wall'].includes(object.type);
  }

  function _findResizeHandleAt(point) {
    _ensureSketchObjects();
    for (const object of [..._data.__classroomSketch.objects].reverse()) {
      if (!_isResizableSketchObject(object)) continue;
      const handle = _resizeHandles(object).find(item => Math.hypot(point.x - item.x, point.y - item.y) <= item.size);
      if (handle) return { object, handle };
    }
    return null;
  }

  function _findOpeningRotateHandleAt(point) {
    _ensureSketchObjects();
    for (const object of [..._data.__classroomSketch.objects].reverse()) {
      const handle = _openingRotateHandle(object);
      if (!handle) continue;
      if (Math.hypot(point.x - handle.x, point.y - handle.y) <= handle.size / 2 + 6) return object;
    }
    return null;
  }

  function _sketchObjectContains(object, point) {
    if (object.type === 'wall') {
      return _distanceToSegment(point, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }) < 12;
    }
    if (object.type === 'outlet' || object.type === 'photo') {
      const dx = point.x - object.x;
      const dy = point.y - object.y;
      return Math.sqrt(dx * dx + dy * dy) <= _sketchPointRadius(object.type) + 10;
    }
    const pad = ['door', 'window'].includes(object.type) ? 16 : 0;
    return point.x >= object.x - pad && point.x <= object.x + object.w + pad && point.y >= object.y - pad && point.y <= object.y + object.h + pad;
  }

  function _distanceToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
  }

  function _moveOffsetForObject(object, point) {
    if (object.type === 'wall') {
      return { x1: point.x - object.x1, y1: point.y - object.y1, x2: point.x - object.x2, y2: point.y - object.y2 };
    }
    if (object.type === 'outlet' || object.type === 'photo') {
      return { x: point.x - object.x, y: point.y - object.y };
    }
    return { x: point.x - object.x, y: point.y - object.y };
  }

  function _moveSketchObject(object, point, offset) {
    if (object.type === 'wall') {
      object.x1 = point.x - offset.x1;
      object.y1 = point.y - offset.y1;
      object.x2 = point.x - offset.x2;
      object.y2 = point.y - offset.y2;
      return;
    }
    if (object.type === 'outlet' || object.type === 'photo') {
      object.x = point.x - offset.x;
      object.y = point.y - offset.y;
      return;
    }
    if (object.type === 'room') {
      const prevX = object.x;
      const prevY = object.y;
      object.x = point.x - offset.x;
      object.y = point.y - offset.y;
      const dx = object.x - prevX;
      const dy = object.y - prevY;
      (_data.__classroomSketch.objects || []).forEach(item => {
        if (item.id === object.id) return;
        if (item.type === 'wall') {
          item.x1 += dx; item.x2 += dx; item.y1 += dy; item.y2 += dy;
          return;
        }
        if (item.x !== undefined) {
          item.x += dx;
          item.y += dy;
        }
      });
      return;
    }
    object.x = point.x - offset.x;
    object.y = point.y - offset.y;
    _clampOpeningToRoom(object);
  }

  function _resizeSketchObject(object, point, handle) {
    if (!_isResizableSketchObject(object)) return;
    const minW = 18;
    const minH = 12;
    const right = object.x + object.w;
    const bottom = object.y + object.h;

    if (handle.name.includes('w')) {
      const newX = Math.min(point.x, right - minW);
      object.w = Math.round(right - newX);
      object.x = Math.round(newX);
    }
    if (handle.name.includes('e')) {
      object.w = Math.max(minW, Math.round(point.x - object.x));
    }
    if (handle.name.includes('n')) {
      const newY = Math.min(point.y, bottom - minH);
      object.h = Math.round(bottom - newY);
      object.y = Math.round(newY);
    }
    if (handle.name.includes('s')) {
      object.h = Math.max(minH, Math.round(point.y - object.y));
    }
    if (object.type === 'door') _orientOpeningToSide(object, _openingSide(object));
    if (object.type === 'window' && ['left', 'right'].includes(_openingSide(object))) object.w = 14;
    if (object.type === 'window' && ['top', 'bottom'].includes(_openingSide(object))) object.h = 14;
    if (object.type === 'room') _reflowAttachedOpenings(object);
    _clampOpeningToRoom(object);
  }

  function _clampOpeningToRoom(object) {
    if (!object || !['door', 'window'].includes(object.type)) return object;
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    if (!room) return object;
    object.x = Math.max(room.x - 34, Math.min(object.x, room.x + room.w + 34 - object.w));
    object.y = Math.max(room.y - 34, Math.min(object.y, room.y + room.h + 34 - object.h));
    const center = { x: object.x + object.w / 2, y: object.y + object.h / 2 };
    const distances = [
      { side: 'top', value: Math.abs(center.y - room.y) },
      { side: 'bottom', value: Math.abs(center.y - (room.y + room.h)) },
      { side: 'left', value: Math.abs(center.x - room.x) },
      { side: 'right', value: Math.abs(center.x - (room.x + room.w)) },
    ].sort((a, b) => a.value - b.value);
    const nearest = distances[0];
    if (nearest && nearest.value <= 54) {
      _orientOpeningToSide(object, nearest.side);
      if (nearest.side === 'top') {
        object.y = room.y;
        object.x = Math.max(room.x, Math.min(object.x, room.x + room.w - object.w));
      }
      if (nearest.side === 'bottom') {
        object.y = room.y + room.h - object.h;
        object.x = Math.max(room.x, Math.min(object.x, room.x + room.w - object.w));
      }
      if (nearest.side === 'left') {
        object.x = room.x;
        object.y = Math.max(room.y, Math.min(object.y, room.y + room.h - object.h));
      }
      if (nearest.side === 'right') {
        object.x = room.x + room.w - object.w;
        object.y = Math.max(room.y, Math.min(object.y, room.y + room.h - object.h));
      }
      object.attached = _openingAttachment(object, room, nearest.side);
    }
    return object;
  }

  function _orientOpeningToSide(object, side) {
    if (!['door', 'window'].includes(object?.type)) return object;
    const currentVertical = ['left', 'right'].includes(_openingSide(object));
    const nextVertical = ['left', 'right'].includes(side);
    let length = nextVertical
      ? (currentVertical ? object.h : object.w)
      : (currentVertical ? object.h : object.w);
    length = Math.max(object.type === 'door' ? 34 : 42, length || 48);
    const thickness = object.type === 'door' ? 8 : 14;
    if (nextVertical) {
      object.w = thickness;
      object.h = length;
    } else {
      object.w = length;
      object.h = thickness;
    }
    object.attached = { ...(object.attached || {}), side };
    return object;
  }

  function _rotateOpeningToNextWall(object) {
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    if (!room || !['door', 'window'].includes(object?.type)) return;
    const order = ['top', 'right', 'bottom', 'left'];
    const current = _openingSide(object);
    const side = order[(Math.max(0, order.indexOf(current)) + 1) % order.length];
    const ratio = Math.max(0, Math.min(1, object.attached?.ratio ?? .5));
    _orientOpeningToSide(object, side);
    if (side === 'top') {
      object.x = room.x + ratio * Math.max(1, room.w - object.w);
      object.y = room.y;
    }
    if (side === 'bottom') {
      object.x = room.x + ratio * Math.max(1, room.w - object.w);
      object.y = room.y + room.h - object.h;
    }
    if (side === 'left') {
      object.x = room.x;
      object.y = room.y + ratio * Math.max(1, room.h - object.h);
    }
    if (side === 'right') {
      object.x = room.x + room.w - object.w;
      object.y = room.y + ratio * Math.max(1, room.h - object.h);
    }
    object.attached = _openingAttachment(object, room, side);
  }

  function _openingAttachment(object, room, side) {
    if (side === 'top' || side === 'bottom') {
      return { target: room.id, side, ratio: (object.x - room.x) / Math.max(1, room.w - object.w) };
    }
    return { target: room.id, side, ratio: (object.y - room.y) / Math.max(1, room.h - object.h) };
  }

  function _reflowAttachedOpenings(room) {
    (_data.__classroomSketch.objects || [])
      .filter(object => ['door', 'window'].includes(object.type) && object.attached?.target === room.id)
      .forEach(object => {
        const ratio = Math.max(0, Math.min(1, Number(object.attached.ratio || 0)));
        if (object.attached.side === 'top') {
          _orientOpeningToSide(object, 'top');
          object.y = room.y;
          object.x = room.x + ratio * Math.max(1, room.w - object.w);
        }
        if (object.attached.side === 'bottom') {
          _orientOpeningToSide(object, 'bottom');
          object.y = room.y + room.h - object.h;
          object.x = room.x + ratio * Math.max(1, room.w - object.w);
        }
        if (object.attached.side === 'left') {
          _orientOpeningToSide(object, 'left');
          object.x = room.x;
          object.y = room.y + ratio * Math.max(1, room.h - object.h);
        }
        if (object.attached.side === 'right') {
          _orientOpeningToSide(object, 'right');
          object.x = room.x + room.w - object.w;
          object.y = room.y + ratio * Math.max(1, room.h - object.h);
        }
      });
  }

  function _redrawSketchCanvas() {
    const canvas = document.getElementById('mec-classroom-canvas');
    if (canvas) _drawSketch(canvas.getContext('2d'), canvas);
    _drawBlockPreview();
  }

  function _updateSketchStatus() {
    const status = document.getElementById('mec-sketch-status');
    if (status) status.textContent = _sketchStatusText(_data.__classroomSketch || {});
  }

  function setSketchZoom(delta) {
    _sketchZoom = Math.max(.65, Math.min(1.8, _sketchZoom + delta));
    const canvas = document.getElementById('mec-classroom-canvas');
    if (canvas) canvas.style.transform = `scale(${_sketchZoom})`;
    const zoom = document.querySelector('.mec-sketch-zoom span');
    if (zoom) zoom.textContent = `${Math.round(_sketchZoom * 100)}%`;
  }

  function _drawBlockPreview() {
    const canvas = document.getElementById('mec-block-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const block = _activeClassroomBlock();
    const rooms = (_data.__classrooms || []).filter(room => room.blockId === (block?.id || _data.__classroomSketch?.blockId));
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 22, 392, 120);
    ctx.fillStyle = '#172033';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillText(block?.bloque_codigo || 'Bloque actual', 16, 16);
    _layoutPlanRooms(rooms.length ? rooms : [_data.__classroomSketch], 18, 34, 384, 92).forEach(item => {
      const active = item.room.id === _activeClassroomId;
      ctx.fillStyle = active ? 'rgba(232,76,34,.16)' : 'rgba(43,108,176,.08)';
      ctx.strokeStyle = active ? '#e84c22' : '#2b6cb0';
      ctx.lineWidth = active ? 3 : 2;
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = active ? '#9a3412' : '#173f68';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.fillText(item.room.name || 'Aula', item.x + 5, item.y + 14);
    });
  }

  function _fieldValueForObjectMeters(object, axis) {
    const scale = _sketchScale();
    if (!scale || !object || object.w === undefined) return '';
    let value = axis === 'w' ? object.w * scale.x : object.h * scale.y;
    if (axis === 'w' && ['door', 'window'].includes(object.type)) {
      value = _openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x);
    }
    return value ? value.toFixed(2) : '';
  }

  function _applyObjectMeters(object, widthM, heightM) {
    const scale = _sketchScale();
    if (!scale || !object || object.w === undefined) return;
    const width = Number(widthM);
    const height = Number(heightM);
    if (width > 0 && ['door', 'window'].includes(object.type)) {
      const vertical = ['left', 'right'].includes(_openingSide(object));
      if (vertical) object.h = Math.max(18, Math.round(width / scale.y));
      else object.w = Math.max(18, Math.round(width / scale.x));
      _orientOpeningToSide(object, _openingSide(object));
      return;
    }
    if (width > 0) object.w = Math.max(8, Math.round(width / scale.x));
    if (height > 0) object.h = Math.max(8, Math.round(height / scale.y));
  }

  function _sketchFichaFields(type) {
    const common = {
      estados: ['Bueno', 'Regular', 'Malo', 'No funciona', 'No verificable'],
      materiales: ['Madera', 'Metal', 'Aluminio', 'Vidrio', 'Mamposteria', 'Plastico/PVC', 'Mixto', 'Otro'],
    };
    return {
      window: {
        title: 'Ficha de ventana',
        typeOptions: ['Corrediza', 'Batiente', 'Fija', 'Persiana', 'Basculante', 'Otro'],
        extra: [
          { key: 'tiene_reja', label: 'Tiene reja', options: ['Si', 'No', 'No verificable'] },
          { key: 'ventila', label: 'Permite ventilacion', options: ['Si', 'Parcial', 'No'] },
        ],
        ...common,
      },
      door: {
        title: 'Ficha de puerta',
        typeOptions: ['Madera', 'Metal', 'Vidrio', 'Reja', 'Mixta', 'Otro'],
        extra: [
          { key: 'cerradura', label: 'Cerradura', options: ['Funciona', 'Regular', 'No funciona', 'No tiene'] },
          { key: 'abre_hacia', label: 'Apertura', options: ['Interior', 'Exterior', 'Corrediza', 'No verificable'] },
        ],
        ...common,
      },
      board: {
        title: 'Ficha de pizarron',
        typeOptions: ['Tiza', 'Acrilico', 'Digital', 'Mixto', 'Otro'],
        extra: [],
        ...common,
      },
      stair: {
        title: 'Ficha de escalera',
        typeOptions: ['Recta', 'En L', 'En U', 'Caracol', 'Rampa-escalera', 'Otro'],
        extra: [
          { key: 'seguridad', label: 'Seguridad', options: ['Seguro', 'Regular', 'Riesgo', 'No verificable'] },
          { key: 'pasamanos', label: 'Pasamanos', options: ['Ambos lados', 'Un lado', 'No tiene', 'No verificable'] },
        ],
        ...common,
      },
      outlet: {
        title: 'Ficha de toma electrica',
        typeOptions: ['Simple', 'Doble', 'Multiple', 'No verificable'],
        extra: [{ key: 'seguridad', label: 'Seguridad', options: ['Seguro', 'Flojo', 'Expuesto', 'No funciona'] }],
        ...common,
      },
      damage: {
        title: 'Ficha de dano',
        typeOptions: ['Humedad', 'Fisura', 'Rotura', 'Desprendimiento', 'Instalacion expuesta', 'Otro'],
        estados: ['Leve', 'Moderado', 'Severo', 'Riesgo inmediato'],
        materiales: common.materiales,
        extra: [{ key: 'prioridad', label: 'Prioridad', options: ['Baja', 'Media', 'Alta', 'Urgente'] }],
      },
      photo: {
        title: 'Ficha de evidencia',
        typeOptions: ['General', 'Detalle', 'Riesgo', 'Mantenimiento', 'Otro'],
        extra: [],
        ...common,
      },
    }[type] || {
      title: 'Ficha del objeto',
      typeOptions: ['General', 'Otro'],
      extra: [],
      ...common,
    };
  }

  function _optionTags(options, selected) {
    return options.map(option => `<option value="${_escape(option)}" ${selected === option ? 'selected' : ''}>${_escape(option)}</option>`).join('');
  }

  function _choiceButtons(name, options, selected) {
    return `
      <input type="hidden" name="${_escape(name)}" value="${_escape(selected || '')}">
      <div class="mec-choice-buttons" data-choice-name="${_escape(name)}">
        ${options.map(option => `
          <button class="mec-choice ${_choiceToneClass(option)} ${selected === option ? 'mec-choice--active' : ''}" type="button" data-choice-value="${_escape(option)}">
            ${_escape(option)}
          </button>`).join('')}
      </div>`;
  }

  function _choiceToneClass(value) {
    const text = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (text.includes('no existe') || text.includes('no aplica') || text === 'no') return 'mec-choice--muted';
    if (text.includes('malo') || text.includes('mala') || text.includes('dano') || text.includes('deficiente') || text.includes('fuera') || text.includes('expuesto') || text.includes('riesgo') || text.includes('urgente') || text.includes('no cumple') || text.includes('sin ') || text.includes('no verificable')) return 'mec-choice--danger';
    if (text.includes('regular') || text.includes('intermitente') || text.includes('incompleto') || text.includes('parcial') || text.includes('flojo') || text.includes('moderado')) return 'mec-choice--warning';
    if (text.includes('bueno') || text.includes('buena') || text.includes('adecuada') || text.includes('seguro') || /\bsi\b/.test(text) || text.includes('cumple') || text.includes('completo')) return 'mec-choice--success';
    return 'mec-choice--neutral';
  }

  function openSketchObjectFicha(id) {
    const object = _findSketchObjectById(id || _selectedSketchObjectId);
    if (!object || !_hasSketchFicha(object)) {
      UI.showToast('Seleccione una puerta, ventana u otro objeto con ficha.', 'warning');
      return;
    }
    _selectedSketchObjectId = object.id;
    object.ficha = object.ficha || {};
    const cfg = _sketchFichaFields(object.type);
    const modalId = 'modal-sketch-object-ficha';
    document.getElementById(modalId)?.remove();
    const lengthM = object.ficha.largo_m || object.ficha.ancho_m || _fieldValueForObjectMeters(object, 'w');
    const heightM = object.ficha.alto_m || _fieldValueForObjectMeters(object, 'h');
    const primaryMeasureLabel = object.type === 'window' ? 'Largo' : 'Ancho';
    const primaryMeasureName = object.type === 'window' ? 'largo_m' : 'ancho_m';
    const compactOpening = ['door', 'window'].includes(object.type);
    const evidenceCount = (object.ficha.evidencias || []).length;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal modal--dialog mec-object-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal__overlay" onclick="MecFormModule.closeSketchObjectFicha()"></div>
      <div class="modal__panel modal__panel--wide">
        <div class="modal__header">
          <h3>${_escape(cfg.title)} · ${_escape(_sketchLabel(object.type))}</h3>
          <button class="modal__close" onclick="MecFormModule.closeSketchObjectFicha()">&times;</button>
        </div>
        <div class="modal__body">
          <form id="form-sketch-object-ficha" class="mec-object-form">
            <input type="hidden" name="object_id" value="${_escape(object.id)}">
            <div class="form-grid">
              <div class="form-group">
                <label>Codigo corto</label>
                <input class="form-control" name="codigo" value="${_escape(object.ficha.codigo || _sketchLabel(object.type))}" maxlength="16">
              </div>
              ${compactOpening ? '' : `
                <div class="form-group">
                  <label>Tipo</label>
                  ${_choiceButtons('subtipo', cfg.typeOptions, object.ficha.subtipo || '')}
                </div>`}
              <div class="form-group">
                <label>Estado</label>
                ${_choiceButtons('estado', cfg.estados, object.ficha.estado || '')}
              </div>
              ${compactOpening ? '' : `
                <div class="form-group">
                  <label>Material</label>
                  ${_choiceButtons('material', cfg.materiales, object.ficha.material || '')}
                </div>`}
              <div class="form-group">
                <label>${primaryMeasureLabel}</label>
                <div class="mec-input-with-unit">
                  <input class="form-control" name="${primaryMeasureName}" type="number" min="0" step="0.01" value="${_escape(lengthM)}">
                  <span class="mec-unit">m</span>
                </div>
              </div>
              <div class="form-group">
                <label>Alto</label>
                <div class="mec-input-with-unit">
                  <input class="form-control" name="alto_m" type="number" min="0" step="0.01" value="${_escape(heightM)}">
                  <span class="mec-unit">m</span>
                </div>
              </div>
              ${cfg.extra
                .filter(field => !compactOpening || ['abre_hacia', 'tiene_reja'].includes(field.key))
                .map(field => `
                <div class="form-group">
                  <label>${_escape(field.label)}</label>
                  ${_choiceButtons(field.key, field.options, object.ficha[field.key] || '')}
                </div>`).join('')}
            </div>
            ${compactOpening ? '' : `
              <div class="form-group">
                <label>Observacion</label>
                <textarea class="form-control" name="observacion" rows="3">${_escape(object.ficha.observacion || '')}</textarea>
              </div>`}
            <div class="mec-object-evidence">
              <input id="sketch-object-photo" type="file" accept="image/*" capture="environment" multiple style="display:none;">
              <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('sketch-object-photo')?.click()">Sacar foto</button>
              <span id="sketch-object-photo-count">${evidenceCount ? `${evidenceCount} foto(s) asociada(s)` : 'Sin foto asociada'}</span>
            </div>
          </form>
        </div>
        <div class="modal__footer">
          <button class="btn btn-outline" onclick="MecFormModule.closeSketchObjectFicha()">Cancelar</button>
          <button class="btn btn-primary" onclick="MecFormModule.saveSketchObjectFicha()">Guardar ficha</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.mec-choice').forEach(button => {
      button.addEventListener('click', () => {
        const group = button.closest('.mec-choice-buttons');
        const input = group?.previousElementSibling;
        if (!group || !input) return;
        input.value = button.dataset.choiceValue || '';
        group.querySelectorAll('.mec-choice').forEach(item => item.classList.toggle('mec-choice--active', item === button));
        _persistSketchObjectFichaFromForm(false);
      });
    });
    modal.querySelectorAll('#form-sketch-object-ficha input, #form-sketch-object-ficha textarea').forEach(input => {
      if (input.type === 'hidden' || input.type === 'file') return;
      input.addEventListener('input', () => _persistSketchObjectFichaFromForm(false));
      input.addEventListener('change', () => _persistSketchObjectFichaFromForm(false));
    });
    const input = modal.querySelector('#sketch-object-photo');
    input.addEventListener('change', async () => {
      object.ficha.evidencias = await Promise.all([...input.files].map(file => _readEvidenceFile(file)));
      const count = modal.querySelector('#sketch-object-photo-count');
      if (count) count.textContent = `${object.ficha.evidencias.length} foto(s) asociada(s)`;
      _saveDraft(false);
    });
    UI.openModal(modalId);
  }

  function closeSketchObjectFicha() {
    const modal = document.getElementById('modal-sketch-object-ficha');
    if (!modal) return;
    modal.classList.remove('modal--visible');
    setTimeout(() => modal.remove(), 250);
  }

  function saveSketchObjectFicha() {
    _persistSketchObjectFichaFromForm(true);
    closeSketchObjectFicha();
  }

  function _persistSketchObjectFichaFromForm(showToast = false) {
    const form = document.getElementById('form-sketch-object-ficha');
    if (!form) return false;
    const data = new FormData(form);
    const object = _findSketchObjectById(data.get('object_id'));
    if (!object) return false;
    object.ficha = object.ficha || {};
    ['codigo', 'subtipo', 'estado', 'material', 'largo_m', 'ancho_m', 'alto_m', 'tiene_reja', 'ventila', 'cerradura', 'abre_hacia', 'seguridad', 'pasamanos', 'prioridad', 'observacion']
      .forEach(key => {
        if (data.has(key)) object.ficha[key] = String(data.get(key) || '').trim();
      });
    _applyObjectMeters(object, object.ficha.largo_m || object.ficha.ancho_m, object.ficha.alto_m);
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    if (showToast) UI.showToast('Ficha del objeto guardada.', 'success');
    return true;
  }

  function _refreshDynamicState() {
    if (!_initialized && !document.getElementById('mec-form-root')) return;

    MEC_SCHEMA.modules.forEach(module => {
      const moduleEl = document.querySelector(`.mec-module[data-module="${module.id}"]`);
      const stepEl = document.querySelector(`.mec-step[data-step-module="${module.id}"]`);
      if (moduleEl) moduleEl.classList.toggle('mec-module--active', module.id === _activeModuleId);
      if (stepEl) stepEl.classList.toggle('mec-step--active', module.id === _activeModuleId);

      module.sections.forEach(section => {
        section.fields.forEach(field => {
          const el = document.querySelector(`.mec-field[data-module="${module.id}"][data-field="${field.id}"]`);
          if (!el) return;
          el.classList.toggle('mec-field--hidden', !_fieldVisible(field));
        });
      });
    });

    _updateProgress();
  }

  function _requiredFields(moduleFilter = null) {
    const fields = [];
    MEC_SCHEMA.modules.forEach(module => {
      if (moduleFilter && module.id !== moduleFilter) return;
      module.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.required && _fieldVisible(field)) fields.push({ module, section, field });
        });
      });
    });
    return fields;
  }

  function _fieldFilled(moduleId, field) {
    const value = _data[moduleId]?.[field.id];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function _updateProgress() {
    const allRequired = _requiredFields();
    const completed = allRequired.filter(item => _fieldFilled(item.module.id, item.field)).length;
    const progress = document.getElementById('mec-required-progress');
    if (progress) progress.textContent = `${completed}/${allRequired.length}`;

    MEC_SCHEMA.modules.forEach(module => {
      const badges = document.querySelectorAll(`[data-module-progress="${module.id}"]`);
      if (!badges.length || module.status === 'planned') return;
      const required = _requiredFields(module.id);
      const done = required.filter(item => _fieldFilled(module.id, item.field)).length;
      badges.forEach(badge => { badge.textContent = `${done}/${required.length} obligatorios`; });
    });

    const saveState = document.getElementById('mec-save-state');
    const saved = _readSavedMeta();
    if (saveState && saved) saveState.textContent = _formatSavedAt(saved.savedAt);
  }

  function validate() {
    const errors = [];
    document.querySelectorAll('.mec-field').forEach(el => el.classList.remove('mec-field--invalid'));
    document.querySelectorAll('.mec-error').forEach(el => { el.textContent = ''; });

    _requiredFields().forEach(({ module, field }) => {
      if (!_fieldFilled(module.id, field)) {
        errors.push(`${module.title}: ${field.label}`);
        _markError(module.id, field.id, 'Campo obligatorio.');
      }
    });

    MEC_SCHEMA.modules.forEach(module => {
      module.sections.forEach(section => {
        section.fields.filter(_fieldVisible).forEach(field => {
          if (field.type !== 'number') return;
          const raw = _data[module.id]?.[field.id];
          if (raw === undefined || raw === '') return;
          const numeric = Number(raw);
          if (Number.isNaN(numeric)) {
            errors.push(`${module.title}: ${field.label}`);
            _markError(module.id, field.id, 'Debe ser numerico.');
          }
          if (field.min !== undefined && numeric < Number(field.min)) {
            errors.push(`${module.title}: ${field.label}`);
            _markError(module.id, field.id, `Minimo ${field.min}.`);
          }
          if (field.max !== undefined && numeric > Number(field.max)) {
            errors.push(`${module.title}: ${field.label}`);
            _markError(module.id, field.id, `Maximo ${field.max}.`);
          }
        });
      });
    });

    _renderValidationSummary(errors);
    UI.showToast(errors.length ? `Hay ${errors.length} pendiente(s) en el cuestionario MEC.` : 'Cuestionario MEC valido para los modulos implementados.', errors.length ? 'warning' : 'success');
    return errors.length === 0;
  }

  function _markError(moduleId, fieldId, message) {
    const field = document.querySelector(`.mec-field[data-module="${moduleId}"][data-field="${fieldId}"]`);
    const error = document.querySelector(`[data-error-for="${moduleId}.${fieldId}"]`);
    if (field) field.classList.add('mec-field--invalid');
    if (error) error.textContent = message;
  }

  function _renderValidationSummary(errors) {
    const summary = document.getElementById('mec-validation-summary');
    if (!summary) return;
    if (!errors.length) {
      summary.innerHTML = '<strong>Sin pendientes obligatorios.</strong>';
      summary.classList.add('mec-validation-summary--ok');
      return;
    }
    summary.classList.remove('mec-validation-summary--ok');
    summary.innerHTML = `<strong>Pendientes</strong><ul>${errors.slice(0, 12).map(e => `<li>${_escape(e)}</li>`).join('')}</ul>`;
  }

  function _implementedModules() {
    return MEC_SCHEMA.modules.filter(module => module.status !== 'planned');
  }

  function selectModule(moduleId) {
    const module = MEC_SCHEMA.modules.find(item => item.id === moduleId);
    if (!module || module.status === 'planned') return;
    _syncActiveBlock();
    if (_data.__classroomSketch && _data.__classrooms) _syncActiveClassroomFromSketch();
    _saveDraft(false);
    _activeModuleId = moduleId;
    _refreshDynamicState();
    document.getElementById('mec-form-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function nextModule() {
    const modules = _implementedModules();
    const index = modules.findIndex(module => module.id === _activeModuleId);
    if (index >= modules.length - 1) {
      UI.showToast('No hay más etapas activas por ahora. El croquis quedó guardado.', 'info');
      return;
    }
    const next = modules[index + 1];
    if (next) selectModule(next.id);
  }

  function previousModule() {
    const modules = _implementedModules();
    const index = modules.findIndex(module => module.id === _activeModuleId);
    const previous = modules[Math.max(0, index - 1)];
    if (previous) selectModule(previous.id);
  }

  function saveNow() {
    _saveDraft(false);
    _updateProgress();
    UI.showToast('Autoguardado activo: los cambios ya se guardan solos.', 'info');
  }

  function saveSketchAndNext() {
    _saveDraft(false);
    _updateProgress();
    nextModule();
  }

  async function resetDraft() {
    const confirmed = await UI.showConfirm('Limpiar borrador MEC', '¿Desea borrar las respuestas guardadas localmente para esta prueba?');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    _data = {};
    _render();
    UI.showToast('Borrador MEC limpiado.', 'success');
  }

  function setSketchTool(tool) {
    if (!SKETCH_TOOLS.some(item => item.id === tool)) return;
    _sketchTool = tool;
    document.querySelectorAll('[data-sketch-tool]').forEach(button => {
      button.classList.toggle('mec-sketch-tool--active', button.dataset.sketchTool === tool);
    });
    _updateSketchStatus();
  }

  function editSelectedSketchObject() {
    openSketchObjectFicha(_selectedSketchObjectId);
  }

  function generateRoomSketch() {
    _ensureSketchObjects();
    _pushSketchHistory();
    const block = _activeClassroomBlock();
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    let length = Number(_data.__classroomSketch.length || 7);
    let width = Number(_data.__classroomSketch.width || 5);
    if (blockLength && length > blockLength) length = blockLength;
    if (blockWidth && width > blockWidth) width = blockWidth;
    if (blockLength && blockWidth) {
      const remaining = Math.max(0, blockLength * blockWidth - _blockAreaUsed(block.id, _activeClassroomId));
      if (length * width > remaining && remaining > 0) {
        const ratio = Math.sqrt(remaining / (length * width));
        length = Math.max(1, length * ratio);
        width = Math.max(1, width * ratio);
      }
      _data.__classroomSketch.length = length.toFixed(1);
      _data.__classroomSketch.width = width.toFixed(1);
    }
    const maxW = 560;
    const maxH = 320;
    const ratio = Math.max(length, width, 1);
    const roomW = Math.max(220, Math.round((length / ratio) * maxW));
    const roomH = Math.max(150, Math.round((width / ratio) * maxH));
    const room = {
      id: `room_${Date.now()}`,
      type: 'room',
      x: Math.round((760 - roomW) / 2),
      y: Math.round((460 - roomH) / 2),
      w: roomW,
      h: roomH,
      label: `${length || '?'}m x ${width || '?'}m`,
    };
    _data.__classroomSketch.objects = [
      room,
      ..._data.__classroomSketch.objects.filter(object => object.type !== 'room'),
    ];
    _selectedSketchObjectId = room.id;
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    UI.showToast(blockLength && blockWidth ? 'Aula base generada dentro de las dimensiones disponibles del bloque.' : 'Aula base generada con dimensiones aproximadas.', 'success');
  }

  function undoSketchObject() {
    if (!_sketchHistory.length) {
      UI.showToast('No hay cambios para deshacer.', 'info');
      return;
    }
    _sketchRedo.push(_cloneSketchState());
    _restoreSketchState(_sketchHistory.pop());
  }

  function redoSketchObject() {
    if (!_sketchRedo.length) {
      UI.showToast('No hay cambios para rehacer.', 'info');
      return;
    }
    _sketchHistory.push(_cloneSketchState());
    _restoreSketchState(_sketchRedo.pop());
  }

  async function deleteSelectedSketchObject() {
    if (!_selectedSketchObjectId) {
      UI.showToast('Seleccione un elemento del plano para borrarlo.', 'warning');
      return;
    }
    _ensureSketchObjects();
    const object = _findSketchObjectById(_selectedSketchObjectId);
    const label = object ? _sketchObjectLabel(object) : 'elemento seleccionado';
    const confirmed = await UI.showConfirm('Eliminar elemento', `¿Confirma eliminar ${_escape(label)} del croquis? Esta accion queda autoguardada.`);
    if (!confirmed) return;
    _pushSketchHistory();
    _data.__classroomSketch.objects = _data.__classroomSketch.objects.filter(object => object.id !== _selectedSketchObjectId);
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    UI.showToast('Elemento eliminado.', 'success');
  }

  async function clearSketch() {
    const confirmed = await UI.showConfirm('Limpiar plano completo', '¿Confirma eliminar todos los elementos del croquis de esta aula? Esta accion queda autoguardada.');
    if (!confirmed) return;
    _pushSketchHistory();
    _data.__classroomSketch = {
      ...(_data.__classroomSketch || {}),
      objects: [],
    };
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    UI.showToast('Croquis limpiado.', 'success');
  }

  function renderSchoolPlan() {
    _loadDraft();
    const root = document.getElementById('school-plan-root');
    if (!root) return;
    const sketch = _data.__classroomSketch || {};
    _ensureClassrooms();
    const objects = _schoolPlanObjects();
    const metrics = _schoolPlanMetrics(sketch, objects);

    root.innerHTML = `
      <div class="school-plan">
        <section class="school-plan__kpis">
          ${_planKpi('Area construida relevada', `${metrics.areaTotal.toFixed(2)} m2`, 'Aulas/ambientes con dimensiones')}
          ${_planKpi('Aulas cargadas', metrics.rooms, 'Ambientes dibujados')}
          ${_planKpi('Bloques', metrics.blocks, 'Bloques registrados')}
          ${_planKpi('Sanitarios', metrics.sanitaries, 'Baterias o banos cargados')}
          ${_planKpi('Puertas', metrics.doors, _stateSummaryText(metrics.states.door))}
          ${_planKpi('Ventanas', metrics.windows, _stateSummaryText(metrics.states.window))}
          ${_planKpi('Tomas', metrics.outlets, _stateSummaryText(metrics.states.outlet))}
          ${_planKpi('Alertas', metrics.alerts, 'Mal estado, severo o riesgo')}
        </section>

        <section class="school-plan__layout">
          <div class="school-plan__board">
            <div class="school-plan__toolbar">
              <div class="school-plan__layers">
                ${Object.entries(_planLayers).map(([key, enabled]) => `
                  <label>
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="MecFormModule.togglePlanLayer('${_escape(key)}', this.checked)">
                    <span>${_escape(_planLayerLabel(key))}</span>
                  </label>`).join('')}
              </div>
              <div class="school-plan__exports">
                <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.exportPlanJson()">JSON</button>
                <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.exportPlanSvg()">SVG</button>
                <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.exportPlanPng()">PNG</button>
                <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.printPlanPdf()">PDF</button>
                <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deletePlanSelection()">Eliminar</button>
              </div>
            </div>
            <canvas id="school-plan-canvas" width="900" height="560" aria-label="Plano general de la escuela"></canvas>
          </div>
          <aside class="school-plan__side">
            <h3>Aulas y elementos</h3>
            <div class="school-plan__legend">
              <span><i class="legend-room"></i>Aula</span>
              <span><i class="legend-door"></i>Puerta</span>
              <span><i class="legend-window"></i>Ventana</span>
              <span><i class="legend-outlet"></i>Toma</span>
              <span><i class="legend-damage"></i>Dano</span>
            </div>
            <div class="school-plan__list">
              ${(_data.__classrooms || []).map(_renderPlanClassroomRow).join('')}
              ${!(_data.__classrooms || []).length && !objects.length ? '<p class="text-muted">Todavia no hay elementos cargados. Genere el aula base desde el Cuestionario MEC.</p>' : ''}
            </div>
          </aside>
        </section>
      </div>`;

    _drawSchoolPlan();
    _bindSchoolPlanCanvas();
  }

  function _planKpi(label, value, note) {
    return `
      <article class="school-plan-kpi">
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _planLayerLabel(key) {
    return {
      aulas: 'Aulas',
      aberturas: 'Puertas/Ventanas',
      electricidad: 'Tomas',
      danos: 'Danos',
      etiquetas: 'Etiquetas',
    }[key] || key;
  }

  function togglePlanLayer(key, enabled) {
    if (!(key in _planLayers)) return;
    _planLayers[key] = Boolean(enabled);
    _drawSchoolPlan();
  }

  function _renderPlanObjectRow(object) {
    const label = object.ficha?.codigo || object.classroomName || _sketchLabel(object.type);
    const state = object.ficha?.estado || 'Sin estado';
    const dims = _sketchDimensionsText(object);
    return `
      <button class="school-plan-object school-plan-object--child ${_selectedPlanId === (object.planId || object.id) ? 'school-plan-object--active' : ''}" type="button"
        ondblclick="MecFormModule.editPlanObject('${_escape(object.planId || object.id)}')"
        onclick="MecFormModule.selectPlanItem('${_escape(object.planId || object.id)}')">
        <span class="school-plan-object__type">${_escape(_sketchLabel(object.type))}</span>
        <strong>${_escape(label)}</strong>
        <small>${_escape([object.classroomName, state, dims].filter(Boolean).join(' · '))}</small>
      </button>`;
  }

  function _renderPlanClassroomRow(room, index) {
    const block = _blockById(room.blockId);
    const active = _selectedClassroomIdFromPlan() === room.id;
    const children = _schoolPlanObjects().filter(object => object.classroomId === room.id && object.type !== 'room');
    return `
      <article class="school-plan-group ${active ? 'school-plan-group--open' : ''}">
        <button class="school-plan-object school-plan-object--room ${active ? 'school-plan-object--active' : ''}" type="button"
          ondblclick="MecFormModule.editPlanClassroom('${_escape(room.id)}')"
          onclick="MecFormModule.selectPlanItem('room::${_escape(room.id)}')">
          <span class="school-plan-object__type">Aula</span>
          <strong>${_escape(room.name || `Aula ${index + 1}`)}</strong>
          <small>${_escape([block?.bloque_codigo, room.floor, room.length && room.width ? `${room.length} x ${room.width} m` : 'Sin dimensiones'].filter(Boolean).join(' · '))}</small>
        </button>
        ${active ? `
          <div class="school-plan-group__children">
            ${children.length ? children.map(_renderPlanObjectRow).join('') : '<p class="text-muted">Esta aula aun no tiene elementos dibujados.</p>'}
          </div>` : ''}
      </article>`;
  }

  function _selectedClassroomIdFromPlan() {
    if (!_selectedPlanId) return (_data.__classrooms || [])[0]?.id || null;
    if (String(_selectedPlanId).startsWith('room::')) return String(_selectedPlanId).replace('room::', '');
    if (String(_selectedPlanId).includes('::')) return String(_selectedPlanId).split('::')[0];
    return null;
  }

  function _schoolPlanMetrics(sketch, objects) {
    const classrooms = _data.__classrooms || [];
    const areaTotal = classrooms.reduce((sum, room) => sum + (Number(room.length || 0) * Number(room.width || 0)), 0);
    const states = { door: {}, window: {}, outlet: {}, damage: {} };
    objects.forEach(object => {
      if (states[object.type]) {
        const state = object.ficha?.estado || 'Sin estado';
        states[object.type][state] = (states[object.type][state] || 0) + 1;
      }
    });
    return {
      areaTotal,
      rooms: classrooms.length,
      blocks: (_data.__blocks || []).length,
      sanitaries: (_data.__sanitaries || []).length,
      doors: objects.filter(object => object.type === 'door').length,
      windows: objects.filter(object => object.type === 'window').length,
      outlets: objects.filter(object => object.type === 'outlet').length,
      alerts: objects.filter(object => _isPlanAlert(object)).length + (_data.__sanitaries || []).filter(item => _isPlanAlert({ ficha: item })).length,
      states,
    };
  }

  function _schoolPlanObjects() {
    return (_data.__classrooms || []).flatMap((room, roomIndex) =>
      (room.objects || []).map(object => ({
        ...object,
        classroomId: room.id,
        classroomName: room.name || `Aula ${roomIndex + 1}`,
        planId: `${room.id}::${object.id}`,
      }))
    );
  }

  function _isPlanAlert(object) {
    const text = `${object.ficha?.estado || ''} ${object.ficha?.prioridad || ''}`.toLowerCase();
    return ['malo', 'severo', 'riesgo', 'urgente', 'no funciona', 'expuesto'].some(term => text.includes(term));
  }

  function _stateSummaryText(states) {
    const entries = Object.entries(states || {});
    if (!entries.length) return 'Sin clasificar';
    return entries.map(([state, count]) => `${count} ${state}`).join(', ');
  }

  function _drawSchoolPlan() {
    const canvas = document.getElementById('school-plan-canvas');
    if (!canvas) return;
    _ensureSketchObjects();
    const ctx = canvas.getContext('2d');
    _planHitAreas = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rooms = _data.__classrooms || [];
    const objects = _schoolPlanObjects();
    if (!rooms.length) {
      ctx.fillStyle = '#667085';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Plano general en espera de datos cargados', canvas.width / 2, canvas.height / 2);
      return;
    }

    const blocks = _data.__blocks?.length ? _data.__blocks : [{ id: 'sin_bloque', bloque_codigo: 'Sin bloque', largo_m: 0, ancho_m: 0 }];
    blocks.forEach((block, blockIndex) => {
      const col = blockIndex % 2;
      const row = Math.floor(blockIndex / 2);
      const x = 28 + col * 430;
      const y = 36 + row * 250;
      const w = 392;
      const h = 210;
      ctx.save();
      ctx.strokeStyle = '#172033';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(226,232,240,.32)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(23,32,51,.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
      ctx.fillStyle = 'rgba(23,32,51,.06)';
      ctx.fillRect(x + 1, y + 1, w - 2, 30);
      ctx.fillStyle = '#172033';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${block.bloque_codigo || 'Bloque'}${block.largo_m && block.ancho_m ? ` · ${block.largo_m} x ${block.ancho_m} m` : ''}`, x + 10, y + 20);

      const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
      const floors = [...new Set(blockRooms.map(room => room.floor || 'PB'))];
      if (!blockRooms.length) {
        ctx.fillStyle = '#667085';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('Bloque sin aulas asociadas', x + 12, y + 56);
      }
      floors.forEach((floor, floorIndex) => {
        const floorRooms = blockRooms.filter(room => (room.floor || 'PB') === floor);
        const bandY = y + 34 + floorIndex * 82;
        ctx.fillStyle = '#475467';
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.fillText(`Planta ${floor}`, x + 10, bandY + 12);
        _layoutPlanRooms(floorRooms, x + 14, bandY + 20, w - 28, 58).forEach(item => {
          if (_planLayers.aulas) _drawPlanClassroom(ctx, item.room, item.x, item.y, item.w, item.h);
        });
        _drawSharedWallTicks(ctx, _layoutPlanRooms(floorRooms, x + 14, bandY + 20, w - 28, 58));
      });
      ctx.restore();
    });
  }

  function _layoutPlanRooms(rooms, x, y, w, h) {
    const total = rooms.reduce((sum, room) => sum + Math.max(1, Number(room.length || 1)), 0) || 1;
    let cursor = x;
    return rooms.map(room => {
      const share = Math.max(54, (Number(room.length || 1) / total) * w);
      const roomWidth = Math.min(share, x + w - cursor);
      const aspect = Number(room.length || 1) / Math.max(1, Number(room.width || 1));
      const roomHeight = Math.max(34, Math.min(h, roomWidth / Math.max(.8, aspect)));
      const item = { room, x: cursor, y: y + Math.max(0, (h - roomHeight) / 2), w: Math.max(42, roomWidth), h: roomHeight };
      cursor += roomWidth;
      return item;
    });
  }

  function _drawSharedWallTicks(ctx, items) {
    if (items.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 2;
    for (let i = 1; i < items.length; i += 1) {
      const prev = items[i - 1];
      const current = items[i];
      const x = current.x;
      const top = Math.min(prev.y, current.y);
      const bottom = Math.max(prev.y + prev.h, current.y + current.h);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    ctx.restore();
  }

  function _drawPlanClassroom(ctx, room, x, y, w, h) {
    const selected = _selectedClassroomIdFromPlan() === room.id;
    _planHitAreas.push({ id: `room::${room.id}`, type: 'room', roomId: room.id, x, y, w, h });
    ctx.strokeStyle = selected ? '#111827' : '#2b6cb0';
    ctx.fillStyle = selected ? 'rgba(43,108,176,.18)' : 'rgba(43,108,176,.08)';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(43,108,176,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, Math.max(0, w - 8), Math.max(0, h - 8));
    if (_planLayers.etiquetas) {
      ctx.fillStyle = '#173f68';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(room.name || 'Aula', x + 6, y + 14);
    }
    _drawPlanOpenings(ctx, room, x, y, w, h);
  }

  function _drawPlanOpenings(ctx, room, x, y, w, h) {
    const roomObject = (room.objects || []).find(object => object.type === 'room');
    if (!roomObject) return;
    const sx = w / roomObject.w;
    const sy = h / roomObject.h;
    (room.objects || [])
      .filter(object => ['door', 'window', 'outlet'].includes(object.type))
      .forEach(object => {
        if (['door', 'window'].includes(object.type) && !_planLayers.aberturas) return;
        if (object.type === 'outlet' && !_planLayers.electricidad) return;
        const ox = x + (object.x - roomObject.x) * sx;
        const oy = y + (object.y - roomObject.y) * sy;
        if (object.type === 'door') {
          const vertical = ['left', 'right'].includes(_openingSide(object));
          const ow = Math.max(8, object.w * sx);
          const oh = Math.max(8, object.h * sy);
          const length = vertical ? oh : Math.max(12, ow);
          _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 8, y: oy - 8, w: Math.max(18, ow + 16), h: Math.max(18, oh + 16) });
          ctx.strokeStyle = '#2f855a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(vertical ? ox : ox + length, vertical ? oy + length : oy);
          ctx.stroke();
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(ox, oy, length, 0, Math.PI / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        if (object.type === 'window') {
          const vertical = ['left', 'right'].includes(_openingSide(object));
          const ow = Math.max(8, object.w * sx);
          const oh = Math.max(8, object.h * sy);
          const length = vertical ? oh : Math.max(12, ow);
          _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 8, y: oy - 8, w: Math.max(18, ow + 16), h: Math.max(18, oh + 16) });
          ctx.strokeStyle = '#2b6cb0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(vertical ? ox : ox + length, vertical ? oy + length : oy);
          ctx.stroke();
          return;
        }
        ctx.fillStyle = '#b7791f';
        _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 8, y: oy - 8, w: 16, h: 16 });
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    if (_planLayers.danos) {
      (room.objects || []).filter(object => object.type === 'damage').forEach(object => {
        const ox = x + (object.x - roomObject.x) * sx;
        const oy = y + (object.y - roomObject.y) * sy;
        _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 6, y: oy - 6, w: 18, h: 18 });
        ctx.strokeStyle = '#c53030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + 10, oy + 10);
        ctx.moveTo(ox + 10, oy);
        ctx.lineTo(ox, oy + 10);
        ctx.stroke();
      });
    }
    (room.objects || []).filter(object => object.type === 'stair').forEach(object => {
      const ox = x + (object.x - roomObject.x) * sx;
      const oy = y + (object.y - roomObject.y) * sy;
      const ow = Math.max(18, object.w * sx);
      const oh = Math.max(12, object.h * sy);
      _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox, y: oy, w: ow, h: oh });
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, oy, ow, oh);
      for (let i = 1; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(ox + (ow / 5) * i, oy);
        ctx.lineTo(ox + (ow / 5) * i, oy + oh);
        ctx.stroke();
      }
    });
  }

  function editPlanObject(planId) {
    const [classroomId, objectId] = String(planId).includes('::') ? String(planId).split('::') : [_activeClassroomId, planId];
    if (classroomId && classroomId !== _activeClassroomId) {
      _syncActiveClassroomFromSketch();
      _activeClassroomId = classroomId;
      _loadActiveClassroomIntoSketch();
    }
    _selectedSketchObjectId = objectId;
    const object = _findSketchObjectById(objectId);
    if (!object) return;
    if (_hasSketchFicha(object)) {
      openSketchObjectFicha(objectId);
      return;
    }
    UI.showToast('Este elemento se edita desde el croquis del aula.', 'info');
  }

  function editPlanClassroom(id) {
    selectModule('aulas');
    selectClassroom(id);
  }

  function selectPlanItem(id) {
    _selectedPlanId = id;
    renderSchoolPlan();
  }

  async function deletePlanSelection() {
    if (!_selectedPlanId) {
      UI.showToast('Seleccione un aula o elemento en el plano general.', 'warning');
      return;
    }
    if (String(_selectedPlanId).startsWith('room::')) {
      const classroomId = String(_selectedPlanId).replace('room::', '');
      const room = (_data.__classrooms || []).find(item => item.id === classroomId);
      if (!room) return;
      const confirmed = await UI.showConfirm('Eliminar aula', `¿Confirma eliminar ${_escape(room.name || 'esta aula')} y todos sus elementos?`);
      if (!confirmed) return;
      _data.__classrooms = (_data.__classrooms || []).filter(item => item.id !== classroomId);
      if (_activeClassroomId === classroomId) {
        _activeClassroomId = _data.__classrooms[0]?.id || null;
        if (_activeClassroomId) _loadActiveClassroomIntoSketch();
        else _data.__classroomSketch = { objects: [] };
      }
      _selectedPlanId = null;
      _saveDraft(false);
      renderSchoolPlan();
      UI.showToast('Aula eliminada.', 'success');
      return;
    }
    if (!String(_selectedPlanId).includes('::')) {
      UI.showToast('Seleccione un elemento especifico para eliminar.', 'warning');
      return;
    }
    const [classroomId, objectId] = String(_selectedPlanId).split('::');
    const room = (_data.__classrooms || []).find(item => item.id === classroomId);
    const object = (room?.objects || []).find(item => item.id === objectId);
    if (!room || !object) return;
    const confirmed = await UI.showConfirm('Eliminar elemento', `¿Confirma eliminar ${_escape(_sketchObjectLabel(object))} de ${_escape(room.name || 'esta aula')}?`);
    if (!confirmed) return;
    room.objects = (room.objects || []).filter(item => item.id !== objectId);
    if (_activeClassroomId === classroomId) _loadActiveClassroomIntoSketch();
    _selectedPlanId = null;
    _saveDraft(false);
    renderSchoolPlan();
    UI.showToast('Elemento eliminado.', 'success');
  }

  function _bindSchoolPlanCanvas() {
    const canvas = document.getElementById('school-plan-canvas');
    if (!canvas) return;
    const hit = event => {
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      };
      return [..._planHitAreas].reverse().find(area =>
        point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h);
    };
    canvas.addEventListener('click', event => {
      const area = hit(event);
      if (!area) return;
      selectPlanItem(area.id);
    });
    canvas.addEventListener('dblclick', event => {
      const area = hit(event);
      if (!area) return;
      if (area.type === 'room') editPlanClassroom(area.roomId);
      else editPlanObject(area.id);
    });
  }

  function _buildSchoolPlanModel() {
    _syncActiveClassroomFromSketch();
    _syncActiveBlock();
    const blocks = (_data.__blocks || []).map(block => {
      const floors = [...new Set((_data.__classrooms || [])
        .filter(room => room.blockId === block.id)
        .map(room => room.floor || 'PB'))];
      return {
        ...block,
        floors: floors.map(floor => ({
          id: floor,
          classrooms: (_data.__classrooms || [])
            .filter(room => room.blockId === block.id && (room.floor || 'PB') === floor)
            .map(room => ({
              id: room.id,
              name: room.name,
              dimensions: {
                length_m: Number(room.length || 0),
                width_m: Number(room.width || 0),
                area_m2: Number(room.length || 0) * Number(room.width || 0),
              },
              geometryGraph: _geometryGraphForRoom(room),
              openings: room.openings || '',
              objects: (room.objects || []).map(object => ({
                id: object.id,
                type: object.type,
                geometry: _objectGeometryForExport(room, object),
                ficha: object.ficha || {},
              })),
            })),
        })),
      };
    });
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: MEC_SCHEMA.version,
      source: 'CIALPA plano escolar',
      blocks,
      classroomsWithoutBlock: (_data.__classrooms || []).filter(room => !room.blockId),
      sanitaries: _data.__sanitaries || [],
      evidenceIndex: _buildEvidenceIndex(),
    };
  }

  function _geometryGraphForRoom(room) {
    const roomObject = (room.objects || []).find(item => item.type === 'room');
    const length = Number(room.length || 0);
    const width = Number(room.width || 0);
    if (!roomObject || !length || !width) {
      return { corners: [], walls: [], openings: [] };
    }
    const corners = [
      { id: 'c1', label: 'C1', x_m: 0, y_m: 0 },
      { id: 'c2', label: 'C2', x_m: length, y_m: 0 },
      { id: 'c3', label: 'C3', x_m: length, y_m: width },
      { id: 'c4', label: 'C4', x_m: 0, y_m: width },
    ];
    const walls = [
      { id: 'w_top', label: 'Pared norte', side: 'top', from: 'c1', to: 'c2', length_m: length },
      { id: 'w_right', label: 'Pared este', side: 'right', from: 'c2', to: 'c3', length_m: width },
      { id: 'w_bottom', label: 'Pared sur', side: 'bottom', from: 'c4', to: 'c3', length_m: length },
      { id: 'w_left', label: 'Pared oeste', side: 'left', from: 'c1', to: 'c4', length_m: width },
    ];
    const openings = (room.objects || [])
      .filter(object => ['door', 'window'].includes(object.type))
      .map(object => {
        const side = object.attached?.side || _nearestRoomSide(roomObject, object);
        return {
          id: object.id,
          type: object.type,
          wallSide: side,
          wallId: `w_${side}`,
          offset_m: _openingOffsetMeters(room, object, side),
          length_m: _openingLengthMeters(room, object, side),
          ficha: object.ficha || {},
        };
      });
    return { corners, walls, openings };
  }

  function _nearestRoomSide(roomObject, object) {
    const distances = [
      { side: 'top', value: Math.abs(object.y - roomObject.y) },
      { side: 'bottom', value: Math.abs((object.y + object.h) - (roomObject.y + roomObject.h)) },
      { side: 'left', value: Math.abs(object.x - roomObject.x) },
      { side: 'right', value: Math.abs((object.x + object.w) - (roomObject.x + roomObject.w)) },
    ].sort((a, b) => a.value - b.value);
    return distances[0]?.side || 'top';
  }

  function _openingOffsetMeters(room, object, side) {
    const roomObject = (room.objects || []).find(item => item.type === 'room');
    if (!roomObject) return 0;
    const scaleX = Number(room.length || 0) / roomObject.w || 0;
    const scaleY = Number(room.width || 0) / roomObject.h || 0;
    if (side === 'left' || side === 'right') return Math.max(0, (object.y - roomObject.y) * scaleY);
    return Math.max(0, (object.x - roomObject.x) * scaleX);
  }

  function _openingLengthMeters(room, object, side) {
    const roomObject = (room.objects || []).find(item => item.type === 'room');
    if (!roomObject) return 0;
    const scaleX = Number(room.length || 0) / roomObject.w || 0;
    const scaleY = Number(room.width || 0) / roomObject.h || 0;
    return (side === 'left' || side === 'right') ? object.h * scaleY : object.w * scaleX;
  }

  function _objectGeometryForExport(room, object) {
    const roomObject = (room.objects || []).find(item => item.type === 'room');
    if (!roomObject) return { ...object };
    const scaleX = Number(room.length || 0) / roomObject.w || 0;
    const scaleY = Number(room.width || 0) / roomObject.h || 0;
    if (object.type === 'wall') {
      return {
        x1_m: (object.x1 - roomObject.x) * scaleX,
        y1_m: (object.y1 - roomObject.y) * scaleY,
        x2_m: (object.x2 - roomObject.x) * scaleX,
        y2_m: (object.y2 - roomObject.y) * scaleY,
      };
    }
    if (object.x !== undefined) {
      if (['door', 'window'].includes(object.type)) {
        const side = object.attached?.side || _nearestRoomSide(roomObject, object);
        return {
          x_m: (object.x - roomObject.x) * scaleX,
          y_m: (object.y - roomObject.y) * scaleY,
          wallSide: side,
          offset_m: _openingOffsetMeters(room, object, side),
          length_m: _openingLengthMeters(room, object, side),
          visual_thickness_m: ['left', 'right'].includes(side) ? object.w * scaleX : object.h * scaleY,
        };
      }
      return {
        x_m: (object.x - roomObject.x) * scaleX,
        y_m: (object.y - roomObject.y) * scaleY,
        length_m: object.w ? object.w * scaleX : undefined,
        width_m: object.h ? object.h * scaleY : undefined,
      };
    }
    return { ...object };
  }

  function _downloadTextFile(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function exportPlanJson() {
    const model = _buildSchoolPlanModel();
    _downloadTextFile(`cialpa-plano-${Date.now()}.json`, 'application/json', JSON.stringify(model, null, 2));
    UI.showToast('Modelo JSON del plano descargado.', 'success');
  }

  function _planSvgMarkup() {
    const rooms = _data.__classrooms || [];
    const blocks = _data.__blocks?.length ? _data.__blocks : [{ id: 'sin_bloque', bloque_codigo: 'Sin bloque' }];
    const parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">',
      '<rect width="900" height="560" fill="#f8fafc"/>',
    ];
    blocks.forEach((block, blockIndex) => {
      const col = blockIndex % 2;
      const row = Math.floor(blockIndex / 2);
      const x = 28 + col * 430;
      const y = 36 + row * 250;
      const w = 392;
      const h = 210;
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#eef2f7" stroke="#172033" stroke-width="2"/>`);
      parts.push(`<text x="${x + 10}" y="${y + 20}" font-family="system-ui" font-size="15" font-weight="800" fill="#172033">${_escape(block.bloque_codigo || 'Bloque')}</text>`);
      const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
      const floors = [...new Set(blockRooms.map(room => room.floor || 'PB'))];
      floors.forEach((floor, floorIndex) => {
        const floorRooms = blockRooms.filter(room => (room.floor || 'PB') === floor);
        const bandY = y + 34 + floorIndex * 82;
        parts.push(`<text x="${x + 10}" y="${bandY + 12}" font-family="system-ui" font-size="11" font-weight="800" fill="#475467">Planta ${_escape(floor)}</text>`);
        _layoutPlanRooms(floorRooms, x + 14, bandY + 20, w - 28, 58).forEach(item => {
          parts.push(`<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="#eaf4ff" stroke="#2b6cb0" stroke-width="2"/>`);
          parts.push(`<rect x="${item.x + 4}" y="${item.y + 4}" width="${Math.max(0, item.w - 8)}" height="${Math.max(0, item.h - 8)}" fill="none" stroke="#8db8e8" stroke-width="1"/>`);
          parts.push(`<text x="${item.x + 6}" y="${item.y + 14}" font-family="system-ui" font-size="10" font-weight="800" fill="#173f68">${_escape(item.room.name || 'Aula')}</text>`);
        });
      });
    });
    parts.push('</svg>');
    return parts.join('');
  }

  function exportPlanSvg() {
    _downloadTextFile(`cialpa-plano-${Date.now()}.svg`, 'image/svg+xml', _planSvgMarkup());
    UI.showToast('SVG del plano descargado.', 'success');
  }

  function exportPlanPng() {
    const canvas = document.getElementById('school-plan-canvas');
    if (!canvas) {
      UI.showToast('Abra la vista Plano escuela para exportar PNG.', 'warning');
      return;
    }
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cialpa-plano-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
  }

  function printPlanPdf() {
    const canvas = document.getElementById('school-plan-canvas');
    if (!canvas) {
      UI.showToast('Abra la vista Plano escuela para imprimir el plano.', 'warning');
      return;
    }
    _drawSchoolPlan();
    const image = canvas.toDataURL('image/png');
    const model = _buildSchoolPlanModel();
    const metrics = _schoolPlanMetrics(_data.__classroomSketch || {}, _schoolPlanObjects());
    const version = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.VERSION : MEC_SCHEMA.version;
    const title = `Plano escuela CIALPA - ${new Date().toLocaleString('es-PY')}`;
    const popup = window.open('', '_blank');
    if (!popup) {
      UI.showToast('El navegador bloqueo la ventana de impresion. Habilite ventanas emergentes para generar PDF.', 'warning', 7000);
      return;
    }
    popup.document.write(`
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${_escape(title)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { margin: 0; color: #172033; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
          header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #172033; padding-bottom: 8px; margin-bottom: 10px; }
          h1 { margin: 0; font-size: 18px; }
          small { color: #667085; }
          .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
          .kpi { border: 1px solid #dbe5f1; padding: 8px; border-radius: 6px; }
          .kpi span { display: block; color: #667085; font-size: 10px; text-transform: uppercase; font-weight: 800; }
          .kpi strong { display: block; font-size: 16px; }
          img { width: 100%; height: auto; border: 1px solid #dbe5f1; }
          footer { margin-top: 8px; color: #667085; font-size: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Plano escuela CIALPA</h1>
            <small>Edicion vigente v${_escape(version)} · ${_escape(model.exportedAt)}</small>
          </div>
          <small>Exportacion para impresion / guardar como PDF</small>
        </header>
        <section class="kpis">
          <div class="kpi"><span>Area relevada</span><strong>${metrics.areaTotal.toFixed(2)} m2</strong></div>
          <div class="kpi"><span>Aulas</span><strong>${metrics.rooms}</strong></div>
          <div class="kpi"><span>Bloques</span><strong>${metrics.blocks}</strong></div>
          <div class="kpi"><span>Puertas</span><strong>${metrics.doors}</strong></div>
          <div class="kpi"><span>Ventanas</span><strong>${metrics.windows}</strong></div>
        </section>
        <img src="${image}" alt="Plano general de la escuela">
        <footer>
          <span>CIALPA - Relevamiento Escolar</span>
          <span>Fuente: datos cargados en el dispositivo / borrador local</span>
        </footer>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>`);
    popup.document.close();
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: MEC_SCHEMA.version,
      values: _data,
      evidenceIndex: _buildEvidenceIndex(),
    };
    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard?.writeText(json).then(
      () => UI.showToast('JSON copiado al portapapeles.', 'success'),
      () => {
        console.log(json);
        UI.showToast('No se pudo copiar. El JSON fue enviado a la consola.', 'warning');
      }
    );
  }

  function _buildEvidenceIndex() {
    return Object.entries(_data.__evidence || {}).flatMap(([fieldPath, photos]) =>
      photos.map((photo, index) => ({
        fieldPath,
        index: index + 1,
        name: photo.name,
        type: photo.type,
        size: photo.size,
        capturedAt: photo.capturedAt,
      }))
    );
  }

  function toggleModule(moduleId) {
    selectModule(moduleId);
  }

  return {
    init,
    showFieldInfo,
    selectModule,
    nextModule,
    previousModule,
    validate,
    saveNow,
    saveSketchAndNext,
    resetDraft,
    exportJson,
    toggleModule,
    setSketchTool,
    selectBlock,
    selectBlockForClassrooms,
    newBlock,
    saveCurrentBlock,
    selectClassroom,
    newClassroom,
    saveCurrentClassroom,
    addSanitary,
    regenerateSanitaryPlan,
    addSanitaryStall,
    deleteSanitaryStall,
    setSanitaryValue,
    setSanitaryEvidence,
    deleteSanitary,
    editSelectedSketchObject,
    openSketchObjectFicha,
    closeSketchObjectFicha,
    saveSketchObjectFicha,
    renderSchoolPlan,
    editPlanObject,
    editPlanClassroom,
    selectPlanItem,
    deletePlanSelection,
    togglePlanLayer,
    exportPlanJson,
    exportPlanSvg,
    exportPlanPng,
    printPlanPdf,
    setSketchZoom,
    generateRoomSketch,
    undoSketchObject,
    redoSketchObject,
    deleteSelectedSketchObject,
    clearSketch,
  };
})();
