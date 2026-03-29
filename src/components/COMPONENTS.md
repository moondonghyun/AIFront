# src/components — 화면 컴포넌트 & UI

## 페이즈별 화면 컴포넌트

메인 플로우 (`src/pages/Index.tsx`의 phase 상태 머신에서 사용):

| 컴포넌트 | 페이즈 | 역할 |
|----------|--------|------|
| JsonUploadScreen | `json-upload` → `json-ready` | 마크다운 서비스 스펙 업로드/입력 |
| DesignScreen | `json-ready` | 브리핑 JSON 메타데이터 표시, 설계/홈스타일 생성 선택 |
| BlueprintScreen | `generating-design` → `design` | 탭형 설계 문서 뷰어 (개요, 기능, 데이터, 플로우, 화면, 미결 사항) |
| HomeStyleScreen | `generating-home-style` → `home-style` | 홈 화면 3개 옵션 미리보기/수정/선택 |
| HomeStyleHandoffScreen | `home-style-selected` | 선택한 홈 스타일 확인 화면 |
| HomeStyleMdScreen | `generating-home-style-md` → `home-style-md` | 선택한 홈 스타일의 마크다운 스펙 표시 |
| AdditionalContextScreen | `additional-context` | 추가 구현 컨텍스트 입력 (자유 텍스트/JSON) |
| FullAppScreen | `generating-full-app` → `full-app` | 생성된 웹앱 미리보기 + ZIP 다운로드 |

## 인터뷰 플로우 컴포넌트 (메인 Index.tsx 외부에서도 사용)

| 컴포넌트 | 역할 |
|----------|------|
| IntroScreen | 랜딩/CTA 화면 |
| QuestionScreen | 단일 질문 폼 (자동 리사이즈 textarea, 진행바) |
| SecondaryInterviewScreen | 배치 질문 화면 (진행률, 질문 탭, 일괄 완료) |
| ReviewScreen | 1차 인터뷰 전체 답변 요약/편집/다운로드 |
| ImplementationScreen | 탭형 구현 계획 뷰어 |

## 미리보기/렌더링 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| WebProjectViewer | 분할 패널 코드 뷰어 (파일 트리 + 미리보기 iframe). FullAppScreen에서 사용 |
| HomeScreenPreview | 홈 화면 HTML을 iframe + 모바일 프레임으로 렌더링 |
| RealisticUIRenderer | UIComponent 데이터 → UI 렌더링 (navbar, hero, form, table, chart 등) |
| WireframePreviewScreen | 와이어프레임 뷰어 (화면 탭, 디바이스 모드 토글, 플로우 시각화) |
| WireframeElementRenderer | 와이어프레임 요소 렌더링 (20+ 요소 타입) |
| UIPreviewScreen | 리얼리스틱 UI 미리보기 (화면 탭, 디바이스 모드) |

## 유틸리티 컴포넌트

- **NavLink** — react-router NavLink 래퍼 (커스텀 className 지원)

## 공통 패턴

- **애니메이션**: 모든 화면 컴포넌트는 `framer-motion`의 `motion.div`로 감싸짐 (fade+slide 트랜지션)
- **UI 라이브러리**: shadcn/ui 컴포넌트는 `@/components/ui/`에 위치
- **아이콘**: lucide-react 아이콘 세트
- **토스트**: sonner 라이브러리
- **캔버스 너비**: 업로드/설계/홈스타일 선택은 좁은 캔버스 (max-w-[760px]), 홈스타일 보기/전체 앱 미리보기는 넓은 캔버스 (max-w-[1520px])
