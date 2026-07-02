# backend/ais

AIS(자동 선박 식별 시스템) 데이터 소스. 목업과 실 데이터(aisstream.io) 둘 다 지원한다 —
`ship-source.ts`가 DB를 우선 읽고, 없으면 목업으로 폴백하므로 나머지 코드는 어느 쪽이든
신경 쓸 필요가 없다.

## 목업

- `mock-generator.ts` — `PortConfig`(seed-port.ts)를 받아 부산항 근처에 선박을 시드 기반으로
  결정론적으로 생성하는 순수 함수(`generateMockShips`).
- `mock-data.ts` — `generateMockShips`로 만든 선박에 `backend/prediction/eta.ts`의 ETA 계산을
  적용해 `MOCK_SHIPS`로 내보낸다.

## 실 데이터 (aisstream.io)

aisstream은 REST가 아니라 WebSocket 스트림이라 요청-응답 API route로 만들 수 없다. 그래서
**수집(이 폴더의 스크립트)과 조회(`ship-source.ts`, `/api/ships`)를 분리**했다 — 수집 스크립트를
별도 프로세스로 띄워 Supabase `ships` 테이블에 채워두면, 조회 쪽은 지금처럼 DB만 읽는다.

- `aisstream-types.ts` — aisstream 메시지 중 실제로 쓰는 필드만 최소로 정의.
- `aisstream-client.ts` — WebSocket 연결·구독·자동 재연결만 담당(메시지 해석은 안 함).
- `busan-filter.ts` — **부산항 필터링 로직.** AIS에는 출발/도착항 필드가 없어 두 신호를 쓴다:
  1. 지리적 bounding box(주) — `seed-port.ts`의 부산항 중심 좌표 기준. 구독 자체를 이 범위로
     제한하므로, 들어오는 배는 정의상 부산 인근에서 입항/정박/출항 중인 배다.
  2. 목적지 텍스트(부가) — `ShipStaticData.Destination`이 있는데 "BUSAN"/"PUSAN"/"KRPUS"가
     아니면 근해를 지나가는 배로 보고 제외한다. 목적지가 아직 없으면 bbox만으로 통과시킨다.
- `normalize.ts` — PositionReport(+ 캐시된 이름/목적지)를 `Ship` 타입으로 변환. 실 AIS 선박은
  배정 선석을 모르므로, 항해 중이면 항만 중심점을 목적지로 ETA를 계산한다.
- `ingest-aisstream.ts` — 위 조각들을 엮은 실행 스크립트. `npm run ingest:ais`로 실행하며,
  10초마다 변경분을 모아 Supabase `ships`에 upsert한다. `AISSTREAM_API_KEY`와 Supabase
  환경변수가 `.env.local`에 있어야 한다(Node 20.6+ 필요 — `--env-file`로 읽는다).

실 AIS 피드를 다른 소스로 바꾸고 싶으면 이 폴더의 구현만 바꾸면 된다 — `Ship[]` 타입만
지키면 `prediction`/`advisor`/`frontend`는 수정할 필요가 없다.
