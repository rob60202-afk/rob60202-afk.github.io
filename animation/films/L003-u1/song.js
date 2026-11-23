// L003 第 1 單元的配樂、音效與配音。用法(在單元資料夾裡):
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
// 音量包絡:a..b 之間降到 g(前後各有淡入淡出),用來讓開場鉤子只剩和弦、讓師傅那句話與章卡安靜下來
function dip(buses, a, b, g, fin = 0.15, fout = 0.3) {
  for (const B of buses) B.applyGain((t) => (t < a - fin || t > b + fout ? 1 : t < a ? 1 - (1 - g) * (t - (a - fin)) / fin : t <= b ? g : g + (1 - g) * (t - b) / fout));
}
dip([drums], 0, ev.title - 0.05, 0, 0.01, 0.2);                       // 開場鉤子沒有鼓,片名卡鼓才進來
dip([drums, bass, keys, pad], A[2] - 0.1, ev.shatter + 0.35, 0.12);    // 師傅問話到碎掉:音樂幾乎停
dip([drums, bass, keys, pad], ev.ch1 - 0.05, ev.ch1 + CHAPTER, 0, 0.12, 0.35); // 章卡:只有鐘聲

// ---------- 音效 ----------
const chime = (notes, t, step = 0.11, g = 0.3) => notes.forEach((n, k) => { const b = I.musicBox(m(n), { decay: 1.8 }); bells.addMono(b, t + k * step, g); verb.addMono(b, t + k * step, g * 0.6); });
const note = (n, t, g = 0.26) => { const b = I.musicBox(m(n), { decay: 1.3 }); bells.addMono(b, t, g); verb.addMono(b, t, g * 0.5); };
const pop = (t, hz = 1900, g = 0.35) => fx.addMono(I.pop(hz), t, g);
const SCALE = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5'];
// 開場:深夜打字、印表機、蓋章
for (let t = 0.7; t < ev.print; t += 0.09 + U.hash(t * 10, 3) * 0.08) fx.addMono(I.woodTick(1.6 + U.hash(t * 10, 4) * 0.5), t, 0.05 + U.hash(t * 10, 5) * 0.04);
fx.addMono(I.noiseSweep(1.1, 700, 1100, { q: 3, pink: true }), ev.print, 0.05);
for (let k = 0; k < 9; k++) fx.addMono(I.woodTick(0.55), ev.print + k * 0.11, 0.06);
fx.addMono(I.paperFwip(1.1), ev.sheetUp, 0.45);
fx.addMono(I.thud(110, 0.2), ev.stamp, 0.75); fx.addMono(I.thwack(), ev.stamp, 0.3);
chime(['C5', 'E5', 'G5'], ev.stamp + 0.1, 0.1, 0.26);
// 廠房:腳步、鏡頭往上拉
for (let k = 0; k < 6; k++) fx.addMono(I.woodTick(0.62 + (k % 2) * 0.06), A[1] + 0.1 + k * 0.36, 0.12);
fx.addMono(I.noiseSweep(ev.tilt[1] - ev.tilt[0], 260, 1500, { q: 0.9, pink: true }), ev.tilt[0], 0.06);
// 師傅問話:高空車的虛線、問號、利潤碎掉
fx.addMono(I.pop(900), when(2, '高空車'), 0.3);
fx.addMono(I.bwomp(), when(2, '哪一行') + 0.1, 0.22);
fx.addMono(I.woodTick(2.2), ev.crack, 0.3);
fx.addMono(I.glass(3, { size: 0.8 }), ev.shatter, 0.32); fx.addMono(I.thud(80, 0.25), ev.shatter, 0.55);
// 片名卡、章卡
chime(['F4', 'A4', 'C5', 'F5'], ev.title + 0.12, 0.14, 0.32);
fx.addMono(I.paperFwip(0.9), ev.ch1, 0.4);
chime(['C5', 'E5', 'G5', 'C6'], ev.ch1 + 0.04, 0.09, 0.34);
// 第 1 章:老闆丟圖、平面圖、拍胸脯、時鐘快轉
fx.addMono(I.paperFwip(0.8), ev.toss, 0.5); fx.addMono(I.noiseSweep(0.35, 1800, 900, { q: 1.5, pink: true }), ev.toss + 0.55, 0.12);
fx.addMono(I.scribble(ev.route[1] - ev.route[0]), ev.route[0], 0.1);
pop(ev.spec, 1600, 0.3);
for (let k = 0; k < 9; k++) pop(ev.weld + k * 0.11, 2000 + k * 60, 0.22);
fx.addMono(I.thud(90, 0.12), ev.chest, 0.6); fx.addMono(I.thud(90, 0.12), ev.chest + 0.16, 0.45);
fx.addMono(I.bell(2093, 0.4, 1.4, 2.0), when(5, '一個晚上'), 0.12);
for (let t = ev.clock[0], dt = 0.16; t < ev.clock[1]; t += dt, dt = Math.max(0.045, dt * 0.88)) fx.addMono(I.woodTick(1.2), t, 0.13);
fx.addMono(I.bell(784, 0.9, 1.4, 2.0), ev.clock[1], 0.2); fx.addMono(I.bell(784, 0.9, 1.4, 2.0), ev.clock[1] + 0.4, 0.14);
// 表 1:一行一行亮起
note('C5', ev.table, 0.18);
ev.pipe.forEach((t, k) => pop(t, 1700 + k * 150, 0.26));
ev.fit.forEach((t, k) => pop(t, 1500 + k * 150, 0.26));
const rows = [ev.mat, ev.wage, ev.sub, ev.fee, ev.net, ev.tax, ev.total];
rows.forEach((t, k) => { note(SCALE[k], t, 0.24); pop(t, 2100, 0.2); });
note('F5', ev.big, 0.2); chime(['A5', 'C6'], ev.big + 0.05, 0.1, 0.2);
// 手機:震動、回訊息、蓋上
for (let k = 0; k < 7; k++) fx.addMono(I.thud(170, 0.025), ev.reply - 0.3 + k * 0.035, 0.22);
pop(ev.reply, 1500, 0.3);
ev.hl.forEach((t) => pop(t, 2300, 0.18));
fx.addMono(I.thud(140, 0.08), ev.close + 0.15, 0.5);
// 字卡與角標
fx.addMono(I.paperFwip(0.8), ev.card, 0.45);
fx.addMono(I.noiseSweep(0.6, 2200, 500, { q: 1.2, pink: true }), ev.shrink, 0.06);
pop(ev.badge, 1800, 0.2);
// 都有了、完美、寄出
ev.ticks.forEach((t, k) => { fx.addMono(I.scribble(0.18), t, 0.2); note(SCALE[2 + k], t + 0.15, 0.22); });
chime(['C5', 'F5'], ev.allDone + 0.1, 0.1, 0.22);
fx.addMono(I.woodTick(1.8), ev.send, 0.3);
fx.addMono(I.noiseSweep(0.55, 600, 3200, { q: 1, pink: true }), ev.send + 0.05, 0.1);
pop(ev.send + 0.25, 2400, 0.25);
// 甲方辦公室
for (let k = 0; k < 3; k++) fx.addMono(I.paperFwip(1 + k * 0.1), ev.spread + k * 0.09, 0.32);
fx.addMono(I.woodTick(1.0), ev.tap, 0.35); fx.addMono(I.woodTick(1.0), ev.tap + 0.14, 0.3);
chime(['F4', 'A4'], ev.deal + 0.3, 0.1, 0.22);
// 繞著頭轉的字、小皇冠
chime(['C6', 'A5', 'F5'], ev.orbit + 0.3, 0.12, 0.16);
chime(['F5', 'A5', 'C6', 'F6'], ev.crown, 0.07, 0.24);

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
