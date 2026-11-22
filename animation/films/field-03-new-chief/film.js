// 工程現場故事 第 3 集:新課長的第一個週一。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', BLUE = '#2B5FA8';
  const PIPE_Y = 960; // 牆上那一排管線
  let VO = null, SUBS = [];

  // ---------- 角色(與前兩集相同的造型;阿樹升課長後多一件反光背心) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const HELMET = '#E9853B';
  const P = (o) => ({ bottoms: 'pants', shoes: '#3A2E28', skin: SKIN, hair: '#241C1A', build: 'regular', ...o, shorts: o.pants });
  const TEAM = [ // 七位組員:髮型、體型、衣服顏色都不一樣
    P({ outfit: 'tee', shirt: '#5B8FD0', pants: '#3F4756', hairStyle: 'short' }),
    P({ outfit: 'shirt', shirt: '#E3A0B4', pants: '#4A4F5E', hairStyle: 'long', hair: '#3A2418', build: 'slim', skin: '#F4CDAE' }),
    P({ outfit: 'hoodie', shirt: '#7C6BB0', pants: '#3A3A44', hairStyle: 'buzz', build: 'heavy', skin: '#D9A77E' }),
    P({ outfit: 'tee', shirt: '#D9A441', pants: '#5A4A3C', hairStyle: 'curlytop', glasses: 'round', build: 'slim' }),
    P({ outfit: 'shirt', shirt: '#4FA3A8', pants: '#3F4756', hairStyle: 'ponytail', hair: '#5A3420', skin: '#EBC19A' }),
    P({ outfit: 'tee', shirt: '#D0605A', pants: '#4A4F5E', hairStyle: 'bald', facialHair: 'trimmed', build: 'broad', skin: '#E0AE84' }),
    P({ outfit: 'hoodie', shirt: '#8E99A3', pants: '#2E3A55', hairStyle: 'bun', hair: '#6B4A2E', glasses: 'square', skin: '#F0C8A4' }),
  ];
  const TEAM_SITE = TEAM.map((s) => ({ ...s, headwear: 'cap', headwearColor: HELMET })); // 工地:橘色安全帽
  const CAST = {
    shuChief: { ...SHU, vest: true },                                                   // 辦公室裡的新課長
    shuSite: { ...SHU, vest: true, headwear: 'cap', headwearColor: '#F2C230' },         // 工地:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },                   // 師傅:白色安全帽
    masterRest: MASTER,                                                                 // 休息區:帽子掛在牆上
    boss: { outfit: 'shirt', shirt: '#CFE0EE', bottoms: 'pants', shorts: '#2E3A55', pants: '#2E3A55', skin: '#EBC19A', hair: '#3A3432', hairStyle: 'short', glasses: 'square', build: 'regular', shoes: '#2A2220' }, // 主管:襯衫,不戴帽
  };
  globalThis.CAST = { ...CAST, t0: TEAM[0], t1: TEAM[1], t2: TEAM[2], t3: TEAM[3], t4: TEAM[4], t5: TEAM[5], t6: TEAM[6] };

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

  // 人物:style.vest 時,在軀幹畫完、手臂畫上去之前套一件反光背心
  const BW = { slim: 0.86, regular: 1, broad: 1.18, heavy: 1.3 };
  function vest(ctx, sh, hip, bw, seed) {
    for (const sd of [-1, 1]) G.poly(ctx, [[sd * 77 * bw, sh + 3], [sd * 28, sh + 3], [sd * 7, sh + 76], [sd * 7, hip + 9], [sd * 73 * bw, hip + 9]], { fill: '#F2772B', lw: 4, seed: seed + 900 + sd, step: 20 });
    for (const yy of [sh + 106, hip - 20]) for (const sd of [-1, 1]) G.line(ctx, [[sd * 12, yy], [sd * 69 * bw, yy]], { color: '#FBF3B4', lw: 12, seed: seed + 904 + sd + yy, amp: 0.4 });
    G.rrect(ctx, 22, sh + 44, 34, 24, 4, { fill: '#FFFFFF', lw: 2.5, seed: seed + 910 }); // 職稱牌
    G.line(ctx, [[28, sh + 56], [50, sh + 56]], { color: RED, lw: 4, seed: seed + 911, amp: 0.3 });
  }
  function person(ctx, o) {
    if (!(o.style && o.style.vest)) return Ch.person(ctx, o);
    const seed = o.seed == null ? 300 : o.seed, seated = (o.pose || 'sit') === 'sit', hip = seated ? 0 : -150, sh = hip - 172;
    const orig = G.poly;
    G.poly = function (c, pts, op) {
      const r = orig.apply(G, arguments);
      if (op && op.seed === seed + 9) { G.poly = orig; vest(c, sh, hip, BW[o.style.build] || 1, seed); }
      return r;
    };
    try { Ch.person(ctx, o); } finally { G.poly = orig; }
  }
  // 七個人排兩排(後排先畫)。回傳 [{k, x, y, s}]
  function zig(x0, dx, y, s) {
    const out = [];
    for (let i = 0; i < 3; i++) out.push({ k: 2 * i + 1, x: x0 + dx / 2 + i * dx, y: y - 124 * s, s: s * 0.94 });
    for (let i = 0; i < 4; i++) out.push({ k: 2 * i, x: x0 + i * dx, y, s });
    return out;
  }
  function team(ctx, t, slots, site, act) {
    for (const p of slots) {
      const a = act(p.k) || {};
      if (a.hide) continue;
      const sc = a.scale == null ? 1 : a.scale;
      Ch.person(ctx, { x: p.x, y: p.y, s: p.s * sc, sx: -1, pose: 'stand', style: (site ? TEAM_SITE : TEAM)[p.k], eyes: 'normal', mouth: 'smile', look: 0.6, blink: blink(t, p.k * 0.13), seed: 500 + p.k * 40, ...a, scale: undefined, hide: undefined });
    }
  }
  const onPhone = (t, k) => ({ gesture: 'phone', eyes: 'normal', mouth: k % 3 === 1 ? 'smile' : 'flat', look: 0.1, lookY: 1, headRot: 0.05 + 0.03 * Math.sin(t * 1.3 + k), headY: 6 });

  // ---------- 道具 ----------
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
  function clock(ctx, x, y, r, hour, t, seed) { // 掛鐘:只有刻度,指在整點
    G.ellipse(ctx, x, y, r, r, { fill: '#8A8F98', lw: 6, seed });
    G.ellipse(ctx, x, y, r * 0.84, r * 0.84, { fill: '#FFFDF4', lw: 4, seed: seed + 1 });
    for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; G.line(ctx, [[x + Math.cos(an) * r * 0.64, y + Math.sin(an) * r * 0.64], [x + Math.cos(an) * r * 0.76, y + Math.sin(an) * r * 0.76]], { color: INK, lw: k % 3 ? 4 : 8, seed: seed + 2 + k, amp: 0 }); }
    const hr = -Math.PI / 2 + hour * Math.PI / 6, mn = -Math.PI / 2;
    G.line(ctx, [[x, y], [x + Math.cos(hr) * r * 0.42, y + Math.sin(hr) * r * 0.42]], { color: INK, lw: 11, seed: seed + 20, amp: 0 });
    G.line(ctx, [[x, y], [x + Math.cos(mn) * r * 0.62, y + Math.sin(mn) * r * 0.62]], { color: INK, lw: 8, seed: seed + 21, amp: 0 });
    G.ellipse(ctx, x, y, 9, 9, { fill: RED, lw: 0, seed: seed + 22 });
  }
  function helmet(ctx, x, y, col, seed) { // 掛在牆上的安全帽
    G.line(ctx, [[x, y - 54], [x, y - 30]], { color: '#6C7680', lw: 8, seed });
    const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + Math.PI * k / 12; pts.push([x + Math.cos(a) * 52, y + Math.sin(a) * 46]); }
    G.shape(ctx, pts, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, x - 64, y - 6, 128, 16, 8, { fill: col, lw: 4, seed: seed + 2 });
  }
  function pawn(ctx, x, y, s, col, seed) { // 簡化的小人圖示
    G.rrect(ctx, x - 26 * s, y - 62 * s, 52 * s, 62 * s, 22 * s, { fill: col, lw: 4, seed });
    G.ellipse(ctx, x, y - 84 * s, 22 * s, 22 * s, { fill: col, lw: 4, seed: seed + 1 });
  }
  function steam(ctx, x, y, t, k, a = 0.6) {
    const u = (t * 0.6 + k * 0.37) % 1;
    G.line(ctx, [[x, y - u * 46], [x + Math.sin(t * 3 + k) * 7, y - 22 - u * 46], [x - Math.sin(t * 3 + k) * 5, y - 44 - u * 46]], { color: '#FFFFFF', lw: 5, seed: 880 + k, alpha: a * (1 - u) });
  }

  // ---------- 場景 ----------
  function officeDay(ctx) { // 與第 1 集同一間辦公室
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    G.rrect(ctx, 120, 420, 840, 420, 12, { fill: '#BFE3F0', lw: 6, seed: 201 });
    for (const vx of [400, 680]) G.line(ctx, [[vx, 426], [vx, 834]], { color: '#8FB7C7', lw: 8, seed: 202 + vx });
    for (let k = 0; k < 5; k++) G.rrect(ctx, 160 + k * 170, 700 - (k % 3) * 60, 110, 140 + (k % 3) * 60, 4, { fill: '#A9CBD8', lw: 0, seed: 205 + k, alpha: 0.7 }); // 窗外大樓
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
  }
  const SKY = { morning: ['#9FD3F0', '#E4F4FB'], night: ['#141A33', '#2B3566'] };
  const TINT = { morning: null, night: 'rgba(18,24,62,0.56)' };
  function fab(ctx, t, mode) { // 與前兩集同一座廠房
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#C9D3DB'], [1, '#E3E9EE']]));
    G.rrect(ctx, 390, 500, 300, 300, 12, { fill: '#8E99A3', lw: 6, seed: 370 });
    ctx.save(); ctx.beginPath(); ctx.rect(410, 520, 260, 260); ctx.clip();
    fillRect(ctx, 410, 520, 260, 260, lin(ctx, 0, 520, 0, 780, [[0, SKY[mode][0]], [1, SKY[mode][1]]]));
    if (mode === 'morning') { G.ellipse(ctx, 480, 590, 40, 40, { fill: '#FFF3B8', lw: 0, seed: 371 }); G.rrect(ctx, 540, 660, 120, 34, 17, { fill: '#FFFFFF', lw: 0, seed: 372, alpha: 0.9 }); }
    if (mode === 'night') {
      G.ellipse(ctx, 610, 600, 40, 40, { fill: '#F6F1D5', lw: 0, seed: 371 });
      for (let k = 0; k < 9; k++) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + k); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(420 + G.rnd(k, 3) * 240, 530 + G.rnd(k, 4) * 230, 3, 0, 7); ctx.fill(); ctx.restore(); }
    }
    ctx.restore();
    G.line(ctx, [[540, 520], [540, 780]], { color: '#8E99A3', lw: 10, seed: 373 });
    for (const cx of [130, 950]) G.rrect(ctx, cx - 36, 200, 72, 1100, 4, { fill: '#AEB9C3', lw: 5, seed: 301 + cx });
    G.rrect(ctx, -30, 214, W + 60, 36, 0, { fill: '#8E99A3', lw: 5, seed: 303 });
    [['#D9DEE3', 280], ['#F2C230', 326], ['#D9DEE3', 372], ['#6FA287', 418]].forEach(([c, y], k) => {
      G.rrect(ctx, -30, y, W + 60, 26, 12, { fill: c, lw: 4, seed: 310 + k });
      for (let j = 0; j < 4; j++) G.rrect(ctx, 200 + j * 240 + k * 20, y - 6, 16, 38, 3, { fill: '#6C7680', lw: 3, seed: 320 + k * 5 + j });
    });
    for (const hx of [300, 800]) G.line(ctx, [[hx, 250], [hx, 444]], { color: '#6C7680', lw: 5, seed: 340 + hx });
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B9C7C2'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 350);
    G.rrect(ctx, -30, GROUND + 120, W + 60, 22, 0, { fill: '#F2C230', lw: 0, seed: 360, alpha: 0.85 });
    G.rrect(ctx, 803, 440, 34, PIPE_Y - 440 + 17, 10, { fill: STEEL, lw: 4, seed: 380 });
    G.rrect(ctx, 796, 640, 48, 20, 4, { fill: '#8E99A3', lw: 4, seed: 381 });
    for (const px of [250, 470, 700]) G.rrect(ctx, px - 9, PIPE_Y + 14, 18, GROUND - PIPE_Y - 14, 3, { fill: '#8E99A3', lw: 4, seed: 382 + px });
    pipeSeg(ctx, -30, 180, PIPE_Y, 34, 385); pipeSeg(ctx, 180, 400, PIPE_Y, 34, 386); pipeSeg(ctx, 400, 640, PIPE_Y, 34, 387); pipeSeg(ctx, 640, 830, PIPE_Y, 34, 388, { flanges: false });
    if (TINT[mode]) fillRect(ctx, -200, -200, W + 400, H + 400, TINT[mode]);
  }
  function restArea(ctx, t) { // 休息區:不是施工現場
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#F3E6CB'], [1, '#EAD7B4']]));
    G.rrect(ctx, -30, 1010, W + 60, 300, 0, { fill: '#D2B58A', lw: 5, seed: 601 }); // 腰板
    for (let k = 0; k < 8; k++) G.line(ctx, [[60 + k * 140, 1016], [60 + k * 140, 1296]], { color: '#B0946A', lw: 3, seed: 602 + k, alpha: 0.6 });
    G.rrect(ctx, 410, 470, 270, 290, 12, { fill: '#B98A5E', lw: 6, seed: 611 }); // 窗
    fillRect(ctx, 428, 488, 234, 254, lin(ctx, 0, 488, 0, 742, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    G.ellipse(ctx, 610, 700, 70, 52, { fill: '#8FC49A', lw: 0, seed: 612 }); G.ellipse(ctx, 500, 720, 60, 40, { fill: '#A5D3A6', lw: 0, seed: 613 });
    G.line(ctx, [[545, 488], [545, 742]], { color: '#B98A5E', lw: 9, seed: 614 });
    G.rrect(ctx, 404, 754, 282, 18, 4, { fill: '#B98A5E', lw: 4, seed: 615 });
    ctx.save(); ctx.translate(272, 440); ctx.rotate(-0.02); // 牌子
    G.tornPaper(ctx, -118, -52, 236, 100, { fill: '#FFFDF4', seed: 620 });
    G.decor(() => label(ctx, '休息區', 0, 22, 60, INK));
    ctx.restore();
    helmet(ctx, 770, 560, '#F4F4F0', 630); helmet(ctx, 880, 560, '#F2C230', 640); // 帽子掛在牆上
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B98A5E'], [1, '#8E6444']]));
    floorLines(ctx, '#6E4C34', 650);
  }
  const TABLE_Y = 1085, CUP_X = (k) => 512 + k * 60;
  function stool(ctx, x) { G.rrect(ctx, x - 66, 1072, 132, 26, 8, { fill: '#8E6444', lw: 4, seed: 660 + x }); for (const sd of [-1, 1]) G.rrect(ctx, x + sd * 48 - 9, 1096, 18, 206, 3, { fill: '#7A553A', lw: 4, seed: 662 + x + sd }); }
  function teaTable(ctx, t, { potLid = true, filled = () => 0 } = {}) {
    for (const lx of [176, 876]) G.rrect(ctx, lx, TABLE_Y + 30, 30, GROUND - TABLE_Y - 26, 4, { fill: '#8E6444', lw: 4, seed: 670 + lx });
    G.rrect(ctx, 140, TABLE_Y, 800, 40, 8, { fill: '#B98A5E', lw: 6, seed: 672 });
    // 茶壺
    const px = 425, py = TABLE_Y;
    G.ellipse(ctx, px - 52, py - 40, 18, 22, { fill: 'rgba(0,0,0,0)', stroke: '#6E3A26', lw: 9, seed: 675 });
    G.poly(ctx, [[px + 36, py - 34], [px + 74, py - 66], [px + 82, py - 58], [px + 46, py - 18]], { fill: '#8A4B32', lw: 4, seed: 676 });
    G.ellipse(ctx, px, py - 40, 50, 40, { fill: '#8A4B32', lw: 5, seed: 677 });
    if (potLid) { G.ellipse(ctx, px, py - 78, 30, 9, { fill: '#6E3A26', lw: 4, seed: 678 }); G.ellipse(ctx, px, py - 90, 8, 8, { fill: '#6E3A26', lw: 3, seed: 679 }); }
    else { G.ellipse(ctx, px, py - 78, 30, 8, { fill: '#3A2A20', lw: 4, seed: 678 }); G.ellipse(ctx, px - 92, py - 8, 30, 9, { fill: '#6E3A26', lw: 4, seed: 680 }); G.ellipse(ctx, px - 92, py - 20, 8, 8, { fill: '#6E3A26', lw: 3, seed: 681 }); }
    // 茶盤與七個杯子
    G.rrect(ctx, 474, TABLE_Y - 16, 436, 18, 6, { fill: '#6E4C34', lw: 4, seed: 684 });
    for (let k = 0; k < 7; k++) {
      const f = filled(k), x = CUP_X(k), hop = f > 0 && f < 1 ? Math.sin(Math.PI * f) * 14 : 0, y = TABLE_Y - 16 - hop;
      G.poly(ctx, [[x - 23, y - 44], [x + 23, y - 44], [x + 17, y], [x - 17, y]], { fill: '#FFFDF4', lw: 4, seed: 690 + k, amp: 0.5 });
      G.ellipse(ctx, x, y - 44, 22, 7, { fill: f > 0 ? '#C98A3A' : '#E9E2D0', lw: 3, seed: 700 + k, amp: 0.4 });
      if (f >= 1) { steam(ctx, x - 5, y - 54, t, k, 0.75); }
    }
  }
  function kettle(ctx, x, y, rot) { // 以提把為原點
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    G.line(ctx, [[-34, 26], [-30, -2], [30, -2], [34, 26]], { color: '#3A3A44', lw: 9, seed: 710 });
    G.poly(ctx, [[-40, 46], [-78, 30], [-74, 20], [-38, 28]], { fill: '#AEB9C3', lw: 4, seed: 711 });
    G.rrect(ctx, -44, 22, 88, 76, 18, { fill: '#AEB9C3', lw: 5, seed: 712 });
    G.line(ctx, [[-30, 38], [30, 38]], { color: '#FFFFFF', lw: 5, seed: 713, alpha: 0.7 });
    ctx.restore();
  }

  // ---------- 每一幕 ----------
  function lineup(ctx, t) { // 0:阿樹升課長,底下帶七個人
    officeDay(ctx);
    const on = t >= ev.vest, n = ev.row.filter((r) => t >= r).length, all = t >= ev.row[6] + 0.35;
    team(ctx, t, zig(420, 148, 1368, 0.52), false, (k) => t < ev.row[k] ? { hide: true } : { scale: popIn(t, ev.row[k], 0.25), mouth: all ? 'smile' : 'flat', look: 0.7 });
    person(ctx, { x: 228, y: 1330, s: 1.1, pose: 'stand', style: on ? CAST.shuChief : SHU, gesture: n ? (all ? 'akimbo' : undefined) : on ? 'thumbsUp' : undefined, eyes: 'happy', mouth: 'grin', brows: 'up', look: n ? 0.8 : 0.2, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    if (on) {
      const a = popIn(t, ev.vest, 0.3);
      for (let k = 0; k < 4; k++) { const o = clamp(1.5 - (t - ev.vest) * 1.1); if (o > 0) { ctx.save(); ctx.globalAlpha = o; G.star(ctx, 228 + [-110, 108, -90, 96][k], 1000 + [0, -60, 150, 190][k], 22 * a, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 30 + k }); ctx.restore(); } }
      ctx.save(); ctx.translate(244, 690); ctx.rotate(-0.04); ctx.scale(a, a);
      G.tornPaper(ctx, -106, -62, 212, 112, { fill: '#FFFDF4', seed: 420 });
      G.decor(() => label(ctx, '課長', 0, 26, 76, RED));
      ctx.restore();
    }
    if (n) {
      const b = popIn(t, ev.row[n - 1], 0.18);
      ctx.save(); ctx.translate(630, 930); ctx.scale(0.85 + 0.15 * b, 0.85 + 0.15 * b);
      G.decor(() => label(ctx, n + ' 人', 0, 0, 104, INK, { stroke: '#FFFFFF', strokeW: 20 }));
      ctx.restore();
    }
    finish(ctx);
  }
  function incident(ctx, t) { // 1:現場出狀況,他自己衝下去;七個人在旁邊滑手機
    fab(ctx, t, 'morning');
    const LX = 605, LY = PIPE_Y;
    const alarm = t >= ev.alarm, running = t >= ev.run, hits = ev.clanks.filter((c) => t >= c).length;
    const AX = 786, AY = 1425, AS = 1.05, tArr = ev.run + 1.35, arrived = t >= tArr;
    const flow = alarm ? [1, 0.8, 0.45, 0][hits] : 0;
    if (alarm) { // 警示燈閃
      const fl = 0.5 + 0.5 * Math.sin((t - ev.alarm) * 14);
      if (flow > 0) fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(200,69,47,${0.10 * fl * flow})`);
    }
    // 七個人:出事時抬頭看一眼,然後繼續滑手機
    const glance = alarm && t < ev.alarm + 1.25;
    team(ctx, t, zig(176, 138, 1385, 0.5), true, (k) => glance ? { eyes: 'wide', mouth: 'o', brows: 'up', look: -0.9, lookY: -0.3, gesture: k % 2 ? 'phone' : undefined } : alarm || t > A[1] + 0.2 + k * 0.12 ? onPhone(t, k) : { mouth: 'flat', look: -0.3 });
    // 噴水
    if (flow > 0) {
      const dt = t - ev.alarm, grow = clamp(dt / 0.3) * flow;
      for (let k = 0; k < 16; k++) {
        const p = (dt * 1.5 + k / 16) % 1, an = -Math.PI / 2 + (G.rnd(k, 11) - 0.5) * 1.9, r = p * (150 + G.rnd(k, 12) * 130) * grow;
        const x = LX + Math.cos(an) * r, y = LY - 18 + Math.sin(an) * r + p * p * 150;
        ctx.save(); ctx.globalAlpha = 0.9 * (1 - p * 0.7); G.ellipse(ctx, x, y, 9 + 5 * G.rnd(k, 13), 12 + 6 * G.rnd(k, 14), { fill: '#6FC1EE', lw: 3, seed: 730 + k, amp: 0.4 }); ctx.restore();
      }
      const a = popIn(t, ev.alarm, 0.25); // 驚嘆號
      ctx.save(); ctx.translate(LX, 640); ctx.scale(a, a); ctx.rotate(Math.sin(t * 16) * 0.05);
      G.poly(ctx, [[0, -96], [98, 70], [-98, 70]], { fill: '#F2C230', lw: 7, seed: 750 });
      G.rrect(ctx, -11, -44, 22, 66, 8, { fill: INK, lw: 0, seed: 751 }); G.ellipse(ctx, 0, 44, 13, 13, { fill: INK, lw: 0, seed: 752 });
      ctx.restore();
    }
    G.rrect(ctx, LX - 16, LY - 30, 32, 60, 5, { fill: hits >= 3 ? '#C9A24A' : '#8E99A3', lw: 4, seed: 760 }); // 接頭
    if (hits >= 3) for (let k = 0; k < 3; k++) { const b = popIn(t, ev.clanks[2] + k * 0.08, 0.2); G.star(ctx, LX - 46 + k * 46, LY - 70 - (k % 2) * 26, 20 * b, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 60 + k }); }
    // 阿樹
    if (running && !arrived) {
      const wk = Ch.walk(t, { x0: -70, speed: (AX + 70) / 1.35, t0: ev.run, stride: 400, s: AS });
      for (let k = 0; k < 3; k++) G.line(ctx, [[wk.x - 150 - k * 30, AY - 420 + k * 130], [wk.x - 250 - k * 40, AY - 420 + k * 130]], { color: '#FFFFFF', lw: 9, seed: 770 + k, alpha: 0.8 });
      person(ctx, { ...wk, y: AY, s: AS, rot: 0.1, style: CAST.shuSite, eyes: 'normal', mouth: 'o', brows: 'determined', look: 0.9, sweat: 0.6, blush: 0.6, seed: 400 });
    } else if (arrived) {
      const fixed = hits >= 3 && t >= ev.clanks[2] + 0.25;
      const wob = fixed ? 0 : Math.sin(t * 11) * 14, wx = LX + 26, wy = LY + 16 + wob;
      person(ctx, { x: AX, y: AY, s: AS, pose: 'stand', style: CAST.shuSite, handL: hand(AX, AY, AS, 1, wx, wy),
        eyes: 'normal', mouth: fixed ? 'grin' : 'flat', brows: 'determined', look: -0.8, lookY: -0.2, sweat: 1, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
      wrench(ctx, wx - 4, wy - 6, -0.7 + wob * 0.025, 1.1);
      for (const c of ev.clanks) { const q = t - c; if (q >= 0 && q < 0.25) for (let j = 0; j < 6; j++) { const an = j * Math.PI / 3 + 0.3, r0 = 34 + q * 130, r1 = r0 + 30; G.line(ctx, [[LX + Math.cos(an) * r0, LY + Math.sin(an) * r0], [LX + Math.cos(an) * r1, LY + Math.sin(an) * r1]], { color: RED, lw: 8, seed: 780 + j, alpha: 1 - q / 0.25 }); } }
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function night8(ctx, t) { // 2:忙到晚上八點,覺得自己很負責
    fab(ctx, t, 'night');
    fillRect(ctx, -200, 300, W + 400, 1500, rad(ctx, 420, 900, 30, 820, [[0, 'rgba(255,214,140,0.42)'], [1, 'rgba(255,214,140,0)']]));
    const proud = t >= ev.proud;
    const px = 395, py = 1385, s = 1.6, sag = proud ? 0 : Math.sin(t * 2.4) * 5;
    person(ctx, { x: px, y: py + sag * 0.4, s, pose: 'stand', style: CAST.shuSite, gesture: proud ? 'thumbsUp' : undefined, handR: proud ? undefined : [34 + Math.sin(t * 5) * 12, -322 - 108],
      eyes: proud ? 'happy' : 'closed', mouth: proud ? 'grin' : 'o', brows: proud ? 'up' : 'worried', headRot: proud ? 0.03 : -0.07, sweat: 1, blush: 0.75, blink: 0, seed: 400 });
    if (t >= ev.eight) { // 牆上的鐘:八點整
      const a = popIn(t, ev.eight, 0.3), ring = clamp(1 - (t - ev.eight) / 0.7);
      ctx.save(); ctx.translate(768, 590); ctx.scale(a, a); ctx.rotate(Math.sin(t * 40) * 0.04 * ring);
      clock(ctx, 0, 0, 112, 8, t, 800);
      ctx.restore();
      ctx.save(); ctx.translate(768, 775); ctx.rotate(0.02); ctx.scale(a, a);
      G.tornPaper(ctx, -112, -48, 224, 92, { fill: '#FFFDF4', seed: 830 });
      G.decor(() => label(ctx, '晚上八點', 0, 20, 50, INK));
      ctx.restore();
    }
    if (proud) for (let k = 0; k < 3; k++) { const b = popIn(t, ev.proud + k * 0.1, 0.25); G.star(ctx, 610 + k * 40, 1010 + (k % 2) * 60, 22 * b, { fill: '#FFF2A8', rot: t + k, seed: 60 + k }); }
    finish(ctx, 'rgba(150,190,255,0.10)');
  }
  function bossDesk(ctx) {
    G.rrect(ctx, 560, 1118, 420, 40, 8, { fill: '#B98A5E', lw: 6, seed: 120 });
    G.rrect(ctx, 580, 1158, 380, 150, 4, { fill: '#8E6444', lw: 5, seed: 121 });
    G.rrect(ctx, 820, 1040, 96, 80, 6, { fill: '#FFFDF4', lw: 4, seed: 123 }); // 文件
    for (let k = 0; k < 3; k++) G.line(ctx, [[834, 1062 + k * 18], [902, 1062 + k * 18]], { color: '#B8AE9A', lw: 4, seed: 124 + k });
  }
  function bossOffice(ctx, t) { // 3:隔天,主管只問一個問題
    officeDay(ctx);
    const one = t >= ev.one;
    person(ctx, { x: 300, y: GROUND, s: 1.35, pose: 'stand', style: CAST.shuChief, gesture: one ? undefined : 'akimbo', eyes: one ? 'normal' : 'happy', mouth: one ? 'smile' : 'grin', brows: 'up', look: 0.8, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    Ch.person(ctx, { x: 745, y: GROUND, s: 1.38, sx: -1, pose: 'stand', style: CAST.boss, gesture: one ? 'pointUp' : undefined, eyes: 'normal', mouth: 'flat', brows: 'neutral', look: 0.8, blink: blink(t, 0.5), seed: 460 });
    bossDesk(ctx);
    if (one) {
      const a = popIn(t, ev.one, 0.3);
      ctx.save(); ctx.translate(500, 640); ctx.scale(a, a); ctx.rotate(-0.06 + Math.sin(t * 5) * 0.03);
      G.decor(() => label(ctx, '?', 0, 60, 190, RED, { stroke: '#FFFFFF', strokeW: 26 }));
      ctx.restore();
    }
    finish(ctx);
  }
  function bossAsk(ctx, t) { // 4:「昨天,你那七個人在做什麼?」
    officeDay(ctx);
    const m = mouthOf('boss', t);
    Ch.person(ctx, { x: 540, y: 1900, s: 2.05, pose: 'stand', style: CAST.boss, handR: [150, -322 + 70 + Math.sin(t * 4) * 8], eyes: 'normal', mouth: m || 'flat', brows: 'up', look: 0, headRot: Math.sin(t * 2.2) * 0.025, blink: blink(t, 0.5), seed: 460, shadow: false });
    // 對話框:七個人?
    const a = popIn(t, ev.ask + 0.15, 0.3);
    ctx.save(); ctx.translate(540, 590); ctx.scale(a, a);
    G.poly(ctx, [[-40, 150], [50, 150], [0, 228]], { fill: '#FFFFFF', lw: 6, seed: 470 });
    G.rrect(ctx, -385, -200, 770, 370, 60, { fill: '#FFFFFF', lw: 6, seed: 471 });
    fillRect(ctx, -34, 140, 78, 24, '#FFFFFF');
    for (let k = 0; k < 7; k++) { const b = popIn(t, ev.icons[k], 0.2); if (t >= ev.icons[k]) pawn(ctx, -288 + k * 96, 120, 1.0 * b, t >= ev.icons[6] + 0.3 ? '#9AA3AD' : '#7FA7C9', 480 + k * 3); }
    if (t >= ev.icons[6] + 0.3) { const b = popIn(t, ev.icons[6] + 0.3, 0.25); ctx.save(); ctx.translate(0, -80); ctx.scale(b, b); ctx.rotate(Math.sin(t * 5) * 0.04); G.decor(() => label(ctx, '?', 0, 40, 130, RED)); ctx.restore(); }
    ctx.restore();
    finish(ctx);
  }
  function frozen(ctx, t) { // 5:阿樹答不出來,腦中重播:七個人在旁邊滑手機
    officeDay(ctx);
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(60,90,150,0.22)');
    const on = t >= ev.freeze, sh = on ? Math.sin(t * 46) * 2.5 : 0;
    person(ctx, { x: 540 + sh, y: 1900, s: 2.05, pose: 'stand', style: CAST.shuChief, eyes: 'wide', mouth: on ? 'wavy' : 'o', brows: 'worried', look: 0, lookY: on ? -0.5 : 0, sweat: 1, blush: 0.3, blink: 0, seed: 400, shadow: false });
    if (on) {
      const a = popIn(t, ev.freeze, 0.3);
      for (let k = 0; k < 3; k++) { const b = popIn(t, ev.freeze + 0.05 * k, 0.2); G.ellipse(ctx, 420 - k * 26, 905 - k * 44, (12 + k * 8) * b, (10 + k * 7) * b, { fill: '#FFFFFF', lw: 5, seed: 560 + k }); }
      ctx.save(); ctx.translate(520, 590); ctx.scale(a, a); ctx.translate(-520, -590);
      G.rrect(ctx, 140, 395, 760, 390, 110, { fill: '#FFFFFF', lw: 6, seed: 565 });
      ctx.save(); ctx.beginPath(); G.path(ctx, G.rrPts(150, 405, 740, 370, 100, 20), true); ctx.clip();
      fillRect(ctx, 140, 395, 760, 390, lin(ctx, 0, 395, 0, 785, [[0, '#D5DDE4'], [1, '#E6ECF0']]));
      fillRect(ctx, 140, 700, 760, 100, '#B9C7C2');
      G.line(ctx, [[140, 700], [900, 700]], { color: '#6C7A75', lw: 4, seed: 566 });
      pipeSeg(ctx, 120, 920, 470, 22, 567, { flanges: false });
      team(ctx, t, [0, 1, 2, 3, 4, 5, 6].map((k) => ({ k, x: 232 + k * 96, y: 756 + (k % 2) * 8, s: 0.37 })), true, (k) => ({ ...onPhone(t, k), shadow: false }));
      ctx.restore();
      ctx.restore();
    }
    finish(ctx, 'rgba(150,190,255,0.10)');
  }
  function teaScene(ctx, t, talkShot) { // 6–7:休息區,師傅泡茶
    restArea(ctx, t);
    stool(ctx, 285); stool(ctx, 770);
    const M = [285, 1070, 1.35], Sx = [770, 1070, 1.3];
    const m = talkShot ? mouthOf('master', t) : null;
    const pouring = !talkShot && t >= ev.pour, tilt = talkShot ? 0 : ease.inOutCubic(clamp((t - ev.pour) / 0.35));
    const kx = lerp(505, 492, tilt), ky = lerp(905, 925, tilt);
    const nCup = ev.cups.filter((c) => t >= c).length, allCups = t >= ev.cups[6] + 0.4, second = talkShot && t >= ev.cups[0] - 0.9;
    const gest = Math.sin(t * 3.2) * 10;
    Ch.person(ctx, { x: M[0], y: M[1], s: M[2], pose: 'sit', style: CAST.masterRest,
      handR: talkShot ? (second ? hand(M[0], M[1], M[2], 1, 470 + Math.min(nCup, 3) * 8, 960 + gest * 0.5) : hand(M[0], M[1], M[2], 1, 440, 930 + gest)) : hand(M[0], M[1], M[2], 1, kx, ky),
      eyes: talkShot ? (allCups ? 'happy' : 'normal') : 'normal', mouth: m || 'smile', brows: 'neutral', look: talkShot ? 0.8 : 0.5, lookY: talkShot ? 0 : 0.8, headRot: talkShot ? 0.04 : 0.02, blink: blink(t, 0.6), blush: 0.4, seed: 440, shadow: false });
    const rant = !talkShot, yak = Math.floor(t * 6) % 2, got = talkShot && allCups;
    person(ctx, { x: Sx[0], y: Sx[1], s: Sx[2], sx: -1, pose: 'sit', style: CAST.shuChief,
      handL: rant ? [-120, -172 + 60 + Math.sin(t * 7) * 14] : undefined, handR: rant ? [120, -172 + 60 + Math.sin(t * 7 + 1.4) * 14] : undefined,
      eyes: rant ? 'normal' : got ? 'happy' : second ? 'wide' : 'normal', mouth: rant ? (yak ? 'o' : 'wavy') : got ? 'smile' : second ? 'o' : 'flat', brows: rant ? 'worried' : second ? 'up' : 'worried',
      look: 0.8, lookY: second && !got ? 0.6 : 0, headRot: rant ? 0.08 + Math.sin(t * 7) * 0.03 : 0.03, sweat: rant ? 0.8 : 0, blush: 0.6, blink: blink(t, 0.2), seed: 400, shadow: false });
    teaTable(ctx, t, { potLid: talkShot, filled: (k) => talkShot ? clamp((t - ev.cups[k]) / 0.28) : 0 });
    if (!talkShot) { // 手上的熱水壺
      kettle(ctx, kx, ky, -0.5 * tilt);
      if (pouring && tilt > 0.6) {
        const sx0 = kx - 44, sy0 = ky + 56;
        G.line(ctx, [[sx0, sy0], [sx0 - 14, sy0 + 26], [427, 1006]], { color: '#BFE6F7', lw: 9, seed: 720, amp: 0.8 });
        for (let k = 0; k < 3; k++) steam(ctx, 400 + k * 26, 1000, t, k, 0.8);
      }
    } else { kettle(ctx, 214, TABLE_Y - 100, 0); for (let k = 0; k < 2; k++) steam(ctx, 470 + k * 14, TABLE_Y - 74, t, k + 4, 0.6); }
    finish(ctx, 'rgba(255,200,120,0.20)');
  }
  const tea = (ctx, t) => teaScene(ctx, t, false);
  function teaTalk(ctx, t, s) { // 7:師傅那一句話(推近)
    const z = lerp(1.03, 1.08, s.u);
    ctx.save(); ctx.translate(540, 980); ctx.scale(z, z); ctx.translate(-540, -980);
    teaScene(ctx, t, true);
    ctx.restore();
  }
  const ROWS = [['工程師 A', '圖面審查'], ['工程師 B', '材料盤點'], ['工程師 C', '現場勘查'], ['工程師 D', '估價資料'], ['工程師 E', '教育訓練'], ['工程師 F', '缺失追蹤'], ['工程師 G', '週報彙整']];
  function board(ctx, t) { // 8:每個週一早上,先排好七個人這一週要交什麼
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
    const BX = 318, BY = 372, BWd = 600, BH = 742, RH = 86, R0 = BY + 128;
    G.rrect(ctx, BX - 14, BY - 14, BWd + 28, BH + 28, 14, { fill: '#8E99A3', lw: 6, seed: 840 });
    G.rrect(ctx, BX, BY, BWd, BH, 6, { fill: '#FFFFFF', lw: 4, seed: 841 });
    G.rrect(ctx, BX + 120, BY + BH + 14, 360, 20, 6, { fill: '#6C7680', lw: 4, seed: 842 });
    for (let k = 0; k < 3; k++) G.rrect(ctx, BX + 150 + k * 70, BY + BH + 2, 52, 14, 5, { fill: [BLUE, RED, GREEN][k], lw: 3, seed: 843 + k });
    const n = ev.ticks.filter((c) => t >= c).length, all = t >= ev.ticks[6] + 0.55;
    G.decor(() => {
      fillRect(ctx, BX + 3, BY + 3, BWd - 6, 100, '#F2C230');
      label(ctx, '週一早上 · 本週交付', BX + BWd / 2, BY + 70, 52, INK);
      ROWS.forEach(([name, task], k) => {
        const y = R0 + k * RH, base = y + 56, tt = ev.ticks[k];
        if (k % 2 === 0) fillRect(ctx, BX + 3, y, BWd - 6, RH, 'rgba(120,150,180,0.10)');
        G.line(ctx, [[BX + 10, y + RH], [BX + BWd - 10, y + RH]], { color: '#C5CED6', lw: 3, seed: 850 + k, amp: 0.3 });
        G.text(ctx, name, BX + 22, base, { size: 45, fam: CJK, weight: 800, color: INK, boil: 0 });
        if (t >= tt) {
          const w = clamp((t - tt) / 0.3);
          ctx.save(); ctx.beginPath(); ctx.rect(BX + 250, y, 230 * w, RH); ctx.clip();
          G.text(ctx, task, BX + 256, base, { size: 47, fam: CJK, weight: 800, color: BLUE, boil: 0 });
          ctx.restore();
          const a = popIn(t, tt + 0.32, 0.22);
          if (a > 0) { ctx.save(); ctx.translate(BX + 532, y + 42); ctx.scale(a, a); G.ellipse(ctx, 0, 0, 30, 30, { fill: GREEN, lw: 3, seed: 860 + k, amp: 0.4 }); G.line(ctx, [[-15, 0], [-4, 12], [16, -12]], { color: '#FFFFFF', lw: 8, seed: 870 + k, amp: 0.3 }); ctx.restore(); }
        } else {
          ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = '#B7C0C8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(BX + 256, base + 8); ctx.lineTo(BX + 450, base + 8); ctx.stroke(); ctx.restore();
          G.ellipse(ctx, BX + 532, y + 42, 28, 28, { fill: '#FFFFFF', stroke: '#B7C0C8', lw: 4, seed: 860 + k, amp: 0.4 });
        }
      });
    });
    // 阿樹拿著白板筆
    const px = 204, py = GROUND, s = 0.98, row = Math.min(n, 6), writing = !all && n < 7 && t >= ev.ticks[0] - 0.3;
    const hy = clamp(R0 + row * RH + 40, 930, 1010) + (writing ? Math.sin(t * 16) * 5 : 0);
    person(ctx, { x: px, y: py, s, pose: 'stand', style: CAST.shuChief, gesture: all ? 'thumbsUp' : undefined, handR: all ? undefined : hand(px, py, s, 1, 298, hy),
      eyes: all ? 'happy' : 'normal', mouth: all ? 'grin' : 'smile', brows: all ? 'up' : 'determined', look: all ? 0.3 : 0.9, lookY: all ? 0 : -0.3, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    if (!all) { ctx.save(); ctx.translate(298, hy - 6); ctx.rotate(0.9); G.rrect(ctx, -6, -34, 12, 44, 4, { fill: BLUE, lw: 3, seed: 880 }); ctx.restore(); }
    finish(ctx);
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, A[9] + 0.1, 0.4);
    ctx.save(); ctx.translate(506, SAFE.y + 310); ctx.rotate(-0.015); ctx.scale(a, a);
    G.tornPaper(ctx, -420, -200, 840, 420, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '主管不是做最多事的人', 0, -52, 72, INK);
      G.line(ctx, [[-340, 0], [340, 0]], { color: '#D8CDB4', lw: 4, seed: 802 });
      label(ctx, '是讓事情不會只靠一個人的人', 0, 110, 55, RED);
    });
    ctx.restore();
    team(ctx, t, zig(378, 118, 1385, 0.45), true, (k) => ({ gesture: k % 2 ? 'cheer' : 'thumbsUp', eyes: 'happy', mouth: 'grin', look: 0, sx: 1 }));
    Ch.person(ctx, { x: 212, y: GROUND + 72, s: 0.98, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    person(ctx, { x: 842, y: GROUND + 72, s: 0.95, sx: -1, pose: 'stand', style: CAST.shuSite, gesture: 'wave', eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1470); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: lineup, cam: Shots.push(1.0, 1.05) },
    { at: A[1] - 0.15, draw: incident, in: 'whip' },
    { at: A[2] - 0.15, draw: night8, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[3] - 0.15, draw: bossOffice, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[4] - 0.15, draw: bossAsk, in: 'cut' },
    { at: A[5] - 0.15, draw: frozen, in: 'cut' },
    { at: A[6] - 0.15, draw: tea, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[7] - 0.15, draw: teaTalk, in: 'cut' },
    { at: A[8] - 0.15, draw: board, in: 'whip' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配(太長的短句在 CUT 指定的位置再切一次)
  const CUT = { '隔天主管只問他一個問題': 4, '先排好七個人這一週要交什麼': 6 };
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!、,?!])/).map((p) => p.replace(/[,。、,「」]/g, '').trim()).filter(Boolean)
        .flatMap((p) => CUT[p] ? [p.slice(0, CUT[p]), p.slice(CUT[p])] : [p]);
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
