// DASH-05 Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key === '?') {
    e.preventDefault();
    showShortcutsHelp();
  }
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const searchInput = document.querySelector('input[type="search"], input[name="search"]');
    if (searchInput) searchInput.focus();
  }
  if (e.key === 'g') {
    setTimeout(() => {
      const nextKey = prompt('Go to: d=Dashboard, a=Agents, s=Settings');
      if (nextKey === 'd') window.location.href = '/dashboard';
      if (nextKey === 'a') window.location.href = '/dashboard/agents';
      if (nextKey === 's') window.location.href = '/dashboard/security';
    }, 500);
  }
  if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    window.location.reload();
  }
  if (e.key === 'Escape') {
    closeModal();
    closeMobileMenu();
  }
});

function showShortcutsHelp() {
  const existing = document.getElementById('shortcuts-modal');
  if (existing) existing.remove();
  
  const shortcuts = [
    { key: '?', action: 'Show shortcuts help' },
    { key: '/', action: 'Search' },
    { key: 'g d', action: 'Go to Dashboard' },
    { key: 'g a', action: 'Go to Agents' },
    { key: 'g s', action: 'Go to Settings' },
    { key: 'e', action: 'Refresh page' },
    { key: 'Esc', action: 'Close modal' }
  ];
  
  let html = '<div class="glass-card rounded-2xl p-6 max-w-md w-full">';
  html += '<div class="flex justify-between items-center mb-4">';
  html += '<h3 class="text-xl font-bold text-white"><i class="fas fa-keyboard mr-2"></i>Keyboard Shortcuts</h3>';
  html += '<button onclick="closeModal()" class="btn p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">';
  html += '<i class="fas fa-times"></i></button></div>';
  html += '<div class="space-y-2">';
  
  shortcuts.forEach(s => {
    html += '<div class="flex justify-between py-2 border-b border-white/5">';
    html += '<span class="text-gray-400">' + s.action + '</span>';
    html += '<kbd class="px-2 py-1 bg-gray-700 rounded text-sm text-white">' + s.key + '</kbd>';
    html += '</div>';
  });
  
  html += '</div></div>';
  
  const modal = document.createElement('div');
  modal.id = 'shortcuts-modal';
  modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
  modal.innerHTML = html;
  modal.onclick = function(e) { if (e.target === modal) closeModal(); };
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.remove();
}
window.closeModal = closeModal;

// Mobile menu
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const sidebar = document.querySelector('.sidebar');

function closeMobileMenu() {
  if (sidebar) sidebar.classList.remove('open');
  if (mobileOverlay) mobileOverlay.classList.add('hidden');
}
window.closeMobileMenu = closeMobileMenu;

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    sidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('hidden');
  });
}

document.querySelectorAll('.sidebar a').forEach(link => {
  link.addEventListener('click', closeMobileMenu);
});
