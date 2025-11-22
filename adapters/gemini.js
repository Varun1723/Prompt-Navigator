// gemini.js - FIXED VERSION
// Addresses: Triple Ghost Bug, Missing Replies, Stuck History

class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'gemini';
    
    // FIX #1: Use more specific container that survives navigation
    // The main chat scroll container is stable across chat switches
    this.containerSelector = 'chat-window, main[role="main"], .conversation-container';
    
    // FIX #2: Target the FINAL rendered text containers only
    // Avoid draft/history versions by being very specific
    this.messageSelector = 'message-content.model-response-text, message-content.user-query, [data-augmented-ui-role]';
  }

  extractRole(node) {
    // FIX #3: Use multiple signals to determine role accurately
    
    // Method 1: Check direct class names
    if (node.classList.contains('user-query')) return 'user';
    if (node.classList.contains('model-response-text')) return 'assistant';
    
    // Method 2: Check data attributes (more reliable)
    const role = node.getAttribute('data-augmented-ui-role');
    if (role === 'user') return 'user';
    if (role === 'model') return 'assistant';
    
    // Method 3: Look for parent container attributes
    const parent = node.closest('[data-message-author-role]');
    if (parent) {
      const parentRole = parent.getAttribute('data-message-author-role');
      if (parentRole) return parentRole;
    }
    
    // Method 4: Check for user avatar containers
    const userContainer = node.closest('.user-query-container');
    if (userContainer) return 'user';
    
    // Method 5: Fallback - check text content pattern
    // Gemini often prefixes AI responses with specific markers
    const text = node.textContent?.trim() || '';
    if (text.startsWith('You:') || text.startsWith('User:')) return 'user';
    
    // Default to assistant if unclear (most responses are AI)
    return 'assistant';
  }

  extractPreview(node) {
    // FIX #4: Clean extraction to avoid duplicate text
    
    // Get direct text content only (not nested elements)
    let text = '';
    
    // Try to get the innermost text container
    const textContainer = node.querySelector('.markdown-content, .message-text-content') || node;
    
    // Get only direct text nodes, not nested buttons/UI elements
    const walker = document.createTreeWalker(
      textContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          // Skip if parent is a button, tooltip, or hidden element
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tag = parent.tagName.toLowerCase();
          if (tag === 'button' || tag === 'script' || tag === 'style') {
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
    
    // Fallback to simple extraction if walker failed
    if (!text) {
      text = node.textContent?.trim() || '';
    }
    
    // Clean up prefixes
    text = text.replace(/^(You:|User:|Gemini:|Model:)\s*/i, '');
    
    return text.substring(0, 120);
  }

  extractAttachments(node) {
    // FIX #5: Look in stable parent containers, not just the text node
    
    // Find the message container (parent of the text)
    const messageContainer = node.closest('[data-message-id]') 
                          || node.closest('.conversation-turn')
                          || node.closest('[class*="message"]')
                          || node.parentElement;
    
    if (!messageContainer) return null;
    
    // Check for images (exclude avatars and UI icons)
    const images = Array.from(messageContainer.querySelectorAll('img'));
    const validImages = images.filter(img => {
      // Exclude small icons and avatars
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      
      if (width < 40 || height < 40) return false;
      
      // Exclude avatar images
      if (img.alt?.toLowerCase().includes('avatar')) return false;
      if (img.alt?.toLowerCase().includes('user')) return false;
      if (img.alt?.toLowerCase().includes('gemini')) return false;
      
      // Check if it's in an attachment container
      const attachmentParent = img.closest('[class*="attachment"]') 
                            || img.closest('[class*="upload"]')
                            || img.closest('[class*="file"]');
      
      return attachmentParent !== null || width > 100;
    });
    
    if (validImages.length > 0) return 'image';
    
    // Check for PDF attachments
    const pdfIndicators = messageContainer.querySelectorAll('[class*="pdf"], [data-file-type="pdf"]');
    if (pdfIndicators.length > 0) return 'pdf';
    
    // Check text content for file references
    const text = messageContainer.textContent || '';
    if (/\b\w+\.pdf\b/i.test(text) && messageContainer.querySelector('[class*="file"]')) {
      return 'pdf';
    }
    
    // Check for code file attachments
    const codeExtensions = ['.py', '.js', '.html', '.css', '.json', '.cpp', '.java', '.txt', '.md'];
    for (const ext of codeExtensions) {
      if (text.includes(ext) && messageContainer.querySelector('[class*="file"], [class*="attachment"]')) {
        return 'code';
      }
    }
    
    return null;
  }
  
  // FIX #6: Add deduplication method
  // Override the base method to prevent duplicate entries
  isValidMessage(node) {
    if (!node || !node.textContent) return false;
    
    // Skip if too short (likely UI element)
    const text = node.textContent.trim();
    if (text.length < 5) return false;
    
    // Skip if it's a duplicate (check if we already indexed this exact text)
    // This prevents the "triple ghost" issue
    const preview = this.extractPreview(node);
    
    // Check if this preview already exists in recent messages
    // (Check last 5 messages to handle legitimate duplicates in different contexts)
    const recentDuplicates = this.index
      .slice(-5)
      .filter(msg => msg.preview === preview);
    
    if (recentDuplicates.length > 0) {
      console.log('[PN-Gemini] Skipping duplicate message:', preview.substring(0, 30));
      return false;
    }
    
    return true;
  }
  
  // FIX #7: Add stable message identification
  // This helps with detecting when messages are truly new vs. re-renders
  getMessageId(node) {
    // Try to get stable ID from DOM attributes
    const container = node.closest('[data-message-id]');
    if (container) {
      return container.getAttribute('data-message-id');
    }
    
    // Fallback: create a stable hash from content + position
    const role = this.extractRole(node);
    const preview = this.extractPreview(node);
    const position = Array.from(document.querySelectorAll(this.messageSelector)).indexOf(node);
    
    return `${role}-${position}-${preview.substring(0, 20).replace(/\s+/g, '-')}`;
  }
}

// Ensure global registration
if (typeof window !== 'undefined') {
  window.GeminiAdapter = GeminiAdapter;
}

console.log('[PN] Gemini adapter loaded (FIXED VERSION)');
