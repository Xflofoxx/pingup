# SPEC CI

Version: 1.0.0
Last Updated: 2026-02-26

## Global Gate Rules
- Lint and formatting checks must pass
- Unit/Integration tests must pass
- SPEC validator (alignment checks) must pass for outputs
- PR must have at least one approval

## Gate Types
- Pre-commit: quick lint/format checks
- Pre-merge: full test suite and SPEC validator
- Post-merge: optional sanity checks and monitoring

## Versioning SPEC in CI
- Lock SPEC version for the pipeline run (e.g., SPEC v1.0.0)
- Validate drift against SPEC baseline during PR review
