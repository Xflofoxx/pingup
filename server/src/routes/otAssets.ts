import { Hono } from "hono";
import { createOTAsset, listOTAssets, getOTAsset, updateOTAsset, deleteOTAsset, getAssetVulnerabilities } from "../services/otAssets.ts";
import { verifyToken, hasRole } from "../services/auth.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

async function getUserId(c: any): Promise<string | null> {
  const token = getCookie(c, "auth_token");
  if (!token) return null;
  const { verifyToken } = await import("../services/auth.ts");
  const payload = await verifyToken(token);
  return payload?.sub || null;
}

export const otAssetsRouter = new Hono();

otAssetsRouter.get("/", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  const zoneId = c.req.query("zoneId");
  const assets = listOTAssets(zoneId);
  return c.json({ assets });
});

otAssetsRouter.post("/", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  const body = await c.req.json();
  const asset = createOTAsset(body.name, body.type, body.manufacturer, body.model, body.firmware, body.ipAddress, body.macAddress, body.location, body.zoneId);
  
  return c.json({ asset }, 201);
});

otAssetsRouter.get("/:id", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  const asset = getOTAsset(c.req.param("id"));
  if (!asset) return c.json({ error: "Not found" }, 404);
  
  return c.json({ asset });
});

otAssetsRouter.put("/:id", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  const payload = await verifyToken(getCookie(c, "auth_token") || "");
  if (!payload || !hasRole(payload.role, "IT")) return c.json({ error: "Forbidden" }, 403);
  
  const body = await c.req.json();
  const updated = updateOTAsset(c.req.param("id"), body);
  
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

otAssetsRouter.delete("/:id", async (c) => {
  const payload = await verifyToken(getCookie(c, "auth_token") || "");
  if (!payload || !hasRole(payload.role, "ADM")) return c.json({ error: "Forbidden" }, 403);
  
  const deleted = deleteOTAsset(c.req.param("id"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

otAssetsRouter.get("/:id/vulnerabilities", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  const vulns = getAssetVulnerabilities(c.req.param("id"));
  return c.json({ vulnerabilities: vulns });
});
