# Network SIEM Monitoring

> **Version**: 1.0.0  
> **Requirement ID**: SERV-044  
> **Component**: Server / Agent / Library  
> **Status**: Active

## 1. Description

Real-time Security Information and Event Management (SIEM) for the local network. Agents
perform discovery, fingerprint each device via SNMP and low-level banner grabbing, classify
the device (vendor, OS, type), detect vulnerabilities through the `@pingup/vulns` engine and
report assets and findings to the server. A dashboard page (`/dashboard/siem`) presents the
security posture of all discovered devices.

## 2. Requirements

### 2.1 Device Profiling

Every discovered host is profiled with the following attributes:

| Attribute | Source |
|-----------|--------|
| IP / MAC / hostname | Discovery, ARP, reverse DNS |
| Vendor | MAC OUI lookup, SNMP sysDescr |
| OS | SNMP sysDescr pattern matching |
| Type | OUI + sysDescr + open-port heuristics |
| Software | Banner grabbing (SSH, FTP, SMTP, Telnet, HTTP server) |
| Open ports | Port scan |
| SNMP community | SNMP v2c query result |

### 2.2 Vulnerability Detection

The `@pingup/vulns` library provides:

| Capability | Description |
|------------|-------------|
| Version parsing / comparison | Handles `pN` suffixes (OpenSSH_7.2p1 ≡ 7.2) |
| CVE knowledge base | Curated CVEs (OpenSSH, Apache, ProFTPD, vsftpd, UPnP...) |
| Heuristic rules | Exposed telnet/FTP/RDP/SMB/DB, SNMP `public`, plaintext admin, default creds |
| CVE rules | Match installed software/version against CVE database |
| Risk score | 0-100 weighted by severity and device type |

Detection rules (`H-*`) include, but are not limited to:

| Rule | Severity |
|------|----------|
| H-EXPOSED-TELNET | high |
| H-EXPOSED-FTP | low |
| H-SNMP-PUBLIC | medium |
| H-EXPOSED-RDP | medium |
| H-EXPOSED-SMB | medium |
| H-EXPOSED-DATABASE | high |
| H-PLAINTEXT-ADMIN | medium |
| H-CAMERA-DEFAULT-ADMIN | high |
| H-NAS-EXPOSED | high |
| H-UPS-DEFAULT-CREDS | high |
| H-ROUTER-TELNET | high |
| H-VOIP-DEFAULT-CREDS | medium |

### 2.3 Agent Integration

- `agent/src/collectors/profiler.ts` — SNMP single-host profiling + banner grabbing.
- `agent/src/discovery/scanner.ts` — profiles every discovered host and attaches
  `profile`, `findings`, `riskScore`, `riskLabel`.
- Config: `discovery.profiling` (default `true`) and `discovery.snmpCommunity`.

### 2.4 Server Persistence

| Table | Description |
|-------|-------------|
| `siem_assets` | Inventario dispositivi con profilo, risk score e ultimo contatto |
| `siem_findings` | Vulnerabilità rilevate con severity, CVSS, remediation e stato |

- Upsert by `(agent_id, ip)`; findings are replaced at every fresh scan.
- Findings support workflow status: `open`, `reviewed`, `dismissed`.

### 2.5 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/discovery | Ingest discovery + SIEM assets/findings (agent) |
| POST | /api/v1/siem/ingest | SIEM payload ingest (agent) |
| GET | /api/v1/siem/overview | Aggregated overview (stats by severity/type/status) |
| GET | /api/v1/siem/assets | Inventory assets, filter by `deviceType`, `riskLabel`, `status` |
| GET | /api/v1/siem/assets/:id | Single asset |
| GET | /api/v1/siem/assets/:id/findings | Findings of an asset (filter by `status`) |
| GET | /api/v1/siem/findings | Findings, filter by `severity`, `status`, `knownExploited` |
| PUT | /api/v1/siem/findings/:id/status | Update finding workflow status (role IT) |

### 2.6 Dashboard

- `/dashboard/siem` renders under role SUP.
- Cards: devices detected, critical+high findings, open findings, devices at risk, average risk.
- Tables: open findings sorted by severity/CVSS, device inventory with risk label.

### 2.7 Real-time Updates

SSE channel `siem` receives `siem_update` events after each discovery ingestion; a
`siem_scan` summary is also emitted on the `alerts` channel.

## 3. Acceptance Criteria

- [x] Agent fingerprints devices via SNMP and banner grabbing
- [x] `@pingup/vulns` library detects CVE and heuristic vulnerabilities with risk scoring
- [x] Discovery results persisted in `siem_assets` / `siem_findings`
- [x] SIEM overview and inventory APIs available
- [x] `/dashboard/siem` page renders posture dashboard
- [x] Findings support triage workflow (open / reviewed / dismissed)

## 4. Related Requirements

- SERV-042: OT Vulnerability Management
- SERV-040: OT Security Monitoring
- AGENT-039: Vulnerability scanning
- AGENT-040: CVE tracking