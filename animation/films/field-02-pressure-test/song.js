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
fx.addMono(I.pop(1.2), ev.done, 0.4);                                        // 最後一個接頭鎖好
ev.ticks.forEach((t, k) => fx.addMono(I.woodTick(1 + k * 0.08), t, 0.5));    // 壓力錶指針
fx.addMono(I.tvClick(), ev.lights, 0.55);                                    // 關燈
fx.addMono(I.thud(70, 0.35), ev.drop[0], 0.7);                               // 指針開始往下掉
fx.addMono(I.noiseSweep(ev.drop[1] - ev.drop[0], 1800, 180, { q: 1.2, pink: true }), ev.drop[0], 0.12);
fx.addMono(I.bwomp(), ev.leak, 0.35);                                        // 漏點
ev.clanks.forEach((t, k) => { fx.addMono(I.bell(620 - k * 70, 0.22, 3.2, 2.76), t, 0.3); fx.addMono(I.thwack(), t, 0.4); fx.addMono(I.thud(120, 0.12), t + 0.02, 0.4); }); // 拆管
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
MIX.gate(drums, ev.drop[0], ev.drop[0] + 1.2, 0.01);
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
