/**
 * CIALPA - Cuestionario inicial R01
 * Version: 2.6.135
 */

const InitialQuestionnaire = (() => {
  'use strict';

  const PUBLIC_PATH = 'cuestionario_inicial';
  const SUPPORT_EMAIL = 'censoescuelaspy@gmail.com';
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
  const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const SCHOOL_FALLBACK_ASSET = 'assets/data/r01-schools-public.json';

  const WATER_SOURCES = [
    'ESSAP',
    'Junta de Saneamiento / SENASA',
    'Prestador o red comunitaria',
    'Red privada',
    'Pozo artesiano',
    'Pozo con bomba',
    'Pozo sin bomba',
    'Manantial o naciente',
    'Tajamar, rio o arroyo',
    'Agua de lluvia',
    'Aguatero',
    'Otra fuente',
  ];

  const DRAINS = [
    'Red cloacal',
    'Camara septica y pozo ciego',
    'Pozo ciego sin camara septica',
    'Superficie, hoyo, zanja, arroyo o rio',
    'Letrina ventilada',
    'Letrina comun con losa, techo, paredes y puertas',
    'Letrina comun sin techo o puerta',
    'Otro sistema',
  ];

  const INTERNET_TYPES = ['Fibra optica', 'Coaxil', 'Satelital', 'Otro'];
  const INTERNET_QUALITY = ['Excelente', 'Muy buena', 'Regular', 'Mala', 'Sin senal'];
  const ENERGY_PROVIDERS = ['ANDE', 'Privado', 'Otro'];
  const ENERGY_CUTS = ['A diario', 'Al menos una vez por semana', 'Rara vez', 'Ni una vez'];
  const FIRE_ITEMS = [
    ['detectores', 'Detectores de humo, calor, termicos o termovelocimetros'],
    ['pulsadores_sirena', 'Pulsadores manuales y sirena'],
    ['luces_emergencia', 'Luces de emergencia'],
    ['extintores', 'Extintores'],
    ['hidraulico', 'Sistema hidraulico: BIE, rociadores o siamesa'],
  ];

  let _contacts = [];
  let _adminLoaded = false;
  let _schoolOptions = [];
  let _territoryMeta = { departamentos: [], distritos: [], distritos_por_departamento: {} };

  function publicUrl(extra = {}) {
    const base = new URL(PUBLIC_PATH + '/', window.location.origin + window.location.pathname.replace(/(?:index\.html)?$/, ''));
    Object.entries(extra || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') base.searchParams.set(key, value);
    });
    return base.toString();
  }

  function initPublic() {
    const root = document.getElementById('initial-questionnaire-root');
    if (!root) return;
    const params = _readQuery();
    root.innerHTML = _renderPublic(params);
    _bindPublic(root, params);
  }

  function _renderPublic(params) {
    return `
      <section class="initial-public-hero">
        <div class="initial-public-hero__content">
          <span class="initial-kicker">CIALPA - Relevamiento previo a la visita</span>
          <h1>Cuestionario inicial para directores de escuela</h1>
          <p>
            Este formulario ayuda a preparar mejor la visita tecnica al local escolar. Sus respuestas permiten que el equipo llegue con
            informacion previa sobre servicios, seguridad, electricidad, conectividad y documentos disponibles.
          </p>
          <div class="initial-hero-note">
            No necesita usuario ni contrasena. Puede completarlo con calma y enviar consultas a
            <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
          </div>
        </div>
      </section>

      <form id="initial-questionnaire-form" class="initial-form" novalidate>
        ${_section('identificacion', 'Identificacion y contacto', 'Datos basicos para asociar la respuesta con la escuela correcta.', `
          <div class="initial-grid">
            ${_schoolSearchField(params)}
            ${_field('nombre_escuela', 'Nombre de la escuela', params.nombre || params.escuela || '', 'text', 'Nombre oficial o conocido', true)}
            ${_selectField('departamento', 'Departamento', params.departamento || '', [], 'Seleccione departamento')}
            ${_selectField('distrito', 'Distrito', params.distrito || '', [], 'Seleccione distrito')}
            ${_field('localidad', 'Localidad / compania / barrio', params.localidad || '')}
            ${_field('director_nombre', 'Nombre de quien responde', params.director || '', 'text', 'Director/a o responsable', true)}
            ${_field('director_correo', 'Correo de contacto', params.correo || params.email || '', 'email', 'correo@ejemplo.com')}
            ${_field('director_celular', 'Celular de contacto', params.celular || '', 'tel', 'Ej.: 09xx xxx xxx')}
          </div>
        `)}

        ${_section('agua', 'Servicio de agua', 'Indique si existe abastecimiento de agua y de donde proviene principalmente.', `
          ${_yesNo('agua_tiene', 'El local escolar cuenta con servicio de abastecimiento de agua?', true)}
          ${_dependent('agua_tiene', 'Si', `
            ${_checkboxGrid('agua_fuentes', WATER_SOURCES, 'Fuente(s) de abastecimiento de agua utilizadas por la escuela', 'Marque una o mas opciones segun corresponda.')}
            <div class="initial-grid initial-grid--compact">
              ${_field('bomba_hp', 'Potencia de bomba, si corresponde', '', 'text', 'Ej.: 1 HP, 2 HP')}
            </div>
          `)}
          ${_textarea('agua_observacion', 'Observacion sobre agua', 'Cortes frecuentes, baja presion, tanque, necesidad de reparacion, o aclaracion si no cuenta con agua.')}
        `)}

        ${_section('sanitario', 'Servicio sanitario', 'Datos generales sobre banos y sistema de desague.', `
          ${_yesNo('bano_tiene', 'El local escolar cuenta con bano?', true)}
          ${_dependent('bano_tiene', 'Si', `
            ${_radioGrid('desague_tipo', DRAINS, 'Tipo principal de desague o disposicion sanitaria')}
          `)}
          ${_textarea('sanitario_observacion', 'Observacion sobre sanitarios', 'Estado general, banos clausurados, falta de agua, accesibilidad, etc.')}
        `)}

        ${_section('internet', 'Internet y conectividad', 'Ayuda a prever si el equipo de campo podra sincronizar datos durante la visita.', `
          ${_yesNo('internet_tiene', 'La escuela cuenta con Internet?', true)}
          ${_dependent('internet_tiene', 'Si', `
            ${_checkboxGrid('internet_tipo', INTERNET_TYPES, 'Tipo(s) de conexion a Internet disponibles', 'Marque una o mas opciones.')}
            ${_radioGrid('internet_calidad', INTERNET_QUALITY, 'Calidad de la senal de Internet durante la ultima semana')}
          `, 'Estas preguntas aparecen solo cuando la escuela informa que cuenta con Internet.')}
          ${_textarea('internet_observacion', 'Observacion sobre conectividad', 'Proveedor, zonas sin senal, contrasena disponible para la visita, o aclaracion si no cuenta con Internet.')}
        `)}

        ${_section('seguridad', 'CCTV y prevencion contra incendios', 'Informacion basica para orientar la verificacion de seguridad del local.', `
          ${_yesNo('cctv_tiene', 'Cuenta con sistema de vigilancia CCTV?', false)}
          ${_dependent('cctv_tiene', 'Si', `
            <div class="initial-grid initial-grid--compact">
              ${_field('cctv_funcionando', 'Cantidad de camaras en funcionamiento', '', 'number', '0')}
              ${_field('cctv_danadas', 'Cantidad de camaras danadas', '', 'number', '0')}
            </div>
          `)}
          ${_choiceBlock('Elementos de prevencion contra incendios disponibles', '<div class="initial-fire-grid">' + FIRE_ITEMS.map(([key, label]) => _fireItem(key, label)).join('') + '</div>', 'Responda cada elemento por separado.')}
          <div class="initial-grid initial-grid--compact">
            ${_field('motobomba_hp', 'Motobomba HP, si existe', '', 'text', 'Ej.: 3 HP')}
            ${_field('reserva_tanque_litros', 'Reserva de tanque contra incendio (litros)', '', 'number', 'Ej.: 5000')}
          </div>
        `)}

        ${_section('electricidad', 'Instalacion electrica', 'Datos de provision y continuidad del servicio electrico.', `
          ${_yesNo('energia_tiene', 'Cuenta con energia electrica?', true)}
          ${_dependent('energia_tiene', 'Si', `
            ${_radioGrid('energia_proveedor', ENERGY_PROVIDERS, 'Proveedor principal de energia')}
            ${_radioGrid('energia_cortes', ENERGY_CUTS, 'Frecuencia de cortes durante el ultimo ano')}
          `)}
          ${_textarea('energia_observacion', 'Observacion sobre electricidad', 'Tablero, medidor, proteccion diferencial, puesta a tierra, circuitos o problemas frecuentes.')}
        `)}

        ${_section('documentos', 'Plano, fachada y comentarios finales', 'Si tiene un plano o una foto de fachada, adjuntelo para preparar mejor la visita.', `
          <div class="initial-upload">
            <input type="file" id="initial-attachment" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <div>
              <strong>Adjuntar plano o fotografia de fachada</strong>
              <p>Puede subir un plano, croquis, PDF o una foto simple de la fachada. Maximo 8 MB.</p>
              <div id="initial-upload-status" class="initial-upload__status">Sin archivo seleccionado.</div>
            </div>
          </div>
          ${_textarea('observacion_final', 'Comentario final', 'Cualquier dato que ayude a agilizar el relevamiento in situ.')}
        `)}

        <input type="hidden" name="token" value="${_escape(params.token || params.t || '')}" />
        <input type="hidden" name="app_version" value="${_escape((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VERSION) || '2.6.135')}" />

        <div class="initial-submit">
          <button type="submit" class="btn btn-primary btn-lg">Enviar cuestionario inicial</button>
          <p>Al enviar, la respuesta queda disponible como insumo para el formulario de relevamiento en campo.</p>
        </div>
      </form>
      <div id="initial-questionnaire-message" class="initial-message" aria-live="polite"></div>
    `;
  }

  function _section(key, title, subtitle, body) {
    return `
      <section class="initial-section initial-section--${key}">
        <div class="initial-section__head">
          <span>${title}</span>
          <p>${subtitle}</p>
        </div>
        <div class="initial-section__body">${body}</div>
      </section>`;
  }

  function _field(name, label, value = '', type = 'text', placeholder = '', required = false) {
    return `
      <label class="initial-field">
        <span>${label}${required ? ' *' : ''}</span>
        <input name="${name}" type="${type}" value="${_escape(value)}" placeholder="${_escape(placeholder)}" ${required ? 'required' : ''} />
      </label>`;
  }

  function _selectField(name, label, value = '', options = [], placeholder = 'Seleccione') {
    const selectedValue = String(value || '');
    const htmlOptions = [
      `<option value="">${_escape(placeholder)}</option>`,
      ...options.map(option => {
        const selected = String(option) === selectedValue ? ' selected' : '';
        return `<option value="${_escape(option)}"${selected}>${_escape(option)}</option>`;
      }),
    ].join('');
    return `
      <label class="initial-field">
        <span>${label}</span>
        <select name="${name}" data-territory="${name}" data-selected="${_escape(selectedValue)}">${htmlOptions}</select>
      </label>`;
  }

  function _schoolSearchField(params) {
    const code = params.codigo_local || params.codigo || '';
    const id = params.id_escuela || '';
    const school = params.nombre || params.escuela || '';
    const display = [code, school].filter(Boolean).join(' - ');
    return `
      <label class="initial-field initial-field--wide initial-school-search">
        <span>Codigo de local / escuela</span>
        <input id="initial-school-search" type="search" value="${_escape(display)}" placeholder="Busque por codigo, nombre de escuela o distrito" list="initial-school-options" autocomplete="off" data-school-search />
        <datalist id="initial-school-options"></datalist>
        <input type="hidden" name="codigo_local" value="${_escape(code)}" data-school-code />
        <input type="hidden" name="id_escuela" value="${_escape(id)}" data-school-id />
        <small id="initial-school-hint" class="initial-school-hint">Cargando lista oficial de escuelas...</small>
      </label>`;
  }

  function _textarea(name, label, placeholder = '') {
    return `
      <label class="initial-field initial-field--wide">
        <span>${label}</span>
        <textarea name="${name}" rows="4" placeholder="${_escape(placeholder)}"></textarea>
      </label>`;
  }

  function _yesNo(name, label, required = false) {
    return `
      <div class="initial-question">
        <div class="initial-question__label">${label}${required ? ' *' : ''}</div>
        <div class="initial-choice-row">
          ${_radioChoice(name, 'Si', required)}
          ${_radioChoice(name, 'No', required)}
          ${_radioChoice(name, 'No sabe / no responde', required)}
        </div>
      </div>`;
  }

  function _radioGrid(name, options, label) {
    return `
      ${_choiceBlock(label, `<div class="initial-option-grid">${options.map(opt => _radioChoice(name, opt, false)).join('')}</div>`)}`;
  }

  function _checkboxGrid(name, options, label, hint = '') {
    return `
      ${_choiceBlock(label, `<div class="initial-option-grid initial-option-grid--check">
        ${options.map(opt => `
          <label class="initial-choice">
            <input type="checkbox" name="${name}" value="${_escape(opt)}" />
            <span>${_escape(opt)}</span>
          </label>`).join('')}
      </div>`, hint)}`;
  }

  function _choiceBlock(label, body, hint = '') {
    return `
      <div class="initial-question">
        <div class="initial-question__label">${_escape(label)}</div>
        ${hint ? `<div class="initial-question__hint">${_escape(hint)}</div>` : ''}
        ${body}
      </div>`;
  }

  function _dependent(name, value, body, hint = '') {
    return `
      <div class="initial-dependent" data-dependent-name="${_escape(name)}" data-dependent-value="${_escape(value)}">
        ${hint ? `<div class="initial-skip-note">${_escape(hint)}</div>` : ''}
        ${body}
      </div>`;
  }

  function _radioChoice(name, value, required) {
    return `
      <label class="initial-choice">
        <input type="radio" name="${name}" value="${_escape(value)}" ${required ? 'required' : ''} />
        <span>${_escape(value)}</span>
      </label>`;
  }

  function _fireItem(key, label) {
    return `
      <div class="initial-fire-item">
        <strong>${_escape(label)}</strong>
        <div class="initial-choice-row initial-choice-row--small">
          ${_radioChoice(`incendio_${key}`, 'Tiene', false)}
          ${_radioChoice(`incendio_${key}`, 'No tiene', false)}
          ${_radioChoice(`incendio_${key}`, 'No sabe', false)}
        </div>
      </div>`;
  }

  function _bindPublic(root, params) {
    const form = root.querySelector('#initial-questionnaire-form');
    const message = root.querySelector('#initial-questionnaire-message');
    const fileInput = root.querySelector('#initial-attachment');
    const uploadStatus = root.querySelector('#initial-upload-status');

    form.addEventListener('change', event => {
      if (event.target && /^(radio|checkbox)$/i.test(event.target.type)) _refreshChoiceState(form);
      _refreshDependentState(form);
    });
    form.addEventListener('click', event => {
      if (event.target?.closest?.('.initial-choice')) {
        setTimeout(() => {
          _refreshChoiceState(form);
          _refreshDependentState(form);
        }, 0);
      }
    });
    _bindSchoolLookup(root, params);

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        uploadStatus.textContent = 'Sin archivo seleccionado.';
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        fileInput.value = '';
        uploadStatus.textContent = 'El archivo supera 8 MB. Adjunte uno mas liviano.';
        return;
      }
      uploadStatus.textContent = `${file.name} (${Math.round(file.size / 1024)} KB) listo para enviar.`;
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      _refreshChoiceState(form);
      if (!form.reportValidity()) return;

      const button = form.querySelector('button[type="submit"]');
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Enviando...';
      message.className = 'initial-message';
      message.textContent = '';

      try {
        const payload = _formPayload(form);
        payload.public_url = window.location.href;
        payload.origen = 'cuestionario_inicial_publico';
        const result = await _publicApi('guardarCuestionarioInicial', payload);
        if (result.status !== 'ok') throw new Error(result.message || 'No se pudo guardar la respuesta.');

        const file = fileInput?.files && fileInput.files[0];
        if (file) {
          const attachment = await _fileToPayload(file);
          await _publicApi('guardarCuestionarioInicialAdjunto', {
            ...attachment,
            id_respuesta: result.data?.id_respuesta || '',
            codigo_local: payload.codigo_local || '',
            id_escuela: payload.id_escuela || '',
            nombre_escuela: payload.nombre_escuela || '',
            token: payload.token || '',
            app_version: payload.app_version || '',
          });
        }

        form.reset();
        _refreshChoiceState(form);
        _refreshDependentState(form);
        if (uploadStatus) uploadStatus.textContent = 'Sin archivo seleccionado.';
        message.className = 'initial-message initial-message--success';
        message.innerHTML = `
          <strong>Cuestionario enviado correctamente.</strong>
          <p>Muchas gracias. La informacion ya queda como insumo previo para la visita in situ.</p>
          <p>Ante cualquier duda puede escribir a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`;
      } catch (err) {
        message.className = 'initial-message initial-message--error';
        message.textContent = err.message || 'No se pudo enviar. Revise la conexion e intente nuevamente.';
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });

    setTimeout(() => {
      _refreshChoiceState(form);
      _refreshDependentState(form);
    }, 0);
    _loadOfficialSchools(root, params);
  }

  function _formPayload(form) {
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((value, key) => {
      if (payload[key] !== undefined) {
        if (!Array.isArray(payload[key])) payload[key] = [payload[key]];
        payload[key].push(value);
      } else {
        payload[key] = value;
      }
    });
    Object.keys(payload).forEach(key => {
      if (Array.isArray(payload[key])) payload[key] = payload[key].join(' | ');
    });
    const schoolSearch = form.querySelector('[data-school-search]');
    const selectedSchool = _findSchoolBySearch(schoolSearch?.value || '');
    if (selectedSchool) {
      payload.codigo_local = payload.codigo_local || selectedSchool.codigo_local || '';
      payload.id_escuela = payload.id_escuela || selectedSchool.id_escuela || '';
      payload.nombre_escuela = payload.nombre_escuela || selectedSchool.nombre || '';
      payload.departamento = payload.departamento || selectedSchool.departamento || '';
      payload.distrito = payload.distrito || selectedSchool.distrito || '';
      payload.localidad = payload.localidad || selectedSchool.localidad || '';
    } else if (!payload.codigo_local && schoolSearch?.value) {
      payload.codigo_local = _extractSchoolCode(schoolSearch.value);
    }
    return payload;
  }

  async function _publicApi(action, data) {
    const config = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : null;
    if (!config || !config.GAS_URL) {
      if (action === 'listarEscuelasCuestionarioInicial') return _demoSchoolList();
      return { status: 'ok', data: { id_respuesta: `R01_DEMO_${Date.now()}` }, demo: true };
    }
    const response = await fetch(config.GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, ...data }),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('El servidor no devolvio una respuesta valida. Intente nuevamente.');
    }
  }

  function _bindSchoolLookup(root, params) {
    const search = root.querySelector('[data-school-search]');
    const dept = root.querySelector('[data-territory="departamento"]');
    const district = root.querySelector('[data-territory="distrito"]');

    search?.addEventListener('input', () => {
      const school = _findSchoolBySearch(search.value);
      if (school) {
        _applySchoolSelection(root, school, { force: false });
        return;
      }
      const code = root.querySelector('[data-school-code]');
      const id = root.querySelector('[data-school-id]');
      if (code) code.value = _extractSchoolCode(search.value);
      if (id) id.value = '';
    });
    search?.addEventListener('change', () => {
      const school = _findSchoolBySearch(search.value);
      if (school) _applySchoolSelection(root, school, { force: true });
    });
    dept?.addEventListener('change', () => {
      if (district) {
        district.value = '';
        district.dataset.selected = '';
      }
      _populateDistrictSelect(root, dept.value, '');
    });
  }

  async function _loadOfficialSchools(root, params) {
    const hint = root.querySelector('#initial-school-hint');
    try {
      const result = await _publicApi('listarEscuelasCuestionarioInicial', {});
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo cargar la lista oficial.');
      _schoolOptions = Array.isArray(result.data) ? result.data : [];
      _territoryMeta = result.meta || _buildTerritoryMeta(_schoolOptions);
      _populateSchoolDatalist(root);
      _populateTerritoryControls(root, params);
      const selected = _findSchoolByCode(params.codigo_local || params.codigo || params.id_escuela)
        || _findSchoolBySearch(root.querySelector('[data-school-search]')?.value || '');
      if (selected) _applySchoolSelection(root, selected, { force: !params.nombre && !params.escuela });
      if (hint) hint.textContent = `${_schoolOptions.length} escuelas disponibles. Busque por codigo local, nombre o distrito.`;
    } catch (err) {
      try {
        const fallback = await _loadPublishedSchoolFallback();
        _schoolOptions = Array.isArray(fallback.data) ? fallback.data : [];
        _territoryMeta = fallback.meta || _buildTerritoryMeta(_schoolOptions);
        _populateSchoolDatalist(root);
        _populateTerritoryControls(root, params);
        const selected = _findSchoolByCode(params.codigo_local || params.codigo || params.id_escuela)
          || _findSchoolBySearch(root.querySelector('[data-school-search]')?.value || '');
        if (selected) _applySchoolSelection(root, selected, { force: !params.nombre && !params.escuela });
        if (hint) {
          hint.textContent = `${_schoolOptions.length} escuelas disponibles desde la copia publicada. Busque por codigo local, nombre o distrito.`;
        }
      } catch (fallbackErr) {
        _schoolOptions = [];
        _territoryMeta = _buildTerritoryMeta([]);
        _populateTerritoryControls(root, params);
        if (hint) hint.textContent = 'No se pudo cargar la lista oficial ahora. Puede escribir el codigo o nombre manualmente.';
      }
    }
  }

  async function _loadPublishedSchoolFallback() {
    const url = _assetUrl(SCHOOL_FALLBACK_ASSET);
    const version = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VERSION) || Date.now();
    const requestUrl = `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
    const response = await fetch(requestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.schools) ? payload.schools : (Array.isArray(payload.data) ? payload.data : []);
    const data = rows.map(_normalizePublishedSchool).filter(row => row.codigo_local || row.id_escuela || row.nombre);
    return {
      status: 'ok',
      data,
      meta: {
        ..._buildTerritoryMeta(data),
        ...(payload.meta || {}),
        source: 'github_pages_asset',
      },
    };
  }

  function _normalizePublishedSchool(row) {
    if (Array.isArray(row)) {
      return {
        codigo_local: String(row[0] || '').trim(),
        id_escuela: String(row[5] || row[0] || '').trim(),
        nombre: String(row[1] || '').trim(),
        departamento: _sanitizeTerritoryLabel(row[2] || ''),
        distrito: _sanitizeTerritoryLabel(row[3] || ''),
        localidad: String(row[4] || '').trim(),
      };
    }
    row = row || {};
    return {
      codigo_local: String(row.codigo_local || row.codigo || row.code || '').trim(),
      id_escuela: String(row.id_escuela || row.id || row.codigo_local || row.codigo || '').trim(),
      nombre: String(row.nombre || row.nombre_escuela || row.escuela || '').trim(),
      departamento: _sanitizeTerritoryLabel(row.departamento || ''),
      distrito: _sanitizeTerritoryLabel(row.distrito || ''),
      localidad: String(row.localidad || '').trim(),
    };
  }

  function _assetUrl(path) {
    const current = new URL(window.location.href);
    const base = /\/cuestionario_inicial\/?/i.test(current.pathname)
      ? new URL('../', current.href)
      : new URL('./', current.href);
    return new URL(path, base.href).toString();
  }

  function _populateSchoolDatalist(root) {
    const datalist = root.querySelector('#initial-school-options');
    if (!datalist) return;
    datalist.innerHTML = _schoolOptions.map(row => `<option value="${_escape(_schoolLabel(row))}"></option>`).join('');
  }

  function _populateTerritoryControls(root, params = {}) {
    const dept = root.querySelector('[data-territory="departamento"]');
    const selectedDept = dept?.value || params.departamento || dept?.dataset.selected || '';
    _setSelectOptions(dept, _territoryMeta.departamentos || [], 'Seleccione departamento', selectedDept);
    _populateDistrictSelect(root, selectedDept, params.distrito || '');
  }

  function _populateDistrictSelect(root, departamento = '', selected = '') {
    const district = root.querySelector('[data-territory="distrito"]');
    if (!district) return;
    const options = _districtsForDepartamento(departamento);
    const current = selected || district.value || district.dataset.selected || '';
    _setSelectOptions(district, options, 'Seleccione distrito', current);
  }

  function _setSelectOptions(select, options, placeholder, selected) {
    if (!select) return;
    const normalized = String(selected || '');
    select.innerHTML = [`<option value="">${_escape(placeholder)}</option>`]
      .concat((options || []).map(option => {
        const isSelected = String(option) === normalized ? ' selected' : '';
        return `<option value="${_escape(option)}"${isSelected}>${_escape(option)}</option>`;
      }))
      .join('');
    if (normalized && !(options || []).includes(normalized)) {
      select.insertAdjacentHTML('beforeend', `<option value="${_escape(normalized)}" selected>${_escape(normalized)}</option>`);
    }
  }

  function _districtsForDepartamento(departamento) {
    if (!departamento) return _territoryMeta.distritos || [];
    const byDept = _territoryMeta.distritos_por_departamento || {};
    return byDept[departamento] || byDept[_territoryKey(departamento)] || [];
  }

  function _applySchoolSelection(root, school, { force = false } = {}) {
    if (!school) return;
    const search = root.querySelector('[data-school-search]');
    const code = root.querySelector('[data-school-code]');
    const id = root.querySelector('[data-school-id]');
    const name = root.querySelector('[name="nombre_escuela"]');
    const locality = root.querySelector('[name="localidad"]');
    const dept = root.querySelector('[data-territory="departamento"]');
    const district = root.querySelector('[data-territory="distrito"]');
    if (search && force) search.value = _schoolLabel(school);
    if (code) code.value = school.codigo_local || '';
    if (id) id.value = school.id_escuela || '';
    if (name && (force || !name.value)) name.value = school.nombre || '';
    if (locality && (force || !locality.value)) locality.value = school.localidad || '';
    if (dept) {
      _setSelectOptions(dept, _territoryMeta.departamentos || [], 'Seleccione departamento', school.departamento || dept.value);
      dept.value = school.departamento || dept.value;
    }
    _populateDistrictSelect(root, school.departamento || dept?.value || '', school.distrito || district?.value || '');
  }

  function _findSchoolBySearch(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const normalized = _norm(text);
    return _schoolOptions.find(row => {
      return _norm(_schoolLabel(row)) === normalized
        || _norm(row.codigo_local) === normalized
        || _norm(row.id_escuela) === normalized;
    }) || null;
  }

  function _findSchoolByCode(value) {
    const normalized = _norm(value);
    if (!normalized) return null;
    return _schoolOptions.find(row => _norm(row.codigo_local) === normalized || _norm(row.id_escuela) === normalized) || null;
  }

  function _extractSchoolCode(value) {
    const text = String(value || '').trim();
    const match = text.match(/^([A-Za-z0-9._-]+)/);
    return match ? match[1] : text;
  }

  function _schoolLabel(row) {
    return [row.codigo_local || row.id_escuela || '', row.nombre || row.nombre_escuela || '', row.distrito || '']
      .filter(Boolean)
      .join(' - ');
  }

  function _buildTerritoryMeta(rows) {
    const departamentos = [...new Set((rows || []).map(row => row.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const distritos = [...new Set((rows || []).map(row => row.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const distritos_por_departamento = {};
    (rows || []).forEach(row => {
      if (!row.departamento || !row.distrito) return;
      const key = _territoryKey(row.departamento);
      if (!distritos_por_departamento[row.departamento]) distritos_por_departamento[row.departamento] = [];
      if (!distritos_por_departamento[key]) distritos_por_departamento[key] = [];
      if (!distritos_por_departamento[row.departamento].includes(row.distrito)) distritos_por_departamento[row.departamento].push(row.distrito);
      if (!distritos_por_departamento[key].includes(row.distrito)) distritos_por_departamento[key].push(row.distrito);
    });
    Object.keys(distritos_por_departamento).forEach(key => distritos_por_departamento[key].sort((a, b) => a.localeCompare(b)));
    return { departamentos, distritos, distritos_por_departamento };
  }

  function _sanitizeTerritoryLabel(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const parsed = _parseSerializedTerritoryDate(text);
    return parsed ? _formatTerritoryDate(parsed) : text;
  }

  function _parseSerializedTerritoryDate(text) {
    if (!text) return null;
    if (text.indexOf('GMT') === -1 && !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/i.test(text)) return null;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function _formatTerritoryDate(date) {
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${date.getDate()} DE ${months[date.getMonth()] || ''}`.trim();
  }

  function _demoSchoolList() {
    const rows = [
      { id_escuela: 'ESC_DEMO_1', codigo_local: '9000001', nombre: 'Escuela Demo R01 01', departamento: 'Central', distrito: 'Luque', localidad: 'Localidad demo' },
      { id_escuela: 'ESC_DEMO_2', codigo_local: '9000002', nombre: 'Escuela Demo R01 02', departamento: 'Central', distrito: 'San Lorenzo', localidad: 'Localidad demo' },
    ];
    return { status: 'ok', data: rows, meta: _buildTerritoryMeta(rows), demo: true };
  }

  function _fileToPayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.includes(',') ? dataUrl.split(',').pop() : dataUrl;
        resolve({ filename: file.name, mimeType: file.type || 'application/octet-stream', base64 });
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo adjunto.'));
      reader.readAsDataURL(file);
    });
  }

  async function adminInit() {
    const root = document.getElementById('initial-questionnaire-admin-root');
    if (!root) return;
    root.innerHTML = _renderAdmin();
    _bindAdmin(root);
    if (!_adminLoaded) {
      _adminLoaded = true;
      await loadContacts();
    } else {
      _renderContacts(root);
    }
  }

  function _renderAdmin() {
    return `
      <div class="initial-admin">
        <section class="initial-admin__hero">
          <div>
            <span class="initial-kicker">R01 - Cuestionario inicial</span>
            <h3>Envio previo a directores</h3>
            <p>Importe contactos desde Excel, revise por distrito y envie el enlace publico en grupos manejables.</p>
          </div>
          <div class="initial-admin__actions">
            <a class="btn btn-outline" href="${PUBLIC_PATH}/" target="_blank" rel="noopener">Abrir cuestionario publico</a>
            <button class="btn btn-secondary" data-initial-demo>Simular 50 contactos</button>
          </div>
        </section>

        <section class="initial-admin__grid">
          <div class="card initial-admin-card">
            <h4>1. Cargar contactos</h4>
            <p class="text-muted">Acepta Excel o CSV con columnas como codigo_local, escuela, director, correo, celular, departamento y distrito.</p>
            <label class="initial-file-label" for="initial-contacts-file">Archivo de contactos</label>
            <input type="file" id="initial-contacts-file" accept=".xlsx,.xls,.csv" />
            <div class="initial-admin-card__actions">
              <button class="btn btn-primary btn-sm" data-initial-read>Leer archivo</button>
              <button class="btn btn-outline btn-sm" data-initial-refresh>Actualizar lista</button>
            </div>
          </div>

          <div class="card initial-admin-card">
            <h4>2. Enviar por distrito</h4>
            <label class="initial-field">
              <span>Distrito</span>
              <select id="initial-district-filter"><option value="">Todos los distritos</option></select>
            </label>
            <label class="initial-field">
              <span>Limite de envio</span>
              <input id="initial-send-limit" type="number" min="1" max="500" value="50" />
            </label>
            <label class="initial-field">
              <span>Asunto del correo</span>
              <input id="initial-email-subject" type="text" value="CIALPA - Cuestionario inicial previo a la visita escolar" />
            </label>
            <div class="initial-admin-card__actions">
              <button class="btn btn-outline btn-sm" data-initial-send-dry>Simular envio</button>
              <button class="btn btn-success btn-sm" data-initial-send-real>Enviar correos reales</button>
            </div>
          </div>
        </section>

        <div id="initial-admin-result" class="initial-admin-result"></div>
        <div id="initial-contacts-summary" class="initial-contacts-summary"></div>
        <div class="table-wrapper card">
          <table class="initial-contacts-table">
            <thead>
              <tr>
                <th>Codigo</th><th>Escuela</th><th>Director/a</th><th>Distrito</th><th>Correo</th><th>Celular</th><th>Estado</th><th>Ultimo envio</th>
              </tr>
            </thead>
            <tbody id="initial-contacts-table">
              <tr><td colspan="8" class="text-center text-muted">Cargando contactos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function _bindAdmin(root) {
    root.querySelector('[data-initial-demo]')?.addEventListener('click', loadDemoContacts);
    root.querySelector('[data-initial-refresh]')?.addEventListener('click', loadContacts);
    root.querySelector('[data-initial-read]')?.addEventListener('click', () => _readContactsFile(root));
    root.querySelector('[data-initial-send-dry]')?.addEventListener('click', () => sendGroup({ dryRun: true }));
    root.querySelector('[data-initial-send-real]')?.addEventListener('click', () => {
      if (confirm('Enviar correos reales desde el backend configurado?')) sendGroup({ dryRun: false });
    });
    root.querySelector('#initial-district-filter')?.addEventListener('change', () => _renderContacts(root));
  }

  async function loadContacts() {
    try {
      const result = await API.listarContactosCuestionarioInicial({});
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo listar contactos.');
      _contacts = Array.isArray(result.data) ? result.data : [];
    } catch (err) {
      _contacts = _contacts.length ? _contacts : [];
      _adminResult(err.message, 'error');
    }
    const root = document.getElementById('initial-questionnaire-admin-root');
    if (root) _renderContacts(root);
  }

  async function loadDemoContacts() {
    const contacts = _demoContacts(50);
    try {
      const result = await API.importarContactosCuestionarioInicial({ contacts, source: 'demo_50' });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo guardar la demo.');
      _adminResult(`Demo cargada: ${result.data?.processed || contacts.length} contactos disponibles.`, 'success');
      await loadContacts();
    } catch (err) {
      _contacts = contacts;
      _adminResult(`Demo local cargada. ${err.message}`, 'warning');
      const root = document.getElementById('initial-questionnaire-admin-root');
      if (root) _renderContacts(root);
    }
  }

  async function _readContactsFile(root) {
    const input = root.querySelector('#initial-contacts-file');
    const file = input?.files && input.files[0];
    if (!file) {
      _adminResult('Seleccione primero un archivo Excel o CSV.', 'warning');
      return;
    }
    try {
      const rows = await _parseContactsFile(file);
      if (!rows.length) throw new Error('El archivo no contiene contactos reconocibles.');
      const result = await API.importarContactosCuestionarioInicial({ contacts: rows, source: file.name });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo importar.');
      _adminResult(`Importacion lista: ${result.data?.processed || rows.length} contactos procesados.`, 'success');
      await loadContacts();
    } catch (err) {
      _adminResult(err.message, 'error');
    }
  }

  async function sendGroup({ dryRun = true } = {}) {
    const root = document.getElementById('initial-questionnaire-admin-root');
    if (!root) return;
    const distrito = root.querySelector('#initial-district-filter')?.value || '';
    const limit = parseInt(root.querySelector('#initial-send-limit')?.value || '50', 10) || 50;
    const subject = root.querySelector('#initial-email-subject')?.value || '';
    try {
      const result = await API.enviarCuestionarioInicial({ distrito, limit, subject, dryRun });
      if (result.status !== 'ok') throw new Error(result.message || 'No se pudo enviar.');
      const data = result.data || {};
      _adminResult(`${dryRun ? 'Simulacion' : 'Envio'} listo: ${data.processed || 0} procesados, ${data.sent || 0} enviados.`, 'success');
      await loadContacts();
    } catch (err) {
      _adminResult(err.message, 'error');
    }
  }

  function _renderContacts(root) {
    const tbody = root.querySelector('#initial-contacts-table');
    const summary = root.querySelector('#initial-contacts-summary');
    const districtSelect = root.querySelector('#initial-district-filter');
    const districts = [...new Set(_contacts.map(c => c.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const currentDistrict = districtSelect?.value || '';
    if (districtSelect) {
      districtSelect.innerHTML = '<option value="">Todos los distritos</option>' + districts.map(d => `<option value="${_escape(d)}">${_escape(d)}</option>`).join('');
      districtSelect.value = currentDistrict;
    }
    const filtered = currentDistrict ? _contacts.filter(c => c.distrito === currentDistrict) : _contacts;
    if (summary) {
      const withEmail = filtered.filter(c => c.correo).length;
      const sent = filtered.filter(c => /enviado|simulado/i.test(String(c.estado_envio || c.estado || ''))).length;
      summary.innerHTML = `
        <span><strong>${filtered.length}</strong> contactos visibles</span>
        <span><strong>${withEmail}</strong> con correo</span>
        <span><strong>${sent}</strong> con envio registrado</span>`;
    }
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay contactos para mostrar.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.slice(0, 250).map(row => `
      <tr>
        <td>${_escape(row.codigo_local || row.id_escuela || '')}</td>
        <td>${_escape(row.nombre_escuela || row.escuela || row.nombre || '')}</td>
        <td>${_escape(row.director_nombre || row.director || '')}</td>
        <td>${_escape(row.distrito || '')}</td>
        <td>${_escape(row.correo || '')}</td>
        <td>${_escape(row.celular || row.telefono || '')}</td>
        <td><span class="badge">${_escape(row.estado_envio || row.estado || 'pendiente')}</span></td>
        <td>${_escape(row.ultimo_envio || row.fecha_ultimo_envio || '')}</td>
      </tr>`).join('');
  }

  function _parseContactsFile(file) {
    return new Promise((resolve, reject) => {
      const finish = rows => resolve(rows.map(_normalizeContact).filter(c => c.nombre_escuela || c.codigo_local || c.correo));
      if (/\.csv$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = () => finish(_parseCsv(String(reader.result || '')));
        reader.onerror = () => reject(new Error('No se pudo leer el CSV.'));
        reader.readAsText(file, 'utf-8');
        return;
      }
      _loadXlsx().then(() => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            finish(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
          } catch (err) {
            reject(new Error('No se pudo interpretar el Excel.'));
          }
        };
        reader.onerror = () => reject(new Error('No se pudo leer el Excel.'));
        reader.readAsArrayBuffer(file);
      }).catch(reject);
    });
  }

  function _loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
  }

  function _parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headers = lines.shift().split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.map(line => {
      const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => row[h] = values[i] || '');
      return row;
    });
  }

  function _normalizeContact(row) {
    row = row || {};
    const pick = keys => {
      for (const key of keys) {
        const found = Object.keys(row).find(k => _norm(k) === _norm(key));
        if (found && String(row[found] || '').trim()) return String(row[found]).trim();
      }
      return '';
    };
    return {
      codigo_local: pick(['codigo_local', 'codigo', 'cod_local', 'cod local', 'local']),
      id_escuela: pick(['id_escuela', 'id']),
      nombre_escuela: pick(['nombre_escuela', 'escuela', 'nombre', 'institucion']),
      director_nombre: pick(['director', 'directora', 'director_nombre', 'responsable', 'contacto']),
      correo: pick(['correo', 'email', 'mail', 'e-mail']),
      celular: pick(['celular', 'telefono', 'whatsapp', 'numero']),
      departamento: pick(['departamento']),
      distrito: pick(['distrito']),
      localidad: pick(['localidad', 'barrio', 'compania']),
    };
  }

  function _demoContacts(count) {
    const districts = ['Asuncion', 'Luque', 'San Lorenzo', 'Capiata', 'Fernando de la Mora'];
    return Array.from({ length: count }, (_, i) => {
      const n = i + 1;
      const distrito = districts[i % districts.length];
      return {
        codigo_local: String(9000000 + n),
        nombre_escuela: `Escuela Demo R01 ${String(n).padStart(2, '0')}`,
        director_nombre: `Director/a Demo ${String(n).padStart(2, '0')}`,
        correo: `director.demo${String(n).padStart(2, '0')}@example.com`,
        celular: `0981${String(100000 + n).slice(-6)}`,
        departamento: distrito === 'Asuncion' ? 'Capital' : 'Central',
        distrito,
        localidad: 'Localidad demo',
      };
    });
  }

  function _refreshChoiceState(form) {
    form.querySelectorAll('.initial-choice').forEach(label => {
      const input = label.querySelector('input');
      label.classList.toggle('is-checked', !!input?.checked);
    });
  }

  function _refreshDependentState(form) {
    form.querySelectorAll('[data-dependent-name]').forEach(block => {
      const name = block.dataset.dependentName || '';
      const expected = block.dataset.dependentValue || '';
      const selected = Array.from(form.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
        .find(input => input.name === name && input.checked)?.value || '';
      const active = selected === expected;
      block.classList.toggle('is-hidden', !active);
      block.setAttribute('aria-hidden', active ? 'false' : 'true');
      block.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = !active;
        if (!active) {
          if (/^(radio|checkbox)$/i.test(input.type)) input.checked = false;
          else input.value = '';
        }
      });
    });
    _refreshChoiceState(form);
  }

  function _readQuery() {
    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
  }

  function _adminResult(message, type = 'info') {
    const el = document.getElementById('initial-admin-result');
    if (!el) return;
    el.className = `initial-admin-result initial-admin-result--${type}`;
    el.textContent = message || '';
  }

  function _norm(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function _territoryKey(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublic);
  } else {
    initPublic();
  }

  return {
    initPublic,
    adminInit,
    loadContacts,
    loadDemoContacts,
    sendGroup,
    publicUrl,
  };
})();
