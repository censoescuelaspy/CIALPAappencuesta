/**
 * CIALPA — Relevamiento Escolar
 * stats.js — Statistics panel module (admin/supervisor only)
 * Version: 2.0.0
 */

const StatsModule = (() => {
  'use strict';

  let _charts = {};
  let _statsData = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    if (!Auth.canAccess('supervisor')) {
      document.getElementById('stats-panel').innerHTML =
        '<p class="access-denied">Acceso restringido a supervisores y administradores.</p>';
      return;
    }
    _bindFilterEvents();
    await loadStats();
  }

  function _bindFilterEvents() {
    const applyBtn = document.getElementById('stats-filter-apply');
    if (applyBtn) applyBtn.addEventListener('click', loadStats);

    const resetBtn = document.getElementById('stats-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('stats-filter-form')?.reset();
        loadStats();
      });
    }
  }

  // ── Load stats data ───────────────────────────────────────────────────────

  async function loadStats() {
    const filters = _getFilters();
    try {
      const result = await API.getStats(filters);
      if (result.status !== 'ok') throw new Error(result.message);
      _statsData = result.data;
      _renderKPIs(_statsData);
      _renderCharts(_statsData);
      _renderEncuestadoresTable(_statsData.por_encuestador || []);
      _renderRecentActivity(_statsData.actividad_reciente || []);
    } catch (err) {
      UI.showToast('Error al cargar estadísticas: ' + err.message, 'error');
    }
  }

  function _getFilters() {
    const form = document.getElementById('stats-filter-form');
    if (!form) return {};
    const data = new FormData(form);
    return Object.fromEntries([...data.entries()].filter(([, v]) => v));
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  function _renderKPIs(data) {
    const kpis = [
      { id: 'kpi-total', value: data.total || 0, label: 'Total escuelas' },
      { id: 'kpi-finalizadas', value: data.finalizadas || 0, label: 'Relevadas', color: '#28a745' },
      { id: 'kpi-en-curso', value: data.en_curso || 0, label: 'En curso', color: '#fd7e14' },
      { id: 'kpi-pendientes', value: data.pendientes || 0, label: 'Pendientes', color: '#6c757d' },
      { id: 'kpi-incidencias', value: data.con_incidencia || 0, label: 'Con incidencia', color: '#dc3545' },
      {
        id: 'kpi-avance', value: `${data.pct_avance || 0}%`, label: '% Avance',
        color: _colorForPct(data.pct_avance || 0),
      },
    ];

    kpis.forEach(kpi => {
      const el = document.getElementById(kpi.id);
      if (!el) return;
      el.querySelector('.kpi-value').textContent = kpi.value;
      if (kpi.color) el.style.borderTopColor = kpi.color;
    });

    // Progress bar
    const bar = document.getElementById('stats-progress-bar');
    if (bar) {
      const pct = Math.min(100, data.pct_avance || 0);
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

  // ── Charts ────────────────────────────────────────────────────────────────

  function _renderCharts(data) {
    _renderBarByDepartamento(data.por_departamento || []);
    _renderDonutOverall(data);
    _renderLineDaily(data.por_dia || []);
  }

  function _renderBarByDepartamento(porDep) {
    const ctx = document.getElementById('chart-departamento');
    if (!ctx) return;
    if (_charts.departamento) _charts.departamento.destroy();

    const labels = porDep.map(d => d.departamento);
    _charts.departamento = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Finalizadas',
            data: porDep.map(d => d.finalizadas || 0),
            backgroundColor: '#28a745',
          },
          {
            label: 'En Curso',
            data: porDep.map(d => d.en_curso || 0),
            backgroundColor: '#fd7e14',
          },
          {
            label: 'Pendientes',
            data: porDep.map(d => d.pendientes || 0),
            backgroundColor: '#6c757d',
          },
          {
            label: 'Incidencias',
            data: porDep.map(d => d.incidencias || 0),
            backgroundColor: '#dc3545',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Estado por Departamento' },
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
      },
    });
  }

  function _renderDonutOverall(data) {
    const ctx = document.getElementById('chart-donut');
    if (!ctx) return;
    if (_charts.donut) _charts.donut.destroy();

    _charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Finalizadas', 'En Curso', 'Pendientes', 'Con Incidencia'],
        datasets: [{
          data: [
            data.finalizadas || 0,
            data.en_curso || 0,
            data.pendientes || 0,
            data.con_incidencia || 0,
          ],
          backgroundColor: ['#28a745', '#fd7e14', '#6c757d', '#dc3545'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          title: { display: true, text: 'Distribución General' },
        },
        cutout: '65%',
      },
    });
  }

  function _renderLineDaily(porDia) {
    const ctx = document.getElementById('chart-daily');
    if (!ctx) return;
    if (_charts.daily) _charts.daily.destroy();

    _charts.daily = new Chart(ctx, {
      type: 'line',
      data: {
        labels: porDia.map(d => d.fecha),
        datasets: [{
          label: 'Encuestas completadas',
          data: porDia.map(d => d.count || 0),
          borderColor: APP_CONFIG.STATE_COLORS ? '#E84C22' : '#E84C22',
          backgroundColor: 'rgba(232,76,34,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Progreso Diario' },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  // ── Encuestadores table ───────────────────────────────────────────────────

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
        <td>${r.encuestador || '—'}</td>
        <td>${r.total_asignadas || 0}</td>
        <td>${r.finalizadas || 0}</td>
        <td>${r.incidencias || 0}</td>
        <td>${r.promedio_minutos ? r.promedio_minutos + ' min' : '—'}</td>
      </tr>`).join('');
  }

  // ── Recent activity ───────────────────────────────────────────────────────

  function _renderRecentActivity(items) {
    const container = document.getElementById('stats-activity');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<p class="text-muted text-center">Sin actividad reciente.</p>';
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="activity-item">
        <span class="activity-item__badge badge--${item.tipo}">${item.tipo}</span>
        <div class="activity-item__text">
          <strong>${item.usuario}</strong> — ${item.escuela}
        </div>
        <span class="activity-item__time">${item.fecha_hora}</span>
      </div>`).join('');
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function exportCSV() {
    if (!_statsData) {
      UI.showToast('No hay datos para exportar.', 'warning');
      return;
    }
    const rows = _statsData.por_departamento || [];
    const headers = ['Departamento', 'Total', 'Finalizadas', 'En Curso', 'Pendientes', 'Incidencias'];
    const csv = [headers.join(','), ...rows.map(r =>
      [r.departamento, r.total || 0, r.finalizadas || 0, r.en_curso || 0, r.pendientes || 0, r.incidencias || 0].join(',')
    )].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cialpa_stats_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    init,
    loadStats,
    exportCSV,
  };
})();
