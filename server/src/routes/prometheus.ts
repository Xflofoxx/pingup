import { Hono } from "hono";
import { listAgents } from "../services/agent.ts";
import { getDb } from "../db/sqlite.ts";

export const prometheusRouter = new Hono();

prometheusRouter.get("/", (c) => {
  const db = getDb();
  const agents = listAgents();
  
  const stmt = db.prepare(`
    SELECT agent_id, 
           AVG(cpu) as cpu, 
           AVG(ram) as ram, 
           AVG(disk) as disk, 
           AVG(latency) as latency
    FROM metrics 
    WHERE timestamp >= datetime('now', '-1 hour')
    GROUP BY agent_id
  `);
  const avgMetrics = stmt.all();

  const agentMap = new Map(agents.map((a: any) => [a.id, a]));
  const lines: string[] = [];

  lines.push("# HELP pingup_cpu CPU usage percentage");
  lines.push("# TYPE pingup_cpu gauge");
  
  for (const m of avgMetrics as any[]) {
    const agent = agentMap.get(m.agent_id);
    const labels = `agent_id="${m.agent_id}",agent_name="${agent?.name || 'unknown'}"`;
    lines.push(`pingup_cpu{${labels}} ${m.cpu || 0}`);
  }

  lines.push("");
  lines.push("# HELP pingup_ram RAM usage percentage");
  lines.push("# TYPE pingup_ram gauge");

  for (const m of avgMetrics as any[]) {
    const agent = agentMap.get(m.agent_id);
    const labels = `agent_id="${m.agent_id}",agent_name="${agent?.name || 'unknown'}"`;
    lines.push(`pingup_ram{${labels}} ${m.ram || 0}`);
  }

  lines.push("");
  lines.push("# HELP pingup_disk Disk usage percentage");
  lines.push("# TYPE pingup_disk gauge");

  for (const m of avgMetrics as any[]) {
    const agent = agentMap.get(m.agent_id);
    const labels = `agent_id="${m.agent_id}",agent_name="${agent?.name || 'unknown'}"`;
    lines.push(`pingup_disk{${labels}} ${m.disk || 0}`);
  }

  lines.push("");
  lines.push("# HELP pingup_latency Network latency in milliseconds");
  lines.push("# TYPE pingup_latency gauge");

  for (const m of avgMetrics as any[]) {
    const agent = agentMap.get(m.agent_id);
    const labels = `agent_id="${m.agent_id}",agent_name="${agent?.name || 'unknown'}"`;
    lines.push(`pingup_latency{${labels}} ${m.latency || 0}`);
  }

  lines.push("");
  lines.push("# HELP pingup_agents_total Total number of agents");
  lines.push("# TYPE pingup_agents_total gauge");
  lines.push(`pingup_agents_total ${agents.length}`);

  lines.push("");
  lines.push("# HELP pingup_agents_online Number of online agents");
  lines.push("# TYPE pingup_agents_online gauge");
  lines.push(`pingup_agents_online ${agents.filter((a: any) => a.status === "online").length}`);

  return c.text(lines.join("\n"), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

prometheusRouter.get("/export/prometheus", (c) => {
  const db = getDb();
  const agents = listAgents();
  
  const stmt = db.prepare(`
    SELECT agent_id, 
           AVG(cpu) as cpu, 
           AVG(ram) as ram, 
           AVG(disk) as disk, 
           AVG(latency) as latency
    FROM metrics 
    WHERE timestamp >= datetime('now', '-1 hour')
    GROUP BY agent_id
  `);
  const avgMetrics = stmt.all();

  const agentMap = new Map(agents.map((a: any) => [a.id, a]));

  const metrics = (avgMetrics as any[]).map((m) => ({
    agent_id: m.agent_id,
    agent_name: agentMap.get(m.agent_id)?.name || "unknown",
    cpu: Math.round((m.cpu || 0) * 10) / 10,
    ram: Math.round((m.ram || 0) * 10) / 10,
    disk: Math.round((m.disk || 0) * 10) / 10,
    latency: Math.round(m.latency || 0),
  }));

  return c.json({
    timestamp: new Date().toISOString(),
    total_agents: agents.length,
    online_agents: agents.filter((a: any) => a.status === "online").length,
    metrics,
  });
});
