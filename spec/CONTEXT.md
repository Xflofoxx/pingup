# Pingup Development Constitution

> **Version**: 1.0.0  
> **Effective Date**: 2026-02-25  
> **Status**: Immutable Core Principle

This constitution defines the immutable architectural principles that govern all Pingup development. These principles ensure consistency, quality, and maintainability across all implementations.

---

## Article I: Library-First Principle

Every feature MUST begin as a standalone library—no exceptions.

- All functionality MUST be implemented as reusable library components
- No feature shall be implemented directly within application code without first being abstracted
- Libraries MUST have clear boundaries and minimal dependencies
- Each library MUST be independently testable

## Article II: CLI Interface Mandate

Every library MUST expose its functionality through a command-line interface:

- All CLI interfaces MUST accept text as input (via stdin, arguments, or files)
- All CLI interfaces MUST produce text as output (via stdout)
- All CLI interfaces MUST support JSON format for structured data exchange
- This ensures observability and testability of all functionality

## Article III: Test-First Imperative

**NON-NEGOTIABLE**: All implementation MUST follow strict Test-Driven Development.

1. Unit tests MUST be written BEFORE implementation code
2. Tests MUST be validated and approved before proceeding
3. Tests MUST be confirmed to FAIL (Red phase) before implementation

## Article IV: Specification Completeness

All specifications MUST be complete and unambiguous:

- No [NEEDS CLARIFICATION] markers may remain in final specifications
- All requirements MUST be testable and unambiguous
- Success criteria MUST be measurable and concrete
- Every technical choice MUST link back to specific requirements

## Article V: Separation of Concerns

Specifications MUST maintain proper abstraction levels:

- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure in user-facing specs)
- Implementation details belong in separate technical specification files
- Keep high-level specifications readable and navigable

## Article VI: Traceable Decisions

Every technical choice MUST be documented and traceable:

- All architectural decisions MUST have documented rationale
- Requirements MUST be traceable to acceptance criteria
- Changes to specifications MUST maintain traceability

## Article VII: Simplicity Principle

Minimal project structure for initial implementation:

- Maximum 3 projects for initial implementation
- Additional projects require documented justification
- No future-proofing - implement only what is needed
- Start simple, add complexity only when proven necessary

## Article VIII: Anti-Abstraction Principle

Trust framework features directly:

- Use framework features directly rather than wrapping them
- Single model representation - avoid duplicate data structures
- Prefer composition over inheritance
- Don't abstract what you don't understand

## Article IX: Integration-First Testing

Tests MUST use realistic environments:

- Prefer real databases over mocks
- Use actual service instances over stubs
- Contract tests are mandatory before implementation
- Test in real environments, not artificial ones

---

## Constitutional Enforcement

### Phase Gates (Pre-Implementation)

Before any implementation begins, the following gates MUST be passed:

#### Simplicity Gate (Article VII)
- [ ] Using ≤3 projects?
- [ ] No future-proofing?

#### Anti-Abstraction Gate (Article VIII)
- [ ] Using framework directly?
- [ ] Single model representation?

#### Integration-First Gate (Article IX)
- [ ] Contracts defined?
- [ ] Contract tests written?

### Requirement Completeness Checklist

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] All phases have clear prerequisites and deliverables
- [ ] No speculative or "might need" features

---

## Amendment Process

Modifications to this constitution require:
- Explicit documentation of the rationale for change
- Review and approval by project maintainers
- Backwards compatibility assessment

---

## Constitutional Philosophy

This constitution embodies the following development philosophy:

- **Observability Over Opacity**: Everything must be inspectable through CLI interfaces
- **Simplicity Over Cleverness**: Start simple, add complexity only when proven necessary
- **Integration Over Isolation**: Test in real environments, not artificial ones
- **Modularity Over Monoliths**: Every feature is a library with clear boundaries
- **Traceability Over Assumptions**: Every decision must be documented
