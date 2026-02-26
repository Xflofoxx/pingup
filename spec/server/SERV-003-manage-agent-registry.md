# SERV-003: Manage Agent Registry

> **Requirement**: SERV-003  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must manage the agent registry including registration, heartbeat, and status tracking.

## SQLite Schema

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/agents | List all agents |
| GET | /api/v1/agents/:id | Get agent details |
| POST | /api/v1/agents | Register new agent |
| DELETE | /api/v1/agents/:id | Remove agent |
| POST | /api/v1/agents/:id/heartbeat | Agent heartbeat |

## Implementation

- File: `services/agent.ts`
- File: `routes/agents.ts`
- Track agent online/offline status
- Update last_seen on heartbeat
