import { execSync } from "child_process";

export interface SNMPResult {
  oid: string;
  value: string;
}

export interface SNMPDevice {
  ip: string;
  sysDescr: string;
  sysUpTime: string;
  sysContact: string;
  sysName: string;
  sysLocation: string;
  interfaces: number;
}

export async function snmpWalk(
  host: string, 
  community: string = "public", 
  oid: string = "1.3.6.1"
): Promise<SNMPResult[]> {
  try {
    const output = execSync(`snmpwalk -v 2c -c ${community} ${host} ${oid}`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    
    return parseSNMPWalk(output);
  } catch {
    return [];
  }
}

export async function snmpGet(
  host: string,
  community: string = "public",
  oid: string
): Promise<string | null> {
  try {
    const output = execSync(`snmpget -v 2c -c ${community} ${host} ${oid}`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    
    const match = output.match(/=\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export async function getSNMPDeviceInfo(
  host: string,
  community: string = "public"
): Promise<SNMPDevice | null> {
  try {
    const sysDescr = await snmpGet(host, community, "1.3.6.1.2.1.1.1.0");
    const sysUpTime = await snmpGet(host, community, "1.3.6.1.2.1.1.3.0");
    const sysContact = await snmpGet(host, community, "1.3.6.1.2.1.1.4.0");
    const sysName = await snmpGet(host, community, "1.3.6.1.2.1.1.5.0");
    const sysLocation = await snmpGet(host, community, "1.3.6.1.2.1.1.6.0");
    const ifNumber = await snmpGet(host, community, "1.3.6.1.2.1.2.1.0");
    
    return {
      ip: host,
      sysDescr: sysDescr || "",
      sysUpTime: sysUpTime || "",
      sysContact: sysContact || "",
      sysName: sysName || "",
      sysLocation: sysLocation || "",
      interfaces: ifNumber ? parseInt(ifNumber) : 0,
    };
  } catch {
    return null;
  }
}

function parseSNMPWalk(output: string): SNMPResult[] {
  const results: SNMPResult[] = [];
  const lines = output.split("\n");
  
  for (const line of lines) {
    const match = line.match(/^([.\d]+)\s*=\s*(.+)$/);
    if (match) {
      results.push({
        oid: match[1],
        value: match[2].trim(),
      });
    }
  }
  
  return results;
}

export async function getInterfaceInfo(
  host: string,
  community: string = "public"
): Promise<Array<{
  index: number;
  description: string;
  type: string;
  speed: number;
  mac: string;
  ip: string;
}>> {
  const results: Array<{
    index: number;
    description: string;
    type: string;
    speed: number;
    mac: string;
    ip: string;
  }> = [];
  
  try {
    const descrResults = await snmpWalk(host, community, "1.3.6.1.2.1.2.2.1.2");
    const typeResults = await snmpWalk(host, community, "1.3.6.1.2.1.2.2.1.3");
    const speedResults = await snmpWalk(host, community, "1.3.6.1.2.1.2.2.1.5");
    const macResults = await snmpWalk(host, community, "1.3.6.1.2.1.2.2.1.6");
    const ipResults = await snmpWalk(host, community, "1.3.6.1.2.1.4.20.1.2");
    
    for (const d of descrResults) {
      const index = parseInt(d.oid.split(".").pop() || "0");
      const typeEntry = typeResults.find(t => t.oid.endsWith(`.${index}`));
      const speedEntry = speedResults.find(s => s.oid.endsWith(`.${index}`));
      const macEntry = macResults.find(m => m.oid.endsWith(`.${index}`));
      const ipEntry = ipResults.find(i => i.oid.endsWith(`.${index}`));
      
      results.push({
        index,
        description: d.value.replace(/"/g, ""),
        type: typeEntry?.value || "unknown",
        speed: speedEntry ? parseInt(speedEntry.value) : 0,
        mac: macEntry?.value || "",
        ip: ipEntry?.value || "",
      });
    }
  } catch {
  }
  
  return results;
}

export function isSNMPAvailable(): boolean {
  try {
    execSync("snmpwalk -V", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
