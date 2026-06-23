# Secuencia de prompts - CIALPA - ultima edicion 2026-06-23

## Proyecto
- Nombre: CIALPA - Relevamiento Escolar.
- Ruta local: `G:\Mi unidad\CIALPA\06_APP`.
- URL publica: https://censoescuelaspy.github.io/CIALPAappencuesta/
- Version vigente de esta intervencion: `2.6.191`.

## Secuencia resumida
- Se solicito estudiar la bitacora del proyecto CIALPA y continuar una nueva version enfocada en registro arquitectonico, electrico, desague y conexion de agua, manteniendo danos y fallas.
- Se corrigieron problemas previos de filtros de mapeo, reapertura de registros finalizados, visibilidad admin de formularios, versionado y carga de datos guardados.
- Se actualizo el despliegue GAS indicado por el usuario y se incorporaron capas de perimetros guardados por escuela en el mapa.
- Se agregaron mediciones de perimetros desde vertices georreferenciados.
- Se integro Catastro SNC como capa WMS en el mapa principal y luego consulta de metadatos por popup con cache local.
- En una intervencion se solicito colocar tambien la capa de Catastro en `REGISTRO GUIADO` sobre el mapa en alta resolucion.
- En la intervencion actual se reporto que Catastro cargaba, pero la alta resolucion dejo de cargar; tambien se pidieron estados activos visibles, rotacion/alineacion automatica, mas zoom en `MAPA`, capa de planos/perimetros, predio preliminar desde Catastro y mejor administracion de carga por censista.
- Luego se reporto que el boton `Iniciar/continuar registro` no llevaba a la vista `REGISTRO GUIADO`.
- Luego se reporto que, estando logueado como admin, no se podia agregar ni quitar encuestadores; la app mostraba el error `Solo administradores autorizados pueden gestionar usuarios`.
- En una continuacion posterior se reporto que la nueva version dejo de mostrar el mapa en `Alta res.` dentro de `REGISTRO GUIADO`.
- Finalmente se solicito obtener todo lo necesario para poder agregar mapas de alta resolucion a la mayor cantidad posible de escuelas.
- En la intervencion del 2026-06-23 se reporto diferencia entre la cantidad vista en el mapa y el KPI superior `Pendientes`.

## Decision tecnica de esta intervencion
- `REGISTRO GUIADO` reutiliza el plano canvas de `MecFormModule`; por eso Catastro se implemento como teselas WMS transparentes bajo el canvas y sobre la base satelital/alta resolucion.
- Se reutilizo `APP_CONFIG.MAP_CADASTRAL_LAYERS` para mantener una sola fuente oficial de URL, capa, opacidad y metadatos de Catastro SNC.
- Las teselas WMS se solicitan con `WIDTH=512` y `HEIGHT=512` para mejorar nitidez visual en la superposicion.
- El estado `cadastralOverlay` y `cadastralOpacity` queda guardado dentro de `__planBaseMap`.
- Para `2.6.185`, el acceso rapido `Alta res.` usa la mejor fuente disponible y vuelve a una base alternativa si Google Map Tiles falla.
- La alineacion automatica rota la base usando el lado dominante del perimetro o estructura seleccionada; no modifica silenciosamente la geometria.
- `Predio SNC` consulta `GetFeatureInfo` y solo aplica un poligono preliminar si Catastro devuelve geometria valida; el censista puede editar vertices libremente.
- El admin agrega resumen por censista, ordenamiento por columnas y exportacion CSV de formularios visibles.
- Para `2.6.186`, se corrigio la apertura de `REGISTRO GUIADO` cuando la escuela no tiene perimetro guardado: la lectura de perimetro ahora tolera `null` y no bloquea el arranque.
- Para la gestion de encuestadores, se identifico una diferencia entre permiso visual y permiso real: la UI reconocia el rol admin, pero GAS exigia ademas pertenecer a una lista fija local de usuarios autorizados.
- Se corrigio `_isAuthorizedAdmin(session)` para aceptar roles admin normalizados y dejar la lista restrictiva solo como propiedad opcional `CIALPA_AUTHORIZED_ADMIN_USERS`.
- El codigo corregido fue subido a GAS y versionado como version 37, pero los deployments version 37 probados devuelven `403 Forbidden` en HTTP anonimo aunque la metadata figure como `ANYONE_ANONYMOUS`; no se cambio el fallback estable para evitar dejar la app sin backend publico.
- Para `2.6.187`, se verifico que Google Map Tiles seguia creando sesion (`createSession 200`), pero la descarga real de teselas `2dtiles` devolvia `403 PERMISSION_DENIED`.
- Se corrigio `assets/js/mec-form.js` para que la vista `Alta res.` haga fallback automatico cuando falle una tesela Google, no solo cuando falle `createSession`.
- Para `2.6.188`, se saco a Google de la ruta normal de `Alta res.`: la app ahora usa imagen local si existe y, en caso contrario, satelite Esri como base operativa por defecto.
- Para `2.6.189`, se reactivo explicitamente la fuente local `101095` ya presente en `assets/imagery/schools/101095/tiles/`, porque `PLAN_BASEMAP_HIGHRES_SOURCES` habia quedado vacio.
- `Alta res.` ahora tambien avisa cuando la escuela activa no tiene ortofoto local y se mantiene en satelite estable, evitando la sensacion de fallo silencioso.
- Para `2.6.190`, la UI deja de llamar `Alta res.` a escuelas sin fuente local HD: el boton pasa a `Satelite` y el estado visible marca `sin imagen local HD`.
- Se verifico que hoy la cobertura HD local real del repo sigue limitada al piloto `101095`, por lo que la falta de alta resolucion en muchas escuelas es un problema de insumos y no de renderizado.
- Para escalar cobertura se dejo preparada la ruta Earth Engine/NICFI: worklist privada de `86` escuelas confirmada, carpeta de descargas `G:\Mi unidad\CIALPA_EE_PILOTO_ESCUELAS` creada y cuatro tandas JS generadas para exportacion por lotes.
- Se agrego `tools/earthengine/prepare_highres_batches.ps1` para regenerar lotes, preparar directorios y ejecutar despues la instalacion/activacion de descargas cuando existan los TIFF exportados.
- El bloqueo operativo restante no esta en el repo: la CLI `earthengine` y el modulo Python `ee` existen en esta maquina, pero el acceso actual responde `Not signed up for Earth Engine or project is not registered` al consultar NICFI.
- En la continuacion siguiente, el usuario completo la autenticacion Earth Engine; `earthengine task list` paso a responder correctamente, pero la coleccion `projects/planet-nicfi/assets/basemaps/americas` sigue devolviendo `Permission 'earthengine.assets.get' denied`.
- Para `2.6.191`, se aclaro la diferencia entre conteos: `Inicio` muestra `Pendientes operativas` globales, mientras el mapa muestra conteos de la vista actual con filtros y marcador/georreferenciacion.
- El criterio operativo queda: para planificacion general rige el KPI global; para trabajo territorial inmediato rige el resumen del mapa filtrado/georreferenciado.

## Archivos principales tocados
- `assets/js/mec-form.js`
- `assets/js/guided-register.js`
- `assets/js/config.js`
- `assets/css/app.css`
- `assets/js/map.js`
- `assets/js/admin.js`
- `gas/Code.gs`
- `assets/js/mec-form.js`
- `index.html`
- `sw.js`
- `BITACORA.md`
- `tools/earthengine/prepare_highres_batches.ps1`
- `README.md`

## Validacion registrada
- Sintaxis JavaScript validada con `node --check`.
- `git diff --check` sin errores.
- App local verificada por HTTP en `http://127.0.0.1:8091/index.html`.
- Google Map Tiles verificado con `createSession` `200`.
- WMS SNC verificado con `GetCapabilities` `200`.
- Playwright no se ejecuto porque `@playwright/test` no esta instalado en este checkout.
- En `2.6.186`, Playwright se ejecuto desde entorno temporal fuera de Google Drive; `MapModule.startGuidedRegister('ESC_TEST_GUIDED')` termino en `module-registro` con `.guided-register` renderizado y sin errores de consola.
- Para la gestion de encuestadores se verifico por lectura de codigo que `saveEncuestador` y `deleteEncuestador` dependen de `_isAuthorizedAdmin(session)`.
- Se verifico que la URL fallback `AKfycbzrXilB80CszA0EDVj-SO7rJ9SmDY1Yg_Ym1qFgKmSdgfftK0uo1uRclsEq4uroSnfSJQ` responde JSON publico, mientras los deployments version 37 probados responden `403 Forbidden`.
- Para la alta resolucion se verifico `createSession 200` en Google Map Tiles y `2dtiles 403 PERMISSION_DENIED`, confirmando que el boton no estaba roto: la fuente Google estaba siendo rechazada al pedir imagenes.
- Para `2.6.189`, se verifico por inspeccion del repo que existen tiles locales y manifiesto de `101095`, y se restablecio su entrada operativa en `APP_CONFIG`.
- Para `2.6.190`, se verifico en navegador automatizado que `101095` carga la imagen local HD y que una escuela comun cambia correctamente a boton/estado `Satelite`.
- Se verifico que `tools/earthengine/output/pilot-schools-worklist.json` contiene `86` escuelas de muestra piloto y se regeneraron tandas `01_25`, `26_50`, `51_75` y `76_86`.
- `earthengine --help` y `py -3 -c "import ee"` funcionan en esta maquina, pero `earthengine ls projects/planet-nicfi/assets/basemaps/americas` y `earthengine task list` siguen bloqueados por falta de alta/registro del proyecto Earth Engine.
- `py -3 tools\earthengine\start_pilot_ee_exports.py --source=nicfi --limit=1 --dry-run` corrio correctamente y genero evidencia de preparacion en `tools/earthengine/output/submitted-ee-tasks-nicfi-20260616-160815.json`.
- Tras autenticar Earth Engine, `earthengine task list` quedo operativo, confirmando que la cuenta ya accede al servicio base.
- Aun asi, `earthengine ls projects/planet-nicfi/assets/basemaps/americas` responde `Permission 'earthengine.assets.get' denied`, por lo que sigue faltando el permiso especifico a Planet/NICFI antes de exportar la tanda real `01_25`.
- Para `2.6.191`, `node --check assets/js/map.js`, `node --check assets/js/config.js` y `git diff --check` pasan sin errores.
- La validacion navegada con Playwright no se pudo completar porque `node_modules/@playwright/test/package.json` esta invalido en este checkout (`ERR_INVALID_PACKAGE_CONFIG`).
- Se publico el hotfix con commit `6e924b7`; `origin/main` quedo en `6e924b7296b41de367fb68687a0588c0c5ec1d37`.
- GitHub Pages reporto build exitoso y la URL publica `index.html` con cache-busting ya devuelve `v2.6.191`.
- Para `2.6.192`, se aclaro el caso Amambay: `pendientes` y `total` son conteos operativos; el numero del mapa es conteo de registros con coordenadas validas.
- Se agregaron campos `con_coordenadas`, `sin_coordenadas`, `pendientes_con_coordenadas` y `pendientes_sin_coordenadas` al resumen territorial local/frontend y al backend preparado.
- `node --check assets/js/stats.js`, `node --check assets/js/local-store.js`, `node --check assets/js/config.js` y `git diff --check` pasan sin errores.
