# VPN Detection

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-020  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Detect VPN connections and provide VPN-related metrics.

## 2. Requirements

### 2.1 VPN Detection

| Metric | Description |
|--------|-------------|
| vpn_active | Is VPN connected |
| vpn_name | VPN interface name |
| vpn_type | OpenVPN/WireGuard/etc |
| vpn_ip | VPN assigned IP |
| vpn_server | VPN server address |

### 2.2 VPN Information

- Detect active VPN interfaces
- Identify VPN type
- Track VPN IP address
- Monitor VPN status changes

## 3. Implementation

### CLI Commands

```bash
# VPN status
pingup agent vpn
```

## 4. Acceptance Criteria

- [ ] Detect OpenVPN connections
- [ ] Detect WireGuard connections
- [ ] Detect Windows VPN
- [ ] Report VPN IP address
- [ ] Alert on VPN disconnect

## 5. Related Requirements

- AGENT-004: Collect Network Metrics
