/**
 * CIALPA — Relevamiento Escolar
 * setup.gs — One-time setup functions
 * Version: 2.0.0
 *
 * Run these functions once from the Apps Script editor to initialize the spreadsheet.
 */

/**
 * Run this function ONCE to create all required sheets with correct headers.
 * In the Apps Script editor: Run > setupSheets
 */
function setupSheets() {
  const ss = _getSpreadsheet();
  const sheetsConfig = [
    {
      name: SHEET_NAMES.ESCUELAS,
      headers: [
        'id_escuela', 'codigo_local', 'nombre', 'departamento', 'distrito',
        'localidad', 'zona', 'latitud', 'longitud', 'estado_relevamiento',
        'encuestador_asignado', 'fecha_ultimo_evento', 'observaciones',
      ],
    },
    {
      name: SHEET_NAMES.USUARIOS,
      headers: [
        'id_usuario', 'usuario', 'password_hash', 'nombres', 'apellidos',
        'rol', 'activo', 'fecha_alta', 'ultimo_acceso', 'token_actual',
      ],
    },
    {
      name: SHEET_NAMES.ENCUESTADORES,
      headers: [
        'id_encuestador', 'usuario', 'nombres', 'apellidos', 'documento',
        'telefono', 'correo', 'zona_asignada', 'rol', 'foto_url',
        'activo', 'fecha_alta', 'fecha_actualizacion',
      ],
    },
    {
      name: SHEET_NAMES.SESIONES,
      headers: [
        'id_sesion', 'id_escuela', 'usuario', 'fecha_inicio', 'hora_inicio',
        'fecha_fin', 'hora_fin', 'duracion_minutos', 'estado',
        'observacion_cierre', 'url_formulario_usada',
      ],
    },
    {
      name: SHEET_NAMES.EVENTOS,
      headers: [
        'id_evento', 'id_sesion', 'id_escuela', 'usuario',
        'tipo_evento', 'fecha_hora', 'detalle',
      ],
    },
    {
      name: SHEET_NAMES.INCIDENCIAS,
      headers: [
        'id_incidencia', 'id_escuela', 'usuario', 'fecha_hora',
        'tipo_incidencia', 'descripcion', 'prioridad',
        'estado_resolucion', 'evidencia_url',
      ],
    },
    {
      name: SHEET_NAMES.CONFIG,
      headers: ['clave', 'valor', 'descripcion', 'categoria', 'editable', 'fecha_actualizacion'],
    },
    {
      name: SHEET_NAMES.AUDITORIA,
      headers: ['id_registro', 'usuario', 'accion', 'fecha_hora', 'detalle', 'ip_aproximada'],
    },
    {
      name: SHEET_NAMES.CATALOGOS,
      headers: ['tipo', 'codigo', 'descripcion', 'orden', 'activo'],
    },
  ];

  sheetsConfig.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      Logger.log('Created sheet: ' + cfg.name);
    } else {
      Logger.log('Sheet already exists: ' + cfg.name);
    }
    // Write headers only if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(cfg.headers);
      // Style header row
      const headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
      headerRange.setBackground('#1F3864');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  Logger.log('Setup complete! All sheets created.');
  SpreadsheetApp.getUi().alert('Configuración completada. Todas las hojas fueron creadas.');
}

/**
 * Create the default admin user.
 * Run this ONCE after setupSheets().
 * Default credentials: admin / cialpa2025
 * CHANGE THE PASSWORD AFTER FIRST LOGIN.
 */
function createDefaultAdmin() {
  const password = 'cialpa2025';
  const passwordHash = AuthService._hashPassword(password);
  const id = 'USR_ADMIN_001';

  const sheet = _getSheet(SHEET_NAMES.USUARIOS);

  // Check if already exists
  const existing = _sheetToObjects(SHEET_NAMES.USUARIOS);
  if (existing.some(u => u.usuario === 'admin')) {
    Logger.log('Admin user already exists.');
    SpreadsheetApp.getUi().alert('El usuario admin ya existe.');
    return;
  }

  sheet.appendRow([
    id, 'admin', passwordHash, 'Administrador', 'Sistema',
    'admin', 'true', _today(), '', '',
  ]);

  Logger.log('Admin user created. Usuario: admin | Contraseña: cialpa2025');
  SpreadsheetApp.getUi().alert(
    'Usuario admin creado.\n' +
    'Usuario: admin\n' +
    'Contraseña: cialpa2025\n\n' +
    '¡CAMBIÁ LA CONTRASEÑA INMEDIATAMENTE!'
  );
}

/**
 * Seed default configuration values.
 * Run ONCE after setupSheets().
 */
function seedConfig() {
  const sheet = _getSheet(SHEET_NAMES.CONFIG);
  const existing = _sheetToObjects(SHEET_NAMES.CONFIG);

  const defaults = [
    ['FORM_URL',             'https://demo.mec.gov.py/demo_rue/login',  'URL del formulario MEC',          'sistema',  'true',  ''],
    ['APP_NAME',             'CIALPA — Relevamiento Escolar',            'Nombre de la aplicación',         'sistema',  'false', ''],
    ['SESSION_TIMEOUT_HOURS','8',                                         'Horas de expiración de sesión',   'seguridad','true',  ''],
    ['MAP_CENTER_LAT',       '-23.4',                                     'Latitud centro del mapa',         'mapa',     'true',  ''],
    ['MAP_CENTER_LNG',       '-58.0',                                     'Longitud centro del mapa',        'mapa',     'true',  ''],
    ['MAP_ZOOM',             '7',                                          'Zoom inicial del mapa',           'mapa',     'true',  ''],
    ['CONTACTO_EMAIL',       'soporte@cialpa.gov.py',                     'Email de soporte',                'contacto', 'true',  ''],
    ['CONTACTO_TELEFONO',    '(021) 000-000',                             'Teléfono de soporte',             'contacto', 'true',  ''],
    ['ALLOW_MULTIPLE_SESSIONS','false',                                   'Permitir sesiones múltiples',     'seguridad','true',  ''],
  ];

  defaults.forEach(row => {
    if (!existing.some(c => c.clave === row[0])) {
      sheet.appendRow(row);
      Logger.log('Config seeded: ' + row[0]);
    }
  });

  Logger.log('Config seed complete.');
  SpreadsheetApp.getUi().alert('Configuración inicial cargada.');
}

/**
 * Seed catalog values.
 */
function seedCatalogos() {
  const sheet = _getSheet(SHEET_NAMES.CATALOGOS);
  const existing = _sheetToObjects(SHEET_NAMES.CATALOGOS);

  const defaults = [
    // Zones
    ['zona', 'URB', 'Urbana',        '1', 'true'],
    ['zona', 'RUR', 'Rural',         '2', 'true'],
    ['zona', 'REM', 'Rural Remota',  '3', 'true'],
    // Incidence types
    ['tipo_incidencia', 'CER', 'Escuela cerrada',        '1', 'true'],
    ['tipo_incidencia', 'BLO', 'Acceso bloqueado',       '2', 'true'],
    ['tipo_incidencia', 'DIR', 'Director/a ausente',     '3', 'true'],
    ['tipo_incidencia', 'INC', 'Formulario incompleto',  '4', 'true'],
    ['tipo_incidencia', 'TEC', 'Problema técnico',       '5', 'true'],
    ['tipo_incidencia', 'SEG', 'Seguridad / riesgo',     '6', 'true'],
    ['tipo_incidencia', 'OTR', 'Otra',                   '7', 'true'],
    // Priority
    ['prioridad', 'ALT', 'Alta',   '1', 'true'],
    ['prioridad', 'MED', 'Media',  '2', 'true'],
    ['prioridad', 'BAJ', 'Baja',   '3', 'true'],
    // Roles
    ['rol', 'ADM', 'Administrador', '1', 'true'],
    ['rol', 'SUP', 'Supervisor',    '2', 'true'],
    ['rol', 'ENC', 'Encuestador',   '3', 'true'],
  ];

  defaults.forEach(row => {
    if (!existing.some(c => c.tipo === row[0] && c.codigo === row[1])) {
      sheet.appendRow(row);
    }
  });

  Logger.log('Catalogs seeded.');
  SpreadsheetApp.getUi().alert('Catálogos cargados.');
}

/**
 * Full initialization in one click.
 * Run: initAll()
 */
function initAll() {
  setupSheets();
  createDefaultAdmin();
  seedConfig();
  seedCatalogos();
  Logger.log('Full initialization complete!');
}

/**
 * Utility: hash a password (useful to generate hashes for initial data import).
 * Change the password variable below, then run this function and check the Logs.
 */
function hashPassword() {
  const password = 'YOUR_PASSWORD_HERE';
  const hash = AuthService._hashPassword(password);
  Logger.log('Password: ' + password);
  Logger.log('Hash: ' + hash);
  SpreadsheetApp.getUi().alert('Hash: ' + hash + '\n\nVerificá los Logs para más detalle.');
}
