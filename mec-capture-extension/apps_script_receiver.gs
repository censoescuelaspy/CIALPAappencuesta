/**
 * Receptor minimo para la prueba CIALPA Captura MEC.
 *
 * Desplegar como Web App y pegar la URL /exec en el popup de la extension.
 * Si se integra con el backend GAS principal, copiar la logica a un doPost
 * existente o rutear por un parametro action=mec_capture.
 */
const CIALPA_MEC_CAPTURE_SHEET = 'captura_mec_eventos';

function doPost(e) {
  const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  const event = JSON.parse(body);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateMecCaptureSheet_(ss);

  sheet.appendRow([
    new Date(),
    event.kind || '',
    event.cialpaContext && event.cialpaContext.cialpaSessionId || '',
    event.cialpaContext && event.cialpaContext.surveyorDocument || '',
    event.cialpaContext && event.cialpaContext.surveyorName || '',
    event.cialpaContext && event.cialpaContext.team || '',
    event.cialpaContext && event.cialpaContext.schoolCode || '',
    event.pageSessionId || '',
    event.sequence || '',
    event.capturedAt || '',
    event.pageLoadedAt || '',
    event.elapsedMs || '',
    event.firstInteractionElapsedMs || '',
    event.url || '',
    event.path || '',
    event.title || '',
    event.field && event.field.label || '',
    event.field && event.field.name || '',
    event.field && event.field.id || '',
    event.field && event.field.type || '',
    stringifyValue_(event.field && event.field.value),
    stringifyValue_(event.field && event.field.selectedText),
    event.field && event.field.timeOnFieldMs || '',
    event.button && event.button.label || '',
    event.button && event.button.dataAction || '',
    body
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateMecCaptureSheet_(ss) {
  let sheet = ss.getSheetByName(CIALPA_MEC_CAPTURE_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(CIALPA_MEC_CAPTURE_SHEET);
  sheet.appendRow([
    'recibido_en',
    'kind',
    'cialpa_session_id',
    'surveyor_document',
    'surveyor_name',
    'team',
    'school_code',
    'page_session_id',
    'sequence',
    'captured_at',
    'page_loaded_at',
    'elapsed_ms',
    'first_interaction_elapsed_ms',
    'url',
    'path',
    'title',
    'field_label',
    'field_name',
    'field_id',
    'field_type',
    'field_value',
    'selected_text',
    'time_on_field_ms',
    'button_label',
    'button_action',
    'raw_json'
  ]);
  return sheet;
}

function stringifyValue_(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
