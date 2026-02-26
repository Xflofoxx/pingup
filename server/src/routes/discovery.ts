import { Hono } from "hono";
import { getDb } from "../db/duckdb.ts";

export const discoveryRouter = new Hono();

interface DiscoveryHost {
  ip: string;
  latency?: number;
  ports?: number[];
}

interface DiscoveryPayload {
  agentId: string;
  timestamp: string;
  discovery: {
    hosts: DiscoveryHost[];
    duration: number;
  };
  signature: string;
}

discoveryRouter.post("/", async (c) => {
  try {
    const body = await c.req.json() as DiscoveryPayload;
    const { agentId, timestamp, discovery } = body;

    if (!agentId || !discovery || !discovery.hosts) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const db = getDb();
    const scanTimestamp = timestamp || new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO discovery (agent_id, scan_timestamp, host_ip, latency, ports, scan_duration) VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const host of discovery.hosts) {
      stmt.run(agentId, scanTimestamp, host.ip, host.latency || null, JSON.stringify(host.ports || []), discovery.duration);
    }

    return c.json({ success: true, message: "Discovery data stored" }, 201);
  } catch (error) {
    console.error("Error storing discovery data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

discoveryRouter.get("/:agentId", async (c) => {
  try {
    const agentId = c.req.param("agentId");
    const limit = c.req.query("limit") || "100";
    
    const db = getDb();
    const stmt = db.prepare(
      `SELECT scan_timestamp, host_ip, latency, ports, scan_duration 
       FROM discovery 
       WHERE agent_id = ? 
       ORDER BY scan_timestamp DESC 
       LIMIT ?`
    );
    
    const rows = stmt.all(agentId, parseInt(limit)) as any[];
    
    const discovery = rows.map((row) => ({
      timestamp: row.scan_timestamp,
      ip: row.host_ip,
      latency: row.latency,
      ports: JSON.parse(row.ports || "[]"),
      duration: row.scan_duration,
    }));

    return c.json({ agentId, discovery });
  } catch (error) {
    console.error("Error fetching discovery data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

discoveryRouter.get("/:agentId/latest", async (c) => {
  try {
    const agentId = c.req.param("agentId");
    
    const db = getDb();
    const stmt = db.prepare(
      `SELECT scan_timestamp, host_ip, latency, ports, scan_duration 
       FROM discovery 
       WHERE agent_id = ? 
       ORDER BY scan_timestamp DESC 
       LIMIT 1`
    );
    
    const row = stmt.get(agentId) as any;
    
    if (!row) {
      return c.json({ agentId, discovery: null });
    }

    const discovery = {
      timestamp: row.scan_timestamp,
      hosts: [{
        ip: row.host_ip,
        latency: row.latency,
        ports: JSON.parse(row.ports || "[]"),
      }],
      duration: row.scan_duration,
    };

    return c.json({ agentId, discovery });
  } catch (error) {
    console.error("Error fetching latest discovery:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
