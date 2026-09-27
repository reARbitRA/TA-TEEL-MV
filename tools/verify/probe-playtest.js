const path = require('path');
(async () => {
  const c = require('@sparticuz/chromium').default;
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: await c.executablePath(), args: c.args, headless: 'shell' });
  const page = await browser.newPage();
  for (const f of ['m1-playthrough.webm', 'm2-playthrough.webm']) {
    const url = 'file:///home/user/TA-TEEL-MV/game/recordings/' + f;
    const r = await page.evaluate(async (u) => {
      const v = document.createElement('video');
      v.src = u; v.muted = true;
      const p = new Promise(res => {
        v.oncanplay = () => res({ state: 'canplay' });
        v.onerror = () => res({ state: 'ERROR', code: v.error && v.error.code, msg: v.error && v.error.message });
        setTimeout(() => res({ state: 'timeout', rs: v.readyState, err: v.error && v.error.code }), 8000);
      });
      v.load();
      const a = await p;
      if (a.state === 'canplay') {
        try { await v.play(); } catch (e) { return { ...a, play: 'reject: ' + e.message }; }
        await new Promise(r2 => setTimeout(r2, 2000));
        return { ...a, play: 'ok', t: +v.currentTime.toFixed(2), dur: +v.duration.toFixed(2), ended: v.ended };
      }
      return a;
    }, url);
    console.log(f, JSON.stringify(r));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
