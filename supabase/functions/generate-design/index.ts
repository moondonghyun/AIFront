import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requestGeminiJson } from "../_shared/gemini.ts";

interface FilledEntry {
  path: string;
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatusField(value: unknown): value is { value: unknown; status: string } {
  return isRecord(value) && "value" in value && "status" in value;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function collectFilledEntries(value: unknown, path = "", results: FilledEntry[] = []): FilledEntry[] {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFilledEntries(item, `${path}[${index}]`, results));
    return results;
  }

  if (isStatusField(value) && value.status === "fulled") {
    const formatted = formatValue(value.value);
    if (formatted) {
      results.push({ path, value: formatted });
    }
    return results;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    collectFilledEntries(nestedValue, path ? `${path}.${key}` : key, results);
  });
  return results;
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function findEntry(entries: FilledEntry[], keywords: string[]): FilledEntry | undefined {
  return entries.find((entry) =>
    keywords.some((keyword) => entry.path.toLowerCase().includes(keyword.toLowerCase())),
  );
}

function pickEntries(entries: FilledEntry[], keywords: string[], limit: number): FilledEntry[] {
  const matched = entries.filter((entry) =>
    keywords.some((keyword) => entry.path.toLowerCase().includes(keyword.toLowerCase())),
  );
  return matched.slice(0, limit);
}

function buildFallbackDesign(briefingJson: Record<string, unknown>) {
  const entries = collectFilledEntries(briefingJson);
  const serviceName =
    findEntry(entries, ["service.name", "service_name", "project.name", "name"])?.value || "서비스";
  const serviceSummary =
    findEntry(entries, ["summary", "description", "overview", "problem"])?.value ||
    "업로드된 요구사항을 바탕으로 정리한 서비스 개요입니다.";
  const coreValue =
    findEntry(entries, ["value", "benefit", "goal", "problem"])?.value ||
    "사용자가 핵심 문제를 빠르게 해결할 수 있게 돕는 것이 목표입니다.";
  const targetEntries = pickEntries(entries, ["user", "persona", "customer", "target"], 2);
  const featureEntries = pickEntries(entries, ["feature", "function", "requirement", "goal"], 4);
  const dataEntries = pickEntries(entries, ["data", "model", "entity", "field"], 3);

  return {
    service_name: serviceName,
    service_summary: serviceSummary,
    core_value: coreValue,
    target_users:
      targetEntries.length > 0
        ? targetEntries.map((entry, index) => ({
            persona: `핵심 사용자 ${index + 1}`,
            description: entry.value,
            needs: ["핵심 과업을 빠르게 처리하고 싶음", "복잡한 입력 없이 이해하기 쉬운 흐름 필요"],
          }))
        : [
            {
              persona: "핵심 사용자",
              description: "업로드된 요구사항을 바탕으로 서비스를 이용할 주요 사용자입니다.",
              needs: ["쉽게 이해되는 흐름", "핵심 기능의 빠른 접근"],
            },
          ],
    core_features:
      featureEntries.length > 0
        ? featureEntries.map((entry, index) => ({
            name: `핵심 기능 ${index + 1}`,
            description: entry.value,
            priority: index === 0 ? "high" : "medium",
            related_paths: [entry.path],
          }))
        : [
            {
              name: "핵심 기능 정의",
              description: "요구사항에서 가장 중요한 기능을 우선 MVP로 정리합니다.",
              priority: "high",
              related_paths: [],
            },
          ],
    data_entities:
      dataEntries.length > 0
        ? dataEntries.map((entry) => ({
            name: entry.path.split(".").slice(-2, -1)[0] || "주요 엔티티",
            description: entry.value,
            fields: [entry.path.split(".").slice(-1)[0] || "value"],
            notes: "실제 DB 설계 전에 상세 필드 정의가 필요합니다.",
          }))
        : [
            {
              name: "주요 엔티티",
              description: "서비스 운영에 필요한 기본 데이터 구조가 필요합니다.",
              fields: ["id", "name", "created_at"],
              notes: "업로드 JSON 기준으로 세부 필드를 추가 정의하세요.",
            },
          ],
    user_flows: [
      {
        name: "핵심 흐름",
        description: "사용자가 주요 작업을 완료하는 기본 시나리오입니다.",
        steps: [
          { step: 1, action: "서비스 진입", screen: "시작 화면", note: "" },
          { step: 2, action: "핵심 정보 입력 또는 확인", screen: "주요 입력 화면", note: "" },
          { step: 3, action: "결과 확인", screen: "결과 화면", note: "" },
        ],
      },
    ],
    screens: [
      {
        name: "시작 화면",
        type: "intro",
        description: "서비스 목적과 다음 행동을 안내합니다.",
        key_elements: ["서비스 소개", "시작 액션"],
        interactions: ["다음 단계로 이동"],
      },
      {
        name: "주요 입력 화면",
        type: "form",
        description: "핵심 요구사항을 입력하거나 확인합니다.",
        key_elements: ["입력 필드", "안내 문구", "저장 액션"],
        interactions: ["값 입력", "다음 단계 진행"],
      },
      {
        name: "결과 화면",
        type: "summary",
        description: "정리된 결과와 다음 액션을 제공합니다.",
        key_elements: ["결과 요약", "다음 단계 버튼"],
        interactions: ["결과 확인", "다음 단계 이동"],
      },
    ],
    open_questions: [
      {
        topic: "세부 정책 확인",
        detail: "예외 케이스와 검증 규칙은 추가 확인이 필요합니다.",
        impact: "설계 확정 전 정책이 바뀌면 구현 범위가 달라질 수 있습니다.",
      },
    ],
  };
}

function normalizeDesignDocument(candidate: unknown, fallback: ReturnType<typeof buildFallbackDesign>) {
  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const record = candidate as Record<string, unknown>;
  const targetUsers = Array.isArray(record.target_users)
    ? record.target_users
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const user = item as Record<string, unknown>;
          return {
            persona: coerceString(user.persona, "핵심 사용자"),
            description: coerceString(user.description, "주요 사용자의 목적을 추가 정리하세요."),
            needs: normalizeStringArray(user.needs),
          };
        })
        .filter(Boolean)
    : fallback.target_users;

  const coreFeatures = Array.isArray(record.core_features)
    ? record.core_features
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const feature = item as Record<string, unknown>;
          return {
            name: coerceString(feature.name, "핵심 기능"),
            description: coerceString(feature.description, "핵심 기능 설명이 필요합니다."),
            priority:
              feature.priority === "high" || feature.priority === "low" ? feature.priority : "medium",
            related_paths: normalizeStringArray(feature.related_paths),
          };
        })
        .filter(Boolean)
    : fallback.core_features;

  const dataEntities = Array.isArray(record.data_entities)
    ? record.data_entities
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const entity = item as Record<string, unknown>;
          return {
            name: coerceString(entity.name, "주요 엔티티"),
            description: coerceString(entity.description, "데이터 목적 설명이 필요합니다."),
            fields: normalizeStringArray(entity.fields),
            notes: coerceString(entity.notes),
          };
        })
        .filter(Boolean)
    : fallback.data_entities;

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
    : fallback.user_flows;

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
    : fallback.screens;

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
            impact: coerceString(question.impact, "영향도 설명이 필요합니다."),
          };
        })
        .filter(Boolean)
    : fallback.open_questions;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefingJson } = await req.json();
    const fallback = buildFallbackDesign(briefingJson as Record<string, unknown>);

    const systemPrompt = [
      "너는 업로드된 요구사항 JSON을 분석해 서비스 설계 결과를 만드는 AI 제품 설계자다.",
      "반드시 사람이 읽기 쉬운 한국어로 작성한다.",
      "출력은 구조화 JSON만 허용한다.",
      "핵심 사용자, 핵심 기능, 데이터 엔티티, 주요 화면/흐름, 확인 필요 항목을 반드시 포함한다.",
      "기존 JSON에 없는 내용을 과도하게 상상하지 말고, 불확실한 내용은 open_questions로 남긴다.",
    ].join("\n");

    const userPrompt = [
      "요구사항 JSON:",
      JSON.stringify(briefingJson, null, 2),
      "",
      '다음 형식으로만 답해라: {"service_name":"...","service_summary":"...","core_value":"...","target_users":[{"persona":"...","description":"...","needs":["..."]}],"core_features":[{"name":"...","description":"...","priority":"high|medium|low","related_paths":["..."]}],"data_entities":[{"name":"...","description":"...","fields":["..."],"notes":"..."}],"user_flows":[{"name":"...","description":"...","steps":[{"step":1,"action":"...","screen":"...","note":"..."}]}],"screens":[{"name":"...","type":"...","description":"...","key_elements":["..."],"interactions":["..."]}],"open_questions":[{"topic":"...","detail":"...","impact":"..."}]}',
    ].join("\n");

    try {
      const result = await requestGeminiJson<unknown>({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      });

      return jsonResponse({
        design: normalizeDesignDocument(result, fallback),
        source: "gemini",
      });
    } catch (error) {
      console.error("generate-design fallback:", error);
      return jsonResponse({
        design: fallback,
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("generate-design error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
