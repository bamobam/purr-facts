export type FieldResult<T> = { ok: true; value?: T } | { ok: false; error: string };

export function parseStringParam(paramName: string, value: unknown): FieldResult<string> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be provided once` };
  }
  return { ok: true, value };
}

export function parseEnumParam<T extends string>(paramName: string, value: unknown, allowed: readonly T[]): FieldResult<T> {
  const stringResult = parseStringParam(paramName, value);
  if (!stringResult.ok) {
    return stringResult;
  }
  if (stringResult.value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!allowed.includes(stringResult.value as T)) {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be one of ${allowed.join(", ")}` };
  }
  return { ok: true, value: stringResult.value as T };
}

export function parseNumericParam(paramName: string, value: unknown): FieldResult<number> {
  const stringResult = parseStringParam(paramName, value);
  if (!stringResult.ok) {
    return stringResult;
  }
  if (stringResult.value === undefined) {
    return { ok: true, value: undefined };
  }
  if (stringResult.value.trim() === "") {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be a number` };
  }
  const parsed = Number(stringResult.value);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be a number` };
  }
  return { ok: true, value: parsed };
}
