// 歪椅子:每一格都是時間 t 的純函式。角色對嘴讀 out/voice.json,字幕由旁白逐句切出。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const GROUND = 1300;
  let VO = null, SUBS = [];

  // ---------- 角色 ----------
  const SKIN = '#F0C29C';
  const CAST = {
    boy: { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'shorts', shorts: '#4F6FA0', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' },
    man: { outfit: 'shirt', shirt: '#4F6FA0', bottoms: 'pants', shorts: '#4A4038', pants: '#4A4038', skin: SKIN, hair: '#241C1A', hairStyle: 'short', build: 'regular', shoes: '#3A2E28' },
    master: { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' },
    guestA: { outfit: 'dress', shirt: '#E8718D', skin: SKIN, hair: '#4A2E22', hairStyle: 'bun', shoes: '#F4F1EA' },
    guestB: { outfit: 'hoodie', shirt: '#F2B84B', bottoms: 'pants', shorts: '#3A3A44', pants: '#3A3A44', skin: '#DDA57C', hair: '#241C1A', hairStyle: 'buzz', build: 'heavy' },
  };
  globalThis.CAST = CAST;

  // ---------- 小工具 ----------
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, u) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const label = (ctx, str, x, y, size, color = '#3A2A20', o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });

  // 椅子:原點在地面中央;crooked 時右前腳短一截,整張椅子往右歪
  const SEAT = 170;
  function chair(ctx, x, y, s, rock = 0, { crooked = true, col = '#C98F5A', seed = 40 } = {}) {
    const dark = Ch.shade(col, 0.78);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rock); ctx.scale(s, s);
    for (const px of [-74, 56]) G.rrect(ctx, px, -340, 18, 340, 5, { fill: dark, lw: 4, seed: seed + px });
    G.rrect(ctx, -80, -335, 160, 44, 10, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, -80, -268, 160, 30, 8, { fill: col, lw: 4, seed: seed + 2 });
    G.rrect(ctx, -92, -146, 20, 146, 5, { fill: col, lw: 4, seed: seed + 3 });
    G.rrect(ctx, 72, -146, 20, crooked ? 118 : 146, 5, { fill: col, lw: 4, seed: seed + 4 });
    G.rrect(ctx, -100, -SEAT, 200, 30, 8, { fill: col, lw: 4, seed: seed + 5, hatch: { color: 'rgba(90,50,20,0.18)', gap: 10 } });
    ctx.restore();
  }
  const chairRest = 0.075; // 歪椅子靜止時的傾斜角

  // ---------- 場景背景 ----------
  function workshop(ctx) {
    ctx.fillStyle = '#F3E5C8'; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.rrect(ctx, 620, 430, 320, 320, 10, { fill: '#BFE3F0', lw: 6, seed: 201 });
    G.line(ctx, [[780, 436], [780, 744]], { color: '#5A3B28', lw: 6, seed: 202 });
    G.line(ctx, [[626, 590], [934, 590]], { color: '#5A3B28', lw: 6, seed: 203 });
    G.rrect(ctx, 80, 560, 400, 22, 4, { fill: '#A8754A', lw: 4, seed: 204 }); // 工具架
    for (let k = 0; k < 4; k++) G.rrect(ctx, 110 + k * 92, 470 + (k % 2) * 20, 46, 90 - (k % 2) * 20, 6, { fill: ['#D9534F', '#F2B84B', '#6C9A8B', '#8E6444'][k], lw: 4, seed: 205 + k });
    G.rrect(ctx, 30, 1030, 420, 40, 6, { fill: '#B98A5E', lw: 5, seed: 210 }); // 工作桌
    for (const lx of [60, 400]) G.rrect(ctx, lx, 1070, 26, 230, 4, { fill: '#8E6444', lw: 4, seed: 211 + lx });
    G.rrect(ctx, -30, GROUND, W + 60, 700, 0, { fill: '#CFA97E', lw: 5, seed: 220, hatch: { color: 'rgba(90,50,20,0.14)', gap: 16 } });
  }
  function street(ctx, sky = '#A9D8EF', sign = '木工行') {
    ctx.fillStyle = sky; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.rrect(ctx, 50, 340, 980, 970, 6, { fill: '#EDD3A0', lw: 6, seed: 301, hatch: { color: 'rgba(120,70,20,0.10)', gap: 14 } });
    G.poly(ctx, [[10, 350], [1070, 350], [1010, 250], [70, 250]], { fill: '#B0553D', lw: 6, seed: 302 });
    G.rrect(ctx, 330, 400, 420, 140, 12, { fill: '#5A3B28', lw: 6, seed: 303 });
    G.decor(() => label(ctx, sign, 540, 500, 92, '#F6E7C6'));
    G.rrect(ctx, 120, 650, 320, 650, 10, { fill: '#3B2A22', lw: 6, seed: 304 }); // 門
    G.rrect(ctx, 620, 650, 330, 300, 10, { fill: '#BFE3F0', lw: 6, seed: 305 }); // 窗
    G.line(ctx, [[785, 656], [785, 944]], { color: '#5A3B28', lw: 6, seed: 306 });
    G.rrect(ctx, -30, GROUND, W + 60, 700, 0, { fill: '#C4B9A6', lw: 5, seed: 310, hatch: { color: 'rgba(60,50,40,0.12)', gap: 18 } });
  }
  function peek(ctx, t, style, mood = 'wide') { // 從門裡探頭
    ctx.save(); ctx.beginPath(); ctx.rect(120, 650, 320, 650); ctx.clip();
    Ch.person(ctx, { x: 330, y: GROUND + 10, s: 1.3, pose: 'stand', style, eyes: mood, mouth: mood === 'wide' ? 'o' : 'wavy', brows: 'worried', look: 0.9, blink: blink(t, 0.3), blush: 0.5, seed: 420, shadow: false });
    ctx.restore();
  }

  // ---------- 每一幕 ----------
  function made(ctx, t) { // 0–1:做出第一張椅子,發現它歪
    workshop(ctx);
    const after = t >= ev.wobble;
    const k = clamp((t - ev.wobble) / 0.18);
    const rock = after ? chairRest * k + 0.06 * U.springKick(t, ev.wobble, 4.5, 3) : 0;
    chair(ctx, 740, GROUND, 1.5, rock);
    const hop = !after ? Math.abs(Math.sin(t * 6)) * 26 : 0;
    Ch.person(ctx, { x: 300, y: GROUND - hop, s: 1.5, pose: 'stand', style: CAST.boy, gesture: after ? (t >= A[1] ? 'think' : undefined) : 'cheer', eyes: after ? 'wide' : 'happy', mouth: after ? 'o' : 'grin', brows: after ? 'worried' : 'up', look: 0.8, blink: blink(t, 0.1), sweat: after ? 0.8 : 0, blush: 0.6, seed: 400 });
    if (t >= A[1] + 0.9) { // 標出短了的那隻腳
      const a = ease.outBack(clamp((t - A[1] - 0.9) / 0.3));
      ctx.save(); ctx.translate(880, 1240); ctx.scale(a, a);
      G.tornPaper(ctx, -330, -190, 300, 100, { fill: '#FFF7E0', seed: 77 });
      G.decor(() => label(ctx, '短 0.5 公分', -180, -124, 48, '#C8452F'));
      G.line(ctx, [[-70, -86], [-6, 20]], { color: '#C8452F', lw: 8, seed: 78 });
      ctx.restore();
    }
  }
  function burn(ctx, t) { // 2:想拿去當柴燒
    ctx.fillStyle = '#F7C98B'; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.ellipse(ctx, 820, 520, 120, 120, { fill: '#F4A259', lw: 0, seed: 501 });
    G.rrect(ctx, -30, 880, W + 60, 430, 0, { fill: '#D9A566', lw: 5, seed: 502, hatch: { color: 'rgba(90,50,20,0.15)', gap: 22, angle: 1.57 } }); // 木籬笆
    G.rrect(ctx, -30, GROUND, W + 60, 700, 0, { fill: '#B8A283', lw: 5, seed: 503 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { // 柴堆
      const x = 760 + c * 86 + r * 43, y = GROUND - 44 - r * 76;
      G.ellipse(ctx, x, y, 42, 40, { fill: '#C98F5A', lw: 5, seed: 510 + r * 5 + c });
      G.ellipse(ctx, x, y, 18, 17, { fill: '#E6BC8A', lw: 3, seed: 530 + r * 5 + c });
    }
    const w = Ch.walk(t, { x0: -160, speed: 250, t0: A[2], s: 1.4 });
    const stop = 430, arrived = w.x >= stop;
    const x = Math.min(w.x, stop);
    chair(ctx, x + 170, GROUND - 90 - (arrived ? 0 : Math.abs(Math.sin(t * 9)) * 14), 1.0, 0.35);
    Ch.person(ctx, { ...(arrived ? { pose: 'stand' } : { pose: w.pose, walk: w.walk }), x, y: GROUND, s: 1.4, style: CAST.boy, eyes: 'wide', mouth: 'wavy', brows: 'worried', look: arrived ? -1 : 0.6, headRot: arrived ? -0.12 * Math.sin(t * 5) : 0, blink: blink(t, 0.5), sweat: 1, blush: 0.6, seed: 400 });
  }
  function sitScene(ctx, t, { sky, hair = CAST.master.hair, who = CAST.boy, year = null, sign } = {}) { // 3–4:師傅坐上去
    street(ctx, sky, sign);
    const sat = t >= ev.sit;
    const rock = chairRest + (sat ? 0.07 * U.springKick(t, ev.sit, 3.5, 2.5) : 0) + (year !== null ? 0.012 * Math.sin(t * 7) : 0);
    peek(ctx, t, who, sat && year === null ? 'wide' : 'normal');
    chair(ctx, 740, GROUND, 1.5, rock);
    const style = { ...CAST.master, hair };
    if (!sat) {
      const u = ease.inOutCubic(clamp((t - A[3] - 0.5) / 1.5));
      Ch.person(ctx, { pose: u < 1 ? 'walk' : 'stand', walk: t * 2.2, x: lerp(1250, 930, u), y: GROUND, s: 1.45, sx: -1, style, eyes: 'normal', mouth: 'smile', look: 0.6, blink: blink(t, 0.7), seed: 440 });
    } else {
      Ch.person(ctx, { x: 740, y: GROUND - SEAT * 1.5 + 6, s: 1.45, pose: 'sit', rot: rock * 0.6, style, eyes: year !== null ? 'closed' : 'happy', mouth: 'smile', blink: 0, blush: 0.5, gesture: year === null && t < ev.sit + 1.2 ? 'thumbsUp' : undefined, seed: 440 });
    }
  }
  function sit(ctx, t) { sitScene(ctx, t); }
  function years(ctx, t) {
    const u = clamp((t - ev.years[0]) / (ev.years[1] - ev.years[0]));
    const night = 0.5 - 0.5 * Math.cos(u * Math.PI * 2 * 5);
    const n = 1 + Math.round(29 * ease.inOutQuad(u));
    sitScene(ctx, t, { sky: mix('#A9D8EF', '#2D3566', night), hair: mix('#8C8C8C', '#F4F4F0', u), who: u > 0.5 ? CAST.man : CAST.boy, year: u, sign: '第 ' + n + ' 年' });
    const sx = 540 + 620 * Math.cos(Math.PI * (1 - (u * 5) % 1)), sy = 330 - 190 * Math.sin(Math.PI * ((u * 5) % 1));
    G.ellipse(ctx, sx, sy, 56, 56, { fill: night > 0.5 ? '#F6F1D5' : '#F9C74F', lw: 5, seed: 330 });
  }
  function laugh(ctx, t) { // 5a:客人笑椅子歪
    street(ctx);
    chair(ctx, 220, GROUND, 1.3, chairRest + 0.01 * Math.sin(t * 7));
    Ch.person(ctx, { x: 220, y: GROUND - SEAT * 1.3 + 6, s: 1.25, pose: 'sit', style: { ...CAST.master, hair: '#B8B8B4' }, eyes: 'closed', mouth: 'smile', blush: 0.5, seed: 440 });
    const guests = [['guestA', 640, 1.15, 0], ['guestB', 850, 1.2, 1]];
    for (const [who, x, s, i] of guests) {
      const hop = Math.abs(Math.sin(t * 9 + i * 1.3)) * 22;
      Ch.person(ctx, { x, y: GROUND - hop, s, sx: -1, pose: 'stand', style: CAST[who], gesture: 'point', eyes: 'happy', mouth: 'open', brows: 'up', look: 1, seed: 460 + i * 30 });
    }
    G.bubble(ctx, '哈哈', 560, 700, 620, 800, t, A[5] + 0.3, A[5] + 2.4, { size: 70 });
    G.bubble(ctx, '歪的耶', 840, 640, 850, 760, t, A[5] + 0.8, A[5] + 2.4, { size: 60 });
  }
  function ashamed(ctx, t) { // 5b:阿樹難受
    workshop(ctx);
    Ch.person(ctx, { x: 540, y: 1760, s: 2.5, pose: 'stand', style: CAST.boy, gesture: 'facepalm', eyes: 'closed', mouth: 'wavy', brows: 'worried', sweat: 0.7, blush: 0.9, headRot: 0.04 * Math.sin(t * 3), seed: 400 });
  }
  function practice(ctx, t) { // 6:拼命練,好椅子一張張出現
    workshop(ctx);
    const done = t >= ev.chairs[4] + 0.2;
    ev.chairs.forEach((c, k) => {
      if (t < c) return;
      const a = ease.outBack(clamp((t - c) / 0.28));
      const x = 505 + k * 106, y = GROUND - 6 + (k % 2) * 14;
      ctx.save(); ctx.translate(x, y); ctx.scale(a, a); chair(ctx, 0, 0, 0.56, 0, { crooked: false, col: ['#C98F5A', '#B97F4C', '#D6A06A'][k % 3], seed: 600 + k * 9 }); ctx.restore();
      const f = clamp((t - c) / 0.9);
      if (f < 1) G.decor(() => label(ctx, '+1 訂單', x, y - 250 - (k % 2) * 70 - f * 90, 54, '#C8452F', { alpha: 1 - f * f, stroke: '#FFF7E0', strokeW: 14 }));
    });
    Ch.person(ctx, { x: 250, y: GROUND - (done ? Math.abs(Math.sin(t * 7)) * 24 : 0), s: 1.5, pose: 'stand', style: CAST.man, gesture: done ? 'cheer' : 'typing', eyes: done ? 'happy' : 'normal', mouth: done ? 'grin' : 'flat', brows: done ? 'up' : 'determined', look: 0.7, sweat: done ? 0 : 0.6, blink: blink(t, 0.2), seed: 480 });
  }
  const OLD = { ...CAST.master, hair: '#F4F4F0' };
  function retire(ctx, t) { // 7–8:退休那天,阿樹開口問
    street(ctx, '#F6C89A');
    chair(ctx, 540, GROUND, 1.35, chairRest);
    const asking = t >= A[8];
    Ch.person(ctx, { x: 230, y: GROUND, s: 1.45, pose: 'stand', style: CAST.man, gesture: asking ? 'point' : 'think', eyes: 'normal', mouth: mouthOf('shu', t) || (asking ? 'o' : 'flat'), brows: 'worried', look: 0.9, blink: blink(t, 0.4), seed: 480 });
    Ch.person(ctx, { x: 860, y: GROUND, s: 1.4, sx: -1, pose: 'stand', style: OLD, gesture: asking ? undefined : 'wave', eyes: asking ? 'normal' : 'happy', mouth: 'smile', look: asking ? 0.9 : 0, blink: blink(t, 0.8), blush: 0.4, seed: 440 });
  }
  function answer(ctx, t) { // 9–10:師傅的回答(近景)
    street(ctx, '#F6C89A');
    ctx.save(); ctx.translate(540, 1100); ctx.scale(1.35, 1.35); ctx.translate(-540, -1100);
    const rock = chairRest + 0.012 * Math.sin(t * 5);
    chair(ctx, 670, GROUND, 1.5, rock);
    const wise = t >= A[10];
    const m = mouthOf('master', t);
    Ch.person(ctx, { x: 670, y: GROUND - SEAT * 1.5 + 6, s: 1.45, pose: 'sit', rot: rock * 0.5, style: OLD, gesture: wise ? 'pointUp' : undefined, eyes: m ? 'normal' : 'happy', mouth: m || 'smile', brows: wise ? 'up' : 'neutral', look: -0.7, blink: blink(t, 0.6), blush: 0.5, seed: 440 });
    Ch.person(ctx, { x: 290, y: GROUND + 40, s: 1.3, pose: 'stand', style: CAST.man, eyes: wise && t > A[10] + 2.2 ? 'happy' : 'wide', mouth: wise && t > A[10] + 2.2 ? 'smile' : 'o', brows: 'up', look: 0.9, blink: blink(t, 0.4), blush: wise ? 0.7 : 0, seed: 480 });
    ctx.restore();
  }
  function closing(ctx, t) { // 11:結尾
    ctx.fillStyle = '#F6DDA8'; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.rays(ctx, 540, 1000, { n: 14, r0: 120, r1: 1500, color: '#FBEBC4', alpha: 0.9, spin: t * 0.05 });
    G.ellipse(ctx, 470, GROUND + 20, 330, 46, { fill: 'rgba(120,80,30,0.25)', lw: 0, seed: 700 });
    chair(ctx, 470, GROUND, 2.0, chairRest + 0.02 * Math.sin(t * 2.4));
    Ch.person(ctx, { x: 890, y: GROUND + 40, s: 1.15, sx: -1, pose: 'stand', style: CAST.boy, gesture: 'thumbsUp', eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 });
    if (t >= ev.end) {
      const a = ease.outBack(clamp((t - ev.end) / 0.35));
      ctx.save(); ctx.translate(540, SAFE.y + 210); ctx.scale(a, a);
      G.decor(() => {
        label(ctx, '那是你的', 0, -40, 96, '#FFFFFF', { stroke: '#3A2A20', strokeW: 20 });
        label(ctx, '第一張椅子', 0, 90, 124, '#FFD75E', { stroke: '#3A2A20', strokeW: 24 });
      });
      ctx.restore();
    }
  }

  const film = Shots.film([
    { at: 0, draw: made, cam: Shots.push(1.0, 1.08) },
    { at: A[2] - 0.15, draw: burn, in: 'whip' },
    { at: A[3] - 0.15, draw: sit, in: 'paper', cam: Shots.push(1.0, 1.05) },
    { at: A[4] - 0.1, draw: years, in: 'cut' },
    { at: A[5] - 0.15, draw: laugh, in: 'whip' },
    { at: A[5] + 2.25, draw: ashamed, in: 'cut', cam: Shots.push(1.0, 1.1) },
    { at: A[6] - 0.15, draw: practice, in: 'whip' },
    { at: A[7] - 0.15, draw: retire, in: 'paper', cam: Shots.push(1.0, 1.06) },
    { at: A[9] - 0.3, draw: answer, in: 'cut', cam: Shots.push(1.0, 1.05) },
    { at: A[11] - 0.15, draw: closing, in: 'flash' },
  ]);

  // 字幕:每句旁白依標點切成短句,時間按字數比例分配
  function buildSubs(vo) {
    const out = [];
    for (const l of (vo && vo.lines) || []) {
      const parts = l.text.split(/(?<=[,。?!,?!])/).map((p) => p.replace(/[,。,]/g, '').trim()).filter(Boolean);
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
      Subs.draw(ctx, t, SUBS, { style: 'pop', size: 78, fam: CJK, highlight: '#FFD75E' });
    },
  });
})();
