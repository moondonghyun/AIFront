# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phase1 + Phase2 통합 프론트엔드: 인터뷰 기반 서비스 설계 → 홈 화면 3안 생성 → 2차 인터뷰로 구조화 → 최종 React+TS 앱 생성. Google Gemini API를 브라우저에서 직접 호출 (SDK 없음). UI 문자열은 한국어.

## Commands

```bash
npm run dev              # Vite dev server on port 8080
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Run all tests (vitest, single run)
npm run test:watch       # Tests in watch mode
npx vitest run src/test/briefing-state.test.ts  # Run single test file
```

## Architecture (Quick Reference)

Single-route SPA (`src/pages/Index.tsx`) driven by a phase state machine combining Phase1 interview pipeline and Phase2 home style + full app generation:

```
Phase1:  intro → homepage-interview → generating-homepage-md → homepage-result
           → homepage-upload → interview → review → generating-briefing → briefing-ready

Phase2:  → generating-home-style → home-style → home-style-selected
           → generating-home-style-md → home-style-md

Phase1:  → generating-question → secondary-interview → applying-answer → (loop) → ui-ready

Phase2:  → additional-context → generating-full-app → full-app
```

### AI Files
- `src/lib/claude-direct.ts`: homepage MD 생성, briefing JSON 생성, 2차 인터뷰 질문/답변 처리 (Gemini API 사용)
- `src/lib/gemini-direct.ts`: 홈 화면 3안 생성, 홈 스타일 MD, 전체 앱 코드 생성 (Gemini API 사용)

### UI
- shadcn/ui + Tailwind CSS (HSL CSS variables, light/dark). Path alias `@` → `src/`
- Framer Motion for screen transitions
- Narrow canvas (640px) for interview phases, wide canvas (1520px) for home style + full app phases

## Environment Variables

Required in `.env.local`:
```
VITE_GEMINI_API_KEY=...
VITE_GEMINI_HOME_STYLE_API_KEY=...
```

Optional model overrides: `VITE_GEMINI_MODEL_*` (see ai-config.ts for full list).
