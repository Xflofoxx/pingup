# Pingup Style Guide

> **Version**: 1.0.0  
> **Status**: Mandatory

This style guide is mandatory for all Pingup code. It ensures consistency, readability, and maintainability across the codebase.

## 1. General Principles

| Principle | Description |
|-----------|-------------|
| Clarity over Cleverness | Write code that is easy to understand |
| Consistency | Follow established patterns in the codebase |
| Minimalism | Avoid unnecessary complexity or abstraction |
| Self-Documenting | Use clear names; add comments only for non-obvious logic |

## 2. TypeScript Conventions

### 2.1 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/functions | camelCase | `getAgent()`, `agentList` |
| Classes/Interfaces/Types | PascalCase | `Agent`, `AgentConfig` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PORT`, `MAX_RETRIES` |
| Files | kebab-case | `agent-service.ts`, `config-loader.ts` |

### 2.2 Type Annotations

```typescript
// ✅ Prefer explicit types for function parameters
function processData(data: string[]): Record<string, number> {
  return data.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ✅ Use type inference for simple cases
const count = 0;
const name = "pingup";
const items: string[] = [];
```

### 2.3 Interfaces vs Types

```typescript
// ✅ Use interface for object shapes
interface Agent {
  id: string;
  name: string;
  status: string;
}

// ✅ Use type for unions, primitives
type Status = "online" | "offline" | "pending";
```

### 2.4 Imports

```typescript
// ✅ Use explicit named imports
import { getDb, type Agent } from "./db/sqlite";
import { logger } from "./utils/logger";

// ✅ Group imports: external, then internal
import { Hono } from "hono";
import { getAgent } from "../services/agent";
```

## 3. Functions

### 3.1 Arrow vs Regular Functions

```typescript
// ✅ Use arrow functions for callbacks
items.map((item) => item.id);

// ✅ Use regular functions for methods or complex logic
function processMetrics(payload: MetricsPayload): void {
  const agent = getAgent(payload.agentId);
  // ...
}
```

### 3.2 Function Parameters

```typescript
// ✅ Use optional parameters with defaults
function createAgent(id: string, name?: string): Agent {
  const agentName = name ?? `Agent-${id}`;
  // ...
}

// ✅ Use object parameters for many arguments
function configure(options: {
  serverUrl: string;
  timeout: number;
  retries: number;
}): void {
  // ...
}
```

## 4. Error Handling

```typescript
// ✅ Use try/catch with specific error handling
try {
  await processMetrics(payload);
} catch (error) {
  logger.error(`Failed to process metrics: ${error}`);
  // Handle gracefully, don't swallow
}

// ✅ Return error results explicitly
function validateInput(data: unknown): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: "Data is required" };
  }
  return { valid: true };
}
```

## 5. Async/Await

```typescript
// ✅ Prefer async/await over .then()
async function fetchCommands(agentId: string): Promise<Command[]> {
  const response = await fetch(`/api/commands/${agentId}`);
  return response.json();
}

// ✅ Handle async errors with try/catch
async function main() {
  try {
    await run();
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}
```

## 6. Comments

```typescript
// ✅ Add comments for non-obvious logic
// Calculate percentage of used memory relative to total
const usagePercent = (used / total) * 100;

// ❌ Avoid obvious comments
// Loop through items
for (const item of items) {
  // ...
}
```

## 7. Testing

### 7.1 Test File Naming

```
src/services/agent.ts     →  tests/services/agent.test.ts
src/utils/logger.ts    →  tests/utils/logger.test.ts
```

### 7.2 Test Structure

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { getAgent, createAgent } from "../services/agent";

describe("Agent Service", () => {
  let db: Database;

  beforeEach(() => {
    // Setup
  });

  test("createAgent should return new agent", () => {
    const agent = createAgent({ id: "test-1", name: "Test" });
    expect(agent.id).toBe("test-1");
  });

  test("getAgent should return existing agent", () => {
    const agent = getAgent("test-1");
    expect(agent).toBeDefined();
  });
});
```

### 7.3 Test Naming

```typescript
// ✅ Use descriptive test names
test("createAgent should throw when id is empty", () => {
  // ...
});

test("getAgent should return undefined for non-existent agent", () => {
  // ...
});
```

## 8. File Organization

```typescript
// ✅ Order in each file
// 1. Imports (external, then internal)
// 2. Types/Interfaces
// 3. Constants
// 4. Functions/Classes
// 5. Main execution

// ✅ Maximum file length: ~200 lines
// ✅ Split large modules into separate files
```

## 9. Configuration

```typescript
// ✅ Use config files for constants
export const CONFIG = {
  DEFAULT_PORT: 3000,
  TIMEOUT_MS: 5000,
};

// ✅ Use environment variables for runtime config
const PORT = parseInt(process.env.PORT || "3000");
```

## 10. Logging

```typescript
// ✅ Use appropriate log levels
logger.debug("Processing request", { id });
logger.info("Agent connected", { agentId });
logger.warn("Retrying failed request", { attempt });
logger.error("Critical failure", { error });
```

## 11. Git Commits

```
# ✅ Use conventional commits
feat: add agent heartbeat endpoint
fix: resolve metrics storage error
docs: update API documentation
test: add unit tests for agent service
refactor: simplify config loading

# ❌ Avoid
fixed stuff
update
asdf
```

## 12. Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Types are explicit and correct
- [ ] Error handling is appropriate
- [ ] No console.log (use logger)
- [ ] Tests cover critical paths
- [ ] No hardcoded secrets
- [ ] Code is tested

## 13. Quality Gates

Before any code is merged:

- [ ] All tests pass (`bun test`)
- [ ] Coverage meets threshold (>80%)
- [ ] No lint errors (`bun run lint`)
- [ ] Code is formatted (`bun run format`)
- [ ] TypeScript compiles without errors
