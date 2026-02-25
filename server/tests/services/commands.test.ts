import { describe, test, expect, beforeEach } from "bun:test";
import {
  createCommand,
  getCommand,
  listCommands,
  getPendingCommands,
  updateCommandResult,
} from "../../src/services/commands";
import { getDb } from "../../src/db/sqlite";
import { createAgent } from "../../src/services/agent";

describe("Commands Service", () => {
  beforeEach(() => {
    const db = getDb();
    db.exec("DELETE FROM commands");
    db.exec("DELETE FROM agents");
  });

  test("createCommand should create new command", () => {
    const agent = createAgent({ id: "cmd-agent-001" });
    
    const command = createCommand({
      id: "CMD-001",
      agent_id: agent.id,
      action: "ping",
      params: { test: true },
    });

    expect(command.id).toBe("CMD-001");
    expect(command.agent_id).toBe(agent.id);
    expect(command.action).toBe("ping");
    expect(command.status).toBe("pending");
  });

  test("getCommand should return existing command", () => {
    const agent = createAgent({ id: "cmd-agent-002" });
    createCommand({
      id: "CMD-002",
      agent_id: agent.id,
      action: "restart_service",
    });

    const command = getCommand("CMD-002");
    expect(command).toBeDefined();
    expect(command?.action).toBe("restart_service");
  });

  test("getCommand should return undefined for non-existent command", () => {
    const command = getCommand("non-existent");
    expect(command).toBeUndefined();
  });

  test("listCommands should return all commands for agent", () => {
    const agent = createAgent({ id: "cmd-agent-003" });
    createCommand({ id: "CMD-003a", agent_id: agent.id, action: "ping" });
    createCommand({ id: "CMD-003b", agent_id: agent.id, action: "pong" });

    const commands = listCommands(agent.id);
    expect(commands.length).toBe(2);
  });

  test("listCommands should filter by status", () => {
    const agent = createAgent({ id: "cmd-agent-004" });
    createCommand({ id: "CMD-004a", agent_id: agent.id, action: "ping", signature: "sig1" });
    createCommand({ id: "CMD-004b", agent_id: agent.id, action: "pong", signature: "sig2" });
    
    updateCommandResult("CMD-004a", { result: "ok" }, "completed");

    const pending = listCommands(agent.id, "pending");
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("CMD-004b");
  });

  test("getPendingCommands should return only pending commands", () => {
    const agent = createAgent({ id: "cmd-agent-005" });
    createCommand({ id: "CMD-005a", agent_id: agent.id, action: "ping" });
    createCommand({ id: "CMD-005b", agent_id: agent.id, action: "pong" });
    
    updateCommandResult("CMD-005a", { result: "ok" }, "completed");

    const pending = getPendingCommands(agent.id);
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("CMD-005b");
  });

  test("updateCommandResult should update command status and result", () => {
    const agent = createAgent({ id: "cmd-agent-006" });
    createCommand({ id: "CMD-006", agent_id: agent.id, action: "execute" });

    updateCommandResult("CMD-006", { output: "success" }, "completed");

    const command = getCommand("CMD-006");
    expect(command?.status).toBe("completed");
    expect(command?.result).toContain("success");
  });
});
