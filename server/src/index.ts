// Pingup Server - Main Entry Point
// Version: 1.4.1
// Provides REST API for agent management, metrics, alerts, and dashboard

import { readFileSync } from "fs";
import { parse } from "yaml";
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
import { groupsRouter } from "./routes/groups.ts";
import { alertsRouter } from "./routes/alerts.ts";
import { reportsRouter } from "./routes/reports.ts";
import { prometheusRouter } from "./routes/prometheus.ts";
import { customMetricsRouter } from "./routes/customMetrics.ts";
import { certificatesRouter } from "./routes/certificates.ts";
import { processesRouter, servicesRouter } from "./routes/processes.ts";
import { bandwidthRouter } from "./routes/bandwidth.ts";
import { adminRouter } from "./routes/admin.ts";
import { ldapRouter } from "./routes/ldap.ts";
import { apiTokensRouter } from "./routes/apiTokens.ts";
import { topologyRouter } from "./routes/topology.ts";
import { maintenanceRouter } from "./routes/maintenance.ts";
import { retentionRouter } from "./routes/retention.ts";
import { tenantsRouter } from "./routes/tenants.ts";
import { complianceRouter } from "./routes/compliance.ts";
import { otAssetsRouter } from "./routes/otAssets.ts";
import { performanceRouter } from "./routes/performance.ts";
import { ismsRouter } from "./routes/isms.ts";
import { notificationsRouter, initNotificationsTable } from "./routes/notifications.ts";
import { realtimeRouter } from "./routes/realtime.ts";
import { logger } from "./utils/logger.ts";
import { listAgents } from "./services/agent.ts";
import { getDeviceCount } from "./db/duckdb.ts";
import { serveStatic } from "hono/bun";

const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());

app.use("/sw.js", serveStatic({ path: "./src/public/sw.js" }));
app.use("/manifest.json", serveStatic({ path: "./src/public/manifest.json" }));

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
app.route("/api/v1/groups", groupsRouter);
app.route("/api/v1/alerts", alertsRouter);
app.route("/api/v1/reports", reportsRouter);
app.route("/metrics", prometheusRouter);
app.route("/api/v1/export", prometheusRouter);
app.route("/api/v1/certificates", certificatesRouter);
app.route("/api/v1/processes", processesRouter);
app.route("/api/v1/services", servicesRouter);
app.route("/api/v1/bandwidth", bandwidthRouter);
app.route("/api/v1/metrics/custom", customMetricsRouter);
app.route("/api/v1/admin", adminRouter);
app.route("/api/v1/ldap", ldapRouter);
app.route("/api/v1/api-tokens", apiTokensRouter);
app.route("/api/v1/topology", topologyRouter);
app.route("/api/v1/maintenance", maintenanceRouter);
app.route("/api/v1/retention", retentionRouter);
app.route("/api/v1/tenants", tenantsRouter);
app.route("/api/v1/compliance", complianceRouter);
app.route("/api/v1/ot-assets", otAssetsRouter);
app.route("/api/v1/performance", performanceRouter);
app.route("/api/v1/isms", ismsRouter);
app.route("/api/v1/notifications", notificationsRouter);
app.route("/api/v1/realtime", realtimeRouter);
app.route("/api_docs", swaggerRouter);
app.route("/", dashboardRouter);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  logger.error(`Server error: ${err}`);
  return c.json({ error: "Internal server error" }, 500);
});

interface ServerConfig {
  port: number;
  host: string;
  log_level: string;
}

function loadServerConfig(): ServerConfig {
  try {
    const configFile = readFileSync("config.yaml", "utf-8");
    return parse(configFile) as ServerConfig;
  } catch {
    return {
      port: 3000,
      host: "0.0.0.0",
      log_level: "info",
    };
  }
}

const serverConfig = loadServerConfig();
const PORT = serverConfig.port;

logger.info(`Starting Pingup Server on ${serverConfig.host}:${PORT}`);

initNotificationsTable();

export default {
  port: PORT,
  fetch: app.fetch,
};
