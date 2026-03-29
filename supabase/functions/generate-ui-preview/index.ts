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

    const systemPrompt = `당신은 UI/UX 전문가이자 프론트엔드 개발자입니다. 서비스 설계도를 바탕으로 각 화면의 실제적인 UI 컴포넌트 트리를 생성합니다.

반드시 아래 JSON 구조로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "service_name": "서비스명",
  "theme": {
    "primary_color": "blue",
    "style": "modern"
  },
  "screens": [
    {
      "id": "screen-1",
      "name": "메인 페이지",
      "route": "/",
      "type": "landing",
      "description": "서비스 소개 랜딩 페이지",
      "layout": "full-width",
      "components": [
        {
          "id": "comp-1",
          "type": "navbar",
          "props": {
            "logo": "서비스명",
            "items": ["홈", "서비스", "요금", "문의"],
            "cta_text": "시작하기"
          }
        },
        {
          "id": "comp-2",
          "type": "hero",
          "props": {
            "title": "더 나은 경험을 시작하세요",
            "subtitle": "간단한 설명 텍스트가 여기에 들어갑니다",
            "primary_button": "무료로 시작",
            "secondary_button": "더 알아보기"
          }
        },
        {
          "id": "comp-3",
          "type": "feature-grid",
          "props": {
            "title": "주요 기능",
            "columns": 3,
            "items": [
              { "icon": "zap", "title": "빠른 속도", "description": "설명" },
              { "icon": "shield", "title": "보안", "description": "설명" },
              { "icon": "users", "title": "협업", "description": "설명" }
            ]
          }
        }
      ]
    }
  ]
}

사용 가능한 component type과 props:
- navbar: { logo, items: string[], cta_text }
- hero: { title, subtitle, primary_button, secondary_button, image_description? }
- feature-grid: { title, subtitle?, columns: 2|3|4, items: [{ icon, title, description }] }
- stats: { items: [{ value, label }] }
- card-grid: { title?, columns: 2|3, items: [{ title, description, badge?, image_description? }] }
- form: { title, description?, fields: [{ label, type: "text"|"email"|"password"|"textarea"|"select", placeholder, options?: string[] }], submit_text }
- table: { title?, headers: string[], rows: string[][] }
- sidebar-nav: { title?, items: [{ label, icon?, active?: boolean }] }
- content-section: { title, content: string, alignment?: "left"|"center" }
- pricing: { title?, plans: [{ name, price, period, features: string[], highlighted?: boolean, cta }] }
- testimonials: { title?, items: [{ quote, author, role, avatar_initial }] }
- cta-banner: { title, description, button_text }
- footer: { logo, columns: [{ title, links: string[] }], copyright }
- tabs-panel: { tabs: [{ label, content_title, content_description }] }
- list: { title?, items: [{ title, description?, badge?, avatar_initial? }] }
- metric-cards: { items: [{ label, value, change?, trend?: "up"|"down" }] }
- chart-placeholder: { title, type: "bar"|"line"|"pie", description? }
- avatar-group: { title?, users: [{ name, role }] }
- notification-list: { title?, items: [{ title, description, time, read?: boolean }] }
- search-bar: { placeholder }
- breadcrumb: { items: string[] }
- empty-state: { icon, title, description, button_text? }
- modal-preview: { title, description?, fields?: [{ label, type, placeholder }], primary_button, secondary_button? }
- profile-header: { name, email, avatar_initial, role?, stats?: [{ label, value }] }
- settings-form: { title, sections: [{ title, fields: [{ label, type, value?, description? }] }] }
- data-list: { title?, headers?: string[], items: [{ cells: string[], status?: string }] }
- stepper: { steps: [{ label, description?, completed?: boolean, active?: boolean }] }
- chat-preview: { messages: [{ sender, text, time, is_user?: boolean }] }

icon 가능한 값: zap, shield, users, star, heart, check, clock, mail, settings, search, home, bell, chart, lock, globe, phone, camera, file, folder, edit, trash, plus, minus, arrow-right, arrow-left, trending-up, trending-down, download, upload, share, bookmark, tag, filter, layers, grid, list, map, calendar, package, truck, credit-card, database, server, code, terminal, monitor, smartphone

규칙:
1. 설계도의 모든 화면을 빠짐없이 구현하세요.
2. 각 화면에 적합한 실제적인 콘텐츠(텍스트, 데이터)를 생성하세요.
3. 서비스 도메인에 맞는 현실적인 더미 데이터를 사용하세요.
4. 네비게이션, 푸터 등 공통 요소도 포함하세요.
5. 각 화면의 key_elements와 interactions를 모두 반영하세요.
6. 관리자 대시보드에는 metric-cards, table, chart-placeholder 등을 사용하세요.
7. 인증 화면에는 form을 사용하세요.
8. 가격 페이지에는 pricing을 사용하세요.`;

    const designStr = JSON.stringify(designDoc, null, 2);
    const planStr = implementationPlan ? JSON.stringify(implementationPlan, null, 2) : "없음";
    const userPrompt = `설계도:\n${designStr}\n\n구현 계획:\n${planStr}\n\n위 정보를 바탕으로 각 화면의 실제적인 UI 컴포넌트 트리를 생성해주세요. 서비스 특성에 맞는 현실적인 텍스트와 데이터를 포함하세요.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
        JSON.stringify({ error: "UI 프리뷰 생성에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let uiPreview;
    try {
      uiPreview = extractJsonFromResponse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI 응답에서 JSON을 추출할 수 없습니다.", raw: content?.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ uiPreview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ui-preview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
