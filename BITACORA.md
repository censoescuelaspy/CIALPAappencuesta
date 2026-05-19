# CIALPA — Bitácora de Implementación
**Relevamiento de Infraestructura Escolar — Paraguay 2026**
**Financiado por:** Banco Mundial

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
