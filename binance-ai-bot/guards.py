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


@dataclass
class Event:
    when: pd.Timestamp  # UTC
    name: str


def load_events(path: str) -> list[Event]:
    """讀取事件清單 CSV（欄位 datetime,timezone,name），時間用當地時間填寫，自動處理夏令時間。"""
    if not os.path.exists(path):
        log.warning("找不到事件清單 %s，重大事件避開（B）停用", path)
        return []
    events = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = (line for line in f if line.strip() and not line.lstrip().startswith("#"))
        for n, row in enumerate(csv.DictReader(rows), start=1):
            try:
                local = pd.Timestamp(row["datetime"].strip()).tz_localize(ZoneInfo(row["timezone"].strip()))
            except Exception as e:
                raise ValueError(f"{path} 第 {n} 筆資料格式錯誤：{row}（{e}）") from e
            events.append(Event(local.tz_convert("UTC"), row["name"].strip()))
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


def entry_block_reason(cfg: Config, now: pd.Timestamp, shock_until: pd.Timestamp | None,
                       events: list[Event]) -> str | None:
    """回傳擋住進場的原因；None 代表可以進場。"""
    if shock_until is not None and now < shock_until:
        return "shock"
    if event_in_window(cfg, now, events):
        return "event"
    return None
