"use client";

import { useEffect, useRef, useState } from "react";
import type { AdvisorResult } from "@/frontend/types/domain";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "assistant"; result: AdvisorResult };

const GREETING: Message = {
  role: "assistant",
  text:
    "안녕하세요! PORTIQ AI 어드바이저입니다. 현재 선박·혼잡도 상황을 분석해 운영 권고를 제시합니다. 아래 버튼을 누르거나 메시지를 보내 요청하세요.",
};

// right: FAB·채팅 패널의 오른쪽 위치(px). 대시보드는 선박 패널 왼쪽에 맞춰 넘겨준다.
export default function AdvisorPanel({ right = 24 }: { right?: number } = {}) {
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

  return (
    <>
      {/* 토글 FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="portiq-btn"
          style={{
            position: "fixed",
            right,
            bottom: 24,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 9,
            border: 0,
            background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14.5,
            padding: "14px 20px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 14px 30px rgba(47,107,255,.4)",
          }}
        >
          <span style={{ fontSize: 17 }}>💬</span> AI 어드바이저
        </button>
      )}

      {/* 채팅 패널 */}
      {open && (
        <div
          style={{
            position: "fixed",
            right,
            bottom: 24,
            zIndex: 1000,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 540,
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: 20,
            border: "1px solid rgba(10,24,48,.08)",
            boxShadow: "0 24px 60px rgba(20,40,90,.28)",
            overflow: "hidden",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(255,255,255,.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-.01em" }}>
                  AI 운영 어드바이저
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 600 }}>
                  실시간 항만 상황 분석
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="닫기"
              style={{
                border: 0,
                background: "rgba(255,255,255,.15)",
                color: "#fff",
                width: 30,
                height: 30,
                borderRadius: 9,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* 메시지 영역 */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#f6f9ff",
            }}
          >
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", ...bubbleBase, background: "#fff", color: "#8a97b3" }}>
                분석 중<span className="portiq-dots">…</span>
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(10,24,48,.07)",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => send("현재 항만 운영 권고를 요청합니다.")}
                disabled={loading}
                className="portiq-btn"
                style={{
                  border: "1px solid rgba(47,107,255,.25)",
                  background: "#eef4ff",
                  color: "#2f6bff",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 11px",
                  borderRadius: 999,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                운영 권고 요청
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="메시지를 입력하세요…"
                style={{
                  flex: 1,
                  border: "1px solid rgba(10,24,48,.14)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  outline: "none",
                  color: "#0a1830",
                  background: "#fff",
                }}
              />
              <button
                onClick={() => send()}
                disabled={loading}
                className="portiq-btn"
                style={{
                  border: 0,
                  background: "linear-gradient(135deg,#2f6bff,#4d7cff)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 16px",
                  borderRadius: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const bubbleBase: React.CSSProperties = {
  maxWidth: "82%",
  padding: "10px 13px",
  borderRadius: 14,
  fontSize: 13.5,
  lineHeight: 1.55,
  boxShadow: "0 2px 8px rgba(20,40,90,.05)",
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
