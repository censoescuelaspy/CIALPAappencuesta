/**
 * CIALPA, Relevamiento Escolar
 * department-atlas.js, atlas departamental con mapa e impresion multipagina
 * Version: 2.6.202
 */

const DepartmentAtlasModule = (() => {
  'use strict';

  const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const MAX_LIST_ROWS = 180;
  const MAX_OVERVIEW_ROWS = 24;
  const SVG_WIDTH = 760;
  const SVG_HEIGHT = 420;
  const SVG_PAD = 36;
  const VIEW_MODE_OVERVIEW = 'overview';
  const VIEW_MODE_DEPARTMENT = 'department';

  const STATE_META = {
    pendiente: { label: 'Pendiente', color: '#b7791f', tone: 'warning' },
    en_curso: { label: 'En curso', color: '#1d4ed8', tone: 'info' },
    finalizada: { label: 'Finalizada', color: '#0f8a5f', tone: 'success' },
    incidencia: { label: 'Incidencia', color: '#b42318', tone: 'danger' },
    parcial: { label: 'Parcial', color: '#7c3aed', tone: 'info' },
    suspendida: { label: 'Suspendida', color: '#64748b', tone: 'muted' },
    revisar: { label: 'Revisar', color: '#ea580c', tone: 'warning' },
  };

  const DEPARTMENT_CENTERS = {
    asuncion: [-25.2867, -57.5759],
    concepcion: [-23.4064, -57.4344],
    sanpedro: [-24.1067, -56.5206],
    cordillera: [-25.2289, -57.0111],
    guaira: [-25.7829, -56.4487],
    caaguazu: [-25.4646, -56.0139],
    caazapa: [-26.1828, -56.3719],
    itapua: [-27.3306, -55.8667],
    misiones: [-26.8434, -57.1018],
    paraguari: [-25.6333, -57.1500],
    altoparana: [-25.5167, -54.6167],
    central: [-25.3200, -57.5200],
    neembucu: [-26.8569, -58.2933],
    amambay: [-22.9200, -56.4700],
    canindeyu: [-24.0500, -55.7000],
    presidentehayes: [-23.7500, -58.9000],
    boqueron: [-21.6000, -60.9000],
    altoparaguay: [-20.8000, -59.9000],
  };

  const DEPARTMENT_ALIASES = {
    asuncion: 'asuncion',
    capital: 'asuncion',
    distritocapital: 'asuncion',
    capitalasuncion: 'asuncion',
    ciudaddeasuncion: 'asuncion',
  };

  let _initialized = false;
  let _printListenerBound = false;
  let _schools = [];
  let _departments = [];
  let _viewMode = VIEW_MODE_OVERVIEW;
  let _selectedDepartment = 'Asuncion';
  let _lastLoadLabel = '';
  let _map = null;
  let _layer = null;
  let _loadSequence = 0;
  let _tableSort = { key: 'name', dir: 'asc' };

  async function init() {
    if (!Auth.canAccess('supervisor')) {
      _setAccessDenied();
      return;
    }
    _bindEvents();
    if (_initialized && _schools.length) {
      _renderAll();
      return;
    }
    _initialized = true;
    await refresh({ forceNetwork: false });
  }

  async function refresh(options = {}) {
    const sequence = ++_loadSequence;
    const forceNetwork = Boolean(options.forceNetwork);
    _setStatus(forceNetwork ? 'Actualizando padron territorial...' : 'Cargando padron territorial...');
    try {
      const result = await API.getEscuelas({}, {
        preferCache: !forceNetwork,
        forceNetwork,
        cacheMaxAgeMs: CACHE_MAX_AGE_MS,
      });
      if (sequence !== _loadSequence) return;
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo cargar el padron.');
      _schools = Array.isArray(result.data) ? result.data : [];
      _lastLoadLabel = result.cached ? `Cache local ${_formatDateTime(result.cachedAt)}` : `Datos actualizados ${_formatDateTime(new Date())}`;
      _departments = _buildDepartmentList(_schools);
      _ensureSelectedDepartment();
      _renderAll();
      if (result.cached) _setStatus(`${_lastLoadLabel}. Use Actualizar para consultar el backend.`);
    } catch (err) {
      const fallback = _fallbackSchools();
      if (fallback.length) {
        _schools = fallback;
        _lastLoadLabel = 'Vista calculada con el padron ya cargado en el mapa';
        _departments = _buildDepartmentList(_schools);
        _ensureSelectedDepartment();
        _renderAll();
        _setStatus(`${_lastLoadLabel}. ${err.message}`);
        return;
      }
      console.error('[DepartmentAtlas] No se pudo cargar escuelas:', err);
      _renderEmpty(err.message || 'No se pudo cargar el padron territorial.');
      UI.showToast('No se pudo cargar el atlas departamental: ' + err.message, 'error', 7000);
    }
  }

  function selectDepartment(department) {
    _viewMode = VIEW_MODE_DEPARTMENT;
    const found = _departments.find(item => _sameDepartment(item.label, department));
    _selectedDepartment = found ? found.label : (department || 'Asuncion');
    _renderAll();
  }

  function setViewMode(mode) {
    _viewMode = mode === VIEW_MODE_DEPARTMENT ? VIEW_MODE_DEPARTMENT : VIEW_MODE_OVERVIEW;
    _renderAll();
  }

  function printPdf() {
    if (!_schools.length) {
      UI.showToast('El atlas todavia no tiene padron cargado para imprimir.', 'warning', 6000);
      return;
    }
    const root = document.getElementById('atlas-print-root');
    if (!root) return;
    root.innerHTML = [_printOverviewPage()]
      .concat(_departments.map(department => _printPage(department.label)))
      .join('');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('atlas-printing');
    setTimeout(() => window.print(), 120);
  }

  function _bindEvents() {
    const modeToggle = document.getElementById('atlas-mode-toggle');
    if (modeToggle && modeToggle.dataset.bound !== 'true') {
      modeToggle.dataset.bound = 'true';
      modeToggle.addEventListener('click', event => {
        const button = event.target.closest('[data-atlas-mode]');
        if (!button) return;
        setViewMode(button.dataset.atlasMode);
      });
    }

    const refreshBtn = document.getElementById('atlas-refresh-btn');
    if (refreshBtn && refreshBtn.dataset.bound !== 'true') {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', () => refresh({ forceNetwork: true }));
    }

    const printBtn = document.getElementById('atlas-print-btn');
    if (printBtn && printBtn.dataset.bound !== 'true') {
      printBtn.dataset.bound = 'true';
      printBtn.addEventListener('click', printPdf);
    }

    const buttons = document.getElementById('atlas-department-buttons');
    if (buttons && buttons.dataset.bound !== 'true') {
      buttons.dataset.bound = 'true';
      buttons.addEventListener('click', event => {
        const button = event.target.closest('[data-atlas-department]');
        if (!button) return;
        selectDepartment(button.dataset.atlasDepartment);
      });
    }

    const list = document.getElementById('atlas-school-list');
    if (list && list.dataset.bound !== 'true') {
      list.dataset.bound = 'true';
      list.addEventListener('click', event => {
        const button = event.target.closest('[data-atlas-sort]');
        if (button) {
          _toggleSort(button.dataset.atlasSort);
          return;
        }
        const openButton = event.target.closest('[data-atlas-open-department]');
        if (openButton) selectDepartment(openButton.dataset.atlasOpenDepartment);
      });
    }

    if (!_printListenerBound) {
      _printListenerBound = true;
      window.addEventListener('afterprint', _clearPrintMode);
    }
  }

  function _renderAll() {
    _renderModeToggle();
    _renderDepartmentButtons();
    if (_viewMode === VIEW_MODE_OVERVIEW) {
      const rows = _schools || [];
      const metrics = _metrics(rows);
      const summaries = _departmentSummaries(rows);
      _renderKpis(metrics, { mode: VIEW_MODE_OVERVIEW, departmentCount: summaries.length });
      _renderOverviewDetail(summaries, metrics);
      _renderMap(rows, { mode: VIEW_MODE_OVERVIEW, summaries });
      _setStatus(`${_lastLoadLabel || 'Padron cargado'}: ${_formatNumber(metrics.total)} escuelas en ${_formatNumber(summaries.length)} departamentos.`);
      return;
    }
    const rows = _schoolsForDepartment(_selectedDepartment);
    const metrics = _metrics(rows);
    _renderKpis(metrics, { mode: VIEW_MODE_DEPARTMENT });
    _renderDetail(rows, metrics);
    _renderMap(rows, { mode: VIEW_MODE_DEPARTMENT });
    _setStatus(`${_lastLoadLabel || 'Padron cargado'}: ${_formatNumber(_schools.length)} escuelas en el universo operativo.`);
  }

  function _renderModeToggle() {
    const container = document.getElementById('atlas-mode-toggle');
    if (!container) return;
    const buttons = [
      { mode: VIEW_MODE_OVERVIEW, label: 'Resumen nacional', note: 'Totales por departamento' },
      { mode: VIEW_MODE_DEPARTMENT, label: 'Por departamento', note: _selectedDepartment || 'Detalle territorial' },
    ];
    container.innerHTML = buttons.map(item => `
      <button
        type="button"
        class="atlas-mode-button${_viewMode === item.mode ? ' atlas-mode-button--active' : ''}"
        data-atlas-mode="${_escapeAttr(item.mode)}"
        aria-pressed="${_viewMode === item.mode ? 'true' : 'false'}">
        <strong>${_escape(item.label)}</strong>
        <span>${_escape(item.note)}</span>
      </button>`).join('');
  }

  function _renderDepartmentButtons() {
    const container = document.getElementById('atlas-department-buttons');
    if (!container) return;
    const counts = _departmentCounts(_schools);
    container.innerHTML = _departments.map(department => {
      const active = _sameDepartment(department.label, _selectedDepartment);
      const count = counts.get(department.key) || 0;
      return `
        <button
          type="button"
          class="atlas-department-button${active ? ' atlas-department-button--active' : ''}"
          data-atlas-department="${_escapeAttr(department.label)}"
          aria-pressed="${active ? 'true' : 'false'}">
          <span>${_escape(department.label)}</span>
          <strong>${_formatNumber(count)}</strong>
        </button>`;
    }).join('');
  }

  function _renderKpis(metrics, options = {}) {
    const mode = options.mode || VIEW_MODE_DEPARTMENT;
    const scopeLabel = mode === VIEW_MODE_OVERVIEW ? 'Registros de todos los departamentos' : 'Registros del departamento';
    const districtLabel = mode === VIEW_MODE_OVERVIEW
      ? `${_formatNumber(options.departmentCount || 0)} departamentos con padron`
      : 'Cobertura territorial';
    const grid = document.getElementById('atlas-kpi-grid');
    if (!grid) return;
    grid.innerHTML = [
      _kpi('Total operativo', metrics.total, scopeLabel, 'volume'),
      _kpi('Pendientes', metrics.pendiente, `${_formatPercent(metrics.pendingPct)} del total`, 'warning'),
      _kpi('Relevadas', metrics.finalizada, `${_formatPercent(metrics.progressPct)} de avance`, 'success'),
      _kpi('En curso', metrics.en_curso, 'Sesiones o borradores activos', 'info'),
      _kpi('En mapa', metrics.withCoords, `${_formatPercent(metrics.geoPct)} georreferenciado`, 'map'),
      _kpi('Sin marcador', metrics.withoutCoords, 'Requiere coordenadas validas', metrics.withoutCoords ? 'danger' : 'success'),
      _kpi('Incidencias', metrics.incidencia, 'Casos para seguimiento', metrics.incidencia ? 'danger' : 'muted'),
      _kpi(mode === VIEW_MODE_OVERVIEW ? 'Departamentos' : 'Distritos', mode === VIEW_MODE_OVERVIEW ? (options.departmentCount || 0) : metrics.districtCount, districtLabel, 'muted'),
    ].join('');
  }

  function _renderDetail(rows, metrics) {
    _setText('atlas-detail-title', _selectedDepartment || 'Departamento');
    _setText(
      'atlas-detail-summary',
      `${_formatNumber(metrics.total)} escuelas, ${_formatNumber(metrics.withCoords)} con marcador y ${_formatNumber(metrics.withoutCoords)} sin coordenadas validas.`
    );
    _renderStatusBars(metrics);
    _renderDistricts(rows, metrics);
    _renderSchoolList(rows);
  }

  function _renderOverviewDetail(summaries, metrics) {
    _setText('atlas-detail-title', 'Resumen nacional');
    _setText(
      'atlas-detail-summary',
      `${_formatNumber(metrics.total)} escuelas en ${_formatNumber(summaries.length)} departamentos. ${_formatNumber(metrics.withCoords)} con marcador y ${_formatNumber(metrics.withoutCoords)} sin coordenadas validas.`
    );
    _renderStatusBars(metrics);
    _renderOverviewDepartments(summaries);
    _renderOverviewTable(summaries);
  }

  function _renderStatusBars(metrics) {
    const container = document.getElementById('atlas-status-bars');
    if (!container) return;
    const rows = ['pendiente', 'en_curso', 'finalizada', 'incidencia']
      .filter(key => metrics[key] || key !== 'incidencia')
      .map(key => {
        const meta = STATE_META[key] || STATE_META.pendiente;
        const value = metrics[key] || 0;
        const pct = metrics.total ? Math.round((value / metrics.total) * 100) : 0;
        return `
          <div class="atlas-status-row">
            <span>${_escape(meta.label)}</span>
            <div class="atlas-status-track"><i style="width:${pct}%;background:${meta.color}"></i></div>
            <strong>${_formatNumber(value)}</strong>
          </div>`;
      });
    container.innerHTML = rows.join('');
  }

  function _renderDistricts(rows, metrics) {
    const container = document.getElementById('atlas-district-list');
    if (!container) return;
    const districts = _topGroups(rows, _schoolDistrict, 6);
    if (!districts.length) {
      container.innerHTML = '<p class="atlas-empty">Sin distritos cargados.</p>';
      return;
    }
    container.innerHTML = `
      <h4>Distritos principales</h4>
      ${districts.map(item => {
        const pct = metrics.total ? Math.round((item.count / metrics.total) * 100) : 0;
        return `
          <div class="atlas-district-row">
            <span>${_escape(item.label)}</span>
            <div class="atlas-status-track"><i style="width:${pct}%"></i></div>
            <strong>${_formatNumber(item.count)}</strong>
          </div>`;
      }).join('')}`;
  }

  function _renderOverviewDepartments(summaries) {
    const container = document.getElementById('atlas-district-list');
    if (!container) return;
    if (!summaries.length) {
      container.innerHTML = '<p class="atlas-empty">Sin departamentos cargados.</p>';
      return;
    }
    const visible = summaries.slice(0, 8);
    const maxTotal = Math.max(...visible.map(item => item.metrics.total), 1);
    container.innerHTML = `
      <h4>Departamentos con mayor carga</h4>
      ${visible.map(item => {
        const pct = Math.round((item.metrics.total / maxTotal) * 100);
        return `
          <div class="atlas-district-row">
            <span>${_escape(item.label)}</span>
            <div class="atlas-status-track"><i style="width:${pct}%;background:${STATE_META.finalizada.color}"></i></div>
            <strong>${_formatNumber(item.metrics.total)}</strong>
          </div>`;
      }).join('')}`;
  }

  function _renderSchoolList(rows) {
    const container = document.getElementById('atlas-school-list');
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = '<p class="atlas-empty">Sin escuelas registradas para este departamento.</p>';
      return;
    }
    const visible = _sortRows(rows)
      .slice(0, MAX_LIST_ROWS);
    container.innerHTML = `
      <h4>Escuelas</h4>
      <div class="atlas-school-table">
        <table>
          <thead>
            <tr>
              ${_sortHeader('code', 'Codigo')}
              ${_sortHeader('name', 'Escuela')}
              ${_sortHeader('district', 'Distrito / localidad')}
              ${_sortHeader('zone', 'Zona')}
              ${_sortHeader('state', 'Estado')}
              ${_sortHeader('map', 'Mapa')}
              ${_sortHeader('surveyor', 'Asignacion')}
            </tr>
          </thead>
          <tbody>
            ${visible.map(school => {
              const state = _schoolState(school);
              const meta = STATE_META[state] || STATE_META.pendiente;
              const point = _point(school);
              return `
                <tr>
                  <td>${_escape(_schoolCode(school) || '-')}</td>
                  <td><strong>${_escape(_schoolName(school))}</strong></td>
                  <td>${_escape(_schoolDistrict(school) || '-')}<small>${_escape(_schoolLocality(school) || '')}</small></td>
                  <td>${_escape(_schoolZone(school) || '-')}</td>
                  <td><span class="atlas-state-pill" style="background:${meta.color}">${_escape(meta.label)}</span></td>
                  <td>${point ? `Si<small>${_round(point.lat, 5)}, ${_round(point.lng, 5)}</small>` : 'No'}</td>
                  <td>${_escape(_schoolSurveyor(school) || 'Sin asignar')}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length > visible.length ? `<p class="atlas-list-note">Mostrando ${visible.length} de ${rows.length} escuelas.</p>` : ''}`;
  }

  function _renderOverviewTable(summaries) {
    const container = document.getElementById('atlas-school-list');
    if (!container) return;
    if (!summaries.length) {
      container.innerHTML = '<p class="atlas-empty">Sin departamentos para resumir.</p>';
      return;
    }
    const visible = summaries.slice(0, MAX_OVERVIEW_ROWS);
    container.innerHTML = `
      <h4>Totales por departamento</h4>
      <div class="atlas-school-table">
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Total</th>
              <th>Pend.</th>
              <th>Relevadas</th>
              <th>En curso</th>
              <th>En mapa</th>
              <th>Sin marcador</th>
              <th>Distritos</th>
            </tr>
          </thead>
          <tbody>
            ${visible.map(item => `
              <tr>
                <td>
                  <button type="button" class="atlas-link-button" data-atlas-open-department="${_escapeAttr(item.label)}">${_escape(item.label)}</button>
                  <small>${_escape(_summaryStatusLine(item.metrics))}</small>
                </td>
                <td><strong>${_formatNumber(item.metrics.total)}</strong></td>
                <td>${_formatNumber(item.metrics.pendiente)}</td>
                <td>${_formatNumber(item.metrics.finalizada)}</td>
                <td>${_formatNumber(item.metrics.en_curso)}</td>
                <td>${_formatNumber(item.metrics.withCoords)}</td>
                <td>${_formatNumber(item.metrics.withoutCoords)}</td>
                <td>${_formatNumber(item.metrics.districtCount)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="atlas-list-note">Pulse un departamento para abrir su mapa y su tabla detallada.</p>`;
  }

  function _sortHeader(key, label) {
    const active = _tableSort.key === key;
    const dir = active ? _tableSort.dir : 'none';
    const icon = active ? (_tableSort.dir === 'asc' ? 'Asc' : 'Desc') : 'Ordenar';
    return `
      <th aria-sort="${active ? (_tableSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">
        <button type="button" class="atlas-sort-button${active ? ' atlas-sort-button--active' : ''}" data-atlas-sort="${_escapeAttr(key)}">
          <span>${_escape(label)}</span>
          <small>${_escape(icon)}</small>
        </button>
      </th>`;
  }

  function _toggleSort(key) {
    if (!key) return;
    if (_tableSort.key === key) {
      _tableSort = { key, dir: _tableSort.dir === 'asc' ? 'desc' : 'asc' };
    } else {
      _tableSort = { key, dir: 'asc' };
    }
    _renderSchoolList(_schoolsForDepartment(_selectedDepartment));
  }

  function _sortRows(rows) {
    const dir = _tableSort.dir === 'desc' ? -1 : 1;
    return (rows || []).slice().sort((a, b) => {
      const valueA = _sortValue(a, _tableSort.key);
      const valueB = _sortValue(b, _tableSort.key);
      const cmp = _compareSortValues(valueA, valueB);
      if (cmp) return cmp * dir;
      return _schoolName(a).localeCompare(_schoolName(b), 'es', { numeric: true, sensitivity: 'base' });
    });
  }

  function _sortValue(school, key) {
    switch (key) {
      case 'code': return _schoolCode(school);
      case 'district': return `${_schoolDistrict(school)} ${_schoolLocality(school)}`;
      case 'zone': return _schoolZone(school);
      case 'state': return `${String(_stateSort(school)).padStart(2, '0')} ${_schoolState(school)}`;
      case 'map': return _point(school) ? 1 : 0;
      case 'surveyor': return _schoolSurveyor(school) || 'Sin asignar';
      case 'name':
      default:
        return _schoolName(school);
    }
  }

  function _compareSortValues(a, b) {
    const aNum = typeof a === 'number' ? a : Number.NaN;
    const bNum = typeof b === 'number' ? b : Number.NaN;
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true, sensitivity: 'base' });
  }

  function _renderMap(rows, options = {}) {
    const mapEl = document.getElementById('atlas-map');
    if (!mapEl || !window.L) return;
    if (!_map) {
      _map = L.map(mapEl, {
        zoomControl: true,
        preferCanvas: true,
        attributionControl: true,
      }).setView(_centerForDepartment(_selectedDepartment), 10);
      L.tileLayer(APP_CONFIG.TILE_URL, {
        attribution: APP_CONFIG.TILE_ATTRIBUTION,
        maxZoom: APP_CONFIG.MAP_MAX_ZOOM || 19,
      }).addTo(_map);
      L.control.scale({ imperial: false }).addTo(_map);
      _layer = L.layerGroup().addTo(_map);
    }
    if (!_layer) _layer = L.layerGroup().addTo(_map);
    _layer.clearLayers();

    if ((options.mode || VIEW_MODE_DEPARTMENT) === VIEW_MODE_OVERVIEW) {
      const summaries = Array.isArray(options.summaries) ? options.summaries : _departmentSummaries(rows);
      const points = summaries.map(summary => ({ summary, point: _summaryPoint(summary) })).filter(item => item.point);
      const maxTotal = Math.max(...summaries.map(item => item.metrics.total), 1);
      points.forEach(item => {
        const meta = _summaryMeta(item.summary);
        const radius = 8 + Math.round((item.summary.metrics.total / maxTotal) * 12);
        const marker = L.circleMarker([item.point.lat, item.point.lng], {
          radius,
          stroke: true,
          color: '#ffffff',
          weight: 1.8,
          fillColor: meta.color,
          fillOpacity: 0.8,
        });
        marker.bindPopup(_departmentPopup(item.summary, meta), { maxWidth: 280 });
        marker.addTo(_layer);
      });
      requestAnimationFrame(() => {
        _map.invalidateSize();
        if (points.length > 1) {
          const bounds = L.latLngBounds(points.map(item => [item.point.lat, item.point.lng]));
          _map.fitBounds(bounds.pad(0.18), { maxZoom: 8 });
        } else {
          _map.setView(APP_CONFIG.MAP_CENTER || [-23.4, -58.0], APP_CONFIG.MAP_ZOOM || 7);
        }
      });
      return;
    }

    const points = rows.map(school => ({ school, point: _point(school) })).filter(item => item.point);
    points.forEach(item => {
      const state = _schoolState(item.school);
      const meta = STATE_META[state] || STATE_META.pendiente;
      const marker = L.circleMarker([item.point.lat, item.point.lng], {
        radius: 7,
        stroke: true,
        color: '#ffffff',
        weight: 1.6,
        fillColor: meta.color,
        fillOpacity: 0.88,
      });
      marker.bindPopup(_popup(item.school, meta), { maxWidth: 260 });
      marker.addTo(_layer);
    });

    requestAnimationFrame(() => {
      _map.invalidateSize();
      if (points.length > 1) {
        const bounds = L.latLngBounds(points.map(item => [item.point.lat, item.point.lng]));
        _map.fitBounds(bounds.pad(0.16), { maxZoom: 12 });
      } else if (points.length === 1) {
        _map.setView([points[0].point.lat, points[0].point.lng], 12);
      } else {
        _map.setView(_centerForDepartment(_selectedDepartment), _sameDepartment(_selectedDepartment, 'Asuncion') ? 11 : 8);
      }
    });
  }

  function _printOverviewPage() {
    const summaries = _departmentSummaries(_schools || []);
    const metrics = _metrics(_schools || []);
    return `
      <section class="atlas-print-page">
        <header class="atlas-print-header">
          <div>
            <span>CIALPA - Atlas departamental</span>
            <h1>Resumen nacional</h1>
          </div>
          <div>
            <strong>${_escape(APP_CONFIG.VERSION || 'v2.6.202')}</strong>
            <small>${_escape(_formatDateTime(new Date()))}</small>
          </div>
        </header>

        <div class="atlas-print-kpis">
          ${_printKpi('Total', metrics.total)}
          ${_printKpi('Departamentos', summaries.length)}
          ${_printKpi('Pendientes', metrics.pendiente)}
          ${_printKpi('Relevadas', metrics.finalizada)}
          ${_printKpi('En curso', metrics.en_curso)}
          ${_printKpi('En mapa', metrics.withCoords)}
          ${_printKpi('Sin marcador', metrics.withoutCoords)}
          ${_printKpi('Incidencias', metrics.incidencia)}
        </div>

        <div class="atlas-print-grid">
          ${_renderOverviewPrintMap(summaries)}
          <aside class="atlas-print-side">
            <h2>Totales por departamento</h2>
            ${_printDepartmentRows(summaries)}
            <h2>Lectura GIS</h2>
            <p>Esta hoja resume todo el pais al mismo tiempo con un marcador agregado por departamento y totales operativos comparables.</p>
          </aside>
        </div>

        <footer class="atlas-print-footer">
          Fuente: padron operativo CIALPA disponible en la app. Los totales se agrupan por departamento y los puntos usan centroide aproximado de cobertura.
        </footer>
      </section>`;
  }

  function _printPage(department) {
    const rows = _schoolsForDepartment(department);
    const metrics = _metrics(rows);
    return `
      <section class="atlas-print-page">
        <header class="atlas-print-header">
          <div>
            <span>CIALPA - Atlas departamental</span>
            <h1>${_escape(department)}</h1>
          </div>
          <div>
            <strong>${_escape(APP_CONFIG.VERSION || 'v2.6.202')}</strong>
            <small>${_escape(_formatDateTime(new Date()))}</small>
          </div>
        </header>

        <div class="atlas-print-kpis">
          ${_printKpi('Total', metrics.total)}
          ${_printKpi('Pendientes', metrics.pendiente)}
          ${_printKpi('Relevadas', metrics.finalizada)}
          ${_printKpi('En curso', metrics.en_curso)}
          ${_printKpi('En mapa', metrics.withCoords)}
          ${_printKpi('Sin marcador', metrics.withoutCoords)}
          ${_printKpi('Avance', _formatPercent(metrics.progressPct))}
          ${_printKpi('Incidencias', metrics.incidencia)}
        </div>

        <div class="atlas-print-grid">
          ${_renderPrintMap(rows, department)}
          <aside class="atlas-print-side">
            <h2>Estado operativo</h2>
            ${_printStatusRows(metrics)}
            <h2>Distritos principales</h2>
            ${_printDistrictRows(rows)}
            <h2>Lectura GIS</h2>
            <p>Total operativo: ${_formatNumber(metrics.total)}. Marcadores imprimibles: ${_formatNumber(metrics.withCoords)}. Sin coordenadas validas: ${_formatNumber(metrics.withoutCoords)}.</p>
          </aside>
        </div>

        <footer class="atlas-print-footer">
          Fuente: padron operativo CIALPA disponible en la app. La capa impresa usa puntos con latitud/longitud validas.
        </footer>
      </section>`;
  }

  function _renderPrintMap(rows, department) {
    const points = rows.map(school => ({ school, point: _point(school) })).filter(item => item.point);
    if (!points.length) {
      return `
        <div class="atlas-print-map atlas-print-map--empty">
          <strong>${_escape(department)}</strong>
          <span>Sin coordenadas validas para imprimir mapa de puntos.</span>
        </div>`;
    }

    const bounds = _pointBounds(points.map(item => item.point));
    const circles = points.map(item => {
      const x = _scale(item.point.lng, bounds.minLng, bounds.maxLng, SVG_PAD, SVG_WIDTH - SVG_PAD);
      const y = _scale(item.point.lat, bounds.maxLat, bounds.minLat, SVG_PAD, SVG_HEIGHT - SVG_PAD);
      const meta = STATE_META[_schoolState(item.school)] || STATE_META.pendiente;
      return `<circle cx="${_round(x)}" cy="${_round(y)}" r="5.5" fill="${meta.color}" stroke="#ffffff" stroke-width="1.2" />`;
    }).join('');

    return `
      <div class="atlas-print-map">
        <svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Mapa impreso ${_escapeAttr(department)}">
          <rect x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="10" fill="#f8fafc" />
          <path d="M${SVG_PAD} ${SVG_PAD}H${SVG_WIDTH - SVG_PAD}V${SVG_HEIGHT - SVG_PAD}H${SVG_PAD}Z" fill="#ffffff" stroke="#cbd5e1" />
          ${_gridLines()}
          ${circles}
        </svg>
        <div class="atlas-print-legend">${_legendHtml()}</div>
      </div>`;
  }

  function _renderOverviewPrintMap(summaries) {
    const points = summaries.map(summary => ({ summary, point: _summaryPoint(summary) })).filter(item => item.point);
    if (!points.length) {
      return `
        <div class="atlas-print-map atlas-print-map--empty">
          <strong>Resumen nacional</strong>
          <span>Sin coordenadas validas para imprimir el resumen del pais.</span>
        </div>`;
    }
    const bounds = _pointBounds(points.map(item => item.point));
    const circles = points.map(item => {
      const x = _scale(item.point.lng, bounds.minLng, bounds.maxLng, SVG_PAD, SVG_WIDTH - SVG_PAD);
      const y = _scale(item.point.lat, bounds.maxLat, bounds.minLat, SVG_PAD, SVG_HEIGHT - SVG_PAD);
      const meta = _summaryMeta(item.summary);
      const radius = 7 + Math.round((item.summary.metrics.total / Math.max(...summaries.map(row => row.metrics.total), 1)) * 8);
      return `
        <circle cx="${_round(x)}" cy="${_round(y)}" r="${radius}" fill="${meta.color}" fill-opacity="0.82" stroke="#ffffff" stroke-width="1.4" />
        <text x="${_round(x)}" y="${_round(y + 0.8)}" font-size="9" text-anchor="middle" fill="#0f172a">${_escape(item.summary.label.slice(0, 3).toUpperCase())}</text>`;
    }).join('');
    return `
      <div class="atlas-print-map">
        <svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Mapa impreso resumen nacional">
          <rect x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="10" fill="#f8fafc" />
          <path d="M${SVG_PAD} ${SVG_PAD}H${SVG_WIDTH - SVG_PAD}V${SVG_HEIGHT - SVG_PAD}H${SVG_PAD}Z" fill="#ffffff" stroke="#cbd5e1" />
          ${_gridLines()}
          ${circles}
        </svg>
        <div class="atlas-print-legend">${_legendHtml()}</div>
      </div>`;
  }

  function _printStatusRows(metrics) {
    return ['pendiente', 'en_curso', 'finalizada', 'incidencia'].map(key => {
      const meta = STATE_META[key] || STATE_META.pendiente;
      const value = metrics[key] || 0;
      const pct = metrics.total ? Math.round((value / metrics.total) * 100) : 0;
      return `
        <div class="atlas-print-row">
          <span><i style="background:${meta.color}"></i>${_escape(meta.label)}</span>
          <strong>${_formatNumber(value)} (${pct}%)</strong>
        </div>`;
    }).join('');
  }

  function _printDistrictRows(rows) {
    const groups = _topGroups(rows, _schoolDistrict, 6);
    if (!groups.length) return '<p>Sin distritos cargados.</p>';
    return groups.map(item => `
      <div class="atlas-print-row">
        <span>${_escape(item.label)}</span>
        <strong>${_formatNumber(item.count)}</strong>
      </div>`).join('');
  }

  function _printDepartmentRows(summaries) {
    if (!summaries.length) return '<p>Sin departamentos cargados.</p>';
    return summaries.map(item => `
      <div class="atlas-print-row">
        <span>${_escape(item.label)}</span>
        <strong>${_formatNumber(item.metrics.total)}</strong>
      </div>`).join('');
  }

  function _buildDepartmentList(schools) {
    const configured = ['Asuncion']
      .concat((APP_CONFIG.DEPARTAMENTOS || []).filter(item => !_sameDepartment(item, 'Asuncion')));
    const byKey = new Map();
    configured.forEach(label => {
      const key = _departmentKey(label);
      if (key) byKey.set(key, { key, label: _displayDepartment(label) });
    });
    (schools || []).forEach(school => {
      const label = _schoolDepartment(school);
      const key = _departmentKey(label);
      if (key && !byKey.has(key)) byKey.set(key, { key, label: _displayDepartment(label) });
    });
    return Array.from(byKey.values());
  }

  function _ensureSelectedDepartment() {
    const match = _departments.find(item => _sameDepartment(item.label, _selectedDepartment))
      || _departments.find(item => _sameDepartment(item.label, 'Asuncion'))
      || _departments[0];
    _selectedDepartment = match?.label || 'Asuncion';
  }

  function _departmentCounts(schools) {
    return (schools || []).reduce((map, school) => {
      const key = _departmentKey(_schoolDepartment(school));
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
  }

  function _schoolsForDepartment(department) {
    return (_schools || []).filter(school => _sameDepartment(_schoolDepartment(school), department));
  }

  function _departmentSummaries(schools) {
    const byDepartment = new Map();
    (schools || []).forEach(school => {
      const label = _displayDepartment(_schoolDepartment(school));
      const key = _departmentKey(label);
      if (!key) return;
      if (!byDepartment.has(key)) byDepartment.set(key, { key, label, schools: [] });
      byDepartment.get(key).schools.push(school);
    });
    return Array.from(byDepartment.values())
      .map(item => ({ ...item, metrics: _metrics(item.schools) }))
      .sort((a, b) => b.metrics.total - a.metrics.total || a.label.localeCompare(b.label, 'es'));
  }

  function _metrics(rows) {
    const metrics = {
      total: rows.length,
      pendiente: 0,
      en_curso: 0,
      finalizada: 0,
      incidencia: 0,
      withCoords: 0,
      withoutCoords: 0,
      districtCount: 0,
      progressPct: 0,
      pendingPct: 0,
      geoPct: 0,
    };
    const districts = new Set();
    rows.forEach(school => {
      const state = _schoolState(school);
      if (metrics[state] !== undefined) metrics[state] += 1;
      if (_point(school)) metrics.withCoords += 1;
      const district = _compactKey(_schoolDistrict(school));
      if (district) districts.add(district);
    });
    metrics.withoutCoords = Math.max(0, metrics.total - metrics.withCoords);
    metrics.districtCount = districts.size;
    metrics.progressPct = metrics.total ? metrics.finalizada / metrics.total : 0;
    metrics.pendingPct = metrics.total ? metrics.pendiente / metrics.total : 0;
    metrics.geoPct = metrics.total ? metrics.withCoords / metrics.total : 0;
    return metrics;
  }

  function _topGroups(rows, getter, limit) {
    const map = new Map();
    rows.forEach(row => {
      const label = String(getter(row) || 'Sin dato').trim() || 'Sin dato';
      const key = _compactKey(label) || label.toLowerCase();
      if (!map.has(key)) map.set(key, { label, count: 0 });
      map.get(key).count += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
      .slice(0, limit);
  }

  function _point(school) {
    const lat = _toNumber(school?.latitud ?? school?.lat ?? school?.latitude);
    const lng = _toNumber(school?.longitud ?? school?.lng ?? school?.lon ?? school?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -29 || lat > -18 || lng < -63.5 || lng > -52.5) return null;
    return { lat, lng };
  }

  function _pointBounds(points) {
    let minLat = Math.min(...points.map(point => point.lat));
    let maxLat = Math.max(...points.map(point => point.lat));
    let minLng = Math.min(...points.map(point => point.lng));
    let maxLng = Math.max(...points.map(point => point.lng));
    if (Math.abs(maxLat - minLat) < 0.01) {
      minLat -= 0.01;
      maxLat += 0.01;
    }
    if (Math.abs(maxLng - minLng) < 0.01) {
      minLng -= 0.01;
      maxLng += 0.01;
    }
    return { minLat, maxLat, minLng, maxLng };
  }

  function _scale(value, min, max, outMin, outMax) {
    if (max === min) return (outMin + outMax) / 2;
    return outMin + ((value - min) / (max - min)) * (outMax - outMin);
  }

  function _gridLines() {
    const xs = [0.25, 0.5, 0.75].map(pct => SVG_PAD + pct * (SVG_WIDTH - 2 * SVG_PAD));
    const ys = [0.25, 0.5, 0.75].map(pct => SVG_PAD + pct * (SVG_HEIGHT - 2 * SVG_PAD));
    return [
      ...xs.map(x => `<line x1="${_round(x)}" y1="${SVG_PAD}" x2="${_round(x)}" y2="${SVG_HEIGHT - SVG_PAD}" stroke="#e2e8f0" stroke-width="1" />`),
      ...ys.map(y => `<line x1="${SVG_PAD}" y1="${_round(y)}" x2="${SVG_WIDTH - SVG_PAD}" y2="${_round(y)}" stroke="#e2e8f0" stroke-width="1" />`),
    ].join('');
  }

  function _legendHtml() {
    return ['pendiente', 'en_curso', 'finalizada', 'incidencia'].map(key => {
      const meta = STATE_META[key];
      return `<span><i style="background:${meta.color}"></i>${_escape(meta.label)}</span>`;
    }).join('');
  }

  function _summaryPoint(summary) {
    const points = (summary?.schools || []).map(_point).filter(Boolean);
    if (points.length) {
      const lat = points.reduce((acc, point) => acc + point.lat, 0) / points.length;
      const lng = points.reduce((acc, point) => acc + point.lng, 0) / points.length;
      return { lat: _round(lat, 6), lng: _round(lng, 6) };
    }
    const center = _centerForDepartment(summary?.label);
    if (!Array.isArray(center) || center.length < 2) return null;
    return { lat: Number(center[0]), lng: Number(center[1]) };
  }

  function _summaryMeta(summary) {
    if ((summary?.metrics?.incidencia || 0) > 0) return STATE_META.incidencia;
    if ((summary?.metrics?.pendiente || 0) >= (summary?.metrics?.finalizada || 0)) return STATE_META.pendiente;
    if ((summary?.metrics?.en_curso || 0) > 0) return STATE_META.en_curso;
    return STATE_META.finalizada;
  }

  function _departmentPopup(summary, meta) {
    const point = _summaryPoint(summary);
    return `
      <div class="atlas-popup">
        <strong>${_escape(summary?.label || 'Departamento')}</strong>
        <small>${_formatNumber(summary?.metrics?.districtCount || 0)} distritos</small>
        <span style="background:${meta.color}">${_escape(meta.label)}</span>
        <p>Total: ${_formatNumber(summary?.metrics?.total || 0)} | En mapa: ${_formatNumber(summary?.metrics?.withCoords || 0)}</p>
        <p>Pendientes: ${_formatNumber(summary?.metrics?.pendiente || 0)} | Relevadas: ${_formatNumber(summary?.metrics?.finalizada || 0)}</p>
        ${point ? `<p>${_round(point.lat, 4)}, ${_round(point.lng, 4)}</p>` : ''}
      </div>`;
  }

  function _summaryStatusLine(metrics) {
    return `${_formatNumber(metrics.finalizada)} relevadas, ${_formatNumber(metrics.pendiente)} pendientes, ${_formatNumber(metrics.withCoords)} en mapa`;
  }

  function _popup(school, meta) {
    const point = _point(school);
    return `
      <div class="atlas-popup">
        <strong>${_escape(_schoolName(school))}</strong>
        <small>${_escape(_schoolCode(school))}</small>
        <span style="background:${meta.color}">${_escape(meta.label)}</span>
        <p>${_escape(_schoolDistrict(school) || '-')} - ${_escape(_schoolZone(school) || '-')}</p>
        ${point ? `<p>${_round(point.lat, 5)}, ${_round(point.lng, 5)}</p>` : ''}
      </div>`;
  }

  function _kpi(label, value, note, tone) {
    return `
      <article class="atlas-kpi atlas-kpi--${_escapeAttr(tone || 'muted')}">
        <span>${_escape(label)}</span>
        <strong>${typeof value === 'number' ? _formatNumber(value) : _escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _printKpi(label, value) {
    return `
      <article>
        <span>${_escape(label)}</span>
        <strong>${typeof value === 'number' ? _formatNumber(value) : _escape(value)}</strong>
      </article>`;
  }

  function _centerForDepartment(department) {
    return DEPARTMENT_CENTERS[_departmentKey(department)] || APP_CONFIG.MAP_CENTER || [-23.4, -58.0];
  }

  function _schoolDepartment(school) {
    return String(school?.departamento || school?.departamento_nombre || school?.depto || '').trim();
  }

  function _schoolDistrict(school) {
    return String(school?.distrito || school?.distrito_nombre || '').trim();
  }

  function _schoolZone(school) {
    return String(school?.zona || school?.area || '').trim();
  }

  function _schoolLocality(school) {
    return String(school?.localidad || school?.barrio || school?.compania || '').trim();
  }

  function _schoolSurveyor(school) {
    try {
      if (typeof Auth !== 'undefined' && typeof Auth.schoolAssignmentLabel === 'function') {
        const label = Auth.schoolAssignmentLabel(school);
        if (label) return String(label).trim();
      }
    } catch (_) {
      // Optional helper only.
    }
    return String(school?.encuestador_asignado || school?.usuario_encuestador || school?.ultimo_borrador_mec_usuario || school?.usuario || '').trim();
  }

  function _schoolName(school) {
    return String(school?.nombre || school?.nombre_institucion || school?.institucion || 'Escuela sin nombre').trim();
  }

  function _schoolCode(school) {
    return String(school?.codigo_local || school?.codigo_establecimiento || school?.id_escuela || school?.id || '').trim();
  }

  function _schoolState(school) {
    return _canonicalState(school?.estado_relevamiento || school?.estado || school?.estado_borrador || school?.estado_cierre || school?.mec_draft_status || 'pendiente');
  }

  function _canonicalState(value) {
    const text = _normalize(value || 'pendiente');
    if (text.includes('final') || text.includes('cerrad') || text.includes('complet')) return 'finalizada';
    if (text.includes('curso') || text.includes('proceso') || text.includes('avance')) return 'en_curso';
    if (text.includes('inci') || text.includes('problema') || text.includes('observ')) return 'incidencia';
    if (text.includes('parc') || text.includes('borrador')) return 'parcial';
    if (text.includes('susp') || text.includes('pausa')) return 'suspendida';
    if (text.includes('rev')) return 'revisar';
    if (text.includes('pend')) return 'pendiente';
    return STATE_META[text] ? text : 'pendiente';
  }

  function _stateSort(school) {
    return { incidencia: 0, pendiente: 1, en_curso: 2, parcial: 3, revisar: 4, suspendida: 5, finalizada: 6 }[_schoolState(school)] ?? 9;
  }

  function _fallbackSchools() {
    try {
      if (typeof MapModule !== 'undefined' && typeof MapModule.getEscuelas === 'function') {
        const rows = MapModule.getEscuelas();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (_) {
      return [];
    }
    return [];
  }

  function _setAccessDenied() {
    const panel = document.querySelector('#module-atlas .page-content');
    if (panel) panel.innerHTML = '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
  }

  function _renderEmpty(message) {
    _setStatus(message);
    _setHtml('atlas-department-buttons', '');
    _setHtml('atlas-kpi-grid', _kpi('Total operativo', 0, 'Sin padron cargado', 'muted'));
    _setText('atlas-detail-title', 'Atlas departamental');
    _setText('atlas-detail-summary', message);
    _setHtml('atlas-status-bars', '');
    _setHtml('atlas-district-list', '');
    _setHtml('atlas-school-list', '<p class="atlas-empty">Sin datos para mostrar.</p>');
  }

  function _setStatus(message) {
    _setText('atlas-status', message || '');
  }

  function _clearPrintMode() {
    document.body.classList.remove('atlas-printing');
    const root = document.getElementById('atlas-print-root');
    if (root) root.setAttribute('aria-hidden', 'true');
  }

  function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _setHtml(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function _departmentKey(value) {
    const key = _compactKey(value);
    return DEPARTMENT_ALIASES[key] || key;
  }

  function _sameDepartment(a, b) {
    return _departmentKey(a) === _departmentKey(b);
  }

  function _displayDepartment(value) {
    const text = String(value || '').trim();
    if (_sameDepartment(text, 'Asuncion')) return 'Asuncion';
    return text || 'Sin departamento';
  }

  function _compactKey(value) {
    return _normalize(value).replace(/[^a-z0-9]/g, '');
  }

  function _normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function _toNumber(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const num = Number(String(value).replace(',', '.').trim());
    return Number.isFinite(num) ? num : NaN;
  }

  function _formatNumber(value) {
    return Number(value || 0).toLocaleString('es-PY');
  }

  function _formatPercent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
  }

  function _formatDateTime(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
  }

  function _round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function _escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _escapeAttr(value) {
    return _escape(value).replace(/`/g, '&#096;');
  }

  return {
    init,
    refresh,
    setViewMode,
    selectDepartment,
    printPdf,
  };
})();
