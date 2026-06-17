# 부산항 5부두 혼잡도 예측 & 최적 입항 시간 추천

부울경 AI 융합 해커톤 (2026.7.9~7.10) 프로젝트.

부산항 5부두의 시간대별 **혼잡도(터미널 포화도)** 를 예측하고,
선박별 **최적 입항 시간**을 추천하여 대기 시간·연료·탄소·물류비용을 줄이는 플랫폼.

## 핵심 정의
- **대상:** 부산항 5부두
- **시간 단위:** 1시간
- **데이터 기간:** 1년
- **혼잡도(label):** 터미널 포화도 % = (입항 누적 − 출항 누적) / 최대 수용 × 100
  - ⚠️ 선박별·시각별 입출항 타임스탬프 필요 → **Port-MIS 기준**. AIS(WMS/WFS)는 연 집계라 라벨 계산 불가, 보조 통계로만 사용.

## 데이터
| 데이터 | 역할 | 비고 |
|---|---|---|
| Port-MIS 입출항 | 라벨 생성(메인) | 선박별 입항/출항 시각·크기 필요 |
| AIS (WMS/WFS) | 보조 통계 | 연 집계/지도 → 시계열 라벨엔 사용 불가 |
| 기상청 API | 특성 | 풍속·파고·시정 |
| 공휴일 | 특성 | 휴일 여부 |
| 부산항 물동량 | 특성/검증 | 월·분기 추세 |

## 모델
- 메인: **XGBoost** (시간대별 포화도 예측)
- 확장(Option C): LSTM 앙상블, 다중 선박 입항 순서 최적화

## 빠른 시작
```bash
pip install -r requirements.txt
python src/preprocess.py      # raw → processed/train_dataset.csv
python src/train_xgb.py       # 모델 학습 → models/xgb_model.pkl
streamlit run webapp/app.py   # 대시보드
```

## 폴더 구조
```
data/        raw(원본,수정금지) / processed(전처리 결과)
src/         전처리·특성·학습·추천 코드
models/      학습된 모델 + metrics.json
webapp/      Streamlit 대시보드
docs/        api_spec, 커밋 규칙, 발표자료
notebooks/   EDA·실험
```

## 팀 / 역할
| 약칭 | 역할 |
|---|---|
| PM | 데이터 수집, 라벨 정의, 일정, 발표 |
| AI-A | XGBoost 혼잡도 예측 |
| AI-B | 대기시간·추천 로직 |
| WEB | 대시보드, API |

자세한 협업 규칙은 `docs/COMMIT_CONVENTION.md` 참고.
