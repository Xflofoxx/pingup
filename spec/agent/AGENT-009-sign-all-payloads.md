# AGENT-009: Sign All Payloads

> **Requirement**: AGENT-009  
> **Component**: Agent  
> **Status**: Implementation Ready

## Description

All payloads sent to the server must be signed with HMAC-SHA256.

## Signature Mechanism

- Algorithm: HMAC-SHA256
- Key: `auth_token` from configuration
- Output: Base64-encoded signature
- Field: `signature` in payload

## Verification

- Server verifies signature before processing
- Reject payloads with invalid signature

## Implementation

- File: `transport/index.ts`
- Sign all outgoing payloads
- Include signature in request body
