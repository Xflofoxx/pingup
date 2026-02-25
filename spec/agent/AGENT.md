# Agent Specification

> **Version**: 1.1.0  
> **Component**: Agent  
> **Related Requirements**: AGENT-001 through AGENT-015  
> **Status**: Implementation Ready

## 1. Overview

The Pingup Agent is a lightweight daemon that collects system metrics, reports to the server, executes remote commands, and performs network discovery. Designed for minimal resource usage.

## 2. Technical Stack

| Component | Technology | Version | Justification |
|-----------|------------|---------|----------------|
| Runtime | Bun.js | 1.1+ | Native system calls, low memory |
| Framework | Hono | 4.0+ | Lightweight HTTP server |
| Language | TypeScript | 5.0+ | Type safety |

## 3. Architecture

### 3.1 Directory Structure

```
agent/src/
├── index.ts              # Entry point & main loop
├── config.ts             # Configuration loader
├── collectors/
│   ├── cpu.ts           # CPU metrics
│   ├── ram.ts           # RAM metrics
│   ├── disk.ts          # Disk metrics
│   ├── network.ts       # Network metrics
│   └── icmp.ts          # ICMP ping (AGENT-013)
├── discovery/
│   └── scanner.ts        # Network scanner (AGENT-014, AGENT-015)
└── transport/
    └── index.ts         # HTTP client for server communication
```

### 3.2 External Libraries

| Library | Path | Purpose |
|---------|------|---------|
| @pingup/ping | libs/ping | ICMP ping (AGENT-013) |
| @pingup/scanner | libs/scanner | Network scanner (AGENT-014) |

## 4. Configuration

### 4.1 config.yaml

```yaml
server_url: http://localhost:3000
agent_id: AGENT-001
poll_interval: 30
network_timeout: 3
auth_token: secret-key

mqtt:
  enabled: false
  broker: localhost
  port: 1883
  topic: pingup

modules:
  - cpu
  - ram
  - disk
  - network

ping:
  host: 8.8.8.8
  timeout: 2

discovery:
  enabled: true
  ranges:
    - 192.168.1.0/24
  interval: 3600
  ports:
    - 22
    - 80
    - 443
    - 3389
    - 8080
```

### 4.2 Configuration Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| server_url | string | Yes | - | Server API URL |
| agent_id | string | Yes | auto-generated | Unique agent identifier |
| poll_interval | number | No | 30 | Seconds between metric collection |
| network_timeout | number | No | 3 | Seconds for HTTP timeout |
| auth_token | string | Yes | - | Shared secret for signing |
| modules | string[] | No | all | Which collectors to enable |
| ping.host | string | No | 8.8.8.8 | Host for latency measurement |
| ping.timeout | number | No | 2 | Timeout for ping in seconds |
| discovery.enabled | boolean | No | false | Enable network discovery |
| discovery.ranges | string[] | No | [] | CIDR ranges to scan |
| discovery.interval | number | No | 3600 | Seconds between scans |
| discovery.ports | number[] | No | [22,80,443,3389,8080] | Ports to scan |

## 5. Metrics Collection

### 5.1 CPU (AGENT-001)

| Field | Type | Description | Requirement |
|-------|------|-------------|--------------|
| cpu_percent | number | Overall CPU usage (%) | AGENT-001 |
| cpu_count | number | Number of CPU cores | AGENT-001 |

### 5.2 RAM (AGENT-002)

| Field | Type | Description | Requirement |
|-------|------|-------------|--------------|
| ram_percent | number | Memory usage (%) | AGENT-002 |
| ram_used_mb | number | Used memory (MB) | AGENT-002 |
| ram_available_mb | number | Available memory (MB) | AGENT-002 |
| ram_total_mb | number | Total memory (MB) | AGENT-002 |

### 5.3 Disk (AGENT-003)

| Field | Type | Description | Requirement |
|-------|------|-------------|--------------|
| disk_percent | number | Average disk usage (%) | AGENT-003 |
| partitions | array | Per-partition details | AGENT-003 |

### 5.4 Network (AGENT-004)

| Field | Type | Description | Requirement |
|-------|------|-------------|--------------|
| bytes_sent_mb | number | Bytes sent (MB) | AGENT-004 |
| bytes_recv_mb | number | Bytes received (MB) | AGENT-004 |
| packets_sent | number | Packets sent | AGENT-004 |
| packets_recv | number | Packets received | AGENT-004 |

### 5.5 Latency (AGENT-005)

| Field | Type | Description | Requirement |
|-------|------|-------------|--------------|
| latency | number | Ping to host (ms), -1 on failure | AGENT-005 |

## 6. Network Discovery (AGENT-013, AGENT-014, AGENT-015)

### 6.1 ICMP Ping

The agent uses the `@pingup/ping` library for ICMP ping operations.

| Feature | Description |
|---------|-------------|
| Single ping | Measure latency to a single host |
| Continuous ping | Monitor host with periodic pings |
| Statistics | Calculate min/max/avg latency and packet loss |

### 6.2 Network Scanner

The agent uses the `@pingup/scanner` library for network scanning.

| Feature | Description |
|---------|-------------|
| CIDR scanning | Scan entire subnet (e.g., 192.168.1.0/24) |
| Port scanning | Check common ports on discovered hosts |
| Concurrent scanning | Configurable parallelism |

### 6.3 Discovery Integration (AGENT-015)

| Field | Type | Description |
|-------|------|-------------|
| discovered_hosts | array | List of online hosts |
| scan_timestamp | string | ISO timestamp of scan |
| scan_duration | number | Time taken for scan in ms |

## 7. Communication Protocol

### 7.1 Sending Metrics

```
POST <server_url>/api/v1/metrics
Authorization: Bearer <auth_token>
Content-Type: application/json

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
  "signature": "base64-encoded-hmac-sha256"
}
```

### 7.2 Sending Discovery Data

```
POST <server_url>/api/v1/discovery
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "agentId": "AGENT-001",
  "timestamp": "2026-02-25T10:00:00Z",
  "discovery": {
    "hosts": [
      { "ip": "192.168.1.1", "latency": 2, "ports": [80, 443] }
    ],
    "duration": 15230
  },
  "signature": "base64-encoded-hmac-sha256"
}
```

### 7.3 Fetching Commands

```
GET <server_url>/api/v1/commands/pending/<agent_id>
Authorization: Bearer <auth_token>

Response:
[
  {
    "commandId": "CMD-2026-001",
    "action": "restart_service",
    "params": { "service": "nginx" },
    "signature": "base64-encoded-hmac-sha256"
  }
]
```

### 7.4 Reporting Results

```
POST <server_url>/api/v1/commands/<command_id>/result
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "result": { "success": true },
  "status": "completed"
}
```

## 8. Local API

The agent exposes a local HTTP API (port 8080):

| Endpoint | Method | Description |
|----------|--------|-------------|
| /status | GET | Agent status |
| /metrics | GET | Current metrics |
| /health | GET | Health check |
| /discovery | GET | Last discovery results |

## 9. Commands

### 9.1 Supported Commands

| Action | Description | Parameters | Requirement |
|--------|-------------|------------|-------------|
| ping | Test connectivity | - | - |
| restart_service | Restart a service | service (string) | AGENT-008 |
| update_config | Update configuration | - | - |
| execute | Execute shell command | command (string) | AGENT-008 |
| scan_network | Trigger network scan | ranges (string[]) | AGENT-015 |

### 9.2 Command Execution Flow

1. Poll server for pending commands
2. Verify command signature
3. Execute command action
4. Report result to server

## 10. Security

### 10.1 Signing

- All payloads signed with HMAC-SHA256
- Signature sent in `signature` field
- Server verifies signature before processing

### 10.2 Authentication

- Bearer token in `Authorization` header
- Token configured in `auth_token`

## 11. Performance Targets

| Metric | Target | Verification |
|--------|--------|--------------|
| CPU usage | < 2% | System monitor |
| Memory usage | < 30MB | System monitor |
| Poll interval | 30s (configurable) | Configuration |
| Network timeout | 3s (configurable) | Configuration |
| Discovery scan (/24) | < 60s | Timer |

## 12. Error Handling

| Scenario | Handling |
|----------|----------|
| Network failure | Retry on next poll cycle |
| Collection failure | Log error, continue with partial data |
| Invalid command | Return error to server |
| Signature verification fail | Log and ignore command |
| Discovery scan failure | Log error, skip scan |

## 13. Development Commands

```bash
# Install dependencies
bun install

# Run agent
bun run start

# Development mode (watch)
bun run dev

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Lint
bun run lint
```

## 14. Implementation Checklist

### Pre-Implementation Gates

- [x] Simplicity Gate: Using ≤3 projects? (agent, server, libs)
- [x] Anti-Abstraction Gate: Using Bun.js APIs directly?
- [x] Integration-First Gate: API contracts defined?

### Requirement Traceability

- [ ] AGENT-001: Collect CPU metrics → collectors/cpu.ts
- [ ] AGENT-002: Collect RAM metrics → collectors/ram.ts
- [ ] AGENT-003: Collect disk metrics → collectors/disk.ts
- [ ] AGENT-004: Collect network metrics → collectors/network.ts
- [ ] AGENT-005: Measure latency → collectors/icmp.ts
- [ ] AGENT-006: Send metrics to server → transport/index.ts
- [ ] AGENT-007: Poll for commands → transport/index.ts
- [ ] AGENT-008: Execute remote commands → index.ts
- [ ] AGENT-009: Sign all payloads → transport/index.ts
- [ ] AGENT-010: Authenticate with bearer token → transport/index.ts
- [ ] AGENT-011: Fetch configuration from server → transport/index.ts
- [ ] AGENT-012: Expose local status API → index.ts
- [ ] AGENT-013: ICMP ping library → libs/ping
- [ ] AGENT-014: Network scanner library → libs/scanner
- [ ] AGENT-015: Network discovery integration → discovery/scanner.ts

### Test Coverage Requirements

- [ ] Unit tests for each collector
- [ ] Unit tests for transport module
- [ ] Unit tests for ping library
- [ ] Unit tests for scanner library
- [ ] Integration test for full metric flow
- [ ] Integration test for discovery flow

## 15. Cross-References

| Reference | File | Description |
|-----------|------|-------------|
| CONTEXT.md | spec/CONTEXT.md | Development constitution |
| AGENT-001 | spec/agent/AGENT-001-collect-cpu-metrics.md | CPU metrics requirement |
| AGENT-002 | spec/agent/AGENT-002-collect-ram-metrics.md | RAM metrics requirement |
| AGENT-003 | spec/agent/AGENT-003-collect-disk-metrics.md | Disk metrics requirement |
| AGENT-004 | spec/agent/AGENT-004-collect-network-metrics.md | Network metrics requirement |
| AGENT-005 | spec/agent/AGENT-005-measure-latency.md | Latency measurement requirement |
| AGENT-006 | spec/agent/AGENT-006-send-metrics-to-server.md | Send metrics requirement |
| AGENT-007 | spec/agent/AGENT-007-poll-for-commands.md | Poll commands requirement |
| AGENT-008 | spec/agent/AGENT-008-execute-remote-commands.md | Execute commands requirement |
| AGENT-009 | spec/agent/AGENT-009-sign-all-payloads.md | Sign payloads requirement |
| AGENT-010 | spec/agent/AGENT-010-authenticate-with-bearer-token.md | Authentication requirement |
| AGENT-011 | spec/agent/AGENT-011-fetch-configuration-from-server.md | Fetch config requirement |
| AGENT-012 | spec/agent/AGENT-012-expose-local-status-api.md | Local API requirement |
| AGENT-013 | spec/agent/AGENT-013-icmp-ping-library.md | ICMP library requirement |
| AGENT-014 | spec/agent/AGENT-014-network-scanner-library.md | Network scanner requirement |
| AGENT-015 | spec/agent/AGENT-015-network-discovery-integration.md | Discovery integration requirement |
