import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';

type BetterSqliteDatabase = import('better-sqlite3').Database;
type BetterSqliteModule = typeof import('better-sqlite3');
const require = createRequire(import.meta.url);

const dbPath = path.join(process.cwd(), 'data', 'ide.db');
const dbDir = path.dirname(dbPath);
let dbInstance: BetterSqliteDatabase | null = null;
let dbInitError: Error | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

function loadBetterSqlite3(): BetterSqliteModule {
  return require('better-sqlite3') as BetterSqliteModule;
}

export function formatDatabaseInitError(cause: unknown): string {
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  const isNodeModuleVersionMismatch = causeMessage.includes('NODE_MODULE_VERSION');

  if (!isNodeModuleVersionMismatch) {
    return `Failed to initialize database: ${causeMessage}`;
  }

  return [
    'Failed to initialize database: better-sqlite3 native binding is compiled for a different Node.js version.',
    'Rebuild dependencies for the active Node version (for example: npm rebuild better-sqlite3).',
    `Original error: ${causeMessage}`,
  ].join(' ');
}

// Initialize database schema
export function initializeDatabase(database: BetterSqliteDatabase) {
  // Connections table
  database.exec(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'postgresql',
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      database TEXT NOT NULL,
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      ssl BOOLEAN DEFAULT 0,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const connectionColumns = database
    .prepare("PRAGMA table_info(connections)")
    .all() as Array<{ name: string }>;
  const hasColorColumn = connectionColumns.some((column) => column.name === 'color');
  if (!hasColorColumn) {
    database.exec('ALTER TABLE connections ADD COLUMN color TEXT');
  }

  // Saved queries table
  database.exec(`
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

  // Query history table
  database.exec(`
    CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER,
      query TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      execution_time INTEGER,
      success BOOLEAN DEFAULT 1,
      error_message TEXT,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_saved_queries_connection ON saved_queries(connection_id);
    CREATE INDEX IF NOT EXISTS idx_query_history_connection ON query_history(connection_id);
    CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON query_history(executed_at);
  `);
}

function createDatabase(): BetterSqliteDatabase {
  ensureDataDirectory();
  const Database = loadBetterSqlite3();
  const database = new Database(dbPath) as BetterSqliteDatabase;
  database.pragma('foreign_keys = ON');
  initializeDatabase(database);
  return database;
}

export function getDb(): BetterSqliteDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitError) {
    throw dbInitError;
  }

  try {
    dbInstance = createDatabase();
    return dbInstance;
  } catch (cause) {
    dbInitError = new Error(formatDatabaseInitError(cause));
    dbInitError.name = 'DatabaseInitializationError';
    throw dbInitError;
  }
}

const db = new Proxy({} as BetterSqliteDatabase, {
  get(_target, prop) {
    const instance = getDb();
    const properties = instance as unknown as Record<PropertyKey, unknown>;
    const value = properties[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export default db;
