// 配樂與配音:輕快的 lofi 墊底,重點句卡片與咖啡上桌各有提示音。  node song.js
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { DURATION, BARS, m, ev, clock, chordAt, A, says } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), bells = bus(), verb = bus();
Genre.play('lofi', { clock, from: 0, to: BARS, chordAt, buses: { drums, bass, pad, keys }, gain: 0.8 });

const chime = (notes, t, step = 0.11, g = 0.35) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.6 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
fx.addMono(I.pop(1.2), A[0] + 0.05, 0.4);                       // 標題彈出
says.forEach((i) => fx.addMono(I.pop(0.9), A[i] - 0.06, 0.22)); // 換人說話
fx.addMono(I.woodTick(1.3), ev.cup, 0.5); chime(['E5', 'G5'], ev.cup, 0.1, 0.25); // 咖啡上桌
chime(['C5', 'E5', 'G5', 'C6'], ev.card, 0.09);                 // 重點句
for (let k = 0; k < 4; k++) fx.addMono(I.woodTick(1 + (k === 3 ? 0.4 : 0)), ev.repeat[0] + k * (ev.repeat[1] - ev.repeat[0]) / 4, 0.16); // 跟唸倒數
chime(['G4', 'C5', 'E5', 'G5'], ev.end, 0.12, 0.3);

const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');

const room = reverb(verb, { room: 0.6, damp: 0.4 });
const music = [drums, bass, pad, keys];
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.0, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
