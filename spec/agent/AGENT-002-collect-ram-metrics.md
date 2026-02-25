# AGENT-002: RAM Metrics Collection

> **Requirement**: AGENT-002  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must collect RAM/memory metrics including usage percentage, used memory, available memory, and total memory.

## Metrics

| Field | Type | Description |
|-------|------|-------------|
| ram_percent | number | Memory usage (%) |
| ram_used_mb | number | Used memory (MB) |
| ram_available_mb | number | Available memory (MB) |
| ram_total_mb | number | Total memory (MB) |

## Implementation

- File: `collectors/ram.ts`
- Collect memory stats using system APIs
- Report values in MB and percentage
