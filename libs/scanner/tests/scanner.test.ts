import { describe, test, expect } from "bun:test";
import { parseTargets, scanHost, scanNetwork } from "../src/index.ts";

describe("parseTargets", () => {
  test("expands a /30 CIDR", () => {
    expect(parseTargets(["192.168.1.0/30"])).toEqual(["192.168.1.1", "192.168.1.2"]);
  });

  test("expands a range", () => {
    expect(parseTargets(["10.0.0.1-3"])).toEqual(["10.0.0.1", "10.0.0.2", "10.0.0.3"]);
  });

  test("keeps single hosts and deduplicates", () => {
    expect(parseTargets(["10.0.0.5", "10.0.0.5"])).toEqual(["10.0.0.5"]);
  });
});

describe("scanHost", () => {
  test("resolves quickly and never hangs on a refused connection", async () => {
    const started = Date.now();
    const result = await scanHost("127.0.0.1", { timeout: 200, ports: [] });
    const elapsed = Date.now() - started;

    expect(["online", "offline"]).toContain(result.status);
    expect(elapsed).toBeLessThan(5000);
  });

  test("honours the timeout when the connection is not refused", async () => {
    const started = Date.now();
    const result = await scanHost("10.255.255.1", { timeout: 300, ports: [] });
    const elapsed = Date.now() - started;

    expect(result.status).toBe("offline");
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("scanNetwork", () => {
  test("completes without hanging", async () => {
    const started = Date.now();
    const result = await scanNetwork(["127.0.0.1"], { timeout: 200, ports: [] });
    const elapsed = Date.now() - started;

    expect(result.target).toBe("127.0.0.1");
    expect(Array.isArray(result.hosts)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });
});
