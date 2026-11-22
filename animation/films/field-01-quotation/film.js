// 工程現場故事 第 1 集:報價單上漏掉的那一行。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F';
  let VO = null, SUBS = [];

  // ---------- 角色 ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CAST = {
    shu: SHU,
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },      // 工地:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },    // 師傅:白色安全帽
    client: { outfit: 'suit', robe: '#3A4A6B', trim: RED, shirt: '#FFFFFF', bottoms: 'pants', shorts: '#2E3A55', pants: '#2E3A55', skin: '#EBC19A', hair: '#2A2220', hairStyle: 'short', glasses: 'square', shoes: '#2A2220' },
  };
  globalThis.CAST = CAST;

  // ---------- 小工具 ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fillRect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const label = (ctx, str, x, y, size, color = INK, o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });
  const popIn = (t, t0, d = 0.3) => ease.outBack(clamp((t - t0) / d));
  function finish(ctx, warm = 'rgba(255,214,140,0.18)') {
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fillRect(ctx, -200, 1250, W + 400, 900, lin(ctx, 0, 1250, 0, 1900, [[0, 'rgba(40,30,30,0)'], [1, 'rgba(40,30,30,0.30)']]));
  }
  function floorLines(ctx, col, seed) {
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed });
    for (let k = 1; k < 6; k++) { const y = GROUND + 34 * k * k * 0.62 + 30 * k; G.line(ctx, [[-30, y], [W + 30, y]], { color: col, lw: 3, seed: seed + k, alpha: 0.45 }); }
    for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 160; G.line(ctx, [[x0, GROUND + 4], [540 + (k - 4) * 350, 1900]], { color: col, lw: 3, seed: seed + 10 + k, alpha: 0.3 }); }
  }

  // 報價單:rows 依序打勾;missing 時多一行紅色虛線的空白列
  function quoteSheet(ctx, x, y, s, t, { rowTimes = null, missing = false, shake = 0 } = {}) {
    const rows = ['材料', '工資', '管理費'];
    const h = missing ? 520 : 430;
    ctx.save(); ctx.translate(x + shake, y); ctx.scale(s, s);
    G.tornPaper(ctx, -260, 0, 520, h, { fill: '#FFFDF4', seed: 61 });
    G.decor(() => {
      label(ctx, '報 價 單', 0, 70, 54, INK);
      G.line(ctx, [[-210, 96], [210, 96]], { color: INK, lw: 4, seed: 62 });
      rows.forEach((r, k) => {
        const on = !rowTimes || t >= rowTimes[k];
        const a = rowTimes ? popIn(t, rowTimes[k], 0.22) : 1;
        if (!on) return;
        const yy = 170 + k * 92;
        G.text(ctx, r, -200, yy, { size: 50, fam: CJK, weight: 800, color: INK, boil: 0 });
        G.line(ctx, [[-40, yy - 14], [120, yy - 14]], { color: '#B8AE9A', lw: 4, seed: 63 + k });
        ctx.save(); ctx.translate(180, yy - 18); ctx.scale(a, a);
        G.line(ctx, [[-22, 0], [-6, 18], [26, -22]], { color: '#3E9B5F', lw: 10, seed: 70 + k });
        ctx.restore();
      });
      if (missing) {
        const yy = 170 + 3 * 92, fl = 0.55 + 0.45 * Math.sin(t * 9);
        ctx.save(); ctx.globalAlpha = fl; ctx.setLineDash([18, 12]); ctx.strokeStyle = RED; ctx.lineWidth = 6; ctx.strokeRect(-215, yy - 58, 430, 80); ctx.restore();
        label(ctx, '高空作業車 ?', 0, yy, 46, RED);
      }
    });
    ctx.restore();
  }
  // 高空作業車(剪刀式):h = 升起高度
  function lift(ctx, x, y, s, h) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -150, -70, 300, 50, 10, { fill: '#E9A23B', lw: 5, seed: 81 });
    for (const wx of [-100, 100]) G.ellipse(ctx, wx, -18, 30, 30, { fill: '#3A3A44', lw: 5, seed: 82 + wx });
    const n = 3, seg = h / n;
    for (let k = 0; k < n; k++) {
      const y0 = -70 - k * seg, y1 = -70 - (k + 1) * seg;
      G.line(ctx, [[-120, y0], [120, y1]], { color: '#8A8F98', lw: 12, seed: 85 + k });
      G.line(ctx, [[120, y0], [-120, y1]], { color: '#8A8F98', lw: 12, seed: 88 + k });
    }
    const py = -70 - h;
    G.rrect(ctx, -150, py - 24, 300, 24, 6, { fill: '#E9A23B', lw: 5, seed: 91 });
    for (const rx of [-146, 0, 146]) G.line(ctx, [[rx, py - 24], [rx, py - 130]], { color: '#E9A23B', lw: 8, seed: 92 + rx });
    G.line(ctx, [[-146, py - 130], [146, py - 130]], { color: '#E9A23B', lw: 8, seed: 95 });
    ctx.restore();
  }

  // ---------- 場景 ----------
  function officeNight(ctx, t) {
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#28324F'], [1, '#3A466B']]));
    G.rrect(ctx, 600, 400, 340, 340, 12, { fill: '#55628F', lw: 6, seed: 101 });
    fillRect(ctx, 620, 420, 300, 300, lin(ctx, 0, 420, 0, 720, [[0, '#141A33'], [1, '#2B3566']]));
    G.ellipse(ctx, 840, 500, 44, 44, { fill: '#F6F1D5', lw: 0, seed: 102 });
    for (let k = 0; k < 10; k++) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + k); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(640 + G.rnd(k, 3) * 260, 440 + G.rnd(k, 4) * 240, 3, 0, 7); ctx.fill(); ctx.restore(); }
    G.line(ctx, [[770, 420], [770, 720]], { color: '#55628F', lw: 10, seed: 103 });
    G.rrect(ctx, 90, 470, 300, 200, 8, { fill: '#F3E9D2', lw: 5, seed: 104 }); // 牆上的月曆
    G.rrect(ctx, 90, 470, 300, 50, 8, { fill: RED, lw: 5, seed: 105 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) G.rrect(ctx, 112 + c * 54, 540 + r * 40, 36, 24, 4, { fill: '#E2D6BC', lw: 2, seed: 106 + r * 5 + c });
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#4A4F6E'], [1, '#2E3350']]));
    floorLines(ctx, '#20253D', 110);
  }
  function desk(ctx, t) {
    fillRect(ctx, 180, 760, 620, 420, rad(ctx, 500, 980, 20, 380, [[0, 'rgba(160,210,255,0.45)'], [1, 'rgba(160,210,255,0)']])); // 螢幕光
    G.rrect(ctx, 150, 1090, 780, 44, 8, { fill: '#B98A5E', lw: 6, seed: 120 });
    for (const lx of [180, 880]) G.rrect(ctx, lx, 1134, 28, 170, 4, { fill: '#8E6444', lw: 4, seed: 121 + lx });
    G.poly(ctx, [[560, 1090], [760, 1090], [790, 930], [590, 930]], { fill: '#2F3A44', lw: 5, seed: 123 }); // 筆電螢幕(背面朝觀眾)
    G.rrect(ctx, 520, 1076, 290, 18, 6, { fill: '#8A8F98', lw: 4, seed: 124 });
    G.rrect(ctx, 220, 1010, 70, 82, 8, { fill: '#FFF7E8', lw: 4, seed: 125 }); // 咖啡杯
    for (let k = 0; k < 2; k++) { const u = (t * 0.6 + k / 2) % 1; G.line(ctx, [[245 + k * 20, 1000 - u * 60], [252 + k * 20 + Math.sin(t * 3 + k) * 8, 960 - u * 60]], { color: '#FFFFFF', lw: 5, seed: 126 + k, alpha: 0.6 * (1 - u) }); }
  }
  function officeDay(ctx) {
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    G.rrect(ctx, 120, 420, 840, 420, 12, { fill: '#BFE3F0', lw: 6, seed: 201 });
    for (const vx of [400, 680]) G.line(ctx, [[vx, 426], [vx, 834]], { color: '#8FB7C7', lw: 8, seed: 202 + vx });
    for (let k = 0; k < 5; k++) G.rrect(ctx, 160 + k * 170, 700 - (k % 3) * 60, 110, 140 + (k % 3) * 60, 4, { fill: '#A9CBD8', lw: 0, seed: 205 + k, alpha: 0.7 }); // 窗外大樓
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
  }
  function site(ctx, t) { // 廠房:天花板很高,上面是管線
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#C9D3DB'], [1, '#E3E9EE']]));
    for (const cx of [130, 950]) G.rrect(ctx, cx - 36, 200, 72, 1100, 4, { fill: '#AEB9C3', lw: 5, seed: 301 + cx }); // 柱子
    G.rrect(ctx, -30, 214, W + 60, 36, 0, { fill: '#8E99A3', lw: 5, seed: 303 }); // 鋼梁
    const pipes = [['#D9DEE3', 280], ['#F2C230', 326], ['#D9DEE3', 372], ['#6FA287', 418]];
    pipes.forEach(([c, y], k) => {
      G.rrect(ctx, -30, y, W + 60, 26, 12, { fill: c, lw: 4, seed: 310 + k });
      for (let j = 0; j < 4; j++) G.rrect(ctx, 200 + j * 240 + k * 20, y - 6, 16, 38, 3, { fill: '#6C7680', lw: 3, seed: 320 + k * 5 + j }); // 管夾
    });
    for (const hx of [300, 560, 800]) G.line(ctx, [[hx, 250], [hx, 444]], { color: '#6C7680', lw: 5, seed: 340 + hx }); // 吊桿
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B9C7C2'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 350);
    G.rrect(ctx, -30, GROUND + 120, W + 60, 22, 0, { fill: '#F2C230', lw: 0, seed: 360, alpha: 0.85 }); // 黃色動線
    // 遠處的工具箱與梯子
    G.rrect(ctx, 150, 1210, 130, 90, 8, { fill: RED, lw: 5, seed: 361 });
    G.rrect(ctx, 176, 1190, 78, 24, 8, { fill: '#8A2E22', lw: 4, seed: 362 });
  }

  // ---------- 每一幕 ----------
  function night(ctx, t) { // 0–1:一個晚上做完報價
    officeNight(ctx, t);
    const done = t >= ev.rows[2] + 0.5;
    Ch.person(ctx, { x: 420, y: 1180, s: 1.5, pose: 'sit', style: CAST.shu, gesture: done ? 'cheer' : 'typing', eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'smile', brows: done ? 'up' : 'determined', look: 0.7, blink: blink(t, 0.1), blush: 0.6, seed: 400, shadow: false });
    desk(ctx, t);
    if (t >= A[1] - 0.1) { const a = popIn(t, A[1] - 0.1); quoteSheet(ctx, 560, 300 + (1 - a) * 60, 0.92 * a, t, { rowTimes: ev.rows }); }
    finish(ctx, 'rgba(150,190,255,0.14)');
  }
  function signed(ctx, t) { // 2:業主簽了
    officeDay(ctx);
    const after = t >= ev.stamp;
    Ch.person(ctx, { x: 330, y: GROUND - (after ? Math.abs(Math.sin(t * 7)) * 24 : 0), s: 1.45, pose: 'stand', style: CAST.shu, gesture: after ? 'cheer' : 'thumbsUp', eyes: 'happy', mouth: 'grin', brows: 'up', look: 0.8, blush: 0.7, seed: 400 });
    Ch.person(ctx, { x: 760, y: GROUND, s: 1.45, sx: -1, pose: 'stand', style: CAST.client, gesture: after ? 'thumbsUp' : undefined, eyes: 'happy', mouth: 'smile', look: 0.8, blink: blink(t, 0.4), seed: 440 });
    quoteSheet(ctx, 545, 330, 0.62, t);
    if (after) {
      const a = popIn(t, ev.stamp, 0.18);
      ctx.save(); ctx.translate(640, 520); ctx.rotate(-0.25); ctx.scale(a * (2 - a), a * (2 - a));
      G.rrect(ctx, -120, -62, 240, 124, 16, { fill: 'rgba(255,255,255,0.0)', stroke: RED, lw: 10, seed: 450 });
      G.decor(() => label(ctx, '簽 約', 0, 26, 78, RED));
      ctx.restore();
      G.confetti(ctx, t, ev.stamp, { n: 50, seed: 4 });
    }
    finish(ctx);
  }
  function arrive(ctx, t) { // 3–4:進場,師傅抬頭
    site(ctx, t);
    const looking = t >= ev.look, asking = t >= A[4];
    const m = mouthOf('master', t);
    Ch.person(ctx, { x: 330, y: GROUND, s: 1.35, pose: 'stand', style: CAST.master, gesture: asking ? 'pointUp' : undefined, eyes: 'normal', mouth: m || 'flat', brows: asking ? 'up' : 'neutral', look: asking ? 0.8 : 0.2, lookY: looking && !asking ? -1 : 0, headRot: looking && !asking ? -0.18 : 0, blink: blink(t, 0.6), seed: 440 });
    Ch.person(ctx, { x: 700, y: GROUND, s: 1.3, sx: -1, pose: 'stand', style: CAST.shuSite, gesture: asking ? 'think' : 'akimbo', eyes: asking ? 'wide' : 'happy', mouth: asking ? 'o' : 'grin', brows: asking ? 'worried' : 'up', look: 0.8, lookY: asking ? -0.6 : 0, sweat: asking ? 0.8 : 0, blink: blink(t, 0.2), blush: 0.5, seed: 400 });
    if (looking) { // 標出高度
      const a = clamp((t - ev.look) / 0.5);
      const y0 = 470, y1 = lerp(470, GROUND - 14, ease.outCubic(a));
      G.line(ctx, [[930, y0], [930, y1]], { color: RED, lw: 8, seed: 470 });
      G.poly(ctx, [[930, y0 - 26], [908, y0 + 8], [952, y0 + 8]], { fill: RED, lw: 0, seed: 471 });
      if (a >= 1) { G.poly(ctx, [[930, GROUND + 10], [908, GROUND - 24], [952, GROUND - 24]], { fill: RED, lw: 0, seed: 472 }); G.decor(() => label(ctx, '好高', 835, 590, 76, RED, { stroke: '#FFFFFF', strokeW: 16 })); }
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function searching(ctx, t) { // 5:翻遍報價單
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1900, [[0, '#E3E9EE'], [1, '#B9C7C2']]));
    for (let k = 0; k < 7; k++) { // 飛起來的紙
      const u = (t * 0.45 + k / 7) % 1, x = 140 + G.rnd(k, 5) * 800 + Math.sin(t * 2 + k) * 40, y = 1500 - u * 1300;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (k % 2 ? 1.6 : -1.3) + k); G.rrect(ctx, -50, -66, 100, 132, 6, { fill: '#FFFDF4', lw: 4, seed: 500 + k, alpha: 0.9 }); ctx.restore();
    }
    const found = t >= ev.gap;
    quoteSheet(ctx, 540, 250, 1.0, t, { missing: found, shake: found ? 0 : Math.sin(t * 30) * 4 });
    Ch.person(ctx, { x: 540, y: 1980, s: 2.3, pose: 'stand', style: CAST.shuSite, gesture: found ? 'facepalm' : 'think', eyes: found ? 'closed' : 'wide', mouth: found ? 'wavy' : 'o', brows: 'worried', sweat: 1, blush: 0.7, headRot: found ? 0 : Math.sin(t * 9) * 0.07, seed: 400 });
    finish(ctx, 'rgba(255,255,255,0.08)');
  }
  function profit(ctx, t) { // 6:利潤被吃掉
    site(ctx, t);
    const u = ease.inOutCubic(clamp((t - ev.drop[0]) / (ev.drop[1] - ev.drop[0] - 0.4)));
    lift(ctx, 300, GROUND, 1.0, lerp(40, 520, u));
    // 利潤長條
    const bx = 620, bw = 220, full = 620, hh = full * (1 - u);
    G.rrect(ctx, bx, GROUND - full, bw, full, 10, { fill: '#FFFFFF', lw: 6, seed: 601, alpha: 0.75 });
    if (hh > 6) G.rrect(ctx, bx, GROUND - hh, bw, hh, 10, { fill: u > 0.7 ? RED : '#3E9B5F', lw: 6, seed: 602 });
    G.decor(() => {
      label(ctx, '利潤', bx + bw / 2, GROUND - full - 40, 70, INK, { stroke: '#FFFFFF', strokeW: 16 });
      label(ctx, Math.round(100 * (1 - u)) + '%', bx + bw / 2, GROUND - Math.max(hh, 90) + 76, 78, '#FFFFFF', { stroke: INK, strokeW: 16 });
      label(ctx, '高空車租金', 300, GROUND - lerp(40, 520, u) - 260, 54, RED, { stroke: '#FFFFFF', strokeW: 14 });
    });
    Ch.person(ctx, { x: 905, y: GROUND + 60, s: 1.0, sx: -1, pose: 'stand', style: CAST.shuSite, eyes: 'wide', mouth: 'o', brows: 'worried', sweat: 1, look: 0.9, seed: 400 });
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function lesson(ctx, t) { // 7–8:師傅給他一張紙
    site(ctx, t);
    const give = t >= ev.paper, m = mouthOf('master', t);
    const k = ease.inOutCubic(clamp((t - ev.paper) / 0.4)); // 檢核表出現時,兩人退到下方兩側
    Ch.person(ctx, { x: lerp(300, 215, k), y: GROUND + 150 * k, s: lerp(1.4, 1.0, k), pose: 'stand', style: CAST.master, gesture: give ? 'point' : undefined, eyes: m ? 'normal' : 'happy', mouth: m || 'smile', look: 0.8, blink: blink(t, 0.6), blush: 0.4, seed: 440 });
    Ch.person(ctx, { x: lerp(770, 865, k), y: GROUND + 150 * k, s: lerp(1.3, 0.95, k), sx: -1, pose: 'stand', style: CAST.shuSite, eyes: give ? 'wide' : 'closed', mouth: give ? 'o' : 'wavy', brows: give ? 'up' : 'worried', look: 0.8, headRot: give ? 0 : 0.1, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    if (give) { // 密密麻麻的檢核表
      const a = popIn(t, ev.paper, 0.35);
      ctx.save(); ctx.translate(540, 205 + (1 - a) * 80); ctx.rotate(0.02); ctx.scale(a * 1.02, a * 1.02);
      G.tornPaper(ctx, -250, 0, 500, 560, { fill: '#FFF6D8', seed: 701 });
      G.decor(() => {
        label(ctx, '漏項檢核表', 0, 72, 56, INK);
        const items = ['高空作業車', '搬運吊裝', '保護清潔', '測試檢驗', '舊管銜接停氣', '送審文件'];
        items.forEach((it, k) => {
          const on = t >= ev.paper + 0.5 + k * 0.32; if (!on) return;
          const yy = 150 + k * 66;
          G.rrect(ctx, -205, yy - 34, 40, 40, 6, { fill: '#FFFFFF', lw: 4, seed: 710 + k });
          G.line(ctx, [[-198, yy - 14], [-186, yy - 2], [-166, yy - 30]], { color: '#3E9B5F', lw: 8, seed: 720 + k });
          G.text(ctx, it, -145, yy, { size: 44, fam: CJK, weight: 800, color: INK, boil: 0 });
        });
      });
      ctx.restore();
    }
    finish(ctx);
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, A[9] + 0.1, 0.4);
    ctx.save(); ctx.translate(540, SAFE.y + 330); ctx.rotate(-0.02); ctx.scale(a, a);
    G.tornPaper(ctx, -440, -230, 880, 500, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '報價漏掉一行', 0, -110, 104, INK);
      label(ctx, '不是少一行字', 0, 20, 84, '#8E6444');
      label(ctx, '是少一筆錢', 0, 170, 124, RED);
    });
    ctx.restore();
    Ch.person(ctx, { x: 330, y: GROUND + 60, s: 1.15, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    Ch.person(ctx, { x: 740, y: GROUND + 60, s: 1.1, sx: -1, pose: 'stand', style: CAST.shuSite, gesture: 'wave', eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(540, 1470); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: night, cam: Shots.push(1.0, 1.06) },
    { at: A[2] - 0.15, draw: signed, in: 'whip' },
    { at: A[3] - 0.15, draw: arrive, in: 'paper', cam: Shots.push(1.0, 1.05) },
    { at: A[5] - 0.15, draw: searching, in: 'cut', cam: Shots.push(1.0, 1.06) },
    { at: A[6] - 0.15, draw: profit, in: 'whip' },
    { at: A[7] - 0.15, draw: lesson, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!、,?!])/).map((p) => p.replace(/[,。、,]/g, '').trim()).filter(Boolean);
      const total = parts.reduce((a, p) => a + p.length, 0);
      let t = l.t;
      for (const p of parts) { const end = t + (l.end - l.t) * p.length / total; out.push({ t, end, text: p }); t = end; }
    }
    return out;
  }

  Studio.film({
    post: { vignette: 0.22, grain: 0.04, paper: 0.35 },
    fadeOut: 0.9,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = buildSubs(VO); },
    draw(ctx, t) {
      ctx.save(); ctx.translate(540, GROUND); ctx.scale(1.14, 1.14); ctx.translate(-540, -GROUND);
      film(ctx, t);
      ctx.restore();
      if (t < A[9] - 0.1) Subs.draw(ctx, t, SUBS, { style: 'pop', size: 78, fam: CJK, highlight: '#FFD75E' });
    },
  });
})();
