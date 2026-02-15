const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return undefined;
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed)) return undefined;
    return parsed;
  }

  return undefined;
}

export function parsePaginationOffset(value: unknown): {
  value?: number;
  error?: string;
} {
  if (value === undefined || value === null) {
    return { value: 0 };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { value: 0 };
  }

  const parsed = parseInteger(value);
  if (parsed === undefined || parsed < 0) {
    return { error: 'Offset must be a non-negative integer' };
  }

  return { value: parsed };
}

export function parsePaginationLimit(
  value: unknown,
  defaultValue: number = DEFAULT_LIMIT
): { value?: number; error?: string } {
  if (value === undefined || value === null) {
    return { value: defaultValue };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { value: defaultValue };
  }

  const parsed = parseInteger(value);
  if (parsed === undefined || parsed <= 0) {
    return { error: 'Limit must be a positive integer' };
  }

  return { value: Math.min(parsed, MAX_LIMIT) };
}
