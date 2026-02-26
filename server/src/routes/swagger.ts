import { Hono } from "hono";

const swaggerRouter = new Hono();

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Pingup API",
    description: "Network monitoring agent and server API",
    version: "1.0.0",
    contact: {
      name: "API Support",
      url: "https://github.com/Xflofoxx/pingup",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    { name: "Health", description: "Health check endpoints" },
    { name: "Agents", description: "Agent management" },
    { name: "Metrics", description: "Metrics collection" },
    { name: "Commands", description: "Remote command execution" },
    { name: "Discovery", description: "Network discovery" },
    { name: "Config", description: "Configuration management" },
    { name: "Auth", description: "Authentication" },
    { name: "Users", description: "User management (Admin)" },
    { name: "Audit", description: "Audit logs (Admin)" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Check if the server is running",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/agents": {
      get: {
        tags: ["Agents"],
        summary: "List all agents",
        description: "Get a list of all registered agents",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filter by status",
            schema: { type: "string", enum: ["online", "offline"] },
          },
        ],
        responses: {
          "200": {
            description: "List of agents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    agents: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Agents"],
        summary: "Register a new agent",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  metadata: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Agent created",
          },
        },
      },
    },
    "/api/v1/agents/{id}": {
      get: {
        tags: ["Agents"],
        summary: "Get agent details",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Agent details",
          },
          "404": {
            description: "Agent not found",
          },
        },
      },
      delete: {
        tags: ["Agents"],
        summary: "Delete an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Agent deleted",
          },
        },
      },
    },
    "/api/v1/agents/{id}/heartbeat": {
      post: {
        tags: ["Agents"],
        summary: "Agent heartbeat",
        description: "Update agent status to online",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Heartbeat received",
          },
        },
      },
    },
    "/api/v1/metrics": {
      post: {
        tags: ["Metrics"],
        summary: "Submit metrics",
        description: "Submit metrics from an agent",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId", "metrics"],
                properties: {
                  agentId: { type: "string" },
                  timestamp: { type: "string" },
                  metrics: {
                    type: "object",
                    properties: {
                      cpu: { type: "number" },
                      ram: { type: "number" },
                      disk: { type: "number" },
                      latency: { type: "number" },
                    },
                  },
                  status: { type: "string" },
                  signature: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Metrics received",
          },
        },
      },
    },
    "/api/v1/metrics/{agentId}": {
      get: {
        tags: ["Metrics"],
        summary: "Get metrics history",
        description: "Get historical metrics for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Metrics history",
          },
        },
      },
    },
    "/api/v1/commands": {
      get: {
        tags: ["Commands"],
        summary: "List commands",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of commands",
          },
        },
      },
      post: {
        tags: ["Commands"],
        summary: "Create a command",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId", "action"],
                properties: {
                  agentId: { type: "string" },
                  action: { type: "string" },
                  params: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Command created",
          },
        },
      },
    },
    "/api/v1/commands/pending/{agentId}": {
      get: {
        tags: ["Commands"],
        summary: "Get pending commands",
        description: "Get pending commands for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Pending commands",
          },
        },
      },
    },
    "/api/v1/commands/{commandId}/result": {
      post: {
        tags: ["Commands"],
        summary: "Report command result",
        description: "Report the result of a command execution",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "commandId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  result: { type: "object" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Result stored",
          },
        },
      },
    },
    "/api/v1/discovery": {
      post: {
        tags: ["Discovery"],
        summary: "Submit discovery data",
        description: "Submit network discovery results from an agent",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId", "discovery"],
                properties: {
                  agentId: { type: "string" },
                  timestamp: { type: "string" },
                  discovery: {
                    type: "object",
                    properties: {
                      hosts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            ip: { type: "string" },
                            latency: { type: "number" },
                            ports: { type: "array", items: { type: "number" } },
                          },
                        },
                      },
                      duration: { type: "number" },
                    },
                  },
                  signature: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Discovery data stored",
          },
        },
      },
    },
    "/api/v1/discovery/{agentId}": {
      get: {
        tags: ["Discovery"],
        summary: "Get discovery history",
        description: "Get network discovery history for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Discovery history",
          },
        },
      },
    },
    "/api/v1/discovery/{agentId}/latest": {
      get: {
        tags: ["Discovery"],
        summary: "Get latest discovery",
        description: "Get the most recent network discovery for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Latest discovery",
          },
        },
      },
    },
    "/api/v1/config/{agentId}": {
      get: {
        tags: ["Config"],
        summary: "Get agent config",
        description: "Get configuration for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Agent configuration",
          },
        },
      },
      post: {
        tags: ["Config"],
        summary: "Update agent config",
        description: "Update configuration for an agent",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "agentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  config: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Config updated",
          },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Register a new user and get TOTP QR code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username"],
                properties: {
                  username: { type: "string", minLength: 3 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration successful, returns QR code",
          },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with TOTP",
        description: "Login using username and TOTP code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "code"],
                properties: {
                  username: { type: "string" },
                  code: { type: "string", pattern: "^[0-9]{6}$" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful, returns user info",
          },
          "401": {
            description: "Invalid credentials",
          },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Logout and clear session",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Logged out",
          },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        description: "Get information about the currently logged in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user info",
          },
        },
      },
    },
    "/api/v1/users": {
      get: {
        tags: ["Users"],
        summary: "List all users",
        description: "Get a list of all users (Admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of users",
          },
          "403": {
            description: "Forbidden - Admin only",
          },
        },
      },
    },
    "/api/v1/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user details",
        description: "Get details of a specific user (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User details",
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user",
        description: "Delete a user (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User deleted",
          },
        },
      },
    },
    "/api/v1/users/{id}/role": {
      put: {
        tags: ["Users"],
        summary: "Update user role",
        description: "Update the role of a user (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["PUB", "IT", "SUP", "ADM"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Role updated",
          },
        },
      },
    },
    "/api/v1/users/{id}/disable": {
      post: {
        tags: ["Users"],
        summary: "Disable a user",
        description: "Disable a user account (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User disabled",
          },
        },
      },
    },
    "/api/v1/users/{id}/enable": {
      post: {
        tags: ["Users"],
        summary: "Enable a user",
        description: "Enable a user account (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User enabled",
          },
        },
      },
    },
    "/api/v1/audit": {
      get: {
        tags: ["Audit"],
        summary: "Get audit logs",
        description: "Get audit logs (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100 },
          },
        ],
        responses: {
          "200": {
            description: "Audit logs",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token received from /api/v1/auth/login",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

swaggerRouter.get("/", (c) => {
  return c.json(openApiSpec);
});

swaggerRouter.get("/yaml", (c) => {
  const yaml = `
openapi: 3.0.0
info:
  title: Pingup API
  description: Network monitoring agent and server API
  version: 1.0.0
servers:
  - url: http://localhost:3000
    description: Development server
tags:
  - name: Health
  - name: Agents
  - name: Metrics
  - name: Commands
  - name: Discovery
  - name: Config
  - name: Auth
  - name: Users
  - name: Audit
`;
  return c.text(yaml);
});

export { swaggerRouter };
