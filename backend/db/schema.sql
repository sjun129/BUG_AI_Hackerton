-- Supabase SQL 에디터에 붙여넣어 실행하세요.
-- (SQL 에디터로 만들면 RLS는 기본 off라 서버의 anon/service 키로 바로 읽고 쓸 수 있습니다.)

create table if not exists public.ships (
  mmsi                  text primary key,
  name                  text not null,
  lat                   double precision not null,
  lon                   double precision not null,
  sog                   double precision not null,          -- 속력 (knots)
  cog                   double precision not null,          -- 침로 (0~360)
  eta                   timestamptz not null,               -- 입항 예정 시각
  status                text not null check (status in ('underway','anchored','moored')),
  destination_berth_id  text,
  call_sign             text,                                -- AIS 호출부호 (Port-MIS 매칭 키)
  -- ↓ Port-MIS(해양수산부_선박운항정보) 입출항 신고 매칭 보강 필드. AIS 10초 폴링 upsert는
  --   이 컬럼들을 절대 건드리지 않는다(backend/ais/ship-source.ts의 shipToRow 참고) —
  --   backend/portmis/run-enrich.ts만 별도 update로 채운다.
  previous_port         text,                                -- 직전 출항항
  next_port             text,                                -- 다음 기항지
  berth_name            text,                                -- Port-MIS 신고상 접안/정박 시설명
  gross_tonnage         double precision,                     -- 총톤수
  crew_count            int,                                  -- 승무원수
  agent_company         text,                                 -- 선박관리/대리점 업체명
  updated_at            timestamptz not null default now()
);

-- 이미 ships 테이블이 있던 프로젝트(테이블 생성이 위 create table 문을 건너뜀)를 위한
-- 컬럼 추가. 새로 만드는 경우에도 그대로 실행해도 안전하다(멱등).
alter table public.ships add column if not exists call_sign text;
alter table public.ships add column if not exists previous_port text;
alter table public.ships add column if not exists next_port text;
alter table public.ships add column if not exists berth_name text;
alter table public.ships add column if not exists gross_tonnage double precision;
alter table public.ships add column if not exists crew_count int;
alter table public.ships add column if not exists agent_company text;

-- 기상청 단기예보 스냅샷 (격자 nx,ny × 예보 대상 시각 단위)
create table if not exists public.weather_forecasts (
  nx          int not null,
  ny          int not null,
  fcst_at     timestamptz not null,                 -- 예보 대상 시각
  base_at     timestamptz not null,                 -- 발표 시각
  temp_c      double precision,                      -- TMP 기온(℃)
  sky         int,                                   -- SKY 1맑음 3구름많음 4흐림
  pty         int,                                   -- PTY 0없음 1비 2비/눈 3눈 4소나기
  pop         int,                                   -- POP 강수확률(%)
  precip      text,                                  -- PCP 강수량
  humidity    int,                                   -- REH 습도(%)
  wind_speed  double precision,                      -- WSD 풍속(m/s)
  wind_deg    int,                                   -- VEC 풍향(deg)
  wave_m      double precision,                      -- WAV 파고(M)
  updated_at  timestamptz not null default now(),
  primary key (nx, ny, fcst_at)
);
