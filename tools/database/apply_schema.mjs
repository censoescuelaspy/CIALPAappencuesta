import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';
const SCHEMA_FILE = process.argv[2] || new URL('./schema.sql', import.meta.url);

if (!DATABASE_URL) {
  console.error('DATABASE_URL es requerido para aplicar schema.sql.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: pgSslConfig(),
  max: Number(process.env.PGPOOL_MAX || 1),
  connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS || 30000),
});

try {
  const sql = await readFile(SCHEMA_FILE, 'utf8');
  await pool.query(sql);
  const result = await pool.query(`
    SELECT
      to_regclass('public.schools') AS schools,
      to_regclass('public.school_institutions') AS school_institutions,
      to_regclass('public.mec_drafts') AS mec_drafts,
      to_regclass('public.sync_mutations') AS sync_mutations
  `);
  console.log(JSON.stringify({
    status: 'ok',
    schema: result.rows[0],
  }, null, 2));
} catch (err) {
  console.error('[apply_schema]', err.message || err);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}

function pgSslConfig() {
  const value = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase();
  if (!value || ['disable', 'false', '0', 'off'].includes(value)) return undefined;
  if (['require', 'true', '1', 'on', 'no-verify'].includes(value)) return { rejectUnauthorized: false };
  return undefined;
}
