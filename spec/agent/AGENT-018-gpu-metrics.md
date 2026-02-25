# GPU Metrics

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-018  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Collect GPU metrics on systems with NVIDIA or AMD GPUs.

## 2. Requirements

### 2.1 NVIDIA Metrics

| Metric | Description |
|--------|-------------|
| gpu_name | GPU model name |
| gpu_utilization | GPU usage percentage |
| memory_used | Memory used (MB) |
| memory_total | Total memory (MB) |
| temperature | GPU temperature |
| power_usage | Power draw (watts) |
| fan_speed | Fan speed percentage |

### 2.2 AMD Metrics

| Metric | Description |
|--------|-------------|
| gpu_name | GPU model name |
| gpu_utilization | GPU usage |
| memory_used | VRAM used |
| temperature | GPU temperature |

## 3. Implementation

### CLI Commands

```bash
# GPU info
pingup agent gpu

# GPU stats
pingup agent gpu --json
```

## 4. Acceptance Criteria

- [ ] Detect NVIDIA GPU
- [ ] Collect NVIDIA metrics via nvidia-smi
- [ ] Detect AMD GPU
- [ ] Graceful fallback if no GPU

## 5. Related Requirements

- AGENT-001: Collect CPU Metrics
- AGENT-002: Collect RAM Metrics
