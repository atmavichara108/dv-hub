// Telegram Auth Helper
// Low-level utilities: copy-to-clipboard, polling helper

window.openTelegramAuth = async function(botUsername, token) {
  const botLink = `https://t.me/${botUsername}?start=${token}`;

  // Copy link to clipboard
  try { await navigator.clipboard.writeText(botLink) } catch (e) {
    console.error('Failed to copy to clipboard:', e);
  }

  // Update UI with instructions
  const statusEl = document.getElementById('telegram-login-status');
  if (statusEl) {
    statusEl.innerHTML = `
      <div class="text-center mb-4">
        <p class="text-sm text-accent-600 mb-2">
          <i class="fas fa-check-circle mr-1"></i>
          Ссылка скопирована!
        </p>
        <p class="text-xs text-ink-500 mb-3">
          Откройте Telegram, найдите бота <strong>@${botUsername}</strong> и вставьте ссылку в чат
        </p>
        <button 
          onclick="navigator.clipboard.writeText('${botLink}'); this.textContent='Скопировано!'; setTimeout(() => this.textContent='Скопировать ссылку снова', 2000);"
          class="bg-ink-200 hover:bg-ink-300 text-ink-800 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Скопировать ссылку снова
        </button>
      </div>
      <div class="text-center">
        <p class="text-xs text-ink-400">
          <i class="fas fa-circle-notch fa-spin mr-1"></i>
          Ожидание подтверждения...
        </p>
      </div>
    `;
  }
};

/**
 * Poll /auth/telegram-status until ready.
 * @param {string} token
 * @param {{ onSuccess?: () => void, onTimeout?: () => void }} callbacks
 * @returns {() => void} cleanup function to stop polling
 */
window.startTelegramPolling = function(token, callbacks = {}) {
  const { onSuccess, onTimeout } = callbacks;
  const pollInterval = setInterval(async () => {
    try {
      const r = await fetch(`/auth/telegram-status?token=${token}`);
      const data = await r.json();
      if (data.ready) {
        clearInterval(pollInterval);
        onSuccess?.();
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 2000);

  const timeoutId = setTimeout(() => {
    clearInterval(pollInterval);
    onTimeout?.();
  }, 5 * 60 * 1000);

  // Return cleanup
  return () => {
    clearInterval(pollInterval);
    clearTimeout(timeoutId);
  };
};
