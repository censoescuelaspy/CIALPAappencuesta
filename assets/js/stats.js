/**
 * CIALPA — Relevamiento Escolar
 * stats.js — Panel estadistico con fallback offline/local.
 * Version: 2.5.14
 */

const StatsModule = (() => {
  'use strict';

  let _charts = {};
  let _statsData = null;
  let _localAnalytics = null;

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
    const applyBtn = document.getElementById('stats-filter-apply');
    if (applyBtn && applyBtn.dataset.bound !== 'true') {
      applyBtn.dataset.bound = 'true';
      applyBtn.addEventListener('click', loadStats);
    }

    const resetBtn = document.getElementById('stats-filter-reset');
    if (resetBtn && resetBtn.dataset.bound !== 'true') {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        document.getElementById('stats-filter-form')?.reset();
        loadStats();
      });
    }
  }

  async function loadStats() {
    const filters = _getFilters();
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
    _renderOfflineDashboard(_localAnalytics);
    _renderInfrastructureDashboard(_localAnalytics);
    _renderKPIs(_statsData);
    _renderCharts(_statsData);
    _renderEncuestadoresTable(_statsData.por_encuestador || []);
    _renderRecentActivity(_statsData.actividad_reciente || []);
  }

  function _getFilters() {
    const form = document.getElementById('stats-filter-form');
    if (!form) return {};
    const data = new FormData(form);
    return Object.fromEntries([...data.entries()].filter(([, v]) => v));
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
      ['Danos', mec.damages || 0, 'Alertas visibles'],
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
    const kpis = [
      { id: 'kpi-total', value: data.total || 0, color: '#1F3864' },
      { id: 'kpi-finalizadas', value: data.finalizadas || 0, color: '#28a745' },
      { id: 'kpi-en-curso', value: data.en_curso || 0, color: '#fd7e14' },
      { id: 'kpi-pendientes', value: data.pendientes || 0, color: '#6c757d' },
      { id: 'kpi-incidencias', value: data.con_incidencia || 0, color: '#dc3545' },
      { id: 'kpi-avance', value: `${data.pct_avance || 0}%`, color: _colorForPct(data.pct_avance || 0) },
    ];

    kpis.forEach(kpi => {
      const el = document.getElementById(kpi.id);
      if (!el) return;
      const valueEl = el.querySelector('.kpi-value');
      if (valueEl) valueEl.textContent = kpi.value;
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
    if (pct >= 80) return '#28a745';
    if (pct >= 50) return '#fd7e14';
    return '#dc3545';
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
          { label: 'Finalizadas', data: porDep.map(d => d.finalizadas || 0), backgroundColor: '#28a745' },
          { label: 'En curso', data: porDep.map(d => d.en_curso || 0), backgroundColor: '#fd7e14' },
          { label: 'Pendientes', data: porDep.map(d => d.pendientes || 0), backgroundColor: '#6c757d' },
          { label: 'Incidencias', data: porDep.map(d => d.incidencias || 0), backgroundColor: '#dc3545' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, title: { display: true, text: 'Estado por Departamento' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
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
          <i style="width:${(data.finalizadas || 0) / total * 100}%;background:#28a745"></i>
          <i style="width:${(data.en_curso || 0) / total * 100}%;background:#fd7e14"></i>
          <i style="width:${(data.pendientes || 0) / total * 100}%;background:#6c757d"></i>
          <i style="width:${(data.con_incidencia || 0) / total * 100}%;background:#dc3545"></i>
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
          backgroundColor: ['#28a745', '#fd7e14', '#6c757d', '#dc3545'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' }, title: { display: true, text: 'Distribucion General' } },
        cutout: '65%',
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
          borderColor: '#E84C22',
          backgroundColor: 'rgba(232,76,34,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Progreso Diario' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
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

    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${_escape(r.encuestador || 'Sin asignar')}</td>
        <td>${Number(r.total_asignadas || 0)}</td>
        <td>${Number(r.finalizadas || 0)}</td>
        <td>${Number(r.incidencias || 0)}</td>
        <td>${r.promedio_minutos ? _escape(r.promedio_minutos + ' min') : '—'}</td>
      </tr>`).join('');
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
        <span class="activity-item__badge badge--${_escape(item.tipo || 'info')}">${_escape(item.tipo || 'evento')}</span>
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
        const result = await API.call(item.endpoint, item.method || 'POST', item.data || {}, { skipLoading: true, skipQueue: true });
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
    exportCSV,
    exportLocalJson,
    syncQueue,
  };
})();
