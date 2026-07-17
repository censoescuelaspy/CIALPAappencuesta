#!/usr/bin/env python
"""Submit controlled 100 m school imagery batches to Earth Engine."""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "tools" / "earthengine" / "output"
DEFAULT_WORKLIST = OUTPUT_DIR / "all-schools-100m-worklist.json"
DEFAULT_COLLECTION = "projects/planet-nicfi/assets/basemaps/americas"


def _slug(value: Any, max_length: int = 52) -> str:
    text = unicodedata.normalize("NFD", str(value or "ESCUELA"))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return (re.sub(r"[^A-Za-z0-9]+", "_", text.upper()).strip("_") or "ESCUELA")[:max_length]


def _school_code(value: Any) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _load_worklist(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("schools") or []
    schools: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        code = _school_code(row.get("code") or row.get("codigo"))
        try:
            lat = float(row.get("lat"))
            lon = float(row.get("lon"))
        except (TypeError, ValueError):
            continue
        if not code or not (-35 <= lat <= -18 and -64 <= lon <= -53):
            continue
        schools.append({
            "order": int(row.get("order") or index + 1),
            "code": code,
            "name": str(row.get("name") or "ESCUELA").strip(),
            "lat": lat,
            "lon": lon,
        })
    return sorted(schools, key=lambda item: item["order"])


def _select(schools: list[dict[str, Any]], start: int, limit: int, only: str) -> list[dict[str, Any]]:
    wanted = {_school_code(item) for item in only.split(",") if _school_code(item)}
    if wanted:
        return [school for school in schools if school["code"] in wanted]
    return schools[max(0, start):max(0, start) + max(1, limit)]


def _initialize(args: argparse.Namespace):
    try:
        import ee
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Falta earthengine-api. Instale las dependencias con: "
            "py -3 -m pip install -r tools/earthengine/requirements.txt"
        ) from exc
    if args.authenticate:
        ee.Authenticate()
    try:
        ee.Initialize(project=args.project or None)
    except Exception as exc:
        raise SystemExit(
            "No se pudo inicializar Earth Engine. Ejecute earthengine authenticate --force "
            f"y vuelva a intentar. Detalle: {exc}"
        ) from exc
    return ee


def _preflight(ee: Any, args: argparse.Namespace, batch_size: int) -> dict[str, int]:
    try:
        available = int(
            ee.ImageCollection(args.collection)
            .filterDate(args.start_date, args.end_date)
            .limit(1)
            .size()
            .getInfo()
        )
    except Exception as exc:
        raise SystemExit(
            "La cuenta Earth Engine no puede leer la coleccion configurada. "
            "Para NICFI debe completar el alta de Planet y aceptar su licencia. "
            f"Coleccion: {args.collection}. Detalle: {exc}"
        ) from exc
    if available < 1:
        raise SystemExit("La coleccion no devolvio imagenes en el periodo solicitado.")
    tasks = ee.batch.Task.list()
    states = [str(task.status().get("state", "")) for task in tasks]
    counts = {state: states.count(state) for state in set(states)}
    queued = counts.get("READY", 0) + counts.get("RUNNING", 0)
    if queued + batch_size > args.max_queue:
        raise SystemExit(
            f"La cola ya tiene {queued} tareas activas/listas. El lote excederia --max-queue={args.max_queue}."
        )
    print(f"Preflight OK: coleccion accesible; cola READY/RUNNING={queued}.")
    return counts


def _export_name(school: dict[str, Any], prefix: str) -> str:
    return "_".join([
        prefix,
        str(school["order"]),
        school["code"],
        _slug(school["name"]),
    ])[:120]


def _task(ee: Any, school: dict[str, Any], args: argparse.Namespace):
    point = ee.Geometry.Point([school["lon"], school["lat"]])
    roi = point.buffer(args.buffer)
    image = (
        ee.ImageCollection(args.collection)
        .filterBounds(roi)
        .filterDate(args.start_date, args.end_date)
        .sort("system:time_start", False)
        .first()
    )
    export_name = _export_name(school, args.prefix)
    return ee.batch.Export.image.toDrive(
        image=ee.Image(image).clip(roi).select(["R", "G", "B"]),
        description=export_name,
        folder=args.drive_folder,
        fileNamePrefix=export_name,
        region=roi,
        scale=args.scale,
        maxPixels=1e8,
        fileFormat="GeoTIFF",
        skipEmptyTiles=True,
        formatOptions={"cloudOptimized": True},
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worklist", type=Path, default=DEFAULT_WORKLIST)
    parser.add_argument("--project", default="rapy-415107")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION)
    parser.add_argument("--authenticate", action="store_true")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--only", default="")
    parser.add_argument("--buffer", type=float, default=100)
    parser.add_argument("--scale", type=float, default=4.77)
    parser.add_argument("--start-date", default="2025-01-01")
    parser.add_argument("--end-date", default=(datetime.now().astimezone().date() + timedelta(days=1)).isoformat())
    parser.add_argument("--drive-folder", default="CIALPA_EE_TODAS_ESCUELAS_100M")
    parser.add_argument("--prefix", default="CIALPA_ESC_100M")
    parser.add_argument("--max-queue", type=int, default=250)
    parser.add_argument("--sleep", type=float, default=0.4)
    parser.add_argument("--allow-large-batch", action="store_true")
    parser.add_argument("--preflight-only", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    worklist = args.worklist.resolve()
    if not worklist.is_file():
        raise SystemExit(
            f"No existe {worklist}. Ejecute primero: "
            "py -3 tools/earthengine/prepare_all_school_100m_exports.py"
        )
    schools = _load_worklist(worklist)
    selected = _select(schools, args.start, args.limit, args.only)
    if not selected:
        raise SystemExit("No hay escuelas seleccionadas para el lote.")
    if len(selected) > 100 and not args.allow_large_batch:
        raise SystemExit("Use lotes de hasta 100 o agregue --allow-large-batch de forma consciente.")

    print(f"Escuelas validas en worklist: {len(schools)}")
    print(f"Lote: {len(selected)}; indices desde {args.start}; radio: {args.buffer:g} m")
    if args.dry_run:
        for school in selected:
            print(f"[{school['order']:04d}] {school['code']} {_export_name(school, args.prefix)}")
        return

    ee = _initialize(args)
    queue_counts = _preflight(ee, args, len(selected))
    if args.preflight_only:
        print(json.dumps({"status": "ok", "queue": queue_counts}, ensure_ascii=True))
        return

    records: list[dict[str, Any]] = []
    for school in selected:
        task = _task(ee, school, args)
        task.start()
        state = task.status().get("state", "SUBMITTED")
        print(f"[{school['order']:04d}] {school['code']} -> {task.id} {state}")
        records.append({
            "order": school["order"],
            "code": school["code"],
            "task_id": task.id,
            "state": state,
            "file_prefix": _export_name(school, args.prefix),
        })
        time.sleep(max(0, args.sleep))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = OUTPUT_DIR / f"submitted-all-schools-100m-{stamp}.json"
    log_path.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "collection": args.collection,
        "buffer_m": args.buffer,
        "start": args.start,
        "count": len(records),
        "tasks": records,
    }, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Log: {log_path}")


if __name__ == "__main__":
    main()
