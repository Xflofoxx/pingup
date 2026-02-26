export interface BatteryInfo {
  charging: boolean;
  charge_percent: number;
  time_remaining: number | null;
  voltage: number | null;
  health: string;
  cycles: number | null;
  ac_connected: boolean;
  present: boolean;
}

export function collectBattery(): BatteryInfo | null {
  try {
    const proc = Bun.spawn(["powershell", "-Command", 
      "Get-CimInstance -ClassName Win32_Battery | Select-Object BatteryStatus, EstimatedChargeRemaining, EstimatedRunTime, DesignVoltage, BatteryHealthStatus, CycleCount | ConvertTo-Json"
    ]);
    
    const output = new Response(proc.stdout).text();
    const parsed = JSON.parse(output);
    
    if (!parsed || Object.keys(parsed).length === 0) {
      return null;
    }
    
    return {
      charging: parsed.BatteryStatus === 2 || parsed.BatteryStatus === 6,
      charge_percent: parsed.EstimatedChargeRemaining || 0,
      time_remaining: parsed.EstimatedRunTime === 71582788 ? null : parsed.EstimatedRunTime || null,
      voltage: parsed.DesignVoltage ? parsed.DesignVoltage / 1000 : null,
      health: parsed.BatteryHealthStatus === 1 ? "Good" : "Degraded",
      cycles: parsed.CycleCount || null,
      ac_connected: parsed.BatteryStatus === 2 || parsed.BatteryStatus === 6 || parsed.BatteryStatus === 7,
      present: true,
    };
  } catch {
    return null;
  }
}

export function collectBatteryBasic(): { charge_percent: number; charging: boolean; present: boolean } {
  try {
    const proc = Bun.spawn(["powershell", "-Command", 
      "Get-CimInstance -ClassName Win32_Battery | Select-Object BatteryStatus, EstimatedChargeRemaining | ConvertTo-Json"
    ]);
    
    const output = new Response(proc.stdout).text();
    const parsed = JSON.parse(output);
    
    if (!parsed || Object.keys(parsed).length === 0) {
      return { charge_percent: 0, charging: false, present: false };
    }
    
    return {
      present: true,
      charge_percent: parsed.EstimatedChargeRemaining || 0,
      charging: parsed.BatteryStatus === 2 || parsed.BatteryStatus === 6,
    };
  } catch {
    return { charge_percent: 0, charging: false, present: false };
  }
}
