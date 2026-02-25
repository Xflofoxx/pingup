# WOL (Wake-on-LAN)

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-034  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Send Wake-on-LAN packets to wake devices remotely.

## 2. Requirements

### 2.1 WOL Features

- Send magic packets
- Broadcast or unicast
- Multiple retry attempts
- Password protected WOL

### 2.2 WOL Configuration

| Parameter | Description |
|-----------|-------------|
| mac_address | Target MAC |
| ip_address | Target IP (optional) |
| port | UDP port (default 9) |
| password | SecureOn password |

### 2.3 Implementation

```bash
# Wake device
pingup agent wol aa:bb:cc:dd:ee:ff

# Wake with password
pingup agent wol aa:bb:cc:dd:ee:ff --password 1234567890AB
```

## 3. Acceptance Criteria

- [ ] Send magic packets
- [ ] Support broadcast/unicast
- [ ] Support SecureOn password
- [ ] Retry mechanism

## 4. Related Requirements

- AGENT-029: ARP Scanning
- AGENT-026: NetBIOS Discovery
