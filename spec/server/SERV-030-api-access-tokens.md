# API Access Tokens

> **Version**: 1.0.0  
> **Requirement ID**: SERV-030  
> **Component**: Server  
> **Status**: Proposed  

## 1. Description

Allow programmatic API access via tokens.

## 2. Requirements

### 2.1 Token Features

- Create API tokens
- Token expiration
- Token permissions/scopes
- Token rotation

### 2.2 Token Scopes

| Scope | Description |
|-------|-------------|
| metrics:read | Read metrics |
| metrics:write | Submit metrics |
| agents:read | Read agents |
| agents:write | Manage agents |
| admin | Full admin access |

### 2.3 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/api-tokens | List API tokens |
| POST | /api/v1/api-tokens | Create API token |
| DELETE | /api/v1/api-tokens/:id | Revoke API token |

## 3. Acceptance Criteria

- [ ] Can create API tokens
- [ ] Tokens have scoped permissions
- [ ] Can set token expiration
- [ ] Can revoke tokens
- [ ] Tokens work with Bearer auth

## 4. Related Requirements

- SERV-014: User Management
- SERV-027: API Rate Limiting
