export interface HomepageQuestion {
  id: number;
  title: string;
  placeholder: string;
  hint?: string;
  type: "text" | "single-select" | "multi-select-with-custom";
  options?: string[];
  maxSelect?: number;
  ordered?: boolean;
  optional?: boolean;
  groups?: { label: string; options: string[]; maxSelect?: number }[];
  sub?: {
    label: string;
    type: "single-select";
    options: string[];
    optional?: boolean;
  };
}

export const homepageQuestions: HomepageQuestion[] = [
  {
    id: 1,
    title: "만들고 싶은 서비스를 한 문장으로 설명해주세요",
    placeholder:
      "예: [수제 디저트]를 [2030 여성]에게 판매하는 온라인 베이커리",
    hint: "[무엇을] + [누구에게] 형태로 적어주시면 더 정확한 결과를 드립니다",
    type: "text",
    sub: {
      label: "가장 가까운 업종을 하나 골라주세요 (선택)",
      type: "single-select",
      options: [
        "쇼핑몰",
        "음식·카페",
        "교육·강의",
        "포트폴리오·이력서",
        "예약서비스",
        "커뮤니티·포럼",
        "기업·브랜드 소개",
        "미디어·콘텐츠",
        "SaaS·IT서비스",
        "기타",
      ],
      optional: true,
    },
  },
  {
    id: 2,
    title:
      "홈페이지에 들어온 사람이 가장 먼저 하길 원하는 행동을 중요한 순서대로 골라주세요 (최대 3개)",
    placeholder: "",
    hint: "1순위 = Primary CTA, 2~3순위 = Secondary CTA로 반영됩니다",
    type: "multi-select-with-custom",
    options: [
      "회원가입·로그인",
      "상품·서비스 둘러보기",
      "문의·상담 신청",
      "구매·결제",
      "예약·신청",
      "콘텐츠 읽기",
      "앱 다운로드",
    ],
    maxSelect: 3,
    ordered: true,
  },
  {
    id: 3,
    title: "주로 어디서 사용되나요?",
    placeholder: "",
    type: "single-select",
    options: ["PC 웹", "모바일 웹", "모바일 앱", "PC + 모바일 반응형"],
  },
  {
    id: 4,
    title: "홈페이지 구성을 골라주세요",
    placeholder: "",
    hint: "잘 모르겠으면 '원페이지'를 추천드려요 — 깔끔하고 빠르게 완성됩니다",
    type: "single-select",
    options: [
      "원페이지 (랜딩)",
      "멀티페이지 (2~5페이지)",
      "멀티페이지 (6페이지 이상)",
    ],
  },
  {
    id: 5,
    title:
      "홈 화면에 넣고 싶은 섹션을 중요한 순서대로 골라주세요 (최대 7개)",
    placeholder: "",
    hint: "선택 순서가 화면 배치 순서에 반영됩니다. 목록에 없으면 직접 입력해주세요.",
    type: "multi-select-with-custom",
    options: [
      "히어로 배너 (메인 이미지+문구)",
      "서비스·제품 소개",
      "특장점·USP",
      "가격·요금표",
      "후기·리뷰",
      "포트폴리오·갤러리",
      "팀·회사 소개",
      "자주 묻는 질문 (FAQ)",
      "문의·CTA",
      "공지·블로그",
      "파트너·고객사 로고",
      "SNS 피드",
      "통계·수치",
      "검색",
      "로그인·회원 영역",
      "카테고리 내비게이션",
    ],
    maxSelect: 7,
    ordered: true,
  },
  {
    id: 6,
    title: "원하는 색감 방향을 골라주세요 (최대 2개)",
    placeholder: "",
    hint: "",
    type: "multi-select-with-custom",
    options: [
      "따뜻한 톤 (레드·오렌지·옐로)",
      "차가운 톤 (블루·그린)",
      "모노톤 (블랙·화이트·그레이)",
      "파스텔 (부드럽고 연한)",
      "비비드 (선명하고 강렬한)",
    ],
    maxSelect: 2,
  },
  {
    id: 7,
    title: "분위기와 스타일을 골라주세요",
    placeholder: "",
    hint: "가장 중요한 분위기 1개를 먼저 고르고, 나머지를 추가해주세요",
    type: "multi-select-with-custom",
    groups: [
      {
        label: "분위기",
        options: [
          "미니멀·깔끔",
          "고급·프리미엄",
          "친근·캐주얼",
          "트렌디·감각적",
          "신뢰·전문적",
          "자연·오가닉",
          "다이나믹·강렬",
        ],
        maxSelect: 2,
      },
      {
        label: "콘텐츠 밀도",
        options: ["여백 많은", "이미지 중심", "텍스트 중심", "균형잡힌"],
        maxSelect: 1,
      },
      {
        label: "글씨체 느낌",
        options: [
          "둥글고 부드러운",
          "각지고 모던한",
          "손글씨·감성",
          "클래식·세리프",
        ],
        maxSelect: 1,
      },
      {
        label: "글씨 굵기",
        options: ["가늘고 경쾌한", "보통", "굵고 임팩트 있는"],
        maxSelect: 1,
      },
      {
        label: "말투",
        options: ["격식체 (~합니다)", "반말 친근체 (~해요)", "감성·문어체"],
        maxSelect: 1,
      },
    ],
  },
  {
    id: 8,
    title: "참고 사이트나 브랜드 소재가 있으면 알려주세요",
    placeholder: "URL, 브랜드명, 또는 이미지 링크",
    hint: "없으면 건너뛰어도 괜찮습니다",
    type: "text",
    optional: true,
  },
];

export const homepageQuestionLabels = [
  "서비스 정의",
  "핵심 행동 (CTA)",
  "플랫폼",
  "페이지 구성",
  "섹션 구성",
  "색감",
  "분위기·스타일",
  "참고·브랜드 소재",
];
