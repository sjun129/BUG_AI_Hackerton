"""XGBoost 혼잡도 예측 모델 학습 + 시계열 교차검증."""
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error
import xgboost as xgb

import config
from features import add_features


def main():
    df = pd.read_csv(config.PROCESSED_PATH)
    df = add_features(df)

    X = df[config.FEATURE_COLS]
    y = df[config.LABEL_COL]

    tscv = TimeSeriesSplit(n_splits=5)   # 시계열은 무작위 분할 금지
    rmses, maes = [], []
    model = None
    for tr, va in tscv.split(X):
        model = xgb.XGBRegressor(
            n_estimators=400, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42,
        )
        model.fit(X.iloc[tr], y.iloc[tr])
        pred = model.predict(X.iloc[va])
        rmses.append(np.sqrt(mean_squared_error(y.iloc[va], pred)))
        maes.append(mean_absolute_error(y.iloc[va], pred))

    metrics = {"rmse": float(np.mean(rmses)), "mae": float(np.mean(maes))}
    print("CV metrics:", metrics)

    joblib.dump(model, config.MODEL_PATH)
    with open(config.METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"saved -> {config.MODEL_PATH}")


if __name__ == "__main__":
    main()
