// 配樂與配音。  node song.js
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { DURATION, BARS, m, ev, clock, chordAt, A, E } = sc;
const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus();
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.8 });
const chime = (notes, t, step = 0.11, g = 0.32) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const note = (n, t, g = 0.3, decay = 1.4) => { const b = I.musicBox(m(n), { decay }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.5); };
const step = (t, g = 0.22) => { fx.addMono(I.thud(150, 0.028), t, g); fx.addMono(I.woodTick(0.45), t, g * 0.35); }; // 辦公室地板上的腳步
const slide = (t, g = 1) => { // 一疊紙滑過去
  fx.addMono(I.noiseSweep(0.38, 900, 3800, { q: 0.7, pink: true }), t - 0.05, 0.2 * g);
  fx.addMono(I.paperFwip(0.85), t, 0.42 * g); fx.addMono(I.paperFwip(1.15, 29), t + 0.09, 0.3 * g);
  fx.addMono(I.thud(115, 0.06), t + 0.16, 0.34 * g);
};
const whoosh = (t, len = 0.3, g = 0.16) => fx.addMono(I.noiseSweep(len, 450, 2600, { q: 1.0, pink: true }), t - len / 2, g);
const tick = (t, k) => { // 打勾:清楚的「答」,一項比一項高
  fx.addMono(I.woodTick(1.25 + k * 0.05), t, 0.5); fx.addMono(I.bell(2300 + k * 180, 0.09, 1.3, 2.0), t + 0.003, 0.16);
  note(['F4', 'A4', 'C5', 'D5', 'F5'][k], t + 0.02, 0.3);
};

// 0:課長,抱著一疊資料走過去,交到她手上,轉身就走
fx.addMono(I.pop(1500), ev.chief, 0.32); chime(['C5', 'F5'], ev.chief + 0.05, 0.09, 0.2);
ev.steps.forEach((t) => step(t));
slide(ev.hand);
ev.out.forEach((t) => step(t, 0.18));
fx.addMono(I.pop(1300), ev.huh, 0.3); fx.addMono(I.woodTick(1.5), ev.huh + 0.02, 0.22);
// 1:三天後(翻過三張日子卡,她一直在打字)→ 交出成果 → 想像中的表格 → 實際拿到的清單:「bwomp」
whoosh(A[1] - 0.15, 0.3, 0.2);
for (let k = 0; k < 15; k++) fx.addMono(I.woodTick(0.8 + 0.35 * ((k * 0.618) % 1)), A[1] - 0.1 + k * 0.068, 0.07); // 打字聲
ev.days.forEach((t, k) => { fx.addMono(I.paperFwip(1.15 + k * 0.1, 40 + k), t, 0.45); fx.addMono(I.pop(1700 + k * 220), t + 0.01, 0.26); });
fx.addMono(I.paperFwip(0.8), ev.give, 0.36);
fx.addMono(I.paperFwip(1.0, 31), ev.take, 0.32);
chime(['C5', 'E5', 'G5', 'C6'], ev.dream, 0.09, 0.22);                         // 腦袋裡想的樣子
fx.addMono(I.pop(1100), ev.reveal, 0.34); fx.addMono(I.paperFwip(0.7, 33), ev.reveal, 0.3);
fx.addMono(I.bwomp(), ev.wrong, 0.55);                                        // 完全不是他要的
// 2:皺眉唸了兩句,怎麼會做成這樣?
fx.addMono(I.scribble(0.55), ev.grumble, 0.2);
fx.addMono(I.pop(1400), ev.why, 0.3);
[0.12, 0.42].forEach((d) => fx.addMono(I.thud(230, 0.022), ev.why + d, 0.3)); // 手指敲在紙上
// 4:阿樹愣住 → 倒帶回想 → 對話框只有七個字
fx.addMono(I.thud(70, 0.4), ev.freeze, 0.7);
fx.addMono(I.tvClick(), ev.freeze + 0.05, 0.4);
{ const len = ev.memory - ev.rewind + 0.06; fx.addMono(I.noiseSweep(len, 400, 4800, { q: 0.9, shape: (x) => x * x * x }), ev.rewind, 1.1); fx.addMono(I.noiseSweep(len, 900, 7000, { q: 1.6, shape: (x) => x * x }), ev.rewind, 0.5); } // 倒帶:越來越快,一口氣收掉
for (let k = 0; k < 12; k++) { const u = k / 12, t = ev.rewind + (ev.memory - ev.rewind) * (1 - (1 - u) * (1 - u)); fx.addMono(I.woodTick(1.5 + u), t, 0.18 + 0.2 * u); } // 磁帶捲動
fx.addMono(I.tvClick(), ev.memory, 0.28);
[['A4', 0.25], ['F4', 0.95], ['D4', 1.65], ['E4', 2.35]].forEach(([n, d]) => note(n, ev.memory + d, 0.2, 2.2)); // 回想裡的音盒
fx.addMono(I.pop(1600), ev.bubble, 0.34); fx.addMono(I.woodTick(1.2), ev.bubble + 0.01, 0.25);
ev.count.forEach((t, k) => fx.addMono(I.woodTick(1.0 + k * 0.08), t, 0.24));   // 一、二、三……七
fx.addMono(I.thwack(), ev.seven, 0.42); fx.addMono(I.thud(90, 0.1), ev.seven, 0.45);
// 5–6:休息區,師傅沖茶、倒一杯給阿樹;說話時頭也沒抬,說到最後才抬頭
whoosh(A[5] - 0.15, 0.5, 0.18); fx.addMono(I.paperFwip(0.9, 35), A[5] - 0.15, 0.3);
fx.addMono(I.noiseSweep(1.4, 900, 1500, { q: 2.2, pink: true }), ev.pour, 0.09);  // 沖熱水
fx.addMono(I.noiseSweep(ev.see - 0.5 - ev.cup, 1200, 1800, { q: 2.6, pink: true }), ev.cup + 0.12, 0.07); // 倒茶
fx.addMono(I.thud(170, 0.05), ev.see - 0.03, 0.3); fx.addMono(I.bell(1250, 0.12, 1.4, 2.2), ev.see - 0.02, 0.1); // 茶壺放回桌上
chime(['C5', 'E5', 'G5'], ev.cloud, 0.09, 0.18);
fx.addMono(I.pop(1300), ev.see, 0.3);
// 7–8:拿出小卡;五件事一項一項打勾
whoosh(A[7] - 0.15, 0.5, 0.18); fx.addMono(I.paperFwip(0.9, 37), A[7] - 0.15, 0.3);
fx.addMono(I.paperFwip(1.3, 38), ev.cardOut + 0.28, 0.42);
fx.addMono(I.pop(1500), ev.cardShow, 0.3); chime(['F5', 'A5'], ev.cardShow + 0.05, 0.1, 0.2);
whoosh(A[8] - 0.12, 0.34, 0.2);
ev.items.forEach((t, k) => fx.addMono(I.paperFwip(1.2 + k * 0.05, 50 + k), t, 0.26));
ev.ticks.forEach((t, k) => tick(t, k));
// 9:結尾卡
fx.addMono(I.pop(1200), ev.card[0], 0.3);
fx.addMono(I.thud(120, 0.06), ev.card[1], 0.36);
fx.addMono(I.thwack(), ev.card[2], 0.36);
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
// 結果不對:音樂跟著洩氣一下;阿樹愣住到回想結束:音樂幾乎停住,回到休息區才慢慢回來
const deflate = (t) => t < ev.wrong ? 1 : t < ev.wrong + 0.25 ? 1 - 0.55 * (t - ev.wrong) / 0.25 : t < A[2] ? 0.45 : t < A[2] + 0.8 ? 0.45 + 0.55 * (t - A[2]) / 0.8 : 1;
const hush = (t) => t < ev.freeze - 0.02 ? 1 : t < ev.freeze + 0.06 ? 1 - 0.9 * (t - (ev.freeze - 0.02)) / 0.08 : t < A[5] - 0.6 ? 0.1 : Math.min(1, 0.1 + 0.9 * (t - (A[5] - 0.6)) / 2.0);
music.forEach((b) => b.applyGain((t) => deflate(t) * hush(t)));
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
