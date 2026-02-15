export function parsePortInputValue(rawValue: string, fallbackPort: number): number {
  const trimmed = rawValue.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return fallbackPort;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallbackPort;
  }

  return parsed ?? fallbackPort;
}
