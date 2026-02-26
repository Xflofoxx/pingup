import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

export const adminRouter = new Hono();

adminRouter.get("/backup", (c) => {
  const db = getDb();
  const backupsDir = join(DATA_DIR, "backups");
  
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }
  
  const stmt = db.prepare("SELECT * FROM backups ORDER BY created_at DESC LIMIT 20");
  const backups = stmt.all();
  
  return c.json(backups);
});

adminRouter.post("/backup", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { name, type } = body;
  
  const backupsDir = join(DATA_DIR, "backups");
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }
  
  const id = `backup_${Date.now().toString(36)}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${id}_${timestamp}.json`;
  const filePath = join(backupsDir, filename);
  
  const tables = [
    "agents", "commands", "configs", "users", "sessions", "audit_log",
    "agent_groups", "agent_group_members", "alert_thresholds", 
    "alert_notifications", "alert_history", "scheduled_reports",
    "monitored_certificates", "certificate_history", "watched_processes",
    "watched_services", "custom_metrics"
  ];
  
  const backupData: Record<string, any[]> = {};
  
  for (const table of tables) {
    try {
      const stmt = db.prepare(`SELECT * FROM ${table}`);
      backupData[table] = stmt.all();
    } catch (e) {
      backupData[table] = [];
    }
  }
  
  writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  
  const stats = statSync(filePath);
  
  const insertStmt = db.prepare(`
    INSERT INTO backups (id, name, type, file_path, file_size)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertStmt.run(id, name || `Backup ${timestamp}`, type || "full", filename, stats.size);
  
  return c.json({ 
    id, 
    name: name || `Backup ${timestamp}`, 
    type: type || "full",
    file_size: stats.size,
    created_at: new Date().toISOString()
  }, 201);
});

adminRouter.get("/backup/:id/download", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  
  const stmt = db.prepare("SELECT * FROM backups WHERE id = ?");
  const backup = stmt.get(id) as any;
  
  if (!backup) {
    return c.json({ error: "Backup not found" }, 404);
  }
  
  const filePath = join(DATA_DIR, "backups", backup.file_path);
  
  if (!existsSync(filePath)) {
    return c.json({ error: "Backup file not found" }, 404);
  }
  
  const content = readFileSync(filePath, "utf-8");
  
  return c.json(JSON.parse(content));
});

adminRouter.post("/backup/:id/restore", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  
  const stmt = db.prepare("SELECT * FROM backups WHERE id = ?");
  const backup = stmt.get(id) as any;
  
  if (!backup) {
    return c.json({ error: "Backup not found" }, 404);
  }
  
  const filePath = join(DATA_DIR, "backups", backup.file_path);
  
  if (!existsSync(filePath)) {
    return c.json({ error: "Backup file not found" }, 404);
  }
  
  const content = readFileSync(filePath, "utf-8");
  const backupData = JSON.parse(content);
  
  for (const [table, records] of Object.entries(backupData)) {
    try {
      if (Array.isArray(records) && records.length > 0) {
        const columns = Object.keys(records[0]);
        const placeholders = columns.map(() => "?").join(", ");
        
        db.exec(`DELETE FROM ${table}`);
        
        for (const record of records) {
          const vals = columns.map(col => {
            const val = record[col];
            return val === null ? null : JSON.stringify(val);
          });
          const insertStmt = db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
          insertStmt.run(...vals);
        }
      }
    } catch (e) {
      console.error(`Error restoring table ${table}:`, e);
    }
  }
  
  return c.json({ message: "Backup restored successfully" });
});

adminRouter.delete("/backup/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  
  const stmt = db.prepare("SELECT * FROM backups WHERE id = ?");
  const backup = stmt.get(id) as any;
  
  if (!backup) {
    return c.json({ error: "Backup not found" }, 404);
  }
  
  const filePath = join(DATA_DIR, "backups", backup.file_path);
  
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  
  db.prepare("DELETE FROM backups WHERE id = ?").run(id);
  
  return c.json({ success: true });
});
