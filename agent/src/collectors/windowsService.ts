import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface ServiceConfig {
  install: boolean;
  auto_start: boolean;
  recovery: {
    on_failure: "restart" | "reboot" | "none";
    reset_period: number;
  };
}

const SERVICE_NAME = "PingupAgent";

export function installService(exePath: string, config: ServiceConfig): boolean {
  try {
    const binPath = exePath || process.execPath;
    
    const script = `
      $ErrorActionPreference = 'Stop'
      
      # Check if service exists
      $service = Get-Service -Name '${SERVICE_NAME}' -ErrorAction SilentlyContinue
      
      if ($service) {
        Write-Host 'Service already exists, removing...'
        Stop-Service -Name '${SERVICE_NAME}' -Force -ErrorAction SilentlyContinue
        sc.exe delete '${SERVICE_NAME}'
        Start-Sleep -Seconds 2
      }
      
      # Create service
      New-Service -Name '${SERVICE_NAME}' -BinaryPathName '${binPath} ${join(process.cwd(), 'config.yaml')}' -DisplayName 'Pingup Agent' -Description 'Network monitoring agent' -StartupType ${config.auto_start ? 'Automatic' : 'Manual'}
      
      # Set recovery options
      sc.exe failure '${SERVICE_NAME}' reset= ${config.recovery.reset_period} actions= ${config.recovery.on_failure === 'restart' ? 'restart/60000' : config.recovery.on_failure === 'reboot' ? 'reboot/60000' : 'none'}/60000
      
      Write-Host 'Service installed successfully'
    `;
    
    execSync(`powershell -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: "pipe" });
    return true;
  } catch (e) {
    console.error("Failed to install service:", e);
    return false;
  }
}

export function uninstallService(): boolean {
  try {
    const script = `
      $ErrorActionPreference = 'Stop'
      $service = Get-Service -Name '${SERVICE_NAME}' -ErrorAction SilentlyContinue
      if ($service) {
        Stop-Service -Name '${SERVICE_NAME}' -Force -ErrorAction SilentlyContinue
        sc.exe delete '${SERVICE_NAME}'
        Write-Host 'Service uninstalled successfully'
      } else {
        Write-Host 'Service not found'
      }
    `;
    
    execSync(`powershell -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: "pipe" });
    return true;
  } catch (e) {
    console.error("Failed to uninstall service:", e);
    return false;
  }
}

export function startService(): boolean {
  try {
    execSync(`powershell -Command "Start-Service -Name '${SERVICE_NAME}'"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function stopService(): boolean {
  try {
    execSync(`powershell -Command "Stop-Service -Name '${SERVICE_NAME}' -Force"`, { stdio: "pipe" });
    return true;
  } catch;
  }
}

export function getServiceStatus(): { installed: boolean; running: boolean; status: string } {
    return falseStatus(): { installed: boolean; running: boolean; status: string } {
  try {
    const output = execSync(`powershell -Command "Get-Service -Name '${SERVICE_NAME}' | Select-Object Status | ConvertTo-Json"`, { stdio: "pipe" }).toString();
    const parsed = JSON.parse(output);
    return {
      installed: true,
      running: parsed.Status === "Running",
      status: parsed.Status,
    };
  } catch {
    return {
      installed: false,
      running: false,
      status: "Not Installed",
    };
  }
}

export function checkServiceInstalled(): boolean {
  try {
    execSync(`powershell -Command "Get-Service -Name '${SERVICE_NAME}'"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
