# LLDP/CDP Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-033  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Discover network infrastructure using LLDP (Link Layer Discovery Protocol) and CDP (Cisco Discovery Protocol).

## 2. Requirements

### 2.1 LLDP Information

| Field | Description |
|-------|-------------|
| chassis_id | Device chassis ID |
| port_id | Port identifier |
| port_description | Port description |
| system_name | Device name |
| system_description | Device description |
| capabilities | Device capabilities |
| management_address | Management IP |

### 2.2 CDP Information

- Same as LLDP for Cisco devices
- VLAN information
- Voice VLAN

### 2.3 Implementation

```bash
# LLDP scan
pingup agent discover lldp

# CDP scan
pingup agent discover cdp
```

## 3. Acceptance Criteria

- [ ] Capture LLDP frames
- [ ] Parse LLDP TLVs
- [ ] Identify switches/routers
- [ ] Port connectivity mapping

## 4. Related Requirements

- AGENT-029: ARP Scanning
- AGENT-031: SNMP Polling
