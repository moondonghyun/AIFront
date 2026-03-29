import { buildFallbackDesignDocument, buildFallbackImplementationPlan } from "@/lib/ai-fallbacks";
import type {
  GeneratedInterviewQuestion,
  InterviewFieldUpdate,
  InterviewHistoryEntry,
} from "@/lib/ai-types";
import { isStatusField, type InterviewTarget } from "@/lib/briefing-state";
import type { DesignDocument } from "@/lib/design-types";
import { getAiTaskRuntime, type AiTaskId } from "@/lib/ai-config";
import {
  buildImplementationReadinessReport,
  buildFallbackInitialBriefing,
  INITIAL_BRIEFING_CRITICAL_PATHS,
  INITIAL_BRIEFING_REQUIRED_BRANCHES,
  normalizeInitialBriefing,
  type FirstInterviewResponse,
} from "@/lib/initial-briefing";
import type {
  GeneratedHomeStyleSet,
  HomeStyleSlot,
  HomeStyleOption,
  RenderedHomeStyleOption,
  RenderedHomeStyleSet,
} from "@/lib/home-style-types";
import type { ImplementationPlan } from "@/lib/implementation-types";

// ─── Markdown briefing helpers ───────────────────────────────────────────────

export function isMarkdownBriefing(briefingJson: Record<string, unknown>): boolean {
  return briefingJson._format === "markdown" && typeof briefingJson.content === "string";
}

/** Returns the raw service specification text for use in AI prompts */
export function formatServiceContext(briefingJson: Record<string, unknown>): string {
  if (isMarkdownBriefing(briefingJson)) {
    return briefingJson.content as string;
  }
  return JSON.stringify(briefingJson, null, 2);
}

/** Label for the service context block in prompts */
export function serviceContextLabel(briefingJson: Record<string, unknown>): string {
  return isMarkdownBriefing(briefingJson) ? "SERVICE SPECIFICATION (Markdown):" : "SERVICE JSON:";
}

// ─────────────────────────────────────────────────────────────────────────────

interface GeminiRequestOptions {
  taskId: AiTaskId;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
}

function extractJsonPayload(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBrace = cleaned.search(/[\[{]/);
  return firstBrace === -1 ? cleaned : cleaned.slice(firstBrace);
}

async function requestGeminiJson<T>({
  taskId,
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  timeoutMs,
}: GeminiRequestOptions): Promise<T> {
  const runtime = getAiTaskRuntime(taskId);
  const apiKey = runtime.apiKey;
  if (!apiKey) {
    throw new Error(`${runtime.provider.apiKeyEnvKeys[0]} is not configured`);
  }

  const modelsToTry = [runtime.model, ...runtime.fallbackModels.filter((model) => model !== runtime.model)];
  let payload: Record<string, unknown> | null = null;
  let lastError: Error | null = null;

  console.log(`[Gemini:${taskId}] starting request — models to try:`, modelsToTry);

  for (const model of modelsToTry) {
    console.log(`[Gemini:${taskId}] trying model: ${model}`);

    const controller = timeoutMs ? new AbortController() : null;
    const timerId = controller && timeoutMs
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(
        `${runtime.provider.baseUrl}/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller?.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (response.ok) {
        console.log(`[Gemini:${taskId}] model ${model} responded OK`);
        payload = (await response.json()) as Record<string, unknown>;
        break;
      }

      const errorText = await response.text();
      lastError = new Error(`Gemini request failed (${response.status}): ${errorText.slice(0, 400)}`);
      console.warn(`[Gemini:${taskId}] model ${model} failed with ${response.status}:`, errorText.slice(0, 200));

      // Retry with next fallback model on 404 (model not found) or 503 (service unavailable)
      if (response.status !== 404 && response.status !== 503) {
        throw lastError;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        lastError = new Error(`Gemini request timed out after ${timeoutMs}ms (model: ${model})`);
        console.warn(`[Gemini:${taskId}] model ${model} timed out`);
      } else {
        throw err;
      }
    } finally {
      if (timerId !== null) window.clearTimeout(timerId);
    }
  }

  if (!payload) {
    throw lastError ?? new Error("Gemini request failed");
  }

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate =
    candidates[0] && typeof candidates[0] === "object"
      ? (candidates[0] as Record<string, unknown>)
      : null;
  const content =
    firstCandidate && typeof firstCandidate.content === "object"
      ? (firstCandidate.content as Record<string, unknown>)
      : null;
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  const text = parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      return typeof part.text === "string" ? part.text : "";
    })
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return JSON.parse(extractJsonPayload(text)) as T;
  }
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizeComparableText(value: string): string {
  return value.toLowerCase().replace(/[\s"'`~!@#$%^&*()\-_=+\[\]{};:,.<>/?\\|]/g, "");
}

const TARGET_LABEL_ALIASES: Record<string, string> = {
  service: "서비스",
  users: "사용자",
  user: "사용자",
  "primary user": "주 사용자",
  role: "역할",
  description: "설명",
  name: "이름",
  title: "제목",
  summary: "요약",
  features: "기능",
  feature: "기능",
  screens: "화면",
  screen: "화면",
  "user flows": "사용자 흐름",
  "user flow": "사용자 흐름",
  steps: "단계",
  "key sections": "핵심 섹션",
  "key fields": "핵심 항목",
  "business logic": "동작 규칙",
  "target platform": "대상 플랫폼",
  "auth method": "로그인 방식",
  "problem statement": "문제 상황",
  "solution statement": "해결 방식",
  "mvp scope summary": "MVP 범위",
};

function localizeTargetPhrase(value: string): string {
  const normalized = value.replace(/\[(\d+)\]/g, " ").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return TARGET_LABEL_ALIASES[normalized] || value.replace(/\s+/g, " ").trim();
}

function deriveTargetContext(path: string): string {
  const tokens = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  const contextTokens = tokens
    .slice(0, -1)
    .filter((token) => /^\d+$/.test(token) === false)
    .slice(-2)
    .map((token) => localizeTargetPhrase(token))
    .filter(Boolean);

  return contextTokens.join(" > ");
}

function buildTargetLabelText(targets: InterviewTarget[]): string {
  const labels = uniqueStrings(targets.map((target) => localizeTargetPhrase(target.label)));
  return labels.join(", ");
}

function buildTargetContextText(targets: InterviewTarget[]): string {
  const contexts = uniqueStrings(
    targets.map((target) =>
      uniqueStrings(
        (target.parentContext || deriveTargetContext(target.path))
          .split(" > ")
          .map((segment) => localizeTargetPhrase(segment)),
      ).join(" > "),
    ),
  );
  return contexts[0] || "";
}

function buildQuestionHintText(question: string, targets: InterviewTarget[]): string {
  return normalizeComparableText(
    [
      question,
      ...targets.map((target) =>
        [
          target.path,
          target.label,
          target.parentContext,
          deriveTargetContext(target.path),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    ].join(" "),
  );
}

function matchesQuestionIntent(hintText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => hintText.includes(normalizeComparableText(keyword)));
}

function buildQuestionReasonFromTargets(targets: InterviewTarget[]): string {
  const labelText = buildTargetLabelText(targets) || "이 항목";

  if (targets.length > 1) {
    return `${labelText}처럼 서로 연결된 항목을 한 번에 채우기 위해 필요한 질문입니다.`;
  }

  return `${labelText} 내용을 정해야 이후 설계와 구현 계획을 더 정확하게 만들 수 있습니다.`;
}

function buildQuestionPlaceholderFromTargets(
  targets: InterviewTarget[],
  question = "",
): string {
  const contextText = buildTargetContextText(targets);
  const hintText = buildQuestionHintText(question, targets);

  if (matchesQuestionIntent(hintText, ["users", "user", "role", "persona", "description", "goals", "사용자", "역할"])) {
    return "예: 동네 가게 사장님은 상품 등록과 주문 확인을 자주 하고, 주민은 근처 가게를 둘러보다 필요한 상품을 주문하거나 예약해요.";
  }

  if (matchesQuestionIntent(hintText, ["service", "summary", "problem", "solution", "category", "target platform", "서비스", "요약"])) {
    return "예: 이 서비스는 동네 주민이 주변 가게를 쉽게 발견하고 주문이나 예약까지 이어갈 수 있게 돕는 지역 생활 마켓 앱이에요.";
  }

  if (matchesQuestionIntent(hintText, ["entity", "entities", "model", "data", "product", "store", "order", "reservation", "chat", "message", "데이터", "엔티티"])) {
    return "예: 가게, 상품, 주문, 예약, 채팅이 핵심 데이터이고 각 주문은 사용자, 가게, 상품 정보와 연결돼요.";
  }

  if (matchesQuestionIntent(hintText, ["feature", "features", "actions", "mvp", "기능", "행동"])) {
    return "예: 사용자는 홈에서 가게를 찾고, 상세에서 상품을 본 뒤 채팅 문의, 예약, 주문까지 한 번에 할 수 있어요.";
  }

  if (matchesQuestionIntent(hintText, ["screen", "screens", "section", "layout", "home", "detail", "화면", "섹션"])) {
    return "예: 홈에는 검색창과 카테고리, 추천 가게가 먼저 보이고 상세 화면에서는 대표 상품, 운영 정보, 주문 버튼이 바로 보여야 해요.";
  }

  if (matchesQuestionIntent(hintText, ["flow", "flows", "steps", "success condition", "journey", "흐름", "단계"])) {
    return "예: 앱을 켜면 주변 가게를 둘러보고, 원하는 가게 상세로 들어가 상품 확인 후 채팅이나 주문으로 자연스럽게 이어지면 돼요.";
  }

  if (matchesQuestionIntent(hintText, ["permission", "permissions", "role", "admin", "approval", "moderation", "권한", "관리"])) {
    return "예: 판매자는 가게 정보와 상품, 주문을 관리하고 소비자는 조회, 주문, 채팅만 할 수 있으며 운영자는 입점 승인과 신고 처리를 맡아요.";
  }

  if (matchesQuestionIntent(hintText, ["integration", "integrations", "login", "auth", "payment", "map", "external", "연동", "결제", "지도", "로그인"])) {
    return "예: 카카오 로그인, 지도 API, 결제 API를 붙여 가입부터 위치 탐색, 주문 결제까지 자연스럽게 연결해요.";
  }

  if (matchesQuestionIntent(hintText, ["monetization", "pricing", "point", "advert", "revenue", "수익", "광고", "포인트"])) {
    return "예: 주문 결제 수수료와 광고 상품이 주요 수익원이고, 결제 시 포인트를 적립해 재방문을 유도해요.";
  }

  if (matchesQuestionIntent(hintText, ["notification", "notifications", "alert", "channel", "알림"])) {
    return "예: 주문 접수, 예약 변경, 채팅 답변이 오면 앱 푸시와 문자로 바로 알려줘야 해요.";
  }

  if (matchesQuestionIntent(hintText, ["privacy", "compliance", "policy", "personal data", "보안", "개인정보", "정책"])) {
    return "예: 주문과 결제에 필요한 이름, 연락처, 주소만 수집하고 사업자 정보와 정산 내역은 운영 정책에 맞게 보관해요.";
  }

  if (matchesQuestionIntent(hintText, ["rule", "validation", "exception", "failure", "empty state", "규칙", "예외"])) {
    return "예: 재고가 없거나 예약 시간이 지난 경우에는 바로 안내하고, 결제 실패 시에는 다시 시도하거나 다른 수단을 선택하게 해야 해요.";
  }

  if (matchesQuestionIntent(hintText, ["style", "constraint", "brand", "tone", "분위기", "스타일"])) {
    return "예: 동네 사람들과의 정이 느껴지는 따뜻한 분위기지만, 상품과 주문 정보는 한눈에 읽히게 깔끔해야 해요.";
  }

  if (contextText) {
    return `예: ${contextText}에서는 사용자가 먼저 봐야 하는 정보가 분명하고, 바로 다음 행동으로 자연스럽게 이어지면 좋겠어요.`;
  }

  return "예: 사용자가 처음 들어왔을 때 핵심 정보를 바로 이해하고, 원하는 행동까지 막힘 없이 이어갈 수 있으면 좋겠어요.";
}

function isWeakQuestionPlaceholder(question: string, placeholder: string): boolean {
  const normalizedQuestion = normalizeComparableText(question);
  const normalizedPlaceholder = normalizeComparableText(placeholder);
  const trimmedPlaceholder = placeholder.replace(/^예:\s*/u, "").trim();

  if (!trimmedPlaceholder) {
    return true;
  }

  if (
    normalizedQuestion === normalizedPlaceholder ||
    normalizedPlaceholder.includes(normalizedQuestion) ||
    trimmedPlaceholder.endsWith("?")
  ) {
    return true;
  }

  const weakPatterns = [
    /적어주세요/u,
    /입력해/u,
    /입력해\s*주세요/u,
    /알려주세요/u,
    /작성해/u,
    /작성해\s*주세요/u,
    /써주세요/u,
    /기입해/u,
    /채워/u,
    /json/u,
    /path/u,
    /status/u,
  ];

  if (weakPatterns.some((pattern) => pattern.test(trimmedPlaceholder))) {
    return true;
  }

  if (/[A-Za-z0-9_]+\[[0-9]+\]|[A-Za-z0-9_]+\.[A-Za-z0-9_]+/u.test(trimmedPlaceholder)) {
    return true;
  }

  const looksLikeExample = /(해요|돼요|좋겠어요|입니다|있어요|보여야 해요|연결돼요|할 수 있어요|필요해요|맡아요)[.!]?$/u.test(trimmedPlaceholder);
  if (!looksLikeExample && trimmedPlaceholder.length < 20) {
    return true;
  }

  return false;
}

function sanitizeQuestionPlaceholder(
  question: string,
  placeholder: string,
  targets: InterviewTarget[],
): string {
  if (isWeakQuestionPlaceholder(question, placeholder)) {
    return buildQuestionPlaceholderFromTargets(targets, question);
  }

  return placeholder.startsWith("예:") ? placeholder : `예: ${placeholder}`;
}

function filterTargetFields(
  value: unknown,
  availableTargets: InterviewTarget[],
): string[] {
  const availablePathSet = new Set(availableTargets.map((target) => target.path));

  return uniqueStrings(normalizeStringArray(value)).filter((path) => availablePathSet.has(path));
}

function buildFallbackHomeStyleSet(input: {
  stylePrompt: string;
  implementationPlan: ImplementationPlan;
}): GeneratedHomeStyleSet {
  const projectName = input.implementationPlan.project_name || "서비스";
  const featureNames = input.implementationPlan.frontend_units
    .flatMap((unit) => unit.related_screens)
    .filter(Boolean)
    .slice(0, 3);
  const prompt = input.stylePrompt.trim() || "깔끔하고 신뢰감 있는";

  const buildOption = (
    slot: HomeStyleSlot,
    name: string,
    styleSummary: string,
    structureSummary: string,
  ): HomeStyleOption => ({
    id: `home-style-${slot}`,
    slot,
    name,
    style_summary: styleSummary,
    structure_summary: structureSummary,
    hero_title: `${projectName}의 핵심 가치를 첫 화면에서 바로 보여주는 홈`,
    hero_subtitle: `${prompt} 방향을 반영해 첫 진입에서 서비스 가치와 핵심 동선을 바로 이해하게 합니다.`,
    primary_cta: "지금 시작하기",
    nav_items: ["서비스 소개", ...(featureNames.length > 0 ? featureNames : ["핵심 기능", "이용 흐름"]), "문의"],
    feature_cards: [
      {
        title: "첫 시선 영역",
        description: "핵심 가치, 한 줄 설명, CTA를 가장 먼저 배치합니다.",
      },
      {
        title: "핵심 기능 영역",
        description: "사용자가 홈에서 바로 이해해야 하는 주요 기능을 카드로 정리합니다.",
      },
      {
        title: "신뢰 요소 영역",
        description: "운영 방식, 후기, 지표, 안내 문구처럼 신뢰를 높이는 요소를 둡니다.",
      },
    ],
    style_keywords: [prompt, slot === "left" ? "빠른 스캔" : slot === "center" ? "브랜드 몰입" : "정보 우선"],
    layout_notes: [
      "홈 화면의 style과 구조에 집중한 설계",
      slot === "left"
        ? "왼쪽 정렬 기반으로 텍스트와 CTA를 빠르게 훑게 하는 구조"
        : slot === "center"
          ? "중앙 정렬 기반으로 브랜드 인상과 메인 메시지를 강조하는 구조"
          : "오른쪽 보조 패널을 둔 느낌으로 정보 카드와 비교 요소를 강조하는 구조",
    ],
  });

  return {
    focus_note: "홈 화면의 style, 구조, 정보 배치만 먼저 설계합니다. 실제 웹/앱 구현은 다음 단계에서 진행합니다.",
    options: [
      buildOption("left", "Left Focus", "메시지와 CTA를 빠르게 읽히는 좌정렬형 홈", "히어로 -> 핵심 기능 카드 -> 신뢰 섹션 순서"),
      buildOption("center", "Center Story", "브랜드 메시지와 인상을 중심에 두는 중앙 집중형 홈", "히어로 -> 주요 가치 -> 기능 소개 순서"),
      buildOption("right", "Right Panel", "정보 카드와 비교 포인트를 함께 보여주는 우측 강조형 홈", "히어로 + 요약 패널 -> 기능 -> 운영/신뢰 섹션 순서"),
    ],
  };
}

function normalizeHomeStyleOption(
  option: unknown,
  fallback: HomeStyleOption,
  slot: HomeStyleSlot,
): HomeStyleOption {
  if (!option || typeof option !== "object") {
    return { ...fallback, slot };
  }

  const record = option as Record<string, unknown>;

  const featureCards = Array.isArray(record.feature_cards)
    ? record.feature_cards
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const card = item as Record<string, unknown>;
          return {
            title: coerceString(card.title),
            description: coerceString(card.description),
          };
        })
        .filter((item): item is { title: string; description: string } => {
          return Boolean(item?.title && item.description);
        })
    : [];

  return {
    id: coerceString(record.id, fallback.id),
    slot,
    name: coerceString(record.name, fallback.name),
    style_summary: coerceString(record.style_summary, fallback.style_summary),
    structure_summary: coerceString(record.structure_summary, fallback.structure_summary),
    hero_title: coerceString(record.hero_title, fallback.hero_title),
    hero_subtitle: coerceString(record.hero_subtitle, fallback.hero_subtitle),
    primary_cta: coerceString(record.primary_cta, fallback.primary_cta),
    nav_items: normalizeStringArray(record.nav_items).slice(0, 5),
    feature_cards: featureCards.length > 0 ? featureCards.slice(0, 3) : fallback.feature_cards,
    style_keywords: normalizeStringArray(record.style_keywords).slice(0, 4),
    layout_notes: normalizeStringArray(record.layout_notes).slice(0, 4),
  };
}

function normalizeHomeStyleSet(
  payload: unknown,
  fallback: GeneratedHomeStyleSet,
): GeneratedHomeStyleSet {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const rawOptions = Array.isArray(record.options) ? record.options : [];
  const slotOrder: HomeStyleSlot[] = ["left", "center", "right"];

  const options = slotOrder.map((slot, index) =>
    normalizeHomeStyleOption(rawOptions[index], fallback.options[index], slot),
  );

  return {
    focus_note: coerceString(record.focus_note, fallback.focus_note),
    options,
  };
}

function getInterviewBatchGroupKey(target: InterviewTarget): string {
  const topLevel = target.path.split(/[.[\]]/).filter(Boolean)[0] || target.path;

  if (["features", "screens", "user_flows"].includes(topLevel)) {
    return "journey";
  }
  if (["users", "permissions", "admin"].includes(topLevel)) {
    return "roles-ops";
  }
  if (["core_entities", "integrations", "domain_rules", "exception_handling", "notifications"].includes(topLevel)) {
    return "data-rules";
  }
  if (["monetization", "data_privacy", "constraints", "performance", "analytics", "content_policy", "tech_preferences"].includes(topLevel)) {
    return "business-policy";
  }

  return topLevel;
}

function buildGroupedFallbackQuestion(
  groupKey: string,
  group: InterviewTarget[],
  index: number,
): GeneratedInterviewQuestion {
  const targetFields = group.map((target) => target.path).slice(0, 6);
  const labels = buildTargetLabelText(group.slice(0, 6));
  const context = buildTargetContextText(group);

  if (groupKey === "journey") {
    const question = "사용자가 홈에서 탐색하고 상세를 본 뒤 주문, 예약, 문의까지 이어지는 흐름을 화면 순서대로 설명해주세요.";
    return {
      id: `fallback-batch-${index + 1}`,
      question,
      reason: "기능, 화면, 주요 흐름을 한 번에 묶어야 실제 앱 구조와 화면 분리가 정확해집니다.",
      placeholder: "예: 홈에서는 검색과 카테고리, 추천 가게가 먼저 보이고, 상세에서는 상품과 운영 정보, 주문/채팅 버튼이 보여야 해요. 이후 주문/예약 화면에서는 옵션 선택, 결제, 완료 확인이 이어져야 해요.",
      targetFields,
    };
  }

  if (groupKey === "roles-ops") {
    const question = "소비자, 판매자, 운영자가 각각 어떤 화면을 보고 무엇을 할 수 있어야 하는지 역할별로 나눠서 알려주세요.";
    return {
      id: `fallback-batch-${index + 1}`,
      question,
      reason: "역할과 권한, 운영 범위를 같이 정해야 화면 분리와 접근 제어를 한 번에 설계할 수 있습니다.",
      placeholder: "예: 소비자는 가게 탐색과 주문, 채팅을 하고 판매자는 가게 정보와 상품, 주문 상태를 관리해요. 운영자는 입점 검수와 신고 처리, 운영 지표 확인을 맡아요.",
      targetFields,
    };
  }

  if (groupKey === "data-rules") {
    const question = "가게, 상품, 주문, 예약처럼 핵심 데이터에 무엇을 저장해야 하고 상태가 어떻게 바뀌는지 한 번에 설명해주세요.";
    return {
      id: `fallback-batch-${index + 1}`,
      question,
      reason: "데이터 구조, 연동 데이터, 상태 규칙을 같이 정해야 이후 API와 DB 설계가 빨라집니다.",
      placeholder: "예: 가게에는 이름, 카테고리, 위치, 운영시간이 필요하고 주문은 주문번호, 상태, 결제금액, 수령방식이 있어야 해요. 주문 상태는 생성, 확인, 결제, 완료/취소로 바뀌어요.",
      targetFields,
    };
  }

  if (groupKey === "business-policy") {
    const question = "결제, 알림, 포인트, 개인정보, 운영 정책이 어떤 기준으로 동작해야 하는지 한 번에 정리해주세요.";
    return {
      id: `fallback-batch-${index + 1}`,
      question,
      reason: "비즈니스 규칙과 정책을 한 번에 정해야 수익 구조와 예외 처리, 개인정보 설계가 같이 맞춰집니다.",
      placeholder: "예: 주문 결제 시 포인트를 적립하고, 주문 상태 변경이나 채팅 답변이 오면 푸시와 문자로 알려줘야 해요. 개인정보는 주문과 예약에 필요한 정보만 저장하고 운영 정책에 따라 보관 기간을 정해야 해요.",
      targetFields,
    };
  }

  const questionPrefix = context ? `${context}에서` : "";
  const question = `${questionPrefix} ${labels || "서로 관련된 항목"} 내용을 한 번에 알려주세요.`.trim();

  return {
    id: `fallback-batch-${index + 1}`,
    question,
    reason: buildQuestionReasonFromTargets(group),
    placeholder: buildQuestionPlaceholderFromTargets(group, question),
    targetFields,
  };
}

function expandTargetFieldsForBatch(
  targetFields: string[],
  availableTargets: InterviewTarget[],
): string[] {
  if (targetFields.length >= 4) {
    return targetFields;
  }

  const selectedTargets = availableTargets.filter((target) => targetFields.includes(target.path));
  const primaryTarget = selectedTargets[0];
  if (!primaryTarget) {
    return targetFields;
  }

  const batchKey = getInterviewBatchGroupKey(primaryTarget);
  const expanded = availableTargets
    .filter((target) => getInterviewBatchGroupKey(target) === batchKey)
    .map((target) => target.path)
    .slice(0, 6);

  return uniqueStrings(expanded.length > targetFields.length ? expanded : targetFields);
}

function createFallbackQuestion(targets: InterviewTarget[]): GeneratedInterviewQuestion | null {
  const firstTarget = targets[0];
  if (!firstTarget) {
    return null;
  }

  const contextText = buildTargetContextText([firstTarget]);
  const labelText = buildTargetLabelText([firstTarget]) || firstTarget.label;
  const questionPrefix = contextText ? `${contextText}에서` : "";

  return {
    id: crypto.randomUUID(),
    question: `${questionPrefix} ${labelText} 내용을 조금 더 알려주세요.`.trim(),
    reason: buildQuestionReasonFromTargets([firstTarget]),
    placeholder: buildQuestionPlaceholderFromTargets([firstTarget], `${questionPrefix} ${labelText} 내용을 조금 더 알려주세요.`.trim()),
    targetFields: [firstTarget.path],
  };
}

function createFallbackQuestions(
  targets: InterviewTarget[],
  maxQuestions = 10,
): GeneratedInterviewQuestion[] {
  const groupedTargets = new Map<string, InterviewTarget[]>();

  targets.forEach((target) => {
    const groupKey = getInterviewBatchGroupKey(target);
    const existing = groupedTargets.get(groupKey) || [];
    existing.push(target);
    groupedTargets.set(groupKey, existing);
  });

  return [...groupedTargets.values()]
    .slice(0, maxQuestions)
    .map((group, index) => buildGroupedFallbackQuestion(getInterviewBatchGroupKey(group[0]), group, index));
}

function normalizeQuestionPayload(
  payload: unknown,
  targets: InterviewTarget[],
): GeneratedInterviewQuestion | null {
  if (!payload || typeof payload !== "object") {
    return createFallbackQuestion(targets);
  }

  const record = payload as Record<string, unknown>;
  const question = coerceString(record.question);
  const targetFields = expandTargetFieldsForBatch(
    filterTargetFields(record.targetFields, targets),
    targets,
  );
  const selectedTargets =
    targetFields.length > 0 ? targets.filter((target) => targetFields.includes(target.path)) : targets;
  const placeholder = sanitizeQuestionPlaceholder(
    question,
    coerceString(record.placeholder),
    selectedTargets,
  );

  if (!question || targetFields.length === 0) {
    return createFallbackQuestion(targets);
  }

  return {
    id: coerceString(record.id, crypto.randomUUID()),
    question,
    reason: coerceString(
      record.reason,
      buildQuestionReasonFromTargets(selectedTargets),
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

  const rawQuestions = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).questions)
      ? (payload as Record<string, unknown>).questions
      : payload
        ? [payload]
        : [];

  const seenSignatures = new Set<string>();
  const questions = rawQuestions
    .map((item) => normalizeQuestionPayload(item, targets))
    .filter((item): item is GeneratedInterviewQuestion => item !== null)
    .filter((item) => {
      const signature = [
        normalizeComparableText(item.question),
        [...item.targetFields].sort().join("|"),
      ].join("::");

      if (seenSignatures.has(signature)) {
        return false;
      }

      seenSignatures.add(signature);
      return true;
    })
    .slice(0, maxQuestions);

  return questions.length > 0 ? questions : fallbackQuestions;
}

function normalizeUpdatePayload(payload: unknown): InterviewFieldUpdate[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
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
      } satisfies InterviewFieldUpdate;
    })
    .filter((item): item is InterviewFieldUpdate => item !== null);
}

function normalizeDesignDocument(
  payload: unknown,
  fallback: DesignDocument,
): DesignDocument {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;

  const targetUsers = Array.isArray(record.target_users)
    ? record.target_users
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const user = item as Record<string, unknown>;
          return {
            persona: coerceString(user.persona, "핵심 사용자"),
            description: coerceString(user.description, "사용자 설명이 필요합니다."),
            needs: normalizeStringArray(user.needs),
          };
        })
        .filter(Boolean)
    : [];

  const coreFeatures = Array.isArray(record.core_features)
    ? record.core_features
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const feature = item as Record<string, unknown>;
          return {
            name: coerceString(feature.name, "핵심 기능"),
            description: coerceString(feature.description, "기능 설명이 필요합니다."),
            priority:
              feature.priority === "high" || feature.priority === "low" ? feature.priority : "medium",
            related_paths: normalizeStringArray(feature.related_paths),
          };
        })
        .filter(Boolean)
    : [];

  const dataEntities = Array.isArray(record.data_entities)
    ? record.data_entities
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const entity = item as Record<string, unknown>;
          return {
            name: coerceString(entity.name, "주요 엔티티"),
            description: coerceString(entity.description, "데이터 설명이 필요합니다."),
            fields: normalizeStringArray(entity.fields),
            notes: coerceString(entity.notes),
          };
        })
        .filter(Boolean)
    : [];

  const userFlows = Array.isArray(record.user_flows)
    ? record.user_flows
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const flow = item as Record<string, unknown>;
          const steps = Array.isArray(flow.steps)
            ? flow.steps
                .map((stepItem, index) => {
                  if (!stepItem || typeof stepItem !== "object") {
                    return null;
                  }
                  const step = stepItem as Record<string, unknown>;
                  return {
                    step:
                      typeof step.step === "number" && Number.isFinite(step.step) ? step.step : index + 1,
                    action: coerceString(step.action, "행동 정의 필요"),
                    screen: coerceString(step.screen, "화면 정의 필요"),
                    note: coerceString(step.note),
                  };
                })
                .filter(Boolean)
            : [];

          return {
            name: coerceString(flow.name, "핵심 흐름"),
            description: coerceString(flow.description, "흐름 설명이 필요합니다."),
            steps: steps.length > 0 ? steps : fallback.user_flows[0].steps,
          };
        })
        .filter(Boolean)
    : [];

  const screens = Array.isArray(record.screens)
    ? record.screens
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const screen = item as Record<string, unknown>;
          return {
            name: coerceString(screen.name, "주요 화면"),
            type: coerceString(screen.type, "screen"),
            description: coerceString(screen.description, "화면 설명이 필요합니다."),
            key_elements: normalizeStringArray(screen.key_elements),
            interactions: normalizeStringArray(screen.interactions),
          };
        })
        .filter(Boolean)
    : [];

  const openQuestions = Array.isArray(record.open_questions)
    ? record.open_questions
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const question = item as Record<string, unknown>;
          return {
            topic: coerceString(question.topic, "추가 확인 필요"),
            detail: coerceString(question.detail, "추가 확인 사항 설명이 필요합니다."),
            impact: coerceString(question.impact, "영향 설명이 필요합니다."),
          };
        })
        .filter(Boolean)
    : [];

  return {
    service_name: coerceString(record.service_name, fallback.service_name),
    service_summary: coerceString(record.service_summary, fallback.service_summary),
    core_value: coerceString(record.core_value, fallback.core_value),
    target_users: targetUsers.length > 0 ? targetUsers : fallback.target_users,
    core_features: coreFeatures.length > 0 ? coreFeatures : fallback.core_features,
    data_entities: dataEntities.length > 0 ? dataEntities : fallback.data_entities,
    user_flows: userFlows.length > 0 ? userFlows : fallback.user_flows,
    screens: screens.length > 0 ? screens : fallback.screens,
    open_questions: openQuestions.length > 0 ? openQuestions : fallback.open_questions,
  };
}

function normalizeImplementationPlan(
  payload: unknown,
  fallback: ImplementationPlan,
): ImplementationPlan {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;

  const mvpPriorities = Array.isArray(record.mvp_priorities)
    ? record.mvp_priorities
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const priority = item as Record<string, unknown>;
          return {
            title: coerceString(priority.title, "우선 과제"),
            description: coerceString(priority.description, "우선 구현 설명이 필요합니다."),
            priority:
              priority.priority === "high" || priority.priority === "low"
                ? priority.priority
                : "medium",
          };
        })
        .filter(Boolean)
    : [];

  const frontendUnits = Array.isArray(record.frontend_units)
    ? record.frontend_units
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const unit = item as Record<string, unknown>;
          return {
            title: coerceString(unit.title, "프론트엔드 단위"),
            description: coerceString(unit.description, "프론트엔드 설명이 필요합니다."),
            deliverables: normalizeStringArray(unit.deliverables),
            related_screens: normalizeStringArray(unit.related_screens),
          };
        })
        .filter(Boolean)
    : [];

  const backendUnits = Array.isArray(record.backend_api_units)
    ? record.backend_api_units
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const unit = item as Record<string, unknown>;
          return {
            title: coerceString(unit.title, "백엔드/API 단위"),
            description: coerceString(unit.description, "백엔드 설명이 필요합니다."),
            endpoints: normalizeStringArray(unit.endpoints),
            dependencies: normalizeStringArray(unit.dependencies),
          };
        })
        .filter(Boolean)
    : [];

  const dataRequirements = Array.isArray(record.data_requirements)
    ? record.data_requirements
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const requirement = item as Record<string, unknown>;
          return {
            entity: coerceString(requirement.entity, "주요 엔티티"),
            description: coerceString(requirement.description, "데이터 설명이 필요합니다."),
            fields: normalizeStringArray(requirement.fields),
            storage: coerceString(requirement.storage, "DB"),
          };
        })
        .filter(Boolean)
    : [];

  const authRequirements = Array.isArray(record.auth_requirements)
    ? record.auth_requirements
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const requirement = item as Record<string, unknown>;
          return {
            area: coerceString(requirement.area, "인증/권한"),
            required: requirement.required === true,
            description: coerceString(requirement.description, "인증 설명이 필요합니다."),
            roles: normalizeStringArray(requirement.roles),
          };
        })
        .filter(Boolean)
    : [];

  const deploymentChecklist = Array.isArray(record.deployment_checklist)
    ? record.deployment_checklist
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const checklist = item as Record<string, unknown>;
          return {
            title: coerceString(checklist.title, "배포 체크"),
            detail: coerceString(checklist.detail, "체크 설명이 필요합니다."),
          };
        })
        .filter(Boolean)
    : [];

  const expansionPoints = Array.isArray(record.expansion_points)
    ? record.expansion_points
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const point = item as Record<string, unknown>;
          return {
            title: coerceString(point.title, "확장 포인트"),
            description: coerceString(point.description, "확장 설명이 필요합니다."),
            next_step: coerceString(point.next_step, "다음 단계 정의가 필요합니다."),
          };
        })
        .filter(Boolean)
    : [];

  return {
    project_name: coerceString(record.project_name, fallback.project_name),
    summary: coerceString(record.summary, fallback.summary),
    mvp_priorities: mvpPriorities.length > 0 ? mvpPriorities : fallback.mvp_priorities,
    frontend_units: frontendUnits.length > 0 ? frontendUnits : fallback.frontend_units,
    backend_api_units: backendUnits.length > 0 ? backendUnits : fallback.backend_api_units,
    data_requirements: dataRequirements.length > 0 ? dataRequirements : fallback.data_requirements,
    auth_requirements: authRequirements.length > 0 ? authRequirements : fallback.auth_requirements,
    deployment_checklist:
      deploymentChecklist.length > 0 ? deploymentChecklist : fallback.deployment_checklist,
    expansion_points: expansionPoints.length > 0 ? expansionPoints : fallback.expansion_points,
  };
}

export async function generateInitialBriefingDirect(input: {
  responses: FirstInterviewResponse[];
}): Promise<Record<string, unknown>> {
  const fallback = buildFallbackInitialBriefing(input.responses);
  const readiness = buildImplementationReadinessReport(fallback);

  const systemPrompt = [
    "You are a product architect who turns a first interview into an implementation-grade product briefing JSON.",
    "Output JSON only.",
    "Use the provided schema exactly.",
    "Every leaf field outside meta and second_interview_topics must be a { value, status } object.",
    'Allowed status values are "null", "expected", and "fulled" only.',
    'Use "fulled" only when the value is directly supported by the user response.',
    'Use "expected" when the value is a reasonable inference or something that AI should refine in the second interview.',
    'Use "null" when the field is essential for implementation but still unknown.',
    "Do not under-create null or expected fields.",
    "The initial JSON must be richly structured enough that, once the remaining null/expected fields are filled, a real app/web product can be implemented from it.",
    "Prefer keeping implementation-critical detail as expected/null rather than over-confidently marking it fulled.",
    "In particular, screens, flows, entity fields, permissions, integrations, notifications, validation rules, and exception handling should remain sufficiently structured for follow-up refinement.",
    "Split product structure aggressively enough for real implementation: separate browsing, detail, transaction, communication, my-page, seller, and admin surfaces when the interview implies them.",
    "Infer the likely required app/web structure from the answers: user roles, core entities, mvp features, screens, flows, permissions, admin operations, monetization, privacy, constraints, and technical preferences.",
    "If all remaining null or expected fields were later filled, the JSON should be sufficient to implement the product.",
    "Keep user-facing product content and second interview topics in Korean.",
    "너는 1차 인터뷰 답변을 구조화된 웹/앱 요구사항 JSON 초안으로 바꾸는 AI 제품 기획자다.",
    "출력은 반드시 JSON만 사용한다.",
    "meta를 제외한 모든 leaf field는 반드시 { value, status } 형태여야 한다.",
    'status는 "null", "expected", "fulled" 중 하나만 사용한다.',
    "fulled는 사용자가 이미 직접 답한 내용이라 바로 저장 가능한 항목이다.",
    "expected는 추가 질문으로 보강하면 좋은 항목이며, 부분적으로 아는 내용이 있으면 value에 남겨도 된다.",
    "null은 아직 핵심 정보가 부족해 비워두어야 하는 항목이다.",
    "null과 expected를 너무 적게 만들면 안 된다.",
    "1차 인터뷰 결과 JSON만 봐도 앱/웹을 구현할 때 필요한 구조가 충분히 드러나도록, 엔티티/화면/플로우/권한/연동/예외 처리 구조를 촘촘하게 잡아라.",
    "기능과 화면은 너무 크게 뭉개지 말고, 탐색/목록, 상세, 주문/예약/결제, 채팅/문의, 알림, 마이, 판매자, 운영 화면처럼 실제 구현 단위로 분리해라.",
    "직접 들은 사실은 fulled로 넣되, 구현 세부 구조는 값이 조금 있더라도 expected로 남겨 2차 인터뷰가 구체화할 수 있게 하라.",
    "사용자가 말하지 않은 내용을 함부로 확정하지 않는다.",
    "모든 status field가 채워지면 바로 설계와 구현 계획 생성에 쓸 수 있는 구조화된 웹/앱 JSON이 되도록 작성한다.",
    "반드시 아래 템플릿과 같은 키 구조를 유지한다.",
  ].join("\n");

  const userPrompt = [
    "First interview questions and answers:",
    JSON.stringify(input.responses, null, 2),
    "",
    "Required top-level branches:",
    JSON.stringify(INITIAL_BRIEFING_REQUIRED_BRANCHES, null, 2),
    "",
    "Implementation-critical paths that must exist structurally:",
    JSON.stringify(INITIAL_BRIEFING_CRITICAL_PATHS, null, 2),
    "",
    "Current fallback schema template:",
    JSON.stringify(fallback, null, 2),
    "",
    "Readiness baseline:",
    JSON.stringify(readiness, null, 2),
    "",
    "Return the final JSON only.",
    "",
    "1차 인터뷰 질문/답변:",
    JSON.stringify(input.responses, null, 2),
    "",
    "출력 템플릿:",
    JSON.stringify(fallback, null, 2),
    "",
    "답변을 반영해서 status와 value를 다시 정리한 최종 JSON만 반환해라.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "initialBriefing",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    return normalizeInitialBriefing(response, fallback);
  } catch {
    return fallback;
  }
}

export async function generateInterviewQuestionDirect(input: {
  briefingJson: Record<string, unknown>;
  unresolvedTargets: InterviewTarget[];
  interviewHistory: InterviewHistoryEntry[];
  filledSummary: Array<{ path: string; value: string }>;
}): Promise<GeneratedInterviewQuestion | null> {
  const questions = await generateInterviewQuestionBatchDirect({
    ...input,
    maxQuestions: 1,
  });

  return questions[0] || null;
}

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
    "너는 업로드된 요구사항 JSON을 바탕으로 추가 인터뷰 질문 묶음을 만드는 AI 인터뷰어다.",
    "반드시 쉬운 한국어를 사용한다.",
    "질문은 최대 10개까지만 만든다.",
    "가능하면 하나의 질문으로 여러 관련 빈칸을 함께 채우도록 묶는다.",
    "가능하면 한 질문이 4개에서 8개 정도의 related field를 함께 채우게 설계한다.",
    "질문 수는 가능하면 3개에서 5개 사이로 압축하고, 꼭 필요할 때만 더 늘린다.",
    "질문 수는 최소화하고, 너무 세부적인 질문으로 쪼개지 않는다.",
    "각 질문의 targetFields에는 이번 질문으로 같이 채우려는 경로를 여러 개 넣어도 된다.",
    "placeholder는 사용자가 한 번에 여러 항목을 답할 수 있게 예시처럼 쓴다.",
    "placeholder는 입력 요청문이 아니라 실제로 사용자가 이렇게 답하면 된다는 완성형 예시 답변 1~2문장이어야 한다.",
    'question과 placeholder는 절대 같은 문장으로 쓰지 않는다.',
    'question은 실제 질문 문장으로, placeholder는 반드시 "예: ..."로 시작하는 입력 예시/형식 안내로 작성한다.',
    'placeholder에 "~을 적어주세요", "~을 알려주세요", 필드명 나열 같은 안내문을 쓰지 않는다.',
    "question이나 placeholder에 JSON path, status, 필드 키 이름을 그대로 노출하지 않는다.",
    "targetFields에는 unresolvedTargets에 포함된 path만 넣는다.",
    "이미 fulled인 값은 다시 묻지 않는다.",
    '반드시 JSON만 반환하고 형식은 {"questions":[...]} 이어야 한다.',
  ].join("\n");

  const unresolvedSummary = input.unresolvedTargets.map((target) => ({
    path: target.path,
    label: target.label,
    context: target.parentContext || deriveTargetContext(target.path),
    status: target.status,
    currentValue: typeof target.currentValue === "undefined" ? null : target.currentValue,
  }));

  const userPrompt = [
    "현재 구조화 JSON:",
    JSON.stringify(input.briefingJson, null, 2),
    "",
    "아직 채워야 하는 후보:",
    JSON.stringify(unresolvedSummary, null, 2),
    "",
    "이미 채워진 fulled 요약:",
    JSON.stringify(input.filledSummary, null, 2),
    "",
    "이전 QA 히스토리:",
    JSON.stringify(input.interviewHistory, null, 2),
    "",
    `최대 ${maxQuestions}개의 질문만 반환해라.`,
    '좋은 예시: {"questions":[{"id":"q-1","question":"주요 사용자는 누구이고 언제 이 서비스를 가장 많이 쓰나요?","reason":"사용자와 사용 상황이 정리돼야 홈과 주요 흐름을 정확히 설계할 수 있습니다.","placeholder":"예: 매장 사장님과 직원이 점심 피크 시간대에 예약 확인과 변경을 가장 자주 처리해요.","targetFields":["users[0].role","users[0].description","user_flows[0].steps"]}]}',
    '다음 형식으로만 답해라: {"questions":[{"id":"...","question":"...","reason":"...","placeholder":"...","targetFields":["...","..."]}]}',
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "secondaryInterviewQuestion",
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    return normalizeQuestionBatchPayload(response, input.unresolvedTargets, maxQuestions);
  } catch {
    return fallbackQuestions;
  }
}

export async function applyInterviewAnswerDirect(input: {
  briefingJson: Record<string, unknown>;
  question: GeneratedInterviewQuestion;
  answer: string;
}): Promise<InterviewFieldUpdate[]> {
  return applyInterviewAnswersBatchDirect({
    briefingJson: input.briefingJson,
    questions: [input.question],
    answersByQuestionId: { [input.question.id]: input.answer },
  });
}

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
    .map((question) => {
      const firstTarget = question.targetFields[0];
      if (!firstTarget) {
        return null;
      }

      return {
        path: firstTarget,
        value: question.answer,
        confidence: 0.35,
        note: "AI 응답이 없어 첫 번째 대상 필드에 원문 답변을 반영했습니다.",
      } satisfies InterviewFieldUpdate;
    })
    .filter((item): item is InterviewFieldUpdate => item !== null);

  if (answeredQuestions.length === 0) {
    return [];
  }

  const systemPrompt = [
    "너는 여러 개의 인터뷰 답변을 구조화 JSON 필드 업데이트로 바꾸는 AI다.",
    "전체 JSON을 다시 만들지 말고 updates 배열만 반환한다.",
    "기존 status가 fulled인 값은 절대 수정하거나 덮어쓰지 않는다.",
    "각 질문의 targetFields와 직접 관련된 경로만 업데이트한다.",
    "한 질문의 답으로 여러 필드를 같이 채울 수 있으면 그렇게 한다.",
    '반드시 JSON만 반환하고 형식은 {"updates":[...]} 이어야 한다.',
  ].join("\n");

  const userPrompt = [
    "현재 JSON:",
    JSON.stringify(input.briefingJson, null, 2),
    "",
    "질문과 답변 묶음:",
    JSON.stringify(answeredQuestions, null, 2),
    "",
    '다음 형식으로만 답해라: {"updates":[{"path":"...","value":"...","confidence":0.0,"note":"..."}]}',
  ].join("\n");

  try {
    const response = await requestGeminiJson<{ updates?: unknown }>({
      taskId: "secondaryInterviewFill",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    const updates = normalizeUpdatePayload(response.updates);
    return updates.length > 0 ? updates : fallbackUpdates;
  } catch {
    return fallbackUpdates;
  }
}

export async function generateDesignDocumentDirect(
  briefingJson: Record<string, unknown>,
): Promise<DesignDocument> {
  const fallback = buildFallbackDesignDocument(briefingJson);

  const systemPrompt = [
    "너는 업로드된 요구사항 명세(JSON 또는 Markdown)를 분석해 서비스 설계 결과를 만드는 AI 제품 설계자다.",
    "반드시 사람이 읽기 쉬운 한국어로 작성한다.",
    "출력은 구조화 JSON만 허용한다.",
    "",
    "Markdown 명세가 제공된 경우 다음 섹션을 적극 활용한다:",
    "  - '서비스 개요' → service_name, service_summary, core_value, target_users",
    "  - '홈화면 레이아웃 구조' + '섹션별 상세 명세' → screens (홈 화면 key_elements 상세화)",
    "  - '주요 인터랙션 & CTA' → screens의 interactions, user_flows의 steps",
    "  - '디자인 톤 & 스타일 가이드' → 설계 메모 및 open_questions에 반영",
    "  - '컴포넌트 목록' → screens의 key_elements에 반영",
    "",
    "핵심 사용자, 핵심 기능, 데이터 엔티티, 주요 화면/흐름, 확인 필요 항목을 반드시 포함한다.",
    "설계 결과가 너무 축약되면 안 된다.",
    "가능한 경우 핵심 기능은 6개 이상, 주요 화면은 6개 이상, 주요 흐름은 3개 이상으로 분리해 실제 앱/웹 설계에 바로 쓸 수 있게 작성한다.",
    "특히 홈, 탐색, 상세, 주문/예약/결제, 채팅/문의, 마이/관리/운영 같은 화면을 서비스 맥락에 맞게 세분화한다.",
    "사용자 역할이 둘 이상이면 각 역할의 흐름과 화면 차이를 설계에 반영한다.",
  ].join("\n");

  const userPrompt = [
    "요구사항 명세:",
    formatServiceContext(briefingJson),
    "",
    '다음 형식으로만 답해라: {"service_name":"...","service_summary":"...","core_value":"...","target_users":[{"persona":"...","description":"...","needs":["..."]}],"core_features":[{"name":"...","description":"...","priority":"high|medium|low","related_paths":["..."]}],"data_entities":[{"name":"...","description":"...","fields":["..."],"notes":"..."}],"user_flows":[{"name":"...","description":"...","steps":[{"step":1,"action":"...","screen":"...","note":"..."}]}],"screens":[{"name":"...","type":"...","description":"...","key_elements":["..."],"interactions":["..."]}],"open_questions":[{"topic":"...","detail":"...","impact":"..."}]}',
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "designDocument",
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    return normalizeDesignDocument(response, fallback);
  } catch {
    return fallback;
  }
}

export async function generateImplementationPlanDirect(
  designDocument: DesignDocument,
): Promise<ImplementationPlan> {
  const fallback = buildFallbackImplementationPlan(designDocument);

  const systemPrompt = [
    "너는 설계 결과를 바탕으로 구현 계획을 만드는 AI 테크 리드다.",
    "출력은 구조화 JSON만 허용한다.",
    "반드시 MVP 우선순위, 프론트엔드 구현 단위, 백엔드/API 구현 단위, 데이터/DB 요구사항, 인증/권한, 배포 체크리스트, 확장 포인트를 포함한다.",
  ].join("\n");

  const userPrompt = [
    "설계 결과 JSON:",
    JSON.stringify(designDocument, null, 2),
    "",
    '다음 형식으로만 답해라: {"project_name":"...","summary":"...","mvp_priorities":[{"title":"...","description":"...","priority":"high|medium|low"}],"frontend_units":[{"title":"...","description":"...","deliverables":["..."],"related_screens":["..."]}],"backend_api_units":[{"title":"...","description":"...","endpoints":["..."],"dependencies":["..."]}],"data_requirements":[{"entity":"...","description":"...","fields":["..."],"storage":"..."}],"auth_requirements":[{"area":"...","required":true,"description":"...","roles":["..."]}],"deployment_checklist":[{"title":"...","detail":"..."}],"expansion_points":[{"title":"...","description":"...","next_step":"..."}]}',
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "implementationPlan",
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    return normalizeImplementationPlan(response, fallback);
  } catch {
    return fallback;
  }
}

export async function generateHomeStyleOptionsDirect(input: {
  briefingJson: Record<string, unknown>;
  designDocument: DesignDocument;
  implementationPlan: ImplementationPlan;
  stylePrompt: string;
}): Promise<GeneratedHomeStyleSet> {
  const fallback = buildFallbackHomeStyleSet({
    stylePrompt: input.stylePrompt,
    implementationPlan: input.implementationPlan,
  });

  const systemPrompt = [
    "You are a UI concept designer.",
    "Focus only on the home screen style and structure.",
    "Do not design the full product and do not generate code.",
    "Return JSON only.",
    "Generate exactly three distinct home UI directions for left, center, and right slots.",
    "Each option must describe home-screen style, information hierarchy, hero copy, key sections, and layout notes.",
    "Use Korean for all user-facing text.",
    "The goal is to compare three homepage directions before later web/app implementation starts.",
  ].join("\n");

  const userPrompt = [
    "User style input:",
    input.stylePrompt.trim() || "깔끔하고 신뢰감 있는 홈 화면",
    "",
    "Implementation plan summary:",
    JSON.stringify(
      {
        project_name: input.implementationPlan.project_name,
        summary: input.implementationPlan.summary,
        frontend_units: input.implementationPlan.frontend_units.slice(0, 4),
      },
      null,
      2,
    ),
    "",
    "Design summary:",
    JSON.stringify(
      {
        service_name: input.designDocument.service_name,
        service_summary: input.designDocument.service_summary,
        core_features: input.designDocument.core_features.slice(0, 4),
        screens: input.designDocument.screens.slice(0, 4),
      },
      null,
      2,
    ),
    "",
    "Briefing summary:",
    JSON.stringify(
      {
        service: input.briefingJson.service,
        users: input.briefingJson.users,
        features: input.briefingJson.features,
      },
      null,
      2,
    ),
    "",
    "Output format:",
    JSON.stringify(fallback, null, 2),
    "",
    "Make the focus explicit: this is home-screen style and structure planning only.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt,
      temperature: 0.5,
    });

    return normalizeHomeStyleSet(response, fallback);
  } catch {
    return fallback;
  }
}

function readBriefingText(value: unknown): string {
  if (isStatusField(value)) {
    return readBriefingText(value.value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return normalizeStringArray(value).join(", ");
  }

  return "";
}

function readBriefingStringArray(value: unknown): string[] {
  if (isStatusField(value)) {
    return readBriefingStringArray(value.value);
  }

  if (Array.isArray(value)) {
    return normalizeStringArray(value);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getDesignCoreFeatureNames(designDocument: DesignDocument | null | undefined): string[] {
  if (!designDocument || !Array.isArray(designDocument.core_features)) {
    return [];
  }

  return uniqueStrings(
    designDocument.core_features
      .map((feature) => (feature && typeof feature === "object" ? coerceString((feature as Record<string, unknown>).name) : ""))
      .filter(Boolean),
  );
}

function getDesignScreenNames(designDocument: DesignDocument | null | undefined): string[] {
  if (!designDocument || !Array.isArray(designDocument.screens)) {
    return [];
  }

  return uniqueStrings(
    designDocument.screens
      .map((screen) => (screen && typeof screen === "object" ? coerceString((screen as Record<string, unknown>).name) : ""))
      .filter(Boolean),
  );
}

function deriveHomeStylePrompt(input: {
  briefingJson: Record<string, unknown>;
  designDocument: DesignDocument;
  implementationPlan: ImplementationPlan;
  stylePrompt: string;
}): string {
  const providedPrompt = input.stylePrompt.trim();
  if (providedPrompt) {
    return providedPrompt;
  }

  const businessConstraint = readBriefingText(
    (input.briefingJson.constraints as Record<string, unknown> | undefined)?.business,
  );
  const serviceSummary =
    input.designDocument?.service_summary ||
    readBriefingText((input.briefingJson.service as Record<string, unknown> | undefined)?.summary);
  const coreFeatureNames = getDesignCoreFeatureNames(input.designDocument).slice(0, 2);

  return uniqueStrings(
    [
      businessConstraint,
      serviceSummary ? "서비스 핵심 가치가 바로 이해되는 홈 화면" : "",
      coreFeatureNames.length > 0 ? `${coreFeatureNames.join(" / ")}가 첫 화면에서 자연스럽게 보이는 구조` : "",
      "완성도 높고 실제 서비스처럼 보이는 홈 화면",
    ].filter(Boolean),
  ).join(", ");
}


function buildFallbackHtml(projectName: string, summary: string, accent: string, bg: string, features: string[], dark = false): string {
  const fg = dark ? "#F8FAFC" : "#0F172A";
  const fgMuted = dark ? "#94A3B8" : "#64748B";
  const surface = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const featurePills = features.slice(0, 4).map((f, i) => {
    const colors = ["#3B82F6","#10B981","#F59E0B","#EC4899"];
    return `<div style='background:${colors[i % 4]}18;border:1px solid ${colors[i % 4]}44;border-radius:12px;padding:10px 12px;'>
      <div style='width:28px;height:28px;background:${colors[i % 4]};border-radius:8px;margin-bottom:6px;'></div>
      <div style='font-size:11px;font-weight:600;color:${fg};'>${f}</div>
    </div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset='utf-8'>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:320px;background:${bg};font-family:'Pretendard',system-ui,sans-serif;color:${fg};overflow:hidden;}</style>
</head><body>
<div style='display:flex;justify-content:space-between;padding:6px 16px 4px;background:${surface};border-bottom:1px solid ${border};font-size:10px;color:${fgMuted};'>
  <span>9:41</span><span>●●● 100%</span>
</div>
<div style='display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:${surface};border-bottom:1px solid ${border};'>
  <span style='font-size:15px;font-weight:700;'>${projectName}</span>
  <div style='display:flex;gap:8px;'><div style='width:28px;height:28px;background:${accent}22;border-radius:50%;border:1px solid ${accent}44;'></div></div>
</div>
<div style='background:linear-gradient(135deg,${accent}dd,${accent}88);padding:24px 16px 20px;'>
  <div style='font-size:18px;font-weight:800;color:#fff;line-height:1.3;'>${summary.slice(0,30)}</div>
  <div style='font-size:11px;color:rgba(255,255,255,0.8);margin-top:6px;'>${summary.slice(0,60)}</div>
  <button style='margin-top:14px;background:#fff;color:${accent};border:none;padding:8px 18px;border-radius:20px;font-size:12px;font-weight:600;'>시작하기</button>
</div>
<div style='padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;'>${featurePills}</div>
<div style='display:flex;border-top:1px solid ${border};background:${surface};'>
  ${["홈","기능","마이"].map((l,i)=>`<div style='flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0;'><div style='width:18px;height:18px;background:${i===0?accent:fgMuted+"44"};border-radius:4px;'></div><span style='font-size:9px;color:${i===0?accent:fgMuted};'>${l}</span></div>`).join("")}
</div>
</body></html>`;
}

function buildRenderedHomeStyleFallback(input: {
  briefingJson: Record<string, unknown>;
}): RenderedHomeStyleSet {
  const service =
    input.briefingJson.service && typeof input.briefingJson.service === "object"
      ? (input.briefingJson.service as Record<string, unknown>)
      : {};
  const projectName = readBriefingText(service.name) || readBriefingText(service.summary) || "서비스";
  const summary = readBriefingText(service.summary) || `${projectName}의 핵심 가치를 담은 홈 화면`;
  const featureRecord =
    input.briefingJson.features && typeof input.briefingJson.features === "object"
      ? (input.briefingJson.features as Record<string, unknown>)
      : {};
  const featureNames = readBriefingStringArray(featureRecord.mvp)
    .map((f) => (typeof f === "string" ? f : readBriefingText((f as Record<string, unknown>)?.name)))
    .filter(Boolean).slice(0, 4) as string[];

  return {
    focus_note: "서비스 JSON을 기반으로 생성된 홈 화면 3안입니다.",
    options: [
      {
        id: "rendered-home-style-1",
        name: "클린 카드형",
        concept_summary: `${projectName}의 핵심 기능을 카드로 정렬한 밝고 명확한 홈 화면입니다.`,
        style_reason: "흰 배경과 블루 포인트로 신뢰감과 명확성을 강조합니다.",
        html: buildFallbackHtml(projectName, summary, "#2563EB", "#F1F5F9", featureNames),
      },
      {
        id: "rendered-home-style-2",
        name: "그린 미니멀형",
        concept_summary: `${projectName}의 가치를 차분하고 정돈된 그린 톤으로 표현한 홈 화면입니다.`,
        style_reason: "그린 계열로 성장과 신뢰를 표현합니다.",
        html: buildFallbackHtml(projectName, summary, "#10B981", "#F0FDF4", featureNames),
      },
      {
        id: "rendered-home-style-3",
        name: "다크 몰입형",
        concept_summary: `${projectName}의 정체성을 다크 배경으로 강하게 표현한 홈 화면입니다.`,
        style_reason: "다크 배경과 앰버 포인트로 프리미엄 감성을 연출합니다.",
        html: buildFallbackHtml(projectName, summary, "#F59E0B", "#0F172A", featureNames, true),
      },
    ],
  };
}

function normalizeRenderedHomeStyleOption(
  option: unknown,
  fallback: RenderedHomeStyleOption,
): RenderedHomeStyleOption {
  if (!option || typeof option !== "object") return fallback;
  const record = option as Record<string, unknown>;
  const html = coerceString(record.html, "");
  return {
    id: coerceString(record.id, fallback.id),
    name: coerceString(record.name, fallback.name),
    concept_summary: coerceString(record.concept_summary, fallback.concept_summary),
    style_reason: coerceString(record.style_reason, fallback.style_reason),
    html: html.includes("<") ? html : fallback.html,
  };
}


type HomeScreenRole = "market-reference" | "user-faithful" | "original";

interface HomeScreenDirection {
  role: HomeScreenRole;
  name: string;
  visual_world: string;
  color_concept: string;
  structural_archetype: string;
}

const ROLE_DIRECTION_PROMPTS: Record<HomeScreenRole, string[]> = {
  "market-reference": [
    "ROLE: Market Reference",
    "Goal: Create the most market-familiar and trust-building direction of the three.",
    "Use the user's JSON as the source of product truth, and express it through the layout conventions, color language, and interaction patterns that users already recognize in this category.",
    "Include every relevant feature, screen, and user type from the JSON.",
    "Prioritize clarity, usability, credibility, and low learning cost over novelty.",
    "Use established section ordering, expected navigation patterns, and familiar content grouping.",
    "Do not introduce experimental layout structures, unusual interaction models, or surprising visual metaphors.",
    "The result should feel polished, production-ready, and immediately understandable to the target users.",
    "This option should feel like a refined, highly credible version of what users already trust in this market."
  ],
  "user-faithful": [
    "ROLE: Creative Blend",
    "Goal: Create a direction that is still market-legible, but more distinctive and creatively interpreted than the standard market version.",
    "Use the user's JSON as the anchor for product meaning, primary tasks, and core structure.",
    "Keep the main information architecture understandable and familiar, but reinterpret how it is framed, emphasized, and visually presented.",
    "Innovation should come from visual rhythm, section emphasis, hero strategy, and presentation style.",
    "Do not fully follow market conventions, but do not reject them so strongly that the UI becomes unfamiliar or hard to use.",
    "Do not change the product into a radically different structure just to appear creative.",
    "The result should feel fresh, thoughtful, and slightly unexpected, while still making immediate sense to the user.",
    "This option should feel like: familiar enough to trust, different enough to remember."
  ],
  "original": [
    "ROLE: Original",
    "Goal: Create the most structurally original direction of the three while keeping it clearly usable as a real product interface.",
    "Use the user's JSON as the source of product truth, but reinterpret the service through section order, hierarchy, grouping, emphasis, and screen flow.",
    "Originality must come from product logic and interface structure, not from overlapping elements, floating objects, abstract diagrams, or decorative disruption.",
    "Find a fresh and believable way to organize the same service meaning.",
    "Do not use node-based layouts, mind-map structures, collage composition, overlapping cards, floating disconnected modules, layered blocks that cover one another, or isolated visual islands.",
    "Do not use scattered circles, orbiting tags, random depth, or graphic compositions that interrupt reading flow or weaken scanability.",
    "All major content sections must remain clearly separated, readable, and aligned within a stable layout system.",
    "Maintain strong scanability: users should immediately understand what is primary, what is secondary, and where to act next.",
    "The design may be unconventional, but it must still feel orderly, navigable, interaction-ready, and production-ready.",
    "Favor structural originality over visual disruption.",
    "Use light, vibrant, or mid-tone palettes only.",
    "Dark backgrounds are forbidden.",
    "Aim for bright, airy, or richly saturated color systems on a light base.",
    "The palette must feel intentional, modern, and fresh."
  ]
};

async function generateHomeScreenDirections(input: {
  briefingContext: Record<string, unknown>;
}): Promise<HomeScreenDirection[]> {
  const systemPrompt = [
    "You are a design strategist specializing in mobile product UI direction-setting.",
"Read the provided service brief and produce exactly one design direction for each of the 3 roles below.",
"There are exactly 3 roles, each with a strict and different mandate.",
"You must output all 3 roles exactly once.",
"",
"IMPORTANT:",
"- All output text values must be written in Korean.",
'- The field value for "role" must remain in English exactly as one of:',
'"market-reference", "user-faithful", "original"',
"- Return ONLY valid JSON.",
"- Do not return markdown.",
"- Do not include any explanation outside the JSON.",
"- Do not omit any field.",
"- Do not add extra fields.",
"",
"Input interpretation rules:",
"If the input is a Markdown specification, treat it as the single source of truth for the service.",
"Extract as much as possible from the document itself.",
"If some sections are missing, infer conservatively from '서비스 개요', the service type, and the overall product intent.",
"Do not invent features, user types, or product goals that are not reasonably supported by the brief.",
"",
"Use the following sections, when available, to inform the design directions:",
"- '홈화면 레이아웃 구조' + '섹션별 상세 명세'",
" → determine structural_archetype",
" If absent, infer a suitable Home layout from the service type, service overview, and likely usage priorities.",
"- '디자인 톤 & 스타일 가이드'",
" → determine visual_world and color_concept",
" If absent, derive a fitting tone and palette from the service nature and target experience.",
"- '주요 인터랙션 & CTA'",
" → determine which actions, emphasis points, and visible priorities must surface in the Home screen",
" If absent, infer the most important user actions from the service goals.",
"- '컴포넌트 목록'",
" → use as the main building blocks",
" If absent, choose only components that are appropriate for the service and role.",
"",
"General output requirements:",
"Each direction must describe a plausible, production-ready Home UI direction for a 320×640px mobile screen.",
"All 3 directions must preserve the same underlying service content, but differ clearly in presentation strategy, visual character, and layout logic according to role.",
"The 3 directions must feel meaningfully different from one another.",
"Avoid vague, generic, or interchangeable descriptions.",
"",
"Each direction has these fields:",
"- role:",
" one of 'market-reference' | 'user-faithful' | 'original'",
" Keep this value in English exactly.",
"- name:",
" In Korean.",
" A sharp 2-4 word direction title that captures the essence of the role for THIS specific service.",
" Avoid generic names that could fit any app.",
"- visual_world:",
" In Korean.",
" 2-3 sentences describing the emotional atmosphere, visual identity, and stylistic character of the direction.",
" Be concrete and service-aware.",
"- color_concept:",
" In Korean.",
" A specific palette with actual hex values.",
" Format exactly like:",
" '색상명 #hex, 색상명 #hex, 색상명 #hex, ...'",
" The 3 roles must use clearly different palettes.",
" If a style guide exists, use it as the closest base for market-reference, reinterpret it for user-faithful, and expand or challenge it for original while respecting hard constraints.",
"- structural_archetype:",
" In Korean.",
" A concrete Home-screen layout description for 320×640px.",
" Describe hierarchy, proportions, spatial flow, density, and anchor points.",
" Explain what appears first, what dominates attention, and how major sections are organized vertically.",
" Do not refer to named UI patterns, brand names, or external product examples.",
"",
"Role mandates:",
" [market-reference] ...",
" [user-faithful] ...",
" [original] ...",
"",
"Return shape exactly:",
'{"directions":[{"role":"market-reference","name":"...","visual_world":"...","color_concept":"...","structural_archetype":"..."},{"role":"user-faithful","name":"...","visual_world":"...","color_concept":"...","structural_archetype":"..."},{"role":"original","name":"...","visual_world":"...","color_concept":"...","structural_archetype":"..."}]}'
  ].join("\n");

  const userPrompt = [
    serviceContextLabel(input.briefingContext),
    formatServiceContext(input.briefingContext),
    "",
    "Generate one design direction for each of the 3 roles.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      timeoutMs: 40_000,
    });

    if (response && typeof response === "object") {
      const record = response as Record<string, unknown>;
      const dirs = Array.isArray(record.directions) ? record.directions : [];
      const valid = dirs.filter(
        (d): d is HomeScreenDirection =>
          d && typeof d === "object" &&
          typeof (d as Record<string, unknown>).name === "string" &&
          typeof (d as Record<string, unknown>).structural_archetype === "string",
      );
      if (valid.length >= 3) return valid.slice(0, 3);
    }
  } catch (err) {
    console.warn("[homeStyle] direction generation failed, proceeding without:", err);
  }

  return [];
}

const ROLE_TEMPERATURES: Record<HomeScreenRole, number> = {
  "market-reference": 0.5,
  "user-faithful": 0.75,
  "original": 1.0,
};

const ROLE_HTML_MANDATES: Record<HomeScreenRole, string[]> = {
  "market-reference": [
    "YOUR ROLE: Market Reference",
    "Use the Markdown brief as the single source of truth.",
    "Present the user's exact service content using visual conventions that users in this market already recognize and trust.",
    "Every important feature, priority, and Home-screen-relevant element described in the Markdown must appear.",
    "Wrap them in a layout language that feels polished, familiar, credible, and production-ready to the target users.",
    "Do not invent unrelated features or reduce the service into a generic landing page.",
    "This concept should feel immediately understandable, category-native, and realistically shippable."
  ],
  "user-faithful": [
    "YOUR ROLE: Creative Blend",
    "Use the Markdown brief as your anchor and preserve the actual service logic, priorities, and Home screen purpose.",
    "Find a presentation that feels fresh and distinctive, without relying too heavily on standard market conventions.",
    "Do not drift away from the service described in the Markdown.",
    "Reinterpret the Home UI in a way that feels memorable, coherent, and believable for this exact product.",
    "Do not be unconventional just for novelty; every structural and visual decision must still make product sense.",
    "The goal is for users to feel: 'I haven't seen this exact UI before, but it clearly fits this service.'"
  ],
  "original": [
    "YOUR ROLE: Original",
    "Create a completely free visual interpretation of the Home UI based on the Markdown brief.",
    "Layout, composition, and presentation are entirely your call, but the core service logic and Home-screen priorities from the Markdown must remain clear.",
    "Be as unconventional as you want, as long as the result still feels intentional, usable, and relevant to the actual service.",
    "COLOR RULES (the only hard constraint):",
    "  - Dark backgrounds (#1a1a1a, #0f0f0f, near-black, deep navy, etc.) are forbidden.",
    "  - Use light, vibrant, or mid-tone palettes only.",
    "  - Aim for bright, airy, soft-luminous, or richly saturated colors on a light base.",
    "  - Every color must feel intentional, system-driven, and visually coherent.",
    "  - Do not use dark styling to create contrast by default; build emphasis through hierarchy, spacing, surface treatment, and controlled color contrast instead."
  ],
};

async function generateSingleHomeScreenOption(input: {
  briefingContext: Record<string, unknown>;
  direction: HomeScreenDirection | null;
  index: number;
  fallback: RenderedHomeStyleOption;
}): Promise<RenderedHomeStyleOption> {
  const { briefingContext, direction, index, fallback } = input;

  const role: HomeScreenRole = direction?.role ?? (
    index === 0 ? "market-reference" : index === 1 ? "user-faithful" : "original"
  );

  const roleMandate = ROLE_HTML_MANDATES[role].join("\n");

  const directionBlock = direction
    ? [
        "DESIGN DIRECTION:",
        `  Name: ${direction.name}`,
        `  Visual world: ${direction.visual_world}`,
        `  Color concept: ${direction.color_concept}`,
        `  Structural archetype: ${direction.structural_archetype}`,
        "",
      ].join("\n")
    : "";

  const systemPrompt = [
    "You are a senior UI developer. Build a 320×640px HTML document for one home screen.",
    "You are working alone — no knowledge of other screens being built.",
    "",
    "If the service specification is Markdown, extract and apply the sections that are present.",
    "Sections may be partially or fully absent — infer missing information from '서비스 개요' and overall context:",
    "  '홈화면 레이아웃 구조' → implement the described layout; if absent, design a suitable home screen layout for the service type",
    "  '섹션별 상세 명세' → populate with specified content; if absent, infer meaningful content from the service overview",
    "  '주요 인터랙션 & CTA' → render every CTA at the correct position; if absent, include the most logical primary CTAs for this service",
    "  '디자인 톤 & 스타일 가이드' → use specified colors/fonts/tone; if absent, derive a fitting visual style from the service character",
    "  '반응형 대응' → apply mobile rules within 320px; if absent, use standard mobile layout practices",
    "  '컴포넌트 목록' → use listed components; if absent, choose appropriate components for the service",
    "",
    roleMandate,
    "",
    directionBlock,
    "HTML RULES:",
    "  - COMPLETE self-contained HTML document. Width exactly 320px. Height ~640px.",
    "  - Use a <style> block for base resets and @import for Google Fonts.",
    "  - Use inline styles for all component-level styling.",
    "  - Use single quotes inside style attributes to avoid JSON conflicts.",
    "  - No JavaScript. No external resources except Google Fonts.",
    "",
    "IMAGE PLACEHOLDER RULES:",
    "  - Every image area must use a CSS gradient — no plain grey boxes.",
    "  - Use the palette from color_concept with appropriate aspect ratio and rounded corners.",
    "  - Profile/avatar: circle or square, warm skin-tone gradient (e.g. #E8C5A0 → #C4956A).",
    "  - Hero/banner: full-width, primary palette gradient, text overlay allowed.",
    "  - Card thumbnails: 16:9 or 4:3 ratio, gradient matching content category.",
    "",
    "COLOR RULES:",
    "  - Apply color_concept palette consistently. Distinguish: primary, background, accent, text.",
    "  - Service characteristics from JSON must influence color choices.",
    "",
    "CONTENT RULES:",
    "  - ALL text in the HTML must be in Korean.",
    "  - Derive ALL content from the SERVICE JSON only.",
    "  - name, concept_summary, style_reason must be written in Korean.",
    "",
    "Return ONLY valid JSON. No markdown. No explanation.",
    '{"id":"rendered-home-style-' + (index + 1) + '","name":"(Korean)","concept_summary":"(Korean)","style_reason":"(Korean)","html":"<!DOCTYPE html>..."}',
  ].join("\n");

  const userPrompt = [
    serviceContextLabel(briefingContext),
    formatServiceContext(briefingContext),
    "",
    "Build the home screen HTML following your role mandate and design direction.",
  ].join("\n");

  const temperature = ROLE_TEMPERATURES[role];

  let response: unknown;
  try {
    response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt,
      temperature,
      timeoutMs: 90_000,
    });
  } catch (err) {
    console.error(`[homeStyle] option ${index + 1} (${role}) request failed, using fallback:`, err);
    return fallback;
  }

  if (!response || typeof response !== "object") return fallback;
  return normalizeRenderedHomeStyleOption(response, fallback);
}

export async function generateRenderedHomeStyleOptionsDirect(input: {
  briefingJson: Record<string, unknown>;
}): Promise<RenderedHomeStyleSet> {
  const featureRecord =
    input.briefingJson.features &&
    typeof input.briefingJson.features === "object" &&
    !Array.isArray(input.briefingJson.features)
      ? (input.briefingJson.features as Record<string, unknown>)
      : null;

  // For markdown briefings, pass content directly; for JSON, extract key fields
  const briefingContext: Record<string, unknown> = isMarkdownBriefing(input.briefingJson)
    ? { _format: "markdown", content: input.briefingJson.content }
    : {
        service: input.briefingJson.service,
        users: Array.isArray(input.briefingJson.users) ? input.briefingJson.users.slice(0, 4) : [],
        mvp_features: Array.isArray(featureRecord?.mvp) ? featureRecord.mvp.slice(0, 5) : [],
        screens: Array.isArray(input.briefingJson.screens) ? input.briefingJson.screens.slice(0, 5) : [],
        user_flows: Array.isArray(input.briefingJson.user_flows) ? input.briefingJson.user_flows.slice(0, 3) : [],
        constraints: input.briefingJson.constraints ?? null,
      };

  const fallbackSet = buildRenderedHomeStyleFallback({ briefingJson: input.briefingJson });

  console.log("[homeStyle] step 1: generating role-based design directions");
  const directions = await generateHomeScreenDirections({ briefingContext });
  console.log("[homeStyle] directions received:", directions.map((d) => `${d.role}: ${d.name}`));

  const roles: HomeScreenRole[] = ["market-reference", "user-faithful", "original"];
  const directionByRole = Object.fromEntries(
    directions.map((d) => [d.role, d]),
  ) as Partial<Record<HomeScreenRole, HomeScreenDirection>>;

  console.log("[homeStyle] step 2: launching 3 parallel HTML generation requests");
  const [opt1, opt2, opt3] = await Promise.all([
    generateSingleHomeScreenOption({ briefingContext, direction: directionByRole[roles[0]] ?? null, index: 0, fallback: fallbackSet.options[0] }),
    generateSingleHomeScreenOption({ briefingContext, direction: directionByRole[roles[1]] ?? null, index: 1, fallback: fallbackSet.options[1] }),
    generateSingleHomeScreenOption({ briefingContext, direction: directionByRole[roles[2]] ?? null, index: 2, fallback: fallbackSet.options[2] }),
  ]);

  console.log("[homeStyle] all 3 options received");

  return {
    focus_note: directions.length >= 3
      ? `${directions[0].name} / ${directions[1].name} / ${directions[2].name}`
      : "서비스 JSON을 기반으로 독립 생성된 홈 화면 3안입니다.",
    options: [opt1, opt2, opt3],
  };
}

export async function generateHomeScreenMarkdownDirect(
  option: import("@/lib/home-style-types").RenderedHomeStyleOption,
): Promise<string> {
  const systemPrompt = [
    "You are a UI/UX documentation specialist. Analyze the given HTML home screen and produce a Markdown specification document.",
    "The goal: someone reading this document alone should be able to recreate a visually similar home screen.",
    "The document must be written entirely in Korean.",
    "Be descriptive but concise — include what matters for reproduction, skip implementation code.",
    "",
    "Output a JSON object: { \"markdown\": \"...\" }",
    "",
    "Cover exactly these 5 sections in order:",
    "",
    "## 1. 화면 개요",
    "  - 컨셉 이름과 전체 무드 1-2문장 (어떤 인상을 주는 화면인지)",
    "  - 타깃 사용자에게 어떻게 느껴지는가",
    "",
    "## 2. 레이아웃 구조",
    "  - 전체 레이아웃 원칙 한 줄 (예: 단일 컬럼, 카드 그리드, 좌우 분할 등)",
    "  - 섹션 목록을 위→아래 순서로, 각 섹션: 이름 + 역할 한 줄 + 높이 비중",
    "",
    "## 3. 색상 팔레트",
    "  - 주요 색상 5-6개를 역할과 함께 나열",
    "  - Format: `역할: 색상명 #hex` (예: `주 배경: 화이트 #FFFFFF`)",
    "  - 색상이 어떻게 조합되는지 한 줄 설명",
    "",
    "## 4. 타이포그래피",
    "  - 폰트 패밀리",
    "  - 헤딩 / 본문 / 보조 텍스트의 굵기·크기 방향",
    "  - 텍스트 색상 계층 (진한 → 흐린, hex 포함)",
    "",
    "## 5. 주요 CTA & 컴포넌트",
    "  - 핵심 CTA 버튼: 텍스트, 위치(섹션), 색상·형태·크기",
    "  - 화면에 등장하는 주요 UI 컴포넌트와 시각적 특징 한 줄씩 (카드, 배지, 아바타 등)",
    "  - 모서리 처리 방향 (강하게 둥글게 / 살짝 / 직각)",
    "",
    "Return ONLY valid JSON: { \"markdown\": \"...\" }. No explanation outside JSON.",
  ].join("\n");

  const userPrompt = [
    `컨셉 이름: ${option.name}`,
    `컨셉 요약: ${option.concept_summary}`,
    `스타일 근거: ${option.style_reason}`,
    "",
    "HOME SCREEN HTML:",
    option.html,
    "",
    "위 HTML을 분석하여 한국어 Markdown 명세서를 작성하세요.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 60_000,
    });
    if (response && typeof response === "object") {
      const md = (response as Record<string, unknown>).markdown;
      if (typeof md === "string" && md.trim()) return md.trim();
    }
  } catch (err) {
    console.error("[homeStyle] markdown generation failed:", err);
  }

  // Fallback: minimal markdown from option metadata
  return [
    `# ${option.name}`,
    "",
    `## 컨셉 요약`,
    option.concept_summary,
    "",
    `## 스타일 근거`,
    option.style_reason,
  ].join("\n");
}

export interface WebFile {
  path: string;
  content: string;
}

export interface FullWebProject {
  files: WebFile[];
  previewHtml: string;
}

// Kept for backward compat
export type FullAppResult = FullWebProject;

async function generateReactProjectFiles(input: {
  briefingJson: Record<string, unknown>;
  homeStyleMd: string;
  designDocument?: import("@/lib/design-types").DesignDocument | null;
  additionalContext?: string | null;
}): Promise<WebFile[]> {
  const { briefingJson, homeStyleMd, designDocument, additionalContext } = input;

  const designDocBlock = designDocument
    ? ["SCREEN DESIGN SPECIFICATION:", JSON.stringify(designDocument, null, 2)].join("\n")
    : "";

  const systemPrompt = [
    "You are a senior React/TypeScript engineer. Generate a Vite + React + TypeScript project.",
    "Output ONLY: {\"files\": [{\"path\": \"...\", \"content\": \"...\"}, ...]}",
    "",
    "REQUIRED FILES (generate all of these, nothing more):",
    "  package.json",
    "  vite.config.ts",
    "  tsconfig.json",
    "  index.html",
    "  src/main.tsx",
    "  src/index.css          ← import Google Font; define CSS vars at :root; full reset and layout foundation",
    "  src/App.tsx            ← React Router v6; Layout wraps all routes via <Outlet>",
    "  src/components/Layout.tsx  ← fixed sidebar (220px) + top header; use CSS vars",
    "  src/types/index.ts     ← domain types",
    "  src/services/api.ts    ← localStorage operations; Promise-returning functions",
    "  src/pages/HomePage.tsx ← dashboard page matching home style spec",
    "  src/pages/[Page].tsx   ← one file per additional page (max 4 beyond HomePage)",
    "",
    "CRITICAL — LAYOUT & SIZING RULES (follow exactly):",
    "  index.html must have: <meta name='viewport' content='width=device-width, initial-scale=1.0'>",
    "  index.css must start with:",
    "    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
    "    html, body, #root { height: 100%; width: 100%; overflow: hidden; }",
    "  Layout.tsx must use:",
    "    display: flex; height: 100vh; width: 100vw; overflow: hidden;",
    "    Sidebar: width: 220px; flex-shrink: 0; height: 100%; overflow-y: auto;",
    "    Content wrapper: flex: 1; display: flex; flex-direction: column; overflow: hidden;",
    "    Header: height: 56px; flex-shrink: 0;",
    "    Main: flex: 1; overflow-y: auto; padding: 24px;",
    "  All widths MUST use % or CSS calc() relative to parent — NO hardcoded px widths for content areas.",
    "  Cards and grids: use CSS Grid with auto-fill/minmax or percentage columns, not fixed pixel widths.",
    "",
    "STYLE RULES:",
    "  • Extract colors, font, border-radius from HOME SCREEN DESIGN SPEC → define as CSS custom properties at :root",
    "  • Sidebar and header use these CSS vars",
    "  • HomePage.tsx mirrors the spec's card layout, color blocks, and typography",
    "  • Other pages: same CSS vars, focus on functional layout — tables, forms, lists",
    "  • No Tailwind. Plain CSS with the CSS vars.",
    "",
    "FUNCTIONAL RULES:",
    "  • api.ts: seed realistic Korean data to localStorage on first load",
    "  • List pages: search input + sortable table or card grid",
    "  • Forms: controlled inputs with basic validation",
    "  • ALL text in Korean",
    "",
    "Return ONLY valid JSON. Escape all double-quotes inside content strings.",
  ].join("\n");

  const userPrompt = [
    "HOME SCREEN DESIGN SPEC (extract CSS vars from this; HomePage.tsx must reflect this style):",
    homeStyleMd,
    "",
    ...(designDocBlock ? [designDocBlock, ""] : []),
    serviceContextLabel(briefingJson),
    formatServiceContext(briefingJson),
    "",
    ...(additionalContext?.trim() ? ["ADDITIONAL CONTEXT (higher priority):", additionalContext.trim(), ""] : []),
    "Generate the React project files now.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "fullAppGeneration",
      systemPrompt,
      userPrompt,
      temperature: 0.35,
      timeoutMs: 300_000,
    });
    if (response && typeof response === "object") {
      const record = response as Record<string, unknown>;
      const rawFiles = Array.isArray(record.files) ? record.files : [];
      const files = rawFiles.filter(
        (f): f is WebFile =>
          f !== null &&
          typeof f === "object" &&
          typeof (f as Record<string, unknown>).path === "string" &&
          typeof (f as Record<string, unknown>).content === "string",
      );
      if (files.length > 0) {
        console.log("[fullApp] react files generated:", files.map((f) => f.path));
        return files;
      }
    }
  } catch (err) {
    console.error("[fullApp] react file generation failed:", err);
  }
  return [];
}

async function generatePreviewHtml(input: {
  briefingJson: Record<string, unknown>;
  homeStyleMd: string;
  designDocument?: import("@/lib/design-types").DesignDocument | null;
  additionalContext?: string | null;
}): Promise<string> {
  const { briefingJson, homeStyleMd, designDocument, additionalContext } = input;

  const designDocBlock = designDocument
    ? ["SCREEN DESIGN SPECIFICATION:", JSON.stringify(designDocument, null, 2)].join("\n")
    : "";

  const systemPrompt = [
    "You are a senior UI developer. Build a desktop web application as a SINGLE self-contained HTML file.",
    "Use React 18 + Babel standalone from CDN. Must run immediately in any browser without a build step.",
    "",
    "OUTPUT FORMAT: Return ONLY {\"html\": \"<!DOCTYPE html>...\"}. No markdown, no explanation.",
    "",
    "CRITICAL — SIZING & LAYOUT:",
    "  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
    "  html, body, #root { height: 100%; width: 100%; overflow: hidden; }",
    "  App root: display: flex; height: 100vh; width: 100vw;",
    "  Sidebar: width: 220px; flex-shrink: 0; height: 100vh; overflow-y: auto;",
    "  Content area: flex: 1; display: flex; flex-direction: column; overflow: hidden;",
    "  Header: height: 56px; flex-shrink: 0;",
    "  Main: flex: 1; overflow-y: auto; padding: 24px;",
    "  Cards/grids: use CSS Grid with auto-fill/minmax or % columns — NO fixed px widths for content.",
    "",
    "HTML SHELL (use exactly these CDN tags):",
    "  <script crossorigin src='https://unpkg.com/react@18/umd/react.production.min.js'></script>",
    "  <script crossorigin src='https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'></script>",
    "  <script src='https://unpkg.com/@babel/standalone/babel.min.js'></script>",
    "  <script type='text/babel' data-presets='react'>",
    "    const { useState, useEffect, useCallback } = React;",
    "    // ... all app code here",
    "    ReactDOM.createRoot(document.getElementById('root')).render(<App />);",
    "  </script>",
    "",
    "STYLE — extract from HOME SCREEN DESIGN SPEC:",
    "  Define CSS custom properties at :root (primary, secondary, background, accent, text colors, font, border-radius).",
    "  HomePage must visually mirror the spec: same card layout, color blocks, typography rhythm.",
    "  Sidebar and header use the same CSS vars.",
    "",
    "PAGES (derive from service spec, max 5 total including home):",
    "  Home/dashboard: mirror the design spec closely.",
    "  Others: same CSS vars, focus on functional layout — tables, lists, forms.",
    "  Page switching via useState. Seed realistic Korean data to localStorage on first load.",
    "  At least one page with a create/edit form.",
    "",
    "ALL text in Korean. Single quotes only inside JSX style/attribute strings to avoid JSON conflicts.",
    "Return ONLY valid JSON: {\"html\": \"...\"}",
  ].join("\n");

  const userPrompt = [
    "HOME SCREEN DESIGN SPEC (extract CSS vars from this; HomePage must mirror this style):",
    homeStyleMd,
    "",
    ...(designDocBlock ? [designDocBlock, ""] : []),
    serviceContextLabel(briefingJson),
    formatServiceContext(briefingJson),
    "",
    ...(additionalContext?.trim() ? ["ADDITIONAL CONTEXT (higher priority):", additionalContext.trim(), ""] : []),
    "Build the single-file desktop web application now.",
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt,
      temperature: 0.35,
      timeoutMs: 300_000,
    });
    if (response && typeof response === "object") {
      const record = response as Record<string, unknown>;
      const html = typeof record.html === "string" ? record.html : "";
      if (html) return html;
    }
  } catch (err) {
    console.error("[fullApp] preview html generation failed:", err);
  }
  return `<!DOCTYPE html><html><body style='font-family:sans-serif;padding:24px'><p>프리뷰 생성에 실패했습니다.</p></body></html>`;
}

export async function generateFullAppDirect(input: {
  briefingJson: Record<string, unknown>;
  homeStyleMd: string;
  designDocument?: import("@/lib/design-types").DesignDocument | null;
  additionalContext?: string | null;
}): Promise<FullWebProject> {
  console.log("[fullApp] starting parallel generation: CDN preview HTML + React+TS project files");

  const [previewResult, filesResult] = await Promise.allSettled([
    generatePreviewHtml(input),
    generateReactProjectFiles(input),
  ]);

  const previewHtml =
    previewResult.status === "fulfilled"
      ? previewResult.value
      : `<!DOCTYPE html><html><body style='font-family:sans-serif;padding:24px'><p>프리뷰 생성에 실패했습니다.</p></body></html>`;

  const files = filesResult.status === "fulfilled" ? filesResult.value : [];

  console.log("[fullApp] done. preview:", previewHtml.length, "chars, files:", files.length);

  return { previewHtml, files };
}

export async function refineHomeScreenOptionDirect(input: {
  option: RenderedHomeStyleOption;
  userPrompt: string;
  briefingJson: Record<string, unknown>;
}): Promise<RenderedHomeStyleOption> {
  const { option, userPrompt, briefingJson } = input;

  const systemPrompt = [
    "You are a UI developer. You will receive an existing home screen HTML and a user refinement request.",
    "Apply the user's request to the HTML. Keep everything else intact.",
    "",
    "RULES:",
    "  - Return the complete modified HTML, not a diff.",
    "  - Preserve all existing content, structure, and style unless the user's request explicitly changes them.",
    "  - ALL text in the HTML must remain in Korean.",
    "  - Use single quotes inside style attributes to avoid JSON conflicts.",
    "  - No JavaScript. No external resources except Google Fonts.",
    "  - name, concept_summary, style_reason must reflect the refinement in Korean.",
    "",
    "Return ONLY valid JSON. No markdown. No explanation.",
    `{"id":"${option.id}","name":"(Korean)","concept_summary":"(Korean)","style_reason":"(Korean)","html":"<!DOCTYPE html>..."}`,
  ].join("\n");

  const userPromptText = [
    "CURRENT HTML:",
    option.html,
    "",
    "SERVICE JSON (for content reference):",
    JSON.stringify(briefingJson, null, 2),
    "",
    "USER REFINEMENT REQUEST:",
    userPrompt,
    "",
    "Apply the request and return the updated screen.",
  ].join("\n");

  let response: unknown;
  try {
    response = await requestGeminiJson<unknown>({
      taskId: "homeStyleConcepts",
      systemPrompt,
      userPrompt: userPromptText,
      temperature: 0.5,
      timeoutMs: 90_000,
    });
  } catch (err) {
    console.error("[homeStyle] refine request failed:", err);
    return option;
  }

  if (!response || typeof response !== "object") return option;
  return normalizeRenderedHomeStyleOption(response, option);
}
