// claude.js - FIXED VERSION
// Addresses: Vanishing Act, Observer Detachment on Navigation

class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'claude';
    
    // FIX #1: Target the MOST STABLE container
    // Claude uses a persistent main container that doesn't get destroyed
    this.containerSelector = 'main[class*="react-scroll"], main, [role="main"], body';
    
    // FIX #2: More comprehensive message selectors
    // Claude has multiple class patterns depending on version
    this.messageSelector = [
      '.font-user-message',
      '.font-claude-message',
      '[data-is-streaming]',
      'div[class*="contents"] > div[class*="font"]',
      // Fallback: look for the text containers themselves
      'div.whitespace-pre-wrap.break-words'
    ].join(', ');
  }

  extractRole(node) {
    // FIX #3: Multi-method role detection with robust fallbacks
    
    // Method 1: Direct class check
    if (node.classList.contains('font-user-message')) return 'user';
    if (node.classList.contains('font-claude-message')) return 'assistant';
    
    // Method 2: Check streaming attribute
    const isStreaming = node.getAttribute('data-is-streaming');
    if (isStreaming !== null) {
      // Streaming messages are always Claude's responses
      return 'assistant';
    }
    
    // Method 3: Look at parent container structure
    // Claude wraps user messages differently than AI messages
    const parentGrid = node.closest('.grid');
    if (parentGrid) {
      // Check for user-specific styling
      const hasUserStyling = parentGrid.querySelector('.bg-accent') !== null;
      if (hasUserStyling) return 'user';
      
      // Check column position (user messages often in specific grid columns)
      const gridCols = window.getComputedStyle(parentGrid).gridTemplateColumns;
      if (gridCols && gridCols.includes('auto')) return 'user';
    }
    
    // Method 4: Check for avatar indicators
    const nearbyAvatar = node.parentElement?.parentElement?.querySelector('img[alt]');
    if (nearbyAvatar) {
      const alt = nearbyAvatar.alt.toLowerCase();
      if (alt.includes('user') || alt.includes('you')) return 'user';
      if (alt.includes('claude') || alt.includes('assistant')) return 'assistant';
    }
    
    // Method 5: Position-based heuristic
    // User messages tend to appear on the right (flex-end)
    const flexParent = node.closest('[class*="flex"]');
    if (flexParent) {
      const styles = window.getComputedStyle(flexParent);
      if (styles.justifyContent === 'flex-end' || styles.alignItems === 'flex-end') {
        return 'user';
      }
    }
    
    // Method 6: Text content pattern matching
    const text = node.textContent?.trim() || '';
    // User messages are typically shorter and question-like
    if (text.length < 200 && text.endsWith('?')) return 'user';
    
    // Default to assistant (Claude's responses are more common)
    return 'assistant';
  }

  extractPreview(node) {
    // FIX #4: Clean text extraction avoiding UI elements
    
    // Find the actual text content container
    const textContainer = node.querySelector('.whitespace-pre-wrap') 
                       || node.querySelector('[class*="prose"]')
                       || node;
    
    let text = '';
    
    // Use TreeWalker for clean text extraction
    const walker = document.createTreeWalker(
      textContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip buttons, code blocks metadata, and hidden elements
          const tag = parent.tagName.toLowerCase();
          if (['button', 'script', 'style', 'code'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if parent has copy button classes
          if (parent.className && parent.className.includes('copy')) {
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
    
    // Clean up
    text = text.replace(/^(You:|Claude:|User:|Assistant:)\s*/i, '');
    text = text.replace(/\s+/g, ' '); // Normalize whitespace
    
    return text.substring(0, 120);
  }

  extractAttachments(node) {
    // FIX #5: Search in stable parent contexts
    
    // Find the message container (typically 2-3 levels up)
    const messageContainer = node.closest('[class*="group"]')
                          || node.closest('.grid')
                          || node.closest('[class*="message"]')
                          || node.parentElement?.parentElement;
    
    if (!messageContainer) return null;
    
    // Method 1: Look for explicit attachment indicators
    const fileAttachment = messageContainer.querySelector('[data-testid*="file"]')
                        || messageContainer.querySelector('[class*="attachment"]')
                        || messageContainer.querySelector('[class*="file-preview"]');
    
    if (fileAttachment) {
      // Determine file type from the element
      const fileText = fileAttachment.textContent?.toLowerCase() || '';
      const fileClass = fileAttachment.className?.toLowerCase() || '';
      
      if (fileText.includes('.pdf') || fileClass.includes('pdf')) return 'pdf';
      if (fileText.includes('.py') || fileText.includes('.js') || fileText.includes('.html')) return 'code';
      
      return 'pdf'; // Default assumption for files
    }
    
    // Method 2: Look for images (excluding avatars)
    const images = Array.from(messageContainer.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const alt = img.alt?.toLowerCase() || '';
      const src = img.src || '';
      
      // Exclude small icons and avatars
      if (width < 40 || height < 40) return false;
      if (alt.includes('avatar') || alt.includes('claude') || alt.includes('user')) return false;
      
      // Include if it looks like uploaded content
      if (src.includes('upload') || src.includes('file') || src.startsWith('blob:')) return true;
      
      // Include larger images
      return width > 100 && height > 100;
    });
    
    if (validImages.length > 0) return 'image';
    
    // Method 3: Text-based detection
    const allText = messageContainer.textContent || '';
    const codeExtensions = ['.py', '.js', '.html', '.css', '.json', '.cpp', '.java', '.txt', '.md', '.tsx', '.jsx'];
    
    for (const ext of codeExtensions) {
      if (allText.includes(ext)) {
        // Verify it's not just a code block discussion
        if (messageContainer.querySelector('[class*="file"]') || allText.match(new RegExp(`\\w+\\${ext}\\b`))) {
          return 'code';
        }
      }
    }
    
    // PDF detection
    if (allText.includes('.pdf') && messageContainer.querySelector('[class*="border"], [class*="rounded"]')) {
      return 'pdf';
    }
    
    return null;
  }
  
  // FIX #6: Add message stability tracking
  getMessageId(node) {
    // Try to find a stable identifier
    const container = node.closest('[data-message-id]') 
                   || node.closest('[id]');
    
    if (container) {
      const id = container.getAttribute('data-message-id') || container.id;
      if (id) return id;
    }
    
    // Fallback: create hash from content and position
    const role = this.extractRole(node);
    const preview = this.extractPreview(node);
    const allMessages = Array.from(document.querySelectorAll(this.messageSelector));
    const position = allMessages.indexOf(node);
    
    return `claude-${role}-${position}-${this.hashString(preview)}`;
  }
  
  // Helper function for stable hashing
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 20); i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  // FIX #7: Override to handle Claude's specific container structure
  findContainer() {
    // Try multiple strategies to find the container
    const selectors = this.containerSelector.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && this.isValidContainer(container)) {
        return container;
      }
    }
    
    // Ultimate fallback: use body
    return document.body;
  }
  
  isValidContainer(element) {
    if (!element) return false;
    
    // Check if it contains messages
    const messages = element.querySelectorAll(this.messageSelector);
    return messages.length > 0;
  }
}

// Global registration
if (typeof window !== 'undefined') {
  window.ClaudeAdapter = ClaudeAdapter;
}

console.log('[PN] Claude adapter loaded (FIXED VERSION)');
