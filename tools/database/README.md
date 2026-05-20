# API relacional CIALPA

Esta carpeta contiene el primer receptor transaccional para guardar los borradores MEC en PostgreSQL, manteniendo Google Sheets como respaldo operativo.

## Componentes

- `schema.sql`: tablas PostgreSQL para escuelas, mutaciones, borradores, bloques, pisos, ambientes, objetos, sanitarios, exteriores, evidencias y tiempos.
- `cialpa_db_api.mjs`: API HTTP compatible con Cloud Run. Recibe el JSON que Apps Script ya genera en `guardarBorradorMec`.
- `Dockerfile`: imagen minima para desplegar el receptor en Cloud Run.
- `env.example`: variables necesarias para ejecutar o desplegar.
- `install_database_prereqs.ps1`: instalador auxiliar para Google Cloud SDK y PostgreSQL/psql en Windows.

## Modelo e indexacion

El modelo separa dos niveles que no deben mezclarse:

- `schools`: local escolar, edificio o predio relevado. Esta clave fisica es `school_key` y normalmente corresponde a `codigo_local`.
- `school_institutions`: instituciones que funcionan dentro del local. Se indexan por `institution_key` y dependen de `school_key`.
- Elementos fisicos: bloques (`buildings`), pisos (`floors`), ambientes/aulas/espacios (`rooms`), objetos de ambiente (`room_objects`), sanitarios (`sanitary_groups` y `sanitary_objects`), exteriores (`site_elements`), evidencias y tiempos.

La API siempre guarda el snapshot completo en `mec_drafts` y normaliza los hijos usando `school_key` e `institution_key` cuando existe. Si el payload no trae instituciones explicitas, crea una institucion principal a partir de `nombre_institucion`, `institucion` o el nombre de la escuela.

Indices principales:

- `schools(codigo_local)` para ubicar el edificio/local.
- `school_institutions(school_key, codigo_institucion)` para multiples instituciones por edificio.
- `mec_drafts(school_key, saved_at)` e `mec_drafts(institution_key, saved_at)` para historial por edificio o institucion.
- `buildings(school_key, block_id)`, `floors(school_key, block_id, level_number)`, `rooms(school_key, block_id, floor_label, kind)`.
- Indices equivalentes por `institution_key` para filtrar aulas, sanitarios y tiempos cuando una institucion comparte edificio.

Esto permite que una escuela-edificio tenga mas de una institucion sin duplicar la geometria del predio. La estructura fisica se consulta por `school_key`; los reportes academicos u operativos por institucion pueden sumar por `institution_key`.

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

En Windows, si faltan herramientas locales:

```powershell
npm run db:install-tools
```

Eso instala Google Cloud SDK y PostgreSQL/psql usando `winget` o Chocolatey. Docker Desktop es opcional porque el despliegue recomendado usa Cloud Build; si se necesita Docker local:

```powershell
powershell -ExecutionPolicy Bypass -File tools/database/install_database_prereqs.ps1 -InstallDocker
```

En Supabase, Cloud SQL PostgreSQL, AlloyDB o una base local:

```bash
psql "$DATABASE_URL" -f tools/database/schema.sql
```

Si el proveedor exige TLS, usar `PGSSLMODE=require`.

Si `psql` no esta instalado, se puede aplicar el mismo esquema con Node:

```bash
set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
set PGSSLMODE=require
npm run db:schema
```

La API tambien puede aplicar `schema.sql` al iniciar si se despliega con:

```text
APPLY_SCHEMA_ON_START=true
```

La operacion es idempotente porque el esquema usa `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS`.

Para levantar una base local reproducible en `.local/postgres_data`, iniciar PostgreSQL en el puerto `55432` y aplicar el esquema:

```powershell
npm run db:local
```

El comando imprime el `DATABASE_URL` local y el comando para detener el servidor cuando ya no se necesite.

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

## Despliegue sugerido en Cloud Run + Cloud SQL

La carpeta incluye un script operativo para Google Cloud. Requisitos:

- Google Cloud SDK instalado y autenticado con un proyecto con billing activo.
- Permisos para Cloud SQL, Cloud Run, Cloud Build, Secret Manager y Artifact Registry.
- Ejecutar desde la raiz del repositorio.

```powershell
.\tools\database\deploy_cloudrun_cloudsql.ps1 `
  -ProjectId "ID_DEL_PROYECTO_GCP" `
  -Region "southamerica-east1"
```

El script:

1. Habilita APIs necesarias.
2. Crea una instancia Cloud SQL PostgreSQL, base y usuario si no existen.
3. Guarda `DATABASE_URL` y `DATABASE_SYNC_TOKEN` en Secret Manager.
4. Otorga a la cuenta de ejecucion de Cloud Run acceso a Cloud SQL y secretos.
5. Construye la imagen con `tools/database/Dockerfile`.
6. Despliega Cloud Run conectado a Cloud SQL.
7. Arranca con `APPLY_SCHEMA_ON_START=true` para ejecutar `schema.sql`.

Al finalizar imprime la URL que debe configurarse en Apps Script:

```text
DATABASE_SYNC_URL=https://<servicio>/sync/mec-draft
```

Tambien imprime el comando para recuperar el token desde Secret Manager sin mostrarlo automaticamente:

```powershell
gcloud secrets versions access latest --secret=cialpa-database-sync-token --project=ID_DEL_PROYECTO_GCP
```

Para instancias ya existentes se pueden usar `-SkipSqlCreate`, `-SkipBuild`, `-SqlInstance`, `-DatabaseName`, `-DbUser`, `-DbPassword`, `-SyncToken` y `-RuntimeServiceAccount`.

Luego de verificar `/health` con `schema: "ok"`, se puede redeplegar con `-NoApplySchemaOnStart` para evitar revisar el esquema en cada arranque.

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

Ambientes por institucion dentro del mismo edificio:

```sql
SELECT
  s.codigo_local,
  i.nombre AS institucion,
  r.block_id,
  r.floor_label,
  r.kind,
  count(*) AS ambientes
FROM rooms r
JOIN schools s ON s.school_key = r.school_key
LEFT JOIN school_institutions i ON i.institution_key = r.institution_key
GROUP BY s.codigo_local, i.nombre, r.block_id, r.floor_label, r.kind
ORDER BY s.codigo_local, i.nombre, r.block_id, r.floor_label, r.kind;
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
