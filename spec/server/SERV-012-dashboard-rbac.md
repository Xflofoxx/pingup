# SERV-012: Dashboard RBAC

> **Requirement**: SERV-012  
> **Component**: Server (Dashboard)  
> **Status**: Draft

## User Need

As a system administrator, I need to control access to dashboard features based on user roles to ensure proper separation of duties and data security.

## Why This Requirement Exists

- Protect sensitive data from unauthorized access
- Enforce least-privilege access model
- Support organizational roles and responsibilities
- Audit access for compliance

## Roles

### 1. Public (PUB)

**User**: Anonymous visitor viewing public health statistics

| Permission | Access |
|------------|--------|
| View public dashboard | Yes |
| View aggregate statistics | Yes (anonymized) |
| View agent details | No |
| View network discovery | No |
| Modify anything | No |

### 2. Operative IT (IT)

**User**: IT operations staff managing agents and nodes

| Permission | Access |
|------------|--------|
| View public dashboard | Yes |
| View all statistics | Yes |
| View agent details | Yes |
| Manage agents | Yes |
| Execute commands | Yes |
| View network discovery | Yes |
| View system logs | Yes |
| Manage users | No |
| Modify configuration | No |

### 3. Supervision/CISO (SUP)

**User**: Security manager, CISO reviewing cybersecurity posture

| Permission | Access |
|------------|--------|
| View public dashboard | Yes |
| View all statistics | Yes |
| View agent details | Yes |
| View security metrics | Yes |
| View network discovery | Yes |
| View security logs | Yes |
| View audit logs | Yes |
| Manage users | No |
| Modify configuration | No |

### 4. Admin (ADM)

**User**: Full system administrator

| Permission | Access |
|------------|--------|
| View public dashboard | Yes |
| View all statistics | Yes |
| View agent details | Yes |
| Manage agents | Yes |
| Execute commands | Yes |
| View network discovery | Yes |
| Manage users | Yes |
| Modify configuration | Yes |
| View audit logs | Yes |
| System settings | Yes |

## Implementation

### Role Hierarchy

```
ADM (Admin)
  └─ SUP (Supervision)
       └─ IT (Operative)
            └─ PUB (Public)
```

### Middleware

- `requireAuth`: Validates session cookie
- `requireRole(roles[])`: Validates user has required role

## Dependencies

- SERV-011: Dashboard Authentication

## Success Metrics

- Role check latency: <10ms
- Correct permission enforcement: 100%
