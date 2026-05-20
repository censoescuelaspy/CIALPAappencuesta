/**
 * CIALPA — Relevamiento Escolar
 * map.js — Leaflet map module
 * Version: 2.5.18
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
  const _OSM_SUBDOMAINS = ['a', 'b', 'c'];

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

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _jsString(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  function _safeState(value) {
    return String(value || 'pendiente').replace(/[^a-z0-9_-]/gi, '') || 'pendiente';
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
    const idArg = _jsString(e.id_escuela);

    return `
      <div class="map-popup">
        <div class="map-popup__header">
          <strong>${_escape(e.nombre)}</strong>
          <span class="badge" style="background:${_escape(estadoColor)}">${_escape(estadoLabel)}</span>
        </div>
        <div class="map-popup__body">
          <p><b>Código:</b> ${_escape(e.codigo_local || '—')}</p>
          <p><b>Departamento:</b> ${_escape(e.departamento || '—')}</p>
          <p><b>Distrito:</b> ${_escape(e.distrito || '—')}</p>
          <p><b>Localidad:</b> ${_escape(e.localidad || '—')}</p>
          <p><b>Zona:</b> ${_escape(e.zona || '—')}</p>
          <p><b>Encuestador:</b> ${_escape(e.encuestador_asignado || 'No asignado')}</p>
          ${e.fecha_ultimo_evento ? `<p><b>Último evento:</b> ${_escape(e.fecha_ultimo_evento)}</p>` : ''}
          ${e.observaciones ? `<p><b>Observaciones:</b> ${_escape(e.observaciones)}</p>` : ''}
        </div>
        <div class="map-popup__actions">
          ${canSurvey ? `<button class="btn btn-success btn-sm" onclick='MapModule.startGuidedRegister(${idArg})'>Iniciar/continuar registro</button>` : ''}
          ${canSurvey ? `<button class="btn btn-primary btn-sm" onclick='SurveyModule.selectEscuela(${idArg})'>Migrar datos al RUE-MEC</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick='MapModule.focusListItem(${idArg})'>Ver en lista</button>
        </div>
      </div>`;
  }

  // ── Map initialization ────────────────────────────────────────────────────

  function initMap(containerId = 'map-container') {
    const container = document.getElementById(containerId);
    if (!window.L) {
      if (container) {
        container.innerHTML = `
          <div class="map-fallback">
            <h3>Mapa no disponible sin libreria cartografica</h3>
            <p>La lista de escuelas, filtros, asignaciones y datos cacheados siguen disponibles. Abra la app con conexion una vez para guardar librerias y teselas offline.</p>
          </div>`;
      }
      _map = null;
      _markerCluster = null;
      _routeLayer = null;
      updateOfflineStatus();
      return null;
    }

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
      APP_CONFIG.SATELLITE_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: APP_CONFIG.SATELLITE_ATTRIBUTION || 'Tiles &copy; Esri', maxZoom: APP_CONFIG.SATELLITE_MAX_ZOOM || 18 }
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
    _markerCluster = typeof L.markerClusterGroup === 'function'
      ? L.markerClusterGroup({
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
        })
      : L.layerGroup();

    _map.addLayer(_markerCluster);
    _routeLayer = L.layerGroup().addTo(_map);

    // Scale control
    L.control.scale({ imperial: false }).addTo(_map);
    updateOfflineStatus();

    return _map;
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  function loadMarkers(escuelas) {
    _escuelas = (escuelas || []).filter(_visibleForCurrentUser);
    _filteredEscuelas = [..._escuelas];
    _markers = {};

    if (_markerCluster) _markerCluster.clearLayers();

    _escuelas.forEach(e => {
      if (!_map || !window.L || !_markerCluster) return;
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
    _selectExampleSchool();
    updateOfflineStatus();
  }

  function _selectExampleSchool() {
    const example = _escuelas.find(e => e.es_ejemplo || e.id_escuela === 'ESC_DEMO_CIALPA');
    if (!example) return;
    _selectedEscuela = example;
    _updateInfoPanel(example);
    _highlightListItem(example.id_escuela);
    const marker = _markers[example.id_escuela];
    if (_map && marker) {
      const latlng = marker.getLatLng();
      _map.setView(latlng, Math.max(_map.getZoom(), 16));
      marker.openPopup();
    }
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
      if (String(filters.piloto || '').toLowerCase() === 'true' && String(e.en_muestra_piloto || '').toLowerCase() !== 'true') return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const haystack = `${e.nombre} ${e.codigo_local} ${e.departamento} ${e.distrito} ${e.localidad}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Toggle marker visibility via cluster
    if (_markerCluster) _markerCluster.clearLayers();
    const filteredIds = new Set(_filteredEscuelas.map(e => e.id_escuela));
    Object.entries(_markers).forEach(([id, marker]) => {
      if (filteredIds.has(id) && _markerCluster) _markerCluster.addLayer(marker);
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
      const idArg = _jsString(e.id_escuela);
      return `
        <div class="map-list-item" data-id="${_escape(e.id_escuela)}" onclick='MapModule.flyTo(${idArg})'>
          <span class="map-list-item__dot map-list-item__dot--${strength}" style="background:${_escape(estadoColor)}"></span>
          <div class="map-list-item__info">
            <strong>${_escape(e.nombre)}</strong>
            <small>${_escape(e.distrito || '')} · ${_escape(e.encuestador_asignado || 'Sin asignar')} · ${_estimateMinutes(e)} min</small>
          </div>
          <span class="map-list-item__badge" style="background:${_escape(APP_CONFIG.STATE_COLORS[e.estado_relevamiento] || '#6c757d')}">${_escape(estadoLabel)}</span>
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
    const state = _safeState(e.estado_relevamiento);
    const idArg = _jsString(e.id_escuela);
    panel.innerHTML = `
      <div class="map-info-card">
        <h4>${_escape(e.nombre)}</h4>
        <p><b>Código:</b> ${_escape(e.codigo_local || '—')}</p>
        <p><b>Departamento:</b> ${_escape(e.departamento || '—')}</p>
        <p><b>Distrito:</b> ${_escape(e.distrito || '—')}</p>
        <p><b>Zona:</b> ${_escape(e.zona || '—')}</p>
        <p><b>Encuestador:</b> ${_escape(e.encuestador_asignado || 'No asignado')}</p>
        <p><b>Tiempo estimado:</b> ${_estimateMinutes(e)} min</p>
        <p><b>Estado:</b> <span class="badge badge--${state}">${_escape(APP_CONFIG.STATE_LABELS[e.estado_relevamiento] || e.estado_relevamiento)}</span></p>
        ${Auth.canAccess('encuestador') ? `
          <button class="btn btn-success btn-block mt-2" onclick='MapModule.startGuidedRegister(${idArg})'>Iniciar/continuar registro</button>
          <button class="btn btn-primary btn-block mt-2" onclick='SurveyModule.selectEscuela(${idArg})'>Migrar datos al RUE-MEC</button>
        ` : ''}
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
    populateFilterButtons();
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
    if (!marker || !_map) {
      _highlightListItem(id);
      const escuela = _escuelas.find(e => e.id_escuela === id);
      if (escuela) {
        _selectedEscuela = escuela;
        _updateInfoPanel(escuela);
      }
      if (!window.L) UI.showToast('Mapa grafico no disponible; se muestra la ficha en la lista.', 'info');
      return;
    }
    _map.flyTo(marker.getLatLng(), 14, { animate: true, duration: 0.8 });
    setTimeout(() => marker.openPopup(), 900);
    _highlightListItem(id);
    const escuela = _escuelas.find(e => e.id_escuela === id);
    if (escuela) {
      _selectedEscuela = escuela;
      _updateInfoPanel(escuela);
    }
  }

  function focusListItem(id) {
    _highlightListItem(id);
    AppController.showModule('mapa');
  }

  function startGuidedRegister(id) {
    if (!Auth.requireAuth()) return;
    const escuela = _escuelas.find(e => e.id_escuela === id || e.codigo_local === id);
    if (!escuela) {
      UI.showToast('No se encontro la escuela seleccionada en el mapa.', 'warning');
      return;
    }
    _selectedEscuela = escuela;
    _highlightListItem(escuela.id_escuela);
    _updateInfoPanel(escuela);
    const ready = typeof SurveyModule !== 'undefined' && typeof SurveyModule.setCurrentEscuela === 'function'
      ? SurveyModule.setCurrentEscuela(escuela)
      : true;
    if (!ready) return;
    AppController.showModule('registro');
    setTimeout(() => {
      try {
        if (typeof GuidedRegisterModule !== 'undefined') GuidedRegisterModule.init();
      } catch { /* non-fatal */ }
    }, 160);
    UI.showToast(`Escuela activa: ${escuela.nombre || escuela.codigo_local || escuela.id_escuela}.`, 'success', 4200);
  }

  function invalidateSize() {
    if (_map) _map.invalidateSize();
  }

  function _tileX(lng, zoom) {
    return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  }

  function _tileY(lat, zoom) {
    const safeLat = Math.max(-85.0511, Math.min(85.0511, lat));
    const rad = safeLat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  function _tileUrlsForBounds(bounds, zoom) {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const maxTile = Math.pow(2, zoom) - 1;
    const xMin = Math.max(0, _tileX(west, zoom) - 1);
    const xMax = Math.min(maxTile, _tileX(east, zoom) + 1);
    const yMin = Math.max(0, _tileY(north, zoom) - 1);
    const yMax = Math.min(maxTile, _tileY(south, zoom) + 1);
    const urls = [];
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const sub = _OSM_SUBDOMAINS[(x + y + zoom) % _OSM_SUBDOMAINS.length];
        urls.push(`https://${sub}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
        urls.push(`https://${sub}.tile.openstreetmap.fr/hot/${zoom}/${x}/${y}.png`);
      }
    }
    return urls;
  }

  function _visibleTileUrls() {
    if (!_map) return [];
    const currentZoom = Math.round(_map.getZoom());
    const zooms = [...new Set([currentZoom, Math.min(APP_CONFIG.MAP_MAX_ZOOM, currentZoom + 1)])];
    return [...new Set(zooms.flatMap(zoom => _tileUrlsForBounds(_map.getBounds(), zoom)))];
  }

  async function cacheVisibleMap() {
    if (!_map) {
      UI.showToast('Abra la app con conexion para cargar el mapa antes de guardar teselas offline.', 'warning', 6500);
      return;
    }
    if (!('caches' in window)) {
      UI.showToast('Este navegador no permite guardar mapas offline.', 'warning');
      return;
    }

    const urls = _visibleTileUrls();
    const limit = Number(APP_CONFIG.MAP_TILE_CACHE_LIMIT || 260);
    if (urls.length > limit) {
      const ok = await UI.showConfirm('Guardar mapa offline', `La zona visible requiere ${urls.length} teselas. Para cuidar datos del celular se guardaran ${limit}. ¿Continuar?`);
      if (!ok) return;
    }

    const selected = urls.slice(0, limit);
    const cache = await caches.open(APP_CONFIG.MAP_TILE_CACHE_NAME || 'cialpa-map-tiles');
    let saved = 0;
    let failed = 0;
    const state = document.getElementById('map-offline-state');
    if (state) state.textContent = `Mapa offline: guardando 0/${selected.length}`;

    for (let i = 0; i < selected.length; i++) {
      const url = selected[i];
      try {
        const cached = await cache.match(url);
        if (!cached) {
          const response = await fetch(url, { mode: 'no-cors', cache: 'force-cache' });
          await cache.put(url, response.clone());
        }
        saved++;
      } catch {
        failed++;
      }
      if (state && (i % 12 === 0 || i === selected.length - 1)) {
        state.textContent = `Mapa offline: guardando ${i + 1}/${selected.length}`;
      }
    }

    localStorage.setItem('cialpa_map_cache_last', JSON.stringify({
      savedAt: new Date().toISOString(),
      saved,
      failed,
      zoom: _map.getZoom(),
      center: _map.getCenter(),
    }));
    await updateOfflineStatus();
    UI.showToast(`Mapa offline guardado: ${saved} teselas${failed ? `, ${failed} fallidas` : ''}.`, failed ? 'warning' : 'success', 6500);
  }

  async function updateOfflineStatus() {
    const state = document.getElementById('map-offline-state');
    if (!state) return;
    let tileCount = 0;
    if ('caches' in window) {
      try {
        const cache = await caches.open(APP_CONFIG.MAP_TILE_CACHE_NAME || 'cialpa-map-tiles');
        tileCount = (await cache.keys()).length;
      } catch {
        tileCount = 0;
      }
    }
    let cachedSchools = 0;
    if (typeof CialpaLocalStore !== 'undefined') {
      try {
        const cached = await CialpaLocalStore.getApi('getEscuelas', {});
        cachedSchools = cached?.response?.data?.length || 0;
      } catch {
        cachedSchools = 0;
      }
    }
    const last = (() => {
      try { return JSON.parse(localStorage.getItem('cialpa_map_cache_last') || 'null'); }
      catch { return null; }
    })();
    const lastText = last?.savedAt ? ` · ${new Date(last.savedAt).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })}` : '';
    state.textContent = `Mapa offline: ${tileCount} teselas · ${cachedSchools} escuelas cacheadas${lastText}`;
    state.classList.toggle('map-offline-state--ready', tileCount > 0 || cachedSchools > 0);
  }

  function getMap() {
    return _map;
  }

  function getEscuelas() {
    return _escuelas;
  }

  function getSelectedEscuela() {
    return _selectedEscuela;
  }

  function getFiltered() {
    return _filteredEscuelas;
  }

  // ── Populate filter buttons ───────────────────────────────────────────────

  function populateFilterButtons() {
    const departamentos = [...new Set(_escuelas.map(e => e.departamento).filter(Boolean))].sort();
    const encuestadores = [...new Set(_escuelas.map(e => e.encuestador_asignado).filter(Boolean))].sort();

    _populateButtonChoices('filter-departamento', departamentos, 'Todos');
    populateDistrictButtons();
    _populateButtonChoices('filter-encuestador', encuestadores, 'Todos');
  }

  function populateDistrictButtons(departamento = '') {
    const selectedDepartment = departamento || document.getElementById('filter-departamento')?.value || '';
    const distritos = [...new Set(_escuelas
      .filter(e => !selectedDepartment || e.departamento === selectedDepartment)
      .map(e => e.distrito)
      .filter(Boolean))]
      .sort();
    _populateButtonChoices('filter-distrito', distritos, 'Todos');
  }

  function _populateButtonChoices(id, options, placeholder) {
    const input = document.getElementById(id);
    const list = document.querySelector(`[data-choice-list="${id}"]`);
    if (!input || !list) return;
    const current = String(input.value || '');
    input.value = current && options.includes(current) ? current : '';
    list.innerHTML = [
      `<button class="choice-button" type="button" data-choice-target="${_escape(id)}" data-choice-value="">${_escape(placeholder)}</button>`,
      ...options.map(option => `<button class="choice-button" type="button" data-choice-target="${_escape(id)}" data-choice-value="${_escape(option)}">${_escape(option)}</button>`),
    ].join('');
    UI.refreshButtonChoices(list);
  }

  return {
    initMap,
    loadMarkers,
    applyFilters,
    clearFilters,
    flyTo,
    focusListItem,
    startGuidedRegister,
    invalidateSize,
    getMap,
    getEscuelas,
    getSelectedEscuela,
    getFiltered,
    populateFilterButtons,
    populateDistrictButtons,
    toggleRoutes,
    promptAutoAssign,
    autoAssignClusters,
    cacheVisibleMap,
    updateOfflineStatus,
  };
})();
