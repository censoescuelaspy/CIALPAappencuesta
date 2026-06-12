/**
 * CIALPA — Relevamiento Escolar
 * map.js — Leaflet map module
 * Version: 2.6.180
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
  let _perimeterLayer = null;
  let _perimeters = [];
  let _routesVisible = true;
  let _routeRenderToken = 0;
  let _googleRoutesUnavailable = false;
  let _googleRoutesNoticeShown = false;
  const _googleRouteCache = new Map();

  const _PALETTE = ['#2b6cb0', '#2f855a', '#b7791f', '#805ad5', '#c05621', '#0f766e', '#b83280', '#4a5568', '#2563eb', '#16a34a'];
  const _OSM_SUBDOMAINS = ['a', 'b', 'c'];
  const MAP_LIST_LIMIT = 240;
  const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  const GOOGLE_ROUTES_MAX_POINTS = 27;

  // ── Icon factory ──────────────────────────────────────────────────────────

  function _hash(str) {
    return String(str || '').split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) >>> 0, 0);
  }

  function _surveyorName(e) {
    return _schoolSurveyor(e);
  }

  function _surveyorColor(name) {
    if (!name || _sameFilterValue(name, 'Sin asignar') || _sameFilterValue(name, 'No asignada') || _sameFilterValue(name, 'No asignado')) return '#94a3b8';
    return _PALETTE[_hash(name) % _PALETTE.length];
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _jsString(value) {
    return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  }

  function _digits(value) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  function _schoolPrimaryId(school = {}) {
    const item = school || {};
    return String(item.id_escuela || item.codigo_local || item.codigo || item.id || item.code || '').trim();
  }

  function _safeState(value) {
    return String(value || 'pendiente').replace(/[^a-z0-9_-]/gi, '') || 'pendiente';
  }

  function _normalizeFilterValue(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function _sameFilterValue(a, b) {
    return _normalizeFilterValue(a) === _normalizeFilterValue(b);
  }

  function _hasActiveFilters(filters = {}) {
    return Object.values(filters || {}).some(value => String(value ?? '').trim() !== '');
  }

  function _canonicalState(value) {
    const text = _normalizeFilterValue(value || 'pendiente');
    if (!text) return 'pendiente';
    if (['finalizada', 'cerrada', 'completada', 'entregada', 'completo', 'con_pendientes'].includes(text)
      || text.includes('final')
      || text.includes('complet')
      || text.includes('cerr')
      || text.includes('entreg')) return 'finalizada';
    if (text.includes('curso') || text.includes('proceso') || text.includes('avance')) return 'en_curso';
    if (text.includes('inci') || text.includes('problema') || text.includes('observ')) return 'incidencia';
    if (text.includes('parc') || text.includes('borrador')) return 'parcial';
    if (text.includes('susp') || text.includes('pausa')) return 'suspendida';
    if (text.includes('rev')) return 'revisar';
    if (text.includes('pend')) return 'pendiente';
    return text.replace(/[^a-z0-9_-]/g, '_') || 'pendiente';
  }

  function _schoolState(e = {}) {
    return _canonicalState(e.estado_relevamiento || e.estado || e.estado_borrador || e.estado_cierre || e.mec_draft_status || 'pendiente');
  }

  function _stateLabel(e = {}) {
    const state = _schoolState(e);
    return APP_CONFIG.STATE_LABELS[state] || e.estado_relevamiento || e.estado || state;
  }

  function _stateColor(e = {}) {
    const state = _schoolState(e);
    return APP_CONFIG.STATE_COLORS[state] || '#6c757d';
  }

  function _isTrueish(value) {
    if (value === true || value === 1) return true;
    const text = _normalizeFilterValue(value);
    return ['true', '1', 'si', 's', 'yes', 'y', 'piloto', 'muestra', 'muestra_piloto'].includes(text);
  }

  function _isPilotSchool(escuela) {
    if (!escuela) return false;
    const priority = _normalizeFilterValue(escuela.prioridad_operativa);
    return _isTrueish(escuela.en_muestra_piloto)
      || _isTrueish(escuela.muestra_piloto)
      || priority.includes('piloto')
      || String(escuela.orden_muestra_piloto ?? '').trim() !== '';
  }

  function _isClosed(e) {
    return _schoolState(e) === 'finalizada';
  }

  function _assignmentLabel(e) {
    return String(Auth.schoolAssignmentLabel ? Auth.schoolAssignmentLabel(e) : (e.encuestador_asignado || '')).trim();
  }

  function _schoolSurveyor(e = {}) {
    return _assignmentLabel(e)
      || String(e.encuestador_asignado || e.usuario_encuestador || e.ultimo_borrador_mec_usuario || e.usuario || '').trim()
      || 'Sin asignar';
  }

  function _schoolDepartment(e = {}) {
    return String(e.departamento || e.departamento_nombre || e.depto || '').trim();
  }

  function _schoolDistrict(e = {}) {
    return String(e.distrito || e.distrito_nombre || '').trim();
  }

  function _mergeSchoolRecord(base = {}, extra = {}) {
    return { ...(base || {}), ...(extra || {}) };
  }

  function _perimeterForSchool(school = {}) {
    const keys = new Set(_schoolIdentityKeys(school));
    if (!keys.size) return null;
    return (_perimeters || []).find(row => _perimeterIdentityKeys(row).some(key => keys.has(key))) || null;
  }

  function _enrichSchoolWithPerimeter(school = {}) {
    const perimeter = _perimeterForSchool(school);
    if (!perimeter) return school;
    return {
      ...(school || {}),
      mec_perimeter: perimeter,
      mec_perimeter_source: perimeter.source || perimeter.meta_source || 'map_layer',
    };
  }

  function _replaceSchoolRecord(updated = {}) {
    const keys = _schoolIdentityKeys(updated);
    if (!keys.length) return updated;
    const index = _escuelas.findIndex(item => _schoolIdentityKeys(item).some(key => keys.includes(key)));
    if (index !== -1) {
      _escuelas[index] = _mergeSchoolRecord(_escuelas[index], updated);
      return _escuelas[index];
    }
    _escuelas.push(updated);
    return updated;
  }

  function _uniqueNormalizedOptions(values = []) {
    const seen = new Map();
    values.forEach(value => {
      const label = String(value || '').trim();
      const key = _normalizeFilterValue(label);
      if (!label || seen.has(key)) return;
      seen.set(key, label);
    });
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function _isUnassigned(e) {
    const label = _assignmentLabel(e);
    return !label || _sameFilterValue(label, 'No asignada') || _sameFilterValue(label, 'No asignado') || _sameFilterValue(label, 'Sin asignar');
  }

  function _canRequestSurvey(e) {
    return Boolean(e) && Auth.isLoggedIn() && !_isClosed(e) && _isUnassigned(e);
  }

  function _getIcon(e) {
    const name = _surveyorName(e);
    const color = _surveyorColor(name);
    const opacity = _isClosed(e) ? 1 : 0.92;
    const stroke = '#172033';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" fill-opacity="${opacity}" stroke="#ffffff" stroke-width="4"/>
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1.75"/>
      <circle cx="14" cy="14" r="6.4" fill="#fff" fill-opacity="0.96" stroke="${stroke}" stroke-width="1"/>
    </svg>`;
    return L.divIcon({
      className: '',
      html: svg,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -44],
    });
  }

  // ── Popup builder ─────────────────────────────────────────────────────────

  function _buildPopup(e) {
    const estadoLabel = _stateLabel(e);
    const estadoColor = _stateColor(e);
    const canSurvey = Auth.canAccess('encuestador');
    const canOperate = canSurvey && Auth.canOperateSchool(e);
    const canRequest = _canRequestSurvey(e) && !canOperate;
    const idArg = _jsString(_schoolPrimaryId(e));
    const location = [_schoolDistrict(e), e.localidad].filter(Boolean).join(' - ');

    return `
      <div class="map-popup">
        <div class="map-popup__header">
          <strong>${_escape(e.nombre)}</strong>
          <span class="badge" style="background:${_escape(estadoColor)}">${_escape(estadoLabel)}</span>
        </div>
        <div class="map-popup__body">
          <p><b>Codigo:</b> ${_escape(e.codigo_local || '-')}</p>
          <p><b>Lugar:</b> ${_escape(location || _schoolDepartment(e) || '-')}</p>
          <p><b>Encuestador:</b> ${_escape(_schoolSurveyor(e))}</p>
        </div>
        <div class="map-popup__actions">
          ${canOperate ? `<button class="btn btn-success btn-sm" onclick='MapModule.startGuidedRegister(${idArg})'>Iniciar/continuar registro</button>` : ''}
          ${canOperate ? `<button class="btn btn-primary btn-sm" onclick='SurveyModule.selectEscuela(${idArg})'>Migrar datos al RUE-MEC</button>` : ''}
          ${canRequest ? `<button class="btn btn-warning btn-sm" onclick='MapModule.solicitarRelevamiento(${idArg})'>Solicitar relevar</button>` : ''}
          ${_locationReviewActions(e)}
          ${canSurvey && !canOperate ? _readonlyNotice(e) : ''}
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
      _perimeterLayer = null;
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

    _perimeterLayer = L.layerGroup().addTo(_map);
    _routeLayer = L.layerGroup().addTo(_map);

    L.control.layers(
      {
        'Mapa base (OSM)': osm,
        'Caminos y accesos (OSM HOT)': roads,
        'Satélite (Esri)': satellite,
      },
      {
        'Perimetros registrados': _perimeterLayer,
        'Rutas por censista': _routeLayer,
      },
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
            let size = 36;
            if (count > 50) {
              cls = 'cluster-large';
              size = 52;
            } else if (count > 10) {
              cls = 'cluster-medium';
              size = 44;
            }
            return L.divIcon({
              html: `<div class="${cls}"><span>${count}</span></div>`,
              className: 'marker-cluster',
              iconSize: L.point(size, size),
            });
          },
        })
      : L.layerGroup();

    _map.addLayer(_markerCluster);

    // Scale control
    L.control.scale({ imperial: false }).addTo(_map);
    updateOfflineStatus();

    return _map;
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  function loadMarkers(escuelas) {
    _escuelas = escuelas || [];
    _filteredEscuelas = [..._escuelas];
    _markers = {};

    if (_markerCluster) _markerCluster.clearLayers();

    const toAdd = [];
    _escuelas.forEach(e => {
      if (!_map || !window.L) return;
      const lat = parseFloat(e.latitud);
      const lng = parseFloat(e.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: _getIcon(e) });
      marker.bindPopup(_buildPopup(e), { maxWidth: 245 });
      const primaryId = _schoolPrimaryId(e);
      marker.escuelaId = primaryId;

      marker.on('click', () => {
        _selectedEscuela = e;
        _highlightListItem(primaryId);
        _updateJumpState();
        _hideInfoPanel();
      });

      _schoolIdentityKeys(e).forEach(key => { _markers[key] = marker; });
      toAdd.push(marker);
    });
    if (_markerCluster && toAdd.length) _markerCluster.addLayers(toAdd);

    if (_hasActiveFilters(_activeFilters)) {
      applyFilters(_activeFilters);
      updateOfflineStatus();
      return;
    }
    _renderList(_escuelas);
    _updateSummaryBadges(_escuelas);
    _updateJumpState(_escuelas);
    _renderRoutes(_escuelas);
    _renderPerimeters(_escuelas);
    updateOfflineStatus();
  }

  function _visibleForCurrentUser(e) {
    return Boolean(e) && Auth.isLoggedIn();
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  function applyFilters(filters) {
    filters = {
      departamento: '',
      distrito: '',
      zona: '',
      encuestador: '',
      estado: '',
      piloto: '',
      q: '',
      ...(filters || {}),
    };
    _activeFilters = { ...filters };
    _filteredEscuelas = _escuelas.filter(e => {
      if (filters.departamento && !_sameFilterValue(_schoolDepartment(e), filters.departamento)) return false;
      if (filters.distrito && !_sameFilterValue(_schoolDistrict(e), filters.distrito)) return false;
      if (filters.zona && !_sameFilterValue(e.zona, filters.zona)) return false;
      if (filters.encuestador && !_sameFilterValue(_schoolSurveyor(e), filters.encuestador)) return false;
      if (filters.estado && !_sameFilterValue(_schoolState(e), filters.estado)) return false;
      if (_isTrueish(filters.piloto) && !_isPilotSchool(e)) return false;
      if (filters.q) {
        const q = _normalizeFilterValue(filters.q);
        const haystack = _normalizeFilterValue(`${e.nombre} ${e.nombre_escuela} ${e.codigo_local} ${e.codigo} ${e.id_escuela} ${e.id} ${e.code} ${_schoolDepartment(e)} ${_schoolDistrict(e)} ${e.localidad} ${e.zona} ${_schoolSurveyor(e)} ${_stateLabel(e)} ${_schoolState(e)}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Toggle marker visibility via cluster — bulk addLayers is much faster than per-marker addLayer
    if (_markerCluster) _markerCluster.clearLayers();
    const filteredIds = new Set(_filteredEscuelas.flatMap(e => _schoolIdentityKeys(e)));
    const seenMarkers = new Set();
    const filteredMarkers = Object.entries(_markers)
      .filter(([id]) => filteredIds.has(id))
      .map(([, marker]) => marker)
      .filter(marker => {
        if (seenMarkers.has(marker)) return false;
        seenMarkers.add(marker);
        return true;
      });
    if (_markerCluster && filteredMarkers.length) _markerCluster.addLayers(filteredMarkers);

    _renderList(_filteredEscuelas);
    _updateSummaryBadges(_filteredEscuelas);
    _updateJumpState(_filteredEscuelas);
    _renderRoutes(_filteredEscuelas);
    _renderPerimeters(_filteredEscuelas);
  }

  function clearFilters() {
    _activeFilters = {};
    applyFilters({});
  }

  // ── Sidebar list ──────────────────────────────────────────────────────────

  async function loadPerimeters(options = {}) {
    if (typeof API === 'undefined' || typeof API.listarPerimetrosMec !== 'function') return;
    try {
      const result = await API.listarPerimetrosMec({});
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudieron cargar perimetros.');
      _perimeters = Array.isArray(result.data) ? result.data : [];
      _renderPerimeters(_filteredEscuelas.length || _hasActiveFilters(_activeFilters) ? _filteredEscuelas : _escuelas);
      if (!options.silent) UI.showToast(`Perimetros cargados: ${_perimeters.length}.`, 'success', 4200);
    } catch (err) {
      console.warn('[Mapa] No se pudieron cargar perimetros MEC:', err);
      _perimeters = [];
      _renderPerimeters(_filteredEscuelas);
      if (!options.silent) UI.showToast('No se pudieron cargar los perimetros guardados.', 'warning', 6500);
    }
  }

  function togglePerimeters() {
    if (!_map || !_perimeterLayer) return;
    if (_map.hasLayer(_perimeterLayer)) {
      _map.removeLayer(_perimeterLayer);
      UI.showToast('Perimetros ocultos.', 'info');
    } else {
      _perimeterLayer.addTo(_map);
      _renderPerimeters(_filteredEscuelas.length || _hasActiveFilters(_activeFilters) ? _filteredEscuelas : _escuelas);
      UI.showToast('Perimetros visibles.', 'info');
    }
  }

  function _renderPerimeters(escuelas = []) {
    if (!_perimeterLayer) {
      _updatePerimeterCount(0, _perimeters.length);
      return;
    }
    _perimeterLayer.clearLayers();
    if (!_map || !window.L || !_perimeters.length) {
      _updatePerimeterCount(0, _perimeters.length);
      return;
    }
    const visibleKeys = new Set((escuelas || []).flatMap(_schoolIdentityKeys));
    const rows = _perimeters.filter(row => {
      const keys = _perimeterIdentityKeys(row);
      return !visibleKeys.size || keys.some(key => visibleKeys.has(key));
    });
    rows.forEach(row => {
      const vertices = _perimeterLatLngs(row);
      if (vertices.length < 3) return;
      const school = _perimeterSchool(row);
      const color = _surveyorColor(row.usuario || (school && _schoolSurveyor(school)) || 'Perimetro');
      const layer = L.polygon(vertices, {
        color,
        weight: 2.5,
        opacity: 0.92,
        fillColor: '#facc15',
        fillOpacity: 0.14,
        lineJoin: 'round',
      });
      const measurements = _perimeterMeasurements(row);
      const tooltipParts = [
        row.nombre_escuela || row.codigo_local || 'Escuela',
        'perimetro guardado',
        measurements?.perimeter_m ? `P ${_formatMapDistance(measurements.perimeter_m)}` : '',
        measurements?.area_m2 ? `A ${_formatMapArea(measurements.area_m2)}` : '',
      ].filter(Boolean);
      layer.bindTooltip(tooltipParts.join(' - '), { sticky: true });
      layer.bindPopup(_buildPerimeterPopup(row, school), { maxWidth: 340 });
      layer.on('click', () => {
        if (school) {
          _selectedEscuela = school;
          _highlightListItem(_schoolPrimaryId(school));
          _updateInfoPanel(school);
        }
      });
      layer.addTo(_perimeterLayer);
    });
    _updatePerimeterCount(rows.length, _perimeters.length);
  }

  function _perimeterIdentityKeys(row = {}) {
    return [
      ...(Array.isArray(row.identity_keys) ? row.identity_keys : []),
      row.id_escuela,
      row.codigo_local,
      _digits(row.id_escuela),
      _digits(row.codigo_local),
    ].map(value => String(value ?? '').trim()).filter(Boolean);
  }

  function _perimeterSchool(row = {}) {
    const keys = _perimeterIdentityKeys(row);
    for (const key of keys) {
      const school = _findSchoolById(key);
      if (school) return school;
    }
    return null;
  }

  function _perimeterLatLngs(row = {}) {
    return (Array.isArray(row.vertices) ? row.vertices : [])
      .map(vertex => {
        const lat = Number(vertex && vertex.lat);
        const lng = Number(vertex && vertex.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return [lat, lng];
      })
      .filter(Boolean);
  }

  function _perimeterMeasurements(row = {}) {
    const existing = row.medidas || row.measurements || null;
    if (existing && existing.valid && Array.isArray(existing.sides)) return existing;
    if (typeof GeoMeasure === 'undefined' || typeof GeoMeasure.measurePolygon !== 'function') return null;
    const vertices = Array.isArray(row.vertices) ? row.vertices : [];
    const measured = GeoMeasure.measurePolygon(vertices);
    return measured?.valid ? measured : null;
  }

  function _formatMapNumber(value, decimals = 2) {
    if (typeof GeoMeasure !== 'undefined' && typeof GeoMeasure.formatNumber === 'function') return GeoMeasure.formatNumber(value, decimals);
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : '';
  }

  function _formatMapDistance(value) {
    if (typeof GeoMeasure !== 'undefined' && typeof GeoMeasure.formatDistance === 'function') return GeoMeasure.formatDistance(value);
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(2)} m` : '';
  }

  function _formatMapArea(value) {
    if (typeof GeoMeasure !== 'undefined' && typeof GeoMeasure.formatArea === 'function') return GeoMeasure.formatArea(value);
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(2)} m2` : '';
  }

  function _perimeterMetricCards(row = {}, measurements = _perimeterMeasurements(row)) {
    const perimeter = measurements?.perimeter_m || Number(String(row.perimetro_m || '').replace(',', '.')) || 0;
    const area = measurements?.area_m2 || Number(String(row.superficie_m2 || '').replace(',', '.')) || 0;
    const areaHa = measurements?.area_ha || Number(String(row.area_ha || '').replace(',', '.')) || 0;
    return [
      { label: 'Perimetro', value: perimeter ? _formatMapDistance(perimeter) : '' },
      { label: 'Area', value: area ? _formatMapArea(area) : '' },
      { label: 'Hectareas', value: areaHa ? `${_formatMapNumber(areaHa, 4)} ha` : '' },
      { label: 'Vertices', value: row.vertices_count ? `${row.vertices_count}` : '' },
    ].filter(item => item.value);
  }

  function _buildPerimeterPopup(row = {}, school = null) {
    const id = school ? _schoolPrimaryId(school) : (row.id_escuela || row.codigo_local || '');
    const idArg = _jsString(id);
    const canOperate = school && Auth.canAccess('encuestador') && Auth.canOperateSchool(school);
    const measurements = _perimeterMeasurements(row);
    const metricCards = _perimeterMetricCards(row, measurements);
    const sideItems = (measurements?.sides || [])
      .map(side => `<li><span>${_escape(side.label || `L${side.index}`)}</span><b>${_escape(_formatMapDistance(side.length_m))}</b></li>`)
      .join('');
    return `
      <div class="map-popup map-popup--perimeter">
        <div class="map-popup__header">
          <strong>${_escape(row.nombre_escuela || row.codigo_local || 'Perimetro registrado')}</strong>
          <span class="badge" style="background:#b7791f">Predio</span>
        </div>
        <div class="map-popup__body">
          <p><b>Codigo:</b> ${_escape(row.codigo_local || '-')}</p>
          <p><b>Distrito:</b> ${_escape(row.distrito || '-')}</p>
          <p><b>Censista:</b> ${_escape(row.usuario || '-')}</p>
          ${metricCards.length ? `
            <div class="map-perimeter-metrics">
              ${metricCards.map(item => `<span><b>${_escape(item.label)}</b>${_escape(item.value)}</span>`).join('')}
            </div>` : ''}
          ${sideItems ? `
            <details class="map-perimeter-sides" open>
              <summary>Lados calculados</summary>
              <ol>${sideItems}</ol>
            </details>` : ''}
          <p><b>Actualizado:</b> ${_escape(row.actualizado_en || row.fecha_guardado || '-')}</p>
        </div>
        <div class="map-popup__actions">
          ${id ? `<button class="btn btn-outline btn-sm" onclick='MapModule.flyTo(${idArg})'>Ver escuela</button>` : ''}
          ${canOperate ? `<button class="btn btn-success btn-sm" onclick='MapModule.startGuidedRegister(${idArg})'>Abrir registro</button>` : ''}
        </div>
      </div>`;
  }

  function _updatePerimeterCount(visible, total) {
    const count = document.getElementById('map-count-perimeters');
    if (count) count.textContent = String(visible || 0);
    const state = document.getElementById('map-perimeters-state');
    if (state) {
      state.textContent = total
        ? `Perimetros: ${visible || 0}/${total}`
        : 'Perimetros: sin datos cargados';
      state.classList.toggle('map-perimeters-state--ready', Boolean(total));
    }
  }

  function _jumpRows() {
    const source = _hasActiveFilters(_activeFilters)
      ? _filteredEscuelas
      : (_filteredEscuelas.length ? _filteredEscuelas : _escuelas);
    const rows = (source || []).filter(row => {
      const id = _schoolPrimaryId(row);
      return Boolean(id && (_markers[id] || _schoolIdentityKeys(row).some(key => _markers[key])));
    });
    return rows.length ? rows : (source || []);
  }

  function _jumpIndex(rows = _jumpRows()) {
    const selectedKeys = new Set(_schoolIdentityKeys(_selectedEscuela || {}));
    if (!selectedKeys.size) return -1;
    return rows.findIndex(row => _schoolIdentityKeys(row).some(key => selectedKeys.has(key)));
  }

  function _updateJumpState(rows = _jumpRows()) {
    const state = document.getElementById('map-jump-state');
    if (!state) return;
    const total = rows.length;
    const index = _jumpIndex(rows);
    state.textContent = total
      ? `${index >= 0 ? index + 1 : 0}/${total}`
      : '0/0';
  }

  function jumpFilteredSchool(delta = 1) {
    const rows = _jumpRows();
    if (!rows.length) {
      UI.showToast('No hay escuelas visibles para recorrer con los filtros actuales.', 'warning', 5200);
      _updateJumpState(rows);
      return null;
    }
    const step = Number(delta) < 0 ? -1 : 1;
    const currentIndex = _jumpIndex(rows);
    const nextIndex = currentIndex === -1
      ? (step > 0 ? 0 : rows.length - 1)
      : (currentIndex + step + rows.length) % rows.length;
    const school = rows[nextIndex];
    flyTo(_schoolPrimaryId(school));
    _updateJumpState(rows);
    UI.showToast(`Escuela ${nextIndex + 1}/${rows.length}: ${school.nombre || school.codigo_local || school.id_escuela}.`, 'info', 3200);
    return school;
  }

  function _renderList(escuelas) {
    const container = document.getElementById('map-school-list');
    if (!container) return;

    if (escuelas.length === 0) {
      container.innerHTML = '<p class="map-list__empty">No hay escuelas que coincidan con los filtros.</p>';
      return;
    }

    const visible = escuelas.slice(0, MAP_LIST_LIMIT);
    container.innerHTML = visible.map(e => {
      const estadoColor = _surveyorColor(_surveyorName(e));
      const estadoLabel = _stateLabel(e);
      const strength = _isClosed(e) ? 'cerrada' : 'pendiente';
      const primaryId = _schoolPrimaryId(e);
      const idArg = _jsString(primaryId);
      return `
        <div class="map-list-item" data-id="${_escape(primaryId)}" onclick='MapModule.flyTo(${idArg})'>
          <span class="map-list-item__dot map-list-item__dot--${strength}" style="background:${_escape(estadoColor)}"></span>
          <div class="map-list-item__info">
            <strong>${_escape(e.nombre)}</strong>
            <small>${_escape(_schoolDistrict(e) || '')} · ${_escape(_schoolSurveyor(e))} · ${_estimateMinutes(e)} min</small>
          </div>
          <span class="map-list-item__badge" style="background:${_escape(_stateColor(e))}">${_escape(estadoLabel)}</span>
        </div>`;
    }).join('') + (escuelas.length > visible.length ? `
      <div class="map-list__limit">
        Mostrando ${visible.length} de ${escuelas.length} escuelas. Use filtros o busqueda para afinar la lista.
      </div>` : '');
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
    const state = _safeState(_schoolState(e));
    const idArg = _jsString(_schoolPrimaryId(e));
    const canSurvey = Auth.canAccess('encuestador');
    const canOperate = canSurvey && Auth.canOperateSchool(e);
    panel.innerHTML = `
      <div class="map-info-card">
        <h4>${_escape(e.nombre)}</h4>
        <p><b>Código:</b> ${_escape(e.codigo_local || '—')}</p>
        <p><b>Departamento:</b> ${_escape(_schoolDepartment(e) || '—')}</p>
        <p><b>Distrito:</b> ${_escape(_schoolDistrict(e) || '—')}</p>
        <p><b>Zona:</b> ${_escape(e.zona || '—')}</p>
        <p><b>Encuestador:</b> ${_escape(_schoolSurveyor(e))}</p>
        <p><b>Tiempo estimado:</b> ${_estimateMinutes(e)} min</p>
        <p><b>Estado:</b> <span class="badge badge--${state}">${_escape(_stateLabel(e))}</span></p>
        ${_locationReviewActions(e, true)}
        ${canOperate ? `
          <button class="btn btn-success btn-block mt-2" onclick='MapModule.startGuidedRegister(${idArg})'>Iniciar/continuar registro</button>
          <button class="btn btn-primary btn-block mt-2" onclick='SurveyModule.selectEscuela(${idArg})'>Migrar datos al RUE-MEC</button>
        ` : ''}
        ${canSurvey && !canOperate ? _readonlyNotice(e, true) : ''}
      </div>`;
    panel.classList.add('map-info-panel--visible');
  }

  function _hideInfoPanel() {
    const panel = document.getElementById('map-info-panel');
    if (!panel) return;
    panel.classList.remove('map-info-panel--visible');
    panel.innerHTML = '';
  }

  function _readonlyNotice(e, block = false) {
    const assigned = _schoolSurveyor(e) || 'No asignada';
    if (_canRequestSurvey(e)) return '';
    const cls = block ? 'map-readonly-note map-readonly-note--block' : 'map-readonly-note';
    return `<p class="${cls}"><b>Solo lectura.</b> Asignada a: ${_escape(assigned)}. Use el mapa para consultar; solo puede iniciar o migrar escuelas asignadas a su usuario.</p>`;
  }

  function _showSelectionBlocked(e) {
    const assigned = _schoolSurveyor(e) || 'No asignada';
    UI.showAlert(
      'Escuela no asignada',
      `Puede ver esta escuela en el mapa, pero no puede seleccionarla para carga. Asignada a: ${assigned}.`,
      'warning'
    );
  }

  function _estimateMinutes(e) {
    return parseInt(e.tiempo_estimado_min || e.tiempo_estimado || '45', 10) || 45;
  }

  function _locationReviewActions(e, block = false) {
    const point = _validPoint(e);
    if (!point) return '<p class="map-location-review map-location-review--empty">Sin coordenadas para revisar ubicacion.</p>';
    const idArg = _jsString(_schoolPrimaryId(e));
    const cls = block ? 'map-location-review map-location-review--block' : 'map-location-review';
    return `
      <div class="${cls}">
        <button class="btn btn-outline btn-sm" onclick='MapModule.openLocationReview(${idArg}, "maps")'>Maps</button>
        <button class="btn btn-outline btn-sm" onclick='MapModule.openLocationReview(${idArg}, "street")'>Street View</button>
        <button class="btn btn-outline btn-sm" onclick='MapModule.openLocationReview(${idArg}, "osm")'>OSM</button>
      </div>`;
  }

  function _validPoint(e) {
    const lat = parseFloat(e.latitud);
    const lng = parseFloat(e.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  function _locationLinks(e = {}) {
    const point = _validPoint(e);
    if (!point) return {};
    const label = encodeURIComponent(`${point.lat},${point.lng} ${e.nombre || e.nombre_escuela || e.codigo_local || ''}`.trim());
    const viewpoint = encodeURIComponent(`${point.lat},${point.lng}`);
    return {
      maps: `https://www.google.com/maps/search/?api=1&query=${label}`,
      street: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${viewpoint}`,
      osm: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(point.lat)}&mlon=${encodeURIComponent(point.lng)}#map=18/${encodeURIComponent(point.lat)}/${encodeURIComponent(point.lng)}`,
    };
  }

  function _findSchoolById(id) {
    const key = String(id || '').trim();
    const keyDigits = _digits(key);
    if (!key && _selectedEscuela) return _selectedEscuela;
    return _escuelas.find(e => {
      const keys = _schoolIdentityKeys(e);
      return keys.includes(key) || (keyDigits && keys.includes(keyDigits));
    }) || null;
  }

  function openLocationReview(id, type = 'maps') {
    const escuela = _findSchoolById(id);
    if (!escuela) {
      UI.showToast('No se encontro la escuela para revisar ubicacion.', 'warning');
      return;
    }
    const links = _locationLinks(escuela);
    const url = links[type] || links.maps;
    if (!url) {
      UI.showToast('La escuela no tiene coordenadas para revisar.', 'warning');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
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

  function _googleRoutesKey() {
    return String(APP_CONFIG.GOOGLE_ROUTES_API_KEY || APP_CONFIG.GOOGLE_MAP_TILES_API_KEY || '').trim();
  }

  function _googleRoutesEnabled() {
    return APP_CONFIG.MAP_REAL_ROUTES_ENABLED !== false &&
      !_googleRoutesUnavailable &&
      Boolean(_googleRoutesKey()) &&
      !(typeof navigator !== 'undefined' && navigator.onLine === false);
  }

  function _googleWaypoint(point) {
    return {
      location: {
        latLng: {
          latitude: Number(point.lat),
          longitude: Number(point.lng),
        },
      },
    };
  }

  function _routeCacheKey(points = []) {
    return points
      .map(point => `${Number(point.lat).toFixed(5)},${Number(point.lng).toFixed(5)}`)
      .join('|');
  }

  function _decodeGooglePolyline(encoded = '') {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  }

  function _durationSeconds(value = '') {
    const match = String(value || '').match(/^(\d+(?:\.\d+)?)s$/);
    return match ? Number(match[1]) : 0;
  }

  function _formatRouteDistance(meters = 0) {
    const n = Number(meters || 0);
    if (!Number.isFinite(n) || n <= 0) return '';
    return n >= 1000 ? `${(n / 1000).toFixed(1)} km` : `${Math.round(n)} m`;
  }

  function _formatRouteDuration(seconds = 0) {
    const minutes = Math.round(Number(seconds || 0) / 60);
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    if (minutes < 60) return `${minutes} min viaje`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min viaje`;
  }

  async function _computeGoogleRouteChunk(points = []) {
    if (points.length < 2) return { latlngs: [], distanceMeters: 0, durationSeconds: 0 };
    const key = _routeCacheKey(points);
    if (_googleRouteCache.has(key)) return _googleRouteCache.get(key);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 14000);
    try {
      const response = await fetch(GOOGLE_ROUTES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': _googleRoutesKey(),
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: _googleWaypoint(points[0]),
          destination: _googleWaypoint(points[points.length - 1]),
          intermediates: points.slice(1, -1).map(_googleWaypoint),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          polylineQuality: 'OVERVIEW',
          polylineEncoding: 'ENCODED_POLYLINE',
          languageCode: 'es-419',
          regionCode: 'PY',
          units: 'METRIC',
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error?.message || `Google Routes HTTP ${response.status}`);
      const route = data.routes?.[0] || {};
      const encoded = route.polyline?.encodedPolyline || '';
      const result = {
        latlngs: encoded ? _decodeGooglePolyline(encoded) : [],
        distanceMeters: Number(route.distanceMeters || 0),
        durationSeconds: _durationSeconds(route.duration),
      };
      if (!result.latlngs.length) throw new Error('Google Routes no devolvio polilinea.');
      _googleRouteCache.set(key, result);
      if (_googleRouteCache.size > 260) _googleRouteCache.delete(_googleRouteCache.keys().next().value);
      return result;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function _computeGoogleRoute(points = []) {
    const valid = points.filter(Boolean);
    const totals = { latlngs: [], distanceMeters: 0, durationSeconds: 0 };
    for (let start = 0; start < valid.length - 1; start += GOOGLE_ROUTES_MAX_POINTS - 1) {
      const chunk = valid.slice(start, Math.min(valid.length, start + GOOGLE_ROUTES_MAX_POINTS));
      if (chunk.length < 2) continue;
      const result = await _computeGoogleRouteChunk(chunk);
      const latlngs = [...(result.latlngs || [])];
      if (latlngs.length) {
        if (totals.latlngs.length) latlngs.shift();
        totals.latlngs.push(...latlngs);
      }
      totals.distanceMeters += Number(result.distanceMeters || 0);
      totals.durationSeconds += Number(result.durationSeconds || 0);
    }
    return totals;
  }

  async function _upgradeRouteToGoogle(name, route, fallbackLine, token) {
    if (!_googleRoutesEnabled()) return;
    try {
      const points = route.map(_validPoint).filter(Boolean);
      const result = await _computeGoogleRoute(points);
      if (token !== _routeRenderToken || !_routeLayer || !_routesVisible || result.latlngs.length < 2) return;
      if (fallbackLine) _routeLayer.removeLayer(fallbackLine);
      const distance = _formatRouteDistance(result.distanceMeters);
      const duration = _formatRouteDuration(result.durationSeconds);
      const detail = [distance, duration].filter(Boolean).join(' · ');
      L.polyline(result.latlngs, {
        color: _surveyorColor(name),
        weight: 4,
        opacity: .82,
        lineJoin: 'round',
      }).bindTooltip(`${name}: ruta real Google · ${route.length} puntos${detail ? ` · ${detail}` : ''}`).addTo(_routeLayer);
    } catch (err) {
      console.warn('[Mapa] No se pudo calcular ruta Google:', err);
      _googleRoutesUnavailable = true;
      if (!_googleRoutesNoticeShown) {
        _googleRoutesNoticeShown = true;
        UI.showToast('No se pudo calcular rutas reales de Google. Se mantienen lineas directas como respaldo.', 'warning', 7200);
      }
    }
  }

  function _renderRoutes(escuelas) {
    if (!_routeLayer) return;
    const token = ++_routeRenderToken;
    _routeLayer.clearLayers();
    if (!_routesVisible) return;
    if (APP_CONFIG.MAP_REAL_ROUTES_ENABLED !== false && !_googleRoutesKey() && !_googleRoutesNoticeShown) {
      _googleRoutesNoticeShown = true;
      UI.showToast('Rutas reales Google no configuradas. Se muestran lineas directas como respaldo.', 'info', 6400);
    }
    const groups = _groupBySurveyor(escuelas.filter(e => _schoolSurveyor(e) && !_isUnassigned(e)));
    Object.entries(groups).forEach(([name, rows]) => {
      const route = _nearestRoute(rows);
      const latlngs = route.map(_validPoint).filter(Boolean).map(p => [p.lat, p.lng]);
      if (latlngs.length < 2) return;
      const fallbackLine = L.polyline(latlngs, {
        color: _surveyorColor(name),
        weight: 3,
        opacity: .55,
        dashArray: '8 8',
      }).bindTooltip(`${name}: linea directa - ${route.length} puntos - ${route.reduce((s, e) => s + _estimateMinutes(e), 0)} min estimados`).addTo(_routeLayer);
      _upgradeRouteToGoogle(name, route, fallbackLine, token);
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
      const state = _schoolState(e);
      if (counts[state] !== undefined) counts[state]++;
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
    const targetSchool = _findSchoolById(id);
    const marker = _markers[id] || (targetSchool ? _markers[_schoolPrimaryId(targetSchool)] : null);
    const highlightId = targetSchool ? _schoolPrimaryId(targetSchool) : id;
    if (!marker || !_map) {
      _highlightListItem(highlightId);
      const escuela = targetSchool;
      if (escuela) {
        _selectedEscuela = escuela;
        _updateInfoPanel(escuela);
        _updateJumpState();
      }
      if (!window.L) UI.showToast('Mapa grafico no disponible; se muestra la ficha en la lista.', 'info');
      return;
    }
    _map.flyTo(marker.getLatLng(), 14, { animate: true, duration: 0.8 });
    setTimeout(() => marker.openPopup(), 900);
    _highlightListItem(highlightId);
    const escuela = targetSchool;
    if (escuela) {
      _selectedEscuela = escuela;
      _hideInfoPanel();
      _updateJumpState();
    }
  }

  function focusListItem(id) {
    _highlightListItem(id);
    AppController.showModule('mapa');
  }

  function showNextAfterFinalized(currentSchool = {}) {
    const current = _findSchoolLike(currentSchool);
    if (current) {
      current.estado_relevamiento = 'finalizada';
      current.fecha_ultimo_cierre = current.fecha_ultimo_cierre || new Date().toISOString();
    }
    const next = _suggestNextAssignedSchool(current || currentSchool);
    if (typeof AppController !== 'undefined' && AppController.showModule) AppController.showModule('mapa');
    setTimeout(() => {
      if (current?.id_escuela) {
        _renderList(_filteredEscuelas.length ? _filteredEscuelas : _escuelas);
        _updateSummaryBadges(_filteredEscuelas.length ? _filteredEscuelas : _escuelas);
      }
      if (next) {
        flyTo(_schoolPrimaryId(next));
        UI.showToast(`Siguiente escuela sugerida: ${next.nombre || next.codigo_local || next.id_escuela}.`, 'success', 9000);
      } else {
        UI.showToast('Escuela finalizada. No quedan escuelas pendientes asignadas visibles para este usuario.', 'success', 9000);
      }
    }, 700);
    return next || null;
  }

  function _findSchoolLike(school = {}) {
    const keys = _schoolIdentityKeys(school);
    if (!keys.length) return null;
    return _escuelas.find(item => _schoolIdentityKeys(item).some(key => keys.includes(key))) || null;
  }

  function _schoolIdentityKeys(school = {}) {
    const item = school || {};
    return [
      item.id_escuela,
      item.codigo_local,
      item.codigo,
      item.id,
      item.code,
      _digits(item.id_escuela),
      _digits(item.codigo_local),
      _digits(item.codigo),
      _digits(item.id),
      _digits(item.code),
    ]
      .map(value => String(value ?? '').trim())
      .filter(Boolean);
  }

  function _suggestNextAssignedSchool(currentSchool = {}) {
    const currentKeys = _schoolIdentityKeys(currentSchool);
    const currentPoint = _schoolPoint(currentSchool);
    const candidates = _escuelas
      .filter(item => item && !item.es_ejemplo)
      .filter(item => Auth.canOperateSchool(item))
      .filter(item => !_isClosed(item))
      .filter(item => !_schoolIdentityKeys(item).some(key => currentKeys.includes(key)));
    if (!candidates.length) return null;
    return candidates
      .map((item, index) => ({
        item,
        score: _nextSchoolScore(item, currentPoint, index),
      }))
      .sort((a, b) => a.score - b.score)[0]?.item || null;
  }

  function _nextSchoolScore(item, currentPoint, index) {
    const point = _schoolPoint(item);
    const distance = currentPoint && point ? _distanceKm(currentPoint, point) : 9999;
    const pilotBoost = _isPilotSchool(item) ? -50 : 0;
    const order = Number(item.orden_muestra_piloto || item.orden_visita || index + 1);
    return distance * 100 + pilotBoost + (Number.isFinite(order) ? order / 100 : index / 100);
  }

  function _schoolPoint(item = {}) {
    const lat = Number(item.latitud);
    const lng = Number(item.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function _distanceKm(a, b) {
    const toRad = deg => Number(deg || 0) * Math.PI / 180;
    const earthKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  async function startGuidedRegister(id) {
    if (!Auth.requireAuth()) return;
    let escuela = _findSchoolById(id);
    if (!escuela) {
      UI.showToast('No se encontro la escuela seleccionada en el mapa.', 'warning');
      return;
    }
    if (!Auth.canOperateSchool(escuela)) {
      _showSelectionBlocked(escuela);
      return;
    }
    try {
      const primaryId = _schoolPrimaryId(escuela);
      const full = primaryId && typeof API !== 'undefined' && API.getEscuela
        ? await API.getEscuela(primaryId, { includeDraft: true })
        : null;
      if (full?.status === 'ok' && full.data) {
        escuela = _replaceSchoolRecord(_mergeSchoolRecord(escuela, full.data));
      } else if (full?.status === 'error') {
        console.warn('[Mapa] No se pudo hidratar la ficha MEC antes de abrir:', full.message);
      }
    } catch (err) {
      console.warn('[Mapa] No se pudo traer la ultima ficha MEC; se abre con cache local:', err);
    }
    if (!_perimeters.length) {
      await loadPerimeters({ silent: true }).catch(err => console.warn('[Mapa] No se pudo cargar perimetro antes de abrir registro:', err));
    }
    escuela = _replaceSchoolRecord(_enrichSchoolWithPerimeter(escuela));
    _selectedEscuela = escuela;
    _highlightListItem(_schoolPrimaryId(escuela));
    _hideInfoPanel();
    try {
      const ready = typeof SurveyModule !== 'undefined' && typeof SurveyModule.setCurrentEscuela === 'function'
        ? SurveyModule.setCurrentEscuela(escuela)
        : true;
      if (!ready) return;
      await Promise.resolve(AppController.showModule('registro'));
      if (typeof MecFormModule !== 'undefined' && MecFormModule.setSelectedSchool) {
        MecFormModule.setSelectedSchool(escuela, { render: false, force: true });
      }
      if (typeof GuidedRegisterModule !== 'undefined') GuidedRegisterModule.init();
    } catch (err) {
      console.warn('[Mapa] No se pudo reforzar la escuela activa en Registro guiado:', err);
      UI.showToast(`No se pudo abrir Registro guiado: ${err.message || err}`, 'error', 8000);
      return;
    }
    UI.showToast(`Escuela activa: ${escuela.nombre || escuela.codigo_local || escuela.id_escuela}.`, 'success', 4200);
  }

  async function solicitarRelevamiento(id) {
    if (!Auth.requireAuth()) return;
    const escuela = _findSchoolById(id);
    if (!escuela) {
      UI.showToast('No se encontro la escuela seleccionada.', 'warning');
      return;
    }
    if (!_canRequestSurvey(escuela)) {
      UI.showToast('Solo se puede solicitar una escuela pendiente y sin asignacion.', 'warning', 6000);
      return;
    }
    const ok = await UI.showConfirm(
      'Solicitar relevamiento',
      `Se enviara al administrador una solicitud para relevar ${escuela.nombre || escuela.codigo_local || escuela.id_escuela}.`
    );
    if (!ok) return;
    try {
      const result = await API.solicitarRelevamiento({
        id_escuela: escuela.id_escuela,
        codigo_local: escuela.codigo_local || '',
        nombre_escuela: escuela.nombre || '',
        departamento: escuela.departamento || '',
        distrito: escuela.distrito || '',
        localidad: escuela.localidad || '',
      });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo enviar la solicitud.');
      const emailStatus = result.data?.email_status || {};
      const emailFailed = emailStatus.sent === false || String(emailStatus.error || '').trim();
      UI.showToast(
        _solicitudRelevamientoMessage(result, emailFailed),
        emailFailed ? 'warning' : 'success',
        emailFailed ? 9000 : 6500
      );
      const marker = _markers[_schoolPrimaryId(escuela)];
      if (marker) marker.closePopup();
    } catch (err) {
      UI.showToast('Error al enviar solicitud: ' + err.message, 'error', 7000);
    }
  }

  function _solicitudRelevamientoMessage(result, emailFailed) {
    const message = String(result?.message || '').trim();
    const error = String(result?.data?.email_status?.error || '').trim();
    if (!emailFailed) return message || 'Solicitud enviada al administrador.';
    if (/MailApp|script\.send_mail|send_mail|permiso|authorization/i.test(`${message} ${error}`)) {
      return 'Solicitud registrada. El correo al administrador quedo pendiente porque falta autorizar MailApp en el Web App. El administrador puede aprobarla desde Encuestadores > Solicitudes.';
    }
    return message || 'Solicitud registrada, pero el correo no pudo enviarse. El administrador puede verla en Encuestadores > Solicitudes.';
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

  function getPerimeterForSchool(school = {}) {
    return _perimeterForSchool(school);
  }

  function clearSelection(options = {}) {
    _selectedEscuela = null;
    document.querySelectorAll('.map-list-item--active').forEach(el => el.classList.remove('map-list-item--active'));
    const panel = document.getElementById('map-info-panel');
    if (panel && options.render !== false) {
      panel.classList.remove('map-info-panel--visible');
      panel.innerHTML = '';
    }
  }

  function getFiltered() {
    return _filteredEscuelas;
  }

  // ── Populate filter buttons ───────────────────────────────────────────────

  function populateFilterButtons() {
    const departamentos = _uniqueNormalizedOptions(_escuelas.map(_schoolDepartment));
    const encuestadores = _uniqueNormalizedOptions(_escuelas.map(_schoolSurveyor).filter(name => !_sameFilterValue(name, 'Sin asignar') && !_sameFilterValue(name, 'No asignada')));

    _populateSelectChoices('filter-departamento', departamentos, 'Todos');
    populateDistrictButtons();
    _populateButtonChoices('filter-encuestador', encuestadores, 'Todos');
  }

  function populateDistrictButtons(departamento = '') {
    const selectedDepartment = departamento || document.getElementById('filter-departamento')?.value || '';
    const distritos = _uniqueNormalizedOptions(_escuelas
      .filter(e => !selectedDepartment || _sameFilterValue(_schoolDepartment(e), selectedDepartment))
      .map(_schoolDistrict));
    _populateSelectChoices('filter-distrito', distritos, 'Todos');
  }

  function _populateSelectChoices(id, options, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = String(select.value || '');
    const nextValue = current
      ? (options.find(option => _sameFilterValue(option, current)) || '')
      : '';
    select.innerHTML = [
      `<option value="">${_escape(placeholder)}</option>`,
      ...options.map(option => `<option value="${_escape(option)}">${_escape(option)}</option>`),
    ].join('');
    select.value = nextValue;
  }

  function _populateButtonChoices(id, options, placeholder) {
    const input = document.getElementById(id);
    const list = document.querySelector(`[data-choice-list="${id}"]`);
    if (!input || !list) return;
    const current = String(input.value || '');
    input.value = current
      ? (options.find(option => _sameFilterValue(option, current)) || '')
      : '';
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
    loadPerimeters,
    togglePerimeters,
    flyTo,
    focusListItem,
    showNextAfterFinalized,
    startGuidedRegister,
    solicitarRelevamiento,
    invalidateSize,
    getMap,
    getEscuelas,
    getSelectedEscuela,
    getPerimeterForSchool,
    clearSelection,
    getFiltered,
    jumpFilteredSchool,
    populateFilterButtons,
    populateDistrictButtons,
    toggleRoutes,
    promptAutoAssign,
    autoAssignClusters,
    cacheVisibleMap,
    updateOfflineStatus,
    openLocationReview,
  };
})();
