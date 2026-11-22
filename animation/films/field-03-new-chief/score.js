// 第 3 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
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
  const LEAD = 0.6, GAP = 0.42;
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP; }
  const DURATION = +(E[E.length - 1] + 2.8).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));
  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));
  const r3 = (x) => +x.toFixed(3);
  const seven = (t0, step) => [0, 1, 2, 3, 4, 5, 6].map((k) => r3(t0 + k * step));
  const ev = {
    vest: r3(A[0] + 0.55),                                        // 阿樹換上課長背心
    row: seven(A[0] + 1.55, 0.2),                                 // 七個人一個一個站出來
    alarm: r3(A[1] + 1.55),                                       // 現場出狀況:管線噴水
    run: r3(A[1] + 3.2),                                          // 他自己衝下去
    clanks: [0, 1, 2].map((k) => r3(A[1] + 4.95 + k * 0.55)),     // 一個人鎖、鎖、鎖
    eight: r3(A[2] + 0.9),                                        // 晚上八點
    proud: r3(A[2] + 2.1),                                        // 覺得自己很負責
    one: r3(A[3] + 1.3),                                          // 主管:只問一個問題
    ask: A[4],                                                    // 主管開口
    icons: seven(A[4] + 0.55, 0.14),                               // 對話框裡的七個人
    freeze: r3(A[5] + 0.1),                                       // 阿樹僵住,回想
    pour: r3(A[6] + 2.2),                                         // 師傅沖茶
    speak: A[7],                                                  // 師傅開口
    cups: seven(A[7] + DUR[7] * 0.56, 0.3),                       // 七個杯子一杯一杯有茶
    ticks: seven(A[8] + 1.0, 0.72),                               // 白板上七項工作逐一排定
    end: r3(E[9] + 0.25),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { vest: ev.vest, row: ev.row[0], alarm: ev.alarm, run: ev.run, clanks: ev.clanks[0], eight: ev.eight, proud: ev.proud, one: ev.one, ask: ev.ask, freeze: ev.freeze, pour: ev.pour, speak: ev.speak, cups: ev.cups[0], ticks: ev.ticks[0], end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
