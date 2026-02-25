# SERV-001: Accept Metrics via REST API

> **Requirement**: SERV-001  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must accept metrics from agents via REST API.

## Endpoint

```
POST /api/v1/metrics
Authorization: Bearer <auth_token>
Content-Type: application/json
```

## Request Payload

```json
{
  "agentId": "AGENT-001",
  "timestamp": "2026-02-25T10:00:00Z",
  "metrics": {
    "cpu": 12.5,
    "ram": 43.2,
    "disk": 71.4,
    "latency": 8
  },
  "status": "online",
  "signature": "base64-encoded-signature"
}
```

## Response

- 201 Created: Metrics accepted
- 401 Unauthorized: Invalid token
- 403 Forbidden: Invalid signature

## Implementation

- File: `routes/metrics.ts`
- Validate authentication
- Verify signature
- Store metrics in DuckDB
