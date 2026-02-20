import { createClient, type Client, type InStatement, type ResultSet, type Row } from '@libsql/client/web';

type DbClient = Client;

let dbInstance: DbClient | null = null;
let dbInitError: Error | null = null;

function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required');
  }

  return { url, authToken };
}

export function formatDatabaseInitError(cause: unknown): string {
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  return `Failed to initialize Turso database: ${causeMessage}`;
}

export async function initializeDatabase(database: DbClient) {
  try {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'postgresql',
        host TEXT NOT NULL,
        port INTEGER,
        database TEXT,
        username TEXT,
        encrypted_password TEXT NOT NULL,
        ssl INTEGER DEFAULT 0,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS saved_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id INTEGER,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        description TEXT,
        folder TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id INTEGER,
        query TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        row_count INTEGER,
        FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await database.batch([
      { sql: `CREATE INDEX IF NOT EXISTS idx_saved_queries_connection ON saved_queries(connection_id)` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_query_history_connection ON query_history(connection_id)` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON query_history(executed_at)` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)` },
      { sql: `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)` },
    ]);
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

async function createDatabase(): Promise<DbClient> {
  const config = getTursoConfig();
  const database = createClient(config);
  await initializeDatabase(database);
  return database;
}

export async function getDb(): Promise<DbClient> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitError) {
    throw dbInitError;
  }

  try {
    dbInstance = await createDatabase();
    return dbInstance;
  } catch (cause) {
    dbInitError = new Error(formatDatabaseInitError(cause));
    dbInitError.name = 'DatabaseInitializationError';
    throw dbInitError;
  }
}

export interface PreparedAsyncStatement {
  all: (...args: unknown[]) => Promise<Row[]>;
  get: (...args: unknown[]) => Promise<Row | undefined>;
  run: (...args: unknown[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>;
}

function prepareStatement(sql: string): PreparedAsyncStatement {
  return {
    async all(...args: unknown[]): Promise<Row[]> {
      const db = await getDb();
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const result = await db.execute({ sql, args: params });
      return result.rows;
    },
    async get(...args: unknown[]): Promise<Row | undefined> {
      const db = await getDb();
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const result = await db.execute({ sql, args: params });
      return result.rows[0];
    },
    async run(...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
      const db = await getDb();
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const result = await db.execute({ sql, args: params });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid ?? 0,
      };
    },
  };
}

async function execAsync(sql: string): Promise<ResultSet> {
  const db = await getDb();
  return db.execute(sql);
}

interface AsyncDatabase {
  prepare: (sql: string) => PreparedAsyncStatement;
  exec: (sql: string) => Promise<ResultSet>;
  execute: (statement: InStatement) => Promise<ResultSet>;
  batch: (statements: InStatement[]) => Promise<ResultSet[]>;
}

const db: AsyncDatabase = {
  prepare: prepareStatement,
  exec: execAsync,
  async execute(statement: InStatement): Promise<ResultSet> {
    const database = await getDb();
    return database.execute(statement);
  },
  async batch(statements: InStatement[]): Promise<ResultSet[]> {
    const database = await getDb();
    return database.batch(statements);
  },
};

export default db;
