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
          ${planned ? _renderPlannedModule(module) : module.sections.map(section => _renderSection(module, section)).join('')}
        </div>
      </article>`;
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
    return `
      <div class="mec-field" data-module="${_escape(moduleId)}" data-field="${_escape(field.id)}">
        <label class="mec-label">
          <span>${_escape(field.label)} ${field.required ? '<span class="mec-required">*</span>' : ''}</span>
          ${optional}
        </label>
        ${controlHtml}
        <div class="mec-error" data-error-for="${_escape(moduleId)}.${_escape(field.id)}"></div>
      </div>`;
  }

  function _bindInputs(root) {
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
    const next = modules[Math.min(modules.length - 1, index + 1)];
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

  async function resetDraft() {
    const confirmed = await UI.showConfirm('Limpiar borrador MEC', '¿Desea borrar las respuestas guardadas localmente para esta prueba?');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    _data = {};
    _render();
    UI.showToast('Borrador MEC limpiado.', 'success');
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: MEC_SCHEMA.version,
      values: _data,
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
    resetDraft,
    exportJson,
    toggleModule,
  };
})();
