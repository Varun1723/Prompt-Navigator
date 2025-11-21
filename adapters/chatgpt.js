class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'chatgpt';
    this.containerSelector = 'main'; 
    this.messageSelector = '[data-message-author-role]'; 
  }
  
  extractRole(node) {
    return node.getAttribute('data-message-author-role');
  }

  extractPreview(node) {
    return node.textContent?.trim().substring(0, 120) || '';
  }

  extractAttachments(node) {
    // --- 1. DETECT IMAGES ---
    // Strategy: Find ALL images, then filter out the "noise" (avatars, UI icons)
    const images = Array.from(node.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const src = img.src || '';
      
      // Filter out avatars and small UI icons (usually < 30px)
      const isTooSmall = width < 30 || height < 30;
      const isProfile = img.alt === 'User' || img.alt === 'ChatGPT';
      const isDataImg = src.startsWith('data:image'); // Often UI elements
      const isUpload = src.includes('files') || src.startsWith('blob:');
      
      // Valid if it looks like an upload OR is big enough to be content
      return (isUpload || !isTooSmall) && !isProfile;
    });
    
    // Also check for "grid" layout images (often used for multiple uploads)
    const imageGrids = node.querySelectorAll('.grid img');
    
    const hasImage = validImages.length > 0 || imageGrids.length > 0;

    // --- 2. DETECT FILES (PDF, Code, etc.) ---
    // Strategy: Look for "cards" -> elements with border/radius that contain filename text
    const text = node.innerText || '';
    const lowerText = text.toLowerCase();
    
    // Heuristic: Look for common file extensions standing alone or in a block
    const hasPDF = /\b[\w-]+\.pdf\b/i.test(text) || 
                   (lowerText.includes('.pdf') && node.querySelector('div[class*="border"]')); // often file cards have borders

    const codeExtensions = ['.py', '.js', '.html', '.css', '.json', '.cpp', '.java', '.txt', '.md'];
    const hasCode = codeExtensions.some(ext => {
       // Check if extension exists AND it's NOT just a code block (```)
       // We look for the extension inside a "button" or "link" context usually
       return lowerText.includes(ext) && !lowerText.includes('```');
    });

    // --- 3. PRIORITY LOGIC ---
    // "In case of mixture, an image file logo will be shown"
    if (hasImage) return 'image';
    if (hasPDF) return 'pdf';
    if (hasCode) return 'code';
    
    return null;
  }
}