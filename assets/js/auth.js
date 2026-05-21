/**
 * CIALPA — Relevamiento Escolar
 * auth.js — Authentication module
 * Version: 2.6.90
 */

const Auth = (() => {
  'use strict';

  // ── Private helpers ──────────────────────────────────────────────────────

  function _backendUrl() {
    return APP_CONFIG.GAS_URL || 'demo';
  }

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
      if (session.backendUrl !== _backendUrl()) {
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
      backendUrl: _backendUrl(),
      appVersion: APP_CONFIG.VERSION,
      loginAt: Date.now(),
      expiresAt: Date.now() + APP_CONFIG.SESSION_TIMEOUT_MS,
    };
    sessionStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function _clearSession() {
    sessionStorage.removeItem(APP_CONFIG.SESSION_KEY);
    if (_sessionCheckInterval) {
      clearInterval(_sessionCheckInterval);
      _sessionCheckInterval = null;
    }
  }

  function _normalizeRole(role) {
    const value = String(role || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (['admin', 'administrador', 'administradora'].includes(value)) return 'admin';
    if (['supervisor', 'supervisora'].includes(value)) return 'supervisor';
    if (['encuestador', 'encuestadora', 'cargador', 'cargadora'].includes(value)) return 'encuestador';
    return value;
  }

  function _applyRoleVisibility(role) {
    const normalizedRole = _normalizeRole(role);
    // Show/hide elements by data-role attribute
    document.querySelectorAll('[data-role]').forEach(el => {
      const allowed = el.dataset.role.split(',').map(r => _normalizeRole(r.trim()));
      el.style.display = allowed.includes(normalizedRole) ? '' : 'none';
    });

    // Show/hide elements by data-min-role (hierarchy: admin > supervisor > encuestador)
    const hierarchy = {
      admin: 3,
      supervisor: 2,
      encuestador: 1,
    };
    const userLevel = hierarchy[normalizedRole] || 0;
    document.querySelectorAll('[data-min-role]').forEach(el => {
      const minRole = _normalizeRole(el.dataset.minRole);
      if (minRole === 'admin') {
        el.style.display = isAdminUser() ? '' : 'none';
        return;
      }
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
      const result = await API.call('login', 'POST', { usuario, password }, { skipAuth: true });

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
  }

  async function registerUser(datos) {
    const payload = {
      usuario: String(datos.usuario || '').trim().toLowerCase(),
      nombres: String(datos.nombres || '').trim(),
      apellidos: String(datos.apellidos || '').trim(),
      documento: String(datos.documento || '').trim(),
      telefono: String(datos.telefono || '').trim(),
      correo: String(datos.correo || '').trim(),
      password: String(datos.password || ''),
    };
    if (!payload.usuario || !payload.nombres || !payload.apellidos || !payload.password) {
      throw new Error('Usuario, nombres, apellidos y contraseña son requeridos.');
    }
    if (!payload.correo && !payload.documento) {
      throw new Error('Cargue correo o documento para poder recuperar la contraseña.');
    }
    UI.setLoading(true, 'Creando usuario...');
    try {
      const result = await API.registrarUsuario(payload);
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo crear el usuario.');
      return result.data || {};
    } finally {
      UI.setLoading(false);
    }
  }

  async function recoverPassword(datos) {
    const payload = {
      usuario: String(datos.usuario || '').trim().toLowerCase(),
      documento: String(datos.documento || '').trim(),
      correo: String(datos.correo || '').trim(),
      password: String(datos.password || ''),
    };
    if (!payload.usuario || !payload.password) {
      throw new Error('Usuario y nueva contraseña son requeridos.');
    }
    if (!payload.correo && !payload.documento) {
      throw new Error('Ingrese el correo o documento registrado.');
    }
    UI.setLoading(true, 'Actualizando contraseña...');
    try {
      const result = await API.recuperarPassword(payload);
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo recuperar la contraseña.');
      return result.data || {};
    } finally {
      UI.setLoading(false);
    }
  }

  function expireSession(message = 'Sesion vencida. Inicie sesion nuevamente.') {
    _clearSession();
    try {
      UI.showToast?.(message, 'warning', 8000);
    } catch {
      // UI can be unavailable during early boot.
    }
    if (typeof AppController !== 'undefined' && AppController.showLoginScreen) {
      AppController.showLoginScreen();
    }
  }

  function getSession() {
    return _getSession();
  }

  function isLoggedIn() {
    return _getSession() !== null;
  }

  function getRole() {
    const session = _getSession();
    return session ? _normalizeRole(session.rol) : null;
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
      rol: _normalizeRole(session.rol) || session.rol,
      nombreCompleto: `${session.nombres} ${session.apellidos}`,
    };
  }

  function _normalizeIdentity(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function _identityAliases(session) {
    if (!session) return [];
    const fullName = `${session.nombres || ''} ${session.apellidos || ''}`.trim();
    const firstName = String(session.nombres || '').trim().split(/\s+/)[0] || '';
    const firstLast = String(session.apellidos || '').trim().split(/\s+/)[0] || '';
    return [
      session.usuario,
      session.id_usuario,
      fullName,
      firstName && firstLast ? `${firstName}.${firstLast}` : '',
      firstName && firstLast ? `${firstName} ${firstLast}` : '',
    ].filter(Boolean);
  }

  function canOperateSchool(escuela) {
    const session = _getSession();
    if (!session || !escuela) return false;
    if (String(escuela.id_escuela || '') === 'ESC_DEMO_CIALPA') return true;
    if (isAdminUser()) return true;

    const assignedText = [
      escuela.encuestador_asignado,
      escuela.usuario_asignado,
      escuela.encuestador,
      escuela.responsable,
      escuela.id_encuestador,
      escuela.id_usuario_asignado,
    ].filter(Boolean).join(' ');
    const assigned = _normalizeIdentity(assignedText);
    if (!assigned) return false;

    return _identityAliases(session)
      .map(_normalizeIdentity)
      .filter(Boolean)
      .some(alias => assigned === alias || assigned.includes(alias) || (assigned.length >= 6 && alias.includes(assigned)));
  }

  function schoolAssignmentLabel(escuela) {
    return String(escuela?.encuestador_asignado || escuela?.usuario_asignado || escuela?.encuestador || 'No asignada');
  }

  function isAdminUser() {
    const session = _getSession();
    if (!session) return false;
    return _normalizeRole(session.rol) === 'admin';
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
    if (requiredRole === 'admin') return isAdminUser();
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
    registerUser,
    recoverPassword,
    logout,
    getSession,
    clearSession: _clearSession,
    expireSession,
    isLoggedIn,
    getRole,
    getToken,
    getUserInfo,
    isAdminUser,
    canOperateSchool,
    schoolAssignmentLabel,
    requireAuth,
    applyRoleVisibility,
    canAccess,
    resumeSession,
  };
})();
