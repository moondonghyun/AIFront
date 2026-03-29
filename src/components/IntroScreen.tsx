import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Rocket, Crown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatCharacter, { type CatPersonality } from "@/components/CatCharacter";
import { toast } from "sonner";

export type TrackChoice = "quick" | "standard" | "full";

interface IntroScreenProps {
  onStart: (track: TrackChoice, personality: CatPersonality) => void;
  onLoadJson?: (json: Record<string, unknown>) => void;
}

const CATS: Array<{
  id: TrackChoice;
  palette: "violet" | "amber" | "emerald";
  personality: CatPersonality;
  icon: React.ReactNode;
  name: string;
  title: string;
  description: string;
  tag: string;
  bgColor: string;
  borderColor: string;
  hoverBorder: string;
  selectedBorder: string;
  tagColor: string;
}> = [
  {
    id: "quick",
    palette: "violet",
    personality: "chill",
    icon: <Zap className="w-4 h-4" />,
    name: "헤헤냥이",
    title: "쉽고 빠르게 만들어볼래요",
    description: "어려운 건 싫어! 일단 핵심만 후딱 만들어보고 싶은 분",
    tag: "MVP · 프로토타입",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
    borderColor: "border-violet-200 dark:border-violet-700",
    hoverBorder: "hover:border-violet-400",
    selectedBorder: "border-violet-500",
    tagColor: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    id: "standard",
    palette: "amber",
    personality: "alert",
    icon: <Rocket className="w-4 h-4" />,
    name: "또렷냥이",
    title: "빠르지만, 출시도 생각해요",
    description: "속도도 중요하지만 실제로 사람들이 쓸 서비스를 염두에 두는 분",
    tag: "빠른 출시 · 상용화",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-700",
    hoverBorder: "hover:border-amber-400",
    selectedBorder: "border-amber-500",
    tagColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    id: "full",
    palette: "emerald",
    personality: "smart",
    icon: <Crown className="w-4 h-4" />,
    name: "똑똑냥이",
    title: "제대로 설계하고 싶어요",
    description: "처음부터 꼼꼼하게, 완성도 높은 서비스를 목표로 하는 분",
    tag: "정밀 설계 · 풀 스펙",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-700",
    hoverBorder: "hover:border-emerald-400",
    selectedBorder: "border-emerald-500",
    tagColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
];

const IntroScreen = ({ onStart, onLoadJson }: IntroScreenProps) => {
  const [selected, setSelected] = useState<TrackChoice | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onLoadJson) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      onLoadJson(json);
    } catch {
      toast.error("유효한 JSON 파일이 아닙니다.");
    }
  };

  const handleStart = () => {
    if (!selected) return;

    if (selected === "quick" || selected === "standard") {
      toast.info("이 트랙은 곧 준비될 예정이에요! 조금만 기다려 주세요.");
      return;
    }

    const cat = CATS.find((c) => c.id === selected);
    onStart(selected, cat?.personality ?? "alert");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col items-center text-center py-10"
    >
      {/* Header */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3"
      >
        어떤 걸 도와드릴까요?
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight mb-2"
      >
        안녕하세요! 어떻게 만들고 싶으세요?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground mb-8"
      >
        목표에 맞는 냥이를 골라주세요
      </motion.p>

      {/* 3 Cat cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {CATS.map((cat, index) => {
          const isSelected = selected === cat.id;

          return (
            <motion.button
              key={cat.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => setSelected(cat.id)}
              className={`group relative flex flex-col items-center text-center rounded-2xl border-2 p-5 transition-all ${cat.bgColor} ${
                isSelected
                  ? `${cat.selectedBorder} shadow-md scale-[1.02]`
                  : `${cat.borderColor} ${cat.hoverBorder} hover:shadow-sm`
              }`}
            >
              {/* Cat character */}
              <div className="mb-3">
                <CatCharacter
                  mood={isSelected ? "happy" : "idle"}
                  size={72}
                  personality={cat.personality}
                />
              </div>

              {/* Name badge */}
              <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium mb-2 ${cat.tagColor}`}>
                {cat.icon}
                {cat.name}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug">
                {cat.title}
              </h3>

              {/* Description */}
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                {cat.description}
              </p>

              {/* Tag */}
              <span className="text-[10px] text-muted-foreground/60">
                {cat.tag}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs"
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Start button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selected ? 1 : 0.4 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-2"
      >
        <Button
          onClick={handleStart}
          size="lg"
          disabled={!selected}
          className="group gap-2 px-8 h-12 text-sm font-medium rounded-full bg-violet-600 hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          {selected === "quick"
            ? "빠르게 시작!"
            : selected === "standard"
              ? "시작할게요!"
              : selected === "full"
                ? "제대로 시작하기"
                : "냥이를 골라주세요"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Button>

        {selected === "full" && (
          <button
            type="button"
            onClick={() => {
              const cat = CATS.find((c) => c.id === "full");
              onStart("full-skip-homepage" as TrackChoice, cat?.personality ?? "smart");
            }}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            홈페이지 인터뷰 건너뛰고 바로 전체 설계로 →
          </button>
        )}

        <button
          type="button"
          onClick={() => jsonInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground underline underline-offset-2 transition-colors mt-1"
        >
          <Upload className="w-3 h-3" />
          기존 브리핑 JSON 올려서 2차 인터뷰 바로 시작
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          onChange={handleJsonUpload}
          className="hidden"
        />
      </motion.div>
    </motion.div>
  );
};

export default IntroScreen;
