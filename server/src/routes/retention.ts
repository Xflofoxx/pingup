import { Hono } from "hono";
import { 
  listRetentionPolicies, 
  updateRetentionPolicy, 
  applyRetentionPolicies,
  initializeDefaultPolicies 
} from "../services/retention.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const retentionRouter = new Hono();

retentionRouter.get("/", (c) => {
  const policies = listRetentionPolicies();
  return c.json({ policies });
});

retentionRouter.post("/init", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  initializeDefaultPolicies();
  
  return c.json({ success: true });
});

retentionRouter.put("/:id", async (c) => {
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
  
  const updated = updateRetentionPolicy(id, body);
  
  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }
  
  return c.json({ success: true });
});

retentionRouter.post("/apply", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const result = applyRetentionPolicies();
  
  return c.json(result);
});
