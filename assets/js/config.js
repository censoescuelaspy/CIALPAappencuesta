/**
 * CIALPA — Relevamiento Escolar
 * config.js — Central application configuration
 * Version: 2.0.0
 */

const APP_CONFIG = {
  // Google Apps Script Web App URL — fill after deploying GAS
  GAS_URL: 'https://script.google.com/macros/s/AKfycbz8ZOzDhNVLeSGsSM94vlLEwLy9PzK8AshNPbPZp3uEyZyEg5_MUBLLM8FrWlpBinCUHA/exec',

  // MEC online form URL
  FORM_URL: 'https://demo.mec.gov.py/demo_rue/login',

  // App metadata
  APP_NAME: 'CIALPA — Relevamiento Escolar',
  VERSION: '2.0.0',
  LOGO_URL: 'assets/img/logo.png',

  // Map defaults (Paraguay center)
  MAP_CENTER: [-23.4, -58.0],
  MAP_ZOOM: 7,
  MAP_MIN_ZOOM: 5,
  MAP_MAX_ZOOM: 18,

  // Tile layer
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

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

  // Survey states
  STATES: {
    PENDIENTE: 'pendiente',
    EN_CURSO: 'en_curso',
    FINALIZADA: 'finalizada',
    INCIDENCIA: 'incidencia',
  },

  // State colors (matches CSS variables)
  STATE_COLORS: {
    pendiente: '#6c757d',
    en_curso: '#fd7e14',
    finalizada: '#28a745',
    incidencia: '#dc3545',
  },

  // State labels in Spanish
  STATE_LABELS: {
    pendiente: 'Pendiente',
    en_curso: 'En Curso',
    finalizada: 'Finalizada',
    incidencia: 'Con Incidencia',
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
