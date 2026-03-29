import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import JsonUploadScreen from "@/components/JsonUploadScreen";
import QuestionScreen from "@/components/QuestionScreen";
import type { Question } from "@/data/questions";

describe("unchanged fixed flow components", () => {
  it("keeps the fixed interview textarea behavior", () => {
    const question: Question = {
      id: 1,
      title: "서비스를 설명해 주세요",
      placeholder: "예: 동네 매장 예약을 도와주는 서비스입니다.",
    };
    const onAnswer = vi.fn();
    const onNext = vi.fn();

    render(
      <QuestionScreen
        question={question}
        step={0}
        total={1}
        answer=""
        direction={1}
        onAnswer={onAnswer}
        onNext={onNext}
        onPrev={vi.fn()}
        isFirst
        isLast
      />,
    );

    const textarea = screen.getByPlaceholderText(question.placeholder);
    fireEvent.change(textarea, { target: { value: "예약 서비스입니다." } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    expect(onAnswer).toHaveBeenCalledWith("예약 서비스입니다.");
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("parses uploaded JSON and forwards it immediately", async () => {
    const onUpload = vi.fn();
    const { container } = render(<JsonUploadScreen onUpload={onUpload} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(['{"service":{"name":"demo"}}'], "briefing.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue('{"service":{"name":"demo"}}'),
    });

    fireEvent.change(input!, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith({ service: { name: "demo" } });
    });
  });
});
