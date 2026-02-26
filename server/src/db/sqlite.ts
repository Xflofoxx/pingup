import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../data/pingup.db");

let db: Database | null = null;
const preparedStatements = new Map<string, ReturnType<Database["prepare"]>>();

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
    db.run("PRAGMA cache_size = -64000");
    db.run("PRAGMA temp_store = MEMORY");
    db.run("PRAGMA mmap_size = 268435456");
    initializeIndexes();
  }
  return db;
}

function initializeIndexes(): void {
  if (!db) return;
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_commands_agent ON commands(agent_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
  `);
}

export function getPrepared(sql: string): ReturnType<Database["prepare"]> {
  if (!preparedStatements.has(sql)) {
    const stmt = getDb().prepare(sql);
    preparedStatements.set(sql, stmt);
  }
  return preparedStatements.get(sql)!;
}

export function closeDb(): void {
  if (db) {
    preparedStatements.clear();
    db.close();
    db = null;
  }
}

export interface Agent {
  id: string;
  name: string | null;
  owner_id: string | null;
  status: string;
  last_seen: string | null;
  metadata: string | null;
  created_at: string;
}

export interface Command {
  id: string;
  agent_id: string;
  action: string;
  params: string | null;
  signature: string | null;
  status: string;
  result: string | null;
  created_at: string;
}

export interface Config {
  agent_id: string;
  config: string;
  version: number;
  updated_at: string;
}
