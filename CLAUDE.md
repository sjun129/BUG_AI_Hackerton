# CLAUDE.md — Project Rules

부산항 AIS 기반 항만 AI 플랫폼. ETA 예측, 혼잡도 예측, 지도 시각화, LLM 어드바이저를 제공한다.

## 핵심 원칙: 데이터와 코드의 분리

- 항만 설정(좌표·선석·구역·혼잡도 임계값)은 [backend/ports/seed-port.ts](backend/ports/seed-port.ts)
  **한 파일에만** 몰아넣는다. 나머지 코드는 이 데이터를 읽어 동작할 뿐, 항만 고유의 값을 하드코딩하지 않는다.
- 다른 항만으로 바꾸고 싶으면 `seed-port.ts`만 교체하면 된다. 좌표나 임계값이 필요한 곳에서
  새 상수를 만들지 말고 반드시 `seed-port.ts`를 import해서 쓴다.
- `frontend/components`(UI)와 `backend`(로직·프롬프트·파싱)는 폴더로 분리한다. 컴포넌트에
  예측 로직이나 프롬프트 문자열을 직접 넣지 않는다.
- LLM provider/모델명은 [backend/models.ts](backend/models.ts) 한 곳에서만 관리한다.

## 레이어 구조

```
app/api/*/route.ts   → HTTP 경계. backend 함수를 호출해 응답만 만든다.
backend/prediction/  → 순수 함수 (ETA, 혼잡도). 외부 상태 없이 입력→출력.
backend/advisor/      → 프롬프트 생성 + LLM 응답 파싱. generateText 호출 자체는 route에서.
backend/ports/        → 항만 설정 데이터 + 타입 정의.
backend/ais/          → AIS 데이터 소스 (현재는 목업, 추후 실 AIS 피드로 교체 가능).
```

## 예측 방식

- **ETA**: haversine 거리 ÷ SOG(속력) 기반 결정론적 계산. ML 모델 없음.
- **혼잡도**: 시간대별 입항 예정 선박 수를 집계해 0~1 사이 값으로 정규화. 통계 기반, ML 없음.
- Python/ML 의존성을 두지 않는다. 전부 TypeScript로 계산한다.

## 지도/차트

- 지도는 `react-leaflet`을 `next/dynamic`으로 `ssr: false` 로드한다 (Leaflet은 `window` 의존).
- 차트는 `recharts`를 사용한다.

## 보안

- 비밀 값은 `.env.local`에만 둔다. 커밋 금지 (`.gitignore` 확인).
- LLM 응답은 신뢰하지 않는다 — `backend/advisor/parse.ts`로 항상 안전 파싱을 거친다.
