export interface PingResult {
  host: string;
  latency: number;
  status: "online" | "offline" | "timeout";
  timestamp: string;
  ttl?: number;
}

export interface PingStats {
  host: string;
  sent: number;
  received: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  packetLoss: number;
  results: PingResult[];
}

export interface PingConfig {
  host: string;
  count: number;
  timeout: number;
  interval: number;
}

const DEFAULT_CONFIG: PingConfig = {
  host: "8.8.8.8",
  count: 4,
  timeout: 2000,
  interval: 1000,
};

export async function ping(host: string, timeout: number = 2000): Promise<PingResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const start = Date.now();
    const proc = Bun.spawn(["ping", "-n", "1", "-w", String(timeout), host], {
      stdout: "pipe",
      stderr: "pipe",
    });
    
    const [code, stdout, stderr] = await Promise.all([
      proc.exited,
      proc.stdout.text(),
      proc.stderr.text(),
    ]);

    const latency = Date.now() - start;
    
    if (code !== 0) {
      return {
        host,
        latency: -1,
        status: "offline",
        timestamp,
      };
    }

    const ttlMatch = stdout.match(/TTL=(\d+)/i);
    const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : undefined;

    return {
      host,
      latency,
      status: "online",
      timestamp,
      ttl,
    };
  } catch {
    return {
      host,
      latency: -1,
      status: "timeout",
      timestamp,
    };
  }
}

export async function pingStats(config: Partial<PingConfig> = {}): Promise<PingStats> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: PingResult[] = [];
  
  for (let i = 0; i < cfg.count; i++) {
    const result = await ping(cfg.host, cfg.timeout);
    results.push(result);
    if (i < cfg.count - 1) {
      await new Promise(r => setTimeout(r, cfg.interval));
    }
  }

  const latencies = results.filter(r => r.latency > 0).map(r => r.latency);
  const sent = results.length;
  const received = latencies.length;
  
  return {
    host: cfg.host,
    sent,
    received,
    minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
    maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
    avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    packetLoss: sent > 0 ? ((sent - received) / sent) * 100 : 100,
    results,
  };
}

export async function* pingStream(
  host: string,
  intervalMs: number = 5000
): AsyncGenerator<PingResult> {
  while (true) {
    yield await ping(host);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
