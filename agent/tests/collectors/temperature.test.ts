import { describe, it, expect } from "bun:test";
import { collectTemperature } from "../../src/collectors/temperature";

describe("Temperature Collector", () => {
  it("should return temperature object with all fields", async () => {
    const result = await collectTemperature("celsius");
    
    expect(result).toHaveProperty("cpu");
    expect(result).toHaveProperty("gpu");
    expect(result).toHaveProperty("disk");
    expect(result).toHaveProperty("motherboard");
    expect(result).toHaveProperty("ambient");
    expect(result).toHaveProperty("unit");
    expect(result).toHaveProperty("timestamp");
    expect(result.unit).toBe("celsius");
  });

  it("should return celsius as default unit", async () => {
    const result = await collectTemperature();
    
    expect(result.unit).toBe("celsius");
  });

  it("should accept fahrenheit unit", async () => {
    const result = await collectTemperature("fahrenheit");
    
    expect(result.unit).toBe("fahrenheit");
  });

  it("should include timestamp", async () => {
    const result = await collectTemperature("celsius");
    
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("should have nullable values for sensors", async () => {
    const result = await collectTemperature("celsius");
    
    expect(result.cpu === null || typeof result.cpu === "number").toBe(true);
    expect(result.gpu === null || typeof result.gpu === "number").toBe(true);
    expect(result.disk === null || typeof result.disk === "number").toBe(true);
  });
});
