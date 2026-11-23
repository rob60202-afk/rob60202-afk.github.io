// 工程現場故事 第 4 集:少了一個簽名。每一格都是時間 t 的純函式。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300, INK = '#3A2A20', RED = '#C8452F', GREEN = '#3E9B5F', STEEL = '#D9DEE3', BLUE = '#2B5FA8';
  const PIPE_Y = 960; // 牆上原本那一排管線
  const EY = 620, EB = [803, 607, 411, 215]; // 追加的那一條:從立管往左拉,分三段
  let VO = null, SUBS = [];

  // ---------- 角色(與前幾集相同的造型;進現場一律戴安全帽) ----------
  const SKIN = '#F0C29C';
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CLIENT = { outfit: 'suit', robe: '#3A4A6B', trim: RED, shirt: '#FFFFFF', bottoms: 'pants', shorts: '#2E3A55', pants: '#2E3A55', skin: '#EBC19A', hair: '#2A2220', hairStyle: 'short', glasses: 'square', shoes: '#2A2220' };
  const VISITOR = '#3F7FBF'; // 業主進現場戴藍色安全帽
  const CAST = {
    shu: SHU,                                                             // 辦公室裡
    shuSite: { ...SHU, headwear: 'cap', headwearColor: '#F2C230' },       // 工地:黃色安全帽
    master: { ...MASTER, headwear: 'cap', headwearColor: '#F4F4F0' },     // 師傅:白色安全帽
    client: CLIENT,                                                       // 當初開口的窗口(辦公室)
    clientSite: { ...CLIENT, headwear: 'cap', headwearColor: VISITOR },   // 窗口到現場:西裝加安全帽
    officer: { outfit: 'suit', robe: '#6B5470', trim: '#D9A441', shirt: '#FFFFFF', bottoms: 'pants', shorts: '#4A3A50', pants: '#4A3A50', skin: '#F4CDAE', hair: '#4A2E20', hairStyle: 'bun', glasses: 'round', build: 'slim', shoes: '#2A2220' }, // 另一位承辦
    client2: { outfit: 'suit', robe: '#51625A', trim: '#2B5FA8', shirt: '#FFFFFF', bottoms: 'pants', shorts: '#3C4A44', pants: '#3C4A44', skin: '#E3B58E', hair: '#5A4030', hairStyle: 'short', facialHair: 'stubble', build: 'regular', shoes: '#2A2220', headwear: 'cap', headwearColor: VISITOR }, // 後來的業主窗口
  };
  globalThis.CAST = CAST;

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
  const stroke = (ctx, pts, color, lw) => { // 乾淨的筆畫(寫字、簽名用)
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
  function docIcon(ctx, x, y, s, seed, { sig = false } = {}) { // 一張紙
    G.rrect(ctx, x - 50 * s, y - 66 * s, 100 * s, 132 * s, 8 * s, { fill: '#FFFFFF', lw: 4, seed });
    for (let k = 0; k < 3; k++) G.line(ctx, [[x - 32 * s, y - 36 * s + k * 24 * s], [x + (k === 2 ? 8 : 32) * s, y - 36 * s + k * 24 * s]], { color: '#9AA3AD', lw: 5 * s, seed: seed + 1 + k, amp: 0.3 });
    if (sig) stroke(ctx, [[-30, 44], [-18, 28], [-8, 46], [4, 26], [14, 44], [30, 34]].map(([a, b]) => [x + a * s, y + b * s]), BLUE, 5 * s);
  }
  function notebook(ctx, x, y, rot, s, seed) { // 口袋大小的小本子
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -34, -46, 68, 92, 6, { fill: '#FFFDF4', lw: 4, seed });
    G.rrect(ctx, -34, -46, 68, 20, 5, { fill: RED, lw: 4, seed: seed + 1 });
    for (let k = 0; k < 3; k++) G.line(ctx, [[-22, -8 + k * 16], [22, -8 + k * 16]], { color: '#B8AE9A', lw: 3, seed: seed + 2 + k, amp: 0.3 });
    ctx.restore();
  }
  function pen(ctx, x, y, rot, col = BLUE) { // 筆尖在 (x, y)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    G.rrect(ctx, -6, -62, 12, 50, 4, { fill: col, lw: 3, seed: 47 });
    G.poly(ctx, [[-6, -12], [6, -12], [0, 0]], { fill: '#E9E2D0', lw: 3, seed: 48 });
    ctx.restore();
  }
  function extraPipe(ctx, t, { dash = 0, built = 0 } = {}) { // 追加的那一條:虛線 → 一段一段變成真的
    const xb = EB[built], xl = lerp(EB[0], EB[3], dash);
    if (built < 3 && xl < xb - 2) {
      const fl = 0.65 + 0.35 * Math.sin(t * 7);
      ctx.save(); ctx.beginPath(); ctx.rect(xl - 8, EY - 40, xb - xl + 16, 80); ctx.clip();
      fillRect(ctx, EB[3], EY - 17, xb - EB[3], 34, `rgba(200,69,47,${0.16 * fl})`);
      ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.strokeRect(EB[3], EY - 17, xb - EB[3], 34);
      ctx.restore();
    }
    for (let k = 0; k < built; k++) {
      const mid = (EB[k] + EB[k + 1]) / 2;
      G.rrect(ctx, mid - 8, EY + 14, 16, 40, 3, { fill: '#8E99A3', lw: 4, seed: 392 + k }); // 固定架
      pipeSeg(ctx, EB[k + 1], EB[k], EY, 34, 395 + k * 9, { flanges: true });
    }
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

  // ---------- 場景 ----------
  function officeDay(ctx) { // 與前幾集同一間辦公室
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    G.rrect(ctx, 120, 420, 840, 420, 12, { fill: '#BFE3F0', lw: 6, seed: 201 });
    for (const vx of [400, 680]) G.line(ctx, [[vx, 426], [vx, 834]], { color: '#8FB7C7', lw: 8, seed: 202 + vx });
    for (let k = 0; k < 5; k++) G.rrect(ctx, 160 + k * 170, 700 - (k % 3) * 60, 110, 140 + (k % 3) * 60, 4, { fill: '#A9CBD8', lw: 0, seed: 205 + k, alpha: 0.7 }); // 窗外大樓
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
  }
  function plainRoom(ctx, tint) { // 沒有窗的一面牆
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#EAF3F7'], [1, '#D6E6EC']]));
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 210);
    if (tint) fillRect(ctx, -200, -200, W + 400, H + 400, tint);
  }
  function fab(ctx, t) { // 與前幾集同一座廠房(這次是沒有窗的那面牆)
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 100, 0, 1300, [[0, '#C9D3DB'], [1, '#E3E9EE']]));
    for (const cx of [130, 950]) G.rrect(ctx, cx - 36, 200, 72, 1100, 4, { fill: '#AEB9C3', lw: 5, seed: 301 + cx });
    G.rrect(ctx, -30, 214, W + 60, 36, 0, { fill: '#8E99A3', lw: 5, seed: 303 });
    [['#D9DEE3', 280], ['#F2C230', 326], ['#D9DEE3', 372], ['#6FA287', 418]].forEach(([c, y], k) => {
      G.rrect(ctx, -30, y, W + 60, 26, 12, { fill: c, lw: 4, seed: 310 + k });
      for (let j = 0; j < 4; j++) G.rrect(ctx, 200 + j * 240 + k * 20, y - 6, 16, 38, 3, { fill: '#6C7680', lw: 3, seed: 320 + k * 5 + j });
    });
    for (const hx of [300, 560]) G.line(ctx, [[hx, 250], [hx, 444]], { color: '#6C7680', lw: 5, seed: 340 + hx });
    fillRect(ctx, -200, GROUND, W + 400, 800, lin(ctx, 0, GROUND, 0, 1900, [[0, '#B9C7C2'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 350);
    G.rrect(ctx, -30, GROUND + 120, W + 60, 22, 0, { fill: '#F2C230', lw: 0, seed: 360, alpha: 0.85 });
    G.rrect(ctx, 803, 440, 34, PIPE_Y - 440 + 17, 10, { fill: STEEL, lw: 4, seed: 380 }); // 立管
    G.rrect(ctx, 796, 760, 48, 20, 4, { fill: '#8E99A3', lw: 4, seed: 381 });
    for (const px of [250, 470, 700]) G.rrect(ctx, px - 9, PIPE_Y + 14, 18, GROUND - PIPE_Y - 14, 3, { fill: '#8E99A3', lw: 4, seed: 382 + px });
    pipeSeg(ctx, -30, 180, PIPE_Y, 34, 385); pipeSeg(ctx, 180, 400, PIPE_Y, 34, 386); pipeSeg(ctx, 400, 640, PIPE_Y, 34, 387); pipeSeg(ctx, 640, 830, PIPE_Y, 34, 388, { flanges: false });
  }

  // ---------- 每一幕 ----------
  function ask(ctx, t) { // 0:施工到一半,業主的窗口走過來:這裡幫我多拉一條
    fab(ctx, t);
    const pointing = t >= ev.point, tArr = ev.walk + 1.7, arrived = t >= tArr, noticed = t >= tArr - 0.5;
    extraPipe(ctx, t, { dash: ease.outCubic(clamp((t - ev.point - 0.12) / 0.8)) });
    // 阿樹:正在鎖牆上的管
    const SX = 285, SS = 1.22, wob = noticed ? 0 : Math.sin(t * 11) * 12;
    const wx = 404, wy = 1046 + wob * 0.4;
    Ch.person(ctx, { x: SX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuSite, handR: hand(SX, GROUND, SS, 1, wx, wy),
      eyes: pointing ? 'wide' : 'normal', mouth: pointing ? 'o' : noticed ? 'smile' : 'flat', brows: pointing ? 'up' : noticed ? 'neutral' : 'determined',
      look: noticed ? 0.9 : 0.5, lookY: pointing ? -0.7 : noticed ? 0 : 0.5, headRot: pointing ? -0.06 : 0, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    wrench(ctx, wx, wy, 0.05 + wob * 0.02, 1.0);
    // 業主的窗口:西裝加安全帽,從右邊走過來
    const CX = 772, CS = 1.25;
    if (t >= ev.walk && !arrived) {
      const d = (t - ev.walk) * (1130 - CX) / 1.7;
      Ch.person(ctx, { x: 1130 - d, y: GROUND, s: CS, sx: -1, pose: 'walk', walk: (d / (300 * CS)) % 1, style: CAST.clientSite, eyes: 'normal', mouth: 'smile', look: 0.8, seed: 440 });
    } else if (arrived) {
      const yak = pointing && t < E[0] && Math.floor(t * 7) % 2;
      Ch.person(ctx, { x: CX, y: GROUND, s: CS, sx: -1, pose: 'stand', style: CAST.clientSite, gesture: pointing ? 'point' : undefined,
        handR: pointing ? hand(CX, GROUND, CS, -1, 590 + Math.sin(t * 5) * 5, 742) : undefined,
        eyes: 'normal', mouth: yak ? 'o' : 'smile', brows: pointing ? 'up' : 'neutral', look: 0.8, lookY: pointing ? -0.6 : 0, blink: blink(t, 0.45), seed: 440 });
    }
    if (t >= ev.point + 0.55) { // +1
      const a = popIn(t, ev.point + 0.55, 0.28);
      ctx.save(); ctx.translate(505, 520); ctx.scale(a, a); ctx.rotate(-0.05 + Math.sin(t * 5) * 0.02);
      G.decor(() => label(ctx, '+1 條', 0, 30, 96, RED, { stroke: '#FFFFFF', strokeW: 22 }));
      ctx.restore();
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function yes(ctx, t) { // 1:阿樹想都沒想:「好,沒問題!」
    const said = t >= ev.yes, m = mouthOf('shu', t, ev.yes - 0.15);
    ctx.save(); ctx.translate(540, GROUND); ctx.scale(1.16, 1.16); ctx.translate(-540, -GROUND);
    fab(ctx, t);
    extraPipe(ctx, t, { dash: 1 });
    const SX = 345, SS = 1.22, hop = said ? Math.abs(Math.sin((t - ev.yes) * 8)) * 16 * clamp(1 - (t - ev.yes) / 0.8) : 0;
    Ch.person(ctx, { x: SX, y: GROUND - hop, s: SS, pose: 'stand', style: CAST.shuSite, gesture: said ? 'thumbsUp' : undefined,
      eyes: said ? 'happy' : 'normal', mouth: m || (said ? 'grin' : 'smile'), brows: 'up', look: 0.8, blush: 0.7, blink: blink(t, 0.2), seed: 400 });
    Ch.person(ctx, { x: 735, y: GROUND, s: 1.25, sx: -1, pose: 'stand', style: CAST.clientSite, gesture: t >= ev.yes + 0.9 ? 'thumbsUp' : undefined,
      eyes: said ? 'happy' : 'normal', mouth: 'smile', brows: 'neutral', look: 0.8, blink: blink(t, 0.45), seed: 440 });
    if (said) for (let k = 0; k < 4; k++) { const b = popIn(t, ev.yes + k * 0.07, 0.22); G.star(ctx, 468 + [0, 62, 96, 30][k], 915 + [0, -48, 30, 86][k] - 40, (k % 2 ? 16 : 22) * b, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 60 + k }); }
    finish(ctx, 'rgba(255,255,255,0.10)');
    ctx.restore();
  }
  function work(ctx, t) { // 2:多用了材料,多做了兩天。他覺得這是服務
    fab(ctx, t);
    const built = ev.built.filter((b) => t >= b).length, proud = t >= ev.proud, nMat = ev.mats.filter((b) => t >= b).length;
    extraPipe(ctx, t, { dash: 1, built });
    // 工作梯
    const PY = 1182, SX = 318, SS = 1.05;
    for (const lx of [222, 414]) G.line(ctx, [[lx + (lx < 300 ? 22 : -22), PY + 10], [lx, GROUND]], { color: '#C98A3A', lw: 14, seed: 500 + lx });
    G.line(ctx, [[232, PY + 66], [404, PY + 66]], { color: '#C98A3A', lw: 10, seed: 503 });
    G.rrect(ctx, 226, PY, 184, 22, 5, { fill: '#E9A23B', lw: 5, seed: 504 });
    // 地上多出來的材料
    for (let k = 0; k < nMat; k++) { const a = popIn(t, ev.mats[k], 0.22); ctx.save(); ctx.translate(690 + (k === 2 ? 0 : (k - 0.5) * 70), GROUND - 16 - (k === 2 ? 30 : 0)); ctx.scale(a, a); pipeSeg(ctx, -64, 64, 0, 30, 510 + k * 9, { flanges: false }); ctx.restore(); }
    // 阿樹在梯子上鎖管
    const wobbling = !proud && built < 3, wob = wobbling ? Math.sin(t * 11) * 12 : 0;
    const hx = 420 + wob * 0.5, hy = 742;
    Ch.person(ctx, { x: SX, y: PY, s: SS, pose: 'stand', style: CAST.shuSite, gesture: proud ? 'thumbsUp' : undefined, handR: proud ? undefined : hand(SX, PY, SS, 1, hx, hy),
      eyes: proud ? 'happy' : 'normal', mouth: proud ? 'grin' : 'flat', brows: proud ? 'up' : 'determined', look: proud ? 0.2 : 0.8, lookY: proud ? 0 : -0.7, sweat: 0.8, blush: 0.65, blink: blink(t, 0.2), seed: 400 });
    if (!proud) wrench(ctx, hx, hy, 0.02 + wob * 0.02, 1.05);
    for (let k = 0; k < 3; k++) { const q = t - ev.built[k]; if (q >= 0 && q < 0.25) for (let j = 0; j < 6; j++) { const an = j * Math.PI / 3 + 0.3, r0 = 30 + q * 130, r1 = r0 + 28, cx = EB[k + 1] + 10; G.line(ctx, [[cx + Math.cos(an) * r0, EY + Math.sin(an) * r0], [cx + Math.cos(an) * r1, EY + Math.sin(an) * r1]], { color: RED, lw: 8, seed: 780 + j, alpha: 1 - q / 0.25 }); } }
    // 卡片:材料、第 1 天、第 2 天
    if (nMat) {
      const a = popIn(t, ev.mats[0], 0.25), b = popIn(t, ev.mats[nMat - 1], 0.18);
      ctx.save(); ctx.translate(238, 448); ctx.rotate(-0.02); ctx.scale(a, a);
      G.tornPaper(ctx, -108, -78, 216, 156, { fill: '#FFF6D8', seed: 520 });
      G.decor(() => { label(ctx, '材料', 0, -18, 48, INK); ctx.save(); ctx.translate(0, 34); ctx.scale(0.85 + 0.15 * b, 0.85 + 0.15 * b); label(ctx, '+' + nMat, 0, 22, 70, RED); ctx.restore(); });
      ctx.restore();
    }
    dayCard(ctx, 500, 448, 1, popIn(t, ev.days[0], 0.25), 530);
    dayCard(ctx, 738, 448, 2, popIn(t, ev.days[1], 0.25), 540);
    if (proud) { // 他覺得這是服務
      const a = popIn(t, ev.proud, 0.3);
      ctx.save(); ctx.translate(520, 860); ctx.scale(a, a); ctx.rotate(Math.sin(t * 4) * 0.05);
      G.heart(ctx, 0, 0, 3.4, { fill: '#E0506A', seed: 550 });
      ctx.restore();
      for (let k = 0; k < 3; k++) { const b = popIn(t, ev.proud + 0.1 + k * 0.08, 0.22); G.star(ctx, 600 + k * 44, 800 + (k % 2) * 80, 20 * b, { fill: '#FFF2A8', rot: t * 1.5 + k, seed: 60 + k }); }
    }
    finish(ctx, 'rgba(255,255,255,0.10)');
  }
  function claim(ctx, t) { // 3:請款那天,追加的費用被整筆劃掉
    plainRoom(ctx);
    const struck = t >= ev.strike + 0.3, su = clamp((t - ev.strike) / 0.3);
    Ch.person(ctx, { x: 520, y: 1990, s: 2.2, pose: 'stand', style: CAST.shu, eyes: struck ? 'wide' : 'happy', mouth: struck ? 'o' : 'grin', brows: struck ? 'worried' : 'up',
      look: 0, lookY: -0.6, sweat: struck ? 1 : 0, blush: 0.6, headRot: struck ? Math.sin(t * 40) * 0.012 : 0, blink: struck ? 0 : blink(t, 0.2), seed: 400, shadow: false });
    const a = popIn(t, ev.sheet, 0.35), kick = struck ? U.springKick(t, ev.strike + 0.3, 9, 6) * 7 : 0;
    ctx.save(); ctx.translate(505 + kick, 300 + (1 - a) * 60); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -330, 0, 660, 548, { fill: '#FFFDF4', seed: 61 });
    const bar = (x, y, w, col = '#B8AE9A') => G.line(ctx, [[x, y], [x + w, y]], { color: col, lw: 14, seed: 63 + x + y, amp: 0.4 });
    G.decor(() => {
      label(ctx, '請 款 單', 0, 84, 62, INK);
      G.line(ctx, [[-280, 112], [280, 112]], { color: INK, lw: 4, seed: 62 });
      G.text(ctx, '原合約工程', -282, 206, { size: 50, fam: CJK, weight: 800, color: INK, boil: 0 });
      bar(40, 190, 150); tickMark(ctx, 256, 188, 28, 1, 70);
      G.line(ctx, [[-280, 246], [280, 246]], { color: '#D8CDB4', lw: 3, seed: 64 });
      fillRect(ctx, -300, 262, 600, 104, 'rgba(242,194,48,0.28)');
      G.text(ctx, '追加管線', -282, 334, { size: 54, fam: CJK, weight: 800, color: struck ? '#9A8F80' : INK, boil: 0 });
      bar(40, 316, 150, struck ? '#D8CDB4' : '#B8AE9A');
      if (!struck) { ctx.save(); ctx.translate(256, 314); ctx.rotate(Math.sin(t * 5) * 0.06); label(ctx, '?', 0, 22, 62, '#B98A1E'); ctx.restore(); }
      G.line(ctx, [[-280, 390], [280, 390]], { color: INK, lw: 4, seed: 65 });
      G.text(ctx, '合計', -282, 470, { size: 50, fam: CJK, weight: 800, color: INK, boil: 0 });
      bar(40, 454, lerp(230, 150, su));
    });
    if (su > 0) { // 紅線
      const x1 = lerp(-305, 305, ease.outCubic(su));
      stroke(ctx, [[-305, 318], [x1, 318 - 6 * su]], RED, 14);
      if (su >= 1) stroke(ctx, [[-300, 334], [300, 324]], 'rgba(200,69,47,0.55)', 6);
    }
    if (t >= ev.strike + 0.5) { // 章
      const b = popIn(t, ev.strike + 0.5, 0.2);
      ctx.save(); ctx.translate(196, 452); ctx.rotate(-0.16); ctx.scale(b * (2 - b), b * (2 - b));
      G.rrect(ctx, -106, -48, 212, 96, 14, { fill: 'rgba(255,253,244,0.9)', stroke: RED, lw: 9, seed: 450 });
      G.decor(() => label(ctx, '不計價', 0, 22, 60, RED));
      ctx.restore();
    }
    ctx.restore();
    finish(ctx);
  }
  function officerAsk(ctx, t) { // 4:另一位承辦:「誰同意的?有文件嗎?」
    officeDay(ctx);
    const m = mouthOf('officer', t), second = t >= ev.doc;
    Ch.person(ctx, { x: 520, y: 1900, s: 2.05, pose: 'stand', style: CAST.officer, handR: [150, -322 + 70 + Math.sin(t * 4) * 8], eyes: 'normal', mouth: m || 'flat', brows: second ? 'up' : 'determined',
      look: 0, headRot: Math.sin(t * 2.2) * 0.025 + (second ? 0.04 : 0), blink: blink(t, 0.5), seed: 460, shadow: false });
    const a = popIn(t, ev.ask + 0.12, 0.3);
    ctx.save(); ctx.translate(505, 590); ctx.scale(a, a);
    G.poly(ctx, [[-30, 150], [60, 150], [14, 226]], { fill: '#FFFFFF', lw: 6, seed: 470 });
    G.rrect(ctx, -360, -200, 720, 370, 60, { fill: '#FFFFFF', lw: 6, seed: 471 });
    fillRect(ctx, -24, 140, 78, 24, '#FFFFFF');
    const q = (x, t0) => { const b = popIn(t, t0, 0.25); if (b <= 0) return; ctx.save(); ctx.translate(x, -50); ctx.scale(b, b); ctx.rotate(Math.sin(t * 5 + x) * 0.05); G.decor(() => label(ctx, '?', 0, 44, 130, RED)); ctx.restore(); };
    if (t >= ev.ask + 0.3) { const b = popIn(t, ev.ask + 0.3, 0.22); pawn(ctx, -215, 90, 1.5 * b, '#7FA7C9', 480); q(-105, ev.ask + 0.5); } // 誰同意的?
    if (second) { const b = popIn(t, ev.doc, 0.22); G.line(ctx, [[0, -150], [0, 120]], { color: '#D5DDE4', lw: 5, seed: 484 }); docIcon(ctx, 125, -15, 1.25 * b, 486); q(262, ev.doc + 0.2); } // 有文件嗎?
    ctx.restore();
    finish(ctx);
  }
  function emptyDesk(ctx, t) { // 5:當初開口的那位窗口,已經調走了
    officeDay(ctx);
    const ga = 1 - ease.inOutCubic(clamp((t - ev.gone) / 1.3));
    // 椅子
    G.rrect(ctx, 494, 1060, 32, 200, 4, { fill: '#5C6470', lw: 4, seed: 600 });
    G.rrect(ctx, 400, 1250, 220, 24, 10, { fill: '#5C6470', lw: 4, seed: 601 });
    G.rrect(ctx, 394, 800, 232, 290, 36, { fill: '#6C7680', lw: 6, seed: 602 });
    G.rrect(ctx, 420, 826, 180, 150, 24, { fill: '#7E8893', lw: 0, seed: 603 });
    if (ga > 0.01) { ctx.save(); ctx.globalAlpha = ga; Ch.person(ctx, { x: 510, y: 1085, s: 1.2, pose: 'sit', style: CAST.client, eyes: 'normal', mouth: 'smile', look: 0, blink: blink(t, 0.45), seed: 440, shadow: false }); ctx.restore(); }
    // 人走了,留下一圈虛線
    ctx.save(); ctx.globalAlpha = (1 - ga) * 0.75; ctx.setLineDash([16, 13]); ctx.strokeStyle = '#6C7680'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(510, 760, 78, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(392, 1088); ctx.lineTo(392, 940); ctx.quadraticCurveTo(396, 868, 470, 858); ctx.lineTo(550, 858); ctx.quadraticCurveTo(624, 868, 628, 940); ctx.lineTo(628, 1088); ctx.stroke();
    ctx.restore();
    // 桌子
    G.rrect(ctx, 150, 1090, 720, 44, 8, { fill: '#B98A5E', lw: 6, seed: 120 });
    G.rrect(ctx, 180, 1134, 660, 172, 4, { fill: '#8E6444', lw: 5, seed: 121 });
    G.rrect(ctx, 196, 930, 170, 120, 8, { fill: '#2F3A44', lw: 5, seed: 123 }); // 關掉的螢幕
    G.rrect(ctx, 268, 1050, 26, 30, 2, { fill: '#8A8F98', lw: 4, seed: 124 }); G.rrect(ctx, 232, 1076, 98, 16, 6, { fill: '#8A8F98', lw: 4, seed: 125 });
    G.rrect(ctx, 760, 1018, 60, 74, 8, { fill: '#FFF7E8', lw: 4, seed: 126 }); // 空杯子
    // 名牌:蓋下去
    const fu = clamp((t - ev.flip) / 0.2), fall = ease.inCubic(fu), NX = 560, NY = 1090;
    if (fu < 1) {
      ctx.save(); ctx.translate(NX, NY); ctx.transform(1, 0, -0.5 * fall, 1 - 0.86 * fall, 0, 0);
      G.rrect(ctx, -130, -92, 260, 92, 8, { fill: '#FFFDF4', lw: 5, seed: 610 });
      fillRect(ctx, -125, -18, 250, 14, '#C9A24A');
      G.decor(() => label(ctx, '窗口', 0, -30, 58, INK));
      ctx.restore();
    } else {
      const bounce = U.springKick(t, ev.flip + 0.2, 10, 9) * 5;
      const by = NY - Math.abs(bounce);
      G.poly(ctx, [[NX - 170, by], [NX - 120, by - 40], [NX + 150, by - 40], [NX + 100, by]], { fill: '#D9CFB8', lw: 5, seed: 612 }); // 背面朝上
      G.line(ctx, [[NX - 112, by - 30], [NX + 138, by - 30]], { color: '#C9A24A', lw: 8, seed: 613, amp: 0.3 });
      if (t - ev.flip - 0.2 < 0.3) for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) G.line(ctx, [[NX - 10 + sd * 190, by - 14 - j * 26], [NX - 10 + sd * 232, by - 22 - j * 40]], { color: RED, lw: 7, seed: 616 + sd + j });
      const q = t - ev.flip - 0.2; if (q < 0.5) for (const sd of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.7 * (1 - q / 0.5); G.ellipse(ctx, NX - 15 + sd * (150 + q * 90), NY - 16 - q * 30, 16 + q * 26, 12 + q * 18, { fill: '#FFFFFF', lw: 0, seed: 614 + sd }); ctx.restore(); }
    }
    if (t >= ev.flip + 0.45) { // 已調職
      const a = popIn(t, ev.flip + 0.45, 0.28);
      ctx.save(); ctx.translate(505, 560); ctx.rotate(-0.03); ctx.scale(a, a);
      G.tornPaper(ctx, -150, -64, 300, 124, { fill: '#FFFDF4', seed: 620 });
      G.decor(() => label(ctx, '已調職', 0, 24, 72, RED));
      ctx.restore();
    }
    finish(ctx, 'rgba(190,210,255,0.12)');
  }
  // 手機畫面(每一頁都是空的)
  const PW = 380, PH = 500;
  const SCREENS = [
    { title: '對話', bar: '#3E9B5F', foot: '沒有訊息' },
    { title: '信件', bar: '#2B5FA8', foot: '0 封' },
    { title: '簽名', bar: '#8A5FA8', foot: '沒有簽名' },
    { title: '照片', bar: '#D9843A', foot: '0 張' },
  ];
  function screen(ctx, k, t) {
    const sc = SCREENS[k], D = '#AEB9C3';
    fillRect(ctx, 0, 0, PW, PH, '#F4F7FA');
    const dashed = (fn) => { ctx.save(); ctx.setLineDash([14, 11]); ctx.strokeStyle = D; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); fn(); ctx.stroke(); ctx.restore(); };
    if (k === 0) { // 一直往下滑,都是空的對話框
      const off = (t * 150) % 130;
      for (let j = -1; j < 4; j++) { const y = 110 + j * 130 + 130 - off, left = (j + Math.floor(t * 150 / 130)) % 2 === 0; dashed(() => ctx.roundRect(left ? 28 : 150, y, 200, 84, 26)); }
    } else if (k === 1) { // 信封
      dashed(() => { ctx.roundRect(80, 170, 220, 150, 12); ctx.moveTo(84, 176); ctx.lineTo(190, 262); ctx.lineTo(296, 176); });
    } else if (k === 2) { // 簽名欄
      stroke(ctx, [[62, 300], [318, 300]], D, 6);
      stroke(ctx, [[66, 252], [92, 282]], D, 7); stroke(ctx, [[92, 252], [66, 282]], D, 7);
      dashed(() => ctx.roundRect(50, 170, 280, 160, 12));
    } else { // 照片格
      for (let j = 0; j < 4; j++) dashed(() => ctx.roundRect(58 + (j % 2) * 140, 126 + Math.floor(j / 2) * 132, 124, 116, 10));
    }
    fillRect(ctx, 0, 0, PW, 92, sc.bar);
    fillRect(ctx, 0, PH - 104, PW, 104, '#F4F7FA');
    G.decor(() => { label(ctx, sc.title, PW / 2, 66, 50, '#FFFFFF'); label(ctx, sc.foot, PW / 2, PH - 34, 54, RED); });
  }
  function phone(ctx, t) { // 6:阿樹什麼都拿不出來。沒有信,沒有簽名,連一張照片都沒有
    plainRoom(ctx, 'rgba(60,90,150,0.20)');
    const n = ev.empty.filter((e) => t >= e).length, tChange = n ? ev.empty[n - 1] : -9, u = ease.outCubic(clamp((t - tChange) / 0.26)), done = t >= ev.empty[2] + 0.9;
    const SX = 505, SY = 1580, SS = 1.36, thumb = done ? 0 : Math.sin(t * 9) * 5;
    Ch.person(ctx, { x: SX, y: SY, s: SS, pose: 'stand', style: CAST.shu, gesture: 'phone', handL: [-24 + thumb, -322 + 98 - Math.abs(thumb)],
      eyes: done ? 'closed' : 'wide', mouth: 'wavy', brows: 'worried', look: 0.1, lookY: 1, headRot: done ? 0.07 : 0.03 + Math.sin(t * 9) * 0.012, headY: done ? 10 : 4, sweat: 1, blush: 0.4, blink: 0, seed: 400 });
    // 放大的手機
    const PX = 505 - PW / 2, PY = 344, sh = n && t - tChange < 0.3 ? Math.sin((t - tChange) * 40) * 3 * (1 - (t - tChange) / 0.3) : 0;
    ctx.save(); ctx.translate(sh, 0);
    G.line(ctx, [[505, PY + PH + 22], [505, PY + PH + 60]], { color: '#FFFFFF', lw: 8, seed: 905, alpha: 0.9 }); // 連到他手上的那支
    G.rrect(ctx, PX - 16, PY - 16, PW + 32, PH + 32, 40, { fill: '#26242C', lw: 6, seed: 900 });
    ctx.save(); ctx.beginPath(); ctx.roundRect(PX, PY, PW, PH, 26); ctx.clip();
    if (u < 1 && n) { ctx.save(); ctx.translate(PX - u * PW, PY); screen(ctx, n - 1, t); ctx.restore(); }
    ctx.save(); ctx.translate(PX + (n ? (1 - u) * PW : 0), PY); screen(ctx, n, t); ctx.restore();
    ctx.restore();
    ctx.restore();
    finish(ctx, 'rgba(150,190,255,0.10)');
  }
  // 三個小圖示:人會調走、話會忘記、只有紙會留下來
  function badge(ctx, x, y, t, t0, ring, draw) {
    const a = popIn(t, t0, 0.3); if (t < t0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.ellipse(ctx, 0, 0, 104, 104, { fill: '#FFFDF4', stroke: ring, lw: 8, seed: 700 + x });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 94, 0, Math.PI * 2); ctx.clip(); draw(clamp((t - t0 - 0.3) / 1.1)); ctx.restore();
    ctx.restore();
  }
  function masterTalk(ctx, t) { // 7:師傅拍拍他:「人會調走,話會忘記,只有紙會留下來。」
    fab(ctx, t);
    extraPipe(ctx, t, { dash: 1, built: 3 });
    const m = mouthOf('master', t, ev.speak - 0.12), speaking = t >= ev.speak, got = t >= ev.icons[2] + 0.5;
    const lift = Math.max(...ev.pat.map((p) => clamp(1 - Math.abs(t - (p - 0.14)) / 0.14))) * 34;
    const bob = ev.pat.reduce((a, p) => a + (t >= p ? U.springKick(t, p, 7, 9) * 7 : 0), 0);
    const SX = 694, SS = 1.22, MX = 330, MS = 1.3;
    Ch.person(ctx, { x: SX, y: GROUND + bob * 0.5, s: SS, sx: -1, pose: 'stand', style: CAST.shuSite, eyes: got ? 'normal' : 'closed', mouth: got ? 'smile' : 'wavy', brows: got ? 'up' : 'worried',
      look: got ? 0.8 : 0.3, lookY: got ? -0.2 : 0.8, headRot: got ? 0 : 0.1, headY: got ? 0 : 8, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    Ch.person(ctx, { x: MX, y: GROUND, s: MS, pose: 'stand', style: CAST.master, handR: hand(MX, GROUND, MS, 1, 608, 918 - lift + bob * 0.5),
      handL: speaking && !got ? [-60 + Math.sin(t * 3) * 6, -322 + 96 + Math.sin(t * 3.4) * 8] : undefined,
      eyes: got ? 'happy' : 'normal', mouth: m || 'smile', brows: 'neutral', look: 0.8, headRot: 0.03, blink: blink(t, 0.6), blush: 0.4, seed: 440 });
    const Y = 482;
    badge(ctx, 250, Y, t, ev.icons[0], '#9AA3AD', (u) => { // 人會調走
      const x = lerp(-34, 30, u), al = lerp(1, 0.4, u), st = Math.sin(t * 9) * 12;
      for (let k = 0; k < 3; k++) stroke(ctx, [[x - 62 - k * 6, -30 + k * 30], [x - 40, -30 + k * 30]], `rgba(154,163,173,${0.9 * u})`, 6);
      ctx.save(); ctx.globalAlpha = al;
      stroke(ctx, [[x - 6, 18], [x - 14 - st, 62]], INK, 9); stroke(ctx, [[x + 6, 18], [x + 14 + st, 62]], INK, 9);
      pawn(ctx, x, 26, 1.0, '#7FA7C9', 720);
      ctx.restore();
      stroke(ctx, [[46, 52], [80, 52]], '#9AA3AD', 7); stroke(ctx, [[68, 40], [82, 52], [68, 64]], '#9AA3AD', 7);
    });
    badge(ctx, 500, Y, t, ev.icons[1], '#9AA3AD', (u) => { // 話會忘記
      ctx.save(); ctx.globalAlpha = lerp(1, 0.12, u);
      G.poly(ctx, [[-26, 24], [10, 24], [-34, 62]], { fill: '#CFE3F2', lw: 5, seed: 730 });
      G.rrect(ctx, -66, -50, 132, 84, 30, { fill: '#CFE3F2', lw: 5, seed: 731 });
      fillRect(ctx, -24, 22, 30, 9, '#CFE3F2');
      for (let k = 0; k < 3; k++) G.ellipse(ctx, -30 + k * 30, -8, 8, 8, { fill: INK, lw: 0, seed: 733 + k });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = u * 0.8; ctx.setLineDash([10, 10]); ctx.strokeStyle = '#9AA3AD'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.roundRect(-66, -50, 132, 84, 30); ctx.stroke(); ctx.restore();
    });
    badge(ctx, 750, Y, t, ev.icons[2], GREEN, (u) => { // 只有紙會留下來
      const p = 1 + 0.04 * Math.sin(t * 5);
      ctx.save(); ctx.scale(p, p); ctx.rotate(-0.05);
      docIcon(ctx, -6, 0, 1.0, 740, { sig: true });
      ctx.restore();
      tickMark(ctx, 46, 44, 26, popIn(t, ev.icons[2] + 0.35, 0.22), 745);
    });
    finish(ctx);
  }
  const SIG = Array.from({ length: 41 }, (_, i) => { const u = i / 40; return [-96 + u * 236 + Math.sin(u * 15) * 14, -26 * Math.sin(u * 19 + 0.6) * (1 - 0.55 * u) - 10 * Math.sin(u * 7)]; });
  function signing(ctx, t) { // 8:口袋裡多了一本小本子。講好的事,當場寫,當場簽
    fab(ctx, t);
    const out = t >= ev.book, writing = t >= ev.write && t < ev.write + 0.85, signingNow = t >= ev.sign && t < ev.sign + 0.9, done = t >= ev.tick;
    const SX = 292, SS = 1.05, CX = 752, CS = 1.07;
    const k = ease.outBack(clamp((t - ev.book) / 0.3)), give = ease.inOutCubic(clamp((t - ev.sign + 0.35) / 0.3)) * (1 - ease.inOutCubic(clamp((t - ev.tick - 0.1) / 0.3)));
    const nx = lerp(332, lerp(430, 498, give), k), ny = lerp(1140, 1030, k) - 50 * ease.inOutCubic(clamp((t - ev.tick - 0.1) / 0.3)) + (writing ? Math.sin(t * 20) * 2 : 0);
    const talk = !out && Math.floor(t * 6) % 2;
    Ch.person(ctx, { x: SX, y: GROUND, s: SS, pose: 'stand', style: CAST.shuSite, handR: hand(SX, GROUND, SS, 1, nx, ny + 26),
      handL: writing ? hand(SX, GROUND, SS, 1, 300 + Math.sin(t * 20) * 5, 1030) : undefined,
      eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'smile', brows: 'up', look: 0.8, lookY: out && !done ? 0.4 : 0, blush: 0.6, blink: blink(t, 0.2), seed: 400 });
    const px = signingNow ? 540 + Math.sin(t * 17) * 12 : 0, py = signingNow ? 1032 + Math.sin(t * 23) * 6 : 0;
    Ch.person(ctx, { x: CX, y: GROUND, s: CS, sx: -1, pose: 'stand', style: CAST.client2, gesture: done ? 'thumbsUp' : !out ? 'point' : undefined,
      handR: signingNow ? hand(CX, GROUND, CS, -1, px + 16, py - 34) : undefined,
      eyes: done ? 'happy' : 'normal', mouth: talk ? 'o' : 'smile', brows: 'neutral', look: 0.8, lookY: signingNow ? 0.6 : 0, blink: blink(t, 0.45), seed: 480 });
    if (out || t >= ev.book - 0.05) notebook(ctx, nx, ny, lerp(0.5, -0.08, k), lerp(0.6, 1.0, k), 800);
    if (signingNow) pen(ctx, px, py, 0.5);
    if (t >= ev.book && t < ev.book + 0.7) for (let j = 0; j < 3; j++) { const b = popIn(t, ev.book + j * 0.06, 0.2); G.star(ctx, 410 + j * 44, 950 - (j % 2) * 40, 18 * b, { fill: '#FFF2A8', rot: t * 1.5 + j, seed: 60 + j }); }
    if (t >= ev.book + 0.25) { // 放大的小本子
      const a = popIn(t, ev.book + 0.25, 0.3), Y0 = 356;
      ctx.save(); ctx.translate(505, Y0 + (1 - a) * 50); ctx.rotate(0.012); ctx.scale(a, a);
      G.tornPaper(ctx, -280, 0, 560, 372, { fill: '#FFFDF4', seed: 810 });
      fillRect(ctx, -276, 4, 552, 30, RED);
      for (let j = 0; j < 9; j++) G.ellipse(ctx, -240 + j * 60, 19, 9, 9, { fill: '#FFFDF4', lw: 3, seed: 812 + j, amp: 0.3 });
      for (const ly of [206, 316]) G.line(ctx, [[-240, ly], [240, ly]], { color: '#D8CDB4', lw: 3, seed: 822 + ly, amp: 0.3 });
      G.decor(() => {
        label(ctx, '追加紀錄', 0, 98, 54, INK);
        const w = clamp((t - ev.write) / 0.8);
        if (w > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-240, 120, 330 * w, 90); ctx.clip(); G.text(ctx, '多拉一條管', -236, 188, { size: 60, fam: CJK, weight: 800, color: BLUE, boil: 0 }); ctx.restore(); }
        G.text(ctx, '簽名', -236, 298, { size: 50, fam: CJK, weight: 800, color: INK, boil: 0 });
      });
      const su = clamp((t - ev.sign) / 0.85), nSig = Math.floor(su * 40);
      if (su > 0) { const pts = SIG.slice(0, nSig + 1).map(([x, y]) => [x + 10, y + 280]); stroke(ctx, pts, BLUE, 8); if (su < 1 && pts.length) pen(ctx, pts[pts.length - 1][0], pts[pts.length - 1][1], 0.5, INK); }
      tickMark(ctx, 214, 268, 36, popIn(t, ev.tick, 0.25), 830);
      ctx.restore();
    }
    if (done) for (let j = 0; j < 4; j++) { const b = popIn(t, ev.tick + j * 0.06, 0.2); G.star(ctx, 505 + [-300, 300, -250, 262][j], 480 + [0, 60, 240, 250][j], 20 * b, { fill: '#FFF2A8', rot: t * 1.5 + j, seed: 64 + j }); }
    finish(ctx);
  }
  function closing(ctx, t) { // 9:結尾
    fillRect(ctx, -200, -200, W + 400, H + 400, lin(ctx, 0, 0, 0, 1900, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, A[9] + 0.1, 0.4);
    ctx.save(); ctx.translate(506, 362); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -420, 0, 840, 500, { fill: '#FFFDF4', seed: 801 });
    G.decor(() => {
      label(ctx, '現場講好的事', 0, 130, 106, INK);
      label(ctx, '沒有留紀錄', 0, 274, 106, '#8E6444');
      label(ctx, '就等於沒發生過', 0, 426, 110, RED);
    });
    ctx.restore();
    Ch.person(ctx, { x: 300, y: GROUND + 76, s: 0.98, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    const SX = 720, SY = GROUND + 76, SS = 0.95, bx = 628, by = 1096 + Math.sin(t * 4) * 6;
    Ch.person(ctx, { x: SX, y: SY, s: SS, sx: -1, pose: 'stand', style: CAST.shuSite, handR: hand(SX, SY, SS, -1, bx + 4, by + 30), eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    notebook(ctx, bx, by, -0.1, 1.1, 800);
    tickMark(ctx, bx + 34, by - 44, 22, popIn(t, A[9] + 0.6, 0.25), 836);
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(520, 1474); ctx.scale(b, b); G.decor(() => label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 })); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: ask, cam: Shots.push(1.0, 1.05) },
    { at: A[1] - 0.15, draw: yes, in: 'cut' },
    { at: A[2] - 0.15, draw: work, in: 'whip' },
    { at: A[3] - 0.15, draw: claim, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[4] - 0.15, draw: officerAsk, in: 'cut' },
    { at: A[5] - 0.15, draw: emptyDesk, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[6] - 0.15, draw: phone, in: 'cut' },
    { at: A[7] - 0.15, draw: masterTalk, in: 'paper', cam: Shots.push(1.0, 1.04) },
    { at: A[8] - 0.15, draw: signing, in: 'whip' },
    { at: A[9] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配(太長的短句在 CUT 指定的位置再切一次)
  const CUT = { '從此阿樹口袋裡多了一本小本子': 7 };
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
