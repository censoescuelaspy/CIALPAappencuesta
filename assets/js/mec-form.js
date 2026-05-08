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
    return module.sections.map(section => _renderSection(module, section)).join('');
  }

  function _renderPlannedModule(module) {
    return `
      <div class="mec-planned">
        <p>Este modulo ya esta identificado en el manual y se incorporara en la siguiente iteracion del esquema.</p>
        <p class="text-muted">La primera prueba funcional cubre General y Servicios para validar motor, saltos, guardado y exportacion.</p>
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
            <label class="mec-option">
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
        <select id="${id}" class="form-control">
          <option value="">Seleccione...</option>
          ${field.options.map(option => `<option value="${_escape(option)}" ${value === option ? 'selected' : ''}>${_escape(option)}</option>`).join('')}
        </select>${hint}`);
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
          <span>${_escape(field.label)} ${field.required ? '<span class="mec-required">*</span>' : ''}</span>
          ${optional}
        </label>
        ${controlHtml}
        ${evidence}
        <div class="mec-error" data-error-for="${_escape(moduleId)}.${_escape(field.id)}"></div>
      </div>`;
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
    const sketch = _data.__classroomSketch || {};
    return `
      <section class="mec-section mec-sketch">
        <div class="mec-section__header">
          <h4>Croquis dimensional del aula</h4>
          <p class="mec-hint">En desarrollo: genere un aula base y agregue elementos simples que quedan guardados como datos editables.</p>
        </div>
        <div class="mec-sketch__layout">
          <div class="mec-sketch__tools">
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
    return `${count} elemento(s). Herramienta activa: ${_sketchToolLabel(_sketchTool)}. Seleccione un elemento para borrarlo o moverlo.`;
  }

  function _sketchToolLabel(toolId) {
    return SKETCH_TOOLS.find(tool => tool.id === toolId)?.label || toolId;
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
        _saveDraft(false);
      });
    });

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let draftObject = null;
    let movingObject = null;
    let resizingObject = null;
    let moveOffset = null;
    const pointFromEvent = event => {
      const rect = canvas.getBoundingClientRect();
      const source = event.touches?.[0] || event;
      return {
        x: Math.round((source.clientX - rect.left) * (canvas.width / rect.width)),
        y: Math.round((source.clientY - rect.top) * (canvas.height / rect.height)),
      };
    };
    const begin = event => {
      event.preventDefault();
      _ensureSketchObjects();
      const point = pointFromEvent(event);

      if (_sketchTool === 'select') {
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
        return;
      }

      drawing = true;
      draftObject = _newSketchObject(_sketchTool, point, point);
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
      draftObject = null;
      _saveDraft(false);
      _drawSketch(ctx, canvas);
      _updateSketchStatus();
    };

    canvas.addEventListener('mousedown', begin);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', begin, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
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
      return { id, type, start, x: end.x, y: end.y, r: 13 };
    }
    return { id, type, start, x, y, w, h };
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

    if (object.type === 'outlet' || object.type === 'photo') {
      ctx.beginPath();
      ctx.arc(object.x, object.y, object.r || 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      _labelSketchObject(ctx, object, object.type === 'photo' ? 'Foto' : 'Toma', object.x, object.y + 30);
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.rect(object.x, object.y, object.w, object.h);
    ctx.fill();
    ctx.stroke();
    _labelSketchObject(ctx, object, _sketchObjectLabel(object), object.x + object.w / 2, object.y - 14);
    if (_isResizableSketchObject(object)) _drawResizeHandles(ctx, object, selected);
    ctx.restore();
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
    const base = object.label || _sketchLabel(object.type);
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
    return `${(object.w * scale.x).toFixed(2)} x ${(object.h * scale.y).toFixed(2)}m`;
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
      return Math.sqrt(dx * dx + dy * dy) <= (object.r || 13) + 8;
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
  }

  function _redrawSketchCanvas() {
    const canvas = document.getElementById('mec-classroom-canvas');
    if (canvas) _drawSketch(canvas.getContext('2d'), canvas);
  }

  function _updateSketchStatus() {
    const status = document.getElementById('mec-sketch-status');
    if (status) status.textContent = _sketchStatusText(_data.__classroomSketch || {});
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

  function generateRoomSketch() {
    _ensureSketchObjects();
    const length = Number(_data.__classroomSketch.length || 7);
    const width = Number(_data.__classroomSketch.width || 5);
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
    UI.showToast('Aula base generada con dimensiones aproximadas.', 'success');
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
    UI.showToast('Croquis limpiado.', 'success');
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
    generateRoomSketch,
    undoSketchObject,
    deleteSelectedSketchObject,
    clearSketch,
  };
})();
