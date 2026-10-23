"""AI 模型：用梯度提升樹預測「未來 N 根 K 棒上漲超過手續費」的機率。"""
import json
import os
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, roc_auc_score
from sklearn.model_selection import TimeSeriesSplit

from features import FEATURE_COLUMNS, add_features, add_label


def build_model() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_iter=300,
        learning_rate=0.03,
        max_depth=4,
        min_samples_leaf=50,
        l2_regularization=1.0,
        early_stopping=True,
        validation_fraction=0.15,
        random_state=42,
    )


def prepare_dataset(ohlcv: pd.DataFrame, horizon: int, fee_rate: float):
    df = add_label(add_features(ohlcv), horizon, fee_rate)
    df = df.dropna(subset=FEATURE_COLUMNS + ["label"])
    return df[FEATURE_COLUMNS], df["label"].astype(int), df


def walk_forward_report(X: pd.DataFrame, y: pd.Series, splits: int = 5) -> dict:
    """時間序列交叉驗證：永遠用過去訓練、未來驗證，評估模型是否真的有預測力。"""
    tscv = TimeSeriesSplit(n_splits=splits)
    aucs, accs, precs = [], [], []
    for train_idx, test_idx in tscv.split(X):
        m = build_model().fit(X.iloc[train_idx], y.iloc[train_idx])
        proba = m.predict_proba(X.iloc[test_idx])[:, 1]
        pred = (proba >= 0.5).astype(int)
        y_test = y.iloc[test_idx]
        if y_test.nunique() > 1:
            aucs.append(roc_auc_score(y_test, proba))
        accs.append(accuracy_score(y_test, pred))
        precs.append(precision_score(y_test, pred, zero_division=0))
    return {
        "auc": float(np.mean(aucs)) if aucs else float("nan"),
        "accuracy": float(np.mean(accs)),
        "precision": float(np.mean(precs)),
        "base_rate": float(y.mean()),
    }


def train(ohlcv: pd.DataFrame, horizon: int, fee_rate: float, model_path: str) -> dict:
    X, y, _ = prepare_dataset(ohlcv, horizon, fee_rate)
    if len(X) < 500:
        raise ValueError(f"訓練資料太少（{len(X)} 筆），請增加 TRAIN_BARS")
    report = walk_forward_report(X, y)
    model = build_model().fit(X, y)

    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump(model, model_path)
    meta = {"trained_at": time.time(), "samples": len(X), "horizon": horizon, **report}
    with open(model_path + ".json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return meta


def load(model_path: str):
    if not os.path.exists(model_path):
        return None, None
    meta = {}
    if os.path.exists(model_path + ".json"):
        with open(model_path + ".json", encoding="utf-8") as f:
            meta = json.load(f)
    return joblib.load(model_path), meta


def predict_latest(model, ohlcv: pd.DataFrame) -> tuple[float, pd.Series]:
    """回傳最新一根「已收盤」K 棒的上漲機率，以及該列特徵（含 atr、close）。"""
    df = add_features(ohlcv).dropna(subset=FEATURE_COLUMNS)
    last = df.iloc[-1]
    proba = float(model.predict_proba(df[FEATURE_COLUMNS].iloc[[-1]])[:, 1][0])
    return proba, last
