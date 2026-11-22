// 看動畫學英文:時間軸。每句台詞的起點由實際語音長度排出,畫面與聲音共用。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const EP = node ? require('./lines') : globalThis.EP;
  const DUR = node ? require('./durations') : globalThis.DUR;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 96, offset: 0 });
  const { T, BEAT } = clock;

  const LEAD = 0.5, GAP = 0.55;
  const L = EP.lines, A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < L.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + (L[i].gap ?? GAP); }
  const DURATION = +(E[E.length - 1] + 2.2).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));

  const vo = L.map((l, i) => ({ at: A[i], text: l.text, voice: l.voice, ...(l.who ? { who: l.who } : {}) }));
  const idx = (type) => L.map((l, i) => (l.type === type ? i : -1)).filter((i) => i >= 0);
  const says = idx('say'), key = idx('key')[0], outro = idx('outro')[0];
  const ev = {
    enter: 0.2,                       // 客人走進來
    cup: E[says[says.length - 1]] + 0.15, // 咖啡做好放上櫃檯
    card: A[key] - 0.25,              // 重點句卡片彈出
    repeat: [E[key] + 0.25, A[outro] - 0.2], // 留給觀眾跟唸的時間
    end: A[outro],
  };

  const { chords, chordAt } = makeChords(clock, {
    C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' }, Am: { notes: ['E4', 'A4', 'C5'], bass: 'A1' },
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, G: { notes: ['D4', 'G4', 'B4'], bass: 'G2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['C', 'Am', 'F', 'G'][b % 4]]));

  const markers = { hook: A[0], talk: A[says[0]], cup: ev.cup, card: ev.card, repeat: ev.repeat[0], end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, EP, says, key, outro };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
