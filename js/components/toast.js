const Toast = (() => {
  function show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;

    const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ';
    const iconEl = document.createElement('span');
    iconEl.textContent = icon;

    const msgEl = document.createElement('span');
    msgEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(msgEl);
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  return { show };
})();
