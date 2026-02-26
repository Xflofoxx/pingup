import { getDb } from "../db/sqlite.ts";
import { getDeviceCount } from "../db/duckdb.ts";
import { listAgents } from "./agent.ts";

export interface PerformanceMetrics {
  timestamp: string;
  totalDevices: number;
  registeredAgents: number;
  onlineAgents: number;
  cpuUsage: number;
  memoryUsage: number;
  dbSize: number;
  avgLatency: number;
  alertsActive: number;
}

export function getPerformanceMetrics(): PerformanceMetrics {
  const agents = listAgents();
  const onlineAgents = agents.filter(a => a.status === "online").length;
  
  let totalDevices = 0;
  try {
    totalDevices = getDeviceCount();
  } catch {
    totalDevices = agents.length;
  }
  
  const db = getDb();
  let dbSize = 0;
  try {
    const result = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
    dbSize = result?.size || 0;
  } catch {}
  
  const alertsResult = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'active'").get() as { count: number };
  
  return {
    timestamp: new Date().toISOString(),
    totalDevices,
    registeredAgents: agents.length,
    onlineAgents,
    cpuUsage: 0,
    memoryUsage: 0,
    dbSize,
    avgLatency: 0,
    alertsActive: alertsResult?.count || 0,
  };
}

export function getSystemCapacity(): { current: number; max: number; percent: number; status: string } {
  const metrics = getPerformanceMetrics();
  const maxCapacity = 10000;
  const percent = (metrics.totalDevices / maxCapacity) * 100;
  
  let status = "ok";
  if (percent >= 90) status = "critical";
  else if (percent >= 70) status = "warning";
  
  return {
    current: metrics.totalDevices,
    max: maxCapacity,
    percent,
    status,
  };
}

export function getPerformanceHistory(hours: number = 24): any[] {
  return [];
}

export function checkPerformanceThresholds(): { alert: boolean; metric: string; value: number; threshold: number }[] {
  const alerts: { alert: boolean; metric: string; value: number; threshold: number }[] = [];
  const capacity = getSystemCapacity();
  
  if (capacity.percent >= 90) {
    alerts.push({ alert: true, metric: "device_capacity", value: capacity.percent, threshold: 90 });
  }
  
  if (capacity.percent >= 70 && capacity.percent < 90) {
    alerts.push({ alert: false, metric: "device_capacity", value: capacity.percent, threshold: 70 });
  }
  
  return alerts;
}
