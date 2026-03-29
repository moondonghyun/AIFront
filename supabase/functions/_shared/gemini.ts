interface GeminiJsonRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

function extractTextFromCandidate(response: Record<string, unknown>): string {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const firstCandidate = candidates[0];

  if (!firstCandidate || typeof firstCandidate !== "object") {
    return "";
  }

  const content =
    "content" in firstCandidate && typeof firstCandidate.content === "object"
      ? (firstCandidate.content as Record<string, unknown>)
      : null;

  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      return typeof part.text === "string" ? part.text : "";
    })
    .join("")
    .trim();
}

function extractJsonPayload(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBrace = cleaned.search(/[\[{]/);
  if (firstBrace === -1) {
    return cleaned;
  }

  return cleaned.slice(firstBrace);
}

export async function requestGeminiJson<T>({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
}: GeminiJsonRequestOptions): Promise<T> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText.slice(0, 600)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractTextFromCandidate(payload);
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    try {
      return JSON.parse(extractJsonPayload(text)) as T;
    } catch {
      throw new Error("Gemini JSON parse failed");
    }
  }
}
