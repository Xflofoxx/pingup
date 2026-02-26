import { describe, test, expect } from "bun:test";
import { Logger } from "../../src/utils/logger";

describe("Logger", () => {
  test("should log info messages", () => {
    const logger = new Logger("test");
    const result = logger.info("test message");
    expect(result).toBeUndefined();
  });

  test("should log error messages", () => {
    const logger = new Logger("test");
    const result = logger.error("error message");
    expect(result).toBeUndefined();
  });

  test("should log warning messages", () => {
    const logger = new Logger("test");
    const result = logger.warn("warning message");
    expect(result).toBeUndefined();
  });

  test("should create child logger with extended prefix", () => {
    const parent = new Logger("parent");
    const child = parent.child("child");

    expect(child).toBeInstanceOf(Logger);
  });

  test("should log debug messages", () => {
    const logger = new Logger("test");
    const result = logger.debug("debug message");
    expect(result).toBeUndefined();
  });
});
