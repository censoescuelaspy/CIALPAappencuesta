/**
 * CIALPA, Relevamiento Escolar
 * api.js, capa de integración con Google Apps Script
 * Version: 2.6.78
 */

const API = (() => {
  'use strict';

  const _IS_DEMO = !APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL';
  const EXAMPLE_SCHOOL_ID = 'ESC_DEMO_CIALPA';
  const PUBLIC_ACCOUNT_ENDPOINTS = new Set(['registrarUsuario', 'recuperarPassword']);

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
    FINAL_REPORT_EMAIL: 'censoescuelaspy@gmial.com',
    operativo: true,
    fecha_inicio: '2026-04-27',
    fecha_fin: '2026-08-31',
  };

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
      case 'getEscuela': return { status: 'ok', data: _DEMO_ESCUELAS.find(e => e.id_escuela === data.id_escuela || e.codigo_local === data.id_escuela) || null };
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
      case 'uploadEvidence': return {
        status: 'ok',
        data: {
          id: 'DRV_DEMO_' + Date.now(),
          url: APP_CONFIG.EVIDENCE_FOLDER_URL || '',
          name: data.filename || 'evidencia-demo.jpg',
          folderId: APP_CONFIG.EVIDENCE_FOLDER_ID || '',
          uploadedAt: new Date().toISOString(),
          demo: true,
        },
      };
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
      const analytics = await CialpaLocalStore.buildLocalAnalytics(cachedStats?.response?.data || null).catch(() => null);
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
      try {
        let url = APP_CONFIG.GAS_URL;
        let fetchOptions = { method, redirect: 'follow' };
        if (method === 'GET') {
          const params = new URLSearchParams(payload);
          url = `${APP_CONFIG.GAS_URL}?${params.toString()}`;
        } else {
          fetchOptions.headers = { 'Content-Type': 'text/plain;charset=UTF-8' };
          fetchOptions.body = JSON.stringify(payload);
        }
        const response = await _fetchWithTimeout(url, fetchOptions, timeoutMs);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Respuesta inválida del servidor, no es JSON.');
        }
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
        if (attempt < retries) await _sleep(APP_CONFIG.API_RETRY_DELAY_MS * attempt);
      }
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
  async function getEscuela(id) {
    if (id === EXAMPLE_SCHOOL_ID || id === _EXAMPLE_SCHOOL.codigo_local) return { status: 'ok', data: _EXAMPLE_SCHOOL };
    return call('getEscuela', 'GET', { id_escuela: id });
  }
  async function updateEscuelaEstado(id, estado, observacion = '') { return call('updateEscuelaEstado', 'POST', { id_escuela: id, estado, observacion }); }
  async function asignarEscuela(datos) { return call('asignarEscuela', 'POST', datos); }

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
  async function guardarBorradorMec(datos) { return call('guardarBorradorMec', 'POST', datos, { skipLoading: true }); }
  async function guardarCierreCompleto(datos) { return call('guardarCierreCompleto', 'POST', datos); }
  async function uploadEvidence(datos) { return call('uploadEvidence', 'POST', datos, { skipLoading: true, skipQueue: true, retries: 1 }); }
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
    guardarBorradorMec,
    guardarCierreCompleto,
    uploadEvidence,
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
