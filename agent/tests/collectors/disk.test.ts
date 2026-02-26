import { describe, it, expect } from "bun:test";

describe("Disk Collector", () => {
  describe("collectDisk", () => {
    it("should have platform detection", () => {
      const isWindows = process.platform === "win32";
      const isLinux = process.platform === "linux";
      
      expect(isWindows || isLinux).toBe(true);
    });
  });
});
