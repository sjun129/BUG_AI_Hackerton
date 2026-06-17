# 데이터 설명

⚠️ 원본 데이터는 깃에 올리지 않음. 각자 아래 경로에 직접 받아둘 것.

## 경로
| 폴더 | 내용 | 출처 | 필요 컬럼(예상) |
|---|---|---|---|
| raw/portmis | 선박 입출항(메인) | Port-MIS | ship_id, arrival_time, departure_time, ship_size, berth |
| raw/ais | AIS 통계/지도 | 해양조사원 WMS/WFS | (연 집계 — 라벨 불가, 보조 통계용) |
| raw/weather | 기상 | 기상청 API | timestamp, wind_speed, wave_height, visibility |
| raw/holiday | 공휴일 | 공공데이터포털 | date, is_holiday |
| raw/cargo | 물동량 | 부산항만공사 | period, volume |

## ⚠️ 핵심 확인 사항
1. Port-MIS에 **5부두** 선박별 입항·출항 **시각**이 1시간 해상도로 1년치 있는가?
   - 있으면 → 포화도 라벨 생성 가능
   - 없으면 → 라벨을 "시간대별 입항 건수"로 변경 (config/preprocess 수정)
2. `config.MAX_CAPACITY` = 5부두 실제 선석 수로 교체
