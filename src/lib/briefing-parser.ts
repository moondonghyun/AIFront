export interface EmptyField {
  path: string;
  status: "null" | "expected";
  currentValue: unknown;
  parentContext: string; // human-readable context
}

/**
 * Recursively walks the briefing JSON and extracts fields with status "null" or "expected"
 */
export function extractEmptyFields(
  obj: unknown,
  path = "",
  parentContext = ""
): EmptyField[] {
  const results: EmptyField[] = [];

  if (!obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemName =
        item?.name?.value || item?.role?.value || item?.type?.value || `[${index}]`;
      results.push(
        ...extractEmptyFields(item, `${path}[${index}]`, `${parentContext} > ${itemName}`)
      );
    });
    return results;
  }

  const record = obj as Record<string, unknown>;

  // Check if this is a value/status pair
  if ("value" in record && "status" in record) {
    const status = record.status as string;
    if (status === "null" || status === "expected") {
      results.push({
        path,
        status: status as "null" | "expected",
        currentValue: record.value,
        parentContext: parentContext.replace(/^ > /, ""),
      });
    }
    return results;
  }

  // Recurse into nested objects
  for (const key of Object.keys(record)) {
    if (key === "meta" || key === "second_interview_topics") continue;
    const childContext =
      parentContext ? `${parentContext} > ${key}` : key;
    results.push(
      ...extractEmptyFields(record[key], path ? `${path}.${key}` : key, childContext)
    );
  }

  return results;
}

/**
 * Sets a value at a dot-notation path in the briefing JSON
 */
export function setFieldValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (i === parts.length - 1) {
      // Set the value and update status
      const parent = current as Record<string, unknown>;
      if (parent && typeof parent === "object" && "value" in parent && "status" in parent) {
        parent.value = value;
        parent.status = "fulled";
      }
    } else {
      const parent = current as Record<string, unknown>;
      const nextKey = parts[i + 1];
      if (/^\d+$/.test(nextKey)) {
        current = (parent[key] as unknown[])?.[parseInt(nextKey)];
        i++; // skip the index
      } else {
        current = parent[key];
      }
    }
  }
}

export interface GeneratedQuestion {
  id: string;
  target_fields: string[];
  question: string;
  placeholder: string;
  reason?: string;
}

export interface GenerateQuestionsResult {
  questions: GeneratedQuestion[];
  skipped_expected_fields: {
    path: string;
    current_value: string;
    reason: string;
  }[];
}
