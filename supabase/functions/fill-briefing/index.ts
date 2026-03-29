import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requestGeminiJson } from "../_shared/gemini.ts";

interface GeneratedQuestion {
  id: string;
  question: string;
  reason: string;
  placeholder: string;
  targetFields: string[];
}

interface InterviewFieldUpdate {
  path: string;
  value: unknown;
  confidence?: number;
  note?: string;
}

interface FillBriefingResponse {
  updates: InterviewFieldUpdate[];
  source: "gemini" | "fallback";
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUpdates(candidate: unknown): InterviewFieldUpdate[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
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

function createFallbackUpdates(question: GeneratedQuestion, answer: string): InterviewFieldUpdate[] {
  const firstTarget = question.targetFields[0];
  if (!firstTarget || !answer.trim()) {
    return [];
  }

  return [
    {
      path: firstTarget,
      value: answer.trim(),
      confidence: 0.35,
      note: "Gemini 응답 실패로 첫 번째 대상 필드에만 원문 답변을 반영했습니다.",
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefingJson, question, answer } = await req.json();
    const safeQuestion = question as GeneratedQuestion;
    const safeAnswer = coerceString(answer);

    if (!safeQuestion || !Array.isArray(safeQuestion.targetFields)) {
      return jsonResponse({ error: "Invalid question payload" }, { status: 400 });
    }

    if (!safeAnswer) {
      return jsonResponse({
        updates: [],
        source: "fallback",
      });
    }

    const systemPrompt = [
      "너는 사용자의 답변을 구조화 JSON 필드 업데이트로 바꾸는 AI다.",
      "전체 JSON을 다시 만들지 말고, updates 배열만 반환한다.",
      "기존 status가 fulled인 값은 절대 수정하거나 덮어쓰지 않는다.",
      "이번 질문과 직접 관련된 경로만 업데이트한다.",
      "가능하면 사용자의 답변을 그대로 유지하되 필요할 때만 짧게 정리한다.",
      "반드시 JSON만 반환한다.",
    ].join("\n");

    const userPrompt = [
      "현재 JSON:",
      JSON.stringify(briefingJson, null, 2),
      "",
      "직전 질문:",
      JSON.stringify(safeQuestion, null, 2),
      "",
      "사용자 답변:",
      safeAnswer,
      "",
      '다음 형식으로만 답해라: {"updates":[{"path":"...","value":"...","confidence":0.0,"note":"..."}]}',
      "질문과 무관하거나 확신이 없으면 updates를 빈 배열로 둘 수 있다.",
    ].join("\n");

    try {
      const result = await requestGeminiJson<{ updates?: unknown }>({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
      });

      const updates = normalizeUpdates(result.updates);
      return jsonResponse({
        updates: updates.length > 0 ? updates : createFallbackUpdates(safeQuestion, safeAnswer),
        source: "gemini",
      });
    } catch (error) {
      console.error("fill-briefing fallback:", error);
      return jsonResponse({
        updates: createFallbackUpdates(safeQuestion, safeAnswer),
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("fill-briefing error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
