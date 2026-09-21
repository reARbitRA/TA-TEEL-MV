# لاگِ سکانسِ ۱ — «ایونت / استودیو»
**شناسه:** 01-event-studio · **تاریخ:** ۲۱ سپتامبر ۲۰۲۶ · **نسخه:** v0-anchor-test · **وضعیت:** ⏳ در انتظارِ تأییدِ فریمِ آزمایشی
**خروجی نهایی:** هنوز ساخته نشده؛ تولید انبوه تا تأیید کاربر ممنوع است.

---

## زمان‌بندیِ قفل‌شده
- نقشه: `timing-map.md` نسخهٔ ۸، کالیبره‌شده از `BARGH (4).mp3`
- گام‌ها: ۱–۵ · بازهٔ تصویری: `0:00.00–0:29.92`
- مبنای صوت: PCM `5:21.6935` · `99.60 BPM` · دورهٔ ضرب `0.602422s`

## مراجعِ استفاده‌شده
- `turbine-akhund-pro.jpg`
- `zan-vazir-pro.jpg`
- `divche-pro.jpg`

## قابِ لنگرِ آزمایشی
**فایل:** `frames/01-event-studio/F1.jpg`

**پرومپت (وات‌به‌وات):**
> Persian Safavid miniature painting, 16th century: a strictly flat two-dimensional state-television studio floor plan at night, illuminated manuscript aesthetic, flat mineral pigments, lapis lazuli night, real gold leaf, ember orange, dried-blood red, muted clerical green, fine black ink outlines, crisp cut-out forms with tiny symbolic drop shadows, aged parchment texture. top-down bird's-eye view, camera looking straight down, north-up, classic GTA 1/2 perspective — no side view, no isometric. A broad rectangular golden broadcast studio is seen entirely from above inside a fixed ornate gold tazhib border. At the north of the floor plan, an aged turbine cleric with a torn muted-green robe, black turban, grey-streaked beard, and a red gear seal on his forehead sits behind an ornate gold desk; he is a small top-down character, not a portrait. At the center, the copper-and-silver queen minister is a circular black cable-chador silhouette with twelve blade-fan arms, standing ceremonially on a reed-patterned round platform. A ring of small olive imp attendants with horns and hooves surrounds the platform in distinct top-down poses. At the east edge, the hem of the queen's cable chador approaches a small turbine fuse panel, where a single tiny golden spark is suspended but nothing has ignited. Every smoke curl, cable, oil vein, and sound ripple is a delicate Persian cloud-band motif. Include a tiny Safavid tazhib corner ornament in the studio floor tiles and on the fuse-panel plaque. The exact same border, room geometry, character positions, character sizes, and lighting must remain fixed for all later frames. No readable text, no letters, no numbers, no labels, no watermark, no photorealism, no 3D, no vanishing point, no lens effects, no nudity, no explicit sexual content.

**QA داخلی (پیش از تأیید کاربر):** دوربین ✅ · پالت ✅ · توکن‌های شخصیت ✅ (موقت) · دوبعدی ✅ · بندِ ابر ✅ · قفلِ قاب ✅ · تأیید نهایی کاربر ⏳

## فریم‌ها
| # | نوع | پرومپت | وضعیت |
|---|---|---|---|
| F1 | لنگرِ آزمایشی | در بخش بالا و sidecar `F1.json` | ⏳ بررسی چشمی کاربر |

## سنجش‌ها
- گیتِ هم‌ترازی اعمال نشده؛ فقط یک فریم آزمایشی وجود دارد.
- مونتاژ، contact sheet، GIF و production-frameها تا تأیید صریح کاربر ساخته نمی‌شوند.

---

## تولید پس از تأیید F1
- تأیید کاربر: تولیدِ ادامهٔ سکانس با تأکید بر consistency.
- فریم‌های پذیرفته‌شده تا این نقطه: `F1.jpg`، `F2.jpg`، `F3.jpg`، `F4.jpg`، `F5r.jpg`.
- تلاش نخست F5–F9 و بازتولید نخست F6 به‌دلیل رانشِ چشمی رد و بدون حذف بایگانی شدند؛ شرح: `logs/01-event-studio-rejections.md`.
- پرومپت‌های بایگانی‌شده: `logs/01-event-studio-prompts.md`؛ sidecar کنار هر JPEG قرار دارد.
- گزارشِ گیتِ پذیرفته‌های فعلی: `logs/01-event-studio-align-partial.json`.
- contact sheet پذیرفته‌های فعلی: `frames/01-event-studio/contact-sheet-accepted-partial.jpg`.
- GIF، JSON مونتاژ و لاگ نهایی فقط پس از تکمیل فریم‌های پذیرفته‌شده ساخته می‌شوند.
