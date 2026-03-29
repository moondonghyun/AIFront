import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Monitor,
  Smartphone,
  Loader2,
  Layout,
  GitBranch,
  Download,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { WireframeData, WireframeScreen, WireframeSection } from "@/lib/wireframe-types";
import WireframeElementRenderer from "@/components/WireframeElementRenderer";

interface WireframePreviewScreenProps {
  wireframeData: WireframeData | null;
  isProcessing: boolean;
  onBack: () => void;
}

const layoutClass: Record<string, string> = {
  row: "flex flex-row flex-wrap gap-2",
  column: "flex flex-col gap-2",
  "grid-2": "grid grid-cols-2 gap-2",
  "grid-3": "grid grid-cols-3 gap-2",
  "grid-4": "grid grid-cols-4 gap-2",
};

const WireframePreviewScreen = ({
  wireframeData,
  isProcessing,
  onBack,
}: WireframePreviewScreenProps) => {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"screens" | "flows">("screens");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [downloaded, setDownloaded] = useState(false);

  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center min-h-[70vh] gap-6"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Layout className="w-7 h-7 text-foreground animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">와이어프레임 생성 중...</h2>
          <p className="text-sm text-muted-foreground">
            AI가 각 화면의 레이아웃을 구성하고 있습니다
          </p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (!wireframeData) return null;

  const screens = wireframeData.screens || [];
  const flows = wireframeData.flows || [];
  const activeScreen = screens[activeScreenIndex];

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(wireframeData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wireframes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("와이어프레임 데이터가 다운로드되었습니다");
    setTimeout(() => setDownloaded(false), 2000);
  };

  const renderSection = (section: WireframeSection) => (
    <div key={section.id} className="mb-3">
      <div className="text-[9px] text-muted-foreground/50 mb-1 font-mono uppercase tracking-wider">
        {section.name}
      </div>
      <div className={layoutClass[section.layout] || layoutClass.column}>
        {section.elements.map((el) => (
          <WireframeElementRenderer key={el.id} element={el} />
        ))}
      </div>
    </div>
  );

  const renderScreenPreview = (screen: WireframeScreen) => (
    <div
      className={`bg-background border border-border rounded-xl overflow-hidden shadow-sm transition-all ${
        deviceMode === "mobile" ? "max-w-[320px] mx-auto" : "w-full"
      }`}
    >
      {/* Browser chrome */}
      <div className="bg-muted/50 border-b border-border px-3 py-1.5 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-foreground/10" />
          <div className="w-2 h-2 rounded-full bg-foreground/10" />
          <div className="w-2 h-2 rounded-full bg-foreground/10" />
        </div>
        <div className="flex-1 h-4 bg-background/80 rounded-full flex items-center px-2">
          <span className="text-[8px] text-muted-foreground/50 font-mono">
            {screen.route}
          </span>
        </div>
      </div>
      {/* Screen content */}
      <div className="p-3 min-h-[300px]">
        {screen.sections.map(renderSection)}
      </div>
    </div>
  );

  const renderFlowView = () => (
    <div className="space-y-6">
      {flows.map((flow, fi) => (
        <div key={fi} className="border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{flow.name}</span>
          </div>
          <div className="space-y-0">
            {flow.steps.map((step, si) => {
              const screen = screens.find((s) => s.id === step.screen_id);
              return (
                <div key={si} className="flex items-start gap-3 relative">
                  {si < flow.steps.length - 1 && (
                    <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                  )}
                  <div className="w-[18px] h-[18px] rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5 relative z-10">
                    {si + 1}
                  </div>
                  <div className="pb-4 min-w-0 flex-1">
                    <div className="text-sm text-foreground">{step.action}</div>
                    {screen && (
                      <button
                        onClick={() => {
                          const idx = screens.indexOf(screen);
                          if (idx >= 0) {
                            setActiveScreenIndex(idx);
                            setViewMode("screens");
                          }
                        }}
                        className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline"
                      >
                        <Monitor className="w-3 h-3" />
                        {screen.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-1">
            Wireframes
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            화면 프리뷰
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          구현 계획
        </Button>
      </div>

      {/* View mode & device toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("screens")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === "screens"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            화면
          </button>
          <button
            onClick={() => setViewMode("flows")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === "flows"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            플로우
          </button>
        </div>

        {viewMode === "screens" && (
          <div className="flex gap-1">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded transition-colors ${
                deviceMode === "desktop" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded transition-colors ${
                deviceMode === "mobile" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {viewMode === "screens" ? (
        <>
          {/* Screen selector */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {screens.map((screen, i) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreenIndex(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  i === activeScreenIndex
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {screen.name}
              </button>
            ))}
          </div>

          {/* Screen info */}
          {activeScreen && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide font-mono">
                  {activeScreen.type}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  {activeScreen.route}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{activeScreen.description}</p>
            </div>
          )}

          {/* Wireframe preview */}
          <AnimatePresence mode="wait">
            {activeScreen && (
              <motion.div
                key={activeScreen.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderScreenPreview(activeScreen)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeScreenIndex === 0}
              onClick={() => setActiveScreenIndex((i) => i - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              이전 화면
            </Button>
            <span className="text-xs text-muted-foreground/50 font-mono">
              {activeScreenIndex + 1} / {screens.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={activeScreenIndex === screens.length - 1}
              onClick={() => setActiveScreenIndex((i) => i + 1)}
              className="gap-1.5"
            >
              다음 화면
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      ) : (
        renderFlowView()
      )}

      {/* Download */}
      <div className="mt-8">
        <Button onClick={handleDownload} variant="outline" className="gap-2 rounded-full w-full">
          {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {downloaded ? "다운로드 완료" : "와이어프레임 JSON 다운로드"}
        </Button>
      </div>
    </motion.div>
  );
};

export default WireframePreviewScreen;
