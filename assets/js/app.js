/**
 * CIALPA — Relevamiento Escolar
 * app.js — Main application controller (router, init, global state)
 * Version: 2.6.8
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
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icon = document.createElement('span');
    icon.className = 'toast__icon';
    icon.textContent = _toastIcon(type);
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
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300);
      }, duration);
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
    arquitectura: { label: 'Arquitectura proyecto', icon: 'A', minRole: 'encuestador' },
    encuestadores: { label: 'Usuarios', icon: '👥', minRole: 'admin' },
    manual: { label: 'Manual', icon: '📖', minRole: 'encuestador' },
    incidencias: { label: 'Incidencias', icon: '⚠️', minRole: 'encuestador' },
    jornada: { label: 'Mi Jornada', icon: '📅', minRole: 'encuestador' },
    estadisticas: { label: 'Resultados globales', icon: '📊', minRole: 'supervisor' },
    planificacion: { label: 'Planificación', icon: '⏱', minRole: 'supervisor' },
    configuracion: { label: 'Configuración', icon: '⚙️', minRole: 'admin' },
    auditoria: { label: 'Auditoría', icon: '🔍', minRole: 'admin' },
  };

  const START_MODULE = 'registro';
  let _currentModule = null;
  let _mapInitialized = false;
  let _sidebarHideTimer = null;
  let _deferredInstallPrompt = null;
  let _swRegistration = null;
  let _launchHomeResetBound = false;

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

    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const usuario = document.getElementById('login-usuario').value.trim();
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        if (errEl) errEl.textContent = '';

        try {
          await Auth.login(usuario, password);
          showApp();
        } catch (err) {
          if (errEl) errEl.textContent = err.message;
        }
      });
    }
  }

  // ── Main app shell ─────────────────────────────────────────────────────────

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
    } catch (err) {
      console.error('Error inicializando la vista principal:', err);
      UI.showToast?.('Se restauro la vista Registro guiado despues de actualizar la app.', 'warning', 6000);
    } finally {
      resetToHome();
    }
  }

  function _bindLaunchHomeReset() {
    if (_launchHomeResetBound) return;
    _launchHomeResetBound = true;
    window.addEventListener('pageshow', event => {
      if (!event.persisted || !Auth.isLoggedIn()) return;
      const shell = document.getElementById('app-shell');
      if (!shell || shell.style.display === 'none') return;
      resetToHome();
    });
  }

  function resetToHome() {
    try {
      showModule(START_MODULE);
    } catch (err) {
      console.error('No se pudo abrir Registro guiado por el ruteador:', err);
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

    const primaryModules = ['registro', 'mapa', 'encuestadores', 'estadisticas'];
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
  }

  function _renderUserBar() {
    const user = Auth.getUserInfo();
    if (!user) return;
    const bar = document.getElementById('user-bar');
    if (bar) {
      bar.innerHTML = `
        <span class="app-edition-badge">${_escapeHtml(APP_CONFIG.EDITION_LABEL || `v${APP_CONFIG.VERSION}`)}</span>
        <button id="install-app-btn-header" class="btn btn-sm btn-primary" onclick="AppController.installApp()">Instalar</button>
        <button class="btn btn-sm btn-outline" onclick="AppController.updateApp()">Actualizar</button>
        <span class="user-bar__name">${_escapeHtml(`${user.nombres || ''} ${user.apellidos || ''}`.trim())}</span>
        <span class="user-bar__role badge badge--role">${_escapeHtml(_rolLabel(user.rol))}</span>`;
    }
    _refreshInstallButtons();
  }

  function _rolLabel(rol) {
    return { admin: 'Admin', supervisor: 'Supervisor', encuestador: 'Encuestador' }[rol] || rol;
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
      _swRegistration = await navigator.serviceWorker.register('./sw.js');
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

  function _refreshInstallButtons() {
    const installed = _isStandalone();
    ['install-app-btn-header', 'install-app-btn-home'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = installed;
      btn.textContent = installed ? 'App instalada' : (id.includes('home') ? 'Instalar app en celular' : 'Instalar');
      btn.title = installed ? 'La app ya está instalada en este dispositivo.' : 'Instalar CIALPA como app web en el celular.';
    });
  }

  async function installApp() {
    if (_isStandalone()) {
      UI.showToast('La app ya está instalada en este dispositivo.', 'info');
      return;
    }
    if (!_deferredInstallPrompt) {
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
    UI.showToast('Buscando la edición vigente y actualizando caché de la app...', 'info');
    try {
      if (_swRegistration) {
        await _swRegistration.update();
        const waiting = _swRegistration.waiting || _swRegistration.installing;
        if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys
          .filter(key => key.startsWith('cialpa-') && !key.startsWith('cialpa-map-tiles'))
          .map(key => caches.delete(key)));
      }
    } catch (err) {
      console.warn('Actualización manual incompleta:', err);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', APP_CONFIG.VERSION);
    url.searchParams.set('t', Date.now());
    window.location.replace(url.toString());
  }

  function _openConfiguredUrl(url, label) {
    if (!url) {
      UI.showToast(`${label} todavía no está configurado.`, 'warning');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openWorkbook() {
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
    const show = () => {
      if (!isAutoHidden()) return;
      clearTimeout(_sidebarHideTimer);
      document.body.classList.add('sidebar-peek');
      sidebar.classList.add('sidebar--open');
      toggleBtn?.setAttribute('aria-expanded', 'true');
      toggleBtn?.setAttribute('aria-label', 'Ocultar menu');
    };
    const scheduleHide = (delay = 110) => {
      if (!isAutoHidden()) return;
      clearTimeout(_sidebarHideTimer);
      _sidebarHideTimer = setTimeout(() => {
        document.body.classList.remove('sidebar-peek');
        sidebar.classList.remove('sidebar--open');
        toggleBtn?.setAttribute('aria-expanded', 'false');
        toggleBtn?.setAttribute('aria-label', 'Mostrar menu');
      }, delay);
    };

    hotzone.addEventListener('mouseenter', show);
    hotzone.addEventListener('mousemove', show);
    hotzone.addEventListener('touchstart', show, { passive: true });
    sidebar.addEventListener('mouseenter', show);
    sidebar.addEventListener('mouseleave', () => scheduleHide(90));
    sidebar.addEventListener('touchend', () => scheduleHide(180), { passive: true });
    document.addEventListener('mousemove', event => {
      if (!isAutoHidden()) return;
      if (event.clientX <= 32) {
        show();
        return;
      }
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
    _initModule(targetModuleId);
    _currentModule = targetModuleId;

    // Update page title
    const mod = MODULES[targetModuleId];
    if (mod) document.title = `${mod.label} — ${APP_CONFIG.APP_NAME}`;
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
      const result = await API.getEscuelas();
      if (result.status === 'ok') {
        MapModule.loadMarkers(result.data || []);
        MapModule.populateFilterButtons();
        MapModule.updateOfflineStatus();
        _bindMapFilters();
      }
    } catch (err) {
      UI.showToast('Error al cargar escuelas: ' + err.message, 'error');
    }
  }

  function _bindMapFilters() {
    const applyBtn = document.getElementById('map-filter-apply');
    if (applyBtn && applyBtn.dataset.bound !== 'true') {
      applyBtn.dataset.bound = 'true';
      applyBtn.addEventListener('click', () => {
        const filters = {
          departamento: document.getElementById('filter-departamento')?.value || '',
          zona: document.getElementById('filter-zona')?.value || '',
          encuestador: document.getElementById('filter-encuestador')?.value || '',
          estado: document.getElementById('filter-estado')?.value || '',
          q: document.getElementById('filter-search')?.value || '',
        };
        MapModule.applyFilters(filters);
      });
    }

    const clearBtn = document.getElementById('map-filter-clear');
    if (clearBtn && clearBtn.dataset.bound !== 'true') {
      clearBtn.dataset.bound = 'true';
      clearBtn.addEventListener('click', () => {
        document.getElementById('map-filter-form')?.reset();
        UI.refreshButtonChoices(document.getElementById('map-filter-form'));
        MapModule.clearFilters();
      });
    }

    const searchInput = document.getElementById('filter-search');
    if (searchInput && searchInput.dataset.bound !== 'true') {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => {
        document.getElementById('map-filter-apply')?.click();
      });
    }
    ['filter-departamento', 'filter-zona', 'filter-encuestador', 'filter-estado'].forEach(id => {
      const input = document.getElementById(id);
      if (input && input.dataset.bound !== 'true') {
        input.dataset.bound = 'true';
        input.addEventListener('change', () => document.getElementById('map-filter-apply')?.click());
      }
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function logout() {
    const confirmed = await UI.showConfirm('Cerrar sesión', '¿Seguro que querés salir?');
    if (!confirmed) return;
    await Auth.logout();
    location.reload();
  }

  return {
    init,
    showLoginScreen,
    showApp,
    showModule,
    installApp,
    updateApp,
    openWorkbook,
    openEvidenceFolder,
    logout,
  };
})();

// ── Bootstrap on DOM ready ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
