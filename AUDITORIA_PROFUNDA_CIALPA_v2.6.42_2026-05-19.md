# Auditoria profunda CIALPA v2.6.42 - 2026-05-19

## Alcance

Revision integral del proyecto local `cialpa_sanitarios_aberturas` en estado `v2.6.42`, con foco en funcionamiento del instrumento de relevamiento, plano guiado, PWA/cache, persistencia offline, backend Apps Script, seguridad operativa y mantenibilidad.

## Validaciones ejecutadas

- `git status -sb`: rama `main...origin/main`, sin cambios locales al iniciar la auditoria.
- `node --check` sobre todos los archivos `assets/js/*.js`: sin errores sintacticos.
- `node --check sw.js`: sin errores sintacticos.
- Verificacion estatica del `APP_SHELL`: 26 archivos declarados, 0 faltantes.
- Busqueda de referencias `MecFormModule.*` usadas por HTML/onclick contra exportaciones reales del modulo.
- Revision de puntos criticos: `assets/js/mec-form.js`, `assets/js/guided-register.js`, `assets/js/api.js`, `assets/js/local-store.js`, `assets/js/stats.js`, `sw.js`, `gas/*.gs`, `README.md` y `DEPLOY_CHECKLIST.md`.

## Hallazgos criticos

### 1. Acciones visibles de forma poligonal llaman funciones no exportadas

**Severidad:** Critica
**Impacto:** botones visibles del plano pueden fallar en tiempo de ejecucion aunque `node --check` pase. Afecta aulas y sanitarios: `Forma L`, `+ Vertice`, `- Vertice`, `Rectangular`.

**Evidencia:**
- `assets/js/mec-form.js:11498-11501` llama:
  - `MecFormModule.setPlanClassroomShape`
  - `MecFormModule.addPlanClassroomVertex`
  - `MecFormModule.removePlanClassroomVertex`
- `assets/js/mec-form.js:11543-11546` llama:
  - `MecFormModule.setPlanSanitaryShape`
  - `MecFormModule.addPlanSanitaryVertex`
  - `MecFormModule.removePlanSanitaryVertex`
- Las funciones existen en `assets/js/mec-form.js:16950-17033`, pero no aparecen en el objeto publico exportado de `MecFormModule` cerca de `assets/js/mec-form.js:19500+`.

**Correccion recomendada:**
- Exportar las 6 funciones en el retorno de `MecFormModule`.
- Agregar una prueba estatica que compare todas las llamadas `MecFormModule.<accion>` generadas en HTML contra las propiedades exportadas.
- Agregar prueba manual/headless: seleccionar aula y sanitario, pulsar `Forma L`, `+ Vertice`, `- Vertice`, `Rectangular`, confirmar que no hay errores de consola y que el dibujo cambia.

### 2. Las evidencias fotograficas se guardan como base64 dentro del borrador local

**Severidad:** Critica
**Impacto:** con pocas fotos reales de tablet/celular se puede superar la cuota de `localStorage` y perder el autosave del relevamiento. Esto golpea directamente al uso en campo.

**Evidencia:**
- `_saveDraft()` serializa todo `_data` en `localStorage` en `assets/js/mec-form.js:182-191`.
- `_readEvidenceFile()` usa `FileReader.readAsDataURL()` y conserva `dataUrl` en `assets/js/mec-form.js:226-261`.
- `_uploadEvidenceRecord()` sube a Drive pero conserva `dataUrl` en el registro devuelto (`assets/js/mec-form.js:285-301`).
- `_syncPendingEvidenceUploads()` tambien depende de `photo.dataUrl` (`assets/js/mec-form.js:333-342`).

**Correccion recomendada:**
- Mover archivos de evidencia a IndexedDB como `Blob` o registros separados, no dentro del JSON principal.
- Comprimir/redimensionar imagenes antes de guardar/subir.
- Despues de subir a Drive, eliminar `dataUrl` del borrador y conservar solo `driveFileId`, `driveUrl`, `mimeType`, `name`, `size` y una miniatura liviana si hace falta.
- Envolver `_saveDraft()` en `try/catch`; si hay `QuotaExceededError`, avisar al usuario y no interrumpir el flujo.

### 3. Mutaciones offline pueden duplicarse o quedar inconsistentes

**Severidad:** Alta
**Impacto:** la UI informa `status: ok` para operaciones en cola, pero el backend puede crear nuevos IDs al sincronizar. Ante reintentos, doble clics o reconexion parcial pueden aparecer sesiones, modulos, eventos o incidencias duplicadas.

**Evidencia:**
- La cola acepta endpoints mutables en `assets/js/api.js:423-435`.
- Cuando falla la red, `_offlinePostQueue()` devuelve `status: ok` y `queued: true` (`assets/js/api.js:437-447`).
- `StatsModule.syncQueue()` reenvia con `skipQueue: true` y marca `synced` si la respuesta fue ok (`assets/js/stats.js:464-488`).
- En GAS, escrituras como incidencias usan `_genId()` y `_appendObject()` sin clave idempotente visible (`gas/sheets.gs:387-410`, `gas/sheets.gs:847-855`).

**Correccion recomendada:**
- Incluir `clientMutationId` / `id_offline_queue` en todas las mutaciones offline.
- En GAS, antes de `appendRow`, buscar si ya existe esa clave y devolver el registro existente.
- Separar visualmente `guardado local` de `sincronizado en servidor`.
- Agregar pantalla de cola con estado por item, ultimo error y opcion de reintento controlado.

## Hallazgos altos

### 4. Backend GAS sin bloqueo transaccional en escrituras principales

**Severidad:** Alta
**Impacto:** varias tablets cargando al mismo tiempo pueden producir carreras en hojas, duplicados o estados pisados. `ficha_grafica.gs` si usa `LockService`, pero las rutas principales de `sheets.gs` no muestran el mismo patron.

**Evidencia:**
- `ficha_grafica.gs` usa `LockService.getDocumentLock()` en su router.
- `sheets.gs` agrega filas con `appendRow()` via `_appendObject()` (`gas/sheets.gs:847-855`).
- No se detecto `LockService` en las escrituras centrales de `sheets.gs`.

**Correccion recomendada:**
- Envolver mutaciones criticas (`iniciarSesion`, `cerrarSesion`, `iniciarModulo`, `cerrarModulo`, `saveIncidencia`, `uploadEvidence`, cambios de escuela) con `LockService.getDocumentLock().waitLock(...)`.
- Usar upsert por claves naturales o `clientMutationId`, no solo append.

### 5. Seguridad de autenticacion debil para un instrumento operativo

**Severidad:** Alta
**Impacto:** credenciales mas faciles de atacar si se filtra la hoja o si la app esta expuesta. No se observa rate limiting ni bloqueo por intentos.

**Evidencia:**
- Hash de password con SHA-256 simple en `gas/auth.gs:13-20`.
- Token construido con `Date.now()` + `Math.random()` en `gas/auth.gs:22-29`.
- Primer acceso permite password numerica de 6 digitos (`gas/auth.gs:61-63`, `gas/auth.gs:103-108`).
- Documentacion publica/operativa conserva una password admin inicial fija en `README.md:101-102` y `DEPLOY_CHECKLIST.md:65-70`.

**Correccion recomendada:**
- Migrar passwords a hash con sal y costo configurable. Si GAS limita librerias, usar al menos sal unica por usuario y muchas iteraciones SHA-256.
- Agregar contador de intentos fallidos, bloqueo temporal y auditoria de IP/user-agent si esta disponible.
- Forzar cambio de password inicial y retirar credenciales concretas de docs publicas.
- Generar tokens con mayor entropia y registrar fingerprint basico de sesion.

### 6. Service Worker puede cachear respuestas no validas o bloquear instalacion por un archivo

**Severidad:** Alta
**Impacto:** usuarios pueden seguir viendo versiones viejas, recursos corruptos o respuestas HTML/errores cacheados como si fueran assets validos.

**Evidencia:**
- `CACHE_NAME` esta en `sw.js:1`.
- Instalacion usa `cache.addAll(APP_SHELL)` en `sw.js:36`; si un recurso falla, falla toda la instalacion.
- Rutas cachean respuestas de red con `cache.put()` sin verificar `response.ok` / tipo de respuesta en `sw.js:69-82`.

**Correccion recomendada:**
- Cachear solo `response.ok` y tipos esperados.
- En instalacion, usar precache tolerante con reporte de faltantes en lugar de abortar todo sin diagnostico.
- Agregar una pantalla/diagnostico de version que muestre `APP_CONFIG.VERSION`, `CACHE_NAME`, controlador SW activo y fecha de build.

## Hallazgos medios

### 7. Dependencias CDN sin fallback local

**Severidad:** Media
**Impacto:** si el usuario abre la app por primera vez con mala conectividad o el CDN falla, mapa/graficos pueden no cargar. Luego el SW puede cachearlas, pero el primer arranque depende de internet externo.

**Evidencia:**
- Leaflet y MarkerCluster desde `unpkg.com` en `index.html:13-16` y `index.html:1056-1058`.
- Chart.js desde `cdn.jsdelivr.net` en `index.html:1060`.
- El SW intenta cachear esos hosts (`sw.js:61-62`), pero no hay copia local.

**Correccion recomendada:**
- Vendorear versiones minificadas auditadas en `assets/vendor`.
- Mantener CDN como fallback secundario, no como unica fuente.

### 8. Concentracion excesiva en `mec-form.js`

**Severidad:** Media
**Impacto:** riesgo alto de regresiones. El archivo concentra render, estado, geometria, edicion, evidencias, exportaciones y eventos en aproximadamente 18.680 lineas.

**Evidencia:**
- `assets/js/mec-form.js`: 930 KB y 18.680 lineas.

**Correccion recomendada:**
- Extraer gradualmente modulos internos: geometria, hit testing, render canvas, evidencias, exportaciones, formularios/fichas y acciones de plano.
- Antes de refactor, crear pruebas de caracterizacion de funciones criticas: solape, clamp, conversion metros/pixeles, rotacion, resize, nudge, seleccion.

### 9. Validacion automatica insuficiente para el nivel de riesgo

**Severidad:** Media
**Impacto:** `node --check` detecta sintaxis, pero no detecta funciones no exportadas, flujos rotos, errores de consola ni regresiones visuales.

**Evidencia:**
- No hay `package.json` ni scripts `test/lint`.
- La bitacora registra principalmente `node --check` y pruebas manuales/headless puntuales.
- Intento de `node --check` sobre `.gs` no es aplicable directamente por extension y entorno Apps Script.

**Correccion recomendada:**
- Agregar `package.json` con scripts:
  - `check:js`
  - `check:refs`
  - `test:unit`
  - `test:e2e`
  - `test:sw`
- Usar Playwright para flujos criticos: login demo/admin, nuevo bloque, piso, dos aulas, mover, borrar bloque, sanitario, rampa izquierda/derecha, offline/sync.
- Agregar validacion GAS con `clasp`, o pipeline que copie `.gs` a `.js` temporal y ejecute analisis compatible.

### 10. Documentacion y metadatos desactualizados

**Severidad:** Media
**Impacto:** confusion operativa, despliegues erroneos y usuarios creyendo que siguen en una version vieja.

**Evidencia:**
- `assets/js/config.js:4` dice `Version: 2.6.38`, mientras `APP_CONFIG.VERSION` es `2.6.42` en `assets/js/config.js:20-21`.
- `README.md` conserva referencias a `Version 2.0.0 | Paraguay 2025`.
- `DEPLOY_CHECKLIST.md` conserva instrucciones y credenciales iniciales de etapas anteriores.

**Correccion recomendada:**
- Unificar version en una sola fuente de verdad.
- Generar version visible y `CACHE_NAME` desde el mismo dato.
- Actualizar README y checklist para v2.6.42, retirando credenciales concretas.

## Matriz de prioridad

| Prioridad | Accion | Beneficio |
| --- | --- | --- |
| P0 | Exportar las 6 funciones poligonales faltantes | Elimina errores de botones visibles en plano |
| P0 | Sacar fotos/base64 del JSON de localStorage | Evita perdida de borradores en campo |
| P1 | Idempotencia de cola offline y GAS | Evita duplicados y estados falsamente sincronizados |
| P1 | LockService en escrituras GAS | Reduce carreras con multiples tablets |
| P1 | Hardening de auth | Reduce riesgo de acceso no autorizado |
| P1 | SW: cachear solo respuestas validas | Reduce problemas de version/cache corrupta |
| P2 | Playwright + pruebas de referencias globales | Detecta regresiones antes de publicar |
| P2 | Vendorizar dependencias CDN | Mejora arranque offline/con baja conectividad |
| P2 | Modularizar `mec-form.js` | Baja costo y riesgo de futuras correcciones |
| P3 | Actualizar docs/metadatos | Reduce confusion de despliegue y soporte |

## Pruebas minimas recomendadas antes de proxima entrega

1. Crear bloque, piso, dos aulas y un sanitario; mover todos por arrastre directo y por pad tactil.
2. Pulsar todos los botones contextuales del plano y verificar consola sin errores.
3. Crear aula y sanitario con `Forma L`, agregar/quitar vertices y volver a rectangular.
4. Crear rampa, alternar `Caida izq.` / `Caida der.`, `Voltear H`, exportar SVG y verificar consistencia visual.
5. Cargar 5 fotos reales desde tablet, cerrar/reabrir app, confirmar que el borrador no se pierde.
6. Trabajar offline: iniciar sesion/modulo, crear incidencia, volver online y sincronizar sin duplicados.
7. Actualizar app desde una version anterior y verificar `APP_CONFIG.VERSION`, `CACHE_NAME` y SW activo.
8. Ejecutar auditoria de referencias `MecFormModule.*` antes de cada commit.

## Conclusion

El instrumento ya tiene mucha funcionalidad de campo resuelta, pero su riesgo principal no esta en la sintaxis sino en tres frentes: llamadas globales no verificadas, almacenamiento local de evidencias pesadas y sincronizacion offline no idempotente. Corregir esos puntos antes de seguir sumando herramientas al plano va a mejorar mucho la confiabilidad real en tablets y reducir regresiones en cada version.
