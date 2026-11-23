// L003 第 3 單元時間軸:每句的起點由實際語音長度排出,畫面事件對到「念到哪個字」。畫面與聲音共用這一份。
// 第 2 單元以後:t = 0 就是章卡(1.2 秒,硬切進、硬切出),章卡後 0.35 秒開始第一句。
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
  // 句子念完後多停一下(秒):畫完樓房外框、遞筆、樓房塌掉、第四層閃爍、六層打勾、錢漏出去、恍然大悟
  const HOLD = { 0: 0.5, 1: 0.3, 2: 0.15, 3: 1.25, 4: 0.1, 5: 0.15, 6: 0.25, 7: 0.95, 8: 0.9, 9: 0.7, 10: 0.6, 11: 0.15 };
  const A = [], E = [];
  let t = CHAPTER + 0.35;
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

  const vo = LINES.map((l, i) => ({ at: A[i], text: l.text, who: l.who, voice: l.voice, ...(l.display ? { display: l.display } : {}) }));
  const ev = {
    ch3: 0,                                          // 第 3 章章卡(0–1.2 秒)
    // 第 1 句:回到公司,白板上畫一棟六層樓
    walk: [r3(CHAPTER - 0.1), r3(A[0] + 1.9)],       // 兩人走到白板前
    notScold: when(0, '沒有罵他'),                   // 阿樹縮一下,師傅沒有罵他
    draw0: r3(when(0, '只在') - 0.15),               // 切到白板特寫:師傅的手拿馬克筆
    draw: [when(0, '白板上'), r3(E[0] + 0.3)],       // 畫出六格疊起來的樓房外框
    // 第 2 句:成本是一層一層蓋上去的。你蓋了幾層?(把筆遞給阿樹)
    layers: [when(1, '一層一層'), when(1, '蓋上去', 1)],
    offer: when(1, '你蓋了'),
    take: r3(E[1] + 0.05),
    // 第 3 句:阿樹填上四格,中間兩格空著
    write0: r3(A[2] - 0.15),
    w: [[when(2, '材料'), when(2, '材料', 1)], [when(2, '工資'), when(2, '工資', 1)], [when(2, '利潤'), when(2, '利潤', 1)], [when(2, '稅'), when(2, '稅', 1)]],
    hover: [when(2, '……'), when(2, '利潤')],        // 筆在第三、四層上面猶豫
    four: when(2, '四層'),
    // 第 4 句:中間空兩層,房子當然會塌
    gap: when(3, '中間空兩層'),
    fall: when(3, '塌'),
    // 第 5–8 句:【圖 B】由下往上一層一層亮起
    figB: r3(A[4] - 0.2),
    f: [when(4, '第一層'), when(4, '第二層'), when(5, '第三層'), when(6, '第四層'), when(7, '第五層'), when(7, '第六層')],
    n: [when(4, '材料'), when(4, '工資'), when(5, '機具與耗材'), when(6, '間接費用'), when(7, '管理費與利潤'), when(7, '稅')],
    i1: [when(4, '管子'), when(4, '管件'), when(4, '閥'), when(4, '吊架')],
    i2: [when(4, '誰來做'), when(4, '做幾天')],
    i3: [when(5, '高空車'), when(5, '焊機'), when(5, '氬氣')],
    i4: [when(6, '搬運'), when(6, '保護'), when(6, '測試'), when(6, '文件'), when(6, '現場管理'), when(6, '保險')],
    leave: when(6, '不會留在'),                       // 六個圖示變淡:不會留在客戶的廠裡
    money: when(6, '每一樣'),                         // 每一樣都要花錢:一個一個冒出錢幣
    done: r3(when(7, '稅', 1) + 0.12),               // 屋頂蓋上,整棟樓完成
    miss: when(7, '整層不見'),                        // 第四層變成半透明虛線,閃爍
    miss4: when(7, '是第四層'),
    // 第 9 句:內部成本表 vs 給客戶的報價單
    cmp: r3(A[8] - 0.15),
    self: when(8, '自己算成本用的'),
    client: when(8, '給客戶的那一張'),
    format: when(8, '照客戶的格式寫'),
    fewer: when(8, '行數可以少'),
    all: when(8, '但是裡面'),
    check: when(8, '一定要算過'),
    // 第 10 句:公共工程標單 vs 民間報價單
    pub: r3(A[9] - 0.15),
    safety: when(9, '安全衛生'), qc: when(9, '品管'),
    priv: when(9, '民間的報價單'), none: when(9, '常常沒有'),
    hole: when(9, '沒有那一行'), leak: when(9, '不代表'),
    // 第 11 句:管理費跟利潤是兩件事(第五層切成兩半)
    back: r3(A[10] - 0.15),
    split: when(10, '兩件事'),
    mgmt: when(10, '管理費是'),
    profit: when(10, '利潤才是'),
    oneLine: when(10, '寫成同一行'),
    yours: when(10, '你就會以為'),
    aha: r3(E[10] + 0.05),                           // 阿樹恍然大悟
    // 第 12 句:阿樹指著自己報價單上的 20,000
    quote: r3(A[11] - 0.12),
    point: when(11, '那一成'),
    tap: when(11, '有算啊'),
    // 第 13 句:一成是乘在誰上面?下面四層縮水,上面兩層跟著變窄
    ask: r3(A[12] - 0.15),
    times: when(12, '乘在'),
    who: when(12, '誰上面'),
    shrinkCut: r3(when(12, '底下少算') - 0.2),
    shrink: when(12, '少算'),
    narrow: when(12, '上面那一成'),
    end: r3(E[12] + 0.3),
  };
  const seq = (t0, n, dt) => Array.from({ length: n }, (_, k) => r3(t0 + k * dt));
  ev.coins4 = seq(ev.money + 0.05, 6, 0.13);         // 第四層六個圖示一個一個冒出錢幣
  ev.rows = seq(ev.format + 0.1, 6, 0.26);           // 給客戶的報價單:四行 + 稅 + 含稅總價,一行一行寫出來
  ev.wave = seq(ev.fewer + 0.15, 6, 0.3);            // 六層的錢一層一層飛進右邊的幾行(每層一波)
  ev.land = ev.wave.map((x) => r3(x + 0.6));
  ev.stamp = r3(Math.max(ev.land[5] + 0.3, ev.all + 0.3)); // 「一毛不少」章
  ev.ticks = seq(ev.check + 0.1, 6, 0.17);           // 一定要算過:六層由下往上打勾

  // ---------- 白板上的六層樓外框:馬克筆一筆一筆畫(畫面與筆聲共用) ----------
  // 樓房自己的座標:寬 400(x -200..200)、每層 80、地面在 y = 0(往上是負的)
  const OUTLINE = [
    [[-200, 0], [-200, -480], [200, -480], [200, 0]],   // 左牆、頂、右牆
    [[262, 0], [-262, 0]],                                // 地面線
    [[-200, -80], [200, -80]], [[200, -160], [-200, -160]], [[-200, -240], [200, -240]], [[200, -320], [-200, -320]], [[-200, -400], [200, -400]], // 樓板
    [[214, -480], [214, -497], [-214, -497], [-214, -480]], // 屋頂女兒牆
    [[-96, -497], [-96, -512], [-86, -512], [-86, -544], [-160, -544], [-160, -512], [-150, -512], [-150, -497]], // 水塔
  ];
  const plen = (P) => P.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
  const LIFT = 70; // 筆抬起來移到下一筆的距離(換成時間)
  const OL = OUTLINE.map(plen), OTOT = OL.reduce((a, b) => a + b, 0) + LIFT * (OUTLINE.length - 1);
  const strokeT = [];
  { let acc = 0; const [d0, d1] = ev.draw; OUTLINE.forEach((P, k) => { const a = d0 + (d1 - d0) * acc / OTOT; acc += OL[k]; strokeT.push([r3(a), r3(d0 + (d1 - d0) * acc / OTOT)]); acc += LIFT; }); }
  const outline = { paths: OUTLINE, lens: OL, lift: LIFT, total: OTOT, times: strokeT };

  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F2' }, Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Bb: { notes: ['D4', 'F4', 'Bb4'], bass: 'Bb1' }, C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
  }, Array.from({ length: BARS }, (_, b) => [b, 0, 4, ['F', 'Dm', 'Bb', 'C'][b % 4]]));
  const markers = {
    ch3: { t: 0.02, sync: 'a' }, walk: ev.walk[0] + 0.6, notScold: ev.notScold, draw0: ev.draw0, draw: ev.draw[0] + 1.2, drawn: ev.draw[1],
    layers: ev.layers[0] + 0.3, offer: ev.offer, take: ev.take, write0: ev.write0, w1: ev.w[0][1], hover: ev.hover[0] + 0.2, w4: ev.w[3][1], four: ev.four,
    gap: ev.gap + 0.3, fall: { t: ev.fall, sync: 'v' }, fallen: ev.fall + 0.8,
    figB: ev.figB, f1: ev.i1[3] + 0.2, f2: ev.i2[1] + 0.3, f3: ev.i3[2] + 0.3, f4: ev.i4[5] + 0.3, leave: ev.leave + 0.4, money: ev.money + 1.0,
    f5: ev.n[4] + 0.4, done: ev.done + 0.3, miss: ev.miss + 0.5, miss4: ev.miss4 + 0.6,
    cmp: ev.cmp + 0.5, self: ev.self, client: ev.client + 0.4, format: ev.format + 1.2, fewer: ev.fewer + 1.0, all: ev.all + 0.8, check: ev.check + 1.4,
    pub: ev.pub + 0.5, safety: ev.safety + 0.3, qc: ev.qc + 0.3, none: ev.none + 0.4, hole: ev.hole + 0.3, leak: ev.leak + 1.2,
    back: ev.back + 0.3, split: ev.split + 0.5, mgmt: ev.mgmt + 0.5, profit: ev.profit + 0.5, yours: ev.yours + 0.5, aha: ev.aha + 0.3,
    quote: ev.quote + 0.3, point: ev.point + 0.3, tap: ev.tap + 0.2,
    ask: ev.ask + 0.4, times: ev.times + 0.4, who: ev.who + 0.4, shrinkCut: ev.shrinkCut + 0.3, shrink: ev.shrink + 0.8, narrow: ev.narrow + 0.9, end: ev.end,
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, BARS, clock, T, BEAT, m, chords, chordAt, A, E, DUR, PH, vo, ev, markers, LINES, CHAPTER, when, outline };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
