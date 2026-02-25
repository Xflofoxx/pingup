# AGENT-011: Fetch Configuration from Server

> **Requirement**: AGENT-011  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must be able to fetch its configuration from the server.

## Protocol

```
GET <server_url>/api/v1/config/<agent_id>
Authorization: Bearer <auth_token>
```

## Response

```json
{
  "config": {
    "poll_interval": 30,
    "modules": ["cpu", "ram", "disk", "network"]
  },
  "version": 1
}
```

## Implementation

- File: `transport/index.ts`
- Fetch config on startup
- Apply received configuration
- Support hot config updates
