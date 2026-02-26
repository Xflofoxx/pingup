import { getDb } from "../db/sqlite.ts";
import { insertMetrics, queryMetrics, MetricRecord } from "../db/duckdb.ts";
import { getOrCreateAgent } from "./agent.ts";
import { logger } from "../utils/logger.ts";

export interface MetricsPayload {
  agentId: string;
  timestamp: string;
  metrics: {
    cpu: number;
    ram: number;
    disk: number;
    latency: number;
  };
  status: string;
  signature?: string;
}

export function processMetrics(payload: MetricsPayload): void {
  const agent = getOrCreateAgent(payload.agentId);
  
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE agents 
    SET status = ?, last_seen = ?
    WHERE id = ?
  `);
  stmt.run(payload.status, payload.timestamp, payload.agentId);
  
  const metricRecord: MetricRecord = {
    agent_id: payload.agentId,
    timestamp: payload.timestamp,
    cpu: payload.metrics.cpu,
    ram: payload.metrics.ram,
    disk: payload.metrics.disk,
    latency: payload.metrics.latency,
    status: payload.status,
  };
  
  try {
    insertMetrics([metricRecord]);
    logger.debug(`Metrics stored for ${payload.agentId}`);
  } catch (err) {
    logger.error(`Failed to store metrics: ${err}`);
  }
}

export function getAgentMetrics(
  agentId: string,
  from?: string,
  to?: string
): MetricRecord[] {
  return queryMetrics(agentId, from, to);
}
