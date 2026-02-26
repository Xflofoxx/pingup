export interface VPNInfo {
  active: boolean;
  name: string | null;
  type: string | null;
  ip: string | null;
  server: string | null;
}

const VPN_KEYWORDS = [
  "vpn", "tun", "tap", "wireguard", "openvpn", "nordvpn", "expressvpn",
  "cyberghost", "ipsec", "ikev2", "l2tp", "pptp", "softether",
  "protonvpn", "mullvad", " Windscribe", "tunnelbear", "hotspotshield"
];

export function detectVPN(): VPNInfo {
  try {
    const proc = Bun.spawn(["powershell", "-Command",
      "Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription, MacAddress | ConvertTo-Json"
    ]);
    
    const output = new Response(proc.stdout).text();
    const adapters = JSON.parse(output);
    
    const adapterList = Array.isArray(adapters) ? adapters : [adapters];
    
    for (const adapter of adapterList) {
      if (!adapter || !adapter.Name) continue;
      
      const name = adapter.Name.toLowerCase();
      const desc = (adapter.InterfaceDescription || "").toLowerCase();
      
      for (const keyword of VPN_KEYWORDS) {
        if (name.includes(keyword) || desc.includes(keyword)) {
          const vpnIP = getAdapterIP(adapter.Name);
          const vpnServer = getVPNServer(adapter.Name);
          
          return {
            active: true,
            name: adapter.Name,
            type: detectVPNType(desc),
            ip: vpnIP,
            server: vpnServer,
          };
        }
      }
    }
    
    return { active: false, name: null, type: null, ip: null, server: null };
  } catch {
    return { active: false, name: null, type: null, ip: null, server: null };
  }
}

function getAdapterIP(adapterName: string): string | null {
  try {
    const proc = Bun.spawn(["powershell", "-Command",
      `Get-NetIPAddress -InterfaceAlias "${adapterName}" -AddressFamily IPv4 | Select-Object -First 1 -ExpandProperty IPAddress`
    ]);
    const ip = new Response(proc.stdout).text().trim();
    return ip || null;
  } catch {
    return null;
  }
}

function getVPNServer(adapterName: string): string | null {
  try {
    const proc = Bun.spawn(["powershell", "-Command",
      `Get-NetTCPConnection -InterfaceAlias "${adapterName}" -State Established | Select-Object -First 1 -ExpandProperty RemoteAddress`
    ]);
    const server = new Response(proc.stdout).text().trim();
    return server || null;
  } catch {
    return null;
  }
}

function detectVPNType(desc: string): string {
  if (desc.includes("wireguard")) return "WireGuard";
  if (desc.includes("openvpn")) return "OpenVPN";
  if (desc.includes("nordvpn")) return "NordVPN";
  if (desc.includes("expressvpn")) return "ExpressVPN";
  if (desc.includes("ikev2")) return "IKEv2";
  if (desc.includes("l2tp")) return "L2TP/IPSec";
  if (desc.includes("pptp")) return "PPTP";
  if (desc.includes("cisco")) return "Cisco VPN";
  if (desc.includes("tun") || desc.includes("tap")) return "TUN/TAP";
  return "VPN";
}
