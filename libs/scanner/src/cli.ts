#!/usr/bin/env bun
import { scanNetwork, parseTargets } from "./index.ts";

interface CliArgs {
  targets: string[];
  ports?: number[];
  concurrency?: number;
  timeout?: number;
  json?: boolean;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    targets: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "-p" && args[i + 1]) {
      result.ports = args[++i].split(",").map(Number);
    } else if (arg === "-c" && args[i + 1]) {
      result.concurrency = parseInt(args[++i], 10);
    } else if (arg === "-t" && args[i + 1]) {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === "--json") {
      result.json = true;
    } else if (!arg.startsWith("-")) {
      result.targets.push(arg);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
pingup-scan - Network Scanner

Usage: pingup-scan <target> [options]

Arguments:
  target              IP address, CIDR range (e.g., 192.168.1.0/24), or range (e.g., 192.168.1.1-10)

Options:
  -p <ports>          Comma-separated ports to scan (default: 22,80,443,3389,8080)
  -c <num>            Concurrent connections (default: 50)
  -t <timeout>        Timeout per host in ms (default: 1000)
  --json              Output results in JSON format
  -h, --help          Show this help message

Examples:
  pingup-scan 192.168.1.0/24
  pingup-scan 192.168.1.1-10 -p 22,80,443 --json
  pingup-scan 10.0.0.1 -c 100 -t 500
`);
}

async function main() {
  const args = parseArgs();

  if (args.help || args.targets.length === 0) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  try {
    const ips = parseTargets(args.targets);
    let lastProgress = 0;
    
    const result = await scanNetwork(
      args.targets,
      {
        ports: args.ports,
        concurrency: args.concurrency || 50,
        timeout: args.timeout || 1000,
      },
      args.json ? undefined : (current, total) => {
        if (current !== lastProgress) {
          const pct = Math.round((current / total) * 100);
          process.stdout.write(`\rScanning: ${current}/${total} (${pct}%)`);
          lastProgress = current;
        }
      }
    );

    if (!args.json) {
      console.log(`\n\nScan complete: ${result.hosts.length} hosts online in ${result.duration}ms\n`);
      
      for (const host of result.hosts) {
        console.log(`${host.ip} - ${host.latency ? `lat=${host.latency}ms` : "online"}`);
        
        if (host.ports) {
          const openPorts = host.ports.filter(p => p.status === "open");
          if (openPorts.length > 0) {
            console.log(`  Ports: ${openPorts.map(p => `${p.port}${p.service ? `(${p.service})` : ""}`).join(", ")}`);
          }
        }
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    if (args.json) {
      console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

main();
