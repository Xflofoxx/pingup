# Contributing to Pingup

Thank you for your interest in contributing to Pingup! This document provides guidelines for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Include steps to reproduce, expected behavior, and environment details

### Suggesting Features

1. Check the existing issues and discussions
2. Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Provide clear use cases and rationale

### Pull Requests

#### Branch Naming

Use the following conventions:

- `feat/XXX-description` - New features
- `fix/XXX-description` - Bug fixes
- `spec/XXX-description` - Feature specifications
- `test/XXX-description` - Test implementations
- `hotfix/XXX-description` - Critical production fixes

Where `XXX` is the GitHub issue number.

#### PR Requirements

- All tests must pass
- Linting must pass with no errors
- Tests are required for new features
- Follow the existing code style
- Update documentation when applicable
- Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md)

#### Development Workflow

```
master
  │
  ├──> spec/XXX        (Create specification)
  │       │
  │       └──> Review & Approve
  │
  ├──> feat/XXX        (Implement feature)
  │       │
  │       └──> Code Review
  │
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

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/Xflofoxx/pingup.git
cd pingup

# Install dependencies
cd server && bun install
cd ../agent && bun install

# Run migrations
cd server && bun run migrate

# Start development server
bun run dev

# Run tests
bun test

# Run linter
bun run lint
```

### Testing

All new features must include tests. Run tests with:

```bash
# Server tests
cd server && bun test

# Agent tests
cd agent && bun test

# With coverage
cd server && bun run test:coverage
```

### Linting

The project uses ESLint. Run linting with:

```bash
# Server
cd server && bun run lint

# Agent
cd agent && bun run lint

# Auto-fix
cd server && bun run lint:fix
```

### Changelog

When making changes, add entries to the [CHANGELOG.md](CHANGELOG.md) under the `[Unreleased]` section:

```markdown
## [Unreleased]

### Added
- New feature description (#issue)

### Changed
- Change description (#issue)

### Fixed
- Bug fix description (#issue)
```

Use the following prefixes:

- **Added** - New features
- **Changed** - Existing functionality modifications
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve issue with...`
- `docs: update documentation`
- `test: add tests for...`
- `refactor: simplify...`

### Review Process

1. All PRs require at least one review
2. Address feedback promptly
3. Ensure all checks pass before merging

## License

By contributing to Pingup, you agree that your contributions will be licensed under the [MIT License](LICENSE).
