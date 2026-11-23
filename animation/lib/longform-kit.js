/* ============================================================================================
 * longform-kit.js — 工程現場故事 16:9 長片的共用畫風(L003 起每一個單元都用這一份)
 * --------------------------------------------------------------------------------------------
 * 純瀏覽器腳本:一個 IIFE,設定 globalThis.KIT。要放進單元資料夾(render 伺服器只給資料夾裡的檔案),
 * 在 index.html 裡排在 engine/video/boot.js 之後、film.js 之前。
 * 每一個函式都是「參數 + 時間 t」的純函式:不用 Math.random、Date.now;亂數一律 U.hash / G.rnd。
 * 座標一律是 1920×1080 舞台座標(G.W × G.H),左上角 (0, 0)。
 *
 * ── 常數 ──────────────────────────────────────────────────────────────────────────────────────
 * KIT.W, KIT.H, KIT.SAFE        畫面 1920×1080 與安全框 {x:54, y:54, w:1812, h:972}
 * KIT.CJK, KIT.NUM              中文字型堆疊;數字(表格金額)用 Inter,中文退回文泉驛
 * KIT.C                         調色盤 ink red green blue steel yellow orange paper cream gold …
 * KIT.L                         版面約定(見 LONGFORM.md):ground 地板線 900、scale 角色大小、
 *                               cap 字幕區、table 右側表格區、badge 角標、minText 最小字級 34 …
 *
 * ── 角色 ──────────────────────────────────────────────────────────────────────────────────────
 * KIT.CAST.{shu, shuSite, master, masterSite, masterRest, client, clientSite, crew, crewSite, boss}
 *   shu 阿樹(辦公室,沒帽子)· shuSite 阿樹(工地:黃色安全帽、扣好頤帶、反光背心)
 *   master 陳師傅(辦公室)· masterSite(工地:白色安全帽)· masterRest(休息區:不戴帽,帽子掛牆上)
 *   client 甲方承辦(西裝、包頭、圓眼鏡)· clientSite(訪客藍帽 + 黃綠背心,頭髮改綁馬尾)
 *   crew 工班班長 · crewSite(橘色安全帽)· boss 老闆(只在辦公室)
 * KIT.onSite(style, helmetColor, vest)  任何造型 → 工地版(安全帽 + 頤帶 + 背心)
 * KIT.person(ctx, o)            = Ch.person + style.headwear 'helmet'(含頤帶)+ style.vest 背心
 *                                 + o.harness {clip:[x,y]} 全身式安全帶,掛鉤扣在頭上方的錨點
 * KIT.hand(px, py, s, sx, wx, wy)  畫面座標 → 角色 handL/handR 的目標(角色自己的單位)
 * KIT.headPos(o)                角色頭中心的畫面座標(放皇冠、對話框、字卡要避開臉時用)
 *
 * ── 共用小工具 ────────────────────────────────────────────────────────────────────────────────
 * KIT.lin / KIT.rad(ctx, …, stops)    線性 / 放射漸層      KIT.fill(ctx, x, y, w, h, style)
 * KIT.mix(a, b, k) 兩色混合 · KIT.alpha(c, a) 加透明度 · KIT.shade(c, k) 變亮變暗
 * KIT.label(ctx, str, x, y, size, color, o)  中文字(粗體、置中、不抖)· KIT.measure(ctx, str, size, fam)
 * KIT.wrap(ctx, str, size, maxW, fam)  中文斷行(標點不放行首)
 * KIT.popIn(t, t0, d) 彈出(0 → 超過一點 → 1)· KIT.fadeIn(t, t0, d) · KIT.ease = U.ease
 * KIT.blink(t, seed) 眨眼 · KIT.mouth(VO, t, who, from) 對嘴(VO = out/voice.json;沒在講話回傳 null)
 * KIT.warm(ctx, o)               每個鏡頭最後一筆:左上暖光 + 底部壓暗(字幕更清楚)
 * KIT.stroke(ctx, pts, color, lw) 乾淨的筆畫 · KIT.tick(ctx, x, y, r, a) 綠底白勾 · KIT.cross(…) 紅叉
 * KIT.sparkle(ctx, x, y, r, a, rot) 閃光 · KIT.burst(ctx, x, y, r0, r1, a, n, color) 放射短線
 *
 * ── 背景(KIT.bg.*,畫滿整個畫面;靜態部分快取)────────────────────────────────────────────────
 * fab(ctx, t, {floor, top, pipeY, machines, cache})  廠房:H 型鋼柱、屋頂梁、頂上一排管線與吊架/支架、
 *                                                  機台一列、環氧地坪與黃色走道線。top < 0 = 很高的廠房(上搖用)
 * office(ctx, t, {night, clock, window})           小工程行辦公室(白天 / 晚上:窗外月亮、檯燈暖光)
 * clientOffice(ctx, t)                             甲方辦公室:冷色、大窗城市、玻璃隔間、植物
 * restArea(ctx, t)                                 休息區:護牆板、窗、「休息區」牌子、安全帽掛牆上
 * whiteboard(ctx, t, {box})                        工務所白板牆 → 回傳白板內框 {x,y,w,h}
 *
 * ── 道具 ──────────────────────────────────────────────────────────────────────────────────────
 * desk · monitor · keyboard · printer · lamp · wallClock(ctx, x, y, r, hours) · phone(ctx, …, screenFn)
 * chat(ctx, w, h, t, {title, msgs}) 通訊軟體畫面(不畫任何品牌)· stamp 蓋章 · shatter 字碎掉
 * crown 小皇冠 · envelope 信封 · cone 交通錐 · warnTape 警示帶 · extinguisher 滅火器
 * lift(ctx, x, y, s, h, o) 剪刀式高空作業車(護欄、錨點柱)· harness / lanyard / snapHook 安全帶
 *
 * ── 介面(整片一直用)──────────────────────────────────────────────────────────────────────────
 * KIT.card(ctx, x, y, w, h, o)         撕紙卡片(可加膠帶)
 * KIT.table(ctx, t, spec)              資料表:一列一列彈出、亮起(hi)、劃掉(strike)、放大(big)、
 *                                      裂開一條空白行(open + flash);格子可以是 (t) => 字串
 * KIT.checklist(ctx, t, spec)          勾選清單(check 打勾、cross 打叉)
 * KIT.chapterCard(ctx, t, t0, {n, title})  章卡,固定 KIT.CHAPTER = 1.2 秒
 * KIT.bubble(ctx, t, spec)             對話框 / 想法泡泡(think: true)
 * KIT.badge(ctx, t, {t0})              右上角常駐角標「金額皆為示意整數，非市場行情」
 * KIT.disclaimer(ctx, t, {t0, shrink}) 全螢幕字卡 → 縮成角標 → 之後一直是角標
 *
 * ── 字幕 ──────────────────────────────────────────────────────────────────────────────────────
 * KIT.buildCaptions(vo, {ph, maxChars}) 由 voice.json(+ durations.js 的 PH 停頓)切成一行一行的字幕:
 *                                      依標點切,「、」不切,短句合併,一行最多 maxChars 個全形字(預設 16)
 * KIT.drawCaption(ctx, t, caps)        畫在畫面底部安全框內(KIT.L.cap);旁白白字,角色台詞黃字
 * ============================================================================================ */
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Subs = globalThis.Subs, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const KIT = {};
  const W = G.W, H = G.H, SAFE = G.SAFE;
  KIT.W = W; KIT.H = H; KIT.SAFE = SAFE; KIT.ease = ease;
  KIT.CJK = '"WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif';
  KIT.NUM = '"Inter", "WenQuanYi Zen Hei", sans-serif';
  const CJK = KIT.CJK, NUM = KIT.NUM;
  const C = KIT.C = {
    ink: '#3A2A20', muted: '#7E7062', red: '#C8452F', green: '#3E9B5F', blue: '#2B5FA8', pipe: '#3F86C9',
    steel: '#D9DEE3', steelDark: '#8E99A3', yellow: '#F2C230', orange: '#F28C28', vest: '#F2772B', lime: '#C9DB3A',
    paper: '#FFFDF4', cream: '#FFF6D8', gold: '#E8B93A', hi: '#FFE27A', skin: '#F0C29C', white: '#FFFFFF',
  };
  // 版面約定(LONGFORM.md 有說明)
  KIT.L = {
    ground: 900,                              // 全景站姿的腳底線
    scale: { wide: 1.0, medium: 1.3, close: 2.2 }, // 角色大小:全景 / 中景 / 特寫(特寫腳在畫面外)
    faceFloor: 880,                           // 任何臉(下巴)都要在這條線以上:下面是字幕區
    cap: { y: 986, size: 54, maxChars: 16, top: 920 }, // 字幕基線、字級、一行最多幾個全形字、字幕區頂
    table: { x: 1040, y: 132, w: 800 },       // 右側表格區(「畫面右側跳出【表 1】」)
    badge: { size: 34 },                      // 右上角角標,貼齊安全框右上角
    minText: 34,                              // 畫面上任何字都不小於 34 px(手機看得到)
  };
  KIT.CHAPTER = 1.2;                          // 章卡秒數

  // ============================== 共用小工具 ==============================
  KIT.lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  KIT.rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  KIT.fill = (ctx, x, y, w, h, style) => { ctx.fillStyle = style; ctx.fillRect(x, y, w, h); };
  const lin = KIT.lin, rad = KIT.rad, fill = KIT.fill;
  const rgb = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  KIT.mix = (a, b, k) => { const p = rgb(a), q = rgb(b); const f = (i) => Math.round(p[i] + (q[i] - p[i]) * clamp(k)); return `rgb(${f(0)},${f(1)},${f(2)})`; };
  KIT.alpha = (c, a) => { const p = rgb(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  KIT.shade = (c, k) => Ch.shade(c, k);
  KIT.popIn = (t, t0, d = 0.3) => (t < t0 ? 0 : ease.outBack(clamp((t - t0) / d)));
  KIT.fadeIn = (t, t0, d = 0.25) => clamp((t - t0) / d);
  const popIn = KIT.popIn;
  KIT.blink = (t, seed = 0) => (((t * 0.37 + seed) % 1) > 0.965 ? 1 : 0);
  KIT.mouth = (vo, t, who, from = -Infinity) => { if (!vo || t < from) return null; const m = Subs.mouth(vo, t, who); return m && m.talking ? m : null; };
  KIT.hand = (px, py, s, sx, wx, wy) => [(wx - px) / (s * sx), (wy - py) / s];
  KIT.label = (ctx, str, x, y, size, color = C.ink, o = {}) => G.text(ctx, str, x, y, { size, fam: CJK, weight: 800, color, align: 'center', boil: 0, ...o });
  KIT.measure = (ctx, str, size, fam = CJK, weight = 800) => G.measure(ctx, str, size, fam, weight);
  const label = KIT.label, measure = KIT.measure;
  // 中文斷行:字與字之間都可以斷,英數字串不拆,標點不放在行首
  const NO_START = /[，。、？！：；」』）》〉…,.!?:;)]/;
  KIT.wrap = (ctx, str, size, maxW, fam = CJK) => {
    const toks = String(str).match(/[A-Za-z0-9.,%+×÷=\-~"'/]+|\s+|./gu) || [];
    const lines = []; let cur = '';
    for (const tk of toks) {
      if (cur && measure(ctx, (cur + tk).trimEnd(), size, fam) > maxW && !NO_START.test(tk[0]) && !/^\s+$/.test(tk)) {
        // 能斷在標點後面就斷在標點後面(那一行至少要有一半寬)
        const chars = [...cur]; let cut = -1;
        for (let i = chars.length - 1; i > 0; i--) if (/[，、：；。？！]/.test(chars[i]) && measure(ctx, chars.slice(0, i + 1).join(''), size, fam) >= maxW * 0.5) { cut = i + 1; break; }
        if (cut > 0 && cut < chars.length) { lines.push(chars.slice(0, cut).join('').trimEnd()); cur = chars.slice(cut).join('').trimStart() + tk; }
        else { lines.push(cur.trimEnd()); cur = tk.trimStart(); }
      } else cur += tk;
    }
    if (cur.trim()) lines.push(cur.trimEnd());
    return lines;
  };
  KIT.stroke = (ctx, pts, color, lw, alpha = 1) => {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  };
  const stroke = KIT.stroke;
  // 綠底白勾(a = 0..1 的彈出大小);draw = 0..1 只畫出勾的一部分
  KIT.tick = (ctx, x, y, r, a = 1, { seed = 50, color = C.green, draw = 1 } = {}) => {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    G.ellipse(ctx, 0, 0, r, r, { fill: color, lw: 4, seed, amp: 0.4 });
    const P = [[-r * 0.5, 0], [-r * 0.14, r * 0.38], [r * 0.52, -r * 0.4]];
    stroke(ctx, partial(P, draw), '#FFFFFF', r * 0.28);
    ctx.restore();
  };
  KIT.cross = (ctx, x, y, r, a = 1, { color = C.red, lw = 14 } = {}) => {
    if (a <= 0) return;
    const k = clamp(a * 2), k2 = clamp(a * 2 - 1);
    stroke(ctx, [[x - r, y - r], [x - r + 2 * r * k, y - r + 2 * r * k]], color, lw);
    if (k2 > 0) stroke(ctx, [[x + r, y - r], [x + r - 2 * r * k2, y - r + 2 * r * k2]], color, lw);
  };
  // 折線只畫出前面 u(0..1)的部分
  function partial(P, u) {
    if (u >= 1) return P;
    const L = []; let tot = 0;
    for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
    let left = tot * clamp(u); const out = [P[0]];
    for (let i = 1; i < P.length && left > 0; i++) {
      const d = L[i - 1], k = Math.min(1, left / d);
      out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k]); left -= d;
    }
    return out;
  }
  KIT.partial = partial;
  KIT.sparkle = (ctx, x, y, r, a = 1, rot = 0, color = '#FFF4B0') => {
    if (a <= 0 || r <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
    ctx.fillStyle = color; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4, rr = k % 2 ? r * 0.32 : r; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  KIT.burst = (ctx, x, y, r0, r1, a = 1, n = 8, color = C.red, lw = 8, rot = 0.3) => {
    if (a <= 0) return;
    for (let j = 0; j < n; j++) { const an = j * Math.PI * 2 / n + rot; stroke(ctx, [[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * r1, y + Math.sin(an) * r1]], color, lw, a); }
  };
  // 每個鏡頭最後一筆:左上暖光,底部壓暗一點(字幕區更好讀)
  KIT.warm = (ctx, { color = 'rgba(255,214,140,0.16)', x = 320, y = 140, r = 1900, floor = 0.24 } = {}) => {
    fill(ctx, -300, -300, W + 600, H + 600, rad(ctx, x, y, 60, r, [[0, color], [1, 'rgba(255,214,140,0)']]));
    if (floor > 0) fill(ctx, -300, 760, W + 600, 700, lin(ctx, 0, 760, 0, H, [[0, 'rgba(30,22,18,0)'], [1, `rgba(30,22,18,${floor})`]]));
  };
  // 一團光(放射漸層剛好填滿整個圓,不會出現方形的邊)
  const clear = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (m) { const p = m[1].split(',').slice(0, 3).map((v) => v.trim()); return `rgba(${p.join(',')},0)`; } return KIT.alpha(c, 0); };
  KIT.glow = (ctx, x, y, r, color, a = 1) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; fill(ctx, x - r, y - r, 2 * r, 2 * r, rad(ctx, x, y, 0, r, [[0, color], [1, clear(color)]])); ctx.restore(); };
  // 靜態背景快取(同一組參數只畫三次:三種鉛筆抖動輪流用)
  KIT.cached = (ctx, key, drawFn) => ctx.drawImage(Studio.cache(key, drawFn), 0, 0, W, H);

  // ============================== 角色 ==============================
  const SKIN = C.skin;
  const SHU = { outfit: 'tee', shirt: '#F7F3EA', bottoms: 'pants', shorts: '#4F5B6B', pants: '#4F5B6B', skin: SKIN, hair: '#241C1A', hairStyle: 'quiff', build: 'slim', shoes: '#F4F1EA' };
  const MASTER = { outfit: 'shirt', shirt: '#7A9A6C', bottoms: 'pants', shorts: '#5A4A3C', pants: '#5A4A3C', skin: '#E6B48C', hair: '#8C8C8C', hairStyle: 'short', glasses: 'round', facialHair: 'mustache', build: 'broad', shoes: '#3A2E28' };
  const CLIENT = { outfit: 'suit', robe: '#6B5470', trim: '#D9A441', shirt: '#FFFFFF', bottoms: 'pants', shorts: '#4A3A50', pants: '#4A3A50', skin: '#F4CDAE', hair: '#4A2E20', hairStyle: 'bun', glasses: 'round', build: 'slim', shoes: '#2A2220' };
  const CREW = { outfit: 'tee', shirt: '#5E6A78', bottoms: 'pants', shorts: '#3A3F4A', pants: '#3A3F4A', skin: '#C98A62', hair: '#1E1A18', hairStyle: 'buzz', facialHair: 'stubble', build: 'broad', shoes: '#3A2E28' };
  const BOSS = { outfit: 'tee', shirt: '#2F4B6E', bottoms: 'pants', shorts: '#B8A27E', pants: '#B8A27E', skin: '#E3B58E', hair: '#3A3432', hairStyle: 'short', facialHair: 'stubble', build: 'heavy', shoes: '#2A2220' };
  KIT.HELMET = { shu: C.yellow, master: '#F4F4F0', client: '#3F7FBF', crew: '#E9853B' };
  KIT.onSite = (style, helmetColor, vest = true) => ({ ...style, headwear: 'helmet', headwearColor: helmetColor, vest });
  KIT.CAST = {
    shu: SHU,                                                   // 阿樹:辦公室
    shuSite: KIT.onSite(SHU, KIT.HELMET.shu),                   // 阿樹:工地(黃帽)
    master: MASTER,                                             // 陳師傅:辦公室、工務所
    masterSite: KIT.onSite(MASTER, KIT.HELMET.master),          // 陳師傅:工地(白帽)
    masterRest: MASTER,                                         // 陳師傅:休息區(帽子掛在牆上,bg.restArea 有畫)
    client: CLIENT,                                             // 甲方承辦:甲方辦公室
    clientSite: { ...KIT.onSite(CLIENT, KIT.HELMET.client, C.lime), hairStyle: 'ponytail' }, // 甲方承辦:會勘(訪客藍帽)
    crew: CREW,                                                 // 工班班長
    crewSite: KIT.onSite(CREW, KIT.HELMET.crew),                // 工班班長:工地(橘帽)
    boss: BOSS,                                                 // 老闆:只在辦公室
  };
  globalThis.CAST = KIT.CAST; // render.js cast 會用到

  // 安全帽:帽殼 + 中央肋 + 帽簷 + 頤帶(扣在下巴)。接在 Ch.headwear 上,headwear: 'helmet' 就會畫
  function helmet(ctx, st, seed) {
    const c = st.headwearColor || C.yellow, dk = Ch.shade(c, 0.8);
    // 頤帶:從帽緣沿著臉頰到下巴,側邊一個扣環
    const strap = [[-64, -50], [-61, -8], [-55, 28], [-40, 54], [-18, 69], [0, 73], [18, 69], [40, 54], [55, 28], [61, -8], [64, -50]];
    stroke(ctx, strap, '#2E3036', 8);
    stroke(ctx, strap, '#5B606B', 4);
    G.rrect(ctx, -10, 66, 20, 13, 4, { fill: '#2E3036', lw: 2, seed: seed + 231, amp: 0.2 }); // 扣環在下巴正下方
    // 帽殼
    const dome = []; for (let k = 0; k <= 18; k++) { const a = Math.PI + Math.PI * k / 18; dome.push([Math.cos(a) * 75, -52 + Math.sin(a) * 68]); }
    G.shape(ctx, dome, { fill: c, lw: 4.5, seed: seed + 232, hatch: { color: 'rgba(0,0,0,0.07)', gap: 7 } });
    G.rrect(ctx, -11, -118, 22, 66, 9, { fill: Ch.shade(c, 1.06), lw: 3, seed: seed + 233, amp: 0.5 }); // 中央肋
    G.rrect(ctx, -92, -60, 184, 15, 7, { fill: dk, lw: 4, seed: seed + 234 });                         // 帽簷
    stroke(ctx, [[-52, -88], [-34, -104]], 'rgba(255,255,255,0.65)', 7);                                // 反光
  }
  const baseHeadwear = Ch.headwear;
  Ch.headwear = (ctx, st, seed = 1) => (st.headwear === 'helmet' ? helmet(ctx, st, seed) : baseHeadwear(ctx, st, seed));

  // 反光背心(畫在衣服細節之後、脖子與手臂之前,所以口袋、鈕扣會被蓋住)
  const BW = { slim: 0.86, regular: 1, broad: 1.18, heavy: 1.3 };
  function vest(ctx, sh, hip, bw, seed, col) {
    const v = typeof col === 'string' ? col : C.vest;
    for (const sd of [-1, 1]) G.poly(ctx, [[sd * 77 * bw, sh + 3], [sd * 28, sh + 3], [sd * 8, sh + 74], [sd * 8, hip + 9], [sd * 73 * bw, hip + 9]], { fill: v, lw: 4, seed: seed + 900 + sd, step: 20 });
    for (const yy of [sh + 104, hip - 22]) for (const sd of [-1, 1]) G.line(ctx, [[sd * 13, yy], [sd * 70 * bw, yy]], { color: '#F4F6F2', lw: 12, seed: seed + 904 + sd + yy, amp: 0.4 });
  }
  const hipOf = (o) => (['sit', 'floor'].includes(o.pose || 'sit') ? 0 : -150);
  const bobOf = (o) => (o.pose === 'walk' ? -Math.abs(Math.sin(2 * Math.PI * (o.walk || 0))) * 12 * (o.s || 1) : 0);
  // 角色身上的點(角色自己的單位)→ 畫面座標
  KIT.world = (o, lx, ly) => { const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r), k = o.s || 1; return [o.x + k * (o.sx || 1) * (lx * c - ly * s), o.y + bobOf(o) + k * (o.sy || 1) * (lx * s + ly * c)]; };
  KIT.headPos = (o) => KIT.world(o, o.headX || 0, hipOf(o) - 172 - 82 + (o.headY || 0));
  KIT.person = (ctx, o) => {
    const st = o.style || {}, seed = o.seed == null ? 300 : o.seed;
    if (o.harness && o.harness.clip) KIT.lanyard(ctx, o, o.harness.clip);
    if (st.vest) {
      // Ch.person 畫脖子(G.rrect,seed + 19)的前一刻插進背心:軀幹與衣服細節之後、脖子/頭/手臂之前
      const hip = hipOf(o), sh = hip - 172, orig = G.rrect;
      let done = false;
      G.rrect = function (c, x, y, w, h, r, op) {
        if (!done && op && op.seed === seed + 19) { done = true; G.rrect = orig; vest(c, sh, hip, BW[st.build] || 1, seed, st.vest); }
        return orig.apply(G, arguments);
      };
      try { Ch.person(ctx, o); } finally { G.rrect = orig; }
    } else Ch.person(ctx, o);
    if (o.harness) KIT.harness(ctx, o);
  };

  // 全身式安全帶(肩帶、胸帶、腰帶、腿環)
  function local(ctx, o, fn) { ctx.save(); ctx.translate(o.x, o.y + bobOf(o)); ctx.scale((o.s || 1) * (o.sx || 1), (o.s || 1) * (o.sy || 1)); ctx.rotate(o.rot || 0); fn(); ctx.restore(); }
  KIT.harness = (ctx, o) => {
    const bw = BW[(o.style || {}).build] || 1, hip = hipOf(o), sh = hip - 172, seated = hip === 0, sd0 = o.seed || 0;
    const col = (o.harness && o.harness.color) || '#2B3A5C'; // 深藍織帶:穿在橘色背心外面也看得清楚
    const strap = (pts, lw, k) => G.limb(ctx, pts, { color: col, lw, outline: 3, seed: sd0 + 920 + k });
    local(ctx, o, () => {
      if (!seated) for (const sd of [-1, 1]) { strap([[sd * 62 * bw, hip - 28], [sd * 60, hip + 52]], 9, 1 + sd); strap([[sd * 16, hip + 44], [sd * 60, hip + 56]], 10, 4 + sd); }
      for (const sd of [-1, 1]) strap([[sd * 46 * bw, sh + 4], [sd * 34 * bw, sh + 84], [sd * 42 * bw, hip - 32]], 12, 7 + sd);
      strap([[-36 * bw, sh + 78], [36 * bw, sh + 78]], 10, 10);
      strap([[-74 * bw, hip - 30], [74 * bw, hip - 30]], 14, 11);
      G.rrect(ctx, -9, sh + 68, 18, 20, 3, { fill: '#D9DEE3', lw: 3, seed: sd0 + 932 });
      G.rrect(ctx, -13, hip - 42, 26, 24, 4, { fill: '#D9DEE3', lw: 3, seed: sd0 + 933 });
    });
  };
  // 安全掛鉤:原點 = 接織帶的孔,鉤身朝 +y
  KIT.snapHook = (ctx, x, y, rot, s) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const body = () => { ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(-12, 60); ctx.arc(8, 64, 20, Math.PI, -0.3 * Math.PI, true); };
    const gate = () => { ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(20, 46); };
    ctx.strokeStyle = C.ink; ctx.lineWidth = 15; body(); ctx.stroke(); ctx.lineWidth = 11; gate(); ctx.stroke();
    ctx.strokeStyle = '#C3CAD2'; ctx.lineWidth = 9; body(); ctx.stroke();
    ctx.strokeStyle = '#E9A23B'; ctx.lineWidth = 5.5; gate(); ctx.stroke();
    ctx.fillStyle = '#C3CAD2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  // 掛繩:背後 D 環 → 掛鉤扣在 clip(錨點,要在肩膀以上)
  KIT.lanyard = (ctx, o, clip) => {
    const B = KIT.world(o, 0, hipOf(o) - 172 + 30), R = clip, k = o.s || 1;
    const dx = R[0] - B[0], dy = R[1] - B[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const hs = 0.62 * k, rot = Math.atan2(uy, ux) - Math.PI / 2;
    const ex = R[0] - ux * 80 * hs, ey = R[1] - uy * 80 * hs, mx = (B[0] + ex) / 2 + uy * 14 * k, my = (B[1] + ey) / 2 - ux * 14 * k;
    G.limb(ctx, [B, [mx, my], [ex, ey]], { color: '#FFD84A', lw: 9 * k, outline: 3, seed: 941 });
    KIT.snapHook(ctx, ex, ey, rot, hs);
  };

  // ============================== 背景 ==============================
  function floorLines(ctx, col, seed, fy, vx = W / 2) {
    G.line(ctx, [[-40, fy], [W + 40, fy]], { color: C.ink, lw: 5, seed });
    for (let k = 1; k < 5; k++) { const y = fy + 18 * k * k + 16 * k; G.line(ctx, [[-40, y], [W + 40, y]], { color: col, lw: 3, seed: seed + k, alpha: 0.4 }); }
    for (let k = -7; k <= 7; k++) G.line(ctx, [[vx + k * 190, fy + 4], [vx + k * 420, H + 220]], { color: col, lw: 3, seed: seed + 20 + k, alpha: 0.28 });
  }
  KIT.floorLines = floorLines;
  KIT.bg = {};
  // ---- 廠房 ----
  function machine(ctx, x, fy, w, h, seed, tone = '#CDD6DE') {
    G.rrect(ctx, x, fy - h, w, h, 12, { fill: tone, lw: 5, seed, hatch: { color: 'rgba(60,80,100,0.07)', gap: 9 } });
    G.rrect(ctx, x - 4, fy - h - 4, w + 8, 34, 8, { fill: '#7F8B96', lw: 4, seed: seed + 20 });             // 上框
    G.rrect(ctx, x - 6, fy - 30, w + 12, 30, 6, { fill: '#5C6470', lw: 4, seed: seed + 1 });               // 底座
    ctx.save(); ctx.beginPath(); ctx.rect(x - 6, fy - 30, w + 12, 30); ctx.clip();                          // 底座黃黑警示條
    for (let k = -2; k < w / 26 + 2; k++) G.poly(ctx, [[x + k * 26, fy], [x + k * 26 + 13, fy], [x + k * 26 + 33, fy - 30], [x + k * 26 + 20, fy - 30]], { fill: C.yellow, lw: 0, seed: seed + 30 + k, amp: 0.3 });
    ctx.restore();
    G.rrect(ctx, x + w * 0.1, fy - h + 52, w * 0.42, h * 0.3, 8, { fill: '#2F3A44', lw: 4, seed: seed + 2 }); // 螢幕(不畫字)
    for (let k = 0; k < 3; k++) fill(ctx, x + w * 0.13, fy - h + 70 + k * 20, w * (0.2 + 0.1 * (k % 2)), 7, 'rgba(120,200,255,0.55)');
    for (let k = 0; k < 4; k++) G.line(ctx, [[x + w * 0.62, fy - h + 64 + k * 22], [x + w * 0.88, fy - h + 64 + k * 22]], { color: '#9AA6B1', lw: 5, seed: seed + 5 + k, amp: 0.4 }); // 散熱孔
    G.rrect(ctx, x + w * 0.1, fy - h * 0.44, w * 0.8, h * 0.3, 8, { fill: Ch.shade(tone, 0.92), lw: 3.5, seed: seed + 10 }); // 門
    G.rrect(ctx, x + w * 0.78, fy - h * 0.34, 12, h * 0.1, 4, { fill: '#5C6470', lw: 2.5, seed: seed + 21 });              // 門把
    // 狀態燈塔
    const lx = x + w - 34;
    G.rrect(ctx, lx - 4, fy - h - 70, 8, 20, 2, { fill: '#6C7680', lw: 2.5, seed: seed + 11 });
    ['#E25A4A', '#F2C230', '#56B870'].forEach((c, k) => G.rrect(ctx, lx - 12, fy - h - 120 + k * 17, 24, 17, 4, { fill: c, lw: 2.5, seed: seed + 12 + k, amp: 0.3 }));
  }
  function pipeRun(ctx, x0, x1, y, th, color, seed) {
    G.rrect(ctx, x0, y - th / 2, x1 - x0, th, th * 0.45, { fill: color, lw: 4, seed });
    G.line(ctx, [[x0 + 8, y - th * 0.2], [x1 - 8, y - th * 0.2]], { color: '#FFFFFF', lw: 3.5, seed: seed + 1, alpha: 0.6, amp: 0.4 });
  }
  KIT.pipeRun = pipeRun;
  function drawFab(ctx, o) {
    const fy = o.floor, top = o.top, py = o.pipeY;
    fill(ctx, -300, top - 400, W + 600, fy - top + 400, lin(ctx, 0, top, 0, fy, [[0, '#C3CED7'], [1, '#E2E8ED']]));
    for (let x = 60; x < W; x += 240) G.line(ctx, [[x, top + 60], [x, fy - 4]], { color: '#B9C4CD', lw: 3, seed: 3000 + x, alpha: 0.55 }); // 牆板接縫
    // 屋頂梁與桁架
    G.rrect(ctx, -40, top + 10, W + 80, 44, 0, { fill: '#8E99A3', lw: 5, seed: 3010 });
    for (let k = 0; k < 12; k++) { const x = -40 + k * 180; G.line(ctx, [[x, top + 54], [x + 90, top + 10]], { color: '#8E99A3', lw: 6, seed: 3011 + k }); G.line(ctx, [[x + 90, top + 10], [x + 180, top + 54]], { color: '#8E99A3', lw: 6, seed: 3030 + k }); }
    G.rrect(ctx, -40, top - 40, W + 80, 54, 0, { fill: '#A7B2BC', lw: 5, seed: 3050 });
    // H 型鋼柱
    for (const cx of o.columns) {
      G.rrect(ctx, cx - 38, top + 40, 76, fy - top - 40, 3, { fill: '#AEB9C3', lw: 5, seed: 3100 + cx });
      for (const sx of [-24, 24]) G.line(ctx, [[cx + sx, top + 60], [cx + sx, fy - 10]], { color: '#8E99A3', lw: 4, seed: 3101 + cx + sx, alpha: 0.8 });
      G.rrect(ctx, cx - 54, fy - 18, 108, 18, 3, { fill: '#8E99A3', lw: 4, seed: 3103 + cx }); // 柱腳
    }
    // 頂上一排管線:吊桿 + 槽鋼橫擔(吊架),柱上的 L 型支架
    const pipes = [['#D9DEE3', 0, 30], ['#F2C230', 50, 24], ['#D9DEE3', 92, 30], ['#6FA287', 140, 26]];
    for (const hx of o.hangers) {
      for (const sx of [-70, 70]) G.line(ctx, [[hx + sx, top + 54], [hx + sx, py + 172]], { color: '#5C6470', lw: 5, seed: 3200 + hx + sx }); // 吊桿(全牙螺桿)
      G.rrect(ctx, hx - 96, py + 160, 192, 18, 3, { fill: '#7F8B96', lw: 4, seed: 3204 + hx });   // 槽鋼橫擔
      for (const sx of [-70, 70]) G.rrect(ctx, hx + sx - 9, py + 154, 18, 10, 2, { fill: '#5C6470', lw: 2.5, seed: 3206 + hx + sx }); // 螺帽
    }
    for (const cx of o.columns) { // 柱上的托架:管線從上面經過
      G.rrect(ctx, cx - 70, py + 156, 140, 16, 3, { fill: '#7F8B96', lw: 4, seed: 3220 + cx });
      for (const sd of [-1, 1]) G.line(ctx, [[cx + sd * 66, py + 172], [cx + sd * 40, py + 232]], { color: '#7F8B96', lw: 8, seed: 3222 + cx + sd });
    }
    pipes.forEach(([c, dy, th], k) => {
      pipeRun(ctx, -40, W + 40, py + dy, th, c, 3240 + k * 7);
      for (const hx of o.hangers) for (const sx of [-34, 34]) G.rrect(ctx, hx + sx - 7, py + dy - th / 2 - 6, 14, th + 12, 3, { fill: '#6C7680', lw: 3, seed: 3260 + k * 13 + hx + sx }); // 管夾
    });
    // 地坪
    fill(ctx, -300, fy, W + 600, 800, lin(ctx, 0, fy, 0, H + 200, [[0, '#BCCAC4'], [1, '#93A29D']]));
    floorLines(ctx, '#6C7A75', 3300, fy);
    G.rrect(ctx, -40, fy + 146, W + 80, 18, 0, { fill: C.yellow, lw: 0, seed: 3320, alpha: 0.85 }); // 走道線(在字幕區下面)
    // 機台一列(靠牆)
    if (o.machines) o.machines.forEach(([x, w, h], k) => machine(ctx, x, fy - 6, w, h, 3400 + k * 30));
  }
  KIT.bg.fab = (ctx, t, o = {}) => {
    const opt = { floor: KIT.L.ground, top: 0, pipeY: 96, columns: [150, 960, 1770], hangers: [560, 1360], machines: [[260, 300, 290], [600, 300, 250], [1060, 320, 280], [1420, 300, 250]], ...o };
    if (opt.cache === false || opt.top !== 0) drawFab(ctx, opt);
    else KIT.cached(ctx, 'fab|' + JSON.stringify(opt), (x) => drawFab(x, opt));
  };
  // ---- 小工程行辦公室(白天 / 晚上)----
  function drawOffice(ctx, o) {
    const fy = o.floor, night = o.night;
    fill(ctx, -300, -300, W + 600, fy + 300, lin(ctx, 0, 0, 0, fy, night ? [[0, '#4A4C66'], [1, '#5C5A70']] : [[0, '#F1E8D8'], [1, '#E6DAC4']]));
    G.rrect(ctx, -40, fy - 120, W + 80, 120, 0, { fill: night ? '#5A5468' : '#D7C6A8', lw: 4, seed: 4001 }); // 踢腳護牆
    // 窗
    const [wx, wy, ww, wh] = o.window;
    G.rrect(ctx, wx - 16, wy - 16, ww + 32, wh + 32, 10, { fill: night ? '#6A6A86' : '#FFFFFF', lw: 6, seed: 4010 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    fill(ctx, wx, wy, ww, wh, lin(ctx, 0, wy, 0, wy + wh, night ? [[0, '#141A33'], [1, '#2B3566']] : [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    for (let k = 0; k < 6; k++) { const bx = wx + 20 + k * (ww / 6), bh = 90 + (k * 53) % 120; G.rrect(ctx, bx, wy + wh - bh, ww / 7, bh + 10, 3, { fill: night ? '#232A4A' : '#B4D3E2', lw: 0, seed: 4020 + k, alpha: 0.9 }); if (night) for (let j = 0; j < 3; j++) fill(ctx, bx + 12 + (j % 2) * 26, wy + wh - bh + 18 + j * 26, 12, 12, 'rgba(255,220,140,0.7)'); }
    if (night) G.ellipse(ctx, wx + ww * 0.74, wy + wh * 0.38, 40, 40, { fill: '#F6F1D5', lw: 0, seed: 4030 });
    else G.rrect(ctx, wx + ww * 0.55, wy + 50, 150, 40, 20, { fill: '#FFFFFF', lw: 0, seed: 4031, alpha: 0.9 });
    ctx.restore();
    G.line(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], { color: night ? '#6A6A86' : '#FFFFFF', lw: 12, seed: 4032 });
    for (let k = 0; k < 5; k++) G.line(ctx, [[wx, wy + 14 + k * 16], [wx + ww, wy + 14 + k * 16]], { color: night ? '#3A3A55' : '#E8E0D0', lw: 9, seed: 4033 + k }); // 拉起來的百葉
    // 書架與檔案夾(不寫字)
    const sx = o.shelf;
    if (sx != null) {
      G.rrect(ctx, sx, 170, 440, 330, 6, { fill: night ? '#6E5A48' : '#B98A5E', lw: 5, seed: 4040 });
      for (const sy of [180, 342]) { G.rrect(ctx, sx + 12, sy, 416, 148, 3, { fill: night ? '#4E4038' : '#8E6444', lw: 3, seed: 4041 + sy }); const cols = ['#C8452F', '#2B5FA8', '#3E9B5F', '#E9A23B', '#7C6BB0', '#4FA3A8', '#D0605A']; for (let k = 0; k < 9; k++) { const bw = 30 + (k * 7) % 14, bh = 118 - (k * 13) % 26; G.rrect(ctx, sx + 22 + k * 44, sy + 148 - bh, bw, bh, 4, { fill: night ? Ch.shade(cols[k % 7], 0.6) : cols[k % 7], lw: 3, seed: 4050 + k + sy, amp: 0.5 }); G.rrect(ctx, sx + 22 + k * 44 + bw * 0.25, sy + 148 - bh + 16, bw * 0.5, 22, 3, { fill: night ? '#B0A898' : '#FFFDF4', lw: 2, seed: 4070 + k + sy, amp: 0.3 }); } }
    }
    // 月曆(只有格子)
    if (o.calendar) { const [cx, cy] = o.calendar; G.rrect(ctx, cx, cy, 200, 170, 6, { fill: night ? '#B0A898' : '#FFFDF4', lw: 4, seed: 4090 }); G.rrect(ctx, cx, cy, 200, 42, 6, { fill: night ? '#8A3A2E' : C.red, lw: 4, seed: 4091 }); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) G.rrect(ctx, cx + 14 + c * 36, cy + 56 + r * 36, 26, 24, 3, { fill: night ? '#9A9282' : '#EDE3CC', lw: 2, seed: 4092 + r * 5 + c, amp: 0.3 }); }
    // 盆栽
    if (o.plant != null) { const px = o.plant; G.poly(ctx, [[px - 44, fy - 120], [px + 44, fy - 120], [px + 34, fy - 30], [px - 34, fy - 30]], { fill: night ? '#7A5444' : '#C77B55', lw: 4, seed: 4100 }); for (let k = 0; k < 6; k++) { const an = -Math.PI / 2 + (k - 2.5) * 0.36; G.ellipse(ctx, px + Math.cos(an) * 70, fy - 150 + Math.sin(an) * 80, 26, 50, { fill: night ? '#3E6A50' : '#5FA371', lw: 3.5, seed: 4101 + k }); } }
    // 地板
    fill(ctx, -300, fy, W + 600, 800, lin(ctx, 0, fy, 0, H + 200, night ? [[0, '#5C566C'], [1, '#3E3A50']] : [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, night ? '#2F2C3E' : '#7E735F', 4200, fy);
  }
  KIT.bg.office = (ctx, t, o = {}) => {
    const opt = { floor: 860, night: false, window: [140, 140, 560, 380], shelf: 1380, calendar: [790, 210], plant: 1830, ...o };
    const key = { ...opt }; delete key.clock;
    KIT.cached(ctx, 'office|' + JSON.stringify(key), (x) => drawOffice(x, opt));
    if (opt.night) { // 星星閃爍、窗外的光
      const [wx, wy, ww, wh] = opt.window;
      for (let k = 0; k < 9; k++) { ctx.save(); ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 2.6 + k * 1.7); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(wx + 30 + G.rnd(k, 3) * (ww - 60), wy + 24 + G.rnd(k, 4) * wh * 0.4, 3, 0, 7); ctx.fill(); ctx.restore(); }
    }
    if (opt.clock) KIT.wallClock(ctx, opt.clock[0], opt.clock[1], opt.clock[2], opt.clock[3], { night: opt.night });
  };
  // ---- 甲方辦公室 ----
  function drawClient(ctx, o) {
    const fy = o.floor;
    fill(ctx, -300, -300, W + 600, fy + 300, lin(ctx, 0, 0, 0, fy, [[0, '#E3EAF0'], [1, '#D3DDE5']]));
    // 大窗 + 城市
    G.rrect(ctx, 520, 90, 1300, 460, 8, { fill: '#F4F7FA', lw: 6, seed: 5001 });
    ctx.save(); ctx.beginPath(); ctx.rect(536, 106, 1268, 428); ctx.clip();
    fill(ctx, 536, 106, 1268, 428, lin(ctx, 0, 106, 0, 534, [[0, '#A9D4EE'], [1, '#E6F3FA']]));
    for (let k = 0; k < 11; k++) { const bx = 540 + k * 118, bh = 130 + (k * 71) % 190; G.rrect(ctx, bx, 534 - bh, 92, bh + 10, 3, { fill: k % 2 ? '#B9D2DF' : '#C7DCE7', lw: 0, seed: 5010 + k }); for (let j = 0; j < Math.floor(bh / 44); j++) fill(ctx, bx + 16, 534 - bh + 18 + j * 44, 60, 14, 'rgba(255,255,255,0.55)'); }
    ctx.restore();
    for (const vx of [950, 1380]) G.line(ctx, [[vx, 106], [vx, 534]], { color: '#F4F7FA', lw: 12, seed: 5030 + vx });
    // 玻璃隔間(左)+ 霧面帶
    G.rrect(ctx, 40, 120, 400, fy - 120, 4, { fill: 'rgba(205,228,240,0.55)', lw: 5, seed: 5040 });
    fill(ctx, 46, 380, 388, 70, 'rgba(255,255,255,0.65)');
    G.line(ctx, [[240, 120], [240, fy]], { color: '#8E99A3', lw: 6, seed: 5041 });
    // 植物
    const px = 1840; G.rrect(ctx, px - 46, fy - 130, 92, 110, 10, { fill: '#F4F7FA', lw: 4, seed: 5050 });
    for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (k - 3) * 0.33; G.ellipse(ctx, px + Math.cos(an) * 74, fy - 175 + Math.sin(an) * 86, 24, 54, { fill: '#4E9A62', lw: 3.5, seed: 5051 + k }); }
    // 頂燈
    for (const lx of [700, 1300]) G.rrect(ctx, lx - 160, 30, 320, 18, 8, { fill: '#FFFFFF', lw: 3, seed: 5060 + lx });
    fill(ctx, -300, fy, W + 600, 800, lin(ctx, 0, fy, 0, H + 200, [[0, '#C9D2D9'], [1, '#A9B4BD']]));
    floorLines(ctx, '#8592A0', 5100, fy);
  }
  KIT.bg.clientOffice = (ctx, t, o = {}) => { const opt = { floor: 860, ...o }; KIT.cached(ctx, 'client|' + JSON.stringify(opt), (x) => drawClient(x, opt)); };
  // ---- 休息區(不是施工現場:可以脫帽、可以喝茶)----
  function hungHelmet(ctx, x, y, col, seed) {
    G.line(ctx, [[x, y - 58], [x, y - 34]], { color: '#6C7680', lw: 8, seed });
    const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + Math.PI * k / 12; pts.push([x + Math.cos(a) * 54, y + Math.sin(a) * 48]); }
    G.shape(ctx, pts, { fill: col, lw: 4, seed: seed + 1 });
    G.rrect(ctx, x - 9, y - 50, 18, 48, 7, { fill: Ch.shade(col, 1.06), lw: 3, seed: seed + 3 }); // 中央肋
    G.rrect(ctx, x - 68, y - 6, 136, 16, 8, { fill: Ch.shade(col, 0.8), lw: 4, seed: seed + 2 });
    stroke(ctx, [[x - 50, y + 10], [x - 36, y + 56], [x, y + 70], [x + 36, y + 56], [x + 50, y + 10]], '#3A3D44', 5); // 垂下來的頤帶
  }
  KIT.hungHelmet = hungHelmet;
  function drawRest(ctx, o) {
    const fy = o.floor;
    fill(ctx, -300, -300, W + 600, fy + 300, lin(ctx, 0, 0, 0, fy, [[0, '#F3E6CB'], [1, '#EAD7B4']]));
    G.rrect(ctx, -40, fy - 300, W + 80, 300, 0, { fill: '#D2B58A', lw: 5, seed: 6001 });
    for (let k = 0; k < 14; k++) G.line(ctx, [[60 + k * 140, fy - 294], [60 + k * 140, fy - 4]], { color: '#B0946A', lw: 3, seed: 6002 + k, alpha: 0.6 });
    // 窗
    G.rrect(ctx, 760, 150, 420, 330, 12, { fill: '#B98A5E', lw: 6, seed: 6020 });
    fill(ctx, 778, 168, 384, 294, lin(ctx, 0, 168, 0, 462, [[0, '#9FD3F0'], [1, '#E4F4FB']]));
    G.ellipse(ctx, 1080, 420, 110, 70, { fill: '#8FC49A', lw: 0, seed: 6021 }); G.ellipse(ctx, 880, 440, 90, 50, { fill: '#A5D3A6', lw: 0, seed: 6022 });
    G.line(ctx, [[970, 168], [970, 462]], { color: '#B98A5E', lw: 9, seed: 6023 });
    G.rrect(ctx, 752, 472, 436, 18, 4, { fill: '#B98A5E', lw: 4, seed: 6024 });
    // 「休息區」牌子(字 60 px)
    ctx.save(); ctx.translate(380, 230); ctx.rotate(-0.02);
    G.tornPaper(ctx, -130, -56, 260, 108, { fill: C.paper, seed: 6030 });
    label(ctx, '休息區', 0, 22, 62, C.ink);
    ctx.restore();
    // 安全帽掛牆上
    hungHelmet(ctx, 1440, 300, KIT.HELMET.master, 6040); hungHelmet(ctx, 1590, 300, KIT.HELMET.shu, 6050); hungHelmet(ctx, 1740, 300, KIT.HELMET.crew, 6060);
    for (const hx of [1440, 1590, 1740]) G.ellipse(ctx, hx, 238, 8, 8, { fill: '#6C7680', lw: 2, seed: 6070 + hx });
    // 長椅
    G.rrect(ctx, 1320, fy - 150, 480, 34, 8, { fill: '#8E6444', lw: 5, seed: 6080 });
    for (const lx of [1350, 1750]) G.rrect(ctx, lx, fy - 116, 26, 116, 4, { fill: '#7A553A', lw: 4, seed: 6081 + lx });
    fill(ctx, -300, fy, W + 600, 800, lin(ctx, 0, fy, 0, H + 200, [[0, '#B98A5E'], [1, '#8E6444']]));
    floorLines(ctx, '#6E4C34', 6100, fy);
  }
  KIT.bg.restArea = (ctx, t, o = {}) => { const opt = { floor: 880, ...o }; KIT.cached(ctx, 'rest|' + JSON.stringify(opt), (x) => drawRest(x, opt)); };
  // ---- 白板牆 ----
  function drawBoard(ctx, o) {
    const fy = o.floor, [bx, by, bw, bh] = o.box;
    fill(ctx, -300, -300, W + 600, fy + 300, lin(ctx, 0, 0, 0, fy, [[0, '#EEF1EC'], [1, '#DFE4DC']]));
    G.rrect(ctx, bx - 18, by - 18, bw + 36, bh + 36, 10, { fill: '#9AA3AD', lw: 6, seed: 7001 });
    G.rrect(ctx, bx, by, bw, bh, 4, { fill: '#FBFCFC', lw: 4, seed: 7002 });
    for (let k = 0; k < 3; k++) G.line(ctx, [[bx + 60 + k * 90, by + 30], [bx + 220 + k * 90, by + 160]], { color: '#E4EAEE', lw: 18, seed: 7003 + k, alpha: 0.8 }); // 反光
    G.rrect(ctx, bx + bw * 0.2, by + bh + 16, bw * 0.6, 18, 6, { fill: '#6C7680', lw: 4, seed: 7010 }); // 筆槽
    [C.blue, C.red, C.green, C.ink].forEach((c, k) => G.rrect(ctx, bx + bw * 0.24 + k * 70, by + bh + 4, 54, 14, 5, { fill: c, lw: 3, seed: 7011 + k }));
    G.rrect(ctx, bx + bw * 0.62, by + bh + 2, 80, 20, 5, { fill: '#3A3A44', lw: 3, seed: 7016 }); // 板擦
    fill(ctx, -300, fy, W + 600, 800, lin(ctx, 0, fy, 0, H + 200, [[0, '#C9B79C'], [1, '#A8977C']]));
    floorLines(ctx, '#7E735F', 7100, fy);
  }
  KIT.bg.whiteboard = (ctx, t, o = {}) => { const opt = { floor: 900, box: [520, 90, 1300, 660], ...o }; KIT.cached(ctx, 'board|' + JSON.stringify(opt), (x) => drawBoard(x, opt)); const [x, y, w, h] = opt.box; return { x, y, w, h }; };

  // ============================== 道具 ==============================
  // 書桌:y = 桌面前緣;depth = 桌面看得到的深度
  KIT.desk = (ctx, x, y, w, { color = '#B98A5E', depth = 26, legs = true, panel = true, seed = 120, night = false } = {}) => {
    const c = night ? Ch.shade(color, 0.72) : color;
    if (panel) G.rrect(ctx, x + 20, y + 20, w - 40, 210, 4, { fill: Ch.shade(c, 0.78), lw: 4, seed: seed + 9 }); // 擋板:坐著的人的腿不會露出來
    G.poly(ctx, [[x + 14, y - depth], [x + w - 14, y - depth], [x + w, y], [x, y]], { fill: Ch.shade(c, 1.12), lw: 5, seed });
    G.rrect(ctx, x - 6, y, w + 12, 30, 6, { fill: c, lw: 5, seed: seed + 1 });
    if (legs) { G.rrect(ctx, x + 10, y + 30, w * 0.34, 260, 4, { fill: Ch.shade(c, 0.85), lw: 5, seed: seed + 2 }); for (let k = 0; k < 2; k++) G.rrect(ctx, x + 30, y + 64 + k * 96, w * 0.34 - 40, 70, 6, { fill: Ch.shade(c, 0.92), lw: 3.5, seed: seed + 3 + k }); G.rrect(ctx, x + w - 34, y + 30, 24, 260, 4, { fill: Ch.shade(c, 0.85), lw: 4, seed: seed + 6 }); }
  };
  // 辦公椅:(x, y) = 坐著的人的臀部(Ch.person pose 'sit' 的原點);先畫椅子再畫人
  KIT.officeChair = (ctx, x, y, s = 1, { color = '#3E4A5C', night = false, seed = 125 } = {}) => {
    const c = night ? Ch.shade(color, 0.75) : color;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -118, -330, 236, 300, 46, { fill: c, lw: 5, seed });
    G.rrect(ctx, -92, -300, 184, 236, 34, { fill: Ch.shade(c, 1.18), lw: 0, seed: seed + 1, alpha: 0.6 });
    G.rrect(ctx, -128, -10, 256, 40, 16, { fill: Ch.shade(c, 0.9), lw: 5, seed: seed + 2 });
    ctx.restore();
  };
  // 螢幕:(x, y) = 底座中心;back = 背面朝鏡頭;screen(ctx, w, h) 畫螢幕內容(正面時)
  KIT.monitor = (ctx, x, y, s = 1, { back = true, glow = 0, screen = null, seed = 130 } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow > 0) KIT.glow(ctx, 0, -170, 430, 'rgba(160,210,255,0.42)', glow);
    G.rrect(ctx, -60, -14, 120, 14, 5, { fill: '#6C7680', lw: 4, seed });
    G.rrect(ctx, -14, -70, 28, 60, 4, { fill: '#8A8F98', lw: 4, seed: seed + 1 });
    G.rrect(ctx, -170, -270, 340, 210, 12, { fill: back ? '#3A434C' : '#26242C', lw: 5, seed: seed + 2 });
    if (back) G.rrect(ctx, -60, -200, 120, 80, 10, { fill: '#4A545E', lw: 3, seed: seed + 3 });
    else { ctx.save(); ctx.beginPath(); ctx.rect(-156, -256, 312, 182); ctx.clip(); ctx.translate(-156, -256); if (screen) screen(ctx, 312, 182); else fill(ctx, 0, 0, 312, 182, '#CFE6F5'); ctx.restore(); }
    ctx.restore();
  };
  KIT.keyboard = (ctx, x, y, s = 1, seed = 140) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.poly(ctx, [[-130, -6], [130, -6], [142, 14], [-142, 14]], { fill: '#D9DEE3', lw: 4, seed }); for (let k = 0; k < 2; k++) G.line(ctx, [[-110 + k * 6, k * 7], [110 - k * 6, k * 7]], { color: '#9AA3AD', lw: 4, seed: seed + 1 + k, amp: 0.3 }); ctx.restore(); };
  // 印表機:(x, y) = 底部中心;out 0..1 = 紙吐出來的進度
  KIT.printer = (ctx, x, y, s = 1, out = 0, { seed = 150, night = false } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = night ? '#B8BCC6' : '#E6E9EE';
    G.rrect(ctx, -150, -150, 300, 150, 18, { fill: body, lw: 5, seed });
    G.rrect(ctx, -120, -186, 240, 44, 10, { fill: Ch.shade(body, 0.9), lw: 4, seed: seed + 1 });
    G.rrect(ctx, -110, -60, 220, 26, 6, { fill: '#5C6470', lw: 4, seed: seed + 2 }); // 出紙口
    G.ellipse(ctx, 112, -116, 9, 9, { fill: out > 0 && out < 1 ? '#56B870' : '#8FD3A0', lw: 2.5, seed: seed + 3 });
    if (out > 0) { const ph = 170 * clamp(out); G.poly(ctx, [[-96, -48], [96, -48], [104, -48 + ph], [-104, -48 + ph]], { fill: C.paper, lw: 4, seed: seed + 4 }); for (let k = 0; k < Math.floor(ph / 30); k++) G.line(ctx, [[-70, -24 + k * 30], [k % 2 ? 40 : 70, -24 + k * 30]], { color: '#B8AE9A', lw: 5, seed: seed + 5 + k, amp: 0.3 }); }
    ctx.restore();
  };
  KIT.lamp = (ctx, x, y, s = 1, on = true, seed = 160) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (on) KIT.glow(ctx, -60, -110, 440, 'rgba(255,214,140,0.42)');
    G.rrect(ctx, -50, -14, 100, 14, 5, { fill: '#3A3A44', lw: 4, seed });
    G.line(ctx, [[0, -14], [-40, -150], [-90, -190]], { color: '#3A3A44', lw: 9, seed: seed + 1 });
    G.poly(ctx, [[-150, -150], [-60, -220], [-30, -190], [-100, -120]], { fill: '#2B5FA8', lw: 4, seed: seed + 2 });
    ctx.restore();
  };
  // 掛鐘:hours 可以是小數(17.5 = 下午五點半);指針依 hours 算
  KIT.wallClock = (ctx, x, y, r, hours, { night = false, seed = 170 } = {}) => {
    G.ellipse(ctx, x, y, r, r, { fill: '#8A8F98', lw: 6, seed });
    G.ellipse(ctx, x, y, r * 0.84, r * 0.84, { fill: night ? '#D8D2C0' : C.paper, lw: 4, seed: seed + 1 });
    for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; stroke(ctx, [[x + Math.cos(an) * r * 0.62, y + Math.sin(an) * r * 0.62], [x + Math.cos(an) * r * 0.74, y + Math.sin(an) * r * 0.74]], C.ink, k % 3 ? 4 : 8); }
    const hr = -Math.PI / 2 + (hours % 12) * Math.PI / 6, mn = -Math.PI / 2 + (hours % 1) * Math.PI * 2;
    stroke(ctx, [[x, y], [x + Math.cos(hr) * r * 0.42, y + Math.sin(hr) * r * 0.42]], C.ink, 10);
    stroke(ctx, [[x, y], [x + Math.cos(mn) * r * 0.62, y + Math.sin(mn) * r * 0.62]], C.ink, 7);
    G.ellipse(ctx, x, y, 8, 8, { fill: C.red, lw: 0, seed: seed + 2 });
  };
  // 手機(直的):(cx, cy) 中心、w × h;screen(ctx, w, h) 在螢幕座標裡畫內容
  KIT.phone = (ctx, cx, cy, w, h, screen, { rot = 0, seed = 180 } = {}) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    fill(ctx, -w / 2 - 6, -h / 2 + 12, w + 26, h + 14, 'rgba(30,20,15,0.0)');
    ctx.fillStyle = 'rgba(30,20,15,0.25)'; ctx.beginPath(); ctx.roundRect(-w / 2 - 18 + 10, -h / 2 - 18 + 14, w + 36, h + 36, 44); ctx.fill();
    G.rrect(ctx, -w / 2 - 18, -h / 2 - 18, w + 36, h + 36, 44, { fill: '#26242C', lw: 6, seed });
    ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 28); ctx.clip(); ctx.translate(-w / 2, -h / 2); screen(ctx, w, h); ctx.restore();
    G.rrect(ctx, -40, -h / 2 - 10, 80, 10, 5, { fill: '#3A3842', lw: 0, seed: seed + 1 });
    ctx.restore();
  };
  // 通訊軟體畫面(不畫任何品牌)。msgs [{ me, at, text | parts: [{ text, size, color, font, big }] }]:一則訊息可以有好幾段
  // (例如金額放大、最後一行小字);依 at 彈出。hi { '訊息.段': 時間 } 讓那一段亮起。回傳每一則、每一段的位置(螢幕座標)
  KIT.chat = (ctx, w, h, t, { title = '', msgs = [], size = 38, top = 96, pad = 22, gap = 18, hi = {}, scroll = 0, seed = 190 } = {}) => {
    fill(ctx, 0, 0, w, h, '#DCE5EC');
    const boxes = [];
    let y = top + 26 - scroll;
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k], maxW = w * 0.76;
      const parts = (m.parts || [{ text: m.text, size: m.size, color: m.color, font: m.font, big: m.big }]).map((p) => {
        const sz = p.size || size, fam = p.font || CJK, lines = KIT.wrap(ctx, p.text, sz, maxW - 2 * pad, fam);
        return { ...p, sz, fam, lines, w: Math.max(...lines.map((ln) => measure(ctx, ln, sz, fam))), h: lines.length * sz * 1.28 };
      });
      const bw = Math.max(...parts.map((p) => p.w)) + 2 * pad, bh = parts.reduce((a, p) => a + p.h, 0) + (parts.length - 1) * 6 + pad * 1.1;
      const bx = m.me ? w - 20 - bw : 20, box = { x: bx, y, w: bw, h: bh, parts: [] };
      let py = y + pad * 0.55;
      for (const p of parts) { box.parts.push({ x: bx + pad - 8, y: py - 4, w: p.w + 16, h: p.h + 8 }); py += p.h + 6; }
      boxes.push(box);
      if (m.at == null || t >= m.at) {
        const a = m.at == null ? 1 : popIn(t, m.at, 0.25), ox = bx + (m.me ? bw : 0);
        ctx.save(); ctx.translate(ox, y + bh / 2); ctx.scale(a, a); ctx.translate(-ox, -(y + bh / 2));
        ctx.fillStyle = m.me ? '#A6E08E' : '#FFFFFF'; ctx.strokeStyle = 'rgba(40,40,50,0.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx, y, bw, bh, 22); ctx.fill(); ctx.stroke();
        parts.forEach((p, j) => {
          const r = box.parts[j], h0 = hi[`${k}.${j}`] ?? (j === 0 ? hi[k] : undefined), glow = h0 != null ? clamp((t - h0) / 0.2) : 0;
          if (glow > 0) { ctx.save(); ctx.globalAlpha *= glow; ctx.fillStyle = 'rgba(255,214,80,0.6)'; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.restore(); }
          p.lines.forEach((ln, i) => G.text(ctx, ln, bx + pad, r.y + 4 + p.sz * 0.98 + i * p.sz * 1.28, { size: p.sz, fam: p.fam, weight: p.big ? 800 : 700, color: p.color || '#2A2320', boil: 0 }));
        });
        ctx.restore();
      }
      y += bh + gap;
    }
    // 標題列(最後畫,蓋在捲動的內容上)
    fill(ctx, 0, 0, w, top, '#4F7C6A');
    stroke(ctx, [[34, top / 2 - 14], [20, top / 2], [34, top / 2 + 14]], '#FFFFFF', 6);
    if (title) G.text(ctx, title, w / 2, top / 2 + 15, { size: 40, fam: CJK, weight: 800, color: '#FFFFFF', align: 'center', boil: 0 });
    return boxes;
  };
  // 蓋章:slam 從大縮回原大小,蓋下去的瞬間有一點墨點
  KIT.stamp = (ctx, text, x, y, t, t0, { size = 120, rot = -0.18, color = C.red, padX = 40, padY = 26 } = {}) => {
    if (t < t0) return;
    const u = clamp((t - t0) / 0.16), k = lerp(2.4, 1, ease.outCubic(u)), a = clamp(u * 3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.globalAlpha *= a;
    const tw = measure(ctx, text, size), w = tw + 2 * padX, h = size + 2 * padY;
    ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 20); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 12); ctx.stroke();
    label(ctx, text, 0, size * 0.36, size, color);
    // 墨不均:幾個小白點
    ctx.fillStyle = 'rgba(255,253,244,0.55)';
    for (let k2 = 0; k2 < 14; k2++) { ctx.beginPath(); ctx.arc((G.rnd(k2, 71) - 0.5) * w, (G.rnd(k2, 72) - 0.5) * h, 2 + G.rnd(k2, 73) * 5, 0, 7); ctx.fill(); }
    ctx.restore();
  };
  // 字碎掉:t0 之前先出現裂痕(crack 秒),t0 起碎片飛開、往下掉、淡出
  const shardCache = new Map();
  KIT.shatter = (ctx, text, x, y, t, t0, { size = 60, color = C.ink, fam = NUM, weight = 800, align = 'right', crack = 0.18, seed = 1, cols = 5, rows = 2 } = {}) => {
    ctx.save(); ctx.font = `${weight} ${size}px ${fam}`; const tw = ctx.measureText(text).width; ctx.restore();
    const x0 = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x, y0 = y - size * 0.92, bw = tw + 16, bh = size * 1.25;
    if (t < t0 - crack) { G.text(ctx, text, x, y, { size, fam, weight, color, align, boil: 0 }); return; }
    // 碎片的頂點(共用,互相咬合)
    const P = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      P.push([x0 - 8 + bw * i / cols + (edge ? 0 : (U.hash(seed, i, j, 1) - 0.5) * bw / cols * 0.7), y0 + bh * j / rows + (edge ? 0 : (U.hash(seed, i, j, 2) - 0.5) * bh / rows * 0.6)]);
    }
    const at = (i, j) => P[j * (cols + 1) + i];
    const tris = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1); if ((i + j) % 2) { tris.push([a, b, c], [a, c, d]); } else { tris.push([a, b, d], [b, c, d]); } }
    const dt = t - t0;
    if (dt < 0) { // 裂痕
      G.text(ctx, text, x, y, { size, fam, weight, color, align, boil: 0 });
      const u = clamp((dt + crack) / crack);
      ctx.save(); ctx.globalAlpha *= u; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath();
      for (const tr of tris.slice(0, Math.ceil(tris.length * u))) { ctx.moveTo(tr[0][0], tr[0][1]); ctx.lineTo(tr[1][0], tr[1][1]); ctx.lineTo(tr[2][0], tr[2][1]); }
      ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      return;
    }
    const key = `${text}|${size}|${fam}|${weight}|${color}|${G.scale || 1}`;
    let img = shardCache.get(key);
    if (!img) { const k = G.scale || 1; img = G.makeCanvas(Math.ceil((bw + 40) * k), Math.ceil((bh + 40) * k)); const ix = img.getContext('2d'); ix.scale(k, k); G.text(ix, text, 20 + 8, 20 + size * 0.92, { size, fam, weight, color, align: 'left', boil: 0 }); shardCache.set(key, img); }
    tris.forEach((tr, k) => {
      const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3, cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3;
      const vx = (cx - (x0 + tw / 2)) * 3.2 + (U.hash(seed, k, 3) - 0.5) * 260, vy = -260 - U.hash(seed, k, 4) * 320, w = (U.hash(seed, k, 5) - 0.5) * 9;
      const ox = vx * dt, oy = vy * dt + 1500 * dt * dt, al = clamp(1 - dt / 0.9);
      if (al <= 0) return;
      ctx.save(); ctx.globalAlpha *= al; ctx.translate(cx + ox, cy + oy); ctx.rotate(w * dt); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.moveTo(tr[0][0], tr[0][1]); ctx.lineTo(tr[1][0], tr[1][1]); ctx.lineTo(tr[2][0], tr[2][1]); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(img, x0 - 28, y0 - 20, bw + 40, bh + 40); ctx.restore();
      ctx.strokeStyle = 'rgba(58,42,32,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    });
  };
  KIT.crown = (ctx, x, y, s = 1, { seed = 210, rot = 0 } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.poly(ctx, [[-60, 0], [-70, -66], [-34, -30], [0, -78], [34, -30], [70, -66], [60, 0]], { fill: C.gold, lw: 5, seed, hatch: { color: 'rgba(160,100,10,0.2)', gap: 7 } });
    G.rrect(ctx, -62, -6, 124, 20, 6, { fill: Ch.shade(C.gold, 0.85), lw: 4, seed: seed + 1 });
    [[-70, -66], [0, -78], [70, -66]].forEach(([px, py], k) => G.ellipse(ctx, px, py, 9, 9, { fill: k === 1 ? C.red : '#FFF4B0', lw: 3, seed: seed + 2 + k }));
    ctx.restore();
  };
  KIT.envelope = (ctx, x, y, s = 1, rot = 0, seed = 220) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    G.rrect(ctx, -70, -46, 140, 92, 8, { fill: C.paper, lw: 4.5, seed });
    stroke(ctx, [[-66, -40], [0, 8], [66, -40]], C.ink, 4.5);
    ctx.restore();
  };
  // 工安:交通錐、警示帶、滅火器
  KIT.cone = (ctx, x, y, s = 1, seed = 230) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.rrect(ctx, -46, -14, 92, 14, 4, { fill: '#3A3A44', lw: 3.5, seed }); G.poly(ctx, [[-34, -14], [34, -14], [10, -110], [-10, -110]], { fill: C.orange, lw: 4, seed: seed + 1 }); G.poly(ctx, [[-24, -46], [24, -46], [18, -70], [-18, -70]], { fill: '#FFFFFF', lw: 0, seed: seed + 2 }); ctx.restore(); };
  KIT.warnTape = (ctx, pts, { lw = 16, t = 0 } = {}) => { stroke(ctx, pts, '#FFFFFF', lw); ctx.save(); ctx.setLineDash([lw * 1.6, lw * 1.6]); ctx.lineDashOffset = 0; stroke(ctx, pts, '#D8402E', lw); ctx.restore(); };
  KIT.extinguisher = (ctx, x, y, s = 1, seed = 240) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.rrect(ctx, -30, -150, 60, 150, 24, { fill: '#D8402E', lw: 4, seed }); G.rrect(ctx, -14, -176, 28, 28, 5, { fill: '#3A3A44', lw: 3.5, seed: seed + 1 }); G.line(ctx, [[10, -168], [46, -150], [40, -100]], { color: '#3A3A44', lw: 7, seed: seed + 2 }); G.rrect(ctx, -24, -110, 48, 40, 6, { fill: '#FFFDF4', lw: 3, seed: seed + 3 }); ctx.restore(); };
  // 剪刀式高空作業車(通用外觀,不畫任何廠牌):(x, y) = 地面中心;h = 平台升起高度;回傳平台上的站點與錨點
  KIT.lift = (ctx, x, y, s, h, { seed = 250 } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -190, -86, 380, 66, 12, { fill: '#E9A23B', lw: 5, seed });
    for (const wx of [-130, 130]) { G.ellipse(ctx, wx, -22, 32, 32, { fill: '#3A3A44', lw: 5, seed: seed + 1 + wx }); G.ellipse(ctx, wx, -22, 12, 12, { fill: '#8A8F98', lw: 3, seed: seed + 3 + wx }); }
    const n = Math.max(2, Math.round(h / 130)), seg = h / n;
    for (let k = 0; k < n; k++) { const y0 = -86 - k * seg, y1 = -86 - (k + 1) * seg; G.line(ctx, [[-150, y0], [150, y1]], { color: '#8A8F98', lw: 13, seed: seed + 10 + k }); G.line(ctx, [[150, y0], [-150, y1]], { color: '#8A8F98', lw: 13, seed: seed + 20 + k }); }
    const py = -86 - h;
    G.rrect(ctx, -200, py - 28, 400, 28, 6, { fill: '#E9A23B', lw: 5, seed: seed + 30 });          // 平台
    G.rrect(ctx, -196, py - 52, 392, 22, 4, { fill: '#C98A3A', lw: 4, seed: seed + 31 });          // 腳趾板
    for (const rx of [-194, 194]) G.line(ctx, [[rx, py - 28], [rx, py - 196]], { color: '#E9A23B', lw: 10, seed: seed + 32 + rx });
    G.line(ctx, [[-194, py - 196], [194, py - 196]], { color: '#E9A23B', lw: 10, seed: seed + 35 });  // 上欄杆
    G.line(ctx, [[-194, py - 116], [194, py - 116]], { color: '#E9A23B', lw: 8, seed: seed + 36 });   // 中欄杆
    G.line(ctx, [[150, py - 196], [150, py - 330]], { color: '#5C6470', lw: 12, seed: seed + 37 });   // 錨點柱(比肩膀高)
    G.ellipse(ctx, 150, py - 336, 14, 14, { fill: null, stroke: C.ink, lw: 6, seed: seed + 38 });
    ctx.restore();
    return { deck: [x, y + s * (py - 28)], anchor: [x + 150 * s, y + s * (py - 336)] };
  };

  // ============================== 介面 ==============================
  // 撕紙卡片
  KIT.card = (ctx, x, y, w, h, { fill: f = C.paper, seed = 600, tape = false, shadow = true, tear = 4 } = {}) => {
    G.tornPaper(ctx, x, y, w, h, { fill: f, seed, shadow, tear });
    if (tape) { G.tape(ctx, x + 40, y + 4, 100, 30, -0.5, seed + 1); G.tape(ctx, x + w - 40, y + 4, 100, 30, 0.5, seed + 2); }
  };
  // 資料表。spec:
  //   x, y, w            卡片左上角與寬度        cols [{ w: 比例, align, num }]   head ['項目', '金額']
  //   title              表頭字(例:'【表 1】阿樹版報價單')    size 內容字級(預設 44)  rowH 列高(預設 74)
  //   at                 整張卡片彈出的時間      grow  true = 還沒出現的列不佔位置(卡片一列一列長高)
  //   rows [{ cells: ['材料', '120,000' | (t) => 字串], at 出現, hi 亮起(數字或 [開始, 結束]),
  //           strike 劃掉, big 放大, kind: 'sub' 小計 | 'total' 總計, color, open 這一列從 0 高度裂開, flash 紅色虛線閃 }]
  //   回傳 { h, rows: [{ y, h, base }] }(卡片自己的座標,跟 x, y 相加就是畫面座標)
  KIT.table = (ctx, t, o) => {
    const { x, y, w, rows, title = '', head = null, size = 44, rowH = 74, pad = 32, at = -Infinity, seed = 700, grow = false, fill: paper = C.paper,
      cols = [{ w: 0.6, align: 'left' }, { w: 0.4, align: 'right', num: true }], titleSize = 46, headSize = 36, scale = 1, alpha = 1 } = o;
    if (t < at) return null;
    const ap = at === -Infinity ? 1 : popIn(t, at, 0.35);
    const rowHt = (r) => {
      if (r.open != null) return rowH * ease.outCubic(clamp((t - r.open) / 0.35));
      if (grow && r.at != null) return rowH * ease.outCubic(clamp((t - r.at) / 0.3));
      return rowH;
    };
    const titleH = title ? titleSize * 1.75 : 0, headH = head ? headSize * 1.7 : 0;
    const hs = rows.map(rowHt), bodyH = hs.reduce((a, b) => a + b, 0);
    const Ht = pad * 0.8 + titleH + headH + bodyH + pad * 0.7;
    const iw = w - 2 * pad, cx = []; let acc = pad; cols.forEach((c) => { cx.push(acc); acc += c.w * iw; });
    const out = { h: Ht, rows: [] };
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(x + w / 2, y); ctx.scale(ap * scale, ap * scale); ctx.translate(-w / 2, 0);
    KIT.card(ctx, 0, 0, w, Ht, { fill: paper, seed });
    let yy = pad * 0.8;
    if (title) { G.text(ctx, title, pad, yy + titleSize * 0.95, { size: titleSize, fam: CJK, weight: 800, color: C.ink, boil: 0 }); yy += titleH; stroke(ctx, [[pad, yy - titleSize * 0.38], [w - pad, yy - titleSize * 0.38]], C.ink, 4); }
    if (head) { head.forEach((hd, i) => { const c = cols[i], ax = c.align === 'right' ? cx[i] + c.w * iw : cx[i]; G.text(ctx, hd, ax, yy + headSize * 1.12, { size: headSize, fam: CJK, weight: 700, color: C.muted, align: c.align, boil: 0 }); }); yy += headH; }
    rows.forEach((r, k) => {
      const rh = hs[k], base = yy + rh / 2 + size * 0.36;
      out.rows.push({ y: yy, h: rh, base, cx: cols.map((c, i) => (c.align === 'right' ? cx[i] + c.w * iw : cx[i])) });
      if (rh < 0.5) return;
      ctx.save(); ctx.beginPath(); ctx.rect(-20, yy - 4, w + 40, rh + 8); ctx.clip();
      const shown = r.at == null || t >= r.at, ra = r.at == null ? 1 : clamp((t - r.at) / 0.22);
      // 分隔線
      if (r.kind === 'sub') stroke(ctx, [[pad, yy + 2], [w - pad, yy + 2]], C.ink, 3);
      else if (r.kind === 'total') { stroke(ctx, [[pad, yy + 1], [w - pad, yy + 1]], C.ink, 3); stroke(ctx, [[pad, yy + 9], [w - pad, yy + 9]], C.ink, 3); }
      else if (k > 0) { ctx.save(); ctx.setLineDash([6, 8]); stroke(ctx, [[pad, yy], [w - pad, yy]], '#D2C6AC', 2.5); ctx.restore(); }
      // 亮起:黃色螢光筆
      const [h0, h1] = Array.isArray(r.hi) ? r.hi : [r.hi, Infinity];
      if (h0 != null && t >= h0) {
        const u = ease.outCubic(clamp((t - h0) / 0.35)), fade = 1 - clamp((t - h1) / 0.3);
        ctx.save(); ctx.globalAlpha *= 0.9 * fade; ctx.fillStyle = r.hiColor || C.hi; ctx.beginPath(); ctx.roundRect(pad - 12, yy + 7, (iw + 24) * u, rh - 14, 12); ctx.fill(); ctx.restore();
        const ring = clamp(1 - (t - h0) / 0.5); if (ring > 0) { ctx.save(); ctx.globalAlpha *= ring * fade; ctx.strokeStyle = '#F0A800'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(pad - 16 - 10 * (1 - ring), yy + 3 - 6 * (1 - ring), iw + 32 + 20 * (1 - ring), rh - 6 + 12 * (1 - ring), 16); ctx.stroke(); ctx.restore(); }
      }
      if (r.flash) { // 裂開的空白行:紅色虛線框 + 閃
        const fl = 0.55 + 0.45 * Math.sin(t * 9);
        ctx.save(); ctx.globalAlpha *= fl; ctx.fillStyle = 'rgba(200,69,47,0.12)'; ctx.fillRect(pad - 10, yy + 6, iw + 20, rh - 12); ctx.setLineDash([16, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(pad - 10, yy + 6, iw + 20, rh - 12); ctx.restore();
      }
      if (shown) {
        const pop = r.at == null ? 1 : ease.outBack(clamp((t - r.at) / 0.3));
        const struck = r.strike != null && t >= r.strike, dim = struck ? 0.45 : 1;
        const big = r.big != null ? ease.outBack(clamp((t - r.big) / 0.35)) : 0;
        r.cells.forEach((cell, i) => {
          const c = cols[i], str = typeof cell === 'function' ? cell(t) : cell;
          if (str == null || str === '') return;
          const isNum = !!c.num, sz = (r.kind === 'total' ? size * 1.08 : size) * (isNum && big > 0 ? 1 + 0.32 * big : 1);
          const col = (r.colors && r.colors[i]) || (isNum && r.kind === 'total' ? C.red : r.color) || (r.kind === 'sub' && !isNum ? C.muted : C.ink);
          const ax = c.align === 'right' ? cx[i] + c.w * iw : cx[i];
          ctx.save(); ctx.globalAlpha *= ra * dim;
          ctx.translate(ax, base); ctx.scale(pop, pop); ctx.translate(-ax, -base);
          G.text(ctx, str, ax, base + (sz - size) * 0.3, { size: sz, fam: isNum ? NUM : CJK, weight: 800, color: col, align: c.align, boil: 0 });
          ctx.restore();
        });
        if (struck) { const su = ease.outCubic(clamp((t - r.strike) / 0.3)); stroke(ctx, [[pad - 6, base - size * 0.32], [pad - 6 + (iw + 12) * su, base - size * 0.32 - 4 * su]], C.red, 8); }
      } else if (!grow && r.open == null) { // 還沒填的列:淡淡的虛線
        ctx.save(); ctx.setLineDash([10, 12]); stroke(ctx, [[pad + 6, base - 4], [pad + iw * 0.4, base - 4]], '#DCD2BC', 4); stroke(ctx, [[pad + iw * 0.7, base - 4], [pad + iw - 6, base - 4]], '#DCD2BC', 4); ctx.restore();
      }
      ctx.restore();
      yy += rh;
    });
    ctx.restore();
    return out;
  };
  // 勾選清單:items [{ text, at, check, cross }];回傳每一項的 y
  KIT.checklist = (ctx, t, { x, y, w, items, title = '', size = 50, rowH = 82, box = 46, at = -Infinity, seed = 800, fill: paper = C.paper, pad = 34, card = true } = {}) => {
    if (t < at) return null;
    const ap = at === -Infinity ? 1 : popIn(t, at, 0.32);
    const titleH = title ? size * 1.6 : 0, Ht = pad + titleH + items.length * rowH + pad * 0.6;
    ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(ap, ap); ctx.translate(-w / 2, 0);
    if (card) KIT.card(ctx, 0, 0, w, Ht, { fill: paper, seed });
    let yy = pad;
    if (title) { label(ctx, title, w / 2, yy + size * 0.9, size, C.ink); yy += titleH; }
    const ys = [];
    items.forEach((it, k) => {
      const cy = yy + rowH / 2; ys.push(cy);
      if (it.at != null && t < it.at) { yy += rowH; return; }
      const a = it.at == null ? 1 : popIn(t, it.at, 0.25);
      ctx.save(); ctx.translate(pad, cy); ctx.scale(a, a);
      G.rrect(ctx, 0, -box / 2, box, box, 9, { fill: '#FFFFFF', lw: 4.5, seed: seed + 10 + k });
      if (it.check != null && t >= it.check) stroke(ctx, partial([[box * 0.18, 0], [box * 0.42, box * 0.26], [box * 0.86, -box * 0.34]], ease.outCubic(clamp((t - it.check) / 0.22))), C.green, 9);
      if (it.cross != null && t >= it.cross) KIT.cross(ctx, box / 2, 0, box * 0.32, clamp((t - it.cross) / 0.25), { lw: 8 });
      G.text(ctx, it.text, box + 26, size * 0.36, { size, fam: CJK, weight: 800, color: it.color || C.ink, boil: 0 });
      ctx.restore();
      yy += rowH;
    });
    ctx.restore();
    return { h: Ht, ys };
  };
  // 章卡:整個畫面,1.2 秒(KIT.CHAPTER)。t0 = 章卡開始
  KIT.chapterCard = (ctx, t, t0, { n = 1, title = '', dur = KIT.CHAPTER, seed = 900 } = {}) => {
    const u = t - t0;
    fill(ctx, -300, -300, W + 600, H + 600, lin(ctx, 0, 0, 0, H, [[0, '#F6EBD3'], [1, '#EBDBB8']]));
    for (let k = 0; k < 9; k++) G.line(ctx, [[-40, 150 + k * 100], [W + 40, 150 + k * 100]], { color: '#D9C7A2', lw: 3, seed: seed + k, alpha: 0.7 });
    stroke(ctx, [[260, -10], [260, H + 10]], 'rgba(200,69,47,0.45)', 4);
    const out = ease.inCubic(clamp((u - (dur - 0.22)) / 0.22));
    const tagA = popIn(t, t0 + 0.02, 0.26), titleA = clamp((u - 0.12) / 0.22);
    ctx.save(); ctx.translate(0, -60 * out); ctx.globalAlpha *= 1 - out;
    // 「第 n 章」紅色標籤
    const tag = `第 ${n} 章`, ts = 64, tw = measure(ctx, tag, ts) + 64;
    ctx.save(); ctx.translate(W / 2, 400); ctx.scale(tagA, tagA); ctx.rotate(-0.025);
    G.rrect(ctx, -tw / 2, -ts * 0.82, tw, ts * 1.5, 14, { fill: C.red, lw: 5, seed: seed + 20 });
    label(ctx, tag, 0, ts * 0.36 - 2, ts, '#FFFFFF');
    ctx.restore();
    // 章名 + 底下一筆紅線
    ctx.save(); ctx.globalAlpha *= titleA; ctx.translate(0, 24 * (1 - ease.outCubic(titleA)));
    label(ctx, title, W / 2, 610, 112, C.ink);
    const lw2 = measure(ctx, title, 112);
    stroke(ctx, partial([[W / 2 - lw2 / 2, 660], [W / 2 + lw2 / 2, 652]], ease.outCubic(clamp((u - 0.3) / 0.35))), 'rgba(200,69,47,0.85)', 12);
    ctx.restore();
    ctx.restore();
  };
  // 對話框:{ text, x, y(框的中心), tail:[x,y], t0, t1, size, maxW, think }
  KIT.bubble = (ctx, t, { text, x, y, tail = null, t0 = -Infinity, t1 = Infinity, size = 46, maxW = 640, think = false, fill: f = '#FFFFFF', color = C.ink, seed = 950 } = {}) => {
    if (t < t0 || t > t1 + 0.2) return;
    const a = t0 === -Infinity ? 1 : popIn(t, t0, 0.28), out = clamp((t - t1) / 0.2), sc = a * (1 - 0.3 * out);
    const lines = KIT.wrap(ctx, text, size, maxW);
    const bw = Math.max(...lines.map((l) => measure(ctx, l, size))) + size * 1.4, bh = lines.length * size * 1.3 + size * 0.9;
    ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(x, y); ctx.scale(sc, sc);
    if (tail) {
      const tx = (tail[0] - x) / Math.max(0.01, sc), ty = (tail[1] - y) / Math.max(0.01, sc);
      if (think) [0.35, 0.62, 0.85].forEach((k, j) => G.ellipse(ctx, tx * k, ty * k + (j - 1) * 4, 10 + (2 - j) * 7, 9 + (2 - j) * 6, { fill: f, lw: 4, seed: seed + 5 + j }));
      else { const ang = Math.atan2(ty, tx), px = -Math.sin(ang) * 22, py = Math.cos(ang) * 22; G.poly(ctx, [[px, py], [tx * 0.7, ty * 0.7], [-px, -py]], { fill: f, lw: 4.5, seed: seed + 1 }); }
    }
    if (think) { const pts = []; for (let k = 0; k < 28; k++) { const an = k / 28 * Math.PI * 2, bump = 1 + 0.06 * Math.cos(an * 9); pts.push([Math.cos(an) * (bw / 2 + 18) * bump, Math.sin(an) * (bh / 2 + 18) * bump]); } G.shape(ctx, pts, { fill: f, lw: 4.5, seed }); }
    else G.rrect(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(40, bh / 2), { fill: f, lw: 4.5, seed });
    const by = -((lines.length - 1) * size * 1.3) / 2 + size * 0.37;
    lines.forEach((ln, j) => label(ctx, ln, 0, by + j * size * 1.3, size, color));
    ctx.restore();
  };
  // 右上角常駐角標(貼齊安全框右上角)
  KIT.BADGE_TEXT = '金額皆為示意整數，非市場行情';
  const badgeRect = (ctx, size = KIT.L.badge.size, text = KIT.BADGE_TEXT) => { const tw = measure(ctx, text, size), w = tw + size * 1.1, h = size * 1.75; return { x: SAFE.x + SAFE.w - w, y: SAFE.y, w, h }; };
  KIT.badgeRect = badgeRect;
  KIT.badge = (ctx, t, { t0 = -Infinity, text = KIT.BADGE_TEXT, size = KIT.L.badge.size, alpha = 1 } = {}) => {
    if (t < t0) return;
    const r = badgeRect(ctx, size, text);
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(30,20,15,0.22)'; ctx.beginPath(); ctx.roundRect(r.x + 4, r.y + 5, r.w, r.h, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,236,0.96)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
    G.text(ctx, text, r.x + r.w / 2, r.y + r.h / 2 + size * 0.36, { size, fam: CJK, weight: 800, color: C.ink, align: 'center', boil: 0 });
    ctx.restore();
  };
  // 全螢幕字卡 → shrink 時縮成角標(dur 秒)→ 之後就是角標
  KIT.disclaimer = (ctx, t, { t0, shrink, dur = 0.7, lines = ['金額皆為示意整數', '非市場行情'], size = 118, seed = 960 } = {}) => {
    if (t < t0) return;
    if (t >= shrink + dur) { KIT.badge(ctx, t); return; }
    const u = ease.inOutCubic(clamp((t - shrink) / dur)), a = popIn(t, t0, 0.35);
    const full = { x: 210, y: 190, w: W - 420, h: 620 }, b = badgeRect(ctx);
    const r = { x: lerp(full.x, b.x, u), y: lerp(full.y, b.y, u), w: lerp(full.w, b.w, u), h: lerp(full.h, b.h, u) };
    fill(ctx, -300, -300, W + 600, H + 600, `rgba(24,18,14,${0.5 * (1 - u) * clamp(a)})`);
    ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(u > 0 ? 1 : a, u > 0 ? 1 : a);
    if (u < 0.85) KIT.card(ctx, -r.w / 2, -r.h / 2, r.w, r.h, { fill: '#FFFBEF', seed, tear: lerp(5, 1, u) });
    else { ctx.fillStyle = 'rgba(255,250,236,0.96)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fill(); ctx.stroke(); }
    const fa = 1 - clamp(u / 0.45);
    if (fa > 0) { ctx.save(); ctx.globalAlpha *= fa; const k = lerp(1, 0.3, u); ctx.scale(k, k); label(ctx, lines[0], 0, -40, size, C.ink); label(ctx, lines[1], 0, size + 26, size, C.red); ctx.restore(); }
    const ba = clamp((u - 0.6) / 0.4);
    if (ba > 0) { ctx.save(); ctx.globalAlpha *= ba; G.text(ctx, KIT.BADGE_TEXT, 0, KIT.L.badge.size * 0.36, { size: KIT.L.badge.size, fam: CJK, weight: 800, color: C.ink, align: 'center', boil: 0 }); ctx.restore(); }
    ctx.restore();
  };

  // ============================== 字幕 ==============================
  const PUNCT = { '。': 3, '？': 3, '！': 3, '：': 2, '；': 2, '，': 2, '、': 1 };
  const wlen = (s) => [...String(s)].reduce((a, ch) => a + (/[\x00-\x7F]/.test(ch) ? 0.55 : 1), 0); // 全形字 = 1
  KIT.capLength = wlen;
  // 依標點切出片段(標點跟著前一段);boundary = 「後面還有字要念、而且不是連續標點」的標點
  function pieces(str) {
    const chars = [...str], out = []; let cur = '';
    chars.forEach((ch, i) => {
      cur += ch;
      const more = chars.slice(i + 1).some((c) => !PUNCT[c]);
      if (PUNCT[ch] && more && !PUNCT[chars[i + 1]]) { out.push({ s: cur, p: ch }); cur = ''; }
    });
    if (cur) out.push({ s: cur, p: null });
    return out;
  }
  // 太長的一段從中間附近切開(不切在英數字串裡、不讓標點落在行首)
  function splitLong(s, maxChars) {
    if (wlen(s) <= maxChars) return [s];
    const chars = [...s], n = Math.ceil(wlen(s) / maxChars), out = [];
    let start = 0;
    for (let k = 1; k < n; k++) {
      let best = -1, bestD = 1e9; const target = (wlen(s) * k) / n;
      for (let i = start + 1; i < chars.length - 1; i++) {
        const left = wlen(chars.slice(0, i).join(''));
        if (/[A-Za-z0-9,.]/.test(chars[i - 1]) && /[A-Za-z0-9,.]/.test(chars[i])) continue;
        if (NO_START.test(chars[i])) continue;
        const d = Math.abs(left - target); if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0) break;
      out.push(chars.slice(start, best).join('')); start = best;
    }
    out.push(chars.slice(start).join(''));
    return out;
  }
  const cleanCap = (s) => s.replace(/[，。：；]+$/u, '').replace(/[，：；]/gu, '　').replace(/。/gu, '　').trim();
  KIT.buildCaptions = (vo, { ph = globalThis.PH, maxChars = KIT.L.cap.maxChars, hold = 0.35, maxDur = 3.6 } = {}) => {
    const caps = [], lines = (vo && vo.lines) || [];
    lines.forEach((l, i) => {
      const disp = l.display || l.text, P = ph && ph[i];
      const pcs = pieces(disp), spokenPcs = pieces(l.text);
      // 每一段的開始 / 結束(秒,絕對時間):用 prep-voice 量到的停頓;對不上就照字數分
      const marks = P && P.marks && P.marks.length === pcs.length - 1 && spokenPcs.length === pcs.length ? P.marks : null;
      const on = P ? P.on : 0, off = P ? P.off : l.end - l.t;
      const totalLen = spokenPcs.reduce((a, p) => a + wlen(p.s.replace(/[，。？！：；、]/gu, '')), 0) || 1;
      let accLen = 0;
      const seg = pcs.map((p, k) => {
        let s0, s1;
        if (marks) { s0 = k === 0 ? on : marks[k - 1].b; s1 = k === pcs.length - 1 ? off : marks[k].a; }
        else { const len = wlen((spokenPcs[k] || p).s.replace(/[，。？！：；、]/gu, '')); s0 = on + (off - on) * accLen / totalLen; accLen += len; s1 = on + (off - on) * accLen / totalLen; }
        return { s: p.s, p: p.p, t0: l.t + s0, t1: l.t + s1 };
      });
      // 「、」一律接在一起;同一句裡的短片段合併成一行
      const groups = [];
      for (const sg of seg) {
        const g = groups[groups.length - 1];
        const sentenceEnd = g && /[。？！]$/u.test(g.s);
        const joined = g ? g.s + sg.s : '';
        if (g && (/、$/u.test(g.s) || (!sentenceEnd && wlen(cleanCap(joined)) <= maxChars && sg.t1 - g.t0 <= maxDur))) { g.s = joined; g.t1 = sg.t1; }
        else groups.push({ ...sg });
      }
      for (const g of groups) {
        const parts = splitLong(cleanCap(g.s), maxChars), tot = parts.reduce((a, p) => a + wlen(p), 0) || 1;
        let acc = 0;
        for (const p of parts) { const a = g.t0 + (g.t1 - g.t0) * acc / tot; acc += wlen(p); caps.push({ t: a, end: g.t0 + (g.t1 - g.t0) * acc / tot, text: p, who: l.who || 'narrator' }); }
      }
      // 最後一行多留一下(不超過下一句開始)
      const last = caps[caps.length - 1], next = lines[i + 1];
      if (last) last.end = Math.min(last.end + hold, next ? next.t - 0.05 : Infinity);
    });
    for (let k = 0; k + 1 < caps.length; k++) if (caps[k + 1].t - caps[k].end < 0.6 && caps[k + 1].t > caps[k].t) caps[k].end = caps[k + 1].t; // 句中停頓不讓字幕閃掉
    return caps;
  };
  // 字幕:畫面底部置中、安全框內;旁白白字、角色台詞黃字,深色描邊
  KIT.drawCaption = (ctx, t, caps, { size = KIT.L.cap.size, y = KIT.L.cap.y, x = W / 2 } = {}) => {
    if (!caps) return;
    const c = caps.find((cp) => t >= cp.t && t < cp.end);
    if (!c) return;
    const a = clamp((t - c.t) / 0.08) * (1 - clamp((t - (c.end - 0.06)) / 0.06)), pop = 0.96 + 0.04 * ease.outBack(clamp((t - c.t) / 0.16));
    const col = c.who === 'narrator' ? '#FFFFFF' : '#FFD75E';
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(pop, pop);
    G.text(ctx, c.text, 0, 0, { size, fam: CJK, weight: 800, color: col, stroke: '#1E1611', strokeW: size * 0.24, align: 'center', boil: 0 });
    ctx.restore();
  };

  globalThis.KIT = KIT;
})();
