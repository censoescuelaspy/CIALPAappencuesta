/**
 * CIALPA — Relevamiento Escolar
 * auth.gs — Authentication service
 * Version: 2.6.79
 */

const AuthService = (() => {

  const TOKEN_EXPIRY_HOURS = 8;

  // ── Password hashing ────────────────────────────────────────────────────

  function _hashPassword(password) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password,
      Utilities.Charset.UTF_8
    );
    return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  }

  function _generateToken(usuario, rol) {
    const raw = `${usuario}:${rol}:${Date.now()}:${Utilities.getUuid()}:${Utilities.getUuid()}`;
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw,
      Utilities.Charset.UTF_8
    );
    return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  }

  // ── Login ────────────────────────────────────────────────────────────────

  function login(params) {
    const usuario = _normalizeUsuario(params.usuario);
    const { password } = params;

    if (!usuario || !password) {
      return { status: 'error', message: 'Usuario y contraseña son requeridos.' };
    }

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    let user = usuarios.find(u => _normalizeUsuario(u.usuario) === usuario);

    if (!user) {
      const created = _activateFromEncuestador(usuario, password);
      if (created.status !== 'ok') {
        AuditService.log('LOGIN_FALLIDO', usuario, created.message || 'Usuario no encontrado');
        return created;
      }
      user = created.user;
    }

    if (String(user.activo).toLowerCase() !== 'true') {
      AuditService.log('LOGIN_FALLIDO', usuario, 'Usuario inactivo');
      return { status: 'error', message: 'Tu cuenta está desactivada. Contactá al administrador.' };
    }

    const passwordHash = _hashPassword(password);
    if (!String(user.password_hash || '').trim()) {
      if (!_isSixDigitPassword(password)) {
        AuditService.log('LOGIN_FALLIDO', usuario, 'Primer acceso con contraseña inválida');
        return { status: 'error', message: 'Primer acceso: use una contraseña numérica de 6 dígitos.' };
      }
      _setInitialPassword(user.id_usuario, passwordHash);
      user.password_hash = passwordHash;
      AuditService.log('PASSWORD_INICIAL', usuario, 'Contraseña inicial configurada por el usuario.');
    }

    if (user.password_hash !== passwordHash) {
      AuditService.log('LOGIN_FALLIDO', usuario, 'Contraseña incorrecta');
      return { status: 'error', message: 'Credenciales inválidas.' };
    }

    // Generate token
    const token = _generateToken(user.usuario, user.rol);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

    // Store token and update last access
    _updateUserToken(user.id_usuario, token, expiry);

    AuditService.log('LOGIN', usuario, `Inicio de sesión exitoso. Rol: ${user.rol}`);

    return {
      status: 'ok',
      data: {
        token,
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        expiry: expiry.toISOString(),
      },
    };
  }

  function registrarUsuario(params) {
    const usuario = _normalizeUsuario(params.usuario);
    const password = String(params.password || '').trim();
    const nombres = _cleanText(params.nombres);
    const apellidos = _cleanText(params.apellidos);
    const documento = _cleanText(params.documento);
    const telefono = _cleanText(params.telefono);
    const correo = _normalizeCorreo(params.correo);

    if (!usuario || !password || !nombres || !apellidos) {
      return { status: 'error', message: 'Usuario, nombres, apellidos y contraseña son requeridos.' };
    }
    if (!_isValidUsername(usuario)) {
      return { status: 'error', message: 'El usuario debe tener 3 a 60 caracteres y usar solo letras, números, punto, guion o guion bajo.' };
    }
    if (!_isAcceptablePassword(password)) {
      return { status: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (!correo && !documento) {
      return { status: 'error', message: 'Cargue correo o documento para poder recuperar la contraseña si hace falta.' };
    }

    _ensureUserColumns();
    _ensureEncuestadorColumns();

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    if (usuarios.some(u => _normalizeUsuario(u.usuario) === usuario)) {
      return { status: 'error', message: 'Ya existe un usuario con ese nombre.' };
    }
    const encuestadores = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    if (encuestadores.some(e => _normalizeUsuario(e.usuario || _usuarioFromName(e.nombres, e.apellidos)) === usuario)) {
      return { status: 'error', message: 'Ya existe un encuestador con ese usuario.' };
    }
    if (correo && encuestadores.some(e => _normalizeCorreo(e.correo) === correo)) {
      return { status: 'error', message: 'Ya existe un encuestador registrado con ese correo.' };
    }
    if (_digits(documento) && encuestadores.some(e => _digits(e.documento) === _digits(documento))) {
      return { status: 'error', message: 'Ya existe un encuestador registrado con ese documento.' };
    }

    const userId = _genId('USR');
    const encId = _genId('ENC');
    const base = {
      usuario,
      nombres,
      apellidos,
      documento,
      telefono,
      correo,
      rol: 'encuestador',
      activo: 'true',
    };

    _appendObject(SHEET_NAMES.USUARIOS, _userHeaders(), {
      id_usuario: userId,
      ...base,
      password_hash: _hashPassword(password),
      fecha_alta: _today(),
      ultimo_acceso: '',
      token_actual: '',
      token_expiry: '',
    });
    _appendObject(SHEET_NAMES.ENCUESTADORES, _encuestadorHeaders(), {
      id_encuestador: encId,
      ...base,
      zona_asignada: '',
      foto_url: '',
      fecha_alta: _today(),
      fecha_actualizacion: _today(),
    });

    AuditService.log('USUARIO_REGISTRADO', usuario, 'Alta publica de usuario encuestador sin escuelas asignadas.');
    const emailStatus = _sendAdminNotificationEmail_(
      `CIALPA - nuevo usuario registrado: ${usuario}`,
      `
        <p>Se registro un nuevo usuario en CIALPA.</p>
        <ul>
          <li><b>Usuario:</b> ${_htmlEscape_(usuario)}</li>
          <li><b>Nombre:</b> ${_htmlEscape_(`${nombres} ${apellidos}`.trim())}</li>
          <li><b>Documento:</b> ${_htmlEscape_(documento || '-')}</li>
          <li><b>Telefono:</b> ${_htmlEscape_(telefono || '-')}</li>
          <li><b>Correo:</b> ${_htmlEscape_(correo || '-')}</li>
          <li><b>Fecha:</b> ${_htmlEscape_(_timestamp())}</li>
        </ul>
        <p>Revise la nomina de encuestadores y asigne escuelas cuando corresponda.</p>
      `,
      `Nuevo usuario CIALPA: ${usuario} - ${nombres} ${apellidos}. Revise la nomina de encuestadores.`
    );
    return {
      status: 'ok',
      message: 'Usuario creado. El administrador podrá asignarle escuelas desde Configuración.',
      data: { id_usuario: userId, id_encuestador: encId, usuario, rol: 'encuestador', email_status: emailStatus },
    };
  }

  function recuperarPassword(params) {
    const usuario = _normalizeUsuario(params.usuario);
    const password = String(params.password || params.new_password || '').trim();
    const documento = _cleanText(params.documento);
    const correo = _normalizeCorreo(params.correo);

    if (!usuario || !password) {
      return { status: 'error', message: 'Usuario y nueva contraseña son requeridos.' };
    }
    if (!_isAcceptablePassword(password)) {
      return { status: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (!correo && !documento) {
      return { status: 'error', message: 'Ingrese el correo o documento registrado para validar la recuperación.' };
    }

    _ensureUserColumns();
    _ensureEncuestadorColumns();

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    const encuestadores = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    const user = usuarios.find(u => _normalizeUsuario(u.usuario) === usuario);
    const enc = encuestadores.find(e => _normalizeUsuario(e.usuario || _usuarioFromName(e.nombres, e.apellidos)) === usuario);

    if (!user && !enc) {
      AuditService.log('PASSWORD_RECOVERY_FAIL', usuario, 'Usuario no encontrado.');
      return { status: 'error', message: 'No pudimos validar esos datos. Revise usuario, correo o documento.' };
    }
    if (_isInactive(user) || _isInactive(enc)) {
      return { status: 'error', message: 'La cuenta está inactiva. Contacte al administrador.' };
    }

    if (!_matchesRecoveryContact({ user, enc, correo, documento })) {
      AuditService.log('PASSWORD_RECOVERY_FAIL', usuario, 'Datos de recuperacion no coinciden.');
      return { status: 'error', message: 'No pudimos validar esos datos. Revise usuario, correo o documento.' };
    }

    if (user) {
      _setUserPassword(user.id_usuario, _hashPassword(password));
    } else {
      _appendObject(SHEET_NAMES.USUARIOS, _userHeaders(), {
        id_usuario: _genId('USR'),
        usuario,
        password_hash: _hashPassword(password),
        nombres: enc.nombres || '',
        apellidos: enc.apellidos || '',
        rol: enc.rol || 'encuestador',
        activo: 'true',
        fecha_alta: _today(),
        ultimo_acceso: '',
        token_actual: '',
        token_expiry: '',
        documento: enc.documento || '',
        telefono: enc.telefono || '',
        correo: enc.correo || '',
      });
    }

    AuditService.log('PASSWORD_RECOVERY', usuario, 'Contraseña actualizada por recuperación validada.');
    return { status: 'ok', message: 'Contraseña actualizada. Ya puede iniciar sesión.' };
  }

  function _normalizeUsuario(usuario) {
    return String(usuario || '').trim().toLowerCase();
  }

  function _cleanText(value) {
    return String(value || '').trim();
  }

  function _normalizeCorreo(value) {
    return String(value || '').trim().toLowerCase();
  }

  function _digits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function _isValidUsername(usuario) {
    return /^[a-z0-9._-]{3,60}$/.test(String(usuario || ''));
  }

  function _isAcceptablePassword(password) {
    const value = String(password || '');
    return value.length >= 6 && value.length <= 128;
  }

  function _isInactive(row) {
    if (!row) return false;
    const value = String(row.activo ?? '').toLowerCase();
    return ['false', '0', 'no', 'inactivo'].includes(value);
  }

  function _matchesRecoveryContact({ user, enc, correo, documento }) {
    const emails = [user && user.correo, enc && enc.correo].map(_normalizeCorreo).filter(Boolean);
    const docs = [user && user.documento, enc && enc.documento].map(_digits).filter(Boolean);
    const emailOk = correo && emails.includes(correo);
    const doc = _digits(documento);
    const docOk = doc && docs.includes(doc);
    return Boolean(emailOk || docOk);
  }

  function _isSixDigitPassword(password) {
    return /^\d{6}$/.test(String(password || ''));
  }

  function _activateFromEncuestador(usuario, password) {
    if (!_isSixDigitPassword(password)) {
      return { status: 'error', message: 'Primer acceso: use usuario nombre.apellido y una contraseña numérica de 6 dígitos.' };
    }

    const encuestadores = _sheetToObjects(SHEET_NAMES.ENCUESTADORES);
    const enc = encuestadores.find(e =>
      String(e.activo).toLowerCase() !== 'false' &&
      _normalizeUsuario(e.usuario || _usuarioFromName(e.nombres, e.apellidos)) === usuario
    );

    if (!enc) return { status: 'error', message: 'Usuario no encontrado. Verifique el formato nombre.apellido o contacte al administrador.' };

    _ensureUserColumns();
    const sheet = _getSheet(SHEET_NAMES.USUARIOS);
    const id = _genId('USR');
    const user = {
      id_usuario: id,
      usuario,
      password_hash: _hashPassword(password),
      nombres: enc.nombres || '',
      apellidos: enc.apellidos || '',
      rol: enc.rol || 'encuestador',
      activo: 'true',
      fecha_alta: _today(),
      ultimo_acceso: '',
      token_actual: '',
      token_expiry: '',
    };
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    sheet.appendRow(headers.map(h => user[h] !== undefined ? user[h] : ''));
    AuditService.log('USUARIO_ACTIVADO', usuario, 'Usuario creado desde encuestadores en primer acceso.');
    return { status: 'ok', user };
  }

  function _usuarioFromName(nombres, apellidos) {
    const first = String(nombres || '').trim().split(/\s+/)[0] || '';
    const last = String(apellidos || '').trim().split(/\s+/)[0] || '';
    return `${first}.${last}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function _setInitialPassword(id_usuario, passwordHash) {
    _ensureUserColumns();
    const sheet = _getSheet(SHEET_NAMES.USUARIOS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idCol = headers.indexOf('id_usuario');
    const passCol = headers.indexOf('password_hash');
    if (idCol === -1 || passCol === -1) return;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id_usuario)) {
        sheet.getRange(i + 1, passCol + 1).setValue(passwordHash);
        break;
      }
    }
  }

  function _ensureUserColumns() {
    _ensureColumns(SHEET_NAMES.USUARIOS, _userHeaders());
  }

  function _ensureEncuestadorColumns() {
    _ensureColumns(SHEET_NAMES.ENCUESTADORES, _encuestadorHeaders());
  }

  function _userHeaders() {
    return ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual','token_expiry','documento','telefono','correo'];
  }

  function _encuestadorHeaders() {
    return ['id_encuestador','usuario','nombres','apellidos','documento','telefono','correo','zona_asignada','rol','foto_url','activo','fecha_alta','fecha_actualizacion'];
  }

  function _ensureColumns(sheetName, expected) {
    const ss = _getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getLastRow()
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim())
      : [];
    if (!headers.length || headers.every(h => !h)) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
      sheet.setFrozenRows(1);
      return;
    }
    expected.forEach(header => {
      if (!headers.includes(header)) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    });
  }

  function _headers(sheet) {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  }

  function _appendObject(sheetName, headers, obj) {
    _ensureColumns(sheetName, headers);
    const sheet = _getSpreadsheet().getSheetByName(sheetName);
    const currentHeaders = _headers(sheet);
    sheet.appendRow(currentHeaders.map(h => obj[h] !== undefined ? obj[h] : ''));
  }

  function _setByHeader(sheet, rowIdx, headers, col, value) {
    const idx = headers.indexOf(col);
    if (idx !== -1) sheet.getRange(rowIdx, idx + 1).setValue(value);
  }

  function _setUserPassword(idUsuario, passwordHash) {
    const rowIdx = _findRowIndex(SHEET_NAMES.USUARIOS, 'id_usuario', idUsuario);
    if (rowIdx === -1) return;
    const sheet = _getSpreadsheet().getSheetByName(SHEET_NAMES.USUARIOS);
    const headers = _headers(sheet);
    _setByHeader(sheet, rowIdx, headers, 'password_hash', passwordHash);
    _setByHeader(sheet, rowIdx, headers, 'token_actual', '');
    _setByHeader(sheet, rowIdx, headers, 'token_expiry', '');
  }

  function _updateUserToken(id_usuario, token, expiry) {
    const sheet = _getSheet(SHEET_NAMES.USUARIOS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    const idCol = headers.indexOf('id_usuario');
    const tokenCol = headers.indexOf('token_actual');
    const accessCol = headers.indexOf('ultimo_acceso');
    const expiryCol = headers.indexOf('token_expiry');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id_usuario)) {
        if (tokenCol !== -1) sheet.getRange(i + 1, tokenCol + 1).setValue(token);
        if (accessCol !== -1) sheet.getRange(i + 1, accessCol + 1).setValue(_timestamp());
        if (expiryCol !== -1) sheet.getRange(i + 1, expiryCol + 1).setValue(expiry ? expiry.toISOString() : '');
        break;
      }
    }
  }

  // ── Validate token ───────────────────────────────────────────────────────

  function validateToken(token) {
    if (!token) return { valid: false };

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    const user = usuarios.find(u => u.token_actual === token);

    if (!user) return { valid: false };
    if (String(user.activo).toLowerCase() !== 'true') return { valid: false };
    if (user.token_expiry) {
      const expiryTime = new Date(user.token_expiry).getTime();
      if (!isNaN(expiryTime) && Date.now() > expiryTime) return { valid: false };
    }

    return {
      valid: true,
      session: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
      },
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  function logout(token) {
    if (!token) return { status: 'ok' };

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    const user = usuarios.find(u => u.token_actual === token);

    if (user) {
      _updateUserToken(user.id_usuario, '', null);
      AuditService.log('LOGOUT', user.usuario, 'Cierre de sesión');
    }

    return { status: 'ok', message: 'Sesión cerrada.' };
  }

  // ── Hash password helper (for setup) ────────────────────────────────────

  function hashPasswordPublic(password) {
    return { status: 'ok', hash: _hashPassword(password) };
  }

  return { login, registrarUsuario, recuperarPassword, validateToken, logout, hashPasswordPublic, _hashPassword };
})();
