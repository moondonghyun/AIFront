import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, PenLine, Send, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatPersonality } from "@/components/CatCharacter";
import CharacterBubble, { CHARACTER_ENCOURAGEMENTS } from "@/components/CharacterBubble";
import {
  homepageQuestions,
  homepageQuestionLabels,
  type HomepageQuestion,
} from "@/data/homepage-questions";

interface HomepageInterviewScreenProps {
  answers: string[];
  currentStep: number;
  direction: 1 | -1;
  personality: CatPersonality;
  onAnswer: (index: number, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
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
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  maxSelect?: number;
  ordered?: boolean;
}) {
  // Maintain selection order via an ordered array
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
    const idx = predefinedSelected.indexOf(option);
    let next: string[];
    if (idx !== -1) {
      next = predefinedSelected.filter((_, i) => i !== idx);
    } else {
      if (maxSelect && predefinedSelected.length >= maxSelect) return;
      next = [...predefinedSelected, option];
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
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={atMax}
              className={`px-4 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all flex items-center gap-1.5 ${
                selected
                  ? "border-violet-500 bg-violet-500 text-white shadow-sm"
                  : atMax
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

// ─── Grouped multi-select ────────────────────────────────────────

function GroupedMultiSelectInput({
  groups,
  value,
  onChange,
}: {
  groups: NonNullable<HomepageQuestion["groups"]>;
  value: string;
  onChange: (val: string) => void;
}) {
  const allSelected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleOption = (option: string, group: (typeof groups)[number]) => {
    const groupOptions = group.options;
    const groupSelected = allSelected.filter((s) => groupOptions.includes(s));
    const otherSelected = allSelected.filter((s) => !groupOptions.includes(s));

    if (groupSelected.includes(option)) {
      onChange([...otherSelected, ...groupSelected.filter((s) => s !== option)].join(", "));
    } else {
      if (group.maxSelect && groupSelected.length >= group.maxSelect) {
        // Replace the last selection in this group
        const replaced = groupSelected.slice(0, group.maxSelect - 1);
        onChange([...otherSelected, ...replaced, option].join(", "));
      } else {
        onChange([...allSelected, option].join(", "));
      }
    }
  };

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const groupSelected = allSelected.filter((s) => group.options.includes(s));
        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {group.label}
              </span>
              {group.maxSelect && (
                <span className="text-[10px] text-muted-foreground/50">
                  ({groupSelected.length}/{group.maxSelect})
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = groupSelected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option, group)}
                    className={`px-3 py-2 rounded-2xl text-sm font-medium border-2 transition-all flex items-center gap-1.5 ${
                      selected
                        ? "border-violet-500 bg-violet-500 text-white shadow-sm"
                        : "border-border text-muted-foreground hover:border-violet-300 hover:text-foreground"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub question (single-select below text input) ───────────────

function SubQuestionInput({
  sub,
  value,
  onChange,
}: {
  sub: NonNullable<HomepageQuestion["sub"]>;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">{sub.label}</p>
      <div className="flex flex-wrap gap-2">
        {sub.options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected ? "" : option)}
              className={`px-3 py-2 rounded-2xl text-xs font-medium border-2 transition-all ${
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
    </div>
  );
}

// ─── Per-step encouragement from character ────────────────────────

const STEP_MESSAGES: string[] = [
  "어떤 서비스를 만들고 싶은지 알려주세요!",
  "좋아요! 방문자가 가장 먼저 했으면 하는 행동은 뭘까요?",
  "어디서 주로 사용될 서비스인가요?",
  "홈페이지를 어떻게 구성할지 골라주세요!",
  "홈 화면에 넣고 싶은 섹션을 골라주세요!",
  "원하는 색감 방향을 골라주세요!",
  "분위기와 스타일을 골라볼까요?",
  "마지막이에요! 참고할 만한 사이트가 있으면 알려주세요!",
];

// ─── Main component ───────────────────────────────────────────────

const SUB_SEP = " ||SUB|| ";

const HomepageInterviewScreen = ({
  answers,
  currentStep,
  direction,
  personality,
  onAnswer,
  onNext,
  onPrev,
}: HomepageInterviewScreenProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const question: HomepageQuestion = homepageQuestions[currentStep];
  const total = homepageQuestions.length;
  const answer = answers[currentStep] || "";
  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  // For sub-question: store main + sub separated by SUB_SEP
  const mainAnswer = question.sub ? (answer.split(SUB_SEP)[0] || "") : answer;
  const subAnswer = question.sub ? (answer.split(SUB_SEP)[1] || "") : "";

  const updateMainAnswer = useCallback(
    (val: string) => {
      if (question.sub) {
        const sub = answer.split(SUB_SEP)[1] || "";
        onAnswer(currentStep, sub ? `${val}${SUB_SEP}${sub}` : val);
      } else {
        onAnswer(currentStep, val);
      }
    },
    [question.sub, answer, currentStep, onAnswer],
  );

  const updateSubAnswer = useCallback(
    (val: string) => {
      const main = answer.split(SUB_SEP)[0] || "";
      onAnswer(currentStep, val ? `${main}${SUB_SEP}${val}` : main);
    },
    [answer, currentStep, onAnswer],
  );

  // Show encouragement if previous step was answered
  const prevAnswer = currentStep > 0 ? answers[currentStep - 1] : "";
  const showEncouragement = currentStep > 0 && prevAnswer.trim().length > 0;
  const encouragement =
    CHARACTER_ENCOURAGEMENTS[currentStep % CHARACTER_ENCOURAGEMENTS.length];

  useEffect(() => {
    if (question.type === "text") {
      const timer = setTimeout(() => textareaRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, question.type]);

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

  const progress = ((currentStep + 1) / total) * 100;
  const hasAnswer = answer.trim().length > 0;

  return (
    <motion.div
      key={`hp-q-${currentStep}`}
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
          initial={{ width: `${(currentStep / total) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-medium text-violet-500 tracking-wide">
          {homepageQuestionLabels[currentStep]}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground/60 font-mono">
          {currentStep + 1} / {total}
        </span>
      </div>

      {/* Encouragement (if previous was answered) */}
      <AnimatePresence mode="wait">
        {showEncouragement && (
          <motion.div
            key={`enc-${currentStep}`}
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

      {/* Character asks the question */}
      <div className="mb-6">
        <CharacterBubble
          message={question.title}
          sub={STEP_MESSAGES[currentStep]}
          personality={personality}
        />
      </div>

      {/* Hint */}
      {question.hint && (
        <p className="text-xs text-muted-foreground/60 mb-4 ml-0 sm:ml-[60px]">
          {question.hint}
        </p>
      )}

      {/* User's answer area */}
      <div className="ml-0 sm:ml-[60px]">
        {question.type === "single-select" && question.options ? (
          <SingleSelectInput
            options={question.options}
            value={mainAnswer}
            onChange={updateMainAnswer}
          />
        ) : question.type === "multi-select-with-custom" && question.groups ? (
          <GroupedMultiSelectInput
            groups={question.groups}
            value={mainAnswer}
            onChange={updateMainAnswer}
          />
        ) : question.type === "multi-select-with-custom" && question.options ? (
          <MultiSelectWithCustomInput
            options={question.options}
            value={mainAnswer}
            onChange={updateMainAnswer}
            maxSelect={question.maxSelect}
            ordered={question.ordered}
          />
        ) : (
          <div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={mainAnswer}
                onChange={(e) => updateMainAnswer(e.target.value)}
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
                disabled={!question.optional && !mainAnswer.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {question.sub && (
              <SubQuestionInput
                sub={question.sub}
                value={subAnswer}
                onChange={updateSubAnswer}
              />
            )}
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
          {question.optional && !hasAnswer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              건너뛰기
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground/40 hidden sm:block">
            Ctrl + Enter
          </span>
          <Button
            onClick={onNext}
            size="sm"
            disabled={!question.optional && !hasAnswer}
            className="gap-1.5 rounded-full px-5 bg-violet-600 hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLast ? (
              <>
                완성하기
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

export default HomepageInterviewScreen;
