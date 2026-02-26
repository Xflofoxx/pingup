import { installService, uninstallService, startService, stopService, getServiceStatus } from "../collectors/windowsService.ts";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "install": {
    const config = {
      install: true,
      auto_start: true,
      recovery: { on_failure: "restart" as const, reset_period: 86400 },
    };
    const result = installService("", config);
    console.log(result ? "Service installed successfully" : "Failed to install service");
    break;
  }
  case "uninstall": {
    const result = uninstallService();
    console.log(result ? "Service uninstalled successfully" : "Failed to uninstall service");
    break;
  }
  case "start": {
    const result = startService();
    console.log(result ? "Service started" : "Failed to start service");
    break;
  }
  case "stop": {
    const result = stopService();
    console.log(result ? "Service stopped" : "Failed to stop service");
    break;
  }
  case "status": {
    const status = getServiceStatus();
    console.log(JSON.stringify(status, null, 2));
    break;
  }
  default:
    console.log("Usage: pingup agent <install|uninstall|start|stop|status>");
    break;
}
