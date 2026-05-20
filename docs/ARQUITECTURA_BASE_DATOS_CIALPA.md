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

- Cada escritura debe llevar `clientMutationId`, `device_id`, `user_id`, `school_id` y fecha del cliente/servidor.
- Las mutaciones deben ser idempotentes: reintentar no debe duplicar filas.
- Las entidades centrales deben tener claves foraneas y restricciones `NOT NULL`/`CHECK`.
- Los borradores pueden guardarse como `JSONB`, pero los cierres finales deben normalizarse por bloque, piso, ambiente, sanitario, elemento y evidencia.
- Toda edicion importante debe quedar en `audit_log`.

## Modelo principal

| Tabla | Uso |
|---|---|
| `schools` | Padron completo de escuelas, coordenadas, zona, departamento, distrito y estado operativo. |
| `school_samples` | Marca de muestra piloto, orden, estrato, factor de expansion y datos muestrales. |
| `users` | Usuarios, roles, estado, identificador externo y datos de auditoria. |
| `assignments` | Asignacion de escuelas por encuestador, supervisor, jornada y prioridad. |
| `survey_sessions` | Apertura/cierre de trabajo por escuela, usuario y dispositivo. |
| `mec_drafts` | Borrador vigente por escuela/usuario/dispositivo, con snapshot `JSONB`. |
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
- Este puente es temporal: la API definitiva debe validar permisos, normalizar entidades y escribir en PostgreSQL dentro de una transaccion.

## Decisiones pendientes

- Proveedor: Cloud SQL PostgreSQL, Supabase o AlloyDB.
- Dónde alojar la API transaccional: Cloud Run o Apps Script temporal.
- Politica de retencion de fotos originales y comprimidas.
- Definicion de validaciones obligatorias para cierre final.
- Estrategia de reportes: Looker Studio, BigQuery o consultas directas.
