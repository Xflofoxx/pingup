# SERV-014: User Management

> **Requirement**: SERV-014  
> **Component**: Server (Dashboard)  
> **Status**: Draft

## User Need

As an administrator, I need to create, read, update, and delete user accounts with role assignments to manage dashboard access.

## Why This Requirement Exists

- Enable multi-user access to dashboard
- Support role-based access control
- Maintain user lifecycle (create, disable, delete)
- Audit user activities

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'PUB',
  totp_secret TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT,
  status TEXT DEFAULT 'active',
  metadata TEXT
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### Audit Log Table

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
```

## API Endpoints

### Users

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /api/v1/users | ADM | List all users |
| GET | /api/v1/users/:id | ADM | Get user details |
| POST | /api/v1/users | ADM | Create new user |
| PUT | /api/v1/users/:id | ADM | Update user |
| DELETE | /api/v1/users/:id | ADM | Delete user |
| POST | /api/v1/users/:id/disable | ADM | Disable user |
| POST | /api/v1/users/:id/enable | ADM | Enable user |

### Authentication

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | - | Register new user |
| POST | /api/v1/auth/login | - | Login with TOTP |
| POST | /api/v1/auth/logout | AUTH | Logout |
| GET | /api/v1/auth/me | AUTH | Get current user |

### Audit

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /api/v1/audit | ADM | List audit logs |

## User Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Auto | Unique identifier |
| username | string | Yes | Login username |
| role | string | Yes | One of: PUB, IT, SUP, ADM |
| totp_secret | string | Auto | TOTP secret |
| status | string | Auto | active, disabled |
| created_at | timestamp | Auto | Creation time |
| last_login | timestamp | Auto | Last login time |

## Acceptance Criteria

### User Management

- [ ] Admin can create users with username, role
- [ ] Admin can view list of all users
- [ ] Admin can edit user role
- [ ] Admin can disable/enable users
- [ ] Admin can delete users
- [ ] Username must be unique

### Authentication

- [ ] New user registration generates TOTP secret
- [ ] QR code displayed for TOTP setup
- [ ] Manual secret key displayed
- [ ] Login validates TOTP code
- [ ] Session cookie set on successful login
- [ ] Logout clears session

### Audit

- [ ] All admin actions logged
- [ ] Login attempts logged
- [ ] Failed login attempts logged
- [ ] Audit logs viewable by admin

## Dependencies

- SERV-011: Dashboard Authentication
- SERV-012: Dashboard RBAC

## Success Metrics

- User CRUD operations: <100ms
- Login validation: <500ms
- Audit log query: <1s for 30 days
