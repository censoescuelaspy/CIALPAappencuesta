/**
 * CIALPA — Relevamiento Escolar
 * api.js — API layer for Google Apps Script backend
 * Version: 2.0.0
 */

const API = (() => {
  'use strict';

  // ── Demo mode ─────────────────────────────────────────────────────────────
  // Active when GAS_URL is still the placeholder. Allows full app testing
  // without a deployed backend. Credentials: admin/admin123 or encuestador/enc123

  const _IS_DEMO = !APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL';

  const _DEMO_USERS = [
    { usuario: 'admin',       password: 'admin123', nombres: 'Admin',    apellidos: 'Sistema',  rol: 'admin',       id_usuario: 'u_admin' },
    { usuario: 'encuestador', password: 'enc123',   nombres: 'Juan',     apellidos: 'Pérez',    rol: 'encuestador', id_usuario: 'u_enc1'  },
    { usuario: 'supervisor',  password: 'sup123',   nombres: 'María',    apellidos: 'González', rol: 'supervisor',  id_usuario: 'u_sup1'  },
  ];

  const _DEMO_ESCUELAS = [
    { id_escuela: 'E001', nombre: 'Escuela Básica Nro. 1 Mariscal López', departamento: 'Central',     zona: 'Urbana',        estado: 'pendiente',  lat: -25.286,  lng: -57.647, encuestador_asignado: '' },
    { id_escuela: 'E002', nombre: 'Colegio Nacional Cap. Bado',            departamento: 'Amambay',     zona: 'Urbana',        estado: 'en_curso',   lat: -23.266,  lng: -55.533, encuestador_asignado: 'Juan Pérez' },
    { id_escuela: 'E003', nombre: 'Escuela Básica Ita Paso',               departamento: 'Concepción',  zona: 'Rural',         estado: 'finalizada', lat: -22.834,  lng: -57.434, encuestador_asignado: 'Juan Pérez' },
    { id_escuela: 'E004', nombre: 'Escuela Básica Mbocayaty',              departamento: 'Guairá',      zona: 'Rural',         estado: 'pendiente',  lat: -25.981,  lng: -56.429, encuestador_asignado: '' },
    { id_escuela: 'E005', nombre: 'Colegio San José',                      departamento: 'Alto Paraná', zona: 'Urbana',        estado: 'finalizada', lat: -25.510,  lng: -54.611, encuestador_asignado: 'María González' },
    { id_escuela: 'E006', nombre: 'Escuela Pedro Juan Caballero',          departamento: 'Amambay',     zona: 'Urbana',        estado: 'incidencia', lat: -22.554,  lng: -55.727, encuestador_asignado: 'Juan Pérez' },
    { id_escuela: 'E007', nombre: 'Escuela Rural Aguaray',                 departamento: 'San Pedro',   zona: 'Rural Remota',  estado: 'pendiente',  lat: -24.083,  lng: -56.588, encuestador_asignado: '' },
    { id_escuela: 'E008', nombre: 'Escuela Básica Villa Hayes',            departamento: 'Presidente Hayes', zona: 'Urbana',   estado: 'en_curso',   lat: -25.100,  lng: -57.521, encuestador_asignado: 'María González' },
  ];

  const _DEMO_STATS = {
    total: 8, pendiente: 3, en_curso: 2, finalizada: 2, incidencia: 1,
    porcentaje_avance: 25,
    por_departamento: [
      { departamento: 'Central', total: 1, finalizada: 0, en_curso: 1 },
      { departamento: 'Amambay', total: 2, finalizada: 0, en_curso: 1 },
      { departamento: 'Alto Paraná', total: 1, finalizada: 1, en_curso: 0 },
    ],
    por_zona: [
      { zona: 'Urbana', total: 5 }, { zona: 'Rural', total: 2 }, { zona: 'Rural Remota', total: 1 },
    ],
    por_encuestador: [
      { encuestador: 'Juan Pérez', asignadas: 3, finalizadas: 1 },
      { encuestador: 'María González', asignadas: 2, finalizadas: 1 },
    ],
    historico: [
      { fecha: '2026-03-20', finalizadas: 0 }, { fecha: '2026-03-21', finalizadas: 1 },
      { fecha: '2026-03-22', finalizadas: 1 }, { fecha: '2026-03-23', finalizadas: 2 },
      { fecha: '2026-03-24', finalizadas: 2 }, { fecha: '2026-03-25', finalizadas: 2 },
    ],
  };

  const _DEMO_ENCUESTADORES = [
    { id_encuestador: 'u_enc1', nombres: 'Juan', apellidos: 'Pérez',    usuario: 'encuestador', activo: true, zona_asignada: 'Amambay' },
    { id_encuestador: 'u_sup1', nombres: 'María', apellidos: 'González', usuario: 'supervisor',  activo: true, zona_asignada: 'Alto Paraná' },
  ];

  function _demoCall(endpoint, data) {
    // Small artificial delay to simulate network
    return new Promise(resolve => setTimeout(() => {
      resolve(_demoDispatch(endpoint, data));
    }, 300));
  }

  function _demoDispatch(endpoint, data) {
    switch (endpoint) {
      case 'login': {
        const u = _DEMO_USERS.find(x => x.usuario === data.usuario && x.password === data.password);
        if (u) {
          const { password: _, ...safeUser } = u;
          return { status: 'ok', data: { token: 'demo_' + Date.now(), ...safeUser } };
        }
        return { status: 'error', message: 'Credenciales inválidas.\n\nModo DEMO — use:\n  admin / admin123\n  encuestador / enc123\n  supervisor / sup123' };
      }
      case 'logout':          return { status: 'ok' };
      case 'getEscuelas':     return { status: 'ok', data: _DEMO_ESCUELAS };
      case 'getEscuela':      return { status: 'ok', data: _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela) || null };
      case 'updateEscuelaEstado': {
        const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela);
        if (esc) esc.estado = data.estado;
        return { status: 'ok' };
      }
      case 'getStats':        return { status: 'ok', data: _DEMO_STATS };
      case 'getEncuestadores':return { status: 'ok', data: _DEMO_ENCUESTADORES };
      case 'saveEncuestador': return { status: 'ok' };
      case 'deleteEncuestador': return { status: 'ok' };
      case 'saveIncidencia':  return { status: 'ok', data: { id_incidencia: 'inc_demo_' + Date.now() } };
      case 'getIncidencias':  return { status: 'ok', data: [] };
      case 'resolverIncidencia': return { status: 'ok' };
      case 'iniciarSesion':   return { status: 'ok', data: { id_sesion: 'ses_demo_' + Date.now() } };
      case 'cerrarSesion':    return { status: 'ok' };
      case 'getSesionesAbiertas': return { status: 'ok', data: [] };
      case 'getMisSesiones':  return { status: 'ok', data: [] };
      case 'getConfig':       return { status: 'ok', data: { operativo: true, fecha_inicio: '2026-03-01', fecha_fin: '2026-06-30' } };
      case 'setConfig':       return { status: 'ok' };
      case 'getCatalogos':    return { status: 'ok', data: [] };
      case 'getAuditoria':    return { status: 'ok', data: [] };
      default:                return { status: 'ok', data: null };
    }
  }

  // ── End demo mode ──────────────────────────────────────────────────────────

  let _loadingCount = 0;

  function _incrementLoading() {
    _loadingCount++;
    UI.setLoading(true);
  }

  function _decrementLoading() {
    _loadingCount = Math.max(0, _loadingCount - 1);
    if (_loadingCount === 0) UI.setLoading(false);
  }

  async function _fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  async function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Core API call with retry logic.
   * @param {string} endpoint - Action name (e.g. 'login', 'getEscuelas')
   * @param {string} method - 'GET' or 'POST'
   * @param {object} data - Payload for POST, query params for GET
   * @param {object} options - { skipAuth, skipLoading, retries }
   */
  async function call(endpoint, method = 'GET', data = {}, options = {}) {
    const { skipAuth = false, skipLoading = false, retries = APP_CONFIG.API_RETRY_ATTEMPTS } = options;

    if (!skipLoading) _incrementLoading();

    // Demo mode: bypass network when GAS is not configured
    if (_IS_DEMO) {
      const result = await _demoCall(endpoint, data);
      if (!skipLoading) _decrementLoading();
      return result;
    }

    // Attach auth token
    const token = Auth.getToken ? Auth.getToken() : null;
    const payload = { action: endpoint, ...data };
    if (token && !skipAuth) payload.token = token;

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        let url = APP_CONFIG.GAS_URL;
        let fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
        };

        if (method === 'GET') {
          const params = new URLSearchParams(payload);
          url = `${APP_CONFIG.GAS_URL}?${params.toString()}`;
          delete fetchOptions.headers['Content-Type'];
        } else {
          fetchOptions.body = JSON.stringify(payload);
        }

        // GAS requires no-cors workaround sometimes — use text then parse
        const response = await _fetchWithTimeout(url, fetchOptions, APP_CONFIG.API_TIMEOUT_MS);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Respuesta inválida del servidor (no es JSON).');
        }

        if (!skipLoading) _decrementLoading();
        return json;

      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await _sleep(APP_CONFIG.API_RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (!skipLoading) _decrementLoading();

    // Surface error to UI
    const msg = lastError?.message || 'Error de conexión con el servidor.';
    console.error(`[API] Error en endpoint "${endpoint}":`, lastError);
    throw new Error(msg);
  }

  // ── Escuelas ──────────────────────────────────────────────────────────────

  async function getEscuelas(filters = {}) {
    return call('getEscuelas', 'GET', filters, { skipLoading: true });
  }

  async function getEscuela(id) {
    return call('getEscuela', 'GET', { id_escuela: id });
  }

  async function updateEscuelaEstado(id, estado, observacion = '') {
    return call('updateEscuelaEstado', 'POST', { id_escuela: id, estado, observacion });
  }

  // ── Sesiones ──────────────────────────────────────────────────────────────

  async function iniciarSesion(id_escuela) {
    return call('iniciarSesion', 'POST', { id_escuela });
  }

  async function cerrarSesion(id_sesion, datos) {
    return call('cerrarSesion', 'POST', { id_sesion, ...datos });
  }

  async function getSesionesAbiertas() {
    return call('getSesionesAbiertas', 'GET', {}, { skipLoading: true });
  }

  async function getMisSesiones() {
    return call('getMisSesiones', 'GET', {}, { skipLoading: true });
  }

  // ── Encuestadores ─────────────────────────────────────────────────────────

  async function getEncuestadores() {
    return call('getEncuestadores', 'GET', {}, { skipLoading: true });
  }

  async function saveEncuestador(datos) {
    return call('saveEncuestador', 'POST', datos);
  }

  async function deleteEncuestador(id) {
    return call('deleteEncuestador', 'POST', { id_encuestador: id });
  }

  // ── Incidencias ───────────────────────────────────────────────────────────

  async function saveIncidencia(datos) {
    return call('saveIncidencia', 'POST', datos);
  }

  async function getIncidencias(filters = {}) {
    return call('getIncidencias', 'GET', filters, { skipLoading: true });
  }

  async function resolverIncidencia(id, resolucion) {
    return call('resolverIncidencia', 'POST', { id_incidencia: id, resolucion });
  }

  // ── Configuración ─────────────────────────────────────────────────────────

  async function getConfig() {
    return call('getConfig', 'GET', {}, { skipLoading: true });
  }

  async function setConfig(clave, valor) {
    return call('setConfig', 'POST', { clave, valor });
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  async function getStats(filters = {}) {
    return call('getStats', 'GET', filters, { skipLoading: true });
  }

  // ── Auditoría ─────────────────────────────────────────────────────────────

  async function getAuditoria(filters = {}) {
    return call('getAuditoria', 'GET', filters, { skipLoading: true });
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────

  async function getCatalogos(tipo) {
    return call('getCatalogos', 'GET', { tipo }, { skipLoading: true });
  }

  return {
    call,
    getEscuelas,
    getEscuela,
    updateEscuelaEstado,
    iniciarSesion,
    cerrarSesion,
    getSesionesAbiertas,
    getMisSesiones,
    getEncuestadores,
    saveEncuestador,
    deleteEncuestador,
    saveIncidencia,
    getIncidencias,
    resolverIncidencia,
    getConfig,
    setConfig,
    getStats,
    getAuditoria,
    getCatalogos,
  };
})();
