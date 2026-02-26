# AGENT-004: Network Metrics Collection

> **Requirement**: AGENT-004  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must collect network metrics including bytes sent/received and packet counts.

## Metrics

| Field | Type | Description |
|-------|------|-------------|
| bytes_sent_mb | number | Bytes sent (MB) |
| bytes_recv_mb | number | Bytes received (MB) |
| packets_sent | number | Packets sent |
| packets_recv | number | Packets received |

## Implementation

- File: `collectors/network.ts`
- Collect network I/O using system APIs
- Report cumulative values
