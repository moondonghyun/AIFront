import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import CatCharacter, { type CatPersonality } from "@/components/CatCharacter";
import CharacterBubble from "@/components/CharacterBubble";
import type { GeneratedInterviewQuestion } from "@/lib/ai-types";
import type { InterviewProgress } from "@/lib/briefing-state";

interface SecondaryInterviewScreenProps {
  questions: GeneratedInterviewQuestion[];
  progress: InterviewProgress;
  personality: CatPersonality;
  onComplete: (answersByQuestionId: Record<string, string>) => void;
  onBack: () => void;
  isLoading?: boolean;
  round?: number;
  loadingTitle?: string;
  loadingDescription?: string;
}

const LOADING_MESSAGES = [
  "잠깐, 답변을 꼼꼼히 분석하고 있어요...",
  "음... 어떤 질문이 좋을지 고민 중이에요...",
  "거의 다 됐어요! 질문을 정리하고 있어요...",
];

const SecondaryInterviewScreen = ({
  questions,
  progress,
  personality,
  onComplete,
  onBack,
  isLoading = false,
  round = 1,
  loadingTitle = "질문을 준비하고 있어요",
  loadingDescription,
}: SecondaryInterviewScreenProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = questions[activeIndex] ?? null;

  const autoResize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.max(80, element.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setAnswersByQuestionId(
      Object.fromEntries(questions.map((question) => [question.id, ""])) as Record<string, string>,
    );
  }, [questions]);

  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 300);
    return () => window.clearTimeout(timer);
  }, [activeIndex, currentQuestion?.id]);

  useEffect(() => {
    autoResize();
  }, [activeIndex, answersByQuestionId, autoResize]);

  if (isLoading) {
    const loadingMsg = LOADING_MESSAGES[round % LOADING_MESSAGES.length];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
      >
        <CatCharacter mood="thinking" size={72} personality={personality} />
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {loadingTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {loadingDescription || loadingMsg}
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
      </motion.div>
    );
  }

  if (!currentQuestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
      >
        <CatCharacter mood="idle" size={72} personality={personality} />
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            앗, 질문을 준비하지 못했어요
          </h2>
          <p className="text-sm text-muted-foreground">
            이전 단계로 돌아가서 다시 시도해 주세요!
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-full">
          <ArrowLeft className="h-3.5 w-3.5" />
          돌아가기
        </Button>
      </motion.div>
    );
  }

  const currentAnswer = answersByQuestionId[currentQuestion.id] || "";
  const answeredCount = questions.filter(
    (question) => (answersByQuestionId[question.id] || "").trim().length > 0,
  ).length;
  const canGoNext = currentAnswer.trim().length > 0;
  const canSubmitBatch = answeredCount === questions.length && questions.length > 0;

  const updateAnswer = (value: string) => {
    setAnswersByQuestionId((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
  };

  const handleSubmit = () => {
    if (!canSubmitBatch) {
      return;
    }

    onComplete(
      Object.fromEntries(
        Object.entries(answersByQuestionId).map(([questionId, answer]) => [questionId, answer.trim()]),
      ),
    );
  };

  const handleNextStep = () => {
    if (!canGoNext) {
      return;
    }

    if (activeIndex < questions.length - 1) {
      setActiveIndex((index) => index + 1);
      return;
    }

    handleSubmit();
  };

  const handlePreviousStep = () => {
    if (activeIndex === 0) {
      onBack();
      return;
    }

    setActiveIndex((index) => index - 1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleNextStep();
    }
  };

  return (
    <motion.div
      key={questions.map((question) => question.id).join("-")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="flex min-h-[70vh] flex-col justify-center py-6"
    >
      {/* Progress bar */}
      <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/30">
        <motion.div
          className="h-full rounded-full bg-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress.completionPercentage}%` }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        />
      </div>

      {/* Status badges */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-violet-500 tracking-wide">
          추가 인터뷰 라운드 {round}
        </span>
        <span className="font-mono text-xs text-muted-foreground/60">
          {progress.completionPercentage}% 완성
        </span>
      </div>

      {/* Question tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {questions.map((question, index) => {
          const answered = (answersByQuestionId[question.id] || "").trim().length > 0;
          const active = index === activeIndex;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-violet-500 text-white"
                  : answered
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300"
                    : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {answered ? <Check className="mr-1 inline h-3 w-3" /> : null}
              {index + 1}
            </button>
          );
        })}
        <span className="self-center text-[10px] text-muted-foreground/50 ml-1">
          {answeredCount}/{questions.length} 답변
        </span>
      </div>

      {/* Character bubble with the question */}
      <div className="mb-4">
        <CharacterBubble
          message={currentQuestion.question}
          sub={currentQuestion.reason}
          personality={personality}
        />
      </div>

      {/* Target fields hint */}
      <div className="mb-4 ml-0 sm:ml-[60px] flex flex-wrap items-center gap-1.5">
        {currentQuestion.targetFields.map((field) => (
          <span
            key={field}
            className="rounded-full bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 text-[10px] font-mono text-violet-500"
          >
            {field}
          </span>
        ))}
      </div>

      {/* Answer area */}
      <div className="ml-0 sm:ml-[60px] relative">
        <textarea
          ref={textareaRef}
          value={currentAnswer}
          onChange={(event) => updateAnswer(event.target.value)}
          onInput={autoResize}
          onKeyDown={handleKeyDown}
          placeholder={currentQuestion.placeholder}
          className="w-full resize-none bg-white dark:bg-muted/30 text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/40 placeholder:leading-relaxed rounded-2xl px-4 py-3 pr-12 border border-border focus:border-violet-400 outline-none transition-colors shadow-sm"
          rows={3}
        />
        <button
          type="button"
          onClick={handleNextStep}
          className="absolute right-3 bottom-3 h-7 w-7 rounded-full bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition-colors disabled:opacity-30"
          disabled={!canGoNext}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousStep}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {activeIndex === 0 ? "돌아가기" : "이전 질문"}
        </Button>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-muted-foreground/40 sm:block">Ctrl + Enter</span>
          <Button
            onClick={handleNextStep}
            size="sm"
            disabled={activeIndex < questions.length - 1 ? !canGoNext : !canSubmitBatch}
            className="gap-1.5 rounded-full px-5 bg-violet-600 hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {activeIndex < questions.length - 1 ? (
              <>
                다음 질문
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                이번 묶음 반영하기
                <Check className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SecondaryInterviewScreen;
