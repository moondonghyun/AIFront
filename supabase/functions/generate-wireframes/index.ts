import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  try { return JSON.parse(cleaned); } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { designDoc, implementationPlan } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `당신은 UI/UX 전문가입니다. 서비스 설계도와 구현 계획을 바탕으로 각 화면의 와이어프레임 레이아웃 데이터를 생성합니다.

반드시 아래 JSON 구조로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "screens": [
    {
      "id": "screen-1",
      "name": "메인 페이지",
      "type": "landing",
      "route": "/",
      "description": "서비스 메인 랜딩 페이지",
      "sections": [
        {
          "id": "section-1",
          "name": "네비게이션",
          "layout": "row",
          "elements": [
            {
              "id": "el-1",
              "type": "navbar",
              "label": "로고 + 메뉴",
              "width": "full",
              "height": "sm",
              "props": { "items": "홈, 서비스, 요금, 문의" }
            }
          ]
        }
      ]
    }
  ],
  "flows": [
    {
      "name": "회원가입 플로우",
      "steps": [
        { "screen_id": "screen-1", "action": "회원가입 버튼 클릭" },
        { "screen_id": "screen-2", "action": "폼 작성 후 제출" }
      ]
    }
  ]
}

사용 가능한 element type: navbar, hero, card, form, input, button, text, image, list, table, sidebar, footer, tabs, modal, stats, chart, avatar, badge, search, divider, grid
사용 가능한 layout: row, column, grid-2, grid-3, grid-4
사용 가능한 width: full, half, third, quarter, auto
사용 가능한 height: sm, md, lg, xl

규칙:
1. 설계도의 모든 화면(screens)을 빠짐없이 와이어프레임으로 변환하세요.
2. 각 화면의 key_elements와 interactions를 반영하여 구체적인 UI 요소를 배치하세요.
3. 실제 서비스처럼 자연스러운 레이아웃을 구성하세요.
4. 네비게이션, 푸터 등 공통 요소도 포함하세요.
5. children을 활용하여 중첩 구조를 표현할 수 있습니다.
6. flows는 설계도의 user_flows를 screen_id로 매핑하세요.`;

    const designStr = JSON.stringify(designDoc, null, 2);
    const planStr = JSON.stringify(implementationPlan, null, 2);
    const userPrompt = "설계도:\n" + designStr + "\n\n구현 계획:\n" + planStr + "\n\n위 정보를 바탕으로 각 화면의 와이어프레임 데이터를 생성해주세요.";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "와이어프레임 생성에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let wireframes;
    try {
      wireframes = extractJsonFromResponse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI 응답에서 JSON을 추출할 수 없습니다.", raw: content?.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ wireframes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-wireframes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
