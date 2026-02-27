import { describe, test, expect, beforeAll } from "bun:test";
import {
  encodeMessage,
  decodeMessage,
  MessageType,
  Flags,
  crc32,
  createMetricsPayload,
  parseMetricsPayload,
  createCommandPayload,
  parseCommandPayload,
  createCommandResultPayload,
  parseCommandResultPayload,
  createDiscoveryPayload,
  parseDiscoveryPayload,
  MAGIC_BYTE,
  PROTOCOL_VERSION,
} from "../src/index.ts";

describe("Binary Protocol", () => {
  describe("CRC32", () => {
    test("calculates correct checksum", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const checksum = crc32(data);
      expect(typeof checksum).toBe("number");
      expect(checksum).toBeGreaterThan(0);
    });
    
    test("produces different checksums for different data", () => {
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([1, 2, 4]);
      expect(crc32(data1)).not.toBe(crc32(data2));
    });
  });
  
  describe("Metrics Message", () => {
    test("encodes and decodes metrics payload", () => {
      const payload = createMetricsPayload(
        "AGENT-001",
        1709000000000,
        { cpu: 45.5, ram: 62.3, disk: 78.1, lat: 12.5 },
        "online"
      );
      
      const encoded = encodeMessage(MessageType.METRICS, payload);
      expect(encoded.length).toBeGreaterThan(0);
      
      const decoded = decodeMessage(encoded);
      expect(decoded.type).toBe(MessageType.METRICS);
      
      const parsed = parseMetricsPayload(decoded.payload);
      expect(parsed.agentId).toBe("AGENT-001");
      expect(parsed.timestamp).toBe(1709000000000);
      expect(parsed.metrics.cpu).toBe(45.5);
      expect(parsed.status).toBe("online");
    });
    
    test("includes signature when provided", () => {
      const payload = createMetricsPayload(
        "AGENT-001",
        1709000000000,
        { cpu: 45.5 },
        "online",
        "hmac-sha256-signature"
      );
      
      const encoded = encodeMessage(MessageType.METRICS, payload, Flags.HAS_SIGNATURE);
      const decoded = decodeMessage(encoded);
      const parsed = parseMetricsPayload(decoded.payload);
      
      expect(parsed.signature).toBe("hmac-sha256-signature");
    });
  });
  
  describe("Command Message", () => {
    test("encodes and decodes command payload", () => {
      const payload = createCommandPayload(
        "CMD-123456",
        "ping",
        { host: "8.8.8.8" },
        1709000000000,
        "signature"
      );
      
      const encoded = encodeMessage(MessageType.COMMAND, payload);
      const decoded = decodeMessage(encoded);
      
      expect(decoded.type).toBe(MessageType.COMMAND);
      
      const parsed = parseCommandPayload(decoded.payload);
      expect(parsed.commandId).toBe("CMD-123456");
      expect(parsed.action).toBe("ping");
      expect(parsed.params.host).toBe("8.8.8.8");
    });
  });
  
  describe("Command Result Message", () => {
    test("encodes and decodes command result payload", () => {
      const payload = createCommandResultPayload(
        "CMD-123456",
        { output: "Pong: 12ms", exitCode: 0 },
        "completed",
        1709000000000
      );
      
      const encoded = encodeMessage(MessageType.COMMAND_RESULT, payload);
      const decoded = decodeMessage(encoded);
      
      expect(decoded.type).toBe(MessageType.COMMAND_RESULT);
      
      const parsed = parseCommandResultPayload(decoded.payload);
      expect(parsed.commandId).toBe("CMD-123456");
      expect(parsed.status).toBe("completed");
      expect(parsed.result.output).toBe("Pong: 12ms");
    });
  });
  
  describe("Discovery Message", () => {
    test("encodes and decodes discovery payload", () => {
      const devices = [
        { ip: "192.168.1.1", mac: "AA:BB:CC:DD", n: "router", p: [22, 80, 443] },
        { ip: "192.168.1.2", mac: "EE:FF:GG:HH", n: "server", p: [22, 3389] },
      ];
      
      const payload = createDiscoveryPayload("AGENT-001", 1709000000000, devices);
      const encoded = encodeMessage(MessageType.DISCOVERY, payload);
      const decoded = decodeMessage(encoded);
      
      expect(decoded.type).toBe(MessageType.DISCOVERY);
      
      const parsed = parseDiscoveryPayload(decoded.payload);
      expect(parsed.agentId).toBe("AGENT-001");
      expect(parsed.devices).toHaveLength(2);
      expect(parsed.devices[0].ip).toBe("192.168.1.1");
    });
  });
  
  describe("Message Validation", () => {
    test("throws on invalid magic byte", () => {
      const payload = createMetricsPayload("AGENT-001", Date.now(), { cpu: 50 }, "online");
      const encoded = encodeMessage(MessageType.METRICS, payload);
      
      encoded[0] = 0x00;
      
      expect(() => decodeMessage(encoded)).toThrow("Invalid magic byte");
    });
    
    test("throws on invalid protocol version", () => {
      const payload = createMetricsPayload("AGENT-001", Date.now(), { cpu: 50 }, "online");
      const encoded = encodeMessage(MessageType.METRICS, payload);
      
      encoded[1] = 0x99;
      
      expect(() => decodeMessage(encoded)).toThrow("Unsupported protocol version");
    });
    
    test("throws on invalid checksum", () => {
      const payload = createMetricsPayload("AGENT-001", Date.now(), { cpu: 50 }, "online");
      const encoded = encodeMessage(MessageType.METRICS, payload);
      
      encoded[encoded.length - 1] ^= 0xFF;
      
      expect(() => decodeMessage(encoded)).toThrow("Checksum mismatch");
    });
  });
  
  describe("Payload Size Optimization", () => {
    test("encoded message is smaller than JSON equivalent", () => {
      const payload = createMetricsPayload(
        "AGENT-001",
        1709000000000,
        { cpu: 45.5, ram: 62.3, disk: 78.1, lat: 12.5 },
        "online"
      );
      
      const encoded = encodeMessage(MessageType.METRICS, payload);
      const jsonEquivalent = JSON.stringify({
        agentId: "AGENT-001",
        timestamp: 1709000000000,
        metrics: { cpu: 45.5, ram: 62.3, disk: 78.1, latency: 12.5 },
        status: "online",
      });
      
      expect(encoded.length).toBeLessThan(jsonEquivalent.length);
    });
    
    test("payload with more fields shows better compression", () => {
      const largeMetrics = {
        cpu: 45.5, ram: 62.3, disk: 78.1, lat: 12.5,
        temp: 55.0, gpu: 23.4, net_in: 1024, net_out: 2048,
        containers: 5, battery: 85,
      };
      
      const payload = createMetricsPayload("AGENT-001", 1709000000000, largeMetrics, "online");
      const encoded = encodeMessage(MessageType.METRICS, payload);
      
      const jsonEquivalent = JSON.stringify({
        agentId: "AGENT-001",
        timestamp: 1709000000000,
        metrics: largeMetrics,
        status: "online",
      });
      
      expect(encoded.length).toBeLessThan(jsonEquivalent.length);
    });
  });
});
