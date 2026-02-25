import * as os from "bun:os";

export interface CPUMetrics {
  cpu_percent: number;
  cpu_user: number;
  cpu_system: number;
  cpu_count: number;
}

export function collectCPU(): CPUMetrics {
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  
  const idle = totalIdle / cpuCount;
  const total = totalTick / cpuCount;
  const usage = 100 - (100 * idle / total);
  
  return {
    cpu_percent: Math.round(usage * 10) / 10,
    cpu_user: 0,
    cpu_system: 0,
    cpu_count: cpuCount,
  };
}

export async function measureLatency(host: string, timeout: number = 2): Promise<number> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
    
    await fetch(`http://${host}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    return Date.now() - start;
  } catch {
    const ping = Bun.spawn(["ping", "-n", "1", "-w", String(timeout * 1000), host]);
    const output = await new Response(ping.stdout).text();
    
    if (output.includes("Average")) {
      const match = output.match(/Average = (\d+)ms/);
      if (match) return parseInt(match[1]);
    }
    
    return -1;
  }
}
