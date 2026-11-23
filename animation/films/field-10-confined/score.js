// 第 10 集時間軸:每句旁白的起點由實際語音長度排出,畫面事件用 when() 對到「念到哪個字」。畫面與聲音共用這一份。
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
  const clock = makeClock({ bpm: 76, offset: 0 });
  const { T, BEAT } = clock;
  const r3 = (x) => +x.toFixed(3);
  const LEAD = 0.5, GAP = 0.3;
  // 多停的地方:等、照到、被拉回來之後、師傅說完、看不見的東西、送風字卡、救援人員下去、手還在抖
  const EXTRA = { 0: 0.1, 1: 0.1, 3: 0.3, 4: 0.4, 5: 0.3, 6: 0.8, 7: 1.1, 8: 0.4 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(r3(t)); E.push(r3(t + DUR[i])); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = r3(E[E.length - 1] + 2.4);
  const BARS = Math.ceil(DURATION / (BEAT * 4));

  // ---------- 念到哪個字:when(句, '字串', 0 = 開始念 | 1 = 念完) ----------
  const PUNCT = /[，。？！：；、,.?!:;「」]/;
  const spoken = (s) => [...s].filter((ch) => !PUNCT.test(ch)).length;
  function when(i, sub, end = 0) {
    const text = LINES[i].text, c0 = text.indexOf(sub);
    if (c0 < 0) throw new Error(`score.js: 「${sub}」不在第 ${i + 1} 句裡`);
    const ci = end ? c0 + sub.length - 1 : c0;
    const ph = PH[i];
    let p0 = { c: -1, b: ph.on }, p1 = { c: text.length, a: ph.off };
    for (const mk of ph.marks) { if (mk.c < ci) p0 = mk; else { p1 = mk; break; } }
    const n = spoken(text.slice(p0.c + 1, p1.c)), k = spoken(text.slice(p0.c + 1, ci)) + (end ? 1 : 0);
    return r3(A[i] + p0.b + (p1.a - p0.b) * k / Math.max(1, n));
  }

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, voice: l.voice, ...(l.who ? { who: l.who } : {}) }));
  const ev = {
    // 1 同事下到槽裡檢查,一直沒有上來
    clock: when(0, '檢查'),                      // 時鐘卡:指針轉
    watch: when(0, '一直'),                      // 阿樹看錶
    call: when(0, '上來'),                       // 對著洞口喊(人站著,不探頭)
    // 2 阿樹拿手電筒往下一照,人倒在底下,一動也不動
    torch: when(1, '拿手電筒'),                  // 舉起手電筒
    on: when(1, '一照'),                         // 打開,光往下照
    tilt: [r3(when(1, '一照') + 0.35), when(1, '底下', 1)], // 鏡頭沿著光往下
    still: r3(when(1, '一動也不動') - 0.15),     // 切回阿樹的臉:驚慌
    // 3 他想都沒想,抓著梯子就要下去救人
    drop: r3(A[2] + 0.35),                       // 手電筒放下(掉在地上,不是掉進洞)
    rail: when(2, '抓著梯子'),                   // 抓住梯子的扶手
    step: when(2, '就要下去'),                   // 一腳踩上第一階
    freeze: when(2, '救人'),                     // 定格:頭還在洞口上面
    // 4 一隻手從後面把他整個人拉了回來
    reach: when(3, '一隻手'),                    // 師傅的手伸過來
    grab: r3(when(3, '從後面') + 0.12),          // 抓住安全帶
    pull: when(3, '把他整個人'),                 // 往後拉:腳離開梯子
    back: r3(when(3, '拉了回來') + 0.2),         // 兩人退離洞口
    // 5 「你下去,就是第二個。」
    speak: A[4],
    // 6 槽裡看起來什麼都沒有。可是讓人倒下的,就是那個看不見、也聞不到的東西
    calm: r3(A[5] - 0.15),
    eye: when(5, '看不見'),
    nose: when(5, '也聞不到'),
    sign: [when(5, '可是'), when(5, '東西', 1)],  // 缺氧警示慢慢浮現
    // 7 師傅做的第一件事,是喊人、通報,往裡面送新鮮空氣
    radio: r3(A[6] + 0.2),
    shout: when(6, '是喊人'),
    report: when(6, '通報'),
    blower: r3(when(6, '往裡面') - 0.35),        // 切到送風機:有人推過來
    duct: when(6, '往裡面'),                     // 風管伸進人孔
    fan: when(6, '送新鮮空氣'),                  // 送風機開始轉
    card7: r3(when(6, '送新鮮空氣') + 0.45),      // 字卡:送新鮮空氣,不送氧氣
    // 8 受過訓練的救援人員戴上空氣呼吸器、繫上救生索,才下去
    mask: r3(A[7] + 0.15),                       // 戴上全罩面罩
    maskOn: when(7, '空氣呼吸器'),
    back8: r3(when(7, '繫上救生索') - 0.15),      // 切到背面:氣瓶在背上
    clip: r3(when(7, '救生索') + 0.25),           // 救生索扣上:喀
    down: when(7, '才下去'),                     // 往下
    wide: r3(when(7, '才下去') + 0.1),
    // 9 很多意外,倒下的不只一個。後面那幾個,多半是想救人的人
    sit: r3(A[8] - 0.15),
    hands: when(8, '後面那幾個'),               // 推近:手還在抖
    // 10 看到有人倒在裡面,第一件事不是衝進去
    card: r3(A[9] + 0.05),
    card2: when(9, '第一件事'),
    card3: when(9, '不是'),
    small: r3(when(9, '不是') + 0.6),             // 小字:先通報、送新鮮空氣,等戴空氣呼吸器的人去救
    end: r3(E[9] + 0.6),
  };
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' }, F: { notes: ['F3', 'A3', 'C4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' }, G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['Am', 'F', 'C', 'G'][b % 4]]));
  const markers = {
    clock: ev.clock, call: ev.call, torch: ev.torch, on: { t: ev.on, sync: 'a' }, tilt: ev.tilt[0], still: ev.still,
    drop: ev.drop, rail: ev.rail, step: ev.step, freeze: { t: ev.freeze, sync: 'v' }, reach: ev.reach, grab: ev.grab, pull: ev.pull, back: ev.back, // 定格:音效刻意放輕壓在旁白底下,只驗畫面;抓住是連續動作,不當同步點
    speak: ev.speak, calm: ev.calm, eye: ev.eye, nose: ev.nose, sign: ev.sign[0], signFull: ev.sign[1],
    radio: ev.radio, shout: ev.shout, report: ev.report, blower: ev.blower, duct: ev.duct, fan: ev.fan, card7: ev.card7,
    mask: ev.mask, maskOn: ev.maskOn, back8: ev.back8, clip: { t: ev.clip, sync: 'a' }, down: ev.down, wide: ev.wide,
    sit: ev.sit, hands: ev.hands, card: ev.card, card2: ev.card2, card3: ev.card3, small: ev.small, end: ev.end,
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES, when };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
