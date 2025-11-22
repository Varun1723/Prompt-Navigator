// Prompt Navigator - Documentation Interface (v3.1)

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

// --- 2. File Contents (The Actual Extension Code) ---
const fileContents = {
  'manifest': `{
  "manifest_version": 3.1.0,
  "name": "Prompt Navigator",
  "version": "3.1.0",
  "description": "Navigate AI conversations on ChatGPT, Gemini, and Perplexity.",
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

  'gitignore': `node_modules/
.DS_Store
*.log
.env
dist/
api_keys.txt`,

  'readme': `# 🧭 Prompt Navigator (v3.1)

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
* **Privacy First:** Local-first architecture. No data is sent to our servers.
* **Premium NLP:** (Optional) Add your OpenAI API key to generate concise titles for your prompts.

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
4.  Click the **Settings ⚙️** icon to manage your API key or toggle Dark Mode.`,

  'background': `// background.js
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

  const promptText = \`Generate a concise, 5-8 word title for this text: """\${text}"""\`;
  
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3
      })
    });

    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error?.message || 'API request failed');
    return { summary: responseData.choices[0].message.content.replace(/"/g, '') };
  }
  throw new Error('Unsupported provider');
}`,

  'content': `// content.js - v3.1 CLEANED
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('[PN] Content script v3.1 - CLEANED & STABLE');

const ICONS = {
  image: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\`,
  pdf: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\`,
  code: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>\`,
  document: \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>\`
};

class PromptNavigator {
  constructor() {
    this.adapter = null;
    this.index = [];
    this.debouncedBuildIndex = debounce(this.buildIndex.bind(this), 750);
    this.observer = null;
    this.currentUrl = window.location.href;
    this.isDarkMode = false;
    setTimeout(() => { this.init(); }, 2000);
  }

  async init() {
    const host = window.location.hostname;
    if (host.includes('chatgpt.com')) this.adapter = new ChatGPTAdapter();
    else if (host.includes('gemini.google.com')) this.adapter = new GeminiAdapter();
    else if (host.includes('perplexity.ai')) this.adapter = new PerplexityAdapter();
    else return;

    console.log(\`[PN] Detected \${this.adapter.platformName}\`);
    chrome.storage.local.get(['darkMode'], (result) => { this.isDarkMode = result.darkMode || false; });
    
    this.injectSidebar();
    this.buildIndex();
    this.startObserver();
    this.startUrlWatcher();
    this.createContextMenu();
  }

  startUrlWatcher() {
    setInterval(() => {
      if (this.currentUrl !== window.location.href) {
        this.currentUrl = window.location.href;
        this.index = [];
        this.debouncedBuildIndex();
        if (this.observer) this.observer.disconnect();
        this.startObserver();
      }
    }, 1000);
  }

  startObserver() {
    const targetNode = document.querySelector(this.adapter.containerSelector) || document.body;
    const config = { childList: true, subtree: true };
    this.observer = new MutationObserver(() => this.debouncedBuildIndex());
    this.observer.observe(targetNode, config);
  }

  injectSidebar() {
    if (document.getElementById('pn-sidebar')) return;
    const toggle = document.createElement('div');
    toggle.id = 'pn-toggle';
    toggle.innerHTML = '🧭';
    document.body.appendChild(toggle);

    const sidebar = document.createElement('div');
    sidebar.id = 'pn-sidebar';
    sidebar.className = 'pn-hidden';
    
    sidebar.innerHTML = \`
      <div class="pn-header">
        <h3>Prompt Navigator</h3>
        <div class="pn-header-buttons">
          <button id="pn-settings-btn" title="Settings">⚙️</button>
          <button id="pn-theme-toggle" title="Toggle Theme">🌓</button>
          <button id="pn-close" title="Close">✕</button>
        </div>
      </div>
      <div class="pn-stats"><span id="pn-count">0 messages</span><button id="pn-refresh">🔄</button></div>
      <div class="pn-list-container"><div id="pn-list"></div></div>
      <div class="pn-settings-panel pn-hidden" id="pn-settings-panel">
        <div class="pn-settings-header"><button id="pn-settings-back-btn">← Back</button><h3>Settings</h3></div>
        <div class="pn-settings-content">
          <div class="pn-form-group"><label>OpenAI API Key</label><input type="password" id="pn-api-key" placeholder="sk-..."><button id="pn-api-key-save">Save Key</button></div>
        </div>
      </div>
    \`;
    document.body.appendChild(sidebar);

    toggle.addEventListener('click', () => sidebar.classList.toggle('pn-hidden'));
    document.getElementById('pn-close').addEventListener('click', () => sidebar.classList.add('pn-hidden'));
    document.getElementById('pn-refresh').addEventListener('click', () => { this.index = []; this.buildIndex(); });
    document.getElementById('pn-theme-toggle').addEventListener('click', () => {
      this.isDarkMode = !this.isDarkMode;
      sidebar.classList.toggle('pn-dark-theme', this.isDarkMode);
      chrome.storage.local.set({ darkMode: this.isDarkMode });
    });
    if (this.isDarkMode) sidebar.classList.add('pn-dark-theme');
    this.attachSettingsListeners();
    this.loadApiKey();
  }

  buildIndex() {
    const messageNodes = document.querySelectorAll(this.adapter.messageSelector);
    const newIndex = [];
    Array.from(messageNodes).forEach((node, idx) => {
      try {
        const role = this.adapter.extractRole(node);
        const preview = this.adapter.extractPreview(node);
        const attachment = this.adapter.extractAttachments(node);
        if (!preview || preview.length < 3) return;
        newIndex.push({
          id: \`msg-\${idx}-\${Date.now()}\`, role, preview, attachment, fullText: node.textContent || '', node,
          serialNo: role === 'user' ? (newIndex.filter(m => m.role === 'user').length + 1) : null
        });
      } catch (err) { console.error(err); }
    });
    if (newIndex.length === 0 && this.index.length > 0 && this.currentUrl === window.location.href) return;
    this.index = newIndex;
    this.renderList();
  }

  renderList() {
    const listEl = document.getElementById('pn-list');
    const countEl = document.getElementById('pn-count');
    if (!listEl) return;
    const userCount = this.index.filter(m => m.role === 'user').length;
    const aiCount = this.index.filter(m => m.role === 'assistant').length;
    countEl.textContent = \`\${userCount} prompts • \${aiCount} replies\`;

    if (this.index.length === 0) { listEl.innerHTML = '<div class="pn-empty">No messages found</div>'; return; }

    listEl.innerHTML = this.index.map(msg => {
      const roleClass = msg.role === 'user' ? 'pn-user' : 'pn-ai';
      const icon = msg.attachment ? ICONS[msg.attachment] || '' : '';
      const serialDisplay = msg.role === 'user' ? \`<span class="pn-serial">#\${msg.serialNo}</span>\` : '';
      return \`<div class="pn-item \${roleClass} pn-jump-item" data-id="\${msg.id}"><div class="pn-item-header">\${serialDisplay}\${icon ? \`<span class="pn-icon">\${icon}</span>\` : ''}<span class="pn-role">\${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span></div><div class="pn-preview" id="preview-\${msg.id}">\${this.escapeHtml(msg.preview)}</div></div>\`;
    }).join('');

    listEl.querySelectorAll('.pn-item').forEach(item => {
      item.addEventListener('click', () => this.jumpToMessage(item.getAttribute('data-id')));
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const msg = this.index.find(m => m.id === item.getAttribute('data-id'));
        if (msg) this.showContextMenu(e.pageX, e.pageY, msg);
      });
    });
  }

  jumpToMessage(id) {
    const msg = this.index.find(m => m.id === id);
    if (!msg || !msg.node) return;
    msg.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    msg.node.style.transition = 'background-color 0.3s ease';
    msg.node.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
    setTimeout(() => { msg.node.style.backgroundColor = ''; }, 2000);
  }

  attachSettingsListeners() {
    document.getElementById('pn-settings-btn').onclick = () => { document.getElementById('pn-settings-panel').classList.remove('pn-hidden'); document.getElementById('pn-list-container').classList.add('pn-hidden'); };
    document.getElementById('pn-settings-back-btn').onclick = () => { document.getElementById('pn-settings-panel').classList.add('pn-hidden'); document.getElementById('pn-list-container').classList.remove('pn-hidden'); };
    document.getElementById('pn-api-key-save').onclick = () => {
      const key = document.getElementById('pn-api-key').value;
      chrome.storage.local.set({ 'pn_api_key': key }, () => alert('Key Saved!'));
    };
  }

  loadApiKey() {
    chrome.storage.local.get(['pn_api_key'], (r) => { if(r.pn_api_key) document.getElementById('pn-api-key').value = r.pn_api_key; });
  }

  createContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'pn-context-menu'; menu.className = 'pn-context-menu';
    document.body.appendChild(menu);
    document.addEventListener('click', () => menu.style.display = 'none');
  }

  showContextMenu(x, y, msg) {
    const menu = document.getElementById('pn-context-menu');
    menu.innerHTML = \`<button id="pn-ctx-summarize">Generate Title (Premium)</button>\`;
    menu.style.display = 'block'; menu.style.left = \`\${x}px\`; menu.style.top = \`\${y}px\`;
    document.getElementById('pn-ctx-summarize').onclick = () => { this.runSummarization(msg); menu.style.display = 'none'; };
  }

  async runSummarization(msg) {
    const { pn_api_key } = await chrome.storage.local.get(['pn_api_key']);
    if (!pn_api_key) return alert('Please enter API Key in settings first');
    const previewEl = document.getElementById(\`preview-\${msg.id}\`);
    const original = previewEl.innerHTML;
    previewEl.innerHTML = \`<span style="color:#eab308">Summarizing...</span>\`;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'NLP_REQUEST', data: { type: 'summarize', text: msg.fullText, apiKey: pn_api_key, provider: 'openai' }});
      if (res.success) previewEl.textContent = res.result.summary;
      else throw new Error(res.error);
    } catch (e) { previewEl.innerHTML = original; alert(e.message); }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
const nav = new PromptNavigator();`,

  'adapter-base': `class BaseAdapter {
  constructor() {
    this.platformName = 'unknown';
    this.containerSelector = '';
    this.messageSelector = '';
  }
  getMessages() {
    // Nuclear fix: Filter out hidden elements
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

  'sidebar-css': `/* sidebar.css - v3.1 FINAL */
:root {
  --pn-primary: #3b82f6;
  --pn-success: #10b981;
  --pn-surface: #ffffff;
  --pn-bg: #f8fafc;
  --pn-text: #0f172a;
  --pn-text-secondary: #64748b;
  --pn-border: #e2e8f0;
  --pn-hover: #f1f5f9;
  --pn-item-bg: #ffffff;
}
#pn-sidebar.pn-dark-theme {
  --pn-surface: #0f172a;
  --pn-bg: #1e293b;
  --pn-text: #f8fafc;
  --pn-text-secondary: #94a3b8;
  --pn-border: #334155;
  --pn-hover: #334155;
  --pn-item-bg: #1e293b;
}
#pn-toggle {
  position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
  background: var(--pn-primary); color: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; cursor: pointer; z-index: 2147483647; border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
#pn-sidebar {
  position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
  background: var(--pn-surface); border-left: 1px solid var(--pn-border);
  z-index: 2147483646; display: flex; flex-direction: column;
  font-family: system-ui, sans-serif; transition: transform 0.3s ease;
}
#pn-sidebar.pn-hidden { transform: translateX(100%); }
.pn-header { padding: 16px; border-bottom: 1px solid var(--pn-border); display: flex; justify-content: space-between; align-items: center; background: var(--pn-surface); }
.pn-header h3 { margin: 0; font-size: 16px; color: var(--pn-text); }
.pn-header-buttons button { background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--pn-text-secondary); }
.pn-stats { padding: 8px 16px; border-bottom: 1px solid var(--pn-border); display: flex; justify-content: space-between; font-size: 12px; color: var(--pn-text-secondary); background: var(--pn-bg); }
.pn-list-container { flex: 1; overflow-y: auto; background: var(--pn-bg); padding: 12px; }
#pn-list { display: flex; flex-direction: column; gap: 8px; }
.pn-item { padding: 12px; border-radius: 8px; background: var(--pn-item-bg); border: 1px solid var(--pn-border); cursor: pointer; }
.pn-item:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.pn-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pn-serial { background: var(--pn-primary); color: white; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
.pn-role { font-size: 11px; font-weight: 600; color: var(--pn-text-secondary); margin-left: auto; }
.pn-preview { font-size: 13px; line-height: 1.4; color: var(--pn-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pn-item.pn-ai { margin-left: 24px; border-left: 3px solid var(--pn-border); }
.pn-context-menu { position: fixed; z-index: 2147483647; background: var(--pn-surface); border: 1px solid var(--pn-border); border-radius: 6px; padding: 4px; min-width: 160px; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.pn-context-menu button { display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 12px; color: var(--pn-text); font-size: 13px; cursor: pointer; }
.pn-context-menu button:hover { background: var(--pn-hover); }
.pn-settings-panel { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--pn-bg); z-index: 100; padding: 16px; display: flex; flex-direction: column; }
.pn-settings-header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--pn-border); padding-bottom: 10px; }
.pn-form-group label { display: block; font-size: 12px; margin-bottom: 6px; color: var(--pn-text-secondary); }
#pn-api-key { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--pn-border); background: var(--pn-surface); color: var(--pn-text); margin-bottom: 10px; box-sizing: border-box; }
#pn-api-key-save { width: 100%; padding: 10px; background: var(--pn-primary); color: white; border: none; border-radius: 6px; cursor: pointer; }
.pn-hidden { display: none !important; }`,

  'popup-html': `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Prompt Navigator</title><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="popup-container">
    <div class="popup-header"><h1>Prompt Navigator</h1><span class="version">v3.1</span></div>
    <div class="section"><h2>Platform Status</h2>
      <div class="platform-list">
        <div class="platform-item"><span class="status-dot green"></span><span>ChatGPT</span></div>
        <div class="platform-item"><span class="status-dot green"></span><span>Gemini</span></div>
        <div class="platform-item"><span class="status-dot green"></span><span>Perplexity</span></div>
      </div>
    </div>
    <div class="section"><h2>Quick Links</h2>
      <div class="links">
        <a href="https://chatgpt.com" target="_blank" class="link-button">Open ChatGPT</a>
        <a href="https://gemini.google.com" target="_blank" class="link-button">Open Gemini</a>
        <a href="https://www.perplexity.ai" target="_blank" class="link-button">Open Perplexity</a>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,

  'popup-css': `body { width: 300px; font-family: system-ui; background: #0f172a; color: white; padding: 16px; }
.popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
h1 { margin: 0; font-size: 18px; }
.version { background: #334155; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
h2 { font-size: 12px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
.platform-item { background: #1e293b; padding: 8px; margin-bottom: 8px; border-radius: 6px; display: flex; align-items: center; gap: 10px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.green { background: #10b981; box-shadow: 0 0 8px #10b981; }
.link-button { display: block; background: #3b82f6; color: white; text-decoration: none; padding: 8px; text-align: center; border-radius: 6px; margin-bottom: 8px; font-size: 14px; }
.link-button:hover { background: #2563eb; }`,

  'popup-js': `document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => chrome.tabs.create({ url: link.href }));
  });
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

// Download All Button
document.getElementById('downloadAll')?.addEventListener('click', () => {
  Object.keys(fileContents).forEach((key, index) => {
    setTimeout(() => {
      downloadFile(key, fileContents[key]);
    }, index * 200);
  });
});