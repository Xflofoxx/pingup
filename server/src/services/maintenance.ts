import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface MaintenanceWindow {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  recurrence: "once" | "daily" | "weekly" | "monthly";
  enabled: boolean;
  agent_ids: string[];
  created_at: string;
}

export function createMaintenanceWindow(
  name: string,
  description: string,
  startTime: string,
  endTime: string,
  recurrence: "once" | "daily" | "weekly" | "monthly" = "once",
  agentIds: string[] = []
): MaintenanceWindow {
  const db = getDb();
  
  const id = `maint_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  
  db.prepare(`
    INSERT INTO maintenance_windows (id, name, description, start_time, end_time, recurrence, enabled, agent_ids, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
  `).run(id, name, description, startTime, endTime, recurrence, JSON.stringify(agentIds));
  
  logger.info(`Maintenance window created: ${name}`);
  
  return {
    id,
    name,
    description,
    start_time: startTime,
    end_time: endTime,
    recurrence,
    enabled: true,
    agent_ids: agentIds,
    created_at: new Date().toISOString(),
  };
}

export function listMaintenanceWindows(): MaintenanceWindow[] {
  const db = getDb();
  
  const windows = db.prepare(`
    SELECT * FROM maintenance_windows ORDER BY start_time ASC
  `).all() as any[];
  
  return windows.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    start_time: w.start_time,
    end_time: w.end_time,
    recurrence: w.recurrence,
    enabled: !!w.enabled,
    agent_ids: w.agent_ids ? JSON.parse(w.agent_ids) : [],
    created_at: w.created_at,
  }));
}

export function getMaintenanceWindow(id: string): MaintenanceWindow | null {
  const db = getDb();
  
  const window = db.prepare(`
    SELECT * FROM maintenance_windows WHERE id = ?
  `).get(id) as any;
  
  if (!window) return null;
  
  return {
    id: window.id,
    name: window.name,
    description: window.description,
    start_time: window.start_time,
    end_time: window.end_time,
    recurrence: window.recurrence,
    enabled: !!window.enabled,
    agent_ids: window.agent_ids ? JSON.parse(window.agent_ids) : [],
    created_at: window.created_at,
  };
}

export function updateMaintenanceWindow(
  id: string,
  updates: Partial<Omit<MaintenanceWindow, "id" | "created_at">>
): boolean {
  const db = getDb();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.start_time !== undefined) {
    fields.push("start_time = ?");
    values.push(updates.start_time);
  }
  if (updates.end_time !== undefined) {
    fields.push("end_time = ?");
    values.push(updates.end_time);
  }
  if (updates.recurrence !== undefined) {
    fields.push("recurrence = ?");
    values.push(updates.recurrence);
  }
  if (updates.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(updates.enabled ? 1 : 0);
  }
  if (updates.agent_ids !== undefined) {
    fields.push("agent_ids = ?");
    values.push(JSON.stringify(updates.agent_ids));
  }
  
  if (fields.length === 0) return false;
  
  values.push(id);
  
  const result = db.prepare(`
    UPDATE maintenance_windows SET ${fields.join(", ")} WHERE id = ?
  `).run(...values);
  
  return result.changes > 0;
}

export function deleteMaintenanceWindow(id: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM maintenance_windows WHERE id = ?
  `).run(id);
  
  logger.info(`Maintenance window deleted: ${id}`);
  
  return result.changes > 0;
}

export function isInMaintenanceWindow(agentId?: string): { inMaintenance: boolean; window: MaintenanceWindow | null } {
  const windows = listMaintenanceWindows().filter(w => w.enabled);
  
  const now = new Date();
  
  for (const window of windows) {
    const start = new Date(window.start_time);
    const end = new Date(window.end_time);
    
    if (now >= start && now <= end) {
      if (window.agent_ids.length === 0 || window.agent_ids.includes(agentId || "")) {
        return { inMaintenance: true, window };
      }
    }
  }
  
  return { inMaintenance: false, window: null };
}
