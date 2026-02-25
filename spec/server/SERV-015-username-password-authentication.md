# SERV-015: Username/Password Authentication

> **Requirement**: SERV-015  
> **Component**: Server (Dashboard)  
> **Status**: Draft

## User Need

As a user, I need to authenticate using username and password as an alternative to TOTP, especially for local development and testing.

## Why This Requirement Exists

- Simplify local development and testing
- Provide fallback authentication method
- Support environments without mobile authenticator apps

## Acceptance Criteria

### Registration Criteria

- [ ] User can register with username and password
- [ ] Password must be at least 6 characters
- [ ] Password is hashed with bcrypt before storage
- [ ] User can choose between TOTP or password authentication

### Login Criteria

- [ ] User can login with username + password
- [ ] Password verification uses bcrypt comparison
- [ ] Session created on successful login

### Database Schema

```sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

### API Changes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/register-password | Register with password |
| POST | /api/v1/auth/login-password | Login with password |

### Request/Response

**Register with password:**
```json
POST /api/v1/auth/register-password
{
  "username": "admin",
  "password": "securepassword123"
}
```

**Login with password:**
```json
POST /api/v1/auth/login-password
{
  "username": "admin",
  "password": "securepassword123"
}
```

## Dependencies

- SERV-011: Dashboard Authentication

## Implementation Notes

- Passwords stored with bcrypt hash
- Minimum password length: 6 characters
- Both auth methods can coexist for same user
