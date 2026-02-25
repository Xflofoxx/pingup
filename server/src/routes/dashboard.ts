import { Hono } from "hono";
import { verifyToken } from "../services/auth.ts";
import { hasRole, getUserById } from "../services/users.ts";
import { getAgent, listAgents } from "../services/agent.ts";
import { getAgentMetrics } from "../services/metrics.ts";
import { getDb } from "../db/sqlite.ts";

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.raw.headers.get("Cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

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
    .grid-pattern {
      background-image: 
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
      background-size: 50px 50px;
    }
    .floating-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      animation: orb-float 20s ease-in-out infinite;
    }
    @keyframes orb-float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(30px, -30px) scale(1.1); }
      50% { transform: translate(-20px, 20px) scale(0.9); }
      75% { transform: translate(20px, 30px) scale(1.05); }
    }
    .glass-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card:hover {
      transform: translateY(-8px);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .hero-gradient {
      background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.8) 50%, #0f172a 100%);
    }
    .text-gradient-animate {
      background: linear-gradient(90deg, #60a5fa, #a78bfa, #34d399, #60a5fa);
      background-size: 300% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient-shift 5s ease infinite;
    }
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .feature-icon {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    .feature-icon:hover {
      transform: scale(1.1) rotate(5deg);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
    }
    .dashboard-bg {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
  </style>
</head>
<body class="gradient-bg text-gray-100 min-h-screen">
`;

const PUBLIC_DASHBOARD = `
<div class="relative overflow-hidden min-h-screen grid-pattern">
  <!-- Floating orbs background -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="floating-orb top-20 right-20 w-72 h-72 bg-blue-500/20"></div>
    <div class="floating-orb bottom-40 left-10 w-96 h-96 bg-purple-500/15" style="animation-delay: -5s"></div>
    <div class="floating-orb top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10" style="animation-delay: -10s"></div>
    <div class="floating-orb bottom-20 right-1/4 w-48 h-48 bg-pink-500/10" style="animation-delay: -15s"></div>
  </div>

  <!-- Header -->
  <header class="relative z-10 border-b border-white/5 backdrop-blur-md bg-gray-900/30">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center animate-float">
            <i class="fas fa-network-wired text-white text-xl"></i>
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900"></div>
        </div>
        <div>
          <span class="text-2xl font-bold gradient-text">Pingup</span>
          <p class="text-xs text-gray-500 -mt-1">Network Monitor</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="/login" class="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10 backdrop-blur-sm group">
          <i class="fas fa-sign-in-alt mr-2 text-gray-400 group-hover:text-white transition"></i><span class="text-gray-300 group-hover:text-white transition">Accedi</span>
        </a>
        <a href="/register" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 hover:from-blue-600 hover:via-purple-600 hover:to-cyan-600 transition glow-blue font-semibold shadow-lg shadow-blue-500/25">
          <i class="fas fa-user-plus mr-2"></i>Registrati
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <div class="relative z-10 container mx-auto px-6 pt-12 pb-8">
    <div class="text-center mb-20 max-w-4xl mx-auto">
      <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        Monitoraggio di rete in tempo reale
        <span class="w-px h-4 bg-blue-500/30 mx-2"></span>
        <span class="text-cyan-400"><i class="fas fa-bolt mr-1"></i> Ultra leggero</span>
      </div>
      
      <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        Il tuo <span class="text-gradient-animate">Network Monitor</span>
        <br><span class="text-white">intelligente e moderno</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Monitora l'infrastruttura di rete con agenti ultra-leggeri. CPU, RAM, disco, latenza e scansione della rete in un'unica dashboard moderna.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="/login" class="group px-10 py-4.5 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 hover:from-blue-600 hover:via-purple-600 hover:to-cyan-600 transition glow-blue font-semibold text-lg shadow-xl shadow-purple-500/20 relative overflow-hidden">
          <span class="relative z-10"><i class="fas fa-rocket mr-2"></i>Inizia Ora</span>
          <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </a>
        <a href="#features" class="px-10 py-4.5 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/10 backdrop-blur-sm text-lg group">
          <i class="fas fa-play-circle mr-2 text-purple-400 group-hover:text-purple-300 transition"></i><span class="text-gray-300 group-hover:text-white transition">Demo</span>
        </a>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
      <div class="glass-card rounded-3xl p-6 glow-green">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border border-green-500/20">
            <i class="fas fa-heart-pulse text-green-400 text-2xl"></i>
          </div>
          <div class="text-right">
            <span class="text-4xl font-bold text-white">{{HEALTH_SCORE}}%</span>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Network Health</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 transition-all duration-1000 relative" style="width: {{HEALTH_SCORE}}%">
            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
          </div>
        </div>
        <div class="flex justify-between mt-2 text-xs text-gray-500">
          <span>Offline</span>
          <span>Online</span>
        </div>
      </div>

      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center border border-blue-500/20">
            <i class="fas fa-server text-blue-400 text-2xl"></i>
          </div>
          <div class="text-right">
            <span class="text-4xl font-bold text-white">{{ONLINE_AGENTS}}</span>
            <span class="text-gray-500 text-lg">/{{TOTAL_AGENTS}}</span>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Agenti Online</p>
        <div class="mt-4 flex items-center gap-2">
          <div class="flex -space-x-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-gray-900 flex items-center justify-center">
              <i class="fas fa-check text-xs text-white"></i>
            </div>
          </div>
          <span class="text-sm text-gray-500">attivi</span>
        </div>
      </div>

      <div class="glass-card rounded-3xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center border border-yellow-500/20">
            <i class="fas fa-microchip text-yellow-400 text-2xl"></i>
          </div>
          <div class="text-right">
            <span class="text-4xl font-bold text-white">{{AVG_CPU}}%</span>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">CPU Media</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-400 transition-all duration-1000" style="width: {{AVG_CPU}}%"></div>
        </div>
        <p class="mt-2 text-xs text-gray-500"><i class="fas fa-bolt mr-1 text-yellow-400"></i> Ottimizzato</p>
      </div>

      <div class="glass-card rounded-3xl p-6 glow-purple">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/20">
            <i class="fas fa-memory text-purple-400 text-2xl"></i>
          </div>
          <div class="text-right">
            <span class="text-4xl font-bold text-white">{{AVG_RAM}}%</span>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">RAM Media</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-purple-400 via-pink-500 to-rose-400 transition-all duration-1000" style="width: {{AVG_RAM}}%"></div>
        </div>
        <p class="mt-2 text-xs text-gray-500"><i class="fas fa-shield-alt mr-1 text-purple-400"></i> Efficiente</p>
      </div>
    </div>

    <!-- Features Section -->
    <div id="features" class="mb-20">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-white mb-4">
          <span class="gradient-text">Caratteristiche</span> Principali
        </h2>
        <p class="text-gray-400 max-w-xl mx-auto">Tutto quello che ti serve per monitorare la tua infrastruttura di rete</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card rounded-3xl p-8 group cursor-default">
          <div class="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
            <i class="fas fa-chart-line text-white text-2xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-3 group-hover:text-blue-400 transition">Metriche Real-time</h3>
          <p class="text-gray-400 leading-relaxed">CPU, RAM, disco e utilizzo di rete monitorati in tempo reale con storico consultabile e grafici interattivi.</p>
          <div class="mt-6 flex items-center text-blue-400 text-sm font-medium">
            <span>Scopri di più</span>
            <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
          </div>
        </div>

        <div class="glass-card rounded-3xl p-8 group cursor-default">
          <div class="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
            <i class="fas fa-radar text-white text-2xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-3 group-hover:text-green-400 transition">Scansione Rete</h3>
          <p class="text-gray-400 leading-relaxed">Scopri tutti i dispositivi sulla tua rete con ICMP ping avanzato e scansione delle porte TCP/UDP.</p>
          <div class="mt-6 flex items-center text-green-400 text-sm font-medium">
            <span>Scopri di più</span>
            <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
          </div>
        </div>

        <div class="glass-card rounded-3xl p-8 group cursor-default">
          <div class="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
            <i class="fas fa-shield-halved text-white text-2xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-white mb-3 group-hover:text-purple-400 transition">Sicurezza Avanzata</h3>
          <p class="text-gray-400 leading-relaxed">Autenticazione TOTP, firma HMAC dei messaggi e controllo accessi basato su ruoli (RBAC).</p>
          <div class="mt-6 flex items-center text-purple-400 text-sm font-medium">
            <span>Scopri di più</span>
            <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- System Status -->
    <div class="glass-card rounded-3xl p-8 mb-16">
      <div class="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h2 class="text-2xl font-bold text-white">
          <i class="fas fa-server mr-3 text-blue-400"></i>Stato del Sistema
        </h2>
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span class="px-4 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30">
            <i class="fas fa-check-circle mr-2"></i>Tutti i sistemi operativi
          </span>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800/30 rounded-2xl p-5 text-center border border-white/5 hover:border-white/10 transition">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-server text-blue-400 text-xl"></i>
          </div>
          <p class="text-gray-400 text-sm">Agenti Totali</p>
          <p class="text-3xl font-bold text-white mt-1">{{TOTAL_AGENTS}}</p>
        </div>
        <div class="bg-gray-800/30 rounded-2xl p-5 text-center border border-white/5 hover:border-white/10 transition">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
            <i class="fas fa-check-circle text-green-400 text-xl"></i>
          </div>
          <p class="text-gray-400 text-sm">Online</p>
          <p class="text-3xl font-bold text-green-400 mt-1">{{ONLINE_AGENTS}}</p>
        </div>
        <div class="bg-gray-800/30 rounded-2xl p-5 text-center border border-white/5 hover:border-white/10 transition">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <i class="fas fa-clock text-yellow-400 text-xl"></i>
          </div>
          <p class="text-gray-400 text-sm">Ultimo check</p>
          <p class="text-3xl font-bold text-white mt-1"><i class="fas fa-bolt text-yellow-400"></i></p>
        </div>
        <div class="bg-gray-800/30 rounded-2xl p-5 text-center border border-white/5 hover:border-white/10 transition">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-shield-alt text-purple-400 text-xl"></i>
          </div>
          <p class="text-gray-400 text-sm">Stato</p>
          <p class="text-3xl font-bold text-green-400 mt-1">Protetto</p>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="relative mb-16">
      <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-3xl blur-3xl"></div>
      <div class="relative glass-card rounded-3xl p-10 text-center border border-white/10">
        <h2 class="text-3xl font-bold text-white mb-4">Pronto a monitorare la tua rete?</h2>
        <p class="text-gray-400 mb-8 max-w-xl mx-auto">Inizia in pochi secondi. Nessuna carta di credito richiesta.</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/register" class="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition font-semibold text-lg shadow-lg shadow-blue-500/25">
            <i class="fas fa-user-plus mr-2"></i>Crea Account Gratis
          </a>
          <a href="/login" class="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/10 text-gray-300 hover:text-white">
            <i class="fas fa-sign-in-alt mr-2"></i>Accedi
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="relative z-10 border-t border-white/5 bg-gray-900/50 backdrop-blur-sm">
    <div class="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <i class="fas fa-network-wired text-white text-sm"></i>
        </div>
        <p class="text-gray-500 text-sm">
          <span class="font-semibold text-gray-400">Pingup</span> &copy; 2024
        </p>
      </div>
      <div class="flex items-center gap-6 text-sm text-gray-500">
        <a href="#" class="hover:text-white transition"><i class="fab fa-github mr-1"></i>GitHub</a>
        <a href="#" class="hover:text-white transition"><i class="fas fa-book mr-1"></i>Docs</a>
        <span><i class="fas fa-code mr-1"></i>Bun + Hono</span>
      </div>
      <p class="text-gray-600 text-sm">MIT License</p>
    </div>
  </footer>
</div>
</body>
</html>
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
  
  return HTML_HEADER.replace('text-gray-100">', 'text-gray-100" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);">') + `
  <div class="flex min-h-screen grid-pattern">
    <!-- Floating orbs -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="floating-orb top-20 right-20 w-72 h-72 bg-blue-500/10"></div>
      <div class="floating-orb bottom-40 left-10 w-96 h-96 bg-purple-500/10" style="animation-delay: -5s"></div>
    </div>

    <aside class="sidebar fixed left-0 top-0 h-full bg-gray-900/80 backdrop-blur-xl border-r border-white/5 p-4 z-50">
      <div class="mb-8 pt-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center">
            <i class="fas fa-network-wired text-white"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold gradient-text">Pingup</h1>
            <p class="text-xs text-gray-500 -mt-1">Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav class="space-y-1.5">
        <a href="/dashboard" class="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/20 hover:from-blue-500/30 hover:to-purple-500/30 transition">
          <i class="fas fa-home w-5"></i> <span class="font-medium">Dashboard</span>
        </a>
        
        ${hasRole(user.role, "IT") ? `
        <a href="/dashboard/agents" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5">
          <i class="fas fa-server w-5"></i> <span class="font-medium">Agenti</span>
        </a>
        <a href="/dashboard/commands" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5">
          <i class="fas fa-terminal w-5"></i> <span class="font-medium">Comandi</span>
        </a>
        ` : ''}
        
        ${hasRole(user.role, "SUP") ? `
        <a href="/dashboard/security" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5">
          <i class="fas fa-shield-alt w-5"></i> <span class="font-medium">Sicurezza</span>
        </a>
        ` : ''}
        
        ${hasRole(user.role, "ADM") ? `
        <a href="/dashboard/users" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5">
          <i class="fas fa-users w-5"></i> <span class="font-medium">Utenti</span>
        </a>
        <a href="/dashboard/audit" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5">
          <i class="fas fa-clipboard-list w-5"></i> <span class="font-medium">Audit Log</span>
        </a>
        ` : ''}
      </nav>
      
      <div class="absolute bottom-4 left-4 right-4">
        <div class="glass-card rounded-2xl p-4 mb-3 border border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-r ${roleColors[user.role]} flex items-center justify-center shadow-lg">
              <i class="fas fa-user text-white"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-white truncate">${user.username}</p>
              <p class="text-xs text-gray-400">${roleLabels[user.role]}</p>
            </div>
          </div>
        </div>
        
        <a href="/api/v1/auth/logout" class="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/20">
          <i class="fas fa-sign-out-alt"></i> <span class="font-medium">Logout</span>
        </a>
      </div>
    </aside>
    
    <main class="content flex-1 p-8 relative z-10">
`;
}

function getDashboardPage(user: { username: string; role: string }) {
  const agents = listAgents();
  const stats = getPublicStats();
  
  let content = `
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Dashboard</h1>
          <p class="text-gray-400 mt-1">Benvenuto back, <span class="text-white font-medium">${user.username}</span></p>
        </div>
        <div class="flex items-center gap-3">
          <span class="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/20">
            <i class="fas fa-circle text-xs mr-2 animate-pulse"></i>Connesso
          </span>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="glass-card rounded-3xl p-6 glow-green">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border border-green-500/20">
            <i class="fas fa-heart-pulse text-green-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Network Health</p>
        <p class="text-4xl font-bold ${stats.healthScore >= 70 ? 'text-green-400' : stats.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'} mt-1">${stats.healthScore}%</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 transition-all duration-1000" style="width: ${stats.healthScore}%"></div>
        </div>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center border border-blue-500/20">
            <i class="fas fa-server text-blue-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Agenti Online</p>
        <p class="text-4xl font-bold text-white mt-1">${stats.onlineAgents} <span class="text-lg text-gray-500">/ ${stats.totalAgents}</span></p>
        <div class="mt-4 flex items-center gap-2">
          <div class="flex -space-x-2">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-gray-900 flex items-center justify-center">
              <i class="fas fa-check text-xs text-white"></i>
            </div>
          </div>
          <span class="text-sm text-gray-500">sistema attivo</span>
        </div>
      </div>
      
      <div class="glass-card rounded-3xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center border border-yellow-500/20">
            <i class="fas fa-microchip text-yellow-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">CPU Media</p>
        <p class="text-4xl font-bold ${stats.avgCpu >= 80 ? 'text-red-400' : stats.avgCpu >= 60 ? 'text-yellow-400' : 'text-green-400'} mt-1">${stats.avgCpu}%</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-400 transition-all duration-1000" style="width: ${stats.avgCpu}%"></div>
        </div>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-purple">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/20">
            <i class="fas fa-memory text-purple-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">RAM Media</p>
        <p class="text-4xl font-bold ${stats.avgRam >= 90 ? 'text-red-400' : stats.avgRam >= 70 ? 'text-yellow-400' : 'text-purple-400'} mt-1">${stats.avgRam}%</p>
        <div class="mt-4 h-2.5 bg-gray-800/50 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-purple-400 via-pink-500 to-rose-400 transition-all duration-1000" style="width: ${stats.avgRam}%"></div>
        </div>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">
          <i class="fas fa-server text-blue-400 mr-3"></i>Agenti Registrati
        </h2>
        <span class="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-blue-500/20">
          ${agents.length} totali
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">ID</th>
              <th class="pb-4 font-medium">Nome</th>
              <th class="pb-4 font-medium">Stato</th>
              <th class="pb-4 font-medium">Ultimo contatto</th>
            </tr>
          </thead>
          <tbody>
            ${agents.map(agent => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 font-mono text-sm text-blue-400">${agent.id}</td>
              <td class="py-4 text-white font-medium">${agent.name || '-'}</td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium ${agent.status === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'}">
                  <i class="fas fa-circle text-xs mr-1.5 ${agent.status === 'online' ? 'animate-pulse' : ''}"></i>
                  ${agent.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </td>
              <td class="py-4 text-gray-400 text-sm">${agent.last_seen || 'Mai'}</td>
            </tr>
            `).join('')}
            ${agents.length === 0 ? '<tr><td colspan="4" class="py-12 text-center text-gray-500"><i class="fas fa-server text-4xl mb-3 opacity-30"></i><p>Nessun agente registrato</p></td></tr>' : ''}
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
  
  let html = HTML_HEADER + PUBLIC_DASHBOARD
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
  const token = getCookie(c, "auth_token");
  
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
  const token = getCookie(c, "auth_token");
  
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
