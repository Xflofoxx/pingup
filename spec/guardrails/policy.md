# SPEC Guardrails

Version: 1.0.0
Last Updated: 2026-02-26

## AI Guardrails
- No execution of irreversible actions without explicit consent
- All actions auditable and logged
- Outputs must be traceable to SPEC sections
- If a request drifts from SPEC, must prompt for clarification or refuse

## Logging & Telemetry
- Structured logs with fields: spec_id, spec_version, alignment_score, timestamp
- Sensitive data redacted in logs
