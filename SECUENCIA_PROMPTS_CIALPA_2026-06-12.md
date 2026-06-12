# Secuencia de prompts - CIALPA - ultima edicion 2026-06-12

## Proyecto
- Nombre: CIALPA - Relevamiento Escolar.
- Ruta local: `G:\Mi unidad\CIALPA\06_APP`.
- URL publica: https://censoescuelaspy.github.io/CIALPAappencuesta/
- Version vigente de esta intervencion: `2.6.185`.

## Secuencia resumida
- Se solicito estudiar la bitacora del proyecto CIALPA y continuar una nueva version enfocada en registro arquitectonico, electrico, desague y conexion de agua, manteniendo danos y fallas.
- Se corrigieron problemas previos de filtros de mapeo, reapertura de registros finalizados, visibilidad admin de formularios, versionado y carga de datos guardados.
- Se actualizo el despliegue GAS indicado por el usuario y se incorporaron capas de perimetros guardados por escuela en el mapa.
- Se agregaron mediciones de perimetros desde vertices georreferenciados.
- Se integro Catastro SNC como capa WMS en el mapa principal y luego consulta de metadatos por popup con cache local.
- En una intervencion se solicito colocar tambien la capa de Catastro en `REGISTRO GUIADO` sobre el mapa en alta resolucion.
- En la intervencion actual se reporto que Catastro cargaba, pero la alta resolucion dejo de cargar; tambien se pidieron estados activos visibles, rotacion/alineacion automatica, mas zoom en `MAPA`, capa de planos/perimetros, predio preliminar desde Catastro y mejor administracion de carga por censista.

## Decision tecnica de esta intervencion
- `REGISTRO GUIADO` reutiliza el plano canvas de `MecFormModule`; por eso Catastro se implemento como teselas WMS transparentes bajo el canvas y sobre la base satelital/alta resolucion.
- Se reutilizo `APP_CONFIG.MAP_CADASTRAL_LAYERS` para mantener una sola fuente oficial de URL, capa, opacidad y metadatos de Catastro SNC.
- Las teselas WMS se solicitan con `WIDTH=512` y `HEIGHT=512` para mejorar nitidez visual en la superposicion.
- El estado `cadastralOverlay` y `cadastralOpacity` queda guardado dentro de `__planBaseMap`.
- Para `2.6.185`, el acceso rapido `Alta res.` usa la mejor fuente disponible y vuelve a una base alternativa si Google Map Tiles falla.
- La alineacion automatica rota la base usando el lado dominante del perimetro o estructura seleccionada; no modifica silenciosamente la geometria.
- `Predio SNC` consulta `GetFeatureInfo` y solo aplica un poligono preliminar si Catastro devuelve geometria valida; el censista puede editar vertices libremente.
- El admin agrega resumen por censista, ordenamiento por columnas y exportacion CSV de formularios visibles.

## Archivos principales tocados
- `assets/js/mec-form.js`
- `assets/js/guided-register.js`
- `assets/js/config.js`
- `assets/css/app.css`
- `assets/js/map.js`
- `assets/js/admin.js`
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
