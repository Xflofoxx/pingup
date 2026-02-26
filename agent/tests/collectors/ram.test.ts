import { describe, test, expect } from "bun:test";
import { collectRAM, type RAMMetrics } from "../../src/collectors/ram";

describe("RAM Collector", () => {
  test("collectRAM should return valid metrics", () => {
    const metrics = collectRAM();

    expect(metrics).toBeDefined();
    expect(typeof metrics.ram_percent).toBe("number");
  });

  test("ram_percent should be in valid range", () => {
    const metrics = collectRAM();

    expect(metrics.ram_percent).toBeGreaterThanOrEqual(0);
    expect(metrics.ram_percent).toBeLessThanOrEqual(100);
  });

  test("ram_total_mb should be positive", () => {
    const metrics = collectRAM();

    expect(metrics.ram_total_mb).toBeGreaterThan(0);
  });

  test("ram_used_mb should be less than or equal to total", () => {
    const metrics = collectRAM();

    expect(metrics.ram_used_mb).toBeLessThanOrEqual(metrics.ram_total_mb);
  });

  test("ram_available_mb should be positive", () => {
    const metrics = collectRAM();

    expect(metrics.ram_available_mb).toBeGreaterThanOrEqual(0);
  });

  test("ram_metrics should have required fields", () => {
    const metrics = collectRAM() as RAMMetrics;

    expect(metrics).toHaveProperty("ram_percent");
    expect(metrics).toHaveProperty("ram_used_mb");
    expect(metrics).toHaveProperty("ram_available_mb");
    expect(metrics).toHaveProperty("ram_total_mb");
  });

  test("used + available should equal total", () => {
    const metrics = collectRAM();
    const calculated = metrics.ram_used_mb + metrics.ram_available_mb;

    expect(Math.abs(calculated - metrics.ram_total_mb)).toBeLessThan(1);
  });
});
