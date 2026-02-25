export interface HostResult {
  ip: string;
  status: "online" | "offline";
  latency?: number;
  ports?: PortResult[];
  timestamp: string;
}

export interface PortResult {
  port: number;
  status: "open" | "closed";
  service?: string;
}

export interface ScanResult {
  target: string;
  hosts: HostResult[];
  duration: number;
  timestamp: string;
}

export interface ScanConfig {
  concurrency: number;
  timeout: number;
  ports: number[];
}

const DEFAULT_CONFIG: ScanConfig = {
  concurrency: 50,
  timeout: 1000,
  ports: [22, 80, 443, 3389, 8080],
};

const PORT_SERVICES: Record<number, string> = {
  22: "ssh",
  80: "http",
  443: "https",
  3389: "rdp",
  8080: "http-alt",
  21: "ftp",
  23: "telnet",
  25: "smtp",
  53: "dns",
  110: "pop3",
  143: "imap",
  3306: "mysql",
  5432: "postgres",
  27017: "mongodb",
};

function parseCIDR(cidr: string): string[] {
  const [ip, mask] = cidr.split("/");
  const numMask = parseInt(mask, 10);
  
  const ipParts = ip.split(".").map(Number);
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  
  const hostBits = 32 - numMask;
  const numHosts = Math.pow(2, hostBits);
  const networkAddr = ipNum & (~((1 << hostBits) - 1) >>> 0);
  
  const hosts: string[] = [];
  for (let i = 1; i < numHosts - 1 && i < 256; i++) {
    const hostIp = (networkAddr + i) >>> 0;
    hosts.push(`${(hostIp >> 24) & 255}.${(hostIp >> 16) & 255}.${(hostIp >> 8) & 255}.${hostIp & 255}`);
  }
  
  return hosts;
}

function parseRange(range: string): string[] {
  const [start, end] = range.split("-");
  const startParts = start.split(".").map(Number);
  const endPart = parseInt(end, 10);
  
  const hosts: string[] = [];
  for (let i = endPart; startParts[3] <= i; startParts[3]++) {
    hosts.push(`${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3]}`);
  }
  
  return hosts;
}

export function parseTargets(targets: string[]): string[] {
  const result: string[] = [];
  
  for (const target of targets) {
    if (target.includes("/")) {
      result.push(...parseCIDR(target));
    } else if (target.includes("-")) {
      result.push(...parseRange(target));
    } else {
      result.push(target);
    }
  }
  
  return [...new Set(result)];
}

export async function checkPort(ip: string, port: number, timeout: number): Promise<PortResult> {
  try {
    const conn = await Dialer.connect(ip, { port, timeout }).catch(() => null);
    if (conn) {
      conn.close();
      return {
        port,
        status: "open",
        service: PORT_SERVICES[port],
      };
    }
  } catch {
    // Connection failed
  }
  
  return {
    port,
    status: "closed",
    service: PORT_SERVICES[port],
  };
}

const Dialer = {
  connect: async (host: string, options: { port: number; timeout: number }): Promise<Bun.TCPConnection> => {
    return new Promise((resolve, reject) => {
      const conn = Bun.connect({
        hostname: host,
        port: options.port,
        socket: {
          data() {},
          close() {},
          error(e) {
            reject(e);
          },
          open() {
            resolve(conn);
          },
        },
      });
      
      setTimeout(() => {
        conn.close();
        reject(new Error("Timeout"));
      }, options.timeout);
    });
  },
};

export async function scanHost(ip: string, config: Partial<ScanConfig> = {}): Promise<HostResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const timestamp = new Date().toISOString();
  
  const startTime = Date.now();
  
  try {
    const conn = await Dialer.connect(ip, { port: 80, timeout: cfg.timeout }).catch(() => null);
    const latency = Date.now() - startTime;
    
    if (conn) {
      conn.close();
      
      let ports: PortResult[] = [];
      if (cfg.ports.length > 0) {
        const portChecks = cfg.ports.map(port => checkPort(ip, port, cfg.timeout));
        ports = await Promise.all(portChecks);
      }
      
      return {
        ip,
        status: "online",
        latency,
        ports,
        timestamp,
      };
    }
  } catch {
    // Host unreachable
  }
  
  return {
    ip,
    status: "offline",
    timestamp,
  };
}

export async function scanNetwork(
  targets: string[],
  config: Partial<ScanConfig> = {},
  onProgress?: (current: number, total: number) => void
): Promise<ScanResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const timestamp = new Date().toISOString();
  const ips = parseTargets(targets);
  const startTime = Date.now();
  
  const results: HostResult[] = [];
  const chunks: string[][] = [];
  
  for (let i = 0; i < ips.length; i += cfg.concurrency) {
    chunks.push(ips.slice(i, i + cfg.concurrency));
  }
  
  let completed = 0;
  const total = ips.length;
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(ip => scanHost(ip, cfg))
    );
    
    results.push(...chunkResults);
    completed += chunk.length;
    
    if (onProgress) {
      onProgress(completed, total);
    }
  }
  
  return {
    target: targets.join(","),
    hosts: results.filter(h => h.status === "online"),
    duration: Date.now() - startTime,
    timestamp,
  };
}
