import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export interface AlertThreshold {
  id: string;
  name: string;
  metric: string;
  operator: string;
  value: number;
  level: string;
  enabled: number;
  agent_id: string | null;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertNotification {
  id: string;
  channel: string;
  config: string;
  enabled: number;
  threshold_id: string;
  created_at: string;
}

export interface AlertHistory {
  id: number;
  threshold_id: string;
  agent_id: string;
  metric: string;
  value: number;
  threshold_value: number;
  level: string;
  triggered_at: string;
}

const METRICS = ["cpu", "ram", "disk", "latency"];
const OPERATORS = ["above", "below", "equals"];
const LEVELS = ["warning", "critical"];

export const alertsRouter = new Hono();

alertsRouter.get("/thresholds", (c) => {
  const db = getDb();
  const agentId = c.req.query("agent_id");
  const groupId = c.req.query("group_id");

  let query = "SELECT * FROM alert_thresholds WHERE 1=1";
  const params: any[] = [];

  if (agentId) {
    query += " AND (agent_id = ? OR agent_id IS NULL)";
    params.push(agentId);
  }
  if (groupId) {
    query += " AND (group_id = ? OR group_id IS NULL)";
    params.push(groupId);
  }

  query += " ORDER BY created_at DESC";
  const stmt = db.prepare(query);
  const thresholds = stmt.all(...params);
  return c.json(thresholds);
});

alertsRouter.post("/thresholds", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { name, metric, operator, value, level, enabled, agent_id, group_id } = body;

  if (!name || !metric || !operator || value === undefined) {
    return c.json({ error: "name, metric, operator, and value are required" }, 400);
  }

  if (!METRICS.includes(metric)) {
    return c.json({ error: `metric must be one of: ${METRICS.join(", ")}` }, 400);
  }
  if (!OPERATORS.includes(operator)) {
    return c.json({ error: `operator must be one of: ${OPERATORS.join(", ")}` }, 400);
  }
  if (level && !LEVELS.includes(level)) {
    return c.json({ error: `level must be one of: ${LEVELS.join(", ")}` }, 400);
  }

  const id = `thr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO alert_thresholds (id, name, metric, operator, value, level, enabled, agent_id, group_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, metric, operator, value, level || "warning", enabled !== false ? 1 : 0, agent_id || null, group_id || null);

  return c.json({ id, name, metric, operator, value, level: level || "warning", enabled: enabled !== false }, 201);
});

alertsRouter.put("/thresholds/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, metric, operator, value, level, enabled, agent_id, group_id } = body;

  const existing = db.prepare("SELECT id FROM alert_thresholds WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Threshold not found" }, 404);
  }

  const stmt = db.prepare(`
    UPDATE alert_thresholds 
    SET name = ?, metric = ?, operator = ?, value = ?, level = ?, enabled = ?, 
        agent_id = ?, group_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(name, metric, operator, value, level, enabled !== false ? 1 : 0, agent_id || null, group_id || null, id);

  return c.json({ id });
});

alertsRouter.delete("/thresholds/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM alert_thresholds WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Threshold not found" }, 404);
  }

  db.prepare("DELETE FROM alert_notifications WHERE threshold_id = ?").run(id);
  db.prepare("DELETE FROM alert_thresholds WHERE id = ?").run(id);

  return c.json({ success: true });
});

function evaluateThreshold(threshold: AlertThreshold, metrics: any): boolean {
  if (!threshold.enabled) return false;
  
  const metricValue = metrics[threshold.metric];
  if (metricValue === undefined || metricValue === null) return false;

  switch (threshold.operator) {
    case "above":
      return metricValue > threshold.value;
    case "below":
      return metricValue < threshold.value;
    case "equals":
      return metricValue === threshold.value;
    default:
      return false;
  }
}

export function checkAlerts(agentId: string, metrics: any): AlertHistory[] {
  const db = getDb();
  const triggered: AlertHistory[] = [];

  const thresholds = db.prepare(`
    SELECT * FROM alert_thresholds 
    WHERE enabled = 1 AND (agent_id = ? OR (agent_id IS NULL AND group_id IS NULL))
  `).all(agentId) as AlertThreshold[];

  for (const threshold of thresholds) {
    if (evaluateThreshold(threshold, metrics)) {
      const insertStmt = db.prepare(`
        INSERT INTO alert_history (threshold_id, agent_id, metric, value, threshold_value, level, triggered_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      insertStmt.run(threshold.id, agentId, threshold.metric, metrics[threshold.metric], threshold.value, threshold.level);

      triggered.push({
        id: 0,
        threshold_id: threshold.id,
        agent_id: agentId,
        metric: threshold.metric,
        value: metrics[threshold.metric],
        threshold_value: threshold.value,
        level: threshold.level,
        triggered_at: new Date().toISOString()
      });
    }
  }

  return triggered;
}

alertsRouter.get("/history", (c) => {
  const db = getDb();
  const agentId = c.req.query("agent_id");
  const limit = parseInt(c.req.query("limit") || "100");

  let query = "SELECT ah.*, at.name as threshold_name, at.metric FROM alert_history ah JOIN alert_thresholds at ON ah.threshold_id = at.id";
  const params: any[] = [];

  if (agentId) {
    query += " WHERE ah.agent_id = ?";
    params.push(agentId);
  }

  query += " ORDER BY ah.triggered_at DESC LIMIT ?";
  params.push(limit);

  const stmt = db.prepare(query);
  const history = stmt.all(...params);
  return c.json(history);
});

alertsRouter.get("/notifications", (c) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM alert_notifications ORDER BY created_at DESC");
  const notifications = stmt.all();
  return c.json(notifications);
});

alertsRouter.post("/notifications", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { channel, config, enabled, threshold_id } = body;

  if (!channel || !config) {
    return c.json({ error: "channel and config are required" }, 400);
  }

  const id = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO alert_notifications (id, channel, config, enabled, threshold_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, channel, JSON.stringify(config), enabled !== false ? 1 : 0, threshold_id || null);

  return c.json({ id, channel, config, enabled: enabled !== false }, 201);
});

alertsRouter.delete("/notifications/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM alert_notifications WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Notification not found" }, 404);
  }

  db.prepare("DELETE FROM alert_notifications WHERE id = ?").run(id);
  return c.json({ success: true });
});
