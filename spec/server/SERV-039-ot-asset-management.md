# OT Asset Management

> **Version**: 1.0.0  
> **Requirement ID**: SERV-039  
> **Component**: Server  
> **Status**: Proposed  

## 1. Description

Manage Operational Technology (OT) assets including PLCs, SCADA, industrial controllers.

## 2. Requirements

### 2.1 OT Asset Types

| Type | Examples | Monitoring |
|------|----------|------------|
| PLC | Siemens S7, Allen-Bradley | Status, logic |
| RTU | Schneider, ABB | Telemetry |
| HMI | Various vendors | Availability |
| SCADA | Server, clients | System health |
| ICS Firewall | Tofino, Cisco | Rule changes |
| Historian | OSIsoft, Ignition | Data integrity |

### 2.2 OT Asset Properties

| Property | Description |
|----------|-------------|
| asset_type | OT device type |
| vendor | Manufacturer |
| model | Model number |
| firmware_version | Firmware version |
| firmware_date | Firmware release date |
| ip_address | Network address |
| protocol | Industrial protocol |
| criticality | Mission critical level |

### 2.3 Industrial Protocols

| Protocol | Port | Description |
|----------|------|-------------|
| Modbus TCP | 502 | Serial Modbus over TCP |
| PROFINET | - | Siemens industrial Ethernet |
| EtherNet/IP | 44818 | Rockwell automation |
| OPC-UA | 4840 | Open platform communications |
| S7comm | - | Siemens S7 communication |
| DNP3 | 20000 | Distributed Network Protocol |

### 2.4 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/assets/ot | List OT assets |
| POST | /api/v1/assets/ot | Register OT asset |
| GET | /api/v1/assets/ot/:id | OT asset details |
| POST | /api/v1/assets/ot/:id/firmware | Check firmware updates |

## 3. Acceptance Criteria

- [ ] Track OT device types
- [ ] Monitor industrial protocols
- [ ] Firmware version tracking
- [ ] Criticality classification

## 4. Related Requirements

- SERV-036: IEC 62443 Compliance
- SERV-032: Network Topology Map
