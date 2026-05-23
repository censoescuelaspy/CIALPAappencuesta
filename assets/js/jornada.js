/**
 * CIALPA — Relevamiento Escolar
 * jornada.js — Personal dashboard (Mi Jornada)
 * Version: 2.6.110
 */

const JornadaModule = (() => {
  'use strict';

  let _sessions = [];
  let _escuelas = [];
  let _sortCol  = 'fecha';
  let _sortAsc  = false;
  let _filterText   = '';
  let _filterEstado = '';

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

  // ── Load ─────────────────────────────────────────────────────────────────

  async function loadMisSesiones() {
    try {
      const [sesResult, escResult] = await Promise.all([
        API.getMisSesiones(),
        API.getEscuelas({}).catch(() => ({ status: 'ok', data: [] })),
      ]);
      if (sesResult.status !== 'ok') throw new Error(sesResult.message || 'Error');

      _sessions = sesResult.data || [];

      const allEscuelas = (escResult.status === 'ok' ? escResult.data : null) || [];
      const user = Auth.getUserInfo();
      const username = (user?.usuario || user?.username || '').trim();
      const fullname = `${user?.nombres || ''} ${user?.apellidos || ''}`.trim();

      _escuelas = allEscuelas.filter(e => {
        if (!username && !fullname) return false;
        const enc = (e.encuestador_asignado || '').trim();
        const usu = (e.usuario_encuestador || '').trim();
        return enc === username || enc === fullname || usu === username;
      });

      _renderAll();
    } catch (err) {
      UI.showToast('Error al cargar tu jornada: ' + err.message, 'error');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _renderAll() {
    const user = Auth.getUserInfo();
    _renderUserCard(user, _sessions);
    _renderKPIs();
    _renderToolbar();
    _renderTable();
    _renderIncidencias(_sessions);
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
            : `<span class="badge badge--success">${finalizadas} finalizadas</span>`}
        </div>
      </div>`;
  }

  function _renderKPIs() {
    const sesIds = new Set(_sessions.map(s => s.id_escuela));
    const pendientes = _escuelas.filter(e => !sesIds.has(e.id_escuela)).length
      + _sessions.filter(s => s.estado === 'pendiente').length;
    const enCurso    = _sessions.filter(s => s.estado === 'en_curso').length;
    const finalizadas = _sessions.filter(s => s.estado === 'finalizada').length;
    const totalMin   = _sessions.reduce((acc, s) => acc + (parseInt(s.duracion_minutos) || 0), 0);

    const today = new Date().toISOString().slice(0, 10);
    const hoy = _sessions.filter(s => (s.fecha_inicio || '').startsWith(today));

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('jornada-kpi-hoy', hoy.length);
    set('jornada-kpi-fin', finalizadas);
    set('jornada-kpi-inc', pendientes);
    set('jornada-kpi-min', totalMin + ' min');

    // Update KPI labels if elements exist
    const lblPend = document.querySelector('#jornada-kpi-inc + .kpi-label');
    if (lblPend && lblPend.textContent.includes('Incidencias')) lblPend.textContent = 'Pendientes';
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  function _renderToolbar() {
    const container = document.getElementById('jornada-toolbar');
    if (!container) return;
    container.innerHTML = `
      <input class="form-control" id="jt-search" type="search"
             placeholder="Buscar escuela..."
             value="${_escape(_filterText)}"
             oninput="JornadaModule._onSearchInput(this.value)"
             style="min-width:200px;max-width:260px;">
      <select class="form-control" id="jt-estado"
              onchange="JornadaModule._onEstadoChange(this.value)"
              style="min-width:160px;max-width:180px;">
        <option value="">Todos los estados</option>
        ${Object.entries(APP_CONFIG.STATE_LABELS).map(([k, v]) =>
          `<option value="${_escape(k)}"${_filterEstado === k ? ' selected' : ''}>${_escape(v)}</option>`
        ).join('')}
      </select>
      <small id="jt-count" class="text-muted"></small>`;
  }

  function _onSearchInput(val) {
    _filterText = val;
    _renderTable();
  }

  function _onEstadoChange(val) {
    _filterEstado = val;
    _renderTable();
  }

  function sortBy(col) {
    if (_sortCol === col) {
      _sortAsc = !_sortAsc;
    } else {
      _sortCol = col;
      _sortAsc = col === 'nombre_escuela';
    }
    _renderTable();
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  function _buildRows() {
    const sessionRows = _sessions.map(s => ({
      id_escuela:    s.id_escuela    || '',
      codigo_local:  s.codigo_local  || '',
      nombre_escuela: s.nombre_escuela || s.id_escuela || '',
      fecha:         s.fecha_inicio  || '',
      hora_inicio:   s.hora_inicio   || '',
      hora_fin:      s.hora_fin      || '',
      duracion:      s.duracion_minutos || '',
      estado:        s.estado        || 'en_curso',
      observacion:   s.observacion_cierre || '',
      usuario:       s.usuario || '',
    }));

    const seenIds = new Set(_sessions.map(s => s.id_escuela));
    const pendingRows = _escuelas
      .filter(e => !seenIds.has(e.id_escuela))
      .map(e => ({
        id_escuela:    e.id_escuela   || '',
        codigo_local:  e.codigo_local || '',
        nombre_escuela: e.nombre      || '',
        fecha:         '',
        hora_inicio:   '',
        hora_fin:      '',
        duracion:      '',
        estado:        e.estado_relevamiento || 'pendiente',
        observacion:   '',
      }));

    return [...sessionRows, ...pendingRows];
  }

  function _filtered(rows) {
    let list = rows;
    if (_filterText.trim()) {
      const q = _filterText.trim().toLowerCase();
      list = list.filter(r =>
        r.nombre_escuela.toLowerCase().includes(q) ||
        r.codigo_local.toLowerCase().includes(q)   ||
        r.id_escuela.toLowerCase().includes(q)
      );
    }
    // Deduplicate STATE_LABELS entries; 'pendiente' may already be in config
    if (_filterEstado) {
      list = list.filter(r => r.estado === _filterEstado);
    }
    const m = _sortAsc ? 1 : -1;
    list = [...list].sort((a, b) =>
      String(a[_sortCol] ?? '').localeCompare(String(b[_sortCol] ?? ''), 'es', { numeric: true }) * m
    );
    return list;
  }

  function _renderTable() {
    const thead = document.getElementById('jornada-sessions-thead');
    const tbody = document.getElementById('jornada-sessions-tbody');
    if (!tbody) return;

    const cols = [
      { key: 'nombre_escuela', label: 'Escuela' },
      { key: 'fecha',          label: 'Fecha' },
      { key: 'hora_inicio',    label: 'Inicio' },
      { key: 'hora_fin',       label: 'Fin' },
      { key: 'duracion',       label: 'Duración' },
      { key: 'estado',         label: 'Estado' },
      { key: 'observacion',    label: 'Observaciones' },
    ];

    if (thead) {
      thead.innerHTML = '<tr>' + cols.map(c => {
        const sorted = _sortCol === c.key;
        const arrow  = sorted ? (_sortAsc ? ' ▲' : ' ▼') : '';
        return `<th style="cursor:pointer;user-select:none;white-space:nowrap;"
                    class="${sorted ? 'sorted' : ''}"
                    onclick="JornadaModule.sortBy('${_escape(c.key)}')">${_escape(c.label)}${arrow}</th>`;
      }).join('') + '<th style="width:90px;"></th></tr>';
    }

    const rows = _filtered(_buildRows());

    const countEl = document.getElementById('jt-count');
    if (countEl) countEl.textContent = `${rows.length} registro${rows.length !== 1 ? 's' : ''}`;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Sin registros para los filtros aplicados.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const color = APP_CONFIG.STATE_COLORS[r.estado] || '#6c757d';
      const label = APP_CONFIG.STATE_LABELS[r.estado] || _capitalize(r.estado);
      const fin   = r.hora_fin
        ? _escape(r.hora_fin)
        : (r.estado === 'en_curso' ? '<em>En curso</em>' : '—');
      const dur   = r.duracion ? `${_escape(r.duracion)} min` : '—';
      const obsTitle = _escape(r.observacion);
      const obs   = r.observacion
        ? `<span title="${obsTitle}">${_escape(r.observacion.slice(0, 40))}${r.observacion.length > 40 ? '…' : ''}</span>`
        : '<span class="text-muted">—</span>';

      const idEsc = _escape(r.id_escuela || r.codigo_local);
      const primaryAction = _primaryActionForState(r.estado);
      const secondaryAction = _secondaryActionForState(r.estado);

      return `<tr style="cursor:default;">
        <td>
          <strong>${_escape(r.nombre_escuela)}</strong>
          ${r.codigo_local ? `<br><small class="text-muted">${_escape(r.codigo_local)}</small>` : ''}
        </td>
        <td style="white-space:nowrap;">${_escape(r.fecha) || '—'}</td>
        <td style="white-space:nowrap;">${_escape(r.hora_inicio) || '—'}</td>
        <td style="white-space:nowrap;">${fin}</td>
        <td style="white-space:nowrap;">${dur}</td>
        <td><span class="badge" style="background:${_escape(color)};white-space:nowrap;">${_escape(label)}</span></td>
        <td style="max-width:200px;">${obs}</td>
        <td style="min-width:168px;">
          ${idEsc
            ? `<div class="jornada-actions" style="display:flex;gap:.35rem;flex-wrap:wrap;">
                <button class="btn ${primaryAction.className} btn-sm" onclick="JornadaModule.openGuided('${idEsc}')">${_escape(primaryAction.label)}</button>
                ${secondaryAction ? `<button class="btn ${secondaryAction.className} btn-sm" onclick="JornadaModule.${secondaryAction.handler}('${idEsc}')">${_escape(secondaryAction.label)}</button>` : ''}
                <button class="btn btn-outline btn-sm" onclick="JornadaModule.openMap('${idEsc}')">Mapa</button>
              </div>`
            : ''}
        </td>
      </tr>`;
    }).join('');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function openGuided(id) {
    const escuela = await _resolveEscuela(id);
    if (!escuela) {
      UI.showToast('No se encontro la escuela para abrir el registro guiado.', 'warning');
      return;
    }
    const ready = typeof SurveyModule !== 'undefined' && typeof SurveyModule.setCurrentEscuela === 'function'
      ? SurveyModule.setCurrentEscuela(escuela, { render: false })
      : true;
    if (!ready) return;
    if (typeof AppController !== 'undefined' && AppController.showModule) {
      AppController.showModule('registro');
      setTimeout(() => {
        try { if (typeof GuidedRegisterModule !== 'undefined') GuidedRegisterModule.init(); } catch (_) {}
      }, 160);
      UI.showToast(`Registro guiado activo: ${escuela.nombre || escuela.nombre_escuela || escuela.codigo_local || escuela.id_escuela}.`, 'success', 4200);
      return;
    }
    UI.showToast('No se pudo abrir Registro guiado desde Mi Jornada.', 'warning');
  }

  async function retomarEscuela(id) {
    const row = _findRowById(id);
    if (_isClosedState(row?.estado)) {
      const ok = await UI.showConfirm(
        'Editar relevamiento cerrado',
        'Se abrira el Registro guiado para revisar o corregir la escuela ya finalizada. Si guarda cambios, vuelva a finalizar para actualizar el cierre.'
      );
      if (!ok) return;
    }
    return openGuided(id);
  }

  function openMap(id) {
    if (!id) return;
    if (typeof AppController !== 'undefined' && AppController.showModule) AppController.showModule('mapa');
    setTimeout(() => {
      try {
        if (typeof MapModule !== 'undefined' && MapModule.flyTo) MapModule.flyTo(id);
      } catch (_) {}
    }, 450);
  }

  function openEscuela(id) {
    return openGuided(id);
  }

  // ── Incidencias ───────────────────────────────────────────────────────────

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
    return ((nombres || ' ')[0] + (apellidos || ' ')[0]).toUpperCase();
  }

  function _rolLabel(rol) {
    return { admin: 'Administrador', supervisor: 'Supervisor', encuestador: 'Encuestador' }[rol] || (rol || '');
  }

  function _capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : str;
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function _safeClass(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '') || 'media';
  }

  function _primaryActionForState(estado) {
    if (estado === 'pendiente') return { label: 'Iniciar', className: 'btn-primary' };
    if (estado === 'en_curso') return { label: 'Continuar', className: 'btn-warning' };
    if (_isClosedState(estado)) return { label: 'Editar', className: 'btn-primary' };
    return { label: 'Abrir', className: 'btn-outline' };
  }

  function _secondaryActionForState(estado) {
    if (_isClosedState(estado)) return { label: 'Retomar', className: 'btn-outline', handler: 'retomarEscuela' };
    if (estado === 'en_curso') return { label: 'Retomar', className: 'btn-outline', handler: 'retomarEscuela' };
    return null;
  }

  function _isClosedState(estado) {
    return ['finalizada', 'cerrada', 'completada', 'entregada'].includes(String(estado || '').toLowerCase());
  }

  function _digits(value) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  function _identityKeys(item = {}) {
    return [
      item.id_escuela,
      item.codigo_local,
      item.codigo,
      item.id,
      _digits(item.id_escuela),
      _digits(item.codigo_local),
    ].map(value => String(value || '').trim()).filter(Boolean);
  }

  function _findRowById(id) {
    const keys = [String(id || '').trim(), _digits(id)].filter(Boolean);
    return _buildRows().find(row => _identityKeys(row).some(key => keys.includes(key))) || null;
  }

  async function _resolveEscuela(id) {
    const keys = [String(id || '').trim(), _digits(id)].filter(Boolean);
    let escuela = _escuelas.find(item => _identityKeys(item).some(key => keys.includes(key)));
    if (escuela) return escuela;
    const row = _findRowById(id);
    if (row) {
      escuela = _escuelas.find(item => _identityKeys(item).some(key => _identityKeys(row).includes(key)));
      if (escuela) return escuela;
    }
    if (typeof API !== 'undefined' && API.getEscuela && keys[0]) {
      try {
        const result = await API.getEscuela(keys[0]);
        if (result?.status === 'ok' && result.data) return result.data;
      } catch (_) {}
    }
    const session = typeof Auth !== 'undefined' && Auth.getSession ? Auth.getSession() : {};
    const assigned = row?.usuario || session?.usuario || `${session?.nombres || ''} ${session?.apellidos || ''}`.trim();
    return row ? {
      id_escuela: row.id_escuela || row.codigo_local || keys[0],
      codigo_local: row.codigo_local || row.id_escuela || keys[0],
      nombre: row.nombre_escuela || '',
      nombre_escuela: row.nombre_escuela || '',
      estado_relevamiento: row.estado || '',
      encuestador_asignado: assigned || '',
      usuario_asignado: assigned || '',
    } : null;
  }

  return {
    init,
    loadMisSesiones,
    openEscuela,
    openGuided,
    retomarEscuela,
    openMap,
    sortBy,
    _onSearchInput,
    _onEstadoChange,
  };
})();
