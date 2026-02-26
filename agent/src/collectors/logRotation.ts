import { readdirSync, statSync, existsSync, mkdirSync, renameSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";

export interface LogConfig {
  file: string;
  max_size: number;
  max_files: number;
  compress: boolean;
  level: "debug" | "info" | "warn" | "error";
}

const DEFAULT_CONFIG: LogConfig = {
  file: "./logs/agent.log",
  max_size: 10 * 1024 * 1024,
  max_files: 5,
  compress: true,
  level: "info",
};

let currentConfig: LogConfig = DEFAULT_CONFIG;

export function configureLogRotation(config: Partial<LogConfig>): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
  
  const logDir = dirname(currentConfig.file);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

export function shouldRotate(logFile: string): boolean {
  if (!existsSync(logFile)) return false;
  
  try {
    const stats = statSync(logFile);
    return stats.size >= currentConfig.max_size;
  } catch {
    return false;
  }
}

export function rotateLogs(): void {
  const logFile = currentConfig.file;
  const logDir = dirname(logFile);
  
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
    return;
  }
  
  if (!existsSync(logFile)) return;
  
  for (let i = currentConfig.max_files - 1; i >= 1; i--) {
    const oldFile = `${logFile}.${i}`;
    const newFile = `${logFile}.${i + 1}`;
    
    if (existsSync(newFile)) {
      if (currentConfig.compress && !newFile.endsWith(".gz")) {
        compressLog(oldFile);
      }
      unlinkSync(newFile);
    }
    
    if (existsSync(oldFile)) {
      renameSync(oldFile, newFile);
    }
  }
  
  const rotatedFile = `${logFile}.1`;
  if (existsSync(logFile)) {
    renameSync(logFile, rotatedFile);
    
    if (currentConfig.compress) {
      compressLog(rotatedFile);
    }
  }
  
  cleanupOldLogs();
}

function compressLog(file: string): void {
  try {
    const gzip = Bun.gzipSync(readFileSync(file));
    writeFileSync(`${file}.gz`, gzip);
    unlinkSync(file);
  } catch {
  }
}

function cleanupOldLogs(): void {
  const logFile = currentConfig.file;
  const logDir = dirname(logFile);
  
  if (!existsSync(logDir)) return;
  
  try {
    const files = readdirSync(logDir)
      .filter(f => f.startsWith(join(logDir, "agent.log")))
      .map(f => ({
        name: f,
        path: join(logDir, f),
        time: statSync(join(logDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > currentConfig.max_files) {
      for (let i = currentConfig.max_files; i < files.length; i++) {
        try {
          unlinkSync(files[i].path);
        } catch {
        }
      }
    }
  } catch {
  }
}

export function getLogFiles(): { name: string; size: number; modified: Date }[] {
  const logFile = currentConfig.file;
  const logDir = dirname(logFile);
  
  if (!existsSync(logDir)) return [];
  
  try {
    return readdirSync(logDir)
      .filter(f => f.startsWith("agent.log"))
      .map(f => {
        const path = join(logDir, f);
        const stats = statSync(path);
        return {
          name: f,
          size: stats.size,
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch {
    return [];
  }
}

export function getLogContent(lines: number = 100): string {
  const logFile = currentConfig.file;
  
  if (!existsSync(logFile)) {
    return "No logs found";
  }
  
  try {
    const content = readFileSync(logFile, "utf-8");
    const allLines = content.split("\n");
    return allLines.slice(-lines).join("\n");
  } catch {
    return "Error reading logs";
  }
}

export function setLogLevel(level: "debug" | "info" | "warn" | "error"): void {
  currentConfig.level = level;
}

export function getLogLevel(): string {
  return currentConfig.level;
}
