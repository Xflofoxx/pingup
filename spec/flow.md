# SPEC Flow

Version: 1.0.0
Last Updated: 2026-02-26

## Overview
Define the lifecycle of a task to ensure traceability and auditability.

## High-level Flow
- Input: Task description and constraints (from SPEC, user request, or ticket)
- Plan: Agent selects approach, aligns to SPEC, prepares artifacts
- Execute: Agent runs, producing outputs (code, docs, configs, etc.)
- Validate: Validator checks alignment with SPEC (structure, formatting, tests)
- Output: Return artifact with SPEC-alignment metadata
- Review: PR review with validation report and diff

## Quality Gates
- Output must include SPEC metadata (spec_version, spec_id, alignment_score)
- Lint/format checks pass where applicable
- Test coverage where relevant
- No drift from the SPEC baseline for the given version

## Example Artifact Metadata
```
{
  "spec_version": "1.0.0",
  "spec_id": "flow-001",
  "alignment_score": 0.95,
  "files_changed": ["spec/core.md"],
  "notes": ["Added flow documentation"]
}
```
