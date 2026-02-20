import fs from 'fs';
import os from 'os';
import path from 'path';

const RUNNING_ON_NETLIFY = Boolean(process.env.NETLIFY);
const SQLITE_UPLOAD_DIR = RUNNING_ON_NETLIFY
  ? path.join(os.tmpdir(), 'browser-sql-ide', 'sqlite')
  : path.join(process.cwd(), 'data', 'sqlite');

export function supportsPersistentSqliteStorage(): boolean {
  return !RUNNING_ON_NETLIFY;
}

function ensureUploadDir() {
  if (!fs.existsSync(SQLITE_UPLOAD_DIR)) {
    fs.mkdirSync(SQLITE_UPLOAD_DIR, { recursive: true });
  }
}

function getFileExtension(fileName: string): string {
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
    return ext;
  }
  return '.db';
}

export async function saveUploadedSqliteFile(file: File): Promise<string> {
  ensureUploadDir();

  const ext = getFileExtension(file.name);
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const absolutePath = path.join(SQLITE_UPLOAD_DIR, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());

  fs.writeFileSync(absolutePath, buffer);

  if (RUNNING_ON_NETLIFY) {
    return absolutePath;
  }

  return path.relative(process.cwd(), absolutePath);
}

export function resolveConnectionDatabasePath(databasePath: string): string {
  if (!databasePath) return '';
  if (path.isAbsolute(databasePath)) {
    return databasePath;
  }
  return path.join(process.cwd(), databasePath);
}

export function deleteSqliteFileIfManaged(databasePath: string) {
  if (!databasePath) return;

  const absolutePath = resolveConnectionDatabasePath(databasePath);
  const managedRoot = path.resolve(SQLITE_UPLOAD_DIR);
  const resolvedFile = path.resolve(absolutePath);

  if (!resolvedFile.startsWith(managedRoot)) {
    return;
  }

  if (fs.existsSync(resolvedFile)) {
    fs.unlinkSync(resolvedFile);
  }
}

export function sqliteFileExists(databasePath: string): boolean {
  if (!databasePath) return false;
  const absolutePath = resolveConnectionDatabasePath(databasePath);
  return fs.existsSync(absolutePath);
}
