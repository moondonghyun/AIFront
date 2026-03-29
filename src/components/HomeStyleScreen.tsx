import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Download, Loader2, Palette, RotateCcw, SendHorizonal, Sparkles } from "lucide-react";

import HomeScreenPreview from "@/components/HomeScreenPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RenderedHomeStyleOption, RenderedHomeStyleSet } from "@/lib/home-style-types";

interface HomeStyleScreenProps {
  projectName: string;
  generatedSet: RenderedHomeStyleSet | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSelect: (option: RenderedHomeStyleOption) => void;
  onRefine: (option: RenderedHomeStyleOption, prompt: string) => Promise<void>;
  onBack: () => void;
}

const positionLabel = ["Option 1", "Option 2", "Option 3"];

const HomeStyleScreen = ({
  projectName,
  generatedSet,
  isGenerating,
  onGenerate,
  onSelect,
  onRefine,
  onBack,
}: HomeStyleScreenProps) => {
  const [refinePrompts, setRefinePrompts] = useState<Record<string, string>>({});
  const [refiningIds, setRefiningIds] = useState<Set<string>>(new Set());

  const handleDownloadHtml = (option: RenderedHomeStyleOption) => {
    const blob = new Blob([option.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `home-option-${option.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefine = async (option: RenderedHomeStyleOption) => {
    const prompt = refinePrompts[option.id]?.trim();
    if (!prompt) return;
    setRefiningIds((prev) => new Set(prev).add(option.id));
    try {
      await onRefine(option, prompt);
      setRefinePrompts((prev) => ({ ...prev, [option.id]: "" }));
    } finally {
      setRefiningIds((prev) => {
        const next = new Set(prev);
        next.delete(option.id);
        return next;
      });
    }
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Palette className="h-7 w-7 animate-pulse text-foreground" />
        </div>
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">홈 화면 3안을 생성하는 중입니다</h2>
          <p className="text-sm text-muted-foreground">
            업로드한 JSON에서 정제한 서비스 정보만 사용해서 더 정돈된 홈 화면 비교안을 만들고 있습니다.
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

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
            Home Concepts
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {projectName} 홈 화면 3안
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            스타일과 구조는 업로드된 JSON에서 추출한 정보만으로 만들고, 세 안 모두 첫 화면 완성도 비교에 집중합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {generatedSet && (
            <Button onClick={onGenerate} variant="outline" size="sm" className="gap-1.5 rounded-full">
              <RotateCcw className="h-3.5 w-3.5" />
              다시 생성
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        </div>
      </div>

      {!generatedSet && (
        <div className="rounded-3xl border border-border p-8">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">JSON-only generation</span>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            업로드된 JSON의 서비스 요약, 사용자, MVP 기능, 화면, 사용자 흐름, 엔티티, 제약 조건만 사용합니다.
            별도 스타일 프롬프트 없이도 더 깔끔한 비교 화면이 나오도록 정보 계층을 정리해서 생성합니다.
          </p>
          <Button onClick={onGenerate} className="mt-5 rounded-full px-6">
            홈 화면 3안 생성
          </Button>
        </div>
      )}

      {generatedSet && (
        <>
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {generatedSet.focus_note}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {generatedSet.options.map((option, index) => {
              const isRefining = refiningIds.has(option.id);
              const prompt = refinePrompts[option.id] ?? "";
              return (
                <div key={option.id} className="space-y-4 rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {positionLabel[index] || `Option ${index + 1}`}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">{option.name}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {option.concept_summary}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadHtml(option)}
                      title={`HTML 다운로드 (${option.html.length.toLocaleString()}자)`}
                      className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-[10px] tabular-nums">{(option.html.length / 1000).toFixed(1)}k</span>
                    </button>
                  </div>

                  <div className="relative">
                    {isRefining && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-background/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <HomeScreenPreview option={option} compact />
                  </div>

                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Style reasoning
                    </div>
                    <p className="mt-2 text-sm text-foreground">{option.style_reason}</p>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="수정 요청을 입력하세요 (예: 색상을 더 따뜻하게, 버튼을 더 크게)"
                      value={prompt}
                      onChange={(e) => setRefinePrompts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isRefining) {
                          e.preventDefault();
                          void handleRefine(option);
                        }
                      }}
                      disabled={isRefining}
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 rounded-full"
                      disabled={!prompt.trim() || isRefining}
                      onClick={() => void handleRefine(option)}
                    >
                      {isRefining
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 수정 중...</>
                        : <><SendHorizonal className="h-3.5 w-3.5" /> 이 안 수정</>
                      }
                    </Button>
                  </div>

                  <Button
                    onClick={() => onSelect(option)}
                    className="w-full gap-2 rounded-full"
                    disabled={isRefining}
                  >
                    <Check className="h-4 w-4" />
                    이 안으로 진행
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default HomeStyleScreen;
