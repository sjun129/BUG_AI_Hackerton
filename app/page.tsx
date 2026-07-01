import Link from "next/link";

const FEATURES = [
  {
    title: "ETA 예측",
    desc: "haversine 거리와 SOG(속력)로 선박별 입항 예정 시각을 결정론적으로 계산합니다.",
  },
  {
    title: "혼잡도 예측",
    desc: "시간대별 입항 선박 수를 집계해 항만 혼잡도(0~1)를 통계 기반으로 예측합니다.",
  },
  {
    title: "지도 시각화",
    desc: "부산항 인근 선박 위치와 상태를 지도에서 확인하고 클릭해 상세 정보를 봅니다.",
  },
  {
    title: "LLM 어드바이저",
    desc: "현재 선박·혼잡도 상황을 분석해 운영 권고를 제시하는 AI 에이전트입니다.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-sm uppercase tracking-widest text-[var(--color-accent)]">
        Busan Port AIS Platform
      </p>
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
        AIS 데이터로 부산항의 흐름을 미리 읽는다
      </h1>
      <p className="mt-6 max-w-xl text-[var(--color-ink-soft)]">
        선박 입항시간(ETA)과 항만 혼잡도를 예측하고, 지도로 확인하고, LLM 어드바이저의 운영
        권고를 받아보세요.
      </p>
      <Link
        href="/dashboard"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90"
      >
        대시보드 열기 →
      </Link>

      <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-5"
          >
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
