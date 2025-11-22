class BaseAdapter {
  constructor() {
    this.platformName = 'unknown';
    this.containerSelector = '';
    this.messageSelector = '';
  }

  getMessages() {
    // NUCLEAR FIX: Filter out hidden elements (duplicates/drafts)
    const allNodes = Array.from(document.querySelectorAll(this.messageSelector));
    return allNodes.filter(node => {
      // Check if element is visible (has dimensions and isn't hidden)
      return node.offsetParent !== null && 
             node.getBoundingClientRect().height > 0;
    });
  }

  extractPreview(node) {
    const text = node.textContent?.trim() || '';
    return text.substring(0, 120); 
  }
}