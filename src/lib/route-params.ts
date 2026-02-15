type ParsedPositiveIntParam = {
  value?: number;
  error?: string;
};

type ParsedOptionalPositiveIntParam = {
  value?: number;
  error?: string;
};

export function parsePositiveIntRouteParam(value: unknown, paramName: string): ParsedPositiveIntParam {
  if (typeof value !== 'string') {
    return { error: `${paramName} must be a positive integer` };
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { error: `${paramName} must be a positive integer` };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { error: `${paramName} must be a positive integer` };
  }

  return { value: parsed };
}

export function parseOptionalPositiveIntParam(
  value: unknown,
  paramName: string
): ParsedOptionalPositiveIntParam {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== 'string') {
    return { error: `${paramName} must be a positive integer` };
  }

  if (!value.trim()) {
    return {};
  }

  return parsePositiveIntRouteParam(value, paramName);
}
