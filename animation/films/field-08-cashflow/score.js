// 第 8 集時間軸:每句的起點由實際語音長度排出,畫面事件用 when() 對到「念到哪個字」。畫面與聲音共用這一份。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const LINES = node ? require('./lines') : globalThis.LINES;
  const { DUR, PH } = node ? require('./durations') : { DUR: globalThis.DUR, PH: globalThis.PH };
  const { m, makeClock, makeChords } = MU;
  const FPS = 30, FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 84, offset: 0 });
  const { T, BEAT } = clock;
  const r3 = (x) => +x.toFixed(3);

  // ---------- 每一句的起點 ----------
  // GAP:句與句之間;JOIN:同一句腳本拆成的兩段(旁白「老闆只問了一句:」→ 老闆開口)之間
  const LEAD = 0.4, GAP = 0.25, JOIN = 0.08;
  // 多停的地方:老闆問完的沉默、兩條時間軸中間的空白、停工的工地、收支表的最大缺口
  const EXTRA = { 4: 0.42, 7: 0.32, 8: 0.22, 11: 0.62 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) {
    A.push(r3(t)); E.push(r3(t + DUR[i]));
    const joined = i + 1 < LINES.length && LINES[i + 1].row === LINES[i].row;
    t += DUR[i] + (joined ? JOIN : GAP) + (EXTRA[i] || 0);
  }
  const DURATION = r3(E[E.length - 1] + 2.1);
  const BARS = Math.ceil(DURATION / (BEAT * 4));

  // ---------- 念到哪個字:when(句, '字串', 0 = 開始念 | 1 = 念完) ----------
  const PUNCT = /[,。?!:;、，？！：；]/;
  const spoken = (s) => [...s].filter((ch) => !PUNCT.test(ch)).length;
  function when(i, sub, end = 0) {
    const text = LINES[i].text, c0 = text.indexOf(sub);
    if (c0 < 0) throw new Error(`score.js: 「${sub}」不在第 ${i} 句裡`);
    const ci = end ? c0 + sub.length - 1 : c0;
    const ph = PH[i];
    let p0 = { c: -1, b: ph.on }, p1 = { c: text.length, a: ph.off };
    for (const mk of ph.marks) { if (mk.c < ci) p0 = mk; else { p1 = mk; break; } }
    const n = spoken(text.slice(p0.c + 1, p1.c)), k = spoken(text.slice(p0.c + 1, ci)) + (end ? 1 : 0);
    return r3(A[i] + p0.b + (p1.a - p0.b) * k / Math.max(1, n));
  }

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, voice: l.voice, ...(l.who ? { who: l.who } : {}), ...(l.display ? { display: l.display } : {}) }));
  const ev = {
    // 1 辦公室:接到大案子、報表上的利潤是綠色正數
    folder: r3(when(0, '一個大案子') - 0.1),            // 厚厚一本合約落在桌上
    report: when(0, '算起來'),                          // 報表放大
    profit: r3(when(0, '穩賺') + 0.05),                 // 利潤 +20 亮綠色
    // 2 跟老闆報告
    office: r3(A[1] - 0.15),                            // 老闆的桌子
    walk: r3(A[1] - 0.05),                              // 阿樹拿著報表走過去
    stop: r3(A[1] + 1.05),
    steps: [0, 1, 2, 3].map((k) => r3(A[1] + 0.12 + k * 0.27)),
    thumb: r3(A[2] - 0.05),                             // 比讚:這個案子有賺!
    // 3 老闆只問了一句
    one: when(3, '一句'),                               // 老闆比出一根手指
    ask: A[4],                                          // 錢什麼時候進來?
    icon: r3(A[4] + 0.35),                              // 頭上冒出「錢 + 時鐘 + ?」
    hush: r3(E[4] + 0.05),                              // 問完之後的沉默:阿樹的笑容僵住
    // 4 合約:完工驗收之後才請款,請款之後還要等票期
    contract: r3(A[5] - 0.15),
    open: r3(A[5] + 0.25),                              // 翻開合約
    clause1: when(5, '完工驗收'),                       // 第一行亮起
    line1: r3(when(5, '完工驗收') + 0.1),               // 時間軸從開工畫到完工
    accept: when(5, '才請款'),                          // 驗收、請款
    clause2: when(5, '請款之後'),                       // 第二行亮起
    stretch: when(5, '還要等票期'),                     // 時間軸往後拉得很長
    land: r3(E[5] - 0.35),                              // 入帳落在最後面
    // 5 帳單和工資單飛出來
    bills: r3(A[6] - 0.15),
    burst: r3(A[6] + 0.25),                             // 一疊帳單炸開
    mat: when(6, '材料'),                               // 材料帳單:下個月就要付
    wages: [0, 1, 2, 3, 4].map((k) => r3(when(6, '工班') + 0.1 + k * 0.32)), // 每個月一張工資單
    // 6 兩條時間軸
    axes: r3(A[7] - 0.15),
    out: r3(A[7] + 0.05),                               // 錢出去:付款在前
    in: when(7, '比錢進來'),                            // 錢進來:收款在後
    gap: when(7, '早了'),                               // 中間一大段空白
    months: when(7, '好幾個月'),
    // 7 空白變紅、存錢筒見底、案子停了
    red: r3(A[8] + 0.1),                                // 空白區塊變紅
    pour: when(8, '公司要自己先墊'),                    // 存錢筒的錢倒進空白
    empty: when(8, '墊不出來'),                         // 存錢筒見底
    stall: r3(when(8, '案子做一半') - 0.12),            // 停工的工地
    halt: r3(when(8, '就停了') - 0.05),                 // 「暫停施工」牌子
    // 8 師傅
    rest: r3(A[9] - 0.15),
    speak: A[10],                                       // 師傅開口
    card1: r3(A[10] + 0.25),                            // 不是賠錢倒的(打叉)
    card2: when(10, '是賺錢的時候'),                    // 是周轉不過來倒的(圈起來)
    // 9 按月收支表
    desk: r3(A[11] - 0.15),
    table: r3(when(11, '多做一張表') - 0.1),            // 推進螢幕,收支表出現
    pay: when(11, '哪個月要付多少'),                    // 付出欄一格一格填
    recv: when(11, '哪個月能收多少'),                   // 收入欄
    cum: r3(E[11] - 0.25),                              // 累計欄
    worst: r3(E[11] + 0.3),                             // 最大缺口圈起來
    // 10 結尾卡
    card: r3(A[12] - 0.1),
    line2: when(12, '活不活得下去'),
    end: r3(E[12] + 0.3),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = {
    folder: ev.folder, report: ev.report, profit: ev.profit, office: ev.office, thumb: ev.thumb, one: ev.one, ask: ev.ask, icon: ev.icon, hush: ev.hush,
    contract: ev.contract, open: ev.open, clause1: ev.clause1, accept: ev.accept, clause2: ev.clause2, stretch: ev.stretch, land: ev.land,
    bills: ev.bills, burst: ev.burst, mat: ev.mat, wage1: ev.wages[0], wage5: ev.wages[4],
    axes: ev.axes, out: ev.out, in: ev.in, gap: ev.gap, months: ev.months,
    red: ev.red, pour: ev.pour, empty: ev.empty, stall: ev.stall, halt: ev.halt,
    rest: ev.rest, speak: ev.speak, card1: ev.card1, card2: ev.card2,
    desk: ev.desk, table: ev.table, pay: ev.pay, recv: ev.recv, cum: ev.cum, worst: ev.worst,
    card: ev.card, line2: ev.line2, end: ev.end,
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, DUR, PH, vo, ev, markers, LINES, when };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
