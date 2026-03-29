<<<<<<< HEAD
# Example

Lovable이 만든 기존 UI를 유지하면서, `JSON 업로드 이후` 흐름만 Gemini 2.5 Flash 기반으로 재구성한 프로젝트입니다.

## 유지한 구간

- 1차 고정 인터뷰
- JSON 업로드

위 두 구간은 수정하지 않고 그대로 둡니다.

## 변경한 구간

- 반복 인터뷰
  - 업로드 직후의 `null` + `expected` 집합을 초기 unresolved 분모로 고정합니다.
  - 사용자가 답해서 실제 값이 들어간 항목만 `answeredTargets`로 계산합니다.
  - `completionRate >= 0.9` 이면 반복 인터뷰를 종료합니다.
  - 기존 `fulled` 값은 코드에서 보호하며 절대 덮어쓰지 않습니다.
- 설계 결과 생성
- 구현 계획 생성
- 마지막 UI 구현/미리보기 단계 제거

## 환경변수

로컬에서 바로 실행하려면 `.env.local`에 아래 값을 넣습니다.

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-3.1-flash-lite-preview
VITE_GEMINI_MODEL_INITIAL_BRIEFING=gemini-3.1-flash-lite-preview
VITE_GEMINI_MODEL_INTERVIEW_QUESTION=gemini-3.1-flash-lite-preview
VITE_GEMINI_MODEL_INTERVIEW_FILL=gemini-3.1-flash-lite-preview
VITE_GEMINI_MODEL_DESIGN=gemini-3.1-flash-lite-preview
VITE_GEMINI_MODEL_IMPLEMENTATION=gemini-3.1-flash-lite-preview
VITE_GEMINI_HOME_STYLE_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL_HOME_STYLE=gemini-3.1-flash-lite-preview
```

현재 앱은 브라우저에서 Gemini 2.5 Flash를 직접 호출합니다.

Supabase Edge Functions 버전도 코드에 남아 있지만, 즉시 실행 경로는 `VITE_GEMINI_API_KEY` 기반 클라이언트 호출입니다.

## 실행

```bash
npm install
npm run build
npm test
npm run verify:gemini
```

`npm run verify:gemini`는 샘플 JSON으로 아래를 실제 Gemini API에 대해 확인합니다.

- `null`/`expected` 대상만 질문 대상으로 잡는지
- 질문 생성 후 답변 반영으로 `fulled`가 증가하는지
- 다음 라운드 질문이 다시 unresolved를 기준으로 생성되는지
