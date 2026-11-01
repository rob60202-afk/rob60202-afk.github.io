#!/usr/bin/env node
// start.bat 的中文選單：選場次 → 選動作 → 執行 bot.js（中文放在 Node 這邊顯示，避免 .bat 編碼亂碼）
const { spawnSync } = require('child_process');
const path = require('path');
const readline = require('readline/promises');

const TARGETS = [
  ['11/2   11:00  B100 岩霧灰', '1102-1100-b100-gray'],
  ['11/2   23:00  B100 曜石黑', '1102-2300-b100-black'],
  ['11/9   11:00  S100 沐雲白', '1109-1100-s100-white'],
  ['11/9   23:00  S100 曜石黑', '1109-2300-s100-black'],
  ['11/11  11:00  C300 二代 Pro 沐雲白', '1111-1100-c300-white'],
  ['11/11  23:00  C300 二代 Pro 曜石黑', '1111-2300-c300-black'],
];
const ACTIONS = { L: ['login'], C: ['check'], R: ['run'], M: ['run', '--no-submit'] };

// 每次提問都開新的 readline 再關掉，執行 bot.js 時才不會搶走 Ctrl+C
async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

(async () => {
  for (;;) {
    console.log('\n========== 選擇場次 ==========');
    TARGETS.forEach(([label], i) => console.log(` ${i + 1}. ${label}`));
    console.log(' 0. 離開');
    const t = await ask('請輸入編號後按 Enter：');
    if (t === '0') return;
    const target = TARGETS[Number(t) - 1];
    if (!target) continue;

    console.log(`\n========== ${target[0]}：選擇動作 ==========`);
    console.log(' L. 登入會員：第一次必做，登入完成後關掉瀏覽器');
    console.log(' C. 檢查：確認按鈕抓不抓得到，不會下單');
    console.log(' R. 開始搶購（自動下單）：開賣前 10 分鐘執行。結帳頁確認是 NT$11、只有這張椅子、貨到付款，就直接送出');
    console.log(' M. 開始搶購（不自動下單）：停在結帳頁，由你自己按送出');
    const action = ACTIONS[(await ask('請輸入 L / C / R / M 後按 Enter：')).toUpperCase()];
    if (!action) continue;

    const [cmd, ...flags] = action;
    const args = [path.join(__dirname, 'bot.js'), cmd, path.join(__dirname, 'targets', `${target[1]}.json`), ...flags];
    spawnSync(process.execPath, args, { stdio: 'inherit' });
    await ask('\n按 Enter 回到選單');
  }
})();
