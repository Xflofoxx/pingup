# Container Metrics

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-017  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Collect metrics from Docker and other container runtimes.

## 2. Requirements

### 2.1 Container Metrics

| Metric | Description |
|--------|-------------|
| container_count | Number of running containers |
| container_cpu | Aggregate CPU usage |
| container_memory | Aggregate memory usage |
| container_status | Per-container status |

### 2.2 Per-Container Data

| Field | Description |
|-------|-------------|
| id | Container ID |
| name | Container name |
| image | Container image |
| status | running/stopped/paused |
| cpu_percent | CPU usage |
| memory_percent | Memory usage |
| network_rx | Network bytes received |
| network_tx | Network bytes sent |

## 3. Implementation

### CLI Commands

```bash
# List containers
pingup agent containers

# Container stats
pingup agent containers --stats
```

## 4. Acceptance Criteria

- [ ] Detect Docker runtime
- [ ] List running containers
- [ ] Collect container metrics
- [ ] Include in metrics submission

## 5. Related Requirements

- AGENT-004: Collect Network Metrics
- AGENT-006: Send Metrics to Server
