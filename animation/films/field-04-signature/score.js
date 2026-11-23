// 第 4 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const LINES = node ? require('./lines') : globalThis.LINES;
  const DUR = node ? require('./durations') : globalThis.DUR;
  const { m, makeClock, makeChords } = MU;
  const FPS = 30, FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 84, offset: 0 });
  const { T, BEAT } = clock;
  const LEAD = 0.5, GAP = 0.36;
  const EXTRA = { 8: 0.7 }; // 第 9 句後多停一下,讓簽名與打勾看得清楚
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = +(E[E.length - 1] + 2.5).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));
  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));
  const r3 = (x) => +x.toFixed(3);
  const ev = {
    walk: r3(A[0] + 0.9),                                         // 業主的窗口走過來
    point: r3(A[0] + 3.75),                                       // 「這裡幫我多拉一條」:手指牆面,虛線出現
    yes: r3(A[1] + 1.95),                                         // 阿樹:「好,沒問題!」比讚
    mats: [0, 1, 2].map((k) => r3(A[2] + 0.3 + k * 0.3)),         // 多用了材料
    days: [r3(A[2] + 1.7), r3(A[2] + 2.35)],                      // 多做了兩天
    built: [0, 1, 2].map((k) => r3(A[2] + 0.95 + k * 0.95)),      // 虛線一段一段變成真的管
    proud: r3(A[2] + 3.35),                                       // 他覺得這是服務
    sheet: r3(A[3] + 0.1),                                        // 請款單
    strike: r3(A[3] + 2.55),                                      // 追加那一行被紅線劃掉
    ask: A[4],                                                    // 另一位承辦開口
    doc: r3(A[4] + 1.2),                                          // 「有文件嗎?」
    gone: r3(A[5] + 0.3),                                         // 座位上的人影淡掉
    flip: r3(A[5] + 2.2),                                         // 名牌蓋下去
    empty: [r3(A[6] + 2.75), r3(A[6] + 3.85), r3(A[6] + 4.95)],   // 沒有信、沒有簽名、沒有照片
    pat: [r3(A[7] + 0.45), r3(A[7] + 0.85)],                      // 師傅拍拍他
    speak: r3(A[7] + 1.55),                                       // 師傅開口
    icons: [r3(A[7] + 1.6), r3(A[7] + 2.95), r3(A[7] + 4.3)],    // 人會調走、話會忘記、只有紙會留下來
    book: r3(A[8] + 1.7),                                         // 口袋裡的小本子
    write: r3(A[8] + 5.0),                                        // 當場寫
    sign: r3(A[8] + 6.0),                                         // 當場簽
    tick: r3(A[8] + 7.0),                                         // 簽好了
    end: r3(E[9] + 0.25),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { walk: ev.walk, point: ev.point, yes: ev.yes, mats: ev.mats[0], days: ev.days[0], proud: ev.proud, sheet: ev.sheet, strike: ev.strike, ask: ev.ask, doc: ev.doc, flip: ev.flip, empty: ev.empty[0], pat: ev.pat[0], speak: ev.speak, icons: ev.icons[0], book: ev.book, write: ev.write, sign: ev.sign, tick: ev.tick, end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
