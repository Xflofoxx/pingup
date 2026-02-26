# AGENT-007: Poll for Commands

> **Requirement**: AGENT-007  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must periodically poll the server for pending commands.

## Protocol

```
GET <server_url>/api/v1/commands/pending/<agent_id>
Authorization: Bearer <auth_token>

Response:
[
  {
    "commandId": "CMD-2026-001",
    "action": "restart_service",
    "params": { "service": "nginx" },
    "signature": "base64-encoded-hmac-sha256"
  }
]
```

## Implementation

- File: `transport/index.ts`
- Poll server at configured interval
- Verify command signature before execution
- Return empty array if no pending commands
