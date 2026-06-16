# Secuencia de prompts - CIALPA - ultima edicion 2026-06-12

## Proyecto
- Nombre: CIALPA - Relevamiento Escolar.
- Ruta local: `G:\Mi unidad\CIALPA\06_APP`.
- URL publica: https://censoescuelaspy.github.io/CIALPAappencuesta/
- Version vigente de esta intervencion: `2.6.189`.

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
