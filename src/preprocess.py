"""
raw 데이터 → 시간대별 학습 데이터셋 생성.

핵심 로직: Port-MIS 선박별 입출항 타임스탬프로 5부두 시간대별 포화도를 계산.
  포화도(%) = (입항 누적 - 출항 누적) / MAX_CAPACITY * 100

⚠️ AIS(WMS/WFS)는 연 집계라 여기서 사용하지 않음(보조 통계는 별도).
"""
import pandas as pd
import config


def load_portmis() -> pd.DataFrame:
    """Port-MIS 입출항 로드.
    필요 컬럼(예상): ship_id, arrival_time, departure_time, ship_size, berth
    TODO: 실제 컬럼명 확인 후 rename 매핑 수정.
    """
    df = pd.read_csv(f"{config.RAW_DIR}/portmis/portmis.csv")
    # TODO: 5부두만 필터
    # df = df[df["berth"] == config.TARGET_BERTH]
    df["arrival_time"] = pd.to_datetime(df["arrival_time"])
    df["departure_time"] = pd.to_datetime(df["departure_time"])
    return df


def build_occupancy(df: pd.DataFrame) -> pd.DataFrame:
    """시간 격자에서 각 시각 부두에 정박 중인 선박 수 → 포화도(%)."""
    start = df["arrival_time"].min().floor("H")
    end = df["departure_time"].max().ceil("H")
    grid = pd.date_range(start, end, freq=config.TIME_FREQ)

    occ = []
    for t in grid:
        in_berth = ((df["arrival_time"] <= t) & (df["departure_time"] > t)).sum()
        occ.append(in_berth)

    out = pd.DataFrame({"timestamp": grid, "in_berth": occ})
    out["congestion"] = out["in_berth"] / config.MAX_CAPACITY * 100
    return out


def merge_weather(df: pd.DataFrame) -> pd.DataFrame:
    """기상청 데이터 병합. TODO: 실제 컬럼명 확인."""
    w = pd.read_csv(f"{config.RAW_DIR}/weather/weather.csv")
    w["timestamp"] = pd.to_datetime(w["timestamp"])
    return df.merge(w[["timestamp", "wind_speed", "wave_height", "visibility"]],
                    on="timestamp", how="left")


def merge_holiday(df: pd.DataFrame) -> pd.DataFrame:
    h = pd.read_csv(f"{config.RAW_DIR}/holiday/holiday.csv")
    h["date"] = pd.to_datetime(h["date"]).dt.date
    df["date"] = df["timestamp"].dt.date
    df = df.merge(h[["date", "is_holiday"]], on="date", how="left")
    df["is_holiday"] = df["is_holiday"].fillna(0).astype(int)
    return df.drop(columns=["date"])


def main():
    df = load_portmis()
    df = build_occupancy(df)
    df = merge_weather(df)
    df = merge_holiday(df)
    df.to_csv(config.PROCESSED_PATH, index=False)
    print(f"saved -> {config.PROCESSED_PATH}  ({len(df)} rows)")


if __name__ == "__main__":
    main()
