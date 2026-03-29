/** Returns `true` when the input is a non-null object that is not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalizes a value to an optional string. */
export function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Normalizes a value to an optional finite number. */
export function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Normalizes a value to an optional boolean. */
export function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** Normalizes an unknown value to an array of validated entries. */
export function normalizeArray<T>(
  value: unknown,
  normalizeEntry: (entry: unknown) => T | undefined
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is T => entry !== undefined);
}
