// Prompt Navigator - Documentation Interface (v3.5)

// --- 1. Tab Switching Logic ---
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.getAttribute('data-tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
  });
});

// --- 2. File Contents ---
const fileContents = {
  'manifest': `{
  "manifest_version": 3,
  "name": "Prompt Navigator: AI Chat Index & Navigation Tool",
  "version": "3.1.1",
  "description": "Instantly navigate long conversations on ChatGPT, Gemini, and Perplexity. Automatically indexes prompts and detects attachments.",
  "permissions": ["storage", "scripting"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*",
    "https://www.perplexity.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://gemini.google.com/*",
        "https://www.perplexity.ai/*"
      ],
      "js": [
        "adapters/base.js",
        "adapters/chatgpt.js",
        "adapters/gemini.js",
        "adapters/perplexity.js",
        "content.js"
      ],
      "css": ["ui/sidebar.css"],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["icons/icon48.png"],
      "matches": ["<all_urls>"]
    }
  ],
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`,

  'content': `// content.js - v3.5 BRANDED UPDATE
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
console.log('[PN] Content script v3.5 - BRANDED');
const ICONS = {
  image: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\`,
  pdf: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\`,
  code: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>\`,
  document: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>\`
};
class PromptNavigator {
  constructor() {
    this.adapter = null; this.index = []; this.debouncedBuildIndex = debounce(this.buildIndex.bind(this), 750);
    this.observer = null; this.currentUrl = window.location.href; this.isDarkMode = false;
    setTimeout(() => { this.init(); }, 2000);
  }
  async init() {
    const host = window.location.hostname;
    if (host.includes('chatgpt.com')) this.adapter = new ChatGPTAdapter();
    else if (host.includes('gemini.google.com')) this.adapter = new GeminiAdapter();
    else if (host.includes('perplexity.ai')) this.adapter = new PerplexityAdapter();
    else return;
    chrome.storage.local.get(['darkMode'], (result) => { this.isDarkMode = result.darkMode || false; });
    this.injectSidebar(); this.buildIndex(); this.startObserver(); this.startUrlWatcher(); this.createContextMenu();
  }
  startUrlWatcher() { setInterval(() => { if (this.currentUrl !== window.location.href) { this.currentUrl = window.location.href; if (this.adapter.resetTracking) this.adapter.resetTracking(); this.index = []; this.debouncedBuildIndex(); if (this.observer) this.observer.disconnect(); this.startObserver(); } }, 1000); }
  startObserver() { const targetNode = document.querySelector(this.adapter.containerSelector) || document.body; const config = { childList: true, subtree: true }; this.observer = new MutationObserver(() => this.debouncedBuildIndex()); this.observer.observe(targetNode, config); }
  
  injectSidebar() {
    if (document.getElementById('pn-sidebar')) return;
    
    // UPDATED: Use Image Icon
    const toggle = document.createElement('div'); 
    toggle.id = 'pn-toggle'; 
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    toggle.innerHTML = \`<img src="\${iconUrl}" style="width: 32px; height: 32px; display: block; border-radius: 50%;">\`;
    document.body.appendChild(toggle);

    const sidebar = document.createElement('div'); sidebar.id = 'pn-sidebar'; sidebar.className = 'pn-hidden';
    sidebar.innerHTML = \`
      <div class="pn-header"><h3>Prompt Navigator</h3><div class="pn-header-buttons"><button id="pn-settings-btn" title="Premium Service">🔑</button><button id="pn-theme-toggle" title="Toggle Theme">🌓</button><button id="pn-close" title="Close">✕</button></div></div>
      <div class="pn-stats"><span id="pn-count">0 messages</span><button id="pn-refresh">🔄</button></div>
      <div class="pn-list-container"><div id="pn-list"></div></div>
      <div class="pn-settings-panel pn-hidden" id="pn-settings-panel">
        <div class="pn-settings-header"><button id="pn-settings-back-btn">← Back</button><h3>Premium Service</h3></div>
        <div class="pn-settings-content">
          <div class="pn-form-group"><label>AI Provider</label><select id="pn-provider-select"><option value="gemini">Google Gemini</option><option value="openai">OpenAI (GPT-3.5)</option></select></div>
          <div class="pn-form-group"><label id="pn-key-label">Gemini API Key</label><input type="password" id="pn-api-key" placeholder="Paste Key Here..."><button id="pn-api-key-save">Save Key</button></div>
          <div id="pn-help-text" style="margin-top:15px;font-size:12px;color:var(--pn-text-secondary);line-height:1.5;"></div>
        </div>
      </div>\`;
    document.body.appendChild(sidebar);
    toggle.addEventListener('click', () => sidebar.classList.toggle('pn-hidden'));
    document.getElementById('pn-close').addEventListener('click', () => sidebar.classList.add('pn-hidden'));
    document.getElementById('pn-refresh').addEventListener('click', () => { if (this.adapter.resetTracking) this.adapter.resetTracking(); this.index = []; this.buildIndex(); });
    document.getElementById('pn-theme-toggle').addEventListener('click', () => { this.isDarkMode = !this.isDarkMode; sidebar.classList.toggle('pn-dark-theme', this.isDarkMode); chrome.storage.local.set({ darkMode: this.isDarkMode }); });
    if (this.isDarkMode) sidebar.classList.add('pn-dark-theme');
    this.attachSettingsListeners();
  }
  
  attachSettingsListeners() {
    const settingsPanel = document.getElementById('pn-settings-panel'), listContainer = document.getElementById('pn-list-container'), providerSelect = document.getElementById('pn-provider-select'), keyLabel = document.getElementById('pn-key-label'), keyInput = document.getElementById('pn-api-key'), helpText = document.getElementById('pn-help-text');
    document.getElementById('pn-settings-btn').onclick = () => { settingsPanel.classList.remove('pn-hidden'); listContainer.classList.add('pn-hidden'); this.loadSettings(); };
    document.getElementById('pn-settings-back-btn').onclick = () => { settingsPanel.classList.add('pn-hidden'); listContainer.classList.remove('pn-hidden'); };
    const updateUI = (provider) => {
      if (provider === 'openai') { keyLabel.textContent = 'OpenAI API Key'; keyInput.placeholder = 'sk-...'; helpText.innerHTML = \`<p>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--pn-primary)">OpenAI Platform</a>.</p><p>2. Create a new secret key.</p><p>3. Paste it here.</p>\`; }
      else { keyLabel.textContent = 'Gemini API Key'; keyInput.placeholder = 'AIzaSy...'; helpText.innerHTML = \`<p>1. Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--pn-primary)">Google AI Studio</a>.</p><p>2. Create API Key.</p><p>3. Paste it here.</p>\`; }
    };
    providerSelect.addEventListener('change', (e) => updateUI(e.target.value));
    document.getElementById('pn-api-key-save').onclick = () => { chrome.storage.local.set({ 'pn_provider': providerSelect.value, 'pn_api_key': keyInput.value }, () => alert('Key Saved!')); };
  }
  loadSettings() { chrome.storage.local.get(['pn_provider', 'pn_api_key'], (r) => { const provider = r.pn_provider || 'gemini'; document.getElementById('pn-provider-select').value = provider; document.getElementById('pn-api-key').value = r.pn_api_key || ''; document.getElementById('pn-provider-select').dispatchEvent(new Event('change')); }); }
  async runSummarization(msg) {
    const { pn_api_key, pn_provider } = await chrome.storage.local.get(['pn_api_key', 'pn_provider']);
    if (!pn_api_key) return document.getElementById('pn-settings-btn').click();
    const previewEl = document.getElementById(\`preview-\${msg.id}\`), original = previewEl.innerHTML;
    previewEl.innerHTML = \`<span style="color:#eab308">Generating...</span>\`;
    try { const res = await chrome.runtime.sendMessage({ type: 'NLP_REQUEST', data: { text: msg.fullText, apiKey: pn_api_key, provider: pn_provider || 'gemini' }}); if (res.success) previewEl.textContent = res.result.summary; else throw new Error(res.error); }
    catch (e) { previewEl.innerHTML = original; alert("Error: " + e.message); }
  }
  createContextMenu() { const menu = document.createElement('div'); menu.id = 'pn-context-menu'; menu.className = 'pn-context-menu'; document.body.appendChild(menu); document.addEventListener('click', () => menu.style.display = 'none'); }
  showContextMenu(x, y, msg) { const menu = document.getElementById('pn-context-menu'); menu.innerHTML = \`<button id="pn-ctx-summarize">✨ Generate Title (AI)</button>\`; menu.style.display = 'block'; menu.style.left = \`\${x}px\`; menu.style.top = \`\${y}px\`; document.getElementById('pn-ctx-summarize').onclick = () => { this.runSummarization(msg); menu.style.display = 'none'; }; }
  buildIndex() {
    const messageNodes = document.querySelectorAll(this.adapter.messageSelector), newIndex = [];
    Array.from(messageNodes).forEach((node, idx) => {
      try {
        if (this.adapter.isValidMessage && !this.adapter.isValidMessage(node)) return;
        const role = this.adapter.extractRole(node), preview = this.adapter.extractPreview(node), attachment = this.adapter.extractAttachments(node);
        if (!preview || preview.length < 3) return;
        newIndex.push({ id: \`msg-\${idx}-\${Date.now()}\`, role, preview, attachment, fullText: node.textContent || '', node, serialNo: role === 'user' ? (newIndex.filter(m => m.role === 'user').length + 1) : null });
      } catch (err) { console.error(err); }
    });
    if (newIndex.length === 0 && this.index.length > 0 && this.currentUrl === window.location.href) return;
    this.index = newIndex; this.renderList();
  }
  renderList() {
    const listEl = document.getElementById('pn-list'), countEl = document.getElementById('pn-count'); if (!listEl) return;
    const userCount = this.index.filter(m => m.role === 'user').length, aiCount = this.index.filter(m => m.role === 'assistant').length; countEl.textContent = \`\${userCount} prompts • \${aiCount} replies\`;
    if (this.index.length === 0) return listEl.innerHTML = '<div class="pn-empty">No messages found</div>';
    listEl.innerHTML = this.index.map(msg => {
      const roleClass = msg.role === 'user' ? 'pn-user' : 'pn-ai', icon = msg.attachment ? ICONS[msg.attachment] || '' : '', serialDisplay = msg.role === 'user' ? \`<span class="pn-serial">#\${msg.serialNo}</span>\` : '';
      return \`<div class="pn-item \${roleClass} pn-jump-item" data-id="\${msg.id}"><div class="pn-item-header">\${serialDisplay}\${icon ? \`<span class="pn-icon">\${icon}</span>\` : ''}<span class="pn-role">\${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span></div><div class="pn-preview" id="preview-\${msg.id}">\${this.escapeHtml(msg.preview)}</div></div>\`;
    }).join('');
    listEl.querySelectorAll('.pn-item').forEach(item => { item.addEventListener('click', () => this.jumpToMessage(item.getAttribute('data-id'))); item.addEventListener('contextmenu', (e) => { e.preventDefault(); const msg = this.index.find(m => m.id === item.getAttribute('data-id')); if (msg) this.showContextMenu(e.pageX, e.pageY, msg); }); });
  }
  jumpToMessage(id) { const msg = this.index.find(m => m.id === id); if (!msg || !msg.node) return; msg.node.scrollIntoView({ behavior: 'smooth', block: 'center' }); msg.node.style.transition = 'background-color 0.3s ease'; msg.node.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; setTimeout(() => { msg.node.style.backgroundColor = ''; }, 2000); }
  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
}
const nav = new PromptNavigator();`,

  'popup-html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Navigator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <div class="popup-header">
      <div class="logo">
        <img src="../icons/icon48.png" alt="Logo" style="width: 32px; height: 32px; display: block;">
        <h1>Prompt Navigator</h1>
      </div>
      <span class="version">v3.1.1</span>
    </div>
    <div class="section">
      <h2>Platform Status</h2>
      <div class="platform-list">
        <div class="platform-item"><span class="status-dot green"></span><span>ChatGPT</span><span class="status-label">Active</span></div>
        <div class="platform-item"><span class="status-dot green"></span><span>Gemini</span><span class="status-label">Active</span></div>
        <div class="platform-item"><span class="status-dot green"></span><span>Perplexity</span><span class="status-label">Active</span></div>
      </div>
    </div>
    <div class="section">
      <h2>Launch AI</h2>
      <div class="links">
        <a href="https://chatgpt.com" target="_blank" class="link-button">ChatGPT</a>
        <a href="https://gemini.google.com" target="_blank" class="link-button">Gemini</a>
        <a href="https://www.perplexity.ai" target="_blank" class="link-button">Perplexity</a>
      </div>
    </div>
    <div class="section" style="margin-bottom: 0;">
      <h2>Community</h2>
      <button id="githubBtn" class="github-button">
        <svg height="20" width="20" viewBox="0 0 16 16" fill="white">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
        </svg>
        <span>Star on GitHub</span>
      </button>
      <p style="text-align: center; margin-top: 8px; font-size: 11px; color: #64748b;">Love the extension? Give us a star! 🌟</p>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,

  'gitignore': `node_modules/
.DS_Store
*.log
.env
dist/
api_keys.txt`,

  'readme': `# 🧭 Prompt Navigator: AI Chat Index & Navigation Tool

A privacy-first Chrome extension that indexes your AI chats, allowing you to navigate, search, and organize prompts locally.

## 🚀 Supported Platforms
* **ChatGPT**
* **Google Gemini**
* **Perplexity**

## ✨ Features
* **Dynamic Indexing:** Automatically ranks and indexes your **User Prompts**.
* **Smart Attachments:** Detects images, PDFs, and code files with visual icons.
* **Jump-to-Message:** Click any item in the sidebar to scroll instantly to that point.
* **Dark/Light Mode:** Toggle the sidebar theme to match your preference.
* **Premium Service:** Bring your own API Key (OpenAI or Gemini) to auto-generate titles for your prompts.

## 🛠️ Installation
1.  Download this folder.
2.  Open Chrome and go to \`chrome://extensions/\`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked**.
5.  Select this folder.

## 🤖 Usage
1.  Open a supported AI chat.
2.  Click the floating **Compass 🧭** button.
3.  **Right-click** any item in the sidebar to "Generate Title".
4.  Click the **Key 🔑** icon to configure your AI Provider (Gemini/OpenAI).`,

  'background': `// background.js - Hybrid Edition (OpenAI + Gemini)
console.log('[PN] Background service worker loaded.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NLP_REQUEST') {
    handleNLPRequest(message.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleNLPRequest(data) {
  const { text, apiKey, provider } = data;
  if (!apiKey) throw new Error('API key is missing.');

  const prompt = \`Generate a concise, 5-8 word title for this text. No quotes. Text: """\${text}"""\`;

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'OpenAI Error');
    return { summary: json.choices[0].message.content.replace(/"/g, '') };
  }
  else if (provider === 'gemini') {
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Gemini Error');
    const summary = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summary) throw new Error('Gemini returned no text');
    return { summary: summary.trim() };
  }
  throw new Error('Invalid Provider Selected');
}`,

  'adapter-base': `class BaseAdapter {
  constructor() {
    this.platformName = 'unknown';
    this.containerSelector = '';
    this.messageSelector = '';
  }
  getMessages() {
    const allNodes = Array.from(document.querySelectorAll(this.messageSelector));
    return allNodes.filter(node => node.offsetParent !== null && node.getBoundingClientRect().height > 0);
  }
  extractPreview(node) {
    const text = node.textContent?.trim() || '';
    return text.substring(0, 120); 
  }
}`,

  'adapter-chatgpt': `class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'chatgpt';
    this.containerSelector = 'main';
    this.messageSelector = '[data-message-author-role]';
  }
  extractRole(node) { return node.getAttribute('data-message-author-role'); }
  extractPreview(node) { return node.textContent?.trim().substring(0, 120) || ''; }
  extractAttachments(node) {
    const images = Array.from(node.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || img.width || 0;
      const isTooSmall = width < 30;
      const isProfile = img.alt === 'User' || img.alt === 'ChatGPT';
      const isUpload = img.src.includes('files') || img.src.startsWith('blob:');
      return (isUpload || !isTooSmall) && !isProfile;
    });
    if (validImages.length > 0) return 'image';
    const text = node.innerText || '';
    if (/\\b[\\w-]+\\.pdf\\b/i.test(text)) return 'pdf';
    return null;
  }
}`,

  'adapter-gemini': `class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'gemini';
    this.containerSelector = 'body';
    this.messageSelector = '.user-query, .model-response-text';
  }
  extractRole(node) {
    if (node.classList.contains('user-query') || node.closest('.user-query-container')) return 'user';
    return 'assistant';
  }
  extractPreview(node) { return node.textContent?.trim().substring(0, 120) || ''; }
  extractAttachments(node) {
    const container = node.closest('conversation-driver') || node.closest('.user-query-container');
    if (!container) return null;
    if (container.querySelector('img:not(.avatar)')) return 'image';
    if (container.textContent.toLowerCase().includes('.pdf')) return 'pdf';
    return null;
  }
}`,

  'adapter-perplexity': `class PerplexityAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'perplexity';
    this.containerSelector = 'main';
    this.messageSelector = '.group\\\\/query, .group\\\\/answer, div[dir="auto"]';
  }
  extractRole(node) {
    if (node.classList.contains('group/query') || node.querySelector('h1')) return 'user';
    return 'assistant';
  }
  extractPreview(node) {
    const content = node.querySelector('.prose') || node;
    return content.textContent?.trim().substring(0, 120) || '';
  }
  extractAttachments(node) { return null; }
}`,

  'sidebar-css': `/* sidebar.css - v3.4 FINAL */
:root {
  --pn-primary: #3b82f6; --pn-success: #10b981; --pn-error: #ef4444;
  --pn-surface: #ffffff; --pn-bg: #f8fafc; --pn-text: #0f172a; --pn-text-secondary: #64748b;
  --pn-border: #e2e8f0; --pn-hover: #f1f5f9; --pn-item-bg: #ffffff;
}
#pn-sidebar.pn-dark-theme {
  --pn-surface: #0f172a; --pn-bg: #1e293b; --pn-text: #f8fafc; --pn-text-secondary: #94a3b8;
  --pn-border: #334155; --pn-hover: #334155; --pn-item-bg: #1e293b;
}
#pn-toggle {
  position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
  background: var(--pn-primary); color: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; cursor: pointer; z-index: 2147483647; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
#pn-toggle:hover { transform: scale(1.1); }
#pn-sidebar {
  position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
  background: var(--pn-surface); border-left: 1px solid var(--pn-border);
  z-index: 2147483646; display: flex; flex-direction: column; transition: transform 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: -5px 0 15px rgba(0,0,0,0.1);
}
#pn-sidebar.pn-hidden { transform: translateX(100%); }
.pn-header { padding: 16px; border-bottom: 1px solid var(--pn-border); display: flex; justify-content: space-between; align-items: center; background: var(--pn-surface); }
.pn-header h3 { margin: 0; font-size: 16px; color: var(--pn-text); font-weight: 600; }
.pn-header-buttons button { background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--pn-text-secondary); padding: 4px; border-radius: 4px; }
.pn-header-buttons button:hover { background: var(--pn-hover); color: var(--pn-text); }
.pn-stats { padding: 8px 16px; border-bottom: 1px solid var(--pn-border); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--pn-text-secondary); background: var(--pn-bg); }
#pn-refresh { background: none; border: none; cursor: pointer; font-size: 14px; }
.pn-list-container { flex: 1; overflow-y: auto; background: var(--pn-bg); padding: 12px; }
#pn-list { display: flex; flex-direction: column; gap: 8px; }
.pn-item { padding: 12px; border-radius: 8px; background: var(--pn-item-bg); border: 1px solid var(--pn-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.pn-item:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.pn-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pn-serial { background: var(--pn-primary); color: white; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
.pn-role { font-size: 11px; font-weight: 600; color: var(--pn-text-secondary); margin-left: auto; }
.pn-preview { font-size: 13px; line-height: 1.4; color: var(--pn-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pn-item.pn-ai { margin-left: 24px; border-left: 3px solid var(--pn-border); }
.pn-context-menu { position: fixed; z-index: 2147483647; background: var(--pn-surface); border: 1px solid var(--pn-border); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); padding: 4px; min-width: 160px; display: none; }
.pn-context-menu button { display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 12px; color: var(--pn-text); font-size: 13px; cursor: pointer; border-radius: 4px; }
.pn-context-menu button:hover { background: var(--pn-hover); color: var(--pn-primary); }
.pn-settings-panel { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--pn-bg); z-index: 100; display: flex; flex-direction: column; padding: 16px; }
.pn-settings-header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--pn-border); padding-bottom: 10px; }
.pn-settings-header h3 { margin: 0 0 0 10px; flex: 1; color: var(--pn-text); }
#pn-settings-back-btn { background: none; border: none; font-size: 14px; cursor: pointer; color: var(--pn-text-secondary); font-weight: 600; }
.pn-form-group { margin-top: 20px; }
.pn-form-group label { display: block; font-size: 12px; margin-bottom: 6px; color: var(--pn-text-secondary); font-weight: 600; }
#pn-api-key { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--pn-border); background: var(--pn-surface); color: var(--pn-text); margin-bottom: 10px; box-sizing: border-box; }
#pn-provider-select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--pn-border); background: var(--pn-surface); color: var(--pn-text); margin-bottom: 15px; cursor: pointer; }
#pn-api-key-save { width: 100%; padding: 10px; background: var(--pn-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
.pn-hidden { display: none !important; }`,

  'popup-css': `body { width: 300px; font-family: system-ui; background: #0f172a; color: white; padding: 16px; }
.popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo img { display: block; }
h1 { margin: 0; font-size: 16px; font-weight: 600; }
.version { padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #3b82f6; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); }
h2 { font-size: 12px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; letter-spacing: 0.5px; }
.section { margin-bottom: 20px; }
.platform-item { background: #1e293b; padding: 10px; margin-bottom: 8px; border-radius: 6px; display: flex; align-items: center; gap: 10px; border: 1px solid #334155; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.green { background: #10b981; box-shadow: 0 0 8px #10b981; }
.status-label { margin-left: auto; font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px; }
.links { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.link-button { display: flex; align-items: center; justify-content: center; background: #334155; color: #e2e8f0; text-decoration: none; padding: 8px; border-radius: 6px; font-size: 11px; transition: all 0.2s; border: 1px solid transparent; }
.link-button:hover { background: #3b82f6; color: white; border-color: #60a5fa; }
.github-button { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px; background-color: #24292e; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s, background-color 0.2s; }
.github-button:hover { background-color: #1b1f23; transform: translateY(-1px); }
.github-button:active { transform: translateY(0); }`,

  'popup-js': `document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.link-button').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: link.href }); });
  });
  const githubBtn = document.getElementById('githubBtn');
  if (githubBtn) { githubBtn.addEventListener('click', () => { chrome.tabs.create({ url: 'https://github.com/Varun1723/Prompt-Navigator' }); }); }
});`
};

// --- 3. Download Helper Functions ---
const downloadButtons = document.querySelectorAll('.download-btn');
downloadButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const fileType = e.target.getAttribute('data-file');
    if (fileContents[fileType]) {
      downloadFile(fileType, fileContents[fileType]);
    } else {
      alert('File not found in this version.');
    }
  });
});

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getFileName(name);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFileName(type) {
  const fileMap = {
    'manifest': 'manifest.json',
    'gitignore': '.gitignore',
    'readme': 'README.md',
    'background': 'background.js',
    'content': 'content.js',
    'adapter-base': 'adapters/base.js',
    'adapter-chatgpt': 'adapters/chatgpt.js',
    'adapter-gemini': 'adapters/gemini.js',
    'adapter-perplexity': 'adapters/perplexity.js',
    'sidebar-css': 'ui/sidebar.css',
    'popup-html': 'ui/popup.html',
    'popup-css': 'ui/popup.css',
    'popup-js': 'ui/popup.js'
  };
  return fileMap[type] || 'file.txt';
}

document.getElementById('downloadAll')?.addEventListener('click', () => {
  Object.keys(fileContents).forEach((key, index) => {
    setTimeout(() => {
      downloadFile(key, fileContents[key]);
    }, index * 200);
  });
});