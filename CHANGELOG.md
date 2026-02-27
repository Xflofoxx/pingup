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

### Changed
- Updated development setup instructions

### Fixed
- Resolved client-side JavaScript parsing issues in bun

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
