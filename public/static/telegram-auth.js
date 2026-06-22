// Telegram Auth Helper
// Opens Telegram app via tg:// protocol and polls for auth completion

window.openTelegramAuth = async function(botUsername, token) {
  const tgDeepLink = `tg://resolve?domain=${botUsername}&start=${token}`;
  const webLink = `https://t.me/${botUsername}?start=${token}`;
  
  // Open popup synchronously (avoids popup blocker)
  const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
  
  if (popup) {
    // Try tg:// protocol first (opens Telegram app directly)
    popup.location.href = tgDeepLink;
    
    // If tg:// doesn't work after 1 second, try t.me
    setTimeout(() => {
      if (popup && !popup.closed) {
        popup.location.href = webLink;
        
        // If t.me also doesn't work after 2 more seconds, close popup
        setTimeout(() => {
          if (popup && !popup.closed) {
            popup.close();
          }
        }, 2000);
      }
    }, 1000);
  }
  
  // Polling: check token status in background
  const pollInterval = setInterval(async () => {
    try {
      const checkR = await fetch(`/auth/telegram-status?token=${token}`);
      const data = await checkR.json();
      
      if (data.ready) {
        clearInterval(pollInterval);
        
        // Create session in THIS browser
        const completeR = await fetch('/auth/telegram-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const completeData = await completeR.json();
        
        // Reload page to show logged-in state
        window.location.reload();
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 2000);
  
  // Stop polling after 5 minutes
  setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
};
