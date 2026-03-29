import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  Compass,
  Database,
  Download,
  GitBranch,
  LayoutGrid,
  Loader2,
  MessageSquareMore,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DesignDocument } from "@/lib/design-types";

interface BlueprintScreenProps {
  designDoc: DesignDocument | null;
  isProcessing: boolean;
  onBack: () => void;
  onStartHomeStyle?: () => void;
}

type TabId = "overview" | "features" | "data" | "flows" | "screens" | "questions";

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Compass className="h-3.5 w-3.5" /> },
  { id: "features", label: "Features", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "data", label: "Data", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "flows", label: "Flows", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { id: "screens", label: "Screens", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: "questions", label: "Open Questions", icon: <MessageSquareMore className="h-3.5 w-3.5" /> },
];

const priorityColor: Record<"high" | "medium" | "low", string> = {
  high: "bg-foreground text-background",
  medium: "bg-muted text-foreground",
  low: "bg-muted text-muted-foreground",
};

const BlueprintScreen = ({
  designDoc,
  isProcessing,
  onBack,
  onStartHomeStyle,
}: BlueprintScreenProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!designDoc) {
      return;
    }

    const blob = new Blob([JSON.stringify(designDoc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `design-document-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("설계 문서를 다운로드했습니다.");
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Compass className="h-7 w-7 animate-pulse text-foreground" />
        </div>
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">화면 설계를 정리하는 중입니다</h2>
          <p className="text-sm text-muted-foreground">
            업로드한 JSON을 해석해서 서비스 구조, 핵심 기능, 화면 구성을 설계 문서로 변환하고 있습니다.
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (!designDoc) {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Service Summary
        </div>
        <p className="text-sm leading-relaxed text-foreground">{designDoc.service_summary}</p>
      </div>

      <div className="rounded-xl border border-border p-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Core Value
        </div>
        <p className="text-sm leading-relaxed text-foreground">{designDoc.core_value}</p>
      </div>

      <div className="rounded-xl border border-border p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Target Users</span>
        </div>
        <div className="space-y-4">
          {designDoc.target_users.map((user, index) => (
            <div key={`${user.persona}-${index}`} className="border-l-2 border-border pl-4">
              <div className="text-sm font-medium text-foreground">{user.persona}</div>
              <p className="mt-1 text-xs text-muted-foreground">{user.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.needs.map((need, needIndex) => (
                  <span
                    key={`${user.persona}-need-${needIndex}`}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-3">
      {designDoc.core_features.map((feature, index) => (
        <div key={`${feature.name}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{feature.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                priorityColor[feature.priority]
              }`}
            >
              {feature.priority}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{feature.description}</p>
          {feature.related_paths.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {feature.related_paths.map((path) => (
                <span
                  key={path}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {path}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderData = () => (
    <div className="space-y-4">
      {designDoc.data_entities.map((entity, index) => (
        <div key={`${entity.name}-${index}`} className="rounded-xl border border-border p-5">
          <div className="mb-1 text-sm font-semibold text-foreground">{entity.name}</div>
          <p className="mb-3 text-xs text-muted-foreground">{entity.description}</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {entity.fields.map((field, fieldIndex) => (
              <span
                key={`${entity.name}-field-${fieldIndex}`}
                className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {field}
              </span>
            ))}
          </div>
          {entity.notes && <p className="text-xs leading-relaxed text-muted-foreground">{entity.notes}</p>}
        </div>
      ))}
    </div>
  );

  const renderFlows = () => (
    <div className="space-y-6">
      {designDoc.user_flows.map((flow, index) => (
        <div key={`${flow.name}-${index}`} className="rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground">{flow.name}</div>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">{flow.description}</p>
          <div className="space-y-0">
            {flow.steps.map((step, stepIndex) => (
              <div key={`${flow.name}-step-${stepIndex}`} className="relative flex items-start gap-3">
                {stepIndex < flow.steps.length - 1 && (
                  <div className="absolute bottom-0 left-[9px] top-5 w-px bg-border" />
                )}
                <div className="relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
                  {step.step}
                </div>
                <div className="min-w-0 pb-4">
                  <div className="text-sm text-foreground">{step.action}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{step.screen}</div>
                  {step.note && <p className="mt-1 text-xs italic text-muted-foreground/70">{step.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderScreens = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {designDoc.screens.map((screen, index) => (
        <div
          key={`${screen.name}-${index}`}
          className="rounded-xl border border-border p-4 transition-colors hover:border-foreground/20"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{screen.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {screen.type}
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{screen.description}</p>
          <div className="space-y-1.5">
            {screen.key_elements.map((element, elementIndex) => (
              <div key={`${screen.name}-element-${elementIndex}`} className="flex items-center gap-1.5">
                <Circle className="h-1.5 w-1.5 fill-muted-foreground text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{element}</span>
              </div>
            ))}
          </div>
          {screen.interactions.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              {screen.interactions.map((interaction, interactionIndex) => (
                <div
                  key={`${screen.name}-interaction-${interactionIndex}`}
                  className="flex items-center gap-1.5"
                >
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{interaction}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-3">
      {designDoc.open_questions.map((item, index) => (
        <div key={`${item.topic}-${index}`} className="rounded-xl border border-border p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{item.topic}</div>
          <p className="mb-2 text-xs text-muted-foreground">{item.detail}</p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">{item.impact}</p>
        </div>
      ))}
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverview,
    features: renderFeatures,
    data: renderData,
    flows: renderFlows,
    screens: renderScreens,
    questions: renderQuestions,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Design
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {designDoc.service_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{designDoc.service_summary}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          업로드 JSON로 돌아가기
        </Button>
      </div>

      <div className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2 rounded-full">
          {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {downloaded ? "다운로드 완료" : "설계 JSON 다운로드"}
        </Button>
        {onStartHomeStyle && (
          <Button onClick={onStartHomeStyle} className="flex-1 gap-2 rounded-full">
            <Sparkles className="h-4 w-4" />
            홈 화면 3안 생성
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default BlueprintScreen;
