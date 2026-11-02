"use client";

import { useEffect, useRef, useState } from "react";
import type { AdvisorResult } from "@/frontend/types/domain";
import { CloseButton } from "./PanelControls";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "assistant"; result: AdvisorResult };

const GREETING: Message = {
  role: "assistant",
  text:
    "안녕하세요! PORTIQ AI 어드바이저입니다. 현재 선박·혼잡도 상황을 분석해 운영 권고를 제시합니다. 아래 빠른 질문을 누르거나 메시지를 보내 요청하세요.",
};

// left/right: 하단 입력창·채팅 패널이 들어갈 가로 구간(화면 왼쪽·오른쪽 끝에서의 px).
// 대시보드는 왼쪽 혼잡도 카드와 오른쪽 열 사이를 넘겨준다. 그 구간 가운데에 입력창을 놓는다.
export default function AdvisorPanel({ left = 24, right = 24 }: { left?: number; right?: number } = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가되면 맨 아래로 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(raw?: string) {
    if (loading) return;
    const text = (raw ?? input).trim() || "현재 운영 권고를 요청합니다.";
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error ?? "요청 처리 중 오류가 발생했습니다." },
        ]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", result: data as AdvisorResult }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "서버에 연결할 수 없습니다." }]);
    } finally {
      setLoading(false);
    }
  }

  const quick = ["현재 항만 운영 권고를 요청합니다.", "신항 혼잡 원인을 알려줘", "감속 권고 대상 선박은?"];

  return (
    // 입력창은 항상 같은 자리에 있고, 열면 그 위로 대화 카드가 펼쳐진다.
    <div style={{ position: "fixed", left, right, bottom: 20, zIndex: 1000, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", width: "min(760px, 100%)", display: "flex", flexDirection: "column", gap: 12 }}>
        {open && (
          <div
            style={{
              height: "min(460px, calc(100vh - 220px))",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 16px 40px rgba(15,23,42,.16), 0 1px 3px rgba(15,23,42,.06)",
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(15,23,42,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 18, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>{SPARKLE}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>AI 어드바이저</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>현재 선박·혼잡도 상황을 분석해 운영 권고를 제시합니다</div>
                </div>
              </div>
              <CloseButton onClick={() => setOpen(false)} label="AI 어드바이저 닫기" />
            </div>

            {/* 메시지 */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#f6f8fc" }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", ...bubbleBase, background: "#fff", color: "#64748b" }}>
                  분석 중<span className="portiq-dots">…</span>
                </div>
              )}
            </div>

            {/* 빠른 질문 */}
            <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: "1px solid rgba(15,23,42,.06)", flexWrap: "wrap" }}>
              {quick.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={loading}
                  style={{ border: "none", background: "#ecf1ff", color: "#2563eb", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 하단 입력창 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(true);
            send();
          }}
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 30,
            background: "rgba(255,255,255,.97)",
            border: "2px solid #ecf1ff",
            boxShadow: "0 8px 24px rgba(15,23,42,.10), 0 1px 3px rgba(15,23,42,.05)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, flex: "none", border: 0, borderRadius: 22, padding: "9px 14px 9px 12px", background: GRADIENT, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            {SPARKLE}
            AI 어드바이저
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="무엇이든 물어보세요 · 예) 지금 신항 입항 대기는 얼마나 걸려?"
            style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: "#0f172a" }}
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={loading}
            style={{ width: 44, height: 44, flex: "none", border: 0, borderRadius: 22, background: GRADIENT, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

const GRADIENT = "linear-gradient(135deg,#2f6bff,#5b8cff)";
const SPARKLE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2Z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
  </svg>
);

const bubbleBase: React.CSSProperties = {
  maxWidth: "82%",
  padding: "10px 13px",
  borderRadius: 16,
  fontSize: 13.5,
  lineHeight: 1.55,
  boxShadow: "0 1px 3px rgba(15,23,42,.06)",
};

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div
        style={{
          alignSelf: "flex-end",
          ...bubbleBase,
          background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
          color: "#fff",
          borderBottomRightRadius: 4,
        }}
      >
        {msg.text}
      </div>
    );
  }

  // assistant
  if ("text" in msg) {
    return (
      <div
        style={{
          alignSelf: "flex-start",
          ...bubbleBase,
          background: "#fff",
          color: "#0a1830",
          borderBottomLeftRadius: 4,
        }}
      >
        {msg.text}
      </div>
    );
  }

  // assistant with structured result
  const { result } = msg;
  return (
    <div
      style={{
        alignSelf: "flex-start",
        ...bubbleBase,
        background: "#fff",
        color: "#0a1830",
        borderBottomLeftRadius: 4,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p style={{ margin: 0, color: "#46577a" }}>{result.summary}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: "#5a6785" }}>
        예상 최혼잡 시각:{" "}
        <span style={{ fontWeight: 800, color: "#0a1830" }}>
          {new Date(result.peakTime).toLocaleString("ko-KR")}
        </span>
      </p>
      {result.recommendations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.recommendations.map((rec, i) => (
            <div
              key={`${rec.mmsi}-${i}`}
              style={{
                background: "#f6f9ff",
                border: "1px solid rgba(47,107,255,.1)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "#2f6bff" }}
              >
                MMSI {rec.mmsi}
              </div>
              <div style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700 }}>{rec.action}</div>
              <div style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.5, color: "#6b7a99" }}>
                {rec.reason}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
