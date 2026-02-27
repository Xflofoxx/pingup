import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";
import { verifyToken } from "../services/auth.ts";

export interface DashboardNotification {
  id: string;
  user_id: string;
  type: "alert" | "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export const notificationsRouter = new Hono();

function generateId(): string {
  return "notif-" + Math.random().toString(36).substring(2, 11);
}

notificationsRouter.get("/", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const db = getDb();
  const limit = c.req.query("limit") || "50";
  const offset = c.req.query("offset") || "0";
  const type = c.req.query("type");

  let query = "SELECT * FROM dashboard_notifications WHERE user_id = ?";
  const params: any[] = [payload.sub];

  if (type) {
    query += " AND type = ?";
    params.push(type);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const notifications = db.prepare(query).all(...params);

  const unreadCount = db.prepare(
    "SELECT COUNT(*) as count FROM dashboard_notifications WHERE user_id = ? AND read = 0"
  ).get(payload.sub) as { count: number };

  return c.json({
    notifications,
    unread_count: unreadCount.count,
  });
});

notificationsRouter.put("/:id/read", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const id = c.req.param("id");
  const db = getDb();

  const result = db.prepare(
    "UPDATE dashboard_notifications SET read = 1 WHERE id = ? AND user_id = ?"
  ).run(id, payload.sub);

  return c.json({ success: result.changes > 0 });
});

notificationsRouter.put("/read-all", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const db = getDb();
  const result = db.prepare(
    "UPDATE dashboard_notifications SET read = 1 WHERE user_id = ?"
  ).run(payload.sub);

  return c.json({ success: true, updated: result.changes });
});

notificationsRouter.delete("/:id", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const id = c.req.param("id");
  const db = getDb();

  const result = db.prepare(
    "DELETE FROM dashboard_notifications WHERE id = ? AND user_id = ?"
  ).run(id, payload.sub);

  return c.json({ success: result.changes > 0 });
});

notificationsRouter.delete("/", async (c) => {
  const token = c.req.raw.headers.get("Cookie")?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const db = getDb();
  const result = db.prepare(
    "DELETE FROM dashboard_notifications WHERE user_id = ?"
  ).run(payload.sub);

  return c.json({ success: true, deleted: result.changes });
});

export function createNotification(
  userId: string,
  type: DashboardNotification["type"],
  title: string,
  message: string
): string {
  const db = getDb();
  const id = generateId();

  db.prepare(
    "INSERT INTO dashboard_notifications (id, user_id, type, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))"
  ).run(id, userId, type, title, message);

  return id;
}

export function initNotificationsTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('alert', 'warning', 'info', 'success', 'error')),
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON dashboard_notifications(user_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON dashboard_notifications(user_id, read)
  `);
}
