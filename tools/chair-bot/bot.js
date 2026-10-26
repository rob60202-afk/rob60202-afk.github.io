#!/usr/bin/env node
// 椅子搶購小幫手：開賣前預熱 → 開賣即刷新 → 選規格 → 加入購物車 → 進結帳頁 → 停下來讓你付款。
// 用法：
//   node bot.js login   第一次先登入會員（登入狀態會存在 ./profile，不存密碼）
//   node bot.js run     正式搶購
//   node bot.js check   只檢查選擇器抓不抓得到，不會點任何東西
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, process.env.CHAIR_BOT_CONFIG || 'config.json');
const PROFILE_DIR = path.join(ROOT, 'profile');
const MIN_REFRESH_MS = 1500; // 刷新下限，避免被網站當成攻擊而封鎖

const log = (...args) => console.log(`[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}.${String(Date.now() % 1000).padStart(3, '0')}]`, ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`找不到 ${CONFIG_PATH}，請先複製 config.example.json 成 config.json 再修改。`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  cfg.refreshIntervalMs = Math.max(cfg.refreshIntervalMs || 2000, MIN_REFRESH_MS);
  return cfg;
}

// 把設定裡的選擇器清單轉成 locator：支援 CSS（css=...）或按鈕文字（其他字串）
function anyOf(page, list) {
  const locs = list.map((s) => (s.startsWith('css=') ? page.locator(s.slice(4)) : page.getByText(s, { exact: false })));
  return locs.reduce((a, b) => a.or(b)).filter({ visible: true }).first();
}

async function firstVisible(page, list, timeout = 0) {
  if (!list.length) return null;
  const loc = anyOf(page, list);
  if (!timeout) return (await loc.isVisible().catch(() => false)) ? loc : null;
  try {
    await loc.waitFor({ state: 'visible', timeout });
    return loc;
  } catch {
    return null;
  }
}

// 用網站伺服器的 Date header 校正本機時鐘，避免電腦時間差幾秒
async function serverClockOffset(request, url) {
  try {
    const t0 = Date.now();
    const res = await request.head(url, { timeout: 5000 });
    const t1 = Date.now();
    const serverMs = new Date(res.headers()['date']).getTime();
    if (Number.isNaN(serverMs)) return 0;
    return serverMs + 500 - (t0 + t1) / 2; // Date header 只到秒，+500ms 取中間值
  } catch {
    return 0;
  }
}

async function waitUntil(targetMs, offset, label) {
  for (;;) {
    const left = targetMs - (Date.now() + offset);
    if (left <= 0) return;
    if (left > 60_000) log(`距離${label}還有 ${Math.round(left / 1000)} 秒`);
    await sleep(Math.min(left, left > 60_000 ? 30_000 : 200));
  }
}

async function beep(page) {
  process.stdout.write('\x07');
  await page.evaluate(() => {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      o.connect(ctx.destination);
      o.frequency.value = 880;
      o.start();
      setTimeout(() => o.stop(), 800);
    } catch {}
  }).catch(() => {});
}

async function openBrowser(cfg) {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: process.env.HEADLESS === '1',
    viewport: null,
    locale: 'zh-TW',
    args: ['--start-maximized'],
    ...(cfg.chromeChannel ? { channel: cfg.chromeChannel } : {}),
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  return { ctx, page };
}

async function cmdLogin(cfg) {
  const { ctx, page } = await openBrowser(cfg);
  await page.goto(cfg.loginUrl || cfg.productUrl);
  log('請在瀏覽器裡完成登入（會員帳號、收件地址可以先存好）。完成後直接關掉瀏覽器即可。');
  await new Promise((r) => ctx.on('close', r));
}

async function cmdCheck(cfg) {
  const { ctx, page } = await openBrowser(cfg);
  await page.goto(cfg.productUrl, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const s = cfg.selectors;
  for (const [name, list] of Object.entries(s)) {
    const found = await firstVisible(page, list, 1500);
    log(`${found ? '✔' : '✘'} ${name}`, found ? `→ "${(await found.innerText().catch(() => '')).trim().slice(0, 30)}"` : '（此頁找不到，若屬於購物車/結帳頁則正常）');
  }
  for (const opt of cfg.variantOptions || []) {
    const found = await firstVisible(page, [opt], 1500);
    log(`${found ? '✔' : '✘'} 規格「${opt}」`);
  }
  log('檢查完畢，瀏覽器保留讓你對照，關掉即可結束。');
  await new Promise((r) => ctx.on('close', r));
}

// 開賣後重複刷新，直到購買按鈕出現且不是「售完/尚未開賣」
async function waitForBuyButton(page, cfg) {
  const s = cfg.selectors;
  const deadline = Date.now() + (cfg.giveUpAfterMinutes || 30) * 60_000;
  let round = 0;
  while (Date.now() < deadline) {
    round += 1;
    const soldOut = await firstVisible(page, s.soldOut || []);
    const btn = soldOut ? null : await firstVisible(page, s.buyNow.concat(s.addToCart), 800);
    if (btn && (await btn.isEnabled())) return btn;
    log(`第 ${round} 次：${soldOut ? '顯示售完/未開賣' : '還沒看到購買按鈕'}，${cfg.refreshIntervalMs}ms 後刷新`);
    await sleep(cfg.refreshIntervalMs);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  return null;
}

async function cmdRun(cfg) {
  const { ctx, page } = await openBrowser(cfg);
  const s = cfg.selectors;

  const startMs = cfg.saleStart ? new Date(cfg.saleStart).getTime() : Date.now();
  const offset = await serverClockOffset(ctx.request, cfg.productUrl);
  log(`伺服器時間差 ${Math.round(offset)}ms；開賣時間 ${new Date(startMs).toLocaleString('zh-TW')}`);

  // 提前打開頁面暖機（DNS、登入 cookie、圖片快取）
  await waitUntil(startMs - (cfg.preloadSeconds || 60) * 1000, offset, '預熱');
  await page.goto(cfg.productUrl, { waitUntil: 'domcontentloaded' });
  log('已開啟商品頁，等待開賣…');
  await waitUntil(startMs, offset, '開賣');
  await page.reload({ waitUntil: 'domcontentloaded' });

  const btn = await waitForBuyButton(page, cfg);
  if (!btn) {
    log('超過等待時間仍無法購買，結束。');
    return;
  }

  for (const opt of cfg.variantOptions || []) {
    const el = await firstVisible(page, [opt], 3000);
    if (!el) throw new Error(`找不到規格「${opt}」，請用 node bot.js check 確認文字`);
    await el.click();
    log(`已選規格：${opt}`);
  }
  if (cfg.quantity > 1 && s.quantityInput) {
    const q = await firstVisible(page, s.quantityInput, 1000);
    if (q) await q.fill(String(cfg.quantity));
  }

  const buy = (await firstVisible(page, s.buyNow, 500)) || (await firstVisible(page, s.addToCart, 500));
  await buy.click();
  log('已點擊購買/加入購物車');

  // 「加入購物車」通常只會跳小視窗，直接前往購物車頁
  if (!(await page.waitForURL(/cart|checkout|order/i, { timeout: 3000 }).then(() => true).catch(() => false))) {
    if (cfg.cartUrl) await page.goto(cfg.cartUrl, { waitUntil: 'domcontentloaded' });
  }

  const checkout = await firstVisible(page, s.checkout, 8000);
  if (checkout) {
    await checkout.click();
    log('已前往結帳頁');
  } else {
    log('沒找到結帳按鈕，請手動接手');
  }

  await beep(page);
  log('★ 已停在結帳流程，請立刻在瀏覽器確認商品、規格、金額、折扣碼，並手動完成付款。');
  if (cfg.couponCode) log(`提醒：折扣碼 ${cfg.couponCode}`);
  await new Promise((r) => ctx.on('close', r));
}

(async () => {
  const cmd = process.argv[2] || 'run';
  const cfg = loadConfig();
  const fn = { login: cmdLogin, check: cmdCheck, run: cmdRun }[cmd];
  if (!fn) {
    console.error('用法：node bot.js [login|check|run]');
    process.exit(1);
  }
  await fn(cfg);
})().catch((e) => {
  console.error('執行失敗：', e.message);
  process.exit(1);
});
