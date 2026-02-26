# Agent Groups

> **Version**: 1.0.0  
> **Requirement ID**: SERV-018  
> **Component**: Server  
> **Status**: Proposed  

## 1. Description

Organize agents into logical groups for easier management and bulk operations.

## 2. Requirements

### 2.1 Group Management

- Create, update, delete agent groups
- Assign agents to multiple groups
- Apply thresholds and notifications at group level
- Group hierarchy support (nested groups)

### 2.2 Group Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Group name |
| description | string | Group description |
| parent_id | string | Parent group ID (optional) |
| agents | string[] | List of agent IDs |

### 2.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/groups | List groups |
| POST | /api/v1/groups | Create group |
| GET | /api/v1/groups/:id | Get group details |
| PUT | /api/v1/groups/:id | Update group |
| DELETE | /api/v1/groups/:id | Delete group |
| POST | /api/v1/groups/:id/agents | Add agents to group |
| DELETE | /api/v1/groups/:id/agents | Remove agents from group |

## 3. Acceptance Criteria

- [ ] Can create and manage groups
- [ ] Can assign agents to groups
- [ ] Can apply thresholds at group level
- [ ] Can view aggregated metrics by group

## 4. Related Requirements

- SERV-016: Alert Thresholds
- SERV-019: Scheduled Reports
