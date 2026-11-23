// L003 第 2 單元時間軸:第 2 章「天花板上的那一行」。t = 0 就是章卡(硬切進來),第一句在章卡後 0.35 秒開始。
// 每句的起點由實際語音長度排出,畫面事件對到「念到哪個字」。畫面與聲音共用這一份。
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
  const GAP = 0.45, CHAPTER = 1.2;  // 章卡固定 1.2 秒
  // 句子念完後多停一下(秒):師傅抬頭、鏡頭慢慢上搖(3)、尺規拉到 6 m 與皇冠歪掉(4)、問完那一句、表 1 裂開、
  // 梯子打叉、算式、利潤掉到負的與皇冠掉地上(10)、計費表、定格
  const HOLD = { 0: 0.3, 1: 0.1, 2: 0.3, 3: 2.2, 4: 2.0, 5: 0.5, 6: 0.8, 7: 0.3, 8: 0.6, 9: 0.6, 10: 1.0, 11: 0.5, 12: 0.7 };
  const ch2 = 0;                                     // 第 2 章章卡:單元的第一格
  const A = [], E = [];
  let t = ch2 + CHAPTER + 0.35;
  for (let i = 0; i < LINES.length; i++) {
    A.push(r3(t)); E.push(r3(t + DUR[i]));
    t += DUR[i] + GAP + (HOLD[i] || 0);
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

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, who: l.who, voice: l.voice, ...(l.display ? { display: l.display } : {}), ...(l.gain ? { gain: l.gain } : {}) }));
  const walkEnd = when(0, '走進廠房', 1);
  const ev = {
    ch2,                                             // 第 2 章章卡(1.2 秒)
    // 1. 會勘那天:三個人走進廠房,師傅沒有看圖,先抬頭
    walk: { master: [r3(ch2 + CHAPTER), r3(walkEnd + 0.2)], shu: [r3(ch2 + CHAPTER + 0.25), r3(walkEnd + 0.55)], client: [r3(ch2 + CHAPTER + 0.45), r3(walkEnd + 0.75)] },
    offer: r3(when(0, '沒有看圖') - 0.1),             // 阿樹把圖遞過去,師傅不看
    lookUp: when(0, '先抬頭'),
    // 2. 師傅對嘴「管子走哪裡?」(眼睛沒離開天花板)
    ask1: r3(A[1] - 0.12),
    // 3. 阿樹跟著抬頭、手指往上比
    two: r3(A[2] - 0.12),
    shuUp: r3(when(2, '上面啊') - 0.1),
    hug: when(2, '貼著'),
    // 4. 「多高?」鏡頭由地面往上搖 →「……六米。」拉遠、尺規從地面拉到管線位置、6 m、皇冠歪掉
    wide: r3(A[3] - 0.15),
    tilt: [r3(E[3] + 0.1), r3(A[4] - 0.25)],
    pull: [r3(A[4] - 0.2), r3(A[4] + 0.85)],
    ruler: [r3(A[4] + 0.05), r3(A[4] + 0.95)],
    six: r3(E[4] + 0.3),
    crownTilt: r3(E[4] + 1.55),
    // 5. 「六米。那你的高空車,算在報價單的哪一行?」師傅終於轉頭看阿樹
    turnShot: r3(A[5] - 0.15),
    turn: r3(when(5, '那你的') - 0.1),
    sweat: when(5, '高空車'),
    // 6. 阿樹把報價單翻過來、翻過去;【表 1】在材料和工資中間裂開一條空白行
    flipShot: r3(A[6] - 0.15),
    flip1: when(6, '翻過來'), flip2: when(6, '又翻過去'), frantic: r3(when(6, '沒有那一行') - 0.35),
    split: when(6, '沒有那一行'),
    // 7. 阿樹小小聲,手指比出一把很小的梯子
    whisper: r3(A[7] - 0.15), tiny: r3(when(7, '梯子') - 0.15),
    // 8. 「六米的梯子。你爬,我不爬。」師傅抱胸;示意:梯子連一半都不到,打大紅叉
    cross: r3(A[8] - 0.15), card8: r3(A[8] + 0.05), ladder8: when(8, '梯子'), half8: r3(when(8, '梯子', 1) + 0.25), xmark: when(8, '我不爬'),
    // 9. 【圖 A】高度示意:6 m、梯子打叉、施工架與高空作業車打勾;10 天 × 2,500 = 25,000
    figA: r3(A[9] - 0.15),
    dim6: when(9, '這種高度'), ladderX: when(9, '不是扛'),
    scaf: when(9, '施工架'), scafOK: when(9, '施工架', 1),
    lift: when(9, '高空作業車'), liftOK: when(9, '高空作業車', 1),
    calc: [when(9, '十天'), when(9, '兩千五'), when(9, '兩萬五')],
    // 10. 「他以為會賺的那兩萬,當場變成負五千。」利潤格往下掉,穿過零;小皇冠掉到地上
    dropShot: r3(A[10] - 0.15),
    hi20: when(10, '那兩萬'),
    chip: r3(when(10, '當場') - 0.3),
    fall: [when(10, '當場'), when(10, '負五千', 1)],
    crownFall: r3(E[10] + 0.15),
    // 11. 板車載著高空車進廠;2 趟 × 4,500 = 9,000;利潤再掉到 −14,000
    truckShot: r3(A[11] - 0.15),
    drive: [r3(A[11] + 0.05), r3(when(11, '板車進場') + 0.25)],
    tripIn: when(11, '進場'), tripOut: when(11, '退場'),
    trips: when(11, '各一趟'), price: when(11, '四千五'), nine: r3(when(11, '四千五', 1) + 0.12),
    dearer: when(11, '比租一天'),
    drop2: [r3(when(11, '比租一天') + 0.35), r3(when(11, '還貴', 1) + 0.15)],
    // 12. 月曆:高空車停著不動的日子,計費表照樣跳
    calShot: r3(when(11, '車停在現場') - 0.15),
    days: [r3(when(11, '車停在現場') + 0.25), r3(E[11] + 0.25)],
    // 13. 「不要急著哭。這還只是第一行。」師傅拍拍阿樹肩膀,阿樹眼眶含淚定格
    patShot: r3(A[12] - 0.15),
    pat: [when(12, '不要'), when(12, '急著哭', 1)],
    freeze: r3(E[12] + 0.12),
    // 14. 會勘路線三格:大門口卸貨區/既有主管與關斷閥/入廠安全訓練公告,每一格跳出「?元」
    panels: r3(when(13, '那天一路') - 0.2),
    route: [when(13, '那天一路'), when(13, '走下去', 1)],
    frames: when(13, '後面又排了'),
    p1: when(13, '材料只能'), q1: r3(when(13, '大門口', 1) + 0.1),
    p2: when(13, '新管要接上'), stopGas: when(13, '得先停氣'), q2: r3(when(13, '停氣', 1) + 0.1),
    p3: when(13, '工人進廠'), q3: r3(when(13, '一整天的課', 1) + 0.1),
    end: r3(E[13] + 0.3),
  };
  // 計費表:十個工作天依序跳(停著沒用的那幾天也照樣跳)
  ev.dayT = Array.from({ length: 10 }, (_, k) => r3(ev.days[0] + (ev.days[1] - ev.days[0]) * k / 9));

  const { chords, chordAt } = makeChords(clock, {
    Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' }, Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' },
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['Dm', 'Bb', 'F', 'C'][b % 4]]));
  const markers = {
    ch2: { t: ev.ch2 + 0.6, sync: 'a' }, walk: r3(A[0] + 2.5), offer: ev.offer, lookUp: r3(ev.lookUp + 0.5), ask1: r3(A[1] + 0.5), shuUp: r3(ev.shuUp + 0.6),
    wide: r3(A[3] + 0.2), tilt: r3((ev.tilt[0] + ev.tilt[1]) / 2), tiltTop: ev.tilt[1], ruler: r3(ev.ruler[0] + 0.5), six: { t: ev.six, sync: 'av' }, crownTilt: r3(ev.crownTilt + 0.3),
    turn: r3(ev.turn + 0.4), qEnd: r3(E[5] + 0.2), flip1: r3(ev.flip1 + 0.2), split: { t: ev.split, sync: 'av' }, splitOpen: r3(ev.split + 0.6),
    tiny: r3(ev.tiny + 0.4), card8: r3(ev.card8 + 0.5), xmark: { t: ev.xmark, sync: 'av' }, xmarkDone: r3(ev.xmark + 0.5),
    figA: r3(ev.figA + 0.5), scafOK: r3(ev.scafOK + 0.3), liftOK: r3(ev.liftOK + 0.3), calc: r3(ev.calc[2] + 0.5),
    hi20: r3(ev.hi20 + 0.2), chip: ev.chip, fallEnd: { t: ev.fall[1], sync: 'av' }, crownFall: r3(ev.crownFall + 0.7),
    truck: r3(ev.drive[0] + 1.0), trips: r3(ev.nine + 0.3), dearer: r3(ev.dearer + 0.4), drop2: r3(ev.drop2[1] + 0.3),
    cal: r3(ev.calShot + 0.6), days: ev.dayT[5], daysEnd: r3(ev.days[1] + 0.3),
    pat: r3(ev.pat[0] + 0.3), freeze: { t: ev.freeze, sync: 'av' }, freezeHold: r3(A[13] + 0.8),
    panels: r3(ev.panels + 0.7), frames: r3(ev.frames + 0.8), q1: r3(ev.q1 + 0.4), q2: r3(ev.q2 + 0.4), q3: r3(ev.q3 + 0.4), end: ev.end, last: r3(DURATION - 0.05),
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, DUR, PH, vo, ev, markers, LINES, CHAPTER, when };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
