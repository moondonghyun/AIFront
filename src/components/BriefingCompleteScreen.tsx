import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Download, FileJson, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import HomeScreenPreview from "@/components/HomeScreenPreview";
import type { InterviewProgress } from "@/lib/briefing-state";
import type { RenderedHomeStyleOption } from "@/lib/home-style-types";

interface BriefingCompleteScreenProps {
  briefingJson: Record<string, unknown>;
  progress?: InterviewProgress;
  selectedHomeStyle: RenderedHomeStyleOption | null;
  onBack: () => void;
  onNext: () => void;
}

const BriefingCompleteScreen = ({
  briefingJson,
  progress,
  selectedHomeStyle,
  onBack,
  onNext,
}: BriefingCompleteScreenProps) => {
  const [downloaded, setDownloaded] = useState(false);

  const completionPercentage = progress?.completionPercentage ?? 100;
  const answeredTargets = progress?.answeredTargets ?? 0;
  const totalTargets = progress?.totalTargets ?? 0;
  const remainingTargets = progress?.remainingTargets ?? 0;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(briefingJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ui-briefing-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("UI 브리핑 JSON을 다운로드했습니다.");
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-12"
    >
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Interview Complete
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            2차 인터뷰 완료 — 전체 앱 생성 준비
          </h2>
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

      {/* Progress bar */}
      <div className="mb-8 rounded-xl border border-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">UI 항목 완성도</span>
          <span className="text-2xl font-bold text-foreground">{completionPercentage}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          총 {totalTargets}개 항목 중 {answeredTargets}개를 채웠고 {remainingTargets}개가
          남아 있습니다.
        </p>
      </div>

      {/* Selected home style preview */}
      {selectedHomeStyle && (
        <div className="mb-8 rounded-xl border border-border p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              선택한 홈 화면: {selectedHomeStyle.name}
            </span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {selectedHomeStyle.concept_summary}
          </p>
          <div className="flex justify-center">
            <HomeScreenPreview option={selectedHomeStyle} compact />
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mb-8 rounded-xl border border-border p-6">
        <div className="mb-3 flex items-center gap-2">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">최종 결과물 생성</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          인터뷰로 채워진 구조화된 JSON과 선택한 홈 화면 3안을 기반으로 최종 프론트엔드
          결과물을 생성합니다. 추가 컨텍스트를 입력하거나, 바로 전체 앱 코드를 만들 수
          있습니다.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 gap-2 rounded-full"
        >
          {downloaded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloaded ? "다운로드 완료" : "브리핑 JSON 다운로드"}
        </Button>
        <Button className="flex-1 gap-2 rounded-full" onClick={onNext}>
          <Rocket className="h-4 w-4" />
          전체 앱 생성으로 진행
        </Button>
      </div>
    </motion.div>
  );
};

export default BriefingCompleteScreen;
