/**
 * CIALPA — Relevamiento Escolar
 * Code.gs — Main Google Apps Script entry point
 * Version: 2.1.0
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone (or Anyone within organization)
 *
 * CORS: GAS automatically adds CORS headers for Web Apps.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = '1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg'; // Google Sheets ID
const EVIDENCE_FOLDER_ID = '1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-';
const SHEET_NAMES = {
  ESCUELAS:     'escuelas_seleccionadas',
  USUARIOS:     'usuarios',
  ENCUESTADORES:'encuestadores',
  SESIONES:     'sesiones_relevamiento',
  MODULOS:      'modulos_relevamiento',
  EVENTOS:      'eventos_relevamiento',
  INCIDENCIAS:  'incidencias',
  CONFIG:       'configuracion',
  AUDITORIA:    'auditoria',
  CATALOGOS:    'catalogos',
  EVIDENCIAS:   'evidencias',
  MEC_DRAFTS:   'mec_borradores',
  ENTREGAS:     'entregas_cierre',
  DB_SYNC_QUEUE: 'db_sync_queue',
};

const ADMIN_USERS = ['diego.meza', 'noelia.mendoza', 'latiffi.chelala'];

function _isAuthorizedAdmin(session) {
  return session &&
    String(session.rol).toLowerCase() === 'admin' &&
    ADMIN_USERS.includes(String(session.usuario).toLowerCase());
}

// ── HTTP Entry Points ─────────────────────────────────────────────────────────

/**
 * Handles GET requests (used for data queries).
 */
function doGet(e) {
  return _handleRequest(e);
}

/**
 * Handles POST requests (used for mutations).
 */
function doPost(e) {
  return _handleRequest(e);
}

/**
 * Routes all requests to the appropriate handler based on the 'action' parameter.
 */
function _handleRequest(e) {
  let params = {};

  try {
    // Parse parameters
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch {
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }

    const action = params.action || '';

    // Public endpoints (no auth required)
    const publicActions = ['login', 'registrarUsuario', 'recuperarPassword', 'diagnosticoPadron'];
    const token = params.token || '';

    if (!publicActions.includes(action)) {
      const authResult = AuthService.validateToken(token);
      if (!authResult.valid) {
        return _respond({ status: 'error', message: 'Token inválido o expirado.', code: 401 });
      }
      params._session = authResult.session;
    }

    if (typeof FG_ACTIONS !== 'undefined' && FG_ACTIONS.has(action)) {
      return _respond(fgRoute(action, params));
    }

    const writeActions = [
      'logout',
      'registrarUsuario',
      'recuperarPassword',
      'updateEscuelaEstado',
      'asignarEscuela',
      'iniciarSesion',
      'cerrarSesion',
      'repararSesionesDuplicadasEnCurso',
      'registrarEventoSesion',
      'iniciarModulo',
      'cerrarModulo',
      'saveEncuestador',
      'deleteEncuestador',
      'saveIncidencia',
      'uploadEvidence',
      'guardarBorradorMec',
      'guardarCierreCompleto',
      'resolverIncidencia',
      'setConfig',
    ];
    const lock = writeActions.includes(action) ? LockService.getDocumentLock() : null;
    if (lock) lock.waitLock(15000);

    try {
    // Route to handler
    switch (action) {
      // Auth
      case 'login':           return _respond(AuthService.login(params));
      case 'registrarUsuario': return _respond(AuthService.registrarUsuario(params));
      case 'recuperarPassword': return _respond(AuthService.recuperarPassword(params));
      case 'logout':          return _respond(AuthService.logout(params.token));

      // Escuelas
      case 'diagnosticoPadron': return _respond(SheetsService.diagnosticoPadron());
      case 'getEscuelas':     return _respond(SheetsService.getEscuelas(params));
      case 'getEscuela':      return _respond(SheetsService.getEscuela(params.id_escuela));
      case 'updateEscuelaEstado': return _respond(SheetsService.updateEscuelaEstado(params));
      case 'asignarEscuela': return _respond(SheetsService.asignarEscuela(params));

      // Sesiones
      case 'iniciarSesion':   return _respond(SheetsService.iniciarSesion(params));
      case 'cerrarSesion':    return _respond(SheetsService.cerrarSesion(params));
      case 'repararSesionesDuplicadasEnCurso': return _respond(SheetsService.repararSesionesDuplicadasEnCurso(params));
      case 'getSesionesAbiertas': return _respond(SheetsService.getSesionesAbiertas(params));
      case 'getMisSesiones':  return _respond(SheetsService.getMisSesiones(params));
      case 'registrarEventoSesion': return _respond(SheetsService.registrarEventoSesion(params));

      // Módulos de relevamiento
      case 'iniciarModulo':   return _respond(SheetsService.iniciarModulo(params));
      case 'cerrarModulo':    return _respond(SheetsService.cerrarModulo(params));
      case 'getModulosSesion':return _respond(SheetsService.getModulosSesion(params));

      // Encuestadores
      case 'getEncuestadores':return _respond(SheetsService.getEncuestadores(params));
      case 'saveEncuestador': return _respond(SheetsService.saveEncuestador(params));
      case 'deleteEncuestador': return _respond(SheetsService.deleteEncuestador(params));

      // Incidencias
      case 'saveIncidencia':  return _respond(SheetsService.saveIncidencia(params));
      case 'uploadEvidence':  return _respond(SheetsService.uploadEvidence(params));
      case 'guardarBorradorMec': return _respond(SheetsService.guardarBorradorMec(params));
      case 'guardarCierreCompleto': return _respond(SheetsService.guardarCierreCompleto(params));
      case 'getIncidencias':  return _respond(SheetsService.getIncidencias(params));
      case 'resolverIncidencia': return _respond(SheetsService.resolverIncidencia(params));

      // Config
      case 'getConfig':       return _respond(SheetsService.getConfig());
      case 'setConfig':       return _respond(SheetsService.setConfig(params));

      // Stats
      case 'getStats':        return _respond(SheetsService.getStats(params));
      case 'getResumenOperativo': return _respond(SheetsService.getResumenOperativo(params));

      // Auditoría
      case 'getAuditoria':    return _respond(SheetsService.getAuditoria(params));

      // Catálogos
      case 'getCatalogos':    return _respond(SheetsService.getCatalogos(params.tipo));

      default:
        return _respond({ status: 'error', message: `Acción desconocida: ${action}` });
    }
    } finally {
      if (lock) lock.releaseLock();
    }

  } catch (err) {
    console.error('[CIALPA Error]', err.message, err.stack);
    AuditService.log('ERROR', 'sistema', `${err.message} | action: ${params.action || '?'}`);
    return _respond({ status: 'error', message: 'Error interno del servidor: ' + err.message });
  }
}

/**
 * Wraps the response object into a ContentService JSON output.
 */
function _respond(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper: get the active spreadsheet.
 */
function _getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Helper: get a sheet by name.
 */
function _getSheet(name) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Hoja "${name}" no encontrada.`);
  return sheet;
}

/**
 * Helper: read all rows from a sheet as array of objects.
 * @param {string} sheetName
 * @returns {object[]}
 */
function _sheetToObjects(sheetName) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Helper: find row index (1-based, including header row) by key-value.
 * Returns -1 if not found.
 */
function _findRowIndex(sheetName, keyCol, value) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const colIdx = headers.indexOf(keyCol);
  if (colIdx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) return i + 1; // 1-based
  }
  return -1;
}

/**
 * Helper: get column index (0-based) for a header name.
 */
function _getColIndex(sheetName, colName) {
  const sheet = _getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  return headers.indexOf(colName);
}

/**
 * Helper: generate a unique ID.
 */
function _genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Helper: format date as YYYY-MM-DD.
 */
function _today() {
  return Utilities.formatDate(new Date(), 'America/Asuncion', 'yyyy-MM-dd');
}

/**
 * Helper: format time as HH:mm:ss.
 */
function _now() {
  return Utilities.formatDate(new Date(), 'America/Asuncion', 'HH:mm:ss');
}

/**
 * Helper: full timestamp.
 */
function _timestamp() {
  return Utilities.formatDate(new Date(), 'America/Asuncion', 'yyyy-MM-dd HH:mm:ss');
}
