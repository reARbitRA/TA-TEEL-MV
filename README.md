# TA-TEEL-MV — «تعطیل (برقِ من)»

[English below]

موزیک‌ویدیوی استاپ‌موشنِ ترانه‌ی «تعطیل (برقِ من)» + بازیِ قابلِ‌ایفای همان — ساخته‌شده با ایجنتِ متصل به همین ریپو. روش: زنجیره‌ی فریم با مدلِ تصویر (لنگر → دلتا) → گیف. دوربین همیشه از بالا، مثلِ GTA کلاسیک.

## ساختار
```
BARGH (4).mp3      منبعِ حقیقتِ زمان/تمپو (اول بسنج — docs/timing-map.md بعد کالیبره)
AGENTS.md          دستورالعملِ دائمیِ ایجنت — قبل از هر کاری خوانده می‌شود
game-design.md     سندِ طراحیِ بازی (۹ مأموریت = ۹ سکانس، M0–M4)
animatic.html      مرجعِ چشمی: انیماتیکِ ۳۶ گام، دوربینِ از بالا
docs/              سبک · مسترپرامپت · شعر v7 · استوری‌بورد · صفِ تولید · تایم‌مپ
prompts/anchors.md لنگرِ هر سکانس + قفلِ دوربین
refs/              characters (۹) · style (لنگرِ آیکون) · locations (۹ چیدمان) · scenes (مینیاتور)
frames/            تولیدِ زنده‌ی فریم‌ها (pilot + 01-event-studio)
logs/              INDEX + قالبِ لاگ + لاگ‌های جاری
game-assets/       آیکون‌ها · HUD · استاتیک‌ها · ۹ پلیتِ نقشه · hud-demo.html
tools/             align_frames.py (گِیت) · build_shot.py (مونتاژ) · build_animatic.py
archive/           تاریخچه‌ی قدیمی
```

## گردشِ کار
۱) `AGENTS.md` را بخوان → ۲) آهنگ را بسنج و تایم‌مپ را کالیبره کن → ۳) `animatic.html` را ببین → ۴) از `logs/INDEX.md` بفهم کار کجاست → ۵) یک فریمِ آزمایشی نشان بده، تأیید بگیر، ادامه بده.

## قوانینِ کوتاه
دوربین از بالا (GTA 1/2) · پرامپتِ تصویر فقط انگلیسی · امضای مینیاتورِ صفوی در ریزترین جزئیات · تمِ مینیاتوریِ نگارگری (لاجورد/طلا/بندِ ابری) · شعر و متن‌ها بایت‌به‌بایت · هیچ فایلی حذف نمی‌شود · گِیتِ هم‌ترازی: لوپ ≤۱۲، پیوسته ≤۲۵.

---

**EN** — Stop-motion music video + playable game for the song "Taatil (Bargh-e Man)". Method: image-model frame-chaining (anchor → delta) → GIF. Camera always top-down, classic GTA 1/2 style. The repo is agent-ready: `AGENTS.md` is the standing instruction file; measure the song (`BARGH (4).mp3`) before trusting any timing; production logs live in `logs/`; review assets in `game-assets/`.
