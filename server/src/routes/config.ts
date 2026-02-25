import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export const configRouter = new Hono();

configRouter.get("/:agentId", (c) => {
  const agentId = c.req.param("agentId");
  const db = getDb();
  
  const stmt = db.prepare("SELECT * FROM configs WHERE agent_id = $1");
  const config = stmt.get(agentId);
  
  if (!config) {
    return c.json({ 
      config: {
        server_url: "http://localhost:3000",
        poll_interval: 30,
        network_timeout: 3,
        modules_enabled: ["cpu", "ram", "disk", "network"],
        log_level: "INFO"
      }
    });
  }
  
  return c.json({ config: JSON.parse((config as any).config) });
});

configRouter.post("/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  const body = await c.req.json();
  
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO configs (agent_id, config, version, updated_at)
    VALUES ($1, $2, 1, datetime('now'))
    ON CONFLICT(agent_id) DO UPDATE SET
      config = $2,
      version = version + 1,
      updated_at = datetime('now')
  `);
  
  stmt.run(agentId, JSON.stringify(body.config));
  
  return c.json({ success: true });
});
