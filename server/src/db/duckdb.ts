import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../data/pingup.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
  }
  return db;
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
  const db = getAnalyticsDb();
  const stmt = db.prepare(`
    INSERT INTO metrics (agent_id, timestamp, cpu, ram, disk, latency, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `);

  for (const m of metrics) {
    stmt.run(m.agent_id, m.timestamp, m.cpu, m.ram, m.disk, m.latency, m.status);
  }
}

export function queryMetrics(
  agentId: string,
  from?: string,
  to?: string
): MetricRecord[] {
  const db = getAnalyticsDb();
  
  let query = "SELECT * FROM metrics WHERE agent_id = ?";
  const params: string[] = [agentId];
  
  if (from) {
    query += " AND timestamp >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND timestamp <= ?";
    params.push(to);
  }
  
  query += " ORDER BY timestamp DESC LIMIT 1000";
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as MetricRecord[];
}

export function getAggregatedMetrics(
  agentId: string,
  _interval: string = "1 hour"
): MetricRecord[] {
  const db = getAnalyticsDb();
  
  const stmt = db.prepare(`
    SELECT 
      timestamp as bucket,
      avg(cpu) as avg_cpu,
      avg(ram) as avg_ram,
      avg(disk) as avg_disk,
      avg(latency) as avg_latency,
      count(*) as samples
    FROM metrics 
    WHERE agent_id = ?
    GROUP BY bucket 
    ORDER BY bucket DESC 
    LIMIT 24
  `);
  
  return stmt.all(agentId) as MetricRecord[];
}
