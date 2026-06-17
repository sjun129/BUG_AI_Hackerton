"""특성 엔지니어링: 시간/요일/월/공휴일/lag 혼잡도."""
import pandas as pd
import config


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values("timestamp").reset_index(drop=True)
    ts = pd.to_datetime(df["timestamp"])
    df["hour"] = ts.dt.hour
    df["weekday"] = ts.dt.weekday
    df["month"] = ts.dt.month
    for lag in config.LAG_HOURS:
        df[f"congestion_lag{lag}"] = df[config.LABEL_COL].shift(lag)
    return df.dropna().reset_index(drop=True)
