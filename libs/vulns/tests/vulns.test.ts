import { describe, it, expect } from "bun:test";
import {
  compareVersions,
  matchesVersion,
  extractVersionFromBanner,
  parseSshBanner,
  parseHttpServer,
  normalizeProduct,
} from "../src/version.ts";
import { lookupVendor } from "../src/oui.ts";
import { getCvesForProduct, getCveById } from "../src/cves.ts";
import {
  detectVulnerabilities,
  detectCveFindings,
  detectHeuristicFindings,
  computeRiskScore,
  computeRiskLabel,
  summarizeFindings,
} from "../src/detect.ts";
import type { DeviceProfile } from "../src/types.ts";

function baseProfile(overrides: Partial<DeviceProfile>): DeviceProfile {
  return {
    ip: "192.168.1.10",
    type: "workstation",
    openPorts: [],
    software: [],
    ...overrides,
  };
}

describe("Version utilities", () => {
  it("should compare simple semantic versions", () => {
    expect(compareVersions("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("3.0", "3.0")).toBe(0);
  });

  it("should handle pN suffixes (OpenSSH_7.2p1 === 7.2)", () => {
    expect(compareVersions("7.2p1", "7.2")).toBe(0);
    expect(compareVersions("9.6", "9.6p1")).toBe(0);
  });

  it("should compare dotted + letter suffixes (2022.83)", () => {
    expect(compareVersions("2020.79", "2022.83")).toBeLessThan(0);
    expect(compareVersions("2022.81", "2022.83")).toBeLessThan(0);
  });

  it("should match version operators", () => {
    expect(matchesVersion("7.2", "lt", "7.7")).toBe(true);
    expect(matchesVersion("7.7", "lt", "7.7")).toBe(false);
    expect(matchesVersion("7.7", "lte", "7.7")).toBe(true);
    expect(matchesVersion("2.4.49", "eq", "2.4.49")).toBe(true);
    expect(matchesVersion("7.2", "lt", "9.6")).toBe(true);
  });

  it("should extract version from banner", () => {
    expect(extractVersionFromBanner("SSH-2.0-OpenSSH_7.2p1")).toBe("7.2");
    expect(extractVersionFromBanner("Apache/2.4.49 (Ubuntu)")).toBe("2.4.49");
  });

  it("should parse SSH banner", () => {
    const ssh = parseSshBanner("SSH-2.0-OpenSSH_7.2p1");
    expect(ssh).toEqual({ name: "openssh", version: "7.2" });

    const dropbear = parseSshBanner("SSH-2.0-dropbear_2019.78");
    expect(dropbear).toEqual({ name: "dropbear", version: "2019.78" });
  });

  it("should parse HTTP server header", () => {
    const apache = parseHttpServer("Apache/2.4.49 (Ubuntu)");
    expect(apache?.name).toBe("apache");
    expect(apache?.version).toBe("2.4.49");

    const nginx = parseHttpServer("nginx/1.18.0");
    expect(nginx?.name).toBe("nginx");
    expect(nginx?.version).toBe("1.18.0");
  });

  it("should normalize product names", () => {
    expect(normalizeProduct("OpenSSH")).toBe("openssh");
    expect(normalizeProduct(" NGINX ")).toBe("nginx");
  });
});

describe("OUI lookup", () => {
  it("should identify known vendors from MAC address", () => {
    expect(lookupVendor("B8:27:EB:12:34:56")?.vendor).toContain("Raspberry");
    expect(lookupVendor("b8-27-eb-11-22-33")?.vendor).toContain("Raspberry");
    expect(lookupVendor("00:11:32:AA:BB:CC")?.vendor).toBe("Synology");
    expect(lookupVendor("00:0C:42:01:02:03")?.vendor).toBe("MikroTik");
    expect(lookupVendor("3C:D9:2B:99:88:77")?.vendor).toContain("HP");
  });

  it("should return null for unknown/invalid MAC", () => {
    expect(lookupVendor("")).toBeNull();
    expect(lookupVendor("ZZ:ZZ:ZZ:AA:BB:CC")).toBeNull();
    expect(lookupVendor("01:02")).toBeNull();
  });

  it("should hint a device type", () => {
    expect(lookupVendor("00:11:32:AA:BB:CC")?.type).toBe("nas");
    expect(lookupVendor("00:C0:B7:99:88:77")?.type).toBe("ups");
  });
});

describe("CVE database", () => {
  it("should find CVEs for known products", () => {
    expect(getCvesForProduct("openssh").length).toBeGreaterThan(0);
    expect(getCvesForProduct("apache").length).toBeGreaterThan(0);
    expect(getCvesForProduct("nginx").length).toBeGreaterThan(0);
    expect(getCvesForProduct("unknown-product").length).toBe(0);
  });

  it("should look up CVE by ID", () => {
    expect(getCveById("CVE-2021-41773")?.severity).toBe("critical");
    expect(getCveById("CVE-2015-3306")?.title).toContain("ProFTPD");
    expect(getCveById("nope")).toBeUndefined();
  });
});

describe("Vulnerability detection", () => {
  it("should detect CVE-2018-15473 for old OpenSSH", () => {
    const profile = baseProfile({
      software: [{ name: "openssh", version: "7.2", protocol: "ssh", port: 22 }],
      openPorts: [22],
    });
    const findings = detectCveFindings(profile);
    expect(findings.some((f) => f.cve_id === "CVE-2018-15473")).toBe(true);
  });

  it("should not flag patched OpenSSH", () => {
    const profile = baseProfile({
      software: [{ name: "openssh", version: "9.8", protocol: "ssh", port: 22 }],
      openPorts: [22],
    });
    const cves = detectCveFindings(profile);
    expect(cves.filter((f) => f.cve_id?.startsWith("CVE-2018-15473")).length).toBe(0);
    expect(cves.filter((f) => f.cve_id?.startsWith("CVE-2023-48795")).length).toBe(0);
  });

  it("should flag Apache 2.4.49 for CVE-2021-41773", () => {
    const profile = baseProfile({
      software: [{ name: "apache", version: "2.4.49", protocol: "http", port: 80 }],
      openPorts: [80],
    });
    const cves = detectCveFindings(profile);
    expect(cves.some((f) => f.cve_id === "CVE-2021-41773")).toBe(true);
  });

  it("should flag ProFTPD 1.3.5", () => {
    const profile = baseProfile({
      software: [{ name: "proftpd", version: "1.3.5", protocol: "ftp", port: 21 }],
      openPorts: [21],
    });
    expect(detectCveFindings(profile).some((f) => f.cve_id === "CVE-2015-3306")).toBe(true);
  });

  it("should flag vsftpd 2.3.4 backdoor", () => {
    const profile = baseProfile({
      software: [{ name: "vsftpd", version: "2.3.4", protocol: "ftp", port: 21 }],
      openPorts: [21],
    });
    expect(detectCveFindings(profile).some((f) => f.cve_id === "CVE-2011-2523")).toBe(true);
  });

  it("should mark known-exploited findings", () => {
    const profile = baseProfile({
      software: [{ name: "openssh", version: "7.2", protocol: "ssh", port: 22 }],
      openPorts: [22],
    });
    const cve = detectCveFindings(profile).find((f) => f.cve_id === "CVE-2018-15473");
    expect(cve?.known_exploited).toBe(true);
  });

  it("should flag telnet exposure", () => {
    const profile = baseProfile({ openPorts: [23] });
    const findings = detectHeuristicFindings(profile);
    expect(findings.some((f) => f.id === "H-EXPOSED-TELNET")).toBe(true);
  });

  it("should flag SNMP public community", () => {
    const profile = baseProfile({ snmpCommunity: "public" });
    const findings = detectHeuristicFindings(profile);
    expect(findings.some((f) => f.id === "H-SNMP-PUBLIC")).toBe(true);
  });

  it("should flag camera default admin", () => {
    const profile = baseProfile({ type: "camera", openPorts: [80, 443] });
    expect(detectHeuristicFindings(profile).some((f) => f.id === "H-CAMERA-DEFAULT-ADMIN")).toBe(true);
  });

  it("should flag exposed database ports", () => {
    const profile = baseProfile({ openPorts: [3306] });
    expect(detectHeuristicFindings(profile).some((f) => f.id === "H-EXPOSED-DATABASE")).toBe(true);
  });

  it("should produce no findings for clean profile", () => {
    const profile = baseProfile({ openPorts: [22], software: [{ name: "openssh", version: "9.8" }] });
    const findings = detectVulnerabilities(profile);
    expect(findings.length).toBe(0);
  });

  it("should combine cve + heuristic findings and dedupe", () => {
    const profile = baseProfile({
      openPorts: [22, 23],
      snmpCommunity: "public",
      software: [{ name: "openssh", version: "7.2", protocol: "ssh", port: 22 }],
    });
    const findings = detectVulnerabilities(profile);
    const ids = findings.map((f) => f.id);
    expect(ids).toContain("CVE-2018-15473");
    expect(ids).toContain("H-EXPOSED-TELNET");
    expect(ids).toContain("H-SNMP-PUBLIC");
  });
});

describe("Risk scoring", () => {
  it("should be 0 for clean profiles", () => {
    const profile = baseProfile({});
    expect(computeRiskScore(profile, [])).toBe(0);
    expect(computeRiskLabel(0)).toBe("clean");
  });

  it("should increase with severity", () => {
    const profile = baseProfile({ type: "workstation" });
    const high = detectHeuristicFindings({
      ...profile,
      openPorts: [23],
    }).filter((f) => f.severity === "high");
    expect(computeRiskScore(profile, high)).toBeGreaterThan(0);
    expect(computeRiskLabel(computeRiskScore(profile, high))).toBe("high");
  });

  it("should cap at 100", () => {
    const profile = baseProfile({ type: "router" });
    const manyCritical = Array.from({ length: 20 }, (_, i) => ({
      id: `CVE-${i}`,
      cve_id: `CVE-${i}`,
      severity: "critical" as const,
      cvss: 10,
      title: "x",
      description: "x",
      remediation: "x",
    }));
    expect(computeRiskScore(profile, manyCritical)).toBeLessThanOrEqual(100);
  });

  it("should summarize findings", () => {
    const profile = baseProfile({
      openPorts: [22, 23, 21, 445],
      software: [{ name: "openssh", version: "7.1" }],
    });
    const findings = detectVulnerabilities(profile);
    const summary = summarizeFindings(findings);
    expect(summary.total).toBe(findings.length);
    expect(summary.high).toBeGreaterThanOrEqual(1);
    expect(summary.maxCvss).toBeGreaterThan(0);
  });
});