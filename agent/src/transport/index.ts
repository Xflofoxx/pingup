import { getConfig } from "../config.ts";
import {
  encodeMessage,
  decodeMessage,
  MessageType,
  Flags,
  createMetricsPayload,
  parseMetricsPayload,
  parseCommandPayload,
  createCommandResultPayload,
  createConfigRequestPayload,
} from "../../../libs/binary-protocol/src/index.ts";

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
  private useBinary: boolean = true;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.server_url;
    this.authToken = config.auth_token;
    this.timeout = config.network_timeout * 1000;
  }

  private getHeaders(contentType: string = "application/json"): HeadersInit {
    return {
      "Authorization": `Bearer ${this.authToken}`,
      "Content-Type": contentType,
    };
  }

  async sendMetrics(payload: MetricsPayload): Promise<boolean> {
    if (this.useBinary) {
      return this.sendMetricsBinary(payload);
    }
    return this.sendMetricsJson(payload);
  }

  private async sendMetricsBinary(payload: MetricsPayload): Promise<boolean> {
    try {
      const timestamp = typeof payload.timestamp === "string" 
        ? new Date(payload.timestamp).getTime() 
        : Date.now();
      
      const binaryPayload = createMetricsPayload(
        payload.agentId,
        timestamp,
        payload.metrics as Record<string, unknown>,
        payload.status,
        payload.signature
      );

      const encoded = encodeMessage(MessageType.METRICS, binaryPayload);

      const response = await fetch(`${this.baseUrl}/api/v1/metrics/bin`, {
        method: "POST",
        headers: this.getHeaders("application/msgpack"),
        body: encoded,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return this.sendMetricsJson(payload);
      }

      return true;
    } catch (e) {
      console.error("Failed to send metrics (binary):", e);
      return this.sendMetricsJson(payload);
    }
  }

  private async sendMetricsJson(payload: MetricsPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/metrics`, {
        method: "POST",
        headers: this.getHeaders("application/json"),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch (e) {
      console.error("Failed to send metrics (JSON):", e);
      return false;
    }
  }

  async fetchCommands(): Promise<Command[]> {
    if (this.useBinary) {
      return this.fetchCommandsBinary();
    }
    return this.fetchCommandsJson();
  }

  private async fetchCommandsBinary(): Promise<Command[]> {
    try {
      const config = getConfig();
      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/bin/${config.agent_id}`,
        {
          headers: this.getHeaders("application/msgpack"),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        return this.fetchCommandsJson();
      }

      const data = await response.arrayBuffer();
      const decoded = decodeMessage(new Uint8Array(data));
      
      const commands = decoded.payload.cmds as Array<Record<string, unknown>> || [];
      return commands.map((cmd) => parseCommandPayload(cmd)) as Command[];
    } catch (e) {
      console.error("Failed to fetch commands (binary):", e);
      return this.fetchCommandsJson();
    }
  }

  private async fetchCommandsJson(): Promise<Command[]> {
    try {
      const config = getConfig();
      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/pending/${config.agent_id}`,
        {
          headers: this.getHeaders("application/json"),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.commands || [];
    } catch (e) {
      console.error("Failed to fetch commands (JSON):", e);
      return [];
    }
  }

  async reportCommandResult(commandId: string, result: any): Promise<boolean> {
    if (this.useBinary) {
      return this.reportCommandResultBinary(commandId, result);
    }
    return this.reportCommandResultJson(commandId, result);
  }

  private async reportCommandResultBinary(commandId: string, result: any): Promise<boolean> {
    try {
      const payload = createCommandResultPayload(
        commandId,
        result,
        "completed",
        Date.now()
      );

      const encoded = encodeMessage(MessageType.COMMAND_RESULT, payload);

      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/bin/${commandId}/result`,
        {
          method: "POST",
          headers: this.getHeaders("application/msgpack"),
          body: encoded,
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        return this.reportCommandResultJson(commandId, result);
      }

      return true;
    } catch (e) {
      console.error("Failed to report command result (binary):", e);
      return this.reportCommandResultJson(commandId, result);
    }
  }

  private async reportCommandResultJson(commandId: string, result: any): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/commands/${commandId}/result`,
        {
          method: "POST",
          headers: this.getHeaders("application/json"),
          body: JSON.stringify({ result, status: "completed" }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      return response.ok;
    } catch (e) {
      console.error("Failed to report command result (JSON):", e);
      return false;
    }
  }

  async fetchConfig(): Promise<Record<string, any> | null> {
    if (this.useBinary) {
      return this.fetchConfigBinary();
    }
    return this.fetchConfigJson();
  }

  private async fetchConfigBinary(): Promise<Record<string, any> | null> {
    try {
      const config = getConfig();
      const payload = createConfigRequestPayload(config.agent_id);
      
      const encoded = encodeMessage(MessageType.CONFIG_REQUEST, payload);

      const response = await fetch(
        `${this.baseUrl}/api/v1/config/bin/${config.agent_id}`,
        {
          method: "GET",
          headers: this.getHeaders("application/msgpack"),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        return this.fetchConfigJson();
      }

      const data = await response.arrayBuffer();
      const decoded = decodeMessage(new Uint8Array(data));
      
      return decoded.payload.cfg as Record<string, any> || null;
    } catch (e) {
      console.error("Failed to fetch config (binary):", e);
      return this.fetchConfigJson();
    }
  }

  private async fetchConfigJson(): Promise<Record<string, any> | null> {
    try {
      const config = getConfig();
      const response = await fetch(
        `${this.baseUrl}/api/v1/config/${config.agent_id}`,
        {
          headers: this.getHeaders("application/json"),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) return null;
      
      const data = await response.json();
      return data.config;
    } catch (e) {
      console.error("Failed to fetch config (JSON):", e);
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
