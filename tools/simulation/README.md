# Simulacion de cargas CIALPA

Este arnes permite probar el circuito critico de la version vigente de CIALPA:

- login contra el Web App de Apps Script;
- lectura de escuelas;
- escritura controlada en `guardarBorradorMec`;
- verificacion manual posterior en la hoja `mec_borradores`.

## Modo seguro: solo lectura

```powershell
$env:CIALPA_USER='usuario'
$env:CIALPA_PASSWORD='password'
node tools/simulation/cialpa_api_simulator.mjs --list-schools
```

Sin `--write`, el script no guarda nada en Sheets.

## Guardar borradores simulados

```powershell
$env:CIALPA_USER='usuario'
$env:CIALPA_PASSWORD='password'
node tools/simulation/cialpa_api_simulator.mjs --write --school=CODIGO_LOCAL --count=3
```

Use `--count` bajo al principio. Apps Script no es un motor de carga masiva; para pruebas realistas conviene empezar con 1, 3 o 5 escrituras.

## Opciones utiles

```powershell
node tools/simulation/cialpa_api_simulator.mjs --help
```

- `--use-first-school`: usa la primera escuela devuelta por `getEscuelas`.
- `--concurrency=N`: cantidad de escrituras paralelas. Mantener `1` o `2`.
- `--delay-ms=N`: pausa entre escrituras por worker.
- `--gas-url=URL`: permite probar otro deployment sin tocar `assets/js/config.js`.

## Demo masivo prorrateado por territorio

Para mostrar tableros y bondades del instrumento sin tocar produccion, generar al menos 1000 respuestas sinteticas desde el padron oficial local:

```powershell
npm.cmd run simulate:demo -- --count=1000
```

El generador reparte respuestas por `Departamento + Distrito`: si la cantidad alcanza, asigna al menos una respuesta por distrito y distribuye el resto proporcionalmente al peso del distrito en el padron.

Archivos generados en `tools/simulation/demo-output/`:

- `demo-responses-<runId>.jsonl`: payloads listos para `guardarBorradorMec`.
- `demo-mec_borradores-<runId>.csv`: CSV con las columnas de la hoja `mec_borradores`.
- `demo-allocation-<runId>.csv`: prorrateo por departamento y distrito.
- `demo-infraestructura_mec-<runId>.json`: snapshot agregado para el panel `Infraestructura MEC`.
- `demo-summary-<runId>.md`: resumen ejecutivo de la simulacion.

La escritura real al backend queda bloqueada por confirmacion explicita:

```powershell
$env:CIALPA_USER='admin'
$env:CIALPA_PASSWORD='password'
npm.cmd run simulate:demo -- --count=1000 --write --confirm-write=SIMULAR_1000 --concurrency=1 --delay-ms=900
```

Use `--write` solo en una base de prueba o con autorizacion operativa, porque cada payload se guarda como borrador MEC y puede actualizar estado/tiempos de la escuela.

## Smoke test con Playwright

Instalar dependencias:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Ejecutar:

```powershell
$env:CIALPA_USER='usuario'
$env:CIALPA_PASSWORD='password'
npm.cmd run simulate:ui
```

La prueba UI solo confirma login y llegada al registro guiado. Para carga de datos y verificacion de Sheets, usar el simulador API.

## Metricas de comportamiento web

La herramienta de metricas abre la app publicada con Chromium y genera un JSON completo mas un resumen Markdown:

```powershell
npm.cmd run metrics:web
```

Por defecto mide escritorio, tablet y movil sobre `APP_CONFIG.PUBLIC_URL`. El reporte queda en `tools/simulation/metrics/`.

Opciones utiles:

```powershell
npm.cmd run metrics:web -- --viewport=tablet
npm.cmd run metrics:web -- --cache-bust
npm.cmd run metrics:web -- --no-service-worker
npm.cmd run metrics:web -- --url=https://censoescuelaspy.github.io/CIALPAappencuesta/
```

Metricas capturadas:

- tiempos de navegacion, `first-contentful-paint`, `DOMContentLoaded` y `load`;
- cantidad de requests por tipo, requests fallidas y codigos `4xx/5xx`;
- recursos mas lentos y mas pesados;
- errores/advertencias de consola y `pageerror`;
- version visible, modulo activo, cantidad de botones/campos/canvas;
- estado de Service Worker, registros y caches.
