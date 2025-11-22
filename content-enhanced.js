// content.js - ENHANCED VERSION with Deduplication & Navigation Fixes
// Addresses: SPA Navigation Issues, Duplicate Prevention, Observer Stability

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

console.log('[PN] Content script loaded (ENHANCED v20)');

const ICONS = {
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  pdf: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
};

class PromptNavigator {
  constructor() {
    this.adapter = null;
    this.index = [];
    this.seenMessageIds = new Set(); // FIX: Track seen messages to prevent duplicates
    this.debouncedBuildIndex = debounce(this.buildIndex.bind(this), 750);
    this.observer = null;
    this.currentUrl = window.location.href;
    this.currentChatId = null;
    this.isRebuilding = false; // FIX: Prevent concurrent rebuilds
    
    // Delayed init to ensure DOM is ready
    setTimeout(() => {
      this.init();
    }, 2000);
  }

  async init() {
    console.log('[PN] Init started...');
    const host = window.location.hostname;

    // --- Platform Detection ---
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
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
      console.log('[PN] Unsupported platform:', host);
      return;
    }

    console.log(`[PN] Detected ${this.adapter.platformName}`);
    
    this.injectSidebar();
    this.buildIndex();
    this.startObserver();
    this.startUrlWatcher();
    this.createContextMenu();
  }

  // ENHANCED: Better SPA Navigation Handler
  startUrlWatcher() {
    // Watch for URL changes (chat switches)
    setInterval(() => {
      const newUrl = window.location.href;
      const newChatId = this.extractChatId(newUrl);
      
      if (this.currentUrl !== newUrl || this.currentChatId !== newChatId) {
        console.log('[PN] Navigation detected:', {
          oldUrl: this.currentUrl,
          newUrl: newUrl,
          oldChat: this.currentChatId,
          newChat: newChatId
        });
        
        this.currentUrl = newUrl;
        this.currentChatId = newChatId;
        
        // Clear previous state
        this.seenMessageIds.clear();
        this.index = [];
        
        // Force re-scan after a delay (let page settle)
        setTimeout(() => {
          this.buildIndex();
          
          // Re-attach observer to new container
          if (this.observer) {
            this.observer.disconnect();
          }
          this.startObserver();
        }, 500);
      }
    }, 1000);
  }
  
  // ENHANCED: Extract chat ID from URL
  extractChatId(url) {
    try {
      const urlObj = new URL(url);
      
      // ChatGPT: /c/{id}
      const chatGptMatch = urlObj.pathname.match(/\/c\/([^\/]+)/);
      if (chatGptMatch) return chatGptMatch[1];
      
      // Claude: /chat/{id}
      const claudeMatch = urlObj.pathname.match(/\/chat\/([^\/]+)/);
      if (claudeMatch) return claudeMatch[1];
      
      // Gemini: ?thread_id={id}
      const geminiThread = urlObj.searchParams.get('thread_id');
      if (geminiThread) return geminiThread;
      
      // DeepSeek: /chat/{id}
      const deepseekMatch = urlObj.pathname.match(/\/chat\/([^\/]+)/);
      if (deepseekMatch) return deepseekMatch[1];
      
      // Default: use full pathname as ID
      return urlObj.pathname;
    } catch (e) {
      return window.location.pathname;
    }
  }

  // ENHANCED: Better Observer with Error Handling
  startObserver() {
    // Find the container
    const findContainer = () => {
      if (this.adapter.findContainer) {
        return this.adapter.findContainer();
      }
      
      const selectors = this.adapter.containerSelector.split(',').map(s => s.trim());
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    };
    
    const targetNode = findContainer();
    
    if (!targetNode) {
      console.warn('[PN] Container not found, retrying...');
      setTimeout(() => this.startObserver(), 1000);
      return;
    }
    
    console.log('[PN] Observer attached to:', targetNode.tagName, targetNode.className);

    const config = { 
      childList: true, 
      subtree: true,
      characterData: false // Don't watch text changes, only structure
    };
    
    this.observer = new MutationObserver((mutations) => {
      // Filter for meaningful mutations
      const hasMeaningfulChange = mutations.some(mutation => {
        // Only care about added/removed nodes that could be messages
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          return true;
        }
        return false;
      });
      
      if (hasMeaningfulChange) {
        console.log('[PN] DOM change detected, rebuilding...');
        this.debouncedBuildIndex();
      }
    });
    
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
        <button id="pn-close" title="Close">✕</button>
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
      this.seenMessageIds.clear();
      this.buildIndex();
    });
  }

  // ENHANCED: Build Index with Deduplication
  buildIndex() {
    if (this.isRebuilding) {
      console.log('[PN] Already rebuilding, skipping...');
      return;
    }
    
    this.isRebuilding = true;
    
    try {
      console.log('[PN] Building index...');
      
      const messageNodes = document.querySelectorAll(this.adapter.messageSelector);
      console.log(`[PN] Found ${messageNodes.length} potential message nodes`);
      
      const newIndex = [];
      const newSeenIds = new Set();
      
      Array.from(messageNodes).forEach((node, idx) => {
        try {
          // Validate message
          if (this.adapter.isValidMessage && !this.adapter.isValidMessage(node)) {
            return;
          }
          
          // Get or create message ID
          const msgId = this.adapter.getMessageId 
            ? this.adapter.getMessageId(node)
            : `${this.adapter.platformName}-${idx}`;
          
          // FIX: Skip if we've already seen this message
          if (newSeenIds.has(msgId)) {
            console.log('[PN] Duplicate detected, skipping:', msgId);
            return;
          }
          
          // Extract data
          const role = this.adapter.extractRole(node);
          const preview = this.adapter.extractPreview(node);
          const attachment = this.adapter.extractAttachments(node);
          
          // Additional validation
          if (!preview || preview.length < 3) {
            console.log('[PN] Skipping message with no content');
            return;
          }
          
          newSeenIds.add(msgId);
          
          newIndex.push({
            id: msgId,
            role,
            preview,
            attachment,
            node,
            serialNo: newIndex.length + 1
          });
        } catch (err) {
          console.error('[PN] Error processing message node:', err);
        }
      });

      // Update state
      this.index = newIndex;
      this.seenMessageIds = newSeenIds;
      
      console.log(`[PN] Index built: ${this.index.length} messages`);
      this.renderList();
      
    } catch (err) {
      console.error('[PN] Error building index:', err);
    } finally {
      this.isRebuilding = false;
    }
  }

  renderList() {
    const listEl = document.getElementById('pn-list');
    const countEl = document.getElementById('pn-count');
    
    if (!listEl || !countEl) return;

    // Group by role for stats
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
      
      return `
        <div class="pn-item ${roleClass}" data-id="${msg.id}">
          <div class="pn-item-header">
            <span class="pn-serial">#${msg.serialNo}</span>
            ${icon ? `<span class="pn-icon">${icon}</span>` : ''}
            <span class="pn-role">${msg.role === 'user' ? 'You' : 'AI'}</span>
          </div>
          <div class="pn-preview">${this.escapeHtml(msg.preview)}</div>
        </div>
      `;
    }).join('');

    // Attach click handlers
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

    // Scroll into view
    msg.node.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });

    // Highlight
    msg.node.style.transition = 'background-color 0.3s ease';
    msg.node.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
    
    setTimeout(() => {
      msg.node.style.backgroundColor = '';
    }, 2000);

    console.log('[PN] Jumped to message:', id);
  }

  createContextMenu() {
    // Context menu for "Generate Title" feature
    document.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.pn-item');
      if (!item) return;
      
      e.preventDefault();
      
      const id = item.getAttribute('data-id');
      const msg = this.index.find(m => m.id === id);
      
      if (msg) {
        this.showContextMenu(e.pageX, e.pageY, msg);
      }
    });
  }

  showContextMenu(x, y, msg) {
    // Remove existing menu
    const existing = document.getElementById('pn-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'pn-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: var(--pn-surface);
      border: 1px solid var(--pn-border);
      border-radius: 8px;
      padding: 8px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      min-width: 150px;
    `;

    menu.innerHTML = `
      <div class="pn-menu-item" data-action="jump">Jump to Message</div>
      <div class="pn-menu-item" data-action="copy">Copy Text</div>
      <div class="pn-menu-divider"></div>
      <div class="pn-menu-item" data-action="generate-title">Generate Title (Premium)</div>
    `;

    document.body.appendChild(menu);

    // Handle actions
    menu.querySelectorAll('.pn-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        
        if (action === 'jump') {
          this.jumpToMessage(msg.id);
        } else if (action === 'copy') {
          navigator.clipboard.writeText(msg.preview);
        } else if (action === 'generate-title') {
          this.generateTitle(msg);
        }
        
        menu.remove();
      });
    });

    // Remove on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  generateTitle(msg) {
    // Send to background script for API call
    chrome.runtime.sendMessage({
      action: 'generate-title',
      text: msg.preview
    }, response => {
      if (response && response.title) {
        alert(`Generated Title:\n\n${response.title}`);
      } else {
        alert('Title generation requires API key setup in extension settings.');
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when ready
const nav = new PromptNavigator();

console.log('[PN] Content script initialization complete');
