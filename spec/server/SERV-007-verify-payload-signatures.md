# SERV-007: Verify Payload Signatures

> **Requirement**: SERV-007  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must verify HMAC-SHA256 signatures on all incoming payloads.

## Signature Verification

- Algorithm: HMAC-SHA256
- Key: Shared secret (auth_token)
- Input: Request body
- Verification: Compare computed signature with provided signature

## Security

- Reject unsigned payloads
- Reject invalid signatures
- Log verification failures

## Implementation

- File: `middleware/auth.ts`
- Verify signatures on protected endpoints
- Return 403 Forbidden on failure
