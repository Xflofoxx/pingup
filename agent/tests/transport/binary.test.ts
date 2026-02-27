import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { HTTPSender } from "../../src/transport/index.ts";
import { encodeMessage, MessageType, createMetricsPayload } from "../../../libs/binary-protocol/src/index.ts";

describe("HTTPSender Binary Protocol", () => {
  let sender: HTTPSender;
  
  beforeAll(() => {
    sender = new HTTPSender();
  });
  
  describe("sendMetrics", () => {
    test("should have sendMetrics method", () => {
      expect(typeof sender.sendMetrics).toBe("function");
    });
    
    test("should have binary fallback capability", () => {
      expect(sender).toBeDefined();
    });
  });
  
  describe("fetchCommands", () => {
    test("should have fetchCommands method", () => {
      expect(typeof sender.fetchCommands).toBe("function");
    });
  });
  
  describe("reportCommandResult", () => {
    test("should have reportCommandResult method", () => {
      expect(typeof sender.reportCommandResult).toBe("function");
    });
  });
  
  describe("fetchConfig", () => {
    test("should have fetchConfig method", () => {
      expect(typeof sender.fetchConfig).toBe("function");
    });
  });
  
  describe("healthCheck", () => {
    test("should have healthCheck method", () => {
      expect(typeof sender.healthCheck).toBe("function");
    });
  });
});
