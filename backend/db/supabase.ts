// Supabase 클라이언트 — 이 파일 한 곳에서만 생성한다.
// 다른 DB/백엔드로 바꾸고 싶으면 이 파일과 backend/ais/ship-source.ts 만 교체하면 된다.
//
// 환경변수(.env.local):
//   NEXT_PUBLIC_SUPABASE_URL      — 프로젝트 URL (비밀 아님)
//   SUPABASE_SERVICE_ROLE_KEY     — 서버 전용 비밀 키 (RLS 우회, 권장)
//   SUPABASE_ANON_KEY             — 위가 없을 때 사용 (테이블 RLS off 필요)
//
// 서버(route handler)에서만 import 한다 — 서비스 롤 키가 클라이언트 번들에 들어가면 안 된다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Supabase 클라이언트를 반환한다. 환경변수가 없으면 null (호출부에서 목업 폴백). */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** DB 연결 설정이 갖춰졌는지 여부. */
export function isDbConfigured(): boolean {
  return Boolean(url && key);
}
