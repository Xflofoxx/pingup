export interface DHCPLease {
  ip_address: string;
  mac_address: string;
  hostname: string;
  expires: string;
}

export async function getDHCPLeases(): Promise<DHCPLease[]> {
  const platform = process.platform;
  
  if (platform === "win32") {
    return getWindowsDHCPLeases();
  }
  
  return getLinuxDHCPLeases();
}

async function getWindowsDHCPLeases(): Promise<DHCPLease[]> {
  try {
    const { execSync } = require("child_process");
    
    const output = execSync("netsh dhcp show server 2>&1", { encoding: "utf-8", timeout: 5000 });
    
    return [];
  } catch {
    return [];
  }
}

async function getLinuxDHCPLeases(): Promise<DHCPLease[]> {
  const leaseFiles = [
    "/var/lib/dhcp/dhcpd.leases",
    "/var/lib/dhcpd/dhcpd.leases",
    "/var/lib/NetworkManager/dhclient-*lease*",
  ];
  
  const leases: DHCPLease[] = [];
  
  try {
    const { readFileSync, existsSync } = require("fs");
    
    for (const file of leaseFiles) {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf-8");
        const parsed = parseDHCPLeases(content);
        leases.push(...parsed);
      }
    }
  } catch {}
  
  return leases;
}

function parseDHCPLeases(content: string): DHCPLease[] {
  const leases: DHCPLease[] = [];
  const blocks = content.split("}");
  
  for (const block of blocks) {
    const ipMatch = block.match(/binding\s+state\s+(\d+\.\d+\.\d+\.\d+)/);
    const macMatch = block.match(/hardware\s+ethernet\s+([0-9a-f:]+)/i);
    const hostnameMatch = block.match(/client-hostname\s+"([^"]+)"/i);
    const endsMatch = block.match(/ends\s+\d+\s+([\d\/:\s]+)/);
    
    if (ipMatch && macMatch) {
      leases.push({
        ip_address: ipMatch[1],
        mac_address: macMatch[1].toUpperCase(),
        hostname: hostnameMatch ? hostnameMatch[1] : "",
        expires: endsMatch ? endsMatch[1].trim() : "",
      });
    }
  }
  
  return leases;
}
