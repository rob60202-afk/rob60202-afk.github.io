"""回測：前段資料訓練模型，後段資料（模型沒看過）模擬交易，含手續費與滑價。

同一個模型會模擬兩次：開啟防護（A 異常波動暫停、B 重大事件避開）與關閉防護，方便比較效果。
"""
import ccxt
import numpy as np
import pandas as pd

from config import Config
from features import FEATURE_COLUMNS, add_features
from guards import Event, entry_block_reason, is_shock, shock_pause_until
from model import build_model, prepare_dataset
from strategy import Position, entry_signal, exit_reason, position_size, trail_stop

SLIPPAGE = 0.0005


def run_backtest(cfg: Config, ohlcv: pd.DataFrame, events: list[Event], train_ratio: float = 0.7) -> dict:
    split = int(len(ohlcv) * train_ratio)
    train_raw = ohlcv.iloc[:split]
    X, y, _ = prepare_dataset(train_raw, cfg.horizon, cfg.fee_rate)
    # 訓練集最後 horizon 根的標籤會用到測試期的價格，這裡已經被 dropna 去掉，不會洩漏
    model = build_model().fit(X, y)

    # 特徵用完整資料計算（指標需要暖機），但只在測試期交易
    feats = add_features(ohlcv).iloc[split:].dropna(subset=FEATURE_COLUMNS)
    proba = model.predict_proba(feats[FEATURE_COLUMNS])[:, 1]

    period = feats.index[0], feats.index[-1]
    events_in_period = [e for e in events if period[0] <= e.when <= period[1]]
    return {
        "with_guards": simulate(cfg, feats, proba, events, guards=True),
        "without_guards": simulate(cfg, feats, proba, events, guards=False),
        "events_in_period": len(events_in_period),
    }


def simulate(cfg: Config, feats: pd.DataFrame, proba: np.ndarray, events: list[Event], guards: bool) -> dict:
    tf = pd.Timedelta(seconds=ccxt.Exchange.parse_timeframe(cfg.timeframe))
    cash = cfg.paper_start_balance
    pos: Position | None = None
    pending_entry = False
    trades, equity_curve = [], []
    day, day_start_equity = None, cash
    shock_until = None
    blocked = {"shock": 0, "event": 0}

    for i, (ts, bar) in enumerate(feats.iterrows()):
        equity_open = cash + (pos.qty * bar["open"] if pos else 0)
        if ts.date() != day:
            day, day_start_equity = ts.date(), equity_open
        daily_halt = equity_open < day_start_equity * (1 - cfg.max_daily_loss_pct)

        # 1) 上一根收盤出訊號 → 這一根開盤進場
        if pending_entry and pos is None and not daily_halt:
            price = bar["open"] * (1 + SLIPPAGE)
            prev_atr = feats["atr"].iloc[i - 1]
            qty = position_size(cfg, cash, cash, price, prev_atr)
            if qty * price >= 10:
                cash -= qty * price * (1 + cfg.fee_rate)
                pos = Position(
                    qty=qty,
                    entry_price=price,
                    stop_price=price - prev_atr * cfg.stop_atr_mult,
                    take_profit=price + prev_atr * cfg.take_profit_atr_mult,
                    opened_at=str(ts),
                )
        pending_entry = False

        # 2) 持倉中：檢查停損 / 停利 / 模型出場
        if pos:
            r = exit_reason(cfg, pos, bar["low"], bar["high"], bar["close"], proba[i])
            if r:
                reason, px = r
                px *= 1 - SLIPPAGE
                proceeds = pos.qty * px * (1 - cfg.fee_rate)
                cost = pos.qty * pos.entry_price * (1 + cfg.fee_rate)
                cash += proceeds
                trades.append({"open": pos.opened_at, "close": str(ts), "reason": reason, "pnl": proceeds - cost,
                               "ret": proceeds / cost - 1})
                pos = None
            else:
                trail_stop(cfg, pos, bar["close"], bar["atr"])

        # 3) 收盤判斷是否進場（順勢過濾：價格在 EMA50 之上才做多）
        #    K 棒時間是開盤時間，收盤 = ts + 一根週期，也就是實盤下單的時間點
        bar_close = ts + tf
        if guards and is_shock(cfg, bar["shock_ratio"]):
            shock_until = shock_pause_until(cfg, bar_close)
        if pos is None and entry_signal(cfg, proba[i], bar["ema_ratio_50"] > 0):
            block = entry_block_reason(cfg, bar_close, shock_until, events) if guards else None
            if block:
                blocked[block] += 1
            else:
                pending_entry = True

        equity_curve.append(cash + (pos.qty * bar["close"] if pos else 0))

    eq = pd.Series(equity_curve, index=feats.index)
    result = summarize(cfg, eq, trades, feats["close"])
    if guards:
        result["blocked_entries"] = blocked
    return result


def summarize(cfg: Config, eq: pd.Series, trades: list, close: pd.Series) -> dict:
    tr = pd.DataFrame(trades)
    wins = tr[tr["pnl"] > 0] if len(tr) else tr
    losses = tr[tr["pnl"] <= 0] if len(tr) else tr
    dd = (eq / eq.cummax() - 1).min()
    bar_ret = eq.pct_change().dropna()
    bars_per_year = 365 * 24 * 3600 / ccxt.Exchange.parse_timeframe(cfg.timeframe)
    sharpe = bar_ret.mean() / bar_ret.std() * np.sqrt(bars_per_year) if bar_ret.std() > 0 else 0.0
    gross_loss = -losses["pnl"].sum() if len(losses) else 0
    return {
        "period": f"{eq.index[0]:%Y-%m-%d} ~ {eq.index[-1]:%Y-%m-%d}",
        "start_equity": cfg.paper_start_balance,
        "end_equity": round(float(eq.iloc[-1]), 2),
        "strategy_return_pct": round((eq.iloc[-1] / cfg.paper_start_balance - 1) * 100, 2),
        "buy_hold_return_pct": round((close.iloc[-1] / close.iloc[0] - 1) * 100, 2),
        "max_drawdown_pct": round(float(dd) * 100, 2),
        "sharpe": round(float(sharpe), 2),
        "trades": len(tr),
        "win_rate_pct": round(len(wins) / len(tr) * 100, 1) if len(tr) else 0,
        "profit_factor": round(wins["pnl"].sum() / gross_loss, 2) if gross_loss > 0 else None,
        "exit_reasons": tr["reason"].value_counts().to_dict() if len(tr) else {},
    }
