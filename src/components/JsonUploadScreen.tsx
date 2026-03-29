import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface JsonUploadScreenProps {
  onUpload: (json: Record<string, unknown>) => void;
  onBack?: () => void;
}

const PLACEHOLDER = `# 서비스 이름

## 1. 서비스 개요
서비스 목적, 핵심 가치, 대상 사용자를 설명합니다.

## 2. 홈화면 레이아웃 구조
홈화면의 전체 구조와 섹션 배치를 설명합니다.
- 상단 영역: 헤더 / 히어로
- 중간 영역: 주요 콘텐츠 섹션
- 하단 영역: CTA / 푸터

## 3. 섹션별 상세 명세
각 섹션의 콘텐츠, 구성 요소, 표시 데이터를 설명합니다.

### 섹션 1 — 이름
- 목적:
- 표시 항목:

## 4. 주요 인터랙션 & CTA
사용자가 수행할 수 있는 주요 액션과 버튼을 나열합니다.
- CTA 1: 버튼명 → 이동 대상
- CTA 2: 버튼명 → 이동 대상

## 5. 디자인 톤 & 스타일 가이드
브랜드 무드, 색상 방향, 폰트, 비주얼 톤을 설명합니다.
- 톤: 전문적 / 친근한 / 고급스러운 등
- 주 색상:
- 보조 색상:
- 폰트 방향:

## 6. 반응형 대응
모바일 / 태블릿 / 데스크톱 레이아웃 차이를 설명합니다.

## 7. 컴포넌트 목록
사용할 UI 컴포넌트를 나열합니다.
- 버튼, 카드, 모달, 탭 등`;

/** Extract service name from the first H1 heading in markdown */
function extractServiceName(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "서비스";
}

const JsonUploadScreen = ({ onUpload, onBack }: JsonUploadScreenProps) => {
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setError(null);
    const text = rawText.trim();

    if (!text) {
      setError("Markdown 내용을 입력해 주세요.");
      return;
    }

    const serviceName = extractServiceName(text);
    const briefing: Record<string, unknown> = {
      _format: "markdown",
      content: text,
      // Provide a minimal service.name so deriveProjectName works
      service: { name: serviceName },
    };

    toast.success("명세서를 확인했습니다. 다음 단계로 이동합니다.");
    onUpload(briefing);
  };

  const handleFileRead = (file: File) => {
    if (!file.name.endsWith(".md") && file.type !== "text/markdown" && file.type !== "text/plain") {
      setError(".md 파일만 업로드할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawText(content);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="py-12"
    >
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Markdown Input
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            서비스 명세서를 업로드하세요
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            .md 파일을 드래그하거나 직접 Markdown을 입력하면 홈 화면 3안 생성으로 이동합니다.
          </p>
        </div>
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !rawText && fileInputRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-6 transition-colors ${
          isDragOver
            ? "border-foreground bg-muted/40"
            : "border-border bg-muted/10 hover:border-foreground/40 hover:bg-muted/20"
        }`}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          .md 파일을 드래그하거나{" "}
          <span className="font-medium text-foreground underline underline-offset-2">클릭하여 선택</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
        />
      </div>

      {/* Divider */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">또는 직접 입력</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Textarea */}
      <div className="mb-1 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Markdown 내용</span>
      </div>
      <Textarea
        value={rawText}
        onChange={(e) => { setRawText(e.target.value); if (error) setError(null); }}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        className="mb-1 h-80 resize-none rounded-2xl border-border bg-card font-mono text-xs leading-relaxed"
        spellCheck={false}
      />

      <div className="mb-6 flex items-center justify-between">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Cmd+Enter 또는 아래 버튼으로 확인합니다.</p>
        )}
        <p className="text-xs text-muted-foreground">
          {rawText.length > 0 ? `${rawText.length}자` : ""}
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full gap-2 rounded-full"
        disabled={!rawText.trim()}
      >
        <CheckCircle2 className="h-4 w-4" />
        명세서 확인하고 다음으로
      </Button>
    </motion.div>
  );
};

export default JsonUploadScreen;
