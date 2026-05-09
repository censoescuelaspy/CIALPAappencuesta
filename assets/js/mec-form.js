/**
 * CIALPA — Motor inicial de replica del cuestionario MEC
 * Renderiza esquema, aplica reglas de salto, valida y guarda borrador local.
 */

const MecFormModule = (() => {
  'use strict';

  const STORAGE_KEY = 'cialpa_mec_form_draft_v1';
  const PLAN_CANVAS_ID = 'school-plan-canvas';
  let _data = {};
  let _initialized = false;
  let _activeModuleId = 'general';
  let _sketchTool = 'select';
  let _selectedSketchObjectId = null;
  let _activeClassroomId = null;
  let _activeSanitaryId = null;
  let _selectedSanitaryObjectId = null;
  let _sketchZoom = 1;
  let _pendingSketchCenter = false;
  let _selectedPlanId = null;
  let _planHitAreas = [];
  let _activePlanDrag = null;
  const _sketchHistory = [];
  const _sketchRedo = [];
  const _planLayers = {
    aulas: true,
    aberturas: true,
    electricidad: true,
    danos: true,
    etiquetas: true,
  };

  const SKETCH_CANVAS = { width: 760, height: 460 };

  const SKETCH_TOOLS = [
    { id: 'select', label: 'Seleccionar' },
    { id: 'wall', label: 'Pared' },
    { id: 'door', label: 'Puerta' },
    { id: 'window', label: 'Ventana' },
    { id: 'stair', label: 'Escalera' },
    { id: 'board', label: 'Pizarron' },
    { id: 'outlet', label: 'Toma' },
    { id: 'damage', label: 'Daño/obs.' },
    { id: 'light', label: 'Foco' },
    { id: 'text', label: 'Texto' },
    { id: 'pencil', label: 'Lapiz' },
  ];

  const SANITARY_FIXTURES = [
    { id: 'toilet', field: 'inodoros', label: 'Inodoro', short: 'WC' },
    { id: 'sink', field: 'lavamanos', label: 'Lavamanos', short: 'LV' },
    { id: 'urinal', field: 'urinarios', label: 'Urinario', short: 'UR' },
    { id: 'shower', field: 'duchas', label: 'Ducha', short: 'DU' },
  ];

  function init() {
    _loadDraft();
    _prefillGeneralFromSelectedSchool();
    _render();
    _initialized = true;
  }

  function _loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
      _data = saved.values || saved || {};
      _activeModuleId = _data.__activeModuleId || _activeModuleId;
      _activeClassroomId = _data.__activeClassroomId || _data.__classroomSketch?.id || _activeClassroomId;
      _activeSanitaryId = _data.__activeSanitaryId || _activeSanitaryId;
    } catch {
      _data = {};
    }
  }

  function _saveDraft(showToast = false) {
    _data.__activeModuleId = _activeModuleId;
    _data.__activeClassroomId = _activeClassroomId || _data.__classroomSketch?.id || '';
    _data.__activeSanitaryId = _activeSanitaryId || '';
    _normalizeNumberedNames();
    if (_data.__classroomSketch && _data.__classrooms && (_activeClassroomId || _data.__classroomSketch.id)) _syncActiveClassroomFromSketch();
    _data.__activeClassroomId = _activeClassroomId || _data.__classroomSketch?.id || '';
    _data.__activeSanitaryId = _activeSanitaryId || '';
    _normalizeNumberedNames();
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
    _data.__evidence[key] = await Promise.all([...files].map(file => _readEvidenceFile(file, _fieldEvidenceContext(moduleId, fieldId))));
    _saveDraft(false);
    _refreshEvidenceState(key);
    UI.showToast('Foto asociada a la respuesta.', 'success');
  }

  function _readEvidenceFile(file, context = {}) {
    const indexedAt = new Date().toISOString();
    const enrichedContext = _normalizeEvidenceContext(context);
    const label = _evidenceIndexLabel(enrichedContext);
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        indexedName: `${_slug(label || 'evidencia')}_${Date.now()}_${_slug(file.name || 'foto')}`,
        type: file.type,
        size: file.size,
        capturedAt: indexedAt,
        label,
        indexKey: _slug(label || file.name || 'evidencia'),
        context: enrichedContext,
        dataUrl: reader.result,
      });
      reader.readAsDataURL(file);
    });
  }

  function _normalizeEvidenceContext(context = {}) {
    const school = _schoolEvidenceContext();
    return {
      scope: context.scope || 'cuestionario',
      schoolCode: context.schoolCode || school.schoolCode,
      schoolName: context.schoolName || school.schoolName,
      moduleLabel: context.moduleLabel || '',
      blockLabel: context.blockLabel || '',
      floorLabel: context.floorLabel || '',
      spaceLabel: context.spaceLabel || '',
      elementType: context.elementType || '',
      elementLabel: context.elementLabel || '',
      elementId: context.elementId || '',
      fieldPath: context.fieldPath || '',
    };
  }

  function _schoolEvidenceContext() {
    const selected = _selectedSchoolFromContext() || _data.__selectedSchool || {};
    const general = _data.general || {};
    return {
      schoolCode: _firstPresent(selected, ['codigo_establecimiento', 'codigo', 'CODIGO', 'id']) || general.codigo_establecimiento || general.codigo_local || '',
      schoolName: _firstPresent(selected, ['nombre', 'institucion', 'NOMBRE', 'nombre_establecimiento']) || general.nombre_institucion || general.nombre_establecimiento || '',
    };
  }

  function _fieldEvidenceContext(moduleId, fieldId) {
    const module = MEC_SCHEMA.modules.find(item => item.id === moduleId);
    const field = module?.sections.flatMap(section => section.fields).find(item => item.id === fieldId);
    return {
      scope: 'cuestionario',
      moduleLabel: module?.title || moduleId,
      elementType: 'Campo',
      elementLabel: field?.label || fieldId,
      fieldPath: `${moduleId}.${fieldId}`,
    };
  }

  function _classroomEvidenceContext(room = _data.__classroomSketch || {}) {
    const block = _blockById(room.blockId || _data.__activeBlockId);
    return {
      blockLabel: block?.bloque_codigo || room.blockId || '',
      floorLabel: _normalizeFloor(room.floor || 'Piso 1'),
      spaceLabel: room.name || '',
    };
  }

  function _sketchObjectEvidenceContext(object, room = _data.__classroomSketch || {}) {
    const roomContext = _classroomEvidenceContext(room);
    return {
      scope: 'plano',
      ...roomContext,
      elementType: _sketchLabel(object?.type),
      elementLabel: object?.ficha?.codigo || object?.label || _sketchLabel(object?.type),
      elementId: object?.id || '',
    };
  }

  function _sanitaryEvidenceContext(item) {
    return {
      scope: 'sanitario',
      blockLabel: _sanitaryBlockLabel(item),
      floorLabel: _normalizeFloor(item?.planta || 'Piso 1'),
      spaceLabel: item?.codigo || 'Sanitario',
      elementType: 'Sanitario',
      elementLabel: item?.codigo || 'Sanitario',
      elementId: item?.id || '',
    };
  }

  function _evidenceIndexLabel(context = {}) {
    const school = [context.schoolCode, context.schoolName].filter(Boolean).join(' ');
    return [
      school || 'Escuela sin codigo',
      context.blockLabel,
      context.floorLabel,
      context.spaceLabel,
      context.elementType && context.elementLabel ? `${context.elementType} ${context.elementLabel}` : context.elementLabel,
      context.fieldPath,
    ].filter(Boolean).join(' / ');
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

  function _getValue(path) {
    const [moduleId, fieldId] = path.split('.');
    return _data[moduleId]?.[fieldId];
  }

  function _selectedSchoolFromContext() {
    return (typeof SurveyModule !== 'undefined' && SurveyModule.getCurrentEscuela?.())
      || (typeof MapModule !== 'undefined' && MapModule.getSelectedEscuela?.())
      || null;
  }

  function _firstPresent(source, keys) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function _prefillGeneralFromSelectedSchool(force = false) {
    const school = _selectedSchoolFromContext();
    if (!school) return;
    _data.general = _data.general || {};
    const selectedId = String(school.id_escuela || school.codigo_local || '');
    const changedSchool = selectedId && selectedId !== String(_data.__selectedSchool?.id_escuela || _data.__selectedSchool?.codigo_local || '');
    const mapping = {
      latitud: ['latitud', 'lat', 'latitude'],
      longitud: ['longitud', 'lng', 'lon', 'longitude'],
      codigo_local: ['codigo_local', 'cod_local', 'codigo', 'id_escuela'],
      departamento: ['departamento'],
      distrito: ['distrito'],
      localidad: ['localidad', 'barrio'],
      direccion: ['direccion', 'direccion_referencia', 'referencia'],
      director: ['director', 'nombre_director', 'responsable'],
    };
    Object.entries(mapping).forEach(([field, keys]) => {
      const value = _firstPresent(school, keys);
      if (!value) return;
      if (force || changedSchool || !_data.general[field]) _data.general[field] = String(value);
    });
    _data.__selectedSchool = {
      id_escuela: school.id_escuela || '',
      codigo_local: school.codigo_local || '',
      nombre: school.nombre || school.nombre_escuela || '',
      syncedAt: new Date().toISOString(),
    };
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

  function _numberedLabel(prefix, index) {
    return `${prefix} ${Number(index || 0) + 1}`;
  }

  function _normalizeFloor(value) {
    const text = String(value || '').trim();
    if (!text || text.toUpperCase() === 'PB') return 'Piso 1';
    const number = text.match(/\d+/)?.[0];
    if (number) return `Piso ${Number(number)}`;
    return text.startsWith('Piso ') ? text : `Piso ${text}`;
  }

  function _activeFloor() {
    return _normalizeFloor(_data.__activeFloor || _data.__classroomSketch?.floor || 'Piso 1');
  }

  function _setActiveFloor(value) {
    const floor = _normalizeFloor(value);
    _data.__activeFloor = floor;
    _data.__classroomSketch = _data.__classroomSketch || {};
    _data.__classroomSketch.floor = floor;
    return floor;
  }

  function _normalizeNumberedNames() {
    _data.__blocks = (_data.__blocks || []).map((block, index) => ({
      ...block,
      bloque_codigo: _numberedLabel('Bloque', index),
    }));
    const classroomGroups = {};
    _data.__classrooms = [...(_data.__classrooms || [])]
      .map(room => ({ ...room, floor: _normalizeFloor(room.floor) }))
      .sort((a, b) => {
        const blockDiff = _blockOrderIndex(a.blockId) - _blockOrderIndex(b.blockId);
        if (blockDiff) return blockDiff;
        const floorDiff = _floorNumberValue(a.floor) - _floorNumberValue(b.floor);
        if (floorDiff) return floorDiff;
        return String(a.id || '').localeCompare(String(b.id || ''), 'es');
      })
      .map(room => {
        const key = `${room.blockId || 'sin_bloque'}::${room.floor}`;
        classroomGroups[key] = (classroomGroups[key] || 0) + 1;
        return { ...room, name: _numberedLabel('Aula', classroomGroups[key] - 1) };
      });
    if (_data.__classroomSketch) {
      const roomIndex = (_data.__classrooms || []).findIndex(room => room.id === _data.__classroomSketch.id);
      _data.__classroomSketch.name = roomIndex >= 0 ? _data.__classrooms[roomIndex].name : 'Aula 1';
      _data.__classroomSketch.floor = _normalizeFloor(_data.__classroomSketch.floor);
    }
    const sanitaryGroups = {};
    _data.__sanitaries = [...(_data.__sanitaries || [])]
      .map(item => ({ ...item, planta: _normalizeFloor(item.planta) }))
      .sort((a, b) => {
        const blockDiff = _blockOrderIndex(_blockForSanitary(a)?.id) - _blockOrderIndex(_blockForSanitary(b)?.id);
        if (blockDiff) return blockDiff;
        const floorDiff = _floorNumberValue(a.planta) - _floorNumberValue(b.planta);
        if (floorDiff) return floorDiff;
        return String(a.id || '').localeCompare(String(b.id || ''), 'es');
      })
      .map(item => {
        const block = _blockForSanitary(item);
        const key = `${block?.id || item.bloque || 'sin_bloque'}::${item.planta}`;
        sanitaryGroups[key] = (sanitaryGroups[key] || 0) + 1;
        return { ...item, codigo: _numberedLabel('Sanitario', sanitaryGroups[key] - 1) };
      });
    const activeBlock = (_data.__blocks || []).find(block => block.id === _data.__activeBlockId);
    if (activeBlock) {
      const { id: _id, ...values } = activeBlock;
      _data.bloques = {
        ...(_data.bloques || {}),
        ...values,
        bloque_codigo: activeBlock.bloque_codigo,
        cantidad_plantas: values.cantidad_plantas ?? _data.bloques?.cantidad_plantas ?? '1',
      };
    }
  }

  function _render() {
    const root = document.getElementById('mec-form-root');
    if (!root) return;
    _normalizeNumberedNames();

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
    _bindSanitarySketch(root);
    _refreshDynamicState();
    renderSchoolPlan();
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
    if (module.kind === 'schoolPlan') return _renderSchoolPlanModule();
    if (module.id === 'bloques') return _renderBlockModule(module);
    if (!module.sections?.length) return _renderDevelopmentModule(module);
    return module.sections.map(section => _renderSection(module, section)).join('');
  }

  function _renderSchoolPlanModule() {
    return `
      <section class="mec-section mec-section--plan">
        <div class="mec-section__header">
          <h4>Plano escuela</h4>
          <p class="mec-hint">Integra automaticamente bloques, pisos, aulas, sanitarios y elementos cargados en el cuestionario.</p>
        </div>
        <div id="mec-school-plan-root" data-school-plan-root></div>
      </section>`;
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
          <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteActiveBlock()">Eliminar bloque activo</button>
          <span class="mec-autosave-pill">Autoguardado</span>
        </div>
        <div class="mec-repeat-list">
          ${(_data.__blocks || []).map(block => `
            <button class="mec-repeat-item ${block.id === _data.__activeBlockId ? 'mec-repeat-item--active' : ''}" type="button"
              onclick="MecFormModule.selectBlock('${_escape(block.id)}')">
              <strong>${_escape(block.bloque_codigo || 'Bloque 1')}</strong>
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
            <label class="mec-option ${_choiceToneClass(option)} ${value === option ? 'mec-option--active' : ''}">
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
            <label class="mec-option ${_choiceToneClass(option)} ${values.includes(option) ? 'mec-option--active' : ''}">
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
    if (UI.showHtmlAlert) UI.showHtmlAlert(field.label, html, 'info');
    else UI.showAlert(field.label, _fieldHelpText(field), 'info');
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
    const visibleClassrooms = _orderedClassroomsForNavigator(_visibleClassroomsForActiveBlock(classrooms)
      .filter(room => _normalizeFloor(room.floor || 'Piso 1') === _activeFloor()));
    return `
      <section class="mec-section mec-sketch">
        <div class="mec-section__header">
          <h4>Aulas y croquis dimensionales</h4>
          <p class="mec-hint">Cada aula queda guardada automaticamente como registro independiente. En el plano del bloque puede tocar cualquier aula para activarla, moverla y acomodarla junto a las demas.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.newClassroom()">+ Nueva aula</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteActiveClassroom()">Eliminar aula activa</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteActiveFloor()">Eliminar piso activo</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteActiveBlock()">Eliminar bloque activo</button>
          <span class="mec-autosave-pill">Autoguardado</span>
        </div>
        ${_renderClassroomBlockNavigator()}
        ${_renderFloorNavigator('classrooms')}
        <div class="mec-repeat-list">
          ${visibleClassrooms.length ? visibleClassrooms.map((room, index) => `
            <button class="mec-repeat-item ${room.id === _activeClassroomId ? 'mec-repeat-item--active' : ''}" type="button"
              onclick="MecFormModule.selectClassroom('${_escape(room.id)}')">
              <strong>${_escape(_classroomHierarchyLabel(room) || room.name || `Aula ${index + 1}`)}</strong>
              <span>${_escape(_classroomSummary(room))}</span>
            </button>`).join('') : '<p class="text-muted">Este bloque todavia no tiene aulas. Use + Nueva aula.</p>'}
        </div>
        <div class="mec-sketch__layout">
          <div class="mec-sketch__tools">
            <div class="mec-sketch-meta">
              <div class="form-group">
                <label>Aula</label>
                <input class="form-control" type="text" value="${_escape(sketch.name || '')}" readonly aria-readonly="true">
              </div>
              <div class="form-group">
                <label>Bloque</label>
                ${_blockOptions(sketch.blockId || _data.__activeBlockId || '')}
              </div>
              <div class="form-group">
                <label>Piso</label>
                <input class="form-control" type="number" min="1" step="1" value="${_escape(String(sketch.floor || 'Piso 1').match(/\d+/)?.[0] || '1')}" data-sketch-field="floorNumber">
              </div>
              <div class="form-group">
                <label>Largo</label>
                <div class="mec-input-with-unit">
                  <input class="form-control" type="number" min="0" step="0.1" value="${_escape(sketch.length || '')}" data-sketch-field="length">
                  <span class="mec-unit">m</span>
                </div>
              </div>
              <div class="form-group">
                <label>Ancho</label>
                <div class="mec-input-with-unit">
                  <input class="form-control" type="number" min="0" step="0.1" value="${_escape(sketch.width || '')}" data-sketch-field="width">
                  <span class="mec-unit">m</span>
                </div>
              </div>
              <div class="form-group form-group--wide">
                <label>Aberturas / obs.</label>
                <textarea class="form-control" rows="2" data-sketch-field="openings">${_escape(sketch.openings || '')}</textarea>
              </div>
            </div>
            <div class="mec-sketch__actions">
              <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.generateRoomSketch()">Generar aula base</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.editSelectedSketchObject()">Editar ficha</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.undoSketchObject()">Deshacer cambio</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.redoSketchObject()">Rehacer</button>
              <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.flipSelectedDoorSwing()">Cambiar apertura puerta</button>
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
              <canvas id="mec-classroom-canvas" width="${SKETCH_CANVAS.width}" height="${SKETCH_CANVAS.height}" style="transform:scale(${_sketchZoom});" aria-label="Croquis manual del aula"></canvas>
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
          </div>
        </div>
      </section>`;
  }

  function _sketchStatusText(sketch) {
    const count = (sketch.objects || []).length;
    const selected = _findSketchObjectById(_selectedSketchObjectId);
    const distances = selected ? _openingDistanceText(selected) : '';
    return `${count} elemento(s). Herramienta activa: ${_sketchToolLabel(_sketchTool)}. Clic simple selecciona/mueve; toque un aula tenue del bloque para activarla. Doble clic o doble toque agrega elementos.${distances ? ` Distancias: ${distances}.` : ''}`;
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
      outlet: 'TC',
      damage: '!',
      light: '&#x2733;',
      text: 'T',
      pencil: '&#x270E;',
    }[toolId] || '+';
  }

  function _ensureClassrooms() {
    _data.__classrooms = _data.__classrooms || [];
    _ensureBlocks();
    if (!_data.__classrooms.length) {
      if (_data.__allowEmptyClassrooms) {
        _setBlankClassroomSketch(_data.__activeBlockId || '', _activeFloor());
        return;
      }
      _data.__classroomSketch = _data.__classroomSketch || { name: 'Aula 1', objects: [] };
      _activeClassroomId = _activeClassroomId || _data.__classroomSketch.id || `aula_${Date.now()}`;
      _data.__classroomSketch.id = _activeClassroomId;
      _data.__classroomSketch.name = _data.__classroomSketch.name || 'Aula 1';
      _data.__classroomSketch.blockId = _data.__classroomSketch.blockId || _data.__activeBlockId || '';
      _data.__classroomSketch.floor = _normalizeFloor(_data.__classroomSketch.floor || 'Piso 1');
      _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
    }
    _data.__classrooms.forEach((room, index) => {
      room.name = room.name || _numberedLabel('Aula', index);
      room.blockId = room.blockId || _data.__activeBlockId || '';
      room.floor = _normalizeFloor(room.floor || 'Piso 1');
      room.objects = Array.isArray(room.objects) ? room.objects : [];
    });
    _renumberClassroomsByBlockFloor();
    if (!_activeClassroomId || !_data.__classrooms.some(room => room.id === _activeClassroomId)) {
      _activeClassroomId = _data.__classrooms[0].id;
      _loadActiveClassroomIntoSketch();
    }
  }

  function _setBlankClassroomSketch(blockId = _data.__activeBlockId || '', floor = _activeFloor()) {
    _activeClassroomId = null;
    _selectedSketchObjectId = null;
    _data.__classroomSketch = {
      id: '',
      name: '',
      blockId,
      floor: _normalizeFloor(floor || 'Piso 1'),
      length: '',
      width: '',
      openings: '',
      objects: [],
    };
  }

  function _selectBestClassroomAfterDeletion(blockId = _data.__activeBlockId, floor = _activeFloor()) {
    const normalizedFloor = _normalizeFloor(floor || 'Piso 1');
    const candidates = _data.__classrooms || [];
    const next = candidates.find(room => room.blockId === blockId && _normalizeFloor(room.floor || 'Piso 1') === normalizedFloor)
      || candidates.find(room => room.blockId === blockId)
      || candidates[0]
      || null;
    if (next) {
      _data.__allowEmptyClassrooms = false;
      _activeClassroomId = next.id;
      _data.__activeBlockId = next.blockId || blockId || _data.__activeBlockId;
      _setActiveFloor(next.floor || normalizedFloor);
      _loadActiveClassroomIntoSketch();
      return next;
    }
    _data.__allowEmptyClassrooms = true;
    _setBlankClassroomSketch(blockId || _data.__activeBlockId || '', normalizedFloor);
    return null;
  }

  function _blockOrderIndex(blockId) {
    const index = (_data.__blocks || []).findIndex(block => block.id === blockId);
    return index >= 0 ? index : 9999;
  }

  function _floorNumberValue(floor) {
    return Number(String(_normalizeFloor(floor || 'Piso 1')).match(/\d+/)?.[0] || 1);
  }

  function _classroomHierarchyLabel(room) {
    const block = _blockById(room?.blockId);
    return [block?.bloque_codigo, _normalizeFloor(room?.floor || 'Piso 1'), room?.name]
      .filter(Boolean)
      .join(' · ');
  }

  function _renumberClassroomsByBlockFloor() {
    const groups = {};
    [...(_data.__classrooms || [])]
      .sort((a, b) => {
        const blockDiff = _blockOrderIndex(a.blockId) - _blockOrderIndex(b.blockId);
        if (blockDiff) return blockDiff;
        const floorDiff = _floorNumberValue(a.floor) - _floorNumberValue(b.floor);
        if (floorDiff) return floorDiff;
        return String(a.id || '').localeCompare(String(b.id || ''), 'es');
      })
      .forEach(room => {
        const key = `${room.blockId || 'sin_bloque'}::${_normalizeFloor(room.floor || 'Piso 1')}`;
        groups[key] = (groups[key] || 0) + 1;
        room.name = `Aula ${groups[key]}`;
        if (room.id === _activeClassroomId && _data.__classroomSketch) {
          _data.__classroomSketch.name = room.name;
        }
      });
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
              <strong>${_escape(block.bloque_codigo || 'Bloque 1')}</strong>
              <span>${count} aula(s)</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function _orderedClassroomsForNavigator(classrooms) {
    return [...(classrooms || [])].sort((a, b) => {
      const floorDiff = _floorNumberValue(a.floor) - _floorNumberValue(b.floor);
      if (floorDiff) return floorDiff;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
  }

  function _visibleClassroomsForActiveBlock(classrooms = _data.__classrooms || []) {
    const activeBlockId = _data.__activeBlockId || _data.__classroomSketch?.blockId || '';
    return (classrooms || []).filter(room => (room.blockId || activeBlockId) === activeBlockId);
  }

  function _cloneClassroom(sketch) {
    return JSON.parse(JSON.stringify({
      id: sketch.id || `aula_${Date.now()}`,
      name: sketch.name || '',
      blockId: sketch.blockId || _data.__activeBlockId || '',
      floor: _normalizeFloor(sketch.floor),
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
    _renumberClassroomsByBlockFloor();
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

  function _buildRoomObjectFromDimensions(length, width, id = null, rect = null) {
    const lengthM = Number(length || 7);
    const widthM = Number(width || 5);
    const size = _roomSizeFromDimensions(lengthM, widthM);
    return {
      id: id || `room_${Date.now()}`,
      type: 'room',
      x: rect ? Math.round(rect.x) : Math.round((SKETCH_CANVAS.width - size.w) / 2),
      y: rect ? Math.round(rect.y) : Math.round((SKETCH_CANVAS.height - size.h) / 2),
      w: rect ? Math.round(rect.w) : size.w,
      h: rect ? Math.round(rect.h) : size.h,
      label: `${lengthM || '?'}m x ${widthM || '?'}m`,
    };
  }

  function _roomSizeFromDimensions(length, width) {
    const block = _activeClassroomBlock();
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    const blockRect = _sketchBlockRect();
    if (blockLength && blockWidth && length && width) {
      return {
        w: Math.max(54, Math.min(blockRect.w, Math.round((length / blockLength) * blockRect.w))),
        h: Math.max(38, Math.min(blockRect.h, Math.round((width / blockWidth) * blockRect.h))),
      };
    }
    const ratio = Math.max(length, width, 1);
    return {
      w: Math.max(160, Math.round((length / ratio) * 260)),
      h: Math.max(110, Math.round((width / ratio) * 180)),
    };
  }

  function _sketchBlockRect(canvas = SKETCH_CANVAS) {
    return {
      x: 44,
      y: 64,
      w: Math.max(120, canvas.width - 88),
      h: Math.max(120, canvas.height - 130),
    };
  }

  function _roomObjectForClassroom(room) {
    return (room?.objects || []).find(object => object.type === 'room') ||
      (room?.objects || []).find(object => object.type === 'sanitary-room') ||
      null;
  }

  function _sketchRoomsForActiveBlockFloor() {
    return _visibleClassroomsForActiveBlock(_data.__classrooms || [])
      .filter(room => _normalizeFloor(room.floor || 'Piso 1') === _activeFloor());
  }

  function _layoutSketchRoomsForActiveBlock() {
    const rooms = _visibleClassroomsForActiveBlock(_data.__classrooms || [])
      .filter(room => _normalizeFloor(room.floor || 'Piso 1') === _activeFloor());
    const source = rooms.length ? rooms : [_data.__classroomSketch || {}];
    return _layoutPlanRooms(source, 58, 82, SKETCH_CANVAS.width - 116, SKETCH_CANVAS.height - 166);
  }

  function _suggestRoomRectForNewClassroom(length, width) {
    const blockRect = _sketchBlockRect();
    const size = _roomSizeFromDimensions(Number(length || 7), Number(width || 5));
    const sameFloor = _sketchRoomsForActiveBlockFloor()
      .filter(room => room.id !== _activeClassroomId)
      .map(room => _roomObjectForClassroom(room))
      .filter(Boolean);
    const padding = 10;
    const clampedSize = {
      w: Math.min(size.w, blockRect.w - padding * 2),
      h: Math.min(size.h, blockRect.h - padding * 2),
    };
    const candidates = [];
    const last = sameFloor[sameFloor.length - 1];
    if (last) {
      candidates.push({ x: last.x + last.w, y: last.y });
      candidates.push({ x: last.x, y: last.y + last.h });
    }
    for (let y = blockRect.y + padding; y <= blockRect.y + blockRect.h - clampedSize.h - padding; y += 18) {
      for (let x = blockRect.x + padding; x <= blockRect.x + blockRect.w - clampedSize.w - padding; x += 18) {
        candidates.push({ x, y });
      }
    }
    const free = candidates.find(candidate => {
      const rect = _clampRectToBlock({ ...candidate, ...clampedSize });
      return !sameFloor.some(room => _rectsOverlap(rect, room, 8));
    }) || { x: blockRect.x + padding, y: blockRect.y + padding };
    return _clampRectToBlock({ ...free, ...clampedSize });
  }

  function _ensureActiveRoomObject(rect = null) {
    _ensureSketchObjects();
    const existing = _data.__classroomSketch.objects.find(object => object.type === 'room');
    if (existing) return existing;
    const room = _buildRoomObjectFromDimensions(_data.__classroomSketch.length, _data.__classroomSketch.width, null, rect);
    _data.__classroomSketch.objects.unshift(room);
    return room;
  }

  function _rectsOverlap(a, b, gap = 0) {
    return a.x < b.x + b.w + gap &&
      a.x + a.w + gap > b.x &&
      a.y < b.y + b.h + gap &&
      a.y + a.h + gap > b.y;
  }

  function _clampRectToBounds(rect, bounds) {
    const w = Math.min(rect.w, bounds.w);
    const h = Math.min(rect.h, bounds.h);
    return {
      ...rect,
      x: Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.w - w)),
      y: Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.h - h)),
      w,
      h,
    };
  }

  function _snapValueToTargets(value, targets, threshold = 12) {
    return targets
      .filter(Number.isFinite)
      .map(target => ({ target, distance: Math.abs(value - target) }))
      .filter(item => item.distance <= threshold)
      .sort((a, b) => a.distance - b.distance)[0]?.target ?? value;
  }

  function _snapRectToGuides(rect, bounds, blockers = [], threshold = 12) {
    const clamped = _clampRectToBounds(rect, bounds);
    const xTargets = [bounds.x, bounds.x + bounds.w - clamped.w];
    const yTargets = [bounds.y, bounds.y + bounds.h - clamped.h];
    blockers.forEach(other => {
      xTargets.push(other.x, other.x + other.w - clamped.w, other.x - clamped.w, other.x + other.w);
      yTargets.push(other.y, other.y + other.h - clamped.h, other.y - clamped.h, other.y + other.h);
    });
    return _clampRectToBounds({
      ...clamped,
      x: _snapValueToTargets(clamped.x, xTargets, threshold),
      y: _snapValueToTargets(clamped.y, yTargets, threshold),
    }, bounds);
  }

  function _resolveRectOverlapInBounds(rect, blockers = [], bounds, gap = 0) {
    const desired = _clampRectToBounds(rect, bounds);
    if (!blockers.some(other => _rectsOverlap(desired, other, gap))) return desired;
    const candidates = [];
    blockers.forEach(other => {
      if (!_rectsOverlap(desired, other, gap)) return;
      candidates.push(
        { ...desired, x: other.x - desired.w - gap },
        { ...desired, x: other.x + other.w + gap },
        { ...desired, y: other.y - desired.h - gap },
        { ...desired, y: other.y + other.h + gap },
      );
    });
    const valid = candidates
      .map(candidate => _clampRectToBounds(candidate, bounds))
      .filter(candidate => !blockers.some(other => _rectsOverlap(candidate, other, gap)))
      .sort((a, b) => _rectDistance(a, desired) - _rectDistance(b, desired));
    return valid[0] || desired;
  }

  function _clampRectToBlock(rect) {
    const block = _sketchBlockRect();
    return _clampRectToBounds(rect, block);
  }

  function _clampPointToBlock(point) {
    const block = _sketchBlockRect();
    return {
      x: Math.max(block.x, Math.min(point.x, block.x + block.w)),
      y: Math.max(block.y, Math.min(point.y, block.y + block.h)),
    };
  }

  function _edgeRectsForActiveBlockFloor(extraRects = []) {
    const activeRoom = (_data.__classroomSketch?.objects || []).find(object => object.type === 'room');
    const classroomRects = _sketchRoomsForActiveBlockFloor()
      .map(room => _roomObjectForClassroom(room))
      .filter(Boolean);
    const sanitaryRects = _sanitaryRoomsForActiveBlockFloor()
      .map(item => item.object)
      .filter(Boolean);
    return [activeRoom, ...classroomRects, ...sanitaryRects, ...extraRects]
      .filter(Boolean)
      .filter((rect, index, list) => list.findIndex(item => item.id && item.id === rect.id) === index || !rect.id);
  }

  function _snapPointToPlanEdges(point, threshold = 10, extraRects = []) {
    const snapped = _clampPointToBlock(point);
    _edgeRectsForActiveBlockFloor(extraRects).forEach(rect => {
      const withinY = snapped.y >= rect.y - threshold && snapped.y <= rect.y + rect.h + threshold;
      const withinX = snapped.x >= rect.x - threshold && snapped.x <= rect.x + rect.w + threshold;
      if (withinY && Math.abs(snapped.x - rect.x) <= threshold) snapped.x = rect.x;
      if (withinY && Math.abs(snapped.x - (rect.x + rect.w)) <= threshold) snapped.x = rect.x + rect.w;
      if (withinX && Math.abs(snapped.y - rect.y) <= threshold) snapped.y = rect.y;
      if (withinX && Math.abs(snapped.y - (rect.y + rect.h)) <= threshold) snapped.y = rect.y + rect.h;
    });
    return _clampPointToBlock(snapped);
  }

  function _snapWallObject(object) {
    if (!object || object.type !== 'wall') return object;
    const p1 = _snapPointToPlanEdges({ x: object.x1, y: object.y1 });
    const p2 = _snapPointToPlanEdges({ x: object.x2, y: object.y2 });
    object.x1 = Math.round(p1.x);
    object.y1 = Math.round(p1.y);
    object.x2 = Math.round(p2.x);
    object.y2 = Math.round(p2.y);
    if (Math.abs(object.x1 - object.x2) <= 6) {
      const x = Math.round((object.x1 + object.x2) / 2);
      object.x1 = x;
      object.x2 = x;
    }
    if (Math.abs(object.y1 - object.y2) <= 6) {
      const y = Math.round((object.y1 + object.y2) / 2);
      object.y1 = y;
      object.y2 = y;
    }
    return object;
  }

  function _requestSketchCenter() {
    _pendingSketchCenter = true;
  }

  function selectClassroom(id) {
    _syncActiveClassroomFromSketch();
    _activeClassroomId = id;
    _loadActiveClassroomIntoSketch();
    _setActiveFloor(_data.__classroomSketch?.floor || 'Piso 1');
    if (_data.__classroomSketch?.blockId) {
      _data.__activeBlockId = _data.__classroomSketch.blockId;
      const block = _blockById(_data.__activeBlockId);
      if (block) {
        const { id: _id, ...values } = block;
        _data.bloques = values;
      }
    }
    _selectedSketchObjectId = null;
    _requestSketchCenter();
    _saveDraft(false);
    _render();
  }

  function newClassroom() {
    _syncActiveClassroomFromSketch();
    _data.__allowEmptyClassrooms = false;
    const block = _blockById(_data.__activeBlockId);
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    const blockRooms = _visibleClassroomsForActiveBlock(_data.__classrooms || []).filter(room => room.length && room.width);
    const referenceRoom = blockRooms[blockRooms.length - 1] || null;
    const suggestedLength = Number(referenceRoom?.length || 0) || (blockLength ? Math.min(7, blockLength) : 7);
    const suggestedWidth = Number(referenceRoom?.width || 0) || (blockWidth ? Math.min(5, blockWidth) : 5);
    const floor = _activeFloor();
    const nextNumber = (_data.__classrooms || [])
      .filter(room => room.blockId === (_data.__activeBlockId || ''))
      .filter(room => _normalizeFloor(room.floor || 'Piso 1') === floor)
      .length + 1;
    _activeClassroomId = `aula_${Date.now()}`;
    _data.__classroomSketch = {
      id: _activeClassroomId,
      name: `Aula ${nextNumber}`,
      blockId: _data.__activeBlockId || '',
      floor,
      length: suggestedLength ? suggestedLength.toFixed(1) : '',
      width: suggestedWidth ? suggestedWidth.toFixed(1) : '',
      openings: '',
      objects: [],
    };
    _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
    const rect = _suggestRoomRectForNewClassroom(_data.__classroomSketch.length, _data.__classroomSketch.width);
    _data.__classroomSketch.objects = [_buildRoomObjectFromDimensions(_data.__classroomSketch.length, _data.__classroomSketch.width, null, rect)];
    _syncActiveClassroomFromSketch();
    _selectedSketchObjectId = null;
    _requestSketchCenter();
    _saveDraft(false);
    _render();
    UI.showToast('Nueva aula agregada al plano del bloque. Puede arrastrarla hasta su posicion real.', 'success');
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
      _data.bloques = {
        bloque_codigo: 'Bloque 1',
        cantidad_plantas: '1',
        ..._data.bloques,
      };
      _data.__blocks.push({ id: _data.__activeBlockId, ..._data.bloques });
    }
  }

  function _syncActiveBlock() {
    _ensureBlocks();
    const foundIndex = (_data.__blocks || []).findIndex(item => item.id === _data.__activeBlockId);
    const currentIndex = foundIndex >= 0 ? foundIndex : (_data.__blocks || []).length;
    const previousBlock = foundIndex >= 0 ? (_data.__blocks[foundIndex] || {}) : {};
    _data.bloques = {
      bloque_codigo: _numberedLabel('Bloque', currentIndex),
      cantidad_plantas: '1',
      ...(_data.bloques || {}),
    };
    _data.bloques.bloque_codigo = _numberedLabel('Bloque', currentIndex);
    const block = { ...previousBlock, id: _data.__activeBlockId, ...(_data.bloques || {}) };
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
        ${(_data.__blocks || []).map((block, index) => `<option value="${_escape(block.id)}" ${block.id === selected ? 'selected' : ''}>${_escape(block.bloque_codigo || _numberedLabel('Bloque', index))}</option>`).join('')}
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
    const block = (_data.__blocks || []).find(item => item.id === id);
    if (!block) return;
    _data.__activeBlockId = id;
    const { id: _id, ...values } = block;
    _data.bloques = values;
    const room = (_data.__classrooms || []).find(item => item.blockId === id);
    if (!room) {
      _selectedSketchObjectId = null;
      _saveDraft(false);
      _render();
      UI.showToast('Bloque seleccionado. Pulse + Nueva aula para cargar su primera aula.', 'info');
      return;
    }
    _activeClassroomId = room.id;
    _loadActiveClassroomIntoSketch();
    _selectedSketchObjectId = null;
    _requestSketchCenter();
    _saveDraft(false);
    _render();
  }

  function newBlock() {
    _syncActiveBlock();
    const next = (_data.__blocks || []).length + 1;
    _data.__activeBlockId = `bloque_${Date.now()}`;
    _data.bloques = { bloque_codigo: _numberedLabel('Bloque', next - 1), cantidad_plantas: '1' };
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

  async function deleteActiveClassroom() {
    if (_data.__classroomSketch && _activeClassroomId) _syncActiveClassroomFromSketch();
    const room = (_data.__classrooms || []).find(item => item.id === _activeClassroomId);
    if (!room) {
      UI.showToast('No hay aula activa para eliminar.', 'warning');
      return;
    }
    const confirmed = await UI.showConfirm('Eliminar aula', `¿Confirma eliminar ${_escape(_classroomHierarchyLabel(room) || room.name || 'esta aula')} y todos sus elementos?`);
    if (!confirmed) return;
    const blockId = room.blockId || _data.__activeBlockId;
    const floor = room.floor || _activeFloor();
    _data.__classrooms = (_data.__classrooms || []).filter(item => item.id !== room.id);
    if (_selectedPlanId === `room::${room.id}`) _selectedPlanId = null;
    _selectBestClassroomAfterDeletion(blockId, floor);
    _saveDraft(false);
    _render();
    renderSchoolPlan();
    UI.showToast('Aula eliminada.', 'success');
  }

  async function deleteActiveFloor() {
    if (_data.__classroomSketch && _activeClassroomId) _syncActiveClassroomFromSketch();
    const block = _blockById(_data.__activeBlockId);
    if (!block) {
      UI.showToast('No hay bloque activo para eliminar piso.', 'warning');
      return;
    }
    const floor = _activeFloor();
    const floorNumber = _floorNumberValue(floor);
    const rooms = (_data.__classrooms || []).filter(room => room.blockId === block.id && _normalizeFloor(room.floor || 'Piso 1') === floor);
    const sanitaries = (_data.__sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block) && _normalizeFloor(item.planta || 'Piso 1') === floor);
    const configuredFloors = _configuredFloorCount(block);
    if (!rooms.length && !sanitaries.length && configuredFloors <= 1) {
      UI.showToast('El bloque solo tiene un piso vacio. Use eliminar bloque si corresponde.', 'info');
      return;
    }
    const confirmed = await UI.showConfirm(
      'Eliminar piso',
      `¿Confirma eliminar ${_escape(floor)} de ${_escape(block.bloque_codigo || 'Bloque')}? Se quitaran ${rooms.length} aula(s), ${sanitaries.length} sanitario(s) y se reenumeraran los pisos superiores.`,
    );
    if (!confirmed) return;
    _data.__classrooms = (_data.__classrooms || []).filter(room => !(room.blockId === block.id && _normalizeFloor(room.floor || 'Piso 1') === floor));
    _data.__sanitaries = (_data.__sanitaries || []).filter(item => !(_matchesBlockReference(item.bloque, block) && _normalizeFloor(item.planta || 'Piso 1') === floor));
    (_data.__classrooms || [])
      .filter(room => room.blockId === block.id && _floorNumberValue(room.floor) > floorNumber)
      .forEach(room => { room.floor = _normalizeFloor(_floorNumberValue(room.floor) - 1); });
    (_data.__sanitaries || [])
      .filter(item => _matchesBlockReference(item.bloque, block) && _floorNumberValue(item.planta) > floorNumber)
      .forEach(item => { item.planta = _normalizeFloor(_floorNumberValue(item.planta) - 1); });
    const remainingMax = Math.max(1,
      ...(_data.__classrooms || []).filter(room => room.blockId === block.id).map(room => _floorNumberValue(room.floor)),
      ...(_data.__sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block)).map(item => _floorNumberValue(item.planta)),
      configuredFloors - 1);
    block.cantidad_plantas = String(remainingMax);
    if (block.id === _data.__activeBlockId) {
      const { id: _id, ...values } = block;
      _data.bloques = { ...(_data.bloques || {}), ...values };
    }
    const nextFloor = _normalizeFloor(Math.min(floorNumber, remainingMax));
    _setActiveFloor(nextFloor);
    _selectBestClassroomAfterDeletion(block.id, nextFloor);
    _activeSanitaryId = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])[0]?.id || null;
    _selectedPlanId = null;
    _saveDraft(false);
    _render();
    renderSchoolPlan();
    UI.showToast('Piso eliminado.', 'success');
  }

  async function deleteActiveBlock() {
    _syncActiveBlock();
    const block = _blockById(_data.__activeBlockId);
    if (!block) {
      UI.showToast('No hay bloque activo para eliminar.', 'warning');
      return;
    }
    const rooms = (_data.__classrooms || []).filter(room => room.blockId === block.id);
    const sanitaries = (_data.__sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block));
    const confirmed = await UI.showConfirm(
      'Eliminar bloque',
      `¿Confirma eliminar ${_escape(block.bloque_codigo || 'este bloque')}? Se quitaran ${rooms.length} aula(s), ${sanitaries.length} sanitario(s), pisos y elementos asociados.`,
    );
    if (!confirmed) return;
    const blockIndex = Math.max(0, (_data.__blocks || []).findIndex(item => item.id === block.id));
    _data.__classrooms = (_data.__classrooms || []).filter(room => room.blockId !== block.id);
    _data.__sanitaries = (_data.__sanitaries || []).filter(item => !_matchesBlockReference(item.bloque, block));
    _data.__blocks = (_data.__blocks || []).filter(item => item.id !== block.id);
    if (!_data.__blocks.length) {
      _data.__activeBlockId = `bloque_${Date.now()}`;
      _data.bloques = { bloque_codigo: 'Bloque 1', cantidad_plantas: '1' };
      _data.__blocks.push({ id: _data.__activeBlockId, ..._data.bloques });
    } else {
      const next = _data.__blocks[Math.min(blockIndex, _data.__blocks.length - 1)];
      _data.__activeBlockId = next.id;
      const { id: _id, ...values } = next;
      _data.bloques = values;
    }
    _setActiveFloor('Piso 1');
    _selectBestClassroomAfterDeletion(_data.__activeBlockId, _activeFloor());
    _activeSanitaryId = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])[0]?.id || null;
    _selectedPlanId = null;
    _saveDraft(false);
    _render();
    renderSchoolPlan();
    UI.showToast('Bloque eliminado.', 'success');
  }

  function _ensureSanitaries() {
    _ensureBlocks();
    _data.__sanitaries = _data.__sanitaries || [];
    _data.__sanitaries.forEach((item, index) => {
      item.codigo = item.codigo || _numberedLabel('Sanitario', index);
      item.bloque = item.bloque || _activeBlockLabel();
      item.planta = _normalizeFloor(item.planta || 'Piso 1');
      item.objects = Array.isArray(item.objects) ? item.objects : [];
      _ensureSanitaryRoomObject(item);
    });
  }

  function _sanitaryTemplate(index = 1) {
    return {
      id: `san_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      codigo: `Sanitario ${index}`,
      bloque: _activeBlockLabel(),
      planta: _activeFloor(),
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
      objects: [],
      plano: { cabinas: [] },
    };
  }

  function _blockForSanitary(item) {
    return (_data.__blocks || []).find(block => _matchesBlockReference(item?.bloque, block)) || _blockById(_data.__activeBlockId);
  }

  function _sanitaryRoomObject(item) {
    return (item?.objects || []).find(object => object.type === 'sanitary-room' || object.type === 'room') || null;
  }

  function _roomSizeFromDimensionsForBlock(block, length, width) {
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    const blockRect = _sketchBlockRect();
    if (blockLength && blockWidth && length && width) {
      return {
        w: Math.max(38, Math.min(blockRect.w, Math.round((length / blockLength) * blockRect.w))),
        h: Math.max(30, Math.min(blockRect.h, Math.round((width / blockWidth) * blockRect.h))),
      };
    }
    return _roomSizeFromDimensions(length || 3, width || 2);
  }

  function _sanitaryDimensionsFromObject(item, object) {
    const block = _blockForSanitary(item);
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    const blockRect = _sketchBlockRect();
    if (!object || !blockLength || !blockWidth) return '';
    const length = (object.w / blockRect.w) * blockLength;
    const width = (object.h / blockRect.h) * blockWidth;
    return `${length.toFixed(2)} x ${width.toFixed(2)} m`;
  }

  function _syncSanitaryDimensionsFromObject(item, object) {
    const block = _blockForSanitary(item);
    const blockLength = Number(block?.largo_m || 0);
    const blockWidth = Number(block?.ancho_m || 0);
    const blockRect = _sketchBlockRect();
    if (!item || !object || !blockLength || !blockWidth) return;
    item.largo_m = ((object.w / blockRect.w) * blockLength).toFixed(2);
    item.ancho_m = ((object.h / blockRect.h) * blockWidth).toFixed(2);
  }

  function _sanitaryRoomBlockers(item) {
    const block = _blockForSanitary(item);
    const floor = _normalizeFloor(item?.planta || 'Piso 1');
    const sameFloorSanitaries = (_data.__sanitaries || [])
      .filter(other => other.id !== item.id)
      .filter(other => _matchesBlockReference(other.bloque, block))
      .filter(other => _normalizeFloor(other.planta || 'Piso 1') === floor)
      .map(other => _sanitaryRoomObject(other))
      .filter(Boolean);
    const sameFloorRooms = (_data.__classrooms || [])
      .filter(room => room.blockId === block?.id)
      .filter(room => _normalizeFloor(room.floor || 'Piso 1') === floor)
      .map(room => _roomObjectForClassroom(room))
      .filter(Boolean);
    return [...sameFloorRooms, ...sameFloorSanitaries];
  }

  function _snapSanitaryRoomRect(item, rect) {
    const bounds = _sketchBlockRect();
    const blockers = _sanitaryRoomBlockers(item);
    const snapped = _snapRectToGuides(rect, bounds, blockers, 14);
    return _resolveRectOverlapInBounds(snapped, blockers, bounds, 0);
  }

  function _suggestSanitaryRect(item, size) {
    const blockRect = _sketchBlockRect();
    const padding = 10;
    const rectSize = {
      w: Math.min(size.w, blockRect.w - padding * 2),
      h: Math.min(size.h, blockRect.h - padding * 2),
    };
    const blockers = _sanitaryRoomBlockers(item);
    const candidates = [];
    blockers.forEach(rect => {
      candidates.push({ x: rect.x + rect.w, y: rect.y });
      candidates.push({ x: rect.x, y: rect.y + rect.h });
      candidates.push({ x: rect.x - rectSize.w, y: rect.y });
      candidates.push({ x: rect.x, y: rect.y - rectSize.h });
    });
    for (let y = blockRect.y + padding; y <= blockRect.y + blockRect.h - rectSize.h - padding; y += 18) {
      for (let x = blockRect.x + padding; x <= blockRect.x + blockRect.w - rectSize.w - padding; x += 18) {
        candidates.push({ x, y });
      }
    }
    const free = candidates.find(candidate => {
      const rect = _clampRectToBlock({ ...candidate, ...rectSize });
      return !blockers.some(other => _rectsOverlap(rect, other, 0));
    }) || { x: blockRect.x + padding, y: blockRect.y + padding };
    return _snapSanitaryRoomRect(item, { ...free, ...rectSize });
  }

  function _ensureSanitaryRoomObject(item, resizeFromDimensions = false) {
    if (!item) return null;
    item.objects = Array.isArray(item.objects) ? item.objects : [];
    const block = _blockForSanitary(item);
    const length = Number(item.largo_m || 3);
    const width = Number(item.ancho_m || 2);
    const size = _roomSizeFromDimensionsForBlock(block, length, width);
    let object = _sanitaryRoomObject(item);
    if (!object) {
      const rect = _suggestSanitaryRect(item, size);
      object = {
        id: `san_room_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'sanitary-room',
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        ficha: { codigo: item.codigo || 'Sanitario' },
      };
      item.objects.unshift(object);
      return object;
    }
    object.type = 'sanitary-room';
    if (resizeFromDimensions) {
      object.w = size.w;
      object.h = size.h;
      const rect = _snapSanitaryRoomRect(item, object);
      object.x = rect.x;
      object.y = rect.y;
      object.w = rect.w;
      object.h = rect.h;
      _reflowSanitaryChildren(item);
    }
    return object;
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
    const items = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries);
    const active = _ensureActiveSanitaryForFloor(items);
    return `
      <section class="mec-section mec-sanitary">
        <div class="mec-section__header">
          <h4>Sanitarios y saneamiento</h4>
          <p class="mec-hint">Cada sanitario se ubica como ambiente independiente dentro del plano del bloque y piso activo, junto a las aulas y otros banos ya cargados.</p>
        </div>
        <div class="mec-repeat-toolbar">
          <button class="btn btn-primary btn-sm" type="button" onclick="MecFormModule.addSanitary()">+ Agregar sanitario</button>
          <span class="mec-autosave-pill">Autoguardado</span>
        </div>
        ${_renderSanitaryBlockNavigator()}
        ${_renderFloorNavigator('sanitarios')}
        <div class="mec-sanitary-list">
          ${items.length ? items.map(_renderSanitaryListItem).join('') : '<p class="text-muted">Este piso todavia no tiene sanitarios. Use + Agregar sanitario.</p>'}
        </div>
        ${active ? _renderSanitaryFloorEditor(active) : ''}
      </section>`;
  }

  function _renderSanitaryBlockNavigator() {
    _ensureBlocks();
    const blocks = _data.__blocks || [];
    if (!blocks.length) return '';
    return `
      <div class="mec-block-tabs" aria-label="Navegacion de bloques para sanitarios">
        ${blocks.map(block => {
          const count = (_data.__sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block)).length;
          return `
            <button class="mec-block-tab ${block.id === _data.__activeBlockId ? 'mec-block-tab--active' : ''}" type="button"
              onclick="MecFormModule.selectBlockForSanitaries('${_escape(block.id)}')">
              <strong>${_escape(block.bloque_codigo || 'Bloque 1')}</strong>
              <span>${count} sanitario(s)</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function _floorCountForActiveBlock() {
    const block = _blockById(_data.__activeBlockId);
    const configured = Number(block?.cantidad_plantas || _data.bloques?.cantidad_plantas || 1);
    const floors = [
      configured || 1,
      ...(_data.__classrooms || [])
        .filter(room => room.blockId === _data.__activeBlockId)
        .map(room => _floorNumberValue(room.floor)),
      ..._visibleSanitariesForActiveBlock(_data.__sanitaries || [])
        .map(item => _floorNumberValue(item.planta)),
    ];
    return Math.max(1, ...floors.filter(Number.isFinite));
  }

  function _renderFloorNavigator(context = 'classrooms') {
    const count = _floorCountForActiveBlock();
    const activeFloor = _activeFloor();
    return `
      <div class="mec-block-tabs mec-floor-tabs" aria-label="Navegacion de pisos">
        ${Array.from({ length: count }, (_, index) => {
          const floor = _normalizeFloor(index + 1);
          const rooms = (_data.__classrooms || []).filter(room => room.blockId === _data.__activeBlockId && _normalizeFloor(room.floor) === floor).length;
          const sanitaries = _visibleSanitariesForActiveBlock(_data.__sanitaries || []).filter(item => _normalizeFloor(item.planta) === floor).length;
          return `
            <button class="mec-block-tab ${floor === activeFloor ? 'mec-block-tab--active' : ''}" type="button"
              onclick="MecFormModule.selectFloor('${_escape(floor)}', '${_escape(context)}')">
              <strong>${_escape(floor)}</strong>
              <span>${rooms} aula(s) · ${sanitaries} sanitario(s)</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function selectFloor(floor, context = _activeModuleId) {
    if (_data.__classroomSketch && _data.__classrooms) _syncActiveClassroomFromSketch();
    const normalized = _setActiveFloor(floor);
    if (context === 'classrooms' || _activeModuleId === 'aulas') {
      const room = (_data.__classrooms || []).find(item =>
        item.blockId === _data.__activeBlockId && _normalizeFloor(item.floor || 'Piso 1') === normalized);
      if (room) {
        _data.__allowEmptyClassrooms = false;
        _activeClassroomId = room.id;
        _loadActiveClassroomIntoSketch();
      } else if (_data.__allowEmptyClassrooms) {
        _setBlankClassroomSketch(_data.__activeBlockId || '', normalized);
      } else {
        _activeClassroomId = `aula_${Date.now()}`;
        _data.__classroomSketch = {
          id: _activeClassroomId,
          name: 'Aula 1',
          blockId: _data.__activeBlockId || '',
          floor: normalized,
          length: '',
          width: '',
          openings: '',
          objects: [],
        };
        _data.__classrooms.push(_cloneClassroom(_data.__classroomSketch));
      }
      _requestSketchCenter();
    }
    if (context === 'sanitarios' || _activeModuleId === 'sanitarios') {
      const item = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])[0] || null;
      _activeSanitaryId = item?.id || null;
      _selectedSanitaryObjectId = null;
    }
    _saveDraft(false);
    _render();
  }

  function selectBlockForSanitaries(id) {
    const block = (_data.__blocks || []).find(item => item.id === id);
    if (!block) return;
    _data.__activeBlockId = id;
    const { id: _id, ...values } = block;
    _data.bloques = values;
    const item = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])[0] || null;
    _activeSanitaryId = item?.id || null;
    _saveDraft(false);
    _render();
  }

  function _visibleSanitariesForActiveBlock(items = _data.__sanitaries || []) {
    const block = _blockById(_data.__activeBlockId);
    if (!block) return items || [];
    return (items || []).filter(item => _matchesBlockReference(item.bloque, block));
  }

  function _visibleSanitariesForActiveBlockFloor(items = _data.__sanitaries || []) {
    const floor = _activeFloor();
    return _visibleSanitariesForActiveBlock(items)
      .filter(item => _normalizeFloor(item.planta || 'Piso 1') === floor);
  }

  function _sanitaryRoomsForActiveBlockFloor() {
    return _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])
      .map(item => ({ item, object: _ensureSanitaryRoomObject(item) }))
      .filter(entry => entry.object);
  }

  function _ensureActiveSanitaryForFloor(items = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])) {
    if (!items.length) {
      _activeSanitaryId = null;
      return null;
    }
    let active = items.find(item => item.id === _activeSanitaryId);
    if (!active) {
      active = items[0];
      _activeSanitaryId = active.id;
    }
    _ensureSanitaryRoomObject(active);
    return active;
  }

  function _renderSanitaryListItem(item, index) {
    const active = item.id === _activeSanitaryId;
    const roomObject = _sanitaryRoomObject(item);
    const dims = item.largo_m && item.ancho_m
      ? `${item.largo_m} x ${item.ancho_m} m`
      : (roomObject ? _sanitaryDimensionsFromObject(item, roomObject) : 'Sin medidas');
    return `
      <button class="mec-repeat-item ${active ? 'mec-repeat-item--active' : ''}" type="button"
        onclick="MecFormModule.selectSanitary('${_escape(item.id)}')">
        <strong>${_escape([_sanitaryBlockLabel(item), item.planta, item.codigo || `Sanitario ${index + 1}`].filter(Boolean).join(' · '))}</strong>
        <span>${_escape([dims, item.uso, item.genero, item.estado].filter(Boolean).join(' · '))}</span>
      </button>`;
  }

  function _renderSanitaryFloorEditor(item) {
    const canvasId = 'mec-sanitary-canvas';
    const dims = item.largo_m && item.ancho_m ? `${item.largo_m} x ${item.ancho_m} m` : 'Sin medidas';
    return `
      <div class="mec-sketch__layout mec-sanitary-editor">
        <div class="mec-sketch__tools">
          <div class="mec-sketch-meta mec-sketch-meta--summary">
            <div>
              <strong>${_escape(item.codigo || 'Sanitario')}</strong>
              <span>${_escape([_sanitaryBlockLabel(item), item.planta || _activeFloor(), dims].filter(Boolean).join(' · '))}</span>
            </div>
          </div>
          <div class="mec-sketch__actions">
            <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.addSanitaryOpening('${_escape(item.id)}', 'door')">+ Puerta</button>
            <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.addSanitaryOpening('${_escape(item.id)}', 'window')">+ Ventana</button>
            <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.addSanitaryStall('${_escape(item.id)}')">+ Cbn</button>
            <button class="btn btn-outline btn-sm" type="button" onclick="MecFormModule.deleteSanitaryStall('${_escape(item.id)}')">Eliminar cbn</button>
            <button class="btn btn-danger btn-sm" type="button" onclick="MecFormModule.deleteSanitary('${_escape(item.id)}')">Eliminar sanitario</button>
          </div>
        </div>
        <div class="mec-sketch__board">
          <div class="mec-sketch-canvas-wrap">
            <canvas id="${canvasId}" width="${SKETCH_CANVAS.width}" height="${SKETCH_CANVAS.height}" aria-label="Plano del piso con sanitario activo"></canvas>
          </div>
          <small id="mec-sanitary-status">${_escape(_sanitaryStatusText(item))}</small>
        </div>
      </div>
      <details class="mec-sanitary-details">
        <summary>Ficha del sanitario</summary>
        <div class="form-grid">
          <div class="form-group">
            <label>Sanitario</label>
            <input class="form-control" type="text" value="${_escape(item.codigo || '')}" readonly aria-readonly="true">
          </div>
          ${_sanitaryInput(item, 'bloque', 'Bloque', 'text')}
          ${_sanitaryInput(item, 'planta', 'Piso', 'number')}
          ${_sanitaryInput(item, 'tipo', 'Tipo', 'text')}
          ${_sanitaryInput(item, 'largo_m', 'Largo', 'number', '0.1')}
          ${_sanitaryInput(item, 'ancho_m', 'Ancho', 'number', '0.1')}
          ${_sanitaryInput(item, 'inodoros', 'Inodoros', 'number')}
          ${_sanitaryInput(item, 'lavamanos', 'Lavamanos', 'number')}
          ${_sanitaryInput(item, 'urinarios', 'Urinarios', 'number')}
          ${_sanitaryInput(item, 'duchas', 'Duchas', 'number')}
        </div>
        <div class="mec-sanitary-groups">
          <div><label class="mec-label"><span>Uso principal</span></label>${_renderSanitaryChoice('uso', item.id, ['Estudiantes', 'Docentes', 'Administrativo', 'Publico', 'Otro'], item.uso)}</div>
          <div><label class="mec-label"><span>Genero / destino</span></label>${_renderSanitaryChoice('genero', item.id, ['Mujeres', 'Varones', 'Mixto', 'Inclusivo', 'No definido'], item.genero)}</div>
          <div><label class="mec-label"><span>Accesible</span></label>${_renderSanitaryChoice('accesible', item.id, ['Si, cumple', 'Si, parcial', 'No', 'No verificable'], item.accesible)}</div>
          <div><label class="mec-label"><span>Cuenta con agua</span></label>${_renderSanitaryChoice('agua', item.id, ['Si', 'Intermitente', 'No'], item.agua)}</div>
          <div><label class="mec-label"><span>Estado general</span></label>${_renderSanitaryChoice('estado', item.id, ['Bueno', 'Regular', 'Malo', 'Fuera de servicio'], item.estado)}</div>
          <div><label class="mec-label"><span>Limpieza</span></label>${_renderSanitaryChoice('limpieza', item.id, ['Buena', 'Regular', 'Mala', 'No verificable'], item.limpieza)}</div>
          <div><label class="mec-label"><span>Privacidad</span></label>${_renderSanitaryChoice('privacidad', item.id, ['Adecuada', 'Parcial', 'Deficiente', 'Sin puertas'], item.privacidad)}</div>
          <div><label class="mec-label"><span>Desague</span></label>${_renderSanitaryChoice('desague', item.id, ['Red cloacal', 'Camara septica', 'Pozo ciego', 'Letrina', 'Otro', 'No verificable'], item.desague)}</div>
        </div>
        <label class="mec-label"><span>Observacion</span></label>
        <textarea class="form-control" rows="2"
          oninput="MecFormModule.setSanitaryValue('${_escape(item.id)}', 'observacion', this.value, false)"
          onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', 'observacion', this.value)">${_escape(item.observacion || '')}</textarea>
        <div class="mec-object-evidence">
          <input id="sanitary-photo-${_escape(item.id)}" type="file" accept="image/*" capture="environment" multiple style="display:none;"
            onchange="MecFormModule.setSanitaryEvidence('${_escape(item.id)}', this)">
          <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('sanitary-photo-${_escape(item.id)}')?.click()">Sacar foto</button>
          <span>${(item.evidencias || []).length ? `${item.evidencias.length} foto(s) asociada(s)` : 'Sin foto asociada'}</span>
        </div>
      </details>`;
  }

  function _sanitaryStatusText(item) {
    return `${_sanitaryBlockLabel(item)} · ${item.planta || _activeFloor()} · arrastre sanitario, puertas, ventanas o cbn. Estire esquinas para ajustar medidas.`;
  }

  function _activeBlockLabel() {
    const block = _blockById(_data.__activeBlockId);
    return block?.bloque_codigo || _data.bloques?.bloque_codigo || '';
  }

  function _sanitaryBlockLabel(item) {
    const block = (_data.__blocks || []).find(candidate => _matchesBlockReference(item?.bloque, candidate));
    return block?.bloque_codigo || item?.bloque || _activeBlockLabel();
  }

  function _matchesBlockReference(value, block) {
    if (!block) return false;
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return block.id === _data.__activeBlockId;
    return [block.id, block.bloque_codigo].filter(Boolean).map(item => String(item).trim().toLowerCase()).includes(raw);
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
          <div class="form-group">
            <label>Sanitario</label>
            <input class="form-control" type="text" value="${_escape(item.codigo || `Sanitario ${index + 1}`)}" readonly aria-readonly="true">
          </div>
          ${_sanitaryInput(item, 'bloque', 'Bloque', 'text')}
          ${_sanitaryInput(item, 'planta', 'Piso', 'number')}
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
              <span>Cbn y artefactos internos asociados al sanitario</span>
            </div>
            <div>
              <button class="btn btn-xs btn-outline" type="button" onclick="MecFormModule.regenerateSanitaryPlan('${_escape(item.id)}')">Regenerar</button>
              <button class="btn btn-xs btn-outline" type="button" onclick="MecFormModule.addSanitaryStall('${_escape(item.id)}')">+ Cbn</button>
              <button class="btn btn-xs btn-danger" type="button" onclick="MecFormModule.deleteSanitaryStall('${_escape(item.id)}')">Eliminar cbn</button>
            </div>
          </div>
          ${_renderSanitaryFixtureTools(item)}
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
    const value = key === 'planta' ? (String(item[key] || 'Piso 1').match(/\d+/)?.[0] || '1') : (item[key] || '');
    if (key === 'bloque') {
      _ensureBlocks();
      return `
        <div class="form-group">
          <label>${_escape(label)}</label>
          <select class="form-control"
            onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value)">
            ${(_data.__blocks || []).map((block, index) => {
              const labelValue = block.bloque_codigo || _numberedLabel('Bloque', index);
              const selected = _matchesBlockReference(item.bloque, block);
              return `<option value="${_escape(labelValue)}" ${selected ? 'selected' : ''}>${_escape(labelValue)}</option>`;
            }).join('')}
          </select>
        </div>`;
    }
    return `
      <div class="form-group">
        <label>${_escape(label)}</label>
        <input class="form-control" type="${_escape(type)}" min="${key === 'planta' ? '1' : '0'}" step="${_escape(step)}" value="${_escape(value)}"
          oninput="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value, false)"
          onchange="MecFormModule.setSanitaryValue('${_escape(item.id)}', '${_escape(key)}', this.value)">
      </div>`;
  }

  function _renderSanitaryFixtureTools(item) {
    return `
      <div class="mec-sanitary-fixtures" aria-label="Artefactos sanitarios">
        ${SANITARY_FIXTURES.map(tool => `
          <button class="mec-sanitary-fixture" type="button" onclick="MecFormModule.addSanitaryFixture('${_escape(item.id)}', '${_escape(tool.id)}')">
            <span>${_escape(tool.short)}</span>
            <strong>+ ${_escape(tool.label)}</strong>
          </button>`).join('')}
        <button class="mec-sanitary-fixture" type="button" onclick="MecFormModule.addSanitaryOpening('${_escape(item.id)}', 'door')">
          <span>Pta</span>
          <strong>+ Puerta</strong>
        </button>
        <button class="mec-sanitary-fixture" type="button" onclick="MecFormModule.addSanitaryOpening('${_escape(item.id)}', 'window')">
          <span>Vtna</span>
          <strong>+ Ventana</strong>
        </button>
      </div>`;
  }

  function _ensureSanitaryPlan(item, force = false) {
    item.plano = item.plano || {};
    item.plano.cabinas = Array.isArray(item.plano.cabinas) ? item.plano.cabinas : [];
    const target = Math.max(0, Number(item.inodoros || 0));
    if (force || item.plano.cabinas.length !== target) {
      item.plano.cabinas = Array.from({ length: target }, (_, index) => ({
        id: `cab_${index + 1}`,
        label: `Cbn ${index + 1}`,
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
    const showerCount = Math.max(0, Number(item.duchas || 0));
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
            <text x="${x + w / 2}" y="${innerY + 92}" text-anchor="middle" font-size="9" font-weight="800" fill="#475467">${_escape(stall.label || `Cbn ${index + 1}`)}</text>`;
        }).join('') : `
          <text x="210" y="104" text-anchor="middle" font-size="13" font-weight="800" fill="#667085">Indique cantidad de inodoros para generar cbn</text>`}
        ${Array.from({ length: lavCount }).map((_, index) => {
          const x = 36 + index * 30;
          return `<rect x="${x}" y="184" width="20" height="14" rx="3" fill="#fff" stroke="#2b6cb0" stroke-width="1.5"/>`;
        }).join('')}
        ${Array.from({ length: urinalCount }).map((_, index) => {
          const x = 286 + index * 24;
          return `<path d="M ${x} 184 h16 v18 q-8 8 -16 0 z" fill="#fff" stroke="#805ad5" stroke-width="1.5"/>`;
        }).join('')}
        ${Array.from({ length: showerCount }).map((_, index) => {
          const x = 340 + index * 18;
          return `<g><rect x="${x}" y="34" width="14" height="22" rx="2" fill="#fff" stroke="#0891b2" stroke-width="1.3"/><line x1="${x + 7}" y1="56" x2="${x + 7}" y2="70" stroke="#0891b2" stroke-width="1.2"/></g>`;
        }).join('')}
        <text x="18" y="204" font-size="9" font-weight="800" fill="#667085">Lavamanos: ${lavCount} · Urinarios: ${urinalCount} · Duchas: ${showerCount} · Accesible: ${_escape(item.accesible || 'No')}</text>
      </svg>`;
  }

  function addSanitary() {
    _ensureSanitaries();
    const next = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || []).length + 1;
    const item = _sanitaryTemplate(next);
    _ensureSanitaryPlan(item, true);
    _ensureSanitaryRoomObject(item);
    _data.__sanitaries.push(item);
    _activeSanitaryId = item.id;
    _saveDraft(false);
    _render();
    UI.showToast('Sanitario agregado.', 'success');
  }

  function addSanitaryFixture(id, fixtureId) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    const fixture = SANITARY_FIXTURES.find(tool => tool.id === fixtureId);
    if (!item || !fixture) return;
    const next = Math.max(0, Number(item[fixture.field] || 0)) + 1;
    item[fixture.field] = String(next);
    if (fixture.id === 'toilet') _ensureSanitaryPlan(item, true);
    _ensureSanitaryRoomObject(item);
    _saveDraft(false);
    _render();
    renderSchoolPlan();
  }

  function selectSanitary(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    _activeSanitaryId = id;
    _selectedSanitaryObjectId = null;
    const block = (_data.__blocks || []).find(candidate => _matchesBlockReference(item.bloque, candidate));
    if (block) {
      _data.__activeBlockId = block.id;
      const { id: _id, ...values } = block;
      _data.bloques = values;
    }
    _setActiveFloor(item.planta || 'Piso 1');
    _saveDraft(false);
    _render();
  }

  function addSanitaryOpening(id, type) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item || !['door', 'window'].includes(type)) return;
    const room = _ensureSanitaryRoomObject(item);
    if (!room) return;
    const size = _defaultSketchSize(type);
    const object = {
      id: `san_obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      x: Math.round(room.x + room.w / 2 - size.w / 2),
      y: Math.round(room.y + room.h - size.h),
      w: size.w,
      h: size.h,
      ficha: { codigo: _sketchLabel(type) },
    };
    _orientOpeningToSide(object, 'bottom');
    object.w = Math.min(object.w, Math.max(18, room.w));
    object.y = room.y + room.h - object.h;
    object.x = Math.max(room.x, Math.min(object.x, room.x + room.w - object.w));
    object.attached = _openingAttachment(object, room, 'bottom');
    item.objects.push(object);
    _selectedSanitaryObjectId = object.id;
    _saveDraft(false);
    _render();
    renderSchoolPlan();
    UI.showToast(`${_sketchLabel(type)} agregada al sanitario.`, 'success');
  }

  function setSanitaryValue(id, key, value, rerender = true) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    item[key] = key === 'planta' ? _normalizeFloor(value) : value;
    if (key === 'planta') _setActiveFloor(item[key]);
    if (key === 'bloque') {
      const block = (_data.__blocks || []).find(candidate => _matchesBlockReference(value, candidate));
      if (block) _data.__activeBlockId = block.id;
    }
    if (['largo_m', 'ancho_m'].includes(key)) _ensureSanitaryRoomObject(item, true);
    if (['bloque', 'planta'].includes(key)) _ensureSanitaryRoomObject(item);
    if (rerender && ['inodoros', 'estado'].includes(key)) _ensureSanitaryPlan(item, true);
    _saveDraft(false);
    if (rerender) {
      _render();
      renderSchoolPlan();
    } else {
      _redrawSanitaryCanvas();
    }
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
    const room = _ensureSanitaryRoomObject(item);
    const next = item.plano.cabinas.length + 1;
    const cabinId = `cab_${Date.now()}`;
    const rect = _suggestSanitaryStallRect(item, {
      w: Math.min(72, Math.max(34, room.w - 24)),
      h: Math.min(54, Math.max(28, room.h - 28)),
    });
    const object = {
      id: `san_stall_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'stall',
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      ficha: { codigo: `Cbn ${next}`, artefacto: 'Inodoro', estado: item.estado || '', cabinId },
    };
    _clampSanitaryChildToRoom(item, object);
    item.objects.push(object);
    item.plano.cabinas.push({ id: cabinId, label: `Cbn ${next}`, artefacto: 'Inodoro', estado: item.estado || '' });
    item.inodoros = String(Math.max(Number(item.inodoros || 0), item.plano.cabinas.length, (item.objects || []).filter(child => child.type === 'stall').length));
    _selectedSanitaryObjectId = object.id;
    _saveDraft(false);
    _render();
    renderSchoolPlan();
  }

  async function deleteSanitaryStall(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    _ensureSanitaryPlan(item);
    const stalls = (item.objects || []).filter(child => child.type === 'stall');
    if (!item.plano.cabinas.length && !stalls.length) {
      UI.showToast('No hay cbn para eliminar.', 'info');
      return;
    }
    const confirmed = await UI.showConfirm('Eliminar cbn', '¿Confirma eliminar la ultima cbn del croquis sanitario?');
    if (!confirmed) return;
    const removed = stalls[stalls.length - 1];
    if (removed) item.objects = (item.objects || []).filter(child => child.id !== removed.id);
    if (item.plano.cabinas.length) item.plano.cabinas.pop();
    item.inodoros = String(Math.max(item.plano.cabinas.length, (item.objects || []).filter(child => child.type === 'stall').length));
    if (_selectedSanitaryObjectId === removed?.id) _selectedSanitaryObjectId = null;
    _saveDraft(false);
    _render();
    renderSchoolPlan();
  }

  async function setSanitaryEvidence(id, input) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    item.evidencias = await Promise.all([...input.files].map(file => _readEvidenceFile(file, _sanitaryEvidenceContext(item))));
    _saveDraft(false);
    _render();
    UI.showToast('Foto asociada al sanitario.', 'success');
  }

  async function deleteSanitary(id) {
    const confirmed = await UI.showConfirm('Eliminar sanitario', '¿Desea quitar este sanitario del relevamiento?');
    if (!confirmed) return;
    _data.__sanitaries = (_data.__sanitaries || []).filter(sanitary => sanitary.id !== id);
    if (_activeSanitaryId === id) _activeSanitaryId = _visibleSanitariesForActiveBlockFloor(_data.__sanitaries || [])[0]?.id || null;
    _selectedSanitaryObjectId = null;
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
          radio.addEventListener('change', () => {
            fieldEl.querySelectorAll('.mec-option').forEach(label => {
              label.classList.toggle('mec-option--active', label.contains(radio) && radio.checked);
            });
            _setValue(moduleId, fieldId, radio.value);
          });
        });
        return;
      }

      if (input.type === 'checkbox') {
        fieldEl.querySelectorAll('input[type="checkbox"]').forEach(box => {
          box.addEventListener('change', () => {
            const values = [...fieldEl.querySelectorAll('input[type="checkbox"]:checked')].map(el => el.value);
            fieldEl.querySelectorAll('.mec-option').forEach(label => {
              const input = label.querySelector('input[type="checkbox"]');
              label.classList.toggle('mec-option--active', Boolean(input?.checked));
            });
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
        if (input.dataset.sketchField === 'floorNumber') _setActiveFloor(input.value);
        else _data.__classroomSketch[input.dataset.sketchField] = input.value;
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
        if (['length', 'width'].includes(input.dataset.sketchField)) _redrawSketchCanvas();
        renderSchoolPlan();
      };
      input.addEventListener('input', persist);
      input.addEventListener('change', persist);
    });

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let draftObject = null;
    let movingObject = null;
    let movingSanitary = null;
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
      const preliminarySelected = rotateHit || handleHit?.object || _findSketchObjectAt(point);
      const sanitaryHit = (!preliminarySelected || preliminarySelected.type === 'room') ? _findContextSanitaryAt(point) : null;
      const localSelected = sanitaryHit ? null : preliminarySelected;
      const selected = localSelected || (!sanitaryHit ? _activateContextClassroomAt(point) : null);
      _selectedSketchObjectId = selected?.id || null;
      if (rotateHit) {
        rotatingObject = rotateHit;
        _pushSketchHistory();
        _flipOpeningSwing(rotatingObject);
        _saveDraft(false);
        _announceOpeningDistances(rotatingObject);
        rotatingObject = null;
      } else if (handleHit) {
        resizingObject = handleHit;
        mutationRecorded = false;
      } else if (sanitaryHit) {
        movingSanitary = sanitaryHit;
        moveOffset = { x: point.x - sanitaryHit.object.x, y: point.y - sanitaryHit.object.y };
        _selectedPlanId = `sanitary::${sanitaryHit.item.id}`;
        mutationRecorded = false;
      } else if (selected) {
        movingObject = selected;
        moveOffset = _moveOffsetForObject(selected, point);
        mutationRecorded = false;
      } else if (_sketchTool === 'pencil') {
        drawing = true;
        draftObject = {
          id: `sk_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          type: 'pencil',
          points: [point],
          ficha: { codigo: 'Lapiz' },
        };
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
      if (movingSanitary) {
        _moveSanitaryRoomObject(movingSanitary, point, moveOffset);
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
      if (draftObject.type === 'pencil') {
        const last = draftObject.points[draftObject.points.length - 1];
        if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 3) draftObject.points.push(point);
      } else {
        draftObject = _newSketchObject(_sketchTool, draftObject.start, point, draftObject.id);
      }
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
      if (movingSanitary) {
        movingSanitary = null;
        moveOffset = null;
        _saveDraft(false);
        renderSchoolPlan();
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
      const sanitaryHit = _findContextSanitaryAt(point);
      if (sanitaryHit) {
        _selectedPlanId = `sanitary::${sanitaryHit.item.id}`;
        _drawSketch(ctx, canvas);
        _updateSketchStatus();
        editPlanSanitary(sanitaryHit.item.id);
        return;
      }
      const selected = _findSketchObjectAt(point) || _activateContextClassroomAt(point);
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
        const sanitaryHit = _findContextSanitaryAt(point);
        if (sanitaryHit) {
          _selectedPlanId = `sanitary::${sanitaryHit.item.id}`;
          editPlanSanitary(sanitaryHit.item.id);
          lastTap = { time: 0, point: null };
          return;
        }
        const selected = _findSketchObjectAt(point) || _activateContextClassroomAt(point);
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
    _centerSketchOnActiveRoom();
  }

  function _bindSanitarySketch(root) {
    const canvas = root.querySelector('#mec-sanitary-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let movingRoom = null;
    let movingObject = null;
    let resizing = null;
    let moveOffset = null;
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
      const point = pointFromEvent(event);
      const rotateHit = _findSanitaryOpeningRotateHandleAt(point);
      if (rotateHit && rotateHit.id === _selectedSanitaryObjectId) {
        _selectedSanitaryObjectId = rotateHit.id;
        _flipOpeningSwing(rotateHit);
        _saveDraft(false);
        _drawSanitarySketch(ctx, canvas);
        _updateSanitaryStatus();
        return;
      }
      const handleHit = _findSanitaryResizeHandleAt(point);
      const objectHit = _findSanitaryChildObjectAt(point);
      if (handleHit) {
        const resizeSelectedChild = handleHit.scope === 'child' && handleHit.object.id === _selectedSanitaryObjectId;
        if (handleHit.scope === 'room' || resizeSelectedChild || !objectHit) {
          resizing = handleHit;
          if (handleHit.scope === 'child') _selectedSanitaryObjectId = handleHit.object.id;
          else _selectedSanitaryObjectId = null;
          _drawSanitarySketch(ctx, canvas);
          return;
        }
      }
      if (objectHit) {
        _selectedSanitaryObjectId = objectHit.object.id;
        movingObject = objectHit;
        moveOffset = _moveOffsetForObject(objectHit.object, point);
        _drawSanitarySketch(ctx, canvas);
        return;
      }
      const hit = _findContextSanitaryAt(point);
      if (hit) {
        _activeSanitaryId = hit.item.id;
        _selectedSanitaryObjectId = null;
        movingRoom = hit;
        moveOffset = { x: point.x - hit.object.x, y: point.y - hit.object.y };
        _drawSanitarySketch(ctx, canvas);
        return;
      }
      const classroomHit = _findContextClassroomAt(point);
      if (classroomHit) {
        _activeClassroomId = classroomHit.room.id;
        UI.showToast('Aula seleccionada como referencia. Edite sus detalles desde Aulas.', 'info');
      }
    };
    const move = event => {
      if (!movingRoom && !movingObject && !resizing) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      if (resizing) {
        if (resizing.scope === 'child') _resizeSanitaryChildObject(resizing, point);
        else _resizeSanitaryRoomObject(resizing, point);
      } else if (movingObject) {
        _moveSanitaryChildObject(movingObject, point, moveOffset);
      } else if (movingRoom) {
        _moveSanitaryRoomObject(movingRoom, point, moveOffset);
      }
      _drawSanitarySketch(ctx, canvas);
      _updateSanitaryStatus();
    };
    const end = event => {
      if (!movingRoom && !movingObject && !resizing) return;
      event.preventDefault();
      movingRoom = null;
      movingObject = null;
      resizing = null;
      moveOffset = null;
      _saveDraft(false);
      _render();
      renderSchoolPlan();
    };
    canvas.addEventListener('mousedown', begin);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('dblclick', event => {
      event.preventDefault();
      const point = pointFromEvent(event);
      const objectHit = _findSanitaryChildObjectAt(point);
      if (objectHit?.object?.type === 'door') {
        _selectedSanitaryObjectId = objectHit.object.id;
        _flipOpeningSwing(objectHit.object);
        _saveDraft(false);
        _drawSanitarySketch(ctx, canvas);
        _updateSanitaryStatus();
      }
    });
    canvas.addEventListener('touchstart', begin, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    _drawSanitarySketch(ctx, canvas);
  }

  function _redrawSanitaryCanvas() {
    const canvas = document.getElementById('mec-sanitary-canvas');
    if (canvas) _drawSanitarySketch(canvas.getContext('2d'), canvas);
    _updateSanitaryStatus();
  }

  function _updateSanitaryStatus() {
    const status = document.getElementById('mec-sanitary-status');
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === _activeSanitaryId);
    if (status && item) status.textContent = _sanitaryStatusText(item);
  }

  function _drawSanitarySketch(ctx, canvas) {
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
    _drawSketchBlockContext(ctx, canvas);
    _sketchRoomsForActiveBlockFloor().forEach(room => _drawContextClassroom(ctx, room));
    _sanitaryRoomsForActiveBlockFloor().forEach(({ item, object }) => {
      if (item.id === _activeSanitaryId) _drawActiveSanitaryRoom(ctx, item, object);
      else _drawContextSanitary(ctx, item, object);
    });
  }

  function _drawActiveSanitaryRoom(ctx, item, roomObject) {
    const adapter = {
      id: item.id,
      name: item.codigo || 'Sanitario',
      length: item.largo_m || '',
      width: item.ancho_m || '',
      objects: item.objects || [],
    };
    ctx.save();
    ctx.fillStyle = 'rgba(128,90,213,.18)';
    ctx.strokeStyle = '#44337a';
    ctx.lineWidth = 3;
    ctx.fillRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeStyle = 'rgba(128,90,213,.42)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(roomObject.x + 5, roomObject.y + 5, Math.max(0, roomObject.w - 10), Math.max(0, roomObject.h - 10));
    _labelSketchObject(ctx, roomObject, `${item.codigo || 'Sanitario'} ${_contextDimensionsText(adapter, roomObject) || _sanitaryDimensionsFromObject(item, roomObject)}`, roomObject.x + roomObject.w / 2, roomObject.y - 14, true);
    (item.objects || [])
      .filter(object => object.id !== roomObject.id)
      .forEach(object => _drawSanitaryChildObject(ctx, item, object));
    _drawResizeHandles(ctx, roomObject, true);
    ctx.restore();
  }

  function _drawSanitaryChildObject(ctx, item, object) {
    const selected = object.id === _selectedSanitaryObjectId;
    ctx.save();
    ctx.lineCap = 'round';
    if (object.type === 'door') {
      _drawSanitaryDoorObject(ctx, item, object, selected);
      ctx.restore();
      return;
    }
    if (object.type === 'window') {
      ctx.fillStyle = selected ? 'rgba(43,108,176,.26)' : 'rgba(43,108,176,.14)';
      ctx.strokeStyle = selected ? '#111827' : '#2b6cb0';
      ctx.lineWidth = selected ? 3 : 2.4;
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
      _labelSketchObject(ctx, object, _sanitaryOpeningCompactDimensionsText(item, object), object.x + object.w / 2, object.y - 12, true);
      if (selected) _drawResizeHandles(ctx, object, true);
      ctx.restore();
      return;
    }
    if (object.type === 'stall') {
      ctx.fillStyle = selected ? 'rgba(107,114,128,.22)' : 'rgba(107,114,128,.12)';
      ctx.strokeStyle = selected ? '#111827' : 'rgba(75,85,99,.78)';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(75,85,99,.36)';
      ctx.strokeRect(object.x + 4, object.y + 4, Math.max(0, object.w - 8), Math.max(0, object.h - 8));
      ctx.setLineDash([]);
      _labelSketchObject(ctx, object, `${object.ficha?.codigo || 'Cbn'} ${_sanitaryDimensionsText(item, object)}`, object.x + object.w / 2, object.y - 12, true);
      if (selected) _drawResizeHandles(ctx, object, true);
      ctx.restore();
      return;
    }
    _drawContextSketchObject(ctx, {
      id: item.id,
      name: item.codigo || 'Sanitario',
      length: item.largo_m || '',
      width: item.ancho_m || '',
      objects: item.objects || [],
    }, object);
    if (selected && _isResizableSketchObject(object)) _drawResizeHandles(ctx, object, true);
    ctx.restore();
  }

  function _drawSanitaryDoorObject(ctx, item, object, selected) {
    const vertical = ['left', 'right'].includes(_openingSide(object));
    const thickness = 8;
    if (vertical) object.w = thickness;
    else object.h = thickness;
    const length = vertical ? object.h : object.w;
    const hinge = _doorHingePoint(object, thickness);
    const angles = _doorSwingAngles(object, object.ficha?.abre_hacia === 'Exterior' ? -1 : 1);
    const variant = _doorVariant(object);
    ctx.fillStyle = selected ? 'rgba(47,133,90,.28)' : (variant === 'opening' ? 'rgba(255,255,255,.92)' : 'rgba(47,133,90,.16)');
    ctx.strokeStyle = selected ? '#111827' : (variant === 'opening' ? '#667085' : '#2f855a');
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.strokeRect(object.x, object.y, object.w, object.h);
    if (variant !== 'door') {
      _drawOpeningVariantMark(ctx, object, variant);
      _labelSketchObject(ctx, object, _sanitaryOpeningCompactDimensionsText(item, object), object.x + object.w / 2, object.y - 12, true);
      if (selected) _drawResizeHandles(ctx, object, true);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.arc(hinge.x, hinge.y, Math.max(18, length), angles.start, angles.end, angles.ccw);
    ctx.closePath();
    ctx.fillStyle = selected ? 'rgba(47,133,90,.16)' : 'rgba(47,133,90,.09)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(hinge.x + Math.cos(angles.leaf) * Math.max(18, length), hinge.y + Math.sin(angles.leaf) * Math.max(18, length));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, Math.max(18, length), angles.start, angles.end, angles.ccw);
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    _labelSketchObject(ctx, object, _sanitaryOpeningCompactDimensionsText(item, object), object.x + object.w / 2, object.y - 12, true);
    if (selected) {
      _drawResizeHandles(ctx, object, true);
      _drawOpeningRotateHandle(ctx, object);
    }
  }

  function _sanitaryScale(item) {
    const room = _sanitaryRoomObject(item);
    const length = Number(item?.largo_m || 0);
    const width = Number(item?.ancho_m || 0);
    if (!room || !length || !width || !room.w || !room.h) return null;
    const x = length / room.w;
    const y = width / room.h;
    return { x, y, avg: (x + y) / 2 };
  }

  function _sanitaryDimensionsText(item, object) {
    const scale = _sanitaryScale(item);
    if (!scale || !object || object.type === 'pencil') return '';
    if (object.type === 'wall') {
      const px = Math.hypot(object.x2 - object.x1, object.y2 - object.y1);
      return `${(px * scale.avg).toFixed(2)}m`;
    }
    if (['door', 'window'].includes(object.type)) {
      const length = (_openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2);
      return `L${length}m`;
    }
    if (object.w && object.h) return `${(object.w * scale.x).toFixed(2)} x ${(object.h * scale.y).toFixed(2)}m`;
    return '';
  }

  function _sanitaryOpeningCompactDimensionsText(item, object) {
    const text = _sanitaryDimensionsText(item, object);
    return text || _sketchLabel(object.type);
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

    _drawSketchBlockContext(ctx, canvas);
    _data.__classroomSketch.objects.forEach(object => _drawSketchObject(ctx, object));
    _drawSketchSanitaryOverlay(ctx);
    if (draftObject) _drawSketchObject(ctx, draftObject, true);
  }

  function _drawSketchBlockContext(ctx, canvas) {
    const blockRect = _sketchBlockRect(canvas);
    const block = _activeClassroomBlock();
    const rooms = _sketchRoomsForActiveBlockFloor()
      .filter(room => room.id !== _activeClassroomId)
      .map(room => ({ room, object: _roomObjectForClassroom(room) }))
      .filter(item => item.object);
    ctx.save();
    ctx.fillStyle = 'rgba(23,32,51,.025)';
    ctx.fillRect(blockRect.x, blockRect.y, blockRect.w, blockRect.h);
    ctx.strokeStyle = 'rgba(23,32,51,.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(blockRect.x, blockRect.y, blockRect.w, blockRect.h);
    ctx.setLineDash([]);
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(23,32,51,.66)';
    ctx.textAlign = 'left';
    ctx.fillText(`${block?.bloque_codigo || 'Bloque actual'} · contenedor de aulas`, blockRect.x + 8, blockRect.y - 10);
    rooms.forEach(({ room }) => _drawContextClassroom(ctx, room));
    ctx.restore();
  }

  function _drawSketchSanitaryOverlay(ctx) {
    _sanitaryRoomsForActiveBlockFloor().forEach(({ item, object }) => _drawContextSanitary(ctx, item, object));
  }

  function _drawContextClassroom(ctx, room) {
    const roomObject = _roomObjectForClassroom(room);
    if (!roomObject) return;
    ctx.save();
    ctx.globalAlpha = .58;
    _drawContextRoom(ctx, room, roomObject);
    (room.objects || [])
      .filter(object => object.id !== roomObject.id)
      .forEach(object => _drawContextSketchObject(ctx, room, object));
    ctx.restore();
  }

  function _drawContextSanitary(ctx, item, roomObject) {
    if (!roomObject) return;
    const adapter = {
      id: item.id,
      name: item.codigo || 'Sanitario',
      length: item.largo_m || '',
      width: item.ancho_m || '',
      objects: item.objects || [],
    };
    ctx.save();
    ctx.globalAlpha = .66;
    ctx.fillStyle = 'rgba(128,90,213,.095)';
    ctx.strokeStyle = 'rgba(128,90,213,.62)';
    ctx.lineWidth = 2.2;
    ctx.fillRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeStyle = 'rgba(128,90,213,.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(roomObject.x + 5, roomObject.y + 5, Math.max(0, roomObject.w - 10), Math.max(0, roomObject.h - 10));
    _labelSketchObject(ctx, roomObject, `${item.codigo || 'Sanitario'} ${_contextDimensionsText(adapter, roomObject)}`, roomObject.x + roomObject.w / 2, roomObject.y - 14, true);
    (item.objects || [])
      .filter(object => object.id !== roomObject.id)
      .forEach(object => _drawContextSketchObject(ctx, adapter, object));
    ctx.restore();
  }

  function _drawContextRoom(ctx, room, roomObject) {
    ctx.fillStyle = 'rgba(43,108,176,.065)';
    ctx.strokeStyle = 'rgba(43,108,176,.44)';
    ctx.lineWidth = 2;
    ctx.fillRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeRect(roomObject.x, roomObject.y, roomObject.w, roomObject.h);
    ctx.strokeStyle = 'rgba(43,108,176,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(roomObject.x + 5, roomObject.y + 5, Math.max(0, roomObject.w - 10), Math.max(0, roomObject.h - 10));
    _labelSketchObject(ctx, roomObject, `${room.name || 'Aula'} ${_contextDimensionsText(room, roomObject)}`, roomObject.x + roomObject.w / 2, roomObject.y - 14, true);
  }

  function _drawContextSketchObject(ctx, room, object) {
    const label = _contextObjectLabel(room, object);
    ctx.save();
    ctx.lineCap = 'round';
    if (object.type === 'wall') {
      ctx.strokeStyle = 'rgba(23,32,51,.58)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(object.x1, object.y1);
      ctx.lineTo(object.x2, object.y2);
      ctx.stroke();
      _labelSketchObject(ctx, object, label, (object.x1 + object.x2) / 2, ((object.y1 + object.y2) / 2) - 14, true);
      ctx.restore();
      return;
    }
    if (object.type === 'pencil') {
      const points = object.points || [];
      if (points.length) {
        ctx.strokeStyle = 'rgba(124,45,18,.62)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (object.type === 'text') {
      ctx.fillStyle = 'rgba(124,45,18,.72)';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(_truncateLabel(ctx, object.ficha?.observacion || object.text || 'Texto', Math.max(24, object.w || 80)), object.x + (object.w || 0) / 2, object.y + (object.h || 0) / 2);
      ctx.restore();
      return;
    }
    if (_isPointSketchObject(object)) {
      _drawPointSketchObject(ctx, object, false);
      ctx.restore();
      return;
    }
    if (object.type === 'door') {
      ctx.fillStyle = 'rgba(47,133,90,.18)';
      ctx.strokeStyle = 'rgba(47,133,90,.68)';
      ctx.lineWidth = 2;
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
      _drawContextOpeningSwing(ctx, object);
    } else if (object.type === 'window') {
      ctx.fillStyle = 'rgba(43,108,176,.14)';
      ctx.strokeStyle = 'rgba(43,108,176,.68)';
      ctx.lineWidth = 3;
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
    } else if (object.type === 'stair') {
      ctx.fillStyle = 'rgba(74,85,104,.14)';
      ctx.strokeStyle = 'rgba(74,85,104,.62)';
      ctx.lineWidth = 2;
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
    } else {
      const style = _sketchStyle(object.type);
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = Math.max(1.5, style.lineWidth - 1);
      ctx.fillRect(object.x, object.y, object.w, object.h);
      ctx.strokeRect(object.x, object.y, object.w, object.h);
    }
    _labelSketchObject(ctx, object, label, object.x + (object.w || 0) / 2, object.y - 14, true);
    ctx.restore();
  }

  function _drawContextOpeningSwing(ctx, object) {
    if (object.type !== 'door') return;
    const variant = _doorVariant(object);
    if (variant !== 'door') {
      _drawOpeningVariantMark(ctx, object, variant);
      return;
    }
    const vertical = ['left', 'right'].includes(_openingSide(object));
    const length = vertical ? object.h : object.w;
    const hinge = _doorHingePoint(object, 8);
    const angles = _doorSwingAngles(object, object.ficha?.abre_hacia === 'Exterior' ? -1 : 1);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(47,133,90,.55)';
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, Math.max(18, length), angles.start, angles.end, angles.ccw);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function _contextObjectLabel(room, object) {
    const base = object.type === 'room' ? (room.name || _sketchLabel(object.type)) : _sketchLabel(object.type);
    const dimensions = _contextDimensionsText(room, object);
    return dimensions ? `${base} ${dimensions}` : base;
  }

  function _contextDimensionsText(room, object) {
    const roomObject = _roomObjectForClassroom(room);
    const length = Number(room.length || 0);
    const width = Number(room.width || 0);
    if (!roomObject || !length || !width) return '';
    const scale = { x: length / roomObject.w, y: width / roomObject.h, avg: ((length / roomObject.w) + (width / roomObject.h)) / 2 };
    if (object.type === 'room') return `${length.toFixed(2)} x ${width.toFixed(2)}m`;
    if (object.type === 'wall') {
      const px = Math.hypot(object.x2 - object.x1, object.y2 - object.y1);
      return `${(px * scale.avg).toFixed(2)}m`;
    }
    if (object.type === 'window') {
      const objectLength = (_openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2);
      const height = object.ficha?.alto_m ? Number(object.ficha.alto_m).toFixed(2) : 's/d';
      return `L${objectLength} A${height}m`;
    }
    if (object.type === 'door') {
      return `L${(_openingLengthPixels(object) * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2)}m`;
    }
    if (_isPointSketchObject(object) || object.type === 'pencil' || object.type === 'text') return '';
    if (object.w && object.h) return `${(object.w * scale.x).toFixed(2)} x ${(object.h * scale.y).toFixed(2)}m`;
    return '';
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
      return _snapWallObject({ id, type, start, x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    }
    if (type === 'pencil') {
      return { id, type, points: [start, end], ficha: { codigo: 'Lapiz' } };
    }
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(24, Math.abs(end.x - start.x));
    const h = Math.max(18, Math.abs(end.y - start.y));
    if (_isPointSketchObject(type)) {
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
      object = _snapWallObject({ id, type: 'wall', x1: point.x - 42, y1: point.y, x2: point.x + 42, y2: point.y });
    } else if (_sketchTool === 'text') {
      object = {
        id,
        type: 'text',
        x: Math.round(point.x - 70),
        y: Math.round(point.y - 18),
        w: 140,
        h: 36,
        text: 'Texto',
        ficha: { codigo: 'Texto', observacion: 'Texto' },
      };
    } else if (_sketchTool === 'pencil') {
      object = {
        id,
        type: 'pencil',
        points: [
          { x: point.x - 28, y: point.y },
          { x: point.x + 28, y: point.y },
        ],
        ficha: { codigo: 'Lapiz' },
      };
    } else if (_isPointSketchObject(_sketchTool)) {
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
      window: { w: 86, h: 8 },
      stair: { w: 90, h: 54 },
      board: { w: 112, h: 34 },
      damage: { w: 58, h: 38 },
      text: { w: 140, h: 36 },
      room: { w: 240, h: 160 },
    }[type] || { w: 54, h: 28 };
  }

  function _normalizeSketchObject(object) {
    const normalized = { ...object };
    delete normalized.start;
    return normalized;
  }

  function _isPointSketchObject(objectOrType) {
    const type = typeof objectOrType === 'string' ? objectOrType : objectOrType?.type;
    return ['outlet', 'light', 'photo'].includes(type);
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
      ctx.save();
      ctx.strokeStyle = selected ? '#111827' : style.stroke;
      ctx.lineWidth = selected ? 8 : 7;
      ctx.beginPath();
      ctx.moveTo(object.x1, object.y1);
      ctx.lineTo(object.x2, object.y2);
      ctx.stroke();
      ctx.strokeStyle = selected ? '#f8fafc' : 'rgba(255,255,255,.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(object.x1, object.y1);
      ctx.lineTo(object.x2, object.y2);
      ctx.stroke();
      ctx.restore();
      _labelSketchObject(ctx, object, _sketchObjectLabel(object), (object.x1 + object.x2) / 2, ((object.y1 + object.y2) / 2) - 18, true);
      if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
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
      if (selected && _doorVariant(object) === 'door') _drawOpeningRotateHandle(ctx, object);
      ctx.restore();
      return;
    }

    if (object.type === 'stair') {
      _drawStairObject(ctx, object, selected);
      if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
      ctx.restore();
      return;
    }

    if (object.type === 'pencil') {
      _drawPencilObject(ctx, object, selected);
      ctx.restore();
      return;
    }

    if (object.type === 'text') {
      _drawTextObject(ctx, object, selected);
      if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
      ctx.restore();
      return;
    }

    if (_isPointSketchObject(object)) {
      _drawPointSketchObject(ctx, object, selected);
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.rect(object.x, object.y, object.w, object.h);
    ctx.fill();
    ctx.stroke();
    _labelSketchObject(ctx, object, object.type === 'window' ? _openingCompactDimensionsText(object) : _sketchObjectLabel(object), object.x + object.w / 2, object.y - 12, object.type === 'window');
    if (object.type === 'window' && selected) _drawOpeningCornerGuides(ctx, object);
    if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
    if (object.type === 'window' && selected) _drawOpeningRotateHandle(ctx, object);
    ctx.restore();
  }

  function _drawPencilObject(ctx, object, selected) {
    const points = object.points || [];
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = selected ? '#111827' : '#7c2d12';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    if (selected) {
      const box = _pencilBounds(object);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(17,24,39,.55)';
      ctx.strokeRect(box.x - 6, box.y - 6, box.w + 12, box.h + 12);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function _drawTextObject(ctx, object, selected) {
    ctx.fillStyle = selected ? '#111827' : '#7c2d12';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = object.ficha?.observacion || object.text || object.ficha?.codigo || 'Texto';
    ctx.fillText(_truncateLabel(ctx, text, Math.max(18, object.w - 12)), object.x + object.w / 2, object.y + object.h / 2);
  }

  function _truncateLabel(ctx, text, maxWidth) {
    const value = String(text || '');
    if (ctx.measureText(value).width <= maxWidth) return value;
    let next = value;
    while (next.length > 3 && ctx.measureText(`${next}...`).width > maxWidth) next = next.slice(0, -1);
    return `${next}...`;
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
    const hinge = _doorHingePoint(object, thickness);
    const hingeX = hinge.x;
    const hingeY = hinge.y;
    const radius = Math.max(18, length);
    const variant = _doorVariant(object);
    ctx.fillStyle = selected ? 'rgba(47,133,90,.28)' : (variant === 'opening' ? 'rgba(255,255,255,.92)' : 'rgba(47,133,90,.16)');
    ctx.strokeStyle = selected ? '#111827' : (variant === 'opening' ? '#667085' : '#2f855a');
    ctx.lineWidth = selected ? 3 : 2;
    ctx.fillRect(object.x, object.y, object.w, object.h);
    ctx.strokeRect(object.x, object.y, object.w, object.h);
    if (variant !== 'door') {
      _drawOpeningVariantMark(ctx, object, variant);
      _labelSketchObject(ctx, object, _openingCompactDimensionsText(object), object.x + object.w / 2, object.y - 12, true);
      if (selected) _drawOpeningCornerGuides(ctx, object);
      return;
    }
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
    _labelSketchObject(ctx, object, _openingCompactDimensionsText(object), object.x + object.w / 2, object.y - 12, true);
    if (selected) _drawOpeningCornerGuides(ctx, object);
  }

  function _doorVariant(object) {
    const text = `${object?.ficha?.subtipo || ''} ${object?.ficha?.tipo || ''} ${object?.ficha?.codigo || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (text.includes('sin puerta') || text.includes('sin hoja') || text.includes('solo abertura')) return 'opening';
    if (text.includes('cortina') || text.includes('lona')) return 'curtain';
    return 'door';
  }

  function _drawOpeningVariantMark(ctx, object, variant) {
    const side = _openingSide(object);
    const vertical = ['left', 'right'].includes(side);
    const x1 = vertical ? object.x + object.w / 2 : object.x;
    const y1 = vertical ? object.y : object.y + object.h / 2;
    const x2 = vertical ? object.x + object.w / 2 : object.x + object.w;
    const y2 = vertical ? object.y + object.h : object.y + object.h / 2;
    ctx.save();
    ctx.lineWidth = variant === 'curtain' ? 2 : 2.4;
    ctx.strokeStyle = variant === 'curtain' ? '#7c3aed' : '#667085';
    ctx.setLineDash(variant === 'curtain' ? [3, 4] : [7, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (variant === 'curtain') {
      const steps = 6;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t + (vertical ? (i % 2 ? 3 : -3) : 0);
        const py = y1 + (y2 - y1) * t + (!vertical ? (i % 2 ? 3 : -3) : 0);
        ctx.lineTo(px, py);
      }
    } else {
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function _drawPointSketchObject(ctx, object, selected) {
    ctx.save();
    const radius = _sketchPointRadius(object.type);
    ctx.lineWidth = selected ? 2.5 : 1.7;
    ctx.strokeStyle = selected ? '#111827' : _sketchStyle(object.type).stroke;
    ctx.fillStyle = selected ? 'rgba(255,255,255,.95)' : _sketchStyle(object.type).fill;
    if (object.type === 'outlet') {
      ctx.beginPath();
      ctx.rect(object.x - radius, object.y - radius, radius * 2, radius * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#7c4a03';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(object.x - 3, object.y - 3);
      ctx.lineTo(object.x - 3, object.y + 3);
      ctx.moveTo(object.x + 3, object.y - 3);
      ctx.lineTo(object.x + 3, object.y + 3);
      ctx.stroke();
      _labelSketchObject(ctx, object, 'Toma', object.x, object.y + 18, true);
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#9a6700';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(object.x + Math.cos(angle) * (radius + 2), object.y + Math.sin(angle) * (radius + 2));
      ctx.lineTo(object.x + Math.cos(angle) * (radius + 6), object.y + Math.sin(angle) * (radius + 6));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(object.x - 4, object.y);
    ctx.lineTo(object.x + 4, object.y);
    ctx.moveTo(object.x, object.y - 4);
    ctx.lineTo(object.x, object.y + 4);
    ctx.stroke();
    _labelSketchObject(ctx, object, 'Luz', object.x, object.y + 20, true);
    ctx.restore();
  }

  function _doorSwingAngles(object, swing) {
    const side = _openingSide(object);
    const inward = swing > 0;
    const end = _doorHingeEnd(object) === 'end';
    const closed = _doorClosedAngle(side, end);
    const open = _doorOpenAngle(side, end, inward);
    const delta = _shortestAngleDelta(closed, open);
    return { start: closed, end: closed + delta, leaf: closed + delta, ccw: delta < 0, delta };
  }

  function _doorClosedAngle(side, end) {
    if (side === 'left') return end ? -Math.PI / 2 : Math.PI / 2;
    if (side === 'right') return end ? -Math.PI / 2 : Math.PI / 2;
    if (side === 'bottom') return end ? Math.PI : 0;
    return end ? Math.PI : 0;
  }

  function _doorOpenAngle(side, end, inward) {
    if (side === 'left') return inward ? 0 : Math.PI;
    if (side === 'right') return inward ? Math.PI : 0;
    if (side === 'bottom') return inward ? -Math.PI / 2 : Math.PI / 2;
    return inward ? Math.PI / 2 : -Math.PI / 2;
  }

  function _shortestAngleDelta(start, end) {
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }

  function _doorHingeEnd(object) {
    return object?.ficha?.bisagra === 'Fin' ? 'end' : 'start';
  }

  function _doorHingePoint(object, thickness = 8) {
    const side = _openingSide(object);
    const end = _doorHingeEnd(object) === 'end';
    if (side === 'left') return { x: object.x, y: end ? object.y + object.h : object.y };
    if (side === 'right') return { x: object.x + thickness, y: end ? object.y + object.h : object.y };
    if (side === 'bottom') return { x: end ? object.x + object.w : object.x, y: object.y + thickness };
    return { x: end ? object.x + object.w : object.x, y: object.y };
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
      stall: { stroke: '#4b5563', fill: 'rgba(107,114,128,.12)', lineWidth: 2 },
      board: { stroke: '#4a5568', fill: 'rgba(74,85,104,.16)', lineWidth: 3 },
      outlet: { stroke: '#b7791f', fill: 'rgba(183,121,31,.18)', lineWidth: 3 },
      damage: { stroke: '#c53030', fill: 'rgba(197,48,48,.18)', lineWidth: 3 },
      light: { stroke: '#d69e2e', fill: 'rgba(246,173,85,.2)', lineWidth: 3 },
      text: { stroke: '#9a3412', fill: 'rgba(255,247,237,.85)', lineWidth: 2 },
      pencil: { stroke: '#7c2d12', fill: 'transparent', lineWidth: 2 },
      photo: { stroke: '#d69e2e', fill: 'rgba(246,173,85,.2)', lineWidth: 3 },
    }[type] || { stroke: '#1f5d99', fill: 'rgba(31,93,153,.14)', lineWidth: 3 };
  }

  function _sketchPointRadius(type) {
    return type === 'outlet' ? 5 : 7;
  }

  function _sketchLabel(type) {
    return {
      room: 'Aula',
      wall: 'Pared',
      door: 'Pta',
      window: 'Vtna',
      stair: 'Esc',
      stall: 'Cbn',
      board: 'Piz',
      damage: 'Obs',
      outlet: 'TC',
      light: 'Foco',
      photo: 'Foco',
      text: 'Txt',
      pencil: 'Lapiz',
    }[type] || type;
  }

  function _sketchObjectLabel(object) {
    const base = object.type === 'room' ? _sketchLabel(object.type) : (object.ficha?.codigo || object.label || _sketchLabel(object.type));
    const dimensions = _sketchDimensionsText(object);
    return dimensions ? `${base} ${dimensions}` : base;
  }

  function _openingCompactDimensionsText(object) {
    if (!['door', 'window'].includes(object?.type)) return _sketchDimensionsText(object);
    const scale = _sketchScale();
    const lengthPx = _openingLengthPixels(object);
    const length = scale
      ? (lengthPx * (['left', 'right'].includes(_openingSide(object)) ? scale.y : scale.x)).toFixed(2)
      : object.ficha?.largo_m || object.ficha?.ancho_m || '';
    const height = object.ficha?.alto_m ? Number(object.ficha.alto_m).toFixed(2) : '';
    const parts = [
      length ? `L ${length}m` : '',
      height ? `A ${height}m` : '',
    ].filter(Boolean);
    return parts.join(' · ') || _sketchLabel(object.type);
  }

  function _sketchDimensionsText(object) {
    if (_isPointSketchObject(object)) return '';
    if (object.type === 'pencil') return '';
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
    const nearestSide = Object.entries(near).sort((a, b) => a[1] - b[1])[0]?.[0];
    const side = object.attached?.side || nearestSide;
    if (!side || (!object.attached?.side && near[side] > 16)) return '';
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
    return object && !_isPointSketchObject(object) && object.type !== 'pencil';
  }

  function _resizeHandles(object) {
    if (object.type === 'wall') {
      const size = 16;
      return [
        { name: 'p1', x: object.x1, y: object.y1, size },
        { name: 'p2', x: object.x2, y: object.y2, size },
      ];
    }
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
    if (object?.type !== 'door') return null;
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
    ctx.fillText(object.type === 'door' ? 'Abrir' : 'Girar', handle.x, handle.y + 24);
    ctx.restore();
  }

  function _labelSketchObject(ctx, object, label, x, y, small = false) {
    if (!label) return;
    const fontSize = small ? 9 : 12;
    const height = small ? 15 : 20;
    const pad = small ? 7 : 12;
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = label || object.label;
    const width = ctx.measureText(text).width + pad;
    ctx.fillStyle = small ? 'rgba(255,255,255,.72)' : 'rgba(255,255,255,.88)';
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.fillStyle = '#172033';
    ctx.fillText(text, x, y);
  }

  function _findSketchObjectAt(point) {
    _ensureSketchObjects();
    return [..._data.__classroomSketch.objects]
      .reverse()
      .find(object => _sketchObjectContains(object, point));
  }

  function _findContextClassroomAt(point) {
    return [..._sketchRoomsForActiveBlockFloor()]
      .reverse()
      .filter(room => room.id !== _activeClassroomId)
      .map(room => ({ room, object: _roomObjectForClassroom(room) }))
      .find(item => item.object && _sketchObjectContains(item.object, point)) || null;
  }

  function _findContextSanitaryAt(point) {
    return [..._sanitaryRoomsForActiveBlockFloor()]
      .reverse()
      .find(item => item.object && _sketchObjectContains(item.object, point)) || null;
  }

  function _activeSanitaryItem() {
    return (_data.__sanitaries || []).find(item => item.id === _activeSanitaryId) || null;
  }

  function _findSanitaryChildObjectAt(point) {
    const item = _activeSanitaryItem();
    if (!item) return null;
    const object = [...(item.objects || [])]
      .filter(child => child.type !== 'sanitary-room')
      .reverse()
      .find(child => _sketchObjectContains(child, point));
    return object ? { item, object } : null;
  }

  function _findSanitaryResizeHandleAt(point) {
    const entry = _sanitaryRoomsForActiveBlockFloor().find(item => item.item.id === _activeSanitaryId);
    const active = _activeSanitaryItem();
    const childHit = active ? [...(active.objects || [])]
      .filter(child => child.type !== 'sanitary-room' && _isResizableSketchObject(child))
      .reverse()
      .map(child => ({
        item: active,
        object: child,
        handle: _resizeHandles(child).find(handle => Math.hypot(point.x - handle.x, point.y - handle.y) <= handle.size),
        scope: 'child',
      }))
      .find(hit => hit.handle) : null;
    if (childHit) return childHit;
    if (!entry?.object) return null;
    const handle = _resizeHandles(entry.object).find(item => Math.hypot(point.x - item.x, point.y - item.y) <= item.size);
    return handle ? { ...entry, handle, scope: 'room' } : null;
  }

  function _findSanitaryOpeningRotateHandleAt(point) {
    const item = _activeSanitaryItem();
    if (!item) return null;
    return [...(item.objects || [])]
      .filter(object => object.type === 'door')
      .reverse()
      .find(object => {
        if (_doorVariant(object) !== 'door') return false;
        const handle = _openingRotateHandle(object);
        return handle && Math.hypot(point.x - handle.x, point.y - handle.y) <= handle.size / 2 + 6;
      }) || null;
  }

  function _moveSanitaryRoomObject(hit, point, offset) {
    const object = hit?.object;
    const item = hit?.item;
    if (!object || !item) return;
    const previous = { x: object.x, y: object.y };
    const rect = _snapSanitaryRoomRect(item, { x: point.x - offset.x, y: point.y - offset.y, w: object.w, h: object.h });
    object.x = rect.x;
    object.y = rect.y;
    const dx = object.x - previous.x;
    const dy = object.y - previous.y;
    (item.objects || []).forEach(child => {
      if (child.id === object.id) return;
      if (child.type === 'wall') {
        child.x1 += dx; child.x2 += dx; child.y1 += dy; child.y2 += dy;
        return;
      }
      if (child.x !== undefined) {
        child.x += dx;
        child.y += dy;
      }
    });
  }

  function _moveSanitaryChildObject(hit, point, offset) {
    const object = hit?.object;
    const item = hit?.item;
    if (!object || !item) return;
    if (object.type === 'wall') {
      object.x1 = point.x - offset.x1;
      object.y1 = point.y - offset.y1;
      object.x2 = point.x - offset.x2;
      object.y2 = point.y - offset.y2;
      _snapWallObject(object);
      return;
    }
    if (_isPointSketchObject(object)) {
      object.x = point.x - offset.x;
      object.y = point.y - offset.y;
      _clampSanitaryChildToRoom(item, object);
      return;
    }
    object.x = point.x - offset.x;
    object.y = point.y - offset.y;
    if (['door', 'window'].includes(object.type)) _clampSanitaryOpeningToRoom(item, object);
    else _clampSanitaryChildToRoom(item, object);
  }

  function _resizeSanitaryRoomObject(hit, point) {
    const object = hit?.object;
    const item = hit?.item;
    const handle = hit?.handle;
    if (!object || !item || !handle) return;
    const minW = 24;
    const minH = 18;
    const right = object.x + object.w;
    const bottom = object.y + object.h;
    if (handle.name.includes('w')) {
      const newX = Math.min(point.x, right - minW);
      object.w = Math.round(right - newX);
      object.x = Math.round(newX);
    }
    if (handle.name.includes('e')) object.w = Math.max(minW, Math.round(point.x - object.x));
    if (handle.name.includes('n')) {
      const newY = Math.min(point.y, bottom - minH);
      object.h = Math.round(bottom - newY);
      object.y = Math.round(newY);
    }
    if (handle.name.includes('s')) object.h = Math.max(minH, Math.round(point.y - object.y));
    const rect = _snapSanitaryRoomRect(item, object);
    object.x = rect.x;
    object.y = rect.y;
    object.w = rect.w;
    object.h = rect.h;
    _syncSanitaryDimensionsFromObject(item, object);
    _reflowSanitaryChildren(item);
  }

  function _resizeSanitaryChildObject(hit, point) {
    const object = hit?.object;
    const item = hit?.item;
    const handle = hit?.handle;
    if (!object || !item || !handle || !_isResizableSketchObject(object)) return;
    if (object.type === 'wall') {
      if (handle.name === 'p1') {
        object.x1 = Math.round(point.x);
        object.y1 = Math.round(point.y);
      } else {
        object.x2 = Math.round(point.x);
        object.y2 = Math.round(point.y);
      }
      _snapWallObject(object);
      return;
    }
    const minW = object.type === 'stall' ? 28 : 18;
    const minH = object.type === 'stall' ? 24 : 12;
    const right = object.x + object.w;
    const bottom = object.y + object.h;
    if (handle.name.includes('w')) {
      const newX = Math.min(point.x, right - minW);
      object.w = Math.round(right - newX);
      object.x = Math.round(newX);
    }
    if (handle.name.includes('e')) object.w = Math.max(minW, Math.round(point.x - object.x));
    if (handle.name.includes('n')) {
      const newY = Math.min(point.y, bottom - minH);
      object.h = Math.round(bottom - newY);
      object.y = Math.round(newY);
    }
    if (handle.name.includes('s')) object.h = Math.max(minH, Math.round(point.y - object.y));
    if (['door', 'window'].includes(object.type)) {
      _orientOpeningToSide(object, _openingSide(object));
      _clampSanitaryOpeningToRoom(item, object);
      return;
    }
    _clampSanitaryChildToRoom(item, object);
  }

  function _sanitaryStallBlockers(item, objectId = null) {
    return (item.objects || [])
      .filter(child => child.type === 'stall' && child.id !== objectId)
      .map(child => ({ x: child.x, y: child.y, w: child.w, h: child.h }))
      .filter(rect => Number.isFinite(rect.x) && Number.isFinite(rect.y));
  }

  function _snapSanitaryChildRect(item, object, rect) {
    const room = _sanitaryRoomObject(item);
    if (!room) return rect;
    const bounds = { x: room.x, y: room.y, w: room.w, h: room.h };
    const blockers = object.type === 'stall' ? _sanitaryStallBlockers(item, object.id) : [];
    const snapped = _snapRectToGuides(rect, bounds, blockers, object.type === 'stall' ? 10 : 8);
    return object.type === 'stall'
      ? _resolveRectOverlapInBounds(snapped, blockers, bounds, 0)
      : snapped;
  }

  function _suggestSanitaryStallRect(item, size) {
    const room = _ensureSanitaryRoomObject(item);
    const padding = 6;
    const rectSize = {
      w: Math.min(size.w, Math.max(28, room.w - padding * 2)),
      h: Math.min(size.h, Math.max(24, room.h - padding * 2)),
    };
    const blockers = _sanitaryStallBlockers(item);
    const candidates = [];
    const last = blockers[blockers.length - 1];
    if (last) {
      candidates.push({ x: last.x + last.w, y: last.y });
      candidates.push({ x: last.x, y: last.y + last.h });
      candidates.push({ x: last.x - rectSize.w, y: last.y });
    }
    blockers.forEach(rect => {
      candidates.push({ x: rect.x + rect.w, y: rect.y });
      candidates.push({ x: rect.x, y: rect.y + rect.h });
    });
    for (let y = room.y + padding; y <= room.y + room.h - rectSize.h - padding; y += 12) {
      for (let x = room.x + padding; x <= room.x + room.w - rectSize.w - padding; x += 12) {
        candidates.push({ x, y });
      }
    }
    const bounds = { x: room.x, y: room.y, w: room.w, h: room.h };
    const free = candidates
      .map(candidate => _clampRectToBounds({ ...candidate, ...rectSize }, bounds))
      .find(rect => !blockers.some(other => _rectsOverlap(rect, other, 0)))
      || _clampRectToBounds({ x: room.x + padding, y: room.y + padding, ...rectSize }, bounds);
    return free;
  }

  function _clampSanitaryChildToRoom(item, object) {
    const room = _sanitaryRoomObject(item);
    if (!room || !object || object.type === 'sanitary-room') return object;
    if (object.type === 'wall') return object;
    if (_isPointSketchObject(object)) {
      object.x = Math.max(room.x + 6, Math.min(object.x, room.x + room.w - 6));
      object.y = Math.max(room.y + 6, Math.min(object.y, room.y + room.h - 6));
      return object;
    }
    const rect = _snapSanitaryChildRect(item, object, object);
    object.x = rect.x;
    object.y = rect.y;
    object.w = rect.w;
    object.h = rect.h;
    return object;
  }

  function _clampSanitaryOpeningToRoom(item, object) {
    const room = _sanitaryRoomObject(item);
    if (!room || !object || !['door', 'window'].includes(object.type)) return object;
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
    if (nearest) {
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

  function _activateContextClassroomAt(point) {
    const hit = _findContextClassroomAt(point);
    if (!hit) return null;
    _syncActiveClassroomFromSketch();
    _activeClassroomId = hit.room.id;
    _loadActiveClassroomIntoSketch();
    if (_data.__classroomSketch?.blockId) _data.__activeBlockId = _data.__classroomSketch.blockId;
    _selectedSketchObjectId = hit.object.id;
    return _findSketchObjectById(hit.object.id);
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
      if (_doorVariant(object) !== 'door') continue;
      if (Math.hypot(point.x - handle.x, point.y - handle.y) <= handle.size / 2 + 6) return object;
    }
    return null;
  }

  function _sketchObjectContains(object, point) {
    if (object.type === 'wall') {
      return _distanceToSegment(point, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }) < 12;
    }
    if (object.type === 'pencil') {
      const points = object.points || [];
      if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) < 12;
      return points.some((item, index) => index > 0 && _distanceToSegment(point, points[index - 1], item) < 12);
    }
    if (_isPointSketchObject(object)) {
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

  function _pencilBounds(object) {
    const points = object.points || [];
    if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      w: Math.max(1, Math.max(...xs) - minX),
      h: Math.max(1, Math.max(...ys) - minY),
    };
  }

  function _moveOffsetForObject(object, point) {
    if (object.type === 'wall') {
      return { x1: point.x - object.x1, y1: point.y - object.y1, x2: point.x - object.x2, y2: point.y - object.y2 };
    }
    if (object.type === 'pencil') {
      return { points: (object.points || []).map(item => ({ x: point.x - item.x, y: point.y - item.y })) };
    }
    if (_isPointSketchObject(object)) {
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
      _snapWallObject(object);
      return;
    }
    if (object.type === 'pencil') {
      object.points = (object.points || []).map((item, index) => ({
        x: point.x - (offset.points?.[index]?.x || 0),
        y: point.y - (offset.points?.[index]?.y || 0),
      }));
      return;
    }
    if (_isPointSketchObject(object)) {
      object.x = point.x - offset.x;
      object.y = point.y - offset.y;
      return;
    }
    if (object.type === 'room') {
      const prevX = object.x;
      const prevY = object.y;
      const next = _clampRoomPosition(object, point.x - offset.x, point.y - offset.y);
      object.x = next.x;
      object.y = next.y;
      const dx = object.x - prevX;
      const dy = object.y - prevY;
      (_data.__classroomSketch.objects || []).forEach(item => {
        if (item.id === object.id) return;
        if (item.type === 'wall') {
          item.x1 += dx; item.x2 += dx; item.y1 += dy; item.y2 += dy;
          return;
        }
        if (item.type === 'pencil') {
          item.points = (item.points || []).map(point => ({ x: point.x + dx, y: point.y + dy }));
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
    if (['door', 'window'].includes(object.type)) _clampOpeningToRoom(object);
    else _snapSketchObjectInsideActiveRoom(object);
  }

  function _clampRoomPosition(room, x, y) {
    const blockers = _otherRoomObjectsForActiveFloor(room.id || _activeClassroomId);
    const snapped = _snapRectToGuides(_clampRectToBlock({ x, y, w: room.w, h: room.h }), _sketchBlockRect(), blockers, 14);
    const rect = _resolveRoomOverlap(room, snapped);
    return { x: rect.x, y: rect.y };
  }

  function _clampRoomWithinBlock(room) {
    const rect = _clampRectToBlock(room);
    room.x = rect.x;
    room.y = rect.y;
    room.w = rect.w;
    room.h = rect.h;
  }

  function _otherRoomObjectsForActiveFloor(roomId = _activeClassroomId) {
    const roomObjects = _sketchRoomsForActiveBlockFloor()
      .filter(room => room.id !== roomId)
      .map(room => _roomObjectForClassroom(room))
      .filter(Boolean);
    const sanitaryObjects = _sanitaryRoomsForActiveBlockFloor()
      .map(item => item.object)
      .filter(Boolean);
    return [...roomObjects, ...sanitaryObjects];
  }

  function _activeSketchRoomObject() {
    return (_data.__classroomSketch?.objects || []).find(item => item.type === 'room') || null;
  }

  function _rectangularSketchBlockers(objectId) {
    return (_data.__classroomSketch?.objects || [])
      .filter(item => item.id !== objectId)
      .filter(item => !['room', 'wall', 'pencil', 'door', 'window'].includes(item.type))
      .filter(item => !_isPointSketchObject(item))
      .filter(item => item.x !== undefined && item.y !== undefined && item.w && item.h);
  }

  function _snapSketchObjectInsideActiveRoom(object) {
    const room = _activeSketchRoomObject();
    if (!room || !object || object.x === undefined || object.w === undefined) return object;
    const blockers = _rectangularSketchBlockers(object.id);
    const rect = _snapRectToGuides(object, room, blockers, 8);
    object.x = rect.x;
    object.y = rect.y;
    object.w = rect.w;
    object.h = rect.h;
    return object;
  }

  function _resolveRoomOverlap(room, desiredRect) {
    const others = _otherRoomObjectsForActiveFloor(_activeClassroomId);
    if (!others.some(other => _rectsOverlap(desiredRect, other, 0))) return desiredRect;

    const candidates = [];
    others.forEach(other => {
      if (!_rectsOverlap(desiredRect, other, 0)) return;
      candidates.push(
        _clampRectToBlock({ ...desiredRect, x: other.x - desiredRect.w }),
        _clampRectToBlock({ ...desiredRect, x: other.x + other.w }),
        _clampRectToBlock({ ...desiredRect, y: other.y - desiredRect.h }),
        _clampRectToBlock({ ...desiredRect, y: other.y + other.h }),
      );
    });

    const valid = candidates
      .filter(candidate => !others.some(other => _rectsOverlap(candidate, other, 0)))
      .sort((a, b) => _rectDistance(a, desiredRect) - _rectDistance(b, desiredRect));

    if (valid.length) return valid[0];
    return _clampRectToBlock({ x: room.x, y: room.y, w: room.w, h: room.h });
  }

  function _rectDistance(a, b) {
    return Math.hypot((a.x + a.w / 2) - (b.x + b.w / 2), (a.y + a.h / 2) - (b.y + b.h / 2));
  }

  function _resizeSketchObject(object, point, handle) {
    if (!_isResizableSketchObject(object)) return;
    if (object.type === 'wall') {
      if (handle.name === 'p1') {
        object.x1 = Math.round(point.x);
        object.y1 = Math.round(point.y);
      } else {
        object.x2 = Math.round(point.x);
        object.y2 = Math.round(point.y);
      }
      _snapWallObject(object);
      return;
    }
    const previousScale = object.type === 'room' ? _sketchScale() : null;
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
    if (object.type === 'window' && ['left', 'right'].includes(_openingSide(object))) object.w = 8;
    if (object.type === 'window' && ['top', 'bottom'].includes(_openingSide(object))) object.h = 8;
    if (object.type === 'room') {
      _clampRoomWithinBlock(object);
      _updateSketchDimensionsFromRoom(object, previousScale);
      _reflowAttachedOpenings(object);
    }
    if (['door', 'window'].includes(object.type)) _clampOpeningToRoom(object);
    else if (object.type !== 'room') _snapSketchObjectInsideActiveRoom(object);
  }

  function _updateSketchDimensionsFromRoom(room, previousScale) {
    if (!room || !previousScale) return;
    const length = room.w * previousScale.x;
    const width = room.h * previousScale.y;
    if (Number.isFinite(length) && length > 0) _data.__classroomSketch.length = length.toFixed(2);
    if (Number.isFinite(width) && width > 0) _data.__classroomSketch.width = width.toFixed(2);
    delete room.label;
    _syncSketchDimensionInputs();
  }

  function _syncSketchDimensionInputs() {
    const sketch = _data.__classroomSketch || {};
    const lengthInput = document.querySelector('[data-sketch-field="length"]');
    const widthInput = document.querySelector('[data-sketch-field="width"]');
    if (lengthInput && document.activeElement !== lengthInput) lengthInput.value = sketch.length || '';
    if (widthInput && document.activeElement !== widthInput) widthInput.value = sketch.width || '';
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
    if (nearest) {
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
    const thickness = 8;
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

  function _flipOpeningSwing(object) {
    if (!object || object.type !== 'door') return;
    object.ficha = object.ficha || {};
    object.ficha.abre_hacia = object.ficha.abre_hacia === 'Exterior' ? 'Interior' : 'Exterior';
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

  function _reflowSanitaryOpenings(item) {
    const room = _sanitaryRoomObject(item);
    if (!room) return;
    (item.objects || [])
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

  function _reflowSanitaryChildren(item) {
    _reflowSanitaryOpenings(item);
    (item.objects || [])
      .filter(object => object.type !== 'sanitary-room')
      .forEach(object => {
        if (['door', 'window'].includes(object.type)) _clampSanitaryOpeningToRoom(item, object);
        else _clampSanitaryChildToRoom(item, object);
      });
  }

  function _redrawSketchCanvas() {
    const canvas = document.getElementById('mec-classroom-canvas');
    if (canvas) _drawSketch(canvas.getContext('2d'), canvas);
    _centerSketchOnActiveRoom();
  }

  function _centerSketchOnActiveRoom(force = false) {
    if (!force && !_pendingSketchCenter) return;
    const wrap = document.querySelector('.mec-sketch-canvas-wrap');
    const canvas = document.getElementById('mec-classroom-canvas');
    const room = (_data.__classroomSketch?.objects || []).find(object => object.type === 'room');
    if (!wrap || !canvas || !room) {
      _pendingSketchCenter = false;
      return;
    }
    _pendingSketchCenter = false;
    requestAnimationFrame(() => {
      const scale = _sketchZoom || 1;
      const centerX = (room.x + room.w / 2) * scale;
      const centerY = (room.y + room.h / 2) * scale;
      wrap.scrollLeft = Math.max(0, centerX - wrap.clientWidth / 2);
      wrap.scrollTop = Math.max(0, centerY - wrap.clientHeight / 2);
    });
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
    _centerSketchOnActiveRoom(true);
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
        title: 'Ficha de abertura',
        typeOptions: ['Con puerta madera', 'Con puerta metal', 'Con puerta vidrio', 'Reja', 'Sin puerta', 'Cortina', 'Media puerta', 'Porton', 'Otro'],
        extra: [
          { key: 'cerradura', label: 'Cerradura', options: ['Funciona', 'Regular', 'No funciona', 'No tiene'] },
          { key: 'abre_hacia', label: 'Apertura', options: ['Interior', 'Exterior', 'Corrediza', 'No verificable'] },
          { key: 'bisagra', label: 'Bisagra', options: ['Inicio', 'Fin'] },
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
        title: 'Ficha de daño',
        typeOptions: ['Humedad', 'Fisura', 'Rotura', 'Desprendimiento', 'Instalacion expuesta', 'Otro'],
        estados: ['Leve', 'Moderado', 'Severo', 'Riesgo inmediato'],
        materiales: common.materiales,
        extra: [{ key: 'prioridad', label: 'Prioridad', options: ['Baja', 'Media', 'Alta', 'Urgente'] }],
      },
      light: {
        title: 'Ficha de iluminacion',
        typeOptions: ['Foco LED', 'Tubo fluorescente', 'Panel', 'Artefacto colgante', 'No verificable', 'Otro'],
        extra: [{ key: 'funcionamiento', label: 'Funcionamiento', options: ['Funciona', 'Intermitente', 'No funciona', 'No verificable'] }],
        ...common,
      },
      text: {
        title: 'Ficha de texto libre',
        typeOptions: ['Nota', 'Medida', 'Observacion', 'Referencia'],
        extra: [],
        ...common,
      },
      pencil: {
        title: 'Ficha de trazo libre',
        typeOptions: ['Trazo', 'Croquis', 'Marca', 'Observacion'],
        extra: [],
        ...common,
      },
      photo: {
        title: 'Ficha de iluminacion',
        typeOptions: ['Foco LED', 'Tubo fluorescente', 'Panel', 'Artefacto colgante', 'No verificable', 'Otro'],
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
              <div class="form-group">
                <label>${object.type === 'door' ? 'Tipo de abertura' : 'Tipo'}</label>
                ${_choiceButtons('subtipo', cfg.typeOptions, object.ficha.subtipo || '')}
              </div>
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
                .filter(field => !compactOpening || ['abre_hacia', 'bisagra', 'tiene_reja'].includes(field.key))
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
      object.ficha.evidencias = await Promise.all([...input.files].map(file => _readEvidenceFile(file, _sketchObjectEvidenceContext(object))));
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
    ['codigo', 'subtipo', 'estado', 'material', 'largo_m', 'ancho_m', 'alto_m', 'tiene_reja', 'ventila', 'cerradura', 'abre_hacia', 'bisagra', 'seguridad', 'pasamanos', 'prioridad', 'funcionamiento', 'observacion']
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
      const special = _moduleProgressText(module);
      if (special) {
        badges.forEach(badge => { badge.textContent = special; });
        return;
      }
      const required = _requiredFields(module.id);
      const done = required.filter(item => _fieldFilled(module.id, item.field)).length;
      badges.forEach(badge => { badge.textContent = `${done}/${required.length} obligatorios`; });
    });

    const saveState = document.getElementById('mec-save-state');
    const saved = _readSavedMeta();
    if (saveState && saved) saveState.textContent = _formatSavedAt(saved.savedAt);
  }

  function _moduleProgressText(module) {
    if (module.id === 'bloques') return `${(_data.__blocks || []).length} bloque(s)`;
    if (module.kind === 'classroomSketch') {
      _ensureClassrooms();
      const rooms = _data.__classrooms || [];
      const closed = rooms.filter(room => (room.objects || []).some(object => object.type === 'room') && room.length && room.width).length;
      return `${closed}/${rooms.length} aula(s)`;
    }
    if (module.kind === 'sanitaryList') {
      _ensureSanitaries();
      return `${(_data.__sanitaries || []).length} sanitario(s)`;
    }
    return '';
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
    _activeModuleId = moduleId;
    _data.__activeModuleId = moduleId;
    _saveDraft(false);
    _refreshDynamicState();
    if (module.kind === 'schoolPlan') renderSchoolPlan();
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
      _data.__classroomSketch.length = length.toFixed(1);
      _data.__classroomSketch.width = width.toFixed(1);
    }
    const previousRoom = (_data.__classroomSketch.objects || []).find(object => object.type === 'room');
    const size = _roomSizeFromDimensions(length, width);
    const rect = previousRoom
      ? _clampRectToBlock({ x: previousRoom.x, y: previousRoom.y, w: size.w, h: size.h })
      : _suggestRoomRectForNewClassroom(length, width);
    const room = _buildRoomObjectFromDimensions(length, width, previousRoom?.id, rect);
    _data.__classroomSketch.objects = [
      room,
      ..._data.__classroomSketch.objects.filter(object => object.type !== 'room'),
    ];
    _selectedSketchObjectId = room.id;
    _requestSketchCenter();
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

  function flipSelectedDoorSwing() {
    const object = _findSketchObjectById(_selectedSketchObjectId);
    if (!object || object.type !== 'door') {
      UI.showToast('Seleccione una puerta para cambiar su lado de apertura.', 'warning');
      return;
    }
    _pushSketchHistory();
    _flipOpeningSwing(object);
    _saveDraft(false);
    _redrawSketchCanvas();
    _updateSketchStatus();
    renderSchoolPlan();
    UI.showToast(`Apertura de puerta cambiada: ${object.ficha.abre_hacia || 'Interior'}.`, 'success');
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
    if (!_initialized && !Object.keys(_data || {}).length) _loadDraft();
    const root = _activeSchoolPlanRoot();
    if (!root) return;
    const sketch = _data.__classroomSketch || {};
    _ensureClassrooms();
    _ensureSanitaries();
    const objects = _schoolPlanObjects();
    const metrics = _schoolPlanMetrics(sketch, objects);
    const canvasId = root.id === 'mec-school-plan-root' ? 'mec-school-plan-canvas' : PLAN_CANVAS_ID;
    const canvasHeight = _planCanvasHeight();
    root.dataset.planCanvasId = canvasId;

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
          ${_planKpi('Luces', metrics.lights, _stateSummaryText(metrics.states.light))}
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
            <canvas id="${canvasId}" data-school-plan-canvas width="900" height="${canvasHeight}" aria-label="Plano general de la escuela"></canvas>
          </div>
          <aside class="school-plan__side">
            <h3>Aulas y elementos</h3>
            <div class="school-plan__legend">
              <span><i class="legend-room"></i>Aula</span>
              <span><i class="legend-door"></i>Puerta</span>
              <span><i class="legend-window"></i>Ventana</span>
              <span><i class="legend-outlet"></i>Toma</span>
              <span><i class="legend-light"></i>Foco</span>
              <span><i class="legend-damage"></i>Daño/obs.</span>
              <span><i class="legend-sanitary"></i>Sanitario</span>
            </div>
            <div class="school-plan__list">
              ${(_data.__classrooms || []).map(_renderPlanClassroomRow).join('')}
              ${(_data.__sanitaries || []).map(_renderPlanSanitaryRow).join('')}
              ${!(_data.__classrooms || []).length && !objects.length ? '<p class="text-muted">Todavia no hay elementos cargados. Genere el aula base desde el Cuestionario MEC.</p>' : ''}
            </div>
          </aside>
        </section>
      </div>`;

    _drawSchoolPlan();
    _bindSchoolPlanCanvas();
  }

  function _activeSchoolPlanRoot() {
    return document.querySelector('.mec-module--active #mec-school-plan-root')
      || document.getElementById('school-plan-root')
      || document.getElementById('mec-school-plan-root');
  }

  function _activeSchoolPlanCanvas() {
    return document.querySelector('.mec-module--active [data-school-plan-canvas]')
      || document.getElementById(PLAN_CANVAS_ID)
      || document.getElementById('mec-school-plan-canvas');
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
      electricidad: 'Tomas/Focos',
      danos: 'Daños/obs.',
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
          <strong>${_escape(_classroomHierarchyLabel(room) || room.name || `Aula ${index + 1}`)}</strong>
          <small>${_escape([block?.bloque_codigo, room.floor, room.length && room.width ? `${room.length} x ${room.width} m` : 'Sin dimensiones'].filter(Boolean).join(' · '))}</small>
        </button>
        ${active ? `
          <div class="school-plan-group__children">
            ${children.length ? children.map(_renderPlanObjectRow).join('') : '<p class="text-muted">Esta aula aun no tiene elementos dibujados.</p>'}
          </div>` : ''}
      </article>`;
  }

  function _renderPlanSanitaryRow(item, index) {
    const id = `sanitary::${item.id}`;
    return `
      <button class="school-plan-object school-plan-object--sanitary ${_selectedPlanId === id ? 'school-plan-object--active' : ''}" type="button"
        ondblclick="MecFormModule.editPlanSanitary('${_escape(item.id)}')"
        onclick="MecFormModule.selectPlanItem('${_escape(id)}')">
        <span class="school-plan-object__type">Sanitario</span>
        <strong>${_escape(item.codigo || `Sanitario ${index + 1}`)}</strong>
        <small>${_escape([item.bloque, item.planta, item.inodoros ? `${item.inodoros} inod.` : '', item.largo_m && item.ancho_m ? `${item.largo_m} x ${item.ancho_m} m` : 'Sin medidas'].filter(Boolean).join(' · '))}</small>
      </button>`;
  }

  function _selectedClassroomIdFromPlan() {
    if (!_selectedPlanId) return (_data.__classrooms || [])[0]?.id || null;
    if (String(_selectedPlanId).startsWith('room::')) return String(_selectedPlanId).replace('room::', '');
    if (String(_selectedPlanId).includes('::')) return String(_selectedPlanId).split('::')[0];
    return null;
  }

  function _schoolPlanMetrics(sketch, objects) {
    const classrooms = _data.__classrooms || [];
    const sanitaries = _data.__sanitaries || [];
    const sanitaryObjects = sanitaries.flatMap(item => item.objects || []).filter(object => object.type !== 'sanitary-room');
    const allObjects = [...objects, ...sanitaryObjects];
    const areaTotal = classrooms.reduce((sum, room) => sum + (Number(room.length || 0) * Number(room.width || 0)), 0)
      + sanitaries.reduce((sum, item) => sum + (Number(item.largo_m || 0) * Number(item.ancho_m || 0)), 0);
    const states = { door: {}, window: {}, outlet: {}, light: {}, photo: {}, damage: {} };
    allObjects.forEach(object => {
      const stateKey = object.type === 'photo' ? 'light' : object.type;
      if (states[stateKey]) {
        const state = object.ficha?.estado || 'Sin estado';
        states[stateKey][state] = (states[stateKey][state] || 0) + 1;
      }
    });
    return {
      areaTotal,
      rooms: classrooms.length,
      blocks: (_data.__blocks || []).length,
      sanitaries: sanitaries.length,
      doors: allObjects.filter(object => object.type === 'door').length,
      windows: allObjects.filter(object => object.type === 'window').length,
      outlets: allObjects.filter(object => object.type === 'outlet').length,
      lights: allObjects.filter(object => ['light', 'photo'].includes(object.type)).length,
      alerts: allObjects.filter(object => _isPlanAlert(object)).length + sanitaries.filter(item => _isPlanAlert({ ficha: item })).length,
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

  function _configuredFloorCount(block) {
    const value = Number(block?.cantidad_plantas || _data.bloques?.cantidad_plantas || 1);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
  }

  function _planFloorsForBlock(block, rooms = _data.__classrooms || [], sanitaries = _data.__sanitaries || []) {
    const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
    const blockSanitaries = (sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block));
    const configured = _configuredFloorCount(block);
    const floors = new Set(Array.from({ length: configured }, (_, index) => _normalizeFloor(index + 1)));
    blockRooms.forEach(room => floors.add(_normalizeFloor(room.floor || 'Piso 1')));
    blockSanitaries.forEach(item => floors.add(_normalizeFloor(item.planta || 'Piso 1')));
    return [...floors].sort((a, b) => _floorNumberValue(a) - _floorNumberValue(b));
  }

  function _planCanvasHeight() {
    const blocks = _data.__blocks?.length ? _data.__blocks : [{ id: 'sin_bloque', bloque_codigo: 'Sin bloque' }];
    const rows = Math.max(1, Math.ceil(blocks.length / 2));
    const maxFloors = Math.max(1, ...blocks.map(block => _planFloorsForBlock(block).length));
    return Math.max(620, 320 * rows + Math.max(0, maxFloors - 1) * 170);
  }

  function _drawSchoolPlan() {
    const canvas = _activeSchoolPlanCanvas();
    if (!canvas) return;
    _ensureSketchObjects();
    _ensureSanitaries();
    const ctx = canvas.getContext('2d');
    _planHitAreas = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rooms = _data.__classrooms || [];
    const sanitaries = _data.__sanitaries || [];
    if (!rooms.length && !sanitaries.length) {
      ctx.fillStyle = '#667085';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Plano general en espera de datos cargados', canvas.width / 2, canvas.height / 2);
      return;
    }

    const blocks = _data.__blocks?.length ? _data.__blocks : [{ id: 'sin_bloque', bloque_codigo: 'Sin bloque', largo_m: 0, ancho_m: 0 }];
    const layout = _planBlockLayout(blocks, canvas.width, canvas.height);
    const distanceItems = [];
    layout.forEach(({ block, x, y, w, h, scale }) => {
      const blockPlanId = `block::${block.id}`;
      const blockSelected = _selectedPlanId === blockPlanId || _activePlanDrag?.blockId === block.id;
      _planHitAreas.push({ id: blockPlanId, type: 'block', blockId: block.id, x, y, w, h });
      distanceItems.push({
        id: blockPlanId,
        type: 'block',
        label: block.bloque_codigo || 'Bloque',
        x,
        y,
        w,
        h,
        metersPerPx: scale ? 1 / scale : 1,
      });
      ctx.save();
      ctx.strokeStyle = blockSelected ? '#111827' : '#172033';
      ctx.lineWidth = blockSelected ? 4 : 3;
      ctx.fillStyle = 'rgba(226,232,240,.32)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(23,32,51,.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
      ctx.fillStyle = 'rgba(23,32,51,.06)';
      ctx.fillRect(x + 1, y + 1, w - 2, 30);
      ctx.fillStyle = '#172033';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(block.bloque_codigo || 'Bloque', x + 10, y + 14);
      if (block.largo_m && block.ancho_m) {
        ctx.font = '700 9px system-ui, sans-serif';
        ctx.fillStyle = '#475467';
        ctx.fillText(`${block.largo_m} x ${block.ancho_m} m`, x + 10, y + 26);
      }

      const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
      const blockSanitaries = _sanitariesForBlock(block);
      const floors = _planFloorsForBlock(block, rooms, sanitaries);
      if (!blockRooms.length && !blockSanitaries.length) {
        ctx.fillStyle = '#667085';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('Bloque sin aulas o sanitarios asociados', x + 12, y + 56);
      }
      floors.forEach((floor, floorIndex) => {
        const floorRooms = blockRooms.filter(room => _normalizeFloor(room.floor) === floor);
        const floorSanitaries = blockSanitaries.filter(item => _normalizeFloor(item.planta || 'Piso 1') === floor);
        const floorRect = _planFloorRect(x, y, w, h, floorIndex, floors.length, false);
        const floorContentRect = _planFloorContentRect(floorRect);
        ctx.fillStyle = 'rgba(255,255,255,.68)';
        ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
        ctx.strokeStyle = 'rgba(71,84,103,.28)';
        ctx.lineWidth = 1;
        ctx.strokeRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
        ctx.fillStyle = 'rgba(71,84,103,.08)';
        ctx.fillRect(floorRect.x + 1, floorRect.y + 1, floorRect.w - 2, 18);
        ctx.fillStyle = '#475467';
        ctx.font = '800 10px system-ui, sans-serif';
        ctx.fillText(floor, floorRect.x + 8, floorRect.y + 13);
        const roomItems = _planRoomItemsFromSketch(floorRooms, floorContentRect);
        const sanitaryItems = _planSanitaryItemsFromSketch(floorSanitaries, floorContentRect);
        const floorMetersPerPx = _planFloorMetersPerPx(block, floorContentRect);
        roomItems.forEach(item => distanceItems.push({
          id: `room::${item.room.id}`,
          type: 'room',
          label: item.room.name || 'Aula',
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          metersPerPx: floorMetersPerPx,
        }));
        sanitaryItems.forEach(item => distanceItems.push({
          id: `sanitary::${item.sanitary.id}`,
          type: 'sanitary',
          label: item.sanitary.codigo || 'Sanitario',
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          metersPerPx: floorMetersPerPx,
        }));
        roomItems.forEach(item => {
          if (_planLayers.aulas) _drawPlanClassroom(ctx, item.room, item.x, item.y, item.w, item.h);
        });
        sanitaryItems.forEach(item => _drawPlanSanitaryRoom(ctx, item.sanitary, item.x, item.y, item.w, item.h));
        _drawSharedWallTicks(ctx, roomItems);
      });
      ctx.restore();
    });
    _drawPlanDistanceGuides(ctx, distanceItems);
  }

  function _planFloorRect(blockX, blockY, blockW, blockH, floorIndex, floorCount, hasSanitaries) {
    const innerX = blockX + 14;
    const top = blockY + 48;
    const gap = 34;
    const bottomReserve = hasSanitaries ? 16 : 14;
    const availableH = Math.max(36, blockH - 62 - bottomReserve - gap * Math.max(0, floorCount - 1));
    const count = Math.max(1, floorCount || 1);
    const bandH = availableH / count;
    return {
      x: innerX,
      y: top + floorIndex * (bandH + gap),
      w: Math.max(40, blockW - 28),
      h: Math.max(28, bandH),
    };
  }

  function _planFloorContentRect(floorRect) {
    return {
      x: floorRect.x + 6,
      y: floorRect.y + 23,
      w: Math.max(28, floorRect.w - 12),
      h: Math.max(20, floorRect.h - 29),
    };
  }

  function _planFloorMetersPerPx(block, floorRect) {
    const length = Number(block?.largo_m || 0);
    const width = Number(block?.ancho_m || 0);
    const x = length && floorRect.w ? length / floorRect.w : 0;
    const y = width && floorRect.h ? width / floorRect.h : 0;
    if (x && y) return (x + y) / 2;
    return x || y || 1;
  }

  function _planBlockLayout(blocks, canvasW, canvasH) {
    const models = blocks.map(block => {
      const length = Number(block.largo_m || 0) || 30;
      const width = Number(block.ancho_m || 0) || 20;
      const floorCount = Math.max(1, _planFloorsForBlock(block).length);
      return { block, length, width, floorCount };
    });
    const maxLength = Math.max(...models.map(model => model.length), 30);
    const maxStackWidth = Math.max(...models.map(model => model.width * model.floorCount), 20);
    const floorGap = 34;
    const maxGapPx = Math.max(...models.map(model => Math.max(0, model.floorCount - 1) * floorGap), 0);
    const cols = 2;
    const cellW = (canvasW - 72) / cols;
    const rows = Math.max(1, Math.ceil(blocks.length / cols));
    const cellH = (canvasH - 72) / rows;
    const scale = Math.max(.18, Math.min((cellW - 48) / maxLength, (cellH - 74 - maxGapPx) / maxStackWidth));
    return models.map((model, index) => {
      const { block, length, width, floorCount } = model;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const bw = Math.max(70, length * scale);
      const floorH = Math.max(34, width * scale);
      const bh = Math.max(78, 68 + floorCount * floorH + Math.max(0, floorCount - 1) * floorGap);
      const cellX = 28 + col * cellW;
      const cellY = 36 + row * cellH;
      const autoX = cellX + Math.max(0, (cellW - bw) / 2);
      const autoY = cellY + Math.max(0, (cellH - bh) / 2);
      const saved = block.planPosition || block.plano_general || null;
      const savedX = Number(saved?.xRatio);
      const savedY = Number(saved?.yRatio);
      const x = Number.isFinite(savedX) ? savedX * canvasW : autoX;
      const y = Number.isFinite(savedY) ? savedY * canvasH : autoY;
      const clamped = _clampPlanRect({ x, y, w: bw, h: bh }, canvasW, canvasH);
      return {
        block,
        x: clamped.x,
        y: clamped.y,
        w: bw,
        h: bh,
        scale,
      };
    });
  }

  function _clampPlanRect(rect, canvasW, canvasH) {
    const margin = 12;
    return {
      ...rect,
      x: Math.max(margin, Math.min(rect.x, canvasW - rect.w - margin)),
      y: Math.max(margin, Math.min(rect.y, canvasH - rect.h - margin)),
    };
  }

  function _nearestPlanDistance(source, candidates) {
    const sx = source.x + source.w / 2;
    const sy = source.y + source.h / 2;
    return candidates
      .filter(item => item.id !== source.id)
      .map(item => {
        const leftGap = item.x - (source.x + source.w);
        const rightGap = source.x - (item.x + item.w);
        const topGap = item.y - (source.y + source.h);
        const bottomGap = source.y - (item.y + item.h);
        const dx = leftGap > 0 ? leftGap : (rightGap > 0 ? -rightGap : 0);
        const dy = topGap > 0 ? topGap : (bottomGap > 0 ? -bottomGap : 0);
        const tx = item.x + item.w / 2;
        const ty = item.y + item.h / 2;
        const distancePx = Math.hypot(dx, dy);
        return {
          item,
          distancePx,
          from: { x: sx, y: sy },
          to: { x: tx, y: ty },
          metersPerPx: (source.metersPerPx + item.metersPerPx) / 2 || source.metersPerPx || 1,
        };
      })
      .sort((a, b) => a.distancePx - b.distancePx)[0] || null;
  }

  function _drawPlanDistanceGuides(ctx, items) {
    const selectedId = _activePlanDrag?.id || _selectedPlanId;
    if (!selectedId) return;
    const source = items.find(item => item.id === selectedId);
    if (!source) return;
    const candidates = source.type === 'block'
      ? items.filter(item => item.type === 'block')
      : items.filter(item => item.type !== 'block');
    const nearest = _nearestPlanDistance(source, candidates);
    if (!nearest || !Number.isFinite(nearest.distancePx)) return;
    const meters = nearest.distancePx * nearest.metersPerPx;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,76,34,.82)';
    ctx.fillStyle = '#9a3412';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(nearest.from.x, nearest.from.y);
    ctx.lineTo(nearest.to.x, nearest.to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const label = `${meters.toFixed(2)} m`;
    const x = (nearest.from.x + nearest.to.x) / 2;
    const y = (nearest.from.y + nearest.to.y) / 2;
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const width = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(255,247,237,.94)';
    ctx.fillRect(x - width / 2, y - 9, width, 18);
    ctx.fillStyle = '#9a3412';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
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

  function _planRoomItemsFromSketch(rooms, floorRect) {
    const source = _sketchBlockRect();
    const fallback = [];
    const mapped = [];
    rooms.forEach(room => {
      const object = _roomObjectForClassroom(room);
      if (!object) {
        fallback.push(room);
        return;
      }
      mapped.push({
        room,
        x: floorRect.x + ((object.x - source.x) / source.w) * floorRect.w,
        y: floorRect.y + ((object.y - source.y) / source.h) * floorRect.h,
        w: Math.max(16, (object.w / source.w) * floorRect.w),
        h: Math.max(14, (object.h / source.h) * floorRect.h),
      });
    });
    if (!fallback.length) return mapped;
    return [
      ...mapped,
      ..._layoutPlanRooms(fallback, floorRect.x, floorRect.y, floorRect.w, floorRect.h),
    ];
  }

  function _planSanitaryItemsFromSketch(items, floorRect) {
    const source = _sketchBlockRect();
    return (items || []).map(sanitary => {
      const object = _ensureSanitaryRoomObject(sanitary);
      if (!object) return null;
      return {
        sanitary,
        x: floorRect.x + ((object.x - source.x) / source.w) * floorRect.w,
        y: floorRect.y + ((object.y - source.y) / source.h) * floorRect.h,
        w: Math.max(12, (object.w / source.w) * floorRect.w),
        h: Math.max(10, (object.h / source.h) * floorRect.h),
      };
    }).filter(Boolean);
  }

  function _sanitariesForBlock(block) {
    return (_data.__sanitaries || []).filter(item => _matchesBlockReference(item.bloque, block));
  }

  function _drawPlanSanitaryRoom(ctx, item, x, y, w, h) {
    const selected = _selectedPlanId === `sanitary::${item.id}`;
    _planHitAreas.push({ id: `sanitary::${item.id}`, type: 'sanitary', sanitaryId: item.id, x, y, w, h });
    ctx.fillStyle = selected ? 'rgba(128,90,213,.2)' : 'rgba(128,90,213,.1)';
    ctx.strokeStyle = selected ? '#111827' : '#805ad5';
    ctx.lineWidth = selected ? 2.5 : 1.8;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(128,90,213,.38)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, Math.max(0, w - 6), Math.max(0, h - 6));
    if (_planLayers.etiquetas) {
      ctx.fillStyle = '#44337a';
      ctx.font = '800 9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.codigo || 'Sanitario', x + 4, y + 12);
    }
    _drawPlanSanitaryOpenings(ctx, item, x, y, w, h);
  }

  function _drawPlanSanitaryOpenings(ctx, item, x, y, w, h) {
    const roomObject = _sanitaryRoomObject(item);
    if (!roomObject) return;
    const sx = w / roomObject.w;
    const sy = h / roomObject.h;
    (item.objects || [])
      .filter(object => ['door', 'window', 'stall', 'outlet', 'light', 'photo'].includes(object.type))
      .forEach(object => {
        if (['door', 'window'].includes(object.type) && !_planLayers.aberturas) return;
        if (['outlet', 'light', 'photo'].includes(object.type) && !_planLayers.electricidad) return;
        const ox = x + (object.x - roomObject.x) * sx;
        const oy = y + (object.y - roomObject.y) * sy;
        if (object.type === 'door') {
          const vertical = ['left', 'right'].includes(_openingSide(object));
          const ow = Math.max(5, object.w * sx);
          const oh = Math.max(5, object.h * sy);
          const length = vertical ? oh : Math.max(8, ow);
          const scaledObject = { ...object, x: ox, y: oy, w: ow, h: oh };
          const variant = _doorVariant(object);
          if (variant !== 'door') {
            _drawOpeningVariantMark(ctx, scaledObject, variant);
            return;
          }
          const hinge = _doorHingePoint(scaledObject, 8);
          const angles = _doorSwingAngles(object, object.ficha?.abre_hacia === 'Exterior' ? -1 : 1);
          ctx.strokeStyle = '#2f855a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hinge.x, hinge.y);
          ctx.lineTo(hinge.x + Math.cos(angles.leaf) * length, hinge.y + Math.sin(angles.leaf) * length);
          ctx.stroke();
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(hinge.x, hinge.y, length, angles.start, angles.end, angles.ccw);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        if (object.type === 'window') {
          const vertical = ['left', 'right'].includes(_openingSide(object));
          const length = vertical ? Math.max(8, object.h * sy) : Math.max(8, object.w * sx);
          ctx.strokeStyle = '#2b6cb0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(vertical ? ox : ox + length, vertical ? oy + length : oy);
          ctx.stroke();
          return;
        }
        if (object.type === 'stall') {
          const ow = Math.max(8, object.w * sx);
          const oh = Math.max(8, object.h * sy);
          ctx.fillStyle = 'rgba(107,114,128,.12)';
          ctx.strokeStyle = 'rgba(75,85,99,.74)';
          ctx.lineWidth = 1.2;
          ctx.fillRect(ox, oy, ow, oh);
          ctx.strokeRect(ox, oy, ow, oh);
          if (_planLayers.etiquetas) {
            ctx.fillStyle = '#4b5563';
            ctx.font = '800 7px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(_truncateLabel(ctx, object.ficha?.codigo || 'Cbn', Math.max(18, ow - 4)), ox + ow / 2, oy + Math.min(12, oh / 2 + 3));
          }
          return;
        }
        _drawPlanPointSymbol(ctx, object.type, ox, oy);
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
      .filter(object => ['door', 'window', 'outlet', 'light', 'photo'].includes(object.type))
      .forEach(object => {
        if (['door', 'window'].includes(object.type) && !_planLayers.aberturas) return;
        if (['outlet', 'light', 'photo'].includes(object.type) && !_planLayers.electricidad) return;
        const ox = x + (object.x - roomObject.x) * sx;
        const oy = y + (object.y - roomObject.y) * sy;
        if (object.type === 'door') {
          const vertical = ['left', 'right'].includes(_openingSide(object));
          const ow = Math.max(8, object.w * sx);
          const oh = Math.max(8, object.h * sy);
          const length = vertical ? oh : Math.max(12, ow);
          _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 8, y: oy - 8, w: Math.max(18, ow + 16), h: Math.max(18, oh + 16) });
          const scaledObject = { ...object, x: ox, y: oy, w: ow, h: oh };
          const variant = _doorVariant(object);
          if (variant !== 'door') {
            _drawOpeningVariantMark(ctx, scaledObject, variant);
            return;
          }
          const hinge = _doorHingePoint(scaledObject, 8);
          const angles = _doorSwingAngles(object, object.ficha?.abre_hacia === 'Exterior' ? -1 : 1);
          ctx.strokeStyle = '#2f855a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hinge.x, hinge.y);
          ctx.lineTo(hinge.x + Math.cos(angles.leaf) * length, hinge.y + Math.sin(angles.leaf) * length);
          ctx.stroke();
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(hinge.x, hinge.y, length, angles.start, angles.end, angles.ccw);
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
        _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox - 8, y: oy - 8, w: 16, h: 16 });
        _drawPlanPointSymbol(ctx, object.type, ox, oy);
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
    if (_planLayers.etiquetas) {
      (room.objects || []).filter(object => ['text', 'pencil'].includes(object.type)).forEach(object => {
        if (object.type === 'text') {
          const ox = x + (object.x - roomObject.x) * sx;
          const oy = y + (object.y - roomObject.y) * sy;
          const ow = Math.max(20, object.w * sx);
          const oh = Math.max(10, object.h * sy);
          _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: ox, y: oy, w: ow, h: oh });
          ctx.fillStyle = '#7c2d12';
          ctx.font = '700 7px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(_truncateLabel(ctx, object.ficha?.observacion || object.text || 'Texto', Math.max(16, ow - 4)), ox + ow / 2, oy + oh / 2 + 2);
          return;
        }
        const points = object.points || [];
        if (!points.length) return;
        const scaled = points.map(point => ({ x: x + (point.x - roomObject.x) * sx, y: y + (point.y - roomObject.y) * sy }));
        const box = _pencilBounds({ points: scaled });
        _planHitAreas.push({ id: `${room.id}::${object.id}`, type: object.type, roomId: room.id, objectId: object.id, x: box.x - 4, y: box.y - 4, w: box.w + 8, h: box.h + 8 });
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(scaled[0].x, scaled[0].y);
        scaled.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
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

  function _drawPlanPointSymbol(ctx, type, x, y) {
    ctx.save();
    if (type === 'outlet') {
      ctx.strokeStyle = '#b7791f';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x - 3, y - 3, 6, 6);
      ctx.beginPath();
      ctx.moveTo(x - 1.5, y - 2);
      ctx.lineTo(x - 1.5, y + 2);
      ctx.moveTo(x + 1.5, y - 2);
      ctx.lineTo(x + 1.5, y + 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.strokeStyle = '#d69e2e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.stroke();
    ctx.restore();
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

  function editPlanSanitary(id) {
    const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === id);
    if (!item) return;
    const block = (_data.__blocks || []).find(candidate => _matchesBlockReference(item.bloque, candidate));
    if (block) {
      _data.__activeBlockId = block.id;
      const { id: _id, ...values } = block;
      _data.bloques = values;
    }
    _selectedPlanId = `sanitary::${id}`;
    selectModule('sanitarios');
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
    if (String(_selectedPlanId).startsWith('sanitary::')) {
      const sanitaryId = String(_selectedPlanId).replace('sanitary::', '');
      const item = (_data.__sanitaries || []).find(sanitary => sanitary.id === sanitaryId);
      if (!item) return;
      const confirmed = await UI.showConfirm('Eliminar sanitario', `¿Confirma eliminar ${_escape(item.codigo || 'este sanitario')} del plano y del relevamiento?`);
      if (!confirmed) return;
      _data.__sanitaries = (_data.__sanitaries || []).filter(sanitary => sanitary.id !== sanitaryId);
      _selectedPlanId = null;
      _saveDraft(false);
      renderSchoolPlan();
      UI.showToast('Sanitario eliminado.', 'success');
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
    const canvas = _activeSchoolPlanCanvas();
    if (!canvas) return;
    if (canvas.dataset.planBound === 'true') return;
    canvas.dataset.planBound = 'true';
    let blockDrag = null;
    let suppressClick = false;
    const pointFromEvent = event => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    const hit = event => {
      const point = pointFromEvent(event);
      return [..._planHitAreas].reverse().find(area =>
        point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h);
    };
    const updateBlockPlacement = event => {
      if (!blockDrag) return;
      const point = pointFromEvent(event);
      const next = _clampPlanRect({
        x: point.x - blockDrag.offsetX,
        y: point.y - blockDrag.offsetY,
        w: blockDrag.w,
        h: blockDrag.h,
      }, canvas.width, canvas.height);
      const block = _blockById(blockDrag.blockId);
      if (!block) return;
      block.planPosition = {
        xRatio: Number((next.x / canvas.width).toFixed(4)),
        yRatio: Number((next.y / canvas.height).toFixed(4)),
      };
      if (block.id === _data.__activeBlockId) _data.bloques = { ...(_data.bloques || {}), planPosition: block.planPosition };
      _activePlanDrag = { id: `block::${block.id}`, blockId: block.id };
      suppressClick = true;
      _drawSchoolPlan();
    };
    canvas.addEventListener('pointerdown', event => {
      const area = hit(event);
      if (!area || area.type !== 'block') return;
      const point = pointFromEvent(event);
      blockDrag = {
        blockId: area.blockId,
        offsetX: point.x - area.x,
        offsetY: point.y - area.y,
        w: area.w,
        h: area.h,
      };
      _selectedPlanId = area.id;
      _activePlanDrag = { id: area.id, blockId: area.blockId };
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      _drawSchoolPlan();
    });
    canvas.addEventListener('pointermove', event => {
      if (!blockDrag) return;
      updateBlockPlacement(event);
      event.preventDefault();
    });
    const endDrag = event => {
      if (!blockDrag) return;
      updateBlockPlacement(event);
      blockDrag = null;
      _activePlanDrag = null;
      _saveDraft(false);
      renderSchoolPlan();
      setTimeout(() => { suppressClick = false; }, 80);
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('click', event => {
      if (suppressClick) return;
      const area = hit(event);
      if (!area) return;
      selectPlanItem(area.id);
    });
    canvas.addEventListener('dblclick', event => {
      const area = hit(event);
      if (!area) return;
      if (area.type === 'room') editPlanClassroom(area.roomId);
      else if (area.type === 'sanitary') editPlanSanitary(area.sanitaryId);
      else editPlanObject(area.id);
    });
  }

  function _buildSchoolPlanModel() {
    _syncActiveClassroomFromSketch();
    _syncActiveBlock();
    const blocks = (_data.__blocks || []).map(block => {
      const floors = _planFloorsForBlock(block, _data.__classrooms || [], _data.__sanitaries || []);
      return {
        ...block,
        floors: floors.map(floor => ({
          id: floor,
          classrooms: (_data.__classrooms || [])
            .filter(room => room.blockId === block.id && _normalizeFloor(room.floor) === floor)
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
          sanitaries: (_data.__sanitaries || [])
            .filter(item => _matchesBlockReference(item.bloque, block) && _normalizeFloor(item.planta || 'Piso 1') === floor),
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
    const height = _planCanvasHeight();
    const layout = _planBlockLayout(blocks, 900, height);
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}">`,
      `<rect width="900" height="${height}" fill="#f8fafc"/>`,
    ];
    layout.forEach(({ block, x, y, w, h }) => {
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#eef2f7" stroke="#172033" stroke-width="2"/>`);
      parts.push(`<text x="${x + 10}" y="${y + 14}" font-family="system-ui" font-size="12" font-weight="800" fill="#172033">${_escape(block.bloque_codigo || 'Bloque')}</text>`);
      if (block.largo_m && block.ancho_m) parts.push(`<text x="${x + 10}" y="${y + 26}" font-family="system-ui" font-size="9" font-weight="700" fill="#475467">${_escape(block.largo_m)} x ${_escape(block.ancho_m)} m</text>`);
      const blockRooms = rooms.filter(room => (room.blockId || 'sin_bloque') === block.id || (!room.blockId && block.id === 'sin_bloque'));
      const blockSanitaries = _sanitariesForBlock(block);
      const floors = _planFloorsForBlock(block, rooms, _data.__sanitaries || []);
      floors.forEach((floor, floorIndex) => {
        const floorRooms = blockRooms.filter(room => _normalizeFloor(room.floor) === floor);
        const floorSanitaries = blockSanitaries.filter(item => _normalizeFloor(item.planta || 'Piso 1') === floor);
        const floorRect = _planFloorRect(x, y, w, h, floorIndex, floors.length, false);
        const floorContentRect = _planFloorContentRect(floorRect);
        parts.push(`<rect x="${floorRect.x}" y="${floorRect.y}" width="${floorRect.w}" height="${floorRect.h}" fill="#ffffff" fill-opacity=".68" stroke="#dbe5f1" stroke-width="1"/>`);
        parts.push(`<rect x="${floorRect.x + 1}" y="${floorRect.y + 1}" width="${floorRect.w - 2}" height="18" fill="#eef2f7" fill-opacity=".8"/>`);
        parts.push(`<text x="${floorRect.x + 8}" y="${floorRect.y + 13}" font-family="system-ui" font-size="10" font-weight="800" fill="#475467">${_escape(floor)}</text>`);
        _planRoomItemsFromSketch(floorRooms, floorContentRect).forEach(item => {
          parts.push(`<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="#eaf4ff" stroke="#2b6cb0" stroke-width="2"/>`);
          parts.push(`<rect x="${item.x + 4}" y="${item.y + 4}" width="${Math.max(0, item.w - 8)}" height="${Math.max(0, item.h - 8)}" fill="none" stroke="#8db8e8" stroke-width="1"/>`);
          parts.push(`<text x="${item.x + 6}" y="${item.y + 14}" font-family="system-ui" font-size="10" font-weight="800" fill="#173f68">${_escape(item.room.name || 'Aula')}</text>`);
        });
        _planSanitaryItemsFromSketch(floorSanitaries, floorContentRect).forEach(item => {
          parts.push(`<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="#f2ecff" stroke="#805ad5" stroke-width="1.7"/>`);
          parts.push(`<rect x="${item.x + 3}" y="${item.y + 3}" width="${Math.max(0, item.w - 6)}" height="${Math.max(0, item.h - 6)}" fill="none" stroke="#b794f4" stroke-width="1"/>`);
          parts.push(`<text x="${item.x + 4}" y="${item.y + 12}" font-family="system-ui" font-size="9" font-weight="800" fill="#44337a">${_escape(item.sanitary.codigo || 'Sanitario')}</text>`);
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
    const canvas = _activeSchoolPlanCanvas();
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
    const canvas = _activeSchoolPlanCanvas();
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
    const index = [];
    Object.entries(_data.__evidence || {}).forEach(([fieldPath, photos]) => {
      (photos || []).forEach((photo, photoIndex) => index.push({
        fieldPath,
        index: photoIndex + 1,
        name: photo.name,
        indexedName: photo.indexedName || '',
        label: photo.label || _evidenceIndexLabel(photo.context || { fieldPath }),
        type: photo.type,
        size: photo.size,
        capturedAt: photo.capturedAt,
        context: photo.context || {},
      }));
    });
    (_data.__classrooms || []).forEach(room => {
      (room.objects || []).forEach(object => {
        (object.ficha?.evidencias || []).forEach((photo, photoIndex) => index.push({
          fieldPath: `plano.${room.id}.${object.id}`,
          index: photoIndex + 1,
          name: photo.name,
          indexedName: photo.indexedName || '',
          label: photo.label || _evidenceIndexLabel(_sketchObjectEvidenceContext(object, room)),
          type: photo.type,
          size: photo.size,
          capturedAt: photo.capturedAt,
          context: photo.context || _sketchObjectEvidenceContext(object, room),
        }));
      });
    });
    (_data.__sanitaries || []).forEach(item => {
      (item.evidencias || []).forEach((photo, photoIndex) => index.push({
        fieldPath: `sanitarios.${item.id}`,
        index: photoIndex + 1,
        name: photo.name,
        indexedName: photo.indexedName || '',
        label: photo.label || _evidenceIndexLabel(_sanitaryEvidenceContext(item)),
        type: photo.type,
        size: photo.size,
        capturedAt: photo.capturedAt,
        context: photo.context || _sanitaryEvidenceContext(item),
      }));
    });
    return index;
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
    selectBlockForSanitaries,
    selectFloor,
    newBlock,
    saveCurrentBlock,
    deleteActiveBlock,
    selectClassroom,
    newClassroom,
    saveCurrentClassroom,
    deleteActiveClassroom,
    deleteActiveFloor,
    addSanitary,
    selectSanitary,
    addSanitaryFixture,
    addSanitaryOpening,
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
    editPlanSanitary,
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
    flipSelectedDoorSwing,
    deleteSelectedSketchObject,
    clearSketch,
  };
})();
