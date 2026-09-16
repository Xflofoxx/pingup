import { spawn } from "bun";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TASKS = [
  { name: "server", cwd: `${ROOT}/server`, script: "src/index.ts" },
  { name: "agent", cwd: `${ROOT}/agent`, script: "src/index.ts" },
];

interface Child {
  name: string;
  child: ReturnType<typeof spawn>;
}

const children: Child[] = [];
let shuttingDown = false;

function start({ name, cwd, script }: (typeof TASKS)[number]) {
  const child = spawn({
    cmd: ["bun", "run", "--watch", script],
    cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });

  children.push({ name, child });

  const log = (text: string) => {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) console.log(`[${name}] ${trimmed}`);
    }
  };

  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    (async () => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        log(decoder.decode(value, { stream: true }));
      }
      const rest = decoder.decode();
      if (rest) log(rest);
    })();
  }

  child.exited.then((code) => {
    console.error(`[${name}] exit code: ${code}`);
    shutdown(code ?? 1);
  });
}

function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    try {
      child.kill();
    } catch {
      /* already terminated */
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Pingup DEV mode (no Docker)");
console.log("  server: http://localhost:3000  agent: http://localhost:8080");
console.log("Press Ctrl+C to stop.");

for (const task of TASKS) start(task);