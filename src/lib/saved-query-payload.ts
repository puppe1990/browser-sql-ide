export type SavedQueryUpdatePayload = {
  name?: string;
  query?: string;
  description?: string | null;
  folder?: string | null;
};

export type SavedQueryCreatePayload = {
  connectionId?: number | null;
  name: string;
  query: string;
  description?: string | null;
  folder?: string | null;
};

type ParsedSavedQueryUpdatePayload = SavedQueryUpdatePayload & {
  error?: undefined;
} | {
  error: string;
};

type ParsedSavedQueryCreatePayload = SavedQueryCreatePayload & {
  error?: undefined;
} | {
  error: string;
};

function parseName(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function parseQuery(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function parseNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  return value.trim() || null;
}

function parseOptionalConnectionId(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function parseSavedQueryUpdatePayload(payload: Record<string, unknown>): ParsedSavedQueryUpdatePayload {
  const parsed: SavedQueryUpdatePayload = {};

  if (payload.name !== undefined) {
    const name = parseName(payload.name);
    if (!name) {
      return { error: 'Name must be a non-empty string' };
    }
    parsed.name = name;
  }

  if (payload.query !== undefined) {
    const query = parseQuery(payload.query);
    if (!query) {
      return { error: 'Query must be a non-empty string' };
    }
    parsed.query = query;
  }

  if (payload.description !== undefined) {
    const description = parseNullableString(payload.description);
    if (description === undefined) {
      return { error: 'Description must be a string or null' };
    }
    parsed.description = description;
  }

  if (payload.folder !== undefined) {
    const folder = parseNullableString(payload.folder);
    if (folder === undefined) {
      return { error: 'Folder must be a string or null' };
    }
    parsed.folder = folder;
  }

  return parsed;
}

export function parseSavedQueryCreatePayload(payload: Record<string, unknown>): ParsedSavedQueryCreatePayload {
  const name = parseName(payload.name);
  if (!name) {
    return { error: 'Name and query are required' };
  }

  const query = parseQuery(payload.query);
  if (!query) {
    return { error: 'Name and query are required' };
  }

  const connectionId = parseOptionalConnectionId(payload.connectionId);
  if (payload.connectionId !== undefined && connectionId === undefined) {
    return { error: 'Connection ID must be a positive integer when provided' };
  }

  const description = parseNullableString(payload.description);
  if (description === undefined && payload.description !== undefined) {
    return { error: 'Description must be a string or null' };
  }

  const folder = parseNullableString(payload.folder);
  if (folder === undefined && payload.folder !== undefined) {
    return { error: 'Folder must be a string or null' };
  }

  return {
    connectionId,
    name,
    query,
    description,
    folder,
  };
}
