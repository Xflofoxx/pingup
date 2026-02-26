import { execSync } from "child_process";
import { createSocket } from "dgram";

export interface WOLResult {
  success: boolean;
  mac: string;
  message: string;
}

export async function wakeOnLAN(macAddress: string, broadcast: string = "255.255.255.255", port: number = 9): Promise<WOLResult> {
  const macClean = macAddress.replace(/[:-]/g, "").toUpperCase();
  
  if (macClean.length !== 12 || !/^[0-9A-F]{12}$/.test(macClean)) {
    return { success: false, mac: macAddress, message: "Invalid MAC address format" };
  }
  
  const macBuffer = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) {
    macBuffer[i] = parseInt(macClean.substr(i * 2, 2), 16);
  }
  
  const magicPacket = Buffer.alloc(108);
  for (let i = 0; i < 16; i++) {
    macBuffer.copy(magicPacket, i * 6);
  }
  
  try {
    return new Promise((resolve) => {
      const socket = createSocket({ type: "udp4", reuseAddr: true });
      
      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(magicPacket, 0, magicPacket.length, port, broadcast, (err) => {
          socket.close();
          if (err) {
            resolve({ success: false, mac: macAddress, message: err.message });
          } else {
            resolve({ success: true, mac: macAddress, message: "Magic packet sent" });
          }
        });
      });
    });
  } catch (error) {
    return { success: false, mac: macAddress, message: `Error: ${error}` };
  }
}

export function parseWolPackage(data: Buffer): { mac: string; valid: boolean } {
  if (data.length < 108) {
    return { mac: "", valid: false };
  }
  
  const syncStream = data.slice(0, 6);
  for (const b of syncStream) {
    if (b !== 0xFF) {
      return { mac: "", valid: false };
    }
  }
  
  const macBytes = data.slice(6, 12);
  const mac = Array.from(macBytes)
    .map(b => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(":");
  
  for (let i = 12; i < data.length; i += 6) {
    const chunk = data.slice(i, i + 6);
    for (let j = 0; j < 6; j++) {
      if (chunk[j] !== macBytes[j]) {
        return { mac: "", valid: false };
      }
    }
  }
  
  return { mac, valid: true };
}
