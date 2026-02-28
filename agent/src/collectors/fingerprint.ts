export interface DeviceFingerprint {
  mac: string;
  vendor: string;
  type: string;
  confidence: number;
  indicators: string[];
}

const FINGERPRINTS = [
  { vendor: "Apple", patterns: ["iPhone", "iPad", "MacBook", "iMac"], type: "workstation" },
  { vendor: "Samsung", patterns: ["SM-", "Galaxy"], type: "mobile" },
  { vendor: "Dell", patterns: ["Dell"], type: "workstation" },
  { vendor: "HP", patterns: ["HP", "Hewlett"], type: "workstation" },
  { vendor: "Lenovo", patterns: ["ThinkPad", "Lenovo"], type: "workstation" },
  { vendor: "Cisco", patterns: ["Cisco", "ios"], type: "network" },
  { vendor: "Ubiquiti", patterns: ["UBNT", "UniFi"], type: "network" },
  { vendor: "Raspberry Pi", patterns: ["Raspberry"], type: "iot" },
  { vendor: "Philips", patterns: ["Philips", "Hue"], type: "iot" },
  { vendor: "Nest", patterns: ["Nest"], type: "iot" },
  { vendor: "Intel", patterns: ["Intel"], type: "workstation" },
  { vendor: "Realtek", patterns: ["Realtek"], type: "network" },
];

export function fingerprintDevice(mac: string, hostname: string = "", ports: number[] = []): DeviceFingerprint {
  const macUpper = mac.toUpperCase();
  const indicators: string[] = [];
  let vendor = "Unknown";
  let type = "unknown";
  let confidence = 0.3;
  
  for (const fp of FINGERPRINTS) {
    for (const pattern of fp.patterns) {
      if (macUpper.includes(pattern.toUpperCase())) {
        vendor = fp.vendor;
        type = fp.type;
        confidence = 0.8;
        indicators.push(`MAC vendor: ${vendor}`);
        break;
      }
    }
    if (confidence > 0.5) break;
  }
  
  if (hostname) {
    const hostnameLower = hostname.toLowerCase();
    for (const fp of FINGERPRINTS) {
      for (const pattern of fp.patterns) {
        if (hostnameLower.includes(pattern.toLowerCase())) {
          vendor = fp.vendor;
          type = fp.type;
          confidence = Math.min(0.95, confidence + 0.15);
          indicators.push(`Hostname: ${hostname}`);
          break;
        }
      }
    }
  }
  
  const commonPorts = [22, 80, 443, 3389, 8080, 445, 21, 23, 25, 53];
  const openCommon = ports.filter(p => commonPorts.includes(p));
  
  if (openCommon.includes(22)) {
    indicators.push("SSH open");
    if (type === "unknown") type = "server";
  }
  if (openCommon.includes(80) || openCommon.includes(443)) {
    indicators.push("HTTP/HTTPS open");
  }
  if (openCommon.includes(445)) {
    indicators.push("SMB open");
    if (type === "unknown") type = "workstation";
  }
  
  return { mac, vendor, type, confidence, indicators };
}

export function getDeviceType(mac: string): string {
  const fp = fingerprintDevice(mac);
  return fp.type;
}
