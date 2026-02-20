import db from './db';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type SessionRow = {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createUser(email: string, password: string, name?: string) {
  const passwordHash = hashPassword(password);
  const result = await db
    .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email, passwordHash, name ?? null);
  return Number(result.lastInsertRowid);
}

export async function getUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export async function getUserById(id: number) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sessionId, userId, expiresAt);
  return sessionId;
}

export async function getSession(sessionId: string) {
  const session = await db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
    .get(sessionId);
  return session;
}

export async function deleteSession(sessionId: string) {
  await db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export async function cleanExpiredSessions() {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= datetime("now")').run();
}

export async function getSessionUser(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const sessionRow = session as unknown as SessionRow;
  const user = await getUserById(sessionRow.user_id);
  if (!user) return null;
  return user;
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_MS };
