// gemini.js - v2.0 FINAL - FIXED USER PROMPT TRACKING
// This version properly tracks BOTH user prompts AND AI responses

class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'gemini';
    
    // CRITICAL FIX: Target conversation-turn containers, not just message-content
    // Gemini wraps each user/AI exchange in a conversation-turn element
    this.containerSelector = 'main[role="main"], chat-window, .conversation-container, body';
    
    // FIXED SELECTORS: Include conversation-turn to capture user prompts
    this.messageSelector = [
      'conversation-turn',                    // PRIMARY: Captures full turns (user + AI)
      'message-content',                      // Individual message content
      '[data-message-author-role="user"]',    // Explicit user messages
      '[data-message-author-role="model"]',   // Explicit AI messages
      '.user-query-container',                // User prompt containers
      '.model-response-container'             // AI response containers
    ].join(', ');
  }

  extractRole(node) {
    // STRATEGY 1: Check data-message-author-role attribute (most reliable)
    const directRole = node.getAttribute('data-message-author-role');
    if (directRole === 'user') return 'user';
    if (directRole === 'model') return 'assistant';
    
    // STRATEGY 2: Check parent conversation-turn for role
    const conversationTurn = node.closest('conversation-turn');
    if (conversationTurn) {
      const turnRole = conversationTurn.getAttribute('data-message-author-role');
      if (turnRole === 'user') return 'user';
      if (turnRole === 'model') return 'assistant';
    }
    
    // STRATEGY 3: Look for parent container with role
    const parentWithRole = node.closest('[data-message-author-role]');
    if (parentWithRole) {
      const parentRole = parentWithRole.getAttribute('data-message-author-role');
      if (parentRole === 'user') return 'user';
      if (parentRole === 'model') return 'assistant';
    }
    
    // STRATEGY 4: Check for user/model specific classes
    if (node.classList.contains('user-query') || 
        node.closest('.user-query-container')) {
      return 'user';
    }
    
    if (node.classList.contains('model-response-text') || 
        node.closest('.model-response-container')) {
      return 'assistant';
    }
    
    // STRATEGY 5: Pattern matching on text content
    // User messages tend to be shorter and question-like
    const text = node.textContent?.trim() || '';
    if (text.length < 200 && (text.endsWith('?') || text.endsWith('please'))) {
      return 'user';
    }
    
    // STRATEGY 6: Check for presence of response indicators
    // AI responses often have specific formatting elements
    if (node.querySelector('.model-response-text') || 
        node.querySelector('[class*="markdown"]')) {
      return 'assistant';
    }
    
    // DEFAULT: If we can't determine, assume assistant
    // (Better to show as AI than miss a message entirely)
    console.log('[PN-Gemini] Could not determine role, defaulting to assistant:', 
                text.substring(0, 50));
    return 'assistant';
  }

  extractPreview(node) {
    // Try to find the actual text content, avoiding UI elements
    let textContainer = node.querySelector('message-content') || 
                       node.querySelector('.message-text-content') ||
                       node.querySelector('[class*="markdown"]') ||
                       node;
    
    let text = '';
    
    // Use TreeWalker for clean text extraction
    const walker = document.createTreeWalker(
      textContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tag = parent.tagName.toLowerCase();
          // Skip buttons, scripts, and hidden elements
          if (['button', 'script', 'style', 'svg'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textParts = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      const trimmed = currentNode.textContent.trim();
      if (trimmed && trimmed.length > 2) {
        textParts.push(trimmed);
      }
    }
    
    text = textParts.join(' ');
    
    // Fallback if TreeWalker didn't work
    if (!text || text.length < 5) {
      text = textContainer.textContent?.trim() || '';
    }
    
    // Clean up common prefixes
    text = text.replace(/^(You:|User:|Gemini:|Model:)\s*/i, '');
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    
    return text.substring(0, 120);
  }

  extractAttachments(node) {
    // Find the message container
    const messageContainer = node.closest('conversation-turn') ||
                          node.closest('[data-message-id]') ||
                          node.closest('.message-container') ||
                          node.parentElement;
    
    if (!messageContainer) return null;
    
    // Check for images (exclude avatars and UI icons)
    const images = Array.from(messageContainer.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const alt = img.alt?.toLowerCase() || '';
      const src = img.src || '';
      
      // Exclude small icons and avatars
      if (width < 40 || height < 40) return false;
      if (alt.includes('avatar') || alt.includes('user') || alt.includes('gemini')) return false;
      
      // Include uploaded content
      if (src.includes('upload') || src.includes('file') || src.startsWith('blob:')) return true;
      
      // Include larger images
      return width > 100 && height > 100;
    });
    
    if (validImages.length > 0) return 'image';
    
    // Check for PDF attachments
    const text = messageContainer.textContent || '';
    if (/\b\w+\.pdf\b/i.test(text) && messageContainer.querySelector('[class*="file"]')) {
      return 'pdf';
    }
    
    // Check for code file attachments
    const codeExtensions = ['.py', '.js', '.html', '.css', '.json', '.cpp', '.java', '.txt', '.md'];
    for (const ext of codeExtensions) {
      if (text.includes(ext) && messageContainer.querySelector('[class*="file"]')) {
        return 'code';
      }
    }
    
    return null;
  }
  
  // Validate messages to avoid empty or invalid entries
  isValidMessage(node) {
    if (!node || !node.textContent) return false;
    
    const text = node.textContent.trim();
    
    // Must have meaningful content
    if (text.length < 10) return false;
    
    // Skip loading indicators
    if (text === 'Thinking...' || text === 'Loading...' || text === '...') return false;
    
    // Skip if it's just buttons/UI elements
    if (node.tagName === 'BUTTON' || node.closest('button')) return false;
    
    // Skip if it's a toolbar or menu
    if (node.closest('[role="toolbar"]') || node.closest('[role="menu"]')) return false;
    
    return true;
  }
  
  // Generate stable message ID
  getMessageId(node) {
    // Try to get stable ID from DOM
    const container = node.closest('[data-message-id]');
    if (container) {
      return container.getAttribute('data-message-id');
    }
    
    // Create stable hash from content + role + position
    const role = this.extractRole(node);
    const preview = this.extractPreview(node);
    const allMessages = Array.from(document.querySelectorAll(this.messageSelector));
    const position = allMessages.indexOf(node);
    
    // Simple hash function
    let hash = 0;
    const hashInput = `${role}-${preview.substring(0, 30)}`;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `gemini-${role}-${position}-${Math.abs(hash).toString(36)}`;
  }
  
  // Find stable container
  findContainer() {
    const selectors = this.containerSelector.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && this.isValidContainer(container)) {
        console.log('[PN-Gemini] Found container:', selector);
        return container;
      }
    }
    
    console.warn('[PN-Gemini] No valid container found, using body');
    return document.body;
  }
  
  isValidContainer(element) {
    if (!element) return false;
    
    // Check if it contains messages
    const messages = element.querySelectorAll(this.messageSelector);
    const validMessages = Array.from(messages).filter(msg => {
      return this.isValidMessage(msg);
    });
    
    console.log(`[PN-Gemini] Container has ${validMessages.length} valid messages`);
    return validMessages.length > 0;
  }
}

// Global registration
if (typeof window !== 'undefined') {
  window.GeminiAdapter = GeminiAdapter;
}

console.log('[PN] Gemini adapter v2.0 loaded - USER PROMPT TRACKING FIXED');
