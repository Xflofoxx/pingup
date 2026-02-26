import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface ISMSControl {
  id: string;
  domain: string;
  control_id: string;
  title: string;
  description: string;
  implementation: string;
  status: "implemented" | "partial" | "not_implemented" | "not_applicable";
  evidence: string[];
  last_review: string;
  owner: string | null;
}

const ISMS_CONTROLS = [
  { domain: "A.5", control_id: "A.5.1", title: "Information Security Policies", description: "Policies for information security" },
  { domain: "A.6", control_id: "A.6.1", title: "Organization of Information Security", description: "Internal organization" },
  { domain: "A.7", control_id: "A.7.1", title: "Human Resource Security", description: "Security responsibilities prior to employment" },
  { domain: "A.8", control_id: "A.8.1", title: "Asset Management", description: "Responsibility for assets" },
  { domain: "A.9", control_id: "A.9.1", title: "Access Control", description: "Business requirements of access control" },
  { domain: "A.10", control_id: "A.10.1", title: "Cryptography", title: "Cryptographic controls" },
  { domain: "A.11", control_id: "A.11.1", title: "Physical and Environmental Security", description: "Secure areas" },
  { domain: "A.12", control_id: "A.12.1", title: "Operations Security", description: "Operational procedures and responsibilities" },
  { domain: "A.13", control_id: "A.13.1", title: "Communications Security", description: "Network security management" },
  { domain: "A.14", control_id: "A.14.1", title: "System Acquisition, Development and Maintenance", description: "Security requirements" },
  { domain: "A.15", control_id: "A.15.1", title: "Supplier Relationships", description: "Information security in supplier relationships" },
  { domain: "A.16", control_id: "A.16.1", title: "Information Security Incident Management", description: "Management of information security incidents" },
  { domain: "A.17", control_id: "A.17.1", title: "Business Continuity Management", description: "Information security aspects" },
  { domain: "A.18", control_id: "A.18.1", title: "Compliance", description: "Compliance with legal requirements" },
];

export function initializeISMSControls(): void {
  const db = getDb();
  const existing = db.prepare("SELECT COUNT(*) as count FROM isms_controls").get() as { count: number };
  
  if (existing.count === 0) {
    for (const ctrl of ISMS_CONTROLS) {
      const id = `isms_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
      db.prepare(`
        INSERT INTO isms_controls (id, domain, control_id, title, description, implementation, status, evidence, last_review, owner)
        VALUES (?, ?, ?, ?, ?, '', 'not_implemented', '[]', datetime('now'), NULL)
      `).run(id, ctrl.domain, ctrl.control_id, ctrl.title, ctrl.description);
    }
    logger.info("ISMS controls initialized");
  }
}

export function listISMSControls(): ISMSControl[] {
  const db = getDb();
  const controls = db.prepare("SELECT * FROM isms_controls ORDER BY domain, control_id").all() as any[];
  return controls.map(c => ({
    id: c.id,
    domain: c.domain,
    control_id: c.control_id,
    title: c.title,
    description: c.description,
    implementation: c.implementation,
    status: c.status,
    evidence: c.evidence ? JSON.parse(c.evidence) : [],
    last_review: c.last_review,
    owner: c.owner,
  }));
}

export function updateISMSControl(id: string, updates: Partial<ISMSControl>): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.implementation !== undefined) { fields.push("implementation = ?"); values.push(updates.implementation); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.evidence !== undefined) { fields.push("evidence = ?"); values.push(JSON.stringify(updates.evidence)); }
  if (updates.owner !== undefined) { fields.push("owner = ?"); values.push(updates.owner); }
  
  fields.push("last_review = datetime('now')");
  
  if (fields.length === 1) return false;
  values.push(id);
  
  const result = db.prepare(`UPDATE isms_controls SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function getISMSReport(): { total: number; implemented: number; partial: number; not_implemented: number; compliance_percent: number } {
  const controls = listISMSControls();
  const total = controls.length;
  const implemented = controls.filter(c => c.status === "implemented").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const not_implemented = controls.filter(c => c.status === "not_implemented").length;
  
  return {
    total,
    implemented,
    partial,
    not_implemented,
    compliance_percent: Math.round(((implemented + partial * 0.5) / total) * 100),
  };
}
