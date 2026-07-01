// 항만 도메인 타입 정의. seed-port.ts 와 예측/어드바이저 로직이 모두 이 타입을 공유한다.

export interface LatLon {
  lat: number;
  lon: number;
}

export type ShipStatus = "underway" | "anchored" | "moored";

export interface Ship {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number; // Speed Over Ground (knots)
  cog: number; // Course Over Ground (degrees, 0~360)
  eta: string; // ISO 8601
  status: ShipStatus;
  destinationBerthId?: string;
}

// 선석 — 선박이 접안하는 시설
export interface Berth {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number; // 동시 접안 가능 선박 수
}

// 구역 — 묘박지/접근수로 등 항만 내 기능별 영역
export interface Zone {
  id: string;
  name: string;
  center: LatLon;
  radiusKm: number;
}

// 혼잡도 레벨(0~1)을 사람이 읽을 수 있는 단계로 나누는 경계값
export interface CongestionThresholds {
  low: number; // level <= low: 원활
  medium: number; // low < level <= medium: 보통, 초과 시 혼잡
}

export interface PortConfig {
  name: string;
  center: LatLon;
  mockAreaRadiusKm: number; // 목업 선박을 이 반경 내에 생성
  berths: Berth[];
  zones: Zone[];
  congestionThresholds: CongestionThresholds;
  shipsPerHourCapacity: number; // 시간당 처리 가능 선박 수 (혼잡도 정규화 기준)
}

export interface CongestionPoint {
  time: string; // ISO 8601
  level: number; // 0~1
}

export interface CongestionForecast {
  port: string;
  currentLevel: number; // 0~1
  forecast: CongestionPoint[];
}

export interface AdvisorRecommendation {
  mmsi: string;
  action: string;
  reason: string;
}

export interface AdvisorResult {
  summary: string;
  recommendations: AdvisorRecommendation[];
  peakTime: string; // ISO 8601
}
