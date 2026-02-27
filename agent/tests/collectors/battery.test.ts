import { describe, test, expect } from "bun:test";
import { collectBattery, type BatteryInfo } from "../../src/collectors/battery";

describe("Battery Collector", () => {
  test("collectBattery should return valid metrics or null", () => {
    const metrics = collectBattery();

    expect(metrics).toBeDefined();
    if (metrics !== null) {
      expect(typeof metrics.present).toBe("boolean");
      expect(typeof metrics.charge_percent).toBe("number");
    }
  });

  test("battery metrics should have correct structure when present", () => {
    const metrics = collectBattery();

    if (metrics !== null) {
      expect(metrics).toHaveProperty("present");
      expect(metrics).toHaveProperty("charging");
      expect(metrics).toHaveProperty("charge_percent");
      expect(metrics).toHaveProperty("ac_connected");
    }
  });

  test("percent should be in valid range when present", () => {
    const metrics = collectBattery();

    if (metrics !== null && metrics.present) {
      expect(metrics.charge_percent).toBeGreaterThanOrEqual(0);
      expect(metrics.charge_percent).toBeLessThanOrEqual(100);
    }
  });
});
