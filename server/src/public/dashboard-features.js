/* eslint-disable no-unused-vars */
// DASH-04 Offline Support
const CACHE_KEY = 'pingup_cache';
const CACHE_EXPIRY = 5 * 60 * 1000;

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
  } catch { return null; }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  const statusBadge = document.getElementById('connection-status');
  
  if (!isOnline()) {
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.innerHTML = '<i class="fas fa-wifi mr-2"></i>Offline';
    }
    if (statusBadge) {
      statusBadge.className = 'px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/20';
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle text-xs mr-2"></i>Offline';
    }
  } else {
    if (indicator) indicator.classList.add('hidden');
    if (statusBadge) {
      statusBadge.className = 'px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/20';
      statusBadge.innerHTML = '<i class="fas fa-circle text-xs mr-2 animate-pulse"></i>Connesso';
    }
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

if (!document.getElementById('online-indicator')) {
  const indicator = document.createElement('div');
  indicator.id = 'online-indicator';
  indicator.className = 'hidden fixed left-0 right-0 bg-yellow-500/90 text-yellow-900 text-center py-2 text-sm z-40 mt-16';
  indicator.style.top = '64px';
  document.body.insertBefore(indicator, document.body.firstChild);
}

// DASH-09 Real-time Updates
let eventSource = null;

function connectSSE() {
  if (eventSource) eventSource.close();
  
  try {
    eventSource = new EventSource('/api/v1/realtime/events?channel=all');
    
    eventSource.onopen = function() {
      const sseIndicator = document.getElementById('sse-status');
      if (sseIndicator) {
        sseIndicator.className = 'text-green-400 text-xs';
        sseIndicator.innerHTML = '<i class="fas fa-bolt mr-1"></i>Real-time';
      }
    };
    
    eventSource.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'agent_status') {
          const statusEl = document.getElementById('agent-status-' + data.agent_id);
          if (statusEl) {
            statusEl.textContent = data.status;
            statusEl.className = data.status === 'online' ? 'text-green-400' : 'text-gray-400';
          }
        }
        if (data.type === 'alert_triggered' && Notification.permission === 'granted') {
          new Notification('Pingup Alert', { body: data.alert?.message || 'New alert' });
        }
      } catch {}
    };
    
    eventSource.onerror = function() {
      const sseIndicator = document.getElementById('sse-status');
      if (sseIndicator) {
        sseIndicator.className = 'text-yellow-400 text-xs';
        sseIndicator.innerHTML = '<i class="fas fa-sync fa-spin mr-1"></i>Reconnecting...';
      }
      eventSource.close();
      setTimeout(connectSSE, 5000);
    };
  } catch {}
}

if (window.location.pathname.startsWith('/dashboard')) {
  connectSSE();
}

// DASH-10 PWA Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) { console.log('SW registered:', reg.scope); })
      .catch(function(err) { console.log('SW registration failed:', err); });
  });
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
window.toggleTheme = toggleTheme;

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    const theme = document.documentElement.getAttribute('data-theme');
    icon.className = theme === 'dark' ? 'fas fa-moon text-xl' : 'fas fa-sun text-xl';
  }
}
window.updateThemeIcon = updateThemeIcon;

updateThemeIcon();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  if (!localStorage.getItem('pingup-theme')) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    updateThemeIcon();
  }
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
