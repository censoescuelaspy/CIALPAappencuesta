/**
 * CIALPA — Relevamiento Escolar
 * stats.js — Panel estadistico con fallback offline/local.
 * Version: 2.6.93
 */

const StatsModule = (() => {
  'use strict';

  let _charts = {};
  let _statsData = null;
  let _localAnalytics = null;
  let _statsCache = {};
  let _infraCache = null;
  let _infraData = null;
  let _chartLoader = null;
  const STATS_CACHE_TTL = 5 * 60 * 1000;
  const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

  async function init() {
    if (!Auth.canAccess('supervisor')) {
      const dashboard = document.getElementById('offline-dashboard');
      if (dashboard) dashboard.innerHTML = '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
      return;
    }
    _bindFilterEvents();
    await loadStats();
  }

  function _bindFilterEvents() {
    const form = document.getElementById('stats-filter-form');
    if (form && form.dataset.bound !== 'true') {
      form.dataset.bound = 'true';
      let timer = null;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(loadStats, 140);
      };
      form.addEventListener('change', schedule);
      form.addEventListener('click', event => {
        if (event.target.closest('[data-choice-target][data-choice-value]')) {
          setTimeout(schedule, 0);
        }
      });
    }

    const applyBtn = document.getElementById('stats-filter-apply');
    if (applyBtn && applyBtn.dataset.bound !== 'true') {
      applyBtn.dataset.bound = 'true';
      applyBtn.addEventListener('click', loadStats);
    }

    const resetBtn = document.getElementById('stats-filter-reset');
    if (resetBtn && resetBtn.dataset.bound !== 'true') {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        const form = document.getElementById('stats-filter-form');
        form?.reset();
        UI.refreshButtonChoices(form);
        loadStats();
      });
    }
  }

  async function loadStats() {
    const filters = _getFilters();
    const cacheKey = JSON.stringify(filters);
    const cached = _statsCache[cacheKey];
    if (cached && (Date.now() - cached.time < STATS_CACHE_TTL)) {
      _statsData = cached.stats;
      _localAnalytics = cached.local;
      await _renderStatsView();
      return;
    }

    let remoteStats = null;
    let remoteResult = null;
    let remoteError = null;

    try {
      remoteResult = await API.getStats(filters);
      if (remoteResult.status !== 'ok') throw new Error(remoteResult.message || 'Respuesta invalida');
      remoteStats = remoteResult.data;
    } catch (err) {
      remoteError = err;
    }

    try {
      if (remoteResult?.localAnalytics) {
        _localAnalytics = remoteResult.localAnalytics;
      } else if (typeof CialpaLocalStore !== 'undefined') {
        _localAnalytics = await CialpaLocalStore.buildLocalAnalytics(remoteStats);
      }
    } catch (err) {
      console.warn('No se pudo construir analitica local:', err);
    }

    if (!remoteStats && _localAnalytics?.stats) remoteStats = _localAnalytics.stats;
    if (!remoteStats) {
      remoteStats = {};
      if (remoteError) UI.showToast('No se pudieron cargar estadisticas: ' + remoteError.message, 'error');
    } else if (remoteResult?.offline || remoteError) {
      UI.showToast('Panel calculado con datos locales del dispositivo.', 'info', 5000);
    }

    _statsData = _normalizeStats(remoteStats);
    if (!remoteError) _statsCache[cacheKey] = { stats: _statsData, local: _localAnalytics, time: Date.now() };
    await _renderStatsView();
  }

  async function initMecInfrastructure() {
    if (!Auth.canAccess('supervisor')) {
      const root = document.getElementById('mec-infra-root');
      if (root) root.innerHTML = '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
      return;
    }
    await loadMecInfrastructure();
  }

  async function loadMecInfrastructure() {
    const root = document.getElementById('mec-infra-root');
    if (!root) return;
    root.innerHTML = '<div class="loading-state">Preparando tablero de infraestructura MEC...</div>';
    if (_infraCache && Date.now() - _infraCache.time < STATS_CACHE_TTL) {
      _infraData = _infraCache.data;
      _renderMecInfrastructurePanel(_infraData);
      return;
    }

    let remoteStats = _statsData;
    let remoteError = null;
    try {
      const result = await API.getStats({ infraestructura_mec: true }, { skipLoading: true });
      if (result.status !== 'ok') throw new Error(result.message || 'Respuesta invalida');
      remoteStats = _normalizeStats(result.data || {});
      _statsData = remoteStats;
      if (result.localAnalytics) _localAnalytics = result.localAnalytics;
    } catch (err) {
      remoteError = err;
      if (!_localAnalytics && typeof CialpaLocalStore !== 'undefined') {
        try {
          _localAnalytics = await CialpaLocalStore.buildLocalAnalytics(remoteStats);
        } catch (localErr) {
          console.warn('No se pudo construir analitica local MEC:', localErr);
        }
      }
    }

    const localMec = _localAnalytics?.mec || (typeof CialpaLocalStore !== 'undefined' ? CialpaLocalStore.mecMetrics() : null);
    _infraData = _normalizeMecInfrastructure(remoteStats?.infraestructura_mec || remoteStats?.infraestructura || null, localMec);
    _infraCache = { data: _infraData, time: Date.now() };
    _renderMecInfrastructurePanel(_infraData);
    if (remoteError) UI.showToast('Infraestructura MEC calculada con datos locales. Falta publicar/consultar el agregado del servidor.', 'warning', 6500);
  }

  async function _renderStatsView() {
    _renderFilterChoices(_statsData);
    _renderExecutiveDashboard(_statsData, _localAnalytics);
    _renderInsightCards(_statsData, _localAnalytics);
    _renderTerritoryBoard(_statsData.por_departamento || []);
    _renderOfflineDashboard(_localAnalytics);
    _renderInfrastructureDashboard(_localAnalytics);
    _renderKPIs(_statsData);
    try {
      await _ensureChartLibrary();
    } catch (err) {
      console.warn('No se pudo cargar Chart.js, se usaran vistas compactas:', err);
    }
    _renderCharts(_statsData);
    _renderEncuestadoresTable(_statsData.por_encuestador || []);
    _renderRecentActivity(_statsData.actividad_reciente || []);
  }

  function _ensureChartLibrary() {
    if (window.Chart) return Promise.resolve();
    if (_chartLoader) return _chartLoader;
    _chartLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHART_JS_URL;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar la libreria de graficos.'));
      document.body.appendChild(script);
    });
    return _chartLoader;
  }

  function _getFilters() {
    const form = document.getElementById('stats-filter-form');
    if (!form) return {};
    const data = new FormData(form);
    return Object.fromEntries([...data.entries()].filter(([, v]) => v));
  }

  function _renderFilterChoices(data) {
    const form = document.getElementById('stats-filter-form');
    if (!form) return;
    const depInput = document.getElementById('stats-filter-departamento');
    const encInput = document.getElementById('stats-filter-encuestador');
    const depStrip = document.getElementById('stats-dep-choices');
    const encStrip = document.getElementById('stats-enc-choices');
    if (depStrip) {
      const current = depInput?.value || '';
      const rows = (data?.por_departamento || [])
        .filter(row => row.departamento)
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .slice(0, 8);
      depStrip.innerHTML = _choiceButton('stats-filter-departamento', '', 'Todos', current === '')
        + rows.map(row => _choiceButton('stats-filter-departamento', row.departamento, `${row.departamento} (${row.total || 0})`, current === row.departamento)).join('');
    }
    if (encStrip) {
      const current = encInput?.value || '';
      const rows = (data?.por_encuestador || [])
        .filter(row => row.encuestador)
        .sort((a, b) => (b.total_asignadas || 0) - (a.total_asignadas || 0))
        .slice(0, 8);
      encStrip.innerHTML = _choiceButton('stats-filter-encuestador', '', 'Todos', current === '')
        + rows.map(row => _choiceButton('stats-filter-encuestador', row.encuestador, `${_shortLabel(row.encuestador)} (${row.total_asignadas || 0})`, current === row.encuestador)).join('');
    }
    UI.refreshButtonChoices?.(form);
  }

  function _choiceButton(target, value, label, active) {
    return `<button class="choice-button ${active ? 'choice-button--active' : ''}" type="button" data-choice-target="${_escape(target)}" data-choice-value="${_escape(value)}">${_escape(label)}</button>`;
  }

  function _normalizeStats(data) {
    if (typeof CialpaLocalStore !== 'undefined') return CialpaLocalStore.normalizeStats(data || {});
    const total = Number(data?.total || 0);
    const finalizadas = Number(data?.finalizadas ?? data?.finalizada ?? 0);
    const enCurso = Number(data?.en_curso ?? 0);
    return {
      total,
      finalizadas,
      en_curso: enCurso,
      pendientes: Number(data?.pendientes ?? data?.pendiente ?? Math.max(0, total - finalizadas - enCurso)),
      con_incidencia: Number(data?.con_incidencia ?? data?.incidencias ?? data?.incidencia ?? 0),
      pct_avance: total ? Math.round((finalizadas / total) * 100) : 0,
      por_departamento: data?.por_departamento || [],
      por_encuestador: data?.por_encuestador || [],
      por_dia: data?.por_dia || data?.historico || [],
      actividad_reciente: data?.actividad_reciente || [],
    };
  }

  function _renderExecutiveDashboard(data, local) {
    const container = document.getElementById('stats-executive-dashboard');
    if (!container) return;
    const total = Number(data?.total || 0);
    const pct = Math.max(0, Math.min(100, Number(data?.pct_avance || 0)));
    const activeTeam = (data?.por_encuestador || []).filter(row => Number(row.total_asignadas || 0) > 0).length;
    const territoryCount = (data?.por_departamento || []).filter(row => Number(row.total || 0) > 0).length;
    const riskPct = total ? Math.round((Number(data?.con_incidencia || 0) / total) * 100) : 0;
    const synced = Number(local?.queuePending || 0) === 0;
    const leadingTerritory = [...(data?.por_departamento || [])].sort((a, b) => (b.finalizadas || 0) - (a.finalizadas || 0))[0];
    const pace = _dailyPace(data?.por_dia || []);
    container.innerHTML = `
      <section class="stats-command-center">
        <div class="stats-radial" style="--pct:${pct}%;--accent:${_colorForPct(pct)}">
          <strong>${pct}%</strong>
          <span>Avance</span>
        </div>
        <div class="stats-command-copy">
          <span class="eyebrow">Centro ejecutivo</span>
          <h3>Resultados globales CIALPA</h3>
          <div class="stats-command-chips">
            <span>${_escape(total)} escuelas</span>
            <span>${territoryCount} territorios</span>
            <span>${activeTeam} responsables</span>
            <span class="${synced ? 'chip-ok' : 'chip-warn'}">${synced ? 'Sin cola pendiente' : `${Number(local?.queuePending || 0)} en cola`}</span>
          </div>
        </div>
        <div class="stats-command-metrics">
          ${_executiveMetric('Relevadas', data.finalizadas || 0, `${_pct(data.finalizadas || 0, total)}% del universo`, '#207c55')}
          ${_executiveMetric('En curso', data.en_curso || 0, 'Operativo activo', '#b86b00')}
          ${_executiveMetric('Riesgo', `${riskPct}%`, `${data.con_incidencia || 0} incidencias`, '#b42318')}
          ${_executiveMetric('Ritmo', pace.value, pace.label, '#1d4ed8')}
        </div>
        <div class="stats-command-focus">
          <span>Territorio lider</span>
          <strong>${_escape(leadingTerritory?.departamento || 'Sin datos')}</strong>
          <small>${Number(leadingTerritory?.finalizadas || 0)} finalizadas de ${Number(leadingTerritory?.total || 0)}</small>
        </div>
      </section>`;
  }

  function _executiveMetric(label, value, note, color) {
    return `
      <article class="stats-exec-metric" style="--accent:${color}">
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note)}</small>
      </article>`;
  }

  function _renderInsightCards(data, local) {
    const container = document.getElementById('stats-insights');
    if (!container) return;
    const total = Number(data?.total || 0);
    const rows = data?.por_departamento || [];
    const mostPending = [...rows].sort((a, b) => (b.pendientes || 0) - (a.pendientes || 0))[0];
    const bestProgress = [...rows].filter(row => Number(row.total || 0) > 0)
      .sort((a, b) => _pct(b.finalizadas || 0, b.total || 0) - _pct(a.finalizadas || 0, a.total || 0))[0];
    const weakestProgress = [...rows].filter(row => Number(row.total || 0) > 0)
      .sort((a, b) => _pct(a.finalizadas || 0, a.total || 0) - _pct(b.finalizadas || 0, b.total || 0))[0];
    const evidence = local?.mec?.evidenceTotal || 0;
    const cards = [
      {
        label: 'Prioridad operativa',
        value: mostPending?.departamento || 'Sin datos',
        note: `${Number(mostPending?.pendientes || data?.pendientes || 0)} pendientes por resolver`,
        tone: 'warning',
      },
      {
        label: 'Mejor avance',
        value: bestProgress?.departamento || 'Sin datos',
        note: `${_pct(bestProgress?.finalizadas || 0, bestProgress?.total || 0)}% finalizado`,
        tone: 'success',
      },
      {
        label: 'Punto de atencion',
        value: weakestProgress?.departamento || 'Sin datos',
        note: total ? `${_pct(weakestProgress?.finalizadas || 0, weakestProgress?.total || 0)}% finalizado` : 'Esperando registros',
        tone: 'danger',
      },
      {
        label: 'Evidencias locales',
        value: evidence,
        note: `${Number(local?.mec?.evidencePending || 0)} campos pendientes`,
        tone: 'info',
      },
    ];
    container.innerHTML = cards.map(card => `
      <article class="stats-insight stats-insight--${card.tone}">
        <span>${_escape(card.label)}</span>
        <strong>${_escape(card.value)}</strong>
        <small>${_escape(card.note)}</small>
      </article>`).join('');
  }

  function _renderTerritoryBoard(rows) {
    const container = document.getElementById('stats-territory-board');
    if (!container) return;
    const sorted = [...rows].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10);
    if (!sorted.length) {
      container.innerHTML = '<p class="text-muted text-center">Sin territorios para mostrar.</p>';
      return;
    }
    container.innerHTML = sorted.map(row => {
      const pct = _pct(row.finalizadas || 0, row.total || 0);
      const active = Number(row.en_curso || 0);
      const pending = Number(row.pendientes || 0);
      return `
        <article class="territory-card">
          <div class="territory-card__head">
            <strong>${_escape(row.departamento || 'Sin dato')}</strong>
            <span>${pct}%</span>
          </div>
          <div class="territory-card__bar">
            <i style="width:${pct}%;background:${_colorForPct(pct)}"></i>
          </div>
          <div class="territory-card__meta">
            <span>${Number(row.finalizadas || 0)} finalizadas</span>
            <span>${active} en curso</span>
            <span>${pending} pendientes</span>
          </div>
        </article>`;
    }).join('');
  }

  function _renderOfflineDashboard(local) {
    const container = document.getElementById('offline-dashboard');
    if (!container) return;
    const mec = local?.mec || (typeof CialpaLocalStore !== 'undefined' ? CialpaLocalStore.mecMetrics() : {});
    const evidencePct = mec.evidenceFields ? Math.round((mec.evidenceCovered / mec.evidenceFields) * 100) : 0;
    const qualityTotal = Object.values(mec.quality || {}).reduce((sum, value) => sum + Number(value || 0), 0);

    container.innerHTML = `
      <section class="offline-panel">
        <div class="offline-panel__head">
          <div>
            <span class="eyebrow">Centro de datos local</span>
            <h3>Tablero operativo offline</h3>
            <p>El dispositivo conserva cache, borrador MEC, evidencias referenciadas y cola de sincronizacion para trabajo sin conexion.</p>
          </div>
          <div class="offline-panel__badges">
            <span class="offline-chip ${local?.online ? 'offline-chip--online' : 'offline-chip--offline'}">${local?.online ? 'En linea' : 'Sin conexion'}</span>
            <span class="offline-chip">Fuente: ${_escape(local?.source || 'Borrador local')}</span>
            <span class="offline-chip">Cola: ${Number(local?.queuePending || 0)}</span>
            <button class="offline-sync-btn" type="button" onclick="StatsModule.syncQueue()">Sincronizar cola</button>
          </div>
        </div>

        <div class="offline-metric-grid">
          ${_localMetric('Escuelas cacheadas', local?.schoolsCount ?? 0, _formatDate(local?.schoolsCachedAt) || 'Aun sin cache')}
          ${_localMetric('Area relevada', `${Number(mec.areaTotal || 0).toFixed(1)} m2`, `${mec.classrooms || 0} aulas · ${mec.sanitaries || 0} sanitarios`)}
          ${_localMetric('Evidencias', mec.evidenceTotal || 0, `${mec.evidencePending || 0} campos pendientes`)}
          ${_localMetric('Objetos del plano', Number(mec.doors || 0) + Number(mec.windows || 0) + Number(mec.outlets || 0), `${mec.doors || 0} puertas · ${mec.windows || 0} ventanas · ${mec.outlets || 0} tomas`)}
        </div>

        <div class="offline-insights">
          <article>
            <div class="offline-insight__top">
              <strong>Cobertura fotografica</strong>
              <span>${evidencePct}%</span>
            </div>
            <div class="mini-progress"><i style="width:${Math.min(100, evidencePct)}%"></i></div>
            <small>${mec.evidenceCovered || 0} de ${mec.evidenceFields || 0} campos con evidencia obligatoria/recomendada.</small>
          </article>
          <article>
            <div class="offline-insight__top">
              <strong>Estado de elementos</strong>
              <span>${qualityTotal}</span>
            </div>
            <div class="quality-strip">
              ${_qualitySegment('Bueno', mec.quality?.Bueno || 0, qualityTotal, '#5fbf7a')}
              ${_qualitySegment('Regular', mec.quality?.Regular || 0, qualityTotal, '#f2ad5c')}
              ${_qualitySegment('Malo', mec.quality?.Malo || 0, qualityTotal, '#df6b6b')}
              ${_qualitySegment('Sin estado', mec.quality?.['Sin estado'] || 0, qualityTotal, '#9aa4b2')}
            </div>
            <small>Bueno ${mec.quality?.Bueno || 0} · Regular ${mec.quality?.Regular || 0} · Malo ${mec.quality?.Malo || 0} · Sin estado ${mec.quality?.['Sin estado'] || 0}</small>
          </article>
        </div>
      </section>`;
  }

  function _renderInfrastructureDashboard(local) {
    const container = document.getElementById('infra-dashboard');
    if (!container) return;
    const mec = local?.mec || (typeof CialpaLocalStore !== 'undefined' ? CialpaLocalStore.mecMetrics() : null);
    if (!mec || (!mec.blocks && !mec.classrooms && !mec.sanitaries && !mec.evidenceTotal)) {
      container.innerHTML = '';
      return;
    }

    const rows = [
      ['Bloques', mec.blocks || 0, 'Estructuras registradas'],
      ['Aulas', mec.classrooms || 0, `${Number(mec.areaClassrooms || 0).toFixed(1)} m2`],
      ['Sanitarios', mec.sanitaries || 0, `${Number(mec.areaSanitaries || 0).toFixed(1)} m2`],
      ['Puertas', mec.doors || 0, 'Aberturas dibujadas'],
      ['Ventanas', mec.windows || 0, 'Aberturas dibujadas'],
      ['Tomas', mec.outlets || 0, 'Electricidad en croquis'],
      ['Daños', mec.damages || 0, 'Alertas visibles'],
      ['Escaleras', mec.stairs || 0, 'Circulacion vertical'],
      ['Fotos de campos', mec.fieldEvidenceCount || 0, `${mec.evidencePending || 0} pendientes`],
      ['Fotos de objetos', mec.objectEvidenceCount || 0, 'Puertas, ventanas, danos, etc.'],
      ['Fotos sanitarias', mec.sanitaryEvidenceCount || 0, 'Banos y cabinas'],
    ];

    container.innerHTML = `
      <section class="infra-panel">
        <div class="card__header">
          <h4 class="card__title">Reporte local de infraestructura</h4>
          <span class="badge badge--info">${_escape(_formatDate(mec.savedAt) || 'Borrador local')}</span>
        </div>
        <div class="infra-grid">
          ${rows.map(([label, value, note]) => `
            <article class="infra-item">
              <span>${_escape(label)}</span>
              <strong>${_escape(value)}</strong>
              <small>${_escape(note)}</small>
            </article>`).join('')}
        </div>
      </section>`;
  }

  function _normalizeMecInfrastructure(raw, localMec) {
    raw = raw || {};
    localMec = localMec || {};
    const nested = (obj, key) => obj && typeof obj === 'object' ? (obj[key] || {}) : {};
    const electrical = nested(raw, 'electricidad');
    const accessibility = nested(raw, 'accesibilidad');
    const times = nested(raw, 'tiempos');
    const qualityRaw = raw.calidad || localMec.quality || {};
    const evidenceFields = _pickNumber(raw, ['campos_evidencia', 'evidence_fields'], localMec.evidenceFields);
    const evidenceCovered = _pickNumber(raw, ['campos_evidencia_con_foto', 'evidence_covered'], localMec.evidenceCovered);
    const evidencePending = _pickNumber(raw, ['evidencias_pendientes', 'evidence_pending'], localMec.evidencePending || Math.max(0, evidenceFields - evidenceCovered));
    const infra = {
      source: raw.source || (Object.keys(raw).length ? 'Servidor MEC' : 'Borrador local del dispositivo'),
      generatedAt: raw.generated_at || localMec.savedAt || new Date().toISOString(),
      schools: _pickNumber(raw, ['escuelas_con_borrador', 'schools_with_mec', 'schools'], localMec.blocks || localMec.classrooms || localMec.sanitaries ? 1 : 0),
      drafts: _pickNumber(raw, ['borradores_total', 'drafts_total', 'drafts'], 0),
      blocks: _pickNumber(raw, ['bloques', 'blocks'], localMec.blocks),
      floors: _pickNumber(raw, ['pisos', 'floors'], localMec.floors),
      classrooms: _pickNumber(raw, ['aulas', 'classrooms'], localMec.classrooms),
      otherSpaces: _pickNumber(raw, ['otros_espacios', 'other_spaces'], localMec.otherSpaces),
      sanitaries: _pickNumber(raw, ['sanitarios', 'sanitaries'], localMec.sanitaries),
      siteElements: _pickNumber(raw, ['exteriores', 'site_elements', 'siteElements'], localMec.siteElements),
      evidences: _pickNumber(raw, ['evidencias', 'evidence_total'], localMec.evidenceTotal),
      evidenceFields,
      evidenceCovered,
      evidencePending,
      areaClassrooms: _pickNumber(raw, ['area_aulas_m2', 'area_classrooms_m2'], localMec.areaClassrooms),
      areaSanitaries: _pickNumber(raw, ['area_sanitarios_m2', 'area_sanitaries_m2'], localMec.areaSanitaries),
      areaExteriors: _pickNumber(raw, ['area_exteriores_m2', 'area_exteriors_m2'], localMec.areaExteriors),
      doors: _pickNumber(raw, ['puertas', 'doors'], localMec.doors),
      windows: _pickNumber(raw, ['ventanas', 'windows'], localMec.windows),
      outlets: _pickNumber(raw, ['tomas', 'outlets'], _pickNumber(electrical, ['tomas'], localMec.outlets)),
      lights: _pickNumber(raw, ['luces', 'lights'], _pickNumber(electrical, ['luces'], localMec.lights)),
      fans: _pickNumber(raw, ['ventiladores', 'fans'], localMec.fans),
      airConditioners: _pickNumber(raw, ['aires', 'air_conditioners'], localMec.airConditioners),
      switchboards: _pickNumber(raw, ['tableros', 'switchboards'], _pickNumber(electrical, ['tableros'], localMec.switchboards)),
      damages: _pickNumber(raw, ['danos', 'daños', 'damages'], localMec.damages),
      stairs: _pickNumber(raw, ['escaleras', 'stairs'], _pickNumber(accessibility, ['escaleras'], localMec.stairs)),
      ramps: _pickNumber(raw, ['rampas', 'ramps'], _pickNumber(accessibility, ['rampas'], localMec.ramps)),
      sanitaryAccessible: _pickNumber(raw, ['sanitarios_accesibles'], _pickNumber(accessibility, ['sanitarios_accesibles'], localMec.sanitaryAccessible)),
      sanitaryBad: _pickNumber(raw, ['sanitarios_fuera_servicio', 'sanitarios_malos'], localMec.sanitaryBad),
      grounding: _pickNumber(raw, ['puesta_tierra_si'], _pickNumber(electrical, ['puesta_tierra_si'], localMec.blocksWithGrounding)),
      differential: _pickNumber(raw, ['diferencial_si'], _pickNumber(electrical, ['diferencial_si'], localMec.blocksWithDifferential)),
      circuitsIdentified: _pickNumber(raw, ['circuitos_identificados'], _pickNumber(electrical, ['circuitos_identificados'], localMec.circuitsIdentified)),
      schoolTimeAvg: _pickNumber(times, ['escuela_promedio_min'], _pickNumber(raw, ['tiempo_escuela_promedio_min'], 0)),
      classroomTimeAvg: _pickNumber(times, ['aulas_promedio_min'], _pickNumber(raw, ['tiempo_aulas_promedio_min'], 0)),
      sanitaryTimeAvg: _pickNumber(times, ['sanitarios_promedio_min'], _pickNumber(raw, ['tiempo_sanitarios_promedio_min'], 0)),
      exteriorTimeAvg: _pickNumber(times, ['exteriores_promedio_min'], _pickNumber(raw, ['tiempo_exteriores_promedio_min'], 0)),
      quality: {
        Bueno: Number(qualityRaw.Bueno || qualityRaw.bueno || 0),
        Regular: Number(qualityRaw.Regular || qualityRaw.regular || 0),
        Malo: Number(qualityRaw.Malo || qualityRaw.malo || 0),
        'Sin estado': Number(qualityRaw['Sin estado'] || qualityRaw.sin_estado || qualityRaw.sinEstado || 0),
      },
    };
    infra.areaTotal = _pickNumber(raw, ['area_total_m2', 'areaTotal'], infra.areaClassrooms + infra.areaSanitaries + infra.areaExteriors);
    infra.alerts = Array.isArray(raw.alertas) && raw.alertas.length ? raw.alertas : _mecInfraAlerts(infra);
    return infra;
  }

  function _renderMecInfrastructurePanel(infra) {
    const root = document.getElementById('mec-infra-root');
    if (!root) return;
    if (!_hasInfrastructureData(infra)) {
      root.innerHTML = `
        <section class="mec-infra-empty">
          <span class="eyebrow">Infraestructura MEC</span>
          <h3>Todavia no hay borradores MEC para consolidar.</h3>
          <p>Cuando las escuelas empiecen a guardar el Registro guiado, este panel va a mostrar ambientes, sanitarios, electricidad, accesibilidad, daños y evidencias.</p>
        </section>`;
      return;
    }

    const evidencePct = infra.evidenceFields ? _pct(infra.evidenceCovered, infra.evidenceFields) : (infra.evidences ? 100 : 0);
    const qualityTotal = Object.values(infra.quality || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const aulaSanitarioRatio = infra.sanitaries ? `${(Number(infra.classrooms || 0) / Number(infra.sanitaries || 1)).toFixed(1)} aulas/sanitario` : 'Sin sanitarios cargados';
    const electricalCoverage = infra.blocks ? _pct(infra.grounding + infra.differential + infra.circuitsIdentified, infra.blocks * 3) : 0;
    const accessibilityScore = infra.sanitaries ? _pct(infra.sanitaryAccessible + infra.ramps, infra.sanitaries + infra.blocks) : _pct(infra.ramps, infra.blocks);

    root.innerHTML = `
      <div class="mec-infra-page">
        <section class="mec-infra-command">
          <div class="mec-infra-radial" style="--pct:${evidencePct}%">
            <strong>${evidencePct}%</strong>
            <span>Evidencia</span>
          </div>
          <div class="mec-infra-copy">
            <span class="eyebrow">Infraestructura escolar MEC</span>
            <h3>Radiografia tecnica para priorizar inversion, mantenimiento y seguridad edilicia.</h3>
            <div class="mec-infra-chips">
              <span>${infra.schools} escuelas con ficha MEC</span>
              <span>${_formatArea(infra.areaTotal)} relevados</span>
              <span>${infra.source}</span>
              <span>${_formatDate(infra.generatedAt) || 'Actualizado ahora'}</span>
            </div>
          </div>
          <div class="mec-infra-topline">
            ${_infraMiniMetric('Aulas/ambientes', infra.classrooms + infra.otherSpaces, `${_formatArea(infra.areaClassrooms)} pedagógicos`)}
            ${_infraMiniMetric('Sanitarios', infra.sanitaries, aulaSanitarioRatio)}
            ${_infraMiniMetric('Alertas edilicias', infra.damages + infra.sanitaryBad, 'Daños y servicios críticos')}
            ${_infraMiniMetric('Evidencias', infra.evidences, `${infra.evidencePending} campos pendientes`)}
          </div>
        </section>

        <section class="mec-decision-grid">
          ${_mecDecisionCard('Ambientes pedagogicos', infra.classrooms, [
            ['Otros espacios', infra.otherSpaces],
            ['Puertas', infra.doors],
            ['Ventanas', infra.windows],
            ['Area', _formatArea(infra.areaClassrooms)],
          ], '#0b5d3b')}
          ${_mecDecisionCard('Sanitarios y saneamiento', infra.sanitaries, [
            ['Accesibles', infra.sanitaryAccessible],
            ['Con alerta', infra.sanitaryBad],
            ['Ratio', aulaSanitarioRatio],
            ['Area', _formatArea(infra.areaSanitaries)],
          ], '#1d4ed8')}
          ${_mecDecisionCard('Electricidad y seguridad', `${electricalCoverage}%`, [
            ['Tableros', infra.switchboards],
            ['Tomas', infra.outlets],
            ['Puesta a tierra', infra.grounding],
            ['Diferencial', infra.differential],
          ], '#b7791f')}
          ${_mecDecisionCard('Accesibilidad y circulacion', `${accessibilityScore}%`, [
            ['Rampas', infra.ramps],
            ['Escaleras', infra.stairs],
            ['Sanitarios accesibles', infra.sanitaryAccessible],
            ['Exteriores', infra.siteElements],
          ], '#7c3aed')}
        </section>

        <section class="mec-infra-section-grid">
          <article class="mec-infra-board">
            <div class="mec-infra-board__head">
              <div>
                <span class="eyebrow">Semaforo tecnico</span>
                <h4>Estado declarado de elementos</h4>
              </div>
              <strong>${qualityTotal}</strong>
            </div>
            <div class="mec-condition-strip">
              ${_qualitySegment('Bueno', infra.quality.Bueno || 0, qualityTotal, '#5fbf7a')}
              ${_qualitySegment('Regular', infra.quality.Regular || 0, qualityTotal, '#f2ad5c')}
              ${_qualitySegment('Malo', infra.quality.Malo || 0, qualityTotal, '#df6b6b')}
              ${_qualitySegment('Sin estado', infra.quality['Sin estado'] || 0, qualityTotal, '#9aa4b2')}
            </div>
            <div class="mec-quality-legend">
              ${_infraLegend('Bueno', infra.quality.Bueno, '#5fbf7a')}
              ${_infraLegend('Regular', infra.quality.Regular, '#f2ad5c')}
              ${_infraLegend('Malo', infra.quality.Malo, '#df6b6b')}
              ${_infraLegend('Sin estado', infra.quality['Sin estado'], '#9aa4b2')}
            </div>
          </article>

          <article class="mec-infra-board">
            <div class="mec-infra-board__head">
              <div>
                <span class="eyebrow">Lectura para decision</span>
                <h4>Alertas que el MEC necesita ver primero</h4>
              </div>
              <strong>${infra.alerts.length}</strong>
            </div>
            <div class="mec-alert-list">
              ${infra.alerts.map(_infraAlert).join('')}
            </div>
          </article>
        </section>

        <section class="mec-infra-board mec-infra-board--wide">
          <div class="mec-infra-board__head">
            <div>
              <span class="eyebrow">Productividad de relevamiento</span>
              <h4>Tiempos tecnicos promedio</h4>
            </div>
          </div>
          <div class="mec-time-grid">
            ${_infraBar('Escuela completa', infra.schoolTimeAvg, 180, 'min promedio')}
            ${_infraBar('Aulas/ambientes', infra.classroomTimeAvg, 90, 'min promedio')}
            ${_infraBar('Sanitarios', infra.sanitaryTimeAvg, 60, 'min promedio')}
            ${_infraBar('Exteriores', infra.exteriorTimeAvg, 60, 'min promedio')}
          </div>
        </section>
      </div>`;
  }

  function _mecDecisionCard(title, value, rows, color) {
    return `
      <article class="mec-decision-card" style="--accent:${color}">
        <span>${_escape(title)}</span>
        <strong>${_escape(value)}</strong>
        <div>
          ${rows.map(([label, itemValue]) => `
            <p><small>${_escape(label)}</small><b>${_escape(itemValue)}</b></p>
          `).join('')}
        </div>
      </article>`;
  }

  function _infraMiniMetric(label, value, note) {
    return `
      <article>
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _infraLegend(label, value, color) {
    return `<span><i style="background:${color}"></i>${_escape(label)} <b>${Number(value || 0)}</b></span>`;
  }

  function _infraBar(label, value, max, note) {
    const numeric = Number(value || 0);
    const pct = Math.min(100, Math.round((numeric / Math.max(1, max)) * 100));
    return `
      <div class="mec-time-row">
        <span>${_escape(label)}</span>
        <div><i style="width:${pct}%"></i></div>
        <strong>${numeric ? numeric.toFixed(1) : '0'} ${_escape(note)}</strong>
      </div>`;
  }

  function _infraAlert(item) {
    if (typeof item === 'string') {
      return `<div class="mec-alert-item mec-alert-item--warning"><strong>Atencion</strong><span>${_escape(item)}</span></div>`;
    }
    const tone = item.tone || item.tipo || 'warning';
    return `
      <div class="mec-alert-item mec-alert-item--${_safeClass(tone)}">
        <strong>${_escape(item.label || item.titulo || 'Alerta')}</strong>
        <span>${_escape(item.note || item.detalle || item.valor || '')}</span>
      </div>`;
  }

  function _mecInfraAlerts(infra) {
    const alerts = [];
    if (infra.damages) alerts.push({ tone: 'danger', label: 'Daños relevados', note: `${infra.damages} elementos con falla, grieta o daño.` });
    if (infra.sanitaryBad) alerts.push({ tone: 'danger', label: 'Sanitarios criticos', note: `${infra.sanitaryBad} sanitarios con estado malo o fuera de servicio.` });
    if (infra.blocks && infra.grounding < infra.blocks) alerts.push({ tone: 'warning', label: 'Puesta a tierra incompleta', note: `${Math.max(0, infra.blocks - infra.grounding)} bloques sin puesta a tierra confirmada.` });
    if (infra.blocks && infra.differential < infra.blocks) alerts.push({ tone: 'warning', label: 'Proteccion diferencial', note: `${Math.max(0, infra.blocks - infra.differential)} bloques sin diferencial confirmado.` });
    if (infra.evidencePending) alerts.push({ tone: 'info', label: 'Evidencias pendientes', note: `${infra.evidencePending} campos recomendados/obligatorios sin foto.` });
    if (!alerts.length) alerts.push({ tone: 'success', label: 'Sin alertas tecnicas fuertes', note: 'El tablero no detecta daños, pendientes fotograficos ni brechas electricas con los datos disponibles.' });
    return alerts;
  }

  function _pickNumber(obj, keys, fallback = 0) {
    for (const key of keys || []) {
      const raw = obj && obj[key];
      if (raw !== undefined && raw !== null && raw !== '') {
        const n = Number(String(raw).replace(',', '.'));
        if (!Number.isNaN(n)) return n;
      }
    }
    const fallbackNumber = Number(fallback || 0);
    return Number.isNaN(fallbackNumber) ? 0 : fallbackNumber;
  }

  function _hasInfrastructureData(infra) {
    return ['schools', 'blocks', 'classrooms', 'sanitaries', 'siteElements', 'evidences', 'areaTotal']
      .some(key => Number(infra?.[key] || 0) > 0);
  }

  function _formatArea(value) {
    const numeric = Number(value || 0);
    return numeric ? `${numeric.toFixed(numeric >= 100 ? 0 : 1)} m2` : '0 m2';
  }

  function _localMetric(label, value, note) {
    return `
      <article class="offline-metric">
        <span>${_escape(label)}</span>
        <strong>${_escape(value)}</strong>
        <small>${_escape(note || '')}</small>
      </article>`;
  }

  function _qualitySegment(label, value, total, color) {
    const width = total ? Math.max(3, Math.round((Number(value || 0) / total) * 100)) : 0;
    return `<i title="${_escape(label)}: ${Number(value || 0)}" style="width:${width}%;background:${color}"></i>`;
  }

  function _renderKPIs(data) {
    const total = Number(data.total || 0);
    const kpis = [
      { id: 'kpi-total', value: data.total || 0, color: '#173b63', note: 'Universo monitoreado' },
      { id: 'kpi-finalizadas', value: data.finalizadas || 0, color: '#207c55', note: `${_pct(data.finalizadas || 0, total)}% cerradas` },
      { id: 'kpi-en-curso', value: data.en_curso || 0, color: '#b86b00', note: 'Trabajo activo' },
      { id: 'kpi-pendientes', value: data.pendientes || 0, color: '#64748b', note: `${_pct(data.pendientes || 0, total)}% por iniciar` },
      { id: 'kpi-incidencias', value: data.con_incidencia || 0, color: '#b42318', note: `${_pct(data.con_incidencia || 0, total)}% con alerta` },
      { id: 'kpi-avance', value: `${data.pct_avance || 0}%`, color: _colorForPct(data.pct_avance || 0), note: 'Progreso general' },
    ];

    kpis.forEach(kpi => {
      const el = document.getElementById(kpi.id);
      if (!el) return;
      const valueEl = el.querySelector('.kpi-value');
      if (valueEl) valueEl.textContent = kpi.value;
      const noteEl = el.querySelector('[data-kpi-note]');
      if (noteEl) noteEl.textContent = kpi.note;
      el.style.borderTopColor = kpi.color;
    });

    const bar = document.getElementById('stats-progress-bar');
    if (bar) {
      const pct = Math.min(100, Number(data.pct_avance || 0));
      bar.style.width = `${pct}%`;
      bar.textContent = `${pct}%`;
      bar.style.background = _colorForPct(pct);
    }
  }

  function _colorForPct(pct) {
    if (pct >= 80) return '#207c55';
    if (pct >= 50) return '#b86b00';
    return '#b42318';
  }

  function _pct(value, total) {
    const t = Number(total || 0);
    if (!t) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(value || 0) / t) * 100)));
  }

  function _dailyPace(rows) {
    const recent = (rows || []).slice(-7);
    const total = recent.reduce((sum, row) => sum + Number(row.count || row.finalizadas || 0), 0);
    if (!recent.length) return { value: '0/dia', label: 'Sin historico reciente' };
    const avg = Math.round((total / recent.length) * 10) / 10;
    return { value: `${avg}/dia`, label: 'Promedio 7 dias' };
  }

  function _shortLabel(value) {
    const text = String(value || '').trim();
    if (text.length <= 18) return text;
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
    return `${text.slice(0, 16)}...`;
  }

  function _renderCharts(data) {
    _renderBarByDepartamento(data.por_departamento || []);
    _renderDonutOverall(data);
    _renderLineDaily(data.por_dia || []);
  }

  function _showCanvas(id) {
    const canvas = document.getElementById(id);
    const card = canvas?.closest('.chart-card');
    if (canvas) canvas.style.display = '';
    card?.querySelector('.chart-fallback')?.remove();
    return canvas;
  }

  function _renderFallback(id, html) {
    const canvas = document.getElementById(id);
    const card = canvas?.closest('.chart-card');
    if (!canvas || !card) return;
    canvas.style.display = 'none';
    let fallback = card.querySelector('.chart-fallback');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.className = 'chart-fallback';
      card.appendChild(fallback);
    }
    fallback.innerHTML = html;
  }

  function _renderBarByDepartamento(porDep) {
    const ctx = _showCanvas('chart-departamento');
    if (!ctx) return;
    if (!window.Chart) {
      _renderFallback('chart-departamento', _barFallback('Estado por departamento', porDep));
      return;
    }
    if (_charts.departamento) _charts.departamento.destroy();

    _charts.departamento = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: porDep.map(d => d.departamento),
        datasets: [
          { label: 'Finalizadas', data: porDep.map(d => d.finalizadas || 0), backgroundColor: '#207c55', borderRadius: 5 },
          { label: 'En curso', data: porDep.map(d => d.en_curso || 0), backgroundColor: '#d9982f', borderRadius: 5 },
          { label: 'Pendientes', data: porDep.map(d => d.pendientes || 0), backgroundColor: '#64748b', borderRadius: 5 },
          { label: 'Incidencias', data: porDep.map(d => d.incidencias || 0), backgroundColor: '#b42318', borderRadius: 5 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } }, title: { display: false } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(100,116,139,.16)' } },
        },
      },
    });
  }

  function _barFallback(title, rows) {
    if (!rows.length) return `<h4>${_escape(title)}</h4><p class="text-muted text-center">Sin datos cacheados.</p>`;
    const max = Math.max(...rows.map(row => row.total || 0), 1);
    return `
      <h4>${_escape(title)}</h4>
      <div class="css-bars">
        ${rows.slice(0, 10).map(row => `
          <div class="css-bar-row">
            <span>${_escape(row.departamento || 'Sin dato')}</span>
            <div><i style="width:${Math.round(((row.total || 0) / max) * 100)}%"></i></div>
            <b>${row.total || 0}</b>
          </div>`).join('')}
      </div>`;
  }

  function _renderDonutOverall(data) {
    const ctx = _showCanvas('chart-donut');
    if (!ctx) return;
    if (!window.Chart) {
      const total = Math.max(1, Number(data.total || 0));
      _renderFallback('chart-donut', `
        <h4>Distribucion general</h4>
        <div class="status-stack">
          <i style="width:${(data.finalizadas || 0) / total * 100}%;background:#207c55"></i>
          <i style="width:${(data.en_curso || 0) / total * 100}%;background:#d9982f"></i>
          <i style="width:${(data.pendientes || 0) / total * 100}%;background:#64748b"></i>
          <i style="width:${(data.con_incidencia || 0) / total * 100}%;background:#b42318"></i>
        </div>
        <p class="chart-note">Finalizadas ${data.finalizadas || 0} · En curso ${data.en_curso || 0} · Pendientes ${data.pendientes || 0} · Incidencias ${data.con_incidencia || 0}</p>`);
      return;
    }
    if (_charts.donut) _charts.donut.destroy();

    _charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Finalizadas', 'En Curso', 'Pendientes', 'Con Incidencia'],
        datasets: [{
          data: [data.finalizadas || 0, data.en_curso || 0, data.pendientes || 0, data.con_incidencia || 0],
          backgroundColor: ['#207c55', '#d9982f', '#64748b', '#b42318'],
          borderWidth: 4,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true } }, title: { display: false } },
        cutout: '72%',
      },
    });
  }

  function _renderLineDaily(porDia) {
    const ctx = _showCanvas('chart-daily');
    if (!ctx) return;
    if (!window.Chart) {
      const max = Math.max(...porDia.map(row => row.count || row.finalizadas || 0), 1);
      _renderFallback('chart-daily', `
        <h4>Progreso diario</h4>
        <div class="spark-bars">
          ${porDia.slice(-14).map(row => {
            const value = row.count || row.finalizadas || 0;
            return `<span title="${_escape(row.fecha || '')}: ${value}" style="height:${Math.max(8, (value / max) * 100)}%"></span>`;
          }).join('')}
        </div>
        <p class="chart-note">${porDia.length ? 'Ultimos registros cacheados' : 'Sin historico local.'}</p>`);
      return;
    }
    if (_charts.daily) _charts.daily.destroy();

    _charts.daily = new Chart(ctx, {
      type: 'line',
      data: {
        labels: porDia.map(d => d.fecha),
        datasets: [{
          label: 'Encuestas completadas',
          data: porDia.map(d => d.count || d.finalizadas || 0),
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29,78,216,0.12)',
          fill: true,
          tension: 0.38,
          pointRadius: 4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#1d4ed8',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(100,116,139,.16)' } },
        },
      },
    });
  }

  function _renderEncuestadoresTable(rows) {
    const tbody = document.getElementById('stats-enc-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin datos</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((r, i) => {
      const assigned = Number(r.total_asignadas || 0);
      const finished = Number(r.finalizadas || 0);
      const pct = _pct(finished, assigned);
      return `
      <tr>
        <td><span class="rank-badge">${i + 1}</span></td>
        <td><strong>${_escape(r.encuestador || 'Sin asignar')}</strong></td>
        <td>${assigned}</td>
        <td>
          <div class="table-progress">
            <span>${finished} (${pct}%)</span>
            <i><b style="width:${pct}%"></b></i>
          </div>
        </td>
        <td><span class="${Number(r.incidencias || 0) ? 'risk-pill risk-pill--on' : 'risk-pill'}">${Number(r.incidencias || 0)}</span></td>
        <td>${r.promedio_minutos ? _escape(r.promedio_minutos + ' min') : '—'}</td>
      </tr>`;
    }).join('');
  }

  function _renderRecentActivity(items) {
    const container = document.getElementById('stats-activity');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<p class="text-muted text-center">Sin actividad reciente.</p>';
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="activity-item">
        <span class="activity-item__badge badge--${_safeClass(item.tipo || 'info')}">${_escape(item.tipo || 'evento')}</span>
        <div class="activity-item__text">
          <strong>${_escape(item.usuario || 'Usuario')}</strong> - ${_escape(item.escuela || item.detalle || 'Actividad')}
        </div>
        <span class="activity-item__time">${_escape(item.fecha_hora || '')}</span>
      </div>`).join('');
  }

  function exportCSV() {
    if (!_statsData) {
      UI.showToast('No hay datos para exportar.', 'warning');
      return;
    }
    const rows = _statsData.por_departamento || [];
    const headers = ['Departamento', 'Total', 'Finalizadas', 'En Curso', 'Pendientes', 'Incidencias'];
    const csv = [headers.join(','), ...rows.map(r =>
      [r.departamento, r.total || 0, r.finalizadas || 0, r.en_curso || 0, r.pendientes || 0, r.incidencias || 0]
        .map(_csvCell).join(',')
    )].join('\n');
    _downloadBlob(`cialpa_stats_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;', csv);
  }

  async function exportLocalJson() {
    const analytics = _localAnalytics || (typeof CialpaLocalStore !== 'undefined' ? await CialpaLocalStore.buildLocalAnalytics(_statsData) : null);
    if (!analytics) {
      UI.showToast('No hay datos locales para exportar.', 'warning');
      return;
    }
    _downloadBlob(`cialpa_snapshot_local_${Date.now()}.json`, 'application/json', JSON.stringify(analytics, null, 2));
  }

  async function exportMecInfrastructureJson() {
    if (!_infraData) await loadMecInfrastructure();
    if (!_infraData) {
      UI.showToast('No hay datos de infraestructura MEC para exportar.', 'warning');
      return;
    }
    _downloadBlob(`cialpa_infraestructura_mec_${Date.now()}.json`, 'application/json', JSON.stringify(_infraData, null, 2));
  }

  async function syncQueue() {
    if (typeof CialpaLocalStore === 'undefined') {
      UI.showToast('El almacen local no esta disponible en este navegador.', 'warning');
      return;
    }
    if (!navigator.onLine) {
      UI.showToast('Sin conexion: la cola queda lista para sincronizar cuando vuelva internet.', 'warning');
      return;
    }
    const queue = await CialpaLocalStore.getQueue();
    const pending = queue.filter(item => item.status === 'pending');
    if (!pending.length) {
      UI.showToast('No hay operaciones pendientes para sincronizar.', 'info');
      return;
    }

    let synced = 0;
    for (const item of pending) {
      try {
        const payload = {
          ...(item.data || {}),
          clientMutationId: item.data?.clientMutationId || item.id,
          id_offline_queue: item.data?.id_offline_queue || item.id,
        };
        const result = await API.call(item.endpoint, item.method || 'POST', payload, { skipLoading: true, skipQueue: true });
        if (result.status !== 'ok') throw new Error(result.message || 'Respuesta invalida');
        await CialpaLocalStore.updateQueueStatus(item.id, 'synced', { syncedAt: new Date().toISOString() });
        synced++;
      } catch (err) {
        await CialpaLocalStore.updateQueueStatus(item.id, 'pending', { lastError: err.message });
      }
    }

    await loadStats();
    UI.showToast(`Sincronizacion revisada: ${synced}/${pending.length} operaciones enviadas.`, synced === pending.length ? 'success' : 'warning', 6500);
  }

  function _downloadBlob(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function _csvCell(value) {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function _safeClass(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '') || 'info';
  }

  function _formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '';
    }
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  return {
    init,
    loadStats,
    initMecInfrastructure,
    loadMecInfrastructure,
    exportCSV,
    exportLocalJson,
    exportMecInfrastructureJson,
    syncQueue,
  };
})();
