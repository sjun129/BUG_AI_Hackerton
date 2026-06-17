"""혼잡도 → 예상 대기 시간 변환.

MVP: 규칙 기반(포화도 비례). 데이터 쌓이면 회귀로 교체.
"""
import config


def estimate_wait_hours(congestion_pct: float, base_service_hours: float = 1.0) -> float:
    """포화도(%)가 100을 넘을수록 대기 급증한다는 가정.
    TODO: 실제 입항~접안 지연 데이터로 보정.
    """
    if congestion_pct < 50:
        return round(base_service_hours * 0.5, 1)
    if congestion_pct < 80:
        return round(base_service_hours * 1.5, 1)
    if congestion_pct < 100:
        return round(base_service_hours * 3.0, 1)
    return round(base_service_hours * (1 + congestion_pct / 50), 1)
