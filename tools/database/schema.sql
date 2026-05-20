-- CIALPA relational bridge schema
-- PostgreSQL 14+.

CREATE TABLE IF NOT EXISTS schools (
  school_key TEXT PRIMARY KEY,
  id_escuela TEXT,
  codigo_local TEXT,
  nombre TEXT,
  departamento TEXT,
  distrito TEXT,
  localidad TEXT,
  zona TEXT,
  latitud NUMERIC,
  longitud NUMERIC,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_codigo_local
  ON schools (codigo_local)
  WHERE codigo_local IS NOT NULL AND codigo_local <> '';

CREATE TABLE IF NOT EXISTS school_institutions (
  institution_key TEXT PRIMARY KEY,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE CASCADE,
  id_institucion TEXT,
  codigo_institucion TEXT,
  nombre TEXT,
  turno TEXT,
  nivel TEXT,
  sector TEXT,
  modalidad TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_institutions_school
  ON school_institutions (school_key, nombre);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_institutions_codigo
  ON school_institutions (school_key, codigo_institucion)
  WHERE codigo_institucion IS NOT NULL AND codigo_institucion <> '';

CREATE TABLE IF NOT EXISTS sync_mutations (
  mutation_id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cialpa_gas',
  status TEXT NOT NULL DEFAULT 'recibida',
  attempts INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_mutations_status
  ON sync_mutations (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS mec_drafts (
  draft_id TEXT PRIMARY KEY,
  mutation_id TEXT NOT NULL REFERENCES sync_mutations(mutation_id) ON DELETE RESTRICT,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  id_escuela TEXT,
  codigo_local TEXT,
  usuario TEXT,
  estado_borrador TEXT,
  motivo TEXT,
  app_version TEXT,
  schema_version TEXT,
  saved_at TIMESTAMPTZ,
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  time_tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_index JSONB NOT NULL DEFAULT '[]'::jsonb,
  tiempo_escuela_min NUMERIC,
  tiempo_aulas_min NUMERIC,
  tiempo_aulas_promedio_min NUMERIC,
  tiempo_sanitarios_min NUMERIC,
  tiempo_sanitarios_promedio_min NUMERIC,
  tiempo_exteriores_min NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS mec_drafts
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_mec_drafts_school_saved
  ON mec_drafts (school_key, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_mec_drafts_institution_saved
  ON mec_drafts (institution_key, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_mec_drafts_usuario
  ON mec_drafts (usuario, saved_at DESC);

CREATE TABLE IF NOT EXISTS buildings (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  codigo TEXT,
  nombre TEXT,
  floor_count INTEGER,
  largo_m NUMERIC,
  ancho_m NUMERIC,
  estado TEXT,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, block_id)
);

ALTER TABLE IF EXISTS buildings
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_buildings_school
  ON buildings (school_key, block_id);

CREATE INDEX IF NOT EXISTS idx_buildings_institution
  ON buildings (institution_key, block_id);

CREATE TABLE IF NOT EXISTS floors (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  floor_id TEXT NOT NULL,
  block_id TEXT,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  label TEXT,
  level_number INTEGER,
  largo_m NUMERIC,
  ancho_m NUMERIC,
  estado TEXT,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, floor_id)
);

ALTER TABLE IF EXISTS floors
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_floors_block
  ON floors (draft_id, block_id);

CREATE INDEX IF NOT EXISTS idx_floors_school_block_level
  ON floors (school_key, block_id, level_number);

CREATE INDEX IF NOT EXISTS idx_floors_institution
  ON floors (institution_key, block_id, level_number);

CREATE TABLE IF NOT EXISTS rooms (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  block_id TEXT,
  floor_id TEXT,
  floor_label TEXT,
  kind TEXT,
  name TEXT,
  code TEXT,
  estado TEXT,
  largo_m NUMERIC,
  ancho_m NUMERIC,
  area_m2 NUMERIC,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, room_id)
);

ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT,
  ADD COLUMN IF NOT EXISTS floor_id TEXT;

CREATE INDEX IF NOT EXISTS idx_rooms_block_floor
  ON rooms (draft_id, block_id, floor_label);

CREATE INDEX IF NOT EXISTS idx_rooms_school_block_floor_kind
  ON rooms (school_key, block_id, floor_label, kind);

CREATE INDEX IF NOT EXISTS idx_rooms_institution_kind
  ON rooms (institution_key, kind);

CREATE INDEX IF NOT EXISTS idx_rooms_kind
  ON rooms (kind);

CREATE TABLE IF NOT EXISTS room_objects (
  draft_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  school_key TEXT REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  block_id TEXT,
  floor_label TEXT,
  type TEXT,
  code TEXT,
  estado TEXT,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, object_id),
  FOREIGN KEY (draft_id, room_id) REFERENCES rooms(draft_id, room_id) ON DELETE CASCADE
);

ALTER TABLE IF EXISTS room_objects
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT,
  ADD COLUMN IF NOT EXISTS block_id TEXT,
  ADD COLUMN IF NOT EXISTS floor_label TEXT;

CREATE INDEX IF NOT EXISTS idx_room_objects_room
  ON room_objects (draft_id, room_id);

CREATE INDEX IF NOT EXISTS idx_room_objects_school_type
  ON room_objects (school_key, type);

CREATE TABLE IF NOT EXISTS sanitary_groups (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  sanitary_id TEXT NOT NULL,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  block_ref TEXT,
  floor_label TEXT,
  code TEXT,
  name TEXT,
  estado TEXT,
  largo_m NUMERIC,
  ancho_m NUMERIC,
  area_m2 NUMERIC,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, sanitary_id)
);

ALTER TABLE IF EXISTS sanitary_groups
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_sanitary_groups_block_floor
  ON sanitary_groups (draft_id, block_ref, floor_label);

CREATE INDEX IF NOT EXISTS idx_sanitary_groups_school_block_floor
  ON sanitary_groups (school_key, block_ref, floor_label);

CREATE INDEX IF NOT EXISTS idx_sanitary_groups_institution
  ON sanitary_groups (institution_key, block_ref, floor_label);

CREATE TABLE IF NOT EXISTS sanitary_objects (
  draft_id TEXT NOT NULL,
  sanitary_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  school_key TEXT REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  block_ref TEXT,
  floor_label TEXT,
  type TEXT,
  code TEXT,
  estado TEXT,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, object_id),
  FOREIGN KEY (draft_id, sanitary_id) REFERENCES sanitary_groups(draft_id, sanitary_id) ON DELETE CASCADE
);

ALTER TABLE IF EXISTS sanitary_objects
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT,
  ADD COLUMN IF NOT EXISTS block_ref TEXT,
  ADD COLUMN IF NOT EXISTS floor_label TEXT;

CREATE INDEX IF NOT EXISTS idx_sanitary_objects_group
  ON sanitary_objects (draft_id, sanitary_id);

CREATE INDEX IF NOT EXISTS idx_sanitary_objects_school_type
  ON sanitary_objects (school_key, type);

CREATE TABLE IF NOT EXISTS site_elements (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  type TEXT,
  code TEXT,
  estado TEXT,
  block_id TEXT,
  geometry JSONB NOT NULL DEFAULT '{}'::jsonb,
  ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, element_id)
);

ALTER TABLE IF EXISTS site_elements
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_site_elements_type
  ON site_elements (draft_id, type);

CREATE INDEX IF NOT EXISTS idx_site_elements_school_type
  ON site_elements (school_key, type);

CREATE TABLE IF NOT EXISTS evidence_files (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
  school_key TEXT REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  entity_kind TEXT,
  entity_id TEXT,
  field_path TEXT,
  file_name TEXT,
  drive_file_id TEXT,
  drive_url TEXT,
  captured_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, evidence_id)
);

ALTER TABLE IF EXISTS evidence_files
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_entity
  ON evidence_files (draft_id, entity_kind, entity_id);

CREATE INDEX IF NOT EXISTS idx_evidence_school_entity
  ON evidence_files (school_key, entity_kind, entity_id);

CREATE TABLE IF NOT EXISTS time_tracking_items (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  school_key TEXT REFERENCES schools(school_key) ON DELETE RESTRICT,
  institution_key TEXT REFERENCES school_institutions(institution_key) ON DELETE SET NULL,
  kind TEXT,
  entity_id TEXT,
  label TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  active BOOLEAN NOT NULL DEFAULT false,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, record_id)
);

ALTER TABLE IF EXISTS time_tracking_items
  ADD COLUMN IF NOT EXISTS school_key TEXT,
  ADD COLUMN IF NOT EXISTS institution_key TEXT;

CREATE INDEX IF NOT EXISTS idx_time_tracking_kind
  ON time_tracking_items (draft_id, kind);

CREATE INDEX IF NOT EXISTS idx_time_tracking_school_kind
  ON time_tracking_items (school_key, kind);

COMMENT ON TABLE schools IS 'Local escolar o edificio/predio escolar. Un local puede alojar una o varias instituciones.';
COMMENT ON TABLE school_institutions IS 'Instituciones que funcionan dentro de un local escolar/edificio.';
COMMENT ON TABLE buildings IS 'Bloques constructivos relevados dentro del local escolar.';
