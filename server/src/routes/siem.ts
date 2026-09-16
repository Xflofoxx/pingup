import { Hono } from "hono";
import { verifyToken, hasRole } from "../services/auth.ts";
import {
  ingestDiscovery,
  listSiemAssets,
  getSiemAsset,
  getSiemAssetFindings,
  listSiemFindings,
  updateSiemFindingStatus,
  getSiemOverview,
} from "../services/siem.ts";

export const siemRouter = new Hono();

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

async function isAuthorized(c: any): Promise<boolean> {
  const token = getCookie(c, "auth_token");
  if (!token) return false;
  const payload = await verifyToken(token);
  return !!payload;
}

siemRouter.post("/ingest", async (c) => {
  try {
    const body = await c.req.json();
    const { agentId, timestamp, discovery } = body;

    if (!agentId || !discovery || !Array.isArray(discovery.hosts)) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const result = ingestDiscovery(agentId, timestamp || new Date().toISOString(), discovery.hosts);
    return c.json({ success: true, ...result }, 201);
  } catch (error) {
    console.error("Error ingesting SIEM data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

siemRouter.get("/overview", async (c) => {
  if (!(await isAuthorized(c))) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ overview: getSiemOverview() });
});

siemRouter.get("/assets", async (c) => {
  if (!(await isAuthorized(c))) return c.json({ error: "Unauthorized" }, 401);

  const deviceType = c.req.query("deviceType");
  const riskLabel = c.req.query("riskLabel");
  const status = c.req.query("status");

  const assets = listSiemAssets({ deviceType, riskLabel, status });
  return c.json({ assets });
});

siemRouter.get("/assets/:id", async (c) => {
  if (!(await isAuthorized(c))) return c.json({ error: "Unauthorized" }, 401);

  const asset = getSiemAsset(c.req.param("id"));
  if (!asset) return c.json({ error: "Not found" }, 404);
  return c.json({ asset });
});

siemRouter.get("/assets/:id/findings", async (c) => {
  if (!(await isAuthorized(c))) return c.json({ error: "Unauthorized" }, 401);

  const status = c.req.query("status");
  const findings = getSiemAssetFindings(c.req.param("id"), status);
  return c.json({ findings });
});

siemRouter.get("/findings", async (c) => {
  if (!(await isAuthorized(c))) return c.json({ error: "Unauthorized" }, 401);

  const severity = c.req.query("severity");
  const status = c.req.query("status");
  const knownExploited = c.req.query("knownExploited") === "true";

  const findings = listSiemFindings({ severity, status, knownExploited });
  return c.json({ findings });
});

siemRouter.put("/findings/:id/status", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const payload = await verifyToken(token);
  if (!payload || !hasRole(payload.role, "IT")) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  const updated = updateSiemFindingStatus(c.req.param("id"), body.status);

  if (!updated) return c.json({ error: "Not found or invalid status" }, 404);
  return c.json({ success: true });
});