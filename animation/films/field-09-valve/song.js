// 配樂與配音。  PATH=../../tools:$PATH PIPER_MODEL=zh-TW node song.js
const path = require('path');
const { SR, Bus, reverb, Sine } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { DURATION, BARS, m, ev, clock, chordAt, A, E } = sc;
const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus(), amb = bus();
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.8 });

// ---------- 自己合成的幾個聲音 ----------
const env = (i, n, a, r) => Math.min(1, i / Math.max(1, a * SR), (n - i) / Math.max(1, r * SR));
function tone(freq, dur, { a = 0.004, r = 0.03, harm = 0.25, vib = 0 } = {}) { // 嗶:正弦 + 一點三次諧波
  const n = Math.ceil(dur * SR), out = new Float32Array(n), o1 = new Sine(), o3 = new Sine();
  for (let i = 0; i < n; i++) { const f = freq * (1 + vib * Math.sin(i / SR * 2 * Math.PI * 6)); out[i] = (o1.next(f) + harm * o3.next(3 * f)) * env(i, n, a, r); }
  return out;
}
function hum(dur, { f = 100, g = 1 } = {}) { // 日光燈的嗡嗡聲
  const n = Math.ceil(dur * SR), out = new Float32Array(n), a = new Sine(), b = new Sine(0.3);
  for (let i = 0; i < n; i++) out[i] = g * (a.next(f) * 0.7 + b.next(2 * f) * 0.3) * env(i, n, 0.3, 0.05);
  return out;
}
const chime = (notes, t, step = 0.11, g = 0.32) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const clank = (t, pitch = 1, g = 0.3) => { fx.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.5); fx.addMono(I.woodTick(0.7 * pitch), t, g); verb.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.2); };
const clunk = (t, g = 1) => { // 閥轉到底:低沉的金屬「咚」
  fx.addMono(I.thud(150, 0.1), t, 0.7 * g); fx.addMono(I.woodTick(0.9), t, 0.5 * g);
  fx.addMono(I.bell(640, 0.12, 2.6, 2.7), t + 0.003, 0.32 * g); verb.addMono(I.bell(640, 0.12, 2.6, 2.7), t, 0.16 * g);
};
const squeak = (t, len, g = 0.12, f0 = 900, f1 = 1300) => fx.addMono(I.noiseSweep(len, f0, f1, { q: 6, pink: false }), t, g); // 把手轉動的摩擦聲
const step = (t, g = 0.22, p = 0.55) => { fx.addMono(I.woodTick(p), t, g); fx.addMono(I.thud(80, 0.05), t, g * 0.5); };
const tagHang = (t, g = 1) => { fx.addMono(I.paperFwip(1.3), t - 0.08, 0.22 * g); fx.addMono(I.bell(2300, 0.07, 1.4, 2.4), t, 0.18 * g); fx.addMono(I.woodTick(2.4), t, 0.22 * g); };

// ---------- 1 關閥 ----------
amb.addMono(I.noiseSweep(ev.shut + 0.25, 700, 760, { q: 0.8, pink: true, shape: (x) => Math.min(1, x * 8, (1 - x) * 14) }), 0, 0.05); // 管裡流動的聲音,關閥就停
amb.addMono(hum(ev.off - 0.05, { f: 100, g: 1 }), 0, 0.012);                                     // 燈還亮著的嗡嗡聲
fx.addMono(I.pop(0.9), ev.seg, 0.22);                                                          // 要換的那段管
fx.addMono(I.noiseSweep(0.25, 500, 1500, { q: 1.2, pink: true }), ev.reach, 0.08);
squeak(ev.close, ev.shut - ev.close, 0.1);
clunk(ev.shut);
// ---------- 2 換管、做完 ----------
for (let k = 0; k < 14; k++) fx.addMono(I.woodTick(2.0 + (k % 2) * 0.3), ev.work + 0.3 + k * 0.17 + Math.floor(k / 4) * 0.22, 0.18); // 扳手棘輪
for (let k = 0; k < 10; k++) fx.addMono(I.woodTick(3.2), ev.hour[0] + 0.15 + k * (ev.hour[1] - ev.hour[0] - 0.3) / 9, 0.08); // 時鐘快轉
chime(['C5', 'E5', 'G5'], ev.done, 0.09, 0.22);
fx.addMono(I.noiseSweep(0.35, 600, 1400, { q: 1, pink: true }), ev.wipe, 0.06);                 // 擦汗
clank(ev.pack, 1, 0.3);
// ---------- 3 收工具、簽完工單、下班、燈熄 ----------
clank(ev.lid + 0.22, 0.8, 0.34); fx.addMono(I.thud(110, 0.08), ev.lid + 0.22, 0.4); // 工具箱蓋上(蓋子 0.25 秒闔上)
fx.addMono(I.paperFwip(1.0), ev.sign - 0.05, 0.25);
fx.addMono(I.scribble(0.55), ev.scrib, 0.28);
fx.addMono(I.pop(1.2), ev.wave, 0.2);
[0, 0.4, 0.8].forEach((d, k) => step(ev.walk + d, 0.2 - k * 0.04));
fx.addMono(I.tvClick(), ev.off, 0.9); fx.addMono(I.woodTick(1.6), ev.off, 0.5);                  // 關燈
// ---------- 4 半夜,警報一台接一台 ----------
const alarmEnd = ev.freeze - 0.05;
ev.alarms.forEach((t0, k) => {
  const f = [988, 932, 1047, 880, 1109][k];
  for (let t = t0, j = 0; t < alarmEnd; t += 0.62, j++) {
    const far = t > ev.search ? 0.3 : 1; // 切到找原因之後,警報聲變遠
    const g = (j === 0 ? 0.2 : 0.11) * far;
    fx.addMono(tone(f, 0.16, { harm: 0.35 }), t, g, -0.6 + k * 0.3);
    fx.addMono(tone(f * 0.8, 0.16, { harm: 0.35 }), t + 0.2, g * 0.9, -0.6 + k * 0.3);
  }
});
amb.addMono(I.noiseSweep(ev.freeze - ev.night, 120, 140, { q: 0.7, pink: true, shape: (x) => Math.min(1, x * 6, (1 - x) * 30) }), ev.night, 0.05); // 半夜機房的低頻
{ const d = ev.day - 0.3 - ev.search, p1 = I.padNote(m('D3'), d, { cutoff: 520, attack: 1.2, release: 1.4 }), p2 = I.padNote(m('A2'), d, { cutoff: 480, attack: 1.2, release: 1.4 }); // 找的時候:很低的長音
  amb.addStereo(p1.L, p1.R, ev.search, 0.10); amb.addStereo(p2.L, p2.R, ev.search, 0.08); }
// ---------- 5 值班的人拿手電筒找 ----------
fx.addMono(I.tvClick(), ev.search + 0.2, 0.35);                                                // 手電筒開關
{ const t0 = ev.search + 0.15, t1 = ev.stop - 0.1, every = 150 / (610 / (t1 - t0)); // 跟畫面的步伐一致:每 150 px 一步
  for (let t = t0 + every * 0.5; t < t1; t += every) step(t, 0.13, 0.5); }
for (let k = 0; k < 16; k++) fx.addMono(I.woodTick(3.4), ev.hours[0] + k * (ev.hours[1] - ev.hours[0]) / 15, 0.07); // 兩個小時
// ---------- 6 那顆手閥還關著(定格) ----------
fx.addMono(I.noiseSweep(0.35, 400, 1600, { q: 1.2, pink: true }), ev.spot, 0.12);
fx.addMono(I.tvClick(), ev.freeze, 0.55);
fx.addMono(I.subBoom(1.2, 70, 40), ev.freeze, 0.35);
{ const b = I.musicBox(m('D4'), { decay: 2.4 }); bells.addMono(b, ev.freeze + 0.05, 0.3); verb.addMono(b, ev.freeze + 0.05, 0.22); }
// ---------- 7 隔天,遞牌子 ----------
fx.addMono(I.paperFwip(0.8), ev.day - 0.25, 0.3);
fx.addMono(I.paperFwip(1.1), ev.give, 0.22);
fx.addMono(I.paperFwip(1.4), ev.take, 0.18);
fx.addMono(I.pop(1.0), ev.blank, 0.25); chime(['A4'], ev.blank + 0.05, 0.1, 0.2);
// ---------- 8 師傅:三件事 ----------
ev.say.forEach((t, k) => { fx.addMono(I.pop(1 + k * 0.1), t, 0.2); });
// ---------- 9 掛牌、紀錄、復歸 ----------
fx.addMono(I.paperFwip(0.9), ev.from - 0.25, 0.28);
tagHang(ev.tag1); tagHang(ev.tag2);
fx.addMono(I.paperFwip(1.2), ev.table, 0.25);
ev.rows.forEach((t, k) => { fx.addMono(I.pop(1.1), t, 0.2); chime([['C5'], ['E5']][k], t + 0.02, 0.1, 0.16); });
squeak(ev.drainShut, 0.4, 0.08, 1200, 1500); clunk(ev.drainShut + 0.42, 0.6);
fx.addMono(I.bell(1760, 0.18, 1.2, 2.0), ev.look + 0.3, 0.12);                                // 看一眼接頭:沒問題
squeak(ev.open[0], ev.open[1] - ev.open[0], 0.06, 700, 900);                                  // 慢慢開
amb.addMono(I.noiseSweep(DURATION - ev.open[0], 700, 760, { q: 0.8, pink: true, shape: (x) => Math.min(1, x * (DURATION - ev.open[0]) / 1.8) * Math.min(1, (1 - x) * 6) }), ev.open[0], 0.045); // 水又流起來
fx.addMono(I.paperFwip(1.5), ev.collect, 0.22); fx.addMono(I.paperFwip(1.7), ev.collect + 0.12, 0.18);
ev.ticks.forEach((t, k) => chime([['C5', 'G5'], ['E5', 'C6']][k], t, 0.07, 0.22));
// ---------- 10 結尾卡 ----------
ev.card.forEach((t, k) => fx.addMono(I.pop(1.0 + k * 0.12), t, 0.26));
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
// 燈熄:音樂收掉;半夜只剩警報與低頻;定格之後安靜一下;隔天音樂慢慢回來
const ramp = (t, t0, t1, a, b) => (t <= t0 ? a : t >= t1 ? b : a + (b - a) * (t - t0) / (t1 - t0));
const hush = (t) => {
  if (t < ev.off - 0.02) return 1;
  if (t < ev.day - 0.6) return ramp(t, ev.off - 0.02, ev.off + 0.06, 1, 0.0);
  return ramp(t, ev.day - 0.6, ev.day + 2.2, 0.0, 1);
};
music.forEach((b) => b.applyGain(hush));
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, amb, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, amb: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
