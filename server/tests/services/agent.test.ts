import { describe, test, expect, beforeEach } from "bun:test";
import { 
  createAgent, 
  getAgent, 
  listAgents, 
  deleteAgent,
  updateAgentStatus 
} from "../../src/services/agent";
import { getDb } from "../../src/db/sqlite";

describe("Agent Service", () => {
  beforeEach(() => {
    const db = getDb();
    db.exec("DELETE FROM agents");
  });

  test("createAgent should create new agent", () => {
    const agent = createAgent({
      id: "test-agent-001",
      name: "Test Agent",
    });

    expect(agent.id).toBe("test-agent-001");
    expect(agent.name).toBe("Test Agent");
    expect(agent.status).toBe("offline");
  });

  test("getAgent should return existing agent", () => {
    createAgent({ id: "test-agent-002" });
    const agent = getAgent("test-agent-002");

    expect(agent).toBeDefined();
    expect(agent?.id).toBe("test-agent-002");
  });

  test("getAgent should return undefined for non-existent agent", () => {
    const agent = getAgent("non-existent");
    expect(agent).toBeUndefined();
  });

  test("listAgents should return all agents", () => {
    createAgent({ id: "agent-1", name: "Agent 1" });
    createAgent({ id: "agent-2", name: "Agent 2" });

    const agents = listAgents();
    expect(agents.length).toBe(2);
  });

  test("listAgents should filter by status", () => {
    const agent1 = createAgent({ id: "agent-online" });
    updateAgentStatus(agent1.id, "online");
    createAgent({ id: "agent-offline" });

    const onlineAgents = listAgents("online");
    expect(onlineAgents.length).toBe(1);
    expect(onlineAgents[0].id).toBe("agent-online");
  });

  test("deleteAgent should remove agent", () => {
    createAgent({ id: "to-delete" });
    const deleted = deleteAgent("to-delete");

    expect(deleted).toBe(true);
    expect(getAgent("to-delete")).toBeUndefined();
  });

  test("updateAgentStatus should update status and last_seen", () => {
    createAgent({ id: "status-test" });
    
    updateAgentStatus("status-test", "online");
    const agent = getAgent("status-test");

    expect(agent?.status).toBe("online");
    expect(agent?.last_seen).toBeDefined();
  });
});
