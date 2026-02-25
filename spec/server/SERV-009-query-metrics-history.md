# SERV-009: Query Metrics History

> **Requirement**: SERV-009  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must allow querying metrics history for agents.

## Endpoint

```
GET /api/v1/metrics/:agentId
```

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| from | string | Start timestamp (ISO 8601) |
| to | string | End timestamp (ISO 8601) |
| limit | number | Max results (default: 100) |

## Response

```json
{
  "agentId": "AGENT-001",
  "metrics": [
    {
      "timestamp": "2026-02-25T10:00:00Z",
      "cpu": 12.5,
      "ram": 43.2,
      "disk": 71.4,
      "latency": 8,
      "status": "online"
    }
  ]
}
```

## Implementation

- File: `routes/metrics.ts`
- Query DuckDB for metrics history
- Support time range filtering
