/**
 * CIALPA — Relevamiento Escolar
 * location-audit.js — revision operativa de ubicacion real
 */

const LocationAuditModule = (() => {
  'use strict';

  const STORAGE_KEY = 'cialpa_location_audit_import_v1';
  const SAMPLE_LIMIT = 10;
  let _schools = [];
  let _auditRows = [];
  let _filtered = [];

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _jsString(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  function _normalize(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function _schoolKey(school = {}) {
    return String(school.codigo_local || school.id_escuela || school.codigo || '').trim();
  }

  function _coords(school = {}) {
    const lat = Number(school.latitud ?? school.lat ?? school.latitude);
    const lng = Number(school.longitud ?? school.lng ?? school.lon ?? school.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function _isParaguay(point) {
    return Boolean(point)
      && point.lat <= -19 && point.lat >= -28
      && point.lng <= -54 && point.lng >= -63;
  }

  function _mapsUrl(point, label = '') {
    if (!point) return '';
    const query = encodeURIComponent(`${point.lat},${point.lng} ${label}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function _streetViewUrl(point) {
    if (!point) return '';
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
  }

  function _osmUrl(point) {
    if (!point) return '';
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(point.lat)}&mlon=${encodeURIComponent(point.lng)}#map=18/${encodeURIComponent(point.lat)}/${encodeURIComponent(point.lng)}`;
  }

  function _open(url, label) {
    if (!url) {
      UI.showToast(`${label} no disponible: faltan coordenadas.`, 'warning');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function init() {
    if (!Auth.canAccess('supervisor')) {
      const root = document.getElementById('location-audit-root');
      if (root) root.innerHTML = '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
      return;
    }
    _loadImportedAudit();
    await load();
    _bindFileInput();
  }

  async function load(options = {}) {
    const root = document.getElementById('location-audit-root');
    if (root) root.innerHTML = '<div class="loading-state">Preparando revision de ubicacion...</div>';
    try {
      const mapSchools = typeof MapModule !== 'undefined' ? MapModule.getEscuelas?.() || [] : [];
      if (mapSchools.length && !options.forceNetwork) {
        _schools = mapSchools;
      } else {
        const result = await API.getEscuelas({}, { preferCache: !options.forceNetwork, forceNetwork: Boolean(options.forceNetwork), cacheMaxAgeMs: 24 * 60 * 60 * 1000 });
        if (result.status !== 'ok') throw new Error(result.message || 'No se pudieron cargar escuelas.');
        _schools = Array.isArray(result.data) ? result.data : [];
      }
      _filtered = _sampleSchools(_schools, SAMPLE_LIMIT);
      render();
    } catch (err) {
      if (root) root.innerHTML = `<div class="card"><p class="access-denied">No se pudo cargar ubicacion real: ${_escape(err.message)}</p></div>`;
    }
  }

  function render() {
    const root = document.getElementById('location-audit-root');
    if (!root) return;
    const stats = _stats(_schools);
    const imported = _auditRows.length;
    root.innerHTML = `
      <section class="location-audit">
        <div class="location-audit__kpis">
          ${_kpi('Escuelas', stats.total)}
          ${_kpi('Con coordenadas', stats.withCoords)}
          ${_kpi('Sin coordenadas', stats.missing)}
          ${_kpi('Fuera de Paraguay', stats.outside)}
          ${_kpi('Auditadas', imported)}
        </div>

        <div class="location-audit__toolbar card">
          <div class="location-audit__search">
            <label for="location-audit-search">Buscar</label>
            <input id="location-audit-search" class="form-control form-control-sm" type="search" placeholder="Codigo, escuela, distrito" oninput="LocationAuditModule.applySearch(this.value)">
          </div>
          <div class="location-audit__actions">
            <button class="btn btn-sm btn-outline" onclick="LocationAuditModule.exportBaseCsv()">CSV base</button>
            <label class="btn btn-sm btn-outline location-audit__file">
              Importar auditoria
              <input id="location-audit-file" type="file" accept=".csv,text/csv" hidden>
            </label>
            <button class="btn btn-sm btn-primary" onclick="LocationAuditModule.load({ forceNetwork: true })">Actualizar</button>
          </div>
        </div>

        ${_importSummary()}
        <div class="table-wrapper card">
          <table class="location-audit-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Escuela</th>
                <th>Territorio</th>
                <th>Coordenada</th>
                <th>Auditoria</th>
                <th>Revision</th>
              </tr>
            </thead>
            <tbody>
              ${_rowsHtml(_filtered)}
            </tbody>
          </table>
        </div>
      </section>`;
    _bindFileInput();
  }

  function _kpi(label, value) {
    return `<article class="location-audit-kpi"><small>${_escape(label)}</small><strong>${_escape(value)}</strong></article>`;
  }

  function _stats(schools) {
    const total = schools.length;
    let withCoords = 0;
    let missing = 0;
    let outside = 0;
    schools.forEach(school => {
      const point = _coords(school);
      if (!point) {
        missing++;
      } else {
        withCoords++;
        if (!_isParaguay(point)) outside++;
      }
    });
    return { total, withCoords, missing, outside };
  }

  function _sampleSchools(schools, limit) {
    const sorted = [...schools].sort((a, b) =>
      String(a.departamento || '').localeCompare(String(b.departamento || ''), 'es') ||
      String(a.distrito || '').localeCompare(String(b.distrito || ''), 'es') ||
      _schoolKey(a).localeCompare(_schoolKey(b), 'es')
    );
    if (sorted.length <= limit) return sorted;
    const output = [];
    const used = new Set();
    for (let i = 0; output.length < limit && i < sorted.length; i++) {
      const idx = Math.min(sorted.length - 1, Math.floor((i * sorted.length) / limit));
      if (used.has(idx)) continue;
      used.add(idx);
      output.push(sorted[idx]);
    }
    return output;
  }

  function _rowsHtml(rows) {
    if (!rows.length) return '<tr><td colspan="6" class="text-center text-muted">No hay escuelas para mostrar.</td></tr>';
    return rows.map(school => {
      const point = _coords(school);
      const key = _schoolKey(school);
      const audit = _auditForSchool(school);
      const mapsArg = _jsString(_mapsUrl(point, school.nombre || key));
      const streetArg = _jsString(_streetViewUrl(point));
      const osmArg = _jsString(_osmUrl(point));
      const status = point ? (_isParaguay(point) ? 'OK' : 'Revisar') : 'Sin coordenada';
      return `
        <tr>
          <td><strong>${_escape(key || '-')}</strong></td>
          <td>${_escape(school.nombre || school.nombre_escuela || '-')}</td>
          <td>${_escape([school.departamento, school.distrito].filter(Boolean).join(' / ') || '-')}</td>
          <td>
            <span class="badge ${point && _isParaguay(point) ? 'badge--ok' : 'badge--warning'}">${_escape(status)}</span>
            <small>${point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : '-'}</small>
          </td>
          <td>${_auditBadge(audit)}</td>
          <td>
            <div class="location-audit-actions">
              <button class="btn btn-xs btn-outline" onclick='LocationAuditModule.openUrl(${mapsArg}, "Google Maps")'>Maps</button>
              <button class="btn btn-xs btn-outline" onclick='LocationAuditModule.openUrl(${streetArg}, "Street View")'>Street</button>
              <button class="btn btn-xs btn-outline" onclick='LocationAuditModule.openUrl(${osmArg}, "OSM")'>OSM</button>
              <button class="btn btn-xs btn-primary" onclick='LocationAuditModule.openInMap(${_jsString(key)})'>Mapa app</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function _auditBadge(audit) {
    if (!audit) return '<span class="badge badge--muted">Pendiente</span>';
    const confidence = String(audit.confidence || audit.confianza || '').trim() || 'pendiente';
    const cls = confidence === 'alta' ? 'badge--ok' : confidence === 'media' ? 'badge--info' : confidence === 'baja' ? 'badge--warning' : 'badge--muted';
    const distance = audit.candidate_distance_m || audit.distance_m || '';
    return `<span class="badge ${cls}">${_escape(confidence)}</span>${distance !== '' ? `<small>${_escape(distance)} m</small>` : ''}`;
  }

  function _importSummary() {
    if (!_auditRows.length) {
      return `
        <div class="location-audit-note card">
          <strong>Revision externa pendiente</strong>
          <p>Use el CSV base o la herramienta local para comparar coordenadas. Street View se abre en vivo; no se guardan imagenes de Google.</p>
        </div>`;
    }
    const counts = _auditRows.reduce((acc, row) => {
      const key = row.confidence || row.confianza || 'pendiente';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return `
      <div class="location-audit-note card">
        <strong>Auditoria importada</strong>
        <p>${_auditRows.length} filas · alta ${counts.alta || 0} · media ${counts.media || 0} · baja ${counts.baja || 0} · sin candidato ${counts.sin_candidato || 0}</p>
      </div>`;
  }

  function applySearch(value = '') {
    const q = _normalize(value);
    const base = q
      ? _schools.filter(school => _normalize(`${_schoolKey(school)} ${school.nombre || ''} ${school.nombre_escuela || ''} ${school.departamento || ''} ${school.distrito || ''} ${school.localidad || ''}`).includes(q))
      : _sampleSchools(_schools, SAMPLE_LIMIT);
    _filtered = base.slice(0, q ? 250 : SAMPLE_LIMIT);
    const body = document.querySelector('.location-audit-table tbody');
    if (body) body.innerHTML = _rowsHtml(_filtered);
  }

  function _auditForSchool(school) {
    const key = _schoolKey(school).replace(/\D+/g, '') || _schoolKey(school);
    if (!key) return null;
    return _auditRows.find(row => {
      const rowKey = String(row.codigo_local || row.codigo || row.id_escuela || '').trim();
      return rowKey === key || rowKey.replace(/\D+/g, '') === key;
    }) || null;
  }

  function exportBaseCsv() {
    const headers = [
      'codigo_local', 'nombre', 'departamento', 'distrito', 'localidad', 'zona',
      'latitud', 'longitud', 'estado_coordenada', 'maps_url', 'street_view_url', 'osm_url',
    ];
    const rows = _schools.map(school => {
      const point = _coords(school);
      const status = point ? (_isParaguay(point) ? 'ok' : 'fuera_paraguay') : 'sin_coordenada';
      return {
        codigo_local: _schoolKey(school),
        nombre: school.nombre || school.nombre_escuela || '',
        departamento: school.departamento || '',
        distrito: school.distrito || '',
        localidad: school.localidad || '',
        zona: school.zona || '',
        latitud: point?.lat ?? '',
        longitud: point?.lng ?? '',
        estado_coordenada: status,
        maps_url: _mapsUrl(point, school.nombre || _schoolKey(school)),
        street_view_url: _streetViewUrl(point),
        osm_url: _osmUrl(point),
      };
    });
    const csv = [headers.join(','), ...rows.map(row => headers.map(header => _csvCell(row[header])).join(','))].join('\n') + '\n';
    _downloadBlob(`cialpa_ubicacion_base_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;', csv);
    UI.showToast('CSV base de ubicacion generado.', 'success');
  }

  function _csvCell(value) {
    const text = String(value ?? '');
    if (!/[",\n\r]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function _downloadBlob(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function _bindFileInput() {
    const input = document.getElementById('location-audit-file');
    if (!input || input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';
    input.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        _auditRows = _parseCsv(text.replace(/^\uFEFF/, ''));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_auditRows.slice(0, 5000)));
        UI.showToast(`Auditoria importada: ${_auditRows.length} filas.`, 'success');
        render();
      } catch (err) {
        UI.showToast(`No se pudo importar auditoria: ${err.message}`, 'error', 7000);
      } finally {
        event.target.value = '';
      }
    });
  }

  function _parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (quoted) {
        if (c === '"' && next === '"') {
          value += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          value += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(value);
        value = '';
      } else if (c === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else if (c !== '\r') {
        value += c;
      }
    }
    if (value || row.length) {
      row.push(value);
      rows.push(row);
    }
    const [headers, ...body] = rows.filter(items => items.some(item => String(item || '').trim()));
    if (!headers?.length) return [];
    const keys = headers.map(header => String(header || '').trim());
    return body.map(items => {
      const obj = {};
      keys.forEach((key, index) => { obj[key] = items[index] ?? ''; });
      return obj;
    });
  }

  function _loadImportedAudit() {
    try {
      _auditRows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(_auditRows)) _auditRows = [];
    } catch {
      _auditRows = [];
    }
  }

  function openUrl(url, label) {
    _open(url, label);
  }

  function openInMap(code) {
    const school = _schools.find(row => _schoolKey(row) === String(code || '').trim());
    if (!school) {
      UI.showToast('No se encontro la escuela en la lista cargada.', 'warning');
      return;
    }
    if (typeof AppController !== 'undefined') AppController.showModule('mapa');
    setTimeout(() => {
      if (typeof MapModule !== 'undefined') MapModule.flyTo(school.id_escuela || school.codigo_local || code);
    }, 250);
  }

  return {
    init,
    load,
    render,
    applySearch,
    exportBaseCsv,
    openUrl,
    openInMap,
  };
})();
