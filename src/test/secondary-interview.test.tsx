import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SecondaryInterviewScreen from "@/components/SecondaryInterviewScreen";

describe("SecondaryInterviewScreen", () => {
  it("submits a batch of answers after collecting every question in the round", () => {
    const onComplete = vi.fn();

    render(
      <SecondaryInterviewScreen
        questions={[
          {
            id: "q1",
            question: "서비스 설명과 주요 기능을 함께 알려주세요.",
            reason: "관련된 여러 빈칸을 한 번에 채우기 위해서입니다.",
            placeholder: "예: 예약 관리 서비스이고, 실시간 현황과 알림 기능이 필요해요.",
            targetFields: ["service.summary", "service.features"],
          },
          {
            id: "q2",
            question: "주 사용자는 누구이고 어떤 상황에서 쓰나요?",
            reason: "핵심 사용자와 사용 맥락을 함께 정리하려고 합니다.",
            placeholder: "예: 매장 직원이 바쁜 시간대에 예약을 빠르게 확인할 때 사용해요.",
            targetFields: ["users.primary", "usage.context"],
          },
        ]}
        progress={{
          totalTargets: 10,
          answeredTargets: 5,
          remainingTargets: 5,
          completionRate: 0.5,
          completionPercentage: 50,
        }}
        onComplete={onComplete}
        onBack={vi.fn()}
      />,
    );

    const firstTextarea = screen.getByPlaceholderText(
      "예: 예약 관리 서비스이고, 실시간 현황과 알림 기능이 필요해요.",
    );
    fireEvent.change(firstTextarea, {
      target: { value: "매장 예약을 정리하는 서비스이고, 알림과 현황판이 필요해요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));

    const secondTextarea = screen.getByPlaceholderText(
      "예: 매장 직원이 바쁜 시간대에 예약을 빠르게 확인할 때 사용해요.",
    );
    fireEvent.change(secondTextarea, {
      target: { value: "매장 직원이 점심 시간대에 예약을 빠르게 확인할 때 사용해요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "이번 묶음 반영하기" }));

    expect(onComplete).toHaveBeenCalledWith({
      q1: "매장 예약을 정리하는 서비스이고, 알림과 현황판이 필요해요.",
      q2: "매장 직원이 점심 시간대에 예약을 빠르게 확인할 때 사용해요.",
    });
  });
});
