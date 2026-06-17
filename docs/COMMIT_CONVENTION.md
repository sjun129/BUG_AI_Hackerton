# Git 협업 / 커밋 규칙

## 브랜치 전략 (단순 — 해커톤용)
- `main` : 항상 동작하는 상태만. 직접 push 금지.
- `dev`  : 통합 브랜치. 기능 완성되면 여기로 머지.
- 작업 브랜치: `feat/이름-기능` 예) `feat/aia-xgboost`, `feat/web-dashboard`

흐름: `feat/...` → PR → `dev` → (안정화) → `main`

## 커밋 메시지 형식
```
<타입>: <한 줄 요약 (한글 OK, 50자 이내)>

<선택: 본문 - 무엇을 왜 바꿨는지>
```

### 타입
| 타입 | 용도 |
|---|---|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `data` | 데이터 수집/전처리 작업 |
| `model` | 모델 학습/튜닝 변경 |
| `docs` | 문서 |
| `refactor` | 동작 변화 없는 코드 정리 |
| `chore` | 설정/패키지/잡일 |

### 예시
```
feat: 24시간 혼잡도 예측 함수 추가
model: XGBoost max_depth 튜닝, RMSE 14.2→12.8
data: 5부두 1년치 입출항 포화도 라벨 생성
fix: 공휴일 병합 시 결측 0 처리
```

## 규칙
1. **1커밋 = 1작업.** 여러 기능 한 번에 커밋 금지.
2. `data/raw`, `*.pkl`, `*.h5` 는 커밋하지 않는다 (.gitignore). 데이터는 공유 드라이브 링크로.
3. 매일 작업 시작 전 `git pull origin dev`.
4. PR은 최소 1명 리뷰 후 머지 (4명이라 가볍게).
5. 충돌나면 혼자 끙끙대지 말고 바로 공유.

## 최초 세팅
```bash
git clone <repo-url>
cd ship-port-optimizer
git checkout -b dev
pip install -r requirements.txt
```
