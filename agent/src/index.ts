// Pingup Agent - Main Entry Point
// Version: 1.4.1
// Collects system metrics and reports to server

import { loadConfig, getConfig } from "./config.ts";
import { collectCPU, measureLatency } from "./collectors/cpu.ts";
import { collectRAM } from "./collectors/ram.ts";
import { collectDisk } from "./collectors/disk.ts";
import { collectNetwork } from "./collectors/network.ts";
import { collectTemperature } from "./collectors/temperature.ts";
import { collectBattery } from "./collectors/battery.ts";
import { detectVPN } from "./collectors/vpn.ts";
import { collectContainers } from "./collectors/containers.ts";
import { collectGPU } from "./collectors/gpu.ts";
import { collectWiFi } from "./collectors/wifi.ts";
import { runCustomScripts } from "./collectors/customScripts.ts";
import { HTTPSender, type Command } from "./transport/index.ts";
import { Hono } from "hono";

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function executeCommand(command: Command): Promise<{ success: boolean; message: string }> {
  const { action, params } = command;
  
  console.log(`Executing command: ${action}`, params);
  
  switch (action) {
    case "ping": {
      return { success: true, message: "pong" };
    }
    case "restart_service": {
      const service = params?.service || "unknown";
      console.log(`Restarting service: ${service}`);
      return { success: true, message: `Service ${service} restart triggered` };
    }
    case "update_config": {
      return { success: true, message: "Config update triggered" };
    }
    case "execute": {
      const cmd = params?.command;
      if (cmd) {
        const proc = Bun.spawn(cmd.split(" "));
        const output = await new Response(proc.stdout).text();
        return { success: true, message: output || "Command executed" };
      }
      return { success: false, message: "No command specified" };
    }
    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

async function collectAllMetrics(config: ReturnType<typeof getConfig>): Promise<Record<string, unknown>> {
  const tempUnit = config.temperature_unit || "celsius";
  const metrics: Record<string, unknown> = {};
  
  const tasks: Promise<void>[] = [];
  
  if (config.modules.includes("cpu")) {
    tasks.push((async () => {
      metrics.cpu = collectCPU();
      metrics.cpu = { ...metrics.cpu as object, latency: await measureLatency(config.ping.host, config.ping.timeout) };
    })());
  }
  
  if (config.modules.includes("ram")) {
    tasks.push((async () => {
      metrics.ram = collectRAM();
    })());
  }
  
  if (config.modules.includes("disk")) {
    tasks.push((async () => {
      metrics.disk = await collectDisk();
    })());
  }
  
  if (config.modules.includes("network")) {
    tasks.push((async () => {
      metrics.network = await collectNetwork();
    })());
  }

  if (config.modules.includes("temperature")) {
    tasks.push((async () => {
      metrics.temperature = await collectTemperature(tempUnit);
    })());
  }
  
  if (config.modules.includes("battery")) {
    tasks.push((async () => {
      metrics.battery = collectBattery();
    })());
  }
  
  if (config.modules.includes("vpn")) {
    tasks.push((async () => {
      metrics.vpn = detectVPN();
    })());
  }
  
  if (config.modules.includes("containers")) {
    tasks.push((async () => {
      metrics.containers = await collectContainers();
    })());
  }
  
  if (config.modules.includes("gpu")) {
    tasks.push((async () => {
      metrics.gpu = await collectGPU();
    })());
  }
  
  if (config.modules.includes("wifi")) {
    tasks.push((async () => {
      metrics.wifi = await collectWiFi();
    })());
  }
  
  if (config.custom_scripts && config.custom_scripts.length > 0) {
    tasks.push((async () => {
      metrics.customScripts = await runCustomScripts(config.custom_scripts);
    })());
  }
  
  await Promise.all(tasks);
  
  return metrics;
}

const app = new Hono();

const logs: { timestamp: string; level: string; message: string }[] = [];

function addLog(level: string, message: string) {
  logs.unshift({ timestamp: new Date().toISOString(), level, message });
  if (logs.length > 500) logs.pop();
}

let authToken: string | null = null;
let authorizedUser: { id: string; username: string; role: string } | null = null;

app.get("/status", (c) => {
  return c.json({
    status: "online",
    agent_id: getConfig().agent_id,
    uptime: process.uptime(),
  });
});

app.get("/metrics", async (c) => {
  const config = getConfig();
  const cached = getCachedMetrics(config);
  if (cached) {
    return c.json(cached);
  }
  const metrics = await collectAllMetrics(config);
  setCachedMetrics(metrics);
  return c.json(metrics);
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json();
  const serverUrl = getConfig().server_url;
  const agentId = getConfig().agent_id;
  
  try {
    const res = await fetch(`${serverUrl}/api/v1/agents/${agentId}/access`, {
      method: "GET",
      headers: {
        "Cookie": `auth_token=${body.token}`,
      },
    });
    
    const data = await res.json();
    
    if (data.authorized) {
      authToken = body.token;
      authorizedUser = data.user;
      addLog("info", `User ${data.user.username} logged in from dashboard`);
      return c.json({ success: true, user: data.user });
    }
    
    return c.json({ success: false, error: data.error || "Access denied" }, 403);
  } catch (e) {
    return c.json({ success: false, error: "Server unreachable" }, 500);
  }
});

app.post("/auth/logout", (c) => {
  if (authorizedUser) {
    addLog("info", `User ${authorizedUser.username} logged out`);
  }
  authToken = null;
  authorizedUser = null;
  return c.json({ success: true });
});

app.post("/auth/verify-password", async (c) => {
  const body = await c.req.json();
  const { password } = body;
  const serverUrl = getConfig().server_url;
  const agentId = getConfig().agent_id;
  
  if (!authToken || !authorizedUser) {
    return c.json({ valid: false, error: "Not authenticated" }, 401);
  }
  
  try {
    const res = await fetch(`${serverUrl}/api/v1/agents/${agentId}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    
    const data = await res.json();
    
    if (data.valid) {
      addLog("warn", `Password verified for user ${authorizedUser.username}`);
    }
    
    return c.json(data);
  } catch (e) {
    return c.json({ valid: false, error: "Server error" }, 500);
  }
});

app.get("/logs", (c) => {
  const level = c.req.query("level");
  const search = c.req.query("search")?.toLowerCase();
  const limit = parseInt(c.req.query("limit") || "100");
  
  let filtered = logs;
  
  if (level) {
    filtered = filtered.filter(l => l.level === level);
  }
  
  if (search) {
    filtered = filtered.filter(l => l.message.toLowerCase().includes(search));
  }
  
  return c.json({ logs: filtered.slice(0, limit) });
});

app.get("/dashboard", (c) => {
  const uptime = process.uptime();
  const config = getConfig();
  
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Dashboard - ${config.agent_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; color: #60a5fa; }
    h2 { font-size: 1.2rem; margin: 20px 0 10px; color: #94a3b8; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .metric { background: #334155; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 2rem; font-weight: bold; }
    .metric-label { color: #94a3b8; font-size: 0.875rem; margin-top: 5px; }
    .metric.cpu .metric-value { color: #f87171; }
    .metric.ram .metric-value { color: #fbbf24; }
    .metric.disk .metric-value { color: #34d399; }
    .metric.latency .metric-value { color: #60a5fa; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.875rem; }
    .status.online { background: #166534; color: #86efac; }
    .status.offline { background: #991b1b; color: #fca5a5; }
    .login-form { max-width: 400px; margin: 100px auto; text-align: center; }
    .login-form input { width: 100%; padding: 12px; margin: 10px 0; background: #334155; border: 1px solid #475569; border-radius: 8px; color: white; font-size: 1rem; }
    .login-form button { width: 100%; padding: 12px; background: #3b82f6; border: none; border-radius: 8px; color: white; font-size: 1rem; cursor: pointer; }
    .login-form button:hover { background: #2563eb; }
    .error { color: #f87171; margin: 10px 0; }
    .nav { display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    .nav a { color: #94a3b8; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
    .nav a:hover, .nav a.active { background: #334155; color: #60a5fa; }
    .logs-table { width: 100%; border-collapse: collapse; }
    .logs-table th, .logs-table td { padding: 10px; text-align: left; border-bottom: 1px solid #334155; }
    .logs-table th { color: #94a3b8; font-weight: normal; }
    .logs-table tr:hover { background: #1e293b; }
    .log-level { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
    .log-level.info { background: #1e3a5f; color: #60a5fa; }
    .log-level.warn { background: #451a03; color: #fbbf24; }
    .log-level.error { background: #450a0a; color: #f87171; }
    .search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
    .search-bar input, .search-bar select { padding: 8px 12px; background: #334155; border: 1px solid #475569; border-radius: 6px; color: white; }
    .search-bar button { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-danger { background: #dc2626; color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .hidden { display: none; }
    .user-info { display: flex; align-items: center; gap: 10px; }
    .traceability { font-size: 0.75rem; color: #64748b; margin-top: 20px; }
    .traceability span { margin-right: 15px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container" id="app">
    <div class="login-form" id="loginForm">
      <h1>Agent Dashboard</h1>
      <p style="color: #94a3b8; margin-bottom: 20px;">${config.agent_id}</p>
      <p style="color: #64748b; margin-bottom: 20px;">Effettua l'accesso tramite il server per visualizzare i dati dell'agente</p>
      <div id="loginError" class="error"></div>
    </div>
    
    <div id="dashboard" class="hidden">
      <h1>Agent Dashboard <span class="status online">online</span></h1>
      <div class="user-info">
        <span style="color: #94a3b8;">Utente:</span>
        <span id="username" style="color: #60a5fa;"></span>
        <button class="btn btn-danger" onclick="logout()">Logout</button>
      </div>
      
      <div class="nav">
        <a href="#" class="active" onclick="showSection('metrics')">Metriche</a>
        <a href="#" onclick="showSection('logs')">Log</a>
        <a href="#" onclick="showSection('actions')">Azioni</a>
      </div>
      
      <div id="section-metrics">
        <div class="card">
          <h2>Risorse di Sistema</h2>
          <div class="metric-grid">
            <div class="metric cpu">
              <div class="metric-value" id="cpuValue">-</div>
              <div class="metric-label">CPU %</div>
            </div>
            <div class="metric ram">
              <div class="metric-value" id="ramValue">-</div>
              <div class="metric-label">RAM %</div>
            </div>
            <div class="metric disk">
              <div class="metric-value" id="diskValue">-</div>
              <div class="metric-label">Disk %</div>
            </div>
            <div class="metric latency">
              <div class="metric-value" id="latencyValue">-</div>
              <div class="metric-label">Latency ms</div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <h2>Informazioni Sistema</h2>
          <div class="grid-2">
            <div>
              <p><strong>Agent ID:</strong> ${config.agent_id}</p>
              <p><strong>Uptime:</strong> <span id="uptimeValue">-</span></p>
              <p><strong>Server:</strong> ${config.server_url}</p>
            </div>
            <div>
              <p><strong>Poll Interval:</strong> ${config.poll_interval}s</p>
              <p><strong>Moduli:</strong> ${config.modules.join(", ")}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="section-logs" class="hidden">
        <div class="card">
          <h2>Log Ricercabili</h2>
          <div class="search-bar">
            <input type="text" id="logSearch" placeholder="Cerca nei log...">
            <select id="logLevel">
              <option value="">Tutti i livelli</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <button class="btn btn-primary" onclick="searchLogs()">Cerca</button>
          </div>
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Livello</th>
                <th>Messaggio</th>
              </tr>
            </thead>
            <tbody id="logsBody"></tbody>
          </table>
        </div>
      </div>
      
      <div id="section-actions" class="hidden">
        <div class="card">
          <h2>Azioni Protette</h2>
          <p style="color: #94a3b8; margin-bottom: 15px;">Le azioni sensibili richiedono verifica della password.</p>
          
          <div style="margin-bottom: 20px;">
            <button class="btn btn-danger" id="restartBtn" onclick="showRestartConfirm()">Riavvia Agente</button>
          </div>
          
          <div id="restartConfirm" class="hidden">
            <p style="margin-bottom: 10px;">Conferma il riavvio inserendo la password:</p>
            <input type="password" id="restartPassword" placeholder="Password" style="padding: 8px 12px; background: #334155; border: 1px solid #475569; border-radius: 6px; color: white; margin-right: 10px;">
            <button class="btn btn-danger" onclick="restartAgent()">Conferma Riavvio</button>
            <button class="btn" onclick="cancelRestart()" style="background: #475569;">Annulla</button>
            <div id="restartError" class="error" style="margin-top: 10px;"></div>
          </div>
        </div>
      </div>
      
      <div class="traceability">
        <span>Session ID: <span id="sessionId">-</span></span>
        <span>Token Type: Bearer</span>
        <span>Agent: ${config.agent_id}</span>
      </div>
    </div>
  </div>
  
  <script>
    let currentSection = 'metrics';
    let metricsInterval;
    
    function showSection(section) {
      currentSection = section;
      document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
      event.target.classList.add('active');
      
      document.getElementById('section-metrics').classList.add('hidden');
      document.getElementById('section-logs').classList.add('hidden');
      document.getElementById('section-actions').classList.add('hidden');
      document.getElementById('section-' + section).classList.remove('hidden');
      
      if (section === 'metrics') startMetricsPolling();
      else stopMetricsPolling();
      
      if (section === 'logs') loadLogs();
    }
    
    function startMetricsPolling() {
      loadMetrics();
      metricsInterval = setInterval(loadMetrics, 5000);
    }
    
    function stopMetricsPolling() {
      if (metricsInterval) clearInterval(metricsInterval);
    }
    
    async function loadMetrics() {
      try {
        const res = await fetch('/metrics');
        const data = await res.json();
        
        document.getElementById('cpuValue').textContent = (data.cpu?.cpu_percent || 0).toFixed(1) + '%';
        document.getElementById('ramValue').textContent = (data.ram?.ram_percent || 0).toFixed(1) + '%';
        document.getElementById('diskValue').textContent = (data.disk?.disk_percent || 0).toFixed(1) + '%';
        document.getElementById('latencyValue').textContent = data.cpu?.latency || '-';
        
        const uptime = data.uptime || ${uptime};
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        document.getElementById('uptimeValue').textContent = hours + 'h ' + mins + 'm';
      } catch (e) {
        console.error('Failed to load metrics:', e);
      }
    }
    
    async function loadLogs(search = '', level = '') {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (level) params.append('level', level);
        
        const res = await fetch('/logs?' + params);
        const data = await res.json();
        
        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = data.logs.map(log => \`
          <tr>
            <td>\${new Date(log.timestamp).toLocaleString()}</td>
            <td><span class="log-level \${log.level}">\${log.level}</span></td>
            <td>\${log.message}</td>
          </tr>
        \`).join('');
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }
    
    function searchLogs() {
      const search = document.getElementById('logSearch').value;
      const level = document.getElementById('logLevel').value;
      loadLogs(search, level);
    }
    
    async function login(token) {
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        
        if (data.success) {
          document.getElementById('loginForm').classList.add('hidden');
          document.getElementById('dashboard').classList.remove('hidden');
          document.getElementById('username').textContent = data.user.username;
          document.getElementById('sessionId').textContent = Math.random().toString(36).substring(7);
          startMetricsPolling();
        } else {
          document.getElementById('loginError').textContent = data.error || 'Access denied';
        }
      } catch (e) {
        document.getElementById('loginError').textContent = 'Connection error';
      }
    }
    
    async function logout() {
      await fetch('/auth/logout', { method: 'POST' });
      location.reload();
    }
    
    function showRestartConfirm() {
      document.getElementById('restartConfirm').classList.remove('hidden');
      document.getElementById('restartError').textContent = '';
    }
    
    function cancelRestart() {
      document.getElementById('restartConfirm').classList.add('hidden');
      document.getElementById('restartPassword').value = '';
    }
    
    async function restartAgent() {
      const password = document.getElementById('restartPassword').value;
      const errorEl = document.getElementById('restartError');
      
      try {
        const res = await fetch('/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        
        if (data.valid) {
          alert('Riavvio in corso...');
          window.location.reload();
        } else {
          errorEl.textContent = data.error || 'Password non valida';
        }
      } catch (e) {
        errorEl.textContent = 'Errore di connessione';
      }
    }
    
    // Auto-refresh logs
    setInterval(() => {
      if (currentSection === 'logs') loadLogs(
        document.getElementById('logSearch').value,
        document.getElementById('logLevel').value
      );
    }, 5000);
    
    // Check for token in URL (server redirects here with token)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      login(token);
    }
  </script>
</body>
</html>`;
  
  return c.html(html);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let latestMetrics: Record<string, unknown> = {};

let metricsCache: { data: Record<string, unknown>; timestamp: number } | null = null;
const METRICS_CACHE_TTL = 5000; // 5 seconds cache for dashboard

function getCachedMetrics(_config: ReturnType<typeof getConfig>): Record<string, unknown> {
  const now = Date.now();
  if (metricsCache && now - metricsCache.timestamp < METRICS_CACHE_TTL) {
    return metricsCache.data;
  }
  return null;
}

function setCachedMetrics(_data: Record<string, unknown>) {
  metricsCache = { data: _data, timestamp: Date.now() };
}

async function main() {
  const configPath = process.argv[2] || "config.yaml";
  loadConfig(configPath);
  const config = getConfig();
  
  console.log(`Starting Pingup Agent: ${config.agent_id}`);
  console.log(`Server: ${config.server_url}`);
  console.log(`Poll interval: ${config.poll_interval}s`);
  
  const sender = new HTTPSender();
  
  async function loop() {
    try {
      const metrics = await collectAllMetrics(config);
      latestMetrics = metrics;
      setCachedMetrics(metrics);
      
const payload = {
        agentId: config.agent_id,
        timestamp: new Date().toISOString(),
        metrics: {
          cpu: metrics.cpu?.cpu_percent || 0,
          ram: metrics.ram?.ram_percent || 0,
          disk: metrics.disk?.disk_percent || 0,
          latency: metrics.cpu?.latency || -1,
          temperature: metrics.temperature?.cpu || null,
        },
        status: "online",
      };
      
      const signature = await sign(JSON.stringify(payload), config.auth_token);
      payload.signature = signature;
      
      await sender.sendMetrics(payload);
      
      const commands = await sender.fetchCommands();
      for (const cmd of commands) {
        const result = await executeCommand(cmd);
        await sender.reportCommandResult(cmd.commandId, result);
      }
      
      console.log(
        `Metrics sent: CPU=${payload.metrics.cpu}% RAM=${payload.metrics.ram}% Disk=${payload.metrics.disk}% Latency=${payload.metrics.latency}ms`
      );
    } catch (e) {
      console.error("Error in loop:", e);
    }
    
    setTimeout(loop, config.poll_interval * 1000);
  }
  
  loop();
  
  const port = 8080;
  
  app.get("/health", (c) => c.json({ status: "healthy" }));
  
  console.log(`Agent API server running on http://localhost:${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
  });
}

main();
