# Opencode AI Agent Specification

## Project Overview

**Project Name:** pingup  
**Type:** CLI Tool  
**Core Functionality:** [Describe the main purpose of the project]

---

## Technology Stack

- **Language:** TypeScript/JavaScript
- **Runtime:** Node.js
- **Package Manager:** npm

---

## Code Conventions

### Naming Conventions
- **Files:** kebab-case (e.g., `user-service.ts`)
- **Classes:** PascalCase (e.g., `UserService`)
- **Functions:** camelCase (e.g., `getUserById`)
- **Constants:** SCREAMING_SNAKE_CASE

### Code Style
- Use ES modules or CommonJS as appropriate
- Prefer `const` over `let`
- Use async/await for asynchronous operations
- Always handle errors with try/catch

---

## Project Structure

```
src/
├── main/           # Entry point
├── services/       # Business logic
├── utils/          # Helper functions
├── types/          # TypeScript types
└── config/        # Configuration files
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |

---

## Dependencies

### Production
- [List production dependencies]

### Development
- [List dev dependencies]

---

## API Specification

[Define API endpoints if applicable]

---

## Testing Strategy

- Unit tests with [framework]
- Integration tests
- E2E tests if needed

---

## Notes

[Additional notes for the AI agent]
