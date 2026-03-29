import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, FileJson, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface DesignScreenProps {
  briefingJson: Record<string, unknown>;
  onBack: () => void;
  onStartDesign: () => void;
  onStartHomeStyle: () => void;
}

function readBriefingText(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value
  ) {
    return readBriefingText((value as Record<string, unknown>).value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

const DesignScreen = ({
  briefingJson,
  onBack,
  onStartDesign,
  onStartHomeStyle,
}: DesignScreenProps) => {
  const [downloaded, setDownloaded] = useState(false);

  const service =
    briefingJson.service &&
    typeof briefingJson.service === "object" &&
    !Array.isArray(briefingJson.service)
      ? (briefingJson.service as Record<string, unknown>)
      : null;
  const features =
    briefingJson.features &&
    typeof briefingJson.features === "object" &&
    !Array.isArray(briefingJson.features)
      ? (briefingJson.features as Record<string, unknown>)
      : null;

  const serviceName =
    readBriefingText(service?.name) ||
    readBriefingText(service?.summary) ||
    "업로드된 서비스";
  const serviceSummary =
    readBriefingText(service?.summary) ||
    readBriefingText(service?.solution_statement) ||
    "업로드된 JSON을 기준으로 화면 구조와 홈 화면 안을 생성합니다.";
  const userCount = Array.isArray(briefingJson.users) ? briefingJson.users.length : 0;
  const featureCount = Array.isArray(features?.mvp) ? features.mvp.length : 0;
  const screenCount = Array.isArray(briefingJson.screens) ? briefingJson.screens.length : 0;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(briefingJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `uploaded-briefing-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("업로드한 JSON을 다운로드했습니다.");
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="py-12"
    >
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Uploaded JSON
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {serviceName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {serviceSummary}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          JSON 다시 입력
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Users
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">{userCount}</div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            MVP Features
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">{featureCount}</div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Screens
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">{screenCount}</div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-border p-6">
        <div className="mb-3 flex items-center gap-2">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">현재 테스트 모드</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          홈 화면 3안 생성은 업로드한 JSON에서 정제한 정보만 사용합니다. 구현 계획이나 별도 스타일 입력 없이,
          JSON에 실제로 들어 있는 서비스 정보와 화면 정보만으로 구조와 시각 방향을 만듭니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2 rounded-full">
          <Download className="h-4 w-4" />
          {downloaded ? "다운로드 완료" : "업로드 JSON 다운로드"}
        </Button>

        <Button onClick={onStartDesign} variant="outline" className="flex-1 gap-2 rounded-full">
          <Rocket className="h-4 w-4" />
          화면 설계 생성
        </Button>

        <Button onClick={onStartHomeStyle} className="flex-1 gap-2 rounded-full">
          <Sparkles className="h-4 w-4" />
          홈 화면 3안 바로 생성
        </Button>
      </div>
    </motion.div>
  );
};

export default DesignScreen;
