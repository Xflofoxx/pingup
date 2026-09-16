import type {
  DeviceProfile,
  SoftwareEntry,
  VulnerabilityFinding,
  DetectionConfig,
  Severity,
} from "./types.ts";
import { getCvesForProduct } from "./cves.ts";
import { matchesVersion } from "./version.ts";

const DEFAULT_CONFIG: DetectionConfig = {
  checkHeuristics: true,
  checkCves: true,
};

const PORT_PROTOCOLS: Record<number, string> = {
  23: "telnet",
  21: "ftp",
  445: "smb",
  3389: "rdp",
  3306: "mysql",
  5432: "postgres",
  27017: "mongodb",
  6379: "redis",
  80: "http",
  8080: "http-alt",
  1900: "ssdp",
};

interface HeuristicRule {
  id: string;
  title: string;
  description: string;
  remediation: string;
  severity: Severity;
  cvss?: number;
  cve_id?: string;
  known_exploited?: boolean;
  port?: number;
  match: (profile: DeviceProfile, software: SoftwareEntry[]) => boolean;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    id: "H-EXPOSED-TELNET",
    title: "Servizio Telnet esposto",
    description:
      "Il dispositivo espone il servizio Telnet (porta 23), che trasmette le credenziali in chiaro. Il Telnet è stato sconsigliato da CISA/FBI per l'accesso remoto.",
    remediation: "Sostituire Telnet con SSH ed applicare l'hardening della configurazione.",
    severity: "high",
    cvss: 7.5,
    cve_id: "CVE-1999-0619",
    port: 23,
    match: (p) => p.openPorts.includes(23),
  },
  {
    id: "H-EXPOSED-FTP",
    title: "Servizio FTP in chiaro",
    description:
      "Il dispositivo espone FTP (porta 21) senza cifratura; le credenziali e i dati transitano in chiaro sulla rete.",
    remediation: "Valutare l'uso di SFTP/FTPS e chiudere FTP se non strettamente necessario.",
    severity: "low",
    cvss: 3.7,
    port: 21,
    match: (p) => p.openPorts.includes(21),
  },
  {
    id: "H-SNMP-PUBLIC",
    title: "SNMP con community di default 'public'",
    description:
      "Il dispositivo risponde alle query SNMP v2c con la community default 'public', permettendo a chiunque nella rete di enumerare configurazione e stato.",
    remediation: "Configurare community SNMP complesse, limitare i sorgenti autorizzati ed abilitare SNMPv3.",
    severity: "medium",
    cvss: 5.3,
    cve_id: "CVE-2002-0013",
    match: (p) => p.snmpCommunity === "public",
  },
  {
    id: "H-EXPOSED-RDP",
    title: "RDP esposto (porta 3389)",
    description:
      "Il servizio Remote Desktop è raggiungibile. RDP esposto è un vettore frequente per attacchi ransomware e brute-force.",
    remediation: "Esporre RDP solo tramite VPN o gateway sicuro e abilitare NLA + policy password robuste.",
    severity: "medium",
    cvss: 6.5,
    port: 3389,
    match: (p) => p.openPorts.includes(3389),
  },
  {
    id: "H-EXPOSED-SMB",
    title: "SMB/NetBIOS esposto (porta 445)",
    description:
      "Il dispositivo espone SMB (porta 445). È uno dei principali vettori di sfruttamento (ad es. WannaCry / EternalBlue).",
    remediation: "Disattivare SMBv1, applicare le patch MS17-010 e limitare l'esposizione di SMB alla rete locale.",
    severity: "medium",
    cvss: 6.5,
    cve_id: "CVE-2017-0143",
    known_exploited: true,
    port: 445,
    match: (p) => p.openPorts.includes(445),
  },
  {
    id: "H-EXPOSED-DATABASE",
    title: "Database esposto sulla rete",
    description:
      "Un servizio di database (MySQL 3306, PostgreSQL 5432, MongoDB 27017, Redis 6379) è raggiungibile direttamente.",
    remediation: "Non esporre i database sulla rete; proteggerli dietro firewall, VLAN isolate e autenticazione forte.",
    severity: "high",
    cvss: 8.1,
    port: 6379,
    match: (p) =>
      [3306, 5432, 27017, 6379].some((port) => p.openPorts.includes(port)),
  },
  {
    id: "H-PLAINTEXT-ADMIN",
    title: "Interfaccia di amministrazione in HTTP chiaro",
    description:
      "Il dispositivo espone un'interfaccia web (80/8080) senza TLS, spesso amministrativa. Le credenziali viaggiano in chiaro.",
    remediation: "Abilitare HTTPS/TLS, disabilitare l'accesso admin da interfacce non affidabili e usare credenziali forti.",
    severity: "medium",
    cvss: 5.9,
    port: 80,
    match: (p, software) =>
      p.openPorts.includes(80) ||
      p.openPorts.includes(8080) ||
      software.some((s) => s.protocol === "http" && s.port === 80),
  },
  {
    id: "H-CAMERA-DEFAULT-ADMIN",
    title: "Videocamera IP con credenziali di default",
    description:
      "Una videocamera IP è presente sulla rete. Molte videocamere economiche usano credenziali admin di default note e firmware obsoleti.",
    remediation: "Cambiare immediatamente le credenziali, aggiornare il firmware e isolare le videocamere in una VLAN dedicata.",
    severity: "high",
    cvss: 7.5,
    match: (p) => p.type === "camera",
  },
  {
    id: "H-NAS-EXPOSED",
    title: "NAS esposto con servizi legacy",
    description:
      "Il NAS espone servizi potenzialmente obsoleti (Telnet, FTP o porte di amministrazione web). I NAS sono target frequenti di ransomware.",
    remediation: "Disattivare servizi non necessari, aggiornare il firmware e abilitare l'autenticazione a due fattori dove supportata.",
    severity: "medium",
    cvss: 5.3,
    match: (p) =>
      p.type === "nas" && (p.openPorts.includes(23) || p.openPorts.includes(21)),
  },
  {
    id: "H-UPS-DEFAULT-CREDS",
    title: "UPS con configurazione di rete potenzialmente insicura",
    description:
      "Un gruppo di continuità (UPS) è gestibile via rete. Molti UPS hanno credenziali di default e protocolli legacy abilitati.",
    remediation: "Cambiare le credenziali default, aggiornare il firmware e restringere l'accesso di gestione.",
    severity: "low",
    cvss: 3.1,
    match: (p) => p.type === "ups",
  },
  {
    id: "H-EXPOSED-SSDP-UPNP",
    title: "UPnP/SSDP esposto (porta 1900)",
    description:
      "Il dispositivo risponde alle query SSDP/UPnP. Il protocollo UPnP è stato usato per abusi (CallStranger, DNS rebinding).",
    remediation: "Disabilitare UPnP sui dispositivi non critici e filtrare SSDP a livello di firewall.",
    severity: "high",
    cvss: 7.5,
    cve_id: "CVE-2020-12695",
    known_exploited: true,
    port: 1900,
    match: (p) => p.openPorts.includes(1900),
  },
  {
    id: "H-ROUTER-TELNET",
    title: "Router con Telnet abilitato",
    description:
      "Il router di rete espone Telnet, tipicamente con credenziali di default. L'intera rete può essere compromessa.",
    remediation: "Usare SSH per la gestione, cambiare le credenziali default e limitare l'accesso amministrativo.",
    severity: "high",
    cvss: 7.5,
    port: 23,
    match: (p) => p.type === "router" && p.openPorts.includes(23),
  },
  {
    id: "H-VOIP-DEFAULT-CREDS",
    title: "Telefono VoIP / centralino con servizi di gestione aperti",
    description:
      "Un dispositivo VoIP espone porte di amministrazione. I sistemi VoIP sono bersaglio di frodi e chiamate non autorizzate.",
    remediation: "Restringere l'accesso di gestione, aggiornare il firmware e verificare le regole di instradamento.",
    severity: "medium",
    cvss: 5.3,
    match: (p) => p.type === "voip",
  },
  {
    id: "H-IOT-EXPOSED",
    title: "Dispositivo IoT con servizi esposti",
    description:
      "Un dispositivo IoT espone servizi di rete (web, Telnet, FTP). I dispositivi IoT hanno spesso firmware obsoleto e credenziali deboli.",
    remediation: "Isolare gli IoT in una VLAN separata, aggiornare il firmware e disabilitare i servizi non necessari.",
    severity: "medium",
    cvss: 5.3,
    match: (p) =>
      p.type === "iot" &&
      (p.openPorts.includes(23) || p.openPorts.includes(21) || p.openPorts.includes(8080)),
  },
];

export function detectCveFindings(profile: DeviceProfile): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];

  for (const software of profile.software || []) {
    const cves = getCvesForProduct(software.name);
    if (cves.length === 0) continue;
    if (!software.version) {
      findings.push({
        id: `CVE-UNKNOWN-${software.name}`,
        severity: "info",
        title: `Versione di ${software.name} non rilevabile`,
        description: `Il servizio ${software.name} è presente ma la versione esatta non è stata rilevata. Si consiglia un controllo manuale delle vulnerabilità note.`,
        remediation: "Verificare manualmente la versione del servizio ed applicare le patch disponibili.",
        affected_product: software.name,
        port: software.port,
        protocol: software.protocol,
      });
      continue;
    }

    for (const cve of cves) {
      const matches = cve.affects.some((a) => {
        if (a.product !== software.name) return false;
        if (!a.version && a.operator === "eq") return false;
        return matchesVersion(software.version!, a.operator, a.version);
      });

      if (!matches) continue;

      findings.push({
        id: cve.cve_id,
        cve_id: cve.cve_id,
        severity: cve.severity,
        cvss: cve.cvss,
        title: cve.title,
        description: cve.description,
        remediation: cve.remediation,
        affected_product: software.name,
        affected_version: software.version,
        port: software.port,
        protocol: software.protocol,
        known_exploited: cve.known_exploited,
      });
    }
  }

  return findings;
}

export function detectHeuristicFindings(profile: DeviceProfile): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];

  for (const rule of HEURISTIC_RULES) {
    if (!rule.match(profile, profile.software || [])) continue;

    findings.push({
      id: rule.id,
      cve_id: rule.cve_id,
      severity: rule.severity,
      cvss: rule.cvss,
      title: rule.title,
      description: rule.description,
      remediation: rule.remediation,
      port: rule.port,
      protocol: rule.port ? PORT_PROTOCOLS[rule.port] : undefined,
      known_exploited: rule.known_exploited,
    });
  }

  return findings;
}

function dedupeFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  const seen = new Map<string, VulnerabilityFinding>();
  for (const finding of findings) {
    const key = finding.id;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, finding);
      continue;
    }
    if (!existing.port && finding.port) {
      seen.set(key, { ...existing, port: finding.port, protocol: finding.protocol });
    }
  }
  return Array.from(seen.values());
}

export function detectVulnerabilities(
  profile: DeviceProfile,
  config: Partial<DetectionConfig> = {}
): VulnerabilityFinding[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const findings: VulnerabilityFinding[] = [];

  if (cfg.checkCves) {
    findings.push(...detectCveFindings(profile));
  }
  if (cfg.checkHeuristics) {
    findings.push(...detectHeuristicFindings(profile));
  }

  return dedupeFindings(findings);
}

export function computeRiskScore(profile: DeviceProfile, findings: VulnerabilityFinding[]): number {
  const severityWeights: Record<Severity, number> = {
    critical: 10,
    high: 7,
    medium: 5,
    low: 2,
    info: 0,
  };

  let score = 0;
  for (const finding of findings) {
    score += severityWeights[finding.severity] || 0;
  }

  score = Math.min(100, Math.round(score * 10));

  const typeWeight: Partial<Record<string, number>> = {
    server: 1.05,
    router: 1.1,
    firewall: 1.1,
    nas: 1.08,
    camera: 1.05,
    voip: 1.05,
  };

  const weight = typeWeight[profile.type] || 1.0;
  score = Math.min(100, Math.round(score * weight));

  return score;
}

export function computeRiskLabel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  if (score >= 10) return "low";
  return "clean";
}

export function summarizeFindings(findings: VulnerabilityFinding[]): {
  total: number;
  bySeverity: Record<Severity, number>;
  critical: number;
  high: number;
  medium: number;
  low: number;
  maxCvss: number;
} {
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
  }

  const maxCvss = findings.reduce((max, f) => Math.max(max, f.cvss || 0), 0);

  return {
    total: findings.length,
    bySeverity,
    critical: bySeverity.critical,
    high: bySeverity.high,
    medium: bySeverity.medium,
    low: bySeverity.low,
    maxCvss,
  };
}

export { PORT_PROTOCOLS };