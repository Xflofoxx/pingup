import { isSNMPAvailable, getSNMPDeviceInfo, snmpGet } from "./snmp.ts";
import {
  type DeviceProfile,
  type DeviceType,
  type SoftwareEntry,
  type VulnerabilityFinding,
  lookupVendor,
  parseSshBanner,
  parseHttpServer,
  parseTelnetBanner,
  extractVersionFromBanner,
  detectVulnerabilities,
  computeRiskScore,
  computeRiskLabel,
} from "../../../libs/vulns/src/index.ts";

export interface ProfilerOptions {
  snmpCommunity?: string;
  bannerTimeout?: number;
  enableSnmp?: boolean;
}

export interface ProfiledHost {
  profile: DeviceProfile;
  findings: VulnerabilityFinding[];
  riskScore: number;
  riskLabel: string;
}

interface BannerProbe {
  port: number;
  probe: string;
}

const BANNER_PROBES: BannerProbe[] = [
  { port: 21, probe: "\r\n" },
  { port: 22, probe: "\r\n" },
  { port: 25, probe: "\r\n" },
  { port: 23, probe: "\r\n" },
  { port: 80, probe: "HEAD / HTTP/1.0\r\n\r\n" },
  { port: 8080, probe: "HEAD / HTTP/1.0\r\n\r\n" },
];

const STANDARD_PORTS: Record<number, string> = {
  21: "ftp",
  22: "ssh",
  23: "telnet",
  25: "smtp",
  80: "http",
  110: "pop3",
  143: "imap",
  443: "https",
  445: "smb",
  554: "rtsp",
  631: "ipp",
  161: "snmp",
  162: "snmp",
  623: "ipmi",
  1900: "ssdp",
  3306: "mysql",
  3389: "rdp",
  5000: "https-alt",
  5001: "https-alt",
  5060: "sip",
  5061: "sip-tls",
  5432: "postgres",
  6379: "redis",
  8080: "http-alt",
  8443: "https-alt",
  9100: "raw-printer",
  27017: "mongodb",
};

const TYPE_KEYWORDS: Array<{ type: DeviceType; keywords: string[]; weight: number }> = [
  {
    type: "firewall",
    keywords: ["palo alto", "fortinet", "fortigate", "sonicwall", "check point", "firepower", "kerio", "barracuda"],
    weight: 4,
  },
  { type: "router", keywords: ["cisco ios", "ios xe", "mikrotik", "routeros", "routerboard", "ubiquiti", "unifi", "edgeos"], weight: 3 },
  { type: "switch", keywords: ["cisco catalyst", "cisco nexus", "cisco switch", "aruba", "hpe switch", "netgear switch"], weight: 3 },
  { type: "nas", keywords: ["synology", "qnap", "freenas", "truenas", "openmediavault", "wdcloud", "wd my cloud"], weight: 4 },
  { type: "ups", keywords: ["apc", "smart-ups", "smartup", "powerware", "eaton", "cyberpower", "ups", "upd"], weight: 4 },
  { type: "printer", keywords: ["laserjet", "pagewide", "printer", "mfp", "designjet", "officejet", "photosmart", "workcentre"], weight: 4 },
  { type: "camera", keywords: ["dahua", "hikvision", "axis", "reolink", "ip cam", "ipcam", "video server"], weight: 4 },
  { type: "voip", keywords: ["gigaset", "yealink", "grandstream", "polycom", "cisco spa", "snom", "asterisk", "pbx", "phone"], weight: 4 },
  { type: "iot", keywords: ["espressif", "esp8266", "esp32", "arduino", "raspberry", "tuya", "shelly"], weight: 3 },
  { type: "server", keywords: ["linux", "ubuntu", "debian", "centos", "rhel", "red hat", "windows server", "vmware esxi", "proxmox", "suse"], weight: 2 },
  { type: "workstation", keywords: ["windows 10", "windows 11", "macos", "fedora", "windows xp"], weight: 1 },
];

const PORT_HINTS: Array<{ ports: number[]; type: DeviceType; weight: number }> = [
  { ports: [9100, 515, 631], type: "printer", weight: 3 },
  { ports: [5060, 5061], type: "voip", weight: 3 },
  { ports: [554], type: "camera", weight: 2 },
  { ports: [3306, 5432, 27017, 6379], type: "server", weight: 3 },
  { ports: [25], type: "server", weight: 2 },
  { ports: [5000, 5001], type: "nas", weight: 1 },
  { ports: [3389], type: "workstation", weight: 1 },
  { ports: [1900], type: "router", weight: 1 },
  { ports: [161, 162], type: "router", weight: 1 },
];

const VENDOR_HINTS: Array<{ keywords: string[]; vendor: string }> = [
  { keywords: ["cisco"], vendor: "Cisco" },
  { keywords: ["mikrotik"], vendor: "MikroTik" },
  { keywords: ["ubiquiti", "unifi"], vendor: "Ubiquiti" },
  { keywords: ["fortinet", "fortigate"], vendor: "Fortinet" },
  { keywords: ["synology"], vendor: "Synology" },
  { keywords: ["qnap"], vendor: "QNAP" },
  { keywords: ["apc", "smart-ups"], vendor: "APC" },
  { keywords: ["eaton"], vendor: "Eaton" },
  { keywords: ["hikvision"], vendor: "Hikvision" },
  { keywords: ["dahua"], vendor: "Dahua" },
  { keywords: ["axis"], vendor: "Axis" },
  { keywords: ["espressif"], vendor: "Espressif" },
  { keywords: ["huawei"], vendor: "Huawei" },
  { keywords: ["dell"], vendor: "Dell" },
  { keywords: ["hp ", "hewlett", "laserjet"], vendor: "HP" },
  { keywords: ["brother"], vendor: "Brother" },
  { keywords: ["canon"], vendor: "Canon" },
];

const OS_PATTERNS: Array<{ pattern: RegExp; os: string }> = [
  { pattern: /cisco ios/i, os: "Cisco IOS" },
  { pattern: /windows/i, os: "Microsoft Windows" },
  { pattern: /darwin|macos/i, os: "Apple macOS" },
  { pattern: /ubuntu|debian/i, os: "Linux" },
  { pattern: /linux/i, os: "Linux" },
  { pattern: /vmware esxi/i, os: "VMware ESXi" },
  { pattern: /proxmox/i, os: "Proxmox VE" },
  { pattern: /android/i, os: "Android" },
  { pattern: /ios\//i, os: "Apple iOS" },
];

export function guessOs(sysDescr: string): string | undefined {
  if (!sysDescr) return undefined;
  for (const entry of OS_PATTERNS) {
    if (entry.pattern.test(sysDescr)) return entry.os;
  }
  return undefined;
}

export function inferVendor(sysDescr: string): string | undefined {
  if (!sysDescr) return undefined;
  const lower = sysDescr.toLowerCase();
  for (const entry of VENDOR_HINTS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.vendor;
  }
  return undefined;
}

export function inferType(ports: number[], sysDescr: string, vendorType?: DeviceType): { type: DeviceType; confidence: number } {
  const scores: Partial<Record<DeviceType, number>> = {};
  let confidence = 0.3;

  const bump = (type: DeviceType, weight: number) => {
    scores[type] = (scores[type] || 0) + weight;
  };

  if (vendorType) {
    bump(vendorType, 3);
    confidence = Math.max(confidence, 0.8);
  }

  const lower = (sysDescr || "").toLowerCase();
  for (const group of TYPE_KEYWORDS) {
    if (group.keywords.some((k) => lower.includes(k))) {
      bump(group.type, group.weight);
      confidence = Math.max(confidence, 0.9);
    }
  }

  for (const hint of PORT_HINTS) {
    if (hint.ports.some((p) => ports.includes(p))) {
      bump(hint.type, hint.weight);
      confidence = Math.max(confidence, 0.6);
    }
  }

  const entries = Object.entries(scores) as Array<[DeviceType, number]>;
  if (entries.length === 0) {
    return { type: "other", confidence: 0.3 };
  }

  entries.sort((a, b) => b[1] - a[1]);
  return { type: entries[0][0], confidence: Math.min(confidence, 0.95) };
}

export function grabBanner(host: string, port: number, probe: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let data = "";
    let settled = false;
    let conn: Bun.TCPConnection | null = null;
    const timer = setTimeout(finish, timeoutMs);

    function finish() {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try {
        conn?.close();
      } catch {
        // already closed
      }
      const cleaned = data.replace(/[^\x20-\x7e\r\n]/g, "").trim();
      resolve(cleaned.length > 0 ? cleaned : null);
    }

    try {
      conn = Bun.connect({
        hostname: host,
        port,
        socket: {
          data(_socket, chunk) {
            data += new TextDecoder().decode(chunk);
            if (data.includes("\r\n\r\n")) finish();
          },
          open(socket) {
            conn = socket;
            if (probe) {
              try {
                socket.write(probe);
              } catch {
                // ignore write errors
              }
            }
          },
          close() {
            finish();
          },
          error() {
            finish();
          },
        },
      });
    } catch {
      finish();
    }
  });
}

export async function parseBanner(host: string, port: number, probe: string, timeoutMs: number): Promise<SoftwareEntry | null> {
  const banner = await grabBanner(host, port, probe, timeoutMs);
  if (!banner) return null;

  const base: SoftwareEntry = { protocol: STANDARD_PORTS[port] || "tcp", port, banner };

  if (/^SSH-\d+(?:\.\d+)?-/.test(banner)) {
    const parsed = parseSshBanner(banner);
    if (parsed) return { ...base, name: parsed.name, version: parsed.version };
  }

  if (port === 22) {
    const parsed = parseSshBanner(banner);
    if (parsed) return { ...base, name: parsed.name, version: parsed.version };
  }

  if (port === 21 || port === 25 || port === 23) {
    const productName = (banner.split(/[\s:]/, 1)[0] || "").toLowerCase();
    if (productName) {
      return {
        ...base,
        name: productName.replace(/[^\w.-]/g, ""),
        version: extractVersionFromBanner(banner) || undefined,
      };
    }
  }

  if (port === 80 || port === 8080) {
    const serverHeader = banner.match(/^Server:\s*(.+)$/im)?.[1];
    if (serverHeader) {
      const parsed = parseHttpServer(serverHeader);
      if (parsed) return { ...base, name: parsed.name, version: parsed.version };
    }
    const parsed = parseHttpServer(banner);
    if (parsed) return { ...base, name: parsed.name, version: parsed.version };
  }

  const parsedTelnet = parseTelnetBanner(banner);
  if (parsedTelnet && parsedTelnet.name) return { ...base, name: parsedTelnet.name };

  return null;
}

async function resolveHostname(ip: string): Promise<string | undefined> {
  try {
    const results = await Bun.dns.lookup(ip, { reverse: true });
    const first = results[0];
    if (first && typeof first === "string") return first;
  } catch {
    // no PTR record
  }
  return undefined;
}

export async function profileHost(
  host: { ip: string; mac?: string; hostname?: string; ports?: number[] },
  options: ProfilerOptions = {}
): Promise<ProfiledHost> {
  const community = options.snmpCommunity || "public";
  const bannerTimeout = options.bannerTimeout ?? 2500;
  const ports = host.ports || [];

  const tasks: Promise<void>[] = [];
  const software: SoftwareEntry[] = [];

  if (bannerTimeout > 0) {
    for (const probeEntry of BANNER_PROBES) {
      if (!ports.includes(probeEntry.port)) continue;
      tasks.push(
      parseBanner(host.ip, probeEntry.port, probeEntry.probe, bannerTimeout).then((entry) => {
        if (entry) software.push(entry);
      })
    );
    }
  }

  let snmpSysDescr = "";
  let snmpSysObjectID: string | null = null;
  let snmpCommunity: string | null = null;

  if (options.enableSnmp !== false && isSNMPAvailable()) {
    tasks.push(
      (async () => {
        const info = await getSNMPDeviceInfo(host.ip, community);
        if (info && info.sysDescr) {
          snmpSysDescr = info.sysDescr;
          snmpCommunity = community;
          snmpSysObjectID = await snmpGet(host.ip, community, "1.3.6.1.2.1.1.2.0");
        }
      })()
    );
  }

  await Promise.all(tasks);

  let hostname = host.hostname;
  if (!hostname) {
    const resolved = await resolveHostname(host.ip);
    if (resolved) hostname = resolved;
  }

  const vendorInfo = host.mac ? lookupVendor(host.mac) : null;
  const sysDescrVendor = inferVendor(snmpSysDescr);
  const vendor = vendorInfo?.vendor || sysDescrVendor;

  const { type, typeConfidence } = inferType(ports, snmpSysDescr, vendorInfo?.type);

  const profile: DeviceProfile = {
    ip: host.ip,
    mac: host.mac,
    hostname,
    vendor,
    vendorConfidence: vendorInfo ? 0.85 : sysDescrVendor ? 0.8 : undefined,
    os: guessOs(snmpSysDescr),
    type,
    typeConfidence,
    software,
    openPorts: ports,
    snmpCommunity,
    snmpSysDescr: snmpSysDescr || undefined,
    snmpSysObjectID: snmpSysObjectID || undefined,
    lastSeen: new Date().toISOString(),
  };

  const findings = detectVulnerabilities(profile);
  const riskScore = computeRiskScore(profile, findings);
  const riskLabel = computeRiskLabel(riskScore);

  return { profile, findings, riskScore, riskLabel };
}

export async function profileHosts(
  hosts: Array<{ ip: string; mac?: string; hostname?: string; ports?: number[] }>,
  options: ProfilerOptions = {}
): Promise<ProfiledHost[]> {
  return Promise.all(hosts.map((host) => profileHost(host, options)));
}