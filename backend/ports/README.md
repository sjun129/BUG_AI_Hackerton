# backend/ports

항만 도메인 타입(`port-types.ts`)과 실제 항만 설정 데이터(`seed-port.ts`)를 담는다.

- `port-types.ts` — `Ship`, `PortConfig`, `Berth`, `Zone`, `CongestionForecast`, `AdvisorResult` 등
  플랫폼 전체가 공유하는 타입 정의. 항만이 바뀌어도 이 파일은 그대로 둔다.
- `seed-port.ts` — 부산항의 좌표·선석·구역·혼잡도 임계값을 담은 **유일한 데이터 소스**.
  다른 항만에 적용하려면 이 파일의 `BUSAN_PORT` 객체만 새 항만 값으로 교체하면 된다.
  나머지 코드(`backend/ais`, `backend/prediction`, `backend/advisor`, `frontend/components`)는
  이 객체를 import해서 쓸 뿐, 좌표나 임계값을 직접 하드코딩하지 않는다.
