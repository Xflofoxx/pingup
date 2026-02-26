import { describe, test, expect } from "bun:test";
import { collectNetwork, type NetworkMetrics } from "../../src/collectors/network";

describe("Network Collector", () => {
  test("collectNetwork should return valid metrics", async () => {
    const metrics = await collectNetwork();

    expect(metrics).toBeDefined();
    expect(typeof metrics.bytes_sent_mb).toBe("number");
    expect(typeof metrics.bytes_recv_mb).toBe("number");
  });

  test("network_metrics should have required fields", async () => {
    const metrics = await collectNetwork() as NetworkMetrics;

    expect(metrics).toHaveProperty("bytes_sent_mb");
    expect(metrics).toHaveProperty("bytes_recv_mb");
    expect(metrics).toHaveProperty("packets_sent");
    expect(metrics).toHaveProperty("packets_recv");
  });

  test("bytes_sent_mb should be non-negative", async () => {
    const metrics = await collectNetwork();

    expect(metrics.bytes_sent_mb).toBeGreaterThanOrEqual(0);
  });

  test("bytes_recv_mb should be non-negative", async () => {
    const metrics = await collectNetwork();

    expect(metrics.bytes_recv_mb).toBeGreaterThanOrEqual(0);
  });

  test("packets should be non-negative", async () => {
    const metrics = await collectNetwork();

    expect(metrics.packets_sent).toBeGreaterThanOrEqual(0);
    expect(metrics.packets_recv).toBeGreaterThanOrEqual(0);
  });

  test("subsequent calls should return diff values", async () => {
    const first = await collectNetwork();
    const second = await collectNetwork();

    // After first call returns 0, second should have actual values
    expect(second.bytes_sent_mb).toBeGreaterThanOrEqual(first.bytes_sent_mb);
  });
});
