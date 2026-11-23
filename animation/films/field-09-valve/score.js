// 第 9 集時間軸:每句旁白的起點由實際語音長度排出,畫面事件用 when() 對到「念到哪個字」。畫面與聲音共用這一份。
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
  const clock = makeClock({ bpm: 84, offset: 0 });
  const { T, BEAT } = clock;
  const r3 = (x) => +x.toFixed(3);
  const LEAD = 0.5, GAP = 0.3;
  // 多停的地方:關閥、做完、燈熄、警報一台接一台、找、定格在那顆閥、遞牌子、師傅說完、復歸的整個過程
  const EXTRA = { 0: 0.5, 1: 0.2, 2: 1.2, 3: 0.8, 4: 0.3, 5: 0.9, 6: 0.4, 7: 0.3, 8: 4.7 };
  const A = [], E = [];
  let t = LEAD;
  for (let i = 0; i < LINES.length; i++) { A.push(r3(t)); E.push(r3(t + DUR[i])); t += DUR[i] + GAP + (EXTRA[i] || 0); }
  const DURATION = r3(E[E.length - 1] + 2.6);
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
  const R = E[8]; // 第 9 句念完:開始復歸
  const ev = {
    // 1 阿樹要換一段管,先把上游的手閥關起來
    seg: when(0, '換一段管'),                 // 要換的那一段管:虛線框
    reach: when(0, '先把'),                   // 手伸到手閥
    close: when(0, '關起來'),                 // 開始轉
    shut: r3(when(0, '關起來') + 0.42),       // 轉到底:把手直立 = 關
    // 2 工作很順利,不到一小時就做完了
    work: r3(A[1] - 0.15),                    // 鎖法蘭
    hour: [r3(A[1] + 0.1), when(1, '做完了')], // 牆上的鐘走了 50 分
    done: when(1, '做完了'),                  // 新的那段管亮一下
    wipe: r3(when(1, '做完了') + 0.25),       // 擦汗
    pack: r3(E[1] + 0.05),                    // 扳手收進工具箱
    // 3 他收好工具,簽了完工單,下班
    lid: r3(A[2] + 0.55),                     // 工具箱蓋上
    sign: when(2, '簽了'),                    // 完工單
    scrib: r3(when(2, '完工單') + 0.05),       // 簽名
    wave: r3(when(2, '下班') - 0.15),          // 揮手
    walk: r3(when(2, '下班') + 0.3),           // 走出去(1.05 秒走出畫面)
    off: r3(when(2, '下班') + 1.45),           // 燈熄
    // 4 半夜,整排設備的警報一台接一台響起來
    night: r3(A[3] - 0.15),
    alarms: [0, 1, 2, 3, 4].map((k) => r3(when(3, '警報') + k * 0.42)),
    // 5 值班的人找了兩個小時,才找到原因
    search: r3(A[4] - 0.15),
    hours: [r3(A[4] + 0.2), when(4, '才找到')],  // 時鐘轉兩個小時
    stop: when(4, '原因'),                     // 停下來,光照向左邊
    // 6 那顆手閥,還關著
    spot: r3(A[5] - 0.15),                    // 光圈滑到那顆閥上
    freeze: when(5, '還關著'),                // 定格
    // 7 隔天師傅沒有罵人,只遞給他一張牌子
    day: r3(A[6] - 0.15),
    give: when(6, '只遞給他'),                 // 師傅把牌子遞出去
    take: when(6, '一張牌子'),                 // 阿樹接過來
    blank: r3(when(6, '一張牌子') + 0.3),      // 空白的牌子放大:姓名、時間、原因
    // 8 「你關的,寫你的名字。做完,你負責把它開回去,牌子你自己收。」
    speak: A[7],
    say: [when(7, '寫你的名字'), when(7, '你負責把它開回去'), when(7, '牌子你自己收')], // 三張小卡
    // 9 從此阿樹動過的每一顆閥,都有一張牌子,也都有一行紀錄
    from: r3(A[8] - 0.15),
    tag1: when(8, '每一顆閥'),                 // 關著的上游閥掛牌
    tag2: r3(when(8, '都有一張牌子') + 0.1),    // 打開的排放閥掛牌
    table: r3(when(8, '也都有') - 0.1),         // 紀錄表
    rows: [when(8, '一行'), r3(when(8, '一行') + 0.5)],
    // 念完之後:復歸(先關回排放閥 → 看接頭 → 慢慢開、有人看著 → 最後才收牌、打勾)
    restore: r3(R + 0.2),
    drainShut: r3(R + 0.45),                   // 排放閥關回去(0.45 秒)
    look: r3(R + 1.15),                        // 開閥前看一眼接頭
    open: [r3(R + 1.85), r3(R + 3.65)],        // 上游閥慢慢開(1.8 秒)
    collect: r3(R + 3.95),                     // 收牌
    ticks: [r3(R + 4.25), r3(R + 4.5)],        // 打勾
    // 10 誰關的誰開。動了就掛牌,做完要復原。
    card: [r3(A[9] + 0.05), when(9, '動了'), when(9, '做完')],
    end: r3(E[9] + 0.3),
  };
  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = {
    seg: ev.seg, reach: ev.reach, shut: { t: ev.shut, sync: 'a' }, work: ev.work, done: ev.done, pack: ev.pack, lid: ev.lid, sign: ev.sign,
    wave: ev.wave, off: { t: ev.off, sync: 'av' }, night: ev.night, alarm1: ev.alarms[0], alarm5: ev.alarms[4], search: ev.search, stop: ev.stop,
    spot: ev.spot, freeze: { t: ev.freeze, sync: 'av' }, day: ev.day, give: ev.give, take: ev.take, blank: ev.blank, speak: ev.speak,
    say1: ev.say[0], say2: ev.say[1], say3: ev.say[2], from: ev.from, tag1: ev.tag1, tag2: ev.tag2, table: ev.table, row2: ev.rows[1],
    restore: ev.restore, drainShut: ev.drainShut, look: ev.look, open: ev.open[0], opened: ev.open[1], collect: ev.collect, tick2: ev.ticks[1],
    card: ev.card[0], card3: ev.card[2], end: ev.end,
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, vo, ev, markers, LINES, when };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
