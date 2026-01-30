import { Pool, PoolClient } from 'pg';
import type { QueryResult, RowData } from '@/types';
import { getErrorMessage } from '@/lib/utils';
import { addPaginationToQuery, getTotalCount } from '@/lib/database-connectors/pagination';

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

  async executeQuery(
    connection: DatabaseConnection,
    query: string,
    offset: number = 0,
    limit?: number
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const pool = await this.connect(connection);

    const client: PoolClient = await pool.connect();
    try {
      // For SELECT queries, apply pagination if limit is specified
      let queryToExecute = query;
      let totalCount: number | undefined = undefined;
      let hasMore = false;

      const upperQuery = query.trim().toUpperCase();
      if (upperQuery.startsWith('SELECT') && limit !== undefined) {
        // Get total count before pagination
        totalCount = await getTotalCount(this.connect.bind(this), connection, query);

        // Apply pagination
        queryToExecute = addPaginationToQuery(query, offset, limit);

        // Determine if there are more rows
        if (totalCount >= 0) {
          hasMore = offset + limit < totalCount;
        }
      }

      const result = await client.query(queryToExecute);

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
    } finally {
      client.release();
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
