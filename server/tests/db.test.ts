import { describe, it, expect } from "bun:test";
import { getDb, getPrepared } from "../src/db/sqlite.ts";
import { insertMetrics, queryMetrics } from "../src/db/duckdb.ts";

describe("Database SQLite", () => {
  it("should get database connection", () => {
    const db = getDb();
    expect(db).toBeTruthy();
  });
  
  it("should prepare statements", () => {
    const stmt = getPrepared("SELECT 1 as value");
    expect(stmt).toBeTruthy();
  });
  
  it("should execute queries", () => {
    const db = getDb();
    const result = db.exec("SELECT 1 as value");
    expect(result).toBeTruthy();
  });
});

describe("DuckDB Metrics", () => {
  it("should insert metrics", () => {
    expect(() => insertMetrics([{
      agent_id: "test",
      timestamp: new Date().toISOString(),
      cpu: 10,
      ram: 20,
      disk: 30,
      latency: 5,
      status: "online",
    }])).not.toThrow();
  });
  
  it("should query metrics", () => {
    const results = queryMetrics("non-existent-agent");
    expect(Array.isArray(results)).toBe(true);
  });
  
  it("should query metrics with time range", () => {
    const from = new Date(Date.now() - 3600000).toISOString();
    const to = new Date().toISOString();
    const results = queryMetrics("test", from, to);
    expect(Array.isArray(results)).toBe(true);
  });
});
