# backend/ais

AIS(자동 선박 식별 시스템) 데이터 소스. 지금은 실 AIS 피드가 없어 목업으로 대체한다.

- `mock-generator.ts` — `PortConfig`(seed-port.ts)를 받아 부산항 근처에 선박을 시드 기반으로
  결정론적으로 생성하는 순수 함수(`generateMockShips`).
- `mock-data.ts` — 앱이 쓰는 실제 데이터. `generateMockShips`로 만든 선박에
  `backend/prediction/eta.ts`의 ETA 계산을 적용해 `MOCK_SHIPS`로 내보낸다.

실 AIS 피드로 교체할 때는 이 폴더의 구현만 바꾸면 된다 — `Ship[]` 타입만 지키면
`prediction`/`advisor`/`frontend`는 수정할 필요가 없다.
