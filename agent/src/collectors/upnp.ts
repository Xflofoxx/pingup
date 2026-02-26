export interface UPnPDevice {
  location: string;
  server: string;
  usn: string;
  st: string;
}

export async function discoverUPnP(): Promise<UPnPDevice[]> {
  try {
    const { execSync } = require("child_process");
    
    const output = execSync("powershell -Command \"$msearch = 'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 3\r\nST: ssdp:all\r\n\r\n'; $udp = New-Object System.Net.Sockets.UdpClient; $udp.Connect('239.255.255.250', 1900); $bytes = [System.Text.Encoding]::ASCII.GetBytes($msearch); $udp.Send($bytes, $bytes.Length); $udp.Receive([ref][System.Net.IPEndPoint]::Any); $udp.Close()\" 2>&1 | Out-String", {
      encoding: "utf-8",
      timeout: 5000,
    });
    
    return parseSSDPResponse(output);
  } catch {
    return [];
  }
}

function parseSSDPResponse(response: string): UPnPDevice[] {
  const devices: UPnPDevice[] = [];
  const entries = response.split("HTTP/1.1");
  
  for (const entry of entries) {
    if (!entry.trim()) continue;
    
    const locationMatch = entry.match(/LOCATION:\s*(.+)/i);
    const serverMatch = entry.match(/SERVER:\s*(.+)/i);
    const usnMatch = entry.match(/USN:\s*(.+)/i);
    const stMatch = entry.match(/ST:\s*(.+)/i);
    
    if (locationMatch) {
      devices.push({
        location: locationMatch[1].trim(),
        server: serverMatch ? serverMatch[1].trim() : "",
        usn: usnMatch ? usnMatch[1].trim() : "",
        st: stMatch ? stMatch[1].trim() : "",
      });
    }
  }
  
  return devices.slice(0, 10);
}

export async function discoverSSDP(): Promise<UPnPDevice[]> {
  return discoverUPnP();
}
