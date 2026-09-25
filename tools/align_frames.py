#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Frame-consistency gate for TA-TEEL-MV.

It implements the repository's interim gate while the original align_frames.py
is unavailable: an 8×8 grayscale average hash and Hamming-distance report.

A sequence passes only when every consecutive pair is <= 25.  Add --loop when
the last frame must close to the first; that additional pair must be <= 12.
The script never alters source frames.  A failed candidate must be retained by
the caller with the -REJECTED suffix and regenerated as F{n}r.jpg.

Examples:
  python3 align_frames.py frames/01-event-studio/F1.jpg frames/01-event-studio/F2.jpg \
    --report logs/01-event-studio-align-report.json
  python3 align_frames.py frames/02-loop/F1.jpg frames/02-loop/F2.jpg ... --loop \
    --report logs/02-loop-align-report.json --contact-sheet contact-sheet.jpg
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install it in the production Python environment: "
        "python3 -m pip install Pillow"
    ) from exc

CONTINUOUS_LIMIT = 25
LOOP_LIMIT = 12
HASH_SIZE = 8


def average_hash(path: Path) -> tuple[str, int, tuple[int, int]]:
    """Return a conventional 8×8 grayscale aHash as a 64-bit integer."""
    with Image.open(path) as original:
        rgb = original.convert("L")
        size = rgb.size
        # LANCZOS is deterministic and avoids arbitrary cropping/reframing.
        small = rgb.resize((HASH_SIZE, HASH_SIZE), Image.Resampling.LANCZOS)
        pixels = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    mean = sum(pixels) / len(pixels)
    value = 0
    for pixel in pixels:
        value = (value << 1) | int(pixel >= mean)
    return f"{value:016x}", value, size


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def make_contact_sheet(paths: list[Path], output: Path) -> None:
    """Create a review-only contact sheet; source frames remain untouched."""
    thumb_w = 300
    padding = 16
    label_h = 28
    thumbs: list[tuple[Path, Image.Image]] = []
    for path in paths:
        with Image.open(path) as original:
            im = original.convert("RGB")
            im.thumbnail((thumb_w, 9999), Image.Resampling.LANCZOS)
            thumbs.append((path, im.copy()))
    cols = min(3, len(thumbs))
    rows = (len(thumbs) + cols - 1) // cols
    cell_h = max(im.height for _, im in thumbs) + label_h + padding
    sheet = Image.new("RGB", (cols * (thumb_w + padding) + padding, rows * cell_h + padding), "#0d1526")
    draw = ImageDraw.Draw(sheet)
    for index, (path, im) in enumerate(thumbs):
        col, row = index % cols, index // cols
        x = padding + col * (thumb_w + padding)
        y = padding + row * cell_h
        sheet.paste(im, (x, y))
        draw.text((x, y + im.height + 5), path.name, fill="#d9b23c")
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92)


def main() -> int:
    parser = argparse.ArgumentParser(description="8×8 aHash consistency gate")
    parser.add_argument("frames", nargs="+", help="Ordered source-frame paths")
    parser.add_argument("--loop", action="store_true", help="Also test final-to-first closure at <= 12")
    parser.add_argument("--report", default="align-report.json", help="JSON report path")
    parser.add_argument("--contact-sheet", help="Optional review-only JPEG output")
    args = parser.parse_args()

    paths = [Path(raw) for raw in args.frames]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        parser.error("Missing frame(s): " + ", ".join(missing))

    hashes = []
    values = []
    dimensions = []
    file_hashes = []
    for path in paths:
        hash_hex, hash_value, size = average_hash(path)
        hashes.append(hash_hex)
        values.append(hash_value)
        dimensions.append(size)
        file_hashes.append(hashlib.sha256(path.read_bytes()).hexdigest())

    pair_reports = []
    for index in range(len(paths) - 1):
        distance = hamming(values[index], values[index + 1])
        pair_reports.append({
            "from": str(paths[index]),
            "to": str(paths[index + 1]),
            "kind": "continuous",
            "hamming": distance,
            "limit": CONTINUOUS_LIMIT,
            "pass": distance <= CONTINUOUS_LIMIT,
        })
    if args.loop and len(paths) > 1:
        distance = hamming(values[-1], values[0])
        pair_reports.append({
            "from": str(paths[-1]),
            "to": str(paths[0]),
            "kind": "loop_closure",
            "hamming": distance,
            "limit": LOOP_LIMIT,
            "pass": distance <= LOOP_LIMIT,
        })

    same_dimensions = len(set(dimensions)) == 1
    passed = same_dimensions and all(pair["pass"] for pair in pair_reports)
    report = {
        "method": "8x8 grayscale average hash; Hamming distance",
        "thresholds": {"continuous": CONTINUOUS_LIMIT, "loop_closure": LOOP_LIMIT},
        "loop_tested": args.loop,
        "source_frames_untouched": True,
        "same_dimensions": same_dimensions,
        "frames": [
            {
                "path": str(path),
                "size": {"width": size[0], "height": size[1]},
                "average_hash_8x8": hash_hex,
                "file_sha256": file_hash,
            }
            for path, size, hash_hex, file_hash in zip(paths, dimensions, hashes, file_hashes)
        ],
        "pairs": pair_reports,
        "pass": passed,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.contact_sheet:
        make_contact_sheet(paths, Path(args.contact_sheet))

    print(json.dumps({"report": str(report_path), "pass": passed, "pairs": pair_reports}, ensure_ascii=False))
    return 0 if passed else 2


if __name__ == "__main__":
    sys.exit(main())
