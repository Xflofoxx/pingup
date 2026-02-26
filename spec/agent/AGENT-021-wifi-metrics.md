# WiFi Metrics

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-021  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Collect WiFi connection metrics on systems with wireless.

## 2. Requirements

### 2.1 WiFi Metrics

| Metric | Description |
|--------|-------------|
| ssid | Network name |
| bssid | Access point MAC |
| signal_strength | Signal strength (dBm) |
| signal_quality | Signal quality (%) |
| channel | WiFi channel |
| frequency | Frequency (2.4/5GHz) |
| bitrate | Connection bitrate |
| ip_address | Assigned IP |

### 2.2 WiFi Events

- Connected to new network
- Disconnected
- Signal strength change

## 3. Implementation

### CLI Commands

```bash
# WiFi status
pingup agent wifi
```

## 4. Acceptance Criteria

- [ ] Detect WiFi interface
- [ ] Collect signal strength
- [ ] Report SSID and BSSID
- [ ] Track connection events
- [ ] Works on Linux and Windows

## 5. Related Requirements

- AGENT-004: Collect Network Metrics
