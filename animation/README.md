# 動畫製作手冊

「工程現場故事」每一集都是程式畫出來的:畫面用程式逐格繪製,音樂用程式合成,配音用 Google 語音(gTTS)。不用買素材,不用 AI 繪圖額度。

這份手冊給之後接手的人(或新的 Claude 工作階段)看:照著做,就能把任何一集重新算出來,或做出新的一集。

## 一、資料夾

```
animation/
├── films/<集名>/        每一集一個資料夾
│   ├── lines.js          台詞(一句一行;who: 'shu' 阿樹、'master' 陳師傅,沒寫就是旁白)
│   ├── prep-voice.js     先合成每句配音、量出長度 → durations.js
│   ├── durations.js      每句配音的秒數(自動產生,有進版控)
│   ├── score.js          時間軸:每句台詞、每個動作、每個音效的時間點,全片唯一的時間來源
│   ├── song.js           合成音樂並混入配音 → out/music.wav
│   ├── film.js           畫面:給一個時間點,畫出那一格
│   ├── index.html        算圖時在瀏覽器裡載入上面這些
│   ├── engine/           繪圖引擎(不在版控內,用還原指令複製進來)
│   └── out/              輸出的影片與檢查圖(不在版控內)
├── vendor/animation-studio-engine/   繪圖引擎的正本(MIT 授權,見資料夾內 LICENSE)
├── lib/                  長片共用的工具(長片做法見 lib/LONGFORM.md)
├── tools/piper           配音轉接程式:引擎呼叫 piper 時,實際用 gTTS 合成
├── tools/restore-engines.sh
└── series/               題庫、腳本、審查紀錄、上架資料
```

## 二、換到新的工作環境時

雲端環境會被回收,各集的 `engine/` 與 `out/` 不在版控內。新環境先做:

```bash
pip install gTTS
```

```bash
bash animation/tools/restore-engines.sh
```

需要 Node 22 以上、ffmpeg、Chromium(雲端環境已內建)。還原程式會提醒缺了什麼。

## 三、做一集 60 秒短片(直式 9:16)

以下指令都在該集的資料夾裡執行。

1. **建立資料夾。** 複製上一集的 `lines.js`、`prep-voice.js`、`score.js`、`song.js`、`film.js`、`index.html`、`package.json`,不要複製 `out/`;再跑一次還原指令補上 `engine/`。
2. **寫台詞。** 改 `lines.js`,內容取自 `series/` 底下的腳本。
3. **量配音長度。**

   ```bash
   PATH=../../tools:$PATH PIPER_MODEL=zh-TW node prep-voice.js
   ```

4. **排時間軸、畫畫面。** 改 `score.js` 與 `film.js`。角色造型沿用前幾集,定義在 `film.js` 開頭的 `CAST`:

   | 角色 | 造型 | 配音 |
   |---|---|---|
   | 阿樹 | 白 T、灰長褲、黑髮、瘦,進現場戴黃色安全帽 | `zh-TW,pitch=1.08` |
   | 陳師傅 | 綠襯衫、咖啡長褲、灰髮、圓眼鏡、小鬍子、壯,進現場戴白色安全帽 | `zh-TW,pitch=0.86` |
   | 旁白 | | `zh-TW` |
   | 其他男性 | | `zh-TW,pitch=0.94` |
   | 其他女性 | | `zh-TW,pitch=1.15` |

5. **合成音樂與配音。**

   ```bash
   PATH=../../tools:$PATH PIPER_MODEL=zh-TW node song.js
   ```

6. **先看檢查圖,再算整支。** 檢查圖很快,畫面有問題先在這一步改。

   ```bash
   node engine/render.js sheet
   ```

   ```bash
   node engine/render.js video
   ```

   ```bash
   node engine/render.js mux field-0X
   ```

7. **轉成上傳用的檔案。**

   ```bash
   ffmpeg -y -v error -i out/field-0X.mp4 -c:v libx264 -crf 21 -preset medium -c:a copy -movflags +faststart out/field-0X-web.mp4
   ```

雲端環境只有 4 核心,同時算圖最多兩支,不然每一支都會變很慢。

## 三之一、換成付費配音(可以一句一句換)

`tools/piper` 會先找 `voice-cache/` 裡有沒有這一句的錄音,有就用,沒有才用免費的 gTTS。所以不用改任何一集的程式。

1. 列出一集每一句的代號與狀態:

   ```bash
   python3 animation/tools/voice_key.py list animation/films/field-01-quotation
   ```

2. 用付費語音服務產生該句的錄音(例如 Creative Claw 的台灣口音聲音),下載後放進快取:

   ```bash
   python3 animation/tools/voice_key.py put "zh-TW" "這麼高,你的高空車,算在哪一行?" 下載的檔案.mp3
   ```

3. 回到該集資料夾,重跑 `prep-voice.js`、`song.js`,再算圖。配音長度變了,時間軸會跟著自動調整。

代號只看語言與文字,不看音高設定;同一句文字在不同集會共用同一個錄音。付費錄音有花錢,`voice-cache/` 要進版控。

## 四、驗收標準

每一集交出去之前,從成品影片抽格做一張總覽圖,逐項看:

- [ ] 字幕每一句都看得到,不被角色或道具擋住,也不超出畫面
- [ ] 角色的臉沒有被字卡或道具蓋住
- [ ] 嘴型只在該角色講話時動
- [ ] 工安畫面是正確示範:進現場戴安全帽,高處作業有扣安全帶;錯誤示範只出現在故事的「出事前」,而且結尾一定有正確做法
- [ ] 沒有任何真實公司、品牌、業主名稱,沒有可辨識的真實單價
- [ ] 技術數值、法規、測試壓力沒有寫成定論;需要時寫「依規範」「依合約」
- [ ] 長度 45–60 秒,結尾卡有教訓那一句

## 五、內容規則

1. 所有故事、人物、公司都是虛構的。
2. 技術內容發佈前必須由有實務經驗的人審過,`series/` 裡標「待確認」的內容不可以寫成事實。
3. 每一集搭配一個免費工具(在網站的 `tools/`),上架資料在 `series/upload-batch*.md`。
4. 長片腳本要先經過三方審查(現場、技術、觀眾三種觀點),審查紀錄放在 `series/long/`。

## 六、舊流程(已停用)

`make_video.py` 與 `stories/` 是最早的做法:用免費 AI 繪圖產生靜態圖,再加配音與鏡頭推移。免費繪圖服務有浮水印、人物前後不一致,所以停用,保留做紀錄。
