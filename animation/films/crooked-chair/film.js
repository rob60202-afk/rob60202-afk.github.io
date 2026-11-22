// 歪椅子:每一格都是時間 t 的純函式。角色對嘴讀 out/voice.json,字幕由旁白逐句切出。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20';
  let VO = null, SUBS = [];

  // ---------- 角色 ----------
  const SKIN = '#F0C29C';
  const CAST = {
    boy: { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'shorts', shorts: '#4F6FA0', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' },
    man: { outfit: 'shirt', shirt: '#4F6FA0', bottoms: 'pants', shorts: '#4A4038', pants: '#4A4038', skin: SKIN, hair: '#241C1A', hairStyle: 'short', build: 'regular', shoes: '#3A2E28' },
    master: { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' },
    guestA: { outfit: 'dress', shirt: '#E8718D', skin: SKIN, hair: '#4A2E22', hairStyle: 'bun', shoes: '#F4F1EA' },
    guestB: { outfit: 'hoodie', shirt: '#F2B84B', bottoms: 'pants', shorts: '#3A3A44', pants: '#3A3A44', skin: '#DDA57C', hair: '#241C1A', hairStyle: 'buzz', build: 'heavy' },
  };
  globalThis.CAST = CAST;

  // ---------- 小工具 ----------
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, u) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const label = (ctx, str, x, y, size, color = '#3A2A20', o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });

  // 椅子:原點在地面中央;crooked 時右前腳短一截,整張椅子往右歪
  const SEAT = 170;
  function chair(ctx, x, y, s, rock = 0, { crooked = true, col = '#C98F5A', seed = 40 } = {}) {
    const dark = Ch.shade(col, 0.78);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rock); ctx.scale(s, s);
    for (const px of [-74, 56]) G.rrect(ctx, px, -340, 18, 340, 5, { fill: dark, lw: 4, seed: seed + px });
    G.rrect(ctx, -80, -335, 160, 44, 10, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, -80, -268, 160, 30, 8, { fill: col, lw: 4, seed: seed + 2 });
    G.rrect(ctx, -92, -146, 20, 146, 5, { fill: col, lw: 4, seed: seed + 3 });
    G.rrect(ctx, 72, -146, 20, crooked ? 118 : 146, 5, { fill: col, lw: 4, seed: seed + 4 });
    G.rrect(ctx, -100, -SEAT, 200, 30, 8, { fill: col, lw: 4, seed: seed + 5, hatch: { color: 'rgba(90,50,20,0.18)', gap: 10 } });
    ctx.restore();
  }
  const chairRest = 0.075; // 歪椅子靜止時的傾斜角

  // ---------- 畫面質感:漸層、光影、粒子 ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fillRect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const lumOf = (c) => hex(c).reduce((a, v) => a + v, 0) / 765;
  function cloud(ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF';
    for (const [dx, dy, r] of [[0, 0, 60], [70, -20, 76], [150, 0, 62], [75, 22, 70]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, r * s, r * 0.62 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function plant(ctx, x, y, s, seed) { // 盆栽
    const sway = Math.sin(G.t * 1.6 + seed) * 0.04;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let k = 0; k < 7; k++) { ctx.save(); ctx.rotate(-1.0 + k * 0.33 + sway); G.ellipse(ctx, 0, -118, 24, 78, { fill: k % 2 ? '#6FA35E' : '#4F8A4C', lw: 4, seed: seed + k }); ctx.restore(); }
    G.poly(ctx, [[-58, -70], [58, -70], [44, 0], [-44, 0]], { fill: '#C96F4A', lw: 5, seed: seed + 9 });
    G.rrect(ctx, -66, -86, 132, 24, 8, { fill: '#B25C3A', lw: 5, seed: seed + 10 });
    ctx.restore();
  }
  function motes(ctx, t, n, box, col) { // 光裡飄的木屑、灰塵
    for (let i = 0; i < n; i++) {
      const u = (G.rnd(i, 1) + t * (0.02 + 0.03 * G.rnd(i, 2))) % 1;
      const x = box[0] + G.rnd(i, 3) * box[2] + Math.sin(t * 0.8 + i) * 22, y = box[1] + (1 - u) * box[3];
      ctx.save(); ctx.globalAlpha = 0.55 * Math.sin(Math.PI * u); ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 3 + 4 * G.rnd(i, 4), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  function finish(ctx, warm = 'rgba(255,214,140,0.20)') { // 每一幕最後的整體光感:左上暖光、下方壓暗
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fillRect(ctx, -200, 1250, W + 400, 900, lin(ctx, 0, 1250, 0, 1900, [[0, 'rgba(70,40,20,0)'], [1, 'rgba(70,40,20,0.30)']]));
  }

  // ---------- 場景背景 ----------
  function workshop(ctx) {
    const t = G.t;
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#F8ECD4'], [1, '#EBD3A4']]));
    // 下半牆的木板
    G.rrect(ctx, -30, 1010, W + 60, 300, 0, { fill: '#DDBB86', lw: 5, seed: 230 });
    for (let k = 0; k < 13; k++) G.line(ctx, [[40 + k * 90, 1016], [40 + k * 90, 1296]], { color: '#A8754A', lw: 3, seed: 231 + k, alpha: 0.55 });
    G.rrect(ctx, -30, 996, W + 60, 22, 4, { fill: '#B98A5E', lw: 4, seed: 229 });
    // 窗戶:外面有山和太陽
    G.rrect(ctx, 596, 400, 368, 372, 14, { fill: '#8E6444', lw: 6, seed: 200 });
    ctx.save(); ctx.beginPath(); ctx.rect(620, 424, 320, 324); ctx.clip();
    fillRect(ctx, 620, 424, 320, 324, lin(ctx, 0, 424, 0, 748, [[0, '#9FD6F2'], [1, '#E6F5E1']]));
    fillRect(ctx, 620, 424, 320, 324, rad(ctx, 880, 490, 10, 170, [[0, 'rgba(255,240,170,0.95)'], [1, 'rgba(255,240,170,0)']]));
    G.ellipse(ctx, 880, 490, 40, 40, { fill: '#FFE08A', lw: 0, seed: 198 });
    cloud(ctx, 610 + ((t * 9) % 420), 520, 0.5, 0.9);
    G.ellipse(ctx, 700, 790, 190, 110, { fill: '#8CC08A', lw: 4, seed: 199 });
    G.ellipse(ctx, 900, 810, 170, 100, { fill: '#6FA873', lw: 4, seed: 197 });
    ctx.restore();
    G.line(ctx, [[780, 424], [780, 748]], { color: '#8E6444', lw: 12, seed: 202 });
    G.line(ctx, [[620, 586], [940, 586]], { color: '#8E6444', lw: 12, seed: 203 });
    G.rrect(ctx, 576, 766, 408, 28, 6, { fill: '#A8754A', lw: 5, seed: 196 });
    // 工具牆
    G.rrect(ctx, 70, 390, 440, 300, 10, { fill: '#E6CC9C', lw: 5, seed: 240, hatch: { color: 'rgba(120,80,30,0.10)', gap: 22 } });
    G.poly(ctx, [[110, 450], [330, 484], [330, 536], [110, 500]], { fill: '#CBD2D8', lw: 4, seed: 241 });
    G.rrect(ctx, 322, 462, 76, 96, 14, { fill: '#A8643C', lw: 5, seed: 242 });
    G.rrect(ctx, 438, 436, 22, 210, 6, { fill: '#C89A68', lw: 4, seed: 243 });
    G.rrect(ctx, 402, 424, 96, 48, 8, { fill: '#7C8590', lw: 5, seed: 244 });
    G.rrect(ctx, 110, 570, 250, 30, 4, { fill: '#F2D27A', lw: 4, seed: 245 });
    for (let k = 1; k < 10; k++) G.line(ctx, [[110 + k * 25, 572], [110 + k * 25, 586 + (k % 5 ? 0 : 8)]], { color: INK, lw: 2, seed: 246 + k });
    G.rrect(ctx, 80, 762, 420, 22, 4, { fill: '#A8754A', lw: 4, seed: 204 }); // 層板與罐子
    for (let k = 0; k < 4; k++) G.rrect(ctx, 110 + k * 96, 676 + (k % 2) * 22, 54, 86 - (k % 2) * 22, 8, { fill: ['#D9534F', '#F2B84B', '#6C9A8B', '#8E6444'][k], lw: 4, seed: 205 + k });
    // 工作桌、靠牆的木料
    for (const [px, ang, col] of [[86, -0.10, '#D9A566'], [130, -0.06, '#C98F5A']]) { ctx.save(); ctx.translate(px, 1300); ctx.rotate(ang); G.rrect(ctx, -22, -470, 44, 470, 4, { fill: col, lw: 4, seed: 250 + px }); ctx.restore(); }
    G.rrect(ctx, 30, 1030, 430, 46, 6, { fill: '#B98A5E', lw: 5, seed: 210, hatch: { color: 'rgba(90,50,20,0.16)', gap: 12 } });
    G.rrect(ctx, 50, 1076, 390, 44, 4, { fill: '#A8754A', lw: 4, seed: 213 });
    for (const lx of [60, 400]) G.rrect(ctx, lx, 1120, 28, 180, 4, { fill: '#8E6444', lw: 4, seed: 211 + lx });
    G.rrect(ctx, 330, 990, 90, 40, 6, { fill: '#7C8590', lw: 4, seed: 214 }); // 刨刀
    // 地板
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#D6AE80'], [1, '#B58A5E']]));
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed: 220 });
    for (let k = 1; k < 6; k++) { const y = GROUND + 34 * k * k * 0.62 + 30 * k; G.line(ctx, [[-30, y], [W + 30, y]], { color: '#8E6444', lw: 3, seed: 221 + k, alpha: 0.45 }); }
    for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 150; G.line(ctx, [[x0, GROUND + 4], [540 + (k - 4) * 330, 1900]], { color: '#8E6444', lw: 3, seed: 227 + k * 3, alpha: 0.28 }); }
    for (let k = 0; k < 9; k++) { // 地上的木屑捲
      const x = 120 + G.rnd(k, 7) * 860, y = GROUND + 60 + G.rnd(k, 8) * 420;
      const pts = []; for (let i = 0; i <= 10; i++) { const a = i * 0.85; pts.push([x + Math.cos(a) * (6 + i * 1.6), y + Math.sin(a) * (4 + i * 1.0)]); }
      G.line(ctx, pts, { color: '#F1D9A8', lw: 5, seed: 260 + k });
    }
    // 窗光打在地上
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#FFF2BE';
    ctx.beginPath(); ctx.moveTo(620, 424); ctx.lineTo(940, 424); ctx.lineTo(700, 1900); ctx.lineTo(120, 1900); ctx.fill(); ctx.restore();
  }
  function fgWorkshop(ctx, t) { motes(ctx, t, 34, [260, 430, 660, 1150], '#FFF6D0'); finish(ctx); }
  function street(ctx, sky = '#A9D8EF', sign = '木工行') {
    const t = G.t, night = clamp((0.72 - lumOf(sky)) / 0.35);
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 900, [[0, sky], [1, mix(sky, '#FFFFFF', 0.45)]]));
    if (night > 0.05) for (let k = 0; k < 26; k++) { ctx.save(); ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(t * 3 + k)); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(60 + G.rnd(k, 11) * 960, 170 + G.rnd(k, 12) * 150, 3 + 2 * G.rnd(k, 13), 0, 7); ctx.fill(); ctx.restore(); }
    cloud(ctx, -160 + ((t * 14 + 200) % 1400), 196, 0.8, 0.9 * (1 - night));
    cloud(ctx, -160 + ((t * 9 + 900) % 1400), 232, 0.55, 0.7 * (1 - night));
    // 店面
    G.rrect(ctx, 50, 340, 980, 970, 6, { fill: '#EFD6A4', lw: 6, seed: 301, hatch: { color: 'rgba(120,70,20,0.07)', gap: 16 } });
    for (const [bx, by, bw] of [[90, 600, 70], [960, 720, 50], [520, 1180, 80], [930, 1120, 60]]) G.rrect(ctx, bx, by, bw, 26, 5, { fill: '#E2C48E', lw: 3, seed: 320 + bx, alpha: 0.8 });
    G.poly(ctx, [[10, 350], [1070, 350], [1010, 236], [70, 236]], { fill: '#B5573F', lw: 6, seed: 302 });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) G.ellipse(ctx, 100 + k * 76 + (r % 2) * 38 - r * 8, 268 + r * 30, 38, 16, { fill: r % 2 ? '#C4654A' : '#A94E38', lw: 3, seed: 330 + r * 20 + k });
    fillRect(ctx, 56, 350, 968, 70, lin(ctx, 0, 350, 0, 420, [[0, 'rgba(90,50,20,0.35)'], [1, 'rgba(90,50,20,0)']])); // 屋簷陰影
    for (const hx of [380, 700]) G.line(ctx, [[hx, 352], [hx, 404]], { color: INK, lw: 5, seed: 300 + hx });
    G.rrect(ctx, 330, 400, 420, 140, 12, { fill: '#5A3B28', lw: 6, seed: 303 });
    G.rrect(ctx, 344, 414, 392, 112, 8, { fill: '#6B4630', lw: 3, seed: 299 });
    G.decor(() => label(ctx, sign, 540, 500, 92, '#F6E7C6'));
    // 門:裡面有暖光
    G.rrect(ctx, 104, 634, 352, 676, 12, { fill: '#8E6444', lw: 6, seed: 298 });
    G.rrect(ctx, 120, 650, 320, 650, 10, { fill: '#3B2A22', lw: 5, seed: 304 });
    fillRect(ctx, 124, 654, 312, 642, rad(ctx, 280, 1250, 20, 620, [[0, 'rgba(255,190,110,0.55)'], [1, 'rgba(255,190,110,0)']]));
    G.rrect(ctx, 90, 1290, 380, 26, 6, { fill: '#B9A78C', lw: 5, seed: 297 });
    // 窗:窗簾與花台
    G.rrect(ctx, 604, 634, 362, 332, 12, { fill: '#8E6444', lw: 6, seed: 296 });
    fillRect(ctx, 622, 652, 326, 296, lin(ctx, 0, 652, 0, 948, [[0, mix('#CDEBF5', '#2B3566', night)], [1, mix('#EAF6F2', '#55608F', night)]]));
    if (night > 0.3) fillRect(ctx, 622, 652, 326, 296, `rgba(255,200,120,${0.35 * night})`);
    G.poly(ctx, [[622, 652], [760, 652], [640, 900], [622, 900]], { fill: '#E8718D', lw: 4, seed: 295 });
    G.poly(ctx, [[948, 652], [810, 652], [930, 900], [948, 900]], { fill: '#E8718D', lw: 4, seed: 294 });
    G.line(ctx, [[785, 652], [785, 948]], { color: '#8E6444', lw: 10, seed: 306 });
    G.rrect(ctx, 596, 958, 378, 54, 8, { fill: '#A8643C', lw: 5, seed: 293 });
    for (let k = 0; k < 6; k++) { const fx = 630 + k * 62, sw = Math.sin(t * 2 + k) * 5; G.line(ctx, [[fx, 960], [fx + sw, 912]], { color: '#4F8A4C', lw: 6, seed: 280 + k }); G.ellipse(ctx, fx + sw, 902, 20, 20, { fill: ['#F2B84B', '#E8718D', '#FFFFFF'][k % 3], lw: 4, seed: 286 + k }); }
    // 門邊的燈籠與盆栽
    const sw = Math.sin(t * 1.8) * 0.05;
    ctx.save(); ctx.translate(500, 560); ctx.rotate(sw);
    G.line(ctx, [[0, 0], [0, 46]], { color: INK, lw: 4, seed: 270 });
    G.ellipse(ctx, 0, 96, 42, 52, { fill: '#D9534F', lw: 5, seed: 271 });
    G.rrect(ctx, -22, 40, 44, 14, 4, { fill: '#F2B84B', lw: 3, seed: 272 }); G.rrect(ctx, -22, 140, 44, 14, 4, { fill: '#F2B84B', lw: 3, seed: 273 });
    G.line(ctx, [[0, 154], [0, 196]], { color: '#F2B84B', lw: 6, seed: 274 });
    ctx.restore();
    if (night > 0.3) fillRect(ctx, 300, 460, 400, 400, rad(ctx, 500, 656, 10, 200, [[0, `rgba(255,170,90,${0.5 * night})`], [1, 'rgba(255,170,90,0)']]));
    // 地面:石板路
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#CFC4B0'], [1, '#A99C86']]));
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed: 310 });
    for (let k = 1; k < 6; k++) { const y = GROUND + 34 * k * k * 0.62 + 30 * k; G.line(ctx, [[-30, y], [W + 30, y]], { color: '#7E735F', lw: 3, seed: 311 + k, alpha: 0.5 }); }
    for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 170; G.line(ctx, [[x0, GROUND + 4], [540 + (k - 4) * 360, 1900]], { color: '#7E735F', lw: 3, seed: 317 + k * 3, alpha: 0.32 }); }
    plant(ctx, 1000, GROUND + 6, 1.15, 350);
    plant(ctx, 84, GROUND + 6, 0.9, 370);
    if (night > 0.05) fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(30,35,80,${0.28 * night})`);
  }
  function fgStreet(ctx, t, leaves = 0) {
    for (let i = 0; i < leaves; i++) { // 落葉
      const u = (G.rnd(i, 21) + t * (0.10 + 0.08 * G.rnd(i, 22))) % 1;
      const x = G.rnd(i, 23) * 1100 - 40 + Math.sin(t * 1.3 + i) * 60, y = 180 + u * 1300;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); G.ellipse(ctx, 0, 0, 20, 10, { fill: ['#E9A23B', '#D9743F', '#8CB45E'][i % 3], lw: 3, seed: 380 + i }); ctx.restore();
    }
    finish(ctx);
  }
  function yard(ctx, t) { // 後院黃昏
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1000, [[0, '#F29E6B'], [0.6, '#F8CE8E'], [1, '#FBE3B4']]));
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 820, 560, 40, 700, [[0, 'rgba(255,236,170,0.9)'], [1, 'rgba(255,236,170,0)']]));
    G.ellipse(ctx, 820, 560, 110, 110, { fill: '#FFE7A0', lw: 0, seed: 501 });
    cloud(ctx, -100 + ((t * 10 + 300) % 1300), 330, 0.7, 0.55);
    for (let k = 0; k < 3; k++) { const bx = 260 + k * 120 + t * 26, by = 420 + k * 34 + Math.sin(t * 5 + k) * 8, f = Math.sin(t * 9 + k) * 12; G.line(ctx, [[bx - 26, by - f], [bx, by + 6], [bx + 26, by - f]], { color: INK, lw: 5, seed: 540 + k }); }
    G.ellipse(ctx, 240, 930, 420, 160, { fill: '#C9A05E', lw: 4, seed: 506 }); // 遠山
    G.ellipse(ctx, 860, 950, 380, 130, { fill: '#B98E52', lw: 4, seed: 507 });
    for (let k = 0; k < 13; k++) { // 木籬笆
      G.poly(ctx, [[-20 + k * 88, 1310], [-20 + k * 88, 930], [18 + k * 88, 892], [56 + k * 88, 930], [56 + k * 88, 1310]], { fill: k % 2 ? '#D9A566' : '#CF9A5A', lw: 5, seed: 510 + k });
    }
    G.rrect(ctx, -30, 1010, W + 60, 34, 4, { fill: '#B98A5E', lw: 4, seed: 505 });
    G.rrect(ctx, -30, 1180, W + 60, 34, 4, { fill: '#B98A5E', lw: 4, seed: 504 });
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C2A67E'], [1, '#9C8160']]));
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed: 503 });
    for (let k = 0; k < 14; k++) { const gx = 40 + G.rnd(k, 31) * 1000, gy = GROUND + 20 + G.rnd(k, 32) * 460; for (let b = -1; b <= 1; b++) G.line(ctx, [[gx, gy], [gx + b * 12 + Math.sin(t * 2 + k) * 3, gy - 30]], { color: '#7FA05A', lw: 5, seed: 560 + k * 3 + b }); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { // 柴堆
      const x = 760 + c * 86 + r * 43, y = GROUND - 44 - r * 76;
      G.ellipse(ctx, x, y, 42, 40, { fill: '#C98F5A', lw: 5, seed: 520 + r * 5 + c });
      G.ellipse(ctx, x, y, 24, 22, { fill: '#E6BC8A', lw: 3, seed: 530 + r * 5 + c });
      G.ellipse(ctx, x, y, 9, 8, { fill: '#C98F5A', lw: 2, seed: 535 + r * 5 + c });
    }
  }
  function peek(ctx, t, style, mood = 'wide') { // 從門裡探頭
    ctx.save(); ctx.beginPath(); ctx.rect(120, 650, 320, 650); ctx.clip();
    Ch.person(ctx, { x: 330, y: GROUND + 10, s: 1.3, pose: 'stand', style, eyes: mood, mouth: mood === 'wide' ? 'o' : 'wavy', brows: 'worried', look: 0.9, blink: blink(t, 0.3), blush: 0.5, seed: 420, shadow: false });
    ctx.restore();
  }

  // ---------- 每一幕 ----------
  function made(ctx, t) { // 0–1:做出第一張椅子,發現它歪
    workshop(ctx);
    const after = t >= ev.wobble;
    const k = clamp((t - ev.wobble) / 0.18);
    const rock = after ? chairRest * k + 0.06 * U.springKick(t, ev.wobble, 4.5, 3) : 0;
    chair(ctx, 740, GROUND, 1.5, rock);
    const hop = !after ? Math.abs(Math.sin(t * 6)) * 26 : 0;
    Ch.person(ctx, { x: 300, y: GROUND - hop, s: 1.5, pose: 'stand', style: CAST.boy, gesture: after ? (t >= A[1] ? 'think' : undefined) : 'cheer', eyes: after ? 'wide' : 'happy', mouth: after ? 'o' : 'grin', brows: after ? 'worried' : 'up', look: 0.8, blink: blink(t, 0.1), sweat: after ? 0.8 : 0, blush: 0.6, seed: 400 });
    if (t >= A[1] + 0.9) { // 標出短了的那隻腳
      const a = ease.outBack(clamp((t - A[1] - 0.9) / 0.3));
      ctx.save(); ctx.translate(880, 1240); ctx.scale(a, a);
      G.tornPaper(ctx, -330, -190, 300, 100, { fill: '#FFF7E0', seed: 77 });
      G.decor(() => label(ctx, '短 0.5 公分', -180, -124, 48, '#C8452F'));
      G.line(ctx, [[-70, -86], [-6, 20]], { color: '#C8452F', lw: 8, seed: 78 });
      ctx.restore();
    }
  }
  function burn(ctx, t) { // 2:想拿去當柴燒
    yard(ctx, t);
    const w = Ch.walk(t, { x0: -160, speed: 250, t0: A[2], s: 1.4 });
    const stop = 430, arrived = w.x >= stop;
    const x = Math.min(w.x, stop);
    chair(ctx, x + 170, GROUND - 90 - (arrived ? 0 : Math.abs(Math.sin(t * 9)) * 14), 1.0, 0.35);
    Ch.person(ctx, { ...(arrived ? { pose: 'stand' } : { pose: w.pose, walk: w.walk }), x, y: GROUND, s: 1.4, style: CAST.boy, eyes: 'wide', mouth: 'wavy', brows: 'worried', look: arrived ? -1 : 0.6, headRot: arrived ? -0.12 * Math.sin(t * 5) : 0, blink: blink(t, 0.5), sweat: 1, blush: 0.6, seed: 400 });
  }
  function sitScene(ctx, t, { sky, hair = CAST.master.hair, who = CAST.boy, year = null, sign } = {}) { // 3–4:師傅坐上去
    street(ctx, sky, sign);
    const sat = t >= ev.sit;
    const rock = chairRest + (sat ? 0.07 * U.springKick(t, ev.sit, 3.5, 2.5) : 0) + (year !== null ? 0.012 * Math.sin(t * 7) : 0);
    peek(ctx, t, who, sat && year === null ? 'wide' : 'normal');
    chair(ctx, 740, GROUND, 1.5, rock);
    const style = { ...CAST.master, hair };
    if (!sat) {
      const u = ease.inOutCubic(clamp((t - A[3] - 0.5) / 1.5));
      Ch.person(ctx, { pose: u < 1 ? 'walk' : 'stand', walk: t * 2.2, x: lerp(1250, 930, u), y: GROUND, s: 1.45, sx: -1, style, eyes: 'normal', mouth: 'smile', look: 0.6, blink: blink(t, 0.7), seed: 440 });
    } else {
      Ch.person(ctx, { x: 740, y: GROUND - SEAT * 1.5 + 6, s: 1.45, pose: 'sit', rot: rock * 0.6, style, eyes: year !== null ? 'closed' : 'happy', mouth: 'smile', blink: 0, blush: 0.5, gesture: year === null && t < ev.sit + 1.2 ? 'thumbsUp' : undefined, seed: 440 });
    }
  }
  function sit(ctx, t) { sitScene(ctx, t); }
  function years(ctx, t) {
    const u = clamp((t - ev.years[0]) / (ev.years[1] - ev.years[0]));
    const night = 0.5 - 0.5 * Math.cos(u * Math.PI * 2 * 5);
    const n = 1 + Math.round(29 * ease.inOutQuad(u));
    sitScene(ctx, t, { sky: mix('#A9D8EF', '#2D3566', night), hair: mix('#8C8C8C', '#F4F4F0', u), who: u > 0.5 ? CAST.man : CAST.boy, year: u, sign: '第 ' + n + ' 年' });
    const sx = 540 + 620 * Math.cos(Math.PI * (1 - (u * 5) % 1)), sy = 330 - 190 * Math.sin(Math.PI * ((u * 5) % 1));
    G.ellipse(ctx, sx, sy, 56, 56, { fill: night > 0.5 ? '#F6F1D5' : '#F9C74F', lw: 5, seed: 330 });
  }
  function laugh(ctx, t) { // 5a:客人笑椅子歪
    street(ctx);
    chair(ctx, 220, GROUND, 1.3, chairRest + 0.01 * Math.sin(t * 7));
    Ch.person(ctx, { x: 220, y: GROUND - SEAT * 1.3 + 6, s: 1.25, pose: 'sit', style: { ...CAST.master, hair: '#B8B8B4' }, eyes: 'closed', mouth: 'smile', blush: 0.5, seed: 440 });
    const guests = [['guestA', 640, 1.15, 0], ['guestB', 850, 1.2, 1]];
    for (const [who, x, s, i] of guests) {
      const hop = Math.abs(Math.sin(t * 9 + i * 1.3)) * 22;
      Ch.person(ctx, { x, y: GROUND - hop, s, sx: -1, pose: 'stand', style: CAST[who], gesture: 'point', eyes: 'happy', mouth: 'open', brows: 'up', look: 1, seed: 460 + i * 30 });
    }
    G.bubble(ctx, '哈哈', 560, 700, 620, 800, t, A[5] + 0.3, A[5] + 2.4, { size: 70 });
    G.bubble(ctx, '歪的耶', 840, 640, 850, 760, t, A[5] + 0.8, A[5] + 2.4, { size: 60 });
  }
  function ashamed(ctx, t) { // 5b:阿樹難受
    workshop(ctx);
    Ch.person(ctx, { x: 540, y: 1760, s: 2.5, pose: 'stand', style: CAST.boy, gesture: 'facepalm', eyes: 'closed', mouth: 'wavy', brows: 'worried', sweat: 0.7, blush: 0.9, headRot: 0.04 * Math.sin(t * 3), seed: 400 });
  }
  function practice(ctx, t) { // 6:拼命練,好椅子一張張出現
    workshop(ctx);
    const done = t >= ev.chairs[4] + 0.2;
    ev.chairs.forEach((c, k) => {
      if (t < c) return;
      const a = ease.outBack(clamp((t - c) / 0.28));
      const x = 505 + k * 106, y = GROUND - 6 + (k % 2) * 14;
      ctx.save(); ctx.translate(x, y); ctx.scale(a, a); chair(ctx, 0, 0, 0.56, 0, { crooked: false, col: ['#C98F5A', '#B97F4C', '#D6A06A'][k % 3], seed: 600 + k * 9 }); ctx.restore();
      const f = clamp((t - c) / 0.9);
      if (f < 1) G.decor(() => label(ctx, '+1 訂單', x, y - 250 - (k % 2) * 70 - f * 90, 54, '#C8452F', { alpha: 1 - f * f, stroke: '#FFF7E0', strokeW: 14 }));
    });
    Ch.person(ctx, { x: 250, y: GROUND - (done ? Math.abs(Math.sin(t * 7)) * 24 : 0), s: 1.5, pose: 'stand', style: CAST.man, gesture: done ? 'cheer' : 'typing', eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'flat', brows: done ? 'up' : 'determined', look: 0.7, sweat: done ? 0 : 0.6, blink: blink(t, 0.2), seed: 480 });
  }
  const OLD = { ...CAST.master, hair: '#F4F4F0' };
  function retire(ctx, t) { // 7–8:退休那天,阿樹開口問
    street(ctx, '#F6C89A');
    chair(ctx, 540, GROUND, 1.35, chairRest);
    const asking = t >= A[8];
    Ch.person(ctx, { x: 230, y: GROUND, s: 1.45, pose: 'stand', style: CAST.man, gesture: asking ? 'point' : 'think', eyes: 'normal', mouth: mouthOf('shu', t) || (asking ? 'o' : 'flat'), brows: 'worried', look: 0.9, blink: blink(t, 0.4), seed: 480 });
    Ch.person(ctx, { x: 860, y: GROUND, s: 1.4, sx: -1, pose: 'stand', style: OLD, gesture: asking ? undefined : 'wave', eyes: asking ? 'normal' : 'happy', mouth: 'smile', look: asking ? 0.9 : 0, blink: blink(t, 0.8), blush: 0.4, seed: 440 });
  }
  function answer(ctx, t) { // 9–10:師傅的回答(近景)
    street(ctx, '#F6C89A');
    ctx.save(); ctx.translate(540, 1100); ctx.scale(1.35, 1.35); ctx.translate(-540, -1100);
    const rock = chairRest + 0.012 * Math.sin(t * 5);
    chair(ctx, 670, GROUND, 1.5, rock);
    const wise = t >= A[10];
    const m = mouthOf('master', t);
    Ch.person(ctx, { x: 670, y: GROUND - SEAT * 1.5 + 6, s: 1.45, pose: 'sit', rot: rock * 0.5, style: OLD, gesture: wise ? 'pointUp' : undefined, eyes: m ? 'normal' : 'happy', mouth: m || 'smile', brows: wise ? 'up' : 'neutral', look: -0.7, blink: blink(t, 0.6), blush: 0.5, seed: 440 });
    Ch.person(ctx, { x: 290, y: GROUND + 40, s: 1.3, pose: 'stand', style: CAST.man, eyes: wise && t > A[10] + 2.2 ? 'happy' : 'wide', mouth: wise && t > A[10] + 2.2 ? 'smile' : 'o', brows: 'up', look: 0.9, blink: blink(t, 0.4), blush: wise ? 0.7 : 0, seed: 480 });
    ctx.restore();
  }
  function closing(ctx, t) { // 11:結尾
    ctx.fillStyle = '#F6DDA8'; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.rays(ctx, 540, 1000, { n: 14, r0: 120, r1: 1500, color: '#FBEBC4', alpha: 0.9, spin: t * 0.05 });
    fillRect(ctx, -200, GROUND - 40, W + 400, 900, lin(ctx, 0, GROUND - 40, 0, 1900, [[0, 'rgba(214,160,90,0)'], [0.25, 'rgba(214,160,90,0.55)'], [1, 'rgba(170,115,60,0.75)']]));
    for (let k = 0; k < 12; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 4 + k * 1.7); G.star(ctx, 120 + G.rnd(k, 41) * 840, 420 + G.rnd(k, 42) * 760, 14 + 18 * tw, { fill: '#FFFFFF', rot: t + k }); }
    G.ellipse(ctx, 470, GROUND + 20, 330, 46, { fill: 'rgba(120,80,30,0.25)', lw: 0, seed: 700 });
    chair(ctx, 470, GROUND, 2.0, chairRest + 0.02 * Math.sin(t * 2.4));
    Ch.person(ctx, { x: 890, y: GROUND + 40, s: 1.15, sx: -1, pose: 'stand', style: CAST.boy, gesture: 'thumbsUp', eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    if (t >= ev.end) {
      const a = ease.outBack(clamp((t - ev.end) / 0.35));
      ctx.save(); ctx.translate(540, SAFE.y + 210); ctx.scale(a, a);
      G.decor(() => {
        label(ctx, '那是你的', 0, -40, 96, '#FFFFFF', { stroke: '#3A2A20', strokeW: 20 });
        label(ctx, '第一張椅子', 0, 90, 124, '#FFD75E', { stroke: '#3A2A20', strokeW: 24 });
      });
      ctx.restore();
    }
  }

  const film = Shots.film([
    { at: 0, draw: (c, t) => { made(c, t); fgWorkshop(c, t); }, cam: Shots.push(1.0, 1.08) },
    { at: A[2] - 0.15, draw: (c, t) => { burn(c, t); finish(c, 'rgba(255,190,110,0.25)'); }, in: 'whip' },
    { at: A[3] - 0.15, draw: (c, t) => { sit(c, t); fgStreet(c, t); }, in: 'paper', cam: Shots.push(1.0, 1.05) },
    { at: A[4] - 0.1, draw: (c, t) => { years(c, t); fgStreet(c, t, 14); }, in: 'cut' },
    { at: A[5] - 0.15, draw: (c, t) => { laugh(c, t); fgStreet(c, t); }, in: 'whip' },
    { at: A[5] + 2.25, draw: (c, t) => { ashamed(c, t); fgWorkshop(c, t); }, in: 'cut', cam: Shots.push(1.0, 1.1) },
    { at: A[6] - 0.15, draw: (c, t) => { practice(c, t); fgWorkshop(c, t); }, in: 'whip' },
    { at: A[7] - 0.15, draw: (c, t) => { retire(c, t); fgStreet(c, t, 6); }, in: 'paper', cam: Shots.push(1.0, 1.06) },
    { at: A[9] - 0.3, draw: (c, t) => { answer(c, t); fgStreet(c, t, 4); }, in: 'cut', cam: Shots.push(1.0, 1.05) },
    { at: A[11] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!,?!])/).map((p) => p.replace(/[,。,]/g, '').trim()).filter(Boolean);
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
      Subs.draw(ctx, t, SUBS, { style: 'pop', size: 78, fam: CJK, highlight: '#FFD75E' });
    },
  });
})();
