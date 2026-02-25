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
- **Local API**: Built-in HTTP API on port 8080 for agent status
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
| `/api/v1/agents` | GET | List all agents |
| `/api/v1/metrics` | POST | Receive metrics |
| `/api/v1/metrics/:agentId` | GET | Get metrics history |
| `/api/v1/commands` | GET/POST | Manage commands |
| `/api/v1/discovery` | POST | Receive discovery data |
| `/api/v1/config/:agentId` | GET/POST | Agent configuration |

### Agent Local API (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Agent status |
| `/metrics` | GET | Current metrics |
| `/health` | GET | Health check |

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
│   │   └── db/          # Database
│   └── tests/
├── libs/                  # Shared libraries
│   ├── ping/            # ICMP ping library
│   └── scanner/         # Network scanner library
├── spec/                 # Specifications
│   ├── agent/           # Agent requirements
│   └── server/         # Server requirements
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

### Agent (AGENT-001 to AGENT-015)

- AGENT-001: CPU metrics collection
- AGENT-002: RAM metrics collection
- AGENT-003: Disk metrics collection
- AGENT-004: Network metrics collection
- AGENT-005: Latency measurement
- AGENT-006: Send metrics to server
- AGENT-007: Poll for commands
- AGENT-008: Execute remote commands
- AGENT-009: Sign all payloads
- AGENT-010: Authenticate with bearer token
- AGENT-011: Fetch configuration from server
- AGENT-012: Expose local status API
- AGENT-013: ICMP ping library
- AGENT-014: Network scanner library
- AGENT-015: Network discovery integration

### Server (SERV-001 to SERV-010)

- SERV-001: Accept metrics via REST API
- SERV-002: Store metrics in DuckDB
- SERV-003: Manage agent registry
- SERV-004: Queue commands for agents
- SERV-005: Store command results
- SERV-006: Manage agent configurations
- SERV-007: Verify payload signatures
- SERV-008: Health check endpoint
- SERV-009: Query metrics history
- SERV-010: Store network discovery data

## License

MIT License - see [LICENSE](LICENSE) for details.
