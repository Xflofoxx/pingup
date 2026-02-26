import { readFileSync } from "fs";
import { parse } from "yaml";

export interface AgentConfig {
  server_url: string;
  agent_id: string;
  poll_interval: number;
  network_timeout: number;
  auth_token: string;
  temperature_unit: "celsius" | "fahrenheit";
  mqtt: {
    enabled: boolean;
    broker: string;
    port: number;
    topic: string;
  };
  modules: string[];
  ping: {
    host: string;
    timeout: number;
  };
  discovery: {
    enabled: boolean;
    ranges: string[];
    interval: number;
    ports: number[];
  };
}

let config: AgentConfig | null = null;

export function loadConfig(path: string = "config.yaml"): AgentConfig {
  if (config) return config;
  
  try {
    const file = readFileSync(path, "utf-8");
    config = parse(file) as AgentConfig;
  } catch (e) {
config = {
      server_url: "http://localhost:3000",
      agent_id: `AGENT-${Date.now().toString(36).toUpperCase()}`,
      poll_interval: 30,
      network_timeout: 3,
      auth_token: "",
      temperature_unit: "celsius",
      mqtt: {
        enabled: false,
        broker: "localhost",
        port: 1883,
        topic: "pingup",
      },
      modules: ["cpu", "ram", "disk", "network", "temperature"],
      ping: {
        host: "8.8.8.8",
        timeout: 2,
      },
      discovery: {
        enabled: false,
        ranges: [],
        interval: 3600,
        ports: [22, 80, 443, 3389, 8080],
      },
    };
  }
  
  return config;
}

export function getConfig(): AgentConfig {
  if (!config) {
    loadConfig();
  }
  return config!;
}
