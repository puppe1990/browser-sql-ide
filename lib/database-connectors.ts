import { Pool, PoolClient } from 'pg';

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

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
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
    query: string
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const pool = await this.connect(connection);

    try {
      const client: PoolClient = await pool.connect();
      const result = await client.query(query);
      client.release();

      const executionTime = Date.now() - startTime;

      return {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Query execution failed');
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
