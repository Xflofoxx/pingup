# Contributing to Pingup

Thank you for your interest in contributing to Pingup!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) to create a new issue
3. Include as much detail as possible to help us reproduce the bug

### Suggesting Features

1. Check if the feature has already been requested
2. Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) to create a new issue
3. Explain why this feature would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure everything works
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Xflofoxx/pingup.git
cd pingup

# Install dependencies
cd agent && bun install
cd ../server && bun install

# Run tests
cd agent && bun test
cd ../server && bun test

# Lint
cd agent && bun run lint
cd ../server && bun run lint
```

## Code Style

- Use TypeScript with strict type checking
- Follow existing code conventions
- Run lint before committing
- Write tests for new features

## Project Structure

```
pingup/
├── agent/           # Agent component (Bun + Hono)
├── server/          # Server component (Bun + Hono + SQLite)
├── libs/            # Shared libraries
│   ├── ping/      # ICMP ping library
│   └── scanner/   # Network scanner library
├── spec/            # Specifications and requirements
└── data/            # Data directory
```

## Requirements

When adding new features, please:

1. Add corresponding requirements to `spec/agent/` or `spec/server/`
2. Update the main specification files
3. Write tests for the new functionality
4. Update documentation if needed

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
