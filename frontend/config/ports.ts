export const BUSAN_DISPLAY_PORT = {
  name: "부산항",
  center: { lat: 35.05, lng: 129.08 },
  congestionThresholds: { low: 0.3, medium: 0.6 },
  berthAreas: [
    { id: "sinhang", name: "부산신항", lat: 35.081, lng: 128.79 },
    { id: "gamcheon", name: "감천항", lat: 35.075, lng: 129.01 },
    { id: "dadaepo", name: "다대포항", lat: 35.045, lng: 128.968 },
    { id: "sinseondae", name: "신선대부두", lat: 35.065, lng: 129.083 },
    { id: "gamman", name: "감만부두", lat: 35.078, lng: 129.079 },
    { id: "uam", name: "우암·동명부두", lat: 35.093, lng: 129.066 },
    { id: "bukhang", name: "북항", lat: 35.106, lng: 129.043 },
    { id: "yeongdo", name: "영도", lat: 35.088, lng: 129.045 },
    { id: "namhang", name: "남항", lat: 35.093, lng: 129.028 },
    { id: "yongho", name: "용호부두", lat: 35.115, lng: 129.108 },
    { id: "anchorage", name: "항외 묘박지", lat: 35.0, lng: 129.03 },
  ],
} as const;

export type DisplayBerthArea = (typeof BUSAN_DISPLAY_PORT.berthAreas)[number];

export const SIMULATION_DESTINATION_PORTS = [
  {
    id: "busan-north",
    name: "부산항 북항",
    shortName: "북항",
    congestionRegionId: "busan",
    center: { lat: 35.09, lng: 129.07 },
  },
  {
    id: "gamcheon",
    name: "감천항",
    shortName: "감천",
    congestionRegionId: "gamcheon",
    center: { lat: 35.078, lng: 129.01 },
  },
  {
    id: "busan-new",
    name: "부산신항",
    shortName: "신항",
    congestionRegionId: "sinhang",
    center: { lat: 35.081, lng: 128.79 },
  },
] as const;

export type DisplaySimulationDestination = (typeof SIMULATION_DESTINATION_PORTS)[number];
export type DisplayPortId = DisplaySimulationDestination["id"];

export const DEFAULT_SIMULATION_DESTINATION_ID: DisplayPortId = SIMULATION_DESTINATION_PORTS[0].id;

export function congestionDisplayColor(level: number): string {
  const { low, medium } = BUSAN_DISPLAY_PORT.congestionThresholds;
  if (level <= low) return "#34d399";
  if (level <= medium) return "#fbbf24";
  return "#f87171";
}

export function congestionGaugeInfo(level: number): { color: string; status: string } {
  const { low, medium } = BUSAN_DISPLAY_PORT.congestionThresholds;
  if (level <= low) return { color: "#16a34a", status: "원활" };
  if (level <= medium) return { color: "#e8952b", status: "보통" };
  return { color: "#e0483d", status: "혼잡" };
}

export function congestionDisplayLabel(level: number): string {
  const { low, medium } = BUSAN_DISPLAY_PORT.congestionThresholds;
  if (level <= low) return "원활";
  if (level <= medium) return "보통";
  return "혼잡";
}
