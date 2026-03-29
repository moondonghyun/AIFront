import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewTarget } from "@/lib/briefing-state";

vi.mock("@/lib/ai-config", () => ({
  getAiTaskRuntime: () => ({
    task: { id: "secondaryInterviewQuestion", label: "2차 인터뷰 질문 생성" },
    provider: {
      id: "gemini",
      label: "Google Gemini",
      apiKeyEnvKeys: ["VITE_GEMINI_API_KEY"],
      defaultModelEnvKey: "VITE_GEMINI_MODEL",
      baseUrl: "https://example.com/models",
    },
    apiKeyEnvKeys: ["VITE_GEMINI_API_KEY"],
    apiKey: "test-key",
    model: "gemini-3.1-flash-lite-preview",
    fallbackModels: [],
    endpoint: "https://example.com/models/gemini-3.1-flash-lite-preview:generateContent",
  }),
}));

import { generateInterviewQuestionBatchDirect } from "@/lib/gemini-direct";

const unresolvedTargets: InterviewTarget[] = [
  {
    path: "users[0].role",
    status: "null",
    currentValue: null,
    parentContext: "users > primary user",
    label: "role",
  },
  {
    path: "users[0].description",
    status: "expected",
    currentValue: null,
    parentContext: "users > primary user",
    label: "description",
  },
];

describe("generateInterviewQuestionBatchDirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("replaces duplicate placeholder text with input guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      questions: [
                        {
                          id: "q-1",
                          question: "주요 사용자는 누구이고 어떤 상황에서 이 서비스를 쓰나요?",
                          reason: "사용자와 사용 상황을 알아야 화면 흐름을 정할 수 있습니다.",
                          placeholder: "주요 사용자는 누구이고 어떤 상황에서 이 서비스를 쓰나요?",
                          targetFields: ["users[0].role", "users[0].description"],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const result = await generateInterviewQuestionBatchDirect({
      briefingJson: {
        users: [
          {
            role: { value: null, status: "null" },
            description: { value: null, status: "expected" },
          },
        ],
      },
      unresolvedTargets,
      interviewHistory: [],
      filledSummary: [],
      maxQuestions: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("주요 사용자는 누구이고 어떤 상황에서 이 서비스를 쓰나요?");
    expect(result[0].placeholder).not.toBe(result[0].question);
    expect(result[0].placeholder.startsWith("예:")).toBe(true);
    expect(result[0].placeholder).toMatch(/사장님|주민|사용자/u);
    expect(result[0].placeholder).toMatch(/해요|입니다|있어요|할 수 있어요/u);
    expect(result[0].placeholder).not.toMatch(/적어주세요|알려주세요|입력해/u);
    expect(result[0].targetFields).toEqual(["users[0].role", "users[0].description"]);
  });

  it("replaces instruction-like placeholders with concrete example answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      questions: [
                        {
                          id: "q-2",
                          question: "판매자와 소비자가 각각 어떤 일을 해야 하나요?",
                          reason: "권한과 운영 흐름을 나누려면 역할 차이가 필요합니다.",
                          placeholder: "예: 판매자와 소비자가 할 일을 적어주세요.",
                          targetFields: ["users[0].role", "users[0].description"],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const result = await generateInterviewQuestionBatchDirect({
      briefingJson: {
        users: [
          {
            role: { value: null, status: "null" },
            description: { value: null, status: "expected" },
          },
        ],
      },
      unresolvedTargets,
      interviewHistory: [],
      filledSummary: [],
      maxQuestions: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].placeholder.startsWith("예:")).toBe(true);
    expect(result[0].placeholder).not.toMatch(/적어주세요|알려주세요|입력해/u);
    expect(result[0].placeholder).toMatch(/사장님|주민|판매자|소비자/u);
  });
});
