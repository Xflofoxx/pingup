import { scanNetwork } from "../../libs/scanner/src/index.ts";

export interface DiscoveryResult {
  hosts: Array<{
    ip: string;
    latency?: number;
    ports?: number[];
  }>;
  duration: number;
  timestamp: string;
}

export async function runDiscovery(
  ranges: string[],
  ports: number[] = [22, 80, 443, 3389, 8080]
): Promise<DiscoveryResult> {
  const timestamp = new Date().toISOString();
  
  const result = await scanNetwork(ranges, {
    ports,
    concurrency: 50,
    timeout: 1000,
  });

  return {
    hosts: result.hosts.map(h => ({
      ip: h.ip,
      latency: h.latency,
      ports: h.ports?.filter(p => p.status === "open").map(p => p.port),
    })),
    duration: result.duration,
    timestamp,
  };
}
