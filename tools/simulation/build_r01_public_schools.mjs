import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'lista_oficial_escuelas_2025_listado_ini.csv');
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(repoRoot, 'assets', 'data', 'r01-schools-public.json');

const FIELD_ALIASES = {
  codigo: ['codigo_local', 'codigo', 'codigo del local escolar', 'cod local', 'cod_local'],
  nombre: ['nombre', 'nombre escuela', 'nombre_escuela', 'nombre del local escolar (*)', 'local escolar'],
  departamento: ['departamento'],
  distrito: ['distrito'],
  localidad: ['localidad', 'barrio', 'compania'],
};

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(value => String(value || '').trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  row.push(cell);
  if (row.some(value => String(value || '').trim() !== '')) rows.push(row);
  return rows;
}

function pick(row, headerIndex, aliases) {
  for (const alias of aliases) {
    const idx = headerIndex.get(normalize(alias));
    if (idx !== undefined) {
      const value = String(row[idx] || '').trim();
      if (value) return value;
    }
  }
  return '';
}

function build() {
  const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const table = parseCsv(raw);
  if (table.length < 2) throw new Error(`No hay filas suficientes en ${inputPath}`);

  const headers = table[0].map(header => String(header || '').trim());
  const headerIndex = new Map(headers.map((header, index) => [normalize(header), index]));
  const seen = new Set();
  const schools = [];

  for (const row of table.slice(1)) {
    const codigo = pick(row, headerIndex, FIELD_ALIASES.codigo);
    const nombre = pick(row, headerIndex, FIELD_ALIASES.nombre);
    if (!codigo && !nombre) continue;
    const key = normalize(codigo || nombre);
    if (seen.has(key)) continue;
    seen.add(key);
    schools.push([
      codigo,
      nombre,
      pick(row, headerIndex, FIELD_ALIASES.departamento),
      pick(row, headerIndex, FIELD_ALIASES.distrito),
      pick(row, headerIndex, FIELD_ALIASES.localidad),
      codigo,
    ]);
  }

  schools.sort((a, b) =>
    String(a[2] || '').localeCompare(String(b[2] || ''))
    || String(a[3] || '').localeCompare(String(b[3] || ''))
    || String(a[0] || '').localeCompare(String(b[0] || ''))
  );

  const output = {
    meta: {
      schema: 'r01_public_school_index_v1',
      generated_at: '2026-05-23',
      source: 'lista_oficial_escuelas_2025_listado_ini.csv',
      note: 'Campos minimos para busqueda publica; no incluye responsables, telefonos ni correos.',
      total: schools.length,
    },
    schools,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`, 'utf8');
  console.log(`R01 public schools: ${schools.length}`);
  console.log(path.relative(repoRoot, outputPath));
}

build();
