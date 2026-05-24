# Procedimiento para levantar, validar y publicar cambios CIALPA

Este documento describe el procedimiento operativo que uso para llevar un cambio desde el pedido inicial hasta la publicacion verificable en GitHub Pages, Apps Script y, cuando aplica, PostgreSQL.

La regla de trabajo es simple: un cambio no se considera terminado cuando el codigo compila; se considera terminado cuando la URL publicada o el entorno operativo correspondiente muestran la version correcta, sin errores visibles, con bitacora actualizada y con evidencia de validacion.

## 1. Herramientas usadas

### Herramientas locales

- `PowerShell`: consola principal en Windows.
- `git`: control de versiones, revision de cambios, commit y push.
- `rg`: busqueda rapida de archivos, funciones, textos de UI, versiones y referencias viejas.
- `node`: validacion sintactica de JavaScript, scripts utilitarios, servidores locales y pruebas puntuales.
- `npm`: ejecucion de scripts del proyecto.
- `Playwright`: pruebas visuales y funcionales en navegador, escritorio y movil.
- `apply_patch`: edicion controlada de archivos del repositorio.
- `psql` / PostgreSQL local: verificacion de base formal cuando el cambio toca datos.
- `clasp.cmd`: subida de codigo a Google Apps Script.
- `gcloud.cmd`: despliegues o preparacion de Cloud Run/Cloud SQL cuando corresponde.

### Servicios externos

- GitHub Pages: publicacion del frontend estatico.
- Google Apps Script: backend operativo.
- Google Sheets: respaldo operativo y hojas de control.
- Google Drive: evidencia, adjuntos y payloads completos.
- PostgreSQL: base formal transaccional.
- Cloud Run / Cloud SQL / Supabase / AlloyDB: destino administrado posible para la API relacional.

### Credenciales y accesos recurrentes

No guardo contrasenas, tokens ni claves privadas en el repositorio, en la bitacora ni en la memoria. Lo que si conviene recordar son accesos operativos no secretos: usuarios, cuentas colaboradoras habituales, comandos de verificacion y responsables de publicar.

Para GitHub:

- La cuenta `diegomezapy` debe tratarse como colaborador habitual de los proyectos del usuario.
- Antes de pedir credenciales, verifico si la maquina ya tiene acceso al remoto:

```powershell
git remote -v
git config --get user.name
git config --get user.email
git ls-remote origin HEAD
```

- Si existe GitHub CLI, tambien puedo revisar:

```powershell
gh auth status
```

- Si el push falla por permisos, no insisto con tokens en texto plano. Informo el error exacto y pido habilitar acceso, iniciar sesion o confirmar que `diegomezapy` este como colaborador con permiso de escritura.
- No escribo `GITHUB_TOKEN`, PATs ni credenciales en archivos versionados.

Para Google Apps Script y Google Cloud:

- Verifico la cuenta activa antes de subir o desplegar:

```powershell
clasp.cmd show-authorized-user
gcloud.cmd auth list
gcloud.cmd config get-value project
```

- `clasp push -f` puede subir a HEAD con una cuenta colaboradora, pero el Web App productivo puede requerir publicacion desde la cuenta propietaria.
- Si el deployment debe hacerlo la cuenta propietaria, dejo el pendiente operativo documentado en `BITACORA.md`.
- Los tokens de sincronizacion a PostgreSQL se cargan como Script Properties, variables de entorno o Secret Manager, no en archivos del repo.

Para PostgreSQL:

- `DATABASE_URL`, `DATABASE_SYNC_TOKEN` y claves de proveedor se manejan como variables de entorno o secretos.
- En ejemplos locales uso valores ficticios como `token-local`.
- Antes de ejecutar una escritura real, confirmo contra que endpoint y base se esta apuntando.

## 2. Revision inicial del estado del proyecto

Antes de editar, reviso el estado del repositorio:

```powershell
git status --branch --short
git log --oneline -10
```

Si necesito saber si hay cambios remotos:

```powershell
git fetch origin --prune
git status --branch --short
```

Reglas que aplico:

- Si el arbol esta limpio, trabajo directamente en la carpeta actual.
- Si hay cambios locales del usuario, no los revierto.
- Si hay cambios locales ajenos y el cambio pedido es urgente, uso un worktree o clon limpio basado en `origin/main`.
- Nunca uso `git reset --hard` ni `git checkout --` sobre trabajo ajeno.
- Si un archivo ya tiene cambios, lo leo antes de modificarlo para no pisar trabajo reciente.

## 3. Lectura de contexto

Antes de implementar busco el flujo afectado:

```powershell
rg -n "texto_o_funcion" assets gas tools docs
rg -n "2.6." index.html assets/js sw.js
```

Los archivos que suelo revisar segun el tipo de cambio:

- Frontend general: `index.html`, `assets/js/app.js`, `assets/css/app.css`, `assets/js/config.js`, `sw.js`.
- API frontend: `assets/js/api.js`.
- Mapa: `assets/js/map.js`.
- Registro guiado y plano: `assets/js/guided-register.js`, `assets/js/mec-form.js`, `assets/js/mec-schema.js`.
- Cuestionario inicial R01: `cuestionario_inicial/index.html`, `assets/js/initial-questionnaire.js`.
- Tableros: `assets/js/stats.js`, `assets/data/*.json`.
- Backend Apps Script: `gas/*.gs`, `gas/appsscript.json`.
- Base de datos: `tools/database/*.mjs`, `tools/database/*.sql`, `tools/database/*.ps1`.
- Documentacion operativa: `BITACORA.md`, `README.md`, `docs/*.md`.

## 4. Implementacion del cambio

El cambio se hace con ediciones acotadas y siguiendo patrones existentes. Para cambios manuales uso `apply_patch`.

Principios:

- Mantener el estilo del codigo existente.
- No crear abstracciones nuevas si una funcion local ya resuelve el mismo problema.
- No mezclar refactors ajenos con el pedido principal.
- Evitar catologos o reglas quemadas si ya hay fuente en Sheets, JSON o configuracion.
- Mantener compatibilidad con cache viejo y modo offline cuando el flujo sea de campo.
- En cambios visuales, validar escritorio y movil.

## 5. Version, cache y assets

Cuando el cambio afecta la app publicada, subo version visible y cache.

Archivos habituales:

- `assets/js/config.js`: `APP_VERSION`.
- `sw.js`: nombre de cache, por ejemplo `cialpa-app-v2.6.132`.
- `index.html`: query string de assets, por ejemplo `?v=2.6.132`.
- JS con encabezado visible de version, cuando el modulo lo usa.
- JSON demo o assets precacheados, si cambian.

Busco referencias viejas antes de cerrar:

```powershell
rg -n "2.6.131|cialpa-app-v2.6.131" index.html assets sw.js
```

No subo version si el cambio es solo documentacion y no afecta app, cache ni comportamiento publicado.

## 6. Validacion sintactica local

Para JavaScript:

```powershell
node --check assets/js/app.js
node --check assets/js/api.js
node --check assets/js/config.js
node --check assets/js/stats.js
node --check assets/js/initial-questionnaire.js
node --check sw.js
```

Para modulos MEC:

```powershell
node --check assets/js/mec-form.js
node --check assets/js/guided-register.js
node --check assets/js/mec-schema.js
```

Para herramientas:

```powershell
node --check tools/database/cialpa_db_api.mjs
node --check tools/database/consolidate_db_queue.mjs
node --check tools/simulation/cialpa_bulk_demo_responses.mjs
```

Para JSON:

```powershell
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
```

Para Apps Script, como GAS no se ejecuta nativamente con Node, valido sintaxis de los `.gs` con un parser Node cuando corresponde. Tambien reviso `gas/appsscript.json`.

## 7. Levantar la app localmente

Para una app estatica, levanto un servidor local desde la raiz. Si el puerto esta ocupado, uso otro.

Ejemplo:

```powershell
npx.cmd http-server . -p 8065 -c-1
```

Alternativa con Node si no quiero depender de un paquete global:

```powershell
node tools/simulation/local_static_server.mjs --port=8065
```

Si no existe un servidor dedicado en el repo, uso un servidor temporal de Node o una herramienta equivalente, siempre apuntando a la raiz del proyecto.

Despues abro:

```text
http://127.0.0.1:8065/
```

## 8. Pruebas locales con navegador

Uso Playwright para verificar que el flujo abre, renderiza y no rompe consola.

Validaciones frecuentes:

- version visible correcta;
- modulo esperado visible;
- textos nuevos presentes;
- botones o filtros operativos;
- ausencia de errores de consola;
- ausencia de `pageerror`;
- ausencia de overflow horizontal;
- desktop y movil `390x844`.

Cuando aplica:

```powershell
npm.cmd run simulate:ui
```

Para metricas web:

```powershell
npm.cmd run metrics:web -- --cache-bust
```

Si la prueba necesita un estado simulado, inyecto sesion o intercepto llamadas desde Playwright para no escribir en produccion.

## 9. Validacion de backend Apps Script

Cuando el cambio toca `gas/*.gs`, hago:

```powershell
clasp.cmd show-authorized-user
clasp.cmd push -f
clasp.cmd deployments
```

Criterios importantes:

- `clasp push -f` sube a HEAD, pero no siempre actualiza el Web App publicado.
- El deployment publico debe actualizarse desde la cuenta propietaria o aceptada del Web App.
- Si una sesion local tiene historial de HTTP 403, no fuerzo redeploy riesgoso.
- Cuando se publica un nuevo Web App, actualizo `APP_CONFIG.GAS_URL` y verifico endpoint real.

Pruebas HTTP minimas del Web App:

```powershell
node -e "fetch('https://script.google.com/macros/s/DEPLOYMENT/exec?action=diagnosticoPadron').then(r=>r.text()).then(console.log)"
```

Endpoints que suelo probar:

- `login` sin credenciales: debe responder validacion publica, no HTTP 403.
- `diagnosticoPadron`: debe responder conteos y fuente.
- endpoints protegidos sin token: deben responder `Token invalido o expirado`.
- endpoints publicos, si aplica: deben responder validacion de campos, no token.

## 10. Validacion de PostgreSQL y API relacional

Cuando el cambio toca base de datos:

```powershell
npm.cmd run db:local
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:55432/cialpa'
npm.cmd run db:schema
```

Para levantar la API local:

```powershell
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:55432/cialpa'
$env:DATABASE_SYNC_TOKEN='token-local'
$env:APPLY_SCHEMA_ON_START='true'
npm.cmd run db:api
```

Verifico salud:

```powershell
node -e "fetch('http://127.0.0.1:8787/health').then(r=>r.json()).then(console.log)"
```

Para consolidacion:

```powershell
npm.cmd run db:consolidate -- --help
npm.cmd run db:consolidate -- --jsonl tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl --limit 2 --no-report
npm.cmd run db:consolidate -- --jsonl tools/simulation/demo-output/demo-responses-demo1000_20260521.jsonl --limit 2 --write --token token-local --no-report
```

Luego consulto conteos:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "postgresql://postgres@127.0.0.1:55432/cialpa" -c "SELECT count(*) FROM mec_drafts;"
```

Tambien verifico idempotencia: repetir el mismo payload no debe duplicar aulas, sanitarios, exteriores ni mutaciones.

## 11. Revision de diferencias antes de publicar

Antes del commit:

```powershell
git diff --check
git status --branch --short
git diff --stat
```

`git diff --check` puede mostrar advertencias esperadas LF/CRLF en este proyecto, pero no debe mostrar espacios conflictivos reales.

Tambien reviso que no entren:

- reportes privados;
- exports de Sheets;
- payloads reales;
- carpetas `output/`;
- credenciales;
- tokens;
- archivos temporales.

## 12. Commit y push

Uso mensajes cortos y descriptivos:

```powershell
git add archivo1 archivo2 docs
git commit -m "feat: describir cambio v2.6.xxx"
git push origin main
```

Si el cambio es documentacion:

```powershell
git commit -m "docs: documentar procedimiento operativo"
```

Despues del push, espero a que GitHub Pages publique y verifico por HTTP.

## 13. Verificacion HTTP de GitHub Pages

La URL publica principal:

```text
https://censoescuelaspy.github.io/CIALPAappencuesta/
```

Verificaciones frecuentes:

```powershell
node -e "fetch('https://censoescuelaspy.github.io/CIALPAappencuesta/assets/js/config.js?v=2.6.132&qa=' + Date.now()).then(r=>r.text()).then(t=>console.log(t.includes('2.6.132')))"
node -e "fetch('https://censoescuelaspy.github.io/CIALPAappencuesta/sw.js?qa=' + Date.now()).then(r=>r.text()).then(t=>console.log(t.includes('cialpa-app-v2.6.132')))"
node -e "fetch('https://censoescuelaspy.github.io/CIALPAappencuesta/index.html?qa=' + Date.now()).then(r=>r.text()).then(t=>console.log(t.includes('v2.6.132')))"
```

Tambien busco textos clave del cambio:

```powershell
node -e "fetch('https://censoescuelaspy.github.io/CIALPAappencuesta/index.html?qa=' + Date.now()).then(r=>r.text()).then(t=>console.log(t.includes('Consolidacion historica')))"
```

## 14. Pruebas remotas con Playwright

Despues de confirmar assets publicados, abro la URL real con Playwright.

Valido:

- desktop;
- movil `390x844`;
- version visible;
- texto o modulo nuevo;
- consola sin errores;
- sin overflow horizontal;
- si corresponde, interaccion principal.

Esto evita declarar publicada una mejora que solo funciono localmente.

## 15. Bitacora

Cada intervencion relevante queda arriba de `BITACORA.md`.

Formato recomendado:

```markdown
## Titulo operativo - YYYY-MM-DD - vX.Y.Z

### Objetivo
- Que se busco resolver.

### Diagnostico
- Que se encontro antes de tocar.

### Cambios implementados
- Archivos, flujos y comportamientos agregados o corregidos.

### Pendiente operativo
- Acciones externas: publicar GAS propietario, pedir Actualizar app, ejecutar migracion, configurar token, etc.

### Validaciones ejecutadas
- Comandos locales.
- Pruebas Playwright.
- Commit y push.
- Verificaciones HTTP de GitHub Pages.
- Verificaciones backend o SQL si aplican.
```

La bitacora debe decir la verdad operacional: si algo quedo pendiente por cuenta propietaria, permisos de Google, token o proveedor administrado, se registra como pendiente.

## 16. Criterio de terminado

Un cambio queda terminado cuando se cumple lo que aplique:

- codigo modificado y guardado;
- version/cache actualizados si la app cambio;
- validacion sintactica OK;
- prueba local OK;
- prueba movil OK;
- `git diff --check` OK;
- commit creado;
- push a `origin/main`;
- GitHub Pages verificado por HTTP;
- Playwright remoto OK;
- Apps Script publicado o pendiente documentado;
- PostgreSQL/API verificado o pendiente documentado;
- `BITACORA.md` actualizado con evidencia.

## 17. Casos especiales

### Cuando solo cambia documentacion

- No subo `APP_VERSION`.
- No cambio `sw.js`.
- No fuerzo cache nuevo.
- Igual ejecuto `git diff --check`.
- Registro la documentacion si afecta operacion del proyecto.

### Cuando cambia Apps Script

- `clasp push -f` no basta para produccion.
- Debe existir deployment publicado por la cuenta propietaria.
- Se prueba la URL `/exec` activa, no solo HEAD.
- Si el deployment propietario falta, se documenta como pendiente operativo.

### Cuando cambia datos sensibles

- No publico padrones completos sensibles, payloads reales ni exports privados.
- Uso archivos publicos minimos cuando corresponde.
- Carpetas de salida quedan ignoradas por Git.

### Cuando cambia base formal PostgreSQL

- Primero ejecuto local.
- Luego pruebo escritura controlada.
- Luego verifico conteos SQL.
- Luego pruebo reintento idempotente.
- La base administrada final requiere proveedor, URL, token y configuracion de Apps Script.

## 18. Secuencia resumida habitual

```powershell
git status --branch --short
rg -n "texto_o_funcion" assets gas tools docs

# editar con apply_patch

node --check assets/js/app.js
node --check assets/js/api.js
node --check assets/js/config.js
node --check sw.js
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"

npm.cmd run simulate:ui
git diff --check
git status --branch --short

git add .
git commit -m "feat: cambio operativo v2.6.xxx"
git push origin main

# verificacion remota con cache-busting
node -e "fetch('https://censoescuelaspy.github.io/CIALPAappencuesta/assets/js/config.js?qa=' + Date.now()).then(r=>r.text()).then(console.log)"
```

Esta secuencia se amplifica con pruebas GAS, PostgreSQL o Playwright remoto segun el riesgo del cambio.
