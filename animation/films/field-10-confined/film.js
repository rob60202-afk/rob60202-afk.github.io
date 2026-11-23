// 工程現場故事 第 10 集:第二個倒下的人。每一格都是時間 t 的純函式。
// 侷限空間缺氧救援:畫面一律是正確示範,不呈現傷亡(腳本與審查:series/field-stories-batch2.md 第 10 集)。
//   ‧ 阿樹站在人孔邊用手電筒往下照,頭不伸進洞口;只有一腳踩上第一階,就被師傅抓住安全帶拉回,兩人退離洞口
//   ‧ 倒下的同事只在手電筒的光圈裡出現一個模糊的剪影,其他鏡頭都不畫
//   ‧ 電動送風機(插電,沒有引擎),進風口朝著外面的乾淨空氣;字卡「送新鮮空氣,不送氧氣」;整集沒有氧氣瓶
//   ‧ 救援人員:全罩面罩 + 背上的空氣瓶(標「空氣」)、全身式安全帶的背後 D 環扣三腳架的救生索;有人顧捲揚器;阿樹在警示線外
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H;
  const CJK = KIT.CJK;
  const { lin, rad, fill, label, stroke } = KIT;
  const popIn = (t, t0, d = 0.3) => KIT.popIn(t, t0, d);
  const blink = (t, seed) => KIT.blink(t, seed);
  const INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', YELLOW = '#F2C230', ORANGE = '#F28C28', BROWN = '#8E6444', AIR = '#BFE6FA';
  let VO = null, SUBS = [];

  // ---------- 角色:工地一律 KIT.onSite(安全帽 + 扣好的頤帶 + 反光背心) ----------
  const RESCUE = { outfit: 'shirt', shirt: '#34486C', collar: '#34486C', bottoms: 'pants', shorts: '#2C3A55', pants: '#2C3A55', skin: '#E0AE84', hair: '#1E1A18', hairStyle: 'short', build: 'regular', shoes: '#2A2220' };
  const CAST = {
    shu: KIT.CAST.shuSite,                                                    // 阿樹:黃帽
    master: KIT.CAST.masterSite,                                              // 陳師傅:白帽
    crew: KIT.CAST.crewSite,                                                  // 推送風機來的人:橘帽
    rescuer: KIT.onSite(RESCUE, '#D8402E', '#34486C'),                        // 救援人員(下去的人):紅帽、深藍工作服 + 反光條
    winch: KIT.onSite({ ...RESCUE, skin: '#C98A62', hairStyle: 'buzz', facialHair: 'stubble', build: 'broad' }, '#D8402E', '#34486C'), // 顧捲揚器的人
  };
  globalThis.CAST = CAST;
  const BW = { slim: 0.86, regular: 1, broad: 1.18, heavy: 1.3 };

  // ---------- 場景尺寸(舞台座標;剖面圖:上面是廠房地面,下面是地下槽) ----------
  const FL = 1000, BWY = 932, SLAB = 85, TT = FL + SLAB, TB = 1830;      // 地板前緣(人站的地方)、牆腳、樓板厚、槽頂、槽底
  const MC = 600, HW = 85, OX0 = MC - HW, OX1 = MC + HW, RIM = 962;      // 人孔(開口 515–685)、人孔後緣
  const LADW = 46, GRAB = 726;                                           // 梯子半寬、扶手頂
  const TANKX0 = 120, TANKX1 = 1240;                                     // 槽的左右牆
  const DOOR = [930, 520, 200, BWY - 520];                               // 開著的鐵捲門:外面的新鮮空氣
  const SS = 0.85;                                                       // 全景人物大小
  const TRI = { head: [MC, 446], L: [MC - 190, FL], R: [MC + 190, FL], B: [MC + 26, BWY + 8] }; // 救援三腳架
  const WINCH = [464, 842];                                              // 捲揚器(左腳上)
  const BLOWER_X = 890;                                                  // 送風機的位置(門口旁邊)
  const FLOOR_TORCH = [430, FL - 8];                                     // 阿樹放下的手電筒

  // ---------- 鏡頭:把場景裡的 (x, y) 放到畫面 (540, FY),放大 z 倍 ----------
  const FY = 860;
  const cam = (ctx, c, fn) => { ctx.save(); ctx.translate(540, FY); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); fn(); ctx.restore(); };
  const scr = (c, x, y) => [540 + (x - c.x) * c.z, FY + (y - c.y) * c.z];
  const camMix = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) });

  // ---------- 角色身上的座標 ----------
  const hipOf = (o) => (o.pose === 'floor' || o.pose === 'sit' ? 0 : -150);
  const bobOf = (o) => (o.pose === 'walk' ? -Math.abs(Math.sin(2 * Math.PI * (o.walk || 0))) * 12 * o.s : 0);
  const world = (o, lx, ly) => KIT.world(o, lx, ly);
  function toLocal(o, wx, wy) { // 畫面座標 → 角色自己的單位(含旋轉)
    const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), X = (wx - o.x) / (o.s * (o.sx || 1)), Y = (wy - o.y - bobOf(o)) / (o.s * (o.sy || 1));
    return [X * c + Y * s, -X * s + Y * c];
  }
  function local(ctx, o, fn) { ctx.save(); ctx.translate(o.x, o.y + bobOf(o)); ctx.scale(o.s * (o.sx || 1), o.s * (o.sy || 1)); ctx.rotate(o.rot || 0); fn(); ctx.restore(); }
  function headLocal(ctx, o, fn) { local(ctx, o, () => { ctx.translate(o.headX || 0, hipOf(o) - 172 - 82 + (o.headY || 0)); ctx.rotate(o.headRot || 0); fn(); }); }
  function kneeOf(Hp, F, sd, L0 = 120, splay = 0.35) { // 腿短於原長時,膝蓋往外彎一點(正面看,大部分是朝鏡頭彎)
    const mx = (Hp[0] + F[0]) / 2, my = (Hp[1] + F[1]) / 2, d = Math.hypot(F[0] - Hp[0], F[1] - Hp[1]) || 1;
    if (d >= L0) return [mx, my];
    const off = splay * Math.sqrt((L0 / 2) ** 2 - (d / 2) ** 2), ux = (F[0] - Hp[0]) / d, uy = (F[1] - Hp[1]) / d;
    let px = -uy, py = ux; if (px * sd < 0) { px = -px; py = -py; }
    return [mx + px * off, my + py * off];
  }
  // 一腳踩上第一階:暫時換掉 Ch.person 畫腿的那兩筆(腿 G.limb、鞋 G.rrect),feet = { L, R }(角色自己的單位)
  function withFeet(o, feet, fn) {
    if (!feet) return fn();
    const seed = o.seed == null ? 300 : o.seed, limb0 = G.limb, rr0 = G.rrect;
    G.limb = function (ctx, pts, op) {
      if (op && pts && pts.length === 3 && (op.seed === seed || op.seed === seed + 2)) { const sd = op.seed === seed ? -1 : 1, F = feet[sd < 0 ? 'L' : 'R']; if (F) pts = [pts[0], kneeOf(pts[0], F, sd), F]; }
      return limb0.call(G, ctx, pts, op);
    };
    G.rrect = function (ctx, x, y, w, h, r, op) {
      if (op && w === 58 && h === 26 && (op.seed === seed + 2 || op.seed === seed + 4)) { const sd = op.seed === seed + 2 ? -1 : 1, F = feet[sd < 0 ? 'L' : 'R']; if (F) { x = F[0] - 30 + sd * 8; y = F[1] - 18; } }
      return rr0.call(G, ctx, x, y, w, h, r, op);
    };
    try { return fn(); } finally { G.limb = limb0; G.rrect = rr0; }
  }
  const person = (ctx, o) => withFeet(o, o.feet, () => KIT.person(ctx, o));
  const mouthOf = (who, t) => KIT.mouth(VO, t, who);

  // ---------- 小道具 ----------
  function finish(ctx, warm = 'rgba(255,214,140,0.16)') {
    fill(ctx, -200, -200, W + 400, H + 400, rad(ctx, 160, 260, 60, 1500, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fill(ctx, -200, 1180, W + 400, 900, lin(ctx, 0, 1180, 0, 1920, [[0, 'rgba(20,16,16,0)'], [1, 'rgba(20,16,16,0.34)']]));
  }
  function bolt(ctx, x, y, s, seed) { // 閃電(電動)
    G.poly(ctx, [[x + 4 * s, y - 22 * s], [x - 10 * s, y + 3 * s], [x - 1 * s, y + 3 * s], [x - 5 * s, y + 22 * s], [x + 10 * s, y - 4 * s], [x + 1 * s, y - 4 * s]], { fill: '#FFE14D', lw: 3, seed, step: 8 });
  }
  function torch(ctx, x, y, ang, s, on, seed = 1500) { // 手電筒:(x, y) = 握的地方,ang = 光照的方向
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    G.rrect(ctx, -30, -10, 50, 20, 7, { fill: '#3A3D44', lw: 3.5, seed });
    G.rrect(ctx, 16, -15, 22, 30, 6, { fill: '#5C6470', lw: 3.5, seed: seed + 1 });
    G.rrect(ctx, 36, -13, 6, 26, 2, { fill: on ? '#FFF6C8' : '#C9D1D8', lw: 2.5, seed: seed + 2 });
    ctx.restore();
    return [x + Math.cos(ang) * 42 * s, y + Math.sin(ang) * 42 * s];
  }
  // 手電筒的光:P = 燈頭,Q = 照到的地方
  function beam(ctx, P, Q, a, { w0 = 10, w1 = 120, victim = false } = {}) {
    if (a <= 0) return;
    const dx = Q[0] - P[0], dy = Q[1] - P[1], d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.moveTo(P[0] + nx * w0, P[1] + ny * w0); ctx.lineTo(Q[0] + nx * w1, Q[1] + ny * w1 * 0.3); ctx.lineTo(Q[0] - nx * w1, Q[1] - ny * w1 * 0.3); ctx.lineTo(P[0] - nx * w0, P[1] - ny * w0); ctx.closePath();
    ctx.fillStyle = lin(ctx, P[0], P[1], Q[0], Q[1], [[0, 'rgba(255,244,196,0.62)'], [0.5, 'rgba(255,244,196,0.22)'], [1, 'rgba(255,244,196,0.16)']]); ctx.fill();
    ctx.restore();
    // 光圈
    ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'screen';
    ctx.translate(Q[0], Q[1]); ctx.scale(1, 0.26);
    ctx.fillStyle = rad(ctx, 0, 0, 0, w1 * 1.15, [[0, 'rgba(255,240,190,0.85)'], [0.6, 'rgba(255,240,190,0.42)'], [1, 'rgba(255,240,190,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, w1 * 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (victim) { // 倒下的同事:光圈裡一團模糊的暗影,不畫任何細節
      ctx.save(); ctx.globalAlpha *= a * 0.82;
      ctx.beginPath(); ctx.ellipse(Q[0], Q[1], w1 * 1.1, w1 * 0.34, 0, 0, Math.PI * 2); ctx.clip();
      ctx.filter = 'blur(8px)'; ctx.fillStyle = 'rgba(26,30,38,0.95)';
      ctx.beginPath(); ctx.ellipse(Q[0] - 20, Q[1] + 2, 80, 17, -0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(Q[0] + 66, Q[1] - 5, 26, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function radio(ctx, x, y, rot, s = 1, seed = 1600) { // 無線電(對講機):(x, y) = 握的地方
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, 6, -102, 8, 46, 3, { fill: '#2E3036', lw: 3, seed: seed + 1 });
    G.rrect(ctx, -16, -64, 32, 80, 8, { fill: '#2E3036', lw: 3.5, seed });
    G.rrect(ctx, -10, -54, 20, 17, 3, { fill: '#9FD3A0', lw: 2.5, seed: seed + 2 });
    for (let k = 0; k < 3; k++) G.line(ctx, [[-9, -24 + k * 8], [9, -24 + k * 8]], { color: '#6C7680', lw: 2.5, seed: seed + 3 + k, amp: 0.2 });
    ctx.restore();
  }
  function waves(ctx, x, y, t, t0, a = 1, dir = -1) { // 無線電波
    if (t < t0 || a <= 0) return;
    for (let k = 0; k < 3; k++) {
      const p = ((t - t0) * 1.3 + k / 3) % 1, r = 22 + 60 * p;
      ctx.save(); ctx.globalAlpha *= a * (1 - p) * clamp((t - t0) / 0.2); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r, dir < 0 ? Math.PI * 0.95 : -Math.PI * 0.32, dir < 0 ? Math.PI * 1.32 : Math.PI * 0.05); ctx.stroke();
      ctx.strokeStyle = '#2B5FA8'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
    }
  }
  function burst(ctx, x, y, r0, r1, a, n = 8, col = RED, lw = 8) { KIT.burst(ctx, x, y, r0, r1, a, n, col, lw); }
  function card(ctx, x, y, w, h, seed, rot = 0, a = 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a); G.tornPaper(ctx, -w / 2, -h / 2, w, h, { fill: '#FFFDF4', seed }); ctx.restore(); }

  // ---------- 背景:廠房、地板、人孔、地下槽剖面 ----------
  function door(ctx) {
    const [x, y, w, h] = DOOR;
    fill(ctx, x, y, w, h, lin(ctx, 0, y, 0, y + h, [[0, '#BFE3F5'], [0.7, '#E7F5FB'], [1, '#EEF6EA']]));
    for (let k = 0; k < 5; k++) G.ellipse(ctx, x + 20 + k * 44, y + h - 70 + (k % 2) * 8, 34, 26, { fill: '#8FC49A', lw: 0, seed: 3100 + k });
    fill(ctx, x, y + h - 46, w, 46, '#D9DCCF');
    G.rrect(ctx, x - 14, y - 46, w + 28, 46, 10, { fill: '#A7B2BC', lw: 5, seed: 3110 });            // 捲起來的鐵捲門
    for (let k = 0; k < 3; k++) G.line(ctx, [[x - 6, y - 36 + k * 12], [x + w + 6, y - 36 + k * 12]], { color: '#8E99A3', lw: 3, seed: 3111 + k, amp: 0.4 });
    for (const sx of [x - 12, x + w + 2]) G.rrect(ctx, sx, y - 4, 12, h + 4, 3, { fill: '#8E99A3', lw: 4, seed: 3115 + sx });
  }
  function sign(ctx) { // 侷限空間警示牌
    const x = 770, y = 640;
    G.rrect(ctx, x - 108, y - 72, 216, 144, 10, { fill: '#FFD84A', lw: 5, seed: 3130 });
    G.rrect(ctx, x - 96, y - 60, 192, 120, 6, { fill: null, stroke: '#26282E', lw: 4, seed: 3131 });
    G.poly(ctx, [[x, y - 50], [x + 30, y + 2], [x - 30, y + 2]], { fill: '#26282E', lw: 2, seed: 3132, step: 10 });
    G.rrect(ctx, x - 3, y - 32, 6, 20, 2, { fill: '#FFD84A', lw: 0, seed: 3133 });
    G.ellipse(ctx, x, y - 6, 3.5, 3.5, { fill: '#FFD84A', lw: 0, seed: 3134 });
    G.decor(() => label(ctx, '侷限空間', x, y + 48, 40, '#26282E'));
  }
  function lid(ctx) { // 拿開的人孔蓋,靠在牆邊
    const x = 790, y = 870, r = 62;
    G.ellipse(ctx, x, y, r, r, { fill: '#7F8B96', lw: 5, seed: 3140, hatch: { color: 'rgba(40,50,60,0.25)', gap: 12, angle: 0.8 } });
    G.ellipse(ctx, x, y, r - 12, r - 12, { fill: null, stroke: '#5C6470', lw: 4, seed: 3141 });
    G.rrect(ctx, x - 22, y - 7, 44, 14, 5, { fill: '#5C6470', lw: 3, seed: 3142 });
  }
  function plant(ctx) {
    fill(ctx, -700, -500, W + 1400, BWY + 500, lin(ctx, 0, 120, 0, BWY, [[0, '#C3CDD5'], [1, '#DCE3E8']]));
    for (let x = -630; x < W + 700; x += 210) G.line(ctx, [[x, 170], [x, BWY - 6]], { color: '#B3BEC7', lw: 3, seed: 3000 + x, alpha: 0.6 });
    G.rrect(ctx, -700, 214, W + 1400, 30, 0, { fill: '#8E99A3', lw: 5, seed: 3010 });
    for (const hx of [-420, 130, 690, 1250]) { for (const sx of [-60, 60]) G.line(ctx, [[hx + sx, 244], [hx + sx, 452]], { color: '#5C6470', lw: 5, seed: 3020 + hx + sx }); G.rrect(ctx, hx - 84, 444, 168, 16, 3, { fill: '#7F8B96', lw: 4, seed: 3030 + hx }); }
    [['#D9DEE3', 296, 30], ['#F2C230', 342, 24], ['#D9DEE3', 384, 28], ['#6FA287', 426, 26]].forEach(([c, y, th], k) => KIT.pipeRun(ctx, -700, W + 700, y, th, c, 3040 + k * 7));
    for (const cx of [-230, 880]) { // H 型鋼柱
      G.rrect(ctx, cx - 34, 244, 68, BWY - 244, 3, { fill: '#AEB9C3', lw: 5, seed: 3060 + cx });
      for (const sx of [-22, 22]) G.line(ctx, [[cx + sx, 262], [cx + sx, BWY - 12]], { color: '#8E99A3', lw: 4, seed: 3062 + cx + sx, alpha: 0.8 });
    }
    door(ctx);
    sign(ctx);
    G.rrect(ctx, 858, 770, 44, 62, 6, { fill: '#9AA6B1', lw: 4, seed: 3150 });                           // 插座箱(柱子上)
    G.rrect(ctx, 868, 790, 24, 22, 4, { fill: '#E9ECEF', lw: 2.5, seed: 3151 });
    for (const sx of [875, 885]) fill(ctx, sx - 1.5, 796, 3, 9, INK);
  }
  function floorBand(ctx) {
    fill(ctx, -700, BWY, W + 1400, FL - BWY, lin(ctx, 0, BWY, 0, FL, [[0, '#A9B8B2'], [1, '#C4D0CB']]));
    G.line(ctx, [[-700, BWY], [W + 700, BWY]], { color: '#7A8883', lw: 4, seed: 3301 });
    for (const [x0, x1] of [[-700, OX0 - 40], [OX1 + 40, W + 700]]) G.rrect(ctx, x0, 974, x1 - x0, 9, 0, { fill: YELLOW, lw: 0, seed: 3302 + x0, alpha: 0.8 }); // 走道線
    // 人孔:地板上的開口 + 鋼框
    G.poly(ctx, [[OX0, FL], [OX1, FL], [OX1 - 12, RIM], [OX0 + 12, RIM]], { fill: '#14191E', lw: 0, seed: 3310 });
    stroke(ctx, [[OX0, FL], [OX0 + 12, RIM], [OX1 - 12, RIM], [OX1, FL]], '#6C7680', 8);
    stroke(ctx, [[OX0 - 14, FL], [OX0 + 2, RIM - 8], [OX1 - 2, RIM - 8], [OX1 + 14, FL]], '#9AA4AE', 5);
  }
  function ladder(ctx) { // 固定爬梯:扶手伸出地面,一路到槽底
    for (const sd of [-1, 1]) G.rrect(ctx, MC + sd * LADW - 7, GRAB + 10, 14, TB - GRAB - 10, 6, { fill: '#A3ADB7', lw: 3.5, seed: 1100 + sd, amp: 0.7 });
    G.rrect(ctx, MC - LADW - 7, GRAB, 2 * LADW + 14, 16, 8, { fill: '#A3ADB7', lw: 3.5, seed: 1103, amp: 0.7 });
    for (let y = FL + 38; y < TB - 24; y += 64) G.rrect(ctx, MC - LADW, y - 5, 2 * LADW, 10, 4, { fill: '#B8C0C8', lw: 3, seed: 1110 + y, amp: 0.5 });
  }
  function lightShaft(ctx, a) { // 從人孔照下來的一點點光
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.moveTo(OX0 + 6, FL); ctx.lineTo(OX1 - 6, FL); ctx.lineTo(OX1 + 150, TB); ctx.lineTo(OX0 - 150, TB); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, FL, 0, TB, [[0, 'rgba(255,240,205,0.24)'], [0.6, 'rgba(255,240,205,0.06)'], [1, 'rgba(255,240,205,0)']]); ctx.fill();
    ctx.restore();
  }
  // 槽裡的空氣:慢慢飄的灰塵(平靜)
  function motes(ctx, t, a) {
    if (a <= 0) return;
    for (let k = 0; k < 22; k++) {
      const x0 = OX0 - 60 + U.hash(k, 1) * 300, y0 = TT + 40 + U.hash(k, 2) * 560, sp = 6 + U.hash(k, 3) * 10;
      const x = x0 + Math.sin(t * 0.35 + k) * 14, y = y0 + ((t * sp + U.hash(k, 4) * 400) % 400) - 200;
      ctx.save(); ctx.globalAlpha *= a * (0.25 + 0.35 * U.hash(k, 5)); ctx.fillStyle = '#FFF4D8';
      ctx.beginPath(); ctx.arc(x, y, 2 + U.hash(k, 6) * 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  // 風管:送風機出風口 → 地上 → 人孔 → 槽裡。u = 伸進去多少;inflate = 送風時鼓起來
  function ductPath(bx) { return [[bx - 96, FL - 84], [bx - 140, FL - 24], [OX1 + 34, FL - 18], [OX1 - 14, FL + 22], [OX1 - 22, TT + 60], [OX1 - 30, 1660]]; }
  function duct(ctx, t, bx, u, inflate, run, part) { // part: 'in' 地板以下 | 'out' 地板以上
    const P = KIT.partial(smooth(ductPath(bx)), lerp(0.42, 1, clamp(u)));
    ctx.save();
    ctx.beginPath(); if (part === 'in') ctx.rect(-700, FL + 1, W + 1400, 2000); else ctx.rect(-700, -500, W + 1400, FL + 501); ctx.clip();
    const lw = lerp(22, 32, inflate);
    stroke(ctx, P, INK, lw + 8); stroke(ctx, P, '#F2C230', lw);
    // 波紋
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i], d = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
      for (let s = (16 - acc % 16); s < d; s += 16) { const px = x0 + (x1 - x0) * s / d, py = y0 + (y1 - y0) * s / d; stroke(ctx, [[px + nx * lw * 0.45, py + ny * lw * 0.45], [px - nx * lw * 0.45, py - ny * lw * 0.45]], 'rgba(120,80,10,0.35)', 3); }
      acc += d;
    }
    // 送風:管子裡的空氣往前走
    if (run > 0) {
      const L = pathLen(P), sp = 230;
      for (let k = 0; ; k++) { const s = ((t * sp) % 70) + k * 70; if (s > L - 10) break; const [px, py, ang] = pointAt(P, s); chevron(ctx, px, py, ang, lw * 0.32, run); }
    }
    ctx.restore();
    if (part === 'in' && run > 0 && u >= 1) { // 出風口:新鮮空氣散開
      const end = P[P.length - 1];
      for (let k = 0; k < 4; k++) { const p = ((t * 0.9) + k / 4) % 1; ctx.save(); ctx.globalAlpha *= run * (1 - p) * 0.8; ctx.strokeStyle = AIR; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(end[0], end[1] + 10, 20 + 70 * p, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); ctx.restore(); }
    }
  }
  function smooth(P) { // 折線圓角(Chaikin 兩次)
    let Q = P;
    for (let it = 0; it < 2; it++) { const R = [Q[0]]; for (let i = 0; i < Q.length - 1; i++) { const a = Q[i], b = Q[i + 1]; R.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } R.push(Q[Q.length - 1]); Q = R; }
    return Q;
  }
  function pathLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
  function pointAt(P, s) { for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= d) { const k = s / (d || 1); return [lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k), Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0])]; } s -= d; } const n = P.length - 1; return [P[n][0], P[n][1], 0]; }
  function chevron(ctx, x, y, ang, r, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= a; stroke(ctx, [[-r, -r * 0.9], [r * 0.4, 0], [-r, r * 0.9]], '#FFFFFF', 5); ctx.restore(); }
  // 電動送風機:(x, y) = 地面中心;進風口在右邊(朝門口),出風口在左邊接風管
  function blower(ctx, t, x, { spin = 0, run = 0, cord = true } = {}) {
    const y = FL;
    if (cord) { // 電線 → 柱子上的插座箱
      stroke(ctx, smooth([[x + 24, y - 150], [x + 6, y - 190], [878, 830], [880, 806]]), '#26282E', 6);
      G.rrect(ctx, 872, 800, 16, 14, 3, { fill: '#26282E', lw: 2, seed: 1560 });
    }
    G.rrect(ctx, x - 84, y - 26, 168, 12, 4, { fill: '#5C6470', lw: 3.5, seed: 1501 });
    for (const sd of [-1, 1]) { G.ellipse(ctx, x + sd * 60, y - 14, 14, 14, { fill: '#3A3A44', lw: 3.5, seed: 1502 + sd }); G.ellipse(ctx, x + sd * 60, y - 14, 5, 5, { fill: '#8A8F98', lw: 2, seed: 1504 + sd }); }
    G.line(ctx, [[x - 60, y - 26], [x - 34, y - 46]], { color: '#5C6470', lw: 7, seed: 1506 }); G.line(ctx, [[x + 60, y - 26], [x + 34, y - 46]], { color: '#5C6470', lw: 7, seed: 1507 });
    G.rrect(ctx, x - 96, y - 104, 30, 60, 8, { fill: '#8E99A3', lw: 4, seed: 1530 });                     // 出風口
    G.rrect(ctx, x - 74, y - 136, 148, 96, 22, { fill: YELLOW, lw: 4.5, seed: 1510, hatch: { color: 'rgba(160,100,0,0.12)', gap: 9 } }); // 筒身
    for (const yy of [y - 112, y - 64]) G.line(ctx, [[x - 66, yy], [x + 66, yy]], { color: 'rgba(140,90,0,0.4)', lw: 3, seed: 1511 + yy, amp: 0.4 });
    G.rrect(ctx, x - 50, y - 102, 50, 28, 6, { fill: '#2E3036', lw: 3, seed: 1512 }); bolt(ctx, x - 25, y - 88, 0.55, 1513); // 電動的標記
    G.rrect(ctx, x + 22, y - 160, 46, 26, 6, { fill: '#5C6470', lw: 3.5, seed: 1515 });                                 // 開關盒
    G.ellipse(ctx, x + 45, y - 147, 8, 8, { fill: run > 0 ? '#56B870' : '#8E99A3', lw: 2.5, seed: 1514 });
    // 進風口:網罩 + 轉動的葉片
    ctx.save(); ctx.translate(x + 76, y - 88);
    G.ellipse(ctx, 0, 0, 24, 50, { fill: '#3A3D44', lw: 4, seed: 1520 });
    for (let k = 0; k < 4; k++) { const an = spin + k * Math.PI / 2; ctx.save(); ctx.scale(0.45, 1); ctx.rotate(an); G.ellipse(ctx, 0, -22, 10, 20, { fill: '#AEB6BF', lw: 2.5, seed: 1521 + k, amp: 0.3 }); ctx.restore(); }
    for (let k = -2; k <= 2; k++) G.line(ctx, [[-20, k * 18], [20, k * 18]], { color: '#C3CAD2', lw: 2.5, seed: 1530 + k, amp: 0.2 });
    G.ellipse(ctx, 0, 0, 24, 50, { fill: null, stroke: '#26282E', lw: 5, seed: 1526 });
    ctx.restore();
  }
  function intakeAir(ctx, t, x, a) { // 外面的新鮮空氣被吸進進風口
    if (a <= 0) return;
    for (let k = 0; k < 6; k++) {
      const p = ((t * 0.8) + k / 6) % 1, y0 = FL - 88 + (k % 3 - 1) * 30 * (1 - 0.6 * p), xs = lerp(DOOR[0] + 200, x + 96, p);
      const pts = []; for (let j = 0; j <= 6; j++) { const xx = xs + j * 13; pts.push([xx, y0 + Math.sin((xx + t * 120) * 0.05) * 6 * (1 - p)]); }
      ctx.save(); ctx.globalAlpha *= a * Math.sin(Math.PI * p); stroke(ctx, pts, '#FFFFFF', 10); stroke(ctx, pts, '#7FC4EA', 6); ctx.restore();
    }
  }
  // 救援三腳架 + 捲揚器 + 救生索
  function tripodBackLeg(ctx) { G.limb(ctx, [TRI.B, [lerp(TRI.B[0], TRI.head[0], 0.5), lerp(TRI.B[1], TRI.head[1], 0.5)], TRI.head], { color: '#AEB6BF', lw: 13, outline: 3, seed: 1405 }); }
  function tripod(ctx, t, { crank = 0 } = {}) {
    const [hx, hy] = TRI.head;
    for (const F of [TRI.L, TRI.R]) {
      G.limb(ctx, [F, [lerp(F[0], hx, 0.5), lerp(F[1], hy, 0.5)], [hx, hy + 6]], { color: '#C3CAD2', lw: 16, outline: 3.5, seed: 1400 + F[0] });
      G.rrect(ctx, F[0] - 26, F[1] - 12, 52, 12, 4, { fill: '#5C6470', lw: 3, seed: 1402 + F[0] });
    }
    // 捲揚器(固定在左腳上):鋼索從捲筒沿著腳上到頂上的滑輪,搖把在左邊
    const [wx, wy] = WINCH;
    stroke(ctx, [[wx + 10, wy - 14], [hx - 14, hy + 26]], '#3A3D44', 5);
    G.rrect(ctx, wx - 12, wy - 52, 24, 104, 6, { fill: '#8E99A3', lw: 4, seed: 1423 });                 // 夾在腳上的座
    G.rrect(ctx, wx - 34, wy - 38, 68, 76, 14, { fill: '#2E3036', lw: 4.5, seed: 1420 });                // 齒輪箱
    G.ellipse(ctx, wx, wy, 25, 25, { fill: '#B8C0C8', lw: 4, seed: 1421 });                              // 捲筒(纏著鋼索)
    for (const r of [17, 10]) { ctx.save(); ctx.strokeStyle = '#5C6470'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    const ax = wx - 44, kx = ax + Math.cos(crank) * 24, ky = wy + Math.sin(crank) * 24;                // 搖把
    stroke(ctx, [[wx - 26, wy], [ax, wy]], INK, 13); stroke(ctx, [[wx - 26, wy], [ax, wy]], '#8E99A3', 7);
    stroke(ctx, [[ax, wy], [kx, ky]], INK, 13); stroke(ctx, [[ax, wy], [kx, ky]], '#8E99A3', 7);
    G.ellipse(ctx, kx, ky, 11, 11, { fill: RED, lw: 3, seed: 1422 });
    // 頂上:頭 + 滑輪
    G.rrect(ctx, hx - 42, hy - 26, 84, 40, 10, { fill: ORANGE, lw: 4, seed: 1410 });
    G.ellipse(ctx, hx - 14, hy + 26, 16, 16, { fill: '#8E99A3', lw: 3.5, seed: 1411 });
    return { knob: [kx, ky], hub: [ax, wy], crank, pulley: [hx - 14, hy + 42] };
  }
  function snap(ctx, x, y, rot, s) { KIT.snapHook(ctx, x, y, rot, s); }
  function crankTop(ctx, tri, skin) { // 顧捲揚器的人:手握著搖把(搖把畫在手臂前面,看得出來在搖)
    const [hx, hy] = tri.hub, [kx, ky] = tri.knob;
    stroke(ctx, [[hx, hy], [kx, ky]], INK, 13); stroke(ctx, [[hx, hy], [kx, ky]], '#8E99A3', 7);
    G.ellipse(ctx, hx, hy, 8, 8, { fill: '#5C6470', lw: 3, seed: 525 });
    G.ellipse(ctx, kx, ky, 18, 16, { fill: skin, lw: 4, seed: 524 });
    // 在搖:搖把外面一圈轉動的箭頭
    const a0 = tri.crank + 0.5, a1 = a0 + 2.2, R = 46, tip = [hx + Math.cos(a1) * R, hy + Math.sin(a1) * R], tg = a1 + Math.PI / 2;
    const arc = []; for (let k = 0; k <= 12; k++) { const an = a0 + (a1 - a0) * k / 12; arc.push([hx + Math.cos(an) * R, hy + Math.sin(an) * R]); }
    const head = [[tip[0] + Math.cos(tg - 2.5) * 16, tip[1] + Math.sin(tg - 2.5) * 16], tip, [tip[0] + Math.cos(tg + 2.5) * 16, tip[1] + Math.sin(tg + 2.5) * 16]];
    for (const [col, lw] of [[INK, 11], ['#FFFFFF', 5]]) { stroke(ctx, arc, col, lw); stroke(ctx, head, col, lw); }
  }
  function cones(ctx, t) { // 警示線:兩個交通錐 + 警示帶,圍出救援區(阿樹、師傅在線外)
    KIT.cone(ctx, 200, FL + 2, 0.8, 1450); KIT.cone(ctx, 284, FL + 2, 0.8, 1452);
    KIT.warnTape(ctx, [[196, FL - 82], [288, FL - 82]], { lw: 12 });
  }
  function section(ctx, t, o = {}) { // 樓板以下的剖面:豎井、地下槽、梯子
    fill(ctx, TANKX0, TT, TANKX1 - TANKX0, TB - TT, lin(ctx, 0, TT, 0, TB, [[0, '#4A5763'], [1, '#2B333B']]));
    for (let k = 0; k < 5; k++) G.line(ctx, [[TANKX0 + 30, TT + 130 + k * 128], [TANKX1 - 30, TT + 130 + k * 128]], { color: 'rgba(255,255,255,0.05)', lw: 3, seed: 1200 + k });
    G.line(ctx, [[TANKX0, TB - 150], [TANKX1, TB - 150]], { color: 'rgba(150,130,90,0.22)', lw: 12, seed: 1210 });   // 水漬線
    fill(ctx, TANKX0, TB - 34, TANKX1 - TANKX0, 34, lin(ctx, 0, TB - 34, 0, TB, [[0, '#3B444C'], [1, '#33393F']])); // 槽底
    fill(ctx, OX0, FL, OX1 - OX0, SLAB, '#5B6670');                                                        // 豎井(樓板那一段)
    ladder(ctx);
    if (o.ductIn) o.ductIn();
    fill(ctx, TANKX0, TT, TANKX1 - TANKX0, TB - TT, lin(ctx, 0, TT, 0, TB, [[0, 'rgba(6,9,14,0.2)'], [1, 'rgba(6,9,14,0.58)']])); // 黑暗
    lightShaft(ctx, o.light ?? 1);
    if (o.motes) motes(ctx, t, o.motes);
    if (o.inside) o.inside();
    // 剖面:樓板、槽壁、槽底(混凝土 + 斜線)
    const conc = { fill: '#BDB6A8', lw: 5, hatch: { color: 'rgba(90,80,60,0.25)', gap: 15, angle: -0.8 } };
    G.rrect(ctx, -700, FL, OX0 + 700, SLAB, 0, { ...conc, seed: 1300 });
    G.rrect(ctx, OX1, FL, W + 700 - OX1, SLAB, 0, { ...conc, seed: 1301 });
    G.rrect(ctx, -700, TT, TANKX0 + 700, 1400, 0, { ...conc, seed: 1302 });
    G.rrect(ctx, TANKX1, TT, 700, 1400, 0, { ...conc, seed: 1303 });
    G.rrect(ctx, TANKX0, TB, TANKX1 - TANKX0, 600, 0, { ...conc, seed: 1304 });
    if (o.beam) o.beam();
  }
  // 整個現場:o = { tripod, cones, blower: { x, u, inflate, run, spin }, floorTorch, light, motes, beam, inside, people, front }
  function site(ctx, t, o = {}) {
    plant(ctx);
    floorBand(ctx);
    lid(ctx);
    if (o.cones) cones(ctx, t);
    if (o.tripod) tripodBackLeg(ctx);
    const b = o.blower;
    section(ctx, t, { ...o, ductIn: b ? () => duct(ctx, t, b.x, b.u ?? 1, b.inflate ?? 1, b.run ?? 0, 'in') : null });
    let tri = null;
    if (o.tripod) tri = tripod(ctx, t, o.tripod);
    if (b) { duct(ctx, t, b.x, b.u ?? 1, b.inflate ?? 1, b.run ?? 0, 'out'); blower(ctx, t, b.x, b); intakeAir(ctx, t, b.x, b.run ?? 0); }
    if (o.floorTorch) torch(ctx, FLOOR_TORCH[0], FLOOR_TORCH[1], 0.06, 0.8, false, 1540);
    if (o.people) o.people(tri);
    if (o.front) o.front(tri);
    return tri;
  }

  // ---------- 救援人員的裝備 ----------
  // 全罩面罩(頭的座標):大面鏡 + 黑色橡膠框 + 下面的供氣閥。u 0 → 1 = 從胸前拿上來戴好
  function fullMask(ctx, u, seed = 800) {
    const dy = lerp(200, 0, ease.inOutCubic(clamp(u)));
    ctx.save(); ctx.translate(0, dy);
    const ell = (rx, ry, cy) => { const p = []; for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; p.push([Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
    for (const sd of [-1, 1]) stroke(ctx, [[sd * 52, -34], [sd * 66, -40]], '#26282E', 9);             // 頭帶
    for (const sd of [-1, 1]) stroke(ctx, [[sd * 48, 30], [sd * 64, 36]], '#26282E', 9);
    ctx.save(); ctx.globalAlpha *= 0.42; G.shape(ctx, ell(50, 52, -4), { fill: '#BFE2F2', lw: 0, seed: seed + 2 }); ctx.restore(); // 面鏡(看得到眼睛)
    G.shape(ctx, ell(54, 56, -4), { fill: null, stroke: '#26282E', lw: 12, seed: seed + 1 });          // 橡膠框
    stroke(ctx, [[-30, -40], [-12, -50]], 'rgba(255,255,255,0.85)', 6);                                 // 反光
    stroke(ctx, [[34, 0], [38, 16]], 'rgba(255,255,255,0.6)', 5);
    G.poly(ctx, [[-30, 26], [30, 26], [24, 78], [-24, 78]], { fill: '#33363D', lw: 4, seed: seed + 3, step: 10 }); // 供氣閥的座
    G.ellipse(ctx, 0, 56, 20, 20, { fill: '#5C6470', lw: 4, seed: seed + 4 });
    G.ellipse(ctx, 0, 56, 9, 9, { fill: '#9AA4AE', lw: 2.5, seed: seed + 5 });
    ctx.restore();
  }
  function scbaFront(ctx, o) { // 正面:空氣呼吸器的黑色肩帶、腰帶、左肩帶上的壓力錶
    local(ctx, o, () => {
      const bw = BW[o.style.build] || 1, sh = -322, hip = -150;
      for (const sd of [-1, 1]) G.limb(ctx, [[sd * 62 * bw, sh + 4], [sd * 64 * bw, sh + 80], [sd * 66 * bw, hip - 34]], { color: '#26282E', lw: 15, outline: 3, seed: 1710 + sd });
      G.limb(ctx, [[-78 * bw, hip - 12], [78 * bw, hip - 12]], { color: '#26282E', lw: 15, outline: 3, seed: 1713 });
      G.rrect(ctx, -16, hip - 23, 32, 22, 5, { fill: '#8E99A3', lw: 3, seed: 1714 });
      G.ellipse(ctx, -64 * bw, sh + 112, 16, 16, { fill: '#FFFFFF', lw: 4, seed: 1715 });
      stroke(ctx, [[-64 * bw, sh + 112], [-58 * bw, sh + 104]], RED, 3.5);
    });
  }
  function scbaPeek(ctx, o) { // 正面:背上的氣瓶從右肩後面露出一點(先畫,在人後面)
    local(ctx, o, () => { G.rrect(ctx, 44, -350, 60, 176, 28, { fill: '#C9CFD6', lw: 4.5, seed: 1720 }); G.rrect(ctx, 44, -290, 60, 26, 4, { fill: '#2E5E9E', lw: 3, seed: 1721 }); });
  }
  function hose(ctx, o, u) { // 供氣閥 → 胸前 → 右腰(接到背後的氣瓶)
    if (u < 0.99) return;
    const M = world(o, 0, -404 + 70), P1 = world(o, 34, -230), P2 = world(o, 80, -170);
    stroke(ctx, smooth([M, P1, P2]), '#26282E', 11 * o.s); stroke(ctx, smooth([M, P1, P2]), '#4A4E57', 6 * o.s);
  }
  // 背面的人:面對梯子往下爬。看得到背上的空氣瓶(閥朝下,標「空氣」)、安全帶、背後的 D 環
  function helmetBack(ctx, c, seed) {
    for (const sd of [-1, 1]) stroke(ctx, [[sd * 64, -50], [sd * 62, -6], [sd * 54, 30]], '#2E3036', 8);
    const dome = []; for (let k = 0; k <= 18; k++) { const a = Math.PI + Math.PI * k / 18; dome.push([Math.cos(a) * 75, -52 + Math.sin(a) * 68]); }
    G.shape(ctx, dome, { fill: c, lw: 4.5, seed: seed + 232, hatch: { color: 'rgba(0,0,0,0.07)', gap: 7 } });
    G.rrect(ctx, -11, -118, 22, 66, 9, { fill: Ch.shade(c, 1.06), lw: 3, seed: seed + 233, amp: 0.5 });
    G.rrect(ctx, -92, -60, 184, 15, 7, { fill: Ch.shade(c, 0.8), lw: 4, seed: seed + 234 });
  }
  function backPerson(ctx, o) {
    const st = o.style, bw = BW[st.build] || 1, hip = -150, sh = hip - 172, sd0 = o.seed || 700, hc = '#2B3A5C';
    const handL = o.handL || [-92, hip - 30], handR = o.handR || [92, hip - 30], footL = o.footL || [-46, 0], footR = o.footR || [46, 0];
    local(ctx, o, () => {
      for (const sd of [-1, 1]) { // 手臂往前伸到梯子上(在身體後面)
        const S0 = [sd * 70 * bw, sh + 16], P = sd < 0 ? handL : handR, a = Ch.ik(S0, P, 82, 80, sd < 0 ? (P[1] < sh ? -1 : 1) : (P[1] < sh ? 1 : -1));
        G.limb(ctx, [S0, a.E, a.H], { color: Ch.shade(st.shirt, 1.15), lw: 34, seed: sd0 + 13 + sd });
        G.ellipse(ctx, a.H[0], a.H[1], 19, 19, { fill: '#2E3036', lw: 4, seed: sd0 + 17 + sd });     // 手套
      }
      for (const sd of [-1, 1]) {
        const Hp = [sd * 36, hip + 30], F = sd < 0 ? footL : footR;
        G.limb(ctx, [Hp, kneeOf(Hp, F, sd), F], { color: st.pants, lw: 34, seed: sd0 + 1 + sd });
        G.rrect(ctx, F[0] - 26, F[1] - 22, 52, 26, 10, { fill: st.shoes, lw: 3.5, seed: sd0 + 3 + sd });
        G.limb(ctx, [[sd * 64, hip + 26], [sd * 18, hip + 44]], { color: hc, lw: 10, outline: 3, seed: sd0 + 43 + sd }); // 腿環
      }
      G.rrect(ctx, -80 * bw, hip - 18, 160 * bw, 46, 18, { fill: st.pants, lw: 4, seed: sd0 + 7 });
      G.poly(ctx, [[-78 * bw, sh], [78 * bw, sh], [74 * bw, hip + 10], [-74 * bw, hip + 10]], { fill: st.shirt, lw: 4.5, seed: sd0 + 9, step: 20 });
      for (const yy of [sh + 98, hip - 22]) G.line(ctx, [[-72 * bw, yy], [72 * bw, yy]], { color: '#F4F6F2', lw: 12, seed: sd0 + 30 + yy, amp: 0.4 }); // 反光條
      // 全身式安全帶:背後交叉 + 腰帶
      G.limb(ctx, [[-50 * bw, sh + 4], [0, sh + 40], [44 * bw, hip - 30]], { color: hc, lw: 11, outline: 3, seed: sd0 + 40 });
      G.limb(ctx, [[50 * bw, sh + 4], [0, sh + 40], [-44 * bw, hip - 30]], { color: hc, lw: 11, outline: 3, seed: sd0 + 41 });
      G.limb(ctx, [[-76 * bw, hip - 30], [76 * bw, hip - 30]], { color: hc, lw: 13, outline: 3, seed: sd0 + 42 });
      if (o.scba) { // 空氣呼吸器:背架 + 氣瓶(閥朝下)+ 肩帶 + 高壓管
        for (const sd of [-1, 1]) G.limb(ctx, [[sd * 40, sh + 52], [sd * 62 * bw, sh + 2]], { color: '#26282E', lw: 15, outline: 3, seed: sd0 + 52 + sd });
        G.rrect(ctx, -56, sh + 46, 112, hip - sh - 30, 14, { fill: '#2E3036', lw: 4, seed: sd0 + 50 });
        G.rrect(ctx, -40, sh + 40, 80, hip - sh - 44, 36, { fill: '#C9CFD6', lw: 4.5, seed: sd0 + 51, hatch: { color: 'rgba(60,70,80,0.12)', gap: 8 } });
        stroke(ctx, [[-24, sh + 58], [-24, hip - 32]], 'rgba(255,255,255,0.7)', 6);
        G.rrect(ctx, -40, sh + 86, 80, 44, 4, { fill: '#2E5E9E', lw: 3.5, seed: sd0 + 54 });
        G.decor(() => label(ctx, '空氣', 0, sh + 121, 34, '#FFFFFF'));
        G.rrect(ctx, -13, hip - 6, 26, 26, 5, { fill: '#5C6470', lw: 3.5, seed: sd0 + 55 });          // 瓶閥
        G.ellipse(ctx, 0, hip + 26, 17, 8, { fill: '#26282E', lw: 3, seed: sd0 + 56 });
        G.limb(ctx, [[12, hip + 8], [58, hip - 10], [64 * bw, sh + 30]], { color: '#26282E', lw: 8, outline: 2.5, seed: sd0 + 57 });
      }
      G.ellipse(ctx, 0, sh + 20, 13, 11, { fill: null, stroke: '#D9DEE3', lw: 7, seed: sd0 + 60 });     // 背後 D 環
      G.rrect(ctx, -20, sh - 24, 40, 30, 8, { fill: Ch.shade(st.skin, 0.84), lw: 3.5, seed: sd0 + 19 }); // 脖子
      ctx.save(); ctx.translate(0, sh - 82);
      for (const sd of [-1, 1]) G.ellipse(ctx, sd * 64, 6, 14, 18, { fill: st.skin, lw: 3.5, seed: sd0 + 21 + sd });
      G.ellipse(ctx, 0, 0, 64, 70, { fill: st.hair, lw: 4.5, seed: sd0 + 23 });
      if (o.scba) { for (const [ax, ay] of [[-56, -24], [-62, 28], [56, -24], [62, 28]]) stroke(ctx, [[ax, ay], [0, 16]], '#26282E', 9); G.ellipse(ctx, 0, 16, 18, 15, { fill: '#26282E', lw: 3, seed: sd0 + 24 }); } // 面罩頭帶
      helmetBack(ctx, st.headwearColor || '#D8402E', sd0);
      ctx.restore();
    });
    return world(o, 0, sh + 20); // D 環的畫面座標
  }

  // ---------- 每一幕 ----------
  // 1 同事下到槽裡檢查,一直沒有上來
  function waiting(ctx, t) {
    const looking = t >= ev.watch && t < ev.call - 0.1, calling = t >= ev.call;
    const o = { x: 400, y: FL, s: SS, pose: 'stand', style: CAST.shu, seed: 400, harness: {}, eyes: 'normal', brows: calling ? 'worried' : 'neutral', mouth: calling ? 'o' : 'flat',
      look: looking ? -0.3 : 0.7, lookY: looking ? 0.8 : 0.5, blink: blink(t, 0.2), blush: 0.4 };
    if (looking) o.handL = [-6, -262];
    site(ctx, t, { people: () => person(ctx, o) });
    if (t >= ev.clock) { // 時鐘卡:指針一直轉
      const a = popIn(t, ev.clock, 0.3), sp = (t - ev.clock) * 5.5;
      ctx.save(); ctx.translate(200, 470); ctx.rotate(-0.04); ctx.scale(a, a);
      G.tornPaper(ctx, -96, -92, 192, 184, { fill: '#FFF6D8', seed: 520 });
      G.ellipse(ctx, 0, 0, 62, 62, { fill: '#FFFFFF', lw: 6, seed: 521, amp: 0.3 });
      for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; stroke(ctx, [[Math.cos(an) * 48, Math.sin(an) * 48], [Math.cos(an) * 56, Math.sin(an) * 56]], INK, k % 3 ? 3 : 6); }
      stroke(ctx, [[0, 0], [Math.sin(sp) * 44, -Math.cos(sp) * 44]], RED, 6);
      stroke(ctx, [[0, 0], [Math.sin(sp / 12 + 1) * 28, -Math.cos(sp / 12 + 1) * 28]], INK, 8);
      G.rrect(ctx, -8, -78, 16, 12, 3, { fill: INK, lw: 0, seed: 523 });
      ctx.restore();
    }
    if (calling) KIT.bubble(ctx, t, { text: '喂?', x: 600, y: 536, tail: [470, 648], t0: ev.call, size: 58, maxW: 300 });
    finish(ctx, 'rgba(255,255,255,0.08)');
  }
  // 2 阿樹拿手電筒往下一照,人倒在底下(只看到光圈裡模糊的一團)
  const SHU2 = 440, TORCH_AT = [592, 846];
  function shuTorch(t, panic = false) {
    const raise = ease.inOutCubic(clamp((t - ev.torch) / 0.45)), wu = clamp((t - (A[1] - 0.15)) / 0.5), on = t >= ev.on;
    const x = lerp(400, SHU2, ease.inOutCubic(wu));
    const o = { x, y: FL, s: SS, pose: wu > 0 && wu < 1 ? 'walk' : 'stand', walk: (wu * 1.2) % 1, style: CAST.shu, seed: 400, harness: {},
      eyes: on ? 'wide' : 'normal', brows: on ? 'worried' : 'neutral', mouth: on ? 'o' : 'flat', look: 0.75, lookY: 0.9, sweat: panic ? 1 : on ? 0.5 : 0, blink: on ? 0 : blink(t, 0.2), blush: 0.3 };
    const rest = world(o, 92 * 0.86, -180), hp = [lerp(rest[0], TORCH_AT[0], raise), lerp(rest[1], TORCH_AT[1], raise)];
    o.handR = toLocal(o, hp[0], hp[1]);
    if (panic) { o.handL = [-70 + Math.sin(t * 13) * 3, -250]; o.headRot = 0.05; }
    return { o, hp, raise, on };
  }
  function drawTorchBeam(ctx, t, hp, raise, victim) {
    const ang = lerp(0.3, Math.PI / 2 + 0.05, raise), lens = [hp[0] + Math.cos(ang) * 34, hp[1] + Math.sin(ang) * 34];
    const a = t >= ev.on ? clamp((t - ev.on) / 0.08) : 0;
    return { ang, lens, a, draw: () => beam(ctx, lens, [624, TB - 16], a, { w0: 10, w1: 118, victim }) };
  }
  function torchShot(ctx, t) {
    const { o, hp, raise } = shuTorch(t);
    const tu = ease.inOutCubic(clamp((t - ev.tilt[0]) / (ev.tilt[1] - ev.tilt[0])));
    const c = camMix({ x: 500, y: 770, z: 1.3 }, { x: 590, y: 1500, z: 1.1 }, tu);
    const B = drawTorchBeam(ctx, t, hp, raise, true);
    cam(ctx, c, () => site(ctx, t, { light: 0.8, beam: B.draw, people: () => { person(ctx, o); torch(ctx, hp[0], hp[1], B.ang, 0.85, B.a > 0); } }));
    finish(ctx, 'rgba(255,255,255,0.06)');
  }
  function panic(ctx, t) { // 一動也不動:回到阿樹的臉,驚慌;頭還是在洞口外面
    const { o, hp, raise } = shuTorch(t, true);
    const B = drawTorchBeam(ctx, t, hp, raise, false);
    const c = { x: 492, y: 700, z: lerp(1.95, 2.05, clamp((t - ev.still) / 1.6)) };
    cam(ctx, c, () => site(ctx, t, { light: 0.8, beam: B.draw, people: () => { person(ctx, o); torch(ctx, hp[0], hp[1], B.ang, 0.85, true); } }));
    finish(ctx, 'rgba(255,255,255,0.06)');
  }
  // 3 + 4 抓著梯子就要下去 → 定格 → 師傅從後面抓住安全帶拉回來 → 兩人退離洞口(同一個鏡頭)
  function grabState(t) {
    const go = ease.inOutCubic(clamp((t - ev.rail + 0.35) / 0.5));                  // 撲向梯子
    const stp = ease.inOutCubic(clamp((t - ev.step) / 0.4));                          // 一腳踩上第一階
    const frozen = t >= ev.freeze && t < ev.reach + 0.5;
    const tt = t < ev.freeze ? t : t < ev.reach + 0.5 ? ev.freeze : t - (ev.reach + 0.5 - ev.freeze); // 定格時動作停住
    const pu = ease.inOutCubic(clamp((t - ev.pull) / 0.85));                          // 拉回來
    const bk = ease.inOutCubic(clamp((t - ev.back) / 1.1));                           // 再退開
    const grabbed = t >= ev.grab;
    // 阿樹
    const xs = lerp(lerp(SHU2, 478, go), 310, pu), x = lerp(xs, 262, bk);
    const dip = 30 * stp * (1 - pu), lean = 0.08 * stp * (1 - pu) - 0.16 * Math.sin(Math.PI * pu) * (1 - bk);
    const o = { x, y: FL + dip, s: SS, rot: lean, pose: pu > 0.05 && pu < 0.95 || bk > 0.02 && bk < 0.98 ? 'walk' : 'stand', walk: (pu * 1.6 + bk * 1.4) % 1, style: CAST.shu, seed: 400, harness: {},
      eyes: 'wide', brows: pu > 0.3 ? 'up' : 'worried', mouth: pu > 0.3 ? 'o' : 'wavy', look: pu > 0.3 ? -0.5 : 0.7, lookY: pu > 0.3 ? -0.2 : 0.6, sweat: 1, blink: 0, blush: 0.3 };
    if (stp > 0 && pu < 0.6) { const k = stp * (1 - clamp(pu / 0.6)); o.feet = { L: [lerp(-46, -55, k), -dip / SS], R: [lerp(46, 106, k), lerp(0, 2, k)] }; }
    if (go > 0 && pu < 0.25) { // 雙手抓左邊的扶手
      const r1 = [MC - LADW + 2, 772], r2 = [MC - LADW - 4, 850];
      o.handR = toLocal(o, lerp(world(o, 92 * 0.86, -180)[0], r1[0], go), lerp(world(o, 92 * 0.86, -180)[1], r1[1], go));
      o.handL = toLocal(o, lerp(world(o, -92 * 0.86, -180)[0], r2[0], go), lerp(world(o, -92 * 0.86, -180)[1], r2[1], go));
    } else if (pu >= 0.25 && bk < 1) { o.handR = [110, -300 + Math.sin(tt * 9) * 10]; o.handL = [-118, -250]; }
    // 師傅:從左邊進來,抓住阿樹左肩的安全帶往後拉
    const mIn = ease.outCubic(clamp((t - ev.reach) / (ev.grab - ev.reach)));
    const grabPt = world(o, -62, -318);
    const mx = lerp(-160, x - 118, mIn);
    const mo = { x: mx, y: BWY + 26, s: 0.8, rot: -0.1 * Math.sin(Math.PI * pu), pose: (mIn > 0 && mIn < 1) || (pu > 0.05 && pu < 0.95) || (bk > 0.02 && bk < 0.98) ? 'walk' : 'stand', walk: (mIn * 1.5 + pu * 1.6 + bk * 1.4) % 1,
      style: CAST.master, seed: 440, eyes: grabbed ? 'normal' : 'wide', brows: 'determined', mouth: 'flat', look: 0.8, lookY: 0.2, blink: 0, blush: 0.3 };
    if (mIn > 0) mo.handR = toLocal(mo, lerp(world(mo, 110, -200)[0], grabPt[0], mIn), lerp(world(mo, 110, -200)[1], grabPt[1], mIn));
    return { o, mo, grabPt, grabbed, frozen, mIn, pu, bk, go, stp };
  }
  function freezeLook(ctx, t) { // 定格:畫面停住,四角出現框線
    if (t < ev.freeze || t >= ev.reach + 0.5) return;
    fill(ctx, -200, -200, W + 400, H + 400, 'rgba(196,214,240,0.20)');
    const fl = clamp(1 - (t - ev.freeze) / 0.16);
    if (fl > 0) fill(ctx, -200, -200, W + 400, H + 400, `rgba(255,255,255,${0.7 * fl})`);
    const L = 74, x0 = 110, x1 = 900, y0 = 300, y1 = 1250;
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], INK, 16); stroke(ctx, [[x + dx * L, y], [x, y], [x, y + dy * L]], '#FFFFFF', 9); }
  }
  function grip(ctx, o, g) { // 從背後被拉出來的一段織帶 + 抓著它的拳頭
    const S0 = world(o, -40, -318);
    G.limb(ctx, [S0, [lerp(S0[0], g[0], 0.5), Math.min(S0[1], g[1]) - 8], g], { color: '#2B3A5C', lw: 9 * o.s, outline: 3, seed: 471 });
    G.ellipse(ctx, g[0] - 6, g[1] + 2, 19, 16, { fill: CAST.master.skin, lw: 4, seed: 470 });
    for (let k = 0; k < 3; k++) stroke(ctx, [[g[0] - 16 + k * 9, g[1] - 8], [g[0] - 14 + k * 9, g[1] + 8]], Ch.shade(CAST.master.skin, 0.7), 2.5);
  }
  function grabShot(ctx, t) {
    const st = grabState(t);
    const pan = ease.inOutCubic(clamp((t - ev.pull - 0.1) / 1.6));
    const c = { x: lerp(470, 300, pan), y: 790, z: lerp(1.4, 1.32, pan) + (st.grabbed ? U.springKick(t, ev.grab, 8, 8) * 0.03 : 0) };
    cam(ctx, c, () => site(ctx, t, { light: 0.8, floorTorch: t >= ev.drop + 0.25, people: () => {
      if (st.mIn > 0) person(ctx, st.mo);
      person(ctx, st.o);
      if (st.grabbed) grip(ctx, st.o, st.grabPt); // 師傅的手從後面抓住阿樹肩上的安全帶
    }, front: () => {
      if (t >= ev.drop && t < ev.drop + 0.25) { const u = (t - ev.drop) / 0.25; torch(ctx, lerp(560, FLOOR_TORCH[0], u), lerp(840, FLOOR_TORCH[1], u * u), lerp(1.4, 6.3, u), 0.8, false, 1540); }
    } }));
    if (st.grabbed && t < ev.grab + 0.3) { const q = (t - ev.grab) / 0.3, [bx, by] = scr(c, st.grabPt[0], st.grabPt[1]); burst(ctx, bx, by, 40 + q * 50, 76 + q * 70, 1 - q, 9, '#FFFFFF', 10); }
    finish(ctx, 'rgba(255,255,255,0.08)');
    freezeLook(ctx, t);
  }
  // 5 「你下去,就是第二個。」
  function talk(ctx, t) {
    const m = mouthOf('master', t);
    const so = { x: 262, y: FL, s: SS, pose: 'stand', style: CAST.shu, seed: 400, harness: {}, eyes: 'wide', brows: 'worried', mouth: 'o', look: -0.6, lookY: 0.1, sweat: 1, blink: blink(t, 0.4), blush: 0.3, headRot: -0.03 };
    const mo = { x: 60, y: FL, s: SS, pose: 'stand', style: CAST.master, seed: 440, eyes: 'normal', brows: 'determined', mouth: m || 'flat', look: 0.6, lookY: 0.05, blink: blink(t, 0.6), blush: 0.3, headRot: 0.03 + Math.sin(t * 2.4) * 0.015 };
    const z = lerp(1.55, 1.62, clamp((t - A[4] + 0.15) / 3));
    cam(ctx, { x: 165, y: 712, z }, () => site(ctx, t, { light: 0.8, floorTorch: true, people: () => { person(ctx, mo); person(ctx, so); } }));
    finish(ctx, 'rgba(255,232,190,0.10)');
  }
  // 6 槽裡看起來什麼都沒有:裡面很平靜,慢慢浮現缺氧的警示(倒下的同事不畫出來)
  function eyeIcon(ctx, x, y, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.ellipse(ctx, 0, 0, 66, 66, { fill: '#FFFDF4', lw: 5, seed: 860 });
    G.poly(ctx, [[-42, 0], [-20, -20], [20, -20], [42, 0], [20, 20], [-20, 20]], { fill: '#FFFFFF', lw: 5, seed: 861, step: 8 });
    G.ellipse(ctx, 0, 0, 14, 14, { fill: INK, lw: 0, seed: 862 });
    stroke(ctx, [[-40, 40], [40, -40]], RED, 10);
    ctx.restore();
  }
  function noseIcon(ctx, x, y, a, t) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.ellipse(ctx, 0, 0, 66, 66, { fill: '#FFFDF4', lw: 5, seed: 870 });
    G.poly(ctx, [[-20, -40], [-4, -40], [10, 10], [2, 22], [-22, 22], [-30, 10]], { fill: '#F0C29C', lw: 5, seed: 871, step: 8 }); // 鼻子
    G.ellipse(ctx, -14, 14, 5, 3.5, { fill: INK, lw: 0, seed: 874 }); G.ellipse(ctx, -2, 14, 4, 3, { fill: INK, lw: 0, seed: 875 });
    for (let k = 0; k < 3; k++) { const x0 = 16 + k * 12; G.line(ctx, [[x0, 30], [x0 + 6, 16], [x0, 2], [x0 + 6, -12]], { color: '#7E8C9A', lw: 4, seed: 872 + k, step: 5, amp: 0.3 }); } // 氣味
    stroke(ctx, [[-40, 40], [40, -40]], RED, 10);
    ctx.restore();
  }
  function o2Sign(ctx, x, y, a, sc) { // 缺氧警示:黃色三角 + O₂ ↓ + 「缺氧」
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
    G.poly(ctx, [[0, -150], [168, 128], [-168, 128]], { fill: '#FFD84A', lw: 8, seed: 880, step: 16 });
    G.poly(ctx, [[0, -112], [132, 106], [-132, 106]], { fill: null, stroke: '#26282E', lw: 10, seed: 881, step: 16 });
    G.text(ctx, 'O', -32, 72, { size: 120, fam: KIT.NUM, weight: 800, color: '#26282E', align: 'center', boil: 0 });
    G.text(ctx, '2', 22, 86, { size: 56, fam: KIT.NUM, weight: 800, color: '#26282E', align: 'center', boil: 0 });
    stroke(ctx, [[70, -10], [70, 66]], RED, 14); stroke(ctx, [[46, 40], [70, 70], [94, 40]], RED, 14);
    G.rrect(ctx, -110, 150, 220, 92, 20, { fill: '#26282E', lw: 4, seed: 882 });
    label(ctx, '缺氧', 0, 220, 70, '#FFD84A');
    ctx.restore();
  }
  function inside(ctx, t) {
    const z = lerp(1.18, 1.26, clamp((t - ev.calm) / 7.5));
    const c = { x: MC + 10, y: 1236, z };
    cam(ctx, c, () => site(ctx, t, { light: 1, motes: 1 }));
    // 看不見、聞不到;缺氧警示慢慢浮現
    const su = clamp((t - ev.sign[0]) / (ev.sign[1] - ev.sign[0]));
    o2Sign(ctx, 540, 640, ease.inOutQuad(su), 1.16 + 0.08 * ease.outCubic(su));
    for (const [x, t0, fn, word] of [[290, ev.eye, eyeIcon, '看不見'], [790, ev.nose, noseIcon, '聞不到']]) {
      const a = popIn(t, t0, 0.35);
      fn(ctx, x, 1090, a * 1.15, t);
      if (a > 0) { ctx.save(); ctx.globalAlpha *= clamp((t - t0) / 0.25); label(ctx, word, x, 1226, 46, '#FFFFFF', { stroke: '#1E1611', strokeW: 12 }); ctx.restore(); }
    }
    finish(ctx, 'rgba(200,215,255,0.06)');
  }
  // 7a 師傅的第一件事:喊人、通報(對著無線電;嘴型不跟旁白動)
  function radioShot(ctx, t) {
    const up = ease.inOutCubic(clamp((t - ev.radio) / 0.4)), wav = t >= ev.shout - 0.6;
    const mo = { x: 60, y: FL, s: SS, pose: 'stand', style: CAST.master, seed: 440, eyes: 'normal', brows: 'determined', mouth: up > 0.5 ? 'o' : 'flat', look: 0.4, lookY: 0, blink: blink(t, 0.6), blush: 0.3 };
    const rest = world(mo, 92 * 1.18, -180), rp = [lerp(rest[0], 60 + 50, up), lerp(rest[1], FL - 352, up)];
    mo.handR = toLocal(mo, rp[0] - 6, rp[1] + 40);
    if (wav) mo.handL = [-132 + Math.sin(t * 9) * 16, -470 + Math.cos(t * 9) * 6];                  // 揮手叫人過來
    const so = { x: 262, y: FL, s: SS, pose: 'stand', style: CAST.shu, seed: 400, harness: {}, eyes: 'wide', brows: 'worried', mouth: 'flat', look: -0.7, lookY: 0.2, sweat: 0.8, blink: blink(t, 0.4), blush: 0.3 };
    const c = { x: 175, y: 700, z: lerp(1.5, 1.56, clamp((t - ev.radio) / 4)) };
    cam(ctx, c, () => site(ctx, t, { light: 0.8, people: () => { person(ctx, mo); radio(ctx, rp[0], rp[1], 0.2, 0.85); person(ctx, so); } }));
    const [wx, wy] = scr(c, rp[0] + 12, rp[1] - 84);
    waves(ctx, wx, wy, t, ev.radio + 0.3, 1, 1);
    finish(ctx);
  }
  // 7b 旁人推來電動送風機:風管伸進人孔,進風口朝門外的乾淨空氣;字卡
  function blowerState(t) {
    const mv = ease.outCubic(clamp((t - ev.blower + 0.3) / 0.65));
    const bx = lerp(BLOWER_X + 130, BLOWER_X, mv);
    const du = ease.inOutCubic(clamp((t - ev.duct) / 0.7));
    const run = clamp((t - ev.fan) / 0.5), spin = run > 0 ? (t - ev.fan) * (6 + 22 * run) : 0, inflate = ease.outCubic(clamp((t - ev.fan) / 0.45));
    return { x: bx, u: du, run, spin, inflate, mv };
  }
  function blowerShot(ctx, t) {
    const b = blowerState(t);
    const out = ease.inOutCubic(clamp((t - ev.fan - 0.2) / 1.3));                    // 開好之後從門口出去
    const press = t >= ev.fan - 0.35 && t < ev.fan + 0.2;
    const cx = lerp(b.x + 142, 1260, out), moving = b.mv < 1 || (out > 0 && out < 1);
    const co = { x: cx, y: FL, s: SS, pose: moving ? 'walk' : 'stand', walk: (b.mv * 1.4 + out * 3) % 1, style: CAST.crew, seed: 480, eyes: 'normal', brows: 'determined', mouth: 'flat',
      look: out > 0.2 ? 0.6 : -0.7, lookY: 0.4, blink: blink(t, 0.3), blush: 0.2 };
    if (b.mv < 1) co.handL = toLocal(co, b.x + 60, FL - 132);                        // 推著送風機
    else if (press) co.handL = toLocal(co, b.x + 45, FL - 156);                       // 按開關
    const c = { x: 720, y: 880, z: 1.18 };
    cam(ctx, c, () => site(ctx, t, { light: 0.9, blower: b, people: () => person(ctx, co) }));
    if (t >= ev.fan + 0.8) { // 乾淨空氣的小標
      const a = popIn(t, ev.fan + 0.8, 0.3), [lx, ly] = scr(c, BLOWER_X + 66, 604);
      ctx.save(); ctx.translate(lx, ly); ctx.scale(a, a); ctx.rotate(0.03);
      G.tornPaper(ctx, -112, -42, 224, 84, { fill: '#EAF7FD', seed: 640 });
      G.decor(() => label(ctx, '乾淨空氣', 0, 16, 46, '#1F5E86'));
      ctx.restore();
    }
    if (t >= ev.card7) { // 字卡:送新鮮空氣,不送氧氣
      const a = popIn(t, ev.card7, 0.35);
      ctx.save(); ctx.translate(290, 395); ctx.rotate(-0.025); ctx.scale(a, a);
      G.tornPaper(ctx, -232, -128, 464, 256, { fill: '#FFFDF4', seed: 650 });
      KIT.tick(ctx, -170, -50, 30, popIn(t, ev.card7 + 0.15, 0.25), { seed: 651 });
      label(ctx, '送新鮮空氣', 30, -28, 74, INK);
      label(ctx, '不送氧氣', 0, 86, 74, RED);
      ctx.restore();
    }
    finish(ctx);
  }
  // 8a 救援人員戴上全罩面罩(空氣呼吸器);旁邊是顧捲揚器的人
  const RX = 470, AX = 352;
  function rescuerFront(t) {
    const u = clamp((t - ev.mask) / 0.8), strap = clamp((t - ev.mask - 0.85) / 0.5) * (1 - clamp((t - ev.mask - 1.7) / 0.5));
    const o = { x: RX, y: FL, s: SS, pose: 'stand', style: CAST.rescuer, seed: 500, harness: {}, eyes: 'normal', brows: 'determined', mouth: 'flat', look: -0.15, lookY: 0.1, blink: blink(t, 0.5), blush: 0 };
    const dy = lerp(200, 0, ease.inOutCubic(u));
    if (u < 1) { o.handL = [-62, -404 + 16 + dy]; o.handR = [62, -404 + 16 + dy]; }
    else if (strap > 0) { o.handL = [lerp(-92, -78, strap), lerp(-180, -440, strap)]; o.handR = [lerp(92, 78, strap), lerp(-180, -440, strap)]; }
    return { o, u };
  }
  function maskShot(ctx, t) {
    const { o, u } = rescuerFront(t);
    const ao = { x: AX - 40, y: FL, s: SS, pose: 'stand', style: CAST.winch, seed: 520, harness: {}, eyes: 'normal', brows: 'determined', mouth: 'flat', look: 0.6, lookY: 0.1, blink: blink(t, 0.7), blush: 0 };
    const hook = [AX + 40, 856];
    ao.handR = toLocal(ao, hook[0], hook[1] + 10);
    const c = { x: 420, y: 700, z: lerp(1.9, 1.98, clamp((t - A[7]) / 4)) };
    cam(ctx, c, () => site(ctx, t, { light: 0.9, tripod: { crank: 0 }, cones: true, blower: { x: BLOWER_X, u: 1, run: 1, spin: t * 28, inflate: 1 }, people: (tri) => {
      stroke(ctx, [tri.pulley, [hook[0] + 4, hook[1] - 30]], '#3A3D44', 4); snap(ctx, hook[0] + 4, hook[1] - 30, 0, 0.62); // 救生索的掛鉤,拿在手上
      person(ctx, ao);
      scbaPeek(ctx, o); person(ctx, o); scbaFront(ctx, o);
      headLocal(ctx, o, () => fullMask(ctx, u, 500));
      hose(ctx, o, u);
    } }));
    finish(ctx);
  }
  // 8b 背面:背上的空氣瓶;救生索扣上背後的 D 環(喀);沿著梯子下去。鏡頭拉遠:三腳架、捲揚器、送風機還在轉、阿樹在警示線外
  function descendState(t) {
    const st = ease.inOutCubic(clamp((t - ev.down) / 0.55)), dn = Math.max(0, t - ev.down - 0.55);
    const x = lerp(RX + 8, MC, st), y = FL + 36 * st + dn * 135;
    const ph = dn * 2.6, a = Math.sin(ph * Math.PI);
    const o = { x, y, s: SS, style: CAST.rescuer, seed: 500, scba: true };
    const rail = (sd, wy) => toLocal(o, MC + sd * LADW, wy);
    if (st < 0.5) { o.handL = [-92, -180]; o.handR = [92, -180]; }
    else { o.handL = rail(-1, y - 300 + a * 22); o.handR = rail(1, y - 300 - a * 22); o.footL = [-40, -6 + Math.max(0, a) * -30]; o.footR = [40, -6 + Math.max(0, -a) * -30]; }
    return { o, st, dn };
  }
  function descend(ctx, t) {
    const d = descendState(t), clipped = t >= ev.clip;
    const zu = ease.inOutCubic(clamp((t - ev.clip - 0.5) / 1.2));
    const c = camMix({ x: 450, y: 760, z: 1.75 }, { x: 500, y: 900, z: 0.97 }, zu);
    const crank = Math.max(0, t - ev.down - 0.4) * 5;
    let D = null;
    cam(ctx, c, () => site(ctx, t, { light: 0.9, tripod: { crank }, cones: true, blower: { x: BLOWER_X, u: 1, run: 1, spin: t * 28, inflate: 1 }, people: (tri) => {
      // 警示線外:師傅、阿樹(不參與救援)
      const mo = { x: 150, y: BWY + 30, s: 0.74, pose: 'stand', style: CAST.master, seed: 440, eyes: 'normal', brows: 'determined', mouth: 'flat', look: 0.7, lookY: 0.1, blink: blink(t, 0.6), blush: 0.2 };
      const so = { x: 70, y: FL, s: 0.8, pose: 'stand', style: CAST.shu, seed: 400, harness: {}, eyes: 'wide', brows: 'worried', mouth: 'flat', look: 0.8, lookY: 0.3, blink: blink(t, 0.4), blush: 0.3 };
      const rp = world(mo, -54, -352); mo.handL = toLocal(mo, rp[0] + 5, rp[1] + 34);
      person(ctx, mo); radio(ctx, rp[0], rp[1], -0.2, 0.74); person(ctx, so);
      // 顧捲揚器的人:先扣救生索,再回去搖捲揚器
      const ao = { x: AX, y: FL, s: SS, pose: 'stand', style: CAST.winch, seed: 520, harness: {}, eyes: 'normal', brows: 'determined', mouth: 'flat', look: 0.6, lookY: t > ev.down ? 0.7 : -0.1, blink: blink(t, 0.7), blush: 0 };
      const Dpt = world(d.o, 0, -302);
      const toHook = ease.inOutCubic(clamp((t - ev.back8) / 0.5)), toCrank = ease.inOutCubic(clamp((t - ev.down - 0.1) / 0.4));
      const hand = clipped ? (toCrank > 0 ? [lerp(Dpt[0], tri.knob[0], toCrank), lerp(Dpt[1], tri.knob[1], toCrank)] : Dpt) : [lerp(AX + 60, Dpt[0] - 6, toHook), lerp(856, Dpt[1] + 4, toHook)];
      ao.handR = toLocal(ao, hand[0], hand[1]);
      person(ctx, ao);
      if (clipped && toCrank >= 1) crankTop(ctx, tri, CAST.winch.skin);
      D = backPerson(ctx, d.o);
      // 救生索:滑輪 → 掛鉤
      const hk = clipped ? D : [hand[0] + 4, hand[1] - 6];
      stroke(ctx, [tri.pulley, [hk[0], hk[1] - 34]], '#3A3D44', 4);
      snap(ctx, hk[0], hk[1] - 40, 0, 0.62);
      if (!clipped || toCrank <= 0) { G.ellipse(ctx, hand[0], hand[1], 17, 15, { fill: CAST.winch.skin, lw: 4, seed: 522 }); }
    } }));
    if (clipped && t < ev.clip + 0.9 && D) { // 喀
      const q = t - ev.clip, [bx, by] = scr(c, D[0], D[1] - 30), a = popIn(t, ev.clip, 0.2);
      if (q < 0.35) burst(ctx, bx, by, 40 + q * 120, 80 + q * 160, 1 - q / 0.35, 10, '#FFFFFF', 10);
      ctx.save(); ctx.globalAlpha *= 1 - clamp((q - 0.6) / 0.3); ctx.translate(bx + 130, by - 70); ctx.scale(a, a); ctx.rotate(0.08);
      label(ctx, '喀', 0, 40, 120, RED, { stroke: '#FFFFFF', strokeW: 22 });
      ctx.restore();
      KIT.tick(ctx, bx - 110, by - 40, 34, popIn(t, ev.clip + 0.15, 0.25), { seed: 836 });
    }
    finish(ctx);
  }
  // 9 很多意外,倒下的不只一個……阿樹坐在一旁,手還在抖
  function sitShot(ctx, t) {
    const pu = ease.inOutCubic(clamp((t - ev.hands) / 1.4));
    const c = camMix({ x: 120, y: 800, z: 1.28 }, { x: -40, y: 820, z: 2.25 }, pu);
    const tr = Math.sin(t * 31) * 3.2 + Math.sin(t * 19) * 2, SEAT = FL - 126;
    const so = { x: -40, y: SEAT, s: SS, pose: 'sit', style: CAST.shu, seed: 400, harness: {}, eyes: 'normal', brows: 'worried', mouth: 'flat', look: 0.1, lookY: 0.9, blink: blink(t, 0.4), blush: 0.2, sweat: 0.5, headY: 4,
      handL: [-46 + tr, 36 + tr * 0.6], handR: [46 - tr * 0.8, 40 + tr * 0.5] };
    const ao = { x: AX, y: FL, s: SS, pose: 'stand', style: CAST.winch, seed: 520, harness: {}, eyes: 'normal', brows: 'determined', mouth: 'flat', look: 0.6, lookY: 0.7, blink: blink(t, 0.7), blush: 0 };
    cam(ctx, c, () => site(ctx, t, { light: 0.9, tripod: { crank: 1.2 + (t - ev.sit) * 2.2 }, cones: true, blower: { x: BLOWER_X, u: 1, run: 1, spin: t * 28, inflate: 1 }, people: (tri) => {
      ao.handR = toLocal(ao, tri.knob[0], tri.knob[1]);
      person(ctx, ao);
      crankTop(ctx, tri, CAST.winch.skin);
      stroke(ctx, [tri.pulley, [MC, TT + 300]], '#3A3D44', 4);       // 救生索還接在下面的人身上(畫面外)
      bucket(ctx, so.x, SEAT, FL);                                   // 倒過來的水桶當椅子
      person(ctx, so);
      if (pu > 0.2) for (const sd of [-1, 1]) { // 手還在抖:手旁邊兩道抖動的線
        const h = world(so, sd < 0 ? so.handL[0] : so.handR[0], sd < 0 ? so.handL[1] : so.handR[1]), j = Math.sin(t * 40 + sd) * 2;
        ctx.save(); ctx.globalAlpha *= clamp((pu - 0.2) / 0.3);
        for (let k = 0; k < 2; k++) stroke(ctx, [[h[0] + sd * (24 + k * 10) + j, h[1] - 16 + k * 4], [h[0] + sd * (30 + k * 10) + j, h[1] - 2], [h[0] + sd * (24 + k * 10) + j, h[1] + 12 - k * 4]], INK, 3.5);
        ctx.restore();
      }
    } }));
    fill(ctx, -200, -200, W + 400, H + 400, 'rgba(60,72,96,0.10)');
    finish(ctx, 'rgba(255,240,220,0.10)');
  }
  function bucket(ctx, x, top, floorY) {
    G.poly(ctx, [[x - 64, top + 6], [x + 64, top + 6], [x + 78, floorY], [x - 78, floorY]], { fill: '#6FA0C8', lw: 4.5, seed: 1730, step: 14 });
    G.rrect(ctx, x - 70, top - 4, 140, 16, 6, { fill: '#5B8DB8', lw: 4, seed: 1731 });
    for (const yy of [top + 40, top + 80]) G.line(ctx, [[x - 68, yy], [x + 68, yy]], { color: 'rgba(30,60,90,0.35)', lw: 3, seed: 1732 + yy, amp: 0.4 });
  }
  // 10 結尾卡
  function closing(ctx, t) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1920, [[0, '#F6E7C4'], [1, '#E6CC92']]));
    G.rays(ctx, 540, 1100, { n: 14, r0: 120, r1: 1500, color: '#FBF0D2', alpha: 0.8, spin: t * 0.04 });
    const a = popIn(t, ev.card, 0.4);
    ctx.save(); ctx.translate(510, 268); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -430, 0, 860, 690, { fill: '#FFFDF4', seed: 801 });
    label(ctx, '看到有人倒在裡面', 0, 124, 84, INK);
    if (t >= ev.card2) { ctx.save(); const b = popIn(t, ev.card2, 0.3); ctx.translate(0, 250); ctx.scale(b, b); label(ctx, '第一件事', 0, 0, 100, BROWN); ctx.restore(); }
    if (t >= ev.card3) { ctx.save(); const b = popIn(t, ev.card3, 0.3); ctx.translate(0, 400); ctx.scale(b, b); label(ctx, '不是衝進去', 0, 0, 122, RED); ctx.restore(); }
    if (t >= ev.small) {
      const b = clamp((t - ev.small) / 0.35);
      ctx.save(); ctx.globalAlpha *= b; ctx.translate(0, 22 * (1 - b));
      stroke(ctx, [[-360, 470], [360, 470]], 'rgba(58,42,32,0.35)', 4);
      label(ctx, '先通報、送新鮮空氣,', 0, 552, 50, '#5A4632');
      label(ctx, '等戴空氣呼吸器的人去救', 0, 626, 50, '#5A4632');
      ctx.restore();
    }
    ctx.restore();
    person(ctx, { x: 260, y: 1440, s: 0.82, pose: 'stand', style: CAST.master, seed: 440, eyes: 'normal', brows: 'neutral', mouth: 'flat', look: 0.4, crossArms: true, blink: blink(t, 0.6), blush: 0.3 });
    person(ctx, { x: 760, y: 1440, s: 0.8, pose: 'stand', style: CAST.shu, seed: 400, harness: {}, eyes: 'normal', brows: 'determined', mouth: 'flat', look: -0.4, blink: blink(t, 0.2), blush: 0.4 });
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(510, 1520); ctx.scale(b, b); label(ctx, '追蹤看更多現場故事', 0, 0, 64, '#FFFFFF', { stroke: INK, strokeW: 18 }); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: waiting, cam: Shots.push(1.0, 1.04) },
    { at: A[1] - 0.15, draw: torchShot, in: 'cut' },
    { at: ev.still, draw: panic, in: 'cut' },
    { at: A[2] - 0.15, draw: grabShot, in: 'cut' },
    { at: A[4] - 0.15, draw: talk, in: 'cut' },
    { at: A[5] - 0.15, draw: inside, in: 'fade' },
    { at: A[6] - 0.15, draw: radioShot, in: 'fade' },
    { at: ev.blower, draw: blowerShot, in: 'cut' },
    { at: A[7] - 0.15, draw: maskShot, in: 'cut' },
    { at: ev.back8, draw: descend, in: 'cut' },
    { at: A[8] - 0.15, draw: sitShot, in: 'fade' },
    { at: A[9] - 0.15, draw: closing, in: 'paper' },
  ]);

  // 字幕:每句依標點切成短句(頓號連著的短句併成一行),太長的在 CUT 指定的地方再切;
  // 時間用 prep-voice 量到的標點停頓(durations.js 的 PH),對不上的才照字數分
  const CUT = { '一隻手從後面把他整個人拉了回來': 6, '受過訓練的救援人員戴上空氣呼吸器': 9 };
  const MAXC = 10;
  function buildSubs(vo) {
    const out = [], PH = globalThis.PH || [];
    const clean = (s) => s.replace(/[,，。:：「」]/g, '').replace(/、$/, '').trim();
    ((vo && vo.lines) || []).forEach((l, i) => {
      const text = l.text, P = PH[i] || { on: 0, off: l.end - l.t, marks: [] };
      const segs = []; let c0 = 0;
      P.marks.forEach((mk) => { segs.push({ s: text.slice(c0, mk.c + 1), t1: mk.a }); c0 = mk.c + 1; });
      segs.push({ s: text.slice(c0), t1: P.off });
      segs.forEach((sg, k) => { sg.t0 = k === 0 ? P.on : P.marks[k - 1].b; });
      const merged = [];
      for (const sg of segs) { const g = merged[merged.length - 1]; if (g && /、$/.test(g.s) && clean(g.s + sg.s).length <= MAXC) { g.s += sg.s; g.t1 = sg.t1; } else merged.push({ ...sg }); }
      for (const g of merged) {
        const txt = clean(g.s), cut = CUT[txt], parts = cut ? [txt.slice(0, cut), txt.slice(cut)] : [txt];
        const tot = parts.reduce((a, p) => a + p.length, 0); let acc = 0;
        for (const p of parts) { const a0 = g.t0 + (g.t1 - g.t0) * acc / tot; acc += p.length; out.push({ t: l.t + a0, end: l.t + g.t0 + (g.t1 - g.t0) * acc / tot, text: p }); }
      }
    });
    for (let k = 0; k < out.length; k++) { const nx = out[k + 1]; out[k].end = nx ? (nx.t - out[k].end < 0.7 ? nx.t - 0.02 : Math.min(out[k].end + 0.3, nx.t - 0.05)) : out[k].end + 0.3; }
    return out;
  }

  Studio.film({
    post: { vignette: 0.22, grain: 0.04, paper: 0.35 },
    fadeOut: 0.9,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = buildSubs(VO); },
    draw(ctx, t) {
      film(ctx, t);
      if (t < A[9] - 0.1) Subs.draw(ctx, t, SUBS, { style: 'pop', size: 78, fam: CJK, highlight: '#FFD75E' });
    },
  });
})();
