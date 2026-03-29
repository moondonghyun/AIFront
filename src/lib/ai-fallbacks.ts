import { collectFilledFieldSummary, isStatusField } from "@/lib/briefing-state";
import type { DesignDocument } from "@/lib/design-types";
import type { ImplementationPlan } from "@/lib/implementation-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFieldText(value: unknown): string {
  if (isStatusField(value)) {
    return readFieldText(value.value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function readFieldArray(value: unknown): string[] {
  if (isStatusField(value)) {
    return readFieldArray(value.value);
  }

  if (!Array.isArray(value)) {
    const single = readFieldText(value);
    return single ? [single] : [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return item.trim() ? [item.trim()] : [];
      }
      if (typeof item === "number" || typeof item === "boolean") {
        return [String(item)];
      }
      return [];
    })
    .filter(Boolean);
}

function findSummaryValue(
  summary: Array<{ path: string; value: string }>,
  keywords: string[],
): string | undefined {
  return summary.find((item) =>
    keywords.some((keyword) => item.path.toLowerCase().includes(keyword.toLowerCase())),
  )?.value;
}

function pickSummaryEntries(
  summary: Array<{ path: string; value: string }>,
  keywords: string[],
  limit: number,
) {
  return summary
    .filter((item) =>
      keywords.some((keyword) => item.path.toLowerCase().includes(keyword.toLowerCase())),
    )
    .slice(0, limit);
}

export function buildFallbackDesignDocument(briefingJson: Record<string, unknown>): DesignDocument {
  const summary = collectFilledFieldSummary(briefingJson, 24);
  const targetEntries = pickSummaryEntries(summary, ["user", "persona", "customer", "target"], 2);
  const featureEntries = pickSummaryEntries(summary, ["feature", "function", "requirement", "goal"], 4);
  const dataEntries = pickSummaryEntries(summary, ["data", "model", "entity", "field"], 3);
  const users = Array.isArray(briefingJson.users) ? briefingJson.users : [];
  const entities = Array.isArray(briefingJson.core_entities) ? briefingJson.core_entities : [];
  const screens = Array.isArray(briefingJson.screens) ? briefingJson.screens : [];
  const flows = Array.isArray(briefingJson.user_flows) ? briefingJson.user_flows : [];
  const mvpFeatures = Array.isArray(asRecord(briefingJson.features)?.mvp)
    ? (asRecord(briefingJson.features)?.mvp as unknown[])
    : [];
  const openQuestionSeeds = Array.isArray(briefingJson.second_interview_topics)
    ? briefingJson.second_interview_topics
    : [];

  return {
    service_name:
      findSummaryValue(summary, ["service.name", "service_name", "project.name", "name"]) || "서비스",
    service_summary:
      findSummaryValue(summary, ["summary", "description", "overview", "problem"]) ||
      "업로드된 요구사항을 기반으로 정리한 서비스 개요입니다.",
    core_value:
      findSummaryValue(summary, ["value", "benefit", "goal", "problem"]) ||
      "사용자가 핵심 문제를 빠르게 해결할 수 있게 돕는 것이 목표입니다.",
    target_users:
      users.length > 0
        ? users.slice(0, 4).map((user, index) => {
            const record = asRecord(user) || {};
            return {
              persona: readFieldText(record.role) || `핵심 사용자 ${index + 1}`,
              description:
                readFieldText(record.description) ||
                readFieldArray(record.goals).join(", ") ||
                "이 서비스의 핵심 사용자입니다.",
              needs:
                readFieldArray(record.key_actions).slice(0, 4).length > 0
                  ? readFieldArray(record.key_actions).slice(0, 4)
                  : ["쉽게 이해되는 흐름", "핵심 기능에 빠르게 접근하고 싶음"],
            };
          })
        : targetEntries.length > 0
        ? targetEntries.map((entry, index) => ({
            persona: `핵심 사용자 ${index + 1}`,
            description: entry.value,
            needs: ["쉽게 이해되는 흐름", "핵심 기능에 빠르게 접근하고 싶음"],
          }))
        : [
            {
              persona: "핵심 사용자",
              description: "업로드된 요구사항을 기반으로 서비스를 사용할 주요 사용자입니다.",
              needs: ["쉽게 이해되는 흐름", "핵심 기능에 빠르게 접근하고 싶음"],
            },
          ],
    core_features:
      mvpFeatures.length > 0
        ? mvpFeatures.slice(0, 8).map((feature, index) => {
            const record = asRecord(feature) || {};
            const relatedPaths = [
              `features.mvp[${index}].name`,
              `features.mvp[${index}].business_logic`,
            ];
            return {
              name: readFieldText(record.name) || `핵심 기능 ${index + 1}`,
              description:
                readFieldText(record.description) ||
                readFieldArray(record.business_logic).join(", ") ||
                "요구사항에서 도출한 핵심 기능입니다.",
              priority: index < 3 ? "high" : index < 6 ? "medium" : "low",
              related_paths: relatedPaths,
            };
          })
        : featureEntries.length > 0
        ? featureEntries.map((entry, index) => ({
            name: `핵심 기능 ${index + 1}`,
            description: entry.value,
            priority: index === 0 ? "high" : "medium",
            related_paths: [entry.path],
          }))
        : [
            {
              name: "핵심 기능 정의",
              description: "요구사항에서 가장 중요한 기능을 MVP 기준으로 우선 정리합니다.",
              priority: "high",
              related_paths: [],
            },
          ],
    data_entities:
      entities.length > 0
        ? entities.slice(0, 6).map((entity, index) => {
            const record = asRecord(entity) || {};
            const fallbackFields = readFieldArray(record.key_fields).slice(0, 6);
            return {
              name: readFieldText(record.name) || `주요 엔티티 ${index + 1}`,
              description: readFieldText(record.description) || "서비스 운영에 필요한 핵심 데이터입니다.",
              fields: fallbackFields.length > 0 ? fallbackFields : ["id", "name", "status"],
              notes:
                readFieldArray(record.relationships).join(", ") ||
                "엔티티 간 관계와 저장 규칙을 후속 설계에서 확정합니다.",
            };
          })
        : dataEntries.length > 0
        ? dataEntries.map((entry) => ({
            name: entry.path.split(".").slice(-2, -1)[0] || "주요 엔티티",
            description: entry.value,
            fields: [entry.path.split(".").slice(-1)[0] || "value"],
            notes: "실제 DB 설계 전에 상세 필드 정의가 더 필요합니다.",
          }))
        : [
            {
              name: "주요 엔티티",
              description: "서비스 운영에 필요한 기본 데이터 구조입니다.",
              fields: ["id", "name", "created_at"],
              notes: "업로드 JSON 기준으로 세부 필드를 추가 정의하세요.",
            },
          ],
    user_flows:
      flows.length > 0
        ? flows.slice(0, 5).map((flow, index) => {
            const record = asRecord(flow) || {};
            const steps = readFieldArray(record.steps);
            return {
              name: readFieldText(record.name) || `핵심 흐름 ${index + 1}`,
              description:
                readFieldArray(record.success_condition).join(", ") ||
                `${readFieldText(record.primary_actor) || "사용자"}의 대표 시나리오입니다.`,
              steps:
                steps.length > 0
                  ? steps.slice(0, 6).map((step, stepIndex) => ({
                      step: stepIndex + 1,
                      action: step,
                      screen: readFieldText(asRecord(screens[stepIndex])?.name) || `화면 ${stepIndex + 1}`,
                      note: stepIndex === steps.length - 1 ? "완료 조건 확인" : "",
                    }))
                  : [
                      { step: 1, action: "서비스 진입", screen: "홈", note: "" },
                      { step: 2, action: "핵심 정보 탐색", screen: "탐색 화면", note: "" },
                      { step: 3, action: "주요 행동 완료", screen: "완료 화면", note: "" },
                    ],
            };
          })
        : [
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
    screens:
      screens.length > 0
        ? screens.slice(0, 8).map((screen, index) => {
            const record = asRecord(screen) || {};
            const keyElements = readFieldArray(record.key_sections).slice(0, 6);
            const interactions = readFieldArray(record.required_actions).slice(0, 6);
            const screenName = readFieldText(record.name) || `주요 화면 ${index + 1}`;
            return {
              name: screenName,
              type:
                /홈|메인/u.test(screenName)
                  ? "home"
                  : /상세/u.test(screenName)
                    ? "detail"
                    : /주문|예약|결제/u.test(screenName)
                      ? "transaction"
                      : /채팅|문의/u.test(screenName)
                        ? "communication"
                        : /관리|운영|검수/u.test(screenName)
                          ? "dashboard"
                          : "screen",
              description:
                `${readFieldArray(record.primary_users).join(", ") || "핵심 사용자"}가 사용하는 ${screenName}입니다.`,
              key_elements: keyElements.length > 0 ? keyElements : ["핵심 정보", "대표 CTA"],
              interactions: interactions.length > 0 ? interactions : ["탭 이동", "주요 액션 실행"],
            };
          })
        : [
            {
              name: "시작 화면",
              type: "intro",
              description: "서비스 목적과 다음 행동을 안내합니다.",
              key_elements: ["서비스 소개", "시작 액션"],
              interactions: ["다음 단계 이동"],
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
    open_questions:
      openQuestionSeeds.length > 0
        ? openQuestionSeeds.slice(0, 6).map((item) => {
            const record = asRecord(item) || {};
            return {
              topic: String(record.topic || "추가 확인 필요"),
              detail: String(record.why_missing || "세부 확인이 더 필요합니다."),
              impact: String(record.suggested_question || "후속 인터뷰에서 확인합니다."),
            };
          })
        : [
            {
              topic: "세부 정책 확인",
              detail: "예외 케이스와 검증 규칙은 추가 확인이 필요합니다.",
              impact: "정책이 바뀌면 구현 범위와 검증 로직이 달라질 수 있습니다.",
            },
          ],
  };
}

export function buildFallbackImplementationPlan(
  designDocument: DesignDocument,
): ImplementationPlan {
  return {
    project_name: designDocument.service_name || "프로젝트",
    summary:
      designDocument.service_summary || "설계 결과를 바탕으로 MVP 우선 구현 항목을 정리한 계획입니다.",
    mvp_priorities:
      designDocument.core_features.length > 0
        ? designDocument.core_features.slice(0, 4).map((feature) => ({
            title: feature.name,
            description: feature.description,
            priority: feature.priority,
          }))
        : [
            {
              title: "핵심 사용자 흐름 구현",
              description: "가장 중요한 사용자 작업이 먼저 끝까지 동작하도록 만듭니다.",
              priority: "high",
            },
          ],
    frontend_units:
      designDocument.screens.length > 0
        ? designDocument.screens.map((screen) => ({
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
      designDocument.data_entities.length > 0
        ? designDocument.data_entities.map((entity) => ({
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
      designDocument.data_entities.length > 0
        ? designDocument.data_entities.map((entity) => ({
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
      designDocument.open_questions.length > 0
        ? designDocument.open_questions.map((item) => ({
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
