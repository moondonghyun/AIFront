import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AdditionalContextScreenProps {
  projectName: string;
  onBack: () => void;
  onSubmit: (context: string) => void;
  onSkip: () => void;
}

const PLACEHOLDER = `추가로 반영할 내용을 자유롭게 입력하세요.

예시:
- 사용자 인증은 이메일 + 소셜 로그인(Google, Kakao) 지원
- 대시보드에 월별 매출 차트와 최근 주문 목록 필요
- 상품 목록은 무한 스크롤 방식으로 구현
- 관리자/일반 사용자 권한 분리 필요

또는 JSON 형식으로 붙여넣기:
{
  "auth": ["email", "google", "kakao"],
  "pages": ["dashboard", "products", "orders"],
  ...
}`;

const AdditionalContextScreen = ({
  projectName,
  onBack,
  onSubmit,
  onSkip,
}: AdditionalContextScreenProps) => {
  const [text, setText] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Additional Context
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {projectName} — 추가 컨텍스트
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            홈 UI 스타일 외에 구현에 반영할 추가 정보를 입력하세요. 자유 텍스트 또는 JSON 모두 가능합니다.
            <br />
            없으면 건너뛰어도 됩니다.
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

      <div className="mb-1 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">추가 컨텍스트</span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        className="mb-1 h-72 resize-none rounded-2xl border-border bg-card font-mono text-xs leading-relaxed"
        spellCheck={false}
        autoFocus
      />
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Cmd+Enter로 바로 진행합니다.</p>
        <p className="text-xs text-muted-foreground">
          {text.length > 0 ? `${text.length}자` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => onSubmit(text.trim())}
          disabled={!text.trim()}
          className="w-full gap-2 rounded-full"
        >
          이 내용 반영해서 구현 시작
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={onSkip}
          variant="outline"
          className="w-full gap-2 rounded-full"
        >
          <SkipForward className="h-4 w-4" />
          건너뛰고 바로 구현 시작
        </Button>
      </div>
    </motion.div>
  );
};

export default AdditionalContextScreen;
