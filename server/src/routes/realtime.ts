import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";
import { verifyToken } from "../services/auth.ts";

export const realtimeRouter = new Hono();

const clients = new Map<string, Set<(data: string) => void>>();

function broadcastEvent(channel: string, event: any) {
  const channelClients = clients.get(channel);
  if (channelClients) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    channelClients.forEach(callback => callback(message));
  }
}

export function emitAgentStatus(agentId: string, status: string) {
  broadcastEvent("agents", { type: "agent_status", agent_id: agentId, status });
}

export function emitMetricsUpdate(agentId: string, metrics: any) {
  broadcastEvent("metrics", { type: "metrics_update", agent_id: agentId, metrics });
}

export function emitAlert(alert: any) {
  broadcastEvent("alerts", { type: "alert_triggered", alert });
}

realtimeRouter.get("/events", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const channel = c.req.query("channel") || "all";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      if (!clients.has(channel)) {
        clients.set(channel, new Set());
      }
      clients.get(channel)!.add(sendEvent);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        const channelClients = clients.get(channel);
        if (channelClients) {
          channelClients.delete(sendEvent);
          if (channelClients.size === 0) {
            clients.delete(channel);
          }
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

realtimeRouter.get("/status", (c) => {
  return c.json({
    status: "ok",
    channels: Array.from(clients.keys()),
    clients_per_channel: Object.fromEntries(
      Array.from(clients.entries()).map(([k, v]) => [k, v.size])
    ),
  });
});
