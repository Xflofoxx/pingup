# SERV-043: Local Test User

> **Requirement**: SERV-043  
> **Component**: Server (Authentication)  
> **Status**: Draft

## User Need

As a developer, I need a pre-configured test user that can authenticate without TOTP when accessing the application from localhost or 127.0.0.1, so I can quickly test the application during development.

## Why This Requirement Exists

- Speed up development workflow by eliminating TOTP setup for local testing
- Provide easy access to full admin privileges for testing
- Prevent accidental exposure of privileged accounts in production

## Requirements

### 1. Local Test User Account

- Pre-created user with username: `testadmin`
- Role: `SUP` (Superuser - highest privilege level)
- Password-based authentication (no TOTP required)
- Special flag/attribute marking it as "local-only"

### 2. Local Access Detection

- Detect if request originates from localhost (127.0.0.1) or ::1
- Check the Host header or the actual connection IP
- Allow local test user authentication ONLY from local connections

### 3. Security Constraints

- Test user CANNOT authenticate from non-local addresses
- Test user CANNOT be used if accessed via hostname (even if resolves to localhost)
- Test user is disabled by default in production environment

## Implementation Details

### Environment-Based Activation

- Development mode: `NODE_ENV=development` or `DEV_MODE=true`
- When enabled, test user is active
- In production, test user is ignored/not usable

### Database Changes

```sql
-- Add local_only flag to users table
ALTER TABLE users ADD COLUMN local_only INTEGER DEFAULT 0;

-- Add password field (plain for test user)
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

### Authentication Flow

1. User submits username/password to `/api/v1/auth/login`
2. If username is `testadmin`:
   - Check if request is from localhost/127.0.0.1
   - If not local → reject with "Access denied: local user"
   - If local → verify password without TOTP
3. If normal user → standard TOTP flow

## API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/login | - | Login (supports local test user) |

## Acceptance Criteria

- [ ] Test user `testadmin` exists in database with SUP role
- [ ] Test user can login without TOTP when accessed from localhost
- [ ] Test user can login without TOTP when accessed from 127.0.0.1
- [ ] Test user CANNOT login from non-local addresses
- [ ] Test user authentication works only in development mode
- [ ] Password is configurable via environment variable

## Configuration

```yaml
# server/config.yaml
test_user:
  enabled: true
  username: testadmin
  password: devpassword123
```

## Dependencies

- SERV-014: User Management
- SERV-011: Dashboard Authentication

## Success Metrics

- Local test user login: <200ms
- IP detection: <10ms
