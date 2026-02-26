import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";
import { getAgentMetrics } from "../services/metrics.ts";
import { listAgents } from "../services/agent.ts";

export interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  schedule: string;
  format: string;
  recipients: string | null;
  enabled: number;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
  updated_at: string;
}

export const reportsRouter = new Hono();

reportsRouter.get("/", (c) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM scheduled_reports ORDER BY created_at DESC");
  const reports = stmt.all();
  return c.json(reports);
});

reportsRouter.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { name, type, schedule, format, recipients, enabled } = body;

  if (!name || !type || !schedule) {
    return c.json({ error: "name, type, and schedule are required" }, 400);
  }

  const validTypes = ["daily", "weekly", "monthly", "custom"];
  if (!validTypes.includes(type)) {
    return c.json({ error: `type must be one of: ${validTypes.join(", ")}` }, 400);
  }

  const id = `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const nextRun = calculateNextRun(type, schedule);

  const stmt = db.prepare(`
    INSERT INTO scheduled_reports (id, name, type, schedule, format, recipients, enabled, next_run)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, type, schedule, format || "json", recipients || null, enabled !== false ? 1 : 0, nextRun);

  return c.json({ id, name, type, schedule, format, recipients, enabled: enabled !== false, next_run: nextRun }, 201);
});

reportsRouter.get("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const stmt = db.prepare("SELECT * FROM scheduled_reports WHERE id = ?");
  const report = stmt.get(id) as ScheduledReport | null;

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  return c.json(report);
});

reportsRouter.put("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, type, schedule, format, recipients, enabled } = body;

  const existing = db.prepare("SELECT id FROM scheduled_reports WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Report not found" }, 404);
  }

  const nextRun = calculateNextRun(type || "daily", schedule || "0 0 * * *");

  const stmt = db.prepare(`
    UPDATE scheduled_reports 
    SET name = ?, type = ?, schedule = ?, format = ?, recipients = ?, enabled = ?, 
        updated_at = datetime('now'), next_run = ?
    WHERE id = ?
  `);
  stmt.run(name, type, schedule, format || "json", recipients || null, enabled !== false ? 1 : 0, nextRun, id);

  return c.json({ success: true });
});

reportsRouter.delete("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM scheduled_reports WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Report not found" }, 404);
  }

  db.prepare("DELETE FROM scheduled_reports WHERE id = ?").run(id);
  return c.json({ success: true });
});

reportsRouter.post("/:id/run", async (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const stmt = db.prepare("SELECT * FROM scheduled_reports WHERE id = ?");
  const report = stmt.get(id) as ScheduledReport | null;

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  const reportData = await generateReport(report);
  db.prepare("UPDATE scheduled_reports SET last_run = datetime('now') WHERE id = ?").run(id);

  return c.json(reportData);
});

reportsRouter.get("/:id/download", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const format = c.req.query("format") || "json";

  const stmt = db.prepare("SELECT * FROM scheduled_reports WHERE id = ?");
  const report = stmt.get(id) as ScheduledReport | null;

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  return c.json({ message: "Use POST /:id/run to generate report first" });
});

function calculateNextRun(type: string, schedule: string): string {
  const now = new Date();
  let next = new Date(now);

  switch (type) {
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
    case "custom":
      return schedule;
  }

  return next.toISOString();
}

async function generateReport(report: ScheduledReport): Promise<any> {
  const agents = listAgents();
  const db = getDb();

  const metricsPromises = agents.slice(0, 10).map(async (agent) => {
    const metrics = getAgentMetrics(agent.id, undefined, undefined);
    const avgCpu = metrics.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + (m.cpu || 0), 0) / metrics.length
      : 0;
    const avgRam = metrics.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + (m.ram || 0), 0) / metrics.length
      : 0;

    return {
      agent_id: agent.id,
      agent_name: agent.name,
      avg_cpu: Math.round(avgCpu * 10) / 10,
      avg_ram: Math.round(avgRam * 10) / 10,
      status: agent.status,
    };
  });

  const agentMetrics = await Promise.all(metricsPromises);

  const alertsStmt = db.prepare(`
    SELECT COUNT(*) as count, level FROM alert_history 
    WHERE triggered_at >= datetime('now', '-7 days')
    GROUP BY level
  `);
  const alertStats = alertsStmt.all();

  return {
    report_id: report.id,
    name: report.name,
    type: report.type,
    generated_at: new Date().toISOString(),
    summary: {
      total_agents: agents.length,
      online_agents: agents.filter((a: any) => a.status === "online").length,
      offline_agents: agents.filter((a: any) => a.status === "offline").length,
    },
    agent_metrics: agentMetrics,
    alert_stats: alertStats,
  };
}
