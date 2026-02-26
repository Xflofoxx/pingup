export interface TemperatureData {
  cpu: number | null;
  gpu: number | null;
  disk: number | null;
  motherboard: number | null;
  ambient: number | null;
  unit: "celsius" | "fahrenheit";
  timestamp: string;
}

export function collectTemperature(unit: "celsius" | "fahrenheit" = "celsius"): TemperatureData {
  const temps: TemperatureData = {
    cpu: null,
    gpu: null,
    disk: null,
    motherboard: null,
    ambient: null,
    unit,
    timestamp: new Date().toISOString(),
  };

  if (Bun.which("vcgencmd")) {
    try {
      const gpuProc = Bun.spawn(["vcgencmd", "measure_temp"]);
      const gpuOutput = new Response(gpuProc.stdout).text();
      const gpuMatch = gpuOutput.match(/temp=([0-9.]+)/);
      if (gpuMatch) {
        temps.gpu = parseFloat(gpuMatch[1]);
      }
    } catch {}
  }

  if (Bun.which("sensors")) {
    try {
      const sensorsProc = Bun.spawn(["sensors"]);
      const sensorsOutput = new Response(sensorsProc.stdout).text();
      
      const cpuMatch = sensorsOutput.match(/Core 0.*?\+([0-9.]+)°C/);
      if (cpuMatch) {
        temps.cpu = parseFloat(cpuMatch[1]);
      }
      
      const mbMatch = sensorsOutput.match(/temp1.*?\+([0-9.]+)°C/);
      if (mbMatch) {
        temps.motherboard = parseFloat(mbMatch[1]);
      }
    } catch {}
  }

  if (Bun.which("smartctl")) {
    try {
      const diskProc = Bun.spawn(["smartctl", "-A", "/dev/sda"]);
      const diskOutput = new Response(diskProc.stdout).text();
      const tempMatch = diskOutput.match(/Temperature.*?(\d+)/);
      if (tempMatch) {
        temps.disk = parseInt(tempMatch[1]);
      }
    } catch {}
  }

  if (Bun.which("wmic")) {
    try {
      const wmicProc = Bun.spawn(["wmic", "temperature", "get", "CurrentTemp"]);
      const wmicOutput = new Response(wmicProc.stdout).text();
      const tempMatch = wmicOutput.match(/(\d+)/);
      if (tempMatch) {
        temps.cpu = (parseInt(tempMatch[1]) - 2732) / 10;
      }
    } catch {}
  }

  if (temps.cpu === null) {
    try {
      const thermalDirs = ["/sys/class/thermal/thermal_zone0/temp", "/proc/acpi/thermal"];
      for (const dir of thermalDirs) {
        try {
          const content = Bun.file(dir).text();
          const temp = parseInt(content.trim()) / 1000;
          if (temp > 0 && temp < 150) {
            temps.cpu = temp;
            break;
          }
        } catch {}
      }
    } catch {}
  }

  if (unit === "fahrenheit" && temps.cpu !== null) {
    temps.cpu = (temps.cpu * 9) / 5 + 32;
    if (temps.gpu !== null) temps.gpu = (temps.gpu * 9) / 5 + 32;
    if (temps.disk !== null) temps.disk = (temps.disk * 9) / 5 + 32;
    if (temps.motherboard !== null) temps.motherboard = (temps.motherboard * 9) / 5 + 32;
    if (temps.ambient !== null) temps.ambient = (temps.ambient * 9) / 5 + 32;
  }

  return temps;
}
