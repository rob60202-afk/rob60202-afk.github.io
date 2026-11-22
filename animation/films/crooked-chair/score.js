// 歪椅子(9:16,約 53 秒):時間軸的唯一來源。每句旁白的起點 A[i] 由實際語音長度排出,
// 畫面(film.js)與聲音(song.js)都讀這一份,所以不會對不上。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const LINES = node ? require('./lines') : globalThis.LINES;
  const DUR = node ? require('./durations') : globalThis.DUR;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 80, offset: 0 });
  const { T, BEAT } = clock;

  // 每句旁白的起訖時間
  const LEAD = 0.6, GAP = 0.42;
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP; }
  const DURATION = +(E[E.length - 1] + 2.6).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));

  // 關鍵事件
  const ev = {
    wobble: A[0] + 1.9,            // 椅子做好,晃了一下
    sit: A[3] + 2.3,               // 師傅坐下
    years: [A[4] + 0.2, E[4] + 0.3], // 三十年快轉
    chairs: [0, 1, 2, 3, 4].map((k) => +(A[6] + 1.6 + k * 0.5).toFixed(3)), // 一張張好椅子出現
    smile: A[9] - 0.3,
    end: E[11] + 0.3,
  };

  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));

  const markers = { wobble: ev.wobble, sit: ev.sit, years: ev.years[0], chairs: ev.chairs[0], ask: A[8], answer: A[9], end: ev.end };

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
