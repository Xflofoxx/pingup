# DHCP Lease Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-030  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Read DHCP lease files to discover devices on the network.

## 2. Requirements

### 2.1 DHCP Lease Information

| Field | Description |
|-------|-------------|
| ip_address | Leased IP |
| mac_address | Client MAC |
| hostname | Client hostname |
| expires | Lease expiration |
| state | Active/Expired |

### 2.2 Supported DHCP Servers

| Server | Lease File Location |
|--------|-------------------|
| dnsmasq | /var/lib/dnsmasq/dnsmasq.leases |
| isc-dhcp | /var/lib/dhcpd/dhcpd.leases |
| Windows DHCP | Registry/API |
| systemd-resolved | /run/systemd/resolve/dhcpleases |

### 2.3 Implementation

```bash
# Read DHCP leases
pingup agent discover dhcp

# Monitor new leases
pingup agent discover dhcp --watch
```

## 3. Acceptance Criteria

- [ ] Parse lease files
- [ ] Support multiple DHCP servers
- [ ] Monitor for new leases
- [ ] Track expired leases

## 4. Related Requirements

- AGENT-029: ARP Scanning
- AGENT-015: Network Discovery Integration
