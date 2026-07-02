// aisstream.io WebSocket 연결 — REST가 아니라 지속 연결 스트림이라 이 파일만 연결/재연결을
// 담당하고, 메시지 해석·필터링·저장은 호출부(ingest-aisstream.ts)에서 한다.

import WebSocket from "ws";
import type { AisEnvelope } from "./aisstream-types";
import type { BoundingBox } from "./busan-filter";

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";
const RECONNECT_DELAY_MS = 5_000;

export interface SubscribeOptions {
  apiKey: string;
  boundingBoxes: BoundingBox[];
  onMessage: (msg: AisEnvelope) => void;
  onStatus?: (status: "connected" | "disconnected" | "error", detail?: unknown) => void;
}

/**
 * aisstream.io에 연결해 구독하고, 연결이 끊기면 자동으로 재연결한다.
 * 반환된 함수를 호출하면 재연결을 멈추고 연결을 닫는다.
 */
export function subscribeAisStream(options: SubscribeOptions): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;

  function connect() {
    ws = new WebSocket(AISSTREAM_URL);

    ws.on("open", () => {
      options.onStatus?.("connected");
      ws?.send(
        JSON.stringify({
          APIKey: options.apiKey,
          BoundingBoxes: options.boundingBoxes,
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        })
      );
    });

    ws.on("message", (raw) => {
      try {
        options.onMessage(JSON.parse(raw.toString()) as AisEnvelope);
      } catch (err) {
        options.onStatus?.("error", err);
      }
    });

    ws.on("close", () => {
      options.onStatus?.("disconnected");
      if (!stopped) setTimeout(connect, RECONNECT_DELAY_MS);
    });

    ws.on("error", (err) => {
      options.onStatus?.("error", err);
    });
  }

  connect();

  return () => {
    stopped = true;
    ws?.close();
  };
}
