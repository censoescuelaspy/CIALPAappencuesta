#!/usr/bin/env python
"""Convert a small RGB GeoTIFF into one transparent PNG plus WGS84 bounds."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import transform_bounds


def _scale_rgb(
    data: np.ndarray,
    mask: np.ndarray,
    min_value: float,
    max_value: float,
    gamma: float,
) -> np.ndarray:
    normalized = np.clip((data - min_value) / max(max_value - min_value, 1e-9), 0, 1)
    if gamma > 0:
        normalized = np.power(normalized, 1 / gamma)
    rgb = np.round(normalized * 255).astype(np.uint8)
    alpha = np.where(mask, 0, 255).astype(np.uint8)
    return np.dstack([rgb[0], rgb[1], rgb[2], alpha])


def convert(
    src_path: Path,
    out_path: Path,
    min_value: float,
    max_value: float,
    gamma: float,
) -> dict[str, object]:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(src_path) as src:
        if src.count < 3:
            raise ValueError(f"El GeoTIFF debe tener al menos tres bandas RGB: {src_path}")
        masked = src.read([1, 2, 3], masked=True).astype(np.float32)
        data = np.asarray(masked.filled(min_value), dtype=np.float32)
        band_masks = np.ma.getmaskarray(masked)
        nodata_mask = band_masks.any(axis=0) | ~np.isfinite(data).all(axis=0)
        data = np.nan_to_num(data, nan=min_value, posinf=max_value, neginf=min_value)
        image = _scale_rgb(data, nodata_mask, min_value, max_value, gamma)
        bounds = transform_bounds(src.crs, "EPSG:4326", *src.bounds, densify_pts=21)
        width = int(src.width)
        height = int(src.height)

    Image.fromarray(image).save(out_path, optimize=True)
    return {
        "width": width,
        "height": height,
        "bounds": {
            "west": round(float(bounds[0]), 10),
            "south": round(float(bounds[1]), 10),
            "east": round(float(bounds[2]), 10),
            "north": round(float(bounds[3]), 10),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("src", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--min-value", type=float, default=64)
    parser.add_argument("--max-value", type=float, default=5454)
    parser.add_argument("--gamma", type=float, default=1.4)
    args = parser.parse_args()
    result = convert(
        args.src.resolve(),
        args.out.resolve(),
        args.min_value,
        args.max_value,
        args.gamma,
    )
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
