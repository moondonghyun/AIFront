# src/test — 테스트 가이드

## 설정

- **프레임워크**: Vitest + jsdom
- **설정 파일**: `vitest.config.ts` (루트), `src/test/setup.ts` (DOM 매처 + matchMedia mock)
- **테스트 패턴**: `src/**/*.{test,spec}.{ts,tsx}`

## 실행

```bash
npm test                                          # 전체 테스트 (단일 실행)
npm run test:watch                                # 워치 모드
npx vitest run src/test/briefing-state.test.ts    # 단일 파일 실행
```

## 테스트 파일별 커버리지

| 파일 | 대상 | 테스트 내용 |
|------|------|-------------|
| briefing-state.test.ts | briefing-state.ts | 인터뷰 타겟 수집, 불변 업데이트, 진행률 계산, fulled 값 보호 |
| initial-briefing.test.ts | initial-briefing.ts | 12개 인터뷰 응답 → 브리핑 스캐폴드, 정규화, 구현 준비도 |
| home-style-generation.test.ts | gemini-direct.ts | 홈 스타일 3개 옵션 생성, API 실패 폴백, 프롬프트 검증 |
| home-style-screen.test.tsx | HomeStyleScreen | 3개 옵션 렌더링, 선택 버튼, CTA 노출 |
| fixed-flow.test.tsx | QuestionScreen, JsonUploadScreen | Ctrl+Enter 제출, JSON 파일 파싱 |
| gemini-question-generation.test.ts | gemini-direct.ts | 후속 질문 생성, 중복 질문 치환, 플레이스홀더 변환 |
| secondary-interview.test.tsx | SecondaryInterviewScreen | 배치 질문 렌더링, 진행률, 일괄 답변 수집 |
| example.test.ts | — | 플레이스홀더 (테스트 러너 검증용) |

## 주요 모킹 패턴

```typescript
// AI 설정 모킹
vi.mock("@/lib/ai-config", () => ({
  getAiTaskRuntime: () => ({
    apiKey: "test-key",
    model: "gemini-2.5-flash",
    fallbackModels: [],
    endpoint: "https://..."
  })
}));

// fetch 모킹 (Gemini API)
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: "..." }] } }] })
}));

// React 컴포넌트 테스트
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
```

## 데이터 파일 (src/data/)

- **questions.ts** — 1차 인터뷰 12개 질문 (id, title, placeholder). `questionLabels` 배열도 export
- **fixed-first-interview-answers.ts** — 테스트/데모용 고정 답변 12개. `USE_FIXED_FIRST_INTERVIEW_ANSWERS` 플래그로 토글
