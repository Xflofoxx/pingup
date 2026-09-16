import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  ensureDemoUsers,
  DEMO_USERS,
  getUserByUsername,
  deleteUser,
  verifyPassword,
} from "../../src/services/users.ts";

describe("Demo Users Service", () => {
  beforeAll(() => {
    for (const d of DEMO_USERS) {
      const user = getUserByUsername(d.username);
      if (user) deleteUser(user.id);
    }
  });

  afterAll(() => {
    for (const d of DEMO_USERS) {
      const user = getUserByUsername(d.username);
      if (user) deleteUser(user.id);
    }
  });

  it("should expose one demo user per access type", () => {
    const roles = DEMO_USERS.map((d) => d.role).sort();
    expect(roles).toEqual(["ADM", "IT", "PUB", "SUP"]);
  });

  it("should expose a username and password for every demo user", () => {
    for (const d of DEMO_USERS) {
      expect(d.username.length).toBeGreaterThan(0);
      expect(d.password.length).toBeGreaterThanOrEqual(6);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });

  it("should use namespaced usernames to avoid collisions", () => {
    for (const d of DEMO_USERS) {
      expect(d.username.startsWith("demo.")).toBe(true);
    }
  });

  it("should create all demo users", () => {
    const { created, skipped } = ensureDemoUsers();
    expect(created.length).toBe(4);
    expect(skipped.length).toBe(0);

    for (const d of DEMO_USERS) {
      const user = getUserByUsername(d.username);
      expect(user).toBeTruthy();
      expect(user!.role).toBe(d.role);
    }
  });

  it("should be idempotent", () => {
    const { created, skipped } = ensureDemoUsers();
    expect(created.length).toBe(0);
    expect(skipped.length).toBe(4);
  });

  it("should create users whose passwords verify", () => {
    for (const d of DEMO_USERS) {
      const user = getUserByUsername(d.username)!;
      expect(verifyPassword(d.password, user.password_hash || "")).toBe(true);
    }
  });
});