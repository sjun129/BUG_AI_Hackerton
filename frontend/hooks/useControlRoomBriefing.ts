"use client";

import { useCallback, useEffect, useState } from "react";
import type { ControlRoomBriefingResponse } from "@/frontend/types/control-room";

export function useControlRoomBriefing() {
  const [data, setData] = useState<ControlRoomBriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/control-room/briefing", { cache: "no-store" });
      if (!response.ok) throw new Error(`AI 관제 브리핑 요청 실패 (${response.status})`);
      setData((await response.json()) as ControlRoomBriefingResponse);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI 관제 브리핑을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
