// 第 7 集時間軸:每句旁白的起點由實際語音長度排出,畫面與聲音共用。
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
  const LEAD = 0.5, GAP = 0.3;
  // 多停的地方:轉身走掉、看清楚交出來的東西、她說完之後、回想的七個字、師傅說完、五件事全部打勾
  const EXTRA = { 0: 0.4, 1: 0.7, 3: 0.2, 4: 0.4, 6: 0.3, 8: 0.6 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(+t.toFixed(3)); E.push(+(t + DUR[i]).toFixed(3)); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = +(E[E.length - 1] + 2.6).toFixed(2);
  const BARS = Math.ceil(DURATION / (BEAT * 4));
  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, ...(l.who ? { who: l.who } : {}) }));
  const r3 = (x) => +x.toFixed(3);
  // 語音裡每個短句的起點(秒,從該句開頭算;由實際合成的語音量出停頓)
  const PH = {
    0: [0, 1.83, 3.93],             // 阿樹當課長後 / 最常講的一句話是 / 這個你處理一下
    1: [0, 1.13, 3.09],             // 三天後 / 部屬交出來的東西 / 完全不是他要的
    2: [0, 2.17],                   // 他忍不住唸了兩句 / 怎麼會做成這樣
    3: [0, 1.7, 2.47],              // 部屬小聲說 / 課長 / 你沒有說要做成怎樣
    4: [0, 1.79, 4.23],             // 阿樹愣住了 / 他回想自己當時講的話 / 只有七個字
    5: [0, 2.09],                   // 師傅在旁邊泡茶 / 頭也沒抬
    6: [0, 2.57],                   // 你要的東西只在你腦袋裡 / 他怎麼看得到
    7: [0, 2.5],                    // 從此阿樹交辦事情 / 固定講五件事
    8: [0, 1.49, 3.0, 4.52, 6.21],  // 為什麼要做 / 做到什麼程度 / 什麼時候要 / 可以用什麼資源 / 什麼時候回報
    9: [0, 1.48, 2.69],             // 交辦不清楚 / 做錯的責任 / 在交辦的人
  };
  const at = (i, k, d = 0) => r3(A[i] + PH[i][k] + d);
  const ev = {
    chief: r3(A[0] + 0.25),                                       // 「課長」標籤
    walk: r3(A[0] + 1.45),                                        // 阿樹抱著一疊資料走過去
    steps: [0, 1, 2, 3].map((k) => r3(A[0] + 1.6 + k * 0.33)),    // 腳步
    hand: at(0, 2),                                               // 這個你處理一下:資料交到她手上
    turn: at(0, 2, 0.75),                                         // 轉身就走
    out: [0, 1, 2, 3].map((k) => r3(A[0] + 4.85 + k * 0.3)),      // 走掉的腳步
    huh: at(0, 2, 1.25),                                          // 她頭上冒出問號
    days: [0, 1, 2].map((k) => r3(A[1] + 0.02 + k * 0.3)),        // 三張日子卡:第1天、第2天、第3天
    inShot: r3(A[1] + 0.95),                                      // 三天後:她交出成果
    give: at(1, 1, 0.15),                                         // 她把成果遞出去
    take: at(1, 1, 0.8),                                          // 阿樹接過來
    dream: at(1, 1, 1.15),                                        // 想像中的樣子(整齊的表格)
    reveal: at(1, 2),                                             // 實際拿到的(亂七八糟的清單)
    wrong: at(1, 2, 0.45),                                        // 不一樣:阿樹瞪大眼睛
    scold: r3(A[2] + 0.2),                                        // 皺眉唸她
    grumble: r3(A[2] + 0.45),
    why: at(2, 1),                                                // 怎麼會做成這樣?
    lookUp: at(3, 1, -0.05),                                      // 「課長」:她抬頭
    freeze: r3(A[4] + 0.1),                                       // 阿樹愣住
    rewind: at(4, 1, -0.4),                                       // 倒帶回想
    memory: at(4, 1, -0.05),                                      // 回想畫面
    bubble: at(4, 1, 0.75),                                       // 對話框:這個你處理一下
    count: [0, 1, 2, 3, 4, 5, 6].map((k) => at(4, 2, 0.05 + k * 0.1)), // 數:只有七個字
    seven: at(4, 2, 0.85),                                        // 「7 個字」章
    pour: r3(A[5] + 0.55),                                        // 師傅沖茶
    noLook: at(5, 1),                                             // 頭也沒抬
    speak: A[6],                                                  // 師傅開口
    cup: r3(A[6] + 0.35),                                         // 倒一杯給阿樹
    cloud: r3(A[6] + 1.15),                                       // 只在你腦袋裡
    see: at(6, 1),                                                // 他怎麼看得到?師傅抬頭
    cardOut: r3(A[7] + 0.85),                                     // 阿樹拿出小卡
    cardShow: at(7, 1),                                           // 固定講五件事
    items: PH[8].map((p) => r3(A[8] + p)),                        // 五件事一項一項出現
    ticks: PH[8].map((p) => r3(A[8] + p + 0.5)),                  // 打勾
    card: [0, 1, 2].map((k) => at(9, k, k ? -0.05 : 0.05)),       // 結尾卡三行
    end: r3(E[9] + 0.3),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = { chief: ev.chief, walk: ev.walk, hand: ev.hand, turn: ev.turn, huh: ev.huh, days: ev.days[0], give: ev.give, take: ev.take, dream: ev.dream, reveal: ev.reveal, wrong: ev.wrong, scold: ev.scold, why: ev.why, lookUp: ev.lookUp, freeze: ev.freeze, rewind: ev.rewind, memory: ev.memory, bubble: ev.bubble, seven: ev.seven, pour: ev.pour, speak: ev.speak, cloud: ev.cloud, see: ev.see, cardOut: ev.cardOut, cardShow: ev.cardShow, ticks: ev.ticks[0], card: ev.card[0], end: ev.end };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
