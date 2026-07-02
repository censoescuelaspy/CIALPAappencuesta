/**
 * CIALPA - Relevamiento Escolar
 * geo-measure.js - Calculos metricos para poligonos lat/lng
 * Version: 2.6.180
 */

const GeoMeasure = (() => {
  const EARTH_RADIUS_M = 6371008.8;

  function _number(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const num = Number(String(value).replace(',', '.'));
    return Number.isFinite(num) ? num : NaN;
  }

  function _round(value, decimals = 2) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function formatNumber(value, decimals = 2) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return num.toFixed(decimals);
  }

  function _rad(deg) {
    return (Number(deg) || 0) * Math.PI / 180;
  }

  function normalizeVertices(vertices = []) {
    const rows = (Array.isArray(vertices) ? vertices : [])
      .map(vertex => {
        const lat = Array.isArray(vertex)
          ? _number(vertex[0])
          : _number(vertex?.lat ?? vertex?.latitude ?? vertex?.latitud ?? vertex?.y);
        const lng = Array.isArray(vertex)
          ? _number(vertex[1])
          : _number(vertex?.lng ?? vertex?.lon ?? vertex?.longitude ?? vertex?.longitud ?? vertex?.x);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat: _round(lat, 8), lng: _round(lng, 8) };
      })
      .filter(Boolean);

    if (rows.length > 1) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (Math.abs(first.lat - last.lat) < 0.0000001 && Math.abs(first.lng - last.lng) < 0.0000001) rows.pop();
    }
    return rows;
  }

  function distanceMeters(a, b) {
    if (!a || !b) return 0;
    const lat1 = _rad(a.lat);
    const lat2 = _rad(b.lat);
    const dLat = _rad(Number(b.lat) - Number(a.lat));
    const dLng = _rad(Number(b.lng) - Number(a.lng));
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }

  function _origin(vertices) {
    const count = vertices.length || 1;
    return {
      lat: vertices.reduce((sum, vertex) => sum + Number(vertex.lat || 0), 0) / count,
      lng: vertices.reduce((sum, vertex) => sum + Number(vertex.lng || 0), 0) / count,
    };
  }

  function _project(vertex, origin) {
    const originLat = _rad(origin.lat);
    return {
      x: EARTH_RADIUS_M * (_rad(vertex.lng) - _rad(origin.lng)) * Math.cos(originLat),
      y: EARTH_RADIUS_M * (_rad(vertex.lat) - _rad(origin.lat)),
    };
  }

  function _areaMeters2(vertices) {
    if (!Array.isArray(vertices) || vertices.length < 3) return 0;
    const origin = _origin(vertices);
    const points = vertices.map(vertex => _project(vertex, origin));
    let acc = 0;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      acc += points[i].x * next.y - next.x * points[i].y;
    }
    return Math.abs(acc) / 2;
  }

  function _bounds(vertices) {
    const lats = vertices.map(vertex => Number(vertex.lat)).filter(Number.isFinite);
    const lngs = vertices.map(vertex => Number(vertex.lng)).filter(Number.isFinite);
    if (!lats.length || !lngs.length) return null;
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }

  function _extentMeters(vertices) {
    const bounds = _bounds(vertices);
    if (!bounds) return { largo_m: 0, ancho_m: 0, width_m: 0, height_m: 0 };
    const midLat = (bounds.minLat + bounds.maxLat) / 2;
    const midLng = (bounds.minLng + bounds.maxLng) / 2;
    const width = distanceMeters({ lat: midLat, lng: bounds.minLng }, { lat: midLat, lng: bounds.maxLng });
    const height = distanceMeters({ lat: bounds.minLat, lng: midLng }, { lat: bounds.maxLat, lng: midLng });
    return {
      width_m: _round(width, 2),
      height_m: _round(height, 2),
      largo_m: _round(Math.max(width, height), 2),
      ancho_m: _round(Math.min(width, height), 2),
    };
  }

  function measurePolygon(vertices = []) {
    const normalized = normalizeVertices(vertices);
    if (normalized.length < 3) {
      return {
        valid: false,
        vertices_count: normalized.length,
        sides: [],
        side_lengths_m: [],
        perimeter_m: 0,
        area_m2: 0,
        area_ha: 0,
      };
    }
    const sides = normalized.map((vertex, index) => {
      const nextIndex = (index + 1) % normalized.length;
      const length = distanceMeters(vertex, normalized[nextIndex]);
      return {
        index: index + 1,
        label: `L${index + 1}`,
        from: index + 1,
        to: nextIndex + 1,
        length_m: _round(length, 2),
      };
    });
    const perimeter = sides.reduce((sum, side) => sum + Number(side.length_m || 0), 0);
    const area = _areaMeters2(normalized);
    const extent = _extentMeters(normalized);
    return {
      valid: true,
      vertices_count: normalized.length,
      sides,
      side_lengths_m: sides.map(side => side.length_m),
      perimeter_m: _round(perimeter, 2),
      area_m2: _round(area, 2),
      area_ha: _round(area / 10000, 4),
      extent,
      method: 'haversine_sides_local_projection_area',
    };
  }

  function formatDistance(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (num >= 1000) return `${formatNumber(num / 1000, 2)} km`;
    return `${formatNumber(num, 2)} m`;
  }

  function formatArea(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    const hectares = num / 10000;
    if (hectares >= 1) return `${formatNumber(num, 2)} m2 (${formatNumber(hectares, 4)} ha)`;
    return `${formatNumber(num, 2)} m2`;
  }

  function formatSideList(measurement, options = {}) {
    const sides = Array.isArray(measurement?.sides) ? measurement.sides : [];
    const separator = options.separator === undefined ? '\n' : options.separator;
    return sides.map(side => `${side.label || `L${side.index}`}: ${formatDistance(side.length_m)}`).join(separator);
  }

  return {
    normalizeVertices,
    distanceMeters,
    measurePolygon,
    formatNumber,
    formatDistance,
    formatArea,
    formatSideList,
  };
})();
