import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export const customMetricsRouter = new Hono();

customMetricsRouter.get("/", (c) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM custom_metrics ORDER BY name");
  const metrics = stmt.all();
  return c.json(metrics);
});

customMetricsRouter.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { name, type, unit, description, aggregation } = body;

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const validTypes = ["gauge", "counter", "histogram"];
  const validAggregations = ["avg", "sum", "min", "max"];

  if (type && !validTypes.includes(type)) {
    return c.json({ error: `type must be one of: ${validTypes.join(", ")}` }, 400);
  }

  if (aggregation && !validAggregations.includes(aggregation)) {
    return c.json({ error: `aggregation must be one of: ${validAggregations.join(", ")}` }, 400);
  }

  const existing = db.prepare("SELECT id FROM custom_metrics WHERE name = ?").get(name);
  if (existing) {
    return c.json({ error: "Metric already exists" }, 400);
  }

  const id = `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO custom_metrics (id, name, type, unit, description, aggregation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, type || "gauge", unit || null, description || null, aggregation || "avg");

  return c.json({ id, name, type: type || "gauge", unit, description, aggregation: aggregation || "avg" }, 201);
});

customMetricsRouter.delete("/:name", (c) => {
  const db = getDb();
  const name = c.req.param("name");

  const existing = db.prepare("SELECT id FROM custom_metrics WHERE name = ?").get(name);
  if (!existing) {
    return c.json({ error: "Metric not found" }, 404);
  }

  db.prepare("DELETE FROM custom_metrics_data WHERE metric_id = ?").run((existing as any).id);
  db.prepare("DELETE FROM custom_metrics WHERE name = ?").run(name);

  return c.json({ success: true });
});

customMetricsRouter.post("/:name", async (c) => {
  const db = getDb();
  const name = c.req.param("name");
  const body = await c.req.json();
  const { agent_id, value, timestamp } = body;

  const metric = db.prepare("SELECT id FROM custom_metrics WHERE name = ?").get(name) as any;
  if (!metric) {
    return c.json({ error: "Metric not found" }, 404);
  }

  if (agent_id === undefined || value === undefined) {
    return c.json({ error: "agent_id and value are required" }, 400);
  }

  const stmt = db.prepare(`
    INSERT INTO custom_metrics_data (metric_id, agent_id, value, timestamp)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(metric.id, agent_id, value, timestamp || new Date().toISOString());

  return c.json({ success: true });
});

customMetricsRouter.get("/:name/:agentId", (c) => {
  const db = getDb();
  const name = c.req.param("name");
  const agentId = c.req.param("agentId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limit = parseInt(c.req.query("limit") || "100");

  const metric = db.prepare("SELECT id, name, type, unit, aggregation FROM custom_metrics WHERE name = ?").get(name) as any;
  if (!metric) {
    return c.json({ error: "Metric not found" }, 404);
  }

  let query = "SELECT * FROM custom_metrics_data WHERE metric_id = ? AND agent_id = ?";
  const params: any[] = [metric.id, agentId];

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
  const data = stmt.all(...params);

  const avgStmt = db.prepare(`
    SELECT AVG(value) as avg, MIN(value) as min, MAX(value) as max, COUNT(*) as count
    FROM custom_metrics_data 
    WHERE metric_id = ? AND agent_id = ?
  `);
  const stats = avgStmt.get(metric.id, agentId);

  return c.json({
    metric: metric,
    agent_id: agentId,
    stats,
    data
  });
});
