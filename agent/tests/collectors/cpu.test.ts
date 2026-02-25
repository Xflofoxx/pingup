import { describe, test, expect } from "bun:test";
import { collectCPU, measureLatency, type CPUMetrics } from "../../src/collectors/cpu";

describe("CPU Collector", () => {
  test("collectCPU should return valid metrics", () => {
    const metrics = collectCPU();

    expect(metrics).toBeDefined();
    expect(typeof metrics.cpu_percent).toBe("number");
    expect(typeof metrics.cpu_count).toBe("number");
  });

  test("cpu_percent should be in valid range", () => {
    const metrics = collectCPU();

    expect(metrics.cpu_percent).toBeGreaterThanOrEqual(0);
    expect(metrics.cpu_percent).toBeLessThanOrEqual(100);
  });

  test("cpu_count should be positive", () => {
    const metrics = collectCPU();

    expect(metrics.cpu_count).toBeGreaterThan(0);
  });

  test("cpu_metrics should have required fields", () => {
    const metrics = collectCPU() as CPUMetrics;

    expect(metrics).toHaveProperty("cpu_percent");
    expect(metrics).toHaveProperty("cpu_user");
    expect(metrics).toHaveProperty("cpu_system");
    expect(metrics).toHaveProperty("cpu_count");
  });
});

describe("Latency Measurement", () => {
  test("measureLatency should return a number", async () => {
    const latency = await measureLatency("8.8.8.8", 2);

    expect(typeof latency).toBe("number");
  });

  test("measureLatency should return -1 for invalid host", async () => {
    const latency = await measureLatency("invalid-host-12345", 1);

    expect(latency).toBe(-1);
  });
});
