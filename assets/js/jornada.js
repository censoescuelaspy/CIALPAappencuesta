/**
 * CIALPA — Relevamiento Escolar
 * jornada.js — Personal dashboard (Mi Jornada)
 * Version: 2.5.5
 */

const JornadaModule = (() => {
  'use strict';

  let _sessions = [];

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    if (!Auth.requireAuth()) return;
    await loadMisSesiones();
    _bindRefreshEvent();
  }

  function _bindRefreshEvent() {
    const btn = document.getElementById('jornada-refresh');
    if (btn && btn.dataset.bound !== 'true') {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', loadMisSesiones);
    }
  }

  // ── Load sessions ─────────────────────────────────────────────────────────

  async function loadMisSesiones() {
    try {
      const result = await API.getMisSesiones();
      if (result.status !== 'ok') throw new Error(result.message);
      _sessions = result.data || [];
      _renderJornada(_sessions);
    } catch (err) {
      UI.showToast('Error al cargar tu jornada: ' + err.message, 'error');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _renderJornada(sessions) {
    const user = Auth.getUserInfo();
    _renderUserCard(user, sessions);
    _renderKPIs(sessions);
    _renderSessionsTable(sessions);
    _renderIncidencias(sessions);
  }

  function _renderUserCard(user, sessions) {
    const card = document.getElementById('jornada-user-card');
    if (!card || !user) return;

    const today = new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const finalizadas = sessions.filter(s => s.estado === 'finalizada').length;
    const enCurso = sessions.find(s => s.estado === 'en_curso');

    card.innerHTML = `
        <div class="user-card">
        <div class="user-card__avatar">${_escape(_initials(user.nombres, user.apellidos))}</div>
        <div class="user-card__info">
          <h3>${_escape(`${user.nombres || ''} ${user.apellidos || ''}`.trim())}</h3>
          <p>${_escape(_rolLabel(user.rol))} &bull; <small>${_escape(today)}</small></p>
        </div>
        <div class="user-card__status">
          ${enCurso
        ? `<span class="badge badge--in-progress">En campo: ${_escape(enCurso.nombre_escuela || enCurso.id_escuela)}</span>`
        : `<span class="badge badge--success">${finalizadas} relevamientos hoy</span>`}
        </div>
      </div>`;
  }

  function _renderKPIs(sessions) {
    const today = new Date().toISOString().slice(0, 10);
    const hoy = sessions.filter(s => (s.fecha_inicio || '').startsWith(today));

    const totals = {
      hoy_total: hoy.length,
      hoy_final: hoy.filter(s => s.estado === 'finalizada').length,
      hoy_incid: hoy.filter(s => s.estado === 'incidencia').length,
      total_min: sessions.reduce((acc, s) => acc + (parseInt(s.duracion_minutos) || 0), 0),
    };

    const el = id => document.getElementById(id);
    if (el('jornada-kpi-hoy')) el('jornada-kpi-hoy').textContent = totals.hoy_total;
    if (el('jornada-kpi-fin')) el('jornada-kpi-fin').textContent = totals.hoy_final;
    if (el('jornada-kpi-inc')) el('jornada-kpi-inc').textContent = totals.hoy_incid;
    if (el('jornada-kpi-min')) el('jornada-kpi-min').textContent = totals.total_min + ' min';
  }

  function _renderSessionsTable(sessions) {
    const tbody = document.getElementById('jornada-sessions-tbody');
    if (!tbody) return;

    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay sesiones registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map(s => {
      const estadoColor = APP_CONFIG.STATE_COLORS[s.estado] || '#6c757d';
      const estadoLabel = APP_CONFIG.STATE_LABELS[s.estado] || s.estado;
      const horaFin = s.hora_fin ? _escape(s.hora_fin) : (s.estado === 'en_curso' ? '<em>En curso</em>' : '—');
      return `
        <tr>
          <td>${_escape(s.fecha_inicio || '—')}</td>
          <td>${_escape(s.hora_inicio || '—')}</td>
          <td>${_escape(s.nombre_escuela || s.id_escuela)}</td>
          <td>${horaFin}</td>
          <td>${s.duracion_minutos ? `${_escape(s.duracion_minutos)} min` : '—'}</td>
          <td><span class="badge" style="background:${_escape(estadoColor)}">${_escape(estadoLabel)}</span></td>
          <td>${_escape(s.observacion_cierre || '—')}</td>
        </tr>`;
    }).join('');
  }

  function _renderIncidencias(sessions) {
    const container = document.getElementById('jornada-incidencias');
    if (!container) return;

    const incidencias = sessions.filter(s => s.estado === 'incidencia');
    if (!incidencias.length) {
      container.innerHTML = '<p class="text-muted text-center">Sin incidencias en tus sesiones.</p>';
      return;
    }

    container.innerHTML = incidencias.map(s => `
      <div class="incidencia-item incidencia-item--${_safeClass(s.prioridad || 'media')}">
        <div class="incidencia-item__header">
          <strong>${_escape(s.nombre_escuela || s.id_escuela)}</strong>
          <span class="badge badge--danger">${_escape(s.tipo_incidencia || 'Incidencia')}</span>
        </div>
        <p>${_escape(s.observacion_cierre || '—')}</p>
        <small>${_escape(`${s.fecha_inicio || ''} ${s.hora_inicio || ''}`.trim())}</small>
      </div>`).join('');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _initials(nombres, apellidos) {
    const n = (nombres || ' ')[0].toUpperCase();
    const a = (apellidos || ' ')[0].toUpperCase();
    return n + a;
  }

  function _rolLabel(rol) {
    const labels = { admin: 'Administrador', supervisor: 'Supervisor', encuestador: 'Encuestador' };
    return labels[rol] || rol;
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _safeClass(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '') || 'media';
  }

  return {
    init,
    loadMisSesiones,
  };
})();
