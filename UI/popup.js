// popup.js - Extension popup logic

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup opened');
  // Just link the buttons
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      chrome.tabs.create({ url: link.href });
    });
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