# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker and docker-compose support for containerized deployment
- GitHub Actions CI/CD pipeline
- Comprehensive CONTRIBUTING.md guidelines
- Security audit in CI pipeline
- Network SIEM (SERV-044): device profiling via SNMP + banners, `@pingup/vulns` detection engine
- SIEM APIs `/api/v1/siem/*` and `/dashboard/siem` posture page
- Real-time `siem` SSE channel updates after discovery scans
- Dashboard CRUD for agents and commands (create, edit, delete) with CSV/JSON export
- Network scan trigger from the dashboard (`POST /api/v1/discovery/scan` → `run_discovery` agent command)
- 2D topology map at `/dashboard/topology` rendered as an interactive SVG graph
- Demo users (admin/sup/it/pub) shown on the login page in development mode
- Root dev runner (`bun run dev`) to start server and agent without Docker

### Changed
- Updated development setup instructions
- Agent command handling extracted into `agent/src/commands.ts`

### Fixed
- Agent discovery scanner imported shared libs with a wrong relative path, preventing startup
- Agent now parses command `params` sent as JSON strings by the server (all parameterized commands were broken)
- Scanner `Dialer.connect` hung forever on connection attempts; timeout and socket lifecycle are now handled correctly

## [0.1.0] - 2026-02-27

### Added
- Initial release of Pingup
- Server component with Bun + Hono + SQLite
- Agent component with Bun + Hono
- System metrics collection (CPU, RAM, disk, network)
- ICMP ping functionality
- Network scanner with port scanning
- Network discovery (ARP, NetBIOS, mDNS, UPnP, DHCP)
- Binary protocol with MessagePack encoding
- Web dashboard with role-based access control
- TOTP and password authentication
- Alerting system with thresholds
- Agent groups management
- Prometheus metrics export
- SSL certificate monitoring
- Process and service monitoring
- API tokens for programmatic access
- LDAP/Active Directory integration
- Multi-tenancy support
- IEC 62443 and ISO 27001 compliance features
- OT asset management

### Fixed
- Various bug fixes and improvements

[Unreleased]: https://github.com/Xflofoxx/pingup/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Xflofoxx/pingup/releases/tag/v0.1.0
