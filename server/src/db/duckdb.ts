import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../data/analytics.duckdb");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
    db.run("PRAGMA cache_size = -128000");
    initializeTables();
    initializeIndexes();
  }
  return db;
}

function initializeTables(): void {
  if (!db) return;
  
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      agent_id TEXT NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      cpu REAL,
      ram REAL,
      disk REAL,
      latency INTEGER,
      status TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS discovery (
      agent_id TEXT NOT NULL,
      scan_timestamp TIMESTAMP NOT NULL,
      host_ip TEXT,
      latency INTEGER,
      ports TEXT,
      scan_duration INTEGER
    )
  `);
}

function initializeIndexes(): void {
  if (!db) return;
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_agent ON metrics(agent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_discovery_agent ON discovery(agent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_discovery_timestamp ON discovery(scan_timestamp)`);
}

export function getAnalyticsDb(): Database {
  return getDb();
}

export function closeAnalyticsDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface MetricRecord {
  agent_id: string;
  timestamp: string;
  cpu: number;
  ram: number;
  disk: number;
  latency: number;
  status: string;
}

export function insertMetrics(metrics: MetricRecord[]): void {
  if (metrics.length === 0) return;
  
  const db = getAnalyticsDb();
  
  const stmt = db.prepare(`
    INSERT INTO metrics (agent_id, timestamp, cpu, ram, disk, latency, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `);

  const insertMany = db.transaction((items: MetricRecord[]) => {
    for (const m of items) {
      stmt.run(m.agent_id, m.timestamp, m.cpu, m.ram, m.disk, m.latency, m.status);
    }
  });
  
  insertMany(metrics);
}

export function queryMetrics(
  agentId: string,
  from?: string,
  to?: string,
  limit: number = 1000
): MetricRecord[] {
  const db = getAnalyticsDb();
  
  let query = "SELECT * FROM metrics WHERE agent_id = ?";
  const params: (string | number)[] = [agentId];
  
  if (from) {
    query += " AND timestamp >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND timestamp <= ?";
    params.push(to);
  }
  
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(limit);
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as MetricRecord[];
}

export function getAggregatedMetrics(
  agentId: string,
  interval: string = "1 hour"
): { bucket: string; avg_cpu: number; avg_ram: number; avg_disk: number; avg_latency: number; samples: number }[] {
  const db = getAnalyticsDb();
  
  const stmt = db.prepare(`
    SELECT 
      strftime('%Y-%m-%d %H:00:00', timestamp) as bucket,
      avg(cpu) as avg_cpu,
      avg(ram) as avg_ram,
      avg(disk) as avg_disk,
      avg(latency) as avg_latency,
      count(*) as samples
    FROM metrics 
    WHERE agent_id = ? AND timestamp >= datetime('now', '-24 hours')
    GROUP BY bucket 
    ORDER BY bucket DESC 
    LIMIT 24
  `);
  
  return stmt.all(agentId) as { bucket: string; avg_cpu: number; avg_ram: number; avg_disk: number; avg_latency: number; samples: number }[];
}

export function getDeviceCount(): number {
  const db = getAnalyticsDb();
  const stmt = db.prepare("SELECT COUNT(DISTINCT agent_id) as count FROM metrics WHERE timestamp >= datetime('now', '-1 hour')");
  const result = stmt.get() as { count: number };
  return result?.count ?? 0;
}
