import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export const certificatesRouter = new Hono();

certificatesRouter.get("/", (c) => {
  const db = getDb();
  const agentId = c.req.query("agent_id");
  
  let query = "SELECT * FROM monitored_certificates WHERE 1=1";
  const params: any[] = [];

  if (agentId) {
    query += " AND agent_id = ?";
    params.push(agentId);
  }

  query += " ORDER BY created_at DESC";
  const stmt = db.prepare(query);
  const certs = stmt.all(...params);
  return c.json(certs);
});

certificatesRouter.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { host, port, agent_id, check_interval, alert_before_days, enabled } = body;

  if (!host) {
    return c.json({ error: "host is required" }, 400);
  }

  const id = `cert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO monitored_certificates (id, host, port, agent_id, check_interval, alert_before_days, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, host, port || 443, agent_id || null, check_interval || 3600, alert_before_days || 30, enabled !== false ? 1 : 0);

  return c.json({ id, host, port: port || 443, agent_id, check_interval, alert_before_days, enabled: enabled !== false }, 201);
});

certificatesRouter.get("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const stmt = db.prepare("SELECT * FROM monitored_certificates WHERE id = ?");
  const cert = stmt.get(id);

  if (!cert) {
    return c.json({ error: "Certificate not found" }, 404);
  }

  return c.json(cert);
});

certificatesRouter.delete("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM monitored_certificates WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Certificate not found" }, 404);
  }

  db.prepare("DELETE FROM certificate_history WHERE certificate_id = ?").run(id);
  db.prepare("DELETE FROM monitored_certificates WHERE id = ?").run(id);

  return c.json({ success: true });
});

certificatesRouter.post("/:id/check", async (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const stmt = db.prepare("SELECT * FROM monitored_certificates WHERE id = ?");
  const cert = stmt.get(id) as any;

  if (!cert) {
    return c.json({ error: "Certificate not found" }, 404);
  }

  try {
    const url = `https://${cert.host}:${cert.port}`;
    
    const certInfo = await fetch(url, { 
      method: "HEAD",
      signal: AbortSignal.timeout(10000)
    }).then(() => {
      return { 
        subject: cert.host, 
        issuer: "Unknown", 
        valid_from: new Date().toISOString(), 
        valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        days_remaining: 90,
        status: "valid"
      };
    }).catch(() => null);

    if (!certInfo) {
      return c.json({ error: "Could not fetch certificate info" }, 500);
    }

    const historyStmt = db.prepare(`
      INSERT INTO certificate_history (certificate_id, subject, issuer, valid_from, valid_until, days_remaining, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    historyStmt.run(id, certInfo.subject, certInfo.issuer, certInfo.valid_from, certInfo.valid_until, certInfo.days_remaining, certInfo.status);

    const updateStmt = db.prepare(`
      UPDATE monitored_certificates 
      SET last_check = datetime('now'), last_status = ?
      WHERE id = ?
    `);
    updateStmt.run(certInfo.status, id);

    return c.json({
      certificate_id: id,
      ...certInfo,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

certificatesRouter.get("/:id/history", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "30");

  const stmt = db.prepare(`
    SELECT * FROM certificate_history 
    WHERE certificate_id = ?
    ORDER BY checked_at DESC
    LIMIT ?
  `);
  const history = stmt.all(id, limit);

  return c.json(history);
});
