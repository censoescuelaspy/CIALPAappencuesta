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

CREATE INDEX IF NOT EXISTS idx_mec_drafts_school_saved
  ON mec_drafts (school_key, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_mec_drafts_usuario
  ON mec_drafts (usuario, saved_at DESC);

CREATE TABLE IF NOT EXISTS buildings (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_buildings_school
  ON buildings (school_key);

CREATE TABLE IF NOT EXISTS floors (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  floor_id TEXT NOT NULL,
  block_id TEXT,
  school_key TEXT NOT NULL REFERENCES schools(school_key) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_floors_block
  ON floors (draft_id, block_id);

CREATE TABLE IF NOT EXISTS rooms (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  block_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_rooms_block_floor
  ON rooms (draft_id, block_id, floor_label);

CREATE INDEX IF NOT EXISTS idx_rooms_kind
  ON rooms (kind);

CREATE TABLE IF NOT EXISTS room_objects (
  draft_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_room_objects_room
  ON room_objects (draft_id, room_id);

CREATE TABLE IF NOT EXISTS sanitary_groups (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  sanitary_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_sanitary_groups_block_floor
  ON sanitary_groups (draft_id, block_ref, floor_label);

CREATE TABLE IF NOT EXISTS sanitary_objects (
  draft_id TEXT NOT NULL,
  sanitary_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_sanitary_objects_group
  ON sanitary_objects (draft_id, sanitary_id);

CREATE TABLE IF NOT EXISTS site_elements (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_site_elements_type
  ON site_elements (draft_id, type);

CREATE TABLE IF NOT EXISTS evidence_files (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_evidence_entity
  ON evidence_files (draft_id, entity_kind, entity_id);

CREATE TABLE IF NOT EXISTS time_tracking_items (
  draft_id TEXT NOT NULL REFERENCES mec_drafts(draft_id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_time_tracking_kind
  ON time_tracking_items (draft_id, kind);
