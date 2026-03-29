import JSZip from "jszip";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ExternalLink, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import WebProjectViewer from "@/components/WebProjectViewer";
import type { FullWebProject } from "@/lib/gemini-direct";

interface FullAppScreenProps {
  projectName: string;
  fullApp: FullWebProject;
  isGenerating: boolean;
  onBack: () => void;
  onRegenerate: () => void;
}

const FullAppScreen = ({
  projectName,
  fullApp,
  isGenerating,
  onBack,
  onRegenerate,
}: FullAppScreenProps) => {
  const handleOpenNewTab = () => {
    const blob = new Blob([fullApp.previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleDownloadProject = async () => {
    const zip = new JSZip();
    const folderName = projectName.toLowerCase().replace(/\s+/g, "-");
    const folder = zip.folder(folderName)!;
    for (const file of fullApp.files) {
      folder.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Web Application
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{projectName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            미리보기 (CDN React) · React+TS 코드 (ZIP 다운로드)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isGenerating && fullApp.previewHtml && (
            <Button onClick={handleOpenNewTab} variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              새 탭
            </Button>
          )}
          {!isGenerating && fullApp.files.length > 0 && (
            <Button onClick={() => void handleDownloadProject()} variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              ZIP 다운로드
            </Button>
          )}
          <Button
            onClick={onRegenerate}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            재생성
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            돌아가기
          </Button>
        </div>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/20 py-40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">웹 애플리케이션을 구현하는 중입니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              미리보기 HTML과 React+TS 코드를 병렬로 생성 중입니다.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">최대 3~5분 소요될 수 있습니다.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          <WebProjectViewer project={fullApp} projectName={projectName} />
        </div>
      )}
    </motion.div>
  );
};

export default FullAppScreen;
