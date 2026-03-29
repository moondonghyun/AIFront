import type { InterviewFieldUpdate } from "@/lib/ai-types";

export type BriefingFieldStatus = "null" | "expected" | "fulled" | string;

export interface BriefingStatusField {
  value: unknown;
  status: BriefingFieldStatus;
  [key: string]: unknown;
}

export interface InterviewTarget {
  path: string;
  status: "null" | "expected";
  currentValue: unknown;
  parentContext: string;
  label: string;
}

export interface InterviewProgress {
  totalTargets: number;
  answeredTargets: number;
  remainingTargets: number;
  completionRate: number;
  completionPercentage: number;
}

export interface ApplyInterviewUpdatesResult {
  nextBriefing: Record<string, unknown>;
  appliedUpdates: InterviewFieldUpdate[];
  skippedUpdates: Array<{ path: string; reason: string }>;
}

const SKIPPED_BRANCH_KEYS = new Set(["meta", "second_interview_topics"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStatusField(value: unknown): value is BriefingStatusField {
  return isRecord(value) && "value" in value && "status" in value;
}

function tokenizePath(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

function normalizeContext(parentContext: string): string {
  return parentContext.replace(/^ > /, "").trim();
}

function humanizePathSegment(segment: string): string {
  return segment
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractItemLabel(value: unknown, fallback: string): string {
  if (!isRecord(value)) {
    return fallback;
  }

  if (isStatusField(value.name) && typeof value.name.value === "string" && value.name.value.trim()) {
    return value.name.value.trim();
  }

  if (isStatusField(value.title) && typeof value.title.value === "string" && value.title.value.trim()) {
    return value.title.value.trim();
  }

  if (isStatusField(value.role) && typeof value.role.value === "string" && value.role.value.trim()) {
    return value.role.value.trim();
  }

  return fallback;
}

function formatPathLabel(path: string): string {
  const tokens = tokenizePath(path);
  const lastToken = tokens[tokens.length - 1] ?? path;
  return humanizePathSegment(lastToken);
}

export function formatValueForPrompt(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const compact = value
      .map((item) => formatValueForPrompt(item))
      .filter(Boolean)
      .slice(0, 4);
    return compact.join(", ");
  }

  if (isRecord(value)) {
    const compact = Object.entries(value)
      .slice(0, 3)
      .map(([key, nestedValue]) => `${key}: ${formatValueForPrompt(nestedValue)}`)
      .filter((entry) => entry.endsWith(": ") === false);
    return compact.join(", ");
  }

  return "";
}

export function isMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return value !== null && value !== undefined;
}

export function collectInterviewTargets(
  value: unknown,
  path = "",
  parentContext = "",
): InterviewTarget[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const itemLabel =
        isRecord(item) ? extractItemLabel(item, `[${index}]`) : `[${index}]`;
      const nextContext = parentContext ? `${parentContext} > ${itemLabel}` : itemLabel;
      return collectInterviewTargets(item, `${path}[${index}]`, nextContext);
    });
  }

  if (isStatusField(value)) {
    if (value.status === "null" || value.status === "expected") {
      return [
        {
          path,
          status: value.status,
          currentValue: value.value,
          parentContext: normalizeContext(parentContext),
          label: formatPathLabel(path),
        },
      ];
    }

    return [];
  }

  return Object.entries(value)
    .filter(([key]) => !SKIPPED_BRANCH_KEYS.has(key))
    .flatMap(([key, nestedValue]) => {
      const nextPath = path ? `${path}.${key}` : key;
      const nextContext = isStatusField(nestedValue)
        ? parentContext
        : parentContext
          ? `${parentContext} > ${key}`
          : key;
      return collectInterviewTargets(nestedValue, nextPath, nextContext);
    });
}

export function getStatusFieldAtPath(
  briefing: Record<string, unknown>,
  path: string,
): BriefingStatusField | null {
  let current: unknown = briefing;

  for (const token of tokenizePath(path)) {
    if (Array.isArray(current)) {
      const index = Number(token);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }

    if (!isRecord(current) || !(token in current)) {
      return null;
    }

    current = current[token];
  }

  return isStatusField(current) ? current : null;
}

function isResolvedTarget(field: BriefingStatusField | null): boolean {
  if (!field) {
    return false;
  }

  if (field.status === "null" || field.status === "expected") {
    return false;
  }

  return isMeaningfulValue(field.value);
}

export function calculateInterviewProgress(
  briefing: Record<string, unknown>,
  initialTargetPaths: string[],
): InterviewProgress {
  const uniquePaths = [...new Set(initialTargetPaths)];
  const answeredTargets = uniquePaths.reduce((count, path) => {
    return count + (isResolvedTarget(getStatusFieldAtPath(briefing, path)) ? 1 : 0);
  }, 0);
  const totalTargets = uniquePaths.length;
  const remainingTargets = Math.max(totalTargets - answeredTargets, 0);
  const completionRate = totalTargets === 0 ? 1 : answeredTargets / totalTargets;

  return {
    totalTargets,
    answeredTargets,
    remainingTargets,
    completionRate,
    completionPercentage: Math.round(completionRate * 100),
  };
}

export function collectRemainingTargets(
  briefing: Record<string, unknown>,
  initialTargetPaths: string[],
): InterviewTarget[] {
  const targetPathSet = new Set(initialTargetPaths);

  return collectInterviewTargets(briefing).filter((target) => targetPathSet.has(target.path));
}

export function collectFilledFieldSummary(
  briefing: Record<string, unknown>,
  limit = 20,
): Array<{ path: string; value: string }> {
  const results: Array<{ path: string; value: string }> = [];

  const visit = (value: unknown, path = ""): void => {
    if (results.length >= limit || !value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (isStatusField(value)) {
      if (value.status === "fulled") {
        const formatted = formatValueForPrompt(value.value);
        if (formatted) {
          results.push({ path, value: formatted });
        }
      }
      return;
    }

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (SKIPPED_BRANCH_KEYS.has(key)) {
        return;
      }

      visit(nestedValue, path ? `${path}.${key}` : key);
    });
  };

  visit(briefing);
  return results;
}

export function applyInterviewUpdates(
  briefing: Record<string, unknown>,
  updates: InterviewFieldUpdate[],
): ApplyInterviewUpdatesResult {
  const nextBriefing = structuredClone(briefing);
  const appliedUpdates: InterviewFieldUpdate[] = [];
  const skippedUpdates: Array<{ path: string; reason: string }> = [];
  const seenPaths = new Set<string>();

  updates.forEach((update) => {
    const rawPath = update.path.trim();
    const isStatusPath = rawPath.endsWith(".status");
    const trimmedPath = rawPath.endsWith(".value") || isStatusPath
      ? rawPath.replace(/\.(value|status)$/, "")
      : rawPath;

    if (!trimmedPath) {
      skippedUpdates.push({ path: update.path, reason: "empty-path" });
      return;
    }

    if (isStatusPath) {
      skippedUpdates.push({ path: rawPath, reason: "status-path-skipped" });
      return;
    }

    if (seenPaths.has(trimmedPath)) {
      skippedUpdates.push({ path: trimmedPath, reason: "duplicate-path" });
      return;
    }

    if (!isMeaningfulValue(update.value)) {
      skippedUpdates.push({ path: trimmedPath, reason: "empty-value" });
      return;
    }

    const field = getStatusFieldAtPath(nextBriefing, trimmedPath);
    if (!field) {
      skippedUpdates.push({ path: trimmedPath, reason: "missing-field" });
      return;
    }

    if (field.status === "fulled") {
      skippedUpdates.push({ path: trimmedPath, reason: "protected-fulled-field" });
      return;
    }

    field.value = update.value;
    field.status = "fulled";
    appliedUpdates.push({ ...update, path: trimmedPath });
    seenPaths.add(trimmedPath);
  });

  return {
    nextBriefing,
    appliedUpdates,
    skippedUpdates,
  };
}
