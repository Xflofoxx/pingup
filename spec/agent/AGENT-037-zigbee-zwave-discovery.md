# Zigbee/Z-Wave Discovery

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-037  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Discover IoT devices using Zigbee and Z-Wave protocols via compatible adapters.

## 2. Requirements

### 2.1 Zigbee Discovery

| Field | Description |
|-------|-------------|
| ieee_address | Device IEEE address |
| nwk_address | Network address |
| device_type | Device type |
| manufacturer | Manufacturer |
| model | Model |
| endpoints | Available endpoints |

### 2.2 Z-Wave Discovery

| Field | Description |
|-------|-------------|
| node_id | Z-Wave node ID |
| manufacturer_id | Manufacturer ID |
| product_type | Product type |
| product_id | Product ID |
| version | Firmware version |

### 2.3 Supported Adapters

| Adapter | Protocol |
|---------|----------|
| ConBee II | Zigbee |
| Sonoff Zigbee 3.0 | Zigbee |
| Aeotec Z-Stick | Z-Wave |

### 2.4 Implementation

```bash
# Zigbee scan
pingup agent discover zigbee

# Z-Wave scan
pingup agent discover zwave
```

## 3. Acceptance Criteria

- [ ] Support Zigbee adapters
- [ ] Support Z-Wave adapters
- [ ] Device enumeration
- [ ] Basic device info

## 4. Related Requirements

- AGENT-032: Device Fingerprinting
