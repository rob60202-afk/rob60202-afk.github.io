# 工程現場故事:16:9 長片製作手冊(給 L003 第 2 單元以後的製作)

L003〈報價單上漏掉的那一行〉約 10 分鐘,拆成幾個「單元」分開做、分開算圖,最後接起來。
第 1 單元 `films/L003-u1`(開場鉤子 + 第 1 章)已經做完,這份手冊把它定下來的做法寫清楚。
畫風、角色、背景、表格、字幕全部在 `animation/lib/longform-kit.js`(下稱 kit)。**後面的單元不要自己重畫這些東西**,
缺什麼就加進 kit(往下相容),再把 kit 複製到各單元。

---

## 1. 開一個新單元

單元資料夾:`animation/films/L003-u2`、`L003-u3`……(`L` + 片號 + `-u` + 單元序號)。
算圖輸出的檔名跟資料夾同名:`out/L003-u2.mp4`、網路版 `out/L003-u2-web.mp4`。

建議切法(一個單元 = 一章,大約 1 分鐘上下;第 6 章資訊最密,可以再切):

| 單元 | 內容 |
|---|---|
| L003-u1 | 開場鉤子 + 第 1 章(已完成,110 秒) |
| L003-u2 | 第 2 章 天花板上的那一行 |
| L003-u3 | 第 3 章 成本是一棟六層樓 |
| L003-u4 | 第 4 章 從圖面量出數量 |
| L003-u5 | 第 5 章 最常漏掉的九行 |
| L003-u6 | 第 6 章 重算一次:前後對照 |
| L003-u7 | 第 7 章 假設與不含 |
| L003-u8 | 第 8 章 送出之前的一頁紙 + 結尾卡 |

```bash
cd /home/user/rob60202-afk.github.io/animation/films
mkdir L003-u2
cp -r L003-u1/engine L003-u1/package.json L003-u1/.gitignore L003-u2/   # engine/ 一個字都不要改
cp ../lib/longform-kit.js L003-u2/                                      # 算圖伺服器只給資料夾裡的檔案
cp L003-u1/index.html L003-u1/prep-voice.js L003-u2/                    # 這兩個直接沿用
# lines.js、score.js、song.js、film.js 照 L003-u1 的寫法重寫
```

每次改了 `lib/longform-kit.js`,都要再複製一次到每個還要算圖的單元,算圖前用 `diff` 確認兩份一樣。

### index.html 的載入順序(不能換)

```
engine/util.js → engine/music.js → lines.js → durations.js → score.js →
engine/video/gfx.js → engine/video/chars.js → engine/video/ui.js → engine/video/shots.js →
engine/subs.js → engine/data/geo.js → engine/video/data.js → engine/video/boot.js →
longform-kit.js → film.js
```

`score.js` 裡 `FORMAT = '16:9'`。舞台是 1920 × 1080,所有座標都用這個舞台座標。

### 做一個單元的順序

```bash
cd /home/user/rob60202-afk.github.io/animation/films/L003-u2
python3 -c "import gtts" || pip install -q gTTS
PATH=/home/user/rob60202-afk.github.io/animation/tools:$PATH PIPER_MODEL=zh-TW node prep-voice.js   # 每句的長度與停頓 → durations.js
#   寫 score.js(事件時間)、film.js(鏡頭)
PATH=/home/user/rob60202-afk.github.io/animation/tools:$PATH PIPER_MODEL=zh-TW node song.js         # 配樂 + 配音 → out/music.wav、out/voice.json
node engine/render.js sheet 1 <長度-1> 12 4        # 看 out/sheet.png
node engine/render.js stills 12.3 20 @shatter      # 看 out/stills/*.png(時間可以用 score.js 的 markers)
node engine/render.js video                         # 30–60 分鐘(機器上還有別人在算圖時);背景執行
node engine/render.js mux
ffmpeg -y -v error -i out/L003-u2.mp4 -c:v libx264 -crf 21 -preset medium -c:a copy -movflags +faststart out/L003-u2-web.mp4
```

---

## 2. 台詞與聲音

`lines.js` 一列 = 腳本「旁白或台詞」欄的一列,`text` 照抄(拿掉「旁白:」「阿樹:」這種標籤,標點用全形)。

| 角色 | `who`(對嘴) | `voice` |
|---|---|---|
| 旁白 | `narrator` | `zh-TW` |
| 阿樹 | `shu` | `zh-TW,pitch=1.08` |
| 陳師傅 | `master` | `zh-TW,pitch=0.86` |
| 甲方承辦(女性,沿用第 4 集短片的「承辦」造型) | `client` | `zh-TW,pitch=1.15` |
| 工班班長(男) | `crew` | `zh-TW,pitch=0.94` |
| 老闆(男) | `boss` | `zh-TW,pitch=0.94` |
| 其他男性 / 女性 | 自訂 | `zh-TW,pitch=0.94` / `zh-TW,pitch=1.15` |

- `display`:字幕要顯示的寫法。只把金額、數量換成阿拉伯數字加千分位(「九萬」→「90,000」),念的還是 `text`。
  `display` 裡可以放 `|`,指定太長的句子從哪裡換下一行字幕(字幕上不會出現)。不要在「兩|吋」這種數字和單位中間切。
- `prep-voice.js` 用每一句自己的 `voice` 合成,寫出 `durations.js`:`DUR`(每句長度)與 `PH`(每句開口/收口時間、每個標點的停頓)。
  執行時會印出每句的標點停頓時間;後面有 `?` 的是沒聽到停頓、用字數估的,那一句的畫面事件要自己對一下。
- 語音快取在 `out/.vo-cache`,`song.js` 會用同一份。改了 `text` 或 `voice` 就要重跑 `prep-voice.js` 和 `song.js`。

---

## 3. 時間軸(score.js)

照 `L003-u1/score.js` 的寫法:

- 每句起點:`LEAD 0.6` 秒開始,句與句之間 `GAP 0.45` 秒,`HOLD = { 句號: 秒 }` 讓需要喘口氣的畫面(蓋章、碎掉、加總放大、角標縮小)多停一下。
- **畫面事件一律用 `when(句, '字串', 0|1)` 對到念到哪個字**(0 = 開始念這幾個字,1 = 念完),不要手寫秒數。
  它用 `PH` 的標點停頓把一句切成幾段,段內照字數分配,誤差大約 0.1–0.2 秒。
- 章卡:`KIT.CHAPTER = 1.2` 秒,硬切進、硬切出;章卡後留 0.35 秒再開始下一句。
  **第 2 單元以後,每個單元從章卡開始**(t = 0 就是章卡,第一句在 1.55 秒左右開始)。
- `markers` 放每個重要事件,`render.js stills @名字` 才找得到;需要聲音和畫面同步檢查的加 `sync: 'av'`。
- 每個單元最後留 2.2 秒,音樂在最後 1.6 秒淡出,**畫面不淡黑**(`Studio.film({ fadeOut: 0 })`),下一個單元直接接章卡。

---

## 4. kit API 一覽

詳細參數在 `longform-kit.js` 檔頭的註解。全部都是「參數 + 時間 t」的純函式:**不准用 `Math.random`、`Date.now`**,亂數用 `U.hash` / `G.rnd`。

| 類別 | 函式 |
|---|---|
| 常數 | `KIT.W` `KIT.H` `KIT.SAFE` `KIT.C`(顏色)`KIT.L`(版面約定)`KIT.CJK` `KIT.NUM` `KIT.CHAPTER` |
| 角色 | `KIT.CAST.{shu, shuSite, master, masterSite, masterRest, client, clientSite, crew, crewSite, boss}` · `KIT.person(ctx, o)` · `KIT.onSite(style, 帽色, 背心)` · `KIT.hand()` · `KIT.world()` · `KIT.headPos()` · `KIT.harness()` · `KIT.lanyard()` · `KIT.snapHook()` |
| 小工具 | `KIT.lin` `KIT.rad` `KIT.fill` `KIT.mix` `KIT.alpha` `KIT.shade` `KIT.glow` `KIT.label` `KIT.measure` `KIT.wrap` `KIT.popIn` `KIT.fadeIn` `KIT.blink` `KIT.mouth` `KIT.warm` `KIT.stroke` `KIT.partial` `KIT.tick` `KIT.cross` `KIT.sparkle` `KIT.burst` `KIT.cached` `KIT.floorLines` `KIT.pipeRun` |
| 背景 | `KIT.bg.fab` `KIT.bg.office`(白天/晚上)`KIT.bg.clientOffice` `KIT.bg.restArea` `KIT.bg.whiteboard` |
| 道具 | `KIT.desk` `KIT.officeChair` `KIT.monitor` `KIT.keyboard` `KIT.printer` `KIT.lamp` `KIT.wallClock` `KIT.phone` `KIT.chat` `KIT.stamp` `KIT.shatter` `KIT.crown` `KIT.envelope` `KIT.cone` `KIT.warnTape` `KIT.extinguisher` `KIT.lift` `KIT.hungHelmet` |
| 介面 | `KIT.card` `KIT.table` `KIT.checklist` `KIT.chapterCard` `KIT.bubble` `KIT.badge` `KIT.badgeRect` `KIT.disclaimer` |
| 字幕 | `KIT.buildCaptions(vo)` `KIT.drawCaption(ctx, t, caps)` `KIT.capLength` |
| L003 資料 | `KIT.L003.TABLE1`(表 1 阿樹版)`KIT.L003.QUOTE`(印出來的報價單)`KIT.L003.CREW_QUOTE`(班長那則訊息,含最後一行小字)`KIT.L003.SHU_ASK` |

常用寫法:

```js
// 工地裡的人:一律用 *Site 造型(安全帽 + 扣好的頤帶 + 背心)
KIT.person(ctx, { x: 700, y: KIT.L.ground, s: 1, pose: 'stand', style: KIT.CAST.masterSite, seed: 440, mouth: KIT.mouth(VO, t, 'master') || 'flat' });
// 站上高空作業車的人:全身式安全帶,掛鉤扣在頭上方的錨點
const L = KIT.lift(ctx, 760, KIT.L.ground, 0.9, 380);
KIT.person(ctx, { x: L.deck[0] - 40, y: L.deck[1], s: 0.9, pose: 'stand', style: KIT.CAST.crewSite, harness: { clip: L.anchor } });
// 表 1 在第 2 章「在材料和工資中間裂開一條空白行,閃紅光」:插一列 open(從 0 高度裂開)+ flash(紅色虛線閃)
const rows = KIT.L003.TABLE1.map((r) => ({ ...r }));
rows.splice(1, 0, { cells: ['', ''], open: ev.split, flash: true });
KIT.table(ctx, t, { ...KIT.L.table, title: KIT.L003.TABLE1_TITLE, head: ['項目', '金額'], rows });
```

`KIT.table` 的每一列可以有:`at`(彈出)、`hi`(黃色螢光筆亮起,數字或 `[開始, 結束]`)、`strike`(紅線劃掉)、`big`(數字放大)、
`kind: 'sub' | 'total'`(小計/總計的線與顏色)、`open`(從 0 高度裂開)、`flash`(紅色虛線閃)、`cells` 裡放 `(t) => 字串` 可以讓數字跟著時間變。
`grow: true` 時還沒出現的列不佔位置(卡片一列一列長高);`foot` 在卡片底下多留空白(手拿著紙時大拇指放那裡,不蓋字)。

---

## 5. 版面約定

| 項目 | 約定 |
|---|---|
| 舞台 | 1920 × 1080,安全框 `KIT.SAFE` = x 54–1866、y 54–1026。所有字都在安全框內 |
| 全景站姿 | `s = 1.0`,腳在 `KIT.L.ground = 900`。人高約 560 px,臉在 y 420–560 |
| 中景 | `s = 1.3–1.45`;坐在桌前:椅子 + 人放在 y 770–800,桌子前緣比臀部低 30–40 px(`KIT.desk` 有擋板,腿不會露出來) |
| 特寫 | `s = 2.0–2.2`,腳放在畫面外(y 1390–1560),臉在 y 440–720 |
| 臉的下緣 | **任何人的下巴都要在 y 880 以上**,下面是字幕區;鏡頭推近時也要算 |
| 表格 | 「畫面右側的表」一律放 `KIT.L.table`(x 1040、y 132、寬 800),內容字 44 px、列高 74、表頭 46、欄名 36。表在的時候人物站在左半邊(x < 960) |
| 字幕區 | y 920–1026。一行一句、置中、基線 y 986、54 px;旁白白字、角色台詞黃字,深色描邊;一行最多 16 個全形字(`KIT.L.cap.maxChars`) |
| 角標 | 「金額皆為示意整數，非市場行情」34 px,貼齊安全框右上角(右緣 1866、上緣 54)。**第 2 單元以後每一格都要畫 `KIT.badge(ctx, t)`**(畫在鏡頭之後、字幕之前,章卡也要) |
| 章卡 | `KIT.chapterCard(ctx, t, t0, { n, title })`,1.2 秒;紅色「第 n 章」標籤、112 px 章名、紅色底線,最後 0.22 秒往上淡出。配一個音樂盒和弦,鋪底音樂在章卡期間降到 0 |
| 最小字級 | 畫面上任何字(停住的時候)都不小於 34 px;手機畫面裡的字也一樣(`KIT.chat` 預設 38 px) |
| 字不蓋臉 | 對話框、字卡、表格、角標都不能蓋到臉。全螢幕字卡(例如示意數字字卡)例外,但卡片後面的表格要先淡掉,不要從卡片旁邊露出半截 |
| 每個鏡頭最後 | `KIT.warm(ctx)`:左上暖光 + 底部微暗(字幕更清楚)。夜景用 `{ color: 'rgba(150,190,255,0.12)' }` |
| 轉場 | 換地點用 `paper`;同一個場景換鏡頭用 `cut`;推到插入畫面(圖面、數字)用 `zoom`;片名用 `flash` |
| 帽色與背心 | 阿樹黃帽、陳師傅白帽、班長橘帽;乙方的人橘色反光背心;甲方承辦訪客藍帽 + 黃綠背心(進工地時頭髮改綁馬尾) |

---

## 6. 工安畫面(腳本製作備註,每一個現場鏡頭都適用)

- 廠房、工地裡的每一個人都戴安全帽、扣好頤帶:用 `KIT.CAST.*Site` 或 `KIT.onSite()`,不要用引擎的 `headwear: 'cap'`(那是棒球帽)。
- 站上高空作業車或施工架平台的人:`harness: { clip: 錨點 }`,掛鉤要扣在肩膀以上的錨點,鏡頭看得到掛鉤。
- 高空作業車下方:`KIT.cone` + `KIT.warnTape` 圍出管制區,旁邊站一位地面監視人員;管制區內不畫路過的人。
- 動火(焊接)鏡頭:旁邊有監火人員與 `KIT.extinguisher`。**不畫火花。**
- 不畫任何人爬梯子、站在梯頂;梯子只以「打叉」的示意圖出現。不畫機車、轎車扛管子。
- 工作區不畫飲料(咖啡、泡麵只出現在辦公室,休息區可以喝茶)。
- 不出現任何真實公司名稱、商標、車牌、真實廠牌的機具外觀。通訊軟體一律用 `KIT.chat`(沒有任何品牌名稱與標誌,標題列寫角色,例如「班長」)。

---

## 7. 音量

`song.js` 照 `L003-u1/song.js`:

| 軌 | 增益 | 說明 |
|---|---|---|
| 鋪底(lofi) | `Genre.play('lofi', { gain: 0.75 })`;drums 0.34、bass 0.48、pad 0.60、keys 0.55 | 比短片小聲約 4 dB:十分鐘的片子,音樂只是墊底 |
| 人聲 | voice 2.2 | `Voice.speak` 會把每句的音量拉齊 |
| 音效 | fx 0.9、bells 0.8、reverb 0.45 | 一行表格一個音(音樂盒音階 + 小 pop) |
| 閃避 | `MIX.duck(music, vo.bus, { depth: 0.62, release: 0.35 })` | 人聲一出來,音樂再壓下去約 8 dB |
| 安靜的時刻 | `dip()`:重要台詞與「碎掉」降到 0.12;章卡期間降到 0 | 讓那一句被聽見 |
| 母帶 | 開頭 0.25 秒淡入、結尾 1.6 秒淡出、`MIX.master(..., { lufs: -14 })` | 每個單元都是 -14 LUFS,接起來音量一致 |

---

## 8. 算圖前檢查清單

- [ ] `lines.js` 的 `text` 跟腳本一字不差(標點也是);每句有 `who` 和正確的 `voice`;金額有 `display`。
- [ ] `prep-voice.js` 已經跑過,印出來的停頓沒有 `?`(有的話,那一句的 `when()` 事件自己對過)。
- [ ] `song.js` 已經跑過,印出來約 -14 LUFS;聽過章卡、碎掉、加總那幾秒。
- [ ] `index.html` 載入順序正確;`longform-kit.js` 跟 `lib/` 那份 `diff` 一樣;`engine/` 沒有被改過(跟 L003-u1 的 `diff -r` 一樣)。
- [ ] `film.js` 沒有 `Math.random`、`Date.now`(`render.js` 啟動時會警告)。
- [ ] `node engine/render.js sheet 1 <長度-1> 12 4`,每一格都看過;每個 marker 都 `stills` 過。
- [ ] 每個現場鏡頭:安全帽 + 頤帶、平台上有安全帶掛鉤、沒有火花、沒有梯子爬高、工作區沒有飲料。
- [ ] 字:停住時都 ≥ 34 px;沒有字蓋到臉;字幕一行 ≤ 16 字、在 y 920–1026 之間;角標在右上角。
- [ ] `node engine/render.js qa --every 0.5`:沒有 SAFE AREA、沒有真的 OVERLAP / CONTRAST(彈出中、轉場中的那一格可以忽略)。
      引擎的 qa 只抓 16 px 以下;要檢查 34 px,複製整個單元到暫存資料夾,把那份 `engine/tools/qa.js` 的 `MIN_SIZE` 改成 33.5 再跑(不要改單元本身的 engine)。
- [ ] 畫面上沒有任何真實公司、品牌、人名。
- [ ] 算圖完:`ffprobe` 看長度與 1920×1080 / 30 fps / AAC;用最後的 mp4 做一張縮圖表(每 2 秒一格)再看一次。

---

## 9. 接成一支長片

每個單元都由 `render.js mux` 做出同樣規格的檔案(1920×1080、30 fps、H.264 + AAC 48 kHz),可以直接串接:

```bash
cd /home/user/rob60202-afk.github.io/animation/films
printf "file '%s'\n" L003-u1/out/L003-u1.mp4 L003-u2/out/L003-u2.mp4 > /tmp/L003-list.txt   # 依序列出每個單元
ffmpeg -y -v error -f concat -safe 0 -i /tmp/L003-list.txt -c copy L003-full.mp4
```

單元之間不淡黑:前一單元音樂淡出、畫面停在最後一個鏡頭,下一單元從章卡硬切進來。
