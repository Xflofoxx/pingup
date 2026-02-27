import { describe, test, expect } from "bun:test";
import { collectDisk, type DiskMetrics } from "../../src/collectors/disk";

describe("Disk Collector", () => {
  test("collectDisk should return valid metrics", async () => {
    const metrics = await collectDisk();

    expect(metrics).toBeDefined();
    expect(typeof metrics.disk_percent).toBe("number");
    expect(Array.isArray(metrics.partitions)).toBe(true);
  });

  test("disk_percent should be in valid range", async () => {
    const metrics = await collectDisk();

    expect(metrics.disk_percent).toBeGreaterThanOrEqual(0);
    expect(metrics.disk_percent).toBeLessThanOrEqual(100);
  });

  test("partitions should have required fields when present", async () => {
    const metrics = await collectDisk();

    if (metrics.partitions.length > 0) {
      const partition = metrics.partitions[0];
      expect(partition).toHaveProperty("device");
      expect(partition).toHaveProperty("mountpoint");
      expect(partition).toHaveProperty("percent");
      expect(partition).toHaveProperty("used_gb");
      expect(partition).toHaveProperty("free_gb");
      expect(partition).toHaveProperty("total_gb");
    }
  });

  test("disk metrics should have correct structure", async () => {
    const metrics = await collectDisk() as DiskMetrics;

    expect(metrics).toHaveProperty("disk_percent");
    expect(metrics).toHaveProperty("partitions");
  });
});
