OpenCode Spec Kit – Implement

Guidelines:
- Implement against the plan and tasks in speckit/plan.md and speckit/tasks.md
- Use a single source of truth: SPEC.md and AGENTS.md define expectations
- Output must be clean, well-documented, and testable.

Code structure guidance:
- Use a single language for MVP (e.g., Python)
- Expose a simple CLI to interact with the agent
- Provide unit tests for core functionality

Acceptance criteria for implementation:
- All tasks have at least one tests
- Core telemetry collector runs in a sandbox
- Secure transport is validated end-to-end
