/**
 * CIALPA — Relevamiento Escolar
 * auth.gs — Authentication service
 * Version: 2.1.0
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
    const raw = `${usuario}:${rol}:${Date.now()}:${Math.random()}`;
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

  function _normalizeUsuario(usuario) {
    return String(usuario || '').trim().toLowerCase();
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
    const sheet = _getSheet(SHEET_NAMES.USUARIOS);
    const expected = ['id_usuario','usuario','password_hash','nombres','apellidos','rol','activo','fecha_alta','ultimo_acceso','token_actual','token_expiry'];
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim()) : [];
    if (!headers.length || headers.every(h => !h)) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
      return;
    }
    expected.forEach(header => {
      if (!headers.includes(header)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      }
    });
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

  return { login, validateToken, logout, hashPasswordPublic, _hashPassword };
})();
