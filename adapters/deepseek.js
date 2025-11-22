// deepseek.js - FIXED VERSION
// Addresses: Total Blindness, Role Confusion, Navigation Issues

class DeepSeekAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'deepseek';
    
    // FIX #1: Target the stable main chat container
    // DeepSeek uses a consistent structure for the chat area
    this.containerSelector = [
      'main.chat-container',
      'div[class*="chat-body"]',
      'div[class*="conversation"]',
      'main',
      'body'
    ].join(', ');
    
    // FIX #2: More specific and comprehensive message selectors
    // Target the actual message bubbles, not wrapper divs
    this.messageSelector = [
      // User messages (typically right-aligned)
      'div.message-item.user',
      'div[class*="user-message"]',
      'div.flex.flex-col.items-end > div', // Right-aligned structure
      
      // AI messages (typically left-aligned)
      'div.message-item.assistant',
      'div[class*="assistant-message"]',
      'div.ds-markdown',
      'div[class*="model-response"]',
      
      // Generic message containers as fallback
      'div[class*="message-bubble"]',
      'div[class*="chat-message"]'
    ].join(', ');
  }

  extractRole(node) {
    // FIX #3: Robust multi-strategy role detection
    
    // Strategy 1: Check explicit class names
    if (node.classList.contains('user') || node.classList.contains('user-message')) {
      return 'user';
    }
    if (node.classList.contains('assistant') || node.classList.contains('assistant-message')) {
      return 'assistant';
    }
    
    // Strategy 2: Check data attributes
    const role = node.getAttribute('data-role') || node.getAttribute('data-message-role');
    if (role === 'user' || role === 'human') return 'user';
    if (role === 'assistant' || role === 'ai' || role === 'model') return 'assistant';
    
    // Strategy 3: Check parent container classes
    const parentMessage = node.closest('[class*="message"]');
    if (parentMessage) {
      const classes = parentMessage.className.toLowerCase();
      if (classes.includes('user')) return 'user';
      if (classes.includes('assistant') || classes.includes('ai') || classes.includes('model')) return 'assistant';
    }
    
    // Strategy 4: Layout-based detection (DeepSeek uses flexbox alignment)
    // User messages align to the right (items-end), AI messages to the left
    const flexContainer = node.closest('.flex');
    if (flexContainer) {
      const classes = flexContainer.className;
      if (classes.includes('items-end') || classes.includes('justify-end')) {
        return 'user';
      }
      if (classes.includes('items-start') || classes.includes('justify-start')) {
        return 'assistant';
      }
    }
    
    // Strategy 5: Check for specific content markers
    // DeepSeek often has specific wrapper structures
    if (node.classList.contains('ds-markdown')) {
      // Markdown content is typically AI responses
      return 'assistant';
    }
    
    // Strategy 6: Avatar detection
    const avatar = parentMessage?.querySelector('img[alt], svg[class*="avatar"]');
    if (avatar) {
      const alt = avatar.alt?.toLowerCase() || '';
      const parentClass = avatar.parentElement?.className?.toLowerCase() || '';
      
      if (alt.includes('user') || alt.includes('you') || parentClass.includes('user')) {
        return 'user';
      }
      if (alt.includes('deepseek') || alt.includes('assistant') || parentClass.includes('assistant')) {
        return 'assistant';
      }
    }
    
    // Strategy 7: Position in DOM (last resort heuristic)
    // In DeepSeek, user and assistant messages alternate
    const allMessages = Array.from(document.querySelectorAll(this.messageSelector));
    const index = allMessages.indexOf(node);
    
    if (index > 0) {
      const prevRole = this.extractRole(allMessages[index - 1]);
      // Alternate roles
      return prevRole === 'user' ? 'assistant' : 'user';
    }
    
    // Strategy 8: Content pattern analysis
    const text = node.textContent?.trim() || '';
    
    // User messages tend to be shorter and question-like
    if (text.length < 150 && (text.endsWith('?') || text.includes('please') || text.includes('help'))) {
      return 'user';
    }
    
    // AI messages tend to be longer and explanatory
    if (text.length > 300 || text.includes('However,') || text.includes('According to')) {
      return 'assistant';
    }
    
    // Default: if we can't determine, assume assistant
    // (Most content in chat is AI responses)
    return 'assistant';
  }

  extractPreview(node) {
    // FIX #4: Clean text extraction
    
    // Try to find the main text container
    const textContainer = node.querySelector('.message-content')
                       || node.querySelector('.ds-markdown')
                       || node.querySelector('[class*="text"]')
                       || node;
    
    let text = '';
    
    // Use TreeWalker for precise text extraction
    const walker = document.createTreeWalker(
      textContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip UI elements
          const tag = parent.tagName.toLowerCase();
          if (['button', 'script', 'style', 'svg'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip code block language labels
          if (parent.className && parent.className.includes('language-')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip hidden elements
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
      if (trimmed) textParts.push(trimmed);
    }
    
    text = textParts.join(' ');
    
    // Fallback
    if (!text) {
      text = textContainer.textContent?.trim() || '';
    }
    
    // Clean up common prefixes
    text = text.replace(/^(You|DeepSeek|User|Assistant):\s*/i, '');
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    
    return text.substring(0, 120);
  }

  extractAttachments(node) {
    // FIX #5: Search in proper parent contexts
    
    // Find the message container
    const messageContainer = node.closest('.message-item')
                          || node.closest('[class*="message"]')
                          || node.closest('.flex')
                          || node.parentElement;
    
    if (!messageContainer) return null;
    
    // Method 1: Look for explicit file attachments
    const fileElement = messageContainer.querySelector('.ds-file')
                     || messageContainer.querySelector('[class*="file-attachment"]')
                     || messageContainer.querySelector('[class*="upload"]')
                     || messageContainer.querySelector('[data-file-type]');
    
    if (fileElement) {
      const fileType = fileElement.getAttribute('data-file-type');
      if (fileType) return fileType;
      
      const text = fileElement.textContent?.toLowerCase() || '';
      const className = fileElement.className?.toLowerCase() || '';
      
      if (text.includes('.pdf') || className.includes('pdf')) return 'pdf';
      if (text.includes('.py') || text.includes('.js') || text.includes('.html')) return 'code';
      if (text.includes('.png') || text.includes('.jpg') || className.includes('image')) return 'image';
      
      return 'pdf'; // Default for files
    }
    
    // Method 2: Image detection
    const images = Array.from(messageContainer.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const alt = img.alt?.toLowerCase() || '';
      const src = img.src || '';
      
      // Exclude small icons and avatars
      if (width < 40 || height < 40) return false;
      if (alt.includes('avatar') || alt.includes('deepseek') || alt.includes('user')) return false;
      
      // Include uploaded images
      if (src.includes('upload') || src.includes('file') || src.startsWith('blob:')) return true;
      
      // Include larger images
      return width > 100 && height > 100;
    });
    
    if (validImages.length > 0) return 'image';
    
    // Method 3: Text-based detection
    const allText = messageContainer.textContent || '';
    
    // Check for code files
    const codeExtensions = ['.py', '.js', '.html', '.css', '.json', '.cpp', '.java', '.txt', '.md', '.rs', '.go'];
    for (const ext of codeExtensions) {
      // Look for filename patterns
      if (allText.match(new RegExp(`\\b\\w+\\${ext}\\b`, 'i'))) {
        return 'code';
      }
    }
    
    // Check for PDF
    if (allText.match(/\b\w+\.pdf\b/i)) {
      return 'pdf';
    }
    
    return null;
  }
  
  // FIX #6: Add message ID tracking
  getMessageId(node) {
    // Try to find stable ID
    const container = node.closest('[data-message-id]')
                   || node.closest('[id]');
    
    if (container) {
      const id = container.getAttribute('data-message-id') || container.id;
      if (id) return id;
    }
    
    // Create stable hash
    const role = this.extractRole(node);
    const preview = this.extractPreview(node);
    const allMessages = Array.from(document.querySelectorAll(this.messageSelector));
    const position = allMessages.indexOf(node);
    
    return `deepseek-${role}-${position}-${this.hashString(preview)}`;
  }
  
  // Helper for hashing
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 20); i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  // FIX #7: Validate messages to avoid empty/invalid entries
  isValidMessage(node) {
    if (!node || !node.textContent) return false;
    
    const text = node.textContent.trim();
    
    // Must have meaningful content
    if (text.length < 5) return false;
    
    // Skip if it's just whitespace or loading indicators
    if (/^[\s\.]+$/.test(text)) return false;
    if (text === 'Thinking...' || text === 'Loading...') return false;
    
    // Skip duplicate toolbar/button elements
    if (node.tagName === 'BUTTON' || node.closest('button')) return false;
    
    return true;
  }
  
  // FIX #8: Enhanced container finding
  findContainer() {
    const selectors = this.containerSelector.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && this.isValidContainer(container)) {
        console.log('[PN-DeepSeek] Found container:', selector);
        return container;
      }
    }
    
    console.warn('[PN-DeepSeek] No valid container found, using body');
    return document.body;
  }
  
  isValidContainer(element) {
    if (!element) return false;
    
    // Check if it actually contains messages
    const messages = element.querySelectorAll(this.messageSelector);
    const validMessages = Array.from(messages).filter(msg => this.isValidMessage(msg));
    
    return validMessages.length > 0;
  }
}

// Global registration
if (typeof window !== 'undefined') {
  window.DeepSeekAdapter = DeepSeekAdapter;
}

console.log('[PN] DeepSeek adapter loaded (FIXED VERSION)');
