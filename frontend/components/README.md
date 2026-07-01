# frontend/components

UI만 담당한다. 예측 로직, 프롬프트, 파싱은 전부 `backend/`에 있고, 여기서는 타입만
import해서 화면을 그린다.

- `ShipMap.tsx` — `react-leaflet` 지도. 선박을 상태별 색상의 `CircleMarker`로 표시하고
  클릭 시 팝업으로 상세 정보를 보여준다. Leaflet은 `window`에 의존하므로 이 컴포넌트는
  반드시 `next/dynamic`으로 `{ ssr: false }` 옵션을 주고 불러와야 한다(`app/dashboard/page.tsx` 참고).
- `CongestionChart.tsx` — `recharts` 기반 시간대별 혼잡도(0~1) 영역 차트.
- `ShipList.tsx` — 선박 목록 테이블. ETA 오름차순 정렬, 클릭 시 지도와 연동해 선택 상태 공유.
- `AdvisorPanel.tsx` — `/api/advisor`를 호출해 LLM 운영 권고를 표시. 키가 없거나 파싱에
  실패해도 에러 메시지만 보여주고 앱 전체는 계속 동작한다.
