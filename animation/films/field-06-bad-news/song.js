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
const chime = (notes, t, step = 0.11, g = 0.32, decay = 1.8) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const clank = (t, pitch = 1, g = 0.3) => { fx.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.5); fx.addMono(I.woodTick(0.7 * pitch), t, g); verb.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.2); }; // 管子鎖上去的金屬聲
const step = (t, g = 0.22, p = 0.55) => { fx.addMono(I.woodTick(p), t, g); fx.addMono(I.thud(110, 0.05), t, g * 0.8); }; // 腳步
const stamp = (t, g = 1) => { fx.addMono(I.thud(95, 0.12), t, 0.9 * g); fx.addMono(I.thwack(), t, 0.35 * g); fx.addMono(I.paperFwip(0.8), t - 0.05, 0.2 * g); };
// 1:料架、章、手機、收進口袋、噓
fx.addMono(I.paperFwip(1.1), ev.tag - 0.04, 0.3); fx.addMono(I.pop(1500), ev.tag + 0.06, 0.3);
stamp(ev.stamp);
fx.addMono(I.noiseSweep(0.22, 900, 2400, { q: 1.1, pink: true }), ev.phone, 0.12);    // 從口袋拿出手機
fx.addMono(I.ting(86), ev.dial, 0.16);                                                 // 手機畫面
fx.addMono(I.noiseSweep(0.3, 2200, 700, { q: 1.1, pink: true }), ev.pocket, 0.16);    // 收進口袋
fx.addMono(I.paperFwip(0.7), ev.pocket + 0.3, 0.18);
fx.addMono(I.noiseSweep(0.55, 3600, 5200, { q: 0.9, shape: (x) => Math.min(1, x * 6) * (1 - x) }), ev.shh + 0.08, 0.1); // 噓
// 2:加班,時鐘飛轉(越轉越快的滴答)
{ let t = ev.tick0, k = 0; while (t < ev.tick1) { const p = (t - ev.tick0) / (ev.tick1 - ev.tick0); fx.addMono(I.woodTick(k % 2 ? 1.25 : 1.0), t, 0.2 + 0.08 * p); t += 0.16 - 0.1 * p; k++; } }
for (let k = 0; k < 9; k++) fx.addMono(I.scribble(0.18), ev.night + 0.4 + k * 0.42, 0.12); // 扳手
ev.built.forEach((t, k) => { clank(t, 1 + k * 0.08, 0.34); clank(t + 0.16, 1.1 + k * 0.08, 0.22); });
// 3:一週後,業主走進來,發現了
fx.addMono(I.paperFwip(1.2), ev.week, 0.2); fx.addMono(I.pop(1300), ev.week + 0.05, 0.25);
[0, 0.6, 1.2].forEach((d) => step(ev.walk + d, 0.2));                         // 業主的腳步(與畫面的步伐對齊)
{ // 刺耳的一記:不和諧的銅管短奏 + 定音鼓 + 高音金屬
  const t = ev.discover;
  for (const n of ['G#4', 'C#5', 'D5']) { const b = I.brassNote(m(n), 0.32, { stab: true, bright: 1.3 }); fx.addStereo(b.L, b.R, t, 0.32); verb.addStereo(b.L, b.R, t, 0.12); }
  fx.addMono(I.timpani(m('D2'), { decay: 0.9 }), t, 0.8);
  fx.addMono(I.thwack(), t, 0.3);
  fx.addMono(I.bell(2640, 0.25, 3.2, 1.41), t, 0.16); fx.addMono(I.bell(2800, 0.25, 3.2, 1.37), t + 0.01, 0.14);
  verb.addMono(I.bell(2640, 0.25, 3.2, 1.41), t, 0.12);
  fx.addMono(I.noiseSweep(0.18, 5000, 1500, { q: 1.4 }), t - 0.02, 0.18);
}
// 4:問完之後的沉默
fx.addMono(I.heartbeat(), ev.hush + 0.1, 0.35); fx.addMono(I.heartbeat(), ev.hush + 0.75, 0.25);
// 5:第 1、2、3 天
ev.days.forEach((t, k) => { fx.addMono(I.paperFwip(1 + k * 0.1), t - 0.03, 0.3); fx.addMono(I.pop(1400 + k * 200), t + 0.05, 0.28); });
// 6:休息區(杯子輕碰)
fx.addMono(I.bell(3100, 0.05, 1.2, 2.4), ev.rest + 0.5, 0.08); fx.addMono(I.woodTick(1.6), ev.rest + 0.5, 0.1);
// 7:發現問題,當天就去報告:敲門、開門、走進去
{ const b = I.musicBox(m('A5'), { decay: 0.9 }); bells.addMono(b, ev.find, 0.26); bells.addMono(I.musicBox(m('E5'), { decay: 0.9 }), ev.find + 0.12, 0.22); }
fx.addMono(I.pop(1700), ev.find, 0.25);
ev.knock.forEach((t) => { fx.addMono(I.thud(150, 0.06), t, 0.7); fx.addMono(I.woodTick(0.42), t, 0.35); });
fx.addMono(I.noiseSweep(0.45, 380, 900, { q: 0.9, pink: true }), ev.enter, 0.14);
[0.05, 0.9].forEach((d) => step(ev.enter + d, 0.16));
// 8:四張卡片,每張一聲輕柔的鐘聲
ev.cards.forEach((t, k) => { chime([['F5', 'A5'], ['G5', 'C6'], ['A5', 'D6'], ['C6', 'F6']][k], t, 0.07, 0.22, 1.5); fx.addMono(I.paperFwip(1.15), t - 0.04, 0.14); });
// 9:分成兩個方案、點頭、指著第二個、打勾
[0, 0.14].forEach((d, k) => { fx.addMono(I.paperFwip(1.2 + k * 0.1), ev.opts + d, 0.2); fx.addMono(I.pop(1500 + k * 300), ev.opts + d + 0.08, 0.22); });
fx.addMono(I.woodTick(0.8), ev.nod + 0.05, 0.12);
fx.addMono(I.noiseSweep(0.22, 600, 1800, { q: 1.2, pink: true }), ev.point, 0.12);
fx.addMono(I.tvClick(), ev.pick, 0.45); fx.addMono(I.pop(2200), ev.pick, 0.3);
chime(['F5', 'A5', 'C6'], ev.pick + 0.06, 0.08, 0.26);
// 10:結尾卡
fx.addMono(I.pop(1200), ev.card, 0.3); fx.addMono(I.pop(1500), ev.line2, 0.26);
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
// 業主發現的那一刻,音樂收到幾乎沒有;每天來盯的時候回來一半,師傅開口前完全回來
const hush = (t) => {
  const d = ev.discover;
  if (t < d - 0.02) return 1;
  if (t < d + 0.05) return 1 - 0.88 * (t - (d - 0.02)) / 0.07;
  if (t < A[4] - 0.3) return 0.12;
  if (t < A[4] + 1.0) return 0.12 + 0.48 * (t - (A[4] - 0.3)) / 1.3;
  if (t < A[5] - 0.5) return 0.6;
  return Math.min(1, 0.6 + 0.4 * (t - (A[5] - 0.5)) / 1.5);
};
music.forEach((b) => b.applyGain(hush));
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
