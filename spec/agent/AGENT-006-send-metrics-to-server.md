# AGENT-006: Send Metrics to Server

> **Requirement**: AGENT-006  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must send collected metrics to the server via HTTP POST.

## Protocol

```
POST <server_url>/api/v1/metrics
Authorization: Bearer <auth_token>
Content-Type: application/json

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
  "signature": "base64-encoded-hmac-sha256"
}
```

## Implementation

- File: `transport/index.ts`
- Use HTTP client to POST metrics
- Include bearer token authentication
- Sign payload with HMAC-SHA256
