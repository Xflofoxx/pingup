import { Hono } from "hono";
import { verifyToken } from "../services/auth.ts";
import { hasRole, getUserById } from "../services/users.ts";
import { getAgent, listAgents } from "../services/agent.ts";
import { getAgentMetrics } from "../services/metrics.ts";
import { getDb } from "../db/sqlite.ts";

const HTML_HEADER = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pingup Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    .sidebar { width: 260px; }
    .content { margin-left: 260px; }
    @media (max-width: 768px) { .sidebar { display: none; } .content { margin-left: 0; } }
  </style>
</head>
<body class="bg-gray-900 text-gray-100">
`;

const PUBLIC_DASHBOARD = `
<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
  <div class="container mx-auto px-4 py-8">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-white mb-2">
        <i class="fas fa-network-wired text-blue-400 mr-3"></i>Pingup
      </h1>
      <p class="text-gray-400">Network Monitoring Dashboard</p>
      <div class="mt-4">
        <a href="/login" class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-3 transition">
          <i class="fas fa-sign-in-alt mr-2"></i>Login
        </a>
        <a href="/register" class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition">
          <i class="fas fa-user-plus mr-2"></i>Register
        </a>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Network Health</p>
            <p class="text-3xl font-bold text-green-400">{{HEALTH_SCORE}}%</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
            <i class="fas fa-heartbeat text-green-400 text-2xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Online Agents</p>
            <p class="text-3xl font-bold text-blue-400">{{ONLINE_AGENTS}} / {{TOTAL_AGENTS}}</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-server text-blue-400 text-2xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg CPU</p>
            <p class="text-3xl font-bold text-yellow-400">{{AVG_CPU}}%</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <i class="fas fa-microchip text-yellow-400 text-2xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg RAM</p>
            <p class="text-3xl font-bold text-purple-400">{{AVG_RAM}}%</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-memory text-purple-400 text-2xl"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4">
        <i class="fas fa-chart-line text-blue-400 mr-2"></i>Network Status
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-700/50 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span class="text-gray-300">All Systems Operational</span>
          </div>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
            <span class="text-gray-300">{{TOTAL_AGENTS}} Agents Monitored</span>
          </div>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span class="text-gray-300">Last Updated: Just now</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

function getPublicStats() {
  const agents = listAgents();
  const onlineCount = agents.filter(a => a.status === "online").length;
  
  let totalCpu = 0;
  let totalRam = 0;
  
  for (const agent of agents.slice(0, 10)) {
    try {
      const metrics = getAgentMetrics(agent.id, undefined, undefined);
      if (metrics.length > 0) {
        totalCpu += metrics[0].cpu || 0;
        totalRam += metrics[0].ram || 0;
      }
    } catch {
      // Ignore errors
    }
  }
  
  const avgCpu = agents.length > 0 ? Math.round(totalCpu / Math.min(agents.length, 10)) : 0;
  const avgRam = agents.length > 0 ? Math.round(totalRam / Math.min(agents.length, 10)) : 0;
  const healthScore = Math.round((avgCpu < 80 && avgRam < 90 ? 100 : 50) * (onlineCount / Math.max(agents.length, 1)));
  
  return {
    healthScore,
    onlineAgents: onlineCount,
    totalAgents: agents.length,
    avgCpu,
    avgRam,
  };
}

function getLoginPage() {
  return HTML_HEADER + `
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="bg-gray-800 rounded-xl p-8 w-full max-w-md border border-gray-700">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white">
          <i class="fas fa-network-wired text-blue-400 mr-2"></i>Pingup
        </h1>
        <p class="text-gray-400 mt-2">Accedi con il tuo codice TOTP</p>
      </div>
      
      <form id="loginForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
          <input type="text" name="username" required
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Codice TOTP</label>
          <input type="text" name="code" required maxlength="6" pattern="[0-9]*" inputmode="numeric"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123456">
        </div>
        
        <button type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
          <i class="fas fa-sign-in-alt mr-2"></i>Accedi
        </button>
        
        <div class="text-center mt-4">
          <a href="/register" class="text-blue-400 hover:text-blue-300 text-sm">
            Non hai un account? Registrati
          </a>
        </div>
      </form>
      
      <div id="error" class="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm hidden"></div>
    </div>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.get('username'),
            code: form.get('code')
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Login failed');
        }
        
        window.location.href = '/dashboard';
      } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
      }
    });
  </script>
</body>
</html>
`;
}

function getRegisterPage() {
  return HTML_HEADER + `
  <div class="min-h-screen flex items-center justify-center bg-gray-900 py-8">
    <div class="bg-gray-800 rounded-xl p-8 w-full max-w-md border border-gray-700">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-white">
          <i class="fas fa-user-plus text-blue-400 mr-2"></i>Registrazione
        </h1>
        <p class="text-gray-400 mt-2">Configura l'autenticazione a due fattori</p>
      </div>
      
      <div id="step1">
        <form id="registerForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input type="text" name="username" required minlength="3"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <button type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
            <i class="fas fa-qrcode mr-2"></i>Genera QR Code
          </button>
        </form>
      </div>
      
      <div id="step2" class="hidden">
        <div class="text-center mb-6">
          <p class="text-gray-300 mb-4">Scansiona il QR code con la tua app di autenticazione:</p>
          
          <div class="bg-white p-4 rounded-lg inline-block mb-4">
            <img id="qrCode" src="" alt="QR Code" class="w-48 h-48">
          </div>
          
          <p class="text-sm text-gray-400 mb-2">O inserisci manualmente questo codice:</p>
          <code id="secretKey" class="bg-gray-900 px-4 py-2 rounded text-green-400 font-mono"></code>
        </div>
        
        <form id="verifyForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Codice TOTP</label>
            <input type="text" name="code" required maxlength="6" pattern="[0-9]*" inputmode="numeric"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123456">
          </div>
          
          <button type="submit"
            class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
            <i class="fas fa-check mr-2"></i>Verifica e Registrati
          </button>
        </form>
      </div>
      
      <div id="error" class="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm hidden"></div>
      <div id="success" class="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm hidden"></div>
      
      <div class="text-center mt-4">
        <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
          Hai già un account? Accedi
        </a>
      </div>
    </div>
  </div>
  
  <script>
    let tempUserId = '';
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      
      try {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.get('username') })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Registration failed');
        }
        
        const data = await res.json();
        tempUserId = data.userId;
        document.getElementById('qrCode').src = data.qrCode;
        document.getElementById('secretKey').textContent = data.secret;
        
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
      } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
      }
    });
    
    document.getElementById('verifyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      const success = document.getElementById('success');
      
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.querySelector('#registerForm input[name="username"]').value,
            code: form.get('code')
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Verification failed');
        }
        
        success.textContent = 'Account creato con successo! Reindirizzamento...';
        success.classList.remove('hidden');
        
        setTimeout(() => window.location.href = '/dashboard', 1500);
      } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
      }
    });
  </script>
</body>
</html>
`;
}

function getDashboardLayout(user: { username: string; role: string }) {
  const roleLabels: Record<string, string> = {
    ADM: "Amministratore",
    SUP: "Supervisore",
    IT: "Operativo IT",
    PUB: "Pubblico",
  };
  
  const roleColors: Record<string, string> = {
    ADM: "bg-red-600",
    SUP: "bg-purple-600",
    IT: "bg-blue-600",
    PUB: "bg-gray-600",
  };
  
  return HTML_HEADER + `
  <div class="flex min-h-screen">
    <aside class="sidebar fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 p-4">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-white">
          <i class="fas fa-network-wired text-blue-400 mr-2"></i>Pingup
        </h1>
      </div>
      
      <nav class="space-y-2">
        <a href="/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">
          <i class="fas fa-home w-5"></i> Dashboard
        </a>
        
        ${hasRole(user.role, "IT") ? `
        <a href="/dashboard/agents" class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition">
          <i class="fas fa-server w-5"></i> Agenti
        </a>
        <a href="/dashboard/commands" class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition">
          <i class="fas fa-terminal w-5"></i> Comandi
        </a>
        ` : ''}
        
        ${hasRole(user.role, "SUP") ? `
        <a href="/dashboard/security" class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition">
          <i class="fas fa-shield-alt w-5"></i> Sicurezza
        </a>
        ` : ''}
        
        ${hasRole(user.role, "ADM") ? `
        <a href="/dashboard/users" class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition">
          <i class="fas fa-users w-5"></i> Utenti
        </a>
        <a href="/dashboard/audit" class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition">
          <i class="fas fa-clipboard-list w-5"></i> Audit Log
        </a>
        ` : ''}
      </nav>
      
      <div class="absolute bottom-4 left-4 right-4">
        <div class="bg-gray-700 rounded-lg p-4 mb-4">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-full ${roleColors[user.role]} flex items-center justify-center">
              <i class="fas fa-user text-white"></i>
            </div>
            <div>
              <p class="font-medium text-white">${user.username}</p>
              <p class="text-xs text-gray-400">${roleLabels[user.role]}</p>
            </div>
          </div>
        </div>
        
        <a href="/api/v1/auth/logout" class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>
    </aside>
    
    <main class="content flex-1 p-8">
`;
}

function getDashboardPage(user: { username: string; role: string }) {
  const agents = listAgents();
  const stats = getPublicStats();
  
  let content = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white">Dashboard</h1>
      <p class="text-gray-400">Benvenuto, ${user.username}</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Network Health</p>
            <p class="text-3xl font-bold ${stats.healthScore >= 70 ? 'text-green-400' : stats.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}">${stats.healthScore}%</p>
          </div>
          <div class="w-14 h-14 rounded-full ${stats.healthScore >= 70 ? 'bg-green-500/20' : stats.healthScore >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20'} flex items-center justify-center">
            <i class="fas fa-heartbeat text-2xl ${stats.healthScore >= 70 ? 'text-green-400' : stats.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Online Agents</p>
            <p class="text-3xl font-bold text-blue-400">${stats.onlineAgents} / ${stats.totalAgents}</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-server text-blue-400 text-2xl"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg CPU</p>
            <p class="text-3xl font-bold ${stats.avgCpu >= 80 ? 'text-red-400' : stats.avgCpu >= 60 ? 'text-yellow-400' : 'text-green-400'}">${stats.avgCpu}%</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <i class="fas fa-microchip text-yellow-400 text-2xl"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg RAM</p>
            <p class="text-3xl font-bold ${stats.avgRam >= 90 ? 'text-red-400' : stats.avgRam >= 70 ? 'text-yellow-400' : 'text-green-400'}">${stats.avgRam}%</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-memory text-purple-400 text-2xl"></i>
          </div>
        </div>
      </div>
    </div>
    
    <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4">
        <i class="fas fa-server text-blue-400 mr-2"></i>Agenti
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-gray-700">
              <th class="pb-3">ID</th>
              <th class="pb-3">Nome</th>
              <th class="pb-3">Stato</th>
              <th class="pb-3">Ultimo visto</th>
            </tr>
          </thead>
          <tbody>
            ${agents.map(agent => `
            <tr class="border-b border-gray-700/50">
              <td class="py-3 font-mono text-sm">${agent.id}</td>
              <td class="py-3">${agent.name || '-'}</td>
              <td class="py-3">
                <span class="px-2 py-1 rounded text-xs ${agent.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                  ${agent.status}
                </span>
              </td>
              <td class="py-3 text-gray-400 text-sm">${agent.last_seen || 'Mai'}</td>
            </tr>
            `).join('')}
            ${agents.length === 0 ? '<tr><td colspan="4" class="py-4 text-center text-gray-500">Nessun agente registrato</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return getDashboardLayout(user) + content + `
    </main>
  </div>
</body>
</html>
`;
}

export const dashboardRouter = new Hono();

dashboardRouter.get("/", (c) => {
  const stats = getPublicStats();
  
  let html = PUBLIC_DASHBOARD
    .replace("{{HEALTH_SCORE}}", stats.healthScore.toString())
    .replace("{{ONLINE_AGENTS}}", stats.onlineAgents.toString())
    .replace("{{TOTAL_AGENTS}}", stats.totalAgents.toString())
    .replace("{{AVG_CPU}}", stats.avgCpu.toString())
    .replace("{{AVG_RAM}}", stats.avgRam.toString());
  
  return c.html(html);
});

dashboardRouter.get("/login", (c) => {
  return c.html(getLoginPage());
});

dashboardRouter.get("/register", (c) => {
  return c.html(getRegisterPage());
});

dashboardRouter.get("/dashboard", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.redirect("/login");
  }
  
  const user = getUserById(payload.sub);
  
  if (!user) {
    return c.redirect("/login");
  }
  
  return c.html(getDashboardPage({ username: user.username, role: user.role }));
});

dashboardRouter.get("/logout", async (c) => {
  const token = c.req.cookie("auth_token");
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await logoutUser(payload.sessionId);
    }
  }
  
  deleteCookie(c, "auth_token");
  
  return c.redirect("/");
});
