# Version Roadmap

> **Version**: 1.0.0  
> **Status**: Active  
> **Last Updated**: 2026-02-25

---

## Overview

This document outlines the planned versions and their associated.

 requirements---

## Version 1.0.0 - Foundation

**Release Date**: 2026-02-25  
**Status**: Released

### Server Requirements (SERV-001 to SERV-015)

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-001 | Accept metrics via REST API | ✅ Complete |
| SERV-002 | Store metrics in DuckDB | ✅ Complete |
| SERV-003 | Manage agent registry | ✅ Complete |
| SERV-004 | Queue commands for agents | ✅ Complete |
| SERV-005 | Store command results | ✅ Complete |
| SERV-006 | Manage agent configurations | ✅ Complete |
| SERV-007 | Verify payload signatures | ✅ Complete |
| SERV-008 | Health check endpoint | ✅ Complete |
| SERV-009 | Query metrics history | ✅ Complete |
| SERV-010 | Store network discovery data | ✅ Complete |
| SERV-011 | Dashboard authentication (TOTP) | ✅ Complete |
| SERV-012 | Dashboard RBAC | ✅ Complete |
| SERV-013 | Dashboard pages | ✅ Complete |
| SERV-014 | User management | ✅ Complete |
| SERV-015 | Username/password authentication | ✅ Complete |

### Agent Requirements (AGENT-001 to AGENT-015)

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-001 | Collect CPU metrics | ✅ Complete |
| AGENT-002 | Collect RAM metrics | ✅ Complete |
| AGENT-003 | Collect disk metrics | ✅ Complete |
| AGENT-004 | Collect network metrics | ✅ Complete |
| AGENT-005 | Measure latency | ✅ Complete |
| AGENT-006 | Send metrics to server | ✅ Complete |
| AGENT-007 | Poll for commands | ✅ Complete |
| AGENT-008 | Execute remote commands | ✅ Complete |
| AGENT-009 | Sign all payloads | ✅ Complete |
| AGENT-010 | Authenticate with bearer token | ✅ Complete |
| AGENT-011 | Fetch configuration from server | ✅ Complete |
| AGENT-012 | Expose local status API | ✅ Complete |
| AGENT-013 | ICMP ping library | ✅ Complete |
| AGENT-014 | Network scanner library | ✅ Complete |
| AGENT-015 | Network discovery integration | ✅ Complete |

---

## Version 1.1.0 - Alerting & Notifications

**Target Date**: TBD  
**Focus**: Alerting system

### Server Requirements

| ID | Requirement |
|----|-------------|
| SERV-016 | Alert thresholds |
| SERV-017 | Alert notifications |
| SERV-018 | Agent groups |

### Agent Requirements

| ID | Requirement |
|----|-------------|
| AGENT-023 | Temperature monitoring |

---

## Version 1.2.0 - Reporting & Export

**Target Date**: TBD  
**Focus**: Data export and reporting

### Server Requirements

| ID | Requirement |
|----|-------------|
| SERV-019 | Scheduled reports |
| SERV-020 | Prometheus export |
| SERV-021 | Grafana integration |
| SERV-031 | Audit log export |

### Agent Requirements

None planned for this release.

---

## Version 1.3.0 - Advanced Monitoring

**Target Date**: TBD  
**Focus**: Process and service monitoring

### Server Requirements

| ID | Requirement |
|----|-------------|
| SERV-022 | SSL certificate monitoring |
| SERV-023 | Bandwidth monitoring |
| SERV-024 | Process monitoring |
| SERV-025 | Service monitoring |
| SERV-032 | Network topology map |

### Agent Requirements

| ID | Requirement |
|----|-------------|
| AGENT-016 | Windows service support |
| AGENT-019 | Custom scripts |

---

## Version 1.4.0 - Enterprise Features

**Target Date**: TBD  
**Focus**: Enterprise requirements

### Server Requirements

| ID | Requirement |
|----|-------------|
| SERV-026 | Custom metrics |
| SERV-027 | API rate limiting |
| SERV-028 | LDAP/Active Directory integration |
| SERV-029 | Backup and restore |
| SERV-030 | API access tokens |
| SERV-033 | Maintenance window |
| SERV-034 | Data retention policies |
| SERV-035 | Multi-tenant support |

### Agent Requirements

| ID | Requirement |
|----|-------------|
| AGENT-017 | Container metrics |
| AGENT-018 | GPU metrics |
| AGENT-020 | VPN detection |
| AGENT-021 | WiFi metrics |
| AGENT-022 | Battery status |
| AGENT-024 | Log rotation |
| AGENT-025 | Offline mode with local storage |

---

## Version 2.0.0 - Cloud & Scale

**Target Date**: TBD  
**Focus**: Cloud-native and scalability

### Planned Features

- Cloud provider integrations (AWS, GCP, Azure)
- Kubernetes support
- High availability clustering
- Distributed architecture
- Graphite/InfluxDB exports

---

## Release Schedule

| Version | Focus | ETA |
|---------|-------|-----|
| 1.0.0 | Foundation | Released |
| 1.1.0 | Alerting & Notifications | Q2 2026 |
| 1.2.0 | Reporting & Export | Q2 2026 |
| 1.3.0 | Advanced Monitoring | Q3 2026 |
| 1.4.0 | Enterprise Features | Q3 2026 |
| 2.0.0 | Cloud & Scale | Q4 2026 |

---

## Contributing

To contribute a new requirement:

1. Create a spec branch: `spec/XXX-feature-name`
2. Write the requirement spec following existing patterns
3. Submit for review
4. Assign to appropriate version milestone
5. Implement and test
6. Merge to master

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-25 | 1.0.0 | Initial roadmap created |
