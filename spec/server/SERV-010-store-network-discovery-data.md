# SERV-010: Store Network Discovery Data

> **Requirement**: SERV-010  
> **Component**: Server  
> **Status**: Draft

## User Need

As a network administrator, I need the server to store network discovery results so I can query device history and track changes over time.

## Why This Requirement Exists

- Maintain historical record of network devices
- Detect when devices join/leave network
- Support network auditing and compliance
- Enable trend analysis

## Acceptance Criteria

### Storage Criteria

- [ ] DuckDB table for discovery scans
- [ ] Store scan timestamp, discovered hosts, and port status
- [ ] Index on timestamp for efficient queries
- [ ] Index on IP address for host lookup

### API Criteria

- [ ] Endpoint to receive discovery results from agents
- [ ] Endpoint to query discovery history by agent
- [ ] Endpoint to query discovery history by IP range
- [ ] Endpoint to get current network state

## Success Metrics

- Query 30 days of discovery data: <1 second
- Storage per scan: <1KB metadata + per-host data
- Retention: configurable (default: 90 days)

## Dependencies

- SERV-002: Store Metrics in DuckDB
