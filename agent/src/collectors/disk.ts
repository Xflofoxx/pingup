import { fs } from "bun";

export interface DiskMetrics {
  disk_percent: number;
  partitions: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    percent: number;
    used_gb: number;
    free_gb: number;
    total_gb: number;
  }>;
}

export async function collectDisk(): Promise<DiskMetrics> {
  const partitions: DiskMetrics["partitions"] = [];
  
  try {
    const df = Bun.spawn(["df", "-k"]);
    const output = await new Response(df.stdout).text();
    const lines = output.split("\n").slice(1);
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const mountpoint = parts[5] || parts[4];
        if (mountpoint && mountpoint.startsWith("/")) {
          const total = parseInt(parts[1]) * 1024;
          const used = parseInt(parts[2]) * 1024;
          const free = parseInt(parts[3]) * 1024;
          const percent = parseInt(parts[4].replace("%", ""));
          
          partitions.push({
            device: parts[0],
            mountpoint,
            fstype: "unknown",
            percent,
            used_gb: Math.round(used / (1024 * 1024 * 1024) * 100) / 100,
            free_gb: Math.round(free / (1024 * 1024 * 1024) * 100) / 100,
            total_gb: Math.round(total / (1024 * 1024 * 1024) * 100) / 100,
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to collect disk metrics:", e);
  }
  
  const avgPercent = partitions.length > 0
    ? Math.round(partitions.reduce((sum, p) => sum + p.percent, 0) / partitions.length)
    : 0;
  
  return {
    disk_percent: avgPercent,
    partitions,
  };
}
