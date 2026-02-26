# AGENT-005: Latency Measurement

> **Requirement**: AGENT-005  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must measure network latency by pinging a configured host.

## Metrics

| Field | Type | Description |
|-------|------|-------------|
| latency | number | Ping to host (ms), -1 on failure |

## Configuration

- `ping.host`: Host to ping (default: 8.8.8.8)
- `ping.timeout`: Timeout in seconds (default: 2)

## Implementation

- File: `collectors/cpu.ts` (latency collected with CPU)
- Execute ping and parse response time
- Return -1 on failure
