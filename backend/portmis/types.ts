// data.go.kr "해양수산부_선박운항정보"(Port-MIS 입출항 신고, Info5 오퍼레이션) 응답 중
// 실제 쓰는 필드만 정의한다. 참고: https://www.data.go.kr/data/15006353/openapi.do
// (Swagger 문서가 아니라 실제 호출 결과로 확인한 스펙 — 필드명 원문 그대로 유지)

export interface PortMisDetail {
  etryndNm: string; // "입항" | "출항"
  etryptDt?: string; // 입항일시
  tkoffDt?: string; // 출항일시
  laidupFcltyNm?: string; // 접안/정박 시설명(선석명)
  grtg?: string; // 총톤수
  crewCo?: string; // 승무원수
  satmntEntrpsNm?: string; // 선박관리/대리점 업체명
}

export interface PortMisItem {
  prtAgCd: string; // 항구코드
  prtAgNm: string; // 항구명
  clsgn: string; // 호출부호(call sign)
  vsslNm: string; // 선박명
  vsslNltyNm?: string; // 선적국명
  vsslKndNm?: string; // 선종명
  prvsDpmprtPrtNm?: string; // 직전 출항항명
  nxlnptPrtNm?: string; // 다음 기항지명
  details: PortMisDetail[];
}
