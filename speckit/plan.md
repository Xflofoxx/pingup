OpenCode Spec Kit – Plan

Architecture decisions:
- Language/runtime: pick one for this iteration (e.g., Python 3.12)
- Transport: HTTPS REST with TLS 1.3
- Security: JWT tokens; signature verification

Non-functional requirements:
- Performance: CPU < 2%, RAM < 50MB
- Reliability: watchdog, retry/backoff
- Security: TLS 1.3, certificate pinning where possible

Risks and mitigations:
- Risk: multi-language support increases complexity. Mitigation: start with Python implementation; plan modular interfaces.

Milestones:
- Phase 1: Speccify + Plan completion
- Phase 2: Implement skeleton modules
- Phase 3: End-to-end tests

Dependencies:
- Speckit skeleton; existing SPEC.md, AGENTS.md
