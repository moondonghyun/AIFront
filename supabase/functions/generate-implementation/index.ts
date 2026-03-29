import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requestGeminiJson } from "../_shared/gemini.ts";

interface DesignDocument {
  service_name: string;
  service_summary: string;
  core_value: string;
  core_features: Array<{
    name: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  data_entities: Array<{
    name: string;
    description: string;
    fields: string[];
  }>;
  screens: Array<{
    name: string;
    description: string;
    key_elements: string[];
  }>;
  open_questions: Array<{
    topic: string;
    detail: string;
    impact: string;
  }>;
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function buildFallbackPlan(designDoc: DesignDocument) {
  const coreFeatures = Array.isArray(designDoc.core_features) ? designDoc.core_features : [];
  const screens = Array.isArray(designDoc.screens) ? designDoc.screens : [];
  const entities = Array.isArray(designDoc.data_entities) ? designDoc.data_entities : [];
  const openQuestions = Array.isArray(designDoc.open_questions) ? designDoc.open_questions : [];

  return {
    project_name: designDoc.service_name || "프로젝트",
    summary:
      designDoc.service_summary || "설계 결과를 바탕으로 MVP 우선 구현 항목을 정리한 계획입니다.",
    mvp_priorities:
      coreFeatures.length > 0
        ? coreFeatures.slice(0, 4).map((feature) => ({
            title: feature.name,
            description: feature.description,
            priority: feature.priority,
          }))
        : [
            {
              title: "핵심 사용자 흐름 구현",
              description: "가장 중요한 사용자 작업을 먼저 동작하게 만듭니다.",
              priority: "high",
            },
          ],
    frontend_units:
      screens.length > 0
        ? screens.map((screen) => ({
            title: `${screen.name} 화면`,
            description: screen.description,
            deliverables: screen.key_elements,
            related_screens: [screen.name],
          }))
        : [
            {
              title: "주요 화면 연결",
              description: "핵심 화면과 상태 전이를 연결합니다.",
              deliverables: ["주요 화면 구현", "사용자 흐름 연결"],
              related_screens: ["메인 화면"],
            },
          ],
    backend_api_units:
      entities.length > 0
        ? entities.map((entity) => ({
            title: `${entity.name} API`,
            description: `${entity.name} 데이터를 저장하고 조회하는 API 단위입니다.`,
            endpoints: [`/api/${entity.name.toLowerCase().replace(/\s+/g, "-")}`],
            dependencies: ["DB 스키마 정의"],
          }))
        : [
            {
              title: "기본 CRUD API",
              description: "핵심 엔티티를 저장하고 조회할 최소 API가 필요합니다.",
              endpoints: ["/api/core-resource"],
              dependencies: ["DB 연결", "입력 검증"],
            },
          ],
    data_requirements:
      entities.length > 0
        ? entities.map((entity) => ({
            entity: entity.name,
            description: entity.description,
            fields: entity.fields,
            storage: "관계형 DB",
          }))
        : [
            {
              entity: "핵심 엔티티",
              description: "서비스 운영에 필요한 기본 데이터 구조입니다.",
              fields: ["id", "name", "created_at"],
              storage: "관계형 DB",
            },
          ],
    auth_requirements: [
      {
        area: "기본 접근 제어",
        required: false,
        description: "현재 요구사항상 필수 인증이 명확하지 않으면 MVP에서는 선택 적용합니다.",
        roles: [],
      },
    ],
    deployment_checklist: [
      {
        title: "환경변수 점검",
        detail: "Gemini 키와 배포 환경 설정이 올바른지 확인합니다.",
      },
      {
        title: "핵심 흐름 테스트",
        detail: "주요 사용자 흐름이 실제 데이터와 함께 동작하는지 확인합니다.",
      },
      {
        title: "오류 처리 확인",
        detail: "API 실패, 빈 응답, 권한 오류 상황에서 화면이 깨지지 않는지 확인합니다.",
      },
    ],
    expansion_points:
      openQuestions.length > 0
        ? openQuestions.map((item) => ({
            title: item.topic,
            description: item.detail,
            next_step: item.impact,
          }))
        : [
            {
              title: "후속 기능 확장",
              description: "MVP 안정화 후 부가 기능과 운영 기능을 확장합니다.",
              next_step: "추가 API와 상세 정책을 연결합니다.",
            },
          ],
  };
}

function normalizePlan(candidate: unknown, fallback: ReturnType<typeof buildFallbackPlan>) {
  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const record = candidate as Record<string, unknown>;

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
    : fallback.mvp_priorities;

  const frontendUnits = Array.isArray(record.frontend_units)
    ? record.frontend_units
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const unit = item as Record<string, unknown>;
          return {
            title: coerceString(unit.title, "프론트엔드 단위"),
            description: coerceString(unit.description, "프론트엔드 구현 설명이 필요합니다."),
            deliverables: normalizeStringArray(unit.deliverables),
            related_screens: normalizeStringArray(unit.related_screens),
          };
        })
        .filter(Boolean)
    : fallback.frontend_units;

  const backendUnits = Array.isArray(record.backend_api_units)
    ? record.backend_api_units
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const unit = item as Record<string, unknown>;
          return {
            title: coerceString(unit.title, "백엔드/API 단위"),
            description: coerceString(unit.description, "백엔드 구현 설명이 필요합니다."),
            endpoints: normalizeStringArray(unit.endpoints),
            dependencies: normalizeStringArray(unit.dependencies),
          };
        })
        .filter(Boolean)
    : fallback.backend_api_units;

  const dataRequirements = Array.isArray(record.data_requirements)
    ? record.data_requirements
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const requirement = item as Record<string, unknown>;
          return {
            entity: coerceString(requirement.entity, "주요 엔티티"),
            description: coerceString(requirement.description, "데이터 요구사항 설명이 필요합니다."),
            fields: normalizeStringArray(requirement.fields),
            storage: coerceString(requirement.storage, "DB"),
          };
        })
        .filter(Boolean)
    : fallback.data_requirements;

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
            description: coerceString(requirement.description, "인증 정책 설명이 필요합니다."),
            roles: normalizeStringArray(requirement.roles),
          };
        })
        .filter(Boolean)
    : fallback.auth_requirements;

  const deploymentChecklist = Array.isArray(record.deployment_checklist)
    ? record.deployment_checklist
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const checklist = item as Record<string, unknown>;
          return {
            title: coerceString(checklist.title, "배포 체크"),
            detail: coerceString(checklist.detail, "체크 항목 설명이 필요합니다."),
          };
        })
        .filter(Boolean)
    : fallback.deployment_checklist;

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
    : fallback.expansion_points;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { designDoc } = await req.json();
    const fallback = buildFallbackPlan(designDoc as DesignDocument);

    const systemPrompt = [
      "너는 설계 결과를 바탕으로 구현 계획을 만드는 AI 테크 리드다.",
      "출력은 구조화 JSON만 허용한다.",
      "반드시 MVP 우선순위, 프론트엔드 구현 단위, 백엔드/API 구현 단위, 데이터/DB 요구사항, 인증/권한, 배포 체크리스트, 확장 포인트를 포함한다.",
      "과도한 상상 대신 현재 설계 문서에서 바로 이어질 수 있는 계획만 정리한다.",
    ].join("\n");

    const userPrompt = [
      "설계 결과 JSON:",
      JSON.stringify(designDoc, null, 2),
      "",
      '다음 형식으로만 답해라: {"project_name":"...","summary":"...","mvp_priorities":[{"title":"...","description":"...","priority":"high|medium|low"}],"frontend_units":[{"title":"...","description":"...","deliverables":["..."],"related_screens":["..."]}],"backend_api_units":[{"title":"...","description":"...","endpoints":["..."],"dependencies":["..."]}],"data_requirements":[{"entity":"...","description":"...","fields":["..."],"storage":"..."}],"auth_requirements":[{"area":"...","required":true,"description":"...","roles":["..."]}],"deployment_checklist":[{"title":"...","detail":"..."}],"expansion_points":[{"title":"...","description":"...","next_step":"..."}]}',
    ].join("\n");

    try {
      const result = await requestGeminiJson<unknown>({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      });

      return jsonResponse({
        plan: normalizePlan(result, fallback),
        source: "gemini",
      });
    } catch (error) {
      console.error("generate-implementation fallback:", error);
      return jsonResponse({
        plan: fallback,
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("generate-implementation error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
