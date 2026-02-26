import { Hono } from "hono";
import { 
  createTenant, 
  listTenants, 
  getTenant,
  getUserTenants,
  addUserToTenant,
  removeUserFromTenant,
  isUserInTenant,
  getUserTenantRole,
  updateTenantSettings
} from "../services/tenants.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const tenantsRouter = new Hono();

tenantsRouter.get("/", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const tenants = getUserTenants(payload.sub);
  
  return c.json({ tenants });
});

tenantsRouter.post("/", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const body = await c.req.json();
  const { name, domain } = body;
  
  if (!name || !domain) {
    return c.json({ error: "Name and domain required" }, 400);
  }
  
  const tenant = createTenant(name, domain, payload.sub);
  
  return c.json({ tenant }, 201);
});

tenantsRouter.get("/:id", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const id = c.req.param("id");
  
  if (!isUserInTenant(payload.sub, id)) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  const tenant = getTenant(id);
  
  if (!tenant) {
    return c.json({ error: "Not found" }, 404);
  }
  
  return c.json({ tenant });
});

tenantsRouter.put("/:id/settings", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const id = c.req.param("id");
  const role = getUserTenantRole(payload.sub, id);
  
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  const body = await c.req.json();
  
  updateTenantSettings(id, body.settings);
  
  return c.json({ success: true });
});

tenantsRouter.post("/:id/users", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const id = c.req.param("id");
  const role = getUserTenantRole(payload.sub, id);
  
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  const body = await c.req.json();
  const { userId, role: userRole } = body;
  
  const added = addUserToTenant(id, userId, userRole);
  
  if (!added) {
    return c.json({ error: "User already in tenant" }, 400);
  }
  
  return c.json({ success: true });
});

tenantsRouter.delete("/:id/users/:userId", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const id = c.req.param("id");
  const userIdToRemove = c.req.param("userId");
  const role = getUserTenantRole(payload.sub, id);
  
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  const removed = removeUserFromTenant(id, userIdToRemove);
  
  if (!removed) {
    return c.json({ error: "User not found or is owner" }, 404);
  }
  
  return c.json({ success: true });
});
