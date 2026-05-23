/**
 * CIALPA - Cuestionario inicial R01
 * Version: 2.6.125
 */

const InitialQuestionnaire = (() => {
  'use strict';

  const PUBLIC_PATH = 'cuestionario_inicial';
  const SUPPORT_EMAIL = 'censoescuelaspy@gmail.com';
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
  const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

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
            ${_field('codigo_local', 'Codigo de local', params.codigo_local || params.codigo || '', 'text', 'Opcional si no lo tiene a mano')}
            ${_field('nombre_escuela', 'Nombre de la escuela', params.nombre || params.escuela || '', 'text', 'Nombre oficial o conocido', true)}
            ${_field('departamento', 'Departamento', params.departamento || '')}
            ${_field('distrito', 'Distrito', params.distrito || '')}
            ${_field('localidad', 'Localidad / compania / barrio', params.localidad || '')}
            ${_field('director_nombre', 'Nombre de quien responde', params.director || '', 'text', 'Director/a o responsable', true)}
            ${_field('director_correo', 'Correo de contacto', params.correo || params.email || '', 'email', 'correo@ejemplo.com')}
            ${_field('director_celular', 'Celular de contacto', params.celular || '', 'tel', 'Ej.: 09xx xxx xxx')}
          </div>
        `)}

        ${_section('agua', 'Servicio de agua', 'Indique si existe abastecimiento de agua y de donde proviene principalmente.', `
          ${_yesNo('agua_tiene', 'El local escolar cuenta con servicio de abastecimiento de agua?', true)}
          ${_checkboxGrid('agua_fuentes', WATER_SOURCES)}
          <div class="initial-grid initial-grid--compact">
            ${_field('bomba_hp', 'Potencia de bomba, si corresponde', '', 'text', 'Ej.: 1 HP, 2 HP')}
            ${_textarea('agua_observacion', 'Observacion sobre agua', 'Cortes frecuentes, baja presion, tanque, necesidad de reparacion, etc.')}
          </div>
        `)}

        ${_section('sanitario', 'Servicio sanitario', 'Datos generales sobre banos y sistema de desague.', `
          ${_yesNo('bano_tiene', 'El local escolar cuenta con bano?', true)}
          ${_radioGrid('desague_tipo', DRAINS, 'Tipo principal de desague o disposicion sanitaria')}
          ${_textarea('sanitario_observacion', 'Observacion sobre sanitarios', 'Estado general, banos clausurados, falta de agua, accesibilidad, etc.')}
        `)}

        ${_section('internet', 'Internet y conectividad', 'Ayuda a prever si el equipo de campo podra sincronizar datos durante la visita.', `
          ${_yesNo('internet_tiene', 'La escuela cuenta con Internet?', true)}
          ${_checkboxGrid('internet_tipo', INTERNET_TYPES)}
          ${_radioGrid('internet_calidad', INTERNET_QUALITY, 'Calidad de la senal durante la ultima semana')}
          ${_textarea('internet_observacion', 'Observacion sobre conectividad', 'Proveedor, zonas sin senal, contrasena disponible para la visita, etc.')}
        `)}

        ${_section('seguridad', 'CCTV y prevencion contra incendios', 'Informacion basica para orientar la verificacion de seguridad del local.', `
          ${_yesNo('cctv_tiene', 'Cuenta con sistema de vigilancia CCTV?', false)}
          <div class="initial-grid initial-grid--compact">
            ${_field('cctv_funcionando', 'Cantidad de camaras en funcionamiento', '', 'number', '0')}
            ${_field('cctv_danadas', 'Cantidad de camaras danadas', '', 'number', '0')}
          </div>
          <div class="initial-fire-grid">
            ${FIRE_ITEMS.map(([key, label]) => _fireItem(key, label)).join('')}
          </div>
          <div class="initial-grid initial-grid--compact">
            ${_field('motobomba_hp', 'Motobomba HP, si existe', '', 'text', 'Ej.: 3 HP')}
            ${_field('reserva_tanque_litros', 'Reserva de tanque contra incendio (litros)', '', 'number', 'Ej.: 5000')}
          </div>
        `)}

        ${_section('electricidad', 'Instalacion electrica', 'Datos de provision y continuidad del servicio electrico.', `
          ${_yesNo('energia_tiene', 'Cuenta con energia electrica?', true)}
          ${_radioGrid('energia_proveedor', ENERGY_PROVIDERS, 'Proveedor principal de energia')}
          ${_radioGrid('energia_cortes', ENERGY_CUTS, 'Frecuencia de cortes durante el ultimo ano')}
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
        <input type="hidden" name="id_escuela" value="${_escape(params.id_escuela || '')}" />
        <input type="hidden" name="app_version" value="${_escape((window.APP_CONFIG && APP_CONFIG.VERSION) || '2.6.125')}" />

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
      <div class="initial-question">
        <div class="initial-question__label">${label}</div>
        <div class="initial-option-grid">${options.map(opt => _radioChoice(name, opt, false)).join('')}</div>
      </div>`;
  }

  function _checkboxGrid(name, options) {
    return `
      <div class="initial-option-grid initial-option-grid--check">
        ${options.map(opt => `
          <label class="initial-choice">
            <input type="checkbox" name="${name}" value="${_escape(opt)}" />
            <span>${_escape(opt)}</span>
          </label>`).join('')}
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
    });

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

    setTimeout(() => _refreshChoiceState(form), 0);
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
    return payload;
  }

  async function _publicApi(action, data) {
    if (!window.APP_CONFIG || !APP_CONFIG.GAS_URL) {
      return { status: 'ok', data: { id_respuesta: `R01_DEMO_${Date.now()}` }, demo: true };
    }
    const response = await fetch(APP_CONFIG.GAS_URL, {
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
