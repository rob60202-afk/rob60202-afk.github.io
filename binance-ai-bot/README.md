# Binance AI 自動交易機器人

用機器學習模型（梯度提升樹）判斷幣安現貨的進出場時機，內建風控與三段式模式：
**paper（紙上交易）→ testnet（測試網）→ live（真錢）**。預設是 paper，不會動到任何資金。

> ⚠️ **風險聲明**：這是工具，不是印鈔機。加密貨幣波動極大，AI 模型對未來的預測力有限，
> 回測賺錢不代表實盤會賺。請只投入「全部虧光也不影響生活」的金額，且務必先跑 paper / testnet。

---

## 一、運作邏輯（一張圖看懂）

```
每根 K 棒收盤
   │
   ├─ 計算 19 個技術指標（RSI、MACD、布林通道、ATR、成交量比…）
   │
   ├─ AI 模型輸出「未來 4 根 K 棒上漲超過手續費」的機率
   │
   ├─ 無持倉：機率 ≥ 0.60 且價格在 EMA50 之上
   │          且沒有被防護擋住（A 異常波動暫停中／B 重大事件前後）→ 買進
   │          部位大小 = 停損打到時只虧總資金 1%
   │
   └─ 有持倉：機率 ≤ 0.45 → 賣出；否則把停損往上拉（移動停損）

每次輪詢（預設 60 秒）
   └─ 即時價觸及停損 / 停利 → 立即賣出
```

| 檔案 | 用途 |
|---|---|
| `features.py` | 技術指標特徵工程（只用過去資料，無偷看未來） |
| `model.py` | AI 模型訓練、時間序列交叉驗證、預測 |
| `strategy.py` | 進出場規則、部位大小、移動停損（回測與實盤共用） |
| `guards.py` | 進場防護：A 異常波動暫停、B 重大事件避開（回測與實盤共用） |
| `events.csv` | 重大事件清單（FOMC 利率決議、美國 CPI 公布），可自行增減 |
| `backtest.py` | 回測（前 70% 訓練、後 30% 驗證，含手續費與滑價） |
| `exchange.py` | 幣安 API（透過 ccxt） |
| `bot.py` | 自動交易主迴圈、狀態保存、風控熔斷 |
| `main.py` | 指令入口 |

---

## 二、安裝

需要 Python 3.10 以上。

```bash
cd binance-ai-bot
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
```

---

## 三、建議的上線流程（不要跳步）

### Step 1：回測（不需要 API Key）

```bash
python main.py backtest
```

同一個模型會跑兩次：`with_guards`（開防護）和 `without_guards`（不開防護），方便比較防護有沒有幫助。

輸出範例（用模擬資料跑的，僅示範格式，不代表真實績效）：

```json
{
  "with_guards": {
    "strategy_return_pct": 0.48,
    "buy_hold_return_pct": -19.51,
    "max_drawdown_pct": -1.45,
    "trades": 10,
    "win_rate_pct": 70.0,
    "profit_factor": 1.33,
    "blocked_entries": { "shock": 4, "event": 1 }
  },
  "without_guards": {
    "strategy_return_pct": 0.85,
    "max_drawdown_pct": -1.88,
    "trades": 13,
    "profit_factor": 1.42
  },
  "events_in_period": 4
}
```

`blocked_entries` 是被防護擋下的「進場訊號」次數（以 K 棒計算，同一段暫停內連續出現的訊號會重複計算）：
`shock` = A 異常波動，`event` = B 重大事件。

**注意**：上面這個例子裡，開防護反而賺得比較少——防護是「保險」，平靜行情時會讓你少做幾筆，
真正的價值在閃崩、重大消息這種少見但傷很重的時候。請用**真實資料**比較 `with_guards` 和
`without_guards`，再決定要不要開、參數要多嚴。

**怎麼看**：

| 指標 | 及格線 | 說明 |
|---|---|---|
| `profit_factor` | > 1.3 | 總獲利 ÷ 總虧損，< 1 代表長期賠錢 |
| `max_drawdown_pct` | > -15% | 最大回檔，你心臟受不受得了 |
| `trades` | > 30 | 交易次數太少，結果沒有統計意義 |
| `strategy_return_pct` vs `buy_hold_return_pct` | — | 如果長期輸給「買了放著」，AI 就沒有價值 |

可以改 `.env` 的 `SYMBOL`、`TIMEFRAME`、`ENTRY_PROBA` 多跑幾次比較，但**不要過度調參**——
調到回測很漂亮，通常只是把歷史背起來（過擬合），實盤會崩。

### Step 2：紙上交易 paper（不需要 API Key，至少跑 2～4 週）

```bash
python main.py run
```

用真實行情、模擬下單。交易紀錄在 `logs/trades.csv`，運作日誌在 `logs/bot.log`。

### Step 3：測試網 testnet（假錢、真下單流程）

1. 到 <https://testnet.binance.vision> 用 GitHub 登入，產生 API Key
2. `.env` 設定：
   ```
   MODE=testnet
   BINANCE_API_KEY=你的測試網Key
   BINANCE_API_SECRET=你的測試網Secret
   ```
3. 刪掉舊的 `state.json`（paper 的狀態不能沿用），再 `python main.py run`

### Step 4：真錢 live（確定前面都 OK 才做）

1. 幣安 → API 管理 → 建立 API Key，**權限只勾「啟用現貨交易」，絕對不要勾「提現」**
2. 設定 **IP 白名單**，只允許跑機器人的那台電腦
3. 專門開一個子帳戶或只放小額資金
4. `.env` 設定：
   ```
   MODE=live
   LIVE_CONFIRM=I_UNDERSTAND_THE_RISK
   BINANCE_API_KEY=...
   BINANCE_API_SECRET=...
   ```
5. 刪掉舊的 `state.json`，再啟動

---

## 四、風控機制

| 機制 | 預設值 | 作用 |
|---|---|---|
| 單筆風險 `RISK_PER_TRADE` | 1% | 停損打到時最多虧總資金 1% |
| 單筆部位上限 `MAX_POSITION_PCT` | 30% | 避免一次 All-in |
| 停損 / 停利 | 2 ATR / 3 ATR | 依波動度動態調整，賺賠比 1.5 |
| 移動停損 | 有 | 賺錢後停損跟著往上拉，只升不降 |
| 單日虧損熔斷 `MAX_DAILY_LOSS_PCT` | 3% | 當天虧到 3% 就不再開新倉 |
| 連續虧損熔斷 `MAX_CONSECUTIVE_LOSSES` | 4 筆 | 暫停機器人，需人工檢討後解除 |
| 只做多、順勢 | 有 | 價格在 EMA50 之下不進場；現貨不放空、不開槓桿 |
| 下單不自動重試 | 有 | 避免網路逾時造成重複下單 |
| 真錢需二次確認 | 有 | 沒設 `LIVE_CONFIRM` 會拒絕啟動 |
| **A. 異常波動暫停** `SHOCK_ATR_MULT` / `SHOCK_PAUSE_HOURS` | 3 倍 / 6 小時 | 單根 K 棒波幅超過平常 3 倍（閃崩、急拉、突發消息），之後 6 小時不開新倉 |
| **B. 重大事件避開** `EVENT_BEFORE_HOURS` / `EVENT_AFTER_HOURS` | 前 2 小時 / 後 2 小時 | `events.csv` 裡的事件前後不開新倉 |

**連續虧損暫停後怎麼恢復**：打開 `state.json`，把 `"halted": true` 改成 `false`，重新啟動。

### A、B 防護補充說明

- 兩個防護都**只擋新倉、不會強迫賣出**。已經持有的部位，照樣由停損 / 停利保護。
- 判斷時間點是每根 K 棒收盤，回測與實盤用同一套邏輯。實盤如果晚處理（重開機、斷線後補上），
  會用「現在時間」再檢查一次；也會往回掃最近 300 根 K 棒，關機期間發生的異常波動不會漏掉。
- 想關掉：`SHOCK_ATR_MULT=0` 關 A；`EVENT_BEFORE_HOURS=0` 加 `EVENT_AFTER_HOURS=0` 關 B。
- **B 只適合 1h、4h 週期**：機器人只在 K 棒收盤時決定要不要進場，日線（1d）收盤在台灣早上 8 點，
  永遠不會落在事件前後 2 小時內，等於沒作用；12h 也只擋得到一部分。用長週期時，請把
  `EVENT_BEFORE_HOURS` 調大（例如 1d 設 24），或接受 B 不生效。

### 怎麼維護 `events.csv`

內建 2026～2027 年的 FOMC 利率決議（14:00 美東）和美國 CPI 公布（08:30 美東），共 40 筆，
都已和聯準會、美國勞工統計局（BLS）的公告核對過。

```
datetime,timezone,name
2026-12-09 14:00,America/New_York,FOMC 利率決議
2026-12-10 08:30,America/New_York,美國 CPI 公布
```

- 時間直接照官方公告的**美東時間**填，`timezone` 寫 `America/New_York`，程式會自動處理美國夏令時間。
  （例：12/9 14:00 美東 = 台灣 12/10 凌晨 3:00）
- 想用台灣時間填也可以，`timezone` 改寫 `Asia/Taipei`。
- 想加其他事件（例如美國非農就業報告），照同樣格式加一行就好。機器人每根 K 棒會重新讀取，不用重開。
- **用「記事本」編輯最安全**（右鍵 → 開啟檔案 → 記事本），存檔時編碼選 UTF-8。
  用 Excel 也可以，另存時選「CSV UTF-8（逗號分隔）」；存成一般 CSV（ANSI）程式也讀得懂。
- 改完看一下 `logs/bot.log`：如果出現「事件清單讀取失敗」，會寫出是第幾行有問題。
  - 機器人**跑到一半**改壞：沿用上一次讀到的正確清單，照常運作。
  - **啟動時**就讀不到：機器人照常啟動、照常顧停損停利，但**修好之前不開新倉**（寧可少做，不要誤闖事件）。
- 日程偶爾會改（例如美國政府停擺），**建議每季核對一次**：
  - FOMC：<https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm>
  - CPI：<https://www.bls.gov/schedule/news_release/cpi.htm>

---

## 五、已知限制（請務必了解）

1. **停損是機器人自己盯的**：程式或電腦關掉時，停損不會執行。實盤建議放在 24 小時開機的 VPS，
   或自行加上幣安的 OCO / 停損單。
2. **AI 不是預言家**：模型訓練完會在 log 印出 AUC，0.5 等於亂猜，0.55 以上才算有一點點訊號。
   加密市場的 AUC 通常落在 0.50～0.56。
3. **回測假設**：以 K 棒的高低點判斷停損 / 停利，同一根同時觸及時保守假設先停損；
   滑價固定 0.05%，極端行情下實際滑價會更大。
4. **只支援單一幣對、現貨、做多**。
5. **防護 B 只認得清單上的事件**：交易所被駭、監管突襲這類無法預先排程的突發事件，只能靠防護 A
   和停損應對；而防護 A 要等那根 K 棒收盤（1h 週期最多等 1 小時）才會觸發。
6. 不構成任何投資建議。

---

## 六、安全提醒

- `.env` 已列入 `.gitignore`，**永遠不要把 API Key commit 上 GitHub**（這個 repo 是公開的）。
- API Key 一旦外流，立刻到幣安刪除。
- 不要使用網路上來路不明的「AI 交易機器人」或把 Key 交給別人代操。
