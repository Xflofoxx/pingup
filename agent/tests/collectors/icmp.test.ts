import { describe, it, expect } from "bun:test";
import { ping, pingMultiple, continuousPing } from "../../src/collectors/icmp.ts";

describe("ICMP Ping Collector", () => {
  describe("ping", () => {
    it("should return ping result with all fields", async () => {
      const result = await ping("127.0.0.1", 1000);
      
      expect(result).toHaveProperty("host");
      expect(result).toHaveProperty("latency");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("timestamp");
      expect(result.host).toBe("127.0.0.1");
    });

    it("should handle localhost", async () => {
      const result = await ping("localhost", 1000);
      
      expect(result.status).toBeDefined();
      expect(result.latency).toBeDefined();
    });

    it("should handle invalid host", async () => {
      const result = await ping("192.0.2.1", 500);
      
      expect(result.status).toBe("offline");
      expect(result.latency).toBe(-1);
    });
  });

  describe("pingMultiple", () => {
    it("should ping multiple hosts", async () => {
      const results = await pingMultiple(["127.0.0.1", "localhost"], 1000);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("host");
      expect(results[1]).toHaveProperty("host");
    });

    it("should return results in order", async () => {
      const results = await pingMultiple(["127.0.0.1"], 1000);
      
      expect(results[0].host).toBe("127.0.0.1");
    });
  });

  describe("continuousPing", () => {
    it("should return stop function", async () => {
      let count = 0;
      const stop = await continuousPing("127.0.0.1", (result) => {
        count++;
      }, 100);
      
      await new Promise(r => setTimeout(r, 250));
      stop();
      
      expect(count).toBeGreaterThan(0);
    });

    it("should stop when stop function called", async () => {
      let count = 0;
      const stop = await continuousPing("127.0.0.1", (result) => {
        count++;
      }, 100);
      
      await new Promise(r => setTimeout(r, 250));
      const countBeforeStop = count;
      stop();
      await new Promise(r => setTimeout(r, 200));
      
      expect(count).toBe(countBeforeStop);
    });
  });
});
