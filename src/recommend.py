"""선박별 최적 입항 시간 추천."""
import datetime as dt
import joblib
import pandas as pd

import config
from wait_time import estimate_wait_hours


def predict_24h(model, weather_forecast: pd.DataFrame, last_known: dict) -> pd.DataFrame:
    """향후 24시간 시간대별 혼잡도 예측.
    weather_forecast: 24행, [timestamp, wind_speed, wave_height, visibility]
    last_known: 최근 lag 혼잡도 값들.
    TODO: lag를 한 스텝씩 갱신하며 재귀 예측(현재는 단순 버전).
    """
    rows = []
    for _, w in weather_forecast.iterrows():
        ts = pd.to_datetime(w["timestamp"])
        feat = {
            "hour": ts.hour, "weekday": ts.weekday(), "month": ts.month,
            "is_holiday": last_known.get("is_holiday", 0),
            "wind_speed": w["wind_speed"], "wave_height": w["wave_height"],
            "visibility": w["visibility"],
            "congestion_lag1": last_known.get("lag1", 0),
            "congestion_lag24": last_known.get("lag24", 0),
            "congestion_lag168": last_known.get("lag168", 0),
        }
        rows.append(feat)
    X = pd.DataFrame(rows)[config.FEATURE_COLS]
    pred = model.predict(X)
    out = weather_forecast[["timestamp"]].copy()
    out["congestion"] = pred
    out["wait_hours"] = [estimate_wait_hours(c) for c in pred]
    return out


def recommend(pred_df: pd.DataFrame, earliest: dt.datetime = None, top_k: int = 3):
    df = pred_df.copy()
    if earliest is not None:
        df = df[pd.to_datetime(df["timestamp"]) >= earliest]
    df = df.sort_values("wait_hours")
    best = df.iloc[0]
    return {
        "recommended_time": str(best["timestamp"]),
        "congestion": round(float(best["congestion"]), 1),
        "expected_wait_hours": float(best["wait_hours"]),
        "alternatives": df.iloc[1:1 + top_k][
            ["timestamp", "congestion", "wait_hours"]
        ].to_dict("records"),
    }
