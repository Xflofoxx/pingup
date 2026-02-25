import { verifyToken, logoutUser } from "../services/auth.ts";
import { hasRole } from "../services/users.ts";
import type { MiddlewareHandler } from "hono";

export interface AuthContext {
  user: {
    id: string;
    username: string;
    role: string;
    sessionId: string;
  } | null;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  
  c.set("user", {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    sessionId: payload.sessionId,
  });
  
  await next();
};

export const requireRole = (allowedRoles: string[]): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user") as AuthContext["user"];
    
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }
    
    const hasAccess = allowedRoles.some(role => hasRole(user.role, role));
    
    if (!hasAccess) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    
    await next();
  };
};

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const token = c.req.cookie("auth_token");
  
  if (token) {
    const payload = await verifyToken(token);
    
    if (payload) {
      c.set("user", {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        sessionId: payload.sessionId,
      });
    }
  }
  
  await next();
};
