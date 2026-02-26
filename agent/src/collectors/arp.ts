import { execSync } from "child_process";

export interface ARPEntry {
  ip_address: string;
  mac_address: string;
  vendor: string;
  hostname: string;
  interface: string;
}

const MAC_VENDOR_DB: Record<string, string> = {
  "00:00:0C": "Cisco",
  "00:1A:2B": "Cisco",
  "00:50:56": "VMware",
  "00:0C:29": "VMware",
  "08:00:27": "VirtualBox",
  "52:54:00": "QEMU",
  "B8:27:EB": "Raspberry Pi",
  "DC:A6:32": "Raspberry Pi",
  "E4:5F:01": "Raspberry Pi",
  "00:17:88": "Philips Hue",
  "68:A4:0E": "Philips",
  "AC:CF:85": "Espressif",
  "24:6F:28": "Espressif",
  "00:1B:44": "Dell",
  "00:14:22": "Dell",
  "00:16:3E": "Xen",
  "00:1C:42": "Parallels",
  "00:03:FF": "Microsoft",
  "00:15:5D": "Microsoft Hyper-V",
  "08:2E:5F": "Intel",
  "3C:D9:2B": "HP",
  "00:50:B6": "Linksys",
  "00:0D:56": "Dell",
  "00:1E:C9": "D-Link",
  "00:22:B0": "Netgear",
  "00:26:F2": "Netgear",
  "00:24:B2": "Buffalo",
  "00:1F:33": "Apple",
  "3C:06:30": "Apple",
  "F0:18:98": "Apple",
  "00:26:BB": "Apple",
  "00:25:00": "Apple",
  "60:F8:1D": "Apple",
  "7C:6D:62": "Samsung",
  "00:12:47": "Cisco",
  "00:16:CA": "Cisco",
  "00:17:DF": "Cisco",
  "00:18:39": "Cisco",
  "00:18:70": "Cisco",
  "00:19:2F": "Cisco",
  "00:1A:6C": "Cisco",
  "00:1B:0C": "Cisco",
  "00:1C:10": "Cisco",
  "00:1D:45": "Cisco",
  "00:1E:13": "Cisco",
  "00:1F:6B": "Cisco",
  "00:21:5C": "Cisco",
};

export async function scanARP(network: string): Promise<ARPEntry[]> {
  try {
    execSync(`arp -d > NUL 2>&1`, { shell: true });
    
    const parts = network.split("/");
    const baseIP = parts[0];
    const prefix = parseInt(parts[1] || "24");
    
    const octets = baseIP.split(".").map(Number);
    const hostBits = 32 - prefix;
    const numHosts = Math.pow(2, hostBits);
    
    const results: ARPEntry[] = [];
    const startHost = octets[3];
    
    for (let i = Math.max(1, startHost); i < Math.min(254, startHost + Math.min(numHosts, 256)); i++) {
      const ip = `${octets[0]}.${octets[1]}.${octets[2]}.${i}`;
      await pingHost(ip);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    return getARPTable();
  } catch (e) {
    return getARPTable();
  }
}

async function pingHost(ip: string): Promise<void> {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      execSync(`ping -n 1 -w 100 ${ip} > NUL`, { stdio: "ignore" });
    } else {
      execSync(`ping -c 1 -W 1 ${ip} > /dev/null`, { stdio: "ignore" });
    }
  } catch {
  }
}

export function getARPTable(): ARPEntry[] {
  try {
    const output = execSync(process.platform === "win32" 
      ? "arp -a" 
      : "arp -n", { encoding: "utf-8" }
    );
    
    const entries: ARPEntry[] = [];
    const lines = output.split("\n");
    
    for (const line of lines) {
      const match = process.platform === "win32"
        ? line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+(\w+)/)
        : line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:]{17})\s+(\w+)/);
      
      if (match) {
        const mac = match[2].toUpperCase().replace(/-/g, ":");
        const vendor = lookupVendor(mac);
        
        entries.push({
          ip_address: match[1],
          mac_address: mac,
          vendor,
          hostname: resolveHostname(match[1]),
          interface: "",
        });
      }
    }
    
    return entries.filter(e => e.mac_address !== "FF:FF:FF:FF:FF:FF");
  } catch {
    return [];
  }
}

function lookupVendor(mac: string): string {
  const prefix = mac.substring(0, 8).toUpperCase();
  return MAC_VENDOR_DB[prefix] || "Unknown";
}

function resolveHostname(ip: string): string {
  try {
    const output = execSync(process.platform === "win32"
      ? `nslookup ${ip}`
      : `host ${ip}`, { encoding: "utf-8", timeout: 2000 }
    );
    
    if (process.platform === "win32") {
      const match = output.match(/Name:\s+(.+)/);
      return match ? match[1].trim() : "";
    } else {
      const match = output.match(/domain name pointer (.+)/);
      return match ? match[1].replace(/\.$/, "") : "";
    }
  } catch {
    return "";
  }
}

export function getMACVendor(mac: string): string {
  return lookupVendor(mac.toUpperCase());
}
