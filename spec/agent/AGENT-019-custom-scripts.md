# Custom Scripts

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-019  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Execute custom scripts and collect their output as metrics.

## 2. Requirements

### 2.1 Script Configuration

```yaml
custom_scripts:
  - name: app_errors
    command: tail -n 100 /var/log/app.log | grep ERROR | wc -l
    interval: 60
    timeout: 30
  
  - name: db_connections
    command: psql -t -c "SELECT count(*) FROM pg_stat_activity"
    interval: 300
```

### 2.2 Script Output

- Parse stdout as metric value
- Support numeric output
- Support JSON output
- Capture stderr for debugging

### 2.3 Script Management

- Add/remove scripts
- Enable/disable scripts
- Script timeout handling
- Script error handling

## 3. Implementation

### CLI Commands

```bash
# List custom scripts
pingup agent scripts

# Run script manually
pingup agent scripts run app_errors
```

## 4. Acceptance Criteria

- [ ] Can configure custom scripts
- [ ] Scripts execute on schedule
- [ ] Output parsed as metrics
- [ ] Errors handled gracefully
- [ ] Can disable scripts

## 5. Related Requirements

- AGENT-026: Custom Metrics (Server)
