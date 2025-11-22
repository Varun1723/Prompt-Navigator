// content.js - v19 (SPA Navigation Fix)

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('[PN] Content script loaded (v19)');

const ICONS = {
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  pdf: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
};

class PromptNavigator {
  constructor() {
    this.adapter = null;
    this.index = [];
    this.debouncedBuildIndex = debounce(this.buildIndex.bind(this), 750);
    this.observer = null;
    this.currentUrl = window.location.href;

    setTimeout(() => { this.init(); }, 2000); 
  }

  async init() {
    console.log('[PN] Init started...');
    const host = window.location.hostname;

    // --- Platform Detection ---
    if (host.includes('chatgpt.com')) {
      this.adapter = new ChatGPTAdapter();
    } else if (host.includes('gemini.google.com')) {
      this.adapter = new GeminiAdapter();
    } else if (host.includes('claude.ai')) {
      this.adapter = new ClaudeAdapter();
    } else if (host.includes('grok.com') || host.includes('x.com')) {
      this.adapter = new GrokAdapter();
    } else if (host.includes('deepseek.com')) {
      this.adapter = new DeepSeekAdapter();
    } else if (host.includes('perplexity.ai')) {
      this.adapter = new PerplexityAdapter();
    } else {
      return;
    }
    
    console.log(`[PN] Detected ${this.adapter.platformName}`);
    
    this.injectSidebar();
    this.buildIndex();
    this.startObserver();
    this.startUrlWatcher(); // NEW: Watch for chat switching
    this.createContextMenu();
  }
  
  // NEW: SPA Navigation Handler
  startUrlWatcher() {
    setInterval(() => {
      if (this.currentUrl !== window.location.href) {
        console.log('[PN] URL changed (Chat Switch Detected). Re-initializing...');
        this.currentUrl = window.location.href;
        
        // Force a re-scan
        this.debouncedBuildIndex();
        
        // Re-attach observer in case the container was destroyed
        this.observer.disconnect();
        this.startObserver();
      }
    }, 1000);
  }
  
  startObserver() {
    const targetNode = document.querySelector(this.adapter.containerSelector);
    if (!targetNode) {
      setTimeout(this.startObserver.bind(this), 1000);
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
    document.body.appendChild(toggle);
    
    const sidebar = document.createElement('div');
    sidebar.id = 'pn-sidebar';
    sidebar.className = 'pn-hidden';
    sidebar.innerHTML = `
      <div class="pn-header">
        <h2>🧭 Prompt Navigator</h2>
        <button id="pn-settings-btn">⚙️</button>
      </div>
      <div class="pn-list-container" id="pn-list-container">
        <div class="pn-list" id="pn-list"></div>
      </div>
      <div class="pn-settings-panel pn-hidden" id="pn-settings-panel">
        <div class="pn-settings-header">
          <button id="pn-settings-back-btn">←</button>
          <h3>Settings</h3>
        </div>
        <div class="pn-settings-content">
          <div class="pn-form-group">
            <label>OpenAI API Key:</label>
            <input type="password" id="pn-api-key" placeholder="sk-...">
            <button id="pn-api-key-save">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);
    toggle.addEventListener('click', () => sidebar.classList.toggle('pn-hidden'));
    this.attachSettingsListeners();
    this.loadApiKey();
  }

  buildIndex() {
    const messageNodes = this.adapter.getMessages();
    this.index = [];
    let userPromptCounter = 1;

    for (let i = 0; i < messageNodes.length; i++) {
      try {
        const node = messageNodes[i];
        const role = this.adapter.extractRole(node);
        const attachmentType = this.adapter.extractAttachments(node);

        const entry = {
          serialNo: null,
          role: role,
          preview: this.adapter.extractPreview(node),
          fullText: node.textContent || '',
          attachment: attachmentType,
          node: node 
        };
        
        if (role === 'user') {
          entry.serialNo = userPromptCounter;
          userPromptCounter++;
        }
        this.index.push(entry);
      } catch (e) { console.error(e); }
    }
    this.renderSidebarList();
  }

  renderSidebarList() {
    const listElement = document.getElementById('pn-list');
    if (!listElement) return;
    if (this.index.length === 0) {
      listElement.innerHTML = '<div class="pn-empty">No messages found.</div>';
      return;
    }
    
    listElement.innerHTML = this.index.map((entry, idx) => {
      const safePreview = entry.preview.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const iconHtml = entry.attachment ? `<span class="pn-icon" title="${entry.attachment}">${ICONS[entry.attachment]}</span>` : '';

      if (entry.role === 'user') {
        return `
          <div class="pn-item user-prompt pn-jump-item" data-index="${idx}">
            <div class="pn-serial">${entry.serialNo}</div>
            <div class="pn-content">
              <div class="pn-preview" id="preview-${idx}">
                ${iconHtml} ${safePreview}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="pn-item ai-answer pn-jump-item" data-index="${idx}">
            <div class="pn-serial">↪</div>
            <div class="pn-content">
              <div class="pn-preview" id="preview-${idx}">${safePreview}</div>
            </div>
          </div>
        `;
      }
    }).join('');
    
    this.attachClickListeners();
  }
  
  attachClickListeners() {
    document.querySelectorAll('.pn-jump-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const index = e.currentTarget.dataset.index;
        this.jumpToMessage(index);
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const index = e.currentTarget.dataset.index;
        this.showContextMenu(index, e.clientX, e.clientY);
      });
    });
  }

  createContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'pn-context-menu';
    menu.className = 'pn-context-menu';
    menu.innerHTML = `
      <button id="pn-ctx-summarize">Generate Title</button>
      <button id="pn-ctx-tag">Auto-Tag (Coming Soon)</button>
    `;
    document.body.appendChild(menu);
    
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });
  }

  showContextMenu(index, x, y) {
    const menu = document.getElementById('pn-context-menu');
    
    // FIX: Set position FIRST
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // THEN show it
    menu.style.display = 'block';
    
    document.getElementById('pn-ctx-summarize').onclick = () => {
      this.runSummarization(index);
      menu.style.display = 'none';
    };
    
    document.getElementById('pn-ctx-tag').onclick = () => {
        alert("Auto-tagging coming in next update!");
        menu.style.display = 'none';
    };
  }

  async runSummarization(index) {
    const entry = this.index[index];
    const { pn_api_key } = await chrome.storage.local.get(['pn_api_key']);
    if (!pn_api_key) {
      alert('Please save your OpenAI API key in Settings first.');
      return;
    }
    
    const previewEl = document.getElementById(`preview-${index}`);
    const originalText = previewEl.innerHTML;
    const iconHtml = entry.attachment ? `<span class="pn-icon">${ICONS[entry.attachment]}</span>` : '';
    previewEl.innerHTML = `${iconHtml} <span class="pn-loader">Summarizing...</span>`;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'NLP_REQUEST',
        data: {
          type: 'summarize',
          text: entry.fullText,
          apiKey: pn_api_key,
          provider: 'openai'
        }
      });
      
      if (response.success) {
        previewEl.innerHTML = `${iconHtml} ${response.result.summary}`;
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('[PN] Summarization failed:', error);
      previewEl.innerHTML = originalText;
      alert(`Summarization failed: ${error.message}`);
    }
  }

  jumpToMessage(index) {
    const entry = this.index[index];
    if (entry && entry.node) {
      entry.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      entry.node.classList.add('pn-highlight');
      setTimeout(() => {
        entry.node.classList.remove('pn-highlight');
      }, 2000);
    }
  }

  attachSettingsListeners() {
    const settingsBtn = document.getElementById('pn-settings-btn');
    const settingsPanel = document.getElementById('pn-settings-panel');
    const listContainer = document.getElementById('pn-list-container');
    const backBtn = document.getElementById('pn-settings-back-btn');
    settingsBtn.addEventListener('click', () => {
      listContainer.classList.add('pn-hidden');
      settingsPanel.classList.remove('pn-hidden');
    });
    backBtn.addEventListener('click', () => {
      settingsPanel.classList.add('pn-hidden');
      listContainer.classList.remove('pn-hidden');
    });
    document.getElementById('pn-api-key-save').addEventListener('click', () => {
      const key = document.getElementById('pn-api-key').value;
      chrome.storage.local.set({ 'pn_api_key': key }, () => {
        alert('API Key Saved!');
      });
    });
  }
  
  loadApiKey() {
    chrome.storage.local.get(['pn_api_key'], (result) => {
      if (result.pn_api_key) {
        document.getElementById('pn-api-key').value = result.pn_api_key;
      }
    });
  }
}

new PromptNavigator();