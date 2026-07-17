#!/usr/bin/env python
"""Download small, reusable CBERS-4A/WPM school images from the INPE STAC."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from PIL import Image, ImageEnhance, ImageFilter
from rasterio.warp import transform, transform_bounds
from rasterio.windows import bounds as window_bounds
from rasterio.windows import from_bounds


APP_ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = APP_ROOT / "assets" / "data" / "highres-school-index.json"
DEFAULT_OUTPUT_ROOT = APP_ROOT / "assets" / "imagery" / "schools"
DEFAULT_REPORT_DIR = APP_ROOT / "tools" / "imagery" / "output"
STAC_URL = "https://data.inpe.br/bdc/stac/v1/search"
COLLECTION_ID = "CB4A-WPM-L4-DN-1"
COLLECTION_URL = f"https://data.inpe.br/bdc/stac/v1/collections/{COLLECTION_ID}"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
ALLOWED_HOST = "data.inpe.br"


@dataclass(frozen=True)
class School:
    code: str
    name: str
    department: str
    district: str
    locality: str
    lat: float
    lon: float


@dataclass
class Candidate:
    item_id: str
    acquired_at: str
    rank: int
    array: np.ndarray
    bounds_wgs84: dict[str, float]
    valid_fraction: float
    raw_median: float
    quality_score: float
    final_score: float = 0.0


class RasterCache:
    def __init__(self, max_open: int = 12) -> None:
        self.max_open = max(1, max_open)
        self._datasets: OrderedDict[str, rasterio.DatasetReader] = OrderedDict()

    def get(self, url: str) -> rasterio.DatasetReader:
        _validate_inpe_url(url)
        dataset = self._datasets.pop(url, None)
        if dataset is None:
            dataset = rasterio.open(url)
        self._datasets[url] = dataset
        while len(self._datasets) > self.max_open:
            _, oldest = self._datasets.popitem(last=False)
            oldest.close()
        return dataset

    def close(self) -> None:
        for dataset in self._datasets.values():
            dataset.close()
        self._datasets.clear()

    def __enter__(self) -> "RasterCache":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


def _normalize_code(value: Any) -> str:
    digits = re.sub(r"\D+", "", str(value or ""))
    return digits.lstrip("0") or digits


def _number(value: Any) -> float | None:
    try:
        number = float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None
    return number if np.isfinite(number) else None


def _row_value(row: dict[str, Any], *keys: str) -> Any:
    lowered = {str(key).lower(): value for key, value in row.items()}
    for key in keys:
        value = row.get(key, lowered.get(key.lower()))
        if value is not None and str(value).strip() != "":
            return value
    return ""


def _school_from_mapping(row: dict[str, Any]) -> School | None:
    code = _normalize_code(_row_value(row, "code", "codigo", "CODIGO", "codigo_local"))
    lat = _number(_row_value(row, "lat", "LAT_DEC", "latitud", "latitude"))
    lon = _number(_row_value(row, "lon", "lng", "LNG_DEC", "longitud", "longitude"))
    if not code or lat is None or lon is None or not (-85 <= lat <= 85) or not (-180 <= lon <= 180):
        return None
    return School(
        code=code,
        name=str(_row_value(row, "name", "nombre", "NOMBRE")),
        department=str(_row_value(row, "department", "departamento", "DEPTO")),
        district=str(_row_value(row, "district", "distrito", "DIST")),
        locality=str(_row_value(row, "locality", "localidad", "LOCALIDAD")),
        lat=lat,
        lon=lon,
    )


def _load_schools(path: Path) -> list[School]:
    if not path.exists():
        raise SystemExit(f"No existe el archivo de escuelas: {path}")
    rows: list[dict[str, Any]]
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
    else:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            rows = payload
        elif isinstance(payload, dict):
            rows = payload.get("schools") or payload.get("rows") or []
        else:
            rows = []
    schools = [school for row in rows if isinstance(row, dict) if (school := _school_from_mapping(row))]
    return list({school.code: school for school in schools}.values())


def _validate_inpe_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST:
        raise ValueError(f"URL de imagen no permitida: {url}")


def _stac_context(allow_insecure: bool) -> ssl.SSLContext | None:
    return ssl._create_unverified_context() if allow_insecure else None


def _query_items(school: School, candidate_limit: int, allow_insecure: bool) -> list[dict[str, Any]]:
    payload = json.dumps({
        "collections": [COLLECTION_ID],
        "intersects": {"type": "Point", "coordinates": [school.lon, school.lat]},
        "limit": min(50, max(candidate_limit * 3, candidate_limit)),
    }).encode("utf-8")
    request = urllib.request.Request(
        STAC_URL,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "CIALPA-imagery/1.0"},
        method="POST",
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(
                request,
                timeout=90,
                context=_stac_context(allow_insecure),
            ) as response:
                features = json.load(response).get("features", [])
                return sorted(
                    features,
                    key=lambda item: str(item.get("properties", {}).get("datetime", "")),
                    reverse=True,
                )
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"No se pudo consultar INPE STAC: {last_error}")


def _stretch(array: np.ndarray, mask: np.ndarray) -> np.ndarray:
    low, high = np.percentile(array[mask], [1, 99])
    return np.clip((array - low) * 255.0 / max(float(high - low), 1.0), 0, 255)


def _quality_score(stretched: np.ndarray) -> float:
    grad = float(np.abs(np.diff(stretched, axis=1)).mean() + np.abs(np.diff(stretched, axis=0)).mean())
    center = stretched[1:-1, 1:-1]
    laplacian = (
        center * 4
        - stretched[:-2, 1:-1]
        - stretched[2:, 1:-1]
        - stretched[1:-1, :-2]
        - stretched[1:-1, 2:]
    )
    detail = float(np.sqrt(np.var(laplacian)))
    contrast = float(np.std(stretched))
    white_fraction = float(np.mean(stretched > 245))
    return grad + detail * 0.35 + contrast * 0.15 - white_fraction * 30


def _candidate_from_item(
    school: School,
    item: dict[str, Any],
    rank: int,
    buffer_m: float,
    cache: RasterCache,
) -> Candidate | None:
    asset = item.get("assets", {}).get("BAND0", {})
    url = str(asset.get("href", ""))
    if not url:
        return None
    source = cache.get(url)
    if source.crs is None or not source.crs.is_projected:
        raise ValueError(f"La escena {item.get('id')} no usa un CRS proyectado en metros.")
    x, y = transform("EPSG:4326", source.crs, [school.lon], [school.lat])
    window = from_bounds(
        x[0] - buffer_m,
        y[0] - buffer_m,
        x[0] + buffer_m,
        y[0] + buffer_m,
        source.transform,
    ).round_offsets().round_lengths()
    array = source.read(1, window=window, boundless=True, fill_value=0).astype(np.float32)
    nodata = source.nodata
    mask = np.isfinite(array) & (array > 0)
    if nodata is not None:
        mask &= array != nodata
    valid_fraction = float(mask.mean()) if mask.size else 0
    if valid_fraction < 0.95 or int(mask.sum()) < 500:
        return None
    stretched = _stretch(array, mask)
    source_bounds = window_bounds(window, source.transform)
    west, south, east, north = transform_bounds(
        source.crs,
        "EPSG:4326",
        *source_bounds,
        densify_pts=21,
    )
    return Candidate(
        item_id=str(item.get("id", "")),
        acquired_at=str(item.get("properties", {}).get("datetime", "")),
        rank=rank,
        array=stretched,
        bounds_wgs84={
            "west": round(float(west), 10),
            "south": round(float(south), 10),
            "east": round(float(east), 10),
            "north": round(float(north), 10),
        },
        valid_fraction=valid_fraction,
        raw_median=float(np.median(array[mask])),
        quality_score=_quality_score(stretched),
    )


def _select_candidate(candidates: list[Candidate]) -> Candidate:
    typical_median = float(np.median([candidate.raw_median for candidate in candidates]))
    for candidate in candidates:
        brightness_ratio = candidate.raw_median / max(typical_median, 1.0)
        cloud_penalty = max(0.0, brightness_ratio - 1.7) * 18
        recency_bonus = max(0.0, 5.0 - candidate.rank * 0.65)
        candidate.final_score = candidate.quality_score + recency_bonus - cloud_penalty
    return max(candidates, key=lambda candidate: candidate.final_score)


def _output_path(root: Path, school: School, buffer_m: float) -> Path:
    radius = int(round(buffer_m))
    return root / school.code / f"cbers4a-wpm-pan-{radius}m.webp"


def _save_image(candidate: Candidate, path: Path, output_size: int) -> None:
    image = Image.fromarray(candidate.array.astype(np.uint8))
    image = image.resize((output_size, output_size), Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.04)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", quality=92, method=6)


def _read_index(path: Path) -> dict[str, Any]:
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            payload.setdefault("sources", {})
            return payload
    return {"schema": "cialpa_highres_school_index_v1", "sources": {}}


def _write_index(path: Path, payload: dict[str, Any]) -> None:
    sources = payload.setdefault("sources", {})
    payload["schema"] = "cialpa_highres_school_index_v1"
    payload["updated_at"] = datetime.now(timezone.utc).date().isoformat()
    payload["count"] = len(sources)
    payload["sources"] = dict(sorted(sources.items(), key=lambda item: item[0]))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def _relative_to_app(path: Path) -> str:
    return path.resolve().relative_to(APP_ROOT.resolve()).as_posix()


def _install_index_entry(
    payload: dict[str, Any],
    school: School,
    candidate: Candidate,
    image_path: Path,
    buffer_m: float,
) -> None:
    acquired_date = candidate.acquired_at[:10]
    payload.setdefault("sources", {})[school.code] = {
        "active": True,
        "label": "CBERS-4A PAN 2 m",
        "imageUrl": _relative_to_app(image_path),
        "bounds": candidate.bounds_wgs84,
        "attribution": f"CBERS-4A/WPM - INPE - CC BY 4.0 - {acquired_date}",
        "status": "image_ready_active",
        "minZoom": 14,
        "maxZoom": 21,
        "bufferM": buffer_m,
        "resolutionM": 2,
        "dataset": COLLECTION_ID,
        "itemId": candidate.item_id,
        "acquiredAt": candidate.acquired_at,
        "license": "CC-BY-4.0",
        "licenseUrl": LICENSE_URL,
        "sourceUrl": COLLECTION_URL,
        "qualityScore": round(candidate.final_score, 3),
    }


def _candidate_summary(candidate: Candidate) -> dict[str, Any]:
    return {
        "itemId": candidate.item_id,
        "acquiredAt": candidate.acquired_at,
        "validFraction": round(candidate.valid_fraction, 4),
        "qualityScore": round(candidate.quality_score, 3),
        "finalScore": round(candidate.final_score, 3),
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Descarga recortes CBERS-4A/WPM PAN de 2 m y actualiza la app CIALPA.",
    )
    parser.add_argument("--input", type=Path, help="CSV o JSON con escuelas y coordenadas")
    parser.add_argument("--school-code")
    parser.add_argument("--lat", type=float)
    parser.add_argument("--lon", type=float)
    parser.add_argument("--name", default="")
    parser.add_argument("--department", default="")
    parser.add_argument("--district", default="")
    parser.add_argument("--locality", default="")
    parser.add_argument("--codes", help="Codigos separados por coma para filtrar el archivo")
    parser.add_argument("--department-filter", help="Departamento para filtrar el archivo")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--buffer-m", type=float, default=100)
    parser.add_argument("--candidate-limit", type=int, default=4)
    parser.add_argument("--output-size", type=int, default=600)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--index", type=Path, default=INDEX_PATH)
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--allow-insecure-stac", action="store_true")
    parser.add_argument("--pause", type=float, default=0.05)
    return parser


def _schools_from_args(args: argparse.Namespace) -> list[School]:
    schools = _load_schools(args.input) if args.input else []
    if args.school_code and args.lat is not None and args.lon is not None:
        explicit = School(
            code=_normalize_code(args.school_code),
            name=args.name,
            department=args.department,
            district=args.district,
            locality=args.locality,
            lat=args.lat,
            lon=args.lon,
        )
        schools = [school for school in schools if school.code != explicit.code] + [explicit]
    elif args.school_code:
        wanted = _normalize_code(args.school_code)
        schools = [school for school in schools if school.code == wanted]
    if not schools:
        raise SystemExit("Indique --input o --school-code junto con --lat y --lon.")
    if args.codes:
        wanted = {_normalize_code(code) for code in args.codes.split(",")}
        schools = [school for school in schools if school.code in wanted]
    if args.department_filter:
        wanted_department = args.department_filter.casefold().strip()
        schools = [school for school in schools if school.department.casefold().strip() == wanted_department]
    start = max(0, args.start)
    end = None if args.limit is None else start + max(0, args.limit)
    return schools[start:end]


def main() -> int:
    args = _parser().parse_args()
    if args.buffer_m <= 0 or args.candidate_limit <= 0 or args.output_size < 100:
        raise SystemExit("Buffer, cantidad de candidatos y tamano de salida deben ser positivos.")
    if args.allow_insecure_stac:
        print("ADVERTENCIA: verificacion TLS de STAC desactivada solo para data.inpe.br.")
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF")
    os.environ.setdefault("VSI_CACHE", "TRUE")
    schools = _schools_from_args(args)
    index = _read_index(args.index)
    report: dict[str, Any] = {
        "schema": "cialpa_cbers4a_wpm_download_report_v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "collection": COLLECTION_ID,
        "requested": len(schools),
        "results": [],
    }
    installed = skipped = failed = 0
    with RasterCache() as cache:
        for position, school in enumerate(schools, start=1):
            image_path = _output_path(args.output_root, school, args.buffer_m)
            existing = index.get("sources", {}).get(school.code, {})
            if args.skip_existing and image_path.exists() and existing.get("imageUrl"):
                skipped += 1
                print(f"[{position}/{len(schools)}] {school.code}: existente")
                continue
            try:
                items = _query_items(school, args.candidate_limit, args.allow_insecure_stac)
                candidates: list[Candidate] = []
                for rank, item in enumerate(items):
                    candidate = _candidate_from_item(school, item, rank, args.buffer_m, cache)
                    if candidate:
                        candidates.append(candidate)
                    if len(candidates) >= args.candidate_limit:
                        break
                if not candidates:
                    raise RuntimeError("sin escena valida en el punto")
                selected = _select_candidate(candidates)
                _save_image(selected, image_path, args.output_size)
                _install_index_entry(index, school, selected, image_path, args.buffer_m)
                _write_index(args.index, index)
                installed += 1
                report["results"].append({
                    "code": school.code,
                    "status": "installed",
                    "selected": _candidate_summary(selected),
                    "candidates": [_candidate_summary(candidate) for candidate in candidates],
                })
                print(
                    f"[{position}/{len(schools)}] {school.code}: {selected.item_id} "
                    f"({selected.final_score:.1f})"
                )
            except Exception as exc:  # Continue the batch and report every failure.
                failed += 1
                report["results"].append({"code": school.code, "status": "failed", "error": str(exc)})
                print(f"[{position}/{len(schools)}] {school.code}: ERROR {exc}")
            if args.pause > 0:
                time.sleep(args.pause)
    report["installed"] = installed
    report["skipped"] = skipped
    report["failed"] = failed
    DEFAULT_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = DEFAULT_REPORT_DIR / f"cbers4a-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Resultado: {installed} instaladas, {skipped} omitidas, {failed} fallidas.")
    print(f"Reporte: {report_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
