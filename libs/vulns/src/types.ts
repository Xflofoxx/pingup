export type DeviceType =
  | "workstation"
  | "mobile"
  | "server"
  | "router"
  | "switch"
  | "firewall"
  | "nas"
  | "ups"
  | "printer"
  | "camera"
  | "voip"
  | "iot"
  | "other";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  workstation: "PC / Workstation",
  mobile: "Smartphone / Tablet",
  server: "Server",
  router: "Router",
  switch: "Switch",
  firewall: "Firewall",
  nas: "NAS",
  ups: "Gruppo di continuità (UPS)",
  printer: "Stampante / MFP",
  camera: "Videocamera IP",
  voip: "Telefono VoIP",
  iot: "Dispositivo IoT",
  other: "Altro",
};

export const SENSITIVE_PORTS: Record<number, string> = {
  23: "telnet",
  21: "ftp",
  80: "http",
  443: "https",
  445: "smb",
  3389: "rdp",
  8080: "http-alt",
  8443: "https-alt",
  3306: "mysql",
  5432: "postgres",
  27017: "mongodb",
  6379: "redis",
  1900: "upnp",
};

export interface SoftwareEntry {
  name: string;
  version?: string;
  protocol?: string;
  port?: number;
  banner?: string;
}

export interface DeviceProfile {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  vendorConfidence?: number;
  os?: string;
  type: DeviceType;
  typeConfidence?: number;
  software: SoftwareEntry[];
  openPorts: number[];
  snmpCommunity?: string | null;
  snmpSysDescr?: string;
  snmpSysObjectID?: string;
  lastSeen?: string;
}

export interface AffectedProduct {
  product: string;
  operator: "lt" | "lte" | "eq" | "gt" | "gte";
  version?: string;
}

export interface VulnerabilityFinding {
  id: string;
  cve_id?: string;
  severity: Severity;
  cvss?: number;
  title: string;
  description: string;
  remediation: string;
  affected_product?: string;
  affected_version?: string;
  port?: number;
  protocol?: string;
  known_exploited?: boolean;
}

export interface CveEntry {
  cve_id: string;
  cvss: number;
  severity: Severity;
  title: string;
  description: string;
  remediation: string;
  known_exploited?: boolean;
  affects: AffectedProduct[];
}

export interface DetectionConfig {
  checkHeuristics: boolean;
  checkCves: boolean;
}