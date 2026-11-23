// 工程現場故事 第 7 集:這個你處理一下。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', BLUE = '#2B5FA8';
  const PAPER = '#FFFDF4', MUTED = '#7A6650', PINK = '#E3A0B4';
  let VO = null, SUBS = [];

  // ---------- 角色(與前幾集相同的造型;這一集在辦公室與休息區,沒有人戴安全帽) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const P = (o) => ({ bottoms: 'pants', shoes: '#3A2E28', skin: SKIN, hair: '#241C1A', build: 'regular', ...o, shorts: o.pants });
  const TEAM = [ // 第 3 集的七位組員
    P({ outfit: 'tee', shirt: '#5B8FD0', pants: '#3F4756', hairStyle: 'short' }),
    P({ outfit: 'shirt', shirt: '#E3A0B4', pants: '#4A4F5E', hairStyle: 'long', hair: '#3A2418', build: 'slim', skin: '#F4CDAE' }),
    P({ outfit: 'hoodie', shirt: '#7C6BB0', pants: '#3A3A44', hairStyle: 'buzz', build: 'heavy', skin: '#D9A77E' }),
    P({ outfit: 'tee', shirt: '#D9A441', pants: '#5A4A3C', hairStyle: 'curlytop', glasses: 'round', build: 'slim' }),
    P({ outfit: 'shirt', shirt: '#4FA3A8', pants: '#3F4756', hairStyle: 'ponytail', hair: '#5A3420', skin: '#EBC19A' }),
    P({ outfit: 'tee', shirt: '#D0605A', pants: '#4A4F5E', hairStyle: 'bald', facialHair: 'trimmed', build: 'broad', skin: '#E0AE84' }),
    P({ outfit: 'hoodie', shirt: '#8E99A3', pants: '#2E3A55', hairStyle: 'bun', hair: '#6B4A2E', glasses: 'square', skin: '#F0C8A4' }),
  ];
  const CAST = {
    shuChief: { ...SHU, vest: true }, // 阿樹:課長背心(第 3 集的畫法)
    masterRest: MASTER,               // 師傅:休息區,帽子掛在牆上
    staff: TEAM[1],                   // 部屬:七個人裡穿粉紅襯衫、長頭髮的那一位
  };
  globalThis.CAST = { ...CAST };

  // ---------- 小工具 ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fillRect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const label = (ctx, str, x, y, size, color = INK, o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });
  const popIn = (t, t0, d = 0.3) => ease.outBack(clamp((t - t0) / d));
  const hand = (px, py, s, sx, wx, wy) => [(wx - px) / (s * sx), (wy - py) / s]; // 畫面座標 → 角色手的目標
  const mix2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
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
  const burst = (ctx, x, y, r0, r1, a, n = 8, col = RED, lw = 8) => { for (let j = 0; j < n; j++) { const an = j * Math.PI * 2 / n + 0.3; G.line(ctx, [[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * r1, y + Math.sin(an) * r1]], { color: col, lw, seed: 780 + j, alpha: a }); } };
  // 鏡頭:把場景裡的 (cx, cy) 放到畫面 (540, fy),放大 z 倍
  function zoom(ctx, cx, cy, z, fn, fy = 880) { ctx.save(); ctx.translate(540, fy); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  // 角色身上的座標 ↔ 場景座標(含走路時的上下起伏與擺動)
  const hipOf = (o) => (o.pose === 'floor' || o.pose === 'sit' ? 0 : -150);
  const bobOf = (o) => (o.pose === 'walk' ? -Math.abs(Math.sin(2 * Math.PI * (o.walk || 0))) * 12 * o.s : 0);
  const rotOf = (o) => (o.rot || 0) + (o.pose === 'walk' ? Math.sin(2 * Math.PI * (o.walk || 0)) * 0.025 : 0);
  function world(o, lx, ly) { const r = rotOf(o), c = Math.cos(r), s = Math.sin(r); return [o.x + o.s * (o.sx || 1) * (lx * c - ly * s), o.y + bobOf(o) + o.s * (lx * s + ly * c)]; }
  function toLocal(o, wx, wy) { const r = rotOf(o), c = Math.cos(r), s = Math.sin(r), X = (wx - o.x) / (o.s * (o.sx || 1)), Y = (wy - o.y - bobOf(o)) / o.s; return [X * c + Y * s, -X * s + Y * c]; }
  const grip = (ctx, o, p, k = 0) => G.ellipse(ctx, p[0], p[1], 20 * o.s, 20 * o.s, { fill: o.style.skin || SKIN, lw: 4 * o.s, seed: (o.seed || 300) + 60 + k }); // 握住道具的手(畫在道具上面)

  // 人物:style.vest 時,在軀幹畫完、手臂畫上去之前套一件反光背心(第 3 集的課長背心)
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

  // ---------- 道具 ----------
  function paperStack(ctx, x, y, s, seed = 1300) { // 一疊資料(中心在 x, y)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const w = 136, h = 84;
    G.rrect(ctx, -w / 2 + 12, -h / 2 - 10, w - 16, h, 3, { fill: '#F4EEDC', lw: 3, seed: seed + 1 });
    G.rrect(ctx, -w / 2 - 8, -h / 2 + 4, w, h - 4, 3, { fill: '#EFE6CF', lw: 3, seed: seed + 2 });
    G.rrect(ctx, -w / 2, -h / 2, w, h, 4, { fill: PAPER, lw: 4, seed: seed + 3 });
    for (let k = 1; k < 7; k++) G.line(ctx, [[-w / 2 + 7, -h / 2 + k * 12], [w / 2 - 7, -h / 2 + k * 12]], { color: '#CDBF9F', lw: 2.5, seed: seed + 10 + k, amp: 0.5 });
    G.rrect(ctx, w / 2 - 34, -h / 2 - 16, 18, 36, 3, { fill: '#F2C230', lw: 2.5, seed: seed + 20 });  // 便利貼
    G.rrect(ctx, -w / 2 + 18, -h / 2 - 12, 18, 30, 3, { fill: '#8DC3E8', lw: 2.5, seed: seed + 22 });
    G.rrect(ctx, -20, -h / 2 - 14, 40, 20, 4, { fill: '#3A3A44', lw: 2.5, seed: seed + 21 });          // 長尾夾
    ctx.restore();
  }
  // 整齊的表格(阿樹腦袋裡想要的樣子)
  function neatTable(ctx, x, y, w, h, seed) {
    const k = w / 300, rows = 4, rh = h / (rows + 1), cw = [0.42, 0.33, 0.25].map((f) => f * w);
    G.rrect(ctx, x, y, w, h, 6 * k, { fill: '#FFFFFF', lw: 3.5 * k, seed, amp: 0.4 });
    for (let r = 2; r <= rows; r += 2) fillRect(ctx, x + 3 * k, y + r * rh, w - 6 * k, rh, 'rgba(141,180,216,0.16)');
    fillRect(ctx, x + 3 * k, y + 3 * k, w - 6 * k, rh - 3 * k, '#8DB4D8');
    let c0 = x;
    cw.forEach((c, j) => { fillRect(ctx, c0 + c * 0.18, y + rh * 0.38, c * (j === 2 ? 0.45 : 0.55), rh * 0.24, '#FFFFFF'); c0 += c; });
    for (let r = 1; r <= rows; r++) {
      const yy = y + r * rh;
      stroke(ctx, [[x + 2 * k, yy], [x + w - 2 * k, yy]], '#9AA6B2', 2.4 * k);
      c0 = x;
      cw.forEach((c, j) => {
        if (j < 2) fillRect(ctx, c0 + c * 0.16, yy + rh * 0.38, c * (j ? 0.52 : 0.66 - 0.12 * (r % 2)), rh * 0.24, '#5A6270');
        else { const cx = c0 + c / 2, cy = yy + rh / 2; stroke(ctx, [[cx - 10 * k, cy], [cx - 3 * k, cy + 8 * k], [cx + 11 * k, cy - 9 * k]], GREEN, 5 * k); }
        c0 += c;
      });
    }
    c0 = x;
    for (let j = 0; j < 2; j++) { c0 += cw[j]; stroke(ctx, [[c0, y + 2 * k], [c0, y + h - 2 * k]], '#9AA6B2', 2.4 * k); }
  }
  // 亂七八糟的清單(實際交出來的東西)
  function messyList(ctx, x, y, w, h, seed) {
    const k = w / 300, ink = '#4A5260', lw = Math.max(2.2, 4.6 * k);
    const L = [[0.08, 0.1, 0.62, -0.03], [0.16, 0.23, 0.5, 0.05], [0.05, 0.37, 0.78, -0.05], [0.26, 0.52, 0.42, 0.07], [0.07, 0.66, 0.56, -0.04], [0.34, 0.8, 0.4, 0.06]];
    L.forEach(([x0, y0, len, tilt], i) => {
      const pts = []; for (let j = 0; j <= 16; j++) { const u = j / 16; pts.push([x + w * (x0 + len * u), y + h * (y0 + tilt * u) + Math.sin(u * 23 + i * 1.7) * 4.5 * k]); }
      stroke(ctx, pts, ink, lw);
    });
    const zz = []; for (let j = 0; j <= 12; j++) zz.push([x + w * (0.04 + 0.8 * j / 12), y + h * (0.355 + (j % 2 ? -0.035 : 0.035) - 0.004 * j)]);
    stroke(ctx, zz, RED, lw * 1.2);                                                                         // 整行劃掉
    stroke(ctx, [[x + w * 0.7, y + h * 0.55], [x + w * 0.9, y + h * 0.45], [x + w * 0.86, y + h * 0.18]], RED, lw); // 亂畫的箭頭
    stroke(ctx, [[x + w * 0.8, y + h * 0.24], [x + w * 0.86, y + h * 0.16], [x + w * 0.93, y + h * 0.24]], RED, lw);
    G.ellipse(ctx, x + w * 0.76, y + h * 0.86, 30 * k, 26 * k, { fill: null, stroke: 'rgba(150,100,50,0.55)', lw: Math.max(2.5, 7 * k), seed: seed + 3 }); // 咖啡杯印
    const sc = []; for (let j = 0; j <= 30; j++) { const an = j * 0.9; sc.push([x + w * 0.18 + Math.cos(an) * (16 + (j % 5) * 3) * k, y + h * 0.9 + Math.sin(an) * (9 + (j % 3) * 3) * k]); }
    stroke(ctx, sc, ink, Math.max(1.8, 3.2 * k));                                                             // 塗鴉
  }
  function sheet(ctx, x, y, s, rot, seed = 1500) { // 拿在手上的那一張(亂的清單)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -42, -54, 84, 108, 4, { fill: PAPER, lw: 3.5, seed });
    messyList(ctx, -36, -46, 72, 92, seed + 5);
    ctx.restore();
  }
  // 想像的雲(小圓圈連到頭上)
  function cloud(ctx, cx, cy, w, h, a, seed, droop = 0) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(cx, cy + droop * 14); ctx.rotate(droop * 0.045); ctx.scale(a, a * (1 - droop * 0.07));
    const n = 14, bumps = [];
    for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2; bumps.push([Math.cos(an) * w * 0.4, Math.sin(an) * h * 0.37, Math.min(w, h) * (0.16 + 0.03 * Math.sin(k * 2.7))]); }
    ctx.fillStyle = 'rgba(30,20,15,0.2)'; ctx.beginPath();
    for (const [bx, by, r] of bumps) { ctx.moveTo(bx + 6 + r, by + 9); ctx.arc(bx + 6, by + 9, r, 0, Math.PI * 2); }
    ctx.moveTo(6 + w * 0.42, 9); ctx.ellipse(6, 9, w * 0.42, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    bumps.forEach(([bx, by, r], k) => G.ellipse(ctx, bx, by, r, r, { fill: '#FFFFFF', lw: 5, seed: seed + k, amp: 0.7 }));
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
    for (const [bx, by, r] of bumps) { ctx.moveTo(bx + r - 5, by); ctx.arc(bx, by, r - 5, 0, Math.PI * 2); }
    ctx.moveTo(w * 0.42, 0); ctx.ellipse(0, 0, w * 0.42, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function cloudTail(ctx, pts, a, seed) { pts.forEach(([x, y, r], k) => { const b = clamp(a * 1.6 - k * 0.3); if (b > 0) G.ellipse(ctx, x, y, r * b, r * b, { fill: '#FFFFFF', lw: 4, seed: seed + k, amp: 0.4 }); }); }
  function speech(ctx, cx, cy, w, h, tip, a, seed) { // 對話框,尾巴指向 tip
    if (a <= 0) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(a, a);
    const tx = (tip[0] - cx) / a, ty = (tip[1] - cy) / a, bx = clamp(tx * 0.45, -w / 2 + 70, w / 2 - 70);
    const pts = G.rrPts(-w / 2, -h / 2, w, h, 46, 18);
    ctx.fillStyle = 'rgba(20,15,30,0.25)'; ctx.beginPath(); G.path(ctx, pts.map((p) => [p[0] + 7, p[1] + 9])); ctx.fill();
    G.poly(ctx, [[bx - 34, h / 2 - 6], [tx, ty], [bx + 30, h / 2 - 6]], { fill: '#FFFFFF', lw: 5, seed: seed + 1 });
    G.shape(ctx, pts, { fill: '#FFFFFF', lw: 5.5, seed });
    fillRect(ctx, bx - 30, h / 2 - 14, 56, 18, '#FFFFFF');
    ctx.restore();
  }
  function tag(ctx, str, x, y, size, a, { fill = PAPER, color = INK, rot = -0.03, seed = 1 } = {}) { // 撕下來的紙條標籤
    if (a <= 0) return;
    const w = G.measure(ctx, str, size, CJK, 800) + size * 0.9, h = size * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    G.tornPaper(ctx, -w / 2, -h / 2, w, h, { fill, seed });
    label(ctx, str, 0, size * 0.36, size, color);
    ctx.restore();
  }
  function stamp(ctx, str, x, y, size, rot, t, t0) { // 紅色印章:從大蓋下來
    if (t < t0) return;
    const u = clamp((t - t0) / 0.18), sc = lerp(1.7, 1, ease.outCubic(u)) + U.springKick(t, t0 + 0.18, 6, 9) * 0.05;
    const w = G.measure(ctx, str, size, CJK, 800) + size * 0.8, h = size * 1.45;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(u * 3);
    G.rrect(ctx, -w / 2, -h / 2, w, h, 14, { fill: 'rgba(255,253,244,0.92)', stroke: RED, lw: 8, seed: 1450 });
    label(ctx, str, 0, size * 0.36, size, RED);
    ctx.restore();
  }
  function neq(ctx, x, y, s, a) { // 紅色「≠」
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a * s, a * s);
    for (const [c, w] of [['#FFFFFF', 30], [RED, 15]]) {
      stroke(ctx, [[-38, -16], [38, -16]], c, w); stroke(ctx, [[-38, 16], [38, 16]], c, w); stroke(ctx, [[16, -46], [-16, 46]], c, w);
    }
    ctx.restore();
  }
  function anger(ctx, x, y, r, a) { // 生氣的青筋記號
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    for (let q = 0; q < 4; q++) { ctx.save(); ctx.rotate(q * Math.PI / 2 + 0.35); for (const [c, w] of [['#FFFFFF', r * 0.42], [RED, r * 0.22]]) stroke(ctx, [[r * 0.22, -r], [r * 0.3, -r * 0.42], [r, -r * 0.24]], c, w); ctx.restore(); }
    ctx.restore();
  }
  function grumble(ctx, x, y, r, a, t) { // 碎念的一團亂線
    if (a <= 0) return;
    const pts = [], b = Math.floor(t * 8);
    for (let i = 0; i <= 54; i++) { const an = i * 0.62 + b * 0.4, rr = r * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.31 + b))); pts.push([x + Math.cos(an) * rr * a, y + Math.sin(an) * rr * 0.72 * a]); }
    stroke(ctx, pts, 'rgba(255,255,255,0.85)', 12); stroke(ctx, pts, INK, 5.5);
  }
  function shock(ctx, x, y, r, a) { // 嚇一跳的短線
    if (a <= 0) return;
    for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) { const an = (sd < 0 ? Math.PI : 0) + sd * (-0.55 + j * 0.42); stroke(ctx, [[x + Math.cos(an) * r, y + Math.sin(an) * r], [x + Math.cos(an) * (r + 46 * a), y + Math.sin(an) * (r + 46 * a)]], INK, 8); }
  }
  function smallCard(ctx, x, y, s, rot, seed = 1600) { // 阿樹的交辦小卡
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -46, -32, 92, 64, 6, { fill: PAPER, lw: 3.5, seed });
    fillRect(ctx, -42, -28, 84, 12, RED);
    for (let k = 0; k < 5; k++) { G.ellipse(ctx, -32, -6 + k * 8.5, 3, 3, { fill: GREEN, lw: 0, seed: seed + k }); fillRect(ctx, -24, -8 + k * 8.5, 40 + (k % 3) * 9, 4, '#7A8490'); }
    ctx.restore();
  }
  function dayCard(ctx, x, y, rot, a, k) { // 撕頁日曆:第 k 天
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    G.tornPaper(ctx, -105, -118, 210, 236, { fill: PAPER, seed: 1200 + k });
    G.rrect(ctx, -105, -118, 210, 58, 6, { fill: RED, lw: 4, seed: 1210 + k });
    for (const rx of [-52, 52]) G.rrect(ctx, rx - 7, -136, 14, 34, 6, { fill: '#5C6470', lw: 3, seed: 1220 + k + rx });
    label(ctx, '第' + k + '天', 0, 46, 66, INK);
    ctx.restore();
  }
  function pawn(ctx, x, y, s, col, seed) { // 簡化的小人圖示
    G.rrect(ctx, x - 26 * s, y - 62 * s, 52 * s, 62 * s, 22 * s, { fill: col, lw: 4, seed });
    G.ellipse(ctx, x, y - 84 * s, 22 * s, 22 * s, { fill: col, lw: 4, seed: seed + 1 });
  }
  function steam(ctx, x, y, t, k, a = 0.6) {
    const u = (t * 0.6 + k * 0.37) % 1;
    G.line(ctx, [[x, y - u * 46], [x + Math.sin(t * 3 + k) * 7, y - 22 - u * 46], [x - Math.sin(t * 3 + k) * 5, y - 44 - u * 46]], { color: '#FFFFFF', lw: 5, seed: 880 + k, alpha: a * (1 - u) });
  }
  // VHS 倒帶的掃描線與 ◀◀
  function rewindFX(ctx, t, k) {
    if (k <= 0) return;
    ctx.save();
    fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(225,232,255,${0.22 * k})`);
    for (let j = 0; j < 8; j++) {
      const y = -200 + ((t * (2.4 + j * 0.41) + j * 0.29) % 1) * (H + 400), h = 8 + 30 * ((j * 0.53) % 1);
      ctx.globalAlpha = k * (0.3 + 0.35 * ((j * 0.71) % 1));
      fillRect(ctx, -200, y, W + 400, h, j % 2 ? '#FFFFFF' : '#AFC0E8');
    }
    ctx.globalAlpha = k;
    ctx.save(); ctx.translate(250, 420);
    for (const dx of [0, 62]) G.poly(ctx, [[dx + 60, -42], [dx + 60, 42], [dx, 0]], { fill: '#FFFFFF', lw: 6, seed: 1400 + dx });
    ctx.restore();
    ctx.restore();
  }

  // ---------- 場景 ----------
  function officeDay(ctx) { // 與第 1、3 集同一間辦公室
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    G.rrect(ctx, 120, 420, 840, 420, 12, { fill: '#BFE3F0', lw: 6, seed: 201 });
    for (const vx of [400, 680]) G.line(ctx, [[vx, 426], [vx, 834]], { color: '#8FB7C7', lw: 8, seed: 202 + vx });
    for (let k = 0; k < 5; k++) G.rrect(ctx, 160 + k * 170, 700 - (k % 3) * 60, 110, 140 + (k % 3) * 60, 4, { fill: '#A9CBD8', lw: 0, seed: 205 + k, alpha: 0.7 }); // 窗外大樓
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
  }
  function staffDesk(ctx, t) { // 她的辦公桌(在她身後)
    const top = 1112;
    G.rrect(ctx, 620, top + 30, 380, GROUND - top - 26, 4, { fill: '#8E6444', lw: 5, seed: 121 });
    G.rrect(ctx, 600, top, 420, 38, 8, { fill: '#B98A5E', lw: 6, seed: 120 });
    G.rrect(ctx, 870, top - 46, 20, 46, 3, { fill: '#5C6470', lw: 3, seed: 122 });
    G.rrect(ctx, 832, top - 10, 96, 12, 4, { fill: '#5C6470', lw: 3, seed: 123 });
    G.rrect(ctx, 786, top - 172, 188, 130, 10, { fill: '#3A3A44', lw: 5, seed: 124 });
    G.rrect(ctx, 798, top - 160, 164, 106, 6, { fill: '#BFE3F0', lw: 0, seed: 125 });
    for (let k = 0; k < 3; k++) fillRect(ctx, 814, top - 140 + k * 24, 90 + (k % 2) * 40, 9, '#8DB4D8');
    G.rrect(ctx, 640, top - 54, 46, 56, 8, { fill: '#F2C230', lw: 4, seed: 126 }); // 筆筒
    for (const [dx, c] of [[-8, BLUE], [6, RED]]) G.line(ctx, [[663 + dx, top - 54], [660 + dx * 2, top - 92]], { color: c, lw: 6, seed: 127 + dx });
  }
  function restArea(ctx) { // 第 3 集的休息區:帽子掛在牆上
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#F3E6CB'], [1, '#EAD7B4']]));
    G.rrect(ctx, -30, 1010, W + 60, 300, 0, { fill: '#D2B58A', lw: 5, seed: 601 }); // 腰板
    for (let k = 0; k < 8; k++) G.line(ctx, [[60 + k * 140, 1016], [60 + k * 140, 1296]], { color: '#B0946A', lw: 3, seed: 602 + k, alpha: 0.6 });
    G.rrect(ctx, 410, 470, 270, 290, 12, { fill: '#B98A5E', lw: 6, seed: 611 }); // 窗
    fillRect(ctx, 428, 488, 234, 254, lin(ctx, 0, 488, 0, 742, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    G.ellipse(ctx, 610, 700, 70, 52, { fill: '#8FC49A', lw: 0, seed: 612 }); G.ellipse(ctx, 500, 720, 60, 40, { fill: '#A5D3A6', lw: 0, seed: 613 });
    G.line(ctx, [[545, 488], [545, 742]], { color: '#B98A5E', lw: 9, seed: 614 });
    G.rrect(ctx, 404, 754, 282, 18, 4, { fill: '#B98A5E', lw: 4, seed: 615 });
    ctx.save(); ctx.translate(272, 440); ctx.rotate(-0.02); // 牌子
    G.tornPaper(ctx, -118, -52, 236, 100, { fill: PAPER, seed: 620 });
    G.decor(() => label(ctx, '休息區', 0, 22, 60, INK));
    ctx.restore();
    helmet(ctx, 770, 560, '#F4F4F0', 630); helmet(ctx, 880, 560, '#F2C230', 640);
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B98A5E'], [1, '#8E6444']]));
    floorLines(ctx, '#6E4C34', 650);
  }
  function helmet(ctx, x, y, col, seed) { // 掛在牆上的安全帽
    G.line(ctx, [[x, y - 54], [x, y - 30]], { color: '#6C7680', lw: 8, seed });
    const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + Math.PI * k / 12; pts.push([x + Math.cos(a) * 52, y + Math.sin(a) * 46]); }
    G.shape(ctx, pts, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, x - 64, y - 6, 128, 16, 8, { fill: col, lw: 4, seed: seed + 2 });
  }
  const TABLE_Y = 1085, CUPX = [590, 712];
  function stool(ctx, x) { G.rrect(ctx, x - 66, 1072, 132, 26, 8, { fill: '#8E6444', lw: 4, seed: 660 + x }); for (const sd of [-1, 1]) G.rrect(ctx, x + sd * 48 - 9, 1096, 18, 206, 3, { fill: '#7A553A', lw: 4, seed: 662 + x + sd }); }
  function teapot(ctx, x, y, rot = 0, lid = true) { // 茶壺:原點在壺身中央
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    G.ellipse(ctx, -52, 0, 18, 22, { fill: 'rgba(0,0,0,0)', stroke: '#6E3A26', lw: 9, seed: 675 });
    G.poly(ctx, [[36, 6], [74, -26], [82, -18], [46, 22]], { fill: '#8A4B32', lw: 4, seed: 676 });
    G.ellipse(ctx, 0, 0, 50, 40, { fill: '#8A4B32', lw: 5, seed: 677 });
    if (lid) { G.ellipse(ctx, 0, -38, 30, 9, { fill: '#6E3A26', lw: 4, seed: 678 }); G.ellipse(ctx, 0, -50, 8, 8, { fill: '#6E3A26', lw: 3, seed: 679 }); }
    else G.ellipse(ctx, 0, -38, 30, 8, { fill: '#3A2A20', lw: 4, seed: 678 });
    ctx.restore();
  }
  const SPOUT = [78, -22], POT_HANDLE = [-52, 0];
  const rotP = (p, r) => [p[0] * Math.cos(r) - p[1] * Math.sin(r), p[0] * Math.sin(r) + p[1] * Math.cos(r)];
  function kettle(ctx, x, y, rot) { // 熱水壺:以提把為原點
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    G.line(ctx, [[-34, 26], [-30, -2], [30, -2], [34, 26]], { color: '#3A3A44', lw: 9, seed: 710 });
    G.poly(ctx, [[-40, 46], [-78, 30], [-74, 20], [-38, 28]], { fill: '#AEB9C3', lw: 4, seed: 711 });
    G.rrect(ctx, -44, 22, 88, 76, 18, { fill: '#AEB9C3', lw: 5, seed: 712 });
    G.line(ctx, [[-30, 38], [30, 38]], { color: '#FFFFFF', lw: 5, seed: 713, alpha: 0.7 });
    ctx.restore();
  }
  function teaTable(ctx, t, fills) { // 桌子、茶盤、兩個杯子
    for (const lx of [176, 876]) G.rrect(ctx, lx, TABLE_Y + 30, 30, GROUND - TABLE_Y - 26, 4, { fill: '#8E6444', lw: 4, seed: 670 + lx });
    G.rrect(ctx, 140, TABLE_Y, 800, 40, 8, { fill: '#B98A5E', lw: 6, seed: 672 });
    G.rrect(ctx, 520, TABLE_Y - 16, 270, 18, 6, { fill: '#6E4C34', lw: 4, seed: 684 });
    CUPX.forEach((x, k) => {
      const f = fills[k], y = TABLE_Y - 16;
      G.poly(ctx, [[x - 23, y - 44], [x + 23, y - 44], [x + 17, y], [x - 17, y]], { fill: PAPER, lw: 4, seed: 690 + k, amp: 0.5 });
      G.ellipse(ctx, x, y - 44, 22, 7, { fill: f > 0.25 ? '#C98A3A' : '#E9E2D0', lw: 3, seed: 700 + k, amp: 0.4 });
      if (f >= 1) steam(ctx, x - 5, y - 54, t, k, 0.75);
    });
  }

  // ---------- 0:阿樹當課長後,最常講的一句話是:這個你處理一下 ----------
  const SX0 = 250, SX = 430, FX = 760, SS = 1.05;
  const HOLD_SHU = [48, -232], REACH_SHU = [120, -235], REACH_STAFF = [92, -238], HOLD_STAFF = [60, -228], STACK_HW = 68 * SS * 0.95;
  function handoverState(t) {
    const wu = clamp((t - ev.walk) / 1.0), turned = t >= ev.turn;
    const x = turned ? SX - 450 * (t - ev.turn) : lerp(SX0, SX, ease.inOutQuad(wu));
    const walking = (wu > 0 && wu < 1) || turned;
    const walk = turned ? ((SX - x) / (300 * SS)) % 1 : ((x - SX0) / 180) % 1;
    const shu = { x, y: GROUND, s: SS, sx: turned ? -1 : 1, pose: walking ? 'walk' : 'stand', walk, style: CAST.shuChief, seed: 400, blush: 0.6, blink: blink(t, 0.2) };
    const fo = { x: FX, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.5, blink: blink(t, 0.7) };
    const ext = ease.inOutCubic(clamp((t - (ev.hand - 0.45)) / 0.4));   // 把資料伸出去
    const mv = ease.inOutCubic(clamp((t - (ev.hand - 0.05)) / 0.3));   // 交到她手上
    const pull = ease.inOutCubic(clamp((t - (ev.hand + 0.25)) / 0.4)); // 她抱回胸前
    const still = { ...shu, x: SX, pose: 'stand', sx: 1 };
    let st;
    if (mv <= 0) { const l = mix2(HOLD_SHU, REACH_SHU, ext); st = world(shu, l[0], l[1]); }
    else {
      const p0 = world(still, ...REACH_SHU), p1 = world(fo, ...REACH_STAFF), p2 = world(fo, ...HOLD_STAFF);
      st = mv < 1 ? [lerp(p0[0], p1[0], mv), lerp(p0[1], p1[1], mv) - Math.sin(Math.PI * mv) * 16] : mix2(p1, p2, pull);
    }
    return { shu, fo, st, ext, mv, pull, turned };
  }
  function handover(ctx, t) {
    const { shu, fo, st, ext, mv, turned } = handoverState(t);
    officeDay(ctx); staffDesk(ctx, t);
    const shuHolds = mv < 0.45, gotIt = mv > 0.45, heavy = gotIt && !turned ? 1 : gotIt ? 0.6 : 0;
    // 阿樹
    Object.assign(shu, t < ev.walk ? { eyes: 'happy', mouth: 'grin', brows: 'up', look: 0.2 } : turned ? { eyes: 'happy', mouth: 'smile', brows: 'neutral', look: 0.5, gesture: 'wave' } : { eyes: 'normal', mouth: 'smile', brows: 'neutral', look: 0.7, lookY: 0.1 });
    if (shuHolds) { shu.handL = toLocal(shu, st[0] - STACK_HW, st[1] + 6); shu.handR = toLocal(shu, st[0] + STACK_HW, st[1] + 6); }
    else if (!turned) { const r = clamp((t - ev.hand - 0.05) / 0.35); shu.handL = mix2(toLocal(shu, st[0] - STACK_HW, st[1] + 6), [-92, -180], r); shu.handR = mix2([REACH_SHU[0] + 66, REACH_SHU[1] + 6], [92, -180], r); }
    // 部屬
    const watching = t >= ev.walk - 0.2;
    Object.assign(fo, !watching ? { eyes: 'normal', mouth: 'flat', brows: 'neutral', look: -0.55, lookY: 0.25 } : t < ev.hand - 0.45 ? { eyes: 'normal', mouth: 'smile', brows: 'neutral', look: 0.6 } : !turned ? { eyes: 'wide', mouth: 'o', brows: 'up', look: 0.45, lookY: 0.4, sweat: 0.5 } : { eyes: 'normal', mouth: 'wavy', brows: 'worried', look: 0.95, lookY: -0.05, sweat: 0.6, headRot: 0.04 });
    fo.legBend = 0.12 * heavy;
    if (gotIt) { fo.handR = toLocal(fo, st[0] - STACK_HW, st[1] + 6); fo.handL = toLocal(fo, st[0] + STACK_HW, st[1] + 6); }
    else if (ext > 0) { const r = ext; fo.handR = mix2([92, -180], [REACH_STAFF[0] + 66, REACH_STAFF[1] + 10], r); fo.handL = mix2([-92, -180], [REACH_STAFF[0] - 66, REACH_STAFF[1] + 10], r); }
    Ch.person(ctx, fo);
    person(ctx, shu);
    paperStack(ctx, st[0], st[1], SS * 0.95);
    const holder = shuHolds ? shu : fo;
    grip(ctx, holder, world(holder, ...holder.handL), 1); grip(ctx, holder, world(holder, ...holder.handR), 2);
    // 「課長」
    if (t >= ev.chief && t < ev.walk + 0.4) {
      const a = popIn(t, ev.chief, 0.3) * (1 - ease.inCubic(clamp((t - ev.walk) / 0.35)));
      ctx.save(); ctx.translate(SX0 + 8, 676); ctx.rotate(-0.04); ctx.scale(a, a);
      G.tornPaper(ctx, -106, -60, 212, 110, { fill: PAPER, seed: 420 });
      label(ctx, '課長', 0, 24, 76, RED);
      ctx.restore();
      for (let k = 0; k < 4; k++) { const o = clamp(1.5 - (t - ev.chief) * 1.1); if (o > 0) { ctx.save(); ctx.globalAlpha = o; G.star(ctx, SX0 + [-110, 108, -96, 100][k], 1000 + [0, -70, 140, 170][k], 22 * a, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 30 + k }); ctx.restore(); } }
    }
    // 她頭上的問號
    if (t >= ev.huh) { const a = popIn(t, ev.huh, 0.3); ctx.save(); ctx.translate(FX - 92, 712); ctx.rotate(-0.12 + Math.sin(t * 5) * 0.05); ctx.scale(a, a); label(ctx, '?', 0, 40, 120, RED, { stroke: '#FFFFFF', strokeW: 22 }); ctx.restore(); }
    finish(ctx);
  }

  // ---------- 1a:三天後(她埋頭做了三天) ----------
  function days(ctx, t) {
    officeDay(ctx);
    const n = ev.days.filter((d) => t >= d).length, x = 540, y = 1150, s = 1.1, ty = Math.sin(t * 38), ty2 = Math.sin(t * 38 + 2.1);
    G.rrect(ctx, x - 120, y - 250, 240, 250, 40, { fill: '#5C6470', lw: 5, seed: 1100 }); // 椅背
    Ch.person(ctx, { x, y, s, pose: 'sit', style: CAST.staff, seed: 520, eyes: 'normal', brows: 'determined', mouth: 'flat', look: 0.05, lookY: 0.8, sweat: 0.7, blush: 0.5, blink: 0, headY: ty * 1.5, shadow: false,
      handL: [-62, -86 + ty * 6], handR: [62, -86 + ty2 * 6] });
    const DT = 1068;
    G.rrect(ctx, 150, DT + 20, 780, GROUND - DT - 16, 4, { fill: '#8E6444', lw: 5, seed: 1101 });
    G.rrect(ctx, 130, DT, 820, 36, 8, { fill: '#B98A5E', lw: 6, seed: 1102 });
    G.rrect(ctx, 432, DT - 108, 216, 112, 10, { fill: '#8E99A3', lw: 5, seed: 1103 });           // 筆電(背面)
    G.ellipse(ctx, 540, DT - 54, 15, 15, { fill: '#D9DEE3', lw: 3, seed: 1104 });
    for (let p = 0; p < 2; p++) { // 越疊越高的資料
      const px = p ? 820 : 262, hgt = 26 + 34 * n + p * 8;
      for (let k = 0; k * 13 < hgt; k++) G.rrect(ctx, px - 74 + ((k * 7 + p * 3) % 9) - 4, DT - 13 - k * 13, 148, 13, 3, { fill: k % 3 ? PAPER : '#F1E8D2', lw: 2.5, seed: 1110 + k + p * 30 });
    }
    for (let k = 0; k < 3; k++) { const q = (t * 3 + k * 0.33) % 1; stroke(ctx, [[540 + (k - 1) * 80, DT - 128 - q * 30], [540 + (k - 1) * 92, DT - 150 - q * 30]], 'rgba(58,42,32,0.55)', 5); } // 打字的動作線
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(40,50,80,0.16)');
    ev.days.forEach((d, k) => { if (t >= d) dayCard(ctx, 300 + k * 240, 520 - (k % 2) * 22, [-0.07, 0.02, 0.08][k], popIn(t, d, 0.25), k + 1); });
    finish(ctx);
  }

  // ---------- 1b:部屬交出來的東西,完全不是他要的 ----------
  const HX = 340, HF = 700;
  const CLOUD = [318, 548, 400, 300], INSERT = [735, 548, 286, 330];
  function handInState(t) {
    const shu = { x: HX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuChief, seed: 400, blush: 0.6, blink: blink(t, 0.2) };
    const fo = { x: HF, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.6, blink: blink(t, 0.7) };
    const gu = ease.inOutCubic(clamp((t - ev.give) / 0.45)), tu = ease.inOutCubic(clamp((t - ev.take) / 0.45));
    const pH = world(fo, 58, -236), pG = world(fo, 140, -252), pR = world(shu, 96, -250);
    const sp = gu < 1 || t < ev.take ? mix2(pH, pG, gu) : mix2(pG, pR, tu);
    return { shu, fo, sp, gu, tu, took: t >= ev.take };
  }
  function handIn(ctx, t) {
    const { shu, fo, sp, took } = handInState(t);
    const dreaming = t >= ev.dream, revealed = t >= ev.reveal, wrong = t >= ev.wrong;
    officeDay(ctx); staffDesk(ctx, t);
    // 她:很得意地交出來
    Object.assign(fo, { eyes: 'happy', mouth: 'smile', brows: 'up', look: 0.6, lookY: 0.1 });
    if (!took) fo.handR = toLocal(fo, sp[0], sp[1] + 50);
    else fo.handR = mix2(toLocal(fo, sp[0], sp[1] + 50), [26, -200], clamp((t - ev.take) / 0.4));
    fo.handL = [-30, -214];
    // 阿樹
    const reach = ease.inOutCubic(clamp((t - (ev.take - 0.35)) / 0.35));
    Object.assign(shu, wrong ? { eyes: 'wide', mouth: 'o', brows: 'up', look: 0.25, lookY: 0.55, sweat: 0.9, headY: -6 } : revealed ? { eyes: 'normal', mouth: 'flat', brows: 'neutral', look: 0.25, lookY: 0.6 } : dreaming ? { eyes: 'happy', mouth: 'smile', brows: 'up', look: -0.2, lookY: -0.6 } : { eyes: 'normal', mouth: 'smile', brows: 'neutral', look: 0.6 });
    if (took) shu.handR = toLocal(shu, sp[0], sp[1] + 50);
    else if (reach > 0) shu.handR = mix2([92, -180], toLocal(shu, sp[0], sp[1] + 50), reach);
    Ch.person(ctx, fo);
    person(ctx, shu);
    sheet(ctx, sp[0], sp[1], SS, took ? -0.05 : 0.08);
    grip(ctx, took ? shu : fo, took ? world(shu, ...shu.handR) : world(fo, ...fo.handR), 3);
    // 想要的(雲)
    if (dreaming) {
      const a = popIn(t, ev.dream, 0.35), droop = wrong ? ease.outCubic(clamp((t - ev.wrong) / 0.45)) : 0;
      cloudTail(ctx, [[HX + 18, 776, 10], [HX - 2, 742, 15]], a, 1700);
      cloud(ctx, CLOUD[0], CLOUD[1], CLOUD[2], CLOUD[3], a, 1710, droop);
      if (a > 0.6) { ctx.save(); ctx.translate(CLOUD[0], CLOUD[1] + droop * 14); ctx.rotate(droop * 0.045); ctx.scale(a, a); neatTable(ctx, -136, -86, 272, 182, 1730); ctx.restore(); }
      tag(ctx, '想要的', CLOUD[0] - 6, CLOUD[1] - 168, 46, popIn(t, ev.dream + 0.15, 0.3), { fill: '#E3F2E6', color: GREEN, rot: -0.05, seed: 1740 });
    }
    // 拿到的(放大的那一張)
    if (revealed) {
      const a = popIn(t, ev.reveal, 0.3), [ix, iy, iw, ih] = INSERT;
      ctx.save(); ctx.globalAlpha = Math.min(1, a); G.line(ctx, [[sp[0] + 30, sp[1] - 40], [ix - iw / 2 + 20, iy + ih / 2 - 10]], { color: '#FFFFFF', lw: 8, seed: 1750, alpha: 0.95 }); ctx.restore();
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(0.03); ctx.scale(a, a);
      G.rrect(ctx, -iw / 2, -ih / 2, iw, ih, 8, { fill: PAPER, lw: 6, seed: 1751 });
      messyList(ctx, -iw / 2 + 22, -ih / 2 + 26, iw - 44, ih - 46, 1752);
      ctx.restore();
      tag(ctx, '拿到的', ix + 4, iy - ih / 2 - 4, 46, popIn(t, ev.reveal + 0.12, 0.3), { fill: '#FBE3DD', color: RED, rot: 0.04, seed: 1760 });
    }
    if (wrong) {
      neq(ctx, 532, 560, 1.15, popIn(t, ev.wrong, 0.25));
      const q = t - ev.wrong; if (q < 0.45) burst(ctx, HX, 870, 100 + q * 120, 140 + q * 170, 1 - q / 0.45, 10, INK, 7);
    }
    finish(ctx);
  }

  // ---------- 2:他忍不住唸了兩句:怎麼會做成這樣?(阿樹皺眉,部屬委屈) ----------
  function scold(ctx, t) {
    const nag = t >= ev.scold && t < E[2] + 0.1, yak = Math.floor(t * 6.5) % 2, tap = Math.max(U.pulse(t, ev.why + 0.12, 14), U.pulse(t, ev.why + 0.42, 14));
    const shu = { x: HX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuChief, seed: 400, blush: 0.4, blink: blink(t, 0.2),
      eyes: 'normal', brows: 'determined', mouth: nag ? (yak ? 'open' : 'flat') : 'flat', look: 0.65, lookY: 0.15, headRot: nag ? Math.sin(t * 7) * 0.03 : 0 };
    const sp = world(shu, 92, -330);
    shu.handL = toLocal(shu, sp[0] - 40, sp[1] + 30);
    shu.handR = toLocal(shu, sp[0] + 10, sp[1] + 4 + tap * 14); shu.gesture = 'point';
    const sulk = ease.inOutCubic(clamp((t - (ev.scold + 0.3)) / 0.6));
    const fo = { x: HF, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.7, blink: blink(t, 0.7),
      eyes: 'normal', brows: 'worried', mouth: 'wavy', look: lerp(0.6, 0.15, sulk), lookY: lerp(0, 0.95, sulk), headRot: -0.06 * sulk, headY: 6 * sulk, sweat: 0.8 * sulk,
      handL: [-14, -226], handR: [16, -232] };
    zoom(ctx, 520, 905, 1.32, () => {
      officeDay(ctx); staffDesk(ctx, t);
      Ch.person(ctx, fo);
      person(ctx, shu);
      sheet(ctx, sp[0], sp[1], SS, -0.08);
      grip(ctx, shu, world(shu, ...shu.handL), 4);
      anger(ctx, HX + 58, 812, 24, popIn(t, ev.scold, 0.25) * (1 + 0.08 * Math.sin(t * 9)));
      grumble(ctx, HX - 40, 700, 64, popIn(t, ev.grumble, 0.3), t);
      if (t >= ev.why) { const a = popIn(t, ev.why, 0.3); ctx.save(); ctx.translate(HX + 92, 706); ctx.rotate(0.12 + Math.sin(t * 6) * 0.04); ctx.scale(a, a); label(ctx, '?', 0, 44, 130, RED, { stroke: '#FFFFFF', strokeW: 24 }); ctx.restore(); }
    }, 880);
    finish(ctx);
  }

  // ---------- 3:「課長,你沒有說要做成怎樣。」(部屬對嘴) ----------
  function staffTalk(ctx, t) {
    const m = mouthOf('staff', t), up = ease.inOutCubic(clamp((t - ev.lookUp) / 0.35)), f = Math.sin(t * 5.5) * 6;
    const fo = { x: HF, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.75, blink: blink(t, 0.7),
      eyes: 'normal', brows: 'worried', mouth: m || 'wavy', look: lerp(0.2, 0.8, up), lookY: lerp(0.85, -0.1, up), headRot: lerp(-0.07, 0.02, up), headY: lerp(6, 0, up), sweat: 0.55,
      handL: [-22 + f, -232], handR: [24 - f, -240] };
    zoom(ctx, HF, 885, 2.05, () => { officeDay(ctx); staffDesk(ctx, t); Ch.person(ctx, fo); }, 820);
    finish(ctx);
  }

  // ---------- 4a:阿樹愣住了 → 倒帶 ----------
  function frozen(ctx, t) {
    officeDay(ctx);
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(60,90,150,0.22)');
    const on = t >= ev.freeze, rw = clamp((t - ev.rewind) / (ev.memory - ev.rewind)), sh = on ? Math.sin(t * 46) * 2.5 : 0, jx = rw > 0 ? Math.sin(t * 95) * 16 * rw : 0;
    person(ctx, { x: 540 + sh + jx, y: 1900, s: 2.05, pose: 'stand', style: CAST.shuChief, eyes: 'wide', mouth: on ? 'wavy' : 'o', brows: 'worried', look: 0, lookY: on ? -0.3 : 0, sweat: 1, blush: 0.3, blink: 0, seed: 400, shadow: false });
    if (on) shock(ctx, 540 + sh + jx, 1072, 190, popIn(t, ev.freeze, 0.25));
    finish(ctx, 'rgba(150,190,255,0.10)');
    rewindFX(ctx, t, ease.inCubic(rw));
  }

  // ---------- 4b:回想:當時講的話,只有七個字 ----------
  const SEVEN = '這個你處理一下';
  function memory(ctx, t) {
    const u = ease.inOutQuad(clamp((t - ev.memory) / 2.4));
    officeDay(ctx); staffDesk(ctx, t);
    const shu = { x: SX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuChief, seed: 400, blush: 0.6, blink: 0, eyes: 'happy', mouth: 'smile', brows: 'neutral', look: 0.6 };
    const fo = { x: FX, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.5, blink: 0, eyes: 'wide', mouth: 'o', brows: 'up', look: 0.45, lookY: 0.4 };
    const l = [REACH_SHU[0] + 8 * u, REACH_SHU[1]], st = world(shu, l[0], l[1]);
    shu.handL = toLocal(shu, st[0] - STACK_HW, st[1] + 6); shu.handR = toLocal(shu, st[0] + STACK_HW, st[1] + 6);
    fo.handR = mix2([92, -180], [REACH_STAFF[0] + 66, REACH_STAFF[1] + 10], 0.7 + 0.3 * u); fo.handL = mix2([-92, -180], [REACH_STAFF[0] - 66, REACH_STAFF[1] + 10], 0.7 + 0.3 * u);
    Ch.person(ctx, fo);
    person(ctx, shu);
    paperStack(ctx, st[0], st[1], SS * 0.95);
    grip(ctx, shu, world(shu, ...shu.handL), 1); grip(ctx, shu, world(shu, ...shu.handR), 2);
    // 褪色成回憶
    ctx.save();
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.88; fillRect(ctx, -200, -200, W + 400, H + 400, '#808080');
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1; fillRect(ctx, -200, -200, W + 400, H + 400, '#F2DCB4');
    ctx.restore();
    fillRect(ctx, -200, -200, W + 400, H + 400, rad(ctx, 540, 860, 380, 1050, [[0, 'rgba(70,45,20,0)'], [1, 'rgba(70,45,20,0.55)']]));
    // 對話框:只有「這個你處理一下」
    const a = popIn(t, ev.bubble, 0.35), BX = 540, BY = 548, SZ = 84;
    speech(ctx, BX, BY, 690, 176, [SX + 34, 770], a, 1800);
    if (a > 0) {
      ctx.save(); ctx.translate(BX, BY); ctx.scale(a, a);
      for (let k = 0; k < 7; k++) {
        const cx = (k - 3) * SZ, on = t >= ev.count[k], b = on ? U.pulse(t, ev.count[k], 9) : 0;
        if (on) { ctx.save(); ctx.globalAlpha = 0.85; G.rrect(ctx, cx - SZ * 0.5, -SZ * 0.52, SZ, SZ * 1.04, 10, { fill: '#FFE08A', lw: 0, seed: 1810 + k }); ctx.restore(); }
        ctx.save(); ctx.translate(cx, 0); ctx.scale(1 + 0.22 * b, 1 + 0.22 * b); label(ctx, SEVEN[k], 0, SZ * 0.36, SZ, INK); ctx.restore();
      }
      ctx.restore();
    }
    stamp(ctx, '7 個字', 770, 706, 58, -0.1, t, ev.seven);
    rewindFX(ctx, t, 1 - ease.outCubic(clamp((t - ev.memory) / 0.35)));
  }

  // ---------- 5–6:休息區。師傅泡茶,頭也沒抬 → 「你要的東西只在你腦袋裡,他怎麼看得到?」 ----------
  const M = [285, 1070, 1.35], SHT = [770, 1070, 1.3], POT0 = [425, TABLE_Y - 40];
  function teaScene(ctx, t, talkShot) {
    restArea(ctx);
    stool(ctx, M[0]); stool(ctx, SHT[0]);
    const m = talkShot ? mouthOf('master', t) : null, look = talkShot && t >= ev.see;
    let handR, potC = POT0, potR = 0, kettleAt = [214, TABLE_Y - 100, 0], stream = null, fill = [1, 0];
    if (!talkShot) { // 沖熱水進茶壺
      const tilt = ease.inOutCubic(clamp((t - ev.pour) / 0.35)) * (1 - ease.inOutCubic(clamp((t - ev.pour - 1.4) / 0.35)));
      const kx = lerp(505, 492, tilt), ky = lerp(905, 925, tilt);
      kettleAt = [kx, ky, -0.5 * tilt]; handR = hand(M[0], M[1], M[2], 1, kx, ky);
      if (tilt > 0.6) stream = [[kx - 44, ky + 56], [kx - 58, ky + 82], [427, 1006]];
      fill = [0, 0];
    } else { // 倒一杯給阿樹,說完才把壺放下、抬頭
      const lift = ease.inOutCubic(clamp((t - ev.cup + 0.3) / 0.4)), back = ease.inOutCubic(clamp((t - (ev.see - 0.45)) / 0.45));
      const k = lift * (1 - back), tilt = 0.55 * ease.inOutCubic(clamp((t - ev.cup) / 0.25)) * (1 - back);
      potC = mix2(POT0, [627, 963], k); potR = tilt;
      const hd = rotP(POT_HANDLE, potR);
      handR = hand(M[0], M[1], M[2], 1, potC[0] + hd[0], potC[1] + hd[1] + 6);
      const pouring = t >= ev.cup + 0.15 && t < ev.see - 0.5;
      if (pouring) { const tp = rotP(SPOUT, potR); stream = [[potC[0] + tp[0], potC[1] + tp[1]], [potC[0] + tp[0] + 6, potC[1] + tp[1] + 20], [CUPX[1], TABLE_Y - 64]]; }
      fill = [1, clamp((t - ev.cup - 0.25) / 0.8)];
    }
    // 師傅:眼睛一直看著茶,到最後一句才抬頭
    Ch.person(ctx, { x: M[0], y: M[1], s: M[2], pose: 'sit', style: CAST.masterRest, handR,
      eyes: 'normal', mouth: m || (look ? 'smile' : 'flat'), brows: look ? 'up' : 'neutral', look: look ? 0.8 : 0.55, lookY: look ? 0 : 0.95, headRot: look ? 0.02 : 0.07, headY: look ? 0 : 5,
      blink: blink(t, 0.6), blush: 0.4, seed: 440, shadow: false });
    // 阿樹:先抱怨;師傅開口後安靜聽,最後恍然
    const rant = !talkShot && t < ev.noLook + 0.25, wait = !talkShot && !rant, yak = Math.floor(t * 6) % 2, got = talkShot && t >= ev.see + 0.35;
    const so = { x: SHT[0], y: SHT[1], s: SHT[2], sx: -1, pose: 'sit', style: CAST.shuChief, seed: 400, shadow: false, blush: 0.6, blink: blink(t, 0.2),
      eyes: rant ? 'normal' : got ? 'wide' : 'normal', mouth: rant ? (yak ? 'o' : 'wavy') : got ? 'o' : 'flat', brows: rant ? 'worried' : got ? 'up' : 'worried',
      look: 0.8, lookY: wait ? 0.25 : 0, headRot: rant ? 0.08 + Math.sin(t * 7) * 0.03 : 0.03, sweat: rant ? 0.8 : 0.2 };
    if (rant) { so.handR = [120, -112 + Math.sin(t * 7) * 16]; so.handL = [-120, -112 + Math.sin(t * 7 + 1.4) * 14]; }
    else so.handR = [96, -40];
    person(ctx, so);
    if (rant) { const hp = world(so, ...so.handR); sheet(ctx, hp[0] - 6, hp[1] - 44, 0.95, 0.25 + Math.sin(t * 7) * 0.08, 1520); grip(ctx, so, hp, 5); }
    teaTable(ctx, t, fill);
    if (!talkShot) { G.ellipse(ctx, POT0[0] - 92, TABLE_Y - 8, 30, 9, { fill: '#6E3A26', lw: 4, seed: 680 }); G.ellipse(ctx, POT0[0] - 92, TABLE_Y - 20, 8, 8, { fill: '#6E3A26', lw: 3, seed: 681 }); }
    if (stream) G.line(ctx, stream, { color: talkShot ? '#C98A3A' : '#BFE6F7', lw: 9, seed: 720, amp: 0.8 });
    teapot(ctx, potC[0], potC[1], potR, talkShot);
    kettle(ctx, kettleAt[0], kettleAt[1], kettleAt[2]);
    if (!talkShot && t > ev.pour + 0.3) for (let k = 0; k < 3; k++) steam(ctx, 400 + k * 26, 1000, t, k, 0.8);
    if (talkShot) for (let k = 0; k < 2; k++) steam(ctx, 470 + k * 14, TABLE_Y - 74, t, k + 4, 0.5);
    if (talkShot) {
      // 只在你腦袋裡
      const a = popIn(t, ev.cloud, 0.35);
      if (t >= ev.cloud) {
        cloudTail(ctx, [[716, 606, 11], [700, 574, 16]], a, 1900);
        cloud(ctx, 712, 448, 330, 236, a, 1910);
        if (a > 0.6) { ctx.save(); ctx.translate(712, 448); ctx.scale(a, a); neatTable(ctx, -102, -64, 204, 134, 1930); ctx.restore(); }
      }
      // 他怎麼看得到?
      if (t >= ev.see) {
        const b = popIn(t, ev.see, 0.3);
        ctx.save(); ctx.translate(486, 520); ctx.scale(b, b);
        G.ellipse(ctx, 0, 0, 66, 66, { fill: '#FFFFFF', lw: 5, seed: 1940 });
        pawn(ctx, 0, 48, 0.82, PINK, 1941);
        label(ctx, '?', 62, -26, 96, RED, { stroke: '#FFFFFF', strokeW: 18 });
        ctx.restore();
      }
    }
    finish(ctx, 'rgba(255,200,120,0.20)');
  }
  const tea = (ctx, t) => teaScene(ctx, t, false);
  function teaTalk(ctx, t, s) {
    const z = lerp(1.03, 1.08, s.u);
    ctx.save(); ctx.translate(540, 1040); ctx.scale(z, z); ctx.translate(-540, -1040);
    teaScene(ctx, t, true);
    ctx.restore();
  }

  // ---------- 7:從此阿樹交辦事情,固定講五件事(拿出一張小卡) ----------
  function cardShot(ctx, t) {
    const c0 = ev.cardOut, toPocket = ease.inOutCubic(clamp((t - c0) / 0.3)), up = ease.inOutCubic(clamp((t - c0 - 0.35) / 0.45));
    const shown = t >= ev.cardShow, pu = ease.inOutCubic(clamp((t - (ev.cardShow + 0.55)) / 1.1));
    const shu = { x: SX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuChief, seed: 400, blush: 0.6, blink: blink(t, 0.2),
      eyes: shown ? 'happy' : 'normal', mouth: shown ? 'grin' : 'smile', brows: 'up', look: up > 0.5 ? 0.75 : 0.3, lookY: up > 0.5 ? -0.2 : 0.4 };
    const REST = [92, -180], POCKET = [40, -262], SHOW = [128, -372];
    shu.handR = up > 0 ? mix2(POCKET, SHOW, up) : mix2(REST, POCKET, toPocket);
    const fo = { x: FX, y: GROUND, s: SS, sx: -1, pose: 'stand', style: CAST.staff, seed: 520, blush: 0.5, blink: blink(t, 0.7),
      eyes: shown ? 'normal' : 'normal', mouth: 'smile', brows: shown ? 'up' : 'neutral', look: 0.6, lookY: up > 0.5 ? -0.2 : 0.1,
      handR: [64, -232], handL: [-6, -206 + Math.sin(t * 9) * (shown ? 4 : 0)] };
    const cardW = world(shu, ...shu.handR);
    zoom(ctx, lerp(540, 600, pu), lerp(880, 860, pu), lerp(1, 1.22, pu), () => {
      officeDay(ctx); staffDesk(ctx, t);
      Ch.person(ctx, fo);
      const nb = world(fo, 34, -236); // 她的筆記本
      G.rrect(ctx, nb[0] - 36, nb[1] - 46, 72, 92, 6, { fill: '#5B8FD0', lw: 4, seed: 1620 });
      fillRect(ctx, nb[0] - 26, nb[1] - 34, 52, 14, PAPER);
      grip(ctx, fo, world(fo, ...fo.handR), 6);
      G.line(ctx, [world(fo, ...fo.handL), [world(fo, ...fo.handL)[0] + 8, world(fo, ...fo.handL)[1] - 40]], { color: BLUE, lw: 7, seed: 1621 });
      grip(ctx, fo, world(fo, ...fo.handL), 7);
      person(ctx, shu);
      if (t >= c0 + 0.28) { smallCard(ctx, cardW[0] + 4, cardW[1] - 30, SS * (1 + 0.5 * up), lerp(0.3, -0.06, up)); grip(ctx, shu, cardW, 8); }
      if (shown) { tag(ctx, '交辦五件事', 600, 690, 58, popIn(t, ev.cardShow, 0.3), { fill: PAPER, color: RED, rot: -0.03, seed: 1630 }); for (let k = 0; k < 3; k++) { const b = popIn(t, ev.cardShow + 0.1 + k * 0.08, 0.25); G.star(ctx, 600 + [-190, 196, 170][k], 690 + [-46, -40, 50][k], 18 * b, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 60 + k }); } }
    });
    finish(ctx);
  }

  // ---------- 8:為什麼要做、做到什麼程度、什麼時候要、可以用什麼資源、什麼時候回報 ----------
  const ITEMS = [['目的', '為什麼要做'], ['標準', '做到什麼程度'], ['期限', '什麼時候要'], ['資源', '可以用什麼資源'], ['回報', '什麼時候回報']];
  const CARD = { x: 258, y: 356, w: 632, h: 812, top: 118, rh: 136 };
  function five(ctx, t) {
    officeDay(ctx);
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(255,250,235,0.25)');
    const n = ev.items.filter((x) => t >= x).length, all = t >= ev.ticks[4] + 0.45;
    // 阿樹在左邊,指著現在講到的那一項
    const px = 158, s = 0.94, row = Math.max(0, n - 1), rowY = CARD.y + CARD.top + row * CARD.rh + CARD.rh / 2;
    const hy = rowY + Math.sin(t * 3) * 4;
    const shu = { x: px, y: GROUND, s, pose: 'stand', style: CAST.shuChief, seed: 400, blush: 0.6, blink: blink(t, 0.2),
      eyes: all ? 'happy' : 'normal', mouth: all ? 'grin' : 'smile', brows: 'up', look: all ? 0.2 : 0.8, lookY: all ? 0 : clamp((hy - 900) / 300, -0.6, 0.6) };
    if (all) shu.gesture = 'thumbsUp'; else { shu.handR = hand(px, GROUND, s, 1, Math.min(CARD.x - 10, 244), clamp(hy, 860, 1120)); shu.gesture = 'point'; }
    person(ctx, shu);
    // 大卡片:從左下的小卡放大出來
    const a = popIn(t, A[8] - 0.12, 0.35), ox = CARD.x, oy = CARD.y + CARD.h * 0.62;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(a, a); ctx.translate(-ox, -oy);
    G.rrect(ctx, CARD.x + 8, CARD.y + 10, CARD.w, CARD.h, 16, { fill: 'rgba(30,20,15,0.22)', lw: 0, seed: 1990 });
    G.rrect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 16, { fill: PAPER, lw: 6, seed: 1991 });
    G.rrect(ctx, CARD.x + 4, CARD.y + 4, CARD.w - 8, CARD.top - 14, 12, { fill: '#F2C230', lw: 0, seed: 1992 });
    label(ctx, '交辦五件事', CARD.x + CARD.w / 2, CARD.y + 76, 62, INK);
    ITEMS.forEach(([lab, desc], k) => {
      const y = CARD.y + CARD.top + k * CARD.rh, cy = y + CARD.rh / 2, ti = ev.items[k], tk = ev.ticks[k];
      if (k) G.line(ctx, [[CARD.x + 18, y], [CARD.x + CARD.w - 18, y]], { color: '#E0D6C0', lw: 3, seed: 2000 + k, amp: 0.3 });
      if (t >= tk) { const g = clamp(1 - (t - tk) / 0.6); fillRect(ctx, CARD.x + 6, y + 4, CARD.w - 12, CARD.rh - 8, `rgba(62,155,95,${0.06 + 0.16 * g})`); }
      if (t < ti) { // 還沒講到:空白的格子
        G.ellipse(ctx, CARD.x + 56, cy, 30, 30, { fill: '#FFFFFF', stroke: '#C7BDA8', lw: 4, seed: 2010 + k, amp: 0.4 });
        ctx.save(); ctx.setLineDash([16, 12]); ctx.strokeStyle = '#D3C9B4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(CARD.x + 110, cy + 22); ctx.lineTo(CARD.x + CARD.w - 40, cy + 22); ctx.stroke(); ctx.restore();
        return;
      }
      const b = popIn(t, ti, 0.3), w = clamp((t - ti - 0.1) / 0.4);
      ctx.save(); ctx.translate(CARD.x + 108, cy + 34); ctx.scale(b, b); G.text(ctx, lab, 0, 0, { size: 88, fam: CJK, weight: 800, color: INK, boil: 0 }); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(CARD.x + 296, y, (CARD.w - 300) * w, CARD.rh); ctx.clip();
      G.text(ctx, desc, CARD.x + 300, cy + 22, { size: 41, fam: CJK, weight: 800, color: MUTED, boil: 0 });
      ctx.restore();
      if (t >= tk) tickMark(ctx, CARD.x + 56, cy, 30, popIn(t, tk, 0.25), 2020 + k);
      else G.ellipse(ctx, CARD.x + 56, cy, 30, 30, { fill: '#FFFFFF', stroke: '#C7BDA8', lw: 4, seed: 2010 + k, amp: 0.4 });
    });
    ctx.restore();
    finish(ctx);
  }

  // ---------- 9:結尾 ----------
  function closing(ctx, t) {
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, ev.card[0] - 0.1, 0.4);
    ctx.save(); ctx.translate(506, 362); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -420, 0, 840, 500, { fill: PAPER, seed: 801 });
    [['交辦不清楚', 136, 114, INK], ['做錯的責任', 284, 114, '#8E6444'], ['在交辦的人', 436, 122, RED]].forEach(([str, y, size, col], k) => {
      if (t < ev.card[k] - 0.1) return;
      const b = popIn(t, ev.card[k] - 0.1, 0.3);
      ctx.save(); ctx.translate(0, y - size * 0.36); ctx.scale(b, b); label(ctx, str, 0, size * 0.36, size, col); ctx.restore();
    });
    ctx.restore();
    Ch.person(ctx, { x: 205, y: GROUND + 76, s: 0.92, pose: 'stand', style: CAST.masterRest, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    // 部屬:這次拿著整齊的表格
    const fo = { x: 520, y: GROUND + 76, s: 0.9, pose: 'stand', style: CAST.staff, eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 520 };
    const tb = [520, 1010 + Math.sin(t * 3) * 4];
    fo.handL = hand(fo.x, fo.y, fo.s, 1, tb[0] - 70, tb[1] + 40); fo.handR = hand(fo.x, fo.y, fo.s, 1, tb[0] + 70, tb[1] + 40);
    Ch.person(ctx, fo);
    G.rrect(ctx, tb[0] - 92, tb[1] - 64, 184, 128, 8, { fill: PAPER, lw: 4, seed: 2101 });
    neatTable(ctx, tb[0] - 78, tb[1] - 52, 156, 104, 2102);
    grip(ctx, fo, [tb[0] - 70, tb[1] + 40], 9); grip(ctx, fo, [tb[0] + 70, tb[1] + 40], 10);
    tickMark(ctx, tb[0] + 92, tb[1] - 64, 26, popIn(t, ev.card[2] + 0.3, 0.25), 2110);
    // 阿樹:拿著那張小卡
    const so = { x: 838, y: GROUND + 76, s: 0.92, sx: -1, pose: 'stand', style: CAST.shuChief, eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 };
    const cp = [838 - 112, 1000 + Math.sin(t * 4) * 5];
    so.handR = hand(so.x, so.y, so.s, -1, cp[0], cp[1] + 26);
    person(ctx, so);
    smallCard(ctx, cp[0], cp[1], 1.15, 0.08);
    grip(ctx, so, [cp[0], cp[1] + 26], 11);
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1474); ctx.scale(b, b); label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 }); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: handover, cam: Shots.push(1.0, 1.03) },
    { at: A[1] - 0.15, draw: days, in: 'whip' },
    { at: ev.inShot, draw: handIn, in: 'cut' },
    { at: A[2] - 0.15, draw: scold, in: 'cut' },
    { at: A[3] - 0.15, draw: staffTalk, in: 'cut' },
    { at: A[4] - 0.15, draw: frozen, in: 'cut' },
    { at: ev.memory, draw: memory, in: 'cut' },
    { at: A[5] - 0.15, draw: tea, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[6] - 0.15, draw: teaTalk, in: 'cut' },
    { at: A[7] - 0.15, draw: cardShot, in: 'paper' },
    { at: A[8] - 0.15, draw: five, in: 'zoom' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配(太長的短句在 CUT 指定的位置再切一次)
  const CUT = { '你要的東西只在你腦袋裡': 5 };
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
