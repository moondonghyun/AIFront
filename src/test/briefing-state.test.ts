import { describe, expect, it } from "vitest";

import {
  applyInterviewUpdates,
  calculateInterviewProgress,
  collectInterviewTargets,
  collectRemainingTargets,
} from "@/lib/briefing-state";

const createBriefing = () => ({
  service: {
    name: { value: "기존 서비스명", status: "fulled" },
    summary: { value: null, status: "null" },
    audience: { value: "사장님", status: "expected" },
  },
  data: {
    entities: [
      {
        name: { value: "order", status: "fulled" },
        description: { value: null, status: "expected" },
      },
    ],
  },
});

describe("briefing-state", () => {
  it("collects only null and expected targets", () => {
    const targets = collectInterviewTargets(createBriefing());

    expect(targets.map((target) => target.path)).toEqual([
      "service.summary",
      "service.audience",
      "data.entities[0].description",
    ]);
    expect(targets.every((target) => target.status === "null" || target.status === "expected")).toBe(
      true,
    );
  });

  it("protects existing fulled values and applies only allowed updates immutably", () => {
    const briefing = createBriefing();
    const result = applyInterviewUpdates(briefing, [
      { path: "service.name", value: "새 서비스명" },
      { path: "service.summary.value", value: "가게 운영을 돕는 예약 관리 서비스" },
      { path: "service.summary.status", value: "fulled" },
      { path: "data.entities[0].description", value: "주문 정보를 저장하는 엔티티" },
    ]);

    expect(result.appliedUpdates.map((update) => update.path)).toEqual([
      "service.summary",
      "data.entities[0].description",
    ]);
    expect(result.skippedUpdates).toContainEqual({
      path: "service.summary.status",
      reason: "status-path-skipped",
    });
    expect(result.skippedUpdates).toContainEqual({
      path: "service.name",
      reason: "protected-fulled-field",
    });
    expect(result.nextBriefing).not.toBe(briefing);
    expect(briefing.service.summary.status).toBe("null");
    expect((result.nextBriefing.service as any).name.value).toBe("기존 서비스명");
    expect((result.nextBriefing.service as any).summary.status).toBe("fulled");
    expect((result.nextBriefing.data as any).entities[0].description.status).toBe("fulled");
  });

  it("calculates progress from the initial unresolved target set", () => {
    const briefing = createBriefing();
    const initialTargetPaths = collectInterviewTargets(briefing).map((target) => target.path);

    const initialProgress = calculateInterviewProgress(briefing, initialTargetPaths);
    expect(initialProgress.totalTargets).toBe(3);
    expect(initialProgress.answeredTargets).toBe(0);
    expect(initialProgress.completionPercentage).toBe(0);

    const partiallyUpdated = applyInterviewUpdates(briefing, [
      { path: "service.summary", value: "핵심 서비스 설명" },
      { path: "data.entities[0].description", value: "주문 데이터 설명" },
    ]).nextBriefing;
    const partialProgress = calculateInterviewProgress(partiallyUpdated, initialTargetPaths);

    expect(partialProgress.answeredTargets).toBe(2);
    expect(partialProgress.remainingTargets).toBe(1);
    expect(partialProgress.completionPercentage).toBe(67);

    const fullyUpdated = applyInterviewUpdates(partiallyUpdated, [
      { path: "service.audience", value: "매장 관리자와 직원" },
    ]).nextBriefing;
    const finalProgress = calculateInterviewProgress(fullyUpdated, initialTargetPaths);

    expect(finalProgress.answeredTargets).toBe(3);
    expect(finalProgress.completionRate).toBe(1);
    expect(finalProgress.completionPercentage).toBe(100);
  });

  it("preserves target context when collecting remaining unresolved fields", () => {
    const briefing = createBriefing();
    const initialTargetPaths = collectInterviewTargets(briefing).map((target) => target.path);

    const remainingTargets = collectRemainingTargets(briefing, initialTargetPaths);

    expect(remainingTargets).toEqual([
      expect.objectContaining({
        path: "service.summary",
        parentContext: "service",
        label: "summary",
      }),
      expect.objectContaining({
        path: "service.audience",
        parentContext: "service",
        label: "audience",
      }),
      expect.objectContaining({
        path: "data.entities[0].description",
        parentContext: "data > entities > order",
        label: "description",
      }),
    ]);
  });
});
