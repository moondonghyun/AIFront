import type {
  GeneratedInterviewQuestion,
  InterviewFieldUpdate,
  InterviewHistoryEntry,
} from "@/lib/ai-types";
import type { InterviewTarget } from "@/lib/briefing-state";

// ─── Claude API helpers ───────────────────────────────────────────

interface ClaudeRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  model: "opus" | "sonnet";
  temperature?: number;
  maxTokens?: number;
}

function getClaudeApiKey(): string {
  return (import.meta.env.VITE_CLAUDE_API_KEY || "").trim();
}

function resolveModelId(model: "opus" | "sonnet"): string {
  if (model === "opus") {
    return import.meta.env.VITE_CLAUDE_OPUS_MODEL || "claude-opus-4-20250514";
  }
  return import.meta.env.VITE_CLAUDE_SONNET_MODEL || "claude-sonnet-4-20250514";
}

function extractJsonFromText(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBrace = cleaned.search(/[\[{]/);
  return firstBrace === -1 ? cleaned : cleaned.slice(firstBrace);
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [3000, 6000, 12000];

async function fetchClaudeWithRetry(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1] || 12000;
      console.log(`[Claude] 재시도 ${attempt}/${MAX_RETRIES} (${delay / 1000}초 후)...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };

      const text = payload.content
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text!)
        .join("")
        .trim();

      if (!text) {
        throw new Error("Claude returned an empty response");
      }

      return text;
    }

    if (response.status === 529 || response.status === 503 || response.status === 500) {
      const errorText = await response.text();
      lastError = new Error(`Claude request failed (${response.status}): ${errorText.slice(0, 400)}`);
      console.warn(`[Claude] ${response.status} 에러, ${attempt < MAX_RETRIES ? "재시도합니다..." : "최대 재시도 횟수 초과"}`);
      continue;
    }

    const errorText = await response.text();
    throw new Error(`Claude request failed (${response.status}): ${errorText.slice(0, 400)}`);
  }

  throw lastError || new Error("Claude request failed after retries");
}

async function requestClaudeJson<T>({
  systemPrompt,
  userPrompt,
  model,
  temperature = 0.2,
  maxTokens = 16384,
}: ClaudeRequestOptions): Promise<T> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    throw new Error("VITE_CLAUDE_API_KEY is not configured");
  }

  const text = await fetchClaudeWithRetry(apiKey, {
    model: resolveModelId(model),
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    return JSON.parse(extractJsonFromText(text)) as T;
  }
}

async function requestClaudeText({
  systemPrompt,
  userPrompt,
  model,
  temperature = 0.3,
  maxTokens = 16384,
}: ClaudeRequestOptions): Promise<string> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    throw new Error("VITE_CLAUDE_API_KEY is not configured");
  }

  return fetchClaudeWithRetry(apiKey, {
    model: resolveModelId(model),
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
}

// ─── Shared utilities (mirrored from gemini-direct) ───────────────

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function createFallbackQuestion(targets: InterviewTarget[]): GeneratedInterviewQuestion | null {
  const firstTarget = targets[0];
  if (!firstTarget) {
    return null;
  }

  const context = firstTarget.parentContext
    ? `${firstTarget.parentContext} > ${firstTarget.label}`
    : firstTarget.label;

  return {
    id: crypto.randomUUID(),
    question: `${context}에 대해 조금 더 알려주세요.`,
    reason: "이 답변이 있어야 UI 화면 설계를 더 구체적으로 만들 수 있습니다.",
    placeholder: `${firstTarget.label}에 대한 예시, 원하는 배치 방식, 꼭 필요한 조건을 적어주세요.`,
    targetFields: [firstTarget.path],
  };
}

function createFallbackQuestions(
  targets: InterviewTarget[],
  maxQuestions = 10,
): GeneratedInterviewQuestion[] {
  const groupedTargets = new Map<string, InterviewTarget[]>();

  targets.forEach((target) => {
    const groupKey =
      target.parentContext.split(" > ").slice(0, 2).join(" > ") || target.path.split(".")[0] || target.path;
    const existing = groupedTargets.get(groupKey) || [];
    existing.push(target);
    groupedTargets.set(groupKey, existing);
  });

  return [...groupedTargets.values()]
    .slice(0, maxQuestions)
    .map((group, index) => {
      const targetFields = group.map((target) => target.path).slice(0, 4);
      const labels = group.map((target) => target.label).slice(0, 4).join(", ");
      const context = group[0]?.parentContext || labels;

      return {
        id: `fallback-batch-${index + 1}`,
        question: `${context}의 UI 구성에 대해 알려주세요.`,
        reason: "관련된 화면 구성 요소를 한 번에 채우기 위해서입니다.",
        placeholder: `${labels}에 대한 레이아웃, 컴포넌트, 배치 방식을 함께 적어주세요.`,
        targetFields,
      } satisfies GeneratedInterviewQuestion;
    });
}

function normalizeQuestionPayload(
  payload: unknown,
  targets: InterviewTarget[],
): GeneratedInterviewQuestion | null {
  if (!payload || typeof payload !== "object") {
    return createFallbackQuestion(targets);
  }

  const record = payload as Record<string, unknown>;
  const targetFields = normalizeStringArray(record.targetFields);
  const question = coerceString(record.question);
  const placeholder = coerceString(record.placeholder);

  if (!question || !placeholder || targetFields.length === 0) {
    return createFallbackQuestion(targets);
  }

  return {
    id: coerceString(record.id, crypto.randomUUID()),
    question,
    reason: coerceString(
      record.reason,
      "이 질문의 답이 있어야 UI 화면 설계를 더 정확하게 만들 수 있습니다.",
    ),
    placeholder,
    targetFields,
  };
}

function normalizeQuestionBatchPayload(
  payload: unknown,
  targets: InterviewTarget[],
  maxQuestions = 10,
): GeneratedInterviewQuestion[] {
  const fallbackQuestions = createFallbackQuestions(targets, maxQuestions);

  const rawQuestions: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).questions)
      ? ((payload as Record<string, unknown>).questions as unknown[])
      : payload
        ? [payload]
        : [];

  const questions = rawQuestions
    .map((item) => normalizeQuestionPayload(item, targets))
    .filter((item): item is GeneratedInterviewQuestion => item !== null)
    .slice(0, maxQuestions);

  return questions.length > 0 ? questions : fallbackQuestions;
}

function normalizeUpdatePayload(payload: unknown): InterviewFieldUpdate[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item): InterviewFieldUpdate | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const path = coerceString(record.path);
      if (!path) {
        return null;
      }

      return {
        path,
        value: record.value,
        confidence:
          typeof record.confidence === "number" && Number.isFinite(record.confidence)
            ? record.confidence
            : undefined,
        note: coerceString(record.note) || undefined,
      };
    })
    .filter((item): item is InterviewFieldUpdate => item !== null);
}

// ─── Exported functions ───────────────────────────────────────────

/**
 * 1차 인터뷰 답변 → UI 브리핑 JSON 생성 (Claude Opus)
 */
export async function generateUIBriefingFromAnswers(
  qaList: Array<{ question: string; answer: string }>,
  homepageMd?: string | null,
): Promise<Record<string, unknown>> {
  const systemPrompt = [
    "너는 UI/UX 전문가로서, 1차 인터뷰 답변을 분석해 이 서비스만을 위한 UI 브리핑 JSON 스키마를 직접 설계하는 AI다.",
    "",
    "【이 JSON의 역할】",
    "이 JSON은 2차 인터뷰의 질문 소스가 된다.",
    "status가 null 또는 expected인 필드 = 사용자에게 확인하거나 채워야 할 UI 결정 사항",
    "status가 fulled인 필드 = 1차 인터뷰 답변에서 사용자가 직접 언급해 이미 확정된 정보",
    "",
    "【핵심 원칙】",
    "1. 모든 리프(leaf) 필드는 반드시 {value: ..., status: 'null'|'expected'|'fulled'} 형태여야 한다.",
    "2. 백엔드, API, DB, 서버, 배포 관련 내용은 절대 포함하지 않는다.",
    "3. 오직 화면·컴포넌트·레이아웃·내비게이션·디자인·사용자 흐름만 다룬다.",
    "4. 사용자가 직접 말하지 않은 것은 아무리 예측 가능해도 fulled로 표시하지 않는다.",
    "5. 홈페이지 설계 문서(MD)가 제공된 경우, 홈 화면의 레이아웃·섹션·CTA·디자인 톤은 해당 문서를 기준으로 확정(fulled)하고, 나머지 화면은 이 홈 화면과 일관된 스타일로 확장한다.",
    "",
    "【스키마 필드 설계 원칙 — 값 채우기와 별개로, 필드 구조 자체는 적극적으로 확장한다】",
    "이 JSON이 전부 채워졌을 때, 개발자가 추가 질문 없이 웹/앱 프론트엔드를 완전히 구현할 수 있어야 한다.",
    "따라서 스키마 필드는 구현에 필요한 모든 결정 사항을 포함해야 한다:",
    "  - user_flows의 exitActions/entryPoints에서 참조하는 화면은 반드시 screens에 존재해야 한다 (없으면 null 스켈레톤으로 생성)",
    "  - 각 화면의 keyComponents가 이미지를 포함하면 image_aspect_ratio, image_size 필드를 넣어라",
    "  - 각 화면에 transition_type 필드를 넣어라 (slide-left / slide-up / fade / none)",
    "  - global_design_system에 bottom_nav_tabs (탭 이름, 아이콘 힌트, 연결 화면) 를 넣어라",
    "  - global_design_system에 breakpoints (mobile / tablet / desktop 기준 너비와 레이아웃 변화) 를 넣어라",
    "  - 단, 이 서비스에 정말 필요 없는 필드를 억지로 넣지는 마라. 예: 지도가 없는 서비스에 지도 관련 필드를 넣지 않는다.",
    "",
    "【반드시 포함해야 할 최상위 섹션 4개】",
    "",
    "━━ 1. service ━━",
    "서비스 이름, 한 줄 요약, 타겟 유저(역할별로 분리, 각 역할의 핵심 니즈 포함)",
    "",
    "━━ 2. global_design_system ━━",
    "화면마다 반복되는 공통 패턴을 한 번만 정의한다.",
    "",
    "  design_tone_mood:",
    "    - keywords: 이 서비스의 감성 형용사 3~5개 (예: 친근한, 따뜻한, 신뢰감 있는)",
    "    - reference_apps: 비슷한 분위기의 앱 예시",
    "    - overall_style: 1차 Q14 답변에서 선택된 디자인 스타일",
    "",
    "  color_roles: (역할별 색상 매핑 — 1차 Q13 색상코드가 있으면 역할에 배정, 없으면 null)",
    "    - primary: 주 브랜드 색상",
    "    - secondary: 보조 색상",
    "    - accent: 강조/CTA 색상",
    "    - background: 앱 배경",
    "    - surface: 카드·시트 배경",
    "    - text_primary / text_secondary: 텍스트 색상",
    "    - error / success / warning: 상태 색상",
    "",
    "  typography_hierarchy: (각 레벨의 size·weight·line_height·use_case)",
    "    - display: 가장 큰 제목 (히어로, 온보딩)",
    "    - heading: 섹션 제목",
    "    - subheading: 소제목",
    "    - body: 본문",
    "    - caption: 보조 텍스트, 날짜, 레이블",
    "    - label: 버튼·태그·배지 텍스트",
    "",
    "  spacing_rules:",
    "    - base_unit: 기본 단위 (4px 또는 8px)",
    "    - screen_horizontal_padding: 좌우 여백",
    "    - section_gap: 섹션 간 간격",
    "    - component_gap: 컴포넌트 간 간격",
    "    - density: compact / comfortable / spacious",
    "",
    "  component_style:",
    "    - button: shape(pill/rounded/square), filled_style, outlined_style, size_variants",
    "    - card: border_radius, elevation(shadow), border, inner_padding",
    "    - input: style(outlined/filled/underline), border_radius, focus_indicator",
    "    - badge_chip: shape, size",
    "",
    "  layout_patterns: (이 앱에서 실제로 쓰이는 패턴만 포함)",
    "    - primary_list_style: 주력 리스트 형태 (card-list / row-list / grid)",
    "    - grid_columns: 그리드 사용 시 열 수",
    "    - tab_style: 탭 스타일 (top-tab / bottom-tab / pill-tab)",
    "    - sheet_usage: 바텀시트·모달 사용 방식",
    "    - global_nav_pattern: 앱 전역 내비게이션 패턴 (bottom-nav / side-drawer / top-tab)",
    "",
    "  bottom_nav_tabs: (global_nav_pattern이 bottom-nav일 때 필수)",
    "    각 탭: tab_name / icon_hint(아이콘 이름 또는 설명) / linked_screen(screens 키) / badge_condition(뱃지 표시 조건, 없으면 null)",
    "",
    "  breakpoints: (웹 또는 '둘 다' 플랫폼일 때 포함)",
    "    - mobile: max_width, layout_changes(예: 1열 그리드, 하단 네비)",
    "    - tablet: min_width, max_width, layout_changes",
    "    - desktop: min_width, layout_changes(예: 사이드바 네비, 2~3열 그리드)",
    "",
    "  shared_states: (공통 상태 UI — 각 화면은 이걸 참조하거나 override만 정의)",
    "    - loading: indicator_type(spinner/skeleton/shimmer), overlay_style",
    "    - empty_state: illustration_style, message_tone, cta_presence",
    "    - error_state: display_type(inline/fullscreen/toast), retry_mechanism",
    "    - toast_notification: position(top/bottom), style, duration",
    "",
    "━━ 3. screens ━━",
    "이 서비스에 필요한 모든 화면. user_flows에서 참조하는 화면은 반드시 여기에 존재해야 한다.",
    "인터뷰에서 언급된 화면뿐 아니라, 서비스 흐름상 당연히 필요한 화면(온보딩, 로그인, 설정 등)도 null 스켈레톤으로 포함한다.",
    "",
    "  필수 공통 필드:",
    "    - screenName: 화면 이름",
    "    - purpose: 이 화면의 역할",
    "    - targetUsers: 이 화면에 접근 가능한 유저 역할",
    "    - headerType: transparent / solid / hidden / large-title / custom",
    "    - navigationType: stack-push / tab-switch / modal / bottom-sheet",
    "    - layoutType: feed / card-grid / list / form / dashboard / detail / splash",
    "    - transition_type: 이 화면으로 진입할 때 전환 애니메이션 (slide-left / slide-up / fade / none)",
    "    - primaryCTA: 이 화면의 가장 중요한 단일 행동 (버튼명 + 이동 대상)",
    "    - secondaryCTA: 보조 행동 (없으면 null)",
    "    - keyComponents: 이 화면의 UI 컴포넌트 배열",
    "      각 컴포넌트: componentName / position(top|middle|bottom|overlay) / layoutHint / visibilityCondition / mainActions",
    "      이미지를 포함하는 컴포넌트는 image_aspect_ratio(예: 16:9, 1:1, 4:3)와 image_size(예: thumbnail, medium, full-width) 필드를 추가",
    "    - entryPoints: 어떤 화면/행동에서 이 화면으로 진입하는가",
    "    - exitActions: 이 화면에서 어디로 나갈 수 있는가 (여기서 참조하는 화면은 반드시 screens에 존재해야 함)",
    "",
    "  조건부 필드 (해당하는 화면에만 포함):",
    "    - listItemSpec: 리스트/피드 화면에만 — 각 아이템에 표시되는 정보와 레이아웃",
    "    - formValidation: 폼 입력 화면에만 — 각 필드의 유효성 검사 방식과 에러 표시",
    "",
    "  상태 참조 필드 (공통 사용 시 value:'global', 이 화면만 다를 경우 value:'custom' + 구체적 override 내용):",
    "    - emptyStateRef",
    "    - loadingStateRef",
    "    - errorStateRef",
    "",
    "━━ 4. user_flows ━━",
    "이 서비스의 핵심 태스크 플로우 (예상 3~6개).",
    "각 플로우:",
    "  - flowName: 플로우 이름",
    "  - triggerCondition: 어떤 상황에서 시작되는가",
    "  - steps 배열: step번호 / screenName / userAction / uiResponse / nextScreenCondition",
    "",
    "【스키마 깊이 기준】",
    "pretty-print 기준 1500~2000 라인 목표.",
    "각 필드를 실제 프론트엔드 구현에 바로 쓸 수 있을 수준으로 세분화해라.",
    "단, 반복 구조를 그대로 복붙하지 말고 global_design_system으로 빼서 참조하라.",
    "필드 수가 많아지더라도 value는 채우지 말고 null로 남겨라. 필드가 존재하는 것이 중요하다.",
    "",
    "【status 판단 기준 — 1차 스키마는 추론을 최대한 자제한다. 사용자가 말한 것만 채운다.】",
    "",
    "fulled: 사용자가 1차 인터뷰에서 '직접 언급'한 내용만. 추론·예측·상식으로 채운 값은 절대 fulled 금지.",
    "",
    "null: 사용자가 명시적으로 언급하지 않은 모든 UI 세부사항. 추론하지 말고 null로 남겨라.",
    "  - 버튼 모양, 카드 스타일, 폰트 크기, 여백, 리스트 형태, 헤더 타입, 로딩 방식, 색상 세부, 아이콘 스타일 등",
    "  - AI가 '이 서비스라면 이렇겠지'라고 예측할 수 있어도 null이다.",
    "  - null은 2차 인터뷰에서 사용자에게 직접 확인할 항목이다.",
    "",
    "expected: 극히 제한적으로만 사용. 서비스 유형상 존재 자체가 거의 확실한 것만.",
    "  - 예: 쇼핑몰의 장바구니 화면 존재 여부, 예약 서비스의 예약 내역 화면 존재 여부",
    "  - expected는 전체 필드의 최대 10~15%만 허용.",
    "",
    "【핵심: 전체 필드의 50% 이상이 반드시 null이어야 한다. 이 비율을 지키지 않으면 2차 인터뷰가 무의미해진다.】",
    "【AI의 추론은 2차 인터뷰 단계에서 한다. 1차 스키마에서는 절대 추론하지 마라.】",
    "",
    "반드시 JSON만 반환한다. 설명 텍스트, 마크다운, 코드블록 없이 순수 JSON만.",
  ].join("\n");

  const userPromptParts = [
    "아래 1차 인터뷰 답변을 분석해서, 이 서비스에 맞는 UI 브리핑 JSON 스키마를 직접 설계하고 생성해라.",
    "필드 구조와 이름은 이 서비스에 최적화되도록 네가 직접 결정한다.",
  ];

  if (homepageMd) {
    userPromptParts.push(
      "",
      "━━ 사용자가 승인한 홈페이지 설계 문서 (MD) ━━",
      "이 문서에 정의된 홈 화면의 레이아웃, 섹션 구성, CTA, 디자인 톤은 확정된 것이다.",
      "screens 섹션의 홈 화면은 이 문서를 기준으로 fulled 처리하고, 나머지 화면은 이 홈과 일관성을 유지하며 확장하라.",
      "",
      homepageMd,
      "",
      "━━ 홈페이지 설계 문서 끝 ━━",
    );
  }

  userPromptParts.push(
    "",
    "1차 인터뷰 QA:",
    JSON.stringify(qaList, null, 2),
  );

  const userPrompt = userPromptParts.join("\n");

  try {
    const response = await requestClaudeJson<Record<string, unknown>>({
      systemPrompt,
      userPrompt,
      model: "sonnet",
      temperature: 0.4,
      maxTokens: 16384,
    });
    return response;
  } catch (error) {
    console.error("[generateUIBriefingFromAnswers] Claude API failed:", error);
    return {
      service: {
        name: { value: null, status: "null" },
        summary: { value: null, status: "null" },
      },
      screens: [
        {
          name: { value: "홈 화면", status: "fulled" },
          purpose: { value: null, status: "null" },
          layout_type: { value: null, status: "null" },
          key_components: { value: null, status: "null" },
          primary_actions: { value: null, status: "null" },
        },
      ],
      navigation: {
        type: { value: null, status: "null" },
        main_menu_items: { value: null, status: "expected" },
      },
      design_tone: {
        style: { value: null, status: "null" },
        color_hint: { value: null, status: "expected" },
      },
    };
  }
}

/**
 * 2차 인터뷰 시작 전 — 공통/지엽적 필드를 AI가 자동 추론하여 일괄 채움 (Claude Sonnet)
 */
export async function autoFillCommonFields(
  briefingJson: Record<string, unknown>,
  unresolvedTargets: InterviewTarget[],
): Promise<InterviewFieldUpdate[]> {
  if (unresolvedTargets.length === 0) return [];

  const systemPrompt = [
    "너는 UI/UX 전문가로서 브리핑 JSON의 지엽적·공통적·반복적 필드를 서비스 성격에 맞게 자동으로 채우는 AI다.",
    "",
    "【자동으로 채워야 하는 필드 유형】",
    "아래 유형의 필드는 사용자에게 물어볼 필요 없이 AI가 서비스 성격과 이미 fulled인 값을 참고해서 합리적으로 결정한다:",
    "  - typography_hierarchy: 모든 폰트 크기, 줄 간격, 굵기",
    "  - spacing_rules: 여백 단위, 간격 수치, 밀도",
    "  - component_style 세부값: border_radius, elevation, inner_padding, focus_indicator, size_variants",
    "  - shared_states: 로딩 방식, 에러 표시, 토스트 위치/스타일/duration",
    "  - breakpoints: 반응형 기준 수치",
    "  - formValidation: 에러 메시지 문구, 유효성 규칙",
    "  - 각 화면의 emptyStateRef, loadingStateRef, errorStateRef (대부분 global로 통일)",
    "  - 각 화면의 transition_type (서비스 흐름에 맞게 일괄 결정)",
    "  - 이미지 포함 컴포넌트의 image_aspect_ratio, image_size",
    "",
    "【채우지 않는 필드】",
    "다음은 사용자의 의견이 필요하므로 건드리지 않는다:",
    "  - 각 화면의 layoutType, primaryCTA, secondaryCTA, keyComponents 구성",
    "  - 화면 간 네비게이션 결정 (어디로 이동할지)",
    "  - 전체 분위기/스타일 방향",
    "  - 화면의 핵심 기능이나 콘텐츠 구성",
    "",
    "【규칙】",
    "- fulled인 값은 절대 수정하지 않는다.",
    "- 화면마다 반복되는 필드(headerType, transition_type 등)는 첫 번째 화면의 패턴을 참고해서 나머지에 일괄 적용한다.",
    "- confidence는 0.5로 설정한다.",
    "- note에 'AI 자동 채움 - 공통 필드'라고 표시한다.",
    "",
    '반드시 JSON만 반환. 형식: {"updates":[{"path":"...","value":"...","confidence":0.5,"note":"AI 자동 채움 - 공통 필드"}]}',
  ].join("\n");

  const userPrompt = [
    "현재 브리핑 JSON:",
    JSON.stringify(briefingJson, null, 2),
    "",
    "아직 null인 필드 목록:",
    JSON.stringify(unresolvedTargets, null, 2),
    "",
    "위 목록에서 사용자에게 물어볼 필요 없는 지엽적/공통적/반복적 필드를 찾아서 합리적인 값으로 채워라.",
    '형식: {"updates":[...]}',
  ].join("\n");

  try {
    const response = await requestClaudeJson<{ updates?: unknown }>({
      systemPrompt,
      userPrompt,
      model: "sonnet",
      temperature: 0.2,
    });

    if (!Array.isArray(response.updates)) return [];

    return (response.updates as Array<Record<string, unknown>>)
      .filter((u) => typeof u.path === "string" && u.path)
      .map((u) => ({
        path: u.path as string,
        value: u.value,
        confidence: typeof u.confidence === "number" ? u.confidence : 0.5,
        note: (u.note as string) || "AI 자동 채움 - 공통 필드",
      }));
  } catch (error) {
    console.error("[autoFillCommonFields] failed:", error);
    return [];
  }
}

/**
 * 2차 인터뷰 질문 생성 (Claude Sonnet)
 */
export async function generateInterviewQuestionBatchDirect(input: {
  briefingJson: Record<string, unknown>;
  unresolvedTargets: InterviewTarget[];
  interviewHistory: InterviewHistoryEntry[];
  filledSummary: Array<{ path: string; value: string }>;
  maxQuestions?: number;
}): Promise<GeneratedInterviewQuestion[]> {
  const maxQuestions = Math.min(Math.max(input.maxQuestions || 10, 1), 10);
  const fallbackQuestions = createFallbackQuestions(input.unresolvedTargets, maxQuestions);
  if (input.unresolvedTargets.length === 0) {
    return [];
  }

  const systemPrompt = [
    "너는 비개발자 사용자와 대화하면서 서비스 UI를 함께 설계하는 친근한 AI 도우미다.",
    "사용자는 개발자가 아니다. 기술 용어를 절대 쓰지 않는다.",
    "",
    "【질문 스타일 — 이것이 가장 중요하다】",
    "- 친구에게 물어보듯 쉽고 친근하게 질문한다.",
    "- '줄 간격', '여백 단위', '바텀시트', 'CTA', '포커스 인디케이터' 같은 개발/디자인 용어는 절대 쓰지 않는다.",
    "- 대신 실생활 비유와 구체적 예시로 물어본다.",
    "  나쁜 예: '카드 border-radius를 정해주세요'",
    "  좋은 예: '목록에서 가게 하나하나가 네모 카드로 보일 건데, 모서리가 둥글둥글한 게 좋을까요 아니면 각진 게 좋을까요?'",
    "  나쁜 예: '바텀시트 사용 여부를 정해주세요'",
    "  좋은 예: '가게를 눌렀을 때 화면 전체가 바뀌는 게 좋을까요, 아니면 아래에서 슬쩍 올라오는 미리보기가 좋을까요?'",
    "",
    "【AI가 직접 추론해서 채울 것 — 질문하지 않는다】",
    "다음은 사용자에게 물어봐야 할 수준이 아니다. AI가 서비스 성격과 이미 채워진 답변을 바탕으로 직접 결정한다:",
    "  - typography_hierarchy (폰트 크기, 줄 간격, 굵기 등 모든 텍스트 수치)",
    "  - spacing_rules (여백 단위, 간격 수치, 밀도)",
    "  - component_style의 세부 수치 (border_radius, elevation, inner_padding, focus_indicator 등)",
    "  - shared_states (로딩 방식, 에러 표시, 토스트 위치 등)",
    "  - formValidation의 에러 메시지 문구",
    "  - breakpoints 수치",
    "이 항목들은 질문 대신 targetFields에 넣고 AI가 답변 적용 시 함께 추론해서 채운다.",
    "",
    "【질문 우선순위 — 화면 단위로 물어본다】",
    "  1순위: 각 화면이 어떤 모습이어야 하는지 (사용자가 체감하는 수준의 질문)",
    "     - 이 화면에 들어오면 뭐가 가장 먼저 보여야 하나요?",
    "     - 목록은 사진이 크게 보이는 게 좋을까요, 정보가 한눈에 보이는 게 좋을까요?",
    "     - 여기서 가장 중요한 버튼은 뭔가요? 어디에 있으면 좋겠어요?",
    "  2순위: 화면 간 이동 방식",
    "     - 이 버튼을 누르면 새 화면으로 넘어갈까요, 아래에서 슬쩍 올라올까요?",
    "  3순위: 전체 분위기/스타일 (큰 그림 수준만)",
    "     - 전체적으로 둥글둥글한 느낌? 각진 느낌? 그림자가 있는 입체감?",
    "",
    "【'알아서 해줘' 또는 위임형 답변 처리】",
    "사용자가 '알아서 해줘', '상관없어', '모르겠어' 등으로 답하면:",
    "  - 서비스 성격에 맞는 구체적인 옵션 2~3개를 비유와 함께 제안하는 질문으로 바꾼다.",
    "  - 예: '비슷한 앱들을 보면 ①카카오톡처럼 깔끔한 목록 ②인스타그램처럼 사진 위주 ③당근마켓처럼 카드형이 있는데, 어떤 느낌이 가장 가까워요?'",
    "",
    "【질문 품질 규칙】",
    "- 질문은 최대 10개. 짧고 자연스럽게.",
    "- 한 질문은 하나의 주제만 묻는다. 여러 주제를 억지로 묶어서 길어지게 하지 않는다.",
    "- 이전 라운드에서 이미 물어본 것과 같은 유형의 질문은 반복하지 않는다. (답변 적용 시 AI가 다른 화면에 추론 적용하므로)",
    "- placeholder는 실제 앱 이름이나 구체적 예시를 들어 안내한다.",
    "- 이미 fulled인 항목은 다시 묻지 않는다.",
    "",
    '반드시 JSON만 반환하고 형식은 {"questions":[...]} 이어야 한다.',
  ].join("\n");

  const userPrompt = [
    "현재 UI 브리핑 JSON:",
    JSON.stringify(input.briefingJson, null, 2),
    "",
    "아직 채워야 하는 UI 항목:",
    JSON.stringify(input.unresolvedTargets, null, 2),
    "",
    "이미 채워진 항목 요약:",
    JSON.stringify(input.filledSummary, null, 2),
    "",
    "이전 QA 히스토리:",
    JSON.stringify(input.interviewHistory, null, 2),
    "",
    `최대 ${maxQuestions}개의 질문만 반환해라.`,
    '다음 형식으로만 답해라: {"questions":[{"id":"...","question":"...","reason":"...","placeholder":"...","targetFields":["...","..."]}]}',
  ].join("\n");

  try {
    const response = await requestClaudeJson<unknown>({
      systemPrompt,
      userPrompt,
      model: "sonnet",
      temperature: 0.3,
    });

    return normalizeQuestionBatchPayload(response, input.unresolvedTargets, maxQuestions);
  } catch {
    return fallbackQuestions;
  }
}

/**
 * 2차 인터뷰 답변 → 필드 업데이트 추출 (Claude Sonnet)
 */
export async function applyInterviewAnswersBatchDirect(input: {
  briefingJson: Record<string, unknown>;
  questions: GeneratedInterviewQuestion[];
  answersByQuestionId: Record<string, string>;
}): Promise<InterviewFieldUpdate[]> {
  const answeredQuestions = input.questions
    .map((question) => ({
      ...question,
      answer: (input.answersByQuestionId[question.id] || "").trim(),
    }))
    .filter((question) => question.answer.length > 0);

  const fallbackUpdates = answeredQuestions
    .map((question): InterviewFieldUpdate | null => {
      const firstTarget = question.targetFields[0];
      if (!firstTarget) {
        return null;
      }

      return {
        path: firstTarget,
        value: question.answer,
        confidence: 0.35,
        note: "AI 응답이 없어 첫 번째 대상 필드에 원문 답변을 반영했습니다.",
      };
    })
    .filter((item): item is InterviewFieldUpdate => item !== null);

  if (answeredQuestions.length === 0) {
    return [];
  }

  const systemPrompt = [
    "너는 UI 설계 인터뷰 답변을 구조화 JSON 필드 업데이트로 바꾸는 AI다.",
    "전체 JSON을 다시 만들지 말고 updates 배열만 반환한다.",
    "기존 status가 fulled인 값은 절대 수정하거나 덮어쓰지 않는다.",
    "각 질문의 targetFields와 직접 관련된 UI 경로만 업데이트한다.",
    "한 질문의 답으로 여러 UI 필드를 같이 채울 수 있으면 그렇게 한다.",
    "",
    "【2차 인터뷰에서는 AI가 최대한 공격적으로 추론한다】",
    "1차 스키마는 보수적으로 null을 많이 남겼다. 2차 인터뷰는 이 null을 최대한 빠르게 채우는 단계다.",
    "사용자의 답변 하나에서 가능한 모든 null 필드를 추론하여 채워라.",
    "",
    "【추론 확장 범위 — 3단계로 넓혀라】",
    "",
    "1단계 (직접): 사용자가 답변에서 직접 언급한 필드를 채운다.",
    "",
    "2단계 (같은 유형 일괄): 같은 유형의 필드가 다른 화면에도 null로 있으면 모두 함께 채운다.",
    "  예: 검색 화면의 headerType을 답하면 → 모든 화면의 headerType을 추론",
    "  예: 목록 카드 스타일을 답하면 → 모든 리스트 화면의 listItemSpec을 추론",
    "  예: 화면 전환 방식을 답하면 → 모든 화면의 transition_type을 추론",
    "",
    "3단계 (연쇄 추론): 이번 라운드의 답변 전체 맥락에서, 아직 null인 관련 필드를 최대한 추론한다.",
    "  예: 사용자가 '깔끔하고 심플하게'라는 분위기를 여러 답변에서 보였으면",
    "    → typography_hierarchy의 모든 null 필드를 깔끔한 스타일로 채운다",
    "    → spacing_rules의 null 필드를 comfortable/넉넉하게 채운다",
    "    → component_style의 null 필드를 미니멀 방향으로 채운다",
    "    → 모든 화면의 emptyStateRef, loadingStateRef, errorStateRef를 global로 채운다",
    "  예: 사용자가 특정 화면 구성을 답했으면",
    "    → 그 화면의 navigationType, layoutType, entryPoints, exitActions도 추론 가능하면 채운다",
    "    → formValidation이 null인 폼 화면이 있으면 서비스 성격에 맞게 추론한다",
    "",
    "【목표: 한 라운드(10개 질문)의 답변 적용으로 전체 null 필드의 30% 이상을 채워라.】",
    "targetFields에 없는 경로라도, 논리적으로 도출 가능한 모든 필드에 업데이트를 만들어라.",
    "updates 배열의 길이가 60~80개가 되는 것을 목표로 하라. 적게 보내면 인터뷰가 끝없이 반복된다.",
    "",
    "【위임형 답변 처리 규칙】",
    "사용자가 '알아서 해줘', '상관없어', '모르겠어', '자유롭게 해줘', '네', '응', '맞아', '그냥 해줘' 처럼",
    "구체적인 내용 없이 AI에게 판단을 맡기는 답변을 했다면:",
    "  - 빈 배열 [] 을 반환하지 말고, 서비스 성격에 맞는 가장 합리적인 값을 AI가 직접 추론해서 적용한다.",
    "  - confidence는 0.25로 설정한다.",
    "  - note 필드에 반드시 '사용자 위임 - AI 추론값' 이라고 명시한다.",
    "  - 추론값은 구체적인 문자열이어야 한다. 예: '둥글고 부드러운 카드 스타일, 그림자 약하게'",
    "",
    "【단순 긍정 답변 처리 규칙】",
    "사용자가 확인 질문에 '네', '맞아요', '좋아요' 등 단순 긍정으로 답했다면:",
    "  - 질문에서 AI가 제안했던 구체적인 값을 그대로 적용한다.",
    "  - confidence는 0.8로 설정한다.",
    "",
    "【추론 업데이트의 confidence 기준】",
    "  - 사용자가 직접 말한 값: confidence 0.9",
    "  - 답변에서 논리적으로 도출한 관련 값: confidence 0.6",
    "  - 서비스 성격 기반 AI 추론: confidence 0.4",
    "  - 위임형 답변 기반 AI 추론: confidence 0.25",
    "",
    '반드시 JSON만 반환하고 형식은 {"updates":[...]} 이어야 한다.',
  ].join("\n");

  const userPrompt = [
    "현재 UI 브리핑 JSON:",
    JSON.stringify(input.briefingJson, null, 2),
    "",
    "질문과 답변 묶음:",
    JSON.stringify(answeredQuestions, null, 2),
    "",
    '다음 형식으로만 답해라: {"updates":[{"path":"...","value":"...","confidence":0.0,"note":"..."}]}',
  ].join("\n");

  try {
    const response = await requestClaudeJson<{ updates?: unknown }>({
      systemPrompt,
      userPrompt,
      model: "sonnet",
      temperature: 0.2,
    });

    console.log("[applyAnswers] AI raw response updates 수:", Array.isArray(response.updates) ? response.updates.length : "not array");
    console.log("[applyAnswers] AI raw response:", JSON.stringify(response.updates, null, 2)?.slice(0, 2000));

    const updates = normalizeUpdatePayload(response.updates);
    console.log("[applyAnswers] normalize 후 updates 수:", updates.length);
    if (updates.length === 0) {
      console.warn("[applyAnswers] updates가 0개 → fallback 사용");
    }
    return updates.length > 0 ? updates : fallbackUpdates;
  } catch (error) {
    console.error("[applyAnswers] API 실패:", error);
    return fallbackUpdates;
  }
}

/**
 * 홈페이지 인터뷰 답변 → 홈페이지 단일 화면 구현 가이드 MD 생성 (Claude Sonnet)
 */
export async function generateHomepageMd(
  qaList: Array<{ question: string; answer: string }>,
): Promise<string> {
  const systemPrompt = [
    "너는 프론트엔드 UI/UX 전문가이자 시니어 웹 개발자다.",
    "사용자의 홈페이지 인터뷰 답변을 분석해서, 오직 홈페이지 단일 화면 구현을 위한 상세 마크다운 설계 문서를 작성한다.",
    "",
    "【문서의 목적】",
    "이 문서를 받은 개발자가 추가 질문 없이 홈페이지 화면을 바로 구현할 수 있어야 한다.",
    "오직 홈페이지(메인 페이지) 하나만 다룬다. 다른 페이지는 언급하지 않는다.",
    "",
    "【반드시 포함할 섹션】",
    "",
    "# 1. 서비스 개요",
    "- 서비스 이름 / 한 줄 설명",
    "- 타겟 사용자",
    "- 플랫폼 (웹/앱/둘 다)",
    "",
    "# 2. 홈 화면 레이아웃 구조",
    "- 전체 레이아웃을 ASCII 와이어프레임으로 시각화",
    "- 각 섹션의 위치와 역할 설명",
    "- 헤더 / 히어로 / 콘텐츠 영역 / 푸터 구성",
    "",
    "# 3. 섹션별 상세 명세",
    "- 각 섹션마다: 섹션 이름, 목적, 포함 요소, 레이아웃 힌트",
    "- 히어로 영역: 메인 카피, CTA 버튼, 배경 처리",
    "- 콘텐츠 영역: 카드/리스트/그리드 구성, 아이템 구조",
    "- 네비게이션: 메뉴 항목, 로고 위치, 반응형 처리",
    "",
    "# 4. 주요 인터랙션 & CTA",
    "- 버튼/링크 목록과 각각의 동작",
    "- 호버/클릭/스크롤 시 기대 동작",
    "",
    "# 5. 디자인 톤 & 스타일 가이드",
    "- 전체 분위기 키워드",
    "- 참고 서비스에서 가져올 디자인 요소",
    "- 색상 방향 (primary / background / accent 제안)",
    "- 타이포그래피 방향 (제목 / 본문 / 캡션)",
    "- 여백과 밀도 방향",
    "",
    "# 6. 반응형 대응",
    "- 데스크탑 / 태블릿 / 모바일 각각의 레이아웃 변화",
    "- 모바일에서의 네비게이션 처리 (햄버거 메뉴 등)",
    "",
    "# 7. 컴포넌트 목록",
    "- 이 홈페이지에서 필요한 컴포넌트를 리스트업",
    "- 각 컴포넌트: 이름, props 설명, 위치",
    "",
    "【작성 규칙】",
    "- 한국어로 작성한다.",
    "- 마크다운 형식으로 깔끔하게 구조화한다.",
    "- 코드블록이 아닌 설계 가이드 문서다.",
    "- 사용자가 직접 말한 내용은 최대한 반영하고, 말하지 않은 부분은 서비스 성격에 맞게 합리적으로 추론한다.",
    "- 추론한 부분은 '(AI 제안)' 태그를 붙여서 사용자가 나중에 수정할 수 있게 한다.",
    "- 백엔드, API, 데이터베이스 관련 내용은 포함하지 않는다.",
  ].join("\n");

  const userPrompt = [
    "아래 홈페이지 인터뷰 답변을 분석해서, 홈페이지 단일 화면 구현을 위한 상세 설계 마크다운 문서를 작성해라.",
    "",
    "홈페이지 인터뷰 QA:",
    JSON.stringify(qaList, null, 2),
  ].join("\n");

  return requestClaudeText({
    systemPrompt,
    userPrompt,
    model: "sonnet",
    temperature: 0.4,
    maxTokens: 8192,
  });
}
