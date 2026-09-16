#!/usr/bin/env bun
import { readFileSync } from "fs";
import type { DeviceProfile } from "./types.ts";
import { detectVulnerabilities, summarizeFindings, computeRiskScore, computeRiskLabel } from "./detect.ts";

interface CliArgs {
  profilePath?: string;
  json?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "-i" || arg === "--input") {
      result.profilePath = argv[++i];
    } else if (!arg.startsWith("-")) {
      result.profilePath = arg;
    }
  }
  return result;
}

function printHelp() {
  console.log(`
pingup-vulns - Vulnerability Detection Engine

Usage: pingup-vulns [profile.json] [options]

Arguments:
  profile.json        Path to a JSON DeviceProfile file. If omitted, reads JSON from stdin.

Options:
  --json              Output findings in JSON format
  -h, --help          Show this help message

Example DeviceProfile:
  {
    "ip": "192.168.1.1",
    "vendor": "Cisco",
    "type": "router",
    "openPorts": [23, 80, 443],
    "snmpCommunity": "public",
    "software": [
      { "name": "openssh", "version": "7.2", "protocol": "ssh", "port": 22, "banner": "SSH-2.0-OpenSSH_7.2p1" }
    ]
  }
`);
}

function readProfile(args: CliArgs): DeviceProfile {
  if (args.profilePath) {
    return JSON.parse(readFileSync(args.profilePath, "utf-8")) as DeviceProfile;
  }
  const stdin = readFileSync(0, "utf-8").trim();
  if (!stdin) {
    throw new Error("Nessun profilo fornito: passare un file JSON oppure caricare da stdin");
  }
  return JSON.parse(stdin) as DeviceProfile;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const profile = readProfile(args);
    const findings = detectVulnerabilities(profile);
    const summary = summarizeFindings(findings);
    const riskScore = computeRiskScore(profile, findings);

    if (args.json) {
      console.log(JSON.stringify({
        profile,
        riskScore,
        riskLabel: computeRiskLabel(riskScore),
        summary,
        findings,
      }, null, 2));
      return;
    }

    console.log(`\nDevice: ${profile.ip} (${profile.vendor || "vendor sconosciuto"}, ${profile.type})`);
    console.log(`Risk score: ${riskScore} (${computeRiskLabel(riskScore)})`);
    console.log(`Findings: ${summary.total} (${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low)\n`);

    for (const finding of findings) {
      const tag = finding.cve_id || finding.id;
      console.log(`[${finding.severity.toUpperCase()}] ${tag} - ${finding.title}`);
      if (finding.port) console.log(`    Porta: ${finding.port} (${finding.protocol || "?"})`);
      if (finding.affected_product) {
        console.log(`    Prodotto: ${finding.affected_product}${finding.affected_version ? ` ${finding.affected_version}` : ""}`);
      }
      console.log(`    Remediation: ${finding.remediation}`);
    }

    if (findings.length === 0) {
      console.log("Nessuna vulnerabilità rilevata.");
    }
  } catch (error) {
    console.error(`Errore: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();