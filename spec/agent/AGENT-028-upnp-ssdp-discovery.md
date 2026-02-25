# UPnP/SSDP Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-028  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Discover devices using UPnP/SSDP (Simple Service Discovery Protocol).

## 2. Requirements

### 2.1 SSDP Discovery

| Field | Description |
|-------|-------------|
| usn | Unique Service Name |
| location | Device URL |
| nt | Notification Type |
| server | Server header |

### 2.2 UPnP Device Types

| Type | Description |
|------|-------------|
| urn:schemas-upnp-org:device:MediaServer | NAS, media servers |
| urn:schemas-upnp-org:device:MediaRenderer | Smart TVs |
| urn:schemas-upnp-org:device:InternetGatewayDevice | Routers |
| urn:schemas-upnp-org:device:Printer:1 | UPnP printers |
| urn:dial-multiscreen-org:service:dial:1 | Chromecast, Roku |

### 2.3 Implementation

```bash
# SSDP scan
pingup agent discover ssdp

# UPnP device details
pingup agent discover upnp
```

## 3. Acceptance Criteria

- [ ] Send M-SEARCH packets
- [ ] Parse SSDP responses
- [ ] Identify device types
- [ ] Detect routers and gateways

## 4. Related Requirements

- AGENT-014: Network Scanner Library
- AGENT-027: mDNS Discovery
