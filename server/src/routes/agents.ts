import { Hono } from "hono";
import { getAgent, listAgents, createAgent, deleteAgent, updateAgentStatus } from "../services/agent.ts";

export const agentsRouter = new Hono();

agentsRouter.get("/", (c) => {
  const status = c.req.query("status");
  const agents = listAgents(status);
  return c.json({ agents });
});

agentsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const agent = getAgent(id);
  
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }
  
  return c.json({ agent });
});

agentsRouter.post("/", async (c) => {
  const body = await c.req.json();
  
  if (!body.id) {
    return c.json({ error: "Agent ID required" }, 400);
  }
  
  const agent = createAgent({
    id: body.id,
    name: body.name,
    metadata: body.metadata,
  });
  
  return c.json({ agent }, 201);
});

agentsRouter.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = deleteAgent(id);
  
  if (!deleted) {
    return c.json({ error: "Agent not found" }, 404);
  }
  
  return c.json({ success: true });
});

agentsRouter.post("/:id/heartbeat", (c) => {
  const id = c.req.param("id");
  updateAgentStatus(id, "online");
  return c.json({ success: true });
});
