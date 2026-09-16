import { describe, test, expect, beforeEach } from "bun:test";
import {
  ingestDiscovery,
  listSiemAssets,
  getSiemAsset,
  getSiemAssetFindings,
  listSiemFindings,
  updateSiemFindingStatus,
  getSiemOverview,
} from "../../src/services/siem";
import { getDb } from "../../src/db/sqlite";

const baseHost = {
  ip: "192.168.1.10",
  latency: 3,
  ports: [22, 443, 23],
  profile: {
    ip: "192.168.1.10",
    vendor: "Cisco",
    os: "Cisco IOS",
    type: "router",
    typeConfidence: 0.9,
    openPorts: [22, 443, 23],
    software: [],
    snmpCommunity: "public",
    snmpSysDescr: "Cisco IOS Software, C2960",
  },
};

describe("SIEM Service", () => {
  beforeEach(() => {
    const db = getDb();
    db.exec("DELETE FROM siem_findings");
    db.exec("DELETE FROM siem_assets");
  });

  test("ingestDiscovery creates asset and findings", () => {
    const result = ingestDiscovery("agent-1", new Date().toISOString(), [
      {
        ...baseHost,
        findings: [
          {
            id: "H-EXPOSED-TELNET",
            severity: "high",
            cvss: 7.5,
            title: "Servizio Telnet esposto",
            description: "Telnet esposto",
            remediation: "Sostituire con SSH",
            port: 23,
            protocol: "telnet",
          },
        ],
        riskScore: 70,
        riskLabel: "high",
      },
    ]);

    expect(result.assetsUpserted).toBe(1);
    expect(result.findingsCreated).toBe(1);

    const assets = listSiemAssets();
    expect(assets.length).toBe(1);
    expect(assets[0].device_type).toBe("router");
    expect(assets[0].vendor).toBe("Cisco");
    expect(assets[0].risk_label).toBe("high");
    expect(assets[0].snmp_community).toBe("public");
  });

  test("ingestDiscovery skips hosts without profile", () => {
    const result = ingestDiscovery("agent-1", new Date().toISOString(), [
      { ip: "192.168.1.99", ports: [] },
    ]);

    expect(result.assetsUpserted).toBe(0);
    expect(listSiemAssets().length).toBe(0);
  });

  test("ingestDiscovery upserts same asset on re-scan", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [{ ...baseHost, findings: [], riskScore: 10, riskLabel: "low" }]);
    ingestDiscovery("agent-1", new Date().toISOString(), [{ ...baseHost, findings: [], riskScore: 90, riskLabel: "critical" }]);

    const assets = listSiemAssets();
    expect(assets.length).toBe(1);
    expect(assets[0].risk_label).toBe("critical");
  });

  test("findings are replaced on re-scan", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [
      { ...baseHost, findings: [{ id: "H-EXPOSED-TELNET", severity: "high", title: "T" }, { id: "H-EXPOSED-FTP", severity: "low", title: "F" }] },
    ]);
    ingestDiscovery("agent-1", new Date().toISOString(), [
      { ...baseHost, findings: [{ id: "H-EXPOSED-TELNET", severity: "high", title: "T" }] },
    ]);

    const findings = getSiemAssetFindings(listSiemAssets()[0].id);
    expect(findings.length).toBe(1);
  });

  test("getSiemOverview aggregates severity counts", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [
      {
        ...baseHost,
        findings: [
          { id: "F1", severity: "critical", title: "C", cvss: 10 },
          { id: "F2", severity: "medium", title: "M", cvss: 5 },
        ],
        riskScore: 100,
        riskLabel: "critical",
      },
    ]);

    const overview = getSiemOverview();
    expect(overview.totalAssets).toBe(1);
    expect(overview.totalFindings).toBe(2);
    expect(overview.bySeverity.critical).toBe(1);
    expect(overview.bySeverity.medium).toBe(1);
    expect(overview.atRiskAssets).toBe(1);
    expect(overview.avgRiskScore).toBe(100);
  });

  test("getSiemAsset returns the asset", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [{ ...baseHost }]);
    const asset = listSiemAssets()[0];
    expect(getSiemAsset(asset.id)?.ip).toBe("192.168.1.10");
    expect(getSiemAsset("missing")).toBeNull();
  });

  test("listSiemFindings filters by severity and status", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [
      {
        ...baseHost,
        findings: [
          { id: "F1", severity: "critical", title: "C" },
          { id: "F2", severity: "low", title: "L" },
        ],
      },
    ]);

    const critical = listSiemFindings({ severity: "critical" });
    expect(critical.length).toBe(1);
    expect(critical[0].severity).toBe("critical");
  });

  test("updateSiemFindingStatus changes status", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [
      { ...baseHost, findings: [{ id: "F1", severity: "high", title: "T" }] },
    ]);

    const finding = listSiemFindings()[0];
    expect(updateSiemFindingStatus(finding.id, "reviewed")).toBe(true);
    expect(listSiemFindings({ status: "reviewed" }).length).toBe(1);
    expect(updateSiemFindingStatus(finding.id, "bogus")).toBe(false);
  });

  test("known exploited flag is stored", () => {
    ingestDiscovery("agent-1", new Date().toISOString(), [
      {
        ...baseHost,
        findings: [{ id: "F1", severity: "high", title: "T", known_exploited: true }],
      },
    ]);

    expect(listSiemFindings({ knownExploited: true }).length).toBe(1);
  });
});