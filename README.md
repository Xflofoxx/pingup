# Pingup

> Lightweight network monitoring agent and server with ICMP ping and network scanning capabilities.
> **Version**: 1.4.1

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.1+-red.svg)](https://bun.sh)
[![Discord](https://img.shields.io/discord/123456789.svg)](https://discord.gg/pingup)

Pingup is a lightweight monitoring solution that collects system metrics from remote agents, provides network discovery through ICMP ping and port scanning, and stores everything in a local SQLite database.

## Features

- **System Metrics**: CPU, RAM, disk, network, and temperature monitoring
- **ICMP Ping**: Measure latency to hosts with statistics
- **Network Scanner**: Discover devices on local networks with port scanning
- **Remote Commands**: Execute commands on agents from the server
- **Dashboard**: Modern web-based UI with role-based access control
- **Authentication**: TOTP and password-based login
- **Alerting**: Custom thresholds with email, webhook, and in-app notifications
- **Agent Groups**: Organize agents into logical groups
- **Reporting**: Scheduled reports with PDF/CSV export
- **Prometheus**: Export metrics in Prometheus format
- **Grafana**: Native integration with Grafana
- **Process & Service Monitoring**: Monitor running processes and system services
- **SSL Certificates**: Monitor SSL certificate expiration

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

- Dashboard: http://localhost:3000
- Login: http://localhost:3000/login
- Register: http://localhost:3000/register
- API Docs: http://localhost:3000/api_docs

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
  - temperature

ping:
  host: 8.8.8.8
  timeout: 2

temperature_unit: celsius  # or fahrenheit

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

## API Endpoints

### Server (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api_docs` | GET | Swagger API documentation |
| `/metrics` | GET | Prometheus metrics endpoint |
| `/api/v1/agents` | GET | List all agents |
| `/api/v1/metrics` | POST | Receive metrics |
| `/api/v1/metrics/:agentId` | GET | Get metrics history |
| `/api/v1/commands` | GET/POST | Manage commands |
| `/api/v1/discovery` | POST | Receive discovery data |
| `/api/v1/config/:agentId` | GET/POST | Agent configuration |
| `/api/v1/groups` | GET/POST | Agent groups management |
| `/api/v1/alerts/thresholds` | GET/POST | Alert thresholds |
| `/api/v1/alerts/notifications` | GET/POST | Alert notifications |
| `/api/v1/alerts/history` | GET | Alert history |
| `/api/v1/reports` | GET/POST | Scheduled reports |
| `/api/v1/certificates` | GET/POST | SSL certificates |
| `/api/v1/processes` | GET/POST | Process monitoring |
| `/api/v1/services` | GET/POST | Service monitoring |
| `/api/v1/bandwidth` | GET/POST | Bandwidth monitoring |
| `/api/v1/metrics/custom` | GET/POST | Custom metrics |
| `/api/v1/auth/register` | POST | Register (TOTP) |
| `/api/v1/auth/register-password` | POST | Register (password) |
| `/api/v1/auth/login-password` | POST | Login with password |
| `/api/v1/auth/forgot-password` | POST | Password recovery |
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
| **PUB** | Anonymous viewer | Public statistics only |
| **IT** | IT Operations | Agents, commands, metrics |
| **SUP** | CISO/Security | Security dashboard, audit logs |
| **ADM** | Administrator | Full access, user management |

### Authentication

1. **Register**: Enter username → Choose TOTP or password
2. **Login**: Enter username + TOTP code or password
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
├── spec/                 # Specifications
└── data/                # Data directory
```

## Development

### Workflow

Follow the [Workflow Specification](spec/WORKFLOW.md) for all development tasks:

1. Create a spec branch: `spec/XXX-description`
2. Implement feature: `feat/XXX-description`  
3. Write tests: `test/XXX-description`
4. Run tests and merge to master

### Commands

```bash
# Run agent tests
cd agent && bun test

# Run server tests
cd server && bun test

# Lint
cd agent && bun run lint
cd server && bun run lint
```

### CLI Tools

```bash
# Single ping
bun libs/ping/src/cli.ts 8.8.8.8

# Multiple pings with JSON output
bun libs/ping/src/cli.ts 8.8.8.8 -c 10 --json

# Scan a CIDR range
bun libs/scanner/src/cli.ts 192.168.1.0/24

# Scan with specific ports
bun libs/scanner/src/cli.ts 192.168.1.0/24 -p 22,80,443 --json
```

## Documentation

- [CONTEXT.md](spec/CONTEXT.md) - Development constitution
- [WORKFLOW.md](spec/WORKFLOW.md) - Development workflow
- [CODING_STYLE.md](spec/CODING_STYLE.md) - Coding standards
- [ROADMAP.md](spec/ROADMAP.md) - Project roadmap

## Release Notes

### Version 1.4.0 - Enterprise Features
**Release Date**: February 2026

Enterprise-grade features for large-scale deployments.

**Server Features:**
- Custom Metrics (SERV-026): Define and collect custom metrics beyond built-in ones
- API Rate Limiting (SERV-027): Prevent API abuse with configurable rate limits
- Backup & Restore (SERV-029): Full backup and restore capabilities

**Coming Soon:**
- LDAP/AD Integration (SERV-028)
- API Access Tokens (SERV-030)

---

### Version 1.3.0 - Advanced Monitoring
**Release Date**: February 2026

Advanced monitoring features for process, service, SSL certificate, and bandwidth tracking.

**Features:**
- SSL Certificate Monitoring (SERV-022)
- Bandwidth Monitoring (SERV-023)
- Process Monitoring (SERV-024)
- Service Monitoring (SERV-025)
- Password Recovery

---

### Version 1.2.0 - Reporting & Export
**Release Date**: February 2026

Data export and reporting capabilities.

**Features:**
- Scheduled Reports (SERV-019)
- Prometheus Export (SERV-020)
- Grafana Integration (SERV-021)

---

### Version 1.1.0 - Alerting & Notifications
**Release Date**: February 2026

Basic alerting system with thresholds and notifications.

**Features:**
- Agent Groups (SERV-018)
- Alert Thresholds (SERV-016)
- Alert Notifications (SERV-017)
- Temperature Monitoring (AGENT-023)

---

### Version 1.0.0 - Core Platform
**Release Date**: February 2026

Initial release with core monitoring capabilities.

**Server Features:**
- REST API for metrics ingestion (SERV-001)
- DuckDB storage for metrics history (SERV-002)
- Agent registry and management (SERV-003)
- Command queue and execution (SERV-004, SERV-005)
- Agent configuration management (SERV-006)
- HMAC payload verification (SERV-007)
- Health check endpoints (SERV-008)
- Metrics history queries (SERV-009)
- Network discovery data storage (SERV-010)
- Dashboard with TOTP authentication (SERV-011)
- Role-based access control (SERV-012)
- User management (SERV-014)

**Agent Features:**
- CPU, RAM, disk, network metrics collection
- ICMP ping latency measurement
- Secure payload signing
- Bearer token authentication
- Remote command execution
- Network discovery with port scanning

---

## License

MIT License - see [LICENSE](LICENSE) for details.
