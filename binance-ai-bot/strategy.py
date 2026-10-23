"""交易決策與風控。回測與實盤共用同一份邏輯，避免「回測一套、實盤一套」。"""
from dataclasses import dataclass
from typing import Optional

from config import Config


@dataclass
class Position:
    qty: float
    entry_price: float
    stop_price: float
    take_profit: float
    opened_at: str


def position_size(cfg: Config, equity: float, cash: float, price: float, atr_value: float) -> float:
    """固定風險部位法：停損打到時，虧損 ≈ 總資金 * RISK_PER_TRADE。"""
    stop_distance = atr_value * cfg.stop_atr_mult
    if stop_distance <= 0 or price <= 0:
        return 0.0
    qty_by_risk = equity * cfg.risk_per_trade / stop_distance
    qty_by_cap = equity * cfg.max_position_pct / price
    qty_by_cash = cash * (1 - cfg.fee_rate * 2) / price
    return max(0.0, min(qty_by_risk, qty_by_cap, qty_by_cash))


def entry_signal(cfg: Config, proba: float, trend_ok: bool) -> bool:
    return proba >= cfg.entry_proba and trend_ok


def exit_reason(cfg: Config, pos: Position, low: float, high: float, close: float, proba: float) -> Optional[tuple[str, float]]:
    """回傳 (出場原因, 出場價)。同一根 K 棒同時碰到停損與停利時，保守假設先停損。"""
    if low <= pos.stop_price:
        return "stop_loss", pos.stop_price
    if high >= pos.take_profit:
        return "take_profit", pos.take_profit
    if proba <= cfg.exit_proba:
        return "model_exit", close
    return None


def trail_stop(cfg: Config, pos: Position, close: float, atr_value: float) -> None:
    """移動停損：價格往有利方向走時，停損跟著往上拉，只升不降。"""
    new_stop = close - atr_value * cfg.stop_atr_mult
    if new_stop > pos.stop_price:
        pos.stop_price = new_stop
