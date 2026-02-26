# AGENT-051 - Agent Dashboard Page

> **Version**: 1.0.0  
> **Component**: Agent  
> **Status**: Proposed

## 1. Overview

Agent dashboard page - a web interface on agent port 8080 that displays system metrics in human-friendly format, searchable logs, and protected actions. Access is authorized by the server, only for the owner user of the agent.

## 2. Related Requirements

- SERV-003: Agent registry with owner association
- SERV-006: Agent configuration management

## 3. User Stories

### 3.1 View Metrics
> Come proprietario dell'agente, voglio visualizzare le metriche di sistema in modo chiaro e leggibile, per monitorare lo stato della macchina.

### 3.2 Search Logs
> Come proprietario dell'agente, voglio cercare nei log dell'agente per troubleshooting e analisi.

### 3.3 Protected Actions
> Come proprietario dell'agente, voglio eseguire azioni protette (es. riavvio) solo dopo verifica della mia password, per sicurezza.

### 3.4 Server Authorization
> Come utente, voglio che l'accesso alla dashboard sia verificato dal server, per garantire che solo il proprietario dell'agente possa accedere.

## 4. Technical Specification

### 4.1 Database Changes

```sql
ALTER TABLE agents ADD COLUMN owner_id TEXT;
```

### 4.2 Server Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/agents/:id/access | Cookie | Verify user has owner access to agent |
| POST | /api/v1/agents/:id/owner | Cookie | Set owner of agent |
| POST | /api/v1/agents/:id/verify-password | None | Verify owner password for protected actions |

### 4.3 Agent Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard | None | HTML dashboard page |
| GET | /metrics | None | JSON metrics (existing) |
| GET | /status | None | JSON status (existing) |
| GET | /logs | None | JSON logs array |
| POST | /auth/login | None | Authenticate via server token |
| POST | /auth/logout | None | Clear session |
| POST | /auth/verify-password | Session | Verify owner password |

### 4.4 Dashboard Features

1. **Login**: User enters server auth token
2. **Metrics Display**:
   - CPU, RAM, Disk percentages
   - Network latency
   - System uptime
   - Agent info
3. **Log Viewer**:
   - Searchable by text
   - Filterable by level (info/warn/error)
   - Auto-refresh
4. **Protected Actions**:
   - Restart agent (requires password verification)
5. **Traceability**:
   - Session ID display
   - User info
   - Agent ID

## 5. Acceptance Criteria

- [ ] Dashboard page accessible at http://localhost:8080/dashboard
- [ ] Login requires valid server auth token
- [ ] Only agent owner can access dashboard
- [ ] Metrics displayed in human-friendly format
- [ ] Logs searchable and filterable
- [ ] Restart action requires password verification via server
- [ ] Traceability info visible on page
- [ ] Responsive design for mobile

## 6. Security Considerations

- Password verification happens server-side
- Token stored in memory only (lost on restart)
- No persistent session storage
- All sensitive actions require re-authentication
