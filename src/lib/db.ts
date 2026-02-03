import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'ide.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Connections table
  db.exec(`
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

  const connectionColumns = db
    .prepare("PRAGMA table_info(connections)")
    .all() as Array<{ name: string }>;
  const hasColorColumn = connectionColumns.some((column) => column.name === 'color');
  if (!hasColorColumn) {
    db.exec('ALTER TABLE connections ADD COLUMN color TEXT');
  }

  // Saved queries table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_saved_queries_connection ON saved_queries(connection_id);
    CREATE INDEX IF NOT EXISTS idx_query_history_connection ON query_history(connection_id);
    CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON query_history(executed_at);
  `);
}

// Initialize on import
initializeDatabase();

export default db;
