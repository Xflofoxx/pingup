import { Hono } from "hono";
import { 
  getCommand, 
  listCommands, 
  createCommand, 
  getPendingCommands,
  updateCommandResult 
} from "../services/commands.ts";

export const commandsRouter = new Hono();

commandsRouter.get("/", (c) => {
  const agentId = c.req.query("agentId");
  const status = c.req.query("status");
  
  const commands = listCommands(agentId, status);
  return c.json({ commands });
});

commandsRouter.get("/pending/:agentId", (c) => {
  const agentId = c.req.param("agentId");
  const commands = getPendingCommands(agentId);
  return c.json({ commands });
});

commandsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const command = getCommand(id);
  
  if (!command) {
    return c.json({ error: "Command not found" }, 404);
  }
  
  return c.json({ command });
});

commandsRouter.post("/", async (c) => {
  const body = await c.req.json();
  
  if (!body.agent_id || !body.action) {
    return c.json({ error: "agent_id and action required" }, 400);
  }
  
  const command = createCommand({
    id: body.id || `CMD-${Date.now()}`,
    agent_id: body.agent_id,
    action: body.action,
    params: body.params,
    signature: body.signature,
  });
  
  return c.json({ command }, 201);
});

commandsRouter.post("/:id/result", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  
  updateCommandResult(id, body.result || {}, body.status || "completed");
  
  return c.json({ success: true });
});
