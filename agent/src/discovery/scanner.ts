import { scanNetwork } from "../../libs/scanner/src/index.ts";
import type { DeviceProfile, VulnerabilityFinding } from "../../libs/vulns/src/index.ts";
import { profileHosts } from "../collectors/profiler.ts";

export interface DiscoveryHost {
  ip: string;
  latency?: number;
  ports?: number[];
  profile?: DeviceProfile;
  findings?: VulnerabilityFinding[];
  riskScore?: number;
  riskLabel?: string;
}

export interface DiscoveryResult {
  hosts: DiscoveryHost[];
  duration: number;
  timestamp: string;
}

export async function runDiscovery(
  ranges: string[],
  ports: number[] = [22, 80, 443, 3389, 8080],
  options: { snmpCommunity?: string } = {}
): Promise<DiscoveryResult> {
  const timestamp = new Date().toISOString();

  const result = await scanNetwork(ranges, {
    ports,
    concurrency: 50,
    timeout: 1000,
  });

  const hosts: DiscoveryHost[] = result.hosts.map((h) => ({
    ip: h.ip,
    latency: h.latency,
    ports: h.ports?.filter((p) => p.status === "open").map((p) => p.port),
  }));

  const profiled = await profileHosts(
    hosts,
    options.snmpCommunity ? { snmpCommunity: options.snmpCommunity } : {}
  );

  for (let i = 0; i < hosts.length; i++) {
    hosts[i].profile = profiled[i].profile;
    hosts[i].findings = profiled[i].findings;
    hosts[i].riskScore = profiled[i].riskScore;
    hosts[i].riskLabel = profiled[i].riskLabel;
  }

  return {
    hosts,
    duration: result.duration,
    timestamp,
  };
}