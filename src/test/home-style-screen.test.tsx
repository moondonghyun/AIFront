import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeStyleScreen from "@/components/HomeStyleScreen";
import type { RenderedHomeStyleSet } from "@/lib/home-style-types";

const generatedSet: RenderedHomeStyleSet = {
  focus_note: "업로드한 JSON에서 추출한 정보만으로 구성한 홈 화면 비교안입니다.",
  options: [
    {
      id: "left",
      name: "빠른 탐색형",
      concept_summary: "핵심 기능과 빠른 진입을 우선하는 홈 화면입니다.",
      style_reason: "사용자가 첫 화면에서 바로 이동할 수 있게 정보를 짧게 정리합니다.",
      style_context: {
        mood: "정돈된 실용형",
        experience_goal: "핵심 기능을 빠르게 이해하고 이동하게 한다.",
        visual_keywords: ["카드", "빠른 CTA", "정돈된 여백"],
        layout_principles: ["상단 요약", "기능 카드", "명확한 CTA"],
        conversion_focus: "핵심 기능 진입",
      },
      layout_mode: "mobile-feed",
      theme: {
        tone: "light",
        primary: "#111827",
        accent: "#FF7A6B",
        background: "#F8F7F4",
        surface: "#FFFFFF",
        surfaceAlt: "#F1F3F7",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        border: "#E5E7EB",
        chipBackground: "#EEF2FF",
        chipText: "#374151",
        heroGlow: "#FFD7CC",
        fontFamilyHint: '"Pretendard", "Noto Sans KR", sans-serif',
        radius: "soft",
      },
      top_bar: {
        brand: "예약 서비스",
        location_label: "서울 1km",
        nav_items: ["리스트", "지역"],
        utility_items: ["search", "bell"],
      },
      search_placeholder: "가게명, 설명, 태그로 검색",
      tabs: ["리스트", "지역"],
      category_chips: ["전체", "식당", "카페"],
      hero: {
        badge: "빠른 탐색",
        title: "가게를 쉽게 찾는 홈",
        subtitle: "첫 화면에서 가치와 CTA를 바로 보여줍니다.",
        primary_cta: "시작하기",
        secondary_cta: "추천 보기",
        highlight_label: "탐색",
        highlight_value: "검색과 CTA 동시 노출",
      },
      featured_cards: [
        {
          category: "식당",
          title: "동네 식당 예시",
          description: "운영 정보와 예약 CTA를 한 번에 보여주는 예시 카드입니다.",
          tags: ["예약 가능", "운영 중"],
          meta: ["180m", "10:30 - 21:00"],
          status: "영업중",
          accent_color: "#F97316",
        },
      ],
      support_panels: [
        { title: "검색 우선 구조", body: "검색 흐름을 전면에 둡니다.", metric: "Search" },
      ],
      bottom_nav: ["홈", "주문", "채팅", "마이"],
      implementation_notes: ["검색과 카드 레이아웃을 공통 축으로 유지합니다."],
    },
    {
      id: "center",
      name: "브랜드 집중형",
      concept_summary: "메시지와 분위기를 먼저 보여주는 홈 화면입니다.",
      style_reason: "첫 인상과 핵심 메시지 전달을 강조합니다.",
      style_context: {
        mood: "차분한 몰입형",
        experience_goal: "브랜드 인상을 먼저 전달한다.",
        visual_keywords: ["히어로", "타이포", "브랜드"],
        layout_principles: ["강한 히어로", "카드 분리", "메시지 우선"],
        conversion_focus: "대표 경험 보기",
      },
      layout_mode: "immersive-showcase",
      theme: {
        tone: "dark",
        primary: "#F4D06F",
        accent: "#EAB308",
        background: "#0E0D0B",
        surface: "#171612",
        surfaceAlt: "#201E19",
        textPrimary: "#F8F5F0",
        textSecondary: "#B8B2A7",
        border: "rgba(255,255,255,0.12)",
        chipBackground: "rgba(255,255,255,0.08)",
        chipText: "#EDE7DD",
        heroGlow: "rgba(255,215,128,0.22)",
        fontFamilyHint: '"Iowan Old Style", "Noto Serif KR", serif',
        radius: "rounded",
      },
      top_bar: {
        brand: "예약 서비스 Studio",
        nav_items: ["철학", "경험", "예약"],
        utility_items: ["compass", "user"],
      },
      search_placeholder: "브랜드 소개, 핵심 경험 검색",
      tabs: ["스토리", "경험"],
      category_chips: ["브랜드 철학", "대표 경험"],
      hero: {
        badge: "Immersive Home",
        title: "브랜드 메시지를 강조하는 홈",
        subtitle: "브랜드 메시지를 전면에 두는 구성입니다.",
        primary_cta: "대표 경험 보기",
        secondary_cta: "브랜드 소개",
        highlight_label: "브랜드 감도",
        highlight_value: "강한 히어로 중심 배치",
      },
      featured_cards: [
        {
          category: "대표 경험",
          title: "브랜드 경험 소개",
          description: "서비스 인상을 보여주는 예시 카드입니다.",
          tags: ["브랜드", "경험"],
          meta: ["스토리", "몰입"],
          status: "추천",
          accent_color: "#D4A017",
        },
      ],
      support_panels: [
        { title: "강한 히어로", body: "핵심 메시지를 전면에 배치합니다.", metric: "Hero" },
      ],
      bottom_nav: ["철학", "경험", "예약"],
      implementation_notes: ["메시지와 시각 톤을 첫 화면에 집중시킵니다."],
    },
    {
      id: "right",
      name: "구조 설명형",
      concept_summary: "가치 제안과 정보 블록을 균형 있게 보여줍니다.",
      style_reason: "설명과 CTA를 함께 보여줘 이해를 빠르게 돕습니다.",
      style_context: {
        mood: "명료한 설명형",
        experience_goal: "서비스 구조와 핵심 기능을 빠르게 이해시킨다.",
        visual_keywords: ["분할 레이아웃", "정보 블록", "설명"],
        layout_principles: ["요약 분리", "카드 반복", "CTA 병행"],
        conversion_focus: "기능 둘러보기",
      },
      layout_mode: "split-showcase",
      theme: {
        tone: "light",
        primary: "#2563EB",
        accent: "#14B8A6",
        background: "#F7FAFC",
        surface: "#FFFFFF",
        surfaceAlt: "#EEF6FF",
        textPrimary: "#0F172A",
        textSecondary: "#64748B",
        border: "#DDE7F0",
        chipBackground: "#E0F2FE",
        chipText: "#0F172A",
        heroGlow: "rgba(37,99,235,0.18)",
        fontFamilyHint: '"Pretendard", "Noto Sans KR", sans-serif',
        radius: "rounded",
      },
      top_bar: {
        brand: "예약 서비스",
        nav_items: ["기능", "사용 예시", "문의"],
        utility_items: ["search", "user"],
      },
      search_placeholder: "기능, 사용 방법, 도입 정보 검색",
      tabs: ["소개", "기능"],
      category_chips: ["핵심 가치", "주요 기능"],
      hero: {
        badge: "Structured Home",
        title: "가치와 구조를 함께 보여주는 홈",
        subtitle: "요약 메시지와 정보 설명을 나란히 둡니다.",
        primary_cta: "기능 둘러보기",
        secondary_cta: "도입 문의",
        highlight_label: "구조 요약",
        highlight_value: "요약 + 정보 설명",
      },
      featured_cards: [
        {
          category: "핵심 가치",
          title: "기능 카드 예시",
          description: "정보 블록과 카드가 함께 보이는 예시입니다.",
          tags: ["카드", "설명"],
          meta: ["설명", "CTA"],
          status: "핵심",
          accent_color: "#2563EB",
        },
      ],
      support_panels: [
        { title: "설명 분리", body: "메시지와 설명을 함께 보여줍니다.", metric: "Split" },
      ],
      bottom_nav: ["소개", "기능", "문의"],
      implementation_notes: ["요약 메시지와 설명 패널을 분리 구조로 유지합니다."],
    },
  ],
};

describe("home style screen", () => {
  it("renders three home screen options and allows selection", () => {
    const onSelect = vi.fn();

    render(
      <HomeStyleScreen
        projectName="예약 서비스"
        generatedSet={generatedSet}
        isGenerating={false}
        onGenerate={vi.fn()}
        onSelect={onSelect}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("빠른 탐색형")).toBeInTheDocument();
    expect(screen.getByText("브랜드 집중형")).toBeInTheDocument();
    expect(screen.getByText("구조 설명형")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /이 안으로 진행/i })[1]);

    expect(onSelect).toHaveBeenCalledWith(generatedSet.options[1]);
  });

  it("shows a JSON-only generation CTA when no result exists", () => {
    const onGenerate = vi.fn();

    render(
      <HomeStyleScreen
        projectName="예약 서비스"
        generatedSet={null}
        isGenerating={false}
        onGenerate={onGenerate}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /홈 화면 3안 생성/i }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});
