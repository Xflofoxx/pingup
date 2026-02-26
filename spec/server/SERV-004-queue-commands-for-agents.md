# SERV-004: Queue Commands for Agents

> **Requirement**: SERV-004  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must queue commands for agents and allow them to fetch pending commands.

## SQLite Schema

```sql
CREATE TABLE commands (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  action TEXT,
  params TEXT,
  signature TEXT,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_commands_agent ON commands(agent_id);
CREATE INDEX idx_commands_status ON commands(status);
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/commands | List commands |
| GET | /api/v1/commands/pending/:agentId | Get pending commands |
| POST | /api/v1/commands | Create command |

## Implementation

- File: `services/commands.ts`
- File: `routes/commands.ts`
- Queue commands with status tracking
- Return pending commands to agents
