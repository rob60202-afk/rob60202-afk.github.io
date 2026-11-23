// L003〈報價單上漏掉的那一行〉第 3 單元:第 3 章「成本是一棟六層樓」。
// 畫風、角色、背景、表格、字幕都來自 longform-kit.js(KIT);這裡只排這個單元的鏡頭與這個單元才有的圖(白板上的樓、【圖 B】、圖示)。
// 每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { A, E, ev, when } = S;
  const { W, H, C, CAST } = KIT;
  const { label, popIn, blink, stroke, fill, lin } = KIT;
  const CJK = KIT.CJK, NUM = KIT.NUM;
  let VO = null, CAPS = [];
  const mouth = (who, t, from) => KIT.mouth(VO, t, who, from);
  const fadeIn = (t, t0, d = 0.25) => clamp((t - t0) / d);
  const MK = { blue: '#2B5FA8', red: '#C8452F' }; // 馬克筆:藍(師傅畫的外框、阿樹寫的字)、紅(師傅後來補的)

  // ---------- 小工具 ----------
  function walkTo(t, t0, t1, x0, x1, s) {
    if (t <= t0) return { x: x0, pose: 'stand' };
    if (t >= t1) return { x: x1, pose: 'stand' };
    const x = lerp(x0, x1, ease.inOutQuad((t - t0) / (t1 - t0)));
    return { x, pose: 'walk', walk: (Math.abs(x - x0) / (300 * s)) % 1 };
  }
  // 左對齊 / 置中的中文字(不抖)
  const txt = (ctx, str, x, y, size, color = C.ink, align = 'left', o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align, boil: 0, ...o });
  const num = (ctx, str, x, y, size, color = C.ink, align = 'center', o = {}) => G.text(ctx, str, x, y, { size, fam: NUM, weight: 800, color, align, boil: 0, ...o });
  // 一顆金幣(ring = 內圈顏色:哪一層的錢)
  function coin(ctx, x, y, r, a = 1, ring = '#C9971A', seed = 2500) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    G.ellipse(ctx, x, y, r, r, { fill: '#F2C94C', lw: 3, seed, amp: 0.5 });
    ctx.lineWidth = Math.max(2.5, r * 0.2); ctx.strokeStyle = ring; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    stroke(ctx, [[x - r * 0.55, y - r * 0.2], [x - r * 0.3, y - r * 0.55]], '#FFF6C8', Math.max(2, r * 0.16), 0.9);
    ctx.restore();
  }
  // 馬克筆:(x, y) = 筆尖;rot = 筆身朝向(0 = 筆身往右)
  function marker(ctx, x, y, rot, s = 1, color = MK.blue, seed = 1600) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.poly(ctx, [[0, 0], [18, -8], [18, 8]], { fill: color, lw: 3, seed, amp: 0.4 });
    G.rrect(ctx, 16, -12, 30, 24, 4, { fill: '#2E3440', lw: 3, seed: seed + 1, amp: 0.4 });
    G.rrect(ctx, 42, -14, 100, 28, 8, { fill: '#F4F6F8', lw: 3.5, seed: seed + 2, amp: 0.4 });
    fill(ctx, 74, -12, 22, 24, color);
    G.rrect(ctx, 138, -15, 22, 30, 6, { fill: color, lw: 3.5, seed: seed + 4, amp: 0.4 });
    ctx.restore();
  }
  // 特寫裡從畫面外伸進來的手臂 + 拿著馬克筆的手(tip = 筆尖;dir = 筆身朝向(筆尖 → 拳頭);from = 手臂從畫面外的哪裡來)
  //   longSleeve:長袖(師傅)只露出手腕;短袖(阿樹)前臂都是皮膚,袖子在畫面邊上
  function armWithMarker(ctx, tip, dir, from, { sleeve, skin, longSleeve = false, color = MK.blue, seed = 1700 } = {}) {
    const dx = Math.cos(dir), dy = Math.sin(dir);
    const hx = tip[0] + dx * 118, hy = tip[1] + dy * 118;          // 拳頭握在筆身中段
    const L = Math.hypot(from[0] - hx, from[1] - hy) || 1, ux = (from[0] - hx) / L, uy = (from[1] - hy) / L;
    const at = (d) => [hx + ux * d, hy + uy * d];
    const cuff = longSleeve ? 64 : 330;                              // 袖口離拳頭多遠
    G.limb(ctx, [[hx, hy], at(cuff + 24)], { color: skin, lw: 66, seed });
    G.limb(ctx, [at(cuff), from], { color: sleeve, lw: 94, seed: seed + 1 });
    marker(ctx, tip[0], tip[1], dir, 1, color, seed + 10);
    G.ellipse(ctx, hx, hy, 48, 42, { fill: skin, lw: 4.5, seed: seed + 2 });
    for (let k = -1; k <= 1; k++) { const px = hx - dy * k * 16 + dx * 18, py = hy + dx * k * 16 + dy * 18; stroke(ctx, [[px, py], [px + dx * 16, py + dy * 16]], 'rgba(120,70,40,0.45)', 3); } // 指節
    G.ellipse(ctx, hx - dx * 26 + dy * 22, hy - dy * 26 - dx * 22, 19, 13, { fill: skin, lw: 3.5, seed: seed + 3 }); // 大拇指壓在筆上
  }
  const ARM_FROM = [-330, 1280], ARM_DIR = 2.45; // 兩個人都站在樓房左邊:手從左下伸進來,筆身朝左下

  // ===================================== 白板上的六層樓(馬克筆) =====================================
  // 樓房自己的座標:寬 400、每層 80、地面 y = 0。兩人中景 s = 1;白板特寫 s = 1.45
  const TWO = { cx: 1300, bottom: 700, s: 1 };
  const CLOSE = { cx: 960, bottom: 870, s: 1.45 };
  const BOARD = [640, 140, 1180, 600];
  const OUT = S.outline;
  // 畫到 u(0..1)時:已經畫好的筆畫與筆尖位置
  function outlineState(u) {
    let left = u * OUT.total; const parts = []; let tip = OUT.paths[0][0];
    for (let k = 0; k < OUT.paths.length && left > 0; k++) {
      const f = Math.min(1, left / OUT.lens[k]), P = KIT.partial(OUT.paths[k], f);
      parts.push(P); tip = P[P.length - 1]; left -= OUT.lens[k];
      if (left > 0 && k + 1 < OUT.paths.length) { const g = Math.min(1, left / OUT.lift), nx = OUT.paths[k + 1][0]; tip = [lerp(tip[0], nx[0], g), lerp(tip[1], nx[1], g)]; left -= OUT.lift; }
    }
    return { parts, tip };
  }
  // 寫字:w 0..1 由左到右寫出來,回傳筆尖(樓房座標)
  function markerText(ctx, str, x, y, size, color, w = 1) {
    if (w <= 0) return null;
    const tw = KIT.measure(ctx, str, size), x0 = x - tw / 2;
    ctx.save();
    if (w < 1) { ctx.beginPath(); ctx.rect(x0 - 12, y - size * 1.3, tw * w + 12, size * 1.8); ctx.clip(); }
    G.text(ctx, str, x0, y, { size, fam: CJK, weight: 800, color, align: 'left', boil: 0 });
    ctx.restore();
    return [x0 + tw * Math.min(1, w), y - size * 0.32 + Math.sin(w * 26) * size * 0.28];
  }
  const fy = (k) => -80 * k + 40; // 第 k 層的中心(樓房座標)
  // 這一刻白板上寫了什麼(兩人中景與特寫共用,所以前後鏡頭一致)
  function boardLabels(t) {
    if (t >= ev.back) return [ // 回到白板(第 11 句起):師傅已經把樓補好,中間兩層用紅筆
      { k: 1, text: '材料', color: MK.blue, w: 1 }, { k: 2, text: '工資', color: MK.blue, w: 1 },
      { k: 3, text: '機具與耗材', color: MK.red, w: 1 }, { k: 4, text: '間接費用', color: MK.red, w: 1 },
      { k: 5, text: '利潤', color: MK.blue, w: 1 }, { k: 6, text: '稅', color: MK.blue, w: 1 },
    ];
    const ws = ev.w.map(([a, b]) => clamp((t - a) / Math.max(0.15, b - a + 0.06)));
    return [{ k: 1, text: '材料', w: ws[0] }, { k: 2, text: '工資', w: ws[1] }, { k: 5, text: '利潤', w: ws[2] }, { k: 6, text: '稅', w: ws[3] }].map((l) => ({ ...l, color: MK.blue }));
  }
  // o = { cx, bottom, s };回傳筆尖的畫面座標(還在畫外框或寫字的時候)
  function boardBuilding(ctx, t, o) {
    const s = o.s, lw = 6;
    const toWorld = (p) => (p ? [o.cx + p[0] * s, o.bottom + p[1] * s] : null);
    ctx.save(); ctx.translate(o.cx, o.bottom); ctx.scale(s, s);
    let tip = null;
    const u = clamp((t - ev.draw[0]) / (ev.draw[1] - ev.draw[0]));
    if (u < 1) { // 第 1 句:一筆一筆畫外框
      const st = outlineState(u);
      st.parts.forEach((P) => stroke(ctx, P, MK.blue, lw));
      if (t >= ev.draw[0]) tip = st.tip;
      ctx.restore();
      return { tip: toWorld(tip) };
    }
    // 第 2 句:「一層一層蓋上去」:由下往上一層一層塗上淡黃色
    if (t >= ev.layers[0] && t < ev.offer + 0.6) {
      const dt = (ev.layers[1] - ev.layers[0]) / 6, out = 1 - clamp((t - ev.offer - 0.2) / 0.4);
      for (let k = 1; k <= 6; k++) { const a = clamp((t - ev.layers[0] - (k - 1) * dt) / 0.25) * out; if (a > 0) { ctx.save(); ctx.globalAlpha *= a * 0.75; fill(ctx, -196, -80 * k + 4, 392, 72 * clamp((t - ev.layers[0] - (k - 1) * dt) / 0.25), '#FFE9A0'); ctx.restore(); } }
    }
    // 第 3 句末「四層」:寫了字的四層一層一層亮一下
    if (t >= ev.four && t < ev.four + 1.2) [1, 2, 5, 6].forEach((k, j) => { const a = Math.sin(Math.PI * clamp((t - ev.four - j * 0.09) / 0.45)); if (a > 0) { ctx.save(); ctx.globalAlpha *= a * 0.7; fill(ctx, -196, -80 * k + 4, 392, 72, '#BFE3FF'); ctx.restore(); } });
    // 第 11 句:第五層切成兩半,左半「管理費」右半「利潤」,一邊講一邊亮
    const split = t >= ev.back ? clamp((t - ev.split) / 0.45) : 0;
    if (split > 0) {
      const hl = (x, a, col) => { if (a > 0) { ctx.save(); ctx.globalAlpha *= a * 0.8; fill(ctx, x, -396, 196, 72, col); ctx.restore(); } };
      hl(-198, fadeIn(t, ev.mgmt, 0.3) * (1 - fadeIn(t, ev.profit - 0.1, 0.3)), '#FFE9A0');
      hl(2, fadeIn(t, ev.profit, 0.3) * (1 - fadeIn(t, ev.oneLine, 0.3)), '#C7EBC5');
    }
    // 第 4 句:中間空兩層(紅色虛線閃);「塌」:上面兩層掉下來,中間兩層壓扁
    const c = t >= ev.fall && t < ev.back ? clamp((t - ev.fall) / 0.42) : 0, cb = ease.outBounce(c);
    const midH = lerp(160, 30, cb), drop = 160 - midH, tilt = -0.07 * cb;
    // 下面兩層 + 地面
    stroke(ctx, [[-262, 0], [262, 0]], MK.blue, lw);
    stroke(ctx, [[-200, -160], [-200, 0]], MK.blue, lw); stroke(ctx, [[200, -160], [200, 0]], MK.blue, lw);
    stroke(ctx, [[-200, -80], [200, -80]], MK.blue, lw);
    // 中間兩層:正常 → 壓扁成鋸齒
    if (c <= 0) { stroke(ctx, [[-200, -320], [-200, -160]], MK.blue, lw); stroke(ctx, [[200, -320], [200, -160]], MK.blue, lw); stroke(ctx, [[-200, -160], [200, -160]], MK.blue, lw); stroke(ctx, [[-200, -240], [200, -240]], MK.blue, lw); }
    else {
      stroke(ctx, [[-200, -160], [200, -160]], MK.blue, lw);
      for (const sd of [-1, 1]) { const P = []; for (let j = 0; j <= 6; j++) P.push([sd * 200 + (j % 2 ? sd * 26 * cb : 0) + sd * 10 * cb, -160 - midH * j / 6]); stroke(ctx, P, MK.blue, lw); }
      const P = []; for (let j = 0; j <= 10; j++) P.push([-200 + 40 * j, -160 - midH * 0.5 + (j % 2 ? -1 : 1) * 10 * cb]); stroke(ctx, P, MK.blue, lw - 1);
    }
    if (t >= ev.gap && t < ev.fall + 0.05) { // 中間兩層:紅色虛線框閃
      const fl = (0.55 + 0.45 * Math.sin((t - ev.gap) * 10)) * fadeIn(t, ev.gap, 0.2);
      ctx.save(); ctx.globalAlpha *= fl; ctx.fillStyle = 'rgba(200,69,47,0.12)'; ctx.fillRect(-192, -312, 384, 144); ctx.setLineDash([16, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.strokeRect(-192, -312, 384, 144); ctx.restore();
    }
    // 上面兩層 + 屋頂 + 水塔:塌的時候往下掉、歪一點
    ctx.save(); ctx.translate(-200, -320); ctx.translate(0, drop); ctx.rotate(tilt); ctx.translate(200, 320);
    stroke(ctx, [[-200, -320], [200, -320]], MK.blue, lw); stroke(ctx, [[-200, -400], [200, -400]], MK.blue, lw);
    stroke(ctx, [[-200, -320], [-200, -480], [200, -480], [200, -320]], MK.blue, lw);
    OUT.paths.slice(7).forEach((P) => stroke(ctx, P, MK.blue, lw));
    if (split > 0) stroke(ctx, KIT.partial([[0, -400], [0, -320]], ease.outCubic(split)), MK.red, lw);
    ctx.restore();
    // 字(上面兩層的字跟著掉)
    const labels = boardLabels(t);
    for (const l of labels) {
      const up = l.k >= 5, size = 46;
      ctx.save();
      if (up) { ctx.translate(-200, -320); ctx.translate(0, drop); ctx.rotate(tilt); ctx.translate(200, 320); }
      if (!up && l.k >= 3 && c > 0) { ctx.restore(); continue; }
      let x = 0;
      if (l.k === 5 && split > 0) x = lerp(0, 100, ease.inOutCubic(split)); // 「利潤」移到右半
      const p = markerText(ctx, l.text, x, fy(l.k) + size * 0.36, l.k === 5 && split > 0 ? lerp(46, 42, split) : size, l.color, l.w);
      if (p && l.w > 0 && l.w < 1) tip = up ? [p[0], p[1] + drop] : p;
      ctx.restore();
    }
    if (split > 0) markerText(ctx, '管理費', -100, fy(5) + 15, 42, MK.red, clamp((t - ev.split - 0.5) / 0.45));
    // 第 13 句(問句):「× 10%」寫在第五層右邊,紅箭頭彎下來指到下面四層,問號
    if (t >= ev.times && t < ev.shrinkCut + 0.5) {
      const a = clamp((t - ev.times) / 0.35);
      markerText(ctx, '× 10%', 318, fy(5) + 16, 44, MK.red, a);
      const arr = ease.outCubic(clamp((t - ev.times - 0.3) / 0.4));
      if (arr > 0) {
        const P = []; for (let j = 0; j <= 20; j++) { const q = j / 20; P.push([lerp(300, 232, q) + Math.sin(q * Math.PI) * 60, lerp(-336, -170, q)]); }
        const Q = KIT.partial(P, arr); stroke(ctx, Q, MK.red, lw);
        if (arr >= 1) { stroke(ctx, [[248, -196], [232, -170], [262, -176]], MK.red, lw); }
        // 下面四層的括號
        stroke(ctx, KIT.partial([[216, -318], [226, -318], [226, -2], [216, -2]], arr), MK.red, lw - 1);
      }
      if (t >= ev.who) { const q = popIn(t, ev.who, 0.3); ctx.save(); ctx.translate(282, -92); ctx.scale(q, q); label(ctx, '?', 0, 22, 64, MK.red); ctx.restore(); }
    }
    ctx.restore();
    // 塌下來的灰塵
    if (c > 0 && t < ev.back) {
      const d = t - ev.fall - 0.12;
      if (d > 0 && d < 0.9) for (let j = 0; j < 9; j++) {
        const sd = j % 2 ? 1 : -1, r = (18 + 10 * (j % 3)) * s * (0.6 + d), x = o.cx + s * sd * (150 + 60 * (j % 4) + 80 * d), y = o.bottom + s * (-170 - 12 * (j % 3) - 30 * d);
        ctx.save(); ctx.globalAlpha *= 0.55 * (1 - d / 0.9); G.ellipse(ctx, x, y, r, r * 0.8, { fill: '#D8D4CC', lw: 2.5, seed: 1800 + j, amp: 0.8 }); ctx.restore();
      }
    }
    return { tip: toWorld(tip) };
  }

  // ===================================== 背景 =====================================
  function office(ctx, t) {
    KIT.bg.whiteboard(ctx, t, { box: BOARD });
    KIT.wallClock(ctx, 470, 190, 52, 16.6);
    for (const [hx, col, sd] of [[150, KIT.HELMET.master, 6040], [292, KIT.HELMET.shu, 6050]]) { G.ellipse(ctx, hx, 196, 8, 8, { fill: '#6C7680', lw: 2, seed: sd + 9 }); KIT.hungHelmet(ctx, hx, 262, col, sd); }
  }
  // 白板特寫的白板面(框只露出上面一條)
  function boardClose(ctx) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, W, H, [[0, '#FDFEFE'], [1, '#F1F4F5']]));
    for (let k = 0; k < 4; k++) G.line(ctx, [[160 + k * 150, -40], [520 + k * 150, 420]], { color: '#E6ECEF', lw: 34, seed: 1900 + k, alpha: 0.8 });
    G.rrect(ctx, -60, -40, W + 120, 58, 0, { fill: '#9AA3AD', lw: 5, seed: 1910 });
  }

  // ===================================== 第 1 句:回到公司 =====================================
  function wide(ctx, t) {
    office(ctx, t);
    const sw = walkTo(t, ev.walk[0], ev.walk[0] + 1.9, -260, 330, 1.0), mw = walkTo(t, ev.walk[0] - 0.15, ev.walk[1], -90, 790, 1.0);
    const flinch = t >= ev.notScold - 0.35 && t < ev.notScold + 0.75;   // 以為要被罵:縮一下
    const turn = t >= ev.notScold - 0.45 && t < ev.notScold + 0.55;     // 師傅回頭看他一眼,沒說話
    const raise = clamp((t - ev.draw0 + 0.55) / 0.4);                    // 轉身拿筆對著白板
    KIT.person(ctx, { ...sw, y: KIT.L.ground, s: 1.0, style: CAST.shu, seed: 400, eyes: flinch ? 'closed' : 'normal', mouth: 'wavy', brows: 'worried',
      look: flinch ? 0 : 0.35, lookY: flinch ? 0.4 : 0.6, headY: flinch ? 8 : 3, blink: blink(t, 0.1), sweat: 0.7, blush: 0.3 });
    const mo = { ...mw, y: KIT.L.ground, s: 1.0, style: CAST.master, seed: 440, eyes: 'normal', mouth: 'flat', brows: 'neutral', look: turn ? -0.75 : 0.6, blink: blink(t, 0.6) };
    if (raise > 0) mo.handR = [lerp(92, 190, raise), lerp(-180, -330, raise)];
    KIT.person(ctx, mo);
    if (raise > 0) { const p = KIT.world(mo, mo.handR[0], mo.handR[1]); marker(ctx, p[0] + 30, p[1] - 38, lerp(1.9, 2.3, raise), 0.55); G.ellipse(ctx, p[0], p[1], 15, 14, { fill: CAST.master.skin, lw: 3.5, seed: 1650 }); }
    KIT.warm(ctx);
  }
  // 白板特寫:師傅的手一筆一筆畫出六格疊起來的樓房外框
  function closeDraw(ctx, t) {
    boardClose(ctx);
    const r = boardBuilding(ctx, t, CLOSE);
    const s = CLOSE.s, at = (x, y) => [CLOSE.cx + x * s, CLOSE.bottom + y * s];
    let tip;
    if (t < ev.draw[0]) { const q = ease.outCubic(clamp((t - ev.draw0) / 0.45)); tip = at(lerp(-420, -200, q), lerp(260, 0, q)); } // 筆伸進來,停在左下角
    else if (r.tip) tip = r.tip;
    else { const q = ease.inCubic(clamp((t - ev.draw[1]) / 0.55)); tip = at(lerp(-150, -560, q), lerp(-544, 300, q)); }           // 畫完收手
    armWithMarker(ctx, tip, ARM_DIR, ARM_FROM, { sleeve: CAST.master.shirt, skin: CAST.master.skin, longSleeve: true, seed: 1700 });
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.16 });
  }

  // ===================================== 兩人中景(白板前) =====================================
  function twoShot(ctx, t) {
    office(ctx, t);
    boardBuilding(ctx, t, TWO);
    const SH = { x: 330, y: 1030, s: 1.25 }, MA = { x: 770, y: 1030, s: 1.25 };
    const mm = mouth('master', t), sm = mouth('shu', t);
    // ---- 阿樹 ----
    const so = { ...SH, pose: 'stand', style: CAST.shu, seed: 400, eyes: 'normal', mouth: sm || 'wavy', brows: 'worried', look: 0.5, lookY: 0.1, blink: blink(t, 0.1), blush: 0.4 };
    const holding = t >= ev.take && t < ev.back;          // 接過筆之後拿在手上
    if (t < A[2]) { // 第 2 句:看著師傅,接過筆
      so.look = 0.55; so.brows = 'worried'; so.mouth = 'wavy'; so.sweat = 0.5;
      const reach = ease.outCubic(clamp((t - ev.offer - 0.25) / 0.4)), back = ease.inOutCubic(clamp((t - ev.take - 0.05) / 0.4));
      if (reach > 0) { so.handR = [lerp(lerp(60, 180, reach), 70, back), lerp(lerp(-150, -212, reach), -200, back)]; so.eyes = 'wide'; so.mouth = 'o'; }
    } else if (t < ev.figB) { // 第 4 句:縮脖子
      const fl = t >= ev.fall - 0.05, peek = t >= ev.fall + 0.7;
      so.look = 0.75; so.lookY = -0.3;
      if (fl) { so.headY = 16; so.eyes = peek ? 'wide' : 'closed'; so.brows = 'worried'; so.mouth = peek ? 'o' : 'wavy'; so.sweat = 1; so.handL = [-50, -300]; so.handR = [56, -300]; so.x += Math.sin(t * 40) * 3 * clamp(1 - (t - ev.fall) / 0.6); }
      else { so.mouth = 'smile'; so.brows = 'up'; so.eyes = 'normal'; }
    } else if (t < A[12]) { // 第 11 句:恍然大悟
      const aha = t >= ev.yours;
      so.look = aha ? 0.3 : 0.75; so.lookY = aha ? 0 : -0.2;
      so.eyes = aha ? 'wide' : 'normal'; so.mouth = aha ? 'o' : 'smile'; so.brows = aha ? 'up' : 'neutral';
      if (t >= ev.aha) { so.eyes = 'wide'; so.mouth = 'o'; so.handR = [30, -330]; }
    } else { // 第 13 句
      so.look = 0.75; so.lookY = -0.3; so.brows = 'worried'; so.mouth = sm || 'wavy'; so.sweat = 0.6;
    }
    if (holding && !so.handR) so.handR = [70, -200];
    KIT.person(ctx, so);
    if (holding) { const p = KIT.world(so, so.handR[0], so.handR[1]); marker(ctx, p[0] + 12, p[1] - 44, 1.75, 0.5, MK.blue, 1660); G.ellipse(ctx, p[0], p[1], 17, 15, { fill: CAST.shu.skin, lw: 3.5, seed: 1661 }); }
    // 恍然大悟:頭上冒出燈泡(不蓋臉)
    if (t >= ev.aha && t < A[12]) { const q = popIn(t, ev.aha, 0.35); bulb(ctx, 512, 372, q); } // 在阿樹與師傅的頭之間,不蓋臉、不疊到牆上的安全帽
    // ---- 陳師傅 ----
    const mo = { ...MA, pose: 'stand', style: CAST.master, seed: 440, eyes: 'normal', mouth: mm || 'flat', brows: 'neutral', look: 0.5, blink: blink(t, 0.6) };
    let markerIn = null;
    if (t < A[2]) { // 第 2 句:拿筆指著白板;「你蓋了幾層」:筆換到左手,遞給阿樹
      const swapA = ev.offer - 0.5, swapB = ev.offer - 0.15;
      mo.look = t >= ev.offer - 0.3 ? -0.7 : 0.6;
      if (t >= ev.layers[0] - 0.3 && t < swapA) mo.gesture = 'point';
      const q1 = ease.inOutCubic(clamp((t - swapA) / 0.3)), q2 = ease.outCubic(clamp((t - ev.offer) / 0.4)), back = ease.inOutCubic(clamp((t - ev.take - 0.1) / 0.4));
      if (t >= swapA) mo.handR = t < ev.offer + 0.1 ? [lerp(205, 24, q1), lerp(-304, -236, q1)] : [lerp(24, 92, clamp((t - ev.offer - 0.1) / 0.35)), lerp(-236, -180, clamp((t - ev.offer - 0.1) / 0.35))];
      if (t >= swapA) { const L0 = [lerp(-92, -22, q1), lerp(-180, -244, q1)], L1 = [lerp(L0[0], -184, q2), lerp(L0[1], -216, q2)]; mo.handL = [lerp(L1[0], -92, back), lerp(L1[1], -180, back)]; }
      markerIn = t < swapB ? 'R' : t < ev.take ? 'L' : null;
    } else if (t < ev.figB) { // 第 4 句
      mo.look = t < ev.fall ? 0.7 : -0.55; mo.brows = 'neutral';
      if (t >= ev.gap - 0.1 && t < ev.fall + 0.2) mo.handR = [180, -470];
      if (t >= ev.fall + 0.5) mo.crossArms = true;
      mo.mouth = mm || 'flat';
    } else if (t < A[11]) { // 第 11 句:管理費跟利潤是兩件事
      mo.look = t < ev.yours ? 0.6 : -0.6;
      if (t >= ev.split - 0.4 && t < ev.yours) mo.handR = [182, -462];
      else if (t >= ev.yours) mo.gesture = null;
      markerIn = t >= ev.split - 0.4 && t < ev.yours ? 'R' : null;
    } else { // 第 13 句:一成是乘在誰上面?
      mo.look = t < ev.who + 0.3 ? 0.65 : -0.5;
      if (t < ev.who + 0.4) mo.handR = [184, -458];
      markerIn = t < ev.who + 0.4 ? 'R' : null;
      mo.brows = 'up';
    }
    KIT.person(ctx, mo);
    if (markerIn) {
      const h = markerIn === 'L' ? (mo.handL || [-92, -180]) : (mo.handR || (mo.gesture === 'point' ? [205, -304] : [92, -180]));
      const p = KIT.world(mo, h[0], h[1]);
      marker(ctx, p[0] + (markerIn === 'L' ? -10 : 14), p[1] - 42, markerIn === 'L' ? 1.4 : 1.95, 0.5, markerIn === 'R' && t >= ev.back ? MK.red : MK.blue, 1670);
      G.ellipse(ctx, p[0], p[1], 17, 15, { fill: CAST.master.skin, lw: 3.5, seed: 1671 });
    }
    KIT.warm(ctx);
  }
  function bulb(ctx, x, y, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    KIT.glow(ctx, 0, -10, 120, 'rgba(255,236,140,0.75)');
    for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (k - 3) * 0.42; stroke(ctx, [[Math.cos(an) * 62, -12 + Math.sin(an) * 62], [Math.cos(an) * 86, -12 + Math.sin(an) * 86]], '#E9A23B', 7); }
    G.ellipse(ctx, 0, -14, 40, 42, { fill: '#FFE97A', lw: 4.5, seed: 1690 });
    stroke(ctx, [[-9, 8], [-9, -8]], '#C98A1A', 4); stroke(ctx, [[9, 8], [9, -8]], '#C98A1A', 4);
    ctx.save(); ctx.strokeStyle = '#C98A1A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -8, 9, Math.PI, 0); ctx.stroke(); ctx.restore();
    G.rrect(ctx, -20, 24, 40, 28, 6, { fill: '#9AA3AD', lw: 4, seed: 1691 });
    for (let k = 0; k < 2; k++) stroke(ctx, [[-18, 33 + k * 9], [18, 33 + k * 9]], '#5C6470', 3);
    ctx.restore();
  }

  // ===================================== 第 3 句:阿樹寫字(白板特寫) =====================================
  function closeWrite(ctx, t) {
    boardClose(ctx);
    const r = boardBuilding(ctx, t, CLOSE);
    const s = CLOSE.s, at = (x, y) => [CLOSE.cx + x * s, CLOSE.bottom + y * s];
    let tip;
    const start = (k) => [-KIT.measure(ctx, { 1: '材料', 2: '工資', 5: '利潤', 6: '稅' }[k], 46) / 2, fy(k) + 4]; // 那一格字的起筆處
    const ease2 = (a, b, q) => [lerp(a[0], b[0], ease.inOutCubic(q)), lerp(a[1], b[1], ease.inOutCubic(q))];
    const HOV = [110, fy(3.5) + 14];                                                                     // 中間兩層的右半邊
    if (r.tip) tip = r.tip;
    else if (t < ev.w[0][0]) tip = ease2([-430, 240], start(1), clamp((t - ev.write0) / 0.35));          // 筆伸進來
    else if (t < ev.w[1][0]) tip = ease2([46, fy(1)], start(2), clamp((t - ev.w[0][1]) / 0.2));
    else if (t < ev.w[2][0]) {                                                                           // 寫完「工資」:在中間兩層上面猶豫
      const q = clamp((t - ev.w[1][1]) / 0.25), wob = clamp((t - ev.hover[0]) / 0.2) * (1 - clamp((t - ev.w[2][0] + 0.2) / 0.2));
      tip = ease2([46, fy(2)], HOV, q);
      tip = [tip[0] + Math.sin(t * 9) * 26 * wob, tip[1] + Math.sin(t * 13) * 10 * wob];
      if (t > ev.w[2][0] - 0.2) tip = ease2(HOV, start(5), clamp((t - ev.w[2][0] + 0.2) / 0.2));
    } else if (t < ev.w[3][0]) tip = ease2([46, fy(5)], start(6), clamp((t - ev.w[2][1]) / 0.15));
    else { const q = ease.inCubic(clamp((t - ev.w[3][1] - 0.05) / 0.5)); tip = [lerp(24, -560, q), lerp(fy(6), 300, q)]; } // 寫完收手
    if (!r.tip) tip = at(tip[0], tip[1]);
    armWithMarker(ctx, tip, ARM_DIR, ARM_FROM, { sleeve: CAST.shu.shirt, skin: CAST.shu.skin, seed: 1720 });
    // 「……」:中間兩層冒出小小的問號
    if (t >= ev.hover[0] && t < ev.w[2][0] + 0.2) { const q = popIn(t, ev.hover[0] + 0.05, 0.25) * (1 - fadeIn(t, ev.w[2][0], 0.2)); const qp = at(-110, -250); ctx.save(); ctx.translate(qp[0], qp[1]); ctx.scale(q, q); label(ctx, '?', 0, 26, 76, '#6C7680'); ctx.restore(); }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.16 });
  }

  // ===================================== 【圖 B】六層樓成本架構 =====================================
  const FLOORS = [
    { name: '材料', fill: '#CFE3F5', chip: '#3F86C9' },
    { name: '工資', fill: '#D3ECCB', chip: '#3E9B5F' },
    { name: '機具與耗材', fill: '#FBDDBB', chip: '#C8661A' },
    { name: '間接費用', fill: '#E2D6F3', chip: '#7C5CB8' },
    { name: '管理費與利潤', fill: '#F9E7A6', chip: '#A8780E' },
    { name: '稅', fill: '#F6CFC9', chip: '#C8452F' },
  ];
  // 彩色的六層樓。o = { cx, bottom, w, fh, size, numX, st(i) → { lit, name, alpha, missing, wf, ghost, split, check } , roof }
  function colorBuilding(ctx, t, o) {
    const { cx, bottom, w, fh, size, numX } = o;
    for (let i = 0; i < 6; i++) {
      const st = o.st(i), f = FLOORS[i], wf = st.wf == null ? 1 : st.wf, ww = w * wf, x0 = cx - ww / 2, y0 = bottom - (i + 1) * fh;
      const a = st.alpha == null ? 1 : st.alpha;
      // 原本的寬度(縮水之後留下紅色虛線)
      if (st.ghost > 0) { ctx.save(); ctx.globalAlpha *= st.ghost; ctx.setLineDash([14, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.strokeRect(cx - w / 2, y0 + 2, w, fh - 4); ctx.restore(); }
      ctx.save(); ctx.globalAlpha *= a;
      // 還沒亮:白底灰色虛線
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x0, y0, ww, fh); ctx.setLineDash([12, 9]); ctx.strokeStyle = '#B9B0A0'; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, ww, fh); ctx.restore();
      if (st.lit > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, ww * st.lit, fh); ctx.clip();
        if (st.split > 0) { fill(ctx, x0, y0, ww / 2, fh, '#F9E7A6'); fill(ctx, x0 + ww / 2, y0, ww / 2, fh, '#F2D27A'); }
        else fill(ctx, x0, y0, ww, fh, f.fill);
        ctx.restore();
        if (st.missing > 0) { // 第四層:變成半透明虛線,閃
          const bl = 0.5 + 0.5 * Math.sin(t * 9);
          ctx.save(); ctx.globalAlpha *= st.missing * (0.55 + 0.45 * bl); ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.strokeRect(x0 + 3, y0 + 3, ww - 6, fh - 6); ctx.restore();
        } else if (st.lit >= 1) { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(x0, y0, ww, fh); ctx.restore(); }
      }
      // 第五層切成兩半
      if (st.split > 0 && st.lit > 0) stroke(ctx, KIT.partial([[cx, y0 + 4], [cx, y0 + fh - 4]], st.split), C.ink, 4);
      // 層名
      if (st.name > 0) {
        const nm = st.split > 0 ? null : f.name, k = st.name < 1 ? ease.outBack(st.name) : 1;
        ctx.save(); ctx.globalAlpha *= clamp(st.name * 3) * (st.missing > 0 ? 1 - 0.5 * st.missing : 1); ctx.translate(cx, y0 + fh / 2); ctx.scale(k, k);
        if (nm) label(ctx, nm, 0, size * 0.36, size, C.ink);
        else { label(ctx, '管理費', -ww / 4, size * 0.34, size * 0.92, C.ink); label(ctx, '利潤', ww / 4, size * 0.34, size * 0.92, C.ink); }
        ctx.restore();
      }
      ctx.restore();
      // 層號(左邊的圓)
      const chipA = st.lit > 0 ? 1 : 0.6, cr = Math.max(25, size * 0.62);
      ctx.save(); ctx.globalAlpha *= (a < 1 && st.missing > 0 ? 0.6 + 0.4 * a : 1);
      stroke(ctx, [[numX + cr, y0 + fh / 2], [Math.min(x0, cx - w / 2) - 4, y0 + fh / 2]], st.lit > 0 ? f.chip : '#C9C0B0', 3);
      const chipFill = st.lit <= 0 ? '#E4DDCF' : st.missing > 0 ? '#FFFFFF' : f.chip, chipInk = st.lit <= 0 ? '#5E5246' : st.missing > 0 ? C.red : '#FFFFFF';
      G.ellipse(ctx, numX, y0 + fh / 2, cr, cr, { fill: chipFill, lw: 3.5, seed: 2100 + i });
      num(ctx, String(i + 1), numX, y0 + fh / 2 + Math.max(34, size * 0.8) * 0.36, Math.max(34, size * 0.8), chipInk);
      ctx.restore();
      if (st.check > 0) KIT.tick(ctx, cx + ww / 2 + 34, y0 + fh / 2, 24, ease.outBack(clamp(st.check)), { seed: 2120 + i });
      void chipA;
    }
    // 屋頂(女兒牆)
    if (o.roof > 0) {
      const wf = o.st(5).wf == null ? 1 : o.st(5).wf, ww = w * wf + 24, y6 = bottom - 6 * fh, k = ease.outBack(clamp(o.roof));
      ctx.save(); ctx.translate(cx, y6); ctx.scale(1, k); G.rrect(ctx, -ww / 2, -18, ww, 18, 3, { fill: '#B8AFA0', lw: 3.5, seed: 2140 }); ctx.restore();
    }
    // 地面
    G.line(ctx, [[cx - w / 2 - 70, bottom + 1], [cx + w / 2 + 70, bottom + 1]], { color: C.ink, lw: 5, seed: 2150 });
  }

  // ---------- 圖示(約 76 × 76,置中) ----------
  function icon(ctx, key, x, y, s = 1, seed = 2200) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const steel = C.steel;
    switch (key) {
      case 'pipe':
        G.rrect(ctx, -38, -12, 76, 24, 6, { fill: steel, lw: 3.5, seed });
        G.ellipse(ctx, 38, 0, 7, 12, { fill: '#F4F6F8', lw: 3, seed: seed + 1 });
        stroke(ctx, [[-30, -5], [26, -5]], '#FFFFFF', 3, 0.9);
        break;
      case 'elbow':
        G.limb(ctx, [[-26, 24], [-26, -2], [-16, -16], [0, -22], [32, -22]], { color: steel, lw: 22, outline: 3.5, seed });
        break;
      case 'valve':
        G.limb(ctx, [[-36, 14], [36, 14]], { color: steel, lw: 20, outline: 3.5, seed });
        G.ellipse(ctx, 0, 14, 17, 17, { fill: '#C9CFD6', lw: 3.5, seed: seed + 1 });
        G.rrect(ctx, -4, -18, 8, 30, 3, { fill: '#5C6470', lw: 3, seed: seed + 2 });
        G.rrect(ctx, -6, -26, 42, 12, 5, { fill: C.red, lw: 3, seed: seed + 3 });
        break;
      case 'hanger':
        stroke(ctx, [[-38, -36], [38, -36]], '#5C6470', 7);
        for (const sx of [-24, 24]) G.line(ctx, [[sx, -34], [sx, 20]], { color: '#5C6470', lw: 5, seed: seed + 10 + sx, amp: 0.4 });
        G.rrect(ctx, -36, 16, 72, 13, 3, { fill: '#7F8B96', lw: 3, seed: seed + 3 });
        G.ellipse(ctx, 0, 4, 12, 12, { fill: steel, lw: 3, seed: seed + 4 });
        break;
      case 'worker': {
        G.rrect(ctx, -30, 4, 60, 32, 16, { fill: C.vest, lw: 3.5, seed });
        stroke(ctx, [[-20, 22], [20, 22]], '#F4F6F2', 6);
        G.ellipse(ctx, 0, -8, 17, 17, { fill: C.skin, lw: 3.5, seed: seed + 1 });
        const d = []; for (let k = 0; k <= 12; k++) { const an = Math.PI + Math.PI * k / 12; d.push([Math.cos(an) * 22, -15 + Math.sin(an) * 20]); }
        G.shape(ctx, d, { fill: C.yellow, lw: 3.5, seed: seed + 2 });
        G.rrect(ctx, -27, -18, 54, 7, 3, { fill: Ch_shade(C.yellow), lw: 3, seed: seed + 3 });
        break;
      }
      case 'calendar':
        G.rrect(ctx, -32, -30, 64, 62, 6, { fill: '#FFFDF4', lw: 3.5, seed });
        G.rrect(ctx, -32, -30, 64, 16, 5, { fill: C.red, lw: 3.5, seed: seed + 1 });
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) fill(ctx, -24 + c * 13, -6 + r * 12, 8, 7, r * 4 + c < 6 ? '#C8452F' : '#CFC4AC');
        break;
      case 'lift':
        G.rrect(ctx, -34, 16, 68, 12, 3, { fill: '#E9A23B', lw: 3, seed });
        for (const wx of [-22, 22]) G.ellipse(ctx, wx, 30, 6, 6, { fill: '#3A3A44', lw: 2.5, seed: seed + 1 + wx });
        for (let k = 0; k < 2; k++) { G.line(ctx, [[-26, 16 - k * 17], [26, -1 - k * 17]], { color: '#8A8F98', lw: 5, seed: seed + 5 + k, amp: 0.3 }); G.line(ctx, [[26, 16 - k * 17], [-26, -1 - k * 17]], { color: '#8A8F98', lw: 5, seed: seed + 8 + k, amp: 0.3 }); }
        G.rrect(ctx, -36, -26, 72, 8, 2, { fill: '#E9A23B', lw: 3, seed: seed + 11 });
        for (const rx of [-34, 34]) stroke(ctx, [[rx, -26], [rx, -38]], '#E9A23B', 5);
        stroke(ctx, [[-34, -38], [34, -38]], '#E9A23B', 5);
        break;
      case 'welder':
        G.rrect(ctx, -36, -16, 50, 46, 6, { fill: '#3F6FA8', lw: 3.5, seed });
        G.ellipse(ctx, -22, 2, 7, 7, { fill: '#F2C230', lw: 2.5, seed: seed + 1 });
        G.ellipse(ctx, -2, 2, 7, 7, { fill: '#FFFFFF', lw: 2.5, seed: seed + 2 });
        G.rrect(ctx, -30, 16, 38, 8, 2, { fill: '#2E3440', lw: 2, seed: seed + 3 });
        G.limb(ctx, [[14, 10], [30, 22], [34, -4], [28, -24]], { color: '#2E3440', lw: 6, outline: 2, seed: seed + 4 });
        G.rrect(ctx, 22, -38, 14, 18, 3, { fill: '#8A8F98', lw: 3, seed: seed + 5 });
        break;
      case 'cylinder':
        G.rrect(ctx, -16, -22, 32, 58, 14, { fill: '#8FA7B5', lw: 3.5, seed });
        G.rrect(ctx, -16, -22, 32, 14, 8, { fill: '#5C7A8C', lw: 3, seed: seed + 1 });
        G.rrect(ctx, -7, -34, 14, 13, 3, { fill: '#5C6470', lw: 3, seed: seed + 2 });
        stroke(ctx, [[-10, 0], [-10, 26]], 'rgba(255,255,255,0.55)', 4);
        break;
      case 'cart':
        stroke(ctx, [[-26, -36], [-26, 24], [22, 24]], '#5C6470', 6);
        G.ellipse(ctx, -16, 28, 9, 9, { fill: '#3A3A44', lw: 3, seed: seed + 1 });
        G.rrect(ctx, -20, -6, 40, 30, 3, { fill: '#C9A06A', lw: 3, seed: seed + 2 });
        G.rrect(ctx, -18, -34, 34, 28, 3, { fill: '#D8B27A', lw: 3, seed: seed + 3 });
        stroke(ctx, [[-20, 9], [20, 9]], '#A07A48', 3);
        break;
      case 'cover':
        G.rrect(ctx, -30, -6, 60, 40, 4, { fill: '#AEB9C3', lw: 3, seed });
        G.poly(ctx, [[-38, 36], [-34, -18], [-14, -30], [16, -30], [34, -18], [40, 36], [20, 30], [0, 36], [-20, 30]], { fill: '#7FB8C9', lw: 3.5, seed: seed + 1, step: 14 });
        stroke(ctx, [[-12, -24], [-18, 28]], 'rgba(40,80,100,0.35)', 3); stroke(ctx, [[12, -24], [18, 28]], 'rgba(40,80,100,0.35)', 3);
        break;
      case 'gauge':
        G.rrect(ctx, -6, 20, 12, 14, 2, { fill: '#8A8F98', lw: 3, seed: seed + 1 });
        G.ellipse(ctx, 0, -6, 28, 28, { fill: '#FFFFFF', lw: 4, seed });
        for (let k = 0; k < 7; k++) { const an = Math.PI * (0.8 + k * 0.233); stroke(ctx, [[Math.cos(an) * 18, -6 + Math.sin(an) * 18], [Math.cos(an) * 23, -6 + Math.sin(an) * 23]], C.ink, 2.5); }
        stroke(ctx, [[0, -6], [13, -19]], C.red, 4);
        G.ellipse(ctx, 0, -6, 4, 4, { fill: C.ink, lw: 0, seed: seed + 2 });
        break;
      case 'docs':
        for (let k = 2; k >= 0; k--) { G.rrect(ctx, -26 + k * 6, -32 + k * 5, 46, 58, 3, { fill: k ? '#F1ECDE' : '#FFFDF4', lw: 3, seed: seed + k }); }
        for (let k = 0; k < 4; k++) stroke(ctx, [[-18, -18 + k * 11], [k === 3 ? 0 : 12, -18 + k * 11]], '#B8AE9A', 3.5);
        break;
      case 'clipboard': {
        G.rrect(ctx, -26, -30, 50, 64, 4, { fill: '#C9A06A', lw: 3.5, seed });
        G.rrect(ctx, -20, -22, 38, 50, 2, { fill: '#FFFDF4', lw: 2.5, seed: seed + 1 });
        G.rrect(ctx, -10, -36, 18, 10, 3, { fill: '#8A8F98', lw: 2.5, seed: seed + 2 });
        for (let k = 0; k < 3; k++) { stroke(ctx, [[-15, -10 + k * 13], [-11, -6 + k * 13], [-5, -14 + k * 13]], C.green, 3); stroke(ctx, [[0, -10 + k * 13], [12, -10 + k * 13]], '#B8AE9A', 3); }
        const d = []; for (let k = 0; k <= 10; k++) { const an = Math.PI + Math.PI * k / 10; d.push([24 + Math.cos(an) * 17, 30 + Math.sin(an) * 15]); }
        G.shape(ctx, d, { fill: '#F4F4F0', lw: 3, seed: seed + 3 }); G.rrect(ctx, 4, 27, 40, 6, 3, { fill: '#D8D8D0', lw: 2.5, seed: seed + 4 });
        break;
      }
      case 'shield':
        G.poly(ctx, [[-28, -30], [28, -30], [28, 2], [0, 34], [-28, 2]], { fill: '#4C7FBF', lw: 3.5, seed, step: 12 });
        stroke(ctx, [[-12, 0], [-2, 10], [14, -10]], '#FFFFFF', 6);
        break;
      case 'office':
        G.rrect(ctx, -26, -32, 52, 66, 3, { fill: '#B8C4CE', lw: 3.5, seed });
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fill(ctx, -18 + c * 14, -24 + r * 14, 9, 8, '#6F8FAF');
        G.rrect(ctx, -8, 16, 16, 18, 2, { fill: '#7A553A', lw: 2.5, seed: seed + 1 });
        break;
      case 'coins':
        for (let k = 0; k < 4; k++) G.ellipse(ctx, -8, 26 - k * 11, 22, 8, { fill: '#F2C94C', lw: 3, seed: seed + k });
        coin(ctx, 18, -14, 16, 1, '#C9971A', seed + 9);
        break;
      case 'receipt':
        G.poly(ctx, [[-24, -34], [24, -34], [24, 30], [16, 36], [8, 30], [0, 36], [-8, 30], [-16, 36], [-24, 30]], { fill: '#FFFDF4', lw: 3.5, seed, step: 12 });
        for (let k = 0; k < 3; k++) stroke(ctx, [[-14, -22 + k * 10], [k === 2 ? 2 : 14, -22 + k * 10]], '#B8AE9A', 3.5);
        ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(6, 14, 11, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        break;
      default: break;
    }
    ctx.restore();
  }
  const Ch_shade = (c) => KIT.shade(c, 0.8);
  // 每一層旁邊的小圖示與名稱(念到才跳出來)
  const ICONS = [
    [['pipe', '管子'], ['elbow', '管件'], ['valve', '閥'], ['hanger', '吊架']],
    [['worker', '誰來做'], ['calendar', '做幾天']],
    [['lift', '高空車'], ['welder', '焊機'], ['cylinder', '氬氣']],
    [['cart', '搬運'], ['cover', '保護'], ['gauge', '測試'], ['docs', '文件'], ['clipboard', '現場管理'], ['shield', '保險']],
    [['office', '管理費'], ['coins', '利潤']],
    [['receipt', '營業稅']],
  ];
  const ICON_AT = [ev.i1, ev.i2, ev.i3, ev.i4, [ev.n[4] + 0.25, ev.n[4] + 0.45], [ev.n[5] + 0.2]];
  // 【圖 B】的位置
  const FB = { cx: 490, bottom: 862, w: 520, fh: 112, size: 46, numX: 172 };
  function figCard(ctx, title) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, H, [[0, '#C3CDD5'], [1, '#B3C0CA']]));
    KIT.card(ctx, 56, 46, 1808, 870, { fill: '#FBF8EE', seed: 1400 });
    txt(ctx, title, 110, 140, 50, C.ink);
  }
  function figB(ctx, t, mode) {
    figCard(ctx, '【圖 B】六層樓成本架構');
    const shrinkMode = mode === 'shrink';
    const miss = shrinkMode ? 0 : clamp((t - ev.miss) / 0.4);
    const sh = shrinkMode ? ease.inOutCubic(clamp((t - ev.shrink) / 0.7)) : 0, nr = shrinkMode ? ease.inOutCubic(clamp((t - ev.narrow) / 0.6)) : 0;
    const st = (i) => {
      if (shrinkMode) return { lit: 1, name: 1, split: i === 4 ? 1 : 0, wf: i < 4 ? lerp(1, 0.6, sh) : lerp(1, 0.6, nr), ghost: i < 4 ? clamp(sh * 3) : clamp(nr * 3) };
      const lit = ease.outCubic(clamp((t - ev.f[i]) / 0.35)), name = clamp((t - ev.n[i]) / 0.3);
      return { lit, name, alpha: i === 3 ? lerp(1, 0.38, miss) : 1, missing: i === 3 ? miss : 0 };
    };
    colorBuilding(ctx, t, { ...FB, st, roof: shrinkMode ? 1 : clamp((t - ev.done) / 0.3) });
    if (!shrinkMode) {
      // 圖示:每一層旁邊一排,圖示在上、名稱在下
      let rowEnd4 = 0;
      ICONS.forEach((row, i) => {
        const y0 = FB.bottom - (i + 1) * FB.fh;
        let x = 836;
        row.forEach(([key, name], j) => {
          const lw = KIT.measure(ctx, name, 36), colW = Math.max(88, lw + 18), cx = x + colW / 2;
          x += colW + 16; if (i === 3) rowEnd4 = x - 16;
          const at = ICON_AT[i][j], a = popIn(t, at, 0.3);
          if (a <= 0) return;
          let al = i === 3 ? lerp(1, 0.3, miss) : 1;
          if (i === 3 && t >= ev.leave && t < ev.coins4[j] + 0.2) al *= lerp(1, 0.4, clamp((t - ev.leave) / 0.4)) + 0.6 * clamp((t - ev.coins4[j]) / 0.2);
          ctx.save(); ctx.globalAlpha *= al;
          ctx.save(); ctx.translate(cx, y0 + 37); ctx.scale(a, a); icon(ctx, key, 0, 0, 0.9, 2200 + i * 20 + j); ctx.restore();
          ctx.globalAlpha *= clamp((t - at) / 0.2);
          label(ctx, name, cx, y0 + 106, 36, C.ink);
          ctx.restore();
          if (i === 3 && t >= ev.coins4[j]) { const q = popIn(t, ev.coins4[j], 0.3); coin(ctx, cx + 32, y0 + 14 - 8 * q, 17 * q, al > 0.5 ? 1 : 0.5, FLOORS[3].chip, 2300 + j); }
        });
      });
      // 整棟樓完成:屋頂旁幾顆閃光
      if (t >= ev.done && t < ev.done + 1.4) [[190, 196], [790, 186], [140, 420], [800, 420]].forEach(([sx, sy], k) => KIT.sparkle(ctx, sx, sy, 24, popIn(t, ev.done + k * 0.06, 0.25) * clamp(1.4 - (t - ev.done)), t * 2 + k));
      // 新手最容易整層不見的:是第四層(標籤放在第四層那一排的最右邊,不蓋到圖示)
      if (t >= ev.miss4) {
        const q = popIn(t, ev.miss4, 0.3), y4 = FB.bottom - 3.5 * FB.fh, bx = rowEnd4 + 48;
        ctx.save(); ctx.translate(bx, y4); ctx.scale(q, q);
        G.rrect(ctx, 0, -40, 254, 80, 14, { fill: '#FFF1EC', lw: 4, stroke: C.red, seed: 2400 });
        label(ctx, '整層不見？', 127, 15, 44, C.red);
        ctx.restore();
        const ar = ease.outCubic(clamp((t - ev.miss4 - 0.1) / 0.3));
        if (ar > 0) { stroke(ctx, KIT.partial([[bx - 6, y4], [bx - 30, y4]], ar), C.red, 8); stroke(ctx, [[bx - 22, y4 - 14], [bx - 36, y4], [bx - 22, y4 + 14]], C.red, 8, ar); }
      }
    } else {
      // 一成是乘在誰上面:第五層「× 10%」,箭頭彎下來指到下面四層(成本)
      const y5 = FB.bottom - 4.5 * FB.fh, xr = FB.cx + FB.w / 2;
      const a0 = clamp((t - ev.shrinkCut) / 0.3);
      ctx.save(); ctx.globalAlpha *= a0;
      label(ctx, '× 10%', xr + 120, y5 + 18, 50, C.red);
      const P = []; for (let j = 0; j <= 20; j++) { const q = j / 20; P.push([xr + 100 + Math.sin(q * Math.PI) * 70, lerp(y5 + 44, FB.bottom - 2 * FB.fh, q)]); }
      stroke(ctx, P, C.red, 7); stroke(ctx, [[xr + 116, FB.bottom - 2 * FB.fh - 24], [xr + 100, FB.bottom - 2 * FB.fh], [xr + 128, FB.bottom - 2 * FB.fh - 2]], C.red, 7);
      stroke(ctx, [[xr + 36, FB.bottom - 4 * FB.fh + 4], [xr + 52, FB.bottom - 4 * FB.fh + 4], [xr + 52, FB.bottom - 4], [xr + 36, FB.bottom - 4]], C.red, 5);
      label(ctx, '成本', xr + 104, FB.bottom - 0.8 * FB.fh, 42, C.red);
      ctx.restore();
      // 下面四層縮水 → 上面兩層跟著變窄
      if (sh > 0) {
        const q = popIn(t, ev.shrink + 0.15, 0.3), yy = FB.bottom - 2 * FB.fh;
        for (const sd of [-1, 1]) { const x1 = FB.cx + sd * (FB.w / 2 + 6), x2 = FB.cx + sd * (FB.w * 0.3 + 14); stroke(ctx, [[x1, yy], [lerp(x1, x2, sh), yy]], C.red, 7, clamp(sh * 2)); if (sh > 0.6) stroke(ctx, [[x2 + sd * 16, yy - 14], [x2, yy], [x2 + sd * 16, yy + 14]], C.red, 7); }
        ctx.save(); ctx.translate(1000, FB.bottom - 1.5 * FB.fh); ctx.scale(q, q); txt(ctx, '底下少算', 0, 18, 50, C.red); ctx.restore();
      }
      if (nr > 0) {
        const q = popIn(t, ev.narrow + 0.2, 0.3);
        ctx.save(); ctx.translate(1000, FB.bottom - 4.5 * FB.fh); ctx.scale(q, q); txt(ctx, '一成也跟著變少', 0, 18, 50, C.red); ctx.restore();
      }
    }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.16 });
  }

  // ===================================== 第 9 句:內部成本表 vs 給客戶的報價單 =====================================
  const CB = { cx: 500, bottom: 862, w: 440, fh: 84, size: 40, numX: 232 };
  const QROWS = [
    { text: '2" 不鏽鋼管配管' }, { text: '高空作業車與耗材' }, { text: '銜接、測試與吹洗' }, { text: '現場管理等' },
    { text: '營業稅 5%', kind: 'sub' }, { text: '含稅總價', kind: 'total' },
  ];
  const QC = { x: 1064, y: 206, w: 780, rowY: 372, rowH: 70 };
  // 六層的錢 → 右邊的哪幾行(附錄 A 對外報價單示意:每一行 = 對應的內部成本 × 1.1;稅另列)
  const FLOW = [[0, 0, 0], [0, 0, 3], [1, 1], [2, 2, 3, 3, 3], [0, 1, 2, 3], [4]];
  function pill(ctx, str, x, y, size, col, bg, a = 1) {
    if (a <= 0) return;
    const tw = KIT.measure(ctx, str, size), w = tw + size * 1.2, h = size * 1.5;
    ctx.save(); ctx.globalAlpha *= a; G.rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2, { fill: bg, lw: 3, seed: 2600 + Math.round(x) % 50 }); label(ctx, str, x, y + size * 0.36, size, col); ctx.restore();
  }
  function compare(ctx, t) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, H, [[0, '#C3CDD5'], [1, '#B3C0CA']]));
    // 左:內部成本表
    const la = popIn(t, ev.cmp + 0.05, 0.35);
    ctx.save(); ctx.translate(476, 520); ctx.scale(la, la); ctx.translate(-476, -520);
    KIT.card(ctx, 96, 140, 760, 770, { fill: '#FBF8EE', seed: 1420 });
    label(ctx, '內部成本表', 476, 222, 58, C.ink);
    pill(ctx, '自己算成本用', 476, 286, 36, C.ink, t >= ev.self ? '#FFE27A' : '#F1ECDE');
    const ck = (i) => clamp((t - ev.ticks[i]) / 0.25);
    colorBuilding(ctx, t, { ...CB, st: (i) => ({ lit: 1, name: 1, check: t >= ev.ticks[i] ? ck(i) : 0 }), roof: 1 });
    ctx.restore();
    // 右:給客戶的報價單(行數少)
    if (t >= ev.client) {
      const ra = popIn(t, ev.client, 0.35), H0 = QC.rowY - QC.y + QROWS.length * QC.rowH + 36;
      ctx.save(); ctx.translate(QC.x + QC.w / 2, QC.y + H0 / 2); ctx.scale(ra, ra); ctx.translate(-(QC.x + QC.w / 2), -(QC.y + H0 / 2));
      KIT.card(ctx, QC.x, QC.y, QC.w, H0, { fill: C.paper, seed: 1430 });
      label(ctx, '給客戶的報價單', QC.x + QC.w / 2, QC.y + 76, 54, C.ink);
      pill(ctx, '照客戶的格式', QC.x + QC.w / 2, QC.y + 136, 36, C.ink, t >= ev.format ? '#FFE27A' : '#F1ECDE');
      QROWS.forEach((r, k) => {
        const y0 = QC.rowY + k * QC.rowH, at = ev.rows[k];
        if (r.kind === 'sub') stroke(ctx, [[QC.x + 30, y0 + 2], [QC.x + QC.w - 30, y0 + 2]], C.ink, 3);
        else if (r.kind === 'total') { stroke(ctx, [[QC.x + 30, y0 + 1], [QC.x + QC.w - 30, y0 + 1]], C.ink, 3); stroke(ctx, [[QC.x + 30, y0 + 9], [QC.x + QC.w - 30, y0 + 9]], C.ink, 3); }
        else if (k > 0) { ctx.save(); ctx.setLineDash([6, 8]); stroke(ctx, [[QC.x + 30, y0], [QC.x + QC.w - 30, y0]], '#D2C6AC', 2.5); ctx.restore(); }
        if (t < at) return;
        const a = clamp((t - at) / 0.2);
        ctx.save(); ctx.globalAlpha *= a;
        txt(ctx, r.text, QC.x + 40, y0 + QC.rowH / 2 + 15, r.kind === 'total' ? 44 : 40, r.kind === 'sub' ? C.muted : C.ink);
        ctx.restore();
      });
      ctx.restore();
    }
    // 箭頭:左 → 右
    const ar = ease.outCubic(clamp((t - ev.client - 0.2) / 0.45));
    if (ar > 0) { const y = 560, P = KIT.partial([[878, y], [1036, y]], ar); stroke(ctx, P, C.orange, 22); if (ar >= 1) G.poly(ctx, [[1030, y - 34], [1062, y], [1030, y + 34]], { fill: C.orange, lw: 4, seed: 2650 }); }
    // 六層的錢一波一波飛進右邊的幾行;落在每一行右邊排成一排
    const rowCount = [0, 0, 0, 0, 0, 0];
    const landed = [];
    FLOW.forEach((rows, i) => rows.forEach((r, j) => { landed.push({ i, r, slot: rowCount[r]++, t0: ev.wave[i] + j * 0.06 }); }));
    for (const c of landed) {
      if (t < c.t0) continue;
      const y0 = CB.bottom - (c.i + 0.5) * CB.fh, x0 = CB.cx + CB.w / 2 - 30;
      const x1 = QC.x + QC.w - 50 - c.slot * 30, y1 = QC.rowY + c.r * QC.rowH + QC.rowH / 2;
      const q = clamp((t - c.t0) / 0.6), e = ease.inOutCubic(q);
      const cxp = lerp(x0, x1, e), cyp = lerp(y0, y1, e) - Math.sin(Math.PI * e) * 170;
      coin(ctx, cxp, cyp, q < 1 ? 17 : 17, 1, FLOORS[c.i].chip, 2700 + c.i * 10 + c.slot);
    }
    // 一毛不少
    if (t >= ev.stamp) KIT.stamp(ctx, '一毛不少', QC.x + 556, QC.rowY + 5.5 * QC.rowH + 12, t, ev.stamp, { size: 50, rot: -0.07, color: '#2E7D4A', padX: 24, padY: 12 });
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.06)', floor: 0.16 });
  }

  // ===================================== 第 10 句:公共工程標單 vs 民間報價單 =====================================
  function desk(ctx) {
    fill(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, W, H, [[0, '#D9C3A0'], [1, '#C7AC84']]));
    for (let k = 0; k < 14; k++) G.line(ctx, [[-40, 40 + k * 80 + Math.sin(k) * 10], [W + 40, 60 + k * 80 - Math.cos(k) * 12]], { color: 'rgba(150,110,70,0.25)', lw: 4, seed: 1300 + k, amp: 3 });
  }
  const LONG_ROWS = 13, LR = { x: 150, y: 70, w: 640, rowY: 196, rowH: 52 };
  const SAFE_ROW = 6, QC_ROW = 8;
  const SR = { x: 1130, y: 232, w: 620, h: 452 };
  function pubPriv(ctx, t) {
    desk(ctx);
    // 很長的公共工程標單(後面還有一頁)
    const la = popIn(t, ev.pub + 0.05, 0.35);
    ctx.save(); ctx.translate(LR.x + LR.w / 2, 480); ctx.scale(la, la); ctx.translate(-(LR.x + LR.w / 2), -480);
    G.rrect(ctx, LR.x + 26, LR.y + 22, LR.w, 846, 4, { fill: '#F1ECDE', lw: 3.5, seed: 1501 });
    G.rrect(ctx, LR.x, LR.y, LR.w, 846, 4, { fill: '#FFFDF4', lw: 4, seed: 1500 });
    label(ctx, '公共工程標單', LR.x + LR.w / 2, LR.y + 76, 50, C.ink);
    stroke(ctx, [[LR.x + 30, LR.y + 104], [LR.x + LR.w - 30, LR.y + 104]], C.ink, 3);
    for (let k = 0; k < LONG_ROWS; k++) {
      const y = LR.rowY + k * LR.rowH, named = k === SAFE_ROW ? ['安全衛生', ev.safety] : k === QC_ROW ? ['品管', ev.qc] : null;
      if (named && t >= named[1]) {
        const g = clamp((t - named[1]) / 0.3);
        ctx.save(); ctx.globalAlpha *= 0.9 * g; fill(ctx, LR.x + 20, y - 4, (LR.w - 40) * ease.outCubic(g), LR.rowH - 4, C.hi); ctx.restore();
        ctx.save(); ctx.globalAlpha *= g; txt(ctx, named[0], LR.x + 72, y + 36, 40, C.ink); ctx.restore();
        G.line(ctx, [[LR.x + LR.w - 150, y + 24], [LR.x + LR.w - 40, y + 24]], { color: '#B8AE9A', lw: 7, seed: 1520 + k, amp: 0.3 });
      } else {
        G.line(ctx, [[LR.x + 36, y + 24], [LR.x + 56, y + 24]], { color: '#CFC4AC', lw: 7, seed: 1540 + k, amp: 0.3 });
        G.line(ctx, [[LR.x + 76, y + 24], [LR.x + 160 + ((k * 73) % 220), y + 24]], { color: '#CFC4AC', lw: 7, seed: 1560 + k, amp: 0.3 });
        G.line(ctx, [[LR.x + LR.w - 150, y + 24], [LR.x + LR.w - 40, y + 24]], { color: '#CFC4AC', lw: 7, seed: 1580 + k, amp: 0.3 });
      }
    }
    ctx.restore();
    // 很短的民間報價單
    const ra = popIn(t, ev.priv, 0.35);
    if (ra > 0) {
      ctx.save(); ctx.translate(SR.x + SR.w / 2, SR.y + SR.h / 2); ctx.scale(ra, ra); ctx.translate(-(SR.x + SR.w / 2), -(SR.y + SR.h / 2));
      const hole = clamp((t - ev.hole) / 0.3);
      G.rrect(ctx, SR.x, SR.y, SR.w, SR.h, 4, { fill: '#FFFDF4', lw: 4, seed: 1600 });
      label(ctx, '民間報價單', SR.x + SR.w / 2, SR.y + 74, 50, C.ink);
      stroke(ctx, [[SR.x + 30, SR.y + 102], [SR.x + SR.w - 30, SR.y + 102]], C.ink, 3);
      for (let k = 0; k < 3; k++) { const y = SR.y + 146 + k * 52; G.line(ctx, [[SR.x + 40, y], [SR.x + 150 + k * 60, y]], { color: '#CFC4AC', lw: 7, seed: 1610 + k, amp: 0.3 }); G.line(ctx, [[SR.x + SR.w - 150, y], [SR.x + SR.w - 40, y]], { color: '#CFC4AC', lw: 7, seed: 1620 + k, amp: 0.3 }); }
      stroke(ctx, [[SR.x + 30, SR.y + 380], [SR.x + SR.w - 30, SR.y + 380]], C.ink, 3); // 合計線
      G.line(ctx, [[SR.x + 40, SR.y + 412], [SR.x + 130, SR.y + 412]], { color: '#B8AE9A', lw: 8, seed: 1625, amp: 0.3 }); G.line(ctx, [[SR.x + SR.w - 170, SR.y + 412], [SR.x + SR.w - 40, SR.y + 412]], { color: '#B8AE9A', lw: 8, seed: 1626, amp: 0.3 });
      // 沒有那一行:紅色虛線空格 + 問號
      if (t >= ev.none) {
        const g = clamp((t - ev.none) / 0.3), y = SR.y + 318, fl = 0.6 + 0.4 * Math.sin(t * 8);
        ctx.save(); ctx.globalAlpha *= g * fl; ctx.setLineDash([14, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(SR.x + 30, y - 30, SR.w - 60, 60); ctx.restore();
        ctx.save(); ctx.globalAlpha *= g; label(ctx, '?', SR.x + SR.w / 2, y + 20, 56, C.red); ctx.restore();
      }
      // 破洞(紙的下緣)
      if (hole > 0) {
        const hx = SR.x + SR.w / 2, hy = SR.y + SR.h, k = ease.outBack(hole);
        const P = [[-74, 2], [-60, -30], [-36, -20], [-16, -50], [8, -28], [30, -46], [50, -18], [74, 2]].map(([x, y]) => [hx + x * k, hy + y * k]);
        G.poly(ctx, P, { fill: '#7A5A3A', lw: 4, seed: 1630, step: 10 });
        stroke(ctx, P.slice(1, -1).map(([x, y]) => [x, y + 6]), 'rgba(255,255,255,0.7)', 3);
      }
      ctx.restore();
    }
    // 虛線箭頭:公共工程有的那兩行 → 民間報價單沒有
    if (t >= ev.none) {
      const g = ease.outCubic(clamp((t - ev.none) / 0.5));
      for (const [k, yy] of [[SAFE_ROW, 0], [QC_ROW, 1]]) {
        const y0 = LR.rowY + k * LR.rowH + 24, y1 = SR.y + 318 + (yy ? 14 : -14), P = [];
        for (let j = 0; j <= 20; j++) { const q = j / 20; P.push([lerp(LR.x + LR.w + 6, SR.x + 22, q), lerp(y0, y1, q) - Math.sin(q * Math.PI) * 50]); }
        ctx.save(); ctx.setLineDash([16, 12]); stroke(ctx, KIT.partial(P, g), C.red, 6); ctx.restore();
      }
    }
    // 錢從破洞漏出去
    if (t >= ev.leak) {
      const hx = SR.x + SR.w / 2, hy = SR.y + SR.h - 10;
      for (let k = 0; k < 40; k++) {
        const t0 = ev.leak + k * 0.16 + U.hash(k, 3) * 0.08, d = t - t0;
        if (d < 0) break;
        const y = hy + 200 * d + 900 * d * d, x = hx + (U.hash(k, 5) - 0.5) * 70 + (U.hash(k, 6) - 0.5) * 140 * d;
        if (y > 905) continue;
        coin(ctx, x, y, 22, clamp(1 - (y - 800) / 105), '#C9971A', 2800 + (k % 9));
      }
    }
    KIT.warm(ctx, { color: 'rgba(255,230,190,0.10)' });
  }

  // ===================================== 第 12 句:阿樹指著自己報價單上的 20,000 =====================================
  const QX = 560, QY = 110;
  function quoteInsert(ctx, t) {
    fill(ctx, -100, -100, W + 200, H + 200, lin(ctx, 0, 0, 0, H, [[0, '#E3E8E2'], [1, '#CDD5CC']]));
    for (let k = 0; k < 3; k++) fill(ctx, -100, 60 + k * 70, W + 200, 34, `rgba(255,255,255,${0.22 - k * 0.05})`);
    const BOT = QY + 636;
    // 左手拿著紙(手掌在紙後面)
    G.limb(ctx, [[330, 1200], [QX + 40, BOT + 40]], { color: CAST.shu.skin, lw: 74, seed: 1880 }); G.ellipse(ctx, QX + 40, BOT, 58, 50, { fill: CAST.shu.skin, lw: 4.5, seed: 1881 });
    const T = KIT.table(ctx, t, { x: QX, y: QY, w: 800, title: '報價單', titleSize: 56, size: 50, rowH: 84, seed: 610, foot: 70,
      rows: KIT.L003.QUOTE.map((r) => (r.key === 'fee' ? { ...r, hi: ev.point, hiColor: '#FFE9A0' } : { ...r })) });
    const r = T.rows[2], vx = QX + r.cx[1], vy = QY + r.base;
    G.ellipse(ctx, QX + 64, BOT - 32, 22, 34, { fill: CAST.shu.skin, lw: 4, seed: 1882 }); // 大拇指在紙前面
    // 右手食指從右下伸過來,指尖停在 20,000 的右邊(手在紙的外面,不蓋到任何數字)
    const tap = t >= ev.tap && t < ev.tap + 0.4 ? Math.abs(Math.sin((t - ev.tap) / 0.2 * Math.PI)) * 12 : 0;
    const come = ease.outCubic(clamp((t - ev.quote - 0.1) / 0.45));
    const tipX = vx + 26 - tap, tipY = vy - 12 + tap * 0.4;                  // 數字右緣 vx;指尖在它右邊一點
    const hx = lerp(tipX + 420, tipX + 104, come), hy = lerp(tipY + 640, tipY + 78, come);
    G.limb(ctx, [[hx + 300, hy + 600], [hx + 120, hy + 260], [hx + 14, hy + 20]], { color: CAST.shu.skin, lw: 72, seed: 1890 }); // 前臂
    G.limb(ctx, [[hx + 380, hy + 760], [hx + 290, hy + 560]], { color: CAST.shu.shirt, lw: 100, seed: 1891 });                 // 袖子(畫面外)
    G.limb(ctx, [[hx - 18, hy - 18], [tipX, tipY]], { color: CAST.shu.skin, lw: 25, outline: 4, seed: 1893 });                  // 食指
    G.ellipse(ctx, hx, hy, 48, 42, { fill: CAST.shu.skin, lw: 4.5, seed: 1892 });                                                // 拳頭
    for (let k = 0; k < 3; k++) stroke(ctx, [[hx - 24 + k * 15, hy + 6 + k * 6], [hx - 12 + k * 15, hy + 22 + k * 6]], 'rgba(120,70,40,0.45)', 3);
    G.ellipse(ctx, hx - 22, hy - 30, 20, 12, { fill: CAST.shu.skin, lw: 3.5, seed: 1894 });                                     // 大拇指
    if (t >= ev.point) { const g = clamp((t - ev.point) / 0.3), pul = 1 + 0.05 * Math.sin((t - ev.point) * 7) * g; ctx.save(); ctx.globalAlpha *= g; ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(vx - 88, vy - 18, 116 * pul, 48 * pul, -0.04, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    KIT.warm(ctx, { color: 'rgba(255,255,255,0.08)' });
  }

  // ===================================== 鏡頭表 =====================================
  const film = Shots.film([
    { at: 0, draw: (ctx, t) => KIT.chapterCard(ctx, t, 0, { n: 3, title: '成本是一棟六層樓' }) },
    { at: S.CHAPTER, draw: wide, in: 'cut', cam: Shots.push(1.0, 1.03) },
    { at: ev.draw0, draw: closeDraw, in: 'zoom', cam: Shots.push(1.0, 1.03) },
    { at: A[1] - 0.15, draw: twoShot, in: 'cut', cam: Shots.push(1.0, 1.025) },
    { at: ev.write0, draw: closeWrite, in: 'zoom' },
    { at: A[3] - 0.15, draw: twoShot, in: 'cut', cam: Shots.combine(Shots.push(1.0, 1.02), Shots.shake(14, ev.fall, 6)) },
    { at: ev.figB, draw: (ctx, t) => figB(ctx, t, 'build'), in: 'zoom', cam: Shots.push(1.0, 1.02) },
    { at: ev.cmp, draw: compare, in: 'cut' },
    { at: ev.pub, draw: pubPriv, in: 'cut', cam: Shots.push(1.0, 1.02) },
    { at: ev.back, draw: twoShot, in: 'cut', cam: Shots.push(1.0, 1.02) },
    { at: ev.quote, draw: quoteInsert, in: 'cut', cam: Shots.push(1.0, 1.03) },
    { at: ev.ask, draw: twoShot, in: 'cut' },
    { at: ev.shrinkCut, draw: (ctx, t) => figB(ctx, t, 'shrink'), in: 'zoom' },
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
