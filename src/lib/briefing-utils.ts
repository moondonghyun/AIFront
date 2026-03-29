/**
 * Counts total and filled fields in a briefing JSON structure.
 * Returns completion rate as a percentage.
 */
export function countBriefingFields(obj: unknown): { total: number; filled: number; rate: number } {
  const result = countFieldsRecursive(obj);
  return {
    ...result,
    rate: result.total > 0 ? Math.round((result.filled / result.total) * 100) : 100,
  };
}

function countFieldsRecursive(obj: unknown): { total: number; filled: number } {
  if (!obj || typeof obj !== "object") return { total: 0, filled: 0 };

  if (Array.isArray(obj)) {
    return obj.reduce(
      (acc, item) => {
        const c = countFieldsRecursive(item);
        return { total: acc.total + c.total, filled: acc.filled + c.filled };
      },
      { total: 0, filled: 0 }
    );
  }

  const record = obj as Record<string, unknown>;

  if ("value" in record && "status" in record) {
    return { total: 1, filled: record.status === "fulled" ? 1 : 0 };
  }

  return Object.values(record).reduce<{ total: number; filled: number }>(
    (acc, val) => {
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || val === null) return acc;
      const c = countFieldsRecursive(val);
      return { total: acc.total + c.total, filled: acc.filled + c.filled };
    },
    { total: 0, filled: 0 }
  );
}
