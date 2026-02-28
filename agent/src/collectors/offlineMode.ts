import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface OfflineConfig {
  enabled: boolean;
  max_queue_size: number;
  sync_on_reconnect: boolean;
  queue_file: string;
}

export interface QueuedMetric {
  id: string;
  timestamp: string;
  agentId: string;
  metrics: any;
  status: string;
  retry_count: number;
}

const DEFAULT_CONFIG: OfflineConfig = {
  enabled: false,
  max_queue_size: 1000,
  sync_on_reconnect: true,
  queue_file: "./data/offline_queue.json",
};

let currentConfig: OfflineConfig = DEFAULT_CONFIG;
let queue: QueuedMetric[] = [];
let isOnline = true;

export function configureOffline(config: Partial<OfflineConfig>): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
  
  const queueDir = join(currentConfig.queue_file, "..");
  if (!existsSync(queueDir)) {
    mkdirSync(queueDir, { recursive: true });
  }
  
  loadQueue();
}

export function setOnlineStatus(online: boolean): void {
  const wasOffline = !isOnline;
  isOnline = online;
  
  if (wasOffline && online && currentConfig.sync_on_reconnect) {
    syncQueue();
  }
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function queueMetric(agentId: string, metrics: any): boolean {
  if (!currentConfig.enabled || isOnline) {
    return true;
  }
  
  if (queue.length >= currentConfig.max_queue_size) {
    queue.shift();
  }
  
  const metric: QueuedMetric = {
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    agentId,
    metrics,
    status: "pending",
    retry_count: 0,
  };
  
  queue.push(metric);
  saveQueue();
  
  return true;
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  
  const pending = queue.filter(m => m.status === "pending");
  
  for (const metric of pending) {
    try {
      const response = await fetch(`${currentConfig.queue_file.replace("/offline_queue.json", "")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metric),
      });
      
      if (response.ok) {
        metric.status = "synced";
        synced++;
      } else {
        metric.retry_count++;
        if (metric.retry_count >= 3) {
          metric.status = "failed";
        }
        failed++;
      }
    } catch {
      metric.retry_count++;
      if (metric.retry_count >= 3) {
        metric.status = "failed";
      }
      failed++;
    }
  }
  
  queue = queue.filter(m => m.status !== "synced");
  saveQueue();
  
  return { synced, failed };
}

export function getQueueStatus(): { pending: number; failed: number; total: number; isOnline: boolean } {
  return {
    pending: queue.filter(m => m.status === "pending").length,
    failed: queue.filter(m => m.status === "failed").length,
    total: queue.length,
    isOnline,
  };
}

export function clearQueue(): void {
  queue = [];
  saveQueue();
}

function loadQueue(): void {
  try {
    if (existsSync(currentConfig.queue_file)) {
      const data = readFileSync(currentConfig.queue_file, "utf-8");
      queue = JSON.parse(data);
    }
  } catch {
    queue = [];
  }
}

function saveQueue(): void {
  try {
    const queueDir = join(currentConfig.queue_file, "..");
    if (!existsSync(queueDir)) {
      mkdirSync(queueDir, { recursive: true });
    }
    writeFileSync(currentConfig.queue_file, JSON.stringify(queue, null, 2));
  } catch {
  }
}

export function getQueue(): QueuedMetric[] {
  return queue;
}
