class GrokAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'grok';
    this.containerSelector = 'body';
    // FIX: This is the standard "List Item" selector for X.com
    this.messageSelector = '[data-testid="cellInnerDiv"]';
  }

  extractRole(node) {
    // On X/Grok, we need to look inside the cell to see who is talking
    // Grok usually has a specific "Grok" label or icon.
    // If we find the user's avatar (usually right-aligned or specific aria-label), it's user.
    const text = node.innerText || '';
    
    // Heuristic: Grok responses often start with "Grok" header or have specific UI
    // This is a guess based on X structure, might need tweaking if X changes layout
    const hasGrokIcon = node.querySelector('svg[aria-label="Grok"]');
    if (hasGrokIcon || text.startsWith('Grok')) return 'assistant';
    
    return 'user';
  }

  extractPreview(node) {
    return node.innerText?.trim().substring(0, 120) || '';
  }

  extractAttachments(node) {
    // Look for large images inside the cell
    const images = node.querySelectorAll('img');
    const hasImage = Array.from(images).some(img => 
      img.src.includes('media') && img.height > 50
    );
    if (hasImage) return 'image';
    return null;
  }
}