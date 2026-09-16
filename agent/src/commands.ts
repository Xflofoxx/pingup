import type { Command } from "./transport/index.ts";
import { runDiscovery } from "./discovery/scanner.ts";

export interface CommandContext {
  agentId: string;
  discoveryRanges?: string[];
  discoveryPorts?: number[];
  snmpCommunity?: string;
  sendDiscovery: (
    agentId: string,
    discovery: { hosts: Record<string, unknown>[]; duration: number }
  ) => Promise<unknown>;
}

export async function executeCommand(
  command: Command,
  ctx: CommandContext
): Promise<{ success: boolean; message: string }> {
  const { action, params } = command;

  switch (action) {
    case "ping": {
      return { success: true, message: "pong" };
    }
    case "restart_service": {
      const service = params?.service || "unknown";
      return { success: true, message: `Service ${service} restart triggered` };
    }
    case "update_config": {
      return { success: true, message: "Config update triggered" };
    }
    case "execute": {
      const cmd = params?.command as string | undefined;
      if (cmd) {
        const proc = Bun.spawn(cmd.split(" "));
        const output = await new Response(proc.stdout).text();
        return { success: true, message: output || "Command executed" };
      }
      return { success: false, message: "No command specified" };
    }
    case "run_discovery": {
      const ranges = (params?.ranges as string[] | undefined)?.length
        ? (params.ranges as string[])
        : ctx.discoveryRanges;

      if (!ranges?.length) {
        return { success: false, message: "No discovery ranges configured or provided" };
      }

      const ports = (params?.ports as number[] | undefined) || ctx.discoveryPorts || [
        22, 80, 443, 3389, 8080,
      ];

      try {
        const result = await runDiscovery(ranges, ports, {
          snmpCommunity: ctx.snmpCommunity,
        });

        const vulnerable = result.hosts.filter((h) => (h.riskScore || 0) >= 30).length;

        await ctx.sendDiscovery(ctx.agentId, {
          hosts: result.hosts.map((h) => ({
            ip: h.ip,
            latency: h.latency,
            ports: h.ports,
            profile: h.profile,
            findings: h.findings,
            riskScore: h.riskScore,
            riskLabel: h.riskLabel,
          })),
          duration: result.duration,
        });

        return {
          success: true,
          message: `Discovery completed: ${result.hosts.length} hosts online, ${vulnerable} at risk (${result.duration}ms)`,
        };
      } catch (e) {
        return { success: false, message: `Discovery failed: ${(e as Error).message}` };
      }
    }
    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}