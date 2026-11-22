// 配樂與配音:輕柔的 lofi 墊在旁白下面,椅子出現時各有一聲音效。  node song.js
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

// 音效:椅子晃、師傅坐下、好椅子一張張出現、結尾
fx.addMono(I.woodTick(0.8), ev.wobble, 0.5); fx.addMono(I.woodTick(1.1), ev.wobble + 0.18, 0.35);
fx.addMono(I.thud(90, 0.25), ev.sit, 0.5); fx.addMono(I.woodTick(0.7), ev.sit + 0.12, 0.4);
ev.chairs.forEach((t, k) => { fx.addMono(I.pop(1 + k * 0.12), t, 0.5); const b = I.musicBox(m('C5') + [0, 2, 4, 7, 12][k], { decay: 1.2 }); bells.addMono(b, t, 0.3); verb.addMono(b, t, 0.2); });
for (const [k, n] of ['F4', 'A4', 'C5', 'F5'].entries()) { const b = I.musicBox(m(n), { decay: 2.5 }); bells.addMono(b, ev.end + k * 0.14, 0.35); verb.addMono(b, ev.end + k * 0.14, 0.25); }
fx.addMono(I.noiseSweep(0.5, 400, 3000, { q: 1, pink: true }), A[4] - 0.1, 0.12);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');

const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
