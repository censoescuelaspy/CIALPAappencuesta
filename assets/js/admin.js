/**
 * CIALPA — Relevamiento Escolar
 * admin.js — Configuration, encuestadores CRUD, and audit log (admin only)
 * Version: 2.6.180
 */

const AdminModule = (() => {
  'use strict';

  let _encuestadores = [];
  let _solicitudesRelevamiento = [];
  let _formulariosMec = [];
  let _formulariosMecMeta = {};
  let _auditFilters = {};
  let _encuestadorFiltersBound = false;
  let _formulariosMecFiltersBound = false;

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
    _switchTab('encuestadores');
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
    _bindEncuestadorFilters();
    try {
      const result = await API.getEncuestadores({ incluir_inactivos: true });
      if (result.status !== 'ok') throw new Error(result.message);
      _encuestadores = result.data || [];
      _renderEncuestadoresSummary(_encuestadores);
      _renderEncuestadoresTable(_filterEncuestadores(_encuestadores));
      loadSolicitudesRelevamiento({ silent: true });
      loadFormulariosMec({ silent: true });
    } catch (err) {
      UI.showToast('Error al cargar encuestadores: ' + err.message, 'error');
    }
  }

  async function loadSolicitudesRelevamiento(options = {}) {
    try {
      const result = await API.getIncidencias({ estado: 'pendiente' });
      if (result.status !== 'ok') throw new Error(result.message);
      _solicitudesRelevamiento = (result.data || []).filter(_isSolicitudRelevamiento);
      _renderSolicitudesRelevamiento(_solicitudesRelevamiento);
    } catch (err) {
      _renderSolicitudesRelevamiento([]);
      if (!options.silent) UI.showToast('Error al cargar solicitudes: ' + err.message, 'error');
    }
  }

  function _isSolicitudRelevamiento(row) {
    return String(row?.tipo_incidencia || '').toLowerCase() === 'solicitud de relevamiento';
  }

  function _bindEncuestadorFilters() {
    if (_encuestadorFiltersBound) return;
    const form = document.getElementById('enc-filter-form');
    if (!form) return;
    _encuestadorFiltersBound = true;
    const refresh = () => _renderEncuestadoresTable(_filterEncuestadores(_encuestadores));
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', refresh);
      input.addEventListener('change', refresh);
    });
  }

  function _isActive(row) {
    const value = String(row?.activo ?? '').toLowerCase();
    return row?.activo === true || !['false', '0', 'no', 'inactivo'].includes(value);
  }

  function _filterEncuestadores(rows) {
    const q = String(document.getElementById('enc-filter-search')?.value || '').trim().toLowerCase();
    const estado = String(document.getElementById('enc-filter-estado')?.value || '');
    const rol = String(document.getElementById('enc-filter-rol')?.value || '');
    return (rows || []).filter(row => {
      const active = _isActive(row);
      if (estado === 'activo' && !active) return false;
      if (estado === 'inactivo' && active) return false;
      if (rol && String(row.rol || 'encuestador') !== rol) return false;
      if (!q) return true;
      return [
        row.id_encuestador,
        row.usuario,
        row.nombres,
        row.apellidos,
        row.documento,
        row.telefono,
        row.correo,
        row.zona_asignada,
        row.rol,
      ].some(value => String(value || '').toLowerCase().includes(q));
    });
  }

  function _renderEncuestadoresSummary(rows) {
    const total = rows.length;
    const activos = rows.filter(_isActive).length;
    const inactivos = total - activos;
    const superiores = rows.filter(row => ['supervisor', 'admin'].includes(String(row.rol || '').toLowerCase())).length;
    const values = {
      'enc-total': total,
      'enc-activos': activos,
      'enc-inactivos': inactivos,
      'enc-supervisores': superiores,
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function _renderEncuestadoresTable(rows) {
    const bodies = ['enc-tbody', 'enc-tbody-admin']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!bodies.length) return;

    if (!rows.length) {
      bodies.forEach(tbody => {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">No hay encuestadores para los filtros seleccionados.</td></tr>';
      });
      return;
    }

    const html = rows.map(r => `
      <tr>
        <td>${_escapeHtml(r.id_encuestador)}</td>
        <td>${_escapeHtml(r.usuario)}</td>
        <td>${_escapeHtml(`${r.nombres || ''} ${r.apellidos || ''}`.trim())}</td>
        <td><span class="badge badge--info">${_escapeHtml(_roleLabel(r.rol || 'encuestador'))}</span></td>
        <td>${_escapeHtml(r.documento || '—')}</td>
        <td>${_escapeHtml(r.telefono || '—')}</td>
        <td>${_escapeHtml(r.correo || '—')}</td>
        <td>${_escapeHtml(r.zona_asignada || '—')}</td>
        <td>
          <span class="badge ${_isActive(r) ? 'badge--success' : 'badge--danger'}">
            ${_isActive(r) ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>${_escapeHtml(r.fecha_alta || '---')}</td>
        <td class="enc-admin-actions">
          <button class="btn btn-xs btn-outline" onclick='AdminModule.editEncuestador(${_jsString(r.id_encuestador)})'>Editar</button>
          ${_isActive(r)
            ? `<button class="btn btn-xs btn-danger" onclick='AdminModule.deleteEncuestador(${_jsString(r.id_encuestador)}, ${_jsString(r.usuario)})'>Quitar</button>`
            : `<button class="btn btn-xs btn-success" onclick='AdminModule.setEncuestadorActivo(${_jsString(r.id_encuestador)}, true)'>Reactivar</button>`}
        </td>
      </tr>`).join('');
    bodies.forEach(tbody => { tbody.innerHTML = html; });
  }

  function _renderSolicitudesRelevamiento(rows) {
    const containers = ['solicitudes-relevamiento-admin', 'solicitudes-relevamiento-config']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!containers.length) return;
    const pendingCount = rows.length;
    const body = pendingCount ? `
      <div class="table-wrapper" style="margin-top:.75rem;">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Escuela</th><th>Solicitante</th><th>Correo</th><th>Detalle</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${rows.slice(0, 12).map(row => {
              const id = _jsString(row.id_incidencia);
              const school = [row.codigo_local || row.id_escuela || '', row.nombre_escuela || ''].filter(Boolean).join(' - ');
              const emailState = String(row.notificacion_email_estado || '').toLowerCase();
              const emailError = row.notificacion_email_error || '';
              const emailClass = emailState === 'enviado' ? 'badge--success' : (emailState === 'error' ? 'badge--danger' : 'badge--warning');
              const emailLabel = emailState === 'enviado' ? 'Enviado' : (emailState === 'error' ? 'Error' : 'Pendiente');
              return `
                <tr>
                  <td>${_escapeHtml(row.fecha_hora || '---')}</td>
                  <td>${_escapeHtml(school || 'Sin escuela')}</td>
                  <td>${_escapeHtml(row.usuario || '---')}</td>
                  <td>
                    <span class="badge ${emailClass}" title="${_escapeHtml(emailError)}">${emailLabel}</span>
                  </td>
                  <td>${_escapeHtml(row.descripcion || '')}</td>
                  <td class="enc-admin-actions">
                    <button class="btn btn-xs btn-success" onclick='AdminModule.aprobarSolicitudRelevamiento(${id})'>Aprobar</button>
                    <button class="btn btn-xs btn-outline" onclick='AdminModule.openSolicitudAssignment(${id})'>Asignar manual</button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<p class="text-muted" style="margin:.75rem 0 0;">No hay solicitudes pendientes de relevamiento.</p>';
    const html = `
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <strong>Solicitudes de relevamiento pendientes</strong>
          <p class="text-muted" style="margin:.35rem 0 0;">Cuando un usuario pide relevar una escuela sin asignacion, aparece aqui para aprobarla o asignarla manualmente.</p>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <span class="badge ${pendingCount ? 'badge--warning' : 'badge--success'}">${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}</span>
          <button class="btn btn-outline btn-sm" onclick="AdminModule.loadSolicitudesRelevamiento()">Actualizar</button>
        </div>
      </div>
      ${body}`;
    containers.forEach(container => { container.innerHTML = html; });
  }

  async function loadFormulariosMec(options = {}) {
    const panel = document.getElementById('formularios-mec-admin-panel');
    if (!panel || !Auth.canAccess('admin')) return;
    _bindFormulariosMecFilters();
    try {
      const filters = _readFormulariosMecFilters();
      const result = await API.listarFormulariosMec({ ...filters, limit: 500 });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo cargar el listado.');
      _formulariosMec = result.data || [];
      _formulariosMecMeta = result.meta || {};
      _populateFormulariosMecFilterOptions(_formulariosMecMeta);
      _renderFormulariosMecSummary(_formulariosMec, _formulariosMecMeta);
      _renderFormulariosMecTable(_formulariosMec);
    } catch (err) {
      _renderFormulariosMecTable([]);
      if (!options.silent) UI.showToast('Error al cargar formularios MEC: ' + err.message, 'error', 8000);
    }
  }

  function _bindFormulariosMecFilters() {
    if (_formulariosMecFiltersBound) return;
    const form = document.getElementById('formularios-mec-filter-form');
    if (!form) return;
    _formulariosMecFiltersBound = true;
    let timer = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      loadFormulariosMec();
    });
    form.querySelectorAll('select').forEach(input => {
      input.addEventListener('change', () => loadFormulariosMec({ silent: true }));
    });
    const search = document.getElementById('formularios-mec-filter-search');
    if (search) {
      search.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => loadFormulariosMec({ silent: true }), 180);
      });
    }
  }

  function _readFormulariosMecFilters() {
    return {
      usuario: document.getElementById('formularios-mec-filter-usuario')?.value || '',
      estado: document.getElementById('formularios-mec-filter-estado')?.value || '',
      q: document.getElementById('formularios-mec-filter-search')?.value || '',
    };
  }

  function _populateFormulariosMecFilterOptions(meta = {}) {
    _populateSelect('formularios-mec-filter-usuario', meta.usuarios || [], 'Todos los censistas');
    _populateSelect('formularios-mec-filter-estado', meta.estados || [], 'Todos los estados');
  }

  function _populateSelect(id, options, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = String(select.value || '');
    const values = [...new Set((options || []).map(value => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    select.innerHTML = [
      `<option value="">${_escapeHtml(placeholder)}</option>`,
      ...values.map(value => `<option value="${_escapeHtml(value)}">${_escapeHtml(value)}</option>`),
    ].join('');
    select.value = values.includes(current) ? current : '';
  }

  function _renderFormulariosMecSummary(rows, meta = {}) {
    const summary = meta.resumen_por_usuario || [];
    const totalEscuelas = new Set((rows || []).map(row => row.codigo_local || row.id_escuela).filter(Boolean)).size;
    const totals = (rows || []).reduce((acc, row) => {
      acc.elementos += Number(row.total_elementos || 0);
      acc.evidencias += Number(row.evidencias || 0);
      acc.finalizados += _isFinalForm(row) ? 1 : 0;
      return acc;
    }, { elementos: 0, evidencias: 0, finalizados: 0 });
    const values = {
      'formularios-mec-total': meta.total ?? rows.length,
      'formularios-mec-censistas': summary.length,
      'formularios-mec-escuelas': totalEscuelas,
      'formularios-mec-finalizados': totals.finalizados,
      'formularios-mec-elementos': totals.elementos,
      'formularios-mec-evidencias': totals.evidencias,
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function _renderFormulariosMecTable(rows) {
    const tbody = document.getElementById('formularios-mec-tbody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">No hay formularios MEC para los filtros seleccionados.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(row => {
      const id = row.id_escuela || row.codigo_local || '';
      return `
        <tr>
          <td>${_escapeHtml(row.usuario || '---')}</td>
          <td>${_escapeHtml(row.actualizado_en || row.fecha_guardado || '---')}</td>
          <td>${_escapeHtml([row.codigo_local, row.nombre_escuela].filter(Boolean).join(' - ') || row.id_escuela || '---')}</td>
          <td>${_escapeHtml([row.departamento, row.distrito].filter(Boolean).join(' / ') || '---')}</td>
          <td><span class="badge ${_isFinalForm(row) ? 'badge--success' : 'badge--warning'}">${_escapeHtml(row.estado_borrador || row.estado_operativo || 'borrador')}</span></td>
          <td>${_escapeHtml(row.bloques ?? 0)}</td>
          <td>${_escapeHtml(row.aulas ?? 0)}</td>
          <td>${_escapeHtml(row.sanitarios ?? 0)}</td>
          <td>${_escapeHtml(row.exteriores ?? 0)}</td>
          <td>${_escapeHtml(row.evidencias ?? 0)}</td>
          <td>${_escapeHtml(row.tiempo_escuela_min ? `${row.tiempo_escuela_min} min` : '---')}</td>
          <td><button class="btn btn-xs btn-outline" onclick='AdminModule.openFormularioMec(${_jsString(id)})'>Abrir</button></td>
        </tr>`;
    }).join('');
  }

  function _isFinalForm(row) {
    const text = String(row?.estado_operativo || row?.estado_borrador || '').toLowerCase();
    return text.includes('final') || text.includes('complet') || text.includes('cerr');
  }

  async function openFormularioMec(id) {
    if (!id) return;
    try {
      const result = await API.getEscuela(id, { includeDraft: true });
      if (result.status !== 'ok' || !result.data) throw new Error(result.message || 'Escuela no encontrada.');
      const school = result.data;
      if (typeof SurveyModule !== 'undefined' && SurveyModule.setCurrentEscuela) SurveyModule.setCurrentEscuela(school, { skipAssignmentCheck: true });
      if (typeof AppController !== 'undefined' && AppController.showModule) await Promise.resolve(AppController.showModule('registro'));
      if (typeof MecFormModule !== 'undefined' && MecFormModule.setSelectedSchool) {
        MecFormModule.setSelectedSchool(school, { render: false, force: true });
      }
      if (typeof GuidedRegisterModule !== 'undefined' && GuidedRegisterModule.init) GuidedRegisterModule.init();
      UI.showToast(`Formulario abierto: ${school.nombre || school.codigo_local || id}.`, 'success', 4500);
    } catch (err) {
      UI.showToast('No se pudo abrir el formulario MEC: ' + err.message, 'error', 8000);
    }
  }

  function _roleLabel(rol) {
    return { admin: 'Admin', supervisor: 'Supervisor', encuestador: 'Encuestador' }[rol] || rol || 'Encuestador';
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
      if (form.elements['password']) form.elements['password'].value = '';
      if (form.elements['activo']) {
        form.elements['activo'].checked = enc?.activo === 'true' || enc?.activo === true || isNew;
      }
      UI.refreshButtonChoices(form);
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
      password: form.elements['password']?.value || '',
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
    const confirmed = await UI.showConfirm('Quitar encuestador', `¿Quitar a "${usuario}" de la operacion activa? La cuenta queda inactiva y se puede reactivar luego.`);
    if (!confirmed) return;
    try {
      const result = await API.deleteEncuestador(id);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast('Encuestador inactivado.', 'success');
      loadEncuestadores();
    } catch (err) {
      UI.showToast('Error: ' + err.message, 'error');
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  async function setEncuestadorActivo(id, activo) {
    const enc = _encuestadores.find(e => e.id_encuestador === id);
    if (!enc) return;
    try {
      const result = await API.saveEncuestador({ ...enc, activo: activo ? 'true' : 'false', password: '' });
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast(activo ? 'Encuestador reactivado.' : 'Encuestador inactivado.', 'success');
      loadEncuestadores();
    } catch (err) {
      UI.showToast('Error al actualizar estado: ' + err.message, 'error');
    }
  }

  async function aprobarSolicitudRelevamiento(id) {
    const solicitud = _solicitudesRelevamiento.find(row => row.id_incidencia === id);
    const schoolLabel = solicitud
      ? [solicitud.codigo_local || solicitud.id_escuela || '', solicitud.nombre_escuela || ''].filter(Boolean).join(' - ')
      : 'la escuela solicitada';
    const userLabel = solicitud?.usuario || 'el solicitante';
    const confirmed = await UI.showConfirm(
      'Aprobar solicitud',
      `Asignar ${schoolLabel} a ${userLabel} y marcar la solicitud como resuelta?`
    );
    if (!confirmed) return;
    try {
      const result = await API.aprobarSolicitudRelevamiento({ id_incidencia: id });
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast(result.message || 'Solicitud aprobada y escuela asignada.', 'success', 6500);
      loadSolicitudesRelevamiento();
      try {
        if (typeof AppController !== 'undefined' && AppController.refreshAdminAlerts) AppController.refreshAdminAlerts();
      } catch { /* non-fatal */ }
      try {
        if (typeof IncidenciasModule !== 'undefined' && IncidenciasModule.loadList) IncidenciasModule.loadList();
      } catch { /* non-fatal */ }
    } catch (err) {
      UI.showToast('Error al aprobar solicitud: ' + err.message, 'error', 7000);
    }
  }

  function openSolicitudAssignment(id) {
    const solicitud = _solicitudesRelevamiento.find(row => row.id_incidencia === id);
    if (typeof AppController !== 'undefined') {
      AppController.showModule('planificacion');
      setTimeout(() => {
        try {
          if (typeof PlanningModule !== 'undefined' && PlanningModule.switchTab) PlanningModule.switchTab('asignaciones');
        } catch { /* non-fatal */ }
      }, 150);
    }
    if (solicitud) {
      UI.showToast(`Solicitud de ${solicitud.usuario || 'usuario'} para ${solicitud.codigo_local || solicitud.id_escuela || 'escuela'}: asignela en Distribucion de escuelas.`, 'info', 9000);
    }
  }

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
    loadSolicitudesRelevamiento,
    loadFormulariosMec,
    openNewEncuestador,
    editEncuestador,
    saveEncuestador,
    deleteEncuestador,
    setEncuestadorActivo,
    aprobarSolicitudRelevamiento,
    openSolicitudAssignment,
    openFormularioMec,
    loadAuditoria,
    applyAuditFilters,
  };
})();
