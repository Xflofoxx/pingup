# SERV-008: Health Check Endpoint

> **Requirement**: SERV-008  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must expose a health check endpoint for monitoring.

## Endpoint

```
GET /health
```

## Response

- 200 OK: Server is healthy
- Returns status of dependencies (SQLite, DuckDB)

## Implementation

- File: `index.ts`
- Check database connections
- Return health status
