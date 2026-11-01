"""技術指標特徵工程（只用 pandas，不需要 TA-Lib）。

所有特徵只使用「當根以前」的資料，避免偷看未來（look-ahead bias）。
"""
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "ret_1", "ret_3", "ret_6", "ret_12", "ret_24",
    "volatility_12", "volatility_24",
    "rsi_14", "macd", "macd_signal", "macd_hist",
    "ema_ratio_12_26", "ema_ratio_50", "bb_pos", "bb_width",
    "atr_pct", "vol_ratio", "hl_range", "close_pos",
]


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - 100 / (1 + rs)


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    return pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    return true_range(df).ewm(alpha=1 / period, adjust=False).mean()


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """輸入 OHLCV DataFrame（欄位 open/high/low/close/volume），回傳加上特徵的新 DataFrame。"""
    df = df.copy()
    close = df["close"]

    for n in (1, 3, 6, 12, 24):
        df[f"ret_{n}"] = close.pct_change(n)

    log_ret = np.log(close).diff()
    df["volatility_12"] = log_ret.rolling(12).std()
    df["volatility_24"] = log_ret.rolling(24).std()

    df["rsi_14"] = rsi(close, 14) / 100

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    ema50 = close.ewm(span=50, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    # 除以價格做正規化，讓不同價位的幣都能用
    df["macd"] = macd / close
    df["macd_signal"] = signal / close
    df["macd_hist"] = (macd - signal) / close
    df["ema_ratio_12_26"] = ema12 / ema26 - 1
    df["ema_ratio_50"] = close / ema50 - 1

    ma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    upper, lower = ma20 + 2 * std20, ma20 - 2 * std20
    df["bb_pos"] = (close - lower) / (upper - lower)
    df["bb_width"] = (upper - lower) / ma20

    df["atr"] = atr(df, 14)
    df["atr_pct"] = df["atr"] / close
    # 異常波動防護用（不是模型特徵）：這根真實波幅 ÷ 前一根 ATR
    df["shock_ratio"] = true_range(df) / df["atr"].shift(1)

    df["vol_ratio"] = df["volume"] / df["volume"].rolling(24).mean()
    df["hl_range"] = (df["high"] - df["low"]) / close
    df["close_pos"] = (close - df["low"]) / (df["high"] - df["low"]).replace(0, np.nan)

    return df.replace([np.inf, -np.inf], np.nan)


def add_label(df: pd.DataFrame, horizon: int, fee_rate: float) -> pd.DataFrame:
    """標籤：未來 horizon 根 K 棒的報酬是否大於來回手續費 + 一點緩衝。"""
    df = df.copy()
    future_ret = df["close"].shift(-horizon) / df["close"] - 1
    threshold = fee_rate * 2 + 0.002
    df["future_ret"] = future_ret
    df["label"] = (future_ret > threshold).astype(float)
    df.loc[future_ret.isna(), "label"] = np.nan
    return df
