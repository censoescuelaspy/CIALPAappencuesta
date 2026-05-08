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

  const SKETCH_TOOLS = [
    { id: 'select', label: 'Seleccionar' },
    { id: 'wall', label: 'Pared' },
    { id: 'door', label: 'Puerta' },
    { id: 'window', label: 'Ventana' },
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
            <button class="btn btn-outline btn-sm" onclick="MecFormModule.saveNow()">Guardar</button>
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
          <p class="mec-hint">Guarde cada bloque como registro separado para poder volver, corregirlo o asociar aulas y sanitarios.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.newBlock()">+ Nuevo bloque</button>
          <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.saveCurrentBlock()">Guardar bloque actual</button>
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
          <p class="mec-hint">Cada aula queda guardada como registro independiente. Puede volver, seleccionar un aula cargada y editar su plano o sus elementos.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.newClassroom()">+ Nueva aula</button>
          <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.saveCurrentClassroom()">Guardar aula actual</button>
        </div>
        <div class="mec-repeat-list">
          ${classrooms.map((room, index) => `
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
            <div class="mec-sketch-toolset" aria-label="Herramientas de croquis">
              ${SKETCH_TOOLS.map(tool => `
                <button class="btn btn-outline btn-sm ${_sketchTool === tool.id ? 'mec-sketch-tool--active' : ''}"
                  type="button" data-sketch-tool="${_escape(tool.id)}"
                  onclick="MecFormModule.setSketchTool('${_escape(tool.id)}')">${_escape(tool.label)}</button>`).join('')}
            </div>
            <div class="mec-sketch__actions">
              <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.generateRoomSketch()">Generar aula base</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.editSelectedSketchObject()">Editar ficha</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.undoSketchObject()">Deshacer</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.deleteSelectedSketchObject()">Borrar seleccionado</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.clearSketch()">Limpiar plano</button>
              <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.saveSketchAndNext()">Guardar y continuar</button>
            </div>
          </div>
          <div class="mec-sketch__board">
            <canvas id="mec-classroom-canvas" width="760" height="460" aria-label="Croquis manual del aula"></canvas>
            <small id="mec-sketch-status">${_escape(_sketchStatusText(sketch))}</small>
          </div>
        </div>
      </section>`;
  }

  function _sketchStatusText(sketch) {
    const count = (sketch.objects || []).length;
    return `${count} elemento(s). Herramienta activa: ${_sketchToolLabel(_sketchTool)}. Doble clic o doble toque para agregar; clic simple selecciona y mueve.`;
  }

  function _sketchToolLabel(toolId) {
    return SKETCH_TOOLS.find(tool => tool.id === toolId)?.label || toolId;
  }

  function _ensureClassrooms() {
    _data.__classrooms = _data.__classrooms || [];
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
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _render();
  }

  function newClassroom() {
    _syncActiveClassroomFromSketch();
    const nextNumber = (_data.__classrooms || []).length + 1;
    _activeClassroomId = `aula_${Date.now()}`;
    _data.__classroomSketch = {
      id: _activeClassroomId,
      name: `Aula ${nextNumber}`,
      blockId: _data.__activeBlockId || '',
      floor: 'PB',
      length: '',
      width: '',
      openings: '',
      objects: [],
    };
    _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _render();
    UI.showToast('Nueva aula lista para cargar.', 'success');
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
          ${_sanitaryInput(item, 'inodoros', 'Inodoros', 'number')}
          ${_sanitaryInput(item, 'lavamanos', 'Lavamanos', 'number')}
          ${_sanitaryInput(item, 'urinarios', 'Urinarios', 'number')}
          ${_sanitaryInput(item, 'duchas', 'Duchas', 'number')}
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
        <textarea class="form-control" rows="2" onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', 'observacion', this.value)">${_escape(item.observacion || '')}</textarea>

        <div class="mec-object-evidence">
          <input id="${evidenceId}" type="file" accept="image/*" capture="environment" multiple style="display:none;"
            onchange="MecFormModule.setSanitaryEvidence('${_escape(item.id)}', this)">
          <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('${evidenceId}')?.click()">Sacar foto</button>
          <span>${(item.evidencias || []).length ? `${item.evidencias.length} foto(s) asociada(s)` : 'Sin foto asociada'}</span>
        </div>
      </article>`;
  }

  function _sanitaryInput(item, key, label, type) {
    return `
      <div class="form-group">
        <label>${_escape(label)}</label>
        <input class="form-control" type="${_escape(type)}" min="0" step="1" value="${_escape(item[key] || '')}"
          onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value)">
      </div>`;
  }

  function addSanitary() {
    _ensureSanitaries();
    _data.__sanitaries.push(_sanitaryTemplate(_data.__sanitaries.length + 1));
    _saveDraft(false);
    _render();
    UI.showToast('Sanitario agregado.', 'success');
  }

  function setSanitaryValue(id, key, value) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    item[key] = value;
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
      input.addEventListener('input', () => {
        _data.__classroomSketch = _data.__classroomSketch || {};
        _data.__classroomSketch[input.dataset.sketchField] = input.value;
        _syncActiveClassroomFromSketch();
        _saveDraft(false);
      });
    });

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let draftObject = null;
    let movingObject = null;
    let resizingObject = null;
    let moveOffset = null;
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

      const handleHit = _findResizeHandleAt(point);
      const selected = handleHit?.object || _findSketchObjectAt(point);
      _selectedSketchObjectId = selected?.id || null;
      if (handleHit) {
        resizingObject = handleHit;
      } else if (selected) {
        movingObject = selected;
        moveOffset = _moveOffsetForObject(selected, point);
      }
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
    };
    const move = event => {
      event.preventDefault();
      const point = pointFromEvent(event);
      if (resizingObject) {
        _resizeSketchObject(resizingObject.object, point, resizingObject.handle);
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        return;
      }
      if (movingObject) {
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
        resizingObject = null;
        _saveDraft(false);
        _updateSketchStatus();
        return;
      }
      if (movingObject) {
        movingObject = null;
        moveOffset = null;
        _saveDraft(false);
        _updateSketchStatus();
        return;
      }
      if (!drawing || !draftObject) return;
      drawing = false;
      _ensureSketchObjects();
      _data.__classroomSketch.objects.push(_normalizeSketchObject(draftObject));
      _selectedSketchObjectId = draftObject.id;
      const createdId = draftObject.id;
      draftObject = null;
      _saveDraft(false);
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
      const created = _findSketchObjectById(createdId);
      if (created && _hasSketchFicha(created)) setTimeout(() => openSketchObjectFicha(created.id), 120);
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
    if (_hasSketchFicha(object)) setTimeout(() => openSketchObjectFicha(object.id), 120);
  }

  function _defaultSketchSize(type) {
    return {
      door: { w: 56, h: 8 },
      window: { w: 86, h: 18 },
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
    const thickness = 8;
    object.h = thickness;
    const hingeX = object.x;
    const hingeY = object.y + (swing > 0 ? thickness : 0);
    const radius = Math.max(18, object.w);
    ctx.fillStyle = selected ? 'rgba(47,133,90,.28)' : 'rgba(47,133,90,.16)';
    ctx.strokeStyle = selected ? '#111827' : '#2f855a';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(object.x, object.y, object.w, thickness);
    ctx.strokeRect(object.x, object.y, object.w, thickness);
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(hingeX + radius, hingeY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, radius, 0, swing > 0 ? Math.PI / 2 : -Math.PI / 2, swing < 0);
    ctx.strokeStyle = selected ? '#111827' : 'rgba(47,133,90,.75)';
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
    _labelSketchObject(ctx, object, _openingDistanceText(object), object.x + object.w / 2, object.y + thickness + 18, true);
    if (selected) _drawOpeningCornerGuides(ctx, object);
  }

  function _sketchStyle(type) {
    return {
      room: { stroke: '#172033', fill: 'rgba(226,232,240,.28)', lineWidth: 4 },
      wall: { stroke: '#172033', fill: 'transparent', lineWidth: 5 },
      door: { stroke: '#2f855a', fill: 'rgba(47,133,90,.16)', lineWidth: 3 },
      window: { stroke: '#2b6cb0', fill: 'rgba(43,108,176,.14)', lineWidth: 3 },
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
      return `L${(object.w * scale.x).toFixed(2)} A${(object.h * scale.y).toFixed(2)}m`;
    }
    return `${(object.w * scale.x).toFixed(2)} x ${(object.h * scale.y).toFixed(2)}m`;
  }

  function _openingDistanceText(object) {
    if (!['door', 'window'].includes(object.type)) return '';
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

  function _sketchObjectContains(object, point) {
    if (object.type === 'wall') {
      return _distanceToSegment(point, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }) < 12;
    }
    if (object.type === 'outlet' || object.type === 'photo') {
      const dx = point.x - object.x;
      const dy = point.y - object.y;
      return Math.sqrt(dx * dx + dy * dy) <= _sketchPointRadius(object.type) + 10;
    }
    return point.x >= object.x && point.x <= object.x + object.w && point.y >= object.y && point.y <= object.y + object.h;
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
    if (object.type === 'door') object.h = 8;
    _clampOpeningToRoom(object);
  }

  function _clampOpeningToRoom(object) {
    if (!object || !['door', 'window'].includes(object.type)) return object;
    const room = (_data.__classroomSketch?.objects || []).find(item => item.type === 'room');
    if (!room) return object;
    object.x = Math.max(room.x, Math.min(object.x, room.x + room.w - object.w));
    object.y = Math.max(room.y, Math.min(object.y, room.y + room.h - object.h));
    return object;
  }

  function _redrawSketchCanvas() {
    const canvas = document.getElementById('mec-classroom-canvas');
    if (canvas) _drawSketch(canvas.getContext('2d'), canvas);
  }

  function _updateSketchStatus() {
    const status = document.getElementById('mec-sketch-status');
    if (status) status.textContent = _sketchStatusText(_data.__classroomSketch || {});
  }

  function _fieldValueForObjectMeters(object, axis) {
    const scale = _sketchScale();
    if (!scale || !object || object.w === undefined) return '';
    const value = axis === 'w' ? object.w * scale.x : object.h * scale.y;
    return value ? value.toFixed(2) : '';
  }

  function _applyObjectMeters(object, widthM, heightM) {
    const scale = _sketchScale();
    if (!scale || !object || object.w === undefined) return;
    const width = Number(widthM);
    const height = Number(heightM);
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
              <div class="form-group">
                <label>Tipo</label>
                ${_choiceButtons('subtipo', cfg.typeOptions, object.ficha.subtipo || '')}
              </div>
              <div class="form-group">
                <label>Estado</label>
                ${_choiceButtons('estado', cfg.estados, object.ficha.estado || '')}
              </div>
              <div class="form-group">
                <label>Material</label>
                ${_choiceButtons('material', cfg.materiales, object.ficha.material || '')}
              </div>
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
              ${cfg.extra.map(field => `
                <div class="form-group">
                  <label>${_escape(field.label)}</label>
                  ${_choiceButtons(field.key, field.options, object.ficha[field.key] || '')}
                </div>`).join('')}
            </div>
            <div class="form-group">
              <label>Observacion</label>
              <textarea class="form-control" name="observacion" rows="3">${_escape(object.ficha.observacion || '')}</textarea>
            </div>
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
      });
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
    const form = document.getElementById('form-sketch-object-ficha');
    if (!form) return;
    const data = new FormData(form);
    const object = _findSketchObjectById(data.get('object_id'));
    if (!object) return;
    object.ficha = object.ficha || {};
    ['codigo', 'subtipo', 'estado', 'material', 'largo_m', 'ancho_m', 'alto_m', 'tiene_reja', 'ventila', 'cerradura', 'abre_hacia', 'seguridad', 'prioridad', 'observacion']
      .forEach(key => {
        if (data.has(key)) object.ficha[key] = String(data.get(key) || '').trim();
      });
    _applyObjectMeters(object, object.ficha.largo_m || object.ficha.ancho_m, object.ficha.alto_m);
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    closeSketchObjectFicha();
    UI.showToast('Ficha del objeto guardada.', 'success');
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
    _saveDraft(true);
    _updateProgress();
  }

  function saveSketchAndNext() {
    _saveDraft(true);
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
    _ensureSketchObjects();
    const removed = _data.__classroomSketch.objects.pop();
    if (!removed) {
      UI.showToast('No hay elementos para deshacer.', 'info');
      return;
    }
    if (_selectedSketchObjectId === removed.id) _selectedSketchObjectId = null;
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
  }

  function deleteSelectedSketchObject() {
    if (!_selectedSketchObjectId) {
      UI.showToast('Seleccione un elemento del plano para borrarlo.', 'warning');
      return;
    }
    _ensureSketchObjects();
    _data.__classroomSketch.objects = _data.__classroomSketch.objects.filter(object => object.id !== _selectedSketchObjectId);
    _selectedSketchObjectId = null;
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
  }

  function clearSketch() {
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
              ${objects.length ? objects.map(_renderPlanObjectRow).join('') : '<p class="text-muted">Todavia no hay elementos cargados. Genere el aula base desde el Cuestionario MEC.</p>'}
            </div>
          </aside>
        </section>
      </div>`;

    _drawSchoolPlan();
  }

  function _planKpi(label, value, note) {
    return `
      <article class="school-plan-kpi">
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _renderPlanObjectRow(object) {
    const label = object.ficha?.codigo || object.classroomName || _sketchLabel(object.type);
    const state = object.ficha?.estado || 'Sin estado';
    const dims = _sketchDimensionsText(object);
    return `
      <button class="school-plan-object" type="button" onclick="MecFormModule.editPlanObject('${_escape(object.planId || object.id)}')">
        <span class="school-plan-object__type">${_escape(_sketchLabel(object.type))}</span>
        <strong>${_escape(label)}</strong>
        <small>${_escape([object.classroomName, state, dims].filter(Boolean).join(' · '))}</small>
      </button>`;
  }

  function _renderPlanClassroomRow(room, index) {
    const block = _blockById(room.blockId);
    return `
      <button class="school-plan-object school-plan-object--room" type="button" onclick="MecFormModule.editPlanClassroom('${_escape(room.id)}')">
        <span class="school-plan-object__type">Aula</span>
        <strong>${_escape(room.name || `Aula ${index + 1}`)}</strong>
        <small>${_escape([block?.bloque_codigo, room.floor, room.length && room.width ? `${room.length} x ${room.width} m` : 'Sin dimensiones'].filter(Boolean).join(' · '))}</small>
      </button>`;
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
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(226,232,240,.18)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#172033';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${block.bloque_codigo || 'Bloque'}${block.largo_m && block.ancho_m ? ` · ${block.largo_m} x ${block.ancho_m} m` : ''}`, x + 10, y + 20);

      const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
      const floors = [...new Set(blockRooms.map(room => room.floor || 'PB'))];
      floors.forEach((floor, floorIndex) => {
        const floorRooms = blockRooms.filter(room => (room.floor || 'PB') === floor);
        const bandY = y + 34 + floorIndex * 82;
        ctx.fillStyle = '#475467';
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.fillText(`Planta ${floor}`, x + 10, bandY + 12);
        _layoutPlanRooms(floorRooms, x + 14, bandY + 20, w - 28, 58).forEach(item => {
          _drawPlanClassroom(ctx, item.room, item.x, item.y, item.w, item.h);
        });
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
      const item = { room, x: cursor, y: y + Math.max(0, (h - roomHeight) / 2), w: Math.max(42, roomWidth - 5), h: roomHeight };
      cursor += roomWidth;
      return item;
    });
  }

  function _drawPlanClassroom(ctx, room, x, y, w, h) {
    ctx.strokeStyle = '#2b6cb0';
    ctx.fillStyle = 'rgba(43,108,176,.08)';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(43,108,176,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, Math.max(0, w - 8), Math.max(0, h - 8));
    ctx.fillStyle = '#173f68';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(room.name || 'Aula', x + 6, y + 14);
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
        const ox = x + (object.x - roomObject.x) * sx;
        const oy = y + (object.y - roomObject.y) * sy;
        if (object.type === 'door') {
          const ow = Math.max(12, object.w * sx);
          ctx.strokeStyle = '#2f855a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + ow, oy);
          ctx.stroke();
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(ox, oy, ow, 0, Math.PI / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        if (object.type === 'window') {
          ctx.strokeStyle = '#2b6cb0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.max(12, object.w * sx), oy);
          ctx.stroke();
          return;
        }
        ctx.fillStyle = '#b7791f';
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();
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
    newBlock,
    saveCurrentBlock,
    selectClassroom,
    newClassroom,
    saveCurrentClassroom,
    addSanitary,
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
    generateRoomSketch,
    undoSketchObject,
    deleteSelectedSketchObject,
    clearSketch,
  };
})();
