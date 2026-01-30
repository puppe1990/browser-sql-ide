import type { Pool, PoolClient } from 'pg';
import type { DatabaseConnection } from '@/lib/database-connectors';

export function removePaginationFromQuery(query: string): string {
  let cleaned = query.replace(/\s+OFFSET\s+\d+/gi, '');
  cleaned = cleaned.replace(/\s+LIMIT\s+\d+/gi, '');
  return cleaned.trim();
}

export function addPaginationToQuery(query: string, offset: number, limit: number): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return query;

  const upperQuery = trimmedQuery.toUpperCase();
  if (!upperQuery.startsWith('SELECT')) {
    return query;
  }

  const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);
  const hasSemicolon = queryWithoutPagination.endsWith(';');
  const queryWithoutSemicolon = hasSemicolon
    ? queryWithoutPagination.slice(0, -1).trim()
    : queryWithoutPagination;

  let paginatedQuery = `${queryWithoutSemicolon} LIMIT ${limit}`;
  if (offset > 0) {
    paginatedQuery += ` OFFSET ${offset}`;
  }

  return hasSemicolon ? `${paginatedQuery};` : paginatedQuery;
}

export async function getTotalCount(
  connect: (connection: DatabaseConnection) => Promise<Pool>,
  connection: DatabaseConnection,
  query: string
): Promise<number> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return 0;

  const upperQuery = trimmedQuery.toUpperCase();
  if (!upperQuery.startsWith('SELECT')) {
    return 0;
  }

  const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);

  try {
    const hasSemicolon = queryWithoutPagination.endsWith(';');
    const queryWithoutSemicolon = hasSemicolon
      ? queryWithoutPagination.slice(0, -1).trim()
      : queryWithoutPagination;
    const countQuery = `SELECT COUNT(*) as total FROM (${queryWithoutSemicolon}) as count_query`;

    const pool = await connect(connection);
    const client: PoolClient = await pool.connect();
    try {
      const result = await client.query(countQuery);
      return parseInt(result.rows[0]?.total || '0', 10);
    } finally {
      client.release();
    }
  } catch {
    return -1;
  }
}
