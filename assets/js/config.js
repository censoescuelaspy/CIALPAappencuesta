/**
 * CIALPA - Relevamiento Escolar
 * config.js - Central application configuration
 * Version: 2.6.193
 */

const APP_CONFIG = {
  // Google Apps Script Web App URL - fill after deploying GAS
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwHnfBVTBDWWiGOL-7GBo8CRDI7O911nEVYHeQSTU6rYIW0sZge4ofkfj8GeIYvgP7zYw/exec',
  GAS_FALLBACK_URL: 'https://script.google.com/macros/s/AKfycbzrXilB80CszA0EDVj-SO7rJ9SmDY1Yg_Ym1qFgKmSdgfftK0uo1uRclsEq4uroSnfSJQ/exec',

  // External survey application defaults. These values can be overridden from Google Sheets CONFIG.
  FORM_URL: 'https://demo.mec.gov.py/demo_rue/login',
  FORM_LAUNCH_MODE: 'web',
  FORM_ANDROID_INTENT_URL: '',
  FORM_CUSTOM_SCHEME_URL: '',
  FORM_FALLBACK_SECONDS: 2,

  // App metadata
  APP_NAME: 'CIALPA - Relevamiento Escolar',
  VERSION: '2.6.193',
  EDITION_LABEL: 'Edicion vigente v2.6.193',
  LOGO_URL: 'assets/img/logo.png',
  PUBLIC_URL: 'https://censoescuelaspy.github.io/CIALPAappencuesta/',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg/edit',
  EVIDENCE_FOLDER_ID: '1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-',
  EVIDENCE_FOLDER_URL: 'https://drive.google.com/drive/folders/1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-?usp=sharing',
  FINAL_REPORT_EMAIL: 'censoescuelaspy@gmail.com',
  DEFAULT_SCHOOL_ESTIMATE_MINUTES: 45,
  DEFAULT_WORKDAY_HOURS: 6,

  // Map defaults (Paraguay center)
  MAP_CENTER: [-23.4, -58.0],
  MAP_ZOOM: 7,
  MAP_MIN_ZOOM: 5,
  MAP_MAX_ZOOM: 21,
  MAP_NATIVE_MAX_ZOOM: 19,

  // Tile layer
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  SATELLITE_TILE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  SATELLITE_ATTRIBUTION: 'Tiles &copy; Esri',
  SATELLITE_MAX_ZOOM: 21,
  SATELLITE_NATIVE_MAX_ZOOM: 18,
  PLAN_BASEMAP_TILE_URL: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  PLAN_BASEMAP_ATTRIBUTION: '&copy; OpenStreetMap contributors, HOT',
  PLAN_BASEMAP_STREET_OVERLAY_TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
  PLAN_BASEMAP_STREET_OVERLAY_ATTRIBUTION: '&copy; OpenStreetMap contributors, &copy; CARTO',
  PLAN_BASEMAP_STREET_OVERLAY_OPACITY: 0.9,
  PLAN_BASEMAP_SATELLITE_TILE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  PLAN_BASEMAP_SATELLITE_ATTRIBUTION: 'Tiles &copy; Esri',
  PLAN_BASEMAP_SATELLITE_MAX_ZOOM: 19,
  GOOGLE_MAP_TILES_API_KEY: 'AIzaSyD_pqMM_Yzp3RyYbp8AnrLsI8PNw8zM35Y',
  GOOGLE_MAP_TILES_ENABLED: false,
  GOOGLE_ROUTES_API_KEY: '',
  MAP_REAL_ROUTES_ENABLED: false,
  PLAN_BASEMAP_GOOGLE_SATELLITE_MAX_ZOOM: 21,
  PLAN_BASEMAP_HIGHRES_MAX_ZOOM: 19,
  // BEGIN CIALPA_HIGHRES_SOURCES
  PLAN_BASEMAP_HIGHRES_SOURCES: {
    '101095': {
      label: 'Imagen local 101095',
      tileUrl: 'assets/imagery/schools/101095/tiles/{z}/{x}/{y}.png',
      attribution: 'Imagen local piloto 101095 / Earth Engine',
      manifestUrl: 'assets/data/highres-school-pilot-isla-tuyu-101095.json',
      status: 'tiles_ready_local_fallback',
      minZoom: 17,
      maxZoom: 19,
    },
  },
  // END CIALPA_HIGHRES_SOURCES
  PLAN_BASEMAP_MAX_ZOOM: 19,
  MAP_TILE_CACHE_NAME: 'cialpa-map-tiles-v2.5.0',
  MAP_TILE_CACHE_LIMIT: 260,
  MAP_CADASTRAL_DOWNLOAD_URL: 'https://www.catastro.gov.py/municipios',
  MAP_CADASTRAL_ACCOUNT_URL: 'https://www.catastro.gov.py/api/v1/public/cuentas',
  MAP_CADASTRAL_FEATURE_INFO_ENABLED: true,
  MAP_CADASTRAL_FEATURE_INFO_MAX: 5,
  MAP_CADASTRAL_CACHE_LIMIT: 1200,
  PLAN_BASEMAP_CADASTRAL_OPACITY: 0.72,
  PLAN_BASEMAP_CADASTRAL_TILE_PIXELS: 512,
  PLAN_BASEMAP_CADASTRAL_TILE_LIMIT: 96,
  MAP_CADASTRAL_LAYERS: [
    {
      id: 'snc_parcelas_activas',
      label: 'Catastro SNC - parcelas registradas',
      type: 'wms',
      url: 'https://www.catastro.gov.py/geoserver/ows',
      layers: 'snc:parcelas_activas',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.68,
      minZoom: 15,
      maxZoom: 21,
      filterableByDepartment: true,
      source: 'Servicio Nacional de Catastro - GeoServer WMS',
      sourceUrl: 'https://www.catastro.gov.py/visor/?snc=geo',
      downloadUrl: 'https://www.catastro.gov.py/municipios',
      crs: 'EPSG:3857 para visualizacion Leaflet; fuente oficial publicada tambien en EPSG:32721',
    },
  ],

  // Session
  SESSION_KEY: 'cialpa_session',
  SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 hours

  // API retry config
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY_MS: 1000,
  API_TIMEOUT_MS: 30000,

  // Roles
  ROLES: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    ENCUESTADOR: 'encuestador',
  },

  // Usuarios con permisos administrativos reales. El rol admin en la hoja
  // debe existir, pero la UI restringe herramientas sensibles a esta lista.
  ADMIN_USERS: ['diego.meza', 'noelia.mendoza', 'latiffi.chelala'],

  // Survey states
  STATES: {
    PENDIENTE: 'pendiente',
    EN_CURSO: 'en_curso',
    FINALIZADA: 'finalizada',
    INCIDENCIA: 'incidencia',
    PARCIAL: 'parcial',
    SUSPENDIDA: 'suspendida',
    REVISAR: 'revisar',
  },

  // State colors (matches CSS variables)
  STATE_COLORS: {
    pendiente: '#6c757d',
    en_curso: '#fd7e14',
    finalizada: '#28a745',
    incidencia: '#dc3545',
    parcial: '#0d6efd',
    suspendida: '#6f42c1',
    revisar: '#ffc107',
  },

  // State labels in Spanish
  STATE_LABELS: {
    pendiente: 'Pendiente',
    en_curso: 'En Curso',
    finalizada: 'Finalizada',
    incidencia: 'Con Incidencia',
    parcial: 'Parcial',
    suspendida: 'Suspendida',
    revisar: 'Revisar',
  },

  // Incidence types
  INCIDENCE_TYPES: [
    'Escuela cerrada',
    'Acceso bloqueado',
    'Director/a ausente',
    'Formulario incompleto',
    'Problema tecnico',
    'Seguridad / riesgo',
    'Otra',
  ],

  // Priority levels
  PRIORITY_LEVELS: [
    { value: 'alta', label: 'Alta', color: '#dc3545' },
    { value: 'media', label: 'Media', color: '#fd7e14' },
    { value: 'baja', label: 'Baja', color: '#28a745' },
  ],

  // Zones
  ZONES: ['Urbana', 'Rural', 'Rural Remota'],

  // Departamentos Paraguay
  DEPARTAMENTOS: [
    'Concepcion', 'San Pedro', 'Cordillera', 'Guaira', 'Caaguazu',
    'Caazapa', 'Itapua', 'Misiones', 'Paraguari', 'Alto Parana',
    'Central', 'Neembucu', 'Amambay', 'Canindeyu', 'Presidente Hayes',
    'Boqueron', 'Alto Paraguay', 'Asuncion',
  ],
};

// Freeze to prevent accidental mutation
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.ROLES);
Object.freeze(APP_CONFIG.STATES);
Object.freeze(APP_CONFIG.STATE_COLORS);
Object.freeze(APP_CONFIG.STATE_LABELS);
