class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'claude';
    this.containerSelector = 'body'; 
    // These classes identify the text blocks directly
    this.messageSelector = '.font-user-message, .font-claude-message';
  }

  extractRole(node) {
    if (node.classList.contains('font-user-message')) return 'user';
    return 'assistant';
  }

  extractPreview(node) {
    return node.textContent?.trim().substring(0, 120) || '';
  }

  extractAttachments(node) {
    // Look up to the container grid
    const parent = node.closest('.grid'); 
    if (parent) {
        if (parent.querySelector('img')) return 'image';
        if (parent.querySelector('div[data-test-id="file-attachment"]')) return 'pdf';
    }
    return null;
  }
}