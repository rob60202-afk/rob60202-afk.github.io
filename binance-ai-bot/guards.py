"""進場防護：A. 異常波動暫停　B. 重大事件避開。回測與實盤共用。

兩個防護都只會「擋住開新倉」，不會強迫出場；已持有的部位照樣由停損 / 停利保護。
"""
import csv
import logging
import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo

import pandas as pd

from config import Config

log = logging.getLogger("guards")

# 依序嘗試的檔案編碼：UTF-8（記事本、程式預設）→ cp950（Excel / 記事本在繁中 Windows 存成的 ANSI）
_ENCODINGS = ("utf-8-sig", "cp950")


@dataclass
class Event:
    when: pd.Timestamp  # UTC
    name: str


def _read_text(path: str) -> str:
    with open(path, "rb") as f:
        raw = f.read()
    for enc in _ENCODINGS:
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"{path} 的文字編碼無法辨識，請用記事本開啟後「另存新檔」，編碼選 UTF-8")


def _parse_row(cells: list[str]) -> Event:
    when, tz, name = (cells + ["", "", ""])[:3]
    when, tz, name = when.strip(), tz.strip(), name.strip()
    if ":" not in when:
        raise ValueError("datetime 要有日期和時間，例如 2026-12-09 14:00")
    ts = pd.Timestamp(when)
    if pd.isna(ts):
        raise ValueError("datetime 讀不出時間")
    if ts.tzinfo is not None:
        raise ValueError("datetime 不要寫時區，時區請寫在 timezone 欄")
    if not tz:
        raise ValueError("timezone 不能空白，例如 America/New_York 或 Asia/Taipei")
    return Event(ts.tz_localize(ZoneInfo(tz)).tz_convert("UTC"), name or "（未命名事件）")


def load_events(path: str) -> list[Event]:
    """讀取事件清單 CSV（欄位 datetime,timezone,name），時間用當地時間填寫，自動處理夏令時間。

    檔案不存在 → 回傳空清單（B 停用）；格式或編碼有問題 → 一律丟出 ValueError，訊息含行號。
    """
    if not os.path.exists(path):
        log.warning("找不到事件清單 %s，重大事件避開（B）停用", path)
        return []
    events = []
    header_seen = False
    for lineno, line in enumerate(_read_text(path).splitlines(), start=1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        cells = next(csv.reader([line]))
        if not any(c.strip() for c in cells):  # Excel 清空的列會變成 ",,"
            continue
        if not header_seen and cells[0].strip().lower() == "datetime":
            header_seen = True
            continue
        try:
            events.append(_parse_row(cells))
        except Exception as e:
            raise ValueError(f"{path} 第 {lineno} 行格式錯誤：{line.strip()}（{e}）") from e
    return sorted(events, key=lambda e: e.when)


def event_in_window(cfg: Config, now: pd.Timestamp, events: list[Event]) -> Event | None:
    """now 落在某事件「前 N 小時 ~ 後 M 小時」內，就回傳該事件。前後都設 0 代表停用。"""
    if cfg.event_before_hours == 0 and cfg.event_after_hours == 0:
        return None
    before = pd.Timedelta(hours=cfg.event_before_hours)
    after = pd.Timedelta(hours=cfg.event_after_hours)
    for ev in events:
        if ev.when - before <= now <= ev.when + after:
            return ev
    return None


def next_event(now: pd.Timestamp, events: list[Event]) -> Event | None:
    return next((ev for ev in events if ev.when > now), None)


def is_shock(cfg: Config, shock_ratio: float) -> bool:
    """這根 K 棒的真實波幅超過「前一根 ATR × 倍數」就算異常波動。倍數設 0 代表停用。"""
    return cfg.shock_atr_mult > 0 and pd.notna(shock_ratio) and shock_ratio >= cfg.shock_atr_mult


def shock_pause_until(cfg: Config, bar_close: pd.Timestamp) -> pd.Timestamp:
    return bar_close + pd.Timedelta(hours=cfg.shock_pause_hours)


def latest_shock(cfg: Config, feats: pd.DataFrame, tf: pd.Timedelta) -> tuple[pd.Timestamp, float] | None:
    """在整段 K 棒裡找最近一次異常波動，回傳（暫停到幾點, 波幅倍數）；沒有就回傳 None。

    實盤用這個掃最近 300 根，所以重開機、斷線漏掉的 K 棒也不會漏判（和回測逐根檢查結果相同）。
    """
    hits = feats.index[[is_shock(cfg, r) for r in feats["shock_ratio"]]]
    if len(hits) == 0:
        return None
    ts = hits[-1]
    return shock_pause_until(cfg, ts + tf), float(feats.at[ts, "shock_ratio"])


def entry_block_reason(cfg: Config, now: pd.Timestamp, shock_until: pd.Timestamp | None,
                       events: list[Event]) -> str | None:
    """回傳擋住進場的原因；None 代表可以進場。"""
    if shock_until is not None and now < shock_until:
        return "shock"
    if event_in_window(cfg, now, events):
        return "event"
    return None
