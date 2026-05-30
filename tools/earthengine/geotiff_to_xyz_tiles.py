#!/usr/bin/env python
"""Convert a small georeferenced RGB GeoTIFF into XYZ PNG tiles.

This helper is intentionally small and project-local because the workstation
does not always have GDAL command-line tools available.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds


WEB_MERCATOR = "EPSG:3857"
WEB_HALF_WORLD = 20037508.342789244
TILE_SIZE = 256


def tile_bounds_3857(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    tiles = 2**z
    span = (WEB_HALF_WORLD * 2) / tiles
    left = -WEB_HALF_WORLD + x * span
    right = left + span
    top = WEB_HALF_WORLD - y * span
    bottom = top - span
    return left, bottom, right, top


def bounds_to_tiles(bounds: tuple[float, float, float, float], z: int) -> tuple[int, int, int, int]:
    left, bottom, right, top = bounds
    tiles = 2**z
    span = (WEB_HALF_WORLD * 2) / tiles
    x_min = math.floor((left + WEB_HALF_WORLD) / span)
    x_max = math.floor((right + WEB_HALF_WORLD) / span)
    y_min = math.floor((WEB_HALF_WORLD - top) / span)
    y_max = math.floor((WEB_HALF_WORLD - bottom) / span)
    return (
        max(0, min(tiles - 1, x_min)),
        max(0, min(tiles - 1, x_max)),
        max(0, min(tiles - 1, y_min)),
        max(0, min(tiles - 1, y_max)),
    )


def scale_rgb(data: np.ndarray, nodata_mask: np.ndarray, min_value: float, max_value: float, gamma: float) -> np.ndarray:
    clipped = np.clip((data - min_value) / max(max_value - min_value, 1e-9), 0, 1)
    if gamma and gamma > 0:
      clipped = np.power(clipped, 1 / gamma)
    rgb = np.round(clipped * 255).astype(np.uint8)
    alpha = np.where(nodata_mask, 0, 255).astype(np.uint8)
    return np.dstack([rgb[0], rgb[1], rgb[2], alpha])


def convert(src_path: Path, out_dir: Path, min_zoom: int, max_zoom: int, min_value: float, max_value: float, gamma: float) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    written = 0

    with rasterio.open(src_path) as src:
        mercator_bounds = transform_bounds(src.crs, WEB_MERCATOR, *src.bounds, densify_pts=21)

        for z in range(min_zoom, max_zoom + 1):
            x_min, x_max, y_min, y_max = bounds_to_tiles(mercator_bounds, z)
            for x in range(x_min, x_max + 1):
                for y in range(y_min, y_max + 1):
                    left, bottom, right, top = tile_bounds_3857(z, x, y)
                    dst_transform = from_bounds(left, bottom, right, top, TILE_SIZE, TILE_SIZE)
                    dst = np.full((3, TILE_SIZE, TILE_SIZE), np.nan, dtype=np.float32)

                    for band in range(1, min(3, src.count) + 1):
                        reproject(
                            source=rasterio.band(src, band),
                            destination=dst[band - 1],
                            src_transform=src.transform,
                            src_crs=src.crs,
                            dst_transform=dst_transform,
                            dst_crs=WEB_MERCATOR,
                            src_nodata=np.nan,
                            dst_nodata=np.nan,
                            resampling=Resampling.bilinear,
                        )

                    nodata_mask = ~np.isfinite(dst).all(axis=0)
                    if nodata_mask.all():
                        continue
                    dst = np.nan_to_num(dst, nan=min_value)
                    tile = scale_rgb(dst, nodata_mask, min_value, max_value, gamma)

                    tile_path = out_dir / str(z) / str(x) / f"{y}.png"
                    tile_path.parent.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(tile).save(tile_path, optimize=True)
                    written += 1

    return written


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("src", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--min-zoom", type=int, default=17)
    parser.add_argument("--max-zoom", type=int, default=19)
    parser.add_argument("--min-value", type=float, default=0)
    parser.add_argument("--max-value", type=float, default=3000)
    parser.add_argument("--gamma", type=float, default=1.25)
    args = parser.parse_args()

    count = convert(args.src, args.out, args.min_zoom, args.max_zoom, args.min_value, args.max_value, args.gamma)
    print(f"Tiles escritos: {count}")


if __name__ == "__main__":
    main()
