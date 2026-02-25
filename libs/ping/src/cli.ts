#!/usr/bin/env bun
import { ping, pingStats } from "./index.ts";

interface CliArgs {
  host: string;
  count?: number;
  timeout?: number;
  json?: boolean;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    host: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "-c" && args[i + 1]) {
      result.count = parseInt(args[++i], 10);
    } else if (arg === "-t" && args[i + 1]) {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === "--json") {
      result.json = true;
    } else if (!arg.startsWith("-")) {
      result.host = arg;
    }
  }

  return result;
}

function printHelp() {
  console.log(`
pingup-ping - ICMP Ping Utility

Usage: pingup-ping <host> [options]

Arguments:
  host              Hostname or IP address to ping

Options:
  -c <count>        Number of ping packets (default: 4)
  -t <timeout>      Timeout in milliseconds (default: 2000)
  --json            Output results in JSON format
  -h, --help        Show this help message

Examples:
  pingup-ping 8.8.8.8
  pingup-ping 8.8.8.8 -c 10 --json
  pingup-ping 192.168.1.1 -t 5000
`);
}

async function main() {
  const args = parseArgs();

  if (args.help || !args.host) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  try {
    if (args.count && args.count > 1) {
      const stats = await pingStats({
        host: args.host,
        count: args.count,
        timeout: args.timeout || 2000,
      });

      if (args.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(`\n--- ${stats.host} ping statistics ---`);
        console.log(`${stats.sent} packets transmitted, ${stats.received} received, ${stats.packetLoss}% packet loss`);
        if (stats.received > 0) {
          console.log(`rtt min/avg/max = ${stats.minLatency}/${stats.avgLatency}/${stats.maxLatency} ms`);
        }
      }
    } else {
      const result = await ping(args.host, args.timeout || 2000);

      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.status === "online") {
          console.log(`PING ${result.host}: lat=${result.latency}ms TTL=${result.ttl || "N/A"}`);
        } else {
          console.log(`PING ${result.host}: unreachable (${result.status})`);
          process.exit(1);
        }
      }
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
