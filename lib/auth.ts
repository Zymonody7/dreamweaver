import { query } from './db';
import crypto from 'crypto';

// Hash password using crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session
export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}

// Get user by session
export async function getUserBySession(sessionId: string) {
  const result = await query(
    `SELECT u.* FROM users u
     JOIN sessions s ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId]
  );

  return result.rows[0] || null;
}

// Delete session
export async function deleteSession(sessionId: string) {
  await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

// Clean expired sessions
export async function cleanExpiredSessions() {
  await query('DELETE FROM sessions WHERE expires_at < NOW()');
}
