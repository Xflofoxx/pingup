import { Hono } from "hono";
import { verifyAPIToken, createAPIToken, listAPITokens, revokeAPIToken } from "../services/apiTokens.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

async function getUserIdFromToken(c: any): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  
  if (authHeader?.startsWith("Bearer pktk_")) {
    const token = authHeader.substring(7);
    const verified = verifyAPIToken(token);
    if (verified.valid) {
      return verified.userId || null;
    }
  }
  
  const { verifyToken } = await import("../services/auth.ts");
  const token = getCookie(c, "auth_token");
  if (token) {
    const payload = await verifyToken(token);
    return payload?.sub || null;
  }
  
  return null;
}

export const apiTokensRouter = new Hono();

apiTokensRouter.post("/", async (c) => {
  const userId = await getUserIdFromToken(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { name, scope, expiresInDays } = body;
  
  if (!name) {
    return c.json({ error: "Name required" }, 400);
  }
  
  const result = createAPIToken(name, userId, scope, expiresInDays);
  
  return c.json({
    token: result.token,
    apiToken: result.apiToken,
  });
});

apiTokensRouter.get("/", async (c) => {
  const userId = await getUserIdFromToken(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const tokens = listAPITokens(userId);
  return c.json({ tokens });
});

apiTokensRouter.delete("/:id", async (c) => {
  const userId = await getUserIdFromToken(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const id = c.req.param("id");
  const revoked = revokeAPIToken(id, userId);
  
  if (!revoked) {
    return c.json({ error: "Token not found" }, 404);
  }
  
  return c.json({ success: true });
});

apiTokensRouter.post("/verify", (c) => {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader?.startsWith("Bearer pktk_")) {
    return c.json({ valid: false }, 401);
  }
  
  const token = authHeader.substring(7);
  const result = verifyAPIToken(token);
  
  return c.json(result);
});
