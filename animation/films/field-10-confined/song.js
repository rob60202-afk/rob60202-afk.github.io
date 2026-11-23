// 配樂與配音。  PATH=../../tools:$PATH PIPER_MODEL=zh-TW node song.js
// 音樂要克制:發現有人倒下時音樂收掉,只留很低的長音;不用驚悚片的重擊與尖銳音效。
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
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus(), amb = bus(), drone = bus();
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.7 });

// ---------- 自己合成的幾個聲音 ----------
const env = (i, n, a, r) => Math.min(1, i / Math.max(1, a * SR), (n - i) / Math.max(1, r * SR));
function tone(freq, dur, { a = 0.004, r = 0.03, harm = 0.25 } = {}) { // 嗶:正弦 + 一點三次諧波
  const n = Math.ceil(dur * SR), out = new Float32Array(n), o1 = new Sine(), o3 = new Sine();
  for (let i = 0; i < n; i++) out[i] = (o1.next(freq) + harm * o3.next(3 * freq)) * env(i, n, a, r);
  return out;
}
function motor(dur, { f = 118, rise = 0.7, g = 1 } = {}) { // 電動送風機:馬達聲 + 風聲,開機時轉速慢慢上來
  const n = Math.ceil(dur * SR), out = new Float32Array(n), a = new Sine(), b = new Sine(0.3), c = new Sine(0.6);
  let seed = 7, lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR, k = Math.min(1, tt / rise), ff = f * (0.35 + 0.65 * k * k);
    seed = (seed * 16807) % 2147483647; const w = (seed / 2147483647) * 2 - 1; lp1 += (w - lp1) * 0.08; lp2 += (lp1 - lp2) * 0.08; // 風聲:兩次低通,不要嘶嘶的高頻
    out[i] = g * k * (a.next(ff) * 0.35 + b.next(2 * ff) * 0.22 + c.next(3.01 * ff) * 0.1 + lp2 * 3.2) * env(i, n, 0.05, 0.3);
  }
  return out;
}
const chime = (notes, t, step = 0.11, g = 0.3) => notes.forEach((nn, k) => { const b = I.musicBox(m(nn), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const clank = (t, pitch = 1, g = 0.3) => { fx.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.5); fx.addMono(I.woodTick(0.7 * pitch), t, g); verb.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.18); };
const step = (t, g = 0.2, p = 0.55) => { fx.addMono(I.woodTick(p), t, g); fx.addMono(I.thud(80, 0.05), t, g * 0.5); };
const click = (t, g = 1) => { // 掛鉤扣上:清楚的金屬「喀」
  fx.addMono(I.tvClick(), t, 0.8 * g); fx.addMono(I.woodTick(2.2), t, 0.55 * g);
  fx.addMono(I.bell(1900, 0.1, 2.6, 3.4), t + 0.004, 0.42 * g); fx.addMono(I.bell(3400, 0.06, 1.6, 2.2), t + 0.008, 0.26 * g);
  verb.addMono(I.bell(1900, 0.1, 2.6, 3.4), t + 0.004, 0.2 * g);
};
const padChord = (notes, t0, t1, g, cutoff = 700) => notes.forEach((nn) => { const p = I.padNote(m(nn), t1 - t0, { cutoff, attack: 1.2, release: 1.6 }); drone.addStereo(p.L, p.R, t0, g); });

// ---------- 1 等:廠房的環境聲、時鐘 ----------
amb.addMono(I.noiseSweep(DURATION, 180, 200, { q: 0.6, pink: true, shape: (x) => Math.min(1, x * 40, (1 - x) * 40) }), 0, 0.035); // 廠房的低頻環境聲
for (let t = ev.clock + 0.1, k = 0; t < E[0] + 0.3; t += 0.28, k++) fx.addMono(I.woodTick(k % 2 ? 2.6 : 3.0), t, 0.12);   // 時鐘
fx.addMono(I.pop(0.9), ev.clock, 0.18);
fx.addMono(I.pop(1.1), ev.call, 0.16);
// ---------- 2 手電筒 ----------
[0, 0.42].forEach((d) => step(A[1] - 0.1 + d, 0.18));
fx.addMono(I.noiseSweep(0.25, 500, 1500, { q: 1.2, pink: true }), ev.torch, 0.06);
fx.addMono(I.tvClick(), ev.on, 0.7); fx.addMono(I.woodTick(2.6), ev.on, 0.3);                     // 手電筒開關
fx.addMono(I.noiseSweep(ev.tilt[1] - ev.tilt[0] + 0.4, 900, 300, { q: 0.8, pink: true }), ev.tilt[0], 0.05); // 鏡頭往下(很輕)
// ---------- 3 抓梯子、一腳踩下去、定格 ----------
clank(ev.drop + 0.25, 1.3, 0.24); fx.addMono(I.woodTick(1.8), ev.drop + 0.33, 0.14);               // 手電筒放到地上
clank(ev.rail + 0.12, 1.0, 0.3);                                                                // 抓住扶手
clank(ev.step + 0.38, 0.8, 0.3);                                                                // 踩上第一階
fx.addMono(I.tvClick(), ev.freeze, 0.45);                                                       // 定格
// ---------- 4 拉回來 ----------
fx.addMono(I.noiseSweep(0.3, 400, 1600, { q: 1.2, pink: true }), ev.reach, 0.12);
fx.addMono(I.thud(130, 0.12), ev.grab, 0.7); fx.addMono(I.paperFwip(0.6), ev.grab + 0.02, 0.22);   // 抓住安全帶(布料)
fx.addMono(I.noiseSweep(0.45, 1200, 400, { q: 1, pink: true }), ev.pull, 0.12);                  // 往後拉
[0.15, 0.5, 0.85, 1.3, 1.75].forEach((d, k) => step(ev.pull + d, 0.16 - k * 0.015));              // 退開的腳步
// ---------- 6 槽裡:很安靜,只有很低的空氣聲 ----------
drone.addMono(I.noiseSweep(A[6] - ev.calm, 260, 240, { q: 0.5, pink: true, shape: (x) => Math.min(1, x * 6, (1 - x) * 10) }), ev.calm, 0.05);
fx.addMono(I.pop(0.8), ev.eye, 0.14); fx.addMono(I.pop(0.9), ev.nose, 0.14);
{ const b = I.musicBox(m('E4'), { decay: 3 }); bells.addMono(b, ev.sign[1] - 0.2, 0.16); verb.addMono(b, ev.sign[1] - 0.2, 0.16); }
// ---------- 7 無線電、送風機 ----------
fx.addMono(I.tvClick(), ev.radio + 0.25, 0.5);                                                  // 按下通話鍵
fx.addMono(tone(1180, 0.09), ev.radio + 0.3, 0.07); fx.addMono(tone(1480, 0.09), ev.radio + 0.42, 0.06);
fx.addMono(I.noiseSweep(0.35, 2400, 2000, { q: 2, pink: false }), ev.radio + 0.5, 0.04);          // 對講機的沙沙聲
fx.addMono(I.noiseSweep(0.35, 2200, 1800, { q: 2, pink: false }), ev.report, 0.04);
fx.addMono(I.noiseSweep(0.9, 300, 260, { q: 0.7, pink: true }), ev.blower - 0.25, 0.1);          // 輪子推過來
fx.addMono(I.paperFwip(0.5), ev.duct, 0.2); fx.addMono(I.paperFwip(0.4), ev.duct + 0.3, 0.16);  // 風管滑進人孔
fx.addMono(I.tvClick(), ev.fan - 0.05, 0.4);                                                    // 開關
amb.addMono(motor(DURATION - ev.fan, { f: 118, rise: 0.7 }), ev.fan, 0.04);                     // 送風機一直轉到最後
fx.addMono(I.pop(1.1), ev.card7, 0.26);
chime(['C5', 'E5'], ev.card7 + 0.15, 0.1, 0.18);
// ---------- 8 戴面罩、扣救生索、下去 ----------
fx.addMono(I.paperFwip(0.7), ev.mask, 0.2); fx.addMono(I.paperFwip(0.9), ev.mask + 0.85, 0.16);  // 面罩、頭帶
fx.addMono(I.noiseSweep(0.5, 5200, 4600, { q: 1.4, pink: false }), ev.maskOn, 0.035);            // 供氣閥接上:一聲輕輕的嘶
click(ev.clip);
chime(['A4', 'C5'], ev.clip + 0.3, 0.1, 0.18);
[0, 0.45, 0.9, 1.35].forEach((d, k) => clank(ev.down + 0.35 + d, 0.9 + (k % 2) * 0.08, 0.2));   // 踩梯子
for (let t = ev.down + 0.4, k = 0; t < A[8] + 1.2; t += 0.16, k++) fx.addMono(I.woodTick(3.2), t, 0.05 + (k % 3 === 0 ? 0.02 : 0)); // 捲揚器的棘輪
// ---------- 10 結尾 ----------
fx.addMono(I.pop(1.0), ev.card, 0.22); fx.addMono(I.pop(1.1), ev.card2, 0.2); fx.addMono(I.pop(1.2), ev.card3, 0.22);
chime(['A4', 'C5', 'E5', 'A5'], ev.end, 0.14, 0.3);

// ---------- 長音:出事之後音樂收掉,只留這個 ----------
padChord(['A2', 'E3'], ev.on - 0.2, A[6] + 1.0, 0.07, 520);
padChord(['C3', 'G3'], A[8] - 0.3, A[9] + 0.4, 0.06, 600);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
// 音樂的音量:開頭輕輕的;手電筒一亮就收掉;救援開始(送風機)才慢慢回來,鼓不回來;第 9 句又變薄;結尾回來
const ramp = (t, t0, t1, a, b) => (t <= t0 ? a : t >= t1 ? b : a + (b - a) * (t - t0) / (t1 - t0));
const bed = (t) => {
  if (t < ev.on - 0.6) return 1;
  if (t < ev.blower - 1) return ramp(t, ev.on - 0.6, ev.on + 0.2, 1, 0);
  if (t < A[8] - 0.4) return ramp(t, ev.blower - 1, ev.fan + 1.5, 0, 0.75);
  if (t < A[9] - 0.3) return ramp(t, A[8] - 0.4, A[8] + 0.8, 0.75, 0.35);
  return ramp(t, A[9] - 0.3, A[9] + 0.6, 0.35, 0.9);
};
const kit = (t) => (t < ev.on - 0.6 ? 0.55 : ramp(t, ev.on - 0.6, ev.on, 0.55, 0) + (t > A[9] ? ramp(t, A[9], A[9] + 1, 0, 0.3) : 0));
[bass, pad, keys].forEach((b) => b.applyGain(bed));
drums.applyGain(kit);
const music = [drums, bass, pad, keys];
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, drone, fx, bells, amb, voice: vo.bus, verb: room };
const GAIN = { drums: 0.45, bass: 0.55, pad: 0.75, keys: 0.75, drone: 1, fx: 1, bells: 1, amb: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
