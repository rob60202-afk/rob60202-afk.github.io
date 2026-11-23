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
const clank = (t, pitch = 1, g = 0.3) => { fx.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.5); fx.addMono(I.woodTick(0.7 * pitch), t, g); verb.addMono(I.bell(520 * pitch, 0.09, 2.2, 3.1), t, g * 0.2); }; // 踩在金屬梯上的一步
const jingle = (t, g = 0.16) => { fx.addMono(I.bell(2300, 0.07, 1.4, 2.4), t, g); fx.addMono(I.bell(3100, 0.05, 1.2, 2.9), t + 0.07, g * 0.7); }; // 掛鉤晃動的輕響
const click = (t, g = 1) => { // 掛鉤扣上:清楚的金屬「喀」
  fx.addMono(I.tvClick(), t, 0.85 * g); fx.addMono(I.woodTick(2.2), t, 0.6 * g);
  fx.addMono(I.bell(1900, 0.1, 2.6, 3.4), t + 0.004, 0.5 * g); fx.addMono(I.bell(3400, 0.06, 1.6, 2.2), t + 0.008, 0.32 * g);
  verb.addMono(I.bell(1900, 0.1, 2.6, 3.4), t + 0.004, 0.22 * g);
};
ev.steps.forEach((t, k) => clank(t, 1 + (k % 2) * 0.08, 0.32));               // 爬施工架的腳步
[0, 0.42].forEach((d, k) => clank(ev.top + d, 0.8 + k * 0.06, 0.3));          // 踏上平台
[0, 0.5, 1.0].forEach((d) => fx.addMono(I.scribble(0.22), ev.bolt + d, 0.2)); // 扳手鎖螺絲
[0, 0.55, 1.1, 1.65, 2.2].forEach((d, k) => jingle(ev.hook + d, 0.2 - k * 0.012)); // 腰間的掛鉤晃啊晃
fx.addMono(I.pop(0.9), ev.circle, 0.3);                                       // 紅圈
jingle(ev.mutter + 0.2, 0.14); jingle(ev.mutter + 0.95, 0.12);
fx.addMono(I.noiseSweep(0.3, 2600, 500, { q: 1.6 }), ev.slip, 0.42);          // 腳滑
fx.addMono(I.whistle(0.28), ev.slip + 0.02, 0.1);
clank(ev.slip + 0.2, 1.5, 0.3);                                               // 扳手脫手敲到欄杆
fx.addMono(I.tvClick(), ev.freeze, 0.4);                                      // 定格
fx.addMono(I.noiseSweep(0.28, 400, 1800, { q: 1.2, pink: true }), ev.reach, 0.16); // 一隻手伸過來
fx.addMono(I.thud(120, 0.14), ev.grab, 0.95);                                 // 抓住
fx.addMono(I.thwack(), ev.grab, 0.5);
fx.addMono(I.subBoom(0.9, 70, 38), ev.grab, 0.4);
jingle(ev.grab + 0.25, 0.2); jingle(ev.grab + 0.7, 0.12);                     // 掛鉤還在晃
ev.beats.forEach((t, k) => fx.addMono(I.heartbeat(), t, 0.55 - k * 0.05));    // 坐在地上,只剩心跳
[0.2, 1.9, 3.6].forEach((d) => fx.addMono(I.noiseSweep(0.9, 500, 1100, { q: 0.8, pink: true }), ev.sit + d, 0.05)); // 喘氣
fx.addMono(I.paperFwip(0.7), ev.roll, 0.34); fx.addMono(I.paperFwip(0.8), ev.roll + 0.5, 0.3); // 捲袖子
{ const b = I.musicBox(m('D4'), { decay: 2.4 }); bells.addMono(b, ev.scar, 0.26); verb.addMono(b, ev.scar, 0.2); } // 那道疤
jingle(ev.take, 0.2);                                                         // 拿起掛鉤
fx.addMono(I.noiseSweep(0.3, 500, 1500, { q: 1.2, pink: true }), ev.close - 0.1, 0.1);
click(ev.click);                                                              // 喀
chime(['C5', 'F5'], ev.click + 0.3, 0.1, 0.22);
[0, 0.4, 0.8].forEach((d, k) => clank(ev.again + d, 1 + (k % 2) * 0.08, 0.3)); // 扣好了再爬
clank(ev.top2, 0.8, 0.28);
chime(['A4', 'C5'], ev.top2 + 0.25, 0.1, 0.22);
fx.addMono(I.pop(1.2), ev.card, 0.34);
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
// 抓住的那一瞬間,音樂收到幾乎沒有;兩人沉默之後才慢慢回來
const hush = (t) => t < ev.grab - 0.02 ? 1 : t < ev.grab + 0.03 ? 1 - 0.95 * (t - (ev.grab - 0.02)) / 0.05 : t < A[6] - 0.4 ? 0.05 : Math.min(1, 0.05 + 0.95 * (t - (A[6] - 0.4)) / 2.4);
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
