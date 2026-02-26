import { Hono } from "hono";
import { getAgent, listAgents, createAgent, deleteAgent, updateAgentStatus, setAgentOwner, verifyAgentAccess } from "../services/agent.ts";
import { verifyToken } from "../services/auth.ts";
import { verifyPassword, hashPassword } from "../services/users.ts";
import { getDb } from "../db/sqlite.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

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

agentsRouter.post("/:id/owner", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const agentId = c.req.param("id");
  const body = await c.req.json();
  const { userId } = body;
  
  if (!userId) {
    return c.json({ error: "userId required" }, 400);
  }
  
  setAgentOwner(agentId, userId);
  
  return c.json({ success: true });
});

agentsRouter.get("/:id/access", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ authorized: false, error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ authorized: false, error: "Invalid token" }, 401);
  }
  
  const agentId = c.req.param("id");
  const authorized = verifyAgentAccess(agentId, payload.sub);
  
  if (authorized) {
    return c.json({ 
      authorized: true, 
      user: { id: payload.sub, username: payload.username, role: payload.role }
    });
  }
  
  return c.json({ authorized: false, error: "Access denied" }, 403);
});

agentsRouter.post("/:id/verify-password", async (c) => {
  const agentId = c.req.param("id");
  const body = await c.req.json();
  const { password } = body;
  
  if (!password) {
    return c.json({ valid: false, error: "Password required" }, 400);
  }
  
  const agent = getAgent(agentId);
  if (!agent || !agent.owner_id) {
    return c.json({ valid: false, error: "Agent not found or has no owner" }, 404);
  }
  
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(agent.owner_id) as any;
  
  if (!user || !user.password_hash) {
    return c.json({ valid: false, error: "Owner has no password set" }, 400);
  }
  
  const valid = verifyPassword(password, user.password_hash);
  
  return c.json({ valid });
});
