# src/lib — 핵심 비즈니스 로직 & AI 통합

## 의존성 그래프

```
gemini-direct.ts (메인 오케스트레이터, ~2400줄)
  ├── ai-config.ts
  ├── ai-fallbacks.ts
  │   ├── briefing-state.ts
  │   ├── design-types.ts
  │   └── implementation-types.ts
  ├── briefing-state.ts
  ├── initial-briefing.ts
  │   └── briefing-state.ts
  ├── ai-types.ts
  ├── design-types.ts
  ├── home-style-types.ts
  └── implementation-types.ts
```

## AI 파이프라인 모듈

### ai-config.ts
AI 태스크별 모델/키/엔드포인트 매핑. `getAiTaskRuntime()` 으로 런타임 설정 반환.
- 태스크 종류: `initialBriefing`, `secondaryInterviewQuestion`, `secondaryInterviewFill`, `designDocument`, `implementationPlan`, `homeStyleConcepts`, `fullAppGeneration`
- 모델은 `VITE_GEMINI_MODEL_*` 환경변수로 오버라이드 가능

### gemini-direct.ts (~2400줄, 핵심 모듈)
모든 Gemini API 호출을 래핑. 주요 exports:
- `requestGeminiJson<T>()` — 범용 API 래퍼 (모델 폴백 체인, 404/503 재시도, 마크다운 래핑된 응답에서 JSON 추출)
- `generateInitialBriefingDirect()` — 1차 인터뷰 → JSON
- `generateInterviewQuestionDirect/BatchDirect()` — 후속 질문 생성
- `applyInterviewAnswerDirect/sBatchDirect()` — 인터뷰 응답 적용
- `generateDesignDocumentDirect()` — 설계 문서 생성
- `generateRenderedHomeStyleOptionsDirect()` — 홈 화면 3개 옵션 (HTML)
- `refineHomeScreenOptionDirect()` — 선택한 옵션 피드백 반영
- `generateHomeScreenMarkdownDirect()` — 홈 스타일 → 마크다운 스펙
- `generateFullAppDirect()` — 전체 React+TS 프로젝트 생성 (가장 큰 프롬프트)
- 모든 함수는 API 실패 시 하드코딩된 폴백 구조체 반환

### ai-fallbacks.ts
AI 실패 시 폴백 구조체 생성:
- `buildFallbackDesignDocument()` — 브리핑 JSON → DesignDocument
- `buildFallbackImplementationPlan()` — DesignDocument → ImplementationPlan

### ai-types.ts
인터뷰 관련 타입: `GeneratedInterviewQuestion`, `InterviewFieldUpdate`, `InterviewHistoryEntry`

## 브리핑 상태 관리

### briefing-state.ts
브리핑 JSON의 상태 필드(value+status 쌍) 순회 및 관리:
- `isStatusField()` — 타입 가드
- `collectInterviewTargets()` — 미완성 필드 추출
- `calculateInterviewProgress()` — 완료율 계산 (completionRate >= 0.9 이면 인터뷰 종료)
- `applyInterviewUpdates()` — 필드 업데이트 적용 (fulled 값 보호, 불변 업데이트)
- `collectFilledFieldSummary()` — 채워진 필드 요약 (AI 프롬프트용)

### initial-briefing.ts (~42KB)
1차 인터뷰 응답 파싱/정규화:
- `INITIAL_BRIEFING_REQUIRED_BRANCHES` — 22개 필수 루트 키
- `INITIAL_BRIEFING_CRITICAL_PATHS` — 24개 크리티컬 필드 경로
- `normalizeInitialBriefing()` — 원시 AI 응답 정규화
- `buildFallbackInitialBriefing()` — 기본 브리핑 스캐폴드
- `buildImplementationReadinessReport()` — 구현 준비도 검증

### briefing-parser.ts
빈 필드 추출/값 설정 유틸리티: `extractEmptyFields()`, `setFieldValue()`

### briefing-utils.ts
필드 카운팅: `countBriefingFields()` → total/filled/completion%

## 타입 정의 파일 (의존성 없음)

| 파일 | 핵심 타입 |
|------|-----------|
| design-types.ts | `DesignDocument`, `TargetUser`, `CoreFeature`, `DataEntity`, `UserFlow`, `ScreenSpec` |
| home-style-types.ts | `RenderedHomeStyleOption` (id, name, html), `RenderedHomeStyleSet`, `HomeStyleSlot`, `GeneratedHomeStyleSet` |
| implementation-types.ts | `ImplementationPlan`, `FrontendUnit`, `BackendApiUnit`, `DataRequirement` |
| wireframe-types.ts | `WireframeElement` (재귀, 20+타입), `WireframeScreen`, `WireframeData` |
| ui-preview-types.ts | `UIComponent` (재귀 컴포넌트 트리), `UIScreen`, `UIPreviewData` |

## 유틸리티

### utils.ts
`cn()` — clsx + tailwind-merge 조합 클래스 병합
