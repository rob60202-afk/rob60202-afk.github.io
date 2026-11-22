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
[0, 1, 2, 3, 4].forEach((k) => fx.addMono(I.woodTick(0.8 + (k % 2) * 0.08), ev.walk + k * 0.34, 0.3)); // 窗口走過來的腳步
fx.addMono(I.pop(1.1), ev.point, 0.4);                                        // 手一指
fx.addMono(I.scribble(0.8), ev.point + 0.1, 0.3);                             // 牆上畫出虛線
fx.addMono(I.pop(1.5), ev.yes, 0.42);                                         // 比讚
chime(['A4', 'C5'], ev.yes + 0.12, 0.1, 0.24);
ev.mats.forEach((t, k) => fx.addMono(I.woodTick(1 + k * 0.1), t, 0.42));      // 多用了材料
ev.days.forEach((t) => { fx.addMono(I.paperFwip(1.0), t, 0.46); fx.addMono(I.thud(90, 0.18), t + 0.12, 0.4); }); // 兩張日曆
[0, 1, 2].forEach((k) => { const t = ev.real[0] + 0.25 + k * (ev.real[1] - ev.real[0]) / 3; fx.addMono(I.bell(640 - k * 60, 0.2, 3.2, 2.76), t, 0.14); fx.addMono(I.thwack(), t, 0.22); }); // 鎖管
fx.addMono(I.pop(1.4), ev.proud, 0.35);                                       // 覺得這是服務
fx.addMono(I.paperFwip(0.9), ev.sheet, 0.5);                                  // 請款單
fx.addMono(I.scribble(0.4), ev.strike, 0.5);                                  // 紅線劃掉
fx.addMono(I.thud(70, 0.4), ev.strike + 0.36, 0.7);
fx.addMono(I.bwomp(), ev.strike + 0.4, 0.26);
fx.addMono(I.woodTick(1.3), ev.ask, 0.45);                                    // 承辦開口
fx.addMono(I.pop(0.9), ev.doc, 0.36);                                         // 有文件嗎
fx.addMono(I.noiseSweep(1.4, 1600, 500, { q: 1.2, pink: true }), ev.gone, 0.06); // 人影淡掉
fx.addMono(I.thud(120, 0.2), ev.flip + 0.16, 0.6);                            // 名牌蓋下去
fx.addMono(I.tvClick(), ev.flip + 0.18, 0.4);
ev.empty.forEach((t, k) => { fx.addMono(I.paperFwip(1.3), t, 0.3); fx.addMono(I.bell(392 - k * 40, 0.5, 1.2, 2.0), t + 0.2, 0.2); }); // 手機滑過去:空的
ev.pat.forEach((t) => fx.addMono(I.thud(140, 0.12), t, 0.5));                 // 師傅拍拍他
['A4', 'F4', 'C5'].forEach((n, k) => note(n, ev.icons[k], 0.3));              // 三個圖示
fx.addMono(I.paperFwip(1.2), ev.book, 0.5);                                   // 掏出小本子
fx.addMono(I.pop(1.2), ev.book + 0.3, 0.3);
fx.addMono(I.scribble(0.7), ev.write, 0.4);                                   // 當場寫
fx.addMono(I.scribble(0.9), ev.sign, 0.45);                                   // 當場簽
fx.addMono(I.pop(1.5), ev.tick, 0.42);                                        // 打勾
chime(['C5', 'F5'], ev.tick + 0.05, 0.1, 0.28);
chime(['F4', 'A4', 'C5', 'F5'], ev.end, 0.14, 0.34);
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), engine: 'piper', voice: 'zh-TW', length: DURATION });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const room = reverb(verb, { room: 0.7, damp: 0.4 });
const music = [drums, bass, pad, keys];
MIX.gate(drums, ev.strike + 0.36, ev.strike + 1.4, 0.01);
MIX.duck(music, vo.bus, { depth: 0.6 });
const stems = { drums, bass, pad, keys, fx, bells, voice: vo.bus, verb: room };
const GAIN = { drums: 0.55, bass: 0.6, pad: 0.8, keys: 0.8, fx: 1, bells: 1, voice: 2.2, verb: 0.5 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine} (${vo.lines.length} lines)`);
