# Battery Status

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-022  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Monitor battery status on laptops and UPS devices.

## 2. Requirements

### 2.1 Battery Metrics

| Metric | Description |
|--------|-------------|
| charging | Is charging |
| charge_percent | Battery percentage |
| time_remaining | Time remaining (minutes) |
| voltage | Battery voltage |
| health | Battery health status |
| cycles | Charge cycles |

### 2.2 Battery Events

- Low battery alert
- Critical battery alert
- AC power connected
- AC power disconnected

## 3. Implementation

### CLI Commands

```bash
# Battery status
pingup agent battery
```

## 4. Acceptance Criteria

- [ ] Detect battery on laptop
- [ ] Report charge percentage
- [ ] Detect charging state
- [ ] Report time remaining
- [ ] Low battery alerts

## 5. Related Requirements

- AGENT-017: Container Metrics (for UPS)
