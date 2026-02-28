export interface CustomScriptResult {
  name: string;
  value: number | null;
  output: string;
  error: string | null;
  timestamp: string;
}

export async function runCustomScript(
  command: string,
  timeout: number = 30
): Promise<CustomScriptResult> {
  try {
    const proc = Bun.spawn(command.split(" "), {
      shell: true,
      timeout: timeout * 1000,
    });
    
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    
    const exitCode = await proc.exited;
    
    if (exitCode !== 0) {
      return {
        name: "",
        value: null,
        output: stdout,
        error: stderr || `Exit code: ${exitCode}`,
        timestamp: new Date().toISOString(),
      };
    }
    
    const value = parseOutput(stdout);
    
    return {
      name: "",
      value,
      output: stdout.trim(),
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    return {
      name: "",
      value: null,
      output: "",
      error: (e as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseOutput(output: string): number | null {
  const trimmed = output.trim();
  
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "number") return parsed;
    if (typeof parsed === "object" && parsed !== null) {
      const value = parsed.value ?? parsed.metric ?? parsed.count ?? parsed.total;
      if (typeof value === "number") return value;
    }
    return null;
  } catch {
    const num = parseFloat(trimmed);
    if (!isNaN(num) && isFinite(num)) return num;
    return null;
  }
}

export async function runCustomScripts(
  scripts: Array<{
    name: string;
    command: string;
    timeout: number;
    enabled?: boolean;
  }>
): Promise<Record<string, CustomScriptResult>> {
  const results: Record<string, CustomScriptResult> = {};
  
  const enabledScripts = scripts.filter(s => s.enabled !== false);
  
  const promises = enabledScripts.map(async (script) => {
    const result = await runCustomScript(script.command, script.timeout);
    results[script.name] = {
      ...result,
      name: script.name,
    };
  });
  
  await Promise.all(promises);
  
  return results;
}
