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
    const { usuario, password } = params;

    if (!usuario || !password) {
      return { status: 'error', message: 'Usuario y contraseña son requeridos.' };
    }

    const usuarios = _sheetToObjects(SHEET_NAMES.USUARIOS);
    const user = usuarios.find(u => String(u.usuario).toLowerCase() === String(usuario).toLowerCase());

    if (!user) {
      AuditService.log('LOGIN_FALLIDO', usuario, 'Usuario no encontrado');
      return { status: 'error', message: 'Credenciales inválidas.' };
    }

    if (String(user.activo).toLowerCase() !== 'true') {
      AuditService.log('LOGIN_FALLIDO', usuario, 'Usuario inactivo');
      return { status: 'error', message: 'Tu cuenta está desactivada. Contactá al administrador.' };
    }

    const passwordHash = _hashPassword(password);
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
