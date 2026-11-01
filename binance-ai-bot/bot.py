"""自動交易主迴圈：每根 K 棒收盤用 AI 模型判斷進出場，盤中每次輪詢檢查停損 / 停利。"""
import csv
import json
import logging
import os
import time
from dataclasses import asdict
from datetime import datetime, timezone

import ccxt
import pandas as pd

import guards
import model as ai
from config import Config
from exchange import Exchange
from features import add_features
from strategy import Position, entry_signal, exit_reason, position_size, trail_stop

log = logging.getLogger("bot")
PAPER_SLIPPAGE = 0.0005
FEATURE_BARS = 300  # 計算指標所需的最近 K 棒數


class Bot:
    def __init__(self, cfg: Config):
        cfg.validate()
        self.cfg = cfg
        self.ex = Exchange(cfg)
        self.model_path = os.path.join(cfg.model_dir, f"{cfg.symbol.replace('/', '')}_{cfg.timeframe}.joblib")
        self.model, self.meta = ai.load(self.model_path)
        self.state = self._load_state()
        self.tf = pd.Timedelta(seconds=ccxt.Exchange.parse_timeframe(cfg.timeframe))
        # 事件清單讀不到也要能啟動（不然持倉沒人顧）；None = 沒有可用清單 → 修好前不開新倉
        self.events: list[guards.Event] | None = None
        try:
            self.events = guards.load_events(cfg.events_file)
        except Exception as e:
            log.error("事件清單讀取失敗，修好前不開新倉（已持有的部位照常停損 / 停利）：%s", e)
        self.shock: tuple[pd.Timestamp, float] | None = None

    # ---------- 狀態保存（重啟後能接續原本的部位） ----------
    def _load_state(self) -> dict:
        if os.path.exists(self.cfg.state_file):
            with open(self.cfg.state_file, encoding="utf-8") as f:
                state = json.load(f)
            if state.get("mode") != self.cfg.mode:
                raise RuntimeError(f"state.json 屬於 {state.get('mode')} 模式，切換模式前請先備份並刪除它")
            return state
        return {
            "mode": self.cfg.mode,
            "paper_cash": self.cfg.paper_start_balance,
            "position": None,
            "last_bar": None,
            "day": None,
            "day_start_equity": None,
            "consecutive_losses": 0,
            "halted": False,
            "shock_until": None,
        }

    def _save_state(self) -> None:
        tmp = self.cfg.state_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2, ensure_ascii=False)
        os.replace(tmp, self.cfg.state_file)

    @property
    def position(self) -> Position | None:
        p = self.state["position"]
        return Position(**p) if p else None

    @position.setter
    def position(self, pos: Position | None) -> None:
        self.state["position"] = asdict(pos) if pos else None

    # ---------- 帳戶 ----------
    def cash(self) -> float:
        if self.cfg.mode == "paper":
            return self.state["paper_cash"]
        return self.ex.balances()[0]

    def equity(self, price: float) -> float:
        pos = self.position
        return self.cash() + (pos.qty * price if pos else 0.0)

    # ---------- 模型 ----------
    def ensure_model(self) -> None:
        age_h = (time.time() - self.meta.get("trained_at", 0)) / 3600 if self.meta else float("inf")
        if self.model is not None and age_h < self.cfg.retrain_hours:
            return
        log.info("訓練 AI 模型中（抓 %s 根 %s K 棒）...", self.cfg.train_bars, self.cfg.timeframe)
        history = self.ex.load_or_fetch_history(self.cfg.train_bars)
        self.meta = ai.train(history, self.cfg.horizon, self.cfg.fee_rate, self.model_path)
        self.model, _ = ai.load(self.model_path)
        log.info("模型完成：樣本 %s，AUC %.3f，準確率 %.3f，基準上漲率 %.3f",
                 self.meta["samples"], self.meta["auc"], self.meta["accuracy"], self.meta["base_rate"])
        if self.meta["auc"] < 0.52:
            log.warning("模型 AUC < 0.52，預測力接近亂猜，建議只用 paper 模式觀察")

    # ---------- 下單 ----------
    def buy(self, price: float, atr_value: float) -> None:
        cash = self.cash()
        qty = position_size(self.cfg, self.equity(price), cash, price, atr_value)
        notional = qty * price
        if notional < max(self.ex.min_notional(), 10):
            log.info("計算部位 %.2f %s 低於最小下單金額，跳過", notional, self.cfg.quote_asset)
            return

        if self.cfg.mode == "paper":
            fill = price * (1 + PAPER_SLIPPAGE)
            self.state["paper_cash"] -= qty * fill * (1 + self.cfg.fee_rate)
        else:
            order = self.ex.market_buy(qty)
            fill = float(order.get("average") or price)
            # 手續費可能從幣本身扣，所以用實際可用餘額為準
            qty = min(float(order.get("filled") or qty), self.ex.balances()[1])

        self.position = Position(
            qty=qty,
            entry_price=fill,
            stop_price=fill - atr_value * self.cfg.stop_atr_mult,
            take_profit=fill + atr_value * self.cfg.take_profit_atr_mult,
            opened_at=datetime.now(timezone.utc).isoformat(),
        )
        log.info("✅ 買進 %.6f @ %.2f，停損 %.2f，停利 %.2f",
                 qty, fill, self.position.stop_price, self.position.take_profit)

    def sell(self, price: float, reason: str) -> None:
        pos = self.position
        if self.cfg.mode == "paper":
            fill = price * (1 - PAPER_SLIPPAGE)
            self.state["paper_cash"] += pos.qty * fill * (1 - self.cfg.fee_rate)
        else:
            qty = min(pos.qty, self.ex.balances()[1])
            order = self.ex.market_sell(qty)
            fill = float(order.get("average") or price)

        pnl = pos.qty * (fill * (1 - self.cfg.fee_rate) - pos.entry_price * (1 + self.cfg.fee_rate))
        self.state["consecutive_losses"] = 0 if pnl > 0 else self.state["consecutive_losses"] + 1
        if self.state["consecutive_losses"] >= self.cfg.max_consecutive_losses:
            self.state["halted"] = True
            log.error("⛔ 連續虧損 %s 筆，機器人暫停。檢討後把 state.json 的 halted 改回 false 再啟動",
                      self.state["consecutive_losses"])
        self.position = None
        log.info("💰 賣出 %.6f @ %.2f（%s），損益 %.2f %s", pos.qty, fill, reason, pnl, self.cfg.quote_asset)
        self._log_trade(pos, fill, reason, pnl)

    @staticmethod
    def _now() -> pd.Timestamp:
        return pd.Timestamp.now(tz="UTC")

    @staticmethod
    def _local(ts: pd.Timestamp) -> str:
        """轉成電腦所在時區顯示（在台灣就是台灣時間）。"""
        return ts.to_pydatetime().astimezone().strftime("%m/%d %H:%M")

    def _log_trade(self, pos: Position, fill: float, reason: str, pnl: float) -> None:
        os.makedirs("logs", exist_ok=True)
        path = os.path.join("logs", "trades.csv")
        new = not os.path.exists(path)
        with open(path, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["mode", "symbol", "opened_at", "closed_at", "qty", "entry", "exit", "reason", "pnl"])
            w.writerow([self.cfg.mode, self.cfg.symbol, pos.opened_at, datetime.now(timezone.utc).isoformat(),
                        pos.qty, pos.entry_price, fill, reason, round(pnl, 4)])

    # ---------- 主流程 ----------
    def step(self) -> None:
        self.ensure_model()
        price = self.ex.last_price()
        equity = self.equity(price)

        today = datetime.now(timezone.utc).date().isoformat()
        if self.state["day"] != today:
            self.state["day"], self.state["day_start_equity"] = today, equity
        daily_loss_hit = equity < self.state["day_start_equity"] * (1 - self.cfg.max_daily_loss_pct)

        # 盤中：每次輪詢都用即時價檢查停損 / 停利
        pos = self.position
        if pos:
            r = exit_reason(self.cfg, pos, price, price, price, proba=1.0)
            if r:
                self.sell(price, r[0])
                pos = None

        # 新 K 棒收盤：跑 AI 模型
        bars = self.ex.fetch_ohlcv(FEATURE_BARS)
        bar_ts = str(bars.index[-1])
        if bar_ts != self.state["last_bar"]:
            self.state["last_bar"] = bar_ts
            proba, last = ai.predict_latest(self.model, bars)
            trend_ok = last["ema_ratio_50"] > 0
            log.info("K 棒 %s 收 %.2f｜上漲機率 %.3f｜趨勢%s｜權益 %.2f %s",
                     bar_ts, last["close"], proba, "向上" if trend_ok else "向下", equity, self.cfg.quote_asset)

            # 1) 先處理持倉：防護只管進場，所以放在出場之後，防護出任何錯都不會影響出場與移動停損
            if pos:
                if proba <= self.cfg.exit_proba:
                    self.sell(price, "model_exit")
                else:
                    trail_stop(self.cfg, pos, last["close"], last["atr"])
                    self.position = pos

            # 2) 防護檢查。時間點 = K 棒收盤（和回測一致）；如果這根 K 棒晚處理（重開機、斷線），
            #    也用「現在」再檢查一次，避免晚了才下單、剛好落在事件時段內
            bar_close = bars.index[-1] + self.tf
            now = self._now()
            guards_ok = self._refresh_guards(bars, max(bar_close, now))

            # 3) 沒持倉才考慮進場
            if pos:
                pass  # 這根 K 棒已處理過持倉，不同時進場
            elif self.state["halted"]:
                log.warning("機器人處於暫停狀態，不開新倉")
            elif daily_loss_hit:
                log.warning("今日虧損已達上限 %.1f%%，今天不再開新倉", self.cfg.max_daily_loss_pct * 100)
            elif entry_signal(self.cfg, proba, trend_ok):
                if not guards_ok:
                    log.warning("有進場訊號，但防護資料不完整（看上面的錯誤訊息），保守起見不開新倉")
                elif reason := self._entry_block(bar_close, now):
                    log.warning("有進場訊號，但%s，不開新倉", reason)
                else:
                    self.buy(price, last["atr"])

        self._save_state()

    # ---------- 進場防護 ----------
    def _refresh_guards(self, bars: pd.DataFrame, ref: pd.Timestamp) -> bool:
        """重讀事件清單、掃描異常波動、預告事件。絕不丟出例外；回傳 False 代表防護資料不完整。"""
        ok = True
        try:  # 每根 K 棒重讀，改清單不用重開
            self.events = guards.load_events(self.cfg.events_file)
        except Exception as e:
            ok = self.events is not None
            log.error("事件清單讀取失敗，%s：%s", "沿用上一次的清單" if ok else "修好前不開新倉", e)

        try:
            self.shock = guards.latest_shock(self.cfg, add_features(bars), self.tf)
            until = self.shock[0].isoformat() if self.shock else None
            if self.shock and self.shock[0] > ref and until != self.state.get("shock_until"):
                log.warning("⚡ 異常波動：波幅是平常的 %.1f 倍，%s 前不開新倉",
                            self.shock[1], self._local(self.shock[0]))
            self.state["shock_until"] = until
        except Exception:
            ok = False
            log.exception("異常波動檢查失敗")

        if self.events:
            upcoming = guards.next_event(ref, self.events)
            if upcoming and upcoming.when - ref <= pd.Timedelta(hours=24) \
                    and self.state.get("announced_event") != upcoming.when.isoformat():
                self.state["announced_event"] = upcoming.when.isoformat()
                log.info("📅 24 小時內有重大事件：%s（%s）", upcoming.name, self._local(upcoming.when))
        return ok

    def _entry_block(self, bar_close: pd.Timestamp, now: pd.Timestamp) -> str | None:
        """回傳擋住進場的原因（中文），None 代表可以進場。K 棒收盤與現在兩個時間點都要通過。"""
        shock_until = self.shock[0] if self.shock else None
        for t in (bar_close, now):
            block = guards.entry_block_reason(self.cfg, t, shock_until, self.events)
            if block == "shock":
                return f"異常波動暫停中（到 {self._local(shock_until)}）"
            if block == "event":
                ev = guards.event_in_window(self.cfg, t, self.events)
                return f"接近重大事件「{ev.name}」（{self._local(ev.when)}）"
        return None

    def run(self, once: bool = False) -> None:
        log.info("啟動｜模式 %s｜%s %s", self.cfg.mode.upper(), self.cfg.symbol, self.cfg.timeframe)
        if self.cfg.mode == "live":
            log.warning("⚠️  LIVE 模式：會用真錢下單！")
        while True:
            try:
                self.step()
            except KeyboardInterrupt:
                raise
            except Exception:
                log.exception("本輪發生錯誤，下一輪再試")
            if once:
                return
            time.sleep(self.cfg.poll_seconds)
