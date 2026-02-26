# SERV-005: Store Command Results

> **Requirement**: SERV-005  
> **Component**: Server  
> **Status**: Implementation Ready

## Description

The server must store the results of executed commands.

## Endpoint

```
POST /api/v1/commands/:id/result
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "result": { "success": true },
  "status": "completed"
}
```

## Storage

- Store in `commands` table: `result` and `status` fields
- Update command record with execution result

## Implementation

- File: `routes/commands.ts`
- Update command status and result
- Track completion/failure
