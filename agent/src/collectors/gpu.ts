export interface GPUInfo {
  name: string;
  utilization: number;
  memory_used: number;
  memory_total: number;
  temperature: number;
  power: number;
  fan_speed: number;
}

export interface GPUMetrics {
  available: boolean;
  vendor: "nvidia" | "amd" | "intel" | null;
  gpus: GPUInfo[];
}

export async function collectGPU(): Promise<GPUMetrics> {
  const nvidia = await collectNvidiaGPU();
  if (nvidia.available) return nvidia;
  
  const amd = await collectAmdGPU();
  if (amd.available) return amd;
  
  return {
    available: false,
    vendor: null,
    gpus: [],
  };
}

async function collectNvidiaGPU(): Promise<GPUMetrics> {
  try {
    const proc = Bun.spawn(["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,fan.speed", "--format=csv,noheader,nounits"]);
    const output = await new Response(proc.stdout).text();
    
    if (!output.trim() || proc.exitCode !== 0) {
      return { available: false, vendor: null, gpus: [] };
    }
    
    const lines = output.trim().split("\n");
    const gpus: GPUInfo[] = [];
    
    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 7) continue;
      
      gpus.push({
        name: parts[0],
        utilization: parseFloat(parts[1]) || 0,
        memory_used: parseFloat(parts[2]) || 0,
        memory_total: parseFloat(parts[3]) || 0,
        temperature: parseFloat(parts[4]) || 0,
        power: parseFloat(parts[5]) || 0,
        fan_speed: parseFloat(parts[6]) || 0,
      });
    }
    
    return {
      available: gpus.length > 0,
      vendor: "nvidia",
      gpus,
    };
  } catch {
    return { available: false, vendor: null, gpus: [] };
  }
}

async function collectAmdGPU(): Promise<GPUMetrics> {
  try {
    const proc = Bun.spawn(["powershell", "-Command", 
      "Get-CimInstance -ClassName Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion | ConvertTo-Json"
    ]);
    const output = await new Response(proc.stdout).text();
    
    if (!output.trim() || proc.exitCode !== 0) {
      return { available: false, vendor: null, gpus: [] };
    }
    
    const parsed = JSON.parse(output);
    const gpus: GPUInfo[] = [];
    
    const gpuList = Array.isArray(parsed) ? parsed : [parsed];
    
    for (const gpu of gpuList) {
      if (!gpu.Name || gpu.Name.toLowerCase().includes("microsoft")) continue;
      
      const isAmd = gpu.Name.toLowerCase().includes("amd") || gpu.Name.toLowerCase().includes("radeon");
      const isIntel = gpu.Name.toLowerCase().includes("intel") || gpu.Name.toLowerCase().includes("uhd");
      
      if (!isAmd && !isIntel) continue;
      
      gpus.push({
        name: gpu.Name,
        utilization: 0,
        memory_used: 0,
        memory_total: gpu.AdapterRAM ? gpu.AdapterRAM / (1024 * 1024) : 0,
        temperature: 0,
        power: 0,
        fan_speed: 0,
      });
    }
    
    return {
      available: gpus.length > 0,
      vendor: "amd",
      gpus,
    };
  } catch {
    return { available: false, vendor: null, gpus: [] };
  }
}

export async function checkNvidiaAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["nvidia-smi"]);
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
