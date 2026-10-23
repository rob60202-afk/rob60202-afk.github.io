"""幣安連線：抓 K 線、查餘額、下市價單。paper 模式只用公開行情，下單在本地模擬。"""
import logging
import os

import ccxt
import pandas as pd

from config import Config

log = logging.getLogger("exchange")


class Exchange:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        params = {"enableRateLimit": True, "options": {"defaultType": "spot"}}
        if cfg.mode in ("testnet", "live"):
            params.update(apiKey=cfg.api_key, secret=cfg.api_secret)
        self.client = ccxt.binance(params)
        if cfg.mode == "testnet":
            self.client.set_sandbox_mode(True)
        self.client.load_markets()
        self.market = self.client.market(cfg.symbol)

    # ---------- 行情 ----------
    def fetch_ohlcv(self, limit: int) -> pd.DataFrame:
        """分頁抓取最近 limit 根 K 棒，並丟掉尚未收盤的最後一根。"""
        tf_ms = self.client.parse_timeframe(self.cfg.timeframe) * 1000
        since = self.client.milliseconds() - (limit + 1) * tf_ms
        rows: list = []
        while len(rows) < limit + 1:
            batch = self.client.fetch_ohlcv(self.cfg.symbol, self.cfg.timeframe, since=since, limit=1000)
            if not batch:
                break
            rows.extend(batch)
            since = batch[-1][0] + tf_ms
            if len(batch) < 1000:
                break
        df = pd.DataFrame(rows, columns=["ts", "open", "high", "low", "close", "volume"])
        df = df.drop_duplicates("ts").set_index("ts")
        df.index = pd.to_datetime(df.index, unit="ms", utc=True)
        # 最後一根 K 棒的收盤時間如果還沒到，代表還在跑，不能拿來算特徵
        now = pd.Timestamp.now(tz="UTC")
        if len(df) and df.index[-1] + pd.Timedelta(milliseconds=tf_ms) > now:
            df = df.iloc[:-1]
        return df.tail(limit).astype(float)

    def load_or_fetch_history(self, limit: int) -> pd.DataFrame:
        os.makedirs(self.cfg.data_dir, exist_ok=True)
        name = f"{self.cfg.symbol.replace('/', '')}_{self.cfg.timeframe}.csv"
        path = os.path.join(self.cfg.data_dir, name)
        df = self.fetch_ohlcv(limit)
        df.to_csv(path)
        return df

    def last_price(self) -> float:
        return float(self.client.fetch_ticker(self.cfg.symbol)["last"])

    # ---------- 帳戶 / 下單（testnet / live） ----------
    def balances(self) -> tuple[float, float]:
        bal = self.client.fetch_balance()
        free = bal.get("free", {})
        return float(free.get(self.cfg.quote_asset, 0) or 0), float(free.get(self.cfg.base_asset, 0) or 0)

    def min_notional(self) -> float:
        cost = self.market.get("limits", {}).get("cost", {}) or {}
        return float(cost.get("min") or 5.0)

    def market_buy(self, qty: float) -> dict:
        amount = float(self.client.amount_to_precision(self.cfg.symbol, qty))
        log.info("送出市價買單 %s %s", amount, self.cfg.symbol)
        # 下單不自動重試：逾時不代表沒成交，重送可能變成重複下單
        return self.client.create_market_buy_order(self.cfg.symbol, amount)

    def market_sell(self, qty: float) -> dict:
        amount = float(self.client.amount_to_precision(self.cfg.symbol, qty))
        log.info("送出市價賣單 %s %s", amount, self.cfg.symbol)
        return self.client.create_market_sell_order(self.cfg.symbol, amount)
