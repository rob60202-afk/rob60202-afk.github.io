"""從 .env / 環境變數讀取設定。"""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


def _i(name: str, default: int) -> int:
    return int(os.getenv(name, default))


@dataclass
class Config:
    mode: str = os.getenv("MODE", "paper").lower()
    live_confirm: str = os.getenv("LIVE_CONFIRM", "")
    api_key: str = os.getenv("BINANCE_API_KEY", "")
    api_secret: str = os.getenv("BINANCE_API_SECRET", "")

    symbol: str = os.getenv("SYMBOL", "BTC/USDT")
    timeframe: str = os.getenv("TIMEFRAME", "1h")
    train_bars: int = _i("TRAIN_BARS", 5000)

    horizon: int = _i("HORIZON", 4)
    entry_proba: float = _f("ENTRY_PROBA", 0.60)
    exit_proba: float = _f("EXIT_PROBA", 0.45)
    retrain_hours: float = _f("RETRAIN_HOURS", 24)

    risk_per_trade: float = _f("RISK_PER_TRADE", 0.01)
    max_position_pct: float = _f("MAX_POSITION_PCT", 0.30)
    stop_atr_mult: float = _f("STOP_ATR_MULT", 2.0)
    take_profit_atr_mult: float = _f("TAKE_PROFIT_ATR_MULT", 3.0)
    max_daily_loss_pct: float = _f("MAX_DAILY_LOSS_PCT", 0.03)
    max_consecutive_losses: int = _i("MAX_CONSECUTIVE_LOSSES", 4)
    fee_rate: float = _f("FEE_RATE", 0.001)

    # A. 異常波動暫停
    shock_atr_mult: float = _f("SHOCK_ATR_MULT", 3.0)
    shock_pause_hours: float = _f("SHOCK_PAUSE_HOURS", 6)
    # B. 重大事件避開
    events_file: str = os.getenv("EVENTS_FILE", "events.csv")
    event_before_hours: float = _f("EVENT_BEFORE_HOURS", 2)
    event_after_hours: float = _f("EVENT_AFTER_HOURS", 2)

    paper_start_balance: float = _f("PAPER_START_BALANCE", 1000)
    poll_seconds: int = _i("POLL_SECONDS", 60)

    model_dir: str = "models"
    data_dir: str = "data"
    state_file: str = "state.json"

    def validate(self) -> None:
        if self.mode not in ("paper", "testnet", "live"):
            raise ValueError(f"MODE 必須是 paper / testnet / live，目前是 {self.mode!r}")
        if self.mode in ("testnet", "live") and not (self.api_key and self.api_secret):
            raise ValueError(f"MODE={self.mode} 需要設定 BINANCE_API_KEY / BINANCE_API_SECRET")
        if self.mode == "live" and self.live_confirm != "I_UNDERSTAND_THE_RISK":
            raise ValueError("真實下單需要在 .env 設定 LIVE_CONFIRM=I_UNDERSTAND_THE_RISK")
        if not 0 < self.risk_per_trade <= 0.05:
            raise ValueError("RISK_PER_TRADE 建議介於 0 ~ 0.05（單筆最多虧 5%）")
        if self.exit_proba >= self.entry_proba:
            raise ValueError("EXIT_PROBA 必須小於 ENTRY_PROBA")
        if self.shock_atr_mult < 0 or self.shock_pause_hours < 0:
            raise ValueError("SHOCK_ATR_MULT / SHOCK_PAUSE_HOURS 不能是負數")
        if self.event_before_hours < 0 or self.event_after_hours < 0:
            raise ValueError("EVENT_BEFORE_HOURS / EVENT_AFTER_HOURS 不能是負數")

    @property
    def base_asset(self) -> str:
        return self.symbol.split("/")[0]

    @property
    def quote_asset(self) -> str:
        return self.symbol.split("/")[1]
