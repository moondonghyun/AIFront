import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Monitor,
  Smartphone,
  Loader2,
  Eye,
  Download,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { UIPreviewData, UIScreen } from "@/lib/ui-preview-types";
import RealisticUIRenderer from "@/components/RealisticUIRenderer";

interface UIPreviewScreenProps {
  uiPreviewData: UIPreviewData | null;
  isProcessing: boolean;
  onBack: () => void;
}

const UIPreviewScreen = ({ uiPreviewData, isProcessing, onBack }: UIPreviewScreenProps) => {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
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
          <Eye className="w-7 h-7 text-foreground animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">UI 프리뷰 생성 중...</h2>
          <p className="text-sm text-muted-foreground">
            AI가 각 화면의 실제 UI를 구성하고 있습니다
          </p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (!uiPreviewData) return null;

  const screens = uiPreviewData.screens || [];
  const activeScreen = screens[activeScreenIndex];

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(uiPreviewData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ui-preview-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("UI 프리뷰 데이터가 다운로드되었습니다");
    setTimeout(() => setDownloaded(false), 2000);
  };

  const renderScreen = (screen: UIScreen) => {
    const hasSidebar = screen.layout === "sidebar-left" || screen.layout === "sidebar-right";
    const sidebarComp = hasSidebar ? screen.components.find(c => c.type === "sidebar-nav") : null;
    const mainComps = hasSidebar ? screen.components.filter(c => c.type !== "sidebar-nav") : screen.components;

    return (
      <div
        className={`bg-background border border-border rounded-xl overflow-hidden shadow-sm transition-all ${
          deviceMode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
        }`}
      >
        {/* Browser chrome */}
        <div className="bg-muted/50 border-b border-border px-3 py-1.5 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400/60" />
            <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <div className="w-2 h-2 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 h-5 bg-background/80 rounded-full flex items-center px-3">
            <span className="text-[9px] text-muted-foreground/60 font-mono">
              {uiPreviewData.service_name?.toLowerCase().replace(/\s+/g, "") || "app"}.com{screen.route}
            </span>
          </div>
        </div>

        {/* Screen content */}
        {hasSidebar ? (
          <div className={`flex ${screen.layout === "sidebar-right" ? "flex-row-reverse" : "flex-row"}`}>
            {sidebarComp && <RealisticUIRenderer component={sidebarComp} />}
            <div className="flex-1 min-w-0">
              {mainComps.map((comp) => (
                <RealisticUIRenderer key={comp.id} component={comp} />
              ))}
            </div>
          </div>
        ) : (
          <div className={screen.layout === "centered" ? "max-w-2xl mx-auto" : ""}>
            {mainComps.map((comp) => (
              <RealisticUIRenderer key={comp.id} component={comp} />
            ))}
          </div>
        )}
      </div>
    );
  };

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
            UI Preview
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {uiPreviewData.service_name} — 화면 미리보기
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          돌아가기
        </Button>
      </div>

      {/* Device toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1">
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
        <div className="flex gap-1 shrink-0 ml-2">
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
      </div>

      {/* Screen info */}
      {activeScreen && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
              {activeScreen.type}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {activeScreen.route}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{activeScreen.description}</p>
        </div>
      )}

      {/* Preview */}
      <AnimatePresence mode="wait">
        {activeScreen && (
          <motion.div
            key={activeScreen.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen(activeScreen)}
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

      {/* Download */}
      <div className="mt-8">
        <Button onClick={handleDownload} variant="outline" className="gap-2 rounded-full w-full">
          {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {downloaded ? "다운로드 완료" : "UI 프리뷰 JSON 다운로드"}
        </Button>
      </div>
    </motion.div>
  );
};

export default UIPreviewScreen;
