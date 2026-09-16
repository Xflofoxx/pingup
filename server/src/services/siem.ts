import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface SiemAsset {
  id: string;
  agent_id: string;
  ip: string | null;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  os: string | null;
  device_type: string | null;
  type_confidence: number | null;
  ports: string;
  software: string;
  risk_score: number;
  risk_label: string;
  snmp_community: string | null;
  snmp_sysdescr: string | null;
  first_seen: string;
  last_seen: string;
  status: string;
}

export interface SiemFinding {
  id: string;
  asset_id: string;
  cve_id: string | null;
  severity: string;
  cvss: number | null;
  title: string;
  description: string;
  remediation: string;
  port: number | null;
  protocol: string | null;
  known_exploited: number;
  status: string;
  first_detected: string;
  last_seen: string;
}

interface IngestHost {
  ip?: string;
  mac?: string;
  hostname?: string;
  ports?: number[];
  latency?: number;
  profile?: {
    ip?: string;
    mac?: string;
    hostname?: string;
    vendor?: string;
    os?: string;
    type?: string;
    typeConfidence?: number;
    software?: Array<Record<string, unknown>>;
    openPorts?: number[];
    snmpCommunity?: string | null;
    snmpSysDescr?: string;
  } | null;
  findings?: Array<{
    id?: string;
    cve_id?: string;
    severity?: string;
    cvss?: number;
    title?: string;
    description?: string;
    remediation?: string;
    port?: number;
    protocol?: string;
    known_exploited?: boolean;
  }>;
  riskScore?: number;
  riskLabel?: string;
}

function hashId(input: string, prefix: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `${prefix}_${hash.toString(36)}`;
}

export function ingestDiscovery(agentId: string, timestamp: string, hosts: IngestHost[]): { assetsUpserted: number; findingsCreated: number } {
  const db = getDb();
  const now = timestamp || new Date().toISOString();
  let assetsUpserted = 0;
  let findingsCreated = 0;

  const assetStmt = db.prepare(`
    INSERT INTO siem_assets (id, agent_id, ip, mac, hostname, vendor, os, device_type, type_confidence, ports, software, risk_score, risk_label, snmp_community, snmp_sysdescr, first_seen, last_seen, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT first_seen FROM siem_assets WHERE id = ?), ?), ?, 'online')
    ON CONFLICT(id) DO UPDATE SET
      ip = excluded.ip,
      mac = excluded.mac,
      hostname = excluded.hostname,
      vendor = excluded.vendor,
      os = excluded.os,
      device_type = excluded.device_type,
      type_confidence = excluded.type_confidence,
      ports = excluded.ports,
      software = excluded.software,
      risk_score = excluded.risk_score,
      risk_label = excluded.risk_label,
      snmp_community = excluded.snmp_community,
      snmp_sysdescr = excluded.snmp_sysdescr,
      last_seen = excluded.last_seen,
      status = 'online'
  `);

  const deleteFindings = db.prepare("DELETE FROM siem_findings WHERE asset_id = ?");
  const findingStmt = db.prepare(`
    INSERT INTO siem_findings (id, asset_id, cve_id, severity, cvss, title, description, remediation, port, protocol, known_exploited, status, first_detected, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `);

  for (const host of hosts) {
    if (!host.profile) continue;

    const assetId = hashId(`${agentId}:${host.profile.ip || host.ip}`, "siem");
    const ports = host.ports || host.profile.openPorts || [];
    const software = host.profile.software || [];

    assetStmt.run(
      assetId,
      agentId,
      host.profile.ip || host.ip || null,
      host.profile.mac || host.mac || null,
      host.profile.hostname || host.hostname || null,
      host.profile.vendor || null,
      host.profile.os || null,
      host.profile.type || "other",
      host.profile.typeConfidence ?? null,
      JSON.stringify(ports),
      JSON.stringify(software),
      host.riskScore ?? 0,
      host.riskLabel || "clean",
      host.profile.snmpCommunity ?? null,
      host.profile.snmpSysDescr ?? null,
      assetId,
      now,
      now
    );
    assetsUpserted++;

    deleteFindings.run(assetId);

    const findings = host.findings || [];
    for (const finding of findings) {
      const findingId = hashId(`${assetId}:${finding.id || finding.cve_id || "finding"}`, "fnd");
      findingStmt.run(
        findingId,
        assetId,
        finding.cve_id || null,
        finding.severity || "info",
        finding.cvss ?? null,
        finding.title || "",
        finding.description || "",
        finding.remediation || "",
        finding.port ?? null,
        finding.protocol || null,
        finding.known_exploited ? 1 : 0,
        now,
        now
      );
      findingsCreated++;
    }
  }

  logger.info(`SIEM ingest from ${agentId}: ${assetsUpserted} assets, ${findingsCreated} findings`);
  return { assetsUpserted, findingsCreated };
}

export function listSiemAssets(filter?: { deviceType?: string; riskLabel?: string; status?: string }): SiemAsset[] {
  const db = getDb();
  let query = "SELECT * FROM siem_assets WHERE 1=1";
  const values: string[] = [];

  if (filter?.deviceType) {
    query += " AND device_type = ?";
    values.push(filter.deviceType);
  }
  if (filter?.riskLabel) {
    query += " AND risk_label = ?";
    values.push(filter.riskLabel);
  }
  if (filter?.status) {
    query += " AND status = ?";
    values.push(filter.status);
  }

  query += " ORDER BY risk_score DESC, last_seen DESC";
  return db.prepare(query).all(...values) as SiemAsset[];
}

export function getSiemAsset(id: string): SiemAsset | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM siem_assets WHERE id = ?").get(id) as SiemAsset | undefined) || null;
}

export function getSiemAssetFindings(assetId: string, status?: string): SiemFinding[] {
  const db = getDb();
  const query = status
    ? "SELECT * FROM siem_findings WHERE asset_id = ? AND status = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, cvss DESC"
    : "SELECT * FROM siem_findings WHERE asset_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, cvss DESC";
  return status
    ? db.prepare(query).all(assetId, status) as SiemFinding[]
    : db.prepare(query).all(assetId) as SiemFinding[];
}

export function listSiemFindings(filter?: { severity?: string; status?: string; knownExploited?: boolean }): SiemFinding[] {
  const db = getDb();
  let query = "SELECT * FROM siem_findings WHERE 1=1";
  const values: string[] = [];

  if (filter?.severity) {
    query += " AND severity = ?";
    values.push(filter.severity);
  }
  if (filter?.status) {
    query += " AND status = ?";
    values.push(filter.status);
  }
  if (filter?.knownExploited) {
    query += " AND known_exploited = 1";
  }

  query += " ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, cvss DESC, last_seen DESC";
  return db.prepare(query).all(...values) as SiemFinding[];
}

export function updateSiemFindingStatus(id: string, status: string): boolean {
  if (!["open", "reviewed", "dismissed"].includes(status)) return false;
  const db = getDb();
  const result = db.prepare("UPDATE siem_findings SET status = ? WHERE id = ?").run(status, id);
  return result.changes > 0;
}

export function getSiemOverview(): {
  totalAssets: number;
  totalFindings: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  atRiskAssets: number;
  avgRiskScore: number;
  lastScan: string | null;
} {
  const db = getDb();

  const totalAssets = (db.prepare("SELECT COUNT(*) as c FROM siem_assets").get() as { c: number }).c;
  const totalFindings = (db.prepare("SELECT COUNT(*) as c FROM siem_findings").get() as { c: number }).c;
  const atRiskAssets = (db.prepare("SELECT COUNT(*) as c FROM siem_assets WHERE risk_score >= 30").get() as { c: number }).c;
  const avgRiskScore = (db.prepare("SELECT COALESCE(AVG(risk_score), 0) as a FROM siem_assets").get() as { a: number }).a;
  const lastScan = (db.prepare("SELECT MAX(last_seen) as l FROM siem_assets").get() as { l: string | null }).l;

  const severityRows = db.prepare("SELECT severity, COUNT(*) as c FROM siem_findings WHERE status = 'open' GROUP BY severity").all() as Array<{ severity: string; c: number }>;
  const statusRows = db.prepare("SELECT status, COUNT(*) as c FROM siem_findings GROUP BY status").all() as Array<{ status: string; c: number }>;
  const typeRows = db.prepare("SELECT device_type, COUNT(*) as c FROM siem_assets GROUP BY device_type").all() as Array<{ device_type: string; c: number }>;

  const bySeverity: Record<string, number> = {};
  for (const row of severityRows) bySeverity[row.severity] = row.c;
  const byStatus: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = row.c;
  const byType: Record<string, number> = {};
  for (const row of typeRows) byType[row.device_type || "other"] = row.c;

  return {
    totalAssets,
    totalFindings,
    bySeverity,
    byStatus,
    byType,
    atRiskAssets,
    avgRiskScore: Math.round(avgRiskScore),
    lastScan,
  };
}

export function getNewCriticalFindingCount(sinceTimestamp: string): number {
  const db = getDb();
  return (db.prepare(
    "SELECT COUNT(*) as c FROM siem_findings WHERE status = 'open' AND severity IN ('critical', 'high') AND first_detected >= ?"
  ).get(sinceTimestamp) as { c: number }).c;
}