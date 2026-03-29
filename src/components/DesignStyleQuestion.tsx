import { useState } from "react";
import { Check, PenLine } from "lucide-react";

interface DesignStyleQuestionProps {
  answer: string;
  onAnswer: (val: string) => void;
}

interface StyleOption {
  id: string;
  name: string;
  description: string;
  preview: React.ReactNode;
}

const Preview = {
  Minimal: () => (
    <div className="h-full w-full bg-white flex flex-col justify-center items-center gap-2 p-3">
      <div className="h-1.5 w-16 rounded-full bg-gray-900" />
      <div className="h-px w-20 bg-gray-200" />
      <div className="h-px w-14 bg-gray-200" />
      <div className="mt-2 h-5 w-14 border border-gray-900 rounded-sm flex items-center justify-center">
        <span className="text-[6px] text-gray-900 tracking-widest">BUTTON</span>
      </div>
    </div>
  ),

  ModernSaaS: () => (
    <div className="h-full w-full bg-gray-50 flex flex-col justify-center items-center gap-2 p-3">
      <div className="w-full rounded-xl bg-white shadow-sm p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-md bg-violet-100 shrink-0" />
          <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
        </div>
        <div className="h-px w-full bg-gray-100" />
        <div className="h-4 w-10 rounded-full bg-violet-500 self-end flex items-center justify-center">
          <span className="text-[5px] text-white">시작</span>
        </div>
      </div>
    </div>
  ),

  NeoBrutalism: () => (
    <div className="h-full w-full bg-yellow-300 flex flex-col justify-center items-center p-3">
      <div
        className="w-full bg-white flex flex-col gap-1.5 p-2"
        style={{ border: "2.5px solid #000", boxShadow: "3px 3px 0 #000" }}
      >
        <div className="h-2 w-14 bg-black rounded-none" />
        <div className="h-1 w-10 bg-black/30" />
        <div
          className="mt-1 h-5 w-12 bg-black flex items-center justify-center"
          style={{ border: "1.5px solid #000" }}
        >
          <span className="text-[6px] text-white font-black tracking-tight">GO →</span>
        </div>
      </div>
    </div>
  ),

  Glassmorphism: () => (
    <div
      className="h-full w-full flex flex-col justify-center items-center p-3"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div
        className="w-full rounded-xl p-2.5 flex flex-col gap-1.5"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="h-1.5 w-14 rounded-full bg-white/80" />
        <div className="h-1 w-10 rounded-full bg-white/40" />
        <div className="mt-1 h-4 w-12 rounded-full bg-white/30 border border-white/50 flex items-center justify-center">
          <span className="text-[5px] text-white">확인</span>
        </div>
      </div>
    </div>
  ),

  Claymorphism: () => (
    <div className="h-full w-full bg-sky-100 flex flex-col justify-center items-center gap-2 p-3">
      <div
        className="w-full rounded-2xl bg-white p-2 flex flex-col gap-1.5"
        style={{ boxShadow: "0 6px 0 #93c5fd, 0 8px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="flex gap-1.5">
          <div
            className="h-6 w-6 rounded-xl bg-orange-300 shrink-0"
            style={{ boxShadow: "0 3px 0 #fb923c" }}
          />
          <div className="flex flex-col gap-1 justify-center flex-1">
            <div className="h-1.5 w-full rounded-full bg-gray-200" />
            <div className="h-1 w-2/3 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  ),

  FlatDesign: () => (
    <div className="h-full w-full bg-teal-400 flex flex-col justify-center items-center p-3 gap-2">
      <div className="w-full bg-white p-2 flex flex-col gap-1.5">
        <div className="flex gap-1">
          <div className="h-8 w-8 bg-orange-400 shrink-0" />
          <div className="flex flex-col gap-1 justify-center flex-1">
            <div className="h-1.5 w-full bg-gray-800" />
            <div className="h-1 w-2/3 bg-gray-400" />
          </div>
        </div>
        <div className="h-4 w-full bg-teal-400 flex items-center justify-center">
          <span className="text-[5px] text-white font-bold">확인하기</span>
        </div>
      </div>
    </div>
  ),

  Material: () => (
    <div className="h-full w-full bg-gray-100 flex flex-col justify-center items-center p-3">
      <div className="w-full bg-white rounded-sm p-2 flex flex-col gap-1.5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)" }}>
        <div className="h-2 w-full bg-blue-600 -mx-2 -mt-2 w-[calc(100%+16px)] rounded-t-sm mb-1" />
        <div className="h-1.5 w-14 bg-gray-800" />
        <div className="h-1 w-10 bg-gray-400" />
        <div className="flex justify-end mt-0.5">
          <div className="h-4 w-10 bg-blue-600 rounded-sm flex items-center justify-center">
            <span className="text-[5px] text-white uppercase tracking-wide">확인</span>
          </div>
        </div>
      </div>
    </div>
  ),

  Luxury: () => (
    <div className="h-full w-full bg-neutral-950 flex flex-col justify-center items-center p-4 gap-2">
      <div className="h-px w-12 bg-amber-400/60" />
      <div className="h-2 w-16 rounded-none bg-amber-100/90" />
      <div className="h-px w-8 bg-amber-400/40" />
      <div className="mt-2 h-4 w-14 border border-amber-400/60 flex items-center justify-center">
        <span className="text-[5px] text-amber-300/90 tracking-[0.2em] uppercase">explore</span>
      </div>
    </div>
  ),

  Casual: () => (
    <div className="h-full w-full bg-pink-50 flex flex-col justify-center items-center p-3 gap-2">
      <div className="flex gap-1.5">
        <div className="h-8 w-8 rounded-2xl bg-pink-300 flex items-center justify-center text-[10px]">
          🌸
        </div>
        <div className="flex flex-col gap-1 justify-center">
          <div className="h-1.5 w-16 rounded-full bg-pink-200" />
          <div className="h-1 w-10 rounded-full bg-pink-100" />
        </div>
      </div>
      <div className="h-5 w-20 rounded-full bg-pink-400 flex items-center justify-center">
        <span className="text-[5px] text-white">함께 시작해요 ✨</span>
      </div>
    </div>
  ),

  Editorial: () => (
    <div className="h-full w-full bg-white flex flex-col justify-start p-2.5 gap-1.5">
      <div className="h-10 w-full bg-gray-100 rounded-sm" />
      <div className="h-2.5 w-20 bg-gray-900 mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <div className="h-1 w-full bg-gray-300" />
        <div className="h-1 w-4/5 bg-gray-300" />
        <div className="h-1 w-3/5 bg-gray-300" />
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[5px] text-gray-400">읽기</span>
      </div>
    </div>
  ),
};

const STYLES: StyleOption[] = [
  {
    id: "minimal",
    name: "미니멀",
    description: "여백이 많고 요소를 줄인 깔끔한 스타일. 신뢰감 있는 느낌.",
    preview: <Preview.Minimal />,
  },
  {
    id: "modern-saas",
    name: "모던 SaaS",
    description: "요즘 웹서비스에서 가장 흔한 무난한 스타일. 둥근 카드, 안정적인 분위기.",
    preview: <Preview.ModernSaaS />,
  },
  {
    id: "neo-brutalism",
    name: "네오 브루탈리즘",
    description: "굵은 테두리, 강한 대비, 튀는 색. 개성이 강하고 시선을 끄는 스타일.",
    preview: <Preview.NeoBrutalism />,
  },
  {
    id: "glassmorphism",
    name: "글래스모피즘",
    description: "반투명 유리판 같은 레이어. 미래적이고 세련된 느낌.",
    preview: <Preview.Glassmorphism />,
  },
  {
    id: "claymorphism",
    name: "클레이모피즘",
    description: "말랑말랑하고 부드러운 입체감. 귀엽고 친근한 서비스에 잘 어울림.",
    preview: <Preview.Claymorphism />,
  },
  {
    id: "flat",
    name: "플랫 디자인",
    description: "그림자와 입체감을 줄인 평면적 구성. 단순하고 직관적인 스타일.",
    preview: <Preview.FlatDesign />,
  },
  {
    id: "material",
    name: "머티리얼 디자인",
    description: "구글 계열에서 많이 보이는 체계적인 스타일. 카드, 그림자, 버튼 규칙이 명확.",
    preview: <Preview.Material />,
  },
  {
    id: "luxury",
    name: "럭셔리 / 프리미엄",
    description: "절제된 색감, 고급스러운 타이포, 큰 여백. 브랜드 가치를 강조하고 싶을 때.",
    preview: <Preview.Luxury />,
  },
  {
    id: "casual",
    name: "친근한 캐주얼",
    description: "부드러운 색감, 둥근 요소. 생활형 앱, 커뮤니티 서비스에 잘 어울림.",
    preview: <Preview.Casual />,
  },
  {
    id: "editorial",
    name: "에디토리얼",
    description: "잡지처럼 글과 이미지 조합을 강조. 콘텐츠 플랫폼, 브랜드 소개에 적합.",
    preview: <Preview.Editorial />,
  },
];

const CUSTOM_ID = "custom";

const DesignStyleQuestion = ({ answer, onAnswer }: DesignStyleQuestionProps) => {
  const matchedStyle = STYLES.find((s) => s.name === answer);
  const isCustom = !!answer && !matchedStyle;
  const [selectedId, setSelectedId] = useState<string>(
    isCustom ? CUSTOM_ID : (matchedStyle?.id ?? ""),
  );
  const [customText, setCustomText] = useState<string>(isCustom ? answer : "");

  const select = (id: string) => {
    setSelectedId(id);
    if (id === CUSTOM_ID) {
      onAnswer(customText);
    } else {
      const style = STYLES.find((s) => s.id === id);
      onAnswer(style ? style.name : "");
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomText(value);
    onAnswer(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {STYLES.map((style) => {
          const isSelected = selectedId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => select(style.id)}
              className={`group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-foreground shadow-sm"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              {/* Mini preview */}
              <div className="h-24 w-full overflow-hidden">{style.preview}</div>

              {/* Label */}
              <div className="p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground">{style.name}</span>
                  {isSelected && (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground">
                      <Check className="h-2.5 w-2.5 text-background" />
                    </div>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                  {style.description}
                </p>
              </div>
            </button>
          );
        })}

        {/* 기타 카드 */}
        <button
          type="button"
          onClick={() => select(CUSTOM_ID)}
          className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
            selectedId === CUSTOM_ID
              ? "border-foreground bg-muted/40"
              : "border-border hover:border-foreground/30"
          }`}
        >
          <PenLine className="mb-2 h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">기타</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">직접 입력</span>
        </button>
      </div>

      {/* 기타 선택 시 텍스트 입력 */}
      {selectedId === CUSTOM_ID && (
        <textarea
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="원하는 디자인 스타일을 자유롭게 설명해주세요."
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 border-0 border-b-2 border-border focus:border-foreground outline-none py-3 transition-colors leading-relaxed"
        />
      )}
    </div>
  );
};

export default DesignStyleQuestion;
