import { Hono } from "hono";
import { processMetrics, getAgentMetrics, MetricsPayload } from "../services/metrics.ts";
import { checkAlerts } from "./alerts.ts";

export const metricsRouter = new Hono();

metricsRouter.post("/", async (c) => {
  const payload: MetricsPayload = await c.req.json();
  
  if (!payload.agentId || !payload.metrics) {
    return c.json({ error: "Invalid payload" }, 400);
  }
  
  processMetrics(payload);
  checkAlerts(payload.agentId, payload.metrics);
  
  return c.json({ success: true });
});

metricsRouter.get("/:agentId", (c) => {
  const agentId = c.req.param("agentId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  
  const metrics = getAgentMetrics(agentId, from, to);
  
  return c.json({ metrics });
});
