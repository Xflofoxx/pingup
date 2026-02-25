# Pingup

> Lightweight network monitoring agent and server with ICMP ping and network scanning capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.1+-red.svg)](https://bun.sh)

Pingup is a lightweight monitoring solution that collects system metrics from remote agents, provides network discovery through ICMP ping and port scanning, and stores everything in a local SQLite database.

## Features

- **System Metrics Collection**: CPU, RAM, disk, and network usage
- **ICMP Ping**: Measure latency to hosts with statistics
- **Network Scanner**: Discover devices on local networks with port scanning
- **Remote Command Execution**: Execute commands on agents from the server
- **Dashboard**: Web-based UI with role-based access
- **TOTP Authentication**: Passwordless login using mobile authenticator apps
- **HMAC Authentication**: Secure payload signing between agent and server

## Architecture

```
┌─────────────┐         ┌─────────────┐
│   Agent     │────────▶│   Server    │
│  (port 8080)│◀────────│  (port 3000)│
└─────────────┘         └─────────────┘
      │                        │
      │                        ▼
      │                 ┌─────────────┐
      │                 │   SQLite    │
      │                 │  (DuckDB)   │
      │                 └─────────────┘
      ▼
┌─────────────┐
│ Network     │
│ Scanner    │
└─────────────┘
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.1+

### Installation

```bash
# Clone the repository
git clone https://github.com/Xflofoxx/pingup.git
cd pingup

# Install dependencies
cd agent && bun install
cd ../server && bun install
```

### Running

**Start the server:**
```bash
cd server
bun run src/db/migrate.ts  # Run migrations
bun run start              # Start server on port 3000
```

**Start the agent:**
```bash
cd agent
bun run start              # Start agent on port 8080
```

### Access Dashboard

```bash
# Open browser at http://localhost:3000
# Public dashboard: http://localhost:3000/
# Login: http://localhost:3000/login
# Register: http://localhost:3000/register
# API Docs: http://localhost:3000/api_docs
```

## CLI Tools

### Ping Library

```bash
# Single ping
bun libs/ping/src/cli.ts 8.8.8.8

# Multiple pings with JSON output
bun libs/ping/src/cli.ts 8.8.8.8 -c 10 --json
```

### Network Scanner

```bash
# Scan a CIDR range
bun libs/scanner/src/cli.ts 192.168.1.0/24

# Scan with specific ports
bun libs/scanner/src/cli.ts 192.168.1.0/24 -p 22,80,443 --json
```

## Configuration

### Agent (config.yaml)

```yaml
server_url: http://localhost:3000
agent_id: AGENT-001
poll_interval: 30
auth_token: your-secret-key

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

## API Endpoints

### Server (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api_docs` | GET | Swagger API documentation |
| `/api/v1/agents` | GET | List all agents |
| `/api/v1/metrics` | POST | Receive metrics |
| `/api/v1/metrics/:agentId` | GET | Get metrics history |
| `/api/v1/commands` | GET/POST | Manage commands |
| `/api/v1/discovery` | POST | Receive discovery data |
| `/api/v1/config/:agentId` | GET/POST | Agent configuration |
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login with TOTP |
| `/api/v1/auth/logout` | POST | Logout |
| `/api/v1/users` | GET | List users (Admin) |

### Agent Local API (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Agent status |
| `/metrics` | GET | Current metrics |
| `/health` | GET | Health check |

## Dashboard

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **PUB** (Public) | Anonymous viewer | Public statistics only |
| **IT** (Operative) | IT Operations | Agents, commands, metrics |
| **SUP** (Supervision) | CISO/Security | Security dashboard, audit logs |
| **ADM** (Admin) | Administrator | Full access, user management |

### Pages

| Path | Role | Description |
|------|------|-------------|
| `/` | Public | Public dashboard (no login) |
| `/login` | Public | Login page |
| `/register` | Public | Registration with TOTP setup |
| `/dashboard` | All | Main dashboard |
| `/dashboard/agents` | IT+ | Agent management |
| `/dashboard/security` | SUP+ | Security overview |
| `/dashboard/users` | ADM | User management |
| `/dashboard/audit` | ADM | Audit logs |

### Authentication

1. **Register**: Enter username → Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
2. **Login**: Enter username + 6-digit TOTP code from your mobile app
3. **Session**: Valid for 24 hours

## Project Structure

```
pingup/
├── agent/                 # Agent component
│   ├── src/
│   │   ├── collectors/   # Metrics collectors
│   │   ├── discovery/    # Network scanner
│   │   └── transport/    # Server communication
│   └── tests/
├── server/                # Server component
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth middleware
│   │   └── db/          # Database
│   └── tests/
├── libs/                  # Shared libraries
│   ├── ping/            # ICMP ping library
│   └── scanner/         # Network scanner library
├── spec/                 # Specifications
│   ├── agent/           # Agent requirements
│   └── server/          # Server requirements
└── data/                # Data directory
    └── test-outputs/   # Test outputs
```

## Development

```bash
# Run agent tests
cd agent && bun test

# Run server tests
cd server && bun test

# Lint
cd agent && bun run lint
cd server && bun run lint
```

## Requirements

### Agent Requirements

| ID | File | Description |
|----|------|-------------|
| AGENT-001 | [spec/agent/AGENT-001-collect-cpu-metrics.md](spec/agent/AGENT-001-collect-cpu-metrics.md) | CPU metrics collection |
| AGENT-002 | [spec/agent/AGENT-002-collect-ram-metrics.md](spec/agent/AGENT-002-collect-ram-metrics.md) | RAM metrics collection |
| AGENT-003 | [spec/agent/AGENT-003-collect-disk-metrics.md](spec/agent/AGENT-003-collect-disk-metrics.md) | Disk metrics collection |
| AGENT-004 | [spec/agent/AGENT-004-collect-network-metrics.md](spec/agent/AGENT-004-collect-network-metrics.md) | Network metrics collection |
| AGENT-005 | [spec/agent/AGENT-005-measure-latency.md](spec/agent/AGENT-005-measure-latency.md) | Latency measurement |
| AGENT-006 | [spec/agent/AGENT-006-send-metrics-to-server.md](spec/agent/AGENT-006-send-metrics-to-server.md) | Send metrics to server |
| AGENT-007 | [spec/agent/AGENT-007-poll-for-commands.md](spec/agent/AGENT-007-poll-for-commands.md) | Poll for commands |
| AGENT-008 | [spec/agent/AGENT-008-execute-remote-commands.md](spec/agent/AGENT-008-execute-remote-commands.md) | Execute remote commands |
| AGENT-009 | [spec/agent/AGENT-009-sign-all-payloads.md](spec/agent/AGENT-009-sign-all-payloads.md) | Sign all payloads |
| AGENT-010 | [spec/agent/AGENT-010-authenticate-with-bearer-token.md](spec/agent/AGENT-010-authenticate-with-bearer-token.md) | Authenticate with bearer token |
| AGENT-011 | [spec/agent/AGENT-011-fetch-configuration-from-server.md](spec/agent/AGENT-011-fetch-configuration-from-server.md) | Fetch configuration from server |
| AGENT-012 | [spec/agent/AGENT-012-expose-local-status-api.md](spec/agent/AGENT-012-expose-local-status-api.md) | Expose local status API |
| AGENT-013 | [spec/agent/AGENT-013-icmp-ping-library.md](spec/agent/AGENT-013-icmp-ping-library.md) | ICMP ping library |
| AGENT-014 | [spec/agent/AGENT-014-network-scanner-library.md](spec/agent/AGENT-014-network-scanner-library.md) | Network scanner library |
| AGENT-015 | [spec/agent/AGENT-015-network-discovery-integration.md](spec/agent/AGENT-015-network-discovery-integration.md) | Network discovery integration |

### Server Requirements

| ID | File | Description |
|----|------|-------------|
| SERV-001 | [spec/server/SERV-001-accept-metrics-via-rest-api.md](spec/server/SERV-001-accept-metrics-via-rest-api.md) | Accept metrics via REST API |
| SERV-002 | [spec/server/SERV-002-store-metrics-in-duckdb.md](spec/server/SERV-002-store-metrics-in-duckdb.md) | Store metrics in DuckDB |
| SERV-003 | [spec/server/SERV-003-manage-agent-registry.md](spec/server/SERV-003-manage-agent-registry.md) | Manage agent registry |
| SERV-004 | [spec/server/SERV-004-queue-commands-for-agents.md](spec/server/SERV-004-queue-commands-for-agents.md) | Queue commands for agents |
| SERV-005 | [spec/server/SERV-005-store-command-results.md](spec/server/SERV-005-store-command-results.md) | Store command results |
| SERV-006 | [spec/server/SERV-006-manage-agent-configurations.md](spec/server/SERV-006-manage-agent-configurations.md) | Manage agent configurations |
| SERV-007 | [spec/server/SERV-007-verify-payload-signatures.md](spec/server/SERV-007-verify-payload-signatures.md) | Verify payload signatures |
| SERV-008 | [spec/server/SERV-008-health-check-endpoint.md](spec/server/SERV-008-health-check-endpoint.md) | Health check endpoint |
| SERV-009 | [spec/server/SERV-009-query-metrics-history.md](spec/server/SERV-009-query-metrics-history.md) | Query metrics history |
| SERV-010 | [spec/server/SERV-010-store-network-discovery-data.md](spec/server/SERV-010-store-network-discovery-data.md) | Store network discovery data |
| SERV-011 | [spec/server/SERV-011-dashboard-authentication.md](spec/server/SERV-011-dashboard-authentication.md) | Dashboard authentication (TOTP) |
| SERV-012 | [spec/server/SERV-012-dashboard-rbac.md](spec/server/SERV-012-dashboard-rbac.md) | Dashboard RBAC |
| SERV-013 | [spec/server/SERV-013-dashboard-pages.md](spec/server/SERV-013-dashboard-pages.md) | Dashboard pages |
| SERV-014 | [spec/server/SERV-014-user-management.md](spec/server/SERV-014-user-management.md) | User management |

## License

MIT License - see [LICENSE](LICENSE) for details.
