# SERV-006: Manage Agent Configurations

> **Requirement**: SERV-006  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must manage agent configurations and allow agents to fetch updates.

## SQLite Schema

```sql
CREATE TABLE configs (
  agent_id TEXT PRIMARY KEY,
  config TEXT,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/config/:agentId | Get agent config |
| POST | /api/v1/config/:agentId | Update agent config |

## Implementation

- File: `routes/config.ts`
- Store configuration per agent
- Track version for updates
- Return config to agents on request
