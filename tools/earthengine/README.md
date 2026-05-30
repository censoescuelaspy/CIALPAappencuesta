# Piloto Earth Engine - Isla Tuyu 101095

Este directorio contiene el piloto para generar una base de imagen alrededor de una escuela y preparar su vinculacion al plano de CIALPA cuando exista una fuente realmente util.

## Escuela piloto

- Codigo local: `101095`
- Institucion: `ESCUELA BASICA N 2076`
- Departamento: `CONCEPCION`
- Distrito: `PASO BARRETO`
- Localidad: `ISLA TUYU`
- Centro: `-23.0827577778, -56.94791`
- Radio de prueba: `500 m`

## Flujo recomendado

1. Abrir Earth Engine Code Editor.
2. Aceptar el repo si corresponde: `https://code.earthengine.google.com/?accept_repo=users/dmezapyPyGreen/censoescuelaspy`.
3. Pegar o abrir `isla_tuyu_101095_pilot.js`.
4. Ejecutar el script. Ahora intenta `NICFI` por defecto y no exporta Sentinel-2, para evitar volver a cargar imagenes borrosas.
5. Si Earth Engine muestra `ImageCollection asset ... not found` o `caller does not have access`, primero habilitar acceso Planet/NICFI en esa cuenta.
6. Si `NICFI RGB mas reciente` se ve mejor que la base satelital, lanzar el export GeoTIFF a Drive.
7. Descargar el GeoTIFF esperado a la carpeta local:

```text
G:\Mi unidad\CIALPA_EE_PILOTO_ISLA_TUYU\CIALPA_101095_ISLA_TUYU_NICFI_RGB_2024_2026.tif
```

8. Convertirlo a tiles y preparar el manifiesto:

```powershell
py -3 tools\earthengine\install_school_highres.py "G:\Mi unidad\CIALPA_EE_PILOTO_ISLA_TUYU\CIALPA_101095_ISLA_TUYU_NICFI_RGB_2024_2026.tif"
```

9. Revisar visualmente la app o los tiles. Si realmente mejora la base satelital, activar el boton en la app:

```powershell
py -3 tools\earthengine\install_school_highres.py "G:\Mi unidad\CIALPA_EE_PILOTO_ISLA_TUYU\CIALPA_101095_ISLA_TUYU_NICFI_RGB_2024_2026.tif" --activate
```

El comando `--activate` actualiza `APP_CONFIG.PLAN_BASEMAP_HIGHRES_SOURCES` para la escuela `101095`.

## Fallback Sentinel-2 usado en el primer ensayo

Para repetir solamente la prueba de pipeline con Sentinel-2, cambiar en `isla_tuyu_101095_pilot.js`:

```javascript
var ENABLE_NICFI = false;
var EXPORT_SENTINEL2_FALLBACK = true;
```

Luego convertir el GeoTIFF S2 con:

```powershell
py -3 tools\earthengine\geotiff_to_xyz_tiles.py "G:\Mi unidad\CIALPA_EE_PILOTO_ISLA_TUYU\CIALPA_101095_ISLA_TUYU_S2_RGB_2024_2026.tif" "assets\imagery\schools\101095\tiles" --min-zoom 17 --max-zoom 19
```

No activar esta capa en la app; el ensayo Sentinel-2 10 m quedo desactivado porque se ve borroso frente a la base satelital.

## Notas

- La imagen muy nitida que aparece como fondo `SATELLITE` en Earth Engine es el basemap de Google del visor. Sirve para inspeccion visual, pero no es un `ee.Image` exportable con `Export.image.toDrive`.
- En la app, el equivalente operativo online es mantener la base `Satelite`; la capa local "alta resolucion" solo debe activarse si una fuente exportable supera visualmente esa base.
- Si se necesita la misma nitidez visual de Google dentro de la app, configurar una API key oficial de Google Map Tiles en `APP_CONFIG.GOOGLE_MAP_TILES_API_KEY`. La app mostrara la opcion `Google` en el plano cuando esa clave exista.
- `Sentinel-2` ya fue usado como primer ensayo y funciona para probar el pipeline, pero su resolucion de 10 m no alcanza para bloques finos. Por eso no debe mostrarse como capa operativa en la app.
- `NICFI` puede mejorar el contexto porque su resolucion aproximada es de 4.77 m, pero requiere acceso habilitado en la cuenta Earth Engine. Para dibujar bloques finos puede no alcanzar; si se consigue una ortofoto o imagen submetro con licencia, se conserva la misma estructura de tiles.
- No subir tiles comerciales o restringidos al repositorio sin confirmar licencia de redistribucion.
- El manifiesto app-ready esta en `assets/data/highres-school-pilot-isla-tuyu-101095.json`.
