#!/usr/bin/env python
"""Start CIALPA pilot imagery exports through the Earth Engine Python API.

This avoids clicking Run one by one in the Earth Engine Code Editor Tasks tab.
It still requires an Earth Engine account with access to Planet/NICFI when
--source=nicfi is used.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WORKLIST = APP_ROOT / "tools" / "earthengine" / "output" / "pilot-schools-worklist.json"
DEFAULT_LOG_DIR = APP_ROOT / "tools" / "earthengine" / "output"
NICFI_COLLECTION = "projects/planet-nicfi/assets/basemaps/americas"
S2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


def _slug(value: Any, fallback: str = "ESCUELA", max_length: int = 48) -> str:
    text = unicodedata.normalize("NFD", str(value or fallback))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^A-Za-z0-9]+", "_", text.upper()).strip("_")
    return (text or fallback)[:max_length]


def _school_code(value: Any) -> str:
    code = re.sub(r"\D+", "", str(value or ""))
    return code


def _number(value: Any) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def _load_worklist(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data if isinstance(data, list) else data.get("schools") or data.get("escuelas") or data.get("data") or []
    schools: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        code = _school_code(row.get("code") or row.get("codigo") or row.get("codigo_local"))
        lat = _number(row.get("lat") or row.get("latitud"))
        lon = _number(row.get("lon") or row.get("lng") or row.get("longitud"))
        if not code or lat is None or lon is None:
            continue
        schools.append({
            "order": int(_number(row.get("order") or row.get("orden")) or index + 1),
            "code": code,
            "name": str(row.get("name") or row.get("nombre") or "ESCUELA").strip(),
            "department": str(row.get("department") or row.get("departamento") or "").strip(),
            "district": str(row.get("district") or row.get("distrito") or "").strip(),
            "locality": str(row.get("locality") or row.get("localidad") or "").strip(),
            "lat": lat,
            "lon": lon,
        })
    schools.sort(key=lambda item: item["order"])
    return schools


def _select_schools(schools: list[dict[str, Any]], start: int, limit: int, only: str) -> list[dict[str, Any]]:
    wanted = {_school_code(item) for item in only.split(",") if _school_code(item)}
    if wanted:
        return [school for school in schools if school["code"] in wanted]
    start_index = max(0, start)
    end_index = None if limit <= 0 else start_index + limit
    return schools[start_index:end_index]


def _export_name(school: dict[str, Any], prefix: str, source: str, start_date: str, end_date: str) -> str:
    label = f"{start_date[:4]}_{end_date[:4]}"
    name = "_".join([
        prefix,
        str(school["order"]),
        school["code"],
        _slug(school["name"]),
        source.upper(),
        "RGB",
        label,
    ])
    return name[:120]


def _mask_s2_clouds(ee: Any, image: Any) -> Any:
    scl = image.select("SCL")
    keep = (
        scl.neq(3)
        .And(scl.neq(8))
        .And(scl.neq(9))
        .And(scl.neq(10))
        .And(scl.neq(11))
    )
    return image.updateMask(keep)


def _task_for_school(ee: Any, school: dict[str, Any], args: argparse.Namespace) -> Any:
    point = ee.Geometry.Point([school["lon"], school["lat"]])
    roi = point.buffer(args.buffer)
    export_name = _export_name(school, args.prefix, args.source, args.start_date, args.end_date)

    if args.source == "nicfi":
        image = (
            ee.ImageCollection(NICFI_COLLECTION)
            .filterBounds(roi)
            .filterDate(args.start_date, args.end_date)
            .sort("system:time_start", False)
            .first()
        )
        export_image = ee.Image(image).clip(roi).select(["R", "G", "B"])
        scale = args.scale
    elif args.source == "s2":
        collection = (
            ee.ImageCollection(S2_COLLECTION)
            .filterBounds(roi)
            .filterDate(args.start_date, args.end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
            .map(lambda image: _mask_s2_clouds(ee, image))
        )
        export_image = collection.median().clip(roi).select(["B4", "B3", "B2"])
        scale = 10
    else:
        raise ValueError(f"Fuente no soportada: {args.source}")

    return ee.batch.Export.image.toDrive(
        image=export_image,
        description=export_name,
        folder=args.drive_folder,
        fileNamePrefix=export_name,
        region=roi,
        scale=scale,
        maxPixels=args.max_pixels,
        fileFormat="GeoTIFF",
        formatOptions={"cloudOptimized": True},
    )


def _preflight(ee: Any, school: dict[str, Any], args: argparse.Namespace, batch_size: int) -> dict[str, int]:
    point = ee.Geometry.Point([school["lon"], school["lat"]])
    roi = point.buffer(args.buffer)
    try:
        if args.source == "nicfi":
            ee.data.getAsset(NICFI_COLLECTION)
            collection = (
                ee.ImageCollection(NICFI_COLLECTION)
                .filterBounds(roi)
                .filterDate(args.start_date, args.end_date)
            )
        else:
            collection = (
                ee.ImageCollection(S2_COLLECTION)
                .filterBounds(roi)
                .filterDate(args.start_date, args.end_date)
            )
        image_count = int(collection.size().getInfo() or 0)
    except Exception as exc:
        raise SystemExit(
            "Preflight fallido: la fuente no es accesible con esta cuenta/proyecto. "
            "NICFI requiere alta de Planet y permiso Earth Engine. Detalle: " + str(exc)
        ) from exc
    if image_count <= 0:
        raise SystemExit("Preflight fallido: no hay imagenes para la primera escuela y el periodo indicado.")

    counts: dict[str, int] = {}
    for task in ee.data.getTaskList() or []:
        state = str(task.get("state") or "UNKNOWN")
        counts[state] = counts.get(state, 0) + 1
    queued = counts.get("READY", 0) + counts.get("RUNNING", 0)
    if queued + batch_size > args.max_queue:
        raise SystemExit(
            f"Preflight detenido: hay {queued} tareas READY/RUNNING y el lote de {batch_size} "
            f"superaria --max-queue={args.max_queue}."
        )
    print(f"Preflight OK: {image_count} imagen(es) cubren la primera escuela; cola READY/RUNNING={queued}.")
    return counts


def _write_log(records: list[dict[str, Any]], args: argparse.Namespace) -> Path:
    DEFAULT_LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = DEFAULT_LOG_DIR / f"submitted-ee-tasks-{args.source}-{stamp}.json"
    out.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": args.source,
        "drive_folder": args.drive_folder,
        "count": len(records),
        "tasks": records,
    }, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worklist", type=Path, default=DEFAULT_WORKLIST)
    parser.add_argument("--source", choices=["nicfi", "s2"], default="nicfi")
    parser.add_argument("--project", default="", help="Google Cloud project registered for Earth Engine")
    parser.add_argument("--authenticate", action="store_true", help="Run ee.Authenticate() before initializing")
    parser.add_argument("--start", type=int, default=0, help="Zero-based start index")
    parser.add_argument("--limit", type=int, default=25, help="0 means all remaining schools")
    parser.add_argument("--only", default="", help="Comma-separated school codes")
    parser.add_argument("--buffer", type=float, default=100)
    parser.add_argument("--drive-folder", default="CIALPA_EE_PILOTO_ESCUELAS")
    parser.add_argument("--prefix", default="CIALPA_PILOTO")
    parser.add_argument("--start-date", default="2024-01-01")
    parser.add_argument("--end-date", default=(datetime.now().astimezone().date() + timedelta(days=1)).isoformat())
    parser.add_argument("--scale", type=float, default=4.77)
    parser.add_argument("--max-pixels", type=float, default=1e9)
    parser.add_argument("--sleep", type=float, default=0.5, help="Seconds between task submissions")
    parser.add_argument("--max-queue", type=int, default=250)
    parser.add_argument("--preflight-only", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    schools = _load_worklist(args.worklist.resolve())
    selected = _select_schools(schools, args.start, args.limit, args.only)
    if not selected:
        raise SystemExit("No hay escuelas seleccionadas para exportar.")

    ee = None
    if not args.dry_run:
        try:
            import ee as earth_engine
            ee = earth_engine
        except ModuleNotFoundError as exc:
            raise SystemExit(
                "Falta el paquete Earth Engine para Python. Instale con: "
                "`py -3 -m pip install earthengine-api` o ejecute este script en Google Colab."
            ) from exc

        if args.authenticate:
            ee.Authenticate()
        try:
            if args.project:
                ee.Initialize(project=args.project)
            else:
                ee.Initialize()
        except Exception as exc:
            raise SystemExit(
                "No se pudo inicializar Earth Engine. Ejecute con --authenticate "
                "o corra `earthengine authenticate --force`. Detalle: " + str(exc)
            ) from exc

    print(f"Escuelas seleccionadas: {len(selected)}")
    print(f"Fuente: {args.source}")
    print(f"Drive folder: {args.drive_folder}")
    if args.source == "nicfi":
        print("Nota: NICFI requiere acceso Planet/NICFI habilitado para esta cuenta Earth Engine.")

    if not args.dry_run:
        if ee is None:
            raise RuntimeError("Earth Engine no inicializado.")
        queue_counts = _preflight(ee, selected[0], args, len(selected))
        if args.preflight_only:
            print(json.dumps({"status": "ok", "queue": queue_counts}, ensure_ascii=True))
            return

    records: list[dict[str, Any]] = []
    for school in selected:
        export_name = _export_name(school, args.prefix, args.source, args.start_date, args.end_date)
        print(f"[{school['order']:03d}] {school['code']} {export_name}")
        if args.dry_run:
            task_id = "dry-run"
            state = "DRY_RUN"
        else:
            if ee is None:
                raise RuntimeError("Earth Engine no inicializado.")
            task = _task_for_school(ee, school, args)
            task.start()
            task_id = task.id
            state = task.status().get("state", "SUBMITTED")
            time.sleep(max(0, args.sleep))
        records.append({
            "order": school["order"],
            "code": school["code"],
            "name": school["name"],
            "task_id": task_id,
            "state": state,
            "file_prefix": export_name,
        })

    log_path = _write_log(records, args)
    print(f"Log: {log_path}")
    if args.dry_run:
        print("Dry-run completo. No se creo ni inicio ninguna tarea Earth Engine.")
    else:
        print("Listo. Las tareas quedan iniciadas o en cola en Earth Engine; Drive recibira los GeoTIFF al completarse.")


if __name__ == "__main__":
    main()
