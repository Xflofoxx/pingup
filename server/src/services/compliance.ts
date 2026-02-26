import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface ComplianceZone {
  id: string;
  name: string;
  description: string;
  security_level: number;
  network_segment: string;
  devices: string[];
  created_at: string;
}

export interface ComplianceControl {
  id: string;
  zone_id: string;
  control_id: string;
  title: string;
  description: string;
  status: "compliant" | "non_compliant" | "not_applicable" | "needs_review";
  last_checked: string;
  remediation: string | null;
}

export function createZone(name: string, description: string, securityLevel: number, networkSegment: string): ComplianceZone {
  const db = getDb();
  const id = `zone_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  
  db.prepare(`
    INSERT INTO compliance_zones (id, name, description, security_level, network_segment, devices, created_at)
    VALUES (?, ?, ?, ?, ?, '[]', datetime('now'))
  `).run(id, name, description, securityLevel, networkSegment);
  
  return {
    id,
    name,
    description,
    security_level: securityLevel,
    network_segment: networkSegment,
    devices: [],
    created_at: new Date().toISOString(),
  };
}

export function listZones(): ComplianceZone[] {
  const db = getDb();
  const zones = db.prepare("SELECT * FROM compliance_zones ORDER BY name").all() as any[];
  
  return zones.map(z => ({
    id: z.id,
    name: z.name,
    description: z.description,
    security_level: z.security_level,
    network_segment: z.network_segment,
    devices: z.devices ? JSON.parse(z.devices) : [],
    created_at: z.created_at,
  }));
}

export function getZone(id: string): ComplianceZone | null {
  const db = getDb();
  const zone = db.prepare("SELECT * FROM compliance_zones WHERE id = ?").get(id) as any;
  
  if (!zone) return null;
  
  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    security_level: zone.security_level,
    network_segment: zone.network_segment,
    devices: zone.devices ? JSON.parse(zone.devices) : [],
    created_at: zone.created_at,
  };
}

export function addDeviceToZone(zoneId: string, deviceId: string): boolean {
  const db = getDb();
  const zone = getZone(zoneId);
  if (!zone) return false;
  
  const devices = [...zone.devices, deviceId];
  db.prepare("UPDATE compliance_zones SET devices = ? WHERE id = ?").run(JSON.stringify(devices), zoneId);
  
  return true;
}

export function checkZoneCompliance(zoneId: string): ComplianceControl[] {
  const zone = getZone(zoneId);
  if (!zone) return [];
  
  const controls: ComplianceControl[] = [
    {
      id: "1",
      zone_id: zoneId,
      control_id: "IAC-1",
      title: "Inventory of Assets",
      description: "All industrial assets are inventoried",
      status: zone.devices.length > 0 ? "compliant" : "needs_review",
      last_checked: new Date().toISOString(),
      remediation: null,
    },
    {
      id: "2",
      zone_id: zoneId,
      control_id: "IAC-2",
      title: "Asset Configuration",
      description: "Asset configurations are documented",
      status: "needs_review",
      last_checked: new Date().toISOString(),
      remediation: "Review asset configurations",
    },
    {
      id: "3",
      zone_id: zoneId,
      control_id: "ISM-1",
      title: "Network Segmentation",
      description: "Network is properly segmented",
      status: zone.network_segment ? "compliant" : "needs_review",
      last_checked: new Date().toISOString(),
      remediation: null,
    },
  ];
  
  return controls;
}

export function getComplianceReport(): { zones: ComplianceZone[]; total_controls: number; compliant: number; non_compliant: number } {
  const zones = listZones();
  let total_controls = 0;
  let compliant = 0;
  let non_compliant = 0;
  
  for (const zone of zones) {
    const controls = checkZoneCompliance(zone.id);
    total_controls += controls.length;
    compliant += controls.filter(c => c.status === "compliant").length;
    non_compliant += controls.filter(c => c.status === "non_compliant").length;
  }
  
  return { zones, total_controls, compliant, non_compliant };
}
