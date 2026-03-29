import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Palette } from "lucide-react";

import HomeScreenPreview from "@/components/HomeScreenPreview";
import { Button } from "@/components/ui/button";
import type { RenderedHomeStyleOption } from "@/lib/home-style-types";

interface HomeStyleHandoffScreenProps {
  projectName: string;
  focusNote: string;
  selectedStyle: RenderedHomeStyleOption;
  onBack: () => void;
  onNext: () => void;
}

const HomeStyleHandoffScreen = ({
  projectName,
  focusNote,
  selectedStyle,
  onBack,
  onNext,
}: HomeStyleHandoffScreenProps) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="py-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Selected Home Style
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {projectName} 홈 화면 방향이 선택되었습니다
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            다음 컨텍스트에서는 이 홈 화면 스타일을 기준으로 실제 웹/앱 구현을 이어가면 됩니다.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          3안 비교로 돌아가기
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {focusNote}
      </div>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">선택된 홈 화면</span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <HomeScreenPreview option={selectedStyle} />

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">컨셉</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{selectedStyle.name}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {selectedStyle.concept_summary}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {selectedStyle.style_reason}
              </p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                디자인 방향
              </div>
              <p className="text-sm leading-relaxed text-foreground">{selectedStyle.concept_summary}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={onNext} className="w-full gap-2 rounded-full">
          MD 명세서 확인 후 다음으로
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default HomeStyleHandoffScreen;
