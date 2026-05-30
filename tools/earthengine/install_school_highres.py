#!/usr/bin/env python
"""Install a school GeoTIFF as local XYZ tiles for the CIALPA plan view."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import rasterio
from rasterio.warp import transform_bounds

from geotiff_to_xyz_tiles import WEB_MERCATOR, bounds_to_tiles, convert


SCHOOL_CODE = "101095"
APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = APP_ROOT / "assets" / "data" / "highres-school-pilot-isla-tuyu-101095.json"
DEFAULT_OUT_DIR = APP_ROOT / "assets" / "imagery" / "schools" / SCHOOL_CODE / "nicfi-tiles"
CONFIG_PATH = APP_ROOT / "assets" / "js" / "config.js"
BEGIN_MARKER = "  // BEGIN CIALPA_HIGHRES_SOURCES\n"
END_MARKER = "  // END CIALPA_HIGHRES_SOURCES\n"


def _relative_to_app(path: Path) -> str:
    return path.resolve().relative_to(APP_ROOT.resolve()).as_posix()


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


def _update_manifest(
    manifest_path: Path,
    src_path: Path,
    out_dir: Path,
    min_zoom: int,
    max_zoom: int,
    label: str,
    attribution: str,
) -> None:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    template = f"{_relative_to_app(out_dir)}/{{z}}/{{x}}/{{y}}.png"
    data["status"] = "tiles_ready_pending_visual_qc"
    data["tiles"] = {
        "template": template,
        "local_folder": _relative_to_app(out_dir),
        "min_zoom": min_zoom,
        "max_zoom": max_zoom,
        "coverage_xyz": _coverage(src_path, min_zoom, max_zoom, out_dir),
    }
    earth_engine = data.setdefault("earth_engine", {})
    earth_engine["used_export"] = src_path.as_posix()
    earth_engine["used_dataset"] = "projects/planet-nicfi/assets/basemaps/americas"
    app = data.setdefault("app", {})
    app["basemap_source"] = "highres"
    app["label"] = label
    app["attribution"] = attribution
    app["notes"] = (
        "Tiles locales preparados desde GeoTIFF NICFI. Activar definitivamente "
        "solo despues de confirmar visualmente que supera a la base satelital."
    )
    manifest_path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def _activate_config(tile_url: str, label: str, attribution: str, manifest_url: str, min_zoom: int, max_zoom: int) -> None:
    text = CONFIG_PATH.read_text(encoding="utf-8")
    start = text.index(BEGIN_MARKER) + len(BEGIN_MARKER)
    end = text.index(END_MARKER)
    source_block = (
        "  PLAN_BASEMAP_HIGHRES_SOURCES: {\n"
        f"    '{SCHOOL_CODE}': {{\n"
        f"      label: '{label}',\n"
        f"      tileUrl: '{tile_url}',\n"
        f"      attribution: '{attribution}',\n"
        f"      manifestUrl: '{manifest_url}',\n"
        "      status: 'tiles_ready_pending_visual_qc',\n"
        f"      minZoom: {min_zoom},\n"
        f"      maxZoom: {max_zoom},\n"
        "    },\n"
        "  },\n"
    )
    CONFIG_PATH.write_text(text[:start] + source_block + text[end:], encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("src", type=Path, help="GeoTIFF exported from Earth Engine")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--label", default="NICFI 4.77 m")
    parser.add_argument("--attribution", default="Planet NICFI / Earth Engine - piloto Isla Tuyu 101095")
    parser.add_argument("--min-zoom", type=int, default=17)
    parser.add_argument("--max-zoom", type=int, default=20)
    parser.add_argument("--min-value", type=float, default=64)
    parser.add_argument("--max-value", type=float, default=5454)
    parser.add_argument("--gamma", type=float, default=1.4)
    parser.add_argument("--activate", action="store_true", help="Show this source in the app after conversion")
    args = parser.parse_args()

    src_path = args.src.resolve()
    out_dir = args.out.resolve()
    if not src_path.exists():
        raise SystemExit(f"No existe el GeoTIFF: {src_path}")

    count = convert(src_path, out_dir, args.min_zoom, args.max_zoom, args.min_value, args.max_value, args.gamma)
    _update_manifest(args.manifest.resolve(), src_path, out_dir, args.min_zoom, args.max_zoom, args.label, args.attribution)

    tile_url = f"{_relative_to_app(out_dir)}/{{z}}/{{x}}/{{y}}.png"
    manifest_url = _relative_to_app(args.manifest.resolve())
    if args.activate:
        _activate_config(tile_url, args.label, args.attribution, manifest_url, args.min_zoom, args.max_zoom)

    print(f"Tiles escritos: {count}")
    print(f"Tiles: {tile_url}")
    print(f"Manifest: {manifest_url}")
    print(f"Fuente activada: {'si' if args.activate else 'no'}")


if __name__ == "__main__":
    main()
