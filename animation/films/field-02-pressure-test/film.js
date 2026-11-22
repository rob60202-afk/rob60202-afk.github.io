// 工程現場故事 第 2 集:他只是想省一個晚上。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', BRASS = '#C9A24A';
  const PIPE_Y = 960; // 牆上那一排完工的管線
  let VO = null, SUBS = [];

  // ---------- 角色(與第 1 集相同的造型) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CAST = {
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },      // 阿樹:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },    // 師傅:白色安全帽
    client: { outfit: 'suit', robe: '#3A4A6B', trim: RED, shirt: '#FFFFFF', bottoms: 'pants', shorts: '#2E3A55', pants: '#2E3A55', skin: '#EBC19A', hair: '#2A2220', hairStyle: 'short', glasses: 'square', shoes: '#2A2220', headwear: 'cap', headwearColor: '#6FA8D6' }, // 業主:訪客藍帽
    helper: { outfit: 'tee', shirt: '#E9A23B', bottoms: 'pants', shorts: '#4A4F5E', pants: '#4A4F5E', skin: '#D9A77E', hair: '#3A2A20', hairStyle: 'short', build: 'regular', shoes: '#3A2E28', headwear: 'cap', headwearColor: '#E9853B' }, // 夥伴:橘色安全帽
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
  const hand = (px, py, s, sx, wx, wy) => [(wx - px) / (s * sx), (wy - py) / s]; // 畫面座標 → 角色手的目標
  function finish(ctx, warm = 'rgba(255,214,140,0.18)') {
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fillRect(ctx, -200, 1250, W + 400, 900, lin(ctx, 0, 1250, 0, 1900, [[0, 'rgba(40,30,30,0)'], [1, 'rgba(40,30,30,0.30)']]));
  }
  function floorLines(ctx, col, seed) {
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed });
    for (let k = 1; k < 6; k++) { const y = GROUND + 34 * k * k * 0.62 + 30 * k; G.line(ctx, [[-30, y], [W + 30, y]], { color: col, lw: 3, seed: seed + k, alpha: 0.45 }); }
    for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 160; G.line(ctx, [[x0, GROUND + 4], [540 + (k - 4) * 350, 1900]], { color: col, lw: 3, seed: seed + 10 + k, alpha: 0.3 }); }
  }

  // ---------- 道具 ----------
  // 一段水平的管子 + 兩端法蘭
  function pipeSeg(ctx, x0, x1, y, th, seed, { color = STEEL, flanges = true } = {}) {
    G.rrect(ctx, x0, y - th / 2, x1 - x0, th, th * 0.3, { fill: color, lw: 4, seed });
    G.line(ctx, [[x0 + 10, y - th * 0.22], [x1 - 10, y - th * 0.22]], { color: '#FFFFFF', lw: 4, seed: seed + 1, alpha: 0.7 });
    if (flanges) for (const fx of [x0, x1]) G.rrect(ctx, fx - th * 0.22, y - th * 0.8, th * 0.44, th * 1.6, 4, { fill: '#8E99A3', lw: 4, seed: seed + 2 + fx });
  }
  function wrench(ctx, x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -9, -8, 18, 100, 8, { fill: '#8A8F98', lw: 4, seed: 41 });
    G.ellipse(ctx, 0, -18, 24, 24, { fill: '#8A8F98', lw: 4, seed: 42 });
    G.rrect(ctx, -9, -46, 18, 26, 2, { fill: '#5C6470', lw: 0, seed: 43 });
    ctx.restore();
  }
  // 壓力錶:frac 0..1 = 指針位置。錶面只有刻度,不放數字。
  function gauge(ctx, x, y, r, frac, t, { alarm = 0, seed = 900, stem = true } = {}) {
    const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5, ang = (f) => a0 + sweep * f;
    const thin = r < 100;
    ctx.save(); ctx.translate(x, y);
    if (stem) G.rrect(ctx, -r * 0.13, r * 0.9, r * 0.26, r * 0.55, 4, { fill: BRASS, lw: thin ? 3 : 5, seed });
    G.ellipse(ctx, 0, 0, r, r, { fill: alarm > 0 ? G.tint(RED, 0.15 + 0.2 * Math.sin(t * 10)) : '#6C7680', lw: thin ? 4 : 7, seed: seed + 1 });
    G.ellipse(ctx, 0, 0, r * 0.87, r * 0.87, { fill: '#FFFDF4', lw: thin ? 2 : 4, seed: seed + 2 });
    const arc = (f0, f1, c) => { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, ang(f0), ang(f1)); ctx.strokeStyle = c; ctx.lineWidth = r * 0.11; ctx.stroke(); };
    arc(0, 0.3, '#E08A7A'); arc(0.3, 0.64, '#D8D2C2'); arc(0.64, 0.92, '#7CC08F'); arc(0.92, 1, '#D8D2C2');
    if (!thin) for (let k = 0; k <= 20; k++) {
      const a = ang(k / 20), big = k % 5 === 0, r0 = r * (big ? 0.5 : 0.56), r1 = r * 0.63;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.strokeStyle = INK; ctx.lineWidth = big ? 7 : 4; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.save(); ctx.rotate(ang(clamp(frac, 0, 1)));
    G.poly(ctx, [[-r * 0.16, -r * 0.045], [r * 0.7, 0], [-r * 0.16, r * 0.045]], { fill: alarm > 0 ? RED : INK, lw: thin ? 2 : 3, seed: seed + 3, amp: 0.5 });
    ctx.restore();
    G.ellipse(ctx, 0, 0, r * 0.09, r * 0.09, { fill: BRASS, lw: thin ? 2 : 4, seed: seed + 4 });
    ctx.restore();
  }
  function toolbox(ctx, x, y, s = 1) {
    G.rrect(ctx, x - 65 * s, y - 90 * s, 130 * s, 90 * s, 8, { fill: RED, lw: 5, seed: 361 });
    G.rrect(ctx, x - 39 * s, y - 110 * s, 78 * s, 24 * s, 8, { fill: '#8A2E22', lw: 4, seed: 362 });
  }

  // ---------- 場景:廠房配管區(dusk 黃昏 / morning 白天 / night 深夜) ----------
  const SKY = { dusk: ['#E9743F', '#F9CF7C'], morning: ['#9FD3F0', '#E4F4FB'], night: ['#141A33', '#2B3566'] };
  const TINT = { dusk: 'rgba(240,130,50,0.20)', morning: null, night: 'rgba(18,24,62,0.56)' };
  function fab(ctx, t, mode, { run = true, gaugeFrac = null, alarm = 0 } = {}) {
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#C9D3DB'], [1, '#E3E9EE']]));
    // 窗
    G.rrect(ctx, 390, 500, 300, 300, 12, { fill: '#8E99A3', lw: 6, seed: 370 });
    ctx.save(); ctx.beginPath(); ctx.rect(410, 520, 260, 260); ctx.clip();
    fillRect(ctx, 410, 520, 260, 260, lin(ctx, 0, 520, 0, 780, [[0, SKY[mode][0]], [1, SKY[mode][1]]]));
    if (mode === 'dusk') G.ellipse(ctx, 600, 770, 62, 62, { fill: '#FFE3A0', lw: 0, seed: 371 });
    if (mode === 'morning') { G.ellipse(ctx, 480, 590, 40, 40, { fill: '#FFF3B8', lw: 0, seed: 371 }); G.rrect(ctx, 540, 660, 120, 34, 17, { fill: '#FFFFFF', lw: 0, seed: 372, alpha: 0.9 }); }
    if (mode === 'night') {
      G.ellipse(ctx, 610, 600, 40, 40, { fill: '#F6F1D5', lw: 0, seed: 371 });
      for (let k = 0; k < 9; k++) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + k); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(420 + G.rnd(k, 3) * 240, 530 + G.rnd(k, 4) * 230, 3, 0, 7); ctx.fill(); ctx.restore(); }
    }
    ctx.restore();
    G.line(ctx, [[540, 520], [540, 780]], { color: '#8E99A3', lw: 10, seed: 373 });
    // 柱、梁、天花板管線(與第 1 集同一座廠房)
    for (const cx of [130, 950]) G.rrect(ctx, cx - 36, 200, 72, 1100, 4, { fill: '#AEB9C3', lw: 5, seed: 301 + cx });
    G.rrect(ctx, -30, 214, W + 60, 36, 0, { fill: '#8E99A3', lw: 5, seed: 303 });
    [['#D9DEE3', 280], ['#F2C230', 326], ['#D9DEE3', 372], ['#6FA287', 418]].forEach(([c, y], k) => {
      G.rrect(ctx, -30, y, W + 60, 26, 12, { fill: c, lw: 4, seed: 310 + k });
      for (let j = 0; j < 4; j++) G.rrect(ctx, 200 + j * 240 + k * 20, y - 6, 16, 38, 3, { fill: '#6C7680', lw: 3, seed: 320 + k * 5 + j });
    });
    for (const hx of [300, 800]) G.line(ctx, [[hx, 250], [hx, 444]], { color: '#6C7680', lw: 5, seed: 340 + hx });
    // 地板
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B9C7C2'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 350);
    G.rrect(ctx, -30, GROUND + 120, W + 60, 22, 0, { fill: '#F2C230', lw: 0, seed: 360, alpha: 0.85 });
    // 牆上的管線:立管接到天花板
    G.rrect(ctx, 803, 440, 34, PIPE_Y - 440 + 17, 10, { fill: STEEL, lw: 4, seed: 380 });
    G.rrect(ctx, 796, 640, 48, 20, 4, { fill: '#8E99A3', lw: 4, seed: 381 });
    if (run) {
      for (const px of [250, 470, 700]) G.rrect(ctx, px - 9, PIPE_Y + 14, 18, GROUND - PIPE_Y - 14, 3, { fill: '#8E99A3', lw: 4, seed: 382 + px });
      pipeSeg(ctx, -30, 180, PIPE_Y, 34, 385); pipeSeg(ctx, 180, 400, PIPE_Y, 34, 386); pipeSeg(ctx, 400, 600, PIPE_Y, 34, 387); pipeSeg(ctx, 600, 830, PIPE_Y, 34, 388, { flanges: false });
      G.rrect(ctx, 592, PIPE_Y - 27, 16, 54, 4, { fill: '#8E99A3', lw: 4, seed: 389 });
      if (gaugeFrac != null) gauge(ctx, 540, PIPE_Y - 84, 46, gaugeFrac, t, { alarm, seed: 905 });
    }
    if (TINT[mode]) fillRect(ctx, -200, -200, W + 400, H + 400, TINT[mode]);
  }

  // ---------- 每一幕 ----------
  function dusk(ctx, t) { // 0:黃昏,管子全部接完
    fab(ctx, t, 'dusk');
    toolbox(ctx, 800, GROUND + 40, 1.0);
    const done = t >= ev.done, proud = t >= ev.done + 1.1;
    const px = 330, py = GROUND, s = 1.4;
    const wx = 578, wy = PIPE_Y + 20 + (done ? 0 : Math.sin(t * 9) * 16);
    Ch.person(ctx, { x: px, y: py, s, pose: 'stand', style: CAST.shuSite, gesture: proud ? 'thumbsUp' : undefined,
      handR: proud ? undefined : done ? [34, -322 - 118] : hand(px, py, s, 1, wx, wy),
      eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'flat', brows: done ? 'up' : 'determined', look: done ? 0 : 0.9, sweat: 0.7, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    if (!done) wrench(ctx, wx + 6, wy - 4, 0.5 + Math.sin(t * 9) * 0.3, 1.1);
    if (done) for (let k = 0; k < 5; k++) { // 整排管線亮一下
      const a = clamp((t - ev.done - k * 0.09) / 0.25), o = clamp(1.6 - (t - ev.done - k * 0.09) * 0.9);
      if (a > 0 && o > 0) { ctx.save(); ctx.globalAlpha = o; G.star(ctx, 560 + k * 62, PIPE_Y - 50 - (k % 3) * 22, 24 * ease.outBack(a), { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 30 + k }); ctx.restore(); }
    }
    finish(ctx, 'rgba(255,170,90,0.22)');
  }
  function gaugeShot(ctx, t) { // 1:照規矩,保壓一整晚
    const n = clamp((t - (A[1] + 1.6)) / 1.8); // 天色由黃昏慢慢變成深夜
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1900, [[0, '#E9C3A0'], [1, '#F3DFC6']]));
    ctx.save(); ctx.globalAlpha = n * 0.92; fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1900, [[0, '#232C4A'], [1, '#3A466B']]));
    for (let k = 0; k < 14; k++) { ctx.globalAlpha = n * (0.5 + 0.5 * Math.sin(t * 3 + k)); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(110 + G.rnd(k, 7) * 860, 330 + G.rnd(k, 8) * 300, 4, 0, 7); ctx.fill(); }
    ctx.restore();
    if (n > 0) { ctx.save(); ctx.globalAlpha = n; G.ellipse(ctx, 850, 545, 46, 46, { fill: '#F6F1D5', lw: 0, seed: 21 }); ctx.restore(); }
    pipeSeg(ctx, -40, 380, 1200, 96, 910); pipeSeg(ctx, 380, 700, 1200, 96, 912); pipeSeg(ctx, 700, 1130, 1200, 96, 914);
    let f = 0;
    ev.ticks.forEach((tt) => { f += 0.156 * ease.outBack(clamp((t - tt) / 0.18)); });
    const steady = t > ev.ticks[4] + 0.2;
    gauge(ctx, 520, 800, 285, f + (steady ? Math.sin(t * 2.2) * 0.003 : 0), t, { seed: 920 });
    const a = popIn(t, A[1] + 0.15, 0.3);
    ctx.save(); ctx.translate(520, 430); ctx.rotate(-0.02); ctx.scale(a, a);
    G.tornPaper(ctx, -250, -78, 500, 140, { fill: '#FFFDF4', seed: 925 });
    G.decor(() => label(ctx, '保壓測試', 0, 26, 92, INK));
    ctx.restore();
    finish(ctx, 'rgba(255,214,140,0.12)');
  }
  function watch(ctx, t) { // 2:看看時間,「應該不會漏吧」
    fab(ctx, t, 'dusk');
    const think = t >= ev.think, m = think ? mouthOf('shu', t) : null, smug = t >= E[2] - 0.15;
    const px = 425, py = 1380, s = 1.7;
    Ch.person(ctx, { x: px, y: py, s, pose: 'stand', style: CAST.shuSite, gesture: think ? 'shrug' : undefined, handL: think ? undefined : [-26, -322 + 52],
      eyes: smug ? 'happy' : 'normal', mouth: smug ? 'smirk' : m || (think ? 'smile' : 'flat'), brows: think ? 'up' : 'worried', look: think ? 0.7 : -0.25, lookY: think ? 0 : 0.8, headRot: think ? 0.04 : -0.05,
      sweat: think ? 0 : 0.5, blush: 0.5, blink: blink(t, 0.2), seed: 400 });
    if (!think) { // 手腕上的錶
      const hx = px - 26 * s, hy = py + (-322 + 52) * s;
      G.ellipse(ctx, hx + 8, hy - 26, 26, 26, { fill: '#FFFDF4', lw: 5, seed: 51 });
    }
    // 放大的手錶
    const a = think ? 1 - clamp((t - ev.think) / 0.2) : popIn(t, A[2] + 0.15, 0.3);
    if (a > 0.01) {
      ctx.save(); ctx.translate(790, 560); ctx.scale(a, a); ctx.rotate(0.08);
      G.rrect(ctx, -46, -190, 92, 380, 16, { fill: '#5A4A3C', lw: 5, seed: 52 });
      G.ellipse(ctx, 0, 0, 122, 122, { fill: '#8A8F98', lw: 6, seed: 53 });
      G.ellipse(ctx, 0, 0, 102, 102, { fill: '#FFFDF4', lw: 4, seed: 54 });
      for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; G.line(ctx, [[Math.cos(an) * 80, Math.sin(an) * 80], [Math.cos(an) * 92, Math.sin(an) * 92]], { color: INK, lw: k % 3 ? 4 : 8, seed: 55 + k, amp: 0 }); }
      const hr = Math.PI * 0.62, mn = -Math.PI / 2 + Math.PI * 2 * 0.72, sc = -Math.PI / 2 + Math.floor((t - A[2]) * 2) * Math.PI / 30;
      G.line(ctx, [[0, 0], [Math.cos(hr) * 50, Math.sin(hr) * 50]], { color: INK, lw: 11, seed: 70, amp: 0 });
      G.line(ctx, [[0, 0], [Math.cos(mn) * 76, Math.sin(mn) * 76]], { color: INK, lw: 8, seed: 71, amp: 0 });
      G.line(ctx, [[0, 0], [Math.cos(sc) * 84, Math.sin(sc) * 84]], { color: RED, lw: 4, seed: 72, amp: 0 });
      G.ellipse(ctx, 0, 0, 9, 9, { fill: INK, lw: 0, seed: 73 });
      ctx.restore();
    }
    if (think) for (let k = 0; k < 3; k++) { // 鎖得很緊的接頭
      const b = popIn(t, ev.think + 0.5 + k * 0.12, 0.25);
      if (b > 0) G.star(ctx, 730 + k * 55, PIPE_Y - 120 - (k % 2) * 34, 22 * b, { fill: '#FFF2A8', rot: t + k, seed: 60 + k });
    }
    finish(ctx, 'rgba(255,170,90,0.22)');
  }
  function leave(ctx, t, s) { // 3:收工具,關燈回家
    fab(ctx, t, 'dusk');
    // 門
    G.rrect(ctx, 774, 850, 190, 456, 6, { fill: '#6C7680', lw: 6, seed: 81 });
    fillRect(ctx, 790, 866, 160, 434, lin(ctx, 0, 866, 0, 1300, [[0, '#F3A35C'], [1, '#FBE0A6']]));
    G.rrect(ctx, 716, 1010, 34, 50, 6, { fill: '#FFFDF4', lw: 4, seed: 82 }); // 電燈開關
    const off = t >= ev.lights;
    const wk = Ch.walk(t, { x0: 230, speed: 290, t0: s.t0, stride: 300, s: 1.15 });
    const bob = Math.abs(Math.sin(2 * Math.PI * wk.walk)) * 12 * 1.15;
    const dark = clamp((t - ev.lights) / 0.12) * 0.68;
    if (off) { // 燈一關,只剩門口的光
      ctx.save(); ctx.fillStyle = `rgba(14,18,44,${dark})`; ctx.beginPath(); ctx.rect(-200, -200, W + 400, H + 400); ctx.rect(790, 866, 160, 434); ctx.fill('evenodd'); ctx.restore();
      fillRect(ctx, 300, 1250, 760, 400, rad(ctx, 870, 1310, 10, 420, [[0, `rgba(255,200,120,${dark * 0.5})`], [1, 'rgba(255,200,120,0)']]));
    }
    ctx.save(); if (off) ctx.filter = `brightness(${1 - dark * 0.75}) saturate(0.7)`;
    toolbox(ctx, wk.x - 112, GROUND - 96 - bob, 0.85);
    Ch.person(ctx, { ...wk, y: GROUND, s: 1.15, style: CAST.shuSite, eyes: 'happy', mouth: 'smile', brows: 'up', look: 0.6, blush: 0.5, seed: 400 });
    ctx.restore();
    finish(ctx, off ? 'rgba(255,170,90,0.05)' : 'rgba(255,170,90,0.22)');
  }
  function inspect(ctx, t) { // 4:隔天驗收,指針慢慢往下掉
    const u = clamp((t - ev.drop[0]) / (ev.drop[1] - ev.drop[0]));
    const f = lerp(0.78, 0.2, ease.inOutQuad(u)) + (u > 0 && u < 1 ? Math.sin(t * 23) * 0.006 : 0);
    const bad = u > 0.25 ? 1 : 0, falling = u > 0;
    fab(ctx, t, 'morning');
    // 放大的壓力錶
    G.poly(ctx, [[500, 850], [580, 850], [540, 905]], { fill: '#FFFFFF', lw: 5, seed: 90 });
    G.ellipse(ctx, 540, 610, 252, 252, { fill: '#FFFFFF', lw: 7, seed: 91 });
    gauge(ctx, 540, 610, 212, f, t, { alarm: bad, seed: 930, stem: false });
    if (falling) { // 往下掉的箭頭
      const a = popIn(t, ev.drop[0], 0.25), yy = 470 + ((t - ev.drop[0]) * 60) % 50;
      ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
      G.line(ctx, [[842, 440], [842, yy + 150]], { color: RED, lw: 16 * a, seed: 92, amp: 0 });
      G.poly(ctx, [[806, yy + 140], [878, yy + 140], [842, yy + 200]], { fill: RED, lw: 0, seed: 93 });
      ctx.restore();
    }
    Ch.person(ctx, { x: 240, y: 1400, s: 1.0, pose: 'stand', style: CAST.client, gesture: falling ? 'pointUp' : 'akimbo', eyes: 'normal', mouth: falling ? 'flat' : 'smile', brows: falling ? 'determined' : 'neutral', look: 0.6, lookY: -0.7, headRot: -0.06, blink: blink(t, 0.4), seed: 440 });
    Ch.person(ctx, { x: 800, y: 1400, s: 0.95, sx: -1, pose: 'stand', style: CAST.shuSite, gesture: bad ? 'think' : undefined, eyes: falling ? 'wide' : 'happy', mouth: bad ? 'wavy' : falling ? 'o' : 'smile', brows: falling ? 'worried' : 'up', look: 0.6, lookY: -0.7, sweat: falling ? 1 : 0, blush: 0.5, blink: blink(t, 0.2), seed: 400 });
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function leak(ctx, t, s) { // 5:鏡頭推到最深處的那一個接頭
    const VX = 540, VY = 880;
    const z = lerp(1, 2.5, ease.inOutCubic(clamp((t - s.t0) / 1.7)));
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, VX, VY, 40, 1300, [[0, '#56636E'], [0.45, '#93A0AB'], [1, '#D3DBE1']]));
    ctx.save(); ctx.translate(VX, VY); ctx.scale(z, z); ctx.translate(-VX, -VY);
    const frame = (k) => {
      const d = 1 / (1 + k * 0.55), hw = 600 * d, hh = 760 * d, col = G.tint('#C3CCD4', -k * 0.085), lw = Math.max(1.5, 5 * d);
      for (const sd of [-1, 1]) G.rrect(ctx, VX + sd * hw - 34 * d, VY - hh, 68 * d, hh * 2, 4, { fill: col, lw, seed: 500 + k * 9 + sd });
      G.rrect(ctx, VX - hw, VY - hh, hw * 2, 44 * d, 3, { fill: G.tint('#9AA5AF', -k * 0.085), lw, seed: 503 + k * 9 });
      const pc = [['#F2C230', STEEL], ['#6FA287', '#F2C230'], [STEEL, '#6FA287']][k % 3];
      G.rrect(ctx, VX - hw, VY - hh * 0.62, hw * 2, 40 * d, 16 * d, { fill: G.tint(pc[0], -k * 0.07), lw, seed: 504 + k * 9 });
      G.rrect(ctx, VX - hw, VY + hh * 0.58, hw * 2, 46 * d, 16 * d, { fill: G.tint(pc[1], -k * 0.07), lw, seed: 505 + k * 9 });
      const vx = VX + (k % 2 ? 1 : -1) * hw * 0.66;
      G.rrect(ctx, vx - 18 * d, VY - hh, 36 * d, hh * 2, 12 * d, { fill: G.tint(STEEL, -k * 0.07), lw, seed: 506 + k * 9 });
    };
    frame(5);
    // 最裡面的接頭
    ctx.save(); ctx.translate(VX, VY); ctx.scale(0.42, 0.42);
    G.rrect(ctx, -390, -30, 330, 60, 14, { fill: STEEL, lw: 4, seed: 520 });
    G.rrect(ctx, 60, -30, 330, 60, 14, { fill: STEEL, lw: 4, seed: 521 });
    G.line(ctx, [[-380, -12], [-70, -12]], { color: '#FFFFFF', lw: 5, seed: 522, alpha: 0.8 });
    G.line(ctx, [[70, -12], [380, -12]], { color: '#FFFFFF', lw: 5, seed: 523, alpha: 0.8 });
    G.poly(ctx, [[-70, -50], [-40, -62], [40, -62], [70, -50], [70, 50], [40, 62], [-40, 62], [-70, 50]], { fill: BRASS, lw: 4, seed: 524 });
    for (const lx of [-26, 26]) G.line(ctx, [[lx, -58], [lx, 58]], { color: '#8F6F2C', lw: 4, seed: 525 + lx });
    ctx.restore();
    for (let k = 4; k >= 0; k--) frame(k);
    ctx.restore();
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, VX, VY, 260, 1150, [[0, 'rgba(20,26,40,0)'], [1, 'rgba(20,26,40,0.5)']]));
    if (t >= ev.leak) { // 漏點
      const a = popIn(t, ev.leak, 0.3), dt = t - ev.leak;
      for (let k = 0; k < 2; k++) { const p = (dt * 0.9 + k * 0.5) % 1; ctx.save(); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = RED; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(VX, VY, 110 + p * 90, 0, 7); ctx.stroke(); ctx.restore(); }
      for (let k = 0; k < 3; k++) { const p = (dt * 1.3 + k / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - p * 0.8; G.poly(ctx, [[VX - 8 + k * 8, VY + 60 + p * 190], [VX - 22 + k * 8, VY + 96 + p * 190], [VX - 8 + k * 8, VY + 112 + p * 190], [VX + 6 + k * 8, VY + 96 + p * 190]], { fill: '#6FC1EE', lw: 3, seed: 530 + k }); ctx.restore(); }
      ctx.save(); ctx.translate(690, 560); ctx.scale(a, a); ctx.rotate(-0.05);
      G.decor(() => label(ctx, '漏點', 0, 40, 130, RED, { stroke: '#FFFFFF', strokeW: 22 }));
      ctx.restore();
      G.line(ctx, [[672, 640], [600, 770]], { color: '#FFFFFF', lw: 22, seed: 531, amp: 0 });
      G.line(ctx, [[672, 640], [600, 770]], { color: RED, lw: 11, seed: 531, amp: 0 });
      G.poly(ctx, [[578, 742], [632, 772], [584, 806]], { fill: RED, stroke: '#FFFFFF', lw: 5, seed: 532 });
    }
  }
  function teardown(ctx, t) { // 6:三天裝好的,一段一段拆
    fab(ctx, t, 'morning', { run: false });
    // 兩端還留在牆上的管子
    pipeSeg(ctx, -30, 320, PIPE_Y, 34, 385); pipeSeg(ctx, 740, 830, PIPE_Y, 34, 388, { flanges: false });
    for (const px of [330, 460, 600, 730]) G.rrect(ctx, px - 9, PIPE_Y + 14, 18, GROUND - PIPE_Y - 14, 3, { fill: '#8E99A3', lw: 4, seed: 382 + px });
    const nOff = ev.clanks.filter((c) => t >= c).length;
    // 三段管子:由右往左拆,拆下來堆在地上
    const rots = [0.14, -0.1, 0.06];
    for (let k = 0; k < 3; k++) {
      const x0 = 600 - 140 * k, p = clamp((t - ev.clanks[k]) / 0.55);
      const cx = lerp(x0 + 70, 520 + (k - 1) * 26, ease.inOutQuad(p)), cy = lerp(PIPE_Y, 1272 - k * 34, ease.inQuad(p)) - Math.sin(Math.PI * p) * 70;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rots[k] * p + Math.sin(Math.PI * p) * (k % 2 ? -0.5 : 0.5));
      pipeSeg(ctx, -70, 70, 0, 34, 600 + k * 4);
      ctx.restore();
      const q = t - ev.clanks[k];
      if (q >= 0 && q < 0.3) for (let j = 0; j < 6; j++) { const an = j * Math.PI / 3 + 0.3, r0 = 40 + q * 120, r1 = r0 + 34; G.line(ctx, [[x0 + 70 + Math.cos(an) * r0, PIPE_Y + Math.sin(an) * r0], [x0 + 70 + Math.cos(an) * r1, PIPE_Y + Math.sin(an) * r1]], { color: RED, lw: 8, seed: 620 + j, alpha: 1 - q / 0.3 }); }
    }
    const done = nOff >= 3 && t >= ev.clanks[2] + 0.5;
    const wob = Math.sin(t * 10) * 14;
    const sx0 = [470, 470, 335][Math.min(nOff, 2)], hx0 = [728, 600, 600][Math.min(nOff, 2)];
    const p1 = [220, GROUND, 1.1], p2 = [800, GROUND, 1.1];
    Ch.person(ctx, { x: p1[0], y: p1[1], s: p1[2], pose: 'stand', style: CAST.shuSite, handR: done ? undefined : hand(p1[0], p1[1], p1[2], 1, sx0, PIPE_Y - 6 + wob), gesture: done ? 'facepalm' : undefined,
      eyes: done ? 'closed' : 'normal', mouth: 'wavy', brows: 'worried', look: 0.8, lookY: 0.3, sweat: 1, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    const helping = nOff < 2;
    Ch.person(ctx, { x: p2[0], y: p2[1], s: p2[2], sx: -1, pose: 'stand', style: CAST.helper, handR: helping ? hand(p2[0], p2[1], p2[2], -1, hx0, PIPE_Y - 6 - wob) : undefined, gesture: helping ? undefined : 'akimbo',
      eyes: 'normal', mouth: helping ? 'flat' : 'wavy', brows: helping ? 'determined' : 'worried', look: 0.8, lookY: 0.3, sweat: 0.7, blink: blink(t, 0.5), seed: 480 });
    if (!done) wrench(ctx, sx0 + 4, PIPE_Y - 10 + wob, -0.5 + wob * 0.02, 1.0);
    if (helping) wrench(ctx, hx0 - 4, PIPE_Y - 10 - wob, 0.5 + wob * 0.02, 1.0);
    // 三張日曆:第三天、第二天、第一天,依序劃掉
    ['第一天', '第二天', '第三天'].forEach((d, i) => {
      const cx = 245 + i * 265, a = popIn(t, A[6] + 0.1 + i * 0.1, 0.3), k = 2 - i;
      ctx.save(); ctx.translate(cx, 440); ctx.rotate([-0.03, 0.02, -0.02][i]); ctx.scale(a, a);
      G.tornPaper(ctx, -112, -74, 224, 150, { fill: '#FFFDF4', seed: 640 + i });
      G.rrect(ctx, -112, -74, 224, 30, 4, { fill: RED, lw: 0, seed: 644 + i });
      G.decor(() => label(ctx, d, 0, 42, 62, INK));
      if (t >= ev.clanks[k]) { const b = clamp((t - ev.clanks[k]) / 0.15); G.line(ctx, [[-90, -40], [lerp(-90, 90, b), lerp(-40, 66, b)]], { color: RED, lw: 9, seed: 650 + i, alpha: 0.85 }); G.line(ctx, [[90, -40], [lerp(90, -90, b), lerp(-40, 66, b)]], { color: RED, lw: 9, seed: 654 + i, alpha: 0.85 }); }
      ctx.restore();
    });
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function nightScene(ctx, t, talkShot) { // 7–8:深夜,兩個人並肩
    fab(ctx, t, 'night', { run: false });
    pipeSeg(ctx, -30, 180, PIPE_Y, 34, 385);
    fillRect(ctx, -200, 300, W + 400, 1500, rad(ctx, 930, 760, 30, 900, [[0, 'rgba(255,214,140,0.50)'], [1, 'rgba(255,214,140,0)']])); // 工作燈的光
    // 工作燈
    if (!talkShot) {
      G.line(ctx, [[960, GROUND], [930, 800]], { color: '#3A3A44', lw: 9, seed: 701 }); G.line(ctx, [[900, GROUND], [930, 800]], { color: '#3A3A44', lw: 9, seed: 702 });
      G.rrect(ctx, 885, 730, 90, 80, 10, { fill: '#F2C230', lw: 5, seed: 703 }); G.rrect(ctx, 878, 742, 26, 56, 6, { fill: '#FFF7D0', lw: 3, seed: 704 });
    }
    // 拆下來的管子堆在地上
    for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(170 + (k % 2) * 30, 1280 - k * 30); ctx.rotate([0.08, -0.06, 0.1, -0.03][k]); pipeSeg(ctx, -75, 75, 0, 30, 710 + k * 4); ctx.restore(); }
    const speaking = t >= ev.speak - 0.1, m = mouthOf('master', t), after = t >= E[8];
    const wob = speaking ? 0 : Math.sin(t * 6) * 12;
    const p1 = [345, GROUND, 1.35], p2 = [725, GROUND, 1.3];
    const BY = 1085; // 兩人面前架著的那一段管子
    Ch.person(ctx, { x: p1[0], y: p1[1], s: p1[2], pose: 'stand', style: CAST.master, handR: hand(p1[0], p1[1], p1[2], 1, 478, BY - 12 + wob), handL: hand(p1[0], p1[1], p1[2], 1, 268, BY - 14),
      eyes: after ? 'happy' : 'normal', mouth: m || (after ? 'smile' : 'flat'), brows: 'neutral', look: speaking ? 0.85 : 0.3, lookY: speaking ? 0 : 0.7, headRot: speaking ? 0.06 : 0, blink: blink(t, 0.6), blush: 0.4, seed: 440 });
    Ch.person(ctx, { x: p2[0], y: p2[1], s: p2[2], sx: -1, pose: 'stand', style: CAST.shuSite, handR: hand(p2[0], p2[1], p2[2], -1, 600, BY - 12 - wob), handL: hand(p2[0], p2[1], p2[2], -1, 800, BY - 14),
      eyes: speaking ? (after ? 'happy' : 'wide') : 'closed', mouth: after ? 'smile' : speaking ? 'flat' : 'wavy', brows: speaking ? 'up' : 'worried', look: speaking ? 0.85 : 0.2, lookY: speaking ? 0 : 0.7, headRot: speaking ? 0.05 : 0.1, sweat: speaking ? 0 : 0.6, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    for (const px of [290, 790]) { G.line(ctx, [[px, BY + 18], [px - 40, GROUND + 30]], { color: '#6C7680', lw: 10, seed: 720 + px }); G.line(ctx, [[px, BY + 18], [px + 40, GROUND + 30]], { color: '#6C7680', lw: 10, seed: 722 + px }); }
    pipeSeg(ctx, 230, 540, BY, 40, 730); pipeSeg(ctx, 540, 850, BY, 40, 734);
    if (!speaking) { wrench(ctx, 482, BY - 16 + wob, -0.5 + wob * 0.02, 1.1); wrench(ctx, 598, BY - 16 - wob, 0.5 + wob * 0.02, 1.1); }
    finish(ctx, 'rgba(150,190,255,0.10)');
  }
  const lateNight = (ctx, t) => nightScene(ctx, t, false);
  function talk(ctx, t, s) { // 8:師傅那一句話(推近)
    const z = lerp(1.2, 1.27, s.u);
    ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-540, -960);
    nightScene(ctx, t, true);
    ctx.restore();
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, A[9] + 0.1, 0.4);
    ctx.save(); ctx.translate(510, SAFE.y + 310); ctx.rotate(-0.02); ctx.scale(a, a);
    G.tornPaper(ctx, -420, -200, 840, 440, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '省下來的那一個晚上', 0, -50, 80, INK);
      label(ctx, '最後用三天還', 0, 130, 122, RED);
    });
    ctx.restore();
    Ch.person(ctx, { x: 330, y: GROUND + 60, s: 1.15, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    Ch.person(ctx, { x: 730, y: GROUND + 60, s: 1.1, sx: -1, pose: 'stand', style: CAST.shuSite, gesture: 'wave', eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1470); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: dusk, cam: Shots.push(1.0, 1.06) },
    { at: A[1] - 0.15, draw: gaugeShot, in: 'whip', cam: Shots.push(1.0, 1.05) },
    { at: A[2] - 0.15, draw: watch, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[3] - 0.15, draw: leave, in: 'cut' },
    { at: A[4] - 0.15, draw: inspect, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[5] - 0.15, draw: leak, in: 'cut' },
    { at: A[6] - 0.15, draw: teardown, in: 'whip' },
    { at: A[7] - 0.15, draw: lateNight, in: 'paper', cam: Shots.push(1.0, 1.05) },
    { at: A[8] - 0.15, draw: talk, in: 'cut' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!、,?!])/).map((p) => p.replace(/[,。、,「」]/g, '').trim()).filter(Boolean);
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
