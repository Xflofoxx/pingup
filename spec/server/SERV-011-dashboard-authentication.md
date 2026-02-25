# SERV-011: Dashboard Authentication

> **Requirement**: SERV-011  
> **Component**: Server (Dashboard)  
> **Status**: Draft

## User Need

As a user, I need to authenticate to the dashboard using a secure keyphrase generated on my mobile device, without traditional passwords.

## Why This Requirement Exists

- Eliminate password-related security vulnerabilities
- Provide secure, passwordless authentication
- Enable mobile-first authentication flow
- Support multi-factor authentication scenario

## Acceptance Criteria

### Authentication Criteria

- [ ] Users register with username and mobile keyphrase setup
- [ ] Keyphrase is generated using TOTP (Time-based One-Time Password)
- [ ] 6-digit TOTP code expires every 30 seconds
- [ ] Login requires username + current TOTP code
- [ ] Session maintained via secure HTTP-only cookies

### Registration Flow

1. User provides desired username
2. System generates TOTP secret
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. User confirms with initial TOTP code
5. Account is created

### Login Flow

1. User enters username
2. User enters current TOTP code from mobile app
3. System validates code
4. On success, redirect to dashboard

## Dependencies

- SERV-006: Manage Agent Configurations (for user configs)

## Success Metrics

- Authentication time: <500ms
- TOTP validation: 100% accurate
- Session timeout: 24 hours (configurable)
