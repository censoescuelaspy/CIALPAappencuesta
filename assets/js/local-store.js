/**
 * CIALPA — local-store.js
 * Almacen local offline-first para cache, cola de sincronizacion y analitica.
 */

const CialpaLocalStore = (() => {
  'use strict';

  const DB_NAME = 'cialpa_offline_store';
  const DB_VERSION = 2;
  const FALLBACK_PREFIX = 'cialpa_local_store_';
  const MEC_DRAFT_KEY = 'cialpa_mec_form_draft_v1';
  let _dbPromise = null;

  function init() {
    return _openDb().catch(() => null);
  }

  function _openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB no disponible'));
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('queue')) {
          const queue = db.createObjectStore('queue', { keyPath: 'id' });
          queue.createIndex('status', 'status', { unique: false });
          queue.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('catastro')) {
          const catastro = db.createObjectStore('catastro', { keyPath: 'key' });
          catastro.createIndex('savedAt', 'savedAt', { unique: false });
          catastro.createIndex('ccatastral', 'ccatastral', { unique: false });
          catastro.createIndex('schoolKey', 'schoolKey', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'));
    });
    return _dbPromise;
  }

  async function _storePut(storeName, record) {
    try {
      const db = await _openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem(FALLBACK_PREFIX + storeName + '_' + record.key, JSON.stringify(record));
      return record;
    }
  }

  async function _storeGet(storeName, key) {
    try {
      const db = await _openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try {
        return JSON.parse(localStorage.getItem(FALLBACK_PREFIX + storeName + '_' + key) || 'null');
      } catch {
        return null;
      }
    }
  }

  async function _storeAll(storeName) {
    try {
      const db = await _openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      const prefix = FALLBACK_PREFIX + storeName + '_';
      const records = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        records.push(key);
      }
      return records.map(key => {
          try { return JSON.parse(localStorage.getItem(key) || 'null'); }
          catch { return null; }
        })
        .filter(Boolean);
    }
  }

  function _stableStringify(value) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) return `[${value.map(_stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${key}:${_stableStringify(value[key])}`).join(',')}}`;
  }

  function apiKey(endpoint, request = {}) {
    return `api:${endpoint}:${_stableStringify(request)}`;
  }

  async function rememberApi(endpoint, method, request, response) {
    if (!response || response.status !== 'ok') return null;
    const record = {
      key: apiKey(endpoint, request || {}),
      endpoint,
      method,
      request: request || {},
      response,
      savedAt: new Date().toISOString(),
    };
    await _storePut('cache', record);
    await _storePut('cache', { ...record, key: `api:${endpoint}:latest` });
    return record;
  }

  async function getApi(endpoint, request = {}) {
    return (await _storeGet('cache', apiKey(endpoint, request))) ||
      (await _storeGet('cache', `api:${endpoint}:latest`));
  }

  async function getApiExact(endpoint, request = {}) {
    return _storeGet('cache', apiKey(endpoint, request));
  }

  async function rememberCatastro(record = {}) {
    const now = new Date().toISOString();
    const key = String(record.key || record.ccatastral || record.clave_comparacion || record.id || `catastro_${Date.now()}`).trim();
    const saved = {
      ...(record || {}),
      key,
      savedAt: record.savedAt || now,
      updatedAt: now,
    };
    await _storePut('catastro', saved);
    return saved;
  }

  async function getCatastro(key) {
    return _storeGet('catastro', String(key || ''));
  }

  async function listCatastro(options = {}) {
    const limit = Number(options.limit || 1000);
    const schoolKey = String(options.schoolKey || '').trim();
    const rows = (await _storeAll('catastro'))
      .filter(row => !schoolKey || String(row.schoolKey || '') === schoolKey)
      .sort((a, b) => String(b.savedAt || b.updatedAt || '').localeCompare(String(a.savedAt || a.updatedAt || '')));
    return rows.slice(0, limit);
  }

  async function enqueue(endpoint, method, data, reason = '') {
    const id = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      ...(data || {}),
      clientMutationId: data?.clientMutationId || id,
      id_offline_queue: data?.id_offline_queue || id,
    };
    const record = {
      id,
      endpoint,
      method,
      data: payload,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    try {
      const db = await _openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('queue', 'readwrite');
        tx.objectStore('queue').put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem(FALLBACK_PREFIX + 'queue_' + record.id, JSON.stringify(record));
    }
    return record;
  }

  async function getQueue() {
    return (await _storeAll('queue')).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  async function updateQueueStatus(id, status, extra = {}) {
    const current = (await getQueue()).find(item => item.id === id);
    if (!current) return null;
    const record = {
      ...current,
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
      attempts: Number(current.attempts || 0) + (extra.bumpAttempt === false ? 0 : 1),
    };
    try {
      const db = await _openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('queue', 'readwrite');
        tx.objectStore('queue').put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem(FALLBACK_PREFIX + 'queue_' + record.id, JSON.stringify(record));
    }
    return record;
  }

  function getMecDraft() {
    try {
      return JSON.parse(localStorage.getItem(MEC_DRAFT_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function _normalState(value) {
    const state = String(value || '').toLowerCase().trim();
    if (['finalizada', 'finalizado', 'cerrada', 'completada'].includes(state)) return 'finalizada';
    if (['en curso', 'en_curso', 'curso', 'iniciada'].includes(state)) return 'en_curso';
    if (['incidencia', 'con incidencia'].includes(state)) return 'incidencia';
    return 'pendiente';
  }

  function _normText(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function _isTrueish(value) {
    return ['true', '1', 'si', 's', 'yes', 'y', 'piloto', 'muestra', 'muestra_piloto'].includes(_normText(value));
  }

  function _isPilotSchool(item) {
    return _isTrueish(item?.en_muestra_piloto)
      || _isTrueish(item?.muestra_piloto)
      || _normText(item?.prioridad_operativa).includes('piloto')
      || String(item?.orden_muestra_piloto ?? '').trim() !== '';
  }

  function _schoolMatchesStatsFilters(item, filters = {}) {
    const stage = _normText(filters.etapa || filters.etapa_operativa || filters.muestra || '');
    if (stage === 'piloto' && !_isPilotSchool(item)) return false;
    if (stage === 'censal' && _isPilotSchool(item)) return false;
    if (filters.departamento && String(item.departamento || '') !== String(filters.departamento)) return false;
    if (filters.distrito && String(item.distrito || '') !== String(filters.distrito)) return false;
    const encFilter = filters.encuestador || filters.usuario || '';
    if (encFilter && String(item.encuestador_asignado || item.encuestador || '') !== String(encFilter)) return false;
    return true;
  }

  function _pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function _blankStats() {
    return {
      total: 0,
      finalizadas: 0,
      en_curso: 0,
      pendientes: 0,
      con_incidencia: 0,
      pct_avance: 0,
      por_departamento: [],
      por_encuestador: [],
      por_dia: [],
      actividad_reciente: [],
    };
  }

  function normalizeStats(raw = {}) {
    const total = Number(raw.total || 0);
    const finalizadas = Number(raw.finalizadas ?? raw.finalizada ?? 0);
    const enCurso = Number(raw.en_curso ?? raw.enCurso ?? 0);
    const pendientes = Number(raw.pendientes ?? raw.pendiente ?? Math.max(0, total - finalizadas - enCurso));
    const incidencias = Number(raw.con_incidencia ?? raw.incidencias ?? raw.incidencia ?? 0);
    return {
      ..._blankStats(),
      ...raw,
      total,
      finalizadas,
      en_curso: enCurso,
      pendientes,
      con_incidencia: incidencias,
      pct_avance: Number(raw.pct_avance ?? raw.porcentaje_avance ?? _pct(finalizadas, total)),
      por_departamento: (raw.por_departamento || []).map(row => ({
        departamento: row.departamento || 'Sin dato',
        total: Number(row.total || 0),
        finalizadas: Number(row.finalizadas ?? row.finalizada ?? 0),
        en_curso: Number(row.en_curso ?? 0),
        pendientes: Number(row.pendientes ?? row.pendiente ?? 0),
        incidencias: Number(row.incidencias ?? row.con_incidencia ?? row.incidencia ?? 0),
        con_coordenadas: Number(row.con_coordenadas ?? row.con_marcador ?? row.georreferenciadas ?? row.with_coords ?? 0),
        sin_coordenadas: Number(row.sin_coordenadas ?? row.sin_marcador ?? row.no_georreferenciadas ?? row.missing_coords ?? 0),
        pendientes_con_coordenadas: Number(row.pendientes_con_coordenadas ?? row.pendientes_con_marcador ?? 0),
        pendientes_sin_coordenadas: Number(row.pendientes_sin_coordenadas ?? row.pendientes_sin_marcador ?? 0),
      })),
      por_encuestador: (raw.por_encuestador || []).map(row => {
        const completadas = Number(row.registros_completados ?? row.completadas ?? row.completados ?? 0);
        return {
          encuestador: row.encuestador || 'Sin asignar',
          total_asignadas: Number(row.total_asignadas ?? row.asignadas ?? row.total ?? 0),
          finalizadas: Math.max(Number(row.finalizadas ?? row.finalizada ?? 0), completadas),
          incidencias: Number(row.incidencias ?? row.con_incidencia ?? 0),
          sesiones: Number(row.sesiones ?? row.sessions ?? 0),
          registros_completados: completadas,
          promedio_minutos: row.promedio_minutos || row.tiempo_promedio || '',
        };
      }),
      por_dia: raw.por_dia || raw.historico || [],
      actividad_reciente: raw.actividad_reciente || [],
    };
  }

  function statsFromSchools(escuelas = [], filters = {}) {
    const filteredSchools = (escuelas || []).filter(item => _schoolMatchesStatsFilters(item, filters));
    const stats = _blankStats();
    stats.total = filteredSchools.length;
    const dep = {};
    const enc = {};
    filteredSchools.forEach(item => {
      const state = _normalState(item.estado_relevamiento || item.estado);
      if (state === 'finalizada') stats.finalizadas++;
      else if (state === 'en_curso') stats.en_curso++;
      else if (state === 'incidencia') stats.con_incidencia++;
      else stats.pendientes++;

      const depKey = item.departamento || 'Sin dato';
      dep[depKey] = dep[depKey] || {
        departamento: depKey,
        total: 0,
        finalizadas: 0,
        en_curso: 0,
        pendientes: 0,
        incidencias: 0,
        con_coordenadas: 0,
        sin_coordenadas: 0,
        pendientes_con_coordenadas: 0,
        pendientes_sin_coordenadas: 0,
      };
      const hasCoords = _hasValidCoords(item);
      dep[depKey].total++;
      if (hasCoords) dep[depKey].con_coordenadas++;
      else dep[depKey].sin_coordenadas++;
      if (state === 'finalizada') {
        dep[depKey].finalizadas++;
      } else if (state === 'en_curso') {
        dep[depKey].en_curso++;
      } else if (state === 'incidencia') {
        dep[depKey].incidencias++;
      } else {
        dep[depKey].pendientes++;
        if (hasCoords) dep[depKey].pendientes_con_coordenadas++;
        else dep[depKey].pendientes_sin_coordenadas++;
      }

      const encKey = item.encuestador_asignado || 'Sin asignar';
      enc[encKey] = enc[encKey] || { encuestador: encKey, total_asignadas: 0, finalizadas: 0, incidencias: 0, sesiones: 0, registros_completados: 0, promedio_minutos: '' };
      enc[encKey].total_asignadas++;
      if (state === 'finalizada') enc[encKey].finalizadas++;
      if (state === 'incidencia') enc[encKey].incidencias++;
      enc[encKey].registros_completados = enc[encKey].finalizadas;
    });
    stats.pct_avance = _pct(stats.finalizadas, stats.total);
    stats.por_departamento = Object.values(dep).sort((a, b) => b.total - a.total);
    stats.por_encuestador = Object.values(enc).sort((a, b) => b.finalizadas - a.finalizadas);
    return stats;
  }

  function _hasValidCoords(item = {}) {
    const lat = Number(String(item.latitud ?? item.lat ?? item.latitude ?? '').replace(',', '.'));
    const lng = Number(String(item.longitud ?? item.lng ?? item.lon ?? item.longitude ?? '').replace(',', '.'));
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  function _schemaEvidenceFields(values) {
    if (typeof MEC_SCHEMA === 'undefined') return [];
    const fields = [];
    MEC_SCHEMA.modules.forEach(module => {
      (module.sections || []).forEach(section => {
        (section.fields || []).forEach(field => {
          if (!field.evidence || !_fieldVisible(field, values)) return;
          fields.push({
            key: `${module.id}.${field.id}`,
            moduleId: module.id,
            label: field.evidenceLabel || field.label || field.id,
          });
        });
      });
    });
    return fields;
  }

  function _fieldVisible(field, values) {
    return _visibleRuleMatches(field.visibleWhen, values);
  }

  function _visibleRuleMatches(rule, values) {
    if (!rule) return true;
    if (Array.isArray(rule.all)) return rule.all.every(item => _visibleRuleMatches(item, values));
    if (Array.isArray(rule.any)) return rule.any.some(item => _visibleRuleMatches(item, values));
    const [moduleId, fieldId] = String(rule.field || '').split('.');
    const current = values?.[moduleId]?.[fieldId];
    if ('equals' in rule) return current === rule.equals;
    if ('not' in rule) return current !== rule.not;
    if (Array.isArray(rule.in)) return rule.in.includes(current);
    if (Array.isArray(rule.notIn)) return !rule.notIn.includes(current);
    return true;
  }

  function mecMetrics(draft = getMecDraft()) {
    const values = draft?.values || draft || {};
    const classrooms = values.__classrooms || [];
    const blocks = values.__blocks || [];
    const sanitaries = values.__sanitaries || [];
    const siteElements = values.__siteElements || [];
    const objects = classrooms.flatMap(room => (room.objects || []).map(object => ({ ...object, room })));
    const sanitaryObjects = sanitaries.flatMap(sanitary => [
      ...(sanitary.objects || []),
      ...(sanitary.fixtures || []),
      ...(sanitary.artefactos || []),
      ...(sanitary.cabins || []),
      ...(sanitary.cabinas || []),
    ].map(object => ({ ...object, sanitary })));
    const allObjects = [...objects, ...sanitaryObjects];
    const evidence = values.__evidence || {};
    const schemaEvidence = _schemaEvidenceFields(values);
    const objectEvidenceCount = objects.reduce((sum, object) => sum + ((object.ficha?.evidencias || []).length), 0);
    const sanitaryEvidenceCount = sanitaries.reduce((sum, item) => sum + ((item.evidencias || []).length), 0);
    const fieldEvidenceCount = Object.values(evidence).reduce((sum, photos) => sum + (Array.isArray(photos) ? photos.length : 0), 0);
    const areaClassrooms = classrooms.reduce((sum, room) => sum + (Number(room.length || 0) * Number(room.width || 0)), 0);
    const areaSanitaries = sanitaries.reduce((sum, item) => sum + (Number(item.largo_m || 0) * Number(item.ancho_m || 0)), 0);
    const areaExteriors = siteElements.reduce((sum, item) => sum + (Number(item.length || item.largo_m || 0) * Number(item.width || item.ancho_m || 0)), 0);
    const evidenceCovered = schemaEvidence.filter(field => Array.isArray(evidence[field.key]) && evidence[field.key].length).length;
    const typeText = item => String([
      item?.type,
      item?.tipo,
      item?.kind,
      item?.label,
      item?.nombre,
      item?.ficha?.tipo,
      item?.ficha?.nombre,
    ].filter(Boolean).join(' ')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const has = (item, pattern) => pattern.test(typeText(item));
    const yes = value => /^(si|sí|true|1|bueno|existe|presente|ok)$/i.test(String(value || '').trim());
    const maybeBad = value => /(malo|mal|deficiente|fuera|riesgo|roto|danad|dañad|inseguro|no funciona|sin servicio)/i.test(String(value || ''));
    const sanitaryAccessible = sanitaries.filter(item => yes(item.accesible || item.accesibilidad || item.bano_accesible)).length;
    const sanitaryBad = sanitaries.filter(item => maybeBad(`${item.estado || ''} ${item.estado_general || ''} ${item.funcionamiento || ''}`)).length;
    const blocksWithGrounding = blocks.filter(item => yes(item.puesta_tierra || item.puesta_a_tierra)).length;
    const blocksWithDifferential = blocks.filter(item => yes(item.proteccion_diferencial || item.disyuntor_diferencial)).length;
    const circuitsIdentified = blocks.filter(item => yes(item.circuitos_identificados || item.tablero_rotulado)).length;
    const blockSwitchboards = blocks.filter(item => String(item.tablero_estado || item.tablero || '').trim()).length;
    const ramps = siteElements.filter(item => has(item, /ramp|rampa/)).length
      + blocks.filter(item => /rampa/.test(String(item.tipo_circulacion || '').toLowerCase())).length;
    const stairs = allObjects.filter(object => has(object, /stair|escalera/)).length
      + siteElements.filter(item => has(item, /stair|escalera/)).length
      + blocks.filter(item => /escalera/.test(String(item.tipo_circulacion || '').toLowerCase())).length;
    const switchboards = allObjects.filter(object => has(object, /switchboard|tablero/)).length
      + siteElements.filter(item => has(item, /switchboard|tablero/)).length
      + blockSwitchboards;

    return {
      savedAt: draft?.savedAt || null,
      blocks: blocks.length,
      classrooms: classrooms.length,
      sanitaries: sanitaries.length,
      siteElements: siteElements.length,
      areaClassrooms,
      areaSanitaries,
      areaExteriors,
      areaTotal: areaClassrooms + areaSanitaries + areaExteriors,
      doors: allObjects.filter(object => has(object, /door|puerta/)).length,
      windows: allObjects.filter(object => has(object, /window|ventana/)).length,
      outlets: allObjects.filter(object => has(object, /outlet|toma|enchufe/)).length,
      lights: allObjects.filter(object => has(object, /light|foco|luz|ilumin/)).length,
      fans: allObjects.filter(object => has(object, /fan|ventilador/)).length,
      airConditioners: allObjects.filter(object => has(object, /air|aire|acond/)).length,
      switchboards,
      damages: allObjects.filter(object => has(object, /damage|dano|daño|fisura|grieta|falla/)).length,
      stairs,
      ramps,
      blocksWithGrounding,
      blocksWithDifferential,
      circuitsIdentified,
      sanitaryAccessible,
      sanitaryBad,
      evidenceFields: schemaEvidence.length,
      evidenceCovered,
      evidencePending: Math.max(0, schemaEvidence.length - evidenceCovered),
      evidenceTotal: fieldEvidenceCount + objectEvidenceCount + sanitaryEvidenceCount,
      fieldEvidenceCount,
      objectEvidenceCount,
      sanitaryEvidenceCount,
      quality: _qualityBuckets(allObjects, sanitaries),
    };
  }

  function _qualityBuckets(objects, sanitaries) {
    const buckets = { Bueno: 0, Regular: 0, Malo: 0, 'Sin estado': 0 };
    [...objects.map(object => object.ficha || {}), ...sanitaries].forEach(item => {
      const state = item.estado || item.estado_general || 'Sin estado';
      const key = ['Bueno', 'Regular', 'Malo'].includes(state) ? state : 'Sin estado';
      buckets[key]++;
    });
    return buckets;
  }

  async function buildLocalAnalytics(remoteStats = null, filters = {}) {
    const [schoolsCache, queue] = await Promise.all([
      getApi('getEscuelas', {}),
      getQueue(),
    ]);
    const schools = schoolsCache?.response?.data || [];
    const schoolStats = schools.length ? statsFromSchools(schools, filters) : _blankStats();
    const hasInteractiveFilters = Boolean(filters && (
      filters.etapa || filters.etapa_operativa || filters.muestra || filters.departamento || filters.distrito || filters.encuestador || filters.usuario
    ));
    const stats = normalizeStats((schools.length && hasInteractiveFilters) ? schoolStats : (remoteStats || schoolStats));
    return {
      stats,
      schoolsCachedAt: schoolsCache?.savedAt || null,
      schoolsCount: schools.length,
      queuePending: queue.filter(item => item.status === 'pending').length,
      queue,
      mec: mecMetrics(),
      online: navigator.onLine,
      generatedAt: new Date().toISOString(),
      source: remoteStats ? 'Servidor + cache local' : (schools.length ? 'Cache local' : 'Borrador local'),
    };
  }

  return {
    init,
    apiKey,
    rememberApi,
    getApi,
    getApiExact,
    rememberCatastro,
    getCatastro,
    listCatastro,
    enqueue,
    getQueue,
    updateQueueStatus,
    getMecDraft,
    normalizeStats,
    statsFromSchools,
    mecMetrics,
    buildLocalAnalytics,
  };
})();
