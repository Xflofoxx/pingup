# Server Specification

> **Version**: 1.1.0  
> **Component**: Server  
> **Related Requirements**: SERV-001 through SERV-010  
> **Status**: Implementation Ready

## 1. Overview

The Pingup Server is the central hub for collecting metrics, managing agents, orchestrating remote commands, and storing network discovery data. Built with Bun.js and Hono for maximum performance.

## 2. Technical Stack

| Component | Technology | Version | Justification |
|-----------|------------|---------|----------------|
| Runtime | Bun.js | 1.1+ | High performance, native TypeScript |
| Framework | Hono | 4.0+ | Lightweight, fast, Cloudflare compatible |
| Persistent DB | SQLite (better-sqlite3) | 11.0+ | ACID compliance for agent/command data |
| Analytics DB | DuckDB | 1.0+ | OLAP for time-series metrics |
| Language | TypeScript | 5.0+ | Type safety |
| Auth | JWT/JOSE | 5.2+ | Token management |

## 3. Architecture

### 3.1 Directory Structure

```
server/src/
├── index.ts              # Entry point & app setup
├── routes/
│   ├── agents.ts         # Agent CRUD operations
│   ├── metrics.ts       # Metrics ingestion
│   ├── commands.ts      # Command queue management
│   ├── config.ts        # Configuration management
│   └── discovery.ts     # Network discovery data
├── services/
│   ├── agent.ts         # Agent business logic
│   ├── metrics.ts       # Metrics processing
│   └── commands.ts      # Command execution logic
├── db/
│   ├── sqlite.ts        # SQLite connection
│   ├── duckdb.ts       # DuckDB connection
│   └── migrate.ts      # Database migrations
├── middleware/
│   └── auth.ts          # Authentication & signature verification
└── utils/
    └── logger.ts        # Logging utility
```

## 4. API Specification

### 4.1 Endpoints

#### Agents

| Method | Path | Requirement | Description |
|--------|------|-------------|-------------|
| GET | /api/v1/agents | SERV-003 | List all agents |
| GET | /api/v1/agents/:id | SERV-003 | Get agent details |
| POST | /api/v1/agents | SERV-003 | Register new agent |
| DELETE | /api/v1/agents/:id | SERV-003 | Remove agent |
| POST | /api/v1/agents/:id/heartbeat | SERV-003 | Agent heartbeat |

#### Metrics

| Method | Path | Requirement | Description |
|--------|------|-------------|-------------|
| POST | /api/v1/metrics | SERV-001 | Receive agent metrics |
| GET | /api/v1/metrics/:agentId | SERV-009 | Get agent metrics history |

#### Commands

| Method | Path | Requirement | Description |
|--------|------|-------------|-------------|
| GET | /api/v1/commands | SERV-004 | List commands |
| GET | /api/v1/commands/pending/:agentId | SERV-004 | Get pending commands |
| POST | /api/v1/commands | SERV-004 | Create command |
| POST | /api/v1/commands/:id/result | SERV-005 | Report command result |

#### Configuration

| Method | Path | Requirement | Description |
|--------|------|-------------|-------------|
| GET | /api/v1/config/:agentId | SERV-006 | Get agent config |
| POST | /api/v1/config/:agentId | SERV-006 | Update agent config |

#### Discovery

| Method | Path | Requirement | Description |
|--------|------|-------------|-------------|
| POST | /api/v1/discovery | SERV-010 | Receive discovery results |
| GET | /api/v1/discovery/:agentId | SERV-010 | Get discovery history |
| GET | /api/v1/discovery/:agentId/latest | SERV-010 | Get latest discovery |

#### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |

### 4.2 Request/Response Formats

#### Metrics Payload (POST /api/v1/metrics)

```json
{
  "agentId": "AGENT-001",
  "timestamp": "2026-02-25T10:00:00Z",
  "metrics": {
    "cpu": 12.5,
    "ram": 43.2,
    "disk": 71.4,
    "latency": 8
  },
  "status": "online",
  "signature": "base64-encoded-signature"
}
```

#### Discovery Payload (POST /api/v1/discovery)

```json
{
  "agentId": "AGENT-001",
  "timestamp": "2026-02-25T10:00:00Z",
  "discovery": {
    "hosts": [
      {
        "ip": "192.168.1.1",
        "latency": 2,
        "ports": [80, 443]
      }
    ],
    "duration": 15230
  },
  "signature": "base64-encoded-signature"
}
```

#### Command (from server to agent)

```json
{
  "commandId": "CMD-2026-001",
  "action": "restart_service",
  "params": {
    "service": "network-monitor"
  },
  "signature": "base64-encoded-signature"
}
```

## 5. Database Schema

### 5.1 SQLite (pingup.db)

```sql
-- Agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Commands table
CREATE TABLE commands (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  action TEXT,
  params TEXT,
  signature TEXT,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Configurations table
CREATE TABLE configs (
  agent_id TEXT PRIMARY KEY,
  config TEXT,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes
CREATE INDEX idx_commands_agent ON commands(agent_id);
CREATE INDEX idx_commands_status ON commands(status);
```

### 5.2 DuckDB (analytics.duckdb)

```sql
-- Metrics time-series
CREATE TABLE metrics (
  agent_id TEXT,
  timestamp TIMESTAMP,
  cpu DOUBLE,
  ram DOUBLE,
  disk DOUBLE,
  latency INTEGER,
  status TEXT
);

-- Network discovery
CREATE TABLE discovery (
  agent_id TEXT,
  scan_timestamp TIMESTAMP,
  host_ip TEXT,
  latency INTEGER,
  ports TEXT,
  scan_duration INTEGER
);

-- Indexes
CREATE INDEX idx_metrics_agent ON metrics(agent_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_discovery_agent ON discovery(agent_id);
CREATE INDEX idx_discovery_timestamp ON discovery(scan_timestamp);
```

## 6. Security

### 6.1 Authentication

- Bearer token via `Authorization` header
- Token validation on all protected endpoints

### 6.2 Message Signing

- HMAC-SHA256 signature verification
- All payloads must include signature
- Server signs commands sent to agents

## 7. Performance Targets

| Metric | Target | Verification Method |
|--------|--------|---------------------|
| Server startup | < 500ms | Benchmark |
| API latency (p50) | < 50ms | Load test |
| Metrics throughput | 1000+ inserts/sec | Load test |
| Discovery query | < 1s for 30 days | Query test |
| Memory footprint | < 100MB | Resource monitor |

## 8. Development Commands

```bash
# Install dependencies
bun install

# Run migrations
bun run migrate

# Development mode
bun run dev

# Production
bun run start

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Lint
bun run lint
```

## 9. Implementation Checklist

### Pre-Implementation Gates

- [x] Simplicity Gate: Using ≤3 projects? (server, agent, libs)
- [x] Anti-Abstraction Gate: Using framework directly (Hono)?
- [x] Integration-First Gate: Contracts defined?

### Requirement Traceability

- [ ] SERV-001: Accept metrics via REST API → routes/metrics.ts
- [ ] SERV-002: Store metrics in DuckDB → db/duckdb.ts
- [ ] SERV-003: Manage agent registry → services/agent.ts
- [ ] SERV-004: Queue commands for agents → services/commands.ts
- [ ] SERV-005: Store command results → routes/commands.ts
- [ ] SERV-006: Manage agent configurations → routes/config.ts
- [ ] SERV-007: Verify payload signatures → middleware/auth.ts
- [ ] SERV-008: Health check endpoint → GET /health
- [ ] SERV-009: Query metrics history → routes/metrics.ts
- [ ] SERV-010: Store network discovery data → routes/discovery.ts

## 10. Cross-References

| Reference | File | Description |
|-----------|------|-------------|
| CONTEXT.md | spec/CONTEXT.md | Development constitution |
| AGENT.md | spec/agent/AGENT.md | Agent specification |
| SERV-001 | spec/server/SERV-001-accept-metrics-via-rest-api.md | Accept metrics requirement |
| SERV-002 | spec/server/SERV-002-store-metrics-in-duckdb.md | Store metrics requirement |
| SERV-003 | spec/server/SERV-003-manage-agent-registry.md | Agent registry requirement |
| SERV-004 | spec/server/SERV-004-queue-commands-for-agents.md | Queue commands requirement |
| SERV-005 | spec/server/SERV-005-store-command-results.md | Store results requirement |
| SERV-006 | spec/server/SERV-006-manage-agent-configurations.md | Config management requirement |
| SERV-007 | spec/server/SERV-007-verify-payload-signatures.md | Signature verification requirement |
| SERV-008 | spec/server/SERV-008-health-check-endpoint.md | Health check requirement |
| SERV-009 | spec/server/SERV-009-query-metrics-history.md | Metrics history requirement |
| SERV-010 | spec/server/SERV-010-store-network-discovery-data.md | Network discovery requirement |
