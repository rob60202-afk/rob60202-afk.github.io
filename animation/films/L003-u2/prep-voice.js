// 先把每一句旁白與台詞「用各自的聲音」合成一次,量出長度與句子裡每個標點的停頓,寫進 durations.js。
// 時間軸(score.js)用 DUR 排每一句的起點,用 PH 把畫面事件對到「念到哪個字」。
// 用法(在單元資料夾裡):
//   PATH=/home/user/rob60202-afk.github.io/animation/tools:$PATH PIPER_MODEL=zh-TW node prep-voice.js
// 語音會快取在 out/.vo-cache,song.js 重跑時直接用同一份。
const fs = require('fs'), path = require('path');
const Voice = require('./engine/audio/voice');
const { SR } = require('./engine/audio/dsp');
const LINES = require('./lines');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });

const SLOT = 20; // 每句放在 20 秒的格子裡,彼此不重疊
const vo = Voice.speak(LINES.map((l, i) => ({ at: i * SLOT, text: l.text, voice: l.voice, who: l.who })),
  { out, engine: 'piper', voice: 'zh-TW', save: false, length: LINES.length * SLOT });
if (vo.engine !== 'piper') throw new Error('找不到語音引擎,請確認 PATH 與 PIPER_MODEL');
const DUR = vo.lines.map((l) => +(l.end - l.t).toFixed(3));

// ---------- 句中停頓:10 ms 一格的音量,安靜超過 60 ms 算一個停頓 ----------
const STRENGTH = { '。': 3, '？': 3, '！': 3, '：': 2, '；': 2, '，': 2, '、': 1 };
function marksOf(i) {
  const l = vo.lines[i], x = vo.bus.L.subarray(Math.round(l.t * SR), Math.round(l.end * SR));
  const hop = SR / 100, n = Math.floor(x.length / hop), e = new Float32Array(n);
  for (let k = 0; k < n; k++) { let s = 0; for (let j = 0; j < hop; j++) { const v = x[k * hop + j]; s += v * v; } e[k] = Math.sqrt(s / hop); }
  const pk = e.reduce((a, v) => Math.max(a, v), 0), thr = pk * 0.06;
  let on = 0; while (on < n && e[on] < thr) on++;
  let off = n; while (off > on && e[off - 1] < thr) off--;
  const runs = [];
  for (let k = on, s = -1; k <= off; k++) {
    const q = k < off && e[k] < thr;
    if (q && s < 0) s = k;
    if (!q && s >= 0) { if (k - s >= 6) runs.push({ a: s / 100, b: k / 100, used: false }); s = -1; }
  }
  // 文字裡的標點:後面還有字要念的,才是句中的停頓
  const chars = [...LINES[i].text], spokenBefore = [];
  let cnt = 0; chars.forEach((ch) => { spokenBefore.push(cnt); if (!STRENGTH[ch]) cnt++; });
  const N = cnt, t0 = on / 100, t1 = off / 100;
  const marks = [];
  chars.forEach((ch, c) => { if (STRENGTH[ch] && spokenBefore[c] < N && (c === 0 || !STRENGTH[chars[c - 1]])) marks.push({ c, n: spokenBefore[c], w: STRENGTH[ch], a: null, b: null }); });
  // 先對最強的標點(句號),再對逗號、頓號;每個標點找預估時間附近、順序不亂的停頓
  const near = (k, dir) => { for (let j = k + dir; j >= 0 && j < marks.length; j += dir) if (marks[j].a != null) return j; return -1; };
  const est = (k) => {
    const p = near(k, -1), q = near(k, 1);
    const [na, ta] = p < 0 ? [0, t0] : [marks[p].n, marks[p].b];
    const [nb, tb] = q < 0 ? [N, t1] : [marks[q].n, marks[q].a];
    return { t: ta + (tb - ta) * (marks[k].n - na) / Math.max(1, nb - na), lo: ta, hi: tb, span: tb - ta };
  };
  const order = marks.map((m, k) => k).sort((a, b) => marks[b].w - marks[a].w || a - b);
  for (const k of order) {
    const E = est(k), tol = Math.max(0.45, 0.3 * E.span);
    let best = null;
    for (const r of runs) {
      if (r.used || r.a <= E.lo || r.b >= E.hi) continue;
      const d = Math.abs((r.a + r.b) / 2 - E.t);
      if (d <= tol && (!best || d - (r.b - r.a) * 0.5 < best.d - (best.r.b - best.r.a) * 0.5)) best = { r, d };
    }
    if (best) { best.r.used = true; marks[k].a = best.r.a; marks[k].b = best.r.b; marks[k].found = true; }
  }
  for (let k = 0; k < marks.length; k++) if (marks[k].a == null) { const E = est(k); marks[k].a = marks[k].b = E.t; marks[k].found = false; }
  return { on: +t0.toFixed(2), off: +t1.toFixed(2), marks: marks.map((m) => ({ c: m.c, a: +m.a.toFixed(2), b: +m.b.toFixed(2), ...(m.found ? {} : { guess: true }) })) };
}
const PH = LINES.map((_, i) => marksOf(i));

fs.writeFileSync(path.join(__dirname, 'durations.js'),
  '// prep-voice.js 寫的檔案,不要手改。DUR:每句長度(秒)。PH:每句的開口/收口時間(on/off),以及每個標點的停頓\n' +
  '// marks: [{ c: 標點在 text 裡的位置, a: 停頓開始, b: 停頓結束 }](秒,從這一句開始算;guess = 沒聽到停頓,用字數估的)\n' +
  `(function () { const DUR = ${JSON.stringify(DUR)};\n  const PH = ${JSON.stringify(PH)};\n` +
  "  if (typeof module !== 'undefined') module.exports = { DUR, PH }; else { globalThis.DUR = DUR; globalThis.PH = PH; } })();\n");

LINES.forEach((l, i) => {
  const segs = []; let c0 = 0;
  for (const m of PH[i].marks) { segs.push(`${l.text.slice(c0, m.c + 1)}[${m.a.toFixed(2)}${m.guess ? '?' : ''}]`); c0 = m.c + 1; }
  segs.push(l.text.slice(c0));
  console.log(`${String(i + 1).padStart(2)} ${DUR[i].toFixed(2)}s ${l.voice.padEnd(16)} ${segs.join(' ')}`);
});
console.log('total voice', DUR.reduce((a, b) => a + b, 0).toFixed(1) + 's');
