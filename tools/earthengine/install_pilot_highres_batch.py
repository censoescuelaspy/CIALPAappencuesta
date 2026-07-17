#!/usr/bin/env python
"""Install downloaded pilot GeoTIFF exports for every school in the worklist."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_WORKLIST = SCRIPT_DIR / "output" / "pilot-schools-worklist.json"
INSTALLER = SCRIPT_DIR / "install_school_highres.py"


def _school_code(value: object) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _load_worklist(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data if isinstance(data, list) else data.get("schools") or data.get("escuelas") or data.get("data") or []
    if not rows:
        raise SystemExit(f"La worklist no tiene escuelas: {path}")
    return rows


def _build_tif_index(src_dir: Path) -> tuple[dict[str, list[Path]], int]:
    by_numeric_token: dict[str, list[Path]] = {}
    total = 0
    for path in src_dir.rglob("*"):
        if path.suffix.lower() not in {".tif", ".tiff"} or not path.is_file():
            continue
        total += 1
        for token in set(re.findall(r"\d+", path.stem)):
            by_numeric_token.setdefault(token, []).append(path)
    return by_numeric_token, total


def _find_tif(tif_index: dict[str, list[Path]], code: str, order: object = "") -> Path | None:
    candidates = list(tif_index.get(code, []))
    if not candidates:
        return None
    order_text = _school_code(order)
    if order_text:
        expected = re.compile(rf"(?:^|_){re.escape(order_text)}_{re.escape(code)}(?:_|$)", re.IGNORECASE)
        ordered = [path for path in candidates if expected.search(path.stem)]
        if ordered:
            candidates = ordered
    nicfi = [path for path in candidates if "NICFI" in path.name.upper()]
    return sorted(nicfi or candidates, key=lambda item: (len(item.name), item.name))[0]


def _arg_if_value(flag: str, value: object) -> list[str]:
    text = str(value or "").strip()
    return [flag, text] if text else []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worklist", type=Path, default=DEFAULT_WORKLIST)
    parser.add_argument("--src-dir", type=Path, required=True, help="Carpeta donde se descargaron los GeoTIFF de Drive")
    parser.add_argument("--only", default="", help="Lista de codigos separados por coma")
    parser.add_argument("--activate", action="store_true", help="Activa cada fuente en el indice consumido por la app")
    parser.add_argument("--license-confirmed", action="store_true")
    parser.add_argument("--delivery", choices=["image", "tiles"], default="image")
    parser.add_argument("--public-base-url", default="")
    parser.add_argument("--buffer", type=float, default=100)
    parser.add_argument("--dry-run", action="store_true", help="Muestra que se instalaria sin convertir")
    parser.add_argument("--min-zoom", type=int, default=14)
    parser.add_argument("--max-zoom", type=int, default=19)
    parser.add_argument("--min-value", type=float, default=64)
    parser.add_argument("--max-value", type=float, default=5454)
    parser.add_argument("--gamma", type=float, default=1.4)
    args = parser.parse_args()

    worklist = args.worklist.resolve()
    src_dir = args.src_dir.resolve()
    if not worklist.exists():
        raise SystemExit(f"No existe worklist: {worklist}")
    if not src_dir.exists():
        raise SystemExit(f"No existe carpeta GeoTIFF: {src_dir}")

    only = {_school_code(item) for item in args.only.split(",") if _school_code(item)}
    schools = _load_worklist(worklist)
    tif_index, tif_count = _build_tif_index(src_dir)
    print(f"GeoTIFF indexados: {tif_count}")
    processed = 0
    missing: list[str] = []

    for school in schools:
        code = _school_code(school.get("code") or school.get("codigo") or school.get("codigo_local"))
        if not code or (only and code not in only):
            continue

        tif_path = _find_tif(tif_index, code, school.get("order") or school.get("orden"))
        if not tif_path:
            missing.append(code)
            continue

        command = [
            sys.executable,
            str(INSTALLER),
            str(tif_path),
            "--school-code",
            code,
            "--delivery",
            args.delivery,
            "--buffer",
            str(args.buffer),
            "--min-zoom",
            str(args.min_zoom),
            "--max-zoom",
            str(args.max_zoom),
            "--min-value",
            str(args.min_value),
            "--max-value",
            str(args.max_value),
            "--gamma",
            str(args.gamma),
        ]
        command += _arg_if_value("--name", school.get("name") or school.get("nombre"))
        command += _arg_if_value("--department", school.get("department") or school.get("departamento"))
        command += _arg_if_value("--district", school.get("district") or school.get("distrito"))
        command += _arg_if_value("--locality", school.get("locality") or school.get("localidad"))
        if args.public_base_url:
            command += ["--public-url", f"{args.public_base_url.rstrip('/')}/{code}/nicfi-100m.png"]
        if args.activate:
            command.append("--activate")
        if args.license_confirmed:
            command.append("--license-confirmed")

        print(f"[{code}] {tif_path}")
        if args.dry_run:
            print(" ".join(command))
        else:
            subprocess.run(command, cwd=APP_ROOT, check=True)
        processed += 1

    print(f"Procesadas: {processed}")
    print(f"Sin GeoTIFF descargado: {len(missing)}")
    if missing:
        print("Codigos faltantes: " + ", ".join(missing))


if __name__ == "__main__":
    main()
