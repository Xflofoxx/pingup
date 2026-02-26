import { describe, it, expect } from "bun:test";
import { collectTemperature } from "../../src/collectors/temperature.ts";

describe("Temperature Collector", () => {
  it("should return temperature object with all fields", () => {
    const result = collectTemperature("celsius");
    
    expect(result).toHaveProperty("cpu");
    expect(result).toHaveProperty("gpu");
    expect(result).toHaveProperty("disk");
    expect(result).toHaveProperty("motherboard");
    expect(result).toHaveProperty("ambient");
    expect(result).toHaveProperty("unit");
    expect(result).toHaveProperty("timestamp");
    expect(result.unit).toBe("celsius");
  });

  it("should return celsius as default unit", () => {
    const result = collectTemperature();
    
    expect(result.unit).toBe("celsius");
  });

  it("should accept fahrenheit unit", () => {
    const result = collectTemperature("fahrenheit");
    
    expect(result.unit).toBe("fahrenheit");
  });

  it("should include timestamp", () => {
    const result = collectTemperature("celsius");
    
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("should have values for sensors (null or actual values)", () => {
    const result = collectTemperature("celsius");
    
    expect(result.cpu).toBeDefined();
    expect(result.gpu).toBeDefined();
    expect(result.disk).toBeDefined();
    expect(result.motherboard).toBeDefined();
    expect(result.ambient).toBeDefined();
  });
});
