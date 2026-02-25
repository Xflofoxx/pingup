# AGENT-012: Expose Local Status API

> **Requirement**: AGENT-012  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must expose a local HTTP API for status and metrics inspection.

## Local API (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /status | GET | Agent status |
| /metrics | GET | Current metrics |
| /health | GET | Health check |

## Implementation

- File: `index.ts`
- Hono server on port 8080
- Return JSON responses
