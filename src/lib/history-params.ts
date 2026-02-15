export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 1000;

type ParsedHistoryLimit = {
  value?: number;
  error?: string;
};

export function parseHistoryLimitParam(value: unknown): ParsedHistoryLimit {
  if (value === undefined || value === null) {
    return { value: DEFAULT_HISTORY_LIMIT };
  }

  if (typeof value !== 'string') {
    return { error: 'Limit must be a positive integer' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value: DEFAULT_HISTORY_LIMIT };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { error: 'Limit must be a positive integer' };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { error: 'Limit must be a positive integer' };
  }

  return { value: Math.min(parsed, MAX_HISTORY_LIMIT) };
}
