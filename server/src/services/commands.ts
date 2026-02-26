import { getDb, Command } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface CreateCommandInput {
  id: string;
  agent_id: string;
  action: string;
  params?: Record<string, any>;
  signature?: string;
}

export function createCommand(input: CreateCommandInput): Command {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO commands (id, agent_id, action, params, signature)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    input.id,
    input.agent_id,
    input.action,
    input.params ? JSON.stringify(input.params) : null,
    input.signature || null
  );
  
  logger.info(`Command created: ${input.id} for agent ${input.agent_id}`);
  return getCommand(input.id)!;
}

export function getCommand(id: string): Command | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM commands WHERE id = ?");
  const result = stmt.get(id) as Command | null;
  return result ?? undefined;
}

export function listCommands(agentId?: string, status?: string): Command[] {
  const db = getDb();
  let query = "SELECT * FROM commands WHERE 1=1";
  const params: string[] = [];
  
  if (agentId) {
    query += " AND agent_id = ?";
    params.push(agentId);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  
  query += " ORDER BY created_at DESC";
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as Command[];
}

export function getPendingCommands(agentId: string): Command[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM commands 
    WHERE agent_id = ? AND status = 'pending'
    ORDER BY created_at ASC
  `);
  return stmt.all(agentId) as Command[];
}

export function updateCommandResult(
  id: string,
  result: Record<string, any>,
  status: string = "completed"
): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE commands 
    SET result = ?, status = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(result), status, id);
  logger.info(`Command ${id} updated: ${status}`);
}
