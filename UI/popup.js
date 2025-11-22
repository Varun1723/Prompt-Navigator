// popup.js - Extension popup logic

document.addEventListener('DOMContentLoaded', () => {
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    // Open options page (create if needed)
    alert('Settings coming soon! For now, use the sidebar controls on AI chat pages.');
  });

  // Help button
  document.getElementById('helpBtn').addEventListener('click', () => {
    // Open help page
    window.open('https://github.com/yourusername/prompt-navigator', '_blank');
  });

  // Platform status - could be dynamic from storage
  chrome.storage.local.get(['lastPlatformUsed'], (result) => {
    if (result.lastPlatformUsed) {
      console.log('Last used:', result.lastPlatformUsed);
    }
  });
});