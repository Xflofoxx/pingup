import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export const bandwidthRouter = new Hono();

bandwidthRouter.get("/:agentId", (c) => {
  const db = getDb();
  const agentId = c.req.param("agentId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limit = parseInt(c.req.query("limit") || "100");

  let query = "SELECT * FROM bandwidth_metrics WHERE agent_id = ?";
  const params: any[] = [agentId];

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
  const metrics = stmt.all(...params);

  const latestStmt = db.prepare(`
    SELECT * FROM bandwidth_metrics 
    WHERE agent_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 1
  `);
  const latest = latestStmt.get(agentId);

  const totalStmt = db.prepare(`
    SELECT 
      SUM(bytes_sent) as total_sent,
      SUM(bytes_recv) as total_recv,
      SUM(packets_sent) as total_packets_sent,
      SUM(packets_recv) as total_packets_recv
    FROM bandwidth_metrics 
    WHERE agent_id = ?
  `);
  const totals = totalStmt.get(agentId);

  return c.json({
    agent_id: agentId,
    latest,
    totals,
    history: metrics
  });
});

bandwidthRouter.get("/:agentId/interfaces", (c) => {
  const db = getDb();
  const agentId = c.req.param("agentId");

  const stmt = db.prepare(`
    SELECT DISTINCT interface_name 
    FROM bandwidth_metrics 
    WHERE agent_id = ?
  `);
  const interfaces = stmt.all(agentId);

  return c.json({
    agent_id: agentId,
    interfaces: interfaces.map((i: any) => i.interface_name)
  });
});

bandwidthRouter.get("/:agentId/history", (c) => {
  const db = getDb();
  const agentId = c.req.param("agentId");
  const interval = c.req.query("interval") || "hour";

  let timeFilter = "1 hour";
  if (interval === "day") timeFilter = "24 hours";
  if (interval === "week") timeFilter = "7 days";

  const stmt = db.prepare(`
    SELECT 
      strftime('%Y-%m-%d %H:00:00', timestamp) as time_bucket,
      AVG(bytes_sent) as avg_bytes_sent,
      AVG(bytes_recv) as avg_bytes_recv,
      MAX(bytes_sent) as max_bytes_sent,
      MAX(bytes_recv) as max_bytes_recv
    FROM bandwidth_metrics 
    WHERE agent_id = ? AND timestamp >= datetime('now', '-${timeFilter}')
    GROUP BY time_bucket
    ORDER BY time_bucket DESC
  `);
  const history = stmt.all(agentId);

  return c.json({
    agent_id: agentId,
    interval,
    history
  });
});

bandwidthRouter.post("/:agentId", async (c) => {
  const db = getDb();
  const agentId = c.req.param("agentId");
  const body = await c.req.json();
  const { interface_name, bytes_sent, bytes_recv, packets_sent, packets_recv } = body;

  if (!interface_name) {
    return c.json({ error: "interface_name is required" }, 400);
  }

  const stmt = db.prepare(`
    INSERT INTO bandwidth_metrics (agent_id, interface_name, bytes_sent, bytes_recv, packets_sent, packets_recv)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    agentId, 
    interface_name, 
    bytes_sent || 0, 
    bytes_recv || 0, 
    packets_sent || 0, 
    packets_recv || 0
  );

  return c.json({ success: true });
});
