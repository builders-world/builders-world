"""Structural validation for the local Yaba GLB kit."""

from __future__ import annotations

import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
ASSET_DIR = ROOT / "assets" / "exports" / "models" / "yaba-kit"
REPORT = ASSET_DIR / "asset-validation.json"


def read_glb_json(path: Path):
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise ValueError("missing glTF magic")
    if struct.unpack_from("<I", data, 4)[0] != 2:
        raise ValueError("unsupported GLB version")
    chunk_length = struct.unpack_from("<I", data, 12)[0]
    chunk_type = data[16:20]
    if chunk_type != b"JSON":
        raise ValueError("first GLB chunk is not JSON")
    return json.loads(data[20 : 20 + chunk_length])


def validate(path: Path):
    document = read_glb_json(path)
    nodes = document.get("nodes", [])
    names = [node.get("name", "") for node in nodes]
    root_name = path.stem
    collision_nodes = [name for name in names if name.startswith("COLLISION_")]
    checks = {
        "glb_version_2": document.get("asset", {}).get("version") == "2.0",
        "named_root": root_name in names,
        "has_meshes": bool(document.get("meshes")),
        "has_pbr_materials": bool(document.get("materials")),
        "has_collision_proxy": bool(collision_nodes),
        "root_has_export_correction": any(
            node.get("name") == root_name and node.get("rotation") for node in nodes
        ),
    }
    return {
        "file": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "nodes": len(nodes),
        "meshes": len(document.get("meshes", [])),
        "materials": [material.get("name") for material in document.get("materials", [])],
        "collision_nodes": collision_nodes,
        "checks": checks,
        "ok": all(checks.values()),
    }


def main():
    results = [validate(path) for path in sorted(ASSET_DIR.glob("*.glb"))]
    report = {"schema": "builders-world.asset-validation.v1", "assets": results, "ok": all(item["ok"] for item in results)}
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
