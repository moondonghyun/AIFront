import { motion } from "framer-motion";
import CatCharacter, { type CatMood, type CatPersonality } from "@/components/CatCharacter";

interface CharacterBubbleProps {
  message: string;
  sub?: string;
  mood?: CatMood;
  personality?: CatPersonality;
  size?: "sm" | "md";
}

const CharacterBubble = ({ message, sub, mood = "asking", personality = "alert", size = "md" }: CharacterBubbleProps) => {
  const catSize = size === "sm" ? 40 : 52;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="flex items-start gap-3"
    >
      <div className="shrink-0 mt-1">
        <CatCharacter mood={mood} size={catSize} personality={personality} />
      </div>

      <div className="relative max-w-[calc(100%-70px)]">
        <div className="absolute left-0 top-3 -translate-x-[6px] w-3 h-3 rotate-45 bg-violet-50 dark:bg-violet-900/30 rounded-sm" />
        <div className="rounded-2xl rounded-tl-md bg-violet-50 dark:bg-violet-900/30 px-4 py-3 shadow-sm">
          <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
            {message}
          </p>
          {sub && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {sub}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const CHARACTER_ENCOURAGEMENTS = [
  "좋아요! 잘하고 있어요 \uD83D\uDE0A",
  "오, 재밌는 서비스네요!",
  "거의 다 왔어요! 조금만 더",
  "멋진 답변이에요!",
  "이 정보가 큰 도움이 될 거예요",
  "알겠어요, 잘 기억할게요!",
  "점점 그림이 그려지고 있어요",
];

export default CharacterBubble;
