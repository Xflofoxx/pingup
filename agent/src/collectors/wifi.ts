export interface WiFiInfo {
  ssid: string;
  bssid: string;
  signal_strength: number;
  signal_quality: number;
  channel: number;
  frequency: number;
  bitrate: number;
  ip_address: string;
}

export interface WiFiMetrics {
  connected: boolean;
  interface: string | null;
  wifi: WiFiInfo | null;
}

export async function collectWiFi(): Promise<WiFiMetrics> {
  const windows = await collectWindowsWiFi();
  if (windows.connected) return windows;
  
  const linux = await collectLinuxWiFi();
  return linux;
}

async function collectWindowsWiFi(): Promise<WiFiMetrics> {
  try {
    const proc = Bun.spawn(["powershell", "-Command", `
      $wifi = netsh wlan show interfaces | Out-String
      if ($wifi -match 'State\\s*:\\s*connected') {
        $ssid = ($wifi -split 'SSID' | Select-Object -Skip 1)[0] -split ':' | Select-Object -Skip 1
        $bssid = ($wifi -match 'BSSID') -replace '.*:\\s*',''
        $signal = ($wifi -match 'Signal\\s*:') -replace '.*:\\s*','' -replace '%',''
        $channel = ($wifi -match 'Channel\\s*:') -replace '.*:\\s*',''
        $frequency = ($wifi -match 'Radio type\\s*:') -replace '.*:\\s*',''
        
        @{ 
          ssid = $ssid.Trim()
          bssid = $bssid.Trim()
          signal = [int]$signal.Trim()
          channel = [int]$channel.Trim()
          frequency = $frequency.Trim()
        } | ConvertTo-Json
      }
    `]);
    
    const output = await new Response(proc.stdout).text();
    
    if (!output.trim() || proc.exitCode !== 0) {
      return { connected: false, interface: null, wifi: null };
    }
    
    const data = JSON.parse(output);
    
    return {
      connected: true,
      interface: "Wi-Fi",
      wifi: {
        ssid: data.ssid || "",
        bssid: data.bssid || "",
        signal_strength: (100 - data.signal) * -1,
        signal_quality: data.signal || 0,
        channel: data.channel || 0,
        frequency: data.frequency === "802.11n" ? 2.4 : data.frequency === "802.11ac" ? 5 : 0,
        bitrate: 0,
        ip_address: "",
      },
    };
  } catch {
    return { connected: false, interface: null, wifi: null };
  }
}

async function collectLinuxWiFi(): Promise<WiFiMetrics> {
  try {
    const proc = Bun.spawn(["iwgetid", "-r"]);
    const ssid = (await new Response(proc.stdout).text()).trim();
    
    if (!ssid) {
      return { connected: false, interface: null, wifi: null };
    }
    
    const ifaceProc = Bun.spawn(["iwgetid", "-r", "-i"]);
    const iface = (await new Response(ifaceProc.stdout).text()).trim();
    
    const signalProc = Bun.spawn(["iwconfig", iface]);
    const signalOutput = await new Response(signalProc.stdout).text();
    
    const signalMatch = signalOutput.match(/Signal level=(-?\d+)/);
    const signal = signalMatch ? parseInt(signalMatch[1]) : -100;
    
    return {
      connected: true,
      interface: iface || null,
      wifi: {
        ssid,
        bssid: "",
        signal_strength: signal,
        signal_quality: Math.max(0, Math.min(100, (signal + 100) * 2)),
        channel: 0,
        frequency: 0,
        bitrate: 0,
        ip_address: "",
      },
    };
  } catch {
    return { connected: false, interface: null, wifi: null };
  }
}

export async function checkWiFiAvailable(): Promise<boolean> {
  const wifi = await collectWiFi();
  return wifi.connected;
}
