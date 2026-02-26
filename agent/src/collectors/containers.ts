export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu_percent: number;
  memory_percent: number;
  network_rx: number;
  network_tx: number;
}

export interface ContainerMetrics {
  available: boolean;
  container_count: number;
  containers: ContainerInfo[];
  total_cpu: number;
  total_memory: number;
}

export async function collectContainers(): Promise<ContainerMetrics> {
  try {
    const proc = Bun.spawn([
      "powershell", "-Command",
      "docker ps -a --format '{{json .}}' | ConvertFrom-Json | ConvertTo-Json -Compress"
    ]);
    
    const output = await new Response(proc.stdout).text();
    
    if (!output.trim()) {
      return {
        available: true,
        container_count: 0,
        containers: [],
        total_cpu: 0,
        total_memory: 0,
      };
    }
    
    let containers: any[] = [];
    try {
      containers = JSON.parse(output);
      if (!Array.isArray(containers)) {
        containers = [containers];
      }
    } catch {
      return {
        available: false,
        container_count: 0,
        containers: [],
        total_cpu: 0,
        total_memory: 0,
      };
    }
    
    const containerInfos: ContainerInfo[] = [];
    let totalCpu = 0;
    let totalMemory = 0;
    
    for (const c of containers) {
      const stats = await getContainerStats(c.ID || c.Id || c.ID || "");
      
      containerInfos.push({
        id: c.ID || c.Id || c.ID || "",
        name: c.Names || c.Name || "",
        image: c.Image || "",
        status: c.State || c.Status || "unknown",
        cpu_percent: stats.cpu,
        memory_percent: stats.memory,
        network_rx: stats.networkRx,
        network_tx: stats.networkTx,
      });
      
      totalCpu += stats.cpu;
      totalMemory += stats.memory;
    }
    
    return {
      available: true,
      container_count: containerInfos.length,
      containers: containerInfos,
      total_cpu: totalCpu,
      total_memory: totalMemory,
    };
  } catch {
    return {
      available: false,
      container_count: 0,
      containers: [],
      total_cpu: 0,
      total_memory: 0,
    };
  }
}

async function getContainerStats(containerId: string): Promise<{ cpu: number; memory: number; networkRx: number; networkTx: number }> {
  try {
    const proc = Bun.spawn([
      "powershell", "-Command",
      `docker stats ${containerId} --no-stream --format '{{json .}}'`
    ]);
    
    const output = await new Response(proc.stdout).text();
    const stats = JSON.parse(output);
    
    return {
      cpu: parseFloat(stats.CPUPerc || "0") || 0,
      memory: parseFloat(stats.MemPerc?.replace("%", "") || "0") || 0,
      networkRx: parseNetworkBytes(stats.NetIO || "0B / 0B", 0),
      networkTx: parseNetworkBytes(stats.NetIO || "0B / 0B", 1),
    };
  } catch {
    return { cpu: 0, memory: 0, networkRx: 0, networkTx: 0 };
  }
}

function parseNetworkBytes(value: string, index: number): number {
  const parts = value.split("/");
  if (parts.length < 2) return 0;
  
  const part = parts[index].trim();
  const match = part.match(/^([\d.]+)\s*([KMGT]?B)/i);
  
  if (!match) return 0;
  
  let bytes = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case "K": bytes *= 1024; break;
    case "M": bytes *= 1024 * 1024; break;
    case "G": bytes *= 1024 * 1024 * 1024; break;
    case "T": bytes *= 1024 * 1024 * 1024 * 1024; break;
  }
  
  return bytes;
}

export async function checkDockerAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["docker", "version"]);
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
