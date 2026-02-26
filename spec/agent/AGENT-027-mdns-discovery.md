# mDNS/Avahi Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-027  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Discover devices using mDNS (Multicast DNS) and Avahi protocol.

## 2. Requirements

### 2.1 mDNS Discovery

| Field | Description |
|-------|-------------|
| name | mDNS hostname |
| ip_address | Resolved IP |
| service_type | Service type (_http._tcp, etc.) |
| txt_record | TXT records |

### 2.2 Common mDNS Services

| Service | Type | Common Devices |
|---------|------|----------------|
| HTTP | _http._tcp | Webcams, NAS |
| AirPlay | _airplay._tcp | Apple TV, speakers |
| Chromecast | _googlecast._tcp | Chromecast, smart TV |
| Spotify | _spotify-connect._tcp | Spotify speakers |
| HomeKit | _hap._tcp | HomeKit devices |
| printer | _ipp._tcp | Network printers |

### 2.3 Implementation

```bash
# Discover mDNS
pingup agent discover mdns

# Query specific service
pingup agent discover mdns --service _airplay._tcp
```

## 3. Acceptance Criteria

- [ ] Scan for mDNS announcements
- [ ] Parse service types
- [ ] Identify common IoT devices
- [ ] Detect Apple devices

## 4. Related Requirements

- AGENT-014: Network Scanner Library
- AGENT-028: UPnP/SSDP Discovery
