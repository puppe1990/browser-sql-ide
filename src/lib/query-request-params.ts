import { parseStrictPositiveInt } from './strict-positive-int.ts';

export type ParsedQueryRequest = {
  connectionId?: number;
  query?: string;
  error?: string;
};

export function parseConnectionAndQueryPayload(payload: unknown): ParsedQueryRequest {
  if (typeof payload !== 'object' || payload === null) {
    return { error: 'Connection ID and query are required' };
  }

  const { connectionId, query } = payload as { connectionId?: unknown; query?: unknown };

  if (connectionId === undefined || connectionId === null || query === undefined || query === null) {
    return { error: 'Connection ID and query are required' };
  }

  const parsedConnectionId = parseStrictPositiveInt(connectionId);
  if (parsedConnectionId === undefined) {
    return { error: 'Connection ID must be a positive integer' };
  }

  if (typeof query !== 'string') {
    return { error: 'Query must be a string' };
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { error: 'Connection ID and query are required' };
  }

  return {
    connectionId: parsedConnectionId,
    query: normalizedQuery,
  };
}
