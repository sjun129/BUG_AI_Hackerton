export type ControlRoomRiskLevel = "low" | "medium" | "high";

export interface ControlRoomBriefingPriorityVessel {
  rank: number;
  shipName: string;
  reason: string;
  expectedImpact: string;
}

export interface ControlRoomBriefingResult {
  source: "openai" | "rule-based-fallback";
  riskLevel: ControlRoomRiskLevel;
  headline: string;
  summary: string;
  congestionCauses: string[];
  priorityActions: string[];
  priorityVessels: ControlRoomBriefingPriorityVessel[];
  routeScenarioSummary?: string;
  risks: string[];
  nextSteps: string[];
  disclaimer: string;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function stringArray(value: unknown, max = 8): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length === value.length ? strings.slice(0, max) : null;
}

function riskLevel(value: unknown): ControlRoomRiskLevel | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function priorityVessels(value: unknown): ControlRoomBriefingPriorityVessel[] | null {
  if (!Array.isArray(value)) return null;

  const items: ControlRoomBriefingPriorityVessel[] = [];
  for (const item of value.slice(0, 5)) {
    if (!item || typeof item !== "object") return null;
    const vessel = item as Record<string, unknown>;
    if (
      typeof vessel.rank !== "number" ||
      typeof vessel.shipName !== "string" ||
      typeof vessel.reason !== "string" ||
      typeof vessel.expectedImpact !== "string"
    ) {
      return null;
    }
    items.push({
      rank: vessel.rank,
      shipName: vessel.shipName,
      reason: vessel.reason,
      expectedImpact: vessel.expectedImpact,
    });
  }
  return items;
}

export function parseControlRoomBriefingResult(rawText: string): ControlRoomBriefingResult | null {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    if (!parsed || typeof parsed !== "object") return null;

    const value = parsed as Record<string, unknown>;
    const parsedRiskLevel = riskLevel(value.riskLevel);
    const congestionCauses = stringArray(value.congestionCauses);
    const priorityActions = stringArray(value.priorityActions);
    const vessels = priorityVessels(value.priorityVessels);
    const risks = stringArray(value.risks);
    const nextSteps = stringArray(value.nextSteps);

    if (
      !parsedRiskLevel ||
      typeof value.headline !== "string" ||
      typeof value.summary !== "string" ||
      !congestionCauses ||
      !priorityActions ||
      !vessels ||
      !risks ||
      !nextSteps ||
      typeof value.disclaimer !== "string"
    ) {
      return null;
    }

    return {
      source: "openai",
      riskLevel: parsedRiskLevel,
      headline: value.headline,
      summary: value.summary,
      congestionCauses,
      priorityActions,
      priorityVessels: vessels,
      ...(typeof value.routeScenarioSummary === "string" ? { routeScenarioSummary: value.routeScenarioSummary } : {}),
      risks,
      nextSteps,
      disclaimer: value.disclaimer,
    };
  } catch {
    return null;
  }
}
