# 故事動畫自動製作流程

把一份故事腳本(JSON)自動做成有配音、字幕、鏡頭推移的動態漫畫影片。

## 使用方式

```bash
pip install gTTS
```

```bash
python3 animation/make_video.py animation/stories/001-crooked-chair.json
```

加上 `--vertical` 會輸出 9:16 的短影音版本。

成品在 `animation/output/<故事編號>/`:

| 檔案 | 用途 |
|---|---|
| `<編號>.mp4` | 成品影片(字幕已燒入) |
| `<編號>.srt` | 字幕檔,上傳 YouTube 時可另外掛上 |
| `upload.txt` | 標題、說明、標籤與上傳提醒 |

## 寫新故事

複製 `stories/001-crooked-chair.json` 改內容即可:

- `characters`:固定角色的外觀描述(英文)。在每一幕的 `image` 裡寫代號(如 `MASTER`),程式會自動換成完整描述,讓角色長相前後一致。
- `style`:全片共用的畫風描述。
- `seed`:固定數字,同一支片不要改,畫風才會穩定。
- `scenes`:每一幕一段旁白(`narration`)加一張圖的描述(`image`)。

## 流程分工

| 步驟 | 工具 | 是否自動 |
|---|---|---|
| 腳本與分鏡 | Claude | 自動產出,人工審稿 |
| 配音 | Google 語音(gTTS) | 自動 |
| 繪圖 | Pollinations | 自動(免費版每 45 秒 1 張) |
| 鏡頭、字幕、合成 | ffmpeg | 自動 |
| 審片、封面、上傳 | 人工 | 手動 |

圖片與配音會快取在 `animation/.cache/`,中斷後重跑會從斷點接續;想重畫某一幕,刪掉對應的 `imageNN.jpg` 再跑一次。
