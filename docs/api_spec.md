# API 규격 (AI팀 ↔ 웹팀 합의)

웹은 모델 내부를 몰라도 이 규격만 지키면 됨. 1주차에 고정할 것.

## 추천 요청 → 응답
**입력**
```json
{
  "ship_size": 50000,
  "earliest_hours_from_now": 0
}
```

**출력**
```json
{
  "hourly_congestion": [
    {"timestamp": "2026-07-09T00:00:00", "congestion": 62.1, "wait_hours": 1.5}
  ],
  "recommended_time": "2026-07-09T14:00:00",
  "congestion": 41.0,
  "expected_wait_hours": 0.5,
  "alternatives": [
    {"timestamp": "2026-07-09T18:00:00", "congestion": 55.0, "wait_hours": 1.5}
  ]
}
```

## 필드 정의
| 필드 | 의미 | 단위 |
|---|---|---|
| congestion | 터미널 포화도 | % |
| wait_hours | 예상 대기 | 시간 |
| recommended_time | 대기 최소 시각 | ISO8601 |
