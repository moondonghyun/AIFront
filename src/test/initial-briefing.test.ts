import { describe, expect, it } from "vitest";

import { isStatusField } from "@/lib/briefing-state";
import {
  buildFallbackInitialBriefing,
  buildImplementationReadinessReport,
  normalizeInitialBriefing,
  type FirstInterviewResponse,
} from "@/lib/initial-briefing";

const responses: FirstInterviewResponse[] = [
  { id: 1, label: "서비스 정의", question: "어떤 서비스인가요?", answer: "매장 예약과 일정 조정을 쉽게 도와주는 서비스예요." },
  { id: 2, label: "사용자", question: "누가 사용하나요?", answer: "사장님과 매장 직원이 함께 써요." },
  { id: 3, label: "문제", question: "어떤 문제가 있나요?", answer: "전화 예약이 자주 겹치고 누락돼요." },
  { id: 4, label: "데이터", question: "무엇을 관리하나요?", answer: "예약 정보, 고객 메모, 담당 직원" },
  { id: 5, label: "행동", question: "주요 행동은?", answer: "예약 등록, 예약 확인, 일정 변경, 알림 발송" },
  { id: 6, label: "흐름", question: "주요 흐름은?", answer: "예약 요청을 받고 확인한 뒤 시간을 배정하고 확정해요." },
  { id: 7, label: "권한", question: "역할 차이는?", answer: "직원은 예약만 보고 사장님은 전체 수정과 승인까지 해요." },
  { id: 8, label: "운영", question: "관리자는 뭘 하나요?", answer: "취소 처리와 일정 조정, 운영 통계를 봐야 해요." },
  { id: 9, label: "수익화", question: "어떻게 돈을 버나요?", answer: "처음엔 무료이고 나중에 구독 플랜을 붙일 거예요." },
  { id: 10, label: "연동", question: "외부 연동은?", answer: "카카오 알림과 문자 연동이 필요해요." },
  { id: 11, label: "MVP", question: "가장 중요한 기능은?", answer: "예약 관리와 알림이 먼저 필요해요." },
  { id: 12, label: "제약", question: "꼭 지켜야 할 점은?", answer: "모바일에서 쉽게 써야 하고 개인정보 처리가 필요해요." },
];

function fillAllStatusFields(value: unknown, path = "root"): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => fillAllStatusFields(item, `${path}[${index}]`));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (isStatusField(value)) {
    return {
      value:
        value.value !== null && value.value !== undefined && value.value !== ""
          ? value.value
          : `filled:${path}`,
      status: "fulled",
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, fillAllStatusFields(nestedValue, `${path}.${key}`)]),
  );
}

function collectStatusStats(
  value: unknown,
  stats = { fulled: 0, expected: 0, nulls: 0 },
): { fulled: number; expected: number; nulls: number } {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStatusStats(item, stats));
    return stats;
  }

  if (!value || typeof value !== "object") {
    return stats;
  }

  if (isStatusField(value)) {
    if (value.status === "fulled") stats.fulled += 1;
    if (value.status === "expected") stats.expected += 1;
    if (value.status === "null") stats.nulls += 1;
    return stats;
  }

  Object.values(value).forEach((item) => collectStatusStats(item, stats));
  return stats;
}

describe("initial briefing schema", () => {
  it("builds an implementation-grade scaffold from the first interview", () => {
    const briefing = buildFallbackInitialBriefing(responses);
    const report = buildImplementationReadinessReport(briefing);
    const stats = collectStatusStats(briefing);

    expect(report.missingBranches).toEqual([]);
    expect(report.missingCriticalPaths).toEqual([]);
    expect(report.readyIfFilled).toBe(true);
    expect(report.implementationReadyNow).toBe(false);
    expect((briefing.service as Record<string, any>).summary.status).toBe("fulled");
    expect((briefing.features as Record<string, any>).mvp.length).toBeGreaterThan(0);
    expect((briefing.screens as Array<Record<string, any>>).length).toBeGreaterThanOrEqual(4);
    expect((briefing.core_entities as Array<Record<string, any>>).length).toBeGreaterThanOrEqual(3);
    expect((briefing.users as Array<Record<string, any>>)[0].role.status).toBe("fulled");
    expect(stats.expected + stats.nulls).toBeGreaterThanOrEqual(28);
    expect(stats.expected + stats.nulls).toBeLessThanOrEqual(130);
    expect(stats.fulled).toBeGreaterThan(12);
  });

  it("keeps the schema shape even when AI output is partial or malformed", () => {
    const fallback = buildFallbackInitialBriefing(responses);
    const normalized = normalizeInitialBriefing(
      {
        service: {
          summary: { value: "", status: "fulled" },
          target_platform: { value: "모바일 앱", status: "expected" },
        },
        users: [{ role: { value: "사장님", status: "fulled" } }],
        features: {
          mvp: [{ name: { value: "예약 관리", status: "fulled" } }],
        },
      },
      fallback,
    );

    expect((normalized.service as Record<string, any>).summary.value).toBe(
      (fallback.service as Record<string, any>).summary.value,
    );
    expect((normalized.service as Record<string, any>).target_platform.value).toBe("모바일 앱");
    expect((normalized.users as Array<Record<string, any>>)[0].description).toBeDefined();
    expect((normalized.features as Record<string, any>).mvp[0].business_logic).toBeDefined();
  });

  it("becomes implementation-ready when every status field is filled", () => {
    const briefing = buildFallbackInitialBriefing(responses);
    const completed = fillAllStatusFields(briefing) as Record<string, unknown>;
    const report = buildImplementationReadinessReport(completed);

    expect(report.readyIfFilled).toBe(true);
    expect(report.implementationReadyNow).toBe(true);
    expect(report.unresolvedCriticalPaths).toEqual([]);
  });
});
