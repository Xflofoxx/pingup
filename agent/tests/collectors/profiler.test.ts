import { describe, test, expect } from "bun:test";
import {
  guessOs,
  inferVendor,
  inferType,
  grabBanner,
  parseBanner,
  profileHost,
} from "../../src/collectors/profiler";

describe("OS classification", () => {
  test("recognizes Cisco IOS", () => {
    expect(guessOs("Cisco IOS Software, Catalyst 2960")).toBe("Cisco IOS");
  });

  test("recognizes Windows", () => {
    expect(guessOs("Microsoft Windows Server 2016")).toBe("Microsoft Windows");
  });

  test("recognizes Linux", () => {
    expect(guessOs("Linux node-01 5.15.0-91-generic")).toBe("Linux");
  });

  test("returns undefined for unknown", () => {
    expect(guessOs("Unknown device")).toBeUndefined();
  });
});

describe("Vendor classification", () => {
  test("recognizes Synology", () => {
    expect(inferVendor("Linux Synology DS220+ 4.4")).toBe("Synology");
  });

  test("recognizes Cisco", () => {
    expect(inferVendor("Cisco IOS Software, C2960")).toBe("Cisco");
  });

  test("returns undefined for unknown", () => {
    expect(inferVendor("Some random text")).toBeUndefined();
  });
});

describe("Type classification", () => {
  test("classifies router from sysDescr", () => {
    const result = inferType([], "Cisco IOS Software, Catalyst 2960");
    expect(result.type).toBe("router");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("classifies server from sysDescr", () => {
    const result = inferType([], "Linux Ubuntu 22.04 LTS");
    expect(result.type).toBe("server");
  });

  test("classifies workstation from Windows sysDescr", () => {
    const result = inferType([], "Windows 10 Pro 22H2");
    expect(result.type).toBe("workstation");
  });

  test("classifies NAS from QNAP sysDescr", () => {
    const result = inferType([], "QNAP TS-453Be 4.5.4");
    expect(result.type).toBe("nas");
  });

  test("classifies printer from port 9100", () => {
    const result = inferType([9100, 80], "");
    expect(result.type).toBe("printer");
  });

  test("classifies VoIP from port 5060", () => {
    const result = inferType([5060], "");
    expect(result.type).toBe("voip");
  });

  test("classifies database host as server", () => {
    const result = inferType([3306], "");
    expect(result.type).toBe("server");
  });

  test("uses vendor MAC hint", () => {
    const result = inferType([], "", "router");
    expect(result.type).toBe("router");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test("defaults to other", () => {
    const result = inferType([], "", undefined);
    expect(result.type).toBe("other");
  });
});

describe("Banner grabbing", () => {
  test("parses SSH banner from a live server", async () => {
    const server = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        open(socket) {
          socket.write("SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6\r\n");
        },
        data() {},
      },
    });

    try {
      const entry = await parseBanner("127.0.0.1", server.port, "\r\n", 1000);
      expect(entry).not.toBeNull();
      expect(entry?.name).toBe("openssh");
      expect(entry?.version).toBe("8.9");
      expect(entry?.port).toBe(server.port);
    } finally {
      server.stop();
    }
  });

  test("grabBanner reads banner data", async () => {
    const server = Bun.listen({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        open(socket) {
          socket.write("220 FTP ready\r\n");
        },
        data() {},
      },
    });

    try {
      const banner = await grabBanner("127.0.0.1", server.port, "\r\n", 1000);
      expect(banner).toContain("220 FTP ready");
    } finally {
      server.stop();
    }
  });
});

describe("profiler integration", () => {
  test("profileHost builds profile and flags telnet exposure", async () => {
    const result = await profileHost(
      { ip: "127.0.0.1", ports: [23] },
      { bannerTimeout: 0, enableSnmp: false }
    );
    expect(result.profile.ip).toBe("127.0.0.1");
    expect(result.profile.type).toBeDefined();
    const telnet = result.findings.find((f) => f.id === "H-EXPOSED-TELNET");
    expect(telnet).toBeDefined();
  });

  test("risk label present", async () => {
    const result = await profileHost(
      { ip: "127.0.0.1", mac: "00:11:32:AA:BB:CC", ports: [23, 445] },
      { bannerTimeout: 0, enableSnmp: false }
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(["clean", "low", "medium", "high", "critical"]).toContain(result.riskLabel);
  });
});