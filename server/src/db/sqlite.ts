import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../data/pingup.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface Agent {
  id: string;
  name: string | null;
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
