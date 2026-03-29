import type {
  GeneratedInterviewQuestion,
  InterviewFieldUpdate,
  InterviewHistoryEntry,
} from "@/lib/ai-types";
import type { InterviewTarget } from "@/lib/briefing-state";
import { getAiTaskRuntime, type AiTaskId } from "@/lib/ai-config";

// ─── Gemini API helpers (replaces Claude transport) ─────────────────

interface GeminiRequestOptions {
  taskId: AiTaskId;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
}

function extractJsonFromText(text: string): string {
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

  const modelsToTry = [runtime.model, ...runtime.fallbackModels.filter((m) => m !== runtime.model)];
  let payload: Record<string, unknown> | null = null;
  let lastError: Error | null = null;

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
        payload = (await response.json()) as Record<string, unknown>;
        break;
      }

      const errorText = await response.text();
      lastError = new Error(`Gemini request failed (${response.status}): ${errorText.slice(0, 400)}`);
      console.warn(`[Gemini:${taskId}] model ${model} failed with ${response.status}`);

      if (response.status !== 404 && response.status !== 503) {
        throw lastError;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        lastError = new Error(`Gemini request timed out after ${timeoutMs}ms`);
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
    .map((part: Record<string, unknown>) =>
      part && typeof part.text === "string" ? part.text : "",
    )
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return JSON.parse(extractJsonFromText(text)) as T;
  }
}

// ─── Shared utilities ───────────────────────────────────────────────

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
  if (!firstTarget) return null;

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
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item): InterviewFieldUpdate | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const path = coerceString(record.path);
      if (!path) return null;

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

// ─── Exported functions (all using Gemini API) ──────────────────────

/**
 * 1차 인터뷰 답변 → UI 브리핑 JSON 생성
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
    "    - display / heading / subheading / body / caption / label",
    "",
    "  spacing_rules:",
    "    - base_unit / screen_horizontal_padding / section_gap / component_gap / density",
    "",
    "  component_style:",
    "    - button / card / input / badge_chip",
    "",
    "  layout_patterns:",
    "    - primary_list_style / grid_columns / tab_style / sheet_usage / global_nav_pattern",
    "",
    "  bottom_nav_tabs: (global_nav_pattern이 bottom-nav일 때 필수)",
    "    각 탭: tab_name / icon_hint / linked_screen / badge_condition",
    "",
    "  breakpoints: (웹 또는 '둘 다' 플랫폼일 때 포함)",
    "    - mobile / tablet / desktop",
    "",
    "  shared_states:",
    "    - loading / empty_state / error_state / toast_notification",
    "",
    "━━ 3. screens ━━",
    "이 서비스에 필요한 모든 화면.",
    "  필수 필드: screenName / purpose / targetUsers / headerType / navigationType / layoutType / transition_type / primaryCTA / secondaryCTA / keyComponents / entryPoints / exitActions",
    "  조건부: listItemSpec / formValidation / emptyStateRef / loadingStateRef / errorStateRef",
    "",
    "━━ 4. user_flows ━━",
    "핵심 태스크 플로우 (3~6개). 각: flowName / triggerCondition / steps[]",
    "",
    "【스키마 깊이 기준】",
    "pretty-print 기준 1500~2000 라인 목표.",
    "",
    "【status 판단 기준】",
    "fulled: 사용자가 직접 언급한 내용만. 추론·예측·상식으로 채운 값은 절대 fulled 금지.",
    "null: 사용자가 명시적으로 언급하지 않은 모든 UI 세부사항.",
    "expected: 극히 제한적으로만 사용. 전체 필드의 최대 10~15%만 허용.",
    "【핵심: 전체 필드의 50% 이상이 반드시 null이어야 한다.】",
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

  try {
    return await requestGeminiJson<Record<string, unknown>>({
      taskId: "initialBriefing",
      systemPrompt,
      userPrompt: userPromptParts.join("\n"),
      temperature: 0.4,
    });
  } catch (error) {
    console.error("[generateUIBriefingFromAnswers] Gemini API failed:", error);
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
 * 2차 인터뷰 질문 생성
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
  if (input.unresolvedTargets.length === 0) return [];

  const systemPrompt = [
    "너는 비개발자 사용자와 대화하면서 서비스 UI를 함께 설계하는 친근한 AI 도우미다.",
    "사용자는 개발자가 아니다. 기술 용어를 절대 쓰지 않는다.",
    "",
    "【질문 스타일 — 이것이 가장 중요하다】",
    "- 친구에게 물어보듯 쉽고 친근하게 질문한다.",
    "- '줄 간격', '여백 단위', '바텀시트', 'CTA', '포커스 인디케이터' 같은 개발/디자인 용어는 절대 쓰지 않는다.",
    "- 대신 실생활 비유와 구체적 예시로 물어본다.",
    "",
    "【AI가 직접 추론해서 채울 것 — 질문하지 않는다】",
    "다음은 사용자에게 물어봐야 할 수준이 아니다:",
    "  - typography_hierarchy, spacing_rules, component_style 세부 수치",
    "  - shared_states, formValidation 에러 메시지, breakpoints 수치",
    "",
    "【질문 우선순위 — 화면 단위로 물어본다】",
    "  1순위: 각 화면이 어떤 모습이어야 하는지",
    "  2순위: 화면 간 이동 방식",
    "  3순위: 전체 분위기/스타일 (큰 그림 수준만)",
    "",
    "【질문 품질 규칙】",
    "- 질문은 최대 10개. 짧고 자연스럽게.",
    "- 한 질문은 하나의 주제만 묻는다.",
    "- 이전 라운드에서 이미 물어본 유형은 반복하지 않는다.",
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
    '형식: {"questions":[{"id":"...","question":"...","reason":"...","placeholder":"...","targetFields":["...","..."]}]}',
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

/**
 * 2차 인터뷰 답변 → 필드 업데이트 추출
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
      if (!firstTarget) return null;
      return {
        path: firstTarget,
        value: question.answer,
        confidence: 0.35,
        note: "AI 응답이 없어 첫 번째 대상 필드에 원문 답변을 반영했습니다.",
      };
    })
    .filter((item): item is InterviewFieldUpdate => item !== null);

  if (answeredQuestions.length === 0) return [];

  const systemPrompt = [
    "너는 UI 설계 인터뷰 답변을 구조화 JSON 필드 업데이트로 바꾸는 AI다.",
    "전체 JSON을 다시 만들지 말고 updates 배열만 반환한다.",
    "기존 status가 fulled인 값은 절대 수정하거나 덮어쓰지 않는다.",
    "",
    "【2차 인터뷰에서는 AI가 최대한 공격적으로 추론한다】",
    "사용자의 답변 하나에서 가능한 모든 null 필드를 추론하여 채워라.",
    "",
    "【추론 확장 범위 — 3단계】",
    "1단계 (직접): 사용자가 답변에서 직접 언급한 필드",
    "2단계 (같은 유형 일괄): 같은 유형의 필드가 다른 화면에도 null로 있으면 모두 함께",
    "3단계 (연쇄 추론): 이번 라운드의 답변 전체 맥락에서 관련 필드를 최대한 추론",
    "",
    "【목표: 한 라운드(10개 질문)의 답변 적용으로 전체 null 필드의 30% 이상을 채워라.】",
    "updates 배열의 길이가 60~80개가 되는 것을 목표로 하라.",
    "",
    "【위임형 답변 처리】",
    "'알아서 해줘', '상관없어' 등 → AI가 직접 추론, confidence 0.25, note에 '사용자 위임 - AI 추론값'",
    "",
    "【confidence 기준】",
    "직접 언급: 0.9 / 논리적 도출: 0.6 / AI 추론: 0.4 / 위임: 0.25",
    "",
    '반드시 JSON만 반환. 형식: {"updates":[{"path":"...","value":"...","confidence":0.0,"note":"..."}]}',
  ].join("\n");

  const userPrompt = [
    "현재 UI 브리핑 JSON:",
    JSON.stringify(input.briefingJson, null, 2),
    "",
    "질문과 답변 묶음:",
    JSON.stringify(answeredQuestions, null, 2),
    "",
    '형식: {"updates":[{"path":"...","value":"...","confidence":0.0,"note":"..."}]}',
  ].join("\n");

  try {
    const response = await requestGeminiJson<{ updates?: unknown }>({
      taskId: "secondaryInterviewFill",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    console.log("[applyAnswers] AI raw updates 수:", Array.isArray(response.updates) ? response.updates.length : "not array");
    const updates = normalizeUpdatePayload(response.updates);
    console.log("[applyAnswers] normalize 후 updates 수:", updates.length);
    return updates.length > 0 ? updates : fallbackUpdates;
  } catch (error) {
    console.error("[applyAnswers] API 실패:", error);
    return fallbackUpdates;
  }
}

/**
 * 홈페이지 인터뷰 답변 → 홈페이지 단일 화면 구현 가이드 MD 생성
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
    "오직 홈페이지(메인 페이지) 하나만 다룬다.",
    "",
    "【반드시 포함할 섹션】",
    "# 1. 서비스 개요 (이름, 설명, 타겟, 플랫폼)",
    "# 2. 홈 화면 레이아웃 구조 (ASCII 와이어프레임)",
    "# 3. 섹션별 상세 명세 (히어로, 콘텐츠, 네비게이션)",
    "# 4. 주요 인터랙션 & CTA",
    "# 5. 디자인 톤 & 스타일 가이드",
    "# 6. 반응형 대응",
    "# 7. 컴포넌트 목록",
    "",
    "【작성 규칙】",
    "- 한국어로 작성.",
    "- 마크다운 형식.",
    "- 추론한 부분은 '(AI 제안)' 태그를 붙인다.",
    "- 백엔드, API, 데이터베이스 관련 내용은 포함하지 않는다.",
    "",
    '결과를 JSON으로 감싸서 반환: {"markdown":"..."}',
  ].join("\n");

  const userPrompt = [
    "아래 홈페이지 인터뷰 답변을 분석해서, 홈페이지 단일 화면 구현을 위한 상세 설계 마크다운 문서를 작성해라.",
    "",
    "홈페이지 인터뷰 QA:",
    JSON.stringify(qaList, null, 2),
  ].join("\n");

  try {
    const response = await requestGeminiJson<unknown>({
      taskId: "homepageMd",
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    if (response && typeof response === "object") {
      const md = (response as Record<string, unknown>).markdown;
      if (typeof md === "string" && md.trim()) return md.trim();
    }

    // If response is a plain string (unlikely with responseMimeType=json)
    if (typeof response === "string") return response;

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("[generateHomepageMd] Gemini API failed:", error);
    throw error;
  }
}
