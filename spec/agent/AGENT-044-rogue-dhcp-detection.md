# Rogue DHCP Detection

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-044  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Detect rogue DHCP servers on the network.

## 2. Requirements

### 2.1 Rogue DHCP Detection

| Field | Description |
|-------|-------------|
| server_ip | DHCP server IP |
| server_mac | DHCP server MAC |
| offered_ips | IP range offered |
| detected_at | Detection timestamp |

### 2.2 Detection Method

- Monitor DHCPACK packets
- Compare to expected server
- Alert on unauthorized servers

### 2.3 Implementation

```bash
# Enable rogue detection
pingup agent dhcp-rogue enable

# Check for rogues
pingup agent dhcp-rogue scan
```

## 3. Acceptance Criteria

- [ ] Monitor DHCP responses
- [ ] Identify DHCP server
- [ ] Alert on rogue server
- [ ] Track DHCP changes

## 4. Related Requirements

- AGENT-030: DHCP Lease Discovery
- AGENT-042: Intrusion Detection
