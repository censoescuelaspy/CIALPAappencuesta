/**
 * CIALPA, Relevamiento Escolar
 * api.js, capa de integración con Google Apps Script
 * Version: 2.6.179
 */

const API = (() => {
  'use strict';

  const _IS_DEMO = !APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL';
  const EXAMPLE_SCHOOL_ID = 'ESC_DEMO_CIALPA';
  const PUBLIC_ACCOUNT_ENDPOINTS = new Set(['registrarUsuario', 'recuperarPassword', 'listarEscuelasCuestionarioInicial', 'guardarCuestionarioInicial', 'guardarCuestionarioInicialAdjunto']);

  function _exampleMecDraft() {
    return {
      __activeModuleId: 'plano',
      __activeBlockId: 'bloque_demo_a',
      __activeFloor: 'Piso 1',
      __activeClassroomId: 'aula_demo_a_1',
      __activeSanitaryId: 'san_demo_a_1',
      __selectedSchool: {
        id_escuela: EXAMPLE_SCHOOL_ID,
        codigo_local: 'DEMO-0001',
        nombre: 'Escuela Ficticia CIALPA - Modelo Integral',
        syncedAt: new Date().toISOString(),
      },
      general: {
        codigo_local: 'DEMO-0001',
        nombre_institucion: 'Escuela Ficticia CIALPA - Modelo Integral',
        departamento: 'Central',
        distrito: 'Luque',
        localidad: 'Ykuakaranday',
        direccion: 'Calle Escuela Modelo y Avenida del Relevamiento',
        director: 'Directora Demo',
        latitud: '-25.2678',
        longitud: '-57.4872',
      },
      bloques: {
        bloque_codigo: 'Bloque 1',
        estado_bloque: 'Operativo',
        cantidad_plantas: '2',
        largo_m: '28',
        ancho_m: '12',
        superficie_m2: '336',
        perimetro_m: '80',
        tipo_circulacion: 'Escalera',
        bloque_observacion: 'Bloque principal de dos pisos, operativo.',
        tablero_estado: 'Bueno',
        acometida_tipo: 'Aerea',
        medidor_estado: 'Propio del bloque',
        llave_termomagnetica: 'Si',
        proteccion_diferencial: 'Si',
        puesta_tierra: 'Si',
        circuitos_identificados: 'Si',
        electricidad_observacion: 'Tablero rotulado y accesible.',
      },
      __blocks: [
        {
          id: 'bloque_demo_a',
          bloque_codigo: 'Bloque 1',
          estado_bloque: 'Operativo',
          cantidad_plantas: '2',
          largo_m: '28',
          ancho_m: '12',
          superficie_m2: '336',
          perimetro_m: '80',
          tipo_circulacion: 'Escalera',
          bloque_observacion: 'Bloque principal de dos pisos.',
          tablero_estado: 'Bueno',
          acometida_tipo: 'Aerea',
          medidor_estado: 'Propio del bloque',
          llave_termomagnetica: 'Si',
          proteccion_diferencial: 'Si',
          puesta_tierra: 'Si',
          circuitos_identificados: 'Si',
        },
        {
          id: 'bloque_demo_b',
          bloque_codigo: 'Bloque 2',
          estado_bloque: 'Operativo',
          cantidad_plantas: '1',
          largo_m: '22',
          ancho_m: '10',
          superficie_m2: '220',
          perimetro_m: '64',
          tipo_circulacion: 'No aplica',
          bloque_observacion: 'Bloque administrativo y aulas iniciales.',
          tablero_estado: 'Regular',
          acometida_tipo: 'Compartida con otro bloque',
          medidor_estado: 'Compartido',
          llave_termomagnetica: 'Si',
          proteccion_diferencial: 'No verificable',
          puesta_tierra: 'No verificable',
          circuitos_identificados: 'Parcialmente',
        },
        {
          id: 'bloque_demo_c',
          bloque_codigo: 'Bloque 3',
          estado_bloque: 'En construccion',
          cantidad_plantas: '1',
          largo_m: '18',
          ancho_m: '9',
          superficie_m2: '162',
          perimetro_m: '54',
          tipo_circulacion: 'No aplica',
          bloque_observacion: 'Sector en construccion, sin uso pedagogico.',
          tablero_estado: 'No existe / no visible',
          acometida_tipo: 'No',
          medidor_estado: 'No existe',
          llave_termomagnetica: 'No',
          proteccion_diferencial: 'No',
          puesta_tierra: 'No verificable',
          circuitos_identificados: 'No',
        },
      ],
      __classrooms: [
        _demoClassroom('aula_demo_a_1', 'bloque_demo_a', 'Piso 1', 'Aula 1', 'Operativa', 7, 5, 74, 96),
        _demoClassroom('aula_demo_a_2', 'bloque_demo_a', 'Piso 1', 'Aula 2', 'Operativa', 7, 5, 258, 96),
        _demoClassroom('aula_demo_a_3', 'bloque_demo_a', 'Piso 2', 'Aula 1', 'Operativa', 7, 5, 74, 96),
        _demoClassroom('aula_demo_a_4', 'bloque_demo_a', 'Piso 2', 'Aula 2', 'Operativa', 7, 5, 258, 96),
        _demoClassroom('aula_demo_b_1', 'bloque_demo_b', 'Piso 1', 'Aula 1', 'Operativa', 6.5, 5, 80, 118),
        _demoClassroom('aula_demo_b_2', 'bloque_demo_b', 'Piso 1', 'Aula 2', 'Operativa', 6.5, 5, 270, 118),
        _demoClassroom('aula_demo_c_1', 'bloque_demo_c', 'Piso 1', 'Aula 1', 'En construccion', 6, 4, 92, 128, true),
      ],
      __classroomSketch: _demoClassroom('aula_demo_a_1', 'bloque_demo_a', 'Piso 1', 'Aula 1', 'Operativa', 7, 5, 74, 96),
      __sanitaries: [
        _demoSanitary('san_demo_a_1', 'Bloque 1', 'Piso 1', 'Sanitario 1', 548, 116, 'Bueno'),
        _demoSanitary('san_demo_a_2', 'Bloque 1', 'Piso 2', 'Sanitario 1', 548, 116, 'Regular'),
        _demoSanitary('san_demo_b_1', 'Bloque 2', 'Piso 1', 'Sanitario 1', 548, 138, 'Bueno'),
        _demoSanitary('san_demo_c_1', 'Bloque 3', 'Piso 1', 'Sanitario 1', 548, 146, 'Fuera de servicio'),
      ],
    };
  }

  function _demoClassroom(id, blockId, floor, name, estado, length, width, x, y, underConstruction = false) {
    return {
      id, blockId, floor, name, estado,
      length: String(length),
      width: String(width),
      openings: underConstruction ? 'Aula en construccion: sin uso, sin mobiliario instalado.' : 'Puerta principal, ventanas laterales, tomas y focos verificados.',
      objects: [
        { id: `${id}_room`, type: 'room', x, y, w: 168, h: 120 },
        { id: `${id}_door`, type: 'door', x: x + 18, y: y + 112, w: 42, h: 8, attached: { side: 'bottom', ratio: .24, offset: 18 }, ficha: { codigo: 'Pta 1', subtipo: 'Con puerta madera', estado: underConstruction ? 'No verificable' : 'Bueno', abre_hacia: 'Interior', bisagra: 'Inicio', observacion: '' } },
        { id: `${id}_win1`, type: 'window', x: x + 42, y, w: 70, h: 8, attached: { side: 'top', ratio: .5, offset: 42 }, ficha: { codigo: 'Vtna 1', subtipo: 'Corrediza', estado: underConstruction ? 'No verificable' : 'Bueno', alto_m: '1.20' } },
        { id: `${id}_board`, type: 'board', x: x + 44, y: y + 18, w: 82, h: 24, ficha: { codigo: 'Piz 1', subtipo: 'Acrilico', estado: underConstruction ? 'No tiene' : 'Bueno', material: 'Mixto' } },
        { id: `${id}_outlet`, type: 'outlet', x: x + 136, y: y + 88, r: 5, ficha: { codigo: 'TC 1', subtipo: 'Doble', estado: underConstruction ? 'No verificable' : 'Bueno', seguridad: 'Seguro', tapa: 'Buena', puesta_tierra: 'Tiene', altura_m: '0.45' } },
        { id: `${id}_light`, type: 'light', x: x + 84, y: y + 62, r: 7, ficha: { codigo: 'Foco 1', subtipo: 'Panel', estado: underConstruction ? 'No verificable' : 'Bueno', funcionamiento: underConstruction ? 'No verificable' : 'Funciona' } },
        ...(underConstruction ? [{ id: `${id}_damage`, type: 'damage', x: x + 134, y: y + 18, w: 24, h: 24, ficha: { codigo: 'Daño', subtipo: 'Instalacion expuesta', estado: 'Moderado', prioridad: 'Media', sector: 'Pared', accion_recomendada: 'Observar', observacion: 'Sector en obra, verificar antes de habilitar.' } }] : []),
      ],
    };
  }

  function _demoSanitary(id, bloque, planta, codigo, x, y, estado) {
    return {
      id, codigo, bloque, planta,
      tipo: 'Bateria sanitaria',
      uso: 'Estudiantes',
      genero: 'Mixto',
      inodoros: '2',
      lavamanos: '1',
      urinarios: '1',
      duchas: '0',
      largo_m: '4.2',
      ancho_m: '2.8',
      accesible: 'Si, parcial',
      agua: estado === 'Fuera de servicio' ? 'No' : 'Si',
      desague: 'Camara septica',
      ventilacion: 'Natural',
      iluminacion: 'Natural',
      estado,
      limpieza: estado === 'Bueno' ? 'Buena' : 'Regular',
      privacidad: 'Adecuada',
      observacion: estado === 'Fuera de servicio' ? 'Sanitario asociado a bloque en construccion.' : 'Sanitario con artefactos cargados para ejemplo.',
      evidencias: [],
      plano: { cabinas: [{ id: `${id}_cab1`, label: 'Cbn 1', artefacto: 'Inodoro', estado }, { id: `${id}_cab2`, label: 'Cbn 2', artefacto: 'Inodoro', estado }] },
      objects: [
        { id: `${id}_room`, type: 'sanitary-room', x, y, w: 126, h: 92 },
        { id: `${id}_door`, type: 'door', x: x + 12, y: y + 84, w: 34, h: 8, attached: { side: 'bottom', ratio: .22, offset: 12 }, ficha: { codigo: 'Pta 1', subtipo: 'Con puerta madera', estado, abre_hacia: 'Exterior', bisagra: 'Inicio' } },
        { id: `${id}_stall1`, type: 'stall', x: x + 10, y: y + 12, w: 46, h: 56, ficha: { codigo: 'Cbn 1', artefacto: 'Inodoro', estado, cabinId: `${id}_cab1`, fixtures: [{ id: 'toilet', estado }, { id: 'cistern_low', estado }, { id: 'paper_holder', estado }] } },
        { id: `${id}_stall2`, type: 'stall', x: x + 62, y: y + 12, w: 46, h: 56, ficha: { codigo: 'Cbn 2', artefacto: 'Inodoro', estado, cabinId: `${id}_cab2`, fixtures: [{ id: 'toilet', estado }, { id: 'cistern_high', estado }, { id: 'paper_holder', estado }] } },
        { id: `${id}_sink`, type: 'sink', x: x + 78, y: y + 72, w: 30, h: 18, ficha: { codigo: 'LV 1', subtipo: 'Lavamanos', estado } },
        { id: `${id}_urinal`, type: 'urinal', x: x + 50, y: y + 72, w: 22, h: 18, ficha: { codigo: 'UR 1', subtipo: 'Urinario', estado } },
      ],
    };
  }

  const _EXAMPLE_SCHOOL = {
    id_escuela: EXAMPLE_SCHOOL_ID,
    codigo_local: 'DEMO-0001',
    nombre: 'Escuela Ficticia CIALPA - Modelo Integral',
    departamento: 'Central',
    distrito: 'Luque',
    localidad: 'Ykuakaranday',
    zona: 'Urbana',
    estado_relevamiento: 'en_curso',
    latitud: -25.2678,
    longitud: -57.4872,
    encuestador_asignado: 'juan.perez',
    supervisor_asignado: 'Supervisor Demo',
    es_ejemplo: true,
    resumen_ejemplo: '3 bloques, Bloque 1 con 2 pisos, sanitarios en cada piso y aula en construccion.',
    mec_draft: _exampleMecDraft(),
  };

  function _withExampleSchool(escuelas = []) {
    const rows = Array.isArray(escuelas) ? escuelas : [];
    return [_EXAMPLE_SCHOOL, ...rows.filter(item => item.id_escuela !== EXAMPLE_SCHOOL_ID && item.codigo_local !== _EXAMPLE_SCHOOL.codigo_local)];
  }

  const _DEMO_USERS = [
    { usuario: 'admin', password: 'admin123', nombres: 'Admin', apellidos: 'Sistema', rol: 'admin', id_usuario: 'u_admin' },
    { usuario: 'diego.meza', password: '', firstAccess: true, nombres: 'Diego', apellidos: 'Meza', rol: 'admin', id_usuario: 'u_diego' },
    { usuario: 'noelia.mendoza', password: '', firstAccess: true, nombres: 'Noelia', apellidos: 'Mendoza', rol: 'admin', id_usuario: 'u_noelia' },
    { usuario: 'latiffi.chelala', password: '', firstAccess: true, nombres: 'Latiffi', apellidos: 'Chelala', rol: 'admin', id_usuario: 'u_latiffi' },
    { usuario: 'juan.perez', password: '', firstAccess: true, nombres: 'Juan', apellidos: 'Pérez', rol: 'encuestador', id_usuario: 'u_enc1' },
    { usuario: 'supervisor', password: 'sup123', nombres: 'María', apellidos: 'González', rol: 'supervisor', id_usuario: 'u_sup1' },
  ];

  const _DEMO_ESCUELAS = [
    _EXAMPLE_SCHOOL,
    { id_escuela: 'ESC_0010046', codigo_local: '0010046', nombre: 'ESCUELA BÁSICA N° 3 REPÚBLICA DEL BRASIL', departamento: 'Capital', distrito: 'Asunción', localidad: 'Asunción', zona: 'Urbana', estado_relevamiento: 'pendiente', latitud: -25.2968, longitud: -57.6309, encuestador_asignado: '', supervisor_asignado: '' },
    { id_escuela: 'ESC_0011004', codigo_local: '0011004', nombre: 'ESCUELA BÁSICA N° 2 CELSA SPERATTI', departamento: 'Capital', distrito: 'Asunción', localidad: 'Asunción', zona: 'Urbana', estado_relevamiento: 'en_curso', latitud: -25.2830, longitud: -57.6350, encuestador_asignado: 'Juan Pérez', supervisor_asignado: 'María González' },
    { id_escuela: 'ESC_0011007', codigo_local: '0011007', nombre: 'COLEGIO NACIONAL DE E.M.D. PRESIDENTE FRANCO', departamento: 'Capital', distrito: 'Asunción', localidad: 'Asunción', zona: 'Urbana', estado_relevamiento: 'finalizada', latitud: -25.2890, longitud: -57.6170, encuestador_asignado: 'Juan Pérez', supervisor_asignado: 'María González' },
    { id_escuela: 'ESC_0012095', codigo_local: '0012095', nombre: 'ESCUELA BÁSICA N° 1 REPÚBLICA ARGENTINA', departamento: 'Capital', distrito: 'Asunción', localidad: 'Asunción', zona: 'Urbana', estado_relevamiento: 'pendiente', latitud: -25.3035, longitud: -57.6380, encuestador_asignado: '', supervisor_asignado: '' },
  ];

  const _DEMO_SESIONES = [];
  const _DEMO_MODULOS = [];

  const _DEMO_STATS = {
    total: 5,
    pendiente: 2,
    en_curso: 2,
    finalizada: 1,
    incidencia: 0,
    porcentaje_avance: 20,
    por_departamento: [{ departamento: 'Central', total: 1, finalizada: 0, en_curso: 1 }, { departamento: 'Capital', total: 4, finalizada: 1, en_curso: 1 }],
    por_zona: [{ zona: 'Urbana', total: 5 }],
    por_encuestador: [
      { encuestador: 'Juan Pérez', asignadas: 2, finalizadas: 1 },
      { encuestador: 'María González', asignadas: 0, finalizadas: 0 },
    ],
    historico: [
      { fecha: '2026-04-27', finalizadas: 0 },
      { fecha: '2026-04-28', finalizadas: 1 },
    ],
    modulos: { total: 0, finalizados: 0, promedio_minutos: 0 },
  };

  const _DEMO_ENCUESTADORES = [
    { id_encuestador: 'u_enc1', nombres: 'Juan', apellidos: 'Pérez', usuario: 'juan.perez', activo: true, zona_asignada: 'Capital', rol: 'encuestador' },
    { id_encuestador: 'u_sup1', nombres: 'María', apellidos: 'González', usuario: 'supervisor', activo: true, zona_asignada: 'Capital', rol: 'supervisor' },
  ];

  const _DEMO_CONFIG = {
    FORM_URL: 'https://demo.mec.gov.py/demo_rue/login',
    FORM_LAUNCH_MODE: 'web',
    FORM_ANDROID_INTENT_URL: '',
    FORM_CUSTOM_SCHEME_URL: '',
    FORM_FALLBACK_SECONDS: '2',
    FINAL_REPORT_EMAIL: 'censoescuelaspy@gmail.com',
    operativo: true,
    fecha_inicio: '2026-04-27',
    fecha_fin: '2026-08-31',
  };
  const _DEMO_INITIAL_CONTACTS = [];
  const _DEMO_INITIAL_RESPONSES = [];
  const _DEMO_APP_FEEDBACK = [];
  const _DEMO_MEC_FORMS = [
    {
      id_borrador: 'MEC-DRAFT-DEMO-0001',
      id_escuela: EXAMPLE_SCHOOL_ID,
      codigo_local: 'DEMO-0001',
      nombre_escuela: _EXAMPLE_SCHOOL.nombre,
      departamento: _EXAMPLE_SCHOOL.departamento,
      distrito: _EXAMPLE_SCHOOL.distrito,
      usuario: 'juan.perez',
      fecha_guardado: '2026-06-08 10:15:00',
      actualizado_en: '2026-06-08 10:15:00',
      estado_borrador: 'en_curso',
      estado_operativo: 'en_curso',
      app_version: '2.6.179',
      schema_version: 'mec_v2',
      bloques: 3,
      pisos: 4,
      aulas: 9,
      otros_espacios: 4,
      sanitarios: 5,
      exteriores: 7,
      evidencias: 6,
      total_elementos: 28,
      tiempo_escuela_min: 72,
      mec_draft: _exampleMecDraft(),
    },
    {
      id_borrador: 'MEC-DRAFT-0011007',
      id_escuela: 'ESC_0011007',
      codigo_local: '0011007',
      nombre_escuela: 'COLEGIO NACIONAL DE E.M.D. PRESIDENTE FRANCO',
      departamento: 'Capital',
      distrito: 'Asuncion',
      usuario: 'juan.perez',
      fecha_guardado: '2026-06-08 12:40:00',
      actualizado_en: '2026-06-08 12:40:00',
      estado_borrador: 'finalizado',
      estado_operativo: 'finalizada',
      app_version: '2.6.179',
      schema_version: 'mec_v2',
      bloques: 2,
      pisos: 2,
      aulas: 6,
      otros_espacios: 3,
      sanitarios: 2,
      exteriores: 5,
      evidencias: 4,
      total_elementos: 18,
      tiempo_escuela_min: 54,
      mec_draft: {
        ..._exampleMecDraft(),
        __selectedSchool: { id_escuela: 'ESC_0011007', codigo_local: '0011007', nombre: 'COLEGIO NACIONAL DE E.M.D. PRESIDENTE FRANCO', syncedAt: '2026-06-08T12:40:00.000Z' },
      },
    },
  ];

  function _demoMecFormForSchool(id) {
    const key = String(id || '');
    return _DEMO_MEC_FORMS.find(row => row.id_escuela === key || row.codigo_local === key || String(row.codigo_local).replace(/\D+/g, '') === key.replace(/\D+/g, '')) || null;
  }

  function _demoCall(endpoint, data) {
    return new Promise(resolve => setTimeout(() => resolve(_demoDispatch(endpoint, data || {})), 180));
  }

  function _demoDispatch(endpoint, data) {
    switch (endpoint) {
      case 'login': {
        const u = _DEMO_USERS.find(x => x.usuario.toLowerCase() === String(data.usuario || '').toLowerCase());
        if (u) {
          if (u.firstAccess) {
            if (!/^\d{6}$/.test(String(data.password || ''))) {
              return { status: 'error', message: 'Primer acceso: use una contraseña numérica de 6 dígitos.' };
            }
            u.password = data.password;
            u.firstAccess = false;
          }
          if (u.password === data.password) {
            const { password: _, firstAccess: __, ...safeUser } = u;
            return { status: 'ok', data: { token: 'demo_' + Date.now(), ...safeUser } };
          }
        }
        return { status: 'error', message: 'Credenciales inválidas. Primer acceso: usuario nombre.apellido y clave numérica de 6 dígitos.' };
      }
      case 'registrarUsuario': {
        const usuario = String(data.usuario || '').trim().toLowerCase();
        if (!usuario || !data.password || !data.nombres || !data.apellidos) {
          return { status: 'error', message: 'Usuario, nombres, apellidos y contrasena son requeridos.' };
        }
        if (!data.correo && !data.documento) {
          return { status: 'error', message: 'Cargue correo o documento para recuperar la contrasena.' };
        }
        if (String(data.password || '').length < 6) {
          return { status: 'error', message: 'La contrasena debe tener al menos 6 caracteres.' };
        }
        if (_DEMO_USERS.some(x => x.usuario.toLowerCase() === usuario)) {
          return { status: 'error', message: 'Ya existe un usuario con ese nombre.' };
        }
        const user = {
          usuario,
          password: String(data.password || ''),
          nombres: String(data.nombres || '').trim(),
          apellidos: String(data.apellidos || '').trim(),
          rol: 'encuestador',
          id_usuario: 'u_demo_' + Date.now(),
        };
        _DEMO_USERS.push(user);
        _DEMO_ENCUESTADORES.push({
          id_encuestador: 'enc_demo_' + Date.now(),
          usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          documento: data.documento || '',
          telefono: data.telefono || '',
          correo: data.correo || '',
          zona_asignada: '',
          rol: 'encuestador',
          activo: true,
          fecha_alta: new Date().toISOString().slice(0, 10),
        });
        return { status: 'ok', message: 'Usuario demo creado.', data: { usuario, rol: 'encuestador' } };
      }
      case 'recuperarPassword': {
        const usuario = String(data.usuario || '').trim().toLowerCase();
        const user = _DEMO_USERS.find(x => x.usuario.toLowerCase() === usuario);
        const enc = _DEMO_ENCUESTADORES.find(x => String(x.usuario || '').toLowerCase() === usuario);
        if (!user || !enc) return { status: 'error', message: 'No pudimos validar esos datos.' };
        if (String(data.password || data.new_password || '').length < 6) {
          return { status: 'error', message: 'La contrasena debe tener al menos 6 caracteres.' };
        }
        const correoOk = data.correo && String(enc.correo || '').toLowerCase() === String(data.correo || '').toLowerCase();
        const docOk = data.documento && String(enc.documento || '').replace(/\D+/g, '') === String(data.documento || '').replace(/\D+/g, '');
        if (!correoOk && !docOk) return { status: 'error', message: 'No pudimos validar esos datos.' };
        user.password = String(data.password || data.new_password || '');
        user.firstAccess = false;
        return { status: 'ok', message: 'Contrasena demo actualizada.' };
      }
      case 'logout': return { status: 'ok' };
      case 'getEscuelas': return { status: 'ok', data: _DEMO_ESCUELAS };
      case 'listarEscuelasCuestionarioInicial': {
        const rows = _DEMO_ESCUELAS.map(({ id_escuela, codigo_local, nombre, departamento, distrito, localidad }) => ({ id_escuela, codigo_local, nombre, departamento, distrito, localidad }));
        const departamentos = [...new Set(rows.map(row => row.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const distritos = [...new Set(rows.map(row => row.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const distritos_por_departamento = {};
        rows.forEach(row => {
          if (!row.departamento || !row.distrito) return;
          if (!distritos_por_departamento[row.departamento]) distritos_por_departamento[row.departamento] = [];
          if (!distritos_por_departamento[row.departamento].includes(row.distrito)) distritos_por_departamento[row.departamento].push(row.distrito);
        });
        Object.keys(distritos_por_departamento).forEach(key => distritos_por_departamento[key].sort((a, b) => a.localeCompare(b)));
        return { status: 'ok', data: rows, meta: { total: rows.length, departamentos, distritos, distritos_por_departamento, source: 'demo' } };
      }
      case 'getEscuela': {
        const school = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.id_escuela) || null;
        if (!school) return { status: 'error', message: 'Escuela demo no encontrada.' };
        const form = _demoMecFormForSchool(data.id_escuela);
        return {
          status: 'ok',
          data: data.includeDraft && form
            ? {
                ...school,
                mec_draft: form.mec_draft,
                mec_draft_id: form.id_borrador,
                mec_draft_status: form.estado_borrador,
                mec_draft_updated_at: form.actualizado_en,
                mec_draft_usuario: form.usuario,
                mec_draft_counts: {
                  bloques: form.bloques,
                  pisos: form.pisos,
                  aulas: form.aulas,
                  otros_espacios: form.otros_espacios,
                  sanitarios: form.sanitarios,
                  exteriores: form.exteriores,
                  evidencias: form.evidencias,
                },
              }
            : school,
        };
      }
      case 'listarFormulariosMec': {
        let rows = _DEMO_MEC_FORMS.map(({ mec_draft, ...row }) => ({ ...row }));
        if (data.usuario) rows = rows.filter(row => String(row.usuario || '').toLowerCase() === String(data.usuario || '').toLowerCase());
        if (data.estado) rows = rows.filter(row => String(row.estado_borrador || '').toLowerCase() === String(data.estado || '').toLowerCase());
        if (data.q) {
          const q = String(data.q || '').toLowerCase();
          rows = rows.filter(row => Object.values(row).join(' ').toLowerCase().includes(q));
        }
        const resumen = rows.reduce((acc, row) => {
          const key = row.usuario || 'sin_usuario';
          if (!acc[key]) acc[key] = { usuario: key, formularios: 0, finalizados: 0, en_curso: 0, elementos: 0, evidencias: 0 };
          acc[key].formularios += 1;
          if (String(row.estado_operativo || row.estado_borrador).toLowerCase().includes('final')) acc[key].finalizados += 1;
          else acc[key].en_curso += 1;
          acc[key].elementos += Number(row.total_elementos || 0);
          acc[key].evidencias += Number(row.evidencias || 0);
          return acc;
        }, {});
        return {
          status: 'ok',
          data: rows,
          meta: {
            total: rows.length,
            usuarios: [...new Set(_DEMO_MEC_FORMS.map(row => row.usuario).filter(Boolean))].sort(),
            estados: [...new Set(_DEMO_MEC_FORMS.map(row => row.estado_borrador).filter(Boolean))].sort(),
            resumen_por_usuario: Object.values(resumen),
          },
        };
      }
      case 'listarPerimetrosMec': {
        const rows = _DEMO_MEC_FORMS
          .map(form => {
            const school = _DEMO_ESCUELAS.find(item => item.id_escuela === form.id_escuela || item.codigo_local === form.codigo_local) || {};
            const lat = Number(school.latitud);
            const lng = Number(school.longitud);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const d = 0.0012;
            return {
              id_borrador: form.id_borrador,
              id_escuela: form.id_escuela,
              codigo_local: form.codigo_local,
              nombre_escuela: form.nombre_escuela,
              departamento: form.departamento,
              distrito: form.distrito,
              localidad: form.localidad,
              usuario: form.usuario,
              estado_borrador: form.estado_borrador,
              actualizado_en: form.actualizado_en,
              vertices: [
                { lat: lat - d, lng: lng - d },
                { lat: lat - d, lng: lng + d },
                { lat: lat + d, lng: lng + d },
                { lat: lat + d, lng: lng - d },
              ],
              vertices_count: 4,
              identity_keys: [form.id_escuela, form.codigo_local].filter(Boolean),
            };
          })
          .filter(Boolean);
        return { status: 'ok', data: rows, meta: { total: rows.length, source: 'demo' } };
      }
      case 'updateEscuelaEstado': {
        const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.id_escuela);
        if (esc) esc.estado_relevamiento = data.estado;
        return { status: 'ok' };
      }
      case 'asignarEscuela': {
        const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.codigo_local);
        if (esc) {
          esc.encuestador_asignado = data.encuestador_asignado || data.encuestador || '';
          esc.usuario_encuestador = data.usuario_encuestador || '';
          esc.id_encuestador = data.id_encuestador || '';
        }
        return { status: 'ok' };
      }
      case 'iniciarSesion': {
        const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.id_escuela) || _DEMO_ESCUELAS[0];
        const now = new Date();
        const ses = { id_sesion: 'SES_DEMO_' + Date.now(), id_escuela: esc.id_escuela, codigo_local: esc.codigo_local, nombre_escuela: esc.nombre, usuario: 'demo', inicio_iso: now.toISOString(), fecha_inicio: now.toISOString().slice(0, 10), hora_inicio: now.toTimeString().slice(0, 8), estado: 'en_curso', url_formulario_usada: _DEMO_CONFIG.FORM_URL, launch_mode: _DEMO_CONFIG.FORM_LAUNCH_MODE, total_modulos: 9, modulos_completados: 0 };
        _DEMO_SESIONES.push(ses);
        esc.estado_relevamiento = 'en_curso';
        return { status: 'ok', data: ses };
      }
      case 'cerrarSesion': {
        const ses = _DEMO_SESIONES.find(s => s.id_sesion === data.id_sesion);
        if (ses) {
          ses.estado = data.estado || 'finalizada';
          ses.fin_iso = new Date().toISOString();
          ses.folio_externo = data.folio_externo || '';
          const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === ses.id_escuela);
          if (esc) esc.estado_relevamiento = ses.estado;
        }
        return { status: 'ok', data: { duracion_minutos: 1, modulos: { total: 9, completados: _DEMO_MODULOS.filter(m => m.id_sesion === data.id_sesion && m.estado === 'finalizado').length } } };
      }
      case 'getSesionesAbiertas': return { status: 'ok', data: _DEMO_SESIONES.filter(s => s.estado === 'en_curso') };
      case 'getMisSesiones': return { status: 'ok', data: _DEMO_SESIONES };
      case 'registrarEventoSesion': return { status: 'ok' };
      case 'iniciarModulo': {
        const mod = { id_modulo: 'MOD_DEMO_' + Date.now(), id_sesion: data.id_sesion, id_escuela: data.id_escuela || '', modulo: data.modulo, modulo_nombre: data.modulo_nombre || data.modulo, orden: data.orden || '', inicio_iso: new Date().toISOString(), estado: 'en_curso' };
        _DEMO_MODULOS.push(mod);
        return { status: 'ok', data: mod };
      }
      case 'cerrarModulo': {
        const mod = _DEMO_MODULOS.find(m => m.id_modulo === data.id_modulo || (m.id_sesion === data.id_sesion && m.modulo === data.modulo && m.estado === 'en_curso'));
        if (mod) {
          mod.estado = data.estado || 'finalizado';
          mod.fin_iso = new Date().toISOString();
          mod.duracion_minutos = 1;
          mod.observacion = data.observacion || '';
        }
        return { status: 'ok', data: mod || null };
      }
      case 'getModulosSesion': return { status: 'ok', data: _DEMO_MODULOS.filter(m => m.id_sesion === data.id_sesion) };
      case 'getStats': return { status: 'ok', data: _DEMO_STATS };
      case 'getResumenOperativo': return { status: 'ok', data: { stats: _DEMO_STATS, sesiones_abiertas: _DEMO_SESIONES.filter(s => s.estado === 'en_curso'), incidencias_abiertas: [] } };
      case 'getEncuestadores': return { status: 'ok', data: _DEMO_ENCUESTADORES };
      case 'saveEncuestador': return { status: 'ok' };
      case 'deleteEncuestador': return { status: 'ok' };
      case 'saveIncidencia': return { status: 'ok', data: { id_incidencia: 'INC_DEMO_' + Date.now() } };
      case 'solicitarRelevamiento': return { status: 'ok', message: 'Solicitud demo enviada al administrador.', data: { id_incidencia: 'SOL_DEMO_' + Date.now(), demo: true } };
      case 'aprobarSolicitudRelevamiento': return { status: 'ok', message: 'Solicitud demo aprobada.', data: { demo: true } };
      case 'uploadEvidence': return {
        status: 'ok',
        data: {
          id: 'DRV_DEMO_' + Date.now(),
          url: APP_CONFIG.EVIDENCE_FOLDER_URL || '',
          name: data.filename || 'evidencia-demo.jpg',
          folderId: APP_CONFIG.EVIDENCE_FOLDER_ID || '',
          subFolderId: APP_CONFIG.EVIDENCE_FOLDER_ID || '',
          uploadedAt: new Date().toISOString(),
          demo: true,
        },
      };
      case 'guardarCuestionarioInicial': {
        const row = { ...data, id_respuesta: data.id_respuesta || 'R01_RESP_DEMO_' + Date.now(), fecha_hora: new Date().toISOString() };
        _DEMO_INITIAL_RESPONSES.push(row);
        return { status: 'ok', message: 'Cuestionario inicial demo guardado.', data: row };
      }
      case 'guardarCuestionarioInicialAdjunto': return {
        status: 'ok',
        message: 'Adjunto demo recibido.',
        data: { id_archivo: 'R01_FILE_DEMO_' + Date.now(), url: APP_CONFIG.EVIDENCE_FOLDER_URL || '', demo: true },
      };
      case 'importarContactosCuestionarioInicial': {
        const contacts = Array.isArray(data.contacts) ? data.contacts : [];
        contacts.forEach(contact => {
          const key = String(contact.codigo_local || contact.correo || '').toLowerCase();
          const existing = _DEMO_INITIAL_CONTACTS.find(c => String(c.codigo_local || c.correo || '').toLowerCase() === key);
          const row = { ...contact, token: contact.token || 'R01_DEMO_' + Math.random().toString(36).slice(2, 10), estado_envio: contact.estado_envio || 'pendiente' };
          if (existing) Object.assign(existing, row);
          else _DEMO_INITIAL_CONTACTS.push(row);
        });
        return { status: 'ok', message: 'Contactos demo importados.', data: { processed: contacts.length, total: _DEMO_INITIAL_CONTACTS.length } };
      }
      case 'listarContactosCuestionarioInicial': return { status: 'ok', data: _DEMO_INITIAL_CONTACTS };
      case 'enviarCuestionarioInicial': {
        const distrito = String(data.distrito || '');
        const limit = parseInt(data.limit || '50', 10) || 50;
        const rows = _DEMO_INITIAL_CONTACTS
          .filter(c => !distrito || String(c.distrito || '') === distrito)
          .filter(c => c.correo)
          .slice(0, limit);
        rows.forEach(c => {
          c.estado_envio = data.dryRun ? 'simulado' : 'enviado';
          c.ultimo_envio = new Date().toISOString();
        });
        return { status: 'ok', message: 'Envio demo procesado.', data: { processed: rows.length, sent: data.dryRun ? 0 : rows.length, dryRun: !!data.dryRun } };
      }
      case 'guardarBorradorMec': return {
        status: 'ok',
        message: 'Borrador MEC demo guardado.',
        data: {
          id_borrador: data.clientMutationId || 'MEC_DRAFT_DEMO_' + Date.now(),
          sheet: 'mec_borradores',
          updatedAt: new Date().toISOString(),
          demo: true,
        },
      };
      case 'guardarCierreCompleto': {
        const esc = _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.codigo_local);
        if (esc) esc.estado_relevamiento = 'finalizada';
        return {
          status: 'ok',
          message: 'Cierre completo demo registrado.',
          data: {
            id_entrega: 'ENT_DEMO_' + Date.now(),
            id_escuela: data.id_escuela || '',
            codigo_local: data.codigo_local || '',
            pdf_url: '',
            metadata_url: '',
            email_status: 'demo',
            destinatario_email: data.destinatario_email || APP_CONFIG.FINAL_REPORT_EMAIL || '',
            demo: true,
          },
        };
      }
      case 'getIncidencias': return { status: 'ok', data: [] };
      case 'resolverIncidencia': return { status: 'ok' };
      case 'saveComentarioApp': {
        const user = Auth.getUserInfo?.() || {};
        const row = {
          ...data,
          id_comentario: data.clientMutationId || 'APPFB_DEMO_' + Date.now(),
          fecha_hora: new Date().toISOString(),
          usuario: user.usuario || 'demo',
          nombre_usuario: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.usuario || 'Usuario demo',
          rol: user.rol || 'demo',
          estado: 'pendiente',
        };
        _DEMO_APP_FEEDBACK.unshift(row);
        return { status: 'ok', message: 'Comentario demo guardado.', data: { id_comentario: row.id_comentario, demo: true } };
      }
      case 'getComentariosApp': {
        let rows = [..._DEMO_APP_FEEDBACK];
        if (data.estado) rows = rows.filter(row => String(row.estado || '') === String(data.estado));
        if (data.prioridad) rows = rows.filter(row => String(row.prioridad || '') === String(data.prioridad));
        return { status: 'ok', data: rows };
      }
      case 'resolverComentarioApp': {
        const row = _DEMO_APP_FEEDBACK.find(item => item.id_comentario === data.id_comentario);
        if (row) {
          row.estado = data.estado || 'resuelto';
          row.respuesta_admin = data.respuesta_admin || data.resolucion || '';
          row.fecha_resolucion = new Date().toISOString();
        }
        return { status: 'ok', message: 'Comentario demo actualizado.' };
      }
      case 'getConfig': return { status: 'ok', data: Object.entries(_DEMO_CONFIG).map(([clave, valor]) => ({ clave, valor, descripcion: 'Parametro demo', editable: 'true' })) };
      case 'setConfig': _DEMO_CONFIG[data.clave] = data.valor; return { status: 'ok' };
      case 'getCatalogos': return { status: 'ok', data: [] };
      case 'getAuditoria': return { status: 'ok', data: [] };
      default: return { status: 'ok', data: null };
    }
  }

  let _loadingCount = 0;

  function _incrementLoading() {
    _loadingCount++;
    UI.setLoading(true);
  }

  function _decrementLoading() {
    _loadingCount = Math.max(0, _loadingCount - 1);
    if (_loadingCount === 0) UI.setLoading(false);
  }

  async function _fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function _offlineGetFallback(endpoint, request = {}) {
    if (typeof CialpaLocalStore === 'undefined') return null;

    if (endpoint === 'getStats') {
      const cachedStats = await CialpaLocalStore.getApi(endpoint, request).catch(() => null);
      const analytics = await CialpaLocalStore.buildLocalAnalytics(cachedStats?.response?.data || null, request).catch(() => null);
      if (!analytics) return null;
      return {
        status: 'ok',
        data: analytics.stats,
        offline: true,
        cachedAt: cachedStats?.savedAt || analytics.schoolsCachedAt || null,
        localAnalytics: analytics,
        message: 'Estadisticas calculadas desde el cache local del dispositivo.',
      };
    }

    const cached = await CialpaLocalStore.getApi(endpoint, request).catch(() => null);
    if (!cached?.response) return null;
    return {
      ...cached.response,
      offline: true,
      cachedAt: cached.savedAt,
      message: cached.response.message || 'Datos cargados desde el cache local del dispositivo.',
    };
  }

  function _textValue(value) {
    return String(value ?? '').trim();
  }

  function _numberValue(value) {
    if (value === null || value === undefined || value === '') return '';
    const normalized = String(value).trim().replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : '';
  }

  function _digitsOnly(value) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  function _parseJsonValue(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch {
      return null;
    }
  }

  function _extractSpreadsheetId() {
    const raw = String(APP_CONFIG.SPREADSHEET_URL || '').trim();
    if (!raw) return '';
    const match = raw.match(/\/spreadsheets\/d\/([^/]+)/);
    return match ? match[1] : raw;
  }

  function _publishedSheetUrl(sheetName, mode, callbackName = '') {
    const spreadsheetId = _extractSpreadsheetId();
    if (!spreadsheetId) return '';
    const params = new URLSearchParams({
      sheet: sheetName,
      headers: '1',
      qa: String(Date.now()),
    });
    if (mode === 'json') {
      params.set('tqx', `out:json;responseHandler:${callbackName}`);
    } else {
      params.set('tqx', 'out:csv');
    }
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params.toString()}`;
  }

  function _parseCsvTable(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const input = String(text || '');
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (quoted) {
        if (ch === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function _rowsFromCsv(text) {
    const table = _parseCsvTable(text);
    const headers = (table.shift() || []).map(_textValue);
    return table
      .filter(row => row.some(value => _textValue(value)))
      .map(row => headers.reduce((obj, header, index) => {
        if (header) obj[header] = row[index] ?? '';
        return obj;
      }, {}));
  }

  function _rowsFromGvizTable(table) {
    const headers = (table?.cols || []).map(col => _textValue(col?.label || col?.id));
    return (table?.rows || [])
      .map(row => headers.reduce((obj, header, index) => {
        if (!header) return obj;
        const cell = row?.c?.[index];
        obj[header] = cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : '';
        return obj;
      }, {}))
      .filter(row => Object.values(row).some(value => _textValue(value)));
  }

  async function _fetchPublishedSheetRows(sheetName) {
    const csvUrl = _publishedSheetUrl(sheetName, 'csv');
    if (csvUrl) {
      try {
        const response = await _fetchWithTimeout(csvUrl, { method: 'GET', redirect: 'follow', cache: 'no-store' }, 75000);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (/^\s*<!doctype html/i.test(text)) throw new Error('La hoja devolvio HTML, no CSV.');
        return _rowsFromCsv(text);
      } catch (err) {
        console.warn('[API] CSV publico de Google Sheets no disponible, se intenta JSONP:', err);
      }
    }
    return _fetchPublishedSheetRowsJsonp(sheetName);
  }

  function _fetchPublishedSheetRowsJsonp(sheetName) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return Promise.reject(new Error('JSONP solo esta disponible en navegador.'));
    }
    return new Promise((resolve, reject) => {
      const callbackName = `__cialpaSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = _publishedSheetUrl(sheetName, 'json', callbackName);
      if (!url) {
        reject(new Error('No hay URL de planilla configurada.'));
        return;
      }
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Tiempo agotado leyendo Google Sheets publicado.'));
      }, 75000);
      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
      window[callbackName] = response => {
        cleanup();
        if (response?.status === 'error') {
          reject(new Error(response?.errors?.[0]?.detailed_message || 'Google Sheets devolvio error.'));
          return;
        }
        resolve(_rowsFromGvizTable(response?.table || {}));
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('No se pudo cargar Google Sheets publicado.'));
      };
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function _mecRowMs(row = {}) {
    const candidates = [row.actualizado_en, row.fecha_guardado, row.creado_en];
    for (const value of candidates) {
      const ms = Date.parse(String(value || ''));
      if (Number.isFinite(ms)) return ms;
    }
    return 0;
  }

  function _mecSchoolKey(row = {}) {
    const ids = [row.id_escuela, row.codigo_local, _digitsOnly(row.id_escuela), _digitsOnly(row.codigo_local)]
      .map(_textValue)
      .filter(Boolean);
    return ids[0] || '';
  }

  function _mecPropertyBoundaryFromDraft(values = {}) {
    const siteElements = Array.isArray(values.__siteElements) ? values.__siteElements : [];
    return siteElements.find(item => _textValue(item?.type) === 'property_boundary') || null;
  }

  function _mecBoundaryVerticesFromItem(item = {}) {
    let vertices = _mecNormalizeBoundaryVertices(item.geoVertices);
    if (vertices.length >= 3) return vertices;
    vertices = _mecNormalizeBoundaryVertices(item.boundaryGeoVertices);
    if (vertices.length >= 3) return vertices;
    const ficha = item.ficha || {};
    vertices = _mecVerticesFromGeoJson(ficha.vertices_geojson || ficha.geojson || ficha.predio_geojson);
    if (vertices.length >= 3) return vertices;
    vertices = _mecVerticesFromLatLonText(ficha.vertices_latlon || ficha.vertices || '');
    return vertices.length >= 3 ? vertices : [];
  }

  function _mecVerticesFromGeoJson(value) {
    const geo = _parseJsonValue(value);
    const ring = geo?.type === 'Feature'
      ? (((geo.geometry || {}).coordinates || [])[0] || [])
      : (((geo || {}).coordinates || [])[0] || []);
    if (!Array.isArray(ring)) return [];
    return _mecNormalizeBoundaryVertices(ring.map(coord => ({ lat: coord?.[1], lng: coord?.[0] })));
  }

  function _mecVerticesFromLatLonText(value) {
    const text = _textValue(value);
    if (!text) return [];
    return _mecNormalizeBoundaryVertices(text.split('|').map(part => {
      const pieces = _textValue(part).split(',').map(_textValue);
      return { lat: pieces[0], lng: pieces[1] };
    }));
  }

  function _mecNormalizeBoundaryVertices(vertices) {
    const rows = (Array.isArray(vertices) ? vertices : []).map(vertex => {
      const lat = Array.isArray(vertex) ? _numberValue(vertex[0]) : _numberValue(vertex?.lat || vertex?.latitude);
      const lng = Array.isArray(vertex) ? _numberValue(vertex[1]) : _numberValue(vertex?.lng || vertex?.lon || vertex?.longitude);
      if (lat === '' || lng === '') return null;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { lat: Math.round(lat * 10000000) / 10000000, lng: Math.round(lng * 10000000) / 10000000 };
    }).filter(Boolean);
    if (rows.length > 1) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (Math.abs(first.lat - last.lat) < 0.0000001 && Math.abs(first.lng - last.lng) < 0.0000001) rows.pop();
    }
    return rows;
  }

  function _mecBoundaryBounds(vertices) {
    const lats = vertices.map(v => Number(v.lat)).filter(Number.isFinite);
    const lngs = vertices.map(v => Number(v.lng)).filter(Number.isFinite);
    if (lats.length < 3 || lngs.length < 3) return null;
    return {
      minLat: Math.round(Math.min(...lats) * 10000000) / 10000000,
      maxLat: Math.round(Math.max(...lats) * 10000000) / 10000000,
      minLng: Math.round(Math.min(...lngs) * 10000000) / 10000000,
      maxLng: Math.round(Math.max(...lngs) * 10000000) / 10000000,
    };
  }

  function _mecPlanBaseMapFromDraft(values = {}) {
    const baseMap = values.__planBaseMap || {};
    const lat = _numberValue(baseMap.lat);
    const lng = _numberValue(baseMap.lng);
    if (lat === '' || lng === '') return null;
    return {
      lat,
      lng,
      zoom: _numberValue(baseMap.zoom),
      scale: _numberValue(baseMap.scale),
      offsetX: _numberValue(baseMap.offsetX),
      offsetY: _numberValue(baseMap.offsetY),
      rotationDeg: _numberValue(baseMap.rotationDeg || baseMap.rotacion_grados),
      source: _textValue(baseMap.source),
      enabled: Boolean(baseMap.enabled),
      confirmed: Boolean(baseMap.confirmed),
      schoolLat: _numberValue(baseMap.schoolLat),
      schoolLng: _numberValue(baseMap.schoolLng),
      schoolCoordinateCorrected: Boolean(baseMap.schoolCoordinateCorrected),
    };
  }

  function _perimeterFromDraftRow(row = {}, index = 0) {
    const draft = _parseJsonValue(row.draft_json) || {};
    const values = draft.values || draft || {};
    const selected = values.__selectedSchool || draft.__selectedSchool || {};
    const boundary = _mecPropertyBoundaryFromDraft(values);
    if (!boundary) return null;
    const vertices = _mecBoundaryVerticesFromItem(boundary);
    if (vertices.length < 3) return null;
    const bounds = _mecBoundaryBounds(vertices);
    const ficha = boundary.ficha || {};
    return {
      id_borrador: _textValue(row.id_borrador),
      id_escuela: _textValue(row.id_escuela || selected.id_escuela),
      codigo_local: _textValue(row.codigo_local || selected.codigo_local),
      nombre_escuela: _textValue(row.nombre_escuela || selected.nombre || selected.nombre_escuela),
      departamento: _textValue(selected.departamento),
      distrito: _textValue(selected.distrito),
      localidad: _textValue(selected.localidad),
      usuario: _textValue(row.usuario),
      fecha_guardado: _textValue(row.fecha_guardado),
      actualizado_en: _textValue(row.actualizado_en || row.fecha_guardado || row.creado_en),
      estado_borrador: _textValue(row.estado_borrador) || 'borrador',
      app_version: _textValue(row.app_version),
      base_mapa_confirmada: _textValue(row.base_mapa_confirmada),
      perimetro_m: _textValue(ficha.perimetro_m || ficha.perimetro || ''),
      superficie_m2: _textValue(ficha.superficie_m2 || ficha.area_m2 || ficha.area || ''),
      vertices,
      vertices_count: vertices.length,
      bounds,
      plan_base_map: _mecPlanBaseMapFromDraft(values),
      centro: bounds ? {
        lat: Math.round(((bounds.minLat + bounds.maxLat) / 2) * 10000000) / 10000000,
        lng: Math.round(((bounds.minLng + bounds.maxLng) / 2) * 10000000) / 10000000,
      } : null,
      identity_keys: [row.id_escuela, row.codigo_local, selected.id_escuela, selected.codigo_local, _digitsOnly(row.id_escuela), _digitsOnly(row.codigo_local)]
        .map(_textValue)
        .filter(Boolean),
      __row_order: index + 2,
    };
  }

  function _filterPerimeters(rows, filters = {}) {
    let data = rows.slice();
    if (filters.usuario) data = data.filter(row => _textValue(row.usuario).toLowerCase() === _textValue(filters.usuario).toLowerCase());
    if (filters.estado) data = data.filter(row => _textValue(row.estado_borrador).toLowerCase() === _textValue(filters.estado).toLowerCase());
    if (filters.q) {
      const q = _textValue(filters.q).toLowerCase();
      data = data.filter(row => [
        row.id_borrador,
        row.id_escuela,
        row.codigo_local,
        row.nombre_escuela,
        row.usuario,
        row.departamento,
        row.distrito,
        row.estado_borrador,
      ].join(' ').toLowerCase().includes(q));
    }
    return data;
  }

  async function _listarPerimetrosMecFromPublishedSheet(filters = {}) {
    const rows = await _fetchPublishedSheetRows('mec_borradores');
    const latest = new Map();
    rows.forEach((row, index) => {
      const perimeter = _perimeterFromDraftRow(row, index);
      if (!perimeter) return;
      const key = _mecSchoolKey(row) || _mecSchoolKey(perimeter) || `draft_${index}`;
      const current = latest.get(key);
      if (!current || _mecRowMs(row) >= _mecRowMs(current.__sourceRow)) {
        latest.set(key, { ...perimeter, __sourceRow: row });
      }
    });
    const data = _filterPerimeters([...latest.values()].map(row => {
      delete row.__sourceRow;
      return row;
    }), filters).sort((a, b) => _mecRowMs(b) - _mecRowMs(a));
    const response = {
      status: 'ok',
      data,
      meta: {
        total: data.length,
        source: 'published_sheet',
        fallback: true,
        sheet: 'mec_borradores',
      },
      message: 'Perimetros cargados desde Google Sheets publicado mientras se corrige el Web App GAS.',
    };
    if (typeof CialpaLocalStore !== 'undefined') {
      CialpaLocalStore.rememberApi('listarPerimetrosMec', 'GET', filters, response).catch(err =>
        console.warn('[API] No se pudo cachear perimetros desde hoja publicada:', err)
      );
    }
    return response;
  }

  function _queueableEndpoint(endpoint) {
    return new Set([
      'updateEscuelaEstado',
      'asignarEscuela',
      'iniciarSesion',
      'cerrarSesion',
      'registrarEventoSesion',
      'iniciarModulo',
      'cerrarModulo',
      'saveIncidencia',
      'saveComentarioApp',
      'solicitarRelevamiento',
      'guardarBorradorMec',
      'guardarCierreCompleto',
      'resolverIncidencia',
    ]).has(endpoint);
  }

  async function _offlinePostQueue(endpoint, method, data, reason) {
    if (method === 'GET' || !_queueableEndpoint(endpoint) || typeof CialpaLocalStore === 'undefined') return null;
    const queued = await CialpaLocalStore.enqueue(endpoint, method, data, reason).catch(() => null);
    if (!queued) return null;
    if (typeof UI !== 'undefined') {
      UI.showToast('Sin conexion: el registro quedo en cola local para sincronizar.', 'warning', 6500);
    }
    return {
      status: 'ok',
      queued: true,
      data: _queuedResponseData(endpoint, queued.data || data, queued),
      message: 'Operacion guardada localmente; queda pendiente de sincronizacion.',
    };
  }

  function _queuedResponseData(endpoint, data, queued) {
    const now = new Date();
    const iso = now.toISOString();
    const time = now.toTimeString().slice(0, 8);
    if (endpoint === 'iniciarSesion') {
      return {
        id_sesion: queued.id,
        id_escuela: data.id_escuela || '',
        inicio_iso: iso,
        fecha_inicio: iso.slice(0, 10),
        hora_inicio: time,
        estado: 'en_curso',
        url_formulario_usada: data.launch_url || APP_CONFIG.FORM_URL,
        launch_mode: data.launch_mode || 'offline',
        total_modulos: 9,
        modulos_completados: 0,
        offline: true,
      };
    }
    if (endpoint === 'iniciarModulo') {
      return {
        id_modulo: queued.id,
        id_sesion: data.id_sesion || '',
        id_escuela: data.id_escuela || '',
        modulo: data.modulo || '',
        modulo_nombre: data.modulo_nombre || data.modulo || '',
        orden: data.orden || '',
        inicio_iso: iso,
        estado: 'en_curso',
        offline: true,
      };
    }
    if (endpoint === 'cerrarModulo') {
      return { ...data, fin_iso: iso, duracion_minutos: data.duracion_minutos || 0, offline: true };
    }
    if (endpoint === 'cerrarSesion') {
      return { duracion_minutos: data.duracion_minutos || 0, offline: true };
    }
    if (endpoint === 'saveIncidencia' || endpoint === 'solicitarRelevamiento') return { id_incidencia: data.clientMutationId || queued.id, offline: true };
    if (endpoint === 'saveComentarioApp') return { id_comentario: data.clientMutationId || queued.id, offline: true };
    if (endpoint === 'guardarCierreCompleto') {
      return {
        id_entrega: data.clientMutationId || queued.id,
        id_offline_queue: queued.id,
        email_status: 'pendiente_sincronizacion',
        offline: true,
      };
    }
    if (endpoint === 'guardarBorradorMec') {
      return {
        id_borrador: data.clientMutationId || queued.id,
        id_offline_queue: queued.id,
        sheet: 'mec_borradores',
        updatedAt: iso,
        offline: true,
      };
    }
    return { id_offline_queue: queued.id, offline: true };
  }

  function _isInvalidSessionResponse(json, endpoint, skipAuth) {
    if (skipAuth || endpoint === 'login') return false;
    if (!json || json.status !== 'error') return false;
    const code = String(json.code || '');
    const message = String(json.message || '');
    return code === '401' || /token/i.test(message);
  }

  function _normalizePublicAccountResponse(json, endpoint, skipAuth) {
    if (!skipAuth || !PUBLIC_ACCOUNT_ENDPOINTS.has(endpoint)) return json;
    if (!json || json.status !== 'error') return json;
    const code = String(json.code || '');
    const message = String(json.message || '');
    if (code !== '401' && !/token/i.test(message)) return json;
    const label = endpoint === 'recuperarPassword'
      ? 'La recuperacion de contrasena'
      : endpoint === 'listarEscuelasCuestionarioInicial'
        ? 'La lista publica de escuelas'
        : 'El registro publico de usuarios';
    return {
      ...json,
      backendNeedsPublish: true,
      message: `${label} todavia no esta activo en el servidor publicado. Falta publicar el Web App de Apps Script desde la cuenta propietaria. Mientras tanto, un administrador puede crear o editar la cuenta desde Configuracion > Encuestadores.`,
    };
  }

  function _handleInvalidSession(json) {
    const message = json?.message || 'Sesion vencida. Inicie sesion nuevamente.';
    if (typeof Auth !== 'undefined' && Auth.expireSession) {
      Auth.expireSession('Sesion vencida o invalida. Inicie sesion nuevamente.');
    }
    const error = new Error(message);
    error.invalidSession = true;
    return error;
  }

  function _gasEndpointUrls() {
    return [APP_CONFIG.GAS_URL, APP_CONFIG.GAS_FALLBACK_URL]
      .map(url => String(url || '').trim())
      .filter((url, index, rows) => url && rows.indexOf(url) === index);
  }

  async function _requestGasJson(baseUrl, payload, method, timeoutMs) {
    let url = baseUrl;
    const fetchOptions = { method, redirect: 'follow' };
    if (method === 'GET') {
      const params = new URLSearchParams(payload);
      url = `${baseUrl}?${params.toString()}`;
    } else {
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=UTF-8' };
      fetchOptions.body = JSON.stringify(payload);
    }
    const response = await _fetchWithTimeout(url, fetchOptions, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Respuesta invalida del servidor, no es JSON.');
    }
  }

  async function call(endpoint, method = 'GET', data = {}, options = {}) {
    const { skipAuth = false, skipLoading = false, skipQueue = false, retries = APP_CONFIG.API_RETRY_ATTEMPTS, timeoutMs = APP_CONFIG.API_TIMEOUT_MS } = options;
    if (!skipLoading) _incrementLoading();

    if (_IS_DEMO) {
      const result = await _demoCall(endpoint, data);
      if (!skipLoading) _decrementLoading();
      return result;
    }

    if (method === 'GET' && typeof navigator !== 'undefined' && !navigator.onLine) {
      const fallback = await _offlineGetFallback(endpoint, data);
      if (fallback) {
        if (!skipLoading) _decrementLoading();
        return fallback;
      }
    }

    const token = Auth.getToken ? Auth.getToken() : null;
    const payload = { action: endpoint, ...data };
    if (token && !skipAuth) payload.token = token;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const urls = _gasEndpointUrls();
      for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
        try {
          let json = await _requestGasJson(urls[urlIndex], payload, method, timeoutMs);
          json = _normalizePublicAccountResponse(json, endpoint, skipAuth);
          if (_isInvalidSessionResponse(json, endpoint, skipAuth)) {
            throw _handleInvalidSession(json);
          }
          if (method === 'GET' && typeof CialpaLocalStore !== 'undefined') {
            CialpaLocalStore.rememberApi(endpoint, method, data, json).catch(err =>
              console.warn('[API] No se pudo cachear respuesta local:', err)
            );
          }
          if (!skipLoading) _decrementLoading();
          return json;
        } catch (err) {
          lastError = err;
          if (err?.invalidSession) break;
          if (urlIndex === 0 && urls.length > 1) {
            console.warn(`[API] ${endpoint}: backend primario no disponible, se intenta fallback.`, err.message || err);
          }
        }
      }
      if (lastError?.invalidSession) break;
      if (attempt < retries) await _sleep(APP_CONFIG.API_RETRY_DELAY_MS * attempt);
    }

    if (!skipLoading) _decrementLoading();
    if (lastError?.invalidSession) throw lastError;
    const msg = lastError?.message || 'Error de conexión con el servidor.';

    if (method === 'GET') {
      const fallback = await _offlineGetFallback(endpoint, data);
      if (fallback) return fallback;
    }

    const queued = skipQueue ? null : await _offlinePostQueue(endpoint, method, data, msg);
    if (queued) return queued;

    console.error(`[API] Error en endpoint "${endpoint}":`, lastError);
    throw new Error(msg);
  }

  async function getEscuelas(filters = {}, options = {}) {
    const request = { ...(filters || {}) };
    const { preferCache = false, forceNetwork = false, cacheMaxAgeMs = 15 * 60 * 1000 } = options || {};
    if (preferCache && !forceNetwork && typeof CialpaLocalStore !== 'undefined') {
      const cached = await CialpaLocalStore.getApi('getEscuelas', request).catch(() => null);
      const savedAt = cached?.savedAt ? Date.parse(cached.savedAt) : 0;
      const age = savedAt ? Date.now() - savedAt : 0;
      if (cached?.response?.status === 'ok' && (!savedAt || age <= cacheMaxAgeMs)) {
        const response = {
          ...cached.response,
          cached: true,
          cachedAt: cached.savedAt || '',
          message: cached.response.message || 'Listado cargado desde cache local.',
        };
        if (response.status === 'ok' && request.includeExample) response.data = _withExampleSchool(response.data || []);
        return response;
      }
    }
    const result = await call('getEscuelas', 'GET', request, { skipLoading: true, retries: 1, timeoutMs: 75000 });
    if (result.status === 'ok' && request?.includeExample) result.data = _withExampleSchool(result.data || []);
    return result;
  }
  async function getEscuela(id, options = {}) {
    if (id === EXAMPLE_SCHOOL_ID || id === _EXAMPLE_SCHOOL.codigo_local) return { status: 'ok', data: _EXAMPLE_SCHOOL };
    const request = { id_escuela: id };
    if (options.includeDraft) request.includeDraft = 'true';
    return call('getEscuela', 'GET', request);
  }
  async function updateEscuelaEstado(id, estado, observacion = '') { return call('updateEscuelaEstado', 'POST', { id_escuela: id, estado, observacion }); }
  async function asignarEscuela(datos) { return call('asignarEscuela', 'POST', datos, { skipQueue: true }); }

  async function iniciarSesion(id_escuela, datos = {}) { return call('iniciarSesion', 'POST', { id_escuela, ...datos }); }
  async function cerrarSesion(id_sesion, datos) { return call('cerrarSesion', 'POST', { id_sesion, ...datos }); }
  async function getSesionesAbiertas() { return call('getSesionesAbiertas', 'GET', {}, { skipLoading: true }); }
  async function getMisSesiones() { return call('getMisSesiones', 'GET', {}, { skipLoading: true }); }
  async function registrarEventoSesion(datos) { return call('registrarEventoSesion', 'POST', datos, { skipLoading: true }); }

  async function iniciarModulo(datos) { return call('iniciarModulo', 'POST', datos); }
  async function cerrarModulo(datos) { return call('cerrarModulo', 'POST', datos); }
  async function getModulosSesion(id_sesion) { return call('getModulosSesion', 'GET', { id_sesion }, { skipLoading: true }); }

  async function getEncuestadores(filters = {}) { return call('getEncuestadores', 'GET', filters, { skipLoading: true }); }
  async function registrarUsuario(datos) { return call('registrarUsuario', 'POST', datos, { skipAuth: true }); }
  async function recuperarPassword(datos) { return call('recuperarPassword', 'POST', datos, { skipAuth: true }); }
  async function saveEncuestador(datos) { return call('saveEncuestador', 'POST', datos); }
  async function deleteEncuestador(id) { return call('deleteEncuestador', 'POST', { id_encuestador: id }); }

  async function saveIncidencia(datos) { return call('saveIncidencia', 'POST', datos); }
  async function solicitarRelevamiento(datos) { return call('solicitarRelevamiento', 'POST', datos); }
  async function aprobarSolicitudRelevamiento(datos) { return call('aprobarSolicitudRelevamiento', 'POST', datos); }
  async function saveComentarioApp(datos) { return call('saveComentarioApp', 'POST', datos); }
  async function getComentariosApp(filters = {}) { return call('getComentariosApp', 'GET', filters, { skipLoading: true }); }
  async function resolverComentarioApp(id, estado, respuesta_admin = '') { return call('resolverComentarioApp', 'POST', { id_comentario: id, estado, respuesta_admin }); }
  async function guardarBorradorMec(datos) { return call('guardarBorradorMec', 'POST', datos, { skipLoading: true }); }
  async function listarPerimetrosMec(filters = {}) {
    try {
      const result = await call('listarPerimetrosMec', 'GET', filters, { skipAuth: true, skipLoading: true, retries: 1, timeoutMs: 75000 });
      if (result.status === 'ok' && Array.isArray(result.data)) return result;
      throw new Error(result.message || 'El endpoint de perimetros no devolvio datos validos.');
    } catch (err) {
      console.warn('[API] listarPerimetrosMec via GAS no disponible; se usa hoja publicada:', err);
      return _listarPerimetrosMecFromPublishedSheet(filters);
    }
  }
  async function listarFormulariosMec(filters = {}) { return call('listarFormulariosMec', 'GET', filters, { skipLoading: true }); }
  async function reiniciarRelevamientoEscuela(datos) { return call('reiniciarRelevamientoEscuela', 'POST', datos, { skipLoading: true }); }
  async function guardarCierreCompleto(datos) { return call('guardarCierreCompleto', 'POST', datos); }
  async function uploadEvidence(datos) { return call('uploadEvidence', 'POST', datos, { skipLoading: true, skipQueue: true, retries: 1 }); }
  async function guardarCuestionarioInicial(datos) { return call('guardarCuestionarioInicial', 'POST', datos, { skipAuth: true, skipLoading: true, skipQueue: true, retries: 1 }); }
  async function guardarCuestionarioInicialAdjunto(datos) { return call('guardarCuestionarioInicialAdjunto', 'POST', datos, { skipAuth: true, skipLoading: true, skipQueue: true, retries: 1 }); }
  async function listarEscuelasCuestionarioInicial(filters = {}) { return call('listarEscuelasCuestionarioInicial', 'GET', filters, { skipAuth: true, skipLoading: true, skipQueue: true, retries: 1, timeoutMs: 75000 }); }
  async function importarContactosCuestionarioInicial(datos) { return call('importarContactosCuestionarioInicial', 'POST', datos, { skipQueue: true }); }
  async function listarContactosCuestionarioInicial(filters = {}) { return call('listarContactosCuestionarioInicial', 'GET', filters, { skipLoading: true }); }
  async function enviarCuestionarioInicial(datos) { return call('enviarCuestionarioInicial', 'POST', datos, { skipQueue: true }); }
  async function getIncidencias(filters = {}) { return call('getIncidencias', 'GET', filters, { skipLoading: true }); }
  async function resolverIncidencia(id, resolucion) { return call('resolverIncidencia', 'POST', { id_incidencia: id, resolucion }); }

  async function getConfig() { return call('getConfig', 'GET', {}, { skipLoading: true }); }
  async function setConfig(clave, valor) { return call('setConfig', 'POST', { clave, valor }); }

  async function getStats(filters = {}, options = {}) { return call('getStats', 'GET', filters, { skipLoading: true, ...options }); }
  async function getResumenOperativo(filters = {}) { return call('getResumenOperativo', 'GET', filters, { skipLoading: true }); }
  async function getAuditoria(filters = {}) { return call('getAuditoria', 'GET', filters, { skipLoading: true }); }
  async function getCatalogos(tipo) { return call('getCatalogos', 'GET', { tipo }, { skipLoading: true }); }

  return {
    call,
    getEscuelas,
    getEscuela,
    updateEscuelaEstado,
    asignarEscuela,
    iniciarSesion,
    cerrarSesion,
    getSesionesAbiertas,
    getMisSesiones,
    registrarEventoSesion,
    iniciarModulo,
    cerrarModulo,
    getModulosSesion,
    getEncuestadores,
    registrarUsuario,
    recuperarPassword,
    saveEncuestador,
    deleteEncuestador,
    saveIncidencia,
    solicitarRelevamiento,
    aprobarSolicitudRelevamiento,
    saveComentarioApp,
    getComentariosApp,
    resolverComentarioApp,
    guardarBorradorMec,
    listarPerimetrosMec,
    listarFormulariosMec,
    reiniciarRelevamientoEscuela,
    guardarCierreCompleto,
    uploadEvidence,
    guardarCuestionarioInicial,
    guardarCuestionarioInicialAdjunto,
    listarEscuelasCuestionarioInicial,
    importarContactosCuestionarioInicial,
    listarContactosCuestionarioInicial,
    enviarCuestionarioInicial,
    getIncidencias,
    resolverIncidencia,
    getConfig,
    setConfig,
    getStats,
    getResumenOperativo,
    getAuditoria,
    getCatalogos,
  };
})();
