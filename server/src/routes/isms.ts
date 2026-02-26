import { Hono } from "hono";
import { listISMSControls, updateISMSControl, getISMSReport, initializeISMSControls } from "../services/isms.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const ismsRouter = new Hono();

ismsRouter.get("/controls", (c) => {
  const controls = listISMSControls();
  return c.json({ controls });
});

ismsRouter.post("/init", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  
  const payload = await verifyToken(token);
  if (!payload || !hasRole(payload.role, "ADM")) return c.json({ error: "Forbidden" }, 403);
  
  initializeISMSControls();
  return c.json({ success: true });
});

ismsRouter.put("/controls/:id", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  
  const payload = await verifyToken(token);
  if (!payload || !hasRole(payload.role, "IT")) return c.json({ error: "Forbidden" }, 403);
  
  const body = await c.req.json();
  const updated = updateISMSControl(c.req.param("id"), body);
  
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

ismsRouter.get("/report", (c) => {
  const report = getISMSReport();
  return c.json(report);
});
