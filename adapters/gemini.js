// gemini.js - v3.0 FINAL - VANISHING FIX + ONLY USER PROMPTS TRACKED
// This version PERMANENTLY tracks user prompts and fixes vanishing issue

class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'gemini';
    this.seenMessages = new Set();
    
    // CRITICAL: Use body as container - most stable
    this.containerSelector = 'body';
    
    // ENHANCED SELECTORS: Target BOTH conversation-turn AND individual messages
    this.messageSelector = [
      'conversation-turn[data-message-author-role]',  // Conversation turns with role
      'message-content',                               // Individual message content
      '[data-message-author-role="user"]',            // Explicit user messages
      '[data-message-author-role="model"]',           // Explicit model messages
      'div[class*="user-query"]',                     // User query divs
      'div[class*="model-response"]'                  // Model response divs
    ].join(', ');
  }

  extractRole(node) {
    // METHOD 1: Direct attribute check
    const directRole = node.getAttribute('data-message-author-role');
    if (directRole === 'user') return 'user';
    if (directRole === 'model') return 'assistant';
    
    // METHOD 2: Parent check
    const parent = node.closest('[data-message-author-role]');
    if (parent) {
      const parentRole = parent.getAttribute('data-message-author-role');
      if (parentRole === 'user') return 'user';
      if (parentRole === 'model') return 'assistant';
    }
    
    // METHOD 3: Class name check
    const classList = node.className || '';
    if (classList.includes('user-query') || classList.includes('user')) return 'user';
    if (classList.includes('model-response') || classList.includes('model')) return 'assistant';
    
    // METHOD 4: Parent class check
    if (node.closest('.user-query-container')) return 'user';
    if (node.closest('.model-response-container')) return 'assistant';
    
    // METHOD 5: Content pattern (fallback)
    const text = node.textContent?.trim() || '';
    if (text.length < 200 && text.endsWith('?')) return 'user';
    
    // DEFAULT: Try to detect by siblings/position
    const prevSibling = node.previousElementSibling;
    if (prevSibling) {
      const prevRole = prevSibling.getAttribute('data-message-author-role');
      // Alternate between user and assistant
      return prevRole === 'user' ? 'assistant' : 'user';
    }
    
    return 'assistant';
  }

  extractPreview(node) {
    // Find the actual text container
    const textContainer = node.querySelector('message-content') || 
                         node.querySelector('.markdown-content') ||
                         node;
    
    let text = textContainer.textContent?.trim() || '';
    
    // Clean up common prefixes
    text = text.replace(/^(You:|User:|Gemini:|Model:)\s*/i, '');
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    
    return text.substring(0, 120);
  }

  extractAttachments(node) {
    const container = node.closest('conversation-turn') || node.parentElement || node;
    
    // Check for images
    const images = Array.from(container.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || 0;
      const alt = img.alt?.toLowerCase() || '';
      return width > 40 && !alt.includes('avatar') && !alt.includes('user') && !alt.includes('gemini');
    });
    
    if (validImages.length > 0) return 'image';
    
    // Check for files by text pattern
    const text = container.textContent || '';
    if (/\b\w+\.pdf\b/i.test(text)) return 'pdf';
    if (/\.(py|js|jsx|ts|tsx|html|css|json|cpp|java)\b/i.test(text)) return 'code';
    if (/\.(doc|docx|txt|md)\b/i.test(text)) return 'document';
    
    return null;
  }
  
  // Deduplication with persistent tracking
  isValidMessage(node) {
    if (!node || !node.textContent) return false;
    
    const text = node.textContent.trim();
    
    // Skip empty or loading messages
    if (text.length < 10) return false;
    if (text === 'Thinking...' || text === 'Loading...' || text === '...') return false;
    
    // Skip if it's a button or UI element
    if (node.tagName === 'BUTTON' || node.closest('button')) return false;
    
    // Create unique identifier including role
    const role = this.extractRole(node);
    const preview = this.extractPreview(node);
    const messageId = `${role}-${preview.substring(0, 60)}`;
    
    // Check for duplicates
    if (this.seenMessages.has(messageId)) {
      return false; // Skip silently
    }
    
    // Mark as seen
    this.seenMessages.add(messageId);
    return true;
  }
  
  // Reset tracking on chat switch
  resetTracking() {
    this.seenMessages.clear();
    console.log('[PN-Gemini] Tracking reset');
  }
  
  // Override to ensure we find the container
  findContainer() {
    // Always use body for Gemini - most stable
    return document.body;
  }
}

window.GeminiAdapter = GeminiAdapter;
console.log('[PN] Gemini adapter v3.0 - VANISHING FIXED + USER TRACKING');