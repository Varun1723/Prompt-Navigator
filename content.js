// content.js - v3.4 FINAL POLISH
// Features: Key Icon, Premium Service Header, Clean Links

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('[PN] Content script v3.4 - FINAL POLISH');

const ICONS = {
  image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  pdf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  code: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  document: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
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
        if (this.adapter.resetTracking) this.adapter.resetTracking();
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
    
    // UPDATED HTML: Key Icon & "Premium Service" Title
    sidebar.innerHTML = `
      <div class="pn-header">
        <h3>Prompt Navigator</h3>
        <div class="pn-header-buttons">
          <button id="pn-settings-btn" title="Premium Service">🔑</button>
          <button id="pn-theme-toggle" title="Toggle Theme">🌓</button>
          <button id="pn-close" title="Close">✕</button>
        </div>
      </div>
      
      <div class="pn-stats">
        <span id="pn-count">0 messages</span>
        <button id="pn-refresh" title="Refresh">🔄</button>
      </div>
      
      <div class="pn-list-container" id="pn-list-container">
        <div id="pn-list"></div>
      </div>

      <div class="pn-settings-panel pn-hidden" id="pn-settings-panel">
        <div class="pn-settings-header">
          <button id="pn-settings-back-btn">← Back</button>
          <h3>Premium Service</h3>
        </div>
        <div class="pn-settings-content">
          
          <div class="pn-form-group">
            <label>AI Provider</label>
            <select id="pn-provider-select">
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI (GPT-3.5)</option>
            </select>
          </div>

          <div class="pn-form-group">
            <label id="pn-key-label">Gemini API Key</label>
            <input type="password" id="pn-api-key" placeholder="Paste Key Here...">
            <button id="pn-api-key-save">Save Key</button>
          </div>
          
          <div id="pn-help-text" style="margin-top: 15px; font-size: 12px; color: var(--pn-text-secondary); line-height: 1.5;">
            </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Basic Toggles
    toggle.addEventListener('click', () => sidebar.classList.toggle('pn-hidden'));
    document.getElementById('pn-close').addEventListener('click', () => sidebar.classList.add('pn-hidden'));
    document.getElementById('pn-refresh').addEventListener('click', () => {
      if (this.adapter.resetTracking) this.adapter.resetTracking();
      this.index = [];
      this.buildIndex();
    });
    
    document.getElementById('pn-theme-toggle').addEventListener('click', () => {
      this.isDarkMode = !this.isDarkMode;
      sidebar.classList.toggle('pn-dark-theme', this.isDarkMode);
      chrome.storage.local.set({ darkMode: this.isDarkMode });
    });
    if (this.isDarkMode) sidebar.classList.add('pn-dark-theme');

    this.attachSettingsListeners();
  }

  attachSettingsListeners() {
    const settingsPanel = document.getElementById('pn-settings-panel');
    const listContainer = document.getElementById('pn-list-container');
    const providerSelect = document.getElementById('pn-provider-select');
    const keyLabel = document.getElementById('pn-key-label');
    const keyInput = document.getElementById('pn-api-key');
    const helpText = document.getElementById('pn-help-text');

    // Open/Close
    document.getElementById('pn-settings-btn').onclick = () => {
      settingsPanel.classList.remove('pn-hidden');
      listContainer.classList.add('pn-hidden');
      this.loadSettings();
    };
    document.getElementById('pn-settings-back-btn').onclick = () => {
      settingsPanel.classList.add('pn-hidden');
      listContainer.classList.remove('pn-hidden');
    };

    // UI Updates based on selection
    const updateUI = (provider) => {
      if (provider === 'openai') {
        keyLabel.textContent = 'OpenAI API Key';
        keyInput.placeholder = 'sk-...';
        // Clean Link Style for OpenAI
        helpText.innerHTML = `
          <p>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--pn-primary)">OpenAI Platform</a>.</p>
          <p>2. Create a new secret key.</p>
          <p>3. Paste it here.</p>
        `;
      } else {
        keyLabel.textContent = 'Gemini API Key';
        keyInput.placeholder = 'AIzaSy...';
        // Clean Link Style for Gemini
        helpText.innerHTML = `
          <p>1. Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--pn-primary)">Google AI Studio</a>.</p>
          <p>2. Create API Key.</p>
          <p>3. Paste it here.</p>
        `;
      }
    };

    // Change Listener
    providerSelect.addEventListener('change', (e) => {
      updateUI(e.target.value);
    });

    // Save Button
    document.getElementById('pn-api-key-save').onclick = () => {
      const provider = providerSelect.value;
      const key = keyInput.value;
      
      chrome.storage.local.set({ 
        'pn_provider': provider,
        'pn_api_key': key 
      }, () => alert(`Saved ${provider === 'openai' ? 'OpenAI' : 'Gemini'} Key!`));
    };
  }

  loadSettings() {
    chrome.storage.local.get(['pn_provider', 'pn_api_key'], (r) => {
      const provider = r.pn_provider || 'gemini';
      document.getElementById('pn-provider-select').value = provider;
      document.getElementById('pn-api-key').value = r.pn_api_key || '';
      
      // Trigger UI update manually to set correct links
      document.getElementById('pn-provider-select').dispatchEvent(new Event('change'));
    });
  }

  async runSummarization(msg) {
    const { pn_api_key, pn_provider } = await chrome.storage.local.get(['pn_api_key', 'pn_provider']);
    
    if (!pn_api_key) {
      document.getElementById('pn-settings-btn').click();
      return;
    }

    const previewEl = document.getElementById(`preview-${msg.id}`);
    const original = previewEl.innerHTML;
    previewEl.innerHTML = `<span style="color:#eab308">Generating...</span>`;

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'NLP_REQUEST',
        data: { 
          text: msg.fullText, 
          apiKey: pn_api_key,
          provider: pn_provider || 'gemini'
        }
      });
      
      if (res.success) {
        previewEl.textContent = res.result.summary;
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      previewEl.innerHTML = original;
      alert("Error: " + e.message);
    }
  }

  // ... (Standard Methods Below) ...
  
  createContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'pn-context-menu';
    menu.className = 'pn-context-menu';
    document.body.appendChild(menu);
    document.addEventListener('click', () => { menu.style.display = 'none'; });
  }

  showContextMenu(x, y, msg) {
    const menu = document.getElementById('pn-context-menu');
    menu.innerHTML = `<button id="pn-ctx-summarize">✨ Generate Title (AI)</button>`;
    menu.style.display = 'block';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    document.getElementById('pn-ctx-summarize').onclick = () => {
      this.runSummarization(msg);
      menu.style.display = 'none';
    };
  }
  
  buildIndex() {
    const messageNodes = document.querySelectorAll(this.adapter.messageSelector);
    const newIndex = [];
    Array.from(messageNodes).forEach((node, idx) => {
      try {
        if (this.adapter.isValidMessage && !this.adapter.isValidMessage(node)) return;
        const role = this.adapter.extractRole(node);
        const preview = this.adapter.extractPreview(node);
        const attachment = this.adapter.extractAttachments(node);
        if (!preview || preview.length < 3) return;
        newIndex.push({
          id: `msg-${idx}-${Date.now()}`, role, preview, attachment, fullText: node.textContent || '', node,
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
    countEl.textContent = `${userCount} prompts • ${aiCount} replies`;

    if (this.index.length === 0) { listEl.innerHTML = '<div class="pn-empty">No messages found</div>'; return; }

    listEl.innerHTML = this.index.map(msg => {
      const roleClass = msg.role === 'user' ? 'pn-user' : 'pn-ai';
      const icon = msg.attachment ? ICONS[msg.attachment] || '' : '';
      const serialDisplay = msg.role === 'user' ? `<span class="pn-serial">#${msg.serialNo}</span>` : '';
      return `
        <div class="pn-item ${roleClass} pn-jump-item" data-id="${msg.id}">
          <div class="pn-item-header">
            ${serialDisplay}
            ${icon ? `<span class="pn-icon">${icon}</span>` : ''}
            <span class="pn-role">${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
          </div>
          <div class="pn-preview" id="preview-${msg.id}">${this.escapeHtml(msg.preview)}</div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.pn-item').forEach(item => {
      item.addEventListener('click', () => { this.jumpToMessage(item.getAttribute('data-id')); });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const id = item.getAttribute('data-id');
        const msg = this.index.find(m => m.id === id);
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const nav = new PromptNavigator();