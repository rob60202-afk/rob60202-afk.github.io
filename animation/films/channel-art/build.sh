#!/usr/bin/env bash
# 頻道圖像素材:算靜態圖 → 縮放到 YouTube 要的尺寸 → 產生檢查圖。
# 用法(在這個資料夾裡):bash build.sh
# 輸出到 animation/series/channel/:
#   avatar.png 800×800、banner.png 2560×1440、L003-thumbnail.png 1280×720
#   avatar-circle-preview.png、banner-safe-area-preview.png、L003-thumbnail-small.png
# 只算三張靜態圖(各幾秒鐘),不算影片。
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
[ -d engine ] || { echo "缺少 engine/:先在專案根目錄執行 bash animation/tools/restore-engines.sh" >&2; exit 1; }
DEST=../../series/channel
mkdir -p "$DEST" out/art

# 頭像:1:1 舞台,算成 1600×1600,再縮成 800×800(線條邊緣比較細緻)
node engine/render.js stills @avatar --format 1:1 --res 1600
mv out/stills/t_000.50.png out/art/avatar-1600.png
ffmpeg -v error -y -i out/art/avatar-1600.png -vf scale=800:800:flags=lanczos -pix_fmt rgb24 "$DEST/avatar.png"

# 橫幅:16:9 舞台,--res 1440 直接算成 2560×1440
node engine/render.js stills @banner --res 1440
mv out/stills/t_001.50.png out/art/banner-2560.png
ffmpeg -v error -y -i out/art/banner-2560.png -pix_fmt rgb24 "$DEST/banner.png"

# 縮圖:16:9 舞台 1920×1080,縮成 1280×720
node engine/render.js stills @thumb
mv out/stills/t_002.50.png out/art/thumb-1920.png
ffmpeg -v error -y -i out/art/thumb-1920.png -vf scale=1280:720:flags=lanczos -pix_fmt rgb24 "$DEST/L003-thumbnail.png"

python3 previews.py "$DEST/avatar.png" "$DEST/banner.png" "$DEST/L003-thumbnail.png" "$DEST"
for f in avatar banner L003-thumbnail avatar-circle-preview banner-safe-area-preview L003-thumbnail-small; do
  printf '%-28s %s  %s bytes\n' "$f.png" "$(ffprobe -v error -show_entries stream=width,height -of csv=s=x:p=0 "$DEST/$f.png")" "$(stat -c %s "$DEST/$f.png")"
done
