export type ParsedJsonBody<T> = {
  value?: T;
  error?: string;
  status?: number;
};

export async function parseJsonBody<T>(request: { json: () => Promise<unknown> }): Promise<ParsedJsonBody<T>> {
  try {
    const value = (await request.json()) as T;
    return { value };
  } catch {
    return {
      error: 'Invalid JSON body',
      status: 400,
    };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function parseJsonObjectBody<T extends Record<string, unknown>>(
  request: { json: () => Promise<unknown> }
): Promise<ParsedJsonBody<T>> {
  const parsed = await parseJsonBody<unknown>(request);
  if (parsed.error) {
    return {
      error: parsed.error,
      status: parsed.status,
    };
  }

  if (!isPlainObject(parsed.value)) {
    return {
      error: 'JSON body must be an object',
      status: 400,
    };
  }

  return { value: parsed.value as T };
}
