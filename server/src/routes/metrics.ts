import { Hono } from "hono";
import { processMetrics, getAgentMetrics, MetricsPayload } from "../services/metrics.ts";
import { checkAlerts } from "./alerts.ts";
import {
  decodeMessage,
  MessageType,
  createMetricsPayload,
  parseMetricsPayload,
  encodeMessage,
  Flags,
} from "../../../libs/binary-protocol/src/index.ts";

export const metricsRouter = new Hono();

metricsRouter.post("/", async (c) => {
  const contentType = c.req.header("content-type") || "";
  
  if (contentType.includes("msgpack")) {
    return handleBinaryMetrics(c);
  }
  
  const payload: MetricsPayload = await c.req.json();
  
  if (!payload.agentId || !payload.metrics) {
    return c.json({ error: "Invalid payload" }, 400);
  }
  
  processMetrics(payload);
  checkAlerts(payload.agentId, payload.metrics);
  
  return c.json({ success: true });
});

async function handleBinaryMetrics(c: any) {
  try {
    const body = await c.req.arrayBuffer();
    const data = new Uint8Array(body);
    
    const decoded = decodeMessage(data);
    
    if (decoded.type !== MessageType.METRICS) {
      return c.json({ error: "Invalid message type" }, 400);
    }
    
    const parsed = parseMetricsPayload(decoded.payload);
    
    const payload: MetricsPayload = {
      agentId: parsed.agentId,
      timestamp: new Date(parsed.timestamp).toISOString(),
      metrics: parsed.metrics as any,
      status: parsed.status,
      signature: parsed.signature,
    };
    
    processMetrics(payload);
    checkAlerts(payload.agentId, payload.metrics);
    
    const responsePayload = { success: true };
    const encoded = encodeMessage(MessageType.ACK, responsePayload, Flags.NONE);
    
    return c.body(encoded, {
      status: 200,
      headers: { "Content-Type": "application/msgpack" },
    });
  } catch (e) {
    console.error("Binary metrics decode error:", e);
    return c.json({ error: "Invalid binary payload" }, 400);
  }
}

metricsRouter.post("/bin", async (c) => {
  return handleBinaryMetrics(c);
});

metricsRouter.get("/:agentId", (c) => {
  const agentId = c.req.param("agentId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  
  const metrics = getAgentMetrics(agentId, from, to);
  
  return c.json({ metrics });
});
