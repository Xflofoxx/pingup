import { os } from "bun";

export interface NetworkMetrics {
  bytes_sent_mb: number;
  bytes_recv_mb: number;
  packets_sent: number;
  packets_recv: number;
}

let lastNetwork: { rx_bytes: number; tx_bytes: number; rx_packets: number; tx_packets: number } | null = null;

function getWindowsNetworkStats(): { rx_bytes: number; tx_bytes: number; rx_packets: number; tx_packets: number } {
  const proc = Bun.spawn(["netstat", "-e"]);
  return { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
}

function getLinuxNetworkStats(): { rx_bytes: number; tx_bytes: number; rx_packets: number; tx_packets: number } {
  try {
    const proc = Bun.spawn(["cat", "/proc/net/dev"]);
    const output = new Response(proc.stdout).text();
    
    let totalRx = 0;
    let totalTx = 0;
    let totalRxPackets = 0;
    let totalTxPackets = 0;
    
    const lines = output.split("\n").slice(2);
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 10) {
        const iface = parts[0].replace(":", "");
        if (iface && !iface.startsWith("lo")) {
          totalRx += parseInt(parts[1]) || 0;
          totalRxPackets += parseInt(parts[2]) || 0;
          totalTx += parseInt(parts[9]) || 0;
          totalTxPackets += parseInt(parts[10]) || 0;
        }
      }
    }
    
    return { rx_bytes: totalRx, tx_bytes: totalTx, rx_packets: totalRxPackets, tx_packets: totalTxPackets };
  } catch {
    return { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
  }
}

export async function collectNetwork(): Promise<NetworkMetrics> {
  const isWindows = process.platform === "win32";
  const current = isWindows ? getWindowsNetworkStats() : getLinuxNetworkStats();

  if (lastNetwork) {
    const rxDiff = current.rx_bytes - lastNetwork.rx_bytes;
    const txDiff = current.tx_bytes - lastNetwork.tx_bytes;
    const rxPacketsDiff = current.rx_packets - lastNetwork.rx_packets;
    const txPacketsDiff = current.tx_packets - lastNetwork.tx_packets;
    
    lastNetwork = current;
    
    return {
      bytes_sent_mb: Math.round(txDiff / (1024 * 1024) * 100) / 100,
      bytes_recv_mb: Math.round(rxDiff / (1024 * 1024) * 100) / 100,
      packets_sent: Math.max(0, txPacketsDiff),
      packets_recv: Math.max(0, rxPacketsDiff),
    };
  }
  
  lastNetwork = current;
  
  return {
    bytes_sent_mb: 0,
    bytes_recv_mb: 0,
    packets_sent: 0,
    packets_recv: 0,
  };
}
