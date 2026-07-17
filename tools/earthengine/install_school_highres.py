#!/usr/bin/env python
"""Install a school GeoTIFF as local XYZ tiles for the CIALPA plan view."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

import rasterio
from rasterio.warp import transform_bounds

from geotiff_to_xyz_tiles import WEB_MERCATOR, bounds_to_tiles, convert
from geotiff_to_web_image import convert as convert_web_image


DEFAULT_SCHOOL_CODE = "101095"
APP_ROOT = Path(__file__).resolve().parents[2]
LEGACY_101095_MANIFEST = APP_ROOT / "assets" / "data" / "highres-school-pilot-isla-tuyu-101095.json"
CONFIG_PATH = APP_ROOT / "assets" / "js" / "config.js"
INDEX_PATH = APP_ROOT / "assets" / "data" / "highres-school-index.json"
BEGIN_MARKER = "  // BEGIN CIALPA_HIGHRES_SOURCES\n"
END_MARKER = "  // END CIALPA_HIGHRES_SOURCES\n"
DEFAULT_DATASET = "projects/planet-nicfi/assets/basemaps/americas"


def _school_code(value: str) -> str:
    code = re.sub(r"\D+", "", str(value or ""))
    if not code:
        raise SystemExit("El codigo de escuela es obligatorio.")
    return code


def _default_manifest(school_code: str) -> Path:
    if school_code == DEFAULT_SCHOOL_CODE and LEGACY_101095_MANIFEST.exists():
        return LEGACY_101095_MANIFEST
    return APP_ROOT / "assets" / "data" / f"highres-school-{school_code}.json"


def _default_out_dir(school_code: str) -> Path:
    return APP_ROOT / "assets" / "imagery" / "schools" / school_code / "nicfi-tiles"


def _default_out_image(school_code: str) -> Path:
    return APP_ROOT / "assets" / "imagery" / "schools" / school_code / "nicfi-100m.png"


def _relative_to_app(path: Path) -> str:
    return path.resolve().relative_to(APP_ROOT.resolve()).as_posix()


def _js_string(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=True)


def _coverage(src_path: Path, min_zoom: int, max_zoom: int, out_dir: Path) -> list[dict[str, int]]:
    rows: list[dict[str, int]] = []
    with rasterio.open(src_path) as src:
        mercator_bounds = transform_bounds(src.crs, WEB_MERCATOR, *src.bounds, densify_pts=21)
    for z in range(min_zoom, max_zoom + 1):
        x_min, x_max, y_min, y_max = bounds_to_tiles(mercator_bounds, z)
        tile_count = len(list((out_dir / str(z)).glob("*/*.png"))) if (out_dir / str(z)).exists() else 0
        rows.append({
            "z": z,
            "x_min": x_min,
            "x_max": x_max,
            "y_min": y_min,
            "y_max": y_max,
            "tile_count": tile_count,
        })
    return rows


def _read_or_create_manifest(manifest_path: Path, school_code: str) -> dict:
    if manifest_path.exists():
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    return {
        "schema": "cialpa_highres_school_basemap_v1",
        "status": "pending_tiles",
        "generated_at": date.today().isoformat(),
        "school": {
            "code": school_code,
            "name": "",
            "department": "",
            "district": "",
            "locality": "",
        },
        "area": {
            "buffer_m": 500,
        },
        "earth_engine": {
            "recommended_dataset": DEFAULT_DATASET,
        },
        "app": {
            "basemap_source": "highres",
        },
    }


def _update_manifest(
    manifest_path: Path,
    school_code: str,
    src_path: Path,
    out_dir: Path,
    min_zoom: int,
    max_zoom: int,
    label: str,
    attribution: str,
    dataset: str,
    school_name: str,
    department: str,
    district: str,
    locality: str,
) -> None:
    data = _read_or_create_manifest(manifest_path, school_code)
    data["schema"] = data.get("schema") or "cialpa_highres_school_basemap_v1"
    data["status"] = "tiles_ready_pending_visual_qc"
    data["updated_at"] = date.today().isoformat()

    school = data.setdefault("school", {})
    school["code"] = school_code
    if school_name:
        school["name"] = school_name
    if department:
        school["department"] = department
    if district:
        school["district"] = district
    if locality:
        school["locality"] = locality

    template = f"{_relative_to_app(out_dir)}/{{z}}/{{x}}/{{y}}.png"
    data["tiles"] = {
        "template": template,
        "local_folder": _relative_to_app(out_dir),
        "min_zoom": min_zoom,
        "max_zoom": max_zoom,
        "coverage_xyz": _coverage(src_path, min_zoom, max_zoom, out_dir),
    }

    earth_engine = data.setdefault("earth_engine", {})
    earth_engine["used_export"] = src_path.as_posix()
    earth_engine["used_dataset"] = dataset

    app = data.setdefault("app", {})
    app["basemap_source"] = "highres"
    app["label"] = label
    app["attribution"] = attribution
    app["notes"] = (
        "Tiles locales preparados desde GeoTIFF. Activar definitivamente solo "
        "despues de confirmar visualmente que mejora la base satelital online."
    )

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def _source_entry(
    school_code: str,
    tile_url: str,
    label: str,
    attribution: str,
    manifest_url: str,
    min_zoom: int,
    max_zoom: int,
) -> str:
    return (
        f"    {_js_string(school_code)}: {{\n"
        f"      label: {_js_string(label)},\n"
        f"      tileUrl: {_js_string(tile_url)},\n"
        f"      attribution: {_js_string(attribution)},\n"
        f"      manifestUrl: {_js_string(manifest_url)},\n"
        "      status: 'tiles_ready_pending_visual_qc',\n"
        f"      minZoom: {min_zoom},\n"
        f"      maxZoom: {max_zoom},\n"
        "    },\n"
    )


def _activate_config(
    school_code: str,
    tile_url: str,
    label: str,
    attribution: str,
    manifest_url: str,
    min_zoom: int,
    max_zoom: int,
) -> None:
    text = CONFIG_PATH.read_text(encoding="utf-8")
    start = text.index(BEGIN_MARKER) + len(BEGIN_MARKER)
    end = text.index(END_MARKER)
    block = text[start:end]
    open_index = block.find("{")
    close_index = block.rfind("}")
    if open_index < 0 or close_index < 0 or close_index <= open_index:
        raise SystemExit("No se pudo ubicar PLAN_BASEMAP_HIGHRES_SOURCES en config.js.")

    inner = block[open_index + 1:close_index]
    entry_pattern = re.compile(
        r"\n\s*['\"]" + re.escape(school_code) + r"['\"]\s*:\s*\{.*?\n\s*\},",
        re.DOTALL,
    )
    inner = entry_pattern.sub("", inner).strip()
    entry = _source_entry(school_code, tile_url, label, attribution, manifest_url, min_zoom, max_zoom)
    extra = f"{inner}\n" if inner else ""
    source_block = "  PLAN_BASEMAP_HIGHRES_SOURCES: {\n" + entry + extra + "  },\n"
    CONFIG_PATH.write_text(text[:start] + source_block + text[end:], encoding="utf-8")


def _update_image_manifest(
    manifest_path: Path,
    school_code: str,
    src_path: Path,
    image_path: Path,
    image_url: str,
    image_info: dict,
    buffer_m: float,
    label: str,
    attribution: str,
    dataset: str,
    school_name: str,
    department: str,
    district: str,
    locality: str,
    active: bool,
) -> None:
    data = _read_or_create_manifest(manifest_path, school_code)
    data["schema"] = data.get("schema") or "cialpa_highres_school_basemap_v1"
    data["status"] = "image_ready_active" if active else "image_ready_pending_visual_qc"
    data["updated_at"] = date.today().isoformat()

    school = data.setdefault("school", {})
    school["code"] = school_code
    for key, value in (
        ("name", school_name),
        ("department", department),
        ("district", district),
        ("locality", locality),
    ):
        if value:
            school[key] = value

    data["area"] = {
        **(data.get("area") or {}),
        "buffer_m": buffer_m,
        "bbox_wgs84": image_info["bounds"],
    }
    data["image"] = {
        "url": image_url,
        "local_file": _relative_to_app(image_path),
        "width": image_info["width"],
        "height": image_info["height"],
        "bounds_wgs84": image_info["bounds"],
    }
    data.pop("tiles", None)

    earth_engine = data.setdefault("earth_engine", {})
    earth_engine["used_export"] = src_path.as_posix()
    earth_engine["used_dataset"] = dataset

    app = data.setdefault("app", {})
    app["basemap_source"] = "highres" if active else ""
    app["label"] = label
    app["attribution"] = attribution
    app["notes"] = (
        "Imagen georreferenciada unica para el radio escolar. La satelital estable "
        "permanece debajo como respaldo fuera de la cobertura."
    )

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def _activate_index(
    school_code: str,
    image_url: str,
    bounds: dict,
    label: str,
    attribution: str,
    manifest_url: str,
    min_zoom: int,
    max_zoom: int,
    buffer_m: float,
    dataset: str,
) -> None:
    if INDEX_PATH.exists():
        payload = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    else:
        payload = {"schema": "cialpa_highres_school_index_v1", "sources": {}}
    sources = payload.setdefault("sources", {})
    sources[school_code] = {
        "active": True,
        "label": label,
        "imageUrl": image_url,
        "bounds": bounds,
        "attribution": attribution,
        "manifestUrl": manifest_url,
        "status": "image_ready_active",
        "minZoom": min_zoom,
        "maxZoom": max_zoom,
        "bufferM": buffer_m,
        "dataset": dataset,
    }
    payload["schema"] = "cialpa_highres_school_index_v1"
    payload["updated_at"] = date.today().isoformat()
    payload["count"] = len(sources)
    payload["sources"] = dict(sorted(sources.items(), key=lambda item: item[0]))
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("src", type=Path, help="GeoTIFF exported from Earth Engine")
    parser.add_argument("--school-code", default=DEFAULT_SCHOOL_CODE)
    parser.add_argument("--delivery", choices=["image", "tiles"], default="image")
    parser.add_argument("--out", type=Path, help="PNG de salida o carpeta de tiles, segun --delivery")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--label", default="NICFI 4.77 m")
    parser.add_argument("--attribution")
    parser.add_argument("--content-year", type=int, default=date.today().year)
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--name", default="")
    parser.add_argument("--department", default="")
    parser.add_argument("--district", default="")
    parser.add_argument("--locality", default="")
    parser.add_argument("--buffer", type=float, default=100)
    parser.add_argument("--min-zoom", type=int, default=14)
    parser.add_argument("--max-zoom", type=int, default=19)
    parser.add_argument("--min-value", type=float, default=64)
    parser.add_argument("--max-value", type=float, default=5454)
    parser.add_argument("--gamma", type=float, default=1.4)
    parser.add_argument("--public-url", default="", help="URL estable del PNG si se publica fuera del repositorio")
    parser.add_argument("--activate", action="store_true", help="Show this source in the app after conversion")
    parser.add_argument(
        "--license-confirmed",
        action="store_true",
        help="Confirma que la licencia permite exponer esta imagen en el destino de la app",
    )
    args = parser.parse_args()

    school_code = _school_code(args.school_code)
    src_path = args.src.resolve()
    manifest_path = (args.manifest or _default_manifest(school_code)).resolve()
    attribution = args.attribution or f"Image (c) {args.content_year} Planet Labs PBC (NICFI)"

    if not src_path.exists():
        raise SystemExit(f"No existe el GeoTIFF: {src_path}")
    if args.activate and not args.license_confirmed:
        raise SystemExit(
            "Para activar una imagen en la app use tambien --license-confirmed. "
            "NICFI tiene restricciones de uso, reproduccion y distribucion."
        )

    manifest_url = _relative_to_app(manifest_path)
    if args.delivery == "image":
        image_path = (args.out or _default_out_image(school_code)).resolve()
        image_info = convert_web_image(
            src_path,
            image_path,
            args.min_value,
            args.max_value,
            args.gamma,
        )
        image_url = args.public_url.strip() or _relative_to_app(image_path)
        _update_image_manifest(
            manifest_path,
            school_code,
            src_path,
            image_path,
            image_url,
            image_info,
            args.buffer,
            args.label,
            attribution,
            args.dataset,
            args.name,
            args.department,
            args.district,
            args.locality,
            args.activate,
        )
        if args.activate:
            _activate_index(
                school_code,
                image_url,
                image_info["bounds"],
                args.label,
                attribution,
                manifest_url,
                args.min_zoom,
                args.max_zoom,
                args.buffer,
                args.dataset,
            )
        print(f"Escuela: {school_code}")
        print(f"Imagen web: {image_url}")
        print(f"Pixeles: {image_info['width']} x {image_info['height']}")
    else:
        out_dir = (args.out or _default_out_dir(school_code)).resolve()
        count = convert(src_path, out_dir, args.min_zoom, args.max_zoom, args.min_value, args.max_value, args.gamma)
        _update_manifest(
            manifest_path,
            school_code,
            src_path,
            out_dir,
            args.min_zoom,
            args.max_zoom,
            args.label,
            attribution,
            args.dataset,
            args.name,
            args.department,
            args.district,
            args.locality,
        )
        tile_url = f"{_relative_to_app(out_dir)}/{{z}}/{{x}}/{{y}}.png"
        if args.activate:
            _activate_config(school_code, tile_url, args.label, attribution, manifest_url, args.min_zoom, args.max_zoom)
        print(f"Escuela: {school_code}")
        print(f"Tiles escritos: {count}")
        print(f"Tiles: {tile_url}")

    print(f"Manifest: {manifest_url}")
    print(f"Fuente activada: {'si' if args.activate else 'no'}")


if __name__ == "__main__":
    main()
