import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Database } from "bun:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

mkdirSync(DATA_DIR, { recursive: true });

console.log("Running migrations...");

const sqliteDb = new Database(join(DATA_DIR, "pingup.db"));
sqliteDb.run("PRAGMA journal_mode = WAL");

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    action TEXT,
    params TEXT,
    signature TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    agent_id TEXT PRIMARY KEY,
    config TEXT,
    version INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    timestamp TEXT,
    cpu REAL,
    ram REAL,
    disk REAL,
    latency INTEGER,
    status TEXT
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS discovery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    scan_timestamp TEXT,
    host_ip TEXT,
    latency INTEGER,
    ports TEXT,
    scan_duration INTEGER
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_commands_agent ON commands(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_agent ON metrics(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);

console.log("SQLite migration complete");
console.log("All migrations complete!");
