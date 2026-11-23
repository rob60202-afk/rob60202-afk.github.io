// L003〈報價單上漏掉的那一行〉第 2 單元:第 2 章「天花板上的那一行」。
// 畫風、角色、背景、表格、字幕都來自 longform-kit.js(KIT);這裡只排這個單元的鏡頭,
// 加上這個單元才有的畫法(很高的廠房的鏡頭、皇冠、尺規、圖 A、利潤格、板車、月曆與計費表、會勘三格)。
// 每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { E, ev } = S;
  const { W, H, C, CAST } = KIT;
  const { label, popIn, blink, stroke, fill, lin } = KIT;
  let VO = null, CAPS = [];
  const mouth = (who, t, from) => KIT.mouth(VO, t, who, from);
  const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));        // a..b → 0..1
  const NUMF = KIT.NUM;
  const num = (ctx, str, x, y, size, color = C.ink, align = 'left', o = {}) => G.text(ctx, str, x, y, { size, fam: NUMF, weight: 800, color, align, boil: 0, ...o });

  // ===================================== 共用小工具 =====================================
  // t0..t1 從 x0 走到 x1;其他時間站著(L003-u1)
  function walkTo(t, t0, t1, x0, x1, s) {
    if (t <= t0) return { x: x0, pose: 'stand' };
    if (t >= t1) return { x: x1, pose: 'stand' };
    const x = lerp(x0, x1, (t - t0) / (t1 - t0));
    return { x, pose: 'walk', walk: (Math.abs(x - x0) / (300 * s)) % 1 };
  }
  // 一張平面圖(小)(L003-u1)
  function planMini(ctx, x, y, s, rot, flat = 1, seed = 70) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s * flat);
    G.rrect(ctx, -110, -76, 220, 152, 6, { fill: '#EEF4F8', lw: 4, seed });
    for (let k = 1; k < 5; k++) G.line(ctx, [[-110 + k * 44, -72], [-110 + k * 44, 72]], { color: '#CFE0EA', lw: 2, seed: seed + k, amp: 0.2 });
    stroke(ctx, [[-84, -46], [24, -46], [24, 40], [80, 40]], C.pipe, 9);
    ctx.restore();
  }
  // 拿在手上的報價單;phase = 翻面的角度(cos < 0 = 背面,空白)
  function quoteSheet(ctx, x, y, s, rot, phase = 0, seed = 30) {
    const k = Math.cos(phase), back = k < 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * Math.max(0.06, Math.abs(k)), s);
    G.rrect(ctx, -46, -62, 92, 124, 6, { fill: back ? '#ECE6D6' : C.paper, lw: 3.5, seed });
    if (!back) {
      G.line(ctx, [[-30, -40], [30, -40]], { color: C.ink, lw: 5, seed: seed + 1, amp: 0.3 });
      for (let j = 0; j < 4; j++) G.line(ctx, [[-30, -16 + j * 20], [j === 3 ? 4 : 30, -16 + j * 20]], { color: '#B8AE9A', lw: 4, seed: seed + 2 + j, amp: 0.3 });
    }
    ctx.restore();
  }

  // ---------- 很高的廠房(跟 L003-u1 開場同一個廠房)----------
  const COLS = [-660, 150, 960, 1770, 2580];
  const TALL = { top: -1150, pipeY: -880, duct: -500, tray: 40, x0: -900, x1: W + 900, columns: COLS, hangers: [-250, 560, 1360, 2170],
    machines: [[-560, 300, 270], [-220, 300, 240], [260, 300, 290], [600, 300, 250], [1060, 320, 280], [1420, 300, 250], [2000, 300, 280], [2340, 300, 240]] };
  function fabTallExtras(ctx) { // 高處的採光窗、柱上的燈(L003-u1)
    for (let c = 0; c + 1 < COLS.length; c++) for (let x = COLS[c] + 70; x + 110 <= COLS[c + 1] - 50; x += 140) {
      G.rrect(ctx, x, -330, 110, 110, 4, { fill: '#9FCBE4', lw: 4, seed: 1500 + x });
      fill(ctx, x + 6, -324, 98, 40, 'rgba(255,255,255,0.35)');
    }
    for (const cx of COLS) { G.rrect(ctx, cx + 36, 236, 48, 30, 6, { fill: '#5C6470', lw: 3.5, seed: 1520 + cx }); KIT.glow(ctx, cx + 60, 270, 150, 'rgba(255,250,220,0.45)'); }
  }
  const PIPE_Y = TALL.pipeY + 116;                 // 新管要走的位置:貼著天花板的那一排管線,離地 6 m
  const PX_M = (KIT.L.ground - PIPE_Y) / 6;        // 一公尺幾個 px(人高約 1.7 m)
  // 世界座標的鏡頭:(cx, cy) 放在畫面中央,放大 z 倍
  const camOn = (ctx, c) => { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); };
  const w2s = (c, x, y) => [W / 2 + (x - c.cx) * c.z, H / 2 + (y - c.cy) * c.z];
  // 靜止鏡頭的廠房背景(快取):veil = 往後推的白霧
  function fabStill(ctx, cy, z = 1, veil = 0.36, cx = W / 2) {
    KIT.cached(ctx, `u2fab|${cx}|${cy}|${z}|${veil}`, (x) => {
      x.save(); camOn(x, { cx, cy, z }); KIT.bg.fab(x, 0, TALL); fabTallExtras(x); x.restore();
      if (veil > 0) fill(x, -100, -100, W + 200, H + 200, `rgba(226,233,238,${veil})`);
    });
  }
  // 新管要走的位置:藍色虛線(u = 畫出來的進度)
  function plannedRoute(ctx, t, u) {
    if (u <= 0) return;
    const x0 = -900, x1 = W + 900, xe = lerp(x0, x1, u);
    ctx.save(); ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 5); stroke(ctx, [[x0, PIPE_Y], [xe, PIPE_Y]], '#9FD0FF', 34); ctx.restore();
    ctx.save(); ctx.setLineDash([38, 22]); ctx.lineDashOffset = -t * 60; stroke(ctx, [[x0, PIPE_Y], [xe, PIPE_Y]], C.pipe, 16); ctx.restore();
  }

  // ---------- 阿樹頭上的小皇冠(第 1 章結尾冒出來的):戴在安全帽頂上 ----------
  // st: { tilt 0..1 歪掉, fall: { t0, x, y } 掉下去 }
  function crownOn(ctx, o, t, { tilt = 0, fall = null } = {}) {
    const s = o.s || 1, hp = KIT.headPos(o), k = 0.46 * s;
    const top = hp[1] - 120 * s;                        // 安全帽頂(頭的座標 -120)
    let x = hp[0] + 4 * s + lerp(0, 40 * s, tilt), y = top - 10 * k + lerp(0, 16 * s, tilt), rot = lerp(-0.08, 0.62, tilt);
    if (tilt > 0 && tilt < 1) rot += Math.sin(tilt * Math.PI * 3) * 0.18 * (1 - tilt);
    if (fall && t >= fall.t0) { // 從帽子滑下來,掉到地上彈兩下
      const d = t - fall.t0, T1 = 0.55;
      if (d < T1) { const u = d / T1; x = lerp(x, fall.x, u); y = lerp(y, fall.y, u * u) - Math.sin(u * Math.PI) * 30 * s; rot = lerp(rot, 2.4, u); }
      else {
        const b = d - T1, bounce = Math.abs(Math.sin(b * 9)) * 36 * s * Math.exp(-b * 4.5);
        x = fall.x + Math.min(b, 0.6) * 40 * s; y = fall.y - bounce; rot = lerp(2.4, 1.75, clamp(b / 0.4));
      }
    }
    KIT.crown(ctx, x, y, k, { rot });
    return [x, y];
  }
  // 眼眶含淚:下眼眶一圈水光 + 眼角一顆淚
  function tears(ctx, o, a, t) {
    if (a <= 0) return;
    const s = o.s || 1, hp = KIT.headPos(o), sx = o.sx || 1, lk = o.look || 0, ly = o.lookY || 0;
    for (const sd of [-1, 1]) {
      const ex = hp[0] + (sd * 26 + lk * 10) * s * sx, ey = hp[1] + (-6 + ly * 6) * s;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = 'rgba(140,200,245,0.85)'; ctx.beginPath(); ctx.ellipse(ex, ey + 5 * s, 13 * s, 7 * s, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex - 4 * s, ey + 7 * s, 2.4 * s, 0, 7); ctx.fill();
      const dy = (6 + 10 * a) * s, dx = ex + sd * sx * 14 * s;   // 眼角那一顆
      ctx.fillStyle = '#9FD3F0'; ctx.strokeStyle = 'rgba(58,42,32,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx, ey + dy - 9 * s); ctx.quadraticCurveTo(dx + 7 * s, ey + dy + 4 * s, dx, ey + dy + 7 * s); ctx.quadraticCurveTo(dx - 7 * s, ey + dy + 4 * s, dx, ey + dy - 9 * s); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  // 慌張時從頭上飛出去的汗珠
  function sweatFly(ctx, o, t, t0, t1) {
    if (t < t0 || t > t1 + 0.4) return;
    const s = o.s || 1, hp = KIT.headPos(o);
    for (let k = 0; k < 6; k++) {
      const ph = ((t - t0) * 2.2 + k / 6) % 1, an = -Math.PI / 2 + (k % 2 ? 1 : -1) * (0.5 + 0.25 * (k % 3));
      const r = (90 + ph * 70) * s, x = hp[0] + Math.cos(an) * r, y = hp[1] - 40 * s + Math.sin(an) * r + ph * ph * 60 * s;
      const a = Math.sin(ph * Math.PI) * clamp((t1 + 0.4 - t) / 0.4);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(an + Math.PI / 2); ctx.scale(s, s);
      ctx.fillStyle = '#9FD3F0'; ctx.strokeStyle = 'rgba(58,42,32,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(8, 2, 0, 8); ctx.quadraticCurveTo(-8, 2, 0, -12); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  // 師傅的視線:紅色虛線 + 箭頭(跟 L003-u1 開場同一個畫法),from → to
  function gaze(ctx, from, to, t, a = 1, lw = 7) {
    if (a <= 0) return;
    const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy);
    if (L < 4) return;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, col = 'rgba(200,69,47,0.85)';
    ctx.save(); ctx.globalAlpha *= a;
    ctx.save(); ctx.setLineDash([22, 16]); ctx.lineDashOffset = -t * 80; stroke(ctx, [from, to], col, lw); ctx.restore();
    for (let d = 110; d < L - 30; d += 210) { const px = from[0] + ux * d, py = from[1] + uy * d; stroke(ctx, [[px - ux * 18 + nx * 18, py - uy * 18 + ny * 18], [px, py], [px - ux * 18 - nx * 18, py - uy * 18 - ny * 18]], col, lw); }
    ctx.restore();
  }
  // 從安全帽上方往上看的視線(o = 角色;grow 0..1;top = 視線要到的 y)
  const gazeUpFrom = (ctx, o, t, grow, top, a = 1) => { if (grow <= 0) return; const hp = KIT.headPos(o), s = o.s || 1, y0 = hp[1] - 150 * s; gaze(ctx, [hp[0] + 4 * s, y0], [hp[0] + 4 * s, lerp(y0, top, grow)], t, a, 7); };

  // ---------- 梯子、施工架(示意圖用)----------
  // 從 base(地面那一端的中心)到 top(靠牆那一端的中心)的一把梯子;w = 寬
  function ladder(ctx, base, top, w, { color = '#B98A5E', seed = 1600, rungs = 7, lw = 9 } = {}) {
    const dx = top[0] - base[0], dy = top[1] - base[1], L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2;
    for (let k = 1; k <= rungs; k++) { const u = k / (rungs + 1); stroke(ctx, [[base[0] + dx * u - nx, base[1] + dy * u - ny], [base[0] + dx * u + nx, base[1] + dy * u + ny]], C.ink, lw * 0.8 + 3); stroke(ctx, [[base[0] + dx * u - nx, base[1] + dy * u - ny], [base[0] + dx * u + nx, base[1] + dy * u + ny]], color, lw * 0.8); }
    for (const sd of [-1, 1]) G.limb(ctx, [[base[0] + sd * nx, base[1] + sd * ny], [top[0] + sd * nx, top[1] + sd * ny]], { color, lw, outline: 3, seed: seed + sd });
  }
  // 施工架(門型框架一層一層疊上去):x = 左緣、fy = 地面、w = 寬、deckY = 最上層工作台、u = 架起來的進度
  function scaffold(ctx, x, fy, w, deckY, u = 1, seed = 1650) {
    const tiers = 3, th = (fy - deckY) / tiers, shown = u * tiers;
    for (let k = 0; k < tiers; k++) {
      const a = clamp(shown - k); if (a <= 0) break;
      const y1 = fy - k * th, y0 = y1 - th * ease.outCubic(a);
      for (const xx of [x, x + w]) G.line(ctx, [[xx, y1], [xx, y0]], { color: '#5C6470', lw: 9, seed: seed + k * 7 + xx });
      G.line(ctx, [[x, y0], [x + w, y0]], { color: '#5C6470', lw: 8, seed: seed + k * 7 + 1 });
      if (a > 0.6) { G.line(ctx, [[x, y1], [x + w, y0]], { color: '#8E99A3', lw: 5, seed: seed + k * 7 + 2 }); G.line(ctx, [[x + w, y1], [x, y0]], { color: '#8E99A3', lw: 5, seed: seed + k * 7 + 3 }); }
    }
    if (u >= 1) { // 最上層:踏板、護欄、腳趾板
      G.rrect(ctx, x - 14, deckY - 6, w + 28, 16, 3, { fill: '#C98A3A', lw: 4, seed: seed + 40 });
      for (const xx of [x - 6, x + w + 6]) G.line(ctx, [[xx, deckY - 6], [xx, deckY - 104]], { color: '#E9A23B', lw: 9, seed: seed + 41 + xx });
      G.line(ctx, [[x - 6, deckY - 104], [x + w + 6, deckY - 104]], { color: '#E9A23B', lw: 9, seed: seed + 44 });
      G.line(ctx, [[x - 6, deckY - 56], [x + w + 6, deckY - 56]], { color: '#E9A23B', lw: 7, seed: seed + 45 });
    }
    for (const xx of [x, x + w]) G.rrect(ctx, xx - 22, fy - 10, 44, 10, 2, { fill: '#5C6470', lw: 3, seed: seed + 50 + xx }); // 底座
  }

  // ===================================== 1. 開工前會勘那天 =====================================
  // 三個人走進很高的廠房:師傅走在最前面,阿樹把圖遞過去,師傅沒有看,先抬頭
  const POS = { client: 440, shu: 780, master: 1120 };
  function walkCam(t) {
    const p = ease.inOutQuad(seg(t, ev.ch2 + S.CHAPTER, ev.ask1)), lu = ease.inOutCubic(seg(t, ev.lookUp, ev.lookUp + 1.2));
    return { cx: 960, cy: lerp(380, 300, lu), z: lerp(0.72, 0.76, p) };
  }
  function people(ctx, t, { look = 'fwd', walk = true, crown = null } = {}) {
    const lu = t >= ev.lookUp;
    const mw = walk ? walkTo(t, ev.walk.master[0], ev.walk.master[1], -480, POS.master, 1) : { x: POS.master, pose: 'stand' };
    const sw = walk ? walkTo(t, ev.walk.shu[0], ev.walk.shu[1], -740, POS.shu, 1) : { x: POS.shu, pose: 'stand' };
    const cw = walk ? walkTo(t, ev.walk.client[0], ev.walk.client[1], -980, POS.client, 1) : { x: POS.client, pose: 'stand' };
    const allUp = look === 'up';
    // 甲方承辦(訪客藍帽、黃綠背心、馬尾),抱著資料夾
    const co = { ...cw, y: KIT.L.ground, s: 1.0, style: CAST.clientSite, seed: 480, eyes: 'normal', mouth: 'smile', brows: allUp ? 'up' : 'neutral', look: allUp ? 0.1 : 0.55, lookY: allUp ? -1 : 0, blink: blink(t, 0.45),
      handL: [-30, -262], handR: [36, -250] };
    KIT.person(ctx, co);
    const cp = KIT.world(co, 4, -262); G.rrect(ctx, cp[0] - 34, cp[1] - 50, 68, 92, 6, { fill: '#5C7FA8', lw: 4, seed: 1560 }); G.rrect(ctx, cp[0] - 26, cp[1] - 40, 52, 70, 4, { fill: C.paper, lw: 2.5, seed: 1561 });
    // 阿樹:拿著圖,走到定點後把圖遞給師傅
    const offer = walk ? ease.outCubic(seg(t, ev.offer, ev.offer + 0.35)) * (1 - ease.inOutCubic(seg(t, ev.lookUp + 0.4, ev.lookUp + 1.0))) : 0;
    const so = { ...sw, y: KIT.L.ground, s: 1.0, style: CAST.shuSite, seed: 400, eyes: allUp ? 'wide' : 'normal', mouth: mouth('shu', t) || (allUp ? 'o' : 'smile'), brows: 'up',
      look: allUp ? 0.2 : 0.6, lookY: allUp ? -1 : 0, blink: blink(t, 0.2), blush: 0.5, handR: [lerp(70, 190, offer), lerp(-212, -262, offer)] };
    KIT.person(ctx, so);
    const hp = KIT.world(so, so.handR[0], so.handR[1]); planMini(ctx, hp[0] + 30 * offer, hp[1] - 26, 0.55, lerp(0.15, -0.05, offer), 1, 71);
    if (crown) crownOn(ctx, so, t, crown);
    // 陳師傅:走在最前面,不看圖,先抬頭
    const up = allUp || lu, hu = ease.outCubic(seg(t, ev.lookUp, ev.lookUp + 0.3));
    const mo = { ...mw, y: KIT.L.ground, s: 1.0, style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: mouth('master', t) || 'flat', brows: up ? 'up' : 'neutral',
      look: up ? 0.05 : 0.25, lookY: allUp ? -1 : lerp(0, -1, hu), headY: allUp ? -4 : lerp(0, -4, hu), blink: up ? 0 : blink(t, 0.6) };
    KIT.person(ctx, mo);
    return { so, mo, co };
  }
  function fabWalk(ctx, t) {
    const c = walkCam(t);
    ctx.save(); camOn(ctx, c);
    KIT.bg.fab(ctx, t, TALL); fabTallExtras(ctx);
    const P = people(ctx, t, { crown: {} });
    gazeUpFrom(ctx, P.mo, t, ease.outCubic(seg(t, ev.lookUp + 0.1, ev.lookUp + 0.8)), -700);
    ctx.restore();
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.10)', floor: 0.2 });
  }

  // ===================================== 2. 「管子走哪裡?」 =====================================
  // 師傅對嘴(仰角),眼睛一直盯著天花板
  function askShot(ctx, t) {
    fabStill(ctx, -150, 0.85, 0.42);
    const m = mouth('master', t);
    const o = { x: 1000, y: 1500, s: 2.0, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: m || 'flat', brows: 'up', look: 0.15, lookY: -1, headY: -6, blink: 0, shadow: false };
    KIT.person(ctx, o);
    const hp = KIT.headPos(o); gaze(ctx, [hp[0] + 8, hp[1] - 270], [hp[0] + 8, -60], t, 1, 9);
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }

  // ===================================== 3/5. 兩人中景 =====================================
  const SHU2 = { x: 620, y: 1190, s: 1.35 }, MST2 = { x: 1310, y: 1190, s: 1.35 };
  function twoShot(ctx, t, mode) {
    fabStill(ctx, 300, 0.95, 0.34);
    const ms = mouth('master', t), mu = mouth('shu', t);
    let so, mo;
    if (mode === 'up') { // 3. 阿樹跟著抬頭,手指往上比
      const up = t >= ev.shuUp, pu = ease.outBack(seg(t, ev.shuUp, ev.shuUp + 0.35));
      so = { ...SHU2, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: mu || (up ? 'grin' : 'smile'), brows: 'up', look: up ? 0.25 : 0.7, lookY: up ? -1 : -0.2,
        blink: blink(t, 0.2), blush: 0.55, shadow: false };
      if (pu > 0) { so.gesture = 'pointUp'; so.handR = [lerp(70, 118, pu), lerp(-212, -497, pu)]; }
      mo = { ...MST2, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: ms || 'flat', brows: 'up', look: 0.05, lookY: -1, headY: -4, blink: 0, shadow: false };
      KIT.person(ctx, mo); KIT.person(ctx, so); crownOn(ctx, so, t, {});
      gazeUpFrom(ctx, mo, t, 1, -80);
      if (t >= ev.hug) { // 指尖往上冒的箭頭
        const f = KIT.world(so, so.handR[0] + 6, so.handR[1] - 40);
        for (let k = 0; k < 3; k++) {
          const ph = ((t - ev.hug) * 0.9 + k / 3) % 1, y = f[1] - 30 - ph * 300, a = Math.sin(ph * Math.PI) * clamp((t - ev.hug) / 0.3);
          ctx.save(); ctx.globalAlpha *= a; stroke(ctx, [[f[0] - 30, y + 26], [f[0], y], [f[0] + 30, y + 26]], C.pipe, 10); ctx.restore();
        }
      }
    } else { // 5. 師傅終於轉頭看阿樹,面無表情
      const tu = ease.inOutCubic(seg(t, ev.turn, ev.turn + 0.35)), sw = seg(t, ev.sweat, ev.sweat + 0.4), after = t >= E[5] + 0.1;
      mo = { ...MST2, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: ms || 'flat', brows: 'neutral', look: lerp(0.05, -1.0, tu), lookY: lerp(-1, 0.15, tu), headY: lerp(-4, 0, tu), headX: lerp(0, -10, tu),
        blink: tu >= 1 ? blink(t, 0.6) : 0, shadow: false };
      so = { ...SHU2, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: sw > 0 ? 'wide' : 'normal', mouth: after ? 'wavy' : sw > 0 ? 'o' : tu > 0.5 ? 'smile' : 'grin', brows: sw > 0 ? 'worried' : 'up',
        look: lerp(0.25, 0.75, tu), lookY: lerp(-1, 0, tu), blink: sw > 0 ? 0 : blink(t, 0.2), blush: 0.55 + 0.3 * sw, sweat: sw, shadow: false };
      KIT.person(ctx, mo); KIT.person(ctx, so); crownOn(ctx, so, t, { tilt: 1 });
      // 視線:一直盯著天花板 → 轉頭那一刻掃到阿樹臉上,停一下就消失
      const mh = KIT.headPos(mo), sh = KIT.headPos(so), ga = 1 - seg(t, ev.turn + 0.75, ev.turn + 1.1);
      if (tu <= 0) gazeUpFrom(ctx, mo, t, 1, -80);
      else if (ga > 0) { const an = lerp(-Math.PI / 2, Math.atan2(sh[1] - mh[1], sh[0] + 120 - mh[0]), tu), L = lerp(560, Math.hypot(sh[0] + 120 - mh[0], sh[1] - mh[1]) - 40, tu), f = [mh[0] - 60 * tu, mh[1] - lerp(150 * MST2.s, 0, tu)]; gaze(ctx, f, [f[0] + Math.cos(an) * L, f[1] + Math.sin(an) * L], t, ga); }
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
    return { so, mo };
  }

  // ===================================== 4. 「多高?」上搖 →「……六米。」尺規 =====================================
  const RULER_X = 1560;
  function tiltCam(t) {
    const up = ease.inOutCubic(seg(t, ev.tilt[0], ev.tilt[1])), pl = ease.inOutCubic(seg(t, ev.pull[0], ev.pull[1]));
    const pu = ease.inOutCubic(seg(t, ev.six + 0.85, ev.turnShot + 0.1)); // 「6 m」看清楚之後推近阿樹:皇冠歪掉
    let cy = lerp(lerp(540, -620, up), -15, pl), z = lerp(1, 0.54, pl), cx = 960;
    cx = lerp(cx, 830, pu); cy = lerp(cy, 400, pu); z = lerp(z, 1.12, pu);
    return { cx, cy, z };
  }
  function rulerShot(ctx, t) {
    const c = tiltCam(t);
    ctx.save(); camOn(ctx, c);
    KIT.bg.fab(ctx, t, TALL); fabTallExtras(ctx);
    plannedRoute(ctx, t, ease.inOutCubic(seg(t, ev.tilt[1] - 0.7, ev.tilt[1] + 0.5)));
    // 尺規:捲尺盒放在地上,黃色尺身從地面拉到管線位置,每一公尺一格
    const ru = ease.outCubic(seg(t, ev.ruler[0], ev.ruler[1]));
    if (t >= ev.ruler[0] - 0.3) {
      const fy = KIT.L.ground, yt = lerp(fy - 40, PIPE_Y, ru), a = clamp((t - ev.ruler[0] + 0.3) / 0.25);
      ctx.save(); ctx.globalAlpha *= a;
      G.rrect(ctx, RULER_X - 26, yt, 52, fy - 40 - yt, 4, { fill: '#F2C230', lw: 4, seed: 1700 });
      for (let k = 1; fy - k * PX_M / 2 > yt + 6; k++) { const yy = fy - k * PX_M / 2; if (yy > fy - 100) continue; stroke(ctx, [[RULER_X - 26, yy], [RULER_X + (k % 2 ? -6 : 14), yy]], C.ink, k % 2 ? 4 : 7); }
      G.rrect(ctx, RULER_X - 34, yt - 10, 68, 16, 4, { fill: '#8E99A3', lw: 3.5, seed: 1701 });            // 尺頭的勾
      G.rrect(ctx, RULER_X - 70, fy - 96, 140, 96, 22, { fill: '#F2C230', lw: 5, seed: 1702 });             // 捲尺盒
      G.ellipse(ctx, RULER_X, fy - 48, 30, 30, { fill: '#5C6470', lw: 4, seed: 1703 });
      ctx.restore();
      if (ru >= 1) { // 管線位置:紅線
        const g = clamp((t - ev.ruler[1]) / 0.3);
        ctx.save(); ctx.globalAlpha *= g; stroke(ctx, [[RULER_X - 120, PIPE_Y], [RULER_X + 120, PIPE_Y]], C.red, 10); ctx.restore();
      }
    }
    // 三個人都抬頭看(師傅問「多高?」)
    const P = people(ctx, t, { look: 'up', walk: false, crown: { tilt: ease.outCubic(seg(t, ev.crownTilt, ev.crownTilt + 0.6)) } });
    const cpos = KIT.headPos(P.so);
    gazeUpFrom(ctx, P.mo, t, lerp(0.35, 1, ease.inOutCubic(seg(t, ev.tilt[0], ev.tilt[1] + 0.1))), PIPE_Y + 70, 1 - seg(t, ev.ruler[0] - 0.2, ev.ruler[0] + 0.2));
    ctx.restore();
    // 「6 m」:畫在畫面座標(字不跟著鏡頭縮小)
    if (t >= ev.six) {
      const a = popIn(t, ev.six, 0.35), fade = 1 - seg(t, ev.six + 0.85, ev.six + 1.2);
      const p = w2s(c, RULER_X + 46, (KIT.L.ground + PIPE_Y) / 2);
      if (fade > 0) { ctx.save(); ctx.globalAlpha *= fade; ctx.translate(p[0], p[1]); ctx.scale(a, a); label(ctx, '6 m', 0, 30, 92, C.red, { stroke: '#FFFFFF', strokeW: 22, align: 'left', fam: NUMF }); ctx.restore(); }
    }
    // 皇冠歪掉的那一下:旁邊幾條動線
    const bt = seg(t, ev.crownTilt, ev.crownTilt + 0.5);
    if (bt > 0 && bt < 1) { const p = w2s(c, cpos[0] + 80, cpos[1] - 170); ctx.save(); ctx.globalAlpha *= Math.sin(bt * Math.PI); for (let k = 0; k < 3; k++) stroke(ctx, [[p[0] + k * 14, p[1] - 30 + k * 22], [p[0] + 26 + k * 14, p[1] - 40 + k * 22]], C.ink, 5); ctx.restore(); }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.10)', floor: 0.2 });
  }

  // ===================================== 6. 阿樹翻報價單;【表 1】裂開一條空白行 =====================================
  const TB = KIT.L.table;
  function flipShot(ctx, t) {
    fabStill(ctx, 420, 1, 0.4);
    const fr = t >= ev.frantic, sp = t >= ev.split;
    // 翻面:翻過來、又翻過去,然後狂翻
    let ph = Math.PI * ease.inOutCubic(seg(t, ev.flip1, ev.flip1 + 0.35)) + Math.PI * ease.inOutCubic(seg(t, ev.flip2, ev.flip2 + 0.35));
    if (fr) ph += Math.min(t - ev.frantic, ev.split + 0.7 - ev.frantic) * Math.PI * 2 * 3.2;
    const shake = fr && t < ev.split + 0.7 ? Math.sin(t * 40) * 10 : 0;
    const o = { x: 430, y: 1190, s: 1.35, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: fr ? 'wide' : 'normal', mouth: fr ? 'wavy' : 'flat', brows: 'worried', look: 0.75, lookY: 0.35,
      blink: fr ? 0 : blink(t, 0.2), blush: 0.6, sweat: 1, shadow: false };
    o.handR = KIT.hand(o.x, o.y, o.s, 1, 690 + shake, 818);
    o.handL = KIT.hand(o.x, o.y, o.s, 1, 380, 850);
    KIT.person(ctx, o); crownOn(ctx, o, t, { tilt: 1 });
    quoteSheet(ctx, 726 + shake, 750, 1.55, 0.08, ph, 31);
    sweatFly(ctx, o, t, ev.frantic, ev.split + 0.9);
    // 【表 1】:在材料和工資中間插一列 open(從 0 高度裂開)+ flash(紅色虛線閃)
    const rows = KIT.L003.TABLE1.map((r) => ({ ...r }));
    rows.splice(1, 0, { cells: ['', ''], open: ev.split, flash: true });
    const T = KIT.table(ctx, t, { ...TB, at: ev.flipShot + 0.1, title: KIT.L003.TABLE1_TITLE, head: ['項目', '金額'], rows, seed: 700 });
    if (sp && T) { // 裂開的那一下:往外噴幾條紅線
      const u = seg(t, ev.split, ev.split + 0.35), r = T.rows[1];
      if (u < 1) KIT.burst(ctx, TB.x + TB.w / 2, TB.y + r.y + r.h / 2, 300 + 120 * u, 380 + 160 * u, 1 - u, 12, C.red, 6);
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }

  // ===================================== 7. 阿樹小小聲:跟廠裡借一把梯子 =====================================
  function tinyLadderShot(ctx, t) {
    fabStill(ctx, 380, 1.1, 0.48);
    const m = mouth('shu', t), sm = m ? { ...m, open: (m.open || 0) * 0.6 } : null;
    const o = { x: 820, y: 1360, s: 1.6, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: sm || 'wavy', brows: 'worried', look: -0.45, lookY: 0.45, headY: 8,
      blink: blink(t, 0.2), blush: 0.95, sweat: 0.7, shadow: false };
    const hu = ease.outBack(seg(t, ev.tiny - 0.35, ev.tiny));
    o.handR = KIT.hand(o.x, o.y, o.s, 1, lerp(930, 1080, hu), lerp(900, 706, hu));
    KIT.person(ctx, o); crownOn(ctx, o, t, { tilt: 1 });
    const hp = KIT.world(o, o.handR[0], o.handR[1]);
    // 大拇指和食指之間夾著一把很小的梯子
    const a = popIn(t, ev.tiny, 0.3);
    if (hu > 0.5) { // 食指在上、大拇指在下,捏著一把很小的梯子
      G.limb(ctx, [[hp[0] - 2, hp[1] - 20], [hp[0] + 34, hp[1] - 74], [hp[0] + 78, hp[1] - 90]], { color: C.skin, lw: 16, outline: 3, seed: 1800 });
      G.limb(ctx, [[hp[0] + 6, hp[1] - 2], [hp[0] + 80, hp[1] - 12]], { color: C.skin, lw: 16, outline: 3, seed: 1801 });
    }
    if (a > 0) {
      ctx.save(); ctx.translate(hp[0] + 62, hp[1] - 50); ctx.scale(a, a);
      ladder(ctx, [0, 28], [0, -28], 20, { rungs: 3, lw: 5, seed: 1802 });
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= 0.7 * a; ctx.setLineDash([8, 8]); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hp[0] + 56, hp[1] - 50, 78, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }

  // ===================================== 8–9. 示意圖:梯子打叉 →【圖 A】高度示意 =====================================
  // 圖的座標:地面 fy、6 m 管線 py = fy - 540(一公尺 90 px)、牆在 wx
  function figure(ctx, t, L) {
    const { fy, wx, x1 } = L, py = fy - 540, ceil = py - 40;
    // 地面、牆、天花板、管線(藍色)、吊架
    G.line(ctx, [[wx - 40, fy], [x1, fy]], { color: C.ink, lw: 6, seed: 1900 });
    for (let x = wx - 30; x < x1; x += 34) stroke(ctx, [[x, fy + 4], [x - 18, fy + 22]], '#8E99A3', 3);
    G.rrect(ctx, wx - 26, ceil, 26, fy - ceil, 2, { fill: '#D9DEE3', lw: 4, seed: 1901, hatch: { color: 'rgba(60,80,100,0.15)', gap: 10 } });
    G.line(ctx, [[wx - 26, ceil], [x1, ceil]], { color: C.ink, lw: 5, seed: 1902 });
    for (let x = wx + 120; x < x1 - 20; x += 260) stroke(ctx, [[x, ceil], [x, py - 12]], '#5C6470', 4);
    G.rrect(ctx, wx, py - 13, x1 - wx - 10, 26, 12, { fill: C.pipe, lw: 4, seed: 1903 });
    // 6 m 尺寸線
    const dp = L.dim6 != null && t >= L.dim6 && t < L.dim6 + 0.8 ? 1 + 0.15 * Math.sin((t - L.dim6) / 0.8 * Math.PI) : 1;
    const dx = L.dimX;
    stroke(ctx, [[dx, fy - 4], [dx, py + 4]], C.red, 6);
    stroke(ctx, [[dx - 18, py + 30], [dx, py + 4], [dx + 18, py + 30]], C.red, 6);
    stroke(ctx, [[dx - 18, fy - 30], [dx, fy - 4], [dx + 18, fy - 30]], C.red, 6);
    stroke(ctx, [[dx - 26, py], [dx + 26, py]], C.red, 3); stroke(ctx, [[dx - 26, fy], [dx + 26, fy]], C.red, 3);
    const DL = L.dimLabel || { x: dx - 22, y: (fy + py) / 2 + 22, align: 'right' };
    ctx.save(); ctx.translate(DL.x, DL.y); ctx.scale(dp, dp); label(ctx, '6 m', 0, 0, L.dimSize || 64, C.red, { stroke: '#FFFFFF', strokeW: 14, align: DL.align, fam: NUMF }); ctx.restore();
    // 一半的高度(虛線)
    if (L.half != null && t >= L.half) {
      const a = clamp((t - L.half) / 0.3), yh = fy - 270;
      ctx.save(); ctx.globalAlpha *= a; ctx.setLineDash([16, 12]); stroke(ctx, [[wx, yh], [wx + 430, yh]], C.muted, 4); ctx.restore();
      ctx.save(); ctx.globalAlpha *= a; label(ctx, '一半', wx + 470, yh + 14, 40, C.muted, { align: 'left' }); ctx.restore();
    }
    // 梯子:立在牆邊,連一半高度都不到
    if (L.ladder != null && t >= L.ladder) {
      const a = popIn(t, L.ladder, 0.3), base = [wx + 150, fy - 4], top = [wx + 22, fy - 236];
      ctx.save(); ctx.translate(base[0], base[1]); ctx.scale(1, a); ctx.translate(-base[0], -base[1]);
      ladder(ctx, base, top, 54, { rungs: 6, seed: 1910 });
      ctx.restore();
      if (L.cross != null && t >= L.cross) {
        const u = clamp((t - L.cross) / 0.28), k = lerp(1.6, 1, ease.outCubic(u)), cx = (base[0] + top[0]) / 2, cy = (base[1] + top[1]) / 2;
        const pulse = L.pulse != null && t >= L.pulse && t < L.pulse + 0.8 ? 1 + 0.12 * Math.sin((t - L.pulse) / 0.8 * Math.PI * 2) : 1;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k * pulse, k * pulse); ctx.globalAlpha *= clamp(u * 3);
        KIT.cross(ctx, 0, 0, 120, 1, { lw: 30 }); ctx.restore();
      }
      if (L.labels) label(ctx, '梯子', wx + 86, fy + 52, 40, C.ink);
    }
    // 施工架
    if (L.scaf != null && t >= L.scaf) {
      scaffold(ctx, L.scafX, fy, 190, fy - 320, seg(t, L.scaf, L.scaf + 0.7), 1650);
      if (L.labels) label(ctx, '施工架', L.scafX + 95, fy + 52, 40, C.ink);
      if (t >= L.scafOK) KIT.tick(ctx, L.scafX + 95, fy - 476, 44, popIn(t, L.scafOK, 0.3));
    }
    // 高空作業車(下方交通錐 + 警示帶圍出管制區)
    if (L.lift != null && t >= L.lift) {
      const lx = L.liftX, u = ease.inOutCubic(seg(t, L.lift, L.lift + 0.9)), h = lerp(40, 402, u);
      const a = clamp((t - L.lift) / 0.25);
      ctx.save(); ctx.globalAlpha *= a;
      KIT.warnTape(ctx, [[lx - 205, fy - 46], [lx + 205, fy - 46]], { lw: 12 });
      KIT.lift(ctx, lx, fy, 0.62, h, { seed: 1960 });
      KIT.cone(ctx, lx - 215, fy, 0.62, 1970); KIT.cone(ctx, lx + 215, fy, 0.62, 1975);
      ctx.restore();
      if (L.labels) label(ctx, '高空作業車', lx, fy + 52, 40, C.ink);
      if (t >= L.liftOK) KIT.tick(ctx, lx - 90, fy - 476, 44, popIn(t, L.liftOK, 0.3));
    }
  }
  // 8. 「六米的梯子。你爬,我不爬。」師傅抱胸;右邊一張示意卡
  function crossShot(ctx, t) {
    fabStill(ctx, 420, 1, 0.4);
    const m = mouth('master', t);
    KIT.person(ctx, { x: 470, y: 1190, s: 1.35, pose: 'stand', style: CAST.masterSite, seed: 440, crossArms: true, eyes: 'normal', mouth: m || 'flat', brows: 'neutral', look: 0.35, lookY: 0.05, blink: blink(t, 0.6), shadow: false });
    const a = popIn(t, ev.card8, 0.35);
    if (a > 0) {
      ctx.save(); ctx.translate(1420, 140); ctx.scale(a, a); ctx.translate(-1420, -140);
      KIT.card(ctx, 1000, 140, 840, 730, { seed: 1990, tape: true });
      label(ctx, '示意', 1060, 212, 40, C.muted, { align: 'left' });
      figure(ctx, t, { fy: 822, wx: 1110, x1: 1800, dimX: 1700, dimSize: 60, dimLabel: { x: 1720, y: 420, align: 'left' }, ladder: ev.ladder8, half: ev.half8, cross: ev.xmark });
      ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }
  // 一行算式,各段在自己的時間彈出;整行置中(先量好每一段的寬度,不會疊在一起)
  function seqLine(ctx, t, parts, cx, y, size, color = C.ink, gap = 0.32) {
    const ws = parts.map(([str]) => KIT.measure(ctx, str, size, NUMF)), g = size * gap, tot = ws.reduce((a, b) => a + b, 0) + g * (parts.length - 1);
    let x = cx - tot / 2;
    parts.forEach(([str, at, col], k) => {
      if (t >= at) { const p = popIn(t, at, 0.25); ctx.save(); ctx.translate(x + ws[k] / 2, y - size * 0.35); ctx.scale(p, p); num(ctx, str, 0, size * 0.35, size, col || color, 'center'); ctx.restore(); }
      x += ws[k] + g;
    });
  }
  // 9. 【圖 A】高度示意 + 旁邊跳出「10 天 × 2,500 = 25,000」
  function figAShot(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, 0, H, [[0, '#D9E1E7'], [1, '#C4CFD8']]));
    KIT.card(ctx, 70, 130, 1780, 770, { seed: 2000 });
    G.text(ctx, '【圖 A】高度示意', 110, 210, { size: 50, fam: KIT.CJK, weight: 800, color: C.ink, boil: 0 });
    figure(ctx, t, { fy: 816, wx: 330, x1: 1330, dimX: 250, dimSize: 64, ladder: -Infinity, cross: -Infinity, pulse: ev.ladderX, dim6: ev.dim6,
      scaf: ev.scaf, scafX: 540, scafOK: ev.scafOK, lift: ev.lift, liftX: 1040, liftOK: ev.liftOK, labels: true });
    // 算式卡
    const [c0, c1, c2] = ev.calc;
    const a = popIn(t, c0 - 0.1, 0.35);
    if (a > 0) {
      ctx.save(); ctx.translate(1610, 330); ctx.scale(a, a); ctx.translate(-1610, -330);
      KIT.card(ctx, 1400, 300, 420, 330, { fill: C.cream, seed: 2010, tape: true });
      label(ctx, '高空作業車租金', 1610, 372, 40, C.muted);
      stroke(ctx, [[1430, 398], [1790, 398]], '#D8CDB4', 3);
      const show = (str, x, y, at, size, col, align) => { if (t >= at) { const p = popIn(t, at, 0.25); ctx.save(); ctx.translate(x, y); ctx.scale(p, p); num(ctx, str, 0, 0, size, col, align); ctx.restore(); } };
      seqLine(ctx, t, [['10 天', c0], ['×', c1], ['2,500', c1]], 1610, 476, 54);
      if (t >= c2) stroke(ctx, [[1440, 512], [1780, 512]], C.ink, 4);
      show('= 25,000', 1780, 590, c2, 70, C.red, 'right');
      ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.18 });
  }

  // ===================================== 10–11. 利潤格 =====================================
  // 一張卡片:中間一條直的數線,0 在中間;數字膠囊沿著數線往下掉,穿過 0 變成紅色
  // g: { x, y, w, h(卡片), zero(0 的 y), k(每 1,000 幾 px), axisX(數線的 x), title, size, pillW, pillH, value(t) → { v, text, color, flash, pop } }
  function gauge(ctx, t, g) {
    const { x, y, w, h, zero, k, size = 62, pillW = 360, pillH = 92, axisX, title = '利潤' } = g;
    KIT.card(ctx, x, y, w, h, { seed: g.seed || 2100 });
    label(ctx, title, x + 36, y + 72, g.titleSize || 52, C.ink, { align: 'left' });
    const top = y + 112, bot = y + h - 34;
    fill(ctx, x + 26, top, w - 52, zero - top, 'rgba(62,155,95,0.10)');
    fill(ctx, x + 26, zero, w - 52, bot - zero, 'rgba(200,69,47,0.10)');
    stroke(ctx, [[axisX, bot], [axisX, top + 8]], C.ink, 5);
    stroke(ctx, [[axisX - 14, top + 28], [axisX, top + 8], [axisX + 14, top + 28]], C.ink, 5);
    stroke(ctx, [[axisX - 8, zero], [x + w - 26, zero]], C.ink, 5);
    label(ctx, '0', axisX - 20, zero + 16, 46, C.ink, { align: 'right', fam: NUMF });
    const val = g.value(t);
    const py = zero - val.v / 1000 * k, px = axisX + 40 + pillW / 2;
    G.ellipse(ctx, axisX, py, 11, 11, { fill: val.color, lw: 3, seed: 2101 });
    stroke(ctx, [[axisX + 12, py], [px - pillW / 2, py]], val.color, 4);
    ctx.save(); ctx.translate(px, py); ctx.scale(val.pop || 1, val.pop || 1);
    G.rrect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, pillH / 2, { fill: '#FFFFFF', lw: 5, seed: 2102 });
    ctx.save(); ctx.strokeStyle = val.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-pillW / 2 + 8, -pillH / 2 + 8, pillW - 16, pillH - 16, pillH / 2 - 8); ctx.stroke(); ctx.restore();
    num(ctx, val.text, 0, size * 0.36, size, val.color, 'center');
    ctx.restore();
    if (val.flash > 0) { ctx.save(); ctx.globalAlpha *= val.flash; stroke(ctx, [[axisX - 8, zero], [x + w - 26, zero]], '#FFE27A', 16); ctx.restore(); }
    return { px, py, pillW, pillH };
  }
  const GREEN = '#2E8B57';
  // 一段往下掉:from → to(數值),在 tA..tB 之間(往下加速、最後小彈一下);穿過 0 的那一刻換成紅色
  function fallValue(t, from, to, tA, tB, fromText, toText) {
    if (t < tA) return { v: from, text: fromText, color: from >= 0 ? GREEN : C.red };
    const u = seg(t, tA, tB);
    let v;
    if (u < 1) v = lerp(from, to, ease.inQuad(u));
    else { const b = t - tB; v = to + Math.abs(Math.sin(b * 12)) * Math.exp(-b * 7) * 1600; }
    const crossed = v < 0, uz = from > 0 ? (from / (from - to)) : -1, tz = tA + (tB - tA) * Math.sqrt(Math.max(0, uz));
    const flash = from > 0 && t >= tz ? clamp(1 - (t - tz) / 0.5) : 0;
    const text = u >= 1 || (from > 0 && crossed) || from <= 0 && u > 0.5 ? toText : fromText;
    return { v, text, color: v < 0 || (from <= 0) ? C.red : GREEN, flash };
  }
  // 撞上去的那一塊:「−25,000」從右上飛進來
  function chip(ctx, t, t0, text, from, to, size = 56) {
    if (t < t0 || t > t0 + 0.5) return;
    const u = seg(t, t0, t0 + 0.3), e = ease.inCubic(u), a = 1 - seg(t, t0 + 0.3, t0 + 0.5);
    const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - Math.sin(u * Math.PI) * 40;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(-0.08 + 0.08 * u);
    const tw = KIT.measure(ctx, text, size, NUMF) + 44;
    G.rrect(ctx, -tw / 2, -size * 0.75, tw, size * 1.4, 14, { fill: C.red, lw: 4, seed: 2110 });
    num(ctx, text, 0, size * 0.33, size, '#FFFFFF', 'center');
    ctx.restore();
    if (t >= t0 + 0.3) KIT.burst(ctx, to[0], to[1], 60, 120 + (t - t0 - 0.3) * 300, 1 - seg(t, t0 + 0.3, t0 + 0.5), 10, C.red, 7);
  }
  // 10. 「他以為會賺的那兩萬,當場變成負五千。」+ 小皇冠掉到地上
  const G10 = { x: 1040, y: 132, w: 800, h: 724, zero: 560, k: 11.5, axisX: 1170, seed: 2100 };
  function dropShot(ctx, t) {
    fabStill(ctx, 540, 1, 0.34);
    const F0 = ev.fall[1] - 0.9;
    const crossed = t >= F0 + 0.55, fallen = t >= ev.crownFall + 0.5;
    const o = { x: 430, y: KIT.L.ground, s: 1.05, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: crossed ? 'wide' : 'normal', mouth: crossed ? 'o' : 'smile', brows: crossed ? 'worried' : 'up',
      look: fallen ? 0.3 : 0.8, lookY: fallen ? 1 : -0.2, blink: crossed ? 0 : blink(t, 0.2), blush: 0.6, sweat: crossed ? 1 : 0 };
    KIT.person(ctx, o);
    crownOn(ctx, o, t, { tilt: 1, fall: { t0: ev.crownFall, x: 560, y: KIT.L.ground - 4 } });
    const a = popIn(t, ev.dropShot + 0.1, 0.35);
    if (a > 0) {
      ctx.save(); ctx.translate(G10.x + G10.w / 2, G10.y); ctx.scale(a, a); ctx.translate(-(G10.x + G10.w / 2), -G10.y);
      const hi = t >= ev.hi20 && t < ev.chip ? 1 + 0.08 * Math.sin((t - ev.hi20) * 9) : 1;
      const r = gauge(ctx, t, { ...G10, value: (tt) => ({ ...fallValue(tt, 20000, -5000, F0, ev.fall[1], '+20,000', '−5,000'), pop: tt < F0 ? hi : 1 }) });
      chip(ctx, t, ev.chip, '−25,000', [1960, 120], [r.px, 330 - 46]);
      ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }

  // ===================================== 11. 板車載高空車進廠 =====================================
  function exterior(ctx) {
    KIT.cached(ctx, 'u2ext', (x) => {
      fill(x, -100, -100, W + 200, 960, lin(x, 0, 0, 0, 860, [[0, '#A9D4EE'], [1, '#E6F3FA']]));
      for (const [cx, cy, r] of [[300, 210, 60], [380, 200, 80], [470, 215, 55]]) G.ellipse(x, cx, cy, r * 1.4, r * 0.6, { fill: '#FFFFFF', lw: 0, seed: 2200 + cx, alpha: 0.85 });
      // 遠處的樹與圍牆
      for (let k = 0; k < 9; k++) G.ellipse(x, 60 + k * 130, 660 - (k % 3) * 14, 90, 70, { fill: k % 2 ? '#7FB08A' : '#6FA27C', lw: 3, seed: 2210 + k });
      G.rrect(x, -40, 690, 1300, 90, 2, { fill: '#D9D2C4', lw: 4, seed: 2220 });
      fill(x, -100, 778, W + 200, 70, '#C9CCC6');                                                     // 人行道
      G.line(x, [[-40, 780], [W + 40, 780]], { color: '#8E99A3', lw: 4, seed: 2219 });
      for (let k = 0; k < 14; k++) G.line(x, [[-20 + k * 95, 690], [-20 + k * 95, 780]], { color: '#B8AE9A', lw: 3, seed: 2221 + k });
      // 廠房外牆(右)+ 大門
      G.rrect(x, 1180, 160, 800, 700, 4, { fill: '#DCE3E8', lw: 5, seed: 2240 });
      for (let k = 0; k < 9; k++) G.line(x, [[1200 + k * 90, 170], [1200 + k * 90, 850]], { color: '#BCC7CF', lw: 3, seed: 2241 + k });
      G.rrect(x, 1170, 140, 820, 40, 2, { fill: '#8E99A3', lw: 5, seed: 2250 });
      G.rrect(x, 1360, 420, 440, 440, 4, { fill: '#AEB9C3', lw: 5, seed: 2251 });
      for (let k = 1; k < 14; k++) G.line(x, [[1364, 420 + k * 31], [1796, 420 + k * 31]], { color: '#8E99A3', lw: 3, seed: 2252 + k });
      G.rrect(x, 1340, 400, 480, 30, 3, { fill: '#5C6470', lw: 4, seed: 2270 });
      // 地面
      fill(x, -100, 840, W + 200, 400, lin(x, 0, 840, 0, H, [[0, '#B5B9BD'], [1, '#8E9398']]));
      G.line(x, [[-40, 842], [W + 40, 842]], { color: C.ink, lw: 5, seed: 2280 });
      for (let k = 0; k < 8; k++) G.rrect(x, 40 + k * 250, 960, 140, 14, 3, { fill: '#F2F2EE', lw: 0, seed: 2281 + k, alpha: 0.85 });
    });
  }
  // 板車(側面,車頭朝右;不畫車牌、不畫任何標誌):(x, y) = 地面上車身中心
  function truck(ctx, x, y, t, moving) {
    const spin = moving ? t * 9 : 0;
    ctx.save(); ctx.translate(x, y);
    G.rrect(ctx, -560, -112, 820, 26, 4, { fill: '#5C6470', lw: 5, seed: 2300 });                  // 車架
    G.rrect(ctx, -560, -140, 810, 32, 4, { fill: '#8E99A3', lw: 5, seed: 2301 });                  // 平板
    G.rrect(ctx, 250, -330, 230, 220, 18, { fill: '#5E86A8', lw: 5, seed: 2302 });                 // 車頭
    G.rrect(ctx, 300, -312, 150, 92, 10, { fill: '#BFE0F2', lw: 4, seed: 2303 });                  // 車窗
    G.rrect(ctx, 250, -150, 236, 40, 6, { fill: '#4A6B88', lw: 4, seed: 2304 });
    G.rrect(ctx, 470, -170, 26, 30, 6, { fill: '#FFE9A0', lw: 3, seed: 2305 });                   // 車燈
    for (const wx of [-430, -300, 360]) { ctx.save(); ctx.translate(wx, -46); ctx.rotate(spin); G.ellipse(ctx, 0, 0, 48, 48, { fill: '#3A3A44', lw: 5, seed: 2310 + wx }); G.ellipse(ctx, 0, 0, 20, 20, { fill: '#8A8F98', lw: 3, seed: 2312 + wx }); stroke(ctx, [[-14, 0], [14, 0]], '#5C6470', 4); ctx.restore(); }
    // 平板上的高空作業車(收起來),兩條綁帶
    const L = KIT.lift(ctx, -170, -140, 0.62, 30, { seed: 2320 });
    for (const sd of [-1, 1]) stroke(ctx, [[-170 + sd * 90, -230], [-170 + sd * 210, -140]], '#E9A23B', 7);
    ctx.restore();
    return L;
  }
  const GC = { x: 1440, y: 140, w: 400, h: 560, zero: 330, k: 11.5, axisX: 1516, size: 50, pillW: 260, pillH: 78, titleSize: 44, seed: 2400 };
  function truckShot(ctx, t) {
    exterior(ctx);
    const u = ease.outCubic(seg(t, ev.drive[0], ev.drive[1])), tx = lerp(-600, 860, u);
    truck(ctx, tx, 842, t, u > 0 && u < 1);
    // 進場 → 、← 退場
    const chipLabel = (str, x, y, at, col, dir) => {
      if (t < at) return; const p = popIn(t, at, 0.3);
      ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
      const lw = KIT.measure(ctx, str, 44), tw = lw + 130;
      G.rrect(ctx, -tw / 2, -44, tw, 84, 42, { fill: col, lw: 4, seed: 2330 + x });
      label(ctx, str, -dir * 26, 15, 44, '#FFFFFF');                       // 字在一邊,箭頭在另一邊
      const ax = dir * (lw / 2 + 12);
      stroke(ctx, [[ax - dir * 8, 0], [ax + dir * 30, 0]], '#FFFFFF', 7);
      stroke(ctx, [[ax + dir * 14, -14], [ax + dir * 32, 0], [ax + dir * 14, 14]], '#FFFFFF', 7);
      ctx.restore();
    };
    chipLabel('進場', 1230, 462, ev.tripIn, C.green, 1);
    chipLabel('退場', 300, 600, ev.tripOut, '#7E7062', -1);
    // 算式卡:2 趟 × 4,500 = 9,000;比租一天還貴
    const a = popIn(t, ev.trips - 0.1, 0.35);
    if (a > 0) {
      ctx.save(); ctx.translate(420, 150); ctx.scale(a, a); ctx.translate(-420, -150);
      KIT.card(ctx, 90, 140, 680, 340, { fill: C.cream, seed: 2340, tape: true });
      label(ctx, '板車進場、退場', 430, 212, 40, C.muted);
      stroke(ctx, [[120, 238], [740, 238]], '#D8CDB4', 3);
      seqLine(ctx, t, [['2 趟', ev.trips], ['×', ev.price], ['4,500', ev.price]], 430, 312, 54);
      if (t >= ev.nine) { stroke(ctx, [[150, 340], [710, 340]], C.ink, 4); const p = popIn(t, ev.nine, 0.25); ctx.save(); ctx.translate(710, 402); ctx.scale(p, p); num(ctx, '= 9,000', 0, 0, 62, C.red, 'right'); ctx.restore(); }
      if (t >= ev.dearer) {
        const p = popIn(t, ev.dearer, 0.3);
        ctx.save(); ctx.translate(430, 456); ctx.scale(p, p);
        label(ctx, '一趟 4,500 ＞ 租一天 2,500', 0, 0, 36, C.red);
        ctx.restore();
      }
      ctx.restore();
    }
    // 利潤格(縮小):−5,000 → −14,000
    const ga = popIn(t, ev.drop2[0] - 0.75, 0.35);
    if (ga > 0) {
      ctx.save(); ctx.translate(GC.x + GC.w / 2, GC.y); ctx.scale(ga, ga); ctx.translate(-(GC.x + GC.w / 2), -GC.y);
      const r = gauge(ctx, t, { ...GC, value: (tt) => fallValue(tt, -5000, -14000, ev.drop2[1] - 0.55, ev.drop2[1], '−5,000', '−14,000') });
      chip(ctx, t, ev.drop2[1] - 0.85, '−9,000', [1000, 150], [r.px, GC.zero - (-5000) / 1000 * GC.k - 40], 48);
      ctx.restore();
    }
    KIT.warm(ctx, { color: 'rgba(255,240,210,0.12)' });
  }

  // ===================================== 12. 月曆與計費表 =====================================
  const IDLE = [1, 5, 8]; // 高空車停在現場沒在用的那幾天
  function liftIcon(ctx, x, y, s, gray, seed) {
    ctx.save(); if (gray) ctx.globalAlpha *= 0.55;
    KIT.lift(ctx, x, y, s, 40, { seed });
    ctx.restore();
  }
  function calendarShot(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, 0, H, [[0, '#F1E8D8'], [1, '#E3D5BC']]));
    // 月曆:兩週,週末灰掉;十個工作天都有一台高空車
    KIT.card(ctx, 80, 130, 1180, 760, { seed: 2500 });
    G.rrect(ctx, 80, 130, 1180, 96, 6, { fill: C.red, lw: 4, seed: 2501 });
    label(ctx, '高空作業車　租期', 670, 196, 50, '#FFFFFF');
    const cx0 = 110, cy0 = 250, cw = 160, ch = 300;
    let day = 0;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) {
      const x = cx0 + c * cw, y = cy0 + r * ch, weekend = c >= 5;
      G.rrect(ctx, x + 6, y + 6, cw - 12, ch - 12, 8, { fill: weekend ? '#E4DED2' : '#FFFDF4', lw: 3, seed: 2510 + r * 7 + c });
      if (weekend) continue;
      const k = day++, idle = IDLE.includes(k), at = ev.dayT[k], on = t >= at;
      if (idle && on && t < at + 0.6) { ctx.save(); ctx.globalAlpha *= 0.14 * (1 - (t - at) / 0.6); fill(ctx, x + 6, y + 6, cw - 12, ch - 12, C.red); ctx.restore(); } // 沒在用的那天:閃一下紅
      liftIcon(ctx, x + cw / 2, y + 166, 0.27, idle, 2520 + k * 7);
      if (idle) { // 沒在用:停著,上面幾個 z
        label(ctx, 'z', x + cw / 2 + 40, y + 52, 34, '#5E5247'); label(ctx, 'z', x + cw / 2 + 60, y + 30, 40, '#5E5247');
        label(ctx, '沒在用', x + cw / 2, y + 214, 34, '#5E5247');
      }
      if (on) { // 這一天照樣計費
        const p = popIn(t, at, 0.25);
        ctx.save(); ctx.translate(x + cw / 2, y + 270); ctx.scale(p, p); num(ctx, '2,500', 0, 0, 36, C.red, 'center'); ctx.restore();
        const cur = t < at + 0.45 ? 1 - (t - at) / 0.45 : 0;
        if (cur > 0) { ctx.save(); ctx.globalAlpha *= cur; ctx.strokeStyle = '#F0A800'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cw - 4, ch - 4, 12); ctx.stroke(); ctx.restore(); }
      }
    }
    // 計費表
    const mx = 1340, my = 250;
    G.rrect(ctx, mx, my, 480, 470, 26, { fill: '#3E4A5C', lw: 6, seed: 2600 });
    label(ctx, '計費表', mx + 240, my + 70, 46, '#FFFFFF');
    G.rrect(ctx, mx + 40, my + 110, 400, 130, 12, { fill: '#162018', lw: 5, seed: 2601 });
    num(ctx, '2,500 / 天', mx + 240, my + 194, 54, '#7CF29A', 'center');
    const lamp = 0.5 + 0.5 * Math.sin(t * 7);
    G.rrect(ctx, mx + 120, my + 290, 240, 70, 35, { fill: KIT.mix('#7A2A20', '#E8452F', lamp), lw: 4, seed: 2602 });
    label(ctx, '計費中', mx + 240, my + 338, 38, '#FFFFFF');
    ev.dayT.forEach((at) => { // 每一天跳一次「+2,500」
      if (t < at || t > at + 0.42) return;
      const u = (t - at) / 0.42;
      ctx.save(); ctx.globalAlpha *= 1 - u * u * u; num(ctx, '+2,500', mx + 240, my + 438 - u * 40, 46, '#FFD75E', 'center', { stroke: '#3E4A5C', strokeW: 8 }); ctx.restore();
    });
    KIT.warm(ctx, { color: 'rgba(255,214,140,0.12)', floor: 0.18 });
  }

  // ===================================== 13. 拍拍肩膀,阿樹眼眶含淚定格 =====================================
  function patShot(ctx, t) {
    const frozen = t >= ev.freeze, tf = frozen ? ev.freeze : t;
    const saveT = G.t, saveB = G.boil;
    if (frozen) G.setTime(tf);
    // 鏡頭:慢慢推近;定格那一刻再往前推一下(畫在這裡,定格的白框才不會跟著放大)
    const z = frozen ? 1.09 : lerp(1.0, 1.03, ease.inOutQuad(seg(t, ev.patShot, ev.freeze)));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    fabStill(ctx, 420, 1, 0.4);
    const m = mouth('master', tf);
    const pat = tf >= ev.pat[0] - 0.3;
    const bob = tf >= ev.pat[0] && tf < ev.pat[1] + 0.2 ? Math.abs(Math.sin((tf - ev.pat[0]) / 0.32 * Math.PI)) * 16 : 0;
    const so = { x: 760, y: 1190, s: 1.35, pose: 'stand', style: CAST.shuSite, seed: 400, eyes: 'normal', mouth: 'wavy', brows: 'worried', look: 0.3, lookY: 0.4, headY: 4,
      blink: 0, blush: 0.85, shadow: false };
    const mo = { x: 1170, y: 1190, s: 1.35, sx: -1, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: m || 'flat', brows: 'neutral', look: 0.65, lookY: 0.2, blink: blink(tf, 0.6), shadow: false };
    const pr = ease.inOutCubic(seg(tf, ev.pat[0] - 0.4, ev.pat[0] - 0.05));
    if (pat) mo.handR = KIT.hand(mo.x, mo.y, mo.s, -1, lerp(1080, 852, pr), lerp(1000, 770 - bob, pr));
    KIT.person(ctx, so);
    tears(ctx, so, 0.4 + 0.6 * seg(tf, ev.pat[0], ev.pat[1] + 0.8), tf);
    KIT.person(ctx, mo);
    G.t = saveT; G.boil = saveB;
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
    ctx.restore();
    if (frozen) { // 定格:一下閃光,顏色淡一點,四周壓暗
      const d = t - ev.freeze;
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.55; ctx.fillStyle = '#808080'; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore();
      fill(ctx, -100, -100, W + 200, H + 200, 'rgba(255,236,200,0.10)');
      if (d < 0.35) fill(ctx, -100, -100, W + 200, H + 200, `rgba(255,252,240,${0.75 * (1 - d / 0.35)})`);
      ctx.save(); ctx.strokeStyle = 'rgba(255,253,244,0.95)'; ctx.lineWidth = 22; ctx.strokeRect(11, 11, W - 22, H - 22); ctx.restore();
    }
  }

  // ===================================== 14. 會勘路線三格 =====================================
  const PANELS = [{ x: 70 }, { x: 680 }, { x: 1290 }].map((p) => ({ ...p, y: 250, w: 560, h: 610 }));
  function priceTag(ctx, x, y, a, t, seed) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a); ctx.rotate(0.12 + Math.sin(t * 3 + seed) * 0.04);
    G.poly(ctx, [[-70, -44], [64, -44], [100, 0], [64, 44], [-70, 44]], { fill: C.red, lw: 5, seed });
    G.ellipse(ctx, 66, 0, 9, 9, { fill: '#FFFDF4', lw: 3, seed: seed + 1 });
    label(ctx, '？元', -6, 18, 50, '#FFFFFF');
    ctx.restore();
  }
  function panel1(ctx, t, P) { // 大門口的卸貨區,離施工點很遠
    const { x, y, w, h } = P, hz = y + 290;
    fill(ctx, x, y, w, hz - y, lin(ctx, 0, y, 0, hz, [[0, '#CFE7F5'], [1, '#EAF4FA']]));
    fill(ctx, x, hz, w, y + h - hz, lin(ctx, 0, hz, 0, y + h, [[0, '#C9CDD1'], [1, '#A9AFB5']]));
    G.line(ctx, [[x, hz], [x + w, hz]], { color: '#8E99A3', lw: 4, seed: 2699 });
    // 往遠處縮小的廠區道路
    G.poly(ctx, [[x + 120, y + h], [x + 430, y + h], [x + 322, hz], [x + 278, hz]], { fill: '#9AA1A8', lw: 3, seed: 2698 });
    // 遠方的廠房(施工點)+ 紅色圖釘
    G.rrect(ctx, x + 240, y + 220, 120, 70, 4, { fill: '#DCE3E8', lw: 4, seed: 2700 });
    G.poly(ctx, [[x + 230, y + 222], [x + 300, y + 188], [x + 370, y + 222]], { fill: '#AEB9C3', lw: 4, seed: 2701 });
    const bob = Math.sin(t * 4) * 4;
    stroke(ctx, [[x + 300, y + 178 + bob], [x + 300, y + 150 + bob]], C.red, 6);
    G.ellipse(ctx, x + 300, y + 138 + bob, 18, 18, { fill: C.red, lw: 4, seed: 2740 });
    label(ctx, '施工點', x + 300, y + 100, 38, C.red);
    // 大門口(左邊前景):門柱、拉門、門牌
    G.rrect(ctx, x + 24, y + 330, 44, 270, 4, { fill: '#8E99A3', lw: 4, seed: 2702 });
    for (let k = 0; k < 6; k++) G.line(ctx, [[x + 84 + k * 26, y + 380], [x + 84 + k * 26, y + 590]], { color: '#6C7680', lw: 5, seed: 2710 + k });
    for (const yy of [y + 380, y + 590]) G.line(ctx, [[x + 68, yy], [x + 230, yy]], { color: '#6C7680', lw: 6, seed: 2720 + yy });
    G.rrect(ctx, x + 14, y + 300, 170, 56, 6, { fill: '#FFFDF4', lw: 4, seed: 2725 });
    label(ctx, '大門口', x + 99, y + 342, 38, C.ink);
    // 卸貨區(門內):一疊管子放在棧板上
    ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = '#E0A800'; ctx.lineWidth = 6; ctx.strokeRect(x + 250, y + 482, 280, 110); ctx.restore();
    G.rrect(ctx, x + 290, y + 556, 200, 22, 3, { fill: '#B98A5E', lw: 3.5, seed: 2730 });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++) G.ellipse(ctx, x + 314 + k * 30 + r * 15, y + 541 - r * 24, 13, 13, { fill: '#D9DEE3', lw: 3, seed: 2731 + r * 7 + k });
    label(ctx, '卸貨區', x + 465, y + 468, 36, '#8A6200', { stroke: '#FFFFFF', strokeW: 8 });
    // 從卸貨區走到施工點:很長一段路
    const pts = [[x + 300, y + 478], [x + 316, y + 420], [x + 292, y + 350], [x + 302, y + 300], [x + 300, y + 196]];
    ctx.save(); ctx.setLineDash([16, 14]); ctx.lineDashOffset = -t * 40; stroke(ctx, pts, C.red, 7); ctx.restore();
    label(ctx, '很遠', x + 450, y + 392, 46, C.ink, { stroke: '#FFFFFF', strokeW: 10 });
  }
  function panel2(ctx, t, P) { // 師傅指著天花板上既有的主管與一顆關斷閥;新管要接上去,得先停氣
    const { x, y, w, h } = P;
    fill(ctx, x, y, w, h, lin(ctx, 0, y, 0, y + h, [[0, '#C3CED7'], [0.8, '#E2E8ED'], [0.81, '#BCCAC4'], [1, '#A4B2AD']]));
    G.rrect(ctx, x, y, w, 40, 0, { fill: '#8E99A3', lw: 4, seed: 2800 });
    for (const hx of [x + 110, x + 450]) stroke(ctx, [[hx, y + 40], [hx, y + 128]], '#5C6470', 5);
    KIT.pipeRun(ctx, x - 10, x + w + 10, y + 140, 46, '#D9DEE3', 2801);                        // 既有主管
    const vx = x + 300, vy = y + 140;                                                           // 關斷閥
    G.rrect(ctx, vx - 34, vy - 36, 68, 72, 10, { fill: '#7F8B96', lw: 4, seed: 2802 });
    G.rrect(ctx, vx - 6, vy - 84, 12, 50, 3, { fill: '#5C6470', lw: 3, seed: 2803 });
    G.ellipse(ctx, vx, vy - 88, 40, 12, { fill: C.red, lw: 4, seed: 2804 });
    const glow = 0.55 + 0.45 * Math.sin(t * 6);
    ctx.save(); ctx.globalAlpha *= glow; ctx.strokeStyle = '#F0A800'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(vx, vy - 30, 92, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // 新管(藍色虛線)從右邊接上主管
    ctx.save(); ctx.setLineDash([24, 14]); ctx.lineDashOffset = -t * 40; stroke(ctx, [[x + w + 10, y + 390], [x + 445, y + 390], [x + 445, y + 168]], C.pipe, 14); ctx.restore();
    label(ctx, '既有主管', x + 120, y + 215, 36, C.ink);
    label(ctx, '關斷閥', vx - 10, vy + 92, 36, C.ink);
    // 「停氣」牌
    if (t >= ev.stopGas) {
      const a = popIn(t, ev.stopGas, 0.3), sw = Math.sin((t - ev.stopGas) * 5) * 0.2 * Math.exp(-(t - ev.stopGas) * 2);
      ctx.save(); ctx.translate(vx + 66, vy + 24); ctx.rotate(sw); ctx.scale(a, a);
      stroke(ctx, [[0, 0], [0, 104]], C.ink, 3);
      G.rrect(ctx, -55, 104, 110, 66, 8, { fill: '#FFFFFF', lw: 4, seed: 2810 });
      G.rrect(ctx, -49, 110, 98, 54, 6, { fill: C.red, lw: 0, seed: 2811 });
      label(ctx, '停氣', 0, 150, 38, '#FFFFFF');
      ctx.restore();
    }
    // 陳師傅(白帽)指著關斷閥
    const o = { x: x + 150, y: y + h - 20, s: 0.62, pose: 'stand', style: CAST.masterSite, seed: 440, eyes: 'normal', mouth: 'flat', brows: 'up', look: 0.4, lookY: -1, headY: -4, blink: blink(t, 0.6), gesture: 'pointUp' };
    o.handR = KIT.hand(o.x, o.y, o.s, 1, vx - 90, vy + 40);
    KIT.person(ctx, o);
  }
  function panel3(ctx, t, P) { // 警衛室牆上的「入廠安全訓練」公告
    const { x, y, w, h } = P;
    fill(ctx, x, y, w, h, lin(ctx, 0, y, 0, y + h, [[0, '#CFE7F5'], [1, '#EAF4FA']]));
    G.rrect(ctx, x + 20, y + 120, w - 40, h - 150, 4, { fill: '#EFE3CC', lw: 5, seed: 2900 });
    G.rrect(ctx, x + 6, y + 90, w - 12, 50, 4, { fill: '#8E6444', lw: 5, seed: 2901 });
    G.rrect(ctx, x + 150, y + 30, 250, 66, 6, { fill: '#FFFDF4', lw: 4, seed: 2902 });
    label(ctx, '警衛室', x + 275, y + 78, 40, C.ink);
    G.rrect(ctx, x + 50, y + 200, 190, 150, 6, { fill: '#BFE0F2', lw: 5, seed: 2903 });
    G.line(ctx, [[x + 145, y + 200], [x + 145, y + 350]], { color: C.ink, lw: 4, seed: 2904 });
    G.rrect(ctx, x + 40, y + 350, 210, 18, 3, { fill: '#B98A5E', lw: 4, seed: 2905 });
    fill(ctx, x + 20, y + h - 30, w - 40, 30, '#B3B8BD');
    // 公告
    const px = x + 270, py = y + 190;
    G.rrect(ctx, px, py, 270, 330, 6, { fill: '#FFFFFF', lw: 4, seed: 2910 });
    for (const sx of [px + 30, px + 240]) G.ellipse(ctx, sx, py + 14, 9, 9, { fill: C.red, lw: 3, seed: 2911 + sx });
    G.rrect(ctx, px + 10, py + 28, 250, 62, 4, { fill: C.blue, lw: 0, seed: 2913 });
    label(ctx, '入廠安全訓練', px + 135, py + 72, 38, '#FFFFFF');
    KIT.hungHelmet(ctx, px + 70, py + 160, C.yellow, 2920);
    for (let k = 0; k < 3; k++) G.line(ctx, [[px + 140, py + 130 + k * 26], [px + 240 - k * 18, py + 130 + k * 26]], { color: '#B8AE9A', lw: 5, seed: 2930 + k, amp: 0.3 });
    // 一整天:時鐘
    const cx = px + 62, cy = py + 270;
    G.ellipse(ctx, cx, cy, 30, 30, { fill: '#FFFDF4', lw: 4, seed: 2940 });
    stroke(ctx, [[cx, cy], [cx, cy - 18]], C.ink, 4); stroke(ctx, [[cx, cy], [cx + 14, cy + 6]], C.ink, 4);
    label(ctx, '一整天', px + 170, cy + 13, 38, C.red);
  }
  function panelsShot(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, 0, H, [[0, '#F6EBD3'], [1, '#EBDBB8']]));
    for (let k = 0; k < 9; k++) G.line(ctx, [[-40, 150 + k * 100], [W + 40, 150 + k * 100]], { color: '#D9C7A2', lw: 3, seed: 2990 + k, alpha: 0.5 });
    label(ctx, '會勘路線', 90, 196, 52, C.ink, { align: 'left' });
    // 一路走下去:虛線 + 腳印
    const ru = seg(t, ev.route[0], ev.route[1]);
    if (ru > 0) {
      const R = [[330, 178], [1820, 178]], P = KIT.partial(R, ru);
      ctx.save(); ctx.setLineDash([20, 16]); stroke(ctx, P, 'rgba(200,69,47,0.85)', 7); ctx.restore();
      const tip = P[P.length - 1];
      for (let k = 0; tip[0] - 60 - k * 90 > 340 && k < 20; k++) { const fx = tip[0] - 60 - k * 90, fy = 178 + (k % 2 ? -18 : 18); G.ellipse(ctx, fx, fy, 14, 9, { fill: 'rgba(58,42,32,0.45)', lw: 0, seed: 2995 + k }); }
    }
    const qs = [ev.q1, ev.q2, ev.q3], ps = [ev.p1, ev.p2, ev.p3], draws = [panel1, panel2, panel3];
    PANELS.forEach((P, k) => {
      const at = ev.frames + k * 0.25;
      if (t < at) return;
      const a = popIn(t, at, 0.3);
      ctx.save(); ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.scale(a, a); ctx.rotate([-0.012, 0.008, -0.006][k]); ctx.translate(-(P.x + P.w / 2), -(P.y + P.h / 2));
      G.rrect(ctx, P.x - 10, P.y - 10, P.w + 20, P.h + 20, 6, { fill: '#FFFDF4', lw: 5, seed: 3000 + k });
      const f = clamp((t - ps[k]) / 0.35);
      if (f < 1) { fill(ctx, P.x, P.y, P.w, P.h, '#EFE6D2'); label(ctx, '？', P.x + P.w / 2, P.y + P.h / 2 + 40, 120, '#76664C'); }
      if (f > 0) { ctx.save(); ctx.globalAlpha *= f; ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip(); draws[k](ctx, t, P); ctx.restore(); }
      stroke(ctx, [[P.x, P.y], [P.x + P.w, P.y], [P.x + P.w, P.y + P.h], [P.x, P.y + P.h], [P.x, P.y]], C.ink, 5);
      ctx.restore();
      priceTag(ctx, P.x + P.w - 96, P.y + 52, popIn(t, qs[k], 0.35), t, 3050 + k * 5);
    });
    KIT.warm(ctx, { color: 'rgba(255,214,140,0.10)', floor: 0.16 });
  }

  const film = Shots.film([
    { at: ev.ch2, draw: (ctx, t) => KIT.chapterCard(ctx, t, ev.ch2, { n: 2, title: '天花板上的那一行' }) },
    { at: ev.ch2 + S.CHAPTER, draw: fabWalk, in: 'cut' },
    { at: ev.ask1, draw: askShot, in: 'cut', cam: Shots.push(1.0, 1.04) },
    { at: ev.two, draw: (ctx, t) => twoShot(ctx, t, 'up'), in: 'cut', cam: Shots.push(1.0, 1.03) },
    { at: ev.wide, draw: rulerShot, in: 'cut' },
    { at: ev.turnShot, draw: (ctx, t) => twoShot(ctx, t, 'turn'), in: 'cut', cam: Shots.push(1.0, 1.05) },
    { at: ev.flipShot, draw: flipShot, in: 'cut' },
    { at: ev.whisper, draw: tinyLadderShot, in: 'cut', cam: Shots.push(1.0, 1.04) },
    { at: ev.cross, draw: crossShot, in: 'cut' },
    { at: ev.figA, draw: figAShot, in: 'zoom', cam: Shots.push(1.0, 1.02) },
    { at: ev.dropShot, draw: dropShot, in: 'cut', cam: Shots.shake(14, ev.fall[1], 7) },
    { at: ev.truckShot, draw: truckShot, in: 'paper' },
    { at: ev.calShot, draw: calendarShot, in: 'zoom', cam: Shots.push(1.0, 1.03) },
    { at: ev.patShot, draw: patShot, in: 'paper' },
    { at: ev.panels, draw: panelsShot, in: 'paper' },
  ]);

  Studio.film({
    post: { vignette: 0.16, grain: 0.035, paper: 0.3 },
    fadeOut: 0, // 單元之間直接接下一個單元的章卡,不淡出成黑畫面
    async init() { VO = await Studio.loadJSON('out/voice.json'); CAPS = KIT.buildCaptions(VO); globalThis.CAPS = CAPS; },
    draw(ctx, t) {
      film(ctx, t);
      KIT.badge(ctx, t);              // 第 2 單元以後:每一格都有右上角角標(章卡也要)
      KIT.drawCaption(ctx, t, CAPS);
    },
  });
})();
