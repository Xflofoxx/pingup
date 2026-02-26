export interface mDNSService {
  name: string;
  type: string;
  port: number;
  host: string;
  txt: Record<string, string>;
}

export async function discoverMDNS(): Promise<mDNSService[]> {
  try {
    const { execSync } = require("child_process");
    
    const output = execSync("dns-sd -B _services._dns-sd._udp local 2>/dev/null || dns-sd -L _http._tcp local 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5000,
    });
    
    const services: mDNSService[] = [];
    const lines = output.split("\n").slice(0, 20);
    
    for (const line of lines) {
      if (line.includes("_") && line.includes(".")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          services.push({
            name: parts[0] || "Unknown",
            type: parts[1] || "Unknown",
            port: 0,
            host: "",
            txt: {},
          });
        }
      }
    }
    
    return services.slice(0, 10);
  } catch {
    return [];
  }
}

export async function resolveMDNS(name: string, type: string): Promise<string | null> {
  try {
    const { execSync } = require("child_process");
    const output = execSync(`dns-sd -Q ${name}.${type} 2>/dev/null || echo ""`, {
      encoding: "utf-8",
      timeout: 3000,
    });
    
    const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
