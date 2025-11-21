class BaseAdapter {
  constructor() {
    this.platformName = 'unknown';
    this.containerSelector = '';
    this.messageSelector = '';
  }

  getMessages() {
    return Array.from(document.querySelectorAll(this.messageSelector));
  }

  extractPreview(node) {
    const text = node.textContent?.trim() || '';
    return text.substring(0, 120); // Get first 120 chars
  }
}