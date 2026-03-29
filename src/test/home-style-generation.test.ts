import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai-config", () => ({
  getAiTaskRuntime: () => ({
    task: { id: "homeStyleConcepts", label: "홈 UI 3안 생성" },
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

import { generateRenderedHomeStyleOptionsDirect } from "@/lib/gemini-direct";

describe("generateRenderedHomeStyleOptionsDirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds a JSON-only Gemini prompt and still returns fallback home screens on failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network-error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateRenderedHomeStyleOptionsDirect({
      briefingJson: {
        service: {
          name: { value: "동네 예약 서비스", status: "fulled" },
          summary: {
            value: "동네 매장을 탐색하고 예약까지 이어지는 서비스",
            status: "fulled",
          },
        },
        constraints: {
          business: { value: "깔끔하고 신뢰감 있는 첫 화면", status: "fulled" },
        },
        users: [
          {
            role: { value: "방문자", status: "fulled" },
          },
          {
            role: { value: "매장 운영자", status: "fulled" },
          },
        ],
        features: {
          mvp: [
            {
              name: { value: "매장 탐색", status: "fulled" },
              business_logic: { value: ["검색", "필터", "상세 이동"], status: "fulled" },
            },
          ],
        },
        screens: [
          {
            name: { value: "홈", status: "fulled" },
            key_sections: { value: ["검색", "추천", "빠른 CTA"], status: "fulled" },
          },
        ],
      },
    });

    expect(result.options).toHaveLength(3);
    expect(result.options[0].hero.title.length).toBeGreaterThan(0);
    expect(result.options[1].top_bar.nav_items.length).toBeGreaterThan(0);
    expect(result.options[2].featured_cards.length).toBeGreaterThan(0);

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const systemPrompt = body.systemInstruction.parts[0]?.text || "";
    const userPrompt = body.contents[0]?.parts[0]?.text || "";

    expect(systemPrompt).toContain("Use ONLY the JSON-derived context provided by the user.");
    expect(userPrompt).toContain("JSON-derived home context");
    expect(userPrompt).not.toContain("Implementation plan summary");
    expect(userPrompt).not.toContain("Design summary");
    expect(userPrompt).not.toContain("User style input");
  });
});
