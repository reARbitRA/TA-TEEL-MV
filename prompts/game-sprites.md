# 🎮 کتابخانهٔ پرومپتِ اسپرایت‌های بازی — «تعطیل (برقِ من)»
### اسپرایت‌های درونِ بازی (GTA 1/2 · نمایِ دقیقاً از بالا · شمال بالا) — قانون: هر اسپرایت = بلوکِ سبک + شرحِ کاراکتر + قفلِ شیتیت + امضای ابرک
**قوانین:**
1. پرومپت فقط انگلیسی — هیچ خط فارسی داخل پرومپت.
2. هر اسپرایتِ کاراکتری **حتماً** شیتیتِ تأییدشده را به‌عنوان مرجع تصویری ضمیمه کند (`logs/character-sheet-lock.md` — «match the supplied character sheet exactly»).
3. نمایِ دقیقاً از بالا (top-down, north-up, GTA 1/2) — نه نمای کنار، نه ایزومتریک — قانونِ دوربین.
4. امضای ابرکِ صفوی در جزئیاتِ هر اسپرایت (قانونِ دائمی پروژه).
5. خروجیِ تست روی زمینهٔ تختِ لاجوردِ شب (`#0d1526`)؛ نسخهٔ تعویضِ نهایی روی زمینهٔ کروما برای برشِ آلفا.

---

## اسپرایت ۱ — راوی (آزمایشِ M1 · قبل از تعویض، تأییدِ کاربر)
**مرجع:** `refs/characters/raavi-punk-pro.jpg` (شیتیتِ قفل)
**مقصد:** جایگزینیِ اسپرایتِ کدکشیدهٔ راوی در `game/src/04-player.js` پس از تأیید.
```
Persian Safavid miniature painting style, 16th century: a single video-game character sprite seen strictly from directly above, top-down bird's-eye view, camera looking straight down, north-up, classic GTA 1/2 perspective — no side view, no isometric, no 3/4 view. The punk candle narrator, match the supplied character sheet exactly; preserve face, silhouette, costume, palette, and props. Seen from directly above he is a compact teardrop shape: broad rounded shoulders in a deep indigo punk jacket (#232a44) narrowing to a point at the shoe tips, small vermilion (#a3282a) lapel and cuff details, one faint gold zipper line down the spine; at the top-center of the body the living candle-flame head — a teardrop flame with glowing golden inner core (#d9b23c) and ember-orange outer tongue (#e2622b) rising from a short black wick of spiky hair, and two tiny round spectacles drawn as two small glass rings of pale gold catching the light, placed low on the flame just above the collar. Flat mineral pigments, fine black ink outlines, crisp cut-out shape with a small soft drop shadow to the south-east, flat decorative depth with no atmospheric perspective. One tiny hidden Persian cloud-band flourish etched in gold leaf on the back of the jacket's left shoulder as the secret signature. The sprite floats centered on a solid flat lapis-lazuli night background (#0d1526) with no other elements, occupying about seventy percent of the frame height. Absolutely no text, no letters, no numbers, no labels, no watermark, no photorealism, no 3D render, no CGI, no vanishing point, no lens effects, no motion blur.
```
**نتیجهٔ داوری (۲۵ سپتامبر ۲۰۲۶):** کاربر نمای بالا و کاراکتر را تأیید کرد → تعویض مجاز شد.

## نسخهٔ تولیدیِ کروما (تعویضِ نهایی)
**مراجع:** `refs/characters/raavi-punk-pro.jpg` (شیتیت) + `game-assets/sprites/raavi-gta-test-m1.png` (نمونهٔ تأییدشده — قفلِ قاب)
**خروجی:** `game-assets/sprites/raavi-gta.png` (برشِ آلفا، ۳۹۸×۵۶۱)
```
Chroma-key production version of an approved video-game sprite. Match the second supplied reference image (the approved top-down sprite) exactly: same character, same strictly top-down bird's-eye pose facing north-up in classic GTA 1/2 perspective, same proportions, same framing, same colors — only the background changes. Persian Safavid miniature painting style: the punk candle narrator seen from directly above — compact teardrop shape, broad rounded shoulders in deep indigo punk jacket (#232a44) with small vermilion (#a3282a) lapel and cuff details and a faint gold zipper line down the spine, narrowing to a point at the shoe tips; at the top-center the living candle-flame head with glowing golden inner core (#d9b23c) and ember-orange outer tongue (#e2622b) rising from a short black wick of spiky hair, two tiny round spectacles as two small pale-gold glass rings low on the flame; flat mineral pigments, fine black ink outlines, the tiny hidden Persian cloud-band flourish in gold leaf on the back of the jacket's left shoulder preserved. Absolutely no drop shadow, no vignette, no gradient, no texture in the background: the sprite floats on a perfectly solid, flat, uniform pure magenta chroma-key background (#ff00ff) filling every pixel that is not the character, edge to edge. The sprite occupies about seventy percent of the frame height, centered. No text, no letters, no numbers, no labels, no watermark, no photorealism, no 3D render, no CGI, no side view, no isometric, no lens effects, no motion blur.
```
**خطِ تولید:** کروما ۱۴۰۸×۷۶۸ (پوششِ ۹۰٪ سرخابی، گوشه‌ها پاک) → کلیدِ نرم (magenta-ness، باندِ لبهٔ ۲۴-۶۰ با آلفای نسبی + despill) → برش به ۳۹۸×۵۶۱ + پد ۶px → `raavi-gta.png`. رجیستری: `playerSprite` در `01-assets.js`؛ رندر: شاخهٔ اسپرایت در `playerDraw` (چرخش `dir+π/2`، h=50، تنفسِ شعله + پالسِ گام + هالهٔ نرم؛ بدنهٔ کدکشیده fallback مانده). راستی‌آزمایی پس از تعویض: **۳۵/۳۵**، دیفِ ساختاری شات (۷٫۶٪ فریم، مرکز در ناحیهٔ بازیکن) ✓، صفر درخواستِ شکست‌خورده ✓ — شات‌ها: `game/verify-shots-m1-sprite/`.
