"""指令入口。

  python main.py backtest            # 抓幣安歷史資料回測（不需要 API Key）
  python main.py backtest --csv x.csv
  python main.py train               # 只訓練模型
  python main.py run                 # 啟動自動交易（依 .env 的 MODE）
  python main.py run --once          # 只跑一輪，方便測試
"""
import argparse
import json
import logging
import os

import pandas as pd

from config import Config


def setup_logging() -> None:
    os.makedirs("logs", exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler("logs/bot.log", encoding="utf-8")],
    )


def load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, index_col=0)
    df.index = pd.to_datetime(df.index, utc=True)
    return df[["open", "high", "low", "close", "volume"]].astype(float)


def main() -> None:
    parser = argparse.ArgumentParser(description="Binance AI 自動交易機器人")
    sub = parser.add_subparsers(dest="cmd", required=True)
    bt = sub.add_parser("backtest")
    bt.add_argument("--csv", help="使用本地 OHLCV CSV（欄位 ts,open,high,low,close,volume）")
    sub.add_parser("train")
    run = sub.add_parser("run")
    run.add_argument("--once", action="store_true")
    args = parser.parse_args()

    setup_logging()
    cfg = Config()

    if args.cmd == "backtest":
        from backtest import run_backtest
        from guards import load_events

        if args.csv:
            ohlcv = load_csv(args.csv)
        else:
            from exchange import Exchange

            cfg.mode = "paper"  # 回測只需要公開行情
            ohlcv = Exchange(cfg).load_or_fetch_history(cfg.train_bars)
        result = run_backtest(cfg, ohlcv, load_events(cfg.events_file))
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.cmd == "train":
        from bot import Bot

        bot = Bot(cfg)
        bot.meta = None
        bot.ensure_model()

    elif args.cmd == "run":
        from bot import Bot

        Bot(cfg).run(once=args.once)


if __name__ == "__main__":
    main()
