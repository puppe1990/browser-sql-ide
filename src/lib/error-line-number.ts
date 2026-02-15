const ERROR_LINE_PATTERN = /line\s+(\d+)|position\s+(\d+)|at\s+line\s+(\d+)/i;

export function parseErrorLineNumber(errorMessage: string): number | null {
  const match = errorMessage.match(ERROR_LINE_PATTERN);
  if (!match) {
    return null;
  }

  const rawLine = match[1] || match[2] || match[3];
  if (!rawLine || !/^\d+$/.test(rawLine)) {
    return null;
  }

  const parsed = Number(rawLine);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
