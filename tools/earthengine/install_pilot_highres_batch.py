#!/usr/bin/env python
"""Install downloaded pilot GeoTIFF exports for every school in the worklist."""

from __future__ import annotations

import argparse
import json
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


def _find_tif(src_dir: Path, code: str) -> Path | None:
    candidates: list[Path] = []
    for path in src_dir.rglob(f"*{code}*"):
        if path.suffix.lower() in {".tif", ".tiff"} and path.is_file():
            candidates.append(path)
    if not candidates:
        return None
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
    parser.add_argument("--activate", action="store_true", help="Activa cada fuente local en config.js")
    parser.add_argument("--dry-run", action="store_true", help="Muestra que se instalaria sin convertir")
    parser.add_argument("--min-zoom", type=int, default=17)
    parser.add_argument("--max-zoom", type=int, default=20)
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
    processed = 0
    missing: list[str] = []

    for school in schools:
        code = _school_code(school.get("code") or school.get("codigo") or school.get("codigo_local"))
        if not code or (only and code not in only):
            continue

        tif_path = _find_tif(src_dir, code)
        if not tif_path:
            missing.append(code)
            continue

        command = [
            sys.executable,
            str(INSTALLER),
            str(tif_path),
            "--school-code",
            code,
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
        if args.activate:
            command.append("--activate")

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
