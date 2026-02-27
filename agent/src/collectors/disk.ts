import type { DiskMetrics } from "bun";

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

function parseDfLine(line: string): { device: string; mountpoint: string; total: number; used: number; free: number; percent: number } | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) return null;
  
  const device = parts[0];
  const mountpoint = parts.length >= 6 ? parts[5] : parts[4];
  
  if (!mountpoint || !mountpoint.startsWith("/")) return null;
  
  const total = parseInt(parts[1]) * 1024;
  const used = parseInt(parts[2]) * 1024;
  const free = parseInt(parts[3]) * 1024;
  const percent = parseInt(parts[4].replace("%", ""));
  
  return { device, mountpoint, total, used, free, percent };
}

async function getWindowsDiskMetrics(): Promise<Array<{ device: string; mountpoint: string; total: number; used: number; free: number; percent: number }>> {
  try {
    const proc = Bun.spawn([
      "powershell", "-Command",
      "Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json"
    ]);
    const output = await new Response(proc.stdout).text();
    
    if (!output.trim()) {
      return [];
    }
    
    let disks: any[] = [];
    try {
      disks = JSON.parse(output);
      if (!Array.isArray(disks)) {
        disks = [disks];
      }
    } catch {
      return [];
    }
    
    return disks
      .filter(d => d.DeviceID)
      .map(d => {
        const total = parseInt(d.Size) || 0;
        const free = parseInt(d.FreeSpace) || 0;
        const used = total - free;
        const percent = total > 0 ? Math.round((used / total) * 100) : 0;
        
        return {
          device: d.DeviceID,
          mountpoint: d.DeviceID,
          total,
          used,
          free,
          percent,
        };
      });
  } catch {
    return [];
  }
}

function getLinuxDiskMetrics(): Array<{ device: string; mountpoint: string; total: number; used: number; free: number; percent: number }> {
  const results: Array<{ device: string; mountpoint: string; total: number; used: number; free: number; percent: number }> = [];
  
  try {
    const df = Bun.spawn(["df", "-k"]);
    const output = new Response(df.stdout).text();
    const lines = output.split("\n").slice(1);
    
    for (const line of lines) {
      const parsed = parseDfLine(line);
      if (parsed) {
        results.push(parsed);
      }
    }
  } catch (e) {
    console.error("Failed to collect disk metrics:", e);
  }
  
  return results;
}

export async function collectDisk(): Promise<DiskMetrics> {
  const isWindows = process.platform === "win32";
  const diskData = isWindows ? await getWindowsDiskMetrics() : getLinuxDiskMetrics();
  
  const partitions: DiskMetrics["partitions"] = diskData.map(d => ({
    device: d.device,
    mountpoint: d.mountpoint,
    fstype: isWindows ? "NTFS" : "unknown",
    percent: d.percent,
    used_gb: Math.round(d.used / (1024 * 1024 * 1024) * 100) / 100,
    free_gb: Math.round(d.free / (1024 * 1024 * 1024) * 100) / 100,
    total_gb: Math.round(d.total / (1024 * 1024 * 1024) * 100) / 100,
  }));
  
  const avgPercent = partitions.length > 0
    ? Math.round(partitions.reduce((sum, p) => sum + p.percent, 0) / partitions.length)
    : 0;
  
  return {
    disk_percent: avgPercent,
    partitions,
  };
}
