import { describe, it, expect, beforeEach } from "bun:test";
import { getDb } from "../../src/db/sqlite.ts";

describe("Users Service", () => {
  let db: ReturnType<typeof getDb>;
  
  beforeEach(() => {
    db = getDb();
  });
  
  describe("Role Hierarchy", () => {
    it("should validate role hierarchy correctly", () => {
      const { hasRole } = require("../../src/services/users.ts");
      
      expect(hasRole("ADM", "PUB")).toBe(true);
      expect(hasRole("ADM", "IT")).toBe(true);
      expect(hasRole("ADM", "SUP")).toBe(true);
      expect(hasRole("SUP", "PUB")).toBe(true);
      expect(hasRole("SUP", "IT")).toBe(true);
      expect(hasRole("IT", "PUB")).toBe(true);
      expect(hasRole("PUB", "PUB")).toBe(true);
      
      expect(hasRole("PUB", "IT")).toBe(false);
      expect(hasRole("IT", "ADM")).toBe(false);
      expect(hasRole("SUP", "ADM")).toBe(false);
    });
    
    it("should handle invalid roles", () => {
      const { hasRole } = require("../../src/services/users.ts");
      
      expect(hasRole("INVALID", "PUB")).toBe(false);
      expect(hasRole("ADM", "INVALID")).toBe(false);
      expect(hasRole("", "")).toBe(false);
    });
  });
  
  describe("Password Hashing", () => {
    it("should hash passwords", () => {
      const { hashPassword } = require("../../src/services/users.ts");
      
      const password = "test";
      const hash = hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.includes(":")).toBe(true);
    });
    
    it("should verify password correctly", () => {
      const { hashPassword, verifyPassword } = require("../../src/services/users.ts");
      
      const hash = "test:abc";
      
      expect(verifyPassword("test", hash)).toBe(false);
    });
  });
  
  describe("User Management", () => {
    it("should list users", () => {
      const { listUsers } = require("../../src/services/users.ts");
      
      const users = listUsers();
      expect(Array.isArray(users)).toBe(true);
    });
    
    it("should get user by username", () => {
      const { getUserByUsername, createUser } = require("../../src/services/users.ts");
      
      const testUsername = "testlistuser_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      const found = getUserByUsername(testUsername);
      expect(found).toBeTruthy();
      expect(found?.username).toBe(testUsername);
    });
    
    it("should update user role", () => {
      const { createUser, updateUserRole, getUserById } = require("../../src/services/users.ts");
      
      const testUsername = "testroleuser_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      const updated = updateUserRole(user.id, "IT");
      expect(updated).toBe(true);
      
      const retrieved = getUserById(user.id);
      expect(retrieved?.role).toBe("IT");
    });
    
    it("should set user status", () => {
      const { createUser, setUserStatus, getUserById } = require("../../src/services/users.ts");
      
      const testUsername = "teststatususer_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      const disabled = setUserStatus(user.id, "disabled");
      expect(disabled).toBe(true);
      
      const retrieved = getUserById(user.id);
      expect(retrieved?.status).toBe("disabled");
    });
  });
  
  describe("Sessions", () => {
    it("should create and get session", () => {
      const { createUser, createSession, getSession } = require("../../src/services/users.ts");
      
      const testUsername = "testsessionuser_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      const session = createSession(user.id, "127.0.0.1", "test-agent");
      expect(session).toBeTruthy();
      
      const retrieved = getSession(session.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.user_id).toBe(user.id);
    });
    
    it("should delete session", () => {
      const { createUser, createSession, deleteSession, getSession } = require("../../src/services/users.ts");
      
      const testUsername = "testdeletesession_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      const session = createSession(user.id, "127.0.0.1", "test-agent");
      deleteSession(session.id);
      
      const retrieved = getSession(session.id);
      expect(retrieved).toBeUndefined();
    });
    
    it("should delete all user sessions", () => {
      const { createUser, createSession, deleteUserSessions, getSession } = require("../../src/services/users.ts");
      
      const testUsername = "testdeleteallsessions_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      createSession(user.id, "127.0.0.1", "test-agent");
      createSession(user.id, "127.0.0.2", "test-agent-2");
      
      deleteUserSessions(user.id);
    });
  });
  
  describe("Audit Log", () => {
    it("should log audit events", () => {
      const { createUser, logAudit, getAuditLog } = require("../../src/services/users.ts");
      
      const testUsername = "testaudituser_" + Date.now();
      const user = createUser(testUsername, "PUB");
      
      logAudit(user.id, "test_action", "test_resource", "test details");
      
      const logs = getAuditLog(10);
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
