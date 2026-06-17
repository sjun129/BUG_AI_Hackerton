"""Streamlit 대시보드 (MVP 골격).
실행: streamlit run webapp/app.py
"""
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

import datetime as dt
import joblib
import pandas as pd
import streamlit as st

import config
from recommend import predict_24h, recommend

st.set_page_config(page_title="부산항 5부두 입항 최적화", layout="wide")
st.title("⚓ 부산항 5부두 혼잡도 예측 & 최적 입항 시간 추천")

@st.cache_resource
def load_model():
    try:
        return joblib.load(config.MODEL_PATH)
    except FileNotFoundError:
        return None

model = load_model()
if model is None:
    st.warning("모델이 없습니다. 먼저 `python src/train_xgb.py` 를 실행하세요.")
    st.stop()

col1, col2 = st.columns(2)
with col1:
    ship_size = st.number_input("선박 크기 (톤)", 1000, 200000, 50000, step=1000)
with col2:
    earliest_h = st.slider("도착 가능 최소 시각 (몇 시간 뒤)", 0, 24, 0)

# TODO: 실제 기상 예보 API 연결. 지금은 더미.
now = dt.datetime.now().replace(minute=0, second=0, microsecond=0)
forecast = pd.DataFrame({
    "timestamp": [now + dt.timedelta(hours=i) for i in range(24)],
    "wind_speed": 5.0, "wave_height": 1.0, "visibility": 10.0,
})
last_known = {"lag1": 60, "lag24": 55, "lag168": 50, "is_holiday": 0}

pred = predict_24h(model, forecast, last_known)
earliest = now + dt.timedelta(hours=earliest_h)
result = recommend(pred, earliest=earliest)

st.subheader("24시간 혼잡도 예측")
st.line_chart(pred.set_index("timestamp")["congestion"])

st.subheader("추천 결과")
st.metric("추천 입항 시각", result["recommended_time"])
c1, c2 = st.columns(2)
c1.metric("예상 혼잡도", f'{result["congestion"]}%')
c2.metric("예상 대기 시간", f'{result["expected_wait_hours"]}h')

st.caption("대안 시간대")
st.dataframe(pd.DataFrame(result["alternatives"]))
