# AGENT-001: CPU Metrics Collection

> **Requirement**: AGENT-001  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must collect CPU metrics including overall CPU usage percentage and the number of CPU cores.

## Metrics

| Field | Type | Description |
|-------|------|-------------|
| cpu_percent | number | Overall CPU usage (%) |
| cpu_count | number | Number of CPU cores |

## Implementation

- File: `collectors/cpu.ts`
- Collect CPU usage using system APIs
- Report percentage (0-100) and core count
