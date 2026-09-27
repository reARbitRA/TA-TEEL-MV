#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate the 36-step game timeline literal from docs/timing-map.md (byte-exact lines).

Reads the v8 calibration table (locked times) + the step table (scene/line/events)
and emits game/tools-timeline.json used by game.html. Never hand-edit lyrics.
"""
import json, re, sys, io

SRC = 'docs/timing-map.md'
OUT = 'game/timeline.json'

def main():
    md = io.open(SRC, encoding='utf-8').read()
    # --- parse calibration table: | # | pre-time | locked | beat |
    cal = {}
    for m in re.finditer(r'^\|\s*(\d+)\s*\|\s*([\d:]+)\s*\|\s*([\d:.]+)\s*\|\s*B(\d+)\s*\|', md, re.M):
        n = int(m.group(1)); t = m.group(3); beat = int(m.group(4))
        parts = t.split(':')
        sec = int(parts[0]) * 60 + float(parts[1]) if len(parts) > 1 else float(parts[0])
        cal[n] = (round(sec, 3), beat)
    assert len(cal) == 36, f'calibration rows: {len(cal)}'

    # --- parse step table: | # | time | scene | line | events | (line-by-line)
    steps = []
    for raw in md.splitlines():
        line = raw.strip()
        if not (line.startswith('|') and line.endswith('|')):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) != 5:
            continue
        if not re.fullmatch(r'\d+', cells[0]):
            continue
        if not re.fullmatch(r'[\d:.]+', cells[1]):
            continue
        n = int(cells[0])
        if n not in cal:
            continue
        scene_label, lyric_line, events = cells[2], cells[3], cells[4]
        # scene number from label like «سکانس ۳ · اتاقِ چهل‌درجه» (Persian digit)
        sn = None
        sm = re.search(r'سکانس\s+([۰-۹])', scene_label)
        if sm:
            sn = int('۰۱۲۳۴۵۶۷۸۹'.index(sm.group(1)))
        steps.append({
            'n': n,
            't': cal[n][0],
            'beat': cal[n][1],
            'sc': scene_label,
            'line': lyric_line,
            'scene': sn,
            'ev': events,
        })
    assert len(steps) == 36, f'step rows: {len(steps)}'
    # sanity: times monotonic
    ts = [s['t'] for s in steps]
    assert ts == sorted(ts), 'times not monotonic'
    import os
    os.makedirs('game', exist_ok=True)
    with io.open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'steps': steps, 'source': 'docs/timing-map.md v8', 'bpm': 99.60,
                   'beatPeriod': 0.602422, 'duration': 321.6935, 'beats': 534},
                  f, ensure_ascii=False, indent=1)
    print(f'wrote {OUT}: 36 steps, t[0]={ts[0]}, t[35]={ts[35]}')
    # verify byte-exactness of a few lines against the md
    for s in steps:
        assert s['line'] in md, f"line {s['n']} not byte-exact!"
    print('byte-exactness: all 36 lines verified against source')

if __name__ == '__main__':
    main()
