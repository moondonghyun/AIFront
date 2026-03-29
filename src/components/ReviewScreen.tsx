import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Check, Download, ArrowRight } from "lucide-react";
import { questions, questionLabels } from "@/data/questions";
import { useState } from "react";
import { toast } from "sonner";

interface ReviewScreenProps {
  answers: string[];
  onEdit: (index: number) => void;
  onNext: () => void;
}

const ReviewScreen = ({ answers, onEdit, onNext }: ReviewScreenProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = questions
      .map((q, i) => `## ${questionLabels[i]}\n**Q: ${q.title}**\n${answers[i] || "(미입력)"}\n`)
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("클립보드에 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-12"
    >
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-1">
            Review
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            브리핑 요약
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 rounded-full"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "복사됨" : "전체 복사"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
          >
            <Download className="w-3.5 h-3.5" />
            JSON 다운로드
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="group border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono text-muted-foreground/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {questionLabels[i]}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {answers[i] || (
                    <span className="text-muted-foreground/40 italic">미입력</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onEdit(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Next button */}
      <div className="flex justify-end mt-10">
        <Button
          onClick={onNext}
          size="sm"
          className="gap-1.5 rounded-full px-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          다음
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};

export default ReviewScreen;
