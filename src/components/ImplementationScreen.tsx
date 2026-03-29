import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Database,
  Download,
  FolderCog,
  KeyRound,
  Layers3,
  Loader2,
  Rocket,
  Server,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import type { ImplementationPlan } from "@/lib/implementation-types";
import { Button } from "@/components/ui/button";

interface ImplementationScreenProps {
  plan: ImplementationPlan | null;
  isProcessing: boolean;
  onBack: () => void;
  onStartHomeStyleDesign?: () => void;
}

type TabId = "overview" | "mvp" | "frontend" | "backend" | "data" | "auth" | "checklist" | "expansion";

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "개요", icon: <Rocket className="h-3.5 w-3.5" /> },
  { id: "mvp", label: "MVP", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "frontend", label: "프론트", icon: <Layers3 className="h-3.5 w-3.5" /> },
  { id: "backend", label: "백엔드/API", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "data", label: "데이터", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "auth", label: "인증/권한", icon: <KeyRound className="h-3.5 w-3.5" /> },
  { id: "checklist", label: "배포 체크", icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: "expansion", label: "확장", icon: <FolderCog className="h-3.5 w-3.5" /> },
];

const priorityColor: Record<"high" | "medium" | "low", string> = {
  high: "bg-foreground text-background",
  medium: "bg-muted text-foreground",
  low: "bg-muted text-muted-foreground",
};

const ImplementationScreen = ({
  plan,
  isProcessing,
  onBack,
  onStartHomeStyleDesign,
}: ImplementationScreenProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!plan) {
      return;
    }

    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `implementation-plan-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("구현 계획 JSON을 다운로드했습니다.");
    setTimeout(() => setDownloaded(false), 2000);
  };

  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Rocket className="h-7 w-7 animate-pulse text-foreground" />
        </div>
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">구현 계획을 만들고 있어요</h2>
          <p className="text-sm text-muted-foreground">
            설계 결과를 기준으로 MVP 우선순위와 구현 단위를 구조화하고 있습니다.
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (!plan) {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          구현 계획 요약
        </div>
        <p className="text-sm leading-relaxed text-foreground">{plan.summary}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{plan.mvp_priorities.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">MVP 항목</div>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{plan.frontend_units.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">프론트 단위</div>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{plan.backend_api_units.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">백엔드/API</div>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{plan.deployment_checklist.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">배포 체크</div>
        </div>
      </div>
    </div>
  );

  const renderMvp = () => (
    <div className="space-y-3">
      {plan.mvp_priorities.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                priorityColor[item.priority]
              }`}
            >
              {item.priority}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );

  const renderFrontend = () => (
    <div className="space-y-4">
      {plan.frontend_units.map((unit, index) => (
        <div key={`${unit.title}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{unit.title}</div>
          <p className="mb-3 text-xs text-muted-foreground">{unit.description}</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {unit.related_screens.map((screen) => (
              <span
                key={`${unit.title}-${screen}`}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {screen}
              </span>
            ))}
          </div>
          <div className="space-y-1.5">
            {unit.deliverables.map((deliverable, deliverableIndex) => (
              <div
                key={`${unit.title}-deliverable-${deliverableIndex}`}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="h-3.5 w-3.5 text-foreground" />
                {deliverable}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderBackend = () => (
    <div className="space-y-4">
      {plan.backend_api_units.map((unit, index) => (
        <div key={`${unit.title}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{unit.title}</div>
          <p className="mb-3 text-xs text-muted-foreground">{unit.description}</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {unit.endpoints.map((endpoint) => (
              <span
                key={`${unit.title}-${endpoint}`}
                className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {endpoint}
              </span>
            ))}
          </div>
          <div className="space-y-1.5">
            {unit.dependencies.map((dependency, dependencyIndex) => (
              <div
                key={`${unit.title}-dependency-${dependencyIndex}`}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="h-3.5 w-3.5 text-foreground" />
                {dependency}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderData = () => (
    <div className="space-y-4">
      {plan.data_requirements.map((item, index) => (
        <div key={`${item.entity}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-1 text-sm font-semibold text-foreground">{item.entity}</div>
          <p className="mb-3 text-xs text-muted-foreground">{item.description}</p>
          <div className="mb-3 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            {item.storage}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.fields.map((field) => (
              <span
                key={`${item.entity}-${field}`}
                className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAuth = () => (
    <div className="space-y-4">
      {plan.auth_requirements.map((item, index) => (
        <div key={`${item.area}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{item.area}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {item.required ? "필수" : "선택"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{item.description}</p>
          {item.roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.roles.map((role) => (
                <span
                  key={`${item.area}-${role}`}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderChecklist = () => (
    <div className="space-y-3">
      {plan.deployment_checklist.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{item.title}</div>
          <p className="text-xs text-muted-foreground">{item.detail}</p>
        </div>
      ))}
    </div>
  );

  const renderExpansion = () => (
    <div className="space-y-3">
      {plan.expansion_points.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{item.title}</div>
          <p className="mb-2 text-xs text-muted-foreground">{item.description}</p>
          <p className="text-xs text-muted-foreground/80">{item.next_step}</p>
        </div>
      ))}
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverview,
    mvp: renderMvp,
    frontend: renderFrontend,
    backend: renderBackend,
    data: renderData,
    auth: renderAuth,
    checklist: renderChecklist,
    expansion: renderExpansion,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Implementation Plan
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {plan.project_name}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          설계로 돌아가기
        </Button>
        {onStartHomeStyleDesign && (
          <Button onClick={onStartHomeStyleDesign} className="w-full gap-2 rounded-full">
            <Sparkles className="h-4 w-4" />
            홈 화면 스타일 3안 설계하기
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto px-1 pb-1 -mx-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tabContent[activeTab]()}
      </motion.div>

      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={handleDownload} variant="outline" className="w-full gap-2 rounded-full">
          {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {downloaded ? "다운로드 완료" : "구현 계획 JSON 다운로드"}
        </Button>
      </div>
    </motion.div>
  );
};

export default ImplementationScreen;
