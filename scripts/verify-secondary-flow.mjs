import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const requiredBranches = [
  "meta",
  "service",
  "users",
  "core_entities",
  "second_interview_topics",
  "features",
  "screens",
  "user_flows",
  "permissions",
  "admin",
  "monetization",
  "integrations",
  "notifications",
  "content_policy",
  "tech_preferences",
  "data_privacy",
  "performance",
  "analytics",
  "domain_rules",
  "operational_policies",
  "exception_handling",
  "constraints",
];

const criticalPaths = [
  "service.summary",
  "service.problem_statement",
  "service.solution_statement",
  "service.target_platform",
  "service.mvp_scope_summary",
  "users[0].role",
  "core_entities[0].name",
  "core_entities[0].key_fields",
  "features.mvp[0].name",
  "features.mvp[0].business_logic",
  "screens[0].name",
  "screens[0].key_sections",
  "user_flows[0].name",
  "user_flows[0].steps",
  "permissions.auth_method",
  "permissions.roles[0].role",
  "admin.core_tasks",
  "monetization.business_model",
  "tech_preferences.frontend_client",
  "tech_preferences.backend_or_baas",
  "data_privacy.personal_data_collected",
  "domain_rules.state_model",
  "exception_handling.network_failure",
  "constraints.business",
];

const responses = [
  { id: 1, label: "서비스 정의", answer: "동네 자영업자가 전화 예약 대신 모바일에서 예약을 관리하게 해주는 서비스예요." },
  { id: 2, label: "사용자", answer: "사장님, 매장 직원, 예약하는 고객이 써요." },
  { id: 3, label: "문제", answer: "전화 예약이 겹치고 누락돼서 운영이 엉켜요." },
  { id: 4, label: "데이터", answer: "예약 정보, 고객 연락처, 담당 직원, 요청 메모" },
  { id: 5, label: "행동", answer: "예약 등록, 예약 확인, 시간 변경, 취소 처리, 알림 발송" },
  { id: 6, label: "흐름", answer: "고객이 예약 요청을 남기면 직원이 확인하고 시간을 배정한 뒤 확정 알림을 보내요." },
  { id: 7, label: "권한", answer: "직원은 예약만 관리하고 사장님은 전체 수정과 승인, 통계를 봐요." },
  { id: 8, label: "운영", answer: "관리자는 취소 처리, 일정 조정, 문의 대응, 운영 통계를 봐야 해요." },
  { id: 9, label: "수익화", answer: "초기엔 무료로 쓰게 하고 추후 구독 플랜을 붙일 거예요." },
  { id: 10, label: "연동", answer: "카카오 알림과 문자, 나중엔 결제 연동도 고려해요." },
  { id: 11, label: "MVP", answer: "예약 관리, 일정 변경, 알림이 MVP예요." },
  { id: 12, label: "제약", answer: "모바일에서 쉽게 써야 하고 개인정보 처리가 꼭 필요해요." },
];

const schemaOutline = {
  meta: {
    source: "first-interview",
    generated_at: "ISO string",
    schema_goal: "string",
  },
  service: {
    name: { value: null, status: "null|expected|fulled" },
    summary: { value: null, status: "null|expected|fulled" },
    problem_statement: { value: null, status: "null|expected|fulled" },
    solution_statement: { value: null, status: "null|expected|fulled" },
    target_platform: { value: null, status: "null|expected|fulled" },
    mvp_scope_summary: { value: null, status: "null|expected|fulled" },
  },
  users: [{ role: { value: null, status: "null|expected|fulled" }, description: { value: null, status: "null|expected|fulled" } }],
  core_entities: [{ name: { value: null, status: "null|expected|fulled" }, key_fields: { value: null, status: "null|expected|fulled" } }],
  second_interview_topics: [{ topic: "string", related_fields: ["path"], why_missing: "string", priority: "high|medium|low", suggested_question: "string" }],
  features: { mvp: [{ name: { value: null, status: "null|expected|fulled" }, business_logic: { value: null, status: "null|expected|fulled" } }] },
  screens: [{ name: { value: null, status: "null|expected|fulled" }, key_sections: { value: null, status: "null|expected|fulled" } }],
  user_flows: [{ name: { value: null, status: "null|expected|fulled" }, steps: { value: null, status: "null|expected|fulled" } }],
  permissions: { auth_method: { value: null, status: "null|expected|fulled" }, roles: [{ role: { value: null, status: "null|expected|fulled" } }] },
  admin: { core_tasks: { value: null, status: "null|expected|fulled" } },
  monetization: { business_model: { value: null, status: "null|expected|fulled" } },
  integrations: [{ service: { value: null, status: "null|expected|fulled" } }],
  notifications: { trigger_events: { value: null, status: "null|expected|fulled" } },
  content_policy: { review_required: { value: null, status: "null|expected|fulled" } },
  tech_preferences: {
    frontend_client: { value: null, status: "null|expected|fulled" },
    backend_or_baas: { value: null, status: "null|expected|fulled" },
  },
  data_privacy: { personal_data_collected: { value: null, status: "null|expected|fulled" } },
  performance: { response_time_goal: { value: null, status: "null|expected|fulled" } },
  analytics: { key_events: { value: null, status: "null|expected|fulled" } },
  domain_rules: { state_model: { value: null, status: "null|expected|fulled" } },
  operational_policies: { incident_escalation: { value: null, status: "null|expected|fulled" } },
  exception_handling: { network_failure: { value: null, status: "null|expected|fulled" } },
  constraints: { business: { value: null, status: "null|expected|fulled" } },
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatusField(value) {
  return isObject(value) && "value" in value && "status" in value;
}

function tokenizePath(pathValue) {
  return pathValue.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

function getAt(root, pathValue) {
  let current = root;

  for (const token of tokenizePath(pathValue)) {
    if (Array.isArray(current)) {
      current = current[Number(token)];
      continue;
    }

    if (!isObject(current) || !(token in current)) {
      return undefined;
    }

    current = current[token];
  }

  return current;
}

function collectStatusStats(root, stats = { fulled: 0, expected: 0, nulls: 0 }) {
  if (Array.isArray(root)) {
    root.forEach((item) => collectStatusStats(item, stats));
    return stats;
  }

  if (!isObject(root)) {
    return stats;
  }

  if (isStatusField(root)) {
    if (root.status === "fulled") stats.fulled += 1;
    if (root.status === "expected") stats.expected += 1;
    if (root.status === "null") stats.nulls += 1;
    return stats;
  }

  Object.values(root).forEach((value) => collectStatusStats(value, stats));
  return stats;
}

function fillAllStatusFields(root, pathValue = "root") {
  if (Array.isArray(root)) {
    return root.map((item, index) => fillAllStatusFields(item, `${pathValue}[${index}]`));
  }

  if (!isObject(root)) {
    return root;
  }

  if (isStatusField(root)) {
    return {
      value:
        root.value !== null && root.value !== undefined && root.value !== ""
          ? root.value
          : `filled:${pathValue}`,
      status: "fulled",
    };
  }

  return Object.fromEntries(
    Object.entries(root).map(([key, value]) => [key, fillAllStatusFields(value, `${pathValue}.${key}`)]),
  );
}

function buildReadinessReport(briefing) {
  const missingBranches = requiredBranches.filter((pathValue) => getAt(briefing, pathValue) === undefined);
  const missingCriticalPaths = criticalPaths.filter((pathValue) => getAt(briefing, pathValue) === undefined);
  const unresolvedCriticalPaths = criticalPaths.filter((pathValue) => {
    const field = getAt(briefing, pathValue);
    return isStatusField(field) ? field.status !== "fulled" || field.value === null || field.value === "" : false;
  });

  return {
    missingBranches,
    missingCriticalPaths,
    unresolvedCriticalPaths,
    readyIfFilled: missingBranches.length === 0 && missingCriticalPaths.length === 0,
    implementationReadyNow:
      missingBranches.length === 0 &&
      missingCriticalPaths.length === 0 &&
      unresolvedCriticalPaths.length === 0,
  };
}

async function requestGeminiJson(apiKey, model, systemPrompt, userPrompt, fallbackModels = []) {
  const modelsToTry = [model, ...fallbackModels.filter((item) => item !== model)];
  let lastError = null;

  for (const currentModel of modelsToTry) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      },
    );

    if (!response.ok) {
      lastError = new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
      if (response.status === 404) {
        continue;
      }
      throw lastError;
    }

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return JSON.parse(text);
  }

  throw lastError ?? new Error("Gemini request failed");
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(projectRoot, ".env.local")),
    ...process.env,
  };

  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  const model =
    env.VITE_GEMINI_MODEL_INITIAL_BRIEFING ||
    env.VITE_GEMINI_MODEL ||
    env.GEMINI_MODEL ||
    "gemini-3.1-flash-lite-preview";
  const homeStyleApiKey =
    env.VITE_GEMINI_HOME_STYLE_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  const homeStyleModel = env.VITE_GEMINI_MODEL_HOME_STYLE || "gemini-3.1-flash-lite-preview";

  if (!apiKey) {
    throw new Error("Missing Gemini API key. Put it in .env.local or GEMINI_API_KEY.");
  }

  if (!homeStyleApiKey) {
    throw new Error("Missing home style Gemini API key. Put VITE_GEMINI_HOME_STYLE_API_KEY in .env.local.");
  }

  const systemPrompt = [
    "You are a product architect who turns a first interview into an implementation-grade product briefing JSON.",
    "Output JSON only.",
    "Use the provided schema structure.",
    "Every leaf field outside meta and second_interview_topics must be a { value, status } object.",
    'Allowed status values are "null", "expected", and "fulled" only.',
    'Use "fulled" only when directly grounded in the user answer.',
    'Use "expected" for inferred but follow-up-worthy structure.',
    'Use "null" for essential unknowns.',
    "The resulting JSON should be suitable for a web/app implementation once the remaining fields are filled.",
    "Keep user-facing content in Korean.",
  ].join("\n");

  const userPrompt = [
    "First interview answers:",
    JSON.stringify(responses, null, 2),
    "",
    "Required branches:",
    JSON.stringify(requiredBranches, null, 2),
    "",
    "Critical paths:",
    JSON.stringify(criticalPaths, null, 2),
    "",
    "Schema outline:",
    JSON.stringify(schemaOutline, null, 2),
    "",
    "Return the final JSON only.",
  ].join("\n");

  const generated = await requestGeminiJson(apiKey, model, systemPrompt, userPrompt);
  const stats = collectStatusStats(generated);
  const readiness = buildReadinessReport(generated);
  const completedReadiness = buildReadinessReport(fillAllStatusFields(generated));

  const homeStyleSystemPrompt = [
    "You are a UI concept designer creating complete homepage mock concepts.",
    "Focus only on the home screen style and structure.",
    "Do not return wireframes, bubbles, or abstract information architecture only.",
    "Return JSON only.",
    "Generate exactly three distinct and complete home UI directions.",
    "The UI will display them at left, center, and right only for comparison. Left/center/right is NOT a style requirement.",
    "Each option must be renderable as a realistic end-user home screen with full styling, hero, cards, sections, and navigation.",
    "Use Korean for all user-facing text.",
  ].join("\n");

  const homeStyleUserPrompt = [
    "Service summary:",
    JSON.stringify(generated.service, null, 2),
    "",
    "User style input:",
    "차분하고 신뢰감 있지만 너무 딱딱하지 않고, 첫 화면에서 핵심 가치와 CTA가 분명하게 보이는 홈",
    "",
    "Output format:",
    JSON.stringify(
      {
        focus_note: "홈 화면의 style, 구조, 정보 배치에 집중한 설계",
        options: [
          {
            id: "home-style-1",
            name: "string",
            concept_summary: "string",
            style_reason: "string",
            layout_mode: "mobile-feed|immersive-showcase|split-showcase",
            theme: {
              tone: "light|dark",
              primary: "#000000",
              accent: "#000000",
              background: "#000000",
              surface: "#000000",
              surfaceAlt: "#000000",
              textPrimary: "#000000",
              textSecondary: "#000000",
              border: "#000000",
              chipBackground: "#000000",
              chipText: "#000000",
              heroGlow: "#000000",
              fontFamilyHint: "string",
              radius: "soft|rounded|sharp",
            },
            top_bar: {
              brand: "string",
              location_label: "string",
              nav_items: ["string"],
              utility_items: ["search", "bell"],
            },
            search_placeholder: "string",
            tabs: ["string"],
            category_chips: ["string"],
            hero: {
              badge: "string",
              title: "string",
              subtitle: "string",
              primary_cta: "string",
              secondary_cta: "string",
              highlight_label: "string",
              highlight_value: "string",
            },
            featured_cards: [
              {
                category: "string",
                title: "string",
                description: "string",
                tags: ["string"],
                meta: ["string"],
                status: "string",
                accent_color: "#000000",
              },
            ],
            support_panels: [{ title: "string", body: "string", metric: "string" }],
            bottom_nav: ["string"],
            implementation_notes: ["string"],
          },
        ],
      },
      null,
      2,
    ),
  ].join("\n");

  const homeStyleResult = await requestGeminiJson(
    homeStyleApiKey,
    homeStyleModel,
    homeStyleSystemPrompt,
    homeStyleUserPrompt,
    [],
  );

  assert.equal(readiness.missingBranches.length, 0, `missing branches: ${readiness.missingBranches.join(", ")}`);
  assert.equal(readiness.missingCriticalPaths.length, 0, `missing critical paths: ${readiness.missingCriticalPaths.join(", ")}`);
  assert.equal(readiness.readyIfFilled, true, "generated JSON should already have an implementation-ready shape");
  assert.ok(stats.fulled > 0, "generated JSON should contain fulled fields");
  assert.ok(stats.expected > 0 || stats.nulls > 0, "generated JSON should leave follow-up targets");
  assert.equal(completedReadiness.implementationReadyNow, true, "once all fields are filled, the JSON should be implementation-ready");
  assert.equal(Array.isArray(homeStyleResult.options), true, "home style result should include options");
  assert.equal(homeStyleResult.options.length, 3, "home style result should contain three options");
  assert.ok(
    homeStyleResult.options.every(
      (option) =>
        option.name &&
        option.layout_mode &&
        option.theme?.primary &&
        option.top_bar?.brand &&
        option.hero?.title &&
        Array.isArray(option.featured_cards) &&
        option.featured_cards.length > 0 &&
        Array.isArray(option.support_panels) &&
        option.support_panels.length > 0 &&
        Array.isArray(option.bottom_nav) &&
        option.bottom_nav.length > 0,
    ),
    "each home style option should be a complete renderable home screen concept",
  );

  console.log(
    JSON.stringify(
      {
        model,
        homeStyleModel,
        statusStats: stats,
        readiness,
        completedReadiness,
        sampleServiceSummary: generated?.service?.summary,
        homeStyleFocus: homeStyleResult.focus_note,
        homeStyleNames: homeStyleResult.options.map((option) => option.name),
        homeStyleLayouts: homeStyleResult.options.map((option) => option.layout_mode),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
