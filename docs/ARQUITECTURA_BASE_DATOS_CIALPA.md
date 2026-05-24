# Arquitectura de base de datos CIALPA

## Objetivo

Pasar de un libro operativo en Google Sheets a una base de datos estructurada, auditable y preparada para miles de escuelas, sin perder la capacidad offline de la app en tablets.

## Enfoque recomendado

- Mantener la PWA con `IndexedDB` local para trabajo offline.
- Usar una API intermedia transaccional, idealmente Cloud Run o Apps Script como puente temporal.
- Guardar datos definitivos en PostgreSQL administrado, por ejemplo Cloud SQL, Supabase o AlloyDB.
- Conservar Google Sheets solo como tablero operativo/exportable, no como fuente primaria de verdad.
- Guardar fotos y PDF en Drive o Cloud Storage, pero registrar metadatos, hash y relaciones en la base.

## Principios de integridad

- Cada escritura debe llevar `clientMutationId`, `device_id`, `user_id`, `school_key`, `institution_key` cuando aplique y fecha del cliente/servidor.
- Las mutaciones deben ser idempotentes: reintentar no debe duplicar filas.
- Las entidades centrales deben tener claves foraneas y restricciones `NOT NULL`/`CHECK`.
- Los borradores pueden guardarse como `JSONB`, pero los cierres finales deben normalizarse por bloque, piso, ambiente, sanitario, elemento y evidencia.
- Toda edicion importante debe quedar en `audit_log`.

## Modelo principal

| Tabla | Uso |
|---|---|
| `schools` | Local escolar, edificio o predio relevado. Puede alojar una o varias instituciones. |
| `school_institutions` | Instituciones que funcionan dentro del local escolar, con clave propia por institucion. |
| `school_samples` | Marca de muestra piloto, orden, estrato, factor de expansion y datos muestrales. |
| `users` | Usuarios, roles, estado, identificador externo y datos de auditoria. |
| `assignments` | Asignacion de escuelas por encuestador, supervisor, jornada y prioridad. |
| `survey_sessions` | Apertura/cierre de trabajo por escuela, usuario y dispositivo. |
| `mec_drafts` | Borrador vigente por escuela, institucion, usuario y dispositivo, con snapshot `JSONB`. |
| `school_submissions` | Cierre final versionado, estado de validacion, PDF y metadatos. |
| `buildings` | Bloques o construcciones registradas. |
| `floors` | Pisos por bloque. |
| `rooms` | Aulas, otros espacios y ambientes. |
| `room_objects` | Puertas, ventanas, tomas, tableros, focos, ventiladores, aires, fallas, textos, etc. |
| `sanitary_groups` | Recintos sanitarios. |
| `sanitary_objects` | Cabinas, inodoros, lavamanos, urinarios, duchas y objetos internos. |
| `site_elements` | Exteriores: tanque, pozo, galeria, caminero, pilar, rampa, acometida, medidor, puesta a tierra. |
| `evidence_files` | Fotos, PDF, metadatos, hash, URL de almacenamiento y entidad vinculada. |
| `sync_mutations` | Registro idempotente de cada mutacion offline recibida. |
| `audit_log` | Auditoria inmutable de cambios, usuario, rol, IP/contexto y payload resumido. |

## Indexacion jerarquica

La clave `school_key` identifica el edificio/local escolar, no necesariamente una sola institucion. La clave `institution_key` identifica cada institucion dentro de ese edificio. Con eso una consulta puede responder tanto "que tiene este predio" como "que usa esta institucion".

Jerarquia normalizada:

```text
schools (edificio/local)
  -> school_institutions (una o varias instituciones)
  -> mec_drafts / school_submissions
  -> buildings (bloques)
  -> floors (pisos)
  -> rooms (aulas, espacios, ambientes)
  -> room_objects (puertas, ventanas, luces, fallas, equipos)
  -> sanitary_groups / sanitary_objects
  -> site_elements (exteriores e infraestructura)
  -> evidence_files / time_tracking_items
```

Indices operativos recomendados e implementados en el esquema inicial:

- `schools(codigo_local)` para localizar el edificio.
- `school_institutions(school_key, codigo_institucion)` para varias instituciones dentro del mismo local.
- `mec_drafts(school_key, saved_at)` y `mec_drafts(institution_key, saved_at)` para historial por edificio o institucion.
- `buildings(school_key, block_id)` y `floors(school_key, block_id, level_number)` para navegar bloque/piso.
- `rooms(school_key, block_id, floor_label, kind)` para aulas, ambientes y otros espacios.
- `sanitary_groups(school_key, block_ref, floor_label)` y `site_elements(school_key, type)` para sanitarios y exteriores.

## Flujo de sincronizacion

1. La tablet guarda cada cambio en `IndexedDB` con `clientMutationId`.
2. Al tener conexion, la API recibe un lote de mutaciones.
3. La API abre transaccion, valida permisos, verifica idempotencia y escribe tablas normalizadas.
4. La API devuelve estado por mutacion: `aplicada`, `duplicada`, `rechazada` o `conflicto`.
5. La tablet confirma localmente solo las mutaciones aceptadas.

## Seguridad

- Autenticacion con tokens de corta duracion y refresh controlado.
- Roles: `encuestador`, `supervisor`, `admin`.
- Permisos por escuela asignada, no solo por rol global.
- Cifrado en transito por HTTPS y cifrado en reposo del proveedor.
- Backups automaticos diarios y retencion versionada.
- Registro de auditoria no editable desde la app.
- Validacion backend obligatoria: la UI ayuda, pero no debe ser la autoridad.

## Migracion gradual

1. Mantener Sheets como salida visible, pero empezar a escribir tambien en la base nueva.
2. Comparar conteos y cierres entre Sheets y base durante una semana piloto.
3. Cambiar tableros y consultas a la base nueva.
4. Dejar Sheets como exportacion/reporting.
5. Congelar esquema `v1` antes de escalar a todas las escuelas.

## Puente operativo implementado

- `guardarBorradorMec` mantiene la escritura visible en `mec_borradores`.
- El mismo guardado deja una mutacion idempotente en `db_sync_queue`, usando `id_borrador/clientMutationId`.
- La cola guarda una vista resumida en Sheets y el paquete completo como JSON en Drive, referenciado por `payload_file_id` y `payload_file_url`.
- Configuracion en `configuracion`: `DATABASE_SYNC_ENABLED`, `DATABASE_SYNC_MODE`, `DATABASE_SYNC_URL`, `DATABASE_SYNC_TOKEN`.
- Para produccion, el token debe cargarse preferentemente como Script Property `DATABASE_SYNC_TOKEN`; la hoja `configuracion` queda como respaldo operativo temporal.
- Con `DATABASE_SYNC_MODE=queue`, la cola queda preparada para migrar o reprocesar sin depender todavia de una API externa.
- Con `DATABASE_SYNC_MODE=rest`, `DATABASE_SYNC_ENABLED=true` y `DATABASE_SYNC_URL` configurada, Apps Script intenta enviar el JSON del borrador a la API transaccional; si falla, conserva el error en `db_sync_queue` sin bloquear Sheets.
- La API relacional ya valida token, normaliza entidades y escribe en PostgreSQL dentro de una transaccion; Sheets/Drive quedan como respaldo operativo y fuente de reproceso.

## API relacional inicial

Se agrega una primera implementacion desplegable en `tools/database/`:

- `tools/database/schema.sql` crea el esquema PostgreSQL inicial.
- `tools/database/cialpa_db_api.mjs` recibe `POST /sync/mec-draft` con el payload que ya arma Apps Script.
- La API guarda la mutacion idempotente en `sync_mutations`.
- El snapshot completo queda en `mec_drafts.draft` como `JSONB`.
- El contenido operativo queda normalizado en `school_institutions`, `buildings`, `floors`, `rooms`, `room_objects`, `sanitary_groups`, `sanitary_objects`, `site_elements`, `evidence_files` y `time_tracking_items`.
- Todas las entidades fisicas guardan `school_key` y, cuando el payload lo permite, `institution_key`.
- Los minutos de escuela, aulas, sanitarios y exteriores quedan tambien como columnas directas en `mec_drafts` para reportes logisticos.

Configuracion minima del servicio:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexion PostgreSQL. |
| `DATABASE_SYNC_TOKEN` | Token bearer esperado desde Apps Script. |
| `PGSSLMODE=require` | TLS para Supabase/servicios administrados que lo requieran. |
| `APPLY_SCHEMA_ON_START` | `true` solo durante el primer despliegue si Cloud Run debe ejecutar `schema.sql` al iniciar. |
| `PORT` | Puerto HTTP, definido por Cloud Run o por ejecucion local. |

Si no hay `psql` local, el esquema puede aplicarse con `npm run db:schema`. Para Cloud Run + Cloud SQL queda preparado `tools/database/deploy_cloudrun_cloudsql.ps1`, que crea la base, guarda secretos, construye la imagen y despliega el endpoint `/sync/mec-draft`.

Configuracion minima en Apps Script:

| Clave | Valor |
|---|---|
| `DATABASE_SYNC_ENABLED` | `true` |
| `DATABASE_SYNC_MODE` | `rest` |
| `DATABASE_SYNC_URL` | `https://<servicio>/sync/mec-draft` |
| `DATABASE_SYNC_TIMEOUT_MS` | `8000` o `12000` |

El token debe cargarse como Script Property `DATABASE_SYNC_TOKEN` para no dejarlo visible en la hoja.
Como ayuda operativa, `tools/database/gas_database_sync_setup.gs.example` contiene una funcion manual para pegar y ejecutar desde la cuenta propietaria del Apps Script; la hoja `configuracion` queda con URL/modo habilitado y el token queda solo en `PropertiesService`.

## Consolidacion plena y reproceso

Para pasar de cola preparada a base formal consolidada se agrega el comando:

```powershell
npm run db:consolidate
```

El consolidador acepta cuatro fuentes:

- Export CSV de `db_sync_queue`.
- Export CSV de `mec_borradores`.
- JSONL con payloads de `guardarBorradorMec`.
- JSON unico o arreglo de JSON.

El flujo recomendado es:

1. Verificar `/health` de la API y `schema: ok`.
2. Exportar `db_sync_queue` desde Google Sheets.
3. Ejecutar simulacion sin escribir:

```powershell
npm run db:consolidate -- --input .\exports\db_sync_queue.csv
```

4. Escribir solo pendientes o errores:

```powershell
npm run db:consolidate -- --input .\exports\db_sync_queue.csv --status pendiente,error,pendiente_config --write
```

5. Comparar conteos entre `db_sync_queue`, `sync_mutations`, `mec_drafts`, `rooms`, `sanitary_groups`, `site_elements` y `evidence_files`.
6. Activar doble escritura con `DATABASE_SYNC_MODE=rest` para que los nuevos guardados entren automaticamente.

Si la columna `payload_json` de Sheets viene truncada, se usan los JSON completos guardados en Drive. Operativamente se pueden descargar a una carpeta local y ejecutar:

```powershell
npm run db:consolidate -- --input .\exports\db_sync_queue.csv --payload-dir .\exports\db_payloads --write
```

La consolidacion es idempotente: cada `mutation_id` se registra en `sync_mutations`, los reintentos incrementan `attempts`, y el snapshot normalizado se reemplaza por `draft_id` sin duplicar entidades hijas.

## Decisiones pendientes

- Proveedor: Cloud SQL PostgreSQL, Supabase o AlloyDB.
- Dónde alojar la API transaccional: Cloud Run o Apps Script temporal.
- Politica de retencion de fotos originales y comprimidas.
- Definicion de validaciones obligatorias para cierre final.
- Estrategia de reportes: Looker Studio, BigQuery o consultas directas.
