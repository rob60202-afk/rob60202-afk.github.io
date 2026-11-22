// 先把每句台詞合成一次並量出長度,寫進 durations.js。
// 用法:PATH=../../tools:$PATH PIPER_MODEL=zh-TW node prep-voice.js
const fs = require('fs'), path = require('path');
const Voice = require('./engine/audio/voice');
const EP = require('./lines');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const vo = Voice.speak(EP.lines.map((l, i) => ({ at: i * 30, text: l.text, voice: l.voice })), { out, engine: 'piper', save: false, length: EP.lines.length * 30 });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const dur = vo.lines.map((l) => +(l.end - l.t).toFixed(3));
fs.writeFileSync(path.join(__dirname, 'durations.js'),
  `(function () { const DUR = ${JSON.stringify(dur)}; if (typeof module !== 'undefined') module.exports = DUR; else globalThis.DUR = DUR; })();\n`);
console.log('durations', dur.join(' '), 'total', dur.reduce((a, b) => a + b, 0).toFixed(1));
