"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

// ── 대시보드 카드 데이터 (혼잡도 게이지 계산) ──
const CONGESTION_LEVEL = 18; // 0~100
const ARC_LEN = Math.PI * 63; // 반원 게이지 호 길이 ≈ 197.9

function gaugeInfo(level: number) {
  const clamped = Math.max(0, Math.min(100, level));
  const off = ARC_LEN * (1 - clamped / 100);
  let color = "#16a34a";
  let status = "원활";
  if (clamped >= 75) {
    color = "#e0483d";
    status = "혼잡";
  } else if (clamped >= 45) {
    color = "#e8952b";
    status = "보통";
  }
  return { level: Math.round(clamped), off, color, status };
}

const BAR_HEIGHTS = [30, 44, 38, 56, 62, 70, 58, 66, 48, 40, 34, 28];
const barColor = (h: number) => (h >= 60 ? "#2f6bff" : h >= 45 ? "#7aa0ff" : "#c3d4ff");

const PARTNERS = ["부산항만공사", "HMM", "KMI", "PNC", "현대글로비스", "인천항만공사"];

const FEATURES = [
  {
    icon: "🌐",
    bg: "#e8f0ff",
    title: "항만 혼잡도 실시간 예측",
    desc: "선석·수로 혼잡을 시간대별로 미리 파악해 병목을 사전에 해소합니다.",
  },
  {
    icon: "⚙️",
    bg: "#eafaf0",
    title: "AI 최적화 스케줄링",
    desc: "접안 순서와 시간을 자동 재배치해 처리량과 정시성을 동시에 끌어올립니다.",
  },
  {
    icon: "⛽",
    bg: "#fff3e6",
    title: "대기시간·연료비 절감",
    desc: "감속운항(Just-in-time)으로 불필요한 대기와 연료·탄소 배출을 줄입니다.",
  },
  {
    icon: "📊",
    bg: "#f0ecff",
    title: "데이터 대시보드",
    desc: "실시간 지표를 한 화면에서 시각화해 관제·운영·물류가 함께 봅니다.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "데이터 수집 · 연동",
    desc: "AIS 항적, 기상·조류, 항만 운영 데이터를 표준 API로 통합합니다.",
  },
  {
    n: "2",
    title: "AI 예측 엔진",
    desc: "ETA와 혼잡도를 실시간으로 예측하고 변화에 맞춰 지속 학습합니다.",
  },
  {
    n: "3",
    title: "최적 스케줄 실행",
    desc: "최적 접안 계획을 자동 생성하고 관계자에게 즉시 알림을 전송합니다.",
  },
];

const TAGS = ["선석 점유율", "대기 선박 큐", "ETA 정확도", "CO₂ 리포트"];

// 숫자 카운트업 훅
function useCountUp(to: number, dec: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dur = 1400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) raf = requestAnimationFrame(tick);
      else el.textContent = to.toFixed(dec);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dec]);
  return ref;
}

export default function Home() {
  const refAcc = useCountUp(98.7, 1);
  const refWait = useCountUp(34, 0);
  const refFuel = useCountUp(22, 0);
  const g = gaugeInfo(CONGESTION_LEVEL);

  const container: CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 32px" };

  return (
    <div className="portiq" style={{ color: "#0a1830", background: "#f4f7ff", minHeight: "100vh" }}>
      <div style={container}>
        {/* NAV */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 72,
            margin: "0 -32px",
            padding: "0 32px",
            background: "rgba(244,247,255,.72)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(10,24,48,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(47,107,255,.35)",
              }}
            >
              <div
                style={{
                  width: 11,
                  height: 11,
                  border: "2.5px solid #fff",
                  borderRadius: "50%",
                  borderRightColor: "transparent",
                }}
              />
            </div>
            <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-.02em" }}>PORTIQ</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 34,
              fontSize: 15,
              fontWeight: 600,
              color: "#3a4a66",
            }}
          >
            <span className="portiq-link">기능</span>
            <span className="portiq-link">작동 방식</span>
            <span className="portiq-link">대시보드</span>
            <span className="portiq-link">도입 사례</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="portiq-link" style={{ fontSize: 15, fontWeight: 600, color: "#3a4a66" }}>
              로그인
            </span>
            <button
              className="portiq-btn"
              style={{
                border: 0,
                background: "#0a1830",
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 14,
                padding: "11px 20px",
                borderRadius: 11,
                cursor: "pointer",
              }}
            >
              데모 신청
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ position: "relative", padding: "74px 0 40px" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                left: -80,
                width: 360,
                height: 360,
                borderRadius: "50%",
                background: "radial-gradient(circle,#7aa2ff55,transparent 68%)",
                filter: "blur(8px)",
                animation: "portiq-blob 16s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 120,
                right: -40,
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "radial-gradient(circle,#a9c2ff44,transparent 66%)",
                filter: "blur(8px)",
                animation: "portiq-blob 20s ease-in-out infinite reverse",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr",
              gap: 56,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid rgba(47,107,255,.22)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  color: "#2f6bff",
                  boxShadow: "0 4px 14px rgba(47,107,255,.08)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#2f6bff",
                    boxShadow: "0 0 0 4px rgba(47,107,255,.18)",
                  }}
                />
                AI PORT INTELLIGENCE
              </div>
              <h1
                style={{
                  margin: "22px 0 0",
                  fontSize: 58,
                  lineHeight: 1.08,
                  letterSpacing: "-.035em",
                  fontWeight: 800,
                }}
              >
                선박은 정시에,
                <br />
                <span
                  style={{
                    display: "inline-block",
                    paddingBottom: ".1em",
                    background: "linear-gradient(120deg,#2f6bff,#6f9bff)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  항만은 여유롭게.
                </span>
              </h1>
              <p
                style={{
                  margin: "22px 0 0",
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: "#46577a",
                  maxWidth: 440,
                }}
              >
                AI가 입항 시간(ETA)과 항만 혼잡도를 실시간으로 예측합니다. 대기 없는 접안, 낭비 없는
                연료 — 데이터로 움직이는 스마트 항만.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button
                  className="portiq-btn"
                  style={{
                    border: 0,
                    background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: 15,
                    padding: "15px 26px",
                    borderRadius: 13,
                    cursor: "pointer",
                    boxShadow: "0 12px 26px rgba(47,107,255,.32)",
                  }}
                >
                  무료 데모 신청 →
                </button>
                <Link
                  href="/dashboard"
                  className="portiq-btn"
                  style={{
                    border: "1px solid rgba(10,24,48,.14)",
                    background: "#fff",
                    color: "#0a1830",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: 15,
                    padding: "15px 24px",
                    borderRadius: 13,
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  대시보드 둘러보기
                </Link>
              </div>
              <div style={{ display: "flex", gap: 30, marginTop: 38 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>
                    <span ref={refAcc}>0</span>%
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7a99", fontWeight: 600, marginTop: 2 }}>
                    ETA 예측 정확도
                  </div>
                </div>
                <div style={{ width: 1, background: "rgba(10,24,48,.1)" }} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>
                    −<span ref={refWait}>0</span>%
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7a99", fontWeight: 600, marginTop: 2 }}>
                    평균 대기시간
                  </div>
                </div>
                <div style={{ width: 1, background: "rgba(10,24,48,.1)" }} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>
                    <span ref={refFuel}>0</span>%
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7a99", fontWeight: 600, marginTop: 2 }}>
                    연료비 절감
                  </div>
                </div>
              </div>
            </div>

            {/* HERO DASHBOARD CARD */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: 28,
                  background: "linear-gradient(135deg,#2f6bff22,#9db8ff11)",
                  filter: "blur(2px)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  background: "#fff",
                  borderRadius: 22,
                  padding: 20,
                  boxShadow: "0 30px 60px rgba(20,40,90,.16)",
                  border: "1px solid rgba(10,24,48,.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#8a97b3", fontWeight: 600 }}>
                      실시간 항만 현황
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>
                      부산신항 · PNC 터미널
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#16a34a",
                      background: "#eafaf0",
                      padding: "5px 10px",
                      borderRadius: 999,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#16a34a",
                        animation: "portiq-barpulse 1.4s infinite",
                      }}
                    />
                    LIVE
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12 }}>
                  {/* Gauge */}
                  <div
                    style={{
                      background: "#f6f9ff",
                      borderRadius: 16,
                      padding: 16,
                      border: "1px solid rgba(47,107,255,.08)",
                    }}
                  >
                    <div
                      style={{ fontSize: 12.5, color: "#6b7a99", fontWeight: 700, marginBottom: 2 }}
                    >
                      현재 혼잡도
                    </div>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        paddingTop: 6,
                      }}
                    >
                      <svg width="150" height="88" viewBox="0 0 150 88">
                        <path
                          d="M12 80 A63 63 0 0 1 138 80"
                          fill="none"
                          stroke="#e4ebfa"
                          strokeWidth="13"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 80 A63 63 0 0 1 138 80"
                          fill="none"
                          stroke={g.color}
                          strokeWidth="13"
                          strokeLinecap="round"
                          strokeDasharray={ARC_LEN}
                          strokeDashoffset={g.off}
                          style={{
                            transition:
                              "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1), stroke .4s",
                          }}
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          bottom: -2,
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 30,
                            fontWeight: 800,
                            letterSpacing: "-.02em",
                            color: g.color,
                          }}
                        >
                          {g.level}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: g.color,
                            marginTop: -2,
                          }}
                        >
                          {g.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* side stats */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        background: "#f6f9ff",
                        borderRadius: 16,
                        padding: "13px 14px",
                        border: "1px solid rgba(47,107,255,.08)",
                      }}
                    >
                      <div style={{ fontSize: 11.5, color: "#6b7a99", fontWeight: 700 }}>
                        예상 접안 대기
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>
                        1<span style={{ fontSize: 14, fontWeight: 700, color: "#6b7a99" }}>시간</span>{" "}
                        24<span style={{ fontSize: 14, fontWeight: 700, color: "#6b7a99" }}>분</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 700 }}>
                        ▼ 어제 대비 −38분
                      </div>
                    </div>
                    <div
                      style={{
                        background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
                        borderRadius: 16,
                        padding: "13px 14px",
                        color: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 700 }}>
                        입항 대기 선박
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>
                        7<span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}> 척</span>
                      </div>
                      <div style={{ fontSize: 11.5, opacity: 0.9, fontWeight: 700 }}>
                        최적 스케줄 적용됨
                      </div>
                    </div>
                  </div>
                </div>

                {/* mini hourly chart */}
                <div
                  style={{
                    background: "#f6f9ff",
                    borderRadius: 16,
                    padding: "14px 16px 12px",
                    marginTop: 12,
                    border: "1px solid rgba(47,107,255,.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: "#6b7a99", fontWeight: 700 }}>
                      시간대별 혼잡도 예측
                    </div>
                    <div style={{ fontSize: 11, color: "#8a97b3", fontWeight: 600 }}>향후 12시간</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 56 }}>
                    {BAR_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        title={`${h}%`}
                        style={{
                          flex: 1,
                          borderRadius: "5px 5px 3px 3px",
                          background: barColor(h),
                          height: `${h}%`,
                          animation: "portiq-barpulse 2.6s ease-in-out infinite",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* floating chips */}
              <div
                style={{
                  position: "absolute",
                  userSelect: "none",
                  top: -26,
                  right: 14,
                  background: "#fff",
                  borderRadius: 14,
                  padding: "11px 15px",
                  boxShadow: "0 16px 34px rgba(20,40,90,.16)",
                  animation: "portiq-floaty 5s ease-in-out infinite",
                  border: "1px solid rgba(10,24,48,.05)",
                }}
              >
                <div style={{ fontSize: 11, color: "#8a97b3", fontWeight: 700 }}>이번 달 절감 연료</div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: "-.02em",
                    color: "#2f6bff",
                  }}
                >
                  1,240 <span style={{ fontSize: 12, color: "#6b7a99" }}>톤</span>
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: -24,
                  left: 8,
                  background: "#0a1830",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "11px 15px",
                  boxShadow: "0 16px 34px rgba(20,40,90,.22)",
                  animation: "portiq-floatyb 6s ease-in-out infinite",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>CO₂ 저감</div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>
                  −3,860 <span style={{ fontSize: 12, opacity: 0.7 }}>T</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO STRIP */}
        <section style={{ padding: "26px 0 8px" }}>
          <div
            style={{
              textAlign: "center",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: ".08em",
              color: "#9aa6c0",
              marginBottom: 18,
            }}
          >
            국내외 항만공사 · 해운물류 기업과 함께합니다
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "14px 44px",
              opacity: 0.65,
            }}
          >
            {PARTNERS.map((p) => (
              <span
                key={p}
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: ".02em",
                  color: "#5a6785",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ padding: "76px 0 20px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 44px" }}>
            <div
              style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: "#2f6bff" }}
            >
              CORE FEATURES
            </div>
            <h2
              style={{
                margin: "12px 0 0",
                fontSize: 38,
                lineHeight: 1.2,
                letterSpacing: "-.03em",
                fontWeight: 800,
              }}
            >
              입항부터 접안까지,
              <br />
              모든 순간을 예측합니다
            </h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, color: "#5a6785", lineHeight: 1.6 }}>
              흩어진 항만·기상·선박 데이터를 하나의 AI 엔진으로. 지금 벌어질 일을 미리 알고
              대비하세요.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16 }}>
            {/* big feature */}
            <div
              className="portiq-feat"
              style={{
                gridRow: "span 2",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg,#12275a,#0a1830)",
                borderRadius: 22,
                padding: 28,
                color: "#fff",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: "radial-gradient(circle,#3a6bff55,transparent 70%)",
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(255,255,255,.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  🎯
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    color: "#7fa5ff",
                    marginTop: 20,
                  }}
                >
                  ETA PREDICTION
                </div>
                <h3
                  style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}
                >
                  입항 시간 예측
                </h3>
                <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: "#c4d0ea" }}>
                  기상·조류·선박 운항 이력을 학습한 AI가 도착 시각을{" "}
                  <b style={{ color: "#fff" }}>분 단위</b>로 예측합니다. 계획은 정확해지고, 현장은
                  준비할 시간을 얻습니다.
                </p>
              </div>
              <div
                style={{
                  position: "relative",
                  marginTop: 24,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#9db2dd",
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  <span>MV HANARO · 예측 ETA</span>
                  <span style={{ color: "#5eead4" }}>±6분 오차</span>
                </div>
                <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
                  <polyline
                    points="0,44 40,40 80,42 120,30 160,34 200,20 240,24 300,12"
                    fill="none"
                    stroke="#4d7cff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="4 6"
                    style={{ animation: "portiq-dashmove 3s linear infinite" }}
                  />
                  <polyline
                    points="0,46 40,43 80,45 120,36 160,38 200,28 240,30 300,20"
                    fill="none"
                    stroke="#5eead4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="portiq-feat"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(10,24,48,.07)",
                  borderRadius: 22,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: f.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    margin: "16px 0 0",
                    fontSize: 18.5,
                    fontWeight: 800,
                    letterSpacing: "-.02em",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ margin: "9px 0 0", fontSize: 14, lineHeight: 1.58, color: "#5a6785" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: "80px 0 30px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: ".85fr 1.15fr",
              gap: 56,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: "#2f6bff" }}
              >
                HOW IT WORKS
              </div>
              <h2
                style={{
                  margin: "12px 0 0",
                  fontSize: 36,
                  lineHeight: 1.22,
                  letterSpacing: "-.03em",
                  fontWeight: 800,
                }}
              >
                데이터에서 결정까지,
                <br />
                단 3단계
              </h2>
              <p style={{ margin: "14px 0 0", fontSize: 16, color: "#5a6785", lineHeight: 1.6 }}>
                복잡한 연동은 PORTIQ가 대신합니다. 연결하면 예측이 시작되고, 예측은 곧바로 실행
                가능한 스케줄이 됩니다.
              </p>
              <button
                className="portiq-btn"
                style={{
                  marginTop: 26,
                  border: 0,
                  background: "#0a1830",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 24px",
                  borderRadius: 13,
                  cursor: "pointer",
                }}
              >
                도입 상담 요청 →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="portiq-step"
                  style={{
                    display: "flex",
                    gap: 18,
                    alignItems: "flex-start",
                    background: "#fff",
                    border: "1px solid rgba(10,24,48,.07)",
                    borderRadius: 18,
                    padding: "22px 24px",
                  }}
                >
                  <div
                    style={{
                      flex: "none",
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 800,
                      boxShadow: "0 8px 18px rgba(47,107,255,.28)",
                    }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: "2px 0 0",
                        fontSize: 19,
                        fontWeight: 800,
                        letterSpacing: "-.02em",
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "#5a6785" }}
                    >
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DASHBOARD PHOTO SECTION */}
        <section style={{ padding: "44px 0 30px" }}>
          <div
            style={{
              position: "relative",
              background: "linear-gradient(160deg,#0d1f4a,#0a1830)",
              borderRadius: 28,
              padding: 44,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -40,
                width: 340,
                height: 340,
                borderRadius: "50%",
                background: "radial-gradient(circle,#3a6bff44,transparent 70%)",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr 1.25fr",
                gap: 40,
                alignItems: "center",
              }}
            >
              <div style={{ color: "#fff" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    color: "#7fa5ff",
                  }}
                >
                  LIVE DASHBOARD
                </div>
                <h2
                  style={{
                    margin: "12px 0 0",
                    fontSize: 34,
                    lineHeight: 1.24,
                    letterSpacing: "-.03em",
                    fontWeight: 800,
                  }}
                >
                  한 화면에서
                  <br />
                  항만 전체를 본다
                </h2>
                <p style={{ margin: "14px 0 0", fontSize: 15.5, color: "#b9c7e8", lineHeight: 1.6 }}>
                  선석 점유, 대기 선박, 시간대별 혼잡도, 예측 ETA까지. 관제·운영·물류 팀이 같은
                  데이터를 실시간으로 공유합니다.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
                  {TAGS.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#cdd9f5",
                        background: "rgba(255,255,255,.08)",
                        border: "1px solid rgba(255,255,255,.12)",
                        padding: "8px 14px",
                        borderRadius: 999,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {/* photo placeholder */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    aspectRatio: "16 / 10",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.14)",
                    background:
                      "repeating-linear-gradient(45deg,#16295a,#16295a 12px,#1b3068 12px,#1b3068 24px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "ui-monospace,Menlo,monospace",
                        fontSize: 13,
                        color: "#8fa6d8",
                        background: "rgba(10,24,48,.5)",
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,.1)",
                      }}
                    >
                      [ 항만 전경 / 대시보드 스크린샷 ]
                    </div>
                    <div
                      style={{
                        fontFamily: "ui-monospace,Menlo,monospace",
                        fontSize: 11,
                        color: "#6d84b8",
                        marginTop: 8,
                      }}
                    >
                      1280 × 800 · 실제 이미지로 교체
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "80px 0 96px", textAlign: "center" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 44,
                lineHeight: 1.16,
                letterSpacing: "-.035em",
                fontWeight: 800,
              }}
            >
              대기 없는 항만,
              <br />
              지금 시작하세요
            </h2>
            <p style={{ margin: "18px 0 0", fontSize: 17, color: "#5a6785", lineHeight: 1.6 }}>
              30일 파일럿으로 우리 항만의 절감 효과를 먼저 확인하세요. 데이터 연동부터 리포트까지
              PORTIQ가 함께합니다.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30 }}>
              <button
                className="portiq-btn"
                style={{
                  border: 0,
                  background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "16px 30px",
                  borderRadius: 14,
                  cursor: "pointer",
                  boxShadow: "0 14px 30px rgba(47,107,255,.32)",
                }}
              >
                무료 데모 신청
              </button>
              <button
                className="portiq-btn"
                style={{
                  border: "1px solid rgba(10,24,48,.14)",
                  background: "#fff",
                  color: "#0a1830",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "16px 28px",
                  borderRadius: 14,
                  cursor: "pointer",
                }}
              >
                도입 문의
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(10,24,48,.08)", background: "#eef3ff" }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "40px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
              }}
            />
            <span style={{ fontWeight: 800, fontSize: 17 }}>PORTIQ</span>
            <span style={{ fontSize: 13, color: "#8a97b3", marginLeft: 8 }}>
              AI 선박 입항 최적화 플랫폼
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#8a97b3" }}>
            © 2026 PORTIQ Inc. · 부산광역시 강서구 · contact@portiq.ai
          </div>
        </div>
      </footer>
    </div>
  );
}
