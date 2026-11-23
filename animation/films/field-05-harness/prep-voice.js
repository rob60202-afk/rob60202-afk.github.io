// 先把每句旁白合成一次並量出長度,寫進 durations.js,時間軸才能依實際語音長度排。
// 用法:PATH=../../tools:$PATH PIPER_MODEL=zh-TW node prep-voice.js
const fs = require('fs'), path = require('path');
const Voice = require('./engine/audio/voice');
const LINES = require('./lines');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const vo = Voice.speak(LINES.map((l, i) => ({ at: i * 30, text: l.text })), { out, engine: 'piper', voice: 'zh-TW', save: false, length: LINES.length * 30 });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const dur = vo.lines.map((l) => +(l.end - l.t).toFixed(3));
fs.writeFileSync(path.join(__dirname, 'durations.js'),
  `(function () { const DUR = ${JSON.stringify(dur)}; if (typeof module !== 'undefined') module.exports = DUR; else globalThis.DUR = DUR; })();\n`);
console.log('durations', dur.join(' '), 'total', dur.reduce((a, b) => a + b, 0).toFixed(1));
