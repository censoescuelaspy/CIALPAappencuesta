# Imagenes de alta resolucion para planos CIALPA

Este directorio contiene los scripts para preparar imagenes por escuela y
vincularlas al plano vivo de CIALPA.

Hay tres caminos complementarios:

1. **Base Google online en la app**: sirve para dibujar manualmente perimetros,
   bloques, caminos y referencias con la mejor nitidez disponible en pantalla.
2. **GeoTIFF/tiles locales por escuela**: sirve cuando existe una fuente
   exportable con licencia, por ejemplo NICFI/Planet en Earth Engine u otra
   ortofoto/submetro. El fondo Google `SATELLITE` visible en Earth Engine no es
   un `ee.Image` exportable.
3. **CBERS-4A/WPM publico, sin Earth Engine**: `tools/imagery/` recorta por
   HTTP solo los `100 m` alrededor de cada escuela desde el catalogo INPE,
   instala una imagen panchromatica de `2 m` y actualiza el indice de la app.

## Padron MEC 2026 completo: radio de 100 m

El padron `ListadoMECversionNUEVA16julio2026.xlsx` contiene `5.448` escuelas:
`5.016` tienen un par de coordenadas valido y `432` quedan excluidas del lote
hasta corregir su ubicacion. El flujo completo usa una ventana circular de
`100 m` alrededor del punto de cada escuela.

### 1. Generar la worklist y el codigo para Code Editor

```powershell
npm run imagery:all:prepare
```

O indicando la fuente de forma explicita:

```powershell
py -3 -X utf8 tools\earthengine\prepare_all_school_100m_exports.py --source="H:\Mi unidad\ListadoMECversionNUEVA16julio2026.xlsx"
```

Salidas privadas, ignoradas por Git:

```text
tools/earthengine/output/all-schools-100m-worklist.json
tools/earthengine/output/cialpa_all_schools_100m_earthengine.js
```

El segundo archivo es el codigo listo para pegar en Google Earth Engine Code
Editor. Empieza con `CREATE_EXPORT_TASKS = false`; primero debe comprobarse que
la vista previa NICFI abre sin error. Para crear tareas, cambiarlo a `true` y
avanzar `EXPORT_START_INDEX` en lotes de `25`.

### 2. Comprobar acceso y lanzar lotes desde Python

Instalar dependencias solo si falta alguna:

```powershell
py -3 -m pip install -r tools\earthengine\requirements.txt
```

Prueba sin Earth Engine:

```powershell
npm run imagery:all:dry-run
```

Comprobacion real de acceso, sin exportar:

```powershell
py -3 tools\earthengine\start_all_school_100m_exports.py --project=rapy-415107 --preflight-only
```

Primer lote real, solamente despues de que el preflight sea correcto:

```powershell
py -3 tools\earthengine\start_all_school_100m_exports.py --project=rapy-415107 --start=0 --limit=25
```

Siguientes lotes:

```powershell
py -3 tools\earthengine\start_all_school_100m_exports.py --project=rapy-415107 --start=25 --limit=25
py -3 tools\earthengine\start_all_school_100m_exports.py --project=rapy-415107 --start=50 --limit=25
```

El lanzador verifica acceso a la coleccion antes de crear tareas y limita la
cola para no intentar someter las `5.016` exportaciones juntas.

### 3. Convertir descargas e incorporarlas a la app

Una sola escuela, sin activarla aun:

```powershell
py -3 tools\earthengine\install_school_highres.py "H:\CIALPA_EE_TODAS_ESCUELAS_100M\CIALPA_ESC_100M_1_10029.tif" --school-code=10029 --buffer=100
```

El modo por defecto crea un unico PNG georreferenciado por escuela, no una
piramide de cientos de tiles. La app lo superpone a la satelital estable y usa
`assets/data/highres-school-index.json` para descubrir que escuelas tienen
imagen instalada.

Para un lote descargado:

```powershell
py -3 tools\earthengine\install_all_school_highres_batch.py --worklist="tools\earthengine\output\all-schools-100m-worklist.json" --src-dir="H:\CIALPA_EE_TODAS_ESCUELAS_100M"
```

La activacion exige confirmar de forma expresa que el uso y destino cumplen la
licencia de la fuente:

```powershell
py -3 tools\earthengine\install_all_school_highres_batch.py --worklist="tools\earthengine\output\all-schools-100m-worklist.json" --src-dir="H:\CIALPA_EE_TODAS_ESCUELAS_100M" --activate --license-confirmed
```

Para servir las imagenes desde almacenamiento de objetos en vez de incluirlas
en Git, agregar `--public-base-url="https://HOST/ruta/schools"`. El indice
guardara esa URL estable para cada codigo.

### Limitacion verificada el 2026-07-17

La autenticacion Earth Engine funciona y Sentinel-2 responde consultas, pero el
proyecto `rapy-415107` informa que supero la cuota de computo no comercial y
esta en modo restringido. La cuenta tambien responde
`earthengine.assets.get denied` para
`projects/planet-nicfi/assets/basemaps/americas`. La cola contiene tareas
anteriores en estado `READY`, por lo que no se iniciaron exportaciones CIALPA.

NICFI tiene pixel de `4,77 m`, no resolucion submetro, y posee restricciones de
uso, reproduccion y distribucion. No debe publicarse el lote en GitHub Pages
hasta resolver acceso, cuota y licencia.

## Flujo para toda la muestra piloto

La lista con coordenadas no debe subirse al repositorio. Por eso el flujo genera
archivos privados bajo `tools/earthengine/output/`, carpeta ignorada por git.

### 1. Crear worklist privada

Opcion con usuario y clave CIALPA:

```powershell
$env:CIALPA_USER='usuario'
$env:CIALPA_PASSWORD='clave'
node tools\earthengine\build_pilot_imagery_worklist.mjs
```

Opcion con token de sesion:

```powershell
$env:CIALPA_API_TOKEN='token-de-sesion'
node tools\earthengine\build_pilot_imagery_worklist.mjs
```

Opcion desde la muestra privada Capital/Central vigente:

```powershell
node tools\earthengine\build_pilot_imagery_worklist.mjs --input="tools\simulation\private-output\muestra_piloto_capital_central.csv"
```

Salida esperada:

```text
tools/earthengine/output/pilot-schools-worklist.json
```

### 2. Generar script Earth Engine por lote

```powershell
node tools\earthengine\generate_pilot_earthengine_batch.mjs --source=nicfi --buffer=100 --start=0 --limit=25 --create-tasks=true --out="tools\earthengine\output\CIALPA_MUESTRA_CAPITAL_CENTRAL_NICFI_100M.js"
```

Salida esperada:

```text
tools/earthengine/output/CIALPA_MUESTRA_CAPITAL_CENTRAL_NICFI_100M.js
```

Abrir ese archivo, pegarlo en Google Earth Engine Code Editor y ejecutar. El
script contiene las `86` escuelas vigentes, comprueba primero la coleccion y
crea hasta `25` tareas `Export.image.toDrive` para circulos de `100 m`. Para los
lotes siguientes, cambiar `EXPORT_START_INDEX` a `25`, `50` y `75`.

Salida de control Sentinel-2, util solo para probar permisos y exportacion:

```powershell
node tools\earthengine\generate_pilot_earthengine_batch.mjs --source=s2 --buffer=100 --start=0 --limit=25 --create-tasks=false --out="tools\earthengine\output\CIALPA_MUESTRA_CAPITAL_CENTRAL_S2_100M_PRUEBA.js"
```

Importante: en Code Editor, Earth Engine deja esas tareas en la pestaña
`Tasks`; normalmente hay que iniciarlas una por una. Para evitar ese paso,
usar el modo Python de la seccion siguiente.

### 2b. Iniciar todas las tareas sin hacer clic una por una

Instalar la API Python si falta:

```powershell
py -3 -m pip install earthengine-api
```

Autenticar y lanzar las exportaciones desde Python:

```powershell
py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi --preflight-only
```

Ese comando lee:

```text
tools/earthengine/output/pilot-schools-worklist.json
```

y, sin `--preflight-only`, ejecuta automaticamente `task.start()` para cada escuela. Earth Engine decide
cuantas tareas corren en paralelo y cuantas quedan en cola.

Para probar sin iniciar tareas reales:

```powershell
py -3 tools\earthengine\start_pilot_ee_exports.py --source=s2 --limit=1 --dry-run
```

Para lanzar por tandas:

```powershell
py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi --start=0 --limit=25
py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi --start=25 --limit=25
py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi --start=50 --limit=25
```

Cada corrida deja un log privado en `tools/earthengine/output/` con los IDs de
tareas iniciadas.

Para procesar por partes, generar o editar el script con indices:

```powershell
node tools\earthengine\generate_pilot_earthengine_batch.mjs --buffer=100 --start=0 --limit=25
node tools\earthengine\generate_pilot_earthengine_batch.mjs --buffer=100 --start=25 --limit=25
node tools\earthengine\generate_pilot_earthengine_batch.mjs --buffer=100 --start=50 --limit=25
node tools\earthengine\generate_pilot_earthengine_batch.mjs --buffer=100 --start=75 --limit=25
```

En Earth Engine tambien se pueden ajustar:

```javascript
var EXPORT_START_INDEX = 0;
var EXPORT_LIMIT = 25; // 0 = todas las escuelas restantes.
```

### 3. Descargar GeoTIFFs desde Drive

La carpeta Drive por defecto es:

```text
CIALPA_EE_PILOTO_ESCUELAS
```

Cada archivo lleva el codigo de escuela en el nombre. Ejemplo:

```text
CIALPA_PILOTO_1_101095_101095_ESCUELA_BASICA_N_2076_NICFI_RGB_2024_2026.tif
```

### 4. Convertir e instalar tiles locales

Para una escuela:

```powershell
py -3 tools\earthengine\install_school_highres.py "G:\Mi unidad\CIALPA_EE_PILOTO_ESCUELAS\CIALPA_PILOTO_1_101095_101095_ESCUELA_BASICA_N_2076_NICFI_RGB_2024_2026.tif" --school-code=101095
```

Para convertir todas las descargas encontradas en una carpeta:

```powershell
py -3 tools\earthengine\install_pilot_highres_batch.py --src-dir="G:\Mi unidad\CIALPA_EE_PILOTO_ESCUELAS"
```

Para activar las fuentes locales en la app despues de revisar visualmente:

```powershell
py -3 tools\earthengine\install_pilot_highres_batch.py --src-dir="G:\Mi unidad\CIALPA_EE_PILOTO_ESCUELAS" --activate
```

El `--activate` actualiza `APP_CONFIG.PLAN_BASEMAP_HIGHRES_SOURCES` sin borrar
otras escuelas ya activadas.

## Piloto Isla Tuyu 101095

- Codigo local: `101095`
- Institucion: `ESCUELA BASICA N 2076`
- Departamento: `CONCEPCION`
- Distrito: `PASO BARRETO`
- Localidad: `ISLA TUYU`
- Centro: `-23.0827577778, -56.94791`
- Radio de prueba: `500 m`

Script manual:

```text
tools/earthengine/isla_tuyu_101095_pilot.js
```

Ese script intenta `NICFI` por defecto y no exporta Sentinel-2, para evitar
volver a cargar imagenes borrosas.

## Sentinel-2

Sentinel-2 queda solo como prueba tecnica de pipeline. Su resolucion de 10 m no
alcanza para identificar bloques finos, asi que no debe activarse como capa
operativa de alta resolucion.

## Notas operativas

- La muestra piloto vigente tiene `86` escuelas: `15` de Capital y `71` de
  Central. El generador valida que todas tengan codigo, nombre y coordenadas.
- Si Earth Engine muestra `ImageCollection asset ... not found` o `caller does
  not have access`, falta habilitar acceso Planet/NICFI en esa cuenta.
- NICFI tiene resolucion aproximada de `4.77 m`; puede mejorar contexto, pero no
  iguala la nitidez submetro de Google. Para dibujar bloques finos, la base
  Google online sigue siendo la referencia visual principal.
- Si se consigue ortofoto o imagen submetro con licencia, usar el mismo
  instalador de GeoTIFF y la misma estructura de tiles.
- No subir worklists privadas, coordenadas operativas ni tiles comerciales o
  restringidos al repositorio sin confirmar licencia de redistribucion.
