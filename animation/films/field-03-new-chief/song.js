// 配樂與配音。  node song.js
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { DURATION, BARS, m, ev, clock, chordAt, A } = sc;
const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus();
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.8 });
const chime = (notes, t, step = 0.11, g = 0.32) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const note = (n, t, g = 0.3) => { const b = I.musicBox(m(n), { decay: 1.4 }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.5); };
const SCALE = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5'];
fx.addMono(I.pop(1.2), ev.vest, 0.4);                                         // 換上課長背心
ev.row.forEach((t, k) => fx.addMono(I.woodTick(1 + k * 0.07), t, 0.45));      // 七個人站出來
fx.addMono(I.bwomp(), ev.alarm, 0.32);                                        // 現場出狀況
[0, 0.42, 0.84].forEach((d) => fx.addMono(I.bell(1320, 0.16, 2.0, 2.0), ev.alarm + 0.25 + d, 0.2)); // 警示燈
fx.addMono(I.noiseSweep(ev.clanks[2] - ev.alarm, 2600, 1400, { q: 0.9, pink: true }), ev.alarm, 0.07); // 噴水聲
fx.addMono(I.paperFwip(1.1), ev.run, 0.5);                                    // 衝下去
fx.addMono(I.noiseSweep(1.2, 400, 1600, { q: 1.2, pink: true }), ev.run, 0.1);
ev.clanks.forEach((t, k) => { fx.addMono(I.bell(640 - k * 60, 0.2, 3.2, 2.76), t, 0.26); fx.addMono(I.thwack(), t, 0.38); }); // 一個人鎖
fx.addMono(I.bell(784, 0.9, 1.4, 2.0), ev.eight, 0.22);                       // 晚上八點的鐘
fx.addMono(I.bell(784, 0.9, 1.4, 2.0), ev.eight + 0.38, 0.16);
fx.addMono(I.pop(1.4), ev.proud, 0.35);
fx.addMono(I.woodTick(1.3), ev.one, 0.5);                                     // 一個問題
ev.icons.forEach((t, k) => fx.addMono(I.woodTick(0.9 + k * 0.04), t, 0.28));  // 你那七個人
fx.addMono(I.thud(70, 0.4), ev.freeze, 0.7);                                  // 答不出來
fx.addMono(I.tvClick(), ev.freeze + 0.05, 0.4);
fx.addMono(I.noiseSweep(1.3, 900, 1500, { q: 2.2, pink: true }), ev.pour, 0.08); // 沖茶
ev.cups.forEach((t, k) => note(SCALE[k], t, 0.3));                            // 七個杯子都有茶
ev.ticks.forEach((t, k) => { fx.addMono(I.scribble(0.28), t, 0.3); fx.addMono(I.pop(1 + k * 0.06), t + 0.32, 0.36); }); // 白板排工作
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
MIX.gate(drums, ev.freeze, ev.freeze + 1.2, 0.01);
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
