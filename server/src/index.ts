import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { agentsRouter } from "./routes/agents.ts";
import { metricsRouter } from "./routes/metrics.ts";
import { commandsRouter } from "./routes/commands.ts";
import { configRouter } from "./routes/config.ts";
import { discoveryRouter } from "./routes/discovery.ts";
import { authRouter, usersRouter, auditRouter } from "./routes/auth.ts";
import { dashboardRouter } from "./routes/dashboard.ts";
import { swaggerRouter } from "./routes/swagger.ts";
import { logger } from "./utils/logger.ts";
import { listAgents } from "./services/agent.ts";
import { getDeviceCount } from "./db/duckdb.ts";

const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());

app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/health/detailed", (c) => {
  const agents = listAgents();
  const onlineAgents = agents.filter(a => a.status === "online").length;
  let deviceCount = 0;
  
  try {
    deviceCount = getDeviceCount();
  } catch {
    deviceCount = agents.length;
  }
  
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    performance: {
      totalDevices: deviceCount,
      registeredAgents: agents.length,
      onlineAgents: onlineAgents,
      capacity: deviceCount < 10000 ? "ok" : "near_limit",
    },
    targets: {
      maxDevices: 10000,
      targetLatency: "200ms",
    }
  });
});

app.route("/api/v1/agents", agentsRouter);
app.route("/api/v1/metrics", metricsRouter);
app.route("/api/v1/commands", commandsRouter);
app.route("/api/v1/config", configRouter);
app.route("/api/v1/discovery", discoveryRouter);
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/users", usersRouter);
app.route("/api/v1/audit", auditRouter);
app.route("/api_docs", swaggerRouter);
app.route("/", dashboardRouter);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  logger.error(`Server error: ${err}`);
  return c.json({ error: "Internal server error" }, 500);
});

const PORT = parseInt(process.env.PORT || "3000");

logger.info(`Starting Pingup Server on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
