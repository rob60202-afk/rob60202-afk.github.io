// 頻道圖像素材:頭像、橫幅、L003 縮圖。每一張都是時間 t 的純函式(t 只用來選要畫哪一張)。
// 角色造型照抄 field-05-harness 的 CAST,畫法與各集相同。
(function () {
  const G = globalThis.G, Ch = globalThis.Ch, Studio = globalThis.Studio, S = globalThis.SCORE;
  const W = G.W, H = G.H;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  // 網站配色
  const NAVY = '#0a1421', PAPER = '#f4f2ed', ACID = '#b7f33d';
  // 各集用的顏色
  const INK = '#3A2A20', GREEN = '#3E9B5F', YELLOW = '#F2C230', ORANGE = '#F28C28', TUBE = '#8E99A3';

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
  // 1. 頭像(1:1)。YouTube 會裁成圓形:兩張臉在圓半徑的 70% 以內,帽簷尖端約 90%(仍在圓內);不放字。
  // =====================================================================
  // 師傅(左右翻過來,站在阿樹左邊)用靠阿樹那一側的手(他的左手),繞到阿樹背後,搭在阿樹另一邊的肩膀上。
  // 手臂跟著師傅一起畫(被阿樹擋住),搭在肩上的手等阿樹畫完再補上。
  function armAround(mo, so) { const p = world(so, 60 * BW.slim + 4, -326); mo.handL = hand(mo.x, mo.y, mo.s, mo.sx || 1, p[0], p[1]); }
  function handOnShoulder(ctx, mo) {
    local(ctx, mo, () => {
      const [hx, hy] = mo.handL, sk = CAST.master.skin;
      G.ellipse(ctx, hx - 4, hy + 2, 22, 18, { fill: sk, lw: 4, seed: 470 });
      for (let k = 0; k < 3; k++) G.rrect(ctx, hx - 20 + k * 13, hy + 4, 12, 26, 6, { fill: sk, lw: 3.5, seed: 471 + k });
    });
  }
  function avatar(ctx) {
    const C = W / 2;
    // 墨色底,頭後面稍微亮一點;外圈一道螢光綠(網站的配色)
    fillRect(ctx, 0, 0, W, H, NAVY);
    fillRect(ctx, 0, 0, W, H, rad(ctx, C, C - 40, 30, 560, [[0, 'rgba(70,104,140,0.55)'], [0.65, 'rgba(30,52,76,0.35)'], [1, 'rgba(10,20,33,0)']]));
    ctx.save(); ctx.strokeStyle = ACID; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(C, C, 496, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // 師傅在左、阿樹在右;師傅左右翻過來,兩頂帽簷都朝外,中間留給兩張臉
    const s = 2.5;
    const mo = { x: 372, y: 466 - HEAD_Y * s, s, sx: -1, pose: 'stand', style: CAST.master, seed: 440, eyes: 'happy', mouth: 'smile', brows: 'neutral', blush: 0.45, headRot: -0.05, look: 0 };
    const so = { x: 706, y: 494 - HEAD_Y * s, s, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: 'grin', brows: 'up', blush: 0.65, headRot: -0.05, look: -0.15 };
    armAround(mo, so);
    Ch.person(ctx, mo);
    Ch.person(ctx, so);
    handOnShoulder(ctx, mo);
  }

  // =====================================================================
  // 2. 橫幅(16:9,算成 2560×1440)。所有裝置都看得到的只有正中央 1546×423:
  //    角色的上半身與文字放在裡面(兩人站在地板上,腰以下在安全區下方,只有電視看得到);
  //    外面只有現場背景。
  // =====================================================================
  const K_B = 1440 / 1080;
  const BS = { x: 960 - 1546 / 2 / K_B, y: 540 - 423 / 2 / K_B, w: 1546 / K_B, h: 423 / K_B }; // 安全區,舞台座標
  function banner(ctx) {
    const GB = 812; // 牆與地板的交界
    // 牆(柱子放在安全區外,不擋到臉和字)
    fillRect(ctx, 0, 0, W, H, lin(ctx, 0, 0, 0, GB, [[0, '#BFCAD3'], [0.5, '#D6DEE4'], [1, '#E6EBEF']]));
    for (const cx of [70, 1850]) column(ctx, cx, 60, GB, 70, 1101 + cx);
    for (const cx of [350, 1570]) column(ctx, cx, 60, GB, 56, 1111 + cx);
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
    // 標語一行(手機上約 25px 高);小字兩行(約 15px):「|」改成換行
    const big = fitSize(ctx, '每一集,一個現場教訓', inner, 74), small = 46;
    const yBig = by0 + 36 + big * 0.86, ySmall2 = by1 - 34, ySmall1 = ySmall2 - small * 1.3;
    richLine(ctx, [['每一集,一個', PAPER], ['現場教訓', ACID]], cx, yBig, big);
    richLine(ctx, [['報價', PAPER], ['・', ACID], ['品質', PAPER], ['・', ACID], ['工安', PAPER], ['・', ACID], ['管理', PAPER]], cx, ySmall1, small);
    richLine(ctx, [['免費工具在每支影片的說明欄', '#C9D3DC']], cx, ySmall2, small);

    // 角色:師傅雙手抱胸笑著(field-05 阿樹扣上掛鉤那一幕的姿勢;手肘不會伸出安全區),阿樹拿著檢核表
    const s = 0.95;
    const mo = { x: 520, y: 872, s, sx: -1, pose: 'stand', style: CAST.master, seed: 440, crossArms: true, eyes: 'happy', mouth: 'smile', brows: 'neutral', blush: 0.45, headRot: -0.04, look: -0.1 };
    const so = { x: 676, y: 884, s, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: 'grin', brows: 'up', blush: 0.65, headRot: -0.03, look: -0.2 };
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
  function shockLines(ctx, x, y, r0, r1, degs, seed, color = INK) { // 頭頂冒出來的「嚇到」短線
    for (const d of degs) { const a = d * Math.PI / 180; G.line(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { color, lw: 10, seed: seed + d }); }
  }
  function bigText(ctx, str, x, y, size, fill, { line = NAVY, lw = 30, shadow = true, align = 'left', fam = CJK } = {}) {
    if (shadow) G.text(ctx, str, x + size * 0.05, y + size * 0.06, { size, fam, weight: 800, color: line, align, boil: 0, stroke: line, strokeW: lw });
    G.text(ctx, str, x, y, { size, fam, weight: 800, color: fill, align, boil: 0, stroke: line, strokeW: lw });
  }
  function shockMouth(ctx, o) { // 嚇到張大的嘴(蓋在引擎畫的小 o 上)
    onHead(ctx, o, () => {
      G.ellipse(ctx, 0, 47, 20, 27, { fill: '#3A1D1A', lw: 4, seed: 731 });
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 47, 18, 25, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#E8718D'; ctx.beginPath(); ctx.ellipse(0, 72, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
  // 從下往上看的高牆:柱子往上收、牆板接縫越往上越密、越高越暗,管線畫得細小(很高、很遠)
  function tallRoom(ctx, { VX = 960, VY = -3200, top = 52 } = {}) {
    fillRect(ctx, 0, 0, W, H, lin(ctx, 0, 0, 0, H, [[0, '#9EACB8'], [0.45, '#C6D0D9'], [1, '#E3E9EE']]));
    const at = (bx, y) => VX + (bx - VX) * (VY - y) / (VY - H); // 地面上 x = bx 的鉛直線,到高度 y 時的 x
    let y = H + 30, gap = 210, k = 0;
    while (y > top + 24) { G.line(ctx, [[-20, y], [W + 20, y]], { color: '#8D9AA6', lw: 3.5, seed: 1690 + k, alpha: 0.55 }); y -= gap; gap *= 0.8; k++; }
    for (const bx of [-40, 760, 1560, 2360]) {
      const w0 = 118;
      G.poly(ctx, [[bx, H + 30], [bx + w0, H + 30], [at(bx + w0, top), top], [at(bx, top), top]], { fill: '#AEB9C3', lw: 5, seed: 1701 + bx, step: 40 });
      G.line(ctx, [[bx + 16, H], [at(bx + 16, top + 10), top + 10]], { color: '#FFFFFF', lw: 5, seed: 1705 + bx, alpha: 0.35 });
    }
    // 越高越暗(往墨色收),亮的管線才跳得出來
    fillRect(ctx, -10, -10, W + 20, 660, lin(ctx, 0, 0, 0, 650, [[0, 'rgba(10,20,33,0.94)'], [0.42, 'rgba(10,20,33,0.6)'], [1, 'rgba(10,20,33,0)']]));
    // 天花板、吊燈、管線
    fillRect(ctx, -10, -10, W + 20, top + 10, '#1B2733');
    G.line(ctx, [[-20, top], [W + 20, top]], { color: '#05090F', lw: 5, seed: 1720 });
    for (const lx of [420, 1180]) {
      fillRect(ctx, lx - 380, top, 760, 420, rad(ctx, lx, top + 120, 10, 380, [[0, 'rgba(255,236,190,0.30)'], [1, 'rgba(255,236,190,0)']]));
      G.line(ctx, [[lx, top], [lx, top + 196]], { color: '#5C6470', lw: 4, seed: 1721 + lx });
      G.poly(ctx, [[lx - 46, top + 236], [lx - 22, top + 196], [lx + 22, top + 196], [lx + 46, top + 236]], { fill: '#5C6470', lw: 4, seed: 1722 + lx, step: 20 });
      G.ellipse(ctx, lx, top + 238, 40, 10, { fill: '#FFF3CF', lw: 3, seed: 1723 + lx });
    }
    pipeRack(ctx, -30, W + 30, top + 50, { th: 22, gap: 32, rods: [200, 600, 1000, 1400, 1800], seed: 1730, ceil: top });
  }
  function thumb(ctx) {
    tallRoom(ctx);
    // 紅色虛線圈:要施工的管線在那麼高的地方(各集標示問題的畫法)
    ctx.save(); ctx.strokeStyle = '#FF5A3C'; ctx.lineWidth = 11; ctx.setLineDash([30, 18]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(1330, 152, 300, 98, -0.03, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // 角色
    const sS = 1.95, sM = 1.78;
    const so = { x: 1215, y: 652 - HEAD_Y * sS, s: sS, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'wide', mouth: 'o', brows: 'worried', sweat: 1, blush: 0.2, look: 0, lookY: -1 };
    so.handL = [-55, -356]; so.handR = [55, -356]; // 雙手捧著臉頰
    const mo = { x: 1638, y: 612 - HEAD_Y * sM, s: sM, sx: -1, pose: 'stand', style: CAST.master, seed: 440, gesture: 'pointUp', eyes: 'normal', mouth: 'flat', brows: 'neutral', look: 0.75, lookY: 0.1, blush: 0.3 };
    Ch.person(ctx, mo);
    Ch.person(ctx, so);
    eyesUp(ctx, so);
    shockMouth(ctx, so);
    const hs = headAt(so);
    shockLines(ctx, hs.x, hs.y, 212, 274, [-160, -130, -100, -70], 1780); // 右邊是師傅舉起的手臂,不畫

    // 大字(左下;上方留給天花板。右下角會被 YouTube 的影片長度蓋住,不放字)
    const L1 = '漏一行', L2 = '倒貼18萬', x0 = 64;
    const size2 = fitSize(ctx, L2, 880, 236), size1 = size2;
    const y2 = H - 78, y1 = y2 - size2 * 1.12;
    bigText(ctx, L1, x0, y1, size1, '#FFFFFF');
    bigText(ctx, L2, x0, y2, size2, '#FF5A3C');
  }

  // t 落在哪一段(score.js 的 PIECES),就畫哪一張;紙紋與顆粒比各集淡,縮小後才不會髒
  const PIECES = S.PIECES;
  const which = (t) => (t < PIECES.avatar[1] ? 'avatar' : t < PIECES.banner[1] ? 'banner' : 'thumb');
  const POST = { avatar: { vignette: 0, grain: 0.02, paper: 0.18 }, banner: { vignette: 0.06, grain: 0.03, paper: 0.3 }, thumb: { vignette: 0.12, grain: 0.03, paper: 0.25 } };
  Studio.film({
    post: (t) => POST[which(t)],
    fadeOut: 0,
    draw(ctx, t) { ({ avatar, banner, thumb })[which(t)](ctx); },
  });
})();
