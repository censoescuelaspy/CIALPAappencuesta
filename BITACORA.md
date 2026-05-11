# CIALPA — Bitácora de Implementación
**Relevamiento de Infraestructura Escolar — Paraguay 2026**
**Financiado por:** Banco Mundial

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
  - password_hash: SHA-256 de `cialpa2025`
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
| Login | **FUNCIONAL** | admin / cialpa2025 ✓ |

---

## 5. Pendientes post-deploy

| Tarea | Prioridad | Detalle |
|---|---|---|
| Cambiar contraseña admin | **CRÍTICA** | Cambiar `cialpa2025` desde módulo Configuración |
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
| Admin inicial | usuario: `admin` / contraseña: `cialpa2025` (**cambiar inmediatamente**) |

---

*Bitácora generada: 2026-04-28*
