// 工程現場故事 第 9 集:那顆沒開回來的閥。每一格都是時間 t 的純函式。
// 工地場景的人物一律用 KIT.onSite 造型(安全帽 + 扣好的頤帶 + 反光背心):手冊第三節,第 8 集起。
(function () {
  const U = globalThis.U, G = globalThis.G, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H;
  const C = KIT.C, CJK = KIT.CJK, NUM = KIT.NUM;
  const INK = C.ink, RED = C.red, GREEN = C.green;
  const { fill, lin, rad, stroke, label, popIn, blink } = KIT;
  const GROUND = 1300;
  const R = E[8]; // 第 9 句念完 = 開始復歸
  let VO = null, SUBS = [];

  // ---------- 現場配置(場景座標) ----------
  const PY = 1000, PT = 44;                        // 主管:中心高度、管徑
  const V1X = 330, V1S = 1.2;                      // 上游手閥
  const TEEX = 470, STUBY = 1105, OUTX = 615, V2X = 535, V2S = 0.6; // 排放:三通往下 → 橫的短管(排放閥)→ 出口往下 → 軟管到水桶
  const J1X = 720, J2X = 890;                      // 要換的那一段管:兩端的法蘭
  const BUCKX = 645, CARTX = 1030;                 // 水桶、工具推車
  const CLK = [870, 640, 62];
  const SHU_AT = 190;                              // 阿樹轉上游閥時站的位置(閥的左邊,右手搆得到把手)                      // 牆上的鐘
  const L1 = 112;                                  // 把手長度(s = 1)
  const OPEN = 0, SHUT = -Math.PI / 2;             // 把手順著管 = 開;把手垂直管子(朝上)= 關
  const PIPE = '#5E9BD0', PIPE_OLD = '#7C93A6', PIPE_NEW = '#7DBDEB', FIT = '#4F8CC4';

  // ---------- 角色:工地造型(安全帽 + 頤帶 + 反光背心) ----------
  const SHU = KIT.CAST.shuSite, MASTER = KIT.CAST.masterSite;
  const OPER = KIT.onSite({ outfit: 'shirt', shirt: '#4F6E94', bottoms: 'pants', shorts: '#353B47', pants: '#353B47', skin: '#D9A27E', hair: '#2A2220', hairStyle: 'short', build: 'regular', shoes: '#2A2220' }, '#3C78C0');
  globalThis.CAST = { shuSite: SHU, masterSite: MASTER, operator: OPER };
  const SKIN = SHU.skin;
  const person = (ctx, o) => KIT.person(ctx, { pose: 'stand', s: 1, y: GROUND, blush: 0.45, ...o });

  // ---------- 鏡頭:把場景裡的 (cx, cy) 放到畫面 (540, fy),放大 z 倍 ----------
  const wide = (z, cx) => ({ z, cx, cy: GROUND, fy: GROUND });
  function view(ctx, c, fn) { ctx.save(); ctx.translate(540, c.fy); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); fn(); ctx.restore(); }
  const toScr = (c, x, y) => [540 + (x - c.cx) * c.z, c.fy + (y - c.cy) * c.z];
  function finish(ctx, warm = 'rgba(255,214,140,0.16)', floor = 0.28) {
    fill(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fill(ctx, -200, 1240, W + 400, 900, lin(ctx, 0, 1240, 0, 1920, [[0, 'rgba(40,30,30,0)'], [1, `rgba(40,30,30,${floor})`]]));
  }

  // ---------- 背景 ----------
  // 背景每一格直接畫(不用快取):鏡頭可以看到 1080 以外,放大時線條也不會糊
  const roomBg = (ctx, t) => KIT.bg.fab(ctx, t, { floor: GROUND, pipeY: 250, x0: -420, x1: 1560, columns: [40, 1220], hangers: [300, 820, 1340], machines: [] });
  const MACH = [[48, 180, 470], [244, 180, 470], [440, 180, 470], [636, 180, 470], [832, 180, 470]];
  const machinesBg = (ctx, t) => KIT.bg.fab(ctx, t, { floor: GROUND, pipeY: 250, x0: -200, x1: 1280, columns: [], hangers: [540], machines: MACH });
  const wallClock = (ctx, hours, night = false) => KIT.wallClock(ctx, CLK[0], CLK[1], CLK[2], hours, { night });

  // ---------- 管、閥、牌子 ----------
  function pipeH(ctx, x0, x1, y, th, color, seed) { KIT.pipeRun(ctx, x0, x1, y, th, color, seed); }
  function pipeV(ctx, x, y0, y1, th, color, seed) {
    G.rrect(ctx, x - th / 2, y0, th, y1 - y0, th * 0.45, { fill: color, lw: 4, seed });
    G.line(ctx, [[x - th * 0.2, y0 + 6], [x - th * 0.2, y1 - 6]], { color: '#FFFFFF', lw: 3, seed: seed + 1, alpha: 0.55, amp: 0.4 });
  }
  function flange(ctx, x, y, seed) { // 一對法蘭 + 螺栓
    for (const dx of [-9, 9]) G.rrect(ctx, x + dx - 8, y - 38, 16, 76, 4, { fill: '#8E99A3', lw: 4, seed: seed + dx });
    for (const by of [-25, 25]) G.rrect(ctx, x - 23, y + by - 5, 46, 10, 3, { fill: '#5C6470', lw: 3, seed: seed + 40 + by });
  }
  function bracket(ctx, x, seed) { // 牆上的托架 + U 型管夾
    G.rrect(ctx, x - 34, PY + PT / 2, 68, 12, 3, { fill: '#7F8B96', lw: 3.5, seed });
    G.rrect(ctx, x - 7, PY + PT / 2 + 10, 14, 50, 3, { fill: '#6C7680', lw: 3, seed: seed + 1 });
    stroke(ctx, [[x - 26, PY + PT / 2 + 2], [x - 26, PY - 6], [x - 14, PY - PT / 2 - 5], [x + 14, PY - PT / 2 - 5], [x + 26, PY - 6], [x + 26, PY + PT / 2 + 2]], '#5C6470', 5);
  }
  function bucket(ctx, x, y, seed = 770) {
    G.poly(ctx, [[x - 46, y - 82], [x + 46, y - 82], [x + 38, y - 2], [x - 38, y - 2]], { fill: '#8E99A3', lw: 4.5, seed, step: 16 });
    G.rrect(ctx, x - 50, y - 88, 100, 12, 5, { fill: '#AEB9C3', lw: 3.5, seed: seed + 1 });
    G.line(ctx, [[x - 40, y - 52], [x + 40, y - 52]], { color: '#7F8B96', lw: 3, seed: seed + 2, alpha: 0.7 });
  }
  // 球閥(閥桿朝鏡頭,把手在畫面平面上轉):ang 0 = 把手順著管 = 開;-π/2 = 把手垂直管子 = 關
  function ballValve(ctx, x, y, ang, { s = 1, seed = 50 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const sd of [-1, 1]) G.rrect(ctx, sd * 44 - 13, -33, 26, 66, 6, { fill: '#7F8B96', lw: 4, seed: seed + 1 + sd });
    G.rrect(ctx, -36, -29, 72, 58, 16, { fill: '#AAB4BE', lw: 4.5, seed });
    G.ellipse(ctx, 0, 0, 22, 22, { fill: '#C9D0D7', lw: 4, seed: seed + 4 });
    ctx.rotate(ang);
    G.rrect(ctx, -8, -8, L1 * 0.46 + 8, 16, 5, { fill: '#8A8F98', lw: 3.5, seed: seed + 5 });
    G.rrect(ctx, L1 * 0.4, -12, L1 * 0.6, 24, 11, { fill: RED, lw: 4, seed: seed + 6 });
    ctx.rotate(-ang);
    G.ellipse(ctx, 0, 0, 9, 9, { fill: '#5C6470', lw: 3, seed: seed + 7 });
    ctx.restore();
  }
  const gripAt = (x, y, ang, s = 1, k = 0.55) => [x + Math.cos(ang) * L1 * k * s, y + Math.sin(ang) * L1 * k * s];
  // 牌子:(x, y) = 綁線的點,牌子掛在下面。三格:姓名、時間、原因
  function valveTag(ctx, x, y, s, rot = 0, f = {}, a = 1) {
    if (a <= 0 || s <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
    const w = 130, h = 196, y0 = 18;
    stroke(ctx, [[0, -4], [0, y0 + 14]], '#4A4F58', 3.5);
    ctx.fillStyle = 'rgba(30,20,15,0.18)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, y0 + 6, w, h, 12); ctx.fill();
    G.rrect(ctx, -w / 2, y0, w, h, 12, { fill: '#FFF8E6', lw: 4, seed: 860 });
    G.ellipse(ctx, 0, y0 + 13, 7, 7, { fill: '#D9DEE3', lw: 3, seed: 861 });
    G.rrect(ctx, -w / 2 + 8, y0 + 26, w - 16, 40, 6, { fill: RED, lw: 0, seed: 862 });
    G.text(ctx, '請勿操作', 0, y0 + 55, { size: 25, fam: CJK, weight: 800, color: '#FFFFFF', align: 'center', boil: 0 });
    [['姓名', f.name], ['時間', f.time], ['原因', f.why]].forEach(([k, v], i) => {
      const yy = y0 + 104 + i * 36;
      if (f.hi === i && f.hiA > 0) { ctx.save(); ctx.globalAlpha *= f.hiA * 0.9; ctx.fillStyle = C.hi; ctx.beginPath(); ctx.roundRect(-w / 2 + 4, yy - 26, (w - 8) * Math.min(1, f.hiA * 1.5), 36, 8); ctx.fill(); ctx.restore(); }
      G.text(ctx, k, -w / 2 + 9, yy, { size: 22, fam: CJK, weight: 800, color: '#6C5A48', boil: 0 });
      stroke(ctx, [[-6, yy + 6], [w / 2 - 9, yy + 6]], '#B8AE9A', 2.5);
      if (v) G.text(ctx, v, 25, yy - 1, { size: 24, fam: /^[0-9:]+$/.test(v) ? NUM : CJK, weight: 800, color: '#2B3A5C', align: 'center', boil: 0 });
    });
    ctx.restore();
  }
  const swing = (t, t0, amp = 0.22) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * 2.4) * Math.sin((t - t0) * 8));
  const TAG1 = [V1X, PY + 33 * V1S + 1], TAG2 = [V2X, STUBY + 33 * V2S + 1]; // 牌子綁的地方:閥體下面
  const FILL1 = { name: '阿樹', time: '14:00', why: '換管' }, FILL2 = { name: '阿樹', time: '14:02', why: '換管' };
  // 管裡流動的方向箭頭(水流停了就淡掉)
  function flowArrows(ctx, t, a) {
    if (a <= 0.01) return;
    const skip = [[V1X, 80], [TEEX, 34], [J1X, 32], [J2X, 32], [140, 34], [990, 34]];
    ctx.save(); ctx.globalAlpha *= Math.min(1, a) * 0.9;
    for (let k = 0; k < 17; k++) {
      const x = ((k * 130 + t * 80) % 2210 + 2210) % 2210 - 500;
      if (skip.some(([sx, r]) => Math.abs(x - sx) < r)) continue;
      stroke(ctx, [[x - 8, PY - 11], [x + 6, PY], [x - 8, PY + 11]], '#FFFFFF', 5.5);
    }
    ctx.restore();
  }
  // 整段管路。st:v1/v2 把手角度、seg 要換的那段('old' | 'new')、flow 0..1、tag1/tag2 { s, rot, f }
  function plant(ctx, t, { v1 = OPEN, v2 = SHUT, flow = 1, seg = 'new', tag1 = null, tag2 = null, shine = 0 } = {}) {
    // 排放:三通往下 → 短管 → 出口 → 軟管 → 水桶
    pipeV(ctx, TEEX, PY, STUBY + 8, 26, PIPE, 710);
    pipeH(ctx, TEEX - 12, OUTX + 12, STUBY, 26, PIPE, 712);
    pipeV(ctx, OUTX, STUBY, STUBY + 44, 26, PIPE, 714);
    for (const ex of [TEEX, OUTX]) G.ellipse(ctx, ex, STUBY, 17, 17, { fill: FIT, lw: 4, seed: 716 + ex });
    G.limb(ctx, [[OUTX, STUBY + 40], [OUTX + 6, STUBY + 86], [BUCKX - 6, GROUND - 80]], { color: '#3A3D44', lw: 13, outline: 3, seed: 718 });
    bucket(ctx, BUCKX, GROUND);
    for (const bx of [140, 990]) bracket(ctx, bx, 720 + bx);
    // 主管
    pipeH(ctx, -500, J1X, PY, PT, PIPE, 730);
    pipeH(ctx, J1X, J2X, PY, PT, seg === 'old' ? PIPE_OLD : PIPE_NEW, 732);
    if (seg === 'old') for (const [sx, sy, r] of [[760, 994, 9], [812, 1008, 6], [858, 990, 7]]) G.ellipse(ctx, sx, sy, r * 1.4, r, { fill: 'rgba(150,95,60,0.55)', lw: 0, seed: 734 + sx }); // 舊管的鏽
    pipeH(ctx, J2X, 1620, PY, PT, PIPE, 736);
    G.rrect(ctx, TEEX - 24, PY - PT / 2 - 5, 48, PT + 10, 8, { fill: FIT, lw: 4, seed: 738 }); // 三通
    flange(ctx, J1X, PY, 740); flange(ctx, J2X, PY, 760);
    if (shine > 0) for (const [sx, sy, k] of [[J1X + 60, PY - 34, 0], [(J1X + J2X) / 2, PY - 6, 1], [J2X - 50, PY + 30, 2]]) KIT.sparkle(ctx, sx, sy, 22 * clamp(shine * 3 - k * 0.4), clamp(1.6 - shine * 1.2), shine * 2 + k);
    flowArrows(ctx, t, flow);
    ballValve(ctx, V2X, STUBY, v2, { s: V2S, seed: 780 });
    ballValve(ctx, V1X, PY, v1, { s: V1S, seed: 790 });
    if (tag2) valveTag(ctx, TAG2[0], TAG2[1], tag2.s || 0.7, tag2.rot || 0, tag2.f || FILL2, tag2.a ?? 1);
    if (tag1) valveTag(ctx, TAG1[0], TAG1[1], tag1.s || 0.95, tag1.rot || 0, tag1.f || FILL1, tag1.a ?? 1);
  }

  // ---------- 道具 ----------
  function cart(ctx, x, seed = 800) { // 工具推車(上層放工具箱)
    for (const lx of [-64, 64]) G.rrect(ctx, x + lx - 6, 1112, 12, 172, 3, { fill: '#5C6470', lw: 3, seed: seed + lx });
    G.rrect(ctx, x - 76, 1106, 152, 16, 4, { fill: '#2F6DB5', lw: 4, seed: seed + 1 });
    G.rrect(ctx, x - 76, 1222, 152, 14, 4, { fill: '#2F6DB5', lw: 4, seed: seed + 2 });
    for (const wx of [-60, 60]) G.ellipse(ctx, x + wx, 1288, 11, 11, { fill: '#3A3A44', lw: 3, seed: seed + 3 + wx });
  }
  function toolbox(ctx, x, y, lid = 0, seed = 820) { // (x, y) = 底部中心;lid 0 蓋著 … 1 打開
    G.rrect(ctx, x - 62, y - 54, 124, 54, 7, { fill: '#C8452F', lw: 4.5, seed });
    G.rrect(ctx, x - 52, y - 36, 104, 8, 3, { fill: '#A8361F', lw: 0, seed: seed + 3 });
    ctx.save(); ctx.translate(x + 62, y - 54); ctx.rotate(lid * 1.85);
    G.rrect(ctx, -126, -16, 128, 18, 6, { fill: '#D9573F', lw: 4, seed: seed + 1 });
    if (lid < 0.2) G.rrect(ctx, -84, -30, 44, 14, 5, { fill: '#3A3A44', lw: 3, seed: seed + 2 });
    ctx.restore();
  }
  function wrench(ctx, hx, hy, rot, s = 1) { // 以握把(手)為原點,開口朝上
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(0, -84);
    G.rrect(ctx, -9, -8, 18, 100, 8, { fill: '#8A8F98', lw: 4, seed: 41 });
    G.ellipse(ctx, 0, -18, 24, 24, { fill: '#8A8F98', lw: 4, seed: 42 });
    G.rrect(ctx, -9, -46, 18, 26, 2, { fill: '#5C6470', lw: 0, seed: 43 });
    ctx.restore();
  }
  function clipboard(ctx, x, y, rot, seed = 840) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    G.rrect(ctx, -46, -62, 92, 124, 8, { fill: '#B98A5E', lw: 4, seed });
    G.rrect(ctx, -38, -50, 76, 104, 4, { fill: '#FFFDF4', lw: 3, seed: seed + 1 });
    for (let k = 0; k < 4; k++) stroke(ctx, [[-28, -30 + k * 22], [24 - (k % 2) * 16, -30 + k * 22]], '#B8AE9A', 4);
    G.rrect(ctx, -18, -70, 36, 16, 4, { fill: '#8A8F98', lw: 3, seed: seed + 2 });
    ctx.restore();
  }
  function pen(ctx, x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); G.rrect(ctx, -5, -46, 10, 54, 4, { fill: '#2B5FA8', lw: 3, seed: 850 }); ctx.restore(); }
  function flashlight(ctx, x, y, ang, seed = 860) { // (x, y) = 握的位置;回傳燈頭位置
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    G.rrect(ctx, -26, -10, 58, 20, 6, { fill: '#3A3D44', lw: 3.5, seed });
    G.rrect(ctx, 28, -15, 20, 30, 5, { fill: '#5C6470', lw: 3.5, seed: seed + 1 });
    G.ellipse(ctx, 48, 0, 5, 13, { fill: '#FFF6D0', lw: 2.5, seed: seed + 2 });
    ctx.restore();
    return [x + Math.cos(ang) * 50, y + Math.sin(ang) * 50];
  }
  // 近景裡從畫面外伸進來的手(阿樹:白 T 恤短袖 + 皮膚)
  function arm(ctx, from, to, seed = 870) {
    const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy) || 1;
    const sl = [from[0] + dx * 0.32, from[1] + dy * 0.32];
    G.limb(ctx, [from, to], { color: SKIN, lw: 40, outline: 5, seed });
    G.limb(ctx, [[from[0] - dx / d * 40, from[1] - dy / d * 40], sl], { color: '#F7F3EA', lw: 56, outline: 5, seed: seed + 1 });
    G.ellipse(ctx, to[0], to[1], 27, 25, { fill: SKIN, lw: 5, seed: seed + 2 });
  }
  const pill = (ctx, str, x, y, size, a, { bg = '#FFFDF4', fg = INK, rot = 0 } = {}) => { // 小字卡
    if (a <= 0) return;
    const w = KIT.measure(ctx, str, size) + size * 1.1, h = size * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    ctx.fillStyle = 'rgba(30,20,15,0.22)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 5, -h / 2 + 6, w, h, h / 2); ctx.fill();
    ctx.fillStyle = bg; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
    label(ctx, str, 0, size * 0.36, size, fg);
    ctx.restore();
  };

  // ---------- 夜裡:場景先畫一次再壓暗;燈照到的圓圈裡再畫一次亮的 ----------
  function night(ctx, scene, { dark = 0.86, lights = [] } = {}) {
    scene();
    fill(ctx, -600, -600, W + 1200, H + 1200, `rgba(8,12,30,${dark})`);
    for (const L of lights) {
      const r1 = L.r * 1.5, inner = L.inner || 0;
      ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, r1, 0, Math.PI * 2); ctx.clip();
      scene();
      if (L.warm !== false) fill(ctx, L.x - r1, L.y - r1, 2 * r1, 2 * r1, 'rgba(255,232,180,0.10)');
      fill(ctx, L.x - r1 - 2, L.y - r1 - 2, 2 * r1 + 4, 2 * r1 + 4, rad(ctx, L.x, L.y, L.r * 0.35, r1, [[0, `rgba(8,12,30,${inner * dark})`], [1, `rgba(8,12,30,${dark})`]]));
      ctx.restore();
    }
  }
  function haze(ctx, from, to, r, a = 1) { // 手電筒的光束
    const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.moveTo(from[0] + nx * 8, from[1] + ny * 8); ctx.lineTo(to[0] + nx * r, to[1] + ny * r); ctx.lineTo(to[0] - nx * r, to[1] - ny * r); ctx.lineTo(from[0] - nx * 8, from[1] - ny * 8); ctx.closePath();
    ctx.fillStyle = lin(ctx, from[0], from[1], to[0], to[1], [[0, 'rgba(255,240,200,0.30)'], [1, 'rgba(255,240,200,0.05)']]); ctx.fill();
    ctx.restore();
    KIT.glow(ctx, from[0], from[1], 40, 'rgba(255,246,210,0.9)', a);
  }
  function freezeLook(ctx, t, t0) { // 定格:四角框線、畫面偏冷、白光一閃
    if (t < t0) return;
    fill(ctx, -200, -200, W + 400, H + 400, 'rgba(196,214,240,0.10)');
    const fl = clamp(1 - (t - t0) / 0.16);
    if (fl > 0) fill(ctx, -200, -200, W + 400, H + 400, `rgba(255,255,255,${0.7 * fl})`);
    const L = 74, x0 = 110, x1 = 900, y0 = 300, y1 = 1250;
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], INK, 16); stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], '#FFFFFF', 9); }
  }

  // ---------- 1 阿樹要換一段管,先把上游的手閥關起來 ----------
  function sClose(ctx, t) {
    const pan = ease.inOutCubic(clamp((t - 1.35) / 1.4)), push = ease.inOutCubic(clamp((t - 3.0) / 1.9));
    const c = wide(lerp(1.4, 1.55, push), lerp(lerp(640, 400, pan), 345, push));
    const turn = ease.inOutCubic(clamp((t - ev.close) / (ev.shut - ev.close)));
    const v1 = lerp(OPEN, SHUT, turn), flow = 1 - clamp((t - ev.shut) / 0.35);
    const wk = clamp((t - 1.3) / 1.25), x = lerp(590, SHU_AT, ease.inOutQuad(wk)), walking = wk > 0 && wk < 1;
    const o = { x, style: SHU, seed: 400, blink: blink(t, 0.2), pose: walking ? 'walk' : 'stand', walk: walking ? ((590 - x) / 300) % 1 : 0,
      eyes: 'normal', mouth: t > ev.shut + 0.3 ? 'smile' : 'flat', brows: t > ev.reach ? 'determined' : 'neutral',
      look: t < 1.3 ? 0.9 : walking ? -0.7 : 0.7, lookY: t < 1.3 ? 0.25 : walking ? 0 : 0.3 };
    if (!walking && t > 2.5) {
      const gp = gripAt(V1X, PY, v1, V1S), tgt = KIT.hand(x, GROUND, 1, 1, gp[0], gp[1]), rest = [92, -180];
      const k = ease.inOutCubic(clamp((t - ev.reach) / 0.5)) * (1 - ease.inOutCubic(clamp((t - ev.shut - 0.45) / 0.45)));
      if (k > 0) o.handR = [lerp(rest[0], tgt[0], k), lerp(rest[1], tgt[1], k)];
    }
    view(ctx, c, () => {
      roomBg(ctx, t); wallClock(ctx, 14.0); cart(ctx, CARTX); toolbox(ctx, CARTX, 1106, 0);
      plant(ctx, t, { v1, flow, seg: 'old' });
      person(ctx, o);
      if (t >= ev.seg) { // 要換的那一段:紅色虛線框
        const a = popIn(t, ev.seg, 0.3) * (1 - clamp((t - 3.2) / 0.4)), p = 1 + 0.03 * Math.sin(t * 6);
        if (a > 0) {
          ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.translate((J1X + J2X) / 2, PY); ctx.scale(p, p);
          ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.setLineDash([16, 11]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.roundRect(-(J2X - J1X) / 2 - 34, -58, J2X - J1X + 68, 116, 22); ctx.stroke(); ctx.restore();
        }
      }
    });
    finish(ctx);
  }

  // ---------- 2 工作很順利,不到一小時就做完了(阿樹站在管子後面鎖法蘭,換好的那一段看得清楚) ----------
  const WORK_X = 760, BOLT = [J2X, PY + 25], WR = 0.62 * 84; // 扳手頭到握把的距離
  function sWork(ctx, t) {
    const c = wide(1.45, 800);
    const hours = 14.0 + (50 / 60) * ease.inOutCubic(clamp((t - ev.hour[0]) / (ev.hour[1] - ev.hour[0])));
    const shine = t >= ev.done ? clamp((t - ev.done) / 1.2) : 0;
    const o = { x: WORK_X, style: SHU, seed: 400, blink: blink(t, 0.2), eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.55, lookY: 0.55 };
    const H2 = (p) => KIT.hand(WORK_X, GROUND, 1, 1, p[0], p[1]);
    const rot = t < ev.done ? 0.5 + 0.14 * Math.sin(t * 9) : 0.5;
    let rh = [BOLT[0] - WR * Math.sin(rot), BOLT[1] + WR * Math.cos(rot)], wr = [rh[0], rh[1], rot];
    const front = [];  // 在管子前面的手(管子畫完再補畫)
    if (t < ev.done) { const lh = [806, PY - 12]; o.handL = H2(lh); front.push(lh); }
    else {
      o.eyes = 'happy'; o.mouth = 'smile'; o.brows = 'up'; o.look = 0.1; o.lookY = 0.1;
      const wp = clamp((t - ev.wipe) / 0.6);
      if (t >= ev.wipe && wp < 1) { o.handL = [-74 + Math.sin(wp * Math.PI * 3) * 7, -436]; o.sweat = 1 - wp; } // 手背擦太陽穴,不遮臉
      else if (t < ev.wipe) o.sweat = 0.8;
    }
    if (t >= ev.pack) { // 扳手收進工具箱
      const u = ease.inOutCubic(clamp((t - ev.pack) / 0.42));
      rh = [lerp(rh[0], CARTX - 58, u), lerp(rh[1], 1056, u)]; wr = u < 0.96 ? [rh[0], rh[1], lerp(rot, 1.4, u)] : null;
      o.look = 0.8; o.lookY = 0.6;
    }
    o.handR = H2(rh); front.push(rh);
    view(ctx, c, () => {
      roomBg(ctx, t); wallClock(ctx, hours);
      if (t >= ev.hour[0]) { // 鐘面上走過的那一段
        const a0 = -Math.PI / 2, a1 = a0 + (hours - 14) * Math.PI * 2;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#56B870'; ctx.beginPath(); ctx.moveTo(CLK[0], CLK[1]); ctx.arc(CLK[0], CLK[1], CLK[2] * 0.82, a0, a1); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      cart(ctx, CARTX); toolbox(ctx, CARTX, 1106, 1);
      person(ctx, o);
      plant(ctx, t, { v1: SHUT, v2: OPEN, flow: 0, seg: t < ev.done ? 'old' : 'new', shine }); // 拆管時排放閥開著(有洩掉)
      if (wr) wrench(ctx, wr[0], wr[1], wr[2], 0.62);
      front.forEach((h) => G.ellipse(ctx, h[0], h[1], 20, 20, { fill: SKIN, lw: 4, seed: 417 }));
    });
    if (t >= ev.done - 0.1) { // 不到一小時
      const [cx, cy] = toScr(c, CLK[0], CLK[1]);
      pill(ctx, '50 分鐘', cx, cy + CLK[2] * c.z + 56, 48, popIn(t, ev.done - 0.1, 0.3));
    }
    finish(ctx);
  }

  // ---------- 3 他收好工具,簽了完工單,下班(燈熄) ----------
  const PACK_X = 850;
  function sPack(ctx, t) {
    const c = wide(1.4, 880);
    const walking = t >= ev.walk, x = walking ? PACK_X + (t - ev.walk) * 380 : PACK_X;
    const o = { x, style: SHU, seed: 400, blink: blink(t, 0.2), eyes: 'normal', mouth: 'smile', brows: 'neutral', look: 0.8, lookY: 0.55 };
    const H2 = (wx, wy) => KIT.hand(x, GROUND, 1, 1, wx, wy);
    const lid = 1 - ease.outCubic(clamp((t - ev.lid) / 0.25));
    let carry = null, board = null, penAt = null;
    if (t < ev.sign - 0.3) { o.handR = H2(CARTX - 40, 1050 - (t < ev.lid ? 24 * (1 - clamp((t - ev.lid + 0.3) / 0.3)) : 0)); }
    else if (t < ev.wave - 0.15) { // 簽完工單
      board = [-26, -240]; o.handL = board; penAt = [24 + (t > ev.scrib && t < ev.scrib + 0.55 ? Math.sin(t * 40) * 10 : 0), -262];
      o.handR = penAt; o.look = -0.1; o.lookY = 0.9; o.mouth = 'flat';
    } else { // 提起工具箱、揮手、下班
      const up = ease.inOutCubic(clamp((t - (ev.wave - 0.15)) / 0.3));
      const hp = [lerp(CARTX - 40, x + 96, up), lerp(1050, 1150, up)];
      o.handR = H2(hp[0], hp[1]); carry = hp;
      o.eyes = 'happy'; o.mouth = 'grin'; o.look = walking ? 0.6 : 0; o.lookY = 0;
      if (!walking) o.handL = [-150 - 26 * Math.sin(t * 9), -440];
      else { o.pose = 'walk'; o.walk = ((x - PACK_X) / 300) % 1; }
    }
    const off = t >= ev.off, dark = off ? (t < ev.off + 0.14 ? (Math.floor((t - ev.off) * 28) % 2 ? 0.3 : 0.9) : 0.9) : 0;
    const scene = () => {
      roomBg(ctx, t); wallClock(ctx, 15.0); cart(ctx, CARTX);
      if (!carry) toolbox(ctx, CARTX, 1106, t < ev.lid ? 1 : lid);
      plant(ctx, t, { v1: SHUT, flow: 0, seg: 'new' });
      if (x < 1500) {
        person(ctx, o);
        if (board) { const b = KIT.world({ ...o, y: GROUND }, board[0], board[1]); clipboard(ctx, b[0] + 4, b[1] - 30, -0.1); }
        if (penAt) { const p = KIT.world({ ...o, y: GROUND }, penAt[0], penAt[1]); pen(ctx, p[0] + 2, p[1] - 8, 0.5); }
        if (carry) { const hw = KIT.world({ ...o, y: GROUND }, o.handR[0], o.handR[1]); toolbox(ctx, hw[0] + 10, hw[1] + 88, 0); G.ellipse(ctx, hw[0], hw[1], 19, 18, { fill: SKIN, lw: 3.5, seed: 419 }); }
      }
    };
    view(ctx, c, () => { if (!off) scene(); else night(ctx, scene, { dark }); });
    if (t >= ev.sign && t < ev.wave + 0.1) formCard(ctx, t);
    finish(ctx, off ? 'rgba(120,150,255,0.05)' : undefined);
  }
  function formCard(ctx, t) { // 完工單(只有工作與完工,沒有閥件紀錄)
    const a = popIn(t, ev.sign, 0.3) * (1 - clamp((t - ev.wave) / 0.1));
    if (a <= 0) return;
    ctx.save(); ctx.translate(300, 250); ctx.rotate(-0.02); ctx.scale(a, a);
    KIT.card(ctx, -230, 0, 460, 330, { fill: C.paper, seed: 610, tape: true });
    label(ctx, '完工單', 0, 72, 56, INK);
    stroke(ctx, [[-180, 98], [180, 98]], INK, 4);
    G.text(ctx, '工作:換一段管', -180, 156, { size: 42, fam: CJK, weight: 800, color: INK, boil: 0 });
    G.text(ctx, '狀態:完工', -180, 216, { size: 42, fam: CJK, weight: 800, color: INK, boil: 0 });
    KIT.tick(ctx, 58, 202, 22, popIn(t, ev.sign + 0.35, 0.25));
    G.text(ctx, '簽名:', -180, 286, { size: 42, fam: CJK, weight: 800, color: INK, boil: 0 });
    const s = clamp((t - ev.scrib) / 0.55);
    if (s > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-60, 230, 220 * s, 80); ctx.clip(); ctx.rotate(-0.06); G.text(ctx, '阿樹', -46, 292, { size: 52, fam: CJK, weight: 400, color: '#2B5FA8', boil: 0 }); ctx.restore(); }
    ctx.restore();
  }

  // ---------- 4 半夜,整排設備的警報一台接一台響起來 ----------
  function nightCard(ctx, t, str, t0) { // 左上角:月亮 + 時間
    const a = popIn(t, t0, 0.3);
    if (a <= 0) return;
    ctx.save(); ctx.translate(250, 300); ctx.scale(a, a);
    ctx.fillStyle = 'rgba(20,26,50,0.85)'; ctx.strokeStyle = '#E8ECF6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-170, -62, 340, 124, 26); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F6E7A8'; ctx.beginPath(); ctx.arc(-102, 0, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,26,50,1)'; ctx.beginPath(); ctx.arc(-88, -12, 30, 0, Math.PI * 2); ctx.fill();
    G.text(ctx, str, 40, 24, { size: 66, fam: NUM, weight: 800, color: '#FFFFFF', align: 'center', boil: 0 });
    ctx.restore();
  }
  function headerPipe(ctx) { // 給設備的管:沿著上面走,一台一支往下
    KIT.pipeRun(ctx, -200, 1280, 560, 40, PIPE, 950);
    MACH.forEach(([x, w, h], k) => { const px = x + w * 0.32; pipeV(ctx, px, 560, GROUND - 6 - h - 2, 22, PIPE, 952 + k * 3); G.ellipse(ctx, px, 560, 16, 16, { fill: FIT, lw: 3.5, seed: 960 + k }); });
  }
  function beacon(ctx, t, [x, w, h], t0, k) { // 每台設備頂上的燈塔:平常綠燈,警報時紅燈旋轉
    const lx = x + w - 34, fy = GROUND - 6, ry = fy - h - 120 + 8.5, gy = fy - h - 120 + 2 * 17 + 8.5;
    if (t < t0) { KIT.glow(ctx, lx, gy, 34, 'rgba(90,230,120,0.75)'); G.rrect(ctx, lx - 12, gy - 8.5, 24, 17, 4, { fill: '#7CF08F', lw: 2.5, seed: 970 + k }); return; }
    const u = t - t0, on = 0.6 + 0.4 * Math.abs(Math.sin(u * Math.PI * 2.4)), pop = popIn(t, t0, 0.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    KIT.glow(ctx, lx, ry, 190 * pop, `rgba(255,50,30,${0.55 * on})`);
    for (const ph of [0, Math.PI]) { // 旋轉的光
      const an = u * 5.5 + ph + k;
      const dx = Math.cos(an), dy = Math.sin(an) * 0.35;
      ctx.fillStyle = `rgba(255,70,40,${0.16 * on * pop})`; ctx.beginPath(); ctx.moveTo(lx, ry); ctx.lineTo(lx + (dx - dy * 0.6) * 420, ry + (dy + dx * 0.25) * 420); ctx.lineTo(lx + (dx + dy * 0.6) * 420, ry + (dy - dx * 0.25) * 420); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    G.rrect(ctx, lx - 14, ry - 10, 28, 20, 5, { fill: on > 0.8 ? '#FF6A4D' : '#E0402C', lw: 3, seed: 975 + k });
    // 螢幕:紅底白色驚嘆號
    const sx = x + w * 0.1, sy = fy - h + 52, sw = w * 0.42, sh = h * 0.3;
    ctx.save(); ctx.globalAlpha *= pop; ctx.fillStyle = `rgba(230,60,40,${0.75 + 0.25 * on})`; ctx.fillRect(sx + 3, sy + 3, sw - 6, sh - 6);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sx + sw / 2, sy + 18); ctx.lineTo(sx + sw - 12, sy + sh - 18); ctx.lineTo(sx + 12, sy + sh - 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C8452F'; ctx.fillRect(sx + sw / 2 - 3.5, sy + 40, 7, 28); ctx.fillRect(sx + sw / 2 - 3.5, sy + 74, 7, 7);
    ctx.restore();
  }
  function sAlarm(ctx, t) {
    const c = wide(1.1, 530);
    view(ctx, c, () => {
      night(ctx, () => { machinesBg(ctx, t); headerPipe(ctx); }, { dark: 0.85 });
      MACH.forEach((m, k) => beacon(ctx, t, m, ev.alarms[k], k));
    });
    const red = ev.alarms.reduce((a, t0) => a + (t >= t0 ? 1 : 0), 0);
    if (red > 0) fill(ctx, -200, -200, W + 400, H + 400, `rgba(255,40,30,${0.035 * red * (0.6 + 0.4 * Math.abs(Math.sin((t - ev.alarms[0]) * Math.PI * 2.4)))})`);
    nightCard(ctx, t, '02:10', ev.night + 0.25);
    finish(ctx, 'rgba(120,150,255,0.05)', 0.4);
  }

  // ---------- 5 值班的人找了兩個小時,才找到原因 ----------
  function clockCard(ctx, t) { // 兩個小時
    const a = popIn(t, ev.hours[0] - 0.2, 0.3);
    if (a <= 0) return;
    const u = ease.inOutCubic(clamp((t - ev.hours[0]) / (ev.hours[1] - ev.hours[0]))), hrs = 2 + 10 / 60 + 2 * u;
    ctx.save(); ctx.translate(250, 330); ctx.scale(a, a);
    ctx.fillStyle = 'rgba(20,26,50,0.85)'; ctx.strokeStyle = '#E8ECF6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-170, -118, 340, 236, 26); ctx.fill(); ctx.stroke();
    KIT.wallClock(ctx, -70, -18, 74, hrs, { night: true });
    ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.moveTo(-70, -18); ctx.arc(-70, -18, 60, -Math.PI / 2 + (2 + 10 / 60) * Math.PI / 6, -Math.PI / 2 + hrs * Math.PI / 6); ctx.closePath(); ctx.fill(); ctx.restore();
    const hh = Math.floor(hrs), mm = Math.round((hrs - hh) * 60) % 60;
    G.text(ctx, `0${hh}:${String(mm).padStart(2, '0')}`, 82, 4, { size: 56, fam: NUM, weight: 800, color: '#FFFFFF', align: 'center', boil: 0 });
    label(ctx, '兩個小時', 0, 98, 44, '#F6E7A8');
    ctx.restore();
  }
  function sSearch(ctx, t) {
    const c = wide(1.3, 650);
    const t0 = ev.search + 0.15, t1 = ev.stop - 0.1, u = clamp((t - t0) / (t1 - t0));
    const x = lerp(1270, 660, u), moving = u > 0 && u < 1;
    const found = t > ev.stop + 0.15;
    const o = { x, style: OPER, seed: 470, pose: moving ? 'walk' : 'stand', walk: moving ? ((1270 - x) / 300) % 1 : 0, eyes: found ? 'wide' : 'normal', mouth: found ? 'o' : 'flat', brows: 'worried', look: -0.75, lookY: found ? -0.1 : 0.05, blink: blink(t, 0.4) };
    o.handL = [-134, -296];
    const hw = KIT.world({ ...o, y: GROUND }, o.handL[0], o.handL[1]);
    const sweep = [x - 330 + Math.sin(t * 1.3) * 60, PY - 10 + Math.sin(t * 1.9) * 70];
    const fu = ease.inOutCubic(clamp((t - ev.stop + 0.15) / 0.6));
    const tgt = [lerp(sweep[0], V1X, fu), lerp(sweep[1], PY - 50, fu)];
    const ang = Math.atan2(tgt[1] - hw[1], tgt[0] - hw[0]);
    let lens = [hw[0], hw[1]];
    const scene = () => { roomBg(ctx, t); wallClock(ctx, 2.2); cart(ctx, CARTX); toolbox(ctx, CARTX, 1106, 0); plant(ctx, t, { v1: SHUT, flow: 0, seg: 'new' }); person(ctx, o); lens = flashlight(ctx, hw[0], hw[1], ang); };
    view(ctx, c, () => {
      night(ctx, scene, { dark: 0.82, lights: [{ x: tgt[0], y: tgt[1], r: 100 }, { x: hw[0] + 30, y: hw[1] - 80, r: 125, inner: 0.5, warm: false }] });
      haze(ctx, lens, tgt, 100);
    });
    clockCard(ctx, t);
    finish(ctx, 'rgba(120,150,255,0.05)', 0.4);
  }

  // ---------- 6 那顆手閥,還關著(定格;不畫有人去轉開) ----------
  function sFound(ctx, t) {
    const tt = Math.min(t, ev.freeze);
    const c = { z: 2.3, cx: V1X + 20, cy: 990, fy: 860 };
    const su = ease.outCubic(clamp((tt - ev.spot) / 0.7));
    const spot = [lerp(600, V1X, su), lerp(1030, PY - 45, su)];
    view(ctx, c, () => {
      night(ctx, () => { roomBg(ctx, tt); plant(ctx, tt, { v1: SHUT, flow: 0, seg: 'new' }); }, { dark: 0.88, lights: [{ x: spot[0], y: spot[1], r: 96 }] });
      haze(ctx, [800, 1270], spot, 96, 0.8);
    });
    if (t >= ev.freeze) { // 紅圈圈住直立的把手 = 關
      const [px, py] = toScr(c, V1X, PY - 62), a = popIn(t, ev.freeze + 0.08, 0.25);
      ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.setLineDash([20, 13]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(px, py, 125, 215, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      pill(ctx, '關', px + 215, py - 150, 80, a, { bg: RED, fg: '#FFFFFF', rot: 0.06 });
    }
    finish(ctx, 'rgba(120,150,255,0.05)', 0.4);
    freezeLook(ctx, t, ev.freeze);
  }

  // ---------- 7 隔天師傅遞給他一張空白的牌子 / 8 師傅:「你關的,寫你的名字……」 ----------
  const SX = 560, MX = 830, MEET = [695, 1012];
  function sTalk(ctx, t) {
    const push = ease.inOutCubic(clamp((t - (ev.say[0] + 0.55)) / 0.6));
    const c = wide(lerp(1.2, 1.5, push), lerp(640, 700, push));
    const talkM = KIT.mouth(VO, t, 'master');
    // 牌子:師傅的左手 → 阿樹的右手
    const give = ease.inOutCubic(clamp((t - (ev.give - 0.45)) / 0.5)), back = ease.inOutCubic(clamp((t - ev.take) / 0.45));
    const reach = ease.inOutCubic(clamp((t - (ev.take - 0.5)) / 0.45)), hold = ease.inOutCubic(clamp((t - ev.take) / 0.45));
    const mRest = [-96, -176], mGive = KIT.hand(MX, GROUND, 1, 1, MEET[0] + 8, MEET[1]);
    const sRest = [92, -180], sGive = KIT.hand(SX, GROUND, 1, 1, MEET[0] - 8, MEET[1]), sHold = [46, -236];
    const mo = { x: MX, style: MASTER, seed: 440, blink: blink(t, 0.6), eyes: 'normal', mouth: talkM || 'flat', brows: 'neutral', look: -0.55, lookY: 0.1, blush: 0.35 };
    const so = { x: SX, style: SHU, seed: 400, blink: blink(t, 0.2), eyes: 'normal', mouth: 'wavy', brows: 'worried', look: 0.5, lookY: 0.5, headRot: 0.05 };
    let tagIn = null; // 牌子在誰手上
    if (t < ev.take) {
      const k = give;
      mo.handL = [lerp(mRest[0], mGive[0], k), lerp(mRest[1], mGive[1], k)];
      tagIn = 'm';
      if (reach > 0) so.handR = [lerp(sRest[0], sGive[0], reach), lerp(sRest[1], sGive[1], reach)];
    } else {
      mo.handL = [lerp(mGive[0], mRest[0], back), lerp(mGive[1], mRest[1], back)];
      so.handR = [lerp(sGive[0], sHold[0], hold), lerp(sGive[1], sHold[1], hold)];
      tagIn = 's'; so.look = 0.15; so.lookY = 0.75; so.headRot = 0.02;
    }
    if (t >= A[7] - 0.3) { // 師傅說話:右手跟著比,講到「開回去」左手指向那顆閥
      so.look = 0.75; so.lookY = 0.05; so.mouth = 'flat'; so.brows = t > ev.say[2] ? 'neutral' : 'worried';
      if (talkM) mo.handR = [112 + Math.sin(t * 5) * 10, -262 + Math.sin(t * 7.3) * 8];
      const turn = clamp((t - (ev.say[1] + 0.2)) / 1.2);  // 「開回去」:右手比一個把手轉回來的動作
      if (turn > 0 && turn < 1) { const an = -Math.PI / 2 + Math.PI / 2 * ease.inOutCubic(turn); mo.handR = [118 + Math.cos(an) * 46, -268 + Math.sin(an) * 46]; }
      if (t > ev.say[2] + 0.4 && t < ev.say[2] + 1.1) so.headY = Math.sin((t - ev.say[2] - 0.4) * Math.PI * 2 / 0.7) * 7; // 點頭
    }
    view(ctx, c, () => {
      roomBg(ctx, t); cart(ctx, CARTX); toolbox(ctx, CARTX, 1106, 0);
      plant(ctx, t, { v1: OPEN, flow: 1, seg: 'new' });
      person(ctx, so); person(ctx, mo);
      const owner = tagIn === 'm' ? mo : so, hh = tagIn === 'm' ? mo.handL : so.handR, hp = KIT.world({ ...owner, y: GROUND }, hh[0], hh[1]);
      valveTag(ctx, hp[0], hp[1] - 4, 0.42, swing(t, tagIn === 'm' ? ev.give : ev.take, 0.18) + Math.sin(t * 2.2) * 0.03, {});
      G.ellipse(ctx, hp[0], hp[1], 17, 16, { fill: owner.style.skin, lw: 3.5, seed: 455 }); // 手捏著綁線
    });
    // 空白的牌子:放大給觀眾看三格
    if (t >= ev.blank && t < ev.say[0] + 0.65) {
      const a = popIn(t, ev.blank, 0.35) * (1 - clamp((t - (ev.say[0] + 0.35)) / 0.3));
      const hp = KIT.world({ x: SX, y: GROUND, s: 1 }, so.handR[0], so.handR[1]), [hx, hy] = toScr(c, hp[0], hp[1] + 40);
      ctx.save(); ctx.globalAlpha *= clamp(a); ctx.setLineDash([12, 10]); stroke(ctx, [[hx + 6, hy - 30], [600, 650]], '#FFFFFF', 8); stroke(ctx, [[hx + 6, hy - 30], [600, 650]], INK, 3); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(a); valveTag(ctx, 540, 238, 2.0 * Math.max(0.01, a), Math.sin(t * 1.8) * 0.02, { hi: 0, hiA: clamp((t - ev.say[0] + 0.1) / 0.3) }); ctx.restore();
    }
    // 師傅的三句話:三張小卡
    const cards = [['寫名字', 'pen'], ['開回去', 'valve'], ['自己收', 'tag']];
    cards.forEach(([s, icon], k) => sayCard(ctx, t, ev.say[k], 208 + k * 292, 330, s, icon, 630 + k * 7));
    finish(ctx);
  }
  function sayCard(ctx, t, t0, x, y, str, icon, seed) {
    if (t < t0) return;
    const a = popIn(t, t0, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate((seed % 3 - 1) * 0.025); ctx.scale(a, a);
    KIT.card(ctx, -136, -64, 272, 128, { fill: C.paper, seed });
    ctx.save(); ctx.translate(-84, 0);
    if (icon === 'pen') { ctx.rotate(0.7); G.rrect(ctx, -9, -40, 18, 64, 5, { fill: '#2B5FA8', lw: 3.5, seed: seed + 1 }); G.poly(ctx, [[-9, 24], [9, 24], [0, 42]], { fill: '#F0C29C', lw: 3, seed: seed + 2 }); }
    else if (icon === 'valve') {
      ctx.save(); ctx.scale(0.42, 0.42); ballValve(ctx, 0, 14, -Math.PI / 4 + Math.sin(t * 2) * 0.1, { seed: seed + 3 }); ctx.restore();
      ctx.save(); ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 14, 50, -1.9, -0.3); ctx.stroke(); ctx.restore();
      G.poly(ctx, [[48, -14], [58, 8], [36, 6]], { fill: GREEN, lw: 0, seed: seed + 4 });
    } else { valveTag(ctx, 0, -46, 0.42, -0.1, {}); KIT.tick(ctx, 26, 30, 18, 1, { seed: seed + 5 }); }
    ctx.restore();
    label(ctx, str, 44, 17, 50, INK);
    ctx.restore();
  }

  // ---------- 9 從此:每一顆動過的閥都有牌子、都有一行紀錄;做完照紀錄復歸 ----------
  const TAB = { x: 70, y: 238, w: 860, rowH: 76, cols: [232, 128, 160, 150, 134] };
  function recordTable(ctx, t) {
    if (t < ev.table) return;
    const a = popIn(t, ev.table, 0.32), pad = 28, titleH = 74, headH = 54;
    const rows = [
      { at: ev.rows[0], cells: ['上游手閥', '開', '關', '阿樹'], back: '開', hi: [ev.open[0], ev.ticks[0] + 0.4], tick: ev.ticks[0] },
      { at: ev.rows[1], cells: ['排放閥', '關', '開', '阿樹'], back: '關', hi: [ev.drainShut, ev.drainShut + 1.0], tick: ev.ticks[1] },
    ];
    const h = pad * 0.6 + titleH + headH + rows.length * TAB.rowH + pad * 0.6;
    ctx.save(); ctx.translate(TAB.x + TAB.w / 2, TAB.y); ctx.scale(a, a); ctx.translate(-TAB.w / 2, 0);
    KIT.card(ctx, 0, 0, TAB.w, h, { fill: C.paper, seed: 880 });
    label(ctx, '閥件操作紀錄', TAB.w / 2, pad * 0.6 + 52, 48, INK);
    let y = pad * 0.6 + titleH;
    stroke(ctx, [[pad, y - 6], [TAB.w - pad, y - 6]], INK, 4);
    const cx = []; let x = pad;
    TAB.cols.forEach((w, i) => { cx.push(i === 0 ? x + 6 : x + w / 2); x += w; });
    ['閥件', '原本', '作業中', '操作人', '復歸'].forEach((s, i) => G.text(ctx, s, cx[i], y + 40, { size: 36, fam: CJK, weight: 700, color: C.muted, align: i === 0 ? 'left' : 'center', boil: 0 }));
    y += headH;
    rows.forEach((r, k) => {
      if (k > 0) { ctx.save(); ctx.setLineDash([6, 8]); stroke(ctx, [[pad, y], [TAB.w - pad, y]], '#D2C6AC', 2.5); ctx.restore(); }
      if (t >= r.hi[0] && t < r.hi[1] + 0.3) { // 正在復歸的這一行:螢光筆
        const u = ease.outCubic(clamp((t - r.hi[0]) / 0.3)), f = 1 - clamp((t - r.hi[1]) / 0.3);
        ctx.save(); ctx.globalAlpha *= 0.9 * f; ctx.fillStyle = C.hi; ctx.beginPath(); ctx.roundRect(pad - 10, y + 6, (TAB.w - 2 * pad + 20) * u, TAB.rowH - 12, 12); ctx.fill(); ctx.restore();
      }
      if (t >= r.at) {
        const p = ease.outBack(clamp((t - r.at) / 0.3)), base = y + TAB.rowH / 2 + 16;
        r.cells.forEach((s, i) => {
          ctx.save(); ctx.translate(cx[i], base); ctx.scale(p, p);
          G.text(ctx, s, 0, 0, { size: 44, fam: CJK, weight: 800, color: i === 2 ? RED : INK, align: i === 0 ? 'left' : 'center', boil: 0 });
          ctx.restore();
        });
        if (t >= r.tick) { // 復歸:寫上原本的狀態 + 綠勾
          const q = popIn(t, r.tick, 0.25);
          ctx.save(); ctx.translate(cx[4] - 26, base); ctx.scale(q, q); G.text(ctx, r.back, 0, 0, { size: 44, fam: CJK, weight: 800, color: GREEN, align: 'center', boil: 0 }); ctx.restore();
          KIT.tick(ctx, cx[4] + 34, base - 15, 22, q, { seed: 890 + k });
        }
      } else { ctx.save(); ctx.setLineDash([10, 12]); stroke(ctx, [[pad + 8, y + TAB.rowH / 2 + 4], [TAB.w - pad - 8, y + TAB.rowH / 2 + 4]], '#DCD2BC', 4); ctx.restore(); }
      y += TAB.rowH;
    });
    ctx.restore();
  }
  // 近景:兩顆閥(上游閥關著、排放閥打開)各掛一張牌;排放閥先關回去
  function sTags(ctx, t) {
    const c = { z: 1.8, cx: 450, cy: 1100, fy: 1000 };
    const shut2 = ease.inOutCubic(clamp((t - ev.drainShut) / 0.42)), v2 = lerp(OPEN, SHUT, shut2);
    const hang1 = t >= ev.tag1, hang2 = t >= ev.tag2;
    view(ctx, c, () => {
      roomBg(ctx, t);
      plant(ctx, t, { v1: SHUT, v2, flow: 0, seg: 'new',
        tag1: hang1 ? { s: 0.95, rot: swing(t, ev.tag1) } : null,
        tag2: hang2 ? { s: 0.7, rot: swing(t, ev.tag2) } : null });
      // 阿樹的手:掛牌、再把排放閥關回去
      const handK = (t0, inDur = 0.5, outDur = 0.45) => {
        const kin = ease.inOutCubic(clamp((t - (t0 - inDur)) / inDur)), kout = ease.inOutCubic(clamp((t - t0 - 0.06) / outDur));
        return kin > 0 && kout < 1 ? kin * (1 - kout) : 0;
      };
      const k1 = handK(ev.tag1), k2 = handK(ev.tag2);
      // 手從畫面左邊(阿樹站在上游那一側)、右下伸進來
      if (k1 > 0) { const p = [lerp(60, TAG1[0], k1), lerp(1250, TAG1[1] + 4, k1)]; if (!hang1) valveTag(ctx, p[0], p[1] - 4, 0.95, 0.08, FILL1); arm(ctx, [40, 1280], p); }
      if (k2 > 0) { const p = [lerp(840, TAG2[0], k2), lerp(1330, TAG2[1] + 4, k2)]; if (!hang2) valveTag(ctx, p[0], p[1] - 4, 0.7, 0.08, FILL2); arm(ctx, [860, 1350], p); }
      if (t >= ev.drainShut - 0.35 && t < ev.drainShut + 0.95) {
        const kin = ease.inOutCubic(clamp((t - (ev.drainShut - 0.35)) / 0.35)), kout = ease.inOutCubic(clamp((t - (ev.drainShut + 0.5)) / 0.42));
        const gp = gripAt(V2X, STUBY, v2, V2S, 0.7), k = kin * (1 - kout);
        if (k > 0.01) arm(ctx, [860, 1300], [lerp(840, gp[0], k), lerp(1290, gp[1], k)]);
      }
    });
    if (t >= ev.drainShut - 0.1 && t < ev.restore + 0.8) { // 先把排放閥關回去
      const [vx, vy] = toScr(c, V2X, STUBY);
      pill(ctx, '排放閥關回去', vx + 10, vy - 300, 46, popIn(t, ev.drainShut - 0.1, 0.25), { rot: -0.02 });
    }
    recordTable(ctx, t);
    finish(ctx);
  }
  // 中景:開閥前看一眼接頭 → 慢慢開、師傅在管子後面看著接頭 → 最後才收牌、打勾
  const MASTER_W = (J1X + J2X) / 2; // 師傅站在管子後面、新管段的中間,兩個接頭都看得到
  function sRestore(ctx, t) {
    const c = wide(1.05, 575);
    const ou = clamp((t - ev.open[0]) / (ev.open[1] - ev.open[0])), v1 = lerp(SHUT, OPEN, ease.inOutQuad(ou));
    const looking = t >= ev.look - 0.1;
    // 收牌:兩張牌飛到阿樹的左手
    const sx = SHU_AT, handL = [-98, -196], hl = KIT.world({ x: sx, y: GROUND, s: 1 }, handL[0], handL[1]);
    const fly = (t0, from) => { const u = ease.inOutCubic(clamp((t - t0) / 0.38)); return { u, p: [lerp(from[0], hl[0], u), lerp(from[1], hl[1], u) - Math.sin(u * Math.PI) * 90] }; };
    const f1 = fly(ev.collect, TAG1), f2 = fly(ev.collect + 0.16, TAG2);
    const o = { x: sx, style: SHU, seed: 400, blink: blink(t, 0.2), eyes: 'normal', mouth: 'flat', brows: 'determined', look: looking ? 0.95 : 0.6, lookY: looking ? 0.3 : 0.2 };
    const gp = gripAt(V1X, PY, v1, V1S), onV = KIT.hand(sx, GROUND, 1, 1, gp[0], gp[1]);
    const grab = ease.inOutCubic(clamp((t - (ev.open[0] - 0.45)) / 0.4)), letGo = ease.inOutCubic(clamp((t - (ev.open[1] + 0.1)) / 0.3));
    const k = grab * (1 - letGo);
    if (k > 0) o.handR = [lerp(92, onV[0], k), lerp(-180, onV[1], k)];
    if (t >= ev.open[0] - 0.3 && t < ev.open[1]) { o.look = 0.75; o.lookY = 0.3; }
    if (t >= ev.collect - 0.2) { o.handL = handL; o.look = -0.4; o.lookY = 0.5; o.mouth = 'smile'; }
    if (t >= ev.ticks[0]) { o.eyes = 'happy'; o.mouth = 'smile'; o.look = 0.2; o.lookY = -0.3; }
    const mo = { x: MASTER_W, style: MASTER, seed: 440, blink: 0, eyes: 'normal', mouth: 'flat', brows: 'neutral', look: 0, lookY: 0.85, gesture: 'akimbo' };
    if (t >= ev.collect) { mo.look = -0.6; mo.lookY = 0.2; mo.blink = blink(t, 0.6); }
    if (t >= ev.ticks[0]) { mo.gesture = 'thumbsUp'; mo.look = -0.6; mo.lookY = 0; mo.mouth = 'smile'; mo.eyes = 'happy'; }
    view(ctx, c, () => {
      roomBg(ctx, t); cart(ctx, CARTX); toolbox(ctx, CARTX, 1106, 0);
      person(ctx, mo); // 師傅在管子後面
      plant(ctx, t, { v1, v2: SHUT, flow: ou, seg: 'new',
        tag1: f1.u <= 0 ? { s: 0.95, rot: Math.sin(t * 2.1) * 0.03 } : null, tag2: f2.u <= 0 ? { s: 0.7, rot: Math.sin(t * 2.3 + 1) * 0.03 } : null });
      person(ctx, o);
      if (f1.u > 0) valveTag(ctx, f1.p[0], f1.p[1], lerp(0.95, 0.45, f1.u), lerp(0, -0.3, f1.u), FILL1);
      if (f2.u > 0) valveTag(ctx, f2.p[0] + 8 * f2.u, f2.p[1], lerp(0.7, 0.45, f2.u), lerp(0, -0.15, f2.u), FILL2);
      if (f1.u > 0) G.ellipse(ctx, hl[0], hl[1], 19, 18, { fill: SKIN, lw: 3.5, seed: 418 });
    });
    // 開閥前看一眼接頭(換過的那一段,兩頭的法蘭都看)
    [[J1X, 0], [J2X, 0.25]].forEach(([x, d], k) => {
      const [jx, jy] = toScr(c, x, PY), la = popIn(t, ev.look + d, 0.28) * (1 - clamp((t - ev.collect + 0.2) / 0.25));
      if (la <= 0) return;
      ctx.save(); ctx.globalAlpha *= Math.min(1, la); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(jx, jy, 54, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(jx, jy, 54, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      KIT.tick(ctx, jx + (k ? 40 : -40), jy + 56, 24, popIn(t, ev.look + d + 0.3, 0.25), { seed: 905 + k });
    });
    { const la = popIn(t, ev.look, 0.28) * (1 - clamp((t - ev.collect + 0.2) / 0.25)); if (la > 0) pill(ctx, '看接頭', 590, 790, 46, Math.min(1, la), { rot: -0.03 }); }
    // 慢慢開
    const [vx, vy] = toScr(c, V1X, PY), sa = popIn(t, ev.open[0], 0.28) * (1 - clamp((t - ev.open[1] - 0.3) / 0.25));
    if (sa > 0) {
      pill(ctx, '慢慢開', vx + 70, vy - 250, 52, Math.min(1, sa), { rot: 0.03 });
      ctx.save(); ctx.globalAlpha *= Math.min(1, sa); ctx.strokeStyle = GREEN; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.setLineDash([2, 16]);
      ctx.beginPath(); ctx.arc(vx, vy, L1 * V1S * c.z * 1.1, -Math.PI / 2, -Math.PI / 2 + Math.PI / 2 * ou); ctx.stroke(); ctx.restore();
    }
    recordTable(ctx, t);
    finish(ctx);
  }

  // ---------- 10 結尾 ----------
  function sEnd(ctx, t) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, ev.card[0], 0.4);
    ctx.save(); ctx.translate(500, 300); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -410, 0, 820, 540, { fill: '#FFFDF4', seed: 801 });
    [['誰關的誰開', INK], ['動了就掛牌', '#8E6444'], ['做完要復原', RED]].forEach(([s, col], k) => {
      const b = k === 0 ? 1 : popIn(t, ev.card[k], 0.3);
      if (b <= 0) return;
      ctx.save(); ctx.translate(0, 132 + k * 156); ctx.scale(b, b); label(ctx, s, 0, 0, 112, col); ctx.restore();
    });
    ctx.restore();
    person(ctx, { x: 300, y: GROUND + 60, s: 0.98, style: MASTER, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440, blink: blink(t, 0.6) });
    const o = { x: 720, y: GROUND + 60, s: 0.95, style: SHU, eyes: 'happy', mouth: 'grin', blush: 0.6, seed: 400, blink: blink(t, 0.2) };
    const hx = 600, hy = 1040 + Math.sin(t * 3.2) * 5;
    o.handL = KIT.hand(o.x, o.y, o.s, 1, hx, hy);
    person(ctx, o);
    valveTag(ctx, hx, hy - 6, 0.62, Math.sin(t * 2.4) * 0.05, FILL1);
    G.ellipse(ctx, hx, hy, 18, 17, { fill: SKIN, lw: 3.5, seed: 418 });
    KIT.tick(ctx, hx + 52, hy + 14, 26, popIn(t, ev.card[2] + 0.4, 0.25), { seed: 836 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(500, 1500); ctx.scale(b, b); label(ctx, '追蹤看更多現場故事', 0, 0, 64, '#FFFFFF', { stroke: INK, strokeW: 18 }); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: sClose },
    { at: ev.work, draw: sWork, in: 'cut' },
    { at: A[2] - 0.15, draw: sPack, in: 'cut' },
    { at: ev.night, draw: sAlarm, in: 'cut' },
    { at: ev.search, draw: sSearch, in: 'cut' },
    { at: ev.spot, draw: sFound, in: 'cut' },
    { at: ev.day, draw: sTalk, in: 'paper' },
    { at: ev.from, draw: sTags, in: 'paper' },
    { at: ev.restore + 0.8, draw: sRestore, in: 'cut' },
    { at: A[9] - 0.15, draw: sEnd, in: 'flash' },
  ]);

  // 字幕:每句依 prep-voice 量到的標點停頓切成短句;太長的從中間切成兩行
  function buildSubs(vo) {
    const out = [], PH = globalThis.PH, MAX = 11, PUN = /[,，。、:：?？!！;；「」]/g;
    const lines = (vo && vo.lines) || [];
    lines.forEach((l, i) => {
      const ph = PH && PH[i], marks = ph ? ph.marks : [], on = ph ? ph.on : 0, off = ph ? ph.off : l.end - l.t;
      const chunks = []; let c0 = 0;
      marks.forEach((mk, k) => { chunks.push({ s: l.text.slice(c0, mk.c + 1), a: k === 0 ? on : marks[k - 1].b, b: mk.a }); c0 = mk.c + 1; });
      chunks.push({ s: l.text.slice(c0), a: marks.length ? marks[marks.length - 1].b : on, b: off });
      for (const ch of chunks) {
        const s = ch.s.replace(PUN, '').trim();
        if (!s) continue;
        const parts = s.length > MAX ? [s.slice(0, Math.floor(s.length / 2)), s.slice(Math.floor(s.length / 2))] : [s];
        let acc = 0;
        for (const p of parts) { const t0 = ch.a + (ch.b - ch.a) * acc / s.length; acc += p.length; out.push({ t: l.t + t0, end: l.t + ch.a + (ch.b - ch.a) * acc / s.length, text: p }); }
      }
      const last = out[out.length - 1], next = lines[i + 1];
      if (last) last.end = Math.min(last.end + 0.35, next ? next.t - 0.2 : Infinity);
    });
    for (let k = 0; k + 1 < out.length; k++) if (out[k + 1].t - out[k].end < 0.6 && out[k + 1].t > out[k].t) out[k].end = Math.max(out[k].end, out[k + 1].t - 0.16);
    return out;
  }

  Studio.film({
    post: { vignette: 0.22, grain: 0.04, paper: 0.35 },
    fadeOut: 0.9,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = buildSubs(VO); },
    draw(ctx, t) {
      film(ctx, t);
      // 結尾卡不疊字幕;紙張轉場蓋滿畫面的那一下也不畫(字幕不浮在轉場上)
      if (t < A[9] - 0.1 && !(t > ev.from - 0.25 && t < ev.from + 0.1)) Subs.draw(ctx, t, SUBS, { style: 'pop', size: 74, fam: CJK, highlight: '#FFD75E' });
    },
  });
})();
