import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export const processesRouter = new Hono();

processesRouter.get("/watch", (c) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM watched_processes ORDER BY created_at DESC");
  const processes = stmt.all();
  return c.json(processes);
});

processesRouter.post("/watch", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { agent_id, process_name, alert_on_stop, alert_on_high_cpu, alert_on_high_memory, enabled } = body;

  if (!agent_id || !process_name) {
    return c.json({ error: "agent_id and process_name are required" }, 400);
  }

  const id = `wproc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO watched_processes (id, agent_id, process_name, alert_on_stop, alert_on_high_cpu, alert_on_high_memory, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, agent_id, process_name, alert_on_stop !== false ? 1 : 0, alert_on_high_cpu || null, alert_on_high_memory || null, enabled !== false ? 1 : 0);

  return c.json({ id, agent_id, process_name, alert_on_stop, alert_on_high_cpu, alert_on_high_memory, enabled: enabled !== false }, 201);
});

processesRouter.delete("/watch/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM watched_processes WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Watch not found" }, 404);
  }

  db.prepare("DELETE FROM watched_processes WHERE id = ?").run(id);
  return c.json({ success: true });
});

processesRouter.get("/history/:agentId", (c) => {
  const db = getDb();
  const agentId = c.req.param("agentId");
  const limit = parseInt(c.req.query("limit") || "100");

  const watched = db.prepare("SELECT * FROM watched_processes WHERE agent_id = ?").all(agentId);
  
  return c.json({
    agent_id: agentId,
    watched_processes: watched,
    limit
  });
});

export const servicesRouter = new Hono();

servicesRouter.get("/watch", (c) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM watched_services ORDER BY created_at DESC");
  const services = stmt.all();
  return c.json(services);
});

servicesRouter.post("/watch", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { agent_id, service_name, alert_on_stop, enabled } = body;

  if (!agent_id || !service_name) {
    return c.json({ error: "agent_id and service_name are required" }, 400);
  }

  const id = `wsvc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO watched_services (id, agent_id, service_name, alert_on_stop, enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, agent_id, service_name, alert_on_stop !== false ? 1 : 0, enabled !== false ? 1 : 0);

  return c.json({ id, agent_id, service_name, alert_on_stop, enabled: enabled !== false }, 201);
});

servicesRouter.delete("/watch/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM watched_services WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Watch not found" }, 404);
  }

  db.prepare("DELETE FROM watched_services WHERE id = ?").run(id);
  return c.json({ success: true });
});
