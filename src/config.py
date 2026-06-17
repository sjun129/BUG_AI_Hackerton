"""프로젝트 전역 설정. 확정된 결정 사항을 한 곳에 모음."""

# ── 대상 / 해상도 ────────────────────────────────
TARGET_BERTH = "5부두"        # 부산항 5부두
TIME_FREQ = "1H"              # 1시간 단위
DATA_YEARS = 1                # 1년치

# ── 혼잡도(label) 정의 ───────────────────────────
# 포화도(%) = (입항 누적 - 출항 누적) / MAX_CAPACITY * 100
# ⚠️ MAX_CAPACITY: 5부두 동시 접안 가능 선박 수. 실제 값 확인 후 수정할 것.
MAX_CAPACITY = 4              # TODO: 5부두 실제 선석 수로 교체

# ── 특성 ─────────────────────────────────────────
LAG_HOURS = [1, 24, 168]      # 과거 1h, 1일, 1주 혼잡도
FEATURE_COLS = [
    "hour", "weekday", "month", "is_holiday",
    "wind_speed", "wave_height", "visibility",
    "congestion_lag1", "congestion_lag24", "congestion_lag168",
]
LABEL_COL = "congestion"

# ── 경로 ─────────────────────────────────────────
RAW_DIR = "data/raw"
PROCESSED_PATH = "data/processed/train_dataset.csv"
MODEL_PATH = "models/xgb_model.pkl"
METRICS_PATH = "models/metrics.json"
