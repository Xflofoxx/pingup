# SERV-002: Store Metrics in DuckDB

> **Requirement**: SERV-002  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must store metrics in DuckDB for time-series analytics.

## DuckDB Schema

``` metrics (
  agent_id TEXT,
 sql
CREATE TABLE timestamp TIMESTAMP,
  cpu DOUBLE,
  ram DOUBLE,
  disk DOUBLE,
  latency INTEGER,
  status TEXT
);

CREATE INDEX idx_metrics_agent ON metrics(agent_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
```

## Implementation

- File: `db/duckdb.ts`
- Insert metrics into DuckDB
- Maintain time-series indexes
- Support high-throughput inserts (1000+/sec)
