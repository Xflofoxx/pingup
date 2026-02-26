import { Hono } from "hono";
import { 
  createMaintenanceWindow, 
  listMaintenanceWindows, 
  getMaintenanceWindow,
  updateMaintenanceWindow,
  deleteMaintenanceWindow,
  isInMaintenanceWindow
} from "../services/maintenance.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const maintenanceRouter = new Hono();

maintenanceRouter.get("/", (c) => {
  const windows = listMaintenanceWindows();
  return c.json({ windows });
});

maintenanceRouter.post("/", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const body = await c.req.json();
  const { name, description, startTime, endTime, recurrence, agentIds } = body;
  
  if (!name || !startTime || !endTime) {
    return c.json({ error: "Name, startTime, and endTime required" }, 400);
  }
  
  const window = createMaintenanceWindow(name, description, startTime, endTime, recurrence, agentIds);
  
  return c.json({ window }, 201);
});

maintenanceRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const window = getMaintenanceWindow(id);
  
  if (!window) {
    return c.json({ error: "Not found" }, 404);
  }
  
  return c.json({ window });
});

maintenanceRouter.put("/:id", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const body = await c.req.json();
  
  const updated = updateMaintenanceWindow(id, body);
  
  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }
  
  return c.json({ success: true });
});

maintenanceRouter.delete("/:id", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const deleted = deleteMaintenanceWindow(id);
  
  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }
  
  return c.json({ success: true });
});

maintenanceRouter.get("/status", (c) => {
  const agentId = c.req.query("agentId");
  const status = isInMaintenanceWindow(agentId);
  
  return c.json(status);
});
