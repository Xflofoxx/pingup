# Version Roadmap

> **Version**: 1.8.0  
> **Status**: Active  
> **Last Updated**: 2026-09-16

---

## Overview

This document outlines the planned versions and their associated requirements.

---

## Version 1.0.0 - Foundation

**Release Date**: 2026-02-25  
**Status**: ✅ Released

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

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: Alerting system

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-016 | Alert thresholds | ✅ Complete |
| SERV-017 | Alert notifications | ✅ Complete |
| SERV-018 | Agent groups | ✅ Complete |

### Agent Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-023 | Temperature monitoring | ✅ Complete |

---

## Version 1.2.0 - Reporting & Export

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: Data export and reporting

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-019 | Scheduled reports | ✅ Complete |
| SERV-020 | Prometheus export | ✅ Complete |
| SERV-021 | Grafana integration | ✅ Complete |
| SERV-031 | Audit log export | ✅ Complete |

### Agent Requirements

None planned for this release.

---

## Version 1.3.0 - Advanced Monitoring

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: Process and service monitoring

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-022 | SSL certificate monitoring | ✅ Complete |
| SERV-023 | Bandwidth monitoring | ✅ Complete |
| SERV-024 | Process monitoring | ✅ Complete |
| SERV-025 | Service monitoring | ✅ Complete |
| SERV-032 | Network topology map | ✅ Complete |

### Agent Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-016 | Windows service support | ✅ Complete |
| AGENT-019 | Custom scripts | ✅ Complete |

---

## Version 1.4.0 - Enterprise Features

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: Enterprise requirements

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-026 | Custom metrics | ✅ Complete |
| SERV-027 | API rate limiting | ✅ Complete |
| SERV-028 | LDAP/Active Directory integration | ✅ Complete |
| SERV-029 | Backup and restore | ✅ Complete |
| SERV-030 | API access tokens | ✅ Complete |
| SERV-033 | Maintenance window | ✅ Complete |
| SERV-034 | Data retention policies | ✅ Complete |
| SERV-035 | Multi-tenant support | ✅ Complete |

### Agent Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-017 | Container metrics | ✅ Complete |
| AGENT-018 | GPU metrics | ✅ Complete |
| AGENT-020 | VPN detection | ✅ Complete |
| AGENT-021 | WiFi metrics | ✅ Complete |
| AGENT-022 | Battery status | ✅ Complete |
| AGENT-024 | Log rotation | ✅ Complete |
| AGENT-025 | Offline mode with local storage | ✅ Complete |

---

## Version 1.5.0 - IT/OT Convergence

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: ISO compliance and OT security

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-036 | IEC 62443 compliance | ✅ Complete |
| SERV-037 | Performance gate (10K devices) | ✅ Complete |
| SERV-038 | ISO 27001 ISMS integration | ✅ Complete |
| SERV-039 | OT asset management | ✅ Complete |
| SERV-040 | OT security monitoring | ✅ Complete |
| SERV-041 | Network access control (NAC) | ✅ Complete |
| SERV-042 | OT vulnerability management | ✅ Complete |

### Agent Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-026 | NetBIOS discovery | ✅ Complete |
| AGENT-027 | mDNS discovery | ✅ Complete |
| AGENT-028 | UPnP/SSDP discovery | ✅ Complete |
| AGENT-029 | ARP scanning | ✅ Complete |
| AGENT-030 | DHCP lease discovery | ✅ Complete |
| AGENT-031 | SNMP polling | ✅ Complete |
| AGENT-032 | Device fingerprinting | ✅ Complete |
| AGENT-033 | LLDP/CDP discovery | ✅ Complete |
| AGENT-034 | Wake-on-LAN | ✅ Complete |
| AGENT-035 | Port service detection | Proposed |
| AGENT-036 | BLE discovery | Proposed |
| AGENT-037 | Zigbee/Z-Wave discovery | Proposed |
| AGENT-038 | Network traffic analysis | Proposed |
| AGENT-039 | Vulnerability scanning | Proposed |
| AGENT-040 | CVE tracking | Proposed |
| AGENT-041 | SSL/TLS analysis | Proposed |
| AGENT-042 | Intrusion detection | Proposed |
| AGENT-043 | Network segmentation | Proposed |
| AGENT-044 | Rogue DHCP detection | Proposed |
| AGENT-045 | Password audit | Proposed |
| AGENT-046 | Malware detection | Proposed |
| AGENT-047 | DNS security analysis | Proposed |
| AGENT-048 | Firewall audit | Proposed |
| AGENT-049 | Security compliance | Proposed |
| AGENT-050 | Threat intelligence | Proposed |

---

## Version 1.6.0 - Dashboard Usability

**Release Date**: 2026-02-26  
**Status**: ✅ Released
**Focus**: Enhanced user experience and accessibility

### Dashboard Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| DASH-01 | Responsive Design | ✅ Complete |
| DASH-02 | Dark/Light Theme | ✅ Complete |
| DASH-03 | Dashboard Notifications | ✅ Complete |
| DASH-04 | Offline Support | ✅ Complete |
| DASH-05 | Keyboard Shortcuts | ✅ Complete |
| DASH-06 | Custom Widgets | ✅ Complete |
| DASH-07 | Internationalization | ✅ Complete |
| DASH-08 | Accessibility | ✅ Complete |
| DASH-09 | Real-time Updates | ✅ Complete |
| DASH-10 | PWA Support | ✅ Complete |

### Agent Requirements (AGENT-051)

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-051 | Agent Dashboard Page | ✅ Complete |

---

## Version 2.0.0 - Cloud & Scale

**Target Date**: Q1 2027  
**Status**: 📋 Planned
**Focus**: Cloud-native and scalability

### Planned Features

- Cloud provider integrations (AWS, GCP, Azure)
- Kubernetes support
- High availability clustering
- Distributed architecture
- Graphite/InfluxDB exports

---

## Version 1.8.0 - Network SIEM

**Release Date**: 2026-09-16  
**Status**: ✅ Released
**Focus**: Vulnerability management for discovered network devices

### Server Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| SERV-044 | Network SIEM monitoring | ✅ Complete |

### Agent Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-052 | Device profiling (SNMP + banners) | ✅ Complete |
| AGENT-053 | Vulnerability reporting | ✅ Complete |

### Dashboard Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| DASH-11 | SIEM dashboard page | ✅ Complete |

---

## Release Schedule

| Version | Focus | Release Date | Status |
|---------|-------|---------------|--------|
| 1.0.0 | Foundation | 2026-02-25 | ✅ |
| 1.1.0 | Alerting & Notifications | 2026-02-26 | ✅ |
| 1.2.0 | Reporting & Export | 2026-02-26 | ✅ |
| 1.3.0 | Advanced Monitoring | 2026-02-26 | ✅ |
| 1.4.0 | Enterprise Features | 2026-02-26 | ✅ |
| 1.5.0 | IT/OT Convergence | 2026-02-26 | ✅ |
| 1.6.0 | Dashboard Usability | 2026-02-26 | ✅ |
| 1.7.0 | Additional Features | 2026-02-26 | ✅ |
| 1.8.0 | Network SIEM | 2026-09-16 | ✅ |
| 2.0.0 | Cloud & Scale | Q1 2027 | 📋 |

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
| 2026-02-26 | 1.1.0 | Added Alerting & Notifications specs |
| 2026-02-26 | 1.2.0 | Added Reporting & Export specs |
| 2026-02-26 | 1.3.0 | Added Advanced Monitoring specs |
| 2026-02-26 | 1.4.0 | Added Enterprise Features specs |
| 2026-02-26 | 1.5.0 | Added IT/OT Convergence specs |
| 2026-02-26 | 1.6.0 | Added Dashboard Usability specs (DASH-01 to DASH-10) |
| 2026-02-26 | 1.7.0 | Updated roadmap - all features implemented |
| 2026-02-26 | 1.7.0 | Added AGENT-051 Dashboard Page |
| 2026-09-16 | 1.8.0 | Added Network SIEM (SERV-044, AGENT-052/053, DASH-11) |
