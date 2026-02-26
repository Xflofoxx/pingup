import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Database } from "bun:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

mkdirSync(DATA_DIR, { recursive: true });

console.log("Running migrations...");

const sqliteDb = new Database(join(DATA_DIR, "pingup.db"));
sqliteDb.run("PRAGMA journal_mode = WAL");

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    owner_id TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

try {
  sqliteDb.exec("ALTER TABLE agents ADD COLUMN owner_id TEXT");
} catch {}

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    action TEXT,
    params TEXT,
    signature TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    agent_id TEXT PRIMARY KEY,
    config TEXT,
    version INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    timestamp TEXT,
    cpu REAL,
    ram REAL,
    disk REAL,
    latency INTEGER,
    status TEXT
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS discovery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    scan_timestamp TEXT,
    host_ip TEXT,
    latency INTEGER,
    ports TEXT,
    scan_duration INTEGER
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'PUB',
    totp_secret TEXT DEFAULT NULL,
    password_hash TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    status TEXT DEFAULT 'active',
    metadata TEXT
  )
`);

try {
  sqliteDb.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL");
} catch {}

try {
  sqliteDb.exec("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT NULL");
} catch {}

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_commands_agent ON commands(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_agent ON metrics(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS agent_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES agent_groups(id)
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS agent_group_members (
    group_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (group_id, agent_id),
    FOREIGN KEY (group_id) REFERENCES agent_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_groups_parent ON agent_groups(parent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_group_members_agent ON agent_group_members(agent_id)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS alert_thresholds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    metric TEXT NOT NULL,
    operator TEXT NOT NULL,
    value REAL NOT NULL,
    level TEXT NOT NULL DEFAULT 'warning',
    enabled INTEGER DEFAULT 1,
    agent_id TEXT,
    group_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES agent_groups(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_thresholds_agent ON alert_thresholds(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_thresholds_group ON alert_thresholds(group_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_thresholds_metric ON alert_thresholds(metric)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS alert_notifications (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    threshold_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (threshold_id) REFERENCES alert_thresholds(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threshold_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    threshold_value REAL NOT NULL,
    level TEXT NOT NULL,
    triggered_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (threshold_id) REFERENCES alert_thresholds(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_alert_history_agent ON alert_history(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    schedule TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'json',
    recipients TEXT,
    enabled INTEGER DEFAULT 1,
    last_run TEXT,
    next_run TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_reports_next_run ON scheduled_reports(next_run)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS monitored_certificates (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 443,
    agent_id TEXT,
    check_interval INTEGER DEFAULT 3600,
    alert_before_days INTEGER DEFAULT 30,
    enabled INTEGER DEFAULT 1,
    last_check TEXT,
    last_status TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS certificate_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_id TEXT NOT NULL,
    subject TEXT,
    issuer TEXT,
    valid_from TEXT,
    valid_until TEXT,
    days_remaining INTEGER,
    status TEXT,
    checked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (certificate_id) REFERENCES monitored_certificates(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS watched_processes (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    process_name TEXT NOT NULL,
    alert_on_stop INTEGER DEFAULT 1,
    alert_on_high_cpu REAL,
    alert_on_high_memory REAL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS watched_services (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    alert_on_stop INTEGER DEFAULT 1,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_certificates_host ON monitored_certificates(host)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cert_history_cert ON certificate_history(certificate_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_watched_processes_agent ON watched_processes(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_watched_services_agent ON watched_services(agent_id)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS bandwidth_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    interface_name TEXT NOT NULL,
    bytes_sent INTEGER DEFAULT 0,
    bytes_recv INTEGER DEFAULT 0,
    packets_sent INTEGER DEFAULT 0,
    packets_recv INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_bandwidth_agent_time ON bandwidth_metrics(agent_id, timestamp)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_bandwidth_interface ON bandwidth_metrics(interface_name)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS custom_metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'gauge',
    unit TEXT,
    description TEXT,
    aggregation TEXT DEFAULT 'avg',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS custom_metrics_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (metric_id) REFERENCES custom_metrics(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS api_rate_limits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    limit_type TEXT NOT NULL,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS rate_limit_hits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    window_start TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (identifier) REFERENCES users(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'full',
    file_path TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_prefix TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'read',
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_used TEXT,
    user_id TEXT NOT NULL
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id)`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_windows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    recurrence TEXT DEFAULT 'once',
    enabled INTEGER DEFAULT 1,
    agent_ids TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS retention_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'active'
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS tenant_users (
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (tenant_id, user_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_custom_metrics_name ON custom_metrics(name)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_custom_metrics_data_agent ON custom_metrics_data(agent_id)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_custom_metrics_data_time ON custom_metrics_data(timestamp)`);
sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limit_hits(identifier)`);

console.log("SQLite migration complete");
console.log("All migrations complete!");
