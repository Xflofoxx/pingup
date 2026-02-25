import { Hono } from "hono";
import { registerUser, loginUser, verifyToken, logoutUser, SignJWT } from "../services/auth.ts";
import { listUsers, getUserById, updateUserRole, setUserStatus, deleteUser, hasRole, getAuditLog, hashPassword, verifyPassword, getUserByUsername } from "../services/users.ts";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "pingup-secret-key-change-in-production");

function getCookie(c: any, name: string): string | undefined {
  return c.req.cookie(name);
}

function setCookie(c: any, name: string, value: string, options?: any): void {
  c.header("Set-Cookie", `${name}=${value}; Path=${options?.path || "/"}; HttpOnly${options?.secure ? "; Secure" : ""}${options?.sameSite ? "; SameSite=" + options.sameSite : ""}${options?.maxAge ? "; Max-Age=" + options.maxAge : ""}`);
}

function deleteCookie(c: any, name: string): void {
  c.header("Set-Cookie", `${name}=; Path=/; HttpOnly; Max-Age=0`);
}

export const authRouter = new Hono();

authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { username } = body;
    
    if (!username || username.length < 3) {
      return c.json({ error: "Username must be at least 3 characters" }, 400);
    }
    
    const result = await registerUser(username);
    
    return c.json({
      userId: result.userId,
      secret: result.secret,
      qrCode: result.qrCode,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

authRouter.post("/register-password", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    if (!username || username.length < 3) {
      return c.json({ error: "Username must be at least 3 characters" }, 400);
    }
    
    if (!password || password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }
    
    const existing = getUserByUsername(username);
    if (existing) {
      return c.json({ error: "Username already exists" }, 400);
    }
    
    const passwordHash = hashPassword(password);
    const user = createUser(username, "PUB", undefined, passwordHash);
    
    logAudit(user.id, "user_register_password", "user", `User registered with password: ${username}`);
    
    return c.json({
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

authRouter.post("/login-password", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }
    
    const user = getUserByUsername(username);
    
    if (!user) {
      logAudit(null, "login_failed", "auth", `Failed login attempt for username: ${username}`);
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      logAudit(user.id, "login_failed", "auth", "Invalid password");
      return c.json({ error: "Invalid credentials" }, 401);
    }
    
    if (user.status === "disabled") {
      logAudit(user.id, "login_disabled", "auth", "Disabled user attempted login");
      return c.json({ error: "Account is disabled" }, 401);
    }
    
    updateLastLogin(user.id);
    
    const ipAddress = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";
    const session = createSession(user.id, ipAddress, userAgent);
    
    const token = await new SignJWT({ 
      sub: user.id, 
      username: user.username, 
      role: user.role,
      sessionId: session.id 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET_KEY);
    
    logAudit(user.id, "login_success", "auth", "User logged in with password");
    
    setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    
    return c.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, code } = body;
    
    if (!username || !code) {
      return c.json({ error: "Username and code are required" }, 400);
    }
    
    const ipAddress = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";
    
    const result = await loginUser(username, code, ipAddress);
    
    setCookie(c, "auth_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    
    return c.json({ user: result.user });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 401);
  }
});

authRouter.post("/logout", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await logoutUser(payload.sessionId);
    }
  }
  
  deleteCookie(c, "auth_token");
  
  return c.json({ success: true });
});

authRouter.get("/me", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }
  
  const user = getUserById(payload.sub);
  
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    last_login: user.last_login,
  });
});

export const usersRouter = new Hono();

usersRouter.get("/", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const users = listUsers();
  
  return c.json({
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      last_login: u.last_login,
    })),
  });
});

usersRouter.get("/:id", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const user = getUserById(id);
  
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    last_login: user.last_login,
  });
});

usersRouter.put("/:id/role", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const { role } = await c.req.json();
  
  if (!["PUB", "IT", "SUP", "ADM"].includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }
  
  const success = updateUserRole(id, role);
  
  if (!success) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({ success: true });
});

usersRouter.post("/:id/disable", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const success = setUserStatus(id, "disabled");
  
  if (!success) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({ success: true });
});

usersRouter.post("/:id/enable", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  const success = setUserStatus(id, "active");
  
  if (!success) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({ success: true });
});

usersRouter.delete("/:id", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const id = c.req.param("id");
  
  if (id === payload.sub) {
    return c.json({ error: "Cannot delete yourself" }, 400);
  }
  
  const success = deleteUser(id);
  
  if (!success) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({ success: true });
});

export const auditRouter = new Hono();

auditRouter.get("/", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  const limit = parseInt(c.req.query("limit") || "100");
  const logs = getAuditLog(limit);
  
  return c.json({ logs });
});
