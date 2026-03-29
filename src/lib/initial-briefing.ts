import { isMeaningfulValue, isStatusField, type BriefingStatusField } from "@/lib/briefing-state";

export interface FirstInterviewResponse {
  id: number;
  label: string;
  question: string;
  answer: string;
}

export interface ImplementationReadinessReport {
  requiredBranches: string[];
  criticalPaths: string[];
  missingBranches: string[];
  missingCriticalPaths: string[];
  unresolvedCriticalPaths: string[];
  readyIfFilled: boolean;
  implementationReadyNow: boolean;
}

export type InitialBriefing = Record<string, unknown>;

type InitialStatus = "null" | "expected" | "fulled";

const INITIAL_BRIEFING_REQUIRED_BRANCHES = [
  "meta",
  "service",
  "users",
  "core_entities",
  "second_interview_topics",
  "features",
  "screens",
  "user_flows",
  "permissions",
  "admin",
  "monetization",
  "integrations",
  "notifications",
  "content_policy",
  "tech_preferences",
  "data_privacy",
  "performance",
  "analytics",
  "domain_rules",
  "operational_policies",
  "exception_handling",
  "constraints",
] as const;

const INITIAL_BRIEFING_CRITICAL_PATHS = [
  "service.summary",
  "service.problem_statement",
  "service.solution_statement",
  "service.target_platform",
  "service.mvp_scope_summary",
  "users[0].role",
  "core_entities[0].name",
  "core_entities[0].key_fields",
  "features.mvp[0].name",
  "features.mvp[0].business_logic",
  "screens[0].name",
  "screens[0].key_sections",
  "user_flows[0].name",
  "user_flows[0].steps",
  "permissions.auth_method",
  "permissions.roles[0].role",
  "admin.core_tasks",
  "monetization.business_model",
  "tech_preferences.frontend_client",
  "tech_preferences.backend_or_baas",
  "data_privacy.personal_data_collected",
  "domain_rules.state_model",
  "exception_handling.network_failure",
  "constraints.business",
] as const;

const field = (value: unknown, status: InitialStatus): BriefingStatusField => ({ value, status });
const answerAt = (responses: FirstInterviewResponse[], index: number) => responses[index]?.answer.trim() || "";
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const sentence = (value: string) => clean(value) || null;
const list = (value: string) =>
  value
    .split(/\n|,|\/|->|=>|>|·|•|\|/)
    .map((item) => item.replace(/^[\-\d.()\s]+/, "").trim())
    .map((item) => item.replace(/[.。]+$/, "").trim())
    .filter(Boolean);
const unique = (values: string[]) => [...new Map(values.map((value) => [clean(value).toLowerCase(), clean(value)])).values()].filter(Boolean);
const choose = (value: unknown, fallback: InitialStatus, filled: InitialStatus = "fulled") =>
  isMeaningfulValue(value) ? filled : fallback;
const hasKeyword = (source: string, keywords: string[]) =>
  keywords.some((keyword) => source.toLowerCase().includes(keyword.toLowerCase()));

const arrayPrototypes: Record<string, unknown> = {
  users: { role: field(null, "null"), description: field(null, "null"), key_actions: field(null, "null"), goals: field(null, "expected") },
  core_entities: { name: field(null, "null"), description: field(null, "null"), key_fields: field(null, "null"), relationships: field(null, "expected") },
  "features.mvp": { name: field(null, "null"), description: field(null, "expected"), purpose: field(null, "expected"), business_logic: field(null, "null") },
  "features.post_mvp": { name: field(null, "null"), description: field(null, "expected") },
  "features.explicitly_excluded": { name: field(null, "null"), reason: field(null, "expected") },
  screens: { name: field(null, "null"), primary_users: field(null, "expected"), key_sections: field(null, "null"), required_actions: field(null, "expected") },
  user_flows: { name: field(null, "null"), primary_actor: field(null, "expected"), steps: field(null, "null"), success_condition: field(null, "expected") },
  "permissions.roles": { role: field(null, "null"), permissions: field(null, "null"), limitations: field(null, "expected") },
  integrations: { service: field(null, "null"), purpose: field(null, "expected"), required_data: field(null, "expected") },
  second_interview_topics: { topic: "", related_fields: [], why_missing: "", priority: "medium", suggested_question: "" },
};

function getAt(root: unknown, path: string): unknown {
  let current = root;
  for (const token of path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)) {
    if (Array.isArray(current)) {
      current = current[Number(token)];
      continue;
    }
    if (!current || typeof current !== "object" || !(token in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function mergeShape(candidate: unknown, fallback: unknown, path = ""): unknown {
  if (isStatusField(fallback)) {
    if (!isStatusField(candidate)) {
      return structuredClone(fallback);
    }
    const status =
      candidate.status === "null" || candidate.status === "expected" || candidate.status === "fulled"
        ? candidate.status
        : fallback.status;
    const value = "value" in candidate ? candidate.value : fallback.value;
    if (status === "fulled" && !isMeaningfulValue(value)) {
      return structuredClone(fallback);
    }
    if (!isMeaningfulValue(value) && isMeaningfulValue(fallback.value)) {
      return structuredClone(fallback);
    }
    return { value, status } satisfies BriefingStatusField;
  }

  if (Array.isArray(fallback)) {
    if (!Array.isArray(candidate)) {
      return structuredClone(fallback);
    }
    const prototype = arrayPrototypes[path.replace(/\[\d+\]/g, "")] ?? fallback[0];
    if (!prototype) {
      return candidate;
    }
    const normalized = candidate.map((item, index) => mergeShape(item, fallback[index] ?? prototype, `${path}[${index}]`));
    return normalized.length > 0 ? normalized : structuredClone(fallback);
  }

  if (!fallback || typeof fallback !== "object") {
    return candidate ?? fallback;
  }

  const nextCandidate =
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.entries(fallback as Record<string, unknown>).map(([key, value]) => [
      key,
      mergeShape(nextCandidate[key], value, path ? `${path}.${key}` : key),
    ]),
  );
}

function inferServiceName(value: string): string {
  return value.replace(/["']/g, "").split(/[.!?\n]/)[0]?.trim().slice(0, 40) || "";
}

function inferPlatform(service: string, constraints: string): string | null {
  const source = `${service} ${constraints}`;
  if (!source.trim()) {
    return null;
  }
  if (hasKeyword(source, ["동네", "지역", "주변", "지도", "위치"])) {
    return "모바일 앱 + 반응형 웹 + 관리자 웹";
  }
  if (hasKeyword(source, ["모바일", "앱"])) {
    return hasKeyword(source, ["웹", "브라우저"]) ? "모바일 앱 + 반응형 웹" : "모바일 우선 앱/웹";
  }
  if (hasKeyword(source, ["관리자", "운영", "어드민"])) {
    return "사용자용 웹/앱 + 관리자 웹";
  }
  return "웹 기반 서비스";
}

function inferRoles(targetUsers: string, roleSplit: string, adminWork: string): string[] {
  const source = `${targetUsers} ${roleSplit} ${adminWork}`;
  const roles = unique([...list(targetUsers), ...list(roleSplit)]);
  if (hasKeyword(source, ["판매자", "사장", "점주", "매장", "상인", "소상공인", "자영업"])) {
    roles.push("판매자");
  }
  if (hasKeyword(source, ["소비자", "주민", "고객", "이용자", "사용자"])) {
    roles.push("소비자");
  }
  if (roles.length === 0 && targetUsers) {
    roles.push(targetUsers);
  }
  if (roles.length === 0) {
    roles.push("최종 사용자");
  }
  if (adminWork && !roles.some((role) => hasKeyword(role, ["운영", "관리", "관리자", "어드민"]))) {
    roles.push("운영자");
  }
  return unique(roles).slice(0, 3);
}

function inferEntities(coreData: string, coreActions: string, service: string, monetization: string): string[] {
  const source = `${coreData} ${coreActions} ${service} ${monetization}`;
  const entities = unique(list(coreData));
  if (hasKeyword(source, ["가게", "매장", "상점", "시장", "점포"])) {
    entities.push("가게");
  }
  if (hasKeyword(source, ["상품", "제품", "물건", "메뉴", "서비스"])) {
    entities.push("상품");
  }
  if (hasKeyword(source, ["주문", "구매", "결제"])) {
    entities.push("주문");
  }
  if (hasKeyword(source, ["예약"])) {
    entities.push("예약");
  }
  if (hasKeyword(source, ["채팅", "문의", "메시지", "상담"])) {
    entities.push("채팅");
  }
  if (hasKeyword(source, ["포인트", "적립"])) {
    entities.push("포인트");
  }
  if (hasKeyword(source, ["광고", "홍보"])) {
    entities.push("광고 상품");
  }
  if (entities.length > 0) {
    return unique(entities).slice(0, 5);
  }
  return unique(["사용자", "핵심 리소스", hasKeyword(coreActions, ["결제", "주문", "예약", "정산"]) ? "거래" : "활동 기록"]).slice(0, 4);
}

function inferFeatures(coreActions: string, mvpScope: string, service: string, monetization: string, integrationsAnswer: string): string[] {
  const source = `${coreActions} ${mvpScope} ${service} ${monetization} ${integrationsAnswer}`;
  const features = unique([...list(mvpScope), ...list(coreActions)]);
  if (hasKeyword(source, ["구경", "탐색", "검색", "추천", "리스트", "지도"])) {
    features.push("탐색/검색");
  }
  if (hasKeyword(source, ["가게", "매장", "상점", "리스트"])) {
    features.push("가게 목록");
  }
  if (hasKeyword(source, ["가게", "상세", "상품", "제품", "메뉴"])) {
    features.push("가게/상품 상세");
  }
  if (hasKeyword(source, ["주문", "구매"])) {
    features.push("주문");
    features.push("장바구니/결제");
  }
  if (hasKeyword(source, ["예약"])) {
    features.push("예약");
  }
  if (hasKeyword(source, ["채팅", "문의", "메시지"])) {
    features.push("채팅 상담");
  }
  if (hasKeyword(source, ["알림", "문자", "푸시", "톡"])) {
    features.push("실시간 알림");
  }
  if (hasKeyword(source, ["결제", "포인트", "적립"])) {
    features.push("결제/포인트");
  }
  if (hasKeyword(source, ["후기", "리뷰", "신뢰", "평점"])) {
    features.push("후기/신뢰 요소");
  }
  if (hasKeyword(source, ["광고", "노출", "홍보"])) {
    features.push("광고/프로모션");
  }
  if (hasKeyword(source, ["마이", "내역", "주문내역", "이력"])) {
    features.push("마이/이력 관리");
  }
  if (hasKeyword(source, ["판매자", "사장", "점주", "소상공인"])) {
    features.push("판매자 관리");
    features.push("입점/가게 등록");
  }
  if (hasKeyword(source, ["운영", "승인", "검수", "신고"])) {
    features.push("운영 검수");
  }
  return (features.length > 0 ? unique(features) : ["핵심 작업 수행", "현황 확인", "운영 관리"]).slice(0, 7);
}

function inferScreens(
  mainFlow: string,
  adminWork: string,
  features: string[],
  service: string,
  coreActions: string,
): string[] {
  const source = `${mainFlow} ${adminWork} ${service} ${coreActions} ${features.join(" ")}`;
  const screens: string[] = [];
  screens.push("홈");
  if (hasKeyword(source, ["검색", "탐색", "리스트", "주변"])) {
    screens.push("가게 탐색");
  }
  if (hasKeyword(source, ["지도", "위치"])) {
    screens.push("지도 탐색");
  }
  if (hasKeyword(source, ["가게", "상세", "상품", "제품", "메뉴"])) {
    screens.push("가게 상세");
    screens.push("상품 상세");
  }
  if (hasKeyword(source, ["주문", "구매"])) {
    screens.push("주문/결제");
  }
  if (hasKeyword(source, ["예약"])) {
    screens.push("예약 확인");
  }
  if (hasKeyword(source, ["채팅", "문의", "상담", "메시지"])) {
    screens.push("채팅");
  }
  if (hasKeyword(source, ["알림", "문자", "푸시", "톡"])) {
    screens.push("알림 센터");
  }
  if (hasKeyword(source, ["포인트", "마이", "내역", "이력"])) {
    screens.push("마이페이지");
  }
  if (hasKeyword(source, ["판매자", "사장", "점주", "관리"])) {
    screens.push("입점/가게 등록");
    screens.push("판매자 관리");
  }
  if (adminWork || hasKeyword(source, ["승인", "검수", "신고", "운영"])) {
    screens.push("운영 검수");
  }
  return unique(screens).slice(0, 8);
}

function inferFlows(mainFlow: string, roleSplit: string, adminWork: string, service: string, coreActions: string): string[] {
  const source = `${mainFlow} ${roleSplit} ${adminWork} ${service} ${coreActions}`;
  const flows = unique(list(mainFlow));
  if (hasKeyword(source, ["주민", "소비자", "고객", "탐색", "검색"])) {
    flows.push("소비자 탐색 플로우");
  }
  if (hasKeyword(source, ["주문", "구매", "예약"])) {
    flows.push("소비자 주문/예약 플로우");
  }
  if (hasKeyword(source, ["판매자", "사장", "점주", "상품 관리", "물품관리"])) {
    flows.push("판매자 입점/등록 플로우");
    flows.push("판매자 운영 플로우");
  }
  if (adminWork || hasKeyword(source, ["승인", "검수", "신고", "운영"])) {
    flows.push("운영 승인/검수 플로우");
  }
  if (flows.length === 0) {
    flows.push("사용자 핵심 플로우");
  }
  return unique(flows).slice(0, 4);
}

function inferEntityFields(entity: string, dataFields: string[], source: string): string[] {
  const fields = [...dataFields];

  if (hasKeyword(entity, ["가게", "매장", "상점", "점포"])) {
    fields.push("가게명", "카테고리", "위치", "운영시간", "대표 소개");
  } else if (hasKeyword(entity, ["상품", "제품", "메뉴"])) {
    fields.push("상품명", "가격", "설명", "재고/수량", "대표 이미지");
  } else if (hasKeyword(entity, ["주문"])) {
    fields.push("주문번호", "주문 상태", "주문 상품", "결제 금액", "수령 방식");
  } else if (hasKeyword(entity, ["예약"])) {
    fields.push("예약 일시", "예약 상태", "예약 대상", "요청 사항", "확정 여부");
  } else if (hasKeyword(entity, ["채팅", "메시지", "상담"])) {
    fields.push("참여자", "최근 메시지", "읽음 상태", "문의 대상", "연결 주문");
  } else if (hasKeyword(entity, ["포인트"])) {
    fields.push("적립 포인트", "사용 포인트", "만료일", "적립 기준");
  } else if (hasKeyword(entity, ["광고"])) {
    fields.push("광고 상품명", "노출 위치", "집행 기간", "예산", "상태");
  }

  if (hasKeyword(source, ["지도", "위치"])) {
    fields.push("위치 정보");
  }

  return unique(fields).slice(0, 6);
}

function inferScreenSections(screen: string, source: string): string[] {
  if (hasKeyword(screen, ["홈"])) {
    return ["서비스 소개/지역 맥락", "검색/추천 영역", "카테고리 또는 필터", "대표 CTA", "신뢰/공지 블록"];
  }
  if (hasKeyword(screen, ["탐색", "지도"])) {
    return ["검색창", "필터/정렬", "리스트 또는 지도 영역", "거리/상태 정보", "빠른 진입 CTA"];
  }
  if (hasKeyword(screen, ["상세"])) {
    return ["대표 정보", "상품/서비스 목록", "운영/위치 정보", "리뷰 또는 신뢰 요소", "주문/채팅 CTA"];
  }
  if (hasKeyword(screen, ["주문", "예약"])) {
    return ["선택 항목 요약", "옵션/수량 입력", "결제 또는 예약 정보", "정책/주의사항", "완료 CTA"];
  }
  if (hasKeyword(screen, ["채팅"])) {
    return ["대화 목록", "상담 상세", "빠른 응답 버튼", "주문/예약 연결 정보"];
  }
  if (hasKeyword(screen, ["판매자"])) {
    return ["가게 현황 요약", "상품/주문 관리", "문의/채팅 대응", "광고/프로모션 관리", "정산/통계"];
  }
  if (hasKeyword(screen, ["운영", "검수"])) {
    return ["검수 대기 목록", "사업자/정책 확인", "승인/반려 액션", "신고 처리", "운영 지표"];
  }

  return hasKeyword(source, ["주문", "예약"])
    ? ["핵심 정보 요약", "상태 영역", "입력 또는 수정 섹션", "다음 행동 CTA"]
    : ["핵심 정보", "대표 콘텐츠", "상태/안내", "다음 행동 CTA"];
}

function inferScreenActions(screen: string, actionItems: string[], source: string): string[] {
  const actions = [...actionItems];

  if (hasKeyword(screen, ["홈"])) {
    actions.push("검색하기", "카테고리 선택", "추천 콘텐츠 확인");
  } else if (hasKeyword(screen, ["탐색", "지도"])) {
    actions.push("필터 변경", "지도/리스트 전환", "상세로 이동");
  } else if (hasKeyword(screen, ["상세"])) {
    actions.push("상세 정보 확인", "문의하기", "주문/예약 시작");
  } else if (hasKeyword(screen, ["주문", "예약"])) {
    actions.push("옵션 선택", "예약/주문 제출", "결제 진행");
  } else if (hasKeyword(screen, ["채팅"])) {
    actions.push("메시지 보내기", "빠른 답변 선택", "주문/예약 링크 공유");
  } else if (hasKeyword(screen, ["판매자"])) {
    actions.push("가게 정보 수정", "상품 등록", "주문 상태 변경");
  } else if (hasKeyword(screen, ["운영", "검수"])) {
    actions.push("검수 확인", "승인/반려", "신고 처리");
  }

  if (hasKeyword(source, ["포인트"])) {
    actions.push("포인트 확인");
  }
  if (hasKeyword(source, ["광고"])) {
    actions.push("광고 관리");
  }

  return unique(actions).slice(0, 6);
}

function inferFlowSteps(flow: string, mainFlow: string, screens: string[]): string[] {
  if (hasKeyword(flow, ["소비자", "주민", "고객", "주문"])) {
    return unique(["홈 진입", "탐색/검색", "상세 확인", "주문/예약 또는 채팅", "결과 확인"]).slice(0, 5);
  }
  if (hasKeyword(flow, ["판매자", "사장", "점주"])) {
    return unique(["로그인", "가게/상품 관리", "주문/예약 확인", "문의 응답", "상태 업데이트"]).slice(0, 5);
  }
  if (hasKeyword(flow, ["운영", "검수", "승인"])) {
    return unique(["대상 확인", "증빙 검토", "승인/반려", "이슈 처리", "기록 저장"]).slice(0, 5);
  }

  const parsed = unique(list(mainFlow));
  return (parsed.length > 0 ? parsed : ["핵심 화면 진입", "주요 작업 수행", "결과 확인", screens[0] || "다음 화면 이동"]).slice(0, 5);
}

function inferRolePermissions(role: string, source: string): string[] {
  if (hasKeyword(role, ["판매자", "사장", "점주", "상인"])) {
    return ["가게 정보 관리", "상품/서비스 관리", "주문/예약 상태 변경", "고객 문의 응답", ...(hasKeyword(source, ["광고", "홍보"]) ? ["광고 관리"] : [])].slice(0, 6);
  }
  if (hasKeyword(role, ["운영", "관리자", "어드민"])) {
    return ["입점/사업자 검수", "신고 처리", "운영 지표 확인", "서비스 정책 관리"].slice(0, 6);
  }
  return ["가게 탐색", "상세 조회", "주문/예약", "채팅 문의", ...(hasKeyword(source, ["포인트"]) ? ["포인트 확인"] : [])].slice(0, 6);
}

function inferRoleLimitations(role: string): string[] {
  if (hasKeyword(role, ["판매자", "사장", "점주", "상인"])) {
    return ["다른 판매자의 정보는 수정할 수 없음", "운영 승인 전 일부 기능 제한"];
  }
  if (hasKeyword(role, ["운영", "관리자", "어드민"])) {
    return ["운영 정책 범위 내에서만 승인/제재 가능", "개인정보 열람은 필요한 범위로 제한"];
  }
  return ["본인 주문/예약과 계정 정보만 수정 가능", "판매자 운영 화면 접근 불가"];
}

function inferIntegrationPurpose(integration: string, source: string): string {
  if (hasKeyword(integration, ["지도", "맵", "location"])) {
    return "주변 가게 탐색과 위치 안내를 제공한다";
  }
  if (hasKeyword(integration, ["로그인", "카카오", "소셜", "auth"])) {
    return "가입과 로그인을 빠르게 처리한다";
  }
  if (hasKeyword(integration, ["결제", "payment"])) {
    return "주문/예약 결제와 환불 흐름을 처리한다";
  }
  if (hasKeyword(integration, ["알림", "문자", "톡", "메시지"])) {
    return "주문, 예약, 문의 상태를 실시간으로 알린다";
  }

  return hasKeyword(source, ["주문", "예약"])
    ? "핵심 주문/예약 흐름을 끊기지 않게 연결한다"
    : "서비스 핵심 동선을 외부 기능과 연결한다";
}

function inferIntegrationData(integration: string, dataFields: string[], source: string): string[] {
  const fields = [...dataFields];

  if (hasKeyword(integration, ["지도", "맵"])) {
    fields.push("가게 주소", "좌표", "거리 정보");
  } else if (hasKeyword(integration, ["로그인", "카카오", "소셜"])) {
    fields.push("이메일 또는 식별자", "닉네임", "프로필 정보");
  } else if (hasKeyword(integration, ["결제"])) {
    fields.push("결제 금액", "주문번호", "결제 상태", "환불 정보");
  } else if (hasKeyword(integration, ["알림", "문자", "톡"])) {
    fields.push("수신자 연락처", "알림 유형", "발송 상태");
  }

  if (hasKeyword(source, ["주문", "예약"])) {
    fields.push("주문/예약 상태");
  }

  return unique(fields).slice(0, 6);
}

function buildSecondInterviewTopics(input: {
  roles: string[];
  entities: string[];
  features: string[];
  screens: string[];
  integrations: string[];
  monetization: string;
}) {
  return [
    {
      topic: "핵심 엔티티 필드와 상태 전이 정의",
      related_fields: ["core_entities[0].key_fields", "domain_rules.state_model", "domain_rules.validation_rules"],
      why_missing: "구현 단계에서는 저장 필드와 상태 전이 규칙이 필요하지만 1차 인터뷰에서는 아직 충분히 구조화되지 않았습니다.",
      priority: "high",
      suggested_question: `${input.entities[0] || "핵심 데이터"}에 꼭 저장할 항목과, ${input.features[0] || "핵심 기능"} 진행 중 상태가 어떻게 바뀌는지 알려주세요.`,
    },
    {
      topic: "화면 구성과 권한 범위",
      related_fields: ["screens[0].key_sections", "permissions.auth_method", "permissions.roles[0].permissions"],
      why_missing: "앱/웹 구현을 위해서는 화면별 핵심 섹션과 사용자 역할별 허용 작업이 더 구체적이어야 합니다.",
      priority: "high",
      suggested_question: `${input.roles[0] || "주 사용자"}가 보는 화면과 ${input.roles[1] || "운영자"}가 따로 해야 하는 작업을 나눠서 설명해주세요.`,
    },
    {
      topic: "MVP 세부 로직과 예외 처리",
      related_fields: ["features.mvp[0].business_logic", "user_flows[0].steps", "exception_handling.invalid_input"],
      why_missing: "핵심 기능은 보이지만 입력 검증, 실패 조건, 완료 기준이 부족합니다.",
      priority: "high",
      suggested_question: `${input.features[0] || "핵심 기능"}이 실제로 동작할 때 입력 검증, 실패 조건, 완료 기준을 알려주세요.`,
    },
    {
      topic: "운영/관리와 모니터링 방식",
      related_fields: ["admin.core_tasks", "analytics.key_events", "operational_policies.incident_escalation"],
      why_missing: "사용자 기능만으로는 부족하고 운영자가 무엇을 확인하고 처리해야 하는지도 필요합니다.",
      priority: "medium",
      suggested_question: `${input.screens.at(-1) || "운영 화면"}에서 운영자가 매일 확인해야 하는 지표와 처리 업무를 알려주세요.`,
    },
    {
      topic: "외부 연동과 알림 정책",
      related_fields: ["integrations[0].purpose", "notifications.trigger_events", "notifications.channels"],
      why_missing: "연동 데이터와 알림 방식은 기술 구조와 UX를 직접 결정합니다.",
      priority: input.integrations.length > 0 ? "high" : "medium",
      suggested_question:
        input.integrations.length > 0
          ? `${input.integrations.join(", ")} 연동에서 어떤 데이터를 주고받아야 하고 어떤 상황에 알림이 필요한지 알려주세요.`
          : "외부 서비스 연동이 필요한지, 필요하다면 어떤 데이터를 주고받아야 하는지 알려주세요.",
    },
    {
      topic: "수익화와 개인정보 처리 정책",
      related_fields: ["monetization.business_model", "data_privacy.personal_data_collected", "constraints.legal"],
      why_missing: "수익 구조와 개인정보 처리 조건이 정리돼야 실제 데이터 설계와 운영 정책을 확정할 수 있습니다.",
      priority: input.monetization ? "high" : "medium",
      suggested_question:
        input.monetization
          ? `현재 수익 구조(${input.monetization})를 실제로 적용하려면 결제, 환불, 저장해야 할 개인정보가 어떻게 되는지 알려주세요.`
          : "결제나 구독이 필요한지, 그리고 저장해야 할 개인정보가 무엇인지 알려주세요.",
    },
  ];
}

export function buildImplementationReadinessReport(briefing: unknown): ImplementationReadinessReport {
  const missingBranches = INITIAL_BRIEFING_REQUIRED_BRANCHES.filter((path) => getAt(briefing, path) === undefined);
  const missingCriticalPaths = INITIAL_BRIEFING_CRITICAL_PATHS.filter((path) => getAt(briefing, path) === undefined);
  const unresolvedCriticalPaths = INITIAL_BRIEFING_CRITICAL_PATHS.filter((path) => {
    const fieldAtPath = getAt(briefing, path);
    return isStatusField(fieldAtPath)
      ? fieldAtPath.status === "null" || fieldAtPath.status === "expected" || !isMeaningfulValue(fieldAtPath.value)
      : false;
  });
  const readyIfFilled = missingBranches.length === 0 && missingCriticalPaths.length === 0;

  return {
    requiredBranches: [...INITIAL_BRIEFING_REQUIRED_BRANCHES],
    criticalPaths: [...INITIAL_BRIEFING_CRITICAL_PATHS],
    missingBranches,
    missingCriticalPaths,
    unresolvedCriticalPaths,
    readyIfFilled,
    implementationReadyNow: readyIfFilled && unresolvedCriticalPaths.length === 0,
  };
}

export function buildFallbackInitialBriefing(responses: FirstInterviewResponse[]): InitialBriefing {
  const service = answerAt(responses, 0);
  const targetUsers = answerAt(responses, 1);
  const problem = answerAt(responses, 2);
  const coreData = answerAt(responses, 3);
  const coreActions = answerAt(responses, 4);
  const mainFlow = answerAt(responses, 5);
  const roleSplit = answerAt(responses, 6);
  const adminWork = answerAt(responses, 7);
  const monetization = answerAt(responses, 8);
  const integrationsAnswer = answerAt(responses, 9);
  const mvpScope = answerAt(responses, 10);
  const constraints = answerAt(responses, 11);
  const source = responses.map((response) => response.answer).join(" ");

  const name = inferServiceName(service);
  const roles = inferRoles(targetUsers, roleSplit, adminWork);
  const entities = inferEntities(coreData, coreActions, service, monetization);
  const features = inferFeatures(coreActions, mvpScope, service, monetization, integrationsAnswer);
  const screens = inferScreens(mainFlow, adminWork, features, service, coreActions);
  const flows = inferFlows(mainFlow, roleSplit, adminWork, service, coreActions);
  const integrations = unique([
    ...list(integrationsAnswer),
    ...(hasKeyword(integrationsAnswer, ["카카오"]) ? ["카카오 로그인"] : []),
    ...(hasKeyword(integrationsAnswer, ["지도"]) ? ["지도 API"] : []),
    ...(hasKeyword(integrationsAnswer, ["결제"]) || hasKeyword(monetization, ["결제"]) ? ["결제 API"] : []),
  ]).slice(0, 3);
  const platform = inferPlatform(service, constraints);
  const paymentHint = hasKeyword(monetization, ["결제", "구독", "유료", "정산"]);
  const authHint = roles.length > 1 || hasKeyword(`${coreData} ${integrationsAnswer}`, ["고객", "사용자", "개인", "로그인"]);
  const notificationHint = hasKeyword(`${coreActions} ${integrationsAnswer}`, ["알림", "메시지", "톡", "메일", "푸시"]);
  const dataFields = unique([
    ...list(coreData),
    ...(hasKeyword(source, ["가게", "매장", "상점"]) ? ["가게명", "카테고리", "운영시간"] : []),
    ...(hasKeyword(source, ["상품", "제품", "물건", "메뉴"]) ? ["상품명", "가격", "설명"] : []),
    ...(hasKeyword(source, ["주문"]) ? ["주문 상태", "주문 금액"] : []),
    ...(hasKeyword(source, ["예약"]) ? ["예약 시간", "예약 상태"] : []),
    ...(hasKeyword(source, ["채팅", "문의"]) ? ["문의 내용", "응답 상태"] : []),
  ]).slice(0, 8);
  const actionItems = unique([
    ...list(coreActions),
    ...(hasKeyword(source, ["탐색", "구경", "검색"]) ? ["탐색", "검색"] : []),
    ...(hasKeyword(source, ["주문", "구매"]) ? ["주문"] : []),
    ...(hasKeyword(source, ["예약"]) ? ["예약"] : []),
    ...(hasKeyword(source, ["채팅", "문의"]) ? ["채팅 문의"] : []),
    ...(hasKeyword(source, ["결제"]) ? ["결제"] : []),
  ]).slice(0, 8);

  return {
    meta: {
      source: "first-interview",
      generated_at: new Date().toISOString(),
      schema_goal: "Fill the remaining null/expected fields and this JSON becomes an implementation-grade web/app brief.",
      first_interview_purpose: "Infer product structure, data, flows, operations, and constraints from first interview answers.",
      status_guide: {
        null: "Essential but still unknown.",
        expected: "Likely or recommended to refine via follow-up.",
        fulled: "Directly supported by the user's own answer.",
      },
      implementation_required_branches: [...INITIAL_BRIEFING_REQUIRED_BRANCHES],
      implementation_critical_paths: [...INITIAL_BRIEFING_CRITICAL_PATHS],
      first_interview_answers: responses.map((response) => ({ id: response.id, label: response.label, question: response.question, answer: response.answer })),
    },
    service: {
      name: field(name || null, name ? "fulled" : "null"),
      summary: field(sentence(service), choose(service, "null")),
      problem_statement: field(sentence(problem), choose(problem, "null")),
      solution_statement: field(sentence(service || mvpScope), choose(service || mvpScope, "expected")),
      category: field(sentence(service), service ? "expected" : "null"),
      target_platform: field(platform, platform ? "expected" : "null"),
      mvp_scope_summary: field(sentence(mvpScope || coreActions), choose(mvpScope || coreActions, "null")),
    },
    users: roles.map((role, index) => ({
      role: field(role, hasKeyword(`${targetUsers} ${roleSplit} ${adminWork}`, [role]) ? "fulled" : "expected"),
      description: field(
        sentence(
          index === 0
            ? targetUsers || service
            : hasKeyword(role, ["운영", "관리자"])
              ? adminWork || roleSplit
              : roleSplit || targetUsers,
        ),
        choose(
          index === 0
            ? targetUsers || service
            : hasKeyword(role, ["운영", "관리자"])
              ? adminWork || roleSplit
              : roleSplit || targetUsers,
          "expected",
        ),
      ),
      key_actions: field(
        inferRolePermissions(role, source),
        "expected",
      ),
      goals: field(
        unique([
          ...(hasKeyword(role, ["판매자", "사장", "점주", "상인"]) ? ["가게 노출 확대", "주문/예약 관리 효율화"] : []),
          ...(hasKeyword(role, ["운영", "관리자"]) ? ["검수 효율화", "신고 대응 정확도 향상"] : ["동네 가게 탐색 편의", "빠른 주문/예약 완료"]),
        ]).slice(0, 4),
        "expected",
      ),
    })),
    core_entities: entities.map((entity, index) => ({
      name: field(entity, hasKeyword(coreData, [entity]) ? "fulled" : "expected"),
      description: field(sentence(coreData || coreActions || service), choose(coreData || coreActions || service, "expected")),
      key_fields: field(inferEntityFields(entity, dataFields, source), "expected"),
      relationships: field(
        unique([
          ...(hasKeyword(entity, ["가게"]) ? ["판매자와 연결"] : []),
          ...(hasKeyword(entity, ["상품"]) ? ["가게에 속함", "주문과 연결"] : []),
          ...(hasKeyword(entity, ["주문"]) ? ["사용자, 가게, 상품과 연결"] : []),
          ...(hasKeyword(entity, ["예약"]) ? ["사용자와 가게 일정에 연결"] : []),
          ...(hasKeyword(entity, ["채팅"]) ? ["사용자와 판매자를 연결"] : []),
          sentence(mainFlow || roleSplit) || "",
        ]).filter(Boolean).slice(0, 4),
        index <= 1 ? "expected" : "fulled",
      ),
    })),
    second_interview_topics: buildSecondInterviewTopics({ roles, entities, features, screens, integrations, monetization }),
    features: {
      mvp: features.map((feature, index) => ({
        name: field(feature, hasKeyword(`${coreActions} ${mvpScope}`, [feature]) ? "fulled" : "expected"),
        description: field(sentence(coreActions || mvpScope || service), choose(coreActions || mvpScope || service, "expected")),
        purpose: field(
          sentence(problem || service || mvpScope),
          "expected",
        ),
        business_logic: field(
          inferFlowSteps(feature, mainFlow, screens),
          index <= 4 ? "expected" : "fulled",
        ),
      })),
      post_mvp: unique([monetization ? "수익화 고도화" : "", integrationsAnswer ? "외부 연동 확장" : "", adminWork ? "운영 자동화" : ""])
        .filter(Boolean)
        .slice(0, 2)
        .map((feature) => ({ name: field(feature, "expected"), description: field(sentence(feature), "expected") })),
      explicitly_excluded: hasKeyword(constraints, ["처음엔 안", "나중에", "추후"])
        ? [{ name: field("초기 제외 범위", "expected"), reason: field(sentence(constraints), choose(constraints, "expected")) }]
        : [],
    },
    screens: screens.map((screen, index) => ({
      name: field(screen, "expected"),
      primary_users: field(
        hasKeyword(screen, ["판매자"]) ? [roles.find((role) => hasKeyword(role, ["판매자", "사장", "점주", "상인"])) || roles[0] || "판매자"]
          : hasKeyword(screen, ["운영", "검수"]) ? [roles.find((role) => hasKeyword(role, ["운영", "관리자"])) || roles.at(-1) || "운영자"]
          : [roles.find((role) => !hasKeyword(role, ["운영", "관리자"])) || roles[0] || "최종 사용자"],
        "expected",
      ),
      key_sections: field(
        inferScreenSections(screen, source),
        index <= 4 ? "expected" : "fulled",
      ),
      required_actions: field(
        inferScreenActions(screen, actionItems, source),
        index <= 4 ? "expected" : "fulled",
      ),
    })),
    user_flows: flows.map((flow, index) => ({
      name: field(flow, "expected"),
      primary_actor: field(
        hasKeyword(flow, ["판매자", "사장", "점주"]) ? roles.find((role) => hasKeyword(role, ["판매자", "사장", "점주", "상인"])) || roles[0] || "판매자"
          : hasKeyword(flow, ["운영", "검수", "승인"]) ? roles.find((role) => hasKeyword(role, ["운영", "관리자"])) || roles.at(-1) || "운영자"
          : roles.find((role) => !hasKeyword(role, ["운영", "관리자"])) || roles[0] || "최종 사용자",
        "expected",
      ),
      steps: field(inferFlowSteps(flow, mainFlow, screens), index <= 2 ? "expected" : "fulled"),
      success_condition: field(
        unique([
          ...(hasKeyword(flow, ["소비자", "주문"]) ? ["원하는 가게/상품을 찾고 주문이나 예약을 완료함"] : []),
          ...(hasKeyword(flow, ["판매자"]) ? ["주문/예약과 문의를 누락 없이 처리함"] : []),
          ...(hasKeyword(flow, ["운영", "검수"]) ? ["문제 계정과 상품을 빠르게 판별하고 처리함"] : []),
          sentence(mvpScope || problem) || "",
        ]).filter(Boolean).slice(0, 3),
        index <= 2 ? "expected" : "fulled",
      ),
    })),
    permissions: {
      auth_method: field(authHint ? "이메일/소셜 로그인 중 결정 필요" : null, authHint ? "expected" : "null"),
      roles: roles.map((role, index) => ({
        role: field(role, hasKeyword(`${targetUsers} ${roleSplit} ${adminWork}`, [role]) ? "fulled" : "expected"),
        permissions: field(inferRolePermissions(role, source), index <= 1 ? "expected" : "fulled"),
        limitations: field(inferRoleLimitations(role), index === 0 ? "expected" : "fulled"),
      })),
    },
    admin: {
      admin_needed: field(adminWork ? "필요" : "확인 필요", adminWork ? "fulled" : "expected"),
      core_tasks: field(
        unique([
          ...list(adminWork),
          ...(hasKeyword(adminWork, ["승인", "검수", "사업자"]) ? ["입점 검수"] : []),
          ...(hasKeyword(adminWork, ["신고", "불법", "피싱"]) ? ["신고/정책 위반 처리"] : []),
          "운영 지표 확인",
        ]).slice(0, 6),
        adminWork ? "expected" : "null",
      ),
    },
    monetization: {
      business_model: field(sentence(monetization), monetization ? "fulled" : "null"),
      pricing_notes: field(sentence(monetization), monetization ? "expected" : "null"),
      payment_required: field(paymentHint ? "결제 수단과 정산 구조 확인 필요" : null, paymentHint ? "expected" : "null"),
    },
    integrations: integrations.map((integration) => ({
      service: field(integration, hasKeyword(integrationsAnswer, [integration]) ? "fulled" : "expected"),
      purpose: field(inferIntegrationPurpose(integration, source), "expected"),
      required_data: field(
        inferIntegrationData(integration, dataFields, source),
        integration === integrations[0] ? "expected" : "fulled",
      ),
    })),
    notifications: {
      trigger_events: field(
        notificationHint ? unique([...actionItems, "상태 변경", "문의 답변"]).slice(0, 6) : null,
        notificationHint ? "expected" : "null",
      ),
      channels: field(
        notificationHint ? unique([...integrations, "앱 푸시", "문자"]).slice(0, 4) : null,
        notificationHint ? "expected" : "null",
      ),
    },
    content_policy: {
      review_required: field(adminWork ? "운영 승인/검토 여부 확인 필요" : null, adminWork ? "expected" : "null"),
    },
    tech_preferences: {
      target_devices: field(platform ? [platform, "모바일 우선 UX 검토"] : null, platform ? "expected" : "null"),
      frontend_client: field(null, "null"),
      backend_or_baas: field(null, "null"),
    },
    data_privacy: {
      personal_data_collected: field(unique([...dataFields, "연락처", ...(paymentHint ? ["결제 정보"] : [])]).slice(0, 6), coreData ? "expected" : "null"),
      compliance_notes: field(constraints ? [constraints, "개인정보 수집/보관 범위 확정 필요"] : ["개인정보 수집/보관 범위 확정 필요"], "expected"),
    },
    performance: {
      response_time_goal: field(hasKeyword(constraints, ["빠르게", "즉시", "실시간"]) ? "주요 탐색과 주문 흐름은 지연 없이 반응해야 함" : "첫 화면과 핵심 작업의 응답 목표 정의 필요", "expected"),
    },
    analytics: {
      key_events: field(unique([...actionItems, "첫 방문", "핵심 CTA 클릭", "전환 완료"]).slice(0, 6), coreActions ? "expected" : "null"),
    },
    domain_rules: {
      state_model: field(
        unique([
          ...(hasKeyword(source, ["주문"]) ? ["주문: 생성 -> 확인 -> 결제 -> 완료/취소"] : []),
          ...(hasKeyword(source, ["예약"]) ? ["예약: 요청 -> 검토 -> 확정 -> 완료/취소"] : []),
          ...(hasKeyword(source, ["광고"]) ? ["광고: 신청 -> 검수 -> 집행 -> 종료"] : []),
        ]).slice(0, 4),
        "expected",
      ),
      validation_rules: field(
        unique([
          "필수 입력값과 형식을 검증",
          ...(hasKeyword(source, ["사업자"]) ? ["사업자 등록 정보 검수 필요"] : []),
          ...(hasKeyword(source, ["결제"]) ? ["결제 가능 상태에서만 주문 확정"] : []),
        ]).slice(0, 4),
        "expected",
      ),
      business_invariants: field(
        unique([
          ...(hasKeyword(source, ["주문", "예약"]) ? ["승인되지 않은 대상은 주문/예약을 받을 수 없음"] : []),
          ...(hasKeyword(source, ["광고"]) ? ["광고 노출은 결제/승인 상태와 연결됨"] : []),
          sentence(problem || constraints) || "",
        ]).filter(Boolean).slice(0, 4),
        "expected",
      ),
    },
    operational_policies: {
      incident_escalation: field(
        adminWork
          ? "운영 이슈는 검수/신고/결제 문제 순으로 우선 확인하고 담당자가 처리한다"
          : "핵심 이슈는 운영 담당자가 우선 확인하고 영향 범위에 따라 처리한다",
        "expected",
      ),
    },
    exception_handling: {
      payment_failure: field(paymentHint ? "결제 실패 시 재시도/안내 정책 적용" : null, paymentHint ? "expected" : "null"),
      network_failure: field("네트워크 실패 시 재시도와 안내 메시지를 보여준다", "expected"),
      invalid_input: field("입력값 검증 오류를 즉시 표시한다", "expected"),
      empty_state: field("데이터가 없을 때 다음 행동을 안내한다", "expected"),
    },
    constraints: {
      business: field(sentence(constraints), constraints ? "fulled" : "null"),
      legal: field(hasKeyword(`${constraints} ${monetization}`, ["약관", "개인정보", "법", "결제", "정산"]) ? "법적/약관 검토 필요" : null, "expected"),
      accessibility: field(hasKeyword(constraints, ["쉽게", "간단", "모바일", "누구나"]) ? "비전문가도 쉽게 쓰는 UX 필요" : null, constraints ? "expected" : "null"),
    },
  };
}

export function normalizeInitialBriefing(candidate: unknown, fallback: InitialBriefing): InitialBriefing {
  return mergeShape(candidate, fallback) as InitialBriefing;
}

export { INITIAL_BRIEFING_REQUIRED_BRANCHES, INITIAL_BRIEFING_CRITICAL_PATHS };
