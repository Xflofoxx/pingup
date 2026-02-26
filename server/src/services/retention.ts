import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface RetentionPolicy {
  id: string;
  name: string;
  data_type: "metrics" | "discovery" | "alerts" | "audit" | "commands";
  retention_days: number;
  enabled: boolean;
  created_at: string;
}

const DEFAULT_POLICIES: Omit<RetentionPolicy, "id" | "created_at">[] = [
  { name: "Metrics (1 year)", data_type: "metrics", retention_days: 365, enabled: true },
  { name: "Discovery (90 days)", data_type: "discovery", retention_days: 90, enabled: true },
  { name: "Alerts (180 days)", data_type: "alerts", retention_days: 180, enabled: true },
  { name: "Audit Log (1 year)", data_type: "audit", retention_days: 365, enabled: true },
  { name: "Commands (30 days)", data_type: "commands", retention_days: 30, enabled: true },
];

export function initializeDefaultPolicies(): void {
  const db = getDb();
  
  const existing = db.prepare("SELECT COUNT(*) as count FROM retention_policies").get() as { count: number };
  
  if (existing.count === 0) {
    for (const policy of DEFAULT_POLICIES) {
      const id = `ret_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
      
      db.prepare(`
        INSERT INTO retention_policies (id, name, data_type, retention_days, enabled, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(id, policy.name, policy.data_type, policy.retention_days, policy.enabled ? 1 : 0);
    }
    
    logger.info("Default retention policies initialized");
  }
}

export function listRetentionPolicies(): RetentionPolicy[] {
  const db = getDb();
  
  const policies = db.prepare(`
    SELECT * FROM retention_policies ORDER BY data_type ASC
  `).all() as any[];
  
  return policies.map(p => ({
    id: p.id,
    name: p.name,
    data_type: p.data_type,
    retention_days: p.retention_days,
    enabled: !!p.enabled,
    created_at: p.created_at,
  }));
}

export function updateRetentionPolicy(id: string, updates: Partial<RetentionPolicy>): boolean {
  const db = getDb();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.retention_days !== undefined) {
    fields.push("retention_days = ?");
    values.push(updates.retention_days);
  }
  if (updates.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(updates.enabled ? 1 : 0);
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  
  const result = db.prepare(`
    UPDATE retention_policies SET ${fields.join(", ")} WHERE id = ?
  `).run(...values);
  
  return result.changes > 0;
}

export function applyRetentionPolicies(): { deleted: Record<string, number> } => {
  const db = getDb();
  const policies = listRetentionPolicies().filter(p => p.enabled);
  
  const deleted: Record<string, number> = {};
  
  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
    const cutoffStr = cutoffDate.toISOString();
    
    let result: { changes: number };
    
    switch (policy.data_type) {
      case "metrics":
        result = db.prepare(`
          DELETE FROM metrics WHERE timestamp < ?
        `).run(cutoffStr);
        break;
      case "discovery":
        result = db.prepare(`
          DELETE FROM discovery WHERE scan_timestamp < ?
        `).run(cutoffStr);
        break;
      case "alerts":
        result = db.prepare(`
          DELETE FROM alert_history WHERE triggered_at < ?
        `).run(cutoffStr);
        break;
      case "audit":
        result = db.prepare(`
          DELETE FROM audit_log WHERE timestamp < ?
        `).run(cutoffStr);
        break;
      case "commands":
        result = db.prepare(`
          DELETE FROM commands WHERE created_at < ?
        `).run(cutoffStr);
        break;
      default:
        continue;
    }
    
    if (result.changes > 0) {
      deleted[policy.data_type] = result.changes;
    }
  }
  
  if (Object.keys(deleted).length > 0) {
    logger.info(`Retention applied: ${JSON.stringify(deleted)}`);
  }
  
  return { deleted };
}
