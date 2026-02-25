type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private prefix: string;

  constructor(prefix: string = "") {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : "";
    console[level](`${timestamp} ${prefix}${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("error", message, ...args);
  }

  child(prefix: string): Logger {
    return new Logger(prefix ? `${this.prefix}:${prefix}` : this.prefix);
  }
}

export const logger = new Logger("pingup");
