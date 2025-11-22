// content.js - v3.0 FINAL
// Features: Only rank USER prompts, larger file icons, dark theme support

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('[PN] Content script v3.0 - USER RANKING + DARK THEME');

// LARGER FILE ICONS (24x24 instead of 16x16)
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
    this.isDarkMode = false; // Theme state
    
    setTimeout(() => {
      this.init();
    }, 2000);
  }

  async init() {
    console.log('[PN] Init started...');
    const host = window.location.hostname;

    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
      this.adapter = new ChatGPTAdapter();
    } else if (host.includes('gemini.google.com')) {
      this.adapter = new GeminiAdapter();
    } else if (host.includes('claude.ai')) {
      this.adapter = new ClaudeAdapter();
    } else if (host.includes('deepseek.com')) {
      this.adapter = new DeepSeekAdapter();
    } else if (host.includes('perplexity.ai')) {
      this.adapter = new PerplexityAdapter();
    } else {
      return;
    }

    console.log(`[PN] Detected ${this.adapter.platformName}`);
    
    // Load saved theme preference
    chrome.storage.local.get(['darkMode'], (result) => {
      this.isDarkMode = result.darkMode || false;
    });
    
    this.injectSidebar();
    this.buildIndex();
    this.startObserver();
    this.startUrlWatcher();
  }

  startUrlWatcher() {
    setInterval(() => {
      if (this.currentUrl !== window.location.href) {
        console.log('[PN] URL changed - Chat switch detected');
        this.currentUrl = window.location.href;
        
        // Reset adapter tracking
        if (this.adapter.resetTracking) {
          this.adapter.resetTracking();
        }
        
        this.index = [];
        this.debouncedBuildIndex();
        
        if (this.observer) {
          this.observer.disconnect();
        }
        this.startObserver();
      }
    }, 1000);
  }

  startObserver() {
    const findContainer = () => {
      if (this.adapter.findContainer) {
        return this.adapter.findContainer();
      }
      return document.querySelector(this.adapter.containerSelector) || document.body;
    };
    
    const targetNode = findContainer();
    if (!targetNode) {
      setTimeout(() => this.startObserver(), 1000);
      return;
    }

    const config = { childList: true, subtree: true };
    this.observer = new MutationObserver(() => this.debouncedBuildIndex());
    this.observer.observe(targetNode, config);
  }

  injectSidebar() {
    if (document.getElementById('pn-sidebar')) return;

    const toggle = document.createElement('div');
    toggle.id = 'pn-toggle';
    toggle.innerHTML = '🧭';
    toggle.title = 'Toggle Prompt Navigator';
    document.body.appendChild(toggle);

    const sidebar = document.createElement('div');
    sidebar.id = 'pn-sidebar';
    sidebar.className = 'pn-hidden';
    sidebar.innerHTML = `
      <div class="pn-header">
        <h3>Prompt Navigator</h3>
        <div class="pn-header-buttons">
          <button id="pn-theme-toggle" title="Toggle Theme">🌓</button>
          <button id="pn-close" title="Close">✕</button>
        </div>
      </div>
      <div class="pn-stats">
        <span id="pn-count">0 messages</span>
        <button id="pn-refresh" title="Refresh Index">🔄</button>
      </div>
      <div id="pn-list"></div>
    `;
    document.body.appendChild(sidebar);

    // Event listeners
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('pn-hidden');
    });

    document.getElementById('pn-close').addEventListener('click', () => {
      sidebar.classList.add('pn-hidden');
    });
    
    document.getElementById('pn-refresh').addEventListener('click', () => {
      if (this.adapter.resetTracking) {
        this.adapter.resetTracking();
      }
      this.index = [];
      this.buildIndex();
    });
    
    // Theme toggle
    document.getElementById('pn-theme-toggle').addEventListener('click', () => {
      this.isDarkMode = !this.isDarkMode;
      sidebar.classList.toggle('pn-dark-theme', this.isDarkMode);
      
      // Save preference
      chrome.storage.local.set({ darkMode: this.isDarkMode });
    });
    
    // Apply saved theme
    if (this.isDarkMode) {
      sidebar.classList.add('pn-dark-theme');
    }
  }

  buildIndex() {
    console.log('[PN] Building index...');
    
    const messageNodes = document.querySelectorAll(this.adapter.messageSelector);
    console.log(`[PN] Found ${messageNodes.length} potential message nodes`);
    
    const newIndex = [];
    
    Array.from(messageNodes).forEach((node, idx) => {
      try {
        // Validate message
        if (this.adapter.isValidMessage && !this.adapter.isValidMessage(node)) {
          return;
        }
        
        const role = this.adapter.extractRole(node);
        const preview = this.adapter.extractPreview(node);
        const attachment = this.adapter.extractAttachments(node);
        
        if (!preview || preview.length < 3) {
          return;
        }
        
        newIndex.push({
          id: `msg-${idx}-${Date.now()}`,
          role,
          preview,
          attachment,
          node,
          serialNo: role === 'user' ? (newIndex.filter(m => m.role === 'user').length + 1) : null // ONLY rank user messages
        });
      } catch (err) {
        console.error('[PN] Error processing node:', err);
      }
    });

    if (newIndex.length === 0 && this.index.length > 0 && this.currentUrl === window.location.href) {
    console.log('[PN] Scan returned 0 items, preserving existing list.');
    return; 
  }

  this.index = newIndex;
  console.log(`[PN] Index built: ${this.index.length} messages`);
  this.renderList();
  }

  renderList() {
    const listEl = document.getElementById('pn-list');
    const countEl = document.getElementById('pn-count');
    
    if (!listEl || !countEl) return;

    const userCount = this.index.filter(m => m.role === 'user').length;
    const aiCount = this.index.filter(m => m.role === 'assistant').length;
    
    countEl.textContent = `${userCount} prompts • ${aiCount} replies`;

    if (this.index.length === 0) {
      listEl.innerHTML = '<div class="pn-empty">No messages found</div>';
      return;
    }

    listEl.innerHTML = this.index.map(msg => {
      const roleClass = msg.role === 'user' ? 'pn-user' : 'pn-ai';
      const icon = msg.attachment ? ICONS[msg.attachment] || '' : '';
      
      // Only show serial number for USER messages
      const serialDisplay = msg.role === 'user' ? 
        `<span class="pn-serial">#${msg.serialNo}</span>` : '';
      
      return `
        <div class="pn-item ${roleClass}" data-id="${msg.id}">
          <div class="pn-item-header">
            ${serialDisplay}
            ${icon ? `<span class="pn-icon">${icon}</span>` : ''}
            <span class="pn-role">${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
          </div>
          <div class="pn-preview">${this.escapeHtml(msg.preview)}</div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.pn-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        this.jumpToMessage(id);
      });
    });
  }

  jumpToMessage(id) {
    const msg = this.index.find(m => m.id === id);
    if (!msg || !msg.node) {
      console.error('[PN] Message not found:', id);
      return;
    }

    msg.node.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center'
    });

    msg.node.style.transition = 'background-color 0.3s ease';
    msg.node.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
    
    setTimeout(() => {
      msg.node.style.backgroundColor = '';
    }, 2000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // --- 1. Settings & Context Menu Logic ---

  createContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.pn-item');
      if (!item) return;
      e.preventDefault();
      const id = item.getAttribute('data-id');
      const msg = this.index.find(m => m.id === id);
      if (msg) this.showContextMenu(e.pageX, e.pageY, msg);
    });
  }

  showContextMenu(x, y, msg) {
    const existing = document.getElementById('pn-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'pn-context-menu';
    menu.className = 'pn-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
      <div class="pn-menu-item" id="ctx-jump">Jump to Message</div>
      <div class="pn-menu-divider"></div>
      <div class="pn-menu-item" id="ctx-title">Generate Title (Premium)</div>
    `;

    document.body.appendChild(menu);

    // Action Handlers
    document.getElementById('ctx-jump').onclick = () => {
      this.jumpToMessage(msg.id);
      menu.remove();
    };
    
    document.getElementById('ctx-title').onclick = () => {
      this.generateTitle(msg);
      menu.remove();
    };

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  // --- 2. API Call Logic ---

  generateTitle(msg) {
    chrome.storage.local.get(['pn_api_key'], (result) => {
      if (!result.pn_api_key) {
        this.openSettings();
        alert('Please enter your OpenAI API key first.');
        return;
      }

      // Optimistic UI update
      const originalPreview = msg.preview;
      // Find the DOM element to update text immediately
      const itemEl = document.querySelector(`.pn-item[data-id="${msg.id}"] .pn-preview`);
      if(itemEl) itemEl.textContent = "Generating title...";

      chrome.runtime.sendMessage({
        type: 'NLP_REQUEST',
        data: {
          type: 'summarize',
          text: msg.preview,
          apiKey: result.pn_api_key,
          provider: 'openai'
        }
      }, response => {
        if (response && response.success) {
          msg.preview = response.result.summary;
          this.renderList(); // Re-render to show new title
        } else {
          if(itemEl) itemEl.textContent = originalPreview;
          alert('Error: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }

  // --- 3. Settings Panel Logic ---

  openSettings() {
    // Inject settings panel if not exists
    if (!document.getElementById('pn-settings-panel')) {
      const sidebar = document.getElementById('pn-sidebar');
      const panel = document.createElement('div');
      panel.id = 'pn-settings-panel';
      panel.className = 'pn-settings-panel';
      panel.innerHTML = `
        <div class="pn-settings-header">
          <button id="pn-settings-back-btn">←</button>
          <h3>Settings</h3>
        </div>
        <div class="pn-settings-content">
          <div class="pn-form-group">
            <label>OpenAI API Key</label>
            <input type="password" id="pn-api-key" placeholder="sk-...">
            <button id="pn-api-key-save">Save Key</button>
          </div>
        </div>
      `;
      sidebar.appendChild(panel);
      
      // Load saved key
      chrome.storage.local.get(['pn_api_key'], (r) => {
        if(r.pn_api_key) document.getElementById('pn-api-key').value = r.pn_api_key;
      });

      // Listeners
      document.getElementById('pn-settings-back-btn').onclick = () => panel.remove();
      document.getElementById('pn-api-key-save').onclick = () => {
        const key = document.getElementById('pn-api-key').value;
        chrome.storage.local.set({ 'pn_api_key': key }, () => alert('Key Saved!'));
      };
    }
  }
}

const nav = new PromptNavigator();
console.log('[PN] Content script initialized');