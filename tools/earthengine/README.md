# Imagenes de alta resolucion para planos CIALPA

Este directorio contiene los scripts para preparar imagenes por escuela y
vincularlas al plano vivo de CIALPA.

Hay dos caminos complementarios:

1. **Base Google online en la app**: sirve para dibujar manualmente perimetros,
   bloques, caminos y referencias con la mejor nitidez disponible en pantalla.
2. **GeoTIFF/tiles locales por escuela**: sirve cuando existe una fuente
   exportable con licencia, por ejemplo NICFI/Planet en Earth Engine u otra
   ortofoto/submetro. El fondo Google `SATELLITE` visible en Earth Engine no es
   un `ee.Image` exportable.

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

Opcion desde CSV/JSON privado ya exportado:

```powershell
node tools\earthengine\build_pilot_imagery_worklist.mjs --input="C:\privado\muestra_piloto.csv"
```

Salida esperada:

```text
tools/earthengine/output/pilot-schools-worklist.json
```

### 2. Generar script Earth Engine por lote

```powershell
node tools\earthengine\generate_pilot_earthengine_batch.mjs
```

Salida esperada:

```text
tools/earthengine/output/cialpa_pilot_batch_earthengine.js
```

Abrir ese archivo, pegarlo en Google Earth Engine Code Editor y ejecutar. El
script crea una tarea `Export.image.toDrive` por escuela seleccionada.

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
py -3 tools\earthengine\start_pilot_ee_exports.py --authenticate --project=rapy-415107 --source=nicfi
```

Ese comando lee:

```text
tools/earthengine/output/pilot-schools-worklist.json
```

y ejecuta automaticamente `task.start()` para cada escuela. Earth Engine decide
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
node tools\earthengine\generate_pilot_earthengine_batch.mjs --start=0 --limit=25
node tools\earthengine\generate_pilot_earthengine_batch.mjs --start=25 --limit=25
node tools\earthengine\generate_pilot_earthengine_batch.mjs --start=50 --limit=25
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

- La muestra piloto vigente fue diagnosticada como `86` escuelas en el backend.
  El usuario puede referirse a "casi 90"; el flujo soporta todas las que vengan
  en la worklist privada.
- Si Earth Engine muestra `ImageCollection asset ... not found` o `caller does
  not have access`, falta habilitar acceso Planet/NICFI en esa cuenta.
- NICFI tiene resolucion aproximada de `4.77 m`; puede mejorar contexto, pero no
  iguala la nitidez submetro de Google. Para dibujar bloques finos, la base
  Google online sigue siendo la referencia visual principal.
- Si se consigue ortofoto o imagen submetro con licencia, usar el mismo
  instalador de GeoTIFF y la misma estructura de tiles.
- No subir worklists privadas, coordenadas operativas ni tiles comerciales o
  restringidos al repositorio sin confirmar licencia de redistribucion.
