// LLM provider / 모델명을 한 곳에서 관리한다.
// 다른 모델/provider로 바꾸고 싶으면 이 파일만 수정하면 된다.
//
// 기본은 OpenAI. 환경변수로 override 가능:
//   ADVISOR_MODEL (기본 gpt-4o-mini)
// API 키는 .env.local 의 OPENAI_API_KEY 로 자동 인식된다.

import { openai } from "@ai-sdk/openai";

export const ADVISOR_MODEL_ID = process.env.ADVISOR_MODEL ?? "gpt-4o-mini";

export const advisorModel = openai(ADVISOR_MODEL_ID);
