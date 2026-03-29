import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Download, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CatCharacter, { type CatPersonality } from "@/components/CatCharacter";

interface BriefingReadyScreenProps {
  briefingJson: Record<string, unknown>;
  personality: CatPersonality;
  onNext: () => void;
}

const BriefingReadyScreen = ({
  briefingJson,
  personality,
  onNext,
}: BriefingReadyScreenProps) => {
  const [downloaded, setDownloaded] = useState(false);

  const jsonString = JSON.stringify(briefingJson, null, 2);
  const lineCount = jsonString.split("\n").length;
  const fieldCount = jsonString.match(/"status"/g)?.length ?? 0;

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ui-briefing-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("브리핑 JSON을 다운로드했습니다.");
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-10"
    >
      {/* Character */}
      <div className="flex items-start gap-3 mb-8">
        <div className="shrink-0 mt-1">
          <CatCharacter mood="celebrate" size={52} personality={personality} />
        </div>
        <div className="relative max-w-[calc(100%-70px)]">
          <div className="absolute left-0 top-3 -translate-x-[6px] w-3 h-3 rotate-45 bg-violet-50 dark:bg-violet-900/30 rounded-sm" />
          <div className="rounded-2xl rounded-tl-md bg-violet-50 dark:bg-violet-900/30 px-4 py-3 shadow-sm">
            <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
              1차 인터뷰 분석 완료! UI 브리핑 초안이 만들어졌어요
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              이 JSON을 기반으로 2차 인터뷰에서 빈 항목들을 하나씩 채워나갈 거예요.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{fieldCount}</p>
          <p className="text-xs text-muted-foreground mt-1">UI 설계 항목</p>
        </div>
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{lineCount}</p>
          <p className="text-xs text-muted-foreground mt-1">JSON 라인</p>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-6 rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileJson className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-foreground">브리핑 JSON 미리보기</span>
        </div>
        <div className="max-h-[250px] overflow-y-auto rounded-xl bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/70 font-mono">
            {jsonString.slice(0, 2000)}
            {jsonString.length > 2000 && "\n\n... (이하 생략)"}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 gap-2 rounded-full border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20"
        >
          {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {downloaded ? "다운로드 완료!" : "브리핑 JSON 다운로드"}
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 gap-2 rounded-full bg-violet-600 hover:bg-violet-700"
        >
          2차 인터뷰 시작하기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default BriefingReadyScreen;
