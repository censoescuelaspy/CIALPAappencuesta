#!/usr/bin/env python
"""Build the 2026 all-school worklist and a paste-ready Earth Engine script."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SIMULATION_DIR = ROOT / "tools" / "simulation"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"
DEFAULT_WORKLIST = OUTPUT_DIR / "all-schools-100m-worklist.json"
DEFAULT_SCRIPT = OUTPUT_DIR / "cialpa_all_schools_100m_earthengine.js"
SOURCE_CANDIDATES = (
    Path(r"H:\Mi unidad\ListadoMECversionNUEVA16julio2026.xlsx"),
    Path(r"G:\Mi unidad\ListadoMECversionNUEVA16julio2026.xlsx"),
)
NICFI_COLLECTION = "projects/planet-nicfi/assets/basemaps/americas"


def _default_source() -> Path:
    for candidate in SOURCE_CANDIDATES:
        if candidate.is_file():
            return candidate
    return SOURCE_CANDIDATES[0]


def _load_roster(path: Path):
    sys.path.insert(0, str(SIMULATION_DIR))
    try:
        from prepare_mec_roster_2026 import read_source
    finally:
        sys.path.pop(0)
    rows, _ = read_source(path)
    return rows


def _slug(value: str, fallback: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFD", value or "")
    ascii_text = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    slug = re.sub(r"[^A-Za-z0-9]+", "_", ascii_text.upper()).strip("_")[:52]
    return slug or fallback


def _school_record(school, order: int) -> dict[str, object]:
    return {
        "order": order,
        "code": school.code,
        "name": school.name,
        "department": school.department,
        "district": school.district,
        "locality": school.locality,
        "lat": school.latitude,
        "lon": school.longitude,
        "slug": _slug(f"{school.code}_{school.name}", school.code),
    }


def _javascript(payload: dict, args: argparse.Namespace) -> str:
    schools_json = json.dumps(payload["schools"], ensure_ascii=True, separators=(",", ":"))
    return f"""// CIALPA - Earth Engine, 100 m alrededor de cada escuela con coordenadas.
// Generado por tools/earthengine/prepare_all_school_100m_exports.py.
// Este archivo contiene coordenadas operativas y queda fuera de Git.
//
// IMPORTANTE:
// 1. NICFI requiere permiso previo de Planet para esta cuenta de Earth Engine.
// 2. La fuente tiene 4.77 m/pixel; no es una ortofoto submetro.
// 3. Revise la licencia antes de publicar o redistribuir las imagenes.
// 4. Deje CREATE_EXPORT_TASKS=false para comprobar acceso y vista previa.
// 5. Luego cambie a true y procese lotes de 25. No cree las 5.016 tareas juntas.

var SCHOOLS = {schools_json};

var COLLECTION_ID = {json.dumps(args.collection)};
var START_DATE = {json.dumps(args.start_date)};
var END_DATE = {json.dumps(args.end_date)};
var BUFFER_METERS = {args.buffer:g};
var EXPORT_SCALE_METERS = {args.scale:g};
var DRIVE_FOLDER = {json.dumps(args.drive_folder)};
var EXPORT_PREFIX = {json.dumps(args.prefix)};
var EXPORT_START_INDEX = {args.batch_start};
var EXPORT_LIMIT = {args.batch_size};
var CREATE_EXPORT_TASKS = false;
var PREVIEW_COUNT = 3;
var VIS = {{bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4}};

var endIndex = Math.min(SCHOOLS.length, EXPORT_START_INDEX + EXPORT_LIMIT);
var selectedSchools = SCHOOLS.slice(EXPORT_START_INDEX, endIndex);
var source = ee.ImageCollection(COLLECTION_ID)
  .filterDate(START_DATE, END_DATE)
  .sort('system:time_start', false);

print('CIALPA total con coordenadas', SCHOOLS.length);
print('Lote actual', EXPORT_START_INDEX, endIndex - 1, selectedSchools.length);
print('Comprobacion de acceso NICFI', source.limit(1));
print('Crear tareas', CREATE_EXPORT_TASKS);
Map.setOptions('SATELLITE');

var selectedFeatures = ee.FeatureCollection(selectedSchools.map(function(school) {{
  return ee.Feature(ee.Geometry.Point([school.lon, school.lat]), {{
    code: school.code,
    name: school.name,
    order: school.order
  }});
}}));
Map.addLayer(selectedFeatures, {{color: 'red'}}, 'Escuelas del lote');

if (selectedSchools.length) {{
  Map.centerObject(ee.Geometry.Point([selectedSchools[0].lon, selectedSchools[0].lat]), 17);
}}

selectedSchools.forEach(function(school, localIndex) {{
  var point = ee.Geometry.Point([school.lon, school.lat]);
  var roi = point.buffer(BUFFER_METERS);
  var localCollection = source.filterBounds(roi);
  var latest = ee.Image(localCollection.first()).clip(roi);
  var rgb = latest.select(['R', 'G', 'B']);
  var exportName = EXPORT_PREFIX + '_' + school.order + '_' + school.code + '_' + school.slug;

  if (localIndex < PREVIEW_COUNT) {{
    Map.addLayer(latest, VIS, 'NICFI ' + school.code, localIndex === 0);
    Map.addLayer(ee.Image().byte().paint(ee.FeatureCollection([ee.Feature(roi)]), 1, 2),
      {{palette: ['yellow']}}, 'Radio 100 m ' + school.code, false);
    print('Imagenes disponibles ' + school.code, localCollection.size());
  }}

  if (CREATE_EXPORT_TASKS) {{
    Export.image.toDrive({{
      image: rgb,
      description: exportName,
      folder: DRIVE_FOLDER,
      fileNamePrefix: exportName,
      region: roi,
      scale: EXPORT_SCALE_METERS,
      maxPixels: 1e8,
      fileFormat: 'GeoTIFF',
      skipEmptyTiles: true,
      formatOptions: {{cloudOptimized: true}}
    }});
  }}
}});
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=_default_source())
    parser.add_argument("--worklist", type=Path, default=DEFAULT_WORKLIST)
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    parser.add_argument("--collection", default=NICFI_COLLECTION)
    parser.add_argument("--buffer", type=float, default=100)
    parser.add_argument("--scale", type=float, default=4.77)
    parser.add_argument("--start-date", default="2025-01-01")
    parser.add_argument("--end-date", default=(datetime.now().astimezone().date() + timedelta(days=1)).isoformat())
    parser.add_argument("--drive-folder", default="CIALPA_EE_TODAS_ESCUELAS_100M")
    parser.add_argument("--prefix", default="CIALPA_ESC_100M")
    parser.add_argument("--batch-start", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=25)
    args = parser.parse_args()

    source_path = args.source.resolve()
    if not source_path.is_file():
        raise SystemExit(f"No existe el padrón MEC: {source_path}")
    if args.buffer <= 0 or args.batch_size <= 0:
        raise SystemExit("--buffer y --batch-size deben ser positivos.")

    roster = _load_roster(source_path)
    with_coordinates = [school for school in roster if school.has_coordinates]
    missing = [school for school in roster if not school.has_coordinates]
    schools = [_school_record(school, index) for index, school in enumerate(with_coordinates, start=1)]
    payload = {
        "schema": "cialpa_all_school_imagery_worklist_v1",
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": source_path.name,
        "bufferM": args.buffer,
        "totalRows": len(roster),
        "totalWithCoords": len(schools),
        "totalWithoutCoords": len(missing),
        "missingCoordinates": [
            {"code": school.code, "name": school.name, "department": school.department}
            for school in missing
        ],
        "schools": schools,
    }

    args.worklist.parent.mkdir(parents=True, exist_ok=True)
    args.script.parent.mkdir(parents=True, exist_ok=True)
    args.worklist.write_text(json.dumps(payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    args.script.write_text(_javascript(payload, args), encoding="utf-8")
    print(json.dumps({
        "status": "ok",
        "total": len(roster),
        "with_coordinates": len(schools),
        "without_coordinates": len(missing),
        "buffer_m": args.buffer,
        "worklist": str(args.worklist.resolve()),
        "earth_engine_script": str(args.script.resolve()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
