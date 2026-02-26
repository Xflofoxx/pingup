import { execSync } from "child_process";

export interface NetBIOSEntry {
  ip_address: string;
  name: string;
  type: string;
  domain: string;
  mac_address: string;
}

export async function scanNetBIOS(subnet: string): Promise<NetBIOSEntry[]> {
  try {
    const baseIP = subnet.split("/")[0];
    const octets = baseIP.split(".");
    const network = `${octets[0]}.${octets[1]}.${octets[2]}`;
    
    const output = execSync(`nmblookup -S "${network}.255"`, { 
      encoding: "utf-8", 
      timeout: 30000 
    });
    
    return parseNetBIOSOutput(output);
  } catch {
    return [];
  }
}

function parseNetBIOSOutput(output: string): NetBIOSEntry[] {
  const entries: NetBIOSEntry[] = [];
  const lines = output.split("\n");
  let currentIP = "";
  
  for (const line of lines) {
    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) {
      currentIP = ipMatch[1];
    }
    
    if (currentIP && line.includes("<00>")) {
      const nameMatch = line.match(/<(\w+)>\s*([^\s<]+)/);
      if (nameMatch) {
        const type = nameMatch[1];
        const name = nameMatch[2];
        
        const isDomain = type === "<1D>";
        const isGroup = type === "<1E>";
        
        if (!isDomain && !isGroup) {
          entries.push({
            ip_address: currentIP,
            name,
            type: getNetBIOSType(type),
            domain: "",
            mac_address: "",
          });
        }
      }
    }
  }
  
  return entries;
}

function getNetBIOSType(type: string): string {
  const types: Record<string, string> = {
    "<00>": "Workstation",
    "<01>": "Messenger",
    "<03>": "Messenger",
    "<06>": "RAS Server",
    "<1D>": "Master Browser",
    "<1E>": "Browser",
    "<20>": "File Server",
    "<21>": "RAS Client",
    "<22>": "Exchange",
    "<23>": "Exchange",
    "<24>": "Exchange",
    "<30>": "Modem",
    "<31>": "SMS",
    "<43>": "SMS",
    "<44>": "Novell",
    "<45>": "Novell",
    "<46>": "Novell",
    "<47>": "Novell",
    "<4B>": "SQL",
    "<4C>": "SQL",
    "<42>": "McAfee",
    "<52>": "Symantec",
    "<87>": "Exchange",
    "<6A>": "Exchange",
    "<C0>": "Windows",
    "<00>:": "Domain",
  };
  
  return types[type] || "Unknown";
}

export async function resolveNetBIOSName(name: string, subnet: string): Promise<string | null> {
  try {
    const baseIP = subnet.split("/")[0];
    const octets = baseIP.split(".");
    const broadcast = `${octets[0]}.${octets[1]}.${octets[2]}.255`;
    
    const output = execSync(`nmblookup -A ${broadcast} ${name}`, { 
      encoding: "utf-8", 
      timeout: 5000 
    });
    
    const ipMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
    return ipMatch ? ipMatch[1] : null;
  } catch {
    return null;
  }
}
