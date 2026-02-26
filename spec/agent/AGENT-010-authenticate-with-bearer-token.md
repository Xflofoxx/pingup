# AGENT-010: Authenticate with Bearer Token

> **Requirement**: AGENT-010  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

The agent must authenticate with the server using a bearer token.

## Authentication

- Header: `Authorization: Bearer <auth_token>`
- Token: Configured via `auth_token` in config.yaml

## Implementation

- File: `transport/index.ts`
- Include Authorization header on all requests
- Use configured auth_token
