// L003 第 3 單元的配樂、音效與配音。用法(在單元資料夾裡):
//   PATH=/home/user/rob60202-afk.github.io/animation/tools:$PATH PIPER_MODEL=zh-TW node song.js
// 長片的音量約定(animation/lib/LONGFORM.md):lofi 墊底比短片小聲,人聲一出來音樂再壓下去,母帶 -14 LUFS。
const path = require('path');
const U = require('./engine/util');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { DURATION, BARS, m, ev, clock, chordAt, A, E, CHAPTER, when, outline } = sc;
const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus();

// ---------- 墊底:安靜的 lofi ----------
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.75 });
// 音量包絡:a..b 之間降到 g(前後各有淡入淡出)
function dip(buses, a, b, g, fin = 0.15, fout = 0.3) {
  for (const B of buses) B.applyGain((t) => (t < a - fin || t > b + fout ? 1 : t < a ? 1 - (1 - g) * (t - (a - fin)) / fin : t <= b ? g : g + (1 - g) * (t - b) / fout));
}
const music = [drums, bass, pad, keys];
dip(music, 0, CHAPTER, 0, 0.01, 0.35);                      // 章卡:只有音樂盒和弦
dip([drums], CHAPTER, A[0] + 1.6, 0.35, 0.01, 0.8);          // 剛回到公司:鼓先輕一點
dip(music, A[3] - 0.1, ev.fall + 0.7, 0.12);                 // 「中間空兩層,房子當然會塌」到塌掉:音樂幾乎停
dip(music, ev.aha - 0.2, ev.aha + 0.5, 0.45, 0.1, 0.3);      // 恍然大悟那一下:讓燈泡的鈴聲被聽見

// ---------- 音效 ----------
const chime = (notes, t, step = 0.11, g = 0.3) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const note = (n, t, g = 0.26) => { const b = I.musicBox(m(n), { decay: 1.3 }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.5); };
const pop = (t, hz = 1900, g = 0.35) => fx.addMono(I.pop(hz), t, g);
const coin = (t, k = 0, g = 0.16) => { fx.addMono(I.ting(91 + (k % 3) * 2, { seed: 5 + k }), t, g); };
const whoosh = (t, g = 0.08) => fx.addMono(I.noiseSweep(0.35, 500, 2600, { q: 1.1, pink: true }), t - 0.15, g);
const SCALE = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5'];

// 章卡
fx.addMono(I.paperFwip(0.9), 0.02, 0.4);
chime(['C5', 'E5', 'G5', 'C6'], 0.02, 0.09, 0.34);
// 回到公司:兩個人的腳步;阿樹縮一下
for (let t = ev.walk[0] + 0.1, k = 0; t < ev.walk[1]; t += 0.29, k++) fx.addMono(I.woodTick(0.62 + (k % 2) * 0.07), t, 0.1);
fx.addMono(I.woodTick(1.3), ev.notScold, 0.12);
// 白板特寫:拔開筆蓋,一筆一筆畫樓房外框
pop(ev.draw0 + 0.15, 1400, 0.3);
outline.times.forEach(([a, b], k) => fx.addMono(I.scribble(Math.max(0.08, b - a), 31 + k), a, 0.16));
// 成本是一層一層蓋上去的:每一層亮起一個音
for (let k = 0; k < 6; k++) note(SCALE[k], ev.layers[0] + (ev.layers[1] - ev.layers[0]) * k / 6, 0.2);
fx.addMono(I.woodTick(1.1), ev.offer + 0.2, 0.25);           // 筆遞過去
pop(ev.take, 1500, 0.25);                                     // 阿樹接過筆
// 阿樹寫四格;寫到中間兩層停住、敲兩下筆
ev.w.forEach(([a, b], k) => { fx.addMono(I.scribble(Math.max(0.15, b - a + 0.1), 41 + k), a, 0.18); });
fx.addMono(I.woodTick(1.5), ev.hover[0] + 0.08, 0.14); fx.addMono(I.woodTick(1.5), ev.hover[0] + 0.28, 0.12);
for (let k = 0; k < 4; k++) pop(ev.four + k * 0.09, 1600 + k * 180, 0.2);
// 中間空兩層(紅框閃)、房子塌掉
fx.addMono(I.bwomp(), ev.gap + 0.25, 0.16);
fx.addMono(I.thud(70, 0.3), ev.fall, 0.85); fx.addMono(I.thwack(), ev.fall, 0.2);
fx.addMono(I.noiseSweep(0.7, 1400, 180, { q: 0.9, pink: true }), ev.fall - 0.16, 0.16); // 從開始往下掉就有聲音
for (let k = 0; k < 7; k++) fx.addMono(I.woodTick(0.5 + U.hash(k, 3) * 0.6), ev.fall + 0.08 + k * 0.07 + U.hash(k, 4) * 0.05, 0.12);
// 【圖 B】:推進去;一層一層亮起,每個小圖示一個 pop
whoosh(ev.figB, 0.08); fx.addMono(I.paperFwip(1.1), ev.figB, 0.3);
ev.f.forEach((t, k) => { note(SCALE[k], t, 0.24); pop(t, 2000, 0.18); });
[...ev.i1, ...ev.i2, ...ev.i3, ...ev.i4].forEach((t, k) => pop(t, 1500 + (k % 4) * 160, 0.2));
fx.addMono(I.noiseSweep(0.6, 2000, 500, { q: 1.2, pink: true }), ev.leave, 0.06); // 圖示變淡
ev.coins4.forEach((t, k) => coin(t, k, 0.14));                                      // 每一樣都要花錢
chime(['C5', 'F5', 'A5', 'C6'], ev.done, 0.08, 0.26);                               // 整棟樓完成
fx.addMono(I.bwomp(), ev.miss + 0.1, 0.2); fx.addMono(I.noiseSweep(0.5, 1200, 300, { q: 1.4, pink: true }), ev.miss, 0.06);
pop(ev.miss4 + 0.1, 900, 0.3);
// 內部成本表 → 給客戶的報價單
fx.addMono(I.paperFwip(1.0), ev.cmp + 0.15, 0.35);
fx.addMono(I.scribble(0.35, 51), ev.self + 0.05, 0.12);
fx.addMono(I.paperFwip(1.15), ev.client, 0.4); fx.addMono(I.scribble(0.4, 52), ev.client + 0.25, 0.1);
ev.rows.forEach((t, k) => note(SCALE[k + 1], t, 0.18));
ev.wave.forEach((t, k) => fx.addMono(I.noiseSweep(0.5, 900, 2400, { q: 1.4, pink: true }), t, 0.035));
ev.land.forEach((t, k) => coin(t, k, 0.15));
fx.addMono(I.thud(110, 0.2), ev.stamp, 0.6); fx.addMono(I.thwack(), ev.stamp, 0.22);
chime(['C5', 'E5', 'G5'], ev.stamp + 0.1, 0.1, 0.24);
ev.ticks.forEach((t, k) => { fx.addMono(I.scribble(0.12, 60 + k), t, 0.12); note(SCALE[2 + k], t + 0.05, 0.17); });
// 公共工程標單 vs 民間報價單:錢從破洞漏出去
fx.addMono(I.paperFwip(0.95), ev.pub + 0.15, 0.35); fx.addMono(I.paperFwip(1.1), ev.pub + 0.45, 0.3);
pop(ev.safety, 1800, 0.25); pop(ev.qc, 2000, 0.25);
fx.addMono(I.paperFwip(1.2), ev.priv, 0.25);
fx.addMono(I.bwomp(), ev.none + 0.1, 0.14);
fx.addMono(I.noiseSweep(0.3, 900, 3200, { q: 0.8 }), ev.hole, 0.1); fx.addMono(I.paperFwip(0.7), ev.hole + 0.05, 0.35);
for (let t = ev.leak, k = 0; t < A[10] - 0.3; t += 0.2 + U.hash(k, 7) * 0.12, k++) coin(t + 0.25, k, 0.1 * Math.max(0.35, 1 - (t - ev.leak) / 4));
// 管理費 | 利潤:紅筆切成兩半;恍然大悟
fx.addMono(I.scribble(0.4, 71), ev.split + 0.05, 0.16);
fx.addMono(I.scribble(0.35, 72), ev.mgmt + 0.05, 0.14); pop(ev.mgmt + 0.4, 1700, 0.18);
coin(ev.profit + 0.2, 1, 0.16);
chime(['C5', 'E5', 'G5', 'C6'], ev.aha, 0.07, 0.26);
// 阿樹的報價單:指著 20,000
fx.addMono(I.paperFwip(1.05), ev.quote + 0.05, 0.4);
pop(ev.point + 0.1, 2100, 0.2);
fx.addMono(I.woodTick(1.0), ev.tap, 0.3); fx.addMono(I.woodTick(1.0), ev.tap + 0.16, 0.25);
// 一成是乘在誰上面?下面縮水、上面跟著變窄
fx.addMono(I.scribble(0.4, 81), ev.times, 0.16);
fx.addMono(I.woodTick(1.6), ev.who + 0.3, 0.16);
whoosh(ev.shrinkCut, 0.08);
fx.addMono(I.noiseSweep(0.7, 1800, 380, { q: 1.5, pink: true }), ev.shrink, 0.09); fx.addMono(I.bwomp(), ev.shrink + 0.1, 0.18);
fx.addMono(I.noiseSweep(0.6, 2400, 700, { q: 1.5, pink: true }), ev.narrow, 0.08); note('C5', ev.narrow + 0.55, 0.16); note('A4', ev.narrow + 0.75, 0.14);

// ---------- 配音:每一句用自己的聲音(lines.js 的 voice) ----------
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
MIX.duck(music, vo.bus, { depth: 0.62, release: 0.35 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.34, bass: 0.48, pad: 0.6, keys: 0.55, fx: 0.9, bells: 0.8, voice: 2.2, verb: 0.45 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
mix.applyGain((t) => Math.min(1, t / 0.25));   // 開頭 0.25 秒淡入
MIX.fadeOut(mix, DURATION - 1.6, DURATION);     // 單元結尾 1.6 秒淡出(接下一個單元的章卡)
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
