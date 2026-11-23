// 工程現場故事 第 8 集:帳上賺錢,戶頭沒錢。每一格都是時間 t 的純函式。
// 畫面座標 = 直式舞台 1080 × 1920。字幕在 y 1340–1420(Subs.draw),任何人的臉都要在 y 1300 以上。
(function () {
  const U = globalThis.U, G = globalThis.G, Subs = globalThis.Subs, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio, KIT = globalThis.KIT;
  const { clamp, lerp, ease } = U;
  const { A, E, ev } = S;
  const W = G.W, H = G.H;
  const CJK = KIT.CJK, NUM = KIT.NUM, C = KIT.C;
  const INK = C.ink, RED = C.red, GREEN = C.green, DGREEN = '#1F7A45', PAPER = C.paper, GOLD = '#F2C230', MUTED = C.muted;
  const PINK = '#F4AFBC', PINKD = '#DC7F92', NAVY = '#2F4B6E';
  const { fill, lin, rad, label, popIn, stroke } = KIT;
  let VO = null, SUBS = [];

  // ---------- 角色(造型照 CAST;辦公室、休息區不戴安全帽,工地一律 KIT.onSite:安全帽 + 頤帶 + 反光背心) ----------
  const CREW2 = { outfit: 'tee', shirt: '#7C8A6E', bottoms: 'pants', shorts: '#4A4A42', pants: '#4A4A42', skin: '#D9A27A', hair: '#2A2220', hairStyle: 'short', build: 'regular', shoes: '#3A2E28' };
  const CAST = {
    shu: KIT.CAST.shu,                              // 阿樹:白 T、灰長褲、黑髮、瘦
    boss: KIT.CAST.boss,                            // 老闆:只在辦公室
    master: KIT.CAST.masterRest,                    // 陳師傅:休息區(安全帽掛在牆上)
    crew: KIT.CAST.crewSite,                        // 工班:工地(橘帽、頤帶、背心)
    crew2: KIT.onSite(CREW2, KIT.HELMET.crew),
  };
  globalThis.CAST = CAST;
  const person = (ctx, o) => KIT.person(ctx, o);
  const mouthOf = (who, t) => KIT.mouth(VO, t, who);
  const blink = KIT.blink, hand = KIT.hand, world = KIT.world;
  const skinDot = (ctx, x, y, r, col = C.skin, seed = 418) => G.ellipse(ctx, x, y, r, r, { fill: col, lw: 4, seed });

  // ---------- 小工具 ----------
  function finish(ctx, { warm = 'rgba(255,214,140,0.16)', floor = 0.26, y0 = 1150 } = {}) {
    fill(ctx, -300, -300, W + 600, H + 600, rad(ctx, 180, 260, 60, 1700, [[0, warm], [1, 'rgba(255,214,140,0)']]));
    fill(ctx, -300, y0, W + 600, H - y0 + 300, lin(ctx, 0, y0, 0, H, [[0, 'rgba(30,22,18,0)'], [1, `rgba(30,22,18,${floor})`]]));
  }
  // 鏡頭:把場景裡的 (cx, cy) 放到畫面 (540, 960),放大 z 倍
  function zoom(ctx, cx, cy, z, fn) { ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  const toScreen = (cx, cy, z, x, y) => [540 + (x - cx) * z, 960 + (y - cy) * z];
  function pill(ctx, x, y, text, { size = 44, bg = RED, color = '#FFFFFF', a = 1, seed = 1700 } = {}) {
    if (a <= 0) return;
    const w = KIT.measure(ctx, text, size) + size, h = size * 1.45;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.rrect(ctx, -w / 2, -h / 2, w, h, h / 2, { fill: bg, lw: 4.5, seed });
    label(ctx, text, 0, size * 0.36, size, color);
    ctx.restore();
  }
  // 一行字分兩種顏色(例:「賺不賺錢」黑、「看利潤」咖啡);回傳第二段的 x 範圍
  function twoTone(ctx, a, b, cx, y, size, colA, colB) {
    const wa = KIT.measure(ctx, a, size), wb = KIT.measure(ctx, b, size), x0 = cx - (wa + wb) / 2;
    G.text(ctx, a, x0, y, { size, fam: CJK, weight: 800, color: colA, align: 'left', boil: 0 });
    G.text(ctx, b, x0 + wa, y, { size, fam: CJK, weight: 800, color: colB, align: 'left', boil: 0 });
    return [x0 + wa, x0 + wa + wb];
  }
  function coin(ctx, x, y, r, { seed = 1900, spin = 1 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.25, spin), 1);
    G.ellipse(ctx, 0, 0, r, r, { fill: GOLD, lw: Math.max(2.5, r * 0.17), seed });
    G.ellipse(ctx, 0, 0, r * 0.6, r * 0.6, { fill: null, stroke: '#C9961E', lw: Math.max(2, r * 0.12), seed: seed + 1 });
    ctx.restore();
  }
  function moneyBag(ctx, x, y, s = 1, { glow = 0, seed = 1400 } = {}) { // (x, y) = 袋底中心
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow > 0) KIT.glow(ctx, 0, -70, 150, 'rgba(110,210,130,0.6)', glow);
    G.shape(ctx, [[-56, -6], [-66, -54], [-48, -96], [-22, -112], [22, -112], [48, -96], [66, -54], [56, -6], [30, 4], [-30, 4]], { fill: '#6DB37E', lw: 5, seed });
    G.poly(ctx, [[-24, -110], [24, -110], [36, -140], [-36, -140]], { fill: '#6DB37E', lw: 4.5, seed: seed + 1 });
    G.rrect(ctx, -30, -120, 60, 13, 6, { fill: '#C98A3A', lw: 3.5, seed: seed + 2 });
    G.ellipse(ctx, 0, -52, 28, 28, { fill: GOLD, lw: 4, seed: seed + 3 });
    G.text(ctx, '$', 0, -38, { size: 40, fam: NUM, weight: 800, color: '#8A5A10', align: 'center', boil: 0 });
    ctx.restore();
  }
  // 帳單 / 工資單:(x, y) = 中心;head = 上緣色帶顏色
  function bill(ctx, x, y, w, h, { head = '#C9702E', text = '材料', rot = 0, s = 1, seed = 1500 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(40,25,15,0.18)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 7, w, h);
    G.rrect(ctx, -w / 2, -h / 2, w, h, 6, { fill: PAPER, lw: 4, seed });
    G.rrect(ctx, -w / 2, -h / 2, w, 44, 6, { fill: head, lw: 4, seed: seed + 1 });
    G.text(ctx, text, 0, -h / 2 + 35, { size: 34, fam: CJK, weight: 800, color: '#FFFFFF', align: 'center', boil: 0 });
    for (let k = 0; k < 3; k++) { const yy = -h / 2 + 62 + k * 15; if (yy > h / 2 - 8) break; G.line(ctx, [[-w / 2 + 12, yy], [w / 2 - 12 - (k % 2) * 16, yy]], { color: '#CDBFA4', lw: 5, seed: seed + 2 + k, amp: 0.3 }); }
    ctx.restore();
  }
  function clockIcon(ctx, x, y, r, t, seed = 1300) {
    G.ellipse(ctx, x, y, r, r, { fill: '#FFFFFF', lw: 5, seed });
    for (let k = 0; k < 12; k += 3) { const an = k * Math.PI / 6; stroke(ctx, [[x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.7], [x + Math.cos(an) * r * 0.85, y + Math.sin(an) * r * 0.85]], INK, 4); }
    const a1 = -Math.PI / 2 + t * 3.2, a2 = -Math.PI / 2 + t * 0.6;
    stroke(ctx, [[x, y], [x + Math.cos(a1) * r * 0.66, y + Math.sin(a1) * r * 0.66]], INK, 5);
    stroke(ctx, [[x, y], [x + Math.cos(a2) * r * 0.44, y + Math.sin(a2) * r * 0.44]], INK, 7);
    G.ellipse(ctx, x, y, 5, 5, { fill: RED, lw: 0, seed: seed + 1 });
  }

  // ---------- 背景:小工程行辦公室(直式) ----------
  const FY = 1250;
  function office(ctx, t, { fy = FY } = {}) {
    fill(ctx, -300, -300, W + 600, fy + 300, lin(ctx, 0, 0, 0, fy, [[0, '#F1E8D8'], [1, '#E6DAC4']]));
    G.rrect(ctx, -40, fy - 160, W + 80, 160, 0, { fill: '#D7C6A8', lw: 4, seed: 4001 });
    G.line(ctx, [[-40, fy - 146], [W + 40, fy - 146]], { color: '#C2AE8C', lw: 4, seed: 4002, alpha: 0.8 });
    // 窗
    const wx = 70, wy = 250, ww = 400, wh = 360;
    G.rrect(ctx, wx - 16, wy - 16, ww + 32, wh + 32, 10, { fill: '#FFFFFF', lw: 6, seed: 4010 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    fill(ctx, wx, wy, ww, wh, lin(ctx, 0, wy, 0, wy + wh, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    for (let k = 0; k < 5; k++) { const bx = wx + 8 + k * 80, bh = 90 + (k * 53) % 120; G.rrect(ctx, bx, wy + wh - bh, 66, bh + 10, 3, { fill: '#B4D3E2', lw: 0, seed: 4020 + k, alpha: 0.9 }); }
    G.rrect(ctx, wx + 230, wy + 56, 130, 34, 17, { fill: '#FFFFFF', lw: 0, seed: 4031, alpha: 0.9 });
    ctx.restore();
    G.line(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], { color: '#FFFFFF', lw: 12, seed: 4032 });
    for (let k = 0; k < 4; k++) G.line(ctx, [[wx, wy + 14 + k * 16], [wx + ww, wy + 14 + k * 16]], { color: '#E8E0D0', lw: 9, seed: 4033 + k });
    // 書架與檔案夾(不寫字)
    const sx = 650;
    G.rrect(ctx, sx, 230, 470, 330, 6, { fill: '#B98A5E', lw: 5, seed: 4040 });
    const cols = ['#C8452F', '#2B5FA8', '#3E9B5F', '#E9A23B', '#7C6BB0', '#4FA3A8', '#D0605A'];
    for (const sy of [242, 402]) {
      G.rrect(ctx, sx + 12, sy, 446, 146, 3, { fill: '#8E6444', lw: 3, seed: 4041 + sy });
      for (let k = 0; k < 9; k++) { const bw = 30 + (k * 7) % 14, bh = 116 - (k * 13) % 26; G.rrect(ctx, sx + 22 + k * 46, sy + 146 - bh, bw, bh, 4, { fill: cols[(k + sy) % 7], lw: 3, seed: 4050 + k + sy, amp: 0.5 }); G.rrect(ctx, sx + 22 + k * 46 + bw * 0.25, sy + 146 - bh + 16, bw * 0.5, 22, 3, { fill: PAPER, lw: 2, seed: 4070 + k + sy, amp: 0.3 }); }
    }
    KIT.wallClock(ctx, 558, 316, 56, 10.15 + t / 40);
    // 盆栽
    const px = 1012; G.poly(ctx, [[px - 46, fy - 128], [px + 46, fy - 128], [px + 36, fy - 34], [px - 36, fy - 34]], { fill: '#C77B55', lw: 4, seed: 4100 });
    for (let k = 0; k < 6; k++) { const an = -Math.PI / 2 + (k - 2.5) * 0.36; G.ellipse(ctx, px + Math.cos(an) * 72, fy - 160 + Math.sin(an) * 84, 26, 52, { fill: '#5FA371', lw: 3.5, seed: 4101 + k }); }
    fill(ctx, -300, fy, W + 600, H - fy + 300, lin(ctx, 0, fy, 0, H, [[0, '#C9B79C'], [1, '#A8977C']]));
    KIT.floorLines(ctx, '#7E735F', 4200, fy);
  }

  // ---------- 1 阿樹接到一個大案子,算起來穩賺 ----------
  function binder(ctx, x, y, s, rot = 0) { // 厚厚一本合約(立在桌上),(x, y) = 底部中心
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(40,25,15,0.2)'; ctx.beginPath(); ctx.ellipse(10, 2, 130, 12, 0, 0, Math.PI * 2); ctx.fill();
    G.poly(ctx, [[96, -300], [126, -286], [126, 4], [96, 0]], { fill: '#F4EEDC', lw: 4, seed: 1202 });   // 頁緣
    for (let k = 1; k < 9; k++) G.line(ctx, [[99, -296 + k * 33], [123, -284 + k * 33]], { color: '#CFC5AE', lw: 2.5, seed: 1203 + k, amp: 0.2 });
    G.rrect(ctx, -100, -300, 200, 300, 8, { fill: NAVY, lw: 5, seed: 1201 });                        // 封面
    G.rrect(ctx, -100, -300, 30, 300, 6, { fill: '#22374F', lw: 4, seed: 1200 });                     // 書背
    G.rrect(ctx, -56, -250, 136, 112, 6, { fill: PAPER, lw: 4, seed: 1213 });
    label(ctx, '工程', 12, -205, 44, INK); label(ctx, '合約', 12, -155, 44, INK);
    ctx.restore();
  }
  function reportSheet(ctx, x, y, s, rot = 0) { // 阿樹手上的報表(小張)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -105, -72, 210, 144, 6, { fill: PAPER, lw: 4, seed: 1250 });
    G.rrect(ctx, -105, -72, 210, 30, 6, { fill: '#D9DEE3', lw: 4, seed: 1251 });
    for (let k = 0; k < 3; k++) { G.line(ctx, [[-88, -24 + k * 28], [20, -24 + k * 28]], { color: '#CDBFA4', lw: 6, seed: 1252 + k, amp: 0.3 }); G.line(ctx, [[46, -24 + k * 28], [88, -24 + k * 28]], { color: k === 2 ? GREEN : '#CDBFA4', lw: k === 2 ? 9 : 6, seed: 1256 + k, amp: 0.3 }); }
    ctx.restore();
  }
  function deskShot(ctx, t) {
    office(ctx, t);
    const sx = 330, hy = 1122, s = 1.4;
    const got = t >= ev.folder, rep = t >= ev.report - 0.5, prof = t >= ev.profit;
    const lift = ease.inOutCubic(clamp((t - (ev.report - 0.5)) / 0.45));
    KIT.officeChair(ctx, sx, hy, s * 0.92);
    const surprise = got && t < ev.folder + 0.55;
    const o = { x: sx, y: hy, s, pose: 'sit', style: CAST.shu, seed: 400, blink: surprise ? 0 : blink(t, 0.2), blush: prof ? 0.9 : 0.55,
      eyes: prof ? 'happy' : surprise ? 'wide' : 'normal', mouth: prof ? 'grin' : surprise ? 'o' : got ? 'smile' : 'flat',
      brows: got ? 'up' : 'neutral', look: rep ? 0.12 : got ? 0.75 : 0.1, lookY: rep ? 0.62 : got ? 0.35 : 0.5,
      headRot: prof ? Math.sin(t * 7) * 0.03 : 0, headY: prof ? -Math.abs(Math.sin(t * 7)) * 4 : 0 };
    const P = [lerp(560, sx + 4, lift), lerp(1135, 1012, lift) + Math.sin(t * 2.2) * 3]; // 報表的中心
    const hL = rep ? [P[0] - 98, P[1] + 34] : [sx - 120, 1146], hR = rep ? [P[0] + 98, P[1] + 34] : [sx + 128, 1146];
    o.handL = hand(sx, hy, s, 1, hL[0], hL[1]); o.handR = hand(sx, hy, s, 1, hR[0], hR[1]);
    person(ctx, o);
    KIT.desk(ctx, 30, 1166, 1020, { depth: 34, legs: false, seed: 120 });
    KIT.lamp(ctx, 120, 1146, 0.85, false, 160);
    G.rrect(ctx, 905, 1080, 52, 66, 8, { fill: '#5C6470', lw: 4, seed: 1260 });                     // 筆筒
    for (let k = 0; k < 3; k++) G.line(ctx, [[918 + k * 12, 1082], [912 + k * 16, 1040 - k * 6]], { color: ['#C8452F', '#2B5FA8', '#3A2A20'][k], lw: 6, seed: 1261 + k });
    // 合約落在桌上
    if (t >= ev.folder - 0.28) {
      const u = clamp((t - (ev.folder - 0.28)) / 0.28), y = lerp(560, 1150, ease.inQuad(u));
      const sq = t >= ev.folder ? U.springKick(t, ev.folder, 7, 7) * 0.12 : 0;
      ctx.save(); ctx.translate(660, y); ctx.scale(1 + sq, 1 - sq); binder(ctx, 0, 0, 1, (1 - u) * 0.18); ctx.restore();
      if (t >= ev.folder && t < ev.folder + 0.35) { const q = (t - ev.folder) / 0.35; KIT.burst(ctx, 660, 1140, 120 + q * 60, 160 + q * 90, 1 - q, 9, '#FFFFFF', 9); }
      if (t >= ev.folder + 0.25) { // 「大案子」吊牌
        const a = popIn(t, ev.folder + 0.25, 0.3), sw = Math.sin((t - ev.folder) * 5) * 0.08 * Math.exp(-(t - ev.folder));
        ctx.save(); ctx.translate(780, 872); ctx.rotate(0.12 + sw); ctx.scale(a, a);
        stroke(ctx, [[-40, -40], [0, 0]], INK, 3);
        G.poly(ctx, [[-8, -8], [118, -8], [140, 30], [118, 68], [-8, 68]], { fill: RED, lw: 4, seed: 1270 });
        label(ctx, '大案子', 64, 44, 38, '#FFFFFF');
        ctx.restore();
      }
    }
    if (rep) reportSheet(ctx, P[0], P[1], 1, -0.04 * (1 - lift));
    skinDot(ctx, hL[0], hL[1] - 4, 20); skinDot(ctx, hR[0], hR[1] - 4, 20); // 手:放在桌上 / 拿著報表
    // 放大的報表:利潤欄是綠色的正數
    if (t >= ev.report) {
      const a = popIn(t, ev.report, 0.35);
      ctx.save(); ctx.globalAlpha *= clamp(a); stroke(ctx, [[P[0] + 100, P[1] - 70], [560, 610]], '#FFFFFF', 7); ctx.restore();
      const r = KIT.table(ctx, t, { x: 505, y: 300, w: 430, at: ev.report, title: '成本估算', titleSize: 46, size: 46, rowH: 70, seed: 700,
        cols: [{ w: 0.56, align: 'left' }, { w: 0.44, align: 'right', num: true }],
        rows: [
          { cells: ['合約金額', '90'] },
          { cells: ['成本', '70'] },
          { cells: ['利潤', '+20'], kind: 'total', colors: [DGREEN, DGREEN], hi: ev.profit, hiColor: 'rgba(140,224,150,0.7)' },
        ] });
      if (prof && r) {
        const k = popIn(t, ev.profit + 0.1, 0.3), yy = 300 + r.rows[2].base - 16;
        KIT.sparkle(ctx, 905, yy - 50, 26 * k, 1, t * 2); KIT.sparkle(ctx, 640, yy - 64, 16 * k, 1, -t * 2);
        ctx.save(); ctx.translate(890, yy + 56); ctx.scale(k, k); G.poly(ctx, [[-16, 12], [16, 12], [16, -8], [28, -8], [0, -40], [-28, -8], [-16, -8]], { fill: GREEN, lw: 4, seed: 1280 }); ctx.restore();
      }
      KIT.badge(ctx, t, { t0: ev.report, text: '金額皆為示意' });
    }
    finish(ctx);
  }

  // ---------- 2–3 跟老闆報告;老闆只問了一句 ----------
  function nameplate(ctx, x, y) {
    G.poly(ctx, [[x - 84, y], [x + 84, y], [x + 74, y - 58], [x - 74, y - 58]], { fill: '#6B4A35', lw: 4, seed: 1290 });
    G.rrect(ctx, x - 64, y - 52, 128, 44, 6, { fill: '#E8D3A8', lw: 3, seed: 1291 });
    label(ctx, '老闆', x, y - 17, 36, INK);
  }
  const SHU_X = 292, SHU_Y = 1268, SHU_S = 1.2, BOSS_X = 740, BOSS_Y = 1108, BOSS_S = 1.3;
  function bossCam(t) {
    const u = ease.inOutCubic(clamp((t - (ev.one - 0.8)) / 1.3));
    return { cx: lerp(540, 600, u), cy: lerp(960, 905, u), z: lerp(1, 1.17, u) };
  }
  function bossScene(ctx, t) {
    const cam = bossCam(t);
    const talk = mouthOf('shu', t), ask = mouthOf('boss', t), hushed = t >= ev.hush;
    zoom(ctx, cam.cx, cam.cy, cam.z, () => {
      office(ctx, t);
      // 老闆:坐在自己的桌子後面
      KIT.officeChair(ctx, BOSS_X, BOSS_Y, BOSS_S * 0.95, { color: '#5A3E36', seed: 126 });
      const raised = t >= ev.one - 0.15;
      const bo = { x: BOSS_X, y: BOSS_Y, s: BOSS_S, pose: 'sit', style: CAST.boss, seed: 460, blink: blink(t, 0.5), blush: 0.15,
        eyes: 'normal', mouth: ask || 'flat', brows: 'neutral', look: -0.7, lookY: 0.08, headRot: ask ? -0.03 + Math.sin(t * 2.4) * 0.02 : 0 };
      bo.handL = hand(BOSS_X, BOSS_Y, BOSS_S, 1, BOSS_X - 70, 1138);
      if (raised) bo.gesture = 'pointUp';
      else bo.handR = hand(BOSS_X, BOSS_Y, BOSS_S, 1, BOSS_X + 40, 1132);
      person(ctx, bo);
      KIT.desk(ctx, 470, 1152, 660, { depth: 30, legs: false, color: '#9A6E4C', seed: 121 });
      nameplate(ctx, 600, 1148);
      if (!raised) { skinDot(ctx, BOSS_X - 70, 1134, 21, CAST.boss.skin, 1294); skinDot(ctx, BOSS_X + 40, 1128, 21, CAST.boss.skin, 1295); }
      else skinDot(ctx, BOSS_X - 70, 1134, 21, CAST.boss.skin, 1294);
      G.rrect(ctx, 820, 1102, 150, 40, 4, { fill: PAPER, lw: 3.5, seed: 1292 });                     // 桌上的一疊文件
      G.rrect(ctx, 830, 1088, 150, 18, 4, { fill: '#EDE3CC', lw: 3, seed: 1293 });
      // 阿樹:拿著報表走進來,比讚
      const wu = clamp((t - ev.walk) / (ev.stop - ev.walk)), moving = wu > 0 && wu < 1;
      const x = lerp(-170, SHU_X, ease.outQuad(wu)), dist = x + 170;
      const thumb = t >= ev.thumb && !hushed;
      const o = { x, y: SHU_Y, s: SHU_S, pose: moving ? 'walk' : 'stand', walk: (dist / (300 * SHU_S)) % 1, style: CAST.shu, seed: 400, blush: 0.7,
        eyes: hushed ? 'wide' : 'happy', mouth: talk || (hushed ? 'o' : 'grin'), brows: hushed ? 'worried' : 'up', look: 0.75, lookY: hushed ? 0.05 : -0.05,
        sweat: hushed ? clamp((t - ev.hush) / 0.3) : 0, blink: hushed ? 0 : blink(t, 0.2) };
      if (thumb) o.gesture = 'thumbsUp';
      const drop = hushed ? ease.inOutCubic(clamp((t - ev.hush) / 0.35)) : 0;
      if (hushed && t >= ev.thumb) o.handR = [lerp(104, 92, drop), lerp(-322 + 66, -180, drop)];
      const rp = [x - 112 + 8 * Math.sin(t * 3), SHU_Y - 400 + (moving ? Math.sin(dist / 40) * 6 : 0) + 40 * drop];
      o.handL = hand(o.x, o.y, o.s, 1, rp[0] + 26, rp[1] + 62);
      person(ctx, o);
      reportSheet(ctx, rp[0], rp[1], 0.82, -0.12);
      skinDot(ctx, rp[0] + 26, rp[1] + 58, 18);
    });
    // 老闆頭上:錢 + 時鐘 + ?(什麼時候進來)
    if (t >= ev.icon) {
      const [hx, hy] = toScreen(cam.cx, cam.cy, cam.z, BOSS_X - 20, BOSS_Y - 254 * BOSS_S - 120);
      KIT.bubble(ctx, t, { x: 560, y: 470, w: 380, h: 190, t0: ev.icon, think: true, tail: [hx - 30, hy], content: (c) => {
        coin(c, 82, 98, 46, { seed: 1310 });
        clockIcon(c, 196, 96, 52, t, 1320);
        G.text(c, '?', 312, 130, { size: 104, fam: NUM, weight: 800, color: RED, align: 'center', boil: 0 });
      } });
    }
    finish(ctx);
  }

  // ---------- 4–7 合約、帳單、兩條時間軸、空白變紅、存錢筒 ----------
  const AX0 = 200, AX1 = 930, MWF = (AX1 - AX0) / 8, TOPY = 600, BOTY = 940, BIG = 150;
  const SLOTX = (m) => AX0 + (m - 0.5) * MWF;
  function grid(ctx) {
    fill(ctx, -300, -300, W + 600, H + 600, lin(ctx, 0, 0, 0, H, [[0, '#FBF5E6'], [1, '#EFE3C8']]));
    for (let x = 30; x < W + 60; x += 60) G.line(ctx, [[x, -40], [x, H + 40]], { color: '#E2D6BA', lw: 2, seed: 5000 + x, amp: 0.3 });
    for (let y = 30; y < H + 60; y += 60) G.line(ctx, [[-40, y], [W + 40, y]], { color: '#E2D6BA', lw: 2, seed: 5200 + y, amp: 0.3 });
  }
  // 合約頁
  const CT = { x: 110, y: 250, w: 820, h: 530 };
  function contract(ctx, t) {
    if (t > ev.bills + 0.6) return;
    const away = ease.inCubic(clamp((t - ev.bills) / 0.5));
    ctx.save(); ctx.translate(CT.x + CT.w / 2, CT.y + CT.h / 2 - 900 * away); ctx.rotate(-0.1 * away); ctx.translate(-(CT.x + CT.w / 2), -(CT.y + CT.h / 2));
    KIT.card(ctx, CT.x, CT.y, CT.w, CT.h, { fill: PAPER, seed: 1600 });
    label(ctx, '工程合約', CT.x + CT.w / 2, CT.y + 92, 60, INK);
    stroke(ctx, [[CT.x + 270, CT.y + 114], [CT.x + CT.w - 270, CT.y + 114]], INK, 4);
    for (let k = 0; k < 3; k++) G.line(ctx, [[CT.x + 64, CT.y + 162 + k * 34], [CT.x + CT.w - 64 - (k === 2 ? 260 : k * 40), CT.y + 162 + k * 34]], { color: '#D8CEB8', lw: 12, seed: 1610 + k, amp: 0.4 });
    G.rrect(ctx, CT.x + 54, CT.y + 262, 10, 50, 3, { fill: RED, lw: 0, seed: 1620 });
    G.text(ctx, '付款方式', CT.x + 80, CT.y + 304, { size: 46, fam: CJK, weight: 800, color: '#8E3A2A', boil: 0 });
    [['一、完工驗收後,方可請款。', ev.clause1], ['二、請款後,依約定票期付款。', ev.clause2]].forEach(([str, th], k) => {
      const by = CT.y + 392 + k * 88;
      if (t >= th) { const u = ease.outCubic(clamp((t - th) / 0.45)), tw = KIT.measure(ctx, str, 46); ctx.save(); ctx.globalAlpha *= 0.9; ctx.fillStyle = C.hi; ctx.beginPath(); ctx.roundRect(CT.x + 66, by - 46, (tw + 28) * u, 62, 10); ctx.fill(); ctx.restore(); }
      G.text(ctx, str, CT.x + 80, by, { size: 46, fam: CJK, weight: 800, color: INK, boil: 0 });
    });
    // 封面:翻開之前蓋在頁面上,翻開時往上掀
    const cu = clamp((t - ev.open) / 0.4), lift = ease.inOutCubic(cu);
    if (cu < 1) {
      const x0 = CT.x - 6, x1 = CT.x + CT.w + 6, y0 = CT.y - 6, hh = (CT.h + 12) * (1 - lift);
      G.poly(ctx, [[x0, y0], [x1, y0], [x1 + 40 * lift, y0 + hh], [x0 - 40 * lift, y0 + hh]], { fill: NAVY, lw: 5, seed: 1630 });
      if (lift < 0.6) {
        ctx.save(); ctx.translate(CT.x + CT.w / 2, y0 + hh / 2); ctx.scale(1, 1 - lift);
        G.rrect(ctx, -230, -90, 460, 180, 10, { fill: PAPER, lw: 4, seed: 1631 });
        label(ctx, '工程合約', 0, 26, 76, INK);
        ctx.restore();
        G.line(ctx, [[x0 + 40, y0 + 30], [x1 - 40, y0 + 30]], { color: '#D4A83A', lw: 4, seed: 1632, alpha: 1 - lift });
      }
      if (t >= ev.open - 0.4) { const hx = x1 - 120, hyy = y0 + hh + 6; G.limb(ctx, [[hx + 160, hyy + 170], [hx + 30, hyy + 30]], { color: C.skin, lw: 54, outline: 4, seed: 1633 }); skinDot(ctx, hx + 10, hyy + 6, 34, C.skin, 1634); }
    }
    ctx.restore();
  }
  // 時間軸(收款那一條):先放大畫、跟著往右走;入帳落下之後拉遠成整條
  const MILES = [
    { u: 0, text: '開工', pos: 1 }, { u: 5, text: '完工', pos: 1 }, { u: 5.5, text: '驗收', pos: -1, hide: true }, { u: 6, text: '請款', pos: 1 },
  ];
  function tlHead(t) {
    const a0 = ev.line1, a1 = Math.min(ev.line1 + 1.1, ev.accept - 0.32);
    let u = 0;
    if (t >= a0) u = 5 * ease.inOutQuad(clamp((t - a0) / (a1 - a0)));
    if (t >= ev.accept - 0.3) u = 5 + ease.inOutQuad(clamp((t - (ev.accept - 0.3)) / 0.6));
    if (t >= ev.stretch) u = 6 + 1.5 * ease.outBack(clamp((t - ev.stretch) / (ev.land - ev.stretch)), 1.3);
    return u;
  }
  function tlView(t) {
    const head = tlHead(t), k = ease.inOutCubic(clamp((t - ev.land - 0.15) / 0.8));
    const panBig = Math.max(0, AX0 + Math.min(head, 7.5) * BIG - 850);
    return { head, k, mw: lerp(BIG, MWF, k), pan: lerp(panBig, 0, k) };
  }
  const tX = (v, u) => AX0 + u * v.mw - v.pan;
  function bottomAxis(ctx, t, v) {
    if (t < ev.line1 - 0.05) return;
    const y = BOTY;
    const x0 = tX(v, 0), xs = tX(v, Math.min(v.head, 6)), xe = tX(v, v.head);
    stroke(ctx, [[x0, y], [xs, y]], INK, 10);
    if (v.head > 6) { ctx.save(); ctx.setLineDash([24, 16]); stroke(ctx, [[tX(v, 6), y], [xe, y]], INK, 10); ctx.restore(); }
    const tip = v.head > 6 ? xe : xs; // 箭頭
    if (v.head < 7.45 && t < ev.land) G.poly(ctx, [[tip + 4, y - 18], [tip + 34, y], [tip + 4, y + 18]], { fill: INK, lw: 3, seed: 1640 });
    if (t >= ev.land) { // 入帳之後:時間軸接到第 8 個月底,跟上面那一條一樣長
      const k = ease.outCubic(clamp((t - ev.land) / 0.4)), xa = tX(v, 7.5), xb = lerp(xa, tX(v, 8), k);
      stroke(ctx, [[xa, y], [xb, y]], INK, 10);
      G.poly(ctx, [[xb - 2, y - 18], [xb + 28, y], [xb - 2, y + 18]], { fill: INK, lw: 3, seed: 1641 });
    }
    // 月份刻度
    for (let m = 1; m <= 8; m++) { const ux = m; if (ux > v.head + 0.01) break; const xx = tX(v, ux); stroke(ctx, [[xx, y - 12], [xx, y + 12]], INK, 4, 0.55); }
    // 里程碑:開工、完工、驗收、請款
    for (const ms of MILES) {
      if (v.head < ms.u - 0.02) continue;
      const xx = tX(v, ms.u), fade = ms.hide ? 1 - v.k : 1;
      if (fade <= 0) continue;
      ctx.save(); ctx.globalAlpha *= fade;
      G.ellipse(ctx, xx, y, 15, 15, { fill: ms.u === 5 ? '#F2C230' : PAPER, lw: 5, seed: 1650 + ms.u * 10 });
      label(ctx, ms.text, xx, ms.pos > 0 ? y + 66 : y - 36, 40, INK);
      ctx.restore();
    }
    // 票期:虛線上方的括號
    if (v.head > 6.2) {
      const fa = clamp((v.head - 6.2) / 0.5) * (1 - clamp((t - ev.gap) / 0.3));
      if (fa > 0) { const xa = tX(v, 6) + 10, xb = Math.min(xe, tX(v, 7.5)) - 50; ctx.save(); ctx.globalAlpha *= fa; stroke(ctx, [[xa, y - 30], [xa, y - 46], [xb, y - 46], [xb, y - 30]], RED, 5); label(ctx, '票期', (xa + xb) / 2, y - 64, 40, RED); ctx.restore(); }
    }
    // 入帳:綠色的錢袋,落在最後面
    if (t >= ev.land - 0.08) {
      const a = popIn(t, ev.land - 0.08, 0.3), bx = tX(v, 7.5), g = t >= ev.in ? 0.6 + 0.4 * Math.sin((t - ev.in) * 6) : 0;
      const bob = t >= ev.in && t < ev.in + 0.8 ? -Math.abs(Math.sin((t - ev.in) * 8)) * 14 * (1 - (t - ev.in) / 0.8) : 0;
      ctx.save(); ctx.translate(bx, y - 8 + bob); ctx.scale(a, a); moneyBag(ctx, 0, 0, 0.78, { glow: g }); ctx.restore();
      label(ctx, '入帳', bx, y + 66, 40, DGREEN);
    }
  }
  // 帳單:一疊炸開,材料帳單與每個月的工資單飛到上面那一條的月份上
  const BILLS = [{ m: 1, t0: ev.mat + 0.1, head: '#C9702E', text: '材料', w: 86, h: 108, row: 0 }]
    .concat(ev.wages.map((tw, k) => ({ m: k + 1, t0: tw, head: C.blue, text: '工資', w: 82, h: 96, row: k === 0 ? 1 : 0 })));
  const PILE = [540, 420];
  function billTarget(b) { const x = SLOTX(b.m), y = b.row === 0 ? TOPY - 10 - b.h / 2 : TOPY - 10 - 108 - 12 - b.h / 2; return [x, y]; }
  function billPos(b, t) {
    const p = ease.inOutCubic(clamp((t - b.t0) / 0.55)), [tx, ty] = billTarget(b);
    return { x: lerp(PILE[0], tx, p), y: lerp(PILE[1], ty, p) - Math.sin(Math.PI * p) * 120, rot: (1 - p) * (b.m % 2 ? 0.9 : -0.8) * Math.sin(p * Math.PI * 2 + 0.5), p };
  }
  function bills(ctx, t) {
    if (t < ev.bills + 0.15) return;
    // 那一疊帳單
    const last = ev.wages[4] + 0.1;
    if (t < last + 0.25) {
      const a = popIn(t, ev.bills + 0.15, 0.3) * (1 - clamp((t - last) / 0.25)), shake = t < ev.burst ? Math.sin(t * 40) * 0.04 * clamp((t - ev.bills - 0.3) / 0.2) : 0;
      ctx.save(); ctx.translate(PILE[0], PILE[1]); ctx.rotate(shake); ctx.scale(a, a);
      const n = t < ev.burst ? 7 : Math.max(1, BILLS.filter((b) => t < b.t0).length);
      for (let k = 0; k < n; k++) bill(ctx, (U.hash(k, 3) - 0.5) * 30, -k * 9, 140, 160, { head: k % 2 ? C.blue : '#C9702E', text: k % 2 ? '工資' : '材料', rot: (U.hash(k, 4) - 0.5) * 0.3, seed: 1520 + k * 7 });
      ctx.restore();
    }
    // 炸開:幾張紙往外飛,飛出畫面
    if (t >= ev.burst && t < ev.burst + 1.2) {
      const q = t - ev.burst;
      for (let k = 0; k < 7; k++) {
        const an = -Math.PI / 2 + (k - 3) * 0.42 + (U.hash(k, 9) - 0.5) * 0.3, sp = 900 + U.hash(k, 8) * 500;
        const x = PILE[0] + Math.cos(an) * sp * q, y = PILE[1] + Math.sin(an) * sp * q + 1400 * q * q, al = 1 - clamp((q - 0.7) / 0.5);
        ctx.save(); ctx.globalAlpha *= al; bill(ctx, x, y, 110, 130, { head: k % 2 ? C.blue : '#C9702E', text: k % 2 ? '工資' : '材料', rot: q * (k % 2 ? 7 : -6), seed: 1560 + k * 5 }); ctx.restore();
      }
    }
    // 每一張帳單飛到自己的月份
    const glow = t >= ev.out ? clamp((t - ev.out) / 0.3) * (0.55 + 0.45 * Math.sin((t - ev.out) * 5)) * (1 - clamp((t - ev.in) / 0.6)) : 0;
    if (glow > 0) KIT.glow(ctx, SLOTX(3), TOPY - 120, 330, 'rgba(230,90,60,0.35)', glow);
    for (const b of BILLS) {
      if (t < b.t0) continue;
      const P = billPos(b, t), land = t >= b.t0 + 0.55, sq = land ? U.springKick(t, b.t0 + 0.55, 9, 9) * 0.08 : 0;
      const big = t >= ev.out && t < ev.out + 0.5 ? 1 + 0.08 * Math.sin((t - ev.out) / 0.5 * Math.PI) : 1;
      ctx.save(); ctx.translate(P.x, P.y + b.h / 2); ctx.scale((1 + sq) * big, (1 - sq) * big); ctx.translate(-P.x, -P.y - b.h / 2);
      bill(ctx, P.x, P.y, b.w, b.h, { head: b.head, text: b.text, rot: P.rot, seed: 1580 + b.m * 3 + (b.text === '材料' ? 40 : 0) });
      ctx.restore();
      if (b.text === '材料' && t >= b.t0 + 0.7) { // 材料帳單蓋上「下月」
        const k = clamp((t - b.t0 - 0.7) / 0.14), s = lerp(2, 1, ease.outCubic(k));
        ctx.save(); ctx.translate(P.x, P.y + 26); ctx.rotate(-0.2); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 3);
        ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-40, -26, 80, 50, 8); ctx.stroke();
        label(ctx, '下月', 0, 13, 36, RED);
        ctx.restore();
      }
    }
    // 每個月都要付
    if (t >= ev.wages[4] + 0.6) {
      const a = popIn(t, ev.wages[4] + 0.6, 0.3), xa = SLOTX(1) - 40, xb = SLOTX(5) + 40, yb = TOPY - 248;
      ctx.save(); ctx.globalAlpha *= clamp(a) * (1 - clamp((t - ev.gap) / 0.4));
      stroke(ctx, [[xa, yb + 18], [xa, yb], [xb, yb], [xb, yb + 18]], C.blue, 5);
      label(ctx, '每個月', (xa + xb) / 2, yb - 18, 40, C.blue);
      ctx.restore();
    }
  }
  function topAxis(ctx, t) {
    if (t < ev.bills + 0.3) return;
    const a = ease.outCubic(clamp((t - (ev.bills + 0.3)) / 0.45)), colA = clamp((t - ev.axes) / 0.4);
    stroke(ctx, [[AX0, TOPY], [lerp(AX0, AX1, a), TOPY]], INK, 10);
    if (colA > 0) stroke(ctx, [[AX0, TOPY], [lerp(AX0, AX1, a), TOPY]], RED, 10, colA);
    if (a > 0.98) G.poly(ctx, [[AX1 - 2, TOPY - 18], [AX1 + 28, TOPY], [AX1 - 2, TOPY + 18]], { fill: colA > 0.5 ? RED : INK, lw: 3, seed: 1660 });
    for (let m = 0; m <= 7; m++) { const xx = AX0 + m * MWF; if (xx > lerp(AX0, AX1, a)) break; stroke(ctx, [[xx, TOPY - 12], [xx, TOPY + 12]], INK, 4, 0.55); }
  }
  function axisLabels(ctx, t) {
    pill(ctx, 125, TOPY, '付款', { bg: RED, a: popIn(t, ev.axes, 0.3), seed: 1701 });
    if (t >= ev.out) { const a = clamp((t - ev.out) / 0.3); ctx.save(); ctx.globalAlpha *= a; label(ctx, '錢出去', 125, TOPY - 54, 36, RED); ctx.restore(); }
    pill(ctx, 125, BOTY, '收款', { bg: GREEN, a: popIn(t, ev.in - 0.12, 0.3), seed: 1702 });
    if (t >= ev.in) { const a = clamp((t - ev.in) / 0.3); ctx.save(); ctx.globalAlpha *= a; label(ctx, '錢進來', 125, BOTY - 54, 36, DGREEN); ctx.restore(); }
  }
  // 中間那一大段空白 → 變紅 → 存錢筒的錢倒進去,倒到一半就沒了
  const GX0 = AX0, GX1 = AX0 + 7.5 * MWF - 64, GY0 = TOPY + 26, GY1 = BOTY - 26;
  const PIG = [470, 1150], COINS = ev.coins.length;
  const coinT = (k) => ev.coins[k];
  const FILL_MAX = 0.55;
  function gapBox(ctx, t) {
    if (t < ev.gap) return;
    const a = clamp((t - ev.gap) / 0.35), red = clamp((t - ev.red) / 0.4);
    const w = (GX1 - GX0) * ease.outCubic(a);
    // 底色:空白 → 紅
    if (red > 0) { ctx.save(); ctx.globalAlpha *= red * (0.85 + 0.15 * Math.sin((t - ev.red) * 6)); fill(ctx, GX0, GY0, w, GY1 - GY0, 'rgba(214,72,50,0.30)'); ctx.restore(); }
    // 公司先墊的錢:從左邊開始往右填
    const arrived = Array.from({ length: COINS }, (_, k) => clamp((t - coinT(k) - 0.42) / 0.12)).reduce((s, x) => s + x, 0);
    const fu = FILL_MAX * arrived / COINS, fx = GX0 + (GX1 - GX0) * fu;
    if (fu > 0) {
      fill(ctx, GX0, GY0, fx - GX0, GY1 - GY0, lin(ctx, 0, GY0, 0, GY1, [[0, 'rgba(242,194,48,0.55)'], [1, 'rgba(232,170,40,0.85)']]));
      for (let r = 0; r < 9; r++) for (let c = 0; c * 46 + 30 < fx - GX0; c++) coin(ctx, GX0 + 26 + c * 46 + (r % 2) * 22, GY1 - 18 - r * 30, 16, { seed: 1960 + r * 13 + c, spin: 1 });
    }
    // 外框:虛線,變紅之後閃
    ctx.save(); ctx.setLineDash([20, 14]); ctx.lineDashOffset = -t * 30;
    const flash = t >= ev.empty ? 0.5 + 0.5 * Math.sin((t - ev.empty) * 12) : 1;
    ctx.strokeStyle = red > 0 ? RED : INK; ctx.lineWidth = red > 0 ? 7 : 5; ctx.globalAlpha *= a * (red > 0 ? flash : 1);
    ctx.strokeRect(GX0, GY0, w, GY1 - GY0);
    ctx.restore();
    if (t >= ev.empty) { // 墊不出來的那一段
      const ua = clamp((t - ev.empty) / 0.3) * (0.55 + 0.45 * Math.sin((t - ev.empty) * 10));
      ctx.save(); ctx.globalAlpha *= ua; fill(ctx, fx, GY0, GX1 - fx, GY1 - GY0, 'rgba(200,40,30,0.32)'); ctx.restore();
    }
    // 好幾個月:左右箭頭
    if (t >= ev.months - 0.1) {
      const k = ease.outCubic(clamp((t - ev.months + 0.1) / 0.45)), cx = (GX0 + GX1) / 2, ay = GY0 + 72, half = (GX1 - GX0) / 2 - 22;
      const col = red > 0.5 ? '#FFFFFF' : INK;
      stroke(ctx, [[cx - half * k, ay], [cx + half * k, ay]], col === INK ? INK : '#8E2A1E', 6);
      G.poly(ctx, [[cx - half * k - 4, ay], [cx - half * k + 22, ay - 16], [cx - half * k + 22, ay + 16]], { fill: INK, lw: 3, seed: 1670 });
      G.poly(ctx, [[cx + half * k + 4, ay], [cx + half * k - 22, ay - 16], [cx + half * k - 22, ay + 16]], { fill: INK, lw: 3, seed: 1671 });
      const la = clamp(k * 2);
      ctx.save(); ctx.globalAlpha *= la; G.rrect(ctx, cx - 112, ay - 36, 224, 66, 14, { fill: PAPER, lw: 4, seed: 1672 }); label(ctx, '好幾個月', cx, ay + 14, 44, INK); ctx.restore();
    }
    // 「空白」
    const ta = popIn(t, ev.gap + 0.15, 0.35);
    if (ta > 0) { ctx.save(); ctx.translate((GX0 + GX1) / 2, GY0 + 196); ctx.scale(ta, ta); label(ctx, '空白', 0, 30, 92, red > 0.5 ? '#FFFFFF' : RED, { stroke: red > 0.5 ? '#8E2A1E' : '#FFFFFF', strokeW: 16 }); ctx.restore(); }
  }
  function piggy(ctx, x, y, s, level, { rot = 0, seed = 1800 } = {}) { // (x, y) = 身體中心;level 0..1 = 窗裡還有多少錢
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(40,20,20,0.18)'; ctx.beginPath(); ctx.ellipse(0, 100, 130, 14, 0, 0, Math.PI * 2); ctx.fill();
    for (const lx of [-78, -36, 36, 78]) G.rrect(ctx, lx - 16, 46, 32, 52, 10, { fill: PINKD, lw: 4.5, seed: seed + lx });
    G.line(ctx, [[-130, -8], [-154, -24], [-150, -46], [-132, -40], [-142, -20]], { color: PINKD, lw: 8, seed: seed + 5 });
    G.poly(ctx, [[-66, -72], [-54, -120], [-24, -84]], { fill: PINKD, lw: 4.5, seed: seed + 6 });
    G.poly(ctx, [[20, -86], [44, -122], [64, -76]], { fill: PINKD, lw: 4.5, seed: seed + 7 });
    G.ellipse(ctx, 0, 0, 136, 94, { fill: PINK, lw: 5, seed: seed + 8, hatch: { color: 'rgba(170,50,80,0.10)', gap: 8 } });
    G.ellipse(ctx, 136, 8, 26, 32, { fill: PINKD, lw: 4.5, seed: seed + 9 });
    G.ellipse(ctx, 132, -2, 4.5, 7, { fill: INK, lw: 0, seed: seed + 10 }); G.ellipse(ctx, 132, 18, 4.5, 7, { fill: INK, lw: 0, seed: seed + 11 });
    G.ellipse(ctx, 96, -32, 7, 9, { fill: INK, lw: 0, seed: seed + 12 });
    G.rrect(ctx, -38, -96, 76, 14, 7, { fill: '#5A2A36', lw: 3.5, seed: seed + 13 });
    const wx = -84, wy = -50, ww = 156, wh = 100;
    G.rrect(ctx, wx, wy, ww, wh, 22, { fill: 'rgba(236,244,248,0.95)', lw: 4, seed: seed + 14 });
    ctx.save(); ctx.beginPath(); ctx.roundRect(wx + 4, wy + 4, ww - 8, wh - 8, 18); ctx.clip();
    const top = wy + wh - 6 - (wh - 10) * clamp(level);
    for (let r = 0; r < 7; r++) { const cy = wy + wh - 12 - r * 14; if (cy < top) break; for (let c = 0; c < 7; c++) G.ellipse(ctx, wx + 14 + c * 22 + (r % 2) * 10, cy, 14, 7, { fill: GOLD, lw: 2.5, seed: seed + 20 + r * 7 + c, amp: 0.3 }); }
    if (level <= 0.02) for (let k = 0; k < 5; k++) G.ellipse(ctx, wx + 30 + k * 26, wy + wh - 14 - (k % 2) * 6, 3, 3, { fill: '#B9AFA0', lw: 0, seed: seed + 60 + k }); // 只剩灰塵
    ctx.restore();
    stroke(ctx, [[wx + 18, wy + 20], [wx + 44, wy + 13]], 'rgba(255,255,255,0.85)', 5);
    ctx.restore();
  }
  function piggyPart(ctx, t) {
    if (t < ev.red + 0.3) return;
    const a = popIn(t, ev.red + 0.3, 0.35);
    const launched = Array.from({ length: COINS }, (_, k) => (t >= coinT(k) ? 1 : 0)).reduce((s, x) => s + x, 0);
    const level = 1 - launched / COINS;
    const sh = t >= ev.empty - 0.1 ? Math.sin((t - ev.empty) * 34) * 0.09 * Math.exp(-Math.max(0, t - ev.empty) * 2.2) : 0;
    const tip = t >= ev.empty - 0.1 ? -0.25 * ease.outCubic(clamp((t - ev.empty + 0.1) / 0.3)) : 0; // 倒過來搖,倒不出東西
    ctx.save(); ctx.translate(PIG[0], PIG[1]); ctx.scale(a, a);
    piggy(ctx, 0, 0, 0.95, level, { rot: sh + tip });
    ctx.restore();
    if (a > 0.5) { ctx.save(); ctx.globalAlpha *= clamp(a); pill(ctx, 790, PIG[1] - 10, '公司存款', { size: 38, bg: '#8E6444', seed: 1703 }); ctx.restore(); }
    // 飛出去的錢
    for (let k = 0; k < COINS; k++) {
      const p = (t - coinT(k)) / 0.45;
      if (p <= 0 || p >= 1) continue;
      const fu = FILL_MAX * Math.min(COINS, k + 0.5) / COINS, tx = GX0 + (GX1 - GX0) * fu - 20, ty = GY1 - 40 - (k % 5) * 44;
      const x = lerp(PIG[0], tx, p), y = lerp(PIG[1] - 90, ty, p) - Math.sin(Math.PI * p) * 140;
      coin(ctx, x, y, 19, { seed: 1900 + k, spin: Math.abs(Math.cos(p * 10 + k)) });
    }
    if (t >= ev.bottom) KIT.stamp(ctx, '見底', PIG[0] - 10, PIG[1] - 6, t, ev.bottom, { size: 64, rot: -0.16 });
  }
  function diagram(ctx, t) {
    const pz = 1 + 0.04 * ease.inOutQuad(clamp((t - ev.axes) / 4));
    ctx.save(); ctx.translate(540, 780); ctx.scale(pz, pz); ctx.translate(-540, -780);
    KIT.cached(ctx, 'grid8', grid);
    contract(ctx, t);
    const v = tlView(t);
    topAxis(ctx, t);
    gapBox(ctx, t);
    bottomAxis(ctx, t, v);
    bills(ctx, t);
    if (t >= ev.axes) axisLabels(ctx, t);
    piggyPart(ctx, t);
    ctx.restore();
    finish(ctx, { warm: 'rgba(255,230,180,0.10)', floor: 0.2, y0: 1250 });
  }

  // ---------- 7 墊不出來,案子做一半就停了(工地:安全帽、頤帶、反光背心) ----------
  function stallShot(ctx, t) {
    KIT.bg.fab(ctx, t, { floor: 1210, pipeY: 150, columns: [80, 1000], hangers: [540], machines: [] });
    const PY = 1000;
    for (const sx of [110, 420]) { // 管架(落地)
      G.rrect(ctx, sx - 10, PY + 22, 20, 1200 - PY - 22, 4, { fill: '#7F8B96', lw: 4, seed: 2000 + sx });
      G.rrect(ctx, sx - 42, 1192, 84, 14, 4, { fill: '#5C6470', lw: 4, seed: 2001 + sx });
      G.rrect(ctx, sx - 36, PY + 20, 72, 12, 3, { fill: '#7F8B96', lw: 3.5, seed: 2002 + sx });
    }
    KIT.pipeRun(ctx, -40, 610, PY, 46, C.pipe, 2010);
    G.rrect(ctx, 262, PY - 34, 18, 68, 4, { fill: '#8E99A3', lw: 4, seed: 2015 });
    G.ellipse(ctx, 610, PY, 12, 23, { fill: '#2A3440', lw: 4, seed: 2016 });                         // 管口:做到這裡就停了
    ctx.save(); ctx.setLineDash([18, 14]); ctx.globalAlpha *= 0.75; stroke(ctx, [[630, PY - 23], [1110, PY - 23]], '#5C6470', 4); stroke(ctx, [[630, PY + 23], [1110, PY + 23]], '#5C6470', 4); ctx.restore();
    // 工班:沒有事做
    person(ctx, { x: 230, y: 1256, s: 1.08, pose: 'stand', style: CAST.crew, seed: 480, crossArms: true, eyes: 'normal', mouth: 'flat', brows: 'worried', look: 0.55, lookY: 0.15, blink: blink(t, 0.3) });
    const shrug = t >= ev.halt + 0.15;
    person(ctx, { x: 450, y: 1262, s: 1.04, pose: 'stand', style: CAST.crew2, seed: 500, gesture: shrug ? 'shrug' : 'akimbo', eyes: 'normal', mouth: shrug ? 'wavy' : 'flat', brows: 'worried', look: shrug ? -0.3 : 0.7, lookY: 0.1, blink: blink(t, 0.7) });
    // 暫停施工
    for (const cx of [690, 980]) KIT.cone(ctx, cx, 1262, 0.9, 2040 + cx);
    if (t >= ev.halt - 0.05) {
      const a = popIn(t, ev.halt, 0.32), sq = U.springKick(t, ev.halt, 7, 8) * 0.04;
      ctx.save(); ctx.translate(835, 1262); ctx.scale(a * (1 + sq), a * (1 - sq));
      for (const sd of [-1, 1]) G.line(ctx, [[sd * 96, 0], [sd * 70, -250]], { color: '#5C6470', lw: 12, seed: 2050 + sd });
      G.rrect(ctx, -136, -300, 272, 150, 10, { fill: '#FFFFFF', lw: 6, seed: 2053 });
      ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.beginPath(); ctx.roundRect(-122, -286, 244, 122, 8); ctx.stroke();
      label(ctx, '暫停施工', 0, -207, 52, RED);
      ctx.restore();
    }
    fill(ctx, -300, -300, W + 600, H + 600, 'rgba(70,86,112,0.17)');
    finish(ctx, { warm: 'rgba(200,215,255,0.06)', floor: 0.34 });
  }

  // ---------- 8 休息區:師傅說 ----------
  const RFY = 1190;
  function restBg(ctx) {
    fill(ctx, -300, -300, W + 600, RFY + 300, lin(ctx, 0, 0, 0, RFY, [[0, '#F3E6CB'], [1, '#EAD7B4']]));
    G.rrect(ctx, -40, RFY - 300, W + 80, 300, 0, { fill: '#D2B58A', lw: 5, seed: 6001 });
    for (let k = 0; k < 9; k++) G.line(ctx, [[40 + k * 130, RFY - 294], [40 + k * 130, RFY - 4]], { color: '#B0946A', lw: 3, seed: 6002 + k, alpha: 0.6 });
    // 窗
    G.rrect(ctx, 70, 280, 380, 320, 12, { fill: '#B98A5E', lw: 6, seed: 6020 });
    fill(ctx, 88, 298, 344, 284, lin(ctx, 0, 298, 0, 582, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    G.ellipse(ctx, 360, 540, 100, 64, { fill: '#8FC49A', lw: 0, seed: 6021 }); G.ellipse(ctx, 180, 556, 90, 50, { fill: '#A5D3A6', lw: 0, seed: 6022 });
    G.line(ctx, [[260, 298], [260, 582]], { color: '#B98A5E', lw: 9, seed: 6023 });
    G.rrect(ctx, 62, 590, 396, 18, 4, { fill: '#B98A5E', lw: 4, seed: 6024 });
    // 「休息區」牌子
    ctx.save(); ctx.translate(790, 330); ctx.rotate(-0.02); G.tornPaper(ctx, -130, -56, 260, 108, { fill: PAPER, seed: 6030 }); label(ctx, '休息區', 0, 22, 62, INK); ctx.restore();
    // 安全帽掛在牆上(休息區可以脫帽)
    KIT.hungHelmet(ctx, 700, 620, KIT.HELMET.master, 6040); KIT.hungHelmet(ctx, 870, 620, KIT.HELMET.shu, 6050);
    for (const hx of [700, 870]) G.ellipse(ctx, hx, 558, 8, 8, { fill: '#6C7680', lw: 2, seed: 6070 + hx });
    fill(ctx, -300, RFY, W + 600, H - RFY + 300, lin(ctx, 0, RFY, 0, H, [[0, '#B98A5E'], [1, '#8E6444']]));
    KIT.floorLines(ctx, '#6E4C34', 6100, RFY);
  }
  function cup(ctx, x, y, s = 1, seed = 2100) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.poly(ctx, [[-22, -30], [22, -30], [16, 0], [-16, 0]], { fill: '#F4F1EA', lw: 4, seed }); G.line(ctx, [[-16, -22], [16, -22]], { color: '#6FA287', lw: 4, seed: seed + 1 }); ctx.restore(); }
  function teapot(ctx, x, y, seed = 2110) {
    G.ellipse(ctx, x, y - 40, 58, 42, { fill: '#9A5A3C', lw: 5, seed });
    G.line(ctx, [[x + 52, y - 46], [x + 86, y - 74]], { color: '#9A5A3C', lw: 14, seed: seed + 1 });
    G.line(ctx, [[x - 50, y - 64], [x - 84, y - 50], [x - 52, y - 22]], { color: '#7A452E', lw: 9, seed: seed + 2 });
    G.ellipse(ctx, x, y - 82, 26, 10, { fill: '#7A452E', lw: 4, seed: seed + 3 }); G.ellipse(ctx, x, y - 94, 8, 7, { fill: '#7A452E', lw: 3, seed: seed + 4 });
  }
  function restShot(ctx, t) {
    restBg(ctx);
    const m = mouthOf('master', t), speaking = t >= ev.speak && t < E[10] + 0.3, point = t >= ev.card2 - 0.1 && t < E[10] + 0.2;
    const cupDown = ease.inOutCubic(clamp((t - ev.rest - 0.1) / 0.45));
    // 師傅
    const MX = 300, MY = 1140, MS = 1.3;
    const mo = { x: MX, y: MY, s: MS, pose: 'sit', style: CAST.master, seed: 440, blink: blink(t, 0.6), blush: 0.35, eyes: 'normal', mouth: m || 'flat',
      brows: point ? 'determined' : 'neutral', look: speaking ? 0.55 : 0.4, lookY: 0.1, headRot: m ? Math.sin(t * 2.3) * 0.025 : 0 };
    const cupP = [lerp(MX + 70, 412, cupDown), lerp(MY - 230, 1162, cupDown)];
    if (point) mo.gesture = 'pointUp';
    else mo.handR = hand(MX, MY, MS, 1, cupP[0] - 4, cupP[1] - 10);
    mo.handL = hand(MX, MY, MS, 1, MX - 70, 1166);
    person(ctx, mo);
    // 阿樹
    const SX = 772, SY = 1148, SS = 1.25, nod = t >= ev.card2 + 0.6 && t < ev.card2 + 1.6 ? Math.abs(Math.sin((t - ev.card2 - 0.6) * 6)) * 6 : 0;
    const so = { x: SX, y: SY, s: SS, pose: 'sit', style: CAST.shu, seed: 400, blink: blink(t, 0.2), blush: 0.5, eyes: t >= ev.card2 ? 'normal' : 'normal', mouth: t >= ev.card2 + 0.6 ? 'flat' : 'o',
      brows: 'worried', look: -0.6, lookY: 0.1, headY: nod };
    so.handL = hand(SX, SY, SS, 1, 650, 1150); so.handR = hand(SX, SY, SS, 1, SX + 70, 1166);
    person(ctx, so);
    KIT.desk(ctx, 40, 1186, 1000, { depth: 34, legs: false, color: '#B07A4E', seed: 122 });
    teapot(ctx, 540, 1170);
    cup(ctx, cupP[0], cupP[1] + (cupDown < 1 ? 0 : 0), 1, 2100); cup(ctx, 650, 1168, 1, 2105);
    if (!point) skinDot(ctx, cupP[0] - 2, cupP[1] - 12, 20, CAST.master.skin, 2120); // 右手拿著杯子(比手指的時候杯子留在桌上)
    skinDot(ctx, MX - 70, 1162, 20, CAST.master.skin, 2121);
    skinDot(ctx, 650, 1146, 19, CAST.shu.skin, 2122); skinDot(ctx, SX + 70, 1162, 19, CAST.shu.skin, 2123);
    // 字卡:不是賠錢倒的 / 是賺錢時周轉不過來
    if (t >= ev.card1) {
      const a = popIn(t, ev.card1, 0.32);
      ctx.save(); ctx.translate(360, 330); ctx.rotate(-0.03); ctx.scale(a, a);
      KIT.card(ctx, -220, -70, 440, 140, { fill: PAPER, seed: 2130 });
      label(ctx, '賠錢倒的', 0, 22, 64, INK);
      ctx.restore();
      if (t >= ev.card1 + 0.45) KIT.cross(ctx, 360, 330, 74, clamp((t - ev.card1 - 0.45) / 0.3), { lw: 16 });
    }
    if (t >= ev.card2) {
      const a = popIn(t, ev.card2, 0.32);
      ctx.save(); ctx.translate(530, 520); ctx.rotate(0.02); ctx.scale(a, a);
      KIT.card(ctx, -330, -74, 660, 148, { fill: '#FFF6D8', seed: 2140 });
      label(ctx, '賺錢時周轉不過來', 0, 22, 60, RED);
      ctx.restore();
      if (t >= ev.card2 + 0.5) { // 紅筆圈起來
        const u = ease.outCubic(clamp((t - ev.card2 - 0.5) / 0.45)), pts = [];
        for (let i = 0; i <= 40; i++) { const an = -2.6 + i / 40 * Math.PI * 2.15 * u; pts.push([530 + Math.cos(an) * 338, 520 + Math.sin(an) * 92]); }
        stroke(ctx, pts, RED, 8);
      }
    }
    finish(ctx, { warm: 'rgba(255,232,190,0.14)' });
  }

  // ---------- 9 之後阿樹報價,多做一張表 ----------
  function miniSheet(ctx, w, h) { // 螢幕上的試算表(很小,只看得出格子)
    fill(ctx, 0, 0, w, h, '#F7F9FB');
    fill(ctx, 0, 0, w, 30, '#4F7C6A');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { ctx.strokeStyle = '#C9D3DB'; ctx.lineWidth = 2; ctx.strokeRect(10 + c * 73, 40 + r * 19, 73, 19); }
    for (let r = 0; r < 5; r++) fill(ctx, 90, 45 + r * 19, 40, 9, 'rgba(200,69,47,0.75)');
    fill(ctx, 160, 45 + 6 * 19, 40, 9, 'rgba(62,155,95,0.85)');
  }
  function deskShot2(ctx, t) {
    office(ctx, t);
    const sx = 300, hy = 1124, s = 1.36;
    KIT.officeChair(ctx, sx, hy, s * 0.92);
    const o = { x: sx, y: hy, s, pose: 'sit', style: CAST.shu, seed: 400, blink: blink(t, 0.2), blush: 0.55, eyes: 'normal', mouth: 'flat', brows: 'determined', look: 0.8, lookY: 0.3 };
    const ty = 1138 + Math.sin(t * 22) * 4, ty2 = 1138 + Math.sin(t * 22 + 2.1) * 4;
    o.handL = hand(sx, hy, s, 1, 262, ty); o.handR = hand(sx, hy, s, 1, 372, ty2);
    person(ctx, o);
    KIT.desk(ctx, 30, 1166, 1020, { depth: 34, legs: false, seed: 123 });
    KIT.keyboard(ctx, 318, 1152, 0.95, 140);
    skinDot(ctx, 262, ty, 19); skinDot(ctx, 372, ty2, 19);
    KIT.monitor(ctx, 735, 1150, 1.3, { back: false, glow: 0.5, screen: miniSheet, seed: 130 });
    finish(ctx);
  }
  // 按月收支表(呼應免費工具「專案現金流試算表」):付出 → 收入 → 累計,最低的那一格就是公司要先墊的錢
  const ROWS = [
    { m: '第1月', pay: '30', cum: -30 }, { m: '第2月', pay: '10', cum: -40 }, { m: '第3月', pay: '10', cum: -50 }, { m: '第4月', pay: '10', cum: -60 },
    { m: '第5月', pay: '10', cum: -70 }, { m: '第6月', cum: -70 }, { m: '第7月', cum: -70 }, { m: '第8月', recv: '90', cum: 20 },
  ];
  const TB = { x: 70, y: 250, w: 870, row0: 438, rowH: 80 };
  const COLX = { m: 189, pay: 383, recv: 593, cum: 804 };      // 每一欄的中心
  const MINUS = '−';
  function cashTable(ctx, t) {
    const a = popIn(t, ev.table + 0.05, 0.35);
    if (a <= 0) return;
    const tPay = (k) => ev.pay + k * 0.24, tRecv = (k) => (k === 7 ? ev.recv + 0.5 : ev.recv + k * 0.05), tCum = (k) => ev.cum + k * 0.07;
    ctx.save(); ctx.translate(TB.x + TB.w / 2, TB.y); ctx.scale(a, a); ctx.translate(-(TB.x + TB.w / 2), -TB.y);
    const h = TB.row0 + 8 * TB.rowH + 34 - TB.y;
    KIT.card(ctx, TB.x, TB.y, TB.w, h, { fill: PAPER, seed: 2200 });
    G.text(ctx, '專案現金流試算表', TB.x + 34, TB.y + 76, { size: 50, fam: CJK, weight: 800, color: INK, boil: 0 });
    G.rrect(ctx, 720, TB.y + 34, 196, 54, 12, { fill: '#FFF1C9', lw: 3, seed: 2201 });
    label(ctx, '金額為示意', 818, TB.y + 73, 34, '#8E6444');
    stroke(ctx, [[TB.x + 30, TB.y + 106], [TB.x + TB.w - 30, TB.y + 106]], INK, 4);
    const hy = TB.y + 160;
    label(ctx, '月份', COLX.m, hy, 40, MUTED); label(ctx, '付出', COLX.pay, hy, 40, RED); label(ctx, '收入', COLX.recv, hy, 40, DGREEN); label(ctx, '累計', COLX.cum, hy, 40, INK);
    for (const x of [278, 488, 698]) { ctx.save(); ctx.setLineDash([6, 8]); stroke(ctx, [[x, TB.y + 120], [x, TB.row0 + 8 * TB.rowH]], '#D2C6AC', 2.5); ctx.restore(); }
    if (t >= tRecv(7)) { ctx.save(); ctx.globalAlpha *= 0.55 * clamp((t - tRecv(7)) / 0.3); fill(ctx, TB.x + 18, TB.row0 + 7 * TB.rowH + 4, TB.w - 36, TB.rowH - 8, 'rgba(140,224,150,0.6)'); ctx.restore(); }
    const worst = t >= ev.worst ? clamp((t - ev.worst) / 0.3) : 0;
    ROWS.forEach((r, k) => {
      const y0 = TB.row0 + k * TB.rowH, base = y0 + 54;
      if (k > 0) { ctx.save(); ctx.setLineDash([6, 8]); stroke(ctx, [[TB.x + 30, y0], [TB.x + TB.w - 30, y0]], '#D2C6AC', 2.5); ctx.restore(); }
      label(ctx, r.m, COLX.m, base, 42, INK);
      const cell = (str, x, t0, col, size = 48) => {
        if (t < t0) return;
        const p = ease.outBack(clamp((t - t0) / 0.25));
        ctx.save(); ctx.translate(x, base - 16); ctx.scale(p, p); ctx.translate(-x, -(base - 16));
        G.text(ctx, str, x, base, { size, fam: NUM, weight: 800, color: col, align: 'center', boil: 0 });
        ctx.restore();
      };
      const dash = (x, t0, fadeOut = 0) => { if (t < t0) return; ctx.save(); ctx.globalAlpha *= clamp((t - t0) / 0.15) * (1 - fadeOut); stroke(ctx, [[x - 18, base - 16], [x + 18, base - 16]], '#C9BFA8', 5); ctx.restore(); };
      if (r.pay) cell(r.pay, COLX.pay, tPay(k), RED); else dash(COLX.pay, ev.pay + 1.2 + (k - 5) * 0.06);
      const inWorst = k >= 4 && k <= 6;
      if (r.recv) cell(r.recv, COLX.recv, tRecv(k), DGREEN); else dash(COLX.recv, tRecv(k), inWorst ? worst : 0);
      cell(r.cum > 0 ? `+${r.cum}` : `${MINUS}${-r.cum}`, COLX.cum, tCum(k), r.cum > 0 ? DGREEN : RED);
    });
    // 最大缺口:第 5–7 月的累計圈起來(最低的那一格,就是公司要先墊的錢)
    if (worst > 0) {
      const y0 = TB.row0 + 4 * TB.rowH + 4, y1 = TB.row0 + 7 * TB.rowH - 4, k = ease.outBack(worst);
      ctx.save(); ctx.globalAlpha *= clamp(worst * 2);
      ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(704, y0, 202, (y1 - y0), 18); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(574, (y0 + y1) / 2); ctx.scale(k, k);
      G.rrect(ctx, -104, -38, 208, 76, 14, { fill: RED, lw: 4, seed: 2210 });
      label(ctx, '最大缺口', 0, 15, 42, '#FFFFFF');
      G.poly(ctx, [[104, -16], [128, 0], [104, 16]], { fill: RED, lw: 3, seed: 2211 });
      ctx.restore();
    }
    ctx.restore();
  }
  function tableShot(ctx, t) {
    KIT.cached(ctx, 'grid8', grid);
    cashTable(ctx, t);
    finish(ctx, { warm: 'rgba(255,230,180,0.10)', floor: 0.2, y0: 1250 });
  }

  // ---------- 10 結尾 ----------
  function closing(ctx, t) {
    fill(ctx, -300, -300, W + 600, H + 600, lin(ctx, 0, 0, 0, H, [[0, '#F8E6B8'], [1, '#E8C987']]));
    G.rays(ctx, 540, 900, { n: 14, r0: 120, r1: 1500, color: '#FCEFCB', alpha: 0.9, spin: t * 0.05 });
    const a = popIn(t, ev.card, 0.4);
    ctx.save(); ctx.translate(510, 300); ctx.rotate(-0.012); ctx.scale(a, a);
    G.tornPaper(ctx, -424, 0, 848, 430, { fill: PAPER, seed: 801 });
    twoTone(ctx, '賺不賺錢', '看利潤', 0, 160, 92, INK, '#8E6444');
    let under = null;
    if (t >= ev.line2) { const b = popIn(t, ev.line2, 0.3); ctx.save(); ctx.translate(0, 300); ctx.scale(b, b); under = twoTone(ctx, '活不活得下去', '看現金', 0, 30, 84, INK, RED); ctx.restore(); }
    if (under && t >= ev.line2 + 0.4) { const u = ease.outCubic(clamp((t - ev.line2 - 0.4) / 0.4)); stroke(ctx, KIT.partial([[under[0], 352], [under[1], 346]], u), RED, 9); }
    ctx.restore();
    person(ctx, { x: 270, y: 1376, s: 0.98, pose: 'stand', style: CAST.master, gesture: 'thumbsUp', eyes: 'happy', mouth: 'smile', blush: 0.5, seed: 440 });
    // 阿樹:拿著那張按月收支表
    const o = { x: 735, y: 1376, s: 0.95, pose: 'stand', style: CAST.shu, eyes: 'happy', mouth: 'grin', blush: 0.7, seed: 400 };
    const tb = [735, 1166 + Math.sin(t * 3) * 4];
    o.handL = hand(o.x, o.y, o.s, 1, tb[0] - 84, tb[1] + 48); o.handR = hand(o.x, o.y, o.s, 1, tb[0] + 84, tb[1] + 48);
    person(ctx, o);
    G.rrect(ctx, tb[0] - 110, tb[1] - 80, 220, 156, 8, { fill: PAPER, lw: 4, seed: 2301 });
    fill(ctx, tb[0] - 96, tb[1] - 66, 192, 20, '#4F7C6A');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { ctx.strokeStyle = '#C9BFA8'; ctx.lineWidth = 2.5; ctx.strokeRect(tb[0] - 96 + c * 64, tb[1] - 40 + r * 26, 64, 26); }
    ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(tb[0] + 64, tb[1] + 14, 40, 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    skinDot(ctx, tb[0] - 84, tb[1] + 48, 17); skinDot(ctx, tb[0] + 84, tb[1] + 48, 17);
    if (t >= ev.end) { const b = popIn(t, ev.end, 0.3); ctx.save(); ctx.translate(510, 1474); ctx.scale(b, b); label(ctx, '追蹤看更多現場故事', 0, 0, 66, '#FFFFFF', { stroke: INK, strokeW: 18 }); ctx.restore(); }
  }

  const film = Shots.film([
    { at: 0, draw: deskShot, cam: Shots.push(1.0, 1.04) },
    { at: ev.office, draw: bossScene, in: 'cut' },
    { at: ev.contract, draw: diagram, in: 'zoom' },
    { at: ev.stall, draw: stallShot, in: 'cut', cam: Shots.push(1.0, 1.04) },
    { at: ev.rest, draw: restShot, in: 'paper', cam: Shots.push(1.0, 1.03) },
    { at: ev.desk, draw: deskShot2, in: 'paper', cam: Shots.push(1.0, 1.05) },
    { at: ev.table, draw: tableShot, in: 'zoom' },
    { at: ev.card, draw: closing, in: 'flash' },
  ]);

  // ---------- 字幕:依標點切成短句,時間用 prep-voice 量到的停頓;display 的「|」= 強制換段 ----------
  function buildSubs(vo) {
    const out = [], PUN = /[,。?!:;、，？！：；]/;
    ((vo && vo.lines) || []).forEach((l, i) => {
      const ph = (globalThis.PH || [])[i], disp = l.display || l.text;
      const segs = []; let cur = '';
      const chars = [...disp];
      chars.forEach((ch, k) => { cur += ch; if (PUN.test(ch) && chars.slice(k + 1).some((c) => !PUN.test(c) && c !== '|')) { segs.push(cur); cur = ''; } });
      if (cur) segs.push(cur);
      const on = ph ? ph.on : 0, off = ph ? ph.off : l.end - l.t;
      const marks = ph && ph.marks.length === segs.length - 1 ? ph.marks : null;
      const clean = (s) => s.replace(/[,。、:;「」，：；|]/g, '').trim();
      const lens = segs.map((s) => clean(s).replace(/[?!？！]/g, '').length), tot = lens.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      segs.forEach((s, k) => {
        let s0, s1;
        if (marks) { s0 = k === 0 ? on : marks[k - 1].b; s1 = k === segs.length - 1 ? off : marks[k].a; }
        else { s0 = on + (off - on) * acc / tot; acc += lens[k]; s1 = on + (off - on) * acc / tot; }
        const sub = s.split('|').map(clean).filter(Boolean), st = sub.reduce((a, p) => a + p.length, 0) || 1;
        let a2 = 0;
        sub.forEach((p) => { const t0 = s0 + (s1 - s0) * a2 / st; a2 += p.length; out.push({ t: l.t + t0, end: l.t + s0 + (s1 - s0) * a2 / st, text: p }); });
      });
    });
    for (let k = 0; k + 1 < out.length; k++) { const gap = out[k + 1].t - out[k].end; out[k].end = gap < 0.7 ? out[k + 1].t : out[k].end + 0.3; }
    if (out.length) out[out.length - 1].end += 0.4;
    return out;
  }
  function drawSubs(ctx, t) {
    let cur = null;
    for (const s of SUBS) if (t >= s.t && t < s.end + 0.15) cur = s;
    if (cur) Subs.draw(ctx, t, [cur], { style: 'pop', size: 78, fam: CJK, highlight: '#FFD75E' });
  }

  Studio.film({
    post: { vignette: 0.22, grain: 0.04, paper: 0.35 },
    fadeOut: 0.9,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = buildSubs(VO); globalThis.__SUBS = SUBS; },
    draw(ctx, t) {
      film(ctx, t);
      if (t < A[12] - 0.1) drawSubs(ctx, t);
    },
  });
})();
