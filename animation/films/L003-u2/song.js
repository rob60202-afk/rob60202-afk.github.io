// L003 第 2 單元的配樂、音效與配音。用法(在單元資料夾裡):
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
const { DURATION, BARS, m, ev, clock, chordAt, A, E, CHAPTER, when } = sc;
const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus();

// ---------- 墊底:安靜的 lofi ----------
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.75 });
// 音量包絡:a..b 之間降到 g(前後各有淡入淡出)
function dip(buses, a, b, g, fin = 0.15, fout = 0.3) {
  for (const B of buses) B.applyGain((t) => (t < a - fin || t > b + fout ? 1 : t < a ? 1 - (1 - g) * (t - (a - fin)) / fin : t <= b ? g : g + (1 - g) * (t - b) / fout));
}
const ALL = [drums, bass, keys, pad];
dip(ALL, 0, ev.ch2 + CHAPTER, 0, 0.01, 0.35);                       // 章卡:只有鐘聲
dip([drums], A[3] - 0.1, ev.crownTilt + 0.4, 0, 0.2, 0.4);          // 「多高?」到 6 m:鼓停,只剩和弦
dip(ALL, A[5] - 0.05, E[5] + 0.4, 0.12);                           // 「那你的高空車,算在報價單的哪一行?」
dip(ALL, A[7] - 0.1, E[7] + 0.1, 0.35);                            // 阿樹小小聲那一句
dip(ALL, ev.chip - 0.1, ev.crownFall + 0.9, 0.12);                  // 利潤穿過零、皇冠掉地上
dip(ALL, ev.freeze - 0.05, A[13] + 1.2, 0.2, 0.08, 0.5);            // 定格

// ---------- 音效 ----------
const chime = (notes, t, step = 0.11, g = 0.3) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const note = (n, t, g = 0.26) => { const b = I.musicBox(m(n), { decay: 1.3 }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.5); };
const pop = (t, hz = 1900, g = 0.35) => fx.addMono(I.pop(hz), t, g);
const SCALE = ['D4', 'F4', 'A4', 'C5', 'D5', 'F5', 'A5', 'C6'];
// 章卡
fx.addMono(I.paperFwip(0.9), 0.05, 0.3);
chime(['D5', 'F5', 'A5', 'D6'], 0.12, 0.09, 0.34);
// 1. 走進廠房:三個人的腳步,遞圖,抬頭
for (const [who, p] of [['master', 0.62], ['shu', 0.7], ['client', 0.78]]) {
  const [a, b] = ev.walk[who];
  for (let t = a + 0.12, k = 0; t < b - 0.05; t += 0.34, k++) fx.addMono(I.woodTick(p + (k % 2) * 0.05), t, 0.09);
}
fx.addMono(I.paperFwip(1.1), ev.offer + 0.1, 0.32);
fx.addMono(I.noiseSweep(0.7, 400, 1300, { q: 1, pink: true }), ev.lookUp, 0.05);
// 3. 手指往上比
pop(ev.shuUp + 0.2, 1700, 0.25);
for (let k = 0; k < 3; k++) pop(ev.hug + k * 0.16, 2000 + k * 200, 0.14);
// 4. 慢慢上搖、管線位置的虛線、拉遠、尺規、6 m、皇冠歪掉
fx.addMono(I.noiseSweep(ev.tilt[1] - ev.tilt[0], 220, 1400, { q: 0.9, pink: true }), ev.tilt[0], 0.07);
fx.addMono(I.scribble(0.9), ev.tilt[1] - 0.8, 0.07);
fx.addMono(I.noiseSweep(ev.pull[1] - ev.pull[0], 1600, 500, { q: 1.1, pink: true }), ev.pull[0], 0.05);
fx.addMono(I.noiseSweep(ev.ruler[1] - ev.ruler[0], 700, 3200, { q: 2.5 }), ev.ruler[0], 0.08);
for (let t = ev.ruler[0], dt = 0.05; t < ev.ruler[1]; t += dt) fx.addMono(I.woodTick(2.2), t, 0.05);
fx.addMono(I.woodTick(1.2), ev.ruler[1], 0.28);
pop(ev.six, 1500, 0.32); chime(['A5', 'D6'], ev.six + 0.02, 0.1, 0.22);
fx.addMono(I.boing(), ev.crownTilt, 0.2);
// 5. 師傅轉頭(很安靜),阿樹冒汗
fx.addMono(I.woodTick(0.5), ev.turn + 0.05, 0.12);
fx.addMono(I.bwomp(), E[5] + 0.05, 0.16);
// 6. 翻紙、表 1、裂開一條空白行
note('D5', ev.flipShot + 0.2, 0.16);
fx.addMono(I.paperFwip(1.0), ev.flip1, 0.4); fx.addMono(I.paperFwip(0.9), ev.flip2, 0.4);
for (let k = 0; k < 7; k++) fx.addMono(I.paperFwip(1.1 + (k % 2) * 0.15, 40 + k), ev.frantic + k * 0.13, 0.28);
fx.addMono(I.woodTick(2.4), ev.split - 0.05, 0.3); fx.addMono(I.thud(80, 0.2), ev.split, 0.5); fx.addMono(I.bwomp(), ev.split + 0.05, 0.22);
for (let k = 0; k < 3; k++) fx.addMono(I.bell(1320, 0.12, 1.2, 1.0), ev.split + 0.35 + k * 0.22, 0.05);
// 7. 很小的梯子
pop(ev.tiny, 2600, 0.2); note('C6', ev.tiny + 0.05, 0.12);
// 8. 示意卡、梯子、大紅叉
fx.addMono(I.paperFwip(0.85), ev.card8, 0.35);
pop(ev.ladder8, 1500, 0.25);
fx.addMono(I.thwack(), ev.xmark, 0.45); fx.addMono(I.thud(100, 0.15), ev.xmark, 0.5);
// 9. 圖 A
fx.addMono(I.noiseSweep(0.35, 600, 2400, { q: 1.2, pink: true }), ev.figA - 0.1, 0.08);
pop(ev.dim6, 1600, 0.25);
fx.addMono(I.thwack(), ev.ladderX, 0.18);
for (let k = 0; k < 4; k++) fx.addMono(I.woodTick(0.9 + k * 0.12), ev.scaf + k * 0.12, 0.16);
note('F5', ev.scafOK, 0.24); pop(ev.scafOK, 2100, 0.22);
fx.addMono(I.noiseSweep(1.0, 180, 520, { q: 2.2 }), ev.lift, 0.12);
note('A5', ev.liftOK, 0.24); pop(ev.liftOK, 2300, 0.22);
ev.calc.forEach((t, k) => { pop(t, 1700 + k * 220, 0.28); note(SCALE[3 + k], t, 0.2); });
chime(['D6', 'F6'], ev.calc[2] + 0.12, 0.1, 0.18);
// 10. 利潤格:-25,000 撞上去、往下掉穿過零、皇冠掉地上
note('A4', ev.dropShot + 0.25, 0.16);
pop(ev.hi20, 2000, 0.22);
fx.addMono(I.noiseSweep(0.3, 900, 2600, { q: 1.5, pink: true }), ev.chip, 0.1);
fx.addMono(I.thwack(), ev.chip + 0.3, 0.4);
const FALL0 = ev.fall[1] - 0.9;
fx.addMono(I.noiseSweep(0.9, 1800, 220, { q: 3 }), FALL0, 0.12);
fx.addMono(I.thud(70, 0.25), FALL0 + 0.62, 0.4);                    // 穿過零
fx.addMono(I.thud(90, 0.12), ev.fall[1], 0.6);                      // 停在 -5,000
fx.addMono(I.subBoom(1.2, 60, 32), FALL0 + 0.62, 0.25);
[0, 0.42, 0.66, 0.8].forEach((d, k) => fx.addMono(I.bell(2093 - k * 80, 0.16, 1.4, 2.0), ev.crownFall + 0.5 + d, 0.22 * Math.pow(0.6, k)));
// 11. 板車:引擎、煞車、進場退場、算式、利潤再掉
fx.addMono(I.noiseSweep(ev.drive[1] - ev.drive[0] + 0.4, 70, 140, { q: 0.8, pink: true, shape: (x) => Math.min(1, x * 6) * Math.min(1, (1 - x) * 3) }), ev.drive[0], 0.3);
fx.addMono(I.noiseSweep(0.45, 3800, 2400, { q: 0.7 }), ev.drive[1] - 0.1, 0.06);
pop(ev.tripIn, 1600, 0.25); pop(ev.tripOut, 1500, 0.25);
pop(ev.trips, 1800, 0.25); pop(ev.price, 2000, 0.25); note('C5', ev.nine, 0.22); pop(ev.nine, 2200, 0.25);
pop(ev.dearer, 1700, 0.22);
fx.addMono(I.noiseSweep(0.3, 900, 2600, { q: 1.5, pink: true }), ev.drop2[0] - 0.3, 0.08);
fx.addMono(I.noiseSweep(0.7, 1500, 260, { q: 3 }), ev.drop2[0] + 0.05, 0.1);
fx.addMono(I.thud(90, 0.12), ev.drop2[1], 0.5);
// 12. 月曆與計費表:每一天跳一次
fx.addMono(I.noiseSweep(0.35, 600, 2400, { q: 1.2, pink: true }), ev.calShot - 0.1, 0.07);
ev.dayT.forEach((t, k) => { fx.addMono(I.woodTick(1.4), t, 0.16); fx.addMono(I.bell(2637, 0.22, 1.2, 1.5), t + 0.05, 0.08); });
// 13. 拍肩、定格
for (const d of [0.1, 0.42, 0.74]) fx.addMono(I.thud(140, 0.05), ev.pat[0] + d, 0.35);
fx.addMono(I.woodTick(0.7), ev.freeze, 0.35); fx.addMono(I.noiseSweep(0.12, 3000, 6000, { q: 0.8 }), ev.freeze + 0.01, 0.12);
// 14. 三格:路線、格子、?元
fx.addMono(I.scribble(ev.route[1] - ev.route[0]), ev.route[0], 0.08);
for (let k = 0; k < 3; k++) fx.addMono(I.paperFwip(0.9 + k * 0.1), ev.frames + k * 0.25, 0.3);
[ev.p1, ev.p2, ev.p3].forEach((t) => pop(t + 0.1, 1800, 0.2));
fx.addMono(I.woodTick(1.0), ev.stopGas, 0.2);
[ev.q1, ev.q2, ev.q3].forEach((t, k) => { pop(t, 1500, 0.3); note(['A4', 'F4', 'D4'][k], t + 0.03, 0.24); });
chime(['D5', 'A4', 'F4'], ev.q3 + 0.7, 0.16, 0.16);

// ---------- 配音:每一句用自己的聲音(lines.js 的 voice) ----------
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
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
