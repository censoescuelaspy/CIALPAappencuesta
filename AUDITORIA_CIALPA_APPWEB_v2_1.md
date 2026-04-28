# Auditoría técnica profunda, CIALPA AppWeb v2.1

## 1. Alcance

Esta versión corrige la app web de apoyo operativo para el prepiloto, el piloto y el relevamiento grande de infraestructura educativa. La app no reemplaza el cuestionario externo, sino que funciona como consola de campo, trazabilidad, control de tiempos, asignación, cronograma, incidencias y supervisión.

## 2. Hallazgos críticos

### H1. La app no reconocía la lista de escuelas

La hoja `escuelas_seleccionadas` del libro `muestreo_escuelas_cialpa.xlsx` tiene un esquema de muestreo con encabezados como `ENUMERA`, `DEPTO`, `DIST`, `LOCALIDAD`, `ZONA`, `CODIGO`, `NOMBRE`, `LAT_DEC`, `LNG_DEC`, `MATRICULA`, `AULAS_EST`, entre otros.

La app v2.0 esperaba otro esquema operativo, con campos como `id_escuela`, `codigo_local`, `nombre`, `departamento`, `distrito`, `latitud`, `longitud`, `estado_relevamiento`. Por eso los mapas, listas y botones recibían objetos sin campos esperados, lo que hacía que las escuelas no aparecieran o no pudieran seleccionarse correctamente.

### H2. El flujo de encuesta asumía un formulario web controlado por la app

La app v2.0 abría una URL fija del formulario MEC. En la operación real, el cuestionario se aplica en otro aplicativo instalado en el dispositivo, sobre el cual esta app no tiene control interno.

Por seguridad técnica, un navegador no puede saber automáticamente cuándo otra app nativa guardó el último registro, salvo que esa app externa provea alguno de estos mecanismos:

1. Deep link de apertura con retorno.
2. Intent URI de Android con parámetros.
3. API de consulta.
4. Exportación periódica a un backend común.
5. Webhook o mecanismo de callback.

La versión v2.1 implementa la mejor solución posible sin modificar la app externa: apertura configurable del aplicativo externo, medición de tiempo desde servidor, registro manual asistido de folio externo, último registro y tiempos por módulo.

### H3. El control de tiempos era insuficiente

La versión v2.0 registraba una sesión general, pero no permitía medir tiempos por módulos, cosa necesaria porque el instrumento de infraestructura incluye escuela y todos sus espacios físicos.

La versión v2.1 agrega `modulos_relevamiento` y un control modular con inicio y cierre de cada bloque.

### H4. Faltaba estructura operativa para el relevamiento grande

La hoja de escuelas no incorporaba campos de cronograma, supervisor, encuestador, orden de visita, prioridad, folio externo ni último registro externo. La versión v2.1 agrega estas columnas sin eliminar el esquema de muestreo original.

## 3. Correcciones implementadas

### Backend GAS

Archivos modificados:

- `gas/Code.gs`
- `gas/sheets.gs`
- `gas/setup.gs`

Cambios principales:

1. Normalización automática de escuelas desde encabezados originales del muestreo.
2. Lectura directa de `CODIGO`, `NOMBRE`, `DEPTO`, `DIST`, `LAT_DEC`, `LNG_DEC`.
3. Conversión a esquema canónico usado por la app.
4. Creación de columnas operativas sin borrar columnas originales.
5. Creación de hoja `modulos_relevamiento`.
6. Registro de inicio/cierre de sesión con hora de servidor.
7. Registro de inicio/cierre de módulos.
8. Registro de apertura de app externa.
9. Registro de folio externo y último registro externo al cierre.
10. Resumen operativo para supervisión.
11. Migración `migrarBackendV21()` para actualizar el libro existente.

### Frontend

Archivos modificados:

- `assets/js/api.js`
- `assets/js/survey.js`
- `assets/js/config.js`
- `assets/css/app.css`
- `index.html`

Cambios principales:

1. Demo corregido con esquema canónico real.
2. Nuevo botón operativo para abrir la app externa.
3. Configuración de apertura mediante:
   - `FORM_LAUNCH_MODE`
   - `FORM_URL`
   - `FORM_ANDROID_INTENT_URL`
   - `FORM_CUSTOM_SCHEME_URL`
   - `FORM_FALLBACK_SECONDS`
4. Medición del tiempo total del relevamiento.
5. Medición de tiempos parciales por módulo.
6. Recuperación correcta de sesiones abiertas sin reiniciar el cronómetro en cero.
7. Registro de cierre parcial si no se completaron todos los módulos.
8. Solicitud de folio externo, último registro externo y observaciones de cierre.
9. Mejoras visuales en tarjetas de módulos.

## 4. Nuevas hojas y columnas operativas

### `escuelas_seleccionadas`

Se preservan las columnas originales y se agregan columnas operativas:

- `id_escuela`
- `codigo_local`
- `nombre`
- `departamento`
- `distrito`
- `localidad`
- `zona`
- `latitud`
- `longitud`
- `estado_relevamiento`
- `encuestador_asignado`
- `supervisor_asignado`
- `fecha_ultimo_evento`
- `observaciones`
- `orden_visita`
- `fecha_programada`
- `turno_programado`
- `prioridad_operativa`
- `tiempo_estimado_min`
- `ultima_sesion_id`
- `folio_externo`
- `ultimo_registro_externo`

### `sesiones_relevamiento`

Ahora registra duración, GPS de inicio/fin si el dispositivo lo permite, URL o deep link usado, folio externo, último registro externo, módulos completados y calidad del cierre.

### `modulos_relevamiento`

Registra un renglón por módulo iniciado o cerrado, con duración parcial y observaciones.

## 5. Configuración para abrir la app externa

En la hoja `configuracion` se agregan estas claves:

| Clave | Uso |
|---|---|
| `FORM_LAUNCH_MODE` | `web`, `android_intent` o `custom_scheme` |
| `FORM_URL` | URL web de respaldo |
| `FORM_ANDROID_INTENT_URL` | Intent URI para Android |
| `FORM_CUSTOM_SCHEME_URL` | Esquema personalizado de la app externa |
| `FORM_FALLBACK_SECONDS` | Tiempo de espera antes de abrir respaldo web |

Mientras no se conozca el package name, intent o esquema real del aplicativo externo, se debe usar `FORM_LAUNCH_MODE = web` o dejar la apertura como fallback.

## 6. Pasos de despliegue

1. Reemplazar los archivos del repositorio GitHub por el contenido de esta versión.
2. Reemplazar los archivos `.gs` del proyecto Apps Script por los incluidos en la carpeta `gas`.
3. En Apps Script, ejecutar una vez `migrarBackendV21()`.
4. Autorizar permisos cuando Google lo solicite.
5. Verificar que la hoja `escuelas_seleccionadas` conserve las columnas originales y tenga agregadas las columnas operativas.
6. Configurar la apertura del aplicativo externo en la hoja `configuracion`.
7. Probar flujo completo:
   - Login.
   - Carga de mapa y lista de escuelas.
   - Selección de escuela.
   - Inicio de sesión.
   - Apertura de app externa.
   - Inicio y cierre de módulos.
   - Cierre final con folio externo.
   - Revisión de hojas `sesiones_relevamiento`, `modulos_relevamiento` y `eventos_relevamiento`.

## 7. Limitación técnica explícita

Esta app no puede leer automáticamente el último registro guardado dentro del aplicativo externo si dicho aplicativo no expone integración. Por ello, la versión v2.1 registra evidencia operativa indirecta, robusta y auditable: hora de inicio, hora de cierre, módulos, folio externo, último registro declarado, usuario, escuela, GPS y eventos.
