# Auditoria de ubicacion de escuelas

Esta carpeta contiene herramientas privadas para revisar si las coordenadas del padron escolar coinciden con referencias externas de ubicacion.

## Principios

- No se guardan imagenes de Google Street View ni capturas de Google Maps como evidencia propia.
- Se guardan solo referencias utiles para revision: coordenadas comparadas, distancia, fuente, `place_id`/`pano_id` cuando exista una API habilitada y enlaces de apertura manual.
- La evidencia oficial permanente sigue siendo la foto tomada desde CIALPA y guardada en Drive.
- Los reportes generados quedan en `tools/location-audit/output/`, carpeta ignorada por Git porque puede contener nombres y coordenadas de escuelas.

## Uso

Ensayo sin API de Google, usando Nominatim y Overpass/OpenStreetMap como referencia abierta:

```bash
node tools/location-audit/verify_school_locations.mjs --limit=10
```

Salida esperada:

- `location-audit-<timestamp>.json`
- `location-audit-<timestamp>.csv`
- `location-audit-<timestamp>.md`

## Lectura de resultados

- `distance_m`: distancia entre coordenada del padron y candidato externo.
- `confidence`: `alta`, `media`, `baja` o `sin_candidato`.
- `recommendation`: accion sugerida para revisar o corregir.
- `maps_url`: abre Google Maps en el punto del padron.
- `street_view_url`: abre Street View en vivo desde Google Maps, sin guardar imagenes.
