import { getDb } from "../db/sqlite.ts";

export interface User {
  id: string;
  username: string;
  role: "PUB" | "IT" | "SUP" | "ADM";
  totp_secret: string | null;
  password_hash: string | null;
  created_at: string;
  last_login: string | null;
  status: "active" | "disabled";
  metadata: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  timestamp: string;
}

const ROLE_HIERARCHY: Record<string, number> = {
  ADM: 4,
  SUP: 3,
  IT: 2,
  PUB: 1,
};

export function hasRole(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function simpleHash(password: string, salt: string): string {
  let hash = 0;
  const combined = password + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let result = hash.toString(16);
  for (let i = 0; i < 10; i++) {
    result += result.charAt(Math.floor(Math.random() * result.length));
  }
  return result;
}

export function hashPassword(password: string): string {
  const salt = Math.random().toString(36).substring(2, 15);
  return salt + ":" + simpleHash(password, salt);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash || !hash.includes(":")) return false;
  const [salt] = hash.split(":");
  const computed = simpleHash(password, salt);
  return hash === salt + ":" + computed;
}

export function createUser(username: string, role: string, totpSecret?: string, passwordHash?: string): User {
  const db = getDb();
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  
  const stmt = db.prepare(`
    INSERT INTO users (id, username, role, totp_secret, password_hash, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  
  stmt.run(id, username, role, totpSecret || null, passwordHash || null);
  
  logAudit(null, "user_create", "user", `Created user: ${username} with role: ${role}`);
  
  return getUserById(id)!;
}

export function setUserPassword(userId: string, passwordHash: string): boolean {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
  const result = stmt.run(passwordHash, userId);
  return result.changes > 0;
}

export function getUserById(id: string): User | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const result = stmt.get(id) as User | null;
  return result ?? undefined;
}

export function getUserByUsername(username: string): User | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  const result = stmt.get(username) as User | null;
  return result ?? undefined;
}

export function listUsers(): User[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
  return stmt.all() as User[];
}

export function updateUserRole(id: string, role: string): boolean {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
  const result = stmt.run(role, id);
  
  if (result.changes > 0) {
    logAudit(null, "user_update", "user", `Updated user ${id} role to ${role}`);
    return true;
  }
  return false;
}

export function setUserStatus(id: string, status: "active" | "disabled"): boolean {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  
  if (result.changes > 0) {
    logAudit(null, "user_status", "user", `Set user ${id} status to ${status}`);
    return true;
  }
  return false;
}

export function deleteUser(id: string): boolean {
  const db = getDb();
  const user = getUserById(id);
  
  if (!user) return false;
  
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  const result = stmt.run(id);
  
  if (result.changes > 0) {
    logAudit(null, "user_delete", "user", `Deleted user: ${user.username}`);
    return true;
  }
  return false;
}

export function updateLastLogin(id: string): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?");
  stmt.run(id);
}

export function createSession(userId: string, ipAddress?: string, userAgent?: string): Session {
  const db = getDb();
  const id = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, userId, expiresAt, ipAddress || null, userAgent || null);
  
  return {
    id,
    user_id: userId,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  };
}

export function getSession(id: string): Session | undefined {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE id = ? AND expires_at > datetime('now')
  `);
  const result = stmt.get(id) as Session | null;
  return result ?? undefined;
}

export function deleteSession(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(id);
}

export function deleteUserSessions(userId: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
  stmt.run(userId);
}

export function logAudit(userId: string | null, action: string, resource?: string, details?: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO audit_log (user_id, action, resource, details)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, action, resource || null, details || null);
}

export function getAuditLog(limit: number = 100): AuditLog[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM audit_log 
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  return stmt.all(limit) as AuditLog[];
}

export function getUserAuditLog(userId: string, limit: number = 50): AuditLog[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM audit_log 
    WHERE user_id = ?
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  return stmt.all(userId, limit) as AuditLog[];
}
