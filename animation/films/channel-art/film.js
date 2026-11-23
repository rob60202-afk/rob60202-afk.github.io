// 頻道圖像素材:頭像、橫幅、L003 縮圖。每一張都是時間 t 的純函式(t 只用來選要畫哪一張)。
// 角色造型照抄 field-05-harness 的 CAST,畫法與各集相同。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Studio = globalThis.Studio, S = globalThis.SCORE;
  const { clamp, lerp } = U;
  const W = G.W, H = G.H;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  // 網站配色
  const NAVY = '#0a1421', PAPER = '#f4f2ed', ACID = '#b7f33d', MUTED = '#526171';
  // 各集用的顏色
  const INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', YELLOW = '#F2C230', ORANGE = '#F28C28', TUBE = '#8E99A3';

  // ---------- 角色(與各集相同;進現場一律戴安全帽) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CAST = {
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },       // 阿樹:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },     // 師傅:白色安全帽
  };
  globalThis.CAST = CAST;
  const BW = { slim: 0.86, regular: 1, broad: 1.18, heavy: 1.3 };
  const HEAD_Y = -404; // 站姿:頭的中心(腳 = 0,肩線 -322)

  // ---------- 小工具 ----------
  const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fillRect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
  const stroke = (ctx, pts, color, lw, cap = 'round') => {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = cap; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  };
  const hand = (px, py, s, sx, wx, wy) => [(wx - px) / (s * sx), (wy - py) / s]; // 畫面座標 → 角色手的目標
  function world(o, lx, ly) { const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r); return [o.x + o.s * (o.sx || 1) * (lx * c - ly * s), o.y + o.s * (lx * s + ly * c)]; }
  function local(ctx, o, fn) { ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s * (o.sx || 1), o.s); ctx.rotate(o.rot || 0); fn(); ctx.restore(); }
  function onHead(ctx, o, fn) { local(ctx, o, () => { ctx.translate(o.headX || 0, HEAD_Y + (o.headY || 0)); ctx.rotate(o.headRot || 0); fn(); }); }
  const headAt = (o, s = o.s) => ({ x: o.x, y: o.y + HEAD_Y * s }); // 頭的中心(畫面座標,不含 headRot)
  const tickMark = (ctx, x, y, r, seed) => { // 綠底白勾(與各集相同)
    G.ellipse(ctx, x, y, r, r, { fill: GREEN, lw: 4, seed, amp: 0.4 });
    G.line(ctx, [[x - r * 0.5, y], [x - r * 0.14, y + r * 0.38], [x + r * 0.52, y - r * 0.4]], { color: '#FFFFFF', lw: r * 0.26, seed: seed + 1, amp: 0.3 });
  };
  // 一行字,分段上色,整行置中於 cx
  function richLine(ctx, parts, cx, y, size, o = {}) {
    const fam = o.fam || CJK, weight = o.weight || 800;
    const ws = parts.map(([s]) => G.measure(ctx, s, size, fam, weight));
    let x = cx - ws.reduce((a, b) => a + b, 0) / 2;
    parts.forEach(([s, color], i) => { G.text(ctx, s, x, y, { size, fam, weight, color, align: 'left', boil: 0, ...o }); x += ws[i]; });
    return ws.reduce((a, b) => a + b, 0);
  }
  const fitSize = (ctx, str, maxW, size, fam = CJK, weight = 800) => Math.min(size, size * maxW / G.measure(ctx, str, size, fam, weight));

  // ---------- 現場的零件(沿用各集的廠房畫法) ----------
  function pipeRun(ctx, x0, x1, y, th, color, seed, clamps = []) {
    G.rrect(ctx, x0, y - th / 2, x1 - x0, th, th * 0.45, { fill: color, lw: 4, seed });
    G.line(ctx, [[x0 + 12, y - th * 0.2], [x1 - 12, y - th * 0.2]], { color: '#FFFFFF', lw: Math.max(2.5, th * 0.13), seed: seed + 1, alpha: 0.6 });
    for (const cx of clamps) G.rrect(ctx, cx - th * 0.32, y - th / 2 - 6, th * 0.64, th + 12, 3, { fill: '#6C7680', lw: 3, seed: seed + 2 + Math.round(cx) });
  }
  // 吊在天花板的管架:吊桿、橫擔、四條管(顏色與各集的廠房相同)
  function pipeRack(ctx, x0, x1, y, { th = 26, gap = 46, rods = [], seed = 300, ceil = 0 } = {}) {
    const bot = y + 14 + gap * 3 + th / 2 + 10;
    for (const rx of rods) { G.line(ctx, [[rx, ceil], [rx, bot]], { color: '#6C7680', lw: 6, seed: seed + rx }); G.rrect(ctx, rx - 40, bot - 4, 80, 12, 3, { fill: '#7F8B96', lw: 3, seed: seed + 2 + rx }); }
    [['#D9DEE3', 0], ['#F2C230', 1], ['#D9DEE3', 2], ['#6FA287', 3]].forEach(([c, k]) => {
      pipeRun(ctx, x0, x1, y + 14 + k * gap, th, c, seed + 10 + k * 7, rods.map((rx) => rx + 30));
    });
  }
  function column(ctx, cx, y0, y1, w, seed) { G.rrect(ctx, cx - w / 2, y0, w, y1 - y0, 4, { fill: '#AEB9C3', lw: 5, seed }); G.line(ctx, [[cx - w / 2 + 10, y0 + 10], [cx - w / 2 + 10, y1 - 10]], { color: '#FFFFFF', lw: 4, seed: seed + 1, alpha: 0.35 }); }
  function floor(ctx, y0, seed, { stripe = 120, cx = W / 2 } = {}) {
    fillRect(ctx, -10, y0, W + 20, H - y0 + 10, lin(ctx, 0, y0, 0, H, [[0, '#B9C7C2'], [1, '#93A29D']]));
    G.line(ctx, [[-30, y0], [W + 30, y0]], { color: INK, lw: 5, seed });
    for (let k = 1; k < 5; k++) { const y = y0 + 22 * k * k * 0.62 + 24 * k; if (y < H) G.line(ctx, [[-30, y], [W + 30, y]], { color: '#6C7A75', lw: 3, seed: seed + k, alpha: 0.4 }); }
    for (let k = -8; k <= 8; k++) G.line(ctx, [[cx + k * 150, y0 + 4], [cx + k * 330, H + 40]], { color: '#6C7A75', lw: 3, seed: seed + 20 + k, alpha: 0.28 });
    if (stripe) G.rrect(ctx, -30, y0 + stripe, W + 60, 20, 0, { fill: '#F2C230', lw: 0, seed: seed + 40, alpha: 0.85 });
  }
  // 施工架:底座、斜撐、立柱、踏板、爬梯;上欄杆、中欄杆、腳趾板(正確示範)
  function scaffold(ctx, x0, x1, deck, ground, seed, ladder = -1) {
    const railTop = deck - 150, railMid = deck - 78, toe = 28;
    const lx = ladder < 0 ? x0 - 62 : x1 + 62; // 爬梯的中心線
    for (const x of [x0, x1]) G.rrect(ctx, x - 30, ground - 10, 60, 10, 3, { fill: '#6C7680', lw: 3.5, seed: seed + x });
    G.line(ctx, [[x0, deck + 30], [x1, ground - 26]], { color: TUBE, lw: 8, seed: seed + 3 });
    G.line(ctx, [[x1, deck + 30], [x0, ground - 26]], { color: TUBE, lw: 8, seed: seed + 4 });
    G.rrect(ctx, x0, ground - 120, x1 - x0, 12, 5, { fill: TUBE, lw: 3.5, seed: seed + 5 });
    for (const x of [x0, x1]) G.rrect(ctx, x - 9, railTop - 12, 18, ground - 10 - railTop + 12, 5, { fill: '#7F8B96', lw: 3.5, seed: seed + 6 + x });
    G.rrect(ctx, x0 - 14, deck, x1 - x0 + 28, 22, 4, { fill: '#B98A5E', lw: 4.5, seed: seed + 10 });
    G.line(ctx, [[x0 - 6, deck + 11], [x1 + 6, deck + 11]], { color: '#8E6444', lw: 2.5, seed: seed + 11, alpha: 0.7 });
    // 爬梯:扶手高出平台,上下兩處固定在立柱上
    const near = ladder < 0 ? x0 : x1;
    for (const y of [deck - 40, ground - 130]) G.rrect(ctx, Math.min(lx, near), y - 6, Math.abs(near - lx), 12, 4, { fill: ORANGE, lw: 3, seed: seed + 12 + y });
    for (let y = ground - 44; y > deck - 90; y -= 46) G.rrect(ctx, lx - 32, y - 5, 64, 10, 4, { fill: '#B4BBC3', lw: 3, seed: seed + 13 + y });
    for (const sd of [-1, 1]) G.rrect(ctx, lx + sd * 32 - 7, deck - 120, 14, ground - deck + 112, 5, { fill: '#D3D8DD', lw: 3.5, seed: seed + 14 + sd });
    // 欄杆(在人的前面那一層)
    G.rrect(ctx, x0 - 6, deck - toe, x1 - x0 + 12, toe, 3, { fill: '#C98A3A', lw: 3.5, seed: seed + 20 });
    G.rrect(ctx, x0 - 6, railMid, x1 - x0 + 12, 12, 6, { fill: YELLOW, lw: 3.5, seed: seed + 21 });
    G.rrect(ctx, x0 - 6, railTop, x1 - x0 + 12, 14, 7, { fill: YELLOW, lw: 3.5, seed: seed + 22 });
    for (const x of [x0, x1]) for (const y of [railTop + 7, railMid + 6]) G.rrect(ctx, x - 12, y - 11, 24, 22, 5, { fill: '#5C6470', lw: 3, seed: seed + 23 + x + y });
  }
  function cone(ctx, x, y, s, seed) { // 交通錐
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -46, -12, 92, 14, 4, { fill: '#E0703E', lw: 3.5, seed });
    G.poly(ctx, [[-30, -12], [-8, -110], [8, -110], [30, -12]], { fill: '#F28C28', lw: 3.5, seed: seed + 1, step: 18 });
    G.poly(ctx, [[-22, -46], [-14, -78], [14, -78], [22, -46]], { fill: '#FFFFFF', lw: 0, seed: seed + 2, step: 18 });
    ctx.restore();
  }

  // =====================================================================
  // 1. 頭像(1:1)。YouTube 會裁成圓形:臉與帽子都放在中央圓的 85% 以內;不放字。
  // =====================================================================
  function avatar(ctx, t, v) {
    const C = W / 2;
    fillRect(ctx, 0, 0, W, H, NAVY);
    fillRect(ctx, 0, 0, W, H, rad(ctx, C, C - 40, 30, 560, [[0, 'rgba(70,104,140,0.55)'], [0.65, 'rgba(30,52,76,0.35)'], [1, 'rgba(10,20,33,0)']]));
    if (v === 1) { // 螢光綠圓盤在頭後面
      G.ellipse(ctx, C, C - 60, 380, 380, { fill: ACID, lw: 0, seed: 1001, amp: 0.6 });
    } else if (v !== 2) { // 螢光綠圓環
      ctx.save(); ctx.strokeStyle = ACID; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(C, C, 496, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // 背景的管架(很淡)
    if (v === 2) for (let k = 0; k < 3; k++) { ctx.save(); ctx.globalAlpha = 0.16; pipeRun(ctx, -20, W + 20, 210 + k * 70, 34, '#9FB3C8', 1010 + k * 7); ctx.restore(); }

    // 師傅在左、阿樹在右;師傅左右翻過來,兩頂帽簷都朝外,中間留給兩張臉
    const s = 2.5;
    const mo = { x: 372, y: 466 - HEAD_Y * s, s, sx: -1, pose: 'stand', style: CAST.master, seed: 440, eyes: 'happy', mouth: 'smile', brows: 'neutral', blush: 0.45, headRot: 0.05, look: 0 };
    const so = { x: 706, y: 494 - HEAD_Y * s, s, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: v === 3 ? 'happy' : 'normal', mouth: 'grin', brows: 'up', blush: 0.65, headRot: -0.05, look: -0.15 };
    // 師傅的右手繞到阿樹背後,搭在阿樹另一邊的肩膀上
    const bwS = BW.slim, sShoulder = world(so, 60 * bwS + 4, -326);
    mo.handR = hand(mo.x, mo.y, s, -1, sShoulder[0], sShoulder[1]);
    Ch.person(ctx, mo);
    Ch.person(ctx, so);
    // 搭在肩上的手(畫在阿樹上面)
    local(ctx, mo, () => {
      const [hx, hy] = mo.handR, sk = CAST.master.skin;
      G.ellipse(ctx, hx - 4, hy + 2, 22, 18, { fill: sk, lw: 4, seed: 470 });
      for (let k = 0; k < 3; k++) G.rrect(ctx, hx - 20 + k * 13, hy + 4, 12, 26, 6, { fill: sk, lw: 3.5, seed: 471 + k });
    });
  }

  // =====================================================================
  // 2. 橫幅(16:9,算成 2560×1440)。所有裝置都看得到的只有正中央 1546×423:
  //    角色與文字放在裡面;外面只有現場背景(電視才看得到全部)。
  // =====================================================================
  const K_B = 1440 / 1080;
  const BS = { x: 960 - 1546 / 2 / K_B, y: 540 - 423 / 2 / K_B, w: 1546 / K_B, h: 423 / K_B }; // 安全區,舞台座標
  function banner(ctx, t, v) {
    const GB = 812; // 牆與地板的交界
    // 牆
    fillRect(ctx, 0, 0, W, H, lin(ctx, 0, 0, 0, GB, [[0, '#BFCAD3'], [0.5, '#D6DEE4'], [1, '#E6EBEF']]));
    for (const cx of [70, 1850]) column(ctx, cx, 60, GB, 70, 1101 + cx);
    for (const cx of [700, 1220]) column(ctx, cx, 60, GB, 56, 1111 + cx);
    // 天花板
    fillRect(ctx, -10, -10, W + 20, 82, lin(ctx, 0, 0, 0, 72, [[0, '#4A5563'], [1, '#68727F']]));
    G.line(ctx, [[-20, 72], [W + 20, 72]], { color: INK, lw: 5, seed: 1121 });
    for (let x = 40; x < W; x += 240) G.rrect(ctx, x - 14, 60, 28, 30, 3, { fill: '#5C6470', lw: 3, seed: 1122 + x });
    // 管架(電視上才看得到)
    pipeRack(ctx, -30, W + 30, 186, { th: 30, gap: 44, rods: [150, 560, 980, 1400, 1790], seed: 1130, ceil: 72 });
    // 地板
    floor(ctx, GB, 1150, { stripe: 150 });
    // 兩側的施工架
    scaffold(ctx, 120, 318, 600, 960, 1200, -1);
    scaffold(ctx, 1602, 1800, 600, 960, 1300, 1);
    cone(ctx, 90, 1000, 0.8, 1400); cone(ctx, 350, 1010, 0.8, 1410); cone(ctx, 1570, 1010, 0.8, 1420); cone(ctx, 1830, 1000, 0.8, 1430);

    // 告示牌
    const bx0 = 792, bx1 = BS.x + BS.w - 14, by0 = BS.y + 16, by1 = BS.y + BS.h - 16;
    ctx.save(); ctx.fillStyle = 'rgba(10,20,33,0.22)'; ctx.beginPath(); ctx.roundRect(bx0 + 10, by0 + 12, bx1 - bx0, by1 - by0, 20); ctx.fill(); ctx.restore();
    G.rrect(ctx, bx0, by0, bx1 - bx0, by1 - by0, 20, { fill: NAVY, lw: 5, seed: 1501 });
    G.rrect(ctx, bx0 + 14, by0 + 14, bx1 - bx0 - 28, by1 - by0 - 28, 12, { fill: null, stroke: 'rgba(244,242,237,0.20)', lw: 2.5, seed: 1502, second: false, amp: 0.5 });
    for (const [px, py] of [[bx0 + 30, by0 + 30], [bx1 - 30, by0 + 30], [bx0 + 30, by1 - 30], [bx1 - 30, by1 - 30]]) G.ellipse(ctx, px, py, 7, 7, { fill: '#8E99A3', lw: 2.5, seed: 1503 + px, amp: 0.3 });
    const cx = (bx0 + bx1) / 2, inner = bx1 - bx0 - 90;
    const big = fitSize(ctx, '每一集,一個現場教訓', inner, 74);
    richLine(ctx, [['每一集,一個', PAPER], ['現場教訓', ACID]], cx, by0 + 40 + big * 0.86, big);
    G.line(ctx, [[cx - 70, by0 + 40 + big + 26], [cx + 70, by0 + 40 + big + 26]], { color: ACID, lw: 5, seed: 1510, amp: 0.4 });
    const small = 40;
    richLine(ctx, [['報價', PAPER], ['・', ACID], ['品質', PAPER], ['・', ACID], ['工安', PAPER], ['・', ACID], ['管理', PAPER]], cx, by1 - 40 - small * 1.25 - 14, small);
    richLine(ctx, [['免費工具在每支影片的說明欄', '#C9D3DC']], cx, by1 - 40, small);

    // 角色
    const s = 0.95;
    // 師傅左右翻過來:比讚的手在外側(不被阿樹擋住),帽簷朝外
    const mo = { x: 502, y: 872, s, sx: -1, pose: 'stand', style: CAST.master, seed: 440, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', brows: 'neutral', blush: 0.45, headRot: -0.03, look: -0.2 };
    const so = { x: 668, y: 884, s, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: 'grin', brows: 'up', blush: 0.65, look: -0.2 };
    // 阿樹雙手拿著檢核表(各集說明欄的免費工具)
    const cbx = so.x + 4, cby = so.y - 252 * s, cbw = 112 * s, cbh = 136 * s;
    so.handL = hand(so.x, so.y, s, 1, cbx - cbw / 2 + 6, cby + cbh / 2 - 22);
    so.handR = hand(so.x, so.y, s, 1, cbx + cbw / 2 - 6, cby + cbh / 2 - 22);
    Ch.person(ctx, mo);
    Ch.person(ctx, so);
    ctx.save(); ctx.translate(cbx, cby); ctx.rotate(-0.06);
    G.rrect(ctx, -cbw / 2, -cbh / 2, cbw, cbh, 8, { fill: '#B98A5E', lw: 4, seed: 1601 });
    G.rrect(ctx, -cbw / 2 + 8, -cbh / 2 + 12, cbw - 16, cbh - 18, 3, { fill: '#FFFDF4', lw: 3, seed: 1602 });
    G.rrect(ctx, -22, -cbh / 2 - 8, 44, 22, 5, { fill: '#8E99A3', lw: 3, seed: 1603 });
    for (let k = 0; k < 3; k++) { const yy = -cbh / 2 + 40 + k * 30; tickMark(ctx, -cbw / 2 + 26, yy, 10, 1610 + k * 3); G.line(ctx, [[-cbw / 2 + 44, yy], [cbw / 2 - 18, yy]], { color: '#9AA4AE', lw: 4, seed: 1620 + k }); }
    ctx.restore();
    // 拿著板子的手指(畫在板子上)
    for (const hp of [so.handL, so.handR]) { const p = world(so, hp[0], hp[1]); G.ellipse(ctx, p[0], p[1], 18 * s, 16 * s, { fill: SKIN, lw: 3.5, seed: 1630 + hp[0] }); }
  }

  // =====================================================================
  // 3. L003 縮圖(16:9,1280×720)。挑高的天花板與管線;阿樹抬頭嚇到,師傅指著上面。
  // =====================================================================
  function eyesUp(ctx, o) { // 眼白在原位,瞳孔往上看(蓋在引擎畫的大眼睛上)
    onHead(ctx, o, () => {
      for (const sd of [-1, 1]) {
        const cx = sd * 26, cy = -7;
        G.ellipse(ctx, cx, cy, 24, 21, { fill: '#FFFFFF', lw: 3.5, seed: 720 + sd });
        ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.ellipse(cx + sd * 1.5, cy - 9, 9, 10.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx + sd * 1.5 - 3, cy - 12, 2.8, 0, Math.PI * 2); ctx.fill();
      }
      for (const sd of [-1, 1]) G.line(ctx, [[sd * 12, -40], [sd * 42, -24]], { lw: 7, seed: o.seed + 27 + sd, color: o.style.hair }); // 眉毛重畫在眼白上面
    });
  }
  function shockLines(ctx, x, y, r0, r1, seed, color = INK) {
    for (const [a, l] of [[-2.55, 1], [-2.2, 0.8], [-0.95, 0.8], [-0.6, 1]]) G.line(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r0 * l + Math.cos(a) * (r1 - r0) * l, y + Math.sin(a) * r0 * l + Math.sin(a) * (r1 - r0) * l]], { color, lw: 9, seed: seed + Math.round(a * 10) });
  }
  function bigText(ctx, str, x, y, size, fill, { line = NAVY, lw = 30, shadow = true, align = 'left', fam = CJK } = {}) {
    if (shadow) G.text(ctx, str, x + size * 0.05, y + size * 0.06, { size, fam, weight: 800, color: line, align, boil: 0, stroke: line, strokeW: lw });
    G.text(ctx, str, x, y, { size, fam, weight: 800, color: fill, align, boil: 0, stroke: line, strokeW: lw });
  }
  function thumb(ctx, t, v) {
    // 牆:往上收的透視(從地面往上看,天花板很高)
    fillRect(ctx, 0, 0, W, H, lin(ctx, 0, 0, 0, H, [[0, '#9FADB9'], [0.35, '#C5D0D9'], [1, '#E2E8ED']]));
    const VX = 1500, VY = -2600; // 消失點(畫面上方很遠)
    for (const bx of [-260, 330, 1000, 1720, 2300]) { // 往上收的柱子
      const w0 = 120, k = (0 - H) / (VY - H), xt0 = bx + (VX - bx) * k, xt1 = bx + w0 + (VX - bx - w0) * k;
      G.poly(ctx, [[bx, H + 20], [bx + w0, H + 20], [xt1, 0], [xt0, 0]], { fill: '#AEB9C3', lw: 5, seed: 1701 + bx, step: 40 });
    }
    // 天花板與很高的管線(小、遠)
    fillRect(ctx, -10, -10, W + 20, 64, lin(ctx, 0, 0, 0, 54, [[0, '#3E4855'], [1, '#5C6672']]));
    G.line(ctx, [[-20, 54], [W + 20, 54]], { color: INK, lw: 5, seed: 1720 });
    pipeRack(ctx, -30, W + 30, 112, { th: 24, gap: 34, rods: [120, 520, 920, 1320, 1720], seed: 1730, ceil: 54 });
    G.rrect(ctx, -30, 262, W + 60, 18, 3, { fill: '#8E99A3', lw: 4, seed: 1760 }); // 電纜架
    for (let x = 20; x < W; x += 60) G.line(ctx, [[x, 264], [x, 278]], { color: '#5C6470', lw: 3, seed: 1761 + x });
    // 管線的高度:尺規(由地面拉到管線)
    if (v !== 2) {
      const rx = 1888, y0 = 156, y1 = H - 10;
      stroke(ctx, [[rx, y0], [rx, y1]], RED, 7, 'butt');
      for (const [y, d] of [[y0, 1], [y1, -1]]) { G.poly(ctx, [[rx, y], [rx - 16, y + d * 30], [rx + 16, y + d * 30]], { fill: RED, lw: 0, seed: 1770 + y, step: 30 }); stroke(ctx, [[rx - 26, y], [rx + 26, y]], RED, 5); }
    }

    // 角色
    const sS = 1.95, sM = 1.8;
    const so = { x: 1235, y: 640 - HEAD_Y * sS, s: sS, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'wide', mouth: 'open', brows: 'worried', sweat: 1, blush: 0.25, look: 0, lookY: -1 };
    so.handL = [-64, -366]; so.handR = [64, -366]; // 雙手摀著臉頰
    const mo = { x: 1660, y: 600 - HEAD_Y * sM, s: sM, sx: -1, pose: 'stand', style: CAST.master, seed: 440, gesture: 'pointUp', eyes: 'normal', mouth: 'flat', brows: 'neutral', look: 0.75, lookY: 0.1, blush: 0.3 };
    Ch.person(ctx, mo);
    Ch.person(ctx, so);
    eyesUp(ctx, so);
    const hs = headAt(so);
    shockLines(ctx, hs.x, hs.y - 30, 170 * sS / 1.95 + 60, 250, 1780);

    // 大字
    const L1 = '漏一行', L2 = '倒貼18萬';
    const size2 = fitSize(ctx, L2, 860, 230), size1 = Math.min(size2 * 1.0, 250);
    if (v === 1) { bigText(ctx, L1, 70, 380, size1, '#FFFFFF'); bigText(ctx, L2, 70, 380 + size2 * 1.18, size2, '#FFD84A'); }
    else { bigText(ctx, L1, 70, 380, size1, '#FFFFFF'); bigText(ctx, L2, 70, 380 + size2 * 1.18, size2, '#FF5A3C'); }
  }

  const PIECES = S.PIECES;
  const which = (t) => (t < PIECES.avatar[1] ? 'avatar' : t < PIECES.banner[1] ? 'banner' : 'thumb');
  Studio.film({
    post: (t) => ({ avatar: { vignette: 0, grain: 0.02, paper: 0.18 }, banner: { vignette: 0.06, grain: 0.03, paper: 0.3 }, thumb: { vignette: 0.12, grain: 0.03, paper: 0.25 } })[which(t)],
    fadeOut: 0,
    draw(ctx, t) {
      const p = which(t), v = Math.round((t - PIECES[p][0]) * 10) % 10; // 小數點後一位 = 版本(定稿用 .5)
      ({ avatar, banner, thumb })[p](ctx, t, v);
    },
  });
})();
