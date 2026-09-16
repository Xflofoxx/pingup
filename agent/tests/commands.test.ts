import { describe, test, expect } from "bun:test";
import { executeCommand, type CommandContext } from "../src/commands.ts";
import { normalizeParams } from "../src/transport/index.ts";
import type { Command } from "../src/transport/index.ts";

function cmd(action: string, params: Record<string, any> = {}): Command {
  return { commandId: "CMD-TEST", action, params };
}

function ctx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    agentId: "AGENT-TEST",
    discoveryRanges: [],
    discoveryPorts: [22, 80],
    sendDiscovery: async () => ({}),
    ...overrides,
  };
}

describe("Agent executeCommand", () => {
  test("ping returns pong", async () => {
    const result = await executeCommand(cmd("ping"), ctx());
    expect(result.success).toBe(true);
    expect(result.message).toBe("pong");
  });

  test("restart_service acknowledges the service", async () => {
    const result = await executeCommand(cmd("restart_service", { service: "nginx" }), ctx());
    expect(result.success).toBe(true);
    expect(result.message).toContain("nginx");
  });

  test("update_config is acknowledged", async () => {
    const result = await executeCommand(cmd("update_config"), ctx());
    expect(result.success).toBe(true);
  });

  test("unknown action fails", async () => {
    const result = await executeCommand(cmd("does_not_exist"), ctx());
    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown action");
  });

  test("run_discovery without ranges fails", async () => {
    const result = await executeCommand(cmd("run_discovery"), ctx({ discoveryRanges: [] }));
    expect(result.success).toBe(false);
    expect(result.message).toContain("No discovery ranges");
  });

  test("run_discovery uses ranges from params when provided", async () => {
    let sendCalled = false;
    const context = ctx({
      discoveryRanges: [],
      sendDiscovery: async () => {
        sendCalled = true;
        return {};
      },
    });

    const result = await executeCommand(cmd("run_discovery", { ranges: ["not-a-cidr"] }), context);

    expect(sendCalled).toBe(true);
    expect(result.message).toContain("Discovery completed");
  });
});

describe("normalizeParams", () => {
  test("parses a JSON string into an object", () => {
    expect(normalizeParams('{"ranges":["10.0.0.0/24"],"ports":[22]}')).toEqual({
      ranges: ["10.0.0.0/24"],
      ports: [22],
    });
  });

  test("passes through objects unchanged", () => {
    const params = { service: "nginx" };
    expect(normalizeParams(params)).toBe(params);
  });

  test("returns empty object for null/undefined", () => {
    expect(normalizeParams(null)).toEqual({});
    expect(normalizeParams(undefined)).toEqual({});
  });

  test("returns empty object for invalid JSON", () => {
    expect(normalizeParams("not json")).toEqual({});
  });
});