import { getDb } from "../db/sqlite.ts";
import { logger } from "../utils/logger.ts";

export interface LDAPConfig {
  host: string;
  port: number;
  base_dn: string;
  bind_dn: string;
  bind_password: string;
  user_filter: string;
  group_filter: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: LDAPConfig = {
  host: "",
  port: 389,
  base_dn: "",
  bind_dn: "",
  bind_password: "",
  user_filter: "(sAMAccountName={username})",
  group_filter: "(member={dn})",
  enabled: false,
};

export function getLDAPConfig(): LDAPConfig {
  const db = getDb();
  try {
    const row = db.prepare("SELECT config FROM configs WHERE agent_id = 'ldap'").get() as { config: string } | null;
    if (row) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(row.config) };
    }
  } catch {
  }
  return DEFAULT_CONFIG;
}

export function saveLDAPConfig(config: Partial<LDAPConfig>): void {
  const db = getDb();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  db.prepare(`
    INSERT INTO configs (agent_id, config, version)
    VALUES ('ldap', ?, 1)
    ON CONFLICT(agent_id) DO UPDATE SET config = ?, version = version + 1
  `).run(JSON.stringify(fullConfig), JSON.stringify(fullConfig));
  
  logger.info("LDAP config saved");
}

export async function testLDAPConnection(config: LDAPConfig): Promise<{ success: boolean; message: string }> {
  try {
    const { execSync } = require("child_process");
    
    const ldapCommand = `ldapsearch -H ldap://${config.host}:${config.port} -D "${config.bind_dn}" -w "${config.bind_password}" -b "${config.base_dn}" -s base "(objectClass=*)" 2>&1`;
    
    execSync(ldapCommand, { encoding: "utf-8", timeout: 10000 });
    
    return { success: true, message: "Connection successful" };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` };
  }
}

export async function searchLDAPUsers(config: LDAPConfig, searchTerm?: string): Promise<any[]> {
  try {
    const { execSync } = require("child_process");
    
    const filter = searchTerm 
      ? config.user_filter.replace("{username}", searchTerm)
      : "(objectClass=user)";
    
    const ldapCommand = `ldapsearch -H ldap://${config.host}:${config.port} -D "${config.bind_dn}" -w "${config.bind_password}" -b "${config.base_dn}" "${filter}" sAMAccountName mail displayName 2>&1`;
    
    const output = execSync(ldapCommand, { encoding: "utf-8", timeout: 15000 });
    
    const users: any[] = [];
    let currentUser: any = {};
    
    for (const line of output.split("\n")) {
      if (line.startsWith("dn:") || line === "") {
        if (Object.keys(currentUser).length > 0) {
          users.push(currentUser);
          currentUser = {};
        }
      } else if (line.startsWith("sAMAccountName:")) {
        currentUser.username = line.replace("sAMAccountName:", "").trim();
      } else if (line.startsWith("mail:")) {
        currentUser.email = line.replace("mail:", "").trim();
      } else if (line.startsWith("displayName:")) {
        currentUser.displayName = line.replace("displayName:", "").trim();
      }
    }
    
    if (Object.keys(currentUser).length > 0) {
      users.push(currentUser);
    }
    
    return users;
  } catch {
    return [];
  }
}

export async function syncLDAPUsers(config: LDAPConfig): Promise<{ synced: number; failed: number }> {
  const users = await searchLDAPUsers(config);
  let synced = 0;
  let failed = 0;
  
  const db = getDb();
  
  for (const user of users) {
    try {
      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(user.username);
      
      if (!existing) {
        db.prepare(`
          INSERT INTO users (id, username, role, status, created_at)
          VALUES (?, ?, 'PUB', 'active', datetime('now'))
        `).run(`ldap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, user.username);
        
        logger.info(`LDAP user synced: ${user.username}`);
        synced++;
      }
    } catch {
      failed++;
    }
  }
  
  return { synced, failed };
}

export function isLDAPEnabled(): boolean {
  const config = getLDAPConfig();
  return config.enabled && config.host !== "";
}
