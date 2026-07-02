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
  updated_at            timestamptz not null default now()
);
