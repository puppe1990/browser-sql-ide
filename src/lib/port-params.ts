type ParsedOptionalPositivePort = {
  value?: number;
  error?: string;
};

export function parseOptionalPositivePort(value: unknown, paramName: string = 'Port'): ParsedOptionalPositivePort {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }
    if (!/^\d+$/.test(trimmed)) {
      return { error: `${paramName} must be a positive integer` };
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return { error: `${paramName} must be a positive integer` };
    }
    return { value: parsed };
  }

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return { error: `${paramName} must be a positive integer` };
    }
    return { value };
  }

  return { error: `${paramName} must be a positive integer` };
}
