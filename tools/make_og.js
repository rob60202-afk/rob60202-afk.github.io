// 產生每個工具的分享預覽圖(1200×630),分享到 LINE、Facebook 時會顯示。
// 先跑 python3 tools/build_tools.py(會寫出 tools/_templates/og.json),再跑:node tools/make_og.js
// 需要 Playwright 與 Chromium,字型從 Google Fonts 載入。
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TOOLS = __dirname;
const list = JSON.parse(fs.readFileSync(path.join(TOOLS, '_templates', 'og.json'), 'utf8'));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const page = (o) => `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #f4f2ed; color: #0a1421; font-family: "Noto Sans TC", sans-serif; position: relative; }
  .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 26px; background: #b7f33d; }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(10,20,33,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,20,33,.05) 1px, transparent 1px); background-size: 42px 42px; }
  .card { position: absolute; left: 92px; right: 92px; top: 78px; }
  .kicker { font-size: 30px; font-weight: 700; letter-spacing: .1em; color: #526171; }
  h1 { font-size: ${o.title.length > 9 ? 86 : 96}px; font-weight: 900; line-height: 1.15; margin-top: 22px; letter-spacing: .02em; }
  h1 span { background: linear-gradient(transparent 68%, #b7f33d 68%); }
  .line { font-size: 38px; font-weight: 500; color: #33404f; margin-top: 30px; }
  .foot { position: absolute; left: 92px; right: 92px; bottom: 62px; display: flex; align-items: center; justify-content: space-between; }
  .brand { background: #0a1421; color: #fff; font-weight: 900; font-size: 32px; padding: 12px 22px; border-radius: 12px; box-shadow: 7px 7px 0 #b7f33d; }
  .free { font-size: 30px; font-weight: 700; }
</style></head><body>
  <div class="grid"></div><div class="bar"></div>
  <div class="card">
    <div class="kicker">${esc(o.kicker)}</div>
    <h1><span>${esc(o.title)}</span></h1>
    <div class="line">${esc(o.line)}</div>
  </div>
  <div class="foot"><div class="brand">現場工具箱</div><div class="free">免費 · 不用註冊 · 手機就能用</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const o of list) {
    await tab.setContent(page(o), { waitUntil: 'load' });
    await tab.evaluate(async () => { await document.fonts.ready; });
    const ok = await tab.evaluate((t) => document.fonts.check('900 40px "Noto Sans TC"', t), o.title);
    if (!ok) throw new Error('字型沒有載入,預覽圖會用到替代字型:' + o.title);
    const overflow = await tab.evaluate(() => document.querySelector('h1').scrollWidth > document.querySelector('.card').clientWidth);
    if (overflow) throw new Error('標題太長,超出畫面:' + o.title);
    const out = path.join(TOOLS, o.slug, 'og.png');
    await tab.screenshot({ path: out });
    console.log('wrote', path.relative(path.dirname(TOOLS), out));
  }
  await browser.close();
})();
