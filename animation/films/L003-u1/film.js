// L003〈報價單上漏掉的那一行〉第 1 單元:開場鉤子 + 第 1 章「一個晚上的報價單」。
// 畫風、角色、背景、表格、字幕都來自 longform-kit.js(KIT);這裡只排這個單元的鏡頭。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { A, E, ev, when } = S;
  const { W, H, C, CAST } = KIT;
  const { label, popIn, blink, stroke, fill, lin } = KIT;
  let VO = null, CAPS = [];
  const mouth = (who, t, from) => KIT.mouth(VO, t, who, from);

  // ---------- 小工具 ----------
  // t0..t1 從 x0 走到 x1;其他時間站著
  function walkTo(t, t0, t1, x0, x1, s) {
    if (t <= t0) return { x: x0, pose: 'stand' };
    if (t >= t1) return { x: x1, pose: 'stand' };
    const x = lerp(x0, x1, (t - t0) / (t1 - t0));
    return { x, pose: 'walk', walk: (Math.abs(x - x0) / (300 * s)) % 1 };
  }
  const withTimes = (rows, tm) => rows.map((r) => ({ ...r, ...(tm[r.key] || {}) }));
  const DAY = { window: [110, 120, 500, 380], calendar: [930, 250], shelf: 1420 };
  const NIGHT = { ...DAY, night: true };
  // 手上拿的一張小紙(報價單)
  function heldPaper(ctx, x, y, s, rot, seed = 30) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -46, -62, 92, 124, 6, { fill: C.paper, lw: 3.5, seed });
    for (let k = 0; k < 4; k++) G.line(ctx, [[-30, -36 + k * 22], [k === 3 ? 4 : 30, -36 + k * 22]], { color: '#B8AE9A', lw: 4, seed: seed + 1 + k, amp: 0.3 });
    ctx.restore();
  }
  // 小圖示:彎頭、三通、球閥(70 × 70,置中)
  function fitting(ctx, kind, x, y, s = 1, seed = 60) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const pipe = (pts) => { G.limb(ctx, pts, { color: C.steel, lw: 22, outline: 4, seed: seed + pts.length }); };
    if (kind === 'elbow') { pipe([[-30, 26], [-30, -6], [-20, -22], [-4, -30], [30, -30]]); }
    else if (kind === 'tee') { pipe([[-34, -14], [34, -14]]); pipe([[0, -14], [0, 32]]); }
    else { pipe([[-34, 10], [34, 10]]); G.ellipse(ctx, 0, 10, 18, 18, { fill: '#C9CFD6', lw: 4, seed: seed + 5 }); G.rrect(ctx, -4, -30, 8, 32, 3, { fill: '#5C6470', lw: 3, seed: seed + 6 }); G.rrect(ctx, -4, -34, 40, 12, 5, { fill: C.red, lw: 3.5, seed: seed + 7 }); }
    ctx.restore();
  }
  // 虛線畫的高空作業車(「你的高空車」:報價單上沒有的東西)
  function ghostLift(ctx, x, y, s, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.setLineDash([16, 12]); ctx.lineDashOffset = -G.t * 30; ctx.strokeStyle = '#5C6470'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const seg = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
    ctx.strokeRect(-170, -80, 340, 56); seg([[-150, -80], [150, -260], [-150, -440], [150, -620]]); seg([[150, -80], [-150, -260], [150, -440], [-150, -620]]);
    ctx.strokeRect(-180, -650, 360, 30); seg([[-176, -650], [-176, -800], [176, -800], [176, -650]]);
    for (const wx of [-110, 110]) { ctx.beginPath(); ctx.arc(wx, -18, 26, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  // ===================================== 開場鉤子 =====================================
  // 1. 深夜,阿樹敲鍵盤;報價單印出來,蓋上大大的「得標」章
  const quoteFlight = (t) => {
    const u = ease.inOutCubic(clamp((t - ev.sheetUp) / 0.42));
    return { cx: lerp(1580, 1330, u), y: lerp(700, 150, u), s: lerp(0.22, 1, u) };
  };
  function hookNight(ctx, t) {
    KIT.bg.office(ctx, t, { ...NIGHT, clock: [1250, 186, 62, 23.6] });
    KIT.desk(ctx, 1380, 832, 420, { night: true, panel: false, seed: 300 });
    const out = clamp((t - ev.print) / 1.0), flying = t >= ev.sheetUp;
    KIT.printer(ctx, 1590, 808, 0.9, flying ? 0 : out, { night: true });
    const stamped = t >= ev.stamp + 0.1, looking = t >= ev.print + 0.2 && !stamped;
    KIT.officeChair(ctx, 760, 770, 1.4, { night: true });
    KIT.person(ctx, { x: 760, y: 770, s: 1.4, pose: 'sit', style: CAST.shu, seed: 400, gesture: stamped ? 'cheer' : 'typing',
      eyes: stamped ? 'happy' : 'normal', mouth: stamped ? 'grin' : 'smile', brows: stamped ? 'up' : 'determined', look: looking ? 0.95 : 0.1, lookY: looking ? 0 : 0.35, blink: blink(t, 0.1), blush: 0.6, shadow: false });
    KIT.desk(ctx, 380, 800, 880, { night: true });
    KIT.lamp(ctx, 470, 788, 0.95);
    KIT.keyboard(ctx, 760, 794, 1);
    KIT.monitor(ctx, 1030, 788, 1, { glow: 1 });
    if (flying) {
      const p = quoteFlight(t);
      KIT.table(ctx, t, { x: p.cx - 310, y: p.y, w: 620, title: '報價單', titleSize: 52, rows: KIT.L003.QUOTE, size: 42, rowH: 68, scale: p.s, seed: 610 });
      KIT.stamp(ctx, '得標', 1350, 420, t, ev.stamp, { size: 150, rot: -0.16 });
      if (t >= ev.stamp) for (let k = 0; k < 6; k++) { const b = popIn(t, ev.stamp + 0.05 + k * 0.04, 0.25) * clamp(1.6 - (t - ev.stamp)); KIT.sparkle(ctx, 1350 + Math.cos(k * 1.05 + 0.4) * 300, 420 + Math.sin(k * 1.05 + 0.4) * 190, 26, b, t * 2 + k); }
    }
    KIT.warm(ctx, { color: 'rgba(150,190,255,0.12)' });
  }
  // 2. 開工前會勘:陳師傅站在廠房中央仰頭,鏡頭跟著視線往上拉,管線高得離譜
  const TALL = { top: -1150, pipeY: -880, duct: -560, tray: -190 };
  function hookFab(ctx, t) {
    const tu = ease.inOutCubic(clamp((t - ev.tilt[0]) / (ev.tilt[1] - ev.tilt[0])));
    ctx.save(); ctx.translate(0, 1180 * tu);
    KIT.bg.fab(ctx, t, TALL);
    const look = t >= ev.lookUp, shuLook = t >= ev.lookUp + 0.45;
    const sw = walkTo(t, A[1] - 0.15, A[1] + 1.75, 360, 1150, 1.0), mw = walkTo(t, A[1] - 0.15, A[1] + 1.95, 80, 820, 1.0);
    const so = { ...sw, y: KIT.L.ground, s: 1.0, style: CAST.shuSite, seed: 400, handR: [70, -212], eyes: shuLook ? 'wide' : 'normal', mouth: shuLook ? 'o' : 'smile', brows: shuLook ? 'up' : 'neutral',
      look: shuLook ? -0.3 : -0.4, lookY: shuLook ? -1 : 0, blink: blink(t, 0.2), blush: 0.5 };
    KIT.person(ctx, so);
    const hp = KIT.world(so, 72, -200); heldPaper(ctx, hp[0] + 6, hp[1] - 20, 0.9, 0.1, 32);
    KIT.person(ctx, { ...mw, y: KIT.L.ground, s: 1.0, style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: 'flat', brows: look ? 'up' : 'neutral',
      look: look ? 0.05 : 0.3, lookY: look ? -1 : 0, headY: look ? -4 : 0, blink: blink(t, 0.6) });
    ctx.restore();
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.10)', floor: 0.2 });
  }
  // 3. 陳師傅對嘴特寫:「這麼高,你的高空車算在哪一行?」
  function hookAsk(ctx, t) {
    KIT.bg.fab(ctx, t);
    fill(ctx, -100, -100, W + 200, H + 200, 'rgba(226,233,238,0.42)'); // 背景往後推
    ghostLift(ctx, 1420, 900, 0.78, clamp((t - when(2, '高空車')) / 0.3));
    const m = mouth('master', t), up = clamp((t - A[2] + 0.05) / 0.22) * (1 - clamp((t - (A[2] + 1.05)) / 0.3));
    const o = { x: 640, y: 1560, s: 2.2, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: m || 'flat', brows: 'neutral', look: 0.45, blink: blink(t, 0.6), shadow: false };
    if (up > 0) { o.gesture = 'pointUp'; o.handR = [lerp(92, 118, up), lerp(-180, -497, up)]; }
    KIT.person(ctx, o);
    const tq = when(2, '哪一行') + 0.2;
    if (t >= tq) { const a = popIn(t, tq, 0.3); ctx.save(); ctx.translate(1430, 300); ctx.scale(a, a); ctx.rotate(-0.06 + Math.sin(t * 5) * 0.03); label(ctx, '?', 0, 70, 230, C.red, { stroke: '#FFFFFF', strokeW: 28 }); ctx.restore(); }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }
  // 3b. 阿樹手上的報價單:「利潤」那一格的數字啪一聲碎掉
  const QX = 560, QY = 110;
  function hookInsert(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, 0, H, [[0, '#AFBCC6'], [1, '#D3DBE1']]));
    for (let k = 0; k < 4; k++) fill(ctx, -100, 40 + k * 56, W + 200, 30, `rgba(255,255,255,${0.18 - k * 0.03})`); // 模糊的管線
    const tremble = t >= ev.shatter ? Math.sin(t * 38) * 4 * clamp(1 - (t - ev.shatter) / 1.2) : 0;
    ctx.save(); ctx.translate(tremble, 0);
    // 手掌在紙後面
    for (const [hx, ax] of [[QX + 40, 330], [QX + 760, 1590]]) { G.limb(ctx, [[ax, 1180], [hx, 720]], { color: C.skin, lw: 74, seed: 40 + ax }); G.ellipse(ctx, hx, 676, 58, 50, { fill: C.skin, lw: 4.5, seed: 44 + ax }); }
    const T = KIT.table(ctx, t, { x: QX, y: QY, w: 800, title: '報價單', titleSize: 56, size: 50, rowH: 84, seed: 610,
      rows: withTimes(KIT.L003.QUOTE, { fee: { cells: ['管理費與利潤', ''], hi: ev.insert + 0.2, hiColor: '#FFE9A0' } }) });
    const r = T.rows[2], vx = QX + r.cx[1], vy = QY + r.base;
    KIT.shatter(ctx, '20,000', vx, vy, t, ev.shatter, { size: 50, crack: ev.shatter - ev.crack, seed: 7 });
    if (t >= ev.shatter) KIT.burst(ctx, vx - 80, vy - 18, 70 + (t - ev.shatter) * 260, 110 + (t - ev.shatter) * 300, clamp(1 - (t - ev.shatter) / 0.3), 10, C.red, 7);
    if (t >= ev.shatter + 0.3) { // 空掉的那一格
      const a = clamp((t - ev.shatter - 0.3) / 0.25), fl = 0.65 + 0.35 * Math.sin(t * 8);
      ctx.save(); ctx.globalAlpha *= a * fl; ctx.setLineDash([14, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(vx - 230, vy - 56, 236, 74); ctx.restore();
      ctx.save(); ctx.globalAlpha *= a; label(ctx, '?', vx - 112, vy + 2, 60, C.red); ctx.restore();
    }
    // 大拇指在紙前面
    for (const hx of [QX + 40, QX + 760]) G.ellipse(ctx, hx + (hx < 960 ? 22 : -22), 646, 22, 34, { fill: C.skin, lw: 4, seed: 48 + hx });
    ctx.restore();
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }
  // 4. 片名卡〈報價單上漏掉的那一行〉
  function titleCard(ctx, t) {
    fill(ctx, -300, -300, W + 600, H + 600, lin(ctx, 0, 0, 0, H, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 960, 470, { n: 20, r0: 160, r1: 1500, color: '#FCEFCB', alpha: 0.85, spin: t * 0.04 });
    const a = popIn(t, ev.title + 0.05, 0.4);
    ctx.save(); ctx.translate(960, 330); ctx.scale(a, a); ctx.rotate(-0.012);
    KIT.card(ctx, -760, -190, 1520, 300, { seed: 980, tape: true });
    label(ctx, '工程現場故事', 0, -96, 46, C.muted);
    label(ctx, '〈報價單上漏掉的那一行〉', 0, 40, 100, C.ink);
    ctx.restore();
    // 一張少了一行的單子:第二行是紅色虛線的空格
    const b = popIn(t, ev.title + 0.35, 0.35), tc = when(3, '重算一次');
    ctx.save(); ctx.translate(960, 560); ctx.scale(b, b); ctx.rotate(0.015);
    KIT.card(ctx, -330, 0, 660, 300, { seed: 985 });
    for (const [yy, w] of [[70, 420], [230, 360]]) { G.rrect(ctx, -270, yy - 16, 130, 32, 14, { fill: '#D8CDB4', lw: 0, seed: 986 + yy }); G.rrect(ctx, 270 - w * 0.45, yy - 16, w * 0.45, 32, 14, { fill: '#C9BC9E', lw: 0, seed: 988 + yy }); }
    const fl = 0.6 + 0.4 * Math.sin(t * 7);
    ctx.save(); ctx.globalAlpha *= fl; ctx.setLineDash([16, 11]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.strokeRect(-290, 112, 580, 76); ctx.restore();
    label(ctx, '?', 0, 172, 64, C.red);
    if (t >= tc) { const u = ease.outCubic(clamp((t - tc) / 0.6)), pts = []; for (let k = 0; k <= 40; k++) { const an = -Math.PI * 0.95 + k / 40 * Math.PI * 2.05 * u; pts.push([Math.cos(an) * 340, 150 + Math.sin(an) * 62]); } stroke(ctx, pts, 'rgba(200,69,47,0.85)', 8); }
    ctx.restore();
  }

  // ===================================== 第 1 章 =====================================
  // 5a. 小辦公室:老闆把一張圖丟到阿樹桌上
  const LAND = [700, 796];
  function planMini(ctx, x, y, s, rot, flat = 1, seed = 70) { // 一張平面圖(小)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s * flat);
    G.rrect(ctx, -110, -76, 220, 152, 6, { fill: '#EEF4F8', lw: 4, seed });
    for (let k = 1; k < 5; k++) G.line(ctx, [[-110 + k * 44, -72], [-110 + k * 44, 72]], { color: '#CFE0EA', lw: 2, seed: seed + k, amp: 0.2 });
    stroke(ctx, [[-84, -46], [24, -46], [24, 40], [80, 40]], C.pipe, 9);
    ctx.restore();
  }
  function office5(ctx, t) {
    KIT.bg.office(ctx, t, { ...DAY, clock: [1250, 186, 62, 16.0] });
    const tb = when(4, '老闆'), tossU = clamp((t - (ev.toss - 0.32)) / 0.32), back = clamp((t - ev.toss - 0.15) / 0.45);
    const fly = clamp((t - ev.toss) / 0.55), landed = t >= ev.toss + 0.55;
    const bw = walkTo(t, tb - 1.1, tb + 0.15, 2060, 1490, 1.1);
    KIT.officeChair(ctx, 700, 780, 1.35);
    KIT.person(ctx, { x: 700, y: 780, s: 1.35, pose: 'sit', style: CAST.shu, seed: 400, gesture: t < tb - 0.2 ? 'typing' : null,
      eyes: landed ? 'wide' : 'normal', mouth: landed ? 'o' : 'smile', brows: landed ? 'up' : 'neutral', look: t > tb - 0.4 && !landed ? 0.85 : landed ? 0 : 0.2, lookY: landed ? 0.8 : 0.1, blink: blink(t, 0.1), blush: 0.6, shadow: false });
    KIT.desk(ctx, 320, 810, 860);
    KIT.keyboard(ctx, 700, 806, 1);
    KIT.monitor(ctx, 1010, 796, 1);
    // 老闆:走進來,丟圖
    const BS = 1.1, bx = bw.x, by = 880;
    const hr = t < ev.toss - 0.32 ? [92, -180] : t < ev.toss ? [lerp(92, -40, tossU), lerp(-180, -400, tossU)] : [lerp(210, 92, back), lerp(-300, -180, back)];
    const bo = { ...bw, x: bx, y: by, s: BS, sx: -1, style: CAST.boss, seed: 470, handR: hr, eyes: 'normal', mouth: t > ev.toss ? 'smirk' : 'smile', look: 0.7, blink: blink(t, 0.45) };
    KIT.person(ctx, bo);
    if (t < ev.toss) { const p = KIT.world(bo, hr[0], hr[1]); planMini(ctx, p[0], p[1] - 30, 0.8, -0.3 + tossU * 0.6, 1, 71); }
    else {
      const p0 = KIT.world(bo, 210, -300), u = ease.outQuad(fly);
      const x = lerp(p0[0], LAND[0] + 60, u), y = lerp(p0[1], LAND[1], u) - Math.sin(Math.PI * u) * 140;
      const slide = landed ? ease.outCubic(clamp((t - ev.toss - 0.55) / 0.4)) : 0;
      planMini(ctx, x - slide * 60, y, 0.85, landed ? -0.05 : fly * 7, landed ? 0.42 : 0.55 + 0.45 * Math.cos(fly * 9), 71);
    }
    KIT.warm(ctx);
  }
  // 5b. 平面圖:藍色管線繞過幾台機器,圖角標註「2" 不鏽鋼管・氬焊」
  const ROUTE = [[250, 230], [1060, 230], [1060, 790], [1470, 790]];
  const MACH = [[300, 330, 300, 220], [680, 330, 300, 220], [300, 610, 300, 180], [680, 610, 300, 180], [1150, 330, 270, 300], [1510, 330, 270, 300]];
  function planShot(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, '#B9C6CF');
    KIT.card(ctx, 60, 40, 1800, 850, { fill: '#F3F7FA', seed: 990 });
    ctx.save(); ctx.beginPath(); ctx.rect(70, 50, 1780, 830); ctx.clip();
    for (let x = 120; x < 1860; x += 60) G.line(ctx, [[x, 50], [x, 880]], { color: '#DCE8F0', lw: 2, seed: 991 + x, amp: 0.2 });
    for (let y = 80; y < 880; y += 60) G.line(ctx, [[70, y], [1850, y]], { color: '#DCE8F0', lw: 2, seed: 992 + y, amp: 0.2 });
    ctx.restore();
    MACH.forEach(([x, y, w, h], k) => { G.rrect(ctx, x, y, w, h, 8, { fill: '#E4EAF0', lw: 4, seed: 1000 + k, hatch: { color: 'rgba(60,80,110,0.12)', gap: 12 } }); stroke(ctx, [[x + 30, y + 30], [x + w - 30, y + h - 30]], '#9AA8B6', 3); stroke(ctx, [[x + w - 30, y + 30], [x + 30, y + h - 30]], '#9AA8B6', 3); });
    stroke(ctx, [[60, 230], [ROUTE[0][0] - 20, 230]], '#8E99A3', 16); // 既有的接點
    G.ellipse(ctx, ROUTE[0][0] - 8, 230, 18, 18, { fill: '#FFFFFF', lw: 5, seed: 1010 });
    const u = ease.inOutQuad(clamp((t - ev.route[0]) / (ev.route[1] - ev.route[0])));
    const pts = KIT.partial(ROUTE, u);
    stroke(ctx, pts, '#1D4E86', 20); stroke(ctx, pts, C.pipe, 12);
    if (u >= 1) for (let k = 0; k < 14; k++) { // 壓縮空氣往前走
      const q = ((t * 0.35 + k / 14) % 1), seg = KIT.partial(ROUTE, q), p = seg[seg.length - 1], p2 = seg.length > 1 ? seg[seg.length - 2] : ROUTE[0], an = Math.atan2(p[1] - p2[1], p[0] - p2[0]);
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(an); stroke(ctx, [[-8, -8], [2, 0], [-8, 8]], '#FFFFFF', 4, 0.9); ctx.restore();
    }
    if (t >= ev.weld) { // 焊接點
      const L = [[250, 230], [520, 230], [790, 230], [1060, 230], [1060, 510], [1060, 790], [1265, 790], [1470, 790]];
      L.forEach(([x, y], k) => { const a = popIn(t, ev.weld + k * 0.11, 0.25); if (a > 0) G.ellipse(ctx, x, y, 15 * a, 15 * a, { fill: C.orange, lw: 4, seed: 1020 + k }); });
    }
    // 圖角標註
    const sa = popIn(t, ev.spec, 0.3), glow = clamp((t - ev.weld) / 0.3) * (0.6 + 0.4 * Math.sin(t * 6));
    ctx.save(); ctx.translate(1580, 125); ctx.scale(0.85 + 0.15 * sa, 0.85 + 0.15 * sa);
    G.rrect(ctx, -250, -60, 500, 120, 6, { fill: '#FFFFFF', lw: 5, seed: 1030 });
    stroke(ctx, [[-250, -60], [-250, 60]], C.ink, 5);
    if (glow > 0) { ctx.save(); ctx.globalAlpha *= glow; ctx.fillStyle = 'rgba(255,214,80,0.55)'; ctx.fillRect(90, -40, 140, 80); ctx.restore(); }
    label(ctx, '2" 不鏽鋼管・氬焊', 0, 18, 50, sa > 0 ? C.blue : '#9AA8B6');
    ctx.restore();
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.18 });
  }
  // 6. 阿樹:「報價喔?我來!一個晚上就好。」拍胸脯、眼睛發亮;牆上時鐘快轉到半夜
  function ready(ctx, t) {
    const k = ease.inOutCubic(clamp((t - ev.clock[0]) / (ev.clock[1] - ev.clock[0])));
    KIT.bg.office(ctx, t, DAY);
    if (k > 0) { ctx.save(); ctx.globalAlpha = k; KIT.bg.office(ctx, t, NIGHT); ctx.restore(); }
    KIT.wallClock(ctx, 1250, 186, 62, lerp(17.0, 24.0, k), { night: k > 0.5 });
    if (k > 0 && k < 1) KIT.burst(ctx, 1250, 186, 76, 100, Math.sin(Math.PI * k), 12, '#FFFFFF', 5, t * 4);
    const m = mouth('shu', t), seated = t >= ev.clock[0];
    if (!seated) {
      const thump = clamp(1 - Math.abs(t - ev.chest - 0.1) / 0.3), spark = t >= ev.sparkle;
      KIT.officeChair(ctx, 760, 800, 1.35);
      const o = { x: 760, y: 1010, s: 1.42, pose: 'stand', style: CAST.shu, seed: 400, gesture: spark ? 'thumbsUp' : null, eyes: spark ? 'wide' : t >= ev.chest ? 'happy' : 'wide', mouth: m || 'grin', brows: 'up', look: 0.2, blink: spark ? 0 : blink(t, 0.1), blush: 0.75 };
      if (thump > 0 && !spark) o.handR = [lerp(92, 22, thump), lerp(-180, -250, thump)];
      KIT.person(ctx, o);
      if (thump > 0.6) KIT.burst(ctx, 760 + 40, 1010 - 1.42 * 250, 60, 90, thump, 6, C.ink, 5, 0.9);
      if (spark) { const hp = KIT.headPos(o); [[-37, -8], [37, -8]].forEach(([dx, dy], j) => KIT.sparkle(ctx, hp[0] + dx * 1.42, hp[1] + dy * 1.42, 22, popIn(t, ev.sparkle + j * 0.06, 0.25), t * 3 + j, '#FFF7C0')); for (let j = 0; j < 4; j++) KIT.sparkle(ctx, hp[0] + [-170, 170, -140, 150][j], hp[1] + [-90, -110, 60, 40][j], 20, popIn(t, ev.sparkle + 0.1 + j * 0.07, 0.25), t * 2 + j); }
    } else { // 時間快轉:坐下來一直打字
      KIT.officeChair(ctx, 760, 800, 1.35, { night: k > 0.5 });
      KIT.person(ctx, { x: 760, y: 800, s: 1.35, pose: 'sit', style: CAST.shu, seed: 400, gesture: 'typing', eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.3, lookY: 0.3, blush: 0.6, shadow: false });
    }
    KIT.desk(ctx, 380, 840, 800, { night: k > 0.5 });
    KIT.keyboard(ctx, 760, 836, 1);
    KIT.monitor(ctx, 1040, 826, 1, { glow: k });
    planMini(ctx, 560, 828, 0.85, -0.05, 0.42, 71);
    // 老闆抱胸看著(時間快轉時走掉)
    const gone = clamp((t - ev.clock[0]) / 0.4);
    if (gone < 1) { ctx.save(); ctx.globalAlpha *= 1 - gone; KIT.person(ctx, { x: 1490, y: 880, s: 1.1, sx: -1, pose: 'stand', style: CAST.boss, seed: 470, crossArms: true, eyes: 'normal', mouth: 'smirk', brows: 'up', look: 0.7, blink: blink(t, 0.45) }); ctx.restore(); }
    KIT.warm(ctx, { color: k > 0.5 ? 'rgba(150,190,255,0.12)' : 'rgba(255,214,140,0.16)' });
  }
  // 7–10. 深夜:阿樹算報價,畫面右側【表 1】一行一行長出來
  const TB = KIT.L.table;
  function nightDesk(ctx, t) {
    KIT.bg.office(ctx, t, NIGHT);
    const onPhone = t >= ev.phone && t < ev.close + 0.15, total = t >= ev.total;
    KIT.officeChair(ctx, 400, 790, 1.3, { night: true });
    KIT.person(ctx, { x: 400, y: 790, s: 1.3, pose: 'sit', style: CAST.shu, seed: 400, gesture: onPhone ? 'phone' : 'typing',
      eyes: total ? 'happy' : t >= ev.hl[2] && onPhone ? 'wide' : 'normal', mouth: total ? 'grin' : t >= ev.hl[2] && onPhone ? 'o' : 'smile', brows: total ? 'up' : 'determined',
      look: onPhone ? 0.2 : 0.8, lookY: onPhone ? 0.8 : 0.1, blink: blink(t, 0.1), blush: 0.6, shadow: false });
    KIT.desk(ctx, 70, 820, 820, { night: true });
    KIT.lamp(ctx, 150, 808, 0.9);
    KIT.keyboard(ctx, 400, 816, 0.95);
    KIT.monitor(ctx, 680, 808, 0.95, { glow: 0.9 });
    // 【表 1】
    KIT.table(ctx, t, { ...TB, at: ev.table, title: KIT.L003.TABLE1_TITLE, head: ['項目', '金額'], grow: true, seed: 700,
      rows: withTimes(KIT.L003.TABLE1, {
        mat: { at: ev.mat, hi: [ev.mat, ev.wage] }, wage: { at: ev.wage, hi: [ev.wage, ev.sub] }, sub: { at: ev.sub, hi: [ev.sub, ev.fee] },
        fee: { at: ev.fee, hi: [ev.fee, ev.net], cells: ['管理費與利潤 10%', (tt) => (tt >= ev.feeV ? '20,000' : '')] },
        net: { at: ev.net, hi: [ev.net, ev.tax] }, tax: { at: ev.tax, hi: [ev.tax, ev.total] }, total: { at: ev.total, hi: ev.total, big: ev.big },
      }) });
    // 第 7 句:算材料的草稿紙(管子 90 m × 1,000 = 90,000;彎頭、三通、閥件 = 30,000),念到「材料十二萬」飛進表裡
    const n0 = ev.pipe[0] - 0.15, fly = clamp((t - ev.mat) / 0.4);
    if (t >= n0 && fly < 1) {
      const a = popIn(t, n0, 0.3), f = ease.inCubic(fly);
      ctx.save(); ctx.translate(lerp(800, 1180, f), lerp(150, 330, f)); ctx.scale(a * (1 - 0.8 * f), a * (1 - 0.8 * f)); ctx.globalAlpha *= 1 - f; ctx.rotate(-0.02);
      KIT.card(ctx, -210, 0, 420, 480, { fill: C.cream, seed: 720, tape: true });
      const line = (str, y, at, col = C.ink, fam = KIT.CJK) => { if (t >= at) { ctx.save(); ctx.globalAlpha *= clamp((t - at) / 0.2); G.text(ctx, str, -170, y, { size: 48, fam, weight: 800, color: col, boil: 0 }); ctx.restore(); } };
      line('管子 90 m', 84, ev.pipe[0]); line('× 1,000', 148, ev.pipe[1], C.ink, KIT.NUM); line('= 90,000', 212, ev.pipe[2], C.blue, KIT.NUM);
      stroke(ctx, [[-180, 240], [180, 240]], '#D8CDB4', 3);
      ['elbow', 'tee', 'valve'].forEach((kd, j) => { const b = popIn(t, ev.fit[j], 0.25); if (b > 0) { fitting(ctx, kd, -118 + j * 118, 300, b, 730 + j * 10); ctx.save(); ctx.globalAlpha *= clamp((t - ev.fit[j]) / 0.2); label(ctx, ['彎頭', '三通', '閥件'][j], -118 + j * 118, 382, 36, C.muted); ctx.restore(); } });
      line('= 30,000', 450, ev.fit[3], C.blue, KIT.NUM);
      ctx.restore();
    }
    // 第 8 句:滑手機,班長的那一則報價訊息;只看了中間的金額就蓋上
    if (t >= ev.phone && t < ev.close + 0.25) {
      const a = popIn(t, ev.phone + 0.05, 0.3), close = ease.inCubic(clamp((t - ev.close) / 0.22));
      ctx.save(); ctx.translate(800, 500); ctx.scale(a, a * (1 - close)); ctx.translate(-800, -500);
      KIT.phone(ctx, 800, 500, 430, 740, (c, w, h) => KIT.chat(c, w, h, t, { title: '班長', msgs: [{ ...KIT.L003.SHU_ASK, at: ev.phone + 0.5 }, { ...KIT.L003.CREW_QUOTE, at: ev.reply }], hi: { '1.1': ev.hl[0], '1.2': ev.hl[1], '1.3': ev.hl[2] } }));
      ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(150,190,255,0.12)' });
  }
  // 11. 阿樹:「材料、工資、利潤、稅,都有了。完美。」伸懶腰,按下寄出
  function sendShot(ctx, t) {
    KIT.bg.office(ctx, t, NIGHT);
    const stretch = t >= ev.stretch && t < ev.send - 0.1, sent = t >= ev.send, m = mouth('shu', t);
    KIT.officeChair(ctx, 600, 800, 1.5, { night: true });
    const o = { x: 600, y: 800, s: 1.5, pose: 'sit', style: CAST.shu, seed: 400, gesture: stretch ? 'cheer' : sent ? null : 'typing', rot: stretch ? -0.05 : 0,
      eyes: stretch ? 'closed' : 'happy', mouth: m || (sent ? 'grin' : 'smile'), brows: 'up', look: 0.6, lookY: 0.2, blink: 0, blush: 0.7, shadow: false };
    if (sent) o.handR = KIT.hand(600, 800, 1.5, 1, 860 + Math.sin(Math.min(t - ev.send, 0.3) * 20) * 4, 820);
    KIT.person(ctx, o);
    KIT.desk(ctx, 200, 840, 920, { night: true });
    KIT.keyboard(ctx, 600, 836, 1);
    G.ellipse(ctx, 870, 832, 26, 14, { fill: '#D9DEE3', lw: 3.5, seed: 1100 }); // 滑鼠
    KIT.monitor(ctx, 920, 826, 1, { glow: 1 });
    // 想法泡泡裡的清單:念到哪一項就勾哪一項
    const ckA = ev.ticks[0] - 0.25;
    KIT.bubble(ctx, t, { x: 1390, y: 470, w: 560, h: 470, think: true, tail: [770, 360], t0: ckA, content: (c) => {
      KIT.checklist(c, t, { x: 70, y: 20, w: 420, card: false, size: 60, rowH: 100, box: 52, items: ['材料', '工資', '利潤', '稅'].map((s, k) => ({ text: s, check: ev.ticks[k] })) });
      if (t >= ev.allDone) { const b = popIn(t, ev.allDone, 0.3); c.save(); c.translate(440, 400); c.scale(b, b); c.rotate(-0.15); label(c, 'OK', 0, 20, 64, C.green, { stroke: '#FFFFFF', strokeW: 12, fam: KIT.NUM }); c.restore(); }
    } });
    if (sent) { // 信封飛出去
      const u = clamp((t - ev.send) / 0.7), e = ease.inCubic(u);
      if (u < 1) { KIT.envelope(ctx, lerp(920, 2050, e), lerp(640, 300, e) - Math.sin(Math.PI * u) * 80, 1.1, -0.2 * u); for (let k = 0; k < 3; k++) stroke(ctx, [[lerp(920, 2050, e) - 100 - k * 40, lerp(640, 300, e) + 20 + k * 20], [lerp(920, 2050, e) - 180 - k * 40, lerp(640, 300, e) + 40 + k * 20]], '#FFFFFF', 6, 0.8 * (1 - u)); }
      const pa = popIn(t, ev.send + 0.2, 0.3) * (1 - clamp((t - ev.send - 1.6) / 0.3));
      if (pa > 0) { ctx.save(); ctx.translate(920, 470); ctx.scale(pa, pa); G.rrect(ctx, -130, -42, 260, 84, 42, { fill: C.green, lw: 4, seed: 1110 }); label(ctx, '已寄出 ✓', 0, 16, 44, '#FFFFFF'); ctx.restore(); }
    }
    KIT.warm(ctx, { color: 'rgba(150,190,255,0.12)' });
  }
  // 12. 甲方辦公室:承辦把三份報價單攤開;阿樹那份只有一頁
  function fanSheets(ctx, x, y, open, seed) {
    [-1, 0, 1].forEach((k) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * 0.34 * open);
      G.rrect(ctx, -66, -176, 132, 176, 6, { fill: k === 0 ? '#FFFDF4' : '#F6F2E6', lw: 4, seed: seed + k });
      for (let j = 0; j < 5; j++) G.line(ctx, [[-46, -150 + j * 26], [j === 4 ? 0 : 46, -150 + j * 26]], { color: '#B8AE9A', lw: 4, seed: seed + 10 + j + k * 7, amp: 0.3 });
      ctx.restore();
    });
  }
  function client(ctx, t, mode) {
    KIT.bg.clientOffice(ctx, t);
    const m = mouth('client', t), deal = mode === 'deal';
    const open = ease.outBack(clamp((t - ev.spread) / 0.35));
    const co = { x: 640, y: 860, s: 1.25, pose: 'stand', style: CAST.client, seed: 480, mouth: m || 'smile', eyes: deal && t > ev.deal + 0.5 ? 'happy' : 'normal', brows: 'neutral', look: 0.75, blink: blink(t, 0.45) };
    if (deal) co.gesture = t >= ev.deal + 0.15 ? 'thumbsUp' : null;
    else { co.handL = [-46, -322 + 120]; co.handR = [46, -322 + 120]; }
    KIT.person(ctx, co);
    if (!deal) fanSheets(ctx, 640, 700, open, 1200);
    KIT.desk(ctx, 260, 760, 760, { color: '#E9E4D8', seed: 1210 });
    const happy = deal && t > ev.deal + 0.3;
    KIT.person(ctx, { x: 1400, y: 870, s: 1.2, sx: -1, pose: 'stand', style: CAST.shu, seed: 400, eyes: happy ? 'happy' : 'normal', mouth: happy ? 'grin' : 'smile', brows: 'up', look: 0.75, blink: blink(t, 0.1), blush: happy ? 0.9 : 0.6, gesture: happy && t > ev.deal + 0.8 ? 'cheer' : null });
    KIT.warm(ctx, { color: 'rgba(255,230,190,0.12)' });
  }
  // 俯看桌面:三份報價單。阿樹那份只有一頁,另外兩份都多一頁密密麻麻的備註
  function sheetTop(ctx, x, y, w, h, seed, { total = false, notes = false } = {}) {
    if (notes) { // 第二頁:備註
      ctx.save(); ctx.translate(x + 56, y + 70); ctx.rotate(0.05);
      G.rrect(ctx, 0, 0, w, h, 6, { fill: '#FBF8EE', lw: 4, seed: seed + 50 });
      label(ctx, '備註', 70, 66, 42, C.ink);
      for (let j = 0; j < 13; j++) G.line(ctx, [[30, 108 + j * 31], [w - 30 - (j % 4) * 26, 108 + j * 31]], { color: '#8E8576', lw: 4, seed: seed + 60 + j, amp: 0.5 });
      ctx.restore();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(notes ? -0.02 : 0.01);
    G.rrect(ctx, 0, 0, w, h, 6, { fill: '#FFFDF4', lw: 4, seed });
    label(ctx, '報價單', w / 2, 70, 46, C.ink);
    stroke(ctx, [[30, 96], [w - 30, 96]], C.ink, 3);
    for (let j = 0; j < 5; j++) { G.line(ctx, [[34, 146 + j * 54], [130, 146 + j * 54]], { color: '#B8AE9A', lw: 6, seed: seed + 10 + j, amp: 0.3 }); G.line(ctx, [[w - 150, 146 + j * 54], [w - 34, 146 + j * 54]], { color: '#B8AE9A', lw: 6, seed: seed + 20 + j, amp: 0.3 }); }
    if (total) { stroke(ctx, [[30, h - 96], [w - 30, h - 96]], C.ink, 3); G.text(ctx, '含稅', 34, h - 36, { size: 40, fam: KIT.CJK, weight: 800, color: C.ink, boil: 0 }); G.text(ctx, '231,000', w - 30, h - 36, { size: 46, fam: KIT.NUM, weight: 800, color: C.red, align: 'right', boil: 0 }); }
    else { stroke(ctx, [[30, h - 96], [w - 30, h - 96]], C.ink, 3); G.line(ctx, [[34, h - 50], [120, h - 50]], { color: '#B8AE9A', lw: 6, seed: seed + 30, amp: 0.3 }); G.line(ctx, [[w - 170, h - 50], [w - 34, h - 50]], { color: '#B8AE9A', lw: 6, seed: seed + 31, amp: 0.3 }); }
    ctx.restore();
  }
  function topDown(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, W, H, [[0, '#D9C3A0'], [1, '#C7AC84']]));
    for (let k = 0; k < 14; k++) G.line(ctx, [[-40, 40 + k * 80 + Math.sin(k) * 10], [W + 40, 60 + k * 80 - Math.cos(k) * 12]], { color: 'rgba(150,110,70,0.25)', lw: 4, seed: 1300 + k, amp: 3 }); // 木紋
    sheetTop(ctx, 110, 130, 420, 600, 1310, { notes: true });
    sheetTop(ctx, 1290, 130, 420, 600, 1330, { notes: true });
    sheetTop(ctx, 750, 160, 420, 600, 1350, { total: true });
    // 阿樹那份:黃色便利貼
    ctx.save(); ctx.translate(1130, 190); ctx.rotate(0.12); G.rrect(ctx, -70, -40, 140, 80, 4, { fill: '#FFE27A', lw: 3.5, seed: 1360 }); label(ctx, '阿樹', 0, 14, 40, C.ink); ctx.restore();
    // 承辦的手點在阿樹那份上
    const tap = Math.abs(Math.sin(clamp((t - ev.tap) / 0.28) * Math.PI)) * 18 * (t >= ev.tap && t < ev.tap + 0.56 ? 1 : 0), hx = 1050, hy = 520 - tap;
    G.limb(ctx, [[1230, -60], [1150, 260], [hx + 20, hy - 70]], { color: CAST.client.robe, lw: 70, seed: 1370 });
    G.ellipse(ctx, hx + 10, hy - 30, 44, 40, { fill: CAST.client.skin, lw: 4.5, seed: 1371 });
    G.limb(ctx, [[hx + 4, hy - 20], [hx - 14, hy + 30]], { color: CAST.client.skin, lw: 18, outline: 4, seed: 1372 });
    if (t >= ev.tap) { const g = clamp((t - ev.tap) / 0.3); ctx.save(); ctx.globalAlpha *= g * (0.65 + 0.35 * Math.sin(t * 6)); ctx.strokeStyle = '#F0A800'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(762, 650, 396, 98, 18); ctx.stroke(); ctx.restore(); }
    KIT.warm(ctx, { color: 'rgba(255,230,190,0.10)' });
  }
  // 13. 「價錢也最漂亮」幾個字在阿樹頭上繞圈發光,阿樹頭上冒出小皇冠
  const RING = '價錢也最漂亮';
  function crownShot(ctx, t) {
    KIT.bg.clientOffice(ctx, t);
    fill(ctx, -100, -100, W + 200, H + 200, 'rgba(255,214,120,0.30)');
    G.rays(ctx, 960, 470, { n: 22, r0: 220, r1: 1500, color: '#FFF2C8', alpha: 0.6, spin: t * 0.06 });
    const o = { x: 960, y: 1390, s: 2.0, pose: 'stand', style: CAST.shu, seed: 400, eyes: 'happy', mouth: 'grin', brows: 'up', blush: 1, look: 0, shadow: false };
    const ra = clamp((t - ev.orbit - 0.2) / 0.5), th0 = -(t - ev.orbit) * 0.9;
    const ringChars = [...RING].map((ch, k) => { const th = th0 - k * (Math.PI * 2 / RING.length); return { ch, x: 960 + Math.cos(th) * 380, y: 262 + Math.sin(th) * 58, front: Math.sin(th) > 0, d: Math.sin(th) }; });
    const drawRing = (front) => ringChars.filter((c) => c.front === front).forEach((c) => {
      ctx.save(); ctx.globalAlpha *= ra * (front ? 1 : 0.55); ctx.shadowColor = 'rgba(255,200,60,0.9)'; ctx.shadowBlur = 22;
      ctx.translate(c.x, c.y); const k = 1 + 0.18 * c.d; ctx.scale(k, k);
      label(ctx, c.ch, 0, 24, 66, '#C8860A', { stroke: '#FFF6D6', strokeW: 12 });
      ctx.restore();
    });
    drawRing(false);
    KIT.person(ctx, o);
    const hp = KIT.headPos(o), cu = popIn(t, ev.crown, 0.35);
    if (cu > 0) { KIT.crown(ctx, hp[0] + 4, hp[1] - 150 - 20 * (1 - Math.min(1, cu)), 0.95 * cu, { rot: -0.08 + Math.sin(t * 3) * 0.03 }); for (let j = 0; j < 5; j++) KIT.sparkle(ctx, hp[0] + [-130, 130, -170, 170, 0][j], hp[1] - [150, 170, 60, 80, 250][j], 22, popIn(t, ev.crown + 0.1 + j * 0.06, 0.25) * (0.7 + 0.3 * Math.sin(t * 5 + j)), t * 2 + j); }
    drawRing(true);
    KIT.warm(ctx, { color: 'rgba(255,220,150,0.18)' });
  }

  const film = Shots.film([
    { at: 0, draw: hookNight, cam: Shots.combine(Shots.push(1.0, 1.04), Shots.shake(16, ev.stamp, 7)) },
    { at: A[1] - 0.15, draw: hookFab, in: 'paper' },
    { at: A[2] - 0.12, draw: hookAsk, in: 'cut', cam: Shots.push(1.0, 1.035) },
    { at: ev.insert, draw: hookInsert, in: 'cut', cam: Shots.shake(18, ev.shatter, 6) },
    { at: A[3] - 0.15, draw: titleCard, in: 'flash' },
    { at: ev.ch1, draw: (ctx, t) => KIT.chapterCard(ctx, t, ev.ch1, { n: 1, title: '一個晚上的報價單' }), in: 'cut' },
    { at: ev.ch1 + S.CHAPTER, draw: office5, in: 'cut', cam: Shots.push(1.0, 1.035) },
    { at: ev.plan, draw: planShot, in: 'zoom', cam: Shots.push(1.0, 1.03) },
    { at: A[5] - 0.15, draw: ready, in: 'cut' },
    { at: A[6] - 0.15, draw: nightDesk, in: 'cut' },
    { at: A[10] - 0.15, draw: sendShot, in: 'cut', cam: Shots.push(1.0, 1.03) },
    { at: A[11] - 0.15, draw: (ctx, t) => client(ctx, t, 'fan'), in: 'paper' },
    { at: ev.top, draw: topDown, in: 'cut', cam: Shots.push(1.0, 1.04) },
    { at: ev.deal, draw: (ctx, t) => client(ctx, t, 'deal'), in: 'cut' },
    { at: A[12] - 0.15, draw: crownShot, in: 'zoom', cam: Shots.push(1.0, 1.03) },
  ]);

  Studio.film({
    post: { vignette: 0.16, grain: 0.035, paper: 0.3 },
    fadeOut: 0, // 單元之間直接接下一個單元的章卡,不淡出成黑畫面
    async init() { VO = await Studio.loadJSON('out/voice.json'); CAPS = KIT.buildCaptions(VO); globalThis.CAPS = CAPS; },
    draw(ctx, t) {
      film(ctx, t);
      KIT.disclaimer(ctx, t, { t0: ev.card, shrink: ev.shrink }); // 全螢幕字卡 → 右上角角標,之後一直在
      KIT.drawCaption(ctx, t, CAPS);
    },
  });
})();
