import { Hono } from "hono";
import { createZone, listZones, getZone, addDeviceToZone, checkZoneCompliance, getComplianceReport } from "../services/compliance.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const complianceRouter = new Hono();

complianceRouter.get("/zones", (c) => {
  const zones = listZones();
  return c.json({ zones });
});

complianceRouter.post("/zones", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  
  const payload = await verifyToken(token);
  if (!payload || !hasRole(payload.role, "IT")) return c.json({ error: "Forbidden" }, 403);
  
  const { name, description, securityLevel, networkSegment } = await c.req.json();
  const zone = createZone(name, description, securityLevel, networkSegment);
  
  return c.json({ zone }, 201);
});

complianceRouter.get("/zones/:id", (c) => {
  const zone = getZone(c.req.param("id"));
  if (!zone) return c.json({ error: "Not found" }, 404);
  return c.json({ zone });
});

complianceRouter.post("/zones/:id/devices", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  
  const payload = await verifyToken(token);
  if (!payload || !hasRole(payload.role, "IT")) return c.json({ error: "Forbidden" }, 403);
  
  const { deviceId } = await c.req.json();
  const added = addDeviceToZone(c.req.param("id"), deviceId);
  
  if (!added) return c.json({ error: "Zone not found" }, 404);
  return c.json({ success: true });
});

complianceRouter.get("/zones/:id/controls", (c) => {
  const controls = checkZoneCompliance(c.req.param("id"));
  return c.json({ controls });
});

complianceRouter.get("/report", (c) => {
  const report = getComplianceReport();
  return c.json(report);
});
