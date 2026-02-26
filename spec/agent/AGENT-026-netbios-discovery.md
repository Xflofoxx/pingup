# NetBIOS/SMB Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-026  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Discover Windows devices and SMB shares using NetBIOS protocol.

## 2. Requirements

### 2.1 NetBIOS Discovery

| Field | Description |
|-------|-------------|
| hostname | NetBIOS name |
| ip_address | Device IP |
| mac_address | MAC address |
| domain | Windows domain |
| services | Available services |

### 2.2 SMB Share Discovery

- Enumerate SMB shares
- Detect file servers
- Identify network printers

### 2.3 Implementation

```bash
# Discover NetBIOS
pingup agent discover netbios 192.168.1.0/24

# Scan SMB
pingup agent discover smb 192.168.1.0/24
```

## 3. Acceptance Criteria

- [ ] Discover Windows hostnames
- [ ] Detect SMB services
- [ ] Identify printers via SMB
- [ ] Report workgroup/domain

## 4. Related Requirements

- AGENT-014: Network Scanner Library
- AGENT-015: Network Discovery Integration
