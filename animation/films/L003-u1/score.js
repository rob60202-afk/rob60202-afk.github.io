// L003 第 1 單元時間軸:每句的起點由實際語音長度排出,畫面事件對到「念到哪個字」。畫面與聲音共用這一份。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const LINES = node ? require('./lines') : globalThis.LINES;
  const { DUR, PH } = node ? require('./durations') : { DUR: globalThis.DUR, PH: globalThis.PH };
  const { m, makeClock, makeChords } = MU;
  const FPS = 30, FORMAT = '16:9';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 78, offset: 0 });
  const { T, BEAT } = clock;
  const r3 = (x) => +x.toFixed(3);

  // ---------- 每一句的起點 ----------
  const LEAD = 0.6, GAP = 0.45, CHAPTER = 1.2;  // 章卡固定 1.2 秒
  // 句子念完後多停一下(秒):蓋章、碎掉、片名、時鐘快轉、含稅放大、角標縮小、寄出、皇冠
  const HOLD = { 0: 0.3, 1: 0.2, 2: 1.15, 3: 0.55, 4: 0.3, 5: 1.35, 6: 0.3, 7: 0.45, 8: 1.0, 9: 0.95, 10: 1.0, 11: 0.4 };
  const A = [], E = [];
  let t = LEAD, ch1 = 0;
  for (let i = 0; i < LINES.length; i++) {
    A.push(r3(t)); E.push(r3(t + DUR[i]));
    t += DUR[i] + GAP + (HOLD[i] || 0);
    if (i === 3) { ch1 = r3(t); t += CHAPTER + 0.35; } // 開場鉤子之後:第 1 章章卡
  }
  const DURATION = r3(E[E.length - 1] + 2.2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));

  // ---------- 念到哪個字:when(句, '字串', 0 = 開始念 | 1 = 念完) ----------
  const PUNCT = /[，。？！：；、]/;
  const spoken = (s) => [...s].filter((ch) => !PUNCT.test(ch)).length;
  function when(i, sub, end = 0) {
    const text = LINES[i].text, c0 = text.indexOf(sub);
    if (c0 < 0) throw new Error(`score.js: 「${sub}」不在第 ${i + 1} 句裡`);
    const ci = end ? c0 + sub.length - 1 : c0; // 要對的那個字
    const ph = PH[i];
    let p0 = { c: -1, b: ph.on }, p1 = { c: text.length, a: ph.off };
    for (const mk of ph.marks) { if (mk.c < ci) p0 = mk; else { p1 = mk; break; } }
    const n = spoken(text.slice(p0.c + 1, p1.c)), k = spoken(text.slice(p0.c + 1, ci)) + (end ? 1 : 0);
    return r3(A[i] + p0.b + (p1.a - p0.b) * k / Math.max(1, n));
  }

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, who: l.who, voice: l.voice, ...(l.display ? { display: l.display } : {}) }));
  const ev = {
    // 開場鉤子
    print: when(0, '只花'),                         // 印表機吐出報價單
    sheetUp: r3(when(0, '隔天') - 0.15),            // 報價單飛到畫面中央
    stamp: when(0, '得標'),                          // 「得標」章蓋下去
    lookUp: when(1, '抬頭'),                         // 師傅抬頭
    tilt: [when(1, '看了一眼'), r3(when(1, '問了一句話') + 0.35)], // 鏡頭跟著視線往上拉
    insert: r3(E[2] + 0.12),                         // 切到阿樹手上的報價單
    crack: r3(E[2] + 0.42),                          // 利潤格裂開
    shatter: r3(E[2] + 0.72),                        // 啪一聲碎掉
    title: r3(A[3] - 0.15),                          // 片名卡
    ch1,                                             // 第 1 章章卡(1.2 秒)
    // 第 1 章
    year2: r3(when(4, '今年第二年') + 0.15),
    toss: when(4, '丟給他'),                         // 老闆把圖丟過來
    plan: r3(when(4, '客戶的廠房') - 0.2),           // 切到平面圖
    route: [when(4, '要拉一條'), when(4, '送壓縮空氣', 1)],
    spec: when(4, '兩吋'),                           // 圖角標註亮起
    weld: when(4, '全部用焊的'),                     // 焊接點一個一個冒出來
    chest: when(5, '我來'),                          // 拍胸脯
    sparkle: when(5, '一個晚上'),
    clock: [r3(E[5] + 0.15), r3(E[5] + 1.35)],       // 時鐘快轉到半夜
    table: r3(A[6] + 0.1),                           // 【表 1】出現(空白表)
    pipe: [when(6, '九十米'), when(6, '一米一千'), when(6, '九萬')],
    fit: [when(6, '彎頭'), when(6, '三通'), when(6, '閥件'), when(6, '三萬')],
    mat: when(6, '十二萬'),                          // 第一行「材料 120,000」亮起
    phone: when(7, '他問了'),                        // 阿樹滑手機
    reply: r3(when(7, '班長', 1) + 0.15),            // 班長回了一串訊息
    hl: [when(7, '兩個人做十天'), when(7, '一人一天四千'), when(7, '八萬')],
    close: r3(E[7] + 0.15),                          // 看完金額就把手機蓋上
    wage: r3(E[7] + 0.4),                            // 第二行「工資 80,000」亮起
    sub: when(8, '二十萬'), fee: when(8, '一成'), feeV: when(8, '兩萬'), net: when(8, '二十二萬'),
    tax: when(8, '含稅'), total: when(8, '二十三萬一千'), big: r3(E[8] + 0.05),
    card: r3(A[9] - 0.1),                            // 全螢幕字卡
    shrink: r3(E[9] + 0.15),                         // 縮成右上角角標
    ticks: [when(10, '材料'), when(10, '工資'), when(10, '利潤'), when(10, '稅')],
    allDone: when(10, '都有了'), stretch: when(10, '完美'),
    send: r3(E[10] + 0.2),                           // 按下寄出
    spread: r3(A[11] + 0.15),                        // 三份報價單攤在桌上
    top: r3(when(11, '價錢也最漂亮') - 0.15),        // 俯看三份報價單
    tap: when(11, '最漂亮'),
    deal: r3(when(11, '就給你們做') - 0.12),         // 就給你們做
    orbit: r3(A[12] - 0.15),                         // 「價錢也最漂亮」繞著頭轉
    crown: when(12, '稱讚'),                         // 小皇冠冒出來
    end: r3(E[12] + 0.3),
  };
  ev.badge = r3(ev.shrink + 0.7);                    // 從這一刻起右上角角標常駐

  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = {
    stamp: ev.stamp, lookUp: ev.lookUp, tilt: ev.tilt[0], ask: A[2], insert: ev.insert, shatter: { t: ev.shatter, sync: 'av' }, title: ev.title,
    ch1: { t: ev.ch1, sync: 'a' }, year2: ev.year2, toss: ev.toss, plan: ev.plan, spec: ev.spec, weld: ev.weld, chest: ev.chest, clock: ev.clock[0],
    table: ev.table, mat: ev.mat, phone: ev.phone, reply: ev.reply, close: ev.close, wage: ev.wage, sub: ev.sub, total: ev.total, big: ev.big,
    card: ev.card, shrink: ev.shrink, badge: ev.badge, ticks: ev.ticks[0], send: ev.send, spread: ev.spread, top: ev.top, deal: ev.deal, orbit: ev.orbit, crown: ev.crown, end: ev.end,
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, DUR, PH, vo, ev, markers, LINES, CHAPTER, when };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
