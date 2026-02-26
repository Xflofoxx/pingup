export interface LLDPNeighbor {
  chassis_id: string;
  port_id: string;
  port_description: string;
  system_name: string;
  system_description: string;
  capabilities: string[];
  management_address: string;
}

export interface CDPNeighbor {
  device_id: string;
  port_id: string;
  platform: string;
  capabilities: string;
  management_address: string;
}

export async function discoverLLDP(): Promise<LLDPNeighbor[]> {
  try {
    const { execSync } = require("child_process");
    
    if (process.platform === "win32") {
      return [];
    }
    
    const output = execSync("lldpctl -f json 2>/dev/null || lldpctl 2>/dev/null || echo ''", {
      encoding: "utf-8",
      timeout: 5000,
    });
    
    return parseLLDPOutput(output);
  } catch {
    return [];
  }
}

function parseLLDPOutput(output: string): LLDPNeighbor[] {
  const neighbors: LLDPNeighbor[] = [];
  
  try {
    const parsed = JSON.parse(output);
    for (const iface of Object.values(parsed)) {
      const ifaceData = iface as any;
      if (ifaceData.lldp) {
        for (const neighbor of Object.values(ifaceData.lldp)) {
          const n = neighbor as any;
          neighbors.push({
            chassis_id: n.chassis?.id || "",
            port_id: n.port?.id || "",
            port_description: n.port?.descr || "",
            system_name: n.chassis?.name || "",
            system_description: n.chassis?.descr || "",
            capabilities: n.port?.cap?.split(",") || [],
            management_address: n.management?.ip4 || "",
          });
        }
      }
    }
  } catch {}
  
  return neighbors;
}

export async function discoverCDP(): Promise<CDPNeighbor[]> {
  try {
    const { execSync } = require("child_process");
    
    if (process.platform === "win32") {
      return [];
    }
    
    const output = execSync("cdp neighbors detail 2>/dev/null || show cdp neighbors detail 2>/dev/null || echo ''", {
      encoding: "utf-8",
      timeout: 5000,
    });
    
    return parseCDPOutput(output);
  } catch {
    return [];
  }
}

function parseCDPOutput(output: string): CDPNeighbor[] {
  const neighbors: CDPNeighbor[] = [];
  
  const blocks = output.split("Device ID:").slice(1);
  
  for (const block of blocks) {
    const deviceIdMatch = block.match(/Device ID:\s*(.+)/);
    const portIdMatch = block.match(/Port ID:\s*(.+)/);
    const platformMatch = block.match(/Platform:\s*(.+)/);
    const capabilitiesMatch = block.match(/Capabilities:\s*(.+)/);
    const mgmtMatch = block.match(/Management Address\(es\):\s*(.+)/);
    
    if (deviceIdMatch) {
      neighbors.push({
        device_id: deviceIdMatch[1].trim(),
        port_id: portIdMatch ? portIdMatch[1].trim() : "",
        platform: platformMatch ? platformMatch[1].trim() : "",
        capabilities: capabilitiesMatch ? capabilitiesMatch[1].trim() : "",
        management_address: mgmtMatch ? mgmtMatch[1].trim() : "",
      });
    }
  }
  
  return neighbors;
}
