import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, PenLine, Send } from "lucide-react";
import { questionLabels, type Question } from "@/data/questions";
import type { CatPersonality } from "@/components/CatCharacter";
import CharacterBubble, { CHARACTER_ENCOURAGEMENTS } from "@/components/CharacterBubble";

interface QuestionScreenProps {
  question: Question;
  step: number;
  total: number;
  answer: string;
  direction: 1 | -1;
  personality: CatPersonality;
  onAnswer: (val: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  prevAnswer?: string;
}

// ─── Single-select input ──────────────────────────────────────────

function SingleSelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all ${
              selected
                ? "border-violet-500 bg-violet-500 text-white shadow-sm"
                : "border-border text-muted-foreground hover:border-violet-300 hover:text-foreground"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ─── Multi-select with custom input ───────────────────────────────

function MultiSelectWithCustomInput({
  options,
  value,
  onChange,
  maxSelect,
  ordered,
  exclusive,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  maxSelect?: number;
  ordered?: boolean;
  exclusive?: string[];
}) {
  const parts = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const predefinedSelected = parts.filter((p) => options.includes(p));
  const customParts = parts.filter((p) => !options.includes(p));
  const hasCustom = customParts.length > 0;
  const [showCustom, setShowCustom] = useState(hasCustom);
  const [customText, setCustomText] = useState(customParts.join(", "));

  const buildValue = useCallback(
    (selected: string[], custom: string) => {
      const all = [...selected];
      const trimmed = custom.trim();
      if (trimmed) {
        all.push(trimmed);
      }
      onChange(all.join(", "));
    },
    [onChange],
  );

  const toggleOption = (option: string) => {
    const isExclusive = exclusive?.includes(option);
    const idx = predefinedSelected.indexOf(option);
    let next: string[];

    if (idx !== -1) {
      // Deselect
      next = predefinedSelected.filter((_, i) => i !== idx);
    } else {
      if (isExclusive) {
        // Exclusive option: deselect everything else
        next = [option];
      } else {
        // Non-exclusive: remove any exclusive options first
        const withoutExclusive = exclusive
          ? predefinedSelected.filter((p) => !exclusive.includes(p))
          : predefinedSelected;
        if (maxSelect && withoutExclusive.length >= maxSelect) return;
        next = [...withoutExclusive, option];
      }
    }
    buildValue(next, showCustom ? customText : "");
  };

  const handleCustomToggle = () => {
    if (showCustom) {
      setShowCustom(false);
      setCustomText("");
      buildValue(predefinedSelected, "");
    } else {
      setShowCustom(true);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    buildValue(predefinedSelected, text);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const orderIdx = predefinedSelected.indexOf(option);
          const selected = orderIdx !== -1;
          const atMax = !!(maxSelect && predefinedSelected.length >= maxSelect && !selected);
          const isExclusiveOption = exclusive?.includes(option);
          // Disable non-exclusive options when an exclusive option is selected
          const exclusiveActive = exclusive && predefinedSelected.some((p) => exclusive.includes(p));
          const disabled = atMax || (!isExclusiveOption && !!exclusiveActive && !selected);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={`px-4 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all flex items-center gap-1.5 ${
                selected
                  ? "border-violet-500 bg-violet-500 text-white shadow-sm"
                  : disabled
                    ? "border-border text-muted-foreground/30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:border-violet-300 hover:text-foreground"
              }`}
            >
              {ordered && selected ? (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold">
                  {orderIdx + 1}
                </span>
              ) : selected ? (
                <Check className="w-3 h-3" />
              ) : null}
              {option}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleCustomToggle}
          className={`px-4 py-2.5 rounded-2xl text-sm font-medium border-2 border-dashed transition-all flex items-center gap-1.5 ${
            showCustom
              ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-foreground"
              : "border-border text-muted-foreground hover:border-violet-300 hover:text-foreground"
          }`}
        >
          <PenLine className="w-3 h-3" />
          기타
        </button>
      </div>

      {maxSelect && (
        <p className="text-xs text-muted-foreground/50">
          {predefinedSelected.length} / {maxSelect}개 선택
        </p>
      )}

      {showCustom && (
        <input
          type="text"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="직접 입력해주세요"
          className="w-full bg-violet-50/50 dark:bg-violet-900/10 text-sm text-foreground placeholder:text-muted-foreground/40 rounded-xl px-4 py-3 border border-violet-200 dark:border-violet-800 focus:border-violet-400 outline-none transition-colors"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

const QuestionScreen = ({
  question,
  step,
  total,
  answer,
  direction,
  personality,
  onAnswer,
  onNext,
  onPrev,
  isFirst,
  isLast,
  prevAnswer = "",
}: QuestionScreenProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showEncouragement = step > 0 && prevAnswer.trim().length > 0;
  const encouragement = CHARACTER_ENCOURAGEMENTS[step % CHARACTER_ENCOURAGEMENTS.length];

  useEffect(() => {
    if (question.type === "text") {
      const timer = setTimeout(() => textareaRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [step, question.type]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(80, el.scrollHeight) + "px";
    }
  }, []);

  useEffect(() => autoResize(), [answer, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
  };

  const progress = ((step + 1) / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: direction * 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: direction * -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col min-h-[70vh] justify-center py-6"
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-violet-500 rounded-full"
          initial={{ width: `${(step / total) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-medium text-violet-500 tracking-wide">
          {questionLabels[step]}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground/60 font-mono">
          {step + 1} / {total}
        </span>
      </div>

      {/* Encouragement */}
      <AnimatePresence mode="wait">
        {showEncouragement && (
          <motion.div
            key={`enc-${step}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-3"
          >
            <p className="text-xs text-violet-500 font-medium">{encouragement}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character bubble question */}
      <div className="mb-6">
        <CharacterBubble message={question.title} personality={personality} />
      </div>

      {/* Hint */}
      {question.hint && (
        <p className="text-xs text-muted-foreground/60 mb-4 ml-0 sm:ml-[60px]">
          {question.hint}
        </p>
      )}

      {/* Input */}
      <div className="ml-0 sm:ml-[60px]">
        {question.type === "single-select" && question.options ? (
          <SingleSelectInput
            options={question.options}
            value={answer}
            onChange={onAnswer}
          />
        ) : question.type === "multi-select-with-custom" && question.options ? (
          <MultiSelectWithCustomInput
            options={question.options}
            value={answer}
            onChange={onAnswer}
            maxSelect={question.maxSelect}
            ordered={question.ordered}
            exclusive={question.exclusive}
          />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              onInput={autoResize}
              onKeyDown={handleKeyDown}
              placeholder={question.placeholder}
              className="w-full resize-none bg-white dark:bg-muted/30 text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/40 placeholder:leading-relaxed rounded-2xl px-4 py-3 pr-12 border border-border focus:border-violet-400 outline-none transition-colors shadow-sm"
              rows={3}
            />
            <button
              type="button"
              onClick={onNext}
              className="absolute right-3 bottom-3 h-7 w-7 rounded-full bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition-colors disabled:opacity-30"
              disabled={!answer.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <div>
          {!isFirst && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              이전
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground/40 hidden sm:block">
            Ctrl + Enter
          </span>
          <Button
            onClick={onNext}
            size="sm"
            className="gap-1.5 rounded-full px-5 bg-violet-600 hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLast ? (
              <>
                완료
                <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                다음
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestionScreen;
