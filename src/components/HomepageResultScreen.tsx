import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CatCharacter, { type CatPersonality } from "@/components/CatCharacter";
import CharacterBubble from "@/components/CharacterBubble";

interface HomepageResultScreenProps {
  markdown: string | null;
  isGenerating: boolean;
  personality: CatPersonality;
  onContinue: () => void;
}

const HomepageResultScreen = ({
  markdown,
  isGenerating,
  personality,
  onContinue,
}: HomepageResultScreenProps) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!markdown) return;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `homepage-design-${Date.now()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("홈페이지 설계 문서를 다운로드했습니다.");
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center text-center py-20"
      >
        {/* Character thinking */}
        <div className="mb-6">
          <CatCharacter mood="thinking" size={80} personality={personality} />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-violet-400 mb-4" />
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-2">
          열심히 설계 문서를 쓰고 있어요...
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          답변을 하나하나 분석하고 있으니
          <br />
          잠깐만 기다려 주세요!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-10"
    >
      {/* Character celebration */}
      <div className="mb-6">
        <CharacterBubble
          message="다 됐어요! 홈페이지 설계 문서를 완성했어요!"
          sub="아래에서 미리보기를 확인하고, 다운로드해 주세요."
          mood="celebrate"
          personality={personality}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-violet-200 dark:border-violet-800 p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-foreground">설계 문서 미리보기</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto rounded-xl bg-violet-50/50 dark:bg-violet-900/10 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 font-mono">
            {markdown}
          </pre>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 gap-2 rounded-full border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20"
          disabled={!markdown}
        >
          {downloaded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloaded ? "다운로드 완료!" : "MD 파일 다운로드"}
        </Button>
        <Button
          className="flex-1 gap-2 rounded-full bg-violet-600 hover:bg-violet-700"
          onClick={onContinue}
        >
          홈 화면 3안 만들기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default HomepageResultScreen;
