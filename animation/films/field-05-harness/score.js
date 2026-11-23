// 第 5 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
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
  // 多停的地方:爬上去、定格、抓住之後、兩人沉默、看疤、師傅說完、扣上之後再爬一次
  const EXTRA = { 0: 0.7, 3: 1.0, 4: 0.6, 5: 2.0, 6: 0.5, 7: 1.0, 8: 3.3 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = +(E[E.length - 1] + 3.0).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));
  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));
  const r3 = (x) => +x.toFixed(3);
  const ev = {
    climb: 0.25,                                                  // 阿樹開始爬
    top: r3(A[0] + 2.3),                                          // 踏上平台
    bolt: r3(A[0] + 3.5),                                         // 開始鎖那一顆螺絲
    steps: [0, 1, 2, 3, 4, 5].map((k) => r3(0.45 + k * 0.4)),     // 踩在梯子上的腳步
    hook: r3(A[1] + 0.25),                                        // 腰間晃動的掛鉤
    circle: r3(A[1] + 1.75),                                      // 「他懶得扣」:紅圈
    mutter: A[2],                                                 // 「一下就下來了」
    slip: r3(A[3] + 1.2),                                         // 腳滑
    freeze: r3(A[3] + 1.5),                                       // 畫面定格
    reach: r3(A[4] + 1.25),                                       // 一隻手伸過來
    grab: r3(A[4] + 1.6),                                         // 抓住
    reveal: r3(A[4] + 2.85),                                      // 是師傅
    sit: A[5],                                                    // 兩個人坐在地上
    beats: [0, 1, 2, 3, 4, 5].map((k) => r3(A[5] + 0.3 + k * 0.95)), // 心跳
    roll: r3(A[6] + 0.35),                                        // 師傅捲起袖子
    scar: r3(A[6] + 2.2),                                         // 一道很長的疤
    speak: A[7],                                                  // 師傅開口
    take: r3(A[8] + 1.3),                                         // 阿樹拿起掛鉤
    close: r3(A[8] + 2.9),                                        // 掛鉤特寫
    click: r3(E[8] + 0.12),                                       // 「喀」
    again: r3(E[8] + 1.15),                                       // 扣好了才往上爬
    top2: r3(E[8] + 2.45),                                        // 這次在平台上,掛鉤扣在頭頂
    card: r3(A[9] + 0.1),
    end: r3(E[9] + 0.3),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { climb: ev.climb, top: ev.top, bolt: ev.bolt, hook: ev.hook, circle: ev.circle, mutter: ev.mutter, slip: ev.slip, freeze: ev.freeze, reach: ev.reach, grab: ev.grab, reveal: ev.reveal, sit: ev.sit, roll: ev.roll, scar: ev.scar, speak: ev.speak, take: ev.take, close: ev.close, click: ev.click, again: ev.again, top2: ev.top2, card: ev.card, end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
