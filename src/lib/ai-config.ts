export type AiProviderId = "gemini";
export type AiTaskId =
  | "initialBriefing"
  | "homepageMd"
  | "secondaryInterviewQuestion"
  | "secondaryInterviewFill"
  | "designDocument"
  | "implementationPlan"
  | "homeStyleConcepts"
  | "fullAppGeneration";

interface AiProviderConfig {
  id: AiProviderId;
  label: string;
  apiKeyEnvKeys: string[];
  defaultModelEnvKey: string;
  baseUrl: string;
}

interface AiTaskConfig {
  id: AiTaskId;
  label: string;
  provider: AiProviderId;
  defaultModel: string;
  modelEnvKey: string;
  apiKeyEnvKeys?: string[];
  fallbackModels?: string[];
}

const AI_PROVIDERS: Record<AiProviderId, AiProviderConfig> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    apiKeyEnvKeys: ["VITE_GEMINI_API_KEY", "GEMINI_API_KEY"],
    defaultModelEnvKey: "VITE_GEMINI_MODEL",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  },
};

export const AI_TASKS: Record<AiTaskId, AiTaskConfig> = {
  initialBriefing: {
    id: "initialBriefing",
    label: "1차 인터뷰 -> 초기 JSON",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_INITIAL_BRIEFING",
  },
  homepageMd: {
    id: "homepageMd",
    label: "홈페이지 MD 생성",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_HOMEPAGE_MD",
  },
  secondaryInterviewQuestion: {
    id: "secondaryInterviewQuestion",
    label: "2차 인터뷰 질문 생성",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_INTERVIEW_QUESTION",
  },
  secondaryInterviewFill: {
    id: "secondaryInterviewFill",
    label: "2차 인터뷰 답변 반영",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_INTERVIEW_FILL",
  },
  designDocument: {
    id: "designDocument",
    label: "설계 문서 생성",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_DESIGN",
  },
  implementationPlan: {
    id: "implementationPlan",
    label: "구현 계획 생성",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash-lite",
    modelEnvKey: "VITE_GEMINI_MODEL_IMPLEMENTATION",
  },
  homeStyleConcepts: {
    id: "homeStyleConcepts",
    label: "홈 UI 스타일 설계",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    modelEnvKey: "VITE_GEMINI_MODEL_HOME_STYLE",
    apiKeyEnvKeys: ["VITE_GEMINI_HOME_STYLE_API_KEY", "VITE_GEMINI_API_KEY", "GEMINI_API_KEY"],
    fallbackModels: ["gemini-2.5-flash-lite"],
  },
  fullAppGeneration: {
    id: "fullAppGeneration",
    label: "전체 앱 구현",
    provider: "gemini",
    defaultModel: "gemini-3.1-pro-preview",
    modelEnvKey: "VITE_GEMINI_MODEL_FULL_APP",
    apiKeyEnvKeys: ["VITE_GEMINI_HOME_STYLE_API_KEY", "VITE_GEMINI_API_KEY", "GEMINI_API_KEY"],
    fallbackModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
};

function readEnv(key: string): string {
  const value = (import.meta.env as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getAiTaskRuntime(taskId: AiTaskId) {
  const task = AI_TASKS[taskId];
  const provider = AI_PROVIDERS[task.provider];
  const apiKeyEnvKeys = task.apiKeyEnvKeys ?? provider.apiKeyEnvKeys;
  const apiKey = apiKeyEnvKeys.map(readEnv).find(Boolean) || "";
  const model =
    readEnv(task.modelEnvKey) || readEnv(provider.defaultModelEnvKey) || task.defaultModel;

  return {
    task,
    provider,
    apiKeyEnvKeys,
    apiKey,
    model,
    fallbackModels: task.fallbackModels ?? [],
    endpoint: `${provider.baseUrl}/${model}:generateContent`,
  };
}
