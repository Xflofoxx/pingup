import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, getConfig, type AgentConfig } from "../src/config";

describe("Config", () => {
  const testConfigPath = "./test-config.yaml";

  afterEach(() => {
    // Clean up global config
  });

  test("loadConfig should return default config when file not found", () => {
    const config = loadConfig("non-existent.yaml");
    
    expect(config.server_url).toBe("http://localhost:3000");
    expect(config.poll_interval).toBe(30);
    expect(config.network_timeout).toBe(3);
    expect(config.auth_token).toBe("");
  });

  test("getConfig should return loaded config", () => {
    const config = getConfig();
    
    expect(config).toBeDefined();
    expect(config.server_url).toBeDefined();
    expect(config.agent_id).toBeDefined();
  });

  test("config should have correct default modules", () => {
    const config = getConfig();
    
    expect(config.modules).toContain("cpu");
    expect(config.modules).toContain("ram");
    expect(config.modules).toContain("disk");
    expect(config.modules).toContain("network");
  });

  test("config should have mqtt settings", () => {
    const config = getConfig();
    
    expect(config.mqtt).toBeDefined();
    expect(config.mqtt.enabled).toBe(false);
    expect(config.mqtt.broker).toBe("localhost");
    expect(config.mqtt.port).toBe(1883);
  });

  test("config should have ping settings", () => {
    const config = getConfig();
    
    expect(config.ping).toBeDefined();
    expect(config.ping.host).toBe("8.8.8.8");
    expect(config.ping.timeout).toBe(2);
  });
});
