// 工程現場故事 第 6 集:壞消息怎麼報。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', BLUE = '#2B5FA8', ORANGE = '#D9843A';
  const PIPE_Y = 960;                         // 牆上原本那一排管線
  const RY = 620, RB = [237, 404, 571, 738, 905]; // 這次的工程:從左邊立管往右拉的一條,分四段
  const PY = 1182, LADX = 470;               // 工作梯的平台高度與位置
  let VO = null, SUBS = [];

  // ---------- 角色(與前幾集相同的造型;進現場一律戴安全帽,辦公室與休息區不戴) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CLIENT = { outfit: 'suit', robe: '#3A4A6B', trim: RED, shirt: '#3A4A6B', bottoms: 'pants', shorts: '#2E3A55', pants: '#2E3A55', skin: '#EBC19A', hair: '#2A2220', hairStyle: 'short', glasses: 'square', shoes: '#2A2220' };
  const VISITOR = '#3F7FBF', HELMET = '#E9853B';
  const P = (o) => ({ bottoms: 'pants', shoes: '#3A2E28', skin: SKIN, hair: '#241C1A', build: 'regular', ...o, shorts: o.pants });
  const CAST = {
    shu: SHU,                                                             // 辦公室、休息區
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },       // 工地:黃色安全帽
    masterRest: MASTER,                                                   // 休息區:帽子掛在牆上
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },     // 結尾:白色安全帽
    client: CLIENT,                                                       // 業主在自己的辦公室
    clientSite: { ...CLIENT, headwear: 'cap', headwearColor: VISITOR },   // 業主到現場:西裝加安全帽
    crewA: { ...P({ outfit: 'tee', shirt: '#5B8FD0', pants: '#3F4756', hairStyle: 'short' }), headwear: 'cap', headwearColor: HELMET },   // 工班(第 3 集的組員)
    crewB: { ...P({ outfit: 'tee', shirt: '#D0605A', pants: '#4A4F5E', hairStyle: 'bald', facialHair: 'trimmed', build: 'broad', skin: '#E0AE84' }), headwear: 'cap', headwearColor: HELMET },
  };
  globalThis.CAST = CAST;
  const BW = { slim: 0.86, regular: 1, broad: 1.18, heavy: 1.3 };

  // ---------- 小工具 ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fillRect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const mouthOf = (who, t, from = -1) => { if (t < from) return null; const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const label = (ctx, str, x, y, size, color = INK, o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });
  const popIn = (t, t0, d = 0.3) => ease.outBack(clamp((t - t0) / d));
  const hand = (px, py, s, sx, wx, wy) => [(wx - px) / (s * sx), (wy - py) / s]; // 畫面座標 → 角色手的目標
  const hexRGB = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mixCol = (c0, c1, u) => { const a = hexRGB(c0), b = hexRGB(c1); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], u)).toString(16).padStart(2, '0')).join(''); };
  const yak = (t, rate = 7) => Math.floor(t * rate) % 2 ? 'o' : 'smile'; // 沒有配音時的「正在講話」
  function finish(ctx, warm = 'rgba(255,214,140,0.18)') {
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fillRect(ctx, -200, 1250, W + 400, 900, lin(ctx, 0, 1250, 0, 1900, [[0, 'rgba(40,30,30,0)'], [1, 'rgba(40,30,30,0.30)']]));
  }
  function floorLines(ctx, col, seed) {
    G.line(ctx, [[-30, GROUND], [W + 30, GROUND]], { color: INK, lw: 5, seed });
    for (let k = 1; k < 6; k++) { const y = GROUND + 34 * k * k * 0.62 + 30 * k; G.line(ctx, [[-30, y], [W + 30, y]], { color: col, lw: 3, seed: seed + k, alpha: 0.45 }); }
    for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 160; G.line(ctx, [[x0, GROUND + 4], [540 + (k - 4) * 350, 1900]], { color: col, lw: 3, seed: seed + 10 + k, alpha: 0.3 }); }
  }
  const stroke = (ctx, pts, color, lw) => { // 乾淨的筆畫
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  };
  const tickMark = (ctx, x, y, r, a, seed) => { // 綠底白勾
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.ellipse(ctx, 0, 0, r, r, { fill: GREEN, lw: 4, seed, amp: 0.4 });
    G.line(ctx, [[-r * 0.5, 0], [-r * 0.14, r * 0.38], [r * 0.52, -r * 0.4]], { color: '#FFFFFF', lw: r * 0.26, seed: seed + 1, amp: 0.3 });
    ctx.restore();
  };
  // 鏡頭:把場景裡的 (cx, cy) 放到畫面 (540, fy),放大 z 倍
  const FY = 880;
  function zoom(ctx, cx, cy, z, fn, fy = FY) { ctx.save(); ctx.translate(540, fy); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  const toScreen = (cx, cy, z, x, y, fy = FY) => [540 + (x - cx) * z, fy + (y - cy) * z];
  // 角色身上的座標 → 場景座標
  const hipOf = (o) => (o.pose === 'floor' || o.pose === 'sit' ? 0 : -150);
  const bobOf = (o) => (o.pose === 'walk' ? -Math.abs(Math.sin(2 * Math.PI * (o.walk || 0))) * 12 * o.s : 0);
  function world(o, lx, ly) { const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r); return [o.x + o.s * (o.sx || 1) * (lx * c - ly * s), o.y + bobOf(o) + o.s * (lx * s + ly * c)]; }
  function local(ctx, o, fn) { ctx.save(); ctx.translate(o.x, o.y + bobOf(o)); ctx.scale(o.s * (o.sx || 1), o.s); ctx.rotate(o.rot || 0); fn(); ctx.restore(); }
  const headOf = (o) => world(o, o.headX || 0, hipOf(o) - 254 + (o.headY || 0)); // 頭的中心
  // 手伸向場景裡的一點(伸不到就停在手臂長度)
  function reach(o, side, wx, wy, len = 150) {
    const bw = BW[o.style.build] || 1, S0 = [side * 70 * bw, hipOf(o) - 156];
    const tx = (wx - o.x) / (o.s * (o.sx || 1)), ty = (wy - o.y) / o.s, dx = tx - S0[0], dy = ty - S0[1], d = Math.hypot(dx, dy) || 1;
    return d <= len ? [tx, ty] : [S0[0] + dx / d * len, S0[1] + dy / d * len];
  }
  const burst = (ctx, x, y, r0, r1, a, n = 8, col = RED, lw = 8) => { for (let j = 0; j < n; j++) { const an = j * Math.PI * 2 / n + 0.3; G.line(ctx, [[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * r1, y + Math.sin(an) * r1]], { color: col, lw, seed: 780 + j, alpha: a }); } };
  function paperTag(ctx, str, x, y, t0, t, { size = 54, w = 230, h = 100, rot = -0.03, color = INK, seed = 620 } = {}) { // 撕紙小標籤
    const a = popIn(t, t0, 0.28); if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    G.tornPaper(ctx, -w / 2, -h / 2, w, h, { fill: '#FFFDF4', seed });
    G.decor(() => label(ctx, str, 0, size * 0.36, size, color));
    ctx.restore();
  }

  // ---------- 道具 ----------
  function pipeSeg(ctx, x0, x1, y, th, seed, { color = STEEL, flanges = true } = {}) {
    G.rrect(ctx, x0, y - th / 2, x1 - x0, th, th * 0.3, { fill: color, lw: 4, seed });
    G.line(ctx, [[x0 + 10, y - th * 0.22], [x1 - 10, y - th * 0.22]], { color: '#FFFFFF', lw: 4, seed: seed + 1, alpha: 0.7 });
    if (flanges) for (const fx of [x0, x1]) G.rrect(ctx, fx - th * 0.22, y - th * 0.8, th * 0.44, th * 1.6, 4, { fill: '#8E99A3', lw: 4, seed: seed + 2 + fx });
  }
  function wrench(ctx, hx, hy, rot, s = 1) { // 以握把(手)為原點,開口朝上
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(0, -84);
    G.rrect(ctx, -9, -8, 18, 100, 8, { fill: '#8A8F98', lw: 4, seed: 41 });
    G.ellipse(ctx, 0, -18, 24, 24, { fill: '#8A8F98', lw: 4, seed: 42 });
    G.rrect(ctx, -9, -46, 18, 26, 2, { fill: '#5C6470', lw: 0, seed: 43 });
    ctx.restore();
  }
  function pawn(ctx, x, y, s, col, seed) { // 簡化的小人圖示
    G.rrect(ctx, x - 26 * s, y - 62 * s, 52 * s, 62 * s, 22 * s, { fill: col, lw: 4, seed });
    G.ellipse(ctx, x, y - 84 * s, 22 * s, 22 * s, { fill: col, lw: 4, seed: seed + 1 });
  }
  function wallClock(ctx, x, y, r, hours, seed, { blur = 0 } = {}) { // 掛鐘:hours 可以是小數(9.5 = 九點半)
    G.ellipse(ctx, x, y, r, r, { fill: '#8A8F98', lw: 6, seed });
    G.ellipse(ctx, x, y, r * 0.84, r * 0.84, { fill: '#FFFDF4', lw: 4, seed: seed + 1 });
    for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; G.line(ctx, [[x + Math.cos(an) * r * 0.64, y + Math.sin(an) * r * 0.64], [x + Math.cos(an) * r * 0.76, y + Math.sin(an) * r * 0.76]], { color: INK, lw: k % 3 ? 4 : 8, seed: seed + 2 + k, amp: 0 }); }
    const ha = -Math.PI / 2 + (hours % 12) * Math.PI / 6, ma = -Math.PI / 2 + (hours % 1) * Math.PI * 2;
    if (blur > 0) for (let k = 4; k >= 1; k--) { const a = ma - k * 0.22 * blur; ctx.save(); ctx.globalAlpha = 0.5 * (1 - k / 5); stroke(ctx, [[x, y], [x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62]], '#8E99A3', 8); ctx.restore(); }
    G.line(ctx, [[x, y], [x + Math.cos(ha) * r * 0.42, y + Math.sin(ha) * r * 0.42]], { color: INK, lw: 11, seed: seed + 20, amp: 0 });
    G.line(ctx, [[x, y], [x + Math.cos(ma) * r * 0.62, y + Math.sin(ma) * r * 0.62]], { color: INK, lw: 8, seed: seed + 21, amp: 0 });
    G.ellipse(ctx, x, y, r * 0.08, r * 0.08, { fill: RED, lw: 0, seed: seed + 22 });
  }
  function helmet(ctx, x, y, col, seed) { // 掛在牆上的安全帽
    G.line(ctx, [[x, y - 54], [x, y - 30]], { color: '#6C7680', lw: 8, seed });
    const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + Math.PI * k / 12; pts.push([x + Math.cos(a) * 52, y + Math.sin(a) * 46]); }
    G.shape(ctx, pts, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, x - 64, y - 6, 128, 16, 8, { fill: col, lw: 4, seed: seed + 2 });
  }
  function stepLadder(ctx, cx, py = PY) { // 工作梯(平台)
    for (const sd of [-1, 1]) G.line(ctx, [[cx + sd * 74, py + 10], [cx + sd * 96, GROUND]], { color: '#C98A3A', lw: 14, seed: 500 + sd });
    G.line(ctx, [[cx - 86, py + 66], [cx + 86, py + 66]], { color: '#C98A3A', lw: 10, seed: 503 });
    G.rrect(ctx, cx - 92, py, 184, 22, 5, { fill: '#E9A23B', lw: 5, seed: 504 });
  }
  function angerMark(ctx, x, y, r, a) { // 生氣的青筋記號
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a); ctx.lineCap = 'round';
    for (const [col, lw] of [['#FFFFFF', r * 0.42], [RED, r * 0.22]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      for (let k = 0; k < 4; k++) { const an = Math.PI / 4 + k * Math.PI / 2; ctx.beginPath(); ctx.arc(Math.cos(an) * r * 0.7, Math.sin(an) * r * 0.7, r * 0.46, an + Math.PI - 0.9, an + Math.PI + 0.9); ctx.stroke(); }
    }
    ctx.restore();
  }
  function gloom(ctx, x, y, s, t, a) { // 頭上一團亂糟糟的烏雲
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * a, s * a); ctx.globalAlpha *= Math.min(1, a);
    for (const [dx, dy, r] of [[-46, 8, 34], [0, -10, 44], [48, 6, 34]]) G.ellipse(ctx, dx, dy, r, r * 0.8, { fill: '#8E99A3', lw: 4, seed: 970 + dx });
    const pts = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push([-50 + u * 100, 4 + Math.sin(u * 26 + t * 6) * 9 * Math.sin(u * Math.PI)]); }
    stroke(ctx, pts, '#4F5B6B', 5);
    for (let k = 0; k < 3; k++) { const p = (t * 1.6 + k / 3) % 1; ctx.save(); ctx.globalAlpha *= 1 - p; stroke(ctx, [[-30 + k * 30, 40 + p * 50], [-34 + k * 30, 58 + p * 50]], '#6FA8D6', 5); ctx.restore(); }
    ctx.restore();
  }
  function dayCard(ctx, x, y, n, a, seed) { // 日曆卡:第 n 天
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(n % 2 ? -0.03 : 0.035); ctx.scale(a, a);
    G.tornPaper(ctx, -102, -78, 204, 156, { fill: '#FFFDF4', seed });
    fillRect(ctx, -98, -74, 196, 40, RED);
    for (const hx of [-54, 54]) G.ellipse(ctx, hx, -56, 9, 9, { fill: '#FFFDF4', lw: 3, seed: seed + 3 + hx, amp: 0.3 });
    G.decor(() => label(ctx, '第 ' + n + ' 天', 0, 46, 56, INK));
    ctx.restore();
  }
  function clipboard(ctx, x, y, rot, s, seed) { // 檢查用的板夾
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -50, -66, 100, 132, 8, { fill: '#B98A5E', lw: 4, seed });
    G.rrect(ctx, -40, -52, 80, 108, 4, { fill: '#FFFDF4', lw: 3, seed: seed + 1 });
    G.rrect(ctx, -20, -74, 40, 20, 5, { fill: '#8A8F98', lw: 3, seed: seed + 2 });
    for (let k = 0; k < 4; k++) { G.line(ctx, [[-28, -30 + k * 24], [-14, -18 + k * 24 - 10]], { color: k < 3 ? GREEN : RED, lw: 4, seed: seed + 3 + k, amp: 0.2 }); G.line(ctx, [[-6, -26 + k * 24], [28, -26 + k * 24]], { color: '#9AA3AD', lw: 4, seed: seed + 8 + k, amp: 0.2 }); }
    ctx.restore();
  }
  function folder(ctx, x, y, rot, s, seed) { // 報告用的資料夾
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -46, -62, 92, 124, 8, { fill: BLUE, lw: 4, seed });
    G.rrect(ctx, -30, -40, 60, 30, 4, { fill: '#FFFDF4', lw: 3, seed: seed + 1 });
    ctx.restore();
  }

  // ---------- 場景 ----------
  function fab(ctx, t, { night = 0 } = {}) { // 與前幾集同一座廠房
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#C9D3DB'], [1, '#E3E9EE']]));
    for (const cx of [130, 950]) G.rrect(ctx, cx - 36, 200, 72, 1100, 4, { fill: '#AEB9C3', lw: 5, seed: 301 + cx });
    G.rrect(ctx, -30, 214, W + 60, 36, 0, { fill: '#8E99A3', lw: 5, seed: 303 });
    [['#D9DEE3', 280], ['#F2C230', 326], ['#D9DEE3', 372], ['#6FA287', 418]].forEach(([c, y], k) => {
      G.rrect(ctx, -30, y, W + 60, 26, 12, { fill: c, lw: 4, seed: 310 + k });
      for (let j = 0; j < 4; j++) G.rrect(ctx, 200 + j * 240 + k * 20, y - 6, 16, 38, 3, { fill: '#6C7680', lw: 3, seed: 320 + k * 5 + j });
    });
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B9C7C2'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 350);
    G.rrect(ctx, -30, GROUND + 120, W + 60, 22, 0, { fill: '#F2C230', lw: 0, seed: 360, alpha: 0.85 });
    for (const px of [330, 560, 790]) G.rrect(ctx, px - 9, PIPE_Y + 14, 18, GROUND - PIPE_Y - 14, 3, { fill: '#8E99A3', lw: 4, seed: 382 + px });
    pipeSeg(ctx, -30, 237, PIPE_Y, 34, 385, { flanges: false }); pipeSeg(ctx, 237, 450, PIPE_Y, 34, 386); pipeSeg(ctx, 450, 680, PIPE_Y, 34, 387); pipeSeg(ctx, 680, W + 30, PIPE_Y, 34, 388, { flanges: false });
    G.rrect(ctx, RB[0] - 17, 440, 34, PIPE_Y - 440 + 17, 10, { fill: STEEL, lw: 4, seed: 380 }); // 立管
    G.rrect(ctx, RB[0] - 25, RY - 27, 50, 54, 6, { fill: '#8E99A3', lw: 4, seed: 381 });           // 三通:這次的工程從這裡接出去
    if (night) fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(18,24,62,${0.56 * night})`);
  }
  // 這次的工程:built = 已裝好的段數;最新的一段在 at 時裝上去;alarm 時沒做完的部分閃紅
  function run(ctx, t, { built = 2, at = null, alarm = 0 } = {}) {
    for (let k = 0; k < 4; k++) { const mx = (RB[k] + RB[k + 1]) / 2; G.line(ctx, [[mx, 444], [mx, RY - 18]], { color: '#6C7680', lw: 6, seed: 590 + k }); } // 吊架都先裝好了
    const xb = RB[built];
    if (built < 4) {
      const fl = 0.65 + 0.35 * Math.sin(t * 7);
      ctx.save();
      if (alarm > 0) fillRect(ctx, xb + 6, RY - 17, RB[4] - xb - 6, 34, `rgba(200,69,47,${0.22 * fl * alarm})`);
      ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = alarm > 0 ? RED : '#8E99A3'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.strokeRect(xb + 8, RY - 17, RB[4] - xb - 8, 34);
      ctx.restore();
    }
    for (let k = 0; k < built; k++) {
      const mx = (RB[k] + RB[k + 1]) / 2, a = at != null && k === built - 1 ? Math.min(1, popIn(t, at, 0.22)) : 1;
      if (a <= 0) continue;
      ctx.save(); ctx.translate(mx, RY); ctx.scale(a, a); ctx.translate(-mx, -RY);
      G.rrect(ctx, mx - 8, RY + 12, 16, 22, 3, { fill: '#8E99A3', lw: 4, seed: 392 + k });
      pipeSeg(ctx, RB[k], RB[k + 1], RY, 34, 395 + k * 9);
      ctx.restore();
    }
  }
  // 料架:full = 材料到齊;missing = 缺的那一層
  const RACK = { x0: 575, x1: 915, top: 668, shelves: [740, 910, 1080, 1250] };
  function rack(ctx, t, { full = false, missing = -1, alarm = 0 } = {}) {
    const { x0, x1, top, shelves } = RACK;
    for (const x of [x0, x1]) G.rrect(ctx, x - 13, top, 26, GROUND - top, 5, { fill: '#3F6FA8', lw: 4, seed: 700 + x });
    G.line(ctx, [[x0, shelves[0] + 20], [x1, shelves[1]]], { color: '#5C7FA8', lw: 6, seed: 704, alpha: 0.7 });
    G.line(ctx, [[x1, shelves[1] + 20], [x0, shelves[2]]], { color: '#5C7FA8', lw: 6, seed: 705, alpha: 0.7 });
    G.line(ctx, [[x0, shelves[2] + 20], [x1, shelves[3]]], { color: '#5C7FA8', lw: 6, seed: 706, alpha: 0.7 });
    shelves.forEach((y, k) => {
      if (full && k !== missing) {
        for (let j = 0; j < 3; j++) pipeSeg(ctx, x0 + 24 + (j % 2) * 10, x1 - 24 - (j % 2) * 10, y - 15 - j * 26, 26, 712 + k * 7 + j, { flanges: false, color: j === 1 ? '#C9D0D6' : STEEL });
      } else {
        const hot = k === missing && alarm > 0, fl = 0.6 + 0.4 * Math.sin(t * 8);
        if (hot) fillRect(ctx, x0 + 18, y - 82, x1 - x0 - 36, 78, `rgba(200,69,47,${0.18 * fl * alarm})`);
        ctx.save(); ctx.setLineDash([18, 12]); ctx.strokeStyle = hot ? RED : '#9AA3AD'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.roundRect(x0 + 24 + (j % 2) * 10, y - 28 - j * 26, x1 - x0 - 48 - (j % 2) * 20, 26, 12); ctx.stroke(); }
        ctx.restore();
      }
      G.rrect(ctx, x0 - 18, y, x1 - x0 + 36, 20, 4, { fill: '#E9853B', lw: 4, seed: 720 + k });
    });
    G.rrect(ctx, (x0 + x1) / 2 - 92, top - 62, 184, 66, 8, { fill: '#FFFDF4', lw: 4, seed: 730 });
    G.decor(() => label(ctx, '管材', (x0 + x1) / 2, top - 12, 48, INK));
  }
  function hangTag(ctx, t, px, py, t0, str) { // 掛在料架上的牌子
    const a = popIn(t, t0, 0.3); if (a <= 0) return;
    const rot = Math.sin((t - t0) * 5) * 0.12 * Math.exp(-(t - t0) * 1.6) + Math.sin(t * 1.3) * 0.015;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(a, a);
    stroke(ctx, [[0, 0], [0, 44]], INK, 4);
    G.poly(ctx, [[-132, 56], [-112, 42], [112, 42], [132, 56], [132, 146], [-132, 146]], { fill: '#FFF6D8', lw: 5, seed: 732, step: 18 });
    G.ellipse(ctx, 0, 58, 8, 8, { fill: '#E9E2D0', lw: 3, seed: 733 });
    G.decor(() => label(ctx, str, 0, 124, 54, RED));
    ctx.restore();
  }
  function office(ctx, t, { door = 0, hours = 10 } = {}) { // 業主的辦公室:左邊是門,右邊是窗
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    G.rrect(ctx, 520, 420, 420, 420, 12, { fill: '#BFE3F0', lw: 6, seed: 201 });
    ctx.save(); ctx.beginPath(); ctx.rect(526, 426, 408, 408); ctx.clip();
    G.ellipse(ctx, 618, 520, 36, 36, { fill: '#FFF3B8', lw: 0, seed: 209 });
    for (let k = 0; k < 4; k++) G.rrect(ctx, 548 + k * 100, 690 - (k % 2) * 80, 80, 150 + (k % 2) * 80, 4, { fill: '#A9CBD8', lw: 0, seed: 205 + k, alpha: 0.75 }); // 窗外大樓
    ctx.restore();
    G.line(ctx, [[730, 426], [730, 834]], { color: '#8FB7C7', lw: 8, seed: 202 });
    // 門(鉸鏈在左邊,往鏡頭這邊開)
    G.rrect(ctx, 136, 676, 240, 630, 6, { fill: '#B98A5E', lw: 6, seed: 640 });
    fillRect(ctx, 152, 692, 208, 608, lin(ctx, 0, 692, 0, 1300, [[0, '#4A3F38'], [1, '#6A5A4C']]));
    if (door != null) doorLeaf(ctx, door);
    wallClock(ctx, 448, 540, 62, hours, 860);
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
  }
  function doorLeaf(ctx, door) { // 門板:鉸鏈在左邊,打開時往鏡頭這邊轉,看起來越來越窄
    const lw0 = 208 * Math.cos(door * 1.35);
    if (lw0 <= 4) return;
    G.rrect(ctx, 152, 692, lw0, 608, 4, { fill: '#D9B58A', lw: 5, seed: 641 });
    if (lw0 > 60) { G.rrect(ctx, 152 + lw0 * 0.16, 740, lw0 * 0.68, 210, 6, { fill: 'rgba(0,0,0,0)', stroke: '#B98A5E', lw: 4, seed: 642 }); G.ellipse(ctx, 152 + lw0 - 26 * (lw0 / 208), 1010, 11, 11, { fill: '#C9A24A', lw: 3, seed: 643 }); }
  }
  function desk(ctx) { // 業主的桌子:文件、筆電、名牌
    G.rrect(ctx, 560, 1118, 440, 40, 8, { fill: '#B98A5E', lw: 6, seed: 120 });
    G.rrect(ctx, 580, 1158, 400, 150, 4, { fill: '#8E6444', lw: 5, seed: 121 });
    G.rrect(ctx, 600, 1050, 110, 70, 6, { fill: '#FFFDF4', lw: 4, seed: 123 });
    for (let k = 0; k < 3; k++) G.line(ctx, [[614, 1068 + k * 16], [696, 1068 + k * 16]], { color: '#B8AE9A', lw: 4, seed: 124 + k });
    G.rrect(ctx, 850, 1042, 120, 78, 6, { fill: '#5C6470', lw: 4, seed: 127 }); G.rrect(ctx, 836, 1112, 148, 10, 4, { fill: '#8A8F98', lw: 3, seed: 128 }); // 筆電
    G.poly(ctx, [[724, 1118], [738, 1074], [826, 1074], [840, 1118]], { fill: '#FFFDF4', lw: 4, seed: 129 });
    G.decor(() => label(ctx, '業主', 782, 1110, 38, INK));
  }
  function restArea(ctx) { // 休息區:不是施工現場,安全帽掛在牆上
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#F3E6CB'], [1, '#EAD7B4']]));
    G.rrect(ctx, -30, 1010, W + 60, 300, 0, { fill: '#D2B58A', lw: 5, seed: 601 });
    for (let k = 0; k < 8; k++) G.line(ctx, [[60 + k * 140, 1016], [60 + k * 140, 1296]], { color: '#B0946A', lw: 3, seed: 602 + k, alpha: 0.6 });
    G.rrect(ctx, 410, 470, 270, 290, 12, { fill: '#B98A5E', lw: 6, seed: 611 });
    fillRect(ctx, 428, 488, 234, 254, lin(ctx, 0, 488, 0, 742, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    G.ellipse(ctx, 610, 700, 70, 52, { fill: '#8FC49A', lw: 0, seed: 612 }); G.ellipse(ctx, 500, 720, 60, 40, { fill: '#A5D3A6', lw: 0, seed: 613 });
    G.line(ctx, [[545, 488], [545, 742]], { color: '#B98A5E', lw: 9, seed: 614 });
    G.rrect(ctx, 404, 754, 282, 18, 4, { fill: '#B98A5E', lw: 4, seed: 615 });
    ctx.save(); ctx.translate(272, 440); ctx.rotate(-0.02);
    G.tornPaper(ctx, -118, -52, 236, 100, { fill: '#FFFDF4', seed: 620 });
    G.decor(() => label(ctx, '休息區', 0, 22, 60, INK));
    ctx.restore();
    helmet(ctx, 770, 560, '#F4F4F0', 630); helmet(ctx, 880, 560, '#F2C230', 640);
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B98A5E'], [1, '#8E6444']]));
    floorLines(ctx, '#6E4C34', 650);
  }
  const TABLE_Y = 1085;
  function stool(ctx, x) { G.rrect(ctx, x - 66, 1072, 132, 26, 8, { fill: '#8E6444', lw: 4, seed: 660 + x }); for (const sd of [-1, 1]) G.rrect(ctx, x + sd * 48 - 9, 1096, 18, 206, 3, { fill: '#7A553A', lw: 4, seed: 662 + x + sd }); }
  function steam(ctx, x, y, t, k, a = 0.6) {
    const u = (t * 0.6 + k * 0.37) % 1;
    G.line(ctx, [[x, y - u * 46], [x + Math.sin(t * 3 + k) * 7, y - 22 - u * 46], [x - Math.sin(t * 3 + k) * 5, y - 44 - u * 46]], { color: '#FFFFFF', lw: 5, seed: 880 + k, alpha: a * (1 - u) });
  }
  function teaTable(ctx, t) {
    for (const lx of [176, 876]) G.rrect(ctx, lx, TABLE_Y + 30, 30, GROUND - TABLE_Y - 26, 4, { fill: '#8E6444', lw: 4, seed: 670 + lx });
    G.rrect(ctx, 140, TABLE_Y, 800, 40, 8, { fill: '#B98A5E', lw: 6, seed: 672 });
    const px = 540, py = TABLE_Y; // 茶壺
    G.ellipse(ctx, px - 52, py - 40, 18, 22, { fill: 'rgba(0,0,0,0)', stroke: '#6E3A26', lw: 9, seed: 675 });
    G.poly(ctx, [[px + 36, py - 34], [px + 74, py - 66], [px + 82, py - 58], [px + 46, py - 18]], { fill: '#8A4B32', lw: 4, seed: 676 });
    G.ellipse(ctx, px, py - 40, 50, 40, { fill: '#8A4B32', lw: 5, seed: 677 });
    G.ellipse(ctx, px, py - 78, 30, 9, { fill: '#6E3A26', lw: 4, seed: 678 }); G.ellipse(ctx, px, py - 90, 8, 8, { fill: '#6E3A26', lw: 3, seed: 679 });
    for (const [k, x] of [[0, 410], [1, 680]]) { // 兩杯茶
      G.poly(ctx, [[x - 23, py - 44], [x + 23, py - 44], [x + 17, py], [x - 17, py]], { fill: '#FFFDF4', lw: 4, seed: 690 + k, amp: 0.5 });
      G.ellipse(ctx, x, py - 44, 22, 7, { fill: '#C98A3A', lw: 3, seed: 700 + k, amp: 0.4 });
      steam(ctx, x - 5, py - 54, t, k, 0.7);
    }
  }

  // ---------- 每一幕 ----------
  // 0:材料晚到,工期確定會落後。阿樹決定,先不要講
  const SCHED = A[0] + 1.35;
  function rackShot(ctx, t) {
    fab(ctx, t);
    run(ctx, t, { built: 1 });
    rack(ctx, t);
    hangTag(ctx, t, 745, RACK.shelves[0] + 20, ev.tag, '到貨延後');
    // 阿樹:看著空料架 → 拿出手機想打給業主 → 收進口袋 → 噓
    const X = 300, SS = 1.22, sh = -322, hip = -150;
    const holding = t >= ev.phone, pu = ease.inOutCubic(clamp((t - ev.pocket) / 0.42)), shh = t >= ev.shh, stamped = t >= ev.stamp;
    const lift = ease.outCubic(clamp((t - ev.phone) / 0.3));
    const o = { x: X, y: GROUND, s: SS, pose: 'stand', style: CAST.shuSite, seed: 400, blush: 0.6, blink: shh ? 0 : blink(t, 0.2),
      eyes: t >= ev.tag && t < ev.tag + 0.8 ? 'wide' : 'normal', mouth: t >= ev.tag && t < ev.tag + 0.8 ? 'o' : stamped ? 'wavy' : 'flat',
      brows: stamped || t >= ev.tag + 0.8 ? 'worried' : 'neutral', look: 0.85, lookY: 0.1, sweat: stamped ? 1 : 0 };
    if (holding && pu < 1) { // 手機拿在胸前
      o.gesture = pu < 0.85 ? 'phone' : undefined;
      o.handR = [lerp(lerp(86, 26, lift), 84, pu), lerp(lerp(hip - 10, sh + 74, lift), hip + 2, pu)];
      o.handL = pu > 0 ? undefined : [-24 + Math.sin(t * 9) * 4, sh + 98 - Math.abs(Math.sin(t * 9)) * 4];
      Object.assign(o, { look: pu > 0.3 ? -0.6 : 0.1, lookY: pu > 0.3 ? 0 : 1, headRot: 0.05, eyes: 'normal', mouth: 'wavy', brows: 'worried' });
    }
    if (pu >= 1) { o.handR = [84, hip + 2]; Object.assign(o, { look: -0.75, lookY: 0.1, mouth: 'flat', brows: 'up', headRot: -0.04 }); }
    Ch.person(ctx, o);
    if (shh) { // 嘴巴拉上拉鍊:先不要講
      const zu = ease.inOutCubic(clamp((t - ev.shh) / 0.32));
      local(ctx, o, () => {
        ctx.save(); ctx.translate(0, hip - 172 - 82); ctx.rotate(o.headRot || 0);
        const mx = o.look * 8, my = 40, x0 = mx - 30, x1 = mx + 30, xe = lerp(x0, x1, zu);
        stroke(ctx, [[x0, my], [xe, my]], INK, 6);
        for (let x = x0 + 4; x < xe - 2; x += 7.5) stroke(ctx, [[x, my - 8], [x, my + 8]], INK, 3);
        G.rrect(ctx, xe - 8, my - 4, 16, 26, 4, { fill: '#C9CED4', lw: 3.5, seed: 421 });
        ctx.restore();
      });
    }
    // 手機畫面:業主
    const pa = t >= ev.dial ? Math.min(popIn(t, ev.dial, 0.28), 1 - ease.inCubic(clamp((t - ev.pocket) / 0.28))) : 0;
    if (pa > 0.01) {
      ctx.save(); ctx.translate(X, 496); ctx.scale(pa, pa);
      G.line(ctx, [[0, 146], [0, 176]], { color: '#FFFFFF', lw: 8, seed: 905, alpha: 0.9 });
      G.rrect(ctx, -112, -146, 224, 292, 34, { fill: '#26242C', lw: 6, seed: 750 });
      ctx.save(); ctx.beginPath(); ctx.roundRect(-98, -130, 196, 260, 22); ctx.clip();
      fillRect(ctx, -98, -130, 196, 260, '#F4F7FA');
      fillRect(ctx, -98, -130, 196, 36, '#D5DDE4');
      pawn(ctx, 0, -12, 0.95, '#7FA7C9', 752);
      G.decor(() => label(ctx, '業主', 0, 46, 46, INK));
      const ring = 1 + 0.06 * Math.sin(t * 10);
      G.ellipse(ctx, 0, 94, 28 * ring, 28 * ring, { fill: GREEN, lw: 4, seed: 754 });
      ctx.save(); ctx.translate(0, 96); ctx.rotate(-0.55); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; // 話筒
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-11, -3); ctx.quadraticCurveTo(0, -14, 11, -3); ctx.stroke();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 12, 2, 6, 8.5, sd * 0.45, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.restore();
      ctx.restore();
    }
    // 工期:落後(章)
    const ca = popIn(t, SCHED, 0.3);
    if (ca > 0) {
      ctx.save(); ctx.translate(706, 486); ctx.rotate(-0.02); ctx.scale(ca, ca);
      G.tornPaper(ctx, -188, -74, 376, 148, { fill: '#FFFDF4', seed: 740 });
      G.decor(() => label(ctx, '工期', -88, 26, 74, INK));
      if (stamped) {
        const u = clamp((t - ev.stamp) / 0.14), sc = lerp(2.1, 1, ease.inCubic(u)) + U.springKick(t, ev.stamp + 0.14, 9, 9) * 0.05;
        ctx.save(); ctx.translate(86, 0); ctx.rotate(-0.13); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(u * 3);
        G.rrect(ctx, -84, -50, 168, 100, 14, { fill: 'rgba(255,253,244,0.9)', stroke: RED, lw: 9, seed: 741 });
        G.decor(() => label(ctx, '落後', 0, 24, 66, RED));
        ctx.restore();
      }
      ctx.restore();
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 1:他想,趕一趕,說不定追得回來(加班,時鐘飛轉)
  function overtime(ctx, t) {
    fab(ctx, t, { night: 1 });
    run(ctx, t, t >= ev.built[0] ? { built: 2, at: ev.built[0] } : { built: 1 });
    fillRect(ctx, -200, 300, W + 400, 1500, rad(ctx, 470, 900, 30, 780, [[0, 'rgba(255,214,140,0.40)'], [1, 'rgba(255,214,140,0)']])); // 工作燈
    const hope = t >= A[1] + 1.75 && t < E[1];
    // 左邊的工班:鎖下面那排管
    const wb = Math.sin(t * 15 + 1) * 12;
    Ch.person(ctx, { x: 178, y: GROUND, s: 1.02, pose: 'stand', style: CAST.crewB, handR: hand(178, GROUND, 1.02, 1, 258 + wb * 0.4, 1050), eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.8, lookY: 0.3, sweat: 1, blush: 0.5, blink: blink(t, 0.7), seed: 520 });
    wrench(ctx, 258 + wb * 0.4, 1050, -0.3 + wb * 0.02, 0.95);
    // 阿樹:在工作梯上鎖剛裝上去的那一段
    stepLadder(ctx, LADX);
    const wob = Math.sin(t * 17) * 13, hx = 552 + wob * 0.5, hy = 742;
    Ch.person(ctx, { x: LADX, y: PY, s: 1.05, pose: 'stand', style: CAST.shuSite, handR: hand(LADX, PY, 1.05, 1, hx, hy), eyes: hope ? 'happy' : 'normal', mouth: hope ? 'grin' : 'flat', brows: 'determined', look: 0.8, lookY: hope ? -0.2 : -0.7, sweat: 1, blush: 0.65, blink: blink(t, 0.2), seed: 400 });
    wrench(ctx, hx, hy, 0.02 + wob * 0.02, 1.05);
    // 右邊的工班:也在鎖下面那排管
    const wa = Math.sin(t * 16 + 2.3) * 12;
    Ch.person(ctx, { x: 800, y: GROUND, s: 1.02, sx: -1, pose: 'stand', style: CAST.crewA, handR: hand(800, GROUND, 1.02, -1, 722 + wa * 0.4, 1050), eyes: 'normal', mouth: 'o', brows: 'determined', look: 0.8, lookY: 0.3, sweat: 1, blush: 0.5, blink: blink(t, 0.4), seed: 560 });
    wrench(ctx, 722 + wa * 0.4, 1050, 0.3 + wa * 0.02, 0.95);
    for (let k = 0; k < 2; k++) { const q = t - ev.built[k]; if (q >= 0 && q < 0.28) burst(ctx, RB[2], RY, 30 + q * 130, 58 + q * 130, 1 - q / 0.28, 6, RED, 8); }
    // 時鐘:越轉越快
    const dt = Math.max(0, t - ev.night), hours = 19 + 1.2 * dt + 0.42 * dt * dt, speed = 1.2 + 0.84 * dt;
    const ka = popIn(t, ev.night + 0.12, 0.3);
    if (ka > 0) {
      ctx.save(); ctx.translate(770, 470); ctx.scale(ka, ka); ctx.rotate(Math.sin(t * 38) * 0.03);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const a0 = -t * 9 + k * 2.1; ctx.beginPath(); ctx.arc(0, 0, 138 + k * 10, a0, a0 + 0.9); ctx.stroke(); }
      ctx.restore();
      wallClock(ctx, 0, 0, 112, hours, 800, { blur: Math.min(1, speed / 3) });
      ctx.restore();
    }
    paperTag(ctx, '加班', 520, 456, ev.night + 0.35, t, { size: 62, w: 196, h: 104, rot: -0.05, color: RED, seed: 830 });
    finish(ctx, 'rgba(150,190,255,0.10)');
  }
  // 2:一個禮拜後,業主自己在現場發現了
  const LIVID = '#A9BCCB';
  function clientLook(t, base) { // 發現之後:臉色鐵青
    const u = ease.inOutCubic(clamp((t - ev.discover) / 0.4));
    return u > 0 ? { ...base, skin: mixCol(CLIENT.skin, LIVID, u) } : base;
  }
  function discover(ctx, t) {
    const hit = t >= ev.discover, kick = hit ? U.springKick(t, ev.discover, 7, 6) : 0, CX0 = 770, CS = 1.25;
    ctx.save(); ctx.translate(CX0, 760); ctx.scale(1 + kick * 0.05, 1 + kick * 0.05); ctx.translate(-CX0, -760);
    fab(ctx, t);
    run(ctx, t, { built: 2, alarm: hit ? clamp((t - ev.discover) / 0.2) : 0 });
    stepLadder(ctx, LADX);
    const frozen = t >= ev.discover + 0.08, wob = frozen ? 0 : Math.sin(t * 11) * 12, hx = 556 + wob * 0.5, hy = 742;
    const noticed = t >= ev.arrive - 0.3;
    Ch.person(ctx, { x: LADX, y: PY, s: 1.05, pose: 'stand', style: CAST.shuSite, handR: hand(LADX, PY, 1.05, 1, hx, hy),
      eyes: frozen ? 'wide' : 'normal', mouth: frozen ? 'o' : 'flat', brows: frozen ? 'worried' : 'determined', look: frozen || noticed ? 0.9 : 0.8, lookY: frozen ? 0.4 : -0.7, sweat: frozen ? 1 : 0.4, blush: 0.6, blink: frozen ? 0 : blink(t, 0.2), seed: 400 });
    wrench(ctx, hx, hy, 0.02 + wob * 0.02, 1.05);
    // 業主:從右邊走進來,停在還沒做的那一段底下
    if (t >= ev.walk) {
      const arrived = t >= ev.arrive, d = clamp((t - ev.walk) / (ev.arrive - ev.walk)) * (1150 - CX0);
      const st = clientLook(t, CAST.clientSite), up = arrived && !hit;
      const o = { x: arrived ? CX0 : 1150 - d, y: GROUND, s: CS, sx: -1, pose: arrived ? 'stand' : 'walk', walk: (d / (300 * CS)) % 1, style: st, seed: 440,
        eyes: hit ? (t < ev.discover + 0.5 ? 'wide' : 'normal') : 'normal', mouth: hit ? 'wavy' : 'flat', brows: hit ? 'determined' : 'neutral',
        look: up ? -0.3 : hit ? 0.5 : 0.3, lookY: up ? -0.8 : hit ? -0.2 : 0, gesture: t >= ev.discover + 0.45 ? 'akimbo' : undefined, blink: hit ? 0 : blink(t, 0.45) };
      Ch.person(ctx, o);
      if (hit) {
        const [hx2, hy2] = headOf(o);
        if (t < ev.discover + 0.4) { const q = (t - ev.discover) / 0.4; burst(ctx, hx2, hy2, 120 + q * 60, 160 + q * 90, 1 - q, 10, '#FFFFFF', 10); }
        angerMark(ctx, hx2 - 96, hy2 - 84, 50, popIn(t, ev.discover + 0.1, 0.25) * (1 + 0.08 * Math.sin(t * 9)));
      }
    }
    ctx.restore();
    paperTag(ctx, '一週後', 238, 470, ev.week, t, { size: 58, w: 236, h: 106, rot: -0.04, seed: 820 });
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 3:「落後多久了?你打算什麼時候才告訴我?」(業主對嘴,阿樹低頭)
  function scold(ctx, t) {
    const m = mouthOf('client', t), q2 = t >= ev.ask2, after = t >= ev.hush, Z = 1.25, CX = 540, CY = 900;
    const sx = 315, cxp = 700;
    let so, co;
    zoom(ctx, CX, CY, Z, () => {
      fab(ctx, t);
      run(ctx, t, { built: 2, alarm: 1 });
      const sink = ease.inOutCubic(clamp((t - A[3]) / 1.2)) * 12 + (after ? ease.inOutCubic(clamp((t - ev.hush) / 0.5)) * 8 : 0);
      so = { x: sx, y: GROUND, s: 1.25, pose: 'stand', style: CAST.shuSite, seed: 400, handL: [-26, -322 + 132], handR: [26, -322 + 128],
        eyes: after || q2 ? 'closed' : 'normal', mouth: 'wavy', brows: 'worried', look: 0.3, lookY: 1, headRot: 0.14, headY: sink, sweat: 1, blush: 0.4, blink: 0 };
      Ch.person(ctx, so);
      const pointUp = !q2 && t >= A[3] + 0.25;
      co = { x: cxp, y: GROUND, s: 1.22, sx: -1, pose: 'stand', style: clientLook(t, CAST.clientSite), seed: 440, mouth: m || 'flat', eyes: 'normal', brows: 'determined',
        look: pointUp ? 0.2 : 0.7, lookY: pointUp ? -0.6 : 0.3, headRot: Math.sin(t * 2.6) * 0.03 - (q2 && !after ? 0.04 : 0), blink: blink(t, 0.45) };
      if (after) co.crossArms = true;
      else if (pointUp) { co.gesture = 'point'; co.handR = [118, -322 - 150]; }
      else if (q2) { co.gesture = 'point'; co.handR = [160, -322 + 34 + Math.sin(t * 8) * 6]; }
      else co.gesture = 'akimbo';
      Ch.person(ctx, co);
    }, CY);
    const [hx, hy] = headOf(co), [ax, ay] = toScreen(CX, CY, Z, hx - 70, hy - 96, CY);
    angerMark(ctx, ax, ay, 44, 1 + 0.08 * Math.sin(t * 9));
    if (after) { const [gx, gy] = toScreen(CX, CY, Z, sx + 6, GROUND - 404 * 1.25 - 120, CY); gloom(ctx, gx, gy, 1.3, t, popIn(t, ev.hush + 0.1, 0.35)); }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 4:那天之後,業主每天都來現場盯(第 1、2、3 天)
  function watch(ctx, t) {
    const day = ev.days.filter((d) => t >= d).length || 1, td = ev.days[day - 1];
    fab(ctx, t);
    run(ctx, t, day >= 3 ? { built: 3, at: ev.days[2] + 0.4 } : { built: 2 });
    stepLadder(ctx, LADX);
    const wob = Math.sin(t * 12) * 12, hx = 556 + wob * 0.5, hy = 742;
    const nerv = day >= 2;
    Ch.person(ctx, { x: LADX, y: PY, s: 1.05, pose: 'stand', style: CAST.shuSite, handR: hand(LADX, PY, 1.05, 1, hx, hy),
      eyes: day >= 3 ? 'wide' : 'normal', mouth: nerv ? 'wavy' : 'flat', brows: 'worried', look: nerv && Math.sin(t * 2.2) > 0 ? 0.9 : 0.7, lookY: nerv && Math.sin(t * 2.2) > 0 ? 0.2 : -0.7,
      sweat: 0.5 + 0.25 * day, blush: 0.5, blink: blink(t, 0.2), seed: 400 });
    wrench(ctx, hx, hy, 0.02 + wob * 0.02, 1.05);
    const POS = [[870, 1.14], [810, 1.2], [752, 1.26]], [px, ps] = POS[day - 1];
    Ch.person(ctx, { x: px, y: GROUND, s: ps, sx: -1, pose: 'stand', style: CAST.clientSite, crossArms: true, seed: 440,
      eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.7, lookY: -0.4, headRot: day === 2 ? -0.05 : 0.02, blink: blink(t, 0.45) });
    const fl = clamp(1 - (t - td) / 0.14); // 換日的一下閃白
    if (t >= ev.days[1] && fl > 0) fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(255,255,255,${0.55 * fl})`);
    ev.days.forEach((d, k) => dayCard(ctx, 270 + k * 235, 452, k + 1, popIn(t, d, 0.25), 530 + k * 10));
    finish(ctx, `rgba(255,220,160,${0.08 + 0.05 * day})`);
  }
  // 5:師傅說:壞消息不會因為你不講就變好(休息區,師傅對嘴)
  function restTalk(ctx, t) {
    const z = lerp(1.02, 1.08, ease.inOutQuad(clamp((t - ev.rest) / (A[6] - ev.rest))));
    ctx.save(); ctx.translate(540, 980); ctx.scale(z, z); ctx.translate(-540, -980);
    restArea(ctx);
    stool(ctx, 285); stool(ctx, 770);
    const m = mouthOf('master', t, ev.speak - 0.05), speaking = t >= ev.speak && t < E[5] + 0.1;
    const M = [285, 1070, 1.35], Sx = [770, 1070, 1.3];
    const ph = t - ev.speak, finger = speaking && ph < 1.2, shake = speaking && ph >= 1.2 && ph < 2.2, palm = t >= ev.speak + 2.2;
    const mo = { x: M[0], y: M[1], s: M[2], pose: 'sit', style: CAST.masterRest, seed: 440, shadow: false, blink: blink(t, 0.6), blush: 0.4,
      eyes: 'normal', mouth: m || 'flat', brows: speaking ? 'up' : 'neutral', look: 0.8, lookY: 0.1, headRot: 0.03 + (shake ? Math.sin(ph * 11) * 0.05 : 0) };
    if (finger) { mo.gesture = 'pointUp'; mo.handR = [156, -172 - 46 + Math.sin(t * 6) * 4]; }
    else if (palm) mo.handR = [168, -172 + 46 + Math.sin(t * 2.5) * 4];
    else mo.handR = hand(M[0], M[1], M[2], 1, 400, 1040);
    Ch.person(ctx, mo);
    const look = t >= E[5] - 0.7;
    Ch.person(ctx, { x: Sx[0], y: Sx[1], s: Sx[2], sx: -1, pose: 'sit', style: CAST.shu, seed: 400, shadow: false, blush: 0.6, blink: blink(t, 0.2),
      eyes: look ? 'wide' : 'normal', mouth: look ? 'o' : 'wavy', brows: 'worried', look: 0.8, lookY: look ? 0 : 0.8, headRot: look ? 0.02 : 0.08, headY: look ? 0 : 8,
      handL: [-60, -172 + 120], handR: hand(Sx[0], Sx[1], Sx[2], -1, 690, 1036) });
    teaTable(ctx, t);
    ctx.restore();
    finish(ctx, 'rgba(255,200,120,0.20)');
  }
  // 6a:下一次,阿樹發現問題(料架又缺一層)
  function findShot(ctx, t) {
    fab(ctx, t);
    run(ctx, t, { built: 4 });
    const found = t >= ev.find, al = found ? clamp((t - ev.find) / 0.2) : 0;
    rack(ctx, t, { full: true, missing: 1, alarm: al });
    wallClock(ctx, 745, 470, 62, 9, 870);
    const go = ev.find + 0.62, walking = t >= go, X = walking ? 330 + (t - go) * 330 : 330, SS = 1.22;
    const nod = found ? Math.max(0, Math.sin(Math.PI * clamp((t - ev.find - 0.35) / 0.25))) * 9 : 0;
    const o = { x: X, y: GROUND, s: SS, pose: walking ? 'walk' : 'stand', walk: walking ? ((t - go) * 330 / (300 * SS)) % 1 : 0, style: CAST.shuSite, seed: 400, blush: 0.6, blink: blink(t, 0.2),
      eyes: found && t < ev.find + 0.3 ? 'wide' : 'normal', mouth: found ? (t < ev.find + 0.3 ? 'o' : 'flat') : 'smile', brows: found ? 'determined' : 'neutral', look: 0.85, lookY: found ? 0.2 : 0.4, headY: nod };
    const bx = walking ? 0 : Math.sin(t * 7) * 4;
    o.handL = [-30, -322 + 96];
    if (!walking) o.handR = [36 + bx, -322 + 104];
    Ch.person(ctx, o);
    const cp = world(o, -24, -322 + 74);
    clipboard(ctx, cp[0], cp[1], -0.12, 1.0, 900);
    if (found) {
      const a = popIn(t, ev.find, 0.25), [rx, ry] = [(RACK.x0 + RACK.x1) / 2, RACK.shelves[1] - 46];
      ctx.save(); ctx.translate(rx, ry - 6); ctx.scale(a, a); ctx.rotate(Math.sin(t * 12) * 0.05);
      G.poly(ctx, [[0, -84], [84, 60], [-84, 60]], { fill: '#F2C230', lw: 7, seed: 750 });
      G.rrect(ctx, -9, -38, 18, 56, 7, { fill: INK, lw: 0, seed: 751 }); G.ellipse(ctx, 0, 38, 11, 11, { fill: INK, lw: 0, seed: 752 });
      ctx.restore();
    }
    paperTag(ctx, '下一次', 236, 466, A[6] + 0.05, t, { size: 58, w: 236, h: 106, rot: -0.04, seed: 824 });
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 6b:當天就去報告(敲門,走進業主辦公室)
  function officeEnter(ctx, t) {
    office(ctx, t, { door: null, hours: 10 });
    // 阿樹:站在開著的門口敲敲門框,再走進來(資料夾在左手)
    const tw = ev.enter, X = t < tw ? 270 : Math.min(440, 270 + (t - tw) * 190), walking = t >= tw && X < 440, SS = 1.18;
    const knockK = Math.max(...ev.knock.map((k) => Math.max(0, 1 - Math.abs(t - k) / 0.09)));
    const o = { x: X, y: GROUND, s: SS, pose: walking ? 'walk' : 'stand', walk: walking ? ((X - 270) / (300 * SS)) % 1 : 0, style: CAST.shu, seed: 400, blush: 0.6, blink: blink(t, 0.2),
      eyes: 'normal', mouth: X >= 440 ? 'smile' : 'flat', brows: 'determined', look: 0.85, lookY: 0, handL: [-92, -150 - 4] };
    if (t < tw) o.handR = hand(X, GROUND, SS, 1, 352 + knockK * 12, 985);
    Ch.person(ctx, o);
    const fp = world(o, -98, -150 + 24); folder(ctx, fp[0], fp[1], -0.08, 0.95, 910);
    doorLeaf(ctx, 1);
    for (const k of ev.knock) { const q = t - k; if (q >= 0 && q < 0.22) for (let j = 0; j < 3; j++) { const an = -0.9 + j * 0.9; G.line(ctx, [[372 + Math.cos(an) * (34 + q * 120), 985 + Math.sin(an) * (34 + q * 120)], [372 + Math.cos(an) * (56 + q * 120), 985 + Math.sin(an) * (56 + q * 120)]], { color: INK, lw: 6, seed: 790 + j, alpha: 1 - q / 0.22 }); } }
    // 業主:站在桌子後面,聽到敲門抬頭
    const heard = t >= ev.knock[0] + 0.1;
    Ch.person(ctx, { x: 790, y: GROUND, s: 1.22, sx: -1, pose: 'stand', style: CAST.client, seed: 440, blink: blink(t, 0.45),
      handR: heard ? undefined : hand(790, GROUND, 1.22, -1, 660, 1090), eyes: heard && t < ev.enter + 0.6 ? 'wide' : 'normal', mouth: heard && t < ev.enter + 0.6 ? 'o' : 'flat', brows: heard ? 'up' : 'neutral', look: heard ? 0.9 : 0.4, lookY: heard ? 0 : 0.9 });
    desk(ctx);
    finish(ctx);
  }
  // 7–8:四張卡片(事實、影響、選項、待決定)→ 兩個方案,業主點頭指第二個
  const CARDS = [
    { title: '事實', sub: '材料晚到', col: BLUE },
    { title: '影響', sub: '晚三天', col: RED },
    { title: '選項', sub: '兩個方案', col: GREEN },
    { title: '待決定', sub: '選哪個', col: ORANGE },
  ];
  const CPOS = [[310, 500], [700, 500], [310, 780], [700, 780]], CW = 360, CH = 240;
  const OPTS = [{ title: '方案一', sub: '等原料' }, { title: '方案二', sub: '換替代料' }];
  const OPOS = [[380, 556], [380, 806]], OW = 380, OH = 220;
  function bigCard(ctx, x, y, w, h, c, n, { a = 1, rot = 0, dim = 0, glow = 0, seed = 840 } = {}) {
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    if (glow > 0) { ctx.save(); ctx.globalAlpha *= glow; G.rrect(ctx, -w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 34, { fill: 'rgba(62,155,95,0.22)', stroke: GREEN, lw: 9, seed: seed + 9 }); ctx.restore(); }
    G.rrect(ctx, -w / 2, -h / 2, w, h, 24, { fill: '#FFFDF4', lw: 6, seed });
    ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 20); ctx.clip(); fillRect(ctx, -w / 2, -h / 2, w, 48, c.col); ctx.restore();
    G.line(ctx, [[-w / 2 + 6, -h / 2 + 50], [w / 2 - 6, -h / 2 + 50]], { color: INK, lw: 4, seed: seed + 1 });
    G.decor(() => {
      if (n) label(ctx, String(n), -w / 2 + 34, -h / 2 + 39, 38, '#FFFFFF');
      label(ctx, c.title, 0, h > 260 ? -2 : 18, h > 260 ? 86 : 80, INK);
      label(ctx, c.sub, 0, h > 260 ? 92 : 92, h > 260 ? 62 : 56, c.col);
    });
    if (dim > 0) { ctx.save(); ctx.globalAlpha *= dim; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 24); ctx.fillStyle = 'rgba(214,230,236,0.65)'; ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  const ZR = 0.9, ZFY = 1420; // 辦公室拉遠,卡片放在兩人頭頂上方
  const toW = (x, y) => [540 + (x - 540) * ZR, ZFY + (y - GROUND) * ZR];   // 場景 → 畫面
  const fromW = (x, y) => [540 + (x - 540) / ZR, GROUND + (y - ZFY) / ZR]; // 畫面 → 場景
  function report(ctx, t) {
    const nCards = ev.cards.filter((c) => t >= c).length, split = ease.inOutCubic(clamp((t - ev.opts) / 0.42)), picked = t >= ev.pick;
    const SX = 300, SS = 1.0, CX = 830, CS = 1.05, talking = t >= A[7] && t < E[7];
    const cur = nCards ? nCards - 1 : -1;
    let so, co;
    zoom(ctx, 540, GROUND, ZR, () => {
      office(ctx, t, { door: 0, hours: 10.2 });
      // 阿樹:一張一張講
      so = { x: SX, y: GROUND, s: SS, pose: 'stand', style: CAST.shu, seed: 400, blush: 0.6, blink: blink(t, 0.2), eyes: picked ? 'happy' : 'normal', mouth: picked ? 'grin' : talking ? yak(t) : 'smile', brows: picked ? 'up' : 'determined', look: 0.8, lookY: 0 };
      if (picked && t >= ev.pick + 0.3) so.handR = [108, -322 - 46 - Math.abs(Math.sin((t - ev.pick) * 7)) * 10 * clamp(1 - (t - ev.pick - 0.3) / 1.2)];
      else if (talking && cur >= 0 && split <= 0) { const [wx, wy] = fromW(CPOS[cur][0], CPOS[cur][1] + 100); so.handR = reach(so, 1, wx, wy, 150); so.lookY = -0.5; so.look = cur % 2 ? 0.8 : 0.1; }
      else so.handR = [92, -150 - 30];
      so.handL = [-60, -150 - 34];
      Ch.person(ctx, so);
      const fp = world(so, -66, -150 - 10); folder(ctx, fp[0], fp[1], -0.1, 0.9, 910);
      // 業主:先抱胸聽 → 想 → 「好」點頭 → 指第二個方案
      const nodK = t >= ev.nod ? Math.max(0, Math.sin(Math.PI * clamp((t - ev.nod) / 0.28))) + Math.max(0, Math.sin(Math.PI * clamp((t - ev.nod - 0.3) / 0.28))) : 0;
      co = { x: CX, y: GROUND, s: CS, sx: -1, pose: 'stand', style: CAST.client, seed: 440, blink: blink(t, 0.45), eyes: picked ? 'happy' : nodK > 0.2 ? 'closed' : 'normal', mouth: picked ? 'smile' : t >= ev.nod && t < ev.nod + 0.45 ? 'o' : 'flat', brows: 'neutral', look: 0.6, lookY: -0.4, headY: nodK * 10 };
      if (t >= ev.point) { const [wx, wy] = fromW(OPOS[1][0], OPOS[1][1]), pu = ease.outBack(clamp((t - ev.point) / 0.3)), aim = reach(co, 1, wx, wy, 150); co.gesture = 'point'; co.handR = [lerp(60, aim[0], pu), lerp(-180, aim[1], pu)]; co.look = 0.9; co.lookY = -0.5; }
      else if (t >= ev.nod - 0.15) co.handR = [70, -150 - 20];
      else if (nCards >= 4 || t >= ev.opts) co.gesture = 'think';
      else co.crossArms = true;
      if (cur >= 0 && t < ev.opts && !(nCards >= 4)) { co.look = CPOS[cur][0] < 500 ? 0.8 : 0.2; co.lookY = -0.6; }
      Ch.person(ctx, co);
      desk(ctx);
    }, ZFY);
    // 「四件事」:先出現四個空格,再一張一張補上
    const ph0 = A[7] + 0.85;
    if (t >= ph0 && t < ev.opts + 0.3) CPOS.forEach(([x, y], k) => {
      if (t >= ev.cards[k] + 0.2) return;
      const a = popIn(t, ph0 + k * 0.07, 0.3) * (1 - clamp((t - ev.opts) / 0.3));
      if (a <= 0) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
      ctx.save(); ctx.setLineDash([16, 12]); ctx.strokeStyle = '#8E99A3'; ctx.lineWidth = 6; ctx.fillStyle = 'rgba(255,253,244,0.45)'; ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 24); ctx.fill(); ctx.stroke(); ctx.restore();
      G.decor(() => label(ctx, String(k + 1), 0, 30, 84, '#9AA3AD'));
      ctx.restore();
    });
    // 四張卡片
    CARDS.forEach((c, k) => {
      if (t < ev.cards[k]) return;
      let a = popIn(t, ev.cards[k], 0.34), [x, y] = CPOS[k];
      if (split > 0) a *= 1 - split;
      bigCard(ctx, x, y, CW, CH, c, k + 1, { a, rot: [-0.02, 0.018, 0.015, -0.02][k], seed: 840 + k * 12 });
    });
    // 兩個方案
    if (t >= ev.opts + 0.12) OPTS.forEach((c, k) => {
      const u = popIn(t, ev.opts + 0.12 + k * 0.14, 0.36), [x1, y1] = OPOS[k], x = lerp(CPOS[2][0], x1, Math.min(1, u)), y = lerp(CPOS[2][1], y1, Math.min(1, u));
      const on = k === 1 && picked, tap = k === 1 && t >= ev.point + 0.3 ? 1 + U.springKick(t, ev.point + 0.3, 8, 8) * 0.05 : 1;
      bigCard(ctx, x, y, OW, OH, { ...c, col: GREEN }, 0, { a: u * tap * (on ? 1.04 : 1), rot: k ? 0.015 : -0.015, dim: k === 0 && picked ? clamp((t - ev.pick) / 0.3) : 0, glow: on ? clamp((t - ev.pick) / 0.2) : 0, seed: 900 + k * 12 });
      if (k === 1) tickMark(ctx, x + OW / 2 - 26, y - OH / 2 + 10, 42, popIn(t, ev.pick, 0.25), 960);
    });
    if (t >= ev.point + 0.3 && t < ev.point + 0.75) { const q = (t - ev.point - 0.3) / 0.45; ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = GREEN; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(OPOS[1][0] + 120, OPOS[1][1] + 50, 30 + q * 70, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } // 指到的地方
    if (picked && t < ev.pick + 0.35) { const q = (t - ev.pick) / 0.35; burst(ctx, OPOS[1][0], OPOS[1][1], 220 + q * 50, 255 + q * 70, 1 - q, 12, GREEN, 9); }
    finish(ctx);
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, ev.card, 0.4);
    ctx.save(); ctx.translate(506, 372); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -420, 0, 840, 400, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '壞消息要自己先報', 0, 160, 92, INK);
      const b = popIn(t, ev.line2, 0.3);
      if (b > 0) { ctx.save(); ctx.translate(0, 290); ctx.scale(b, b); label(ctx, '而且要帶著選項去', 0, 34, 92, RED); ctx.restore(); }
    });
    ctx.restore();
    Ch.person(ctx, { x: 300, y: GROUND + 76, s: 0.98, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    const SX = 720, SY = GROUND + 76, SS = 0.95, fx = 612, fy = 1084 + Math.sin(t * 4) * 6;
    Ch.person(ctx, { x: SX, y: SY, s: SS, sx: -1, pose: 'stand', style: CAST.shuSite, handR: hand(SX, SY, SS, -1, fx + 6, fy + 40), eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    [BLUE, RED, GREEN, ORANGE].forEach((col, k) => { ctx.save(); ctx.translate(fx + 8, fy + 44); ctx.rotate(-0.5 + k * 0.28); G.rrect(ctx, -26, -96, 52, 76, 8, { fill: '#FFFDF4', lw: 4, seed: 950 + k }); fillRect(ctx, -22, -92, 44, 14, col); ctx.restore(); });
    G.ellipse(ctx, fx + 6, fy + 40, 19, 19, { fill: SKIN, lw: 4, seed: 418 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1474); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: rackShot, cam: Shots.push(1.0, 1.04) },
    { at: A[1] - 0.15, draw: overtime, in: 'fade', cam: Shots.push(1.0, 1.04) },
    { at: A[2] - 0.15, draw: discover, in: 'paper' },
    { at: A[3] - 0.15, draw: scold, in: 'cut' },
    { at: A[4] - 0.15, draw: watch, in: 'whip' },
    { at: A[5] - 0.15, draw: restTalk, in: 'fade' },
    { at: A[6] - 0.15, draw: findShot, in: 'paper' },
    { at: ev.office, draw: officeEnter, in: 'whip' },
    { at: A[7] - 0.15, draw: report, in: 'cut' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配(太長的短句在 CUT 指定的位置再切一次)
  const CUT = { '你打算什麼時候才告訴我?': 7, '壞消息不會因為你不講就變好': 5, '阿樹發現問題的當天就去報告': 9 };
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!、:,?!:])/).map((p) => p.replace(/[,。、,::「」]/g, '').trim()).filter(Boolean)
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
