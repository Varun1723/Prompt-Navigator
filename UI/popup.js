// popup.js - v3.1 Logic

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup opened');

  // 1. Handle "Quick Links" (Open in new tab)
  document.querySelectorAll('.link-button').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default anchor behavior
      chrome.tabs.create({ url: link.href });
    });
  });

  // 2. Handle "Star on GitHub" Button
  const githubBtn = document.getElementById('githubBtn');
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/Varun1723/Prompt-Navigator' });
    });
  }
});