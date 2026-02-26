import { Hono } from "hono";
import { getDb } from "../db/sqlite.ts";

export interface AgentGroup {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export const groupsRouter = new Hono();

groupsRouter.get("/", (c) => {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT g.*, 
      (SELECT COUNT(*) FROM agent_group_members WHERE group_id = g.id) as agent_count
    FROM agent_groups g
    ORDER BY g.name
  `);
  const groups = stmt.all();
  return c.json(groups);
});

groupsRouter.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { name, description, parent_id } = body;

  if (!name || name.length < 1) {
    return c.json({ error: "Group name is required" }, 400);
  }

  const id = `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO agent_groups (id, name, description, parent_id)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, name, description || null, parent_id || null);

  return c.json({ id, name, description, parent_id }, 201);
});

groupsRouter.get("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const groupStmt = db.prepare(`
    SELECT g.*, 
      (SELECT COUNT(*) FROM agent_group_members WHERE group_id = g.id) as agent_count
    FROM agent_groups g
    WHERE g.id = ?
  `);
  const group = groupStmt.get(id) as AgentGroup | null;

  if (!group) {
    return c.json({ error: "Group not found" }, 404);
  }

  const agentsStmt = db.prepare(`
    SELECT a.* FROM agents a
    JOIN agent_group_members agm ON a.id = agm.agent_id
    WHERE agm.group_id = ?
  `);
  const agents = agentsStmt.all(id);

  return c.json({ ...group, agents });
});

groupsRouter.put("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description, parent_id } = body;

  const existing = db.prepare("SELECT id FROM agent_groups WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Group not found" }, 404);
  }

  const stmt = db.prepare(`
    UPDATE agent_groups 
    SET name = ?, description = ?, parent_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(name, description || null, parent_id || null, id);

  return c.json({ id, name, description, parent_id });
});

groupsRouter.delete("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const existing = db.prepare("SELECT id FROM agent_groups WHERE id = ?").get(id);
  if (!existing) {
    return c.json({ error: "Group not found" }, 404);
  }

  db.prepare("DELETE FROM agent_group_members WHERE group_id = ?").run(id);
  db.prepare("DELETE FROM agent_groups WHERE id = ?").run(id);

  return c.json({ success: true });
});

groupsRouter.post("/:id/agents", async (c) => {
  const db = getDb();
  const groupId = c.req.param("id");
  const body = await c.req.json();
  const { agent_ids } = body;

  if (!agent_ids || !Array.isArray(agent_ids)) {
    return c.json({ error: "agent_ids array is required" }, 400);
  }

  const group = db.prepare("SELECT id FROM agent_groups WHERE id = ?").get(groupId);
  if (!group) {
    return c.json({ error: "Group not found" }, 404);
  }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO agent_group_members (group_id, agent_id)
    VALUES (?, ?)
  `);

  for (const agentId of agent_ids) {
    const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
    if (agent) {
      stmt.run(groupId, agentId);
    }
  }

  return c.json({ success: true, added: agent_ids.length });
});

groupsRouter.delete("/:id/agents", async (c) => {
  const db = getDb();
  const groupId = c.req.param("id");
  const body = await c.req.json();
  const { agent_ids } = body;

  if (!agent_ids || !Array.isArray(agent_ids)) {
    return c.json({ error: "agent_ids array is required" }, 400);
  }

  const stmt = db.prepare("DELETE FROM agent_group_members WHERE group_id = ? AND agent_id = ?");
  for (const agentId of agent_ids) {
    stmt.run(groupId, agentId);
  }

  return c.json({ success: true, removed: agent_ids.length });
});
