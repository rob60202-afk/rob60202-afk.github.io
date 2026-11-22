// 第 2 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
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
  const ev = {
    done: r3(A[0] + 2.1),                                         // 最後一個接頭鎖好
    ticks: [0, 1, 2, 3, 4].map((k) => r3(A[1] + 0.35 + k * 0.42)), // 壓力錶指針一格一格升上去
    think: r3(A[2] + DUR[2] * 0.36),                              // 阿樹開口:「都鎖得這麼緊了…」
    lights: r3(A[3] + 1.35),                                      // 關燈
    drop: [r3(A[4] + 2.0), r3(E[4] + 0.35)],                      // 指針慢慢往下掉
    leak: r3(A[5] + 1.55),                                        // 找到漏點
    clanks: [0, 1, 2].map((k) => r3(A[6] + 1.0 + k * 1.15)),      // 一段一段拆下來
    speak: A[8],                                                  // 師傅開口
    end: r3(E[9] + 0.25),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { done: ev.done, ticks: ev.ticks[0], think: ev.think, lights: ev.lights, drop: ev.drop[0], leak: ev.leak, clanks: ev.clanks[0], speak: ev.speak, end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
