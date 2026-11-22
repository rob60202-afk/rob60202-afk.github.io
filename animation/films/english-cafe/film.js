// 看動畫學英文:咖啡店。台詞、字幕、對嘴全部由 lines.js 與 out/voice.json 驅動,
// 換一份 lines.js 就能換對話內容;場景與角色在這個檔案。
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { A, E, ev, EP, key, outro } = S;
  const L = EP.lines;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  const EN = 'Inter, Arial, sans-serif';
  const FLOOR = 1330, COUNTER = 960;
  const INK = '#3A2A20', YELLOW = '#FFD75E';
  let VO = null;

  const CAST = {
    mia: { outfit: 'shirt', shirt: '#6FA287', collar: '#F7F3EA', bottoms: 'pants', shorts: '#4A4038', pants: '#4A4038', skin: '#F2C7A2', hair: '#6B3E26', hairStyle: 'ponytail', headwear: 'cap', headwearColor: '#4E7F68', build: 'slim' },
    leo: { outfit: 'hoodie', shirt: '#F2B84B', bottoms: 'pants', shorts: '#4F6FA0', pants: '#4F6FA0', skin: '#EDBE96', hair: '#241C1A', hairStyle: 'quiff', shoes: '#F4F1EA' },
  };
  globalThis.CAST = CAST;

  const mouthOf = (who, t) => { const m = Subs.mouth(VO, t, who); return m && m.talking ? m : null; };
  const blink = (t, seed) => ((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0;
  const speaking = (who, t) => L.some((l, i) => l.who === who && t >= A[i] - 0.05 && t <= E[i] + 0.05);
  const zh = (ctx, str, x, y, size, color = '#FFFFFF', o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, stroke: INK, strokeW: size * 0.22, ...o });
  const en = (ctx, str, x, y, size, color = '#FFFFFF', o = {}) => G.text(ctx, str, x, y, { size, fam: EN, weight: 800, color, align: 'center', boil: 0, stroke: INK, strokeW: size * 0.2, ...o });
  const widthOf = (ctx, str, size, fam) => { ctx.save(); ctx.font = `800 ${size}px ${fam}`; const w = ctx.measureText(str).width; ctx.restore(); return w; };

  // ---------- 咖啡店 ----------
  function cup(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.poly(ctx, [[-34, -96], [34, -96], [26, 0], [-26, 0]], { fill: '#FFF7E8', lw: 4, seed: 91 });
    G.rrect(ctx, -30, -66, 60, 34, 4, { fill: '#B9825A', lw: 3, seed: 92 });
    G.rrect(ctx, -40, -110, 80, 18, 6, { fill: '#5A3B28', lw: 4, seed: 93 });
    ctx.restore();
  }
  function steam(ctx, x, y, t) {
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.6 + k / 3) % 1;
      const pts = []; for (let i = 0; i <= 8; i++) pts.push([x + (k - 1) * 20 + Math.sin(i * 0.9 + t * 3 + k) * 8, y - u * 70 - i * 9]);
      G.line(ctx, pts, { color: '#FFFFFF', lw: 5, seed: 95 + k, alpha: 0.75 * (1 - u) });
    }
  }
  function cafeBack(ctx, t) {
    ctx.fillStyle = '#F8E8D2'; ctx.fillRect(-200, -200, W + 400, H + 400);
    G.rrect(ctx, -30, 150, W + 60, 90, 0, { fill: '#E9A38A', lw: 0, seed: 100 }); // 牆上色帶
    // 黑板菜單
    G.rrect(ctx, 560, 300, 400, 300, 14, { fill: '#3F5247', lw: 7, seed: 101 });
    G.decor(() => {
      G.text(ctx, 'MENU', 760, 372, { size: 62, fam: 'Permanent Marker', weight: 400, color: '#FDF3DC', align: 'center' });
      ['Latte', 'Tea', 'Cake'].forEach((m, k) => G.text(ctx, m, 620, 440 + k * 54, { size: 44, fam: 'Patrick Hand', weight: 400, color: '#FDF3DC' }));
      ['$4', '$3', '$5'].forEach((m, k) => G.text(ctx, m, 900, 440 + k * 54, { size: 44, fam: 'Patrick Hand', weight: 400, color: '#F2D08A', align: 'right' }));
    });
    // 吊燈
    for (const lx of [200, 420]) {
      G.line(ctx, [[lx, 150], [lx, 330]], { color: INK, lw: 4, seed: 110 + lx });
      G.poly(ctx, [[lx - 60, 400], [lx + 60, 400], [lx + 30, 330], [lx - 30, 330]], { fill: '#F2B84B', lw: 5, seed: 111 + lx });
      ctx.save(); ctx.globalAlpha = 0.16 + 0.03 * Math.sin(t * 2 + lx); ctx.fillStyle = '#FFE9A8'; ctx.beginPath(); ctx.moveTo(lx - 60, 400); ctx.lineTo(lx + 60, 400); ctx.lineTo(lx + 220, 900); ctx.lineTo(lx - 220, 900); ctx.fill(); ctx.restore();
    }
    // 杯架
    G.rrect(ctx, 90, 640, 330, 20, 4, { fill: '#A8754A', lw: 4, seed: 120 });
    for (let k = 0; k < 4; k++) G.rrect(ctx, 112 + k * 78, 580, 50, 60, 8, { fill: ['#E8718D', '#FFF7E8', '#6FA287', '#F2B84B'][k], lw: 4, seed: 121 + k });
    G.rrect(ctx, -30, FLOOR, W + 60, 700, 0, { fill: '#D9B994', lw: 5, seed: 130, hatch: { color: 'rgba(120,70,20,0.12)', gap: 18 } });
  }
  function counter(ctx, t) {
    // 咖啡機
    G.rrect(ctx, 850, COUNTER - 200, 180, 200, 12, { fill: '#9AA3AD', lw: 6, seed: 140 });
    G.rrect(ctx, 874, COUNTER - 176, 132, 54, 8, { fill: '#2F3A44', lw: 4, seed: 141 });
    G.ellipse(ctx, 905, COUNTER - 84, 14, 14, { fill: '#E8718D', lw: 3, seed: 142 });
    G.ellipse(ctx, 975, COUNTER - 84, 14, 14, { fill: '#6FA287', lw: 3, seed: 143 });
    // 櫃檯
    G.rrect(ctx, 440, COUNTER, 700, FLOOR - COUNTER + 10, 8, { fill: '#C58F62', lw: 6, seed: 150, hatch: { color: 'rgba(90,50,20,0.14)', gap: 14 } });
    G.rrect(ctx, 415, COUNTER - 22, 740, 44, 10, { fill: '#8E6444', lw: 6, seed: 151 });
    G.rrect(ctx, 500, COUNTER + 80, 250, 130, 10, { fill: '#F8E8D2', lw: 5, seed: 152 });
    G.decor(() => G.text(ctx, 'COFFEE', 625, COUNTER + 164, { size: 54, fam: 'Bungee', weight: 400, color: '#8E6444', align: 'center' }));
    if (t >= ev.cup) { // 咖啡上桌
      const a = ease.outBack(clamp((t - ev.cup) / 0.3));
      cup(ctx, 520, COUNTER - 22 - (1 - a) * 40, 1.15 * a);
      if (a >= 1) steam(ctx, 520, COUNTER - 150, t);
    }
  }

  function scene(ctx, t) {
    cafeBack(ctx, t);
    const done = t >= ev.end, keyOn = t >= ev.card && t < ev.end;
    // Mia 在櫃檯後
    const miaTalk = speaking('mia', t), mm = mouthOf('mia', t);
    const greet = t >= A[S.says[0]] - 0.3 && t < A[S.says[0]] + 1.2;
    Ch.person(ctx, { x: 720, y: FLOOR - (miaTalk ? Math.abs(Math.sin(t * 8)) * 8 : 0), s: 1.5, pose: 'stand', style: CAST.mia, gesture: done || greet ? 'wave' : keyOn ? 'pointUp' : undefined, eyes: done || !mm ? 'happy' : 'normal', mouth: mm || 'smile', brows: 'up', look: keyOn ? 0 : -0.8, blink: blink(t, 0.2), blush: 0.6, seed: 300, shadow: false });
    counter(ctx, t);
    // Leo 走進來,站在櫃檯前
    const w = Ch.walk(t, { x0: -200, speed: 300, t0: ev.enter, s: 1.5 });
    const stop = 235, arrived = w.x >= stop;
    const leoTalk = speaking('leo', t), lm = mouthOf('leo', t);
    const gotCup = t >= ev.cup + 0.4;
    Ch.person(ctx, {
      ...(arrived ? { pose: 'stand' } : { pose: w.pose, walk: w.walk }), x: Math.min(w.x, stop), y: FLOOR + 30 - (leoTalk ? Math.abs(Math.sin(t * 8)) * 8 : 0), s: 1.5, style: CAST.leo,
      gesture: !arrived ? undefined : done ? 'wave' : t < A[S.says[0]] - 0.4 ? 'think' : gotCup && !keyOn ? 'thumbsUp' : leoTalk ? 'point' : undefined,
      eyes: gotCup || done ? 'happy' : 'normal', mouth: lm || (gotCup || done ? 'grin' : t < A[S.says[0]] - 0.4 ? 'wavy' : 'smile'),
      brows: t < A[S.says[0]] - 0.4 ? 'worried' : 'up', look: keyOn ? 0 : 0.8, blink: blink(t, 0.6), blush: 0.6, seed: 340,
    });
  }

  // ---------- 文字層 ----------
  function title(ctx, t) { // 開場提問
    const t0 = A[0], t1 = A[S.says[0]] - 0.45;
    if (t < t0 - 0.1 || t > t1 + 0.25) return;
    const a = ease.outBack(clamp((t - t0 + 0.1) / 0.3)) * (1 - clamp((t - t1) / 0.2));
    ctx.save(); ctx.translate(540, SAFE.y + 185); ctx.rotate(-0.03); ctx.scale(a * 0.86, a * 0.86);
    G.tornPaper(ctx, -450, -190, 900, 380, { fill: '#FFF7E0', seed: 21 });
    G.decor(() => {
      zh(ctx, EP.title[0], 0, -40, 120, INK, { stroke: null });
      zh(ctx, EP.title[1], 0, 110, 104, '#D9534F', { stroke: null });
    });
    ctx.restore();
  }
  function dialog(ctx, t) { // 雙語字幕:英文逐字變色,中文在下
    const i = L.findIndex((l, k) => l.type === 'say' && t >= A[k] - 0.05 && t < (A[k + 1] ?? 1e9) - 0.1 && t < E[k] + 1.2);
    if (i < 0) return;
    const l = L[i], words = (VO && VO.lines[i] && VO.lines[i].words) || [];
    const tokens = l.en.split(' ');
    let size = 84; const maxW = SAFE.w - 40;
    while (size > 48 && widthOf(ctx, l.en, size, EN) > maxW) size -= 4;
    const sp = widthOf(ctx, ' ', size, EN), ws = tokens.map((w) => widthOf(ctx, w, size, EN));
    const total = ws.reduce((a, b) => a + b, 0) + sp * (tokens.length - 1);
    const y = SAFE.y + SAFE.h - 215, pop = ease.outBack(clamp((t - A[i] + 0.05) / 0.22));
    ctx.save(); ctx.translate(SAFE.x + SAFE.w / 2, y); ctx.scale(pop, pop);
    // 說話者名牌
    const tag = l.who === 'mia' ? 'Mia' : 'Leo', tagCol = l.who === 'mia' ? '#6FA287' : '#F2B84B';
    G.rrect(ctx, -70, -size - 78, 140, 56, 26, { fill: tagCol, lw: 5, seed: 30 });
    G.text(ctx, tag, 0, -size - 38, { size: 38, fam: EN, weight: 800, color: INK, align: 'center', boil: 0 });
    let x = -total / 2;
    tokens.forEach((w, k) => {
      const wd = words[k], cur = wd && t >= wd.t && t < wd.end, said = wd && t >= wd.end;
      const kick = cur ? 1 + 0.14 * Math.max(0, 1 - (t - wd.t) / 0.12) : 1;
      ctx.save(); ctx.translate(x + ws[k] / 2, 0); ctx.scale(kick, kick);
      en(ctx, w, 0, 0, size, cur ? YELLOW : said ? '#FFFFFF' : '#FFFFFF', { alpha: said || cur ? 1 : 0.85 });
      ctx.restore();
      x += ws[k] + sp;
    });
    zh(ctx, l.zh, 0, size * 1.12, 58, '#FFF4D6');
    ctx.restore();
  }
  function keyCard(ctx, t) { // 重點句卡片 + 跟唸倒數
    if (t < ev.card || t > ev.end + 0.25) return;
    const l = L[key];
    const a = ease.outBack(clamp((t - ev.card) / 0.3)) * (1 - clamp((t - ev.end) / 0.2));
    ctx.save(); ctx.translate(540, SAFE.y + 215); ctx.scale(a, a);
    G.tornPaper(ctx, -455, -195, 910, 400, { fill: '#FFF7E0', seed: 41 });
    G.rrect(ctx, -130, -236, 260, 70, 30, { fill: '#D9534F', lw: 5, seed: 42 });
    G.decor(() => {
      zh(ctx, '重點句', 0, -184, 46, '#FFFFFF', { stroke: null });
      const words = (VO && VO.lines[key] && VO.lines[key].words) || [], tokens = l.en.split(' ');
      let size = 88; while (size > 52 && widthOf(ctx, l.en, size, EN) > 820) size -= 4;
      const sp = widthOf(ctx, ' ', size, EN), ws = tokens.map((w) => widthOf(ctx, w, size, EN));
      let x = -(ws.reduce((p, q) => p + q, 0) + sp * (tokens.length - 1)) / 2;
      tokens.forEach((w, k) => { const wd = words[k], cur = wd && t >= wd.t && t < wd.end; G.text(ctx, w, x + ws[k] / 2, -60, { size, fam: EN, weight: 800, color: cur ? '#D9534F' : INK, align: 'center', boil: 0 }); x += ws[k] + sp; });
      zh(ctx, l.zh, 0, 30, 60, '#8E6444', { stroke: null });
      G.text(ctx, (l.notes || []).join('   ・   '), 0, 130, { size: 46, fam: `${EN}, ${CJK}`, weight: 800, color: INK, align: 'center', boil: 0 });
    });
    ctx.restore();
    if (t >= ev.repeat[0] && t < ev.repeat[1]) { // 換你唸:進度條倒數
      const u = clamp((t - ev.repeat[0]) / (ev.repeat[1] - ev.repeat[0]));
      const y = SAFE.y + SAFE.h - 150, bw = 620;
      zh(ctx, '換你唸一次!', 540 - 35, y - 40, 80, YELLOW);
      G.rrect(ctx, 540 - 35 - bw / 2, y + 20, bw, 30, 15, { fill: '#FFFFFF', lw: 5, seed: 44 });
      G.rrect(ctx, 540 - 35 - bw / 2, y + 20, Math.max(30, bw * (1 - u)), 30, 15, { fill: '#D9534F', lw: 5, seed: 45 });
    }
  }
  function ending(ctx, t) { // 結尾:系列名稱與追蹤提示
    if (t < ev.end) return;
    const a = ease.outBack(clamp((t - ev.end) / 0.35));
    ctx.save(); ctx.translate(540, SAFE.y + 185); ctx.rotate(0.02); ctx.scale(a, a);
    G.tornPaper(ctx, -440, -150, 880, 320, { fill: '#FFF7E0', seed: 51 });
    G.decor(() => {
      zh(ctx, EP.series, 0, -20, 88, '#D9534F', { stroke: null });
      zh(ctx, '追蹤看下一集', 0, 100, 72, INK, { stroke: null });
    });
    ctx.restore();
    if (t >= ev.end + 0.2) G.confetti(ctx, t, ev.end + 0.2, { n: 60, seed: 5 });
  }

  Studio.film({
    post: { vignette: 0.2, grain: 0.035, paper: 0.3 },
    fadeOut: 0.8,
    async init() { VO = await Studio.loadJSON('out/voice.json'); },
    draw(ctx, t) {
      const z = 1 + 0.03 * ease.inOutQuad(clamp(t / S.DURATION)); // 很慢的推近
      ctx.save(); ctx.translate(540, FLOOR); ctx.scale(z, z); ctx.translate(-540, -FLOOR);
      scene(ctx, t);
      ctx.restore();
      title(ctx, t); keyCard(ctx, t); dialog(ctx, t); ending(ctx, t);
    },
  });
})();
