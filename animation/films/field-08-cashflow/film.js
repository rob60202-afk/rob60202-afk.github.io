// 工程現場故事 第 5 集:只差一個扣環。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', BLUE = '#2B5FA8';
  const YELLOW = '#F2C230', ORANGE = '#F28C28', LAN = '#FFD84A', TUBE = '#8E99A3';
  // 施工架:平台、立柱、爬梯、頭頂的錨點
  const DECK = 900, SX0 = 330, SX1 = 800, RAIL_TOP = DECK - 190, RAIL_MID = DECK - 100, TOE = 34;
  const LX = 255, LAD_TOP = 640, BLOCK_Y = 250, RING_IDLE = [LX, 1010];
  const PIPE_Y = 640, BOLT = [575, 640];
  let VO = null, SUBS = [];

  // ---------- 角色(與前幾集相同的造型;進現場一律戴安全帽) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CAST = {
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },       // 阿樹:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },     // 師傅:白色安全帽
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
  function armOf(o, side, target) { // 與引擎相同的手臂 IK(side: -1 左、1 右)
    const bw = BW[o.style.build] || 1, sh = hipOf(o) - 172, S0 = [side * 70 * bw, sh + 16];
    return Ch.ik(S0, target, 82, 80, side < 0 ? (target[1] < sh ? -1 : 1) : (target[1] < sh ? 1 : -1));
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
  // 安全掛鉤:原點 = 接織帶的孔,鉤身朝 +y;open 0..1 = 開口的保險片往內推
  function snapHook(ctx, x, y, rot, s, open = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const body = () => { ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(-12, 60); ctx.arc(8, 64, 20, Math.PI, -0.3 * Math.PI, true); };
    const ga = open * 0.62, gx = 18 * Math.cos(ga) - 32 * Math.sin(ga), gy = 18 * Math.sin(ga) + 32 * Math.cos(ga);
    const gate = () => { ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(2 + gx, 14 + gy); };
    ctx.strokeStyle = INK; ctx.lineWidth = 15; body(); ctx.stroke();
    ctx.lineWidth = 11; gate(); ctx.stroke();
    ctx.strokeStyle = '#C3CAD2'; ctx.lineWidth = 9; body(); ctx.stroke();
    ctx.strokeStyle = '#EEF1F4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, 16); ctx.lineTo(-11, 54); ctx.stroke();
    ctx.strokeStyle = '#E9A23B'; ctx.lineWidth = 5.5; gate(); ctx.stroke();
    ctx.fillStyle = '#C3CAD2'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function ringShape(ctx, x, y, r) { // 錨點的掛環
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.5 + 7; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = r * 0.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(x, y, r * 1.08, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  const RR = 17;
  function lifeline(ctx, R) { // 頭頂的錨點(固定在梁上)→ 鋼索 → 掛環
    stroke(ctx, [[LX, BLOCK_Y + 44], [R[0], R[1] - RR - 16]], INK, 6);
    stroke(ctx, [[LX, BLOCK_Y + 44], [R[0], R[1] - RR - 16]], '#AEB6BF', 2.5);
    G.rrect(ctx, R[0] - 7, R[1] - RR - 22, 14, 18, 4, { fill: '#5C6470', lw: 3, seed: 961 });
    ringShape(ctx, R[0], R[1], RR);
  }
  function anchorBlock(ctx) {
    G.rrect(ctx, LX - 44, BLOCK_Y - 40, 88, 22, 4, { fill: '#5C6470', lw: 4, seed: 951 });   // 夾在梁上的固定座
    for (const bx of [-30, 30]) G.ellipse(ctx, LX + bx, BLOCK_Y - 29, 5, 5, { fill: '#D9DEE3', lw: 2, seed: 952 + bx, amp: 0.2 });
    G.rrect(ctx, LX - 9, BLOCK_Y - 6, 18, 16, 3, { fill: '#5C6470', lw: 3, seed: 953 });
    G.rrect(ctx, LX - 30, BLOCK_Y + 4, 60, 46, 14, { fill: ORANGE, lw: 4, seed: 954 });
    G.ellipse(ctx, LX, BLOCK_Y + 27, 11, 11, { fill: '#FFE1B8', lw: 3, seed: 955, amp: 0.2 });
  }
  function lanyardTo(ctx, B, R, s) { // 扣上的樣子:背後的織帶 → 掛鉤 → 掛環
    const dx = R[0] - B[0], dy = R[1] - B[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const hs = 0.62 * s, rot = Math.atan2(uy, ux) - Math.PI / 2;
    const qx = R[0] - ux * RR, qy = R[1] - uy * RR;                         // 掛環靠近人的那一側
    const c = Math.cos(rot), sn = Math.sin(rot), bx = 8 * hs, by = 80 * hs; // 鉤底的內緣
    const ex = qx - (bx * c - by * sn), ey = qy - (bx * sn + by * c);
    const mx = (B[0] + ex) / 2 + uy * 10, my = (B[1] + ey) / 2 - ux * 10;
    G.limb(ctx, [B, [mx, my], [ex, ey]], { color: LAN, lw: 9 * s, outline: 3, seed: 941 });
    snapHook(ctx, ex, ey, rot, hs, 0);
  }
  function dangle(ctx, o, t, { sd = -1, amp = 0.22, hs = 0.62 } = {}) { // 沒扣:掛鉤垂在腰邊晃
    const bw = BW[o.style.build] || 1, hip = hipOf(o);
    local(ctx, o, () => {
      const S0 = [sd * 70 * bw, hip - 70], P = [sd * 100 * bw, hip - 26];
      G.limb(ctx, [S0, [sd * 106 * bw, hip - 64], P], { color: LAN, lw: 9, outline: 3, seed: 931 });
      snapHook(ctx, P[0], P[1], Math.sin(t * 5.2) * amp - (o.rot || 0), hs, 0);
    });
  }
  function harness(ctx, o) { // 全身式背負安全帶:肩帶、胸帶、腰帶、腿環
    const bw = BW[o.style.build] || 1, hip = hipOf(o), sh = hip - 172, seated = hip === 0, sd0 = o.seed || 0;
    const strap = (pts, lw, k) => G.limb(ctx, pts, { color: ORANGE, lw, outline: 3, seed: sd0 + 900 + k });
    local(ctx, o, () => {
      if (!seated) for (const sd of [-1, 1]) {
        strap([[sd * 62 * bw, hip - 28], [sd * 60, hip + 52]], 9, 1 + sd);
        strap([[sd * 16, hip + 44], [sd * 60, hip + 56]], 10, 4 + sd);
      }
      for (const sd of [-1, 1]) strap([[sd * 46 * bw, sh + 4], [sd * 34 * bw, sh + 84], [sd * 42 * bw, hip - 32]], 12, 7 + sd);
      strap([[-36 * bw, sh + 78], [36 * bw, sh + 78]], 10, 10);
      strap([[-74 * bw, hip - 30], [74 * bw, hip - 30]], 14, 11);
      G.rrect(ctx, -9, sh + 68, 18, 20, 3, { fill: '#D9DEE3', lw: 3, seed: sd0 + 912 });
      G.rrect(ctx, -13, hip - 42, 26, 24, 4, { fill: '#D9DEE3', lw: 3, seed: sd0 + 913 });
    });
  }
  // 穿著安全帶的人。hook: 'dangle' 沒扣 | 'clip' 扣在 ring 上 | 'none'
  function worker(ctx, o, t, { hook = 'none', ring = null, amp = 0.22, sd = -1 } = {}) {
    if (hook === 'clip' && ring) { lifeline(ctx, ring); lanyardTo(ctx, world(o, 0, hipOf(o) - 172 + 34), ring, o.s); }
    Ch.person(ctx, o);
    harness(ctx, o);
    if (hook === 'dangle') dangle(ctx, o, t, { amp, sd });
  }

  // ---------- 場景 ----------
  function fab(ctx, t) { // 與前幾集同一座廠房;這次要鎖的是牆上高處那一排管
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
    for (const hx of [470, 690, 900]) G.line(ctx, [[hx, 444], [hx, PIPE_Y - 16]], { color: '#6C7680', lw: 6, seed: 340 + hx }); // 吊架
    pipeSeg(ctx, 400, BOLT[0], PIPE_Y, 34, 385, { flanges: false }); pipeSeg(ctx, BOLT[0], W + 40, PIPE_Y, 34, 386, { flanges: false });
    G.rrect(ctx, 392, PIPE_Y - 22, 16, 44, 4, { fill: '#8E99A3', lw: 4, seed: 387 });
    for (const fx of [-9, 9]) G.rrect(ctx, BOLT[0] + fx - 8, PIPE_Y - 30, 16, 60, 4, { fill: '#8E99A3', lw: 4, seed: 388 + fx }); // 法蘭
    for (const by of [-22, 22]) G.rrect(ctx, BOLT[0] - 21, PIPE_Y + by - 5, 42, 10, 3, { fill: '#5C6470', lw: 3, seed: 390 + by });   // 螺栓
  }
  function scaffoldBack(ctx) { // 人後面的部分:底座、斜撐、立柱、平台、爬梯
    for (const x of [SX0, SX1]) G.rrect(ctx, x - 40, GROUND - 12, 80, 12, 3, { fill: '#6C7680', lw: 4, seed: 500 + x });
    G.line(ctx, [[SX0, DECK + 40], [SX1, GROUND - 30]], { color: TUBE, lw: 9, seed: 503 });
    G.line(ctx, [[SX1, DECK + 40], [SX0, GROUND - 30]], { color: TUBE, lw: 9, seed: 504 });
    G.rrect(ctx, SX0, 1096, SX1 - SX0, 14, 6, { fill: TUBE, lw: 4, seed: 505 });
    for (const x of [SX0, SX1]) G.rrect(ctx, x - 10, RAIL_TOP - 14, 20, GROUND - 12 - RAIL_TOP + 14, 5, { fill: '#7F8B96', lw: 4, seed: 506 + x });
    G.rrect(ctx, SX0 - 16, DECK, SX1 - SX0 + 32, 26, 4, { fill: '#B98A5E', lw: 5, seed: 510 }); // 踏板
    G.line(ctx, [[SX0 - 8, DECK + 13], [SX1 + 8, DECK + 13]], { color: '#8E6444', lw: 3, seed: 511, alpha: 0.7 });
    // 爬梯:兩側扶手高出平台,上下兩處固定在立柱上
    for (const y of [DECK - 60, 1150]) G.rrect(ctx, LX + 43, y - 7, SX0 - LX - 43, 14, 4, { fill: ORANGE, lw: 3, seed: 520 + y });
    for (let y = GROUND - 52; y > LAD_TOP + 20; y -= 54) G.rrect(ctx, LX - 43, y - 6, 86, 12, 5, { fill: '#B4BBC3', lw: 3.5, seed: 530 + y });
    for (const sd of [-1, 1]) {
      G.rrect(ctx, LX + sd * 43 - 8, LAD_TOP, 16, GROUND - LAD_TOP - 8, 6, { fill: '#D3D8DD', lw: 4, seed: 560 + sd });
      G.rrect(ctx, LX + sd * 43 - 14, GROUND - 14, 28, 14, 4, { fill: '#3A3A44', lw: 3, seed: 563 + sd }); // 防滑腳
    }
  }
  function rails(ctx) { // 人前面的部分:上欄杆、中欄杆、腳趾板
    G.rrect(ctx, SX0 - 6, DECK - TOE, SX1 - SX0 + 12, TOE, 3, { fill: '#C98A3A', lw: 4, seed: 580 });
    G.rrect(ctx, SX0 - 6, RAIL_MID, SX1 - SX0 + 12, 14, 7, { fill: YELLOW, lw: 4, seed: 581 });
    G.rrect(ctx, SX0 - 6, RAIL_TOP, SX1 - SX0 + 12, 16, 8, { fill: YELLOW, lw: 4, seed: 582 });
    for (const x of [SX0, SX1]) for (const y of [RAIL_TOP + 8, RAIL_MID + 7]) G.rrect(ctx, x - 14, y - 13, 28, 26, 5, { fill: '#5C6470', lw: 3, seed: 583 + x + y });
  }
  const idleRing = (t) => [RING_IDLE[0] + Math.sin(t * 1.7) * 5, RING_IDLE[1]];
  const ringAbove = (o) => [LX + (o.x - LX) * 0.42, Math.max(BLOCK_Y + 110, o.y - o.s * 548)];
  // 整個現場:背景 → 施工架 → 人 → 欄杆
  function site(ctx, t, { people = () => {}, front = () => {}, idle = true } = {}) {
    fab(ctx, t);
    anchorBlock(ctx);
    scaffoldBack(ctx);
    if (idle) lifeline(ctx, idleRing(t));
    people();
    rails(ctx);
    front();
  }
  const burst = (ctx, x, y, r0, r1, a, n = 8, col = RED, lw = 8) => { for (let j = 0; j < n; j++) { const an = j * Math.PI * 2 / n + 0.3; G.line(ctx, [[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * r1, y + Math.sin(an) * r1]], { color: col, lw, seed: 780 + j, alpha: a }); } };

  // ---------- 每一幕 ----------
  const SS = 0.9; // 施工架上的人的大小
  function climb(ctx, t) { // 0:只是上去鎖一顆螺絲,三十秒的事
    const cu = clamp((t - ev.climb) / (ev.top - ev.climb)), wu = clamp((t - ev.top) / 0.95), working = t >= ev.bolt;
    const x = lerp(LX, 470, ease.inOutCubic(wu)), y = lerp(GROUND, DECK, cu);
    const onLadder = cu < 1, moving = (cu > 0 && cu < 1) || (wu > 0 && wu < 1), wph = (t - ev.climb) / 0.8;
    const wob = working ? Math.sin(t * 11) * 10 : 0, wx = BOLT[0] - 4 + wob * 0.4, wy = BOLT[1] + 36;
    const o = { x, y, s: SS, pose: moving ? 'walk' : 'stand', walk: moving ? wph % 1 : 0, style: CAST.shuSite, seed: 400,
      eyes: 'normal', mouth: working ? 'flat' : 'smile', brows: working ? 'determined' : 'neutral', look: working ? 0.8 : onLadder ? 0 : 0.6, lookY: onLadder ? -0.7 : working ? -0.2 : 0, blush: 0.6, blink: blink(t, 0.2) };
    if (onLadder) { const a = Math.sin(wph * Math.PI * 2) * 26; o.handL = [-48, -322 + 6 + a]; o.handR = [48, -322 + 6 - a]; }
    else if (t >= ev.bolt - 0.35) o.handR = hand(x, y, SS, 1, wx, wy);
    site(ctx, t, {
      people: () => { worker(ctx, o, t, { hook: 'dangle', amp: 0.3 }); if (!onLadder && t >= ev.bolt - 0.35) wrench(ctx, wx, wy, -0.5 + wob * 0.03, 0.62); },
      front: () => {
        if (t >= A[0] + 1.3) { const a = popIn(t, A[0] + 1.3, 0.25), p = 1 + 0.08 * Math.sin(t * 6); ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(BOLT[0], BOLT[1], 54 * p, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      },
    });
    if (t >= A[0] + 2.45) { // 三十秒的事
      const a = popIn(t, A[0] + 2.45, 0.28);
      ctx.save(); ctx.translate(708, 520); ctx.rotate(0.03); ctx.scale(a, a);
      G.tornPaper(ctx, -122, -62, 244, 124, { fill: '#FFF6D8', seed: 520 });
      G.ellipse(ctx, -70, 0, 30, 30, { fill: '#FFFFFF', lw: 5, seed: 521, amp: 0.3 });
      G.line(ctx, [[-70, 0], [-70 + Math.sin(t * 4) * 20, -Math.cos(t * 4) * 20]], { color: RED, lw: 5, seed: 522, amp: 0 });
      G.rrect(ctx, -76, -42, 12, 10, 2, { fill: INK, lw: 0, seed: 523 });
      G.decor(() => label(ctx, '30 秒', 34, 22, 60, INK));
      ctx.restore();
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 平台上鎖螺絲的阿樹(特寫用)
  function shuAtBolt(t, { pause = false, m = null } = {}) {
    const wob = pause ? 0 : Math.sin(t * 11) * 10, wx = BOLT[0] - 4 + wob * 0.4, wy = BOLT[1] + 36;
    return { wx, wy, wob, o: { x: 470, y: DECK, s: SS, pose: 'stand', style: CAST.shuSite, seed: 400, handR: hand(470, DECK, SS, 1, wx, wy), blush: 0.6, blink: blink(t, 0.2) } };
  }
  function hookShot(ctx, t) { // 1:安全帶掛在腰上,他懶得扣
    const CX = 470, CY = 690, Z = 2.05, { o, wx, wy, wob } = shuAtBolt(t);
    Object.assign(o, { eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.8, lookY: -0.3 });
    zoom(ctx, CX, CY, Z, () => site(ctx, t, { people: () => { worker(ctx, o, t, { hook: 'dangle', amp: 0.42 }); wrench(ctx, wx, wy, -0.5 + wob * 0.03, 0.62); } }));
    const hp = world(o, -100 * 0.86, -150 - 26 + 30), [hx, hy] = toScreen(CX, CY, Z, hp[0], hp[1]);
    if (t >= ev.circle) {
      const a = popIn(t, ev.circle, 0.25), p = 1 + 0.05 * Math.sin(t * 7);
      ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.setLineDash([20, 13]); ctx.lineDashOffset = -t * 34; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy, 92 * p, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(hx - 28, hy - 150); ctx.scale(a, a); ctx.rotate(-0.06);
      G.decor(() => label(ctx, '沒扣', 0, 22, 78, RED, { stroke: '#FFFFFF', strokeW: 20 }));
      ctx.restore();
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function mutter(ctx, t) { // 2:「一下就下來了。」
    const CX = 462, CY = 640, Z = 2.45, m = mouthOf('shu', t), { o, wx, wy } = shuAtBolt(t, { pause: true });
    Object.assign(o, { eyes: m ? 'normal' : 'happy', mouth: m || 'smirk', brows: 'up', look: -0.5, lookY: 0.5, headRot: -0.05 + Math.sin(t * 5) * 0.02,
      handL: [-118 + Math.sin(t * 9) * 12, -322 + 96] });
    zoom(ctx, CX, CY, Z, () => site(ctx, t, { people: () => { worker(ctx, o, t, { hook: 'dangle', amp: 0.3 }); wrench(ctx, wx, wy, -0.5, 0.62); } }));
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  // 腳滑到被抓住:阿樹與師傅的狀態(兩個鏡頭共用)
  const T3 = A[3] - 0.15;
  function slipState(t) {
    const su = ease.outCubic(clamp((t - ev.slip) / (ev.freeze - ev.slip))), slipped = t >= ev.slip, grabbed = t >= ev.grab;
    const wu = clamp((t - T3) / (ev.slip - T3));
    const hold = grabbed ? ease.outCubic(clamp((t - ev.grab) / 0.35)) : 0, up = ease.inOutCubic(clamp((t - ev.reveal) / 0.9));
    const rot = -0.34 * su + 0.12 * hold + 0.14 * up + (grabbed ? U.springKick(t, ev.grab, 9, 7) * 0.03 : 0);
    const x = lerp(560, 500, wu) + 26 * su, tt = Math.min(t, ev.freeze) + Math.max(0, t - ev.grab);
    const o = { x, y: DECK, s: SS, rot, pose: !slipped && wu < 1 ? 'walk' : 'stand', walk: !slipped ? (wu * 1.5) % 1 : 0, style: CAST.shuSite, seed: 400,
      eyes: slipped ? (up > 0.5 ? 'closed' : 'wide') : 'happy', mouth: slipped ? (up > 0.5 ? 'wavy' : 'o') : 'smile', brows: slipped ? 'worried' : 'up',
      look: slipped ? -0.3 : -0.6, lookY: slipped ? 0.6 : 0, sweat: slipped ? 1 : 0, blush: 0.6, blink: 0, legBend: slipped ? 0.25 * su : 0 };
    const pL = [lerp(-92, -128, su), lerp(-180, -236, su)], pR = [lerp(92, 122, su), lerp(-180, -372, su) + 60 * up];
    if (slipped) { o.handL = pL; o.handR = pR; }
    const arm = armOf(o, -1, pL), gp = world(o, lerp(arm.E[0], arm.H[0], 0.55), lerp(arm.E[1], arm.H[1], 0.55)); // 被抓住的地方:前臂
    // 師傅:看他沒扣,跟著爬上來;自己的掛鉤扣在頭頂的錨點上
    const mc = clamp((t - T3) / (ev.freeze - T3)), ru = ease.outCubic(clamp((t - ev.reach) / (ev.grab - ev.reach)));
    const my = lerp(1262, 1180, mc) - 100 * ru;
    const mo = { x: LX, y: my, s: SS, pose: 'stand', style: CAST.master, seed: 440, eyes: 'wide', mouth: grabbed ? 'flat' : 'o', brows: grabbed ? 'determined' : 'worried',
      look: 0.7, lookY: -0.8, blink: 0, blush: 0.4, sweat: grabbed ? 0.8 : 0 };
    const stepA = t < ev.freeze ? Math.sin(mc * Math.PI * 4) * 24 : 0;
    mo.handL = [-48 / 1.0, -322 + 20 + stepA];
    mo.handR = ru > 0 ? [lerp(48, (gp[0] - LX) / SS, ru), lerp(-322 + 20, (gp[1] - my) / SS, ru)] : [48, -322 + 20 - stepA];
    return { o, mo, gp, su, slipped, grabbed, tt, up };
  }
  function slipPeople(ctx, t, st) {
    const { o, mo, su, slipped, tt } = st;
    worker(ctx, o, tt, { hook: 'dangle', amp: slipped ? 0.5 : 0.3 });
    if (slipped && su > 0) { // 鞋底往後滑的痕跡
      for (let k = 0; k < 3; k++) G.line(ctx, [[o.x + 30 + k * 4, DECK - 6 - k * 9], [o.x + 30 + 60 * su + k * 10, DECK - 6 - k * 9]], { color: '#FFFFFF', lw: 5, seed: 600 + k, alpha: 0.85 });
    }
    if (slipped) { const hp = world(o, o.handR[0], o.handR[1]); wrench(ctx, hp[0] + 40 * su, hp[1] - 34 * su, 0.9 * su, 0.62); } // 扳手脫手
    else { const hp = world(o, 92, -180); wrench(ctx, hp[0], hp[1], Math.PI, 0.62); }
  }
  function freezeLook(ctx, t) { // 定格:畫面停住,四角出現框線
    if (t < ev.freeze) return;
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(196,214,240,0.20)');
    const fl = clamp(1 - (t - ev.freeze) / 0.16);
    if (fl > 0) fillRect(ctx, -200, -200, W + 400, H + 400, `rgba(255,255,255,${0.75 * fl})`);
    const L = 74, x0 = 150, x1 = 858, y0 = 392, y1 = 1238;
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], INK, 16); stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], '#FFFFFF', 9); }
  }
  function slip(ctx, t) { // 3:腳下的踏板,滑了一下(定格;不拍後面)
    const st = slipState(t), CX = 430, CY = 770, Z = 1.42;
    zoom(ctx, CX, CY, Z, () => site(ctx, st.tt, { idle: false, people: () => slipPeople(ctx, t, st), front: () => worker(ctx, st.mo, st.tt, { hook: 'clip', ring: ringAbove(st.mo) }) }));
    if (st.slipped && t < ev.freeze + 0.1) { const [bx, by] = toScreen(CX, CY, Z, st.o.x + 40, DECK - 8); burst(ctx, bx, by, 26 + st.su * 30, 62 + st.su * 40, 1, 5, RED, 8); }
    finish(ctx, 'rgba(255,255,255,0.10)');
    freezeLook(ctx, t);
  }
  function grab(ctx, t) { // 4:一隻手從旁邊抓住了他。是師傅
    const st = slipState(t), frozen = t < ev.reach;
    const zu = ease.inOutCubic(clamp((t - ev.reveal + 0.2) / 0.55));
    const CX = lerp(410, 400, zu), CY = lerp(690, 760, zu), Z = lerp(2.0, 1.62, zu) + (st.grabbed ? U.springKick(t, ev.grab, 8, 8) * 0.05 : 0);
    zoom(ctx, CX, CY, Z, () => site(ctx, st.tt, { idle: false, people: () => slipPeople(ctx, t, st), front: () => worker(ctx, st.mo, st.tt, { hook: 'clip', ring: ringAbove(st.mo) }) }));
    if (st.grabbed && t < ev.grab + 0.32) { const q = (t - ev.grab) / 0.32, [bx, by] = toScreen(CX, CY, Z, st.gp[0], st.gp[1]); burst(ctx, bx, by, 56 + q * 60, 96 + q * 90, 1 - q, 9, '#FFFFFF', 11); }
    finish(ctx, 'rgba(255,255,255,0.10)');
    if (frozen) fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(196,214,240,0.20)');
  }
  // 兩個人坐在地上
  const MX = 400, SHX = 745, SITY = GROUND + 30, SITS = 1.2, SITFY = 1215;
  function puffs(ctx, t, x, y, dir, rate, seed) { // 喘出來的氣
    for (let k = 0; k < 2; k++) { const p = (t * rate + k * 0.5 + seed) % 1; ctx.save(); ctx.globalAlpha = 0.75 * (1 - p) * clamp(p * 6); G.ellipse(ctx, x + dir * (34 + 46 * p), y - 18 * p, 9 + 13 * p, 7 + 10 * p, { fill: '#FFFFFF', lw: 0, seed: 640 + k }); ctx.restore(); }
  }
  function bareArm(ctx, o, pR, u, scar) { // 師傅右手:袖子捲到手肘,露出前臂與那道舊疤
    if (u <= 0) return;
    const a = armOf(o, 1, pR), st = o.style, P = (k) => [lerp(a.H[0], a.E[0], k), lerp(a.H[1], a.E[1], k)];
    local(ctx, o, () => {
      const c = P(u * 0.94);
      G.limb(ctx, [c, a.H], { color: st.skin, lw: 27, seed: 471 });
      G.limb(ctx, [P(u * 0.94 + 0.06), c], { color: Ch.shade(st.shirt, 0.82), lw: 38, seed: 472 });
      G.ellipse(ctx, a.H[0], a.H[1], 20, 20, { fill: st.skin, lw: 4, seed: 473 });
      if (scar > 0) { const p0 = P(0.78), p1 = P(lerp(0.78, 0.2, scar)); stroke(ctx, [p0, p1], '#C98E7C', 7); stroke(ctx, [p0, p1], '#FBE6DA', 3.5); }
    });
  }
  function sitScene(ctx, t, mode) { // mode: 'quiet' 沉默 | 'scar' 捲袖子 | 'talk' 師傅開口
    fab(ctx, t); anchorBlock(ctx); scaffoldBack(ctx); lifeline(ctx, idleRing(t)); rails(ctx);
    const quiet = mode === 'quiet', talk = mode === 'talk', calm = quiet ? clamp((t - ev.sit) / 6) : 1;
    const rate = lerp(0.75, 0.5, calm), br = Math.sin(t * rate * Math.PI * 2), m = talk ? mouthOf('master', t) : null;
    const ru = quiet ? 0 : ease.inOutCubic(clamp((t - ev.roll) / 1.3)), lift = quiet ? 0 : ease.inOutCubic(clamp((t - ev.roll + 0.2) / 0.6));
    const scarU = quiet ? 0 : talk ? 1 : ease.outCubic(clamp((t - ev.scar) / 0.8));
    const look = talk && t > ev.speak + 2.2;
    // 師傅
    const mo = { x: MX, y: SITY, s: SITS, pose: 'floor', style: CAST.master, seed: 440, headY: br * 3,
      eyes: quiet ? (calm < 0.55 ? 'closed' : 'normal') : 'normal', mouth: m || (quiet ? (br > 0.2 ? 'o' : 'flat') : 'flat'), brows: quiet ? 'worried' : 'neutral',
      look: quiet ? 0.2 : talk ? 0.7 : 0.6, lookY: quiet ? 0.5 : talk ? 0 : 0.5, sweat: quiet ? 0.9 : 0.3, blush: 0.4, blink: blink(t, 0.6), headRot: talk ? 0.04 + Math.sin(t * 2.3) * 0.02 : 0 };
    const pR = [lerp(100, 176, lift), lerp(14, -128, lift) + (talk ? Math.sin(t * 2.6) * 5 : 0)];
    if (lift > 0) mo.handR = pR;
    if (!quiet && !talk && t >= ev.roll && t < ev.roll + 1.4) mo.handL = [lerp(110, 60, ru) + Math.sin(t * 12) * 4, lerp(-116, -70, ru)]; // 左手把袖子往上捲
    Ch.person(ctx, mo); harness(ctx, mo);
    bareArm(ctx, mo, pR, ru, scarU);
    // 阿樹:掛鉤垂在地上
    const so = { x: SHX, y: SITY, s: SITS, pose: 'floor', style: CAST.shuSite, seed: 400, headY: -br * 3 + (quiet ? 6 : 0),
      eyes: quiet ? (calm < 0.4 ? 'wide' : 'closed') : look ? 'normal' : 'wide', mouth: quiet ? (br < -0.2 ? 'o' : 'wavy') : look ? 'flat' : 'o', brows: 'worried',
      look: quiet ? 0 : look ? 0.6 : -0.8, lookY: quiet ? 0.6 : look ? 1 : 0.3, headRot: quiet ? 0.05 : look ? 0.06 : -0.04, sweat: quiet ? 1 : 0.4, blush: 0.5, blink: quiet ? 0 : blink(t, 0.2) };
    const hk = [SHX + 176, SITY + 52];
    G.limb(ctx, [world(so, 70 * 0.86, -60), [SHX + 132, SITY - 6], [hk[0] - 6, hk[1] - 10]], { color: LAN, lw: 10, outline: 3, seed: 931 });
    Ch.person(ctx, so); harness(ctx, so);
    snapHook(ctx, hk[0], hk[1], -1.25, 0.86, 0);
    wrench(ctx, 575, SITY + 80, 1.35, 0.8); // 掉在地上的扳手
    if (quiet) { // 喘氣
      const mh = world(mo, 0, -224), shh = world(so, 0, -224), fa = 1 - 0.6 * calm;
      ctx.save(); ctx.globalAlpha = fa; puffs(ctx, t, mh[0], mh[1], 1, rate, 0); puffs(ctx, t, shh[0], shh[1], -1, rate, 0.3); ctx.restore();
    }
    return { mo, so, scarU, ru };
  }
  function quiet(ctx, t) { // 5:兩個人坐在地上,很久都沒有說話
    zoom(ctx, 540, GROUND, 1, () => sitScene(ctx, t, 'quiet'), SITFY);
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(70,90,130,0.10)');
    finish(ctx, 'rgba(200,215,255,0.10)');
  }
  function scarShot(ctx, t) { // 6:師傅捲起袖子,手臂上有一道很長的疤
    let r;
    zoom(ctx, 540, GROUND, 1, () => { r = sitScene(ctx, t, 'scar'); }, SITFY);
    if (t >= ev.roll + 0.5) { // 放大的前臂
      const a = popIn(t, ev.roll + 0.5, 0.32), CXI = 505, CYI = 560, ru = ease.inOutCubic(clamp((t - ev.roll - 0.6) / 1.0)), sc = ease.outCubic(clamp((t - ev.scar) / 0.9));
      const ah = world(r.mo, 150, -110), [ax, ay] = toScreen(540, GROUND, 1, ah[0], ah[1], SITFY);
      ctx.save(); ctx.globalAlpha = Math.min(1, a); G.line(ctx, [[ax, ay - 20], [CXI - 120, CYI + 150]], { color: '#FFFFFF', lw: 8, seed: 905, alpha: 0.9 }); ctx.restore();
      ctx.save(); ctx.translate(CXI, CYI + (1 - a) * 50); ctx.scale(a, a); ctx.rotate(-0.012);
      G.rrect(ctx, -330, -160, 660, 320, 36, { fill: '#FFFDF4', lw: 7, seed: 650 });
      ctx.save(); ctx.beginPath(); ctx.roundRect(-322, -152, 644, 304, 30); ctx.clip();
      fillRect(ctx, -330, -160, 660, 320, lin(ctx, 0, -160, 0, 160, [[0, '#E8EEF2'], [1, '#D3DDE3']]));
      const sk = CAST.master.skin, sl = CAST.master.shirt, cuff = lerp(86, -212, ru);
      ctx.save(); ctx.translate(-10, 44); ctx.rotate(-0.2);
      G.limb(ctx, [[-236, 30], [-330, 250]], { color: sl, lw: 150, seed: 655 });                      // 上臂(袖子)
      G.poly(ctx, [[-250, -66], [96, -46], [96, 46], [-250, 70]], { fill: sk, lw: 5, seed: 651, step: 30 }); // 前臂
      G.rrect(ctx, 84, -56, 128, 112, 30, { fill: sk, lw: 5, seed: 652 });                            // 手掌
      G.rrect(ctx, 112, -104, 40, 74, 18, { fill: sk, lw: 5, seed: 653 });                            // 拇指
      [[-50, 118], [-24, 132], [2, 126], [28, 104]].forEach(([fy, fl], k) => G.rrect(ctx, 196, fy - 1, fl, 25, 12, { fill: sk, lw: 4.5, seed: 660 + k }));
      fillRect(ctx, 190, -48, 18, 98, sk);
      if (cuff > -200) G.poly(ctx, [[-262, -72], [cuff, -60 + (cuff + 250) * 0.03], [cuff, 60 - (cuff + 250) * 0.03], [-262, 76]], { fill: sl, lw: 5, seed: 656, step: 30 }); // 還沒捲上去的袖子
      G.rrect(ctx, cuff - 30, -84, 50, 172, 18, { fill: Ch.shade(sl, 0.82), lw: 5, seed: 657 });      // 捲起來的袖口
      for (let k = 0; k < 2; k++) G.line(ctx, [[cuff - 16 + k * 16, -70], [cuff - 16 + k * 16, 74]], { color: Ch.shade(sl, 0.66), lw: 3, seed: 658 + k, alpha: 0.8 });
      if (sc > 0) { // 一道很長的舊疤:淡淡的一條線,加上縫過的痕跡
        const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24 * sc; pts.push([lerp(-150, 70, u), 2 + Math.sin(u * 5.2) * 8]); }
        stroke(ctx, pts, '#CC917F', 15); stroke(ctx, pts, '#FCE9DF', 7);
        for (let i = 2; i < pts.length - 1; i += 3) { const [px, py] = pts[i]; stroke(ctx, [[px - 3, py - 19], [px + 3, py + 19]], '#D9A595', 4); }
      }
      ctx.restore();
      ctx.restore();
      ctx.restore();
    }
    finish(ctx, 'rgba(255,232,190,0.12)');
  }
  function talk(ctx, t) { // 7:「我那一次,也只是想上去三十秒。」(推近)
    const z = lerp(1.26, 1.34, clamp((t - A[7] + 0.15) / 4.5));
    zoom(ctx, 570, GROUND - 60, z, () => sitScene(ctx, t, 'talk'), SITFY - 60);
    finish(ctx, 'rgba(255,232,190,0.14)');
  }
  function clipUp(ctx, t) { // 8a:從那天起,阿樹每次上去之前
    const CX = 480, CY = 960, Z = 1.3, taken = t >= ev.take, u = ease.inOutCubic(clamp((t - ev.take) / 0.5)), v = ease.inOutCubic(clamp((t - ev.take - 0.7) / 0.8));
    const R = idleRing(t), o = { x: 392, y: GROUND, s: 1.0, pose: 'stand', style: CAST.shuSite, seed: 400,
      eyes: 'normal', mouth: 'flat', brows: 'determined', look: taken ? -0.8 : -0.2, lookY: taken ? lerp(0.6, -0.2, v) : -0.8, headRot: taken ? -0.04 : 0, blush: 0.6, blink: blink(t, 0.2) };
    const hp = world(o, -100 * 0.86, -176), hx = lerp(hp[0], lerp(hp[0] - 6, R[0] + 46, v), u), hy = lerp(hp[1], lerp(hp[1] - 60, R[1] + 30, v), u);
    if (taken) o.handL = hand(o.x, o.y, o.s, 1, hx + 10, hy + 26);
    const mo = { x: 668, y: GROUND, s: 1.02, pose: 'stand', style: CAST.master, seed: 440, crossArms: true, eyes: v > 0.6 ? 'happy' : 'normal', mouth: 'smile', brows: 'neutral', look: -0.8, blink: blink(t, 0.6), blush: 0.4 };
    zoom(ctx, CX, CY, Z, () => site(ctx, t, { front: () => {
      Ch.person(ctx, mo);
      if (taken) G.limb(ctx, [world(o, -70 * 0.86, -220), [(hp[0] + hx) / 2 - 22, (hp[1] + hy) / 2 + 30], [hx, hy]], { color: LAN, lw: 9, outline: 3, seed: 931 });
      Ch.person(ctx, o); harness(ctx, o);
      if (!taken) dangle(ctx, o, t, { amp: 0.14 });
      else { snapHook(ctx, hx, hy, lerp(0, -2.2, u), 0.62, 0); G.ellipse(ctx, hx + 10, hy + 26, 19, 19, { fill: SKIN, lw: 4, seed: 418 }); }
    } }));
    finish(ctx);
  }
  function clickShot(ctx, t) { // 8b:掛鉤扣上的特寫:「喀」
    zoom(ctx, LX + 20, 1000, 2.6, () => { fab(ctx, t); scaffoldBack(ctx); }, 900);
    fillRect(ctx, -200, -200, W + 400, H + 400, 'rgba(233,239,243,0.62)');
    const RX = 440, RY = 760, R0 = 92, done = t >= ev.click, HS = 5.4;
    const au = ease.inOutCubic(clamp((t - ev.close) / (ev.click - 0.16 - ev.close))), snap = done ? U.springKick(t, ev.click, 10, 9) : 0;
    const sway = Math.sin(t * 1.6) * 5 * (done ? 0.3 : 1);
    // 錨點:鋼索 + 掛環
    stroke(ctx, [[RX + sway * 0.3, 120], [RX + sway, RY - R0 - 78]], INK, 20); stroke(ctx, [[RX + sway * 0.3, 120], [RX + sway, RY - R0 - 78]], '#AEB6BF', 10);
    G.rrect(ctx, RX + sway - 30, RY - R0 - 96, 60, 84, 14, { fill: '#5C6470', lw: 6, seed: 961 });
    // 掛鉤:從右下方靠上來,保險片被掛環頂開,扣進去之後彈回
    const fx = RX + sway + 8 * HS, fy0 = RY + R0 + 4 + 80 * HS - 20;                       // 扣好時鉤孔的位置(鉤身朝上)
    const dx = lerp(270, 0, ease.outCubic(clamp(au / 0.72))), dy = lerp(-96, 0, ease.inCubic(clamp((au - 0.72) / 0.28))) + lerp(70, 0, clamp(au / 0.5)) - snap * 10;
    const open = done ? 0 : clamp((au - 0.3) / 0.25);
    const ex = fx + dx, ey = fy0 + dy, rot = Math.PI + lerp(0.3, 0, clamp(au / 0.8));
    G.limb(ctx, [[ex + 30, ey + 30], [ex + 150, ey + 330], [ex + 360, ey + 700]], { color: LAN, lw: 52, outline: 6, seed: 941 }); // 織帶
    ringShape(ctx, RX + sway, RY - snap * 4, R0);
    snapHook(ctx, ex, ey, rot, HS, open);
    // 手
    G.limb(ctx, [[ex + 420, ey + 520], [ex + 150, ey + 150]], { color: SKIN, lw: 120, outline: 6, seed: 414 });
    G.ellipse(ctx, ex + 92, ey + 62, 104, 92, { fill: SKIN, lw: 6, seed: 415 });
    for (let k = 0; k < 4; k++) G.ellipse(ctx, ex + 2 + k * 6, ey - 44 + k * 46, 46, 24, { fill: SKIN, lw: 5, seed: 416 + k });
    if (done) {
      const q = t - ev.click, a = popIn(t, ev.click, 0.2);
      if (q < 0.4) burst(ctx, RX + 20, RY + 60, 150 + q * 220, 210 + q * 320, 1 - q / 0.4, 10, '#FFFFFF', 14);
      ctx.save(); ctx.translate(690, 520); ctx.rotate(0.1 + Math.sin(t * 6) * 0.015); ctx.scale(a, a);
      for (let j = 0; j < 5; j++) { const an = -1.9 + j * 0.42; G.line(ctx, [[Math.cos(an) * 150, Math.sin(an) * 150], [Math.cos(an) * 198, Math.sin(an) * 198]], { color: RED, lw: 10, seed: 790 + j }); }
      G.decor(() => label(ctx, '喀', 0, 70, 220, RED, { stroke: '#FFFFFF', strokeW: 34 }));
      ctx.restore();
      tickMark(ctx, 250, 600, 62, popIn(t, ev.click + 0.3, 0.25), 836);
    }
    finish(ctx);
  }
  function again(ctx, t) { // 8c:扣好了才往上爬;在平台上,掛鉤一直扣在頭頂的錨點
    const T0 = ev.again - 0.2, cu = clamp((t - T0) / (ev.top2 - 0.75 - T0)), wu = clamp((t - (ev.top2 - 0.75)) / 0.75), onLadder = cu < 1, done = t >= ev.top2 + 0.15;
    const x = lerp(LX, 470, ease.inOutCubic(wu)), y = lerp(1150, DECK, cu), moving = onLadder || (wu > 0 && wu < 1), wph = (t - T0) / 0.8;
    const o = { x, y, s: SS, pose: moving ? 'walk' : 'stand', walk: moving ? wph % 1 : 0, style: CAST.shuSite, seed: 400, gesture: done ? 'thumbsUp' : undefined,
      eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'smile', brows: 'up', look: onLadder ? 0 : 0.3, lookY: onLadder ? -0.7 : 0, blush: 0.6, blink: blink(t, 0.2) };
    if (onLadder) { const a = Math.sin(wph * Math.PI * 2) * 26; o.handL = [-48, -322 + 6 + a]; o.handR = [48, -322 + 6 - a]; }
    const ring = ringAbove(o);
    site(ctx, t, { idle: false, people: () => worker(ctx, o, t, { hook: 'clip', ring }), front: () => {
      Ch.person(ctx, { x: 742, y: GROUND, s: 1.02, pose: 'stand', style: CAST.master, seed: 440, gesture: done ? 'thumbsUp' : undefined, eyes: done ? 'happy' : 'normal', mouth: 'smile', brows: 'neutral', look: -0.6, lookY: -0.8, blink: blink(t, 0.6), blush: 0.4 });
      if (done) { tickMark(ctx, ring[0] + 62, ring[1] - 6, 30, popIn(t, ev.top2 + 0.2, 0.25), 836); }
    } });
    finish(ctx);
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, ev.card, 0.4);
    ctx.save(); ctx.translate(506, 362); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -420, 0, 840, 500, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '扣上只要五秒', 0, 136, 116, INK);
      label(ctx, '不扣', 0, 280, 112, '#8E6444');
      label(ctx, '賭的是一輩子', 0, 432, 120, RED);
    });
    ctx.restore();
    Ch.person(ctx, { x: 300, y: GROUND + 76, s: 0.98, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    const o = { x: 716, y: GROUND + 76, s: 0.95, pose: 'stand', style: CAST.shuSite, eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 };
    const hx = 596, hy = 1050 + Math.sin(t * 4) * 5;
    o.handL = hand(o.x, o.y, o.s, 1, hx + 6, hy + 30);
    G.limb(ctx, [world(o, -60, -230), [hx - 26, hy + 96], [hx, hy]], { color: LAN, lw: 9, outline: 3, seed: 931 });
    Ch.person(ctx, o); harness(ctx, o);
    snapHook(ctx, hx, hy, Math.PI + 0.1, 0.8, 0);
    G.ellipse(ctx, hx + 6, hy + 30, 19, 19, { fill: SKIN, lw: 4, seed: 418 });
    tickMark(ctx, hx - 44, hy - 78, 24, popIn(t, ev.card + 0.5, 0.25), 836);
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1474); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: climb, cam: Shots.push(1.0, 1.04) },
    { at: A[1] - 0.15, draw: hookShot, in: 'cut' },
    { at: A[2] - 0.15, draw: mutter, in: 'cut' },
    { at: T3, draw: slip, in: 'cut' },
    { at: A[4] - 0.15, draw: grab, in: 'cut' },
    { at: A[5] - 0.15, draw: quiet, in: 'fade', cam: Shots.push(1.0, 1.04) },
    { at: A[6] - 0.15, draw: scarShot, in: 'cut' },
    { at: A[7] - 0.15, draw: talk, in: 'cut' },
    { at: A[8] - 0.15, draw: clipUp, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: ev.close, draw: clickShot, in: 'cut' },
    { at: ev.again - 0.2, draw: again, in: 'whip' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!、:,?!:])/).map((p) => p.replace(/[,。、,::「」]/g, '').trim()).filter(Boolean);
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
