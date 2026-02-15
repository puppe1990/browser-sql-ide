export function parseStrictPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return undefined;
    }
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
