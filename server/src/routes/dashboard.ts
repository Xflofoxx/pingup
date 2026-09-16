import { Hono } from "hono";
import { verifyToken } from "../services/auth.ts";
import { hasRole, getUserById, DEMO_USERS, type DemoUser } from "../services/users.ts";
import { listAgents } from "../services/agent.ts";
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
  <meta name="description" content="Pingup - Network Monitoring Dashboard">
  <meta name="theme-color" content="#3b82f6">
  <link rel="manifest" href="/manifest.json">
  <title>Pingup - Network Monitoring</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --sidebar-width: 260px;
      --header-height: 64px;
      /* Dark theme (default) */
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-surface: rgba(30, 41, 59, 0.7);
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --border-color: rgba(255, 255, 255, 0.1);
      --accent-blue: #60a5f4;
      --accent-green: #34d399;
      --accent-purple: #a78bfa;
    }
    
    [data-theme="light"] {
      --bg-primary: #f9fafb;
      --bg-secondary: #ffffff;
      --bg-surface: rgba(255, 255, 255, 0.8);
      --text-primary: #111827;
      --text-secondary: #4b5563;
      --text-muted: #9ca3af;
      --border-color: rgba(0, 0, 0, 0.1);
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-purple: #8b5cf6;
    }
    
    [data-theme="light"] body {
      background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 50%, #f9fafb 100%);
      color: var(--text-primary);
    }
    
    [data-theme="light"] .gradient-bg {
      background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 50%, #f9fafb 100%);
    }
    
    [data-theme="light"] .glass-card,
    [data-theme="light"] .card-glass {
      background: var(--bg-surface);
      border-color: var(--border-color);
    }
    
    [data-theme="light"] .text-gray-100,
    [data-theme="light"] .text-gray-200,
    [data-theme="light"] .text-gray-300,
    [data-theme="light"] .text-gray-400 {
      color: var(--text-primary) !important;
    }
    
    [data-theme="light"] .text-gray-500 {
      color: var(--text-secondary) !important;
    }
    
    [data-theme="light"] .bg-gray-900,
    [data-theme="light"] .bg-gray-800 {
      background: var(--bg-secondary) !important;
    }
    
    [data-theme="light"] .border-white\/5,
    [data-theme="light"] .border-white\/10 {
      border-color: var(--border-color) !important;
    }
    
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-primary); color: var(--text-primary); }
    
    /* Responsive Breakpoints */
    /* Mobile: < 640px */
    /* Tablet: 640px - 1024px */
    /* Desktop: > 1024px */
    
    .sidebar { 
      width: var(--sidebar-width); 
      transition: transform 0.3s ease;
    }
    .content { 
      margin-left: var(--sidebar-width); 
      transition: margin-left 0.3s ease;
    }
    
    /* Mobile styles (< 640px) */
    @media (max-width: 639px) {
      .sidebar { 
        transform: translateX(-100%);
        position: fixed;
        z-index: 100;
      }
      .sidebar.open { transform: translateX(0); }
      .content { margin-left: 0; }
      .mobile-header { display: flex; }
      .desktop-header { display: none; }
      .hide-mobile { display: none !important; }
      .bottom-nav { display: flex; }
      .mobile-content { 
        padding-bottom: 80px; /* Space for bottom nav */
      }
      .grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-cols-2 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    }
    
    /* Tablet styles (640px - 1024px) */
    @media (min-width: 640px) and (max-width: 1024px) {
      .sidebar {
        width: 80px;
        overflow: hidden;
      }
      .sidebar:hover, .sidebar.expanded {
        width: var(--sidebar-width);
      }
      .sidebar .nav-text,
      .sidebar .sidebar-title,
      .sidebar .user-info {
        display: none;
      }
      .sidebar:hover .nav-text,
      .sidebar:hover .sidebar-title,
      .sidebar:hover .user-info {
        display: block;
      }
      .content { margin-left: 80px; }
      .sidebar:hover + .content,
      .content:has(~ .sidebar:hover) {
        margin-left: var(--sidebar-width);
      }
      .mobile-header { display: flex; }
      .desktop-header { display: none; }
      .bottom-nav { display: flex; }
      .grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    
    /* Desktop styles (> 1024px) */
    @media (min-width: 1025px) {
      .sidebar { position: fixed; }
      .content { margin-left: var(--sidebar-width); }
      .mobile-header { display: none; }
      .desktop-header { display: flex; }
      .bottom-nav { display: none; }
    }
    
    /* Touch-friendly buttons (min 44px) */
    .btn, button, a.btn, 
    input[type="submit"],
    .nav-item,
    .menu-item {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Collapsible sections */
    .collapsible-header { cursor: pointer; user-select: none; }
    .collapsible-content { 
      max-height: 0; 
      overflow: hidden; 
      transition: max-height 0.3s ease;
    }
    .collapsible-content.open { max-height: 1000px; }
    .collapsible-icon { transition: transform 0.3s ease; }
    .collapsible-icon.rotated { transform: rotate(180deg); }
    
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
    /* Focus styles for accessibility */
    *:focus-visible {
      outline: 2px solid var(--accent-blue);
      outline-offset: 2px;
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
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
  <!-- DASH-08 Accessibility: Skip navigation link -->
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-500 focus:text-white focus:rounded-lg">
    Skip to main content
  </a>
  <!-- Mobile Header -->
  <header class="mobile-header fixed top-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-xl border-b border-white/5 z-50 px-4 flex items-center justify-between">
    <button id="mobile-menu-btn" class="btn p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">
      <i class="fas fa-bars text-xl"></i>
    </button>
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center">
        <i class="fas fa-network-wired text-white text-sm"></i>
      </div>
      <span class="font-bold text-white">Pingup</span>
    </div>
    <button id="theme-toggle" class="btn p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white" onclick="toggleTheme()">
      <i class="fas fa-moon text-xl" id="theme-icon"></i>
    </button>
  </header>

  <!-- Bottom Navigation for Mobile -->
  <nav class="bottom-nav fixed bottom-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-xl border-t border-white/5 z-50 px-2 py-2 justify-around items-center">
    <a href="/dashboard" class="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-blue-400 transition">
      <i class="fas fa-home text-xl"></i>
      <span class="text-xs mt-1">Home</span>
    </a>
    <a href="/dashboard/agents" class="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-blue-400 transition">
      <i class="fas fa-server text-xl"></i>
      <span class="text-xs mt-1">Agenti</span>
    </a>
    <a href="/dashboard/security" class="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-blue-400 transition">
      <i class="fas fa-shield-alt text-xl"></i>
      <span class="text-xs mt-1">Sicurezza</span>
    </a>
    <button id="mobile-user-btn" class="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-blue-400 transition">
      <i class="fas fa-user text-xl"></i>
      <span class="text-xs mt-1">Profilo</span>
    </button>
  </nav>

  <!-- Mobile Menu Overlay -->
  <div id="mobile-overlay" class="fixed inset-0 bg-black/50 z-40 hidden" onclick="closeMobileMenu()"></div>
  
  <script>
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('hidden');
      });
    }
    
    function closeMobileMenu() {
      if (sidebar) sidebar.classList.remove('open');
      if (mobileOverlay) mobileOverlay.classList.add('hidden');
    }
    
    // Close menu on navigation
    document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
    
    // Collapsible sections
    document.querySelectorAll('.collapsible-header').forEach(header => {
      header.addEventListener('click', function() {
        const content = this.nextElementSibling;
        const icon = this.querySelector('.collapsible-icon');
        if (content) content.classList.toggle('open');
        if (icon) icon.classList.toggle('rotated');
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Close mobile menu on Escape
      if (e.key === 'Escape') {
        closeMobileMenu();
        closeModal();
      }
      
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // DASH-05 Keyboard Shortcuts
      if (e.key === '?') {
        e.preventDefault();
        showShortcutsHelp();
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[name="search"]');
        if (searchInput) (searchInput as HTMLInputElement).focus();
      }
      if (e.key === 'g') {
        // g+d = Dashboard, g+a = Agents, g+s = Settings
        setTimeout(() => {
          if (pendingKey === 'g') {
            const nextKey = prompt('Go to: d=Dashboard, a=Agents, s=Settings');
            if (nextKey === 'd') window.location.href = '/dashboard';
            if (nextKey === 'a') window.location.href = '/dashboard/agents';
            if (nextKey === 's') window.location.href = '/dashboard/security';
          }
        }, 500);
      }
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.location.reload();
      }
    });
    
    let pendingKey = '';
    document.addEventListener('keydown', function(e) {
      if (e.key === 'g') pendingKey = 'g';
      else pendingKey = '';
    });
    
    // DASH-04 Offline Support
    const CACHE_KEY = 'pingup_cache';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    
    function isOnline() {
      return navigator.onLine;
    }
    
    function getCachedData() {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(CACHE_KEY);
          return null;
        }
        return data;
      } catch {
        return null;
      }
    }
    
    function setCachedData(data: any) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch {
        // Ignore storage errors
      }
    }
    
    function updateOnlineStatus() {
      const indicator = document.getElementById('online-indicator');
      const statusBadge = document.getElementById('connection-status');
      
      if (!isOnline()) {
        // Show offline indicator
        if (indicator) {
          indicator.classList.remove('hidden');
          indicator.innerHTML = '<i class="fas fa-wifi mr-2"></i>Offline - dati potrebbero non essere aggiornati';
        }
        if (statusBadge) {
          statusBadge.className = 'px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/20';
          statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle text-xs mr-2"></i>Offline';
        }
        
        // Load cached data
        const cached = getCachedData();
        if (cached) {
          console.log('Loaded data from cache');
        }
      } else {
        // Online
        if (indicator) indicator.classList.add('hidden');
        if (statusBadge) {
          statusBadge.className = 'px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/20';
          statusBadge.innerHTML = '<i class="fas fa-circle text-xs mr-2 animate-pulse"></i>Connesso';
        }
      }
    }
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial status check
    updateOnlineStatus();
    
    // Add offline indicator to header if needed
    const header = document.querySelector('header');
    if (header && !document.getElementById('online-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'online-indicator';
      indicator.className = 'hidden fixed top-16 left-0 right-0 bg-yellow-500/90 text-yellow-900 text-center py-2 text-sm z-40';
      document.body.insertBefore(indicator, document.body.firstChild);
    }
    
    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('pingup-theme', newTheme);
      updateThemeIcon();
    }
    
    function updateThemeIcon() {
      const icon = document.getElementById('theme-icon');
      if (icon) {
        const theme = document.documentElement.getAttribute('data-theme');
        icon.className = theme === 'dark' ? 'fas fa-moon text-xl' : 'fas fa-sun text-xl';
      }
    }
    
    // Update theme icon on load
    updateThemeIcon();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (!localStorage.getItem('pingup-theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        updateThemeIcon();
      }
    });
    
    // DASH-09 Real-time Updates via Server-Sent Events
    let eventSource = null;
    
    function connectSSE() {
      if (eventSource) eventSource.close();
      
      try {
        eventSource = new EventSource('/api/v1/realtime/events?channel=all');
        
        eventSource.onopen = function() {
          console.log('SSE connected');
          const sseIndicator = document.getElementById('sse-status');
          if (sseIndicator) {
            sseIndicator.className = 'text-green-400 text-xs';
            sseIndicator.innerHTML = '<i class="fas fa-bolt mr-1"></i>Real-time';
          }
        };
        
        eventSource.onmessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeEvent(data);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        };
        
        eventSource.onerror = function() {
          console.log('SSE connection error, reconnecting...');
          const sseIndicator = document.getElementById('sse-status');
          if (sseIndicator) {
            sseIndicator.className = 'text-yellow-400 text-xs';
            sseIndicator.innerHTML = '<i class="fas fa-sync fa-spin mr-1"></i>Reconnecting...';
          }
          eventSource.close();
          setTimeout(connectSSE, 5000);
        };
      } catch (e) {
        console.error('Failed to connect SSE:', e);
      }
    }
    
    function handleRealtimeEvent(data) {
      if (data.type === 'agent_status') {
        const statusEl = document.getElementById('agent-status-' + data.agent_id);
        if (statusEl) {
          statusEl.textContent = data.status;
          statusEl.className = data.status === 'online' ? 'text-green-400' : 'text-gray-400';
        }
      }
      if (data.type === 'metrics_update') {
        console.log('New metrics for', data.agent_id);
      }
      if (data.type === 'alert_triggered') {
        showNotification(data.alert);
      }
    }
    
    function showNotification(alert) {
      const notification = new Notification('Pingup Alert', {
        body: alert.message || 'New alert triggered',
        icon: '/favicon.ico'
      });
    }
    
    // Connect SSE on dashboard pages
    if (window.location.pathname.startsWith('/dashboard')) {
      connectSSE();
    }
    
    // DASH-10 PWA Support - Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
          .then(function(registration) {
            console.log('SW registered:', registration.scope);
          })
          .catch(function(error) {
            console.log('SW registration failed:', error);
          });
      });
    }
  </script>
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
            <i class="fas fa-network-wired text-white text-2xl"></i>
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

function demoUsersHtml(): string {
  const style: Record<DemoUser["role"], { badge: string; icon: string }> = {
    ADM: { badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", icon: "fa-crown" },
    SUP: { badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: "fa-shield-halved" },
    IT: { badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: "fa-screwdriver-wrench" },
    PUB: { badge: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: "fa-eye" },
  };

  const rows = DEMO_USERS.map((d) => {
    const s = style[d.role];
    return `
            <button type="button" onclick="useDemo('${d.username}','${d.password}')"
              class="w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition group">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-bold px-2 py-1 rounded-lg border ${s.badge}">
                  <i class="fas ${s.icon} mr-1"></i>${d.role}
                </span>
                <div>
                  <p class="text-sm text-white font-medium">${d.username}</p>
                  <p class="text-xs text-gray-500"><i class="fas fa-key mr-1"></i>${d.password}</p>
                </div>
              </div>
              <span class="text-xs text-gray-500 group-hover:text-purple-300 transition"><i class="fas fa-arrow-right"></i> Usa</span>
            </button>`;
  }).join("");

  return `
      <div class="card-glass rounded-2xl p-6 mt-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-semibold text-gray-300">
            <i class="fas fa-flask text-purple-400 mr-2"></i>Utenti dimostrativi
          </h2>
          <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">DEV</span>
        </div>
        <p class="text-xs text-gray-500 mb-4">Un account per ogni livello di accesso. Disponibili solo da <code class="text-gray-400">localhost</code> in modalità dev.</p>
        <div class="space-y-2">${rows}</div>
        <p class="text-xs text-gray-600 mt-4"><i class="fas fa-info-circle mr-1"></i>Clicca <span class="text-gray-400">Usa</span> per precompilare il modulo nella scheda Password.</p>
      </div>`;
}

function useDemoScript(): string {
  return `
    function useDemo(username, password) {
      var tabPassword = document.getElementById('tabPassword');
      var tabTOTP = document.getElementById('tabTOTP');
      var passwordSection = document.getElementById('passwordSection');
      var totpSection = document.getElementById('totpSection');
      if (tabPassword && tabTOTP && passwordSection && totpSection) {
        tabPassword.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition';
        tabTOTP.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-400 transition';
        passwordSection.style.display = 'block';
        totpSection.style.display = 'none';
      }
      var form = document.getElementById('passwordForm');
      if (form) {
        form.querySelector('[name="username"]').value = username;
        form.querySelector('[name="password"]').value = password;
      }
      var error = document.getElementById('error');
      if (error) {
        error.style.display = 'none';
        error.innerHTML = 'Accesso come <strong>' + username + '</strong> (' + username.replace('demo.', '') + ')';
        error.className = 'mt-4 p-4 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm';
        error.style.display = 'block';
      }
    }`;
}

export function getLoginPage(showDemoUsers: boolean = process.env.NODE_ENV !== "production") {
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
        <!-- Tabs -->
        <div class="flex mb-6 bg-gray-800/50 rounded-xl p-1">
          <button type="button" id="tabPassword" class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition">
            <i class="fas fa-lock mr-2"></i>Password
          </button>
          <button type="button" id="tabTOTP" class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition">
            <i class="fas fa-mobile-alt mr-2"></i>TOTP
          </button>
        </div>

        <!-- Password Login -->
        <div id="passwordSection">
          <form id="passwordForm" action="/api/v1/auth/login-password" method="POST" class="space-y-4">
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
              <i class="fas fa-sign-in-alt mr-2"></i>Accedi
            </button>
          </form>
        </div>

        <!-- TOTP Login -->
        <div id="totpSection" class="hidden">
          <form id="totpForm" action="/api/v1/auth/login" method="POST" class="space-y-4">
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

        <div id="error" class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm hidden"></div>

        <div class="text-center mt-6">
          <a href="/register" class="text-blue-400 hover:text-blue-300 text-sm">
            Non hai un account? <span class="font-semibold">Registrati</span>
          </a>
          <span class="text-gray-500 mx-2">|</span>
          <a href="/forgot-password" class="text-purple-400 hover:text-purple-300 text-sm">
            Password dimenticata?
          </a>
        </div>
      </div>

      ${showDemoUsers ? demoUsersHtml() : ""}
    </div>
  </div>

  <script>
    // Tab switching - simplified
    document.addEventListener('DOMContentLoaded', function() {
      var tabPassword = document.getElementById('tabPassword');
      var tabTOTP = document.getElementById('tabTOTP');
      var passwordSection = document.getElementById('passwordSection');
      var totpSection = document.getElementById('totpSection');
      
      if (tabPassword && tabTOTP && passwordSection && totpSection) {
        tabPassword.onclick = function() {
          tabPassword.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition';
          tabTOTP.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-400 transition';
          passwordSection.style.display = 'block';
          totpSection.style.display = 'none';
        };
        
tabTOTP.onclick = function() {
          tabTOTP.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition';
          tabPassword.className = 'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-400 transition';
          totpSection.style.display = 'block';
          passwordSection.style.display = 'none';
        };
      }
    });

    ${showDemoUsers ? useDemoScript() : ""}
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
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-network-wired text-white"></i>
          </div>
          <div class="sidebar-title">
            <h1 class="text-xl font-bold gradient-text">Pingup</h1>
            <p class="text-xs text-gray-500 -mt-1">Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav class="space-y-1.5">
        <a href="/dashboard" class="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/20 hover:from-blue-500/30 hover:to-purple-500/30 transition btn">
          <i class="fas fa-home w-5"></i> <span class="nav-text font-medium">Dashboard</span>
        </a>
        
        ${hasRole(user.role, "IT") ? `
        <a href="/dashboard/agents" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-server w-5"></i> <span class="nav-text font-medium">Agenti</span>
        </a>
        <a href="/dashboard/commands" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-terminal w-5"></i> <span class="nav-text font-medium">Comandi</span>
        </a>
        <a href="/dashboard/topology" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-project-diagram w-5"></i> <span class="nav-text font-medium">Topologia</span>
        </a>
        ` : ''}
        
        ${hasRole(user.role, "SUP") ? `
        <a href="/dashboard/security" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-shield-alt w-5"></i> <span class="nav-text font-medium">Sicurezza</span>
        </a>
        <a href="/dashboard/siem" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-radar w-5"></i> <span class="nav-text font-medium">SIEM</span>
        </a>
        ` : ''}
        
        ${hasRole(user.role, "ADM") ? `
        <a href="/dashboard/users" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-users w-5"></i> <span class="nav-text font-medium">Utenti</span>
        </a>
        <a href="/dashboard/audit" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition border border-transparent hover:border-white/5 btn">
          <i class="fas fa-clipboard-list w-5"></i> <span class="nav-text font-medium">Audit Log</span>
        </a>
        ` : ''}
      </nav>
      
      <div class="absolute bottom-4 left-4 right-4">
        <div class="glass-card rounded-2xl p-4 mb-3 border border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-r ${roleColors[user.role]} flex items-center justify-center shadow-lg flex-shrink-0">
              <i class="fas fa-user text-white"></i>
            </div>
            <div class="user-info flex-1 min-w-0">
              <p class="font-semibold text-white truncate">${user.username}</p>
              <p class="text-xs text-gray-400">${roleLabels[user.role]}</p>
            </div>
          </div>
        </div>
        
        <a href="/api/v1/auth/logout" class="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/20 btn">
          <i class="fas fa-sign-out-alt"></i> <span class="nav-text font-medium">Logout</span>
        </a>
      </div>
    </aside>
    
    <main id="main-content" class="content flex-1 p-4 md:p-6 lg:p-8 relative z-10 pt-16 pb-24 md:pt-20 lg:pt-8 lg:pb-8">
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

dashboardRouter.get("/", async (c) => {
  // Check if user is logged in
  const token = getCookie(c, "auth_token");
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return c.redirect("/dashboard");
    }
  }
  
  // Not logged in - show public page
  const stats = getPublicStats();
  
  let html = (HTML_HEADER + PUBLIC_DASHBOARD)
    .replaceAll("{{HEALTH_SCORE}}", stats.healthScore.toString())
    .replaceAll("{{ONLINE_AGENTS}}", stats.onlineAgents.toString())
    .replaceAll("{{TOTAL_AGENTS}}", stats.totalAgents.toString())
    .replaceAll("{{AVG_CPU}}", stats.avgCpu.toString())
    .replaceAll("{{AVG_RAM}}", stats.avgRam.toString());
  
  return c.html(html);
});

dashboardRouter.get("/login", async (c) => {
  // Check if user is already logged in
  const token = getCookie(c, "auth_token");
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return c.redirect("/dashboard");
    }
  }
  
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

dashboardRouter.get("/dashboard/agents", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  const agents = listAgents();
  
  return c.html(getAgentsPage({ username: user!.username, role: user!.role }, agents));
});

dashboardRouter.get("/dashboard/commands", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  const db = getDb();
  const commands = db.prepare("SELECT * FROM commands ORDER BY created_at DESC LIMIT 50").all();
  const agents = listAgents();
  
  return c.html(getCommandsPage({ username: user!.username, role: user!.role }, commands, agents));
});

dashboardRouter.get("/dashboard/topology", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "IT")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  
  return c.html(getTopologyPage({ username: user!.username, role: user!.role }));
});

dashboardRouter.get("/dashboard/users", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  const users = listUsers();
  
  return c.html(getUsersPage({ username: user!.username, role: user!.role }, users));
});

dashboardRouter.get("/dashboard/audit", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "ADM")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  const db = getDb();
  const logs = db.prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100").all();
  
  return c.html(getAuditPage({ username: user!.username, role: user!.role }, logs));
});

dashboardRouter.get("/dashboard/security", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "SUP")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  const agents = listAgents();
  
  return c.html(getSecurityPage({ username: user!.username, role: user!.role }, agents));
});

dashboardRouter.get("/dashboard/siem", async (c) => {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.redirect("/login");
  }
  
  const payload = await verifyToken(token);
  
  if (!payload || !hasRole(payload.role, "SUP")) {
    return c.redirect("/dashboard");
  }
  
  const user = getUserById(payload.sub);
  
  const { getSiemOverview, listSiemAssets, listSiemFindings } = await import("../services/siem.ts");
  const overview = getSiemOverview();
  const assets = listSiemAssets();
  const findings = listSiemFindings({ status: "open" });
  const agents = listAgents();
  
  return c.html(
    getSiemPage({ username: user!.username, role: user!.role }, overview, assets, findings, agents)
  );
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

dashboardRouter.get("/forgot-password", (c) => {
  return c.html(getForgotPasswordPage());
});

dashboardRouter.post("/forgot-password", async (c) => {
  const body = await c.req.parseBody();
  const username = body.username as string;
  
  try {
    const res = await fetch(`${c.req.header("origin") || "http://localhost:3000"}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return c.html(getForgotPasswordPage(data.error));
    }
    
    return c.html(getResetPasswordPage(username, data.reset_token));
  } catch (error) {
    return c.html(getForgotPasswordPage((error as Error).message));
  }
});

function getForgotPasswordPage(error?: string) {
  return HTML_HEADER + `
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
          <i class="fas fa-key text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-white">Recupera Password</h1>
        <p class="text-gray-400 mt-2">Inserisci il tuo username</p>
      </div>

      <div class="card-glass rounded-2xl p-8">
        ${error ? `<div class="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">${error}</div>` : ''}
        
        <form method="POST" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input type="text" name="username" required
              class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
          </div>
          <button type="submit"
            class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition">
            <i class="fas fa-paper-plane mr-2"></i>Invia richiesta
          </button>
        </form>

        <div class="text-center mt-6">
          <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
            Torna al <span class="font-semibold">Login</span>
          </a>
        </div>
      </div>
    </div>
  </div>
  `;
}

function getResetPasswordPage(username: string, resetToken: string, error?: string) {
  return HTML_HEADER + `
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 mb-4">
          <i class="fas fa-lock text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-white">Nuova Password</h1>
        <p class="text-gray-400 mt-2">Inserisci la tua nuova password</p>
      </div>

      <div class="card-glass rounded-2xl p-8">
        ${error ? `<div class="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">${error}</div>` : ''}
        
        <form id="resetForm" class="space-y-4">
          <input type="hidden" name="username" value="${username}">
          <input type="hidden" name="reset_token" value="${resetToken}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Nuova Password</label>
            <input type="password" name="new_password" required minlength="6"
              class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Conferma Password</label>
            <input type="password" name="confirm_password" required minlength="6"
              class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
          </div>
          <button type="submit"
            class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition">
            <i class="fas fa-save mr-2"></i>Reimposta Password
          </button>
        </form>

        <div class="text-center mt-6">
          <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
            Torna al <span class="font-semibold">Login</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const newPassword = form.get('new_password');
      const confirmPassword = form.get('confirm_password');
      
      if (newPassword !== confirmPassword) {
        alert('Le password non coincidono!');
        return;
      }
      
      try {
        const res = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.get('username'),
            reset_token: form.get('reset_token'),
            new_password: newPassword
          })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          alert(data.error || 'Password reset failed');
          return;
        }
        
        alert('Password reimpostata con successo! Ora puoi effettuare il login.');
        window.location.href = '/login';
      } catch (err) {
        alert('Errore: ' + err.message);
      }
    });
  </script>
  `;
}

function getAgentsPage(user: { username: string; role: string }, agents: any[]) {
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-3xl font-bold text-white">Agenti</h1>
          <p class="text-gray-400 mt-1">Gestisci gli agenti di monitoraggio</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button onclick="document.getElementById('addAgentForm').classList.toggle('hidden')"
            class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold transition">
            <i class="fas fa-plus mr-2"></i>Nuovo agente
          </button>
          <button onclick="exportCSV(window.__agents, 'agenti.csv')"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-csv mr-2"></i>CSV
          </button>
          <button onclick="exportJSON(window.__agents, 'agenti.json')"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-code mr-2"></i>JSON
          </button>
        </div>
      </div>
    </div>

    <div id="addAgentForm" class="hidden glass-card rounded-3xl p-6 mb-6">
      <h2 class="text-lg font-semibold text-white mb-4"><i class="fas fa-server text-blue-400 mr-2"></i>Registra nuovo agente</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="text" id="agentIdInput" placeholder="ID agente (es. AGENT-002)" class="bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
        <input type="text" id="agentNameInput" placeholder="Nome (es. Server Milano)" class="bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
        <button onclick="createAgent()" class="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition">
          <i class="fas fa-check mr-2"></i>Crea
        </button>
      </div>
      <div id="agentFormError" class="mt-3 text-sm text-red-400 hidden"></div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">ID</th>
              <th class="pb-4 font-medium">Nome</th>
              <th class="pb-4 font-medium">Stato</th>
              <th class="pb-4 font-medium">Ultimo contatto</th>
              <th class="pb-4 font-medium">Azioni</th>
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
              <td class="py-4">
                <div class="flex items-center gap-2">
                  <button onclick="scanAgent('${agent.id}')" title="Avvia scansione rete"
                    class="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-sm">
                    <i class="fas fa-broadcast-tower"></i>
                  </button>
                  <button onclick="renameAgent('${agent.id}')" title="Rinomina"
                    class="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition text-sm">
                    <i class="fas fa-pen"></i>
                  </button>
                  <button onclick="deleteAgent('${agent.id}')" title="Elimina"
                    class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            `).join('')}
            ${agents.length === 0 ? '<tr><td colspan="5" class="py-12 text-center text-gray-500"><i class="fas fa-server text-4xl mb-3 opacity-30"></i><p>Nessun agente registrato</p></td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <script>
      window.__agents = ${JSON.stringify(agents.map(a => ({ id: a.id, name: a.name, status: a.status, last_seen: a.last_seen })))};

      function createAgent() {
        var id = document.getElementById('agentIdInput').value.trim();
        var name = document.getElementById('agentNameInput').value.trim();
        var err = document.getElementById('agentFormError');
        err.classList.add('hidden');
        if (!id) { err.textContent = 'ID agente obbligatorio'; err.classList.remove('hidden'); return; }
        apiJson('POST', '/api/v1/agents', { id: id, name: name || undefined })
          .then(function() { toast('Agente ' + id + ' creato', true); location.reload(); })
          .catch(function(e) { err.textContent = e.message; err.classList.remove('hidden'); });
      }

      function scanAgent(id) {
        apiJson('POST', '/api/v1/discovery/scan', { agentId: id })
          .then(function(d) { toast('Scansione avviata per ' + id + ' (attesa agente)', true); })
          .catch(function(e) { toast(e.message, false); });
      }

      function renameAgent(id) {
        var name = window.prompt('Nuovo nome per ' + id);
        if (name === null) return;
        apiJson('PATCH', '/api/v1/agents/' + encodeURIComponent(id), { name: name })
          .then(function() { toast('Agente rinominato', true); location.reload(); })
          .catch(function(e) { toast(e.message, false); });
      }

      function deleteAgent(id) {
        if (!window.confirm('Eliminare l\\'agente ' + id + '?')) return;
        apiJson('DELETE', '/api/v1/agents/' + encodeURIComponent(id))
          .then(function() { toast('Agente eliminato', true); location.reload(); })
          .catch(function(e) { toast(e.message, false); });
      }
    </script>
  ` + getDashboardFooter();
}

function getCommandsPage(user: { username: string; role: string }, commands: any[], agents: any[] = []) {
  const actions = ["ping", "run_discovery", "restart_service", "update_config", "execute"];
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-3xl font-bold text-white">Comandi</h1>
          <p class="text-gray-400 mt-1">Invia comandi remoti agli agenti</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="document.getElementById('addCommandForm').classList.toggle('hidden')"
            class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold transition">
            <i class="fas fa-plus mr-2"></i>Nuovo comando
          </button>
          <button onclick="exportCSV(window.__commands, 'comandi.csv')"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-csv mr-2"></i>CSV
          </button>
          <button onclick="exportJSON(window.__commands, 'comandi.json')"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-code mr-2"></i>JSON
          </button>
        </div>
      </div>
    </div>

    <div id="addCommandForm" class="hidden glass-card rounded-3xl p-6 mb-6">
      <h2 class="text-lg font-semibold text-white mb-4"><i class="fas fa-terminal text-purple-400 mr-2"></i>Invia comando</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Agente</label>
          <select id="cmdAgent" class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            ${agents.map(a => `<option value="${a.id}">${a.name || a.id}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Azione</label>
          <select id="cmdAction" onchange="document.getElementById('cmdParamRow').style.display = this.value === 'execute' || this.value === 'restart_service' ? 'block' : 'none'"
            class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            ${actions.map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
        </div>
        <div id="cmdParamRow" class="hidden md:col-span-2">
          <label class="block text-sm font-medium text-gray-300 mb-2">Parametri (JSON)</label>
          <input type="text" id="cmdParams" placeholder='{"command":"ipconfig"}' class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
        </div>
        <button onclick="sendCommand()" class="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition">
          <i class="fas fa-paper-plane mr-2"></i>Invia
        </button>
      </div>
      <div id="commandFormError" class="mt-3 text-sm text-red-400 hidden"></div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">ID</th>
              <th class="pb-4 font-medium">Agente</th>
              <th class="pb-4 font-medium">Azione</th>
              <th class="pb-4 font-medium">Stato</th>
              <th class="pb-4 font-medium">Risultato</th>
              <th class="pb-4 font-medium">Data</th>
              <th class="pb-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            ${commands.map(cmd => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 font-mono text-sm text-purple-400">${cmd.id}</td>
              <td class="py-4 text-white">${cmd.agent_id}</td>
              <td class="py-4 text-gray-300 font-mono text-sm">${cmd.action}</td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium ${cmd.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : cmd.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}">
                  ${cmd.status}
                </span>
              </td>
              <td class="py-4 text-gray-400 text-sm max-w-[280px] truncate">${cmd.result || '-'}</td>
              <td class="py-4 text-gray-400 text-sm">${cmd.created_at}</td>
              <td class="py-4 text-right">
                <button onclick="deleteCommand('${cmd.id}')" title="Elimina"
                  class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
            `).join('')}
            ${commands.length === 0 ? '<tr><td colspan="7" class="py-12 text-center text-gray-500"><i class="fas fa-terminal text-4xl mb-3 opacity-30"></i><p>Nessun comando eseguito</p></td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <script>
      window.__commands = ${JSON.stringify(commands.map(cm => ({ id: cm.id, agent_id: cm.agent_id, action: cm.action, status: cm.status, result: typeof cm.result === 'string' ? cm.result : JSON.stringify(cm.result || ''), created_at: cm.created_at })))};

      function sendCommand() {
        var agentId = document.getElementById('cmdAgent').value;
        var action = document.getElementById('cmdAction').value;
        var paramsRaw = document.getElementById('cmdParams').value.trim();
        var err = document.getElementById('commandFormError');
        err.classList.add('hidden');

        var params = {};
        if (paramsRaw) {
          try { params = JSON.parse(paramsRaw); }
          catch (e) { err.textContent = 'Parametri non validi: ' + e.message; err.classList.remove('hidden'); return; }
        }

        apiJson('POST', '/api/v1/commands', { agent_id: agentId, action: action, params: params })
          .then(function() { toast('Comando ' + action + ' inviato a ' + agentId, true); location.reload(); })
          .catch(function(e) { err.textContent = e.message; err.classList.remove('hidden'); });
      }

      function deleteCommand(id) {
        if (!window.confirm('Eliminare il comando ' + id + '?')) return;
        apiJson('DELETE', '/api/v1/commands/' + encodeURIComponent(id))
          .then(function() { toast('Comando eliminato', true); location.reload(); })
          .catch(function(e) { toast(e.message, false); });
      }
    </script>
  ` + getDashboardFooter();
}

function getUsersPage(user: { username: string; role: string }, users: any[]) {
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
  
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Utenti</h1>
          <p class="text-gray-400 mt-1">Gestisci gli account utente</p>
        </div>
        <a href="/register" class="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition">
          <i class="fas fa-user-plus mr-2"></i>Nuovo Utente
        </a>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">Username</th>
              <th class="pb-4 font-medium">Ruolo</th>
              <th class="pb-4 font-medium">Stato</th>
              <th class="pb-4 font-medium">Ultimo accesso</th>
              <th class="pb-4 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 font-medium text-white">${u.username}</td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${roleColors[u.role]} text-white">
                  ${roleLabels[u.role]}
                </span>
              </td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}">
                  ${u.status}
                </span>
              </td>
              <td class="py-4 text-gray-400 text-sm">${u.last_login || 'Mai'}</td>
              <td class="py-4">
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-sm">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` + getDashboardFooter();
}

function getAuditPage(user: { username: string; role: string }, logs: any[]) {
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Audit Log</h1>
          <p class="text-gray-400 mt-1">Registro attività di sistema</p>
        </div>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">Timestamp</th>
              <th class="pb-4 font-medium">Utente</th>
              <th class="pb-4 font-medium">Azione</th>
              <th class="pb-4 font-medium">Dettagli</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 text-gray-400 text-sm font-mono">${log.timestamp}</td>
              <td class="py-4 text-white">${log.user_id || '-'}</td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  ${log.action}
                </span>
              </td>
              <td class="py-4 text-gray-300 text-sm">${log.details || '-'}</td>
            </tr>
            `).join('')}
            ${logs.length === 0 ? '<tr><td colspan="4" class="py-12 text-center text-gray-500"><i class="fas fa-clipboard-list text-4xl mb-3 opacity-30"></i><p>Nessun log disponibile</p></td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  ` + getDashboardFooter();
}

function getSecurityPage(user: { username: string; role: string }, agents: any[]) {
  const onlineCount = agents.filter(a => a.status === "online").length;
  const offlineCount = agents.filter(a => a.status !== "online").length;
  
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Sicurezza</h1>
          <p class="text-gray-400 mt-1">Panoramica sicurezza sistema</p>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="glass-card rounded-3xl p-6 glow-green">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border border-green-500/20">
            <i class="fas fa-shield-alt text-green-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Agenti Sicuri</p>
        <p class="text-4xl font-bold text-green-400 mt-1">${onlineCount}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-red">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-orange-500/30 flex items-center justify-center border border-red-500/20">
            <i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Agenti Offline</p>
        <p class="text-4xl font-bold text-red-400 mt-1">${offlineCount}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center border border-blue-500/20">
            <i class="fas fa-history text-blue-400 text-2xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm font-medium">Totale Agenti</p>
        <p class="text-4xl font-bold text-white mt-1">${agents.length}</p>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <h2 class="text-xl font-semibold text-white mb-6">
        <i class="fas fa-server text-blue-400 mr-3"></i>Stato Agenti
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">Agente</th>
              <th class="pb-4 font-medium">Stato</th>
              <th class="pb-4 font-medium">Ultimo contatto</th>
            </tr>
          </thead>
          <tbody>
            ${agents.map(agent => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 font-mono text-sm text-blue-400">${agent.id}</td>
              <td class="py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium ${agent.status === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}">
                  ${agent.status}
                </span>
              </td>
              <td class="py-4 text-gray-400 text-sm">${agent.last_seen || 'Mai'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` + getDashboardFooter();
}

function severityStyles(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    info: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  };
  return map[severity] || map.info;
}

function riskColor(riskLabel: string) {
  const map: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-blue-400",
    clean: "text-green-400",
  };
  return map[riskLabel] || "text-gray-400";
}

function getSiemPage(
  user: { username: string; role: string },
  overview: any,
  assets: any[],
  findings: any[],
  agents: any[] = []
) {
  const critical = overview.bySeverity?.critical || 0;
  const high = overview.bySeverity?.high || 0;
  const medium = overview.bySeverity?.medium || 0;
  const low = overview.bySeverity?.low || 0;

  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-3xl font-bold text-white">SIEM</h1>
          <p class="text-gray-400 mt-1">Monitoraggio vulnerabilità dispositivi di rete</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <span class="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-sm font-medium border border-white/10">
            <i class="fas fa-clock text-blue-400 mr-2"></i>Ultimo scan: ${overview.lastScan || 'Mai'}
          </span>
          <select id="siemAgent" class="bg-gray-800/50 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            ${agents.map(a => `<option value="${a.id}">${a.name || a.id}</option>`).join('')}
            ${agents.length === 0 ? '<option value="">Nessun agente</option>' : ''}
          </select>
          <button onclick="scanSiem()" ${agents.length === 0 ? 'disabled' : ''}
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold transition ${agents.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
            <i class="fas fa-broadcast-tower mr-2"></i>Avvia scansione
          </button>
          <button onclick="exportFindings()"
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-csv mr-2"></i>Export findings
          </button>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center border border-blue-500/20 mb-4">
          <i class="fas fa-network-wired text-blue-400 text-2xl"></i>
        </div>
        <p class="text-gray-400 text-sm font-medium">Dispositivi Rilevati</p>
        <p class="text-4xl font-bold text-white mt-1">${overview.totalAssets}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-red">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-orange-500/30 flex items-center justify-center border border-red-500/20 mb-4">
          <i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
        </div>
        <p class="text-gray-400 text-sm font-medium">Critical + High</p>
        <p class="text-4xl font-bold text-red-400 mt-1">${critical + high}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-500/30 flex items-center justify-center border border-yellow-500/20 mb-4">
          <i class="fas fa-tasks text-yellow-400 text-2xl"></i>
        </div>
        <p class="text-gray-400 text-sm font-medium">Findings Aperti</p>
        <p class="text-4xl font-bold text-yellow-400 mt-1">${overview.totalFindings}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-red">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-rose-500/30 flex items-center justify-center border border-red-500/20 mb-4">
          <i class="fas fa-user-shield text-red-400 text-2xl"></i>
        </div>
        <p class="text-gray-400 text-sm font-medium">Dispositivi a Rischio</p>
        <p class="text-4xl font-bold text-red-400 mt-1">${overview.atRiskAssets}</p>
      </div>
      
      <div class="glass-card rounded-3xl p-6 glow-blue">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center border border-purple-500/20 mb-4">
          <i class="fas fa-chart-line text-purple-400 text-2xl"></i>
        </div>
        <p class="text-gray-400 text-sm font-medium">Rischio Medio</p>
        <p class="text-4xl font-bold text-white mt-1">${overview.avgRiskScore}</p>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8 mb-8">
      <h2 class="text-xl font-semibold text-white mb-6">
        <i class="fas fa-flag text-yellow-400 mr-3"></i>Findings Critici / Alti
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        ${[
          ['critical', critical, 'text-red-400'],
          ['high', high, 'text-orange-400'],
          ['medium', medium, 'text-yellow-400'],
          ['low', low, 'text-blue-400'],
        ].map(([sev, count, color]) => `
          <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p class="text-gray-400 text-sm capitalize">${sev}</p>
            <p class="text-3xl font-bold ${color}">${count}</p>
          </div>
        `).join('')}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">Severity</th>
              <th class="pb-4 font-medium">Finding</th>
              <th class="pb-4 font-medium">CVE</th>
              <th class="pb-4 font-medium">Porta</th>
              <th class="pb-4 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            ${findings.slice(0, 20).map(f => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-3">
                <span class="px-3 py-1.5 rounded-full text-xs font-medium ${severityStyles(f.severity)}">${f.severity}</span>
              </td>
              <td class="py-3 text-gray-300 text-sm">${f.title}</td>
              <td class="py-3 font-mono text-xs text-blue-400">${f.cve_id || '-'}</td>
              <td class="py-3 text-gray-400 text-sm">${f.port || '-'}${f.protocol ? ' (' + f.protocol + ')' : ''}</td>
              <td class="py-3 text-gray-400 text-sm capitalize">${f.status}</td>
            </tr>
            `).join('') || '<tr><td colspan="5" class="py-6 text-center text-gray-500">Nessun finding aperto</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="glass-card rounded-3xl p-8">
      <h2 class="text-xl font-semibold text-white mb-6">
        <i class="fas fa-server text-blue-400 mr-3"></i>Inventario Dispositivi
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-gray-400 border-b border-white/5">
              <th class="pb-4 font-medium">IP</th>
              <th class="pb-4 font-medium">Hostname</th>
              <th class="pb-4 font-medium">Tipo</th>
              <th class="pb-4 font-medium">Vendor</th>
              <th class="pb-4 font-medium">OS</th>
              <th class="pb-4 font-medium">Porte</th>
              <th class="pb-4 font-medium">Rischio</th>
            </tr>
          </thead>
          <tbody>
            ${assets.map(a => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-4 font-mono text-sm text-blue-400">${a.ip || '-'}</td>
              <td class="py-4 text-gray-300 text-sm">${a.hostname || '-'}</td>
              <td class="py-4 text-gray-300 text-sm">${a.device_type || 'other'}</td>
              <td class="py-4 text-gray-400 text-sm">${a.vendor || '-'}</td>
              <td class="py-4 text-gray-400 text-sm">${a.os || '-'}</td>
              <td class="py-4 text-gray-400 text-sm font-mono">${(JSON.parse(a.ports || '[]')).join(', ') || '-'}</td>
              <td class="py-4 font-semibold ${riskColor(a.risk_label)}">${a.risk_label} (${a.risk_score})</td>
            </tr>
            `).join('') || '<tr><td colspan="7" class="py-6 text-center text-gray-500">Nessun dispositivo rilevato. Abilita discovery con profiling sull\'agente.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <script>
      function scanSiem() {
        var agentId = document.getElementById('siemAgent').value;
        if (!agentId) { toast('Nessun agente disponibile', false); return; }
        apiJson('POST', '/api/v1/discovery/scan', { agentId: agentId })
          .then(function() { toast('Scansione avviata per ' + agentId + '. Aggiornamento non appena l\\'agente riporta i risultati.', true); })
          .catch(function(e) { toast(e.message, false); });
      }

      function exportFindings() {
        apiJson('GET', '/api/v1/siem/findings')
          .then(function(d) { exportJSON(d.findings || [], 'siem-findings.json'); })
          .catch(function(e) { toast(e.message, false); });
      }

      window.__siemAssets = ${JSON.stringify(assets.map(a => ({ ip: a.ip, hostname: a.hostname, device_type: a.device_type, vendor: a.vendor, os: a.os, risk_label: a.risk_label, risk_score: a.risk_score })))};
    </script>
  ` + getDashboardFooter();
}

function getTopologyPage(user: { username: string; role: string }) {
  return getDashboardLayout(user) + `
    <div class="mb-8">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-3xl font-bold text-white">Topologia di rete</h1>
          <p class="text-gray-400 mt-1">Mappa 2D dei dispositivi rilevati (agent + discovery)</p>
        </div>
        <div class="flex items-center gap-3">
          <select id="topoAgent" class="bg-gray-800/50 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            <option value="">Tutti gli agenti</option>
          </select>
          <button onclick="loadTopology()"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold transition">
            <i class="fas fa-sync mr-2"></i>Ricarica
          </button>
          <button onclick="exportTopology()"
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition">
            <i class="fas fa-file-code mr-2"></i>JSON
          </button>
        </div>
      </div>
    </div>

    <div class="glass-card rounded-3xl p-6">
      <div id="topologyError" class="hidden mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm"></div>
      <div id="topologyWrap" class="overflow-auto rounded-2xl border border-white/5 bg-white/[0.02]">
        <div id="topologyLoading" class="flex items-center justify-center py-24 text-gray-400">
          <i class="fas fa-spinner fa-spin mr-3"></i>Caricamento topologia...
        </div>
        <svg id="topology" width="100%" height="640" xmlns="http://www.w3.org/2000/svg" style="display:none; min-width: 900px;"></svg>
      </div>
      <div id="topoDetails" class="hidden mt-4 glass-card rounded-2xl p-5"></div>
    </div>

    <script>
      var NODE_COLORS = {
        agent: '#60a5fa',
        router: '#f87171',
        switch: '#fb923c',
        server: '#34d399',
        workstation: '#a78bfa',
        iot: '#fbbf24',
        unknown: '#94a3b8'
      };
      var NODE_SIZE = { agent: 26, router: 22, switch: 20, server: 18, workstation: 16, iot: 14, unknown: 14 };

      window.__topologyCache = { nodes: [], links: [] };
      window.__topologyAgents = [];

      function loadAgents() {
        apiJson('GET', '/api/v1/agents')
          .then(function(d) {
            window.__topologyAgents = d.agents || [];
            var sel = document.getElementById('topoAgent');
            var opts = '<option value="">Tutti gli agenti</option>' + (d.agents || []).map(function(a) {
              return '<option value="' + a.id + '">' + (a.name || a.id) + '</option>';
            }).join('');
            sel.innerHTML = opts;
          }).catch(function(e) { showTopologyError(e.message); });
      }

      function loadTopology() {
        var agentId = document.getElementById('topoAgent').value;
        var url = '/api/v1/topology';
        if (agentId) url += '?agentId=' + encodeURIComponent(agentId);
        document.getElementById('topologyLoading').style.display = 'flex';
        document.getElementById('topology').style.display = 'none';
        document.getElementById('topologyError').classList.add('hidden');
        apiJson('GET', url)
          .then(function(data) {
            window.__topologyCache = data;
            drawTopology(data);
          })
          .catch(function(e) { showTopologyError(e.message); });
      }

      function showTopologyError(msg) {
        var el = document.getElementById('topologyError');
        el.textContent = 'Errore: ' + msg;
        el.classList.remove('hidden');
        document.getElementById('topologyLoading').style.display = 'none';
      }

      function drawTopology(data) {
        var svg = document.getElementById('topology');
        var nodes = data.nodes || [];
        var links = data.links || [];
        var w = Math.max(900, nodes.length * 90);
        var h = Math.max(640, nodes.length * 60);
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);

        var pos = {};
        var count = nodes.length;
        var cx = w / 2, cy = h / 2;
        var radius = Math.min(w, h) / 2 - 60;
        nodes.forEach(function(n, i) {
          var angle = (2 * Math.PI * i) / Math.max(1, count);
          pos[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        });

        var seen = {};
        var out = '';
        links.forEach(function(l) {
          var s = pos[l.source], t = pos[l.target];
          var key = [l.source, l.target].sort().join('|');
          if (!s || !t || seen[key]) return;
          seen[key] = true;
          out += '<line x1="' + s.x.toFixed(1) + '" y1="' + s.y.toFixed(1) + '" x2="' + t.x.toFixed(1) + '" y2="' + t.y.toFixed(1) + '" stroke="rgba(148,163,184,0.35)" stroke-width="1.5" />';
        });

        nodes.forEach(function(n) {
          var p = pos[n.id];
          if (!p) return;
          var color = NODE_COLORS[n.type] || NODE_COLORS.unknown;
          var size = NODE_SIZE[n.type] || NODE_SIZE.unknown;
          out += '<g onclick="showDevice(\'' + (n.ip || n.id).replace(/'/g, '') + '\')" style="cursor:pointer">';
          out += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + size + '" fill="' + color + '" fill-opacity="0.25" stroke="' + color + '" stroke-width="2" />';
          out += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (size - 6) + '" fill="' + color + '" />';
          out += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - size - 6).toFixed(1) + '" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter, sans-serif">' + (n.label || n.id).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
          out += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + size + 14).toFixed(1) + '" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="Inter, sans-serif">' + (n.type || '') + '</text>';
          out += '</g>';
        });

        svg.innerHTML = out;
        document.getElementById('topologyLoading').style.display = 'none';
        svg.style.display = 'block';
        if (count === 0) {
          showTopologyError('Nessun nodo disponibile. Esegui una scansione di rete.');
        }
      }

      function showDevice(ip) {
        if (!ip || ip === 'unknown') { renderDeviceList(''); return; }
        apiJson('GET', '/api/v1/topology/device/' + encodeURIComponent(ip))
          .then(function(d) { renderDeviceList(d); })
          .catch(function(e) { renderDeviceList(null); });
      }

      function renderDeviceList(d) {
        var box = document.getElementById('topoDetails');
        box.classList.remove('hidden');
        if (!d) {
          box.innerHTML = '<p class="text-sm text-gray-400">Nessun dettaglio disponibile per questo nodo.</p>';
          return;
        }
        box.innerHTML = '<div class="flex items-center justify-between mb-3">' +
          '<h3 class="text-lg font-semibold text-white"><i class="fas fa-network-wired text-blue-400 mr-2"></i>' + d.ip + '</h3>' +
          '<button onclick="document.getElementById(\'topoDetails\').classList.add(\'hidden\')" class="text-gray-500 hover:text-white"><i class="fas fa-times"></i></button></div>' +
          '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">' +
          '<div><p class="text-gray-500 text-xs">Latenza</p><p class="text-white">' + (d.latency ?? '-') + ' ms</p></div>' +
          '<div><p class="text-gray-500 text-xs">Porte aperte</p><p class="text-white font-mono">' + ((d.ports || []).join(', ') || '-') + '</p></div>' +
          '<div><p class="text-gray-500 text-xs">Durata scan</p><p class="text-white">' + (d.scan_duration ?? '-') + ' ms</p></div>' +
          '<div><p class="text-gray-500 text-xs">Ultimo rilevamento</p><p class="text-white">' + (d.last_seen || '-') + '</p></div>' +
          '</div>';
      }

      function exportTopology() {
        exportJSON(window.__topologyCache, 'topologia.json');
      }

      loadAgents();
      loadTopology();
    </script>
  ` + getDashboardFooter();
}

function getDashboardFooter() {
  return `
    </main>
  </div>
  <script>
    function apiJson(method, url, body) {
      return fetch(url, {
        method: method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }).then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || d.message || 'Errore ' + res.status); });
        return res.json();
      });
    }

    function download(filename, content, mime) {
      var blob = new Blob([content], { type: mime });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    }

    function csvEscape(v) {
      var s = String(v === undefined || v === null ? '' : v);
      return /[",\\n\\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function exportCSV(rows, filename) {
      var keys = [];
      rows.forEach(function(r) { Object.keys(r).forEach(function(k) { if (keys.indexOf(k) === -1) keys.push(k); }); });
      var lines = [keys.map(csvEscape).join(',')];
      rows.forEach(function(r) {
        lines.push(keys.map(function(k) { return csvEscape(r[k]); }).join(','));
      });
      download(filename, lines.join('\\n'), 'text/csv;charset=utf-8');
    }

    function exportJSON(data, filename) {
      download(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    }

    function toast(msg, ok) {
      var el = document.createElement('div');
      el.className = 'fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-medium border shadow-2xl ' +
        (ok ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30');
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 4000);
    }
  </script>
  <script src="/dashboard.js"></script>
  <script src="/dashboard-features.js"></script>
</body>
</html>
`;
}
