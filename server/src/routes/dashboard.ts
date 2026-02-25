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
  <title>Pingup - Network Monitoring</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    .sidebar { width: 260px; }
    .content { margin-left: 260px; }
    @media (max-width: 768px) { .sidebar { display: none; } .content { margin-left: 0; } }
    .gradient-bg {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    }
    .card-glass {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .glow-blue { box-shadow: 0 0 30px rgba(59, 130, 246, 0.3); }
    .glow-green { box-shadow: 0 0 30px rgba(34, 197, 94, 0.3); }
    .glow-purple { box-shadow: 0 0 30px rgba(168, 85, 247, 0.3); }
    .animate-float { animation: float 6s ease-in-out infinite; }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    .animate-pulse-slow { animation: pulse 4s ease-in-out infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .gradient-text {
      background: linear-gradient(135deg, #60a5fa, #a78bfa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="gradient-bg text-gray-100 min-h-screen">
`;

const PUBLIC_DASHBOARD = `
<div class="relative overflow-hidden min-h-screen">
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 4s"></div>
  </div>

  <!-- Header -->
  <header class="relative z-10 border-b border-white/10 backdrop-blur-sm bg-gray-900/50">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <i class="fas fa-network-wired text-white text-lg"></i>
        </div>
        <span class="text-xl font-bold gradient-text">Pingup</span>
      </div>
      <div class="flex items-center gap-3">
        <a href="/login" class="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/10">
          <i class="fas fa-sign-in-alt mr-2"></i>Accedi
        </a>
        <a href="/register" class="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition glow-blue">
          <i class="fas fa-user-plus mr-2"></i>Registrati
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <div class="relative z-10 container mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm mb-6">
        <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
        Monitoraggio di rete in tempo reale
      </div>
      <h1 class="text-5xl md:text-6xl font-bold mb-6">
        <span class="gradient-text">Network Monitoring</span>
        <br>made <span class="text-white">simple</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
        Monitora la tua infrastruttura di rete con agenti leggeri. CPU, RAM, disco, latenza e scansione della rete in un'unica soluzione.
      </p>
      <div class="flex items-center justify-center gap-4">
        <a href="/login" class="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition glow-blue font-semibold">
          <i class="fas fa-rocket mr-2"></i>Inizia Ora
        </a>
        <a href="#features" class="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10">
          <i class="fas fa-info-circle mr-2"></i>Scopri di più
        </a>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      <div class="card-glass rounded-2xl p-6 glow-green hover:scale-105 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <i class="fas fa-heart-pulse text-green-400 text-xl"></i>
          </div>
          <span class="text-3xl font-bold text-white">{{HEALTH_SCORE}}%</span>
        </div>
        <p class="text-gray-400 text-sm">Network Health</p>
        <div class="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000" style="width: {{HEALTH_SCORE}}%"></div>
        </div>
      </div>

      <div class="card-glass rounded-2xl p-6 glow-blue hover:scale-105 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-server text-blue-400 text-xl"></i>
          </div>
          <span class="text-3xl font-bold text-white">{{ONLINE_AGENTS}}</span>
        </div>
        <p class="text-gray-400 text-sm">Agenti Online</p>
        <div class="mt-3 flex items-center gap-2">
          <span class="text-sm text-gray-500">su {{TOTAL_AGENTS}} totali</span>
        </div>
      </div>

      <div class="card-glass rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <i class="fas fa-microchip text-yellow-400 text-xl"></i>
          </div>
          <span class="text-3xl font-bold text-white">{{AVG_CPU}}%</span>
        </div>
        <p class="text-gray-400 text-sm">CPU Media</p>
        <div class="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000" style="width: {{AVG_CPU}}%"></div>
        </div>
      </div>

      <div class="card-glass rounded-2xl p-6 glow-purple hover:scale-105 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-memory text-purple-400 text-xl"></i>
          </div>
          <span class="text-3xl font-bold text-white">{{AVG_RAM}}%</span>
        </div>
        <p class="text-gray-400 text-sm">RAM Media</p>
        <div class="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-1000" style="width: {{AVG_RAM}}%"></div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div id="features" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
      <div class="card-glass rounded-2xl p-8 hover:bg-white/5 transition">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
          <i class="fas fa-chart-line text-white text-2xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Metriche in Tempo Reale</h3>
        <p class="text-gray-400">CPU, RAM, disco e utilizzo di rete monitorati in tempo reale con storico consultabile.</p>
      </div>

      <div class="card-glass rounded-2xl p-8 hover:bg-white/5 transition">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
          <i class="fas fa-radar text-white text-2xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Scansione Rete</h3>
        <p class="text-gray-400">Scopri tutti i dispositivi sulla tua rete con ICMP ping e scansione delle porte.</p>
      </div>

      <div class="card-glass rounded-2xl p-8 hover:bg-white/5 transition">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
          <i class="fas fa-shield-halved text-white text-2xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Sicurezza Avanzata</h3>
        <p class="text-gray-400">Autenticazione TOTP, firma HMAC dei messaggi e controllo accessi basato su ruoli.</p>
      </div>
    </div>

    <!-- System Status -->
    <div class="card-glass rounded-2xl p-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">
          <i class="fas fa-server mr-3 text-blue-400"></i>Stato del Sistema
        </h2>
        <span class="px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm">
          <i class="fas fa-check-circle mr-2"></i>Tutti i sistemi operativi
        </span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800/50 rounded-xl p-4 text-center">
          <i class="fas fa-server text-2xl text-blue-400 mb-2"></i>
          <p class="text-gray-400 text-sm">Agenti</p>
          <p class="text-xl font-bold text-white">{{TOTAL_AGENTS}}</p>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4 text-center">
          <i class="fas fa-check-circle text-2xl text-green-400 mb-2"></i>
          <p class="text-gray-400 text-sm">Online</p>
          <p class="text-xl font-bold text-green-400">{{ONLINE_AGENTS}}</p>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4 text-center">
          <i class="fas fa-clock text-2xl text-yellow-400 mb-2"></i>
          <p class="text-gray-400 text-sm">Ultimo aggiornamento</p>
          <p class="text-xl font-bold text-white">Ora</p>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4 text-center">
          <i class="fas fa-shield-alt text-2xl text-purple-400 mb-2"></i>
          <p class="text-gray-400 text-sm">Stato</p>
          <p class="text-xl font-bold text-green-400">Protetto</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="relative z-10 border-t border-white/10 bg-gray-900/50 backdrop-blur-sm mt-16">
    <div class="container mx-auto px-6 py-6 flex items-center justify-between">
      <p class="text-gray-500 text-sm">
        <i class="fas fa-code mr-2"></i>Built with Bun + Hono
      </p>
      <p class="text-gray-500 text-sm">
        MIT License
      </p>
    </div>
  </footer>
</div>
`;

function getLoginPage() {
  return HTML_HEADER + `
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
          <i class="fas fa-network-wired text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-white">Benvenuto</h1>
        <p class="text-gray-400 mt-2">Accedi al tuo account</p>
      </div>

      <div class="card-glass rounded-2xl p-8">
        <!-- TOTP Login -->
        <div id="totpSection">
          <h3 class="text-lg font-semibold text-white mb-4">
            <i class="fas fa-mobile-alt mr-2 text-blue-400"></i>Accedi con TOTP
          </h3>
          <form id="totpForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" name="username" required
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Codice TOTP</label>
              <input type="text" name="code" required maxlength="6" pattern="[0-9]*" inputmode="numeric" placeholder="123456"
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            </div>
            <button type="submit"
              class="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition glow-blue">
              <i class="fas fa-sign-in-alt mr-2"></i>Accedi con TOTP
            </button>
          </form>
        </div>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-4 bg-gray-800 text-gray-500">oppure</span>
          </div>
        </div>

        <!-- Password Login -->
        <div id="passwordSection">
          <h3 class="text-lg font-semibold text-white mb-4">
            <i class="fas fa-lock mr-2 text-purple-400"></i>Accedi con Password
          </h3>
          <form id="passwordForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" name="username" required
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" name="password" required
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            </div>
            <button type="submit"
              class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition">
              <i class="fas fa-sign-in-alt mr-2"></i>Accedi con Password
            </button>
          </form>
        </div>

        <div id="error" class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm hidden"></div>

        <div class="text-center mt-6">
          <a href="/register" class="text-blue-400 hover:text-blue-300 text-sm">
            Non hai un account? <span class="font-semibold">Registrati</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('totpForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      error.classList.add('hidden');
      
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

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      error.classList.add('hidden');
      
      try {
        const res = await fetch('/api/v1/auth/login-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.get('username'),
            password: form.get('password')
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
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 mb-4">
          <i class="fas fa-user-plus text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-white">Crea Account</h1>
        <p class="text-gray-400 mt-2">Scegli il metodo di autenticazione</p>
      </div>

      <div class="card-glass rounded-2xl p-8">
        <!-- Password Registration -->
        <div id="step1">
          <h3 class="text-lg font-semibold text-white mb-4">
            <i class="fas fa-user-plus mr-2 text-green-400"></i>Registrazione con Password
          </h3>
          <form id="registerForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" name="username" required minlength="3"
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" name="password" required minlength="6"
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Conferma Password</label>
              <input type="password" name="confirmPassword" required minlength="6"
                class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
            </div>
            <button type="submit"
              class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition">
              <i class="fas fa-user-plus mr-2"></i>Registrati
            </button>
          </form>
        </div>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-4 bg-gray-800 text-gray-500">oppure</span>
          </div>
        </div>

        <!-- TOTP Registration -->
        <div id="totpSection">
          <h3 class="text-lg font-semibold text-white mb-4">
            <i class="fas fa-mobile-alt mr-2 text-blue-400"></i>Registrazione con TOTP
          </h3>
          <a href="/register-totp" class="block w-full text-center bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition">
            <i class="fas fa-qrcode mr-2"></i>Registrati con TOTP
          </a>
        </div>

        <div id="error" class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm hidden"></div>
        <div id="success" class="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm hidden"></div>

        <div class="text-center mt-6">
          <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
            Hai già un account? <span class="font-semibold">Accedi</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const error = document.getElementById('error');
      const success = document.getElementById('success');
      error.classList.add('hidden');
      
      if (form.get('password') !== form.get('confirmPassword')) {
        error.textContent = 'Le password non corrispondono';
        error.classList.remove('hidden');
        return;
      }
      
      try {
        const res = await fetch('/api/v1/auth/register-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.get('username'),
            password: form.get('password')
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Registration failed');
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
    ADM: "from-red-500 to-red-600",
    SUP: "from-purple-500 to-purple-600",
    IT: "from-blue-500 to-blue-600",
    PUB: "from-gray-500 to-gray-600",
  };
  
  return HTML_HEADER.replace('text-gray-100">', 'text-gray-100" style="background: #0f172a;">') + `
  <div class="flex min-h-screen">
    <aside class="sidebar fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-white/10 p-4 z-50">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">
          <span class="gradient-text">Pingup</span>
        </h1>
      </div>
      
      <nav class="space-y-2">
        <a href="/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition">
          <i class="fas fa-home w-5"></i> Dashboard
        </a>
        
        ${hasRole(user.role, "IT") ? `
        <a href="/dashboard/agents" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-server w-5"></i> Agenti
        </a>
        <a href="/dashboard/commands" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-terminal w-5"></i> Comandi
        </a>
        ` : ''}
        
        ${hasRole(user.role, "SUP") ? `
        <a href="/dashboard/security" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-shield-alt w-5"></i> Sicurezza
        </a>
        ` : ''}
        
        ${hasRole(user.role, "ADM") ? `
        <a href="/dashboard/users" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-users w-5"></i> Utenti
        </a>
        <a href="/dashboard/audit" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
          <i class="fas fa-clipboard-list w-5"></i> Audit Log
        </a>
        ` : ''}
      </nav>
      
      <div class="absolute bottom-4 left-4 right-4">
        <div class="card-glass rounded-xl p-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-r ${roleColors[user.role]} flex items-center justify-center">
              <i class="fas fa-user text-white"></i>
            </div>
            <div>
              <p class="font-medium text-white">${user.username}</p>
              <p class="text-xs text-gray-400">${roleLabels[user.role]}</p>
            </div>
          </div>
        </div>
        
        <a href="/api/v1/auth/logout" class="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>
    </aside>
    
    <main class="content flex-1 p-8" style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);">
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
      <div class="card-glass rounded-2xl p-6 glow-green">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Network Health</p>
            <p class="text-4xl font-bold ${stats.healthScore >= 70 ? 'text-green-400' : stats.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}">${stats.healthScore}%</p>
          </div>
          <div class="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
            <i class="fas fa-heart-pulse text-green-400 text-2xl"></i>
          </div>
        </div>
      </div>
      
      <div class="card-glass rounded-2xl p-6 glow-blue">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Online Agents</p>
            <p class="text-4xl font-bold text-blue-400">${stats.onlineAgents} <span class="text-lg text-gray-500">/ ${stats.totalAgents}</span></p>
          </div>
          <div class="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-server text-blue-400 text-2xl"></i>
          </div>
        </div>
      </div>
      
      <div class="card-glass rounded-2xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg CPU</p>
            <p class="text-4xl font-bold ${stats.avgCpu >= 80 ? 'text-red-400' : stats.avgCpu >= 60 ? 'text-yellow-400' : 'text-green-400'}">${stats.avgCpu}%</p>
          </div>
          <div class="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <i class="fas fa-microchip text-yellow-400 text-2xl"></i>
          </div>
        </div>
      </div>
      
      <div class="card-glass rounded-2xl p-6 glow-purple">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">Avg RAM</p>
            <p class="text-4xl font-bold ${stats.avgRam >= 90 ? 'text-red-400' : stats.avgRam >= 70 ? 'text-yellow-400' : 'text-purple-400'}">${stats.avgRam}%</p>
          </div>
          <div class="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-memory text-purple-400 text-2xl"></i>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-glass rounded-2xl p-6">
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
            <tr class="border-b border-gray-700/50 hover:bg-white/5">
              <td class="py-4 font-mono text-sm text-blue-400">${agent.id}</td>
              <td class="py-4 text-white">${agent.name || '-'}</td>
              <td class="py-4">
                <span class="px-3 py-1 rounded-full text-xs ${agent.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                  ${agent.status}
                </span>
              </td>
              <td class="py-4 text-gray-400 text-sm">${agent.last_seen || 'Mai'}</td>
            </tr>
            `).join('')}
            ${agents.length === 0 ? '<tr><td colspan="4" class="py-8 text-center text-gray-500">Nessun agente registrato</td></tr>' : ''}
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
      const { logoutUser } = await import("../services/auth.ts");
      await logoutUser(payload.sessionId);
    }
  }
  
  c.header("Set-Cookie", "auth_token=; Path=/; HttpOnly; Max-Age=0");
  
  return c.redirect("/");
});
