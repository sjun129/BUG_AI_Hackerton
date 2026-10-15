export type ShipStatus = "underway" | "anchored" | "moored";

export interface Ship {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  eta: string;
  status: ShipStatus;
  callSign?: string;
  imo?: string;
  vesselType?: string;
  previousPort?: string;
  nextPort?: string;
  berthName?: string;
  grossTonnage?: number;
  lastUpdated?: string;
}

export type BerthType = "접안" | "묘박";

export interface PortCall {
  callSign: string;
  vesselName: string;
  vesselType?: string;
  nationality?: string;
  previousPort?: string;
  nextPort?: string;
  event: "입항" | "출항";
  eventTime?: string;
  berthName?: string;
  berthType?: BerthType;
  berthAreaId?: string;
  grossTonnage?: number;
}

export interface CongestionPoint {
  time: string;
  level: number;
  arrivals?: number;
  areaVesselCount?: number;
}

export interface CongestionForecast {
  currentLevel: number;
  forecast: CongestionPoint[];
  source?: string;
}

export interface RegionCongestionSeries {
  id: string;
  name: string;
  currentLevel: number;
  forecast: CongestionPoint[];
  arrivals: number;
  departures: number;
  activityWindowHours: number;
  currentVessels: number;
  aisSeparable: boolean;
}

export interface AdvisorResult {
  summary: string;
  recommendations: { mmsi: string; action: string; reason: string }[];
  peakTime: string;
}

export interface WeatherPoint {
  time: string;
  tempC?: number;
  sky?: number;
  pty?: number;
  pop?: number;
  precip?: string;
  humidity?: number;
  windSpeed?: number;
  windDeg?: number;
  waveM?: number;
}

export interface WeatherForecast {
  port: string;
  baseTime: string;
  points: WeatherPoint[];
}
