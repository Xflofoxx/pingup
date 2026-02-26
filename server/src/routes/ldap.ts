import { Hono } from "hono";
import { getLDAPConfig, saveLDAPConfig, testLDAPConnection, syncLDAPUsers, isLDAPEnabled } from "../services/ldap.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const ldapRouter = new Hono();

ldapRouter.get("/config", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const config = getLDAPConfig();
  config.bind_password = config.bind_password ? "***HIDDEN***" : "";
  
  return c.json({ config });
});

ldapRouter.put("/config", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const body = await c.req.json();
  saveLDAPConfig(body);
  
  return c.json({ success: true });
});

ldapRouter.post("/test", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const body = await c.req.json();
  const result = await testLDAPConnection(body);
  
  return c.json(result);
});

ldapRouter.post("/sync", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const config = getLDAPConfig();
  const result = await syncLDAPUsers(config);
  
  return c.json(result);
});

ldapRouter.get("/status", (c) => {
  return c.json({ enabled: isLDAPEnabled() });
});
