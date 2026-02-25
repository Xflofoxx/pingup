# Custom Metrics

> **Version**: 1.0.0  
> **Requirement ID**: SERV-026  
> **Component**: Server  
> **Status**: Proposed  

## 1. Description

Allow users to define and collect custom metrics beyond built-in ones.

## 2. Requirements

### 2.1 Custom Metric Definition

| Field | Description |
|-------|-------------|
| name | Metric name |
| type | gauge/counter/histogram |
| unit | Unit of measurement |
| description | Metric description |
| aggregation | avg/sum/min/max |

### 2.2 Custom Data Collection

- Accept custom metrics via API
- Store in time-series database
- Include in exports and dashboards

### 2.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/metrics/custom | List custom metrics |
| POST | /api/v1/metrics/custom | Define custom metric |
| DELETE | /api/v1/metrics/custom/:name | Remove custom metric |
| POST | /api/v1/metrics/custom/:name | Submit custom metric data |
| GET | /api/v1/metrics/custom/:name/:agentId | Query custom metric data |

## 3. Acceptance Criteria

- [ ] Can define custom metrics
- [ ] Can submit custom metric data
- [ ] Data stored in time-series
- [ ] Available in exports
- [ ] Can set alerts on custom metrics

## 4. Related Requirements

- SERV-016: Alert Thresholds
- SERV-020: Prometheus Export
