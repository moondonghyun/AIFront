import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requestGeminiJson } from "../_shared/gemini.ts";

interface InterviewTarget {
  path: string;
  status: "null" | "expected";
  currentValue: unknown;
  parentContext: string;
  label: string;
}

interface InterviewHistoryEntry {
  questionId: string;
  question: string;
  reason: string;
  placeholder: string;
  targetFields: string[];
  answer: string;
}

interface GeneratedQuestion {
  id: string;
  question: string;
  reason: string;
  placeholder: string;
  targetFields: string[];
}

interface GenerateInterviewResponse {
  question: GeneratedQuestion | null;
  stop: boolean;
  stopReason: string;
  source: "gemini" | "fallback";
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function coerceTargetFields(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function createFallbackQuestion(target: InterviewTarget): GeneratedQuestion {
  const context = target.parentContext ? `${target.parentContext} > ${target.label}` : target.label;
  return {
    id: `fallback-${Date.now()}`,
    question: `${context}에 대해 조금 더 알려주세요.`,
    reason: "이 내용을 알아야 다음 설계와 구현 계획을 구체적으로 정리할 수 있습니다.",
    placeholder: `${target.label}에 대해 예시, 원하는 방식, 꼭 필요한 조건을 편하게 적어주세요.`,
    targetFields: [target.path],
  };
}

function normalizeQuestion(candidate: unknown, fallbackTarget: InterviewTarget): GeneratedQuestion {
  if (!candidate || typeof candidate !== "object") {
    return createFallbackQuestion(fallbackTarget);
  }

  const record = candidate as Record<string, unknown>;
  const targetFields = coerceTargetFields(record.targetFields);
  const question = coerceString(record.question);
  const reason = coerceString(
    record.reason,
    "이 질문의 답이 있어야 설계와 구현 계획을 더 정확하게 만들 수 있습니다.",
  );
  const placeholder = coerceString(
    record.placeholder,
    `${fallbackTarget.label}에 대한 예시나 원하는 방향을 적어주세요.`,
  );

  if (!question || targetFields.length === 0) {
    return createFallbackQuestion(fallbackTarget);
  }

  return {
    id: coerceString(record.id, `q-${Date.now()}`),
    question,
    reason,
    placeholder,
    targetFields,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      briefingJson,
      unresolvedTargets,
      interviewHistory,
      filledSummary,
    } = await req.json();

    const targets = Array.isArray(unresolvedTargets)
      ? unresolvedTargets.filter(
          (item): item is InterviewTarget =>
            item &&
            typeof item === "object" &&
            typeof item.path === "string" &&
            (item.status === "null" || item.status === "expected"),
        )
      : [];

    if (targets.length === 0) {
      return jsonResponse({
        question: null,
        stop: true,
        stopReason: "no-unresolved-targets",
        source: "fallback",
      });
    }

    const fallbackTarget = targets[0];

    const safeHistory = Array.isArray(interviewHistory)
      ? interviewHistory.filter(
          (item): item is InterviewHistoryEntry =>
            item &&
            typeof item === "object" &&
            typeof item.question === "string" &&
            typeof item.answer === "string",
        )
      : [];

    const safeFilledSummary = Array.isArray(filledSummary) ? filledSummary.slice(0, 20) : [];

    const systemPrompt = [
      "너는 업로드된 요구사항 JSON을 바탕으로 추가 인터뷰 질문을 만드는 AI 인터뷰어다.",
      "반드시 쉬운 한국어를 사용한다.",
      "한 번에 질문은 1개만 만든다.",
      "질문은 한 주제만 다뤄야 한다.",
      "질문 이유(reason)는 짧고 분명해야 한다.",
      "placeholder는 사용자가 어떤 형식으로 답하면 되는지 예시처럼 적는다.",
      "이미 fulled인 값은 다시 묻지 않는다.",
      "targetFields에는 이번 질문으로 채우려는 경로만 넣는다.",
      "반드시 JSON만 반환한다.",
    ].join("\n");

    const userPrompt = [
      "현재 구조화 JSON:",
      JSON.stringify(briefingJson, null, 2),
      "",
      "아직 채워야 하는 후보:",
      JSON.stringify(targets, null, 2),
      "",
      "이미 채워진 fulled 요약:",
      JSON.stringify(safeFilledSummary, null, 2),
      "",
      "이전 QA 히스토리:",
      JSON.stringify(safeHistory, null, 2),
      "",
      '다음 형식으로만 답해라: {"question":{"id":"...","question":"...","reason":"...","placeholder":"...","targetFields":["..."]},"stop":false,"stopReason":"..."}',
      "정말 더 물을 것이 없으면 question을 null로 두고 stop을 true로 반환한다.",
    ].join("\n");

    try {
      const result = await requestGeminiJson<{
        question?: unknown;
        stop?: unknown;
        stopReason?: unknown;
      }>({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      });

      const stop = result.stop === true;
      if (stop) {
        return jsonResponse({
          question: null,
          stop: true,
          stopReason: coerceString(result.stopReason, "gemini-stop"),
          source: "gemini",
        });
      }

      return jsonResponse({
        question: normalizeQuestion(result.question, fallbackTarget),
        stop: false,
        stopReason: coerceString(result.stopReason),
        source: "gemini",
      });
    } catch (error) {
      console.error("generate-interview fallback:", error);
      return jsonResponse({
        question: createFallbackQuestion(fallbackTarget),
        stop: false,
        stopReason: "fallback-question",
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("generate-interview error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
