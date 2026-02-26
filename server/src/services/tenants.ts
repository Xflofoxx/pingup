import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, any>;
  created_at: string;
  status: "active" | "suspended";
}

export interface TenantUser {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}

export function createTenant(name: string, domain: string, ownerId: string): Tenant {
  const db = getDb();
  
  const id = `tenant_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  
  db.prepare(`
    INSERT INTO tenants (id, name, domain, settings, created_at, status)
    VALUES (?, ?, ?, '{}', datetime('now'), 'active')
  `).run(id, name, domain);
  
  db.prepare(`
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (?, ?, 'owner')
  `).run(id, ownerId);
  
  logger.info(`Tenant created: ${name}`);
  
  return {
    id,
    name,
    domain,
    settings: {},
    created_at: new Date().toISOString(),
    status: "active",
  };
}

export function listTenants(): Tenant[] {
  const db = getDb();
  
  const tenants = db.prepare(`
    SELECT * FROM tenants ORDER BY name ASC
  `).all() as any[];
  
  return tenants.map(t => ({
    id: t.id,
    name: t.name,
    domain: t.domain,
    settings: t.settings ? JSON.parse(t.settings) : {},
    created_at: t.created_at,
    status: t.status,
  }));
}

export function getTenant(id: string): Tenant | null {
  const db = getDb();
  
  const tenant = db.prepare(`
    SELECT * FROM tenants WHERE id = ?
  `).get(id) as any;
  
  if (!tenant) return null;
  
  return {
    id: tenant.id,
    name: tenant.name,
    domain: tenant.domain,
    settings: tenant.settings ? JSON.parse(tenant.settings) : {},
    created_at: tenant.created_at,
    status: tenant.status,
  };
}

export function getUserTenants(userId: string): Tenant[] {
  const db = getDb();
  
  const tenants = db.prepare(`
    SELECT t.* FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.user_id = ?
    ORDER BY t.name ASC
  `).all(userId) as any[];
  
  return tenants.map(t => ({
    id: t.id,
    name: t.name,
    domain: t.domain,
    settings: t.settings ? JSON.parse(t.settings) : {},
    created_at: t.created_at,
    status: t.status,
  }));
}

export function addUserToTenant(tenantId: string, userId: string, role: "admin" | "member" = "member"): boolean {
  const db = getDb();
  
  try {
    db.prepare(`
      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(tenantId, userId, role);
    
    return true;
  } catch {
    return false;
  }
}

export function removeUserFromTenant(tenantId: string, userId: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM tenant_users WHERE tenant_id = ? AND user_id = ? AND role != 'owner'
  `).run(tenantId, userId);
  
  return result.changes > 0;
}

export function isUserInTenant(userId: string, tenantId: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT 1 FROM tenant_users WHERE tenant_id = ? AND user_id = ?
  `).get(tenantId, userId);
  
  return !!result;
}

export function getUserTenantRole(userId: string, tenantId: string): string | null {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT role FROM tenant_users WHERE tenant_id = ? AND user_id = ?
  `).get(tenantId, userId) as { role: string } | null;
  
  return result?.role || null;
}

export function updateTenantSettings(tenantId: string, settings: Record<string, any>): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    UPDATE tenants SET settings = ? WHERE id = ?
  `).run(JSON.stringify(settings), tenantId);
  
  return result.changes > 0;
}
