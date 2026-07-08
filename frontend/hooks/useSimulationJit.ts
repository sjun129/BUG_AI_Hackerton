"use client";

import { useCallback, useState } from "react";
import type { SimulationEnergyDecisionResult } from "@/frontend/types/energy-decision";
import type { SimulatedShip } from "@/frontend/types/simulation";

export function useSimulationJit() {
  const [result, setResult] = useState<SimulationEnergyDecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetSimulationJit = useCallback(() => {
    setResult(null);
    setError(null);
    setNotice(null);
  }, []);

  const runJitSimulation = useCallback(async (simulatedShips: SimulatedShip[]) => {
    setError(null);
    setNotice(null);

    if (simulatedShips.length === 0) {
      setNotice("가상 선박을 먼저 생성한 뒤 JIT 계산을 실행해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/energy-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "simulation", congestionMode: "dashboard-current", simulatedShips }),
      });

      if (!response.ok) {
        throw new Error(`JIT 계산 요청 실패 (${response.status})`);
      }

      const nextResult = (await response.json()) as SimulationEnergyDecisionResult;
      setResult(nextResult);
      if (nextResult.summary.recommendedCount === 0) {
        setNotice(
          nextResult.emptyReason?.description ??
            "현재 생성된 가상 선박 기준으로 JIT 감속 권고가 없습니다."
        );
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "JIT 계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    result,
    loading,
    error,
    notice,
    runJitSimulation,
    resetSimulationJit,
  };
}
