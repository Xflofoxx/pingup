# Port Service Detection

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-035  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Identify services running on open ports beyond basic port scanning.

## 2. Requirements

### 2.1 Service Detection

| Port | Service | Detection Method |
|------|---------|------------------|
| 21 | FTP | Banner grab |
| 22 | SSH | Banner grab + version |
| 23 | Telnet | Banner grab |
| 25 | SMTP | Banner + EHLO |
| 53 | DNS | Query + version |
| 80 | HTTP | Headers + Wappalyzer |
| 443 | HTTPS | Headers + SNI |
| 445 | SMB | Session setup |
| 3389 | RDP | NLA detection |
| 8080 | HTTP-Proxy | Headers |

### 2.2 Banner Grabbing

- TCP banner capture
- HTTP response headers
- TLS certificate info
- SSH version string

### 2.3 Implementation

```bash
# Detect services
pingup agent detect-services 192.168.1.1

# Full scan
pingup agent detect-services 192.168.1.0/24 --all-ports
```

## 3. Acceptance Criteria

- [ ] Identify common services
- [ ] Banner grabbing
- [ ] TLS certificate parsing
- [ ] Service version detection

## 4. Related Requirements

- AGENT-014: Network Scanner Library
- AGENT-032: Device Fingerprinting
