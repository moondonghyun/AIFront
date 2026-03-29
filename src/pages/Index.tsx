import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Components ───
import type { CatPersonality } from "@/components/CatCharacter";
import IntroScreen, { type TrackChoice } from "@/components/IntroScreen";
import HomepageInterviewScreen from "@/components/HomepageInterviewScreen";
import HomepageResultScreen from "@/components/HomepageResultScreen";
import QuestionScreen from "@/components/QuestionScreen";
import ReviewScreen from "@/components/ReviewScreen";
import SecondaryInterviewScreen from "@/components/SecondaryInterviewScreen";
import BriefingCompleteScreen from "@/components/BriefingCompleteScreen";
import HomeStyleScreen from "@/components/HomeStyleScreen";
import HomeStyleHandoffScreen from "@/components/HomeStyleHandoffScreen";
import HomeStyleMdScreen from "@/components/HomeStyleMdScreen";
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

// ─── AI ───
import {
  applyInterviewAnswersBatchDirect,
  generateHomepageMd,
  generateUIBriefingFromAnswers,
  generateInterviewQuestionBatchDirect,
} from "@/lib/claude-direct";
import {
  generateRenderedHomeStyleOptionsDirect,
  generateHomeScreenMarkdownDirect,
  generateFullAppDirect,
  refineHomeScreenOptionDirect,
} from "@/lib/gemini-direct";
import type { FullWebProject } from "@/lib/gemini-direct";

// ─── Phase State Machine ───
//
// 0차 인터뷰 (홈페이지):
//   intro → homepage-interview → generating-homepage-md → homepage-result
//
// 홈 UI 3안:
//   → generating-home-style → home-style → home-style-selected
//   → generating-home-style-md → home-style-md
//
// 1차 고정 인터뷰 (13문):
//   → interview → review
//
// 구조화 JSON 생성 + 2차 인터뷰:
//   → generating-briefing → generating-question → secondary-interview
//   → applying-answer → (loop) → ui-ready
//
// 최종 결과물:
//   → generating-full-app → full-app

type Phase =
  | "intro"
  | "homepage-interview"
  | "generating-homepage-md"
  | "homepage-result"
  // Home style 3안
  | "generating-home-style"
  | "home-style"
  | "home-style-selected"
  | "generating-home-style-md"
  | "home-style-md"
  // 1차 고정 인터뷰 (13문)
  | "interview"
  | "review"
  // 구조화 JSON 생성 + 2차 인터뷰
  | "generating-briefing"
  | "generating-question"
  | "secondary-interview"
  | "applying-answer"
  | "ui-ready"
  // Full app generation
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

  // ─── 0차 인터뷰 (홈페이지) state ───
  const [hpStep, setHpStep] = useState(0);
  const [hpAnswers, setHpAnswers] = useState<string[]>(
    Array(homepageQuestions.length).fill(""),
  );
  const [hpDirection, setHpDirection] = useState<1 | -1>(1);
  const [homepageMd, setHomepageMd] = useState<string | null>(null);

  // ─── 1차 고정 인터뷰 (13문) state ───
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(""));
  const [direction, setDirection] = useState<1 | -1>(1);

  // ─── 구조화 JSON & 2차 인터뷰 state ───
  const [briefingJson, setBriefingJson] = useState<Record<string, unknown> | null>(null);
  const [initialTargetPaths, setInitialTargetPaths] = useState<string[]>([]);
  const [currentInterviewQuestions, setCurrentInterviewQuestions] = useState<
    GeneratedInterviewQuestion[]
  >([]);
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryEntry[]>([]);
  const interviewRound = useRef(0);
  const totalQuestionsAsked = useRef(0);

  // ─── Home style state ───
  const [designDocument] = useState<DesignDocument | null>(null);
  const [generatedHomeStyleSet, setGeneratedHomeStyleSet] =
    useState<RenderedHomeStyleSet | null>(null);
  const [selectedHomeStyle, setSelectedHomeStyle] =
    useState<RenderedHomeStyleOption | null>(null);
  const [homeStyleMd, setHomeStyleMd] = useState<string | null>(null);

  // ─── Full app state ───
  const [generatedFullApp, setGeneratedFullApp] = useState<FullWebProject | null>(null);

  const projectName = useMemo(
    () => deriveProjectName(briefingJson, designDocument),
    [briefingJson, designDocument],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 0차 인터뷰 (홈페이지) handlers
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
  // homepage-result → home style 3안
  // ═══════════════════════════════════════════════════════════════════

  const handleContinueToHomeStyle = useCallback(async () => {
    if (!homepageMd) return;

    const mdBriefing: Record<string, unknown> = {
      _format: "markdown",
      content: homepageMd,
    };
    setBriefingJson(mdBriefing);

    setPhase("generating-home-style");
    try {
      const generatedSet = await generateRenderedHomeStyleOptionsDirect({
        briefingJson: mdBriefing,
      });
      setGeneratedHomeStyleSet(generatedSet);
      setPhase("home-style");
      toast.success("홈 화면 3안을 생성했습니다.");
    } catch (error) {
      console.error("Failed to generate home styles:", error);
      toast.error("홈 화면 3안 생성에 실패했습니다.");
      setPhase("homepage-result");
    }
  }, [homepageMd]);

  // ═══════════════════════════════════════════════════════════════════
  // Home style generation & selection
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
      setPhase("homepage-result");
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
  // 1차 고정 인터뷰 (13문) handlers
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
  // review 완료 → 구조화 JSON 생성 → 2차 인터뷰 시작
  //
  // 입력:
  //   - 0차 인터뷰 로그 (hpAnswers from homepageQuestions)
  //   - 1차 인터뷰 로그 (answers from questions)
  //   - 선택된 홈 화면 스타일 MD (homeStyleMd)
  //
  // 출력:
  //   - 구조화 JSON with {value, status} 필드
  //     fulled  = 사용자 입력으로 이미 채워진 것
  //     expected = AI가 추론, 추가 질문으로 확인 권장
  //     null    = 아직 비어있어 반드시 채워야 할 것
  // ═══════════════════════════════════════════════════════════════════

  const handleReviewComplete = useCallback(async () => {
    setPhase("generating-briefing");
    setCurrentInterviewQuestions([]);
    setInterviewHistory([]);
    interviewRound.current = 0;
    totalQuestionsAsked.current = 0;

    // 0차 인터뷰 QA (홈페이지 인터뷰)
    const phase0QA = homepageQuestions.map((q, i) => ({
      question: `[0차 홈페이지 인터뷰] ${q.title}`,
      answer: hpAnswers[i] || "",
    }));

    // 1차 인터뷰 QA (고정 13문)
    const phase1QA = questions.map((q, i) => ({
      question: `[1차 고정 인터뷰] ${q.title}`,
      answer: answers[i] || "",
    }));

    // 전체 QA를 합쳐서 briefing 생성에 전달
    const allQA = [...phase0QA, ...phase1QA];

    // 홈페이지 MD + 선택된 홈 화면 스타일 MD를 합쳐서 컨텍스트로 전달
    const combinedMd = [
      "━━ 0차 인터뷰로 생성된 홈페이지 설계 문서 ━━",
      homepageMd || "",
      "",
      "━━ 사용자가 선택한 홈 화면 스타일 명세 ━━",
      homeStyleMd || "",
    ].join("\n");

    try {
      // 구조화 JSON 생성: fulled(사용자 입력) / expected(AI 추론 권장) / null(미입력)
      const json = await generateUIBriefingFromAnswers(allQA, combinedMd);

      console.log("[handleReviewComplete] 생성된 briefingJson 키:", Object.keys(json));
      console.log("[handleReviewComplete] briefingJson 샘플 (2000자):", JSON.stringify(json, null, 2).slice(0, 2000));

      const targets = collectInterviewTargets(json);
      const targetPaths = targets.map((t) => t.path);

      console.log("[handleReviewComplete] 발견된 target 수:", targets.length);
      console.log("[handleReviewComplete] target 경로 샘플:", targetPaths.slice(0, 10));
      console.log("[handleReviewComplete] target status 분포:",
        targets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>),
      );

      setBriefingJson(json);
      setInitialTargetPaths(targetPaths);

      // 바로 2차 인터뷰 시작 (expected + null 필드를 대상으로 질문 생성)
      await requestNextInterviewBatch(json, targetPaths, []);
    } catch (error) {
      console.error("Failed to generate briefing JSON:", error);
      toast.error("UI 브리핑 생성에 실패했습니다.");
      setPhase("review");
    }
  }, [hpAnswers, answers, homepageMd, homeStyleMd]);

  // ═══════════════════════════════════════════════════════════════════
  // 2차 인터뷰 loop (expected + null 필드를 채움)
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
  // ui-ready → full app generation
  // ═══════════════════════════════════════════════════════════════════

  const handleGenerateFullApp = useCallback(async () => {
    if (!briefingJson) return;
    const md = homeStyleMd ?? "";
    setPhase("generating-full-app");
    try {
      const result = await generateFullAppDirect({
        briefingJson,
        homeStyleMd: md,
        designDocument,
        additionalContext: null,
      });
      setGeneratedFullApp(result);
      setPhase("full-app");
      toast.success("전체 앱 구현이 완료되었습니다.");
    } catch (error) {
      console.error("Failed to generate full app:", error);
      toast.error("전체 앱 구현에 실패했습니다.");
      setPhase("ui-ready");
    }
  }, [briefingJson, homeStyleMd, designDocument]);

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
    phase === "generating-full-app" ||
    phase === "full-app";

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={`w-full ${isWideCanvas ? "max-w-[1520px]" : "max-w-[640px]"}`}>
        <AnimatePresence mode="wait">
          {/* ── Intro ── */}
          {phase === "intro" && (
            <IntroScreen
              key="intro"
              onStart={(track: TrackChoice, p: CatPersonality) => {
                setPersonality(p);
                setPhase("homepage-interview");
              }}
              onLoadJson={(json) => {
                setBriefingJson(json);
                const targets = collectInterviewTargets(json);
                setInitialTargetPaths(targets.map((t) => t.path));
                setPersonality("smart");
                setPhase("generating-home-style");
                generateRenderedHomeStyleOptionsDirect({ briefingJson: json })
                  .then((set) => {
                    setGeneratedHomeStyleSet(set);
                    setPhase("home-style");
                    toast.success("홈 화면 3안을 생성했습니다.");
                  })
                  .catch(() => {
                    toast.error("홈 화면 3안 생성에 실패했습니다.");
                    setPhase("intro");
                  });
              }}
            />
          )}

          {/* ── 0차 인터뷰 (홈페이지) ── */}
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
              onContinue={handleContinueToHomeStyle}
            />
          )}

          {/* ── 홈 UI 3안 ── */}
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
                onBack={() => setPhase("homepage-result")}
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
                onNext={() => setPhase("interview")}
              />
            )}

          {/* ── 1차 고정 인터뷰 (13문) ── */}
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

          {/* ── 구조화 JSON 생성 + 2차 인터뷰 ── */}
          {(phase === "generating-briefing" ||
            phase === "generating-question" ||
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
                phase === "generating-briefing" ||
                phase === "generating-question" ||
                phase === "applying-answer"
              }
              loadingTitle={
                phase === "generating-briefing"
                  ? "인터뷰 결과를 분석해서 UI 브리핑을 만들고 있어요"
                  : phase === "applying-answer"
                    ? "답변을 UI 브리핑에 반영하고 있어요"
                    : "다음 질문 묶음을 준비하고 있어요"
              }
              loadingDescription={
                phase === "generating-briefing"
                  ? "0차·1차 인터뷰 답변과 선택한 홈 화면 스타일을 종합해서 구조화된 UI 브리핑 JSON을 만들고 있습니다."
                  : phase === "applying-answer"
                    ? "답변을 분석해서 UI 브리핑의 빈 항목을 채우고 있습니다."
                    : "남은 UI 항목을 묶어서 최대 10개의 질문으로 정리하고 있습니다."
              }
              onComplete={handleInterviewComplete}
              onBack={() => setPhase("review")}
              round={interviewRound.current}
            />
          )}

          {/* ── ui-ready → full app 생성 ── */}
          {phase === "ui-ready" && briefingJson && (
            <BriefingCompleteScreen
              key="ui-ready"
              briefingJson={briefingJson}
              progress={interviewProgress}
              selectedHomeStyle={selectedHomeStyle}
              onBack={() => setPhase("review")}
              onNext={handleGenerateFullApp}
            />
          )}

          {(phase === "generating-full-app" || phase === "full-app") && (
            <FullAppScreen
              key="full-app"
              projectName={projectName}
              fullApp={generatedFullApp ?? { previewHtml: "", files: [] }}
              isGenerating={phase === "generating-full-app"}
              onBack={() => setPhase("ui-ready")}
              onRegenerate={() => void handleGenerateFullApp()}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
