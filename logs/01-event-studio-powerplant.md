# لاگِ فعالِ سکانس ۱ — «نیروگاهِ داغان»
**شناسه:** 01-event-powerplant · **نسخه:** v3-corrected-anchor-test · **وضعیت:** ⏳ در انتظار تأیید تهیه‌کننده

> این لاگ جایگزین اجراییِ لاگ استودیوییِ قبلی است. تمام قاب‌های استودیویی طبق `logs/01-event-studio-art-direction-correction.md` رد و بایگانی شده‌اند.

## زمان‌بندیِ قفل‌شده
- زیرشات: `01A · نیروگاهِ داغان`
- گام: ۱ · بازه: `0:00.00–0:08.73`
- مبنای صوتی: `BARGH (4).mp3` · PCM `5:21.6935` · `99.60 BPM`
- بودجه: حداقل ۱۸ فریم پذیرفته برای این زیرشات؛ مجموع سکانس ۱ = چهار زیرشات × ۱۸ فریم پذیرفته.

## قابِ لنگرِ آزمایشی
- فایل: `frames/01-event-studio/F11.jpg`
- sidecar: `frames/01-event-studio/F11.json`
- مراجع: `turbine-akhund-pro.jpg`، `zan-vazir-pro.jpg`، `basiji-pro.jpg`، `golden-calf-pro.jpg`

**QA داخلی:** دوربین قفل‌شدهٔ عمودی ✅ · نیروگاه داغان ✅ · گاو نر/بسیجی‌ها/مسیر لوله تا آخوند توربین ✅ · چادر گیرکرده در توربین ✅ · سبک و قاب تذهیب ✅ · تأیید تهیه‌کننده ⏳

## تولید بعد از تأیید
F12 تا F28: ۱۷ میکروحرکتِ پیوسته برای تکمیل 01A؛ هر فریم فقط یک حرکت سوژه + یک تغییر محیطی، aHash پی‌درپی ≤۲۵ و بازبینی چشمی اجباری.

---

## ردِ لنگرِ نخستِ نیروگاه
`F11-REJECTED.jpg` نگه داشته شد: زن وزیر به‌اندازهٔ کافی محورِ قاب نبود، گاو/بسیجی‌ها در گوشه محصور نشده بودند، و توکن AK-47 بسیجی‌ها واضح نبود. لنگر بعدی باید این سه شرط را صریحاً پاس کند.

## ردِ لنگرِ اصلاح‌شدهٔ نخست
`F11r-REJECTED.jpg` ترکیبِ زن وزیرِ محوری، گروه گاو/بسیجی در جنوب‌غرب و AK-47 را به‌خوبی نزدیک کرد، اما یک برچسبِ خوانای `FUSE` در قاب دارد. قانون پروژه متن/حروف/شماره را ممنوع می‌کند؛ بنابراین این قاب نیز بایگانی و بازتولید بدون برچسب انجام می‌شود.

## لنگرِ اصلاح‌شدهٔ دوم
- فایل: `frames/01-event-studio/F11rr.jpg`
- زن وزیر محورِ قاب است؛ گاو/بسیجی‌ها در گوشهٔ جنوب‌غربی و AK-47ها خوانا هستند.
- برچسب خوانای لنگر قبلی حذف شد؛ هیچ متن خوانایی در F11rr دیده نمی‌شود.
- ادامهٔ زنجیره تا تأیید صریح تهیه‌کننده ممنوع است.

## تصمیم تهیه‌کننده: چهار زیرشات و هشت بسیجی
- `F11rr.jpg` نقشه/مسترِ بازِ تأییدشده است.
- حرکت دوربینِ مورد تأیید برای 01B یک پن/زومِ دوبعدی روی همان جهان است؛ جهتِ دوربین همچنان عمودی می‌ماند.
- 01C باید یک گاو نرِ بزرگ و هشت بسیجی جن‌نما با AK-47 داشته باشد.
- قبل از تولید ۱۸فریم 01C، یک لنگر نزدیک با نام `F47.jpg` ساخته می‌شود.

## ردِ لنگرِ نزدیکِ نخستِ گاو
`F47-REJECTED.jpg` از نظر مقیاس گاو و نشانه‌های AK-47 مناسب بود، اما فقط سه بسیجیِ قابل‌خواندن داشت؛ دستور تهیه‌کننده هشت بسیجی است. بازتولید بعدی باید هشت شمایل کامل را در جایگاه‌های قطبیِ مشخص نمایش دهد.

## ردِ لنگرِ نزدیکِ دومِ گاو
`F47r-REJECTED.jpg` مقیاس و شکل نرِ گاو را درست کرد و هفت بسیجیِ خوانا آفرید، اما هنوز به هشت بسیجیِ خواسته‌شده نرسید. نسخهٔ بعدی باید فقط یک بسیجیِ هشتم را به گوشهٔ شمال‌غربیِ گروه اضافه کند و همه‌چیز دیگر را ثابت نگه دارد.

## لنگرِ نزدیکِ سومِ گاو
- فایل: `frames/01-event-studio/F47rr.jpg`
- هشت بسیجیِ جدا و قابل‌شمارش، هرکدام با توکن AK-47، پیرامون گاو نرِ بزرگ دیده می‌شوند.
- تا تأیید تهیه‌کننده، هیچ فریم زنجیره‌ای 01C تولید نمی‌شود.

## بازبینی چشمیِ دستهٔ نخستِ 01C
F48 تا F51 هم از گیت aHash و هم از تماس‌شیتِ چشمی گذشتند. F52 با وجود فاصلهٔ aHash پایین، گاو ایستاده را ناگهان خواباند؛ بنابراین F52 تا F57 رد و با پسوند `-REJECTED` بایگانی شدند. این مورد، یک محدودیتِ aHash را تأیید می‌کند: گیتِ عددی جای QA چشمی را نمی‌گیرد.

## ادامهٔ پذیرفته‌شدهٔ 01C
F52r تا F61 با قفلِ صریحِ گاو ایستاده تولید و در تماس‌شیت چک شدند. هر ۱۴ جفتِ فعلی از F47rr تا F61 گیت aHash پی‌درپی را با بیشینهٔ فاصلهٔ ۱ گذراندند. برای کامل‌شدن بودجهٔ ۱۸ فریمی 01C، فقط F62 تا F64 باقی مانده‌اند.

## Producer revision — reject passive 01C continuation
F52r–F61 were rejected by the producer despite passing aHash: their unwanted palette/face drift substituted for animation. Archived as `-REJECTED`. Replacement chain starts from F51 with locked border/light/faces and explicit readable body blocking: bull neck turn, basiji repositioning, standing guitar pantomime with slung AK-47, a non-graphic kick from behind, and an accidental safe-direction discharge.

## Count correction
Visual recount found the earlier F48–F51 continuation had already lost the upper-left basiji, reducing the required group of eight to seven. They are now archived as `-REJECTED`, along with first action test F52s. F47rr remains the only valid 01C anchor; the action chain restarts directly from it.

## 01C action rebuild, pass one
F48s–F56t are the accepted action-focused replacement path from eight-basiji anchor F47rr. The contact sheet visually confirms a locked frame/border, an incremental bull-neck turn, a south-center basiji rising, AK-as-guitar pantomime, and a south-east basiji setting a kick. aHash successor sequence is `[1,0,1,0,1,0,0,1,0]`, all within the continuous threshold of 25. Remaining action beats begin with kick contact in F57t.

## Producer revision — progressive zoom and fused priest-turbine
F54t–F58t are archived as `-REJECTED`. The next action build begins at F53t and uses a three-to-four-frame, strictly top-down progressive 2D zoom-out. The wide tableau must have one fused organic turbine-priest (turban and prayer stone integrated into its turbine body), two new guard basijis, and continuous connected pipework from the bull manifold into the entity.

## UI-frame correction — producer hard lock
F54u and F55u rejected and archived. The ornate video-game UI bezel/HUD is a pixel-locked overlay, not a camera frame: its reserved trophy and score/casualty regions stay in the same screen coordinates and remain blank unless producer specifies UI content. Future 2D zoom/pan moves only the world inside the viewport. When camera travels from the bull action to the minister/turbine-priest, the bull group exits through the lower-left of the viewport rather than being rescaled into the centre.
