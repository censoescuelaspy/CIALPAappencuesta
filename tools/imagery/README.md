# Imagenes libres CBERS-4A/WPM

Este flujo obtiene recortes panchromaticos de `2 m` del catalogo publico de INPE. Lee por rangos solo el cuadrado solicitado desde el COG remoto, genera un WebP local y actualiza `assets/data/highres-school-index.json`. No usa Earth Engine ni descarga la escena completa.

Fuente: `CB4A-WPM-L4-DN-1`, producto ortorrectificado de nivel 4. Licencia: `CC BY 4.0`. La imagen sirve como referencia para dibujar; no reemplaza una mensura ni un levantamiento catastral.

## Dependencias

Usa las mismas dependencias GIS declaradas en `tools/earthengine/requirements.txt`:

```powershell
py -3 -m pip install -r tools/earthengine/requirements.txt
```

## Una escuela

```powershell
py -3 -X utf8 tools/imagery/download_cbers4a_wpm.py `
  --school-code 101091 `
  --lat -22.47941972 `
  --lon -57.84039611 `
  --name "ESCUELA BASICA N 1983" `
  --buffer-m 100
```

## Un lote

```powershell
py -3 -X utf8 tools/imagery/download_cbers4a_wpm.py `
  --input tools/earthengine/output/all-schools-100m-worklist.json `
  --start 0 `
  --limit 100 `
  --skip-existing
```

El servidor STAC de INPE presento un certificado no valido para el reloj operativo de 2026. Solo mientras persista ese problema puede agregarse `--allow-insecure-stac`; el script limita esa excepcion al host fijo `data.inpe.br` y sigue rechazando cualquier URL de imagen externa.

Los reportes quedan en `tools/imagery/output/`, fuera de Git. La app conserva la satelital online debajo de cada recorte y almacena la imagen local en cache despues del primer uso.
