/**
 * CIALPA — Relevamiento Escolar
 * config.js — Central application configuration
 * Version: 2.6.68
 */

const APP_CONFIG = {
  // Google Apps Script Web App URL — fill after deploying GAS
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwwFYlYkar_mnYy4hW7ne_qt85xHQnUk2VeALniVDPtu5MUP5B7pEZHEnFIlo5zxuY/exec',

  // External survey application defaults. These values can be overridden from Google Sheets CONFIG.
  FORM_URL: 'https://demo.mec.gov.py/demo_rue/login',
  FORM_LAUNCH_MODE: 'web',
  FORM_ANDROID_INTENT_URL: '',
  FORM_CUSTOM_SCHEME_URL: '',
  FORM_FALLBACK_SECONDS: 2,

  // App metadata
  APP_NAME: 'CIALPA — Relevamiento Escolar',
  VERSION: '2.6.68',
  EDITION_LABEL: 'Edición vigente v2.6.68',
  LOGO_URL: 'assets/img/logo.png',
  PUBLIC_URL: 'https://censoescuelaspy.github.io/CIALPAappencuesta/',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg/edit',
  EVIDENCE_FOLDER_ID: '1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-',
  EVIDENCE_FOLDER_URL: 'https://drive.google.com/drive/folders/1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-?usp=sharing',
  FINAL_REPORT_EMAIL: 'censoescuelaspy@gmial.com',
  DEFAULT_SCHOOL_ESTIMATE_MINUTES: 45,
  DEFAULT_WORKDAY_HOURS: 6,

  // Map defaults (Paraguay center)
  MAP_CENTER: [-23.4, -58.0],
  MAP_ZOOM: 7,
  MAP_MIN_ZOOM: 5,
  MAP_MAX_ZOOM: 18,

  // Tile layer
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  SATELLITE_TILE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  SATELLITE_ATTRIBUTION: 'Tiles &copy; Esri',
  SATELLITE_MAX_ZOOM: 18,
  PLAN_BASEMAP_TILE_URL: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  PLAN_BASEMAP_ATTRIBUTION: '&copy; OpenStreetMap contributors, HOT',
  PLAN_BASEMAP_MAX_ZOOM: 19,
  MAP_TILE_CACHE_NAME: 'cialpa-map-tiles-v2.5.0',
  MAP_TILE_CACHE_LIMIT: 260,

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
    'Problema técnico',
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
    'Concepción', 'San Pedro', 'Cordillera', 'Guairá', 'Caaguazú',
    'Caazapá', 'Itapúa', 'Misiones', 'Paraguarí', 'Alto Paraná',
    'Central', 'Ñeembucú', 'Amambay', 'Canindeyú', 'Presidente Hayes',
    'Boquerón', 'Alto Paraguay', 'Asunción',
  ],
};

// Freeze to prevent accidental mutation
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.ROLES);
Object.freeze(APP_CONFIG.STATES);
Object.freeze(APP_CONFIG.STATE_COLORS);
Object.freeze(APP_CONFIG.STATE_LABELS);
