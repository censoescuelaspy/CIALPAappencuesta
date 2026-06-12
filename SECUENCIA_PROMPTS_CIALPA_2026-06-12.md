# Secuencia de prompts - CIALPA - ultima edicion 2026-06-12

## Proyecto
- Nombre: CIALPA - Relevamiento Escolar.
- Ruta local: `G:\Mi unidad\CIALPA\06_APP`.
- URL publica: https://censoescuelaspy.github.io/CIALPAappencuesta/
- Version vigente de esta intervencion: `2.6.184`.

## Secuencia resumida
- Se solicito estudiar la bitacora del proyecto CIALPA y continuar una nueva version enfocada en registro arquitectonico, electrico, desague y conexion de agua, manteniendo danos y fallas.
- Se corrigieron problemas previos de filtros de mapeo, reapertura de registros finalizados, visibilidad admin de formularios, versionado y carga de datos guardados.
- Se actualizo el despliegue GAS indicado por el usuario y se incorporaron capas de perimetros guardados por escuela en el mapa.
- Se agregaron mediciones de perimetros desde vertices georreferenciados.
- Se integro Catastro SNC como capa WMS en el mapa principal y luego consulta de metadatos por popup con cache local.
- En esta intervencion se solicito colocar tambien la capa de Catastro en `REGISTRO GUIADO` sobre el mapa en alta resolucion.

## Decision tecnica de esta intervencion
- `REGISTRO GUIADO` reutiliza el plano canvas de `MecFormModule`; por eso Catastro se implemento como teselas WMS transparentes bajo el canvas y sobre la base satelital/alta resolucion.
- Se reutilizo `APP_CONFIG.MAP_CADASTRAL_LAYERS` para mantener una sola fuente oficial de URL, capa, opacidad y metadatos de Catastro SNC.
- Las teselas WMS se solicitan con `WIDTH=512` y `HEIGHT=512` para mejorar nitidez visual en la superposicion.
- El estado `cadastralOverlay` y `cadastralOpacity` queda guardado dentro de `__planBaseMap`.

## Archivos principales tocados
- `assets/js/mec-form.js`
- `assets/js/guided-register.js`
- `assets/js/config.js`
- `assets/css/mec-form.css`
- `assets/css/app.css`
- `index.html`
- `sw.js`
- `BITACORA.md`

## Validacion registrada
- Sintaxis JavaScript validada con `node --check`.
- `git diff --check` sin errores.
- App local verificada por HTTP en `http://127.0.0.1:8765/`.
- WMS SNC verificado con `GetMap` `200 image/png`.
