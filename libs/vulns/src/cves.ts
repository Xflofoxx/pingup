import type { CveEntry } from "./types.ts";

export const CVE_DATABASE: CveEntry[] = [
  {
    cve_id: "CVE-2016-0777",
    cvss: 3.3,
    severity: "low",
    title: "OpenSSH client agent forwarding information leak",
    description:
      "The agent forward helper in the SSH client of OpenSSH before 7.2p1 exposes authentication agent data, an attacker on the server can read private key material.",
    remediation: "Aggiornare OpenSSH ad una versione >= 7.2p1.",
    affects: [{ product: "openssh", operator: "lt", version: "7.2" }],
  },
  {
    cve_id: "CVE-2018-15473",
    cvss: 5.9,
    severity: "medium",
    title: "OpenSSH username enumeration",
    description:
      "OpenSSH through 7.7 is prone to a user enumeration vulnerability due to not delaying bailout for an invalid authenticating user until the packet containing the request has been fully parsed.",
    remediation: "Aggiornare OpenSSH ad una versione >= 7.7p1.",
    known_exploited: true,
    affects: [{ product: "openssh", operator: "lt", version: "7.7" }],
  },
  {
    cve_id: "CVE-2023-48795",
    cvss: 5.9,
    severity: "medium",
    title: "OpenSSH Terrapin prefix truncation attack",
    description:
      "The SSH transport protocol with certain OpenSSH versions before 9.6p1 is vulnerable to a prefix truncation attack (Terrapin) that can downgrade connection security.",
    remediation: "Aggiornare OpenSSH ad una versione >= 9.6p1 ed abilitare la negoziazione delle estensioni.",
    affects: [
      { product: "openssh", operator: "lt", version: "9.6" },
      { product: "dropbear", operator: "lt", version: "2022.83" },
    ],
  },
  {
    cve_id: "CVE-2021-41773",
    cvss: 9.8,
    severity: "critical",
    title: "Apache HTTP Server path traversal and RCE",
    description:
      "Path traversal and file disclosure vulnerability in Apache HTTP Server 2.4.49 that allows attackers to map URLs to files outside the intended directories; combined with CGI mode can lead to remote code execution.",
    remediation: "Aggiornare ad Apache httpd >= 2.4.50 con il fix per l'accesso esterno ai file.",
    known_exploited: true,
    affects: [
      { product: "apache", operator: "eq", version: "2.4.49" },
      { product: "apache-httpd", operator: "eq", version: "2.4.49" },
    ],
  },
  {
    cve_id: "CVE-2021-44790",
    cvss: 9.8,
    severity: "critical",
    title: "Apache HTTP Server buffer overflow",
    description:
      "A single byte out-of-bounds write in the Apache httpd project 2.4.35 through 2.4.52 on poorly configured servers can lead to remote code execution.",
    remediation: "Aggiornare ad Apache httpd >= 2.4.53.",
    affects: [
      { product: "apache", operator: "lte", version: "2.4.52" },
      { product: "apache-httpd", operator: "lte", version: "2.4.52" },
    ],
  },
  {
    cve_id: "CVE-2022-41741",
    cvss: 7.0,
    severity: "high",
    title: "nginx MP4 module memory disclosure",
    description:
      "An out-of-bounds read in the ngx_http_mp4_module of nginx before 1.23.2 when processing specially crafted mp4 files can disclose memory contents.",
    remediation: "Aggiornare nginx ad una versione >= 1.23.2.",
    affects: [{ product: "nginx", operator: "lt", version: "1.23.2" }],
  },
  {
    cve_id: "CVE-2021-23017",
    cvss: 7.7,
    severity: "high",
    title: "nginx DNS resolver off-by-one heap write",
    description:
      "Off-by-one heap write in the resolver of nginx before 1.20.0/1.21.0 allows attackers to cause memory corruption via crafted DNS responses.",
    remediation: "Aggiornare nginx ad una versione >= 1.20.0 (o >= 1.21.0 per la branch stabile).",
    known_exploited: true,
    affects: [
      { product: "nginx", operator: "lt", version: "1.20.0" },
    ],
  },
  {
    cve_id: "CVE-2015-3306",
    cvss: 10.0,
    severity: "critical",
    title: "ProFTPD copy_file arbitrary file write",
    description:
      "An arbitrary file copy vulnerability in ProFTPD 1.3.5 allows remote attackers to copy and execute arbitrary files via the mod_copy module.",
    remediation: "Aggiornare ProFTPD ad una versione >= 1.3.5b oppure disabilitare mod_copy.",
    known_exploited: true,
    affects: [{ product: "proftpd", operator: "eq", version: "1.3.5" }],
  },
  {
    cve_id: "CVE-2011-2523",
    cvss: 10.0,
    severity: "critical",
    title: "vsftpd 2.3.4 backdoor",
    description:
      "The vsftpd 2.3.4 FTP server contains a backdoor that allows remote attackers to obtain a shell when a username ending with \":)\" is passed.",
    remediation: "Aggiornare vsftpd ad una versione >= 2.3.5, sostituendo qualsiasi binario datato.",
    known_exploited: true,
    affects: [{ product: "vsftpd", operator: "eq", version: "2.3.4" }],
  },
  {
    cve_id: "CVE-2018-15599",
    cvss: 6.1,
    severity: "medium",
    title: "Dropbear SSH command injection",
    description:
      "Dropbear SSH before 2018.76 permits a malicious server to trick the client into running arbitrary commands via crafted padding.",
    remediation: "Aggiornare Dropbear ad una versione >= 2020.79.",
    affects: [{ product: "dropbear", operator: "lt", version: "2020.79" }],
  },
  {
    cve_id: "CVE-2017-16943",
    cvss: 9.8,
    severity: "critical",
    title: "Exim UUCP command injection",
    description:
      "Exim before 4.90 allows remote attackers to execute arbitrary code as root via a crafted buffer in the configuration when the UUCP character is used in the receiver's address.",
    remediation: "Aggiornare Exim ad una versione >= 4.90.",
    known_exploited: true,
    affects: [{ product: "exim", operator: "lt", version: "4.90" }],
  },
  {
    cve_id: "CVE-2020-12695",
    cvss: 7.5,
    severity: "high",
    title: "UPnP CallStranger (SSDP)",
    description:
      "UPnP SUBSCRIBE messages over SSDP allow data exfiltration and DDoS attacks (CallStranger). Dispositivi con UPnP esposto sono vulnerabili.",
    remediation: "Disabilitare UPnP sui dispositivi esposti o filtrare SSDP (porta 1900) sul firewall.",
    affects: [],
  },
];

export function getCvesForProduct(name: string): CveEntry[] {
  return CVE_DATABASE.filter((cve) =>
    cve.affects.some((a) => a.product === name.trim().toLowerCase())
  );
}

export function getCveById(cveId: string): CveEntry | undefined {
  return CVE_DATABASE.find((cve) => cve.cve_id.toUpperCase() === cveId.toUpperCase());
}