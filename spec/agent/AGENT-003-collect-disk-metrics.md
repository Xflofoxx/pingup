# AGENT-003: Disk Metrics Collection

> **Requirement**: AGENT-003  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must collect disk metrics including average disk usage percentage and per-partition details.

## Metrics

| Field | Type | Description |
|-------|------|-------------|
| disk_percent | number | Average disk usage (%) |
| partitions | array | Per-partition details |

## Implementation

- File: `collectors/disk.ts`
- Collect disk usage using system APIs
- Report average and per-partition breakdown
