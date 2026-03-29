import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Phase1 components (interview pipeline) ───
import type { CatPersonality } from "@/components/CatCharacter";
import IntroScreen, { type TrackChoice } from "@/components/IntroScreen";
import HomepageInterviewScreen from "@/components/HomepageInterviewScreen";
import HomepageResultScreen from "@/components/HomepageResultScreen";
import HomepageUploadScreen from "@/components/HomepageUploadScreen";
import QuestionScreen from "@/components/QuestionScreen";
import ReviewScreen from "@/components/ReviewScreen";
import SecondaryInterviewScreen from "@/components/SecondaryInterviewScreen";
import BriefingReadyScreen from "@/components/BriefingReadyScreen";
import BriefingCompleteScreen from "@/components/BriefingCompleteScreen";

// ─── Phase2 components (home style + full app) ───
import HomeStyleScreen from "@/components/HomeStyleScreen";
import HomeStyleHandoffScreen from "@/components/HomeStyleHandoffScreen";
import HomeStyleMdScreen from "@/components/HomeStyleMdScreen";
import AdditionalContextScreen from "@/components/AdditionalContextScreen";
import FullAppScreen from "@/components/FullAppScreen";

// ─── Data ───
import { homepageQuestions } from "@/data/homepage-questions";
import { questions } from "@/data/questions";

// ─── Types ───
import type { GeneratedInterviewQuestion, InterviewHistoryEntry } from "@/lib/ai-types";
import type { DesignDocument } from "@/lib/design-types";
import type {
  RenderedHomeStyleOption,
  RenderedHomeStyleSet,
} from "@/lib/home-style-types";

// ─── State helpers ───
import {
  applyInterviewUpdates,
  calculateInterviewProgress,
  collectFilledFieldSummary,
  collectInterviewTargets,
  collectRemainingTargets,
  type InterviewProgress,
} from "@/lib/briefing-state";

// ─── Phase1 AI: Claude (interview pipeline) ───
import {
  applyInterviewAnswersBatchDirect,
  generateHomepageMd,
  generateUIBriefingFromAnswers,
  generateInterviewQuestionBatchDirect,
} from "@/lib/claude-direct";

// ─── Phase2 AI: Gemini (home style + full app) ───
import {
  generateRenderedHomeStyleOptionsDirect,
  generateHomeScreenMarkdownDirect,
  generateFullAppDirect,
  refineHomeScreenOptionDirect,
} from "@/lib/gemini-direct";
import type { FullWebProject } from "@/lib/gemini-direct";

// ─── Combined Phase State Machine ───
//
// Phase1 (interview pipeline):
//   intro → homepage-interview → generating-homepage-md → homepage-result
//     → homepage-upload → interview → review → generating-briefing → briefing-ready
//
// Phase2 (home style 3안):
//   → generating-home-style → home-style → home-style-selected
//     → generating-home-style-md → home-style-md
//
// Phase1 (secondary interview, enriched with home style MD):
//   → generating-question → secondary-interview → applying-answer → (loop) → ui-ready
//
// Phase2 (final output):
//   → additional-context → generating-full-app → full-app

type Phase =
  // Phase1: intro + homepage interview
  | "intro"
  | "homepage-interview"
  | "generating-homepage-md"
  | "homepage-result"
  | "homepage-upload"
  // Phase1: main interview
  | "interview"
  | "review"
  | "generating-briefing"
  | "briefing-ready"
  // Phase2: home style 3안
  | "generating-home-style"
  | "home-style"
  | "home-style-selected"
  | "generating-home-style-md"
  | "home-style-md"
  // Phase1: secondary interview (enriched)
  | "generating-question"
  | "secondary-interview"
  | "applying-answer"
  | "ui-ready"
  // Phase2: full app generation
  | "additional-context"
  | "generating-full-app"
  | "full-app";

const defaultInterviewProgress: InterviewProgress = {
  totalTargets: 0,
  answeredTargets: 0,
  remainingTargets: 0,
  completionRate: 1,
  completionPercentage: 100,
};

function readBriefingText(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value
  ) {
    return readBriefingText((value as Record<string, unknown>).value);
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function deriveProjectName(
  briefingJson: Record<string, unknown> | null,
  designDocument: DesignDocument | null,
): string {
  if (designDocument?.service_name?.trim()) return designDocument.service_name.trim();
  if (!briefingJson) return "서비스";
  const service =
    briefingJson.service &&
    typeof briefingJson.service === "object" &&
    !Array.isArray(briefingJson.service)
      ? (briefingJson.service as Record<string, unknown>)
      : null;
  return readBriefingText(service?.name) || readBriefingText(service?.summary) || "서비스";
}

const Index = () => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [personality, setPersonality] = useState<CatPersonality>("smart");

  // ─── Homepage interview state (Phase1) ───
  const [hpStep, setHpStep] = useState(0);
  const [hpAnswers, setHpAnswers] = useState<string[]>(
    Array(homepageQuestions.length).fill(""),
  );
  const [hpDirection, setHpDirection] = useState<1 | -1>(1);
  const [homepageMd, setHomepageMd] = useState<string | null>(null);

  // ─── Main interview state (Phase1) ───
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(""));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [briefingJson, setBriefingJson] = useState<Record<string, unknown> | null>(null);
  const [initialTargetPaths, setInitialTargetPaths] = useState<string[]>([]);
  const [currentInterviewQuestions, setCurrentInterviewQuestions] = useState<
    GeneratedInterviewQuestion[]
  >([]);
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryEntry[]>([]);
  const interviewRound = useRef(0);
  const totalQuestionsAsked = useRef(0);

  // ─── Home style state (Phase2) ───
  const [designDocument] = useState<DesignDocument | null>(null);
  const [generatedHomeStyleSet, setGeneratedHomeStyleSet] =
    useState<RenderedHomeStyleSet | null>(null);
  const [selectedHomeStyle, setSelectedHomeStyle] =
    useState<RenderedHomeStyleOption | null>(null);
  const [homeStyleMd, setHomeStyleMd] = useState<string | null>(null);

  // ─── Full app state (Phase2) ───
  const [additionalContext, setAdditionalContext] = useState<string | null>(null);
  const [generatedFullApp, setGeneratedFullApp] = useState<FullWebProject | null>(null);

  const projectName = useMemo(
    () => deriveProjectName(briefingJson, designDocument),
    [briefingJson, designDocument],
  );

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: Homepage interview handlers
  // ═══════════════════════════════════════════════════════════════════

  const updateHpAnswer = useCallback((index: number, value: string) => {
    setHpAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const hpGoNext = useCallback(() => {
    if (hpStep < homepageQuestions.length - 1) {
      setHpDirection(1);
      setHpStep((s) => s + 1);
      return;
    }

    // Last question → generate homepage MD
    setPhase("generating-homepage-md");
    const qaList = homepageQuestions.map((q, i) => ({
      question: q.title,
      answer: hpAnswers[i] || "",
    }));

    generateHomepageMd(qaList)
      .then((md) => {
        setHomepageMd(md);
        setPhase("homepage-result");
      })
      .catch((error) => {
        console.error("Failed to generate homepage MD:", error);
        toast.error("홈페이지 설계 문서 생성에 실패했습니다.");
        setPhase("homepage-interview");
      });
  }, [hpStep, hpAnswers]);

  const hpGoPrev = useCallback(() => {
    if (hpStep > 0) {
      setHpDirection(-1);
      setHpStep((s) => s - 1);
    }
  }, [hpStep]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: Main interview handlers
  // ═══════════════════════════════════════════════════════════════════

  const updateAnswer = useCallback((index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    const currentQuestion = questions[currentStep];
    if (currentQuestion.skipLogic) {
      const { value, skipTo } = currentQuestion.skipLogic;
      if (answers[currentStep] === value) {
        const skipToIndex = questions.findIndex((q) => q.id === skipTo);
        if (skipToIndex !== -1 && skipToIndex < questions.length) {
          setDirection(1);
          setCurrentStep(skipToIndex);
          return;
        }
      }
    }

    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep((step) => step + 1);
      return;
    }

    setPhase("review");
  }, [currentStep, answers]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((step) => step - 1);
    }
  }, [currentStep]);

  const goToQuestion = useCallback(
    (index: number) => {
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
      setPhase("interview");
    },
    [currentStep],
  );

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1 → 2 transition: Review complete → generate briefing → home style
  // ═══════════════════════════════════════════════════════════════════

  const handleReviewComplete = useCallback(async () => {
    setPhase("generating-briefing");
    setCurrentInterviewQuestions([]);
    setInterviewHistory([]);
    interviewRound.current = 0;

    const qaList = questions.map((q, i) => ({
      question: q.title,
      answer: answers[i] || "",
    }));

    try {
      const json = await generateUIBriefingFromAnswers(qaList, homepageMd);
      const targets = collectInterviewTargets(json);
      const targetPaths = targets.map((t) => t.path);

      setBriefingJson(json);
      setInitialTargetPaths(targetPaths);
      setPhase("briefing-ready");
    } catch (error) {
      console.error("Failed to generate briefing JSON:", error);
      toast.error("UI 브리핑 생성에 실패했습니다.");
      setPhase("review");
    }
  }, [answers, homepageMd]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: Home style generation (after briefing-ready)
  // ═══════════════════════════════════════════════════════════════════

  const handleGenerateHomeStyles = useCallback(async () => {
    if (!briefingJson) return;
    setPhase("generating-home-style");

    try {
      const generatedSet = await generateRenderedHomeStyleOptionsDirect({ briefingJson });
      setGeneratedHomeStyleSet(generatedSet);
      setPhase("home-style");
      toast.success("홈 화면 3안을 생성했습니다.");
    } catch (error) {
      console.error("Failed to generate home styles:", error);
      toast.error("홈 화면 3안 생성에 실패했습니다.");
      setPhase("briefing-ready");
    }
  }, [briefingJson]);

  const handleSelectHomeStyle = useCallback((option: RenderedHomeStyleOption) => {
    setSelectedHomeStyle(option);
    setHomeStyleMd(null);
    setPhase("home-style-selected");
    toast.success("홈 화면 안을 선택했습니다.");
  }, []);

  const handleGenerateHomeStyleMd = useCallback(async () => {
    if (!selectedHomeStyle) return;
    setHomeStyleMd(null);
    setPhase("generating-home-style-md");
    try {
      const md = await generateHomeScreenMarkdownDirect(selectedHomeStyle);
      setHomeStyleMd(md);
      setPhase("home-style-md");
    } catch {
      setHomeStyleMd("");
      setPhase("home-style-md");
    }
  }, [selectedHomeStyle]);

  const handleRefineHomeStyle = useCallback(
    async (option: RenderedHomeStyleOption, prompt: string) => {
      if (!briefingJson) return;
      const refined = await refineHomeScreenOptionDirect({
        option,
        userPrompt: prompt,
        briefingJson,
      });
      setGeneratedHomeStyleSet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          options: prev.options.map((o) => (o.id === refined.id ? refined : o)),
        };
      });
    },
    [briefingJson],
  );

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1 (resumed): Secondary interview with home style context
  // ═══════════════════════════════════════════════════════════════════

  const requestNextInterviewBatch = useCallback(
    async (
      nextBriefing: Record<string, unknown>,
      targetPaths: string[],
      history: InterviewHistoryEntry[],
    ) => {
      const progress = calculateInterviewProgress(nextBriefing, targetPaths);
      console.log(
        "[requestNextBatch] 진척률:", progress.completionPercentage + "%",
        `(${progress.answeredTargets}/${progress.totalTargets})`,
        "총 질문:", totalQuestionsAsked.current,
      );
      setBriefingJson(nextBriefing);
      setCurrentInterviewQuestions([]);

      if (progress.totalTargets === 0) {
        toast.success("UI 브리핑이 완성되어 다음 단계로 이동합니다.");
        setPhase("ui-ready");
        return;
      }

      if (progress.completionRate >= 0.9) {
        toast.success(
          `${progress.totalTargets}개 항목 중 ${progress.answeredTargets}개를 채워 인터뷰를 완료합니다.`,
        );
        setPhase("ui-ready");
        return;
      }

      if (totalQuestionsAsked.current >= 30) {
        toast.success("충분한 정보를 수집했습니다. 나머지는 AI가 추론해서 채울게요.");
        setPhase("ui-ready");
        return;
      }

      const unresolvedTargets = collectRemainingTargets(nextBriefing, targetPaths);
      setPhase("generating-question");

      try {
        const nextQuestions = await generateInterviewQuestionBatchDirect({
          briefingJson: nextBriefing,
          unresolvedTargets,
          interviewHistory: history,
          filledSummary: collectFilledFieldSummary(nextBriefing, 20),
          maxQuestions: 10,
        });

        if (nextQuestions.length === 0) {
          toast.info("남은 항목을 바탕으로 다음 단계로 넘어갑니다.");
          setPhase("ui-ready");
          return;
        }

        interviewRound.current += 1;
        totalQuestionsAsked.current += nextQuestions.length;
        setCurrentInterviewQuestions(nextQuestions);
        setPhase("secondary-interview");
      } catch (error) {
        console.error("Failed to generate interview questions:", error);
        toast.error("2차 인터뷰 질문을 준비하지 못했습니다.");
        setPhase("ui-ready");
      }
    },
    [],
  );

  const handleStartSecondary = useCallback(async () => {
    if (!briefingJson) return;
    totalQuestionsAsked.current = 0;
    await requestNextInterviewBatch(briefingJson, initialTargetPaths, []);
  }, [briefingJson, initialTargetPaths, requestNextInterviewBatch]);

  const handleInterviewComplete = useCallback(
    async (answersByQuestionId: Record<string, string>) => {
      if (!briefingJson || currentInterviewQuestions.length === 0) return;

      const answeredQuestions = currentInterviewQuestions.filter(
        (q) => (answersByQuestionId[q.id] || "").trim().length > 0,
      );

      if (answeredQuestions.length === 0) {
        toast.info("답변이 입력되지 않아 다음 단계로 넘어갈 수 없습니다.");
        return;
      }

      setPhase("applying-answer");

      try {
        const candidateUpdates = await applyInterviewAnswersBatchDirect({
          briefingJson,
          questions: currentInterviewQuestions,
          answersByQuestionId,
        });

        const { nextBriefing, appliedUpdates } = applyInterviewUpdates(
          briefingJson,
          candidateUpdates,
        );

        if (appliedUpdates.length === 0) {
          toast.info("답변이 모호해서 더 구체적인 질문으로 다시 이어갑니다.");
        }

        const nextHistory: InterviewHistoryEntry[] = [
          ...interviewHistory,
          ...answeredQuestions.map((q) => ({
            questionId: q.id,
            question: q.question,
            reason: q.reason,
            placeholder: q.placeholder,
            targetFields: q.targetFields,
            answer: (answersByQuestionId[q.id] || "").trim(),
            appliedUpdates: appliedUpdates.filter((u) =>
              q.targetFields.includes(u.path),
            ),
          })),
        ];

        setInterviewHistory(nextHistory);
        await requestNextInterviewBatch(nextBriefing, initialTargetPaths, nextHistory);
      } catch (error) {
        console.error("Failed to apply interview answers:", error);
        toast.error("답변을 반영하지 못했습니다.");
        setPhase("secondary-interview");
      }
    },
    [
      briefingJson,
      currentInterviewQuestions,
      initialTargetPaths,
      interviewHistory,
      requestNextInterviewBatch,
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2 (final): Full app generation
  // ═══════════════════════════════════════════════════════════════════

  const handleGenerateFullApp = useCallback(
    async (ctx?: string | null) => {
      if (!briefingJson) return;
      const context = ctx !== undefined ? ctx : additionalContext;
      const md = homeStyleMd ?? "";
      setPhase("generating-full-app");
      try {
        const result = await generateFullAppDirect({
          briefingJson,
          homeStyleMd: md,
          designDocument,
          additionalContext: context,
        });
        setGeneratedFullApp(result);
        setPhase("full-app");
        toast.success("전체 앱 구현이 완료되었습니다.");
      } catch (error) {
        console.error("Failed to generate full app:", error);
        toast.error("전체 앱 구현에 실패했습니다.");
        setPhase("additional-context");
      }
    },
    [briefingJson, homeStyleMd, designDocument, additionalContext],
  );

  // ═══════════════════════════════════════════════════════════════════
  // Derived state
  // ═══════════════════════════════════════════════════════════════════

  const interviewProgress = briefingJson
    ? calculateInterviewProgress(briefingJson, initialTargetPaths)
    : defaultInterviewProgress;

  const isWideCanvas =
    phase === "generating-home-style" ||
    phase === "home-style" ||
    phase === "home-style-selected" ||
    phase === "generating-home-style-md" ||
    phase === "home-style-md" ||
    phase === "additional-context" ||
    phase === "generating-full-app" ||
    phase === "full-app";

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={`w-full ${isWideCanvas ? "max-w-[1520px]" : "max-w-[640px]"}`}>
        <AnimatePresence mode="wait">
          {/* ── Phase1: Intro ── */}
          {phase === "intro" && (
            <IntroScreen
              key="intro"
              onStart={(track: TrackChoice, p: CatPersonality) => {
                setPersonality(p);
                if (track === "full") {
                  setPhase("homepage-interview");
                } else if (track === ("full-skip-homepage" as TrackChoice)) {
                  setPhase("homepage-upload");
                }
              }}
              onLoadJson={(json) => {
                const targets = collectInterviewTargets(json);
                setBriefingJson(json);
                setInitialTargetPaths(targets.map((t) => t.path));
                setPersonality("smart");
                setPhase("briefing-ready");
              }}
            />
          )}

          {/* ── Phase1: Homepage interview ── */}
          {phase === "homepage-interview" && (
            <HomepageInterviewScreen
              key={`hp-${hpStep}`}
              answers={hpAnswers}
              currentStep={hpStep}
              direction={hpDirection}
              personality={personality}
              onAnswer={updateHpAnswer}
              onNext={hpGoNext}
              onPrev={hpGoPrev}
            />
          )}

          {(phase === "generating-homepage-md" || phase === "homepage-result") && (
            <HomepageResultScreen
              key="hp-result"
              markdown={homepageMd}
              isGenerating={phase === "generating-homepage-md"}
              personality={personality}
              onContinue={() => setPhase("homepage-upload")}
            />
          )}

          {phase === "homepage-upload" && (
            <HomepageUploadScreen
              key="hp-upload"
              personality={personality}
              autoMd={homepageMd}
              onComplete={(md) => {
                if (md) setHomepageMd(md);
                setPhase("interview");
              }}
              onSkip={() => setPhase("interview")}
            />
          )}

          {/* ── Phase1: Main interview (13 questions) ── */}
          {phase === "interview" && (
            <QuestionScreen
              key={`q-${currentStep}`}
              question={questions[currentStep]}
              step={currentStep}
              total={questions.length}
              answer={answers[currentStep]}
              direction={direction}
              personality={personality}
              onAnswer={(value) => updateAnswer(currentStep, value)}
              onNext={goNext}
              onPrev={goPrev}
              isFirst={currentStep === 0}
              isLast={currentStep === questions.length - 1}
              prevAnswer={currentStep > 0 ? answers[currentStep - 1] : ""}
            />
          )}

          {phase === "review" && (
            <ReviewScreen
              key="review"
              answers={answers}
              onEdit={goToQuestion}
              onNext={handleReviewComplete}
            />
          )}

          {/* ── Briefing generation loading ── */}
          {phase === "generating-briefing" && (
            <SecondaryInterviewScreen
              key="generating-briefing"
              questions={[]}
              progress={defaultInterviewProgress}
              personality={personality}
              isLoading={true}
              loadingTitle="UI 브리핑을 준비하고 있어요"
              loadingDescription="1차 인터뷰 답변을 분석해서 UI 설계용 브리핑 JSON을 만들고 있습니다."
              onComplete={() => {}}
              onBack={() => setPhase("review")}
              round={0}
            />
          )}

          {/* ── Briefing ready → launch home style generation ── */}
          {phase === "briefing-ready" && briefingJson && (
            <BriefingReadyScreen
              key="briefing-ready"
              briefingJson={briefingJson}
              personality={personality}
              onNext={handleGenerateHomeStyles}
            />
          )}

          {/* ── Phase2: Home style 3안 ── */}
          {(phase === "generating-home-style" || phase === "home-style") &&
            briefingJson && (
              <HomeStyleScreen
                key={
                  generatedHomeStyleSet
                    ? `home-style-${generatedHomeStyleSet.options.map((o) => o.id).join("-")}`
                    : phase
                }
                projectName={projectName}
                generatedSet={generatedHomeStyleSet}
                isGenerating={phase === "generating-home-style"}
                onGenerate={handleGenerateHomeStyles}
                onSelect={handleSelectHomeStyle}
                onRefine={handleRefineHomeStyle}
                onBack={() => setPhase("briefing-ready")}
              />
            )}

          {phase === "home-style-selected" &&
            generatedHomeStyleSet &&
            selectedHomeStyle && (
              <HomeStyleHandoffScreen
                key={`home-style-selected-${selectedHomeStyle.id}`}
                projectName={projectName}
                focusNote={generatedHomeStyleSet.focus_note}
                selectedStyle={selectedHomeStyle}
                onBack={() => setPhase("home-style")}
                onNext={handleGenerateHomeStyleMd}
              />
            )}

          {(phase === "generating-home-style-md" || phase === "home-style-md") &&
            selectedHomeStyle && (
              <HomeStyleMdScreen
                key="home-style-md"
                projectName={projectName}
                selectedStyle={selectedHomeStyle}
                homeStyleMd={homeStyleMd}
                isGenerating={phase === "generating-home-style-md"}
                onBack={() => setPhase("home-style-selected")}
                onNext={handleStartSecondary}
              />
            )}

          {/* ── Phase1 (resumed): Secondary interview ── */}
          {(phase === "generating-question" ||
            phase === "applying-answer" ||
            phase === "secondary-interview") && (
            <SecondaryInterviewScreen
              key={
                currentInterviewQuestions.map((q) => q.id).join("-") || phase
              }
              questions={currentInterviewQuestions}
              progress={interviewProgress}
              personality={personality}
              isLoading={
                phase === "generating-question" || phase === "applying-answer"
              }
              loadingTitle={
                phase === "applying-answer"
                  ? "답변을 UI 브리핑에 반영하고 있어요"
                  : "다음 질문 묶음을 준비하고 있어요"
              }
              loadingDescription={
                phase === "applying-answer"
                  ? "답변을 분석해서 UI 브리핑의 빈 항목을 채우고 있습니다."
                  : "남은 UI 항목을 묶어서 최대 10개의 질문으로 정리하고 있습니다."
              }
              onComplete={handleInterviewComplete}
              onBack={() => setPhase("home-style-md")}
              round={interviewRound.current}
            />
          )}

          {/* ── ui-ready: secondary interview complete → full app ── */}
          {phase === "ui-ready" && briefingJson && (
            <BriefingCompleteScreen
              key="ui-ready"
              briefingJson={briefingJson}
              progress={interviewProgress}
              selectedHomeStyle={selectedHomeStyle}
              onBack={() => setPhase("home-style-md")}
              onNext={() => setPhase("additional-context")}
            />
          )}

          {/* ── Phase2: Additional context + full app ── */}
          {phase === "additional-context" && selectedHomeStyle && (
            <AdditionalContextScreen
              key="additional-context"
              projectName={projectName}
              onBack={() => setPhase("ui-ready")}
              onSubmit={(ctx) => {
                setAdditionalContext(ctx);
                void handleGenerateFullApp(ctx);
              }}
              onSkip={() => {
                setAdditionalContext(null);
                void handleGenerateFullApp(null);
              }}
            />
          )}

          {(phase === "generating-full-app" || phase === "full-app") &&
            selectedHomeStyle && (
              <FullAppScreen
                key="full-app"
                projectName={projectName}
                fullApp={generatedFullApp ?? { previewHtml: "", files: [] }}
                isGenerating={phase === "generating-full-app"}
                onBack={() => setPhase("additional-context")}
                onRegenerate={() => void handleGenerateFullApp()}
              />
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
