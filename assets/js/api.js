/**
 * CIALPA — Relevamiento Escolar
 * api.js — API layer for Google Apps Script backend
 * Version: 2.0.0
 */

const API = (() => {
  'use strict';

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
