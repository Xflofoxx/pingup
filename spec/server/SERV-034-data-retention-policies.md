# Data Retention Policies

> **Version**: 1.0.0  
> **Requirement ID**: SERV-034  
> **Component**: Server  
> **Status**: Proposed  

## 1. Description

Configure data retention periods for different data types.

## 2. Requirements

### 2.1 Retention Configuration

| Data Type | Default Retention |
|-----------|-------------------|
| Metrics | 90 days |
| Discovery | 30 days |
| Alerts | 1 year |
| Audit | 2 years |
| Sessions | 30 days |

### 2.2 Retention Options

- Per-data-type retention
- Archive old data
- Automatic cleanup

### 2.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/admin/retention | Get retention config |
| PUT | /api/v1/admin/retention | Update retention |
| POST | /api/v1/admin/cleanup | Run cleanup manually |

## 3. Acceptance Criteria

- [ ] Configure retention per type
- [ ] Automatic cleanup works
- [ ] Can archive data
- [ ] Manual cleanup trigger

## 4. Related Requirements

- SERV-002: Store Metrics in DuckDB
