# SNMP Polling

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-031  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Poll devices using SNMP protocol for detailed information.

## 2. Requirements

### 2.1 SNMP Support

| Version | Description |
|---------|-------------|
| SNMPv1 | Basic, community string |
| SNMPv2c | 64-bit counters |
| SNMPv3 | Auth/Privacy |

### 2.2 SNMP OIDs

| OID | Description |
|-----|-------------|
| sysDescr | System description |
| sysUpTime | System uptime |
| ifNumber | Number of interfaces |
| ifDescr | Interface descriptions |
| ifSpeed | Interface speeds |
| ifType | Interface types |
| ipAddrTable | IP addresses |
| tcpConnTable | TCP connections |

### 2.3 Implementation

```bash
# SNMP walk
pingup agent snmp walk 192.168.1.1 public

# Get specific OID
pingup agent snmp get 192.168.1.1 public sysDescr
```

## 3. Acceptance Criteria

- [ ] Support SNMPv1/v2c/v3
- [ ] SNMP walk capability
- [ ] Interface information
- [ ] Detect routers/switches

## 4. Related Requirements

- AGENT-014: Network Scanner Library
- AGENT-032: Device Fingerprinting
