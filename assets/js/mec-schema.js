/**
 * CIALPA — Esquema inicial del cuestionario MEC/RUE
 * Fuente: manual/MANUAL_ENCUESTADOR_CIALPA.md y capturas reales del modulo MEC.
 */

const MEC_SCHEMA = {
  version: '0.1.0',
  source: 'manual/MANUAL_ENCUESTADOR_CIALPA.md',
  modules: [
    {
      id: 'general',
      title: 'General',
      description: 'Ubicacion, identificacion, acceso, cercado, areas exteriores, desague pluvial y seguridad.',
      image: 'manual/assets/image3.png',
      sections: [
        {
          id: 'identificacion',
          title: '1 - Coordenadas e identificacion',
          fields: [
            { id: 'latitud', label: 'Latitud', type: 'number', required: true, step: '0.000001', min: -28, max: -19, hint: 'Rango valido para Paraguay: -19 a -28.' },
            { id: 'longitud', label: 'Longitud', type: 'number', required: true, step: '0.000001', min: -63, max: -54, hint: 'Rango valido para Paraguay: -54 a -63.' },
            { id: 'altitud', label: 'Coordenada Z / altitud', type: 'number', step: '0.1', unit: 'm' },
            { id: 'codigo_local', label: 'Codigo de local', type: 'text', required: true },
            { id: 'departamento', label: 'Departamento', type: 'text', required: true },
            { id: 'distrito', label: 'Distrito', type: 'text', required: true },
            { id: 'localidad', label: 'Localidad', type: 'text', required: true },
            { id: 'direccion', label: 'Direccion y numero / referencia', type: 'text', required: true },
            { id: 'director', label: 'Nombre del Director', type: 'text', required: true },
          ],
        },
        {
          id: 'instituciones_acceso',
          title: '2 - Instituciones y via de acceso',
          fields: [
            { id: 'instituciones_asociadas', label: 'Instituciones que comparten el local', type: 'textarea', hint: 'Municipalidad, iglesia, INDI, organizacion comunitaria u otras. Si no aplica, deje Ninguna.' },
            { id: 'via_acceso', label: 'Tipo de via principal de acceso', type: 'radio', required: true, options: ['Asfalto', 'Adoquinado', 'Empedrado', 'Camino de tierra'] },
          ],
        },
        {
          id: 'cercado',
          title: '3 - Cercado perimetral',
          fields: [
            { id: 'cercado_presencia', label: 'Presencia del cercado', type: 'radio', required: true, evidence: true, evidenceLabel: 'Foto del cercado', options: ['Si, completo', 'Si, incompleto', 'No'] },
            { id: 'cercado_tipo', label: 'Tipo de cercado', type: 'checkbox', options: ['Muralla', 'Verjas de hierro', 'Tejido', 'Alambrado'], visibleWhen: { field: 'general.cercado_presencia', not: 'No' } },
            { id: 'cercado_observacion', label: 'Observaciones del cercado', type: 'textarea', visibleWhen: { field: 'general.cercado_presencia', not: 'No' } },
          ],
        },
        {
          id: 'exteriores',
          title: '4 - Areas exteriores',
          fields: [
            { id: 'escenario', label: 'Escenario / tarima exterior', type: 'radio', required: true, options: ['Si', 'No'] },
            { id: 'mastil', label: 'Mastil / plataforma de izamiento', type: 'radio', required: true, options: ['Si', 'No'] },
            { id: 'camineros', label: 'Camineros internos', type: 'radio', required: true, options: ['Si', 'No'] },
            { id: 'rampas_exteriores', label: 'Rampas para personas con discapacidad', type: 'radio', required: true, evidence: true, evidenceLabel: 'Foto de la rampa', options: ['Si, cumple norma INTN', 'Si, no cumple', 'No'] },
            { id: 'desague_pluvial', label: 'Sistema de desague de aguas de lluvia', type: 'radio', required: true, evidence: true, evidenceLabel: 'Foto del desague pluvial', options: ['Si, canalizado', 'Si, cielo abierto', 'No'] },
          ],
        },
        {
          id: 'seguridad',
          title: '5 - Seguridad y emergencia',
          fields: [
            { id: 'cctv_cantidad', label: 'Camaras CCTV instaladas', type: 'number', min: 0, step: 1 },
            { id: 'detectores_cantidad', label: 'Detectores de humo/calor', type: 'number', min: 0, step: 1 },
            { id: 'pulsadores_cantidad', label: 'Pulsadores de emergencia', type: 'number', min: 0, step: 1 },
            { id: 'luces_emergencia_cantidad', label: 'Luces de emergencia', type: 'number', min: 0, step: 1 },
            { id: 'extintores_cantidad', label: 'Extintores contra incendio', type: 'number', min: 0, step: 1, evidence: true, evidenceLabel: 'Foto de extintores visibles' },
            { id: 'sistema_hidraulico', label: 'Sistema hidraulico contra incendio', type: 'radio', options: ['Si', 'No'] },
            { id: 'seguridad_observacion', label: 'Observaciones de seguridad', type: 'textarea' },
          ],
        },
      ],
    },
    {
      id: 'servicios',
      title: 'Servicios',
      description: 'Agua, saneamiento e internet.',
      image: 'manual/assets/image20.png',
      sections: [
        {
          id: 'agua',
          title: '1 - Abastecimiento de agua',
          fields: [
            { id: 'tiene_agua', label: 'El local cuenta con agua', type: 'radio', required: true, options: ['Si', 'No'] },
            { id: 'fuente_agua', label: 'Fuente principal de provision', type: 'select', required: true, evidence: true, evidenceLabel: 'Foto de la fuente o instalacion de agua', visibleWhen: { field: 'servicios.tiene_agua', equals: 'Si' }, options: ['ESSAP', 'Junta de Saneamiento (SENASA)', 'Prestador / red privada o comunitaria', 'Pozo artesiano', 'Pozo con bomba', 'Pozo sin bomba', 'Manantial o naciente', 'Tajamar, rio o arroyo', 'Recoleccion de agua de lluvia', 'Aguatero', 'Otra'] },
            { id: 'bomba_hp', label: 'Potencia de bomba', type: 'number', step: '0.1', unit: 'HP', required: true, visibleWhen: { field: 'servicios.fuente_agua', equals: 'Pozo con bomba' } },
            { id: 'fuente_agua_otra', label: 'Otra fuente de agua', type: 'text', required: true, visibleWhen: { field: 'servicios.fuente_agua', equals: 'Otra' } },
          ],
        },
        {
          id: 'saneamiento',
          title: '2 - Servicio sanitario / desague',
          fields: [
            { id: 'tiene_sanitarios', label: 'El local cuenta con banos o instalaciones sanitarias', type: 'radio', required: true, evidence: true, evidenceLabel: 'Foto general de sanitarios', options: ['Si', 'No'] },
            { id: 'desague_sanitario', label: 'Tipo de desague de las instalaciones sanitarias', type: 'select', required: true, visibleWhen: { field: 'servicios.tiene_sanitarios', equals: 'Si' }, options: ['Red de alcantarillado sanitario', 'Camara septica y pozo ciego', 'Pozo ciego solo', 'Superficie de tierra, zanja, arroyo o rio', 'Letrina ventilada de hoyo seco', 'Letrina comun de hoyo seco', 'Letrina comun sin techo o sin puerta', 'Otro'] },
            { id: 'desague_sanitario_otro', label: 'Otro tipo de desague', type: 'text', required: true, visibleWhen: { field: 'servicios.desague_sanitario', equals: 'Otro' } },
          ],
        },
        {
          id: 'internet',
          title: '3 - Servicio de internet',
          fields: [
            { id: 'tiene_internet', label: 'El local tiene acceso a internet', type: 'radio', required: true, options: ['Si', 'No'] },
            { id: 'tipo_internet', label: 'Tipo de conexion', type: 'select', evidence: true, evidenceLabel: 'Foto del equipo o punto de conexion', visibleWhen: { field: 'servicios.tiene_internet', equals: 'Si' }, options: ['Fibra optica', 'ADSL', 'Movil 4G/3G', 'Satelital', 'Radioenlace', 'Otro'] },
            { id: 'internet_funciona', label: 'La conexion funciona de manera estable', type: 'radio', visibleWhen: { field: 'servicios.tiene_internet', equals: 'Si' }, options: ['Si', 'No', 'Intermitente'] },
            { id: 'internet_observacion', label: 'Observaciones de internet', type: 'textarea', visibleWhen: { field: 'servicios.tiene_internet', equals: 'Si' } },
          ],
        },
      ],
    },
    {
      id: 'electricidad',
      title: 'Electricidad',
      description: 'Tablero, acometida, medidor, protecciones y estado general.',
      sections: [
        {
          id: 'tablero',
          title: '1 - Tablero y protecciones',
          fields: [
            { id: 'tablero_estado', label: 'Estado del tablero electrico principal', type: 'radio', required: true, evidence: true, evidenceLabel: 'Foto obligatoria del tablero electrico', options: ['Bueno', 'Regular', 'Malo', 'No existe / no visible'] },
            { id: 'llave_termomagnetica', label: 'Cuenta con llave termomagnetica', type: 'radio', evidence: true, evidenceLabel: 'Foto de protecciones', options: ['Si', 'No', 'No verificable'] },
            { id: 'electricidad_observacion', label: 'Observaciones electricas', type: 'textarea' },
          ],
        },
      ],
    },
    {
      id: 'bloques',
      title: 'Bloques y Plantas',
      description: 'Registro basico del bloque, cantidad de plantas y circulacion.',
      sections: [
        {
          id: 'bloque_general',
          title: '1 - Identificacion del bloque',
          fields: [
            { id: 'bloque_codigo', label: 'Codigo o nombre del bloque', type: 'text', required: true, hint: 'Ej.: Bloque A, Pabellon norte, Administracion.' },
            { id: 'cantidad_plantas', label: 'Cantidad de plantas', type: 'number', required: true, min: 1, step: 1 },
            { id: 'largo_m', label: 'Largo aproximado del bloque', type: 'number', min: 0, step: '0.1', unit: 'm' },
            { id: 'ancho_m', label: 'Ancho aproximado del bloque', type: 'number', min: 0, step: '0.1', unit: 'm' },
            { id: 'tipo_circulacion', label: 'Circulacion vertical principal', type: 'radio', options: ['Escalera', 'Rampa', 'Ambas', 'No aplica'] },
            { id: 'bloque_observacion', label: 'Observaciones del bloque', type: 'textarea' },
          ],
        },
      ],
    },
    {
      id: 'aulas',
      title: 'Aula',
      description: 'Carga dimensional, evidencias y croquis simple del aula.',
      status: 'development',
      kind: 'classroomSketch',
      sections: [],
    },
    {
      id: 'sanitarios',
      title: 'Sanitarios',
      description: 'Registro repetible de baterias sanitarias, artefactos, accesibilidad, estado y evidencias.',
      status: 'development',
      kind: 'sanitaryList',
      sections: [],
    },
  ],
};
