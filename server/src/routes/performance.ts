import { Hono } from "hono";
import { getPerformanceMetrics, getSystemCapacity, getPerformanceHistory, checkPerformanceThresholds } from "../services/performance.ts";

export const performanceRouter = new Hono();

performanceRouter.get("/metrics", (c) => {
  const metrics = getPerformanceMetrics();
  return c.json(metrics);
});

performanceRouter.get("/capacity", (c) => {
  const capacity = getSystemCapacity();
  return c.json(capacity);
});

performanceRouter.get("/history", (c) => {
  const hours = parseInt(c.req.query("hours") || "24");
  const history = getPerformanceHistory(hours);
  return c.json({ history });
});

performanceRouter.get("/thresholds", (c) => {
  const thresholds = checkPerformanceThresholds();
  return c.json({ alerts: thresholds });
});
