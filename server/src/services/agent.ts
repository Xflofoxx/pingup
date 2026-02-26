import { getDb, Agent } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface CreateAgentInput {
  id: string;
  name?: string;
  owner_id?: string;
  metadata?: Record<string, any>;
}

export function createAgent(input: CreateAgentInput): Agent {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO agents (id, name, owner_id, metadata)
    VALUES ($1, $2, $3, $4)
  `);
  
  stmt.run(
    input.id,
    input.name || null,
    input.owner_id || null,
    input.metadata ? JSON.stringify(input.metadata) : null
  );
  
  logger.info(`Agent created: ${input.id}`);
  return getAgent(input.id)!;
}

export function getAgent(id: string): Agent | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM agents WHERE id = ?");
  const result = stmt.get(id) as Agent | null;
  return result ?? undefined;
}

export function listAgents(status?: string): Agent[] {
  const db = getDb();
  if (status) {
    const stmt = db.prepare("SELECT * FROM agents WHERE status = ? ORDER BY last_seen DESC");
    return stmt.all(status) as Agent[];
  }
  const stmt = db.prepare("SELECT * FROM agents ORDER BY last_seen DESC");
  return stmt.all() as Agent[];
}

export function updateAgentStatus(id: string, status: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE agents 
    SET status = $1, last_seen = datetime('now')
    WHERE id = $2
  `);
  stmt.run(status, id);
}

export function deleteAgent(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM agents WHERE id = $1");
  const result = stmt.run(id);
  logger.info(`Agent deleted: ${id}`);
  return result.changes > 0;
}

export function getOrCreateAgent(id: string, name?: string): Agent {
  const existing = getAgent(id);
  if (existing) {
    updateAgentStatus(id, "online");
    return existing;
  }
  return createAgent({ id, name });
}

export function setAgentOwner(agentId: string, ownerId: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE agents SET owner_id = $1 WHERE id = $2
  `);
  const result = stmt.run(ownerId, agentId);
  return result.changes > 0;
}

export function verifyAgentAccess(agentId: string, userId: string): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;
  return agent.owner_id === userId;
}

export function updateAgentOwner(agentId: string, ownerId: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE agents SET owner_id = $1, updated_at = datetime('now') WHERE id = $2
  `);
  const result = stmt.run(ownerId, agentId);
  return result.changes > 0;
}
