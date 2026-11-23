#!/usr/bin/env bash
# 把繪圖引擎複製到每一集的資料夾。各集的 engine/ 不在版控內,換到新的工作環境時先跑這個。
# 用法(在專案根目錄):bash animation/tools/restore-engines.sh
# 只補沒有 engine/ 的資料夾,已經有的不動。
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$here/vendor/animation-studio-engine"
[ -d "$src" ] || { echo "找不到 $src" >&2; exit 1; }
for film in "$here"/films/*/; do
  [ -f "$film/score.js" ] || continue
  if [ -d "$film/engine" ]; then
    echo "已有引擎:$(basename "$film")"
  else
    cp -r "$src" "$film/engine"
    echo "已還原:$(basename "$film")"
  fi
done
command -v ffmpeg >/dev/null || echo "提醒:找不到 ffmpeg" >&2
python3 -c "import gtts" 2>/dev/null || echo "提醒:配音需要 gTTS,請執行 pip install gTTS" >&2
node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || echo "提醒:需要 Node 22 以上" >&2
