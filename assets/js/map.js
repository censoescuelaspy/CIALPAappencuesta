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
  let _routeLayer = null;
  let _routesVisible = true;

  const _PALETTE = ['#2b6cb0', '#2f855a', '#b7791f', '#805ad5', '#c05621', '#0f766e', '#b83280', '#4a5568', '#2563eb', '#16a34a'];

  // ── Icon factory ──────────────────────────────────────────────────────────

  function _hash(str) {
    return String(str || '').split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) >>> 0, 0);
  }

  function _surveyorName(e) {
    return e.encuestador_asignado || 'Sin asignar';
  }

  function _surveyorColor(name) {
    if (!name || name === 'Sin asignar') return '#94a3b8';
    return _PALETTE[_hash(name) % _PALETTE.length];
  }

  function _isClosed(e) {
    return ['finalizada', 'cerrada', 'completada'].includes(String(e.estado_relevamiento || '').toLowerCase());
  }

  function _getIcon(e) {
    const name = _surveyorName(e);
    const color = _surveyorColor(name);
    const opacity = _isClosed(e) ? 1 : 0.38;
    const stroke = _isClosed(e) ? '#172033' : '#ffffff';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="2"/>
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
          ${canSurvey ? `<button class="btn btn-primary btn-sm" onclick="SurveyModule.selectEscuela('${e.id_escuela}')">Migrar datos al RUE-MEC</button>` : ''}
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

    const osm = L.tileLayer(APP_CONFIG.TILE_URL, {
      attribution: APP_CONFIG.TILE_ATTRIBUTION,
      maxZoom: APP_CONFIG.MAP_MAX_ZOOM,
    }).addTo(_map);

    const roads = L.tileLayer(
      'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap contributors, HOT', maxZoom: 19 }
    );

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 18 }
    );

    L.control.layers(
      {
        'Mapa base (OSM)': osm,
        'Caminos y accesos (OSM HOT)': roads,
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
    _routeLayer = L.layerGroup().addTo(_map);

    // Scale control
    L.control.scale({ imperial: false }).addTo(_map);

    return _map;
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  function loadMarkers(escuelas) {
    _escuelas = (escuelas || []).filter(_visibleForCurrentUser);
    _filteredEscuelas = [..._escuelas];
    _markers = {};

    _markerCluster.clearLayers();

    _escuelas.forEach(e => {
      const lat = parseFloat(e.latitud);
      const lng = parseFloat(e.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: _getIcon(e) });
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
    _renderRoutes(_escuelas);
  }

  function _visibleForCurrentUser(e) {
    if (Auth.canAccess('supervisor')) return true;
    const user = Auth.getUserInfo?.();
    if (!user) return false;
    const assigned = String(e.encuestador_asignado || '').toLowerCase().trim();
    if (!assigned) return false;
    const aliases = [user.usuario, user.nombreCompleto, `${user.nombres} ${user.apellidos}`, user.id]
      .filter(Boolean)
      .map(v => String(v).toLowerCase().trim());
    return aliases.some(alias => assigned === alias || assigned.includes(alias));
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
    _renderRoutes(_filteredEscuelas);
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
      const estadoColor = _surveyorColor(_surveyorName(e));
      const estadoLabel = APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento;
      const strength = _isClosed(e) ? 'cerrada' : 'pendiente';
      return `
        <div class="map-list-item" data-id="${e.id_escuela}" onclick="MapModule.flyTo('${e.id_escuela}')">
          <span class="map-list-item__dot map-list-item__dot--${strength}" style="background:${estadoColor}"></span>
          <div class="map-list-item__info">
            <strong>${e.nombre}</strong>
            <small>${e.distrito || ''} · ${e.encuestador_asignado || 'Sin asignar'} · ${_estimateMinutes(e)} min</small>
          </div>
          <span class="map-list-item__badge" style="background:${APP_CONFIG.STATE_COLORS[e.estado_relevamiento] || '#6c757d'}">${estadoLabel}</span>
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
        <p><b>Tiempo estimado:</b> ${_estimateMinutes(e)} min</p>
        <p><b>Estado:</b> <span class="badge badge--${e.estado_relevamiento}">${APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento}</span></p>
        ${Auth.canAccess('encuestador') ? `<button class="btn btn-primary btn-block mt-2" onclick="SurveyModule.selectEscuela('${e.id_escuela}')">Migrar datos al RUE-MEC</button>` : ''}
      </div>`;
    panel.classList.add('map-info-panel--visible');
  }

  function _estimateMinutes(e) {
    return parseInt(e.tiempo_estimado_min || e.tiempo_estimado || '45', 10) || 45;
  }

  function _validPoint(e) {
    const lat = parseFloat(e.latitud);
    const lng = parseFloat(e.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  function _groupBySurveyor(escuelas) {
    return escuelas.reduce((acc, e) => {
      const key = _surveyorName(e);
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});
  }

  function _distance(a, b) {
    const pa = _validPoint(a);
    const pb = _validPoint(b);
    if (!pa || !pb) return Infinity;
    const dx = pa.lat - pb.lat;
    const dy = pa.lng - pb.lng;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function _nearestRoute(points) {
    const remaining = points.filter(_validPoint);
    if (remaining.length <= 2) return remaining;
    const route = [remaining.shift()];
    while (remaining.length) {
      const last = route[route.length - 1];
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((candidate, idx) => {
        const d = _distance(last, candidate);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      route.push(remaining.splice(bestIdx, 1)[0]);
    }
    return route;
  }

  function _renderRoutes(escuelas) {
    if (!_routeLayer) return;
    _routeLayer.clearLayers();
    if (!_routesVisible) return;
    const groups = _groupBySurveyor(escuelas.filter(e => e.encuestador_asignado));
    Object.entries(groups).forEach(([name, rows]) => {
      const route = _nearestRoute(rows);
      const latlngs = route.map(_validPoint).filter(Boolean).map(p => [p.lat, p.lng]);
      if (latlngs.length < 2) return;
      L.polyline(latlngs, {
        color: _surveyorColor(name),
        weight: 3,
        opacity: .55,
        dashArray: '8 8',
      }).bindTooltip(`${name}: ${route.length} puntos · ${route.reduce((s, e) => s + _estimateMinutes(e), 0)} min estimados`).addTo(_routeLayer);
    });
  }

  function toggleRoutes() {
    _routesVisible = !_routesVisible;
    _renderRoutes(_filteredEscuelas);
    UI.showToast(_routesVisible ? 'Rutas visibles.' : 'Rutas ocultas.', 'info');
  }

  async function promptAutoAssign() {
    if (!Auth.canAccess('admin')) {
      UI.showToast('Solo administradores autorizados pueden generar asignaciones.', 'warning');
      return;
    }
    const value = await UI.showPrompt('Cantidad de encuestadores disponibles:', '4');
    if (value === null) return;
    const n = Math.max(1, parseInt(value, 10) || 1);
    autoAssignClusters(n);
  }

  function autoAssignClusters(n) {
    const rows = _escuelas.filter(_validPoint);
    if (!rows.length) {
      UI.showToast('No hay puntos con coordenadas para asignar.', 'warning');
      return;
    }
    const names = Array.from({ length: n }, (_, i) => `Encuestador ${i + 1}`);
    const sorted = [...rows].sort((a, b) => {
      const pa = _validPoint(a);
      const pb = _validPoint(b);
      return (pa.lng - pb.lng) || (pa.lat - pb.lat);
    });
    sorted.forEach((row, idx) => {
      row.encuestador_asignado = names[Math.min(n - 1, Math.floor(idx / Math.ceil(sorted.length / n)))];
      row.orden_visita = String((idx % Math.ceil(sorted.length / n)) + 1);
      row.tiempo_estimado_min = row.tiempo_estimado_min || '45';
    });
    loadMarkers(_escuelas);
    populateFilterDropdowns();
    UI.showToast(`Asignacion local generada en ${n} sectores. Pendiente persistir en Sheets.`, 'success', 6000);
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
    toggleRoutes,
    promptAutoAssign,
    autoAssignClusters,
  };
})();
