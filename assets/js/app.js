/**
 * CIALPA — Relevamiento Escolar
 * app.js — Main application controller (router, init, global state)
 * Version: 2.6.134
 */

// ── UI utilities ──────────────────────────────────────────────────────────────

const UI = (() => {
  'use strict';

  let _loadingEl = null;
  let _toastContainer = null;

  function init() {
    _loadingEl = document.getElementById('global-loading');
    _toastContainer = document.getElementById('toast-container');
    if (document.body.dataset.choiceButtonsBound !== 'true') {
      document.body.dataset.choiceButtonsBound = 'true';
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-choice-target][data-choice-value]');
        if (!button || button.disabled) return;
        setButtonChoice(button.dataset.choiceTarget, button.dataset.choiceValue);
      });
    }
    requestAnimationFrame(() => refreshButtonChoices(document));
  }

  function setLoading(visible, message = 'Cargando...') {
    if (!_loadingEl) return;
    _loadingEl.style.display = visible ? 'flex' : 'none';
    const msg = _loadingEl.querySelector('.loading-message');
    if (msg) msg.textContent = message;
  }

  function showToast(message, type = 'info', duration = 4000) {
    if (!_toastContainer) return;
    const normalizedType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
    const maxVisible = normalizedType === 'success' ? 2 : 3;
    const existingToasts = [..._toastContainer.querySelectorAll('.toast')];
    existingToasts
      .slice(0, Math.max(0, existingToasts.length - (maxVisible - 1)))
      .forEach(item => item.remove());
    const requestedDuration = Number(duration);
    const timeout = Number.isFinite(requestedDuration)
      ? requestedDuration
      : (normalizedType === 'success' ? 4200 : 4000);
    const toast = document.createElement('div');
    toast.className = `toast toast--${normalizedType}`;
    const icon = document.createElement('span');
    icon.className = 'toast__icon';
    icon.textContent = _toastIcon(normalizedType);
    const text = document.createElement('span');
    text.className = 'toast__message';
    text.textContent = String(message || '');
    const close = document.createElement('button');
    close.className = 'toast__close';
    close.type = 'button';
    close.textContent = '×';
    close.addEventListener('click', () => toast.remove());
    toast.append(icon, text, close);
    _toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    if (timeout > 0) {
      setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300);
      }, timeout);
    }
    return toast;
  }

  function _toastIcon(type) {
    return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] || 'ℹ';
  }

  function showAlert(title, message, type = 'info') {
    return new Promise(resolve => {
      const modal = _createSimpleModal(title, `<p>${_escapeHtml(message)}</p>`, type, [
        { label: 'Aceptar', class: 'btn-primary', value: true },
      ], resolve);
      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('modal--visible'));
    });
  }

  function showHtmlAlert(title, html, type = 'info') {
    return new Promise(resolve => {
      const modal = _createSimpleModal(title, String(html || ''), type, [
        { label: 'Aceptar', class: 'btn-primary', value: true },
      ], resolve);
      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('modal--visible'));
    });
  }

  function showConfirm(title, message, type = 'question') {
    return new Promise(resolve => {
      const modal = _createSimpleModal(title, `<p>${_escapeHtml(message)}</p>`, type, [
        { label: 'Cancelar', class: 'btn-outline', value: false },
        { label: 'Confirmar', class: 'btn-primary', value: true },
      ], resolve);
      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('modal--visible'));
    });
  }

  function showPrompt(label, defaultValue = '') {
    return new Promise(resolve => {
      const id = 'prompt-input-' + Date.now();
      const modal = _createSimpleModal('Ingresá un valor', `
        <label for="${id}">${_escapeHtml(label)}</label>
        <input id="${id}" type="text" class="form-control mt-1" value="${_escapeHtml(defaultValue)}" />
      `, 'question', [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        {
          label: 'Aceptar', class: 'btn-primary', value: null,
          onClick: () => document.getElementById(id)?.value ?? '',
        },
      ], resolve);
      document.body.appendChild(modal);
      requestAnimationFrame(() => {
        modal.classList.add('modal--visible');
        document.getElementById(id)?.focus();
      });
    });
  }

  function _createSimpleModal(title, content, type, buttons, resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal modal--dialog';
    modal.innerHTML = `
        <div class="modal__overlay"></div>
        <div class="modal__panel modal__panel--dialog">
          <div class="modal__header">
          <h3>${_escapeHtml(title)}</h3>
        </div>
        <div class="modal__body">${content}</div>
        <div class="modal__footer">
          ${buttons.map((b, i) => `<button class="btn ${_escapeHtml(b.class)}" data-btn-index="${i}">${_escapeHtml(b.label)}</button>`).join('')}
        </div>
      </div>`;

    buttons.forEach((btn, i) => {
      modal.querySelector(`[data-btn-index="${i}"]`).addEventListener('click', () => {
        const value = btn.onClick ? btn.onClick() : btn.value;
        modal.classList.remove('modal--visible');
        setTimeout(() => modal.remove(), 300);
        resolve(value);
      });
    });

    return modal;
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('modal--visible');
      modal.style.display = 'flex';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('modal--visible');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
  }

  function setButtonChoice(target, value) {
    const input = _choiceInput(target);
    if (!input || input.disabled) return;
    input.value = value || '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    refreshButtonChoices(document);
  }

  function refreshButtonChoices(root = document) {
    const scope = root?.querySelectorAll ? root : document;
    const buttons = [
      ...(scope.matches?.('[data-choice-target][data-choice-value]') ? [scope] : []),
      ...scope.querySelectorAll('[data-choice-target][data-choice-value]'),
    ];
    buttons.forEach(button => {
      const input = _choiceInput(button.dataset.choiceTarget);
      const active = Boolean(input) && String(input.value || '') === String(button.dataset.choiceValue || '');
      button.classList.toggle('choice-button--active', active);
      button.setAttribute('aria-pressed', String(active));
      if (input) button.disabled = Boolean(input.disabled);
    });
  }

  function _choiceInput(target) {
    if (!target) return null;
    return document.getElementById(target) || document.querySelector(`[name="${String(target).replace(/"/g, '\\"')}"]`);
  }

  function _escapeHtml(str) {
    return String(str ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  return {
    init,
    setLoading,
    showToast,
    showAlert,
    showHtmlAlert,
    showConfirm,
    showPrompt,
    openModal,
    closeModal,
    setButtonChoice,
    refreshButtonChoices,
  };
})();

function _escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

// ── Incidencias inline module ─────────────────────────────────────────────────

const IncidenciasModule = (() => {
  'use strict';

  async function openNew(id_escuela, descripcionPrevia = '') {
    const modal = document.getElementById('modal-incidencia');
    if (!modal) return;

    const form = modal.querySelector('#form-incidencia');
    if (form) {
      form.elements['id_escuela'].value = id_escuela;
      form.elements['tipo_incidencia'].value = '';
      form.elements['descripcion'].value = descripcionPrevia;
      form.elements['prioridad'].value = 'media';
      UI.refreshButtonChoices(form);
    }

    UI.openModal('modal-incidencia');
  }

  async function save() {
    const form = document.getElementById('form-incidencia');
    if (!form) return;

    const datos = {
      id_escuela: form.elements['id_escuela'].value,
      tipo_incidencia: form.elements['tipo_incidencia'].value,
      descripcion: form.elements['descripcion'].value.trim(),
      prioridad: form.elements['prioridad'].value,
    };

    if (!datos.tipo_incidencia || !datos.descripcion) {
      UI.showToast('Tipo y descripción son obligatorios.', 'warning');
      return;
    }

    try {
      const result = await API.saveIncidencia(datos);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.closeModal('modal-incidencia');
      UI.showToast('Incidencia registrada correctamente.', 'success');
    } catch (err) {
      UI.showToast('Error al guardar incidencia: ' + err.message, 'error');
    }
  }

  async function loadList() {
    try {
      const result = await API.getIncidencias();
      if (result.status !== 'ok') throw new Error(result.message);
      _renderList(result.data || []);
    } catch (err) {
      UI.showToast('Error al cargar incidencias: ' + err.message, 'error');
    }
  }

  function _renderList(items) {
    const tbody = document.getElementById('incidencias-tbody');
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Sin incidencias registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(i => `
      <tr>
        <td>${_escapeHtml(i.fecha_hora || '—')}</td>
        <td>${_escapeHtml(i.nombre_escuela || i.id_escuela)}</td>
        <td>${_escapeHtml(i.usuario)}</td>
        <td>${_escapeHtml(i.tipo_incidencia)}</td>
        <td><span class="badge badge--${_safeClass(i.prioridad || 'media')}">${_escapeHtml(i.prioridad || '—')}</span></td>
        <td><span class="badge badge--${i.estado_resolucion === 'resuelto' ? 'success' : 'danger'}">${_escapeHtml(i.estado_resolucion || 'pendiente')}</span></td>
        <td>
          ${Auth.canAccess('supervisor') && i.estado_resolucion !== 'resuelto' && String(i.tipo_incidencia || '').toLowerCase() === 'solicitud de relevamiento'
        ? `<button class="btn btn-xs btn-success" onclick='AdminModule.aprobarSolicitudRelevamiento(${_jsString(i.id_incidencia)})'>Aprobar</button>`
        : ''}
          ${Auth.canAccess('supervisor') && i.estado_resolucion !== 'resuelto'
        ? `<button class="btn btn-xs btn-success" onclick='IncidenciasModule.resolver(${_jsString(i.id_incidencia)})'>Resolver</button>`
        : ''}
        </td>
      </tr>`).join('');
  }

  async function resolver(id) {
    const resolucion = await UI.showPrompt('Descripción de la resolución:');
    if (resolucion === null) return;
    try {
      const result = await API.resolverIncidencia(id, resolucion);
      if (result.status !== 'ok') throw new Error(result.message);
      UI.showToast('Incidencia resuelta.', 'success');
      loadList();
    } catch (err) {
      UI.showToast('Error: ' + err.message, 'error');
    }
  }

  function _safeClass(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '') || 'media';
  }

  function _jsString(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  return { openNew, save, loadList, resolver };
})();

// ── App Controller ────────────────────────────────────────────────────────────

const AppController = (() => {
  'use strict';

  const MODULES = {
    inicio: { label: 'Inicio', icon: '🏠', minRole: 'encuestador' },
    mapa: { label: 'Mapa', icon: '🗺️', minRole: 'encuestador' },
    registro: { label: 'Registro guiado', icon: '>>', minRole: 'encuestador' },
    encuesta: { label: 'Migrar RUE-MEC', icon: '⇄', minRole: 'encuestador' },
    mec: { label: 'Cuestionario MEC', icon: '📝', minRole: 'encuestador' },
    plano: { label: 'Plano escuela', icon: '▦', minRole: 'encuestador' },
    arquitectura: { label: 'Metodologia y datos', icon: 'MET', minRole: 'encuestador' },
    encuestadores: { label: 'Encuestadores', icon: 'ENC', minRole: 'admin' },
    manual: { label: 'Manual', icon: '📖', minRole: 'encuestador' },
    incidencias: { label: 'Solicitudes', icon: 'SOL', minRole: 'encuestador' },
    jornada: { label: 'Mi Jornada', icon: '📅', minRole: 'encuestador' },
    estadisticas: { label: 'Resultados globales', icon: '📊', minRole: 'supervisor' },
    infraestructura: { label: 'Infraestructura MEC', icon: 'MEC', minRole: 'supervisor' },
    'cuestionario-inicial': { label: 'Cuestionario inicial', icon: 'R01', minRole: 'supervisor' },
    ubicacion: { label: 'Ubicación real', icon: 'GPS', minRole: 'supervisor' },
    planificacion: { label: 'Planificación', icon: '⏱', minRole: 'supervisor' },
    configuracion: { label: 'Configuración', icon: '⚙️', minRole: 'admin' },
    auditoria: { label: 'Auditoría', icon: '🔍', minRole: 'admin' },
  };

  const START_MODULE = 'inicio';
  let _currentModule = null;
  let _mapInitialized = false;
  let _sidebarHideTimer = null;
  let _sidebarPeekTimer = null;
  let _deferredInstallPrompt = null;
  let _swRegistration = null;
  let _swMessagesBound = false;
  let _launchHomeResetBound = false;
  let _mapRosterWarningShown = false;
  let _adminAlertsTimer = null;
  let _adminAlertsInFlight = false;
  let _adminAlertsSeenIds = new Set();
  let _adminAlertsLastSummaryAt = 0;
  const ADMIN_ALERTS_POLL_MS = 60000;
  const ADMIN_ALERTS_SUMMARY_MS = 15 * 60 * 1000;
  const _lazyAssetPromises = new Map();

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    UI.init();
    if (typeof CialpaLocalStore !== 'undefined') CialpaLocalStore.init();
    ManualModule.renderModal();
    _applyVersionLabels();
    _bindPwaEvents();
    _bindLaunchHomeReset();
    _registerServiceWorker();

    if (Auth.resumeSession()) {
      showApp();
    } else {
      showLoginScreen();
    }
  }

  // ── Login screen ───────────────────────────────────────────────────────────

  function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';

    // Show demo notice when GAS is not configured
    const demoNotice = document.getElementById('demo-notice');
    if (demoNotice) {
      const isDemo = !APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL';
      demoNotice.style.display = isDemo ? 'block' : 'none';
    }

    _bindAuthForms();
    _showAuthPanel('login');
  }

  // ── Main app shell ─────────────────────────────────────────────────────────

  function _bindAuthForms() {
    const screen = document.getElementById('login-screen');
    if (!screen || screen.dataset.authBound === 'true') return;
    screen.dataset.authBound = 'true';

    screen.querySelectorAll('[data-auth-panel]').forEach(button => {
      button.addEventListener('click', () => _showAuthPanel(button.dataset.authPanel || 'login'));
    });

    document.getElementById('login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      _setAuthMessage('');
      const usuario = document.getElementById('login-usuario')?.value.trim() || '';
      const password = document.getElementById('login-password')?.value || '';
      try {
        await Auth.login(usuario, password);
        showApp();
      } catch (err) {
        _setAuthMessage(err.message);
      }
    });

    document.getElementById('register-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      _setAuthMessage('');
      const datos = _formObject(e.currentTarget);
      if (datos.password !== datos.password_confirm) {
        _setAuthMessage('Las contrasenas no coinciden.');
        return;
      }
      try {
        await Auth.registerUser(datos);
        await Auth.login(datos.usuario, datos.password);
        UI.showToast('Usuario creado. El administrador podra asignarle escuelas.', 'success', 6500);
        showApp();
      } catch (err) {
        _setAuthMessage(err.message);
      }
    });

    document.getElementById('recover-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      _setAuthMessage('');
      const datos = _formObject(e.currentTarget);
      if (datos.password !== datos.password_confirm) {
        _setAuthMessage('Las contrasenas no coinciden.');
        return;
      }
      try {
        await Auth.recoverPassword(datos);
        _showAuthPanel('login');
        const userInput = document.getElementById('login-usuario');
        if (userInput) userInput.value = datos.usuario || '';
        _setAuthMessage('Contrasena actualizada. Ya puede iniciar sesion.', 'success');
      } catch (err) {
        _setAuthMessage(err.message);
      }
    });
  }

  function _showAuthPanel(panel = 'login') {
    const target = ['login', 'register', 'recover'].includes(panel) ? panel : 'login';
    document.querySelectorAll('[data-auth-panel]').forEach(button => {
      const active = button.dataset.authPanel === target;
      button.classList.toggle('auth-tab--active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-auth-form]').forEach(form => {
      form.hidden = form.dataset.authForm !== target;
    });
    _setAuthMessage('');
  }

  function _setAuthMessage(message, type = 'error') {
    const el = document.getElementById('login-error');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('login-error--success', type === 'success');
  }

  function _formObject(form) {
    return Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value || '').trim()]));
  }

  function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';
    try {
      const sidebar = document.getElementById('sidebar');
      document.body.classList.add('sidebar-auto-hidden');
      document.body.classList.remove('sidebar-peek');
      sidebar?.classList.remove('sidebar--open');
      const toggleBtn = document.getElementById('sidebar-toggle');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Mostrar menu');
      }

      _buildSidebar();
      _renderUserBar();
      Auth.applyRoleVisibility();
      _bindGlobalEvents();
      _startAdminAlerts();
    } catch (err) {
      console.error('Error inicializando la vista principal:', err);
      UI.showToast?.('Se restauro la vista Inicio despues de actualizar la app.', 'warning', 6000);
    } finally {
      const requestedModule = _requestedModuleFromUrl();
      if (requestedModule && MODULES[requestedModule] && Auth.canAccess(MODULES[requestedModule].minRole)) {
        _clearActiveSchoolContext();
        showModule(requestedModule);
        _clearRequestedModuleFromUrl();
      } else {
        resetToHome({ clearSelection: true });
      }
    }
  }

  function _bindLaunchHomeReset() {
    if (_launchHomeResetBound) return;
    _launchHomeResetBound = true;
    window.addEventListener('pageshow', event => {
      if (!event.persisted || !Auth.isLoggedIn()) return;
      const shell = document.getElementById('app-shell');
      if (!shell || shell.style.display === 'none') return;
      resetToHome({ clearSelection: true });
    });
  }

  function _clearActiveSchoolContext() {
    try {
      if (typeof SurveyModule !== 'undefined' && typeof SurveyModule.clearSelection === 'function') {
        SurveyModule.clearSelection({ render: false, clearMecContext: false });
      }
      if (typeof MapModule !== 'undefined' && typeof MapModule.clearSelection === 'function') {
        MapModule.clearSelection({ render: false });
      }
      if (typeof MecFormModule !== 'undefined' && typeof MecFormModule.clearActiveSchoolContext === 'function') {
        MecFormModule.clearActiveSchoolContext({ render: false });
      }
    } catch (err) {
      console.warn('No se pudo limpiar la escuela activa al iniciar:', err);
    }
  }

  function resetToHome(options = {}) {
    if (options.clearSelection) _clearActiveSchoolContext();
    try {
      showModule(START_MODULE);
    } catch (err) {
      console.error('No se pudo abrir Inicio por el ruteador:', err);
      _ensureVisibleModule(START_MODULE, true);
    }
    requestAnimationFrame(() => {
      _ensureVisibleModule(START_MODULE, true);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      setTimeout(() => _ensureVisibleModule(START_MODULE), 120);
    });
  }

  function _buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const primaryModules = ['inicio', 'arquitectura', 'mapa', 'registro', 'jornada', 'encuestadores', 'incidencias', 'cuestionario-inicial', 'planificacion', 'ubicacion', 'configuracion', 'estadisticas', 'infraestructura'];
    nav.innerHTML = primaryModules
      .filter(id => MODULES[id] && Auth.canAccess(MODULES[id].minRole))
      .map(id => [id, MODULES[id]])
      .map(([id, mod]) => `
        <li class="nav-item" data-module="${id}">
          <a href="#" onclick="AppController.showModule('${id}'); return false;">
            <span class="nav-icon">${mod.icon}</span>
            <span class="nav-label">${mod.label}</span>
          </a>
        </li>`).join('');

    if (APP_CONFIG.SPREADSHEET_URL) {
      nav.insertAdjacentHTML('beforeend', `
        <li class="nav-item nav-item--external">
          <a href="#" onclick="AppController.openWorkbook(); return false;" title="Abrir Google Sheets: mec_borradores, escuelas, evidencias y entregas finales">
            <span class="nav-icon">LB</span>
            <span class="nav-label">Datos en Sheets</span>
          </a>
        </li>`);
    }
  }

  function _requestedModuleFromUrl() {
    try {
      return new URL(window.location.href).searchParams.get('module') || '';
    } catch {
      return '';
    }
  }

  function _clearRequestedModuleFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('module')) return;
      url.searchParams.delete('module');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // History API may be unavailable in restricted modes.
    }
  }

  function _renderUserBar() {
    const user = Auth.getUserInfo();
    if (!user) return;
    const bar = document.getElementById('user-bar');
    if (bar) {
      bar.innerHTML = `
        <span class="app-edition-badge">${_escapeHtml(APP_CONFIG.EDITION_LABEL || `v${APP_CONFIG.VERSION}`)}</span>
        <button id="install-app-btn-header" class="btn btn-sm btn-primary" onclick="AppController.installApp()">Instalar</button>
        ${Auth.canAccess('admin') ? '<button id="admin-alerts-btn" class="btn btn-sm btn-outline" onclick="AppController.enableAdminAlerts()" title="Activar notificaciones de solicitudes">Alertas<span id="admin-alert-count" class="badge badge--warning" style="margin-left:.35rem;display:none;">0</span></button>' : ''}
        <button class="btn btn-sm btn-outline" onclick="AppController.updateApp()">Actualizar</button>
        <span class="user-bar__name">${_escapeHtml(`${user.nombres || ''} ${user.apellidos || ''}`.trim())}</span>
        <span class="user-bar__role badge badge--role">${_escapeHtml(_rolLabel(user.rol))}</span>`;
    }
    _refreshInstallButtons();
  }

  function _rolLabel(rol) {
    return { admin: 'Admin', supervisor: 'Supervisor', encuestador: 'Encuestador' }[rol] || rol;
  }

  function _startAdminAlerts() {
    _stopAdminAlerts();
    if (!Auth.isLoggedIn() || !Auth.canAccess('admin')) {
      _setAdminAlertCount(0);
      return;
    }
    _loadAdminAlertSeenIds();
    _checkAdminAlerts({ forceSummary: true });
    _adminAlertsTimer = setInterval(() => _checkAdminAlerts(), ADMIN_ALERTS_POLL_MS);
  }

  function _stopAdminAlerts() {
    if (_adminAlertsTimer) {
      clearInterval(_adminAlertsTimer);
      _adminAlertsTimer = null;
    }
  }

  async function _checkAdminAlerts(options = {}) {
    if (_adminAlertsInFlight || !Auth.isLoggedIn() || !Auth.canAccess('admin')) return;
    _adminAlertsInFlight = true;
    try {
      const result = await API.getIncidencias({ estado: 'pendiente' });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudieron cargar solicitudes.');
      const solicitudes = (result.data || []).filter(_isSolicitudRelevamiento);
      _setAdminAlertCount(solicitudes.length);
      const newItems = solicitudes.filter(item => !_adminAlertsSeenIds.has(_adminAlertId(item)));
      const shouldSummarize = solicitudes.length && options.forceSummary && Date.now() - _adminAlertsLastSummaryAt > ADMIN_ALERTS_SUMMARY_MS;
      if (newItems.length) {
        _notifyAdminSolicitudes(newItems, solicitudes.length);
        newItems.forEach(item => _adminAlertsSeenIds.add(_adminAlertId(item)));
        _saveAdminAlertSeenIds();
      } else if (shouldSummarize) {
        UI.showToast(`Hay ${solicitudes.length} solicitud${solicitudes.length === 1 ? '' : 'es'} de relevamiento pendiente${solicitudes.length === 1 ? '' : 's'}.`, 'warning', 0);
        _adminAlertsLastSummaryAt = Date.now();
      }
    } catch (err) {
      console.warn('No se pudieron revisar solicitudes de admin:', err);
    } finally {
      _adminAlertsInFlight = false;
    }
  }

  function _isSolicitudRelevamiento(row) {
    return String(row?.tipo_incidencia || '').toLowerCase() === 'solicitud de relevamiento';
  }

  function _adminAlertId(item) {
    return String(item?.id_incidencia || `${item?.id_escuela || ''}:${item?.codigo_local || ''}:${item?.usuario || ''}:${item?.fecha_hora || ''}`);
  }

  function _notifyAdminSolicitudes(items, totalPending) {
    const count = items.length;
    const first = items[0] || {};
    const school = [first.codigo_local || first.id_escuela || '', first.nombre_escuela || ''].filter(Boolean).join(' - ') || 'escuela sin asignacion';
    const title = count === 1 ? 'Nueva solicitud de relevamiento' : `${count} solicitudes nuevas de relevamiento`;
    const body = count === 1
      ? `${first.usuario || 'Usuario'} solicita relevar ${school}.`
      : `Hay ${totalPending} solicitudes pendientes para revisar.`;
    UI.showToast(`${title}: ${body}`, 'warning', 0);
    _showSystemNotification(title, body);
  }

  async function _showSystemNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options = {
      body,
      tag: 'cialpa-solicitudes-relevamiento',
      renotify: true,
      data: { url: './?module=encuestadores' },
    };
    try {
      if (_swRegistration?.showNotification) {
        await _swRegistration.showNotification(title, options);
      } else {
        const notice = new Notification(title, options);
        notice.onclick = () => {
          window.focus();
          showModule('encuestadores');
          notice.close();
        };
      }
    } catch (err) {
      console.warn('No se pudo mostrar notificacion del sistema:', err);
    }
  }

  async function enableAdminAlerts() {
    if (!Auth.canAccess('admin')) {
      UI.showToast('Las alertas de solicitudes estan disponibles para administradores autorizados.', 'warning', 6500);
      return false;
    }
    if (!('Notification' in window)) {
      UI.showToast('Este navegador no permite notificaciones del sistema. La app mostrara avisos internos mientras este abierta.', 'warning', 8000);
      _checkAdminAlerts({ forceSummary: true });
      return false;
    }
    if (Notification.permission === 'granted') {
      UI.showToast('Alertas activas. Mientras la app este abierta o instalada, se avisaran nuevas solicitudes.', 'success', 6500);
      _checkAdminAlerts({ forceSummary: true });
      return true;
    }
    if (Notification.permission === 'denied') {
      UI.showToast('Las notificaciones estan bloqueadas en el navegador. Active permisos del sitio para recibir avisos del sistema.', 'warning', 9000);
      _checkAdminAlerts({ forceSummary: true });
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      UI.showToast('Alertas activadas para solicitudes de relevamiento.', 'success', 6500);
      _showSystemNotification('CIALPA alertas activas', 'Recibiras avisos cuando entren nuevas solicitudes de relevamiento.');
      _checkAdminAlerts({ forceSummary: true });
      return true;
    }
    UI.showToast('Permiso no concedido. Se mantendran avisos internos dentro de la app.', 'warning', 7000);
    _checkAdminAlerts({ forceSummary: true });
    return false;
  }

  function refreshAdminAlerts() {
    return _checkAdminAlerts({ forceSummary: true });
  }

  function _setAdminAlertCount(count) {
    const badge = document.getElementById('admin-alert-count');
    if (!badge) return;
    const value = Number(count) || 0;
    badge.textContent = String(value);
    badge.style.display = value > 0 ? 'inline-flex' : 'none';
  }

  function _adminAlertsStorageKey() {
    return `cialpa_admin_solicitudes_seen_${APP_CONFIG.VERSION}_${Auth.getUserInfo()?.usuario || 'admin'}`;
  }

  function _loadAdminAlertSeenIds() {
    try {
      const raw = localStorage.getItem(_adminAlertsStorageKey());
      _adminAlertsSeenIds = new Set(JSON.parse(raw || '[]'));
    } catch {
      _adminAlertsSeenIds = new Set();
    }
  }

  function _saveAdminAlertSeenIds() {
    try {
      const ids = [..._adminAlertsSeenIds].slice(-250);
      localStorage.setItem(_adminAlertsStorageKey(), JSON.stringify(ids));
    } catch {
      // localStorage may be unavailable.
    }
  }

  function _bindGlobalEvents() {
    // Sidebar toggle (mobile)
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        if (window.matchMedia('(max-width: 900px)').matches) {
          document.body.classList.add('sidebar-auto-hidden');
          const open = !document.body.classList.contains('sidebar-peek');
          sidebar.classList.toggle('sidebar--open', open);
          document.body.classList.toggle('sidebar-peek', open);
          if (!open && document.activeElement instanceof HTMLElement) document.activeElement.blur();
          toggleBtn.setAttribute('aria-expanded', String(open));
          toggleBtn.setAttribute('aria-label', open ? 'Cerrar menu' : 'Abrir menu');
        } else {
          const hidden = !document.body.classList.contains('sidebar-auto-hidden');
          if (hidden && document.activeElement instanceof HTMLElement) document.activeElement.blur();
          sidebar.classList.remove('sidebar--open');
          document.body.classList.toggle('sidebar-auto-hidden', hidden);
          document.body.classList.remove('sidebar-peek');
          toggleBtn.setAttribute('aria-expanded', String(!hidden));
          toggleBtn.setAttribute('aria-label', hidden ? 'Mostrar menu' : 'Ocultar menu');
        }
      });
    }

    _bindSidebarAutoPeek();

    // Manual FAB
    const fab = document.getElementById('manual-fab');
    if (fab) fab.addEventListener('click', () => ManualModule.toggle());

    // Offline/online detection
    window.addEventListener('offline', () =>
      UI.showToast('Sin conexión a internet. Algunos funciones no están disponibles.', 'warning', 0));
    window.addEventListener('online', () =>
      UI.showToast('Conexión restaurada.', 'success'));
  }

  function _applyVersionLabels() {
    document.querySelectorAll('.app-version').forEach(el => {
      el.textContent = `v${APP_CONFIG.VERSION}`;
    });
  }

  function _bindPwaEvents() {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      _deferredInstallPrompt = event;
      _refreshInstallButtons();
    });
    window.addEventListener('appinstalled', () => {
      _deferredInstallPrompt = null;
      _refreshInstallButtons();
      UI.showToast('CIALPA quedó instalada en este dispositivo.', 'success');
    });
  }

  async function _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      if (!_swMessagesBound) {
        _swMessagesBound = true;
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'OPEN_MODULE' && event.data.module && Auth.isLoggedIn()) {
            showModule(event.data.module);
          }
        });
      }
      _swRegistration = await navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(APP_CONFIG.VERSION)}`, {
        updateViaCache: 'none',
      });
      _swRegistration.addEventListener('updatefound', () => {
        const worker = _swRegistration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            UI.showToast('Hay una actualización disponible. Pulse Actualizar app.', 'info', 7000);
          }
        });
      });
    } catch (err) {
      console.warn('No se pudo registrar el service worker:', err);
    }
  }

  function _isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function _isAppleMobile() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isiPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPad|iPhone|iPod/.test(ua) || isiPadOS;
  }

  function _refreshInstallButtons() {
    const installed = _isStandalone();
    const appleMobile = _isAppleMobile();
    ['install-app-btn-header', 'install-app-btn-home'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = installed;
      btn.textContent = installed
        ? 'App instalada'
        : (appleMobile ? (id.includes('home') ? 'Instalar en iPad/iPhone' : 'Instalar iOS') : (id.includes('home') ? 'Instalar app en celular' : 'Instalar'));
      btn.title = installed ? 'La app ya está instalada en este dispositivo.' : 'Instalar CIALPA como app web en el celular.';
      if (appleMobile && !installed) btn.title = 'En iPad/iPhone use Safari: Compartir > Agregar a pantalla de inicio.';
    });
  }

  function _showAppleInstallHelp() {
    const modalId = 'modal-ios-install-help';
    document.getElementById(modalId)?.remove();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal modal--dialog install-help-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal__overlay" onclick="AppController.closeInstallHelp()"></div>
      <div class="modal__panel">
        <div class="modal__header">
          <h3>Instalar CIALPA en iPad/iPhone</h3>
          <button class="modal__close" onclick="AppController.closeInstallHelp()">&times;</button>
        </div>
        <div class="modal__body install-help-modal__body">
          <p>En iOS/iPadOS el navegador no muestra el instalador automatico. La instalacion se hace desde Safari:</p>
          <ol>
            <li>Abra esta pagina en <strong>Safari</strong>.</li>
            <li>Toque <strong>Compartir</strong>.</li>
            <li>Elija <strong>Agregar a pantalla de inicio</strong>.</li>
            <li>Confirme con <strong>Agregar</strong>.</li>
          </ol>
          <p class="text-muted">Despues abra CIALPA desde el icono de la pantalla de inicio.</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn-primary" onclick="AppController.closeInstallHelp()">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (typeof UI !== 'undefined' && UI.openModal) UI.openModal(modalId);
    else modal.style.display = 'block';
  }

  function closeInstallHelp() {
    const modal = document.getElementById('modal-ios-install-help');
    if (!modal) return;
    modal.classList.remove('modal--visible');
    setTimeout(() => modal.remove(), 200);
  }

  async function installApp() {
    if (_isStandalone()) {
      UI.showToast('La app ya está instalada en este dispositivo.', 'info');
      return;
    }
    if (!_deferredInstallPrompt) {
      if (_isAppleMobile()) {
        _showAppleInstallHelp();
        return;
      }
      UI.showToast('Si el navegador no muestra instalación automática, use el menú del navegador: Compartir/Agregar a pantalla de inicio.', 'info', 8000);
      return;
    }
    _deferredInstallPrompt.prompt();
    const choice = await _deferredInstallPrompt.userChoice;
    _deferredInstallPrompt = null;
    _refreshInstallButtons();
    if (choice.outcome === 'accepted') UI.showToast('Instalación iniciada.', 'success');
  }

  async function updateApp() {
    UI.showToast('Limpiando caché y reiniciando la app…', 'info');
    const freshUrl = _freshAppUrl();
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys
          .filter(key => !key.startsWith('cialpa-map-tiles'))
          .map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(async reg => {
          try { await reg.update(); } catch (_) {}
          return reg.unregister();
        }));
      }
      try { await fetch(freshUrl, { cache: 'reload', credentials: 'same-origin' }); } catch (_) {}
    } catch (err) {
      console.warn('Actualización manual incompleta:', err);
    }
    window.location.replace(freshUrl);
  }

  function _freshAppUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('v', APP_CONFIG.VERSION);
    url.searchParams.set('_', String(Date.now()));
    url.hash = '';
    return url.toString();
  }

  function _openConfiguredUrl(url, label) {
    if (!url) {
      UI.showToast(`${label} todavía no está configurado.`, 'warning');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openWorkbook() {
    UI.showToast('Se abre Google Sheets. Durante la carga revise mec_borradores; el estado general esta en escuelas_seleccionadas, fotos en evidencias y cierres en entregas_cierre.', 'info', 10000);
    _openConfiguredUrl(APP_CONFIG.SPREADSHEET_URL, 'El libro en línea');
  }

  function openEvidenceFolder() {
    _openConfiguredUrl(APP_CONFIG.EVIDENCE_FOLDER_URL, 'La carpeta de fotos y evidencias');
  }

  function _bindSidebarAutoPeek() {
    const sidebar = document.getElementById('sidebar');
    const hotzone = document.getElementById('sidebar-hotzone');
    if (!sidebar || !hotzone || sidebar.dataset.autoPeekBound === 'true') return;
    sidebar.dataset.autoPeekBound = 'true';

    const toggleBtn = document.getElementById('sidebar-toggle');
    const isAutoHidden = () => document.body.classList.contains('sidebar-auto-hidden');
    const cancelPeekTimer = () => {
      clearTimeout(_sidebarPeekTimer);
      _sidebarPeekTimer = null;
    };
    const show = () => {
      if (!isAutoHidden()) return;
      cancelPeekTimer();
      clearTimeout(_sidebarHideTimer);
      document.body.classList.add('sidebar-peek');
      sidebar.classList.add('sidebar--open');
      toggleBtn?.setAttribute('aria-expanded', 'true');
      toggleBtn?.setAttribute('aria-label', 'Ocultar menu');
    };
    const scheduleShow = (event = null) => {
      if (!isAutoHidden()) return;
      if (document.body.classList.contains('sidebar-peek')) {
        show();
        return;
      }
      if (event && event.clientX > 10) {
        cancelPeekTimer();
        return;
      }
      if (_sidebarPeekTimer) return;
      _sidebarPeekTimer = setTimeout(() => {
        _sidebarPeekTimer = null;
        show();
      }, 420);
    };
    const scheduleHide = (delay = 110) => {
      if (!isAutoHidden()) return;
      cancelPeekTimer();
      clearTimeout(_sidebarHideTimer);
      _sidebarHideTimer = setTimeout(() => {
        document.body.classList.remove('sidebar-peek');
        sidebar.classList.remove('sidebar--open');
        toggleBtn?.setAttribute('aria-expanded', 'false');
        toggleBtn?.setAttribute('aria-label', 'Mostrar menu');
      }, delay);
    };

    hotzone.addEventListener('mouseenter', scheduleShow);
    hotzone.addEventListener('mousemove', scheduleShow);
    hotzone.addEventListener('mouseleave', cancelPeekTimer);
    hotzone.addEventListener('touchstart', show, { passive: true });
    sidebar.addEventListener('mouseenter', show);
    sidebar.addEventListener('mouseleave', () => scheduleHide(90));
    sidebar.addEventListener('touchend', () => scheduleHide(180), { passive: true });
    document.addEventListener('mousemove', event => {
      if (!isAutoHidden()) return;
      if (event.clientX <= 10) {
        scheduleShow(event);
        return;
      }
      if (!document.body.classList.contains('sidebar-peek')) cancelPeekTimer();
      if (document.body.classList.contains('sidebar-peek') && event.clientX > sidebar.offsetWidth + 24) {
        scheduleHide(70);
      }
    });
    window.addEventListener('resize', () => scheduleHide(0));
  }

  // ── Module router ──────────────────────────────────────────────────────────

  function showModule(moduleId) {
    if (!Auth.isLoggedIn()) {
      showLoginScreen();
      return;
    }
    const targetModuleId = MODULES[moduleId] && Auth.canAccess(MODULES[moduleId].minRole)
      ? moduleId
      : START_MODULE;

    // Hide all content panels
    document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('module-panel--active'));

    // Show target panel
    const panel = document.getElementById(`module-${targetModuleId}`);
    if (panel) panel.classList.add('module-panel--active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item =>
      item.classList.toggle('nav-item--active', item.dataset.module === targetModuleId));

    // Close sidebar on mobile
    document.getElementById('sidebar')?.classList.remove('sidebar--open');

    // Module-specific init
    const initPromise = _initModule(targetModuleId);
    _currentModule = targetModuleId;

    // Update page title
    const mod = MODULES[targetModuleId];
    if (mod) document.title = `${mod.label} — ${APP_CONFIG.APP_NAME}`;
    return initPromise;
  }

  function _ensureVisibleModule(moduleId = 'inicio', force = false) {
    const active = document.querySelector('.module-panel--active');
    const fallback = document.getElementById(`module-${moduleId}`);
    if (!fallback) return;
    if (!force && _isVisiblePanel(active)) return;
    document.querySelectorAll('.module-panel').forEach(panel => panel.classList.remove('module-panel--active'));
    fallback.classList.add('module-panel--active');
    document.querySelectorAll('.nav-item').forEach(item =>
      item.classList.toggle('nav-item--active', item.dataset.module === moduleId));
    const mod = MODULES[moduleId];
    if (mod) document.title = `${mod.label} — ${APP_CONFIG.APP_NAME}`;
    _currentModule = moduleId;
  }

  function _isVisiblePanel(panel) {
    if (!panel) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(panel) : null;
    return panel.classList.contains('module-panel--active')
      && style?.display !== 'none'
      && style?.visibility !== 'hidden'
      && panel.getClientRects().length > 0;
  }

  async function _initModule(id) {
    try {
      await _ensureModuleAssets(id);
      switch (id) {
        case 'inicio':
          _initInicio();
          break;
        case 'mapa':
          await _initMapa();
          break;
        case 'registro':
          if (typeof GuidedRegisterModule !== 'undefined') GuidedRegisterModule.init();
          break;
        case 'encuesta':
          // survey panel re-renders itself on selectEscuela
          break;
        case 'mec':
          MecFormModule.init();
          break;
        case 'plano':
          MecFormModule.renderSchoolPlan();
          break;
        case 'incidencias':
          IncidenciasModule.loadList();
          break;
        case 'jornada':
          JornadaModule.init();
          break;
        case 'estadisticas':
          StatsModule.init();
          break;
        case 'infraestructura':
          StatsModule.initMecInfrastructure();
          break;
        case 'cuestionario-inicial':
          if (typeof InitialQuestionnaire !== 'undefined') InitialQuestionnaire.adminInit();
          break;
        case 'ubicacion':
          LocationAuditModule.init();
          break;
        case 'planificacion':
          PlanningModule.init();
          break;
        case 'configuracion':
          AdminModule.init();
          break;
        case 'auditoria':
          AdminModule.loadAuditoria();
          break;
        case 'encuestadores':
          AdminModule.loadEncuestadores();
          break;
      }
    } catch (err) {
      console.error('No se pudo cargar el modulo:', id, err);
      UI.showToast(`No se pudo cargar ${MODULES[id]?.label || 'el modulo'}: ${err.message}`, 'error', 8000);
    }
  }

  async function _ensureModuleAssets(id) {
    if (!['registro', 'mec', 'plano'].includes(id)) return;
    const label = id === 'registro' ? 'Cargando registro guiado...' : 'Cargando plano y formulario...';
    UI.setLoading(true, label);
    try {
      await _loadStyleOnce('assets/css/mec-form.css');
      await _loadScriptOnce('assets/js/mec-schema.js');
      await _loadScriptOnce('assets/js/mec-form.js');
      _syncSelectedSchoolToMec();
      if (id === 'registro') {
        await _loadScriptOnce('assets/js/guided-register.js');
      }
    } finally {
      UI.setLoading(false);
    }
  }

  function _loadScriptOnce(src) {
    const key = `script:${src}`;
    if (_lazyAssetPromises.has(key)) return _lazyAssetPromises.get(key);
    const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
    if (existing) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = _versionedAssetUrl(src);
      script.defer = true;
      script.dataset.lazySrc = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(script);
    });
    _lazyAssetPromises.set(key, promise);
    return promise;
  }

  function _loadStyleOnce(href) {
    const key = `style:${href}`;
    if (_lazyAssetPromises.has(key)) return _lazyAssetPromises.get(key);
    const existing = document.querySelector(`link[data-lazy-href="${href}"]`);
    if (existing) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = _versionedAssetUrl(href);
      link.dataset.lazyHref = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`No se pudo cargar ${href}`));
      document.head.appendChild(link);
    });
    _lazyAssetPromises.set(key, promise);
    return promise;
  }

  function _versionedAssetUrl(path) {
    const url = new URL(path, document.baseURI);
    url.searchParams.set('v', APP_CONFIG.VERSION || Date.now());
    return url.href;
  }

  function _syncSelectedSchoolToMec() {
    try {
      const currentSchool = typeof SurveyModule !== 'undefined' && SurveyModule.getCurrentEscuela
        ? SurveyModule.getCurrentEscuela()
        : null;
      if (currentSchool && typeof MecFormModule !== 'undefined' && MecFormModule.setSelectedSchool) {
        MecFormModule.setSelectedSchool(currentSchool, { render: false });
      }
    } catch (err) {
      console.warn('No se pudo sincronizar la escuela activa con el formulario MEC:', err);
    }
  }

  async function _initInicio() {
    // Summary counts on home
    try {
      const result = await API.getStats({}, { skipLoading: true });
      if (result.status === 'ok') {
        const d = result.data;
        const el = id => document.getElementById(id);
        if (el('inicio-total')) el('inicio-total').textContent = d.total || 0;
        if (el('inicio-final')) el('inicio-final').textContent = d.finalizadas || 0;
        if (el('inicio-curso')) el('inicio-curso').textContent = d.en_curso || 0;
        if (el('inicio-pendiente')) el('inicio-pendiente').textContent = d.pendientes || 0;
        if (el('inicio-avance')) el('inicio-avance').textContent = (d.pct_avance || 0) + '%';
      }
    } catch { /* non-fatal */ }
  }

  async function _initMapa() {
    if (!_mapInitialized) {
      MapModule.initMap('map-container');
      _mapInitialized = true;
    }
    setTimeout(() => MapModule.invalidateSize(), 100);

    try {
      const result = await API.getEscuelas({}, { preferCache: true, cacheMaxAgeMs: 24 * 60 * 60 * 1000 });
      if (result.status !== 'ok') {
        throw new Error(result.message || 'No se pudo cargar el listado de escuelas.');
      }
      result.data = _prepareMapRosterData(result);
      _warnIfRosterSourceLooksIncomplete(result);
      MapModule.loadMarkers(result.data || []);
      MapModule.populateFilterButtons();
      MapModule.updateOfflineStatus();
      _bindMapFilters();
      if (result.cached && navigator.onLine) {
        _refreshMapRosterFromNetwork();
      }
    } catch (err) {
      UI.showToast('Error al cargar escuelas: ' + err.message, 'error');
    }
  }

  async function _refreshMapRosterFromNetwork() {
    try {
      const fresh = await API.getEscuelas({}, { forceNetwork: true });
      if (fresh.status !== 'ok') return;
      fresh.data = _prepareMapRosterData(fresh);
      _warnIfRosterSourceLooksIncomplete(fresh);
      MapModule.loadMarkers(fresh.data || []);
      MapModule.populateFilterButtons();
      MapModule.updateOfflineStatus();
    } catch (err) {
      console.warn('[CIALPA] No se pudo refrescar el padron en segundo plano:', err);
    }
  }

  function _prepareMapRosterData(result) {
    const data = Array.isArray(result?.data) ? result.data : [];
    const source = String(result?.meta?.source || '').toLowerCase();
    const realRows = data.filter(row => !row.es_ejemplo);
    if (!source || source === 'embedded_csv' || realRows.length === 0 || realRows.length > 150 || realRows.some(_mapRowLooksPilot)) {
      return data;
    }
    let order = 0;
    return data.map(row => {
      if (row.es_ejemplo) return row;
      order += 1;
      return {
        ...row,
        en_muestra_piloto: 'true',
        prioridad_operativa: row.prioridad_operativa && row.prioridad_operativa !== 'media' ? row.prioridad_operativa : 'piloto',
        orden_muestra_piloto: row.orden_muestra_piloto || row.orden_visita || String(order),
      };
    });
  }

  function _mapRowLooksPilot(row) {
    const normalize = value => String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const trueish = value => ['true', '1', 'si', 's', 'yes', 'y', 'piloto', 'muestra', 'muestra_piloto'].includes(normalize(value));
    return trueish(row?.en_muestra_piloto)
      || trueish(row?.muestra_piloto)
      || normalize(row?.prioridad_operativa).includes('piloto')
      || String(row?.orden_muestra_piloto ?? '').trim() !== '';
  }

  function _warnIfRosterSourceLooksIncomplete(result) {
    if (_mapRosterWarningShown || !Auth.canAccess('supervisor')) return;
    const data = Array.isArray(result?.data) ? result.data : [];
    const source = String(result?.meta?.source || '').toLowerCase();
    if (!data.length || source === 'embedded_csv') return;
    const realRows = data.filter(row => !row.es_ejemplo);
    if (realRows.length >= 500) return;
    _mapRosterWarningShown = true;
    const label = source === 'sheet' ? 'hoja operativa' : (source || 'origen alternativo');
    UI.showToast(
      `El mapa cargo ${realRows.length} escuelas desde ${label}. Para ver todo el padron hay que regenerar gas/escuelas_embebidas.gs y publicar GAS desde la cuenta propietaria.`,
      'warning',
      12000
    );
  }

  function _readMapFilters() {
    return {
      departamento: document.getElementById('filter-departamento')?.value || '',
      distrito: document.getElementById('filter-distrito')?.value || '',
      zona: document.getElementById('filter-zona')?.value || '',
      encuestador: document.getElementById('filter-encuestador')?.value || '',
      estado: document.getElementById('filter-estado')?.value || '',
      piloto: document.getElementById('filter-piloto')?.value || '',
      q: document.getElementById('filter-search')?.value || '',
    };
  }

  function _applyMapFiltersNow() {
    if (typeof MapModule !== 'undefined' && typeof MapModule.applyFilters === 'function') {
      MapModule.applyFilters(_readMapFilters());
    }
  }

  function _bindMapFilters() {
    const form = document.getElementById('map-filter-form');
    if (form && form.dataset.bound !== 'true') {
      form.dataset.bound = 'true';
      form.addEventListener('submit', event => {
        event.preventDefault();
        _applyMapFiltersNow();
      });
      form.addEventListener('click', event => {
        const choice = event.target.closest('[data-choice-target]');
        if (!choice || !form.contains(choice)) return;
        window.setTimeout(() => {
          if (choice.dataset.choiceTarget === 'filter-departamento' && typeof MapModule.populateDistrictButtons === 'function') {
            MapModule.populateDistrictButtons(document.getElementById('filter-departamento')?.value || '');
          }
          _applyMapFiltersNow();
        }, 0);
      });
    }

    const applyBtn = document.getElementById('map-filter-apply');
    if (applyBtn && applyBtn.dataset.bound !== 'true') {
      applyBtn.dataset.bound = 'true';
      applyBtn.addEventListener('click', event => {
        event.preventDefault();
        _applyMapFiltersNow();
      });
    }

    const clearBtn = document.getElementById('map-filter-clear');
    if (clearBtn && clearBtn.dataset.bound !== 'true') {
      clearBtn.dataset.bound = 'true';
      clearBtn.addEventListener('click', event => {
        event.preventDefault();
        document.getElementById('map-filter-form')?.reset();
        if (typeof MapModule.populateDistrictButtons === 'function') MapModule.populateDistrictButtons('');
        UI.refreshButtonChoices(document.getElementById('map-filter-form'));
        MapModule.clearFilters();
      });
    }

    const searchInput = document.getElementById('filter-search');
    if (searchInput && searchInput.dataset.bound !== 'true') {
      searchInput.dataset.bound = 'true';
      let searchTimer = null;
      searchInput.addEventListener('input', () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(_applyMapFiltersNow, 120);
      });
    }
    ['filter-departamento', 'filter-distrito', 'filter-zona', 'filter-encuestador', 'filter-estado', 'filter-piloto'].forEach(id => {
      const input = document.getElementById(id);
      if (input && input.dataset.bound !== 'true') {
        input.dataset.bound = 'true';
        input.addEventListener('change', () => {
          if (id === 'filter-departamento' && typeof MapModule.populateDistrictButtons === 'function') {
            MapModule.populateDistrictButtons(input.value || '');
          }
          _applyMapFiltersNow();
        });
      }
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function logout() {
    const confirmed = await UI.showConfirm('Cerrar sesión', '¿Seguro que querés salir?');
    if (!confirmed) return;
    _stopAdminAlerts();
    await Auth.logout();
    location.reload();
  }

  async function printPlanPdf() {
    try {
      await _ensureModuleAssets('plano');
      if (typeof MecFormModule !== 'undefined' && MecFormModule.printPlanPdf) {
        MecFormModule.printPlanPdf();
      }
    } catch (err) {
      UI.showToast('No se pudo preparar el PDF: ' + err.message, 'error', 8000);
    }
  }

  return {
    init,
    showLoginScreen,
    showApp,
    showModule,
    installApp,
    closeInstallHelp,
    updateApp,
    enableAdminAlerts,
    refreshAdminAlerts,
    openWorkbook,
    openEvidenceFolder,
    printPlanPdf,
    logout,
  };
})();

// ── Bootstrap on DOM ready ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
