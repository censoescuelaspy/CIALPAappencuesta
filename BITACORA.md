# CIALPA — Bitácora de Implementación
**Relevamiento de Infraestructura Escolar — Paraguay 2026**
**Financiado por:** Banco Mundial

---

## Registro guiado: mapa sin divisor inferior - 2026-06-02 - v2.6.167

### Objetivo
- Eliminar la divisoria que aparecia debajo del mapa en `Ubicacion escuela`.
- Permitir que el mapa incrustado use el espacio vertical que quedaba vacio bajo la imagen.

### Problema reportado
- El separador inferior del mapa no aportaba una accion clara y dejaba una zona desperdiciada debajo del plano.
- El separador vertical de panel podia quedar visualmente centrado en esa zona vacia, confundiendo la manipulacion del mapa.

### Cambios implementados
- `assets/js/guided-register.js`: se elimina el separador inferior `school-map-height` del mapa incrustado.
- `assets/css/app.css`: la grilla del mapa deja de reservar una fila para esa divisoria.
- `assets/css/app.css`: el plano incrustado en el paso de ubicacion usa todo el alto disponible del slot.
- `assets/css/app.css`: el separador vertical del panel de preguntas queda acotado arriba, sin proyectarse debajo del mapa.
- `index.html`, `assets/js/config.js`, `assets/js/guided-register.js`, `sw.js`: version actualizada a `2.6.167`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local HTTP: `index.html` contiene `v2.6.167`; `guided-register.js` y `app.css` ya no contienen `guided-school-resize--map-height`; `app.css` contiene la grilla del mapa ajustada.
- Verificacion publica GitHub Pages: `index.html` sirve `v2.6.167`; `guided-register.js` y `app.css` ya no contienen `guided-school-resize--map-height`; `app.css` contiene la grilla del mapa ajustada.

### Estado
- Commit publicado: `a96cab8 fix: quitar divisor inferior del mapa guiado`.

---

## Base mapa alta resolucion con calles superpuestas - 2026-06-02 - v2.6.166

### Objetivo
- Hacer mas accesible la base de alta resolucion del plano vivo.
- Permitir que `Calles` muestre nombres y trazados por encima de la base satelital/Google, sin reemplazarla.

### Problema reportado
- El boton mas importante para trabajar sobre imagen nitida quedaba poco destacado.
- Al usar `Calles`, la app cambiaba de base y se perdia claridad para identificar techos y accesos.

### Cambios implementados
- `assets/js/mec-form.js`: `Calles` deja de actuar como fuente base y pasa a ser una capa superpuesta (`streetOverlay`) con opacidad propia.
- `assets/js/mec-form.js`: el render del plano dibuja dos capas sincronizadas: base satelital/Google y etiquetas transparentes de calles encima.
- `assets/js/config.js`: se agrega `PLAN_BASEMAP_STREET_OVERLAY_TILE_URL`, atribucion y opacidad por defecto.
- `assets/js/guided-register.js`: los botones y textos pasan a decir `Calles encima`, y el estado activo se lee desde el overlay.
- `assets/css/mec-form.css` y `assets/css/app.css`: se destaca el boton `Alta res.` y se agregan estilos para el overlay de calles.
- `index.html`, `assets/js/config.js`, `assets/js/guided-register.js`, `sw.js`: version actualizada a `2.6.166`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local HTTP: `http://127.0.0.1:8765/index.html?qa=<timestamp>` contiene `v2.6.166`.
- Verificacion local HTTP de assets: `mec-form.js` contiene `togglePlanStreetOverlay` y `PLAN_BASEMAP_STREET_OVERLAY`; `guided-register.js` contiene `Calles encima`; `mec-form.css` contiene `school-plan-basemap__tiles--street-overlay`.
- Verificacion publica GitHub Pages: `index.html`, `mec-form.js`, `guided-register.js` y `mec-form.css` sirven `v2.6.166` y los cambios esperados con cache-busting.

### Estado
- Commit publicado: `e1d6021 feat: superponer calles sobre mapa alta resolucion`.
- Archivos MP4 sin seguimiento en `tools/earthengine/` se mantienen fuera de este cambio.

---

## Rendimiento de tableros y mapa MEC coropletico - 2026-06-02

### Objetivo
- Reducir la latencia al abrir vistas y al usar botones de filtro de tableros.
- Reemplazar el mapa MEC poco util por una lectura territorial tipo coropletica.
- Permitir filtrar resultados y estadisticas por `Piloto muestral` y `Etapa censal`.

### Problema reportado
- Las vistas y filtros de dashboards cargaban lento porque cada cambio podia volver a consultar/calcular estadisticas completas.
- La vista `Infraestructura MEC` no daba una lectura territorial clara y el mapa dependia de puntos/tiles.
- Los tableros no distinguian claramente etapa piloto muestral vs etapa censal.

### Cambios implementados
- `assets/js/stats.js`: cache de tablero base, reentrada rapida a Estadisticas/Infraestructura y filtros locales instantaneos cuando ya hay datos.
- `assets/js/stats.js`: Chart.js queda diferido; primero se pintan KPIs, tablas y fallbacks CSS, luego se mejoran los graficos en segundo plano.
- `assets/js/local-store.js`: analitica local filtrable por etapa, departamento, distrito y encuestador usando el padron cacheado.
- `assets/js/api.js`: fallback offline de `getStats` respeta los filtros solicitados.
- `assets/js/stats.js` y `assets/css/app.css`: mapa MEC reemplazado por coropleta territorial por departamento/distrito con capas de riesgo, fallas, escuelas, evidencia y area.
- `index.html`: filtro `Etapa` agregado al tablero estadistico.
- `assets/js/config.js`, `index.html`, `sw.js`: version actualizada a `2.6.165` para cache-busting y trazabilidad.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/local-store.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local: `http://127.0.0.1:8765/index.html` responde `200` con `v2.6.165`.
- Verificacion publica: GitHub Pages responde `200`, `index.html` contiene `v2.6.165` y `assets/js/stats.js` contiene `mec-choropleth-map`.

### Estado
- Commit publicado: `7494e54 feat: acelerar tableros y mapa MEC`.

---

## Registro guiado: contenedores ajustables y mapa activo - 2026-06-02

### Objetivo
- Recuperar el dato visible de la escuela activa dentro del paso `Ubicacion escuela`.
- Evitar que el mapa del paso 1 aparezca apagado cuando ya existen coordenadas de la escuela.
- Reducir el desperdicio vertical de pantalla y permitir que el usuario ajuste los contenedores de preguntas y mapa.

### Cambios implementados
- `assets/js/guided-register.js` agrega una barra de identidad dentro del mapa con escuela, codigo/localidad, coordenadas y estado de la base mapa.
- El paso `Ubicacion escuela` activa automaticamente la base mapa si existen coordenadas, sin pedir al usuario que pulse primero `Satelite`.
- Se agregan separadores arrastrables: uno vertical para cambiar el ancho del panel de preguntas y uno horizontal para cambiar el alto del mapa.
- Las preferencias de tamano del panel de preguntas y del mapa se conservan en `localStorage`.
- `assets/css/app.css` cambia el layout del paso 1 a una grilla ajustable y hace que el mapa use mas alto visible de pantalla.
- Version visible y cache del Service Worker actualizados a `v2.6.162`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local: `http://127.0.0.1:8765/index.html` responde `200` con `v2.6.164`.

---

## Flujo guiado estable y botones claros - 2026-06-02

### Objetivo
- Evitar que al pasar de `Ubicacion escuela` a `Perimetro predio` se reordenen los contenedores de preguntas y mapa.
- Hacer funcional el boton `Calles` para revisar nombres/trazados de calles.
- Marcar con claridad que botones estan activos.
- Mantener `Anterior` y `Siguiente` siempre visibles como navegacion flotante.
- Dejar disponibles los controles del plano desde la primera vista.

### Problema reportado
- El paso 2 recuperaba una distribucion vieja y movia el plano a otro contenedor.
- `Calles` actuaba como interruptor generico de base mapa y no seleccionaba la capa de calles.
- Los estados activo/inactivo de los botones no eran faciles de distinguir.
- La navegacion anterior/siguiente podia quedar fuera de la vista.

### Cambios implementados
- `assets/js/guided-register.js`: todos los pasos del registro guiado usan la misma estructura con preguntas a la izquierda y plano a la derecha.
- `assets/js/guided-register.js`: `Calles` usa ahora `setPlanBaseMapSource('street')` mediante la accion `basemapStreet`.
- `assets/js/guided-register.js`: se agrego navegacion flotante fija para `Anterior` y `Siguiente`.
- `assets/js/guided-register.js`: los botones Satelite, Calles, Mover base y Guardar base reflejan estado con `aria-pressed` y clase activa.
- `assets/js/mec-form.js`: se expone `getPlanBaseMapState()` para que el registro guiado pueda leer fuente, estado, guardado y modo mover base.
- `assets/css/app.css`: se habilitan los controles del plano dentro de la vista guiada y se refuerza el contraste del estado activo.
- `assets/js/config.js`, `index.html`, `sw.js`: version actualizada a `2.6.164` para cache-busting y trazabilidad.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

### Publicacion
- Commit de implementacion publicado: `741e6c4`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `index.html`, `guided-register.js`, `mec-form.js`, `app.css` y `sw.js` responden HTTP 200 y entregan `v2.6.162`.
- `assets/js/guided-register.js` publicado contiene `guided-school-resize`, `data-guided-inline-school-name` y `ensureGuidedLocationBaseMap`.
- `assets/js/mec-form.js` publicado contiene y exporta `ensureGuidedLocationBaseMap`.

## Plano vivo: paneo tactil, perimetro y Mover base - 2026-06-02

### Objetivo
- Permitir mover el mapa/plano arrastrando con dedo o cursor sobre una zona libre.
- Reducir la confusion entre pines geograficos del perimetro y tiradores reales de ajuste.
- Hacer mas visible y accesible el boton `Mover base` desde el primer control.

### Cambios implementados
- `assets/js/mec-form.js` agrega paneo directo del viewport del plano vivo: arrastrar espacio libre desplaza el mapa sin tocar zoom ni objetos.
- El paneo por dedo queda separado del gesto de cambio de etapa en Registro guiado.
- El perimetro muestra tiradores cuadrados mas grandes y con borde naranja solo cuando su edicion esta activa.
- Los puntos de coordenadas del perimetro se dibujan como referencias desplazadas y mas pequenas durante la edicion, evitando solaparse con los tiradores.
- `Mover base` queda renombrado y destacado en la cinta del plano, y tambien aparece dentro del mapa del paso `Ubicacion escuela`.
- Version visible y cache del Service Worker actualizados a `v2.6.161`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

### Publicacion
- Commit de implementacion publicado: `bef7b37`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `index.html`, `config.js`, `guided-register.js`, `mec-form.js`, `app.css` y `sw.js` responden HTTP 200 y entregan `v2.6.161`.
- `assets/js/guided-register.js` publicado contiene `moveBase`.
- `assets/js/mec-form.js` publicado contiene `planPanDrag`.
- `assets/css/app.css` publicado contiene `school-plan__canvas--panning`.

## Registro guiado: mapa de ubicacion en primer control - 2026-06-02

### Objetivo
- Mover el mapa del plano vivo a la zona amplia del paso `Ubicacion escuela`.
- Eliminar la fila horizontal de comandos marcada por el usuario con X y reubicar sus acciones dentro del mapa.
- Reducir desperdicio de pantalla en el primer control sin perder los comandos de georreferencia.

### Cambios implementados
- `assets/js/guided-register.js` deja de renderizar la fila de acciones `Mapa / Calles / Usar coords / Guardar base` en el paso 1.
- El contenedor real del plano `guided-school-plan-root` se mueve dinamicamente: queda dentro del paso `Ubicacion escuela` y vuelve al panel inferior al pasar a las demas etapas.
- Se agrega una botonera compacta dentro del mapa para `Satelite`, `Calles`, `Usar coords`, `Guardar base` y `Elegir escuela`.
- `assets/css/app.css` define una grilla especial para el paso 1: formulario compacto a la izquierda y mapa vivo a la derecha, con adaptacion movil.
- Version visible y cache del Service Worker actualizados a `v2.6.160`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

### Publicacion
- Commit de implementacion publicado: `d259296`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `index.html`, `config.js`, `guided-register.js`, `app.css` y `sw.js` responden HTTP 200 y entregan `v2.6.160`.
- `assets/js/guided-register.js` publicado contiene `guided-school-map-shell` y `_movePlanSurfaceForActiveStep`.
- `assets/css/app.css` publicado contiene `guided-slide--school-location` y `guided-register--map-inline`.

## Apunte a GAS propietario actualizado - 2026-06-02

### Objetivo
- Volver a apuntar la app al Web App actualizado por la cuenta propietaria/autorizada.
- Confirmar que el deployment `AKfycbyt-TH...` ya responde publico sin HTTP 403.
- Forzar cache nuevo para que los usuarios tomen el backend con el recuento admin corregido.

### Cambios implementados
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbyt-THSOSgFwvH8Oxl8ojpfJR_8gNhezYA1N7JPmgG0L2RyEtfHq9E58BgfcG33yD2voA/exec`.
- Version visible y cache del Service Worker actualizados a `v2.6.159`.

### Validaciones ejecutadas
- Prueba HTTP del Web App propietario para `diagnosticoPadron`: responde `status: ok`, `source: official_sheet`, `total: 5462`, `muestra_piloto: 86`.
- Prueba HTTP del Web App propietario para `login` sin datos: responde `Usuario y contraseña son requeridos`.
- Prueba HTTP del Web App propietario para `getEscuelas` sin token: responde `Token invalido o expirado`, confirmando proteccion de endpoints privados.
- `node --check assets/js/config.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/stats.js`.
- `node --check sw.js`.
- `git diff --check`.

### Publicacion
- Commit publicado: `a7d2caf`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `config.js`, `index.html` y `sw.js` responden HTTP 200 y entregan `v2.6.159`.
- `assets/js/config.js` publicado contiene el deployment propietario `AKfycbyt-TH...`.
- Prueba HTTP final del Web App propietario para `diagnosticoPadron`: HTTP 200 con `official_sheet`.

## Infraestructura MEC: tablero, mapa y recuento admin - 2026-06-01

### Objetivo
- Quitar el texto innecesario de la vista MEC infraestructura.
- Mejorar de forma sustantiva KPIs, tablas, figuras y mapa del tablero MEC.
- Corregir el recuento por usuario para que los registros completados por `admin` se reflejen como los de cualquier usuario operativo.

### Cambios implementados
- Se simplifica el encabezado de infraestructura MEC y se agrega una fila de diagnostico ejecutivo con profundidad de carga, area media, ambientes por escuela, territorios criticos, evidencia y seguridad electrica.
- El tablero agrega figuras nuevas: ranking territorial de riesgo, coberturas criticas y matriz territorial por escuelas/fallas/evidencia.
- El mapa MEC usa coordenadas reales cuando existen y centroides conocidos por departamento cuando faltan latitud/longitud; si Leaflet falla, muestra un mapa sintetico con puntos de riesgo.
- El mapa MEC habilita zoom, arrastre y touch para exploracion directa.
- El resumen por encuestador ahora considera sesiones completadas por el usuario real, incluyendo `admin`, y expone `sesiones` y `registros_completados`.
- El backend permite operar escuelas a usuarios con rol `admin`, alineado con el comportamiento del frontend.
- `APP_CONFIG.GAS_URL` vuelve a apuntar al Web App publico estable `AKfycbzrXilB80CszA0EDVj-SO7rJ9SmDY1Yg_Ym1qFgKmSdgfftK0uo1uRclsEq4uroSnfSJQ`, porque el deployment `AKfycbyt-TH...` responde HTTP 403 anonimo.
- Version publicada preparada como `v2.6.158`.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/local-store.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check` sobre copia temporal `.js` de `gas/sheets.gs`.
- `git diff --check`.
- `clasp push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `clasp version`: crea version Apps Script `27`.
- `clasp deploy -i AKfycbyt-TH...`: intento de publicacion queda en `@28`, pero la URL responde HTTP 403 `Necesitas acceso`.
- `clasp deploy -i AKfycbyt-TH... -V 26`: rollback a `@26`, pero esa URL continua respondiendo HTTP 403 anonimo.
- Prueba HTTP del Web App publico estable `AKfycbzr...` para `diagnosticoPadron`: responde `status: ok`, `source: official_sheet`, `total: 5462`, `muestra_piloto: 86`.
- Prueba HTTP del Web App publico estable `AKfycbzr...` para `login` sin datos: responde `Usuario y contraseña son requeridos`.
- Prueba HTTP del Web App publico estable `AKfycbzr...` para `getEscuelas` sin token: responde `Token invalido o expirado`, confirmando proteccion de endpoints privados.

### Pendiente operativo
- Publicar Apps Script desde la cuenta propietaria/aceptada para que el arreglo backend del recuento admin quede activo en el Web App publico sin generar HTTP 403.

### Publicacion
- Commit de implementacion publicado: `8f0d375`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `config.js`, `stats.js`, `index.html` y `sw.js` responden HTTP 200 y entregan `v2.6.158`.
- `assets/js/config.js` publicado apunta al Web App publico estable `AKfycbzr...`.
- `assets/js/stats.js` publicado contiene `mec-diagnostic-grid` y ya no contiene `Centro de inteligencia edilicia`.

## Plano vivo: tableros, guias y cableado - 2026-05-31

### Objetivo
- Hacer que el tablero electrico se incruste en la pared del aula o sanitario seleccionado, igual que otros elementos de pared.
- Facilitar que dos ambientes puedan igualar largo o ancho con referencias visuales y ajuste automatico al redimensionar.
- Representar el sistema electrico con lineas de cableado que puedan mostrarse u ocultarse desde capas.

### Cambios implementados
- Los tableros de aulas y sanitarios se anclan a la pared mas cercana al insertarlos o moverlos.
- Se agrega la capa `Cableado`, separada de `Electricidad/equipos`, para mostrar u ocultar las conexiones.
- El plano dibuja cableado desde acometida, medidor, tablero principal y puesta a tierra hacia tableros locales.
- Las luces, enchufes, ventiladores y aires se conectan al tablero local mas cercano, o a la fuente electrica disponible.
- Al redimensionar aulas o sanitarios, el largo y ancho se ajustan a medidas similares de otros ambientes del mismo piso/bloque cuando estan cerca.
- Se muestran guias `mismo largo` y `mismo ancho` al seleccionar o redimensionar ambientes con dimensiones coincidentes.
- Version publicada preparada como `v2.6.157`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

### Publicacion
- Commit publicado: `aa45eac`.
- Push confirmado en `origin/main`.
- GitHub Pages verificado con cache-busting: `config.js`, `index.html` y `mec-form.js` entregan `v2.6.157`, capa `cableado` y `_drawPlanElectricalBackbone`.

## Rutas reales Google en mapa - 2026-05-31

### Objetivo
- Reemplazar, cuando sea posible, las rutas rectas por recorridos reales calculados por Google Routes API.
- Mantener una salida inmediata y estable aunque Google no responda, falte una clave habilitada o el equipo este sin conexion.

### Cambios implementados
- El mapa dibuja primero la linea directa como respaldo para no dejar vacia la visualizacion.
- Si hay una clave Google disponible y la opcion esta activa, la app solicita `computeRoutes` y reemplaza la linea directa por la polilinea real de manejo.
- Las rutas largas se dividen en tramos para respetar el limite de puntos intermedios y se cachean por coordenadas para evitar recalculos innecesarios.
- Si Google Routes falla o no esta habilitado para la clave actual, se muestra un aviso y se conservan las lineas directas.
- Se agrega configuracion `GOOGLE_ROUTES_API_KEY` y `MAP_REAL_ROUTES_ENABLED`.
- Version publicada preparada como `v2.6.156`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Preflight CORS de `routes.googleapis.com/directions/v2:computeRoutes` desde `https://censoescuelaspy.github.io` permite `POST`, `content-type`, `x-goog-api-key` y `x-goog-fieldmask`.

## Bloques movibles dentro del perimetro - 2026-05-31

### Objetivo
- Corregir que un bloque ajustado dentro del perimetro se pegara al borde superior del predio y luego no pudiera bajarse.
- Hacer que la restriccion del predio sea operativa para dibujo satelital, sin saltos bruscos al mover bloques en perimetros rotados o irregulares.

### Cambios implementados
- El ajuste de bloques dentro del perimetro ahora respeta la posicion mientras el centro del bloque permanezca dentro del predio.
- Si el bloque queda fuera, la app busca la posicion mas cercana con centro dentro del perimetro antes de recurrir a una ubicacion completamente contenida.
- Esto evita que el buscador de posiciones empuje el bloque al borde superior cuando el rectangulo completo no entra matematicamente en un poligono rotado o irregular.
- Version publicada preparada como `v2.6.155`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.

## Perimetro visible al estirar predio - 2026-05-31

### Objetivo
- Resolver que el perimetro del predio se sintiera encerrado por el lienzo y quedara recortado al aumentar largo/ancho.
- Evitar que al agrandar el lienzo la base satelital se desplace respecto de los vectores guardados.

### Cambios implementados
- El lienzo del plano general ahora puede crecer hasta `4200 x 4200 px`.
- Al redimensionar o mover el perimetro, el lienzo se expande automaticamente si el predio necesita mas espacio, tambien hacia arriba o izquierda.
- Al cambiar el tamano del lienzo se compensa `offsetX/offsetY` de la base mapa para conservar la alineacion satelital/vectorial.
- Al soltar el perimetro luego de mover, girar, estirar o editar vertices, la vista se reencuadra y reduce zoom si hace falta para ver el predio completo.
- Version publicada preparada como `v2.6.154`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.

## Script Earth Engine con muestra real - 2026-05-30

### Objetivo
- Proveer un unico script para Earth Engine que genere exportaciones GeoTIFF para las 86 escuelas muestreadas.
- Tomar la muestra real desde el Excel operativo de inventario y dejar el codigo listo para copiar/pegar en Code Editor.
- Resolver el problema operativo de tener que iniciar manualmente una tarea por escuela en la pestaña `Tasks`.

### Fuente usada
- Archivo real localizado: `G:\Mi unidad\CIALPA\03_DATOS\Inventarios_Escuelas\Listado_Relevamiento infraestructura 2026_original_procesado_MUETREO.xlsx`.
- Hoja usada: `muestra_final`.
- Columnas usadas: `CODIGO`, `NOMBRE`, `DEPTO`, `DIST`, `LOCALIDAD`, `LAT_DEC`, `LNG_DEC`.
- Total generado: `86` escuelas con coordenadas.

### Cambios implementados
- Se agrega `tools/earthengine/cialpa_pilot_batch_template.js` como template reusable para Earth Engine con soporte para lista pegada o tabla Asset.
- `tools/earthengine/generate_pilot_earthengine_batch.mjs` ahora escapa Unicode en strings para que el script generado sea ASCII y no se rompan acentos al copiar desde consola/editor.
- Se genera script privado no versionado en `tools/earthengine/output/cialpa_pilot_batch_earthengine.js`.
- Se genera worklist privada no versionada en `tools/earthengine/output/pilot-schools-worklist.json`.
- `tools/earthengine/cialpa_pilot_batch_template.js` queda completado con las 86 escuelas reales en `SCHOOLS`, para poder copiar el archivo directamente en Earth Engine sin depender del generador.
- Se corrige la localidad de `1006058` a `3 DE FEBRERO`, cruzando con el padron publico local, porque el Excel traia esa celda como fecha textual.
- Se agrega `tools/earthengine/start_pilot_ee_exports.py` para iniciar automaticamente las tareas de exportacion con la API Python de Earth Engine mediante `task.start()`.
- `tools/earthengine/README.md` documenta el flujo sin clic manual, instalacion de `earthengine-api`, autenticacion y ejecucion por tandas.

### Validaciones ejecutadas
- Extraccion de Excel con `openpyxl`: primera escuela `1005052`, ultima escuela `1108042`.
- `node --check tools\earthengine\generate_pilot_earthengine_batch.mjs`.
- `node --check tools\earthengine\output\cialpa_pilot_batch_earthengine.js`.
- `node --check tools\earthengine\cialpa_pilot_batch_template.js`.
- `rg` confirma que el script privado generado queda ASCII luego de escapar caracteres Unicode.
- Verificacion del arreglo embebido: `SCHOOLS.length = 86`; primera escuela `1005052`, ultima escuela `1108042`.
- `py -3 -m py_compile tools\earthengine\start_pilot_ee_exports.py`.
- `py -3 tools\earthengine\start_pilot_ee_exports.py --source=s2 --limit=1 --dry-run`: genera nombre de exportacion y log privado sin iniciar tareas reales.

### Pendiente operativo
- Copiar `tools\earthengine\output\cialpa_pilot_batch_earthengine.js` en Earth Engine Code Editor.
- Ejecutar `Run`; luego abrir `Tasks` y lanzar las 86 tareas de exportacion a Drive.
- Si Earth Engine se vuelve incomodo con 86 tareas, cambiar `EXPORT_START_INDEX` y `EXPORT_LIMIT` para procesar tandas.
- Alternativa recomendada para no hacer clic por tarea: ejecutar `py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi`.
- En el Python local actual puede faltar el paquete `ee`; instalar con `py -3 -m pip install earthengine-api`.
- Descargar/sincronizar los GeoTIFFs de `CIALPA_EE_PILOTO_ESCUELAS` y correr `install_pilot_highres_batch.py`.

## Lote de imagenes alta resolucion muestra piloto - 2026-05-30

### Objetivo
- Escalar el flujo de imagenes por escuela desde el piloto Isla Tuyu `101095` a la muestra piloto completa.
- Mantener el dibujo de perimetros y bloques como tarea manual del operador sobre una base visual nitida.
- Evitar publicar coordenadas operativas, worklists privadas o tiles restringidos dentro del repositorio.

### Criterio operativo
- La muestra piloto vigente fue diagnosticada en backend como `86` escuelas; el usuario la refiere como "casi 90".
- Para trabajo online, la base `Google`/Map Tiles queda como referencia visual principal para identificar predio, edificios, caminos y contexto.
- Para archivos descargables, Earth Engine solo puede exportar datasets exportables como NICFI/Planet u otra fuente licenciada; el fondo Google `SATELLITE` visto en Earth Engine no es exportable.
- NICFI se conserva como pipeline tecnico aproximado de `4.77 m`; si no alcanza para bloques finos, se reemplaza por ortofoto/submetro usando el mismo instalador.

### Cambios implementados
- Se agrega `tools/earthengine/build_pilot_imagery_worklist.mjs` para crear una worklist privada desde credenciales/token CIALPA o desde CSV/JSON privado con coordenadas.
- Se agrega `tools/earthengine/generate_pilot_earthengine_batch.mjs` para generar un script de Earth Engine por lote con `Export.image.toDrive` para todas las escuelas de la worklist.
- Se agrega `tools/earthengine/install_pilot_highres_batch.py` para convertir en lote los GeoTIFF descargados desde Drive y preparar tiles por codigo de escuela.
- `tools/earthengine/install_school_highres.py` deja de estar atado a `101095`; ahora acepta `--school-code`, crea manifiestos por escuela y activa fuentes sin borrar otras entradas.
- `.gitignore` excluye `tools/earthengine/output/`, CSV privados y GeoTIFFs locales de Earth Engine.
- `package.json` incorpora scripts `imagery:worklist` e `imagery:ee-batch`.
- `tools/earthengine/README.md` documenta el flujo completo: worklist privada, script Earth Engine, descarga de GeoTIFFs e instalacion de tiles.

### Uso resumido
```powershell
$env:CIALPA_USER='usuario'
$env:CIALPA_PASSWORD='clave'
npm run imagery:worklist
npm run imagery:ee-batch
```

Luego abrir `tools/earthengine/output/cialpa_pilot_batch_earthengine.js` en Earth Engine Code Editor, ejecutar y lanzar las tareas desde `Tasks`.

Para instalar los GeoTIFFs descargados:

```powershell
py -3 tools\earthengine\install_pilot_highres_batch.py --src-dir="G:\Mi unidad\CIALPA_EE_PILOTO_ESCUELAS"
```

### Validaciones ejecutadas
- `node --check tools\earthengine\build_pilot_imagery_worklist.mjs`.
- `node --check tools\earthengine\generate_pilot_earthengine_batch.mjs`.
- `py -3 -m py_compile tools\earthengine\geotiff_to_xyz_tiles.py tools\earthengine\install_school_highres.py tools\earthengine\install_pilot_highres_batch.py`.
- Parse de `package.json`.
- Ayuda CLI verificada para los generadores de worklist y script Earth Engine.
- Generacion de script Earth Engine con worklist ficticia bajo `tools/earthengine/output/`; sintaxis validada y archivos temporales eliminados.
- `rg` confirma que los archivos nuevos no introducen caracteres no ASCII.

### Pendiente operativo
- Ejecutar `npm run imagery:worklist` con token o credenciales reales CIALPA para producir la worklist privada de las 86 escuelas con coordenadas.
- Generar el script Earth Engine real y procesar la muestra en tandas si la cola de tareas resulta extensa.
- Descargar los GeoTIFFs desde Drive y correr el instalador por lote.
- Activar fuentes locales solo despues de revision visual; si NICFI no mejora la lectura, seguir usando Google online para trazado manual.
- `git push origin main` sigue sujeto a corregir la autenticacion GitHub HTTPS/SSH del equipo.

### Commit y publicacion
- Commit local de implementacion creado.
- Se intento `git push origin main`, pero el proceso quedo esperando autenticacion en Git Credential Manager y fue cerrado para no dejar procesos colgados.
- Verificacion remota posterior: `origin/main` sigue en `8b86ecb`, por lo que los commits locales aun no estan publicados.
- Reintento posterior de `git push origin main` exitoso: remoto actualizado de `8b86ecb` a `b538045`.

## Piloto Earth Engine alta resolucion Isla Tuyu - 2026-05-30 - v2.6.142

### Objetivo
- Ensayar una capa de imagen de alta resolucion para una escuela concreta de Isla Tuyu, Paraguay, antes de escalar a mas escuelas.
- Dejar preparado el flujo para exportar desde Google Earth Engine, convertir a tiles y vincularlos al plano vivo de la app.
- Mantener la operacion final como trazado manual de perimetros y bloques sobre una base visual nitida.

### Escuela piloto
- Codigo local: `101095`.
- Institucion: `ESCUELA BASICA N 2076`.
- Ubicacion: Concepcion / Paso Barreto / Isla Tuyu.
- Coordenadas de padron: `23º4'57.928"S`, `56º56'52.476"W`.
- Coordenadas decimales usadas: `-23.08275777777778`, `-56.94790999999999`.

### Cambios implementados
- Se agrega `tools/earthengine/isla_tuyu_101095_pilot.js` para ejecutar en Earth Engine Code Editor.
- El script prepara ROI de 500 m, visualiza punto/area, usa NICFI Americas como fuente recomendada y Sentinel-2 como fallback de menor resolucion.
- Se agrega manifiesto app-ready en `assets/data/highres-school-pilot-isla-tuyu-101095.json`.
- Se agrega carpeta destino `assets/imagery/schools/101095/tiles/` para colocar tiles XYZ exportados/convertidos.
- `APP_CONFIG` deja `PLAN_BASEMAP_HIGHRES_SOURCES` sin fuentes activas porque la imagen Sentinel-2 10 m no aporta utilidad operativa.
- `mec-form.js` mantiene soporte tecnico para una futura fuente `highres`, pero si un borrador viejo quedo con `source: highres` ahora cae automaticamente a `Satelite`.
- El boton local `S2 10 m` queda desactivado/no visible hasta contar con ortofoto, submetro o fuente licenciada de mayor resolucion.
- `isla_tuyu_101095_pilot.js` pasa a intentar `NICFI` por defecto y apaga el export Sentinel-2 para no volver a generar una capa borrosa como candidata operativa.
- El script ahora imprime una advertencia explicita: el fondo `SATELLITE` nitido del visor Earth Engine no es un `ee.Image` exportable; se usa solo para inspeccion visual.
- El ROI en Earth Engine cambia de poligono amarillo a borde amarillo para no tapar la imagen satelital durante la inspeccion.
- Se agrega `tools/earthengine/install_school_highres.py` para convertir un GeoTIFF NICFI descargado, actualizar el manifiesto y activar la fuente local solo con `--activate`.
- Se comprueba que Esri World Imagery devuelve imagen real en z17 para Isla Tuyu, pero z18-z21 devuelven tiles livianos de baja utilidad; por eso al acercar se ve borroso.
- Se agrega soporte opcional para Google Map Tiles API como fuente `Google` del plano vivo, visible solo si `APP_CONFIG.GOOGLE_MAP_TILES_API_KEY` esta configurado.
- Se mantiene el trazado manual de perimetros y bloques sobre la base `Google`/`Satelite`.
- Se retira el asistente semiautomatico de imagen para `Predio` y `Bloques` porque no dio resultados confiables en la prueba operativa.
- El ribbon conserva `Google`, `Terreno` y `Detalle` para ubicar la escuela, ver contexto de caminos/terreno y volver al detalle del edificio.
- El zoom de la fuente local se limita al rango disponible de tiles, `17-19`, para evitar solicitudes inexistentes.
- El service worker deja de precachear el manifiesto S2 piloto porque no se usa en la interfaz operativa.
- Version visible, cache y assets actualizados a `v2.6.142`.

### Bloqueo operativo
- El CLI local de Earth Engine existe, pero la credencial actual falla con `deleted_client: The OAuth client was deleted`.
- Por ese motivo no se pudieron lanzar tareas de exportacion desde consola en esta sesion.
- `earthengine ls projects/planet-nicfi/assets/basemaps/americas` falla por la misma credencial antes de poder validar permisos NICFI.
- El script queda listo para ejecutar desde Code Editor luego de reautenticar Earth Engine y habilitar/acceder a Planet NICFI.

### Pendiente operativo
- Si se quiere mejorar resolucion, habilitar NICFI en Earth Engine o conseguir una ortofoto/submetro con licencia.
- La imagen Sentinel-2 cargada no permite identificar bloques; se desactiva en la interfaz y queda solo como prueba tecnica del pipeline, no como insumo operativo de trazado arquitectonico.
- Descargar el export NICFI esperado `CIALPA_101095_ISLA_TUYU_NICFI_RGB_2024_2026.tif` y ejecutar `install_school_highres.py`; activar con `--activate` solo si supera visualmente a la base satelital.
- Si se consigue imagen submetro/ortofoto con licencia, usar el mismo instalador y estructura de tiles.
- Mantener la API key de Google restringida por referer/dominio y por API permitida antes de uso productivo.
- Probar en navegador real: seleccionar escuela `101095`, abrir plano, confirmar que ya no aparece el boton `S2 10 m`, que `Google` carga como base visual y que el perimetro se coloca manualmente.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check tools/earthengine/isla_tuyu_101095_pilot.js`.
- `py -3 -m py_compile tools\earthengine\geotiff_to_xyz_tiles.py tools\earthengine\install_school_highres.py`.
- Parse JSON de `assets/data/highres-school-pilot-isla-tuyu-101095.json`.
- GeoTIFF descargado localizado en `G:\Mi unidad\CIALPA_EE_PILOTO_ISLA_TUYU\CIALPA_101095_ISLA_TUYU_S2_RGB_2024_2026.tif`.
- Conversion local con `tools/earthengine/geotiff_to_xyz_tiles.py` a `assets/imagery/schools/101095/tiles/`, zoom `17-19`.
- Resultado de tiles: `332` PNG, aprox. `5.0 MB`; conteo por zoom: z17=`20`, z18=`72`, z19=`240`.
- `rg` para confirmar version/cache `v2.6.142`, `PLAN_BASEMAP_HIGHRES_SOURCES: {}` y soporte opcional `GOOGLE_MAP_TILES_API_KEY`.
- Servidor HTTP local `127.0.0.1:8078`: `index.html`, `config.js` y `sw.js` servidos con HTTP 200; `config.js` confirma fuentes locales vacias y `sw.js` ya no precachea el manifiesto S2.
- Servidor HTTP local `127.0.0.1:8078`: `index.html`, `config.js` y `mec-form.js` servidos con HTTP 200 en `v2.6.142`; se confirma presencia de `GOOGLE_MAP_TILES_API_KEY`, `google_satellite` y `tile.googleapis.com`.
- API key de Google Map Tiles cargada desde portapapeles sin imprimirla; `createSession` respondio HTTP 200 con sesion valida y teselas 256x256.
- API key de Google Map Tiles reemplazada por nueva clave desde portapapeles sin imprimirla; `createSession` vuelve a responder HTTP 200 con sesion valida.
- Se agregan presets `Terreno` y `Detalle` en el ribbon del plano: `Terreno` abre el encuadre para ver predio, calles y accesos; `Detalle` vuelve al zoom del edificio.
- Para Google satelital, el ajuste automatico pasa a usar zoom contextual menor y escala 1 para evitar que el edificio llene todo el lienzo y quede media hoja en blanco.
- Se elimina el asistente semiautomatico de imagen y sus botones `Predio`/`Bloques`; el perimetro y cada bloque quedan a cargo del operador mediante dibujo manual.
- `rg` confirma que ya no quedan exportaciones ni llamadas `suggestPlanBlocksFromImage` / `suggestPlanPropertyBoundaryFromImage` en `mec-form.js`.
- Servidor HTTP local `127.0.0.1:8078`: `config.js` confirma clave Google cargada y `mec-form.js` confirma flujo `google_satellite/createSession`.
- Tesela Google Map Tiles consultada con `Origin: http://127.0.0.1:8078`: HTTP 200 y `Access-Control-Allow-Origin` local, por lo que la base Google puede renderizarse en navegador local.
- Servidor HTTP local `127.0.0.1:8078` en `v2.6.142`: `index`, `config`, `mec-form` y `sw` responden HTTP 200; `mec-form` confirma `manualOk=True` y `googleOk=True`.
- Servidor HTTP local `127.0.0.1:8077`: tesela central `assets/imagery/schools/101095/tiles/19/179207/296708.png`, manifiesto, `config.js` y `mec-form.js` servidos con HTTP 200.
- Servidor HTTP local `127.0.0.1:8076`: `index.html`, `config.js`, `mec-form.js`, `sw.js`, manifiesto piloto y script Earth Engine servidos con HTTP 200.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Commit y publicacion
- Commit local preparado con el flujo manual y la version `v2.6.142`.
- `git push origin main` queda pendiente: GitHub rechazo la autenticacion HTTPS con `Invalid username or token`.
- `gh` no esta instalado en el entorno y SSH a GitHub devuelve `Permission denied (publickey)`.

## Fallback estable para base satelital del plano - 2026-05-26 - v2.6.135

### Objetivo
- Corregir el caso reportado donde la base satelital del plano no aparecia o devolvia `Map data yet not available`.
- Hacer que el plano tome coordenadas aunque la escuela venga con nombres de columna alternativos del padron oficial.

### Diagnostico
- La funcion satelital quedaba apoyada en zoom alto; en algunas zonas Esri puede devolver teselas sin imagen disponible.
- El plano reconocia `latitud/longitud`, `lat/lng` y variantes basicas, pero no todos los alias usados por padrones oficiales (`LAT_DEC`, `LNG_DEC`, `lat_dec`, `lng_dec`, `X/Y`, etc.).
- Si el plano no encontraba coordenadas, quedaba solo la cuadrilla con el mensaje generico de iniciar bloque, sin explicar que faltaba georreferencia.

### Cambios implementados
- `PLAN_BASEMAP_SATELLITE_MAX_ZOOM` baja a `17` para evitar teselas satelitales de zoom alto sin cobertura.
- `_schoolSnapshot()`, `_prefillGeneralFromSelectedSchool()` y `_schoolCoordinateDefaults()` reconocen alias amplios de latitud/longitud.
- El mensaje del plano vacio ahora distingue entre base visible, base apagada con coordenadas y falta de coordenadas.
- Version visible, cache y assets actualizados a `v2.6.135`.

### Pendiente operativo
- Pedir a encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.135`.
- Si una escuela sigue sin base satelital, revisar que la ficha tenga latitud/longitud o corregirla desde datos generales/georreferencia.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Playwright local escritorio: escuela simulada solo con `LAT_DEC/LNG_DEC`, satelite activo en zoom `17`, 6 vertices DMS generados, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: satelite activo en zoom `17`, 6 vertices DMS, sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `736d746 fix: estabilizar base satelital del plano v2.6.135`.
- `git push origin main`: publica `v2.6.135`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.135` y `PLAN_BASEMAP_SATELLITE_MAX_ZOOM: 17`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.135`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.135`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `LAT_DEC`, mensaje de base apagada y max zoom satelital.
- Playwright remoto escritorio: escuela simulada solo con `LAT_DEC/LNG_DEC`, satelite activo en zoom `17`, 6 vertices DMS, sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: misma prueba satelital, sin errores de consola y sin overflow horizontal.

## Plano satelital georreferenciado con vertices y bloques - 2026-05-26 - v2.6.134

### Objetivo
- Incorporar al plano vivo una funcion parecida a la imagen de referencia: base satelital, perimetro del predio destacado, pines en vertices, coordenadas DMS visibles y rotulos grandes de bloques tipo `B1`, `B2`, `B3`.
- Permitir que el esquema sea util para inspeccion visual, validacion de ubicacion del predio y salida documental PDF/SVG.

### Diagnostico
- El plano ya tenia una base calibrable de calles/lineas y georreferencia guardable, pero no un selector satelital real dentro del plano.
- El perimetro del predio podia dibujarse sobre el lienzo, pero sus vertices no mostraban coordenadas calculadas desde la base cartografica.
- La salida PDF incluia la vista completa del plano, pero no resaltaba coordenadas de vertices ni rotulos de bloques con lectura tipo imagen satelital.

### Cambios implementados
- `Plano escuela` agrega fuente visual `Satelite` usando teselas Esri World Imagery y conserva `Calles` como alternativa.
- La cinta y el panel de base mapa permiten alternar `Satelite` / `Calles`, activar la base, moverla, escalarla, rotarla y guardarla.
- `Registro guiado` agrega accion directa `Satelite` en la confirmacion de ubicacion y en el paso de georreferencia base.
- Se agrega conversion inversa de punto de lienzo a latitud/longitud Web Mercator, respetando escala, desplazamiento y rotacion de la base.
- El perimetro del predio muestra una linea amarilla superior, pines amarillos por vertice y coordenadas en formato DMS.
- Los bloques se rotulan sobre la base con etiquetas grandes tipo `B1`, `B2`, etc., legibles sobre imagen satelital.
- El modelo exportado agrega `propertyBoundaryGeoVertices` con indice, latitud, longitud y etiqueta DMS.
- La vista SVG/PDF completa incluye imagen satelital, pines, coordenadas y rotulos de bloques.
- Version visible, cache y assets actualizados a `v2.6.134`.

### Pendiente operativo
- Pedir a encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.134`.
- En campo, usar coordenadas de escuela, activar `Satelite`, ajustar la base si hace falta, confirmar georreferencia y luego dibujar el perimetro del predio.
- Si Esri no ofrece detalle suficiente en una zona puntual, alternar a `Calles` o ajustar manualmente el contorno y registrar observacion.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Playwright local escritorio: `Plano escuela` muestra `v2.6.134`, activa `Satelite`, carga teselas `World_Imagery`, genera 6 vertices DMS del perimetro, incluye satelite/coordenadas en `pdfHtml`, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: activa satelite, genera vertices DMS y no presenta overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `aab4123 feat: agregar plano satelital georreferenciado v2.6.134`.
- `git push origin main`: publica `v2.6.134`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.134` y `PLAN_BASEMAP_SATELLITE_TILE_URL`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.134`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.134`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `setPlanBaseMapSource`, `propertyBoundaryGeoVertices` y `World_Imagery`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `basemapSatellite`.
- Playwright remoto escritorio: `Plano escuela` muestra `v2.6.134`, activa `Satelite`, carga teselas `World_Imagery`, genera 6 vertices DMS, incluye satelite/coordenadas en `pdfHtml`, sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: misma prueba satelital/georreferenciada, sin errores de consola y sin overflow horizontal.

## Correcciones observadas en plano vivo y PDF - 2026-05-26 - v2.6.133

### Objetivo
- Revisar `H:\Mi unidad\OBS VER v2.6.132 (actualizado).docx` y resolver una por una las observaciones operativas reportadas sobre ubicacion, perimetro, bloques, pisos, aulas, exteriores y salida PDF.
- Evitar que el predio, bloques o elementos exteriores queden atrapados por limites invisibles, seleccion superpuesta o zoom automatico.
- Mejorar la lectura y edicion en campo sin perder trazabilidad ni compatibilidad con el flujo guiado existente.

### Diagnostico
- El perimetro podia tocar el limite inferior del lienzo y parecer bloqueado: los vertices y bordes desaparecian o no bajaban mas.
- El boton `Deshacer` actuaba sobre el croquis del aula, pero no sobre cambios del plano general como vertices del predio, movimiento, rotacion o redimensionamiento.
- En `Ubicar bloques`, el piso/planta baja podia cubrir el bloque completo y capturar la seleccion, dificultando mover el contorno principal.
- Elementos tecnicos como pilares, rampas, acometida, medidor y tablero podian sentirse trabados por el ajuste automatico a estructuras.
- `Agregar nuevo bloque` no llevaba inmediatamente a una ficha clara para cargar medidas.
- Las fichas de aula guardaban las respuestas, pero los botones elegidos no se resaltaban visualmente hasta cerrar/guardar.
- Al agregar exteriores repetidos, codigos default como `TQ 1` podian quedar duplicados.
- El PDF no incluia una hoja general del predio con todos los exteriores alejados.

### Cambios implementados
- Se agrega tamano de lienzo persistente para el plano vivo, con botones `Mas abajo`, `Mas ancho`, `Mas ambos` y `Auto` en la pestaña `Vista`.
- La guia de `Perimetro predio` incorpora `Extender abajo` y `Acometida`, para poder ajustar predios grandes y ubicar acometidas alejadas de los bloques.
- El redimensionamiento del lienzo conserva las posiciones reales de bloques y exteriores, recalculando ratios sin estirar el dibujo existente.
- El click fuera de objetos ya no reinicia automaticamente el zoom del plano.
- Se agrega historial de deshacer/rehacer para cambios del plano general: crear/mover/redimensionar/rotar objetos, vertices, formas, lienzo y elementos exteriores.
- Cuando un bloque esta seleccionado, el hit-test prioriza el bloque sobre el piso que lo cubre, facilitando arrastrar el contorno en `Ubicar bloque`.
- Pilares, rampas y elementos electricos de exterior dejan de ajustarse automaticamente a bordes de estructuras, permitiendo moverlos libremente.
- `Nuevo bloque` abre la ficha del bloque para cargar largo/ancho y estado sin depender de encontrar el boton despues.
- La etapa `Bloques y pisos` agrega accion `Agregar planta alta`.
- Las acciones de `Exteriores` agregan rampa, acometida, medidor y tablero.
- Las rampas se dibujan en planta como rectangulo con flecha `SUBE`, mas cercano al croquis solicitado.
- Los botones de ficha de aula se resaltan inmediatamente al tocarlos, antes de guardar la ficha.
- Se normalizan codigos default de exteriores por tipo para evitar duplicados como `TQ 1`, `TQ 1`.
- El PDF incorpora una hoja `Vista completa con exteriores`, usando el lienzo completo del plano vivo para mostrar perimetro, bloques y todos los exteriores alejados.
- Version visible, cache y assets actualizados a `v2.6.133`.

### Pendiente operativo
- Pedir a encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.133`.
- Probar en tablet con el caso real del documento: extender lienzo, bajar vertices del predio, mover bloque con piso visible y ubicar acometida/rampa/medidor/tablero.

### Validaciones ejecutadas
- Extraccion y revision del documento `H:\Mi unidad\OBS VER v2.6.132 (actualizado).docx`, incluyendo texto e imagenes adjuntas.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- Playwright local escritorio y movil `390x844`: `Plano escuela` carga sin errores de consola, expone `extendSchoolPlanCanvas`, permite extender lienzo a 940 px de alto y no genera overflow horizontal.
- Playwright local escritorio: pestaña `Vista` muestra `Mas abajo`, `Mas ancho`, `Mas ambos` y `Auto`.
- Playwright local escritorio: ficha de aula resalta inmediatamente `Teja` con `mec-choice--active` antes de guardar.
- Playwright local escritorio: paquete PDF contiene hoja `Vista completa con exteriores` y version `v2.6.133`.
- `npm.cmd run metrics:web -- --url=http://127.0.0.1:8073/ --viewport=mobile --cache-bust --no-service-worker`: 22 requests, 0 fallidas, 0 HTTP 4xx/5xx y 0 errores/advertencias de consola.
- `git commit`: `39142d1 fix: corregir plano vivo observaciones v2.6.133`.
- `git push origin main`: publica `v2.6.133`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.133`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.133`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.133`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `Mas abajo`, `Vista completa con exteriores` y `activateChoiceButton`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `Extender abajo`, `Agregar planta alta` y `service_connection`.
- Playwright remoto escritorio y movil `390x844`: `Plano escuela` muestra `v2.6.133`, renderiza canvas, expone `Mas abajo`, permite extender el lienzo a 940 px, sin errores de consola y sin overflow horizontal.

## Procedimiento operativo de publicacion documentado - 2026-05-24 - docs

### Objetivo
- Documentar con detalle el procedimiento usado para levantar, validar y publicar cambios de CIALPA.
- Dejar explicitadas las herramientas, comandos y criterios de cierre que se aplican en cada version.
- Separar cambios de documentacion de cambios ejecutables, evitando subir version/cache cuando no cambia la app publicada.

### Cambios implementados
- Se agrega `docs/PROCEDIMIENTO_LEVANTAR_PUBLICAR_CAMBIOS.md`.
- El procedimiento cubre revision inicial de Git, lectura de contexto, implementacion, versionado, cache, validacion sintactica, servidor local, Playwright, Apps Script, PostgreSQL, GitHub Pages, verificacion HTTP y bitacora.
- Se documentan herramientas usadas: PowerShell, `rg`, `git`, `node`, `npm`, Playwright, `clasp.cmd`, PostgreSQL/`psql`, `gcloud.cmd`, GitHub Pages, Google Apps Script, Sheets y Drive.
- Se agrega criterio de credenciales y accesos recurrentes: `diegomezapy` como colaborador GitHub habitual, verificacion previa de acceso local y prohibicion de guardar contrasenas, tokens o claves privadas en repo, bitacora o memoria.
- Se registran criterios de terminado: pruebas locales/remotas, commit, push, verificacion de assets publicados y pendientes operativos cuando dependen de cuenta propietaria, token o proveedor externo.

### Validaciones ejecutadas
- Revision de `DEPLOY_CHECKLIST.md`, `README.md`, `tools/simulation/README.md`, `tools/database/README.md` y `package.json`.
- `git diff --check`.

## Consolidacion plena hacia base PostgreSQL - 2026-05-24 - v2.6.132

### Objetivo
- Pasar de la cola preparada `db_sync_queue` a un flujo operativo real de consolidacion hacia PostgreSQL.
- Permitir reprocesar cargas historicas, pendientes o con error sin depender de una accion manual fila por fila.
- Mantener Sheets/Drive como respaldo operativo mientras la base formal gana trazabilidad, consistencia e idempotencia.

### Diagnostico
- La app ya escribia `mec_borradores` y registraba mutaciones en `db_sync_queue`.
- La API relacional `tools/database/cialpa_db_api.mjs` ya podia recibir `POST /sync/mec-draft` y normalizar en PostgreSQL.
- Faltaba una herramienta reproducible para tomar exportes de la cola, exportes de `mec_borradores` o JSONL y consolidarlos contra la API formal.

### Cambios implementados
- Se agrega `tools/database/consolidate_db_queue.mjs`.
- Se agrega script `npm run db:consolidate`.
- El consolidador acepta `db_sync_queue.csv`, `mec_borradores.csv`, JSONL de payloads y JSON unico/arreglo.
- El modo por defecto es simulacion; solo escribe al usar `--write`.
- Soporta filtros por estado (`--status pendiente,error,pendiente_config`), escuela (`--school`), limite (`--limit`) y concurrencia (`--concurrency`).
- Si `payload_json` de Sheets viene truncado, puede usar JSON completos descargados de Drive con `--payload-dir` o intentar descarga con `--fetch-payload-files`.
- Publica reportes locales JSON/CSV en `tools/database/output/`, carpeta ignorada por Git.
- La vista `Metodologia y datos` incorpora la fase `Consolidacion historica` y el comando `npm run db:consolidate`.
- `tools/database/README.md` y `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` documentan el procedimiento operativo.
- Version visible, cache y assets actualizados a `v2.6.132`.

### Pendiente operativo
- Exportar la hoja real `db_sync_queue` desde Google Sheets y ejecutar primero una simulacion sin `--write`.
- Definir el endpoint final `DATABASE_SYNC_URL` en Cloud Run/Supabase/AlloyDB y cargar `DATABASE_SYNC_TOKEN` como Script Property.
- Ejecutar una consolidacion controlada de pendientes reales y comparar conteos entre Sheets, `sync_mutations`, `mec_drafts` y tablas normalizadas.

### Validaciones ejecutadas
- `node --check tools/database/consolidate_db_queue.mjs`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `npm.cmd run db:consolidate -- --help`.
- `npm.cmd run db:consolidate -- --jsonl tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl --limit 2 --no-report`: detecta 1000 payloads y simula 2 sin errores.
- `npm.cmd run db:consolidate -- --mec-drafts-csv tools/simulation/demo-output/demo-mec_borradores-demo1000_20260521.csv --limit 2 --no-report`: detecta 1000 filas y simula 2 sin errores.
- `npm.cmd run db:local`.
- `npm.cmd run db:schema` contra PostgreSQL local: `schools`, `school_institutions`, `mec_drafts` y `sync_mutations` OK.
- API local `/health` con `DATABASE_URL=postgresql://postgres@127.0.0.1:55432/cialpa`: `database: ok`, `schema: ok`.
- Escritura real local: `npm.cmd run db:consolidate -- --jsonl tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl --limit 2 --write --token token-local --no-report`.
- Verificacion SQL local posterior: 2 `sync_mutations`, 2 `mec_drafts`, 2 `schools`, 2 `rooms`, 2 `sanitary_groups` y 9 `site_elements`.
- Reintento idempotente de los mismos 2 payloads: conserva 2 mutaciones, 2 borradores, 2 ambientes y 2 sanitarios; `attempts` sube a 4.
- Playwright local escritorio y movil `390x844`: `Metodologia y datos` muestra `v2.6.132`, `Consolidacion historica` y `npm run db:consolidate`, sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `90b378e feat: consolidar cola hacia postgresql v2.6.132`.
- `git push origin main`: publica la herramienta y la vista `v2.6.132`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.132`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.132`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.132` y `Consolidacion historica`.
- Playwright remoto escritorio y movil `390x844`: `Metodologia y datos` muestra `v2.6.132`, `Consolidacion historica` y `npm run db:consolidate`, sin errores de consola y sin overflow horizontal.

## Vista Metodologia y resguardo formal de datos - 2026-05-23 - v2.6.131

### Objetivo
- Agregar a la app web una vista institucional de metodologia que explique como funciona CIALPA de punta a punta.
- Madurar la estrategia para resguardar todas las respuestas en una base de datos formal con integridad, consistencia y trazabilidad.
- Explicar en una pantalla navegable las herramientas usadas, su interconexion y el camino completo desde captura en campo hasta PostgreSQL.

### Diagnostico
- Existia un modulo `Arquitectura del proyecto`, pero no estaba visible en el menu principal y se quedaba corto para explicar gobernanza de datos.
- La app ya tiene piezas de maduracion hacia base formal: `db_sync_queue`, documentacion de PostgreSQL, API relacional en `tools/database/` y esquema jerarquico escuela/institucion.
- Faltaba presentar todo eso dentro de la app para supervisores, administradores y equipo tecnico, sin depender de documentos externos.

### Cambios implementados
- El modulo pasa a presentarse como `Metodologia de funcionamiento y datos`.
- Se agrega acceso visible `Metodologia y datos` al menu lateral y boton `Metodologia` en Inicio.
- La vista explica captura en campo, PWA, borrador local, backend Apps Script, Sheets/Drive, cola formal y base transaccional PostgreSQL.
- Se agrega ciclo metodologico del dato: identificacion, captura guiada, autoguardado, sincronizacion, resguardo operativo, resguardo formal y uso institucional.
- Se documenta que se guarda, donde queda hoy, cual es el destino formal y para que se usa operativamente.
- Se explican herramientas y responsabilidades: GitHub Pages, Service Worker, JavaScript PWA, Apps Script, Sheets, Drive, PostgreSQL, Leaflet, OSM y Canvas.
- Se agregan principios de integridad, consistencia y trazabilidad: `clientMutationId`, usuario, rol, fecha cliente/servidor, `school_key`, `institution_key`, logs, auditoria y no duplicacion por reintentos.
- Se muestra el modelo formal recomendado: `users`, `assignments`, `survey_sessions`, `schools`, `school_institutions`, `mec_drafts`, `school_submissions`, `buildings`, `floors`, `rooms`, `room_objects`, `sanitary_groups`, `sanitary_objects`, `site_elements`, `evidence_files`, `sync_mutations` y `audit_log`.
- Se incorporan estados del dato: `BORRADOR LOCAL`, `PENDIENTE_SYNC`, `RECIBIDO`, `EN_COLA_DB`, `SINCRONIZADO_DB`, `VALIDADO`, `OBSERVADO` y `ANULADO`.
- Se actualizan estilos responsive para la nueva vista metodologica.
- Version visible, cache y assets actualizados a `v2.6.131`.

### Pendiente operativo
- Pedir a supervisores/administradores `Actualizar app` para tomar `cialpa-app-v2.6.131`.
- Revisar con el equipo si la base formal se activara primero como doble escritura `Sheets + PostgreSQL` o si se mantendra un periodo mas largo de cola `db_sync_queue`.
- Definir proveedor final de PostgreSQL administrado: Cloud SQL, Supabase o AlloyDB.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- Playwright local escritorio: `Metodologia y datos` aparece en menu, abre `module-arquitectura`, muestra version `v2.6.131`, 7 etapas metodologicas, 8 bloques de esquema formal y 8 filas de tabla de resguardo, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: mismo flujo de metodologia, sin errores de consola y sin overflow horizontal.
- `git commit`: `b713738 feat: agregar metodologia de datos v2.6.131`.
- `git push origin main`: publica la vista en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.131`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.131`.
- Verificacion HTTP de GitHub Pages para `assets/js/app.js`: contiene `Metodologia y datos`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene estilos `method-hero`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene assets `v2.6.131` y `Metodologia de funcionamiento y datos`.
- Playwright remoto escritorio: `Metodologia y datos` visible en menu, version `v2.6.131`, 7 etapas, 8 bloques de esquema, 8 filas de tabla, sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: misma vista metodologica, sin errores de consola y sin overflow horizontal.

## Saltos condicionales en cuestionario inicial R01 - 2026-05-23 - v2.6.130

### Objetivo
- Evitar que el cuestionario para directores pregunte detalles que no corresponden segun la respuesta base.
- En particular, si la escuela no cuenta con Internet, no mostrar ni enviar tipo de conexion ni calidad de senal.
- Asegurar que los saltos necesarios funcionen sin dejar campos ocultos activos ni datos inconsistentes en el envio.

### Diagnostico
- El bloque `Internet y conectividad` ya tenia pregunta principal, pero aunque se respondiera `No`, seguian visibles `Tipo(s) de conexion` y `Calidad de la senal`.
- El mismo riesgo existia en otros bloques: fuentes de agua si no habia agua, desague si no habia bano, camaras si no habia CCTV y proveedor/cortes si no habia energia.
- Si un director marcaba primero opciones dependientes y luego cambiaba la respuesta base a `No`, esos valores podian quedar marcados y viajar en el payload.

### Cambios implementados
- Se agrega helper `_dependent()` para agrupar preguntas dependientes de una respuesta base.
- Los dependientes se ocultan, se deshabilitan y se limpian automaticamente cuando la respuesta base no es `Si`.
- `internet_tipo` e `internet_calidad` aparecen solo cuando `internet_tiene = Si`.
- `agua_fuentes` y `bomba_hp` aparecen solo cuando `agua_tiene = Si`.
- `desague_tipo` aparece solo cuando `bano_tiene = Si`.
- Las cantidades de CCTV aparecen solo cuando `cctv_tiene = Si`.
- `energia_proveedor` y `energia_cortes` aparecen solo cuando `energia_tiene = Si`.
- Las observaciones quedan visibles para explicar cortes, ausencia del servicio o aclaraciones.
- Version visible, cache y assets actualizados a `v2.6.130`.

### Pendiente operativo
- Pedir a directores/operadores `Actualizar app` o abrir el cuestionario con cache nuevo para tomar `cialpa-app-v2.6.130`.
- Revisar con el equipo si otros bloques requieren saltos adicionales por reglas operativas mas especificas.

### Validaciones ejecutadas
- `node --check assets/js/initial-questionnaire.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/stats.js`.
- `node --check sw.js`.
- Validacion JSON/encoding: `package.json`, `r01-schools-public.json`, `config.js`, `initial-questionnaire.js`, `index.html` y `cuestionario_inicial/index.html`: OK, sin caracteres de reemplazo.
- Playwright local escritorio: Internet dependiente nace oculto, aparece al marcar `Si`, se oculta al marcar `No`, queda deshabilitado y el payload no envia `internet_tipo` ni `internet_calidad`.
- Playwright local movil `390x844`: mismo flujo de Internet, sin errores de consola y sin overflow horizontal.
- Playwright local de dependencias: agua, bano, Internet, CCTV y energia nacen ocultos, aparecen con `Si`, se ocultan con `No` y quedan deshabilitados.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `ff8a8e7 fix: aplicar saltos condicionales cuestionario inicial v2.6.130`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.130`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.130`.
- Verificacion HTTP de GitHub Pages para `assets/js/initial-questionnaire.js`: contiene `data-dependent-name`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene `initial-dependent.is-hidden`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene assets `v2.6.130`.
- Verificacion HTTP de GitHub Pages para `cuestionario_inicial/`: responde HTTP 200.
- Playwright remoto escritorio: version `2.6.130`, Internet dependiente nace oculto, aparece con `Si`, se oculta con `No`, queda deshabilitado, y el payload no envia `internet_tipo` ni `internet_calidad`.
- Playwright remoto movil `390x844`: mismo flujo de Internet, sin errores de consola y sin overflow horizontal.

## Tablero ejecutivo Infraestructura MEC segmentable - 2026-05-23 - v2.6.129

### Objetivo
- Renovar radicalmente el panel `Infraestructura MEC` para presentarlo como un centro de inteligencia edilicia.
- Dejar claro que la app permite consultar informacion de forma agil y sofisticada con KPIs, estadisticas, tablas, figuras, mapas y segmentacion.
- Permitir lectura por departamento, distrito, nivel educativo, tipo de bloque y presencia o ausencia de fallas.

### Diagnostico
- El panel anterior mostraba una radiografia tecnica util, pero no demostraba suficientemente el potencial de analisis para presentaciones ante MEC.
- Faltaban controles visibles para segmentar la informacion por territorio, oferta educativa, tipologia edilicia y criticidad.
- La demo de 1000 respuestas no tenia detalle territorial ni segmentos sinteticos suficientes para mostrar mapas, rankings y cruces.

### Cambios implementados
- `Infraestructura MEC` pasa a abrir con una cabecera tipo centro de inteligencia: evidencia, escuelas con ficha MEC, area relevada, riesgo tecnico y estado de fuente.
- Se agrega un explorador segmentable con filtros por departamento, distrito, nivel educativo, tipo de bloque y estado de fallas.
- Se agrega mapa territorial de infraestructura con puntos por distrito/departamento y color segun riesgo; si Leaflet no esta disponible, se muestra un mapa visual de respaldo.
- Se agrega vista filtrada con KPIs del segmento seleccionado y tarjetas de foco para nivel educativo, tipo de bloque y fallas.
- Se conservan tarjetas de decision, semaforo tecnico, alertas y tiempos, pero integradas dentro de un tablero mas ejecutivo.
- Se agregan figuras comparativas por niveles educativos, tipologias de bloque y productividad de relevamiento.
- Se agrega tabla/ranking territorial para priorizar recorridos, inversion y mantenimiento.
- La demo publica `assets/data/demo-infraestructura-mec.json` incorpora territorios, niveles educativos, tipos de bloque y segmentos de fallas.
- Version visible, cache y assets actualizados a `v2.6.129`.

### Pendiente operativo
- Pedir a supervisores y administradores `Actualizar app` para tomar `cialpa-app-v2.6.129`.
- Cuando existan borradores MEC reales suficientes, ampliar el agregado backend `infraestructura_mec` para devolver territorios, niveles, tipos de bloque y fallas desde datos vivos, no solo desde demo/fallback.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check sw.js`.
- Validacion JSON de `demo-infraestructura-mec.json`, `r01-schools-public.json` y `package.json`: OK.
- Playwright local escritorio: `Infraestructura MEC` carga el tablero nuevo, muestra 5 filtros, selecciona `CENTRAL`, renderiza mapa y tabla territorial, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: muestra tablero, filtros, mapa y tabla sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `709b511 feat: renovar tablero infraestructura MEC v2.6.129`.
- `git push origin main`: publica la renovacion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.129`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.129`.
- Verificacion HTTP de GitHub Pages para `assets/js/stats.js`: contiene `Centro de inteligencia edilicia`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene estilos `mec-intel-filters`.
- Verificacion HTTP de GitHub Pages para `assets/data/demo-infraestructura-mec.json`: contiene `territorios`, `niveles_educativos`, `tipos_bloque` y `fallas_segmentos`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `Inteligencia de infraestructura escolar`.
- Playwright remoto sobre GitHub Pages: version visible `v2.6.129`, 5 filtros, seleccion `CENTRAL`, 2 filas territoriales, mapa renderizado, sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: version visible `v2.6.129`, tablero, filtros, mapa y tabla sin errores de consola y sin overflow horizontal.

## Preguntas visibles para grupos de opciones R01 - 2026-05-23 - v2.6.128

### Objetivo
- Corregir grupos de respuestas que aparecian sin una pregunta clara asociada en el cuestionario inicial publico.
- Hacer que bloques como Internet, agua y prevencion contra incendios queden visualmente ordenados y sin opciones sueltas.

### Diagnostico
- En `Internet y conectividad`, las opciones `Fibra optica`, `Coaxil`, `Satelital` y `Otro` se mostraban inmediatamente despues de la pregunta `La escuela cuenta con Internet?`, pero sin titulo propio.
- El mismo patron existia en fuentes de agua: las opciones multiples se renderizaban con `_checkboxGrid()` sin label visible.
- En prevencion contra incendios, cada elemento tenia texto, pero faltaba un encabezado de grupo que explicara que esas respuestas pertenecen a elementos de incendio.

### Cambios implementados
- `_checkboxGrid()` ahora exige y muestra una pregunta/titulo de grupo.
- Se agrega el bloque `Tipo(s) de conexion a Internet disponibles` con ayuda `Marque una o mas opciones solo si la escuela cuenta con Internet`.
- Se agrega el bloque `Fuente(s) de abastecimiento de agua utilizadas por la escuela`.
- El grupo de incendio ahora queda bajo `Elementos de prevencion contra incendios disponibles`.
- Los grupos de pregunta tienen borde liviano, fondo propio, punto de referencia visual y texto auxiliar cuando corresponde.
- Version visible, cache y assets actualizados a `v2.6.128`.

### Validaciones ejecutadas
- `node --check assets/js/initial-questionnaire.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion JSON de `r01-schools-public.json` y `package.json`: OK.
- Playwright local escritorio: `Internet y conectividad` muestra labels para pregunta principal, tipo de conexion y calidad de senal; fallback carga escuelas; sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: 7 bloques, labels de Internet visibles, sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `a2a4a97 fix: aclarar grupos de respuestas R01 v2.6.128`.
- `git push origin main`: publica la mejora en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.128`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.128` y precache de `r01-schools-public.json`.
- Verificacion HTTP de GitHub Pages para `assets/js/initial-questionnaire.js`: contiene `Tipo(s) de conexion a Internet disponibles`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene estilos `initial-question__hint`.
- Verificacion HTTP de GitHub Pages para `cuestionario_inicial/`: responde con assets `v2.6.128`.
- Playwright remoto sobre GitHub Pages: `Internet y conectividad` muestra labels separados para pregunta principal, tipo de conexion y calidad de senal; fallback con 5462 escuelas; sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: 7 bloques, labels de Internet visibles, fallback con 5462 escuelas, sin errores de consola y sin overflow horizontal.

## Respaldo publicado para lista de escuelas R01 - 2026-05-23 - v2.6.127

### Objetivo
- Resolver que el cuestionario inicial publico muestre `No se pudo cargar la lista oficial ahora` cuando el Web App publicado aun no tiene activo `listarEscuelasCuestionarioInicial`.
- Mantener el buscador de escuelas operativo aunque Apps Script quede pendiente de redeploy desde la cuenta propietaria.

### Diagnostico
- La URL publicada de Apps Script responde `diagnosticoPadron` correctamente con `source: official_sheet`, `total: 5462`, `muestra_piloto: 86` y `filas_operativas: 109`.
- La misma URL responde a `listarEscuelasCuestionarioInicial` con `Token invalido o expirado`, confirmando que el deployment activo sigue tratando ese endpoint como privado.
- El deployment `@HEAD` no es usable publicamente desde esta sesion: responde HTML de permiso de Google.

### Cambios implementados
- Se agrega `assets/data/r01-schools-public.json`, indice publico minimo con 5462 escuelas y solo campos de busqueda: codigo, nombre, departamento, distrito y localidad.
- El archivo no incluye responsables, telefonos ni correos.
- `initial-questionnaire.js` conserva como fuente principal el endpoint `listarEscuelasCuestionarioInicial`, pero si falla carga automaticamente el indice publicado desde GitHub Pages.
- El mensaje del formulario pasa a indicar que hay 5462 escuelas disponibles desde la copia publicada y mantiene el buscador por codigo, nombre o distrito.
- Se agrega el script reproducible `npm run build:r01-schools`.
- Version visible, cache y assets actualizados a `v2.6.127`.

### Pendiente operativo
- Publicar/actualizar el Web App de Apps Script desde la cuenta propietaria para que `listarEscuelasCuestionarioInicial` vuelva a ser la fuente principal real.
- Luego de publicar, repetir prueba HTTP contra `listarEscuelasCuestionarioInicial` y confirmar `status: ok`.

### Validaciones ejecutadas
- Prueba HTTP contra Web App publicado: `diagnosticoPadron` responde `official_sheet`, `total: 5462`, `muestra_piloto: 86`.
- Prueba HTTP contra Web App publicado: `listarEscuelasCuestionarioInicial` responde `Token invalido o expirado`.
- `npm.cmd run build:r01-schools`: genera 5462 escuelas en `assets/data/r01-schools-public.json`.
- Validacion JSON: `r01-schools-public.json` parsea OK y no contiene `@`, `responsable local` ni telefonos tipo `(09xx)`.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check tools/simulation/build_r01_public_schools.mjs`.
- `node -e "JSON.parse(...r01-schools-public.json...); JSON.parse(...package.json...)"`: OK.
- Playwright local escritorio: con backend publicado fallando por token, el cuestionario carga fallback, muestra 5462 opciones, selecciona `1701006`, completa departamento `ALTO PARAGUAY` y distrito `BAHIA NEGRA`, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: 7 bloques, sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `git commit`: `1f1132c fix: agregar respaldo escuelas cuestionario inicial v2.6.127`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.127`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.127`.
- Verificacion HTTP de GitHub Pages para `assets/js/initial-questionnaire.js`: contiene `r01-schools-public.json`.
- Verificacion HTTP de GitHub Pages para `assets/data/r01-schools-public.json`: responde HTTP 200, `total: 5462`, primera escuela `1701006`.
- Verificacion HTTP de GitHub Pages para `cuestionario_inicial/`: responde HTTP 200 y carga assets `v2.6.127`.
- Playwright remoto sobre GitHub Pages: con backend publicado fallando por token, el cuestionario carga fallback, muestra 5462 opciones, selecciona `1701006`, completa departamento `ALTO PARAGUAY` y distrito `BAHIA NEGRA`, sin errores de consola y sin overflow horizontal.
- Playwright remoto movil `390x844`: 7 bloques, fallback con 5462 escuelas, sin errores de consola y sin overflow horizontal.

## Codigo local buscable y territorio oficial - 2026-05-23 - v2.6.126

### Objetivo
- Hacer que el codigo de local del cuestionario inicial sea una lista buscable por codigo, nombre de escuela o distrito.
- Asegurar que departamento y distrito se carguen desde el padron oficial disponible.
- Corregir el estado visual de botones de opcion para que se vea claramente la respuesta marcada.

### Diagnostico
- El formulario publico mostraba `Codigo de local` como texto libre, obligando al director a escribirlo sin ayuda.
- `Departamento` y `Distrito` tambien estaban como texto libre, sin relacion con la lista oficial de escuelas.
- Los botones marcados solo cambiaban con un estilo muy suave y en algunos navegadores no quedaba evidente que la opcion habia sido seleccionada.

### Cambios implementados
- Se agrega endpoint publico `listarEscuelasCuestionarioInicial`, sin autenticacion, con datos minimos del padron: codigo, id, nombre, departamento, distrito y localidad.
- El campo `Codigo de local / escuela` pasa a buscador con `datalist`, permitiendo localizar por codigo, nombre o distrito.
- Al seleccionar una escuela, el formulario completa codigo local, id de escuela, nombre, departamento, distrito y localidad cuando corresponde.
- `Departamento` y `Distrito` pasan a listas desplegables; los distritos se filtran segun el departamento seleccionado.
- Los botones de opciones y checks ahora usan verde pleno cuando estan marcados, con respaldo CSS `:has(input:checked)` y refresco por click/cambio.
- Version visible, cache y assets actualizados a `v2.6.126`.

### Pendiente operativo
- Publicar/actualizar el Web App de Apps Script desde la cuenta propietaria para que el nuevo endpoint publico quede activo en produccion.
- Probar en el cuestionario publicado la busqueda de una escuela real por codigo local, nombre y distrito.

### Validaciones ejecutadas
- `node --check assets/js/initial-questionnaire.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante `vm.Script`: OK.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Playwright local escritorio: lista de escuelas simulada carga 2 opciones, selecciona codigo `1001`, completa departamento `Central` y distrito `Luque`, boton marcado queda en verde `rgb(11, 93, 59)`, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: 7 bloques, sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- `git commit`: `86eb53b fix: mejorar seleccion cuestionario inicial v2.6.126`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.126`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.126`.
- Verificacion HTTP de GitHub Pages para `assets/js/initial-questionnaire.js`: contiene `listarEscuelasCuestionarioInicial` e `initial-school-search`.
- Verificacion HTTP de GitHub Pages para `cuestionario_inicial/`: responde HTTP 200 y carga assets `v2.6.126`.
- Playwright remoto sobre GitHub Pages: lista simulada carga, completa departamento/distrito, boton marcado queda verde `rgb(11, 93, 59)`, sin errores de consola y sin overflow horizontal.
- Prueba HTTP contra Web App publicado para `listarEscuelasCuestionarioInicial`: responde `Token invalido o expirado`, confirmando que falta actualizar el deployment propietario para activar el endpoint publico.

## Cuestionario inicial publico R01 y envio a directores - 2026-05-23 - v2.6.125

### Objetivo
- Crear un cuestionario inicial publico, sin autenticacion, para enviar a directores antes de la visita in situ.
- Tomar como base las preguntas del archivo `H:\Mi unidad\R01_CUESTIONARIO INICIAL.docx`.
- Permitir cargar contactos desde Excel/CSV, simular destinatarios y enviar correos por grupos de distrito.

### Diagnostico
- El relevamiento in situ necesitaba llegar con datos previos sobre agua, sanitarios, Internet, CCTV, prevencion contra incendios e instalacion electrica.
- La app no tenia una ruta publica para directores ni una bandeja operativa para manejar envios masivos.
- El envio debia poder ensayarse con al menos 50 contactos antes de cargar correos reales.

### Cambios implementados
- Se agrega la ruta publica `cuestionario_inicial/`, preparada para GitHub Pages como `https://censoescuelaspy.github.io/CIALPAappencuesta/cuestionario_inicial`.
- El formulario no pide usuario ni contrasena y puede recibir datos prellenados por URL: token, codigo local, escuela, distrito, localidad y correo.
- El cuestionario queda dividido en bloques visuales: identificacion, agua, servicio sanitario, Internet, CCTV/incendios, electricidad y documentos finales.
- Se agregan botones de seleccion grandes y visibles para respuestas tipo si/no, opciones y listas multiples.
- El cierre del formulario muestra confirmacion clara, agradecimiento y correo de soporte `censoescuelaspy@gmail.com`.
- El final del cuestionario permite adjuntar plano, croquis, PDF, Excel o fotografia de fachada, hasta 8 MB desde el frontend.
- Se agrega modulo interno `Cuestionario inicial R01` para supervisores/admins con importacion de Excel/CSV, demo de 50 contactos, filtros por distrito, simulacion y envio real.
- Apps Script agrega hojas nuevas: `r01_cuestionario_inicial`, `r01_contactos_directores` y `r01_envios_cuestionario`.
- Apps Script agrega endpoints publicos `guardarCuestionarioInicial` y `guardarCuestionarioInicialAdjunto`.
- Apps Script agrega endpoints operativos autenticados para importar contactos, listar contactos y enviar correos por grupo.
- El correo masivo arma enlaces personalizados al cuestionario con token y datos de escuela.
- Version visible, cache y assets actualizados a `v2.6.125`.

### Pendiente operativo
- Subir GAS a HEAD y publicar/actualizar el Web App desde la cuenta propietaria para activar los nuevos endpoints publicos y el envio con `MailApp`.
- Cargar la lista real de directores con correo y celular desde Excel.
- Probar un envio real pequeño desde `censoescuelaspy@gmail.com` o desde la cuenta propietaria del Web App antes de enviar por distrito.
- Confirmar que las respuestas queden en `r01_cuestionario_inicial` y se usen luego como insumos del formulario de relevamiento.

### Validaciones ejecutadas
- Extraccion de preguntas desde `H:\Mi unidad\R01_CUESTIONARIO INICIAL.docx`: servicios de agua, banos/desague, Internet, CCTV, prevencion contra incendios e instalacion electrica.
- `node --check assets/js/initial-questionnaire.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante `vm.Script`: OK.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Playwright local escritorio: `cuestionario_inicial/` renderiza 7 bloques, 66 botones de seleccion, sin errores de consola y sin overflow horizontal.
- Playwright local movil `390x844`: sin errores de consola y sin overflow horizontal.
- `git diff --check`: OK, solo advertencias esperadas de normalizacion LF/CRLF.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git commit`: `5873194 feat: agregar cuestionario inicial publico v2.6.125`.
- `git push origin main`: publica la ruta publica y assets en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.125`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.125` y precache de `cuestionario_inicial`.
- Verificacion HTTP de GitHub Pages para `assets/js/initial-questionnaire.js`: contiene `Cuestionario inicial R01` y `guardarCuestionarioInicial`.
- Verificacion HTTP de GitHub Pages para `cuestionario_inicial/`: responde HTTP 200, contiene `initial-questionnaire-root` y assets `v2.6.125`.
- Playwright remoto sobre GitHub Pages: `cuestionario_inicial/` renderiza 7 bloques, sin errores de consola y sin overflow horizontal.

---

## Escala jerarquica de objetos del plano - 2026-05-23 - v2.6.124

### Objetivo
- Corregir medidas imposibles en pisos, aulas y sanitarios cuando el bloque ya estaba dentro de un predio medido.
- Evitar que un piso o aula herede escalas viejas y termine mostrando cientos de miles de metros.

### Diagnostico
- La captura observada mostraba un bloque con medida razonable, pero `Planta baja` y `Aula 1` aparecian con largos enormes.
- El resumen del plano calculaba el area desde `room.length * room.width`, por eso un largo corrupto del aula inflaba el KPI de area.
- Las aulas y sanitarios recalculaban sus metros desde la geometria del piso, pero el piso podia conservar un `largo_m/ancho_m` viejo, independiente del bloque visual que lo contiene.
- Al redimensionar un piso, el codigo multiplicaba por la medida previa del propio piso; si esa medida ya estaba corrupta, el error se propagaba.

### Cambios implementados
- Se agrega normalizacion interna `objects-v2.6.124` para jerarquia de escala: bloque -> piso -> aula/sanitario.
- Los pisos recalculan `largo_m/ancho_m` desde el bloque y sus `wRatio/hRatio`, por lo que nunca quedan mas grandes que el bloque que los contiene.
- Aulas y sanitarios recalculan sus medidas desde el piso activo y la geometria de su rectangulo, no desde una escala vieja del bloque.
- Al renderizar, guardar o sincronizar el borrador, la app corrige medidas fuera de escala antes de calcular resumen, PDF/JSON o guardado remoto.
- Al redimensionar un piso, sus metros se derivan del bloque y del tamano visual resultante, evitando multiplicar errores anteriores.
- La creacion/redimensionamiento desde medidas de aula y sanitario usa el piso como referencia cuando existe, manteniendo coherencia con el plano general.
- Version visible, cache y assets actualizados a `v2.6.124`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.124`.
- Probar en tablet con el caso de la imagen: abrir el mismo borrador, seleccionar bloque/piso/aula y confirmar que desaparecen valores como `311232 m` o `229309 m`.
- Probar predio medido, bloque medido, piso y aula: el area del resumen debe quedar acorde a las medidas reales cargadas.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: existe `PLAN_OBJECT_SCALE_VERSION = objects-v2.6.124`.
- Revision estatica: `_normalizePlanMeasureHierarchy()` corrige bloque -> piso -> aula/sanitario antes de render, guardado y sync.
- Revision estatica: `_resizePlanFloor()` ya no multiplica por medidas previas corruptas; deriva metros desde el bloque y el ratio visual.
- Revision estatica: version visible, cache y assets en `v2.6.124`; se conserva `meters-v2.6.123` solo como etiqueta interna del arreglo previo del predio.
- `git commit`: `f2f17e2 fix: corregir escala de objetos del plano v2.6.124`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.124`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.124`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.124`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `PLAN_OBJECT_SCALE_VERSION`, `_normalizePlanMeasureHierarchy`, `_normalizeFloorMeasuresToBlock` y `objects-v2.6.124`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `Version: 2.6.124`.
- Verificacion HTTP de GitHub Pages para `assets/js/app.js`: contiene `Version: 2.6.124`.
- `npm.cmd run metrics:web -- --cache-bust`: 21 requests por vista, 0 fallidas, 0 HTTP 4xx/5xx y 0 errores/advertencias de consola.

---

## Escala comun entre predio y bloques - 2026-05-23 - v2.6.123

### Objetivo
- Corregir que las medidas del `Perimetro del predio escolar` no quedaran en la misma escala visual que los bloques y aulas que se insertan dentro.
- Hacer que, cuando el predio tenga largo/ancho cargados, los bloques medidos se dibujen proporcionalmente dentro de esa envolvente.

### Diagnostico
- El predio convertia `largo_m` y `ancho_m` a `wRatio/hRatio` con un divisor fijo, mezclando el ancho y alto del canvas como si tuvieran la misma escala.
- Los bloques calculaban su tamano desde `largo_m/ancho_m` con una escala propia, independiente del predio.
- Al combinar ambos modelos, un bloque de medidas reales podia verse demasiado grande o demasiado chico respecto al perimetro del predio.

### Cambios implementados
- El predio medido ahora convierte metros a pixeles con una escala isotropica: un metro horizontal y un metro vertical ocupan la misma distancia visual.
- Se agrega una version interna de normalizacion `meters-v2.6.123` para corregir predios medidos antes de esta version sin pisar redimensionamientos manuales posteriores.
- `Perimetro del predio escolar` expone metricas de escala del contorno: dimensiones cargadas, caja real del poligono y pixeles por metro.
- `_planBlockLayout()` usa la escala del predio cuando existe `largo_m/ancho_m` del perimetro y `largo_m/ancho_m` del bloque.
- Los bloques con medidas dejan de usar su `wRatio/hRatio` viejo si el predio esta medido; se recalculan desde metros para coincidir con la escala del contorno.
- Al redimensionar el predio, sus metros se actualizan con una sola escala y los bloques se reacomodan dentro del nuevo contorno.
- Al mover vertices del predio, los bloques se vuelven a persistir dentro de la envolvente ajustada.
- Los textos del `Registro guiado` aclaran que cargar largo/ancho del predio fija la escala usada por los bloques.
- Version visible, cache y assets actualizados a `v2.6.123`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.123`.
- Probar en tablet: dibujar perimetro, abrir ficha del predio, cargar por ejemplo `80 x 55 m`, crear un bloque `30 x 20 m` y confirmar que ocupa una proporcion coherente dentro del predio.
- Probar redimensionar el predio despues de tener bloques: los bloques deben conservar escala comun y quedar dentro de la envolvente.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.122` en assets de publicacion.
- Revision estatica: existe `PROPERTY_BOUNDARY_SCALE_VERSION = meters-v2.6.123`.
- Revision estatica: `_planBlockLayout()` toma `propertyScale` desde `_propertyBoundaryPlanMetrics()` cuando predio y bloque estan medidos.
- `git commit`: `bc4865d fix: alinear escala de predio y bloques v2.6.123`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.123`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.123`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.123`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `PROPERTY_BOUNDARY_SCALE_VERSION`, `_propertyBoundaryPlanMetrics` y `propertyScale`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `Version: 2.6.123` y texto de escala comun.
- Verificacion HTTP de GitHub Pages para `assets/js/app.js`: contiene `Version: 2.6.123`.

---

## Perimetro con logica de forma tipo aula - 2026-05-23 - v2.6.122

### Objetivo
- Abandonar el perimetro tipo hexagono/poligono especial.
- Hacer que el `Perimetro del predio escolar` use la misma logica de forma que aulas/sanitarios: `Forma L`, `+ Vertice`, `- Vertice`, `Rect.` y arrastre de puntos numerados.

### Diagnostico
- El predio tenia una geometria propia `property-boundary` de seis puntos, distinta de `_defaultPlanShape()` usada por aulas y sanitarios.
- `__siteElements` no preservaba `planShape` al normalizar elementos exteriores, por lo que la forma del perimetro podia perderse al refrescar/redibujar.
- Varias acciones seguian rotuladas como `Poligono`, reforzando un flujo distinto al de aulas.

### Cambios implementados
- El predio nuevo ya no nace con hexagono propio: usa `_defaultPlanShape('l')`, la misma base de `Forma L` que aulas/sanitarios.
- Se eliminan los generadores especiales `_defaultPropertyBoundaryShape()` y `_defaultPropertyBoundaryRectShape()` del flujo activo.
- `setPlanSiteElementShape(..., 'rect')` ahora elimina `planShape`, igual que aulas/sanitarios en modo rectangular.
- `+ Vertice` y `- Vertice` del perimetro pasan por `_insertPlanShapeVertex()` y `_removePlanShapeVertex()` sin modo especial.
- `__siteElements` conserva `planShape`, evitando que los vertices del predio se pierdan al normalizar o redibujar.
- Los controles visibles del perimetro cambian de `Poligono` a `Forma L`.
- Los textos del `Registro guiado` explican usar la misma logica de aulas: `Forma L`, `+ Vertice` y puntos arrastrables.
- Version visible, cache y assets actualizados a `v2.6.122`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.122`.
- Probar en tablet: crear perimetro, tocar `Forma L`, usar `+ Vertice`, arrastrar puntos numerados y confirmar.
- Probar `Rect.` y luego `+ Vertice`: debe comportarse como aulas/sanitarios, sin volver al hexagono.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.121` en assets de publicacion.
- Revision estatica: no quedan `_defaultPropertyBoundaryShape()` ni `_defaultPropertyBoundaryRectShape()` activos.
- Revision estatica: `__siteElements` conserva `planShape` y el predio nuevo usa `_defaultPlanShape('l')`.
- Revision estatica: los controles del predio visibles usan `Forma L`, `+ Vertice`, `- Vertice` y `Rect.` como aulas/sanitarios.
- `git commit`: `fd1e646 fix: usar forma tipo aula para perimetro v2.6.122`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.122`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.122`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.122`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `_normalizePropertyBoundaryShape`, conserva `planShape` en `__siteElements` y no contiene `_defaultPropertyBoundaryShape`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `Dibuje el perimetro como un aula editable` y `Forma L, + Vertice`.

---

## Perimetro redimensionable y bloques seleccionables - 2026-05-23 - v2.6.121

### Objetivo
- Permitir editar dimensiones del `Perimetro del predio escolar` aunque este en modo poligonal/hexagonal.
- Evitar que el predio capture el clic o toque sobre bloques ubicados dentro, impidiendo moverlos o redimensionarlos.

### Diagnostico
- En `v2.6.120`, al priorizar vertices del predio se dejaron ocultas las manijas de redimensionamiento del perimetro poligonal.
- El detector de areas del plano podia devolver `property_boundary` por su caja envolvente antes de permitir que el bloque/piso/aula/sanitario recibiera el gesto.
- En tablet esto se percibia como un predio editable solo por puntos y como bloques internos bloqueados por el contorno.

### Cambios implementados
- El perimetro seleccionado muestra simultaneamente esquinas de redimensionamiento y vertices numerados.
- El perimetro conserva el modo poligonal y ya no vuelve a caja rigida para cambiar dimensiones.
- El hit-test del plano da prioridad a bloques, pisos, aulas y sanitarios cuando el toque cae dentro de ellos, aunque tambien esten dentro del predio.
- El predio sigue seleccionable desde espacio libre del contorno o desde la accion guiada `Seleccionar perimetro`.
- Los textos de `Perimetro predio` aclaran que las esquinas cambian tamano y los puntos numerados ajustan forma.
- Version visible, cache y assets actualizados a `v2.6.121`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.121`.
- Probar en tablet: seleccionar perimetro, arrastrar esquinas para cambiar tamano y arrastrar puntos numerados para ajustar forma.
- Probar con bloque dentro del predio: seleccionar bloque, moverlo y redimensionarlo sin que el perimetro capture el toque.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.120` en assets de publicacion.
- Revision estatica: el perimetro poligonal seleccionado dibuja `_drawPlanResizeHandles()` y vertices `site-vertex`.
- Revision estatica: `siteAreaFromPoint()` puede excluir `property_boundary` cuando hay bloque/piso/aula/sanitario debajo.
- Revision estatica: el paso `Perimetro predio` indica usar esquinas para tamano y puntos numerados para forma.
- `git commit`: `c1dbe96 fix: redimensionar perimetro sin bloquear bloques v2.6.121`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.121`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.121`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.121`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `includePropertyBoundary`, `isPropertyBoundaryArea` y `propertyPolygonActive`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene instrucciones de esquinas para tamano del perimetro.

---

## Perimetro con vertices tipo aula y flujo base mapa claro - 2026-05-23 - v2.6.120

### Objetivo
- Hacer que el `Perimetro del predio escolar` se edite con la misma logica operativa que aulas/sanitarios: seleccionar, sumar vertices, quitar vertices y arrastrar puntos numerados.
- Evitar que el `Registro guiado` repita o mezcle la solicitud de ubicacion base con la solicitud de perimetro del predio.

### Diagnostico
- Aunque `property_boundary` ya tenia `planShape`, al seleccionarlo seguia mostrando manijas de rectangulo/redimensionamiento y podia percibirse como un rectangulo rigido.
- El modo rectangular del perimetro eliminaba el `planShape`, dejando un camino que volvia a perder vertices.
- La tarjeta del paso `Perimetro predio` ofrecia acciones de base mapa/georreferencia cuando faltaba cerrar la ubicacion inicial, generando la sensacion de solicitud repetida.
- La pregunta de ajuste del perimetro no mostraba directamente `+ Vertice` y `- Vertice`, obligando a descubrirlos en cinta/panel.

### Cambios implementados
- El perimetro conserva siempre un `planShape`; incluso `Rect.` queda como rectangulo editable de cuatro vertices, no como caja rigida.
- Al seleccionar el perimetro poligonal se ocultan manijas de redimensionamiento/rotacion y quedan visibles los puntos numerados de vertices.
- El paso `Perimetro predio` incorpora acciones directas `Seleccionar perimetro`, `+ Vertice`, `- Vertice` y `Confirmar perimetro`.
- Las acciones superiores del paso predio se reducen al flujo real: crear perimetro, seleccionarlo, sumar vertices y confirmar.
- Si falta guardar la ubicacion base, el paso predio solo redirige a `Paso 1`, sin volver a ofrecer `Usar coordenadas` o `Guardar georef.` como si fuera una nueva solicitud.
- Los textos del paso `Ubicacion escuela` aclaran que la ubicacion base se guarda una sola vez y que luego el predio solo pide contorno.
- Version visible, cache y assets actualizados a `v2.6.120`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.120`.
- Probar en tablet: `Perimetro predio` -> `Dibujar perimetro` -> `+ Vertice` -> arrastrar punto numerado -> `Confirmar perimetro`.
- Confirmar que el paso predio no vuelve a pedir georreferencia si el Paso 1 ya fue guardado.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.119` en assets de publicacion.
- Revision estatica: el perimetro conserva `planShape`, expone `site-vertex` y usa `_defaultPropertyBoundaryRectShape()` para rectangulo editable.
- Revision estatica: `Registro guiado` expone `propertyBoundaryAddVertex`, `propertyBoundaryRemoveVertex` y no repite acciones de georreferencia dentro del paso predio.
- `git commit`: `ac8753a fix: aclarar perimetro guiado v2.6.120`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.120`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.120`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.120`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `_defaultPropertyBoundaryRectShape` y `propertyPolygonActive`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `propertyBoundaryAddVertex` y `Cierre primero la ubicacion base`.

---

## Perimetro poligonal y bloques contenidos en predio - 2026-05-23 - v2.6.119

### Objetivo
- Hacer que el `Perimetro del predio escolar` nazca como poligono editable por vertices, no como rectangulo rigido.
- Mantener los bloques implantados dentro del predio y permitir moverlos/redimensionarlos sin salirse del contorno.

### Diagnostico
- `property_boundary` se dibujaba con `strokeRect()` y solo exponia manijas de rectangulo/rotacion.
- El arrastre y redimensionamiento de bloques usaba como limite el canvas completo del plano, sin considerar el predio ya delineado.
- Si el predio cambiaba de forma despues de ubicar bloques, las posiciones visuales podian quedar fuera de la envolvente real.

### Cambios implementados
- El perimetro se crea con `planShape` poligonal por defecto y muestra vertices numerados editables como aulas/sanitarios.
- Se agregan acciones `Poligono`, `+ Vertice`, `- Vertice` y `Rect.` para el perimetro desde cinta, panel y arbol del plano.
- El dibujo del predio usa el poligono real, con relleno liviano y linea punteada; el rectangulo queda solo como modo opcional.
- El predio se dibuja por debajo de los bloques para que funcione como envolvente de implantacion.
- La ubicacion, movimiento y redimensionamiento de bloques se recortan contra el poligono/borde del predio.
- Al editar vertices o mover el predio, los bloques existentes se reacomodan dentro de la nueva envolvente.
- Los textos del `Registro guiado` ahora indican mover vertices del perimetro.
- Version visible, cache y assets actualizados a `v2.6.119`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.119`.
- Probar en tablet: dibujar perimetro, arrastrar vertices, crear bloque y confirmar que queda dentro del predio.
- Probar mover/redimensionar bloque contra los bordes del predio y verificar que no se salga.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.118` en assets de publicacion.
- Revision estatica: `property_boundary` crea `planShape`, expone `site-vertex` y acciones de vertices.
- Revision estatica: movimiento/redimensionamiento de bloques pasa por `_clampBlockRectToPropertyBoundary()`.
- `git commit`: `c5d168d fix: perimetro poligonal y bloques dentro del predio v2.6.119`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.119`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.119`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.119`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `_defaultPropertyBoundaryShape`, `site-vertex` y `_clampBlockRectToPropertyBoundary`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene instrucciones de vertices del perimetro.

---

## Navegacion anterior/siguiente y zoom de seleccion - 2026-05-23 - v2.6.118

### Objetivo
- Corregir los botones `Anterior` y `Siguiente` del `Registro guiado`, especialmente para volver al item o pregunta inmediatamente anterior.
- Verificar y cerrar cualquier camino de zoom automatico al seleccionar objetos del plano.

### Diagnostico
- `Anterior` usaba solo historial de etapas (`_guidedHistory`), por lo que dentro de una misma etapa secuencial no podia volver al ultimo item respondido.
- Ese historial se guardaba en `localStorage`, por lo que podia quedar viejo entre sesiones y provocar saltos inesperados.
- El plano general ya no aplicaba zoom al seleccionar, pero quedaba una funcion interna vieja `_focusSchoolPlanArea()` capaz de reintroducir ese comportamiento si se reutilizaba despues.

### Cambios implementados
- Se agrega historial de preguntas guiadas en memoria de sesion (`_guidedQuestionHistory`).
- Antes de acciones que cambian respuesta, item o etapa, la guia guarda la pregunta activa con su foco de plano cuando existe.
- `Anterior` intenta restaurar primero la pregunta/item inmediatamente anterior; si no hay historial de preguntas, vuelve a la etapa anterior.
- La pregunta anterior vuelve como tarjeta de revision editable, sin borrar la respuesta ya cargada; `Siguiente` desde esa revision retorna al flujo actual.
- El historial de etapas deja de persistirse en `localStorage`, evitando saltos viejos al retomar la app.
- Se elimina `_focusSchoolPlanArea()` y su helper, dejando la seleccion del plano sin cambio automatico de zoom.
- Version visible, cache y assets actualizados a `v2.6.118`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.118`.
- Probar en tablet: responder una pregunta de aula/sanitario, tocar `Anterior` y confirmar que vuelve al item inmediato anterior.
- Seleccionar objetos del plano y confirmar que el zoom no cambia salvo gesto manual, rueda con Ctrl o botones de acercar/alejar.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.117` en assets de publicacion.
- Revision estatica: `Anterior` usa `_guidedQuestionHistory` y `_guidedReviewQuestion` antes de caer al historial de etapas.
- Revision estatica de zoom: no existe `_focusSchoolPlanArea`; `selectArea()` y `focusSelectedPlanItem()` no llaman a `_setSchoolPlanZoomValue`.
- `git commit`: `9f8e8e0 fix: corregir navegacion guiada v2.6.118`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.118`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.118`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.118`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `_guidedQuestionHistory`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: no contiene `_focusSchoolPlanArea` ni `_planAreaFocusPoint`.
- Refuerzo posterior `git commit`: `9c12054 fix: restaurar pregunta anterior guiada v2.6.118`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `_guidedReviewQuestion` y `_questionHistorySnapshot`.

---

## Georreferencia, perimetro y destrabe de paredes - 2026-05-23 - v2.6.117

### Objetivo
- Resolver el cuelgue en `Aula 1: material predominante de pared`.
- Ordenar el inicio del `Registro guiado`: primero identificar escuela, posicionar ubicacion en base mapa y guardar georreferencia corregida; luego delinear perimetro aproximado del predio; despues iniciar bloques.
- Evitar que puertas o ventanas se inserten en aulas/sanitarios con poligono irregular.

### Diagnostico
- `setGuidedClassroomField()` guardaba `pared_material`, `pared_estado` y `requiere_intervencion` en el sketch activo.
- `_cloneClassroom()` no preservaba esos campos al sincronizar el aula, por eso la guia volvia a la misma pregunta.
- El paso `Predio base` permitia avanzar sin georreferencia guardada y no tenia un objeto explicito para bordes del predio.
- Las aberturas usan anclaje a pared regular; sobre un poligono irregular la geometria de puerta/ventana podia quedar mal resuelta.

### Cambios implementados
- `_cloneClassroom()` preserva `pared_material`, `pared_estado` y `requiere_intervencion`.
- `Registro guiado` exige `Ubicacion escuela` con identidad confirmada y base mapa guardada antes de avanzar.
- `savePlanBaseMap()` copia latitud/longitud corregidas a `general` y `__selectedSchool` del borrador.
- Se agrega el elemento `property_boundary` / `Perimetro del predio escolar` al plano general.
- El paso `Perimetro predio` crea, selecciona y confirma el borde aproximado del predio antes de pasar a bloques.
- El perimetro queda fuera del conteo normal de `Exteriores`, para que no bloquee ni reemplace la pregunta de elementos exteriores.
- Puertas y ventanas se bloquean en aulas/sanitarios con `planShape` irregular; la guia ofrece pasar a `Rectangular` o registrar que no corresponde.
- Version visible, cache y assets actualizados a `v2.6.117`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.117`.
- Probar en tablet: escuela seleccionada -> guardar base mapa -> dibujar/confirmar perimetro -> crear bloque -> aula -> responder paredes.
- Probar aula con forma L: la guia debe bloquear puerta/ventana hasta convertir a rectangular o marcar que no tiene abertura.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de credenciales.
- Revision estatica: no quedan referencias activas a `2.6.116` ni `v2.6.103` en assets de publicacion.
- Revision estatica por script: todos los campos `answerClassroomField` existen en `_cloneClassroom()`.

---

## Auxiliar de normalizacion en Registro guiado - 2026-05-22 - v2.6.116

### Objetivo
- Corregir el error JavaScript `ReferenceError: _normalizeText is not defined` que cortaba el render de `Registro guiado`.

### Diagnostico
- `GuidedRegisterModule._normalizeFloorLabel()` llamaba a `_normalizeText()` para reconocer `PB`, `Planta baja` y pisos normalizados.
- Esa funcion auxiliar no existia dentro del closure de `guided-register.js`.
- La misma referencia tambien existia en `mec-form.js`, por lo que podia fallar despues en el motor MEC al normalizar pisos.

### Cambios implementados
- Se agrega `_normalizeText()` en `guided-register.js`.
- Se agrega `_normalizeText()` en `mec-form.js`.
- Version visible y cache del Service Worker actualizados a `v2.6.116`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.116`.
- Probar nuevamente `Mapa > Iniciar/continuar registro` y confirmar que no aparece `ReferenceError` en consola.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: `_normalizeText()` existe en `guided-register.js` y `mec-form.js`, y no quedan referencias activas a `2.6.115` en assets de publicacion.

---

## Escuela seleccionada priorizada en Registro guiado - 2026-05-22 - v2.6.115

### Objetivo
- Corregir que `Mapa > Iniciar/continuar registro` ya navegara a la vista de relevamiento pero no mostrara los datos de la escuela seleccionada.

### Diagnostico
- `Registro guiado` construia el encabezado desde el borrador local global.
- Si ese borrador tenia un `__selectedSchool` viejo, vacio o de otra escuela, ese dato ganaba sobre la escuela activa recien elegida en el mapa.
- Por eso la vista podia abrir, pero con identidad de escuela incorrecta o sin escuela visible.

### Cambios implementados
- `GuidedRegisterModule._snapshot()` compara la escuela guardada en borrador con la escuela activa de `SurveyModule`/`MapModule`.
- Si no coinciden, la escuela activa del mapa se usa como fuente principal para el encabezado y metadatos del registro guiado.
- Se agrega comparacion robusta por `id_escuela`, `codigo_local`, `codigo`, `id`, `code` y digitos normalizados.
- Version visible y cache del Service Worker actualizados a `v2.6.115`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.115`.
- Probar con una escuela distinta a la ultima usada: el encabezado del registro debe cambiar inmediatamente al codigo/nombre seleccionado en el mapa.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: no quedan referencias activas a `2.6.114` en assets de publicacion.
- `git commit`: `a3f4434 fix: priorizar escuela activa en registro v2.6.115`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.115`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.115`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `_sameSchoolIdentity` y prioridad de escuela activa.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene cache-busting `2.6.115` y no conserva `2.6.114`.

---

## Boton verde de mapa sin accion por escuela previa nula - 2026-05-22 - v2.6.114

### Objetivo
- Corregir que `Mapa > Iniciar/continuar registro` no llevara a ningun lado despues de la correccion de identidad robusta.

### Diagnostico
- Al primer clic no existe todavia una escuela activa previa en `SurveyModule`.
- `SurveyModule.setCurrentEscuela()` intentaba calcular el identificador primario de `_currentEscuela` aunque fuera `null`.
- Ese error JavaScript cortaba la accion antes de ejecutar `AppController.showModule('registro')`, por eso el boton verde parecia no responder.

### Cambios implementados
- `_schoolPrimaryId()` y `_schoolIdentityKeys()` ahora toleran `null` tanto en `SurveyModule` como en `MapModule`.
- `MapModule.startGuidedRegister()` envuelve la sincronizacion de escuela y apertura de `Registro guiado` en `try/catch`.
- Si vuelve a fallar la transicion, la app mostrara un toast visible con el detalle en vez de fallar silenciosamente.
- Version visible y cache del Service Worker actualizados a `v2.6.114`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.114`.
- Probar desde una sesion sin escuela activa previa: `Mapa > escuela asignada > Iniciar/continuar registro`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: no quedan referencias activas a `2.6.113` en assets de publicacion.

---

## Identidad robusta de escuela mapa-registro - 2026-05-22 - v2.6.113

### Objetivo
- Resolver que `Mapa > Iniciar/continuar registro` siguiera abriendo `Registro guiado` sin conservar la escuela en algunos casos.

### Diagnostico
- La primera correccion esperaba la carga del modulo, pero los botones del mapa seguian enviando principalmente `id_escuela`.
- En filas del padron oficial o mezclas con hoja operativa, la identidad confiable puede venir por `codigo_local`, `codigo`, `id` o digitos normalizados.
- Si el identificador enviado era vacio o no coincidia, la app podia no recuperar exactamente la escuela seleccionada antes de abrir el registro.

### Cambios implementados
- `MapModule` ahora genera acciones con un identificador primario robusto: `id_escuela`, `codigo_local`, `codigo`, `id` o `code`.
- La busqueda de escuela del mapa compara tambien digitos normalizados.
- Los marcadores y filas de lista quedan indexados por todas las claves disponibles de la escuela.
- `SurveyModule.selectEscuela()` tambien resuelve escuela por `id_escuela`, `codigo_local`, `codigo`, `id`, `code` y digitos normalizados.
- `MecFormModule` guarda el snapshot de escuela con `code`, `codigo`, `id` y nombres alternativos, evitando perder identidad cuando la fila proviene del padron oficial.
- `Registro guiado` toma como respaldo inmediato la escuela activa de `SurveyModule` o `MapModule` si el borrador local aun no termino de escribirse.
- Se mantiene el refuerzo de `MecFormModule.setSelectedSchool(..., force: true)` despues de cargar `Registro guiado`.
- Version visible y cache del Service Worker actualizados a `v2.6.113`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.113`.
- Probar con una escuela del padron que tenga `codigo_local` visible: el encabezado de `Registro guiado` debe mostrar codigo/nombre inmediatamente despues de tocar `Iniciar/continuar registro`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git commit`: `a4431ae fix: conservar escuela mapa registro v2.6.113`.
- `git push origin main`: publica la correccion en GitHub Pages.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.113`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.113`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene `_schoolPrimaryId` y `startGuidedRegister` con `_findSchoolById`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene respaldo `MapModule.getSelectedEscuela`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene snapshot de escuela con `code`.

---

## Traspaso de escuela desde mapa a registro guiado - 2026-05-22 - v2.6.112

### Objetivo
- Corregir que al seleccionar una escuela en `Mapa` y tocar `Iniciar/continuar registro`, la vista `Registro guiado` se abriera sin conservar la escuela activa.

### Diagnostico
- El flujo `Mapa > Registro guiado` podia cambiar de vista mientras los assets diferidos del motor MEC seguian cargando.
- Si `MecFormModule` todavia no estaba listo, la escuela quedaba solo en `SurveyModule` y el registro podia renderizar desde un borrador global sin `__selectedSchool`.

### Cambios implementados
- `AppController.showModule()` ahora devuelve la promesa de inicializacion del modulo, permitiendo esperar la carga real de `mec-form.js` y `guided-register.js`.
- `MapModule.startGuidedRegister()` ahora espera a que `Registro guiado` termine de inicializarse.
- Despues de la carga, la app vuelve a fijar explicitamente la escuela activa en `MecFormModule.setSelectedSchool(..., force: true)`.
- `GuidedRegisterModule.init()` se ejecuta nuevamente luego de reforzar la escuela para que el encabezado, preguntas y plano tomen el contexto correcto.
- Version visible y cache del Service Worker actualizados a `v2.6.112`.

### Pendiente operativo
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.112`.
- Probar en tablet: abrir `Mapa`, seleccionar escuela asignada, tocar `Iniciar/continuar registro` y confirmar que el encabezado muestra nombre/codigo de la escuela.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.

---

## Planta baja como huella de bloque y redimensionamiento de pisos - 2026-05-22 - v2.6.111

### Objetivo
- Corregir que el piso dentro de un bloque no pudiera estirarse hasta coincidir con los bordes del bloque.
- Ajustar la semantica de niveles: todo bloque contiene `Planta baja`; luego se agregan `Piso 1`, `Piso 2`, etc.
- Eliminar la cabecera interna del piso que reducia artificialmente el area util y generaba margenes obligatorios.

### Cambios implementados
- `Planta baja` pasa a ser el primer nivel normalizado en el motor del plano y en el registro guiado.
- Al crear un bloque nuevo, se crea automaticamente su `Planta baja`.
- Los bloques antiguos sin pisos cargados reciben una `Planta baja` operativa al normalizar el borrador.
- La geometria de piso ya no reserva cabecera ni margenes duros: puede ocupar toda la huella del bloque.
- El redimensionamiento y movimiento del piso se limita al contorno completo del bloque, no a una caja interior reducida.
- Se elimina el bloqueo de solape entre pisos, porque distintos niveles pueden compartir la misma huella edilicia.
- El area sobrante entre bloque y planta/piso queda visible como relleno grisaceo `PASILLO / GALERIA`.
- La escala del bloque en el plano deja de crecer por cantidad de pisos; representa la huella del bloque una sola vez.
- Version visible y cache del Service Worker actualizados a `v2.6.111`.

### Pendiente operativo
- Probar en tablet: crear bloque, confirmar que nace `Planta baja`, seleccionar el piso y estirarlo hasta coincidir con el borde del bloque.
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.111`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

---

## Mi Jornada, fotos Drive y cobertura MEC validada - 2026-05-22 - v2.6.110

### Objetivo
- Permitir desde `Mi Jornada` continuar, retomar o editar una escuela ya cerrada usando el `Registro guiado`.
- Hacer mas verificable la subida de fotos a la carpeta Drive de evidencias.
- Dejar visible que la secuencia guiada se contrasta con el Excel MEC validado `VF 24-03-26`.

### Cambios implementados
- `Mi Jornada` reemplaza el boton unico `Abrir` por acciones segun estado: `Iniciar`, `Continuar`, `Editar`, `Retomar` y `Mapa`.
- Las acciones de jornada abren directamente `Registro guiado`, fijando la escuela activa en `SurveyModule/MecFormModule`, incluso para relevamientos finalizados que deban corregirse.
- Si la fila de jornada viene solo desde `sesiones_relevamiento`, la app conserva la identidad del usuario como asignacion operativa para no bloquear la reapertura.
- Las fotos pendientes ahora pueden sincronizarse manualmente desde `Registro guiado` con `Subir fotos Drive`.
- Antes de guardar en Sheets o cerrar una escuela, el motor intenta subir evidencias pendientes a Drive y luego arma el indice de evidencias.
- Si la subida de fotos falla, el aviso manual muestra el primer detalle tecnico recibido para diagnosticar permisos, sesion o deployment.
- El modo demo devuelve tambien `subFolderId`, alineado con el guardado real por subcarpeta de escuela.
- El esquema MEC declara como fuente vigente `PLANIF-2026-FORMULARIO VERIFICADO_MEC-CIALPA- DTIC_VF 24-03-26.xlsx`.
- Se agrega metadata de cobertura del Excel revisado: `Gral.`, `Servicios`, `Electricidad`, `Bloque&Nivel`, `Area Rec.`, `Aula (1)`, `Dependencia`, `Laboratorio`, `Taller` y `Sanitario (1)`.
- El registro guiado muestra la referencia `Excel MEC VF 24-03-26` en la etapa inicial.
- La secuencia guiada suma preguntas de paredes e intervencion para ambientes y sanitarios, ademas de techo y piso.
- Version visible, assets y cache actualizados a `v2.6.110`.

### Pendiente operativo
- Publicar frontend en GitHub Pages y pedir `Actualizar app` para tomar `cialpa-app-v2.6.110`.
- Probar con usuario real: abrir `Mi Jornada`, editar una escuela finalizada y confirmar que vuelve al `Registro guiado`.
- Probar una foto real: sacar foto desde una pregunta/elemento, tocar `Subir fotos Drive` y verificar subcarpeta `{codigo_local} - {nombre_escuela}` en Drive.
- Si el boton informa permisos de Drive, redeploy/autorizar Apps Script desde la cuenta propietaria del Web App.

### Validaciones ejecutadas
- Lectura del Excel MEC validado en `H:\Mi unidad\PLANIF-2026-FORMULARIO VERIFICADO_MEC-CIALPA- DTIC_VF 24-03-26.xlsx`: hojas detectadas `Gral.`, `Servicios`, `Electricidad`, `Bloque&Nivel`, `Area Rec.`, `Aula (1)`, `Dependencia`, `Laboratorio`, `Taller`, `Sanitario (1)`.
- `node --check assets/js/jornada.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- `npm.cmd run simulate:ui`: 2 pruebas saltadas correctamente por falta de `CIALPA_USER`/`CIALPA_PASSWORD`.

---

## Integracion de ubicacion real en la app - 2026-05-22 - v2.6.109

### Objetivo
- Llevar la auditoria de ubicacion al uso cotidiano de la app.
- Ayudar a ajustar la base mapa del plano escolar sobre el predio real.
- Mantener el criterio de no guardar fotos de Google Street View como evidencia propia.

### Cambios implementados
- Se agrega el modulo `Ubicacion real` para supervisores y administradores.
- El modulo carga escuelas desde `getEscuelas`, muestra KPIs de coordenadas y una muestra territorial para revision.
- Se puede exportar un `CSV base` con coordenadas y enlaces de revision.
- Se puede importar el CSV generado por la herramienta privada de auditoria para visualizar confianza y distancia dentro de la app.
- En cada escuela del mapa se agregan botones `Maps`, `Street View` y `OSM`.
- `Street View` se abre como vista en vivo de Google Maps; no se descarga ni se guarda imagen.
- El Service Worker precachea `assets/js/location-audit.js`.
- Version visible, assets y cache actualizados a `v2.6.109`.

### Pendiente operativo
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.109`.
- Usar `npm run audit:locations -- --limit=100 --source=all` para generar auditorias mas amplias desde una maquina con red.
- Revisar manualmente casos `baja` o `sin_candidato` antes de corregir coordenadas oficiales.

### Validaciones ejecutadas
- `node --check assets/js/location-audit.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Servidor local `127.0.0.1:8061`: `index.html` responde HTTP 200.
- `git push origin main`: publica commit `9442c75`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.109`.
- Verificacion HTTP de GitHub Pages para `assets/js/location-audit.js`: contiene `LocationAuditModule`, `CSV base` y `street_view_url`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.109` y `location-audit.js`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `module-ubicacion` y assets `v=2.6.109`.

---

## Auditoria de ubicacion real de escuelas - 2026-05-22

### Objetivo
- Preparar una forma reproducible de revisar si las coordenadas del padron coinciden con referencias externas.
- Ensayar con al menos 10 escuelas sin guardar imagenes de Google Street View ni contenido de Google Maps como evidencia propia.
- Dejar enlaces de revision en vivo para ajustar mejor la base mapa del plano escolar.

### Cambios implementados
- Se agrega `tools/location-audit/verify_school_locations.mjs`.
- Se agrega script `npm run audit:locations`.
- La herramienta lee el padron local ignorado por Git y genera reportes privados en `tools/location-audit/output/`.
- Se normalizan coordenadas en grados/minutos/segundos del padron completo y coordenadas decimales de la muestra piloto.
- Se consulta Nominatim y, si no hay coincidencia nominal, Overpass/OpenStreetMap alrededor de la coordenada del padron.
- El reporte calcula distancia entre coordenada del padron y candidato externo, confianza y recomendacion operativa.
- Se generan enlaces de Google Maps y Street View para revision manual en vivo, sin descargar ni guardar fotos de Street View.
- Se agrega `tools/location-audit/README.md` con criterios de uso y limites de licencia.
- `tools/location-audit/output/` queda ignorado por Git porque puede contener nombres y coordenadas de escuelas.

### Ensayo ejecutado
- Comando: `node tools/location-audit/verify_school_locations.mjs --limit=10 --source=all`.
- Fuente: padron completo local `tools/simulation/lista_oficial_escuelas_2025_listado_ini.csv`.
- Proveedor externo: Nominatim + Overpass/OpenStreetMap.
- Resultado de la muestra de 10 escuelas:
  - `alta`: 3.
  - `media`: 0.
  - `baja`: 2.
  - `sin_candidato`: 5.
- Reporte local generado: `tools/location-audit/output/location-audit-20260522225024.md`.

### Interpretacion operativa
- En los casos `alta`, la coordenada del padron es compatible con una escuela mapeada y puede usarse como base inicial del plano.
- En los casos `baja` o `sin_candidato`, no conviene reemplazar coordenadas automaticamente: corresponde abrir mapa/Street View, revisar visualmente y confirmar en campo.
- El mecanismo es util para priorizar escuelas con coordenadas dudosas antes del relevamiento.

### Validaciones ejecutadas
- `node --check tools/location-audit/verify_school_locations.mjs`.
- `node tools/location-audit/verify_school_locations.mjs --help`.
- `node tools/location-audit/verify_school_locations.mjs --limit=10 --source=all` con red habilitada.
- `node -e "JSON.parse(...package.json...)"`: OK.

---

## Ajustes de plano y registro guiado MEC - 2026-05-22 - v2.6.108

### Objetivo
- Corregir inconsistencias visibles en medidas, fotos y elementos del plano.
- Reducir trabas del flujo guiado en pilares, techo y piso.
- Avanzar sobre nuevas necesidades del MEC: puertas especiales, sanitarios dentro de aulas y plano electrico aproximado.

### Cambios implementados
- Las etiquetas de medidas de puertas, ventanas y objetos redimensionables ahora prefieren las medidas sincronizadas de la ficha y se actualizan al estirar el objeto en el plano.
- Se agregan tipos de puerta PVC, doble hoja y corrediza en la guia y en la ficha.
- Las puertas corredizas y de doble hoja tienen marca visual propia en plano y PDF.
- La capa de electricidad dibuja conexiones aproximadas entre tablero y tomas, luces, ventiladores o aire acondicionado dentro de aulas y sanitarios.
- La foto tomada desde la guia de un elemento actualiza el contador visible, evitando que quede `Sin foto`.
- Se agregan fotos directas de techo y piso del ambiente desde la pregunta guiada correspondiente.
- El indice de evidencias y el anexo fotografico incorporan fotos de techo y piso.
- Los pilares declarados por cantidad se crean todos y se distribuyen en el bloque; no se piden detalles por cada pilar.
- Los pendientes del elemento se compactan para no ocupar demasiada altura en la vista.
- Se elimina el zoom automatico al seleccionar objetos; `Escape` mantiene la limpieza de seleccion y zoom.
- Los sanitarios ya no bloquean ni son bloqueados por aulas al ubicarse, permitiendo representar sanitarios dentro de aulas u otros ambientes.
- El PDF imprime pizarrones y agrega un resumen de exteriores/galerias asociados.
- Version visible y cache actualizados a `v2.6.108`.

### Revision MEC
- Se verifico acceso al archivo validado `H:\Mi unidad\PLANIF-2026-FORMULARIO VERIFICADO_MEC-CIALPA- DTIC_VF 24-03-26.xlsx`.
- Hojas detectadas: `Gral.`, `Servicios`, `Electricidad`, `Bloque&Nivel`, `Area Rec.`, `Aula (1)`, `Dependencia`, `Laboratorio`, `Taller`, `Sanitario (1)`.
- Queda pendiente una matriz completa campo por campo contra el flujo guiado para cerrar brechas finas del cuestionario.

### Pendiente operativo
- Subir frontend a GitHub Pages y pedir `Actualizar app` para tomar `cialpa-app-v2.6.108`.
- Probar en tablet: cantidad de pilares, foto de techo/piso, puerta doble/corrediza, pizarron, sanitario dentro de aula y PDF.
- Continuar con una pasada especifica de deshacer/rehacer para elementos generales, sanitarios y exteriores.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.

---

## Fix dimensiones piso + reinicio preguntas al seleccionar elemento — 2026-05-22 — v2.6.106

### Objetivos
1. Que al seleccionar un elemento ya cargado en el plano, el flujo guiado vuelva a mostrar desde la primera pregunta del elemento para poder corregir cualquier dato.
2. Corregir el bug que impedía confirmar las medidas de un piso recién insertado en un bloque.

### Causa raíz (Issue 1 — reinicio de preguntas al seleccionar)
`_activatePlanSelection(id)` en `mec-form.js` no reseteaba el flag `__guidedReviewed` al seleccionar un elemento. Cuando ese flag contiene un timestamp (ISO), `_nextGuidedObjectField` devuelve `''` (hecho), de modo que el flujo guiado mostraba el elemento como completo y no presentaba sus preguntas.

### Causa raíz (Issue 2 — dimensiones del piso atascadas)
En `_saveFloorMeasures` (guided-register.js), después de llamar a `setGuidedFloorField` (que internamente ejecuta `_ensureBlockFloors` y asigna IDs a los pisos), la búsqueda del piso usaba `item.id || item.label` como expresión única: si `item.id` era truthy, nunca comparaba con el label. El piso buscado por label ("Piso 1") no era encontrado, el flag de confirmación se guardaba bajo la clave equivocada, y el requisito "Cargar dimensiones" nunca se marcaba como completado.

### Cambios implementados

**mec-form.js (`_activatePlanSelection`)**
- Al seleccionar un elemento de aula (`roomId::objectId`) o sanitario (`sanitary::sanitaryId::objectId`), si su `ficha.__guidedReviewed` es truthy, se resetea a `''`.
- Luego se llama `_saveDraft` y `_notifyGuidedPlanSync` para persistir el cambio y refrescar el panel guiado.
- Resultado: el flujo guiado muestra las preguntas desde el primer campo cada vez que el usuario selecciona un elemento.

**guided-register.js (`_saveFloorMeasures`)**
- Corregida la búsqueda del piso post-guardado: ahora compara `item.id` y `item.label` por separado (en lugar de `item.id || item.label`), de modo que funciona tanto si `floorId` es un UUID como si es un label.
- La clave del flag de confirmación usa `floor.id || _floorLabel(floor) || floorId`, alineada con lo que espera `_floorRequirementItems`.

### Pendiente operativo
- Actualizar app: "cialpa-app-v2.6.106".
- Probar: insertar piso en bloque → ingresar medidas → click "Guardar medidas" → debe avanzar a "estado".
- Probar: seleccionar un elemento ya completado en el plano → flujo guiado debe mostrar primera pregunta del elemento.

---

## Botones de forma y agregar elementos — 2026-05-22 — v2.6.104

### Objetivos
1. Hacer visibles los botones "Forma L", "+ Vértice", "- Vértice", "Rect." para bloques, aulas y sanitarios dentro del flujo de registro guiado.
2. Facilitar agregar más de un elemento del mismo tipo (foco, puerta, ventana, enchufe, etc.) al seleccionar un elemento ya colocado.

### Causa raíz (Issue 1 — botones de forma)
`_renderPlanBuilderPanel()` (que contiene las acciones de forma) está oculto por CSS en `#module-registro` (`display: none`). Al estar el flujo guiado dentro de ese módulo, los botones de polígono nunca eran accesibles.

### Causa raíz (Issue 2 — múltiples elementos)
Los botones de inserción existen en la pestaña "Insertar" del ribbon, pero los usuarios no descubrían que podían volver a hacer click en el mismo botón para agregar otro elemento. No había feedback visual al seleccionar un elemento ya colocado.

### Cambios implementados

**mec-form.js (`_renderPlanRibbonPanel` — pestaña "Editar")**
- Cuando hay un bloque, aula o sanitario seleccionado, se agrega un grupo "Forma" al ribbon con los botones: "Forma L", "+ Vértice", "- Vértice", "Rect."
- El grupo aparece condicionalmente según el tipo de ID seleccionado y llama a las funciones existentes (`setPlanBlockShape`, `addPlanBlockVertex`, etc.).

**mec-form.js (`_renderPlanFloatingActions`)**
- Cuando se selecciona un elemento dentro de un aula (puerta, ventana, foco, enchufe, etc.), el panel flotante ahora muestra un botón "+ [Tipo]" para agregar otro elemento del mismo tipo directamente.
- Mismo comportamiento para elementos dentro de sanitarios (cabinas, artefactos, aberturas).

### Pendiente operativo
- Actualizar app: "cialpa-app-v2.6.104".
- Verificar en el flujo guiado: seleccionar un bloque → pestaña "Editar" → debe aparecer grupo "Forma".
- Verificar: agregar una puerta a un aula → seleccionarla → debe aparecer botón "+ Puerta" en el panel flotante.

---

## Fix cuelgue en medidas de bloque - 2026-05-22 - v2.6.103

### Objetivo
- Eliminar el cuelgue de la guia en "Bloque: medidas principales" que impedia avanzar al estado del bloque.

### Causa raiz
`_updateSnapshot()` reemplaza el innerHTML de todos los paneles `[data-guided-next]` ante cualquier sincronizacion automatica (incluida la que dispara `newBlock()` ~180ms despues de crear el bloque). Al hacerlo, destruia los inputs de largo/ancho que el usuario acababa de empezar a escribir. El usuario terminaba con inputs vacios, la validacion fallaba silenciosamente, y la pregunta "quedaba colgada".

### Cambios implementados

**guided-register.js (`_updateSnapshot`)**
- Antes de reemplazar el HTML de cada panel, captura los valores actuales de todos los inputs de medicion (`data-guided-*-length/width/diameter`).
- Despues del reemplazo, restaura esos valores en los nuevos inputs si todavia no tienen valor guardado en el snapshot.
- Esto preserva lo que el usuario esta escribiendo incluso cuando llega un refresh automatico.

**guided-register.js (`_saveBlockMeasures`, `_saveFloorMeasures`)**
- Las llamadas a `setGuidedBlockField`/`setGuidedFloorField` ahora estan envueltas en `try/catch` para evitar que errores silenciosos dejen la pregunta colgada sin feedback.
- Si alguna devuelve `false`, se muestra un toast explicativo.
- Al guardar exitosamente, se llama `_updateSnapshot()` inmediatamente (ademas del `_refreshSoon(400)`) para garantizar que la pregunta avanza sin esperar el delay.

### Pendiente operativo
- Actualizar app: "cialpa-app-v2.6.103".
- Probar el flujo de medidas con bloc recien creado: escribir valores, click Guardar, verificar que avanza a estado.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`: OK.
- `node --check assets/js/mec-form.js`: OK.

---

## Techo/piso no bloqueante, pilares multiples, checklist compacta, bloques poligonales - 2026-05-22 - v2.6.102

### Objetivo
- Eliminar el cuelgue infinito de la guia al responder techo y piso del aula.
- Permitir declarar la cantidad exacta de pilares (0-6+) y crearlos todos a la vez sin requerir ficha detallada.
- Reducir el espacio que ocupa el checklist de requisitos en la tarjeta guiada.
- Extender el soporte de formas libres (Forma L / + Vertice / - Vertice) a bloques.

### Cambios implementados

**mec-form.js (`_cloneClassroom`)**
- Agregados `techo_tipo`, `techo_estado`, `piso_tipo`, `piso_estado` al objeto que retorna `_cloneClassroom`.
- Sin este fix, cada respuesta de techo se guardaba en el sketch pero se descartaba al sincronizar, haciendo que la guia repitiera la misma pregunta indefinidamente.

**mec-form.js (`_blockDrivenPlanSpecs`, `_syncBlockDrivenPlanElements`)**
- `_blockDrivenPlanSpecs`: para `pilares_bloque`, parsea el valor numerico y retorna N specs de pilar.
- `_syncBlockDrivenPlanElements`: caso especial para `pilares_bloque` — limpia todos los pilares existentes del bloque antes de crear los nuevos, garantizando que el conteo declarado sea exacto.
- Cada pilar creado recibe codigo unico: `Pil B1 1`, `Pil B1 2`, etc.

**mec-form.js (dibujo de bloque, `setPlanBlockShape`, `addPlanBlockVertex`, `removePlanBlockVertex`)**
- El renderizador de bloques en `_drawSchoolPlan` ahora usa `_drawPlanShapePath` si el bloque tiene `planShape`.
- En forma poligonal, se dibujan los handles de vertice con `_drawPlanShapeVertices` y se ocultan los handles de resize/rotate.
- `_planVertexDragConfig` extiende soporte a `block-vertex` para arrastre interactivo de vertices.
- `_movePlanVertex` maneja el caso `block` guardando el vertice ajustado en `block.planShape`.
- Botones "Forma L / + Vertice / - Vertice / Rectangular" agregados al panel de seleccion del bloque.

**guided-register.js (pregunta de pilares)**
- Pregunta reemplazada: de "Hay pilares visibles?" (si/no) a "Cuantos pilares visibles hay en el piso?" con opciones 0 a 6+.

**guided-register.js (`_siteElementRequirementItems`)**
- Para pilares, los requisitos "Cargar dimensiones", "Condicion de calidad" y "Caracteristicas tecnicas" se marcan como `optional: true`. Solo "Ubicar en plano" es obligatorio.

**guided-register.js (`_guidedRequirementList`)**
- Items completados (done) se colapsan en una sola linea: "✓ Ubicar en plano · Condicion de calidad ...".
- Solo el primer item pendiente muestra el texto de ayuda; los demas solo muestran titulo e icono.
- CSS: selector `.guided-requirements__item--summary` para el estilo compacto de los completados.

### Pendiente operativo
- Actualizar app: "cialpa-app-v2.6.102".
- Probar el flujo completo de techo/piso en un aula real para confirmar que la guia avanza.
- Probar declarar 3 pilares: deben aparecer 3 fichas separadas en el plano.
- Seleccionar un bloque → "Forma L" → verificar vertices arrastrables.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`: OK.
- `node --check assets/js/guided-register.js`: OK.

---

## Reinicio de escuela, confirmacion de medidas y preguntas edilicias - 2026-05-22 - v2.6.101

### Objetivo
- Permitir reiniciar completamente la carga de una escuela cuando fue registrada por error.
- Hacer que la primera pregunta del `Registro guiado` confirme identificacion y ubicacion de la escuela.
- Evitar que una medida modificada en el plano haga avanzar la guia sin confirmacion del encuestador.
- Mantener visible por al menos un segundo la opcion marcada antes de pasar a la siguiente pregunta.
- Agregar preguntas faltantes sobre pilares de bloque, techo/cubierta de aulas y tipo/calidad de piso.

### Cambios implementados
- `Registro guiado` agrega confirmacion editable de codigo, nombre, departamento, distrito, localidad, direccion y coordenadas antes de cargar infraestructura.
- Se agrega `Reiniciar escuela`, que limpia borrador local, tiempos, bloques, pisos, aulas, sanitarios y exteriores, conservando la escuela seleccionada para volver a empezar.
- Apps Script agrega `reiniciarRelevamientoEscuela`, que elimina borradores MEC de la escuela, suspende sesiones abiertas y vuelve el estado operativo a `pendiente`.
- Las dimensiones de bloque, piso, aula, sanitario y exteriores se separan entre `detectadas` y `confirmadas`: si se estira en el plano, la tarjeta superior muestra la nueva medida y pide `Confirmar medidas`.
- Las respuestas marcadas en tarjetas guiadas conservan el color fuerte al menos un segundo antes de refrescar la pregunta siguiente.
- La ayuda de campo pasa debajo de los controles para que las opciones de respuesta ocupen el centro visible de la tarjeta.
- `Escape` en el plano cancela seleccion/zoom enfocado sobre objetos pequenos.
- La guia pregunta por pilares visibles del bloque y crea un pilar ubicable cuando corresponde.
- Aulas/ambientes preguntan tipo y estado de techo, tipo de piso y estado/calidad del piso; esos campos tambien quedan editables desde la ficha.
- Sanitarios preguntan tipo y estado/calidad del piso.
- Version visible y cache del Service Worker actualizados a `v2.6.101`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada para activar `reiniciarRelevamientoEscuela`.
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.101`.
- Probar en tablet: estirar bloque/aula/sanitario, confirmar medidas desde la guia, responder techo/piso/pilares y usar `Escape` para salir del zoom.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante `vm.Script`: OK.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: bloqueado por permisos del sandbox sobre `C:\Users\Diego`; la escalacion no quedo disponible en este turno.
- `git add ...`: bloqueado por permisos del sandbox sobre `.git/index.lock`; la escalacion no quedo disponible en este turno.

---

## Preguntas visibles, botones neutros y pasillos automaticos - 2026-05-22 - v2.6.100

### Objetivo
- Evitar que los botones del `Registro guiado` parezcan seleccionados por defecto.
- Usar una sola escala visual para opciones: suave antes de responder y fuerte solo cuando hay seleccion/estado activo real.
- Hacer mas clara y visible la pregunta superior que guia la captura.
- Señalar espacios residuales como pasillo/galeria cuando el piso no ocupa todo el bloque o cuando quedan huecos entre ambientes.
- Corregir `Anterior` para volver al paso visitado inmediatamente antes, en vez de saltar al inicio del flujo.

### Cambios implementados
- Los botones principales de la guia dejan de usar colores fuertes por defecto aunque internamente sean acciones sugeridas.
- Las opciones de preguntas usan `btn-guided-soft`; el estado fuerte queda reservado para botones realmente activos/seleccionados.
- La tarjeta de pregunta superior ahora destaca explicitamente `Pregunta:` con mayor tamaño, borde y contraste.
- La cinta del plano dentro de `Registro guiado` usa una escala visual unica, sin verdes/amarillos/rojos que confundan respuesta con advertencia.
- Los botones tipo opcion del MEC dentro de `Registro guiado` se neutralizan hasta que el usuario marque una respuesta.
- El historial de navegacion guiada guarda los ultimos pasos visitados y `Anterior` usa ese historial.
- El sobrante entre bloque y piso se pinta en gris y se etiqueta como `PASILLO / GALERIA`.
- Los huecos estrechos entre aulas, sanitarios y otros ambientes se detectan visualmente y se etiquetan como `PASILLO`.
- Version visible y cache del Service Worker actualizados a `v2.6.100`.

### Pendiente operativo
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.100`.
- Probar en tablet: abrir `Registro guiado`, verificar que ninguna opcion aparece marcada antes de responder, usar `Anterior` y revisar pisos/ambientes con espacios sobrantes.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Playwright/Chromium local: `Registro guiado` abre en `module-registro`, la pregunta superior aparece visible y no hay botones `primary/success/warning/danger` dentro de la tarjeta de pregunta.
- `git commit`: `adda29c` - `fix: ordenar guia visual y pasillos v2.6.100`.
- `git push origin main`: publica `adda29c`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.100`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.100`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `btn-guided-soft`, `_guidedHistory` y `Pregunta guiada`.

---

## Sincronizacion de medidas entre plano y guia - 2026-05-22 - v2.6.99

### Objetivo
- Asegurar que las dimensiones modificadas manualmente estirando objetos en el plano impacten en la tarjeta superior del `Registro guiado`.
- Asegurar el camino inverso: cuando se cargan medidas en los cuadritos de la guia, el objeto visible del plano se redimensiona.
- Extender los controles superiores de largo/ancho a aulas/ambientes y sanitarios, no solo a bloque, piso y exteriores.

### Cambios implementados
- El motor MEC notifica al `Registro guiado` despues de guardar cambios del plano, permitiendo refrescar la tarjeta superior sin depender de cerrar o cambiar de paso.
- `Registro guiado` agrega `syncFromPlan()`, refrescando preguntas y controles cuando el plano actualiza medidas.
- Aulas/ambientes con geometria pero sin medidas muestran ahora cuadritos superiores de largo y ancho.
- Sanitarios con geometria pero sin medidas muestran ahora cuadritos superiores de largo y ancho.
- Al guardar medidas de aula/ambiente desde la guia, se actualiza la geometria del aula en el plano.
- Al guardar medidas de sanitario desde la guia, se actualiza la geometria del sanitario en el plano.
- Al editar medidas de bloque desde la guia, si el bloque ya tenia una forma estirada en el plano, se ajusta proporcionalmente el ancho/alto visual.
- Al editar medidas de piso desde la guia, se recalculan las proporciones visuales del piso dentro del bloque.
- Version visible y cache del Service Worker actualizados a `v2.6.99`.

### Pendiente operativo
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.99`.
- Probar en tablet: estirar bloque, piso, aula, sanitario y exterior; confirmar que la guia superior avanza o muestra medidas sincronizadas.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Playwright/Chromium local: al simular medidas de bloque provenientes del plano, la tarjeta superior pasa de `Bloque: medidas principales` a `Bloque: estado general`.
- Playwright/Chromium local: sanitarios pendientes muestran cuadritos superiores `Largo del sanitario` y `Ancho del sanitario`.
- `git commit`: `8909c45` - `fix: sincronizar medidas guiadas v2.6.99`.
- `git push origin main`: publica `8909c45`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.99`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.99`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.99`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `syncFromPlan` y `saveClassroomMeasures`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `_scheduleGuidedRegisterSync`.

---

## Registro guiado como captura principal y botones visibles - 2026-05-21 - v2.6.98

### Objetivo
- Evitar que la insercion de elementos dentro de `Registro guiado` abra fichas automaticamente.
- Asegurar que aulas, sanitarios, pisos, exteriores y sus elementos se completen desde preguntas superiores secuenciales.
- Mejorar la visibilidad de los botones de insercion para que no queden escondidos o solapados en tablet.

### Cambios implementados
- El motor del plano detecta cuando esta dentro de `Registro guiado` y activa modo guiado para inserciones directas desde cinta, panel contextual o botones del plano.
- Aulas, otros espacios, sanitarios, pisos, cabinas, artefactos, aberturas, equipos, fallas y exteriores ya no abren ficha automaticamente cuando se crean desde `Registro guiado`.
- Los elementos insertados quedan seleccionados y pendientes para que la tarjeta superior pida tipo, estado/calidad, apertura, bisagra u otros datos segun corresponda.
- La guia agrega preguntas para piso: largo, ancho y estado, sin depender de la ficha.
- La guia agrega preguntas para exteriores: medidas, estado y caracteristica tecnica principal, sin depender de la ficha.
- La secuencia de sanitarios incorpora cabina, tomas, tablero, ventilador y aire acondicionado ademas de puerta, ventana, artefactos, luz y fallas.
- La secuencia de aulas incorpora escalera interna y nota/rotulo ademas de puertas, ventanas, electricidad, equipos, pizarron y fallas.
- La cinta de herramientas dentro de `Registro guiado` ahora permite envoltura vertical y scroll propio para evitar botones ocultos o montados.
- Version visible y cache del Service Worker actualizados a `v2.6.98`.

### Pendiente operativo
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.98`.
- Probar en tablet: insertar aula, sanitario, cabina y exterior desde la cinta y confirmar que aparece la pregunta superior antes de usar ficha.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/jornada.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git commit`: `1707b80` - `fix: completar captura guiada y ribbon v2.6.98`.
- `git push origin main`: publica `1707b80`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.98`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.98`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.98`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `saveSiteMeasures`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `_isGuidedRegisterActive`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene `school-plan-ribbon__panel`.
- Playwright/Chromium local: `Registro guiado` abre en `v2.6.98`, sin errores de consola, y la cinta del plano reporta `flex-wrap: wrap`.
- Playwright/Chromium local con escuela simulada: crea bloque, piso y aula; pestaña `Insertar` muestra 27 botones, sin solapes detectados y con scroll vertical propio.

---

## Cierre con siguiente escuela y guia secuencial reforzada - 2026-05-21 - v2.6.97

### Objetivo
- Hacer que `Finalizar escuela` siempre muestre una respuesta visible y motivadora.
- Al finalizar, devolver inmediatamente al `Mapa` y enfocar la siguiente escuela sugerida para el encuestador.
- Reforzar que la captura principal ocurra en la tarjeta superior del `Registro guiado`, paso a paso, dejando las fichas como apoyo secundario.

### Cambios implementados
- `Finalizar escuela` muestra aviso de progreso mientras guarda cierre, jornada y evidencias.
- Al cerrar, aparece un mensaje emergente `Escuela finalizada` con confirmacion, contexto de pendientes y siguiente escuela sugerida.
- `Registro guiado` deja de abrir PDF automaticamente al cierre y vuelve al mapa operativo.
- `Mapa` agrega `showNextAfterFinalized()`, marca la escuela actual como finalizada localmente y enfoca la siguiente escuela asignada pendiente.
- La sugerencia prioriza escuelas asignadas al usuario, no finalizadas, con preferencia por cercania y muestra piloto.
- La creacion guiada de bloque ya no abre la ficha automaticamente: la guia superior pide largo, ancho y estado general.
- Aulas y sanitarios ahora preguntan en secuencia si existen puertas, ventanas, artefactos, luces, fallas y otros elementos basicos antes de agregarlos al plano.
- Las fichas quedan disponibles como `Editar ficha`, pero ya no son la ruta principal de captura.
- Version visible y cache del Service Worker actualizados a `v2.6.97`.

### Pendiente operativo
- Publicar frontend en GitHub Pages.
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.97`.
- Probar con un encuestador real: finalizar escuela, ver mensaje emergente, volver al mapa y confirmar enfoque de siguiente escuela asignada.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/jornada.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Playwright/Chromium local: `Registro guiado` abre en `v2.6.97` sin errores de consola.
- `git commit`: `ff79764` - `fix: reforzar cierre y guia secuencial v2.6.97`.
- `git push origin main`: publica `ff79764`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.97`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.97`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.97`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `addGuidedRoomElement`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene `showNextAfterFinalized`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene `guided-question-fields--pair`.

---

## Apunte a nuevo Web App propietario - 2026-05-21 - v2.6.96

### Objetivo
- Apuntar la PWA al nuevo deployment publicado desde la cuenta propietaria/aceptada.
- Confirmar que el backend publicado incluye el codigo necesario para cierre final, `Mi Jornada` y padron oficial completo.
- Forzar cache nuevo para que los navegadores tomen la URL backend correcta.

### Resultado
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbyt-THSOSgFwvH8Oxl8ojpfJR_8gNhezYA1N7JPmgG0L2RyEtfHq9E58BgfcG33yD2voA/exec`.
- El Web App nuevo responde `login` sin credenciales con validacion publica, sin HTTP 403.
- `diagnosticoPadron` responde `source: official_sheet`, `total: 5462`, `con_coordenadas: 5004`, `muestra_piloto: 86`, `filas_operativas: 108`.
- `guardarCierreCompleto` sin token responde `Token inválido o expirado`, confirmando endpoint protegido y disponible.
- `getEscuelas` sin token responde `Token inválido o expirado`, confirmando backend publico protegido por sesion.
- Version visible y cache del Service Worker actualizados a `v2.6.96`.

### Pendiente operativo
- Pedir a usuarios y administradores `Actualizar app` para tomar `cialpa-app-v2.6.96`.
- Probar con `diego.meza`: finalizar una escuela real desde `Registro guiado` y confirmar que aparece en `Mi Jornada`.
- Probar puerta/ventana en sanitario y boton `Apertura` en tablet con la version publicada.

### Validaciones ejecutadas
- Prueba HTTP del Web App nuevo para `login` sin datos: responde `Usuario y contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`, `filas_operativas: 108`.
- Prueba HTTP del Web App nuevo para `guardarCierreCompleto` sin token: responde `Token inválido o expirado`.
- Prueba HTTP del Web App nuevo para `getEscuelas` sin token: responde `Token inválido o expirado`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/jornada.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git commit`: `265f8c3` - `fix: apuntar nuevo web app v2.6.96`.
- `git push origin main`: publica `265f8c3`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.96` y URL GAS nueva.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.96`.
- Verificacion HTTP de GitHub Pages para `index.html`: assets `v2.6.96`.

---

## Flujo guiado secuencial, sanitarios y jornada - 2026-05-21 - v2.6.95

### Objetivo
- Hacer que la captura principal ocurra en la tarjeta superior del `Registro guiado`, pregunta por pregunta.
- Dejar las fichas como herramienta secundaria para revisar o corregir informacion ya declarada.
- Corregir que el cierre de un relevamiento desde `Registro guiado` no impactara en `Mi Jornada`.
- Recuperar puertas/ventanas y cambio de apertura para sanitarios con la misma logica de aulas.

### Cambios implementados
- Las aulas creadas desde la guia ya no abren ficha automaticamente: la guia pide estado, uso/condicion y luego elementos declarados.
- Los sanitarios creados desde la guia ya no traen uso/genero/agua como respuestas cerradas: la guia los pregunta secuencialmente.
- Puertas, ventanas, tomas, tableros, luces, ventiladores, aires, fallas y artefactos agregados desde la guia quedan pendientes de preguntas superiores.
- La tarjeta superior registra tipo, estado/calidad, apertura y bisagra para puertas sin obligar a entrar a ficha.
- La ficha de aula, elemento, sanitario u objeto sanitario queda disponible como `Editar ficha`, pero no es el camino principal de carga.
- Los sanitarios vuelven a aceptar puertas y ventanas desde el mismo set de herramientas que aulas.
- El boton `Apertura` vuelve a cambiar puertas seleccionadas desde el plano general, tanto en aulas como en sanitarios.
- `guardarCierreCompleto` ahora asegura una fila `finalizada` en `sesiones_relevamiento` para que `Mi Jornada` refleje cierres hechos desde `Registro guiado`.
- Version visible y cache del Service Worker actualizados a `v2.6.95`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria para activar la reparacion de `Mi Jornada`.
- Publicar frontend en GitHub Pages.
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.95`.
- Probar con `diego.meza`: finalizar una escuela desde `Registro guiado` y confirmar que aparece en `Mi Jornada`.
- Probar en tablet: crear aula, agregar puerta/ventana, responder preguntas superiores y usar `Editar ficha` solo como correccion.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/jornada.js`.
- Validacion sintactica de `gas/sheets.gs` mediante Node.
- `git diff --check`.
- Playwright local con sesion simulada: `Registro guiado` abre en `v2.6.95`, muestra tarjeta superior y no registra errores de consola.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git commit`: `7c1fea2` - `fix: guiar captura secuencial v2.6.95`.
- `git push origin main`: publica `7c1fea2`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.95`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.95`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene captura secuencial `answerClassroomObjectField`.

---

## Demo visible para panel Infraestructura MEC - 2026-05-21 - v2.6.94

### Objetivo
- Evitar que `Infraestructura MEC` quede vacio cuando todavia no hay borradores reales publicados en el backend o en el navegador.
- Permitir mostrar las bondades del tablero con una demo clara de 1000 respuestas sinteticas, sin confundirla con datos reales.

### Cambios implementados
- Se agrega `assets/data/demo-infraestructura-mec.json` con el agregado liviano de la simulacion `demo1000_20260521`.
- Si el backend no devuelve `infraestructura_mec` y no hay borrador MEC local, el panel carga automaticamente la demo.
- El panel muestra chip `Modo demo` y fuente `Demo 1000 respuestas sinteticas`.
- Se agrega boton `Demo 1000` en la cabecera y `Cargar demo 1000 respuestas` en el estado vacio.
- El Service Worker precachea el JSON demo.
- Version visible y cache actualizados a `v2.6.94`.

### Pendiente operativo
- Publicar Web App propietario para que el panel muestre datos reales desde `mec_borradores`.
- Pedir `Actualizar app` para tomar `cialpa-app-v2.6.94`.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Parseo JSON de `assets/data/demo-infraestructura-mec.json`: OK.
- Playwright con servidor HTTP local: sin datos reales, `Infraestructura MEC` carga demo, muestra `Modo demo`, `1000 escuelas con ficha MEC`, 4 tarjetas tecnicas y sin overflow horizontal.

---

## Simulacion masiva de respuestas demo por territorio - 2026-05-21

### Objetivo
- Generar al menos 1000 respuestas sinteticas para mostrar las bondades del instrumento CIALPA.
- Prorratear la muestra por departamento y distrito usando el padron oficial local.
- Evitar escrituras accidentales en produccion dejando la carga al backend bloqueada por confirmacion explicita.

### Cambios implementados
- Se agrega `tools/simulation/cialpa_bulk_demo_responses.mjs`.
- Se agrega el script `npm run simulate:demo`.
- El generador usa el CSV local `lista_oficial_escuelas_2025_listado_ini.csv`.
- La asignacion se hace por `Departamento + Distrito`: si la cantidad alcanza, asigna al menos una respuesta por distrito y reparte el resto proporcionalmente al peso del distrito en el padron.
- Cada respuesta sintetica incluye borrador MEC con bloques, aulas, sanitarios, exteriores, electricidad, accesibilidad, danos, evidencias sinteticas y tiempos logisticos.
- La salida incluye JSONL de payloads API, CSV compatible con `mec_borradores`, CSV de prorrateo, snapshot `infraestructura_mec` y resumen Markdown.
- `--write` queda protegido por `--confirm-write=SIMULAR_1000`.
- `tools/simulation/demo-output/` queda ignorado por Git para no publicar datasets demo grandes.

### Resultado local generado
- Run ID: `demo1000_20260521`.
- Respuestas sinteticas: `1000`.
- Departamentos cubiertos: `18`.
- Distritos cubiertos: `263`.
- CSV `mec_borradores`: `tools/simulation/demo-output/demo-mec_borradores-demo1000_20260521.csv`.
- Payloads API: `tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl`.
- Prorrateo territorial: `tools/simulation/demo-output/demo-allocation-demo1000_20260521.csv`.
- Snapshot infraestructura: `tools/simulation/demo-output/demo-infraestructura_mec-demo1000_20260521.json`.
- Resumen: `tools/simulation/demo-output/demo-summary-demo1000_20260521.md`.

### Validaciones ejecutadas
- `node --check tools/simulation/cialpa_bulk_demo_responses.mjs`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `npm.cmd run simulate:demo -- --count=1000 --run-id=demo1000_20260521 --seed=demo-mec-1000`.
- Verificacion de salida: `1000` filas en `demo-mec_borradores`, `263` distritos en `demo-allocation`.
- Resumen por departamento revisado: 18 departamentos con respuestas prorrateadas.
- `git push origin main`: publica commit `e47a7c3`.

---

## Super panel de infraestructura MEC - 2026-05-21 - v2.6.93

### Objetivo
- Crear un panel separado para interesados del MEC, centrado en infraestructura escolar y no en avance censal.
- Mostrar una lectura tecnica de ambientes, sanitarios, electricidad, accesibilidad, daños, evidencias y tiempos.
- Consolidar el tablero con datos globales de `mec_borradores` cuando el backend publicado ya tenga el agregado.

### Cambios implementados
- Se agrega el modulo `Infraestructura MEC` al menu de supervisores y administradores.
- `Resultados globales` incorpora acceso directo al nuevo panel, pero mantiene su foco operativo/censal.
- El nuevo panel muestra radiografia edilicia, KPIs tecnicos, tarjetas de decision, semaforo de estado, alertas prioritarias y tiempos promedio.
- `StatsModule` agrega `initMecInfrastructure()`, `loadMecInfrastructure()` y exportacion `JSON tecnico`.
- `CialpaLocalStore.mecMetrics()` amplía metricas locales de infraestructura: exteriores, luces, ventiladores, aires, tableros, rampas, sanitarios accesibles, sanitarios criticos, puesta a tierra, diferencial y circuitos identificados.
- Apps Script agrega `infraestructura_mec` dentro de `getStats`, calculado desde la ultima fila disponible por escuela en `mec_borradores`.
- El agregado global de infraestructura se calcula solo cuando el modulo `Infraestructura MEC` lo solicita, evitando cargar de mas `Resultados globales`.
- Version visible y cache del Service Worker actualizados a `v2.6.93`.

### Pendiente operativo
- Publicar el Web App desde la cuenta propietaria/aceptada para que `infraestructura_mec` quede disponible globalmente.
- Publicar el frontend en GitHub Pages y pedir `Actualizar app`.
- Abrir `Infraestructura MEC` con una cuenta supervisora/admin y verificar conteos contra `mec_borradores`.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/local-store.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node por stdin.
- Playwright local por `file://`: modulo `Infraestructura MEC` visible, 4 tarjetas tecnicas, alertas renderizadas y sin overflow horizontal.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git push origin main`: publica commit `d35d765`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.93`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.93`.
- Verificacion HTTP de GitHub Pages para `assets/js/stats.js`: contiene `initMecInfrastructure` e `infraestructura_mec`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `module-infraestructura` y `Panel tecnico edilicio`.
- `git push origin main`: publica ajuste `7a83530`, dejando `infraestructura_mec` bajo demanda.
- Verificacion HTTP de GitHub Pages para `assets/js/stats.js`: `API.getStats({ infraestructura_mec: true })`.

---

## Tablero ejecutivo moderno para Resultados globales - 2026-05-21 - v2.6.92

### Objetivo
- Transformar `Resultados globales` en un tablero ejecutivo atractivo para presentar CIALPA como una herramienta integral.
- Facilitar la navegacion por resultados con filtros, KPIs, graficos, matriz territorial, ranking y actividad reciente.
- Mantener el arranque liviano cargando Chart.js solo cuando se abre el panel estadistico.

### Cambios implementados
- `Resultados globales` incorpora una cabecera ejecutiva `Tablero ejecutivo CIALPA` con acciones de exportacion y actualizacion.
- Se agrega un panel principal con aro de avance, chips de universo/territorios/responsables, ritmo operativo, riesgo y territorio lider.
- Los KPIs se rediseñan con notas dinamicas de porcentaje/estado.
- Los filtros pasan a un panel lateral persistente con opciones dinamicas por departamento y encuestador.
- Se agregan tarjetas de lectura ejecutiva: prioridad operativa, mejor avance, punto de atencion y evidencias locales.
- Se agrega `Navegacion territorial` con tarjetas por departamento y barras de avance.
- El ranking de encuestadores incorpora barras de progreso e indicador visual de incidencias.
- Los graficos reciben titulos propios y una paleta mas sobria: avance, composicion y ritmo diario.
- Chart.js deja de cargarse en `index.html` y pasa a carga diferida desde `StatsModule` al abrir `Resultados globales`.
- Version visible y cache del Service Worker actualizados a `v2.6.92`.

### Pendiente operativo
- Pedir a administradores/supervisores `Actualizar app` para tomar `cialpa-app-v2.6.92`.
- Revisar en tablet real la lectura del panel con datos vivos y ajustar si algun texto territorial resulta demasiado largo.

### Validaciones ejecutadas
- `node --check assets/js/stats.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/app.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Prueba Playwright local con datos simulados: renderiza `stats-command-center`, 4 tarjetas de insight, matriz territorial, ranking de encuestadores y version `v2.6.92`.
- Prueba Playwright local: Chart.js no se carga en Inicio y se carga bajo demanda al abrir `Resultados globales`.
- Prueba Playwright local movil `390x844`: `Resultados globales` no genera desborde horizontal.
- `git push origin main`: publica commit `e93d719`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.92`, `stats-executive-dashboard`, `stats-territory-board` y no carga Chart.js al inicio.
- Verificacion HTTP de GitHub Pages para `assets/js/stats.js?v=2.6.92`: contiene `_renderExecutiveDashboard`, `_renderTerritoryBoard` y carga diferida `CHART_JS_URL`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css?v=2.6.92`: contiene estilos `stats-command-center`, `stats-filter-panel` y `territory-card`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.92`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.92`.
- `npm.cmd run metrics:web -- --cache-bust`: escritorio FCP `520 ms`, tablet FCP `172 ms`, movil FCP `168 ms`; 20 requests, 0 fallidas, 0 HTTP 4xx/5xx y 0 errores/advertencias de consola.

---

## Arranque liviano y carga bajo demanda del motor MEC - 2026-05-21 - v2.6.91

### Objetivo
- Reducir la lentitud general de la app, especialmente al abrirla en tablet/celular.
- Evitar que el inicio, mapa y planificacion descarguen y parseen el motor completo de plano/registro MEC si el usuario no lo usa.
- Mantener el registro guiado y el plano disponibles, pero cargados solo cuando se abren.

### Cambios implementados
- `index.html` deja de cargar en el arranque inicial `mec-schema.js`, `mec-form.js`, `guided-register.js` y `mec-form.css`.
- `AppController` agrega carga diferida versionada para `Registro guiado`, `Cuestionario MEC` y `Plano escuela`.
- Al abrir esos modulos, la app carga `mec-form.css`, `mec-schema.js`, `mec-form.js` y, para registro guiado, `guided-register.js`.
- El Service Worker deja de precachear esos archivos pesados en el app shell inicial; quedan cacheados cuando se usan.
- Se difieren aproximadamente `1141 KB` del primer arranque/precache: `mec-form.js`, `guided-register.js`, `mec-schema.js` y `mec-form.css`.
- `Imprimir PDF` del plano pasa por `AppController.printPlanPdf()` para asegurar que el motor MEC este cargado antes de imprimir.
- Version visible y cache del Service Worker actualizados a `v2.6.91`.

### Pendiente operativo
- Pedir a usuarios `Actualizar app` para tomar `cialpa-app-v2.6.91`.
- En tablets de campo, probar: abrir app, entrar a Inicio, luego abrir Mapa/Planificacion y finalmente Registro guiado para confirmar que la primera pantalla carga mas rapido.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Prueba Playwright local: el inicio autenticado no carga `mec-form.js`, `guided-register.js` ni `mec-schema.js`.
- Prueba Playwright local: al abrir `Plano escuela`, se carga `MecFormModule` bajo demanda.
- Prueba Playwright local: al abrir `Registro guiado`, se cargan `GuidedRegisterModule` y `MecFormModule` bajo demanda.
- `git push origin main`: publica commit `e27b710`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.91`, no carga `mec-form.js`, `guided-register.js`, `mec-schema.js` ni `mec-form.css` en el arranque.
- Verificacion HTTP de GitHub Pages para `assets/js/app.js?v=2.6.91`: contiene `_ensureModuleAssets` y carga diferida del motor MEC.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.91` sin precache de `mec-form.js`, `guided-register.js`, `mec-schema.js` ni `mec-form.css`.
- `npm.cmd run metrics:web -- --cache-bust`: escritorio FCP `540 ms`, tablet FCP `180 ms`, movil FCP `164 ms`; 21 requests, 0 fallidas, 0 HTTP 4xx/5xx y 0 errores/advertencias de consola.

---

## Refuerzo de cache y rol admin para guardado de planificacion - 2026-05-21 - v2.6.90

### Objetivo
- Corregir el caso reportado donde un usuario que ingresa como admin seguia viendo el mensaje viejo `Solo administradores autorizados pueden guardar asignaciones`.
- Evitar que tablets/celulares sigan ejecutando `planning.js` anterior por cache del navegador o Service Worker.
- Tratar el rol `admin` del backend como administrador operativo sin depender de la lista local `ADMIN_USERS`.

### Cambios implementados
- `Auth.isAdminUser()` ahora reconoce como administrador a toda sesion cuyo rol normalizado sea `admin`.
- Se normalizan variantes de rol como `administrador`, `administradora`, `supervisora`, `encuestadora` y `cargadora`.
- `index.html` carga CSS, manifest y scripts locales con `?v=2.6.90`, incluyendo `planning.js?v=2.6.90` y `auth.js?v=2.6.90`.
- Version visible y cache del Service Worker actualizados a `v2.6.90`.

### Pendiente operativo
- En el celular/tablet con el error, tocar `Actualizar app` una vez y volver a iniciar sesion si lo pide.
- Confirmar que la pantalla muestre `v2.6.90`, cambiar una asignacion y guardar.

### Validaciones ejecutadas
- `node --check assets/js/auth.js`.
- `node --check assets/js/planning.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: no queda el mensaje viejo `Solo administradores autorizados pueden guardar asignaciones` en `planning.js`.
- Revision estatica: `index.html` carga `auth.js?v=2.6.90` y `planning.js?v=2.6.90`.
- Revision estatica: `Auth.isAdminUser()` reconoce sesiones con rol normalizado `admin`.
- `git push origin main`: publica commit `f3f7857`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.90`, `auth.js?v=2.6.90` y `planning.js?v=2.6.90`.
- Verificacion HTTP de GitHub Pages para `assets/js/auth.js?v=2.6.90`: contiene `_normalizeRole` y rol admin normalizado.
- Verificacion HTTP de GitHub Pages para `assets/js/planning.js?v=2.6.90`: no contiene el mensaje viejo y valida `Auth.canAccess('supervisor')`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js?v=2.6.90`: version `2.6.90`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.90`.

---

## Guardado visible de distribucion para roles operativos - 2026-05-21 - v2.6.89

### Objetivo
- Corregir que usuarios con rol operativo de planificacion vean la distribucion pero no vean el boton para guardar asignaciones.
- Alinear el frontend con el backend: `asignarEscuela` ya permite guardar a roles `admin` y `supervisor`.
- Asegurar que despues de guardar, el cache local de escuelas quede actualizado en la app actual.

### Cambios implementados
- El boton superior `Guardar cambios` de `Planificacion operativa` pasa de `data-min-role="admin"` a `data-min-role="supervisor"`.
- La franja interna `Guardar cambios (N)` de `Distribucion de escuelas` tambien queda visible para supervisores y administradores.
- `saveAssignments()` valida `Auth.canAccess('supervisor')` en vez de la lista blanca estricta `ADMIN_USERS`.
- Al guardar correctamente, se actualiza el cache local `getEscuelas` con las asignaciones confirmadas.
- El mensaje de exito ahora confirma que las asignaciones fueron guardadas en Sheets y publicadas para todos los usuarios.
- Version visible y cache del Service Worker actualizados a `v2.6.89`.

### Pendiente operativo
- Pedir a administradores/supervisores `Actualizar app` para tomar `cialpa-app-v2.6.89`.
- Probar con el usuario que reporto el problema: abrir `Planificacion > Distribucion de escuelas`, cambiar una asignacion, verificar `Guardar cambios (1)`, guardar y recargar desde otro usuario.

### Validaciones ejecutadas
- `node --check assets/js/planning.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: `Planificacion` mantiene acceso `supervisor`, `Guardar cambios` queda visible para `supervisor`, `saveAssignments()` valida `Auth.canAccess('supervisor')`, y cache `cialpa-app-v2.6.89`.
- `git push origin main`: publica commit `d5a6597`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.89`.
- Verificacion HTTP de GitHub Pages para `assets/js/planning.js`: contiene `Auth.canAccess('supervisor')`, `_rememberAssignmentsCache` y guardado visible para `supervisor`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.89` y boton `Guardar cambios`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.89`.

---

## Apunte a Web App con evidencias indexadas - 2026-05-21 - v2.6.88

### Objetivo
- Apuntar la PWA al Web App nuevo publicado por la cuenta propietaria/aceptada.
- Confirmar que el deployment publico nuevo mantiene padron oficial, endpoints publicos y proteccion por token.
- Forzar cache nuevo para que usuarios tomen el backend con `uploadEvidence` reforzado.

### Resultado
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbwvV43sQYTJz0GDmSFAwp4ev0mdG_Hr_2IHK3kr3HIqeN2JXHkWdPrr_A6U3RWfQ6ck5w/exec`.
- El Web App responde `login` sin credenciales con validacion publica, sin HTTP 403.
- `registrarUsuario` sigue como endpoint publico y responde validacion de campos requeridos.
- `diagnosticoPadron` responde `source: official_sheet`, `total: 5462`, `muestra_piloto: 86`, `filas_operativas: 95`.
- `getEscuelas` sin token responde `Token invalido o expirado`, confirmando proteccion de endpoints privados.
- Version visible y cache del Service Worker actualizados a `v2.6.88`.

### Pendiente operativo
- Pedir a administradores y encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.88`.
- Probar una carga real de foto: confirmar subcarpeta `{codigo_local} - {nombre_escuela}` en Drive y fila de `evidencias` con `subfolder_id`.

### Validaciones ejecutadas
- Prueba HTTP del Web App nuevo para `login` sin datos: responde `Usuario y contrasena son requeridos`.
- Prueba HTTP del Web App nuevo para `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`, `filas_operativas: 95`.
- Prueba HTTP del Web App nuevo para `registrarUsuario` sin datos: responde `Usuario, nombres, apellidos y contrasena son requeridos`.
- Prueba HTTP del Web App nuevo para `recuperarPassword` sin datos: responde `Usuario y nueva contrasena son requeridos`.
- Prueba HTTP del Web App nuevo para `getEscuelas` sin token: responde `Token invalido o expirado`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git push origin main`: publica commit `192fff7`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.88` y URL GAS nueva.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.88`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.88`.

---

## Verificacion y refuerzo de evidencias indexadas - 2026-05-21 - v2.6.87

### Objetivo
- Verificar los cambios de `v2.6.86`: fotos por subcarpeta de escuela, mapa con carga masiva de markers y cache de estadisticas.
- Asegurar que la relacion foto -> escuela -> aula/sanitario/elemento quede visible tambien en el indice local y en el cierre.
- Subir GAS a HEAD para activar `uploadEvidence` con subcarpetas en Drive.

### Cambios implementados
- El registro local de cada foto subida guarda tambien `driveSubFolderId`, tomado del `subFolderId` devuelto por Apps Script.
- El `evidenceIndex` del borrador/cierre incluye `driveSubFolderId` junto con `driveFolderId`, `driveFileId`, URL y contexto.
- `_schoolEvidenceContext()` reconoce explicitamente `codigo_local`, `id_escuela` y `nombre_escuela`, evitando que una foto quede como `sin_escuela` si el formulario general aun no estaba completo.
- `uploadEvidence` en GAS usa como respaldo `params.codigo_local`, `params.id_escuela`, `params.schoolCode`, `params.nombre_escuela` o `params.schoolName` si el contexto viene incompleto.
- El nombre de subcarpeta se sanitiza para Drive, conservando el formato `{codigo_local} - {nombre_escuela}`.
- `setup.gs` actualiza los encabezados iniciales de `evidencias` para incluir `subfolder_id`.
- Version visible y cache del Service Worker actualizados a `v2.6.87`.

### Pendiente operativo
- Publicar/actualizar el Web App desde la cuenta propietaria/aceptada para que la URL `/exec` pase de `@23` a una version nueva con `uploadEvidence` reforzado.
- Pedir a encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.87`.
- Hacer una carga real de foto desde una escuela y confirmar en Drive la subcarpeta `{codigo_local} - {nombre_escuela}` dentro de `1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/stats.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `node -e "JSON.parse(...package.json...); JSON.parse(...gas/appsscript.json...)"`: OK.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `clasp.cmd show-authorized-user`: sesion local `dmeza.py@gmail.com`.
- `clasp.cmd deployments`: Web App publico `AKfycbzrXilB80CszA0EDVj-SO7rJ9SmDY1Yg_Ym1qFgKmSdgfftK0uo1uRclsEq4uroSnfSJQ` sigue en `@23`; no se redeploya desde la cuenta editora para evitar repetir el riesgo historico de HTTP 403.
- Prueba HTTP del Web App para `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.87`.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `driveSubFolderId` y contexto escolar con `codigo_local` / `id_escuela`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene `addLayers(toAdd)` y `addLayers(filteredMarkers)`.
- Verificacion HTTP de GitHub Pages para `assets/js/stats.js`: contiene `_statsCache` y `STATS_CACHE_TTL`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.87`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.87`.

---

## Fotos indexadas por escuela, mapa mas rapido, cache de estadisticas - 2026-05-21 - v2.6.86

### Objetivo
- Las fotos de evidencia quedan organizadas en subcarpetas por escuela dentro de la carpeta raiz de Drive.
- Reducir el tiempo de carga del mapa en tablet al agregar 5462 puntos.
- Evitar que el panel de estadisticas consulte GAS en cada apertura.

### Cambios implementados

**GAS — `gas/sheets.gs` (`uploadEvidence`)**
- Antes de crear el archivo en Drive, se busca o crea una subcarpeta `{codigo_local} - {nombre_escuela}` dentro de `EVIDENCE_FOLDER_ID`.
- El archivo de la foto se guarda en esa subcarpeta en vez de la raiz.
- Se agrega la columna `subfolder_id` a la hoja `evidencias` y al objeto de retorno de la funcion.
- Fallback a la carpeta raiz si la creacion de subcarpeta falla.

**Map — `assets/js/map.js` (`loadMarkers`, `applyFilters`)**
- Reemplazado `_markerCluster.addLayer(marker)` llamado 5462 veces por `_markerCluster.addLayers(toAdd)` (llamada unica al batch API de leaflet.markercluster).
- El mismo patron aplicado en `applyFilters`: se construye array `filteredMarkers` y se llama `addLayers` una sola vez.
- Esto elimina el procesamiento interno de cluster que se disparaba 5462 veces y bloqueaba el hilo principal en tablet.

**Stats — `assets/js/stats.js` (`loadStats`)**
- Se agrega cache en memoria (`_statsCache`) con TTL de 5 minutos por combinacion de filtros.
- Si hay resultado cacheado vigente, se renderiza directamente sin consultar GAS.
- El cache se invalida al cambiar los filtros o al pasar 5 minutos; no se guarda en caso de error remoto.

### Pendiente operativo
- Subir GAS con `clasp.cmd push -f` desde `gas/` para que los nuevos uploads vayan a subcarpetas.
- Pedir a encuestadores `Actualizar app` para tomar `cialpa-app-v2.6.86`.
- Verificar en Drive que las fotos nuevas aparecen en subcarpetas por escuela.

### Validaciones ejecutadas
- `node --check assets/js/map.js`: OK.
- `node --check assets/js/stats.js`: OK.

---

## Filtro de muestra y guardado firme de distribucion - 2026-05-21 - v2.6.85

### Objetivo
- Permitir en `Planificacion operativa > Distribucion de escuelas` trabajar solo con escuelas de la muestra piloto.
- Hacer que `Balancear pendientes` y `Rebalancear todo` respeten los filtros actuales, especialmente `Solo muestra piloto`.
- Evitar que una asignacion parezca guardada si no llego realmente a Sheets.

### Cambios implementados
- La distribucion agrega filtro `Todas las escuelas` / `Solo muestra piloto`.
- El balanceo automatico ahora opera sobre las escuelas filtradas visibles, no sobre todo el padron completo por defecto.
- Despues de balancear, el mensaje indica que hay que pulsar `Guardar cambios` para publicar la distribucion.
- El boton principal de guardado queda destacado como `Guardar cambios (N)` cuando hay cambios pendientes.
- `saveAssignments()` valida la respuesta de `asignarEscuela`; si el backend devuelve error o la operacion no se confirma, la fila no se marca como guardada.
- `API.asignarEscuela()` ya no entra a cola offline: las asignaciones deben confirmarse online para impactar en Sheets y ser visibles para otros usuarios.
- Las filas de escuelas de muestra quedan marcadas como `Muestra piloto`.
- Version visible y cache del Service Worker actualizados a `v2.6.85`.

### Pendiente operativo
- Pedir a administradores `Actualizar app` para tomar `cialpa-app-v2.6.85`.
- Probar con admin: filtrar `Solo muestra piloto`, tocar `Balancear pendientes`, guardar cambios y verificar desde otro usuario/recarga que la asignacion nueva aparece.

### Validaciones ejecutadas
- `node --check assets/js/planning.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git push origin main`: publica commit `6c8374f`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.85`.
- Verificacion HTTP de GitHub Pages para `assets/js/planning.js`: contiene `Solo muestra piloto` y balance sobre escuelas filtradas.
- Verificacion HTTP de GitHub Pages para `assets/js/api.js`: `asignarEscuela` usa `skipQueue: true`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.85`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.85`.

---

## Alertas internas para solicitudes de relevamiento - 2026-05-21 - v2.6.84

### Objetivo
- Cubrir el caso en que el correo operativo no llega o queda demorado.
- Avisar en el celular/dispositivo donde un administrador tiene la sesion iniciada cuando entra una solicitud nueva.
- Mantener visible el conteo de solicitudes pendientes sin depender de abrir manualmente `Encuestadores`.

### Cambios implementados
- La app inicia un monitor para administradores autorizados, consultando solicitudes pendientes cada 60 segundos.
- El encabezado admin incorpora boton `Alertas`, que pide permiso de notificaciones del navegador cuando el dispositivo lo permite.
- Ante una solicitud nueva, se muestra un aviso interno persistente dentro de la app.
- Si las notificaciones del navegador estan permitidas, se dispara una notificacion del sistema/PWA con la escuela y solicitante.
- El badge del boton `Alertas` muestra el total de solicitudes pendientes.
- Al tocar una notificacion, la app vuelve al modulo `Encuestadores` cuando hay una ventana PWA abierta o abre la app con ese destino.
- Al aprobar una solicitud, el monitor actualiza el conteo sin esperar al siguiente ciclo.
- Version visible y cache del Service Worker actualizados a `v2.6.84`.

### Limitacion conocida
- Esto cubre notificaciones mientras la PWA esta abierta, instalada o con Service Worker activo reciente. Para push garantizado con la app cerrada totalmente haria falta implementar Web Push con VAPID y un servicio de envio dedicado.

### Pendiente operativo
- Pedir al administrador abrir la app actualizada, iniciar sesion y tocar `Alertas` para permitir notificaciones del navegador.
- Probar con un usuario real: crear solicitud y confirmar toast interno, badge `Alertas` y notificacion del sistema si el permiso fue concedido.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/admin.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.

---

## Apunte a Web App MailApp autorizado - 2026-05-21 - v2.6.83

### Objetivo
- Apuntar la PWA al nuevo Web App publicado luego de agregar el scope explicito de `MailApp`.
- Confirmar que el deployment nuevo conserva endpoints publicos, padron oficial completo y proteccion por token.
- Forzar cache nuevo para que usuarios tomen el backend correcto.

### Resultado
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbzrXilB80CszA0EDVj-SO7rJ9SmDY1Yg_Ym1qFgKmSdgfftK0uo1uRclsEq4uroSnfSJQ/exec`.
- El Web App responde `login` sin credenciales con validacion publica, sin HTTP 403.
- `registrarUsuario` y `recuperarPassword` siguen como endpoints publicos y responden validaciones de campos requeridos.
- `diagnosticoPadron` responde `source: official_sheet`, `total: 5462`, `muestra_piloto: 86`, `filas_operativas: 92`.
- `getEscuelas` sin token responde `Token invalido o expirado`, confirmando proteccion de endpoints privados.
- Version visible y cache del Service Worker actualizados a `v2.6.83`.

### Pendiente operativo
- Ejecutar `probarNotificacionAdmin()` desde Apps Script o hacer una solicitud real de relevamiento para confirmar que el permiso de `MailApp` quedo aceptado y llega el correo.
- Pedir a administradores y usuarios `Actualizar app` para tomar `cialpa-app-v2.6.83` e iniciar sesion contra el backend nuevo.

### Validaciones ejecutadas
- Prueba HTTP del Web App nuevo para `login` sin datos: responde `Usuario y contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`, `filas_operativas: 92`.
- Prueba HTTP del Web App nuevo para `registrarUsuario` sin datos: responde `Usuario, nombres, apellidos y contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `recuperarPassword` sin datos: responde `Usuario y nueva contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `getEscuelas` sin token: responde `Token invalido o expirado`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git push origin main`: publica commit `a46eed5`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.83` y URL GAS nueva.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.83`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.83`.

---

## Autorizacion explicita de MailApp para correo operativo - 2026-05-21 - v2.6.82

### Objetivo
- Corregir el aviso visto por usuarios como `dahiana.ramo` al solicitar relevar una escuela: solicitud registrada, pero correo no enviado por falta de permiso `script.send_mail`.
- Evitar que el usuario final vea el error crudo de Google/Apps Script sobre `MailApp.getRemainingDailyQuota`.
- Dejar el Web App listo para que la cuenta propietaria autorice el envio de correos operativos.

### Cambios implementados
- `gas/appsscript.json` declara explicitamente los scopes requeridos: Sheets, Drive, UrlFetch, MailApp y UI de contenedor.
- `_sendAdminNotificationEmail_` deja de llamar `MailApp.getRemainingDailyQuota()` antes de enviar, porque no aporta al flujo operativo y disparaba el error visible.
- El mensaje visible de solicitud queda operativo: la solicitud fue registrada y el correo queda pendiente si falta autorizar MailApp.
- El error tecnico se conserva en la incidencia para revision administrativa, sin bloquear la aprobacion desde `Encuestadores > Solicitudes`.
- Version visible y cache del Service Worker actualizados a `v2.6.82`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada.
- Al publicar, aceptar el nuevo permiso de envio de correo o ejecutar `probarNotificacionAdmin()` desde Apps Script para forzar la autorizacion.
- Probar con `dahiana.ramo`: solicitar escuela sin asignacion y confirmar que el correo llega o queda estado visible en `Encuestadores`.
- Pedir a administradores y usuarios `Actualizar app` para tomar `cialpa-app-v2.6.82`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...gas/appsscript.json...); JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git push origin main`: publica commit `53ff12a`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.82`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.82`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene mensaje operativo `falta autorizar MailApp`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.82`.

---

## Correccion de solicitudes, correo operativo y filtros del mapa - 2026-05-21 - v2.6.81

### Objetivo
- Corregir el error `Escuela no encontrada` al aprobar solicitudes de relevamiento.
- Hacer visible cuando el correo operativo al administrador no se envia correctamente.
- Reducir la molestia de filtros largos de departamento y distrito en el mapa.

### Cambios implementados
- La aprobacion de solicitudes ahora resuelve la escuela por `id_escuela`, `codigo_local` y digitos normalizados.
- Si la escuela viene del padron oficial y todavia no existe en `escuelas_seleccionadas`, la fila operativa se crea desde el padron disponible antes de asignarla.
- Las incidencias de solicitud guardan nombre de escuela, territorio y estado del correo operativo.
- Si `MailApp` falla o no esta autorizado, la app avisa que la solicitud quedo registrada pero el correo no pudo enviarse.
- `Encuestadores` muestra el estado del correo de cada solicitud: enviado, error o pendiente.
- Se agrega `probarNotificacionAdmin()` para probar desde Apps Script si `MailApp` puede enviar a `censoescuelaspy@gmail.com`.
- Los filtros de `Mapa > Territorio` para departamento y distrito pasan de botones largos a listas desplegables.
- Version visible y cache del Service Worker actualizados a `v2.6.81`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada para autorizar y activar `MailApp`.
- Publicar el frontend en GitHub Pages.
- Pedir a administradores y usuarios `Actualizar app` para tomar `cialpa-app-v2.6.81`.
- Probar con una solicitud real: solicitar escuela sin asignacion, verificar estado de correo, aprobar y confirmar asignacion en `escuelas_seleccionadas`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/admin.js`.
- `node --check assets/js/auth.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git commit` local preparado: `fix: corregir solicitudes y filtros mapa v2.6.81`.
- `git push origin main`: publica commit `c546946`.

---

## Apunte a nuevo Web App propietario - 2026-05-21 - v2.6.80

### Objetivo
- Apuntar la PWA al nuevo Web App publicado por el propietario.
- Confirmar que el nuevo deployment mantiene activos los endpoints publicos de cuenta y el padron oficial.
- Forzar cache nuevo para que administradores y usuarios tomen la URL backend correcta.

### Resultado
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbxgphQDS0tQ9Kdi5Z0V7wfLZIW1oPA8ukxS1FAw4ysdMUS8wJGOVuIqdxo_c0jaG7MALQ/exec`.
- El Web App nuevo responde `login` sin credenciales con validacion publica, sin HTTP 403.
- `registrarUsuario` ya no exige token: sin datos responde validacion de campos requeridos.
- `recuperarPassword` ya no exige token: sin datos responde validacion de usuario/nueva contrasena.
- `diagnosticoPadron` responde `source: official_sheet`, `total: 5462`, `con_coordenadas: 5004`, `muestra_piloto: 86`, `filas_operativas: 91`.
- Version visible y cache del Service Worker actualizados a `v2.6.80`.

### Pendiente operativo
- Publicar el commit local en GitHub Pages; el push a `origin/main` requiere aprobacion explicita por la politica de seguridad del entorno.
- Pedir a administradores y usuarios `Actualizar app` para tomar `cialpa-app-v2.6.80`.
- Probar con usuario nuevo real: registrarse, verificar correo de alta, solicitar relevar una escuela sin asignacion, aprobar desde `Encuestadores` y confirmar que la escuela queda asignada.

### Validaciones ejecutadas
- Prueba HTTP del Web App nuevo para `login` sin datos: responde `Usuario y contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`.
- Prueba HTTP del Web App nuevo para `registrarUsuario` sin datos: responde `Usuario, nombres, apellidos y contraseña son requeridos`.
- Prueba HTTP del Web App nuevo para `recuperarPassword` sin datos: responde `Usuario y nueva contraseña son requeridos`.
- `node --check assets/js/config.js`.
- `node --check assets/js/api.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.

---

## Consola admin de encuestadores, solicitudes y correos - 2026-05-21 - v2.6.79

### Objetivo
- Dar al administrador una entrada visible para administrar la nomina de encuestadores.
- Mostrar en la misma zona las solicitudes pendientes de usuarios que piden relevar una escuela sin asignacion.
- Enviar correo a `censoescuelaspy@gmail.com` cuando alguien se registra y cuando solicita relevar una escuela.

### Cambios implementados
- El menu principal vuelve a mostrar `Encuestadores` como vista directa para administradores.
- El menu principal incorpora `Solicitudes`, basado en incidencias, para ver pedidos y casos pendientes.
- La nomina de encuestadores ahora muestra `fecha_alta`, facilitando detectar usuarios nuevos.
- `Encuestadores` y `Configuracion > Encuestadores` muestran una bandeja `Solicitudes de relevamiento pendientes`.
- Cada solicitud pendiente permite `Aprobar`, que asigna la escuela al usuario solicitante y marca la solicitud como resuelta.
- Se mantiene `Asignar manual` para abrir la distribucion de escuelas cuando el admin quiere revisar antes de aprobar.
- Apps Script agrega `aprobarSolicitudRelevamiento`.
- `registrarUsuario` envia notificacion operativa de alta publica al administrador.
- `solicitarRelevamiento` envia notificacion operativa al administrador con escuela, solicitante y territorio.
- Se corrige el correo operativo de `censoescuelaspy@gmial.com` a `censoescuelaspy@gmail.com` y se agrega `ADMIN_NOTIFICATION_EMAIL`.
- Version visible y cache del Service Worker actualizados a `v2.6.79`.

### Pendiente operativo
- Publicar el Web App desde la cuenta propietaria/aceptada para autorizar el nuevo uso de `MailApp`.
- Publicar el commit local en GitHub Pages; el push a `origin/main` quedo bloqueado por politica de seguridad del entorno y requiere aprobacion explicita del usuario.
- En la hoja `configuracion`, verificar o cargar `ADMIN_NOTIFICATION_EMAIL = censoescuelaspy@gmail.com`.
- Pedir a administradores `Actualizar app` para tomar `cialpa-app-v2.6.79`.
- Probar con un usuario nuevo: registrarse, verificar correo de alta, solicitar relevar una escuela sin asignacion, aprobar desde `Encuestadores` y confirmar que la escuela queda asignada.

### Validaciones ejecutadas
- `node --check assets/js/admin.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- Revision estatica: `Encuestadores` en menu, bandeja `Solicitudes de relevamiento pendientes`, endpoint `aprobarSolicitudRelevamiento`, correo `censoescuelaspy@gmail.com` y cache `cialpa-app-v2.6.79`.

---

## Alta publica activada en Web App propietario - 2026-05-21 - v2.6.78

### Objetivo
- Confirmar que el deployment propietario actualizado en la misma URL publica ya toma los endpoints publicos de cuenta.
- Cerrar el pendiente operativo que hacia aparecer `Token invalido o expirado` al crear usuario o recuperar clave.

### Resultado
- El Web App `AKfycbytu9TcFhKl1PoRO8G0OPAti19ey5KfMG83IFMCInwPOgw5jYElSTcIr-gXMPiSQFM89w` quedo actualizado en `@19`.
- `registrarUsuario` ya no exige token: sin datos responde validacion de campos requeridos.
- `recuperarPassword` ya no exige token: sin datos responde validacion de usuario/nueva contrasena.
- `diagnosticoPadron` sigue respondiendo `source: official_sheet`, `total: 5462`, `con_coordenadas: 5004`, `muestra_piloto: 86`.

### Pendiente operativo
- Pedir a usuarios y administradores `Actualizar app` para tomar `cialpa-app-v2.6.78`.
- Probar con un usuario nuevo real: crear cuenta, iniciar sesion, verificar que aparece en `Configuracion > Encuestadores` y asignarle escuelas.

### Validaciones ejecutadas
- Prueba HTTP del Web App publicado para `registrarUsuario` sin datos: responde `Usuario, nombres, apellidos y contrasena son requeridos`, sin token.
- Prueba HTTP del Web App publicado para `recuperarPassword` sin datos: responde `Usuario y nueva contrasena son requeridos`, sin token.
- `clasp.cmd deployments`: URL publica actualizada a `@19`.
- Prueba HTTP `diagnosticoPadron`: `official_sheet`, `total: 5462`, `muestra_piloto: 86`.

---

## Diagnostico claro de alta publica pendiente en backend - 2026-05-21 - v2.6.78

### Objetivo
- Evitar que `Crear usuario` y `Recuperar clave` muestren el error confuso `Token invalido o expirado` cuando el Web App publicado todavia no tiene activos los endpoints publicos.
- Dejar claro al administrador que falta publicar Apps Script desde la cuenta propietaria para habilitar el alta publica real.

### Diagnostico
- La app publicada ya llama `registrarUsuario` sin token.
- El Web App publicado `AKfycbytu9TcFhKl1PoRO8G0OPAti19ey5KfMG83IFMCInwPOgw5jYElSTcIr-gXMPiSQFM89w` sigue en deployment `@18`, anterior al alta publica.
- Prueba HTTP sin escritura `registrarUsuario` sin datos obligatorios responde `Token invalido o expirado`, confirmando que el backend publicado aun trata esa accion como privada.

### Cambios implementados
- `API.call` detecta errores de token en endpoints publicos de cuenta (`registrarUsuario` y `recuperarPassword`) sin cerrar sesion ni mostrarlo como problema de contrasena.
- El mensaje visible indica que el registro publico o recuperacion todavia no esta activo en el servidor publicado.
- El mensaje operativo sugiere publicar el Web App de Apps Script desde la cuenta propietaria y, mientras tanto, crear/editar la cuenta desde `Configuracion > Encuestadores`.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.78`.

### Pendiente operativo
- Publicar el Web App de Apps Script desde la cuenta propietaria/aceptada para que el deployment publico tome `registrarUsuario` y `recuperarPassword` como acciones sin token.
- Repetir la prueba HTTP: `registrarUsuario` sin datos debe responder validacion de campos requeridos, no `Token invalido o expirado`.
- Pedir a usuarios y administradores `Actualizar app` para tomar `cialpa-app-v2.6.78`.

### Validaciones ejecutadas
- Prueba HTTP del Web App publicado para `registrarUsuario` sin datos: responde `Token invalido o expirado`, confirmando deployment GAS pendiente.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Revision estatica: `PUBLIC_ACCOUNT_ENDPOINTS`, `backendNeedsPublish` y cache `cialpa-app-v2.6.78`.
- `git diff --check`.
- `git push origin main`: publica commit `8892067`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.78`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.78`.
- Verificacion HTTP de GitHub Pages para `assets/js/api.js`: contiene `backendNeedsPublish` y mensaje de registro publico.

---

## Scroll tactil de filtros del mapa - 2026-05-21 - v2.6.77

### Objetivo
- Corregir que, en moviles/tablets, las listas de botones de filtros del mapa quedaran fijas y taparan el acceso a otros grupos de opciones.
- Mantener botones responsivos en varias lineas sin bloquear el desplazamiento del panel.

### Cambios implementados
- `Mapa` limita la altura de la franja de filtros en pantallas angostas y le da scroll vertical propio.
- Las listas largas de botones dinamicos, como departamento, distrito y encuestador, tienen altura maxima y desplazamiento tactil independiente.
- Los grupos abiertos de filtros tambien pueden desplazarse cuando el contenido supera el alto disponible.
- La lista de escuelas conserva alto util debajo de los filtros gracias a `min-height: 0`.
- Version visible y cache del Service Worker actualizados a `v2.6.77`.

### Pendiente operativo
- Pedir a usuarios y administradores `Actualizar app` para tomar `cialpa-app-v2.6.77`.
- Probar en tablet/celular: abrir `Mapa`, desplegar filtros largos y confirmar que se puede bajar hasta `Operacion` y los botones finales.

### Validaciones ejecutadas
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Revision estatica: `map-sidebar__filters`, `data-choice-list`, `map-filter-group__body` y cache `cialpa-app-v2.6.77`.
- `git diff --check`.
- `git push origin main`: publica commit `ef9f46c`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.77`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.77`.
- Verificacion HTTP de GitHub Pages para `assets/css/app.css`: contiene scroll de filtros `data-choice-list`.

---

## Mapa liviano, botones responsivos y solicitud de relevamiento - 2026-05-21 - v2.6.76

### Objetivo
- Reducir la espera percibida al cargar listas grandes de escuelas en mapa y planificacion.
- Hacer que las filas de botones bajen a nuevas lineas en moviles/tablets en vez de formar tiras horizontales largas.
- Evitar ficha duplicada al seleccionar un punto del mapa.
- Permitir que cualquier usuario solicite al administrador relevar una escuela no finalizada y sin asignacion.

### Cambios implementados
- `API.getEscuelas` puede usar cache local reciente y forzar red solo cuando se necesita refrescar.
- La carga de `getEscuelas` en red usa un intento unico mas largo, evitando sumar casi dos minutos por reintentos consecutivos.
- `Mapa` carga primero desde cache local si existe y refresca el padron en segundo plano.
- La lista lateral del mapa y la tabla de asignaciones renderizan un lote inicial, evitando crear miles de filas de una sola vez.
- `Planificacion > Distribucion de escuelas` reutiliza la lista ya cargada por el mapa cuando esta disponible.
- Las tiras de filtros/botones envuelven en varias lineas en tablet y movil.
- El popup del marcador queda compacto y se elimina la ficha lateral duplicada cuando hay mapa grafico.
- Se agrega la accion `Solicitar relevar` para escuelas pendientes/sin asignacion.
- Apps Script agrega `solicitarRelevamiento`, que registra una solicitud en `incidencias` sin cambiar el estado operativo de la escuela.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.76`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada para activar `solicitarRelevamiento`.
- Pedir a usuarios y administradores `Actualizar app` para tomar `cialpa-app-v2.6.76`.
- Probar con usuario no admin: abrir una escuela sin asignacion, tocar `Solicitar relevar` y verificar que el admin vea la solicitud en `incidencias`.

### Validaciones ejecutadas
- `node --check assets/js/planning.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git push origin main`: publica commit `0c5acdc`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.76`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.76`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene `Solicitar relevar` y `MAP_LIST_LIMIT`.
- Verificacion HTTP de GitHub Pages para `assets/js/planning.js`: contiene `showMoreAssignments` y `preferCache`.
- Verificacion HTTP de GitHub Pages para `assets/js/api.js`: contiene `solicitarRelevamiento` y `preferCache`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `v2.6.76` y `forceNetwork`.

---

## Guardado visible de asignaciones de escuelas - 2026-05-21 - v2.6.75

### Objetivo
- Hacer evidente para administradores donde se guardan los cambios de asignacion de escuelas a encuestadores.
- Evitar que una distribucion quede solo como borrador visual por no encontrar la accion de guardado.

### Cambios implementados
- `Planificacion > Distribucion de escuelas` muestra una franja superior de estado con los cambios pendientes.
- El boton principal ahora dice `Guardar cambios (N)` cuando hay asignaciones modificadas y queda deshabilitado cuando no hay nada pendiente.
- La cabecera de `Planificacion operativa` agrega el boton visible `Guardar asignaciones` para administradores.
- La vista `Configuracion > Encuestadores` agrega acceso directo `Asignar escuelas`, que abre la distribucion operativa.
- Mientras se guarda, la pantalla muestra `Guardando...` y bloquea un segundo envio concurrente.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.75`.

### Pendiente operativo
- Pedir a los administradores `Actualizar app` para tomar `cialpa-app-v2.6.75`.
- Probar con admin: ir a `Configuracion > Encuestadores`, abrir `Asignar escuelas`, cambiar una escuela, confirmar que aparece `Guardar cambios (1)` y verificar que queda persistida en `escuelas_seleccionadas`.

### Validaciones ejecutadas
- `node --check assets/js/planning.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Revision estatica: `Guardar asignaciones`, `Guardar cambios`, `planning-save-banner` y cache `cialpa-app-v2.6.75`.
- `git diff --check`.
- `git push origin main`: publica commit `0e7fcda`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.75`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.75`.
- Verificacion HTTP de GitHub Pages para `assets/js/planning.js`: contiene `Guardar cambios`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `Guardar asignaciones`.

---

## Cierre final no bloqueado por PDF/correo - 2026-05-21 - v2.6.74

### Objetivo
- Corregir que `Finalizar escuela` dejara la escuela como `en_curso` o `en proceso`.
- Asegurar que el estado operativo pase a `finalizada` aunque falle la generacion de PDF, Drive o envio por correo.
- Forzar el guardado final del borrador MEC sin que lo salte el antirrebote del autoguardado.

### Cambios implementados
- `syncDraftToSheets('cierre_final')` ahora se ejecuta con `force`, ignorando la ventana minima de autoguardado.
- `guardarCierreCompleto` registra primero la entrega en `entregas_cierre` y marca `escuelas_seleccionadas.estado_relevamiento = finalizada` antes de preparar PDF, metadatos o correo.
- Si Drive/PDF/correo falla, el cierre queda guardado con `email_status: error` y `email_error`, sin revertir el estado finalizado.
- El cierre vuelve a actualizar enlaces PDF/metadatos si se generan correctamente despues del cambio de estado.
- El modo demo tambien marca la escuela como `finalizada` al ejecutar `guardarCierreCompleto`.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.74`.

### Pendiente operativo
- Publicar el Web App desde la cuenta propietaria/aceptada para que `guardarCierreCompleto` tome la correccion de estado.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.74`.
- Ejecutar `repararEstadosFinalizadosDesdeCierres()` una vez si ya hay cierres en `entregas_cierre` que siguen apareciendo como `en_curso`.
- Probar con una escuela real: tocar `Finalizar escuela`, confirmar cierre y verificar `entregas_cierre`, `escuelas_seleccionadas.estado_relevamiento` y `sesiones_relevamiento.estado`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/auth.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- Revision estatica: `cierre_final` con `force`, estado `finalizada` antes de PDF/correo y cache `cialpa-app-v2.6.74`.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git push origin main`: publica commit `b34b13b`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.74`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.74`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `cierre_final`.
- Verificacion HTTP de GitHub Pages para `index.html`: contiene `recover-form`.

---

## Registro publico de usuarios y recuperacion de contrasena - 2026-05-21 - v2.6.73

### Objetivo
- Permitir que cualquier persona cree usuario y contrasena desde la pantalla de acceso.
- Permitir recuperar contrasena validando usuario mas correo o documento registrado.
- Hacer que las cuentas nuevas aparezcan en `Encuestadores`, sin escuelas asignadas hasta que un admin las distribuya.

### Cambios implementados
- El login incorpora pestanas `Ingresar`, `Crear usuario` y `Recuperar clave`.
- El alta publica crea filas espejo en `usuarios` y `encuestadores`, con rol `encuestador`, activo y sin `zona_asignada`.
- La recuperacion de contrasena exige usuario y correo o documento coincidente antes de actualizar el hash y limpiar tokens activos.
- `saveEncuestador` mantiene sincronizados documento, telefono y correo en la cuenta espejo de `usuarios`.
- Se agregan los endpoints publicos GAS `registrarUsuario` y `recuperarPassword`, protegidos por validaciones y lock de escritura.
- El modo demo tambien permite probar alta y recuperacion sin backend.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.73`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada para activar los nuevos endpoints publicos.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.73`.
- Probar con un usuario nuevo: crear cuenta, confirmar que entra en `Inicio`, verificar que aparece en `Encuestadores`, asignarle escuelas desde admin y validar recuperacion de contrasena.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/auth.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- Revision estatica: `registrarUsuario`, `recuperarPassword`, formularios `register-form`/`recover-form` y cache `cialpa-app-v2.6.73`.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.

---

## Inicio limpio sin escuela preseleccionada - 2026-05-21 - v2.6.72

### Objetivo
- Al ingresar, llevar siempre al usuario a `Inicio` y no abrir el plano o `Registro guiado` automaticamente.
- Evitar que una escuela anterior quede seleccionada por defecto desde el borrador local del navegador.
- Conservar los borradores por escuela para recuperarlos solo cuando el usuario seleccione explicitamente una escuela.

### Cambios implementados
- El modulo inicial de la app vuelve a ser `Inicio`.
- El menu lateral muestra `Inicio` como primer acceso, antes de `Mapa` y `Registro guiado`.
- Al abrir o restaurar la app, se limpia la seleccion activa de `SurveyModule` y `MapModule`.
- El motor MEC agrega `clearActiveSchoolContext()`, que borra solo el borrador activo global `cialpa_mec_form_draft_v1` y deja intactos los borradores por escuela.
- `SurveyModule.clearSelection()` tambien puede limpiar el contexto activo del MEC sin forzar renderizados innecesarios.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.72`.

### Pendiente operativo
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.72`.
- Probar con un usuario que ya tenia una escuela abierta: iniciar sesion, confirmar que entra en `Inicio` sin escuela activa, ir al mapa y seleccionar manualmente una escuela asignada.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- Revision estatica: `START_MODULE = 'inicio'`, `clearActiveSchoolContext`, `MapModule.clearSelection` y cache `cialpa-app-v2.6.72`.
- `git push origin main`: publica commit `96aa015`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.72`.
- Verificacion HTTP de GitHub Pages para `assets/js/app.js`: `START_MODULE = 'inicio'` y limpieza de seleccion al inicio.
- Verificacion HTTP de GitHub Pages para `assets/js/mec-form.js`: contiene `clearActiveSchoolContext`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.72`.

---

## Mapa completo con seleccion por asignacion y configuracion de usuarios - 2026-05-20 - v2.6.71

### Objetivo
- Permitir que todos los usuarios vean el padron completo en el mapa, incluyendo escuelas sorteadas para la muestra.
- Bloquear la seleccion, inicio, migracion, guardado y cierre de escuelas no asignadas al usuario.
- Dejar la gestion de encuestadores dentro de una vista clara de configuracion para administradores.

### Cambios implementados
- `getEscuelas` ya no reduce el padron por usuario encuestador; el mapa conserva visibilidad completa.
- Se agrega `Auth.canOperateSchool()`, que permite operar una escuela solo al admin autorizado o al usuario que coincide con `encuestador_asignado`.
- Los popups y la ficha lateral del mapa muestran botones `Iniciar/continuar registro` y `Migrar datos al RUE-MEC` solo para escuelas operables.
- Las escuelas ajenas quedan como `Solo lectura`, indicando el encuestador asignado.
- `MapModule.startGuidedRegister()` y `SurveyModule.setCurrentEscuela()` bloquean seleccion manual de escuelas no asignadas.
- Apps Script refuerza la misma regla en `updateEscuelaEstado`, `iniciarSesion`, `guardarBorradorMec` y `guardarCierreCompleto`.
- El menu lateral de admin abre `Configuracion`, con la pestaña `Encuestadores` como entrada principal para agregar, editar, quitar o reactivar usuarios.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.71`.

### Pendiente operativo
- Publicar el Web App desde la cuenta propietaria/aceptada para que el deployment publico tome el backend con bloqueo por asignacion.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.71`.
- Probar con un encuestador real: ver todo el mapa, intentar una escuela ajena y confirmar que solo aparece lectura; luego iniciar una escuela asignada.

### Validaciones ejecutadas
- `node --check assets/js/auth.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/admin.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `git push origin main`: publica commit `e9827fa`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.71`.
- Verificacion HTTP de GitHub Pages para `assets/js/map.js`: contiene `canOperateSchool` y aviso `Solo lectura`.
- Verificacion HTTP de GitHub Pages para `assets/js/auth.js`: contiene `canOperateSchool`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.71`.

---

## Boton visible para finalizar escuela y cierre con pendientes - 2026-05-20 - v2.6.70

### Objetivo
- Hacer explicita la accion para dar por finalizada una escuela desde el flujo principal de campo.
- Evitar que una escuela quede indefinidamente `en_curso` porque el cierre completo solo aparecia si no habia pendientes.
- Cerrar tambien la sesion operativa abierta cuando el cierre final se dispara desde `Registro guiado`.

### Cambios implementados
- `Registro guiado` muestra un boton permanente `Finalizar escuela` en el encabezado de `Plano vivo`.
- La etapa `Revision y salida` incorpora la accion principal `Finalizar escuela`.
- Si no hay pendientes, el boton final ahora dice `Finalizar escuela y abrir PDF`.
- Si hay pendientes, aparece `Finalizar con pendientes`, con confirmacion explicita y registro del paquete en `entregas_cierre`.
- Al finalizar desde `Registro guiado`, la app intenta cerrar la sesion activa en `sesiones_relevamiento` como `finalizada`, registrando duracion y observacion.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.70`.

### Pendiente operativo
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.70`.
- Probar en una escuela real: iniciar/continuar registro, tocar `Finalizar escuela`, confirmar cierre y verificar `entregas_cierre`, `sesiones_relevamiento` y `escuelas_seleccionadas`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git push origin main`: publica commit `7ab881b`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.70`.
- Verificacion HTTP de GitHub Pages para `assets/js/guided-register.js`: contiene `Finalizar escuela`, `Finalizar con pendientes` y cierre de sesion guiado.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.70`.

---

## Apunte a nuevo Web App propietario validado - 2026-05-20 - v2.6.69

### Objetivo
- Apuntar la PWA al nuevo deployment publico publicado desde la cuenta propietaria/aceptada.
- Confirmar que el backend publicado ya incluye `diagnosticoPadron` y lee el padron oficial completo.
- Forzar cache nuevo para que los navegadores de campo dejen de usar el Web App anterior con HTTP 403.

### Cambios implementados
- `APP_CONFIG.GAS_URL` apunta a `https://script.google.com/macros/s/AKfycbytu9TcFhKl1PoRO8G0OPAti19ey5KfMG83IFMCInwPOgw5jYElSTcIr-gXMPiSQFM89w/exec`.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.69`.

### Pendiente operativo
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.69` y renovar sesion contra el nuevo backend.
- Ejecutar `repararSesionesDuplicadasEnCurso()` una vez desde Apps Script para limpiar duplicados actuales.

### Validaciones ejecutadas
- Web App nuevo `login`: responde JSON publico `Usuario y contraseña son requeridos`, sin HTTP 403.
- Web App nuevo `diagnosticoPadron`: `source: official_sheet`, `total: 5462`, `con_coordenadas: 5004`, `muestra_piloto: 86`, `filas_operativas: 91`.
- Web App nuevo `getEscuelas` sin token: responde `Token invalido o expirado`, confirmando backend publico protegido por sesion.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.
- `git push origin main`: publica commit `6ca319b`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.69` y URL GAS nueva.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.69`.

---

## Bloqueo de sesiones duplicadas por escuela y usuario - 2026-05-20 - v2.6.68

### Objetivo
- Evitar que un usuario quede con dos sesiones `en_curso` para la misma escuela.
- Corregir la visualizacion de fecha/hora de `Mi Jornada`, donde las horas de Sheets podian verse como `1899-12-30T...`.
- Dejar una reparacion manual para duplicados ya existentes en `sesiones_relevamiento`.

### Cambios implementados
- `iniciarSesion` ahora reutiliza una sesion abierta existente del mismo usuario y escuela, en lugar de crear otra fila.
- La deteccion de sesiones abiertas normaliza estados como `En Curso`, `en curso` o `en_curso`.
- La comparacion de escuela tolera `id_escuela`, `codigo_local` y sus digitos normalizados.
- El frontend bloquea doble toque/reintento mientras se esta iniciando una sesion.
- `getMisSesiones` y `getSesionesAbiertas` devuelven fecha y hora normalizadas como texto `yyyy-MM-dd` y `HH:mm:ss`, evitando la fecha base de Sheets.
- Se agrega la funcion GAS `repararSesionesDuplicadasEnCurso()` para cerrar duplicados del mismo usuario/escuela como `suspendida`.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.68`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el Web App desde la cuenta propietaria/aceptada por Google.
- Ejecutar `repararSesionesDuplicadasEnCurso()` una vez desde Apps Script para limpiar duplicados actuales.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.68`.

### Validaciones ejecutadas
- `node --check assets/js/survey.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.

---

## Correccion de demo fijo y diagnostico de padron publicado - 2026-05-20 - v2.6.67

### Objetivo
- Evitar que la escuela ficticia quede siempre seleccionada/anclada en el mapa real.
- Confirmar desde el Web App publicado si el backend lee el padron completo o cae a la hoja operativa corta.
- Publicar una nueva version del frontend y GAS para activar la lectura del padron oficial completo.

### Cambios implementados
- `API.getEscuelas()` ya no agrega la escuela demo al listado real salvo que se solicite explicitamente.
- `MapModule.loadMarkers()` deja de auto-seleccionar y centrar `ESC_DEMO_CIALPA`.
- Se agrega el endpoint publico `diagnosticoPadron`, que devuelve solo conteos y fuente del padron sin exponer datos nominales.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.67`.

### Pendiente operativo
- Publicar el Web App desde la cuenta propietaria/aceptada por Google, porque el deployment actualizado desde la sesion local responde HTTP 403.
- Verificar despues del deployment propietario que `diagnosticoPadron` informe `total: 5462` y `source: official_sheet` o `embedded_csv`.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.67`.

### Validaciones ejecutadas
- `node --check assets/js/api.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `clasp.cmd deploy -i AKfycbwwFYlYkar_mnYy4hW7ne_qt85xHQnUk2VeALniVDPtu5MUP5B7pEZHEnFIlo5zxuY`: crea version `@16`, pero el Web App responde HTTP 403.
- `clasp.cmd redeploy ... --versionNumber 15`: vuelve a apuntar a `@15`, pero la URL continua respondiendo HTTP 403 desde esta cuenta.

---

## Confirmacion visible de guardado y padron oficial completo - 2026-05-20 - v2.6.66

### Objetivo
- Hacer visible la confirmacion del guardado remoto en Google Sheets.
- Corregir que el mapa siga mostrando solo la muestra piloto cuando el padron embebido publico esta vacio.
- Usar como fuente completa el Spreadsheet oficial `lista_oficial_escuelas_2025` sin publicar las filas sensibles en GitHub.

### Cambios implementados
- Los mensajes emergentes de exito ya no se limitan a 1,6 segundos y el contenedor queda por encima de modales/fichas flotantes.
- El guardado manual del borrador MEC muestra estado `Sheets` en la cabecera del registro.
- Cuando el guardado remoto confirma escritura en `mec_borradores`, se muestra toast largo y alerta modal `Guardado confirmado`.
- El estado de sincronizacion remota se conserva en el borrador local sin disparar una nueva sincronizacion en bucle.
- Apps Script intenta leer el padron oficial desde el Spreadsheet `1Auz5pIrUzAdc2uN0UkiBNwlV3stjq0bPcnCcsEraWmU`, hoja `listado_ini`, cuando no existe padron embebido.
- La hoja `muestra_piloto_def` del mismo Spreadsheet se usa solo para marcar piloto/orden, sin reducir el listado completo.
- Los datos operativos de `escuelas_seleccionadas` se superponen sobre el padron completo para conservar estados, asignaciones, tiempos, cierres y enlaces.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.66`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el deployment desde la cuenta propietaria del Web App.
- Verificar que el propietario del Apps Script tenga acceso al Spreadsheet oficial `lista_oficial_escuelas_2025`.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.66`.

### Validaciones ejecutadas
- Google Drive metadata: `listado_ini` tiene 5463 filas y 32 columnas; `muestra_piloto_def` queda como hoja separada de muestra.
- Lectura de encabezados oficiales de `listado_ini` y `muestra_piloto_def` mediante conector Google Drive.
- `clasp.cmd push -f` desde `gas/`: sube 8 archivos a Apps Script HEAD.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.

---

## Base PostgreSQL local e indexacion jerarquica escuela/institucion - 2026-05-20 - v2.6.65

### Objetivo
- Instalar/preparar las herramientas necesarias para crear la base de datos.
- Asegurar que el modelo relacional distinga escuela/local edilicio de institucion educativa.
- Indexar la jerarquia operativa: edificio, instituciones, bloques, pisos, aulas/ambientes/espacios, sanitarios, exteriores, evidencias y tiempos.

### Cambios implementados
- Se agrega `school_institutions` al esquema PostgreSQL para soportar varias instituciones dentro de una misma escuela-edificio/local.
- `mec_drafts`, `buildings`, `floors`, `rooms`, `room_objects`, `sanitary_groups`, `sanitary_objects`, `site_elements`, `evidence_files` y `time_tracking_items` guardan `school_key` y, cuando aplica, `institution_key`.
- Se agregan indices por `school_key`, `institution_key`, bloque, piso, tipo de ambiente, tipo sanitario y tipo exterior.
- La API relacional normaliza instituciones desde el payload y asigna `institution_key` a bloques, pisos, aulas, sanitarios, exteriores, evidencias y tiempos.
- El identificador de piso queda canonico por `block_id + floor_label`, evitando duplicados entre pisos declarados y pisos deducidos desde aulas/sanitarios.
- `/health` exige ahora `schools`, `school_institutions` y `mec_drafts` para informar `schema: ok`.
- Se agrega `tools/database/install_database_prereqs.ps1` y script `npm run db:install-tools` para preparar Google Cloud SDK y PostgreSQL/psql.
- Se agrega `tools/database/setup_local_postgres.ps1` y script `npm run db:local` para levantar PostgreSQL local, crear la base `cialpa` y aplicar `schema.sql`.
- `tools/database/deploy_cloudrun_cloudsql.ps1` usa `gcloud.cmd` para evitar el bloqueo de `gcloud.ps1` por politica de ejecucion de PowerShell.
- `tools/database/README.md` y `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` documentan la indexacion escuela-edificio/institucion y consultas por jerarquia.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.65`.

### Estado operativo detectado
- Google Cloud SDK queda instalado y disponible como `gcloud.cmd` version `569.0.0`.
- PostgreSQL/psql disponible en `C:\Program Files\PostgreSQL\16\bin`; se agrega al PATH de usuario.
- Base local creada en `.local/postgres_data`, escuchando en `127.0.0.1:55432`, base `cialpa`.
- `DATABASE_URL` local de prueba: `postgresql://postgres@127.0.0.1:55432/cialpa`.
- `gcloud` no tiene cuenta autenticada ni proyecto configurado; Cloud SQL no puede crearse hasta ejecutar login y definir `ProjectId`.

### Pendiente operativo
- Ejecutar `gcloud auth login` y definir el proyecto GCP con billing activo.
- Crear Cloud SQL/Cloud Run con `tools/database/deploy_cloudrun_cloudsql.ps1 -ProjectId "<ID_PROYECTO>" -Region "southamerica-east1"`.
- Configurar `DATABASE_SYNC_URL` y `DATABASE_SYNC_TOKEN` en Apps Script desde la cuenta propietaria.

### Validaciones ejecutadas
- `npm.cmd run db:install-tools`.
- `gcloud.cmd --version`: Google Cloud SDK `569.0.0`.
- `psql --version`: PostgreSQL `16.2`.
- `npm.cmd run db:local`: crea/verifica PostgreSQL local y aplica `schema.sql`.
- `npm.cmd run db:schema` contra PostgreSQL local: `schools`, `school_institutions`, `mec_drafts` y `sync_mutations` OK.
- API local `/health` con `DATABASE_URL`: responde `database: ok`, `schema: ok`.
- Prueba `POST /sync/mec-draft` local con escuela-edificio, dos instituciones, bloque, piso, aula, sanitario y exterior: normaliza `institutions=2`, `floors=1`, `rooms=1`, `sanitaries=1`.
- Verificacion SQL de indices: `idx_school_institutions_codigo`, `idx_mec_drafts_institution_saved`, `idx_rooms_school_block_floor_kind`, `idx_sanitary_groups_school_block_floor`, `idx_site_elements_school_type`.
- `node --check tools/database/cialpa_db_api.mjs`.
- `node --check tools/database/apply_schema.mjs`.
- Parseo PowerShell de `install_database_prereqs.ps1`, `setup_local_postgres.ps1` y `deploy_cloudrun_cloudsql.ps1`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `git diff --check`.

---

## Correccion de estado finalizado en Sheets - 2026-05-20 - v2.6.64

### Objetivo
- Corregir que las escuelas con cierre guardado no aparezcan como terminadas/finalizadas.
- Evitar que un autoguardado posterior del borrador MEC vuelva a marcar una escuela cerrada como `en_curso`.
- Dejar una reparacion manual para cierres ya registrados en `entregas_cierre`.

### Cambios implementados
- El borrador MEC enviado con motivo de cierre ahora sube con `estado_borrador: finalizada`.
- `guardarBorradorMec` traduce estados/motivos de cierre, finalizacion, completado o entrega a `estado_relevamiento: finalizada`.
- Si una escuela ya esta `finalizada`, los autoguardados comunes conservan ese estado en lugar de degradarlo a `en_curso`.
- `guardarCierreCompleto` repara tambien `escuelas_seleccionadas` cuando recibe un cierre duplicado ya registrado.
- Se agrega la funcion GAS `repararEstadosFinalizadosDesdeCierres()` para reconstruir estados finalizados desde la hoja `entregas_cierre`.
- Version visible, etiqueta de edicion y cache del Service Worker actualizados a `v2.6.64`.

### Pendiente operativo
- Subir GAS a HEAD y publicar el deployment desde la cuenta propietaria.
- Ejecutar `repararEstadosFinalizadosDesdeCierres()` una vez desde Apps Script para marcar como finalizadas las entregas ya existentes.
- Pedir a los usuarios `Actualizar app` para tomar `cialpa-app-v2.6.64`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.

---

## Preparacion operativa Cloud SQL/Cloud Run para PostgreSQL - 2026-05-20 - v2.6.63

### Objetivo
- Continuar el paso operativo posterior a la API relacional.
- Dejar ejecutable la creacion de PostgreSQL administrado, despliegue de API y configuracion GAS sin depender de comandos manuales dispersos.
- Resolver el faltante local de `psql`, `gcloud` y Docker con scripts reproducibles.

### Cambios implementados
- Se agrega `tools/database/apply_schema.mjs` y script `npm run db:schema` para ejecutar `tools/database/schema.sql` usando Node/pg cuando no exista `psql`.
- `tools/database/cialpa_db_api.mjs` puede aplicar `schema.sql` al iniciar con `APPLY_SCHEMA_ON_START=true`.
- `/health` ahora informa `schema: ok` o `schema: missing` cuando hay base configurada.
- Se agrega `tools/database/cloudbuild.yaml` para construir la imagen usando `tools/database/Dockerfile`.
- Se agrega `tools/database/deploy_cloudrun_cloudsql.ps1`, que prepara APIs de Google Cloud, Cloud SQL PostgreSQL, secretos, Artifact Registry, Cloud Build y Cloud Run.
- Se agrega `tools/database/gas_database_sync_setup.gs.example` para configurar `DATABASE_SYNC_ENABLED`, `DATABASE_SYNC_MODE`, `DATABASE_SYNC_URL`, `DATABASE_SYNC_TIMEOUT_MS` y guardar `DATABASE_SYNC_TOKEN` como Script Property desde la cuenta propietaria de Apps Script.
- `tools/database/README.md`, `env.example` y `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` documentan el flujo operativo Cloud Run + Cloud SQL.

### Estado operativo detectado
- En esta maquina no estan disponibles `gcloud`, `psql` ni Docker en PATH.
- `clasp.cmd show-authorized-user` confirma sesion local en `dmeza.py@gmail.com`; por historial de 403, la configuracion final/publish GAS debe ejecutarse desde la cuenta propietaria del Web App.

### Pendiente operativo
- Instalar/autenticar Google Cloud SDK o ejecutar `tools/database/deploy_cloudrun_cloudsql.ps1` desde una maquina que ya tenga `gcloud`.
- Ejecutar el helper GAS desde la cuenta propietaria cuando exista la URL final de Cloud Run.
- Hacer una escritura controlada y comparar `mec_borradores`, `db_sync_queue` y PostgreSQL.

### Validaciones ejecutadas
- Inventario local de herramientas: `gcloud`, `psql` y Docker no disponibles; `node` y `npm` disponibles.
- `clasp.cmd show-authorized-user` con permisos: sesion `dmeza.py@gmail.com`.
- `npm.cmd run db:check`.
- `node --check tools/database/apply_schema.mjs`.
- Parseo de `tools/database/deploy_cloudrun_cloudsql.ps1` con parser PowerShell.
- Validacion sintactica de `tools/database/gas_database_sync_setup.gs.example`.
- API local `/health` sin `DATABASE_URL`: responde `database: not_configured`.

---

## API relacional PostgreSQL para borradores MEC - 2026-05-20 - v2.6.63

### Objetivo
- Avanzar del puente `db_sync_queue` hacia guardado real en una base de datos relacional.
- Mantener Google Sheets como respaldo operativo mientras se prueba la escritura transaccional.
- Dejar preparada una API desplegable para Cloud Run, Supabase, Cloud SQL PostgreSQL o AlloyDB.

### Cambios implementados
- Se agrega `tools/database/schema.sql` con el esquema PostgreSQL inicial para escuelas, mutaciones, borradores, bloques, pisos, ambientes, objetos, sanitarios, exteriores, evidencias y tiempos.
- Se agrega `tools/database/cialpa_db_api.mjs`, un receptor HTTP `POST /sync/mec-draft` compatible con el payload que Apps Script ya genera desde `guardarBorradorMec`.
- La API valida token bearer opcional, registra la mutacion en `sync_mutations`, guarda el snapshot completo en `mec_drafts` y normaliza el modelo en tablas relacionales dentro de una transaccion.
- Los tiempos logisticos quedan persistidos como columnas directas en `mec_drafts` y como registros detallados en `time_tracking_items`.
- Se agrega `tools/database/Dockerfile` para despliegue del receptor Node en Cloud Run.
- Se agrega `tools/database/env.example` y documentacion operativa en `tools/database/README.md`.
- `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` incorpora la API relacional inicial y las variables de configuracion necesarias.
- `package.json` suma scripts `db:api` y `db:check`, y se agrega la dependencia `pg`.
- Version visible, etiqueta de edicion y cache del Service Worker alineados a `v2.6.63`.

### Pendiente operativo
- Crear la base PostgreSQL administrada y ejecutar `tools/database/schema.sql`.
- Desplegar la API con `DATABASE_URL` y `DATABASE_SYNC_TOKEN`.
- Configurar en Apps Script `DATABASE_SYNC_ENABLED=true`, `DATABASE_SYNC_MODE=rest` y `DATABASE_SYNC_URL=https://<servicio>/sync/mec-draft`.
- Ejecutar una escritura controlada y comparar conteos entre `mec_borradores`, `db_sync_queue` y PostgreSQL.

### Validaciones ejecutadas
- `npm.cmd run db:check`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `node -e "import('pg')"`: OK.
- API local `/health` sin `DATABASE_URL`: responde `database: not_configured`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check sw.js`.
- `git diff --check`.

---

## Tiempos logisticos visibles por escuela, aula y sanitario - 2026-05-20 - v2.6.62

### Objetivo
- Hacer visible durante la carga cuanto demora registrar la escuela completa.
- Medir y mostrar tiempos acumulados y promedio para aulas/ambientes y sanitarios.
- Dejar esos tiempos disponibles para planificacion/logistica desde Google Sheets.

### Cambios implementados
- El borrador MEC inicia un contador de escuela cuando hay escuela activa y se guarda actividad.
- `Registro guiado` muestra una franja permanente de `Tiempo logistico` con escuela, aulas/ambientes y sanitarios.
- La etapa `Revision y salida` agrega un panel de tiempos con total, cantidad de items y promedio por tipo.
- Confirmar configuracion de aula, sanitario o exterior cierra el contador del item aunque el usuario no pulse el boton tecnico `Guardar`.
- Al cerrar el relevamiento completo, se cierran los contadores activos de aula, sanitario y escuela antes de armar el paquete final.
- El JSON exportado y los metadatos de cierre incluyen `timeTracking`.
- `guardarBorradorMec` guarda tiempos en `mec_borradores` y actualiza `escuelas_seleccionadas` con `tiempo_real_min`, tiempos de aulas, sanitarios y exteriores.
- La cola `db_sync_queue` incluye `time_tracking` dentro del paquete de sincronizacion a base de datos.
- Se preparo un paquete temporal privado `C:\tmp\cialpa_gas_deploy_v262_883f86e` conservando el padron embebido completo y se subio a Apps Script HEAD con `clasp push -f`.
- Version y cache actualizados a `v2.6.62`.

### Pendiente operativo
- Publicar el deployment GAS desde la cuenta propietaria para que las nuevas columnas de tiempos se creen en produccion.
- Revisar en `Planificacion` que `tiempo_real_min` empiece a reemplazar el estimado cuando existan cargas reales.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/planning.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `clasp push -f` desde paquete temporal privado: sube 8 archivos a Apps Script HEAD preservando el padron completo.
- `git push origin main`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.62`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.62`.
- `git diff --check`.

---

## Correccion de filtro piloto y aviso de padron incompleto - 2026-05-20 - v2.6.61

### Objetivo
- Corregir que el filtro `Piloto sorteada` quedara en cero aunque existieran escuelas de muestra.
- Evitar que `Todo el padron` parezca correcto cuando el backend solo esta entregando la hoja operativa reducida.

### Cambios implementados
- El mapa ahora reconoce escuelas piloto por `en_muestra_piloto`, `muestra_piloto`, `prioridad_operativa: piloto` u `orden_muestra_piloto`.
- Los filtros del mapa comparan valores normalizados, tolerando mayusculas, acentos y diferencias menores de texto.
- La busqueda del mapa tambien normaliza acentos para encontrar nombres, distritos y localidades con mayor tolerancia.
- Apps Script normaliza una escuela como piloto si trae bandera, orden de muestra o prioridad operativa piloto.
- `getEscuelas` usa la misma regla robusta para el filtro `piloto`/`muestra_piloto`.
- Mientras el backend siga en fallback de hoja operativa corta sin marcas de piloto, esas filas se tratan como muestra piloto provisional para que `Piloto sorteada` no quede en cero.
- Si el backend no esta usando `embedded_csv` y devuelve una nomina corta, la app avisa a supervisores/admins que deben regenerar `gas/escuelas_embebidas.gs` y publicar GAS desde la cuenta propietaria para ver el padron completo.
- Se genero un paquete temporal privado de GAS con el padron embebido completo y se subio a Apps Script HEAD mediante `clasp push -f`.
- El repositorio publico conserva `gas/escuelas_embebidas.gs` como stub sin filas sensibles.
- Version y cache actualizados a `v2.6.61`.

### Pendiente operativo
- Publicar el deployment GAS desde la cuenta propietaria `censoescuelaspy@gmail.com` para que `Todo el padron` muestre las 5462 escuelas y no solo la hoja operativa.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- Prueba local del filtro: `Piloto sorteada` reconoce `Si/Sí`, `prioridad_operativa: piloto` y `orden_muestra_piloto`; `Todo el padron` restaura todos los casos cargados.
- Generacion temporal privada de `escuelas_embebidas.gs`: 5462 escuelas de padron completo y 86 escuelas piloto.
- `clasp push -f` desde paquete temporal privado: sube 8 archivos a Apps Script HEAD.
- `clasp show-authorized-user`: sesion local en `dmeza.py@gmail.com`; por historial de 403, queda pendiente publicar el deployment desde la cuenta propietaria.
- `git diff --check`.

---

## Filtros inmediatos, guardado verificable y cola de base de datos - 2026-05-20 - v2.6.60

### Objetivo
- Evitar que los filtros del mapa dependan del boton `Filtrar`.
- Hacer mas claro el resultado del boton de guardado remoto del borrador MEC.
- Avanzar la migracion hacia base de datos sin cortar el respaldo actual en Google Sheets.

### Cambios implementados
- Los filtros del mapa aplican automaticamente al tocar departamento, distrito, zona, estado, encuestador o muestra.
- La busqueda del mapa filtra mientras se escribe, con una espera breve para no recalcular en cada tecla.
- El boton `Filtrar` queda como indicador/fallback `Filtrado automatico`; `Limpiar` sigue reseteando todo.
- El guardado manual informa si el borrador llego a `mec_borradores` y muestra el estado de sincronizacion hacia base de datos.
- Si hay una sincronizacion remota en curso, el boton avisa en vez de fallar silenciosamente.
- Apps Script agrega la hoja `db_sync_queue` como cola idempotente para guardar el mismo paquete del borrador MEC.
- `guardarBorradorMec` sigue escribiendo en `mec_borradores` y, ademas, registra la mutacion en `db_sync_queue`.
- La cola de base de datos guarda un resumen en Sheets y el paquete completo como JSON en Drive, enlazado desde `payload_file_url`.
- Se agregan claves de configuracion `DATABASE_SYNC_ENABLED`, `DATABASE_SYNC_MODE`, `DATABASE_SYNC_URL`, `DATABASE_SYNC_TOKEN` y `DATABASE_SYNC_TIMEOUT_MS`.
- Si `DATABASE_SYNC_MODE=rest` y hay URL configurada, GAS intenta enviar el borrador a una API externa; si falla, conserva el error en `db_sync_queue` sin bloquear Sheets.
- `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` documenta el puente operativo y recomienda cargar el token como Script Property.
- Version y cache actualizados a `v2.6.60`.

### Pendiente operativo
- Publicar frontend en GitHub Pages.
- Subir GAS desde la cuenta propietaria para que `mec_borradores` y `db_sync_queue` queden activos en produccion.
- Ejecutar `migrarBackendV21()` o `setupSheets()` en Apps Script para crear/migrar la hoja `db_sync_queue` y semillas de configuracion.
- Definir la API transaccional PostgreSQL/Supabase/Cloud Run que recibira `DATABASE_SYNC_URL`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.

---

## Administracion de encuestadores, mapa mas visible e insercion clara - 2026-05-20 - v2.6.59

### Objetivo
- Dar a administradores una vista directa para agregar, editar, quitar y reactivar encuestadores.
- Mejorar la visibilidad de los puntos de escuelas en el mapa.
- Hacer mas evidentes las herramientas de insercion de fallas/grietas, luces, aire acondicionado, enchufes y otros elementos tecnicos.

### Cambios implementados
- La vista `Encuestadores` ahora incluye resumen operativo, buscador, filtros por estado/rol y tabla con rol, correo, estado y acciones.
- `Quitar` inactiva al encuestador sin borrar la cuenta, y los inactivos pueden reactivarse desde la misma tabla.
- El backend `getEncuestadores` permite incluir inactivos solo para administradores autorizados.
- `saveEncuestador` actualiza correctamente estado activo/inactivo, contrasena opcional y el usuario espejo de login.
- Los marcadores del mapa son mas grandes, con opacidad alta, doble borde y mejor contraste; los clusters tambien ganan color y sombra.
- La cinta `Insertar` muestra herramientas de aula/sanitario cuando existe un aula o sanitario activo, aunque no este seleccionado exactamente en ese momento.
- Las herramientas se rotulan como `Enchufe`, `Luz`, `Aire acond.` y `Falla/grieta` para que el equipo de campo las encuentre mas rapido.
- Version y cache actualizados a `v2.6.59`.

### Validaciones ejecutadas
- `node --check assets/js/admin.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.

---

## Actualizacion forzada, filtros del mapa y arquitectura de datos - 2026-05-20 - v2.6.58

### Objetivo
- Corregir casos donde el boton `Actualizar app` no lograba traer la version nueva en navegadores con Service Worker/cache persistente.
- Ordenar los filtros de la vista `Mapa` para que el usuario entienda rapidamente que esta filtrando.
- Dejar una propuesta tecnica para migrar los datos recolectados a una base de datos estructurada, segura e integra.

### Cambios implementados
- El Service Worker se registra con `sw.js?v=APP_CONFIG.VERSION` y `updateViaCache: 'none'` para reducir cacheo del propio `sw.js`.
- `Actualizar app` ahora elimina caches de app, conserva cache de teselas de mapa, intenta actualizar/desregistrar Service Workers y recarga con `v=VERSION` + timestamp.
- Los filtros del mapa se reorganizan en grupos `Buscar escuela`, `Territorio` y `Operacion`.
- El filtro de territorio separa departamento, distrito y zona con rotulos claros.
- El filtro operativo separa estado, encuestador y muestra.
- Se agrega filtro de distrito dinamico, recalculado segun departamento seleccionado.
- Se agrega filtro `Piloto sorteada`, usando `en_muestra_piloto` del padron embebido.
- La busqueda del mapa ahora contempla nombre, codigo, departamento, distrito y localidad.
- Se crea `docs/ARQUITECTURA_BASE_DATOS_CIALPA.md` con modelo recomendado de base PostgreSQL, tablas principales, sincronizacion offline, controles de seguridad, auditoria e integridad.
- Para publicar en GitHub sin exponer datos nominales/contactos, `gas/escuelas_embebidas.gs` queda como stub publico sin filas; el padron completo se regenera localmente antes de subir GAS desde la cuenta propietaria.
- Version y cache actualizados a `v2.6.58`.

### Pendiente operativo
- Publicar frontend en GitHub Pages.
- Regenerar `gas/escuelas_embebidas.gs` localmente con `npm run embed:schools` y publicar GAS desde la cuenta propietaria si se quiere activar el padron embebido completo.
- Probar en un navegador que venia mostrando version anterior usando `Actualizar app` y, si persiste, abrir con `?v=2.6.58&_=timestamp`.
- Revisar con el equipo si la base objetivo sera Cloud SQL PostgreSQL, Supabase, AlloyDB u otra opcion administrada.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.

---

## Restauracion de herramientas de insercion y padron embebido - 2026-05-20 - v2.6.57

### Objetivo
- Recuperar en la cinta `Insertar` los elementos que ya existian en el motor del plano pero habian quedado poco visibles o ausentes para el usuario de campo.
- Preparar el backend GAS para leer el padron completo de escuelas desde un CSV embebido en el proyecto, evitando la lectura completa de Sheets en `getEscuelas`.
- Incorporar la muestra piloto sorteada con marca y orden, sin perder el listado completo.
- Mantener fallback automatico a `escuelas_seleccionadas` si el CSV embebido se regenera vacio o solo con encabezado.

### Cambios implementados
- La cinta `Insertar` vuelve a mostrar para aulas: puerta, ventana, toma, tablero, foco, ventilador, aire acondicionado, falla/observacion, pizarron, escalera y texto.
- La cinta `Insertar` vuelve a mostrar para sanitarios: cabina, artefactos, puerta, ventana, toma, tablero, foco, ventilador, aire acondicionado y falla/observacion.
- El panel contextual evita duplicar acciones que ya estan disponibles en la cinta.
- Se localiza `lista_oficial_escuelas_2025.gsheet`, Spreadsheet `1Auz5pIrUzAdc2uN0UkiBNwlV3stjq0bPcnCcsEraWmU`, con hojas `listado_ini`, `muestra_piloto_def` y `ref_filtro`.
- Se exporta `listado_ini` como padron completo y `muestra_piloto_def` como muestra piloto sorteada.
- Se agrega `tools/simulation/embed_schools_csv.mjs` y script `npm run embed:schools` para regenerar `gas/escuelas_embebidas.gs` desde los CSV locales.
- La generacion local de `gas/escuelas_embebidas.gs` valida 5462 escuelas del padron completo y 86 escuelas piloto; la copia apta para repositorio publico queda sin filas sensibles y mantiene fallback a Sheets.
- El parser CSV embebido detecta separador coma/punto y coma, usa cache en memoria de ejecucion y mantiene fallback seguro.
- La muestra piloto se cruza por codigo local, marcando `en_muestra_piloto: true`, `orden_muestra_piloto` y `prioridad_operativa: piloto`.
- `getEscuelas` y `getEscuela` usan el CSV embebido cuando contiene filas; si esta vacio o solo tiene encabezado, siguen usando la hoja actual.
- `getEscuelas` acepta filtros opcionales `muestra_piloto`/`piloto` y orden `orden=piloto` para devolver la muestra sorteada en secuencia.
- Las mutaciones operativas crean una fila minima en `escuelas_seleccionadas` cuando una escuela proviene del CSV embebido y todavia no existe en la hoja.
- Se amplian alias de encabezados comunes para codigo, nombre, departamento, distrito, localidad, zona, latitud y longitud, incluyendo encabezados reales del MEC.
- Las coordenadas en grados/minutos/segundos del padron oficial se convierten a decimales negativos para Paraguay.
- Version y cache actualizados a `v2.6.57`.

### Pendiente operativo
- Subir el GAS y publicar desde la cuenta propietaria para que el backend use el padron embebido.
- Probar `getEscuelas` con el CSV completo y comparar tiempo contra lectura desde Sheets.

### Validaciones ejecutadas
- `npm.cmd run embed:schools`: genera `gas/escuelas_embebidas.gs` con 5462 escuelas y 86 piloto.
- Prueba local con `Utilities.parseCsv` simulado: `getEscuelas({})` devuelve `total: 5462`, `source: embedded_csv`.
- Prueba local con `getEscuelas({ muestra_piloto: true, orden: 'piloto' })`: devuelve 86 escuelas y la primera es codigo `1005052`, orden `1`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check tools/simulation/embed_schools_csv.mjs`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check` sin errores; solo advertencia esperada de normalizacion LF/CRLF en Windows.

---

## Simulador de cargas y prueba controlada de borradores - 2026-05-20

### Objetivo
- Preparar una herramienta segura para validar el circuito `login` -> `getEscuelas` -> `guardarBorradorMec`.
- Permitir simulaciones de carga minima sin tocar la interfaz ni depender de tablets reales.
- Evitar escrituras accidentales en produccion dejando el modo de escritura bloqueado hasta usar `--write`.
- Generar metricas repetibles de comportamiento de la app web publicada sin requerir credenciales.

### Cambios implementados
- Se agrega `tools/simulation/cialpa_api_simulator.mjs`, ejecutable con Node 22 y sin dependencias obligatorias.
- El simulador lee `APP_CONFIG.GAS_URL` y `APP_CONFIG.VERSION` desde `assets/js/config.js`.
- El modo por defecto es solo lectura: login, lectura de escuelas y listado parcial.
- El modo escritura requiere `--write` y una escuela explicita con `--school=CODIGO` o `--use-first-school`.
- Cada carga simulada usa `clientMutationId` con prefijo `SIM-MEC`, `motivo: simulacion_api_*` y `estado_borrador: simulado` para reconocerla en `mec_borradores`.
- Se agrega base opcional de Playwright en `tools/simulation/cialpa_ui_smoke.spec.mjs` para validar login y llegada a `Registro guiado`.
- Se agrega `tools/simulation/cialpa_web_metrics.mjs` para medir carga web en escritorio, tablet y movil.
- Se agrega `package.json` con scripts `simulate:api`, `simulate:ui` y `metrics:web`.
- Se instala `@playwright/test` y se genera `package-lock.json` para fijar la dependencia.
- Se instala Chromium de Playwright para poder ejecutar smoke tests de navegador.
- El reporte de metricas guarda JSON completo y resumen Markdown en `tools/simulation/metrics/`.
- `.gitignore` incorpora reportes de Playwright, `test-results`, `node_modules` y archivos `.env`.

### Validaciones ejecutadas
- `node --check tools/simulation/cialpa_api_simulator.mjs`.
- `node --check tools/simulation/cialpa_ui_smoke.spec.mjs`.
- `node --check tools/simulation/playwright.config.mjs`.
- `node --check tools/simulation/cialpa_web_metrics.mjs`.
- `node -e "JSON.parse(...package.json...)"`: OK.
- `node tools/simulation/cialpa_api_simulator.mjs --help`: OK.
- `node tools/simulation/cialpa_api_simulator.mjs --list-schools` sin credenciales: falla de forma segura con aviso de variables requeridas.
- `npm.cmd install`: OK.
- `npx.cmd playwright install chromium`: OK.
- `npm.cmd run simulate:api -- --help`: OK.
- `npm.cmd run simulate:ui`: OK, 2 pruebas saltadas correctamente por falta de `CIALPA_USER`/`CIALPA_PASSWORD`.
- `npm.cmd run metrics:web -- --help`: OK.
- `npm.cmd run metrics:web` en sandbox sin red: genera reporte de falla controlada por `net::ERR_NETWORK_ACCESS_DENIED`.
- `npm.cmd run metrics:web` con red habilitada: OK, version visible `v2.6.56`, 25 requests por vista, 0 fallidas, 0 errores de consola, cache `cialpa-app-v2.6.56`.
- Reporte generado: `tools/simulation/metrics/web-metrics-20260520T180019Z.md` y `.json`.
- `git diff --check` sin errores; solo advertencia esperada de normalizacion LF/CRLF en Windows.

### Pendiente operativo
- Ejecutar con credenciales reales en modo solo lectura para listar escuelas.
- Ejecutar una escritura controlada con `--write --school=CODIGO --count=1` y verificar la fila en `mec_borradores`.
- Ejecutar el smoke test UI con credenciales reales para validar login y llegada a `Registro guiado`.
- Repetir `npm.cmd run metrics:web -- --cache-bust` despues de cada publicacion para comparar regresiones de carga.

---

## Reparacion de guardado en libro online - 2026-05-19 - v2.6.56

### Objetivo
- Resolver que los registros cargados desde el formulario no aparecian en el libro online.
- Confirmar la diferencia entre el archivo piloto historico y el libro configurado actualmente por la app.
- Dejar preparado el backend correcto para publicar desde la cuenta propietaria del Apps Script.

### Diagnostico
- `H:\Mi unidad\encuesta_piloto\encuesta_piloto.gsheet` corresponde al Spreadsheet `1uYXF7pxg8jz6sz2uWe75GgtX7I4hJDhqoqtXb83ob44` y contiene la estructura historica `respuestas`, `schemas`, `fotos`, `escuelas_muestra`, `asigna_escuelas_usuarios` y `usuarios`.
- La app publicada esta configurada para el libro operativo `muestreo_escuelas_cialpa`, Spreadsheet `1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg`, con hoja principal `escuelas_seleccionadas`.
- El Web App publico estable usado para recuperar el mapa (`AKfycbwKls1jXCwh-Np9UMoir2VD3LtQlxxdJ0e3cetBeQDzJCnSNWAIHYnapTaPD1fgC75M`) respondia `Accion desconocida: guardarBorradorMec`, por lo que el frontend nuevo no tenia un backend capaz de escribir el borrador MEC en Sheets.
- Los deployments nuevos `@11`, `@13` y `@14` devuelven HTTP 403, por eso no se pueden usar como URL publica aunque tengan el codigo nuevo.
- El proyecto Apps Script `muestreo_escuelas_cialpa` es propiedad de `censoescuelaspy@gmail.com`; la sesion local de `clasp` esta autenticada como `dmeza.py@gmail.com`, que figura como editor.
- Como el Web App esta configurado con `executeAs: USER_DEPLOYING`, los deployments publicados o actualizados desde una cuenta editora que no queda autorizada para ejecutar pueden devolver HTTP 403 aun con `ANYONE_ANONYMOUS`.
- La reautorizacion de `clasp` desde `dmeza.py@gmail.com` fue bloqueada por Google con el mensaje `Se bloqueo esta app`, por lo que no conviene insistir con ese flujo OAuth para produccion.

### Cambios implementados
- Se actualiza version/cache de la app a `v2.6.56` para forzar refresco del Service Worker.
- Se intento actualizar el deployment publico estable `AKfycbwKls1jXCwh-Np9UMoir2VD3LtQlxxdJ0e3cetBeQDzJCnSNWAIHYnapTaPD1fgC75M` a la version `@13`; la URL paso a responder HTTP 403.
- Se hizo rollback del deployment publico estable a `@10`, pero la URL continuo devolviendo HTTP 403.
- Se creo el deployment `@14` con el backend actual; tambien devuelve HTTP 403.
- Se verifico por metadata de Drive que el propietario real del Apps Script es `censoescuelaspy@gmail.com` y que `dmeza.py@gmail.com` es editor.
- Se retiro el diagnostico temporal y los scopes explicitos agregados durante la prueba, dejando `gas/appsscript.json` nuevamente con inferencia normal de permisos.
- Se subio a Apps Script el codigo limpio actual con `clasp push -f`; queda pendiente publicar desde la cuenta propietaria.
- Se publico desde la cuenta propietaria un nuevo deployment publico: `AKfycbwwFYlYkar_mnYy4hW7ne_qt85xHQnUk2VeALniVDPtu5MUP5B7pEZHEnFIlo5zxuY`.
- Se actualizo `APP_CONFIG.GAS_URL` para apuntar al nuevo Web App publico validado.

### Validaciones ejecutadas
- `node --check assets/js/auth.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- `clasp deployments`: el deployment publico estable esta nuevamente en `@10`; los deployments `@11`, `@13` y `@14` devuelven HTTP 403.
- Prueba HTTP sin escritura contra la URL publica estable: `guardarBorradorMec` responde `Accion desconocida: guardarBorradorMec`, confirmando que el backend publicado es anterior al guardado en Sheets.
- Prueba HTTP posterior al intento de redeploy/rollback: la URL publica estable responde HTTP 403.
- Prueba HTTP contra todos los deployments listados: solo `@HEAD` responde HTTP 200 con HTML de error; los deployments versionados responden HTTP 403.
- `clasp show-authorized-user`: sesion local en `dmeza.py@gmail.com`.
- Metadata Drive del Apps Script: propietario `censoescuelaspy@gmail.com`, editor `dmeza.py@gmail.com`.
- `clasp run diagnosticoPermisos`: `Unable to run script function. Please make sure you have permission to run the script function.`
- `node -e "JSON.parse(...gas/appsscript.json...)"`: OK.
- `clasp push -f`: codigo GAS limpio subido a HEAD.
- Prueba HTTP contra nuevo deployment propietario: `login` responde JSON publico `Usuario y contraseña son requeridos`.
- Prueba HTTP contra nuevo deployment propietario: `getEscuelas` responde `status: ok` con datos de escuelas.
- Prueba HTTP sin escritura contra nuevo deployment propietario: `guardarBorradorMec` con token valido y sin escuela responde `Identificador de escuela requerido para guardar el borrador MEC`, confirmando que el endpoint nuevo esta publicado.
- `APP_CONFIG.GAS_URL` actualizado al nuevo deployment propietario.
- Commit publicado en `main`: `b7d3e4f` - `fix: apuntar backend publico v2.6.56`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.56` y URL GAS nueva.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.56`.

### Pendiente operativo
- Despues de publicado, pedir a los usuarios `Actualizar app` o abrir con cache-buster para que el Service Worker tome `cialpa-app-v2.6.56`.
- Verificar en campo que `Guardar ahora` cree o actualice una fila en `mec_borradores`.

---

## Renovacion de sesion al cambiar backend - 2026-05-19 - v2.6.55

### Objetivo
- Evitar que el mapa quede vacio cuando el navegador conserva un token viejo despues de cambiar el deployment GAS.
- Mostrar login nuevamente ante `Token invalido` en lugar de seguir intentando cargar escuelas con una sesion vencida.

### Cambios implementados
- La sesion local ahora queda ligada a `APP_CONFIG.GAS_URL`; si el backend cambia, la app descarta la sesion anterior y pide iniciar sesion otra vez.
- `login` ya no envia un token viejo en el payload, evitando que una sesion rota contamine el nuevo inicio.
- La capa API detecta respuestas `401` o mensajes con `token`, limpia la sesion y abre la pantalla de login.
- El mapa ahora convierte respuestas no exitosas de `getEscuelas` en un aviso claro, en vez de dejar la vista sin datos.
- Version y cache actualizados a `v2.6.55`.

### Estado publicado
- Commit publicado en `main`: `cf84a6d` - `fix: renovar sesion al cambiar backend v2.6.55`.
- GitHub Pages ya sirve `assets/js/config.js` con `VERSION: '2.6.55'` y el backend publico estable.
- GitHub Pages ya sirve `sw.js` con cache `cialpa-app-v2.6.55`.
- Nota operativa: al abrir la app, el usuario debe actualizar la app si el navegador conserva cache vieja e iniciar sesion nuevamente; con token nuevo el mapa debe volver a cargar escuelas.

### Validaciones ejecutadas
- `node --check assets/js/auth.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- `git push origin main`.
- Verificacion HTTP de GitHub Pages para `assets/js/config.js`: version `2.6.55`.
- Verificacion HTTP de GitHub Pages para `sw.js`: cache `cialpa-app-v2.6.55`.

---

## Recuperacion urgente del mapa con backend publico - 2026-05-19 - v2.6.54

### Objetivo
- Recuperar la carga de escuelas en el mapa despues de detectar que los deployments GAS nuevos respondian HTTP 403.
- Evitar que la app publicada apunte a un Web App privado o no autorizado.

### Cambios implementados
- `APP_CONFIG.GAS_URL` se cambio al deployment publico estable `AKfycbwKls1jXCwh-Np9UMoir2VD3LtQlxxdJ0e3cetBeQDzJCnSNWAIHYnapTaPD1fgC75M`.
- Se verifico que ese deployment responde JSON publico en `login` y `getEscuelas` sin devolver la pantalla de Google Drive `Necesitas acceso`.
- Version y cache actualizados a `v2.6.54` para forzar actualizacion del Service Worker.
- Se deja documentado que los deployments nuevos `@12/@13` del GAS quedaron con HTTP 403 aunque la metadata informe `ANYONE_ANONYMOUS`; requieren correccion desde consola Apps Script/Google Cloud antes de volver a usarlos.

### Validaciones ejecutadas
- Prueba HTTP de deployment publico estable: `login` responde JSON `Usuario y contraseña son requeridos`.
- Prueba HTTP de deployment publico estable: `getEscuelas` responde JSON `Token invalido o expirado`, no HTTP 403.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

---

## Guardado visible en Sheets del borrador MEC - 2026-05-19 - v2.6.53

### Objetivo
- Que cada escuela cargada tenga una fila verificable en el Excel durante la carga, no solo al cierre final.
- Evitar la confusion entre borrador local del dispositivo, evidencias en Drive y registros visibles en Google Sheets.
- Permitir guardar manualmente en Sheets desde `Revision y salida`.

### Cambios implementados
- Nuevo endpoint `guardarBorradorMec` en Apps Script, con bloqueo de escritura y actualizacion por escuela/usuario.
- Nueva hoja `mec_borradores`, con una fila por escuela y campos de usuario, fecha, conteos, resumen, JSON del borrador e indice de evidencias.
- El borrador MEC se sincroniza automaticamente a Sheets de forma diferida cuando hay sesion y conexion.
- El boton `Guardar ahora` del MEC y la etapa `Revision y salida` incorporan guardado manual remoto.
- Antes del cierre completo, `Registro guiado` fuerza una sincronizacion del borrador a `mec_borradores` y luego intenta `entregas_cierre`.
- `escuelas_seleccionadas` agrega columnas de ultimo borrador MEC para ubicar rapidamente si una escuela ya subio datos desde la tablet.
- Los mensajes de `Datos en Sheets` aclaran que durante la carga se debe revisar `mec_borradores`, fotos en `evidencias` y cierres en `entregas_cierre`.
- Version y cache actualizados a `v2.6.53`.
- Backend GAS subido con `clasp` y deployment de produccion actualizado a `@12`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check`.
- `clasp push -f`.
- `clasp deploy -i AKfycbxmfkifnwz3WoaCzzTAmQO0TuvRwenmiJY3GSdEYqi564TtoCbEOTzD7CTgK4-vaOWKjQ -d "CIALPA v2.6.53 guardado visible en Sheets"`.

---

## Cierre completo con PDF, correo y trazabilidad - 2026-05-19 - v2.6.52

### Objetivo
- Mostrar claramente cuando una escuela no tiene pendientes obligatorios.
- Permitir guardar el relevamiento completo, abrir inmediatamente la vista PDF y enviar PDF/metadatos al correo configurado.
- Aclarar donde se guardan los datos en Google Sheets, Drive y el borrador local del dispositivo.

### Cambios implementados
- La etapa `Revision y salida` del `Registro guiado` ahora calcula pendientes globales de escuela, bloques, pisos, aulas/ambientes, sanitarios y exteriores.
- Si faltan datos, muestra una lista concreta de pendientes y un boton para ir al primer punto a resolver.
- Si no hay pendientes, aparece `Todo completo / Sin pendientes detectados` con la accion `Guardar completos y abrir PDF`.
- El cierre final arma un paquete con metadatos, resumen, modelo del plano, indice de evidencias y HTML imprimible del PDF.
- Nuevo endpoint `guardarCierreCompleto` en Apps Script: crea la hoja `entregas_cierre`, guarda metadatos en Drive, intenta generar PDF, registra enlaces en Sheets y envia correo a `censoescuelaspy@gmial.com`.
- La hoja `escuelas_seleccionadas` suma campos de ultimo cierre, PDF, metadatos y estado de email para ubicar rapido la entrega final.
- El boton lateral ahora se llama `Datos en Sheets` y avisa que el avance esta en `escuelas_seleccionadas`, las fotos en `evidencias` y los cierres en `entregas_cierre`.
- Version y cache actualizados a `v2.6.52`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- Validacion sintactica de `gas/*.gs` mediante Node.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Base mapa calibrable y mas nitida - 2026-05-19 - v2.6.51

### Objetivo
- Permitir mover, rotar, acercar/alejar y realzar la base de calles antes de dibujar los bloques.
- Mejorar la lectura de la base mapa para que sus lineas no queden demasiado opacas.

### Cambios implementados
- La base mapa incorpora modo `Mover base`, que permite arrastrar calles y lineas directamente sobre el plano sin seleccionar ni mover bloques.
- El panel `Base mapa` agrega rotacion, contraste/nitidez, color de lineas, opacidad hasta `100%`, giro fino izquierda/derecha y reinicio completo del ajuste.
- La rueda del mouse ajusta la escala de la base cuando `Mover base` esta activo; el zoom normal del plano con `Ctrl` se conserva.
- Las teselas de la base cubren correctamente el canvas aun cuando la base esta rotada.
- El dibujo del plano deja la capa inferior mas visible y reduce la cuadricula blanca superpuesta sobre las calles.
- Se agrego un preset `Realzar lineas` para subir opacidad, contraste y color de la referencia.
- Version y cache actualizados a `v2.6.51`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Cambio de escuela con borrador propio y pisos editables - 2026-05-19 - v2.6.50

### Objetivo
- Al iniciar/continuar registro desde el mapa, abrir la escuela seleccionada sin conservar nombres ni plano de la escuela anterior.
- Recuperar el borrador/plano local de esa escuela cuando ya fue trabajado en el mismo dispositivo.
- Permitir mover y estirar pisos nuevos dentro del bloque desde el plano.

### Cambios implementados
- El borrador MEC ahora se guarda tambien por escuela, usando una clave local derivada de `id_escuela` o `codigo_local`.
- Al cambiar de escuela desde `Mapa` o desde `Migrar datos al RUE-MEC`, `SurveyModule.setCurrentEscuela()` ordena a `MecFormModule` cargar el borrador correcto.
- Si la escuela seleccionada ya tiene borrador local, se restaura su plano; si no existe, se inicia un borrador limpio con los datos generales de la escuela.
- El borrador global `cialpa_mec_form_draft_v1` se mantiene como copia compatible para el resto de modulos, pero deja de arrastrar escuelas anteriores.
- El estado del `Registro guiado` queda separado por escuela para no heredar paso activo, banderas o metas de aulas de otra escuela.
- `Limpiar borrador MEC` borra tambien la copia local especifica de la escuela activa.
- Los pisos se agregan al arrastre directo del plano, igual que ambientes, sanitarios y elementos exteriores, manteniendo seleccion y redimensionamiento por manijas.
- Version y cache actualizados a `v2.6.50`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Menos espacio vacio, sidebar intencional y simbolos limpios - 2026-05-19 - v2.6.49

### Objetivo
- Eliminar el espacio blanco innecesario antes del plano vivo.
- Evitar que el menu lateral aparezca por roces accidentales del cursor.
- Agregar acceso directo al libro online de registros.
- Quitar marcas/simbolos decorativos innecesarios al insertar tablero, rampa y elementos tecnicos.

### Cambios implementados
- El alto del panel de etapa del `Registro guiado` se calcula con el contenido real activo, evitando que un slide anterior deje alto reservado.
- La pista de slides deja de estirar las tarjetas al alto previo, reduciendo el bloque blanco antes de `Plano vivo`.
- La zona sensible del menu lateral baja a una franja de borde de 10 px y exige permanencia breve del cursor antes de abrirse.
- El menu oculto ya no captura eventos con un panel invisible, reduciendo aperturas accidentales.
- El panel lateral incorpora el boton `Libro en linea`, conectado a `APP_CONFIG.SPREADSHEET_URL`.
- Se retiran las marcas automaticas `Esc`/`Rmp` sobre el bloque; la escalera o rampa ya existen como elementos ubicables en el plano.
- Tableros y elementos tecnicos dejan de imprimir letras o detalle interno innecesario; quedan como figuras seleccionables, movibles y dimensionables.
- Version y cache actualizados a `v2.6.49`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Inicio de registro desde ficha del mapa - 2026-05-19 - v2.6.48

### Objetivo
- Permitir que, despues de usar `Cambiar escuela`, la ficha del mapa permita iniciar o continuar directamente el registro guiado de la escuela seleccionada.

### Cambios implementados
- La ficha lateral del mapa agrega el boton `Iniciar/continuar registro` para usuarios con permiso de encuestador.
- El popup del marcador tambien incorpora `Iniciar/continuar registro`, junto a `Migrar datos al RUE-MEC` y `Ver en lista`.
- La accion fija la escuela seleccionada como escuela activa del registro sin obligar a pasar por el modulo de migracion RUE-MEC.
- Si existe una sesion operativa activa de otra escuela, se bloquea el cambio y se avisa que debe cerrarse antes de iniciar otra.
- Al confirmar la escuela desde el mapa, la app abre `Registro guiado` y refresca el plano vivo con el contexto de la nueva escuela.
- Version y cache actualizados a `v2.6.48`.

### Validaciones ejecutadas
- `node --check assets/js/map.js`.
- `node --check assets/js/survey.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Zoom normal al salir de seleccion y base de calles cercana - 2026-05-19 - v2.6.47

### Objetivo
- Volver al zoom normal cuando el usuario toca o hace clic fuera de un elemento seleccionado.
- Permitir que la base de calles se acerque lo suficiente para calzar bloques arquitectonicos sobre la referencia.

### Cambios implementados
- Un clic/toque sobre el vacio del plano limpia la seleccion activa, oculta la accion flotante y devuelve el zoom del plano a `100%`.
- La base de calles nueva o no confirmada inicia con vista mas cercana: zoom cartografico `19` y escala base `2.5x`.
- La escala manual de la base se amplio hasta `24x`, manteniendo desplazamiento independiente para alinear la estructura.
- El panel de base mapa agrega botones directos `Acercar base` y `Alejar base` para calibrar rapidamente en tablet.
- La metrica de cobertura muestra centimetros por pixel cuando corresponde, evitando lecturas redondeadas a `0.00 m/px`.
- Version y cache actualizados a `v2.6.47`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Encabezado unico de escuela en plano vivo - 2026-05-19 - v2.6.46

### Objetivo
- Eliminar la tarjeta duplicada de `Escuela activa` dentro del registro guiado.
- Dejar el cambio de escuela en la misma zona compacta de `Plano vivo`.

### Cambios implementados
- El plano embebido en `Registro guiado` ya no renderiza la barra interna `Escuela activa`, porque el dato ya esta en el encabezado de `Plano vivo`.
- Se agrego el boton `Cambiar escuela` al encabezado de `Plano vivo`, junto al nombre/codigo/ubicacion de la escuela.
- En `Plano escuela` y cuestionario MEC se conserva la barra de escuela activa para no perder contexto cuando esas vistas se usan fuera del registro guiado.
- Se ajusto el encabezado en pantallas angostas para que escuela, estado de guardado y boton no se superpongan.
- Version y cache actualizados a `v2.6.46`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Claridad del flujo inicial y zoom de seleccion - 2026-05-19 - v2.6.45

### Objetivo
- Integrar la escuela activa en el encabezado del plano sin ocupar una banda extra.
- Hacer que la seleccion del plano centre y acerque el objeto antes de editar.
- Aclarar que se debe declarar en `Escuela y jornada` y `Predio base`.

### Cambios implementados
- El nombre/codigo de la escuela se muestra junto a `Plano vivo`, con la ubicacion en la misma cabecera compacta.
- Se elimino la banda separada de `Escuela activa` dentro del registro guiado para recuperar alto util.
- El boton `Ficha` del elemento seleccionado queda como accion flotante sobre el canvas y ya no ocupa espacio de layout.
- Las solicitudes iniciales explican claramente que declarar: escuela/codigo/jornada/responsable y referencia opcional del predio.
- Todas las tarjetas de solicitud guiada incorporan ayuda desplegable `(i)` con criterio de campo y explicacion operativa.
- Al seleccionar, hacer doble clic o doble toque sobre un objeto del plano, el sistema centra y ajusta zoom sin abrir la ficha automaticamente.
- La ficha queda disponible desde el boton flotante para editar cuando el usuario ya tiene el elemento a la vista.
- Version y cache actualizados a `v2.6.45`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores.

---

## Ajustes de flujo guiado, logistica y edicion tactil - 2026-05-19 - v2.6.44

### Objetivo
- Mantener visible la escuela activa durante la carga.
- Recuperar el acceso a planificacion/logistica y mejorar la confianza al editar fichas y objetos del plano.

### Cambios implementados
- `Registro guiado`, cuestionario MEC y plano muestran una banda de `Escuela activa` con codigo/ubicacion y acceso a `Mapa`.
- El menu lateral recupera `Mi Jornada` y `Planificacion`, respetando permisos existentes.
- Las preguntas de calidad/caracteristicas quedan como recomendadas en la tarjeta superior y ya no bloquean la confirmacion cuando posicion y dimensiones estan completas.
- Las fichas de ambientes y sanitarios agregan `Guardar ficha`, cerrando el tiempo operativo del elemento y reforzando el guardado manual.
- El boton `Instalar` en iPad/iPhone abre instrucciones especificas para Safari y `Agregar a pantalla de inicio`.
- Doble clic o doble toque sobre elementos del plano centra el objeto y ajusta zoom antes de abrir la ficha.
- El plano incorpora un boton flotante `Ficha` siempre visible cuando hay seleccion.
- Se recupero la accion `Apertura` para puertas seleccionadas desde el plano general, tanto en aulas/ambientes como en sanitarios.
- Version y cache actualizados a `v2.6.44`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Correcciones de auditoria integral - 2026-05-19 - v2.6.43

### Objetivo
- Aplicar los arreglos prioritarios detectados en la auditoria profunda del instrumento.
- Reducir errores de botones visibles, perdida de borradores con fotos, problemas de cache/version y duplicados en sincronizacion offline.

### Cambios implementados
- Se exportaron las acciones poligonales de aulas y sanitarios (`Forma L`, `+ Vertice`, `- Vertice`, `Rectangular`) que ya existian pero no estaban disponibles en `MecFormModule`.
- Las evidencias fotograficas ahora se preparan comprimidas y conservan miniatura local; al subir a Drive se retira el `dataUrl` grande del borrador para bajar el riesgo de cuota de `localStorage`.
- `_saveDraft()` ahora maneja errores de guardado local y avisa cuando el dispositivo no permite persistir el borrador.
- La cola offline agrega `clientMutationId` / `id_offline_queue` a cada mutacion y reusa esos identificadores al sincronizar.
- Apps Script reutiliza IDs offline para sesiones, modulos e incidencias, y evita duplicar incidencias ya sincronizadas.
- El router GAS usa `LockService` para mutaciones principales, reduciendo carreras cuando varias tablets escriben a la vez.
- El Service Worker solo cachea respuestas validas y el precache ya no aborta toda la instalacion si un archivo puntual falla.
- El admin inicial de `setup.gs` ya no usa una contraseña fija documentada: genera una temporal y la muestra al ejecutar la funcion.
- README, checklist y referencias historicas dejaron de exponer la contraseña fija inicial y se actualizaron a la version vigente.
- Version y cache actualizados a `v2.6.43`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/api.js`.
- `node --check assets/js/local-store.js`.
- `node --check assets/js/stats.js`.
- Validacion sintactica de `gas/*.gs` mediante `new Function(...)` en Node.
- Validacion estatica de referencias `MecFormModule.*` sin funciones faltantes.
- `git diff --check` sin errores.

---

## Rampa con caida izquierda/derecha - 2026-05-18 - v2.6.42

### Objetivo
- Permitir representar una rampa con caida hacia la izquierda o hacia la derecha sin depender del giro general.
- Hacer que el boton `Voltear H` tenga un efecto claro sobre la rampa.

### Cambios implementados
- La rampa guarda `sentido_caida` en ficha con opciones `Derecha` e `Izquierda`.
- El dibujo de la rampa ahora cambia de forma segun la caida y muestra una flecha interna de direccion.
- El panel contextual y el arbol del plano agregan botones directos `Caida izq.` y `Caida der.` cuando hay una rampa seleccionada.
- `Voltear H` sobre una rampa alterna la caida izquierda/derecha en lugar de depender de un volteo visual que se perdia al redibujar.
- Los volteos de elementos exteriores se preservan al normalizar el modelo, manteniendo el comportamiento esperado en otros elementos.
- El SVG exportado dibuja la rampa con la misma caida visible del canvas.
- Version y cache actualizados a `v2.6.42`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-schema.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Arrastre directo de ambientes y borrado de bloque padre - 2026-05-18 - v2.6.41

### Objetivo
- Permitir mover aulas y sanitarios sin depender de activar previamente `Mover`.
- Hacer accesible el borrado del bloque aunque el piso, aula o sanitario cubra la zona clickeable del bloque.

### Cambios implementados
- Aulas/espacios y sanitarios ahora inician arrastre directo al mover el puntero sobre ellos, igual que los elementos exteriores.
- Se mantiene el umbral de movimiento antes de arrastrar para conservar el click simple como seleccion.
- Se agrego `Borrar bloque` al panel contextual cuando esta seleccionado el bloque, un piso, un aula/espacio o un sanitario del bloque.
- Nueva accion `deletePlanBlock(blockId)` selecciona el bloque padre correcto y reutiliza la confirmacion existente de `deleteActiveBlock()`.
- Version y cache actualizados a `v2.6.41`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-schema.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Aulas nuevas con geometria editable - 2026-05-18 - v2.6.40

### Objetivo
- Corregir que la segunda aula pudiera quedar como fallback visual ocupando todo el piso.
- Asegurar que cada aula/espacio nuevo nazca con un rectangulo propio, editable, movible y sin solaparse con aulas o sanitarios existentes.

### Cambios implementados
- `Nueva aula` y `Agregar otro espacio` ahora crean inmediatamente una base geometrica con medidas iniciales acotadas al bloque/piso.
- La ubicacion sugerida usa aulas y sanitarios del mismo bloque/piso como bloqueadores y prioriza posiciones topeadas al ultimo ambiente existente.
- Las aulas antiguas o guardadas sin objeto `room` se reparan al renderizar: reciben medidas por defecto, rectangulo propio y dejan de entrar al layout fallback que llenaba el piso.
- Si un aula sin geometria venia con largo/ancho iguales al piso y ya existen otros ambientes, se reduce a una medida editable para evitar solape.
- Al modificar `Largo` o `Ancho` desde la ficha, el rectangulo del aula se redimensiona y reacomoda sin esperar a pulsar `Dibujar base`.
- Version y cache actualizados a `v2.6.40`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-schema.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Orientacion de rampa y altas sin solape - 2026-05-18 - v2.6.39

### Objetivo
- Corregir que la rampa no respondiera de forma clara a los botones `Horizontal` y `Vertical`.
- Hacer que aulas, sanitarios y cabinas nuevas se ubiquen topeadas al elemento anterior, sin superponerse.

### Cambios implementados
- La orientacion rapida de elementos exteriores normaliza el eje largo de rampa, escalera, galeria y caminero antes de aplicar `Horizontal` o `Vertical`.
- El giro de elementos exteriores conserva la seleccion, guarda `rotacion_grados` en ficha y evita que el elemento quede recortado fuera del canvas.
- La sugerencia de ubicacion de aulas/espacios ahora considera aulas y sanitarios del mismo bloque/piso como bloqueadores.
- La colocacion automatica permite contacto exacto entre rectangulos, pero sigue rechazando solapes reales.
- Sanitarios nuevos se acomodan contra aulas o sanitarios existentes sin exigir separacion artificial.
- Cabinas sanitarias nuevas buscan el primer espacio libre topeado a las cabinas existentes antes de usar una posicion de respaldo.
- Version y cache actualizados a `v2.6.39`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-schema.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Cuestionario secuencial con confirmacion de elementos - 2026-05-18 - v2.6.38

### Objetivo
- Hacer que cada pregunta del cuestionario guiado avance item por item.
- Bloquear el avance cuando un elemento requiere ubicacion, dimensiones, condicion o caracteristicas pendientes.
- Limpiar fichas para que no pidan informacion generica que no corresponde al objeto.

### Cambios implementados
- `Registro guiado` ahora muestra un checklist por bloque, piso, aula/espacio, sanitario y elemento exterior/tecnico con pendientes concretos: ubicacion en plano, dimensiones, condicion y caracteristicas.
- La etapa de bloques exige medidas, estado y observacion/caracteristica antes de pedir ubicacion en plano.
- Los pisos incorporan estado y observacion/caracteristicas en su ficha; el flujo no continua si esos datos quedan vacios.
- Aulas/espacios, sanitarios y elementos exteriores/tecnicos solo pueden confirmarse cuando todos sus pendientes estan completos.
- Se agrego la accion guiada para seleccionar directamente el elemento pendiente en el plano.
- La ficha de aulas/espacios agrega `Caracteristicas / uso observado`, persistido en el registro del ambiente.
- Se limpio la ficha de objetos internos: toma electrica, tablero, iluminacion, ventilador, aire acondicionado, texto, trazo y foto ya no muestran `Material` cuando no corresponde; la ficha de foto deja de usar textos de iluminacion.
- Version y cache actualizados a `v2.6.38`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check`.

---

## Hit tactil ampliado para redimensionamiento - 2026-05-18 - v2.6.37

### Objetivo
- Corregir que en tablet el estiramiento desde vertices respondiera bien solo en bloques y no en pisos, aulas/espacios, sanitarios, objetos internos o elementos exteriores.
- Mantener el comportamiento fino del mouse sin agrandar artificialmente los handles en escritorio.

### Cambios implementados
- `_bindSchoolPlanCanvas`: la deteccion tactil de areas `*-resize` y `*-vertex` ahora usa un margen ampliado solo cuando `pointerType === 'touch'`.
- El mouse conserva la deteccion exacta anterior, evitando falsos positivos al trabajar con precision.
- Se mantiene la regla de v2.6.35 para elementos tecnicos muy pequenos: si el dedo/clic cae dentro del cuerpo, se prioriza mover el elemento en lugar de redimensionarlo.
- Se recupero `assets/js/mec-form.js` desde Git luego de quedar en 0 bytes por falta de espacio en disco, y se reaplicaron los cambios de v2.6.36 sobre ese archivo.
- Version y cache actualizados a `v2.6.37`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Movimiento fino tactil y nudge extendido - 2026-05-18 - v2.6.36

### Objetivo
- Completar el movimiento fino del plano para que tambien funcione con pisos, aulas/espacios, objetos internos y sanitarios.
- Agregar una alternativa tactil visible para mover elementos en tablets sin depender de teclado fisico.
- Hacer mas distinguible el volteo visual de elementos tecnicos simetricos.

### Cambios implementados
- `nudgeSelectedPlanItem(dx, dy)` ahora reutiliza el area real seleccionada del plano y soporta pisos, aulas/espacios, objetos internos de aulas, sanitarios y objetos internos de sanitarios, ademas de bloques y elementos exteriores.
- El canvas toma foco al tocarlo o hacer clic, para que las flechas de teclado funcionen de forma mas confiable despues de seleccionar un elemento.
- El panel contextual del constructor muestra un pad compacto `Mover` con botones tactiles de direccion de 5 px cuando hay un elemento seleccionado.
- El pad tactil respeta las mismas funciones y restricciones del arrastre existente: bloqueos, limites de piso, limites de aula/sanitario y ajuste de objetos internos.
- Acometida y puesta a tierra incorporan una pequena marca asimetrica para que `Voltear H` y `Voltear V` tengan una diferencia visual perceptible.
- Version y cache actualizados a `v2.6.36`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

---

## Movimiento por teclado y fix drag-resize en elementos pequeños - 2026-05-18 - v2.6.35

### Problema
- Arrastrar un objeto pequeño (elemento tecnico de 6-10 px) disparaba un resize en lugar de un movimiento porque el radio del hit-area del handle (10 px) cubre el cuerpo entero del elemento.
- No existia forma de mover objetos con las teclas de direccion del teclado.

### Solucion

**`assets/js/mec-form.js`:**
- `siteAreaFromPoint` (dentro de `_bindSchoolPlanCanvas`): si el elemento tiene menos de 20 px en alguna dimension y el clic cae dentro del rectangulo del cuerpo, se devuelve hit de cuerpo (mover) en lugar de hit de handle (resize). Para elementos grandes el comportamiento es identico al anterior.
- `_bindSchoolPlanCanvas`: `canvas.tabIndex = 0` + listener `keydown`. Flechas mueven el elemento seleccionado 5 px (Shift = 1 px fino, Alt = 20 px rapido).
- Nueva funcion `nudgeSelectedPlanItem(dx, dy)`: mueve el elemento seleccionado segun su tipo — site-element via `_movePlanSiteElement`, bloque via `_movePlanBlock`, sanitario via `_movePlanSanitary`. Exportada como `MecFormModule.nudgeSelectedPlanItem`.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.35
- `sw.js` — CACHE_NAME cialpa-app-v2.6.35
- `index.html` — spans app-version

---

### Proximos pasos
- Probar en tablet que el canvas reciba foco al tocarlo y que las flechas del teclado fisico (si disponible) muevan el elemento.
- Evaluar si se necesita soporte de nudge para elementos de tipo `floor` y `room` (actualmente solo site-element, block y sanitary).
- Considerar agregar botones de direccion visibles en el panel contextual (▲ ▼ ◀ ▶) como alternativa tactil al teclado.
- Revisar el dibujo interno de elementos tecnicos (service_connection, grounding) para que el volteo H/V sea visualmente distinguible (formas actualmente simetricas).

---

## Handles adaptativos y botones Voltear en panel contextual - 2026-05-18 - v2.6.34

### Problema
- Los cuadritos de resize (handles) tienen tamaño fijo (hit 22 px, visual 11 px) independientemente del tamaño del elemento, resultando desproporcionados en elementos tecnicos pequeños.
- Los botones "Voltear H" y "Voltear V" solo eran accesibles desde el tab "Editar" del ribbon; no aparecian en el panel de acciones rapidas al seleccionar un elemento exterior.

### Solucion

**`assets/js/mec-form.js`:**
- `_planResizeHandles`: tamaño de hit ahora escala segun `min(rect.w, rect.h)`: < 14 px → hit 10 px; 14-28 px → hit 14 px; > 28 px → hit 22 px (anterior).
- `_drawPlanResizeHandles`: visual `half` escala: < 14 px → 3 px; 14-28 px → 4 px; > 28 px → 5.5 px. `lineWidth` tambien escala.
- `_planSelectionContext` (rama `site::`): se agregan `Voltear H` y `Voltear V` al array de acciones del panel contextual.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.34
- `sw.js` — CACHE_NAME cialpa-app-v2.6.34
- `index.html` — spans app-version

---

## Elementos tecnicos a escala y etiquetas de grilla corregidas - 2026-05-18 - v2.6.33

### Problema
- Los elementos del tipo "tecnico" (acometida, medidor, tablero, puesta a tierra) tenian un minimo de 30×26 px hardcodeado al renderizarse, lo que les impedia ocupar su tamaño real (tipicamente 0.1-0.5 m).
- El limite de redimensionado por drag era fijo 18×14 px sin distincion de tipo.
- `_syncSiteElementMeasuresFromRect` usaba `factorX = 120` para convertir wRatio → largo_m en elementos tecnicos, inconsistente con el `/ 10` introducido en v2.6.32.

### Solucion

**`assets/js/mec-form.js`:**
- `_siteElementRect`: minimo de render `30×26 → 6×6` px para tipos tecnicos.
- `_siteElementBlankPosition` y `_blockDrivenElementPosition`: mismo minimo 6×6 para tipos tecnicos.
- Inicializacion de `resizeDrag` (rama `site-resize`): se agrega `elementType: element.type` al objeto.
- Logica de drag minimum (linea `minW/minH`): si `elementType` es tecnico, minimo 6 px en lugar de 18/14.
- `_syncSiteElementMeasuresFromRect`: `factorX/Y = 10` para tipos tecnicos (era 120); minimo de largo/ancho almacenado = 0.05 m (era 0.2 m).

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.33
- `sw.js` — CACHE_NAME cialpa-app-v2.6.33
- `index.html` — spans app-version

---

## Correcciones de etiquetas de grilla y formula de elementos tecnicos - 2026-05-18 - v2.6.32

### Problema
1. `fmtM(0)` retornaba "0 mm" (cae en la rama `< 0.01` del formatter).
2. Las etiquetas del eje de la grilla usaban `Math.abs(mRounded)`, causando que posiciones a la izquierda/arriba del origen del bloque mostraran los mismos valores positivos que el lado derecho/abajo (etiquetas duplicadas).
3. Los elementos tecnicos (llaves electricas, tableros, medidor, puesta a tierra) no respondian visualmente a cambios de dimension en la ficha porque `largo / 120` hace que valores < 3 m siempre caigan en el minimo de wRatio.

### Solucion

**`assets/js/mec-form.js`:**
- `fmtM`: agregado caso `v === 0 → '0 m'` antes de la cadena de condiciones.
- Bucles de etiquetas horizontal y vertical en `_drawSchoolPlanGrid`: `if (mRounded < 0) continue` elimina etiquetas en posiciones negativas (izquierda/arriba del origen del bloque). Eliminado `Math.abs` del argumento de `fmtM`.
- `_siteElementDimensionsFromFicha`: para tipos tecnicos, divisor `largo / 120 → largo / 10` y `ancho / 120 → ancho / 10`; minimos ajustados de `.025 → .018` y maximos de `.16/.14 → .12/.10`.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.32
- `sw.js` — CACHE_NAME cialpa-app-v2.6.32
- `index.html` — spans app-version

---

## Bordes de bloque simples y etiquetas de eje en grilla - 2026-05-18 - v2.6.31

### Problema
- El borde grueso de los bloques ("muro grueso", 3 px + doble borde interior + relleno de cabecera) era visualmente pesado y confundia la escala.
- La cuadricula no tenia indicacion numerica de posicion; el usuario no podia leer la distancia desde el origen del bloque al inspeccionar.
- El indicador "m bordes" aparecia con valores absurdos (ej. 160 m) al seleccionar elementos pequeños de sitio porque usaba `metersPerPx` calculado para otro tipo de elemento.

### Solucion

**`assets/js/mec-form.js`:**
- Dibujo de bloque: eliminados borde interior doble, relleno de cabecera y lineWidth = 3. Ahora: `fillRect` rgba(.20), `strokeRect` con `lineWidth = 1` (seleccionado: 2).
- `_drawSchoolPlanGrid`: etiquetas numericas a lo largo del eje superior y del eje derecho. Formato automatico m/cm/mm. Fondo semi-opaco bajo cada etiqueta para legibilidad.
- `_drawPlanDistanceGuides`: restringido solo a comparaciones bloque–bloque (`if (source.type !== 'block') return`).

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.31
- `sw.js` — CACHE_NAME cialpa-app-v2.6.31
- `index.html` — spans app-version

---

## Cuadricula a escala real y zoom extendido - 2026-05-18 - v2.6.30

### Problema
La cuadricula de fondo usaba un paso fijo de 20 px sin relacion con metros reales. El usuario reporto que "la escala del poligono no tiene sentido" y pidio que la cuadricula represente 1 m² y que al hacer zoom se pueda ver hasta milimetros. Ademas el zoom maximo (2.8x) era insuficiente para inspeccionar bloques a nivel de detalle metrico.

### Solucion

**`assets/js/mec-form.js`:**
- `_drawSchoolPlanGrid`: reescrita para derivar `pixelsPerMeter` del primer bloque en `_planBlockLayout` (usando `scaleX`). Calcula intervalos "nice" adaptativos (de 0.001 m / 1 mm hasta 500 m) eligiendo el menor que produzca >= 50 px entre lineas mayores y >= 10 px entre menores. Las lineas se alinean a la esquina del bloque primario (phase offset). Muestra etiqueta de escala en esquina inferior izquierda (ej. "Cuad.: 1 m" / "Cuad.: 50 cm" / "Cuad.: 10 cm").
- `_setSchoolPlanZoomValue`: zoom maximo extendido de 2.8x a 30x, minimo de 0.55 a 0.1.
- `_planCanvasWidth` y `_renderPlanBaseMapLayer`: actualizados con nuevos limites de zoom.
- `setSchoolPlanZoom`: cambiado de paso aditivo (+0.15) a factor multiplicativo (×1.3 / ÷1.3) para que los clics sean proporcionalmente equivalentes en todos los niveles de zoom.
- Manejador `wheel` (Ctrl+scroll): cambiado a factor multiplicativo ×1.15 por tick.

### Resultado
Con un bloque de 130 m, la cuadricula a zoom=1 mostrara celdas de 10 m o 20 m (automatico); al hacer zoom hasta 20-30x se ven celdas de 1 m; al 30x en bloques tipicos de 20 m se alcanzan celdas de 10-20 cm.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.30
- `sw.js` — CACHE_NAME cialpa-app-v2.6.30
- `index.html` — spans app-version

---

## Sesion de ribbon unificado con iconos - 2026-05-18 - v2.6.27

### Problema
El grupo "Exteriores" en la pestana Insertar del ribbon usaba `_renderSiteElementToolset('plan', 'compact')` que genera botones con clase `mec-sketch-tool` (grid CSS con `auto-fit minmax(72px, 1fr)`). Al embeberse dentro del panel ribbon (flex, `overflow-x: auto`) estos botones se superponian visualmente con los grupos siguientes porque el grid interno se enrollaba en multiple filas.

### Solucion

**`assets/js/mec-form.js`:**
- `SITE_ELEMENT_TYPES`: se agregaron propiedades `icon` (Unicode) y `ribbonLabel` (texto corto) a cada entrada.
- `_renderPlanRibbonPanel` (pestana 'insertar'): el grupo Exteriores ahora usa `_renderPlanRibbonButton` para cada tipo de elemento, igual que los demas grupos. Resultado: todos los botones tienen el mismo estilo, altura y alineacion; el panel hace scroll horizontal si no caben en pantalla.
- Iconos Unicode asignados: ○ tanque, ⊙ pozo, ◆ recreacion, ≡ galeria, ⇨ caminero, □ esp. libre, ■ pilar, ◫ escalera, ╱ rampa, ↪ acometida, ⦿ medidor, ⚡ tablero, ⏚ p. tierra.
- Botones Ambientes: iconos mejorados — □ aula, ◧ espacio, ⌀ sanitario.
- Botones Exportar: iconos mas representativos — {} JSON, ⌕ DXF, ◆ SVG, ▣ PNG, ⎙ PDF.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.27
- `sw.js` — CACHE_NAME cialpa-app-v2.6.27
- `index.html` — spans app-version

---

## Sesion de elementos electricos anclados a pared - 2026-05-18 - v2.6.26

### Objetivo
- Tableros y pizarrones deben anclarse siempre a la pared mas cercana y conservar esa posicion al redimensionar el aula/sanitario.

### Problema
`switchboard` (tablero) y `board` (pizarron) son objetos rectangulares. La funcion `_clampOpeningToRoom` retorna sin hacer nada para tipos que no sean door/window, por lo que estos objetos quedaban flotando en el interior del aula sin anclaje a pared. Al redimensionar el aula, se escalaban proporcionalmente pero no se resnapeaban.

### Solucion
**`assets/js/mec-form.js`:**
- Nueva constante `WALL_RECT_TYPES = ['switchboard', 'board']`.
- Nueva funcion `_snapRectToRoomWall(object, room)`: snapea un objeto rectangular al muro mas cercano y guarda `attached = { type: 'wall-rect', side, ratio }`.
- Nueva funcion `_snapRectToActiveRoomWall(object)`: wrapper que toma el room del sketch activo.
- `_createSketchObjectAt`: para WALL_RECT_TYPES llama `_snapRectToActiveRoomWall` en lugar de `_clampOpeningToRoom`.
- `_moveSketchObject` (sketch editor drag): idem, resnap a pared al mover.
- `_movePlanClassObject` (plan view drag): idem.
- `_movePlanSanitaryObject` (plan view sanitary drag): idem con `_snapRectToRoomWall(object, roomObject)`.
- `_reflowAttachedOpenings` y `_reflowSanitaryOpenings`: nuevo bloque que resnapa objetos con `attached.type === 'wall-rect'` despues de cada resize de aula/sanitario.

### Archivos modificados
- `assets/js/mec-form.js`
- `assets/js/config.js` — VERSION 2.6.26
- `sw.js` — CACHE_NAME cialpa-app-v2.6.26
- `index.html` — spans app-version

---

## Sesion de cabinas y artefactos sanitarios en ribbon - 2026-05-18 - v2.6.25

### Objetivo
- Exponer en la pestaña Insertar del ribbon los botones para agregar cabinas y artefactos cuando un sanitario esta seleccionado en el plano.
- Usar iconos Unicode acordes a cada elemento (◜ puerta, ▭ ventana, ▣ cabina, WC inodoro, ◎ lavamanos, ⊔ urinario, ≋ ducha).

### Problema
Al seleccionar un sanitario en el plano y abrir la pestana Insertar, solo aparecian Puerta y Ventana. Las opciones de Cabina, Inodoro, Lavamanos, Urinario y Ducha no eran visibles desde el ribbon, aunque existian como funciones `addPlanSanitaryStall` y `addPlanSanitaryFixture`.

### Solucion
**`assets/js/mec-form.js` — `_renderPlanRibbonPanel`:**
- Cuando `hasSanitary`, se agregan dos nuevos grupos antes de Aberturas:
  - `Cabinas del sanitario`: boton Cabina (▣) → `addPlanSanitaryStall()`
  - `Artefactos del sanitario`: Inodoro (WC), Lavamanos (◎), Urinario (⊔), Ducha (≋)
- Iconos de Puerta (◜ &#x25DC;) y Ventana (▭ &#x25AD;) actualizados en ambos grupos (aula y sanitario) usando los mismos simbolos que `_sketchToolIcon`.

**`_isPlanRibbonDuplicateAction`:**
- Filtro ampliado: cuando hasSanitary, oculta `+ cabina`, `+ inodoro`, `+ lavamanos` del builder panel para evitar duplicados con el ribbon.

### Archivos modificados
- `assets/js/mec-form.js` — ribbon insertar, filtro duplicados
- `assets/js/config.js` — VERSION 2.6.25
- `sw.js` — CACHE_NAME cialpa-app-v2.6.25
- `index.html` — spans app-version

---

## Sesion de actualizacion confiable del Service Worker - 2026-05-16 - v2.6.24

### Objetivo
- Corregir que el boton `Actualizar app` dejara la pantalla en la version anterior porque el Service Worker antiguo seguia controlando la pagina despues del reload.

### Problema identificado
- `updateApp()` enviaba `SKIP_WAITING` al SW instalado, eliminaba caches y hacia `window.location.replace()`. Sin embargo, el SW nuevo podia no haber activado antes del reload, de modo que el SW viejo (v2.6.20) volvia a crear su cache `cialpa-app-v2.6.20` con los nuevos archivos y la version seguia igual en pantalla.

### Cambios implementados
- `updateApp()` en `assets/js/app.js` ahora:
  1. Elimina **todos** los caches del dominio excepto `cialpa-map-tiles`.
  2. Desregistra **todos** los Service Workers via `navigator.serviceWorker.getRegistrations()` + `reg.unregister()`.
  3. Recarga en `window.location.pathname + '?_=<timestamp>'` sin SW que intercepte la respuesta, forzando que el navegador descargue `sw.js` y los archivos de la app frescos desde el servidor.
- Se eliminaron los pasos anteriores de `_swRegistration.update()` y `SKIP_WAITING` que no eran suficientes.
- Version y cache actualizados a `v2.6.24`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.

### Nota de uso
- Si la app sigue mostrando la version anterior despues de `Actualizar`, significa que el servidor (GitHub Pages u otro) aun sirve los archivos viejos. En ese caso es necesario desplegar los archivos actualizados antes de que el boton funcione.

---

## Sesion de aberturas en cinta Insertar - 2026-05-16 - v2.6.23

### Objetivo
- Hacer accesibles los botones `+ Puerta` y `+ Ventana` desde el tab `Insertar` de la cinta, que es donde el usuario los busca naturalmente.

### Problema identificado
- Los botones `+ Puerta` y `+ Ventana` existian en el panel builder (`.school-plan-builder__actions`) al seleccionar un aula o sanitario, pero la cinta `Insertar` no los incluia. El usuario esperaba encontrarlos ahi al igual que los demas elementos de insercion.

### Cambios implementados
- El tab `Insertar` de la cinta ahora detecta el contexto de seleccion activa. Cuando hay un aula o uno de sus elementos seleccionado, muestra el grupo `Aberturas del aula` con botones `Puerta` y `Ventana` que llaman a `addPlanClassroomElement('door')` y `addPlanClassroomElement('window')`.
- Cuando hay un sanitario seleccionado, muestra el grupo `Aberturas del sanitario` con botones equivalentes que llaman a `addPlanSanitaryOpening('door')` y `addPlanSanitaryOpening('window')`.
- `_isPlanRibbonDuplicateAction` ahora filtra `+ Puerta` y `+ Ventana` del panel builder cuando una seleccion de aula o sanitario esta activa, para evitar duplicacion visual con la cinta.
- El grupo de aberturas no aparece si no hay aula o sanitario activos, evitando botones sin contexto.
- Version y cache actualizados a `v2.6.23`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.

---

## Sesion de cortes en muros poligonales - 2026-05-16 - v2.6.22

### Objetivo
- Hacer que puertas y ventanas ubicadas en aulas o sanitarios con forma L o poligono personalizado generen su corte visual sobre el borde real del polígono y no sobre el rectangulo contenedor.

### Cambios implementados
- Se agrego la funcion `_openingCutSegmentOnPolygon(polyPoints, objectRect)` en `mec-form.js`: recibe los vertices canvas del poligono y el rect de la abertura, encuentra el borde mas cercano al centro de la abertura proyectando sobre cada segmento, y devuelve un segmento de corte centrado en la proyeccion con largo proporcional a la dimension de la abertura sobre ese borde.
- `_drawPlanOpeningCuts` acepta ahora un quinto parametro opcional `shapePoints`. Cuando se pasan puntos poligonales (longitud >= 3), usa `_openingCutSegmentOnPolygon`; de lo contrario mantiene el comportamiento rectangular existente con `_openingCutSegment`.
- Las llamadas en `_drawPlanClassroom` y `_drawPlanSanitaryRoom` ahora pasan `shapePoints` (ya computado en ambas funciones para el dibujo del contorno) a `_drawPlanOpeningCuts`, activando el nuevo camino cuando el aula o sanitario tiene forma personalizada.
- El comportamiento para rooms rectangulares sin `planShape` queda identico al de v2.6.21.
- Version y cache actualizados a `v2.6.22`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.

---

## Sesion de avisos discretos, muros y formas poligonales - 2026-05-18 - v2.6.21

### Objetivo
- Reducir mensajes emergentes molestos durante acciones frecuentes del plano, especialmente en tablets.
- Mejorar la lectura arquitectonica de aulas y sanitarios con muros negros gruesos y aberturas visibles como cortes.
- Iniciar soporte para aulas/espacios y sanitarios no rectangulares mediante formas poligonales editables por vertices.

### Cambios implementados
- Los avisos `success` ahora son mas breves, compactos y se limitan para evitar acumulacion visual.
- Las rotaciones, orientaciones y volteos rapidos del plano ya no disparan mensajes emergentes de confirmacion; se mantienen advertencias cuando falta seleccion, hay bloqueo o no se puede completar una accion.
- Aulas/espacios y sanitarios del plano general se dibujan con muro perimetral negro de mayor grosor, sin el doble contorno interior anterior.
- Puertas, ventanas y salidas generan un corte visual en el muro negro antes de dibujar la abertura.
- Las hojas de puerta y ventanas se dibujan con trazo mas fino que el muro para diferenciar claramente pared y abertura.
- Se agrego forma `L`, volver a `Rectangular`, `+ Vertice` y `- Vertice` en aulas/espacios y sanitarios seleccionados.
- Cuando un aula/espacio o sanitario tiene forma poligonal, sus vertices se muestran como manijas numeradas y pueden arrastrarse desde el plano.
- Version y cache actualizados a `v2.6.21`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor HTTP local embebido en `127.0.0.1:8037`: `index.html`, `assets/js/mec-form.js` y `sw.js` servidos correctamente con version/cache `v2.6.21`, muros/cortes y herramientas de vertices.

## Sesion de cinta compacta de herramientas del plano - 2026-05-18 - v2.6.20

### Objetivo
- Organizar inteligentemente los botones del plano para reducir desorden, espacio ocupado y acciones repetidas.
- Agrupar herramientas en una cinta tipo Excel con secciones claras e iconos relacionados.

### Cambios implementados
- La barra larga del plano se reemplazo por una cinta compacta con pestanas: `Editar`, `Insertar`, `Vista`, `Capas` y `Exportar`.
- `Editar` agrupa mover, deshacer, rehacer, bloquear/desbloquear, eliminar y orientacion/giro/volteo.
- `Insertar` agrupa aulas, otros espacios, sanitarios y elementos exteriores/tecnicos.
- `Vista` agrupa zoom, pantalla completa y base mapa.
- `Capas` concentra los interruptores de visibilidad del plano.
- `Exportar` concentra JSON, DXF, SVG, PNG y PDF.
- Se agregaron iconos compactos en los botones principales y se redujo el texto visible para recuperar alto util del plano.
- El panel de seleccion dejo de repetir acciones que ahora pertenecen a la cinta principal.
- Version y cache actualizados a `v2.6.20`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8035 --bind 127.0.0.1`: `index.html`, `assets/js/config.js`, `assets/js/mec-form.js`, `assets/css/mec-form.css` y `sw.js` servidos correctamente con version/cache `v2.6.20` y clases `school-plan-ribbon`.
- Selenium/Chrome headless local: cinta visible en `Registro guiado` con pestanas `Editar`, `Insertar`, `Vista`, `Capas` y `Exportar`; acciones de edicion e insercion renderizadas sin errores graves.

## Sesion de giro tipo Word en plano - 2026-05-18 - v2.6.19

### Objetivo
- Agregar acciones rapidas de rotacion y volteo estilo Word para elementos seleccionados del plano.

### Cambios implementados
- La barra visible del plano incorpora `Rotar der. 90`, `Rotar izq. 90`, `Voltear H` y `Voltear V` junto a `Horizontal` y `Vertical`.
- Las acciones funcionan sobre bloque, piso, aula/espacio, sanitario, elementos exteriores/tecnicos y objetos internos rotables.
- `Rotar der. 90` y `Rotar izq. 90` aplican giros incrementales de 90 grados.
- `Voltear H` y `Voltear V` reflejan la orientacion del elemento seleccionado sobre el eje horizontal o vertical mediante su angulo de giro.
- Las acciones respetan bloqueos existentes.
- Version y cache actualizados a `v2.6.19`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8034 --bind 127.0.0.1`: `index.html`, `assets/js/config.js`, `assets/js/mec-form.js` y `sw.js` servidos correctamente con version/cache `v2.6.19`, botones `Rotar der. 90`, `Rotar izq. 90`, `Voltear H` y `Voltear V`.

## Sesion de botones visibles de orientacion - 2026-05-18 - v2.6.18

### Objetivo
- Hacer visibles los botones de orientacion rapida en la barra de herramientas principal del plano.

### Cambios implementados
- Se agregaron `Horizontal` y `Vertical` junto a las acciones visibles del plano, en la misma zona de `Mover elementos`, exportaciones, deshacer/rehacer, bloqueo y eliminacion.
- Los botones quedan visibles aunque no haya seleccion; se desactivan hasta seleccionar un elemento orientable.
- Al seleccionar bloque, piso, aula/espacio, sanitario, exterior/tecnico u objeto interno, los botones se habilitan y aplican orientacion inmediata a `0` o `90` grados.
- Version y cache actualizados a `v2.6.18`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8033 --bind 127.0.0.1`: `index.html`, `assets/js/config.js`, `assets/js/mec-form.js` y `sw.js` servidos correctamente con version/cache `v2.6.18`, botones visibles `Horizontal`/`Vertical` y estado deshabilitado sin seleccion.

## Sesion de orientacion rapida de elementos - 2026-05-18 - v2.6.17

### Objetivo
- Agregar una forma agil de orientar elementos del plano en horizontal o vertical sin depender del arrastre fino de la manija de giro.

### Cambios implementados
- El panel del elemento seleccionado ahora muestra botones `Horizontal` y `Vertical`.
- La orientacion horizontal fija el elemento en `0` grados y la vertical en `90` grados.
- La accion funciona para bloques, pisos, aulas/espacios, sanitarios, elementos exteriores/tecnicos y objetos internos de aulas o sanitarios que admiten giro.
- La orientacion rapida respeta bloqueos existentes y avisa si el elemento seleccionado no se puede girar.
- Version y cache actualizados a `v2.6.17`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8032 --bind 127.0.0.1`: `index.html`, `assets/js/config.js`, `assets/js/mec-form.js` y `sw.js` servidos correctamente con version/cache `v2.6.17` y acciones `Horizontal`/`Vertical`.

## Sesion de arrastre directo de exteriores - 2026-05-18 - v2.6.16

### Objetivo
- Corregir que elementos exteriores y tecnicos insertados, como tanques de agua, rampas, acometidas y medidores, no respondieran de forma confiable al arrastre o al redimensionamiento en el plano.

### Cambios implementados
- Los elementos exteriores ahora pueden arrastrarse directamente desde el plano, aun sin depender del modo `Mover elementos`.
- Las esquinas de elementos exteriores se detectan para redimensionar incluso cuando el elemento no habia quedado seleccionado previamente.
- La deteccion de clic sobre exteriores usa el contorno rotado del elemento para coincidir con lo que se ve en pantalla.
- El movimiento y redimensionamiento interactivo de exteriores ya no se revierte por reglas de no solape contra bloques, pisos u otros objetos; solo se limita al area del canvas.
- Tanque, rampa, escalera, acometida, medidor, tablero, puesta a tierra, galeria, caminero, espacio libre, pilar, pozo y recreacion mantienen sincronizacion de medidas al estirarse.
- Version y cache actualizados a `v2.6.16`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8031 --bind 127.0.0.1`: `index.html`, `assets/js/config.js` y `sw.js` servidos correctamente con version/cache `v2.6.16`.

## Sesion de cuestionario guiado obligatorio - 2026-05-18 - v2.6.15

### Objetivo
- Convertir el `Registro guiado` en una secuencia de preguntas una a una, bloqueando el avance hasta responder o completar la accion requerida.
- Hacer que respuestas como cantidad de aulas, rampa/escalera, acometida, medidor, tablero, puesta a tierra, sanitarios y exteriores disparen la creacion/configuracion inmediata del elemento en el plano.
- Mantener el plano como centro operativo y reducir la botonera masiva en las etapas de carga tecnica.

### Cambios implementados
- Las etapas `Bloques y pisos`, `Aulas y espacios`, `Sanitarios` y `Exteriores` ahora muestran una pregunta activa segun el estado real del borrador.
- El avance con `Siguiente` o con la barra de etapas queda bloqueado si la pregunta activa todavia no fue respondida o confirmada.
- En bloques se agrego secuencia tecnica: crear/medir bloque, ubicarlo, decidir piso, completar piso, responder escalera/rampa, acometida, medidor, tablero, llave termomagnetica y puesta a tierra.
- En aulas se pide primero `Cuantas aulas tiene este bloque/piso`; la app inserta aulas una a una y exige confirmar medidas, posicion y ficha antes de continuar.
- En sanitarios se pregunta si existe sanitario en el bloque/piso; si existe, se exige configurar dimensiones, posicion y ficha antes de avanzar.
- En exteriores se pregunta si hay elementos exteriores/tecnicos; cada elemento incorporado queda pendiente hasta ubicarse y confirmar ficha.
- Se guardan respuestas guiadas, cantidades objetivo y confirmaciones por bloque/piso en el estado local del registro guiado.
- Las etapas secuenciadas ocultan la botonera masiva y usan una tarjeta compacta de pregunta activa.
- Version y cache actualizados a `v2.6.15`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Servidor local `py -3 -m http.server 8029 --bind 127.0.0.1`: `index.html`, `assets/js/config.js` y `assets/js/guided-register.js` servidos correctamente con version `v2.6.15`, `_activeGuidedQuestion`, `saveClassroomTarget` y `Pregunta obligatoria`.

## Sesion de edicion total de elementos en plano - 2026-05-18 - v2.6.14

### Objetivo
- Corregir que rampa, acometida y otros elementos exteriores/tecnicos se insertaran pero no se pudieran mover o redimensionar con fluidez.
- Hacer que el doble clic abra la ficha emergente de cualquier elemento del plano, incluyendo manijas de giro/redimensionamiento y objetos internos.
- Reducir el espacio muerto de la bandeja del registro guiado para que el plano quede mas cerca y con mayor protagonismo.

### Cambios implementados
- Los elementos tecnicos que naturalmente se adosan al bloque, como rampa, escalera, acometida, medidor, tablero, puesta a tierra, galeria, caminero y pilar, ya no quedan bloqueados por la regla de no solape contra la estructura principal.
- Rampa y acometida pueden moverse sobre/junto al bloque y redimensionarse desde sus esquinas sin ser devueltos automaticamente a la posicion anterior.
- Acometida, medidor, tablero y puesta a tierra ahora guardan largo/ancho visibles en ficha y los sincronizan cuando se estiran desde el plano.
- El doble clic del plano se unifico para abrir la ficha correcta de bloques, pisos, aulas, sanitarios, exteriores, objetos internos y tambien cuando el clic cae sobre una manija.
- La tarjeta activa del `Registro guiado` ahora ajusta su altura al slide visible y deja de reservar alto por slides ocultos.
- Se compacto la grilla de acciones/checks del registro guiado para reducir el espacio en blanco antes de `Plano vivo`.
- Version y cache actualizados a `v2.6.14`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Chrome headless local con servidor HTTP interno: UI visible en `v2.6.14`, bandeja guiada ajustando altura al slide activo y sin errores graves de consola.

## Sesion de redimensionamiento universal en plano - 2026-05-17 - v2.6.13

### Objetivo
- Lograr que bloque, piso, aulas/espacios, sanitarios, exteriores y objetos internos puedan modificar ubicacion y tamano desde el plano.
- Mostrar medidas visibles al seleccionar aulas, sanitarios, exteriores y objetos con dimensiones.

### Cambios implementados
- El boton de movimiento del plano pasa a `Mover elementos`, porque ahora arrastra bloques, pisos, aulas/espacios, sanitarios, exteriores y objetos internos.
- Aulas/espacios, sanitarios y elementos exteriores muestran guias de largo/ancho al seleccionarse.
- Puertas, ventanas, pizarrones, tableros, textos, escaleras, cabinas y artefactos sanitarios visibles en el plano reciben seleccion propia, etiqueta de medidas y manijas de redimensionamiento cuando corresponde.
- Se agrego movimiento directo desde el plano general para objetos internos de aulas y sanitarios, respetando bloqueos y fichas existentes.
- Se agrego redimensionamiento desde el plano general para objetos internos rectangulares de aulas y sanitarios, sincronizando la ficha y el croquis interno.
- Los artefactos sanitarios directos como inodoro, urinario, lavamanos y cisternas se dibujan y pueden seleccionarse/moverse/redimensionarse en el plano del sanitario integrado.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local con servidor HTTP interno: app visible con sesion admin, version de UI `v2.6.13`, `data-school-plan-canvas` renderizado, boton `Mover elementos` presente y sin errores graves de consola.

## Sesion de redimensionamiento robusto y posicionamiento extendido - 2026-05-17 - v2.6.12

### Objetivo
- Corregir que las manijas de redimensionamiento funcionaran solo en bloques.
- Asegurar que pisos, aulas, sanitarios y elementos exteriores puedan ajustar dimensiones y ubicacion desde el plano.
- Incorporar pozo/captacion como elemento exterior ubicable, configurable y redimensionable.

### Cambios implementados
- Las manijas de pisos, aulas y sanitarios se vuelven a dibujar y registrar al final de cada render para quedar por encima de ambientes, aberturas y artefactos.
- Si un piso era virtual, al redimensionarlo o moverlo se materializa automaticamente como registro real dentro del bloque.
- El modo `Mover bloques` ahora tambien permite mover aulas/espacios y sanitarios desde el plano general.
- Las aulas/espacios sincronizan posicion, medidas y elementos hijos al moverse o redimensionarse desde el plano.
- Los sanitarios sincronizan posicion, medidas, cabinas y artefactos internos al moverse o redimensionarse desde el plano.
- Los elementos exteriores mantienen ajuste de posicion y dimensiones con ratios dinamicos; se reforzo el soporte para tanque, galeria, espacio libre, recreacion, pilar, escalera, rampa y demas elementos.
- Se agrego el elemento exterior `Pozo / captacion`, con boton, icono, ficha emergente, campos tecnicos, dibujo en plano y redimensionamiento por esquinas.
- Version y cache actualizados a `v2.6.12`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

## Sesion de redimensionamiento por vertices - 2026-05-17 - v2.6.11

### Objetivo
- Permitir que bloques, pisos, aulas, sanitarios y elementos exteriores cambien de tamano directamente desde el plano.
- Hacer que el usuario pueda ajustar medidas tirando desde cualquier esquina visible del elemento seleccionado.

### Cambios implementados
- Se agregaron manijas de esquina al seleccionar bloques, pisos, aulas/espacios, sanitarios y elementos exteriores.
- El arrastre de una esquina actualiza geometria visible, posicion, largo/ancho y ficha asociada segun el tipo de elemento.
- Los bloques guardan tambien proporcion visual del plano para que el estiramiento no se pierda al redibujar.
- Los pisos guardan proporcion dentro del bloque, largo, ancho y posicion relativa.
- Aulas y sanitarios sincronizan su rectangulo interno de croquis, medidas y elementos hijos al redimensionarse desde el plano general.
- Elementos exteriores como tanque, recreacion, galeria, caminero, espacio libre, pilar, escalera y rampa actualizan ratios y medidas desde el arrastre.
- Se mantuvieron bloqueos: elementos bloqueados no pueden redimensionarse hasta ser desbloqueados.
- Se ajusto el ancho logico dinamico tambien para movimientos y nuevas ubicaciones exteriores, evitando volver a depender de 900 px fijos.
- Version y cache actualizados a `v2.6.11`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

## Sesion de guia de relevamiento por bloque y piso - 2026-05-17 - v2.6.10

### Objetivo
- Hacer que el registro guiado se comporte desde el inicio como una guia operativa de relevamiento.
- Ordenar la carga de bloques en una secuencia obligatoria: medir bloque, ubicarlo en el plano, completar ficha y luego decidir si se grafica un piso.
- Exigir que aulas, sanitarios y espacios se construyan sobre pisos previamente incorporados al bloque.

### Cambios implementados
- La etapa `Bloques y pisos` ahora muestra una tarjeta dinamica de `Paso sugerido` segun el estado real del borrador.
- Si no hay bloque, la guia solicita `Iniciar bloque` y abre automaticamente la ficha para cargar largo, ancho, estado y observaciones.
- Al guardar la ficha del bloque con medidas, si todavia no fue ubicado, se activa `Mover bloques` y queda seleccionado para arrastrarlo en el plano.
- Se agrego la accion `Ubicar bloque` para activar posicionamiento directo desde el flujo guiado.
- Se agrego la accion guiada `Piso`: si no hay piso lo crea, y si ya existe abre la ficha del piso pendiente.
- La guia distingue entre bloque sin medidas, bloque sin ubicacion, pregunta de existencia de piso, piso sin medidas y bloque listo para ambientes.
- `Registro guiado` marca la etapa `Bloques y pisos` como lista solo cuando el bloque tiene medidas, ubicacion y pisos existentes completos.
- Version, cache y textos de edicion actualizados a `v2.6.10`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

## Sesion de bloques sin piso automatico y pisos editables - 2026-05-17 - v2.6.9

### Objetivo
- Evitar que un bloque nuevo nazca con un piso por defecto.
- Permitir que cada piso se incorpore explicitamente dentro del bloque y sea ubicable/editable en el plano.
- Hacer visibles y editables las medidas del bloque y del piso desde fichas emergentes.

### Cambios implementados
- `Nuevo bloque` ahora crea bloques con `0` pisos integrados y `floors: []`.
- La cantidad de pisos/plantas permite valor `0`; se actualizo el texto del esquema para indicar que los pisos se agregan desde el plano.
- Se agrego la accion `+ Piso` en `Registro guiado`, en Aulas/Espacios, Sanitarios y en el arbol del plano.
- Los pisos ahora son registros propios del bloque, con id, nombre, largo, ancho, posicion relativa, rotacion y ficha emergente.
- El plano permite seleccionar pisos, abrir su ficha, girarlos, eliminarlos y moverlos dentro del bloque con `Mover bloques` activo.
- La ficha emergente del bloque permite editar estado, largo, ancho, rotacion y observacion sin abandonar el plano.
- La ficha emergente del piso permite editar nombre, largo, ancho, posicion X/Y y rotacion.
- Se bloquea la creacion de aulas, otros espacios y sanitarios si el bloque activo todavia no tiene un piso incorporado.
- El canvas muestra `Bloque sin pisos` cuando corresponde y marca dimensiones del bloque/piso al seleccionarlos.
- Version y cache actualizados a `v2.6.9`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

## Sesion de registro guiado con plano inmediato - 2026-05-17 - v2.6.8

### Objetivo
- Eliminar la franja superior redundante marcada como zona 1 en la revision visual.
- Mover la solicitud activa del registro guiado desde debajo del plano hacia la zona 3, inmediatamente antes de `Plano vivo`.

### Cambios implementados
- Se elimino del DOM la cabecera amplia `Registro guiado sobre plano unico` junto con sus botones superiores redundantes.
- Se elimino del DOM la fila superior de KPIs `Bloques`, `Aulas`, `Otros`, `Sanitarios`, `Exteriores` y `Fotos`; esos indicadores ya quedan resumidos dentro del panel lateral compacto del plano.
- La bandeja de preguntas/acciones de la etapa activa ahora se renderiza antes del panel `Plano vivo`, ocupando la zona de trabajo superior solicitada.
- La barra de etapas, la banda de progreso y la tarjeta activa se compactaron para ocupar menos alto y dejar mas vista disponible al plano.
- Se redujeron tamaños de texto, padding, altura de checks y botones del registro guiado.
- Version y cache actualizados a `v2.6.8`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/mec-form.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Revision estatica: `guided-register__header` y `guided-summary` ya no se renderizan en `assets/js/guided-register.js`; `guided-deck` queda antes de `guided-plan-panel`.

## Sesion de plano con herramientas compactas - 2026-05-17 - v2.6.7

### Objetivo
- Ganar espacio util para el plano reduciendo el impacto visual de KPIs y botoneras.
- Mantener siempre visibles los elementos ubicables en el plano dentro del flujo guiado.

### Cambios implementados
- Los KPIs del plano se redujeron a indicadores basicos y se movieron al panel lateral compacto: area, bloques, aulas, otros, sanitarios, exteriores y alertas.
- Se elimino la tira grande de KPIs debajo del plano para liberar alto de vista.
- Se agrego una fila permanente `Elementos` debajo de la barra de acciones del plano, con accesos rapidos a tanque, recreacion, galeria, caminero, espacio libre, pilar, escalera, rampa, acometida, medidor, tablero y puesta a tierra.
- La fila de elementos usa botones compactos con desplazamiento horizontal controlado cuando la pantalla no alcanza.
- La barra de acciones del plano y los botones de base mapa/exportacion se densificaron con menor texto, menor padding y menor altura.
- En `Registro guiado`, el panel lateral del plano queda mas estrecho y el canvas recupera mas alto util.
- Version y cache actualizados a `v2.6.7`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/mec-form.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Revision estatica de estructura: `sideKpis`, `school-plan__tools-row`, `mec-sketch-toolset--compact` y version `v2.6.7` presentes en los archivos esperados.

## Sesion de elementos automaticos desde respuestas - 2026-05-17 - v2.6.6

### Objetivo
- Hacer que respuestas tecnicas del bloque creen automaticamente elementos ubicables en el plano.
- Mantener el plano como protagonista del registro guiado y mover las solicitudes de carga debajo del tablero.

### Cambios implementados
- Al responder `Circulacion vertical principal` con `Escalera`, `Rampa` o `Ambas`, la app crea automaticamente el elemento correspondiente en torno al bloque activo.
- Al registrar acometida, medidor/punto de medicion, tablero electrico del bloque o puesta a tierra, la app crea automaticamente su elemento tecnico en el plano.
- Los nuevos elementos automaticos quedan vinculados al bloque y al campo que los genero mediante `autoSource`.
- Si la respuesta cambia a una opcion que ya no requiere el elemento, se eliminan solo los elementos creados automaticamente desde esa respuesta para evitar duplicados o elementos fantasma.
- Cada elemento automatico abre ficha emergente propia para completar caracteristicas, medidas, estado, nota (i), observacion y fotos.
- Se agregaron nuevos tipos movibles en el plano: `Escalera de bloque`, `Rampa de bloque`, `Acometida / punto de ingreso`, `Medidor / punto de medicion`, `Tablero electrico del bloque` y `Puesta a tierra`.
- Se agregaron iconos canvas diferenciados para escalera, rampa, medidor, acometida, tablero y puesta a tierra.
- `Registro guiado` ahora coloca el plano vivo antes de la bandeja de solicitudes, con panel sticky, para mantener el plano fijo y las preguntas/acciones debajo.
- Version y cache actualizados a `v2.6.6`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/mec-form.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Revision estatica contra `assets/js/mec-schema.js`: campos `tipo_circulacion`, `acometida_tipo`, `medidor_estado`, `tablero_estado` y `puesta_tierra` confirmados con las opciones usadas por la creacion automatica.
- Intento de validacion headless/CDP bloqueado por el runner local al comunicarse con el proceso del navegador; queda pendiente una pasada visual manual en la app publicada.

## Sesion de sidebar agil y plano a ancho completo - 2026-05-16 - v2.6.5

### Objetivo
- Hacer que el panel lateral izquierdo se oculte mas rapido al retirar el cursor.
- Lograr que la zona cuadriculada del plano cubra todo el ancho util del area de dibujo.

### Cambios implementados
- Se redujo el retardo de ocultado automatico del sidebar de `360ms` a valores cortos entre `70ms` y `110ms`, con salida inmediata en resize.
- El plano general ahora calcula el ancho logico del canvas segun el ancho disponible del contenedor activo, manteniendo un minimo de `900px`.
- La cuadrilla del plano se dibuja dentro del canvas con `_drawSchoolPlanGrid()`, no solo como fondo CSS del contenedor.
- El canvas y la capa de base mapa usan el mismo ancho logico dinamico para evitar franjas sin cuadricula dentro del area destinada al plano.
- Se agrego recalculo del plano al redimensionar la ventana.
- Version y cache actualizados a `v2.6.5`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check assets/js/mec-form.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local en `1414px`: version `2.6.5`, canvas logico expandido a `1319px`, cobertura de cuadricula sobre el ancho del plano `> 1.0`, sin franja derecha vacia y sin errores graves de consola.
- Selenium/Chrome headless local: sidebar emerge desde la zona caliente y queda oculto nuevamente antes de `160ms` al retirar el cursor del area lateral.

## Sesion de correccion de solape en etapa guiada - 2026-05-16 - v2.6.4

### Objetivo
- Resolver el solapamiento visual entre la etiqueta de etapa, el titulo y el resumen dentro de las tarjetas del `Registro guiado`.

### Cambios implementados
- El resumen de cada slide ahora usa la clase especifica `guided-slide__summary`.
- Se reemplazo la regla generica `.guided-slide p`, que tambien afectaba a `guided-slide__kicker` y enviaba ambos textos al mismo lugar de la grilla.
- La etiqueta de etapa, el titulo, el resumen, los checks y las acciones vuelven a ocupar areas independientes.
- Version y cache actualizados a `v2.6.4`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local en `1280px`: etapa `Revision y salida` activa, areas `kicker`, `title`, `summary`, `checks` y `actions` separadas, sin colisiones visuales ni errores graves de consola.

## Sesion de navegacion de gestion y franja sin solapes - 2026-05-16 - v2.6.3

### Objetivo
- Mantener `Registro guiado` como experiencia principal sin perder accesos operativos a mapa, usuarios y resultados globales.
- Corregir solapamientos en la franja superior del registro guiado.

### Cambios implementados
- El sidebar vuelve a mostrar accesos principales: `Registro guiado`, `Mapa`, `Usuarios` y `Resultados globales`, respetando roles.
- `Registro guiado` sigue siendo la vista inicial al cargar la app.
- La franja superior del flujo guiado pasa de tres columnas rigidas a dos zonas flexibles: contexto/checks y botones.
- Se redujeron minimos rigidos, se permitio envoltura automatica y se agrego `min-width: 0`/`overflow-wrap` para evitar textos o botones montados.
- El encabezado del registro guiado ahora se apila antes en tabletas para que la botonera no invada el titulo ni el resumen.
- Version y cache actualizados a `v2.6.3`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: version `2.6.3`, sidebar con `Registro guiado`, `Mapa`, `Usuarios` y `Resultados globales`, plano debajo a ancho completo y franja superior sin botones fuera del slide.
- Selenium/Chrome headless local en anchos tipo tablet/movil (`900px` y `740px`): 7 etapas revisadas, incluidos `Aulas y espacios` y `Sanitarios`, sin solapes ni errores graves de consola.

## Sesion de plano protagonista en registro guiado - 2026-05-16 - v2.6.2

### Objetivo
- Reubicar la tarjeta de etapa del `Registro guiado` arriba del plano para que el plano gane ancho y protagonismo en vista horizontal.

### Cambios implementados
- El bloque de etapa tipo slide ya no queda como columna izquierda; ahora funciona como franja superior compacta.
- La franja superior organiza descripcion, checks y botones en una sola banda horizontal en escritorio.
- El plano vivo queda debajo a ancho completo, con mas espacio horizontal para dibujo, revision y seleccion.
- En pantallas angostas la etapa vuelve a apilarse en una columna para evitar solapamientos tactiles.
- Se amplio la altura util del canvas dentro del registro guiado hasta `min(64vh, 720px)`.
- Version y cache actualizados a `v2.6.2`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: version `2.6.2`, etapa arriba del plano, plano debajo a ancho completo, `nearFullWidth: true`, sidebar solo con `Registro guiado`.

## Sesion de concentracion en registro guiado - 2026-05-16 - v2.6.1

### Objetivo
- Hacer que `Registro guiado` sea la experiencia principal de la app y reducir las demas vistas a soporte interno.
- Evitar que la app cree o muestre un bloque por defecto antes de que el usuario pulse `Nuevo bloque`.

### Cambios implementados
- `Registro guiado` ahora es la vista inicial despues del login y tambien al volver a la app instalada/PWA.
- El navegador lateral queda concentrado en `Registro guiado`; los demas modulos siguen disponibles solo como soporte invocado desde el flujo cuando haga falta.
- `_ensureBlocks()` ya no crea automaticamente `Bloque 1`; si no hay bloques mantiene el modelo vacio.
- Al eliminar el ultimo bloque, el proyecto queda sin bloque activo en lugar de generar uno nuevo automaticamente.
- El plano vacio ya no dibuja un contenedor `Sin bloque`; muestra el mensaje para iniciar con `Nuevo bloque`.
- El flujo guiado impide crear aulas, sanitarios o elementos internos si todavia no existe un bloque, y lleva al usuario a la etapa `Bloques y pisos`.
- `Guardar bloque` avisa correctamente cuando no hay ningun bloque creado.
- Version y cache actualizados a `v2.6.1`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: arranque directo en `module-registro`, sidebar solo con `Registro guiado`, version `2.6.1`, borrador vacio con 0 bloques, `__activeBlockId` vacio y plano sin contenedor por defecto.

## Sesion de registro guiado secuencial - 2026-05-16 - v2.6.0

### Objetivo
- Reconstruir la experiencia de carga para que el usuario avance en una secuencia ordenada tipo slides.
- Mantener un unico plano vivo como punto de partida, de modo que bloques, aulas, sanitarios, exteriores y evidencias se vayan incorporando durante el recorrido.
- Reducir saltos mentales entre vistas y priorizar botones de accion rapida por encima de listas o navegacion dispersa.

### Cambios implementados
- Se agrego el modulo principal `Registro guiado` al navegador lateral, ubicado como flujo operativo central despues de `Mapa`.
- Se creo `assets/js/guided-register.js`, una nueva capa de experiencia con 7 slides horizontales: Escuela y jornada, Predio base, Bloques y pisos, Aulas y espacios, Sanitarios, Exteriores, Revision y salida.
- Cada slide incorpora botones directos para acciones reales del motor existente: crear bloque, guardar bloque, crear aula, agregar otro espacio, aberturas, tomas, tableros, luces, ventiladores, aires, daño/observacion, sanitario, cabina, artefactos sanitarios, tanque, recreacion, galeria, caminero, espacio libre, pilar, validar, PDF, DXF y JSON.
- La vista mantiene visible el plano unico con `data-school-plan-root`, reutilizando `MecFormModule.renderSchoolPlan()` para no duplicar el motor de geometria, fichas, bloqueo, zoom, base mapa ni exportaciones.
- Se agregaron KPIs compactos del flujo guiado: bloques, aulas, otros espacios, sanitarios, exteriores y fotos detectadas desde el borrador local.
- Se agrego navegacion horizontal con botones `Anterior`/`Siguiente`, barra de progreso, selector de etapas y gesto de arrastre lateral sobre el deck.
- En Inicio se agrego acceso destacado a `Registro guiado`.
- Version, cache y App Shell actualizados a `v2.6.0`; el Service Worker ya incluye `assets/js/guided-register.js`.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/app.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: version `2.6.0`, modulo activo `module-registro`, sidebar con `Registro guiado`, 7 slides, 6 tarjetas de resumen, barra de progreso y canvas vivo `school-plan-canvas` renderizado en `guided-school-plan-root`.

### Proximos pasos
- Probar en tablet Android y iPad el desplazamiento horizontal, botones tactiles y plano sticky.
- Ajustar el orden fino de campos internos de cada ficha para que cada slide cubra exactamente el protocolo de campo definitivo.
- Convertir progresivamente mas preguntas del MEC tradicional en tarjetas/botones dentro del flujo guiado.

## Sesion de pestana arquitectura del proyecto - 2026-05-13 - v2.5.67

### Objetivo
- Reordenar el boton `Otros espacios` para que aparezca antes de `Plano escuela`.
- Agregar una vista principal que explique con un diagrama claro como funciona CIALPA, que herramientas vincula, donde guarda los datos y que controles de seguridad aplica.

### Cambios implementados
- En la barra de etapas del cuestionario MEC, `Otros espacios` y `Exteriores` ahora se insertan justo antes de `Plano escuela`.
- Se agrego el modulo principal `Arquitectura proyecto` al navegador lateral.
- La nueva vista incluye un flujo detallado de 7 capas: campo, PWA CIALPA, registro arquitectonico, persistencia local, sincronizacion, repositorios y gestion/decision.
- Se agrego una tabla de almacenamiento real: `sessionStorage: cialpa_session`, `localStorage: cialpa_mec_form_draft_v1`, `IndexedDB: cialpa_offline_store`, cache offline, Google Apps Script, Google Sheets y Google Drive.
- Se documentaron herramientas vinculadas: GitHub Pages, Service Worker, Apps Script, Sheets, Drive, Leaflet/OSM, Canvas/SVG/DXF/PDF.
- Se incorporo bloque de seguridad con roles, expiracion de sesion, HTTPS, lista blanca admin y advertencia de que el backend debe validar permisos.
- Se agrego hoja de ruta de escalamiento para 6000 escuelas, incluyendo BigQuery como repositorio analitico recomendado para la etapa nacional.
- Version y cache actualizados a `v2.5.67`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: version `2.5.67`, pestaña `Arquitectura proyecto` activa, 7 nodos de diagrama, 7 filas de tabla de almacenamiento, 4 hitos de hoja de ruta, textos de seguridad y datos presentes.
- Selenium/Chrome headless local: orden MEC verificado como `General`, `Servicios`, `Bloques y Plantas`, `Aula`, `Sanitarios`, `Otros espacios`, `Exteriores`, `Plano escuela`.

### Proximos pasos
- Revisar con el equipo si la vista debe imprimirse como anexo tecnico del proyecto.
- Definir el diseno final de sincronizacion hacia BigQuery y repositorio masivo de fotos para la escala de 6000 escuelas.

---

## Sesion de implantacion guiada, tiempos y base de calles - 2026-05-13 - v2.5.66

### Objetivo
- Reemplazar la base satelital del plano por una referencia opcional de calles y lineas, sin imagen de arboles ni ortofoto.
- Llevar la implantacion del bloque al momento de cargar `Bloques y Plantas`, para que dimensiones, escalera y electricidad se registren con referencia visual.
- Agregar controles rapidos para otros espacios/exteriores, salida de sesion visible y medicion de tiempos de registro.
- Corregir logica de cercado y reducir formularios a una sola columna.

### Cambios implementados
- `Plano escuela` ahora usa `PLAN_BASEMAP_TILE_URL` con OpenStreetMap HOT como base de calles/lineas; el boton quedo como `Calles/lineas` y sigue siendo opcional.
- En la etapa `Bloques y Plantas` se embebe el plano del predio para implantar/mover el bloque activo mientras se cargan identificacion, dimensiones, escalera y electricidad.
- Se agregaron botones rapidos `Otros espacios` y `Exteriores` junto a las etapas del cuestionario, ademas de acciones directas para cantina, biblioteca, tinglado y cancha en el constructor del plano.
- Se agrego boton fijo `Salir` en la cabecera y boton `Cerrar sesion` en el pie del sidebar.
- Se incorporo registro de tiempos en `__registroTiempos` para bloques, ambientes/aulas, sanitarios y elementos exteriores; `Guardar bloque`, `Guardar ambiente`, `Guardar sanitario` y `Guardar ficha` cierran el tiempo y muestran la duracion.
- `Tipo de cercado` solo aparece cuando hay cercado; `Observaciones del cercado` queda visible tambien cuando no hay cercado.
- El cuestionario principal, grupos sanitarios y fichas redujeron sus grids de campos a una sola columna para mejorar uso en tablet.
- Tanques de agua incorporan diametro/ancho, altura y huella aproximada, recalculando el tamano del dibujo desde la ficha igual que otros exteriores.
- Las fichas emergentes de sanitarios, cabinas, objetos sanitarios, ambientes, objetos de croquis y exteriores incluyen eliminacion interna.
- El movimiento de bloques y elementos exteriores en plano general evita solaparse con otros bloques/exteriores; el redimensionado de ambientes evita invadir aulas o sanitarios del mismo piso.
- Version y cache actualizados a `v2.5.66`.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/mec-schema.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: version `2.5.66`, base mapa con `tile.openstreetmap.fr/hot`, sin `World_Imagery`, botones `Otros espacios` y `Exteriores` visibles, boton fijo `Salir` visible, plano embebido `900 x 620`, cuestionario en una columna, `cercado_tipo` oculto con `No`, `cercado_observacion` visible y `Guardar bloque` registrando `__registroTiempos.items[{ kind: "bloque" }]`.

### Proximos pasos
- Probar en tablet Android/iPad el flujo completo: crear bloque, implantarlo, completar electricidad, agregar aula/sanitario/exterior y cerrar tiempos con los botones de guardar.
- Conectar `__registroTiempos` al futuro tablero de planificacion para estimar tiempo restante por escuela, censista y lote de escuelas.
- Definir si los exteriores tambien necesitan manijas de redimensionado directo en canvas, ademas de las dimensiones por ficha.

---

## Sesion de base mapa satelital calibrable - 2026-05-13 - v2.5.65

### Objetivo
- Permitir que la zona de trazado del `Plano escuela` use una imagen satelital como fondo cuando la escuela tenga coordenadas, ajustando centro, escala, opacidad y desplazamiento antes de confirmar con `Guardar base mapa`.

### Cambios implementados
- Se agrego la configuracion `__planBaseMap` al borrador local: latitud, longitud, zoom satelital, escala, opacidad, desplazamiento X/Y, fecha de guardado y confirmacion.
- El canvas del plano ahora puede mostrar teselas satelitales Esri detras del dibujo, sin contaminar el canvas ni bloquear la exportacion vectorial.
- Nuevo grupo de botones en el plano: `Satelite`, `Base mapa` y `Guardar base mapa`.
- Nuevo panel emergente de calibracion con inputs de latitud/longitud, zoom, escala, opacidad, flechas de desplazamiento, centrado y boton para usar las coordenadas de la escuela.
- Se muestra una metrica operativa de cobertura aproximada en metros y metros por pixel para ayudar a construir el plano sobre dimensiones reales aproximadas.
- El exportador JSON del plano ahora incluye `baseMap`; el SVG general puede incluir la base satelital como referencias externas a teselas.
- El mapa Leaflet reutiliza la URL satelital centralizada en `APP_CONFIG`.
- Version y cache actualizados a `v2.5.65`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/map.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.
- Selenium/Chrome headless local: con coordenadas `-25.287900, -57.635200`, el plano renderizo 48 teselas satelitales, mostro cobertura aprox. `486 x 335 m - 0.54 m/px` y `Guardar base mapa` persistio `confirmed: true` con desplazamiento ajustado.

### Proximos pasos
- Probar en tablet con una escuela real: abrir `Plano escuela`, activar `Satelite`, ajustar la imagen hasta que coincida con el predio y confirmar con `Guardar base mapa`.
- Definir si la version impresa PDF debe incluir una hoja adicional de ortofoto/base satelital o mantener solo el plano tecnico vectorial.

---

## Sesion de pilares, camineros y encastre exterior - 2026-05-12 - v2.5.64

### Objetivo
- Permitir que los pilares se registren como redondos o cuadrados.
- Agregar camineros como elemento exterior propio, editable y medible.
- Hacer que galerias, camineros y espacios exteriores puedan ajustarse por largo, ancho y rotacion, y se acomoden contra bloques, pisos, aulas o sanitarios del plano general.

### Cambios implementados
- Se agrego el tipo `Caminero` al selector de exteriores y al arbol del plano general.
- La ficha de `Pilar` ahora permite elegir `Redondo` o `Cuadrado`, cargar diametro/lado y reflejar esa forma en el dibujo.
- Las fichas de galerias, camineros y espacios libres incorporan largo, ancho, superficie calculada y ubicacion relativa respecto a bloques/aulas.
- Al guardar la ficha se recalcula automaticamente el tamaño grafico segun medidas y rotacion cargadas.
- Al arrastrar exteriores estructurales, el plano ahora hace snap contra bordes interiores/exteriores de bloques, pisos, aulas y sanitarios para facilitar el tope.
- Version y cache actualizados a `v2.5.64`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- `osacompile -l JavaScript` sobre `mec-form.js`, `app.js`, `config.js` y `sw.js` sin errores.
- `node --check` no se ejecuto porque `node` no esta instalado en esta maquina.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; version visible `v2.5.64`, cache `cialpa-app-v2.5.64` y funciones `walkway`, `forma_pilar` y `_snapSiteElementRectToTargets` presentes.

---

## Sesion de rotacion en editores internos y etiquetas de ambientes - 2026-05-12 - v2.5.63

### Objetivo
- Permitir girar elementos dentro del editor de aulas/ambientes y del editor de sanitarios.
- Evitar que bibliotecas, tinglados, cantinas u otros espacios aparezcan rotulados como `Aula`.

### Cambios implementados
- Se agrego manija circular de rotacion en el elemento seleccionado dentro del croquis de ambientes y sanitarios.
- Se agregaron botones rapidos `Girar -15`, `Girar +15` y `0 grados` en los paneles emergentes de seleccion.
- La rotacion queda guardada en `rotationDeg` y `rotacion_grados` para objetos del croquis, ambiente activo y sanitario activo.
- Las etiquetas del croquis, fichas, bloqueos, eliminacion y estados ahora usan el tipo real del ambiente: biblioteca, tinglado, cantina, cancha, laboratorio, etc.
- Al regenerar la base de un ambiente se conserva la rotacion ya cargada.
- Version y cache actualizados a `v2.5.63`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- `osacompile -l JavaScript` sobre `mec-form.js`, `app.js`, `config.js` y `sw.js` sin errores.
- `node --check` no se ejecuto porque `node` no esta instalado en esta maquina.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; version visible `v2.5.63`, cache `cialpa-app-v2.5.63` y funciones de rotacion interna presentes.

---

## Sesion de rotacion integral y botones consolidados - 2026-05-12 - v2.5.62

### Objetivo
- Permitir girar bloques, aulas, sanitarios y otros espacios desde el plano general.
- Reforzar que bibliotecas, cantinas, tinglados, canchas y espacios especiales se carguen como ambientes editables tipo aula.
- Reducir botones repetidos en las acciones rapidas del plano.

### Cambios implementados
- Se agregaron manijas de rotacion para bloques, aulas/otros espacios y sanitarios; tambien quedan acciones rapidas `Girar -15`, `Girar +15` y `0 grados`.
- La rotacion se guarda como `rotationDeg` y `rotacion_grados`, y se conserva al exportar SVG y en las hojas PDF del plano.
- Se agrego `Cancha` al selector `+ Otro espacio`, junto con biblioteca, cantina, tinglado, area recreativa, laboratorio, direccion/administracion y deposito.
- Los hit areas, datos emergentes y guias de distancia toman en cuenta la rotacion para que la seleccion tactil coincida mejor con la figura visible.
- Se consolido el boton `+ Exterior` en un selector unico, evitando repetir acciones de tanque, galeria, pilar y espacios libres en cada contexto.
- Version y cache actualizados a `v2.5.62`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- `osacompile -l JavaScript` sobre `mec-form.js`, `app.js`, `config.js` y `sw.js` sin errores.
- `node --check` no se ejecuto porque `node` no esta instalado en esta maquina.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; version visible `v2.5.62`, cache `cialpa-app-v2.5.62` y funciones de rotacion/exportacion presentes.

---

## Sesion de espacios editables, rotacion por esquina y evidencias visibles - 2026-05-12 - v2.5.61

### Objetivo
- Permitir que las figuras de otros espacios puedan girarse desde una esquina, sin depender solo de botones de giro.
- Incorporar cantinas, bibliotecas, tinglados y otros ambientes especiales como espacios editables con la misma logica de aulas.
- Hacer visibles las fotos asociadas en fichas y datos emergentes del plano.

### Cambios implementados
- Se agrego un punto/manija de rotacion en la esquina de cada elemento de `Otros espacios` del plano general; al arrastrarlo gira la figura alrededor de su centro.
- El navegador del plano ahora separa por `Aulas`, `Sanitarios` y `Otros espacios` dentro de cada piso.
- Se agrego el selector `+ Otro espacio` con cantina, biblioteca, tinglado, area de recreacion, laboratorio, direccion/administracion y deposito.
- Los otros espacios se guardan como ambientes del bloque y piso, editables con el mismo croquis de aulas: paredes, puertas, ventanas, electricidad/equipos, texto, lapiz, fotos y ficha.
- El tanque de agua permanece como infraestructura especial del plano general, fuera del comportamiento de aula.
- Las fichas emergentes del plano muestran miniaturas de evidencias cuando la foto esta localmente disponible y chips compactos cuando solo queda la referencia indexada.
- La ficha de elementos del croquis y la ficha de espacios exteriores muestran una grilla de fotos guardadas.
- Version y cache actualizados a `v2.5.61`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- `osacompile -l JavaScript` sobre `mec-form.js`, `app.js` y `config.js` sin errores.
- `node --check` no se ejecuto porque `node` no esta instalado en esta maquina.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; version visible `v2.5.61` y cache `cialpa-app-v2.5.61`.

---

## Sesion de rotacion y canchas predefinidas - 2026-05-12 - v2.5.60

### Objetivo
- Permitir que poligonos y figuras exteriores/recreativas puedan rotarse para representar estructuras que no estan alineadas con el resto del plano.
- Agilizar la carga de areas deportivas con plantillas ya marcadas para canchas.

### Cambios implementados
- Los elementos exteriores guardan `rotationDeg` y `rotacion_grados` en ficha, con edicion manual desde la ficha.
- En el panel del plano general, al seleccionar un exterior aparecen acciones rapidas `Girar -15`, `Girar +15` y `Poner 0 grados`.
- El dibujo de exteriores y recreacion ahora respeta la rotacion en canvas y en la exportacion SVG.
- Las areas de recreacion agregan plantillas predefinidas: `Cancha futbol`, `Cancha basquetbol` y `Cancha tenis`.
- Las canchas se dibujan con lineas internas basicas: mitad de cancha, areas/circulos o lineas de servicio segun corresponda.
- Las plantillas deportivas precargan uso, actividad, largo, ancho, superficie, perimetro y equipamiento de referencia.
- Al editar largo/ancho de una recreacion, el tamano visible del elemento se actualiza proporcionalmente en el plano.
- Version y cache actualizados a `v2.5.60`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- Parseo con `osascript -l JavaScript` de `mec-form.js` y `config.js` sin errores.
- Compilacion con `osacompile -l JavaScript` de `app.js` y `sw.js` sin errores.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js`, `mec-form.css` y `sw.js`; version visible `v2.5.60` y cache `cialpa-app-v2.5.60`.

---

## Sesion de actualizacion y datos emergentes controlables - 2026-05-12 - v2.5.59

### Objetivo
- Resolver que los cambios de datos emergentes no surtian efecto por estar aplicados sobre una copia local anterior a la version publicada.
- Publicar la mejora sobre la base vigente `v2.5.58`, conservando los avances recientes de exteriores, recreacion y fichas completas.

### Cambios implementados
- Se sincronizo la base local con `origin/main` antes de reimplementar cambios, evitando pisar la version publicada.
- Se agrego la capa `Datos emergentes` en el plano general para activar/desactivar las fichas flotantes.
- En escritorio, los datos emergen al pasar el cursor sobre elementos del plano general; en tablet/celular aparecen al tocar el elemento.
- La ficha emergente de bloques ahora incluye datos electricos clave: acometida, medidor, tablero, llave termomagnetica, diferencial y tableros dibujados.
- Las fichas emergentes de aulas y sanitarios ahora muestran conteos de aberturas, elementos electricos/equipos, danos, artefactos, cabinas, area y evidencias asociadas.
- Se agrego capa `Sanitarios` para mostrar/ocultar sanitarios en el plano general sin depender de otras capas.
- Version y cache actualizados a `v2.5.59`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- `node --check` no disponible en este equipo local (`node: command not found`); se uso validacion alternativa.
- Parseo con `osascript -l JavaScript` de `mec-form.js` y `config.js` sin errores.
- Compilacion con `osacompile -l JavaScript` de `app.js` y `sw.js` sin errores.
- Servidor local `python3 -m http.server 8027` verificado con `curl` sobre `index.html`, `mec-form.js`, `mec-form.css` y `sw.js`; version visible `v2.5.59` y cache `cialpa-app-v2.5.59`.
## Sesion de ficha completa para exteriores y recreacion - 2026-05-12 - v2.5.58

### Objetivo
- Permitir que los elementos exteriores no solo se ubiquen y muevan, sino que puedan editarse con una ficha completa, especialmente los espacios de recreacion tipo tinglado/cancha/patio.

### Cambios implementados
- Al seleccionar un exterior en el arbol aparece un boton explicito `Editar ficha`, ademas de bloqueo/desbloqueo.
- En el plano, un segundo toque/clic sobre el mismo exterior seleccionado abre su ficha, evitando depender del doble clic en tablet.
- La ficha de `Espacio recreacion` ahora registra uso, actividad, largo, ancho, superficie, perimetro, capacidad, cubierta, estructura, piso, cerramiento, drenaje, iluminacion, electricidad, ventilacion, seguridad, accesibilidad, uso compartido, mantenimiento y equipamiento.
- Al cargar largo y ancho de recreacion, se calculan automaticamente superficie y perimetro si estaban vacios.
- Las fichas de exteriores ahora permiten anexar fotos, se guardan en la ficha y entran al indice de evidencias/exportacion.
- Version y cache actualizados a `v2.5.58`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- Selenium/Chrome headless local: se creo `recreation`, se abrio ficha, se verificaron campos extendidos, control de foto y boton `Editar ficha`.
- Selenium/Chrome headless local: al guardar largo `18` y ancho `12`, quedaron guardados `superficie_m2 = 216.00` y `perimetro_m = 60.00`.

### Proximos pasos
- Probar en tablet el flujo: insertar recreacion, moverla, tocarla de nuevo o usar `Editar ficha`, y registrar sus datos como ambiente exterior complejo.

---

## Sesion de correccion real de insercion de exteriores - 2026-05-12 - v2.5.57

### Objetivo
- Resolver definitivamente que tanque, pilar, galeria, espacio libre y recreacion no quedaban insertados en el plano general aunque el flujo de ficha respondiera.

### Cambios implementados
- El plano visible ahora se prioriza correctamente: en la vista principal `Plano escuela` se usa `#school-plan-root` activo, evitando dibujar en el plano interno oculto del cuestionario.
- La insercion desde `Plano escuela` ya no cambia innecesariamente el modulo interno MEC; crea el elemento sobre el canvas visible.
- Se corrigio la causa principal del guardado en cero: el calculo de espacio libre normalizaba `__siteElements` y dejaba obsoleta la referencia del arreglo donde luego se hacia `push`.
- Tras calcular posicion, el codigo vuelve a tomar la lista vigente y recien ahi inserta el elemento.
- Version y cache actualizados a `v2.5.57`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- Selenium/Chrome headless local: `+ Tanque` en `Plano escuela` guardo `__siteElements.length = 1`, tipo `water_tank`, canvas visible `school-plan-canvas`, ficha visible y fila exterior en el arbol.
- Selenium/Chrome headless local: `+ Pilar`, `+ Espacio`, `+ Galeria` y `+ Recreacion` guardaron 4 elementos y 4 filas exteriores en el plano visible.

### Proximos pasos
- Probar en la app publicada con URL cache-buster que los botones de exteriores creen el elemento visible antes de completar ficha.

---

## Sesion de ubicacion inmediata de exteriores - 2026-05-12 - v2.5.56

### Objetivo
- Corregir el flujo donde tanque, pilar, espacio libre, galeria o recreacion abrian ficha pero no quedaban visibles ni ubicados en el plano general.

### Cambios implementados
- Los botones de exteriores ahora crean el objeto y lo ubican inmediatamente en un espacio libre del `Plano escuela`.
- La ficha emergente se abre despues de crear y seleccionar el objeto, para completar caracteristicas y estado sin perder la ubicacion.
- Al crear un exterior se fuerza la capa `Exteriores` encendida, evitando que el elemento quede invisible si el filtro estaba desactivado.
- Se mantiene el modo de movimiento activo y el centrado de la vista para poder arrastrar el elemento recien creado.
- Para recreacion se conserva la pregunta previa de forma; una vez elegida, se crea el espacio y se abre su ficha.
- Version y cache actualizados a `v2.5.56`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar en la app publicada que al tocar `+ Tanque`, `+ Pilar` o `+ Espacio` aparezca primero el objeto en el plano general y luego su ficha para completar datos.

---

## Sesion de KPIs compactos en plano escuela - 2026-05-12 - v2.5.55

### Objetivo
- Evitar que los KPIs de `Plano escuela` ocupen demasiado espacio vertical y retrasen el acceso al area de trazado.

### Cambios implementados
- Los KPIs del plano se movieron desde la cabecera de la vista hacia el final, debajo del plano y del arbol de elementos.
- Las tarjetas de KPIs se compactaron: menor altura, menor relleno, tipografia reducida y notas secundarias ocultas dentro de la tarjeta.
- Las notas de cada KPI se conservan como ayuda emergente al pasar el cursor.
- Version y cache actualizados a `v2.5.55`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar en tablet que el primer pantallazo del `Plano escuela` deje visible el constructor y la zona de dibujo sin obligar a desplazarse por los KPIs.

---

## Sesion de fichas previas y ubicacion libre de exteriores - 2026-05-12 - v2.5.54

### Objetivo
- Corregir la insercion de pilares, tanques y espacios recreativos para que no queden invisibles o perdidos en el plano, y exigir ficha de caracteristicas/estado antes de crear el elemento.

### Cambios implementados
- Los botones de elementos exteriores ahora llevan a `Plano escuela` y abren primero una ficha emergente de creacion; el elemento aparece recien al confirmar `Crear y ubicar`.
- La ubicacion inicial ya no usa una coordenada fija: se calcula un espacio libre evitando bloques y otros exteriores, con seleccion automatica del nuevo objeto.
- Al crear exteriores se activa el modo de movimiento del plano para poder arrastrar inmediatamente el tanque, pilar, galeria, espacio libre o recreacion.
- Las fichas de exteriores ahora tienen campos especificos por tipo: tanque con capacidad/material/soporte/tapa/alimentacion; pilar con material/seccion/estabilidad/fisuras; recreacion con forma, uso, cubierta, estructura, piso, cerramiento, drenaje, iluminacion y dimensiones.
- Los espacios de recreacion conservan botones de forma para rectangulo, circulo, ovalo, triangulo y poligono, y contemplan `Tinglado` como uso principal configurable.
- Version y cache actualizados a `v2.5.54`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar en tablet la secuencia: tocar `+ Tanque` o `+ Pilar`, completar ficha, crear y arrastrar en plano general.
- Evaluar un editor real de vertices para poligonos recreativos complejos cuando se necesiten tinglados o patios con geometria irregular exacta.

---

## Sesion de insercion directa de exteriores y formas de recreacion - 2026-05-12 - v2.5.53

### Objetivo
- Corregir la insercion de tanque de agua y espacios de recreacion para que siempre aparezcan de inmediato en el plano general, y permitir definir la forma del espacio recreativo antes de ubicarlo.

### Cambios implementados
- Los botones de elementos exteriores ahora crean el elemento, cambian automaticamente a `Plano escuela`, seleccionan el nuevo objeto y centran la vista para moverlo.
- El tanque de agua se incorpora directamente en el plano general sin abrir una ficha que interrumpa el arrastre inicial.
- El espacio de recreacion abre primero un selector emergente con botones de forma: rectangulo, circulo, ovalo, triangulo y poligono.
- La forma elegida queda guardada en la ficha del espacio recreativo y puede modificarse luego desde botones dentro de la ficha.
- El dibujo del plano general representa la forma elegida para recreacion, incluyendo circulo, ovalo, triangulo y poligono.
- Version y cache actualizados a `v2.5.53`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar en tablet que el salto automatico al plano general no desoriente y que el objeto quede suficientemente visible para moverlo.
- Evaluar un editor de vertices para poligonos libres si campo necesita registrar patios o canchas con forma irregular real.

---

## Sesion de colisiones sanitarias, pisos visibles y criterios de formulario - 2026-05-12 - v2.5.52

### Objetivo
- Impedir que los sanitarios se superpongan con aulas u otros sanitarios del mismo piso, reforzar la lectura de pisos en el plano global y considerar los criterios del documento `R00_CRITERIOS DE FORMULARIO.docx` dentro del flujo de registro.

### Cambios implementados
- El movimiento y redimensionado del sanitario ahora usa una busqueda de rectangulo libre y vuelve a la ultima posicion valida si el area invade otra aula o sanitario del mismo piso.
- La colocacion programatica desde el plano general tambien valida choques antes de mover el sanitario con sus objetos internos.
- Cada piso del plano global ahora se dibuja como una tarjeta separada con borde propio, encabezado `Bloque - Piso` y resaltado de seleccion.
- Se agregaron ayudas de criterio de campo dentro de fichas de puertas, ventanas, tomacorrientes, aire acondicionado y escaleras/rampas.
- Las mismas ayudas se muestran tambien en fichas de objetos sanitarios cuando corresponden.
- Version y cache actualizados a `v2.5.52`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar en tablet el arrastre de sanitarios entre aulas contiguas para confirmar que el bloqueo de superposicion se siente natural.
- Convertir criterios restantes del documento en ayudas especificas cuando se agreguen campos de pintura de aula y accesibilidad general al modelo.

---

## Sesion de arbol jerarquico y acciones rapidas - 2026-05-12 - v2.5.51

### Objetivo
- Ordenar el constructor del plano para que el encuestador vea claramente la relacion bloque > piso > aula/sanitario > elementos, y reunir bloqueo/desbloqueo con las acciones rapidas de deshacer, rehacer y eliminar.

### Cambios implementados
- El panel lateral del plano general ahora muestra un arbol desplegable por bloques, pisos, aulas, sanitarios y predio exterior.
- Los sanitarios despliegan sus objetos internos cuando estan seleccionados, igual que las aulas con sus elementos.
- Predio exterior agrupa galerias, tanques, recreacion, espacios libres y pilares en una rama propia.
- El boton Bloquear/Desbloquear se movio junto a Deshacer, Rehacer y Eliminar en el plano general, constructor contextual, aula y sanitario.
- Se elimino la repeticion de acciones de eliminacion dentro del grupo contextual para que la barra rapida sea el punto unico de acciones criticas.
- Agregado estilo visual de ramas, sangrias y estados bloqueados para mejorar lectura en escritorio y tablet.
- Version y cache actualizados a `v2.5.51`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check` sin errores; solo advertencias esperadas de normalizacion LF/CRLF en Windows.

### Proximos pasos
- Probar el arbol en tablet con tactil para ajustar densidad, apertura de ramas y seleccion accidental si fuera necesario.
- Evaluar persistir ramas abiertas por usuario para que el panel recuerde el punto exacto de trabajo entre cambios de vista.

---

## Sesion de fichas flotantes y bloqueo integral - 2026-05-12 - v2.5.50

### Objetivo
- Hacer que las fichas de edicion del registro arquitectonico se abran siempre como ventanas flotantes y ampliar el bloqueo/desbloqueo con confirmacion a bloques, sanitarios y espacios exteriores.

### Cambios implementados
- La ficha de aula seleccionada ahora abre en modal flotante; ya no desplaza al panel de datos lateral.
- La ficha general del sanitario y la ficha de cada objeto sanitario ahora abren como modales flotantes.
- Los paneles incrustados de cabina/objeto sanitario dejaron de mostrarse bajo el lienzo; la edicion se centraliza en `Ficha`.
- Se agrego bloqueo/desbloqueo con confirmacion para bloques, sanitarios y espacios exteriores.
- El bloqueo impide edicion, movimiento, borrado, fotos y cambios accidentales desde botones, inputs y arrastre.
- Deshacer/Rehacer quedan visibles en el constructor contextual del plano y tambien junto a las acciones de ficha/eliminar en el sanitario.
- Version y cache actualizados a `v2.5.50`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `rg` para confirmar modales de aula/sanitario/objeto sanitario, funciones de bloqueo y cache/version `v2.5.50`.

### Proximos pasos
- Probar en tablet Android/iPad que los modales flotantes no tapen controles criticos y que el bloqueo sea claro antes de trabajo de campo.
- Evaluar historial independiente de deshacer/rehacer para sanitarios y elementos exteriores; hoy el historial principal sigue centrado en el croquis de aula.

---

## Sesion de exteriores multi-plano y bloqueo de aulas - 2026-05-12 - v2.5.49

### Objetivo
- Permitir que los elementos exteriores del predio puedan incorporarse y ubicarse desde el plano general, el plano de aula y el plano sanitario, y proteger aulas terminadas contra cambios accidentales.

### Cambios implementados
- Agregados botones de exteriores en los editores de aula y sanitario: galeria, tanque de agua, espacio de recreacion, espacio libre y pilar.
- Los elementos exteriores ahora se dibujan tambien sobre los lienzos de aula y sanitario, se pueden seleccionar, mover y abrir en ficha desde esas vistas.
- Reutilizado el mismo modelo de `__siteElements`, evitando duplicar datos entre plano general, aula y sanitario.
- Agregado boton `Bloquear aula` y `Desbloquear aula`, ambos con confirmacion.
- Cuando un aula queda bloqueada se deshabilitan edicion de medidas, redibujo, arrastre, redimension, borrado, deshacer/rehacer y modificacion de fichas/fotos de sus objetos.
- El plano general muestra el estado `Aula bloqueada` y ofrece la accion de bloquear/desbloquear desde el constructor contextual.
- Version y cache actualizados a `v2.5.49`.

### Validaciones ejecutadas
- `node --check` en `mec-form.js`, `mec-schema.js`, `config.js`, `app.js` y `sw.js`.
- `git diff --check` sin errores; solo avisos esperados de normalizacion LF/CRLF.
- `rg` para confirmar version/cache `v2.5.49`.

### Proximos pasos
- Probar en tablet Android/iPad el movimiento de exteriores desde aula/sanitario y confirmar que no interfiera con cabinas, puertas o aulas de referencia.
- Evaluar si conviene agregar una capa visual independiente para ocultar/mostrar exteriores dentro de los planos por aula y sanitario.

---

## Sesion de elementos exteriores, tablero y DXF - 2026-05-12 - v2.5.48

### Objetivo
- Ampliar el registro arquitectonico para cubrir elementos de aula y del predio que faltaban, y habilitar una primera migracion a formato AutoCAD.

### Cambios implementados
- Agregado elemento `Tablero` en aulas y sanitarios, con icono, ficha propia, estado, proteccion, rotulado y seguridad.
- Agregada Nota `(i)` dentro de fichas de objetos, cabinas sanitarias y elementos exteriores para dejar criterios, excepciones o aclaraciones de gabinete.
- Agregada capa de elementos exteriores del predio: tanque de agua, espacio de recreacion, galeria, espacio libre y pilar.
- Agregados botones rapidos en el constructor del plano para insertar galerias, espacios, pilares, recreacion y tanques de agua.
- Los elementos exteriores se ven en el plano general, tienen ficha, aparecen en la lista lateral, pueden moverse con `Mover bloques` activo y participan en guias de distancia.
- Reforzado que todo bloque mantenga al menos `Piso 1` aunque este en construccion, clausurado o derrumbado.
- Agregado exportador `DXF` basico para migracion a AutoCAD/LibreCAD con capas de bloques, aulas, sanitarios, aberturas, equipos, tableros, escaleras, danos y exteriores.
- Version y cache actualizados a `v2.5.48`.

### Validaciones ejecutadas
- `node --check` en `mec-form.js`, `mec-schema.js`, `config.js` y `app.js`.
- `git diff --check` sin errores; solo avisos esperados de normalizacion LF/CRLF.
- `rg` para confirmar version/cache `v2.5.48`, boton `DXF`, elementos exteriores y `switchboard`.

### Proximos pasos
- Probar en AutoCAD/LibreCAD la escala del DXF y definir si la proxima iteracion debe exportar bloques/pisos como layouts separados.
- Evaluar si los elementos exteriores requieren fotos directas en ficha, ademas de nota `(i)` y observacion.

---

## Sesion de colocacion pared/techo, contraste y fichas flotantes - 2026-05-12 - v2.5.47

### Objetivo
- Mejorar la agilidad del registro arquitectonico en campo, especialmente en la colocacion de iluminacion, ventiladores y lectura rapida de datos de cada elemento del plano.

### Cambios implementados
- Focos e iluminaciones y ventiladores ahora pueden quedar en techo o pared: si se arrastran cerca del borde se pegan a pared, y si se alejan vuelven a ubicacion de techo.
- Los ventiladores colocados inicialmente en pared ya no quedan atrapados: al arrastrarlos hacia el interior del aula o sanitario se desprenden y se registran como `Techo`.
- Agregado campo `Ubicacion` en fichas de foco/iluminacion y ventilador, tambien para objetos sanitarios cuando corresponde.
- Al pasar el cursor sobre elementos del croquis, sanitarios o plano general aparece una ficha flotante compacta con codigo, tipo, estado, ubicacion, observaciones y fotos cuando existen.
- Reforzado el contraste de secciones, bloques de preguntas y opciones seleccionadas para que la seleccion sea mas evidente en tablet y escritorio.
- Version y cache actualizados a `v2.5.47`.

### Validaciones ejecutadas
- `node --check` en `mec-form.js`, `config.js` y `app.js`.
- `git diff --check` sin errores; solo avisos esperados de normalizacion LF/CRLF.
- `rg` para confirmar version/cache `v2.5.47` en `index.html`, `config.js` y `sw.js`.

### Proximos pasos
- Probar en tablet Android/iPad la colocacion de focos y ventiladores con dedo, confirmando que no se pegan a pared salvo al acercarse al borde.
- Revisar con usuarios si la ficha flotante muestra suficiente informacion o si conviene agregar dimensiones/estado electrico por tipo de objeto.

---

## Sesion de armonizacion visual y trazado expandido - 2026-05-11 - v2.5.46

### Objetivo
- Generar una version mas ordenada, pulcra y armonica de la app web, montada sobre la rama publicada mas reciente sin perder las mejoras funcionales ya subidas hasta `v2.5.45`.

### Cambios implementados
- Ajustada la capa visual general: fondos, bordes, radios, sombras, botones, tarjetas, formularios y estados activos con un lenguaje mas consistente.
- Pulido especifico del cuestionario MEC, editor de aulas, editor sanitario y plano general para reducir ruido visual y mejorar lectura en campo.
- Agregado boton de pantalla completa en las zonas de trazado para trabajar el plano con mas superficie util.
- Conservadas las mejoras remotas recientes: inicio por defecto, evidencias, fichas contextuales, bloqueo de movimientos accidentales, deshacer/rehacer visible y etiquetas estables con zoom.
- Version y cache actualizados a `v2.5.46`.

### Validaciones ejecutadas
- `node --check` en `mec-form.js`, `config.js` y `app.js`.
- `git diff --check`.
- `rg` para confirmar version/cache `v2.5.46`, modo expandido, leyendas y estilos visuales.
- Servidor local HTTP en `http://127.0.0.1:8080/` para servir la build y verificar recursos principales.

### Proximos pasos
- Probar en tablet Android/iPad el modo pantalla completa y la lectura del plano con etiquetas compactas.
- Validar con usuarios de campo si la nueva jerarquia visual acelera la carga de elementos y fichas.
- Revisar si conviene reemplazar texto de botones secundarios por iconos en mas zonas, ahora que la base visual esta estabilizada.

---

## Sesion de etiquetas inteligentes con zoom - 2026-05-11 - v2.5.45

### Objetivo
- Evitar que etiquetas, textos y medidas del editor de planos crezcan con el zoom hasta solaparse con los objetos y bloquear la lectura del plano.

### Cambios implementados
- Las fuentes de etiquetas del croquis, sanitarios y plano general ahora tienen tamano estable en pantalla: al hacer zoom, el objeto aumenta pero la etiqueta no se vuelve invasiva.
- Las etiquetas de objetos no seleccionados se simplifican: puertas y ventanas muestran `Pta`/`Vtna`, cabinas muestran `Cbn`, puntos electricos y equipos priorizan su icono.
- Las medidas completas se mantienen disponibles al seleccionar el elemento, junto con las guias de medicion.
- Las etiquetas de aulas y sanitarios de contexto muestran nombre/codigo corto en lugar de dimensiones completas, reduciendo solapes en bloques cargados.
- Los textos libres del plano tambien usan fuente estable frente al zoom.
- Version y cache actualizados a `v2.5.45`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- Parseo con `osascript -l JavaScript` de `config.js`, `api.js`, `auth.js`, `mec-schema.js`, `mec-form.js`, `app.js`, `sw.js` y `gas/Code.gs` sin errores.
- Servidor local `python3 -m http.server 8025` con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; verificada edicion `v2.5.45`, Inicio activo, cache `cialpa-app-v2.5.45`, fuentes estables y etiquetas compactas por seleccion.

---

## Sesion de botones deshacer y rehacer visibles - 2026-05-11 - v2.5.44

### Objetivo
- Hacer visibles los controles de recuperacion de acciones junto a los botones de eliminacion del editor de planos.

### Cambios implementados
- En el croquis de aulas, los botones `Deshacer` y `Rehacer` quedan inmediatamente antes de `Eliminar seleccionado`.
- En la ficha rapida contextual de cada elemento seleccionado tambien aparecen `Deshacer`, `Rehacer` y `Eliminar` juntos.
- En la vista `Plano escuela`, se agregaron `Deshacer` y `Rehacer` junto al boton `Eliminar`.
- `Deshacer` usa color naranja (`btn-warning`) y `Rehacer` usa color verde (`btn-success`) para diferenciarlos del boton rojo de eliminacion.
- Version y cache actualizados a `v2.5.44`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- Parseo con `osascript -l JavaScript` de `config.js`, `api.js`, `auth.js`, `mec-schema.js`, `mec-form.js`, `app.js`, `sw.js` y `gas/Code.gs` sin errores.
- Servidor local `python3 -m http.server 8025` con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; verificada edicion `v2.5.44`, Inicio activo, cache `cialpa-app-v2.5.44` y botones `Deshacer`/`Rehacer` junto a `Eliminar`.

---

## Sesion de bloqueo contra movimientos accidentales del plano - 2026-05-11 - v2.5.43

### Objetivo
- Corregir una falla critica del editor de planos: al reabrir o navegar el plano no debe moverse, reordenarse ni guardarse ningun elemento salvo que el usuario arrastre intencionalmente.

### Cambios implementados
- El plano general queda bloqueado por defecto para navegacion y seleccion; mover bloques ahora requiere activar explicitamente el boton `Mover bloques`.
- Los modulos inactivos ya no construyen editores escondidos; solo se renderiza el cuerpo del modulo activo para evitar efectos laterales al cambiar de vista.
- El dibujo del plano general ya no llama funciones que crean o reacomodan sanitarios/aulas durante el render; renderizar el plano pasa a ser una operacion de lectura.
- Los sanitarios sin geometria previa se muestran con distribucion temporal de vista, sin escribir coordenadas nuevas por solo abrir o imprimir el plano.
- En los editores de aulas y sanitarios se agrego umbral minimo de arrastre: tocar/seleccionar ya no guarda ni desplaza por micro-movimientos.
- Se eliminaron escuchas globales persistentes de mouse que quedaban acumuladas entre renders; ahora se crean solo durante el gesto activo.
- Version y cache actualizados a `v2.5.43`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- Parseo con `osascript -l JavaScript` de `config.js`, `api.js`, `auth.js`, `mec-schema.js`, `mec-form.js`, `app.js`, `sw.js` y `gas/Code.gs` sin errores.
- Servidor local `python3 -m http.server 8025` con `curl` sobre `index.html`, `mec-form.js` y `sw.js`; verificada edicion `v2.5.43`, Inicio activo, cache `cialpa-app-v2.5.43`, boton `Mover bloques` y render activo sin modulos ocultos.

---

## Sesion de fichas contextuales de plano - 2026-05-11 - v2.5.42

### Objetivo
- Hacer que todo elemento grande o pequeno del plano muestre controles inmediatos al seleccionarse: ficha, acciones de calidad/tipo y eliminacion con confirmacion.

### Cambios implementados
- Se agrego una ficha rapida contextual bajo el canvas de aulas: al tocar aula, puerta, ventana, pared, toma, foco, ventilador, aire, texto, lapiz o dano aparecen botones para abrir ficha y eliminar.
- La seleccion de aula base ahora dirige a la ficha del aula activa; la eliminacion de un aula desde su rectangulo elimina el aula completa con todos sus elementos.
- Se agrego una ficha rapida contextual bajo el canvas de sanitarios: sanitario activo, cabinas, inodoros, lavamanos, puertas, ventanas y equipos muestran ficha y boton de eliminar.
- Las puertas de sanitarios ganan accion rapida para invertir apertura desde la seleccion.
- El plano general ahora permite seleccionar objetos pequenos de aulas y sanitarios, no solo bloques/aulas/sanitarios; desde esa seleccion se puede abrir ficha o eliminar.
- Los bloques, aulas y sanitarios del plano general incorporan accion de eliminacion en el constructor contextual.
- Version y cache actualizados a `v2.5.42`.

### Validaciones ejecutadas
- `git diff --check` sin observaciones.
- Parseo con `osascript -l JavaScript` de `config.js`, `api.js`, `auth.js`, `mec-schema.js`, `mec-form.js`, `app.js`, `sw.js` y `gas/Code.gs` sin errores.
- Servidor local `python3 -m http.server 8025` con `curl` sobre `index.html`, `mec-form.js`, `mec-form.css` y `sw.js`; verificada edicion `v2.5.42`, Inicio activo y fichas contextuales disponibles.

---

## Sesion de arranque en Inicio y evidencias en Drive - 2026-05-11 - v2.5.41

### Objetivo
- Evitar la pantalla en blanco despues de actualizar la app y dejar preparado el guardado real de fotos/evidencias en la carpeta Drive del proyecto.

### Cambios implementados
- `Inicio` queda activo por defecto en el HTML y tambien se fuerza desde el controlador cuando la app se abre, se reanuda o se actualiza.
- El arranque de la app ahora captura fallas parciales del shell y vuelve a mostrar `Inicio` como vista segura.
- La carpeta de evidencias queda configurada con el ID `1MtFgyyCaAF4MyfRmpvFAvwjgzSn75V_-` y su enlace publico.
- Las fotos adjuntas al cuestionario, aulas, objetos del plano y sanitarios intentan subirse automaticamente a Drive; si el dispositivo esta sin conexion quedan como pendientes en el borrador local y se reintentan al volver la conexion.
- Cada evidencia guarda nombre indexado, contexto de escuela/bloque/piso/espacio/elemento, estado de subida, ID/URL de Drive y registro en la hoja `evidencias`.
- Se agrego el endpoint `uploadEvidence` en Google Apps Script usando `DriveApp`, mas la hoja `evidencias` en el setup.
- Version y cache actualizados a `v2.5.41`.

### Validaciones ejecutadas
- `git diff --check`.
- Parseo con `osascript -l JavaScript` de `assets/js/config.js`, `assets/js/api.js`, `assets/js/auth.js`, `assets/js/mec-schema.js`, `assets/js/mec-form.js`, `assets/js/app.js`, `sw.js`, `gas/Code.gs`, `gas/sheets.gs` y `gas/setup.gs`.
- Servidor local `python3 -m http.server` y `curl` sobre `index.html`, `assets/js/config.js` y `sw.js`, verificando `v2.5.41`, `module-inicio` activo y carpeta Drive configurada.

### Nota operativa
- Para que la subida real a Drive funcione en produccion, hay que redeplegar el Web App de Apps Script con esta version del codigo.

---

## Sesion de editor electrico, plano general movil y canvas nitido - 2026-05-11 - v2.5.40

### Objetivo
- Mejorar el editor de planos para tablet/celular: elementos electricos anclados a paredes, nuevos equipos, reordenamiento de bloques en plano general y mayor nitidez con zoom.

### Cambios implementados
- Las tomas, focos, ventiladores y aires acondicionados ahora se pegan a la pared mas cercana al colocarse y pueden moverse nuevamente por arrastre, incluso cambiando de pared.
- Se agregaron herramientas de `Ventilador` y `Aire acond.` al croquis de aulas y sanitarios, con iconos, fichas editables, estados, fotos asociadas y conteo en KPIs.
- El plano general permite arrastrar bloques para acomodarlos manualmente en escala, conservando posiciones relativas y mostrando las guias de distancia durante el movimiento.
- Se redujo el solapamiento visual de puntos electricos/equipos superpuestos en plano general y PDF mediante desplazamiento controlado de simbolos cercanos.
- El canvas de aula, sanitario y plano general ahora redibuja con mayor resolucion interna segun zoom y densidad de pantalla, evitando que los elementos se vean borrosos al ampliar.
- El PDF agrega simbolos y leyenda para ventiladores y aires acondicionados.
- Version y cache actualizados a `v2.5.40`.

### Validaciones ejecutadas
- `osascript -l JavaScript` sobre `assets/js/mec-schema.js` y `assets/js/mec-form.js`.
- `git diff --check`.

---

## Sesion de correccion de foco de zoom en planos - 2026-05-11 - v2.5.39

### Objetivo
- Corregir el comportamiento observado en tablet/escritorio donde, al hacer zoom sobre un elemento del plano, la vista se desplazaba hacia la esquina superior izquierda en lugar de mantener el elemento o gesto como foco.

### Cambios implementados
- El zoom del croquis de aula ahora centra el elemento seleccionado; si no hay elemento seleccionado, conserva el centro visible actual.
- El zoom del plano sanitario ahora centra el objeto sanitario/cabina seleccionada o el recinto sanitario activo.
- El zoom del plano general ahora centra el bloque, aula, sanitario u objeto seleccionado.
- El gesto de pinza mantiene como ancla el punto medio de los dedos en aula, sanitario y plano general.
- El zoom con rueda/trackpad sobre el plano general mantiene como ancla el punto bajo el cursor.
- Version y cache actualizados a `v2.5.39`.

### Validaciones ejecutadas
- `osascript -l JavaScript assets/js/mec-form.js`
- `osascript -l JavaScript assets/js/mec-schema.js assets/js/mec-form.js`
- `git diff --check`

---

## Sesion de zoom tactil, distancias por borde y PDF con fotos - 2026-05-10 - v2.5.38

### Objetivo
- Mejorar el uso del editor de planos en tablet y acercar el PDF impreso a las buenas practicas observadas en `H:\Mi unidad\Celsa Speratti.pdf`, especialmente marcadores numerados y fotos asociadas a elementos.

### Cambios implementados
- El croquis de aula, el croquis sanitario y el plano general ahora tienen zoom persistente por botones.
- En pantallas tactiles se agrego gesto de pinza para ampliar/reducir los lienzos sin arrastrar accidentalmente elementos.
- El zoom ahora aumenta el tamano real del canvas dentro de un contenedor desplazable, evitando el zoom visual falso que no daba area de trabajo.
- Las guias de distancia del plano general ahora calculan la separacion minima entre bordes de rectangulos, no entre centroides.
- El PDF impreso incorpora marcadores fotograficos amarillos numerados sobre los elementos con evidencia.
- Se agregan hojas de anexo fotografico al PDF, con las fotos tomadas desde campos, elementos de aula, sanitarios y objetos sanitarios.
- Las hojas de plano incluyen resumen de marcadores/fotos del piso, escala grafica, dimensiones y ficha lateral.
- El indice de evidencias exportado tambien contempla fotos de objetos internos de sanitarios.
- Version y cache actualizados a `v2.5.38`.

### Validaciones ejecutadas
- Analisis local del PDF `Celsa Speratti.pdf`: 19 paginas, estructura Magicplan con portada, hojas de plano, fichas y paginas de fotos.
- `node --check` en `mec-form.js`.
- `rg` para confirmar zoom, marcadores fotograficos, distancias por bordes y version/cache `v2.5.38`.

### Proximos pasos
- Probar en tablet Android/iPad el gesto de pinza en aula, sanitario y plano general.
- Generar un PDF con fotos reales desde una escuela de prueba y comparar contra la referencia Magicplan.
- Revisar si conviene pasar el PDF final a formato A4 vertical en una iteracion posterior.

---

## Sesión de corrección visual en navegación de encuesta - 2026-05-10 - v2.5.37

### Objetivo
- Corregir el solapamiento de la descripción de etapa con los botones `Validar` y `Siguiente` dentro de la vista de carga de encuesta/cuestionario MEC.

### Cambios implementados
- Agrupados los botones de acción de la barra de etapas en `.mec-stage-actions`.
- La descripción de la etapa (`.mec-stage-current`) ahora ocupa una línea propia dentro de la barra, con ajuste de texto y borde separador.
- La barra superior de etapas permite salto de línea seguro y evita que el texto invada los botones en tablet, escritorio angosto o zoom alto.
- Ajustados mínimos y anchos responsivos de la botonera de etapas para no romper la navegación horizontal de módulos.
- Version y cache actualizados a `v2.5.37`.

### Validaciones ejecutadas
- `node --check` en `mec-form.js` y `config.js`.
- `rg` para confirmar versión/cache `v2.5.37` y presencia de `.mec-stage-actions`.
- `git diff --check`.

---

## Sesión de planificación operativa y estimación de tiempos - 2026-05-10 - v2.5.36

### Objetivo
- Agregar una vista de supervisión para cuantificar tiempos mínimos de carga por escuela y administrar la distribución de escuelas entre encuestadores.

### Cambios implementados
- Nuevo módulo `Planificación` visible para supervisores y administradores.
- Pestaña `Estimación de tiempos` con:
  - escuelas totales, pendientes efectivas, tiempo restante mínimo, jornadas-persona, encuestadores activos y días calendario mínimos;
  - parámetros editables de minutos base por escuela, jornada útil diaria y meta de cierre;
  - cálculo de encuestadores mínimos necesarios para terminar dentro de la meta definida;
  - carga estimada por encuestador y barras de avance/carga.
- Pestaña `Distribución de escuelas` con:
  - buscador y filtros por estado;
  - asignación por botones, sin listas desplegables;
  - balanceo automático de pendientes por minutos estimados;
  - rebalanceo general y deshacer cambios;
  - guardado de asignaciones mediante el endpoint existente `asignarEscuela`;
  - exportación CSV del plan operativo.
- El modo demo ahora actualiza en memoria la escuela al usar `asignarEscuela`, permitiendo probar la distribución sin backend.
- Agregados parámetros `DEFAULT_SCHOOL_ESTIMATE_MINUTES` y `DEFAULT_WORKDAY_HOURS` en configuración.
- El service worker cachea `planning.js`.
- Se reforzó `local-store.js` para que las métricas offline entiendan reglas de visibilidad `all`, `any`, `in` y `notIn`.
- Version y cache actualizados a `v2.5.36`.

### Validaciones ejecutadas
- `node --check` en `planning.js`, `app.js`, `api.js`, `local-store.js` y `config.js`.
- `rg` para confirmar versión/cache `v2.5.36`, nuevo módulo `Planificación` y cache de `planning.js`.
- `git diff --check`.

---

## Sesión de arranque en Inicio y saltos eléctricos MEC/RUE - 2026-05-10 - v2.5.35

### Objetivo
- Atender observaciones de prueba de campo RUE/MEC y asegurar que la app arranque siempre en la vista `Inicio`.

### Cambios implementados
- La app fuerza `Inicio` al cargar una sesión activa y también al volver desde restauración del navegador/PWA, evitando que Android o iPad reabran una vista anterior por caché de navegación.
- Confirmado como criterio funcional: si `1.3 - El local/bloque tiene acometida eléctrica` se responde como `No` o `No visible`, se ocultan las preguntas dependientes de acometida/tablero/medición, equivalentes al bloque 1.4 a 1.11.
- El motor de visibilidad del formulario MEC ahora soporta reglas compuestas `all`, `any`, `in` y `notIn`, para saltos condicionales más confiables en tablets.
- Reordenado el registro eléctrico del bloque: primero se define acometida; medidor, tensión, tablero, llave, capacidad, diferencial, puesta a tierra, potencia y circuitos solo aparecen cuando corresponde.
- Si existe acometida pero no existe/no se ve el tablero, se omiten los datos específicos de protecciones del tablero.
- Agregados campos de gabinete para `Superficie del bloque` y `Perímetro del bloque`, de acuerdo con medidas relevadas o calculadas posteriormente.
- Añadida la opción `Balancín` en la ficha de ventanas/aberturas.
- La escuela ficticia de ejemplo queda alineada con los nuevos campos de superficie/perímetro y usa `No` para la acometida inexistente.
- Version y cache actualizados a `v2.5.35`.

### Observaciones de campo incorporadas a próximos pasos
- Mantener como pauta operativa: nombrar locales con código compatible con MagicPlan.
- Registrar como definición de instrumento: dependencia/ambiente común sin uso específico.
- En gestión del relevamiento, sostener comunicación previa con la institución, verificación de ubicación al llegar, cuestionario previo a Dirección, relevamiento general inicial y observaciones para excepciones.

### Validaciones ejecutadas
- `node --check` en `app.js`, `mec-form.js`, `mec-schema.js`, `api.js` y `config.js`.
- `rg` para confirmar versión/cache `v2.5.35` y esquema `0.1.3`.
- `rg -n "<select" index.html mec-ficha.html assets/js assets/css` sin resultados.
- `git diff --check`.

---

## Sesión de estabilización tablet y PDF técnico - 2026-05-10 - v2.5.34

### Objetivo
- Corregir comportamientos táctiles extraños en tabletas Android/iPad y elevar la calidad del PDF del plano escolar.

### Cambios implementados
- La vista `Plano escuela` queda en modo selección: tocar un bloque, aula o sanitario solo selecciona; ya no mueve ni reubica elementos desde el plano general.
- El movimiento y ajuste de geometrías queda reservado a las vistas específicas de aula y sanitario, reduciendo errores por arrastre accidental en pantallas táctiles.
- Reforzado el coloreo de botones activos con `aria-pressed`, estados deshabilitados y estilos activos consistentes en:
  - botones globales de formularios y filtros;
  - botones de ficha gráfica auxiliar;
  - botones del formulario MEC y selector de etapas.
- Añadidos ajustes táctiles para tablet: botones con área mínima de toque, barra del plano fija al desplazar y contención de scroll en paneles/canvas.
- Mejorado el PDF de plano:
  - portada técnica con datos de escuela, código, ubicación, dirección, coordenadas, enlace de mapa, resumen y auditoría;
  - hojas por bloque/piso con cabecera institucional, cajetín lateral, escala gráfica, grilla, norte, leyenda y contenido del piso;
  - inclusión de métricas: bloques, plantas, aulas, sanitarios, área relevada y alertas.
- Version y cache actualizados a `v2.5.34`.

### Validaciones ejecutadas
- `node --check` en módulos JS modificados y módulos principales.
- `rg` para confirmar versión/cache `v2.5.34`.
- `git diff --check`.

---

## Sesión de reemplazo de desplegables por botones - 2026-05-10 - v2.5.33

### Objetivo
- Hacer la app más ágil para carga de campo, reduciendo fricción táctil y evitando listas desplegables en decisiones frecuentes.

### Cambios implementados
- Eliminados los `<select>` visibles de `index.html`, `mec-ficha.html` y de los módulos JavaScript de la app.
- Agregado sistema genérico `UI.setButtonChoice()` / `UI.refreshButtonChoices()` para que los botones mantengan compatibilidad con formularios y filtros existentes.
- Reemplazados por botones:
  - filtros del mapa: departamento, zona, encuestador y estado;
  - filtros de estadísticas: departamento y encuestador;
  - incidencia: tipo de incidencia y prioridad;
  - encuestador: zona asignada y rol;
  - formulario MEC: etapa, bloque del aula, estado del aula, bloque del sanitario;
  - sanitarios: estado de cabina, puerta de cabina, estado de objeto sanitario y estado de componentes internos.
- La ficha gráfica auxiliar (`mec-ficha.html`) también pasa a botones para departamento, distrito, bloque, tipo/situación de espacio, tipo/ubicación de elemento y cercado.
- Corregidas etiquetas visibles de daño/puerta a `Daño`, `Daños` y `Dañada`.
- Los filtros del mapa aplican automáticamente al tocar un botón.
- Los formularios conservan valores en `input hidden`, para no romper `FormData`, guardado ni validaciones existentes.
- Version y cache actualizados a `v2.5.33`.

### Validaciones ejecutadas
- `rg -n '<select' index.html mec-ficha.html assets/js assets/css` sin resultados.
- `node --check assets/js/app.js`
- `node --check assets/js/map.js`
- `node --check assets/js/mec-form.js`
- `node --check assets/js/mec-ficha.js`
- `node --check assets/js/admin.js`
- `node --check assets/js/stats.js`
- `node --check assets/js/config.js`
- `git diff --check`

---

## Sesión de optimización del registro arquitectónico - 2026-05-10 - v2.5.32

### Enfoque corregido
- Se reemplaza el enfoque de auditoría visible por mejoras directas al funcionamiento del sistema de registro y construcción del plano.
- El objetivo de esta versión es acelerar la carga por partes: bloque, piso, aula, sanitario, aberturas, instalaciones y objetos internos.

### Cambios implementados
- Agregado un **Constructor del plano** contextual en la vista de plano general.
- Al seleccionar una pieza del plano, el panel ofrece acciones específicas:
  - bloque: abrir bloque, crear aula, crear sanitario;
  - aula: abrir aula, agregar puerta, ventana, toma, foco, daño o escalera;
  - sanitario: abrir sanitario, agregar cabina, inodoro, lavamanos, puerta o ventana;
  - objeto de aula: abrir ficha, abrir aula o eliminar.
- La selección del plano general ahora sincroniza automáticamente el bloque, piso, aula o sanitario activo.
- Las aulas y sanitarios pueden arrastrarse directamente dentro del plano general, no solo los bloques.
- Al mover un aula o sanitario desde el plano general, sus elementos internos se desplazan junto con el recinto para conservar la relación espacial.
- Los nuevos objetos agregados desde el plano general se insertan en ubicaciones iniciales coherentes dentro del aula o sanitario seleccionado.
- Version y cache actualizados a `v2.5.32`.

### Validaciones previstas
- `node --check assets/js/mec-form.js`
- `node --check assets/js/config.js`
- `git diff --check`
- Verificación HTTP de GitHub Pages para `index.html`, `config.js`, `mec-form.js`, `mec-form.css` y `sw.js`.

---

## Sesión de mejora arquitectónica - 2026-05-10 - v2.5.31

### Estado publicado
- App web: `https://censoescuelaspy.github.io/CIALPAappencuesta/?v=2.5.31`
- Rama publicada: `main`
- Commit principal: `f6a5bd4` - `feat: agregar auditor arquitectonico del plano`
- Commit de alineación: `41f94d5` - `chore: alinear comentario de version`
- Verificación en GitHub Pages: `index OK`, `config OK`, `mec-form OK`, `css OK`, `sw OK`

### Cambios implementados
- Agregado el **Auditor arquitectónico** dentro del plano general de escuela.
- Nuevo KPI **Calidad técnica** con puntaje `0-100`.
- Detección automática de omisiones críticas:
  - bloques sin dimensiones o sin ambientes asociados;
  - pisos con aulas pero sin sanitario;
  - aulas operativas sin puerta, ventana, toma, iluminación, medidas o geometría;
  - sanitarios sin puerta de acceso, inodoro, lavamanos, agua, medidas o recinto dibujado;
  - cabinas sin componentes, sin inodoro o con privacidad deficiente;
  - objetos en mal estado, sin funcionamiento, expuestos o con riesgo;
  - daños estructurales con prioridad alta, severa, urgente o de riesgo inmediato.
- Cada observación del auditor queda como botón seleccionable para localizar rápidamente el bloque, aula, sanitario u objeto observado en el plano.
- Agregados estilos responsivos para panel de auditoría, tarjetas de observaciones y barra de calidad.
- Corregido un `summary` duplicado en el panel de cabinas sanitarias.
- Versión y cache actualizados a `v2.5.31` en `config.js`, `index.html` y `sw.js`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`
- `node --check assets/js/config.js`
- `git diff --check`
- Verificación HTTP de GitHub Pages para `index.html`, `config.js`, `mec-form.js`, `mec-form.css` y `sw.js`.

### Próximos pasos recomendados
- Convertir las observaciones del auditor en checklist de cierre por escuela.
- Agregar exportación de auditoría a PDF/JSON junto con el plano.
- Incorporar reglas de dimensionamiento por tipo de ambiente y capacidad.
- Agregar modo "rutas y evacuación" con puertas, escaleras, accesibilidad y recorridos.
- Crear biblioteca de tipologías arquitectónicas para insertar aulas, sanitarios y bloques completos con configuraciones prearmadas.
- Agregar comparador entre relevamiento actual y versión anterior de la misma escuela.

---

## Sesión de Deploy — 2026-04-27 / 2026-04-28

### Objetivo
Llevar la aplicación web CIALPA v2.0 desde desarrollo local a producción completa:
frontend en GitHub Pages + backend Google Apps Script + base de datos Google Sheets.

---

## 1. Estado inicial

| Componente | Estado |
|---|---|
| Frontend (06_APP) | Código completo localmente, sin publicar |
| Backend GAS | Código completo localmente, sin subir al editor GAS |
| Google Sheets | Spreadsheet existente, hojas no creadas |
| GitHub Pages | Repo existente con versión anterior |
| Logo / favicon | Existente en 07_IMAGENES, no copiado a assets/ |

---

## 2. Acciones realizadas

### 2.1 Preparación de assets
- Creada carpeta `assets/img/`
- Copiado `07_IMAGENES/Logo_Branding/LOGO_CIALPA.png` → `assets/img/logo.png` y `favicon.png`

### 2.2 Mejoras al código GAS
- **`gas/setup.gs`**: agregada función `importEscuelas()` para carga masiva de escuelas desde hoja temporal `IMPORT_TEMP`
- **`gas/appsscript.json`**: creado con zona horaria `America/Asuncion`, runtime V8, acceso `ANYONE_ANONYMOUS`
- **`gas/.clasp.json`**: creado apuntando al Script ID del proyecto

### 2.3 Upload al proyecto Google Apps Script vía clasp
- Script ID: `1dQePnMTegZBIyN9SRYTAkPxDyBUiZejVi6WqXpv6_LrBAIVTir3ne4S2`
- Archivos subidos: `Code.gs`, `auth.gs`, `sheets.gs`, `audit.gs`, `setup.gs` (6 archivos total)
- Tool: clasp v3.3.0

### 2.4 Inicialización de la base de datos
- Se ejecutó `initAll()` desde el editor GAS (creó las 9 hojas con encabezados)
- Usuario admin insertado manualmente en hoja `usuarios`:
  - id_usuario: `USR_ADMIN_001`
  - usuario: `admin`
  - password_hash: credencial inicial retirada de la documentacion
  - rol: `admin`, activo: `true`

### 2.5 Correcciones CORS
- **Problema**: `Content-Type: application/json` en las llamadas POST disparaba un preflight CORS que GAS no maneja
- **Fix**: cambiado a `Content-Type: text/plain;charset=UTF-8` en `assets/js/api.js` — GAS parsea el JSON del body igualmente, el browser no envía preflight

### 2.6 Configuración del deployment GAS
- **Problema**: deployment original creado con acceso "Cualquier usuario de Google" (requiere auth)
- **Fix**: creado nuevo deployment con acceso "Cualquier persona" (anónimo)
- URL de producción final:
  `https://script.google.com/macros/s/AKfycbxmfkifnwz3WoaCzzTAmQO0TuvRwenmiJY3GSdEYqi564TtoCbEOTzD7CTgK4-vaOWKjQ/exec`

### 2.7 GitHub Pages
- Repo: `https://github.com/censoescuelaspy/CIALPAappencuesta`
- Rama: `main`, raíz `/`
- URL pública: `https://censoescuelaspy.github.io/CIALPAappencuesta/`
- Commits realizados:
  - `feat: CIALPA v2.0 — deploy completo a produccion`
  - `fix: remove temporary initSetup endpoint from Code.gs`
  - `fix: use text/plain Content-Type to avoid CORS preflight with GAS`
  - `fix: update GAS_URL to anonymous-access deployment`

### 2.8 `assets/js/config.js` — valores de producción
```javascript
GAS_URL: 'https://script.google.com/macros/s/AKfycbxmfkifnwz3WoaCzzTAmQO0TuvRwenmiJY3GSdEYqi564TtoCbEOTzD7CTgK4-vaOWKjQ/exec'
FORM_URL: (pendiente — URL del formulario MEC en producción)
```

---

## 3. Lecciones aprendidas / problemas resueltos

| Problema | Causa raíz | Solución |
|---|---|---|
| `initAll()` no creaba admin | `SpreadsheetApp.getUi()` falla en scripts standalone | Inserción manual en Spreadsheet |
| CORS preflight | `Content-Type: application/json` en fetch POST | Cambiar a `text/plain;charset=UTF-8` |
| Login bloqueado (403) | Deployment configurado con acceso restringido a Google | Nuevo deployment con acceso "Cualquier persona" |
| clasp no encontraba proyecto | clasp autenticado con cuenta diferente (`apoyomedicoips`) | Uso de Script ID directo en `.clasp.json` |

---

## 4. Estado final — 2026-04-28

| Componente | Estado | URL / Detalle |
|---|---|---|
| Frontend | **PRODUCCIÓN** | https://censoescuelaspy.github.io/CIALPAappencuesta/ |
| Backend GAS | **PRODUCCIÓN** | Deployment @7, acceso anónimo |
| Google Sheets | **OPERATIVO** | 9 hojas creadas, admin configurado |
| Login | **FUNCIONAL** | admin con credencial temporal inicial |

---

## 5. Pendientes post-deploy

| Tarea | Prioridad | Detalle |
|---|---|---|
| Cambiar contraseña admin | **CRÍTICA** | Cambiar la credencial temporal desde módulo Configuración |
| Importar escuelas | Alta | Ejecutar `importEscuelas()` en GAS con datos del TXT |
| FORM_URL de producción | Alta | Confirmar URL real del formulario MEC/RUE con el MEC |
| Geocodificar escuelas | Media | Campo lat/lng vacío en datos actuales |
| Crear encuestadores | Media | Alta manual o importación desde módulo Admin |
| Catálogo de configuraciones | Baja | Revisar y ajustar valores en hoja `configuracion` |

---

## 6. Credenciales de acceso (producción)

| Recurso | Detalle |
|---|---|
| App web | https://censoescuelaspy.github.io/CIALPAappencuesta/ |
| Spreadsheet | https://docs.google.com/spreadsheets/d/1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg/edit |
| GAS Editor | https://script.google.com/u/0/home/projects/1dQePnMTegZBIyN9SRYTAkPxDyBUiZejVi6WqXpv6_LrBAIVTir3ne4S2/edit |
| GitHub repo | https://github.com/censoescuelaspy/CIALPAappencuesta |
| Admin inicial | usuario: `admin` / contraseña temporal generada por `setup.gs` (**cambiar inmediatamente**) |

---

*Bitácora generada: 2026-04-28*

---

## Ajuste de estirado directo del perimetro - 2026-05-31

### Objetivo
- Permitir que el operador aumente o reduzca largo y ancho del perimetro escolar sin quedar bloqueado por el modo de edicion de vertices.
- Mantener la edicion fina de vertices como accion explicita mediante `Editar perimetro`.

### Problema reportado
- Al seleccionar un perimetro, no era posible estirarlo en largo/ancho de forma comoda; los controles de tamano quedaban bloqueados si el perimetro no estaba en modo de edicion.

### Cambios implementados
- `assets/js/mec-form.js`: el perimetro seleccionado ahora es objetivo valido para cambio de tamano aunque no este activo `Editar perimetro`.
- `assets/js/mec-form.js`: los tiradores de redimensionado se dibujan y responden al seleccionar el perimetro.
- `assets/js/mec-form.js`: se agregan botones visibles `Largo +`, `Largo -`, `Ancho +`, `Ancho -` en la cinta de herramientas del perimetro.
- `assets/js/config.js`, `index.html`, `sw.js`: version actualizada a `2.6.151` para cache-busting y trazabilidad.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local: `http://127.0.0.1:8765/` responde `200`.

---

## Separadores jalables y vertices directos del perimetro - 2026-06-02

### Objetivo
- Ignorar los timelapse MP4 sin seguimiento y concentrar el ajuste en la app web.
- Permitir ajustar segmentos/paneles jalando separadores donde corresponda.
- Hacer que el perimetro amarillo se edite desde sus vertices visibles, sin la sensacion de estar encerrado dentro de otro objeto.

### Problema reportado
- Los separadores entre preguntas, mapa y paneles no podian reajustarse con arrastre.
- El perimetro seguia siendo dificil de manipular porque los vertices visibles se solapaban con una caja de control y parecia existir un doble poligono.

### Cambios implementados
- `assets/js/guided-register.js` y `assets/css/app.css`: se agrego separador horizontal jalable para el alto del plano vivo del registro guiado.
- `assets/js/mec-form.js`, `assets/css/mec-form.css` y `assets/css/app.css`: se agrego separador vertical jalable para el ancho del panel lateral del plano.
- `assets/js/mec-form.js`: los vertices del perimetro del predio ahora tienen tiradores amarillos mas grandes y area tactil ampliada.
- `assets/js/mec-form.js`: al jalar un vertice del perimetro, el contorno expande/recalcula su caja interna automaticamente en vez de quedar limitado.
- `assets/js/mec-form.js`: se evito la doble linea del perimetro durante la edicion; la capa georreferenciada conserva etiquetas/pines sin crear un segundo poligono encima.
- `assets/js/config.js`, `index.html`, `sw.js`: version actualizada a `2.6.163` para cache-busting y trazabilidad.

### Validaciones ejecutadas
- `node --check assets/js/guided-register.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.

### Estado
- Commit publicado en este cambio: `feat: habilitar estirado del perimetro`.

---

## Reanudar escuela activa tras Actualizar app - 2026-05-31

### Objetivo
- Evitar que el boton `Actualizar app` devuelva automaticamente a Inicio cuando el operador esta completando una escuela.
- Restaurar el modulo, la escuela activa, la etapa MEC y filtros de mapa despues de limpiar cache y recargar.

### Problema reportado
- Durante la carga de una escuela, al pulsar `Actualizar app` se reiniciaba la vista en Inicio y costaba volver a encontrar la escuela que estaba en proceso.

### Cambios implementados
- `assets/js/app.js`: antes de actualizar se guarda en `sessionStorage` el contexto de reanudacion con modulo activo, escuela, etapa MEC, filtros y scroll.
- `assets/js/app.js`: al reiniciar se consume ese contexto y se reabre el modulo anterior sin limpiar la seleccion de escuela.
- `assets/js/app.js`: si la escuela estaba activa, se restaura en `SurveyModule`, `MecFormModule`, `GuidedRegisterModule` y, si corresponde, se enfoca en el mapa.
- `assets/js/mec-form.js`: se exponen `getSelectedSchool()` y `getActiveModule()` para que el controlador pueda capturar contexto sin depender solo del mapa.
- `assets/js/config.js`, `index.html`, `sw.js`: version actualizada a `2.6.152` para cache-busting y trazabilidad.

### Validaciones ejecutadas
- `node --check assets/js/app.js`.
- `node --check assets/js/mec-form.js`.
- `node --check assets/js/config.js`.
- `node --check sw.js`.
- `git diff --check`.
- Verificacion local: `http://127.0.0.1:8765/` responde `200`.
