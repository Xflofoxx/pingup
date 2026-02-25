import { getConfig } from "../config.ts";

export interface MetricsPayload {
  agentId: string;
  timestamp: string;
  metrics: {
    cpu: number;
    ram: number;
    disk: number;
    latency: number;
  };
  status: string;
  signature?: string;
}

export interface Command {
  commandId: string;
  action: string;
  params: Record<string, any>;
  signature: string;
}

export class HTTPSender {
  private baseUrl: string;
  private authToken: string;
  private timeout: number;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.server_url;
    this.authToken = config.auth_token;
    this.timeout = config.network_timeout * 1000;
  }

  private getHeaders(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };
  }

  async sendMetrics(payload: MetricsPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/metrics`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch (e) {
      console.error("Failed to send metrics:", e);
      return false;
    }
  }

  async fetchCommands(): Promise<Command[]> {
    try {
      const config = getConfig();
      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/pending/${config.agent_id}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.commands || [];
    } catch (e) {
      console.error("Failed to fetch commands:", e);
      return [];
    }
  }

  async reportCommandResult(commandId: string, result: any): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/${commandId}/result`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ result, status: "completed" }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      return response.ok;
    } catch (e) {
      console.error("Failed to report command result:", e);
      return false;
    }
  }

  async fetchConfig(): Promise<Record<string, any> | null> {
    try {
      const config = getConfig();
      const response = await fetch(
        `${this.baseUrl}/api/v1/config/${config.agent_id}`,
        {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) return null;
      
      const data = await response.json();
      return data.config;
    } catch (e) {
      console.error("Failed to fetch config:", e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
