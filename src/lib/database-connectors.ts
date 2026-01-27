import { Pool, PoolClient } from 'pg';
import type { QueryResult, RowData } from '@/types';
import { getErrorMessage } from '@/lib/utils';

export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mssql';

export interface DatabaseConnection {
  id?: number;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

class DatabaseConnector {
  private pools: Map<number, Pool> = new Map();

  async connect(connection: DatabaseConnection): Promise<Pool> {
    if (connection.id && this.pools.has(connection.id)) {
      return this.pools.get(connection.id)!;
    }

    let pool: Pool;

    switch (connection.type) {
      case 'postgresql':
        pool = new Pool({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password: connection.password,
          ssl: connection.ssl ? { rejectUnauthorized: false } : false,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        break;
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }

    // Test connection
    try {
      const client = await pool.connect();
      client.release();
    } catch (error) {
      pool.end();
      throw error;
    }

    if (connection.id) {
      this.pools.set(connection.id, pool);
    }

    return pool;
  }

  /**
   * Remove existing LIMIT and OFFSET clauses from a query
   */
  private removePaginationFromQuery(query: string): string {
    // Remove OFFSET ... first (it comes after LIMIT)
    let cleaned = query.replace(/\s+OFFSET\s+\d+/gi, '');
    // Remove LIMIT ...
    cleaned = cleaned.replace(/\s+LIMIT\s+\d+/gi, '');
    return cleaned.trim();
  }

  /**
   * Add LIMIT and OFFSET to a SELECT query
   * Removes any existing LIMIT/OFFSET first to ensure correct pagination
   */
  private addPaginationToQuery(query: string, offset: number, limit: number): string {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return query;

    const upperQuery = trimmedQuery.toUpperCase();
    
    // Only process SELECT queries
    if (!upperQuery.startsWith('SELECT')) {
      return query;
    }

    // Remove any existing LIMIT/OFFSET
    const queryWithoutPagination = this.removePaginationFromQuery(trimmedQuery);
    
    // Add new LIMIT and OFFSET
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

  /**
   * Get total count for a SELECT query (for pagination)
   * Removes any existing LIMIT/OFFSET to get the true count
   */
  private async getTotalCount(
    connection: DatabaseConnection,
    query: string
  ): Promise<number> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return 0;

    const upperQuery = trimmedQuery.toUpperCase();
    if (!upperQuery.startsWith('SELECT')) {
      return 0;
    }

    // Remove any existing LIMIT/OFFSET to get the true count
    const queryWithoutPagination = this.removePaginationFromQuery(trimmedQuery);
    
    try {
      const hasSemicolon = queryWithoutPagination.endsWith(';');
      const queryWithoutSemicolon = hasSemicolon 
        ? queryWithoutPagination.slice(0, -1).trim() 
        : queryWithoutPagination;
      const countQuery = `SELECT COUNT(*) as total FROM (${queryWithoutSemicolon}) as count_query`;
      
      const pool = await this.connect(connection);
      const client: PoolClient = await pool.connect();
      const result = await client.query(countQuery);
      client.release();
      return parseInt(result.rows[0]?.total || '0', 10);
    } catch {
      // If count query fails, return -1 to indicate unknown
      return -1;
    }
  }

  async executeQuery(
    connection: DatabaseConnection,
    query: string,
    offset: number = 0,
    limit?: number
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const pool = await this.connect(connection);

    try {
      const client: PoolClient = await pool.connect();
      
      // For SELECT queries, apply pagination if limit is specified
      let queryToExecute = query;
      let totalCount: number | undefined = undefined;
      let hasMore = false;
      
      const upperQuery = query.trim().toUpperCase();
      if (upperQuery.startsWith('SELECT') && limit !== undefined) {
        // Get total count before pagination
        totalCount = await this.getTotalCount(connection, query);
        
        // Apply pagination
        queryToExecute = this.addPaginationToQuery(query, offset, limit);
        
        // Determine if there are more rows
        if (totalCount >= 0) {
          hasMore = offset + limit < totalCount;
        }
      }
      
      const result = await client.query(queryToExecute);
      client.release();

      const executionTime = Date.now() - startTime;

      // Handle case where result.fields might be undefined (e.g., multiple queries or non-SELECT queries)
      const columns = result.fields && result.fields.length > 0
        ? result.fields.map((field) => field.name)
        : result.rows && result.rows.length > 0
        ? Object.keys(result.rows[0] as RowData)
        : [];

      return {
        columns,
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        totalCount,
        executionTime,
        hasMore,
      };
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'Query execution failed');
    }
  }

  async disconnect(connectionId: number): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.end();
      this.pools.delete(connectionId);
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((pool) => pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}

export const dbConnector = new DatabaseConnector();
