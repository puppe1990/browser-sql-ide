import { Pool, PoolClient } from 'pg';
import { createClient, type Client as TursoClient } from '@libsql/client';
import Database from 'better-sqlite3';
import type { QueryResult, RowData } from '@/types';
import { getErrorMessage } from '@/lib/utils';
import {
  addPaginationToQuery,
  getTotalCount,
  isRowReturningQuery,
  parseQueryTotalCount,
  removePaginationFromQuery,
} from '@/lib/database-connectors/pagination';
import {
  resolveConnectionDatabasePath,
  sqliteFileExists,
} from '@/lib/sqlite-files';

export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mssql' | 'turso';

export interface DatabaseConnection {
  id?: number;
  name: string;
  type: DatabaseType | string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

class DatabaseConnector {
  private pools: Map<number, Pool> = new Map();
  private sqliteDatabases: Map<number, { db: Database.Database; databasePath: string }> = new Map();
  private tursoClients: Map<number, { client: TursoClient; url: string; authToken: string }> = new Map();

  async connect(connection: DatabaseConnection): Promise<Pool> {
    if (connection.type !== 'postgresql') {
      throw new Error(`Unsupported pool connection type: ${connection.type}`);
    }

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
    if (connection.type === 'sqlite') {
      return this.executeSqliteQuery(connection, query, offset, limit);
    }
    if (connection.type === 'turso') {
      return this.executeTursoQuery(connection, query, offset, limit);
    }

    const startTime = Date.now();
    const pool = await this.connect(connection);

    const client: PoolClient = await pool.connect();
    try {
      // For SELECT queries, apply pagination if limit is specified
      let queryToExecute = query;
      let totalCount: number | undefined = undefined;
      let hasMore = false;

      if (isRowReturningQuery(query) && limit !== undefined) {
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

  async testConnection(connection: DatabaseConnection): Promise<void> {
    if (connection.type === 'sqlite') {
      const db = this.getSqliteDatabase(connection);
      db.prepare('SELECT 1').get();
      return;
    }
    if (connection.type === 'turso') {
      const client = this.getTursoClient(connection);
      await client.execute('SELECT 1');
      if (!connection.id) {
        await this.closeTursoClient(client);
      }
      return;
    }

    const pool = await this.connect(connection);
    const client = await pool.connect();
    client.release();

    if (!connection.id) {
      await pool.end();
    }
  }

  private getSqliteDatabase(connection: DatabaseConnection): Database.Database {
    if (!connection.database) {
      throw new Error('SQLite database file path is required');
    }

    if (!sqliteFileExists(connection.database)) {
      throw new Error('SQLite database file not found');
    }

    const resolvedPath = resolveConnectionDatabasePath(connection.database);

    if (connection.id && this.sqliteDatabases.has(connection.id)) {
      const cached = this.sqliteDatabases.get(connection.id)!;
      if (cached.databasePath === resolvedPath) {
        return cached.db;
      }

      // Reopen when the backing file changes for the same connection id.
      cached.db.close();
      this.sqliteDatabases.delete(connection.id);
    }

    const db = new Database(resolvedPath, {
      readonly: false,
      fileMustExist: true,
    });

    if (connection.id) {
      this.sqliteDatabases.set(connection.id, { db, databasePath: resolvedPath });
    }

    return db;
  }

  private executeSqliteQuery(
    connection: DatabaseConnection,
    query: string,
    offset: number = 0,
    limit?: number
  ): QueryResult {
    const startTime = Date.now();
    const db = this.getSqliteDatabase(connection);
    const trimmedQuery = query.trim();
    let queryToExecute = query;
    let totalCount: number | undefined = undefined;
    let hasMore = false;

    if (isRowReturningQuery(trimmedQuery) && limit !== undefined) {
      const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);
      const queryWithoutSemicolon = queryWithoutPagination.endsWith(';')
        ? queryWithoutPagination.slice(0, -1).trim()
        : queryWithoutPagination;
      const countQuery = `SELECT COUNT(*) as total FROM (${queryWithoutSemicolon}) as count_query`;
      const totalRow = db.prepare(countQuery).get() as { total?: number } | undefined;
      const parsedCount = parseQueryTotalCount(totalRow?.total);
      totalCount = parsedCount ?? 0;

      queryToExecute = addPaginationToQuery(query, offset, limit);
      hasMore = offset + limit < totalCount;
    }

    try {
      const statement = db.prepare(queryToExecute);

      if (statement.reader) {
        const rows = statement.all() as RowData[];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        const executionTime = Date.now() - startTime;

        return {
          columns,
          rows,
          rowCount: rows.length,
          totalCount,
          executionTime,
          hasMore,
        };
      }

      const runResult = statement.run();
      const executionTime = Date.now() - startTime;
      return {
        columns: [],
        rows: [],
        rowCount: runResult.changes,
        executionTime,
      };
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'Query execution failed');
    }
  }

  private getTursoClient(connection: DatabaseConnection): TursoClient {
    if (!connection.host) {
      throw new Error('Turso URL is required');
    }
    if (!connection.password) {
      throw new Error('Turso auth token is required');
    }

    if (connection.id && this.tursoClients.has(connection.id)) {
      const cached = this.tursoClients.get(connection.id)!;
      if (cached.url === connection.host && cached.authToken === connection.password) {
        return cached.client;
      }

      this.closeTursoClient(cached.client);
      this.tursoClients.delete(connection.id);
    }

    const client = createClient({
      url: connection.host,
      authToken: connection.password,
    });

    if (connection.id) {
      this.tursoClients.set(connection.id, {
        client,
        url: connection.host,
        authToken: connection.password,
      });
    }

    return client;
  }

  private async executeTursoQuery(
    connection: DatabaseConnection,
    query: string,
    offset: number = 0,
    limit?: number
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const client = this.getTursoClient(connection);
    const trimmedQuery = query.trim();
    let queryToExecute = query;
    let totalCount: number | undefined = undefined;
    let hasMore = false;

    if (isRowReturningQuery(trimmedQuery) && limit !== undefined) {
      const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);
      const queryWithoutSemicolon = queryWithoutPagination.endsWith(';')
        ? queryWithoutPagination.slice(0, -1).trim()
        : queryWithoutPagination;
      const countQuery = `SELECT COUNT(*) as total FROM (${queryWithoutSemicolon}) as count_query`;
      const countResult = await client.execute(countQuery);
      const totalValue = countResult.rows[0]?.[0] ?? countResult.rows[0]?.total;
      const parsedCount = parseQueryTotalCount(totalValue);
      totalCount = parsedCount ?? 0;

      queryToExecute = addPaginationToQuery(query, offset, limit);
      hasMore = offset + limit < totalCount;
    }

    try {
      const result = await client.execute(queryToExecute);
      const columns = result.columns ?? [];
      const rows = result.rows.map((row) => {
        const mapped: RowData = {};
        columns.forEach((column, index) => {
          mapped[column] = row[index] ?? row[column];
        });
        return mapped;
      });
      const executionTime = Date.now() - startTime;

      if (columns.length > 0) {
        return {
          columns,
          rows,
          rowCount: rows.length,
          totalCount,
          executionTime,
          hasMore,
        };
      }

      return {
        columns: [],
        rows: [],
        rowCount: result.rowsAffected ?? 0,
        executionTime,
      };
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error) || 'Query execution failed');
    } finally {
      if (!connection.id) {
        await this.closeTursoClient(client);
      }
    }
  }

  private async closeTursoClient(client: TursoClient): Promise<void> {
    const closeable = client as TursoClient & { close?: () => void | Promise<void> };
    if (typeof closeable.close === 'function') {
      await closeable.close();
    }
  }

  async disconnect(connectionId: number): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.end();
      this.pools.delete(connectionId);
    }

    const sqliteDb = this.sqliteDatabases.get(connectionId);
    if (sqliteDb) {
      sqliteDb.db.close();
      this.sqliteDatabases.delete(connectionId);
    }

    const tursoClient = this.tursoClients.get(connectionId);
    if (tursoClient) {
      await this.closeTursoClient(tursoClient.client);
      this.tursoClients.delete(connectionId);
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((pool) => pool.end());
    await Promise.all(promises);
    this.pools.clear();

    for (const sqliteDb of this.sqliteDatabases.values()) {
      sqliteDb.db.close();
    }
    this.sqliteDatabases.clear();

    for (const tursoClient of this.tursoClients.values()) {
      await this.closeTursoClient(tursoClient.client);
    }
    this.tursoClients.clear();
  }
}

export const dbConnector = new DatabaseConnector();
