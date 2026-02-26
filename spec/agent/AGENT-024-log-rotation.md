# Log Rotation

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-024  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Manage agent log rotation to prevent disk space issues.

## 2. Requirements

### 2.1 Log Configuration

```yaml
logging:
  file: /var/log/pingup/agent.log
  max_size: 10MB
  max_files: 5
  compress: true
```

### 2.2 Log Options

- Size-based rotation
- Time-based rotation
- Compression of old logs
- Configurable retention

### 2.3 Log Levels

| Level | Description |
|-------|-------------|
| debug | Detailed debug info |
| info | General information |
| warn | Warning messages |
| error | Error messages |

## 3. Implementation

### CLI Commands

```bash
# View logs
pingup agent logs

# Logs with tail
pingup agent logs --tail

# Rotate logs
pingup agent logs --rotate
```

## 4. Acceptance Criteria

- [ ] Rotate logs by size
- [ ] Rotate logs by time
- [ ] Compress old logs
- [ ] Configurable retention
- [ ] Proper file permissions

## 5. Related Requirements

- AGENT-012: Expose Local Status API
