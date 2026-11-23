// 配樂與配音。  PATH=../../tools:$PATH PIPER_MODEL=zh-TW node song.js
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
const mar = (n, t, g = 0.3) => { const b = I.marimba(m(n), { decay: 0.5 }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.35); };
const coin = (t, p = 1, g = 0.16) => { fx.addMono(I.bell(2650 * p, 0.07, 1.5, 2.71), t, g); fx.addMono(I.bell(3980 * p, 0.05, 1.1, 2.13), t + 0.011, g * 0.6); };
const paper = (t, p = 1, g = 0.3, seed = 22) => fx.addMono(I.paperFwip(p, seed), t, g);
const pop = (t, p = 1900, g = 0.32) => fx.addMono(I.pop(p), t, g);
const step = (t, g = 0.2) => { fx.addMono(I.woodTick(0.42), t, g); fx.addMono(I.thud(70, 0.05), t, g * 0.5); };
const stamp = (t, g = 0.7) => { fx.addMono(I.thud(110, 0.1), t, g); fx.addMono(I.woodTick(0.6), t, g * 0.4); };

// ---- 1 辦公室:一大本合約落在桌上、利潤是綠色的 ----
fx.addMono(I.noiseSweep(0.25, 500, 1600, { q: 1, pink: true }), ev.folder - 0.22, 0.12);
fx.addMono(I.thud(85, 0.16), ev.folder, 0.95); fx.addMono(I.subBoom(0.6, 70, 40), ev.folder, 0.22); paper(ev.folder + 0.03, 0.7, 0.25);
pop(ev.report, 1500); paper(ev.report, 1.1, 0.28);
[0, 1, 2].forEach((k) => pop(ev.report + 0.25 + k * 0.16, 2100 + k * 300, 0.18));
chime(['C5', 'E5', 'G5', 'C6'], ev.profit, 0.08, 0.3); coin(ev.profit + 0.05, 1, 0.14); coin(ev.profit + 0.2, 1.12, 0.1);
// ---- 2 走過去、比讚 ----
ev.steps.forEach((t, k) => step(t, 0.18 - k * 0.015));
paper(ev.walk + 0.1, 0.9, 0.12);
pop(ev.thumb, 2300, 0.3); chime(['G5', 'C6'], ev.thumb + 0.08, 0.09, 0.24);
// ---- 3 老闆只問了一句 ----
fx.addMono(I.woodTick(1.0), ev.one, 0.2);
pop(ev.icon, 1700, 0.3);
[0, 0.42, 0.84, 1.26].forEach((d, k) => fx.addMono(I.woodTick(k % 2 ? 0.78 : 0.9), ev.icon + 0.2 + d, 0.14)); // 時鐘滴答
fx.addMono(I.bwomp(), ev.hush, 0.18);
// ---- 4 合約、時間軸往後拉 ----
paper(ev.open - 0.05, 0.8, 0.35); paper(ev.open + 0.12, 0.65, 0.3, 23);
fx.addMono(I.scribble(0.5), ev.clause1, 0.16);
fx.addMono(I.noiseSweep(1.1, 700, 1500, { q: 1.4, pink: true }), ev.line1, 0.07);
[0, 0.28, 0.56].forEach((d, k) => mar(['C5', 'D5', 'E5'][k], ev.accept - 0.3 + d, 0.26)); // 完工、驗收、請款
fx.addMono(I.scribble(0.5), ev.clause2, 0.16);
fx.addMono(I.noiseSweep(1.0, 300, 2400, { q: 2.2 }), ev.stretch, 0.12);       // 往後拉長
fx.addMono(I.whistle(0.5), ev.stretch + 0.25, 0.04);
fx.addMono(I.boing(), ev.land - 0.05, 0.18); coin(ev.land, 0.9, 0.18); mar('G5', ev.land, 0.3);
// ---- 5 帳單飛出來 ----
fx.addMono(I.noiseSweep(0.35, 400, 3000, { q: 0.8, pink: true }), ev.burst - 0.12, 0.18);
[0, 0.05, 0.1, 0.16, 0.22, 0.3].forEach((d, k) => paper(ev.burst + d, 0.7 + k * 0.12, 0.26, 40 + k));
paper(ev.mat, 0.8, 0.3); stamp(ev.mat + 0.75, 0.55);                               // 材料:下個月付(蓋章)
ev.wages.forEach((t, k) => { paper(t, 1 + k * 0.08, 0.24, 50 + k); pop(t + 0.42, 1500 - k * 90, 0.2); });
// ---- 6 兩條時間軸 ----
mar('D5', ev.out, 0.32); mar('A4', ev.out + 0.18, 0.24);
mar('G5', ev.in, 0.32); coin(ev.in + 0.1, 1, 0.12);
fx.addMono(I.noiseSweep(0.8, 300, 900, { q: 0.9, pink: true }), ev.gap, 0.14);
{ const b = I.musicBox(m('D4'), { decay: 2.2 }); bells.addMono(b, ev.gap + 0.05, 0.3); verb.addMono(b, ev.gap + 0.05, 0.25); }
[0, 0.1, 0.2].forEach((d, k) => paper(ev.months + d, 1.2 + k * 0.1, 0.14, 60 + k)); // 月曆翻頁
// ---- 7 空白變紅、存錢筒見底、停工 ----
[0, 0.5].forEach((d) => { fx.addMono(I.bell(880, 0.25, 1.2, 1.0), ev.red + d, 0.12); fx.addMono(I.bell(660, 0.25, 1.2, 1.0), ev.red + d + 0.22, 0.12); });
for (let k = 0; k < 14; k++) coin(ev.pour + 0.25 + k * 0.105 + (k % 3) * 0.02, 0.9 + (k % 4) * 0.07, 0.11);
[0, 0.16, 0.32, 0.5].forEach((d, k) => fx.addMono(I.shaker(0.5), ev.empty + 0.25 + d, 0.22 - k * 0.03)); // 搖一搖,沒有聲音
fx.addMono(I.tom(150, 0.18), ev.empty + 0.08, 0.3);
stamp(ev.empty + 0.95, 0.5);                                                       // 見底
fx.addMono(I.subBoom(1.6, 58, 30), ev.stall, 0.32);
fx.addMono(I.noiseSweep(1.8, 250, 500, { q: 0.7, pink: true }), ev.stall + 0.1, 0.05); // 空蕩蕩的工地
stamp(ev.halt, 0.65);
// ---- 8 休息區:師傅 ----
fx.addMono(I.bell(3200, 0.05, 1.2, 2.2), ev.rest + 0.45, 0.12);                   // 杯子放下
pop(ev.card1, 1600, 0.26); fx.addMono(I.scribble(0.3), ev.card1 + 0.45, 0.14);
pop(ev.card2, 2000, 0.26); fx.addMono(I.scribble(0.45), ev.card2 + 0.5, 0.12); chime(['A4', 'D5'], ev.card2 + 0.6, 0.1, 0.18);
// ---- 9 按月收支表 ----
for (let k = 0; k < 9; k++) fx.addMono(I.woodTick(1.6 + (k % 3) * 0.12), ev.desk + 0.35 + k * 0.11, 0.07); // 打字
fx.addMono(I.noiseSweep(0.4, 600, 2600, { q: 1 }), ev.table - 0.2, 0.12); pop(ev.table + 0.15, 1800, 0.3);
['A5', 'G5', 'F5', 'E5', 'D5'].forEach((n, k) => mar(n, ev.pay + k * 0.24, 0.2));
mar('C6', ev.recv + 0.55, 0.3); coin(ev.recv + 0.6, 1, 0.12);
for (let k = 0; k < 8; k++) fx.addMono(I.woodTick(1.2 + k * 0.05), ev.cum + k * 0.07, 0.08);
pop(ev.worst, 1300, 0.3); fx.addMono(I.tom(120, 0.2), ev.worst, 0.24);
// ---- 10 結尾卡 ----
pop(ev.card, 1800, 0.32);
pop(ev.line2, 2200, 0.28);
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
// 安靜的時刻:老闆問完、案子停了。音樂收到幾乎沒有,下一幕才慢慢回來
const dip = (t, t0, t1, back, low) => (t < t0 - 0.05 ? 1 : t < t0 + 0.1 ? 1 - (1 - low) * (t - t0 + 0.05) / 0.15 : t < t1 ? low : Math.min(1, low + (1 - low) * (t - t1) / back));
const hush = (t) => Math.min(dip(t, ev.hush, ev.open, 1.4, 0.12), dip(t, ev.stall, ev.rest + 0.4, 2.0, 0.08));
music.forEach((b) => b.applyGain(hush));
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
