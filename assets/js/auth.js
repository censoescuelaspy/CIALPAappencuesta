/**
 * CIALPA — Relevamiento Escolar
 * auth.js — Authentication module
 * Version: 2.0.0
 */

const Auth = (() => {
  'use strict';

  // ── Private helpers ──────────────────────────────────────────────────────

  function _getSession() {
    try {
      const raw = sessionStorage.getItem(APP_CONFIG.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Check expiry
      if (Date.now() > session.expiresAt) {
        _clearSession();
        return null;
      }
      return session;
    } catch {
      _clearSession();
      return null;
    }
  }

  function _setSession(data) {
    const session = {
      ...data,
      loginAt: Date.now(),
      expiresAt: Date.now() + APP_CONFIG.SESSION_TIMEOUT_MS,
    };
    sessionStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function _clearSession() {
    sessionStorage.removeItem(APP_CONFIG.SESSION_KEY);
  }

  function _applyRoleVisibility(role) {
    // Show/hide elements by data-role attribute
    document.querySelectorAll('[data-role]').forEach(el => {
      const allowed = el.dataset.role.split(',').map(r => r.trim());
      el.style.display = allowed.includes(role) ? '' : 'none';
    });

    // Show/hide elements by data-min-role (hierarchy: admin > supervisor > encuestador)
    const hierarchy = {
      admin: 3,
      supervisor: 2,
      encuestador: 1,
    };
    const userLevel = hierarchy[role] || 0;
    document.querySelectorAll('[data-min-role]').forEach(el => {
      const minRole = el.dataset.minRole;
      const minLevel = hierarchy[minRole] || 0;
      el.style.display = userLevel >= minLevel ? '' : 'none';
    });
  }

  let _sessionCheckInterval = null;

  function _startSessionWatcher() {
    if (_sessionCheckInterval) clearInterval(_sessionCheckInterval);
    _sessionCheckInterval = setInterval(() => {
      const session = _getSession();
      if (!session) {
        clearInterval(_sessionCheckInterval);
        _onSessionExpired();
      }
    }, 60000); // check every minute
  }

  function _onSessionExpired() {
    UI.showToast('Tu sesión ha expirado. Por favor vuelve a iniciar sesión.', 'warning', 8000);
    setTimeout(() => {
      _clearSession();
      location.reload();
    }, 3000);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function login(usuario, password) {
    if (!usuario || !password) {
      throw new Error('Usuario y contraseña son requeridos.');
    }

    UI.setLoading(true, 'Verificando credenciales...');
    try {
      const result = await API.call('login', 'POST', { usuario, password });

      if (result.status !== 'ok') {
        throw new Error(result.message || 'Credenciales inválidas.');
      }

      const session = _setSession({
        token: result.data.token,
        usuario: result.data.usuario,
        nombres: result.data.nombres,
        apellidos: result.data.apellidos,
        rol: result.data.rol,
        id_usuario: result.data.id_usuario,
      });

      _startSessionWatcher();
      return session;
    } finally {
      UI.setLoading(false);
    }
  }

  async function logout() {
    const session = _getSession();
    if (session && session.token) {
      try {
        await API.call('logout', 'POST', { token: session.token });
      } catch {
        // Silent — always clear locally
      }
    }
    _clearSession();
    if (_sessionCheckInterval) clearInterval(_sessionCheckInterval);
  }

  function getSession() {
    return _getSession();
  }

  function isLoggedIn() {
    return _getSession() !== null;
  }

  function getRole() {
    const session = _getSession();
    return session ? session.rol : null;
  }

  function getToken() {
    const session = _getSession();
    return session ? session.token : null;
  }

  function getUserInfo() {
    const session = _getSession();
    if (!session) return null;
    return {
      id: session.id_usuario,
      usuario: session.usuario,
      nombres: session.nombres,
      apellidos: session.apellidos,
      rol: session.rol,
      nombreCompleto: `${session.nombres} ${session.apellidos}`,
    };
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      AppController.showLoginScreen();
      return false;
    }
    return true;
  }

  function applyRoleVisibility() {
    const role = getRole();
    if (role) _applyRoleVisibility(role);
  }

  function canAccess(requiredRole) {
    const hierarchy = { admin: 3, supervisor: 2, encuestador: 1 };
    const userLevel = hierarchy[getRole()] || 0;
    const required = hierarchy[requiredRole] || 0;
    return userLevel >= required;
  }

  function resumeSession() {
    if (isLoggedIn()) {
      _startSessionWatcher();
      return true;
    }
    return false;
  }

  return {
    login,
    logout,
    getSession,
    isLoggedIn,
    getRole,
    getToken,
    getUserInfo,
    requireAuth,
    applyRoleVisibility,
    canAccess,
    resumeSession,
  };
})();
