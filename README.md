# Pingup

> Lightweight network monitoring agent and server with ICMP ping and network scanning capabilities.
> **Version**: 1.7.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.1+-red.svg)](https://bun.sh)
[![Test Coverage](https://img.shields.io/badge/Coverage-94%25-brightgreen.svg)](#)

Pingup is a lightweight monitoring solution that collects system metrics from remote agents, provides network discovery through ICMP ping and port scanning, and stores everything in a local SQLite database.

## Features

- **System Metrics**: CPU, RAM, disk, network, temperature, battery monitoring
- **Advanced Metrics**: GPU metrics, container metrics, WiFi/VPN detection
- **ICMP Ping**: Measure latency to hosts with statistics
- **Network Scanner**: Discover devices on local networks with port scanning
- **Network Discovery**: ARP, NetBIOS, mDNS, UPnP/SSDP, LLDP/CDP, DHCP leases
- **Remote Commands**: Execute commands on agents from the server
- **Dashboard**: Modern web-based UI with role-based access control
- **Agent Dashboard**: Local dashboard with owner-based access control
- **Authentication**: TOTP and password-based login, LDAP/AD integration
- **Alerting**: Custom thresholds with email, webhook, and in-app notifications
- **Agent Groups**: Organize agents into logical groups
- **Reporting**: Scheduled reports with PDF/CSV export
- **Prometheus**: Export metrics in Prometheus format
- **Grafana**: Native integration with Grafana
- **Process & Service Monitoring**: Monitor running processes and system services
- **SSL Certificates**: Monitor SSL certificate expiration
- **Enterprise Features**: API tokens, maintenance windows, data retention, multi-tenancy
- **IT/OT Security**: IEC 62443 compliance, ISO 27001 ISMS, OT asset management

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
bun run migrate  # Run migrations
bun run start    # Start server on port 7000
```

**Start the agent:**

```bash
cd agent
bun run start    # Start agent on port 8080
```

### Access Dashboard

- Dashboard: http://localhost:7000
- Login: http://localhost:7000/login
- Register: http://localhost:7000/register
- API Docs: http://localhost:7000/api_docs

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
│  (port 8080)│◀────────│  (port 7000)│
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
│ Discovery  │
└─────────────┘
```

## API Endpoints

### Server (Port 7000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api_docs` | GET | Swagger API documentation |
| `/metrics` | GET | Prometheus metrics endpoint |
| `/api/v1/agents` | GET/POST | Agent management |
| `/api/v1/metrics` | POST | Receive metrics |
| `/api/v1/metrics/:agentId` | GET | Get metrics history |
| `/api/v1/commands` | GET/POST | Manage commands |
| `/api/v1/discovery` | POST | Receive discovery data |
| `/api/v1/config/:agentId` | GET/POST | Agent configuration |
| `/api/v1/groups` | GET/POST | Agent groups management |
| `/api/v1/alerts/*` | GET/POST | Alert management |
| `/api/v1/reports` | GET/POST | Scheduled reports |
| `/api/v1/certificates` | GET/POST | SSL certificates |
| `/api/v1/processes` | GET/POST | Process monitoring |
| `/api/v1/services` | GET/POST | Service monitoring |
| `/api/v1/bandwidth` | GET/POST | Bandwidth monitoring |
| `/api/v1/metrics/custom` | GET/POST | Custom metrics |
| `/api/v1/ldap/*` | GET/POST | LDAP/AD integration |
| `/api/v1/api-tokens/*` | GET/POST | API access tokens |
| `/api/v1/topology/*` | GET | Network topology |
| `/api/v1/maintenance/*` | GET/POST | Maintenance windows |
| `/api/v1/retention/*` | GET/POST | Data retention policies |
| `/api/v1/tenants/*` | GET/POST | Multi-tenant management |
| `/api/v1/compliance/*` | GET/POST | IEC 62443 compliance |
| `/api/v1/ot-assets/*` | GET/POST | OT asset management |
| `/api/v1/performance/*` | GET | Performance metrics |
| `/api/v1/isms/*` | GET/POST | ISO 27001 ISMS |
| `/api/v1/auth/*` | GET/POST | Authentication |
| `/api/v1/users` | GET | User management (Admin) |

### Agent Local API (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Agent status |
| `/metrics` | GET | Current metrics |
| `/health` | GET | Health check |
| `/dashboard` | GET | Agent dashboard (HTML) |
| `/logs` | GET | Agent logs |

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

### Version 1.7.0 - Additional Features & IT/OT
**Release Date**: February 2026

Extended monitoring and IT/OT security features.

**Server Features:**
- LDAP/AD Integration (SERV-028): Enterprise authentication with directory services
- API Access Tokens (SERV-030): Programmatic API access with scoped tokens
- Network Topology Map (SERV-032): Visualize network topology
- Maintenance Windows (SERV-033): Schedule maintenance periods
- Data Retention Policies (SERV-034): Configure data retention rules
- Multi-tenant Support (SERV-035): Multiple organizations on one instance
- IEC 62443 Compliance (SERV-036): Industrial security zones
- Performance Gate (SERV-037): 10K device capacity monitoring
- ISO 27001 ISMS (SERV-038): Information security controls
- OT Asset Management (SERV-039): Industrial asset inventory
- OT Security Monitoring (SERV-040): Security monitoring for OT
- Network Access Control (SERV-041): NAC integration
- Vulnerability Management (SERV-042): OT vulnerability tracking

**Agent Features:**
- Windows Service Support (AGENT-016): Run as Windows service
- Container Metrics (AGENT-017): Docker container monitoring
- GPU Metrics (AGENT-018): NVIDIA/AMD GPU monitoring
- Custom Scripts (AGENT-019): Execute custom metric scripts
- VPN Detection (AGENT-020): Detect VPN connections
- WiFi Metrics (AGENT-021): Wireless signal monitoring
- Battery Status (AGENT-022): Laptop battery monitoring
- Log Rotation (AGENT-024): Automated log management
- Offline Mode (AGENT-025): Queue metrics when offline
- NetBIOS Discovery (AGENT-026): Windows name discovery
- mDNS Discovery (AGENT-027): Apple/Bonjour discovery
- UPnP/SSDP Discovery (AGENT-028): Device discovery
- ARP Scanning (AGENT-029): Layer 2 discovery
- DHCP Lease Discovery (AGENT-030): DHCP client tracking
- SNMP Polling (AGENT-031): SNMP device queries
- Device Fingerprinting (AGENT-032): Identify device types
- LLDP/CDP Discovery (AGENT-033): Network infrastructure discovery
- Wake-on-LAN (AGENT-034): Remote wake capabilities
- Agent Dashboard (AGENT-051): Local web dashboard

**Infrastructure:**
- Test Coverage: 94%+
- Config via config.yaml

---
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
