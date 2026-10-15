import type { PortCall, Ship } from "@/frontend/types/domain";

function normCallSign(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function normName(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

export const NAME_SIMILARITY_THRESHOLD = 0.85;

export function filterShipsMatchingPortMis(
  ships: Ship[],
  calls: PortCall[],
  threshold = NAME_SIMILARITY_THRESHOLD
): Ship[] {
  if (calls.length === 0) return ships;

  const callSet = new Set(calls.map((call) => normCallSign(call.callSign)).filter(Boolean));
  const misNames = calls.map((call) => normName(call.vesselName)).filter(Boolean);

  return ships.filter((ship) => {
    const callSign = normCallSign(ship.callSign);
    if (callSign && callSet.has(callSign)) return true;
    const shipName = normName(ship.name);
    if (!shipName) return false;
    return misNames.some((name) => nameSimilarity(shipName, name) >= threshold);
  });
}
