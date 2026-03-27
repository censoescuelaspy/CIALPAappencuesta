/**
 * CIALPA — Relevamiento Escolar
 * audit.gs — Audit logging service
 * Version: 2.0.0
 */

const AuditService = (() => {

  /**
   * Log an action to the auditoria sheet.
   * @param {string} accion - Action type (LOGIN, LOGOUT, INICIO_SESION, etc.)
   * @param {string} usuario - Username performing the action
   * @param {string} detalle - Additional detail
   */
  function log(accion, usuario, detalle) {
    try {
      const id = _genId('AUD');
      const row = [
        id,
        usuario || 'sistema',
        accion,
        _timestamp(),
        detalle || '',
        _getApproximateIp(),
      ];
      _getSheet(SHEET_NAMES.AUDITORIA).appendRow(row);
    } catch (err) {
      // Audit logging should never crash the main flow
      console.error('[AuditService] Error logging:', err.message);
    }
  }

  /**
   * Attempt to get a rough IP indicator (not always available in GAS).
   */
  function _getApproximateIp() {
    try {
      // GAS doesn't expose client IP directly, but we can note the execution context
      return 'GAS_SERVER';
    } catch {
      return '';
    }
  }

  return { log };
})();
