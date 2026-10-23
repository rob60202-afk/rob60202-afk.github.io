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
   ├─ 無持倉：機率 ≥ 0.60 且價格在 EMA50 之上 → 買進
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

輸出範例（用模擬資料跑的，僅示範格式，不代表真實績效）：

```json
{
  "strategy_return_pct": 0.85,
  "buy_hold_return_pct": -19.51,
  "max_drawdown_pct": -1.88,
  "sharpe": 1.02,
  "trades": 13,
  "win_rate_pct": 61.5,
  "profit_factor": 1.42
}
```

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

**連續虧損暫停後怎麼恢復**：打開 `state.json`，把 `"halted": true` 改成 `false`，重新啟動。

---

## 五、已知限制（請務必了解）

1. **停損是機器人自己盯的**：程式或電腦關掉時，停損不會執行。實盤建議放在 24 小時開機的 VPS，
   或自行加上幣安的 OCO / 停損單。
2. **AI 不是預言家**：模型訓練完會在 log 印出 AUC，0.5 等於亂猜，0.55 以上才算有一點點訊號。
   加密市場的 AUC 通常落在 0.50～0.56。
3. **回測假設**：以 K 棒的高低點判斷停損 / 停利，同一根同時觸及時保守假設先停損；
   滑價固定 0.05%，極端行情下實際滑價會更大。
4. **只支援單一幣對、現貨、做多**。
5. 不構成任何投資建議。

---

## 六、安全提醒

- `.env` 已列入 `.gitignore`，**永遠不要把 API Key commit 上 GitHub**（這個 repo 是公開的）。
- API Key 一旦外流，立刻到幣安刪除。
- 不要使用網路上來路不明的「AI 交易機器人」或把 Key 交給別人代操。
