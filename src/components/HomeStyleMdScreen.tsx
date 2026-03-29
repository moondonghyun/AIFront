import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { RenderedHomeStyleOption } from "@/lib/home-style-types";

interface HomeStyleMdScreenProps {
  projectName: string;
  selectedStyle: RenderedHomeStyleOption;
  homeStyleMd: string | null;
  isGenerating: boolean;
  onBack: () => void;
  onNext: () => void;
}

const HomeStyleMdScreen = ({
  projectName,
  selectedStyle,
  homeStyleMd,
  isGenerating,
  onBack,
  onNext,
}: HomeStyleMdScreenProps) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!homeStyleMd) return;
    const blob = new Blob([homeStyleMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}-home-spec-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("MD 명세서를 다운로드했습니다.");
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Home Spec
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {projectName} 홈 화면 MD 명세서
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            선택된 홈 UI의 레이아웃 구조와 색상 팔레트를 요약한 명세서입니다.
          </p>
        </div>
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

      {/* Selected style info */}
      <div className="mb-4 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">선택된 안</span>
        <span className="ml-3 text-sm font-medium text-foreground">{selectedStyle.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">— {selectedStyle.concept_summary}</span>
      </div>

      {/* MD content */}
      <div className="rounded-2xl border border-border p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">명세서</span>
            {isGenerating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> 생성 중...
              </span>
            )}
            {!isGenerating && homeStyleMd && (
              <span className="text-xs text-muted-foreground">
                {(homeStyleMd.length / 1000).toFixed(1)}k자
              </span>
            )}
          </div>
          {homeStyleMd && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
            >
              {downloaded ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              {downloaded ? "완료" : ".md 다운로드"}
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isGenerating && homeStyleMd === "" && (
          <p className="py-4 text-center text-sm text-destructive">MD 명세서 생성에 실패했습니다.</p>
        )}
        {!isGenerating && homeStyleMd && (
          <pre className="overflow-y-auto rounded-xl bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {homeStyleMd}
          </pre>
        )}
      </div>

      <div className="mt-6">
        <Button
          onClick={onNext}
          className="w-full gap-2 rounded-full"
          disabled={isGenerating}
        >
          추가 컨텍스트 입력 후 구현 시작
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default HomeStyleMdScreen;
