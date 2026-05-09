/**
 * CIALPA — Relevamiento Escolar
 * admin.js — Configuration, encuestadores CRUD, and audit log (admin only)
 * Version: 2.5.16
 */

const AdminModule = (() => {
  'use strict';

  let _encuestadores = [];
  let _auditFilters = {};

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (!Auth.canAccess('admin')) {
      ['admin-config-panel', 'admin-enc-panel', 'admin-audit-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p class="access-denied">Acceso restringido a administradores.</p>';
      });
      return;
    }
    _bindTabEvents();
    loadConfig();
  }

  function _bindTabEvents() {
    document.querySelectorAll('[data-admin-tab]').forEach(tab => {
      if (tab.dataset.bound === 'true') return;
      tab.dataset.bound = 'true';
      tab.addEventListener('click', () => {
        const target = tab.dataset.adminTab;
        _switchTab(target);
      });
    });
  }

  function _switchTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach(t =>
      t.classList.toggle('active', t.dataset.adminTab === tab));
    document.querySelectorAll('[data-admin-content]').forEach(c =>
      c.classList.toggle('active', c.dataset.adminContent === tab));

    switch (tab) {
      case 'config': loadConfig(); break;
      case 'encuestadores': loadEncuestadores(); break;
      case 'auditoria': loadAuditoria(); break;
    }
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  async function loadConfig() {
    try {
      const result = await API.getConfig();
      if (result.status !== 'ok') throw new Error(result.message);
      _renderConfig(result.data);
    } catch (err) {
      UI.showToast('Error al cargar configuración: ' + err.message, 'error');
    }
  }

  function _renderConfig(configs) {
    const container = document.getElementById('admin-config-list');
    if (!container) return;

    const rows = Array.isArray(configs)
      ? configs
      : Object.entries(configs || {}).map(([clave, valor]) => ({ clave, valor, descripcion: '', editable: true }));
    const editableConfigs = rows.filter(c => c.editable === 'true' || c.editable === true);

    if (!editableConfigs.length) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">No hay parámetros editables configurados.</p>';
      return;
    }

    container.innerHTML = editableConfigs.map(c => `
      <div class="config-item" data-clave="${_escapeHtml(c.clave)}">
        <div class="config-item__info">
          <label class="config-item__key">${_escapeHtml(c.clave)}</label>
          <small class="config-item__desc">${_escapeHtml(c.descripcion || '')}</small>
        </div>
        <div class="config-item__edit">
          <input class="form-control form-control-sm config-input"
            type="text"
            value="${_escapeHtml(c.valor || '')}"
            data-clave="${_escapeHtml(c.clave)}"
            placeholder="Valor..."
          />
          <button class="btn btn-sm btn-primary" onclick='AdminModule.saveConfigItem(${_jsString(c.clave)})'>Guardar</button>
        </div>
      </div>`).join('');
  }

  async function saveConfigItem(clave) {
    const input = document.querySelector(`.config-input[data-clave="${clave}"]`);
    if (!input) return;
    const valor = input.value.trim();
    try {
      const result = await API.setConfig(clave, valor);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast(`Configuración "${clave}" guardada.`, 'success');
    } catch (err) {
      UI.showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  // ── Encuestadores ─────────────────────────────────────────────────────────

  async function loadEncuestadores() {
    try {
      const result = await API.getEncuestadores();
      if (result.status !== 'ok') throw new Error(result.message);
      _encuestadores = result.data || [];
      _renderEncuestadoresTable(_encuestadores);
    } catch (err) {
      UI.showToast('Error al cargar encuestadores: ' + err.message, 'error');
    }
  }

  function _renderEncuestadoresTable(rows) {
    const bodies = ['enc-tbody', 'enc-tbody-admin']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!bodies.length) return;

    if (!rows.length) {
      bodies.forEach(tbody => {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay encuestadores registrados. Los usuarios se administran en la hoja usuarios/encuestadores o desde este panel. Primer acceso: nombre.apellido y contraseña numérica de 6 dígitos.</td></tr>';
      });
      return;
    }

    const html = rows.map(r => `
      <tr>
        <td>${_escapeHtml(r.id_encuestador)}</td>
        <td>${_escapeHtml(r.usuario)}</td>
        <td>${_escapeHtml(`${r.nombres || ''} ${r.apellidos || ''}`.trim())}</td>
        <td>${_escapeHtml(r.documento || '—')}</td>
        <td>${_escapeHtml(r.telefono || '—')}</td>
        <td>${_escapeHtml(r.zona_asignada || '—')}</td>
        <td>
          <span class="badge ${r.activo === 'true' || r.activo === true ? 'badge--success' : 'badge--danger'}">
            ${r.activo === 'true' || r.activo === true ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button class="btn btn-xs btn-outline" onclick='AdminModule.editEncuestador(${_jsString(r.id_encuestador)})'>Editar</button>
          <button class="btn btn-xs btn-danger" onclick='AdminModule.deleteEncuestador(${_jsString(r.id_encuestador)}, ${_jsString(r.usuario)})'>Eliminar</button>
        </td>
      </tr>`).join('');
    bodies.forEach(tbody => { tbody.innerHTML = html; });
  }

  function openNewEncuestador() {
    _openEncuestadorModal(null);
  }

  function editEncuestador(id) {
    const enc = _encuestadores.find(e => e.id_encuestador === id);
    _openEncuestadorModal(enc);
  }

  function _openEncuestadorModal(enc) {
    const isNew = !enc;
    const modal = document.getElementById('modal-encuestador');
    if (!modal) return;

    modal.querySelector('.modal__title').textContent = isNew ? 'Nuevo Encuestador' : 'Editar Encuestador';

    const form = modal.querySelector('#form-encuestador');
    if (form) {
      form.elements['id_encuestador'].value = enc?.id_encuestador || '';
      form.elements['usuario'].value = enc?.usuario || '';
      form.elements['nombres'].value = enc?.nombres || '';
      form.elements['apellidos'].value = enc?.apellidos || '';
      form.elements['documento'].value = enc?.documento || '';
      form.elements['telefono'].value = enc?.telefono || '';
      form.elements['correo'].value = enc?.correo || '';
      form.elements['zona_asignada'].value = enc?.zona_asignada || '';
      form.elements['rol'].value = enc?.rol || 'encuestador';
      if (form.elements['activo']) {
        form.elements['activo'].checked = enc?.activo === 'true' || enc?.activo === true || isNew;
      }
    }

    UI.openModal('modal-encuestador');
  }

  async function saveEncuestador() {
    const form = document.getElementById('form-encuestador');
    if (!form) return;

    const datos = {
      id_encuestador: form.elements['id_encuestador'].value,
      usuario: form.elements['usuario'].value.trim(),
      nombres: form.elements['nombres'].value.trim(),
      apellidos: form.elements['apellidos'].value.trim(),
      documento: form.elements['documento'].value.trim(),
      telefono: form.elements['telefono'].value.trim(),
      correo: form.elements['correo'].value.trim(),
      zona_asignada: form.elements['zona_asignada'].value,
      rol: form.elements['rol'].value,
      activo: form.elements['activo']?.checked ? 'true' : 'false',
    };

    if (!datos.usuario || !datos.nombres || !datos.apellidos) {
      UI.showToast('Usuario, nombres y apellidos son obligatorios.', 'warning');
      return;
    }

    try {
      const result = await API.saveEncuestador(datos);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.closeModal('modal-encuestador');
      UI.showToast(datos.id_encuestador ? 'Encuestador actualizado.' : 'Encuestador creado.', 'success');
      loadEncuestadores();
    } catch (err) {
      UI.showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  async function deleteEncuestador(id, usuario) {
    const confirmed = await UI.showConfirm('Eliminar encuestador', `¿Eliminar a "${usuario}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    try {
      const result = await API.deleteEncuestador(id);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast('Encuestador eliminado.', 'success');
      loadEncuestadores();
    } catch (err) {
      UI.showToast('Error: ' + err.message, 'error');
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  async function loadAuditoria(page = 1) {
    try {
      const filters = { ..._auditFilters, page };
      const result = await API.getAuditoria(filters);
      if (result.status !== 'ok') throw new Error(result.message);
      _renderAuditoriaTable(result.data || []);
      _renderPagination(result.pagination, page);
    } catch (err) {
      UI.showToast('Error al cargar auditoría: ' + err.message, 'error');
    }
  }

  function _renderAuditoriaTable(rows) {
    const bodies = ['audit-tbody', 'audit-tbody-standalone']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!bodies.length) return;
    if (!rows.length) {
      bodies.forEach(tbody => {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin registros.</td></tr>';
      });
      return;
    }
    const html = rows.map(r => `
      <tr>
        <td>${_escapeHtml(r.id_registro)}</td>
        <td>${_escapeHtml(r.fecha_hora)}</td>
        <td>${_escapeHtml(r.usuario)}</td>
        <td><span class="badge badge--info">${_escapeHtml(r.accion)}</span></td>
        <td>${_escapeHtml(r.detalle || '—')}</td>
        <td>${_escapeHtml(r.ip_aproximada || '—')}</td>
      </tr>`).join('');
    bodies.forEach(tbody => { tbody.innerHTML = html; });
  }

  function _renderPagination(pagination, currentPage) {
    const containers = ['audit-pagination', 'audit-pagination-standalone']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!containers.length || !pagination) return;
    const { total_pages = 1 } = pagination;
    const pages = [];
    for (let p = 1; p <= total_pages; p++) {
      pages.push(`<button class="btn btn-xs ${p === currentPage ? 'btn-primary' : 'btn-outline'}" onclick="AdminModule.loadAuditoria(${p})">${p}</button>`);
    }
    containers.forEach(container => { container.innerHTML = pages.join(' '); });
  }

  function applyAuditFilters() {
    const activeStandalone = document.getElementById('module-auditoria')?.classList.contains('module-panel--active');
    const form = document.getElementById(activeStandalone ? 'audit-filter-form-standalone' : 'audit-filter-form') ||
      document.getElementById('audit-filter-form') ||
      document.getElementById('audit-filter-form-standalone');
    if (!form) return;
    const data = new FormData(form);
    _auditFilters = Object.fromEntries([...data.entries()].filter(([, v]) => v));
    loadAuditoria(1);
  }

  function _escapeHtml(str) {
    return String(str ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _jsString(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  return {
    init,
    loadConfig,
    saveConfigItem,
    loadEncuestadores,
    openNewEncuestador,
    editEncuestador,
    saveEncuestador,
    deleteEncuestador,
    loadAuditoria,
    applyAuditFilters,
  };
})();
