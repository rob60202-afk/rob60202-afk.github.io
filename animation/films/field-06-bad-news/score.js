// 第 6 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
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
  // 多停的地方:收手機、時鐘飛轉、業主問完的沉默、每天來盯、四張卡片落定、選好方案
  const EXTRA = { 0: 0.2, 1: 0.4, 3: 0.5, 4: 0.4, 7: 0.5, 8: 0.5 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = +(E[E.length - 1] + 2.7).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));
  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));
  const r3 = (x) => +x.toFixed(3);
  // 句子裡的時間點取自實際語音的停頓(每句旁白內各短句的起點)
  const ev = {
    tag: r3(A[0] + 0.15),                                        // 料架上的「到貨延後」
    stamp: r3(A[0] + 2.6),                                       // 「工期落後」章
    phone: r3(A[0] + 3.4),                                       // 阿樹拿起手機(本來要打給業主)
    dial: r3(A[0] + 3.7),                                        // 手機畫面:業主
    pocket: r3(A[0] + 4.85),                                     // 先不要講:把手機收進口袋
    shh: r3(A[0] + 5.35),                                        // 噓
    night: r3(A[1] - 0.15),                                      // 加班
    tick0: r3(A[1] + 0.1), tick1: r3(A[2] - 0.35),               // 時鐘飛轉的那一段
    built: [r3(A[1] + 1.0), r3(A[1] + 2.5)],                     // 加班裝上去的兩段
    week: r3(A[2] + 0.1),                                        // 一週後
    walk: r3(A[2] + 1.1),                                        // 業主走進來
    arrive: r3(A[2] + 2.3),
    discover: r3(A[2] + 2.95),                                   // 「發現了」:業主臉色鐵青
    ask: A[3],                                                   // 業主開口
    ask2: r3(A[3] + 1.4),                                        // 「你打算什麼時候才告訴我?」
    hush: r3(E[3] + 0.05),                                       // 問完之後的沉默
    days: [r3(A[4] + 0.05), r3(A[4] + 1.3), r3(A[4] + 2.3)],     // 第 1、2、3 天
    rest: r3(A[5] - 0.15),                                       // 休息區
    speak: r3(A[5] + 0.95),                                      // 師傅開口(「師傅說:」之後)
    find: r3(A[6] + 1.0),                                        // 下一次:發現問題
    office: r3(A[6] + 1.95),                                     // 當天就去報告
    knock: [r3(A[6] + 2.2), r3(A[6] + 2.45)],                    // 敲門
    enter: r3(A[6] + 2.65),                                      // 開門走進去
    cards: [r3(A[7] + 1.95), r3(A[7] + 3.26), r3(A[7] + 4.52), r3(A[7] + 5.9)], // 事實、影響、選項、待決定
    opts: r3(A[8] - 0.1),                                        // 選項卡分成兩張方案
    nod: r3(A[8] + 2.74),                                        // 「好」
    point: r3(A[8] + 3.35),                                      // 指著第二個方案
    pick: r3(A[8] + 4.2),                                        // 第二個方案打勾
    card: r3(A[9] + 0.1),
    line2: r3(A[9] + 2.15),
    end: r3(E[9] + 0.3),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { tag: ev.tag, stamp: ev.stamp, phone: ev.phone, pocket: ev.pocket, shh: ev.shh, night: ev.night, week: ev.week, walk: ev.walk, discover: ev.discover, ask: ev.ask, ask2: ev.ask2, hush: ev.hush, day1: ev.days[0], day2: ev.days[1], day3: ev.days[2], rest: ev.rest, speak: ev.speak, find: ev.find, office: ev.office, enter: ev.enter, card1: ev.cards[0], card2: ev.cards[1], card3: ev.cards[2], card4: ev.cards[3], opts: ev.opts, nod: ev.nod, point: ev.point, pick: ev.pick, card: ev.card, line2: ev.line2, end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
