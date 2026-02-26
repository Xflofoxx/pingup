import { describe, it, expect, beforeEach } from "bun:test";
import { getDb } from "../../src/db/sqlite.ts";

describe("Metrics Service", () => {
  let db: ReturnType<typeof getDb>;
  
  beforeEach(() => {
    db = getDb();
  });
  
  it("should process valid metrics payload", () => {
    const payload = {
      agentId: "test-metrics-agent",
      timestamp: new Date().toISOString(),
      metrics: {
        cpu: 25.5,
        ram: 45.2,
        disk: 60.0,
        latency: 15,
      },
      status: "online",
    };
    
    const { processMetrics } = require("../../src/services/metrics.ts");
    expect(() => processMetrics(payload)).not.toThrow();
  });
  
  it("should handle metrics with zero values", () => {
    const payload = {
      agentId: "test-metrics-zero",
      timestamp: new Date().toISOString(),
      metrics: {
        cpu: 0,
        ram: 0,
        disk: 0,
        latency: 0,
      },
      status: "offline",
    };
    
    const { processMetrics } = require("../../src/services/metrics.ts");
    expect(() => processMetrics(payload)).not.toThrow();
  });
  
  it("should query agent metrics", () => {
    const { getAgentMetrics } = require("../../src/services/metrics.ts");
    const metrics = getAgentMetrics("test-metrics-agent");
    expect(Array.isArray(metrics)).toBe(true);
  });
  
  it("should query agent metrics with time range", () => {
    const { getAgentMetrics } = require("../../src/services/metrics.ts");
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date().toISOString();
    const metrics = getAgentMetrics("test-metrics-agent", from, to);
    expect(Array.isArray(metrics)).toBe(true);
  });
});
