import { describe, test, expect } from "bun:test";
import { detectVPN, type VPNInfo } from "../../src/collectors/vpn";

describe("VPN Collector", () => {
  test("detectVPN should return valid metrics", () => {
    const metrics = detectVPN();

    expect(metrics).toBeDefined();
  });

  test("vpn metrics should have required fields", () => {
    const metrics = detectVPN() as VPNInfo;

    expect(metrics).toHaveProperty("active");
    expect(metrics).toHaveProperty("name");
    expect(metrics).toHaveProperty("type");
    expect(metrics).toHaveProperty("ip");
    expect(metrics).toHaveProperty("server");
  });

  test("active should be boolean", () => {
    const metrics = detectVPN();

    expect(typeof metrics.active).toBe("boolean");
  });
});
