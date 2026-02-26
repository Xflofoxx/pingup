import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface OTAsset {
  id: string;
  name: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  firmware: string | null;
  ip_address: string | null;
  mac_address: string | null;
  location: string | null;
  zone_id: string | null;
  risk_level: string;
  created_at: string;
}

export function createOTAsset(
  name: string,
  type: string,
  manufacturer?: string,
  model?: string,
  firmware?: string,
  ipAddress?: string,
  macAddress?: string,
  location?: string,
  zoneId?: string
): OTAsset {
  const db = getDb();
  const id = `ot_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  
  db.prepare(`
    INSERT INTO ot_assets (id, name, type, manufacturer, model, firmware, ip_address, mac_address, location, zone_id, risk_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', datetime('now'))
  `).run(id, name, type, manufacturer || null, model || null, firmware || null, ipAddress || null, macAddress || null, location || null, zoneId || null);
  
  logger.info(`OT asset created: ${name}`);
  
  return { id, name, type, manufacturer: manufacturer || null, model: model || null, firmware: firmware || null, ip_address: ipAddress || null, mac_address: macAddress || null, location: location || null, zone_id: zoneId || null, risk_level: "medium", created_at: new Date().toISOString() };
}

export function listOTAssets(zoneId?: string): OTAsset[] {
  const db = getDb();
  const query = zoneId ? "SELECT * FROM ot_assets WHERE zone_id = ?" : "SELECT * FROM ot_assets";
  const assets = zoneId ? db.prepare(query).all(zoneId) as OTAsset[] : db.prepare(query).all() as OTAsset[];
  return assets;
}

export function getOTAsset(id: string): OTAsset | null {
  const db = getDb();
  const asset = db.prepare("SELECT * FROM ot_assets WHERE id = ?").get(id) as OTAsset | undefined;
  return asset || null;
}

export function updateOTAsset(id: string, updates: Partial<OTAsset>): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.manufacturer !== undefined) { fields.push("manufacturer = ?"); values.push(updates.manufacturer); }
  if (updates.model !== undefined) { fields.push("model = ?"); values.push(updates.model); }
  if (updates.firmware !== undefined) { fields.push("firmware = ?"); values.push(updates.firmware); }
  if (updates.ip_address !== undefined) { fields.push("ip_address = ?"); values.push(updates.ip_address); }
  if (updates.mac_address !== undefined) { fields.push("mac_address = ?"); values.push(updates.mac_address); }
  if (updates.location !== undefined) { fields.push("location = ?"); values.push(updates.location); }
  if (updates.zone_id !== undefined) { fields.push("zone_id = ?"); values.push(updates.zone_id); }
  if (updates.risk_level !== undefined) { fields.push("risk_level = ?"); values.push(updates.risk_level); }
  
  if (fields.length === 0) return false;
  values.push(id);
  
  const result = db.prepare(`UPDATE ot_assets SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function deleteOTAsset(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM ot_assets WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAssetVulnerabilities(assetId: string): any[] {
  const db = getDb();
  return db.prepare("SELECT * FROM vulnerability_scans WHERE asset_id = ? ORDER BY scan_date DESC").all(assetId);
}
