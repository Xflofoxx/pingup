# Workflow Specification

> **Version**: 1.0.0  
> **Status**: Active  
> **Effective Date**: 2026-02-25

---

## 1. Overview

This document defines the Git workflow and development process for Pingup. Every feature, fix, or change follows a structured process from specification to production.

---

## 2. Branching Strategy

### 2.1 Branch Types

| Branch | Purpose | Base | Merges To |
|--------|---------|------|-----------|
| `master` | Production-ready code | - | - |
| `spec/XXX` | Feature specification | master | - |
| `feat/XXX` | Feature implementation | master | `test/XXX` after spec approval |
| `test/XXX` | Test implementation | `feat/XXX` | `master` after tests pass |
| `fix/XXX` | Bug fix | master | `test/XXX` after fix |
| `hotfix/XXX` | Critical production fix | master | master directly |

### 2.2 Branch Naming Convention

```
<type>/<issue-number>-<short-description>
```

Examples:
- `feat/001-dashboard-ui-redesign`
- `fix/002-login-cookie-error`
- `spec/003-network-discovery-api`
- `test/004-agent-metrics-validation`

---

## 3. Development Workflow

### 3.1 Standard Feature Flow

```
master
  │
  ├──> spec/XXX        (Create specification)
  │       │
  │       └──> Review & Approve
  │               │
  ├──> feat/XXX        (Implement feature)
  │       │
  │       └──> Code Review
  │               │
  ├──> test/XXX        (Write tests)
  │       │
  │       └──> Run Tests ──> All Pass?
  │               │              │
  │               No             Yes
  │               │              │
  │               v              v
  │         Fix Tests      Merge to master
  │
  └──> Delete branch after merge
```

### 3.2 Detailed Steps

#### Step 1: Create Specification Branch
```bash
git checkout master
git pull origin master
git checkout -b spec/001-feature-name
# Write SPEC.md or update existing spec
git add spec/
git commit -m "spec: add feature specification"
git push -u origin spec/001-feature-name
```

#### Step 2: Approve Specification
- Review spec with team
- Ensure all requirements are testable
- Mark spec as approved

#### Step 3: Create Feature Branch
```bash
git checkout master
git checkout -b feat/001-feature-name
# Implement feature
git add .
git commit -m "feat: implement feature"
git push -u origin feat/001-feature-name
```

#### Step 4: Create Test Branch
```bash
git checkout feat/001-feature-name
git checkout -b test/001-feature-name
# Write tests
git add .
git commit -m "test: add tests for feature"
git push -u origin test/001-feature-name
```

#### Step 5: Run Tests
```bash
cd server && bun test
```

**CRITICAL**: Tests MUST pass before merge. If tests fail:
1. Fix the code, not the tests
2. Re-run tests
3. Only proceed when all tests pass

#### Step 6: Merge to Master
```bash
git checkout master
git pull origin master
git merge --no-ff test/001-feature-name
git push origin master
```

#### Step 7: Cleanup
```bash
git branch -d feat/001-feature-name
git branch -d test/001-feature-name
git push origin --delete feat/001-feature-name
git push origin --delete test/001-feature-name
```

---

## 4. Hotfix Workflow

For critical production issues:

```
master
  │
  └──> hotfix/XXX      (Fix critical issue)
          │
          └──> Write fix + tests
                  │
                  └──> Run tests ──> Pass?
                          │            │
                          No           Yes
                          │            │
                          v            v
                    Fix code      Merge directly
                                  to master
```

---

## 5. Specification Requirements

Every spec must include:

- [ ] Clear description of the feature/change
- [ ] List of acceptance criteria
- [ ] Test cases that verify acceptance criteria
- [ ] Link to related specs (if any)
- [ ] Implementation notes (optional)

---

## 6. Test Requirements

### 6.1 Test Coverage

- All new features MUST have tests
- Tests MUST verify acceptance criteria
- Tests MUST pass before merge to master

### 6.2 Running Tests

```bash
# Server tests
cd server && bun test

# With coverage
cd server && bun test --coverage
```

---

## 7. Merge Rules

### 7.1 Allowed Merges

| From | To | Requirements |
|------|-----|--------------|
| spec/XXX | - | Review approved |
| feat/XXX | test/XXX | Code review approved |
| test/XXX | master | All tests pass |
| hotfix/XXX | master | All tests pass + critical reason |

### 7.2 Merge Strategy

- Use `--no-ff` flag for all merges
- Always pull latest before merging
- Resolve conflicts in feature branch first

---

## 8. Quick Reference

### Create new feature:
```bash
# 1. Spec
git checkout -b spec/XXX-description
# ... write spec, commit, push, PR

# 2. Feature  
git checkout -b feat/XXX-description
# ... implement, commit, push

# 3. Tests
git checkout -b test/XXX-description
# ... write tests, commit, push

# 4. Run tests
cd server && bun test

# 5. Merge
git checkout master
git merge --no-ff test/XXX-description
git push
```

### Quick fix:
```bash
git checkout -b fix/XXX-description
# ... fix + test
cd server && bun test
git checkout master
git merge --no-ff fix/XXX-description
git push
```

---

## 9. Enforcement

This workflow is **mandatory**. Pull requests that:
- Do not follow branch naming
- Do not include tests
- Have failing tests

...will be **rejected**.

---

## 10. Related Documents

| Document | Description |
|----------|-------------|
| spec/CONTEXT.md | Development constitution |
| spec/CODING_STYLE.md | Coding standards |
| spec/flow.md | Task lifecycle and quality gates |

---

## 11. SPEC Flow

### 11.1 Overview
Define the lifecycle of a task to ensure traceability and auditability.

### 11.2 High-level Flow
- Input: Task description and constraints (from SPEC, user request, or ticket)
- Plan: Agent selects approach, aligns to SPEC, prepares artifacts
- Execute: Agent runs, producing outputs (code, docs, configs, etc.)
- Validate: Validator checks alignment with SPEC (structure, formatting, tests)
- Output: Return artifact with SPEC-alignment metadata
- Review: PR review with validation report and diff

### 11.3 Quality Gates
- Output must include SPEC metadata (spec_version, spec_id, alignment_score)
- Lint/format checks pass where applicable
- Test coverage where relevant
- No drift from the SPEC baseline for the given version

### 11.4 Example Artifact Metadata
```json
{
  "spec_version": "1.0.0",
  "spec_id": "flow-001",
  "alignment_score": 0.95,
  "files_changed": ["spec/core.md"],
  "notes": ["Added flow documentation"]
}
```
