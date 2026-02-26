import { getDb } from "../db/sqlite.ts";

export interface NetworkNode {
  id: string;
  label: string;
  type: "agent" | "router" | "switch" | "server" | "workstation" | "iot" | "unknown";
  ip: string;
  mac: string;
  vendor: string;
  agent_id?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  type: "wired" | "wireless" | "vlan";
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export function getNetworkTopology(agentId?: string): NetworkTopology {
  const db = getDb();
  
  const agents = db.prepare(`
    SELECT id, name, status, last_seen, metadata FROM agents
    ${agentId ? "WHERE id = ?" : ""}
  `).all(agentId) as any[];
  
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  
  for (const agent of agents) {
    const metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
    
    nodes.push({
      id: agent.id,
      label: agent.name || agent.id,
      type: detectNodeType(agent.id, metadata),
      ip: metadata.ip || "unknown",
      mac: metadata.mac || "unknown",
      vendor: metadata.vendor || "Unknown",
      agent_id: agent.id,
    });
  }
  
  const discoveryData = db.prepare(`
    SELECT DISTINCT host_ip, ports, latency FROM discovery
    WHERE agent_id = ?
    ORDER BY scan_timestamp DESC
    LIMIT 100
  `).all(agentId || "%") as any[];
  
  for (const device of discoveryData) {
    if (!nodes.find(n => n.ip === device.host_ip)) {
      nodes.push({
        id: `disc_${device.host_ip}`,
        label: device.host_ip,
        type: "unknown",
        ip: device.host_ip,
        mac: "unknown",
        vendor: "Unknown",
      });
    }
  }
  
  for (const node of nodes) {
    if (node.type === "router" || node.type === "switch") {
      for (const target of nodes) {
        if (target.id !== node.id) {
          links.push({
            source: node.id,
            target: target.id,
            type: "wired",
          });
        }
      }
    }
  }
  
  return { nodes, links };
}

function detectNodeType(agentId: string, metadata: any): NetworkNode["type"] {
  const idLower = agentId.toLowerCase();
  
  if (idLower.includes("router") || idLower.includes("gateway")) return "router";
  if (idLower.includes("switch")) return "switch";
  if (idLower.includes("server")) return "server";
  if (idLower.includes("workstation") || idLower.includes("desktop") || idLower.includes("laptop")) return "workstation";
  if (idLower.includes("iot") || idLower.includes("sensor") || idLower.includes("camera")) return "iot";
  if (idLower.startsWith("agent-")) return "agent";
  
  if (metadata.device_type) return metadata.device_type as NetworkNode["type"];
  
  return "unknown";
}

export function getDeviceDetails(ip: string): any {
  const db = getDb();
  
  const discovery = db.prepare(`
    SELECT * FROM discovery
    WHERE host_ip = ?
    ORDER BY scan_timestamp DESC
    LIMIT 1
  `).get(ip) as any;
  
  if (discovery) {
    return {
      ip: discovery.host_ip,
      ports: discovery.ports ? JSON.parse(discovery.ports) : [],
      latency: discovery.latency,
      scan_duration: discovery.scan_duration,
      last_seen: discovery.scan_timestamp,
    };
  }
  
  return null;
}
