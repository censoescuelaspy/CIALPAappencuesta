/**
 * CIALPA — Relevamiento Escolar
 * map.js — Leaflet map module
 * Version: 2.0.0
 */

const MapModule = (() => {
  'use strict';

  let _map = null;
  let _markerCluster = null;
  let _markers = {};       // { id_escuela: L.marker }
  let _escuelas = [];
  let _filteredEscuelas = [];
  let _activeFilters = {};
  let _selectedEscuela = null;

  // ── Icon factory ──────────────────────────────────────────────────────────

  function _getIcon(estado) {
    const colors = APP_CONFIG.STATE_COLORS;
    const color = colors[estado] || colors.pendiente;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="#fff" fill-opacity="0.85"/>
    </svg>`;
    return L.divIcon({
      className: '',
      html: svg,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36],
    });
  }

  // ── Popup builder ─────────────────────────────────────────────────────────

  function _buildPopup(e) {
    const estadoLabel = APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento;
    const estadoColor = APP_CONFIG.STATE_COLORS[e.estado_relevamiento] || '#6c757d';
    const canSurvey = Auth.canAccess('encuestador');

    return `
      <div class="map-popup">
        <div class="map-popup__header">
          <strong>${e.nombre}</strong>
          <span class="badge" style="background:${estadoColor}">${estadoLabel}</span>
        </div>
        <div class="map-popup__body">
          <p><b>Código:</b> ${e.codigo_local || '—'}</p>
          <p><b>Departamento:</b> ${e.departamento || '—'}</p>
          <p><b>Distrito:</b> ${e.distrito || '—'}</p>
          <p><b>Localidad:</b> ${e.localidad || '—'}</p>
          <p><b>Zona:</b> ${e.zona || '—'}</p>
          <p><b>Encuestador:</b> ${e.encuestador_asignado || 'No asignado'}</p>
          ${e.fecha_ultimo_evento ? `<p><b>Último evento:</b> ${e.fecha_ultimo_evento}</p>` : ''}
          ${e.observaciones ? `<p><b>Observaciones:</b> ${e.observaciones}</p>` : ''}
        </div>
        <div class="map-popup__actions">
          ${canSurvey ? `<button class="btn btn-primary btn-sm" onclick="SurveyModule.selectEscuela('${e.id_escuela}')">Aplicar Encuesta</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="MapModule.focusListItem('${e.id_escuela}')">Ver en lista</button>
        </div>
      </div>`;
  }

  // ── Map initialization ────────────────────────────────────────────────────

  function initMap(containerId = 'map-container') {
    if (_map) {
      _map.remove();
      _map = null;
    }

    _map = L.map(containerId, {
      center: APP_CONFIG.MAP_CENTER,
      zoom: APP_CONFIG.MAP_ZOOM,
      minZoom: APP_CONFIG.MAP_MIN_ZOOM,
      maxZoom: APP_CONFIG.MAP_MAX_ZOOM,
      zoomControl: true,
    });

    // Base tile layer
    L.tileLayer(APP_CONFIG.TILE_URL, {
      attribution: APP_CONFIG.TILE_ATTRIBUTION,
      maxZoom: APP_CONFIG.MAP_MAX_ZOOM,
    }).addTo(_map);

    // Satellite layer option
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 18 }
    );

    L.control.layers(
      {
        'Mapa base (OSM)': L.tileLayer(APP_CONFIG.TILE_URL, { attribution: APP_CONFIG.TILE_ATTRIBUTION }),
        'Satélite (Esri)': satellite,
      },
      {},
      { position: 'topright' }
    ).addTo(_map);

    // Marker cluster group
    _markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount();
        let cls = 'cluster-small';
        if (count > 50) cls = 'cluster-large';
        else if (count > 10) cls = 'cluster-medium';
        return L.divIcon({
          html: `<div class="${cls}"><span>${count}</span></div>`,
          className: 'marker-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    _map.addLayer(_markerCluster);

    // Scale control
    L.control.scale({ imperial: false }).addTo(_map);

    return _map;
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  function loadMarkers(escuelas) {
    _escuelas = escuelas || [];
    _filteredEscuelas = [..._escuelas];
    _markers = {};

    _markerCluster.clearLayers();

    _escuelas.forEach(e => {
      const lat = parseFloat(e.latitud);
      const lng = parseFloat(e.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: _getIcon(e.estado_relevamiento) });
      marker.bindPopup(_buildPopup(e), { maxWidth: 300 });
      marker.escuelaId = e.id_escuela;

      marker.on('click', () => {
        _selectedEscuela = e;
        _highlightListItem(e.id_escuela);
        _updateInfoPanel(e);
      });

      _markers[e.id_escuela] = marker;
      _markerCluster.addLayer(marker);
    });

    _renderList(_escuelas);
    _updateSummaryBadges(_escuelas);
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  function applyFilters(filters) {
    _activeFilters = { ...filters };
    _filteredEscuelas = _escuelas.filter(e => {
      if (filters.departamento && e.departamento !== filters.departamento) return false;
      if (filters.distrito && e.distrito !== filters.distrito) return false;
      if (filters.zona && e.zona !== filters.zona) return false;
      if (filters.encuestador && e.encuestador_asignado !== filters.encuestador) return false;
      if (filters.estado && e.estado_relevamiento !== filters.estado) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const haystack = `${e.nombre} ${e.codigo_local} ${e.localidad}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Toggle marker visibility via cluster
    _markerCluster.clearLayers();
    const filteredIds = new Set(_filteredEscuelas.map(e => e.id_escuela));
    Object.entries(_markers).forEach(([id, marker]) => {
      if (filteredIds.has(id)) _markerCluster.addLayer(marker);
    });

    _renderList(_filteredEscuelas);
    _updateSummaryBadges(_filteredEscuelas);
  }

  function clearFilters() {
    _activeFilters = {};
    applyFilters({});
  }

  // ── Sidebar list ──────────────────────────────────────────────────────────

  function _renderList(escuelas) {
    const container = document.getElementById('map-school-list');
    if (!container) return;

    if (escuelas.length === 0) {
      container.innerHTML = '<p class="map-list__empty">No hay escuelas que coincidan con los filtros.</p>';
      return;
    }

    container.innerHTML = escuelas.map(e => {
      const estadoColor = APP_CONFIG.STATE_COLORS[e.estado_relevamiento] || '#6c757d';
      const estadoLabel = APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento;
      return `
        <div class="map-list-item" data-id="${e.id_escuela}" onclick="MapModule.flyTo('${e.id_escuela}')">
          <span class="map-list-item__dot" style="background:${estadoColor}"></span>
          <div class="map-list-item__info">
            <strong>${e.nombre}</strong>
            <small>${e.distrito || ''} · ${e.zona || ''}</small>
          </div>
          <span class="map-list-item__badge" style="background:${estadoColor}">${estadoLabel}</span>
        </div>`;
    }).join('');
  }

  function _highlightListItem(id) {
    document.querySelectorAll('.map-list-item').forEach(el => {
      el.classList.toggle('map-list-item--active', el.dataset.id === id);
    });
    const active = document.querySelector(`.map-list-item[data-id="${id}"]`);
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function _updateInfoPanel(e) {
    const panel = document.getElementById('map-info-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="map-info-card">
        <h4>${e.nombre}</h4>
        <p><b>Código:</b> ${e.codigo_local || '—'}</p>
        <p><b>Departamento:</b> ${e.departamento || '—'}</p>
        <p><b>Distrito:</b> ${e.distrito || '—'}</p>
        <p><b>Zona:</b> ${e.zona || '—'}</p>
        <p><b>Encuestador:</b> ${e.encuestador_asignado || 'No asignado'}</p>
        <p><b>Estado:</b> <span class="badge badge--${e.estado_relevamiento}">${APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento}</span></p>
        ${Auth.canAccess('encuestador') ? `<button class="btn btn-primary btn-block mt-2" onclick="SurveyModule.selectEscuela('${e.id_escuela}')">Aplicar Encuesta</button>` : ''}
      </div>`;
    panel.classList.add('map-info-panel--visible');
  }

  function _updateSummaryBadges(escuelas) {
    const counts = { pendiente: 0, en_curso: 0, finalizada: 0, incidencia: 0 };
    escuelas.forEach(e => {
      if (counts[e.estado_relevamiento] !== undefined) counts[e.estado_relevamiento]++;
    });
    Object.entries(counts).forEach(([key, val]) => {
      const el = document.getElementById(`map-count-${key}`);
      if (el) el.textContent = val;
    });
    const total = document.getElementById('map-count-total');
    if (total) total.textContent = escuelas.length;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function flyTo(id) {
    const marker = _markers[id];
    if (!marker) return;
    _map.flyTo(marker.getLatLng(), 14, { animate: true, duration: 0.8 });
    setTimeout(() => marker.openPopup(), 900);
    _highlightListItem(id);
    const escuela = _escuelas.find(e => e.id_escuela === id);
    if (escuela) _updateInfoPanel(escuela);
  }

  function focusListItem(id) {
    _highlightListItem(id);
    AppController.showModule('mapa');
  }

  function invalidateSize() {
    if (_map) _map.invalidateSize();
  }

  function getMap() {
    return _map;
  }

  function getEscuelas() {
    return _escuelas;
  }

  function getFiltered() {
    return _filteredEscuelas;
  }

  // ── Populate filter dropdowns ─────────────────────────────────────────────

  function populateFilterDropdowns() {
    const departamentos = [...new Set(_escuelas.map(e => e.departamento).filter(Boolean))].sort();
    const encuestadores = [...new Set(_escuelas.map(e => e.encuestador_asignado).filter(Boolean))].sort();

    _populateSelect('filter-departamento', departamentos, 'Todos los departamentos');
    _populateSelect('filter-encuestador', encuestadores, 'Todos los encuestadores');
  }

  function _populateSelect(id, options, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      options.map(o => `<option value="${o}">${o}</option>`).join('');
  }

  return {
    initMap,
    loadMarkers,
    applyFilters,
    clearFilters,
    flyTo,
    focusListItem,
    invalidateSize,
    getMap,
    getEscuelas,
    getFiltered,
    populateFilterDropdowns,
  };
})();
