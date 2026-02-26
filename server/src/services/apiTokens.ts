import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";
import { randomBytes } from "crypto";

export interface APIToken {
  id: string;
  name: string;
  token_prefix: string;
  scope: "read" | "write" | "admin";
  expires_at: string | null;
  created_at: string;
  last_used: string | null;
  user_id: string;
}

export function createAPIToken(
  name: string,
  userId: string,
  scope: "read" | "write" | "admin" = "read",
  expiresInDays?: number
): { token: string; apiToken: APIToken } {
  const db = getDb();
  
  const token = `pktk_${randomBytes(32).toString("hex")}`;
  const tokenPrefix = token.substring(0, 12) + "...";
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const id = `api_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  
  db.prepare(`
    INSERT INTO api_tokens (id, name, token_hash, token_prefix, scope, expires_at, created_at, user_id)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).run(id, name, token, tokenPrefix, scope, expiresAt, userId);
  
  logger.info(`API token created: ${name}`);
  
  return {
    token,
    apiToken: {
      id,
      name,
      token_prefix: tokenPrefix,
      scope,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      last_used: null,
      user_id: userId,
    },
  };
}

export function verifyAPIToken(token: string): { valid: boolean; scope?: string; userId?: string } {
  if (!token || !token.startsWith("pktk_")) {
    return { valid: false };
  }
  
  const db = getDb();
  
  const tokens = db.prepare(`
    SELECT * FROM api_tokens WHERE token_hash = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).all(token) as any[];
  
  if (tokens.length === 0) {
    return { valid: false };
  }
  
  const apiToken = tokens[0];
  
  db.prepare(`
    UPDATE api_tokens SET last_used = datetime('now') WHERE id = ?
  `).run(apiToken.id);
  
  return { valid: true, scope: apiToken.scope, userId: apiToken.user_id };
}

export function listAPITokens(userId: string): APIToken[] {
  const db = getDb();
  
  const tokens = db.prepare(`
    SELECT id, name, token_prefix, scope, expires_at, created_at, last_used, user_id
    FROM api_tokens WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as APIToken[];
  
  return tokens;
}

export function revokeAPIToken(tokenId: string, userId: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM api_tokens WHERE id = ? AND user_id = ?
  `).run(tokenId, userId);
  
  logger.info(`API token revoked: ${tokenId}`);
  
  return result.changes > 0;
}

export function cleanExpiredTokens(): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM api_tokens WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
  `).run();
  
  if (result.changes > 0) {
    logger.info(`Cleaned ${result.changes} expired API tokens`);
  }
  
  return result.changes;
}
