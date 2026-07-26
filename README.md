# 부산항 AIS AI 플랫폼

> AIS(자동 선박 식별 시스템) 데이터를 기반으로 부산항 선박 입항시간(ETA)과 항만 혼잡도를 예측하고,
> 지도로 시각화하며, LLM 어드바이저가 운영 권고(JIT 감속 등)를 제공하는 웹 플랫폼입니다.

🏆 **제11회 부울경 AI 융합 해커톤 — 최우수상**

<br>

## 프로젝트 개요

항만은 선박 도착 시점을 정확히 알기 어려워 불필요한 급항해·정박 대기가 발생하고, 이는 곧 연료 낭비와 혼잡으로 이어집니다.
이 프로젝트는 **AIS 위치·속력 데이터**와 **Port-MIS 혼잡도 예보**를 결합해, 선박이 미리 속도를 늦춰 정시에 도착하도록(JIT, Just-In-Time) 돕는 의사결정 도구입니다.

- 결정론적 계산(ETA·혼잡도)과 LLM 기반 운영 권고를 분리해, **예측은 재현 가능하게, 판단은 LLM이 보조하게** 설계했습니다.
- 항만 설정(좌표·선석·구역·임계값)을 데이터 파일 한 곳에만 몰아넣어, **다른 항만으로도 이식 가능한 아키텍처**를 목표로 했습니다.

<br>

## 주요 기능

| 기능 | 설명 |
|---|---|
| **ETA 예측** | 선박의 현재 위치·속력(SOG)으로 haversine 거리 기반 결정론적 도착 시간 계산 |
| **혼잡도 예측** | 시간대별 입항 예정 선박 수를 집계한 통계 기반 혼잡도(0~1) 곡선 |
| **지도 시각화** | `react-leaflet` 기반 부산항 인근 선박 위치·상태 실시간 표시 |
| **LLM 어드바이저** | 현재 선박·혼잡도 상황을 바탕으로 한 운영 권고(JSON) 생성 |
| **JIT 감속 권고** | ETA가 혼잡 예보 시간대에 포함될 때 감속 권고를 계산, forecast가 오래된 경우 fallback 처리 |
| **시나리오 시뮬레이션** | 가상 선박을 구성해 실제 데이터와 분리된 입항 시나리오 테스트 |

<br>

## 설계에서 고민한 점

- **결정론 vs LLM의 역할 분리**: ETA·혼잡도처럼 재현성이 중요한 계산은 순수 함수(TypeScript, ML 없음)로 두고, 운영 권고처럼 판단이 필요한 부분만 LLM에 맡겼습니다. 또한 LLM 응답은 그대로 신뢰하지 않고 안전 파싱(`backend/advisor/parse.ts`)을 항상 거치도록 했습니다.
- **데이터-코드 분리**: 항만 고유값(좌표·선석·임계값)을 `backend/ports/seed-port.ts` 한 파일에 집중시켜, 다른 항만에 적용할 때 이 파일만 교체하면 되도록 설계했습니다. CODE Medi 프로젝트에서도 동일한 원칙(증례·채점표를 데이터 파일로 분리)을 적용한 적이 있어, 재사용 가능한 개인 아키텍처 패턴으로 삼고 있습니다.
- **Freshness 처리**: Port-MIS 혼잡도 예보가 선박 ETA 범위를 포함하지 못할 때(fallback 상황)를 숨기지 않고 API 응답과 대시보드에 그대로 노출해, 예측 신뢰도를 사용자가 판단할 수 있게 했습니다.

<br>

## 기술 스택

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-000000?style=flat&logo=vercel&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)

- **Frontend**: Next.js (App Router) + TypeScript + TailwindCSS
- **지도/차트**: `react-leaflet`(지도), `recharts`(차트)
- **AI**: Vercel AI SDK(`generateText`) + OpenAI(`gpt-4o-mini` 기본)
- **DB**: Supabase
- **예측 로직**: Python/ML 의존성 없이 TypeScript로 직접 구현 (결정론적 계산)

<br>

## 실행 방법

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY 채우기 (없어도 지도/차트/목록은 동작)
npm run dev
```

`http://localhost:3000` → 랜딩, `/dashboard` → 지도+차트+목록+어드바이저.

키 없이도 `api/ships`, `api/congestion`은 목업 데이터로 끝까지 동작합니다.
`api/advisor`는 `OPENAI_API_KEY`가 있어야 실제 LLM 응답을 받습니다.

<br>

## 페이지 / API 구조

- `/dashboard`: 실제 AIS/Supabase 선박, Port-MIS 혼잡도, JIT 감속 권고, AI 어드바이저를 표시합니다.
- `/vessel`: 선박 목록과 상세 상태를 조회합니다.
- `/simulation`: 브라우저 localStorage에 저장한 가상 선박으로 입항 시나리오를 구성하고 JIT 계산을 실행합니다. 실제 AIS/Port-MIS 선박과 섞지 않습니다.
- `/congestion`: 부산항 권역별 혼잡도를 표시합니다.
- `/api/energy-decisions` `GET`: 실제 선박과 Port-MIS 기반 혼잡도로 JIT 감속 권고를 계산합니다.
- `/api/energy-decisions` `POST`: `/simulation`의 가상 선박 입력을 기준으로 JIT 감속 권고를 계산합니다.

<br>

## 폴더 구조

```
app/                        페이지(App Router)와 API 라우트
frontend/components/        UI 컴포넌트 (지도, 차트, 목록, 어드바이저 패널)
backend/
 ├─ ports/seed-port.ts      부산항 좌표·선석·구역·임계값 (★ 다른 항만 적용 시 이 파일만 교체)
 ├─ ais/                    AIS 목업 데이터 생성
 ├─ prediction/             ETA·혼잡도 계산 (순수 함수)
 └─ advisor/                LLM 프롬프트·응답 파싱
```

자세한 설계 원칙은 [CLAUDE.md](CLAUDE.md) 참고.
