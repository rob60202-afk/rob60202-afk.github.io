#!/usr/bin/env node
// 椅子搶購小幫手：開賣前預熱 → 開賣即刷新 → 選規格 → 加入購物車 → 進結帳頁 → 停下來讓你付款。
// 用法：
//   node bot.js login   第一次先登入會員（登入狀態會存在 ./profile，不存密碼）
//   node bot.js run     正式搶購（可加設定檔路徑：node bot.js run targets/xxx.json）
//   node bot.js check   只檢查選擇器抓不抓得到，不會點任何東西
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
// 第二個參數可指定設定檔，例如 node bot.js run targets/1102-1100-b100-gray.json
const CONFIG_PATH = path.resolve(ROOT, process.argv[3] || process.env.CHAIR_BOT_CONFIG || 'config.json');
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

// 把設定裡的選擇器清單轉成 locator：css=... 為 CSS，exact=... 為「整段文字完全相同」，其他字串為「包含這段文字」
function anyOf(page, list) {
  const locs = list.map((s) => {
    if (s.startsWith('css=')) return page.locator(s.slice(4));
    if (s.startsWith('exact=')) return page.getByText(s.slice(6), { exact: true });
    return page.getByText(s, { exact: false });
  });
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
  await page.goto(cfg.loginUrl || cfg.productUrl || cfg.categoryUrl);
  log('請在瀏覽器裡完成登入（會員帳號、收件地址可以先存好）。完成後直接關掉瀏覽器即可。');
  await new Promise((r) => ctx.on('close', r));
}

async function cmdCheck(cfg) {
  const { ctx, page } = await openBrowser(cfg);
  const res = await page.goto(await resolveProductUrl(page, cfg), { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const title = await page.title();
  log(`商品頁：HTTP ${res ? res.status() : '?'}，分頁標題「${title}」`);
  if (isErrorTitle(title)) log('✘ 商品頁顯示「發生錯誤」：程式開的瀏覽器看不到商品，請把這個視窗和瀏覽器截圖給 Claude');
  const s = cfg.selectors;
  for (const name of ['buyNow', 'addToCart', 'soldOut', 'quantityInput']) {
    const list = s[name] || [];
    const found = await firstVisible(page, list, 1500);
    log(`${found ? '✔' : '✘'} ${name}`, found ? `→ "${(await found.innerText().catch(() => '')).trim().slice(0, 30)}"` : '（開賣前找不到是正常的）');
  }
  for (const opt of cfg.variantOptions || []) {
    const found = await firstVisible(page, [opt], 1500);
    log(`${found ? '✔' : '✘'} 規格「${opt}」`);
  }
  {
    const state = await cartState(page, cfg);
    log(`購物車：${{ empty: '✔ 空的', items: '⚠ 目前有商品，開賣前請清空（否則不會自動送出）', error: `✘ 購物車網址打不開（${cfg.cartUrl}），請確認 cartUrl`, unknown: '請自己確認是空的（結帳頁另有商品核對保護）' }[state]}`);
  }
  log('檢查完畢，瀏覽器保留讓你對照，關掉即可結束。');
  await new Promise((r) => ctx.on('close', r));
}

const isErrorTitle = (title) => /錯誤|error|not found/i.test(title);

// 文字可能在按鈕裡的 <span>，要看外層按鈕有沒有 disabled
async function isClickable(loc) {
  return loc
    .evaluate((el) => {
      const b = el.closest('button, a, [role=button]') || el;
      return !(b.disabled || b.getAttribute('aria-disabled') === 'true' || /\bdisabled\b/i.test(b.getAttribute('class') || ''));
    })
    .catch(() => false);
}

// 開賣後等購買按鈕可以按：每 100ms 看一次（倒數結束頁面可能自己切換按鈕），每 refreshIntervalMs 才重新整理
async function waitForBuyButton(page, cfg) {
  const s = cfg.selectors;
  const buyList = s.buyNow.concat(s.addToCart);
  const deadline = Date.now() + (cfg.giveUpAfterMinutes || 30) * 60_000;
  let round = 0;
  while (Date.now() < deadline) {
    round += 1;
    const reloadAt = Date.now() + cfg.refreshIntervalMs;
    while (Date.now() < reloadAt) {
      const btn = await firstVisible(page, buyList);
      if (btn && (await isClickable(btn))) return btn;
      await sleep(100);
    }
    const soldOut = await firstVisible(page, s.soldOut || []);
    const state = isErrorTitle(await page.title()) ? '商品頁顯示「發生錯誤」' : soldOut ? '顯示售完/未開賣' : '還沒看到購買按鈕';
    log(`第 ${round} 次：${state}，重新整理`);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  return null;
}

// 沒填 productUrl 時，到活動分類頁用商品名稱找到商品頁
async function resolveProductUrl(page, cfg) {
  if (cfg.productUrl) return cfg.productUrl;
  await page.goto(cfg.categoryUrl, { waitUntil: 'domcontentloaded' });
  const link = page.locator('a', { hasText: new RegExp(cfg.productName) }).first();
  await link.waitFor({ timeout: 15000 });
  const href = await link.getAttribute('href');
  cfg.productUrl = new URL(href, page.url()).href;
  log(`找到商品頁：${cfg.productUrl}`);
  return cfg.productUrl;
}

// 結帳頁：選付款方式、送貨方式、勾同意條款，並核對目標商品在頁面上；全部成功才回傳 true
async function fillCheckout(page, cfg) {
  let ok = true;
  for (const [label, text] of [['付款方式', cfg.paymentMethod], ['送貨方式', cfg.shippingMethod]]) {
    if (!text) continue;
    const el = await firstVisible(page, [text], 5000);
    if (el) {
      await el.click();
      log(`已選${label}：${text}`);
    } else {
      log(`⚠ 找不到${label}「${text}」`);
      ok = false;
    }
  }
  const agree = page.getByRole('checkbox', { name: /同意|閱讀/ }).first();
  if (await agree.isVisible().catch(() => false)) await agree.check().catch(() => {});
  // 結帳頁上每一個商品（含「【西昊】」的文字，連同所在那一行）都必須是目標商品，避免連其他商品一起下單
  if (cfg.productName) {
    const re = new RegExp(cfg.productName);
    const items = await page
      .getByText(cfg.selectors.cartItemText || '【西昊】')
      .filter({ visible: true })
      .evaluateAll((els) => els.map((el) => (el.parentElement || el).innerText.replace(/\s+/g, ' ').trim()));
    const others = items.filter((t) => !re.test(t));
    if (!items.length) log('⚠ 結帳頁沒看到目標商品');
    if (others.length) log(`⚠ 結帳頁有其他商品：${others[0].slice(0, 40)}`);
    if (!items.length || others.length) ok = false;
  }
  // 價格核對：只看每個商品那一行的價格，運費、總計都不看。
  // 每個「【西昊】」商品那一行都要看得到特價（例如 NT$11），避免活動結束恢復原價時照樣下單
  if (cfg.targetPrice) {
    const rows = await itemRowPrices(page, cfg.selectors.cartItemText || '【西昊】');
    for (const r of rows) log(`結帳頁商品：${r.name.slice(0, 45)} → ${r.amounts.map((a) => `NT$${a}`).join('、') || '（沒看到價格）'}`);
    if (!rows.length || rows.some((r) => !r.amounts.includes(cfg.targetPrice))) {
      log(`⚠ 商品價格不是 NT$${cfg.targetPrice}`);
      ok = false;
    }
  }
  return ok;
}

// 找出結帳頁每個商品那一行的價格：從商品名稱往外找，找到第一層有「NT$ 金額」的區塊（不會包到別的商品）。
// 略過有刪除線的原價、看不到的文字，以及標明「原價、定價」的金額
async function itemRowPrices(page, marker) {
  return page.evaluate((marker) => {
    const isStruck = (node) => {
      for (let a = node.parentElement; a && a !== document.body; a = a.parentElement) {
        if (/^(DEL|S|STRIKE)$/.test(a.tagName) || getComputedStyle(a).textDecorationLine.includes('line-through')) return true;
      }
      return false;
    };
    const isHidden = (node) => {
      const el = node.parentElement;
      return !el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden';
    };
    const textNodes = (el) => {
      const out = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode()); ) if (!isStruck(n) && !isHidden(n)) out.push(n);
      return out;
    };
    const cleanText = (el) => textNodes(el).map((n) => n.textContent).join('').replace(/\s+/g, ' ');
    const amountsIn = (text) =>
      [...text.replace(/(原價|定價|建議售價|市價)[:：]?\s*NT\$\s*[\d,]+/g, '').matchAll(/NT\$\s*([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
    const hasMoney = (text) => /NT\$\s*[\d,]+/.test(text);

    const rows = [];
    for (const n of textNodes(document.body)) {
      if (!n.textContent.includes(marker)) continue;
      const name = n.textContent.trim();
      let el = n.parentElement;
      let text = cleanText(el);
      for (let i = 0; i < 6 && !hasMoney(text) && el.parentElement && el.parentElement !== document.body; i++) {
        const up = el.parentElement;
        // 再往外會包到別的商品就停
        if (textNodes(up).some((t) => t.textContent.includes(marker) && t.textContent.trim() !== name)) break;
        el = up;
        text = cleanText(up);
      }
      rows.push({ name, amounts: amountsIn(text) });
    }
    return rows;
  }, marker);
}

// 回傳 'empty'、'items' 或 'error'（購物車網址打不開，無法確認）
async function cartState(page, cfg) {
  if (!cfg.cartUrl) return 'unknown';
  const res = await page.goto(cfg.cartUrl, { waitUntil: 'domcontentloaded' }).catch(() => null);
  if (!res || res.status() >= 400 || isErrorTitle(await page.title())) return 'error';
  return (await firstVisible(page, cfg.selectors.cartHasItems || [], 3000)) ? 'items' : 'empty';
}

async function cmdRun(cfg) {
  const { ctx, page } = await openBrowser(cfg);
  const s = cfg.selectors;

  const startMs = cfg.saleStart ? new Date(cfg.saleStart).getTime() : Date.now();
  const offset = await serverClockOffset(ctx.request, cfg.productUrl || cfg.categoryUrl);
  log(`目標：${cfg.productName || cfg.productUrl}`);
  log(`伺服器時間差 ${Math.round(offset)}ms；開賣時間 ${new Date(startMs).toLocaleString('zh-TW')}`);

  // 提前打開頁面暖機（DNS、登入 cookie、圖片快取）
  await waitUntil(startMs - (cfg.preloadSeconds || 60) * 1000, offset, '預熱');
  let autoSubmit = Boolean(cfg.autoSubmit);
  log(`模式：${autoSubmit ? `自動下單（結帳頁的商品價格要是 NT$${cfg.targetPrice}、只有這張椅子；運費不列入判斷）` : '停在結帳頁，由你按送出'}`);
  const state = autoSubmit ? await cartState(page, cfg) : 'empty';
  if (state === 'items' || state === 'error') {
    autoSubmit = false;
    log(state === 'items'
      ? '⚠ 購物車裡已經有商品，為避免一起下單，本次改為「不自動送出」。要自動送出請先清空購物車再重跑。'
      : '⚠ 購物車網址打不開，無法確認購物車是空的，本次改為「不自動送出」。');
  }
  await page.goto(await resolveProductUrl(page, cfg), { waitUntil: 'domcontentloaded' });
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
  // 「加入購物車」通常只送出一個背景請求並跳小視窗：等到網站回覆（或頁面自己跳轉）就前往購物車，不乾等
  const isCartUrl = /cart|checkout|order/i;
  const added = page
    .waitForResponse((r) => r.request().method() !== 'GET' && ['xhr', 'fetch'].includes(r.request().resourceType()), { timeout: 3000 })
    .catch(() => null);
  const navigated = page.waitForURL(isCartUrl, { timeout: 3000 }).catch(() => null);
  await buy.click();
  log('已點擊購買/加入購物車');
  await Promise.race([added, navigated]);
  if (!isCartUrl.test(page.url()) && cfg.cartUrl) await page.goto(cfg.cartUrl, { waitUntil: 'domcontentloaded' });

  // 可能已經在結帳頁（看得到付款方式），或是跳出購物車側欄要再按「結帳」；側欄沒自己打開就點購物車圖示
  await firstVisible(page, s.checkoutForm.concat(s.checkout), 5000);
  if (!(await firstVisible(page, s.checkoutForm))) {
    let checkout = await firstVisible(page, s.checkout);
    if (!checkout && s.cartIcon) {
      const icon = await firstVisible(page, s.cartIcon, 1000);
      if (icon) {
        await icon.click();
        log('已打開購物車');
        checkout = await firstVisible(page, s.checkout, 3000);
      }
    }
    if (checkout) {
      await checkout.click();
      log('已前往結帳頁');
      await firstVisible(page, s.checkoutForm, 10000);
    }
  }

  const ready = await fillCheckout(page, cfg);
  if (autoSubmit && ready) {
    const submit = await firstVisible(page, s.submitOrder, 3000);
    if (submit) {
      await submit.click();
      log('已按下送出訂單，確認結果中…');
      const done = await firstVisible(page, s.orderDone, 15000);
      await beep(page);
      log(done ? '★ 訂單已成立！請到會員中心確認訂單內容。' : '★ 已按送出，但沒看到「訂單成立」字樣，請立刻看瀏覽器確認。');
      await new Promise((r) => ctx.on('close', r));
      return;
    }
    log('⚠ 找不到送出訂單按鈕');
  } else if (autoSubmit) {
    log('⚠ 結帳頁核對沒通過（見上方），為安全起見不自動送出');
  }

  await beep(page);
  log('★ 已加入購物車，請立刻在瀏覽器完成結帳：確認商品、金額、付款方式，然後自己按送出訂單。');
  if (cfg.couponCode) log(`提醒：折扣碼 ${cfg.couponCode}`);
  await new Promise((r) => ctx.on('close', r));
}

(async () => {
  const cmd = process.argv[2] || 'run';
  const cfg = loadConfig();
  if (process.argv.includes('--submit')) cfg.autoSubmit = true;
  if (process.argv.includes('--no-submit')) cfg.autoSubmit = false;
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
