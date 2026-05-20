# API relacional CIALPA

Esta carpeta contiene el primer receptor transaccional para guardar los borradores MEC en PostgreSQL, manteniendo Google Sheets como respaldo operativo.

## Componentes

- `schema.sql`: tablas PostgreSQL para escuelas, mutaciones, borradores, bloques, pisos, ambientes, objetos, sanitarios, exteriores, evidencias y tiempos.
- `cialpa_db_api.mjs`: API HTTP compatible con Cloud Run. Recibe el JSON que Apps Script ya genera en `guardarBorradorMec`.
- `Dockerfile`: imagen minima para desplegar el receptor en Cloud Run.
- `env.example`: variables necesarias para ejecutar o desplegar.

## Flujo

1. La app web guarda el borrador MEC.
2. Apps Script escribe en `mec_borradores`.
3. Apps Script registra la mutacion en `db_sync_queue`.
4. Si `DATABASE_SYNC_MODE=rest`, Apps Script hace `POST` a esta API.
5. La API abre una transaccion PostgreSQL, actualiza `sync_mutations`, guarda el snapshot en `mec_drafts` y normaliza el contenido en tablas relacionales.

El endpoint principal es:

```text
POST /sync/mec-draft
Authorization: Bearer <DATABASE_SYNC_TOKEN>
Content-Type: application/json
```

Tambien acepta `POST /sync` para pruebas.

## Preparar PostgreSQL

En Supabase, Cloud SQL PostgreSQL, AlloyDB o una base local:

```bash
psql "$DATABASE_URL" -f tools/database/schema.sql
```

Si el proveedor exige TLS, usar `PGSSLMODE=require`.

## Ejecutar local

```bash
npm install
set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
set DATABASE_SYNC_TOKEN=token-local
set PGSSLMODE=require
npm run db:api
```

Verificacion rapida:

```bash
curl http://127.0.0.1:8787/health
```

## Configurar Apps Script

En la hoja `configuracion`:

| Clave | Valor |
|---|---|
| `DATABASE_SYNC_ENABLED` | `true` |
| `DATABASE_SYNC_MODE` | `rest` |
| `DATABASE_SYNC_URL` | `https://<servicio>/sync/mec-draft` |
| `DATABASE_SYNC_TIMEOUT_MS` | `8000` o `12000` |

El token debe cargarse preferentemente como Script Property:

```text
DATABASE_SYNC_TOKEN=<mismo token de la API>
```

Si la API falla, Apps Script conserva el error en `db_sync_queue` y no bloquea el guardado en Sheets.

## Despliegue sugerido en Cloud Run

1. Crear base PostgreSQL y ejecutar `schema.sql`.
2. Crear secreto para `DATABASE_URL`.
3. Crear secreto para `DATABASE_SYNC_TOKEN`.
4. Desplegar el servicio Node con `tools/database/Dockerfile` o con `npm run db:api` como comando de arranque.
5. Configurar `DATABASE_SYNC_URL` en Apps Script con la URL HTTPS publica del servicio.

## Consultas utiles

Tiempo real por escuela:

```sql
SELECT
  s.codigo_local,
  s.nombre,
  d.usuario,
  d.estado_borrador,
  d.saved_at,
  d.tiempo_escuela_min,
  d.tiempo_aulas_min,
  d.tiempo_sanitarios_min,
  d.tiempo_exteriores_min
FROM mec_drafts d
JOIN schools s ON s.school_key = d.school_key
ORDER BY d.saved_at DESC;
```

Promedio de carga por aula y sanitario:

```sql
SELECT
  kind,
  round(avg(duration_seconds) / 60.0, 1) AS promedio_min,
  count(*) AS registros
FROM time_tracking_items
WHERE active = false
  AND kind IN ('ambiente', 'sanitario', 'exterior')
GROUP BY kind
ORDER BY kind;
```
