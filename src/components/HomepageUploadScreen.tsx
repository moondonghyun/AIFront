import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatCharacter, { type CatPersonality } from "@/components/CatCharacter";

interface HomepageUploadScreenProps {
  personality: CatPersonality;
  autoMd: string | null;
  onComplete: (md: string | null) => void;
  onSkip: () => void;
}

const HomepageUploadScreen = ({
  personality,
  autoMd,
  onComplete,
  onSkip,
}: HomepageUploadScreenProps) => {
  const [md, setMd] = useState<string | null>(autoMd);
  const [mdName, setMdName] = useState<string | null>(
    autoMd ? "homepage-design.md (자동)" : null,
  );
  const [dragging, setDragging] = useState(false);
  const mdInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setMd(reader.result as string);
      setMdName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleMdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const hasMd = md !== null;

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
          <CatCharacter mood="asking" size={52} personality={personality} />
        </div>
        <div className="relative max-w-[calc(100%-70px)]">
          <div className="absolute left-0 top-3 -translate-x-[6px] w-3 h-3 rotate-45 bg-violet-50 dark:bg-violet-900/30 rounded-sm" />
          <div className="rounded-2xl rounded-tl-md bg-violet-50 dark:bg-violet-900/30 px-4 py-3 shadow-sm">
            <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
              본격적인 설계 전에, 홈화면 설계 문서가 있으면 올려주세요!
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              이전 단계에서 받은 MD 파일이 있으면 업로드해 주세요.
              이 문서를 기준으로 나머지 화면을 설계할게요.
            </p>
          </div>
        </div>
      </div>

      {/* MD upload card */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-2xl border-2 border-dashed p-6 transition-all mb-6 ${
          hasMd
            ? "border-violet-400 bg-violet-50/50 dark:bg-violet-900/10"
            : dragging
              ? "border-violet-500 bg-violet-50/70 dark:bg-violet-900/20 scale-[1.01]"
              : "border-border hover:border-violet-300"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className={`w-5 h-5 ${hasMd ? "text-violet-500" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium text-foreground">홈페이지 설계 문서 (MD)</span>
        </div>

        {hasMd ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-foreground truncate max-w-[280px]">{mdName}</span>
            </div>
            <button
              type="button"
              onClick={() => { setMd(null); setMdName(null); }}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => mdInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className={`w-6 h-6 transition-transform ${dragging ? "scale-110" : ""}`} />
            <span className="text-xs">
              {dragging ? "여기에 놓으세요!" : ".md 파일을 드래그하거나 클릭해서 업로드"}
            </span>
          </button>
        )}
        <input
          ref={mdInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          onChange={handleMdFile}
          className="hidden"
        />
      </div>

      {hasMd && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground mb-6 text-center"
        >
          이 문서를 기반으로 AI가 홈화면 구조를 유지하면서 나머지 화면을 설계합니다.
        </motion.p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 items-center">
        <Button
          onClick={() => onComplete(md)}
          disabled={!hasMd}
          className="gap-2 rounded-full px-8 bg-violet-600 hover:bg-violet-700 disabled:opacity-40"
        >
          확인 완료, 인터뷰 시작!
          <ArrowRight className="w-4 h-4" />
        </Button>

        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors"
        >
          파일 없이 바로 시작하기
        </button>
      </div>
    </motion.div>
  );
};

export default HomepageUploadScreen;
