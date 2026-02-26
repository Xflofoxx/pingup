import * as os from "bun:os";

export interface RAMMetrics {
  ram_percent: number;
  ram_used_mb: number;
  ram_available_mb: number;
  ram_total_mb: number;
}

export function collectRAM(): RAMMetrics {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  
  return {
    ram_percent: Math.round((used / total) * 1000) / 10,
    ram_used_mb: Math.round(used / (1024 * 1024) * 10) / 10,
    ram_available_mb: Math.round(free / (1024 * 1024) * 10) / 10,
    ram_total_mb: Math.round(total / (1024 * 1024) * 10) / 10,
  };
}
