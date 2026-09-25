#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""مونتاژگرِ شات — از حلقه‌ها و فریم‌های رویداد، یک تایم‌لاینِ واحد می‌سازد.
قانون (مسترِ سند §۳.۸): هر فریمِ ورودی باید قبلاً از align_frames.py گذشته باشد.

استفاده:
  python3 tools/build_shot.py shots/s1.json

نمونهٔ specs (JSON):
{
  "out": "gifs/s1-curtain.gif",
  "width": 960,
  "loop": 0,
  "segments": [
    {"dir": "frames/01-event", "frames": ["F1.jpg"], "duration_ms": 900},
    {"dir": "frames/01-event", "frames": ["F2.jpg","F3.jpg","F4.jpg"], "duration_ms": 160, "repeat": 2},
    {"image": "frames/01-event/F5.jpg", "duration_ms": 1200}
  ]
}
- «repeat»: تکرارِ کلِ سگمنت (حلقه‌ها همین‌طور دوبار/چهاربار می‌آیند)
- خروجی: GIF (و MP4 اگر ffmpeg موجود باشد) + sidecar JSON (قانونِ مستندسازی)
"""
import json, os, sys, shutil
from PIL import Image


def load(p, width=None):
    im = Image.open(p).convert('RGB')
    if width and im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    return im


def main():
    spec_path = sys.argv[1]
    spec = json.load(open(spec_path, encoding='utf-8'))
    width = spec.get('width', 960)
    frames, durations = [], []
    for seg in spec['segments']:
        if 'image' in seg:
            seq = [load(seg['image'], width)]
            durs = [seg.get('duration_ms', 160)]
        else:
            d = seg['dir']
            seq = [load(os.path.join(d, f), width) for f in seg['frames']]
            durs = [seg.get('duration_ms', 160)] * len(seq)
        for _ in range(seg.get('repeat', 1)):
            frames += seq
            durations += durs
    # هم‌اندازه‌سازیِ نهایی با کوچک‌ترین ارتفاع
    H = min(f.height for f in frames)
    frames = [f.crop((0, 0, f.width, H)) for f in frames]
    total_ms = sum(durations)
    out = spec['out']
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    frames[0].save(out, save_all=True, append_images=frames[1:],
                   duration=durations, loop=spec.get('loop', 0), optimize=True)
    report = dict(spec_file=spec_path, out=out, n_frames=len(frames),
                  total_ms=total_ms, size=frames[0].size,
                  kb=os.path.getsize(out) // 1024)
    sidecar = out.rsplit('.', 1)[0] + '-shot.json'
    json.dump(report, open(sidecar, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"✓ {out} | {len(frames)} فریم | {total_ms/1000:.1f}s | {report['kb']}KB")
    ff = shutil.which('ffmpeg')
    if ff:
        mp4 = out.rsplit('.', 1)[0] + '.mp4'
        os.system(f'{ff} -y -loglevel error -i {out} -pix_fmt yuv420p {mp4}')
        if os.path.exists(mp4):
            print(f"✓ {mp4}")
    else:
        print('— ffmpeg نیست: فقط GIF (برای MP4 بعداً ffmpeg نصب کن)')
    json.dump(report, open(sidecar, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
