# Password Audit

> **Version**: 1.0.0  
> **Requirement ID**: AGENT-045  
> **Component**: Agent  
> **Status**: Proposed  

## 1. Description

Audit network services for weak/default credentials.

## 2. Requirements

### 2.1 Password Checks

| Service | Default Accounts |
|---------|------------------|
| SSH | root/root, admin/admin |
| Telnet | root/root, admin/admin |
| FTP | anonymous/anonymous |
| SMB | guest/guest |
| HTTP | admin/admin |

### 2.2 Password Audit

| Feature | Description |
|---------|-------------|
| wordlist | Custom password list |
| common_passwords | Top 100 passwords |
| default_check | Check default credentials |

### 2.3 Implementation

```bash
# Audit SSH
pingup agent audit-passwords ssh 192.168.1.0/24

# Audit all services
pingup agent audit-passwords all
```

## 3. Acceptance Criteria

- [ ] Check default credentials
- [ ] Common password check
- [ ] Multiple services
- [ ] Secure reporting

## 4. Related Requirements

- AGENT-035: Port Service Detection
- AGENT-042: Intrusion Detection
