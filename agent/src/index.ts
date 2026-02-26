// Pingup Agent - Main Entry Point
// Version: 1.4.1
// Collects system metrics and reports to server

import { loadConfig, getConfig } from "./config.ts";
import { collectCPU, measureLatency } from "./collectors/cpu.ts";
import { collectRAM } from "./collectors/ram.ts";
import { collectDisk } from "./collectors/disk.ts";
import { collectNetwork } from "./collectors/network.ts";
import { collectTemperature } from "./collectors/temperature.ts";
import { HTTPSender, type Command } from "./transport/index.ts";
import { Hono } from "hono";

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function executeCommand(command: Command): Promise<{ success: boolean; message: string }> {
  const { action, params } = command;
  
  console.log(`Executing command: ${action}`, params);
  
  switch (action) {
    case "ping": {
      return { success: true, message: "pong" };
    }
    case "restart_service": {
      const service = params?.service || "unknown";
      console.log(`Restarting service: ${service}`);
      return { success: true, message: `Service ${service} restart triggered` };
    }
    case "update_config": {
      return { success: true, message: "Config update triggered" };
    }
    case "execute": {
      const cmd = params?.command;
      if (cmd) {
        const proc = Bun.spawn(cmd.split(" "));
        const output = await new Response(proc.stdout).text();
        return { success: true, message: output || "Command executed" };
      }
      return { success: false, message: "No command specified" };
    }
    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

async function collectAllMetrics(config: ReturnType<typeof getConfig>): Promise<Record<string, unknown>> {
  const tempUnit = config.temperature_unit || "celsius";
  
  if (config.modules.includes("cpu")) {
    metrics.cpu = collectCPU();
    metrics.cpu.latency = await measureLatency(config.ping.host, config.ping.timeout);
  }
  
  if (config.modules.includes("ram")) {
    metrics.ram = collectRAM();
  }
  
  if (config.modules.includes("disk")) {
    metrics.disk = await collectDisk();
  }
  
  if (config.modules.includes("network")) {
    metrics.network = await collectNetwork();
  }

  if (config.modules.includes("temperature")) {
    metrics.temperature = collectTemperature(tempUnit);
  }
  
  return metrics;
}

const app = new Hono();

app.get("/status", (c) => {
  return c.json({
    status: "online",
    agent_id: getConfig().agent_id,
    uptime: process.uptime(),
  });
});

app.get("/metrics", async (c) => {
  const config = getConfig();
  const metrics = await collectAllMetrics(config);
  return c.json(metrics);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let latestMetrics: Record<string, unknown> = {};

async function main() {
  const configPath = process.argv[2] || "config.yaml";
  loadConfig(configPath);
  const config = getConfig();
  
  console.log(`Starting Pingup Agent: ${config.agent_id}`);
  console.log(`Server: ${config.server_url}`);
  console.log(`Poll interval: ${config.poll_interval}s`);
  
  const sender = new HTTPSender();
  
  async function loop() {
    try {
      const metrics = await collectAllMetrics(config);
      latestMetrics = metrics;
      
const payload = {
        agentId: config.agent_id,
        timestamp: new Date().toISOString(),
        metrics: {
          cpu: metrics.cpu?.cpu_percent || 0,
          ram: metrics.ram?.ram_percent || 0,
          disk: metrics.disk?.disk_percent || 0,
          latency: metrics.cpu?.latency || -1,
          temperature: metrics.temperature?.cpu || null,
        },
        status: "online",
      };
      
      const signature = await sign(JSON.stringify(payload), config.auth_token);
      payload.signature = signature;
      
      await sender.sendMetrics(payload);
      
      const commands = await sender.fetchCommands();
      for (const cmd of commands) {
        const result = await executeCommand(cmd);
        await sender.reportCommandResult(cmd.commandId, result);
      }
      
      console.log(
        `Metrics sent: CPU=${payload.metrics.cpu}% RAM=${payload.metrics.ram}% Disk=${payload.metrics.disk}% Latency=${payload.metrics.latency}ms`
      );
    } catch (e) {
      console.error("Error in loop:", e);
    }
    
    setTimeout(loop, config.poll_interval * 1000);
  }
  
  loop();
  
  const port = 8080;
  
  app.get("/health", (c) => c.json({ status: "healthy" }));
  
  console.log(`Agent API server running on http://localhost:${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
  });
}

main();
